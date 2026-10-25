/**
 * The known gaps of the two accuracy tests that need no new data (tasks 37a and 37b): the same idea in every
 * province and territory (tests/province-swap.spec.ts) and the corpus's ideas reworded (tests/rewording.spec.ts).
 * Each is the same ratchet as the idea harness's (./known-gaps.ts): its test fails on a failure not listed here,
 * and on a listed one that no longer fails, so the lists only ever shrink. Every entry has a story, or says who
 * decides; none is skipped quietly. They are kept apart from ./known-gaps.ts, which holds the idea harness's own.
 */
import type { Rewording } from "../../helpers/rewording";

export interface AccuracyGap {
  /** The failure's key, as its test names it. */
  key: string;
  kind: "planned" | "bug";
  /** The story that fixes it, or, with none yet, who decides. */
  story: string;
  why: string;
}

/** Task 37a: a fact written for another province shown in a run, by "<province> · <road> · <kind> · <what>". */
export const PLACE_GAPS: readonly AccuracyGap[] = [
  // Empty since 2026-10-23 (the maintainer's call a-call-12): the two entries found on 2026-10-22, Ontario's and
  // British Columbia's employment-standards pages under road 0's Hire first employee in Alberta, are gone because every
  // road now draws a step's sources for the person's own place (lib/engines/roads/v2026/index.ts `citationsForPlace`),
  // and the step cites Alberta's own page.
];

/** Task 37b: a rewording that changes what the person is shown, for the ideas listed (the corpus's numbers). */
export interface RewordingGap {
  how: Rewording;
  what: "province" | "job" | "roads";
  kind: "planned" | "bug";
  story: string;
  why: string;
  ideas: readonly number[];
}

export const REWORDING_GAPS: readonly RewordingGap[] = [
  {
    how: "typo",
    what: "job",
    kind: "planned",
    story: "none yet: found by task 37b, the maintainer's call (a search that forgives a misspelt word; the batch-4 follow-up list already holds the search-quality measures)",
    // Measured 2026-10-22: 84 of the 220 ideas with a job, when the kind of work is typed with two letters swapped
    // in its longest word ("home baekry"). Step 1's search matches whole words and the first five letters of a
    // longer one (lib/engines/oasis/v2026/title-search.ts), so the misspelt word matches nothing; the job is still
    // found by its own name, as the no-match line suggests, never a different job.
    // 2026-10-23 (whole words first, a-call-11): still 84, four off and four on. Off: ideas 111, 271, 297 and 326,
    // whose misspelt words now list the job through the words spelt right (the exact-word part comes first). On:
    // ideas 54, 253, 284 and 316 ("electrical work", "office cleaning", "electrician" twice) now find their job by the
    // person's own words, where on main 694007d they found it only by its name (it sat past the first 50 of one
    // group: Electricians 55th of 101 for "electrician", now 4th); misspelt, they still find it only by its name, so
    // the rewording now changes what they are shown. The same gap as the rest, not a new one.
    why: "Step 1's search finds the job by the person's words only when every word is spelt as the government's titles spell it: with one word misspelt, these ideas find their job only by typing its own name.",
    ideas: [
      4, 10, 12, 13, 27, 31, 35, 39, 50, 51, 53, 54, 55, 56, 57, 58, 59, 60, 65, 70, 72, 78, 79, 84, 85, 92, 94, 98, 104, 110, 122, 129, 136, 149,
      156, 160, 161, 162, 164, 172, 176, 177, 178, 179, 181, 193, 198, 201, 213, 216, 220, 231, 233, 235, 253, 255, 256, 266, 273, 274, 275, 277,
      278, 279, 280, 283, 284, 285, 287, 299, 300, 302, 308, 309, 311, 314, 316, 318, 332, 334, 336, 337, 338, 339,
    ],
  },
  // The French place words gap (idea 32, "je suis adjointe administrative à Regina") is fixed: the maintainer's call
  // a-call-14 of 2026-10-23, lib/journey/intent-fallback.ts reads "à", "au", "aux", "en" and "dans" before a place,
  // and the provinces' French names, as it reads the English ones. French entries: 1 idea → 0.
];
