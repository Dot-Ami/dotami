import { PLACE_CODES, type PlaceCode } from "@/lib/places/codes";
import { STATEMENT_MAX_CHARS } from "@/lib/person/types";

/**
 * *Your destination*'s four questions, as data (docs/architecture/future-cockpit.md § 1, "The way in as
 * built"). The screen (components/front-door/destination-page.tsx) draws whatever this list holds, in
 * its order, so the later step-by-step questionnaire starts from these same four: a question is added
 * here, not written into a screen.
 *
 * Every id is permanent: the tab's draft, the data file (`Venture.lookingFor`) and the tests keep them.
 * Add, never rename or reuse. A question's own words live here with it, because they are the question;
 * every other sentence on the screen is in lib/front-door/words.ts.
 */

/** The answers to "a business of your own, a job or career, or both?". The last is that question's "I don't know". */
export const LOOKING_FOR = ["business", "career", "both-or-not-sure"] as const;
export type LookingFor = (typeof LOOKING_FOR)[number];

/** Canada's thirteen provinces and territories, as international codes; "CA" (all of Canada) is no answer to "which one". */
export const DESTINATION_PLACES: readonly PlaceCode[] = PLACE_CODES.filter((code) => code !== "CA");

export type DestinationQuestionId = "destination" | "looking-for" | "place" | "income-wanted";

export type DestinationAnswerKind =
  | { kind: "own-words"; maxChars: number }
  | { kind: "one-choice"; choices: readonly { id: LookingFor; label: string }[] }
  | { kind: "place"; places: readonly PlaceCode[] }
  | { kind: "amount-per-year"; currency: "CAD" };

export interface DestinationQuestion {
  id: DestinationQuestionId;
  /** The question, as the person reads it. */
  ask: string;
  /** Why DotAmi asks it: nothing is asked unless something on screen depends on it (§ 3). */
  why: string;
  /** What the answer lights up. */
  unlocks: string;
  answer: DestinationAnswerKind;
  /** The words on the button that answers "I don't know" or skips it; null when the question has none. */
  skip: string | null;
  /** True when the way in can't go on without an answer. */
  required: boolean;
  /** Where the answer is kept: a statement, a column on the future, or a number the person agrees to. */
  keptIn: "person-statement:destination" | "future:looking-for" | "future:place" | "person-figure:income-wanted";
}

export const DESTINATION_QUESTIONS: readonly DestinationQuestion[] = [
  {
    id: "destination",
    ask: "In a few years, what do you want your work and life to look like? Use your own words.",
    why: "So the top of every future you open is your own goal, exactly as you said it.",
    unlocks: "The words at the top of each future, with the day you said them. No rule reads them.",
    answer: { kind: "own-words", maxChars: STATEMENT_MAX_CHARS },
    skip: "I don't know yet",
    required: false,
    keptIn: "person-statement:destination",
  },
  {
    id: "looking-for",
    ask: "Are you after a business of your own, a job or career, or both?",
    why: "Some futures are a business, some a career, and some have both, with a fork between them.",
    unlocks: "A count of the written futures that include what you picked. Every future is still listed.",
    answer: {
      kind: "one-choice",
      choices: [
        { id: "business", label: "A business of my own" },
        { id: "career", label: "A job or career" },
        { id: "both-or-not-sure", label: "Both, or not sure" },
      ],
    },
    // "Both, or not sure" is this question's "I don't know".
    skip: null,
    required: true,
    keptIn: "future:looking-for",
  },
  {
    id: "place",
    ask: "Which province or territory are you in?",
    why: "Fees, licences and tax rules differ by place, and no road can be drawn without one.",
    unlocks: "Which rules apply, and which futures are written for where you are.",
    answer: { kind: "place", places: DESTINATION_PLACES },
    skip: null,
    required: true,
    keptIn: "future:place",
  },
  {
    id: "income-wanted",
    ask: "What yearly income do you want, before tax?",
    why: "So every future sits next to your own number. Nothing compares the two.",
    unlocks: "Your target at the top of each future, once you agree to it.",
    answer: { kind: "amount-per-year", currency: "CAD" },
    skip: "Skip",
    required: false,
    keptIn: "person-figure:income-wanted",
  },
];
