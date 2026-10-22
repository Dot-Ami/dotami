/**
 * The clutter rule, in one place: the budget a screen is held to at a width (e2e/budgets.ts, plus the Windows
 * extra on Windows) and what breaks it. The clutter spec (e2e/clutter-budget.spec.ts) fails on each breach,
 * the idea sweep (e2e/idea-sweep.spec.ts) lists each as a finding, and the quality report
 * (scripts/lib/quality.ts) counts a screen size "within" only when it has none, so the three can't drift apart.
 */
import { BUDGETS, WINDOWS_EXTRA, type Clutter, type ScreenId, type WidthId } from "./budgets";
import type { Measured } from "./clutter-measure";

/**
 * The budget for `screen` at `width`, as the gate holds it: the budget in e2e/budgets.ts (what CI measures on
 * Ubuntu), plus the extra recorded for that screen when `platform` is Windows. Null when there is none.
 */
export function budgetFor(screen: ScreenId, width: WidthId, platform: NodeJS.Platform = process.platform): Clutter | null {
  const gate = BUDGETS[screen]?.[width];
  if (!gate) return null;
  const extra = platform === "win32" ? (WINDOWS_EXTRA[screen]?.[width] ?? {}) : {};
  return {
    ...gate,
    regions: gate.regions + (extra.regions ?? 0),
    controls: gate.controls + (extra.controls ?? 0),
    textSizes: gate.textSizes + (extra.textSizes ?? 0),
  };
}

/** What was measured, as a saved file holds it: the names may be missing from an older file. */
export type MeasuredLike = Clutter & Partial<Omit<Measured, keyof Clutter>>;

/**
 * Everything that breaks the rule, each in words; none means the screen size is within it. A drawn block with
 * no region mark, inside none, breaks it whatever the budget says (the region count can't see it), and a file
 * that doesn't say which blocks were unmarked can't be counted within. With no budget, only the blocks are
 * checked: whether a screen must have one is the caller's to say.
 */
export function clutterBreaches(m: MeasuredLike, budget: Clutter | null): string[] {
  const found: string[] = [];
  if (!Array.isArray(m.unmarkedBlocks)) found.push("which blocks have no region mark wasn't recorded");
  for (const block of m.unmarkedBlocks ?? []) found.push(`a drawn block with no region mark, inside none: ${block}`);
  if (!budget) return found;
  const names = (list: string[] | undefined, join: string) => (list?.length ? ` (${list.join(join)})` : "");
  if (m.regions > budget.regions) found.push(`${m.regions} regions, budget ${budget.regions}${names(m.regionNames, ", ")}`);
  if (m.controls > budget.controls) {
    found.push(`${m.controls} controls in the first window, budget ${budget.controls}${names(m.controlNames, " | ")}`);
  }
  if (m.textSizes > budget.textSizes) {
    found.push(`${m.textSizes} text sizes, budget ${budget.textSizes}${m.sizesPx?.length ? ` (${m.sizesPx.join(", ")} px)` : ""}`);
  }
  if (m.smallestTextPx < budget.smallestTextPx) found.push(`the smallest text is ${m.smallestTextPx}px, budget ${budget.smallestTextPx}px`);
  return found;
}
