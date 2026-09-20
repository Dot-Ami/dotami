export type { GrantProgram } from "./types";
export { grantProgramsV2026 } from "./programs";
export type { GrantProgramId as GrantProgramIdFromPrograms } from "./programs";

import { grantProgramsV2026 } from "./programs";

export const grantsCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: "2026-06-08",
  entries: grantProgramsV2026,
} as const;
