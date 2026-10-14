/**
 * Moving the official fees into one catalog (lib/engines/fees/v2026/, 2026-10-12) changes no card.
 *
 * tests/fixtures/official-fees/panels-before.json is every step panel of both roads, and each road's
 * money list, drawn before the move by tests/helpers/cost-panels.ts: from main at f24d22c (2026-10-12),
 * redrawn on 2026-10-13 from PR #162's own head (6428ae3, that main plus #162) when #162 joined. #162
 * changed only two "Shown because" lines, on 11 panels: a federal program's and a federal rule's.
 * Redrawn again on 2026-10-13 when the skills pull request (#158) joined: drawn from its own head
 * (4e643d7, that main plus #158) and compared with that main's drawing, it changes one panel only,
 * Mandatory GST registration, whose "No skills are listed for this step yet." becomes its legal
 * requirement, A GST/HST registration with the Canada Revenue Agency; that change is applied to the
 * fixture as #162 left it. Redrawn on 2026-10-13 for issue #40 (research tax credit steps off the path
 * without a research kind of work): drawn from main at cfa7aa1 plus only that change and compared with
 * main's fixture, it changes one panel of 32 only, SR&ED deepening, whose "Why this colour" sentence
 * "Today's rules give it this colour; no single answer of yours changes that." becomes "You haven't told
 * DotAmi this idea involves research and development: none of its kinds of work is Software / SaaS,
 * Manufacturing or AI / ML / R&D." (the invented idea is a trade); only that sentence is swapped in the
 * fixture. Drawn again now, each is the same HTML, byte for byte. The only cards allowed to change are the ones
 * that gained road 0's named start-up cost lines (docs/architecture/future-cockpit.md § 6, "The official
 * fees catalog and start-up cost lines as built"); with those seven lines taken out, they match too.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { generalRoadV2026, roadsV2026, type Road } from "@/lib/engines/roads/v2026";

import { drawCostPanels } from "./helpers/cost-panels";

const before = JSON.parse(
  readFileSync(new URL("./fixtures/official-fees/panels-before.json", import.meta.url), "utf8"),
) as Record<string, string>;

/** Road 0's named start-up cost lines, the only lines added to a road since the fixture was drawn. */
const START_UP_STEP = "stage-1-sole-prop-activation";
const START_UP_LINES = [
  "cost-start-tools-equipment",
  "cost-start-space-deposit",
  "cost-start-insurance",
  "cost-start-vehicle",
  "cost-start-first-materials",
  "cost-start-software",
  "cost-start-living-while-starting",
];

/** A road with the start-up lines taken out: what the road was before they were written. */
function withoutStartUpLines(road: Road): Road {
  return {
    ...road,
    steps: road.steps.map((step) =>
      step.id === START_UP_STEP ? { ...step, costs: step.costs.filter((c) => !START_UP_LINES.includes(c.id)) } : step,
    ),
  };
}

describe("every card that shows a cost line, before and after the official fees catalog", () => {
  it("draws the same panels as main did, byte for byte, with road 0's start-up lines taken out", () => {
    const now = drawCostPanels(roadsV2026.map(withoutStartUpLines));
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
    for (const [key, html] of Object.entries(before)) expect(now[key], key).toBe(html);
  });

  it("with the start-up lines in, only Sole Prop activation's panel and road 0's money list change", () => {
    const now = drawCostPanels(roadsV2026);
    const changed = Object.keys(before).filter((key) => now[key] !== before[key]);
    const allowed = [`${generalRoadV2026.id}/${START_UP_STEP}`, `${generalRoadV2026.id}/money`];
    for (const key of changed) expect(allowed, key).toContain(key);
  });
});
