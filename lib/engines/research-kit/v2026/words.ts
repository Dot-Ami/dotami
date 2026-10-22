/**
 * The research kit's own words (docs/architecture/research-kit.md § 5.4). Kept here, apart from the screens,
 * so every screen that shows a catalog made from a registry source says it the same way.
 */
export const researchKitWords = {
  /**
   * The amber line once a source's stated next release has come (competitive-landscape.md § 6.2: "A newer
   * count may be out."). `what` is the card's own word for the release: "count", "wage file".
   */
  newerMayBeOut: (what: string) => `A newer ${what} may be out.`,
} as const;
