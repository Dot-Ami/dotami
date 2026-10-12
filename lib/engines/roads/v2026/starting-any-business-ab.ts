import { cfeNodesV2026 } from "../../cfe/v2026/nodes";
import { cfeTiersV2026 } from "../../cfe/v2026/tiers";
import { roadFromCfe } from "./from-cfe";

/**
 * Road 0: today's ten-step map as a road (docs/architecture/future-cockpit.md § 6). Every saved
 * future is drawn on it until storage lets a future name another road.
 *
 * Its two forks are today's two toggles. Their ids are the keys a person's picks are already saved
 * under (`ScenarioState.activeBranches`), and their names and sides are the toggles' own
 * (`lib/scenarios/branches.ts`); tests/roads.spec.ts fails if the two ever differ. They are spelled
 * out here rather than imported so the catalog keeps no imports from the app layer.
 */
export const roadStartingAnyBusinessAB = roadFromCfe({
  id: "road-starting-any-business-ab",
  label: "Starting any business in Alberta (tax and structure)",
  kind: "business",
  provinces: ["AB"],
  nodes: cfeNodesV2026,
  tiers: cfeTiersV2026,
  forks: [
    {
      id: "gstTiming",
      label: "GST timing",
      sides: ["stage-2a-voluntary-gst-registration", "stage-2b-mandatory-gst-registration"],
    },
    {
      id: "incorporationTiming",
      label: "Incorporation timing",
      sides: ["stage-3a-incorporation-80k-net", "stage-3b-incorporation-liability-sred"],
    },
  ],
});
