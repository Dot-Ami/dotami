/**
 * The cockpit screen, part 1 (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built"): the
 * goal bar and its four gauges, the overlays on the road, the step panel, the lists behind the gauges
 * and "Next on your road", all drawn from one run of road evaluation.
 *
 * Road 0 (today's general road) has no listed skills yet, and cost lines only on its three "before you
 * open" steps (2026-10-12), so most cases draw the invented trade road from tests/helpers/road-to-evaluate.ts. Components are drawn to HTML the
 * way tests/road-map.spec.ts draws the map.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GoalBar } from "@/components/cockpit/goal-bar";
import { NextOnYourRoad } from "@/components/cockpit/next-on-your-road";
import { OverlaySwitches } from "@/components/cockpit/overlay-switches";
import { DatePanel, MoneyListPanel, SkillsListPanel } from "@/components/cockpit/gauge-panels";
import { StepPanel } from "@/components/cockpit/step-panel";
import { StrategyMap } from "@/components/cockpit/strategy-map";
import { itemsForNode, itemsForStep, NODE_ENGINE_HINTS } from "@/lib/brain/node-items";
import { cockpitWords } from "@/lib/cockpit/words";
import {
  cockpitInput,
  costLineNote,
  gaugeView,
  nextOnYourRoad,
  overlayCounts,
  stepBadges,
  type Overlays,
} from "@/lib/cockpit/view";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { generalRoadV2026, type Road } from "@/lib/engines/roads/v2026";
import type { FigureView } from "@/lib/figures/types";
import type { PersonFigureView } from "@/lib/futures/person-figures";
import { evaluateRoad, NO_AGREED_PLANNING, type RoadEvaluation, type RoadEvaluationInput } from "@/lib/roads";
import { updateScenarioBranch } from "@/lib/scenarios/branches";
import { getScenarioNodeStatus } from "@/lib/scenarios/graph";
import type { Scenario } from "@/lib/scenarios/types";

import { inventedCitation } from "./helpers/invented-road";
import { input, inventedIdea, roadToEvaluate, skillItems, TODAY } from "./helpers/road-to-evaluate";
import { VERDICT_WORDS as VERDICT } from "./helpers/verdict-words";

const stepOf = (result: RoadEvaluation, id: string) => result.steps.find((s) => s.stepId === id)!;
const ALL_ON: Overlays = { skills: true, money: true, rules: true };

/** A figure as the figures list returns it; only what agreedPlanning and the rules read matters here. */
function figure(change: Partial<FigureView>): FigureView {
  return {
    id: `f-${Math.random().toString(36).slice(2)}`,
    ventureId: "v",
    kind: "gross-revenue",
    periodStart: TODAY,
    periodEnd: TODAY,
    amountCents: 0,
    currency: "CAD",
    sourceKind: "typed",
    sourceLabel: "typed by you",
    sourceRows: null,
    status: "confirmed",
    editedByPerson: false,
    proposedAt: `${TODAY}T12:00:00.000Z`,
    confirmedAt: `${TODAY}T12:00:00.000Z`,
    retractedAt: null,
    taxYear: null,
    formLine: null,
    costLine: null,
    ...change,
  } as FigureView;
}

/** A road 0 idea read back from the data file: the map's lists worked out from its toggles, as on every load. */
const road0Input = (change: Partial<RoadEvaluationInput> = {}): RoadEvaluationInput =>
  input({ road: generalRoadV2026, roadChosen: false, skillItems: [], ...change });

describe("the words: one file, counts and sums, never a verdict", () => {
  it("every sentence the cockpit writes is free of verdict words", () => {
    const sentences: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === "string") sentences.push(value);
      else if (typeof value === "function") {
        // Fill every function with plain values: counts, an amount, a label, a month.
        const fn = value as (...args: unknown[]) => unknown;
        for (const args of [[0, 0, 0, 0], [1, 1, 1, 1], [3, 2, 1, 9], ["“Label”", 150_000, "2029-05", 31]]) {
          let out: unknown;
          try {
            out = fn(...args);
          } catch {
            // A function that needs other kinds of values is filled by the next set.
          }
          if (typeof out === "string") sentences.push(out);
        }
      } else if (value && typeof value === "object") for (const v of Object.values(value)) walk(v);
    };
    walk(cockpitWords);
    expect(sentences.length).toBeGreaterThan(40);
    expect(sentences.filter((s) => VERDICT.test(s))).toEqual([]);
  });

  it("the new screens hold no sentence of their own: words come from lib/cockpit/words.ts", () => {
    // A long run of plain words in a JSX text node or a string literal would be a sentence outside the
    // words file. Class names, ids and import paths are not sentences, so only runs of 4+ words count.
    for (const file of ["goal-bar.tsx", "overlay-switches.tsx", "step-panel.tsx", "gauge-panels.tsx", "next-on-your-road.tsx", "folding.tsx"]) {
      const source = readFileSync(path.join(process.cwd(), "components", "cockpit", file), "utf8")
        // Comments are for programmers, not for the person.
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/className=(\{`[^`]*`\}|"[^"]*")/g, "");
      const jsxText = [...source.matchAll(/>\s*([A-Z][a-z]+(?: [a-z’'A-Z]+){3,}[.:]?)\s*</g)].map((m) => m[1]);
      expect(jsxText, file).toEqual([]);
    }
  });
});

describe("what the cockpit passes to road evaluation", () => {
  const road = roadToEvaluate();

  it("only agreed business totals reach the rules; planning numbers go to the sums, proposed ones nowhere", () => {
    const figures = [
      figure({ kind: "gross-revenue", amountCents: 1_000_000, periodStart: "2026-07-01", periodEnd: "2026-09-30" }),
      figure({ kind: "savings-for-start", amountCents: 500_000 }),
      figure({
        kind: "start-up-cost-line",
        amountCents: 340_000,
        costLine: { roadId: road.id, stepId: "step-eval-own", lineId: "cost-eval-saw", amountFrom: "quote" },
      }),
      figure({
        kind: "start-up-cost-line",
        status: "proposed",
        confirmedAt: null,
        amountCents: 99_900,
        costLine: { roadId: road.id, stepId: "step-eval-own", lineId: "cost-eval-deposit", amountFrom: "your-guess" },
      }),
    ];
    const built = cockpitInput({
      road,
      roadChosen: true,
      skillItems,
      scenario: inventedIdea(),
      figures,
      personFigures: [],
      future: null,
      progress: [],
      skillMarks: [],
      today: TODAY,
    });
    expect(built.confirmedFigures?.map((f) => f.kind)).toEqual(["gross-revenue"]);
    expect(built.agreed).toEqual({
      incomeWantedCents: null,
      savingsCents: 500_000,
      costLines: [{ stepId: "step-eval-own", lineId: "cost-eval-saw", amountCents: 340_000 }],
    });
  });

  it("on road 0 the picks are the map's toggles, as the map holds them, marked as the map's", () => {
    const scenario = inventedIdea();
    const built = cockpitInput({
      road: generalRoadV2026,
      roadChosen: false,
      skillItems: [],
      scenario,
      figures: [],
      personFigures: [],
      future: null,
      progress: [],
      skillMarks: [],
      today: TODAY,
    });
    expect(built.forkPicks).toEqual({
      gstTiming: { stepId: scenario.state.activeBranches.gstTiming, from: "map" },
      incorporationTiming: { stepId: scenario.state.activeBranches.incorporationTiming, from: "map" },
    });
  });

  it("on another road the picks are the ones kept on the future, the person's", () => {
    const built = cockpitInput({
      road,
      roadChosen: true,
      skillItems,
      scenario: inventedIdea(),
      figures: [],
      personFigures: [],
      future: { forkPicks: { "fork-eval-ending": { stepId: "step-eval-own", pickedOn: TODAY, from: "you" } }, targetMonth: "2029-05" },
      progress: [],
      skillMarks: [],
      today: TODAY,
    });
    expect(built.forkPicks).toEqual({ "fork-eval-ending": { stepId: "step-eval-own", from: "you" } });
    expect(built.targetMonth).toBe("2029-05");
  });

  it("the map's worked-out active, done and set-aside lists never become the person's statuses", () => {
    // Stage 0 is always "done" and stage 1 always "active" on the map, from its toggles alone.
    const scenario = inventedIdea();
    expect(scenario.state.completedNodeIds.length + scenario.state.activeNodeIds.length).toBeGreaterThan(0);
    const result = evaluateRoad(
      cockpitInput({
        road: generalRoadV2026,
        roadChosen: false,
        skillItems: [],
        scenario,
        figures: [],
        personFigures: [],
        future: null,
        progress: [],
        skillMarks: [],
        today: TODAY,
      }),
    );
    expect(result.steps.every((s) => s.status === null)).toBe(true);
    expect(result.gauges.steps).toMatchObject({ done: 0, doing: 0 });
  });

  it("the yearly income target is the agreed one only", () => {
    const personFigures = [
      { id: "p1", kind: "income-wanted", amountCents: 7_000_000, status: "confirmed", confirmedAt: `${TODAY}T10:00:00.000Z` },
      { id: "p2", kind: "income-wanted", amountCents: 9_000_000, status: "proposed", confirmedAt: null },
    ] as PersonFigureView[];
    const built = cockpitInput({
      road,
      roadChosen: true,
      skillItems,
      scenario: inventedIdea(),
      figures: [],
      personFigures,
      future: null,
      progress: [],
      skillMarks: [],
      today: TODAY,
    });
    expect(built.agreed.incomeWantedCents).toBe(7_000_000);
  });
});

describe("road 0's statuses are the person's, kept in step progress", () => {
  it("a status the person set on a road 0 step counts: done, doing and not for me", () => {
    const result = evaluateRoad(
      road0Input({
        progress: [
          { stepId: "stage-1-sole-prop-activation", status: "done", doneWhenIds: [] },
          { stepId: "stage-2a-voluntary-gst-registration", status: "doing", doneWhenIds: [] },
          { stepId: "stage-4-sred-deepening", status: "not-for-me", doneWhenIds: [] },
        ],
      }),
    );
    expect(result.gauges.steps).toMatchObject({ done: 1, doing: 1, total: generalRoadV2026.steps.length });
    expect(stepOf(result, "stage-1-sole-prop-activation").status).toBe("done");
    expect(stepOf(result, "stage-4-sred-deepening")).toMatchObject({
      state: "not-on-your-path",
      reason: { kind: "not-for-me" },
      because: "You marked this step not for me.",
    });
    expect(result.answers.find((a) => a.id === "step:stage-1-sole-prop-activation")?.said).toBe(
      "you told us “Sole Prop activation” is done",
    );
  });
});

describe("Next on your road", () => {
  it("the first three steps in road order on the person's path and not marked done or not for me", () => {
    const result = evaluateRoad(
      input({
        forkPicks: { "fork-eval-ending": { stepId: "step-eval-own", from: "you" } },
        progress: [{ stepId: "step-eval-train", status: "done", doneWhenIds: [] }],
      }),
    );
    // Train is done; Stay employed and Keep working are not on the path (the other ending).
    expect(nextOnYourRoad(result, inventedIdea()).map((s) => s.stepId)).toEqual(["step-eval-ticket", "step-eval-own", "step-eval-open"]);
  });

  it("a step the person marked not for me is skipped; doing stays on the list", () => {
    const result = evaluateRoad(
      input({
        progress: [
          { stepId: "step-eval-train", status: "not-for-me", doneWhenIds: [] },
          { stepId: "step-eval-ticket", status: "doing", doneWhenIds: [] },
        ],
      }),
    );
    expect(nextOnYourRoad(result, inventedIdea()).map((s) => s.stepId)[0]).toBe("step-eval-ticket");
  });

  it("on road 0 it agrees with the map's chips: never the side of a fork not picked, never a step the map shows done", () => {
    const voluntary = "stage-2a-voluntary-gst-registration";
    const mandatory = "stage-2b-mandatory-gst-registration";
    for (const [picked, other] of [
      [voluntary, mandatory],
      [mandatory, voluntary],
    ] as const) {
      const scenario = updateScenarioBranch(inventedIdea(), "gstTiming", picked);
      const next = nextOnYourRoad(evaluateRoad(road0Input({ scenario })), scenario, generalRoadV2026.steps.length).map((s) => s.stepId);
      expect(next).toContain(picked);
      expect(next).not.toContain(other);
      // Nothing the map's own chip calls "not on your path" or "done".
      for (const id of next) expect(["ghost", "complete"]).not.toContain(getScenarioNodeStatus(id, scenario));
    }
    // A first visit on the default picks: stage 0 is drawn done, so the list starts at the
    // before-you-open steps that follow it in the first column (three on 2026-10-12, and Keep your
    // records from day one since 2026-10-14), then stage 1.
    expect(nextOnYourRoad(evaluateRoad(road0Input()), inventedIdea(), 5).map((s) => s.stepId)).toEqual([
      "step-start-register-name",
      "step-start-permits-bizpal",
      "step-start-business-account",
      "step-start-keep-records",
      "stage-1-sole-prop-activation",
    ]);
  });

  it("on road 0 the person's own status wins over the map's worked-out chip, as on the card", () => {
    const result = evaluateRoad(road0Input({ progress: [{ stepId: "stage-0-employee-apprentice-baseline", status: "doing", doneWhenIds: [] }] }));
    expect(nextOnYourRoad(result, inventedIdea())[0]?.stepId).toBe("stage-0-employee-apprentice-baseline");
  });

  it("draws its label, says it is the order steps happen, and offers each step to open", () => {
    const result = evaluateRoad(input());
    const html = renderToStaticMarkup(
      createElement(NextOnYourRoad, { road: roadToEvaluate(), evaluation: result, scenario: inventedIdea(), onSelectStep: () => {} }),
    );
    expect(html).toContain("Next on your road");
    expect(html).toContain("the order steps happen, not importance");
    expect(html).toContain("Train (test only)");
    expect(html).toContain("Get your ticket (test only)");
  });
});

describe("the gauges", () => {
  it("counts and sums from road evaluation, with no difference until there are savings", () => {
    const result = evaluateRoad(
      input({
        forkPicks: { "fork-eval-ending": { stepId: "step-eval-own", from: "you" } },
        skillMarks: [
          { skillItemId: "skill-eval-math", ownLabel: null, mark: "have" },
          { skillItemId: "skill-eval-drawings", ownLabel: null, mark: "learning" },
          { skillItemId: "skill-eval-ticket", ownLabel: null, mark: "not-yet" },
        ],
        progress: [{ stepId: "step-eval-train", status: "done", doneWhenIds: [] }],
        agreed: { ...NO_AGREED_PLANNING, costLines: [{ stepId: "step-eval-own", lineId: "cost-eval-saw", amountCents: 340_000 }] },
      }),
    );
    const view = gaugeView(result, roadToEvaluate(), inventedIdea());
    expect(view.steps.value).toBe("1 of 7 marked done");
    expect(view.steps.lines).toContain("next on your road: “Get your ticket (test only)”");
    expect(view.skills.value).toBe("1 have · 1 learning · 1 not yet");
    expect(view.skills.lines).toContain("2 not marked, out of 5 listed");
    // Each part with its lines: Tuition, the exam and the name registration; the table saw quote.
    expect(view.money.value).toBe("$1,860 official fees (3 lines) · $3,400 your numbers (1 line)");
    expect(view.money.lines).toContain("4 not priced yet");
    expect(view.money.lines).toContain("savings: not given yet");
    expect(view.money.lines.join(" ")).not.toMatch(/minus/);
    expect(view.date.value).toBe("not set");
    expect(view.date.invite).toBe("Add your month and year to count the months to it");
  });

  it("the plain difference appears once savings and a priced line both exist; the date as a month and a count", () => {
    const result = evaluateRoad(
      input({
        agreed: { incomeWantedCents: null, savingsCents: 1_200_000, costLines: [] },
        targetMonth: "2029-05",
      }),
    );
    const view = gaugeView(result, roadToEvaluate(), inventedIdea());
    expect(view.money.lines).toContain("savings $12,000");
    // Official fees on the path with nothing picked: Tuition $1,500 and the exam $300 (Own shop waits on the pick).
    expect(view.money.lines).toContain("savings minus both: $10,200");
    expect(view.money.lines).toContain("5 wait on a pick at “Ending (test only)”");
    expect(view.date.value).toBe("May 2029");
    expect(view.date.lines).toContain("31 months from today");
  });

  it("start-up money never shows $0 for a part the person gave nothing for, or a part with no lines", () => {
    const own = { "fork-eval-ending": { stepId: "step-eval-own", from: "you" as const } };
    // Official fees, and no number of the person's: their part is not given yet, never "$0 your numbers".
    const fees = gaugeView(evaluateRoad(input({ forkPicks: own })), roadToEvaluate(), inventedIdea());
    expect(fees.money.value).toBe("$1,860 official fees (3 lines) · your numbers: not given yet");
    // Only named lines: no official fee part at all, and still no $0.
    const base = roadToEvaluate();
    const namedOnly: Road = { ...base, steps: base.steps.map((s) => ({ ...s, costs: s.costs.filter((c) => c.kind === "named") })) };
    const named = gaugeView(evaluateRoad(input({ road: namedOnly, forkPicks: own })), namedOnly, inventedIdea());
    expect(named.money.value).toBe("your numbers: not given yet");
    expect(named.money.lines).toContain("5 not priced yet");
    for (const view of [fees, named]) expect([view.money.value, ...view.money.lines].join(" ")).not.toContain("$0");
  });

  it("on road 0 the Steps gauge names the first step the map shows on the path, not one it shows done", () => {
    const view = gaugeView(evaluateRoad(road0Input()), generalRoadV2026, inventedIdea());
    // Stage 0 is drawn done; the first step after it is the first before-you-open step (2026-10-12).
    expect(view.steps.lines).toContain("next on your road: “Register your business name, if you use one”");
    const stage0 = generalRoadV2026.steps.find((s) => s.id === "stage-0-employee-apprentice-baseline")!;
    expect(view.steps.lines.join(" ")).not.toContain(stage0.label);
  });

  it("a goal bar on a road written for another province says which map is drawn, not that it is their future", () => {
    const result = evaluateRoad(input());
    const draw = (province: "AB" | "BC") =>
      renderToStaticMarkup(
        createElement(GoalBar, {
          road: roadToEvaluate(),
          evaluation: result,
          scenario: inventedIdea({ province }),
          firstWords: null,
          target: null,
          active: null,
          onGauge: () => {},
        }),
      );
    expect(draw("AB")).toContain("Future: Invented trade road (test only)");
    const bc = draw("BC");
    expect(bc).not.toContain("Future:");
    expect(bc).toContain("Map drawn: Invented trade road (test only) · written for AB; this idea is in BC");
  });

  it("on road 0: its one legal requirement, not marked yet; its cost lines are named lines, never $0", () => {
    const view = gaugeView(evaluateRoad(road0Input()), generalRoadV2026, inventedIdea());
    expect(view.steps.value).toBe(`0 of ${generalRoadV2026.steps.length} marked done`);
    // The GST/HST registration, from the compliance catalog (2026-10-12).
    expect(view.skills.value).toBe("0 have · 0 learning · 0 not yet");
    expect(view.skills.lines).toContain("1 not marked, out of 1 listed");
    // The before-you-open steps (2026-10-12) name four lines the person prices, and Sole Prop activation
    // seven start-up lines (later the same day), all with no amount: eleven on the path, none priced.
    expect(view.money.value).toBe("your numbers: not given yet");
    expect(view.money.lines).toContain("11 not priced yet");
    expect([view.money.value, ...view.money.lines].join(" ")).not.toContain("$0");
  });

  it("the goal bar: the person's words with their day, the target only when agreed, the future by name, four gauge buttons", () => {
    const result = evaluateRoad(input());
    const draw = (target: { amountCents: number; agreedOn: string } | null, firstWords: { text: string; saidAt: string } | null) =>
      renderToStaticMarkup(
        createElement(GoalBar, {
          road: roadToEvaluate(),
          evaluation: result,
          scenario: inventedIdea(),
          firstWords,
          target,
          active: "skills",
          onGauge: () => {},
        }),
      );
    const html = draw(null, { text: "My own small shop (invented)", saidAt: "2026-10-10" });
    expect(html).toContain("“My own small shop (invented)”");
    expect(html).toContain("your words · 2026-10-10");
    expect(html).toContain("Future: Invented trade road (test only)");
    expect(html).not.toContain("Your target");
    for (const label of ["Steps", "Skills", "Start-up money", "Your date"]) expect(html).toContain(label);
    // The pressed gauge is the one whose overlay is open.
    expect(html.match(/aria-pressed="true"/g)?.length).toBe(1);
    const withTarget = draw({ amountCents: 7_000_000, agreedOn: "2026-10-11" }, null);
    expect(withTarget).toContain("Your target: $70,000 a year, before tax (yours, agreed 2026-10-11)");
    expect(withTarget).not.toContain("your words ·");
  });
});

describe("the overlays on the road", () => {
  const road = roadToEvaluate();
  const result = evaluateRoad(
    input({
      skillMarks: [{ skillItemId: "skill-eval-math", ownLabel: null, mark: "have" }],
      agreed: { ...NO_AGREED_PLANNING, costLines: [] },
    }),
  );

  it("badges: needs and has on Skills; priced sum and lines not priced on Money", () => {
    const train = stepOf(result, "step-eval-train");
    expect(stepBadges(train, { skills: true, money: false, rules: true })).toEqual(["needs 2 · you have 1"]);
    expect(stepBadges(train, { skills: false, money: true, rules: true })).toEqual(["$1,500 · 1 not priced"]);
    expect(stepBadges(train, { skills: false, money: false, rules: true })).toEqual([]);
    // A step waiting on a pick says so instead of a sum.
    expect(stepBadges(stepOf(result, "step-eval-own"), { skills: false, money: true, rules: true })).toEqual([
      "$60 · 2 not priced · waits on a pick",
    ]);
    // A step whose lines are all blank shows no amount at all: a blank is never $0.
    expect(stepBadges(stepOf(result, "step-eval-open"), { skills: false, money: true, rules: true })).toEqual([
      "1 not priced · waits on a pick",
    ]);
  });

  it("the switches carry the road's own counts", () => {
    const counts = overlayCounts(road, result, inventedIdea());
    expect(counts).toEqual({ skillsListed: 5, costLines: 8, rulesCards: 0 });
    const html = renderToStaticMarkup(
      createElement(OverlaySwitches, { overlays: { skills: true, money: false, rules: true }, counts, onToggle: () => {} }),
    );
    expect(html).toContain("Road");
    expect(html).toContain("always on");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Skills/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Money/);
    expect(html).toContain("5 listed");
    expect(html).toContain("8 cost lines");
  });

  it("on the map: badges in the card and its name, the person's status as the chip, the fork's line, colours from the states", () => {
    const withDone = evaluateRoad(input({ progress: [{ stepId: "step-eval-train", status: "done", doneWhenIds: [] }] }));
    const html = renderToStaticMarkup(
      createElement(StrategyMap, {
        road,
        scenario: inventedIdea(),
        evaluation: withDone.rules,
        selectedStepId: null,
        onSelectStep: () => {},
        onBranchChange: () => {},
        overlays: ALL_ON,
        stepEvaluations: new Map(withDone.steps.map((s) => [s.stepId, s])),
        linkedSkillId: null,
      }),
    );
    expect(html).toContain("Train (test only), done, applies as answered, needs 2 · you have 0, $1,500 · 1 not priced, opens detail");
    expect(html).toContain("needs 2 · you have 0");
    expect(html).toContain(cockpitWords.road.forkSplits);
    // Before road evaluation drew it, a step the rules don't know was grey; now it is its own state.
    expect(html).toMatch(/aria-label="Get your ticket \(test only\), ahead, applies as answered/);
    expect(html).toMatch(/aria-label="Own shop \(test only\), ahead, check first/);
  });

  it("selecting a skill dims every step that doesn't list it", () => {
    const html = renderToStaticMarkup(
      createElement(StrategyMap, {
        road,
        scenario: inventedIdea(),
        evaluation: result.rules,
        selectedStepId: null,
        onSelectStep: () => {},
        onBranchChange: () => {},
        overlays: ALL_ON,
        stepEvaluations: new Map(result.steps.map((s) => [s.stepId, s])),
        linkedSkillId: "skill-eval-drawings",
      }),
    );
    // Train and Own shop list "Read drawings"; the other five steps dim.
    expect(html.match(/opacity-35/g)?.length).toBe(5);
  });

  it("Rules & tax off hides the lever cards; on, they are drawn as today", () => {
    const scenario = inventedIdea({ type: "service", activityTags: ["Software / SaaS"] });
    const r0 = evaluateRoad(road0Input({ scenario }));
    const draw = (rules: boolean) =>
      renderToStaticMarkup(
        createElement(StrategyMap, {
          road: generalRoadV2026,
          scenario,
          evaluation: r0.rules,
          selectedStepId: null,
          onSelectStep: () => {},
          onBranchChange: () => {},
          overlays: { skills: false, money: false, rules },
          stepEvaluations: new Map(r0.steps.map((s) => [s.stepId, s])),
          linkedSkillId: null,
        }),
      );
    const leverCount = (html: string) => (html.match(/, opens detail"/g) ?? []).length;
    expect(leverCount(draw(true))).toBeGreaterThan(generalRoadV2026.steps.length);
    expect(leverCount(draw(false))).toBe(generalRoadV2026.steps.length);
  });

  /** Road 0 as the cockpit draws it, with every overlay on. */
  const drawRoad0 = (scenario: Scenario, result: RoadEvaluation) =>
    renderToStaticMarkup(
      createElement(StrategyMap, {
        road: generalRoadV2026,
        scenario,
        evaluation: result.rules,
        selectedStepId: null,
        onSelectStep: () => {},
        onBranchChange: () => {},
        overlays: ALL_ON,
        stepEvaluations: new Map(result.steps.map((s) => [s.stepId, s])),
        linkedSkillId: null,
      }),
    );
  const notForMe = (stepId: string) => ({ stepId, status: "not-for-me" as const, doneWhenIds: [] });

  it("a step the person set aside says so in its own words, never as a reading of their answers", () => {
    const scenario = inventedIdea({ activityTags: ["Software / SaaS"] });
    const before = drawRoad0(scenario, evaluateRoad(road0Input({ scenario })));
    // With Money on, the card names its seven start-up lines as not priced (2026-10-12).
    expect(before).toMatch(/aria-label="Sole Prop activation, now, applies as answered, 7 not priced, opens detail"/);
    // No one set anything aside: the legend has no line for it.
    expect(before).not.toContain(cockpitWords.road.setAsideLegend);
    const after = drawRoad0(scenario, evaluateRoad(road0Input({ scenario, progress: [notForMe("stage-1-sole-prop-activation")] })));
    // Set aside, its start-up lines stay named and drop out of the sums.
    expect(after).toMatch(
      /aria-label="Sole Prop activation, not for me, set aside by you, 7 not priced · not counted: not on your path, opens detail"/,
    );
    expect(after).not.toMatch(/aria-label="Sole Prop activation, [^"]*doesn&#x27;t apply as answered/);
    expect(after).toContain(cockpitWords.road.setAsideLegend);
  });

  it("the Rules & tax count is the cards the map draws: none from a step set aside or a fork side not picked", () => {
    const scenario = inventedIdea({ type: "service", activityTags: ["Software / SaaS"] });
    for (const progress of [[], [notForMe("stage-1-sole-prop-activation")]]) {
      const result = evaluateRoad(road0Input({ scenario, progress }));
      const setAside = new Set(progress.map((p) => p.stepId));
      // Worked out here from the map's own lists, apart from the code under test.
      const drawnSteps = generalRoadV2026.steps.filter((s) => !setAside.has(s.id) && !scenario.state.ghostedNodeIds.includes(s.id as never));
      const drawn = new Set(drawnSteps.flatMap((s) => itemsForStep(result.rules.unlocks, s).forThisStage.map((i) => i.id)));
      const onRoad = new Set(generalRoadV2026.steps.flatMap((s) => itemsForStep(result.rules.unlocks, s).forThisStage.map((i) => i.id)));
      // The case is only worth testing if hiding steps hides cards.
      expect(onRoad.size).toBeGreaterThan(drawn.size);
      expect(overlayCounts(generalRoadV2026, result, scenario).rulesCards).toBe(drawn.size);
      // And the map draws exactly those cards (one lever button per card per step it is on).
      const instances = drawnSteps.reduce((n, s) => n + itemsForStep(result.rules.unlocks, s).forThisStage.length, 0);
      expect((drawRoad0(scenario, result).match(/, opens detail"/g) ?? []).length).toBe(generalRoadV2026.steps.length + instances);
    }
  });
});

describe("the lever cards belong to the road step (engineHints)", () => {
  it("road 0's steps name exactly the cards the old hint list gave each node", () => {
    // The list as it was in lib/brain/node-items.ts before it moved onto the road (2026-10-12), with
    // the two ride-share and taxi cards that list had gained (#147, 2026-10-11).
    const before: Record<string, string[]> = {
      "stage-1-sole-prop-activation": [
        "writeoff-home-office",
        "writeoff-saas-tools",
        "compliance-hobby-vs-business",
        "compliance-platform-reporting-rideshare",
      ],
      "stage-2a-voluntary-gst-registration": ["grant-sred", "writeoff-cca-class-50", "compliance-gst-small-supplier"],
      "stage-2b-mandatory-gst-registration": ["grant-cajg", "compliance-gst-small-supplier", "compliance-gst-taxi-ride-sharing"],
      "stage-3a-incorporation-80k-net": ["grant-on-innovation"],
      "stage-3b-incorporation-liability-sred": ["grant-sred", "grant-irap", "writeoff-rd", "writeoff-cca-class-50"],
      "stage-4-sred-deepening": ["grant-sred", "grant-irap"],
      "stage-4-retained-earnings-planning": ["grant-on-innovation"],
      "branch-hire-first-employee": ["writeoff-vehicle"],
    };
    const fromRoad = Object.fromEntries(
      generalRoadV2026.steps.flatMap((s) => ((s.engineHints ?? []).length > 0 ? [[s.id, s.engineHints]] : [])),
    );
    expect(fromRoad).toEqual(before);
    expect(NODE_ENGINE_HINTS).toEqual(before);
  });

  it("a step from another road names its own cards; one with none gets none", () => {
    const r0 = evaluateRoad(road0Input({ scenario: inventedIdea({ activityTags: ["Software / SaaS"] }) }));
    const step: Road["steps"][number] = { ...roadToEvaluate().steps[0]!, engineHints: ["writeoff-home-office"] };
    expect(itemsForStep(r0.rules.unlocks, step).forThisStage.map((i) => i.id)).toEqual(
      itemsForNode(r0.rules.unlocks, "stage-1-sole-prop-activation").forThisStage.filter((i) => i.id === "writeoff-home-office").map((i) => i.id),
    );
    expect(itemsForStep(r0.rules.unlocks, roadToEvaluate().steps[0]!).forThisStage).toEqual([]);
  });
});

describe("the step panel", () => {
  const road = roadToEvaluate();
  const marks = new Map([["skill-eval-ticket", "have" as const]]);
  const draw = (stepId: string, change: Partial<RoadEvaluationInput> = {}, canSave = true) => {
    const result = evaluateRoad(input({ skillMarks: [{ skillItemId: "skill-eval-ticket", ownLabel: null, mark: "have" }], ...change }));
    return renderToStaticMarkup(
      createElement(StepPanel, {
        road,
        step: road.steps.find((s) => s.id === stepId)!,
        evaluation: stepOf(result, stepId),
        rules: result.rules,
        skillItems,
        marks,
        selectedSkillId: null,
        branch: null,
        canSave,
        error: null,
        job: null,
        onStatus: () => {},
        onTicks: () => {},
        onMark: () => {},
        onSelectSkill: () => {},
        onOpenJobList: () => {},
        onProposeQuote: async () => null,
        province: "AB",
        ownNumber: null,
        onOwnNumberChange: () => {},
        onClose: () => {},
      }),
    );
  };

  it("status, done-when lines with boxes and sources, skills with marks, costs in their three kinds", () => {
    const html = draw("step-eval-train", {
      progress: [{ stepId: "step-eval-train", status: "doing", doneWhenIds: ["dw-eval-train-1"] }],
    });
    expect(html).toContain("Your status");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Doing</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Done</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Not for me</);
    expect(html).toContain("Done when");
    expect(html).toContain("Invented line one.");
    expect(html).toMatch(/type="checkbox"[^>]*checked=""/);
    expect(html).toContain("1 of 2 ticked");
    expect(html).toContain("Skills it needs");
    expect(html).toContain("Trade math (test only)");
    for (const button of ["Have", "Learning", "Not yet", "I don&#x27;t know"]) expect(html).toContain(button);
    expect(html).toContain("Costs");
    expect(html).toContain("Tuition (test only)");
    expect(html).toContain("$1,500");
    expect(html).toContain("official fee · source and day read");
    expect(html).toContain("Textbooks (test only)");
    expect(html).toContain("not priced yet");
    expect(html).toContain("Add your quote");
    // Why it has its colour, from road evaluation.
    expect(html).toContain("It&#x27;s on “Invented trade road (test only)”, the road you chose.");
  });

  it("a legal requirement marked have reads 'you said you hold this'; an agreed quote reads as yours", () => {
    const html = draw("step-eval-ticket");
    expect(html).toContain("you said you hold this");
    const own = draw("step-eval-own", {
      forkPicks: { "fork-eval-ending": { stepId: "step-eval-own", from: "you" } },
      agreed: { ...NO_AGREED_PLANNING, costLines: [{ stepId: "step-eval-own", lineId: "cost-eval-saw", amountCents: 340_000 }] },
    });
    expect(own).toContain("your quote · agreed");
    expect(own).toContain("$3,400");
    expect(own).toContain("Change your number");
  });

  it("every skill item and named cost line carries its own source; official pages are links the person opens", () => {
    // The ticket step: its one skill item's citation is drawn with it, mark or no mark.
    const ticket = draw("step-eval-ticket");
    const skillsPart = ticket.slice(ticket.indexOf(">Skills it needs<"), ticket.indexOf(">Costs<"));
    expect((skillsPart.match(/<a /g) ?? []).length).toBe(1);
    // A named line with a source for its name, and a step with an official page.
    const withSources: Road = {
      ...road,
      steps: road.steps.map((s) =>
        s.id === "step-eval-train"
          ? {
              ...s,
              costs: s.costs.map((c) => (c.kind === "named" ? { ...c, nameSource: { ...inventedCitation(), title: "Where the name comes from (test only)" } } : c)),
              officialLinks: [{ label: "The registry (test only)", url: "https://example.org/registry" }],
            }
          : s,
      ),
    };
    const result = evaluateRoad(input({ road: withSources }));
    const html = renderToStaticMarkup(
      createElement(StepPanel, {
        road: withSources,
        step: withSources.steps.find((s) => s.id === "step-eval-train")!,
        evaluation: stepOf(result, "step-eval-train"),
        rules: result.rules,
        skillItems,
        marks: new Map(),
        selectedSkillId: null,
        branch: null,
        canSave: true,
        error: null,
        onStatus: () => {},
        onTicks: () => {},
        onMark: () => {},
        onSelectSkill: () => {},
        onProposeQuote: async () => null,
        province: "AB",
        ownNumber: null,
        onOwnNumberChange: () => {},
        onClose: () => {},
      }),
    );
    expect(html).toContain("Where the name comes from (test only)");
    expect(html).toMatch(/<a href="https:\/\/example\.org\/registry"[^>]*>The registry \(test only\)/);
    expect(html).toContain(cockpitWords.panel.officialLinks);
  });

  it("empty lists say so in one line; an idea not saved yet can't keep anything", () => {
    const html = draw("step-eval-employed", {}, false);
    expect(html).toContain(cockpitWords.panel.doneWhenNone);
    expect(html).toContain(cockpitWords.panel.skillsNone);
    expect(html).toContain(cockpitWords.panel.costsNone);
    expect(html).toContain(cockpitWords.panel.notSaved);
    expect(html).toMatch(/disabled=""[^>]*>Done</);
  });

  it("on a road 0 step it keeps everything node detail showed: the two lines, the cards and the sources", () => {
    const r0 = evaluateRoad(road0Input({ scenario: inventedIdea({ activityTags: ["Software / SaaS"] }) }));
    const step = generalRoadV2026.steps.find((s) => s.id === "stage-1-sole-prop-activation")!;
    const html = renderToStaticMarkup(
      createElement(StepPanel, {
        road: generalRoadV2026,
        step,
        evaluation: stepOf(r0, step.id),
        rules: r0.rules,
        skillItems: [],
        marks: new Map(),
        selectedSkillId: null,
        branch: null,
        canSave: true,
        error: null,
        onStatus: () => {},
        onTicks: () => {},
        onMark: () => {},
        onSelectSkill: () => {},
        onProposeQuote: async () => null,
        province: "AB",
        ownNumber: null,
        onOwnNumberChange: () => {},
        onClose: () => {},
      }),
    );
    const node = cfeCatalogV2026.nodes.find((n) => n.id === step.id)!;
    expect(html).toContain("Trigger");
    expect(html).toContain("If it applies");
    expect(html).toContain("For you on this stage");
    expect(html).toContain("Elsewhere on your map");
    expect(html).toContain("More about this stage");
    expect(html).toContain(`Sources for this stage · ${node.citations.length}`);
    expect(html).toContain("Close node detail panel");
    expect(html).toContain("Your status");
  });
});

describe("the lists behind the gauges", () => {
  it("skills: every skill the road lists with its marks, and your own skills with a box to add one", () => {
    const html = renderToStaticMarkup(
      createElement(SkillsListPanel, {
        road: roadToEvaluate(),
        skillItems,
        marks: [
          { id: "m1", skillItemId: "skill-eval-math", ownLabel: null, mark: "have", markedOn: TODAY },
          { id: "m2", skillItemId: null, ownLabel: "Welding (invented)", mark: "learning", markedOn: TODAY },
        ],
        selectedSkillId: null,
        canSave: true,
        error: null,
        job: null,
        jobPickedOn: null,
        onMark: () => {},
        onSelectSkill: () => {},
        onPickJob: () => {},
        onClose: () => {},
      }),
    );
    for (const item of skillItems) expect(html).toContain(item.label);
    expect(html).toContain("Your own skills");
    expect(html).toContain("Welding (invented)");
    expect(html).toContain("added by you");
    expect(html).toContain("Add a skill");
    // Every listed skill shows its own source: five items, one citation each (and, apart, the job
    // search's licence link, there before any pick because the job names are the government's).
    const links = [...html.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
    expect(links.filter((href) => href !== "https://open.canada.ca/en/open-government-licence-canada")).toHaveLength(skillItems.length);
    expect(links).toContain("https://open.canada.ca/en/open-government-licence-canada");
    // On a skill the person typed, the button that takes it away says so; "I don't know" stays on the road's.
    const welding = html.slice(html.indexOf("Welding (invented)"));
    expect(welding).toContain(`>${cockpitWords.lists.removeOwn}<`);
    expect(welding).not.toContain("I don&#x27;t know");
    expect((html.match(/I don&#x27;t know/g) ?? []).length).toBe(skillItems.length);
  });

  it("money: each cost line by step in road order, and savings through the agree prompt", () => {
    const result = evaluateRoad(input());
    const html = renderToStaticMarkup(
      createElement(MoneyListPanel, {
        road: roadToEvaluate(),
        evaluation: result,
        canSave: true,
        error: null,
        onProposeSavings: async () => null,
        onSelectStep: () => {},
        onClose: () => {},
      }),
    );
    expect(html.indexOf("Tuition (test only)")).toBeLessThan(html.indexOf("Table saw (test only)"));
    // Each official fee carries its source one click away, as in the step panel: tuition, exam, name.
    const fees = roadToEvaluate().steps.flatMap((s) => s.costs).filter((c) => c.kind === "official-fee");
    expect(fees.length).toBe(3);
    expect((html.match(/<a /g) ?? []).length).toBe(fees.length);
    expect(html).toContain("Add your savings");
    expect(html).toContain(cockpitWords.amounts.agreeFirst);
  });

  it("your date: a month box with Save and Clear", () => {
    const html = renderToStaticMarkup(
      createElement(DatePanel, { targetMonth: "2029-05", monthsFromToday: 31, today: TODAY, canSave: true, error: null, onSave: async () => null, onClose: () => {} }),
    );
    expect(html).toContain('type="month"');
    expect(html).toContain('value="2029-05"');
    expect(html).toContain("May 2029");
    expect(html).toContain("31 months from today");
    expect(html).toContain(">Save<");
    expect(html).toContain(">Clear<");
  });
});

describe("the agree prompt names the cost line a quote is for", () => {
  it("“Table saw” on “Own shop”, from a quote", () => {
    const road = roadToEvaluate();
    const note = costLineNote(
      [road],
      figure({
        kind: "start-up-cost-line",
        costLine: { roadId: road.id, stepId: "step-eval-own", lineId: "cost-eval-saw", amountFrom: "quote" },
      }),
    );
    expect(note).toBe("“Table saw (test only)” on “Own shop (test only)”, from a quote");
    expect(costLineNote([road], figure({ kind: "savings-for-start" }))).toBeNull();
  });
});

describe("an official fee that applies only sometimes (onlyIf) is shown, never summed or dropped", () => {
  // The invented road with Tuition made a fee that applies only sometimes, as the first written future's
  // exam rewrite is (tests/road-apprentice-to-own-shop.spec.ts).
  const CONDITION = "You fail the invented exam and choose to rewrite it (test only)";
  const base = roadToEvaluate();
  const road: Road = {
    ...base,
    steps: base.steps.map((s) => ({
      ...s,
      costs: s.costs.map((c) => (c.id === "cost-eval-tuition" && c.kind === "official-fee" ? { ...c, onlyIf: CONDITION } : c)),
    })),
  };
  const result = evaluateRoad(input({ road, agreed: { ...NO_AGREED_PLANNING, savingsCents: 1_200_000 } }));

  it("the Money gauge leaves it out of the official fees and the difference, and counts it on a line of its own", () => {
    expect(result.gauges.money.onlyIfFeeLines).toBe(1);
    const view = gaugeView(result, road, inventedIdea());
    // Only the $300 exam is added; Tuition's $1,500 is neither in the sum nor lost.
    expect(view.money.value).toBe("$300 official fees (1 line) · your numbers: not given yet");
    expect(view.money.lines).toContain("1 official fee applies only sometimes, not added up");
    expect(view.money.lines).toContain("savings minus both: $11,700");
  });

  it("the Money badge leaves it out of the step's sum and says so; a step with no other price shows no $0", () => {
    expect(stepBadges(stepOf(result, "step-eval-train"), { skills: false, money: true, rules: true })).toEqual([
      "1 only sometimes, not added · 1 not priced",
    ]);
    // A step without one is drawn as before.
    expect(stepBadges(stepOf(result, "step-eval-ticket"), { skills: false, money: true, rules: true })).toEqual(["$300"]);
  });

  it("the step panel and the money list show the fee with its condition", () => {
    const note = cockpitWords.panel.onlyIf(CONDITION);
    const panel = renderToStaticMarkup(
      createElement(StepPanel, {
        road,
        step: road.steps.find((s) => s.id === "step-eval-train")!,
        evaluation: stepOf(result, "step-eval-train"),
        rules: result.rules,
        skillItems,
        marks: new Map(),
        selectedSkillId: null,
        branch: null,
        canSave: true,
        error: null,
        onStatus: () => {},
        onTicks: () => {},
        onMark: () => {},
        onSelectSkill: () => {},
        onProposeQuote: async () => null,
        province: "AB",
        ownNumber: null,
        onOwnNumberChange: () => {},
        onClose: () => {},
      }),
    );
    const list = renderToStaticMarkup(
      createElement(MoneyListPanel, {
        road,
        evaluation: result,
        canSave: true,
        error: null,
        onProposeSavings: async () => null,
        onSelectStep: () => {},
        onClose: () => {},
      }),
    );
    for (const html of [panel, list]) {
      expect(html).toContain("Tuition (test only)");
      expect(html).toContain("$1,500");
      expect(html).toContain(note);
    }
    // Only the one fee with a condition carries the note.
    expect(list.split(note).length - 1).toBe(1);
  });
});
