import { formatMoney } from "@/lib/format/money-and-months";

/**
 * Every sentence the way in writes (the front door's doors, *Your destination*, *Pick a future* and the
 * income's agree prompt), in one file: the maintainer's decision of 2026-10-11, new screens keep their
 * words in one place. The four questions' own words are in lib/front-door/questions.ts, since the
 * questions are data. Amounts go through lib/format/money-and-months.ts, the one formatter.
 *
 * Counts and facts only: nothing here judges a future or an answer, and nothing says what the person
 * should do (tests/front-door.spec.ts runs every sentence past the cockpit's list of verdict words).
 */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const frontDoorWords = {
  headline: "See the road to the work and life you want.",
  subline: "Every step, skill and start-up cost, with its sources.",
  doorsLabel: "Three ways in",
  doors: {
    dream: {
      title: "Start from where I want to be",
      body: "Say where you want to be in a few years, in your own words, then look inside one business or career: its steps, the skills it lists and its official fees.",
      // True of this door only: its answers go to DotAmi's own server on this computer, never to a model.
      stays: "What you type here stays on this computer.",
      go: "Start here →",
    },
    idea: {
      title: "I already have an idea",
      body: "Describe it in a sentence, and DotAmi maps its tax and structure road.",
    },
    example: {
      title: "Show me an example first",
      body: "Coming: a filled-in future for an invented person, clearly labelled. It isn't written yet.",
      tag: "Not written yet",
    },
  },
  nav: { futures: "Your futures →", cockpit: "Open cockpit →", settings: "Settings" },
} as const;

/** What a future includes, for the receipt to question 2. */
const LOOKING_FOR_WHAT = { business: "a business of your own", career: "a job or career" } as const;

export const destinationWords = {
  back: "← Back",
  navLabel: (n: number, total: number) => `Your destination · question ${n} of ${total}`,
  allAnswered: (total: number) => `Your destination · ${total} of ${total} answered`,
  why: (text: string) => `Why we ask: ${text}`,
  unlocks: (text: string) => `What it unlocks: ${text}`,
  keepWords: "Keep my words",
  choosePlace: "Choose…",
  usePlace: "Use this place",
  keepAmount: "Keep it",
  perYear: "a year, before tax",
  change: "Change",
  next: "Pick a future →",
  saving: "Keeping…",
  yourWords: (day: string) => `your words · ${day}`,
  answeredPlace: (name: string) => name,
  answeredAmount: (cents: number) => `${formatMoney(cents)} a year, before tax`,
  skipped: "Skipped",
  receipts: {
    destinationKept: (day: string) => `Kept word for word, dated ${day}. It goes at the top of each future you open.`,
    destinationTabOnly: "Not kept: no database reachable. It stays in this tab only.",
    destinationDontKnow: "Nothing kept. You can say it later; nothing here waits on it.",
    lookingForSome: (n: number, total: number, choice: keyof typeof LOOKING_FOR_WHAT) =>
      `${n} of the ${plural(total, "written future", "written futures")} include ${LOOKING_FOR_WHAT[choice]}.`,
    lookingForAll: (total: number) => `All ${plural(total, "written future is", "written futures are")} shown.`,
    placeWritten: (name: string) => `${name}'s rules and the federal rules apply.`,
    placeFederalOnly: (name: string) => `The federal rules apply; ${name}'s own rules aren't written yet.`,
    futuresFor: (n: number, name: string) =>
      n === 0
        ? `No future is written for ${name} yet: the ones shown are written for other places, and each says which.`
        : `${plural(n, "future is", "futures are")} written for ${name}.`,
    incomeAgreed: (cents: number, day: string) =>
      `Your target: ${formatMoney(cents)} a year, before tax, agreed ${day}. Nothing compares it with anything.`,
    incomeTurnedDown: "Not kept.",
    incomeSkipped: "Not given. Nothing here waits on it.",
  },
} as const;

export const pickWords = {
  back: "← Your destination",
  navLabel: "Pick a future",
  heading: "Pick a future to look inside",
  order: "In the order they were written, not ranked. More futures are being written.",
  listLabel: "Written futures",
  kind: { business: "A business", career: "A career", both: "A career and a business" },
  writtenFor: (names: string) => `Written for ${names}.`,
  allOfCanada: "all of Canada",
  youSaid: (name: string) => `You said ${name}.`,
  counts: (steps: number, skills: number, fees: number, lines: number) =>
    [
      plural(steps, "step", "steps"),
      plural(skills, "skill listed", "skills listed"),
      plural(fees, "official fee found", "official fees found"),
      plural(lines, "cost line you'd price", "cost lines you'd price"),
    ].join(" · "),
  sourcesLead: "Sources:",
  sources: {
    person: (n: number) => `${n} read by a person`,
    unrecorded: (n: number) => `${n} read, who read ${n === 1 ? "it" : "them"} wasn't recorded`,
    model: (n: number) => `${n} read by an AI model only, not read by a person yet`,
    tool: (n: number) => `${n} checked by a tool only, not read by a person yet`,
  },
  nameIt: "Name it (optional)",
  nameHint: "Left empty, it is named after the future you pick.",
  lookInside: "Look inside →",
  lookInsideName: (label: string) => `Look inside ${label}`,
  opening: "Opening…",
  saveFailed: "Not saved: no database reachable. Nothing was opened.",
  noPlace: "Say which province or territory you're in first.",
  noPlaceLink: "Your destination",
  notHere: {
    label: "Not here yet?",
    hint: "Say what you'd look into, in your own words. It is kept as one of your statements, and the general road opens.",
    button: "Keep my note and look inside the general road",
  },
} as const;

export const incomePromptWords = {
  title: "Agree to this number?",
  intro: "Nothing counts until you agree.",
  row: (day: string) => `The yearly income you want, before tax · typed by you · ${day}`,
  amountLabel: "Amount, in dollars a year",
  changes: "It shows as your target at the top of each future you open. Nothing compares it with anything.",
  turnDown: "No, I'll do it myself",
  agree: "Agree",
  close: "Close",
} as const;
