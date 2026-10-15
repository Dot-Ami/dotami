import { evaluateRoad, roadReceipt, type RoadEvaluationInput } from "@/lib/roads";

/**
 * What an example person did, and what each of their answers changed (docs/ui-spec/example/_index.md):
 * the appendix's receipts, worked out the way every receipt is, by running road evaluation without the
 * answer and with it and comparing the two (`roadReceipt`). Never written by hand: the lines are whatever
 * today's catalogs give, so if a catalog changes, the story's numbers change with it.
 *
 * Grouped as the story tells it (all nine marks at once, every priced cost line at once), which is why this isn't the
 * told list's one row per answer. Pure: it reads only the input it is given.
 */
export type StoryPartId = "marks" | "costs" | "savings" | "this-is-mine" | "step-done" | "what-if";

export interface StoryPart {
  id: StoryPartId;
  lines: string[];
}

export function exampleStory(input: RoadEvaluationInput, whatIfDollars: number | null): StoryPart[] {
  // The story is told without the what-if, which is never kept; the what-if is its own part, last.
  const withAll: RoadEvaluationInput = { ...input, whatIf: null };
  const after = evaluateRoad(withAll);
  const without = (change: Partial<RoadEvaluationInput>) => roadReceipt(evaluateRoad({ ...withAll, ...change }), after);

  const parts: StoryPart[] = [
    { id: "marks", lines: without({ skillMarks: [] }) },
    { id: "costs", lines: without({ agreed: { ...withAll.agreed, costLines: [] } }) },
    { id: "savings", lines: without({ agreed: { ...withAll.agreed, savingsCents: null } }) },
    { id: "this-is-mine", lines: without({ forkPicks: {} }) },
    { id: "step-done", lines: without({ progress: [] }) },
  ];
  if (whatIfDollars !== null) {
    const tried = evaluateRoad({ ...withAll, whatIf: { firstYearSalesDollars: whatIfDollars } });
    parts.push({ id: "what-if", lines: roadReceipt(after, tried) });
  }
  // A part that changed nothing isn't shown: each part is there because it changed something.
  return parts.filter((p) => p.lines.length > 0);
}
