/**
 * A repeated-losses read comes back on the Hobby vs. business card, in the CRA's own words (2026-10-27).
 *
 * The read "Repeated losses → hobby reclassification" (`risk-hobby-reclassification`) came off on 2026-10-24: its one
 * page, the CRA's Setting up your business, supported none of it (tests/retired-entries.spec.ts). On 2026-10-27 the
 * CRA's Income Tax Audit Manual, chapter 27, was found to have usable words, and the maintainer answered "yah, lets
 * use it". So the read comes back under a NEW id (IDs are forever), saying only what that page says, quoted, joined
 * only by labels that name the page. Nobody has read the page in full, so its check words are "Checked by a tool…".
 *
 * The maintainer's answers to PR #217's four questions (2026-10-29, on his reading page):
 * 1. "yes": chapter 27 is listed under the Hobby vs. business card too, as ONE citation the read and the card share
 *    (CRA_ITAM_27_CITATION, the way S245_CITATION is shared). A risk box draws no sources of its own (attachRisk in
 *    lib/brain/evaluate.ts copies only the level, GAAR flag, why and mitigation), so the page a box quotes has to be
 *    under its card (tests/reading-list-corrections.spec.ts § 6). Until then this was an `it.fails` check (§ 4).
 * 2. "keep-card": the box keeps the card. His call 3 of 2026-10-25 stays as he wrote it in
 *    docs/architecture/cards-in-official-words.md, with a dated line beside it (§ 5).
 * 3. "add-martin": the page's two-sided passage, from the paragraph it quotes from Martin v The Queen, is added after
 *    the personal-element quote (not swapped in). The page names the case in the paragraph just before the passage
 *    ("Judge Bowman states in Martin v The Queen, 2003 TCC 155 at paragraph 18:"), not in the passage's own
 *    paragraph, so its label was "The same page:" too until 2026-10-30. `node scripts/check-quotes.mjs` found all
 *    four quotes on the live page on 2026-10-29, in one run, so that is the check's date.
 * 4. "later": risk labels move to a words file with phase 3's first story, not here.
 *
 * The maintainer's answer of 2026-10-30 (his reading page, item 8): the label before the Martin passage becomes "The
 * same page, quoting Martin v The Queen:". It names the case the page quotes, as the page's own paragraph before the
 * passage does; the four quotes and their check are unchanged. The label stays in the catalog's line, where the box's
 * other labels are (answer 4 above: risk labels move to a words file later).
 *
 * Kept as they were: the retired read's trigger (none) and severity (`caution`), the one card it shows on, and that
 * card's own words and its first source (whether that page supports its words is a separate open question for the
 * maintainer, docs/engines/citations.md § Outside the list).
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

const TODAY = "2026-10-29";
/** The day `node scripts/check-quotes.mjs` printed when it found all four quotes on the page, in one run. */
const CHECKER_DAY = "2026-10-29";

const RETIRED_ID = "risk-hobby-reclassification";
const NEW_ID = "risk-losses-source-of-income";
const LABEL = "Losses and whether there is a source of income";
const CARD = "compliance-hobby-vs-business";

const CHAPTER_27 =
  "https://www.canada.ca/en/revenue-agency/services/tax/technical-information/income-tax-audit-manual-domestic-compliance-programs-branch-dcpb-27.html";
const SETTING_UP = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html";
/** The page's own main heading (h1) and its chapter heading (h2), joined: the script found both on the page. */
const CHAPTER_27_TITLE = "Income Tax Audit Manual, Chapter 27.0 Income";

// The four sentences, as the page prints them: 27.2.0 (Pursuit of profit), the paragraph on the court's later
// reading (Chad), and two from 27.2.2 (Commercial manner): its own sentence on a personal element, and the last
// sentence of the indented paragraph it quotes from Martin v The Queen (the maintainer's "add-martin", 2026-10-29).
const PURSUIT_OF_PROFIT =
  "An activity undertaken in the pursuit of profit, even with erroneous business decisions that cause it to never experience any actual profit, is still a source of income.";
const INTENTION_TO_CREATE_LOSSES =
  "Objective evidence showing an intention to create losses to offset taxable income may lead to the courts to conclude that no source of income exists.";
const PERSONAL_ELEMENT =
  "If there is a personal element to the activity and the activity is undertaken in a sufficiently commercial manner, there is a source of income and income must be reported and losses may be claimed.";
const MARTIN =
  "It is only where the personal element so overshadows any element of commerciality as to substantially displace it that one may conclude that the activity is merely a hobby and is not a business at all.";
const QUOTES = [PURSUIT_OF_PROFIT, INTENTION_TO_CREATE_LOSSES, PERSONAL_ELEMENT, MARTIN];

/**
 * DotAmi's own words on the box: only the labels that say whose words follow. The Martin passage's label names the
 * case the page quotes (the maintainer's answer of 2026-10-30), which the page names in the paragraph just before the
 * passage. Until then it was "The same page:" too.
 */
const WHY_LABELS = "The CRA's Income Tax Audit Manual, chapter 27: The same page:";
const MARTIN_LABEL = "The same page, quoting Martin v The Queen:";
const MITIGATION_LABELS = `The same page: ${MARTIN_LABEL}`;

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

  it("the Martin passage's label names the case, straight before the passage", () => {
    // The maintainer's answer of 2026-10-30. The label stands right before the passage's opening quote mark, after the
    // personal-element sentence, so it labels the passage and nothing else.
    const m = read().mitigation;
    expect(m).toContain(`${MARTIN_LABEL} “${MARTIN}”`);
    expect(m.indexOf(MARTIN_LABEL)).toBeGreaterThan(m.indexOf(PERSONAL_ELEMENT));
    // The case's name is in the label only: the passage's own words don't name it.
    expect(MARTIN).not.toMatch(/Martin/);
  });

  it("every quote on the box is a whole quote the tool check holds, and every quote it holds is on the box", () => {
    const shown = quoted(`${read().why} ${read().mitigation}`);
    expect(sorted(shown)).toEqual(sorted(QUOTES));
    expect(sorted(citation().toolCheck?.quotes ?? [])).toEqual(sorted(shown));
    // In the order the page gives them: the pursuit of profit, then the losses line, then the personal element, then
    // the Martin passage (added after it, not in place of it).
    expect(quoted(read().why)).toEqual([PURSUIT_OF_PROFIT, INTENTION_TO_CREATE_LOSSES]);
    expect(quoted(read().mitigation)).toEqual([PERSONAL_ELEMENT, MARTIN]);
  });

  it("“hobby” is only ever inside the page's quote, never in DotAmi's own words", () => {
    // The maintainer's "add-martin" brings the word onto the box, inside the Martin passage only.
    const r = read();
    expect(`${r.why} ${r.mitigation}`).toContain("hobby");
    for (const own of [ownWords(r.why), ownWords(r.mitigation)]) expect(own, own).not.toMatch(/hobby/i);
    // Planted control: a label that says the word is caught.
    expect(ownWords("A hobby, says the same page: “It is only where…”")).toMatch(/hobby/i);
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

describe("3. Its source: chapter 27, checked by a tool, read by nobody yet, shared with the card", () => {
  it("names the CRA's page, with the check the script printed", () => {
    const c = citation();
    expect(c.title).toBe(CHAPTER_27_TITLE);
    expect(c.authority).toBe("CRA");
    expect(c.jurisdiction).toBe("CA");
    expect(c.toolCheck?.checkedOn).toBe(CHECKER_DAY);
    expect(read().citations).toHaveLength(1);
  });

  // Its check words, as the card's sources draw them under the box (§ 4).
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

  it("the read and the card list ONE citation of chapter 27, the same value, so the two can't drift apart", () => {
    // The maintainer's "yes" to question 1: shared the way S245_CITATION is shared by the anti-avoidance read and
    // the two structure cards.
    const rule = complianceRulesV2026.find((r) => r.id === CARD)!;
    const onCard: EngineCitation[] = rule.citations.filter((c) => c.url === CHAPTER_27);
    expect(onCard, "the card lists chapter 27 once").toHaveLength(1);
    expect(onCard[0]).toBe(citation());
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

  it("the card's own words and colour are unchanged, and its sources are its first page, then chapter 27", () => {
    // The card's words are a separate open question for the maintainer (citations.md § Outside the list); the box
    // keeping the card (his "keep-card", 2026-10-29) changes none of them.
    const rule = complianceRulesV2026.find((r) => r.id === CARD)!;
    expect(rule.label).toBe("Hobby vs. business income test");
    expect(rule.description).toBe(
      "CRA evaluates whether activity is a business (reasonable expectation of profit) or a hobby (personal pursuit).",
    );
    expect(rule.lensAnnotations).toEqual({
      tax: "If the activity lacks profit motive and business-like conduct, income may not be treated as business income — expenses may be limited.",
      legal: "If selling to the public, consumer protection and licensing rules may still apply regardless of hobby status.",
    });
    expect(rule.citations.map((c) => c.url)).toEqual([SETTING_UP, CHAPTER_27]);
    // Its colour: green for each of the three ideas, as on main before this read (0e45a80e: the same ideas gave
    // green with no box). A caution box never changes a colour; only a professional-required one turns green to
    // yellow (lib/brain/evaluate.ts attachRisk).
    for (const activityTags of [["Content / streaming"], ["Woodworking"], ["Creator / influencer"]]) {
      expect(card(idea({ activityTags })).state, activityTags[0]).toBe("green");
    }
  });

  // A risk box draws no sources of its own, so the page it quotes has to be under the card
  // (tests/reading-list-corrections.spec.ts § 6). Until the maintainer's "yes" of 2026-10-29 the card listed only
  // Setting up your business, so a person saw the box's quotes with no link to chapter 27, and this was an `it.fails`
  // (it passed only while the gap was there), as #208's loans page was.
  it("the card cites chapter 27, the page its box quotes, with the check the script printed", () => {
    for (const activityTags of [["Content / streaming"], ["Woodworking"], ["Creator / influencer"]]) {
      const c = card(idea({ activityTags }));
      expect(c.risk, activityTags[0]).toBeDefined();
      const page = c.citations.find((x) => x.url === CHAPTER_27);
      expect(page, `${activityTags[0]}: chapter 27 is among the card's own sources`).toBeDefined();
      expect(page!.title).toBe(CHAPTER_27_TITLE);
      expect(howCheckedWords(page!)).toBe(
        `Checked by a tool on ${CHECKER_DAY}: it found on the page the exact words this entry relies on. Not read by a person yet.`,
      );
      // Every quote on the box is one the card's source of that page holds, so the box's words are one click away.
      for (const q of quoted(`${c.risk!.why} ${c.risk!.mitigation}`)) expect(page!.toolCheck?.quotes, q).toContain(q);
    }
  });

  it("what the card's sources show under the box: Setting up your business, read by a person, then chapter 27, checked by a tool", () => {
    // A guard on the order and the first source, so the card's own page is recorded as it is.
    const c = card();
    expect(c.citations.map((x) => x.url)).toEqual([SETTING_UP, CHAPTER_27]);
    expect(howCheckedWords(c.citations[0]!)).toMatch(/^Read by a person on 2026-10-25/);
    expect(howCheckedWords(c.citations[1]!)).toMatch(new RegExp(`^Checked by a tool on ${CHECKER_DAY}`));
  });
});

describe("5. The docs say it came back", () => {
  it("the risk calculator's spec lists the read with its quotes, and the retired record says it came back under the new id", () => {
    const reads = section("docs/brain/risk-calculator.md", "## What the reads quote");
    expect(reads).toContain(NEW_ID);
    // What is true since 2026-10-29: four quotes, the Martin passage among them, and the check of that day.
    expect(reads).toContain(MARTIN);
    expect(reads).toContain(`a tool check of ${CHECKER_DAY}`);
    expect(reads).not.toContain("One exception, for now");
    // The label before the Martin passage, since the maintainer's answer of 2026-10-30.
    expect(reads).toContain(`"${MARTIN_LABEL}"`);
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

  it("call 3 stays as the maintainer wrote it, with his 2026-10-29 answer beside it: the box keeps the card", () => {
    const calls = section("docs/architecture/cards-in-official-words.md", "## The maintainer's calls (2026-10-25)");
    expect(calls.length).toBeGreaterThan(0);
    // Added, not rewritten: call 3's own words are still there.
    expect(calls).toContain(
      "The hobby card and the shareholder-agreement template retire (their one source supports none of their words).",
    );
    expect(calls).toContain(
      "2026-10-29: the maintainer kept the Hobby vs. business card, with the repeated-losses read on it (his answer on PR #217's question 2)",
    );
  });

  it("citations.md and the task list no longer leave chapter 27 under the card, or the card's retirement, to a call", () => {
    const open = section("docs/engines/citations.md", "### Outside the list");
    expect(open).toContain("compliance-hobby-vs-business");
    expect(open).toContain("2026-10-29");
    expect(open).not.toContain("waits for the same call");
    expect(open).not.toContain("whether the card still retires");
    const tasks = readFlat("docs/task-list.md");
    expect(tasks).not.toContain("whether his call 3 of 2026-10-25 retiring the card");
  });
});
