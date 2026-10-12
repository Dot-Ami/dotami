import { formatMoney } from "@/lib/format/money-and-months";
import { isNotSaid } from "@/lib/scenarios/not-said";
import type { VentureProfile } from "@/lib/scenarios/types";

import { cockpitWords } from "./words";

/**
 * The cockpit rail's profile lines (docs/ui-spec/cockpit/02-left-rail.md): the kind of venture, the place
 * and the two sales targets as the idea holds them. A future picked on Pick a future was saved without the
 * kind of venture or the targets (`profile.notSaid`, 2026-10-12): those say "Not said", never the intake's
 * starting values ("service", "$0") as if the person had given them. Amounts go through the one formatter.
 */

/** The line under the idea's name: its kind and its place. */
export function ventureLine(profile: VentureProfile): string {
  const kind = isNotSaid(profile, "venture-type") ? cockpitWords.notSaid : profile.type;
  return `${kind} · ${profile.province}`;
}

export function profileRows(profile: VentureProfile): { label: string; value: string }[] {
  const targetsSaid = !isNotSaid(profile, "sales-targets");
  // The targets are whole dollars on the idea; the formatter takes cents.
  const target = (dollars: number) => (targetsSaid ? formatMoney(Math.round(dollars) * 100) : cockpitWords.notSaid);
  return [
    { label: "Type", value: isNotSaid(profile, "venture-type") ? cockpitWords.notSaid : profile.type },
    { label: "Province", value: profile.province },
    { label: "Target Y1", value: target(profile.targetRevenueY1) },
    { label: "Target Y3", value: target(profile.targetRevenueY3) },
  ];
}
