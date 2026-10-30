/**
 * The Canada-Alberta Productivity Grant (`grant-capg`; the maintainer's call a-call-1, "ADD it", on his reading list of
 * 2026-10-23): in the programs catalog under its own id, saying only what Alberta's page says in the four quotes the
 * reading list's tool found on it that day, shown for every Alberta idea as a grant to check first and never as needing
 * incorporation, and named by road 0's Hire first employee. Its source is a tool check, and since 2026-10-27 also the
 * maintainer's read of the page in full on 2026-10-25 (tests/maintainer-reads.spec.ts), which wins on screen, so the
 * words the tool found are no longer listed under it. Every check fails on the code before (no such entry),
 * except the planted controls beside the ones that could pass on nothing, and "no idea outside Alberta", which holds
 * before as after.
 *
 * Since main with #207 was merged in (2026-10-27), this file also checks the id against #207's
 * RETIRED_GRANT_PROGRAMS: the Job Grant's `grant-cajg` stays retired, `grant-capg` is not a retired id, and no
 * retired id is in the catalog.
 *
 * Since 2026-10-29, the maintainer's two answers for this card on his reading page (item 5, "Yes, build them"):
 * (1) "Teach the checker to read a table row as one piece": scripts/check-quotes.mjs reads each table row as one more
 * piece, its cells joined by " | " (tests/check-quotes.spec.ts), so the page's funding table's labels, "Employer" and
 * "Government of Alberta", are held with their lines and the card shows them; (2) for the sentences found on the page
 * on 2026-10-27 (its other requirements for employers, what training counts, who funds it): "One new check that holds
 * the old and new sentences", dated by its run. Every check below that names a label, a 2026-10-27 sentence or the
 * check of 2026-10-29 failed on the catalog before that change.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateProfile, type EvaluationProfile } from "@/lib/brain";
import { itemsForStep } from "@/lib/brain/node-items";
import { grantProgramsV2026, RETIRED_GRANT_PROGRAMS } from "@/lib/engines/grants/v2026/programs";
import type { GrantProgram } from "@/lib/engines/grants/v2026/types";
import { generalRoadV2026, roadApprenticeToOwnShopAB, roadFederalStepsCA, skillItemsV2026 } from "@/lib/engines/roads/v2026";
import { citationCheckProblems, howChecked, howCheckedWords, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import { evaluateRoad } from "@/lib/roads";

import { input, inventedIdea } from "./helpers/road-to-evaluate";
import { findTimeWords } from "./helpers/time-words";

const ID = "grant-capg";
const PAGE = "https://www.alberta.ca/canada-alberta-productivity-grant";
const OLD_JOB_GRANT_PAGE = "https://www.alberta.ca/canada-alberta-job-grant";
/**
 * The quotes the maintainer's reading list records as found on PAGE by a tool on 2026-10-23 (items capg-75-percent,
 * capg-5000-per-trainee, capg-100000-per-employer, capg-operational-one-year), fetched from the Job Grant's old
 * address, which opens it.
 */
const HELD_2026_10_23 = [
  "Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire.",
  "Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year.",
  "An employer is eligible for up to a maximum amount of $100,000 per fiscal year.",
  "be operational in Alberta for at least one year",
] as const;
const [EMPLOYER_LINE, GOVERNMENT_LINE, , ONE_YEAR] = HELD_2026_10_23;
/**
 * The funding table's two rows, read as one piece each (answer 1): the label cell, " | ", the line in the cell beside
 * it. The labels are the page's own cells; the card writes each before its line as "Employer: “…”".
 */
const ROW_LABELS = { Employer: EMPLOYER_LINE, "Government of Alberta": GOVERNMENT_LINE } as const;
const ROWS = Object.entries(ROW_LABELS).map(([label, line]) => `${label} | ${line}`);
/** The page's sentence on who delivers and funds the program (found 2026-10-27; `authority` rests on it). */
const FUNDED_BY =
  "The program is delivered by Alberta and funded by the Government of Canada through the Canada–Alberta Workforce Development Agreement.";
/**
 * Every quote the citation holds since 2026-10-29: the four of 2026-10-23, the two rows, and the sentences found on
 * 2026-10-27, in the order of the one run that found them all (`node scripts/check-quotes.mjs --url PAGE` with these
 * 27 quotes; "All 27 quotes were found", checkedOn "2026-10-29"). The first run that day held 26; the review of #223
 * found the costs list silently dropped the page's travel-costs sentence, so one more run held all 27.
 */
const HELD = [
  ...HELD_2026_10_23,
  ...ROWS,
  "Registered employers must also:",
  "have an active legal entity status throughout the grant term",
  "be in good standing",
  "carry Workers Compensation Benefits coverage for trainees",
  "comply with provincial agreements",
  "Training must be directly related to the trainees’ current or future job and fall within at least one of the following skills categories:",
  "Business Process and Operations Management: Improving processes, systems, operations, and resource management",
  "Technical: Specialized skills that enhance efficiency, quality, and problem solving",
  "Digital and Technological: Skills to use, manage, and integrate digital tools and technologies",
  "Training must also:",
  "be relevant to the trainee’s job",
  "be completed within 52 weeks",
  "include interaction with a qualified instructor",
  "be instructional and structured",
  "take place in Alberta, except under exceptional circumstances",
  "The Canada–Alberta Productivity Grant is available for direct training costs only, including:",
  "tuition or course fees charged by the training provider",
  "textbooks or software",
  "Small and medium-sized organizations may be eligible for travel costs related to training.",
  "Employee wages and general business assets are not eligible.",
  FUNDED_BY,
];
/** The day of that run, the one tool check's date (answer 2: dated by its run). */
const CHECKED_ON = "2026-10-29";
/**
 * The page's items that are times (NO TIMES): held in the tool check only, on no line of the entry, a "…" marking
 * each one's place in its list. tests/helpers/time-words.ts sees the first and the last, not "throughout the grant
 * term", so this list names all three.
 */
const OFF_LINES = [ONE_YEAR, "have an active legal entity status throughout the grant term", "be completed within 52 weeks"] as const;
const TODAY = "2026-10-24";
const capg = (): GrantProgram | undefined => grantProgramsV2026.find((p) => p.id === ID);
/** Every line of the entry: the card's payoff (`lensAnnotations.tax`, on screen) and the fields no screen draws yet. */
const linesOf = (p: GrantProgram) => [p.description, p.eligibility, p.lensAnnotations.tax, p.lensAnnotations.legal, p.estimatedValue ?? ""];
// Quotes in curly quote marks, the way the cards and the citations' word lists quote a page.
const QUOTED = /“([^”]+)”/g;
const quotesIn = (line: string) => [...line.matchAll(QUOTED)].map((m) => m[1]!);
const own = (line: string) => line.replace(QUOTED, " ");
/** The only words of DotAmi's own a line may hold, besides separators: the page's name, the compass's "If", the row labels. */
const OWN_LABELS = [
  "If training employees is on the venture's path, Alberta's page on this program:",
  "In the words of Alberta's page on this program:",
  "Alberta's page on this program:",
  "Alberta's page:",
  "Government of Alberta:",
  "Employer:",
];
/** What is left of a line's own words once its labels are taken out: only separators (; . … and spaces) may be. */
const afterLabels = (line: string) => OWN_LABELS.reduce((rest, label) => rest.split(label).join(" "), own(line)).replace(/[\s;.…]/g, "");
/** A row label written before a quote: "Employer: “…”". */
const LABELLED = /(Employer|Government of Alberta): “([^”]+)”/g;
/** True when `held` holds the label with that quote as one row: "Employer | Must contribute 25% …". */
const rowHeld = (held: readonly string[], label: string, quote: string) => held.some((q) => q.startsWith(`${label} | ${quote}`));
/** Dollar amounts, shares and fractions as written: "$5,000", "75%", "2/3". */
const AMOUNTS = /\$[\d,]+(?:\.\d+)?[KkMm]?|\b\d+(?:\.\d+)?%|\b\d+\s*\/\s*\d+\b/g;
const profile = (change: Partial<EvaluationProfile>): EvaluationProfile => ({
  goals: [],
  ventureType: "service",
  activityTags: [],
  province: "AB",
  employmentStatus: "employee",
  structure: "sole-prop",
  targetRevenueY1: 0,
  targetRevenueY3: 0,
  hireFirst: false,
  capitalPurchasePlanned: false,
  ...change,
});
const card = (p: EvaluationProfile, id = ID) => evaluateProfile(p, { today: TODAY }).unlocks.find((u) => u.id === id);
/** A doc's words with its line breaks taken out, so a phrase split over two lines is found. */
const readFlat = (file: string) => readFileSync(path.join(__dirname, "..", file), "utf8").replace(/\s+/g, " ");

describe("the Canada-Alberta Productivity Grant in the programs catalog", () => {
  it("is there once, under its own new id, as a grant for Alberta open at every structure and kind of work", () => {
    expect(grantProgramsV2026.filter((p) => p.id === ID)).toHaveLength(1);
    const p = capg()!;
    expect(p.label).toBe("Canada-Alberta Productivity Grant");
    expect(p.kind).toBe("grant");
    expect(p.provinces).toEqual(["AB"]);
    expect(p.structures).toEqual(["sole-prop", "sole-prop-gst", "ccpc"]);
    expect(p.activityTags).toEqual([]);
    expect(p.ratesByStructure).toBeUndefined();
    expect(p.citations.map((c) => c.url)).not.toContain(OLD_JOB_GRANT_PAGE);
  });

  it("its one source is Alberta's page, with one tool check of 2026-10-29 holding the four quotes of 2026-10-23 and the new ones, and read by the maintainer", () => {
    const [c, ...rest] = capg()!.citations;
    expect(rest).toEqual([]);
    expect(c).toMatchObject({ authority: "provincial", jurisdiction: "AB", url: PAGE });
    // Answer 2 of 2026-10-29: "One new check that holds the old and new sentences", dated by its run. Until then the
    // check was of 2026-10-23 and held the four quotes alone.
    expect(c!.toolCheck).toEqual({ checkedOn: CHECKED_ON, quotes: HELD });
    for (const quote of HELD_2026_10_23) expect(c!.toolCheck!.quotes, quote).toContain(quote);
    // Until 2026-10-27 no read was on record, and the card said a tool checked it and that no person had read it, in
    // amber. The maintainer read the page in full on 2026-10-25: his read stays, and wins on screen, in grey.
    expect(howChecked(c!)).toEqual({ kind: "person", on: "2026-10-25" });
    expect(howCheckedWords(c!)).toBe("Read by a person on 2026-10-25");
    expect(citationCheckProblems(c!, CHECKED_ON)).toEqual([]);
  });

  it("every amount and share it states sits inside a quote of that page", () => {
    const p = capg()!;
    const held = capg()!.citations[0]!.toolCheck!.quotes.join("\n");
    const lines = linesOf(p);
    expect(lines.join("\n").match(AMOUNTS)).toEqual(expect.arrayContaining(["25%", "75%", "$5,000", "$100,000"]));
    for (const line of lines) {
      for (const quote of quotesIn(line)) expect(held, quote).toContain(quote);
      expect(own(line).match(AMOUNTS) ?? [], line).toEqual([]);
    }
  });

  it("planted control: the Job Grant's old share, in DotAmi's own words, is caught", () => {
    expect(own("Up to 2/3 of training costs").match(AMOUNTS)).toEqual(["2/3"]);
  });

  // "No time word the no-times check sees": the quotes hold "per fiscal year", the page's own words, which
  // tests/helpers/time-words.ts doesn't flag (a rate, not a wait).
  it("every line states nothing but the page's held words, and no time word the no-times check sees, even inside its quotes", () => {
    for (const line of linesOf(capg()!)) {
      expect(quotesIn(line).length, line).toBeGreaterThan(0);
      expect(own(line), line).not.toMatch(/\b(may|can|will|must|should|qualif\w*|eligib\w*|guarantee\w*|deductible|you\w*)\b/i);
      expect(findTimeWords(line), line).toEqual([]);
      // The page never says "sole proprietor", so no line says whether one counts as an employer, either way.
      expect(line, line).not.toMatch(/sole propriet|incorporat/i);
    }
  });

  it("DotAmi's own words are labels and separators only: the page's name, the compass's \"If\", the table's row labels", () => {
    for (const line of linesOf(capg()!)) expect(afterLabels(line), line).toBe("");
    // The legal line, in full, without its quotes.
    expect(own(capg()!.lensAnnotations.legal).replace(/\s+/g, " ").trim()).toBe("Alberta's page on this program: Employer: ; … … ; ; .");
    // Planted control: the line as it read before 2026-10-24, a subject in DotAmi's own words, is caught.
    expect(afterLabels("Alberta's page on this program, on the employer's own share: “Must contribute 25%”.")).not.toBe("");
  });

  it("the table's row labels are the page's own cells: each label before a line is held with that line as one row (answer 1)", () => {
    const held = capg()!.citations[0]!.toolCheck!.quotes;
    for (const row of ROWS) expect(held, row).toContain(row);
    const p = capg()!;
    let labelled = 0;
    for (const line of linesOf(p)) {
      for (const [, label, quote] of line.matchAll(LABELLED)) {
        expect(rowHeld(held, label!, quote!), `${label}: “${quote}”`).toBe(true);
        labelled += 1;
      }
      // Wherever the 25% or the 75% line is quoted, its row's label is written before it.
      for (const [label, cell] of Object.entries(ROW_LABELS)) {
        const start = `“${cell.slice(0, 30)}`;
        expect(line.split(start).length, `${label} before ${start} in ${line}`).toBe(line.split(`${label}: ${start}`).length);
      }
    }
    // The card's line (the payoff) shows both labels; the description, the legal line and estimatedValue show theirs.
    expect(p.lensAnnotations.tax).toContain("Employer: “Must contribute 25%");
    expect(p.lensAnnotations.tax).toContain("Government of Alberta: “Contributes the other 75%");
    expect(labelled).toBe(6);
    // Planted control: the labels swapped are not a row the page has.
    expect(rowHeld(held, "Government of Alberta", "Must contribute 25% of the total eligible training costs")).toBe(false);
    expect(rowHeld(held, "Employer", "Contributes the other 75% of the cost")).toBe(false);
  });

  it("the employer requirements and what training counts: the page's lists, each after its own lead-in, a left-out item's place marked …", () => {
    const p = capg()!;
    // “Registered employers must also:” follows the page's list of eligible employer types ("Employers must be one of
    // the following eligible types:" …), which isn't held: it comes close to whether a sole proprietor counts, the
    // maintainer's call. So a "…" stands before the lead-in too (the review of #223).
    const requirements =
      "… “Registered employers must also:” … “be in good standing”; “carry Workers Compensation Benefits coverage for trainees”; “comply with provincial agreements”";
    expect(p.eligibility).toContain(requirements);
    expect(p.lensAnnotations.legal).toContain(requirements);
    expect(p.eligibility).toContain(
      "“Training must be directly related to the trainees’ current or future job and fall within at least one of the following skills categories:” “Business Process and Operations Management: Improving processes, systems, operations, and resource management”; “Technical: Specialized skills that enhance efficiency, quality, and problem solving”; “Digital and Technological: Skills to use, manage, and integrate digital tools and technologies”.",
    );
    expect(p.eligibility).toContain(
      "“Training must also:” “be relevant to the trainee’s job”; … “include interaction with a qualified instructor”; “be instructional and structured”; “take place in Alberta, except under exceptional circumstances”.",
    );
    // "examination fees", the list's first item, is two words: under the checker's three, so it can't be held and a "…"
    // marks it. The page's sentence between the list and its NOTE, on travel costs, is quoted in its place (it was
    // silently left out until the review of #223).
    expect(p.eligibility).toContain(
      "“The Canada–Alberta Productivity Grant is available for direct training costs only, including:” … “tuition or course fees charged by the training provider”; “textbooks or software”. “Small and medium-sized organizations may be eligible for travel costs related to training”. “Employee wages and general business assets are not eligible”.",
    );
  });

  it("the page's three time items are kept in the source's tool check only, on no line, on no screen, and the docs say so", () => {
    // components/shared/citation-links.tsx draws a tool check's quotes under "Words found on the page:", and the
    // playbook export prints them (lib/playbook/render-markdown.ts), only while no read is on record: until 2026-10-27
    // the one-year rule was on screen there, as the page's own words. The maintainer's read of 2026-10-25 wins on
    // screen (rule 3 of docs/engines/citations.md), so the words aren't drawn; the tool check keeps them. Until
    // 2026-10-29 `eligibility` held the one-year rule too.
    const source = capg()!.citations[0]!;
    expect(toolCheckQuotes(source)).toEqual([]);
    for (const quote of OFF_LINES) {
      expect(source.toolCheck?.quotes, quote).toContain(quote);
      for (const line of linesOf(capg()!)) expect(line, quote).not.toContain(quote);
    }
    for (const [file, words] of [
      ["docs/engines/grants.md", "so no screen shows the one-year rule now"],
      ["docs/engines/grants.md", "Each is held in the source's tool check only, on no line of the entry"],
      ["docs/engines/citations.md", "so it is on no screen now"],
    ] as const) {
      expect(readFlat(file).includes(words), `${file} says “${words}”`).toBe(true);
    }
    const saidItWasOnNoScreen: [string, string][] = [
      ["CHANGELOG.md", "is kept in the entry, quoted, and not drawn on the card"],
      ["docs/engines/grants.md", "The one-year rule is in `eligibility` only, which no screen draws"],
      ["docs/engines/grants.md", "(it is in `eligibility`, which no screen draws for a program)"],
      ["docs/engines/citations.md", "the one-year rule is kept in `eligibility`, which no screen draws"],
    ];
    for (const [file, words] of saidItWasOnNoScreen) expect(readFlat(file).includes(words), `${file} still says “${words}”`).toBe(false);
  });

  it("planted control: two of the three are times the no-times check sees; the third it doesn't, so the list above names it", () => {
    expect(findTimeWords(OFF_LINES[0])).not.toEqual([]);
    expect(findTimeWords(OFF_LINES[2])).not.toEqual([]);
    expect(findTimeWords(OFF_LINES[1])).toEqual([]);
  });

  it("who funds it: `authority` is \"Alberta / federal\", on the page's own sentence, held by the check and quoted in the catalog's comment", () => {
    expect(capg()!.authority).toBe("Alberta / federal");
    expect(capg()!.citations[0]!.toolCheck!.quotes).toContain(FUNDED_BY);
    const source = readFileSync(path.join(__dirname, "..", "lib", "engines", "grants", "v2026", "programs.ts"), "utf8");
    const entry = source.slice(source.indexOf('id: "grant-capg"'));
    const beforeAuthority = entry.slice(0, entry.indexOf('authority: "Alberta / federal"')).replace(/\r?\n\s*\/\/ ?/g, " ");
    expect(beforeAuthority).toContain(FUNDED_BY);
    // No line reconciles it with the table's "Government of Alberta" row in DotAmi's own words (none says it at all).
    for (const line of linesOf(capg()!)) expect(line).not.toContain("Government of Canada");
  });
});

describe("who is shown it (lib/brain/evaluate.ts evaluateGrant)", () => {
  it("every Alberta idea, at every structure and kind of work: a grant to check first, never a near-miss, its reason naming only the place", () => {
    for (const structure of ["sole-prop", "ccpc"] as const) {
      for (const activityTags of [[], ["Trades"], ["Software / SaaS"], ["Hospitality"]]) {
        for (const hireFirst of [false, true]) {
          const at = `${structure} ${activityTags.join(",")} ${hireFirst}`;
          const c = card(profile({ structure, activityTags, hireFirst }));
          expect(c, at).toBeDefined();
          expect(c!.typeChip, at).toBe("Grant");
          expect(c!.state, at).toBe("yellow");
          expect(c!.fork, at).toBeUndefined();
          expect(c!.why, at).toBe("Shown because you selected Alberta.");
          expect(c!.payoff, at).toBe(capg()!.lensAnnotations.tax);
        }
      }
    }
  });

  it("planted control: a program that needs a corporation still reads as a near-miss for a sole proprietor", () => {
    expect(card(profile({ activityTags: ["Software / SaaS"] }), "grant-irap")!.fork?.label).toBe("Incorporating (CCPC) would unlock this");
  });

  it("no idea outside Alberta, or with no province yet", () => {
    for (const province of ["ON", "BC", "MB", null] as const) expect(card(profile({ province })), String(province)).toBeUndefined();
  });

  // The Job Grant's address opens this program's page, so while it was in the catalog an Alberta idea in its kinds of
  // work got two cards for one program. #207 retired grant-cajg; until main with #207 was merged in (2026-10-27) this
  // was an `it.fails`.
  it("the Canada-Alberta Job Grant is off the catalog, so no second card opens this page (#207 retired it)", () => {
    expect(grantProgramsV2026.map((p) => p.id)).not.toContain("grant-cajg");
    const trades = profile({ activityTags: ["Trades"], structure: "sole-prop-gst" });
    expect(card(trades, "grant-cajg")).toBeUndefined();
    // One card for the program: no other card the idea is shown cites its page or the Job Grant's old address.
    const opening = evaluateProfile(trades, { today: TODAY }).unlocks.filter((u) =>
      u.citations.some((c) => c.url === PAGE || c.url === OLD_JOB_GRANT_PAGE),
    );
    expect(opening.map((u) => u.id)).toEqual([ID]);
  });

  it("the Job Grant stays in the retired list, under the old address; the Productivity Grant's id is not a retired one", () => {
    const retired = RETIRED_GRANT_PROGRAMS.find((p) => p.id === "grant-cajg");
    expect(retired).toMatchObject({ url: OLD_JOB_GRANT_PAGE });
    expect(retired!.why).toContain(PAGE);
    expect(RETIRED_GRANT_PROGRAMS.map((p) => p.id)).not.toContain(ID);
    const live = new Set(grantProgramsV2026.map((p) => p.id as string));
    for (const { id } of RETIRED_GRANT_PROGRAMS) expect(live.has(id), id).toBe(false);
    // No program in the catalog cites the Job Grant's old address.
    for (const p of grantProgramsV2026) expect(p.citations.map((c) => c.url), p.id).not.toContain(OLD_JOB_GRANT_PAGE);
  });
});

describe("where the map draws it", () => {
  it("road 0's Hire first employee names it, and so do the federal steps built from road 0's parts; the apprentice road doesn't", () => {
    for (const road of [generalRoadV2026, roadFederalStepsCA]) {
      expect(road.steps.find((s) => s.id === "branch-hire-first-employee")!.engineHints, road.id).toContain(ID);
    }
    for (const step of roadApprenticeToOwnShopAB.steps) expect(step.engineHints ?? [], step.id).not.toContain(ID);
  });

  it("Hire first employee's panel lists it for an Alberta idea, and no card shows it in Ontario", () => {
    const run = (province: "AB" | "ON") =>
      evaluateRoad(input({ road: generalRoadV2026, roadChosen: false, skillItems: [...skillItemsV2026], scenario: inventedIdea({ province, hireFirst: true }) }));
    const step = generalRoadV2026.steps.find((s) => s.id === "branch-hire-first-employee")!;
    expect(itemsForStep(run("AB").rules.unlocks, step).forThisStage.map((u) => u.id)).toContain(ID);
    expect(run("ON").rules.unlocks.map((u) => u.id)).not.toContain(ID);
  });
});
