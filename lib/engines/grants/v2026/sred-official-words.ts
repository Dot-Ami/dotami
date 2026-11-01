/**
 * The CRA's and the Income Tax Act's words on the SR&ED credit's rates and the enhanced rate's expenditure limit, as
 * the maintainer's reading list found them on their live pages on 2026-10-23 (items grant-sred/*,
 * stage-3b-incorporation-liability-sred/35, stage-4-sred-deepening/35, sred-expenditure-limit-6-million). The SR&ED
 * card (./programs.ts) quotes them from here, and so can the map's two SR&ED stages, so two copies can't drift. One,
 * `ccpcEnhanced`, is quoted nowhere since 2026-10-30 (the older page's; it stays for its citations' tool checks).
 *
 * The reading list's tool found them with the repo's matcher, the same whole-word, one-block match as
 * scripts/check-quotes.mjs, so each citation that relies on them records a tool check of that day. A networked
 * `node scripts/check-quotes.mjs` run found each again on 2026-10-26, before merge (docs/engines/citations.md, rule 4);
 * change one only after `--url … --quote …` finds the new words. The maintainer read each of these pages in full on
 * 2026-10-25, so their citations carry his read too, which wins on screen (§ The maintainer's reads of 2026-10-25).
 * One is not the reading list's: `glossaryEnhanced`, which `node scripts/check-quotes.mjs` found on 2026-10-27, so
 * SR&ED deepening's citation of the glossary has a check of that day. Nor are `individualRefundable` and
 * `SRED_POLICY_CCPC_LIST`, from the CRA's SR&ED Investment Tax Credit Policy, which the script found together on
 * 2026-10-30 (`SRED_POLICY_FOUND_ON`), nor `policyCcpcEnhanced`, from the same page, which the script found on its own
 * on 2026-10-31 for Incorporation for liability/SR&ED's citation of the page, nor `policyAboveLimit`, which it found with
 * `policyCcpcEnhanced` on 2026-11-01 for SR&ED deepening's citation of the page; nobody has read that page in full yet.
 */

/** The day the reading list's tool found every reading-list quote below on its page. */
export const SRED_QUOTES_FOUND_ON = "2026-10-23";

/**
 * The day one run of `node scripts/check-quotes.mjs --url <SRED_PAGES.itcPolicy>` found the policy page's main heading
 * ("SR&ED Investment Tax Credit Policy"), every line of `SRED_POLICY_CCPC_LIST` and `SRED_WORDS.individualRefundable`
 * on the live page ("All 15 quotes were found"). The page's citation holds that one check. Until then it was a check of
 * 2026-10-29 that held `individualRefundable` alone.
 */
export const SRED_POLICY_FOUND_ON = "2026-10-30";

/** The policy page's own main heading, found on it that day: its citation's title, and the label of its quotes on the card. */
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
  // The CRA's How certain relationships affect the small business deduction and SR&ED investment tax credits (its page
  // date 2025-07-21). The CCPC's card quoted it from 2026-10-24, and Incorporation for liability/SR&ED's 35% too. Since
  // the maintainer's answer of 2026-10-30 (his reading page, item 9: "The whole older page") it is quoted nowhere (the
  // stage's 35% quotes `policyCcpcEnhanced` since 2026-10-31): the page is the older of the two CRA pages that
  // disagree on refunds (docs/engines/citations.md, rule 8). It stays as the words three citations of the page hold
  // in their tool checks: the SR&ED card's and the two SR&ED stages'. SR&ED deepening's tax impact said its limit in
  // DotAmi's own words ("up to their expenditure limit for the year") until his answer of 2026-11-01 (item 10, "Rest
  // them on the newer pages"); it quotes `policyCcpcEnhanced` and `policyAboveLimit` since.
  ccpcEnhanced:
    "Some CCPCs may earn an ITC at an enhanced rate of 35% on qualified SR&ED expenditures up to their expenditure limit for the year.",
  // The CRA's SR&ED glossary, its entry "Enhanced SR&ED investment tax credit rate (35%)": the line the maintainer
  // asked for on SR&ED deepening. Not a reading-list find: `node scripts/check-quotes.mjs` found it on 2026-10-27. It
  // stops before the entry's split of the rate by year, and the entry's next sentence (a $3 million threshold, older
  // than the $6 million the CRA's other pages give) is never quoted. The glossary's page date is 2026-05-22, older than
  // the policy page (2026-10-07) and What's new (2026-06-12), and that $3 million is where it disagrees with them. So
  // since his answer of 2026-11-01 (his reading page, item 10: "Apply the rule: quote the newer policy page's line")
  // it is quoted nowhere, like the relationships page's line (rule 8 of docs/engines/citations.md): SR&ED deepening's
  // 35% quotes `policyCcpcEnhanced`, as Incorporation for liability/SR&ED's does. It stays as the words the stage's
  // citation of the glossary holds in its tool check.
  glossaryEnhanced:
    "Some Canadian-controlled private corporations (CCPCs) that meet certain requirements may earn investment tax credits at the enhanced rate of 35%",
  // The CRA's What's new for corporations, under "2025 – Federal". The page's own line that it lists "proposed,
  // announced, or enacted" changes is a disclaimer, never a quote an entry relies on.
  limitSixMillion:
    "The expenditure limit on which the SR&ED enhanced 35% tax credit can be earned is increased from the previously announced $4.5 million to $6 million.",
  // Income Tax Act s.127(10.2), the consolidated Act (current to 2026-09-30, the reading list noted). Only the
  // formula is recorded as found ("formula found"), not the sentence that leads into it, so only the formula is kept.
  actFormula: "$6 million × [($60 million − A) ÷ $60 million]",
  // The CRA's SR&ED Investment Tax Credit Policy, section 4.1's list of claimants that can earn a refundable ITC, its
  // item 5: the line a sole proprietor's card quotes (the maintainer's answer of 2026-10-29). Quoted whole, with its
  // "Generally" and the CRA's own "individual (other than a trust)": DotAmi never says in its own words that a sole
  // proprietor is one. The page numbers it "5)"; the line is quoted from its first word, as the card has it. Never
  // quoted beside it: the relationships page's "non-refundable" 15% for unincorporated businesses (the older page,
  // which since 2026-10-30 no card quotes at all).
  individualRefundable:
    "Generally, for an individual (other than a trust), the refundable ITC is 40% of the unclaimed balance of ITC earned in the current year for qualified SR&ED expenditures.",
  // The same policy page, section 1.1 (its overview), the page's own sentence on the enhanced rate: block 87 as
  // scripts/check-quotes.mjs reads the page, found there by `node scripts/check-quotes.mjs --url … --quote …` on
  // 2026-10-31. Incorporation for liability/SR&ED's 35% quotes it, whole, since that day: the relationships page's
  // line it quoted until then is the older page's (rule 8, the maintainer's reading page, item 9), and the SR&ED
  // glossary's line is from an older page that disagrees too (`glossaryEnhanced`). SR&ED deepening's 35% and its tax
  // impact quote it too since the maintainer's answer of 2026-11-01 (item 10). The block goes on about ECPCs, with a
  // date, a second group rather than the other side of this sentence; only this sentence is quoted.
  policyCcpcEnhanced:
    "In some cases, a Canadian-controlled private corporation (CCPC) may earn the ITC at an enhanced rate of 35%.",
  // The same page, section 3.0 ("Determining the enhanced rate of 35%"), the last sentence of its first paragraph
  // (block 200): what spending above the expenditure limit for the tax year earns, the basic rate. SR&ED deepening's tax
  // impact quotes it beside `policyCcpcEnhanced` since 2026-11-01, so both sides of the limit show: the enhanced rate,
  // then the basic rate above the limit (until then it said "up to their expenditure limit for the year" in DotAmi's
  // own words, from the relationships page). The paragraph's $6 million and its date ("This change applies to tax years
  // that begin after December 15, 2024.") are a pair of their own and are not quoted with it. `node
  // scripts/check-quotes.mjs` found it with `policyCcpcEnhanced` on 2026-11-01. Its "current year" and "tax year" are
  // the CRA's words, inside quote marks under the page's title.
  policyAboveLimit:
    "The current year qualified SR&ED expenditures in excess of the expenditure limit for the tax year earn an ITC at the basic rate (see section 2.2.1).",
} as const;

/**
 * The same section 4.1 list, its part for corporations, whole and in order: the lead-in, then items 1 to 4, one block
 * of the page each as scripts/check-quotes.mjs reads it (blocks 382 to 394 on 2026-10-30). The CCPC's note quotes all
 * of it since the maintainer's answer of 2026-10-30 (his reading page, item 8), never a part: its lines run to several
 * kinds of corporation and expenditure, and lib/brain/evaluate.ts copies the note into a sole proprietor's fork, beside
 * the individual's 40%, so a part would read as the whole. Items 5 (`SRED_WORDS.individualRefundable`, the individual)
 * and 6 (a trust) are not for corporations. The block after the list, "SR&ED claims made by large corporations that
 * earn an ITC at the basic rate (see section 2.2.1) are for the non-refundable ITC. …" (block 398), follows it outside
 * it, so it is not quoted: the maintainer's to add. "other than 1 that is" in item 2 is the page's own wording. The
 * list's "in the year" and its one date (item 3) are the CRA's words, shown only inside quote marks under the page's
 * title; DotAmi writes no time of its own beside them. The date stays on his answer of 2026-10-30 (his reading page,
 * item 9): keep the list whole, with the CRA's date in item 3. Change a line only after the script finds the new words.
 */
export const SRED_POLICY_CCPC_LIST = [
  "According to the definition of refundable ITC in the Income Tax Act, and other supporting provisions, the following types of claimants can earn a refundable ITC:",
  "1) For a CCPC that is a qualifying corporation (see section 4.2), other than an excluded corporation (see section 4.3), the refundable ITC is:",
  "100% of the unclaimed balance of the ITC earned in the year at the enhanced ITC rate of 35% for its qualified SR&ED expenditures of a current nature and its prescribed proxy amount (PPA)",
  "40% of the unclaimed balance of the ITC earned in the year at the enhanced ITC rate of 35% for its qualified SR&ED expenditures of a capital nature",
  "40% of the unclaimed balance of the ITC earned in the year at the basic ITC rate of 15% for its qualified SR&ED expenditures",
  "2) For a CCPC, other than 1 that is a qualifying corporation or an excluded corporation, the refundable ITC is:",
  "100% of the unclaimed balance of the ITC earned in the year at the enhanced ITC rate of 35% for its qualified SR&ED expenditures of a current nature and its PPA",
  "40% of the unclaimed balance of the ITC earned in the year at the enhanced ITC rate of 35% for its qualified SR&ED capital expenditures",
  "An ITC earned at the basic ITC rate by a CCPC, that is not a qualifying corporation or an excluded corporation, is not refundable.",
  "3) For ECPCs whose tax year begins after December 15, 2024:",
  "100% of the unclaimed balance of the ITC earned at the enhanced ITC rate of 35% in the current year for qualified SR&ED current expenditures and its PPA",
  "40% of the unclaimed balance of the ITC earned for their capital expenditures in the taxation year, at the enhanced rate of 35%",
  "4) For a CCPC that is a qualifying corporation, but is also an excluded corporation, the refundable ITC is 40% of the unclaimed balance of the ITC earned in the current year for qualified SR&ED expenditures.",
] as const;
