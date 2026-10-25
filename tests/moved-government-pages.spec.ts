/**
 * Government pages that moved: no citation points at an address that answered "page not found".
 *
 * On 2026-10-13 a recount fetched every distinct address the catalogs cite (104, from
 * lib/engines/all-citations.ts) twice, with a normal browser's user-agent: 20 answered 404 both times.
 * For 19 of them the same government body has the content at a new address, and the words each entry
 * relies on were found there by `node scripts/check-quotes.mjs` that day, so 23 citations on them
 * now point at the new page and carry that tool check. Two citations are left as they are, for a
 * person to decide (STILL_DEAD, tests/fixtures/still-dead-pages.ts): what each says may no longer be true, and no rule here rewrites
 * it.
 * (A third, the Alberta Investor Tax Credit page, left with its program on 2026-10-23, the maintainer's call a-call-1.)
 *
 * A read of the old page is not a read of the new one, so a moved citation drops its old read date
 * (lastVerified) and shows its tool check until a person reads the new page. Nothing here reaches the
 * network: the addresses are written down, and the live check is the script's job.
 */
import { describe, expect, it } from "vitest";

import { GOAL_EFFECTS } from "@/lib/brain/goal-effects";
import { allCatalogCitations } from "@/lib/engines/all-citations";

import { STILL_DEAD } from "./fixtures/still-dead-pages";

const CRA = "https://www.canada.ca/en/revenue-agency/services";
const SOLE_PROP = `${CRA}/tax/businesses/topics/sole-proprietorships-partnerships`;
const OLD_EXPENSES = `${SOLE_PROP}/report-business-income-expenses/business-expenses`;
const OLD_SRED = `${CRA}/scientific-research-experimental-development-tax-incentive`;
const SRED = `${CRA}/scientific-research-experimental-development-tax-incentive-program`;
const CCA = `${SOLE_PROP}/report-business-income-expenses/claiming-capital-cost-allowance`;
const T4012 = `${CRA}/forms-publications/publications/t4012`;

/** Each dead address, and where each citation that cited it points now ("<catalog> <entry id>"). */
const MOVED: { old: string; now: { where: string; url: string }[] }[] = [
  {
    old: "https://nrc.canada.ca/en/support-technology-innovation/nrc-irap",
    now: [{ where: "grants grant-irap", url: "https://nrc.canada.ca/en/support-technology-innovation/about-nrc-industrial-research-assistance-program" }],
  },
  {
    old: "https://www.alberta.ca/trades-occupations",
    now: [{ where: "compliance compliance-trades-licensing-ab", url: "https://tradesecrets.alberta.ca/trades-in-alberta/compulsory-certification-trades" }],
  },
  { old: `${OLD_SRED}.html`, now: [{ where: "grants grant-sred", url: `${SRED}.html` }] },
  {
    old: `${OLD_SRED}/claim-sred-expenditures.html`,
    now: [
      { where: "cfe stage-4-sred-deepening", url: `${SRED}/sred-claim.html` },
      { where: "writeoffs writeoff-rd", url: `${SRED}/sred-claim.html` },
      { where: "risk risk-sred-documentation", url: `${SRED}/sred-claim/get-ready.html` },
    ],
  },
  { old: `${OLD_SRED}/glossary.html`, now: [{ where: "cfe stage-4-sred-deepening", url: `${SRED}/glossary.html` }] },
  {
    old: `${CRA}/tax/businesses/topics/corporations/corporation-income-tax.html`,
    now: [{ where: "structure structure-ccpc", url: `${CRA}/tax/businesses/topics/corporations/corporation-tax-rates.html` }],
  },
  {
    old: `${CRA}/tax/businesses/topics/corporations/corporation-income-tax/small-business-deduction.html`,
    now: [{ where: "structure structure-ccpc", url: `${T4012}/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html` }],
  },
  {
    old: `${CRA}/tax/businesses/topics/corporations/corporation-income-tax/returns/completing-your-corporation-income-tax-t2-return/line-4600-dividends-received.html`,
    now: [{ where: "structure structure-holdco", url: `${T4012}/t2-corporation-income-tax-guide-chapter-3-page-3-t2-return.html` }],
  },
  {
    old: `${CRA}/tax/businesses/topics/gst-hst-businesses/register-account.html`,
    now: [{ where: "structure structure-sole-prop-gst", url: `${CRA}/tax/businesses/topics/business-registration/business-number-program-account/how-register/resident.html` }],
  },
  { old: `${OLD_EXPENSES}.html`, now: [{ where: "writeoffs writeoff-saas-tools", url: `${SOLE_PROP}/business-expenses.html` }] },
  {
    old: `${OLD_EXPENSES}/business-use-home-expenses.html`,
    now: [
      { where: "writeoffs writeoff-home-office", url: `${SOLE_PROP}/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html` },
      { where: "risk risk-home-office-percentage", url: `${SOLE_PROP}/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html` },
    ],
  },
  {
    old: `${OLD_EXPENSES}/capital-cost-allowance.html`,
    now: [
      { where: "writeoffs writeoff-capital-equipment", url: `${CCA}.html` },
      { where: "risk risk-mixed-use-equipment", url: `${CCA}/personal-use-property.html` },
    ],
  },
  {
    old: `${OLD_EXPENSES}/capital-cost-allowance/classes-depreciable-property.html`,
    now: [{ where: "writeoffs writeoff-cca-class-50", url: `${CCA}/classes-depreciable-property.html` }],
  },
  {
    old: `${OLD_EXPENSES}/meals-entertainment-expenses.html`,
    now: [{ where: "writeoffs writeoff-meals", url: `${SOLE_PROP}/business-expenses.html#mealsandentertainmentallowablepartonly` }],
  },
  {
    old: `${OLD_EXPENSES}/motor-vehicle-expenses.html`,
    now: [{ where: "writeoffs writeoff-vehicle", url: `${SOLE_PROP}/business-expenses/motor-vehicle-expenses.html` }],
  },
  {
    old: `${OLD_EXPENSES}/motor-vehicle-expenses/motor-vehicle-records.html`,
    now: [{ where: "risk risk-vehicle-logbook", url: `${SOLE_PROP}/business-expenses/motor-vehicle-expenses/motor-vehicle-records.html` }],
  },
  {
    old: `${CRA}/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/income/employment-self-employment-income/employment-income.html`,
    now: [
      {
        where: "cfe stage-0-employee-apprentice-baseline",
        url: `${CRA}/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-10100-employment-income.html`,
      },
    ],
  },
  {
    old: `${CRA}/tax/individuals/topics/tax-free-savings-account/tfsa/tax-on-split-income.html`,
    now: [
      {
        // The CRA's line 40424 page states the tax as it is law today. Its income-sprinkling guidance
        // page also explains it, but as the draft proposals of December 13, 2017.
        where: "structure structure-family-trust",
        url: `${CRA}/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-40424-federal-tax-on-split-income.html`,
      },
    ],
  },
  {
    old: "https://www.ontario.ca/page/business-grants-and-funding-ontario-government",
    now: [{ where: "grants grant-on-innovation", url: "https://www.ontario.ca/page/business-and-economy" }],
  },
];

// The dead addresses left for a person: tests/fixtures/still-dead-pages.ts (the quality report counts them too).

const listed = allCatalogCitations();
const stillDeadUrls = new Set(STILL_DEAD.map((d) => d.url));

describe("government pages that moved", () => {
  it("no citation cites an address that answered page not found, except the ones left for a person", () => {
    const dead = new Set(MOVED.map((m) => m.old));
    const offenders = listed
      .filter(({ citation }) => dead.has(citation.url.split("#")[0]) && !stillDeadUrls.has(citation.url))
      .map(({ where, citation }) => `${where}: ${citation.url}`);
    expect(offenders).toEqual([]);
  });

  it("the ones left for a person are exactly these, unchanged", () => {
    // The retained-earnings stage's one old address is the dividends-received line listed as moved above.
    expect(STILL_DEAD[0].url).toBe(MOVED[7].old);
    for (const { url, where } of STILL_DEAD) {
      expect(listed.filter(({ citation }) => citation.url === url).map((l) => l.where).sort(), url).toEqual([...where].sort());
    }
  });

  it("each moved citation points at its new page, with a tool check and no read of the old one", () => {
    for (const { old, now } of MOVED) {
      for (const { where, url } of now) {
        const found = listed.filter((l) => l.where === where && l.citation.url === url);
        expect(found.length, `${where} → ${url} (was ${old})`).toBeGreaterThan(0);
        for (const { citation } of found) {
          expect(citation.toolCheck, `${where}: ${url}`).toBeDefined();
          expect(citation.toolCheck?.checkedOn, `${where}: ${url}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(citation.toolCheck?.quotes.length, `${where}: ${url}`).toBeGreaterThan(0);
          // The read was of the old address; it says nothing about the new page.
          expect(citation.lastVerified, `${where}: ${url}`).toBeUndefined();
        }
      }
    }
  });

  it("a road step that reuses a map stage's sources moved with it", () => {
    for (const stage of ["stage-0-employee-apprentice-baseline", "stage-4-sred-deepening"]) {
      const onMap = listed.filter((l) => l.where === `cfe ${stage}`).map((l) => l.citation.url);
      const onRoad = listed.filter((l) => l.where === `roads road-starting-any-business-ab ${stage}`).map((l) => l.citation.url);
      expect(onRoad, stage).toEqual(onMap);
    }
  });

  // A card shows a tool check's quotes as "the exact words this entry relies on", so each must say
  // what the entry is about: not a phrase cut off before its subject, a page's disclaimer, or a line
  // from a worked example.
  /** The quotes of the citation an entry has on its new page (the page as MOVED lists it). */
  const quotesOf = (where: string, page: string) => {
    const url = MOVED.flatMap((m) => m.now).find((n) => n.where === where && n.url.endsWith(page))?.url;
    expect(url, `${where} on …${page}`).toBeDefined();
    return listed.filter((l) => l.where === where && l.citation.url === url).flatMap((l) => l.citation.toolCheck?.quotes ?? []);
  };

  it("the GST/HST registration source quotes the words that name GST/HST", () => {
    const quotes = quotesOf("structure structure-sole-prop-gst", "/how-register/resident.html");
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes.some((q) => q.includes("GST/HST")), quotes.join(" · ")).toBe(true);
  });

  it("the split-income source quotes the rule itself, not an example", () => {
    const quotes = quotesOf("structure structure-family-trust", "/line-40424-federal-tax-on-split-income.html");
    expect(quotes).toContain("Tax on split income (TOSI) is a special tax that applies to certain income received from a related business.");
    expect(quotes.filter((q) => q.includes("top marginal rate"))).toEqual([]);
  });

  it("the SR&ED glossary source quotes a definition the stage relies on, not the page's disclaimer", () => {
    const quotes = quotesOf("cfe stage-4-sred-deepening", "/glossary.html");
    expect(quotes.filter((q) => q.includes("information purposes only"))).toEqual([]);
    expect(
      quotes.some((q) => q.startsWith("The systematic investigation or search called for in the definition of SR&ED")),
      quotes.join(" · "),
    ).toBe(true);
  });

  // The goal card's `source` link is read by no screen today (2026-10-13); it is kept pointing at a
  // live page so it is right whenever a screen does show it.
  it("the write-offs goal's link points at the business expenses page where it is now", () => {
    const href = GOAL_EFFECTS["write-offs"].source?.href;
    expect(href).toBe(`${SOLE_PROP}/business-expenses.html`);
  });
});
