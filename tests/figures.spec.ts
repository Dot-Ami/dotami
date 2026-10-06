/**
 * [8a]/[8b] The figures store: money parsing, validation, the database layer and the four API
 * routes, against a throwaway migrated SQLite file (same setup as tests/db-roundtrip.spec.ts).
 * The rules under test are in docs/architecture/figures-privacy-review.md § Rules for building
 * the store — chiefly that only the app's own page can confirm a figure, and that an amount
 * never appears in a URL.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { formatCents, parseMoneyToCents } from "@/lib/figures/money";
import { agreeToFigures, listFigures, proposeFigures } from "@/lib/figures/store";
import type { FigureView } from "@/lib/figures/types";
import { validateFigureInput, validateFigureSource } from "@/lib/figures/validate";
import { demoScenarios } from "../prisma/seed-data";

const dbFile = path.join(tmpdir(), `dotami-figures-test-${randomUUID()}.db`);
const url = `file:${dbFile.replace(/\\/g, "/")}`;
let prisma: PrismaClient;
let ventureId: string;
let otherVentureId: string;

// The route files build their own Prisma client from DATABASE_URL when first imported, so the
// variable is pointed at the throwaway file before any route is loaded.
type RouteModule = { POST: (request: Request) => Promise<Response>; GET?: (request: Request) => Promise<Response> };
const routes: Record<"list" | "propose" | "agree" | "discard" | "retract", RouteModule> = {} as never;
const previousUrl = process.env.DATABASE_URL;

beforeAll(async () => {
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  process.env.DATABASE_URL = url;
  prisma = new PrismaClient({ datasourceUrl: url });

  routes.list = (await import("@/app/api/figures/route")) as unknown as RouteModule;
  routes.propose = await import("@/app/api/figures/propose/route");
  routes.agree = await import("@/app/api/figures/agree/route");
  routes.discard = await import("@/app/api/figures/discard/route");
  routes.retract = await import("@/app/api/figures/retract/route");

  ventureId = (await ensureVentureFromScenario(prisma, demoScenarios[0])).ventureId;
  otherVentureId = (await ensureVentureFromScenario(prisma, demoScenarios[1])).ventureId;
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  // The routes' own client (lib/prisma) also holds the file open; Windows won't delete it until it lets go.
  await (await import("@/lib/prisma")).prisma.$disconnect();
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
  for (const f of [dbFile, `${dbFile}-journal`]) {
    if (existsSync(f)) rmSync(f);
  }
});

afterEach(() => __resetRateLimitStateForTests());

// ---------------------------------------------------------------------------------------------
// money

describe("parseMoneyToCents", () => {
  it.each([
    ["1234", 123400],
    ["1234.5", 123450],
    ["1,234.56", 123456],
    ["$1,234.56", 123456],
    [" 1 234.56 ", 123456],
    ["(1,234.56)", -123456],
    ["-1,234.56", -123456],
    ["1234.56-", -123456],
    ["0", 0],
    ["$0.00", 0],
    ["-0", 0],
    ["$-5.00", -500],
    ["-$5.00", -500],
    ["0.07", 7],
    ["1,000,000.00", 100000000],
  ])("reads %j as %d cents", (text, cents) => {
    expect(parseMoneyToCents(text)).toBe(cents);
  });

  it("never returns negative zero", () => {
    expect(Object.is(parseMoneyToCents("(0.00)"), 0)).toBe(true);
  });

  it.each([
    [""],
    ["   "],
    ["abc"],
    ["12abc"],
    ["$"],
    ["1,234.567"],
    ["1234.567"],
    ["1234,56"],
    ["1 234,56"],
    ["--5"],
    ["(-5)"],
    ["-5-"],
    ["(5)-"],
    ["NaN"],
    ["Infinity"],
    ["1.2.3"],
    ["12,34"],
    ["99999999999999999999"],
  ])("refuses %j", (text) => {
    expect(parseMoneyToCents(text)).toBeNull();
  });
});

describe("formatCents", () => {
  it("shows dollars and cents with thousands separators for CAD", () => {
    expect(formatCents(123456, "CAD")).toBe("$1,234.56");
    expect(formatCents(0, "CAD")).toBe("$0.00");
  });
  it("shows a loss with a minus sign", () => {
    expect(formatCents(-123456, "CAD")).toMatch(/^-\$1,234\.56$/);
  });
});

// ---------------------------------------------------------------------------------------------
// validation

const good = { kind: "gross-revenue", periodStart: "2025-01-01", periodEnd: "2025-12-31", amountCents: 1_000_000 };

describe("validateFigureInput", () => {
  const TODAY = "2026-10-06";

  it("accepts a finished period and defaults the currency to CAD", () => {
    expect(validateFigureInput(good, TODAY)).toEqual({ ok: true, value: { ...good, currency: "CAD" } });
  });

  it("accepts a period that ends today, and a negative amount", () => {
    expect(validateFigureInput({ ...good, periodEnd: TODAY, amountCents: -5 }, TODAY).ok).toBe(true);
  });

  it.each([
    ["a day that doesn't exist", { periodStart: "2026-02-30" }, /real days/],
    ["a loosely written date", { periodEnd: "2025-1-5" }, /real days/],
    ["a start after the end", { periodStart: "2025-12-31", periodEnd: "2025-01-01" }, /ends before it starts/],
    ["an end after today", { periodEnd: "2026-10-07" }, /hasn't ended yet/],
    ["a lowercase currency", { currency: "cad" }, /three-letter/],
    ["a long currency", { currency: "CADD" }, /three-letter/],
    ["an unknown kind", { kind: "net-profit" }, /kind of figure/],
    ["a fractional amount", { amountCents: 10.5 }, /whole number of cents/],
    ["an amount as text", { amountCents: "100" }, /whole number of cents/],
    ["an amount past the safe range", { amountCents: Number.MAX_SAFE_INTEGER + 2 }, /whole number of cents/],
  ])("refuses %s", (_name, change, message) => {
    const result = validateFigureInput({ ...good, ...change }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });

  it("refuses something that isn't an object", () => {
    expect(validateFigureInput(null, TODAY).ok).toBe(false);
    expect(validateFigureInput("1000", TODAY).ok).toBe(false);
  });

  it("keeps a figure's own row count when one is given ([8c]: one month of a file)", () => {
    expect(validateFigureInput({ ...good, rows: 14 }, TODAY)).toEqual({ ok: true, value: { ...good, currency: "CAD", rows: 14 } });
    expect(validateFigureInput({ ...good, rows: null }, TODAY)).toEqual({ ok: true, value: { ...good, currency: "CAD" } });
  });

  it.each([
    ["a negative row count", -1],
    ["a fractional row count", 2.5],
    ["a row count as text", "14"],
  ])("refuses %s on a figure", (_name, rows) => {
    const result = validateFigureInput({ ...good, rows }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/row count/);
  });
});

describe("validateFigureSource", () => {
  it("accepts a kind, a label and an optional row count", () => {
    expect(validateFigureSource({ kind: "file", label: " sales-2025.xlsx ", rows: 312 })).toEqual({
      ok: true,
      value: { kind: "file", label: "sales-2025.xlsx", rows: 312 },
    });
    expect(validateFigureSource({ kind: "typed", label: "typed by you" })).toEqual({
      ok: true,
      value: { kind: "typed", label: "typed by you", rows: null },
    });
  });

  it.each([
    ["an unknown kind", { kind: "bank", label: "x" }],
    ["an empty label", { kind: "file", label: "  " }],
    ["a label over 120 characters", { kind: "file", label: "x".repeat(121) }],
    ["a negative row count", { kind: "file", label: "x", rows: -1 }],
    ["a fractional row count", { kind: "file", label: "x", rows: 1.5 }],
  ])("refuses %s", (_name, source) => {
    expect(validateFigureSource(source).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// routes

const SOURCE = { kind: "file", label: "sales-2025.xlsx", rows: 12 };

function post(route: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/figures/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
const FROM_APP = { "sec-fetch-site": "same-origin" };

const figureCount = () => prisma.figure.count();
const statusOf = async (id: string) => (await prisma.figure.findUniqueOrThrow({ where: { id } })).status;

/** Proposes through the real route and returns what came back. */
async function propose(figures: unknown[] = [good], target = ventureId): Promise<FigureView[]> {
  const res = await routes.propose.POST(post("propose", { ventureId: target, source: SOURCE, figures }));
  expect(res.status).toBe(201);
  return ((await res.json()) as { figures: FigureView[] }).figures;
}

describe("POST /api/figures/propose", () => {
  it("creates figures as proposed, and only that", async () => {
    const created = await propose([good, { ...good, periodStart: "2024-01-01", periodEnd: "2024-12-31", amountCents: -2500 }]);
    expect(created).toHaveLength(2);
    for (const f of created) {
      expect(f).toMatchObject({
        status: "proposed",
        confirmedAt: null,
        editedByPerson: false,
        currency: "CAD",
        sourceKind: "file",
        sourceLabel: "sales-2025.xlsx",
        sourceRows: 12,
        ventureId,
      });
    }
    expect(created.map((f) => f.amountCents).sort((a, b) => a - b)).toEqual([-2500, 1_000_000]);
    expect(created[0].periodStart).toBe("2025-01-01");
    expect(created[0].periodEnd).toBe("2025-12-31");
  });

  it("stores each figure's own row count over the batch's ([8c] monthly totals from a file)", async () => {
    const march = { ...good, periodStart: "2025-03-01", periodEnd: "2025-03-31", rows: 9 };
    const april = { ...good, periodStart: "2025-04-01", periodEnd: "2025-04-30" };
    const created = await propose([march, april]);
    const rowsByStart = Object.fromEntries(created.map((f) => [f.periodStart, f.sourceRows]));
    // March carries its own 9; April has none of its own, so the source's 12 applies.
    expect(rowsByStart).toEqual({ "2025-03-01": 9, "2025-04-01": 12 });
  });

  it.each([
    ["status", { status: "confirmed" }],
    ["confirmedAt", { confirmedAt: "2026-01-01T00:00:00Z" }],
    ["editedByPerson", { editedByPerson: true }],
  ])("refuses a figure that carries %s, and creates nothing", async (_key, extra) => {
    const before = await figureCount();
    const res = await routes.propose.POST(
      post("propose", { ventureId, source: SOURCE, figures: [good, { ...good, ...extra }] }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe(
      "Figures can only be proposed here. Confirming is the person's click in the agree prompt.",
    );
    expect(await figureCount()).toBe(before);
  });

  it("refuses a body that carries status at the top level, and creates nothing", async () => {
    const before = await figureCount();
    const res = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, figures: [good], status: "confirmed" }));
    expect(res.status).toBe(400);
    expect(await figureCount()).toBe(before);
  });

  it("refuses 501 figures in one call, and creates nothing", async () => {
    const before = await figureCount();
    const res = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, figures: Array(501).fill(good) }));
    expect(res.status).toBe(400);
    expect(await figureCount()).toBe(before);
  });

  it("accepts exactly 500", async () => {
    const before = await figureCount();
    const res = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, figures: Array(500).fill(good) }));
    expect(res.status).toBe(201);
    expect(await figureCount()).toBe(before + 500);
  });

  it("is all or nothing: one bad figure means none are created", async () => {
    const before = await figureCount();
    const res = await routes.propose.POST(
      post("propose", { ventureId, source: SOURCE, figures: [good, { ...good, periodEnd: "2999-01-01" }] }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/Figure 2.*hasn't ended yet/);
    expect(await figureCount()).toBe(before);
  });

  it("answers 404 for an idea that isn't there", async () => {
    const res = await routes.propose.POST(post("propose", { ventureId: "nope", source: SOURCE, figures: [good] }));
    expect(res.status).toBe(404);
  });

  it("refuses a body that isn't JSON-typed", async () => {
    const req = new Request("http://localhost/api/figures/propose", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ ventureId, source: SOURCE, figures: [good] }),
    });
    expect((await routes.propose.POST(req)).status).toBe(415);
  });

  it("refuses a body over its size cap", async () => {
    const huge = { ventureId, source: SOURCE, figures: [good], pad: "x".repeat(300 * 1024) };
    expect((await routes.propose.POST(post("propose", huge))).status).toBe(413);
  });
});

describe("GET /api/figures", () => {
  it("lists an idea's figures in period order and leaves out discarded ones", async () => {
    const [kept, dropped] = await propose([
      { ...good, periodStart: "2020-01-01", periodEnd: "2020-12-31" },
      { ...good, periodStart: "2019-01-01", periodEnd: "2019-12-31" },
    ]);
    await prisma.figure.update({ where: { id: dropped.id }, data: { status: "discarded" } });

    const res = await routes.list.GET!(new Request(`http://localhost/api/figures?venture=${ventureId}`));
    expect(res.status).toBe(200);
    const { figures } = (await res.json()) as { figures: FigureView[] };
    expect(figures.some((f) => f.id === dropped.id)).toBe(false);
    expect(figures.some((f) => f.id === kept.id)).toBe(true);
    const starts = figures.map((f) => f.periodStart);
    expect(starts).toEqual([...starts].sort());
  });

  it("answers 404 for an idea that isn't the person's, and 400 with no idea named", async () => {
    expect((await routes.list.GET!(new Request("http://localhost/api/figures?venture=nope"))).status).toBe(404);
    expect((await routes.list.GET!(new Request("http://localhost/api/figures"))).status).toBe(400);
  });

  it("an idea belonging to someone else is a 404 even when the id exists", async () => {
    const stranger = await prisma.user.create({ data: { email: "someone-else@test.local" } });
    const theirs = await prisma.venture.create({
      data: {
        userId: stranger.id,
        name: "theirs",
        type: "SERVICE",
        province: "AB",
        targetRevenueY1: 0,
        targetRevenueY3: 0,
        employmentStatus: "OTHER",
      },
    });
    expect((await routes.list.GET!(new Request(`http://localhost/api/figures?venture=${theirs.id}`))).status).toBe(404);
    const res = await routes.propose.POST(post("propose", { ventureId: theirs.id, source: SOURCE, figures: [good] }));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/figures/agree", () => {
  it("refuses a request with no Sec-Fetch-Site header (a script or an agent), and the figure stays proposed", async () => {
    const [f] = await propose();
    const res = await routes.agree.POST(post("agree", { ventureId, figureIds: [f.id] }));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe(
      "Only the agree prompt in DotAmi's window can confirm figures.",
    );
    expect(await statusOf(f.id)).toBe("proposed");
  });

  it.each(["cross-site", "same-site", "none"])("refuses Sec-Fetch-Site: %s", async (site) => {
    const [f] = await propose();
    const res = await routes.agree.POST(post("agree", { ventureId, figureIds: [f.id] }, { "sec-fetch-site": site }));
    expect(res.status).toBe(403);
    expect(await statusOf(f.id)).toBe("proposed");
  });

  it("confirms from the app's own page, stamping the time", async () => {
    const [f] = await propose();
    const res = await routes.agree.POST(post("agree", { ventureId, figureIds: [f.id] }, FROM_APP));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { figures: FigureView[]; skipped: string[] };
    expect(body.skipped).toEqual([]);
    expect(body.figures).toHaveLength(1);
    expect(body.figures[0]).toMatchObject({ id: f.id, status: "confirmed", editedByPerson: false, amountCents: f.amountCents });
    expect(body.figures[0].confirmedAt).toEqual(expect.any(String));
    expect((await prisma.figure.findUniqueOrThrow({ where: { id: f.id } })).confirmedAt).not.toBeNull();
  });

  it("an edited amount replaces the proposed one and marks the figure as edited by the person", async () => {
    const [f] = await propose();
    const res = await routes.agree.POST(
      post("agree", { ventureId, figureIds: [f.id], edits: { [f.id]: { amountCents: 999_999 } } }, FROM_APP),
    );
    const body = (await res.json()) as { figures: FigureView[] };
    expect(body.figures[0]).toMatchObject({ amountCents: 999_999, editedByPerson: true, status: "confirmed" });
  });

  it("an edit that keeps the same amount does not count as an edit", async () => {
    const [f] = await propose();
    const res = await routes.agree.POST(
      post("agree", { ventureId, figureIds: [f.id], edits: { [f.id]: { amountCents: f.amountCents } } }, FROM_APP),
    );
    expect(((await res.json()) as { figures: FigureView[] }).figures[0].editedByPerson).toBe(false);
  });

  it("reports an already-confirmed figure as skipped and leaves it unchanged", async () => {
    const [f] = await propose();
    await routes.agree.POST(post("agree", { ventureId, figureIds: [f.id] }, FROM_APP));
    const before = await prisma.figure.findUniqueOrThrow({ where: { id: f.id } });

    const res = await routes.agree.POST(
      post("agree", { ventureId, figureIds: [f.id], edits: { [f.id]: { amountCents: 1 } } }, FROM_APP),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ figures: [], skipped: [f.id] });
    expect(await prisma.figure.findUniqueOrThrow({ where: { id: f.id } })).toEqual(before);
  });

  it("never touches another idea's figure, even with its id", async () => {
    const [f] = await propose([good], otherVentureId);
    const res = await routes.agree.POST(post("agree", { ventureId, figureIds: [f.id] }, FROM_APP));
    expect(await res.json()).toEqual({ figures: [], skipped: [f.id] });
    expect(await statusOf(f.id)).toBe("proposed");
  });

  it("refuses an edit for a figure that isn't in the list, and changes nothing", async () => {
    const [a, b] = await propose([good, good]);
    const res = await routes.agree.POST(
      post("agree", { ventureId, figureIds: [a.id], edits: { [b.id]: { amountCents: 5 } } }, FROM_APP),
    );
    expect(res.status).toBe(400);
    expect(await statusOf(a.id)).toBe("proposed");
    expect(await statusOf(b.id)).toBe("proposed");
  });

  it("refuses an edit whose amount isn't whole cents", async () => {
    const [f] = await propose();
    const res = await routes.agree.POST(
      post("agree", { ventureId, figureIds: [f.id], edits: { [f.id]: { amountCents: 10.5 } } }, FROM_APP),
    );
    expect(res.status).toBe(400);
    expect(await statusOf(f.id)).toBe("proposed");
  });

  it("answers 404 for an idea that isn't there", async () => {
    const res = await routes.agree.POST(post("agree", { ventureId: "nope", figureIds: ["x"] }, FROM_APP));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/figures/discard", () => {
  it("turns a proposed figure into discarded, and leaves a confirmed one alone", async () => {
    const [p, c] = await propose([good, good]);
    await routes.agree.POST(post("agree", { ventureId, figureIds: [c.id] }, FROM_APP));

    const res = await routes.discard.POST(post("discard", { ventureId, figureIds: [p.id, c.id] }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { figures: FigureView[]; skipped: string[] };
    expect(body.figures.map((f) => f.id)).toEqual([p.id]);
    expect(body.skipped).toEqual([c.id]);
    expect(await statusOf(p.id)).toBe("discarded");
    expect(await statusOf(c.id)).toBe("confirmed");
  });
});

describe("POST /api/figures/retract", () => {
  it("refuses a request that isn't from the app's page, and the figure stays confirmed", async () => {
    const [f] = await propose();
    await routes.agree.POST(post("agree", { ventureId, figureIds: [f.id] }, FROM_APP));
    const res = await routes.retract.POST(post("retract", { ventureId, figureIds: [f.id] }));
    expect(res.status).toBe(403);
    expect(await statusOf(f.id)).toBe("confirmed");
  });

  it("retracts a confirmed figure from the app's page, stamping the time", async () => {
    const [f] = await propose();
    await routes.agree.POST(post("agree", { ventureId, figureIds: [f.id] }, FROM_APP));
    const res = await routes.retract.POST(post("retract", { ventureId, figureIds: [f.id] }, FROM_APP));
    expect(res.status).toBe(200);
    const { figures } = (await res.json()) as { figures: FigureView[] };
    expect(figures[0]).toMatchObject({ id: f.id, status: "retracted" });
    expect(figures[0].retractedAt).toEqual(expect.any(String));
  });

  it("skips a figure that was never confirmed", async () => {
    const [f] = await propose();
    const res = await routes.retract.POST(post("retract", { ventureId, figureIds: [f.id] }, FROM_APP));
    expect(await res.json()).toEqual({ figures: [], skipped: [f.id] });
    expect(await statusOf(f.id)).toBe("proposed");
  });
});

// ---------------------------------------------------------------------------------------------
// the database layer and the privacy rules

describe("the store", () => {
  it("keeps an amount beyond the old 32-bit range exactly (BigInt column)", async () => {
    const big = 9_000_000_000_000; // $90 billion in cents, far past Int's ~$21M
    const [f] = await proposeFigures(prisma, ventureId, SOURCE, [{ ...good, amountCents: big }], "2026-10-06");
    expect(f.amountCents).toBe(big);
    const listed = (await listFigures(prisma, ventureId)).find((x) => x.id === f.id);
    expect(listed?.amountCents).toBe(big);
  });

  it("agreeToFigures confirms only what is proposed", async () => {
    const [f] = await proposeFigures(prisma, ventureId, SOURCE, [good], "2026-10-06");
    const first = await agreeToFigures(prisma, ventureId, [f.id]);
    expect(first.changed).toHaveLength(1);
    const second = await agreeToFigures(prisma, ventureId, [f.id]);
    expect(second).toEqual({ changed: [], skipped: [f.id] });
  });
});

describe("deleting a venture", () => {
  it("deletes its figures with it", async () => {
    const doomed = (await ensureVentureFromScenario(prisma, demoScenarios[2] ?? demoScenarios[0])).ventureId;
    const target = doomed === ventureId ? otherVentureId : doomed;
    await propose([good, good], target);
    expect(await prisma.figure.count({ where: { ventureId: target } })).toBeGreaterThan(0);

    await prisma.venture.delete({ where: { id: target } });
    expect(await prisma.figure.count({ where: { ventureId: target } })).toBe(0);
  });
});

describe("amounts stay out of URLs and logs", () => {
  /** Every file under app/api/figures. */
  function routeFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? routeFiles(full) : [full];
    });
  }
  const files = routeFiles(path.join(process.cwd(), "app", "api", "figures"));

  it("finds the route files it is meant to scan", () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  it("no route reads an amount from the query string or the path", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      // The only query parameter any route reads is the idea's id.
      for (const [, name] of source.matchAll(/searchParams\.get\(\s*["']([^"']+)["']/g)) {
        expect(name, `${file} reads query parameter "${name}"`).toBe("venture");
      }
      expect(source, `${file} puts an amount in the URL`).not.toMatch(/searchParams[^;\n]*(amount|cents|figure)/i);
      expect(source, `${file} has an amount path segment`).not.toMatch(/\[(amount|cents)[^\]]*\]/i);
    }
    // No dynamic path segment under app/api/figures at all.
    expect(files.filter((f) => /[\\/]\[[^\]]+\][\\/]/.test(f))).toEqual([]);
  });

  it("no route or store file logs a figure", () => {
    const sources = [...files, "lib/figures/store.ts", "lib/figures/http.ts"].map((f) =>
      readFileSync(path.isAbsolute(f) ? f : path.join(process.cwd(), f), "utf8"),
    );
    for (const source of sources) {
      // console.* calls may exist (http.ts logs a name and a code) but must never mention an amount.
      for (const [call] of source.matchAll(/console\.\w+\([^)]*\)/g)) {
        expect(call).not.toMatch(/amount|cents/i);
      }
    }
  });

  it("a failing write logs no amount", async () => {
    const logged: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => void logged.push(args.map(String).join(" "));
    try {
      // A database that can't be reached: the error path runs without the values ever being logged.
      const broken = new PrismaClient({ datasourceUrl: `file:${tmpdir().replace(/\\/g, "/")}/no-such-folder/x.db` });
      await expect(
        proposeFigures(broken, ventureId, SOURCE, [{ ...good, amountCents: 424242424 }], "2026-10-06"),
      ).rejects.toThrow();
      await broken.$disconnect();
      const { storeErrorResponse } = await import("@/lib/figures/http");
      const res = storeErrorResponse("propose", Object.assign(new Error("amountCents: 424242424"), { code: "P1000" }));
      expect(res.status).toBe(503);
    } finally {
      console.error = original;
    }
    expect(logged.join("\n")).not.toContain("424242424");
    expect(logged).toEqual(["[figures/propose] failed (Error, P1000)"]);
  });
});
