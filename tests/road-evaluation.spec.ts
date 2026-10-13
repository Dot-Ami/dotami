/**
 * Road evaluation and receipts (docs/architecture/future-cockpit.md § 6, "Road evaluation as built").
 * One pure function turns a road and what the person told DotAmi into each step's state with its
 * reason, and the four gauges as counts and sums; a second compares two results and writes one plain
 * line per change. Everything here runs on an invented road and invented answers
 * (tests/helpers/road-to-evaluate.ts), plus today's general road for the rules.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ConfirmedFigure } from "@/lib/brain/types";
import { generalRoadV2026, type Road } from "@/lib/engines/roads/v2026";
import type { FigureView } from "@/lib/figures/types";
import { formatMoney, formatMonth } from "@/lib/format/money-and-months";
import type { PersonFigureView } from "@/lib/futures/person-figures";
import { agreedPlanning, evaluateRoad, roadReceipt, type RoadEvaluation, type RoadEvaluationInput } from "@/lib/roads";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";
import { getScenarioNodeStatus } from "@/lib/scenarios/graph";

import { input, inventedIdea, ROAD_ID, roadToEvaluate, skillItems, TODAY } from "./helpers/road-to-evaluate";

const stateOf = (result: RoadEvaluation) => Object.fromEntries(result.steps.map((s) => [s.stepId, s.state]));
const stepOf = (result: RoadEvaluation, id: string) => result.steps.find((s) => s.stepId === id)!;

const OWN = { stepId: "step-eval-own", from: "you" as const };
const EMPLOYED = { stepId: "step-eval-employed", from: "you" as const };

/** Road 0 with the invented idea: the map's own picks, nothing else told. */
const road0 = (change: Partial<RoadEvaluationInput> = {}) =>
  input({ road: generalRoadV2026, roadChosen: false, skillItems: [], forkPicks: {}, ...change });

describe("each step's state and its reason", () => {
  it("with nothing picked: the steps before the fork apply, the fork and everything after it say check first", () => {
    const result = evaluateRoad(input());
    expect(stateOf(result)).toEqual({
      "step-eval-train": "applies",
      "step-eval-ticket": "applies",
      "step-eval-employed": "check-first",
      "step-eval-own": "check-first",
      "step-eval-keep": "check-first",
      "step-eval-open": "check-first",
      "step-eval-books": "check-first",
    });
    expect(stepOf(result, "step-eval-train").because).toBe("It's on “Invented trade road (test only)”, the road you chose.");
    expect(stepOf(result, "step-eval-own").because).toBe("No side is picked at “Ending (test only)” yet.");
    expect(stepOf(result, "step-eval-books").because).toBe("It comes after “Ending (test only)”, where no side is picked yet.");
  });

  it("road order: column by column, top to bottom", () => {
    expect(evaluateRoad(input()).steps.map((s) => s.stepId)).toEqual([
      "step-eval-train",
      "step-eval-ticket",
      "step-eval-employed",
      "step-eval-own",
      "step-eval-keep",
      "step-eval-open",
      "step-eval-books",
    ]);
  });

  it("picking one ending: that side applies, the other side and what only it leads to are not on your path", () => {
    const result = evaluateRoad(input({ forkPicks: { "fork-eval-ending": OWN } }));
    expect(stateOf(result)).toMatchObject({
      "step-eval-own": "applies",
      "step-eval-open": "applies",
      // Reached from both endings, so still on the path.
      "step-eval-books": "applies",
      "step-eval-employed": "not-on-your-path",
      "step-eval-keep": "not-on-your-path",
    });
    expect(stepOf(result, "step-eval-own").because).toBe("You picked it at “Ending (test only)”.");
    expect(stepOf(result, "step-eval-employed").because).toBe("You picked “Own shop (test only)” at “Ending (test only)”.");
    expect(stepOf(result, "step-eval-keep").reason).toEqual({
      kind: "after-other-side",
      forkId: "fork-eval-ending",
      sideStepId: "step-eval-employed",
      pickedStepId: "step-eval-own",
      from: "you",
    });
    expect(stepOf(result, "step-eval-keep").because).toBe(
      "It comes after “Stay employed (test only)”, and you picked “Own shop (test only)” at “Ending (test only)”.",
    );
  });

  it("a pick that isn't a side of its fork is no pick", () => {
    const result = evaluateRoad(input({ forkPicks: { "fork-eval-ending": { stepId: "step-eval-train", from: "you" } } }));
    expect(stepOf(result, "step-eval-own").state).toBe("check-first");
  });

  it("not for me greys the step, whatever else it would be, and leaves the steps after it alone", () => {
    const result = evaluateRoad(input({ progress: [{ stepId: "step-eval-train", status: "not-for-me", doneWhenIds: [] }] }));
    expect(stepOf(result, "step-eval-train")).toMatchObject({
      state: "not-on-your-path",
      reason: { kind: "not-for-me" },
      because: "You marked this step not for me.",
      status: "not-for-me",
    });
    expect(stepOf(result, "step-eval-ticket").state).toBe("applies");
  });

  it("doing and done are the step's status, not its state: readiness never turns a step green", () => {
    const result = evaluateRoad(
      input({
        progress: [{ stepId: "step-eval-employed", status: "done", doneWhenIds: [] }],
        skillMarks: skillItems.map((item) => ({ skillItemId: item.id, ownLabel: null, mark: "have" as const })),
      }),
    );
    expect(stepOf(result, "step-eval-employed")).toMatchObject({ status: "done", state: "check-first" });
  });

  it("on today's general road the rules decide, exactly the colours the map shows", () => {
    const result = evaluateRoad(road0());
    const map = evaluateScenario(inventedIdea(), { today: TODAY }).nodeStates;
    const asState = { green: "applies", yellow: "check-first", gray: "not-on-your-path" } as const;
    // The steps the rules read get the map's colours; road 0's before-you-open steps (2026-10-12), which
    // no rule reads, apply because they are on the road, and say so.
    const ruled = new Set(Object.keys(map));
    const states = stateOf(result);
    expect(Object.fromEntries(Object.entries(states).filter(([id]) => ruled.has(id)))).toEqual(
      Object.fromEntries(Object.entries(map).map(([id, colour]) => [id, asState[colour]])),
    );
    const beforeYouOpen = result.steps.filter((s) => !ruled.has(s.stepId));
    expect(beforeYouOpen.map((s) => s.stepId)).toEqual([
      "step-start-register-name",
      "step-start-permits-bizpal",
      "step-start-business-account",
    ]);
    for (const step of beforeYouOpen) {
      expect(step.state).toBe("applies");
      expect(step.reason).toEqual({ kind: "on-your-road" });
    }
  });

  it("a rules colour names the answers it hangs on, found by running the rules with each answer changed", () => {
    const result = evaluateRoad(road0());
    const gst = stepOf(result, "stage-2b-mandatory-gst-registration");
    expect(gst.state).toBe("check-first");
    expect(gst.reason).toEqual({ kind: "rules", answerIds: ["map-pick:gstTiming"] });
    // Nothing clicked on the map, so the pick is the map's default, and the reason says so.
    expect(gst.because).toBe(
      "Today's rules say check first, from the map's default pick at “GST timing” (“Mandatory GST registration”).",
    );
    const hire = stepOf(result, "branch-hire-first-employee");
    expect(hire.because).toBe("Today's rules leave it off your path, from the hire-first path (switched off).");
  });

  it("when no single answer changes a rules colour, it says so instead of claiming the step is for everyone", () => {
    const baseline = stepOf(evaluateRoad(road0()), "stage-0-employee-apprentice-baseline");
    expect(baseline.reason).toEqual({ kind: "rules", answerIds: [] });
    expect(baseline.because).toBe("Today's rules give it this colour; no single answer of yours changes that.");
  });

  it("each answer's words are built from the answer: the map pick names the side picked, a number is never made up", () => {
    const answers = evaluateRoad(road0()).answers;
    expect(answers.find((a) => a.id === "idea:sales-year-1")?.said).toBe("you told us first-year sales of $12,000");
    // No third-year number was given, so there is no answer, and no invented number is tried in its place.
    expect(answers.find((a) => a.id === "idea:sales-year-3")).toBeUndefined();
  });

  it("on road 0 the map's worked-out lists are not the person's statuses: with no progress, nothing says 'You marked'", () => {
    // The map's active, done and set-aside lists come from its toggles alone (lib/scenarios/branches.ts):
    // stage 0 is always done, stage 1 always active, the side not picked set aside. Road evaluation never
    // reads them; only the person's own status, kept in step progress, counts (2026-10-12, the cockpit
    // screen: the person can set one on road 0 now). tests/cockpit-screen.spec.ts checks the cockpit
    // never passes the map's lists in as progress.
    const idea = inventedIdea();
    expect(generalRoadV2026.steps.some((s) => getScenarioNodeStatus(s.id, idea) === "complete")).toBe(true);
    const result = evaluateRoad(road0({ scenario: idea }));
    expect(result.steps.filter((s) => s.reason.kind === "not-for-me")).toEqual([]);
    expect(result.steps.every((s) => s.status === null)).toBe(true);
    expect(result.gauges.steps).toMatchObject({ done: 0, doing: 0 });
    expect(result.answers.filter((a) => a.group === "step")).toEqual([]);
  });

  it("on road 0 a status the person set counts, as on any road", () => {
    const result = evaluateRoad(road0({ progress: [{ stepId: "stage-1-sole-prop-activation", status: "done", doneWhenIds: [] }] }));
    expect(result.gauges.steps.done).toBe(1);
    expect(result.answers.find((a) => a.id === "step:stage-1-sole-prop-activation")?.said).toBe("you told us “Sole Prop activation” is done");
  });

  it("on another road the person's own status still counts", () => {
    const result = evaluateRoad(input({ progress: [{ stepId: "step-eval-train", status: "done", doneWhenIds: [] }] }));
    expect(result.gauges.steps.done).toBe(1);
    expect(result.answers.find((a) => a.id === "step:step-eval-train")?.said).toBe("you told us “Train (test only)” is done");
  });
});

describe("a road that reuses a road 0 step after a fork", () => {
  // Road 1 is designed to join road 0's later columns. Here the invented road's "Open the doors",
  // which only "Own shop" leads to, goes on into road 0's retained-earnings step.
  const JOINED = "stage-4-retained-earnings-planning";
  const joinedRoad = (): Road => {
    const base = roadToEvaluate();
    const roadZeroStep = generalRoadV2026.steps.find((s) => s.id === JOINED)!;
    return {
      ...base,
      columns: [...base.columns, { id: "col-eval-joined", label: "Joined", summary: "Road 0's own step.", steps: [JOINED] }],
      steps: [
        ...base.steps.map((s) => (s.id === "step-eval-open" ? { ...s, next: [...s.next, JOINED] } : s)),
        { ...roadZeroStep, next: [], costs: [{ id: "cost-eval-joined", kind: "named" as const, label: "Advice (test only)" }] },
      ],
    };
  };
  const corporation = inventedIdea({ structure: "corporation", structureSource: "user" });

  it("after the side not picked, it is not on your path and its money is left out, whatever the rules say", () => {
    const step = stepOf(evaluateRoad(input({ road: joinedRoad(), scenario: corporation, forkPicks: { "fork-eval-ending": EMPLOYED } })), JOINED);
    expect(step).toMatchObject({ state: "not-on-your-path", money: "left-out", reason: { kind: "after-other-side", sideStepId: "step-eval-own" } });
  });

  it("with no pick yet, it waits on the pick", () => {
    const step = stepOf(evaluateRoad(input({ road: joinedRoad(), scenario: corporation })), JOINED);
    expect(step).toMatchObject({ state: "check-first", money: "waits-on-a-pick", waitsOnForkId: "fork-eval-ending" });
  });

  it("on the path, the rules colour it as they do on road 0", () => {
    const step = stepOf(evaluateRoad(input({ road: joinedRoad(), scenario: corporation, forkPicks: { "fork-eval-ending": OWN } })), JOINED);
    const roadZero = stepOf(evaluateRoad(road0({ scenario: corporation })), JOINED);
    expect(step.reason.kind).toBe("rules");
    expect(step.state).toBe(roadZero.state);
    expect(step.money).toBe("counted");
  });
});

describe("the answers it read: given, or a default worded as one", () => {
  const byId = (result: RoadEvaluation, id: string) => result.answers.find((a) => a.id === id)!;

  it("on a fresh idea, the defaults are marked not given and say they are defaults", () => {
    const result = evaluateRoad(road0({ scenario: inventedIdea({ capitalPurchasePlanned: undefined }) }));
    expect(byId(result, "idea:place")).toMatchObject({ given: true, said: "you told us your place is Alberta" });
    expect(byId(result, "idea:equipment")).toMatchObject({
      given: false,
      said: "buying equipment, a vehicle or tools is not answered yet, so the rules read it as no",
    });
    expect(byId(result, "idea:hire-first")).toMatchObject({ given: false, said: "the hire-first path is switched off" });
    expect(byId(result, "idea:structure")).toMatchObject({ given: false });
    expect(byId(result, "map-pick:gstTiming")).toMatchObject({
      given: false,
      said: "the map's default pick at “GST timing” is “Mandatory GST registration”, not your pick yet",
    });
    // Nothing that wasn't given says "you told us", "you picked" or "you switched".
    expect(result.answers.filter((a) => !a.given && /\byou (told|picked|switched)\b/.test(a.said))).toEqual([]);
  });

  it("an answer the person gave says so", () => {
    const idea = inventedIdea({ capitalPurchasePlanned: false, hireFirst: true });
    const clicked = { ...idea, state: { ...idea.state, decidedBranchIds: ["gstTiming"] } };
    const result = evaluateRoad(road0({ scenario: clicked }));
    expect(byId(result, "idea:equipment")).toMatchObject({ given: true, said: "you told us you're not buying equipment, a vehicle or tools" });
    expect(byId(result, "idea:hire-first")).toMatchObject({ given: true, said: "you switched on the hire-first path" });
    expect(byId(result, "map-pick:gstTiming")).toMatchObject({
      given: true,
      said: "you picked “Mandatory GST registration” at “GST timing” on the map",
    });
    expect(byId(result, "map-pick:incorporationTiming").given).toBe(false);
  });

  it("the person's own answers on a road are all given", () => {
    const result = evaluateRoad(
      input({ forkPicks: { "fork-eval-ending": OWN }, skillMarks: [{ skillItemId: "skill-eval-math", ownLabel: null, mark: "have" }] }),
    );
    expect(result.answers.filter((a) => !a.id.startsWith("idea:") && !a.id.startsWith("map-pick:")).every((a) => a.given)).toBe(true);
  });
});

describe("the what-if", () => {
  it("relights the rules for this run and names itself in the reason", () => {
    const result = evaluateRoad(road0({ whatIf: { firstYearSalesDollars: 45_000 } }));
    expect(result.whatIf).toEqual({ firstYearSalesDollars: 45_000 });
    const gst = stepOf(result, "stage-2b-mandatory-gst-registration");
    expect(gst.state).toBe("applies");
    expect(gst.reason.kind === "rules" && gst.reason.answerIds).toContain("what-if");
    expect(gst.because).toContain("your what-if of first-year sales ($45,000, not a forecast)");
  });

  it("the rules and tax cards in the same result call it a what-if, never the person's target", () => {
    const result = evaluateRoad(road0({ whatIf: { firstYearSalesDollars: 45_000 } }));
    const gstCard = result.rules.unlocks.find((u) => u.id === "compliance-gst-small-supplier")!;
    // The what-if still lights the card: it crosses the line, so check first.
    expect(gstCard.state).toBe("yellow");
    // Since the honest map (#145) the card names the amount and the CRA's own line, not a "threshold" it crosses.
    expect(gstCard.why).toContain("your what-if of first-year sales ($45,000, not a forecast) is over $30,000");
    expect(result.rules.unlocks.filter((u) => /Y1 revenue target/.test(u.why))).toEqual([]);
  });

  it("the person's own first-year sales are still their target (the control)", () => {
    const result = evaluateRoad(road0({ scenario: inventedIdea({ targetRevenueY1: 45_000 }) }));
    const gstCard = result.rules.unlocks.find((u) => u.id === "compliance-gst-small-supplier")!;
    expect(gstCard.state).toBe("yellow");
    expect(gstCard.why).toContain("your Y1 revenue target ($45,000) is over $30,000");
  });

  it.each([[-1], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY], ["45000" as unknown as number]])(
    "a what-if of %s is no what-if",
    (dollars) => {
      const withBad = evaluateRoad(road0({ whatIf: { firstYearSalesDollars: dollars } }));
      const without = evaluateRoad(road0());
      expect(withBad.whatIf).toBeNull();
      expect(withBad.steps).toEqual(without.steps);
    },
  );

  it("is never a figure: it touches no money sum", () => {
    const told = input({
      forkPicks: { "fork-eval-ending": OWN },
      agreed: { incomeWantedCents: 7_000_000, savingsCents: 1_200_000, costLines: [{ stepId: "step-eval-own", lineId: "cost-eval-saw", amountCents: 340_000 }] },
    });
    const without = evaluateRoad(told);
    const withWhatIf = evaluateRoad({ ...told, whatIf: { firstYearSalesDollars: 45_000 } });
    expect(withWhatIf.gauges.money).toEqual(without.gauges.money);
    expect(withWhatIf.yourTarget).toEqual(without.yourTarget);
  });
});

describe("the four gauges are counts and sums", () => {
  it("steps: done, doing and not on your path, out of every step on the road", () => {
    const result = evaluateRoad(
      input({
        forkPicks: { "fork-eval-ending": OWN },
        progress: [
          { stepId: "step-eval-train", status: "done", doneWhenIds: ["dw-eval-train-1", "dw-eval-train-1", "dw-not-a-line"] },
          { stepId: "step-eval-ticket", status: "done", doneWhenIds: [] },
          { stepId: "step-eval-own", status: "doing", doneWhenIds: [] },
          // Progress on a step this road doesn't have is not counted.
          { stepId: "step-somewhere-else", status: "done", doneWhenIds: [] },
        ],
      }),
    );
    expect(result.gauges.steps).toEqual({ done: 2, doing: 1, notOnYourPath: 2, total: 7 });
    // Ticks count once each, and only the step's own lines (their ids, for the step panel's boxes).
    expect(stepOf(result, "step-eval-train").doneWhen).toEqual({ ticked: 1, total: 2, tickedIds: ["dw-eval-train-1"] });
  });

  it("skills: each listed item once, unmarked ones counted on their own; the person's own skills apart", () => {
    const result = evaluateRoad(
      input({
        skillMarks: [
          { skillItemId: "skill-eval-math", ownLabel: null, mark: "have" },
          { skillItemId: "skill-eval-drawings", ownLabel: null, mark: "learning" },
          { skillItemId: "skill-eval-ticket", ownLabel: null, mark: "not-yet" },
          // An item this road doesn't list changes nothing here.
          { skillItemId: "skill-another-road", ownLabel: null, mark: "have" },
          { skillItemId: null, ownLabel: "Welding", mark: "have" },
        ],
      }),
    );
    expect(result.gauges.skills).toEqual({
      listed: 5,
      have: 1,
      learning: 1,
      notYet: 1,
      notMarked: 2,
      addedByYou: { have: 1, learning: 0, notYet: 0 },
    });
    expect(stepOf(result, "step-eval-train").needs).toEqual({ listed: 2, have: 1, learning: 1, notYet: 0, notMarked: 0 });
  });

  it("money, nothing picked: fees on the path added up, a blank counted as a blank, the fork's lines waiting", () => {
    const money = evaluateRoad(input()).gauges.money;
    expect(money).toEqual({
      officialFeesCents: 180_000,
      officialFeeLines: 2,
      onlyIfFeeLines: 0,
      yourNumbersCents: 0,
      yourNumberLines: 0,
      notPricedLines: 1,
      leftOutLines: 0,
      waitingOnForks: [{ forkId: "fork-eval-ending", label: "Ending (test only)", lines: 5 }],
      savingsCents: null,
      differenceCents: null,
    });
  });

  it("money, own shop picked, with the person's numbers and savings: savings minus (fees + your numbers)", () => {
    const result = evaluateRoad(
      input({
        forkPicks: { "fork-eval-ending": OWN },
        agreed: {
          incomeWantedCents: null,
          savingsCents: 1_200_000,
          costLines: [
            { stepId: "step-eval-own", lineId: "cost-eval-saw", amountCents: 340_000 },
            { stepId: "step-eval-own", lineId: "cost-eval-deposit", amountCents: 200_000 },
            // A number for an official fee never replaces the fee.
            { stepId: "step-eval-train", lineId: "cost-eval-tuition", amountCents: 1 },
            // A broken number is shown as not priced, never added up.
            { stepId: "step-eval-open", lineId: "cost-eval-insurance", amountCents: -500 },
            // A line this road doesn't have prices nothing.
            { stepId: "step-eval-own", lineId: "cost-not-on-this-road", amountCents: 999 },
          ],
        },
      }),
    );
    expect(result.gauges.money).toEqual({
      officialFeesCents: 186_000,
      officialFeeLines: 3,
      onlyIfFeeLines: 0,
      yourNumbersCents: 540_000,
      yourNumberLines: 2,
      notPricedLines: 3,
      leftOutLines: 0,
      waitingOnForks: [],
      savingsCents: 1_200_000,
      differenceCents: 1_200_000 - (186_000 + 540_000),
    });
    expect(stepOf(result, "step-eval-own").costs).toEqual([
      { kind: "your-quote", lineId: "cost-eval-saw", label: "Table saw (test only)", amountCents: 340_000 },
      { kind: "your-quote", lineId: "cost-eval-deposit", label: "Space deposit (test only)", amountCents: 200_000 },
      expect.objectContaining({ kind: "official-fee", lineId: "cost-eval-name", amountCents: 6_000 }),
    ]);
  });

  it("money, the other ending picked: the lines on steps off the path are left out of the sums", () => {
    const money = evaluateRoad(input({ forkPicks: { "fork-eval-ending": EMPLOYED } })).gauges.money;
    expect(money).toMatchObject({ officialFeesCents: 180_000, officialFeeLines: 2, notPricedLines: 2, leftOutLines: 4, waitingOnForks: [] });
  });

  it("no difference without savings, and none without a line that has an amount", () => {
    expect(evaluateRoad(input()).gauges.money.differenceCents).toBeNull();
    const nothingPriced = evaluateRoad(
      input({
        forkPicks: { "fork-eval-ending": EMPLOYED },
        progress: [
          { stepId: "step-eval-train", status: "not-for-me", doneWhenIds: [] },
          { stepId: "step-eval-ticket", status: "not-for-me", doneWhenIds: [] },
        ],
        agreed: { incomeWantedCents: null, savingsCents: 500_000, costLines: [] },
      }),
    ).gauges.money;
    expect(nothingPriced).toMatchObject({ officialFeeLines: 0, yourNumberLines: 0, notPricedLines: 1, savingsCents: 500_000, differenceCents: null });
  });

  it("your date: calendar months from this month to the person's month, only when they set one", () => {
    expect(evaluateRoad(input()).gauges.date).toBeNull();
    expect(evaluateRoad(input({ targetMonth: "2029-05" })).gauges.date).toEqual({ targetMonth: "2029-05", monthsFromToday: 31 });
    expect(evaluateRoad(input({ targetMonth: "2026-10" })).gauges.date).toEqual({ targetMonth: "2026-10", monthsFromToday: 0 });
    expect(evaluateRoad(input({ targetMonth: "May 2029" })).gauges.date).toBeNull();
  });

  it("the income the person wants is passed through as their target and compared with nothing", () => {
    expect(evaluateRoad(input()).yourTarget).toBeNull();
    const result = evaluateRoad(input({ agreed: { incomeWantedCents: 7_000_000, savingsCents: null, costLines: [] } }));
    expect(result.yourTarget).toEqual({ incomeWantedCents: 7_000_000 });
    expect(result.gauges.money.differenceCents).toBeNull();
  });

  it("the same input always gives the same result", () => {
    const told = road0({ whatIf: { firstYearSalesDollars: 45_000 }, targetMonth: "2029-05" });
    expect(evaluateRoad(told)).toEqual(evaluateRoad(told));
  });
});

describe("agreedPlanning: only numbers the person agreed to, for this road", () => {
  const figure = (change: Partial<FigureView>): FigureView => ({
    id: "f",
    ventureId: "v",
    kind: "start-up-cost-line",
    periodStart: TODAY,
    periodEnd: TODAY,
    amountCents: 100,
    currency: "CAD",
    sourceKind: "typed",
    sourceLabel: "typed by you",
    sourceRows: null,
    taxYear: null,
    formLine: null,
    costLine: { roadId: ROAD_ID, stepId: "step-eval-own", lineId: "cost-eval-saw", amountFrom: "quote" },
    status: "confirmed",
    editedByPerson: false,
    proposedAt: "2026-10-01T00:00:00.000Z",
    confirmedAt: "2026-10-01T00:00:00.000Z",
    retractedAt: null,
    ...change,
  });
  const income = (change: Partial<PersonFigureView>): PersonFigureView => ({
    id: "p",
    kind: "income-wanted",
    amountCents: 7_000_000,
    currency: "CAD",
    per: "year",
    sourceKind: "typed",
    sourceLabel: "typed by you",
    status: "confirmed",
    editedByPerson: false,
    proposedAt: "2026-10-01T00:00:00.000Z",
    confirmedAt: "2026-10-01T00:00:00.000Z",
    retractedAt: null,
    ...change,
  });

  it("never a proposed, taken-back or turned-down number", () => {
    const picked = agreedPlanning(
      ROAD_ID,
      [
        figure({ status: "proposed", amountCents: 1 }),
        figure({ status: "retracted", amountCents: 2 }),
        figure({ status: "discarded", amountCents: 3 }),
        figure({ kind: "savings-for-start", costLine: null, status: "proposed", amountCents: 4 }),
      ],
      [income({ status: "proposed" }), income({ status: "retracted" })],
    );
    expect(picked).toEqual({ incomeWantedCents: null, savingsCents: null, costLines: [] });
  });

  it("the one agreed last for each line, and nothing from another road", () => {
    const picked = agreedPlanning(
      ROAD_ID,
      [
        figure({ amountCents: 100, confirmedAt: "2026-10-02T00:00:00.000Z" }),
        figure({ amountCents: 300, confirmedAt: "2026-10-05T00:00:00.000Z" }),
        figure({ amountCents: 200, confirmedAt: "2026-10-03T00:00:00.000Z" }),
        figure({ amountCents: 9, costLine: { roadId: "road-other", stepId: "s", lineId: "l", amountFrom: "quote" } }),
        figure({ kind: "savings-for-start", costLine: null, amountCents: 1_200_000 }),
        figure({ kind: "gross-revenue", costLine: null, amountCents: 5 }),
      ],
      [income({})],
    );
    expect(picked).toEqual({
      incomeWantedCents: 7_000_000,
      savingsCents: 1_200_000,
      costLines: [{ stepId: "step-eval-own", lineId: "cost-eval-saw", amountCents: 300 }],
    });
  });
});

describe("receipts: one plain line per change, from the two runs", () => {
  it("no change, no lines", () => {
    const told = input({ forkPicks: { "fork-eval-ending": OWN } });
    expect(roadReceipt(evaluateRoad(told), evaluateRoad(told))).toEqual([]);
  });

  it("marking two skills names both; the skills line counts skills and claims nothing else about the step", () => {
    const before = evaluateRoad(input());
    const after = evaluateRoad(
      input({
        skillMarks: [
          { skillItemId: "skill-eval-math", ownLabel: null, mark: "have" },
          { skillItemId: "skill-eval-drawings", ownLabel: null, mark: "have" },
        ],
      }),
    );
    const because = "Because you told us you have “Trade math (test only)” and you told us you have “Read drawings (test only)”";
    expect(roadReceipt(before, after)).toEqual([
      `${because}, 1 step now has every skill it lists marked have.`,
      `${because}, the skills now read 2 have, 0 learning, 0 not yet, 3 not marked.`,
    ]);
    // The step still has its two "done when" lines and its money to go: the line is about skills only.
    expect(stepOf(after, "step-eval-train")).toMatchObject({ doneWhen: { ticked: 0, total: 2 }, needs: { listed: 2, have: 2 } });
  });

  it("three or more answers of one kind are counted", () => {
    const after = evaluateRoad(
      input({
        skillMarks: ["skill-eval-math", "skill-eval-drawings", "skill-eval-ticket"].map((id) => ({
          skillItemId: id,
          ownLabel: null,
          mark: "have" as const,
        })),
      }),
    );
    expect(roadReceipt(evaluateRoad(input()), after)[0]).toBe("Because you marked 3 skills, 2 steps now have every skill they list marked have.");
  });

  it("taking an answer back says so", () => {
    const before = evaluateRoad(input({ skillMarks: [{ skillItemId: "skill-eval-math", ownLabel: null, mark: "have" }] }));
    expect(roadReceipt(before, evaluateRoad(input()))).toEqual([
      "Because you took back your mark on “Trade math (test only)”, the skills now read 0 have, 0 learning, 0 not yet, 5 not marked.",
    ]);
  });

  it("taking back three or more is counted as taken back, never as marked", () => {
    const marks = ["skill-eval-math", "skill-eval-drawings", "skill-eval-ticket"].map((id) => ({
      skillItemId: id,
      ownLabel: null,
      mark: "have" as const,
    }));
    const lines = roadReceipt(evaluateRoad(input({ skillMarks: marks })), evaluateRoad(input()));
    expect(lines).toEqual([
      "Because you took back 3 skill marks, 2 steps no longer have every skill they list marked have.",
      "Because you took back 3 skill marks, the skills now read 0 have, 0 learning, 0 not yet, 5 not marked.",
    ]);
  });

  it("marks given and marks taken back at once are counted apart", () => {
    const mark = (id: string) => ({ skillItemId: id, ownLabel: null, mark: "have" as const });
    const before = evaluateRoad(input({ skillMarks: ["skill-eval-math", "skill-eval-drawings", "skill-eval-ticket"].map(mark) }));
    const after = evaluateRoad(
      input({ skillMarks: ["skill-eval-quoting", "skill-eval-books", "skill-eval-math"].map((id) => ({ ...mark(id), mark: "learning" as const })) }),
    );
    // Three marked (two new, one changed), two taken back: the three are counted, the two named.
    expect(roadReceipt(before, after)[0]).toMatch(
      /^Because you marked 3 skills, you took back your mark on “Read drawings \(test only\)” and you took back your mark on “Trade ticket \(test only\)”, /,
    );
  });

  it("picking an ending: steps by their new state, and the money that moved", () => {
    const lines = roadReceipt(evaluateRoad(input()), evaluateRoad(input({ forkPicks: { "fork-eval-ending": OWN } })));
    const because = "Because you picked “Own shop (test only)” at “Ending (test only)”";
    expect(lines).toEqual([
      `${because}, 3 steps now apply.`,
      `${because}, 2 steps are now not on your path.`,
      `${because}, the official fees now add up to $1,860 across 3 lines.`,
      `${because}, 5 cost lines are not priced yet.`,
      `${because}, no cost line waits on a pick at “Ending (test only)” now.`,
    ]);
  });

  it("a number and savings: plain sums and a plain difference", () => {
    const told = input({ forkPicks: { "fork-eval-ending": OWN } });
    const before = evaluateRoad(told);
    const after = evaluateRoad({
      ...told,
      agreed: { incomeWantedCents: null, savingsCents: 1_200_000, costLines: [{ stepId: "step-eval-own", lineId: "cost-eval-saw", amountCents: 340_000 }] },
    });
    const because =
      "Because you told us your number for “Table saw (test only)” on “Own shop (test only)” is $3,400 and you told us you'd put $12,000 of savings toward starting";
    expect(roadReceipt(before, after)).toEqual([
      `${because}, your own numbers now add up to $3,400 across 1 line.`,
      `${because}, 4 cost lines are not priced yet.`,
      `${because}, your savings for starting now read $12,000.`,
      `${because}, your savings minus the official fees and your own numbers is now $6,740.`,
    ]);
  });

  it("a what-if says it is one, and what it relit", () => {
    const lines = roadReceipt(evaluateRoad(road0()), evaluateRoad(road0({ whatIf: { firstYearSalesDollars: 45_000 } })));
    const because = "Because you tried first-year sales of $45,000 (your what-if, not a forecast)";
    expect(lines).toContain(`${because}, 1 step now applies.`);
    expect(lines).toContain(`${because}, 1 step now says check first.`);
    expect(lines.every((line) => line.startsWith(because))).toBe(true);
  });

  it("with no answer changed (the month turned over), the line is the change alone", () => {
    const before = evaluateRoad(input({ targetMonth: "2029-05" }));
    const after = evaluateRoad(input({ targetMonth: "2029-05", today: "2026-11-02" }));
    const lines = roadReceipt(before, after);
    expect(lines).toContain("Your date now reads May 2029, 30 months from today.");
    expect(lines.some((line) => line.startsWith("Because"))).toBe(false);
  });
});

describe("the words: counts and arithmetic, never a verdict", () => {
  // A gap is a count or a sum, never "enough", "ready" or "best", and nothing says what to do
  // (docs/architecture/future-cockpit.md § 4 and § 8).
  const VERDICT = /\b(enough|ready|best|should|recommend\w*|on track|behind)\b/i;

  const runs: RoadEvaluationInput[] = [
    input(),
    input({ forkPicks: { "fork-eval-ending": OWN }, targetMonth: "2029-05" }),
    input({ forkPicks: { "fork-eval-ending": EMPLOYED }, targetMonth: "2026-08" }),
    input({
      forkPicks: { "fork-eval-ending": OWN },
      skillMarks: [
        ...skillItems.map((item, i) => ({ skillItemId: item.id, ownLabel: null, mark: (["have", "learning", "not-yet"] as const)[i % 3] })),
        { skillItemId: null, ownLabel: "Welding", mark: "learning" as const },
      ],
      progress: [
        { stepId: "step-eval-train", status: "done", doneWhenIds: ["dw-eval-train-1"] },
        { stepId: "step-eval-ticket", status: "doing", doneWhenIds: [] },
        { stepId: "step-eval-books", status: "not-for-me", doneWhenIds: [] },
      ],
      agreed: { incomeWantedCents: 7_000_000, savingsCents: 100_000, costLines: [{ stepId: "step-eval-own", lineId: "cost-eval-saw", amountCents: 340_050 }] },
    }),
    // Every skill marked have, so the pairs include steps whose every listed skill is marked.
    input({ skillMarks: skillItems.map((item) => ({ skillItemId: item.id, ownLabel: null, mark: "have" as const })) }),
    road0(),
    road0({ whatIf: { firstYearSalesDollars: 45_000 } }),
    road0({ scenario: inventedIdea({ structure: "corporation", structureSource: "user", hireFirst: true, targetRevenueY3: 150_000, activityTags: ["Software / SaaS"] }) }),
    road0({ confirmedFigures: [figureForRules()] }),
  ];
  const results = runs.map(evaluateRoad);

  it("no reason, answer or receipt line says enough, ready, best, should, recommended, on track or behind", () => {
    const sentences = [
      ...results.flatMap((r) => r.steps.map((s) => s.because)),
      ...results.flatMap((r) => r.answers.flatMap((a) => [a.said, a.takenBack, a.fact])),
      // Every pair both ways, so each change reads once as given and once as taken back.
      ...results.flatMap((a) => results.flatMap((b) => roadReceipt(a, b))),
    ];
    expect(sentences.length).toBeGreaterThan(200);
    expect(sentences.filter((s) => VERDICT.test(s))).toEqual([]);
    // Nor that a step needs nothing more: skills marked say nothing about its "done when" lines or money.
    expect(sentences.filter((s) => /\bnothing more\b|\bneeds? nothing\b/i.test(s))).toEqual([]);
  });

  it("one formatter for money and months", () => {
    expect(formatMoney(640_000)).toBe("$6,400");
    expect(formatMoney(640_050)).toBe("$6,400.50");
    expect(formatMoney(-120_000)).toBe("-$1,200");
    expect(formatMonth("2029-05")).toBe("May 2029");
  });
});

describe("road evaluation is pure", () => {
  const root = path.resolve(__dirname, "..");
  const files = [
    ...readdirSync(path.join(root, "lib", "roads")).map((name) => path.join("lib", "roads", name)),
    path.join("lib", "format", "money-and-months.ts"),
  ];
  // What it may import at run time: its own files, the road catalog, the rules (themselves pure) and
  // the one formatter. Type-only imports vanish when compiled, so they are not run-time imports.
  // "@/lib/scenarios/graph" is for `isBranchDecided` (#145): whether the person picked a fork comes
  // from their saved state, not only this session's clicks. It reads only the scenario it is given.
  // "@/lib/scenarios/branches" is for `withoutAnswer` (2026-10-12, the cockpit's part 2): a map pick taken
  // back returns to the map's default, the same pure change the map's toggles make. Its one import beyond
  // types is lib/db/scenario-state-json.ts's number cleaner, which reads nothing either.
  // "@/lib/scenarios/not-said" is two pure functions over the profile's not-said list, importing only
  // lib/scenarios/types (2026-10-12): a picked future's unasked answers are never listed as told.
  const ALLOWED = new Set([
    "@/lib/scenarios/branches",
    "./agreed",
    "./evaluate-road",
    "./paths",
    "./receipts",
    "./words",
    "@/lib/engines/roads/v2026",
    "@/lib/format/money-and-months",
    "@/lib/scenarios/evaluate-scenario",
    "@/lib/scenarios/graph",
    "@/lib/scenarios/not-said",
    "@/lib/scenarios/types",
  ]);

  it("imports nothing that reads a file, the database or the network", () => {
    const found = files.flatMap((rel) => {
      const text = readFileSync(path.join(root, rel), "utf8");
      return [...text.matchAll(/^import\s+(?!type\b)[^;]*?from\s+"([^"]+)"/gms)].map((m) => `${rel}: ${m[1]}`);
    });
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((f) => !ALLOWED.has(f.split(": ")[1]))).toEqual([]);
  });

  it("reads no clock, no randomness, no environment, and loads nothing at run time", () => {
    const BANNED = /\bfetch\s*\(|Date\.now|new Date\s*\(|Math\.random|process\.|require\s*\(|\bimport\s*\(/;
    const found = files.filter((rel) => BANNED.test(readFileSync(path.join(root, rel), "utf8")));
    expect(found).toEqual([]);
  });
});

/** One agreed business figure, invented, for the rules' "from your records" path. */
function figureForRules(): ConfirmedFigure {
  return {
    id: "fig-invented",
    kind: "gross-revenue",
    periodStart: "2026-07-01",
    periodEnd: "2026-09-30",
    amountCents: 3_100_000,
    currency: "CAD",
    sourceLabel: "typed by you",
    sourceRows: null,
  };
}
