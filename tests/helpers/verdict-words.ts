import { withoutLabelledQuotes, type QuotedSourceId } from "./official-quotes";

/**
 * The verdict words, in one place (CLAUDE.md: "Information and options, never a verdict"; the app never
 * says "you should", never ranks options by what it thinks matters to the person).
 *
 * Two lists, because they guard two different kinds of text:
 *
 * - `VERDICT_WORDS` is for DotAmi's own sentences, the words files (lib/cockpit/words.ts,
 *   lib/roads/words.ts, lib/front-door/words.ts and the like). Those are short and written by the
 *   project, so the list is strict: single words such as "should", "best" or "ready" are enough to
 *   fail. The unit tests that run every sentence of a words file import it from here.
 * - `VERDICT_PHRASES` is for the whole visible text of a screen, as a person sees it in the browser
 *   (e2e/no-verdict.spec.ts). A screen also shows catalog prose and cited official pages, which use
 *   ordinary words like "should" or "best" in sentences that are not DotAmi's advice ("the best form of
 *   business" inside a quoted government sentence). So this list is phrases that only read as a verdict
 *   or a ranking: "you should", "we recommend", "best option", "top pick", "#1".
 *
 * `OFFICIAL_QUOTE_ALLOWANCES` lists the only places a phrase may appear on a screen: word-for-word
 * quotes of an official page that a citation carries, shown as that page's words, never as DotAmi's.
 * Each says why it is allowed. tests/verdict-words.spec.ts checks each one is still a quote of a
 * citation in the catalogs (so a stale allowance can't sit here unnoticed), and that no other quote in
 * the catalogs needs one. An allowance with a `sourceKind` is a line of official text quoted by kind
 * (the government's requirement lines on About this job), allowed only under that kind's label; the
 * importer that ships those lines (28a) is where its word-for-word check belongs.
 */

/** Single words that make one of DotAmi's own sentences a verdict (the widest list the words files were checked against). */
export const VERDICT_WORDS = /\b(enough|ready|best|better|worse|should|recommend\w*|on track|behind|score)\b/i;

/**
 * Phrases that read as advice or a ranking anywhere on a screen. They are matched against the text with
 * every run of spaces and line breaks made one space and curly apostrophes made straight (see `normalise`),
 * so they are written with single spaces and "'".
 *
 * "Recommend", "suggest" and "advise" count when DotAmi is made to say them (we, I, DotAmi, our, or no one
 * named, as in "Highly recommend this road"). A recommendation named as someone else's stays allowed: the
 * apprentice road says "alberta.ca highly recommends legal advice", the province's advice reported as the
 * province's, and the licence note says "nothing in DotAmi suggests the government endorses it".
 */
export const VERDICT_PHRASES: readonly { phrase: string; pattern: RegExp }[] = [
  { phrase: "you should", pattern: /\byou should(?:n't)?\b/i },
  { phrase: "you ought to", pattern: /\byou ought to\b/i },
  { phrase: "you'd better", pattern: /\byou(?:'d| had) better\b/i },
  {
    phrase: "we recommend",
    pattern: /(?<!\bnothing in )\b(?:we|I|DotAmi)(?:'d| would)?(?: highly| strongly)? (?:recommends?|suggests?|advises?)\b/i,
  },
  // With no one named: "Highly recommend this road". Not "recommends", which names its speaker before it.
  { phrase: "highly recommend", pattern: /\b(?:highly|strongly) (?:recommend|suggest|advise)\b/i },
  { phrase: "suggested", pattern: /\b(?:suggested|advised) (?:future|road|path|option|choice|step|pick|structure)s?\b/i },
  { phrase: "recommended", pattern: /\brecommended\b/i },
  {
    phrase: "our recommendation",
    pattern: /\b(?:our|DotAmi's|my)(?: \w+)? (?:recommendation|suggestion|advice|pick|choice)s?\b/i,
  },
  { phrase: "best option", pattern: /\bbest (?:option|choice|path|road|future|pick|fit|bet|way|move|route)s?\b/i },
  { phrase: "best for you", pattern: /\b(?:best|ideal|perfect|made) for you\b/i },
  {
    phrase: "the right choice",
    pattern: /\b(?:right|smartest|wisest|safest|obvious|ideal|perfect) (?:choice|option|path|road|future|pick|move)s?\b/i,
  },
  { phrase: "top pick", pattern: /\btop (?:pick|choice|option)s?\b/i },
  // Singular only: a rank is "first choice". "first choices" turns up where a label ending in "first" meets
  // a "Choices" label below it (Settings), which the joined-up spacing would otherwise read as one phrase.
  { phrase: "first choice", pattern: /\b(?:first|1st) (?:choice|pick)\b/i },
  // "#1" as a rank. Not "issue #1"-style references, which a screen doesn't show; a rank badge is "#1" on its own.
  { phrase: "#1", pattern: /(?:^|[^\w&])#1(?!\d)/ },
  { phrase: "no. 1", pattern: /\bno\. ?1(?!\d)/i },
  { phrase: "number one", pattern: /\bnumber (?:one|1)\b/i },
  { phrase: "ranked first", pattern: /\branked (?:first|1st|highest|top)\b/i },
  { phrase: "top-rated", pattern: /\b(?:top|highest|best)[- ](?:rated|ranked)\b/i },
  { phrase: "most popular", pattern: /\bmost popular\b/i },
  // A market judged, not described (docs/architecture/competitive-landscape.md § 6, 2026-10-17): DotAmi shows
  // what is there and never says whether a line of work has space for the person.
  { phrase: "crowded", pattern: /\b(?:over)?crowded\b/i },
  { phrase: "saturated", pattern: /\b(?:over)?saturated\b/i },
  { phrase: "room for you", pattern: /\broom for (?:you|me|one more|another)\b/i },
];

/**
 * The words "Others in this line of work" never uses in its own sentences (docs/architecture/competitive-landscape.md
 * § 6): a market judged ("crowded", "saturated", "room for you", "opportunity", "gap"), a share or a measure per
 * head ("market share", "per person"), or a rank ("top", "best-rated"). Checked over lib/landscape/words.ts by
 * tests/landscape-words.spec.ts. The first three are verdict phrases above too, so e2e/no-verdict.spec.ts catches
 * them on any screen; the others are ordinary words elsewhere ("top" of a page, a "gap" in a road), so they are
 * checked over the panel's own words only. Whole words: "stop", "laptop" and "gaps" don't match.
 */
export const LANDSCAPE_WORDS =
  /\b(crowded|saturated|room for you|opportunit(?:y|ies)|gap|market share|per person|top|best[- ]rated)\b/i;

/** One space for every run of spaces and line breaks, and straight apostrophes, so a phrase split by layout still matches. */
const normalise = (text: string) => text.replace(/[‘’]/g, "'").replace(/\s+/g, " ");

/** The ways a source's quote is shown on a screen: inside curly quote marks (or straight ones). */
const QUOTE_MARKS: readonly [string, string][] = [
  ["“", "”"],
  ['"', '"'],
];

/** A sentence of an official page, quoted by a citation, that holds a verdict phrase in the page's own voice. */
export interface OfficialQuoteAllowance {
  /** The quote, word for word as the citation carries it. */
  text: string;
  /** Where the citation is, so a reader can check it. */
  where: string;
  /** Why it may show on a screen. */
  why: string;
  /**
   * Set for a line of official text quoted by source kind (tests/helpers/official-quotes.ts), not by a
   * catalog's citation: then the line is taken out only where it stands in quote marks inside a run that opens
   * with that kind's label, never on its own in quote marks elsewhere.
   */
  sourceKind?: QuotedSourceId;
}

export const OFFICIAL_QUOTE_ALLOWANCES: readonly OfficialQuoteAllowance[] = [
  {
    text: "This step is recommended, but not mandatory.",
    where: "Alberta's Register a business name page, quoted on the Business Name Report line of both Alberta roads (lib/engines/roads/v2026/)",
    why: "The province's own words about its own optional step, shown under the step's sources as the page's quote. DotAmi's line beside it says only that the report is optional.",
  },
  {
    text: "If you need help deciding if a sole proprietorship, partnership or corporation is the best form of business, we highly recommended you get legal advice.",
    where: "Alberta's Register a business name page, quoted on the apprentice road's Open your own shop step (lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts)",
    why: "The province pointing people to a lawyer, in its own words (its grammar kept as written). It is the opposite of DotAmi choosing for the person, and it is shown as the page's quote.",
  },
  {
    // The one line of the 2,122 that `findVerdicts` catches (docs/ui-spec/cockpit/about-this-job.md, "How the
    // quoted lines pass the screen checks", run on 2026-10-20 over the copy of 2026-10-15). The file ends the line
    // with a space, which the screen trims.
    text: "A background combining athletic training and college or university studies is strongly recommended.",
    where: "NOC 2021 Version 1.0 elements file, group 53200 Athletes, Employment requirements: quoted on About this job's first row (task 25h)",
    why: "The government's own requirement line for the job group, quoted in full under the label that says it is the government's words. Nothing is reworded or left out of the quote, and DotAmi says nothing about it.",
    sourceKind: "noc-employment-requirements",
  },
];

/** The allowances quoted by source kind, by kind, as normalised words. */
const bySourceKind = new Map<QuotedSourceId, Set<string>>();
for (const allowance of OFFICIAL_QUOTE_ALLOWANCES) {
  if (!allowance.sourceKind) continue;
  const words = bySourceKind.get(allowance.sourceKind) ?? new Set<string>();
  words.add(normalise(allowance.text).trim());
  bySourceKind.set(allowance.sourceKind, words);
}

/**
 * The verdict phrases in a text, once the allowed official quotes are taken out of it. An allowance is
 * taken out only where it stands inside quote marks, as a source's quote is shown; the same words written
 * as a line of DotAmi's own, unquoted, are still caught. An allowance with a source kind is taken out only
 * inside that kind's labelled run (tests/helpers/official-quotes.ts); every other line of the run is still
 * read, so the label lets nothing else through.
 */
export function findVerdicts(text: string): string[] {
  let rest = withoutLabelledQuotes(text, (quote) => bySourceKind.get(quote.kind)?.has(quote.text.trim()) ?? false);
  for (const allowance of OFFICIAL_QUOTE_ALLOWANCES) {
    if (allowance.sourceKind) continue;
    const words = normalise(allowance.text);
    for (const [open, close] of QUOTE_MARKS) rest = rest.split(`${open}${words}${close}`).join(" ");
  }
  const found: string[] = [];
  for (const { phrase, pattern } of VERDICT_PHRASES) {
    const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    for (const match of rest.matchAll(global)) {
      // The words around it, so a failure says where it was.
      const at = match.index ?? 0;
      found.push(`${phrase}: “…${rest.slice(Math.max(0, at - 60), at + match[0].length + 60).replace(/\s+/g, " ").trim()}…”`);
    }
  }
  return found;
}

/**
 * The invented example's own list (docs/ui-spec/example/_index.md): words that would turn the example's
 * information into a verdict or an unsourced judgement. Shared by the unit test (tests/example-sources.spec.ts,
 * over the words, the data and the example's components) and the browser test (e2e/example-future.spec.ts,
 * over the rendered banner, goal bar, what-if bar and panel), so the two never drift apart.
 *
 * Widened 2026-10-14 after review: "great value, a must-have" and "our top choice" passed the first list.
 * Bare "pick" and "must" are left out on purpose: the cockpit says "Mara's pick of job" and a statistic says
 * an apprentice "must be paid", neither a verdict. tests/example-sources.spec.ts has a control for every
 * word here, and one for each ordinary phrase that must not match.
 */
export const VERDICT =
  /\b(recommend\w*|best|should|must[- ]have|must[- ]buy|top (pick|choice)|our (pick|choice)|ideal|go-to|worth (it|buying|the money|every)|essential|(great|good) value|value for money|ranked|ranking|winner|favou?rite|core)\b/i;

/**
 * Framing that presents a pick made for the example as what the trade or every shop uses. The tools and
 * software listed are a pick for this example; the sources name more (2026-10-14, after review).
 */
export const FRAMING = /\b(the trade's own list|a small (professional )?shop (buys|uses))\b/i;
