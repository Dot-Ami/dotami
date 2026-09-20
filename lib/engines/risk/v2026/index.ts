export type { RiskCombination, RiskEntry, RiskSeverity } from "./types";
export { riskCombinationsV2026, riskEntriesV2026 } from "./triggers";
export type { RiskEntryId } from "./triggers";

import { riskCombinationsV2026, riskEntriesV2026 } from "./triggers";

export const riskCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: "2026-07-02",
  entries: riskEntriesV2026,
  combinations: riskCombinationsV2026,
} as const;
