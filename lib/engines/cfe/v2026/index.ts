export type {
  CFECitation,
  CFECitationAuthority,
  CFEFinancialImpact,
  CFELensAnnotations,
  CFENode,
  CFEProvince,
  CFEStage,
} from "./types";
import { cfeNodesV2026 } from "./nodes";

export { cfeNodesV2026 } from "./nodes";
export type { CFENodeId } from "./nodes";

export const cfeCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: "2026-05-01",
  nodes: cfeNodesV2026,
} as const;
