import type { OfficialFeeLine } from "../../roads/v2026/types";
import { officialFeesV2026 } from "./official-fees";
import type { OfficialFee } from "./types";

export type { FeePlace, OfficialFee } from "./types";
export { officialFeesV2026 } from "./official-fees";
export { feeReferenceProblems, officialFeeProblems } from "./validate";

export const officialFeesCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  entries: officialFeesV2026,
} as const;

export function officialFeeById(id: string): OfficialFee | undefined {
  return officialFeesV2026.find((fee) => fee.id === id);
}

/** The fee by id, or a loud failure while the catalogs load: a road naming a fee that isn't here is a bug. */
export function requireOfficialFee(id: string): OfficialFee {
  const fee = officialFeeById(id);
  if (!fee) throw new Error(`No official fee "${id}" in lib/engines/fees/v2026.`);
  return fee;
}

/**
 * A road's cost line for an official fee: the line's own permanent id and the road's words for it, with
 * the amount, source and condition copied from the catalog, so a road file never types an amount.
 */
export function feeLine(lineId: string, label: string, feeId: string): OfficialFeeLine {
  const fee = requireOfficialFee(feeId);
  return {
    id: lineId,
    kind: "official-fee",
    label,
    feeId,
    amountCents: fee.amountCents,
    citation: fee.citation,
    // Only when there is one: a fee that always applies has no condition, not an empty one.
    ...(fee.onlyIf !== undefined ? { onlyIf: fee.onlyIf } : {}),
  };
}
