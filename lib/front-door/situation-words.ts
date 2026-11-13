/**
 * The person's own words about closing, pausing or selling a business, or about being behind on filings,
 * found in the sentence they typed on the front door (the maintainer's pick s1 D of 2026-11-11;
 * docs/ui-spec/futures/03-road-match.md, case D).
 *
 * Pick a future quotes them back, *You wrote “closing”.*, in front of the line that says no road is written
 * for those yet. That is all the words are used for: nothing is kept, no card moves, no road is picked or
 * hidden, and the screen never says what the person is doing, only what they wrote.
 *
 * The same care as the intake's keyword parser (lib/journey/intent-fallback.ts): missing a sentence is safe
 * (the person sees the screen as it was before), but quoting words that weren't about their own business
 * reads as DotAmi knowing something it was never told. So a word counts only with the words around it that
 * make it about a business or its filings: "closing my retail store", not "close to the GST line", "closing
 * our seed round" or "when the job is closed"; "behind on GST", not "behind on orders"; "winding down my
 * corporation", not "candles to wind down after work".
 *
 * English only, and only what the test ideas showed people write (tests/situation-words.spec.ts). An idea the
 * list misses is in the idea harness's known gaps, which only shrink.
 */

/** What a person calls the thing they run. Used as the object of closing, pausing, selling and so on. */
const BUSINESS =
  "business|company|corporation|corp|shop|store|practice|firm|restaurant|franchise|salon|agency|studio|farm|clinic|bakery|brewery|daycare|partnership|holdco|sole\\s+prop(?:rietorship)?";

/** Up to two describing words between "my" and the noun: "my small furniture shop", "the family business". */
const A_FEW_WORDS = "(?:[\\p{L}\\p{N}'’&-]+\\s+){0,2}";

/**
 * The noun must end its phrase, so it is the thing itself and not a describer of something else: "selling
 * the company I built", "close the agency properly", but not "selling my shop's leftovers" or "selling our
 * company merch".
 */
const ENDS_THE_PHRASE =
  "(?![’'])(?=\\s*$|\\s*[.,;:!?)]|\\s+(?:and|or|to|i|we|that|which|who|in|at|on|near|next|this|last|after|before|so|but|because|when|while|for|down|properly|soon|now|by)\\b)";

/** Things a person closes that aren't their business: the books, a deal, a funding round, an account. */
const CLOSED_BUT_NOT_A_BUSINESS =
  "books?|accounts?|deals?|sales?|round|funding|mortgage|purchase|offer|loop|gap|tabs?|positions?|trades?|eyes|year|month|quarter";

/** What a person is behind on, or hasn't done, when it is filings and not orders or rent. */
const FILINGS =
  "tax(?:es)?|tax\\s+returns?|gst|hst|pst|qst|filings?|returns?|payroll|remittances?|wcb|books|bookkeeping|everything|paperwork|t4s?|t2s?|t1s?|source\\s+deductions|instal?ments";

const HAVE_NOT = "(?:haven[’']?t|hasn[’']?t|have\\s+not|has\\s+not)";
const DID_NOT = "(?:didn[’']?t|did\\s+not)";

/**
 * Each rule's first group is what is quoted back; everything after it only decides whether the words count.
 * Written as text so the shared pieces above read once; `u` for the letters, `i` because people type any case.
 */
const RULES: readonly RegExp[] = [
  // Closing: "closing my retail store", "close the agency properly", "closed up shop".
  `\\b(clos(?:e|es|ing|ed)(?:\\s+down)?)\\s+(?:my|our)\\s+(?!${A_FEW_WORDS}(?:${CLOSED_BUT_NOT_A_BUSINESS})\\b)`,
  `\\b(clos(?:e|es|ing|ed)(?:\\s+down)?)\\s+the\\s+${A_FEW_WORDS}(?:${BUSINESS}|doors)${ENDS_THE_PHRASE}`,
  `\\b(clos(?:e|es|ing|ed)\\s+up\\s+shop)\\b`,
  // Shutting or winding down: with what is shut down named, or "it" ("I shut it down last year").
  `\\b(shut(?:s|ting)?\\s+down)\\s+(?:my|our|the)\\b`,
  `\\b(shut(?:s|ting)?\\s+it\\s+down)\\b`,
  `\\b(wind(?:s|ing)?\\s+down|wound\\s+down)\\s+(?:my|our|the|operations|production)\\b`,
  `\\b(wind(?:s|ing)?\\s+it\\s+down|wound\\s+it\\s+down)\\b`,
  `\\b(wind(?:s|ing)?\\s+up|wound\\s+up|dissolv(?:e|es|ing|ed))\\s+(?:my|our|the)\\s+${A_FEW_WORDS}(?:${BUSINESS})${ENDS_THE_PHRASE}`,
  // Pausing: the business, or its work ("pausing production at my shop").
  `\\b(paus(?:e|es|ing|ed))\\s+(?:(?:my|our|the)\\s+)?${A_FEW_WORDS}(?:${BUSINESS}|operations|production)${ENDS_THE_PHRASE}`,
  `\\b((?:put(?:ting)?|placing|placed)\\s+(?:my|our|the)\\s+${A_FEW_WORDS}(?:${BUSINESS})\\s+on\\s+hold)\\b`,
  // Selling the business itself, not what it sells.
  `\\b(sell(?:s|ing)?|sold)\\s+(?:my|our|the)\\s+${A_FEW_WORDS}(?:${BUSINESS})${ENDS_THE_PHRASE}`,
  // Behind on filings, in the ways people say it.
  `\\b(behind\\s+(?:on|with|in))\\s+(?:(?:my|our|the|all|some)\\s+)?(?:[\\p{L}\\p{N}'’&-]+\\s+)?(?:${FILINGS})\\b`,
  `\\b(catch(?:ing)?\\s+up\\s+on)\\s+(?:(?:my|our|the|all|some)\\s+)?(?:[\\p{L}\\p{N}'’&-]+\\s+)?(?:${FILINGS})\\b`,
  // "never claimed to be an expert" and "never reported to a boss" are about something else.
  `\\b(never\\s+(?:filed|reported|registered|remitted|claimed))\\b(?!\\s+to\\b)`,
  `\\b(never\\s+(?:charged|collected))\\s+(?:any\\s+)?(?:gst|hst|pst|qst|tax|sales\\s+tax)\\b`,
  `\\b(never\\s+set\\s+up\\s+payroll)\\b`,
  `\\b(${HAVE_NOT}\\s+filed)\\b`,
  `\\b(${HAVE_NOT}\\s+done)\\s+(?:(?:my|our|the|any)\\s+)?(?:${FILINGS})\\b`,
  `\\b(${DID_NOT}\\s+(?:file|report|register|remit))\\b(?!\\s+to\\b)`,
  `\\b(${DID_NOT}\\s+know\\s+i\\s+(?:had|needed)\\s+to\\s+(?:register|file|charge|report|collect|remit))\\b`,
  `\\b(not\\s+filed|unfiled|back\\s+taxes)\\b`,
].map((rule) => new RegExp(rule, "iu"));

/**
 * The first words in the sentence that a rule finds, as the person typed them (their capitals, one space
 * between words), or null when there are none. "First" is by place in the sentence, so a long idea quotes
 * what the person said first.
 */
export function situationWordsIn(sentence: string | null | undefined): string | null {
  if (!sentence) return null;
  let first: { at: number; words: string } | null = null;
  for (const rule of RULES) {
    const found = rule.exec(sentence);
    if (!found) continue;
    // The quoted group can start after the match's start only by a word boundary, so its place is the match's.
    if (first === null || found.index < first.at) first = { at: found.index, words: found[1] };
  }
  return first ? first.words.replace(/\s+/g, " ") : null;
}
