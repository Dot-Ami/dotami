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
      // No span of time ("in a few years" until 2026-10-20): DotAmi writes no times at all.
      body: "Say where you want to be, in your own words, then look inside one business or career: its steps, the skills it lists and its official fees.",
      // True of this door only: its answers go to DotAmi's own server on this computer, never to a model.
      stays: "What you type here stays on this computer.",
      go: "Start here →",
    },
    idea: {
      title: "I already have an idea",
      body: "Describe it in a sentence, and DotAmi maps its tax and structure road.",
    },
    // Since 2026-10-13 (the maintainer's pick): Mara, the invented example future (lib/examples/mara.ts).
    example: {
      title: "Show me an example first",
      body: "Look inside a filled-in future for Mara, an invented apprentice cabinetmaker in Alberta on her way to her own shop. Her numbers are invented, and nothing in it is saved.",
      tag: "Invented example",
      go: "Show me Mara's example →",
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
    // A road written for all of Canada ("CA") is counted apart from the place's own, so the receipt agrees
    // with the federal card's "<place>'s own steps aren't written yet" (pickWords.federalOnly).
    futuresForCanadaOnly: (canada: number, name: string) =>
      `${plural(canada, "future listed is", "futures listed are")} written for all of Canada; none is written for ${name} yet.`,
    futuresForPlaceAndCanada: (own: number, canada: number, name: string) =>
      `${plural(own, "future listed is", "futures listed are")} written for ${name}, and ${canada} for all of Canada.`,
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
  // Outside Alberta (docs/ui-spec/futures/04-outside-alberta.md, task 28d): the futures written for all of
  // Canada first, then the ones written for Alberta, folded behind one button.
  canadaHeading: "Written for all of Canada",
  albertaHeading: "Written for Alberta",
  /** On the federal road's card: the person's own province's steps aren't on it, and where its pages show. */
  federalOnly: (province: string) =>
    `The federal steps only. ${province}'s own steps aren't written yet; a step shows ${/^[AEIOU]/.test(province) ? "an" : "a"} ${province} page only where a federal step cites one.`,
  showAlberta: (n: number) => (n === 1 ? "Show the 1 future written for Alberta" : `Show the ${n} futures written for Alberta`),
  hideAlberta: "Hide the futures written for Alberta",
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
    /**
     * Outside Alberta the note opens the federal steps, written for all of Canada (the maintainer's call 33 of
     * 2026-10-22), so its three lines name them in place of the general road.
     */
    federal: {
      hint: "Say what you'd look into, in your own words. It is kept as one of your statements, and the federal steps open.",
      button: "Keep my note and look inside the federal steps",
      keptNotOpened: "Your note is kept. The federal steps couldn't be opened: no database reachable.",
    },
  },
  // Step 3 of the three steps (docs/ui-spec/futures/03-road-match.md, 2026-10-22).
  stepCount: "3 of 3 · Pick a future",
  pickLine: (job: string, code: string) => `Your pick of job: ${job} · ${code}`,
  pickTag: "your pick of job",
  backToRegion: "← Back to your region",
  backToWhere: "← Back to where you are",
  backToWork: "← Back to your work",
  writtenForJobHeading: "Written for your pick of job",
  othersHeading: "The other futures, in the order they were written",
  writtenForJob: (job: string, noc: string) => `Written for ${job} (${noc}).`,
  noRoad: {
    /**
     * Outside Alberta the folded Alberta futures can include one written for this job (its card says so), so the
     * heading names the person's own place: no road is written for the job *there* yet.
     */
    heading: (job: string, code: string, outsidePlace?: string) =>
      outsidePlace ? `No road is written for ${job} (${code}) in ${outsidePlace} yet.` : `No road is written for ${job} (${code}) yet.`,
    // The design's body opens with "Here is what the government publishes about this job.": since task 28c it opens
    // About this job's rows, in place under the body, and is drawn only with them.
    governmentLead: "Here is what the government publishes about this job.",
    /**
     * What the list right below holds. In Alberta the general road; outside Alberta (task 28d) the federal steps,
     * written for all of Canada, with Alberta's futures folded under them, so the line names those instead. It says
     * only the federal steps aren't written for the job: a folded Alberta future may be, and its card says so.
     */
    body: (job: string, outsideAlberta: boolean) =>
      outsideAlberta
        ? `If you plan to run a business of your own, the federal steps below are written for all of Canada, not for ${job}. The futures written for Alberta are folded below them, and each card says what it's written for. Opening a future doesn't say you're starting a business.`
        : `If you plan to run a business of your own, the general road below covers the tax and structure steps for any business in Alberta. It isn't written for ${job}, and opening it doesn't say you're starting a business.`,
    nothingSaved: "Nothing is saved until you open a future. If you leave from here, DotAmi keeps nothing about this job.",
    // About this job's rows in place (task 28c): while they're read on DotAmi's own server, and if they can't be.
    // Said, never left blank, and nothing drawn in their place.
    aboutJobReading: (job: string) => `Reading what the government publishes about ${job}…`,
    aboutJobFailed: (job: string) => `What the government publishes about ${job} couldn't be read: DotAmi's own server didn't answer.`,
  },
  road0NotForJob: (job: string) => `Not written for ${job}. It covers the tax and structure steps for any business in Alberta.`,
  /** After Skip. Outside Alberta the futures are grouped (the federal steps, then Alberta's folded), so the line says so. */
  skipped: (outsideAlberta: boolean) =>
    outsideAlberta
      ? "You didn't pick a job, so no future is matched to one. These are all the futures written so far: the federal steps, written for all of Canada, then the futures written for Alberta, folded below. Each group is in the order it was written."
      : "You didn't pick a job, so no future is matched to one. These are all the futures written so far, in the order they were written.",
  skippedNoneFor: "None is written yet for closing, pausing or selling a business, or for catching up on filings. Not here yet? keeps your note.",
} as const;

/**
 * Step 1 of the three steps: What's closest to your work? (docs/ui-spec/futures/01-whats-closest-to-your-work.md),
 * the same words on Pick a future, at the end of the intake and in the cockpit's skills list (one picker).
 */
export const jobStepWords = {
  stepCount: "1 of 3 · Your work",
  heading: "What's closest to your work?",
  lead: "Type the work in your own words. DotAmi looks for them in the government's example job titles and lists the jobs that hold them. Nothing is picked until you click a job.",
  yourIdea: (sentence: string) => `Your idea, in your words: “${sentence}”`,
  boxLabel: "The work, in your own words",
  boxHint: "A word or two works, such as “barber” or “cake decorating”.",
  skip: "Skip this question",
  skipHint: "Skipping picks no job. The futures are then listed with no job to match them to.",
  empty: "Type a word or two about the work. The jobs whose titles hold your words show here.",
  tooShort: "Type at least 3 letters.",
  searching: "Looking in the government's example titles…",
  searchFailed: "The search couldn't run: DotAmi's own server didn't answer. Try again, or skip this question.",
  status: (n: number, all: number, allButOne: number, some: number) =>
    `${plural(n, "job holds", "jobs hold")} your words: ${all} all of them, ${allButOne} all but one, ${some} at least one.`,
  statusWithList: (n: number, all: number, allButOne: number, some: number, list: number) =>
    `${plural(n, "job", "jobs")} found: ${all} whose titles hold all your words, ${allButOne} all but one, ${some} at least one, and ${list} only through DotAmi's word list.`,
  groupAll: "Jobs whose example titles have all your words",
  groupOne: "Jobs whose example titles have your word",
  groupAllButOne: "Jobs whose example titles have all but one of your words",
  groupSome: "Jobs whose example titles have at least one of your words",
  groupList: "Jobs found only through DotAmi's word list, not by a government title",
  groupCount: (heading: string, n: number) => `${heading}, ${n}`,
  groupOrder: "In the government's code order, not ranked.",
  showGroup: (n: number) => `Show the ${n} jobs whose example titles have all but one of your words`,
  showGroupSome: (n: number) => `Show the ${n} jobs whose example titles have at least one of your words`,
  showGroupList: (n: number) => `Show the ${n} jobs found only through DotAmi's word list`,
  hideGroup: (n: number) => `Hide these ${n} jobs`,
  capped: (shown: number, total: number) => `Showing the first ${shown} of ${total} in this group, in code order. Add a word to narrow it.`,
  result: (job: string, code: string) => `${job} · ${code}`,
  pickName: (job: string, code: string) => `Pick ${job}, ${code}`,
  matched: (title: string) => `Matched the government's example title “${title}”`,
  // A match on the job's own name or a typed code: said as what it is, never as an example title.
  matchedName: (title: string) => `Matched the job's name “${title}”`,
  matchedCode: (code: string) => `Matched the job's code ${code}`,
  matchedMore: (n: number) => `and ${n} more of its titles`,
  listChip: "DotAmi's word list",
  viaList: (word: string, listWord: string) =>
    `Your word “${word}” was matched through DotAmi's own word list (“${listWord}”), not by a government title.`,
  leftOut: (words: string) =>
    `Not searched: ${words}. Each is on DotAmi's list of filler words or of words that name a business rather than the work.`,
  wordStart: "A word matches a title word that starts with the same five letters, so “plumbing” finds “plumber”.",
  noMatch: (words: string) =>
    `No government example title holds any of these words: ${words}. Try another word for the same work, or skip this question.`,
  // Every word typed was left out (the "Only left-out words" state): nothing was looked for, so nothing is said
  // about the government's titles.
  nothingSearched: "Nothing was searched, so no job is listed. Try a word for the work itself, or skip this question.",
  englishOnly: "Titles are searched in English in this version.",
  picked: (job: string, code: string) => `Your pick of job: ${job} · ${code}`,
  changePick: "← Change your pick of job",
  source: "Job titles: OaSIS 2025 Version 1.0, Employment and Social Development Canada.",
  licence: "The licence",
  notKept: "The words you type here aren't kept. Only the job you pick is, once you open a future.",
} as const;

/**
 * Step 2 of the three steps: Where you are (docs/ui-spec/futures/02-where-you-are.md): the area, then the
 * economic region, in Alberta only for now; elsewhere one short screen that says why nothing is asked.
 */
export const whereStepWords = {
  stepCount: "2 of 3 · Where you are",
  heading: "Where you are in Alberta",
  picked: (job: string, code: string) => `Your pick of job: ${job} · ${code}`,
  area: {
    label: "Which area are you in?",
    why: "Kept with this future for the official counts of businesses by area, which aren't in this version. Until then nothing reads it.",
    hint: "The four areas are Statistics Canada's census metropolitan areas: a city and the towns around it.",
    choose: "Choose one",
    calgary: "Calgary",
    edmonton: "Edmonton",
    lethbridge: "Lethbridge",
    redDeer: "Red Deer",
    elsewhere: "Somewhere else in Alberta",
    dontKnow: "I don't know",
    next: "Next →",
    shownBack: (area: string) => `Your area: ${area}`,
    notAnswered: "not answered",
    back: "← Back to your area",
  },
  region: {
    label: "Which region are you in?",
    why: "Job Bank publishes wages by economic region, a larger map than a city's area. DotAmi doesn't work your region out from your area: the Edmonton area reaches into two regions, and “Somewhere else in Alberta” could be any of them.",
    order: "Listed in Statistics Canada's code order.",
    choose: "Choose one",
    dontKnow: "I don't know",
    // Brought back word for word (task 28h): About this job reads the region kept here, and shows Alberta's own row
    // for "I don't know".
    dontKnowNote: "With “I don't know”, About this job shows the Alberta-wide figure, and a link to Statistics Canada's list of the towns in each region shows here.",
    lookup: "Which towns are in each region? Statistics Canada's list ↗",
    lookupName: "Which towns are in each region? Statistics Canada's list, opens outside DotAmi",
    next: "Next: the futures →",
  },
  outside: {
    heading: (province: string) => `Where you are in ${province}`,
    notAsked: (province: string) =>
      `In this version DotAmi asks which area and which region you're in only in Alberta, so nothing is asked here for ${province}.`,
    why: "Job Bank publishes wages by economic region. DotAmi lists a province's regions only once its list has been checked against Statistics Canada's own pages, and Alberta's is the one checked so far.",
    // Brought back word for word (task 28h): About this job shows the place's own row outside Alberta.
    wageRow: (place: string) =>
      `About this job shows the wage row Job Bank gives for ${place} as a whole, labelled with the level the government's own code gives it.`,
    next: "Next: the futures →",
  },
  // Brought back word for word (task 28h): About this job's Change sets the region from the cockpit.
  kept: "Both answers are kept with this future once you open it, on this computer only. You can change your region later from About this job in the cockpit.",
} as const;

/** The intake's Screen B button, which opens the three steps on the intake page (2026-10-22, the maintainer's call 1). */
export const intakeStepsWords = {
  next: "Next: the work closest to yours →",
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
