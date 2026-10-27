/**
 * The CRA's and the Income Tax Act's words on the SR&ED credit's rates and the enhanced rate's expenditure limit, as
 * the maintainer's reading list found them on their live pages on 2026-10-23 (items grant-sred/*,
 * stage-3b-incorporation-liability-sred/35, stage-4-sred-deepening/35, sred-expenditure-limit-6-million). The SR&ED
 * card (./programs.ts) quotes them from here, and so can the map's two SR&ED stages, so two copies can't drift.
 *
 * The reading list's tool found them with the repo's matcher, the same whole-word, one-block match as
 * scripts/check-quotes.mjs, so each citation that relies on them records a tool check of that day. A networked
 * `node scripts/check-quotes.mjs` run found each again on 2026-10-26, before merge (docs/engines/citations.md, rule 4);
 * change one only after `--url … --quote …` finds the new words. The maintainer read each of these pages in full on
 * 2026-10-25, so their citations carry his read too, which wins on screen (§ The maintainer's reads of 2026-10-25).
 * One is not the reading list's: `glossaryEnhanced`, which `node scripts/check-quotes.mjs` found on 2026-10-27, so
 * its citation's check is of that day.
 */

/** The day the reading list's tool found every reading-list quote below on its page. */
export const SRED_QUOTES_FOUND_ON = "2026-10-23";

const CRA = "https://www.canada.ca/en/revenue-agency/services";

export const SRED_PAGES = {
  // The CRA's page on what the SR&ED tax incentives are: its rates, and that some businesses may earn a refundable
  // credit. Its own title, "What are SR&ED tax incentives" (its main heading), was found on it by
  // `node scripts/check-quotes.mjs` on 2026-10-27; until then the citation described the page.
  whatAre: `${CRA}/scientific-research-experimental-development-tax-incentive-program/what-are-sred-tax-incentives.html`,
  glossary: `${CRA}/scientific-research-experimental-development-tax-incentive-program/glossary.html`,
  relationships: `${CRA}/tax/businesses/topics/corporations/business-tax-credits/how-relationships-affect-small-business-deduction-sred-investment-tax-credits.html`,
  whatsNew: `${CRA}/tax/businesses/topics/corporations/whats-new-corporations.html`,
  act127: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.html",
} as const;

export const SRED_WORDS = {
  // The CRA's page on what the SR&ED tax incentives are.
  basicRate: "Your business may earn the credit at a basic rate of 15%.",
  enhancedRate: "Some corporations may claim an ITC at the enhanced rate of 35%.",
  someRefundable: "Some businesses may also earn a refundable ITC.",
  // The CRA's How certain relationships affect the small business deduction and SR&ED investment tax credits.
  ccpcEnhanced:
    "Some CCPCs may earn an ITC at an enhanced rate of 35% on qualified SR&ED expenditures up to their expenditure limit for the year.",
  // The CRA's SR&ED glossary, its entry "Enhanced SR&ED investment tax credit rate (35%)": the line the maintainer
  // asked for on SR&ED deepening. Not a reading-list find: `node scripts/check-quotes.mjs` found it on 2026-10-27. It
  // stops before the entry's split of the rate by year, and the entry's next sentence (a $3 million threshold, older
  // than the $6 million the CRA's other pages give) is never quoted.
  glossaryEnhanced:
    "Some Canadian-controlled private corporations (CCPCs) that meet certain requirements may earn investment tax credits at the enhanced rate of 35%",
  // The CRA's What's new for corporations, under "2025 – Federal". The page's own line that it lists "proposed,
  // announced, or enacted" changes is a disclaimer, never a quote an entry relies on.
  limitSixMillion:
    "The expenditure limit on which the SR&ED enhanced 35% tax credit can be earned is increased from the previously announced $4.5 million to $6 million.",
  // Income Tax Act s.127(10.2), the consolidated Act (current to 2026-09-30, the reading list noted). Only the
  // formula is recorded as found ("formula found"), not the sentence that leads into it, so only the formula is kept.
  actFormula: "$6 million × [($60 million − A) ÷ $60 million]",
} as const;
