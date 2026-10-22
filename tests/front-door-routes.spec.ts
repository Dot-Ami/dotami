/**
 * The way in, against a throwaway migrated data file through the route handlers themselves
 * (docs/architecture/future-cockpit.md § 1, "The way in as built"):
 *
 * - a future picked on *Pick a future* is saved in one request on its own road, with the *business /
 *   career / both* answer and its moment, and its work situation kept as "not said";
 * - the answer to "where do you want to be" is kept as the person's destination, and the cockpit's read
 *   gives it back;
 * - the yearly income is proposed by anyone but agreed only from DotAmi's own window;
 * - the intake opens on *About you* only for a person with no saved idea yet (issue #38).
 */
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { createDatabaseClient } from "@/lib/db/client";
import { loadVentureScenarioById } from "@/lib/db/ventures";
import { roadApprenticeToOwnShopAB } from "@/lib/engines/roads/v2026";
import { keptOnRecord } from "@/lib/front-door/kept";
import { firstSaveForPickedFuture, scenarioForPickedFuture } from "@/lib/front-door/start-future";
import { readFuture } from "@/lib/futures/future";
import { dayOnThisComputer } from "@/lib/futures/person";
import { intakeFirstScreen } from "@/lib/journey/intake-start";
import { fileUrl, migratedFile } from "./helpers/migrated-db";

const dbFile = path.join(tmpdir(), `dotami-front-door-${randomUUID()}.db`);
const previousUrl = process.env.DATABASE_URL;
let prisma: PrismaClient;

type Route = (request: Request) => Promise<Response>;
type Params = { params: Promise<{ id: string }> };
const routes = {} as {
  save: Route;
  statements: Route;
  propose: Route;
  agree: Route;
  discard: Route;
  future: (request: Request, context: Params) => Promise<Response>;
};

beforeAll(async () => {
  migratedFile(dbFile);
  // The routes build their own client from DATABASE_URL when first imported.
  process.env.DATABASE_URL = fileUrl(dbFile);
  prisma = createDatabaseClient({ url: fileUrl(dbFile) });
  routes.save = (await import("@/app/api/scenario/save/route")).POST;
  routes.statements = (await import("@/app/api/person/statements/route")).POST;
  routes.propose = (await import("@/app/api/person-figures/propose/route")).POST;
  routes.agree = (await import("@/app/api/person-figures/agree/route")).POST;
  routes.discard = (await import("@/app/api/person-figures/discard/route")).POST;
  routes.future = (await import("@/app/api/futures/[id]/route")).GET;
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  // The routes' own client also holds the file open; Windows won't delete it until it lets go.
  await (await import("@/lib/prisma")).prisma.$disconnect();
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
  for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
});

afterEach(() => __resetRateLimitStateForTests());

const fromPage = { "sec-fetch-site": "same-origin" };
const json = { "content-type": "application/json" };
const post = (url: string, body: unknown, headers: Record<string, string> = { ...json, ...fromPage }) =>
  new Request(`http://localhost${url}`, { method: "POST", headers, body: JSON.stringify(body) });
const readKept = async (id: string) => {
  const res = await routes.future(new Request(`http://localhost/api/futures/${id}`), { params: Promise.resolve({ id }) });
  return (await res.json()) as Record<string, unknown>;
};
const today = () => dayOnThisComputer(new Date());

describe("the intake's first screen (issue #38)", () => {
  it("About you for a person with no saved idea; the screen they came for once one is saved", async () => {
    expect(await intakeFirstScreen(prisma)).toBe("about");
    const scenario = scenarioForPickedFuture({ road: roadApprenticeToOwnShopAB, place: "CA-AB", name: "Invented first" }, randomUUID());
    expect((await routes.save(post("/api/scenario/save", { scenario }))).status).toBe(200);
    expect(await intakeFirstScreen(prisma)).toBe("confirm");
  });

  it("with no database, About you, as before", async () => {
    const broken = { venture: { count: async () => Promise.reject(new Error("no database")) } } as unknown as PrismaClient;
    expect(await intakeFirstScreen(broken)).toBe("about");
  });
});

describe("a picked future is saved on its road in one request", () => {
  it("the road and the business / career / both answer, each with its day; the work situation not said", async () => {
    const scenario = scenarioForPickedFuture({ road: roadApprenticeToOwnShopAB, place: "CA-AB", name: "" }, randomUUID());
    const res = await routes.save(post("/api/scenario/save", { scenario, ...firstSaveForPickedFuture(roadApprenticeToOwnShopAB, "both-or-not-sure") }));
    expect(res.status).toBe(200);
    const { ventureId } = (await res.json()) as { ventureId: string };

    const future = await readFuture(prisma, ventureId);
    expect(future).toMatchObject({
      roadId: "road-apprentice-to-own-shop-ab",
      roadChosen: true,
      roadChosenOn: today(),
      place: "CA-AB",
      lookingFor: "both-or-not-sure",
      lookingForOn: today(),
    });
    const row = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } });
    expect(row.name).toBe("From apprentice to your own shop (Alberta)");
    expect(row.employmentStatus).toBe("NOT_SAID");
    expect((await loadVentureScenarioById(prisma, ventureId))?.profile.employmentStatus).toBe("not-said");

    // The cockpit's later saves of the same idea never move its road or the answer.
    const again = await routes.save(post("/api/scenario/save", { scenario, roadId: "road-starting-any-business-ab", lookingFor: "career" }));
    expect(again.status).toBe(200);
    expect(await readFuture(prisma, ventureId)).toMatchObject({ roadId: "road-apprentice-to-own-shop-ab", lookingFor: "both-or-not-sure" });
  });

  it("an idea from the intake has no road chosen and no answer to that question", async () => {
    const scenario = scenarioForPickedFuture({ road: roadApprenticeToOwnShopAB, place: "CA-BC", name: "Invented intake idea" }, randomUUID());
    const { ventureId } = (await (await routes.save(post("/api/scenario/save", { scenario }))).json()) as { ventureId: string };
    expect(await readFuture(prisma, ventureId)).toMatchObject({ roadChosen: false, lookingFor: null, lookingForOn: null });
  });
});

describe("where you want to be: kept as the destination, and read back by the cockpit", () => {
  it("kept word for word with its day; the cockpit's read gives the newest", async () => {
    const words = `Four-day weeks  and my own “shop” (invented) ${randomUUID()}`;
    const res = await routes.statements(post("/api/person/statements", { text: words, saidAt: "2026-10-12", kind: "destination" }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { statement: { kind?: string } }).statement.kind).toBe("destination");

    const scenario = scenarioForPickedFuture({ road: roadApprenticeToOwnShopAB, place: "CA-AB", name: "" }, randomUUID());
    const { ventureId } = (await (await routes.save(post("/api/scenario/save", { scenario }))).json()) as { ventureId: string };
    const kept = await readKept(ventureId);
    expect(kept.firstWords).toBeNull();
    expect(kept.destination).toEqual({ text: words, saidAt: "2026-10-12" });
  });

  it("any other kind is refused, and nothing is kept", async () => {
    const before = await prisma.personStatement.count();
    const res = await routes.statements(post("/api/person/statements", { text: "Invented", kind: "profile" }));
    expect(res.status).toBe(400);
    expect(await prisma.personStatement.count()).toBe(before);
  });
});

describe("the yearly income: proposed by anyone, agreed only from DotAmi's own window", () => {
  it("propose, then agree from the window with an edit; the cockpit's read shows the agreed one", async () => {
    // An outside caller may propose: proposing never confirms.
    const proposed = await routes.propose(post("/api/person-figures/propose", { kind: "income-wanted", amountCents: 6_500_000 }, json));
    expect(proposed.status).toBe(201);
    const [figure] = ((await proposed.json()) as { figures: { id: string; status: string }[] }).figures;
    expect(figure.status).toBe("proposed");

    // An outside caller can't agree.
    const outside = await routes.agree(post("/api/person-figures/agree", { ids: [figure.id] }, json));
    expect(outside.status).toBe(403);
    expect((await prisma.personFigure.findUniqueOrThrow({ where: { id: figure.id } })).status).toBe("proposed");

    const agreed = await routes.agree(post("/api/person-figures/agree", { ids: [figure.id], edits: { [figure.id]: { amountCents: 7_000_000 } } }));
    expect(agreed.status).toBe(200);
    const row = await prisma.personFigure.findUniqueOrThrow({ where: { id: figure.id } });
    expect(row).toMatchObject({ status: "confirmed", editedByPerson: true });
    expect(Number(row.amountCents)).toBe(7_000_000);

    const scenario = scenarioForPickedFuture({ road: roadApprenticeToOwnShopAB, place: "CA-AB", name: "" }, randomUUID());
    const { ventureId } = (await (await routes.save(post("/api/scenario/save", { scenario }))).json()) as { ventureId: string };
    expect((await readKept(ventureId)).incomeWanted).toEqual({ amountCents: 7_000_000, agreedOn: today() });
  });

  it("turned down: hidden, and the agreed one stays current", async () => {
    const proposed = await routes.propose(post("/api/person-figures/propose", { kind: "income-wanted", amountCents: 1_000 }));
    const [figure] = ((await proposed.json()) as { figures: { id: string }[] }).figures;
    expect((await routes.discard(post("/api/person-figures/discard", { ids: [figure.id] }))).status).toBe(200);
    expect((await prisma.personFigure.findUniqueOrThrow({ where: { id: figure.id } })).status).toBe("discarded");
    expect(await prisma.personFigure.count({ where: { status: "confirmed" } })).toBe(1);
  });

  it("refuses a caller that tries to name the state, an unknown kind, and a body that isn't JSON", async () => {
    expect((await routes.propose(post("/api/person-figures/propose", { kind: "income-wanted", amountCents: 1, status: "confirmed" }))).status).toBe(400);
    expect((await routes.propose(post("/api/person-figures/propose", { kind: "net-worth", amountCents: 1 }))).status).toBe(400);
    const notJson = new Request("http://localhost/api/person-figures/propose", { method: "POST", headers: { "content-type": "text/plain", ...fromPage }, body: "x" });
    expect((await routes.propose(notJson)).status).toBeGreaterThanOrEqual(400);
    expect(await prisma.personFigure.count({ where: { amountCents: 1 } })).toBe(0);
  });
});

describe("the migration adds two columns and touches nothing else", () => {
  it("only ALTER TABLE \"Venture\" ADD COLUMN, so no idea, figure or link can be lost", () => {
    const dir = path.join(process.cwd(), "prisma", "migrations");
    const name = readdirSync(dir).find((n) => n.endsWith("_looking_for"));
    expect(name, "no migration ending in _looking_for").toBeDefined();
    const statements = readFileSync(path.join(dir, name!, "migration.sql"), "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("--"));
    expect(statements).toEqual([
      'ALTER TABLE "Venture" ADD COLUMN "lookingFor" TEXT;',
      'ALTER TABLE "Venture" ADD COLUMN "lookingForSetAt" DATETIME;',
    ]);
  });
});

describe("a picked future keeps what it was saved without as not said (review, 2026-10-12)", () => {
  it("the kind of venture, equipment and sales targets: listed as not said, and equipment read back unanswered", async () => {
    const scenario = scenarioForPickedFuture({ road: roadApprenticeToOwnShopAB, place: "CA-AB", name: "" }, randomUUID());
    const { ventureId } = (await (await routes.save(post("/api/scenario/save", { scenario }))).json()) as { ventureId: string };
    expect((await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } })).notSaid).toEqual(["venture-type", "equipment", "sales-target-year-1", "sales-target-year-3"]);
    const loaded = await loadVentureScenarioById(prisma, ventureId);
    expect(loaded?.profile.notSaid).toEqual(["venture-type", "equipment", "sales-target-year-1", "sales-target-year-3"]);
    expect(loaded?.profile.capitalPurchasePlanned).toBeUndefined();

    // The cockpit's own saves carry the list back, so it stays.
    expect((await routes.save(post("/api/scenario/save", { scenario: loaded }))).status).toBe(200);
    expect((await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } })).notSaid).toEqual(["venture-type", "equipment", "sales-target-year-1", "sales-target-year-3"]);

    // A save with no list (the intake, which asks all three) clears it, and its answers are the person's.
    const answered = { ...loaded!, profile: { ...loaded!.profile, notSaid: undefined, type: "product" as const, capitalPurchasePlanned: true } };
    expect((await routes.save(post("/api/scenario/save", { scenario: answered }))).status).toBe(200);
    const after = await loadVentureScenarioById(prisma, ventureId);
    expect(after?.profile.notSaid).toBeUndefined();
    expect(after?.profile).toMatchObject({ type: "product", capitalPurchasePlanned: true });
  });
});

describe("Your destination reads what is already kept (review, 2026-10-12)", () => {
  it("the newest destination and the income agreed to, with its day", async () => {
    const words = `Back to the shop floor, my own hours (invented) ${randomUUID()}`;
    expect((await routes.statements(post("/api/person/statements", { text: words, saidAt: "2026-10-12", kind: "destination" }))).status).toBe(200);
    const kept = await keptOnRecord(prisma);
    expect(kept.destination).toEqual({ text: words, saidAt: "2026-10-12" });
    // Agreed earlier in this file, edited to 7,000,000 cents.
    expect(kept.incomeWanted).toEqual({ amountCents: 7_000_000, agreedOn: today() });
  });

  it("with no database, nothing is on record", async () => {
    const broken = new Proxy({}, { get: () => new Proxy({}, { get: () => async () => Promise.reject(new Error("no database")) }) }) as unknown as PrismaClient;
    expect(await keptOnRecord(broken)).toEqual({ destination: null, incomeWanted: null });
  });
});

describe("the not-said migration adds one column and touches nothing else", () => {
  it("only ALTER TABLE \"Venture\" ADD COLUMN, so no idea, figure or link can be lost", () => {
    const dir = path.join(process.cwd(), "prisma", "migrations");
    const name = readdirSync(dir).find((n) => n.endsWith("_not_said"));
    expect(name, "no migration ending in _not_said").toBeDefined();
    const statements = readFileSync(path.join(dir, name!, "migration.sql"), "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("--"));
    expect(statements).toEqual(['ALTER TABLE "Venture" ADD COLUMN "notSaid" JSONB NOT NULL DEFAULT \'[]\';']);
  });
});
