/**
 * The cockpit screen, part 2 (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built, part 2"):
 * "What you've told DotAmi" with what each answer unlocked, "Not told yet", the receipts, the what-if and
 * "Compare the two endings". Every piece is worked out from road evaluation (lib/roads/), never written:
 * a row's "what it unlocked" is road evaluation run without the answer and with it, and a receipt is the
 * same comparison before and after a save.
 *
 * Most cases use the invented trade road (tests/helpers/road-to-evaluate.ts); road 0's map picks are
 * checked on today's general road.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CompareEndings } from "@/components/cockpit/compare-endings";
import { ReceiptLines } from "@/components/cockpit/receipt-lines";
import { ToldList } from "@/components/cockpit/told-list";
import { WhatIfBar } from "@/components/cockpit/what-if-bar";
import {
  answerReceipt,
  compareEndings,
  keepWhatIf,
  notToldYet,
  parseWhatIf,
  toldRows,
  type KeptAnswers,
} from "@/lib/cockpit/told";
import { cockpitWords } from "@/lib/cockpit/words";
import { generalRoadV2026 } from "@/lib/engines/roads/v2026";
import type { FigureView } from "@/lib/figures/types";
import { evaluateRoad, roadReceipt, withoutAnswer, withoutIdeaAnswer, type RoadEvaluationInput } from "@/lib/roads";
import { clearScenarioBranch, defaultActiveBranches, updateScenarioBranch } from "@/lib/scenarios/branches";
import { isBranchDecided } from "@/lib/scenarios/graph";

import { input, inventedIdea, skillItems, TODAY } from "./helpers/road-to-evaluate";

const VERDICT = /\b(enough|ready|best|better|worse|should|recommend\w*|on track|behind|score)\b/i;
const FORK = "fork-eval-ending";
const OWN = "step-eval-own";
const EMPLOYED = "step-eval-employed";

/** A confirmed planning figure as the figures list returns it. */
function figure(change: Partial<FigureView>): FigureView {
  return {
    id: `f-${Math.random().toString(36).slice(2)}`,
    ventureId: "v",
    kind: "savings-for-start",
    periodStart: TODAY,
    periodEnd: TODAY,
    amountCents: 0,
    currency: "CAD",
    sourceKind: "typed",
    sourceLabel: "typed by you",
    sourceRows: null,
    status: "confirmed",
    editedByPerson: false,
    proposedAt: "2026-10-09T12:00:00.000Z",
    confirmedAt: "2026-10-09T12:00:00.000Z",
    retractedAt: null,
    taxYear: null,
    formLine: null,
    costLine: null,
    ...change,
  } as FigureView;
}

/** An input where the person has told DotAmi one of everything, on the invented road. */
function toldEverything(): RoadEvaluationInput {
  return input({
    scenario: inventedIdea({
      structure: "corporation",
      structureSource: "user",
      capitalPurchasePlanned: true,
      hireFirst: true,
      targetRevenueY1: 45_000,
      targetRevenueY3: 90_000,
      activityTags: ["Trades", "Manufacturing"],
    }),
    confirmedFigures: [
      {
        id: "g1",
        kind: "gross-revenue",
        periodStart: "2025-01-01",
        periodEnd: "2025-12-31",
        amountCents: 2_000_000,
        currency: "CAD",
        sourceLabel: "typed by you",
        sourceRows: null,
      },
    ],
    forkPicks: { [FORK]: { stepId: OWN, from: "you" } },
    skillMarks: [
      { skillItemId: "skill-eval-math", ownLabel: null, mark: "have" },
      { skillItemId: "skill-eval-drawings", ownLabel: null, mark: "learning" },
      { skillItemId: null, ownLabel: "Welding", mark: "not-yet" },
    ],
    progress: [
      { stepId: "step-eval-train", status: "doing", doneWhenIds: ["dw-eval-train-1"] },
      { stepId: "step-eval-keep", status: "not-for-me", doneWhenIds: [] },
    ],
    agreed: {
      incomeWantedCents: 7_000_000,
      savingsCents: 1_200_000,
      costLines: [{ stepId: OWN, lineId: "cost-eval-saw", amountCents: 340_000 }],
    },
    targetMonth: "2029-05",
  });
}

const kept = (change: Partial<KeptAnswers> = {}): KeptAnswers => ({
  progress: [
    {
      stepId: "step-eval-train",
      changes: [
        { at: "2026-10-01T15:00:00.000Z", status: "doing" },
        { at: "2026-10-03T15:00:00.000Z", status: "doing" },
      ],
      updatedAt: "2026-10-04T15:00:00.000Z",
    },
  ],
  skillMarks: [
    { skillItemId: "skill-eval-math", ownLabel: null, markedOn: "2026-10-05" },
    { skillItemId: null, ownLabel: "Welding", markedOn: "2026-10-06" },
  ],
  forkPickedOn: { [FORK]: "2026-10-07" },
  targetMonthSetOn: "2026-10-08",
  figures: [
    figure({ id: "sav-1", kind: "savings-for-start", amountCents: 1_200_000, confirmedAt: "2026-10-09T12:00:00.000Z" }),
    figure({
      id: "saw-1",
      kind: "start-up-cost-line",
      amountCents: 340_000,
      confirmedAt: "2026-10-10T12:00:00.000Z",
      costLine: { roadId: "road-evaluation-invented", stepId: OWN, lineId: "cost-eval-saw", amountFrom: "quote" },
    }),
    // Taken back: never a reason for a row or a take back.
    figure({ id: "sav-0", kind: "savings-for-start", status: "retracted", amountCents: 900_000 }),
  ],
  incomeWantedOn: "2026-10-02",
  ...change,
});

const given = (i: RoadEvaluationInput) => evaluateRoad(i).answers.filter((a) => a.given);

describe("withoutAnswer: one answer taken away, and nothing else", () => {
  const full = toldEverything();
  const ids = given(full).map((a) => a.id);

  it("every answer the person gave can be taken away on its own, except the three the map can't be drawn without", () => {
    expect(ids).toEqual(expect.arrayContaining(["skill:skill-eval-math", "own-skill:welding", "step:step-eval-train", "ticks:step-eval-train", `fork:${FORK}`, `cost-line:${OWN}/cost-eval-saw`, "savings", "income-wanted", "date", "idea:structure", "idea:equipment", "idea:hire-first", "idea:kinds-of-work", "idea:sales-year-1", "idea:sales-year-3", "idea:figures"]));
    for (const id of ids) {
      const without = withoutAnswer(full, id);
      if (["idea:place", "idea:venture-type", "idea:work-situation"].includes(id)) {
        expect(without, id).toBeNull();
        continue;
      }
      expect(without, id).not.toBeNull();
      const after = given(without!);
      // That answer is gone (or back to a default the person didn't set) ...
      expect(after.map((a) => a.id), id).not.toContain(id);
      // ... and every other answer reads exactly as it did.
      const rest = (list: ReturnType<typeof given>) => list.filter((a) => a.id !== id).map((a) => `${a.id}=${a.said}`);
      expect(rest(after), id).toEqual(rest(given(full)));
    }
  });

  it("never changes the input it was given", () => {
    const before = JSON.stringify(full);
    for (const id of ids) withoutAnswer(full, id);
    expect(JSON.stringify(full)).toBe(before);
  });

  it("an answer it doesn't know is null, never a guess", () => {
    expect(withoutAnswer(full, "no-such-answer")).toBeNull();
    expect(withoutAnswer(full, "skill:skill-nobody-marked")).toBeNull();
  });

  it("on today's road, a map pick taken back is the map's default again, not a pick of the person's", () => {
    const off = updateScenarioBranch(inventedIdea(), "gstTiming", "stage-2a-voluntary-gst-registration");
    const road0 = input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario: off });
    expect(given(road0).map((a) => a.id)).toContain("map-pick:gstTiming");
    const without = withoutAnswer(road0, "map-pick:gstTiming")!;
    expect(without.scenario.state.activeBranches.gstTiming).toBe(defaultActiveBranches.gstTiming);
    expect(isBranchDecided("gstTiming", without.scenario.state)).toBe(false);
    expect(given(without).map((a) => a.id)).not.toContain("map-pick:gstTiming");
    // The page takes it back with the same change, so the receipt is the row's "what it unlocked".
    expect(withoutIdeaAnswer(off, "map-pick:gstTiming")).toEqual(without.scenario);
    expect(clearScenarioBranch(off, "gstTiming")).toEqual(without.scenario);
  });

  it("the idea's own answers go back to their not-given state: structure assumed, equipment unanswered, sales none", () => {
    const idea = toldEverything().scenario;
    expect(withoutIdeaAnswer(idea, "idea:structure")!.profile).toMatchObject({ structure: "sole-prop", structureSource: "assumed" });
    expect(withoutIdeaAnswer(idea, "idea:equipment")!.profile.capitalPurchasePlanned).toBeUndefined();
    expect(withoutIdeaAnswer(idea, "idea:sales-year-1")!.profile.targetRevenueY1).toBe(0);
    expect(withoutIdeaAnswer(idea, "idea:kinds-of-work")!.profile.activityTags).toEqual([]);
    const hire = withoutIdeaAnswer(idea, "idea:hire-first")!;
    expect(hire.profile.hireFirst).toBe(false);
    // The map's own lists follow the switch, as the intake's save would leave them.
    expect(hire.state.ghostedNodeIds).toContain("branch-hire-first-employee");
    expect(withoutIdeaAnswer(idea, "idea:place")).toBeNull();
    expect(withoutIdeaAnswer(idea, "skill:skill-eval-math")).toBeNull();
  });
});

describe("What you've told DotAmi", () => {
  const full = toldEverything();
  const evaluation = evaluateRoad(full);
  const rows = toldRows(full, evaluation, kept());
  const row = (id: string) => rows.find((r) => r.id === id)!;

  it("lists only the answers the person gave: no default, and never a what-if", () => {
    const withDefaults = input({ whatIf: { firstYearSalesDollars: 45_000 } });
    const ids = toldRows(withDefaults, evaluateRoad(withDefaults), kept()).map((r) => r.id);
    expect(ids).not.toContain("what-if");
    expect(ids).not.toContain("idea:structure");
    expect(ids).not.toContain("idea:equipment");
    expect(ids).not.toContain("map-pick:gstTiming");
    expect(ids).toContain("idea:place");
  });

  it("says each answer in its own words, in road evaluation's order", () => {
    expect(rows.map((r) => r.id)).toEqual(evaluation.answers.filter((a) => a.given && a.id !== "what-if").map((a) => a.id));
    expect(row("date").said).toBe("You told us your date is May 2029");
    expect(row("skill:skill-eval-math").said).toBe("You told us you have “Trade math (test only)”");
  });

  it("what it unlocked is road evaluation without the answer against with it: the receipt's own words", () => {
    for (const r of rows) {
      const without = withoutAnswer(full, r.id);
      if (without === null) {
        expect(r.unlocked, r.id).toBeNull();
        continue;
      }
      expect(r.unlocked, r.id).toEqual(roadReceipt(evaluateRoad(without), evaluation));
    }
    expect(row("date").unlocked).toContain("Because you told us your date is May 2029, your date now reads May 2029, 31 months from today.");
    expect(row("idea:place").unlocked).toBeNull();
  });

  it("each row carries the day kept with its answer, and no day where none is kept", () => {
    expect(row("skill:skill-eval-math").day).toBe("2026-10-05");
    expect(row("own-skill:welding").day).toBe("2026-10-06");
    expect(row(`fork:${FORK}`).day).toBe("2026-10-07");
    expect(row("date").day).toBe("2026-10-08");
    expect(row("income-wanted").day).toBe("2026-10-02");
    // A number: the day it was agreed, on this computer.
    expect(row("savings").day).toBe(dayOf("2026-10-09T12:00:00.000Z"));
    expect(row(`cost-line:${OWN}/cost-eval-saw`).day).toBe(dayOf("2026-10-10T12:00:00.000Z"));
    // A status: the day of its last change; ticks: the day the step was last changed.
    expect(row("step:step-eval-train").day).toBe(dayOf("2026-10-03T15:00:00.000Z"));
    expect(row("ticks:step-eval-train").day).toBe(dayOf("2026-10-04T15:00:00.000Z"));
    // The intake's answers keep no day of their own: never borrowed from somewhere else.
    for (const id of ["idea:place", "idea:structure", "idea:sales-year-1"]) expect(row(id).day, id).toBeNull();
  });

  it("each row's Change and Take back go where its answer is given and kept", () => {
    expect(row("skill:skill-eval-math").takeBack).toEqual({ kind: "skill-mark", skillItemId: "skill-eval-math" });
    expect(row("own-skill:welding").takeBack).toEqual({ kind: "own-skill", ownLabel: "Welding" });
    expect(row("step:step-eval-train").takeBack).toEqual({ kind: "step-status", stepId: "step-eval-train" });
    expect(row("ticks:step-eval-train").takeBack).toEqual({ kind: "step-ticks", stepId: "step-eval-train" });
    expect(row(`fork:${FORK}`).takeBack).toEqual({ kind: "ending", forkId: FORK });
    expect(row("date").takeBack).toEqual({ kind: "date" });
    // A number is taken back as a figure: only the agreed one, never one already taken back.
    expect(row("savings").takeBack).toEqual({ kind: "figures", figureIds: ["sav-1"] });
    expect(row(`cost-line:${OWN}/cost-eval-saw`).takeBack).toEqual({ kind: "figures", figureIds: ["saw-1"] });
    expect(row("idea:structure").takeBack).toEqual({ kind: "idea" });
    expect(row("idea:place").takeBack).toEqual({ kind: "none", why: "required" });
    expect(row("idea:figures").takeBack).toEqual({ kind: "none", why: "figures" });
    expect(row("income-wanted").takeBack).toEqual({ kind: "none", why: "no-route" });

    expect(row("skill:skill-eval-math").change).toEqual({ kind: "skills" });
    expect(row("step:step-eval-train").change).toEqual({ kind: "step", stepId: "step-eval-train" });
    expect(row(`cost-line:${OWN}/cost-eval-saw`).change).toEqual({ kind: "step", stepId: OWN });
    expect(row(`fork:${FORK}`).change).toEqual({ kind: "compare", forkId: FORK });
    expect(row("date").change).toEqual({ kind: "box", question: "date" });
    expect(row("idea:structure").change).toEqual({ kind: "box", question: "structure" });
    expect(row("idea:place").change).toEqual({ kind: "intake" });
    expect(row("idea:figures").change).toEqual({ kind: "figures" });
  });
});

describe("Not told yet", () => {
  it("each missing answer, in a fixed order, with what it would unlock", () => {
    const empty = input();
    const rows = notToldYet(empty, evaluateRoad(empty));
    expect(rows.map((r) => r.id)).toEqual(["date", "savings", "cost-lines", "skills", `ending:${FORK}`, "structure", "equipment"]);
    for (const r of rows) {
      expect(r.question.length, r.id).toBeGreaterThan(0);
      expect(r.unlocks.length, r.id).toBeGreaterThan(0);
      expect(`${r.question} ${r.unlocks}`, r.id).not.toMatch(VERDICT);
    }
    expect(rows.find((r) => r.id === "cost-lines")!.question).toBe("Your numbers for 5 cost lines not priced yet");
    expect(rows.find((r) => r.id === "skills")!.question).toBe("Your marks on 5 skills not marked");
    expect(rows.find((r) => r.id === `ending:${FORK}`)).toMatchObject({ answer: "compare", forkId: FORK });
    expect(rows.find((r) => r.id === "date")).toMatchObject({ answer: "box" });
  });

  it("an answer given leaves the list", () => {
    const full = toldEverything();
    const ids = notToldYet(full, evaluateRoad(full)).map((r) => r.id);
    for (const gone of ["date", "savings", `ending:${FORK}`, "structure", "equipment"]) expect(ids).not.toContain(gone);
  });

  it("on today's road: the map's default picks and the person's own incorporation number, never an ending of its own", () => {
    const road0 = input({ road: generalRoadV2026, roadChosen: false, skillItems: [] });
    const ids = notToldYet(road0, evaluateRoad(road0)).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["map-pick:gstTiming", "map-pick:incorporationTiming", "structure", "equipment", "incorporate-at"]));
    expect(ids.some((id) => id.startsWith("ending:"))).toBe(false);
    const decided = { ...road0, scenario: updateScenarioBranch(road0.scenario, "gstTiming", "stage-2a-voluntary-gst-registration") };
    expect(notToldYet(decided, evaluateRoad(decided)).map((r) => r.id)).not.toContain("map-pick:gstTiming");
    // The map's picks are asked only on today's road, where the map draws them.
    const other = input();
    expect(notToldYet(other, evaluateRoad(other)).map((r) => r.id).some((id) => id.startsWith("map-pick:"))).toBe(false);
  });
});

describe("receipts", () => {
  it("a receipt is road evaluation before and after the answer, compared", () => {
    const before = input();
    const after = input({ targetMonth: "2029-05" });
    expect(answerReceipt(before, after)).toEqual(roadReceipt(evaluateRoad(before), evaluateRoad(after)));
    expect(answerReceipt(before, after)).toEqual(["Because you told us your date is May 2029, your date now reads May 2029, 31 months from today."]);
    expect(answerReceipt(before, before)).toEqual([]);
  });
});

describe("the what-if", () => {
  it("only a whole, non-negative number of dollars is a what-if", () => {
    expect(parseWhatIf("45000")).toBe(45_000);
    expect(parseWhatIf(" 45,000 ")).toBe(45_000);
    expect(parseWhatIf("$45,000")).toBe(45_000);
    for (const bad of ["", "abc", "-5", "45000.50", "1e9x"]) expect(parseWhatIf(bad), bad).toBeNull();
  });

  it("Keep makes it the idea's own first-year sales, and changes nothing else", () => {
    const idea = inventedIdea();
    const kept = keepWhatIf(idea, 45_000);
    expect(kept.profile.targetRevenueY1).toBe(45_000);
    expect({ ...kept, profile: { ...kept.profile, targetRevenueY1: idea.profile.targetRevenueY1 } }).toEqual(idea);
  });

  it("relights the rules for the run and never moves a money sum", () => {
    const base = input({ agreed: { incomeWantedCents: null, savingsCents: 500_000, costLines: [] } });
    const tried = { ...base, whatIf: { firstYearSalesDollars: 45_000 } };
    expect(evaluateRoad(tried).gauges.money).toEqual(evaluateRoad(base).gauges.money);
    expect(answerReceipt(base, tried).join(" ")).toContain("you tried first-year sales of $45,000 (your what-if, not a forecast)");
  });
});

describe("Compare the two endings", () => {
  const empty = input();
  const view = compareEndings(empty, FORK)!;

  it("one column per side, in the fork's own order, with the same rows in each", () => {
    expect(view.sides.map((s) => s.stepId)).toEqual([EMPLOYED, OWN]);
    expect(view.rows.map((r) => r.id)).toEqual([
      "steps-on-path",
      "not-done",
      "not-on-path",
      "skills",
      "legal",
      "fees",
      "yours",
      "not-priced",
      "only-if",
      "cards",
    ]);
    for (const r of view.rows) expect(r.values, r.id).toHaveLength(2);
    expect(view.picked).toBeNull();
  });

  it("counts and sums only, from road evaluation with that side picked", () => {
    const byId = (id: string) => view.rows.find((r) => r.id === id)!.values;
    // Stay employed: train, ticket, stay employed, keep working, keep the books.
    // Own shop: train, ticket, own shop, open the doors, keep the books.
    expect(byId("steps-on-path")).toEqual(["5", "5"]);
    expect(byId("not-on-path")).toEqual(["2", "2"]);
    expect(byId("fees")).toEqual(["$1,800 (2 lines)", "$1,860 (3 lines)"]);
    expect(byId("not-priced")).toEqual(["2 lines", "5 lines"]);
    expect(byId("yours")).toEqual(["not given yet", "not given yet"]);
    expect(byId("skills")).toEqual(["0 have · 0 learning · 0 not yet · 4 not marked", "0 have · 0 learning · 0 not yet · 5 not marked"]);
    expect(byId("legal")).toEqual(["1", "1"]);
  });

  it("no score, no total, no verdict anywhere in it", () => {
    expect(Object.keys(view).sort()).toEqual(["forkId", "forkLabel", "picked", "rows", "sides"]);
    for (const r of view.rows) expect(`${r.label} ${r.values.join(" ")}`, r.id).not.toMatch(VERDICT);
  });

  it("says whose pick stands: the person's, or on today's road the map's default", () => {
    const picked = compareEndings(input({ forkPicks: { [FORK]: { stepId: OWN, from: "you" } } }), FORK)!;
    expect(picked.picked).toEqual({ stepId: OWN, byPerson: true });
    const road0 = input({ road: generalRoadV2026, roadChosen: false, skillItems: [], forkPicks: { gstTiming: { stepId: defaultActiveBranches.gstTiming, from: "map" } } });
    expect(compareEndings(road0, "gstTiming")!.picked).toEqual({ stepId: defaultActiveBranches.gstTiming, byPerson: false });
    expect(compareEndings(road0, "fork-nobody-wrote")).toBeNull();
  });

  it("never changes the input it compares", () => {
    const before = JSON.stringify(empty);
    compareEndings(empty, FORK);
    expect(JSON.stringify(empty)).toBe(before);
  });
});

describe("the new components", () => {
  const noop = () => undefined;

  it("Compare draws both columns the same: only the pressed This is mine differs", () => {
    const view = compareEndings(input({ forkPicks: { [FORK]: { stepId: OWN, from: "you" } } }), FORK)!;
    const html = renderToStaticMarkup(
      createElement(CompareEndings, {
        view,
        forks: [{ id: FORK, label: "Ending (test only)" }],
        canSave: true,
        error: null,
        receipt: null,
        onPickFork: noop,
        onThisIsMine: noop,
        onClose: noop,
      }),
    );
    expect(html).toContain("Compare the two endings");
    expect(html).toContain("In the order the road shows them.");
    const cells = [...html.matchAll(/<td class="([^"]*)"/g)].map((m) => m[1]);
    expect(new Set(cells).size).toBe(1);
    const heads = [...html.matchAll(/<th scope="col" class="([^"]*)"/g)].map((m) => m[1]);
    expect(heads).toHaveLength(2);
    expect(new Set(heads).size).toBe(1);
    const mine = [...html.matchAll(/<button[^>]*aria-pressed="(true|false)"[^>]*>This is mine<\/button>/g)].map((m) => m[1]);
    expect(mine).toEqual(["false", "true"]);
    expect(html).not.toMatch(VERDICT);
  });

  it("the told list shows each row with its day and buttons, and the questions with I don't know", () => {
    const full = toldEverything();
    const html = renderToStaticMarkup(
      createElement(ToldList, {
        rows: toldRows(full, evaluateRoad(full), kept()),
        notTold: notToldYet(input(), evaluateRoad(input())),
        receipt: null,
        canSave: true,
        error: null,
        onChange: noop,
        onTakeBack: noop,
        onAnswer: noop,
        boxFor: () => null,
      }),
    );
    expect(html).toContain("What you&#x27;ve told DotAmi");
    expect(html).toContain("You told us your date is May 2029");
    expect(html).toContain("day not kept");
    expect(html).toContain("Not told yet");
    expect(html).toContain("In the order DotAmi asks them, not importance.");
    expect(html).toContain("I don&#x27;t know");
    // At most five questions show; the rest wait behind "n more".
    expect((html.match(/→ unlocks/g) ?? []).length).toBe(5);
    expect(html).toContain("2 more");
  });

  it("the what-if bar says, while on, that it is a what-if and not a forecast", () => {
    const on = renderToStaticMarkup(createElement(WhatIfBar, { whatIf: 45_000, receipt: ["Because you tried …"], sinceLastTime: [], onTry: noop, onKeep: noop, onClear: noop }));
    expect(on).toContain("Your what-if, not a forecast");
    expect(on).toContain(">Keep<");
    expect(on).toContain(">Clear<");
    const off = renderToStaticMarkup(createElement(WhatIfBar, { whatIf: null, receipt: null, sinceLastTime: ["A line."], onTry: noop, onKeep: noop, onClear: noop }));
    expect(off).not.toContain("Your what-if, not a forecast");
    expect(off).toContain("Try first-year sales of $");
    expect(off).toContain("Since last time");
  });

  it("a receipt is a status line, and an empty one says nothing on the road changed", () => {
    const html = renderToStaticMarkup(createElement(ReceiptLines, { lines: [] }));
    expect(html).toContain('role="status"');
    expect(html).toContain("Saved. Nothing on the road changed.");
  });

  it("the new components hold no sentence of their own: words come from lib/cockpit/words.ts", () => {
    for (const file of ["told-list.tsx", "compare-endings.tsx", "what-if-bar.tsx", "receipt-lines.tsx"]) {
      const source = readFileSync(path.join(process.cwd(), "components", "cockpit", file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/className=(\{`[^`]*`\}|"[^"]*")/g, "");
      const jsxText = [...source.matchAll(/>\s*([A-Z][a-z]+(?: [a-z’'A-Z]+){3,}[.:]?)\s*</g)].map((m) => m[1]);
      expect(jsxText, file).toEqual([]);
    }
  });

  it("every new sentence is free of verdict words", () => {
    const sentences: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === "string") sentences.push(value);
      else if (typeof value === "function") {
        for (const args of [[0, 0, 0, 0], [1, 1, 1, 1], [3, 2, 1, 9], ["“Label”", 150_000, "2029-05", 31]]) {
          try {
            const out = (value as (...a: unknown[]) => unknown)(...args);
            if (typeof out === "string") sentences.push(out);
          } catch {
            // filled by the next set
          }
        }
      } else if (value && typeof value === "object") for (const v of Object.values(value)) walk(v);
    };
    walk({ told: cockpitWords.told, notTold: cockpitWords.notTold, questions: cockpitWords.questions, receipts: cockpitWords.receipts, whatIf: cockpitWords.whatIf, compare: cockpitWords.compare });
    expect(sentences.length).toBeGreaterThan(40);
    expect(sentences.filter((s) => VERDICT.test(s))).toEqual([]);
  });
});

/** The day an ISO moment fell on, on this computer, as the screen shows it. */
function dayOf(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// The skill items used above come from the invented road's own list.
void skillItems;
