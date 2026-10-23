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
  // Taken out on 2026-10-22 when the three steps and the federal road were joined (PR #202 with PR #200): the
  // typed way's "road written for the place" entry (190 ideas: every typed idea drawn on road 0, wherever it is).
  // The typed way now ends on Pick a future's three steps, which outside Alberta list the federal steps first, and
  // its invented person opens the road written for the idea or, with none, the card the page shows first for the
  // place (tests/helpers/idea-pipeline.ts `stepsChoice`), so each typed idea is drawn on a road written for its place.
  {
    invariant: "ends:road-written-for-place",
    subject: "picked",
    kind: "planned",
    story: "The maintainer's call, asked in 28d's pull request: should “Not here yet?” open the federal steps outside Alberta?",
    // 190 ideas until 28d (2026-10-21), now 13 here and 9 in the next entry. Of the 168 off: 156 because the
    // corpus now says the federal road is written for them (tests/fixtures/ideas/v1.ts, "road-federal"), so the
    // invented person clicks its card; 12 because, with no road written for them, they click the card the
    // page shows first. The product change lists the federal card; the count moved with the clicks. Joined with
    // the three steps (PR #202, 2026-10-22) the same 13: an idea whose person leaves at "No road is written for
    // <job> yet" saves nothing and draws no road, but none of these leaves there.
    why: "Outside Alberta, Pick a future lists the federal steps first (28d), and an idea picked there is drawn on a road written for its place. “Not here yet?” still keeps the note and opens road 0, the general road, anywhere, as its own spec says (docs/ui-spec/futures/03-road-match.md: “as today”): these are the ideas with no road written for them whose invented person keeps a note. The goal bar says “Map drawn: … written for AB; this idea is in …”, so it isn't silent; whether the note should open the federal steps there instead is the maintainer's call.",
    ideas: [188, 194, 197, 200, 203, 206, 212, 251, 287, 290, 308, 362, 365],
  },
  {
    invariant: "ends:road-written-for-place",
    subject: "picked",
    kind: "planned",
    story: "The maintainer's call, asked in 28d's pull request: is an Alberta future picked from outside Alberta, after its card said so, an honest end?",
    why: "Outside Alberta, Pick a future still offers Alberta's two futures behind one button (“Show the 2 futures written for Alberta”), each card saying “Written for Alberta. You said …”. A person who opens them and picks one is drawn on a road written for AB: the goal bar says “Map drawn: … written for AB; this idea is in …”, so it isn't silent, but every step is Alberta's. These are the ideas with no road written for them whose invented person opens the fold and clicks road 0's or road 1's card (tests/helpers/idea-pipeline.ts `pickedChoice`), so the path stays run; whether this end counts as honest, or the page should say more, is the maintainer's call.",
    ideas: [22, 199, 202, 208, 211, 289, 301, 361, 364],
  },
  // Taken out on 2026-10-22 with the three steps (tasks 28b, 23g, 29h): the typed way's two silent-fallback
  // entries (25 ideas drawn on road 0 with only "No future picked", and 12 closing, pausing, selling or catch-up
  // ideas the same way). The typed way now ends on Pick a future's three steps, and the road drawn is the one the
  // person opened on step 3, kept as their pick, with the step's own line saying why (the road written for their
  // job first, "No road is written for <job> yet", or "You didn't pick a job").
];
