/**
 * The engines' own words about their sources: DotAmi's words, never a page's, so they live here and not in a catalog
 * (CLAUDE.md: every new word in a words file; docs/architecture/cards-in-official-words.md, "No new catalog
 * sentences"). tests/idea-invariants.spec.ts reads every sentence here for times, and tests/source-page-holds.spec.ts
 * holds each line to the rest of the words files' rules: no verdict, nothing about the person, no number that isn't
 * on the page it describes.
 */
export const sourceWords = {
  /**
   * The line under a source's title saying what its page holds (`EngineCitation.pageHolds`), so a person who opens
   * the page knows what to look for on it (the maintainer's note of 2026-10-29, on the s.67.3 source). Each line is
   * written from the page itself, read in full, in the page's own terms. Only one source has one so far; whether
   * every source gets one is his question (story S2.5.41).
   */
  pageHolds: {
    /**
     * Income Tax Act s.67.3, https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-67.3.html, the Motor vehicle
     * expenses write-off's first source. The page holds that one section, headed "Limitation re cost of leasing
     * passenger vehicle" (read in full on 2026-10-29, when building this line): where a passenger vehicle's lease
     * charges may be deducted, "in determining the amount that may be so deducted, the total of those charges shall
     * be deemed not to exceed the lesser of" the amounts its paragraphs (c) and (d) work out by formula
     * (scripts/check-quotes.mjs found those words, and the heading, on the page that day).
     */
    ita67_3:
      "Only section 67.3 is on this page: the limit on how much of a passenger vehicle's lease charges can be deducted, and the formulas that set it.",
  },
} as const;
