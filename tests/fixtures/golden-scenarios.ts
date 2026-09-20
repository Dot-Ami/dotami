import { buildScenarioFromIntake } from "@/lib/scenarios/build-scenario-from-intake";
import { defaultActiveBranches, recomputeScenarioState } from "@/lib/scenarios/branches";
import type { Scenario } from "@/lib/scenarios/types";

/**
 * Typed golden inputs: `Scenario` objects (profile + recomputed state).
 * Catalog nodes live only in `lib/engines/cfe/v2026/` — fixtures never duplicate CFE bodies.
 *
 * See `docs/verification/golden-scenarios.md` for assumptions and spot-checks.
 * S2.5.4h: `goldenExampleService` is now a literal — the Example service venture archetype it was built from is gone.
 */
export const goldenExampleService: Scenario = {
  id: "example-service",
  profile: {
    name: "Example service venture",
    type: "service",
    province: "AB",
    targetRevenueY1: 60_000,
    targetRevenueY3: 150_000,
    structure: "sole-prop",
    employmentStatus: "apprentice",
    hireFirst: false,
  },
  state: recomputeScenarioState(
    {
      gstTiming: "stage-2a-voluntary-gst-registration",
      incorporationTiming: "stage-3a-incorporation-80k-net",
    },
    false,
  ),
};

export const goldenBcProductSred: Scenario = {
  id: "golden-bc-product-sred",
  profile: {
    name: "Golden BC Product SR&ED path",
    type: "product",
    province: "BC",
    targetRevenueY1: 90_000,
    targetRevenueY3: 200_000,
    structure: "sole-prop",
    employmentStatus: "self-employed",
    hireFirst: false,
  },
  state: recomputeScenarioState(
    {
      gstTiming: "stage-2a-voluntary-gst-registration",
      incorporationTiming: "stage-3b-incorporation-liability-sred",
    },
    false,
  ),
};

/** Mandatory GST branch; revenue crosses $30K small-supplier curve in Y2 (20k → 50k linear). */
export const goldenOnMandatoryLowRamp: Scenario = {
  id: "golden-on-mandatory-low-ramp",
  profile: {
    name: "Golden ON mandatory GST low ramp",
    type: "service",
    province: "ON",
    targetRevenueY1: 20_000,
    targetRevenueY3: 50_000,
    structure: "sole-prop",
    employmentStatus: "employee",
    hireFirst: false,
  },
  state: recomputeScenarioState(
    {
      gstTiming: "stage-2b-mandatory-gst-registration",
      incorporationTiming: "stage-3a-incorporation-80k-net",
    },
    false,
  ),
};

/** `hireFirst: true` surfaces the hire-first branch as active (not ghosted). */
export const goldenAbHireFirst: Scenario = {
  id: "golden-ab-hire-first",
  profile: {
    name: "Golden AB hire-first",
    type: "service",
    province: "AB",
    targetRevenueY1: 55_000,
    targetRevenueY3: 120_000,
    structure: "sole-prop",
    employmentStatus: "apprentice",
    hireFirst: true,
  },
  state: recomputeScenarioState(defaultActiveBranches, true),
};

/** Intake → scenario pipeline (stable id for tests / docs). */
export const goldenIntakeOnSideGig = buildScenarioFromIntake(
  {
    name: "Northwind Side Gig",
    type: "side-gig",
    targetRevenueY1: 35_000,
    targetRevenueY3: 95_000,
    province: "ON",
    hireFirst: false,
    employmentStatus: "employee",
  },
  "golden-intake-on-sidegig",
);

export const goldenScenarioFixtures = [
  goldenExampleService,
  goldenBcProductSred,
  goldenOnMandatoryLowRamp,
  goldenAbHireFirst,
  goldenIntakeOnSideGig,
] as const satisfies readonly Scenario[];
