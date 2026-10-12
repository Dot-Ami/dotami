import type { Road } from "@/lib/engines/roads/v2026";
import type { FirstSave } from "@/lib/journey/first-save";
import type { PlaceCode } from "@/lib/places/codes";
import { buildScenarioFromIntake } from "@/lib/scenarios/build-scenario-from-intake";
import type { Scenario } from "@/lib/scenarios/types";

import type { LookingFor } from "./questions";
import { provinceOfPlace } from "./receipts";

/**
 * A future picked on *Pick a future*, as the idea the cockpit opens (docs/architecture/future-cockpit.md
 * § 1, "The way in as built"). Only what the person answered goes in, and nothing is made up for the
 * rest: their place, the name they typed (or the road's own), and their work situation kept as "not
 * said", since this way in never asks it. The kind of venture starts at Service, the intake's own starting
 * value for every idea; no rule in the catalogs reads it. Every number starts at 0, as on the intake.
 */
export function scenarioForPickedFuture(input: { road: Road; place: PlaceCode; name: string }, scenarioId: string): Scenario {
  const province = provinceOfPlace(input.place);
  // The place question only offers Canada's provinces and territories; anything else is a caller's mistake.
  if (!province) throw new Error("A future needs a province or territory.");
  return buildScenarioFromIntake(
    {
      name: input.name.trim() || input.road.label,
      type: "service",
      targetRevenueY1: 0,
      targetRevenueY3: 0,
      province,
      hireFirst: false,
      employmentStatus: "not-said",
      activityTags: [],
      capitalPurchasePlanned: false,
      stage: "idea",
    },
    scenarioId,
  );
}

/**
 * What the save that creates the idea carries besides it: the road picked and the answer to "a business,
 * a job or career, or both?". Kept only when the save creates the idea (lib/db/ensure-venture-from-scenario.ts).
 * No goals: this way in has no goal chips.
 */
export function firstSaveForPickedFuture(road: Road, lookingFor: LookingFor | null): FirstSave {
  // No answer is kept as none: "Both, or not sure" is an answer the person gives, never a default.
  return { roadId: road.id, ...(lookingFor ? { lookingFor } : {}), goals: [] };
}
