/**
 * DotAmi's own word list for "What's closest to your work?" (docs/ui-spec/futures/01-whats-closest-to-your-work.md,
 * "How the search works"). These are DotAmi's words, not the government's.
 *
 * THE MAINTAINER APPROVES EVERY LINE OF THIS FILE. Each line was listed for his approval in the pull request
 * that added it (his call of 2026-10-20: a short DotAmi word list, a plain file he approves). A line is added,
 * changed or taken out only in a pull request that lists it the same way, for his word.
 *
 * What each list does, and how the screen says so:
 * - FILLER_WORDS and BUSINESS_WORDS are left out of the search, and the screen names each one left out
 *   ("Not searched: …"). Filler words say nothing about the work ("my", "own", "start"); business words name
 *   the business rather than the work ("shop", "studio", "clinic").
 * - EVERYDAY_WORDS points a word people use for some work, that no government title holds for that job, at
 *   one of that job's own government titles. It is used only where none of the job's titles holds the
 *   person's word; a job it finds sits in its own last group, headed as found through DotAmi's word list,
 *   and the screen says which word went through which line. tests/job-title-search.spec.ts checks that every
 *   line's title really is one of its job's government titles, so a line can't invent one.
 *
 * Words are compared the way the search compares them: capitals, accents and apostrophes don't matter
 * ("I'm" is "im"), and a hyphen splits a word in two ("ride-share" is "ride share"). A word here must be the
 * person's word exactly: the word-start rule the titles use ("plumbing" finds "plumber") isn't used here.
 *
 * The first two lists are research 28f's, as it measured them on the idea corpus (rule H,
 * C:\dotami-wt\research-phase2\28f-measure.py, STOP and BIZ), unchanged.
 */

/** Words that say nothing about the work. */
export const FILLER_WORDS: readonly string[] = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "several",
  "some",
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "my",
  "our",
  "own",
  "in",
  "on",
  "at",
  "for",
  "to",
  "with",
  "from",
  "by",
  "i",
  "i'm",
  "we",
  "want",
  "wanna",
  "would",
  "like",
  "start",
  "open",
  "run",
  "starting",
  "opening",
  "sell",
  "selling",
  "make",
  "making",
  "new",
  "small",
  "local",
  "home",
  "based",
];

/** Words that name the business rather than the work. */
export const BUSINESS_WORDS: readonly string[] = [
  "business",
  "company",
  "firm",
  "shop",
  "studio",
  "clinic",
  "practice",
  "service",
  "services",
  "agency",
  "store",
  "co",
];

/** One line of DotAmi's everyday words: the person's word, and the government title (of one job) it points at. */
export interface EverydayWord {
  /** The person's word, or words in a row ("food truck"). */
  words: string;
  /** One of the job's own government titles (its OaSIS example titles, or its name), word for word. */
  title: string;
  /** The job's OaSIS code. */
  job: string;
}

/** Everyday words that no government title of the job holds. */
export const EVERYDAY_WORDS: readonly EverydayWord[] = [
  // Home child care providers (a word used in Alberta for child care in a person's own home).
  { words: "dayhome", title: "home child care provider", job: "44100.01" },
  // The maintainer's own example (2026-10-20); Hairstylists.
  { words: "salon", title: "hairstylist", job: "63210.01" },
  // Cooks.
  { words: "food truck", title: "cook", job: "63200.00" },
  // Taxi and limousine drivers: "ride-share" and "ride share", and "rideshare" as one word.
  { words: "ride share", title: "taxi driver", job: "75200.01" },
  { words: "rideshare", title: "taxi driver", job: "75200.01" },
];
