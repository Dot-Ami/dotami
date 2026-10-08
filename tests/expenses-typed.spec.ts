/**
 * [8i] Typed expense records — the maintainer's decisions (2026-10-08), at the store and the routes:
 *   1. a record can be kept "not attached yet" and attached to an idea later (page-only);
 *   2. "type many, agree once": one agree call can take records from several ideas and none;
 *   3. an optional business share, the person's own whole percent 1-100, kept beside the full amount;
 *   4. refunds and credits kept either way, the person's choice: a negative amount on a record, or a
 *      separate refund record linked to the original; both keep the date, the link, the GST/HST part
 *      and the credit note when given.
 * Same throwaway-database setup as tests/expenses-store.spec.ts. Every name and number is invented.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { listExpenses } from "@/lib/expenses/store";
import type { ExpenseView } from "@/lib/expenses/types";
import { BUSINESS_SHARE_MAX, BUSINESS_SHARE_MIN, CREDIT_NOTE_MAX, validateExpenseEdit, validateExpenseInput } from "@/lib/expenses/validate";
import { demoScenarios } from "../prisma/seed-data";

const dbFile = path.join(tmpdir(), `dotami-expenses-typed-test-${randomUUID()}.db`);
const url = `file:${dbFile.replace(/\\/g, "/")}`;
let prisma: PrismaClient;
let ventureId: string;
let otherVentureId: string;

type RouteModule = { POST: (request: Request) => Promise<Response>; GET?: (request: Request) => Promise<Response> };
const routes: Partial<Record<"list" | "propose" | "agree" | "discard" | "retract" | "attach", RouteModule>> = {};
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
  routes.attach = await import("@/app/api/expenses/attach/route");

  ventureId = (await ensureVentureFromScenario(prisma, demoScenarios[0])).ventureId;
  otherVentureId = (await ensureVentureFromScenario(prisma, demoScenarios[1])).ventureId;
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  await (await import("@/lib/prisma")).prisma.$disconnect();
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
  for (const f of [dbFile, `${dbFile}-journal`]) {
    if (existsSync(f)) rmSync(f);
  }
});

afterEach(() => __resetRateLimitStateForTests());

const TODAY = "2026-10-08";
const good = { date: "2026-09-30", amountCents: 4_599, paidTo: "Example Stationery Ltd", whatFor: "printer paper" };
const SOURCE = { kind: "typed", label: "typed by you" };
const FROM_APP = { "sec-fetch-site": "same-origin" };

function post(route: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/expenses/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
const route = (name: keyof typeof routes) => routes[name]!;

/** Proposes through the real route; `target` null keeps them not attached. */
async function propose(expenses: unknown[], target: string | null = ventureId): Promise<ExpenseView[]> {
  const res = await route("propose").POST(post("propose", { ventureId: target, source: SOURCE, expenses }));
  expect(res.status, await res.clone().text()).toBe(201);
  return ((await res.json()) as { expenses: ExpenseView[] }).expenses;
}
async function agree(body: Record<string, unknown>) {
  return route("agree").POST(post("agree", body, FROM_APP));
}
async function list(query: string): Promise<ExpenseView[]> {
  const res = await route("list").GET!(new Request(`http://localhost/api/expenses${query}`));
  expect(res.status).toBe(200);
  return ((await res.json()) as { expenses: ExpenseView[] }).expenses;
}
const row = (id: string) => prisma.expense.findUniqueOrThrow({ where: { id } });
const expenseCount = () => prisma.expense.count();

// ---------------------------------------------------------------------------------------------
// validation

describe("the business share (the person's own number)", () => {
  it.each([[BUSINESS_SHARE_MIN], [40], [BUSINESS_SHARE_MAX]])("keeps a share of %s percent as typed", (share) => {
    const result = validateExpenseInput({ ...good, businessSharePercent: share }, TODAY);
    expect(result.ok && result.value.businessSharePercent).toBe(share);
  });

  it("is null when not given — DotAmi never fills one in", () => {
    const result = validateExpenseInput(good, TODAY);
    expect(result.ok && result.value.businessSharePercent).toBeNull();
    expect(validateExpenseInput({ ...good, businessSharePercent: null }, TODAY).ok).toBe(true);
  });

  it.each([
    ["0%", 0],
    ["101%", 101],
    ["a fraction of a percent", 33.5],
    ["a negative share", -5],
    ["a share as text", "40"],
  ])("refuses %s", (_name, share) => {
    const result = validateExpenseInput({ ...good, businessSharePercent: share }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/whole percent from 1 to 100/);
  });

  it("can be changed while agreeing, within the same limits", () => {
    expect(validateExpenseEdit({ businessSharePercent: 60 }, TODAY)).toEqual({ ok: true, value: { businessSharePercent: 60 } });
    expect(validateExpenseEdit({ businessSharePercent: null }, TODAY)).toEqual({ ok: true, value: { businessSharePercent: null } });
    expect(validateExpenseEdit({ businessSharePercent: 0 }, TODAY).ok).toBe(false);
  });
});

describe("refunds and credits, kept either way", () => {
  it("accepts a refund kept as a negative amount, with or without the expense it came from", () => {
    const plain = validateExpenseInput({ ...good, amountCents: -1_000 }, TODAY);
    expect(plain).toMatchObject({ ok: true, value: { amountCents: -1_000, recordKind: "expense", refundOfId: null } });
    const linked = validateExpenseInput(
      { ...good, amountCents: -1_000, refundOfId: "original-id", gstHstCents: 50, creditNote: "CN-1043 dated 2026-10-02" },
      TODAY,
    );
    expect(linked).toMatchObject({ ok: true, value: { amountCents: -1_000, refundOfId: "original-id", gstHstCents: 50, creditNote: "CN-1043 dated 2026-10-02" } });
  });

  it("accepts a separate refund record: the amount that came back, linked to the expense", () => {
    const result = validateExpenseInput({ ...good, recordKind: "refund", amountCents: 1_000, refundOfId: "original-id", gstHstCents: 50, creditNote: "CN-1" }, TODAY);
    expect(result).toMatchObject({ ok: true, value: { recordKind: "refund", amountCents: 1_000, refundOfId: "original-id", gstHstCents: 50, creditNote: "CN-1" } });
  });

  it.each([
    ["a refund record with no expense to point to", { recordKind: "refund", amountCents: 1_000 }, /needs the expense it came from/],
    ["a refund record with a negative amount", { recordKind: "refund", amountCents: -1_000, refundOfId: "x" }, /more than zero/],
    ["a purchase that points to another expense", { refundOfId: "x" }, /Only a refund or credit/],
    ["a credit note on a purchase", { creditNote: "CN-1" }, /credit note belongs to a refund/],
    ["a GST/HST part bigger than the amount", { gstHstCents: 4_600 }, /can't be more than the amount/],
    ["a GST/HST part bigger than a negative amount", { amountCents: -100, gstHstCents: 101 }, /can't be more than the amount/],
    ["a negative GST/HST part", { gstHstCents: -1 }, /zero or more/],
    ["a fractional GST/HST part", { gstHstCents: 1.5 }, /zero or more/],
    ["an unknown kind of record", { recordKind: "credit" }, /kind of record/],
    ["a credit note over its limit", { amountCents: -100, creditNote: "x".repeat(CREDIT_NOTE_MAX + 1) }, /at most 200/],
    ["a credit note with a control character", { amountCents: -100, creditNote: "CN\u0007" }, /control characters/],
  ])("refuses %s", (_name, change, message) => {
    const result = validateExpenseInput({ ...good, ...change }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });

  it("accepts a GST/HST part on a purchase too, up to the whole amount", () => {
    expect(validateExpenseInput({ ...good, gstHstCents: 0 }, TODAY).ok).toBe(true);
    expect(validateExpenseInput({ ...good, gstHstCents: good.amountCents }, TODAY).ok).toBe(true);
  });

  it("never lets an edit change what kind of record it is or what it points to", () => {
    expect(validateExpenseEdit({ recordKind: "refund" }, TODAY).ok).toBe(false);
    expect(validateExpenseEdit({ refundOfId: "x" }, TODAY).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// decision 1: not attached yet, attached later

describe("a record not attached to an idea", () => {
  it("is proposed with ventureId null and listed under 'not attached yet', not under an idea", async () => {
    const [e] = await propose([{ ...good, whatFor: "unattached paper" }], null);
    expect(e).toMatchObject({ ventureId: null, status: "proposed" });
    expect((await row(e.id)).ventureId).toBeNull();

    expect((await list("?unattached")).map((x) => x.id)).toContain(e.id);
    expect((await list(`?venture=${ventureId}`)).map((x) => x.id)).not.toContain(e.id);
    // "All" holds both the idea's records and the unattached ones.
    const [onIdea] = await propose([{ ...good, whatFor: "attached paper" }]);
    const all = (await list("")).map((x) => x.id);
    expect(all).toEqual(expect.arrayContaining([e.id, onIdea.id]));
    expect((await list("?unattached")).map((x) => x.id)).not.toContain(onIdea.id);
  });

  it("still has to be asked for: a propose body with no ventureId at all is refused, and nothing is created", async () => {
    const before = await expenseCount();
    const res = await route("propose").POST(post("propose", { source: SOURCE, expenses: [good] }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/or send null/);
    expect(await expenseCount()).toBe(before);
  });

  it("is attached to an idea later from DotAmi's page, keeping its state and agreed day", async () => {
    const [e] = await propose([good], null);
    expect((await agree({ ventureId: null, expenseIds: [e.id] })).status).toBe(200);
    const agreed = await row(e.id);

    const res = await route("attach").POST(post("attach", { ventureId, expenseIds: [e.id] }, FROM_APP));
    expect(res.status).toBe(200);
    const { expenses, skipped } = (await res.json()) as { expenses: ExpenseView[]; skipped: string[] };
    expect(skipped).toEqual([]);
    expect(expenses[0]).toMatchObject({ id: e.id, ventureId, status: "confirmed", editedByPerson: false });
    const moved = await row(e.id);
    expect(moved.agreedAt).toEqual(agreed.agreedAt);
    expect((await list(`?venture=${ventureId}`)).map((x) => x.id)).toContain(e.id);

    // Moved to the other idea, then back to "not attached yet".
    expect((await route("attach").POST(post("attach", { ventureId: otherVentureId, expenseIds: [e.id] }, FROM_APP))).status).toBe(200);
    expect((await row(e.id)).ventureId).toBe(otherVentureId);
    expect((await route("attach").POST(post("attach", { ventureId: null, expenseIds: [e.id] }, FROM_APP))).status).toBe(200);
    expect((await row(e.id)).ventureId).toBeNull();
  });

  it.each([["no header (a script or an agent)", {}], ["cross-site", { "sec-fetch-site": "cross-site" }], ["same-site", { "sec-fetch-site": "same-site" }]])(
    "can't be attached by a request with %s",
    async (_name, headers) => {
      const [e] = await propose([good], null);
      const res = await route("attach").POST(post("attach", { ventureId, expenseIds: [e.id] }, headers));
      expect(res.status).toBe(403);
      expect((await row(e.id)).ventureId).toBeNull();
    },
  );

  it("attach needs the target said (null included), a real idea, and skips turned-down records and records already there", async () => {
    const [waiting, dropped] = await propose([good, good], null);
    await route("discard").POST(post("discard", { ventureId: null, expenseIds: [dropped.id] }, FROM_APP));

    expect((await route("attach").POST(post("attach", { expenseIds: [waiting.id] }, FROM_APP))).status).toBe(400);
    expect((await route("attach").POST(post("attach", { ventureId: "nope", expenseIds: [waiting.id] }, FROM_APP))).status).toBe(404);
    const res = await route("attach").POST(post("attach", { ventureId, expenseIds: [waiting.id, dropped.id, "no-such-id"] }, FROM_APP));
    const { expenses, skipped } = (await res.json()) as { expenses: ExpenseView[]; skipped: string[] };
    expect(expenses.map((x) => x.id)).toEqual([waiting.id]);
    expect(skipped.sort()).toEqual([dropped.id, "no-such-id"].sort());
    expect((await row(dropped.id)).ventureId).toBeNull();
    // Already on that idea: nothing to move.
    const again = (await (await route("attach").POST(post("attach", { ventureId, expenseIds: [waiting.id] }, FROM_APP))).json()) as { skipped: string[] };
    expect(again.skipped).toEqual([waiting.id]);
  });

  it("can't be used to reach a record on someone else's idea", async () => {
    const stranger = await prisma.user.create({ data: { email: `someone-else-typed-${randomUUID()}@test.local` } });
    const theirs = await prisma.venture.create({
      data: { userId: stranger.id, name: "theirs", type: "SERVICE", province: "AB", targetRevenueY1: 0, targetRevenueY3: 0, employmentStatus: "OTHER" },
    });
    const foreign = await prisma.expense.create({
      data: { ventureId: theirs.id, date: new Date("2026-09-01T00:00:00Z"), amountCents: 100n, paidTo: "x", whatFor: "y", sourceKind: "typed", sourceLabel: "typed by you" },
    });
    const res = await route("attach").POST(post("attach", { ventureId, expenseIds: [foreign.id] }, FROM_APP));
    expect(((await res.json()) as { skipped: string[] }).skipped).toEqual([foreign.id]);
    expect((await row(foreign.id)).ventureId).toBe(theirs.id);
    expect((await list("")).map((x) => x.id)).not.toContain(foreign.id);
    const agreed = (await (await agree({ expenseIds: [foreign.id] })).json()) as { skipped: string[] };
    expect(agreed.skipped).toEqual([foreign.id]);
    expect((await row(foreign.id)).status).toBe("proposed");
  });

  it("stays when an idea is deleted; the idea's own records go with it", async () => {
    const { userId } = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId } });
    const doomed = (
      await prisma.venture.create({
        data: { userId, name: "doomed", type: "SERVICE", province: "AB", targetRevenueY1: 0, targetRevenueY3: 0, employmentStatus: "OTHER" },
      })
    ).id;
    const [gone] = await propose([good], doomed);
    const [kept] = await propose([good], null);
    await prisma.venture.delete({ where: { id: doomed } });
    expect(await prisma.expense.findUnique({ where: { id: gone.id } })).toBeNull();
    expect(await prisma.expense.findUnique({ where: { id: kept.id } })).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// decision 2: type many, agree once

describe("agreeing to several at once", () => {
  it("one call agrees to records on two ideas and one not attached, when no idea is named", async () => {
    const [a] = await propose([{ ...good, whatFor: "batch a" }]);
    const [b] = await propose([{ ...good, whatFor: "batch b" }], otherVentureId);
    const [c] = await propose([{ ...good, whatFor: "batch c" }], null);
    const res = await agree({ expenseIds: [a.id, b.id, c.id] });
    expect(res.status).toBe(200);
    const { expenses, skipped } = (await res.json()) as { expenses: ExpenseView[]; skipped: string[] };
    expect(skipped).toEqual([]);
    expect(expenses.map((x) => x.status)).toEqual(["confirmed", "confirmed", "confirmed"]);
  });

  it("a scope still narrows it: null agrees only to unattached records, an idea only to its own", async () => {
    const [onIdea] = await propose([good]);
    const [loose] = await propose([good], null);
    const body = (await (await agree({ ventureId: null, expenseIds: [onIdea.id, loose.id] })).json()) as { expenses: ExpenseView[]; skipped: string[] };
    expect(body.expenses.map((x) => x.id)).toEqual([loose.id]);
    expect(body.skipped).toEqual([onIdea.id]);
    expect((await row(onIdea.id)).status).toBe("proposed");
  });

  it("only the ticked ones: records left out of the call stay waiting", async () => {
    const [ticked, unticked] = await propose([good, { ...good, whatFor: "not ticked" }]);
    await agree({ expenseIds: [ticked.id] });
    expect((await row(ticked.id)).status).toBe("confirmed");
    expect((await row(unticked.id)).status).toBe("proposed");
  });

  it("an agent's proposal still waits: no agreeing without DotAmi's page, whatever the scope", async () => {
    const created = await route("propose").POST(post("propose", { ventureId: null, source: { kind: "agent", label: "an outside agent" }, expenses: [good] }));
    const [e] = ((await created.json()) as { expenses: ExpenseView[] }).expenses;
    for (const scope of [{}, { ventureId: null }]) {
      expect((await route("agree").POST(post("agree", { ...scope, expenseIds: [e.id] }))).status).toBe(403);
    }
    expect((await row(e.id)).status).toBe("proposed");
  });
});

// ---------------------------------------------------------------------------------------------
// decision 3: the business share, stored

describe("the business share in the database", () => {
  it("is kept as typed beside the full amount, and the amount is not touched", async () => {
    const [e] = await propose([{ ...good, amountCents: 10_000, businessSharePercent: 40 }]);
    expect(e).toMatchObject({ amountCents: 10_000, businessSharePercent: 40 });
    const stored = await row(e.id);
    expect(stored.amountCents).toBe(10_000n);
    expect(stored.businessSharePercent).toBe(40);
  });

  it("an edit while agreeing changes it and marks the record edited; a bad one agrees to nothing", async () => {
    const [a, b] = await propose([{ ...good, businessSharePercent: 40 }, good]);
    expect((await agree({ expenseIds: [a.id, b.id], edits: { [a.id]: { businessSharePercent: 101 } } })).status).toBe(400);
    expect((await row(a.id)).status).toBe("proposed");
    expect((await row(b.id)).status).toBe("proposed");
    const ok = (await (await agree({ expenseIds: [a.id, b.id], edits: { [a.id]: { businessSharePercent: 55 } } })).json()) as { expenses: ExpenseView[] };
    expect(ok.expenses.find((x) => x.id === a.id)).toMatchObject({ businessSharePercent: 55, editedByPerson: true });
    expect(ok.expenses.find((x) => x.id === b.id)).toMatchObject({ businessSharePercent: null, editedByPerson: false });
  });
});

// ---------------------------------------------------------------------------------------------
// decision 4: refunds both ways

describe("refunds and credits in the database", () => {
  it("as a negative amount on a record, linked to the expense it came from, with its GST/HST part and credit note", async () => {
    const [original] = await propose([{ ...good, amountCents: 11_300, gstHstCents: 1_300 }]);
    const [credit] = await propose([
      { ...good, date: "2026-10-02", amountCents: -2_260, refundOfId: original.id, gstHstCents: 260, creditNote: "CN-1043, 2026-10-02" },
    ]);
    expect(credit).toMatchObject({ recordKind: "expense", amountCents: -2_260, refundOfId: original.id, gstHstCents: 260, creditNote: "CN-1043, 2026-10-02", date: "2026-10-02" });
    const stored = await row(credit.id);
    expect(stored.amountCents).toBe(-2_260n);
    expect(stored.gstHstCents).toBe(260n);
  });

  it("as a negative amount with no original in DotAmi", async () => {
    const [credit] = await propose([{ ...good, amountCents: -500, creditNote: "store credit slip" }], null);
    expect(credit).toMatchObject({ amountCents: -500, refundOfId: null, ventureId: null });
  });

  it("as a separate refund record linked to the original; agreeing keeps all of it", async () => {
    const [original] = await propose([{ ...good, amountCents: 20_000 }]);
    const [refund] = await propose([
      { ...good, date: "2026-10-03", recordKind: "refund", amountCents: 5_000, refundOfId: original.id, gstHstCents: 575, creditNote: "credit note 77" },
    ]);
    expect((await agree({ expenseIds: [refund.id] })).status).toBe(200);
    expect(await row(refund.id)).toMatchObject({ recordKind: "refund", amountCents: 5_000n, refundOfId: original.id, gstHstCents: 575n, creditNote: "credit note 77", status: "confirmed" });
    // The original is listed with the refund pointing at it; the original's own amount is untouched.
    const listed = await listExpenses(prisma, ventureId);
    expect(listed.find((x) => x.id === original.id)?.amountCents).toBe(20_000);
    expect(listed.find((x) => x.id === refund.id)?.refundOfId).toBe(original.id);
  });

  it.each([
    ["an id that isn't a record", async () => "no-such-expense", /isn't one of your expense records/],
    ["a turned-down record", async () => {
      const [e] = await propose([good]);
      await route("discard").POST(post("discard", { expenseIds: [e.id] }, FROM_APP));
      return e.id;
    }, /isn't one of your expense records/],
    ["a refund record", async () => {
      const [o] = await propose([good]);
      const [r] = await propose([{ ...good, recordKind: "refund", amountCents: 100, refundOfId: o.id }]);
      return r.id;
    }, /not to another refund or credit/],
    ["a credit kept as a negative amount", async () => {
      const [c] = await propose([{ ...good, amountCents: -100 }]);
      return c.id;
    }, /not to another refund or credit/],
  ])("refuses a refund pointing at %s, and creates nothing", async (_name, target, message) => {
    const refundOfId = await target();
    const before = await expenseCount();
    const res = await route("propose").POST(
      post("propose", { ventureId, source: SOURCE, expenses: [good, { ...good, recordKind: "refund", amountCents: 100, refundOfId }] }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(new RegExp(`^Expense 2: .*${message.source}`));
    expect(await expenseCount()).toBe(before);
  });

  it("an edit while agreeing can't break a refund's rules: a negative refund record or a GST/HST part above the amount", async () => {
    const [original] = await propose([{ ...good, amountCents: 20_000 }]);
    const [refund] = await propose([{ ...good, recordKind: "refund", amountCents: 5_000, refundOfId: original.id, gstHstCents: 500 }]);
    const [plain] = await propose([good]);
    for (const edit of [{ amountCents: -5_000 }, { amountCents: 400 }, { gstHstCents: 5_001 }]) {
      const res = await agree({ expenseIds: [plain.id, refund.id], edits: { [refund.id]: edit } });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toMatch(/^Expense 2: /);
    }
    // Nothing in those calls was agreed, not even the plain record that came first.
    expect((await row(plain.id)).status).toBe("proposed");
    expect((await row(refund.id)).status).toBe("proposed");
    // A credit note can't be added to a purchase by an edit either.
    expect((await agree({ expenseIds: [plain.id], edits: { [plain.id]: { creditNote: "CN-9" } } })).status).toBe(400);
  });

  it("deleting the original keeps the refund record, with its link cleared", async () => {
    const [original] = await propose([good]);
    const [refund] = await propose([{ ...good, recordKind: "refund", amountCents: 100, refundOfId: original.id }]);
    await prisma.expense.delete({ where: { id: original.id } });
    expect(await row(refund.id)).toMatchObject({ recordKind: "refund", refundOfId: null });
  });
});
