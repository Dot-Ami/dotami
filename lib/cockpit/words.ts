import { formatMoney, formatMonth } from "@/lib/format/money-and-months";
import { monthsFromToday } from "@/lib/roads/words";

/**
 * Every sentence the cockpit screen shows, in one file (the maintainer's decision of 2026-10-11: new
 * screens keep their words in one place). Amounts and months go through lib/format/money-and-months.ts.
 * Road evaluation's own sentences (a step's reason, the answers) stay in lib/roads/words.ts and reach the
 * screen as road evaluation wrote them.
 *
 * Counts and sums only: nothing here says a number is enough, a step is ready or what the person should
 * do (docs/architecture/future-cockpit.md § 4). tests/cockpit-screen.spec.ts runs every sentence past the
 * same verdict words road evaluation's are checked against.
 */

const quoted = (label: string) => `“${label}”`;
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const cockpitWords = {
  goal: {
    region: "Your goal and gauges",
    yourWords: (day: string) => `your words · ${day}`,
    target: (cents: number, day: string) => `Your target: ${formatMoney(cents)} a year, before tax (yours, agreed ${day})`,
    future: (roadLabel: string) => `Future: ${roadLabel}`,
    /** A road written for other places than the idea's: it is the map drawn, not the person's future. */
    drawnOnly: (roadLabel: string, roadPlaces: readonly string[], ideaPlace: string) =>
      `Map drawn: ${roadLabel} · written for ${roadPlaces.join(", ")}; this idea is in ${ideaPlace}`,
  },

  gauges: {
    steps: {
      label: "Steps",
      tag: "count",
      value: (done: number, total: number) => `${done} of ${total} marked done`,
      doing: (n: number) => `${n} doing`,
      next: (label: string) => `next on your road: ${quoted(label)}`,
      noneNext: "no step on your path is waiting",
    },
    skills: {
      label: "Skills",
      tag: "your marks",
      value: (have: number, learning: number, notYet: number) => `${have} have · ${learning} learning · ${notYet} not yet`,
      notMarked: (n: number, listed: number) => `${n} not marked, out of ${listed} listed`,
      invite: "Mark them to see what each step still needs",
      noneListed: "No skills are listed on this road yet",
      own: (have: number, learning: number, notYet: number) => `your own skills: ${have} have · ${learning} learning · ${notYet} not yet`,
      addOwn: "Add skills of your own in the list",
    },
    money: {
      label: "Start-up money",
      tag: "yours + cited",
      // Each part with its lines; a part with no lines is never shown as $0.
      fees: (cents: number, lines: number) => `${formatMoney(cents)} official fees (${count(lines, "line", "lines")})`,
      yours: (cents: number, lines: number) => `${formatMoney(cents)} your numbers (${count(lines, "line", "lines")})`,
      yoursNone: "your numbers: not given yet",
      noLines: "No cost lines on this road yet",
      onlyIf: (n: number) => `${count(n, "official fee applies", "official fees apply")} only sometimes, not added up`,
      notPriced: (n: number) => `${n} not priced yet`,
      leftOut: (n: number) => `${n} left out: not on your path`,
      waiting: (n: number, fork: string) => `${n} ${n === 1 ? "waits" : "wait"} on a pick at ${quoted(fork)}`,
      savings: (cents: number) => `savings ${formatMoney(cents)}`,
      noSavings: "savings: not given yet",
      difference: (cents: number) => `savings minus both: ${formatMoney(cents)}`,
      invite: "Add your savings in the list",
    },
    date: {
      label: "Your date",
      tag: "yours",
      value: (month: string) => formatMonth(month),
      months: (n: number) => monthsFromToday(n),
      notSet: "not set",
      invite: "Add your month and year to count the months to it",
    },
  },

  road: {
    overlays: "Overlays",
    road: "Road",
    alwaysOn: "always on",
    skills: "Skills",
    money: "Money",
    rules: "Rules & tax",
    skillsCount: (n: number) => `${n} listed`,
    moneyCount: (n: number) => count(n, "cost line", "cost lines"),
    rulesCount: (n: number) => count(n, "card", "cards"),
    needs: (listed: number, have: number) => `needs ${listed} · you have ${have}`,
    notPriced: (n: number) => `${n} not priced`,
    onlyIf: (n: number) => `${n} only sometimes, not added`,
    waitsOnPick: "waits on a pick",
    leftOut: "not counted: not on your path",
    forkSplits: "The road splits here: you choose",
    statusChip: { doing: "doing", done: "done", "not-for-me": "not for me" },
    /** In place of the colour's words on a card the person set aside: their choice, not the rules'. */
    setAside: "set aside by you",
    setAsideLegend: "not for me = set aside by you, not a reading of your answers",
  },

  next: {
    title: "Next on your road",
    note: "the order steps happen, not importance",
    none: "No step on your path is waiting.",
    item: (n: number, label: string) => `${n} · ${label}`,
  },

  panel: {
    region: "Step",
    whyColour: "Why this colour",
    fork: "The road splits here: you choose",
    forkPicked: (side: string) => `Your pick: ${quoted(side)}`,
    forkNotPicked: "No side picked yet",
    status: "Your status",
    statusHelp: "Press the one that is on to take it back.",
    statusButtons: { doing: "Doing", done: "Done", "not-for-me": "Not for me" },
    doneWhen: "Done when",
    doneWhenTicked: (ticked: number, total: number) => `${ticked} of ${total} ticked`,
    doneWhenNone: "No “done when” lines are written for this step yet.",
    skills: "Skills it needs",
    skillsNone: "No skills are listed for this step yet.",
    skillKind: { "legal-requirement": "legal requirement", "listed-skill": "listed skill" },
    marks: { have: "Have", learning: "Learning", "not-yet": "Not yet" },
    dontKnow: "I don't know",
    youHold: "you said you hold this",
    howToGet: "The official way to get it:",
    showSteps: (label: string) => `Show the steps that list ${quoted(label)}`,
    costs: "Costs",
    costsNone: "No cost lines are written for this step yet.",
    costKind: {
      "official-fee": "official fee · source and day read",
      "your-quote": "your quote · agreed",
      "named-not-priced": "not priced yet",
    },
    /** Under an official fee that applies only sometimes: its condition, and that no total adds it. */
    onlyIf: (condition: string) => `Only if: ${condition}. Not added to any total.`,
    addQuote: "Add your quote",
    changeQuote: "Change your number",
    costsLeftOut: "Not counted in the sums: this step is not on your path.",
    costsWaiting: (fork: string) => `Not counted yet: it waits on a pick at ${quoted(fork)}.`,
    notSaved: "This idea is not saved yet, so nothing here can be kept.",
    sources: (n: number) => `Sources for this step · ${n}`,
    officialLinks: "Official pages you open yourself",
  },

  amounts: {
    amount: "Amount",
    from: "Where it came from",
    next: "Next: agree",
    cancel: "Cancel",
    agreeFirst: "Nothing counts until you agree to it.",
    unreadable: "Write it like 12,500 or 12500.50.",
    negative: "This amount can't be below zero.",
  },

  lists: {
    close: "Close",
    skillsTitle: "Skills on this road",
    skillsNone: "No skills are listed on this road yet. Your own skills are below.",
    ownTitle: "Your own skills",
    ownTag: "added by you",
    ownNone: "None added yet.",
    addOwn: "Add a skill",
    ownBox: "A skill in your own words",
    addOwnAs: (mark: string) => `Add as ${mark}`,
    /** On a skill the person typed, the button that takes it away (the road's own skills say "I don't know"). */
    removeOwn: "Remove",
    moneyTitle: "Start-up money",
    moneyNone: "No cost lines on this road yet.",
    savingsTitle: "Your savings for starting",
    savingsNone: "Not given yet.",
    addSavings: "Add your savings",
    changeSavings: "Change your savings",
    dateTitle: "Your date",
    dateBox: "Month and year",
    dateHelp: "Only you set it. DotAmi counts the months to it and nothing else.",
    save: "Save",
    clear: "Clear",
  },

  /** The agree prompt's line under a start-up cost: which line on which step, and where the amount came from. */
  agreeNote: (line: string, step: string, from: string) => `${quoted(line)} on ${quoted(step)}, from ${from}`,
};
