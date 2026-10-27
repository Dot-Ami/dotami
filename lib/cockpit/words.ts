import { OASIS_ATTRIBUTION } from "@/lib/engines/oasis/v2026/licence";
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
  /** An answer the idea was saved without (a future picked on Pick a future): never shown as a value. */
  notSaid: "Not said",
  /** The rail's link to every saved idea, named as the header's back link is. */
  allFutures: "Your futures",
  goal: {
    region: "Your goal and gauges",
    yourWords: (day: string) => `your words · ${day}`,
    /** An idea with no first sentence (picked on Pick a future) shows the person's newest destination instead. */
    destination: (day: string) => `where you want to be · your words · ${day}`,
    target: (cents: number, day: string) => `Your target: ${formatMoney(cents)} a year, before tax (yours, agreed ${day})`,
    future: (roadLabel: string) => `Future: ${roadLabel}`,
    /** A road written for other places than the idea's: it is the map drawn, not the person's future. */
    drawnOnly: (roadLabel: string, roadPlaces: readonly string[], ideaPlace: string) =>
      `Map drawn: ${roadLabel} · written for ${roadPlaces.join(", ")}; this idea is in ${ideaPlace}`,
    /**
     * A road written for all of Canada, on an idea whose province has no road of its own (task 28d): its
     * steps are the federal ones, and the province's own aren't written yet. Of steps only, never of rules:
     * the rules and tax cards still pick the province's own entries where the catalogs carry them.
     */
    federal: (roadLabel: string, province: string) => `Future: ${roadLabel} · ${province}'s own steps aren't written yet`,
    /**
     * After Look inside (docs/ui-spec/futures/03-road-match.md, task 28c): whether the road opened is written for
     * the person's pick of job, joined to *Future: <road>* with " · ".
     */
    forJob: "written for your pick of job",
    notForJob: (job: string) => `not written for your pick of job, ${job}`,
    /** An idea kept with no road (typed before the three steps, and every idea from before roads): drawn on the general road, said why. */
    savedBeforeRoads: (roadLabel: string) =>
      `Map drawn: ${roadLabel} · the general road, because this idea was saved before a road was picked for it`,
    /**
     * The goal bar's one menu for the things it can open in the right-hand panel (the calm first view,
     * 2026-10-17): Compare (where a fork's own pick moves steps), Others in this line of work, and later
     * About this job. Their own words stay with them (compare.region, lib/landscape/words.ts).
     */
    lookCloser: "Look closer",
  },

  /**
   * The first visit's one coach line (future-cockpit.md § 2, "First visit and return visits"), in the
   * design's words; put away, it doesn't come back.
   */
  coach: {
    region: "A first look",
    line: "Start anywhere. Each thing you tell us lights up part of the road. Click anything to see where it comes from.",
    dismiss: "Got it",
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
      /**
       * The road's legal requirements (an ID number, an agreement, a certificate), counted apart from its skills
       * (the screen review of 2026-10-23: road 1's three read as "3 listed" skills). Only the marks that have a
       * count are named.
       */
      requirements: (listed: number, have: number, learning: number, notYet: number, notMarked: number) =>
        `${count(listed, "legal requirement", "legal requirements")}, apart from skills: ${[
          ...(have > 0 ? [`${have} have`] : []),
          ...(learning > 0 ? [`${learning} learning`] : []),
          ...(notYet > 0 ? [`${notYet} not yet`] : []),
          ...(notMarked > 0 ? [`${notMarked} not marked`] : []),
        ].join(" · ")}`,
      /** The road lists skills, but the road drawn for the idea's place left every one out (lib/cockpit/view.ts `roadSkillsNone`). */
      noneListedForPlace: "This road's skills rest on other provinces' pages",
      /** The same for its legal requirements, a line of their own (`roadRequirementsNone`; road 1's, seen from Ontario). */
      requirementsNoneForPlace: "This road's legal requirements rest on other provinces' pages",
      own: (have: number, learning: number, notYet: number) => `your own skills: ${have} have · ${learning} learning · ${notYet} not yet`,
      addOwn: "Add skills of your own in the list",
      /** The government's list for the person's pick of job, counted apart from the road's. */
      job: (have: number, learning: number, notYet: number, listed: number) =>
        `your pick of job: ${have} have · ${learning} learning · ${notYet} not yet, of ${listed} listed`,
    },
    money: {
      label: "Start-up money",
      tag: "yours + cited",
      // Each part with its lines; a part with no lines is never shown as $0.
      fees: (cents: number, lines: number) => `${formatMoney(cents)} official fees (${count(lines, "line", "lines")})`,
      yours: (cents: number, lines: number) => `${formatMoney(cents)} your numbers (${count(lines, "line", "lines")})`,
      yoursNone: "your numbers: not given yet",
      /**
       * Every number the person agreed is on a line the road drawn for the idea's place leaves out (another province's
       * page): given, kept and named in the told list, counted in no sum (lib/cockpit/view.ts `gaugeView`).
       */
      yoursNoneForPlace: "your numbers: none counted for your place",
      notCountedForPlace: (n: number) => `${n} of your numbers kept, not counted for your place`,
      noLines: "No cost lines on this road yet",
      onlyIf: (n: number) => `${count(n, "official fee applies", "official fees apply")} only sometimes, not added up`,
      notPriced: (n: number) => `${n} not priced yet`,
      leftOut: (n: number) => `${n} left out: not on your path`,
      // The official fees among the waiting lines are named with their sum (pre-release fix, 2026-10-23): none is
      // added to the total above. Where both endings carry the same waiting fees (the apprentice road today), the
      // total plus them is what Compare shows for an ending; where the endings carry different fees it adds both
      // sides' fees, more than any one ending reaches (a review of 2026-10-24).
      waiting: (n: number, fork: string, feeCents = 0, feeLines = 0) =>
        `${n} ${n === 1 ? "waits" : "wait"} on a pick at ${quoted(fork)}` +
        (feeLines > 0 ? `, ${count(feeLines, "official fee", "official fees")} among them (${formatMoney(feeCents)})` : ""),
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
    /** The Skills switch: the road's skills, and its legal requirements apart from them when it has any. */
    skillsCount: (skills: number, requirements: number) =>
      requirements === 0 ? `${skills} listed` : `${skills} listed · ${count(requirements, "legal requirement", "legal requirements")}`,
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
    // A section the road drawn for the idea's place left empty says why (lib/cockpit/view.ts `emptySectionLine`).
    doneWhenNoneForPlace: "This step's “done when” lines rest on other provinces' pages, so none is shown for your place.",
    /** The step's legal requirements (an ID number, an agreement), above its skills (2026-10-23). */
    whatItNeeds: "What it needs",
    skills: "Skills it needs",
    skillsNone: "No skills are listed for this step yet.",
    skillsNoneForPlace: "The skills this step lists rest on other provinces' pages, so none is shown for your place.",
    // Under What it needs, drawn for a step whose every legal requirement the place left out (`stepRequirementsNone`).
    requirementsNoneForPlace: "The legal requirements this step lists rest on other provinces' pages, so none is shown for your place.",
    skillKind: { "legal-requirement": "legal requirement", "listed-skill": "listed skill" },
    marks: { have: "Have", learning: "Learning", "not-yet": "Not yet" },
    dontKnow: "I don't know",
    youHold: "you said you hold this",
    howToGet: "The official way to get it:",
    showSteps: (label: string) => `Show the steps that list ${quoted(label)}`,
    costs: "Costs",
    costsNone: "No cost lines are written for this step yet.",
    costsNoneForPlace: "This step's cost lines rest on other provinces' pages, so none is shown for your place.",
    costKind: {
      "official-fee": "official fee · source and day read",
      "your-quote": "your quote · agreed",
      "named-not-priced": "not priced yet",
    },
    /**
     * Under an official fee that applies only sometimes: its condition, and that no total adds it. A
     * catalog's condition may already end its sentence ("…choose to rewrite it."), so a full stop is added
     * only when it doesn't: no step panel, money list or printed plan reads "rewrite it.. Not added".
     */
    onlyIf: (condition: string) => `Only if: ${/[.!?…]$/.test(condition) ? condition : `${condition}.`} Not added to any total.`,
    addQuote: "Add your quote",
    changeQuote: "Change your number",
    costsLeftOut: "Not counted in the sums: this step is not on your path.",
    costsWaiting: (fork: string) => `Not counted yet: it waits on a pick at ${quoted(fork)}.`,
    notSaved: "This idea is not saved yet, so nothing here can be kept.",
    sources: (n: number) => `Sources for this step · ${n}`,
    /** Under a step's sources: other provinces' pages it didn't draw (task 28d; on every road since a-call-12, 2026-10-23). */
    sourcesOtherProvinces: (n: number) =>
      n === 1 ? "1 source for other provinces isn't shown." : `${n} sources for other provinces aren't shown.`,
    officialLinks: "Official pages you open yourself",
    /** Under a step's own skills: the job's list is the job's, never tied to a step. */
    jobLine: (label: string, listed: number, marked: number) =>
      `Your pick of job, ${quoted(label)}: ${listed} on the government's list, ${marked} marked. The list is for the job, not for this step.`,
    openJobList: "Open the list",
    noJob: "Pick the job closest to your work to see the government's skills list for it.",
    pickJob: "Pick a job",
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
    /** Since 2026-10-23 the list names legal requirements too, under a heading of their own, never as skills. */
    skillsTitle: "Skills and legal requirements",
    /** Above the legal requirements the road's own steps list (an ID number, an agreement, a certificate). */
    requirementsTitle: "Legal requirements on this road's steps",
    /** Above the skills the road's own steps list, so the job's list below never reads as the road's. */
    roadTitle: "Skills on this road's steps",
    /** Your plan's one list of everything the road's steps list, each row tagged with its kind. */
    roadItemsTitle: "On this road's steps",
    skillsNone: "No skills are listed on this road yet. Your own skills are below.",
    skillsNoneForPlace: "The skills this road lists rest on other provinces' pages, so none is shown for your place. Your own skills are below.",
    /** Under requirementsTitle when the place left every legal requirement out (`roadRequirementsNone`). */
    requirementsNoneForPlace: "The legal requirements this road lists rest on other provinces' pages, so none is shown for your place.",
    ownTitle: "Your own skills",
    ownTag: "added by you",
    ownNone: "None added yet.",
    addOwn: "Add a skill",
    ownBox: "A skill in your own words",
    addOwnAs: (mark: string) => `Add as ${mark}`,
    /** On a skill the person typed, the button that takes it away (the road's own skills say "I don't know"). */
    removeOwn: "Remove",
    /** The person's pick of job and the government's list for it (decision 5 of 2026-10-11). Names only. */
    job: {
      title: "Your pick of job",
      ask: "Pick the job closest to the work you'd do yourself",
      optional:
        "Optional. DotAmi then shows the government's skills list for that job, each item tagged “your pick of job”. Change it or take it back here any time.",
      // The search's own words are the first step's (lib/front-door/words.ts jobStepWords), since 2026-10-22:
      // the cockpit runs the same search as Pick a future, so there is one picker.
      /** The job once picked. */
      picked: (label: string, code: string, day: string | null) => `${label} · ${code}${day ? ` · picked ${day}` : ""}`,
      change: "Change",
      cancel: "Cancel",
      takeBack: "Take back",
      tag: "your pick of job",
      groups: { skills: "Skills", knowledge: "Knowledge" },
      // No claim about whom the list describes: the government's own profiles count self-employed people
      // in a job (Cabinetmakers, 72311.00: "Self-employed" under Workplaces/employers). Only what DotAmi
      // can say about itself.
      aboutTheList: "This is the government's list for the job you picked. DotAmi doesn't say which skills a business needs.",
      /**
       * The job's list folds under one button, below the road's own items (the screen review of 2026-10-23: its
       * 44 rows swamped the road's 3).
       */
      showList: (n: number) => `Show the ${n} on this job's list`,
      hideList: "Fold this job's list",
      /** The licence's own attribution line, word for word (lib/engines/oasis/v2026/licence.ts). */
      attribution: OASIS_ATTRIBUTION,
      licence: "The licence",
    },
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

  /**
   * Folding the regions, and the phone-width sheets (docs/architecture/future-cockpit.md § 2, "Folding
   * and phone width"). Each button says what it does: fold, or show again.
   */
  folds: {
    rail: { fold: "Fold venture details", show: "Show venture details" },
    goal: { fold: "Fold goal and gauges", show: "Show goal and gauges" },
    panel: { fold: "Fold the panel", show: (what: string) => `Show the panel: ${what}` },
    legend: { fold: "Fold the legend", show: "Show the legend", title: "Legend" },
    /** The what-if bar and "This visit" under the map (2026-10-13). */
    whatIf: { fold: "Fold the what-if bar", show: "Show the what-if bar" },
    /**
     * The road's later columns, folded on a first visit into one column that names them (the calm first view,
     * 2026-10-17): the folded column is the button that shows them.
     */
    roadAhead: {
      fold: "Fold the road ahead",
      show: "Show the road ahead",
      title: (steps: number) => `The road ahead · ${count(steps, "step", "steps")}`,
      columns: (labels: readonly string[]) => labels.join(" · "),
      /** The folded column's name for a screen reader: what it does, then what it holds. */
      showNamed: (labels: readonly string[], steps: number) =>
        `Show the road ahead: ${labels.join(" · ")} (${count(steps, "step", "steps")})`,
    },
    all: { fold: "Fold all panels", show: "Show all panels" },
    /** Below 768 px the rail is a sheet, opened from the header. */
    railSheet: { open: "Venture details", close: "Close venture details" },
    /** The road's own scrolling area, for a screen reader. */
    roadRegion: "The road",
    /** What the folded panel's strip names when it holds the export. */
    exportTitle: "Export",
  },

  /** The agree prompt's line under a start-up cost: which line on which step, and where the amount came from. */
  agreeNote: (line: string, step: string, from: string) => `${quoted(line)} on ${quoted(step)}, from ${from}`,

  // --- Part 2 (2026-10-12): the left list, receipts, the what-if bar and Compare.

  /** "What you've told DotAmi": every answer the person gave, dated, with what it unlocked. */
  told: {
    region: "What you've told DotAmi",
    count: (n: number) => `${count(n, "thing", "things")} you've told DotAmi`,
    none: "Nothing yet. Each answer you give shows here, with its day.",
    /** The intake's answers and road 0's map picks keep no day of their own; one is never borrowed. */
    dayNotKept: "day not kept",
    dayOnYourIdeas: "each figure's day is on Your futures",
    unlocked: "What it unlocked",
    nothingChanged: "Nothing on the road changes with or without it.",
    required: "The map needs this answer: it can be changed, not taken back.",
    figuresElsewhere: "Take these back with the idea's figures on Your futures.",
    noRoute: "This can't be taken back here yet.",
    change: "Change",
    takeBack: "Take back",
    // Each row's buttons named with the row for a screen reader, which otherwise hears "Take back" ten times.
    changeFor: (said: string) => `Change: ${said}`,
    takeBackFor: (said: string) => `Take back: ${said}`,
  },

  /** "Not told yet": each missing answer and the one thing it would unlock. */
  notTold: {
    region: "Not told yet",
    order: "In the order DotAmi asks them, not importance.",
    none: "Nothing missing that DotAmi asks here.",
    unlocks: (what: string) => `unlocks ${what}`,
    answer: "Answer",
    openSkills: "Open the skills list",
    openMoney: "Open the money list",
    compare: "Compare the endings",
    dontKnow: "I don't know",
    more: (n: number) => `${n} more`,
    fewer: "Show fewer",
    dontKnowFolded: (n: number) => `${n} you don't know yet`,
    showThem: "Show them",
    /** A question's button named with its question, for a screen reader. */
    forQuestion: (button: string, question: string) => `${button}: ${question}`,
  },

  /** Each question: what it asks, why it is asked, and the part of the screen the answer feeds. */
  questions: {
    date: {
      question: "By when? Your month and year",
      why: "Only you set it. DotAmi counts the months to it and nothing else.",
      unlocks: "the Your date gauge: the months from today to it",
    },
    savings: {
      question: "Savings you'd put toward starting",
      why: "So your own money sits beside the lines you priced. Nothing counts until you agree to it.",
      unlocks: "the savings and the difference in Start-up money",
    },
    costLines: {
      question: (n: number) => `Your numbers for ${count(n, "cost line", "cost lines")} not priced yet`,
      unlocks: "your numbers in Start-up money",
    },
    skills: {
      // Skills and legal requirements named apart, each only when one is waiting (2026-10-23).
      question: (skills: number, requirements: number) =>
        `Your marks on ${[
          ...(skills > 0 ? [count(skills, "skill", "skills")] : []),
          ...(requirements > 0 ? [count(requirements, "legal requirement", "legal requirements")] : []),
        ].join(" and ")} not marked`,
      unlocks: "needs · you have on each step that lists them",
    },
    ending: {
      question: (fork: string) => `Which ending at ${quoted(fork)}?`,
      unlocks: "the steps after it, and the cost lines waiting on it",
    },
    mapPick: {
      question: (fork: string) => `Your pick at ${quoted(fork)}`,
      why: "The map shows its default pick until you choose one.",
      unlocks: "the map reading your pick instead of its default",
    },
    structure: {
      question: "Your structure",
      why: "The map assumes a sole proprietorship until you set it.",
      unlocks: "the map reading your structure instead of the one it assumes",
      soleProp: "Sole prop",
      corporation: "Corporation",
    },
    equipment: {
      question: "Are you buying equipment, a vehicle or tools?",
      why: "Until you answer, the rules read it as no.",
      unlocks: "the rules reading your answer instead of no",
      yes: "Yes",
      no: "No",
    },
    // Asked on a road holding Incorporating while the idea has no third-year estimate (a future picked on
    // Pick a future keeps none): docs/ui-spec/cockpit/incorporating-estimate.md, 2026-10-21.
    salesYear3: {
      question: "Your third-year sales estimate",
      why: "Your own estimate. The Incorporating step compares it with the yearly sales at which you'd incorporate. DotAmi has no number of its own for this.",
      unlocks: "“Incorporating” able to light, once you also give the yearly sales at which you'd incorporate",
      box: "Dollars of sales in your third year",
    },
    incorporateAt: {
      question: "The yearly sales at which you'd incorporate",
      why: "DotAmi has no number of its own for this, so it waits for yours. It is compared with your third-year sales estimate.",
      // Asked only once the idea has a third-year sales estimate (lib/cockpit/told.ts notToldYet): the one
      // number the rule compares it with, so the line says so rather than promise a light it can't give.
      unlocks: (step: string) => `${quoted(step)} lighting once your third-year sales estimate reaches your own number`,
      box: "Dollars of yearly sales",
    },
    /** The box's own controls. */
    box: {
      save: "Save",
      dontKnow: "I don't know",
      month: "Month and year",
      wholeDollars: "Write a whole number of dollars, like 45000.",
      // The save's own cap on a sales number (SALES_DOLLARS_MAX, lib/db/scenario-state-json.ts).
      tooLarge: "DotAmi keeps numbers up to $1,000,000,000. Write a smaller one.",
      pickOne: "Pick one first.",
      monthNeeded: "Pick a month and year first.",
    },
  },

  /** Lines a step's own panel shows about the person's numbers it reads. */
  steps: {
    /** Above the Incorporating step's two boxes (docs/ui-spec/cockpit/incorporating-estimate.md, 2026-10-21). */
    incorporatingBoth: "This step lights when your third-year sales estimate reaches your own “I'd incorporate at” number. Both are yours.",
  },

  /** A receipt: what one answer changed, from two runs of the rules. */
  receipts: {
    region: "What changed",
    nothing: "Saved. Nothing on the road changed.",
    /** A take back that changed nothing on the road still says what was taken back. */
    nothingAfter: (what: string) => `Saved: ${what}. Nothing on the road changed.`,
    /** The idea's own answers wait for the map's save before their receipt is worked out. */
    saving: "Saving your answer…",
    /**
     * The answer is in the journey held in the window's memory (lib/journey/held-journey.ts), never its storage:
     * a fresh load empties it, the desktop app's Go menu among them (it opens its pages with loadURL). A new window
     * opens the idea as the data file holds it. "Your answer stays in this tab" until 2026-10-24.
     */
    notSaved:
      "Not saved yet: the save didn't go through. Only this window holds your answer: a reload or the desktop app's Go menu loses it. Save now tries again.",
    /**
     * This visit's newest receipt lines (2026-10-12, after review: named for what they hold; "Since last
     * time" is kept for the return visit's list, which isn't built).
     */
    thisVisit: "This visit",
    moreThisVisit: (n: number) => `${n} more this visit`,
    fewer: "Show fewer",
  },

  /** "Try first-year sales of $___": relights the rules for one run, never a figure. */
  whatIf: {
    region: "What-if",
    label: "Try first-year sales of $",
    try: "Try",
    banner: "Your what-if, not a forecast",
    on: (dollars: number) => `First-year sales of ${formatMoney(dollars * 100)}, for this look only`,
    keep: "Keep",
    keepHelp: "Keep makes it your first-year sales; Clear takes it off. Nothing is kept until you click Keep.",
    clear: "Clear",
    nothingChanged: "Nothing on the road changes with this what-if.",
  },

  /** Compare the two endings of a fork, side by side on the same rows. */
  compare: {
    region: "Compare the two endings",
    open: "Compare",
    openAtFork: "Compare the endings",
    whichFork: "Which fork",
    order: "In the order the road shows them.",
    yourPick: (side: string) => `Your pick: ${quoted(side)}`,
    mapDefault: (side: string) => `The map's default pick: ${quoted(side)}, not yours yet`,
    nonePicked: "No side picked yet.",
    noForks: "This road has no fork to compare.",
    thisIsMine: "This is mine",
    thisIsMineFor: (side: string) => `This is mine: ${side}`,
    /** On road 0, the map toggle's own short name for the same side. */
    onTheMap: (toggle: string) => `on the map: ${quoted(toggle)}`,
    noRowDiffers: "None of these rows differ between the two endings today.",
    rows: {
      "steps-on-path": "Steps on your path",
      "not-done": "Not marked done",
      "not-on-path": "Not on your path",
      skills: "Skills listed on your path",
      legal: "Legal requirements among them",
      fees: "Official fees",
      yours: "Your numbers",
      "not-priced": "Not priced yet",
      "only-if": "Official fees that apply only sometimes",
      cards: "Rules and tax cards",
    },
    skills: (have: number, learning: number, notYet: number, notMarked: number) =>
      `${have} have · ${learning} learning · ${notYet} not yet · ${notMarked} not marked`,
    money: (cents: number, lines: number) => `${formatMoney(cents)} (${count(lines, "line", "lines")})`,
    feesNone: "none",
    yoursNone: "not given yet",
    /** As the Start-up money gauge says it: the person's numbers are all on lines the idea's place leaves out. */
    yoursNoneForPlace: "none counted for your place",
    lines: (n: number) => count(n, "line", "lines"),
    onlyIf: (n: number) => (n === 0 ? "none" : `${count(n, "line", "lines")}, not added up`),
    cards: (apply: number, checkFirst: number) => `${apply} apply · ${checkFirst} check first`,
  },

  /**
   * The cockpit drawn read-only for an invented example person (docs/ui-spec/example/_index.md; since
   * 2026-10-13). The banner never folds; every control that would save says `cantKeep`.
   */
  example: {
    region: "Invented example",
    /**
     * Since 2026-10-14 (the maintainer's option A) the person is invented and the numbers are real: the
     * banner says both, and the day the sources were seen.
     */
    banner: (person: string, seenOn: string) =>
      `${person} is invented; the prices and statistics are real, from the sources listed, seen on ${seenOn}. Nothing here is saved.`,
    /** For an example whose numbers have no sources (none today): the banner Mara had until 2026-10-14. */
    bannerInvented: "Invented person, invented numbers, not real data. Nothing here is saved.",
    whose: (person: string) => `${person}'s example future: an invented person on a written road.`,
    cantKeep: "This is an example. Start your own to keep anything.",
    startOwn: "Start my own future →",
    back: "← Front door",
    /** The example person's own words, in the rail where a person's own statements would be. */
    theirWords: (person: string) => `In ${person}'s words`,
    /**
     * Said once in the banner and once over the story (2026-10-14, after review): the receipts and the
     * buttons are the same words every person's own cockpit uses, so their "you" means the example person.
     */
    youMeans: (person: string) => `Here, “you” and “your” mean ${person}, the invented person.`,
    /**
     * The labels that would otherwise call the example person's answers the viewer's own ("yours, agreed",
     * "your marks", "things you've told DotAmi"), with the example person's name instead.
     */
    theirs: {
      destination: (person: string, day: string) => `where ${person} wants to be · ${person}'s words · ${day}`,
      target: (person: string, cents: number, day: string) =>
        `${person}'s target: ${formatMoney(cents)} a year, before tax (${person}'s, agreed ${day})`,
      /** A target that is a published statistic: which one and when, in place of "agreed". */
      targetFrom: (person: string, cents: number, what: string, period: string) =>
        `${person}'s target: ${formatMoney(cents)} a year, before tax: ${what} (${period})`,
      tags: (person: string) => ({ steps: "count", skills: `${person}'s marks`, money: `${person}'s + cited`, date: `${person}'s` }),
      dateLabel: (person: string) => `${person}'s date`,
      numbers: (person: string, cents: number, lines: number) => `${formatMoney(cents)} ${person}'s numbers (${count(lines, "line", "lines")})`,
      numbersNone: (person: string) => `${person}'s numbers: not given yet`,
      numbersNoneForPlace: (person: string) => `${person}'s numbers: none counted for ${person}'s place`,
      notCountedForPlace: (person: string, n: number) => `${n} of ${person}'s numbers kept, not counted for ${person}'s place`,
      ownSkills: (person: string, have: number, learning: number, notYet: number) =>
        `${person}'s own skills: ${have} have · ${learning} learning · ${notYet} not yet`,
      job: (person: string, have: number, learning: number, notYet: number, listed: number) =>
        `${person}'s pick of job: ${have} have · ${learning} learning · ${notYet} not yet, of ${listed} listed`,
      toldRegion: (person: string) => `What ${person} told DotAmi`,
      toldCount: (person: string, n: number) => `${count(n, "thing", "things")} ${person} told DotAmi`,
    },
    story: {
      region: (person: string) => `What ${person} did`,
      note: "Each line is worked out by the rules: the road without the answer, compared with the road with it.",
      // By the person's name, not a pronoun: an example is any entry of lib/examples/, not Mara alone.
      parts: {
        // Her marks on skills and on legal requirements alike, so neither is called the other ("Mara's skill marks"
        // until the review of #209's merge, 2026-10-26).
        marks: (person: string) => `${person}'s marks`,
        costs: (person: string) => `${person}'s start-up cost, from listed prices`,
        savings: (person: string) => `${person}'s savings`,
        "this-is-mine": (person: string) => `${person}'s pick: This is mine`,
        "step-done": (person: string) => `The step ${person} marked done`,
        "what-if": (person: string) => `${person}'s what-if, kept nowhere`,
      },
    },
    /**
     * "Where these numbers come from" (2026-10-14; docs/ui-spec/example/_index.md): every number the
     * example shows, how it was worked out, each source with its link and the day it was seen. The tools
     * are information: twelve of the tools the trade's official descriptions name, picked for this example,
     * with what sellers charge; never ranked, never "buy this", never called the trade's whole list.
     */
    sources: {
      open: "Where these numbers come from",
      close: "Hide where these numbers come from",
      intro: (person: string, seenOn: string) =>
        `${person} is invented, and so are ${person}'s answers. Every price and statistic on this page is real: a price a Canadian seller listed, or a statistic a government or a market report published, each seen on ${seenOn}; the official fees are from DotAmi's own cited catalog. Every average is worked out by DotAmi from the prices listed here, never typed by hand.`,
      numbersHeading: (person: string) => `${person}'s numbers, and how each is worked out`,
      tools: (person: string, cents: number, n: number) =>
        `${person}'s number for “Woodworking machines and tools”: ${formatMoney(cents)}, the ${n} tools below added up, one of each at its average listed price (one bar clamp, though a glue-up needs several).`,
      income: (person: string, cents: number, what: string, period: string) =>
        `${person}'s yearly income goal: ${formatMoney(cents)}, ${what} (${period}), as the source prints it. What employees earn, not what a shop owner takes home.`,
      blank: (person: string) => `${person}'s savings and shop space deposit: not priced yet. Nothing real can supply them; the list at the end says why.`,
      /**
       * A statistic shown beside the example person's numbers for context, never as one of them (the
       * maintainer's pick A, 2026-10-15): ISED's average revenue, which was Mara's what-if until then. Said
       * as what it is: an average over existing businesses of every age, not a first-year figure.
       */
      contextHeading: (person: string) => `For context, not one of ${person}'s numbers`,
      context: (person: string, cents: number, what: string, period: string) =>
        `${formatMoney(cents)} a year: ${what} (${period}). An industry average over existing businesses of every age, not a first-year figure and not one of ${person}'s numbers.`,
      // No "you" here: the banner says "you" on this page means the example person, not the visitor.
      contextWhatIf: (person: string) =>
        `${person}'s example has no what-if: the what-if bar under the map starts empty, and a number tried there is for that look only, kept nowhere.`,
      /** "Picked for this example": the sources name more tools than are priced (2026-10-14, after review). */
      toolsHeading: (n: number) => `${n} of the tools the trade's official descriptions name, picked for this example, with average prices from Canadian sellers`,
      toolsOrder: "In the order the Alberta curriculum teaches them, not by price.",
      officialHeading: "The trade's official descriptions",
      average: (n: number, mean: number, median: number, low: number, high: number) =>
        `Average of ${n} listed prices: ${formatMoney(mean)} (median ${formatMoney(median)}; from ${formatMoney(low)} to ${formatMoney(high)})`,
      named: "Named in",
      price: (cents: number) => formatMoney(cents),
      seen: (day: string) => `seen ${day}`,
      page: "the page",
      caution: "Note:",
      softwareHeading: "Software listed for this example, with listed prices in Canadian dollars",
      softwareAverage: (n: number, mean: number, median: number, low: number, high: number) =>
        `Average of ${n} plans billed month to month: ${formatMoney(mean)} a month (median ${formatMoney(median)}; from ${formatMoney(low)} to ${formatMoney(high)})`,
      softwareNoPaid: "No paid plan here is listed in Canadian dollars; only the free tiers are shown.",
      per: {
        month: (cents: number) => `${formatMoney(cents)} a month`,
        "month-billed-yearly": (cents: number) => `${formatMoney(cents)} a month, billed yearly`,
        year: (cents: number) => `${formatMoney(cents)} a year`,
        free: "free",
      },
      groups: {
        earnings: "What cabinetmakers earn in Alberta",
        industry: "Small furniture and cabinet businesses in Canada",
        space: "Industrial space rents in Alberta, for context",
      },
      statistic: (value: string, unit: string, period: string) => `${value} ${unit} · ${period}`,
      notPricedHeading: "Not priced yet, and why",
      leftOutHeading: "Seen but not used, and why",
    },
  },

  /**
   * Your plan (2026-10-13, issue #41; docs/ui-spec/plan/_index.md): one idea's plan to read and print,
   * made from what DotAmi keeps. Where the cockpit already has the words (the goal bar's, the step
   * panel's, Compare's), the plan uses those; these are the plan's own.
   */
  plan: {
    title: "Your plan",
    /** The contents list of the plan's steps, at the top of Each step, each a link to its step (2026-10-23). */
    contents: "The steps in this plan",
    made: (day: string) => `Made on ${day} from what DotAmi keeps for this idea on this computer.`,
    /** The Export panel's way here, and what it says for an idea not saved yet. */
    open: "Open your plan to read or print",
    notSaved: "Save this idea first: the plan is made from what DotAmi keeps.",
    notFound: "DotAmi keeps no idea with this id on this computer.",
    /** The data file couldn't be read just now (locked, say): never said as "no such idea". */
    readFailed: "DotAmi couldn't read this idea from the data file just now; nothing was changed.",
    back: "← Back to the cockpit",
    print: "Print",
    printHelp: "Print opens your computer's print window, where you can also save it as a PDF.",
    sections: {
      // Neutral: the idea's own sentence isn't "where you want to be"; the line under each quote says which it is.
      words: "In your words",
      road: "The future and its ending",
      steps: "Each step",
      // It lists every item the road names, marked or not, legal requirements among them.
      skills: "Skills and requirements, with your marks",
      money: "Start-up money",
      told: "What you've told DotAmi",
      notAdvice: "What this plan is",
    },
    typedFor: (day: string) => `typed for this idea · ${day}`,
    /** The newest destination is the person's own, kept for no one idea, and its line says so. */
    destination: (day: string) => `where you want to be · your words, not tied to one idea · ${day}`,
    wordsNone: "No words of yours are kept for this idea.",
    roadChosen: (day: string | null) => (day ? `You picked this future on ${day}.` : "You picked this future."),
    roadDefault: "No future picked: this idea is drawn on the general road.",
    // Where you are, as picked on Pick a future's step 2 (2026-10-22): shown back, read by no rule.
    whereArea: (area: string, day: string | null) => `Your area: ${area}${day ? ` · picked ${day}` : ""}`,
    whereRegion: (region: string, day: string | null) => `Your economic region: ${region}${day ? ` · picked ${day}` : ""}`,
    ending: (fork: string, pick: string) => `${quoted(fork)}: ${pick}`,
    noForks: "This road has no fork.",
    gauges: "The four gauges",
    order: "In the order the road shows them, not importance.",
    status: (status: string) => `Your status: ${status}`,
    noStatus: "Your status: not set",
    /** A step's state in the map's own words. */
    state: { applies: "applies as answered", "check-first": "check first", "not-on-your-path": "not on your path" },
    doneWhen: (ticked: number, total: number) => `Done when (${ticked} of ${total} ticked)`,
    ticked: "ticked",
    notTicked: "not ticked",
    /** The box drawn before a done-when line, so a printed page shows which are ticked. */
    tickBox: { on: "☑", off: "☐" },
    costCount: (n: number) => `${count(n, "cost line", "cost lines")}, under Start-up money`,
    sources: "Sources",
    /** A person's mark on a skill, or none. */
    mark: { have: "have", learning: "learning", "not-yet": "not yet", none: "not marked" },
    ownNone: "None added.",
    job: (label: string, code: string, day: string | null) => `Your pick of job: ${label} · ${code}${day ? ` · picked ${day}` : ""}`,
    jobNotMarked: (n: number, listed: number) => `${n} not marked, of ${listed} on the government's list`,
    noJob: "No job picked for the government's skills list.",
    costKind: {
      "official-fee": "official fee",
      "your-quote": "your quote",
      "named-not-priced": "not priced yet",
    },
    quoteNote: (day: string | null, from: string) => `yours, agreed ${day ?? "(day not kept)"}, from ${from}`,
    notAdvice:
      "DotAmi is not legal or tax advice. This plan is a preparation tool for your accountant and lawyer: it shows what you told DotAmi and where each fact comes from, and it ranks nothing.",
  },

  /**
   * Export's markdown (lib/playbook/road-export.ts; pre-release fix of 2026-10-23): the road on screen, step by
   * step, in the plan's own words (`plan` above) with these few headings of its own.
   */
  exportDoc: {
    heading: (idea: string) => `${idea} — venture playbook`,
    title: (idea: string) => `${idea} — DotAmi playbook`,
    lead: "Planning information from the DotAmi catalog and the road on screen, not tax or legal advice.",
    profile: "Venture profile",
    officialLinks: "Official links",
    costs: "Cost lines",
    noAmount: "no amount yet",
    source: "Source",
    citations: "Citations",
    wordsFound: "Words found on the page",
    note: "Note",
    /** A road 0 step that is a stage of the tax map keeps the tax map's own fields under it. */
    catalog: "From the tax map's catalog",
    trigger: "Trigger",
    description: "Description",
    taxImpact: "Tax impact",
    lensTax: "Lens — tax",
    lensLegal: "Lens — legal",
    financialSummary: "Financial impact (summary)",
    projectionNotes: "Notes from the catalog",
  },

  /**
   * The left rail's own fields: the venture block, its structure and prep-tool sections, the save line and
   * its buttons, and the compass line at its foot (the rail as it stood since 2026-09-14, S2.5.4h; its
   * sentences moved here from the component on 2026-10-17, S2.5.30e, so the words tests read them).
   */
  rail: {
    /** A Year 1 / Year 3 sales target: no number is not given, never a $0 target (2026-10-12, after review). */
    salesTarget: (dollars: number) => (dollars > 0 ? formatMoney(dollars * 100) : "not given"),
    venture: "Venture",
    structure: "Structure",
    structureOptions: { notSet: "Not set", soleProp: "Sole prop", corporation: "Corporation" },
    structureAssumed: "Map assumes sole prop until you set it.",
    employed: "Employed",
    inYourWords: "In your words",
    /** The prep-tool references (lib/engines/templates/): shown once the structure is set, else the wait line. */
    prepTools: "Prep-tool references",
    prepToolsWait: "Appear once your structure is set.",
    prepToolsNote: "Orientation links for your accountant or lawyer — DotAmi does not generate legal documents.",
    openReference: "Open reference ↗",
    /** The structure ladder (lib/engines/structure/): where the idea's structure sits on it. */
    // In plain words since the screen review of 2026-10-23 ("Holding company (Holdco) … Estate freeze" on the
    // apprentice road), and drawn only on the tax and structure roads (lib/engines/roads/v2026
    // `drawsTheStructureLadder`). Each rung is named, never ranked. Since the review of #209's merge (2026-10-26) a
    // rung is its plain name only: the one-line definitions under them were tax and legal claims in DotAmi's own
    // words with no citation behind them ("A corporation, owned and controlled in Canada." for a CCPC was wrong).
    ladder: {
      title: "Ways a business can be set up",
      note: "From a business in your own name to companies that own companies, in Canada. Something to take to your accountant, not tax or legal advice.",
      noRung: "None is marked: once you say how the business is set up, it shows here.",
      /** Each rung of the catalog's ladder (lib/engines/structure/v2026/ladder.ts), by its id: its plain name. */
      rungs: {
        "structure-sole-prop": "In your own name",
        "structure-sole-prop-gst": "In your own name, registered for GST/HST",
        "structure-ccpc": "A company of its own",
        "structure-holdco": "A company that owns companies",
        "structure-family-trust": "A family trust",
      } as Record<string, string>,
      current: "Current",
      passed: "Passed",
      ahead: "Ahead",
    },
    /** The save line, always truthful about where the person's edits are (issue #1). */
    save: {
      now: "Save now",
      saving: "Saving…",
      unsaved: "Unsaved changes…",
      savedAt: (when: string) => `Saved · ${when}`,
      // Where the unsaved edits are, as receipts.notSaved says it ("kept in this tab" until 2026-10-24).
      unavailable: "Save unavailable — only this window holds it; a reload or the desktop app's Go menu loses it. Save now retries.",
      automatic: "Edits save automatically.",
    },
    editProfile: "Edit venture profile",
    /** The rail's foot: the lead in serif, then the rest. */
    compass: {
      lead: "Compass, not GPS.",
      rest: "Profile drives which surfaces appear on the map. DotAmi never files, predicts, or replaces an accountant.",
    },
  },

  /** The header's own two: the way back to every saved idea, and the export. */
  header: {
    back: "← Your futures",
    export: "Export",
  },

  /** While the cockpit's code loads. */
  loading: "Loading cockpit…",

  /**
   * The source label of a number typed in the cockpit (a quote, savings), as the figures list and *What
   * DotAmi knows about you* show it; the ideas page and the expenses page write the same words for theirs.
   */
  typedByYou: "typed by you",

  /** No venture saved and none in this session: the empty cockpit points at the intake. */
  empty: {
    back: "← Back",
    kicker: "Cockpit",
    title: "No venture on the map",
    /** The title's last word, in the accent colour. */
    titleEnd: "yet.",
    body: "The cockpit shows the venture you describe on the intake. Nothing here is a sample — it is empty until it is yours.",
    describe: "Describe a venture →",
  },

  /**
   * The map's own words (components/cockpit/strategy-map.tsx): the chips, the colours in words, each card's
   * accessible name and the legend. The recordings in tests/fixtures/strategy-map/ hold these word for word,
   * so a change here re-records the map, which tests/road-map.spec.ts never does on its own.
   */
  map: {
    /** The chip's words (lib/scenarios/graph.ts `stageChipFor` decides which; issue #5, 2026-10-11). */
    // Where the stage sits on the map, never the person's status (2026-10-23): "first stage" and "starting
    // point" were "now" and "done" until then, said of every idea whatever the person had told DotAmi.
    chips: {
      "first-stage": "first stage",
      "your-pick": "your pick",
      default: "default",
      "open-choice": "open choice",
      "starting-point": "starting point",
      ahead: "ahead",
      "not-on-your-path": "not on your path",
    },
    /** The chip on a step no rule reads yet: it claims neither a colour nor a place on the person's path. */
    noRule: "no rule yet",
    /** The left accent in words, so the colour is never the only way to tell (2026-10-11); the legend's words too. */
    colours: { green: "applies as answered", yellow: "check first", gray: "doesn't apply as answered" },
    tier: (n: number) => `Tier ${n}`,
    /** A stage card's accessible name: the step, its chip, its colour in words, its badges, and that it opens. */
    cardName: (step: string, chip: string, colour: string, badges: readonly string[]) =>
      `${step}, ${chip}, ${colour}, ${badges.map((b) => `${b}, `).join("")}opens detail`,
    cardNameNoRule: (step: string) => `${step}, no rule reads this step yet, shows where it leads`,
    /** A lever card: its state in a word, the one dated fact it carries, and its accessible name. */
    lever: {
      applies: "applies",
      /**
       * An item that has an end date (`UnlockItem.expires`), on its open row in node detail and on the intake's
       * preview, before `inUseBefore`: the legend's own words (`legend.checkFirst`). "Time-boxed" until 2026-10-24,
       * a time word of DotAmi's own written in the two components, where no words check read it.
       */
      endDate: "has an end date",
      /** The one dated fact the evaluator carries for an item: in use before the year it expires. */
      inUseBefore: (year: string) => `in use before ${year}`,
      name: (typeChip: string, title: string, state: string, fork: boolean, partial: boolean, fact: string | null) =>
        `${typeChip}: ${title}, ${state}${fork ? ", fork" : ""}${partial ? ", partial citation" : ""}${fact ? `, ${fact}` : ""}, opens detail`,
      fork: "· fork",
    },
    /** On a fork's toggle until the person picks: the active side is the map's default. */
    defaultNotPicked: "· default, not your pick yet",
    legend: {
      arrows: "Hover a card: arrows show where it leads — solid next, dashed further on",
      chip: "Stage chip = where it sits on the map; doing, done or not for me only when you mark it",
      // "time-boxed" until 2026-10-23: a time word of DotAmi's own. The items it means carry a date they end.
      checkFirst: "check first — confirm, has an end date, or one fork away",
      leftBar: "left bar = what your answers support",
      federalOnly: "federal rules only for this province",
    },
  },
};
