/**
 * The CRA's GST/HST rate table, settled by the maintainer's answer about two of its rows (docs/engines/citations.md,
 * § Blocked, items 1 and 2). The table on https://www.canada.ca/…/charge-collect-which-rate.html is drawn by a script,
 * so scripts/check-quotes.mjs can't see its rows; on 2026-10-28 (Alberta time) he copied them on his reading page:
 * Ontario's row "13%", Alberta's row "5%" (tests/fixtures/rate-table-rows-2026-10-28.ts).
 *
 * - That answer is about part of the page, not a read of it in full, so both cards' citations of the page keep his
 *   full read of 2026-10-25 ("Read by a person on 2026-10-25"), and the answer is recorded in their comments and the
 *   fixture (citations.md, rule 5).
 * - Ontario's 13% (the card's name and description) rests on his answer about its row; its words don't change.
 * - Alberta's row shows only 5%, so the card's line and description say only that: "no provincial sales tax" is no
 *   longer in them ("if the table shows only the 5%, the line says only that", citations.md § Blocked item 1).
 *   Alberta's own *About Tax and Revenue Administration* page says "Alberta has no sales tax." and, in its next
 *   sales-tax block, what that leaves out (sales taxes other provinces may charge). `node scripts/check-quotes.mjs`
 *   found both on the live page in one run on 2026-10-29: the page is listed under the card as a source of its own,
 *   checked by a tool, so both sentences show as the page's words, after "Words found on the page:", never as DotAmi's.
 * - One line of DotAmi's own still says it: the card's name, "Alberta — no provincial sales tax", kept as a named,
 *   dated exception below until the maintainer answers PR #224's question 2.
 *
 * Addresses and words are written out here, not imported, so a change to a catalog can't move the test with it.
 */
import { readFileSync } from "node:fs";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CitationLinks } from "@/components/shared/citation-links";
import { evaluateProfile, type EvaluationProfile } from "@/lib/brain";
import { allCatalogCitations } from "@/lib/engines/all-citations";
import { complianceRulesV2026 } from "@/lib/engines/compliance/v2026";
import { howChecked, howCheckedWords, isCheckFirst, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import type { EngineCitation } from "@/lib/engines/shared/types";

import { MAINTAINER_READ_DAY } from "./fixtures/maintainer-reads-2026-10-25";
import { RATE_TABLE_ROWS } from "./fixtures/rate-table-rows-2026-10-28";

const TODAY = "2026-10-29";
const ALBERTA_TRA = "https://www.alberta.ca/about-tra";
/** The two sentences scripts/check-quotes.mjs found on Alberta's page in one run on 2026-10-29 (the printed record). */
const NO_SALES_TAX = "Alberta has no sales tax.";
const OTHER_PROVINCES =
  "If your business sells products, delivers sold goods, or provides services in other provinces, you may be liable for sales taxes charged by those provinces on those goods or services, and on any equipment you bring into those provinces for use in your business.";
/** The Alberta card's line and description since 2026-10-29: the row's 5%, and nothing more. */
const ALBERTA_LINE = "The CRA's table of GST/HST rates lists Alberta at 5%.";

/**
 * Lines of DotAmi's own on the Alberta card that may still say Alberta has no provincial sales tax, each named, with
 * its reason and the day it was listed. It only shrinks: when the name changes, its entry goes.
 */
const NO_PST_EXCEPTIONS = [
  {
    where: "label",
    text: "Alberta — no provincial sales tax",
    why: "the card's name, pending the maintainer's answer to PR #224's question 2",
    listed: "2026-10-29",
  },
] as const;

const rule = (id: string) => {
  const r = complianceRulesV2026.find((x) => x.id === id);
  expect(r, id).toBeDefined();
  // The catalog's own types are each entry's literal shape; a citation is read here as any citation is.
  return { ...r!, citations: r!.citations as readonly EngineCitation[] };
};

/** An invented idea with no kind of work, so only the province's cards and the federal ones show. */
const idea = (province: EvaluationProfile["province"]): EvaluationProfile => ({
  goals: [],
  ventureType: "service",
  activityTags: [],
  province,
  employmentStatus: "employee",
  structure: "sole-prop",
  targetRevenueY1: 20_000,
  targetRevenueY3: 40_000,
  hireFirst: false,
  capitalPurchasePlanned: false,
});
const card = (province: EvaluationProfile["province"], id: string) => {
  const c = evaluateProfile(idea(province), { today: TODAY }).unlocks.find((u) => u.id === id);
  expect(c, `${id} in ${province}`).toBeDefined();
  return c!;
};

/** "No provincial sales tax", "no PST", "no sales tax", however written: what the row doesn't show. */
const NO_PST = /\bno\s+(provincial\s+)?sales\s+tax\b|\bno\s+PST\b|\bPST\b/i;

describe("his answer about the rate table's two rows, 2026-10-28", () => {
  it("is not a read of the page: both cards' citations keep his full read of 2026-10-25, and no tool check", () => {
    for (const id of ["compliance-on-hst", "compliance-ab-no-pst"]) {
      const cited = rule(id).citations.filter((c) => c.url === RATE_TABLE_ROWS.url);
      expect(cited, id).toHaveLength(1);
      const c = cited[0]!;
      expect(howChecked(c), id).toEqual({ kind: "person", on: MAINTAINER_READ_DAY });
      expect(howCheckedWords(c), id).toBe("Read by a person on 2026-10-25");
      // A guard: the table isn't in the page's words, so no tool check stands for a row.
      expect(c.toolCheck, id).toBeUndefined();
    }
  });

  it("is recorded beside both citations, with its day and his words", () => {
    // Comments in the catalog (rule 5): the day he answered, in Alberta, and each row as he wrote it.
    const source = readFileSync("lib/engines/compliance/v2026/rules.ts", "utf8");
    const day = `on ${RATE_TABLE_ROWS.answeredOn} (Alberta time; saved ${RATE_TABLE_ROWS.savedAtUtc.slice(0, 10)} 02:20 UTC`;
    // Once beside each of the two citations.
    expect(source.split(day)).toHaveLength(3);
    expect(source).toContain(`Ontario's row shows: "${RATE_TABLE_ROWS.wrote.ontarioRow}"`);
    expect(source).toContain(`Alberta's row shows: "${RATE_TABLE_ROWS.wrote.albertaRow}"`);
    // The UTC day his page stamped is never written as the day he answered.
    expect(source).not.toMatch(/answer[^.\n]*on 2026-10-29\b/);
  });

  it("each row's answer is the number its card names", () => {
    expect(RATE_TABLE_ROWS.wrote).toEqual({ ontarioRow: "13%", albertaRow: "5%" });
    expect(rule("compliance-on-hst").label).toContain(RATE_TABLE_ROWS.wrote.ontarioRow);
    expect(rule("compliance-ab-no-pst").lensAnnotations.tax).toContain(`at ${RATE_TABLE_ROWS.wrote.albertaRow}.`);
  });
});

describe("Ontario: the 13% rests on his answer about the row", () => {
  it("the card's words don't change, and its one source is the rate page with his full read", () => {
    // A guard: his answer settles the 13%; the rest of the card's wording is phase 3's
    // (docs/architecture/cards-in-official-words.md).
    const on = rule("compliance-on-hst");
    expect(on.label).toBe("Ontario HST (13%)");
    expect(on.description).toBe("Ontario participates in HST at 13%. Registered businesses charge and remit HST on taxable supplies.");
    expect(on.citations.map((c) => c.url)).toEqual([RATE_TABLE_ROWS.url]);
    const c = card("ON", "compliance-on-hst");
    expect(c.title).toBe("Ontario HST (13%)");
    expect(c.citations.map((x) => howCheckedWords(x))).toEqual(["Read by a person on 2026-10-25"]);
  });
});

describe("Alberta: the row shows only 5%, so DotAmi's words say only that", () => {
  it("the card's line is the row's 5% and nothing more", () => {
    const ab = rule("compliance-ab-no-pst");
    expect(ab.lensAnnotations.tax).toBe(ALBERTA_LINE);
    expect(card("AB", "compliance-ab-no-pst").payoff).toBe(ALBERTA_LINE);
    // Planted control: the line before his answer is caught.
    expect("The CRA's table of GST/HST rates lists Alberta at 5% GST, with no provincial sales tax.").toMatch(NO_PST);
    expect(ALBERTA_LINE).not.toMatch(NO_PST);
  });

  it("the description says only the row's 5% too", () => {
    const ab = rule("compliance-ab-no-pst");
    expect(ab.description).toBe(ALBERTA_LINE);
    // Planted control: the description before his answer is caught.
    expect("Alberta has no PST. GST applies at 5% on taxable supplies once registered.").toMatch(NO_PST);
  });

  it("no line of DotAmi's own on the card says Alberta has no provincial sales tax, past the listed exception (its name)", () => {
    const ab = rule("compliance-ab-no-pst");
    const c = card("AB", "compliance-ab-no-pst");
    const lines = [
      { where: "label", text: ab.label },
      { where: "card title", text: c.title },
      { where: "description", text: ab.description },
      { where: "tax line", text: ab.lensAnnotations.tax },
      { where: "legal line", text: ab.lensAnnotations.legal },
      { where: "payoff", text: c.payoff },
      { where: "why", text: c.why },
    ];
    const excepted = new Set<string>(NO_PST_EXCEPTIONS.map((e) => e.text));
    const saying = lines.filter((l) => NO_PST.test(l.text));
    expect(saying.filter((l) => !excepted.has(l.text)).map((l) => `${l.where}: ${l.text}`)).toEqual([]);
    // Each exception is still in use, word for word, so a stale one can't sit here unnoticed: today the name, which
    // the card's title draws.
    expect(NO_PST_EXCEPTIONS.map((e) => e.text)).toEqual([ab.label]);
    expect(saying.map((l) => l.where)).toEqual(["label", "card title"]);
    for (const e of NO_PST_EXCEPTIONS) expect(e.why).toMatch(/PR #224's question 2/);
  });

  it("Alberta's own page is a source of the card, checked by a tool on 2026-10-29 for its two sales-tax sentences", () => {
    const ab = rule("compliance-ab-no-pst");
    // The rate page stays first: it is the card's source line (`firstCitationSource`).
    expect(ab.citations.map((c) => c.url)).toEqual([RATE_TABLE_ROWS.url, ALBERTA_TRA]);
    const tra = ab.citations[1]!;
    expect(tra).toMatchObject({ title: "About Tax and Revenue Administration", authority: "provincial", jurisdiction: "AB" });
    // One tool check, one date: both sentences were found in the same run.
    expect(tra.toolCheck).toEqual({ checkedOn: "2026-10-29", quotes: [NO_SALES_TAX, OTHER_PROVINCES] });
    // Nobody has read it in full: it says so, in amber, and lists the words the tool found.
    expect(tra.lastVerified).toBeUndefined();
    expect(isCheckFirst(tra)).toBe(true);
    expect(howCheckedWords(tra)).toBe(
      "Checked by a tool on 2026-10-29: it found on the page the exact words this entry relies on. Not read by a person yet.",
    );
    expect(toolCheckQuotes(tra)).toEqual([NO_SALES_TAX, OTHER_PROVINCES]);
    // Its note describes the page, not how it was checked.
    expect(tra.note).not.toMatch(/check-quotes|scripts\/|\b2026-\d\d-\d\d\b/);
    // Cited nowhere else: only the Alberta card rests on it.
    expect(allCatalogCitations().filter((l) => l.citation.url === ALBERTA_TRA).map((l) => l.where)).toEqual(["compliance compliance-ab-no-pst"]);
  });

  it("both sentences show under the card's sources as the page's words, after their label, in quote marks", () => {
    const c = card("AB", "compliance-ab-no-pst");
    expect(c.citations.map((x) => x.url)).toEqual([RATE_TABLE_ROWS.url, ALBERTA_TRA]);
    const html = renderToStaticMarkup(createElement(CitationLinks, { citations: c.citations }));
    const label = html.indexOf("Words found on the page:");
    expect(label).toBeGreaterThan(-1);
    for (const sentence of [NO_SALES_TAX, OTHER_PROVINCES]) {
      expect(html).toContain(`“${sentence}”`);
      // Once, and only after the label: never as a line of DotAmi's own.
      expect(html.split(sentence), sentence).toHaveLength(2);
      expect(html.indexOf(sentence), sentence).toBeGreaterThan(label);
    }
    // The rate page's own line says his full read.
    expect(html).toContain("Read by a person on 2026-10-25");
    expect(html).not.toContain("2026-10-28");
  });
});
