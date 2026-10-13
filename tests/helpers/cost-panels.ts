import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MoneyListPanel } from "@/components/cockpit/gauge-panels";
import { StepPanel } from "@/components/cockpit/step-panel";
import { generalRoadV2026, skillItemsV2026, type Road } from "@/lib/engines/roads/v2026";
import { evaluateRoad, type RoadEvaluation } from "@/lib/roads";

import { input } from "./road-to-evaluate";

/**
 * Every screen that shows a road's cost lines, drawn to HTML: the step panel of every step (for an
 * Alberta idea, and the Incorporating stage, which shows the federal and Alberta ways side by side,
 * for a British Columbia idea too) and the money list behind the Start-up money gauge.
 *
 * tests/official-fees.spec.ts compares these, byte for byte, with what main drew before the official
 * fees moved into one catalog (tests/fixtures/official-fees/panels-before.json), so moving a fee can't
 * change what a card shows.
 */
export function drawCostPanels(roads: readonly Road[]): Record<string, string> {
  const drawn: Record<string, string> = {};
  for (const road of roads) {
    // Road 0 is drawn as the general road, the way the cockpit draws a saved idea that names no road.
    const isGeneral = road.id === generalRoadV2026.id;
    const result = evaluateRoad(input({ road, roadChosen: !isGeneral, skillItems: [...skillItemsV2026] }));
    for (const step of road.steps) {
      drawn[`${road.id}/${step.id}`] = stepPanel(road, step.id, result, "AB");
    }
    if (isGeneral) {
      drawn[`${road.id}/stage-3a-incorporation-80k-net/BC`] = stepPanel(road, "stage-3a-incorporation-80k-net", result, "BC");
    }
    drawn[`${road.id}/money`] = renderToStaticMarkup(
      createElement(MoneyListPanel, {
        road,
        evaluation: result,
        canSave: true,
        error: null,
        onProposeSavings: async () => null,
        onSelectStep: () => {},
        onClose: () => {},
      }),
    );
  }
  return drawn;
}

function stepPanel(road: Road, stepId: string, result: RoadEvaluation, province: string): string {
  return renderToStaticMarkup(
    createElement(StepPanel, {
      road,
      step: road.steps.find((s) => s.id === stepId)!,
      evaluation: result.steps.find((s) => s.stepId === stepId)!,
      rules: result.rules,
      skillItems: [...skillItemsV2026],
      marks: new Map(),
      selectedSkillId: null,
      branch: null,
      canSave: true,
      error: null,
      onStatus: () => {},
      onTicks: () => {},
      onMark: () => {},
      onSelectSkill: () => {},
      onProposeQuote: async () => null,
      province,
      ownNumber: null,
      onOwnNumberChange: () => {},
      onClose: () => {},
    }),
  );
}
