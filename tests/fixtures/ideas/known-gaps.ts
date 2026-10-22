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
    story: "S2.5.28d (outside Alberta, honestly)",
    why: "Every typed idea is drawn on road 0, which is written for Alberta only, wherever the idea is. The plan's goal line says “written for AB; this idea is in …”, but every step still reads as Alberta's. 28d draws the federal steps that apply everywhere and says “Written for Alberta” with the person's own province named.",
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
    story: "S2.5.28d (outside Alberta, honestly)",
    why: "Pick a future's third step lists both Alberta roads for every place in Canada, saying “Written for Alberta. You said …” on the card, and “Not here yet?” opens road 0 anywhere. Once picked, the cockpit draws every step as Alberta's, as on the typed way in. 28d draws the federal steps that apply everywhere and names the person's own province. (Since the three steps, 2026-10-22, an idea whose person leaves at “No road is written for <job> yet” saves nothing and draws no road, so it is off this list: 38 ideas.)",
    ideas: [
      4, 5, 7, 10, 11, 13, 16, 18, 20, 22, 28, 29, 32, 33, 35, 37, 38, 40, 42, 43, 47, 49, 50, 52, 53, 56, 58, 59, 61, 64, 67, 69, 73, 76,
      79, 80, 82, 85, 86, 88, 91, 92, 94, 97, 98, 100, 101, 102, 103, 105, 107, 109, 112, 113, 115, 119, 121, 123, 124, 126, 128, 133, 135,
      138, 140, 142, 145, 148, 150, 152, 154, 158, 160, 161, 163, 164, 165, 166, 167, 169, 172, 173, 179, 181, 182, 184, 185, 188, 190, 192,
      194, 197, 199, 200, 202, 203, 206, 208, 210, 211, 212, 245, 246, 247, 248, 249, 251, 254, 260, 268, 269, 287, 289, 290, 295, 296, 298,
      299, 301, 302, 304, 305, 307, 308, 310, 311, 312, 313, 314, 315, 316, 317, 319, 320, 322, 323, 332, 334, 337, 346, 352, 353, 354, 355,
      356, 360, 361, 362, 363, 364, 365, 366,
    ],
  },
  // Taken out on 2026-10-22 with the three steps (tasks 28b, 23g, 29h): the typed way's two silent-fallback
  // entries (25 ideas drawn on road 0 with only "No future picked", and 12 closing, pausing, selling or catch-up
  // ideas the same way). The typed way now ends on Pick a future's three steps, and the road drawn is the one the
  // person opened on step 3, kept as their pick, with the step's own line saying why (the road written for their
  // job first, "No road is written for <job> yet", or "You didn't pick a job").
];
