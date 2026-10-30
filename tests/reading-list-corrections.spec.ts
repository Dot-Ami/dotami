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
import { howChecked } from "@/lib/engines/shared/citation-check";

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
  relationships: `${CRA}/tax/businesses/topics/corporations/business-tax-credits/how-relationships-affect-small-business-deduction-sred-investment-tax-credits.html`,
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
// The CRA's SR&ED glossary, its entry "Enhanced SR&ED investment tax credit rate (35%)": the line the maintainer asked
// for on stage-4, found by scripts/check-quotes.mjs on 2026-10-27 (not a reading-list find).
const GLOSSARY_ENHANCED =
  "Some Canadian-controlled private corporations (CCPCs) that meet certain requirements may earn investment tax credits at the enhanced rate of 35%";
// The CRA's Business-use-of-home expenses page, on the business part: found by scripts/check-quotes.mjs on 2026-10-27.
const HOME_OFFICE_BUSINESS_PART =
  "To calculate the part you can deduct, use a reasonable basis, such as the area of the workspace divided by the total area of your home.";
// The CRA's What's new for corporations, and Income Tax Act s.127(10.2). Only the formula is recorded as found on
// the Act's page ("formula found"), so its lead-in sentence is not kept.
const LIMIT_SIX_MILLION =
  "The expenditure limit on which the SR&ED enhanced 35% tax credit can be earned is increased from the previously announced $4.5 million to $6 million.";
const ACT_FORMULA = "$6 million × [($60 million − A) ÷ $60 million]";
// The CRA's T2 guide, chapter 4: the reading list's quote, and the fragment structure-ccpc already held.
const MAX_LIMIT = "The maximum allowable business limit for a corporation that is not associated with any other corporation is $500,000.";
const THROUGHOUT = "throughout the tax year may be able to claim the small business deduction";
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
 */
const OTHER_CITATIONS_BEFORE: { where: string; url: string; checkedOn: string | null; quotes: number }[] = [
  { where: "structure structure-ccpc", url: PAGE.t2Guide, checkedOn: "2026-10-13", quotes: 2 },
  { where: "writeoffs writeoff-cca-class-50", url: PAGE.t4002, checkedOn: null, quotes: 0 },
  ...["road-starting-any-business-ab", "road-federal-steps-ca"].flatMap((road) => [
    { where: `roads ${road} dw-start-incsred-ccpc`, url: PAGE.relationships, checkedOn: "2026-10-12", quotes: 5 },
    { where: `roads ${road} dw-start-incsred-associated`, url: PAGE.relationships, checkedOn: "2026-10-12", quotes: 4 },
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
    const pages = new Set(TOOL_CHECKS_OF_THE_DAY.map((t) => t.url));
    const others = all
      .filter(({ where, citation }) => pages.has(citation.url) && !corrected.has(where) && !roadCopy(where))
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
  it("a sole proprietor's card never calls the 15% non-refundable, and quotes the CRA's basic rate and its refundable line", () => {
    for (const structure of ["sole-prop", "sole-prop-gst"] as const) {
      const c = card(idea({ structure }), "grant-sred");
      expect(c.payoff, structure).not.toMatch(/non-refundable/i);
      expect(c.payoff, structure).toContain("this may be worth 15%.");
      expect(quoted(c.payoff), structure).toEqual([BASIC_RATE, SOME_REFUNDABLE]);
      // The catalog leaves refundability unsaid for an individual: no held quote says how much is refunded.
      expect(sred().ratesByStructure!.find((r) => r.structure === structure)!.refundable, structure).toBeUndefined();
    }
  });

  it("every quote on the SR&ED card is held by one of its own sources, checked on 2026-10-23", () => {
    const held = sred()
      .citations.filter((c) => c.toolCheck?.checkedOn === LIST_DAY)
      .flatMap((c) => c.toolCheck!.quotes);
    for (const rate of sred().ratesByStructure!) {
      const runs = quoted(rate.note ?? "");
      expect(runs.length, `${rate.structure}: ${rate.note}`).toBeGreaterThan(0);
      for (const run of runs) expect(inQuotes(run, held), `${rate.structure}: “${run}”`).toBe(true);
    }
    // Planted control: the note before the correction quoted nothing.
    expect(quoted("Unincorporated claimants earn the basic 15% non-refundable ITC.")).toEqual([]);
  });

  it("the enhanced rate is for some CCPCs up to their limit, the limit is $6 million in the CRA's and the Act's words, and no line sends the person to an advisor", () => {
    const ccpc = sred().ratesByStructure!.find((r) => r.structure === "ccpc")!;
    expect(ccpc.note).not.toMatch(/advisor/i);
    expect(quoted(ccpc.note ?? "")).toEqual([CCPC_ENHANCED, LIMIT_SIX_MILLION]);
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

  it("a sole proprietor's fork names the 35% for some CCPCs, up to their limit, and the $6 million, in the CRA's words", () => {
    const fork = card(idea(), "grant-sred").fork;
    expect(fork).toBeDefined();
    expect(fork!.note).not.toMatch(/advisor/i);
    expect(quoted(fork!.note)).toEqual([CCPC_ENHANCED, LIMIT_SIX_MILLION]);
  });

  it("the CCPC's 35% is never called refundable in DotAmi's own words: none of the card's quotes says so", () => {
    // The word rested only on the maintainer's read, which wasn't on record then (his answer 1 of 2026-10-24): the CRA's
    // “Some businesses may also earn a refundable ITC.” says neither which businesses nor which rate.
    expect(sred().ratesByStructure!.find((r) => r.structure === "ccpc")!.refundable).toBeUndefined();
    const shown = [card(idea({ structure: "ccpc" }), "grant-sred").payoff, card(idea(), "grant-sred").fork?.note ?? ""];
    for (const text of shown) expect(ownWords(text), text).not.toMatch(/refundable/i);
    // Planted control: the fork as it read before is caught.
    expect(ownWords("A CCPC may access 35% refundable treatment instead of 15%.")).toMatch(/refundable/i);
  });

  it("no date of DotAmi's own reaches the SR&ED card", () => {
    // A guard (NO TIMES): the limit's start date is in no held quote, so no line on the card says it.
    for (const structure of ["sole-prop", "ccpc"] as const) {
      const c = card(idea({ structure }), "grant-sred");
      expect(`${c.payoff} ${c.fork?.note ?? ""}`, structure).not.toMatch(/\b20\d\d\b|on or after|beginning/i);
    }
  });

  it("both SR&ED map stages quote the CRA for their 35%, from a page each cites", () => {
    // Incorporation for liability/SR&ED quotes the relationships page; SR&ED deepening, since 2026-10-27, the SR&ED
    // glossary's own entry, the line the maintainer asked for (its citation keeps the relationships page too).
    const quotes = {
      "stage-3b-incorporation-liability-sred": { quote: CCPC_ENHANCED, page: PAGE.relationships },
      "stage-4-sred-deepening": { quote: GLOSSARY_ENHANCED, page: PAGE.sredGlossary },
    } as const;
    for (const [id, { quote, page }] of Object.entries(quotes)) {
      const estimate = node(id).financialImpact.estimates.find((e) => e.value === "35%");
      expect(estimate, id).toBeDefined();
      expect(quoted(estimate!.basis), id).toEqual([quote]);
      expect(rawQuotes(citationOf(`cfe ${id}`, page)), id).toContain(quote);
    }
    // One run found the glossary's new line with the two it held, so the citation's check is that day's.
    expect(citationOf("cfe stage-4-sred-deepening", PAGE.sredGlossary).toolCheck?.checkedOn).toBe("2026-10-27");
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
