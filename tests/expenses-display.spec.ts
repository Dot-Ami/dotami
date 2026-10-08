/**
 * [8i] The typing screen's own logic (lib/expenses/display.ts): what the person typed becomes the
 * record to propose, exactly — the refund's sign comes only from the way they chose to keep it, a
 * business share is only ever their own number, and the lines under a record repeat their numbers
 * without working anything out. Every name and number is invented.
 */
import { describe, expect, it } from "vitest";

import {
  draftToForm,
  draftToProposal,
  EMPTY_FORM,
  forAfterRefundShortcut,
  formToDraft,
  keptText,
  nameTheRecord,
  readBusinessShare,
  recordFacts,
  type ExpenseFormValues,
} from "@/lib/expenses/display";
import { validateExpenseInput } from "@/lib/expenses/validate";

const typed: ExpenseFormValues = { ...EMPTY_FORM, date: "2026-10-01", amount: "45.99", paidTo: "Example Stationery Ltd", whatFor: "printer paper" };

describe("formToDraft", () => {
  it("turns a typed purchase into a record with nothing filled in that wasn't typed", () => {
    const result = formToDraft(typed, "k1");
    expect(result).toEqual({
      ok: true,
      draft: {
        key: "k1",
        date: "2026-10-01",
        amountCents: 4_599,
        currency: "CAD",
        paidTo: "Example Stationery Ltd",
        whatFor: "printer paper",
        category: null,
        sellerAddress: null,
        vendorGstNumber: null,
        recordKind: "expense",
        refundOfId: null,
        gstHstCents: null,
        creditNote: null,
        businessSharePercent: null,
      },
    });
  });

  it("keeps the business share and GST/HST part as typed, beside the full amount", () => {
    const result = formToDraft({ ...typed, amount: "100", businessShare: "40%", gstHst: "4.76" }, "k");
    expect(result.ok && result.draft).toMatchObject({ amountCents: 10_000, businessSharePercent: 40, gstHstCents: 476 });
  });

  it("a refund kept as a negative amount: the amount typed without a sign becomes negative, by that choice only", () => {
    const result = formToDraft({ ...typed, is: "refund", refundWay: "negative", amount: "10", creditNote: "CN-7", refundOfId: "p1" }, "k");
    expect(result.ok && result.draft).toMatchObject({ recordKind: "expense", amountCents: -1_000, refundOfId: "p1", creditNote: "CN-7" });
  });

  it("a separate refund record: the amount that came back, above zero, linked to the purchase", () => {
    const result = formToDraft({ ...typed, is: "refund", refundWay: "separate", amount: "10", refundOfId: "p1" }, "k");
    expect(result.ok && result.draft).toMatchObject({ recordKind: "refund", amountCents: 1_000, refundOfId: "p1" });
  });

  it("drops a credit note and link typed while it was a refund, if it is switched back to a purchase", () => {
    const result = formToDraft({ ...typed, is: "purchase", creditNote: "CN-7", refundOfId: "p1" }, "k");
    expect(result.ok && result.draft).toMatchObject({ creditNote: null, refundOfId: null, amountCents: 4_599 });
  });

  it.each([
    ["no day", { date: "" }, "date"],
    ["an amount it can't read", { amount: "about 40" }, "amount"],
    ["a zero amount", { amount: "0" }, "amount"],
    ["a minus sign on a purchase", { amount: "-10" }, "amount"],
    ["a minus sign on a refund", { is: "refund" as const, amount: "-10" }, "amount"],
    ["a currency that isn't three letters", { currency: "C$" }, "currency"],
    ["nobody paid", { paidTo: "  " }, "paidTo"],
    ["no reason", { whatFor: "" }, "whatFor"],
    ["a share of 0", { businessShare: "0" }, "businessShare"],
    ["a share over 100", { businessShare: "101" }, "businessShare"],
    ["a share with a fraction", { businessShare: "33.5" }, "businessShare"],
    ["a GST/HST part bigger than the amount", { gstHst: "50" }, "gstHst"],
    ["a separate refund record with no purchase", { is: "refund" as const, refundWay: "separate" as const, refundOfId: "" }, "refundOfId"],
  ])("stops at %s, naming the box to fix", (_name, change, field) => {
    const result = formToDraft({ ...typed, ...change }, "k");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe(field);
  });

  it("produces what the store accepts: a draft's proposal passes the server's own check", () => {
    for (const values of [
      typed,
      { ...typed, businessShare: "55", gstHst: "2" },
      { ...typed, is: "refund" as const, refundWay: "negative" as const, creditNote: "CN-1" },
      { ...typed, is: "refund" as const, refundWay: "separate" as const, refundOfId: "p1", gstHst: "1" },
    ]) {
      const result = formToDraft(values, "k");
      expect(result.ok).toBe(true);
      if (result.ok) expect(validateExpenseInput(draftToProposal(result.draft), "2026-10-08").ok).toBe(true);
    }
  });

  it("the proposal carries no key of the screen's own", () => {
    const result = formToDraft(typed, "k9");
    expect(result.ok && Object.keys(draftToProposal(result.draft))).not.toContain("key");
  });
});

describe("draftToForm", () => {
  it("round-trips every way of keeping a record, so Edit puts back what was typed", () => {
    for (const values of [
      { ...typed, category: "Office", businessShare: "40", gstHst: "1.20", sellerAddress: "1 Example St", vendorGstNumber: "123456789" },
      { ...typed, is: "refund" as const, refundWay: "negative" as const, refundOfId: "p1", creditNote: "CN-1" },
      { ...typed, is: "refund" as const, refundWay: "separate" as const, refundOfId: "p1" },
    ]) {
      const first = formToDraft(values, "k");
      expect(first.ok).toBe(true);
      if (!first.ok) continue;
      const again = formToDraft(draftToForm(first.draft), "k");
      expect(again).toEqual(first);
    }
  });
});

describe("readBusinessShare", () => {
  it("reads a whole percent 1-100, with or without the sign, and blank as none", () => {
    expect(readBusinessShare("")).toEqual({ ok: true, value: null });
    expect(readBusinessShare(" 1 ")).toEqual({ ok: true, value: 1 });
    expect(readBusinessShare("100 %")).toEqual({ ok: true, value: 100 });
    for (const bad of ["0", "101", "-5", "12.5", "forty", "1e2"]) expect(readBusinessShare(bad).ok, bad).toBe(false);
  });
});

describe("recordFacts", () => {
  const base = { amountCents: 10_000, currency: "CAD", recordKind: "expense" as const, refundOfId: null, gstHstCents: null, creditNote: null, businessSharePercent: null, category: null };

  it("says nothing for a plain purchase", () => {
    expect(recordFacts(base, null)).toEqual([]);
  });

  it("shows the share as the person's number beside the full amount, and never a multiplied-out amount", () => {
    const facts = recordFacts({ ...base, businessSharePercent: 40 }, null);
    expect(facts).toEqual(["Business share: 40% (your number) of the full $100.00"]);
    // 40% of $100.00 is never worked out on screen.
    expect(facts.join(" ")).not.toContain("40.00");
    expect(facts.join(" ").toLowerCase()).not.toContain("deductible");
  });

  it("calls a share 'your number' only when the person typed it; an agent's or a file's says who proposed it", () => {
    const share = { ...base, businessSharePercent: 25 };
    expect(recordFacts({ ...share, sourceKind: "typed", sourceLabel: "typed by you", status: "confirmed" }, null)).toEqual([
      "Business share: 25% (your number) of the full $100.00",
    ]);
    expect(recordFacts({ ...share, sourceKind: "agent", sourceLabel: "an outside agent", status: "proposed" }, null)).toEqual([
      "Business share: 25% (proposed by an outside agent) of the full $100.00",
    ]);
    expect(recordFacts({ ...share, sourceKind: "agent", sourceLabel: "an outside agent", status: "confirmed" }, null)).toEqual([
      "Business share: 25% (proposed by an outside agent, agreed by you) of the full $100.00",
    ]);
    expect(recordFacts({ ...share, sourceKind: "file", sourceLabel: "expenses.xlsx", status: "proposed" }, null)[0]).toContain("(proposed by expenses.xlsx)");
    for (const kind of ["agent", "file"] as const) {
      expect(recordFacts({ ...share, sourceKind: kind, sourceLabel: "x", status: "proposed" }, null).join(" ")).not.toContain("your number");
    }
  });

  it("names how a refund is kept, its link, GST/HST part and credit note", () => {
    expect(recordFacts({ ...base, amountCents: -1_000, refundOfId: "p1", gstHstCents: 50, creditNote: "CN-1" }, "2026-09-30 · Example · $100.00")).toEqual([
      "Refund or credit kept as a negative amount, linked to 2026-09-30 · Example · $100.00",
      "GST/HST part: $0.50",
      "Credit note: CN-1",
    ]);
    expect(recordFacts({ ...base, recordKind: "refund", amountCents: 1_000, refundOfId: null }, null)[0]).toMatch(/no longer in DotAmi/);
  });
});

describe("nameTheRecord", () => {
  it("puts the record's title where the store said its position", () => {
    expect(nameTheRecord("Expense 2: That day hasn't happened yet.", ["a", "2026-10-01 · Example — paper"])).toBe(
      "For “2026-10-01 · Example — paper”: That day hasn't happened yet.",
    );
    expect(nameTheRecord("No database reachable — nothing was changed.", ["a"])).toBe("No database reachable — nothing was changed.");
    expect(nameTheRecord("Expense 9: x", ["a"])).toBe("Expense 9: x");
  });
});

describe("forAfterRefundShortcut", () => {
  it("follows the purchase's idea only while the typed list is empty", () => {
    expect(forAfterRefundShortcut("none", 0, "idea-a")).toBe("idea-a");
    expect(forAfterRefundShortcut("idea-b", 0, "idea-a")).toBe("idea-a");
  });

  it("never moves records already on the typed list to another idea", () => {
    expect(forAfterRefundShortcut("none", 3, "idea-a")).toBe("none");
    expect(forAfterRefundShortcut("idea-b", 1, "idea-a")).toBe("idea-b");
  });

  it("leaves the choice alone for a purchase not attached to an idea", () => {
    expect(forAfterRefundShortcut("idea-b", 0, null)).toBe("idea-b");
  });
});

describe("keptText", () => {
  it("counts what the server agreed to, not what was sent", () => {
    expect(keptText({ expenses: [{}, {}], skipped: [] })).toBe("Kept 2 records.");
    expect(keptText({ expenses: [{}], skipped: ["x"] })).toBe(
      "Kept 1 record. 1 not kept: changed in another window or by another program since you opened the list.",
    );
    expect(keptText({ expenses: [], skipped: ["x", "y"] })).toMatch(/^Kept 0 records\. 2 not kept/);
    expect(keptText(null)).toBe("Kept 0 records.");
  });
});
