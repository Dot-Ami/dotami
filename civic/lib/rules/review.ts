import type { Claim, Extraction, ReviewState } from "../model";

export const REVIEW_INFO: Record<ReviewState, { label: string; meaning: string }> = {
  draft: { label: "Draft", meaning: "Not yet checked by anyone but its author." },
  "in-review": { label: "In review", meaning: "Being checked; not every required review is done." },
  "needs-expert-review": {
    label: "Needs expert review",
    meaning:
      "Rests on something a general reviewer can't settle, such as a value read off a chart.",
  },
  reviewed: {
    label: "Reviewed",
    meaning: "Checked against its passages by the required number of reviewers.",
  },
};

export const REVIEWS_REQUIRED = { highStakes: 2, other: 1 };

export interface ReviewGate {
  state: ReviewState;
  blockers: string[];
}

/**
 * The review state a claim may be shown with. "Reviewed" has to be earned: a high-stakes claim
 * needs two reviews, and a claim whose assessment rests on a value estimated by eye from a figure
 * needs a reviewer with scientific expertise. Short of that, the claim is shown one step down.
 */
export function reviewGate(claim: Claim, extractions: Extraction[]): ReviewGate {
  const blockers: string[] = [];
  const needed = claim.highStakes ? REVIEWS_REQUIRED.highStakes : REVIEWS_REQUIRED.other;
  if (claim.review.reviews.length < needed) {
    blockers.push(`Needs ${needed} reviews; has ${claim.review.reviews.length}.`);
  }
  const estimated = extractions.filter(
    (e) => claim.dependsOnExtractions?.includes(e.id) && e.method === "visually-estimated",
  );
  const expert = claim.review.reviews.some((r) => r.expertise === "science");
  if (estimated.length > 0 && !expert) {
    blockers.push(
      `Rests on ${estimated.length} value(s) estimated by eye from a figure; needs a reviewer with scientific expertise.`,
    );
  }

  let state = claim.review.state;
  if (state === "reviewed" && blockers.length > 0) {
    state = estimated.length > 0 && !expert ? "needs-expert-review" : "in-review";
  }
  return { state, blockers };
}
