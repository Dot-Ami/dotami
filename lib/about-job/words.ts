/**
 * Every sentence of *About this job*, the cockpit panel of docs/ui-spec/cockpit/about-this-job.md (task 25h;
 * docs/architecture/research-kit.md § 4.2): the government's "Employment requirements" for the person's picked
 * job, quoted word for word as its words; the wages Job Bank publishes for the job group, each labelled with
 * the level its own source code gives; a plain line saying business counts aren't in this version; and the
 * general pages to look the job up yourself.
 *
 * The words are the spec's words block, word for word, with each `<placeholder>` a function's argument. They
 * name no trade (the panel is the same for every job) and say nothing about whether a job fits the person.
 * tests/about-job.spec.ts runs every sentence past the verdict words and the time words, and checks the lead
 * line keeps the shape the screen checks lift the quoted lines by (tests/helpers/official-quotes.ts).
 */

export const aboutJobWords = {
  /** The panel's name (its region, its heading, its folded strip) and the Look closer item that opens it. */
  region: "About this job",
  menuItem: "About this job",
  close: "Close",
  /** "Cabinetmakers · 72311.00 · your pick of job". */
  kicker: (job: string, code: string) => `${job} · ${code} · your pick of job`,

  rules: {
    heading: "Employment requirements",
    /**
     * Says whose words follow. Its shape is what the screen checks lift the quoted lines by
     * (tests/helpers/official-quotes.ts, the kind's `label`): keep it word for word.
     */
    lead: (noc: string, groupTitle: string) => `The government's words, quoted in full for job group ${noc} ${groupTitle}:`,
    groupNote: "The group holds more than one job, so some lines are about the others.",
    /** On a phone, the quote folds after five lines. */
    showAll: (n: number) => `Show all ${n} lines of the government's text`,
    source: (day: string) => `Statistics Canada, National Occupational Classification 2021 Version 1.0, Employment requirements, read ${day}.`,
    /** A job whose group the elements file has no lines for: said, never left blank. */
    none: (noc: string) => `The National Occupational Classification file has no Employment requirements lines for job group ${noc}.`,
  },

  wages: {
    heading: "Wages published for this job group",
    levelRegion: (region: string) => `Economic region: ${region}`,
    levelProvince: (province: string) => `${province}-wide figure`,
    levelCanada: "Canada-wide figure",
    levelSmallArea: (region: string) => `Small-area estimate, ${region}`,
    levelNotStated: "Level not stated",
    hourly: (low: string, median: string, high: string) => `Hourly · low ${low} · median ${median} · high ${high}`,
    yearly: (low: string, median: string, high: string) => `Yearly · low ${low} · median ${median} · high ${high}`,
    /** Where the file leaves one figure of a row empty. */
    figureNotPublished: "not published",
    /**
     * Beside a row whose published levels are the same (Ontario bakers: low $17.60, median $17.60), so the
     * repeat reads as the file's own figures and not a mistake (pre-release fix, 2026-10-23).
     */
    sameAsPublished: (levels: string) => `${levels} the same, as published`,
    /** The levels' names in that line, joined "low and median", or "low, median and high". */
    levelNames: { low: "low", median: "median", high: "high" },
    and: "and",
    period: (period: string, method: string) => `Reference period ${period} · ${method}`,
    /** A row whose file gives no method: the period alone. */
    periodOnly: (period: string) => `Reference period ${period}`,
    lowHigh: "Low is in most cases the 10th percentile and high the 90th, as Job Bank's method page says.",
    notYours: "What workers in this job group were paid. Not what a shop earns, and not what you would earn.",
    yourRegion: (region: string) => `Your region: ${region} (your pick)`,
    dontKnow: "You said you don't know your region.",
    notPicked: "Your region isn't picked.",
    outsideAlberta: (place: string) =>
      `DotAmi asks your region only in Alberta for now, so this is the row the wage file gives for ${place} as a whole, with the level its own code gives it.`,
    /**
     * The region's Change, which opens the region drop-down in place (Alberta only; in the cockpit's panel, task
     * 28h): it keeps the answer in `Venture.economicRegion` with its day. Drawn at the wages row's end, so its name
     * says what it changes (the spec's words block has "Change"; on its own there it would read as changing the row).
     */
    changeName: "Change your region",
    /** Under the region drop-down Change opens: keep the answer picked, or close it with nothing changed. */
    changeKeep: "Keep this answer",
    changeCancel: "Cancel",
    changeFailed: "Not kept: no database reachable. Your region is as it was.",
    /** "an Alberta-wide figure", as the spec's example reads (its words block writes "a <province>-wide"). */
    shownUnder: (region: string, province: string) =>
      `Shown under ${region}, but the government's code for this row says it is ${/^[AEIOU]/.test(province) ? "an" : "a"} ${province}-wide figure.`,
    notPublished: (region: string) => `Not published for ${region}.`,
    govNote: (comment: string) => `The government's note: “${comment}”`,
    pointsTo: "The row that note points to:",
    /** The file holds no row at all for the job group in the place: said, never another place's row. */
    noRow: (noc: string, place: string) => `The wage file has no row for job group ${noc} in ${place}.`,
    source: "Job Bank wage file 2025, revised 2025-11-19.",
  },

  counts: {
    heading: "Business counts",
    notInVersion:
      "Not in this version. DotAmi doesn't show how many businesses work in this line yet; the official counts by area come with a later version.",
    yourArea: (area: string) => `Your area: ${area} (your pick). Nothing reads it yet.`,
    areaNotPicked: "Your area isn't picked.",
  },

  links: {
    heading: "Where to look yourself",
    copy: "Search with this job's name and code:",
    /** The text to copy: "Cabinetmakers · 72311.00 · NOC 72311". */
    copyText: (job: string, code: string, noc: string) => `${job} · ${code} · NOC ${noc}`,
    jobBank: "Job Bank: Search wages ↗",
    bizpal: "BizPaL: business permits and licences ↗",
    tradesecrets: "Alberta Tradesecrets: trade profiles ↗",
    /** A link's name for a screen reader: its label, then where it opens. */
    opensInBrowser: (label: string) => `${label.replace(/ ↗$/, "")}, opens in your browser`,
    notAlberta: (province: string) => `Tradesecrets is Alberta's trade list, so it isn't listed for ${province}.`,
    note: "Each opens in your browser at the site's own page. The links carry nothing about you or this job.",
  },

  footer: "What the government publishes about this job, side by side. Nothing here says whether it fits you.",
} as const;
