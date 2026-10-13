import type { Road, SkillItem } from "@/lib/engines/roads/v2026";
import { NO_AGREED_PLANNING, type RoadEvaluationInput } from "@/lib/roads";
import { defaultActiveBranches, recomputeScenarioState } from "@/lib/scenarios/branches";
import type { Scenario } from "@/lib/scenarios/types";

import { inventedCitation } from "./invented-road";

/**
 * An invented road for road evaluation's tests only: not a real future, not real pages, never shipped.
 *
 *   Train ─▶ Get your ticket ─┬▶ Stay employed ──▶ Keep working ──┐
 *                             └▶ Own shop ───────▶ Open the doors ┴▶ Keep the books
 *
 * "Get your ticket" ends in the fork "Ending" (stay employed or own shop). "Keep the books" is reached
 * from both endings. It has two official fees, five named cost lines and five skill items, so every
 * count and sum can be checked by hand.
 */
export const ROAD_ID = "road-evaluation-invented";

export const skillItems: SkillItem[] = [
  ["skill-eval-math", "Trade math (test only)", "listed-skill"],
  ["skill-eval-drawings", "Read drawings (test only)", "listed-skill"],
  ["skill-eval-ticket", "Trade ticket (test only)", "legal-requirement"],
  ["skill-eval-quoting", "Quote a job (test only)", "listed-skill"],
  ["skill-eval-books", "Keep books (test only)", "listed-skill"],
].map(([id, label, kind]) => ({
  id,
  label,
  kind: kind as SkillItem["kind"],
  citations: [inventedCitation()],
}));

const step = (id: string, label: string, next: string[], extra: Partial<Road["steps"][number]> = {}): Road["steps"][number] => ({
  id,
  label,
  summary: `${label}: an invented step.`,
  next,
  doneWhen: [],
  needs: [],
  costs: [],
  officialLinks: [],
  citations: [inventedCitation()],
  ...extra,
});

export function roadToEvaluate(): Road {
  return {
    id: ROAD_ID,
    label: "Invented trade road (test only)",
    kind: "both",
    provinces: ["AB"],
    lastVerified: "2026-10-01",
    columns: [
      { id: "col-eval-train", label: "Train", summary: "Learn the trade.", steps: ["step-eval-train", "step-eval-ticket"] },
      {
        id: "col-eval-ending",
        label: "Ending",
        summary: "One of two endings.",
        steps: ["step-eval-employed", "step-eval-own"],
        forkId: "fork-eval-ending",
      },
      { id: "col-eval-after", label: "After", summary: "What comes next.", steps: ["step-eval-keep", "step-eval-open", "step-eval-books"] },
    ],
    steps: [
      step("step-eval-train", "Train (test only)", ["step-eval-ticket"], {
        doneWhen: [
          { id: "dw-eval-train-1", text: "Invented line one.", citation: inventedCitation() },
          { id: "dw-eval-train-2", text: "Invented line two.", citation: inventedCitation() },
        ],
        needs: ["skill-eval-math", "skill-eval-drawings"],
        costs: [
          { id: "cost-eval-tuition", kind: "official-fee", feeId: "fee-ab-eval-tuition-test-only", label: "Tuition (test only)", amountCents: 150_000, citation: inventedCitation() },
          { id: "cost-eval-books", kind: "named", label: "Textbooks (test only)" },
        ],
      }),
      step("step-eval-ticket", "Get your ticket (test only)", ["step-eval-employed", "step-eval-own"], {
        needs: ["skill-eval-ticket"],
        costs: [{ id: "cost-eval-exam", kind: "official-fee", feeId: "fee-ab-eval-exam-test-only", label: "Exam fee (test only)", amountCents: 30_000, citation: inventedCitation() }],
      }),
      step("step-eval-employed", "Stay employed (test only)", ["step-eval-keep"]),
      step("step-eval-own", "Own shop (test only)", ["step-eval-open"], {
        needs: ["skill-eval-drawings", "skill-eval-quoting"],
        costs: [
          { id: "cost-eval-saw", kind: "named", label: "Table saw (test only)" },
          { id: "cost-eval-deposit", kind: "named", label: "Space deposit (test only)" },
          { id: "cost-eval-name", kind: "official-fee", feeId: "fee-ab-eval-name-test-only", label: "Name registration (test only)", amountCents: 6_000, citation: inventedCitation() },
        ],
      }),
      step("step-eval-keep", "Keep working (test only)", ["step-eval-books"]),
      step("step-eval-open", "Open the doors (test only)", ["step-eval-books"], {
        costs: [{ id: "cost-eval-insurance", kind: "named", label: "Insurance (test only)" }],
      }),
      step("step-eval-books", "Keep the books (test only)", [], {
        needs: ["skill-eval-books"],
        costs: [{ id: "cost-eval-software", kind: "named", label: "Bookkeeping software (test only)" }],
      }),
    ],
    forks: [{ id: "fork-eval-ending", label: "Ending (test only)", sides: ["step-eval-employed", "step-eval-own"] }],
  };
}

/** An invented Alberta idea, well under the GST/HST line, on the map's default picks. */
export function inventedIdea(change: Partial<Scenario["profile"]> = {}): Scenario {
  return {
    id: "road-evaluation-test",
    profile: {
      name: "Invented (test only)",
      type: "service",
      province: "AB",
      targetRevenueY1: 12_000,
      targetRevenueY3: 0,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "apprentice",
      hireFirst: false,
      activityTags: ["Trades"],
      ...change,
    },
    state: recomputeScenarioState(defaultActiveBranches),
  };
}

export const TODAY = "2026-10-12";

/** A complete input on the invented road with nothing told yet; a test changes what it needs. */
export function input(change: Partial<RoadEvaluationInput> = {}): RoadEvaluationInput {
  return {
    road: roadToEvaluate(),
    roadChosen: true,
    skillItems,
    scenario: inventedIdea(),
    confirmedFigures: [],
    forkPicks: {},
    skillMarks: [],
    progress: [],
    agreed: NO_AGREED_PLANNING,
    targetMonth: null,
    whatIf: null,
    today: TODAY,
    ...change,
  };
}
