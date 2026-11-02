/**
 * The corrections the maintainer's reading list of 2026-10-23 asks for (its 30 "Needs you first" items: each an
 * amount or a rule DotAmi shows next to the government's words), with his answers of 2026-10-24. Each correction
 * goes only as far as words DotAmi holds say, or words the reading list's tool found on the same page on 2026-10-23
 * (the same whole-word, one-block match as scripts/check-quotes.mjs), kept as a tool check of that day on the
 * entry he checked and on no other citation of the page. Where neither says it, the line says less.
 *
 * No source was marked as read by him then. His reads came on 2026-10-25, when he read 31 pages in full from his
 * reading list; since 2026-10-27 every citation of those pages carries them (tests/maintainer-reads.spec.ts), which
 * changed the first check below and the two that said a page had no read. Entries taken off:
 * tests/retired-entries.spec.ts; the program added: tests/productivity-grant.spec.ts.
 *
 * Since the maintainer's answer of 2026-10-29 (his reading page, item 2: "it should always be the newer page because
 * it's more up-to-date"), a sole proprietor's SR&ED card also quotes the CRA's SR&ED Investment Tax Credit Policy, the
 * newer of the two CRA pages that disagree on refunds, with a tool check of that day and no read (§ 3).
 *
 * Since the maintainer's answer of 2026-10-30 (his reading page, item 8), the CCPC's note, which a sole proprietor's
 * fork copies, quotes the same page's section 4.1 list for corporations, whole and in order, under the page's title;
 * the page's one tool check holds the 40% line and the list, found in one run of scripts/check-quotes.mjs that day
 * (§ 3). The list's own "in the year" and its one date are the CRA's words inside its quote marks; DotAmi's words
 * around them still hold no time and no date. And docs/engines/citations.md § Rules has the rule his answers of
 * 2026-10-29 and 2026-10-30 make: where two official pages disagree, the card quotes the newer one (rule 8).
 *
 * Since his two answers of the same day on item 9 (§ 3): the list stays whole, with the CRA's date in its item 3
 * ("keep-whole"), and the whole older page is quoted nowhere ("whole-page"). So the CCPC's note, and the fork that copies
 * it, no longer quote the relationships page's 35% line, and Incorporation for liability/SR&ED's 35% quotes the newest
 * page's own sentence, the SR&ED Investment Tax Credit Policy's section 1.1, from its own citation of that page (a tool
 * check of 2026-10-31). Not the SR&ED glossary's line, which SR&ED deepening quotes: the glossary's page date is
 * 2026-05-22, and the same entry gives a $3 million threshold where the newer pages give $6 million, so under rule 8 it
 * is an older page that disagrees too (the review of 2026-10-31). The older page stays listed, with its checks,
 * wherever it was.
 *
 * Since his answers on item 10 (2026-11-01, § 8): SR&ED deepening's 35% quotes the same policy sentence, from the
 * stage's own citation of the policy page, and the glossary stays listed and is quoted nowhere, like the relationships
 * page; and the four lines in DotAmi's own words that rested on the relationships page alone show the newer pages'
 * words instead (SR&ED deepening's tax impact, the note on its source, and road 0's lines on CCPCs, the line on
 * associated corporations now two, one per newer page), each new quote found by scripts/check-quotes.mjs that day.
 * The review of the same day (§ 8): SR&ED deepening's tax impact quotes What's new's line on the limit in place of one
 * side of the policy page's two-sided passage on it, from the stage's own citation of What's new; the notes of DotAmi's
 * own on these sources name the page's topic only; the line on associated corporations quotes the T2 guide's sentence
 * on the small business deduction first, the fact that had come off; and the line on the expenditure limit quotes the
 * policy page's block on the prescribed form too, under a lead that says what the person checked.
 *
 * Addresses and quotes are written out here, not imported, so a change to a catalog's constant can't move the test
 * with it. Each check fails on the code before the corrections unless its comment says it is a guard.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateProfile, type EvaluationProfile } from "@/lib/brain";
import { allCatalogCitations, type ListedCitation } from "@/lib/engines/all-citations";
import { cfeNodesV2026 } from "@/lib/engines/cfe/v2026";
import { complianceRulesV2026, recordRetentionV2026 } from "@/lib/engines/compliance/v2026";
import { grantProgramsV2026 } from "@/lib/engines/grants/v2026/programs";
import type { GrantProgram } from "@/lib/engines/grants/v2026/types";
import { riskEntriesV2026 } from "@/lib/engines/risk/v2026";
import { roadsV2026 } from "@/lib/engines/roads/v2026";
import { howChecked, isCheckFirst } from "@/lib/engines/shared/citation-check";
import { structureLadderV2026, type StructureEntityType } from "@/lib/engines/structure/v2026";

import { MAINTAINER_READ_DAY, MAINTAINER_READ_PAGES } from "./fixtures/maintainer-reads-2026-10-25";
import { findTimeWords } from "./helpers/time-words";

const TODAY = "2026-10-24";
/** The day the reading list's tool fetched every page below. */
const LIST_DAY = "2026-10-23";

const repo = path.resolve(__dirname, "..");
const read = (file: string) => readFileSync(path.join(repo, file), "utf8");
/** A doc's words with its line breaks taken out, so a phrase split over two lines is found. */
const readFlat = (file: string) => read(file).replace(/\s+/g, " ");

const CRA = "https://www.canada.ca/en/revenue-agency/services";
const PAGE = {
  sredProgram: `${CRA}/scientific-research-experimental-development-tax-incentive-program.html`,
  sredWhatAre: `${CRA}/scientific-research-experimental-development-tax-incentive-program/what-are-sred-tax-incentives.html`,
  sredGlossary: `${CRA}/scientific-research-experimental-development-tax-incentive-program/glossary.html`,
  sredItcPolicy: `${CRA}/scientific-research-experimental-development-tax-incentive-program/investment-tax-credit-policy.html`,
  relationships: `${CRA}/tax/businesses/topics/corporations/business-tax-credits/how-relationships-affect-small-business-deduction-sred-investment-tax-credits.html`,
  typeOfCorporation: `${CRA}/tax/businesses/topics/corporations/type-corporation.html`,
  whatsNew: `${CRA}/tax/businesses/topics/corporations/whats-new-corporations.html`,
  act127: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.html",
  act245: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-245.html",
  whenToRegister: `${CRA}/tax/businesses/topics/gst-hst-businesses/when-register-charge.html`,
  t2Guide: `${CRA}/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html`,
  payrollAccount: `${CRA}/tax/businesses/topics/payroll/open-manage-payroll-account/determine-need-register.html`,
  rates: `${CRA}/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html`,
  records: `${CRA}/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html`,
  homeOffice: `${CRA}/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html`,
  t4002: `${CRA}/forms-publications/publications/t4002/t4002-6.html`,
  isedLoans:
    "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en/canada-small-business-financing-program/find-loan-your-small-business/helping-small-businesses-get-loans",
} as const;

// The words, as the reading list records them (its candidate quotes and the held quotes it found again that day).
// The CRA's What are SR&ED tax incentives page:
const BASIC_RATE = "Your business may earn the credit at a basic rate of 15%.";
const ENHANCED_RATE = "Some corporations may claim an ITC at the enhanced rate of 35%.";
const SOME_REFUNDABLE = "Some businesses may also earn a refundable ITC.";
// The CRA's How certain relationships affect the small business deduction and SR&ED investment tax credits:
const CCPC_ENHANCED =
  "Some CCPCs may earn an ITC at an enhanced rate of 35% on qualified SR&ED expenditures up to their expenditure limit for the year.";
// The same page's line on unincorporated businesses (its page date 2025-07-21). The maintainer's answer of 2026-10-29
// picked the newer page (below) where the two disagree, so this line is quoted nowhere.
const OLDER_NON_REFUNDABLE = "Corporations and unincorporated businesses may earn a non-refundable ITC at the rate of 15%.";
// The same page's line on CCPCs' refunds, found by scripts/check-quotes.mjs on 2026-10-27 (one of the options for the
// CCPC's card until the maintainer's answer of 2026-10-30), held by no citation.
const OLDER_SOME_CCPCS_REFUNDABLE = "Some CCPCs may also earn a refundable ITC.";
/**
 * The same page's sentences road 0's two lines on CCPCs held in their checks from 2026-10-12 until the maintainer's
 * answer on item 10 (2026-11-01), when the lines moved to newer pages: kept here so they stay caught though no citation
 * holds them now. Left out: the page's short phrases (“a private corporation”, “a resident in Canada”), which any page
 * on CCPCs may use, and the two schedules' titles, the forms' own names on every page that names them (the policy page
 * names T2SCH49's).
 */
const OLDER_ROAD_LINES = [
  "The small business deduction (SBD) and the investment tax credit (ITC) for scientific research and experimental development (SR&ED) at the enhanced rate are available to certain Canadian-controlled private corporations (CCPC).",
  "In general terms, a corporation is a CCPC if it is all of the following:",
  "not controlled directly or indirectly by one or more non-resident persons or public corporations",
  "When one CCPC is associated with other CCPCs, these corporations must share the business limit.",
  "When one CCPC is associated with other CCPCs, these corporations must share the expenditure limit.",
] as const;
/**
 * The older page's lines DotAmi knows, its 35% for some CCPCs among them. Since the maintainer's answer of 2026-10-30
 * (his reading page, item 9: "The whole older page") none of them is quoted on any card, fork, map stage or road; the
 * page stays listed, with its checks, where it was (docs/engines/citations.md, § Rules, rule 8), and since his answer on
 * item 10 road 0's lines on CCPCs rest on newer pages instead.
 */
const OLDER_PAGE_LINES = [CCPC_ENHANCED, OLDER_NON_REFUNDABLE, OLDER_SOME_CCPCS_REFUNDABLE, ...OLDER_ROAD_LINES] as const;
// The CRA's SR&ED Investment Tax Credit Policy (its page date 2026-10-07): the line a sole proprietor's card quotes
// since the maintainer's answer of 2026-10-29, found by scripts/check-quotes.mjs on the live page that day.
const POLICY_INDIVIDUAL_40 =
  "Generally, for an individual (other than a trust), the refundable ITC is 40% of the unclaimed balance of ITC earned in the current year for qualified SR&ED expenditures.";
/**
 * The same page's section 4.1 list for corporations, whole and in order: its lead-in, then items 1 to 4 (CCPCs that
 * are qualifying corporations, other CCPCs with the line after them, ECPCs, and qualifying corporations that are also
 * excluded), as scripts/check-quotes.mjs reads the page, one block each (blocks 382 to 394). Items 5 (the individual,
 * POLICY_INDIVIDUAL_40) and 6 (a trust) are not for corporations. The CCPC's note quotes it since the maintainer's
 * answer of 2026-10-30.
 */
const POLICY_CCPC_LIST = [
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
/**
 * Lines of the same page never quoted on the card: section 4.1's item 6 (a trust), and the block after the list on
 * large corporations' non-refundable ITC (block 398), which follows the list, outside it.
 */
const POLICY_NEVER_QUOTED = [
  "Generally, for a trust, each beneficiary of which is either a qualifying corporation or an individual",
  "SR&ED claims made by large corporations that earn an ITC at the basic rate",
] as const;
/**
 * The day scripts/check-quotes.mjs found the policy page's title, its 40% line and its list for corporations on it, in
 * one run (`node scripts/check-quotes.mjs --url … --quote …`, 15 quotes, "All 15 quotes were found", checkedOn
 * "2026-10-30"). Until then the check was of 2026-10-29 and held the 40% line alone.
 */
const POLICY_DAY = "2026-10-30";
/**
 * The same page's own sentence on the enhanced rate, in section 1.1 (block 87 as scripts/check-quotes.mjs reads the
 * page): Incorporation for liability/SR&ED's 35% quotes it since the review of 2026-10-31, from the stage's own citation
 * of the page.
 */
const POLICY_CCPC_ENHANCED = "In some cases, a Canadian-controlled private corporation (CCPC) may earn the ITC at an enhanced rate of 35%.";
/**
 * The day `node scripts/check-quotes.mjs --url <the policy page> --quote <POLICY_CCPC_ENHANCED>` found that sentence on
 * the live page ("The quote was found", checkedOn "2026-10-31"): the stage's citation of the page holds that one check.
 */
const POLICY_STAGE_3B_DAY = "2026-10-31";
/**
 * The maintainer's note on his reading page, item 9 (2026-10-30), with his answer "The whole older page", word for word,
 * his line break included.
 */
const ITEM_9_NOTE =
  "yah. this last question is tricky, because obviously we shouldn't be showing the older page at all; BUT there's a reason the older page is still there.\nSo when we run into moments like this, we need to find a way to verify which one is accurate and true, and which one isn't";
/** His pick on item 9, the option's description under its bold label "The whole older page", word for word. */
const ITEM_9_PICK =
  "The 35% line above comes off the corporation's card and the sole proprietor's note; the card's 35% rests on the newer page's list.";
// The CRA's SR&ED glossary, its entry "Enhanced SR&ED investment tax credit rate (35%)": the line the maintainer asked
// for on stage-4, found by scripts/check-quotes.mjs on 2026-10-27 (not a reading-list find).
const GLOSSARY_ENHANCED =
  "Some Canadian-controlled private corporations (CCPCs) that meet certain requirements may earn investment tax credits at the enhanced rate of 35%";
// The same entry's next sentence, where the glossary (its page date 2026-05-22) disagrees with the newer pages: they
// give $6 million (docs/engines/citations.md, rule 8). Held by no citation.
const GLOSSARY_THREE_MILLION =
  "This enhanced rate may be earned on their qualified SR&ED expenditures up to a maximum threshold of $3 million.";
/**
 * The glossary's lines DotAmi knows on the enhanced rate. Since the maintainer's answer of 2026-11-01 (his reading page,
 * item 10, Part A) none of them is quoted on any card, fork, map stage or road, and neither is any of the glossary's
 * other held quotes: it is an older page that disagrees, listed under SR&ED deepening with its check, like the
 * relationships page.
 */
const GLOSSARY_LINES = [GLOSSARY_ENHANCED, GLOSSARY_THREE_MILLION] as const;
/**
 * The policy page's section 3.0, the last sentence of its paragraph on the enhanced rate (block 200 as
 * scripts/check-quotes.mjs reads the page): spending above the expenditure limit for the tax year earns the basic rate.
 * SR&ED deepening's tax impact quoted it beside POLICY_CCPC_ENHANCED on 2026-11-01, until the review of the same day:
 * it is one side of the block's two-sided passage on the limit (the block's own $6 million sentence is the other), so
 * the tax impact quotes What's new's line on the limit instead (LIMIT_SIX_MILLION), and no citation holds this now.
 */
const POLICY_ABOVE_LIMIT =
  "The current year qualified SR&ED expenditures in excess of the expenditure limit for the tax year earn an ITC at the basic rate (see section 2.2.1).";
/**
 * The day `node scripts/check-quotes.mjs --url … --quote …` found every new quote of item 10's change on its page, one
 * run per page ("All 7 quotes were found", "All 10 …", "All 4 …", each with checkedOn "2026-11-01").
 */
const ITEM_10_DAY = "2026-11-01";
/** His two picks on item 10, each option's description under its bold label, word for word as his page showed them. */
const ITEM_10_LABEL_A = "Apply the rule: quote the newer policy page's line";
const ITEM_10_PICK_A =
  'The glossary stays listed under the stage and is quoted nowhere. The new line\'s source shows "Checked by a tool" in amber until a person reads the policy page.';
const ITEM_10_LABEL_B = "Rest them on the newer pages";
const ITEM_10_PICK_B =
  "Find the same facts on the newer CRA pages, check them with the tool, and show those pages' words instead; any fact no newer page states comes off.";
/** The four lines item 10 names, as they read in DotAmi's own words before his answer, each from the relationships page. */
const OWN_WORDS_BEFORE_ITEM_10 = {
  taxImpact: "The enhanced rate is for some CCPCs, up to their expenditure limit for the year.",
  note: "Which CCPCs may earn the enhanced 35% rate, up to their expenditure limit for the year.",
  ccpc: "in general, a private corporation, resident in Canada, not controlled by non-residents or public corporations. The small business deduction and the enhanced investment tax credit for scientific research and experimental development (SR&ED) are for certain CCPCs.",
  associated:
    "they share the business limit and the SR&ED expenditure limit; the agreements that allocate them are schedules T2SCH23 and T2SCH49.",
} as const;
/**
 * The CRA's Type of corporation page (its page date 2026-09-11, newer than the relationships page's 2025-07-21): its
 * list of what makes a corporation a CCPC, whole and in order, the lead-in and its eight items, one block each. Road 0's
 * line on CCPCs quotes all of it since item 10: the page has no "in general" summary like the older page's.
 */
const TYPE_CCPC_LIST = [
  "The corporation is a CCPC if it meets all of the following requirements at the end of the tax year:",
  "it is a private corporation",
  "it is a corporation that was resident in Canada and was either incorporated in Canada or resident in Canada from June 18, 1971, to the end of the tax year",
  "it is not controlled directly or indirectly by one or more non-resident persons",
  "it is not controlled directly or indirectly by one or more public corporations (other than a prescribed venture capital corporation, as defined in section 6700 of the Income Tax Regulations)",
  "it is not controlled by a Canadian resident corporation that lists its shares on a designated stock exchange outside of Canada",
  "it is not controlled directly or indirectly by any combination of persons described in the three previous conditions",
  "if all of its shares that are owned by a non-resident person, by a public corporation (other than a prescribed venture capital corporation), or by a corporation with a class of shares listed on a designated stock exchange were owned by one person, that person would not own sufficient shares to control the corporation",
  "no class of its shares of capital stock is listed on a designated stock exchange",
] as const;
// The CRA's T2 guide, chapter 4 (its page date 2026-05-28), its Line 410 – Business limit: the associated side, after
// the not-associated side (MAX_LIMIT). The same block's last sentence only points to the schedule.
const SCHEDULE_23 =
  "CCPCs that are associated with one or more corporations during the tax year have to file Schedule 23, Agreement Among Associated Canadian-Controlled Private Corporations to Allocate the Business Limit.";
const SCHEDULE_23_SHARES =
  "On this schedule, a percentage of the business limit is allocated to each corporation, and the total of all percentages cannot be more than 100%.";
/**
 * The policy page's block 255, whole: the group must file an agreement on the prescribed form, otherwise the CRA
 * determines the limit to be nil. Between the section's first sentence and block 256 on the line on the expenditure
 * limit since the review of 2026-11-01 (until then the line went from the one to the other without it).
 */
const POLICY_AGREEMENT_OR_NIL =
  "All CCPCs in an associated group, and all ECPCs that are part of a consolidated group, must file an agreement to allocate the expenditure limit on the prescribed form, otherwise the CRA will determine the expenditure limit to be nil.";
/**
 * The policy page's section 3.1.3 on allocating the expenditure limit: its first sentence (block 254), the whole of
 * block 255 (the agreement on the prescribed form, or a nil limit), and the whole of block 256, T2SCH49 for CCPCs with
 * the other side (ECPCs, and CCPCs on the revenue method: a separate form) and what the CRA says to keep meanwhile.
 */
const POLICY_EXPENDITURE_LIMIT = [
  "A CCPC and its associated corporations (associated group), or an ECPC and the members of a consolidated group (see section 3.2), must allocate the annual expenditure limit for the purposes of calculating their ITCs earned at the enhanced 35% rate.",
  POLICY_AGREEMENT_OR_NIL,
  "For CCPCs, the expenditure limit for the applicable tax year may be allocated among the associated corporations by filing Schedule T2SCH49, Agreement Among Associated Canadian-Controlled Private Corporations to Allocate the Expenditure Limit.",
  "For ECPCs, and CCPCs electing to calculate their expenditure limit based on the revenue method, a separate form will be published in Fall 2026.",
  "In the interim, corporations should maintain copies of their working papers to demonstrate how the expenditure limit was calculated and allocated.",
] as const;
// The CRA's Business-use-of-home expenses page, on the business part: found by scripts/check-quotes.mjs on 2026-10-27.
const HOME_OFFICE_BUSINESS_PART =
  "To calculate the part you can deduct, use a reasonable basis, such as the area of the workspace divided by the total area of your home.";
// The CRA's What's new for corporations, and Income Tax Act s.127(10.2). Only the formula is recorded as found on
// the Act's page ("formula found"), so its lead-in sentence is not kept.
const LIMIT_SIX_MILLION =
  "The expenditure limit on which the SR&ED enhanced 35% tax credit can be earned is increased from the previously announced $4.5 million to $6 million.";
const ACT_FORMULA = "$6 million × [($60 million − A) ÷ $60 million]";
// The CCPC's note whole: each label before its own quotes, and the "…" after the list's item 4 that marks its two
// other items (an individual, a trust). Pinned whole so a label moved onto another quote fails (the review of the
// rl-8 draft, 2026-10-30). Since the maintainer's answer on item 9 the same day (the whole older page quoted nowhere)
// it starts with What's new's line: the relationships page's 35% line, before it until then, is gone.
const CCPC_NOTE_WHOLE = `The CRA's What's new for corporations: “${LIMIT_SIX_MILLION}” The CRA's SR&ED Investment Tax Credit Policy: ${POLICY_CCPC_LIST.map((line) => `“${line}”`).join(" ")} …`;
/** The CCPC's note as it was before his answer on item 9, the planted control for the older page's checks below. */
const CCPC_NOTE_BEFORE_ITEM_9 = `The CRA: “${CCPC_ENHANCED}” ${CCPC_NOTE_WHOLE}`;
// The CRA's T2 guide, chapter 4: the reading list's quote, and the fragment structure-ccpc already held.
const MAX_LIMIT = "The maximum allowable business limit for a corporation that is not associated with any other corporation is $500,000.";
const THROUGHOUT = "throughout the tax year may be able to claim the small business deduction";
/**
 * The same chapter's block 55, whole, under Line 430 – Small business deduction: who may claim the deduction, and what
 * it reduces. The line on associated corporations quotes it first since the review of 2026-11-01: it is the fact the
 * older line on CCPCs said in DotAmi's own words ("The small business deduction … are for certain CCPCs."), which had
 * come off with item 10 though this newer page states it (its page date 2026-05-28).
 */
const T2_SBD =
  "Corporations that were Canadian-controlled private corporations (CCPCs) throughout the tax year may be able to claim the small business deduction (SBD). The SBD reduces Part I tax that the corporation would otherwise have to pay.";
/** In curly quote marks, one after another: how a line shows a page's words. */
const curly = (lines: readonly string[]) => lines.map((line) => `“${line}”`).join(" ");
/** The four lines item 10 names, and the line it adds, word for word as they read since the review of 2026-11-01. */
const ITEM_10_LINES = {
  taxImpact: `Eligible SR&ED expenditures generate ITCs and deductions. The CRA's SR&ED Investment Tax Credit Policy: “${POLICY_CCPC_ENHANCED}” The CRA's What's new for corporations: “${LIMIT_SIX_MILLION}” Provincial top-ups may apply in some jurisdictions.`,
  note: "CRA guidance on CCPC relationships, SBD, and SR&ED investment tax credits.",
  ccpc: `You checked whether the corporation is a Canadian-controlled private corporation (CCPC). The CRA's Type of corporation page: ${curly(TYPE_CCPC_LIST)}`,
  associated: `You checked whether the corporation is associated with any other corporation. The CRA's income tax guide for corporations, on the small business deduction and the business limit: ${curly([T2_SBD, MAX_LIMIT, SCHEDULE_23, SCHEDULE_23_SHARES])}`,
  expenditureLimit: `You checked how an associated group allocates the SR&ED expenditure limit, if the corporation is associated with other corporations. The CRA's SR&ED Investment Tax Credit Policy, on the expenditure limit: ${curly(POLICY_EXPENDITURE_LIMIT)}`,
} as const;
/** The three lines the review of 2026-11-01 changed, as commit ca18ae2 had them: the planted controls below. */
const ITEM_10_LINES_CA18AE2 = {
  taxImpact: `Eligible SR&ED expenditures generate ITCs and deductions. The CRA's SR&ED Investment Tax Credit Policy: “${POLICY_CCPC_ENHANCED}” “${POLICY_ABOVE_LIMIT}” Provincial top-ups may apply in some jurisdictions.`,
  associated: `You checked whether the corporation is associated with any other corporation. The CRA's Corporation Income Tax Guide on the business limit: ${curly([MAX_LIMIT, SCHEDULE_23, SCHEDULE_23_SHARES])}`,
  expenditureLimit: `If it is associated with other corporations, the CRA's SR&ED Investment Tax Credit Policy on the expenditure limit: ${curly(POLICY_EXPENDITURE_LIMIT.filter((q) => q !== POLICY_AGREEMENT_OR_NIL))}`,
} as const;
/** The notes ca18ae2 wrote on the stage's and the road's new citations of the policy page, each stating a fact. */
const NOTES_CA18AE2 = [
  "The CRA's SR&ED investment tax credit policy: its overview of the enhanced rate, and the expenditure limit it is earned up to.",
  "The CRA's policy on the SR&ED investment tax credit, including the enhanced rate's expenditure limit and how associated corporations allocate it.",
] as const;
/** What a note in DotAmi's own words must not say on these sources: a limit, a rate or an amount, a fact of the page's. */
const NOTE_STATES_A_FACT = /expenditure limit|35%|\$\d/;
/** Road 0's three lines on Incorporation for liability/SR&ED since item 10, and the newer page each quotes. */
const ITEM_10_ROAD_LINES = [
  { id: "dw-start-incsred-ccpc", text: ITEM_10_LINES.ccpc, url: PAGE.typeOfCorporation, title: "Type of corporation (CRA)", quotes: [...TYPE_CCPC_LIST] },
  {
    id: "dw-start-incsred-associated",
    text: ITEM_10_LINES.associated,
    url: PAGE.t2Guide,
    title: "T2 Corporation – Income Tax Guide – Chapter 4: Page 4 of the T2 return (CRA)",
    quotes: [T2_SBD, MAX_LIMIT, SCHEDULE_23, SCHEDULE_23_SHARES],
  },
  {
    id: "dw-start-incsred-expenditure-limit",
    text: ITEM_10_LINES.expenditureLimit,
    url: PAGE.sredItcPolicy,
    title: "SR&ED Investment Tax Credit Policy (CRA)",
    quotes: [...POLICY_EXPENDITURE_LIMIT],
  },
] as const;
// The CRA's Determine if you need to register for a payroll account (both held by road 0's
// dw-start-hire-payroll-account; the second is also the reading list's quote).
const REGISTER_BEFORE = "You have to register for a payroll account before the first remittance due date.";
const FIRST_REMITTANCE =
  "Your first remittance due date is the 15th day of the month following the month in which you began withholding deductions from your employee's pay, unless the CRA tells you to remit using a different frequency.";
// The CRA's Where to keep your records (both held by every road's Keep your records step).
const GENERALLY_SIX_YEARS =
  "Generally, you must keep all required records and supporting documents for a period of six years from the end of the last tax year they relate to.";
const OTHER_PERIODS = "In some situations, you must retain your records for a different period of time.";
// The CRA's Guide T4002, chapter 4.
const UNDER_PROPOSED_CHANGES =
  "Under proposed changes, if property included in Class 44, 46, or 50 is acquired and becomes available for use after April 15, 2024, the following factors apply:";
// ISED's Helping small businesses get loans: the three sentences the reading list records.
const ISED_SECURITY = "For real property and equipment, security must be taken on the assets financed.";
const ISED_LOANS_FOUND = [
  "The maximum loan amount for a borrower is $1.15 million.",
  "Up to a maximum of $1,000,000 for term loans for any one borrower, of which no more than $500,000 can be used for purchasing leasehold improvements and purchasing or improving new or used equipment",
  ISED_SECURITY,
];
// Sole Prop activation's $30,000 note quotes these, held on road 0 since 2026-10-12.
const SOLE_PROP_COUNTS =
  "If you are a sole proprietor, include the total amount of all revenues (before expenses) from your worldwide taxable supplies from all your businesses and those of your associates (if they were associated at the beginning of the particular calendar quarter).";
const NOT_COUNTED = ["do not include revenues from supplies of financial services, sales of capital property", "and goodwill from the sale of a business."];
// Income Tax Act s.245 in docs/glossary.md's GAAR entry: scripts/check-quotes.mjs found them on 2026-10-12.
const GLOSSARY_S245 = [
  "This section of the Act contains the general anti-avoidance rule",
  "applies to deny the tax benefit of avoidance transactions that result directly or indirectly either in a misuse of provisions of the Act",
  "an abuse having regard to those provisions read as a whole",
  "obtaining the tax benefit is not one of the main purposes for undertaking or arranging a transaction",
  "while not preventing taxpayers from obtaining tax benefits contemplated by Parliament",
];

/** Lines a tool found on these pages that are never kept as what an entry relies on: worked examples, a page's disclaimer, the list's own labels. */
const NEVER_KEPT = [
  "The furniture store charges 13% HST on the sale because the place of supply is Ontario.",
  "The electronics store charges GST of 5% and the PST that applies in Manitoba of 7%.",
  "$3 million (being the expenditure limit applicable in that year)",
  // The SR&ED glossary's 35% entry: its split of the rate by year, and its next sentence's threshold, older than the
  // $6 million the CRA's other pages give (the stage quotes the entry only up to "35%").
  "before 2014",
  "maximum threshold of $3 million",
  "This page includes proposed, announced, or enacted corporation income tax changes.",
  // The relationships page's "non-refundable" 15% for unincorporated businesses: the older of the two CRA pages that
  // disagree, so never held (the maintainer's answer of 2026-10-29: "it should always be the newer page").
  OLDER_NON_REFUNDABLE,
  "[Income Tax Act",
  "[Income Tax Regulations",
];

/**
 * The tool checks of 2026-10-23 this change records, each on the entry the reading list checked and holding only the
 * words it records on that page that day. A map stage's citations are shown on road 0 and the federal steps too (the
 * same objects).
 */
const TOOL_CHECKS_OF_THE_DAY: { where: string; url: string; quotes: string[] }[] = [
  { where: "grants grant-sred", url: PAGE.sredWhatAre, quotes: [BASIC_RATE, ENHANCED_RATE, SOME_REFUNDABLE] },
  { where: "grants grant-sred", url: PAGE.relationships, quotes: [CCPC_ENHANCED] },
  { where: "grants grant-sred", url: PAGE.whatsNew, quotes: [LIMIT_SIX_MILLION] },
  { where: "grants grant-sred", url: PAGE.act127, quotes: [ACT_FORMULA] },
  { where: "cfe stage-3a-incorporation-80k-net", url: PAGE.t2Guide, quotes: [MAX_LIMIT, THROUGHOUT] },
  { where: "cfe stage-3b-incorporation-liability-sred", url: PAGE.relationships, quotes: [CCPC_ENHANCED] },
  { where: "cfe stage-4-sred-deepening", url: PAGE.relationships, quotes: [CCPC_ENHANCED] },
  { where: "cfe branch-hire-first-employee", url: PAGE.payrollAccount, quotes: [REGISTER_BEFORE, FIRST_REMITTANCE] },
  { where: "compliance cra-business-records-retention", url: PAGE.records, quotes: [GENERALLY_SIX_YEARS, OTHER_PERIODS] },
  { where: "risk risk-immediate-expensing-timing", url: PAGE.t4002, quotes: [UNDER_PROPOSED_CHANGES] },
];

/**
 * Every other citation of those pages (not on an entry the list corrected, and not a road's copy of a corrected map
 * stage, which is the stage's own object), with the check it had before the corrections (main at 694007d): its day
 * and how many quotes. None of them changes (the maintainer's answer 2 of 2026-10-24: only the entries he checked).
 * Road 0's lines on CCPCs were among them (the relationships page, checked 2026-10-12) until his answer on item 10
 * (2026-11-01): they show the newer pages' words now, each from its own citation of a newer page (§ 8), so they are
 * left out here.
 */
const OTHER_CITATIONS_BEFORE: { where: string; url: string; checkedOn: string | null; quotes: number }[] = [
  { where: "structure structure-ccpc", url: PAGE.t2Guide, checkedOn: "2026-10-13", quotes: 2 },
  { where: "writeoffs writeoff-cca-class-50", url: PAGE.t4002, checkedOn: null, quotes: 0 },
  ...["road-starting-any-business-ab", "road-federal-steps-ca"].flatMap((road) => [
    { where: `roads ${road} dw-start-hire-status`, url: PAGE.payrollAccount, checkedOn: "2026-10-12", quotes: 2 },
    { where: `roads ${road} dw-start-hire-payroll-account`, url: PAGE.payrollAccount, checkedOn: "2026-10-12", quotes: 2 },
    { where: `roads ${road} step-start-keep-records`, url: PAGE.records, checkedOn: "2026-10-14", quotes: 2 },
    { where: `roads ${road} dw-start-records-where-how-long`, url: PAGE.records, checkedOn: "2026-10-14", quotes: 10 },
  ]),
  { where: "roads road-apprentice-to-own-shop-ab step-shop-keep-records", url: PAGE.records, checkedOn: "2026-10-14", quotes: 2 },
  { where: "roads road-apprentice-to-own-shop-ab dw-shop-records-where-how-long", url: PAGE.records, checkedOn: "2026-10-14", quotes: 10 },
  { where: "roads road-apprentice-to-own-shop-ab step-shop-first-hire", url: PAGE.payrollAccount, checkedOn: "2026-10-12", quotes: 1 },
  { where: "roads road-apprentice-to-own-shop-ab dw-shop-hire-payroll", url: PAGE.payrollAccount, checkedOn: "2026-10-12", quotes: 2 },
];
/** structure-ccpc's citation of the T2 guide before the corrections: the reading list's new quote went to the map stage only. */
const STRUCTURE_CCPC_T2_QUOTES = [THROUGHOUT, "reduces Part I tax that the corporation would otherwise have to pay."];

const all = allCatalogCitations();
/** The runs of words in curly quote marks, the way the cards quote a page. */
const quoted = (text: string) => [...text.matchAll(/“([^”]+)”/g)].map((m) => m[1]!);
/** A text with its quoted runs taken out: what DotAmi says in its own words. */
const ownWords = (text: string) => text.replace(/“[^”]*”/g, " ");
/** DotAmi's own words with each quote taken out and the spaces closed up, to pin them exactly. */
const ownWordsFlat = (text: string) => ownWords(text).replace(/\s+/g, " ").trim();
/** A text with only the policy page's list for corporations taken out, each line where it stands in quote marks. */
const withoutPolicyList = (text: string) =>
  text.replace(/“([^”]*)”/g, (whole, inner: string) => ((POLICY_CCPC_LIST as readonly string[]).includes(inner) ? " " : whole));
const citationsAt = (where: string) => all.filter((l) => l.where === where).map((l) => l.citation);
function citationOf(where: string, url: string): ListedCitation {
  const found = citationsAt(where).filter((c) => c.url === url);
  expect(found, `${where} cites ${url} once`).toHaveLength(1);
  return found[0]!;
}
/** A run of words sits in a quote: it is the quote, or a part of it. */
const inQuotes = (run: string, quotes: readonly string[]) => quotes.some((q) => q === run || q.includes(run));
/** The tool check's own quotes, read from the field: a read wins on screen, and `toolCheckQuotes` is then empty. */
const rawQuotes = (c: ListedCitation) => c.toolCheck?.quotes ?? [];
/** Every string a value holds, however deep. */
function stringsIn(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn);
  return [];
}
const sorted = (list: readonly string[]) => [...list].sort();
/** Every string a value holds outside its sources: the words a card, stage or road says, not its citations' checks. */
const SOURCE_KEYS = new Set(["citation", "citations", "nameSource", "toolCheck"]);
function ownStringsIn(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(ownStringsIn);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, v]) => (SOURCE_KEYS.has(key) ? [] : ownStringsIn(v)));
  }
  return [];
}
/**
 * The fewest words a quoted run needs before a PART of one of an older page's held quotes counts as that page's: fewer
 * is a phrase any CRA page on corporations may use (“private corporation”), not that page's line. A whole held quote
 * counts at any length (“a private corporation” was one: road 0's check of the relationships page held it until item 10).
 */
const OLDER_PAGE_MIN_WORDS = 6;
const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
/**
 * The older pages that disagree with a newer one, each quoted nowhere (docs/engines/citations.md, rule 8): the CRA's
 * relationships page since the maintainer's answer of 2026-10-30 (his reading page, item 9), and its SR&ED glossary
 * since his answer of 2026-11-01 (item 10, Part A). Each with the lines DotAmi knows of it.
 */
const OLDER_PAGES: { url: string; lines: readonly string[] }[] = [
  { url: PAGE.relationships, lines: OLDER_PAGE_LINES },
  { url: PAGE.sredGlossary, lines: GLOSSARY_LINES },
];
/**
 * The older pages' words in a text: any of their known lines, anywhere; a quoted run that is one of the quotes a
 * citation of the page holds, whole; or a quoted run of at least OLDER_PAGE_MIN_WORDS words that is a part of one.
 * Empty when the text quotes none of it. Only quoted runs are read here; DotAmi's own words written from the
 * relationships page alone, without quote marks, were the four lines of item 10, which § 8 checks by their words.
 */
function olderPageWordsIn(text: string, listed: readonly { citation: ListedCitation }[] = all): string[] {
  return OLDER_PAGES.flatMap(({ url, lines: known }) => {
    const held = [...known, ...listed.filter((l) => l.citation.url === url).flatMap((l) => rawQuotes(l.citation))];
    const lines = known.filter((line) => text.includes(line));
    const runs = quoted(text).filter(
      (run) => held.includes(run) || (wordCount(run) >= OLDER_PAGE_MIN_WORDS && held.some((q) => q.includes(run))),
    );
    return [...lines, ...runs];
  });
}
/**
 * Every structure a person can pick: a record, so a structure added to StructureEntityType fails `tsc` here until it is
 * listed, and the test below checks it against the structure ladder too.
 */
const EVERY_STRUCTURE: Record<StructureEntityType, true> = {
  "sole-prop": true,
  "sole-prop-gst": true,
  ccpc: true,
  holdco: true,
  "family-trust": true,
};
const STRUCTURES = Object.keys(EVERY_STRUCTURE) as StructureEntityType[];

const node = (id: string) => {
  const n = cfeNodesV2026.find((x) => x.id === id);
  expect(n, id).toBeDefined();
  return n!;
};
const sred = (): GrantProgram => grantProgramsV2026.find((g) => g.id === "grant-sred")!;
const risk = (id: string) => {
  const r = riskEntriesV2026.find((x) => x.id === id);
  expect(r, `${id} is a live risk read`).toBeDefined();
  return r!;
};

/** An invented Alberta idea doing R&D and software work, the shape of tests/brain-evaluate.spec.ts's golden scenario. */
const idea = (change: Partial<EvaluationProfile> = {}): EvaluationProfile => ({
  goals: [],
  ventureType: "service",
  activityTags: ["AI / ML / R&D", "Software / SaaS"],
  province: "AB",
  employmentStatus: "employee",
  structure: "sole-prop",
  targetRevenueY1: 30_000,
  targetRevenueY3: 90_000,
  hireFirst: false,
  capitalPurchasePlanned: true,
  ...change,
});
const card = (p: EvaluationProfile, id: string) => {
  const c = evaluateProfile(p, { today: TODAY }).unlocks.find((u) => u.id === id);
  expect(c, `${id} for ${p.structure} in ${p.province}`).toBeDefined();
  return c!;
};

describe("1. The only reads since the reading list's day are the maintainer's", () => {
  // Until 2026-10-27 no citation claimed a read made on the reading list's day or after. His reads came with the
  // reading list he sent back: 31 pages read in full on 2026-10-25, recorded with readBy "person" on every citation of
  // those pages (tests/maintainer-reads.spec.ts), and on no other.
  it("every citation that claims a read made on the reading list's day or after is the maintainer's of 2026-10-25, of a page he read", () => {
    const hisPages = new Set(MAINTAINER_READ_PAGES.map((p) => p.url));
    const claims = all.filter(({ citation }) => citation.lastVerified !== undefined && citation.lastVerified >= LIST_DAY);
    expect(claims.length).toBeGreaterThan(0);
    const other = claims.filter(
      ({ citation }) => citation.lastVerified !== MAINTAINER_READ_DAY || citation.readBy !== "person" || !hisPages.has(citation.url),
    );
    expect(other.map(({ where, citation }) => `${where}: ${citation.url} (${citation.lastVerified}, ${citation.readBy ?? "no reader"})`)).toEqual([]);
  });
});

describe("2. The words the reading list's tool found on 2026-10-23", () => {
  it.each(TOOL_CHECKS_OF_THE_DAY)("$where keeps what the tool found on its page that day: $url", ({ where, url, quotes }) => {
    const c = citationOf(where, url);
    expect(c.toolCheck?.checkedOn, `${where}: ${url}`).toBe(LIST_DAY);
    expect(sorted(rawQuotes(c)), `${where}: ${url}`).toEqual(sorted(quotes));
  });

  it("the same pages under entries the reading list didn't correct keep the check they had", () => {
    // A guard (only the entries the maintainer checked; his answer of 2026-10-24): the Class 50 write-off's T4002
    // chapter, structure-ccpc's T2 guide, the roads' payroll and records lines and the like keep their own checks, as
    // they were before. A map stage's own citations are listed again under each road that draws the stage (the same
    // objects).
    const corrected = new Set(TOOL_CHECKS_OF_THE_DAY.map((t) => t.where));
    const stageIds = [...corrected].filter((w) => w.startsWith("cfe ")).map((w) => w.slice("cfe ".length));
    const roadCopy = (where: string) => stageIds.some((id) => new RegExp(`^roads \\S+ ${id}$`).test(where));
    // Road 0's lines on CCPCs, which his answer on item 10 rested on newer pages (§ 8), the T2 guide among them.
    const item10Line = (where: string) => ITEM_10_ROAD_LINES.some(({ id }) => new RegExp(`^roads \\S+ ${id}$`).test(where));
    const pages = new Set(TOOL_CHECKS_OF_THE_DAY.map((t) => t.url));
    const others = all
      .filter(({ where, citation }) => pages.has(citation.url) && !corrected.has(where) && !roadCopy(where) && !item10Line(where))
      .map(({ where, citation }) => ({
        where,
        url: citation.url,
        checkedOn: citation.toolCheck?.checkedOn ?? null,
        quotes: citation.toolCheck?.quotes.length ?? 0,
      }));
    const key = (o: { where: string; url: string }) => `${o.where} ${o.url}`;
    expect(others.map(key).sort()).toEqual(OTHER_CITATIONS_BEFORE.map(key).sort());
    for (const before of OTHER_CITATIONS_BEFORE) expect(others.find((o) => key(o) === key(before)), key(before)).toEqual(before);
    expect(rawQuotes(citationOf("structure structure-ccpc", PAGE.t2Guide))).toEqual(STRUCTURE_CCPC_T2_QUOTES);
  });

  it("no worked example, page disclaimer or reading-list label is kept as words an entry relies on", () => {
    // A guard: the rate table's examples (a furniture store in Ontario, an electronics store in Manitoba), the
    // relationships page's worked example, What's new's disclaimer and the list's bracketed labels are not the rule.
    const kept = all.flatMap(({ where, citation }) => rawQuotes(citation).map((q) => ({ where, q })));
    for (const never of NEVER_KEPT) expect(kept.filter(({ q }) => q.includes(never)).map((k) => k.where), never).toEqual([]);
  });
});

describe("3. SR&ED: the credit's rates in the CRA's words", () => {
  it("a sole proprietor's card never calls the 15% non-refundable, and quotes the CRA's basic rate, its refundable line and the policy page's 40% line", () => {
    for (const structure of ["sole-prop", "sole-prop-gst"] as const) {
      const c = card(idea({ structure }), "grant-sred");
      expect(c.payoff, structure).not.toMatch(/non-refundable/i);
      expect(c.payoff, structure).toContain("this may be worth 15%.");
      // The maintainer's answer of 2026-10-29 (his reading page, item 2): the card quotes the newer page's line, "it
      // should always be the newer page because it's more up-to-date". Until then the card quoted only
      // [BASIC_RATE, SOME_REFUNDABLE].
      expect(quoted(c.payoff), structure).toEqual([BASIC_RATE, SOME_REFUNDABLE, POLICY_INDIVIDUAL_40]);
      // Outside the quotes, only whose words they are (his answer of 2026-10-29): DotAmi never says in its own words
      // that a sole proprietor is "an individual (other than a trust)"; the CRA's line says who it is about.
      const note = sred().ratesByStructure!.find((r) => r.structure === structure)!.note ?? "";
      expect(ownWordsFlat(note), structure).toBe("The CRA: The CRA's SR&ED Investment Tax Credit Policy:");
      // Whole, so each label stands before its own quotes: the policy page's label on the rates page's line must fail.
      expect(note, structure).toBe(
        `The CRA: “${BASIC_RATE}” “${SOME_REFUNDABLE}” The CRA's SR&ED Investment Tax Credit Policy: “${POLICY_INDIVIDUAL_40}”`,
      );
      expect(ownWords(c.payoff), structure).not.toMatch(/individual|trust|40%/i);
      // The catalog still leaves refundability unsaid in DotAmi's words: `refundable` set would print a bare
      // "(refundable)" after the 15% (lib/brain/evaluate.ts), more than the CRA's "Generally … 40% of the unclaimed
      // balance" says.
      expect(sred().ratesByStructure!.find((r) => r.structure === structure)!.refundable, structure).toBeUndefined();
    }
  });

  it("every quote on the SR&ED card is held by one of its own sources: checked on 2026-10-23, or the policy page's lines on 2026-10-30", () => {
    // Until the maintainer's answer of 2026-10-29 every quote was held by a check of 2026-10-23. The policy page's 40%
    // line joined that day, and its list for corporations on 2026-10-30, held only by that page's own tool check: one
    // check of all its quotes, of the day scripts/check-quotes.mjs found them together.
    const policy = sred().citations.filter((c) => c.url === PAGE.sredItcPolicy && c.toolCheck?.checkedOn === POLICY_DAY);
    expect(policy, "grant-sred cites the SR&ED Investment Tax Credit Policy, checked on 2026-10-30").toHaveLength(1);
    const held = sred()
      .citations.filter((c) => c.toolCheck?.checkedOn === LIST_DAY)
      .flatMap((c) => c.toolCheck!.quotes);
    const heldByPolicy = policy.flatMap((c) => c.toolCheck!.quotes);
    for (const rate of sred().ratesByStructure!) {
      const runs = quoted(rate.note ?? "");
      expect(runs.length, `${rate.structure}: ${rate.note}`).toBeGreaterThan(0);
      for (const run of runs) expect(inQuotes(run, [...held, ...heldByPolicy]), `${rate.structure}: “${run}”`).toBe(true);
    }
    // In the page's order: the list for corporations (items 1 to 4), then the individual's line (item 5).
    expect(heldByPolicy).toEqual([...POLICY_CCPC_LIST, POLICY_INDIVIDUAL_40]);
    // Planted control: the note before the correction quoted nothing.
    expect(quoted("Unincorporated claimants earn the basic 15% non-refundable ITC.")).toEqual([]);
  });

  it("the CRA's SR&ED Investment Tax Credit Policy is under the card, checked by a tool on 2026-10-30 and read by no one yet", () => {
    // Added on the maintainer's answer of 2026-10-29. Titled with the page's own main heading, which
    // scripts/check-quotes.mjs found with the card's lines each time; the title isn't words the card relies on, so the
    // tool check holds only the lines the cards quote: since 2026-10-30 one check of the 40% line and the list for
    // corporations, found in one run that day (until then a check of 2026-10-29 holding the 40% line alone). Nobody
    // has read the page in full, so it shows amber.
    const c = citationOf("grants grant-sred", PAGE.sredItcPolicy);
    expect(c.title).toBe("SR&ED Investment Tax Credit Policy");
    const inCatalog = sred().citations.find((x) => x.url === PAGE.sredItcPolicy);
    expect(inCatalog?.authority).toBe("CRA");
    expect(inCatalog?.jurisdiction).toBe("CA");
    const quotes = [...POLICY_CCPC_LIST, POLICY_INDIVIDUAL_40];
    expect(c.toolCheck).toEqual({ checkedOn: POLICY_DAY, quotes });
    expect(c.lastVerified).toBeUndefined();
    expect(c.readBy).toBeUndefined();
    expect(howChecked(c)).toEqual({ kind: "tool", on: POLICY_DAY, quotes });
    expect(isCheckFirst(c)).toBe(true);
    // One click away under the card it backs, at every structure the card shows for.
    for (const structure of ["sole-prop", "sole-prop-gst", "ccpc"] as const) {
      expect(card(idea({ structure }), "grant-sred").citations.map((x) => x.url), structure).toContain(PAGE.sredItcPolicy);
    }
  });

  it("the older CRA page's “non-refundable” 15% is on no SR&ED card or fork", () => {
    // A guard (the maintainer's answer of 2026-10-29: the newer page where the two disagree). It held on the code
    // before too: since 2026-10-24 no card quotes that line.
    for (const structure of ["sole-prop", "sole-prop-gst", "ccpc"] as const) {
      const c = card(idea({ structure }), "grant-sred");
      expect(`${c.payoff} ${c.fork?.note ?? ""}`, structure).not.toContain(OLDER_NON_REFUNDABLE);
    }
  });

  it("the older CRA pages are quoted on no card or fork, no map stage and no road, none of their lines, and stay listed with their checks", () => {
    // The maintainer's answer of 2026-10-30 (his reading page, item 9, the option labelled "The whole older page"):
    // where two official pages disagree, the older one is listed but quoted nowhere, none of its lines
    // (docs/engines/citations.md, § Rules, rule 8). Until then the relationships page's 35% line stood on the
    // corporation's card, in the fork that copies the card's note, and as Incorporation for liability/SR&ED's 35%. Since
    // his answer of 2026-11-01 (item 10, Part A) the SR&ED glossary is held to the same: an older page that disagrees
    // ($3 million where the newer pages give $6 million), whose 35% line SR&ED deepening quoted until then. Every
    // structure a person can pick, the holding company and the family trust too (until the review of 2026-10-31 only
    // the first three): the SR&ED card shows at each.
    expect(sorted(STRUCTURES)).toEqual(sorted(structureLadderV2026.map((s) => s.entityType)));
    expect(STRUCTURES).toHaveLength(5);
    const texts: { where: string; text: string }[] = [];
    for (const structure of STRUCTURES) {
      for (const u of evaluateProfile(idea({ structure }), { today: TODAY }).unlocks) {
        texts.push({ where: `card ${u.id} (${structure})`, text: ownStringsIn(u).join("\n") });
      }
    }
    expect(texts.filter((t) => t.where.startsWith("card grant-sred "))).toHaveLength(5);
    for (const stage of cfeNodesV2026) texts.push({ where: `stage ${stage.id}`, text: ownStringsIn(stage).join("\n") });
    for (const road of roadsV2026) texts.push({ where: `road ${road.id}`, text: ownStringsIn(road).join("\n") });
    for (const { where, text } of texts) expect(olderPageWordsIn(text), where).toEqual([]);
    // Still listed, with the checks they had. The relationships page: under the SR&ED card and both SR&ED stages (road 0
    // and the federal steps draw the stages' sources); road 0's two lines on CCPCs cited it until item 10, and rest on
    // newer pages since (§ 8). The glossary: under SR&ED deepening, and the same stage on both roads. The maintainer's
    // read of 2026-10-25 wins on screen for each, so no check's words are drawn.
    const listed = all.filter((l) => l.citation.url === PAGE.relationships);
    expect(sorted(listed.map((l) => l.where))).toEqual(
      sorted([
        "grants grant-sred",
        ...["cfe", "roads road-starting-any-business-ab", "roads road-federal-steps-ca"].flatMap((at) => [
          `${at} stage-3b-incorporation-liability-sred`,
          `${at} stage-4-sred-deepening`,
        ]),
      ]),
    );
    const glossary = all.filter((l) => l.citation.url === PAGE.sredGlossary);
    expect(sorted(glossary.map((l) => l.where))).toEqual(
      sorted(["cfe", "roads road-starting-any-business-ab", "roads road-federal-steps-ca"].map((at) => `${at} stage-4-sred-deepening`)),
    );
    for (const { where, citation } of [...listed, ...glossary]) {
      expect(howChecked(citation), where).toEqual({ kind: "person", on: MAINTAINER_READ_DAY });
      expect(rawQuotes(citation).length, where).toBeGreaterThan(0);
    }
    // The glossary's check keeps its 35% line, the words his request of 2026-10-27 had it find, though no line quotes it.
    for (const { where, citation } of glossary) expect(rawQuotes(citation), where).toContain(GLOSSARY_ENHANCED);
    // Planted controls: the CCPC's note as it was before his answer is caught, and so is the page's line on CCPCs'
    // refunds in quote marks; the note as it is now is not, nor is Incorporation for liability/SR&ED's 35% as it is now.
    expect(olderPageWordsIn(CCPC_NOTE_BEFORE_ITEM_9)).toEqual([CCPC_ENHANCED, CCPC_ENHANCED]);
    expect(olderPageWordsIn(`The CRA: “${OLDER_SOME_CCPCS_REFUNDABLE}”`)).not.toEqual([]);
    expect(olderPageWordsIn(CCPC_NOTE_WHOLE)).toEqual([]);
    expect(olderPageWordsIn(`The CRA's SR&ED Investment Tax Credit Policy: “${POLICY_CCPC_ENHANCED}”`)).toEqual([]);
    // A part of one of its lines counts from six words: a 6-word run of the 35% line is caught, the same line's first
    // five words are not, and “private corporation”, a phrase any page on corporations may use, is not.
    const sixWords = "Some CCPCs may earn an ITC";
    expect(wordCount(sixWords)).toBe(OLDER_PAGE_MIN_WORDS);
    expect(CCPC_ENHANCED.startsWith(sixWords)).toBe(true);
    expect(olderPageWordsIn(`The CRA: “${sixWords}”`)).toEqual([sixWords]);
    expect(olderPageWordsIn("The CRA: “Some CCPCs may earn an”")).toEqual([]);
    expect(olderPageWordsIn("The CRA: “private corporation”")).toEqual([]);
    // A whole held quote counts at any length. “a private corporation” was one, in road 0's check of the page until
    // item 10; no citation holds it now, so it is planted on a copy of a citation of the page, and caught there only.
    expect(all.some((l) => l.citation.url === PAGE.relationships && rawQuotes(l.citation).includes("a private corporation"))).toBe(false);
    const relationships = citationOf("cfe stage-4-sred-deepening", PAGE.relationships);
    const plantedShort = [...all, { citation: { ...relationships, toolCheck: { checkedOn: "2026-10-12", quotes: ["a private corporation"] } } }];
    expect(olderPageWordsIn("The CRA: “a private corporation”", plantedShort)).toEqual(["a private corporation"]);
    expect(olderPageWordsIn("The CRA: “a private corporation”")).toEqual([]);
    // The page's sentences road 0's checks held until item 10 are caught anywhere, in quote marks or not.
    const shareLimit = "When one CCPC is associated with other CCPCs, these corporations must share the business limit.";
    expect(olderPageWordsIn(`The CRA: “${shareLimit}”`)).toEqual([shareLimit, shareLimit]);
    expect(olderPageWordsIn(`they say ${shareLimit}`)).toEqual([shareLimit]);
    // Road 0's lines as they are now quote the newer pages, some in the same words as a form's title the older page
    // used (T2SCH49's), and are not caught; the lines as they read before item 10 had no quote marks, so § 8 checks them.
    for (const { text } of ITEM_10_ROAD_LINES) expect(olderPageWordsIn(text), text.slice(0, 60)).toEqual([]);
    // The glossary, the same rules (item 10, Part A): SR&ED deepening's 35% as it was until then is caught, its line
    // anywhere and its quoted run; a 6-word part of the line is caught, its first five words are not; the entry's $3
    // million sentence is caught, quoted or not; a whole held quote of its other entries is caught; the stage's 35% as it
    // is now is not.
    expect(olderPageWordsIn(`The CRA's SR&ED glossary: “${GLOSSARY_ENHANCED}”`)).toEqual([GLOSSARY_ENHANCED, GLOSSARY_ENHANCED]);
    const glossarySix = "Some Canadian-controlled private corporations (CCPCs) that";
    expect(wordCount(glossarySix)).toBe(OLDER_PAGE_MIN_WORDS);
    expect(GLOSSARY_ENHANCED.startsWith(glossarySix)).toBe(true);
    expect(olderPageWordsIn(`The CRA: “${glossarySix}”`)).toEqual([glossarySix]);
    expect(olderPageWordsIn("The CRA: “Some Canadian-controlled private corporations (CCPCs)”")).toEqual([]);
    expect(olderPageWordsIn(`The CRA: “${GLOSSARY_THREE_MILLION}”`)).toEqual([GLOSSARY_THREE_MILLION, GLOSSARY_THREE_MILLION]);
    expect(olderPageWordsIn(`the glossary says ${GLOSSARY_THREE_MILLION}`)).toEqual([GLOSSARY_THREE_MILLION]);
    const routine = "quality control or routine testing of materials, devices, products or processes";
    expect(glossary.every(({ citation }) => rawQuotes(citation).includes(routine))).toBe(true);
    expect(olderPageWordsIn(`The CRA's SR&ED glossary: “${routine}”`)).toEqual([routine]);
    expect(olderPageWordsIn(`The CRA's SR&ED Investment Tax Credit Policy: “${POLICY_CCPC_ENHANCED}”`)).toEqual([]);
  });

  it("the time words on the SR&ED card are the CRA's, inside the policy page's quotes under its label, never DotAmi's", () => {
    // A guard (NO TIMES): none in DotAmi's own words. The sole proprietor's card holds none, quotes included: the 40% line's "in the
    // current year" is no wait to the check. Since 2026-10-30 the CCPC's note (on the corporation's card, and in the fork
    // on a sole proprietor's) quotes the policy page's list for corporations, whose own "in the year" the check does
    // see: those words are the CRA's, inside the list's quote marks, under the page's title. Taken out, nothing is left.
    for (const structure of ["sole-prop", "sole-prop-gst"] as const) {
      const c = card(idea({ structure }), "grant-sred");
      expect(findTimeWords(c.payoff), `${structure}: ${c.payoff}`).toEqual([]);
    }
    for (const structure of ["sole-prop", "sole-prop-gst", "ccpc"] as const) {
      const c = card(idea({ structure }), "grant-sred");
      for (const text of [c.payoff, c.fork?.note ?? ""]) {
        expect(findTimeWords(ownWords(text)), `${structure}: ${text}`).toEqual([]);
        expect(findTimeWords(withoutPolicyList(text)), `${structure}: ${text}`).toEqual([]);
      }
    }
    // Planted controls: the check does catch the list's year as a wait, so what lets the card through is the list's
    // quote marks; and the same words outside quote marks are caught as DotAmi's.
    expect(findTimeWords(POLICY_CCPC_LIST.join(" "))).not.toEqual([]);
    expect(findTimeWords(withoutPolicyList(`The CRA's SR&ED Investment Tax Credit Policy: ${POLICY_CCPC_LIST[2]}`))).not.toEqual([]);
  });

  it("the CCPC's note quotes What's new's $6 million and the policy page's list for corporations whole, the limit in the CRA's and the Act's words, and no line sends the person to an advisor", () => {
    const ccpc = sred().ratesByStructure!.find((r) => r.structure === "ccpc")!;
    expect(ccpc.note).not.toMatch(/advisor/i);
    // Since the maintainer's answer of 2026-10-30 (his reading page, item 8), the policy page's list for corporations,
    // whole and in order, labelled with the page's title as the sole proprietor's line is (until then What's new's line
    // and the relationships page's 35% only). Since his answer on item 9 the same day the relationships page's line is
    // gone, the older page quoted nowhere: the note starts with What's new's line.
    expect(quoted(ccpc.note ?? "")).toEqual([LIMIT_SIX_MILLION, ...POLICY_CCPC_LIST]);
    expect(ownWordsFlat(ccpc.note ?? "")).toBe("The CRA's What's new for corporations: The CRA's SR&ED Investment Tax Credit Policy: …");
    expect(ccpc.note).toBe(CCPC_NOTE_WHOLE);
    // The card's 35% rests on the newer page's list (his item 9 option): its lines on the enhanced rate say 35%.
    const ccpcCard = card(idea({ structure: "ccpc" }), "grant-sred");
    expect(ccpcCard.payoff).toBe(`If eligible as a CCPC, this may be worth 35%. ${CCPC_NOTE_WHOLE}`);
    expect(quoted(ccpcCard.payoff).filter((line) => line.includes("enhanced ITC rate of 35%")).length).toBeGreaterThan(0);
    // The two pages for the limit, checked by a tool on the list's day, and read in full by the maintainer on 2026-10-25
    // (until 2026-10-27 a tool check only, with no read on record).
    for (const url of [PAGE.whatsNew, PAGE.act127]) {
      const c = citationOf("grants grant-sred", url);
      expect(c.toolCheck?.checkedOn, url).toBe(LIST_DAY);
      expect(howChecked(c), url).toEqual({ kind: "person", on: MAINTAINER_READ_DAY });
    }
    // Every dollar amount the card shows is inside a quote.
    const shown = [card(idea({ structure: "ccpc" }), "grant-sred").payoff, card(idea(), "grant-sred").fork?.note ?? ""];
    for (const text of shown) expect(ownWords(text).match(/\$\s?\d/g) ?? [], text).toEqual([]);
  });

  it("a sole proprietor's fork names the 35%, the $6 million and the policy page's list for corporations whole, in the CRA's words, and nothing of the older page", () => {
    for (const structure of ["sole-prop", "sole-prop-gst"] as const) {
      const c = card(idea({ structure }), "grant-sred");
      const fork = c.fork;
      expect(fork, structure).toBeDefined();
      expect(fork!.note, structure).not.toMatch(/advisor/i);
      // The fork copies the CCPC's note (lib/brain/evaluate.ts), so since the maintainer's answer of 2026-10-30 it shows
      // the policy page's list for corporations, every line in the page's order: beside the individual's 40% on the
      // same card, a part of the list would read as the whole. Until then it quoted the relationships page's 35% and
      // What's new's line only; since his answer on item 9 the same day the relationships page's line is gone.
      expect(quoted(fork!.note), structure).toEqual([LIMIT_SIX_MILLION, ...POLICY_CCPC_LIST]);
      expect(ownWordsFlat(fork!.note), structure).toBe(
        "A CCPC may access 35% treatment instead of 15%. The CRA's What's new for corporations: The CRA's SR&ED Investment Tax Credit Policy: …",
      );
      expect(fork!.note, structure).not.toContain(CCPC_ENHANCED);
      expect(fork!.note, structure).toBe(`A CCPC may access 35% treatment instead of 15%. ${CCPC_NOTE_WHOLE}`);
      // The card's own line keeps the individual's 40% and quotes none of the list; the fork quotes the list and not the
      // individual's line. The trust's line and the block after the list are on neither.
      expect(quoted(c.payoff), structure).toEqual([BASIC_RATE, SOME_REFUNDABLE, POLICY_INDIVIDUAL_40]);
      expect(quoted(fork!.note), structure).not.toContain(POLICY_INDIVIDUAL_40);
      for (const never of POLICY_NEVER_QUOTED) expect(`${c.payoff} ${fork!.note}`, `${structure}: ${never}`).not.toContain(never);
    }
  });

  it("the CCPC's 35% is never called refundable in DotAmi's own words: only the policy page's list, quoted whole, says which corporation's credit is", () => {
    // The word rested only on the maintainer's read, which wasn't on record then (his answer 1 of 2026-10-24): the CRA's
    // “Some businesses may also earn a refundable ITC.” says neither which businesses nor which rate. Since 2026-10-30 the
    // policy page's list says it for each kind of corporation, inside its quote marks; `refundable` stays unset, since
    // lib/brain/evaluate.ts would print a bare "refundable" after the 35%, more than the list's lines say.
    expect(sred().ratesByStructure!.find((r) => r.structure === "ccpc")!.refundable).toBeUndefined();
    const shown = [card(idea({ structure: "ccpc" }), "grant-sred").payoff, card(idea(), "grant-sred").fork?.note ?? ""];
    for (const text of shown) {
      expect(ownWords(text), text).not.toMatch(/refundable/i);
      // The only "refundable" on the corporation's card and the fork is inside the list's own lines.
      expect(withoutPolicyList(text), text).not.toMatch(/refundable/i);
    }
    // Planted control: the fork as it read before is caught.
    expect(ownWords("A CCPC may access 35% refundable treatment instead of 15%.")).toMatch(/refundable/i);
  });

  it("no date of DotAmi's own reaches the SR&ED card: its one date is the CRA's, inside the list's line on ECPCs", () => {
    // A guard (NO TIMES): none in DotAmi's own words. The limit's start date is in no held quote, so no line on the card says it. Since
    // 2026-10-30 the policy page's list for corporations, quoted whole, carries the page's own date in its line on
    // ECPCs (“3) For ECPCs whose tax year begins after December 15, 2024:”), inside its quote marks under the page's
    // title; leaving that line out would quote a part of the list as the whole, and the maintainer kept it, the list
    // whole with its date (his answer of 2026-10-30, his reading page, item 9).
    for (const structure of ["sole-prop", "ccpc"] as const) {
      const c = card(idea({ structure }), "grant-sred");
      const text = `${c.payoff} ${c.fork?.note ?? ""}`;
      expect(ownWords(text), structure).not.toMatch(/\b20\d\d\b|on or after|beginning|begins/i);
      expect(withoutPolicyList(text), structure).not.toMatch(/\b20\d\d\b|on or after|beginning|begins/i);
      // The $6 million's own start-date line (Blocked, the SR&ED $6 million) is still quoted nowhere.
      expect(text, structure).not.toContain("the maximum expenditure limit is $6 million per year");
    }
    // Planted control: the list's line on ECPCs has a year the pattern sees.
    expect(POLICY_CCPC_LIST[9]).toMatch(/\b20\d\d\b/);
  });

  it("citations.md § Rules has rule 8: the card quotes the newer page, and the older page is listed and quoted nowhere, none of its lines", () => {
    // The maintainer's answers of 2026-10-29 ("it should always be the newer page because it's more up-to-date") and
    // 2026-10-30 (his reading page, items 8 and 9), written into the rules with his words; which page applies to which
    // case, and telling which of two pages is accurate and true, is research first, not built.
    const rules = readFlat("docs/engines/citations.md").split("## Rules")[1]!.split("## What people see")[0]!;
    const rule8 = rules.split(" 8. **Where two official pages disagree")[1] ?? "";
    expect(rules).toMatch(/8\. \*\*Where two official pages disagree, the card quotes the newer page\*\*/);
    // His picked options, word for word, each quoted as the option's own description, as on his page: item 8's, and
    // item 9's, its bold label named outside the quote marks (until the review of 2026-10-31 the label sat inside them,
    // joined to the description by a dash of DotAmi's own).
    expect(rule8).toContain("the option he picked: “The card shows the newer page; the older one is listed but not quoted.”");
    expect(rule8).toContain(`the option he picked, labelled *The whole older page*: “${ITEM_9_PICK}”`);
    expect(rule8).not.toContain("“The whole older page —");
    // His two notes, word for word: item 9's with his answer there, and item 8's, the "library" idea (until the review
    // of 2026-10-31 called his words "on the newer page").
    expect(rule8).toContain(`His note on item 9: “${ITEM_9_NOTE.replace(/\s+/g, " ")}”`);
    expect(rule8).toContain(
      "His note on item 8 (2026-10-30): “the newer page should generally outrank the old one, but maybe we could make a library that can tell the difference between the old and new pages and see which one applies to each specific case?”",
    );
    expect(rule8).not.toContain("His words of 2026-10-30 on the newer page");
    expect(rule8).toContain("The older page stays listed among the sources, with its own check, and is quoted nowhere, none of its lines");
    expect(rule8).toMatch(/which is accurate and true \(his "library" idea and his note on item 9\), is research first, .*; none of it is built\./);
    // As built, honestly: no card, stage or road quotes a line of either older page, and the two questions asked of him
    // on 2026-10-31 (his reading page, item 10) are answered, his picks quoted word for word, each option's description
    // under its bold label named outside the quote marks, as item 9's is. Until then the paragraph was "As built
    // (2026-10-31)" and listed the four lines in DotAmi's own words and the glossary's line as asked.
    const asBuilt = rule8.split("As built (2026-11-01):")[1] ?? "";
    expect(asBuilt).not.toBe("");
    expect(rule8).not.toContain("As built (2026-10-31):");
    expect(asBuilt).toContain("no card, map stage or road quotes any line of either");
    expect(asBuilt).toContain("his reading page, item 10");
    expect(asBuilt).toContain(`the option he picked, labelled *${ITEM_10_LABEL_A}*: “${ITEM_10_PICK_A}”`);
    expect(asBuilt).toContain(`the option he picked, labelled *${ITEM_10_LABEL_B}*: “${ITEM_10_PICK_B}”`);
    expect(asBuilt).toContain("The CRA's SR&ED glossary (its page date 2026-05-22)");
    expect(asBuilt).toContain("$3 million");
    expect(asBuilt).toContain("$6 million");
    // What was built for each, and what came off, named.
    for (const id of ["`dw-start-incsred-ccpc`", "`dw-start-incsred-associated`", "`dw-start-incsred-expenditure-limit`"]) {
      expect(asBuilt, id).toContain(id);
    }
    expect(asBuilt).toContain("came off");
    expect(asBuilt).toContain("Nothing of item 10 is still asked of him.");
    expect(asBuilt).not.toContain("Still in DotAmi's own words, without quote marks, and shown:");
    expect(rule8).not.toContain("asked of him on 2026-10-31");
    // The tax impact it named then is gone from the stage.
    expect(node("stage-4-sred-deepening").taxImpact).not.toContain(OWN_WORDS_BEFORE_ITEM_10.taxImpact);
    // The reading built before his answer on item 9 is gone, and so is the open question.
    expect(rule8).not.toContain("its lines that don't disagree stay quoted");
    expect(rule8).not.toContain("asked of the maintainer");
  });

  it("the docs give his answers on item 9, no longer the questions: the list kept whole with the CRA's date, and the older page quoted nowhere", () => {
    // Until then the docs said both were asked of him on 2026-10-30. The $6 million's start-date line (§ Blocked, item
    // 5) is another line, and it still waits for his call.
    for (const file of ["docs/engines/citations.md", "docs/engines/grants.md", "CHANGELOG.md", "docs/task-list.md"]) {
      expect(readFlat(file), file).not.toMatch(/asked (of (the maintainer|him) )?on 2026-10-30/);
    }
    const blocked = readFlat("docs/engines/citations.md").split("### Blocked: what each needs")[1]!.split("### Outside the list")[0]!;
    const item4 = blocked.split(" 4. **SR&ED, refunded or not.**")[1]!.split(" 5. **SR&ED's $6 million.**")[0]!;
    const item5 = blocked.split(" 5. **SR&ED's $6 million.**")[1]!.split(" 6. **")[0]!;
    expect(item4).toContain("his reading page, item 9");
    expect(item4).toContain("the list stays whole, the CRA's date in its item 3 with it");
    expect(item5).toContain("still waits for his call");
  });

  it("citations.md and the task list close the CCPC's part of SR&ED, refunded or not", () => {
    const blocked = readFlat("docs/engines/citations.md").split("### Blocked: what each needs")[1]!.split("### Outside the list")[0]!;
    expect(blocked).toContain("**A CCPC's enhanced 35%: settled.**");
    expect(blocked).not.toContain("still blocked, the maintainer's call");
    const tasks = readFlat("docs/task-list.md");
    expect(tasks).toMatch(/- \[x\] SR&ED refunded or not, a CCPC's enhanced 35%/);
    expect(tasks).not.toMatch(/- \[ \] SR&ED refunded or not, a CCPC's enhanced 35%/);
  });

  it("Incorporation for liability/SR&ED's 35% quotes the newest page's own sentence, from its own citation of the policy page, checked by a tool on 2026-10-31", () => {
    // Until the maintainer's answer of 2026-10-30 (his reading page, item 9: the whole older page quoted nowhere) its 35%
    // quoted the relationships page; that day's change moved it to the SR&ED glossary's line, which the review of
    // 2026-10-31 found is an older page that disagrees too (its page date 2026-05-22; its same entry gives a $3 million
    // threshold, the policy page of 2026-10-07 and What's new of 2026-06-12 give $6 million). So it quotes the policy
    // page's section 1.1, under the page's title, as the SR&ED card labels the page's lines.
    const id = "stage-3b-incorporation-liability-sred";
    const estimate = node(id).financialImpact.estimates.find((e) => e.value === "35%");
    expect(estimate, id).toBeDefined();
    expect(estimate!.label).toBe("Enhanced SR&ED ITC reference");
    expect(estimate!.basis).toBe(`The CRA's SR&ED Investment Tax Credit Policy: “${POLICY_CCPC_ENHANCED}”`);
    expect(estimate!.basis).not.toContain(GLOSSARY_ENHANCED);
    // Held by the stage's own citation of the page: titled with the page's main heading, one tool check of the day the
    // script found the sentence, holding that line only. Nobody has read the page in full, so it is amber, check first.
    const policy = citationOf(`cfe ${id}`, PAGE.sredItcPolicy);
    expect(policy.title).toBe("SR&ED Investment Tax Credit Policy");
    expect(policy.toolCheck).toEqual({ checkedOn: POLICY_STAGE_3B_DAY, quotes: [POLICY_CCPC_ENHANCED] });
    expect(policy.lastVerified).toBeUndefined();
    expect(policy.readBy).toBeUndefined();
    expect(howChecked(policy)).toEqual({ kind: "tool", on: POLICY_STAGE_3B_DAY, quotes: [POLICY_CCPC_ENHANCED] });
    expect(isCheckFirst(policy)).toBe(true);
    const inCatalog = node(id).citations.find((c) => c.url === PAGE.sredItcPolicy);
    expect(inCatalog?.authority).toBe("CRA");
    expect(inCatalog?.jurisdiction).toBe("CA");
    // The glossary is no longer among the stage's sources (it was for that one day, for the line now gone); the
    // relationships page still is, with its check of 2026-10-23 (§ 2), and Federal incorporation.
    expect(citationsAt(`cfe ${id}`).filter((c) => c.url === PAGE.sredGlossary)).toEqual([]);
    expect(rawQuotes(citationOf(`cfe ${id}`, PAGE.relationships))).toEqual([CCPC_ENHANCED]);
    expect(citationsAt(`cfe ${id}`).map((c) => c.url)).toEqual([
      PAGE.relationships,
      "https://ised-isde.canada.ca/site/corporations-canada/en/federal-incorporation",
      PAGE.sredItcPolicy,
    ]);
    // Both roads that draw the stage show the same sources under its step: road 0 and the federal steps.
    for (const road of ["road-starting-any-business-ab", "road-federal-steps-ca"]) {
      const where = `roads ${road} ${id}`;
      expect(citationOf(where, PAGE.sredItcPolicy).toolCheck, where).toEqual({ checkedOn: POLICY_STAGE_3B_DAY, quotes: [POLICY_CCPC_ENHANCED] });
      expect(citationsAt(where).filter((c) => c.url === PAGE.sredGlossary), where).toEqual([]);
    }
    // No time of DotAmi's own, and the quote holds none either.
    expect(findTimeWords(estimate!.basis)).toEqual([]);
  });

  it("SR&ED deepening's 35% quotes the policy page's own sentence, from the stage's own citation of the policy page, checked by a tool on 2026-11-01", () => {
    // The maintainer's answer of 2026-11-01 (his reading page, item 10, Part A, "Apply the rule: quote the newer policy
    // page's line"). From 2026-10-27 until then it quoted the SR&ED glossary's line, the line he had asked for, from an
    // older page that disagrees with the newer ones ($3 million against $6 million). Now the same sentence
    // Incorporation for liability/SR&ED's 35% quotes, under the page's title.
    const id = "stage-4-sred-deepening";
    const estimate = node(id).financialImpact.estimates.find((e) => e.value === "35%");
    expect(estimate, id).toBeDefined();
    expect(estimate!.label).toBe("Enhanced ITC reference");
    expect(estimate!.basis).toBe(`The CRA's SR&ED Investment Tax Credit Policy: “${POLICY_CCPC_ENHANCED}”`);
    expect(estimate!.basis).not.toContain(GLOSSARY_ENHANCED);
    expect(estimate!.basis).not.toContain("$3 million");
    // Held by the stage's own citation of the page, as on Incorporation for liability/SR&ED: titled with the page's main
    // heading, no read, one tool check of 2026-11-01 holding the sentence the stage quotes from the page (its 35%, and
    // the tax impact's first quote, § 8). Until the review of the same day it held the tax impact's sentence from
    // section 3.0 too, one side of a two-sided passage; the script found the sentence again alone that day. Amber.
    const policy = citationOf(`cfe ${id}`, PAGE.sredItcPolicy);
    expect(policy.title).toBe("SR&ED Investment Tax Credit Policy");
    expect(policy.toolCheck).toEqual({ checkedOn: ITEM_10_DAY, quotes: [POLICY_CCPC_ENHANCED] });
    expect(policy.lastVerified).toBeUndefined();
    expect(policy.readBy).toBeUndefined();
    expect(howChecked(policy)).toEqual({ kind: "tool", on: ITEM_10_DAY, quotes: [POLICY_CCPC_ENHANCED] });
    expect(isCheckFirst(policy)).toBe(true);
    const inCatalog = node(id).citations.find((c) => c.url === PAGE.sredItcPolicy);
    expect(inCatalog?.authority).toBe("CRA");
    expect(inCatalog?.jurisdiction).toBe("CA");
    // The glossary stays listed under the stage, with its check of 2026-10-27 and the maintainer's read winning on
    // screen, and is quoted nowhere (§ 3, the older pages); so does the relationships page. The policy page is fourth,
    // and What's new, for the tax impact's line on the limit since the review of 2026-11-01 (§ 8), fifth.
    const glossary = citationOf(`cfe ${id}`, PAGE.sredGlossary);
    expect(glossary.toolCheck?.checkedOn).toBe("2026-10-27");
    expect(rawQuotes(glossary)).toContain(GLOSSARY_ENHANCED);
    expect(howChecked(glossary)).toEqual({ kind: "person", on: MAINTAINER_READ_DAY });
    expect(rawQuotes(citationOf(`cfe ${id}`, PAGE.relationships))).toEqual([CCPC_ENHANCED]);
    expect(citationsAt(`cfe ${id}`).map((c) => c.url)).toEqual([
      "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-claim.html",
      PAGE.sredGlossary,
      PAGE.relationships,
      PAGE.sredItcPolicy,
      PAGE.whatsNew,
    ]);
    // Both roads that draw the stage show the same sources under its step.
    for (const road of ["road-starting-any-business-ab", "road-federal-steps-ca"]) {
      const where = `roads ${road} ${id}`;
      expect(citationOf(where, PAGE.sredItcPolicy).toolCheck, where).toEqual({ checkedOn: ITEM_10_DAY, quotes: [POLICY_CCPC_ENHANCED] });
      expect(howChecked(citationOf(where, PAGE.sredGlossary)), where).toEqual({ kind: "person", on: MAINTAINER_READ_DAY });
    }
    // The section 3.0 sentence ca18ae2 quoted beside it is held by no citation now, nor quoted on any stage or road.
    expect(all.filter((l) => rawQuotes(l.citation).includes(POLICY_ABOVE_LIMIT)).map((l) => l.where)).toEqual([]);
    const said = [...cfeNodesV2026.map((s) => ownStringsIn(s).join("\n")), ...roadsV2026.map((r) => ownStringsIn(r).join("\n"))];
    expect(said.filter((text) => text.includes(POLICY_ABOVE_LIMIT))).toEqual([]);
    expect(findTimeWords(estimate!.basis)).toEqual([]);
  });

  it("the docs give his answers on item 10, no longer the questions of 2026-10-31", () => {
    // Until 2026-11-01 the docs said the glossary's line and the four lines in DotAmi's own words were asked of him on
    // 2026-10-31.
    for (const file of ["docs/engines/citations.md", "docs/engines/grants.md", "CHANGELOG.md", "docs/task-list.md", "docs/ui-spec/cockpit/03-canvas.md"]) {
      expect(readFlat(file), file).not.toMatch(/asked (of (the maintainer|him) )?on 2026-10-31/);
    }
    // The CHANGELOG and the task list say what his answers changed, with his day.
    for (const file of ["CHANGELOG.md", "docs/task-list.md"]) {
      expect(readFlat(file), file).toContain("item 10");
      expect(readFlat(file), file).toContain("2026-11-01");
    }
  });

  it("the CRA's What are SR&ED tax incentives page says the maintainer read it, and keeps the list's tool check", () => {
    // Until 2026-10-27 it had no read on record and said checked by a tool.
    const c = citationOf("grants grant-sred", PAGE.sredWhatAre);
    expect(howChecked(c)).toEqual({ kind: "person", on: MAINTAINER_READ_DAY });
    expect(c.toolCheck?.checkedOn).toBe(LIST_DAY);
    // The page's own title (its main heading), found by scripts/check-quotes.mjs on 2026-10-27.
    expect(c.title).toBe("What are SR&ED tax incentives");
    // The program's own page keeps the check it had (2026-10-13), and has the maintainer's read too.
    const program = citationOf("grants grant-sred", PAGE.sredProgram);
    expect(program.toolCheck?.checkedOn).toBe("2026-10-13");
    expect(howChecked(program)).toEqual({ kind: "person", on: MAINTAINER_READ_DAY });
  });
});

describe("4. The map's stages say what their own pages say", () => {
  it("Sole Prop activation counts what the CRA counts toward the $30,000 tests, in its words, from a page the stage cites", () => {
    const stage = node("stage-1-sole-prop-activation");
    const said = stringsIn({ ...stage, citations: [] }).join("\n");
    expect(said).not.toMatch(/gross revenue/i);
    const note = stage.financialImpact.projectionNotes.find((n) => n.includes("$30,000"));
    expect(note, "a note on the $30,000 tests").toBeDefined();
    expect(quoted(note!)).toEqual([SOLE_PROP_COUNTS, ...NOT_COUNTED]);
    // Outside the quotes, only the tests' name and where they are quoted in full: no period of DotAmi's own.
    expect(ownWordsFlat(note!)).toBe(
      "For the CRA's two $30,000 small-supplier tests (quoted in full on Mandatory GST registration), its page says: And, on what is left out:",
    );
    const page = citationOf("cfe stage-1-sole-prop-activation", PAGE.whenToRegister);
    for (const run of quoted(note!)) expect(inQuotes(run, rawQuotes(page)), run).toBe(true);
    // The $30,000 said outside the quotes is in a quote of the same page.
    expect(rawQuotes(page).some((q) => q.includes("$30,000"))).toBe(true);
  });

  it("the page Sole Prop activation now cites keeps no new words, and the day they were found", () => {
    // Each quote is one another citation of the page holds from the same check, so its date is that check's.
    const page = citationOf("cfe stage-1-sole-prop-activation", PAGE.whenToRegister);
    const others = all.filter((l) => l.citation.url === PAGE.whenToRegister && !l.where.endsWith(" stage-1-sole-prop-activation"));
    for (const q of rawQuotes(page)) {
      const sameDay = others.filter((l) => l.citation.toolCheck?.checkedOn === page.toolCheck?.checkedOn && rawQuotes(l.citation).includes(q));
      expect(sameDay.length, q).toBeGreaterThan(0);
    }
  });

  it("Incorporating's business limit is a maximum, not automatic: “Up to $500,000”, in the T2 guide's words", () => {
    const estimate = node("stage-3a-incorporation-80k-net").financialImpact.estimates.find((e) => e.label.startsWith("Federal SBD business limit"));
    expect(estimate).toBeDefined();
    expect(estimate!.value).toBe("Up to $500,000");
    expect(quoted(estimate!.basis)).toEqual([THROUGHOUT, MAX_LIMIT]);
  });

  it("Hire first employee's payroll timing is the CRA's words, not a deadline of DotAmi's own", () => {
    const estimate = node("branch-hire-first-employee").financialImpact.estimates.find((e) => e.label === "Payroll account timing");
    expect(estimate).toBeDefined();
    expect(quoted(estimate!.value)).toEqual(["before the first remittance due date"]);
    expect(ownWords(estimate!.value).trim()).toBe("");
    expect(quoted(estimate!.basis)).toEqual([REGISTER_BEFORE, FIRST_REMITTANCE]);
  });

  it("every quoted run in any stage's own words is in a tool check of one of that stage's own citations", () => {
    // A guard: a quote on a stage has its page one click away, under Sources for this stage.
    for (const stage of cfeNodesV2026) {
      const held = stage.citations.flatMap((c) => rawQuotes(c));
      for (const run of stringsIn({ ...stage, citations: [] }).flatMap(quoted)) expect(inQuotes(run, held), `${stage.id}: “${run}”`).toBe(true);
    }
  });

  it("no time of DotAmi's own in the three stages' estimates and notes, once their quotes are taken out", () => {
    // A guard (NO TIMES): the CRA's “15th day of the month following the month …” is its words, quoted.
    for (const id of ["stage-1-sole-prop-activation", "stage-3a-incorporation-80k-net", "branch-hire-first-employee"]) {
      const { estimates, projectionNotes } = node(id).financialImpact;
      for (const line of [...estimates.flatMap((e) => [e.label, e.value, e.basis]), ...projectionNotes]) {
        expect(findTimeWords(ownWords(line)), `${id}: ${line}`).toEqual([]);
      }
    }
  });
});

describe("5. Sales tax and records", () => {
  it("the CRA's rate page carries no tool check where it is cited: its table isn't in the page's words", () => {
    // A guard: the one sentence a tool found there with each rate is a worked example, never the rate.
    const cited = all.filter((l) => l.citation.url === PAGE.rates);
    expect(cited.map((l) => l.where).sort()).toEqual(["compliance compliance-ab-no-pst", "compliance compliance-on-hst"]);
    for (const { where, citation } of cited) expect(citation.toolCheck, where).toBeUndefined();
  });

  it("the Alberta card says only what the CRA's table lists for Alberta, never what it makes simpler", () => {
    // Still DotAmi's own wording of the table's row: the table isn't in the page's words, so no tool can quote it.
    // Since 2026-10-29 it says only the row's 5%, the maintainer's answer about the row on 2026-10-28 ("5%"); "no
    // provincial sales tax" is no longer in the line (tests/rate-table-read.spec.ts).
    const line = "The CRA's table of GST/HST rates lists Alberta at 5%.";
    const rule = complianceRulesV2026.find((r) => r.id === "compliance-ab-no-pst")!;
    expect(rule.lensAnnotations.tax).toBe(line);
    const c = card(idea({ activityTags: [] }), "compliance-ab-no-pst");
    expect(c.payoff).toBe(line);
    expect(c.payoff).not.toMatch(/simplif/i);
  });

  it("the records line's six years are the CRA's “Generally” six years, as its typed fields say", () => {
    const c = recordRetentionV2026.citations[0]!;
    expect(c.url).toBe(PAGE.records);
    expect(rawQuotes(c)).toContain(GENERALLY_SIX_YEARS);
    expect(recordRetentionV2026.retentionYears).toBe(6);
    expect(GENERALLY_SIX_YEARS).toContain(`six years from ${recordRetentionV2026.countsFrom}.`);
  });

  it("it holds the same words every road's Keep your records step holds for that page", () => {
    const record = rawQuotes(recordRetentionV2026.citations[0]!);
    expect(record.length).toBeGreaterThan(0);
    const roads = all.filter((l) => l.where.startsWith("roads ") && l.citation.url === PAGE.records).flatMap((l) => rawQuotes(l.citation));
    expect(roads.length).toBeGreaterThan(0);
    for (const q of record) expect(roads, q).toContain(q);
  });

  it("everywhere DotAmi says six years from the end of the last tax year, it says “generally” too", () => {
    // A guard over the code (every screen already says it); the docs below are the fix.
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(path.join(repo, dir))) {
        const rel = path.join(dir, name);
        if (statSync(path.join(repo, rel)).isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(name)) files.push(rel);
      }
    };
    for (const dir of ["lib/engines", "lib/privacy", "components"]) walk(dir);
    for (const file of files) {
      read(file)
        .split("\n")
        .forEach((line, i) => {
          if (/six years from the end of the last tax year/i.test(line)) expect(line, `${file}:${i + 1}`).toMatch(/generally/i);
        });
    }
  });

  it("the docs that gave the CRA's six years without its “generally” now give it", () => {
    const dropped: [string, string][] = [
      ["docs/architecture/figures-privacy-review.md", "the CRA's wording is six years"],
      ["docs/architecture/expense-records.md", "section 4: six years"],
      ["docs/architecture/other-ways-to-build.md", "Keep records six years"],
      ["docs/architecture/other-ways-to-build.md", "records kept six years"],
    ];
    for (const [file, words] of dropped) expect(readFlat(file).includes(words), `${file} still says “${words}”`).toBe(false);
  });
});

describe("6. The risk reads say only what their sources say", () => {
  it("the home office read quotes the CRA's page, and no floor-area or exclusive-use claim of DotAmi's own", () => {
    const entry = risk("risk-home-office-percentage");
    const text = `${entry.why} ${entry.mitigation}`;
    expect(text).not.toMatch(/floor.?area|exclusive|measured|calculation|typical/i);
    // Outside the quotes, only the page's name and the words that join its conditions (s.18(12)'s "or"), exactly.
    expect(ownWordsFlat(entry.why)).toBe("The CRA's page on business-use-of-home expenses: if , or if .");
    // The page's sentence ends with its own full stop, inside the quote.
    expect(ownWordsFlat(entry.mitigation)).toBe("The same page, on the amount: it . On the business part:");
    // The page's sentence on working out the business part (once on citations.md § Blocked), quoted whole: "such as" keeps floor area
    // one reasonable basis among others, in the CRA's words.
    expect(quoted(entry.mitigation)).toContain(HOME_OFFICE_BUSINESS_PART);
    const page = citationOf("risk risk-home-office-percentage", PAGE.homeOffice);
    expect(page.toolCheck?.checkedOn).toBe("2026-10-27");
    const runs = quoted(text);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) expect(inQuotes(run, rawQuotes(page)), run).toBe(true);
    // No new words: each is one the home office write-off's citation of the page holds, from the same check.
    const writeOff = citationOf("writeoffs writeoff-home-office", PAGE.homeOffice);
    expect(page.toolCheck?.checkedOn).toBe(writeOff.toolCheck?.checkedOn);
    for (const q of rawQuotes(page)) expect(rawQuotes(writeOff), q).toContain(q);
  });

  it("the anti-avoidance read is s.245's own words, listed, with no advice or documentation and nothing joined between them", () => {
    const entry = risk("risk-ladder-skipping");
    expect(entry.gaarExposure).toBe(true);
    const page = citationOf("risk risk-ladder-skipping", PAGE.act245);
    // The glossary's check of 2026-10-12 found these words; the citation keeps that day.
    expect(page.toolCheck?.checkedOn).toBe("2026-10-12");
    for (const q of rawQuotes(page)) {
      expect(GLOSSARY_S245, q).toContain(q);
      expect(readFlat("docs/glossary.md").includes(q), `docs/glossary.md holds “${q}”`).toBe(true);
    }
    for (const line of [entry.why, entry.mitigation]) {
      expect(line).not.toMatch(/advice|document|business purpose|for.tax|unwind/i);
      const runs = quoted(line);
      expect(runs.length, line).toBeGreaterThan(0);
      for (const run of runs) expect(inQuotes(run, rawQuotes(page)), run).toBe(true);
      // From the first quote on, only punctuation between the quotes: no words of DotAmi's joining the Act's.
      expect(ownWords(line.slice(line.indexOf("“"))), line).toMatch(/^[\s;,.]*$/);
    }
    // And before the first quote, only the section's name: DotAmi's own words, exactly.
    expect(ownWordsFlat(entry.why)).toBe("Income Tax Act s.245, in its own words: ; ; .");
    expect(ownWordsFlat(entry.mitigation)).toBe("The same section: .");
    // Planted control: the joined sentence that was considered is caught.
    const joined = `It “${GLOSSARY_S245[1]}” or “${GLOSSARY_S245[2]}”.`;
    expect(ownWords(joined.slice(joined.indexOf("“")))).not.toMatch(/^[\s;,.]*$/);
  });

  it("the Holding company and Family trust cards, where the anti-avoidance read shows, cite s.245", () => {
    // A risk read's own sources are drawn on no screen, so the section it quotes is listed under the cards it shows on.
    for (const id of ["structure-holdco", "structure-family-trust"]) {
      const page = citationOf(`structure ${id}`, PAGE.act245);
      for (const run of [risk("risk-ladder-skipping").why, risk("risk-ladder-skipping").mitigation].flatMap(quoted)) {
        expect(inQuotes(run, rawQuotes(page)), `${id}: “${run}”`).toBe(true);
      }
    }
  });

  it("the first-year deduction's read keeps the words the maintainer found match, drops what no source held, and keeps the guide's words off the screen", () => {
    const entry = risk("risk-immediate-expensing-timing");
    expect(entry.why).toBe("The 100% first-year treatment depends on acquisition and available-for-use dates.");
    expect(entry.mitigation).toBe("Confirm eligibility and the available-for-use date with an accountant before filing.");
    // The guide's sentence ends on a colon before a list DotAmi doesn't hold, so it is kept only in the citation's tool
    // check, never quoted on screen (section 2).
    expect(quoted(`${entry.why} ${entry.mitigation}`)).toEqual([]);
  });

  it("the Small Business Financing Program's read stays, and says only ISED's rule on security, quoted", () => {
    const entry = risk("risk-self-declared-valuation");
    expect(entry.appliesTo).toEqual(["grant-csbfp"]);
    const text = `${entry.why} ${entry.mitigation}`;
    expect(text).not.toMatch(/lesser|apprais|purchase price|circular|misrepresent/i);
    expect(ownWords(text).match(/\$\s?\d/g) ?? []).toEqual([]);
    const runs = quoted(text);
    expect(runs.length).toBeGreaterThan(0);
    // The whole rule, never a part of it.
    for (const run of runs) expect(run.replace(/\.$/, "")).toBe(ISED_SECURITY.replace(/\.$/, ""));
    // Outside the quote, only whose words they are and from which page, exactly.
    expect(ownWordsFlat(entry.why)).toBe("");
    expect(ownWordsFlat(entry.mitigation)).toBe("ISED's words, from its page on loans under this program.");
    const page = citationOf("risk risk-self-declared-valuation", PAGE.isedLoans);
    // The page's own title (its main heading), found by scripts/check-quotes.mjs on 2026-10-27; the check stays the list's.
    expect(page.title).toBe("Helping small businesses get loans");
    expect(page.toolCheck?.checkedOn).toBe(LIST_DAY);
    expect(rawQuotes(page)).toContain(ISED_SECURITY);
    for (const q of rawQuotes(page)) expect(ISED_LOANS_FOUND, q).toContain(q);
    // On the card: the loan program's box shows it.
    const csbfp = card(idea(), "grant-csbfp");
    expect(csbfp.risk).toBeDefined();
    expect(quoted(`${csbfp.risk!.why} ${csbfp.risk!.mitigation}`)).toContain(ISED_SECURITY);
  });

  // A risk box draws no sources of its own, so the page it quotes has to be under the card. #208 added ISED's loans
  // page to grant-csbfp with its own tool check of the same day; until main with #208 was merged in (2026-10-27) this
  // was an `it.fails`, and the card listed ISED's hub only.
  it("the loan program's card cites the loans page its risk box quotes, holding the quoted rule (#208 added it)", () => {
    const page = citationOf("grants grant-csbfp", PAGE.isedLoans);
    expect(page.toolCheck?.checkedOn).toBe(LIST_DAY);
    expect(rawQuotes(page)).toContain(ISED_SECURITY);
    // On the card: the page is among the card's own sources, one click away under the box.
    expect(card(idea(), "grant-csbfp").citations.map((c) => c.url)).toContain(PAGE.isedLoans);
  });
});

describe("7. The corrected words are gone from the docs that copied them", () => {
  const gone: [string, string][] = [
    ["docs/engines/grants.md", "15% non-refundable"],
    ["docs/brain/README.md", "15% non-refundable"],
    ["docs/brain/risk-calculator.md", "floor-area math, exclusive use"],
    ["docs/engines/writeoffs.md", "exclusive-use test"],
    ["docs/engines/compliance.md", "O. Reg. 562 is the model"],
  ];
  it.each(gone)("%s no longer says “%s”", (file, words) => {
    expect(readFlat(file).includes(words), `${file} still says “${words}”`).toBe(false);
  });

  it("the canvas spec gives Incorporating's business limit as the step shows it: up to $500,000", () => {
    expect(/up to \$500,000/i.test(readFlat("docs/ui-spec/cockpit/03-canvas.md")), "03-canvas.md gives the limit as “up to $500,000”").toBe(true);
  });

  it("what stays in DotAmi's own words on the corrected cards is listed for the maintainer, and the docs count what they quote", () => {
    // Not entries the reading list checked (his answer 2), so unchanged, and listed rather than left unsaid.
    const citations = readFlat("docs/engines/citations.md");
    const at = citations.indexOf("### Outside the list");
    expect(at, "citations.md has § Outside the list").toBeGreaterThan(-1);
    const open = citations.slice(at, citations.indexOf("## How this relates", at));
    for (const thing of ["needs a real business purpose first", "Professional required", "compliance-hobby-vs-business"]) {
      expect(open.includes(thing), `§ Outside the list names “${thing}”`).toBe(true);
    }
    // s.245 is quoted in four of the five phrases the glossary holds (the GAAR read's S245_QUOTES), not in "the four".
    expect(citations.includes("in the four phrases docs/glossary.md")).toBe(false);
    expect(readFlat("docs/brain/risk-calculator.md").includes("the four quotes docs/glossary.md")).toBe(false);
    // The risk catalog's row in the brain's README: attachRisk evaluates combinations and the ladder's GAAR read.
    expect(readFlat("docs/brain/README.md").includes("not yet evaluated")).toBe(false);
  });
});

describe("8. His answers on item 10 (2026-11-01): the four lines rest on the newer pages", () => {
  // His pick on Part B, "Rest them on the newer pages": “Find the same facts on the newer CRA pages, check them with the
  // tool, and show those pages' words instead; any fact no newer page states comes off.” The four lines were in
  // DotAmi's own words, without quote marks, and rested on the relationships page alone (2025-07-21). Each new quote was
  // found by `node scripts/check-quotes.mjs --url … --quote …` on 2026-11-01, one run per page. The review of the same
  // day changed what ca18ae2 built (ITEM_10_LINES_CA18AE2): each citation it touched was checked again that day, one
  // run per citation, holding all its quotes ("All 2 quotes were found" for the stage's policy page and What's new, each
  // with the page's heading; "All 5 …" for the T2 guide; "All 6 …" for the line on the expenditure limit's policy page).
  const roadLine = (roadId: string, id: string) => {
    const road = roadsV2026.find((r) => r.id === roadId);
    expect(road, roadId).toBeDefined();
    const found = road!.steps.flatMap((s) => s.doneWhen).find((d) => d.id === id);
    expect(found, `${roadId} ${id}`).toBeDefined();
    return found!;
  };
  const ROADS = ["road-starting-any-business-ab", "road-federal-steps-ca"] as const;
  /** A line's own words: what the person checked ("You checked whether …" or "You checked how …"), then whose words follow. */
  const OWN_WORDS_LEAD = /^You checked (whether|how) [^.:]*\. The CRA's [^:]+:$/;
  /** The quoted runs of a done-when line its own citation doesn't hold whole: what the guard below finds. */
  const unheldRuns = (line: { text: string; citation: ListedCitation }) => quoted(line.text).filter((run) => !rawQuotes(line.citation).includes(run));

  it("SR&ED deepening's tax impact quotes the policy page on the enhanced rate and What's new on its limit, each under its page's name, in place of DotAmi's own words", () => {
    const stage = node("stage-4-sred-deepening");
    expect(stage.taxImpact).toBe(ITEM_10_LINES.taxImpact);
    expect(stage.taxImpact).not.toContain(OWN_WORDS_BEFORE_ITEM_10.taxImpact);
    // Two lines, each under its own page's name, as the CCPC's card labels them: some CCPCs may earn the enhanced 35%
    // (the policy page, section 1.1), and the limit on which it can be earned is $6 million (What's new, its page date
    // 2026-06-12, newer than the relationships page's 2025-07-21; the line holds no date). Until the review of
    // 2026-11-01 the second was the policy page's section 3.0 sentence on spending above the limit, one side of block
    // 200's two-sided passage on the limit, without the enhanced side.
    expect(quoted(stage.taxImpact)).toEqual([POLICY_CCPC_ENHANCED, LIMIT_SIX_MILLION]);
    expect(stage.taxImpact).not.toContain(POLICY_ABOVE_LIMIT);
    // Each run is held whole by the stage's own citation of the page its label names.
    expect(rawQuotes(citationOf("cfe stage-4-sred-deepening", PAGE.sredItcPolicy))).toContain(POLICY_CCPC_ENHANCED);
    expect(rawQuotes(citationOf("cfe stage-4-sred-deepening", PAGE.whatsNew))).toContain(LIMIT_SIX_MILLION);
    expect(stage.taxImpact).toContain(`The CRA's SR&ED Investment Tax Credit Policy: “${POLICY_CCPC_ENHANCED}”`);
    expect(stage.taxImpact).toContain(`The CRA's What's new for corporations: “${LIMIT_SIX_MILLION}”`);
    // Outside the quotes, the stage's own two sentences, which rest on no line of the relationships page, and the labels.
    expect(ownWordsFlat(stage.taxImpact)).toBe(
      "Eligible SR&ED expenditures generate ITCs and deductions. The CRA's SR&ED Investment Tax Credit Policy: The CRA's What's new for corporations: Provincial top-ups may apply in some jurisdictions.",
    );
    // No time and no number of DotAmi's own, and "for the year", which no line quoted here says, is gone with the old
    // words (it came off: What's new's line says the limit, not that it is a year's).
    expect(findTimeWords(ownWords(stage.taxImpact))).toEqual([]);
    expect(ownWords(stage.taxImpact)).not.toMatch(/\d/);
    expect(stage.taxImpact).not.toMatch(/for the (tax )?year/);
    // Planted controls: the line as it read before item 10 quotes nothing, and says the limit in DotAmi's own words; the
    // line as ca18ae2 had it quotes the section 3.0 sentence, which the check above catches.
    const before = `Eligible SR&ED expenditures generate ITCs and deductions. ${OWN_WORDS_BEFORE_ITEM_10.taxImpact} Provincial top-ups may apply in some jurisdictions.`;
    expect(quoted(before)).toEqual([]);
    expect(ownWords(before)).toContain("expenditure limit for the year");
    expect(ITEM_10_LINES_CA18AE2.taxImpact).toContain(POLICY_ABOVE_LIMIT);
    expect(quoted(ITEM_10_LINES_CA18AE2.taxImpact)).not.toEqual([POLICY_CCPC_ENHANCED, LIMIT_SIX_MILLION]);
  });

  it("SR&ED deepening cites What's new for corporations, read by the maintainer, its tool check of 2026-11-01 holding the line the tax impact quotes", () => {
    // The stage's own citation of the page, so the tax impact's quote is one click away under the stage (a quote on a
    // stage is held by one of the stage's own citations). The maintainer read the page in full on 2026-10-25, so its
    // citation carries his read as the SR&ED card's does, and the read wins on screen; `node scripts/check-quotes.mjs
    // --url … --quote …` found the line on the live page on 2026-11-01, so its one check is of that day.
    for (const where of ["cfe", "roads road-starting-any-business-ab", "roads road-federal-steps-ca"].map((at) => `${at} stage-4-sred-deepening`)) {
      const c = citationOf(where, PAGE.whatsNew);
      expect(c.title, where).toBe("What's new for corporations");
      expect(c.lastVerified, where).toBe(MAINTAINER_READ_DAY);
      expect(c.readBy, where).toBe("person");
      expect(c.toolCheck, where).toEqual({ checkedOn: ITEM_10_DAY, quotes: [LIMIT_SIX_MILLION] });
      expect(howChecked(c), where).toEqual({ kind: "person", on: MAINTAINER_READ_DAY });
      expect(MAINTAINER_READ_PAGES.some((p) => p.url === PAGE.whatsNew), where).toBe(true);
    }
    // Whose page it is, as the catalog has it (the citations list above keeps only what a check reads).
    const inCatalog = node("stage-4-sred-deepening").citations.find((c) => c.url === PAGE.whatsNew);
    expect(inCatalog?.authority).toBe("CRA");
    expect(inCatalog?.jurisdiction).toBe("CA");
    // The SR&ED card's citation of the page keeps the reading list's check of 2026-10-23 (§ 2).
    expect(citationOf("grants grant-sred", PAGE.whatsNew).toolCheck).toEqual({ checkedOn: LIST_DAY, quotes: [LIMIT_SIX_MILLION] });
  });

  it("the notes in DotAmi's own words on these stages' and roads' sources name the page's topic only, no limit, rate or amount", () => {
    // A note is DotAmi's own words, not the page's, so it says what the page is about and states none of its facts
    // (the review of 2026-11-01): the stage's and the road's new citations of the policy page said the enhanced rate's
    // expenditure limit. The two SR&ED stages, on the map and on both roads that draw them, and every source road 0 and
    // the federal steps show (step sources, done-when lines' sources, cost lines' name sources).
    const notes: { where: string; note: string }[] = [];
    for (const id of ["stage-3b-incorporation-liability-sred", "stage-4-sred-deepening"]) {
      for (const c of node(id).citations) notes.push({ where: `cfe ${id} ${c.url}`, note: c.note });
    }
    for (const roadId of ROADS) {
      const road = roadsV2026.find((r) => r.id === roadId)!;
      for (const s of road.steps) {
        const costSources = s.costs.flatMap((c) => (c.kind === "official-fee" ? [c.citation] : c.nameSource ? [c.nameSource] : []));
        const cited = [...s.citations, ...s.doneWhen.map((d) => d.citation), ...costSources];
        for (const c of cited) notes.push({ where: `${roadId} ${s.id} ${c.url}`, note: c.note });
      }
    }
    expect(notes.length).toBeGreaterThan(100);
    expect(notes.filter(({ note }) => NOTE_STATES_A_FACT.test(note)).map(({ where, note }) => `${where}: ${note}`)).toEqual([]);
    // The stage's note on the policy page is the one Incorporation for liability/SR&ED's citation of it has.
    const policyNote = (id: string) => node(id).citations.find((c) => c.url === PAGE.sredItcPolicy)?.note;
    expect(policyNote("stage-4-sred-deepening")).toBe("The CRA's SR&ED investment tax credit policy: its overview of the credit's basic and enhanced rates.");
    expect(policyNote("stage-4-sred-deepening")).toBe(policyNote("stage-3b-incorporation-liability-sred"));
    // Planted controls: the two notes ca18ae2 wrote are caught.
    for (const note of NOTES_CA18AE2) expect(NOTE_STATES_A_FACT.test(note), note).toBe(true);
  });

  it("the note on SR&ED deepening's source on the older page names only the page's topic, as Incorporation for liability/SR&ED's does", () => {
    const noteOf = (id: string) => node(id).citations.find((c) => c.url === PAGE.relationships)?.note;
    const note = noteOf("stage-4-sred-deepening");
    expect(note).toBe(ITEM_10_LINES.note);
    expect(note).toBe(noteOf("stage-3b-incorporation-liability-sred"));
    // No stage's or road's source carries the old note, which stated the older page's rate and limit as its content.
    // (The SR&ED card's note on the same page is not one of item 10's four lines.)
    const sources = [
      ...cfeNodesV2026.flatMap((s) => s.citations.map((c) => ({ where: `cfe ${s.id}`, note: c.note }))),
      ...roadsV2026.flatMap((r) =>
        r.steps.flatMap((s) => [...s.citations, ...s.doneWhen.map((d) => d.citation)].map((c) => ({ where: `roads ${r.id} ${s.id}`, note: c.note }))),
      ),
    ];
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.filter((s) => s.note === OWN_WORDS_BEFORE_ITEM_10.note).map((s) => s.where)).toEqual([]);
    expect(note).not.toMatch(/35%|expenditure limit/);
  });

  it.each(ROADS)("%s: Incorporation for liability/SR&ED's lines on CCPCs show the newer pages' words, each from its own citation of that page", (roadId) => {
    const road = roadsV2026.find((r) => r.id === roadId)!;
    const step = road.steps.find((s) => s.id === "stage-3b-incorporation-liability-sred")!;
    // The line on associated corporations is two now, one per newer page: a line holds one citation, and the business
    // limit (the T2 guide) and the SR&ED expenditure limit (the policy page) are on two pages.
    expect(step.doneWhen.map((d) => d.id)).toEqual(["dw-start-incsred-incorporated", ...ITEM_10_ROAD_LINES.map((l) => l.id)]);
    for (const expected of ITEM_10_ROAD_LINES) {
      const line = roadLine(roadId, expected.id);
      expect(line.text, expected.id).toBe(expected.text);
      // Every quoted run is held whole by the line's own citation, which holds those runs and nothing else.
      expect(quoted(line.text), expected.id).toEqual([...expected.quotes]);
      expect(line.citation.url, expected.id).toBe(expected.url);
      expect(line.citation.title, expected.id).toBe(expected.title);
      expect(line.citation.authority, expected.id).toBe("CRA");
      expect(line.citation.jurisdiction, expected.id).toBe("CA");
      expect(line.citation.toolCheck, expected.id).toEqual({ checkedOn: ITEM_10_DAY, quotes: [...expected.quotes] });
      // Outside the quotes, only what the person checked, as an action like its neighbours' ("You checked …"), and
      // whose words follow: no fact of DotAmi's own.
      expect(ownWordsFlat(line.text), expected.id).toMatch(OWN_WORDS_LEAD);
    }
    // Planted control: the line on the expenditure limit as ca18ae2 had it, led by a condition rather than what the
    // person checked, fails the lead (until the review of 2026-11-01 the pattern let it through).
    expect(ownWordsFlat(ITEM_10_LINES_CA18AE2.expenditureLimit)).not.toMatch(OWN_WORDS_LEAD);
    // The T2 guide is a page the maintainer read in full on 2026-10-25, so its read wins on screen; nobody has read the
    // Type of corporation page or the policy page, so those two say "Checked by a tool" in amber, with the words found.
    expect(howChecked(roadLine(roadId, "dw-start-incsred-associated").citation)).toEqual({ kind: "person", on: MAINTAINER_READ_DAY });
    for (const id of ["dw-start-incsred-ccpc", "dw-start-incsred-expenditure-limit"]) {
      const c = roadLine(roadId, id).citation;
      expect(c.lastVerified, id).toBeUndefined();
      expect(c.readBy, id).toBeUndefined();
      expect(isCheckFirst(c), id).toBe(true);
    }
  });

  it("no road line cites the relationships page any more, and the old lines' own words are gone, the facts no newer page states with them", () => {
    for (const roadId of ROADS) {
      for (const id of ["dw-start-incsred-ccpc", "dw-start-incsred-associated"]) {
        expect(roadLine(roadId, id).citation.url, `${roadId} ${id}`).not.toBe(PAGE.relationships);
      }
    }
    const roadLines = roadsV2026.flatMap((r) => r.steps.flatMap((s) => s.doneWhen.map((d) => ({ where: `${r.id} ${d.id}`, citation: d.citation }))));
    expect(roadLines.filter((l) => l.citation.url === PAGE.relationships).map((l) => l.where)).toEqual([]);
    const shown = [...cfeNodesV2026.map((s) => ownStringsIn(s).join("\n")), ...roadsV2026.map((r) => ownStringsIn(r).join("\n"))].join("\n");
    for (const words of [OWN_WORDS_BEFORE_ITEM_10.taxImpact, OWN_WORDS_BEFORE_ITEM_10.ccpc, OWN_WORDS_BEFORE_ITEM_10.associated]) {
      expect(shown.includes(words), words).toBe(false);
    }
    // What came off: the older page's "in general" summary (the newer page gives the whole list instead), DotAmi's
    // sentence joining the small business deduction and the enhanced credit as both for certain CCPCs (each shows in a
    // newer page's own words instead: the deduction on the line on associated corporations, the next test, and the
    // enhanced credit as the stage's 35%), DotAmi's word "share" and the code "T2SCH23", which no newer page writes so
    // (its form page is from 2019).
    expect(shown).not.toMatch(/in general, a private corporation/);
    expect(shown).not.toContain("are for certain CCPCs");
    expect(shown).not.toContain("T2SCH23");
    expect(shown).not.toMatch(/they share the business limit/);
  });

  it.each(ROADS)("%s: the small business deduction is back in the T2 guide's words, and the expenditure limit's line quotes the prescribed form's block too", (roadId) => {
    // The review of 2026-11-01. The older line on CCPCs said the small business deduction is for certain CCPCs; item 10
    // took that fact off though the T2 guide's chapter 4 (its page date 2026-05-28) states it. It is back as that
    // page's block 55, whole, first on the line on associated corporations, whose citation is the same page (a line
    // holds one citation, and the line on CCPCs cites the Type of corporation page). Its label is a plain description,
    // no page code: a number in a line must be in its own quotes, and "2" is in none.
    const associated = roadLine(roadId, "dw-start-incsred-associated");
    expect(quoted(associated.text)[0]).toBe(T2_SBD);
    expect(associated.text).toContain("The CRA's income tax guide for corporations, on the small business deduction and the business limit:");
    expect(associated.text).not.toContain("Corporation Income Tax Guide");
    expect(rawQuotes(associated.citation)).toEqual([T2_SBD, MAX_LIMIT, SCHEDULE_23, SCHEDULE_23_SHARES]);
    expect(associated.citation.title).toBe("T2 Corporation – Income Tax Guide – Chapter 4: Page 4 of the T2 return (CRA)");
    // The policy page's block 255, whole, between section 3.1.3's first sentence and block 256: every associated group
    // files an agreement on the prescribed form, or the CRA determines the limit to be nil.
    const limit = roadLine(roadId, "dw-start-incsred-expenditure-limit");
    expect(quoted(limit.text)).toEqual([...POLICY_EXPENDITURE_LIMIT]);
    expect(quoted(limit.text).indexOf(POLICY_AGREEMENT_OR_NIL)).toBe(1);
    expect(rawQuotes(limit.citation)).toEqual([...POLICY_EXPENDITURE_LIMIT]);
    // Planted controls: the two lines as ca18ae2 had them lack the two blocks.
    expect(quoted(ITEM_10_LINES_CA18AE2.associated)).not.toContain(T2_SBD);
    expect(quoted(ITEM_10_LINES_CA18AE2.expenditureLimit)).not.toContain(POLICY_AGREEMENT_OR_NIL);
  });

  it("every quoted run on any road's done-when line is held whole by that line's own citation", () => {
    // A guard for every road, the lines item 10 changed and any later one: a line quoting a page has the page one click
    // away, its words in the citation's tool check.
    for (const road of roadsV2026) {
      for (const line of road.steps.flatMap((s) => s.doneWhen)) expect(unheldRuns(line), `${road.id} ${line.id}`).toEqual([]);
    }
    // Planted controls, through the guard's own check: a line with a quoted run its citation doesn't hold is caught,
    // and so is a run cut from one of its held quotes (a part is not the whole).
    const line = roadLine("road-starting-any-business-ab", "dw-start-incsred-ccpc");
    expect(unheldRuns({ ...line, text: `${line.text} “in general, a private corporation”` })).toEqual(["in general, a private corporation"]);
    expect(unheldRuns({ ...line, text: `${line.text} “it is a private”` })).toEqual(["it is a private"]);
    expect(unheldRuns(line)).toEqual([]);
  });

  it("the docs say what the review of 2026-11-01 changed, and nothing says the small business deduction came off", () => {
    const rule8 = readFlat("docs/engines/citations.md").split(" 8. **Where two official pages disagree")[1]!.split("## What people see")[0]!;
    const asBuilt = rule8.split("As built (2026-11-01):")[1] ?? "";
    expect(asBuilt).not.toBe("");
    // The tax impact's second line is What's new's, and "for the year" is listed among what came off.
    expect(asBuilt).toContain(`The CRA's What's new for corporations: “${LIMIT_SIX_MILLION}”`);
    expect(asBuilt).not.toContain(POLICY_ABOVE_LIMIT);
    expect(asBuilt).toMatch(/came off[^]*"for the year"/);
    // The T2 guide's block 55 and the policy page's block 255, each quoted whole.
    expect(asBuilt).toContain(`“${T2_SBD}”`);
    expect(asBuilt).toContain(`“${POLICY_AGREEMENT_OR_NIL}”`);
    // No doc, comment or test note says the small business deduction's fact came off.
    for (const file of [
      "docs/engines/citations.md",
      "CHANGELOG.md",
      "docs/task-list.md",
      "docs/ui-spec/cockpit/03-canvas.md",
      "lib/engines/roads/v2026/starting-any-business-ab.ts",
    ]) {
      expect(readFlat(file), file).not.toMatch(/came off[^.]*small business deduction/);
    }
    // The relationships page's row among the reading list's tool checks says it is listed only, with its check, and
    // that nothing on a stage or road quotes it or rests on it; only the SR&ED card's two lines still do.
    const row = readFlat("docs/engines/citations.md")
      .split("## The reading list's tool checks (2026-10-23)")[1]!
      .split(" | CRA, *How certain relationships")[1]!
      .split(" | CRA, T2 guide chapter 4")[0]!;
    const lastCell = row.split(" | ").at(-1)!;
    expect(lastCell).toContain("listed only, with its check");
    expect(lastCell).toContain("nothing on any stage or road quotes it or rests on it");
    expect(lastCell).toContain("§ Outside the list, item 4");
  });
});
