/**
 * The clutter budgets can only go down (docs/ui-spec/README.md, "The clutter limit"; the maintainer's pick of
 * 2026-10-17). `e2e/clutter-budget.spec.ts` holds each screen to its budget in a real browser; this holds the
 * budgets themselves to what the screens measured the day the limit was set, so a busier screen can't pass
 * by raising its own limit.
 */
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { BASELINE, BUDGETS, SCREENS, WIDTHS } from "../e2e/budgets";

/**
 * The baseline as recorded on 2026-10-17. The baseline is a record, so it never changes: this fails on any edit
 * to it, which would otherwise let a budget rise with it.
 */
const BASELINE_SHA256 = "7b2dff0b93c68d36d3882b0a8d2deff04dfe0080b33be05e27cd8e267b4d76ce";

const sizes = WIDTHS.map((w) => w.id);

describe("the clutter budgets (e2e/budgets.ts)", () => {
  it("have a baseline and a budget for every screen at every size, and nothing else", () => {
    for (const table of [BASELINE, BUDGETS]) {
      expect(Object.keys(table).sort()).toEqual([...SCREENS].sort());
      for (const screen of SCREENS) {
        expect(Object.keys(table[screen] ?? {}).sort(), screen).toEqual([...sizes].sort());
      }
    }
  });

  it("are never above the baseline, and the smallest text never below it", () => {
    const over: string[] = [];
    for (const screen of SCREENS) {
      for (const size of sizes) {
        const base = BASELINE[screen]![size]!;
        const budget = BUDGETS[screen]![size]!;
        if (budget.regions > base.regions) over.push(`${screen} ${size}: regions ${budget.regions} > ${base.regions}`);
        if (budget.controls > base.controls) over.push(`${screen} ${size}: controls ${budget.controls} > ${base.controls}`);
        if (budget.textSizes > base.textSizes) over.push(`${screen} ${size}: text sizes ${budget.textSizes} > ${base.textSizes}`);
        if (budget.smallestTextPx < base.smallestTextPx) {
          over.push(`${screen} ${size}: smallest text ${budget.smallestTextPx}px < ${base.smallestTextPx}px`);
        }
      }
    }
    expect(over).toEqual([]);
  });

  it("keep the baseline exactly as it was recorded", () => {
    const recorded = createHash("sha256").update(JSON.stringify(BASELINE)).digest("hex");
    expect(recorded, "e2e/budgets.ts BASELINE is a record of 2026-10-17 and never changes; lower BUDGETS instead").toBe(
      BASELINE_SHA256,
    );
  });
});
