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
  // Found by the province swap on 2026-10-22. Road 0 ("Starting any business", written for Alberta) cites the map
  // stage *Hire first employee*'s four sources (lib/engines/cfe/v2026/nodes.ts): two CRA pages, Ontario's guide to
  // its Employment Standards Act and British Columbia's employment standards page. A road written for particular
  // provinces draws every source of a step (lib/engines/roads/v2026/index.ts `citationsForPlace`), so a person in
  // Alberta is shown Ontario's and British Columbia's pages, and no Alberta employment-standards page. The federal
  // steps already draw only the federal pages and the person's own province's, saying how many were left out.
  ...[
    "https://www.ontario.ca/document/your-guide-employment-standards-act-0/small-business",
    "https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards",
  ].map(
    (url): AccuracyGap => ({
      key: `AB · road-starting-any-business-ab · source · ${url}`,
      kind: "bug",
      story: "none yet: found by task 37a, the maintainer's call (draw a step's sources for the person's own province on every road, or cite Alberta's own page there)",
      why: "On road 0 in Alberta, Hire first employee lists Ontario's and British Columbia's employment-standards pages as its sources: road 0 is written for Alberta, and a road written for particular provinces shows every source.",
    }),
  ),
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
    why: "Step 1's search finds the job by the person's words only when every word is spelt as the government's titles spell it: with one word misspelt, these ideas find their job only by typing its own name.",
    ideas: [
      4, 10, 12, 13, 27, 31, 35, 39, 50, 51, 53, 55, 56, 57, 58, 59, 60, 65, 70, 72, 78, 79, 84, 85, 92, 94, 98, 104, 110, 111, 122, 129, 136, 149,
      156, 160, 161, 162, 164, 172, 176, 177, 178, 179, 181, 193, 198, 201, 213, 216, 220, 231, 233, 235, 255, 256, 266, 271, 273, 274, 275, 277,
      278, 279, 280, 283, 285, 287, 297, 299, 300, 302, 308, 309, 311, 314, 318, 326, 332, 334, 336, 337, 338, 339,
    ],
  },
  {
    how: "French",
    what: "province",
    kind: "bug",
    story: "none yet: found by task 37b, the maintainer's call (read a city that is also a first name after French place words too)",
    // lib/journey/intent-fallback.ts: "Regina", "Victoria", "Brandon" and "Hamilton" are also people's names, so they
    // name a place only after a word that puts the person there ("in", "from", "near", …: PLACE_WORD_BEFORE), all
    // English. "à Regina" names no province, where "in Regina" names Saskatchewan. The person still answers the
    // place question themselves, so nothing is derived: the question just starts empty.
    why: "In French (“je suis adjointe administrative à Regina”) the parser doesn't read Regina as the place, so the intake's place question starts empty, where the English words start it on Saskatchewan.",
    ideas: [32],
  },
];
