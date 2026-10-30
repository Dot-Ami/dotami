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
 * its citation's check is of that day. Nor is `individualRefundable`, from the CRA's SR&ED Investment Tax Credit
 * Policy, which the script found on 2026-10-29 (`SRED_POLICY_FOUND_ON`); nobody has read that page in full yet.
 */

/** The day the reading list's tool found every reading-list quote below on its page. */
export const SRED_QUOTES_FOUND_ON = "2026-10-23";

/**
 * The day `node scripts/check-quotes.mjs --url <SRED_PAGES.itcPolicy>` found the policy page's main heading ("SR&ED
 * Investment Tax Credit Policy") and `SRED_WORDS.individualRefundable` on the live page.
 */
export const SRED_POLICY_FOUND_ON = "2026-10-29";

/** The policy page's own main heading, found on it that day: its citation's title, and the label of its quote on the card. */
export const SRED_POLICY_TITLE = "SR&ED Investment Tax Credit Policy";

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
  // The CRA's SR&ED Investment Tax Credit Policy (its page date 2026-10-07). Cited since the maintainer's answer of
  // 2026-10-29 on the two CRA pages that disagree on a sole proprietor's refund: "it should always be the newer page
  // because it's more up-to-date". The relationships page above (its page date 2025-07-21) is the older one.
  itcPolicy: `${CRA}/scientific-research-experimental-development-tax-incentive-program/investment-tax-credit-policy.html`,
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
  // The CRA's SR&ED Investment Tax Credit Policy, section 4.1's list of claimants that can earn a refundable ITC: the
  // line a sole proprietor's card quotes (the maintainer's answer of 2026-10-29). Quoted whole, with its "Generally"
  // and the CRA's own "individual (other than a trust)": DotAmi never says in its own words that a sole proprietor is
  // one. Never quoted beside it: the relationships page's "non-refundable" 15% for unincorporated businesses (the
  // older page), or the policy page's CCPC lines, which run to several kinds of corporation and expenditure, so a
  // part would read as the whole (the CCPC's note, which the sole proprietor's fork copies, quotes none of them).
  individualRefundable:
    "Generally, for an individual (other than a trust), the refundable ITC is 40% of the unclaimed balance of ITC earned in the current year for qualified SR&ED expenditures.",
} as const;
