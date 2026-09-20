export type { StructureEntityType, StructureStep } from "./types";
export { structureLadderV2026 } from "./ladder";
export type { StructureStepId } from "./ladder";

import { structureLadderV2026 } from "./ladder";

export const structureCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: "2026-06-08",
  entries: structureLadderV2026,
} as const;
