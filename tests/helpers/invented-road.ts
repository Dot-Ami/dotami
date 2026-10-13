import type { EngineCitation } from "@/lib/engines/shared/types";
import type { Road, SkillItem } from "@/lib/engines/roads/v2026";

/**
 * An invented road for tests only: not a real future, not real pages, never shipped. It is small but
 * uses every part of the road type (two columns, a fork with its pick in a column header, a done-when
 * line, a skill item, an official fee and a named cost line), so each check in
 * lib/engines/roads/v2026/validate.ts can be broken one at a time on a copy of it.
 */
export const inventedCitation = (lastVerified = "2026-10-01"): EngineCitation => ({
  title: "Invented page (test only)",
  authority: "provincial",
  jurisdiction: "AB",
  url: "https://example.org/invented",
  lastVerified,
  note: "Invented for a test; not a source.",
});

export const inventedSkillItems: SkillItem[] = [
  {
    id: "skill-invented-ticket",
    label: "Invented ticket (test only)",
    kind: "legal-requirement",
    howToGetIt: { text: "Invented route (test only).", citation: inventedCitation() },
    citations: [inventedCitation()],
  },
];

export function inventedRoad(): Road {
  return {
    id: "road-invented-test-only",
    label: "Invented road (test only)",
    kind: "both",
    provinces: ["AB"],
    lastVerified: "2026-10-02",
    columns: [
      { id: "col-invented-start", label: "Start", summary: "Where it begins.", steps: ["step-invented-train"] },
      {
        id: "col-invented-fork",
        label: "Then",
        summary: "One of two endings.",
        steps: ["step-invented-employed", "step-invented-own"],
        forkId: "fork-invented-ending",
      },
    ],
    steps: [
      {
        id: "step-invented-train",
        label: "Train (test only)",
        summary: "An invented first step.",
        next: ["step-invented-employed", "step-invented-own"],
        doneWhen: [{ id: "dw-invented-1", text: "An invented done-when line.", citation: inventedCitation("2026-10-02") }],
        needs: ["skill-invented-ticket"],
        costs: [
          {
            id: "cost-invented-fee",
            kind: "official-fee",
            feeId: "fee-ab-invented-test-only",
            label: "Invented fee (test only)",
            amountCents: 12_500,
            citation: inventedCitation(),
          },
          { id: "cost-invented-tools", kind: "named", label: "Tools (test only)" },
        ],
        officialLinks: [{ label: "Invented page", url: "https://example.org/invented" }],
        citations: [inventedCitation()],
      },
      {
        id: "step-invented-employed",
        label: "Stay employed (test only)",
        summary: "One invented ending.",
        next: [],
        doneWhen: [],
        needs: [],
        costs: [],
        officialLinks: [],
        citations: [inventedCitation()],
      },
      {
        id: "step-invented-own",
        label: "Own shop (test only)",
        summary: "The other invented ending.",
        next: [],
        doneWhen: [],
        needs: [],
        costs: [],
        officialLinks: [],
        // Read on the newest day too, so taking any one other source away leaves the road's date right.
        citations: [inventedCitation("2026-10-02")],
      },
    ],
    forks: [
      {
        id: "fork-invented-ending",
        label: "Ending (test only)",
        sides: ["step-invented-employed", "step-invented-own"],
      },
    ],
  };
}
