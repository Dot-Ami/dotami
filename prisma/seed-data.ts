import { recomputeScenarioState } from "@/lib/scenarios/branches";
import type { Scenario } from "@/lib/scenarios/types";

/**
 * Two invented ventures so a fresh clone has something on the map before you type anything.
 *
 * Everything here is made up. The businesses do not exist, the revenue figures are round
 * numbers chosen to cross the thresholds the map reasons about ($30K GST, $80K net
 * incorporation), and none of it is advice — the catalogs supply the cited content, this file
 * only supplies answers a person might give. Ids are prefixed `demo-` so they are obvious in
 * the database and easy to delete.
 *
 * Keep them in step with the map: every branch pick below must be a real node id from
 * `lib/engines/cfe/v2026`, which `tests/seed-data.spec.ts` checks without needing a database.
 */

export const DEMO_STATEMENT = {
  text: "I want to stop taking contract work by 2028, and I would rather buy tools once than rent them twice.",
  saidAt: "2026-09-01",
} as const;

export const DEMO_LINK = {
  fromId: "demo-service-ab",
  toId: "demo-product-bc",
  kind: "overlaps",
  note: "Same workshop, same tools — separate books.",
} as const;

export const demoScenarios: Scenario[] = [
  {
    id: "demo-service-ab",
    profile: {
      name: "Demo — Chinook Sign Painting",
      type: "service",
      province: "AB",
      targetRevenueY1: 45_000,
      targetRevenueY3: 120_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "employee",
      hireFirst: false,
      activityTags: ["Trades"],
      capitalPurchasePlanned: true,
      stage: "prototype",
    },
    state: recomputeScenarioState(
      {
        gstTiming: "stage-2b-mandatory-gst-registration",
        incorporationTiming: "stage-3a-incorporation-80k-net",
      },
      false,
    ),
  },
  {
    id: "demo-product-bc",
    profile: {
      name: "Demo — Salish Trail Maps",
      type: "product",
      province: "BC",
      targetRevenueY1: 90_000,
      targetRevenueY3: 240_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "self-employed",
      hireFirst: true,
      activityTags: ["E-commerce / retail"],
      capitalPurchasePlanned: false,
      stage: "first-customers",
    },
    state: recomputeScenarioState(
      {
        gstTiming: "stage-2a-voluntary-gst-registration",
        incorporationTiming: "stage-3b-incorporation-liability-sred",
      },
      true,
    ),
  },
];
