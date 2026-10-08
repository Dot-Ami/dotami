/**
 * [8i] The expense records store: validation, the database layer and the five API routes, against a
 * throwaway migrated SQLite file (same setup as tests/figures.spec.ts). The rules under test are in
 * docs/architecture/expense-records.md and the expense section of
 * docs/architecture/figures-privacy-review.md — chiefly that only the app's own page can confirm a
 * record, that DotAmi never fills in a category, that a purchase can't be dated after the person's own
 * day, and that nothing the person typed ends up in a URL or a log. Every name, address and number
 * below is invented.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { storeErrorResponse } from "@/lib/expenses/http";
import { agreeToExpenses, discardExpenses, listExpenses, proposeExpenses, retractExpenses } from "@/lib/expenses/store";
import type { ExpenseView } from "@/lib/expenses/types";
import {
  ADDRESS_MAX,
  CATEGORY_MAX,
  MAX_EXPENSE_CENTS,
  normaliseVendorGstNumber,
  PAID_TO_MAX,
  validateExpenseEdit,
  validateExpenseInput,
  validateExpenseSource,
  WHAT_FOR_MAX,
} from "@/lib/expenses/validate";
import { demoScenarios } from "../prisma/seed-data";

const dbFile = path.join(tmpdir(), `dotami-expenses-test-${randomUUID()}.db`);
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
    env: { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
  process.env.DATABASE_URL = url;
  prisma = new PrismaClient({ datasourceUrl: url });

  routes.list = (await import("@/app/api/expenses/route")) as unknown as RouteModule;
  routes.propose = await import("@/app/api/expenses/propose/route");
  routes.agree = await import("@/app/api/expenses/agree/route");
  routes.discard = await import("@/app/api/expenses/discard/route");
  routes.retract = await import("@/app/api/expenses/retract/route");

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
// validation

const TODAY = "2026-10-07";
const good = {
  date: "2026-09-30",
  amountCents: 4_599,
  paidTo: "Example Stationery Ltd",
  whatFor: "printer paper",
};
/** What a minimal valid record comes out as: optional fields null, currency defaulted, a plain expense. */
const NEW_FIELDS_EMPTY = { recordKind: "expense", refundOfId: null, gstHstCents: null, creditNote: null, businessSharePercent: null };
const goodChecked = { ...good, currency: "CAD", category: null, sellerAddress: null, vendorGstNumber: null, ...NEW_FIELDS_EMPTY };

describe("validateExpenseInput", () => {
  it("accepts a minimal record: optional fields become null and the currency defaults to CAD", () => {
    expect(validateExpenseInput(good, TODAY)).toEqual({ ok: true, value: goodChecked });
  });

  it("accepts every optional field, trimming the text", () => {
    const full = {
      ...good,
      paidTo: "  Example Stationery Ltd ",
      currency: "USD",
      category: " Office supplies ",
      sellerAddress: "1 Example Street\nExampleville",
      vendorGstNumber: "123456789 RT 0001",
    };
    expect(validateExpenseInput(full, TODAY)).toEqual({
      ok: true,
      value: {
        ...good,
        currency: "USD",
        category: "Office supplies",
        sellerAddress: "1 Example Street\nExampleville",
        vendorGstNumber: "123456789 RT 0001",
        ...NEW_FIELDS_EMPTY,
      },
    });
  });

  it("treats a blank optional box as nothing given, not as an error", () => {
    const result = validateExpenseInput({ ...good, category: "  ", sellerAddress: "", vendorGstNumber: null }, TODAY);
    expect(result).toEqual({ ok: true, value: goodChecked });
  });

  it("never picks a category: a seller that sounds like a category leaves it empty", () => {
    const result = validateExpenseInput({ ...good, paidTo: "Example Office Supply Co", whatFor: "software subscription" }, TODAY);
    expect(result.ok && result.value.category).toBeNull();
  });

  it("ignores keys it doesn't know (a receipt, a card number): none of them reach the stored value", () => {
    const result = validateExpenseInput({ ...good, cardNumber: "0000 0000 0000 0000", receipt: "x.pdf", deductible: true }, TODAY);
    expect(result).toEqual({ ok: true, value: goodChecked });
  });

  it("accepts a purchase made today, and the earliest day allowed", () => {
    expect(validateExpenseInput({ ...good, date: TODAY }, TODAY).ok).toBe(true);
    expect(validateExpenseInput({ ...good, date: "1970-01-01" }, TODAY).ok).toBe(true);
  });

  it("accepts the largest amount and 1 cent", () => {
    expect(validateExpenseInput({ ...good, amountCents: MAX_EXPENSE_CENTS }, TODAY).ok).toBe(true);
    expect(validateExpenseInput({ ...good, amountCents: 1 }, TODAY).ok).toBe(true);
  });

  it.each([
    ["a day that doesn't exist", { date: "2026-02-30" }, /real day/],
    ["a loosely written date", { date: "2026-9-5" }, /real day/],
    ["a date as a number", { date: 20260930 }, /real day/],
    ["no date", { date: undefined }, /real day/],
    ["tomorrow", { date: "2026-10-08" }, /hasn't happened yet/],
    ["a day before 1970", { date: "1969-12-31" }, /before 1970-01-01/],
    ["zero dollars", { amountCents: 0 }, /can't be zero/],
    ["a negative amount past the typo guard", { amountCents: -MAX_EXPENSE_CENTS - 1 }, /too large/],
    ["a fractional amount", { amountCents: 10.5 }, /whole number of cents/],
    ["an amount as text", { amountCents: "45.99" }, /whole number of cents/],
    ["an amount past the safe range", { amountCents: Number.MAX_SAFE_INTEGER + 2 }, /whole number of cents/],
    ["an amount over the typo guard", { amountCents: MAX_EXPENSE_CENTS + 1 }, /too large/],
    ["a lowercase currency", { currency: "cad" }, /three-letter/],
    ["a four-letter currency", { currency: "CADD" }, /three-letter/],
    ["a currency as a number", { currency: 124 }, /three-letter/],
    ["nobody paid", { paidTo: "   " }, /paid to is needed/],
    ["no reason", { whatFor: undefined }, /for is needed/],
    ["a payee as a number", { paidTo: 5 }, /has to be text/],
    ["a payee past its limit", { paidTo: "x".repeat(PAID_TO_MAX + 1) }, /at most 120/],
    ["a reason past its limit", { whatFor: "x".repeat(WHAT_FOR_MAX + 1) }, /at most 200/],
    ["a category past its limit", { category: "x".repeat(CATEGORY_MAX + 1) }, /at most 80/],
    ["an address past its limit", { sellerAddress: "x".repeat(ADDRESS_MAX + 1) }, /at most 300/],
    ["a control character in a name", { paidTo: "Example\u0007Ltd" }, /control characters/],
    ["a line break in a name", { paidTo: "Example\nLtd" }, /control characters/],
    ["a control character in an address", { sellerAddress: "1 Example\u0000Street" }, /control characters/],
    ["a GST/HST number that is too short", { vendorGstNumber: "12345678" }, /nine digits/],
    ["a GST/HST number with the wrong suffix", { vendorGstNumber: "123456789 GS 0001" }, /nine digits/],
    ["a GST/HST number with letters inside", { vendorGstNumber: "12345A789 RT 0001" }, /nine digits/],
    ["a GST/HST number with a short reference", { vendorGstNumber: "123456789 RT 001" }, /nine digits/],
  ])("refuses %s", (_name, change, message) => {
    const result = validateExpenseInput({ ...good, ...change }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });

  it("refuses something that isn't an object", () => {
    expect(validateExpenseInput(null, TODAY).ok).toBe(false);
    expect(validateExpenseInput("45.99", TODAY).ok).toBe(false);
    expect(validateExpenseInput([good], TODAY).ok).toBe(false);
  });

  it("measures 'not in the future' by the day it is given, not the clock", () => {
    expect(validateExpenseInput({ ...good, date: "2026-04-01" }, "2026-03-31").ok).toBe(false);
    expect(validateExpenseInput({ ...good, date: "2026-03-31" }, "2026-03-31").ok).toBe(true);
  });
});

describe("normaliseVendorGstNumber", () => {
  it.each([
    ["123456789 RT 0001", "123456789 RT 0001"],
    ["123456789RT0001", "123456789 RT 0001"],
    ["123456789-rt-0002", "123456789 RT 0002"],
    ["  123 456 789 RT 0001 ", "123456789 RT 0001"],
    // Receipts often print just the nine-digit business number.
    ["123456789", "123456789"],
  ])("reads %j as %j", (text, expected) => {
    expect(normaliseVendorGstNumber(text)).toBe(expected);
  });

  it.each([["12345678"], ["1234567890"], ["123456789 RT"], ["123456789 RT 00012"], ["RT 0001"], [""]])("refuses %j", (text) => {
    expect(normaliseVendorGstNumber(text)).toBeNull();
  });
});

describe("validateExpenseEdit", () => {
  it("accepts any of the editable fields, each checked as on a new record", () => {
    expect(validateExpenseEdit({ amountCents: 5000, date: "2026-10-01", paidTo: " New Payee ", category: " Travel " }, TODAY)).toEqual({
      ok: true,
      value: { amountCents: 5000, date: "2026-10-01", paidTo: "New Payee", category: "Travel" },
    });
  });

  it("lets an optional field be cleared with null or a blank, but not a required one", () => {
    expect(validateExpenseEdit({ category: null, sellerAddress: "", vendorGstNumber: " " }, TODAY)).toEqual({
      ok: true,
      value: { category: null, sellerAddress: null, vendorGstNumber: null },
    });
    expect(validateExpenseEdit({ paidTo: "" }, TODAY).ok).toBe(false);
    expect(validateExpenseEdit({ whatFor: null }, TODAY).ok).toBe(false);
  });

  it("refuses a key that isn't editable — the currency, the status, the source", () => {
    for (const key of ["currency", "status", "sourceKind", "editedByPerson", "id"]) {
      expect(validateExpenseEdit({ [key]: "x" }, TODAY).ok, key).toBe(false);
    }
  });

  it("refuses a future date and a bad amount", () => {
    expect(validateExpenseEdit({ date: "2026-10-08" }, TODAY).ok).toBe(false);
    expect(validateExpenseEdit({ amountCents: 0 }, TODAY).ok).toBe(false);
  });

  it("refuses something that isn't an object", () => {
    expect(validateExpenseEdit(5000, TODAY).ok).toBe(false);
    expect(validateExpenseEdit(null, TODAY).ok).toBe(false);
  });
});

describe("validateExpenseSource", () => {
  it("accepts a kind and a label", () => {
    expect(validateExpenseSource({ kind: "typed", label: " typed by you " })).toEqual({
      ok: true,
      value: { kind: "typed", label: "typed by you" },
    });
    expect(validateExpenseSource({ kind: "agent", label: "the Lens" }).ok).toBe(true);
  });

  it.each([
    ["an unknown kind", { kind: "bank", label: "x" }],
    ["a figures-only kind", { kind: "tax-return", label: "x" }],
    ["an empty label", { kind: "file", label: "  " }],
    ["a label over 120 characters", { kind: "file", label: "x".repeat(121) }],
    ["a label with a control character", { kind: "file", label: "a\u0007b" }],
    ["no source at all", null],
  ])("refuses %s", (_name, source) => {
    expect(validateExpenseSource(source).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// routes

const SOURCE = { kind: "typed", label: "typed by you" };

function post(route: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/expenses/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
const FROM_APP = { "sec-fetch-site": "same-origin" };

const expenseCount = () => prisma.expense.count();
const statusOf = async (id: string) => (await prisma.expense.findUniqueOrThrow({ where: { id } })).status;

/** Proposes through the real route and returns what came back. */
async function propose(expenses: unknown[] = [good], target = ventureId): Promise<ExpenseView[]> {
  const res = await routes.propose.POST(post("propose", { ventureId: target, source: SOURCE, expenses }));
  expect(res.status).toBe(201);
  return ((await res.json()) as { expenses: ExpenseView[] }).expenses;
}

/** Agrees through the real route, as the app's own page would. */
async function agree(ids: string[], edits?: unknown, target = ventureId) {
  return routes.agree.POST(post("agree", { ventureId: target, expenseIds: ids, edits }, FROM_APP));
}

describe("POST /api/expenses/propose", () => {
  it("creates records as proposed, and only that", async () => {
    const created = await propose([
      good,
      {
        ...good,
        date: "2026-09-01",
        amountCents: 12_000,
        currency: "USD",
        category: "Office supplies",
        sellerAddress: "1 Example Street",
        vendorGstNumber: "123456789RT0001",
      },
    ]);
    expect(created).toHaveLength(2);
    for (const e of created) {
      expect(e).toMatchObject({ status: "proposed", agreedAt: null, retractedAt: null, editedByPerson: false, sourceKind: "typed", sourceLabel: "typed by you", ventureId });
    }
    const plain = created.find((e) => e.amountCents === 4_599)!;
    expect(plain).toMatchObject({ date: "2026-09-30", currency: "CAD", paidTo: "Example Stationery Ltd", whatFor: "printer paper", category: null, sellerAddress: null, vendorGstNumber: null });
    const full = created.find((e) => e.amountCents === 12_000)!;
    expect(full).toMatchObject({ date: "2026-09-01", currency: "USD", category: "Office supplies", sellerAddress: "1 Example Street", vendorGstNumber: "123456789 RT 0001" });
  });

  it("stores the day as midnight UTC of that day, so it never shifts with the time zone", async () => {
    const [e] = await propose([{ ...good, date: "2026-03-01" }]);
    const row = await prisma.expense.findUniqueOrThrow({ where: { id: e.id } });
    expect(row.date.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(e.date).toBe("2026-03-01");
  });

  it("never fills in a category the caller didn't give", async () => {
    const [e] = await propose([{ ...good, paidTo: "Example Software Subscriptions Inc", whatFor: "monthly software subscription" }]);
    expect(e.category).toBeNull();
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: e.id } })).category).toBeNull();
  });

  it.each([
    ["status", { status: "confirmed" }],
    ["agreedAt", { agreedAt: "2026-01-01T00:00:00Z" }],
    ["retractedAt", { retractedAt: "2026-01-01T00:00:00Z" }],
    ["editedByPerson", { editedByPerson: true }],
  ])("refuses a record that carries %s, and creates nothing", async (_key, extra) => {
    const before = await expenseCount();
    const res = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, expenses: [good, { ...good, ...extra }] }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe(
      "Expenses can only be proposed here. Confirming is the person's click in the agree prompt.",
    );
    expect(await expenseCount()).toBe(before);
  });

  it("refuses a body or a source that carries status, and creates nothing", async () => {
    const before = await expenseCount();
    const top = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, expenses: [good], status: "confirmed" }));
    const inSource = await routes.propose.POST(post("propose", { ventureId, source: { ...SOURCE, status: "confirmed" }, expenses: [good] }));
    expect([top.status, inSource.status]).toEqual([400, 400]);
    expect(await expenseCount()).toBe(before);
  });

  it("refuses 501 records in one call, and accepts exactly 500", async () => {
    const before = await expenseCount();
    const tooMany = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, expenses: Array(501).fill(good) }));
    expect(tooMany.status).toBe(400);
    expect(await expenseCount()).toBe(before);
    const fiveHundred = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, expenses: Array(500).fill(good) }));
    expect(fiveHundred.status).toBe(201);
    expect(await expenseCount()).toBe(before + 500);
  });

  it("is all or nothing: one bad record means none are created, and the refusal names no words of the person's", async () => {
    const before = await expenseCount();
    const res = await routes.propose.POST(
      post("propose", { ventureId, source: SOURCE, expenses: [good, { ...good, paidTo: "Example Secret Clinic", amountCents: 0 }] }),
    );
    expect(res.status).toBe(400);
    const { error } = (await res.json()) as { error: string };
    expect(error).toMatch(/^Expense 2: .*can't be zero/);
    expect(error).not.toContain("Secret Clinic");
    expect(await expenseCount()).toBe(before);
  });

  it("refuses an empty list, a missing source and a missing idea", async () => {
    expect((await routes.propose.POST(post("propose", { ventureId, source: SOURCE, expenses: [] }))).status).toBe(400);
    expect((await routes.propose.POST(post("propose", { ventureId, expenses: [good] }))).status).toBe(400);
    expect((await routes.propose.POST(post("propose", { source: SOURCE, expenses: [good] }))).status).toBe(400);
  });

  describe("on the computer's own day, not the UTC day", () => {
    const originalZone = process.env.TZ;
    afterEach(() => {
      vi.useRealTimers();
      if (originalZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalZone;
    });

    // 06:30 UTC on April 1 is 11:30 p.m. on March 31 in Vancouver (PDT, UTC-7): the UTC day has
    // already turned over but the person's has not.
    function atVancouverLateEvening() {
      process.env.TZ = "America/Vancouver";
      // Only the clock is faked; timers stay real so the database calls still complete.
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-04-01T06:30:00Z"));
    }

    it("refuses a purchase dated tomorrow in Vancouver (today in UTC), and creates nothing", async () => {
      atVancouverLateEvening();
      const before = await expenseCount();
      const res = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, expenses: [{ ...good, date: "2026-04-01" }] }));
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toMatch(/hasn't happened yet/);
      expect(await expenseCount()).toBe(before);
    });

    it("accepts a purchase dated today in Vancouver", async () => {
      atVancouverLateEvening();
      const res = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, expenses: [{ ...good, date: "2026-03-31" }] }));
      expect(res.status).toBe(201);
    });

    it("the agree route measures an edited date by the same local day", async () => {
      const [e] = await propose();
      atVancouverLateEvening();
      const refused = await agree([e.id], { [e.id]: { date: "2026-04-01" } });
      expect(refused.status).toBe(400);
      expect(await statusOf(e.id)).toBe("proposed");
      const accepted = await agree([e.id], { [e.id]: { date: "2026-03-31" } });
      expect(accepted.status).toBe(200);
    });
  });

  it("answers 404 for an idea that isn't there", async () => {
    const res = await routes.propose.POST(post("propose", { ventureId: "nope", source: SOURCE, expenses: [good] }));
    expect(res.status).toBe(404);
  });

  it("refuses a body that isn't JSON-typed, and one over its size cap", async () => {
    const plain = new Request("http://localhost/api/expenses/propose", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ ventureId, source: SOURCE, expenses: [good] }),
    });
    expect((await routes.propose.POST(plain)).status).toBe(415);
    const huge = { ventureId, source: SOURCE, expenses: [good], pad: "x".repeat(800 * 1024) };
    expect((await routes.propose.POST(post("propose", huge))).status).toBe(413);
  });

  it("refuses a cross-site request", async () => {
    const res = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, expenses: [good] }, { "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/expenses", () => {
  it("lists an idea's records by purchase day and leaves out discarded ones", async () => {
    const [later, earlier, dropped] = await propose([
      { ...good, date: "2020-06-15" },
      { ...good, date: "2020-01-10" },
      { ...good, date: "2020-03-01" },
    ]);
    await prisma.expense.update({ where: { id: dropped.id }, data: { status: "discarded" } });

    const res = await routes.list.GET!(new Request(`http://localhost/api/expenses?venture=${ventureId}`));
    expect(res.status).toBe(200);
    const { expenses } = (await res.json()) as { expenses: ExpenseView[] };
    expect(expenses.some((e) => e.id === dropped.id)).toBe(false);
    const ours = expenses.filter((e) => [later.id, earlier.id].includes(e.id));
    expect(ours.map((e) => e.id)).toEqual([earlier.id, later.id]);
    const days = expenses.map((e) => e.date);
    expect(days).toEqual([...days].sort());
  });

  it("keeps one idea's records out of another's list", async () => {
    const [mine] = await propose([{ ...good, whatFor: "only on the first idea" }]);
    const other = await listExpenses(prisma, otherVentureId);
    expect(other.some((e) => e.id === mine.id)).toBe(false);
  });

  it("answers 404 for an idea that isn't the person's, and 400 for an empty idea or two scopes at once", async () => {
    expect((await routes.list.GET!(new Request("http://localhost/api/expenses?venture=nope"))).status).toBe(404);
    expect((await routes.list.GET!(new Request("http://localhost/api/expenses?venture="))).status).toBe(400);
    expect((await routes.list.GET!(new Request(`http://localhost/api/expenses?venture=${ventureId}&unattached`))).status).toBe(400);
  });

  it("an idea belonging to someone else is a 404 even when the id exists", async () => {
    const stranger = await prisma.user.create({ data: { email: "someone-else-expenses@test.local" } });
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
    expect((await routes.list.GET!(new Request(`http://localhost/api/expenses?venture=${theirs.id}`))).status).toBe(404);
    const res = await routes.propose.POST(post("propose", { ventureId: theirs.id, source: SOURCE, expenses: [good] }));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/expenses/agree — only the app's own page", () => {
  it("refuses a request with no Sec-Fetch-Site header (a script or an agent), and the record stays proposed", async () => {
    const [e] = await propose();
    const res = await routes.agree.POST(post("agree", { ventureId, expenseIds: [e.id] }));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe("Only the agree prompt in DotAmi's window can confirm expense records.");
    expect(await statusOf(e.id)).toBe("proposed");
  });

  it.each(["cross-site", "same-site", "none"])("refuses Sec-Fetch-Site: %s", async (site) => {
    const [e] = await propose();
    const res = await routes.agree.POST(post("agree", { ventureId, expenseIds: [e.id] }, { "sec-fetch-site": site }));
    expect(res.status).toBe(403);
    expect(await statusOf(e.id)).toBe("proposed");
  });

  it("refuses before it reads the body: a body that isn't even JSON-typed still gets the 403", async () => {
    const [e] = await propose();
    const res = await routes.agree.POST(
      new Request("http://localhost/api/expenses/agree", { method: "POST", headers: { "content-type": "text/plain" }, body: e.id }),
    );
    expect(res.status).toBe(403);
  });

  it("an agent that proposes cannot also agree: propose then agree without the page header leaves it waiting", async () => {
    const created = await routes.propose.POST(post("propose", { ventureId, source: { kind: "agent", label: "an outside agent" }, expenses: [good] }));
    const [e] = ((await created.json()) as { expenses: ExpenseView[] }).expenses;
    expect(e.status).toBe("proposed");
    expect((await routes.agree.POST(post("agree", { ventureId, expenseIds: [e.id] }))).status).toBe(403);
    expect(await statusOf(e.id)).toBe("proposed");
  });

  it("confirms a waiting record when asked from the app's page, stamping the day", async () => {
    const [e] = await propose();
    const res = await agree([e.id]);
    expect(res.status).toBe(200);
    const { expenses, skipped } = (await res.json()) as { expenses: ExpenseView[]; skipped: string[] };
    expect(skipped).toEqual([]);
    expect(expenses).toHaveLength(1);
    expect(expenses[0]).toMatchObject({ id: e.id, status: "confirmed", editedByPerson: false, retractedAt: null });
    expect(expenses[0].agreedAt).toEqual(expect.any(String));
  });

  it("marks a record edited by the person only when an edit really changed something", async () => {
    const [changed, same] = await propose([good, { ...good, whatFor: "stapler" }]);
    const res = await agree([changed.id, same.id], {
      [changed.id]: { amountCents: 5_000, category: "Office supplies", vendorGstNumber: "123456789" },
      // Typed over with the value it already had: not an edit.
      [same.id]: { amountCents: good.amountCents, paidTo: good.paidTo },
    });
    expect(res.status).toBe(200);
    const { expenses } = (await res.json()) as { expenses: ExpenseView[] };
    const a = expenses.find((e) => e.id === changed.id)!;
    const b = expenses.find((e) => e.id === same.id)!;
    expect(a).toMatchObject({ amountCents: 5_000, category: "Office supplies", vendorGstNumber: "123456789", editedByPerson: true, status: "confirmed" });
    expect(b).toMatchObject({ amountCents: good.amountCents, editedByPerson: false, status: "confirmed" });
  });

  it("lets an edit clear an optional field, and the edit sticks in the database", async () => {
    const [e] = await propose([{ ...good, category: "Travel", sellerAddress: "1 Example Street" }]);
    await agree([e.id], { [e.id]: { category: null, sellerAddress: "" } });
    const row = await prisma.expense.findUniqueOrThrow({ where: { id: e.id } });
    expect(row).toMatchObject({ category: null, sellerAddress: null, editedByPerson: true });
  });

  it("refuses a bad edit and agrees to nothing — even the other records in the same call", async () => {
    const [a, b] = await propose([good, good]);
    for (const edits of [
      { [b.id]: { amountCents: 0 } },
      { [b.id]: { currency: "USD" } },
      { [b.id]: { status: "confirmed" } },
      { "not-in-this-call": { amountCents: 100 } },
    ]) {
      const res = await agree([a.id, b.id], edits);
      expect(res.status).toBe(400);
    }
    expect(await statusOf(a.id)).toBe("proposed");
    expect(await statusOf(b.id)).toBe("proposed");
    expect((await agree([a.id], "not an object")).status).toBe(400);
    expect((await agree([a.id], [1, 2])).status).toBe(400);
  });

  it("skips what isn't waiting, belongs to another idea or doesn't exist, and changes none of it", async () => {
    const [waiting] = await propose();
    const [elsewhere] = await propose([good], otherVentureId);
    const first = await agree([waiting.id]);
    expect(first.status).toBe(200);
    const again = await agree([waiting.id, elsewhere.id, "no-such-id"]);
    const { expenses, skipped } = (await again.json()) as { expenses: ExpenseView[]; skipped: string[] };
    expect(expenses).toEqual([]);
    expect(skipped.sort()).toEqual([waiting.id, elsewhere.id, "no-such-id"].sort());
    expect(await statusOf(elsewhere.id)).toBe("proposed");
  });

  it("needs a list of ids, and an idea named properly when one is named", async () => {
    // Leaving the idea out is allowed since 2026-10-08 (any of the person's records); naming one badly is not.
    expect((await routes.agree.POST(post("agree", { ventureId: 5, expenseIds: ["x"] }, FROM_APP))).status).toBe(400);
    expect((await routes.agree.POST(post("agree", { ventureId: "", expenseIds: ["x"] }, FROM_APP))).status).toBe(400);
    expect((await routes.agree.POST(post("agree", { expenseIds: [] }, FROM_APP))).status).toBe(400);
    expect((await routes.agree.POST(post("agree", { ventureId, expenseIds: [] }, FROM_APP))).status).toBe(400);
    expect((await routes.agree.POST(post("agree", { ventureId, expenseIds: [5] }, FROM_APP))).status).toBe(400);
    expect((await routes.agree.POST(post("agree", { ventureId: "nope", expenseIds: ["x"] }, FROM_APP))).status).toBe(404);
  });
});

describe("the whole lifecycle", () => {
  it("proposed to confirmed to retracted, with the day it was taken back", async () => {
    const [e] = await propose();
    expect(await statusOf(e.id)).toBe("proposed");

    expect((await agree([e.id])).status).toBe(200);
    expect(await statusOf(e.id)).toBe("confirmed");

    // Taking a record back is the person's call too: not without the page header.
    const refused = await routes.retract.POST(post("retract", { ventureId, expenseIds: [e.id] }));
    expect(refused.status).toBe(403);
    expect(await statusOf(e.id)).toBe("confirmed");

    const res = await routes.retract.POST(post("retract", { ventureId, expenseIds: [e.id] }, FROM_APP));
    expect(res.status).toBe(200);
    const { expenses } = (await res.json()) as { expenses: ExpenseView[] };
    expect(expenses[0]).toMatchObject({ id: e.id, status: "retracted" });
    expect(expenses[0].retractedAt).toEqual(expect.any(String));
    expect(expenses[0].agreedAt).toEqual(expect.any(String));

    // A retracted record stays listed (the history stays honest) and can't be agreed to again.
    const listed = await listExpenses(prisma, ventureId);
    expect(listed.find((x) => x.id === e.id)?.status).toBe("retracted");
    const again = (await (await agree([e.id])).json()) as { skipped: string[] };
    expect(again.skipped).toEqual([e.id]);
  });

  it("retract moves only confirmed records", async () => {
    const [waiting] = await propose();
    const res = await routes.retract.POST(post("retract", { ventureId, expenseIds: [waiting.id] }, FROM_APP));
    const { expenses, skipped } = (await res.json()) as { expenses: ExpenseView[]; skipped: string[] };
    expect(expenses).toEqual([]);
    expect(skipped).toEqual([waiting.id]);
    expect(await statusOf(waiting.id)).toBe("proposed");
  });

  it("discard refuses a request with no Sec-Fetch-Site header (a script or an agent), and the record stays proposed", async () => {
    const [e] = await propose();
    const res = await routes.discard.POST(post("discard", { ventureId, expenseIds: [e.id] }));
    expect(res.status).toBe(403);
    expect(await statusOf(e.id)).toBe("proposed");
  });

  it.each(["cross-site", "same-site", "none"])("discard refuses Sec-Fetch-Site: %s", async (site) => {
    const [e] = await propose();
    const res = await routes.discard.POST(post("discard", { ventureId, expenseIds: [e.id] }, { "sec-fetch-site": site }));
    expect(res.status).toBe(403);
    expect(await statusOf(e.id)).toBe("proposed");
  });

  it("discard turns a waiting record down and hides it from the list when it comes from DotAmi's own page", async () => {
    const [e] = await propose();
    const res = await routes.discard.POST(post("discard", { ventureId, expenseIds: [e.id] }, FROM_APP));
    expect(res.status).toBe(200);
    expect(await statusOf(e.id)).toBe("discarded");
    expect((await listExpenses(prisma, ventureId)).some((x) => x.id === e.id)).toBe(false);
    // The row is still in the data file (the page /your-data counts it).
    expect(await prisma.expense.findUnique({ where: { id: e.id } })).not.toBeNull();
  });

  it("discard never touches a record the person already agreed to", async () => {
    const [e] = await propose();
    await agree([e.id]);
    const res = await routes.discard.POST(post("discard", { ventureId, expenseIds: [e.id] }, FROM_APP));
    const { expenses, skipped } = (await res.json()) as { expenses: ExpenseView[]; skipped: string[] };
    expect(expenses).toEqual([]);
    expect(skipped).toEqual([e.id]);
    expect(await statusOf(e.id)).toBe("confirmed");
  });

  it("the store functions give the same answers as the routes", async () => {
    const [a, b] = await proposeExpenses(prisma, ventureId, SOURCE, [good, good], TODAY);
    const agreed = await agreeToExpenses(prisma, ventureId, [a.id], undefined, TODAY);
    expect(agreed.changed.map((e) => e.status)).toEqual(["confirmed"]);
    expect((await retractExpenses(prisma, ventureId, [a.id])).changed[0].status).toBe("retracted");
    expect((await discardExpenses(prisma, ventureId, [b.id])).changed[0].status).toBe("discarded");
  });
});

describe("what is stored", () => {
  it("has no column for a card number, a bank number, a receipt or a deductible mark", async () => {
    const columns = (await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("Expense")`)).map((c) => c.name).sort();
    expect(columns).toEqual(
      [
        "agreedAt",
        "amountCents",
        "businessSharePercent",
        "category",
        "creditNote",
        "currency",
        "date",
        "editedByPerson",
        "gstHstCents",
        "id",
        "paidTo",
        "proposedAt",
        "recordKind",
        "refundOfId",
        "retractedAt",
        "sellerAddress",
        "sourceKind",
        "sourceLabel",
        "status",
        "vendorGstNumber",
        "ventureId",
        "whatFor",
      ].sort(),
    );
  });

  it("keeps the exact cents of an amount the database holds as BigInt", async () => {
    const [e] = await propose([{ ...good, amountCents: 123_456_789_012 }]);
    expect(e.amountCents).toBe(123_456_789_012);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: e.id } })).amountCents).toBe(123_456_789_012n);
  });

  it("deleting an idea deletes its expense records — and nobody else's", async () => {
    // A third idea, owned by the same (stub) user as the other two.
    const { userId } = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } });
    const doomed = (
      await prisma.venture.create({
        data: { userId, name: "doomed", type: "SERVICE", province: "AB", targetRevenueY1: 0, targetRevenueY3: 0, employmentStatus: "OTHER" },
      })
    ).id;
    const [gone] = await propose([good, { ...good, whatFor: "second" }], doomed);
    const [kept] = await propose([good], otherVentureId);
    expect(await prisma.expense.count({ where: { ventureId: doomed } })).toBe(2);

    await prisma.venture.delete({ where: { id: doomed } });

    expect(await prisma.expense.count({ where: { ventureId: doomed } })).toBe(0);
    expect(await prisma.expense.findUnique({ where: { id: gone.id } })).toBeNull();
    expect(await prisma.expense.findUnique({ where: { id: kept.id } })).not.toBeNull();
  });
});

describe("what a failure reveals", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs only the error's name and code — never the words or amount the database was handed", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error('Invalid invocation: { data: { paidTo: "Example Secret Clinic", amountCents: 987654321 } }');
    error.name = "PrismaClientKnownRequestError";
    (error as Error & { code: string }).code = "P2002";

    const res = storeErrorResponse("propose", error);

    expect(res.status).toBe(503);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toEqual(["[expenses/propose] failed (PrismaClientKnownRequestError, P2002)"]);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("Secret Clinic");
    expect(body).not.toContain("987654321");
  });

  it("answers a refusal with its plain message and logs nothing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await routes.propose.POST(post("propose", { ventureId, source: SOURCE, expenses: [{ ...good, amountCents: 0 }] }));
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
});
