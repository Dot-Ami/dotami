import type { EngineCitation } from "@/lib/engines/shared/types";
import type { Predicate } from "@/lib/brain/predicates";

/**
 * Risk engine (docs/brain/risk-calculator.md) — the compliance safety valve that makes
 * "legal but aggressive" honest. Risk informs; it never censors: aggressive options are
 * never removed or down-ranked because of risk.
 */
export type RiskSeverity = "info" | "caution" | "professional-required";

export interface RiskEntry {
  id: string;
  label: string;
  severity: RiskSeverity;
  /**
   * Reserved for structures whose PRIMARY purpose could read as tax avoidance without
   * business substance (GAAR). Maximized ordinary deductions are `caution`, not GAAR —
   * don't cry wolf or the flag loses meaning.
   */
  gaarExposure: boolean;
  /** When this risk is live for a profile; omit for "always applies to the target entries". */
  trigger?: Predicate;
  /** Engine entry ids this risk attaches to (write-offs, grants, compliance). */
  appliesTo: string[];
  /** What draws CRA attention — plain language. */
  why: string;
  /** What makes the position defensible (documentation, logs, substance). */
  mitigation: string;
  citations: EngineCitation[];
}

/** Strategy stacks that together raise the audit profile beyond any single member. */
export interface RiskCombination {
  id: string;
  memberIds: string[];
  severityBump: Exclude<RiskSeverity, "info">;
  why: string;
}
