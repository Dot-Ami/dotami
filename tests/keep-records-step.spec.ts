import { describe, expect, it } from "vitest";

import { allCatalogCitations } from "@/lib/engines/all-citations";
import {
  generalRoadV2026,
  roadApprenticeToOwnShopAB,
  roadsV2026,
  roadStartingAnyBusinessAB,
  skillItemsV2026,
  type Road,
  type RoadStep,
} from "@/lib/engines/roads/v2026";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { evaluateRoad } from "@/lib/roads";
import { EMPLOYMENT_WORDS, STRUCTURE_WORDS } from "@/lib/roads/words";

import { input, inventedIdea } from "./helpers/road-to-evaluate";

/**
 * "Keep your records from day one" (2026-10-14): one step on every business road. A business has to
 * keep its records from the start, and records missed early are hard to put back together, so the step
 * sits where a business begins on each road:
 *
 * - road 0, Starting any business in Alberta: in the first column, with the other "before you open"
 *   steps, leading to Sole Prop activation. Records cover what a business spends as well as what it
 *   takes in, and spending can start before the first sale.
 * - road 1, From apprentice to your own shop: in "Open the doors", right after the fork's
 *   "Open your own shop" side, so it is on the path only for someone who picks the shop.
 *
 * Every line is written from the CRA's own Keeping records pages and checked by the quote tool on
 * 2026-10-14 (option B, docs/engines/citations.md): found words, never a read nobody did.
 */

const CHECKED_ON = "2026-10-14";
const CRA_RECORDS = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/";

const ROAD0_STEP = "step-start-keep-records";
const ROAD1_STEP = "step-shop-keep-records";
const ROAD0_LINES = ["dw-start-records-what", "dw-start-records-every-transaction", "dw-start-records-how", "dw-start-records-where-how-long"];
const ROAD1_LINES = ["dw-shop-records-what", "dw-shop-records-every-transaction", "dw-shop-records-how", "dw-shop-records-where-how-long"];

function stepOn(road: Road, id: string): RoadStep {
  const found = road.steps.find((s) => s.id === id);
  if (!found) throw new Error(`no step ${id} on ${road.id}`);
  return found;
}

const quotesOf = (...citations: EngineCitation[]) => citations.flatMap((c) => c.toolCheck?.quotes ?? []).join(" | ");

/**
 * Right after its "Generally ... six years" sentence, the CRA's where-and-how-long page says "In some
 * situations, you must retain your records for a different period of time" and lists them. Two fit a new
 * business directly: records about long-term property are kept indefinitely, and a late-filed return moves
 * the start of the six years to the filing date. The same page notes that records kept outside Canada and
 * opened from Canada don't count as kept in Canada. Returns what the line leaves out, each needing both the
 * words on the line and the CRA's own words among its quotes.
 */
function retentionGaps(line: { text: string; citation?: EngineCitation; quotes?: string[] }): string[] {
  const quotes = (line.quotes ?? line.citation?.toolCheck?.quotes ?? []).join(" | ");
  const needs: [string, RegExp, string][] = [
    ["different period", /a different period/, "In some situations, you must retain your records for a different period of time."],
    ["indefinitely", /indefinitely for records about long-term acquisitions and disposal of property/, "you have to keep them indefinitely"],
    [
      "late return",
      /income tax return filed late/,
      "If you file an income tax return late, you must keep your records for six years from the date you file that return.",
    ],
    [
      "kept abroad",
      /kept outside Canada and accessed electronically from Canada are not considered to be kept in Canada/,
      "Records kept outside of Canada and accessed electronically from Canada are not considered to be records kept in Canada.",
    ],
  ];
  return needs.filter(([, words, quote]) => !words.test(line.text) || !quotes.includes(quote)).map(([name]) => name);
}

describe("the step is on both business roads, with its own permanent ids", () => {
  it("road 0: in the first column, after the other before-you-open steps, leading to Sole Prop activation", () => {
    const step = stepOn(roadStartingAnyBusinessAB, ROAD0_STEP);
    expect(step.label).toBe("Keep your records from day one");
    const first = roadStartingAnyBusinessAB.columns[0]!;
    expect(first.id).toBe("tier-1-before");
    expect(first.steps.at(-1)).toBe(ROAD0_STEP);
    expect(step.next).toEqual(["stage-1-sole-prop-activation"]);
    expect(step.doneWhen.map((d) => d.id)).toEqual(ROAD0_LINES);
  });

  it("road 1: first in Open the doors, and only the Open your own shop side leads to it", () => {
    const road = roadApprenticeToOwnShopAB;
    const step = stepOn(road, ROAD1_STEP);
    expect(step.label).toBe("Keep your records from day one");
    const open = road.columns.find((c) => c.id === "col-shop-open")!;
    expect(open.steps[0]).toBe(ROAD1_STEP);
    expect(stepOn(road, "step-shop-open-own-shop").next).toContain(ROAD1_STEP);
    expect(stepOn(road, "step-shop-stay-employed").next).not.toContain(ROAD1_STEP);
    expect(road.steps.filter((s) => s.next.includes(ROAD1_STEP)).map((s) => s.id)).toEqual(["step-shop-open-own-shop"]);
    expect(step.doneWhen.map((d) => d.id)).toEqual(ROAD1_LINES);
  });

  it("the two steps say the same things from the same pages; only their ids differ", () => {
    const zero = stepOn(roadStartingAnyBusinessAB, ROAD0_STEP);
    const one = stepOn(roadApprenticeToOwnShopAB, ROAD1_STEP);
    expect(one.summary).toBe(zero.summary);
    expect(one.doneWhen.map((d) => [d.text, d.citation])).toEqual(zero.doneWhen.map((d) => [d.text, d.citation]));
    expect(one.citations).toEqual(zero.citations);
  });
});

describe("its lines come from the CRA's own Keeping records pages, checked by the tool today", () => {
  const steps = () => [stepOn(roadStartingAnyBusinessAB, ROAD0_STEP), stepOn(roadApprenticeToOwnShopAB, ROAD1_STEP)];

  it("between two and four done-when lines, each with its own CRA citation", () => {
    for (const step of steps()) {
      expect(step.doneWhen.length).toBeGreaterThanOrEqual(2);
      expect(step.doneWhen.length).toBeLessThanOrEqual(4);
      for (const d of step.doneWhen) {
        expect(d.text, d.id).not.toMatch(/\n/);
        expect(d.citation.authority, d.id).toBe("CRA");
        expect(d.citation.url.startsWith(CRA_RECORDS), d.id).toBe(true);
      }
    }
  });

  it("every source is a tool check dated 2026-10-14 with quotes of three words or more, and none claims a read", () => {
    for (const step of steps()) {
      for (const c of [...step.citations, ...step.doneWhen.map((d) => d.citation)]) {
        expect(c.toolCheck?.checkedOn, step.id).toBe(CHECKED_ON);
        expect(c.toolCheck!.quotes.length, step.id).toBeGreaterThan(0);
        for (const q of c.toolCheck!.quotes) {
          expect(q.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length, q).toBeGreaterThanOrEqual(3);
        }
        expect(c.lastVerified, step.id).toBeUndefined();
        expect(c.readBy, step.id).toBeUndefined();
      }
    }
  });

  it("each line keeps the CRA's own conditions: who by law, 'generally' six years, 'preferably' in Canada", () => {
    const [zero] = steps();
    const line = (id: string) => zero!.doneWhen.find((d) => d.id === id)!;
    expect(quotesOf(line("dw-start-records-what").citation)).toContain("persons carrying on a business or engaged in commercial activity");
    const howLong = line("dw-start-records-where-how-long");
    expect(howLong.text).toMatch(/generally for six years from the end of the last tax year they relate to/);
    expect(quotesOf(howLong.citation)).toContain(
      "Generally, you must keep all required records and supporting documents for a period of six years from the end of the last tax year they relate to.",
    );
    expect(howLong.text).toMatch(/written permission/);
    const how = line("dw-start-records-how");
    expect(how.text).toMatch(/preferably at a site in Canada other than your business location/);
    expect(quotesOf(how.citation)).toContain("For electronic records, also make sure:");
    const every = line("dw-start-records-every-transaction");
    expect(every.text).toMatch(/input tax credits/);
    expect(quotesOf(every.citation)).toContain("If you do not record your transactions, you may forget some of your expenses or ITCs");
  });

  it("the how-long line says the CRA lists other periods, and where records kept abroad stand", () => {
    for (const step of steps()) {
      const howLong = step.doneWhen.find((d) => d.id.endsWith("-records-where-how-long"))!;
      expect(retentionGaps(howLong), step.id).toEqual([]);
    }
  });

  it("control: the check catches the line as it was first written (six years only, no exceptions)", () => {
    // The line as commit c86a637 wrote it: true, but silent on the periods the CRA lists right after.
    const first = {
      text: "You keep them at your place of business or your residence in Canada (unless the CRA gives you written permission to keep them elsewhere), generally for six years from the end of the last tax year they relate to: for an individual that is the calendar year, for a corporation its fiscal period. Destroying them sooner needs the CRA's written permission first.",
      quotes: [
        "You must keep records at your place of business or your residence in Canada, unless the Canada Revenue Agency (CRA) gives you written permission to keep them elsewhere.",
        "Generally, you must keep all required records and supporting documents for a period of six years from the end of the last tax year they relate to.",
      ],
    };
    expect(retentionGaps(first)).toEqual(["different period", "indefinitely", "late return", "kept abroad"]);
  });

  it("the summary says it is the CRA speaking, and that some situations have another period", () => {
    for (const step of steps()) {
      expect(step.summary).toMatch(/^The CRA says that, by law, /);
      expect(step.summary).toMatch(/a different period in some situations/);
    }
  });

  it("no line tells the person what to do: information and options, never 'you should'", () => {
    for (const step of steps()) {
      for (const t of [step.label, step.summary, ...step.doneWhen.map((d) => d.text)]) {
        expect(t, t).not.toMatch(/\b(you should|we recommend|best to|make sure you)\b/i);
      }
    }
  });

  it("carries no amount and no cost line: keeping records has no official fee", () => {
    for (const step of steps()) expect(step.costs).toEqual([]);
  });

  it("every one of its sources is on the list the quote checker re-checks", () => {
    const listed = allCatalogCitations().map((l) => l.citation);
    for (const step of steps()) {
      for (const c of [...step.citations, ...step.doneWhen.map((d) => d.citation)]) expect(listed).toContain(c);
    }
  });
});

describe("road evaluation: on the path for a running business, from the road's own arrows (no new rule code)", () => {
  const road0 = (change: Parameters<typeof inventedIdea>[0] = {}) =>
    evaluateRoad(input({ road: generalRoadV2026, roadChosen: false, skillItems: [], forkPicks: {}, scenario: inventedIdea(change) }));
  const stateOf = (result: ReturnType<typeof evaluateRoad>, id: string) => result.steps.find((s) => s.stepId === id)!;

  it("road 0: on your road for every idea, whatever its structure or work situation; no tax rule colours it", () => {
    for (const structure of Object.keys(STRUCTURE_WORDS) as (keyof typeof STRUCTURE_WORDS)[]) {
      for (const employmentStatus of Object.keys(EMPLOYMENT_WORDS) as (keyof typeof EMPLOYMENT_WORDS)[]) {
        const step = stateOf(road0({ structure, structureSource: "user", employmentStatus }), ROAD0_STEP);
        expect(step.state, `${structure} / ${employmentStatus}`).toBe("applies");
        expect(step.reason).toEqual({ kind: "on-your-road" });
      }
    }
    // The tax rules colour only the map's ten stages; this step's state comes from the road itself.
    expect(Object.keys(road0().rules.nodeStates)).not.toContain(ROAD0_STEP);
  });

  it("road 0: the person's own 'not for me' still greys it, and never removes it", () => {
    const result = evaluateRoad(
      input({
        road: generalRoadV2026,
        roadChosen: false,
        skillItems: [],
        forkPicks: {},
        progress: [{ stepId: ROAD0_STEP, status: "not-for-me", doneWhenIds: [] }],
      }),
    );
    expect(stateOf(result, ROAD0_STEP)).toMatchObject({ state: "not-on-your-path", reason: { kind: "not-for-me" } });
  });

  describe("road 1: it follows the fork's pick", () => {
    const road = roadApprenticeToOwnShopAB;
    const evaluate = (forkPicks = {}) => evaluateRoad(input({ road, roadChosen: true, skillItems: [...skillItemsV2026], forkPicks }));
    const FORK = "fork-shop-employed-or-own";

    it("before the pick: check first, waiting on the fork", () => {
      expect(stateOf(evaluate(), ROAD1_STEP)).toMatchObject({ state: "check-first", reason: { kind: "after-fork-not-picked", forkId: FORK } });
    });

    it("Open your own shop picked: on your road", () => {
      const step = stateOf(evaluate({ [FORK]: { stepId: "step-shop-open-own-shop", from: "you" } }), ROAD1_STEP);
      expect(step).toMatchObject({ state: "applies", reason: { kind: "on-your-road" } });
    });

    it("Stay employed picked: off the path, saying it comes after the side not picked", () => {
      const step = stateOf(evaluate({ [FORK]: { stepId: "step-shop-stay-employed", from: "you" } }), ROAD1_STEP);
      expect(step).toMatchObject({ state: "not-on-your-path", reason: { kind: "after-other-side", sideStepId: "step-shop-open-own-shop" } });
    });
  });
});

/**
 * The rule behind the step: every road with a business part (kind "business" or "both") has it, once.
 * A road written later without it fails here; a career-only road needs none.
 */
function businessRoadsWithoutRecordsStep(roads: readonly Road[]): string[] {
  return roads
    .filter((road) => road.kind !== "career")
    .filter((road) => road.steps.filter((s) => s.label === "Keep your records from day one").length !== 1)
    .map((road) => road.id);
}

describe("every business road has the step, once", () => {
  it("holds for every road in the catalog", () => {
    expect(roadsV2026.filter((r) => r.kind !== "career").length).toBeGreaterThan(0);
    expect(businessRoadsWithoutRecordsStep(roadsV2026)).toEqual([]);
  });

  it("control: the check fails on a business road with the step taken out, and passes a career-only road", () => {
    const without = { ...roadApprenticeToOwnShopAB, steps: roadApprenticeToOwnShopAB.steps.filter((s) => s.id !== ROAD1_STEP) };
    expect(businessRoadsWithoutRecordsStep([without])).toEqual([roadApprenticeToOwnShopAB.id]);
    expect(businessRoadsWithoutRecordsStep([{ ...without, kind: "career" }])).toEqual([]);
  });
});
