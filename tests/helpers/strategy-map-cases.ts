import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { updateScenarioBranch } from "@/lib/scenarios/branches";
import type { Scenario } from "@/lib/scenarios/types";

import { goldenScenarioFixtures } from "../fixtures/golden-scenarios";

/**
 * The states the map was drawn in when its "before" pictures were taken
 * (tests/fixtures/strategy-map/, recorded from main at 7232937 on 2026-10-11, before the map learned
 * to draw any road). The road test draws the same states through the road and compares the HTML
 * byte for byte, so "today's map looks exactly as before" is a test, not a claim.
 *
 * `today` is fixed so the rules give the same colours on every day the test runs.
 */
export const MAP_TODAY = "2026-10-11";

export interface MapCase {
  name: string;
  scenario: Scenario;
  selectedNodeId: CFENodeId | null;
  decidedBranchIds: string[];
}

const [service] = goldenScenarioFixtures;

export const mapCases: MapCase[] = [
  // Every golden venture as saved, nothing selected, both toggles still on their defaults.
  ...goldenScenarioFixtures.map((scenario) => ({
    name: scenario.id,
    scenario,
    selectedNodeId: null,
    decidedBranchIds: [],
  })),
  // The person flipped both toggles and has a card open: chips, colours, "default" notes and the
  // selected ring all change.
  {
    name: "example-service-flipped-and-selected",
    scenario: updateScenarioBranch(
      updateScenarioBranch(service, "gstTiming", "stage-2b-mandatory-gst-registration"),
      "incorporationTiming",
      "stage-3b-incorporation-liability-sred",
    ),
    selectedNodeId: "stage-1-sole-prop-activation",
    decidedBranchIds: ["gstTiming", "incorporationTiming"],
  },
];
