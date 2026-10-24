/**
 * The Canada-Alberta Productivity Grant (`grant-capg`; the maintainer's call a-call-1, "ADD it", on his reading list of
 * 2026-10-23): in the programs catalog under its own id, saying only what Alberta's page says in the four quotes the
 * reading list's tool found on it that day, shown for every Alberta idea as a grant to check first and never as needing
 * incorporation, and named by road 0's Hire first employee. Its source is a tool check: no person is recorded as having
 * read the page yet (his saved reads come in a later change). Every check fails on the code before (no such entry),
 * except the planted controls beside the ones that could pass on nothing, and "no idea outside Alberta", which holds
 * before as after.
 *
 * Once #207 is in, this file also checks the id against RETIRED_GRANT_PROGRAMS (the Job Grant's `grant-cajg` stays
 * retired, and no retired id is in the catalog).
 */
import { describe, expect, it } from "vitest";

import { evaluateProfile, type EvaluationProfile } from "@/lib/brain";
import { itemsForStep } from "@/lib/brain/node-items";
import { grantProgramsV2026 } from "@/lib/engines/grants/v2026/programs";
import type { GrantProgram } from "@/lib/engines/grants/v2026/types";
import { generalRoadV2026, roadApprenticeToOwnShopAB, roadFederalStepsCA, skillItemsV2026 } from "@/lib/engines/roads/v2026";
import { citationCheckProblems, howChecked, howCheckedWords } from "@/lib/engines/shared/citation-check";
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
const HELD = [
  "Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire.",
  "Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year.",
  "An employer is eligible for up to a maximum amount of $100,000 per fiscal year.",
  "be operational in Alberta for at least one year",
];
const TODAY = "2026-10-24";
const capg = (): GrantProgram | undefined => grantProgramsV2026.find((p) => p.id === ID);
// Quotes in curly quote marks, the way the cards and the citations' word lists quote a page.
const QUOTED = /“([^”]+)”/g;
const quotesIn = (line: string) => [...line.matchAll(QUOTED)].map((m) => m[1]!);
const own = (line: string) => line.replace(QUOTED, " ");
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

  it("its one source is Alberta's page, checked by a tool on 2026-10-23, holding the four quotes found that day and no other", () => {
    const [c, ...rest] = capg()!.citations;
    expect(rest).toEqual([]);
    expect(c).toMatchObject({ authority: "provincial", jurisdiction: "AB", url: PAGE });
    expect(c!.toolCheck).toEqual({ checkedOn: "2026-10-23", quotes: HELD });
    // No read is on record, so the card says a tool checked it and that no person has read it, in amber.
    expect(howChecked(c!).kind).toBe("tool");
    expect(howCheckedWords(c!)).toBe(
      "Checked by a tool on 2026-10-23: it found on the page the exact words this entry relies on. Not read by a person yet.",
    );
    expect(citationCheckProblems(c!, TODAY)).toEqual([]);
  });

  it("every amount and share it states sits inside a quote of that page", () => {
    const p = capg()!;
    const held = HELD.join("\n");
    const lines = [p.description, p.eligibility, p.lensAnnotations.tax, p.lensAnnotations.legal, p.estimatedValue ?? ""];
    expect(lines.join("\n").match(AMOUNTS)).toEqual(expect.arrayContaining(["25%", "75%", "$5,000", "$100,000"]));
    for (const line of lines) {
      for (const quote of quotesIn(line)) expect(held, quote).toContain(quote);
      expect(own(line).match(AMOUNTS) ?? [], line).toEqual([]);
    }
  });

  it("planted control: the Job Grant's old share, in DotAmi's own words, is caught", () => {
    expect(own("Up to 2/3 of training costs").match(AMOUNTS)).toEqual(["2/3"]);
  });

  it("the line its card shows, its eligibility and its legal line state nothing but the page's held words, and no time of DotAmi's own", () => {
    const p = capg()!;
    for (const line of [p.lensAnnotations.tax, p.eligibility, p.lensAnnotations.legal]) {
      expect(quotesIn(line).length, line).toBeGreaterThan(0);
      expect(own(line), line).not.toMatch(/\b(may|can|will|must|should|qualif\w*|eligib\w*|guarantee\w*|deductible)\b/i);
      expect(findTimeWords(own(line)), line).toEqual([]);
    }
    // The line the card shows holds no time even inside its quotes: the page's one-year rule stays in `eligibility`,
    // which no screen draws for a program.
    expect(findTimeWords(p.lensAnnotations.tax)).toEqual([]);
  });

  it("planted control: the page's one-year rule is a time the check sees, so it stays off the card's line", () => {
    expect(findTimeWords(HELD[3]!)).not.toEqual([]);
    expect(capg()!.lensAnnotations.tax).not.toContain(HELD[3]!);
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
