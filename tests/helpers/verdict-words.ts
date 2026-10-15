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
 * the catalogs needs one.
 */

/** Single words that make one of DotAmi's own sentences a verdict (the widest list the words files were checked against). */
export const VERDICT_WORDS = /\b(enough|ready|best|better|worse|should|recommend\w*|on track|behind|score)\b/i;

/** Phrases that read as advice or a ranking anywhere on a screen. */
export const VERDICT_PHRASES: readonly { phrase: string; pattern: RegExp }[] = [
  { phrase: "you should", pattern: /\byou should\b/i },
  { phrase: "you ought to", pattern: /\byou ought to\b/i },
  { phrase: "we recommend", pattern: /\bwe (?:highly |strongly )?recommend/i },
  { phrase: "we suggest", pattern: /\bwe suggest\b/i },
  { phrase: "recommended", pattern: /\brecommended\b/i },
  { phrase: "our recommendation", pattern: /\b(?:our|DotAmi's) recommendation\b/i },
  { phrase: "best option", pattern: /\bbest (?:option|choice|path|road|future|pick)s?\b/i },
  { phrase: "best for you", pattern: /\bbest for you\b/i },
  { phrase: "the right choice", pattern: /\bthe right (?:choice|option|path|road|future)\b/i },
  { phrase: "top pick", pattern: /\btop (?:pick|choice|option)s?\b/i },
  { phrase: "our pick", pattern: /\bour pick\b/i },
  // "#1" as a rank. Not "issue #1"-style references, which a screen doesn't show; a rank badge is "#1" on its own.
  { phrase: "#1", pattern: /(?:^|[^\w&])#1(?!\d)/ },
  { phrase: "number one", pattern: /\bnumber one\b/i },
  { phrase: "ranked first", pattern: /\branked (?:first|1st|highest|top)\b/i },
];

/** A sentence of an official page, quoted by a citation, that holds a verdict phrase in the page's own voice. */
export interface OfficialQuoteAllowance {
  /** The quote, word for word as the citation carries it. */
  text: string;
  /** Where the citation is, so a reader can check it. */
  where: string;
  /** Why it may show on a screen. */
  why: string;
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
];

/** The verdict phrases in a text, once the allowed official quotes are taken out of it. */
export function findVerdicts(text: string): string[] {
  let rest = text;
  for (const allowance of OFFICIAL_QUOTE_ALLOWANCES) rest = rest.split(allowance.text).join(" ");
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
