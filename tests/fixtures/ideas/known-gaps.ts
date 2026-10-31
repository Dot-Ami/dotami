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

/** A piece of text a component writes itself in which the no-times check finds a time. */
export interface ComponentTimeWords {
  /** The component, repo-relative. */
  file: string;
  /** The text exactly as tests/helpers/own-words.ts reports it: `${…}` for a template's holes, entities as written. */
  text: string;
  /**
   * "not a time": words the patterns misread. "retention": how long something is kept, which DotAmi's own
   * privacy disclosures may say (the maintainer's decision 2 of 2026-10-24). "known gap": a time in DotAmi's
   * own words still on screen, with a docs/task-list.md line.
   */
  kind: "not a time" | "retention" | "known gap";
  why: string;
}

/**
 * The same ratchet for the text every component under components/ and app/ writes itself
 * (tests/prerelease-honesty.spec.ts, since the review of #210 on 2026-10-24, when two item rows were found
 * writing "Time-boxed" where no words check read them): the spec fails on a piece with a time not listed here,
 * and on a listed one it no longer finds.
 */
export const COMPONENT_TIME_WORDS: readonly ComponentTimeWords[] = [
  {
    file: "components/settings/settings-page.tsx",
    text: "creates it (README, Quick start).",
    kind: "not a time",
    why: "The README's section name; the fastest pattern reads Quick.",
  },
  {
    file: "components/ventures/figures-panel.tsx",
    text: "The tax year this total is for. The CRA line it goes on can change from one year's form to the next.",
    kind: "not a time",
    why: "A tax year's form; \"one year\" reads as a duration in words.",
  },
  {
    file: "components/ventures/file-drop.tsx",
    text: "${…} ${…} under a month with an amount DotAmi can't read: ${…}",
    kind: "not a time",
    why: "The calendar month a figure is filed under; \"under a month\" reads as a wait.",
  },
  {
    file: "components/ventures/file-drop.tsx",
    text: "${…} ${…} under a month holding ${…}: ${…}",
    kind: "not a time",
    why: "The calendar month a figure is filed under.",
  },
  {
    file: "components/ventures/file-drop.tsx",
    text: "${…} empty ${…} under a month: ${…}",
    kind: "not a time",
    why: "The calendar month a figure is filed under.",
  },
  {
    file: "components/ventures/file-drop.tsx",
    text: "${…} ${…} in a month that isn't over yet",
    kind: "not a time",
    why: "A calendar month not ended yet; \"in a month\" reads as a wait.",
  },
  {
    file: "components/ventures/file-drop.tsx",
    text: "Every row leaves out the file&apos;s own totals rows. Pick one row to take only its figures, such as the file&apos;s Total row.",
    kind: "not a time",
    why: "A choice of rows; the takes-about pattern reads \"take only\".",
  },
  {
    file: "components/your-data/your-data-page.tsx",
    text: "These live in the window, not in the data file, so this page can&apos;t see what is in them right now. This is what DotAmi puts there and how long it stays.",
    kind: "retention",
    why: "How long DotAmi keeps what it puts in the window: a disclosure the privacy page owes the person.",
  },
  {
    file: "components/your-data/your-data-page.tsx",
    text: "How long ·",
    kind: "retention",
    why: "The same, as each window key's row label.",
  },
  {
    file: "components/your-data/your-data-page.tsx",
    text: "How long Anthropic keeps it:",
    kind: "retention",
    why: "The label before the link to Anthropic's own page on what it keeps of what the intake's parser sends.",
  },
];

/**
 * Invariants that may never be listed as a known gap (the maintainer's call 32 of 2026-10-22, "Yes, fail the tests
 * above 0"): an idea drawn on a road that isn't the one written for it, or the one the person picked, with nothing
 * on screen saying so. Its count is 0 since the three steps (PR #202), and the harness fails on any such failure
 * because none can be listed (tests/idea-harness.spec.ts).
 */
export const NEVER_A_KNOWN_GAP: readonly InvariantId[] = ["ends:no-silent-fallback"];

export const KNOWN_GAPS: readonly KnownGap[] = [
  // Taken out on 2026-10-22 when the three steps and the federal road were joined (PR #202 with PR #200): the
  // typed way's "road written for the place" entry (190 ideas: every typed idea drawn on road 0, wherever it is).
  // The typed way now ends on Pick a future's three steps, which outside Alberta list the federal steps first, and
  // its invented person opens the road written for the idea or, with none, the card the page shows first for the
  // place (tests/helpers/idea-pipeline.ts `stepsChoice`), so each typed idea is drawn on a road written for its place.
  // Taken out on 2026-10-22 with the maintainer's calls on the batch 4 page (task 28h), both "ends:road-written-for-
  // place · picked" entries (22 ideas outside Alberta, 13 + 9):
  // - Call 33, "Open the federal steps": "Not here yet?" now keeps the note and opens the federal steps outside
  //   Alberta (`notHereRoad` in lib/front-door/futures.ts), a road written for all of Canada, so the 13 ideas whose
  //   invented person keeps a note (188, 194, 197, 200, 203, 206, 212, 251, 287, 290, 308, 362, 365) are drawn on a
  //   road written for their place.
  // - Call 35, "Yes, it's honest: they were told and chose it": an Alberta future picked from outside Alberta is an
  //   honest end while both labels stay on screen, the card's ("Written for Alberta. You said …", and its line about
  //   the job picked) and the cockpit's ("Map drawn: … written for AB; this idea is in …"). The harness checks both
  //   for each of the 9 ideas (22, 199, 202, 208, 211, 289, 301, 361, 364) and fails the end again without either
  //   (tests/helpers/idea-invariants.ts `honestAlbertaPick`, planted in tests/idea-harness-plants.spec.ts).
  // Taken out on 2026-10-22 with the three steps (tasks 28b, 23g, 29h): the typed way's two silent-fallback
  // entries (25 ideas drawn on road 0 with only "No future picked", and 12 closing, pausing, selling or catch-up
  // ideas the same way). The typed way now ends on Pick a future's three steps, and the road drawn is the one the
  // person opened on step 3, kept as their pick, with the step's own line saying why (the road written for their
  // job first, "No road is written for <job> yet", or "You didn't pick a job").
];
