import type { EngineCitation } from "@/lib/engines/shared/types";

/**
 * The CRA's Income Tax Audit Manual, chapter 27, in its own words: one citation and one set of quotes for the
 * repeated-losses read (`risk-losses-source-of-income`, ./triggers.ts) and the card it shows on, Hobby vs. business
 * income test (`compliance-hobby-vs-business`, lib/engines/compliance/v2026/rules.ts), so the copies can't drift. No
 * screen draws a risk read's own sources, so the page the box quotes is listed under that card too: the maintainer's
 * "yes" of 2026-10-29 (his answer on PR #217's question 1), shared the way S245_CITATION is (./gaar-official-words.ts).
 *
 * The four sentences are quoted whole, in the page's order: 27.2.0 (Pursuit of profit), the paragraph on the court's
 * later reading (Chad), and two from 27.2.2 (Commercial manner). The last is the last sentence of the indented
 * paragraph the page quotes from Martin v The Queen, added after the personal-element sentence (his "add-martin" of
 * 2026-10-29), not in its place. The page names the case in the paragraph just before that one ("Judge Bowman states
 * in Martin v The Queen, 2003 TCC 155 at paragraph 18:"), not in the passage's own paragraph. The box's label for it
 * was "The same page:" until the maintainer's answer of 2026-10-30, and is "The same page, quoting Martin v The Queen:"
 * since: the case's name, taken from that paragraph, so the box says whose words the passage is.
 *
 * `node scripts/check-quotes.mjs` found all four on the live page in one run on 2026-10-29, so that is the check's
 * date (docs/engines/citations.md, rule 4). Nobody has read the page in full, so it has no `lastVerified` or `readBy`
 * and its sources say "Checked by a tool…". Left out on purpose: the auditors' own instructions (the two-stage approach
 * and its first question), the list of factors to consider, the sentence on the reasonable expectation of profit test
 * on its own, and every line with a time in it. Change a quote only after the script finds it on the page.
 */
export const CRA_ITAM_27_QUOTES = {
  pursuitOfProfit:
    "An activity undertaken in the pursuit of profit, even with erroneous business decisions that cause it to never experience any actual profit, is still a source of income.",
  intentionToCreateLosses:
    "Objective evidence showing an intention to create losses to offset taxable income may lead to the courts to conclude that no source of income exists.",
  personalElement:
    "If there is a personal element to the activity and the activity is undertaken in a sufficiently commercial manner, there is a source of income and income must be reported and losses may be claimed.",
  martin:
    "It is only where the personal element so overshadows any element of commerciality as to substantially displace it that one may conclude that the activity is merely a hobby and is not a business at all.",
} as const;

export const CRA_ITAM_27_CITATION: EngineCitation = {
  // The page's own main heading (h1) and its chapter heading, joined; `node scripts/check-quotes.mjs` found both on the
  // page on 2026-10-27. Its <title> is "ITAM Chapter 27 - Canada.ca".
  title: "Income Tax Audit Manual, Chapter 27.0 Income",
  authority: "CRA",
  jurisdiction: "CA",
  url: "https://www.canada.ca/en/revenue-agency/services/tax/technical-information/income-tax-audit-manual-domestic-compliance-programs-branch-dcpb-27.html",
  toolCheck: { checkedOn: "2026-10-29", quotes: Object.values(CRA_ITAM_27_QUOTES) },
  note: "The CRA's audit manual on income: the pursuit of profit, a personal element, and a sufficiently commercial manner.",
};
