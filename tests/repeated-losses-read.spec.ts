/**
 * A repeated-losses read comes back on the Hobby vs. business card, in the CRA's own words (2026-10-27).
 *
 * The read "Repeated losses → hobby reclassification" (`risk-hobby-reclassification`) came off on 2026-10-24: its one
 * page, the CRA's Setting up your business, supported none of it (tests/retired-entries.spec.ts). On 2026-10-27 the
 * CRA's Income Tax Audit Manual, chapter 27, was found to have usable words, and the maintainer answered "yah, lets
 * use it". So the read comes back under a NEW id (IDs are forever), saying only what that page says, quoted, joined
 * only by labels that name the page. `node scripts/check-quotes.mjs` found all three quotes on the live page on
 * 2026-10-27, and nobody has read the page in full, so its check words are "Checked by a tool…".
 *
 * No screen shows chapter 27 or those check words yet. A risk box draws no sources of its own (attachRisk in
 * lib/brain/evaluate.ts copies only the level, GAAR flag, why and mitigation), so the page a box quotes has to be under
 * its card (tests/reading-list-corrections.spec.ts § 6), and the Hobby vs. business card lists only Setting up your
 * business. Whether chapter 27 goes under the card is the maintainer's call (docs/engines/citations.md § Outside the
 * list, item 3), so the gap is held as an `it.fails` check (§ 4), as #208's was until its page went under its card.
 *
 * Kept as they were: the retired read's trigger (none) and severity (`caution`), the one card it shows on, and that
 * card's own words and sources (whether its page supports them is a separate open question for the maintainer,
 * docs/engines/citations.md § Outside the list).
 *
 * Addresses, quotes and words are written out here, not imported, so a change to the catalog can't move the test
 * with it. Each check fails on the code before the change unless its comment says it is a guard.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateProfile, type EvaluationProfile } from "@/lib/brain";
import { allCatalogCitations } from "@/lib/engines/all-citations";
import { complianceRulesV2026 } from "@/lib/engines/compliance/v2026";
import { RETIRED_RISK_ENTRIES, riskEntriesV2026 } from "@/lib/engines/risk/v2026";
import { howChecked, howCheckedWords, isCheckFirst } from "@/lib/engines/shared/citation-check";
import type { EngineCitation } from "@/lib/engines/shared/types";

import { findTimeWords } from "./helpers/time-words";
import { findVerdicts, VERDICT_WORDS } from "./helpers/verdict-words";

const TODAY = "2026-10-27";
/** The day `node scripts/check-quotes.mjs` printed when it found all three quotes on the page. */
const CHECKER_DAY = "2026-10-27";

const RETIRED_ID = "risk-hobby-reclassification";
const NEW_ID = "risk-losses-source-of-income";
const LABEL = "Losses and whether there is a source of income";
const CARD = "compliance-hobby-vs-business";

const CHAPTER_27 =
  "https://www.canada.ca/en/revenue-agency/services/tax/technical-information/income-tax-audit-manual-domestic-compliance-programs-branch-dcpb-27.html";
const SETTING_UP = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html";
/** The page's own main heading (h1) and its chapter heading (h2), joined: the script found both on the page. */
const CHAPTER_27_TITLE = "Income Tax Audit Manual, Chapter 27.0 Income";

// The three sentences, as the page prints them: 27.2.0 (Pursuit of profit), the paragraph on the court's later
// reading (Chad), and 27.2.2 (Commercial manner).
const PURSUIT_OF_PROFIT =
  "An activity undertaken in the pursuit of profit, even with erroneous business decisions that cause it to never experience any actual profit, is still a source of income.";
const INTENTION_TO_CREATE_LOSSES =
  "Objective evidence showing an intention to create losses to offset taxable income may lead to the courts to conclude that no source of income exists.";
const PERSONAL_ELEMENT =
  "If there is a personal element to the activity and the activity is undertaken in a sufficiently commercial manner, there is a source of income and income must be reported and losses may be claimed.";
const QUOTES = [PURSUIT_OF_PROFIT, INTENTION_TO_CREATE_LOSSES, PERSONAL_ELEMENT];

/** DotAmi's own words on the box: only the labels that say whose words follow. */
const WHY_LABELS = "The CRA's Income Tax Audit Manual, chapter 27: The same page:";
const MITIGATION_LABELS = "The same page:";

/**
 * Words on the same page that are never quoted: the auditors' own instructions, the factor list (its "Nature and
 * extent of losses" line among them), a one-sided sentence on its own, and any line with a time word.
 */
const NEVER_QUOTE = [
  "auditors should proceed with a two-stage approach",
  "Is the activity of the taxpayer undertaken in pursuit of profit, or is it a personal endeavour?",
  "Some factors to consider",
  "Nature and extent of losses",
  "While the reasonable expectation of profit test was rejected",
];
/** Never in DotAmi's own words on this read: the retired read's framing, the person addressed, or a verdict on their activity. */
const NEVER_OWN =
  /hobby|reclassif|\byou\b|\byour\b|run of losses|end of (?:a|the|your) business|\b(?:activity|venture|this|it) is (?:not |still )?a (?:business|source of income)\b/i;

const repo = path.resolve(__dirname, "..");
const readFlat = (file: string) => readFileSync(path.join(repo, file), "utf8").replace(/\s+/g, " ");
/** A doc's section from a heading line that starts with `heading`, up to the next heading of that level or higher. */
function section(file: string, heading: string): string {
  const doc = readFileSync(path.join(repo, file), "utf8");
  const start = doc.indexOf(heading);
  if (start === -1) return "";
  const level = heading.match(/^#+/)![0].length;
  const next = doc.slice(start + heading.length).search(new RegExp(`\\n#{1,${level}} `));
  return doc.slice(start, next === -1 ? undefined : start + heading.length + next).replace(/\s+/g, " ");
}

/** The runs of words in curly quote marks, the way the box quotes a page. */
const quoted = (text: string) => [...text.matchAll(/“([^”]+)”/g)].map((m) => m[1]!);
/** A text with its quoted runs taken out: what DotAmi says in its own words. */
const ownWords = (text: string) => text.replace(/“[^”]*”/g, " ");
const ownWordsFlat = (text: string) => ownWords(text).replace(/\s+/g, " ").trim();
const sorted = (list: readonly string[]) => [...list].sort();

const read = () => {
  const r = riskEntriesV2026.find((e) => e.id === NEW_ID);
  expect(r, `${NEW_ID} is a live risk read`).toBeDefined();
  return r!;
};
// Read as the shared citation type: the catalog's `satisfies` keeps each entry's own literal shape.
const citation = (): EngineCitation => {
  const cs: EngineCitation[] = read().citations.filter((c) => c.url === CHAPTER_27);
  expect(cs, `${NEW_ID} cites chapter 27 once`).toHaveLength(1);
  return cs[0]!;
};

/** An invented Alberta idea in a kind of work the card is for. */
const idea = (change: Partial<EvaluationProfile> = {}): EvaluationProfile => ({
  goals: [],
  ventureType: "service",
  activityTags: ["Content / streaming"],
  province: "AB",
  employmentStatus: "employee",
  structure: "sole-prop",
  targetRevenueY1: 10_000,
  targetRevenueY3: 10_000,
  hireFirst: false,
  capitalPurchasePlanned: false,
  ...change,
});
const card = (p: EvaluationProfile = idea()) => {
  const c = evaluateProfile(p, { today: TODAY }).unlocks.find((u) => u.id === CARD);
  expect(c, `${CARD} for ${p.activityTags.join(", ")}`).toBeDefined();
  return c!;
};

describe("1. The read is back under a new id; the retired id stays retired", () => {
  it("a live read has the new id, which is not the retired one", () => {
    expect(NEW_ID).not.toBe(RETIRED_ID);
    expect(read().label).toBe(LABEL);
  });

  it("the retired id stays in the retired list and in no live entry", () => {
    // A guard: the read comes back beside the retired record, never in place of it.
    expect(RETIRED_RISK_ENTRIES.map((r) => r.id)).toContain(RETIRED_ID);
    expect(riskEntriesV2026.map((e) => e.id)).not.toContain(RETIRED_ID);
    // Not as an id, a target or anywhere in any live read's fields.
    expect(JSON.stringify(riskEntriesV2026)).not.toContain(RETIRED_ID);
    expect(allCatalogCitations().filter(({ where }) => where.includes(RETIRED_ID)).map((l) => l.where)).toEqual([]);
  });

  it("it keeps the retired read's trigger, severity and card", () => {
    // The retired entry (git show 8b66afc6^:lib/engines/risk/v2026/triggers.ts) had no trigger, "caution", no GAAR
    // flag, and showed on the Hobby vs. business card only. Each is the maintainer's to change.
    const r = read();
    expect(r.trigger).toBeUndefined();
    expect(r.severity).toBe("caution");
    expect(r.gaarExposure).toBe(false);
    expect(r.appliesTo).toEqual([CARD]);
  });
});

describe("2. It says only what chapter 27 says, quoted, joined only by labels", () => {
  it("outside the quotes, only the labels that name the page", () => {
    expect(ownWordsFlat(read().why)).toBe(WHY_LABELS);
    expect(ownWordsFlat(read().mitigation)).toBe(MITIGATION_LABELS);
  });

  it("every quote on the box is a whole quote the tool check holds, and every quote it holds is on the box", () => {
    const shown = quoted(`${read().why} ${read().mitigation}`);
    expect(sorted(shown)).toEqual(sorted(QUOTES));
    expect(sorted(citation().toolCheck?.quotes ?? [])).toEqual(sorted(shown));
    // In the order the page gives them: the pursuit of profit, then the losses line, then the personal element.
    expect(quoted(read().why)).toEqual([PURSUIT_OF_PROFIT, INTENTION_TO_CREATE_LOSSES]);
    expect(quoted(read().mitigation)).toEqual([PERSONAL_ELEMENT]);
  });

  it("no time word, in DotAmi's own words or in the quotes", () => {
    const r = read();
    for (const text of [r.label, ownWords(r.why), ownWords(r.mitigation), citation().note, citation().title, ...QUOTES]) {
      expect(findTimeWords(text), text).toEqual([]);
    }
    // Planted control: the retired read's own words had a time in them.
    expect(findTimeWords("Year-after-year losses against employment income, over several years")).not.toEqual([]);
  });

  it("none of the lines never to quote, and no hobby, reclassification, you or verdict in DotAmi's own words", () => {
    const r = read();
    const everything = `${r.label} ${r.why} ${r.mitigation} ${citation().note} ${(citation().toolCheck?.quotes ?? []).join(" ")}`;
    for (const never of NEVER_QUOTE) expect(everything.includes(never), never).toBe(false);
    for (const own of [r.label, ownWords(r.why), ownWords(r.mitigation), citation().note, citation().title]) {
      expect(own, own).not.toMatch(NEVER_OWN);
      expect(own, own).not.toMatch(VERDICT_WORDS);
      expect(findVerdicts(own), own).toEqual([]);
    }
    // Planted controls: the retired read's words, and a verdict about the person's activity, are caught.
    expect("Repeated losses → hobby reclassification").toMatch(NEVER_OWN);
    expect("A run of losses is not the end of a business.").toMatch(NEVER_OWN);
    expect("The activity is still a source of income.").toMatch(NEVER_OWN);
    // And the label's own neutral words are not: "whether there is" names the question, not an answer.
    expect(LABEL).not.toMatch(NEVER_OWN);
  });
});

describe("3. Its source: chapter 27, checked by a tool, read by nobody yet", () => {
  it("names the CRA's page, with the check the script printed", () => {
    const c = citation();
    expect(c.title).toBe(CHAPTER_27_TITLE);
    expect(c.authority).toBe("CRA");
    expect(c.jurisdiction).toBe("CA");
    expect(c.toolCheck?.checkedOn).toBe(CHECKER_DAY);
    expect(read().citations).toHaveLength(1);
  });

  // Its check words, as a screen would draw them: no screen does yet (§ 4, the `it.fails` check).
  it("claims no read, so its check words say “Checked by a tool” and mark it check-first (amber)", () => {
    const c = citation();
    expect(c.lastVerified).toBeUndefined();
    expect(c.readBy).toBeUndefined();
    expect(howChecked(c)).toEqual({ kind: "tool", on: CHECKER_DAY, quotes: c.toolCheck!.quotes });
    expect(howCheckedWords(c)).toBe(
      `Checked by a tool on ${CHECKER_DAY}: it found on the page the exact words this entry relies on. Not read by a person yet.`,
    );
    expect(isCheckFirst(c)).toBe(true);
  });
});

describe("4. On the card", () => {
  it("the Hobby vs. business card shows the read's box, headed caution, with the page's words", () => {
    for (const activityTags of [["Content / streaming"], ["Woodworking"], ["Creator / influencer"]]) {
      const c = card(idea({ activityTags }));
      expect(c.risk, activityTags[0]).toBeDefined();
      expect(c.risk!.level).toBe("caution");
      expect(c.risk!.gaar).toBe(false);
      expect(c.risk!.why).toBe(read().why);
      expect(c.risk!.mitigation).toBe(read().mitigation);
    }
  });

  it("the card itself is unchanged: its words, its one source, and its colour", () => {
    // A guard: the card's words are a separate open question for the maintainer (citations.md § Outside the list).
    const rule = complianceRulesV2026.find((r) => r.id === CARD)!;
    expect(rule.label).toBe("Hobby vs. business income test");
    expect(rule.description).toBe(
      "CRA evaluates whether activity is a business (reasonable expectation of profit) or a hobby (personal pursuit).",
    );
    expect(rule.lensAnnotations).toEqual({
      tax: "If the activity lacks profit motive and business-like conduct, income may not be treated as business income — expenses may be limited.",
      legal: "If selling to the public, consumer protection and licensing rules may still apply regardless of hobby status.",
    });
    expect(rule.citations.map((c) => c.url)).toEqual([SETTING_UP]);
    // Its colour: green for each of the three ideas, as on main before this read (0e45a80e: the same ideas gave
    // green with no box). A caution box never changes a colour; only a professional-required one turns green to
    // yellow (lib/brain/evaluate.ts attachRisk).
    for (const activityTags of [["Content / streaming"], ["Woodworking"], ["Creator / influencer"]]) {
      expect(card(idea({ activityTags })).state, activityTags[0]).toBe("green");
    }
  });

  // A risk box draws no sources of its own, so the page it quotes has to be under the card
  // (tests/reading-list-corrections.spec.ts § 6). Today the card lists only Setting up your business, so a person sees
  // the three quotes with no link to chapter 27, right above "Read by a person on 2026-10-25" for that other page.
  // Listing chapter 27 under the card is the maintainer's call (docs/engines/citations.md § Outside the list, item 3),
  // so this is an `it.fails` until he makes it, as #208's loans page was: it passes only while the gap is there, and
  // fails the day the page goes under the card, to be turned into a plain `it`.
  it.fails("the card cites chapter 27, the page its box quotes, with the check the script printed (not yet: his call)", () => {
    const c = card();
    expect(c.risk).toBeDefined();
    const page = c.citations.find((x) => x.url === CHAPTER_27);
    expect(page, "chapter 27 is among the card's own sources").toBeDefined();
    expect(howCheckedWords(page!)).toBe(
      `Checked by a tool on ${CHECKER_DAY}: it found on the page the exact words this entry relies on. Not read by a person yet.`,
    );
  });

  it("what the card's sources show under the box today: Setting up your business only, read by a person", () => {
    // A guard on the gap above, so it is recorded as it is and not only as what it isn't.
    const c = card();
    expect(c.citations.map((x) => x.url)).toEqual([SETTING_UP]);
    expect(howCheckedWords(c.citations[0]!)).toMatch(/^Read by a person on 2026-10-25/);
  });
});

describe("5. The docs say it came back", () => {
  it("the risk calculator's spec lists the read with its quotes, and the retired record says it came back under the new id", () => {
    expect(section("docs/brain/risk-calculator.md", "## What the reads quote")).toContain(NEW_ID);
    expect(section("docs/brain/risk-calculator.md", "## Retired risk reads")).toContain(NEW_ID);
  });

  it("citations.md moves Repeated losses from Blocked to settled", () => {
    const blocked = section("docs/engines/citations.md", "### Blocked: what each needs");
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked).toContain(NEW_ID);
    // Not as a numbered item still waiting.
    expect(blocked).not.toMatch(/\d\. \*\*Repeated losses\.\*\*/);
  });

  it("the task list ticks it", () => {
    expect(readFlat("docs/task-list.md")).toMatch(/- \[x\] Repeated losses:/);
    expect(readFlat("docs/task-list.md")).not.toMatch(/- \[ \] Repeated losses:/);
  });
});
