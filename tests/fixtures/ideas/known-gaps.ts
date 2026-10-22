import type { InvariantId } from "../../helpers/idea-invariants";

/**
 * The known gaps: each idea and invariant (and subject) the idea harness (tests/idea-harness.spec.ts) finds
 * failing today, and why. It is a ratchet: the harness fails on any failure not listed here, and also on a
 * listed one that now passes, so this list only ever shrinks. When a story lands, remove its ideas here in
 * the same pull request.
 *
 * Two kinds:
 * - "planned": the feature that makes it pass is a story not built yet (phase 2 of the plan of 2026-10-17).
 * - "bug": today's code does something the binding rules say it never does. Each is a finding for the
 *   maintainer (listed in the pull request that added it), never a gap hidden here quietly.
 *
 * `ideas` are the corpus's permanent numbers (idea-v1-0001 is 1).
 */
export interface KnownGap {
  invariant: InvariantId;
  /** The failure's subject: a question's id, a line's place on screen, a tag, or "" when there is one. */
  subject: string;
  kind: "planned" | "bug";
  /** The story that fixes it, or, for a bug with none yet, who decides. */
  story: string;
  why: string;
  ideas: readonly number[];
}

const MAINTAINERS_CALL = "none yet: found by S2.5.29b, the maintainer's call";

/** A sentence a screen shows straight from a words file that the no-times check finds a time in. */
export interface ShownWordsGap {
  /** The file and the string's path in it, as tests/idea-invariants.spec.ts names it. */
  where: string;
  kind: "bug";
  story: string;
  why: string;
}

/**
 * The same ratchet for the words files (tests/idea-invariants.spec.ts reads every plain string in them):
 * the spec fails on a sentence with a time not listed here, and on a listed one that no longer has one.
 */
export const SHOWN_WORDS_GAPS: readonly ShownWordsGap[] = [
  // Taken out on 2026-10-20: the front door's first door said "Say where you want to be in a few years". The
  // maintainer picked "Reword both" (this door and Your destination's first question) on the page "DotAmi
  // Phase 2", so neither says a span of time any more.
];

export const KNOWN_GAPS: readonly KnownGap[] = [
  {
    invariant: "ends:road-written-for-place",
    subject: "typed",
    kind: "planned",
    story:
      "The typed way ending on Pick a future's three steps (the maintainer's call 1 of 2026-10-21, docs/ui-spec/intake/_index.md; tasks 28b and 28c), where 28d's federal road is listed first outside Alberta",
    why: "Every typed idea is drawn on road 0, which is written for Alberta only, wherever the idea is: “I already have an idea” still ends on Open my map, which saves no road. The plan's goal line says “written for AB; this idea is in …”, but every step still reads as Alberta's. Since 28d (2026-10-21) the federal steps exist and Pick a future lists them first outside Alberta; the typed way reaches them once it ends on the same three steps.",
    ideas: [
      3, 4, 5, 7, 9, 10, 11, 13, 15, 16, 18, 20, 22, 28, 29, 30, 32, 33, 35, 36, 37, 38, 40, 42, 43, 45, 47, 49, 50, 52, 53, 54, 56, 58, 59,
      60, 61, 63, 64, 66, 67, 69, 73, 75, 76, 78, 79, 80, 82, 84, 85, 86, 88, 91, 92, 94, 96, 97, 98, 100, 101, 102, 103, 105, 107, 109,
      111, 112, 113, 114, 115, 117, 119, 121, 123, 124, 126, 128, 129, 133, 135, 138, 140, 142, 145, 148, 150, 152, 154, 156, 158, 160, 161,
      163, 164, 165, 166, 167, 169, 171, 172, 173, 177, 179, 181, 182, 184, 185, 186, 188, 189, 190, 192, 194, 197, 198, 199, 200, 202, 203,
      206, 208, 210, 211, 212, 213, 245, 246, 247, 248, 249, 251, 254, 255, 260, 268, 269, 287, 288, 289, 290, 294, 295, 296, 297, 298, 299,
      300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 332, 334,
      337, 346, 351, 352, 353, 354, 355, 356, 357, 360, 361, 362, 363, 364, 365, 366,
    ],
  },
  {
    invariant: "ends:road-written-for-place",
    subject: "picked",
    kind: "planned",
    story: "The maintainer's call, asked in 28d's pull request: should “Not here yet?” open the federal steps outside Alberta?",
    // 190 ideas until 28d (2026-10-21); the federal road, listed first outside Alberta, took 177 of them off.
    why: "Outside Alberta, Pick a future lists the federal steps first (28d), and an idea picked there is drawn on a road written for its place. “Not here yet?” still keeps the note and opens road 0, the general road, anywhere, as its own spec says (docs/ui-spec/futures/03-road-match.md: “as today”): these are the ideas with no road written for them whose invented person keeps a note. The goal bar says “Map drawn: … written for AB; this idea is in …”, so it isn't silent; whether the note should open the federal steps there instead is the maintainer's call.",
    ideas: [188, 194, 197, 200, 203, 206, 212, 251, 287, 290, 308, 362, 365],
  },
  {
    invariant: "ends:no-silent-fallback",
    subject: "typed",
    kind: "planned",
    story: "S2.5.28c (honest road match)",
    why: "Nothing matches a typed idea to a road, so an Alberta idea with no road written for it (a career, work the law forbids, words that don't say business or career) and a cabinetmaker idea (road 1 is written for it) all land on road 0 with only “No future picked: this idea is drawn on the general road.” 28c puts the road written for the picked job first, or says “No road is written for this job yet”.",
    ideas: [
      8, 46, 125, 180, 193, 250, 252, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 358, 359, 367,
    ],
  },
  {
    invariant: "ends:no-silent-fallback",
    subject: "typed",
    kind: "planned",
    story: "S2.5.28c (honest road match) says so; the roads themselves are not planned yet (docs/architecture/use-cases.md, people 9 and 10)",
    why: "An Alberta business that is closing, pausing, being sold, or behind on its filings is drawn on road 0, “Starting any business in Alberta”, with only “No future picked”. No road is written for closing or catching up: use-cases.md says of the closing steps “None of this exists yet” and lists catch-up paths as a need. 28c would say “No road is written for this yet” instead of drawing road 0 as if it were the road for them.",
    ideas: [178, 183, 191, 195, 196, 201, 204, 205, 207, 209, 330, 331],
  },
];
