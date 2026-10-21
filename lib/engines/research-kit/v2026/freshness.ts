/**
 * Whether a catalog made from a source may be out of date: once the day the source said it would publish its
 * next release has come, the catalog shows the amber "A newer … may be out." line (research-kit.md § 5.4). A
 * source that states no date never shows it: DotAmi doesn't guess when a government file will change.
 */
import type { SourceCard } from "./types";
import { researchKitWords } from "./words";

export type Freshness = { stale: false } | { stale: true; line: string };

/** `today` is YYYY-MM-DD, given by the caller so the answer is the same on every run of a test. */
export function catalogFreshness(card: Pick<SourceCard, "nextRelease">, today: string): Freshness {
  if (!card.nextRelease || today < card.nextRelease.date) return { stale: false };
  return { stale: true, line: researchKitWords.newerMayBeOut(card.nextRelease.what) };
}
