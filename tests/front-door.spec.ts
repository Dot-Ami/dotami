/**
 * The way in (docs/architecture/future-cockpit.md § 1, "The way in as built"): the front door's three
 * doors, *Your destination*'s four questions kept as data with a receipt after each, and *Pick a future*'s
 * cards. Pure parts only; the routes and the data file are in tests/front-door-routes.spec.ts, the screens
 * in e2e/front-door.spec.ts.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GoalBar } from "@/components/cockpit/goal-bar";
import { cockpitWords } from "@/lib/cockpit/words";
import { generalRoadV2026, roadApprenticeToOwnShopAB, roadsV2026, skillItemsV2026, type Road } from "@/lib/engines/roads/v2026";
import { howChecked } from "@/lib/engines/shared/citation-check";
import { formatMoney } from "@/lib/format/money-and-months";
import { futureCards, sourcesLine } from "@/lib/front-door/futures";
import { DESTINATION_PLACES, DESTINATION_QUESTIONS, LOOKING_FOR, type LookingFor } from "@/lib/front-door/questions";
import { destinationReceipt, incomeReceipt, lookingForReceipt, placeReceipt, roadIncludes } from "@/lib/front-door/receipts";
import { firstSaveForPickedFuture, scenarioForPickedFuture } from "@/lib/front-door/start-future";
import { destinationWords, frontDoorWords, incomePromptWords, pickWords } from "@/lib/front-door/words";
import { parseFirstSave } from "@/lib/db/parse-scenario-input";
import { evaluateRoad } from "@/lib/roads";
import { buildEvaluationProfileFromScenario } from "@/lib/scenarios/evaluation-profile";
import { cockpitInput } from "@/lib/cockpit/view";

/** The verdict words every cockpit sentence is checked against (tests/road-evaluation.spec.ts). */
const VERDICT = /\b(enough|ready|best|should|recommend\w*|on track|behind)\b/i;

/** Every string a words object can produce, filling each function with plain values. */
function sentencesOf(words: unknown): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (typeof value === "function") {
      const fn = value as (...args: unknown[]) => unknown;
      for (const args of [[0, 0, 0], [1, 1, 1], [3, 2, 9], ["Alberta", 7_000_000, "2026-10-12"], ["“Label”", "Yukon", "CA-YT"]]) {
        let result: unknown;
        try {
          result = fn(...args);
        } catch {
          // A function that needs other kinds of values is filled by the next set.
        }
        if (typeof result === "string") out.push(result);
      }
    } else if (value && typeof value === "object") for (const v of Object.values(value)) walk(v);
  };
  walk(words);
  return out;
}

describe("Your destination: the four questions are data", () => {
  it("four questions, in this order, each with its question, why and what it unlocks", () => {
    expect(DESTINATION_QUESTIONS.map((q) => q.id)).toEqual(["destination", "looking-for", "place", "income-wanted"]);
    for (const q of DESTINATION_QUESTIONS) {
      expect(q.ask.length, q.id).toBeGreaterThan(10);
      expect(q.why.length, q.id).toBeGreaterThan(10);
      expect(q.unlocks.length, q.id).toBeGreaterThan(10);
    }
  });

  it("the person's words, a choice of three, a place by code, and a yearly amount; only the place has no way to skip", () => {
    const [words, lookingFor, place, income] = DESTINATION_QUESTIONS;
    expect(words.answer).toEqual({ kind: "own-words", maxChars: 2000 });
    expect(words.skip).toBe("I don't know yet");
    expect(lookingFor.answer.kind).toBe("one-choice");
    // Ids are forever: the screen, the tab and the data file all keep these.
    expect(lookingFor.answer.kind === "one-choice" && lookingFor.answer.choices.map((c) => c.id)).toEqual(["business", "career", "both-or-not-sure"]);
    expect(LOOKING_FOR).toEqual(["business", "career", "both-or-not-sure"]);
    // "Both, or not sure" is this question's "I don't know", so it has no separate skip.
    expect(lookingFor.skip).toBeNull();
    expect(place.answer).toEqual({ kind: "place", places: DESTINATION_PLACES });
    expect(place.skip).toBeNull();
    expect(place.required).toBe(true);
    expect(income.answer).toEqual({ kind: "amount-per-year", currency: "CAD" });
    expect(income.skip).toBe("Skip");
    expect(income.required).toBe(false);
  });

  it("the places are Canada's thirteen provinces and territories, as international codes", () => {
    expect(DESTINATION_PLACES).toEqual(["CA-AB", "CA-BC", "CA-MB", "CA-NB", "CA-NL", "CA-NS", "CA-NT", "CA-NU", "CA-ON", "CA-PE", "CA-QC", "CA-SK", "CA-YT"]);
  });

  it("each says where its answer is kept", () => {
    expect(DESTINATION_QUESTIONS.map((q) => q.keptIn)).toEqual([
      "person-statement:destination",
      "future:looking-for",
      "future:place",
      "person-figure:income-wanted",
    ]);
  });
});

describe("the receipts: worked out from the answer and the catalogs, never a verdict", () => {
  it("your words: kept, kept in this tab only, or not given", () => {
    expect(destinationReceipt({ kept: "saved", text: "My own shop", saidAt: "2026-10-12" })).toBe(
      "Kept word for word, dated 2026-10-12. It goes at the top of each future you open.",
    );
    expect(destinationReceipt({ kept: "tab-only", text: "My own shop", saidAt: "2026-10-12" })).toBe(
      "Not kept: no database reachable. It stays in this tab only.",
    );
    expect(destinationReceipt({ kept: "dont-know" })).toBe("Nothing kept. You can say it later; nothing here waits on it.");
  });

  it("business, career or both: a count of the written futures, by each road's kind", () => {
    const roads: Pick<Road, "kind">[] = [{ kind: "business" }, { kind: "both" }, { kind: "career" }];
    expect(lookingForReceipt("business", roads)).toBe("2 of the 3 written futures include a business of your own.");
    expect(lookingForReceipt("career", roads)).toBe("2 of the 3 written futures include a job or career.");
    expect(lookingForReceipt("both-or-not-sure", roads)).toBe("All 3 written futures are shown.");
    expect(lookingForReceipt("career", [{ kind: "business" }])).toBe("0 of the 1 written future include a job or career.");
    // The shipped catalog: road 0 is a business, the first written future both.
    expect(lookingForReceipt("business", roadsV2026)).toBe("2 of the 2 written futures include a business of your own.");
    expect(lookingForReceipt("career", roadsV2026)).toBe("1 of the 2 written futures include a job or career.");
  });

  it("a road's kind decides what it includes; nothing is filtered by it", () => {
    const fits = (kind: Road["kind"], choice: LookingFor) => roadIncludes(kind, choice);
    expect([fits("business", "business"), fits("both", "business"), fits("career", "business")]).toEqual([true, true, false]);
    expect([fits("business", "career"), fits("both", "career"), fits("career", "career")]).toEqual([false, true, true]);
    expect([fits("business", "both-or-not-sure"), fits("career", "both-or-not-sure")]).toEqual([true, true]);
  });

  it("the place: whose rules are written, and how many futures are written for it", () => {
    expect(placeReceipt("CA-AB", roadsV2026)).toBe("Alberta's rules and the federal rules apply. 2 futures are written for Alberta.");
    expect(placeReceipt("CA-BC", roadsV2026)).toBe(
      "British Columbia's rules and the federal rules apply. No future is written for British Columbia yet: the ones shown are written for other places, and each says which.",
    );
    expect(placeReceipt("CA-YT", roadsV2026)).toBe(
      "The federal rules apply; Yukon's own rules aren't written yet. No future is written for Yukon yet: the ones shown are written for other places, and each says which.",
    );
    // A road written for all of Canada counts for every place.
    expect(placeReceipt("CA-YT", [{ provinces: ["CA"] }])).toBe("The federal rules apply; Yukon's own rules aren't written yet. 1 future is written for Yukon.");
  });

  it("the income: agreed with its day, through the one money formatter; turned down; skipped", () => {
    expect(incomeReceipt({ kind: "agreed", amountCents: 7_000_000, agreedOn: "2026-10-12" })).toBe(
      `Your target: ${formatMoney(7_000_000)} a year, before tax, agreed 2026-10-12. Nothing compares it with anything.`,
    );
    expect(incomeReceipt({ kind: "agreed", amountCents: 7_000_000, agreedOn: "2026-10-12" })).toContain("$70,000 a year");
    expect(incomeReceipt({ kind: "turned-down" })).toBe("Not kept.");
    expect(incomeReceipt({ kind: "skipped" })).toBe("Not given. Nothing here waits on it.");
  });

  it("no sentence the new screens write, nor any question, carries a verdict word", () => {
    const sentences = [
      // Every words object of the new screens (a control on 2026-10-12 found only the first was read).
      ...sentencesOf({ frontDoorWords, destinationWords, pickWords, incomePromptWords }),
      ...sentencesOf(DESTINATION_QUESTIONS),
      ...roadsV2026.map((r) => placeReceipt("CA-AB", [r])),
      ...LOOKING_FOR.map((c) => lookingForReceipt(c, roadsV2026)),
    ];
    expect(sentences.length).toBeGreaterThan(80);
    expect(sentences.filter((s) => VERDICT.test(s))).toEqual([]);
  });

  it("the new screens hold no sentence of their own: words come from the words file and the questions", () => {
    for (const file of ["destination-page.tsx", "pick-future-page.tsx", "income-agree-prompt.tsx"]) {
      const source = readFileSync(path.join(process.cwd(), "components", "front-door", file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/className=(\{`[^`]*`\}|"[^"]*")/g, "");
      const jsxText = [...source.matchAll(/>\s*([A-Z][a-z]+(?: [a-z’'A-Z]+){3,}[.:]?)\s*</g)].map((m) => m[1]);
      expect(jsxText, file).toEqual([]);
    }
  });
});

describe("Pick a future: every written future, in the order added, as counts", () => {
  const cards = futureCards(roadsV2026, skillItemsV2026);

  it("one card per road, in the catalog's order, never re-sorted", () => {
    expect(cards.map((c) => c.roadId)).toEqual(roadsV2026.map((r) => r.id));
  });

  it("the counts are the catalog's own: steps, skills listed, official fees, lines to price", () => {
    for (const [i, road] of roadsV2026.entries()) {
      const costs = road.steps.flatMap((s) => s.costs);
      expect(cards[i]).toMatchObject({
        label: road.label,
        kind: road.kind,
        writtenFor: road.provinces,
        steps: road.steps.length,
        skillsListed: new Set(road.steps.flatMap((s) => s.needs)).size,
        officialFees: costs.filter((c) => c.kind === "official-fee").length,
        linesToPrice: costs.filter((c) => c.kind === "named").length,
      });
    }
  });

  it("how the sources were checked: every citation on the road and its skill items, counted by kind", () => {
    const apprentice = cards.find((c) => c.roadId === roadApprenticeToOwnShopAB.id)!;
    // Every source of the first written future is a tool check (docs/architecture/future-cockpit.md § 6).
    expect(apprentice.sources.tool).toBeGreaterThan(0);
    expect(apprentice.sources.person + apprentice.sources.unrecorded + apprentice.sources.model).toBe(0);

    // Counted independently here: the step's own sources, its done-when lines, its fee and name sources,
    // and the skill items it lists.
    const road = roadApprenticeToOwnShopAB;
    const listed = new Set(road.steps.flatMap((s) => s.needs));
    const all = [
      ...road.steps.flatMap((s) => [
        ...s.citations,
        ...s.doneWhen.map((d) => d.citation),
        ...s.costs.flatMap((c) => (c.kind === "official-fee" ? [c.citation] : c.nameSource ? [c.nameSource] : [])),
      ]),
      ...skillItemsV2026.filter((item) => listed.has(item.id)).flatMap((item) => [...item.citations, ...(item.howToGetIt ? [item.howToGetIt.citation] : [])]),
    ];
    expect(apprentice.sources.tool).toBe(all.filter((c) => howChecked(c).kind === "tool").length);
  });

  it("the sources line says each kind it has, and only those", () => {
    expect(sourcesLine({ person: 0, unrecorded: 12, model: 0, tool: 30 })).toEqual([
      { text: "12 read, who read them wasn't recorded", checkFirst: false },
      { text: "30 checked by a tool only, not read by a person yet", checkFirst: true },
    ]);
    expect(sourcesLine({ person: 1, unrecorded: 0, model: 1, tool: 0 })).toEqual([
      { text: "1 read by a person", checkFirst: false },
      { text: "1 read by an AI model only, not read by a person yet", checkFirst: true },
    ]);
  });
});

describe("a picked future becomes an idea on its road, with nothing made up", () => {
  const scenario = scenarioForPickedFuture({ road: roadApprenticeToOwnShopAB, place: "CA-AB", name: "" }, "scenario-1");

  it("the place answered, the road's name when none is typed, and the work situation kept as not said", () => {
    expect(scenario.id).toBe("scenario-1");
    expect(scenario.profile).toMatchObject({
      name: "From apprentice to your own shop (Alberta)",
      province: "AB",
      employmentStatus: "not-said",
      activityTags: [],
      targetRevenueY1: 0,
      targetRevenueY3: 0,
      hireFirst: false,
      structureSource: "assumed",
    });
    expect(scenarioForPickedFuture({ road: generalRoadV2026, place: "CA-YT", name: "  My shop  " }, "s2").profile).toMatchObject({
      name: "My shop",
      province: "YT",
    });
  });

  it("the first save carries the road and the business / career / both answer, and no goals", () => {
    expect(firstSaveForPickedFuture(roadApprenticeToOwnShopAB, "both-or-not-sure")).toEqual({
      roadId: "road-apprentice-to-own-shop-ab",
      lookingFor: "both-or-not-sure",
      goals: [],
    });
  });

  it("the save route keeps a road the catalog has and a known answer, and drops anything else", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    expect(parseFirstSave({ roadId: "road-apprentice-to-own-shop-ab", lookingFor: "career" }, now)).toEqual({
      roadId: "road-apprentice-to-own-shop-ab",
      lookingFor: "career",
    });
    expect(parseFirstSave({ roadId: "road-made-up", lookingFor: "astronaut" }, now)).toEqual({});
  });

  it("the rules read a work situation not said as unanswered, and road evaluation lists it as not told", () => {
    expect(buildEvaluationProfileFromScenario(scenario).employmentStatus).toBeNull();
    const result = evaluateRoad(
      cockpitInput({
        road: roadApprenticeToOwnShopAB,
        roadChosen: true,
        skillItems: skillItemsV2026,
        scenario,
        figures: [],
        personFigures: [],
        future: null,
        progress: [],
        skillMarks: [],
        today: "2026-10-12",
      }),
    );
    const work = result.answers.find((a) => a.id === "idea:work-situation");
    expect(work).toMatchObject({ given: false });
  });
});

describe("the goal bar: the destination when the idea has no first sentence", () => {
  const scenario = scenarioForPickedFuture({ road: roadApprenticeToOwnShopAB, place: "CA-AB", name: "" }, "s");
  const evaluation = evaluateRoad(
    cockpitInput({
      road: roadApprenticeToOwnShopAB,
      roadChosen: true,
      skillItems: skillItemsV2026,
      scenario,
      figures: [],
      personFigures: [],
      future: null,
      progress: [],
      skillMarks: [],
      today: "2026-10-12",
    }),
  );
  const draw = (firstWords: { text: string; saidAt: string } | null, destination: { text: string; saidAt: string } | null) =>
    renderToStaticMarkup(
      createElement(GoalBar, { road: roadApprenticeToOwnShopAB, evaluation, scenario, firstWords, destination, target: null, active: null, onGauge: () => {} }),
    );

  it("shows the destination, word for word with its day, labelled as where the person wants to be", () => {
    const html = draw(null, { text: "Four-day weeks, my own shop (invented)", saidAt: "2026-10-12" });
    expect(html).toContain("“Four-day weeks, my own shop (invented)”");
    expect(html).toContain(cockpitWords.goal.destination("2026-10-12"));
    expect(html).toContain("Future: From apprentice to your own shop (Alberta)");
  });

  it("the idea's own first sentence wins when it has one", () => {
    const html = draw({ text: "A sign shop (invented)", saidAt: "2026-10-10" }, { text: "Four-day weeks (invented)", saidAt: "2026-10-12" });
    expect(html).toContain("“A sign shop (invented)”");
    expect(html).not.toContain("Four-day weeks");
  });
});
