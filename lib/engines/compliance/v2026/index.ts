export type { ComplianceRule, ComplianceRuleType } from "./types";
export { complianceRulesV2026 } from "./rules";
export type { ComplianceRuleId } from "./rules";

import { complianceRulesV2026 } from "./rules";

export const complianceCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: "2026-06-08",
  entries: complianceRulesV2026,
} as const;

// [8d] The cited record-keeping line on the Delete menu; not a map rule, so not in `entries`.
export { recordRetentionV2026 } from "./record-keeping";
export type { RecordRetentionEntry } from "./record-keeping";
