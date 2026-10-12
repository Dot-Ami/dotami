/**
 * The cockpit screen, part 1 (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built"): the
 * goal bar and its four gauges, the overlays on the road, the step panel, the lists behind the gauges
 * and "Next on your road", all drawn from one run of road evaluation.
 *
 * Road 0 (today's general road) has no "done when" lines, listed skills or cost lines yet, so most cases
 * draw the invented trade road from tests/helpers/road-to-evaluate.ts. Components are drawn to HTML the
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

import { input, inventedIdea, roadToEvaluate, skillItems, TODAY } from "./helpers/road-to-evaluate";

const stepOf = (result: RoadEvaluation, id: string) => result.steps.find((s) => s.stepId === id)!;
const ALL_ON: Overlays = { skills: true, money: true, rules: true };

/** The same verdict words road evaluation's words are checked against (tests/road-evaluation.spec.ts). */
const VERDICT = /\b(enough|ready|best|should|recommend\w*|on track|behind)\b/i;

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
    for (const file of ["goal-bar.tsx", "overlay-switches.tsx", "step-panel.tsx", "gauge-panels.tsx", "next-on-your-road.tsx"]) {
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
    expect(nextOnYourRoad(result).map((s) => s.stepId)).toEqual(["step-eval-ticket", "step-eval-own", "step-eval-open"]);
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
    expect(nextOnYourRoad(result).map((s) => s.stepId)[0]).toBe("step-eval-ticket");
  });

  it("draws its label, says it is the order steps happen, and offers each step to open", () => {
    const result = evaluateRoad(input());
    const html = renderToStaticMarkup(
      createElement(NextOnYourRoad, { road: roadToEvaluate(), evaluation: result, onSelectStep: () => {} }),
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
    const view = gaugeView(result, roadToEvaluate());
    expect(view.steps.value).toBe("1 of 7 marked done");
    expect(view.steps.lines).toContain("next on your road: “Get your ticket (test only)”");
    expect(view.skills.value).toBe("1 have · 1 learning · 1 not yet");
    expect(view.skills.lines).toContain("2 not marked, out of 5 listed");
    expect(view.money.value).toBe("$1,860 official fees · $3,400 your numbers");
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
    const view = gaugeView(result, roadToEvaluate());
    expect(view.money.lines).toContain("savings $12,000");
    // Official fees on the path with nothing picked: Tuition $1,500 and the exam $300 (Own shop waits on the pick).
    expect(view.money.lines).toContain("savings minus both: $10,200");
    expect(view.money.lines).toContain("5 wait on a pick at “Ending (test only)”");
    expect(view.date.value).toBe("May 2029");
    expect(view.date.lines).toContain("31 months from today");
  });

  it("on road 0: no listed skills or cost lines yet, said in one line each", () => {
    const view = gaugeView(evaluateRoad(road0Input()), generalRoadV2026);
    expect(view.steps.value).toBe(`0 of ${generalRoadV2026.steps.length} marked done`);
    expect(view.skills.value).toBe("No skills are listed on this road yet");
    expect(view.money.value).toBe("No cost lines on this road yet");
  });

  it("the goal bar: the person's words with their day, the target only when agreed, the future by name, four gauge buttons", () => {
    const result = evaluateRoad(input());
    const draw = (target: { amountCents: number; agreedOn: string } | null, firstWords: { text: string; saidAt: string } | null) =>
      renderToStaticMarkup(
        createElement(GoalBar, {
          road: roadToEvaluate(),
          evaluation: result,
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
  });

  it("the switches carry the road's own counts", () => {
    const counts = overlayCounts(road, result);
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
        decidedBranchIds: new Set<string>(),
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
        decidedBranchIds: new Set<string>(),
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
          decidedBranchIds: new Set<string>(),
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
});

describe("the lever cards belong to the road step (engineHints)", () => {
  it("road 0's steps name exactly the cards the old hint list gave each node", () => {
    // The list as it was in lib/brain/node-items.ts before it moved onto the road (2026-10-12).
    const before: Record<string, string[]> = {
      "stage-1-sole-prop-activation": ["writeoff-home-office", "writeoff-saas-tools", "compliance-hobby-vs-business"],
      "stage-2a-voluntary-gst-registration": ["grant-sred", "writeoff-cca-class-50", "compliance-gst-small-supplier"],
      "stage-2b-mandatory-gst-registration": ["grant-cajg", "compliance-gst-small-supplier"],
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
        onStatus: () => {},
        onTicks: () => {},
        onMark: () => {},
        onSelectSkill: () => {},
        onProposeQuote: async () => null,
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
        onMark: () => {},
        onSelectSkill: () => {},
        onClose: () => {},
      }),
    );
    for (const item of skillItems) expect(html).toContain(item.label);
    expect(html).toContain("Your own skills");
    expect(html).toContain("Welding (invented)");
    expect(html).toContain("added by you");
    expect(html).toContain("Add a skill");
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
