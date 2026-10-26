import type { Claim, ClaimStatus } from "../model";

/**
 * What each status means and, as importantly, what it doesn't. Every status is shown with its
 * symbol and words, never colour alone.
 */
export const STATUS_INFO: Record<
  ClaimStatus,
  { label: string; symbol: string; meaning: string; notMeaning: string }
> = {
  supported: {
    label: "Supported",
    symbol: "●",
    meaning: "The evidence reviewed supports this proposition.",
    notMeaning: "Proven for good. New evidence can still change it.",
  },
  "partially-supported": {
    label: "Partly supported",
    symbol: "◐",
    meaning: "Part of it is supported. The rest isn't, or rests on uncertain evidence.",
    notMeaning: "Mostly true.",
  },
  contradicted: {
    label: "Contradicted",
    symbol: "✕",
    meaning: "The evidence reviewed points against it.",
    notMeaning: "That whoever said it was lying.",
  },
  unresolved: {
    label: "Unresolved",
    symbol: "?",
    meaning:
      "There is evidence, but it doesn't settle the question, or its parts point different ways.",
    notMeaning: "That it is false, or that it is true.",
  },
  "insufficient-evidence": {
    label: "Insufficient evidence",
    symbol: "○",
    meaning: "There isn't enough evidence to assess it.",
    notMeaning: "That it is false. Not studied is not the same as disproved.",
  },
};

export interface ShownStatus {
  status: ClaimStatus;
  /** True when the recorded status was held back because nothing linked supports it. */
  withheld: boolean;
  reason: string;
}

/**
 * The status a screen may show. A verdict needs evidence behind it: "supported" or "partly
 * supported" with no supporting passage linked, or "contradicted" with no contradicting one, is
 * shown as unresolved instead, with the reason. Data entry mistakes then fail safe, toward
 * "we don't know", never toward a verdict.
 */
export function shownStatus(claim: Claim): ShownStatus {
  const has = (stance: string) => claim.evidence.some((link) => link.stance === stance);
  if (
    (claim.status === "supported" || claim.status === "partially-supported") &&
    !has("supports")
  ) {
    return {
      status: "unresolved",
      withheld: true,
      reason: "Shown as unresolved: no supporting evidence is linked yet.",
    };
  }
  if (claim.status === "contradicted" && !has("contradicts")) {
    return {
      status: "unresolved",
      withheld: true,
      reason: "Shown as unresolved: no contradicting evidence is linked yet.",
    };
  }
  return { status: claim.status, withheld: false, reason: claim.statusReason };
}
