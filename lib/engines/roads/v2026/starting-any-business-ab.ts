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
 *
 * Each step names its rules and tax cards (`engineHints`, by catalog id). Until 2026-10-12 this list
 * lived in lib/brain/node-items.ts as NODE_ENGINE_HINTS; it moved onto the road unchanged, so a road
 * names its own cards (docs/architecture/future-cockpit.md § 2, Cockpit screen as built), and
 * tests/engine-integrity.spec.ts still checks every id names a real catalog entry.
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
  engineHints: {
    "stage-1-sole-prop-activation": ["writeoff-home-office", "writeoff-saas-tools", "compliance-hobby-vs-business"],
    "stage-2a-voluntary-gst-registration": ["grant-sred", "writeoff-cca-class-50", "compliance-gst-small-supplier"],
    "stage-2b-mandatory-gst-registration": ["grant-cajg", "compliance-gst-small-supplier"],
    "stage-3a-incorporation-80k-net": ["grant-on-innovation"],
    "stage-3b-incorporation-liability-sred": ["grant-sred", "grant-irap", "writeoff-rd", "writeoff-cca-class-50"],
    "stage-4-sred-deepening": ["grant-sred", "grant-irap"],
    "stage-4-retained-earnings-planning": ["grant-on-innovation"],
    "branch-hire-first-employee": ["writeoff-vehicle"],
  },
});
