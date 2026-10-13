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

/** How to remove what stays: statements go all at once (lib/privacy/inventory.ts), the income with its own box. */
const DELETE_ON_YOUR_DATA = "Delete on What DotAmi knows about you";

export const destinationWords = {
  /** The page's one level 1 heading, for a screen reader: the nav already says it on screen. */
  pageHeading: "Your destination",
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
    // The goal bar shows the destination only on an idea with no first sentence of its own, which is what
    // Pick a future saves; an idea described on the front door shows its own (components/cockpit/goal-bar.tsx).
    destinationKept: (day: string) =>
      `Kept word for word, dated ${day}. It goes at the top of each future you pick on Pick a future; an idea you describe in your own sentence shows that sentence instead.`,
    destinationTabOnly: "Not kept: no database reachable. It stays in this tab only.",
    destinationDontKnow: "Nothing kept. You can say it later; nothing here waits on it.",
    // "I don't know yet" deletes nothing: statements are never edited away one by one.
    destinationStillKept: (day: string) =>
      `Nothing new kept. Your words of ${day} are still kept and still show on top of your futures; ${DELETE_ON_YOUR_DATA} removes them, with all your statements.`,
    lookingForSome: (n: number, total: number, choice: keyof typeof LOOKING_FOR_WHAT) =>
      `Of the ${plural(total, "future", "futures")} listed, ${n} ${n === 1 ? "includes" : "include"} ${LOOKING_FOR_WHAT[choice]}.`,
    lookingForAll: (total: number) =>
      total === 1 ? "The 1 future listed is shown." : `All ${total} futures listed are shown.`,
    placeWritten: (name: string) => `${name}'s rules and the federal rules apply.`,
    placeFederalOnly: (name: string) =>
      `The federal rules apply; ${name}'s own rules aren't written yet.`,
    futuresFor: (n: number, name: string) =>
      n === 0
        ? `No future listed is written for ${name} yet: the ones shown are written for other places, and each says which.`
        : `${plural(n, "future listed is", "futures listed are")} written for ${name}.`,
    incomeAgreed: (cents: number, day: string) =>
      `Your target: ${formatMoney(cents)} a year, before tax, agreed ${day}. Nothing compares it with anything.`,
    // Turning it down keeps the row, marked discarded (lib/futures/person-figures.ts), so it is never "not kept".
    incomeTurnedDown: `Turned down. It stays in your data file, marked turned down and shown nowhere, until ${DELETE_ON_YOUR_DATA} removes it.`,
    incomeSkipped: "Not given. Nothing here waits on it.",
    incomeStillStands: (cents: number, day: string) =>
      `Your target of ${formatMoney(cents)}, agreed ${day}, still stands; ${DELETE_ON_YOUR_DATA} removes it.`,
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
    // The note went in before the road was saved: say so, so it isn't kept twice by pressing again.
    keptNotOpened: "Your note is kept. The general road couldn't be opened: no database reachable.",
  },
} as const;

export const incomePromptWords = {
  title: "Agree to this number?",
  intro: "Nothing counts until you agree.",
  row: (day: string) => `The yearly income you want, before tax · typed by you · ${day}`,
  amountLabel: "Amount, in dollars a year",
  changes:
    "It shows as your target at the top of each future you open. Nothing compares it with anything.",
  // The number is the person's own: the figures prompt's line is about work DotAmi did, and it did none here.
  checkFirst: "Double-check the number you typed before you agree.",
  turnDown: "No, I'll do it myself",
  agree: "Agree",
  close: "Close",
} as const;
