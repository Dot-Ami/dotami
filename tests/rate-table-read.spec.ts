/**
 * The CRA's GST/HST rate table, settled by the maintainer's read of its rows (docs/engines/citations.md, § Blocked,
 * items 1 and 2). The table on https://www.canada.ca/…/charge-collect-which-rate.html is drawn by a script, so
 * scripts/check-quotes.mjs can't see its rows; his answer on his reading page of 2026-10-29 is the read: Ontario's row
 * "13%", Alberta's row "5%" (tests/fixtures/maintainer-reads-2026-10-29.ts).
 *
 * - Both cards' citations of the page carry that read, by a person, on 2026-10-29 (tests/maintainer-reads.spec.ts
 *   holds the day; here, what each card rests on).
 * - Ontario's 13% (the card's name and description) now rests on his read of its row; its words don't change.
 * - Alberta's row shows only 5%, so the card's line and description say only that: "no provincial sales tax" is no
 *   longer in DotAmi's own words ("if the table shows only the 5%, the line says only that", citations.md § Blocked
 *   item 1). Alberta's own *About Tax and Revenue Administration* page says "Alberta has no sales tax.", which
 *   `node scripts/check-quotes.mjs` found on the live page on 2026-10-29: it is listed under the card as a source of
 *   its own, checked by a tool, so the sentence shows as the page's words, after "Words found on the page:", never as
 *   DotAmi's.
 *
 * Addresses and words are written out here, not imported, so a change to a catalog can't move the test with it.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CitationLinks } from "@/components/shared/citation-links";
import { evaluateProfile, type EvaluationProfile } from "@/lib/brain";
import { allCatalogCitations } from "@/lib/engines/all-citations";
import { complianceRulesV2026 } from "@/lib/engines/compliance/v2026";
import { howChecked, howCheckedWords, isCheckFirst, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import type { EngineCitation } from "@/lib/engines/shared/types";

import { RATE_TABLE_READ } from "./fixtures/maintainer-reads-2026-10-29";

const TODAY = "2026-10-29";
const ALBERTA_TRA = "https://www.alberta.ca/about-tra";
/** The sentence scripts/check-quotes.mjs found on Alberta's page on 2026-10-29 (the printed record). */
const NO_SALES_TAX = "Alberta has no sales tax.";
/** The Alberta card's line and description since 2026-10-29: the row's 5%, and nothing more. */
const ALBERTA_LINE = "The CRA's table of GST/HST rates lists Alberta at 5%.";

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

describe("his read of the rate table, 2026-10-29", () => {
  it("both cards' citations of the rate page carry his read of that day, by a person, and no tool check", () => {
    for (const id of ["compliance-on-hst", "compliance-ab-no-pst"]) {
      const cited = rule(id).citations.filter((c) => c.url === RATE_TABLE_READ.url);
      expect(cited, id).toHaveLength(1);
      const c = cited[0]!;
      expect(howChecked(c), id).toEqual({ kind: "person", on: RATE_TABLE_READ.day });
      expect(howCheckedWords(c), id).toBe("Read by a person on 2026-10-29");
      // A guard: the table isn't in the page's words, so no tool check stands for a row.
      expect(c.toolCheck, id).toBeUndefined();
    }
  });

  it("his answer for each row is the number its card names", () => {
    expect(RATE_TABLE_READ.wrote).toEqual({ ontarioRow: "13%", albertaRow: "5%" });
    expect(rule("compliance-on-hst").label).toContain(RATE_TABLE_READ.wrote.ontarioRow);
    expect(rule("compliance-ab-no-pst").lensAnnotations.tax).toContain(`at ${RATE_TABLE_READ.wrote.albertaRow}.`);
  });
});

describe("Ontario: the 13% rests on his read of the row", () => {
  it("the card's words don't change, and its one source is the rate page with his read", () => {
    // A guard: his read settles the 13%; the rest of the card's wording is phase 3's
    // (docs/architecture/cards-in-official-words.md).
    const on = rule("compliance-on-hst");
    expect(on.label).toBe("Ontario HST (13%)");
    expect(on.description).toBe("Ontario participates in HST at 13%. Registered businesses charge and remit HST on taxable supplies.");
    expect(on.citations.map((c) => c.url)).toEqual([RATE_TABLE_READ.url]);
    const c = card("ON", "compliance-on-hst");
    expect(c.title).toBe("Ontario HST (13%)");
    expect(c.citations.map((x) => howCheckedWords(x))).toEqual(["Read by a person on 2026-10-29"]);
  });
});

describe("Alberta: the row shows only 5%, so DotAmi's words say only that", () => {
  it("the card's line is the row's 5% and nothing more", () => {
    const ab = rule("compliance-ab-no-pst");
    expect(ab.lensAnnotations.tax).toBe(ALBERTA_LINE);
    expect(card("AB", "compliance-ab-no-pst").payoff).toBe(ALBERTA_LINE);
    // Planted control: the line before his read is caught.
    expect("The CRA's table of GST/HST rates lists Alberta at 5% GST, with no provincial sales tax.").toMatch(NO_PST);
    expect(ALBERTA_LINE).not.toMatch(NO_PST);
  });

  it("the description says only the row's 5% too", () => {
    const ab = rule("compliance-ab-no-pst");
    expect(ab.description).toBe(ALBERTA_LINE);
    // Planted control: the description before his read is caught.
    expect("Alberta has no PST. GST applies at 5% on taxable supplies once registered.").toMatch(NO_PST);
  });

  it("no line of DotAmi's own on the card says Alberta has no provincial sales tax", () => {
    const ab = rule("compliance-ab-no-pst");
    for (const text of [ab.description, ab.lensAnnotations.tax, ab.lensAnnotations.legal]) expect(text, text).not.toMatch(NO_PST);
    const c = card("AB", "compliance-ab-no-pst");
    for (const text of [c.payoff, c.why]) expect(text, text).not.toMatch(NO_PST);
  });

  it("Alberta's own page is a source of the card, checked by a tool on 2026-10-29 for its one sentence", () => {
    const ab = rule("compliance-ab-no-pst");
    // The rate page stays first: it is the card's source line (`firstCitationSource`).
    expect(ab.citations.map((c) => c.url)).toEqual([RATE_TABLE_READ.url, ALBERTA_TRA]);
    const tra = ab.citations[1]!;
    expect(tra).toMatchObject({ title: "About Tax and Revenue Administration", authority: "provincial", jurisdiction: "AB" });
    expect(tra.toolCheck).toEqual({ checkedOn: "2026-10-29", quotes: [NO_SALES_TAX] });
    // Nobody has read it in full: it says so, in amber, and lists the words the tool found.
    expect(tra.lastVerified).toBeUndefined();
    expect(isCheckFirst(tra)).toBe(true);
    expect(howCheckedWords(tra)).toBe(
      "Checked by a tool on 2026-10-29: it found on the page the exact words this entry relies on. Not read by a person yet.",
    );
    expect(toolCheckQuotes(tra)).toEqual([NO_SALES_TAX]);
    // Cited nowhere else: only the Alberta card's words rest on it.
    expect(allCatalogCitations().filter((l) => l.citation.url === ALBERTA_TRA).map((l) => l.where)).toEqual(["compliance compliance-ab-no-pst"]);
  });

  it("the sentence shows under the card's sources as the page's words, after their label, in quote marks", () => {
    const c = card("AB", "compliance-ab-no-pst");
    expect(c.citations.map((x) => x.url)).toEqual([RATE_TABLE_READ.url, ALBERTA_TRA]);
    const html = renderToStaticMarkup(createElement(CitationLinks, { citations: c.citations }));
    expect(html).toContain("Words found on the page:");
    expect(html).toContain(`“${NO_SALES_TAX}”`);
    // Once, and only after the label: never as a line of DotAmi's own.
    expect(html.split(NO_SALES_TAX)).toHaveLength(2);
    expect(html.indexOf("Words found on the page:")).toBeLessThan(html.indexOf(NO_SALES_TAX));
    // The rate page's own line says his read.
    expect(html).toContain("Read by a person on 2026-10-29");
  });
});
