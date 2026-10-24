import { formatMoney, formatMonth } from "@/lib/format/money-and-months";

/**
 * Every sentence road evaluation and its receipts write, in one file (the maintainer's decision of
 * 2026-10-11: new screens keep their words in one place). Each one is filled in from data only: a
 * catalog label, a value the person gave, a count. Nothing here is written by a model, and nothing here
 * judges: a gap is a count or a sum, never "enough", "ready" or "best", and nothing says what the person
 * should do (docs/architecture/future-cockpit.md § 4). tests/road-evaluation.spec.ts runs every kind of
 * sentence past a list of verdict words.
 *
 * Amounts and months go through lib/format/money-and-months.ts, the one formatter.
 */

const quoted = (label: string) => `“${label}”`;
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "a", "a and b", "a, b and c". */
export function listOf(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** "a", "a or b", "a, b or c". */
function eitherOf(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} or ${parts.at(-1)}`;
}

// --- The labels of the idea's own answers, as the intake shows them (components/discovery/intake-page.tsx,
// --- components/cockpit/cockpit-page.tsx). Kept in step by hand; a new value is added in both places.

export const VENTURE_TYPE_WORDS = { service: "Service", product: "Product", "side-gig": "Side gig" } as const;

export const EMPLOYMENT_WORDS = {
  employee: "Employed (full- or part-time)",
  "self-employed": "Already self-employed",
  "business-owner": "Already run a business",
  apprentice: "Apprentice / student",
  retired: "Retired",
  unemployed: "Between roles",
  other: "Other",
  // Not an answer: a future picked on Pick a future before anyone asked (2026-10-12). Road evaluation
  // lists it as not told, and tries it as the work situation "taken away".
  "not-said": "Not said",
} as const;

export const STRUCTURE_WORDS = { "sole-prop": "Sole prop", corporation: "Corporation" } as const;

const MARK_WORDS = { have: "have", learning: "learning", "not-yet": "not yet" } as const;
const STATUS_WORDS = { doing: "doing", done: "done", "not-for-me": "not for me" } as const;

// --- Why a step is in the state it is in (one sentence per step).

export const because = {
  notForMe: () => "You marked this step not for me.",
  // A step the road writes for some kinds of work only (`onlyForKindsOfWork`), on an idea with none of
  // them. Only what DotAmi can check: which kinds of work are on the idea. Never "you haven't told DotAmi
  // …": a person may have typed their own kind of work ("Research and development") that says just that,
  // which the rules don't match. "Only with one of them" says what the step needs, not that one of them is
  // enough (for a sole proprietorship today's rules still leave SR&ED deepening off).
  kindsOfWork: (onIdea: readonly string[], tags: readonly string[]) =>
    onIdea.length === 0
      ? `This idea has no kinds of work on it, and this step is on your path only with one of ${eitherOf(tags)}.`
      : `None of the kinds of work on this idea is ${eitherOf(tags)}, and this step is on your path only with one of them.`,
  rules: (state: "applies" | "check-first" | "not-on-your-path", facts: readonly string[]) => {
    if (facts.length === 0) return "Today's rules give it this colour; no single answer of yours changes that.";
    const lead =
      state === "applies"
        ? "Today's rules light it"
        : state === "check-first"
          ? "Today's rules say check first"
          : "Today's rules leave it off your path";
    return `${lead}, from ${listOf(facts)}.`;
  },
  forkPicked: (fork: string, from: "you" | "map") =>
    from === "you" ? `You picked it at ${quoted(fork)}.` : `It is the map's pick at ${quoted(fork)}.`,
  forkOtherSide: (fork: string, picked: string, from: "you" | "map") =>
    from === "you"
      ? `You picked ${quoted(picked)} at ${quoted(fork)}.`
      : `The map's pick at ${quoted(fork)} is ${quoted(picked)}.`,
  forkNotPicked: (fork: string) => `No side is picked at ${quoted(fork)} yet.`,
  afterOtherSide: (side: string, fork: string, picked: string, from: "you" | "map") =>
    `It comes after ${quoted(side)}, and ${
      from === "you" ? `you picked ${quoted(picked)} at ${quoted(fork)}` : `the map's pick at ${quoted(fork)} is ${quoted(picked)}`
    }.`,
  afterForkNotPicked: (fork: string) => `It comes after ${quoted(fork)}, where no side is picked yet.`,
  onYourRoad: (road: string, chosen: boolean) =>
    chosen ? `It's on ${quoted(road)}, the road you chose.` : `It's on ${quoted(road)}.`,
};

// --- The person's answers, three ways each: as said ("Because you told us …"), as taken back
// --- ("Because you took back …"), and as a fact a step's reason can name ("from your place (Alberta)").

export interface AnswerWords {
  said: string;
  takenBack: string;
  fact: string;
}

export const answer = {
  job: (label: string): AnswerWords => ({
    said: `you picked the job closest to your work: ${quoted(label)}`,
    takenBack: "you took back your pick of job",
    fact: `your pick of job (${label})`,
  }),
  skill: (label: string, mark: keyof typeof MARK_WORDS, own: boolean): AnswerWords => {
    const added = own ? ", a skill you added" : "";
    const said =
      mark === "have"
        ? `you told us you have ${quoted(label)}${added}`
        : mark === "learning"
          ? `you told us you're learning ${quoted(label)}${added}`
          : `you told us you don't have ${quoted(label)} yet${added}`;
    return { said, takenBack: `you took back your mark on ${quoted(label)}`, fact: `your mark on ${quoted(label)} (${MARK_WORDS[mark]})` };
  },
  stepStatus: (step: string, status: keyof typeof STATUS_WORDS): AnswerWords => ({
    said:
      status === "done"
        ? `you told us ${quoted(step)} is done`
        : status === "doing"
          ? `you told us you're doing ${quoted(step)}`
          : `you told us ${quoted(step)} is not for you`,
    takenBack: `you took back your status on ${quoted(step)}`,
    fact: `your status on ${quoted(step)} (${STATUS_WORDS[status]})`,
  }),
  ticks: (step: string, ticked: number, total: number): AnswerWords => ({
    said: `you ticked ${ticked} of ${total} “done when” lines on ${quoted(step)}`,
    takenBack: `you took back your ticks on ${quoted(step)}`,
    fact: `your ticks on ${quoted(step)} (${ticked} of ${total})`,
  }),
  forkPick: (fork: string, side: string): AnswerWords => ({
    said: `you picked ${quoted(side)} at ${quoted(fork)}`,
    takenBack: `you took back your pick at ${quoted(fork)}`,
    fact: `your pick at ${quoted(fork)} (${quoted(side)})`,
  }),
  // byPerson: the person clicked it, or its saved pick is off the default (`isBranchDecided`,
  // lib/scenarios/graph.ts); otherwise it is the map's default, and says so.
  mapPick: (fork: string, side: string, byPerson: boolean): AnswerWords =>
    byPerson
      ? {
          said: `you picked ${quoted(side)} at ${quoted(fork)} on the map`,
          takenBack: `the map's pick at ${quoted(fork)} was cleared`,
          fact: `your pick at ${quoted(fork)} on the map (${quoted(side)})`,
        }
      : {
          said: `the map's default pick at ${quoted(fork)} is ${quoted(side)}, not your pick yet`,
          takenBack: `the map's pick at ${quoted(fork)} was cleared`,
          fact: `the map's default pick at ${quoted(fork)} (${quoted(side)})`,
        },
  costLine: (line: string, step: string, cents: number): AnswerWords => ({
    said: `you told us your number for ${quoted(line)} on ${quoted(step)} is ${formatMoney(cents)}`,
    takenBack: `you took back your number for ${quoted(line)} on ${quoted(step)}`,
    fact: `your number for ${quoted(line)} (${formatMoney(cents)})`,
  }),
  // A quote the person agreed on a cost line the road leaves out for the idea's place (`roadForPlace`: the line rests
  // on another province's page): kept, named, counted in no sum (second review of #207, 2026-10-24).
  costLineForAnotherPlace: (line: string, step: string, cents: number): AnswerWords => ({
    said: `you told us your number for ${quoted(line)} on ${quoted(step)} is ${formatMoney(cents)}; it is kept with this idea and not counted for your place, because that line rests on another province's page`,
    takenBack: `you took back your number for ${quoted(line)} on ${quoted(step)}`,
    fact: `your number for ${quoted(line)} (${formatMoney(cents)}, kept, not counted for your place)`,
  }),
  savings: (cents: number): AnswerWords => ({
    said: `you told us you'd put ${formatMoney(cents)} of savings toward starting`,
    takenBack: "you took back your savings number",
    fact: `your savings for starting (${formatMoney(cents)})`,
  }),
  incomeWanted: (cents: number): AnswerWords => ({
    said: `you told us you want ${formatMoney(cents)} a year, before tax`,
    takenBack: "you took back the yearly income you want",
    fact: `the yearly income you want (${formatMoney(cents)})`,
  }),
  date: (month: string): AnswerWords => ({
    said: `you told us your date is ${formatMonth(month)}`,
    takenBack: "you took back your date",
    fact: `your date (${formatMonth(month)})`,
  }),
  // The person's own "I'd incorporate at $___" on today's road (2026-10-11): theirs, never DotAmi's.
  incorporateAt: (dollars: number): AnswerWords => ({
    said: `you told us you'd incorporate at ${formatMoney(dollars * 100)} of yearly sales`,
    takenBack: "you took back the sales at which you'd incorporate",
    fact: `your own “I'd incorporate at” number (${formatMoney(dollars * 100)})`,
  }),
  whatIf: (dollars: number): AnswerWords => ({
    said: `you tried first-year sales of ${formatMoney(dollars * 100)} (your what-if, not a forecast)`,
    takenBack: "you cleared your what-if",
    fact: `your what-if of first-year sales (${formatMoney(dollars * 100)}, not a forecast)`,
  }),
  place: (place: string): AnswerWords => ({
    said: `you told us your place is ${place}`,
    takenBack: "you took back your place",
    fact: `your place (${place})`,
  }),
  ventureType: (type: string): AnswerWords => ({
    said: `you told us the kind of venture is ${type}`,
    takenBack: "you took back the kind of venture",
    fact: `the kind of venture (${type})`,
  }),
  // A future picked on Pick a future is saved with the intake's starting kind, never asked (2026-10-12).
  ventureTypeUnanswered: (startingKind: string): AnswerWords => ({
    said: `the kind of venture is not answered yet; the idea was saved with the starting value, ${startingKind}`,
    takenBack: "you took back the kind of venture",
    fact: `the kind of venture (not answered; saved as ${startingKind})`,
  }),
  workSituation: (situation: string): AnswerWords => ({
    said: `you told us your work situation is ${situation}`,
    takenBack: "you took back your work situation",
    fact: `your work situation (${situation})`,
  }),
  structure: (structure: string, setByYou: boolean): AnswerWords =>
    setByYou
      ? {
          said: `you told us your structure is ${structure}`,
          takenBack: "you took back your structure",
          fact: `your structure (${structure})`,
        }
      : {
          said: `the map assumes ${structure} until you set your structure`,
          takenBack: "you took back your structure",
          fact: `the structure the map assumes until you set it (${structure})`,
        },
  kindsOfWork: (tags: readonly string[]): AnswerWords => ({
    said: `you told us the kinds of work are ${listOf(tags)}`,
    takenBack: "you took back the kinds of work",
    fact: `the kinds of work you confirmed (${tags.join(", ")})`,
  }),
  // Off may be the default (the idea keeps no record of a touch), so off is a state, not an act.
  hireFirst: (on: boolean): AnswerWords => ({
    said: on ? "you switched on the hire-first path" : "the hire-first path is switched off",
    takenBack: "the hire-first path is switched off",
    fact: on ? "the hire-first path (switched on)" : "the hire-first path (switched off)",
  }),
  equipment: (on: boolean): AnswerWords => ({
    said: on
      ? "you told us you're buying equipment, a vehicle or tools"
      : "you told us you're not buying equipment, a vehicle or tools",
    takenBack: "you took back your answer on buying equipment, a vehicle or tools",
    fact: on ? "buying equipment, a vehicle or tools (yes)" : "buying equipment, a vehicle or tools (no)",
  }),
  equipmentUnanswered: (): AnswerWords => ({
    said: "buying equipment, a vehicle or tools is not answered yet, so the rules read it as no",
    takenBack: "you took back your answer on buying equipment, a vehicle or tools",
    fact: "buying equipment, a vehicle or tools (not answered, read as no)",
  }),
  salesYear: (year: 1 | 3, dollars: number): AnswerWords => {
    const which = year === 1 ? "first-year" : "third-year";
    return {
      said: `you told us ${which} sales of ${formatMoney(dollars * 100)}`,
      takenBack: `you took back your ${which} sales number`,
      fact: `your ${which} sales number (${formatMoney(dollars * 100)})`,
    };
  },
  businessFigures: (n: number): AnswerWords => ({
    said: `you agreed to ${count(n, "business figure", "business figures")}`,
    takenBack: "you took back your business figures",
    fact: `the ${count(n, "business figure", "business figures")} you agreed to`,
  }),
};

/** Kinds of answer, so three or more changed at once are counted rather than listed one by one. */
export type AnswerGroup =
  | "job"
  | "skill"
  | "own-skill"
  | "step"
  | "ticks"
  | "fork"
  | "map-pick"
  | "cost-line"
  | "money"
  | "date"
  | "what-if"
  | "idea";

/** Three or more changed answers of one kind, counted: "you marked 9 skills". */
export function manyAnswers(group: AnswerGroup, n: number): string {
  switch (group) {
    case "skill":
      return `you marked ${count(n, "skill", "skills")}`;
    case "own-skill":
      return `you marked ${count(n, "skill", "skills")} of your own`;
    case "step":
      return `you changed ${count(n, "step", "steps")}`;
    case "ticks":
      return `you ticked lines on ${count(n, "step", "steps")}`;
    case "fork":
      return `you changed ${count(n, "pick", "picks")}`;
    case "map-pick":
      return `you changed ${count(n, "pick", "picks")} on the map`;
    case "cost-line":
      return `you changed ${count(n, "cost-line number", "cost-line numbers")}`;
    case "idea":
      return `you changed ${count(n, "answer", "answers")} about your idea`;
    default:
      return `you changed ${count(n, "answer", "answers")}`;
  }
}

/** Three or more answers of one kind taken back, counted apart from those given: "you took back 3 skill marks". */
export function manyTakenBack(group: AnswerGroup, n: number): string {
  switch (group) {
    case "skill":
      return `you took back ${count(n, "skill mark", "skill marks")}`;
    case "own-skill":
      return `you took back your marks on ${count(n, "skill", "skills")} of your own`;
    case "step":
      return `you took back your status on ${count(n, "step", "steps")}`;
    case "ticks":
      return `you took back your ticks on ${count(n, "step", "steps")}`;
    case "fork":
      return `you took back ${count(n, "pick", "picks")}`;
    case "map-pick":
      return `the map's picks at ${count(n, "fork", "forks")} were cleared`;
    case "cost-line":
      return `you took back ${count(n, "cost-line number", "cost-line numbers")}`;
    case "idea":
      return `you took back ${count(n, "answer", "answers")} about your idea`;
    default:
      return `you took back ${count(n, "answer", "answers")}`;
  }
}

// --- What changed, one clause per change; a receipt line is "Because <answers>, <clause>."

export const changed = {
  stepsNow: (n: number, state: "applies" | "check-first" | "not-on-your-path") =>
    state === "applies"
      ? `${count(n, "step", "steps")} now ${n === 1 ? "applies" : "apply"}`
      : state === "check-first"
        ? `${count(n, "step", "steps")} now ${n === 1 ? "says" : "say"} check first`
        : `${count(n, "step", "steps")} ${n === 1 ? "is" : "are"} now not on your path`,
  // About skills only: a step with every skill marked can still have "done when" lines and money to go,
  // so these never say the step needs nothing more, or that it is ready.
  allSkillsHave: (n: number) =>
    n === 1 ? "1 step now has every skill it lists marked have" : `${n} steps now have every skill they list marked have`,
  notAllSkillsHave: (n: number) =>
    n === 1
      ? "1 step no longer has every skill it lists marked have"
      : `${n} steps no longer have every skill they list marked have`,
  stepsDone: (done: number, total: number) => `${done} of ${count(total, "step is", "steps are")} now done`,
  skills: (have: number, learning: number, notYet: number, notMarked: number) =>
    `the skills now read ${have} have, ${learning} learning, ${notYet} not yet, ${notMarked} not marked`,
  /** The road drawn for the idea's new place left every listed item out (the Skills gauge's own words, lib/cockpit/words.ts). */
  skillsNoneForPlace: "this road's skills rest on other provinces' pages, so none is listed for your place",
  ownSkills: (have: number, learning: number, notYet: number) =>
    `the skills you added now read ${have} have, ${learning} learning, ${notYet} not yet`,
  job: (label: string | null) => (label === null ? "no job is picked now" : `your pick of job is now ${quoted(label)}`),
  jobSkills: (label: string, have: number, learning: number, notYet: number, notMarked: number) =>
    `the government's list for ${quoted(label)} now reads ${have} have, ${learning} learning, ${notYet} not yet, ${notMarked} not marked`,
  officialFees: (cents: number, lines: number) =>
    lines === 0
      ? "no official fee is counted now"
      : `the official fees now add up to ${formatMoney(cents)} across ${count(lines, "line", "lines")}`,
  onlyIfFees: (lines: number) =>
    lines === 0
      ? "no official fee that applies only sometimes is on your path now"
      : `${count(lines, "official fee applies", "official fees apply")} only sometimes and ${lines === 1 ? "is" : "are"} not added up`,
  yourNumbers: (cents: number, lines: number) =>
    lines === 0
      ? "none of your own numbers is counted now"
      : `your own numbers now add up to ${formatMoney(cents)} across ${count(lines, "line", "lines")}`,
  notPriced: (n: number) =>
    n === 0 ? "no cost line is waiting for your number now" : `${count(n, "cost line is", "cost lines are")} not priced yet`,
  waitingOnFork: (n: number, fork: string) =>
    n === 0
      ? `no cost line waits on a pick at ${quoted(fork)} now`
      : `${count(n, "cost line", "cost lines")} ${n === 1 ? "waits" : "wait"} on a pick at ${quoted(fork)}`,
  leftOut: (n: number) =>
    n === 0
      ? "no cost line is left out for being off your path now"
      : `${count(n, "cost line is", "cost lines are")} left out of the sums because ${n === 1 ? "its step is" : "their steps are"} not on your path`,
  savings: (cents: number | null) =>
    cents === null ? "no savings number is given now" : `your savings for starting now read ${formatMoney(cents)}`,
  difference: (cents: number | null) =>
    cents === null
      ? "there is no difference to show now"
      : `your savings minus the official fees and your own numbers is now ${formatMoney(cents)}`,
  date: (month: string | null, months: number | null) =>
    month === null || months === null ? "no date of yours is set now" : `your date now reads ${formatMonth(month)}, ${monthsFromToday(months)}`,
  target: (cents: number | null) =>
    cents === null ? "no yearly income target is set now" : `your target now reads ${formatMoney(cents)} a year, before tax`,
  cardsNow: (n: number, state: "green" | "yellow" | "gray") =>
    state === "green"
      ? `${count(n, "rules and tax card", "rules and tax cards")} now ${n === 1 ? "applies" : "apply"}`
      : state === "yellow"
        ? `${count(n, "rules and tax card", "rules and tax cards")} now ${n === 1 ? "says" : "say"} check first`
        : `${count(n, "rules and tax card is", "rules and tax cards are")} now not on your path`,
  cardsGone: (n: number) => `${count(n, "rules and tax card", "rules and tax cards")} no longer ${n === 1 ? "shows" : "show"}`,
};

/** Calendar months between this month and the person's month, in words: never a forecast, only arithmetic. */
export function monthsFromToday(months: number): string {
  if (months === 0) return "this month";
  return months > 0 ? `${count(months, "month", "months")} from today` : `${count(-months, "month", "months")} ago`;
}

/** One receipt line: the answers that changed, then the change, as a sentence. */
export function receiptLine(answers: string | null, change: string): string {
  const text = answers ? `Because ${answers}, ${change}` : change;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
