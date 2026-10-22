import { isNotSaid, salesTargetField } from "@/lib/scenarios/not-said";
import type { VentureProfile } from "@/lib/scenarios/types";

import { cockpitWords } from "./words";

/**
 * The cockpit rail's profile lines (docs/ui-spec/cockpit/02-left-rail.md): the kind of venture, the place
 * and the two sales targets as the idea holds them. A future picked on Pick a future was saved without the
 * kind of venture or the targets (`profile.notSaid`, 2026-10-12): those say "Not said", never the intake's
 * starting values ("service", "$0") as if the person had given them. Each target reads its own year's id
 * (2026-10-21), so the one the person gave shows while the other still says "Not said". A target the idea
 * holds goes through the rail's own words (`cockpitWords.rail.salesTarget`): an amount, or "not given" for
 * none, never $0.
 */

/** The line under the idea's name: its kind and its place. */
export function ventureLine(profile: VentureProfile): string {
  const kind = isNotSaid(profile, "venture-type") ? cockpitWords.notSaid : profile.type;
  return `${kind} · ${profile.province}`;
}

export function profileRows(profile: VentureProfile): { label: string; value: string }[] {
  // The targets are whole dollars on the idea; each year is said or not on its own.
  const target = (year: 1 | 3, dollars: number) =>
    isNotSaid(profile, salesTargetField(year)) ? cockpitWords.notSaid : cockpitWords.rail.salesTarget(Math.round(dollars));
  return [
    { label: "Type", value: isNotSaid(profile, "venture-type") ? cockpitWords.notSaid : profile.type },
    { label: "Province", value: profile.province },
    { label: "Target Y1", value: target(1, profile.targetRevenueY1) },
    { label: "Target Y3", value: target(3, profile.targetRevenueY3) },
  ];
}
