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
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CompareEndings } from "@/components/cockpit/compare-endings";
import { ReceiptLines } from "@/components/cockpit/receipt-lines";
import { ToldList } from "@/components/cockpit/told-list";
import { WhatIfBar } from "@/components/cockpit/what-if-bar";
import {
  answerEquipment,
  answerReceipt,
  answerSalesYear3,
  compareEndings,
  forksToCompare,
  keepWhatIf,
  notToldYet,
  parseWhatIf,
  readWholeDollars,
  toldRows,
  type KeptAnswers,
} from "@/lib/cockpit/told";
import { profileRows } from "@/lib/cockpit/profile-rows";
import { cockpitWords } from "@/lib/cockpit/words";
import { parseScenarioInput } from "@/lib/db/parse-scenario-input";
import { SALES_DOLLARS_MAX } from "@/lib/db/scenario-state-json";
import { cfeCatalogV2026, type CFENodeId } from "@/lib/engines/cfe/v2026";
import { generalRoadV2026, roadApprenticeToOwnShopAB, skillItemsV2026 } from "@/lib/engines/roads/v2026";
import type { FigureView } from "@/lib/figures/types";
import { scenarioForPickedFuture } from "@/lib/front-door/start-future";
import { buildPlaybookSkeleton } from "@/lib/playbook/build-skeleton";
import { renderPlaybookMarkdown } from "@/lib/playbook/render-markdown";
import { evaluateRoad, roadReceipt, withoutAnswer, withoutIdeaAnswer, type RoadEvaluationInput } from "@/lib/roads";
import { clearScenarioBranch, defaultActiveBranches, setIncorporateAt, updateScenarioBranch, type BranchDecisionId } from "@/lib/scenarios/branches";
import { isBranchDecided } from "@/lib/scenarios/graph";
import { cleanNotSaid, LEGACY_SALES_TARGETS } from "@/lib/scenarios/not-said";
import type { Scenario } from "@/lib/scenarios/types";

import { input, inventedIdea, roadWithRuledFork, RULED_FORK, skillItems, TODAY } from "./helpers/road-to-evaluate";
import { VERDICT_WORDS as VERDICT } from "./helpers/verdict-words";

const INCORPORATING = "stage-3a-incorporation-80k-net" satisfies CFENodeId;
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

// The Incorporating fix (docs/ui-spec/cockpit/incorporating-estimate.md; the maintainer's "fix both",
// 2026-10-20). A future picked on Pick a future keeps no third-year sales estimate and nothing in the cockpit
// asked for one, so Incorporating, which compares that estimate with the person's own "I'd incorporate at",
// could never light there.
describe("a future picked on Pick a future: the third-year sales estimate, so Incorporating can light", () => {
  const picked = () => scenarioForPickedFuture({ road: generalRoadV2026, place: "CA-AB", name: "" }, "picked-estimate");
  const on = (scenario: Scenario) => input({ road: generalRoadV2026, roadChosen: true, skillItems: [], scenario });
  const asked = (i: RoadEvaluationInput) => notToldYet(i, evaluateRoad(i)).map((r) => r.id);
  const incorporating = (i: RoadEvaluationInput) => evaluateRoad(i).steps.find((s) => s.stepId === INCORPORATING)!.state;

  it("“Not told yet” asks for the estimate, in its own words, just before “I'd incorporate at” would be", () => {
    const fresh = on(picked());
    const ids = asked(fresh);
    expect(ids).toContain("sales-year-3");
    // Not asked yet: without an estimate no "I'd incorporate at" changes anything.
    expect(ids).not.toContain("incorporate-at");
    expect(ids.indexOf("sales-year-3")).toBeGreaterThan(ids.indexOf("equipment"));
    const row = notToldYet(fresh, evaluateRoad(fresh)).find((r) => r.id === "sales-year-3");
    expect(row).toMatchObject({
      answer: "box",
      question: "Your third-year sales estimate",
      unlocks: "“Incorporating” able to light, once you also give the yearly sales at which you'd incorporate",
    });
  });

  it("answered, only the third-year target comes off the not-said list, “I'd incorporate at” is asked next, and with both the step lights", () => {
    const fresh = on(picked());
    const estimated = on(answerSalesYear3(fresh.scenario, 120_000));
    expect(estimated.scenario.profile.targetRevenueY3).toBe(120_000);
    expect(estimated.scenario.profile.notSaid).toEqual(["venture-type", "equipment", "sales-target-year-1"]);
    // On its own it changes nothing on the road (the box then says so), and opens the question it is compared with.
    expect(answerReceipt(fresh, estimated)).toEqual([]);
    expect(asked(estimated)).not.toContain("sales-year-3");
    expect(asked(estimated)).toContain("incorporate-at");
    expect(incorporating(estimated)).toBe("check-first");
    const both = on(setIncorporateAt(estimated.scenario, 100_000));
    expect(incorporating(both)).toBe("applies");
    expect(asked(both)).not.toContain("incorporate-at");
    expect(answerReceipt(estimated, both).join(" ")).toMatch(/you told us you'd incorporate at \$100,000 of yearly sales/);
    // The other way round (the panel's "I'd incorporate at" box takes a number at any time): the estimate
    // is still asked, and its receipt names it.
    const ownFirst = on(setIncorporateAt(fresh.scenario, 100_000));
    expect(asked(ownFirst)).toContain("sales-year-3");
    const lit = on(answerSalesYear3(ownFirst.scenario, 120_000));
    expect(incorporating(lit)).toBe("applies");
    expect(answerReceipt(ownFirst, lit).join(" ")).toMatch(/you told us third-year sales of \$120,000/);
  });

  it("the save keeps the estimate, and the first-year target stays not said", () => {
    const sent = JSON.parse(JSON.stringify({ scenario: answerSalesYear3(picked(), 120_000) }));
    const saved = parseScenarioInput(sent)!;
    expect(saved.profile.targetRevenueY3).toBe(120_000);
    expect(saved.profile.notSaid).toEqual(["venture-type", "equipment", "sales-target-year-1"]);
    expect(asked(on(saved))).not.toContain("sales-year-3");
  });

  it("taken back, the future is exactly as it was when picked: not said again, asked again, and “I'd incorporate at” goes", () => {
    const answered = answerSalesYear3(picked(), 120_000);
    const back = withoutIdeaAnswer(answered, "idea:sales-year-3")!;
    expect(back).toEqual(picked());
    // With the person's own "I'd incorporate at" kept: only the estimate goes, and its question comes back.
    const withOwn = setIncorporateAt(answered, 100_000);
    const backOwn = withoutIdeaAnswer(withOwn, "idea:sales-year-3")!;
    expect(backOwn.profile).toEqual(picked().profile);
    expect(backOwn.state.incorporateAt).toBe(100_000);
    expect(asked(on(backOwn))).toContain("sales-year-3");
    expect(asked(on(withoutIdeaAnswer(answered, "idea:sales-year-3")!))).not.toContain("incorporate-at");
    // The told row's "what it unlocked" is the same change read the other way.
    expect(withoutAnswer(on(answered), "idea:sales-year-3")!.scenario).toEqual(back);
  });

  it("the rail and the plan show the estimate once given, the first year still not said, and Not said again after Take back", () => {
    const answered = answerSalesYear3(picked(), 120_000);
    expect(profileRows(answered.profile).slice(2)).toEqual([
      { label: "Target Y1", value: "Not said" },
      { label: "Target Y3", value: "$120,000" },
    ]);
    const md = renderPlaybookMarkdown(buildPlaybookSkeleton(cfeCatalogV2026.nodes, answered));
    expect(md).toContain("- **Target revenue Y1 (CAD):** not said");
    expect(md).toContain("- **Target revenue Y3 (CAD):** 120,000");
    expect(profileRows(withoutIdeaAnswer(answered, "idea:sales-year-3")!.profile).slice(2).map((r) => r.value)).toEqual(["Not said", "Not said"]);
  });

  it("isn't asked where it can change nothing: Incorporation timing on the other side, a road without Incorporating, an idea with an estimate", () => {
    const otherSide = on(updateScenarioBranch(picked(), "incorporationTiming", "stage-3b-incorporation-liability-sred"));
    expect(asked(otherSide)).not.toContain("sales-year-3");
    const apprentice = scenarioForPickedFuture({ road: roadApprenticeToOwnShopAB, place: "CA-AB", name: "" }, "picked-apprentice");
    const onApprentice = input({ road: roadApprenticeToOwnShopAB, roadChosen: true, skillItems: [], scenario: apprentice });
    expect(asked(onApprentice)).not.toContain("sales-year-3");
    const intake = input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario: inventedIdea({ targetRevenueY3: 90_000 }) });
    expect(asked(intake)).not.toContain("sales-year-3");
    expect(asked(intake)).toContain("incorporate-at");
  });

  // The review of PR #198: the spec's part 1 asks wherever the idea has no estimate ("0, or on the not-said
  // list"), so an idea from the intake whose Year 3 box was left blank is asked too, and Change on a given
  // estimate opens the cockpit's own box (the same field the intake's Year 3 box sets), not the intake.
  it("on an idea from the intake: a blank Year 3 is asked here too, and Change on a given estimate opens this box", () => {
    const intake = (y3: number) => input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario: inventedIdea({ targetRevenueY3: y3 }) });
    const blank = intake(0);
    expect(asked(blank)).toContain("sales-year-3");
    expect(asked(blank)).not.toContain("incorporate-at");
    const given = intake(90_000);
    const rows = toldRows(given, evaluateRoad(given), kept());
    expect(rows.find((r) => r.id === "idea:sales-year-3")!.change).toEqual({ kind: "box", question: "sales-year-3" });
    // The first-year number still goes back to the intake: the cockpit has no box for it, only Keep.
    expect(rows.find((r) => r.id === "idea:sales-year-1")!.change).toEqual({ kind: "intake" });
  });

  // The review of PR #198: the box took any digits, but the save refuses a sales number above
  // $1,000,000,000 (lib/db/parse-scenario-input.ts), so a bigger estimate stayed on screen and every later
  // save of the idea failed until the number was changed.
  it("a number the save would refuse is refused in the box, with words that say why; the most the save keeps is taken", () => {
    const { wholeDollars, tooLarge } = cockpitWords.questions.box;
    expect(readWholeDollars("45000")).toEqual({ dollars: 45_000 });
    expect(readWholeDollars(" $1,000,000,000 ")).toEqual({ dollars: SALES_DOLLARS_MAX });
    for (const big of ["1000000001", "2,000,000,000", "99999999999999999999"]) expect(readWholeDollars(big), big).toEqual({ problem: tooLarge });
    for (const bad of ["", "abc", "-5", "45000.50"]) expect(readWholeDollars(bad), bad).toEqual({ problem: wholeDollars });
    expect(tooLarge).toContain("$1,000,000,000");
    // What the box takes, the save takes; one dollar more, the save refuses.
    const save = (dollars: number) => parseScenarioInput(JSON.parse(JSON.stringify({ scenario: answerSalesYear3(picked(), dollars) })));
    expect(save(SALES_DOLLARS_MAX)).not.toBeNull();
    expect(save(SALES_DOLLARS_MAX + 1)).toBeNull();
  });

  it("a future saved before the split, with one id for both targets, reads both years as not said", () => {
    // The list Pick a future saved until 2026-10-21, as the data file still holds it for those futures.
    const before = ["venture-type", "equipment", LEGACY_SALES_TARGETS];
    const both = ["venture-type", "equipment", "sales-target-year-1", "sales-target-year-3"];
    expect(cleanNotSaid(before)).toEqual(both);
    const old = parseScenarioInput(JSON.parse(JSON.stringify({ scenario: { ...picked(), profile: { ...picked().profile, notSaid: before } } })))!;
    expect(old.profile.notSaid).toEqual(both);
    expect(profileRows(old.profile).slice(2).map((r) => r.value)).toEqual(["Not said", "Not said"]);
    expect(asked(on(old))).toContain("sales-year-3");
    // Read as it is, without a save in between: still both years, and Keep takes off only the first.
    const raw = { ...picked().profile, notSaid: before } as unknown as Scenario["profile"];
    expect(profileRows(raw).slice(2).map((r) => r.value)).toEqual(["Not said", "Not said"]);
    expect(keepWhatIf({ ...picked(), profile: raw }, 45_000).profile.notSaid).toEqual(["venture-type", "equipment", "sales-target-year-3"]);
  });
});

// The what-if Keep bug (docs/ui-spec/cockpit/incorporating-estimate.md, the maintainer's call 6, 2026-10-21):
// on a picked future, Keep set the first-year sales the road reads, but left them on the not-said list, so
// the rail and the plan still said "Not said" for the number the road was reading.
describe("a future picked on Pick a future: Keep on the what-if", () => {
  const picked = () => scenarioForPickedFuture({ road: generalRoadV2026, place: "CA-AB", name: "" }, "picked-keep");
  const on = (scenario: Scenario) => input({ road: generalRoadV2026, roadChosen: true, skillItems: [], scenario });

  it("makes the what-if the idea's own first-year sales and marks them said; the third year stays not said", () => {
    const kept = keepWhatIf(picked(), 45_000);
    expect(kept.profile.targetRevenueY1).toBe(45_000);
    // The rail and the plan show the number the road reads.
    expect(profileRows(kept.profile).slice(2)).toEqual([
      { label: "Target Y1", value: "$45,000" },
      { label: "Target Y3", value: "Not said" },
    ]);
    expect(kept.profile.notSaid).toEqual(["venture-type", "equipment", "sales-target-year-3"]);
    const md = renderPlaybookMarkdown(buildPlaybookSkeleton(cfeCatalogV2026.nodes, kept));
    expect(md).toContain("- **Target revenue Y1 (CAD):** 45,000");
    expect(md).toContain("- **Target revenue Y3 (CAD):** not said");
    expect(evaluateRoad(on(kept)).answers.find((a) => a.id === "idea:sales-year-1")).toMatchObject({
      given: true,
      said: "you told us first-year sales of $45,000",
    });
    // The save keeps both.
    const saved = parseScenarioInput(JSON.parse(JSON.stringify({ scenario: kept })))!;
    expect(saved.profile.notSaid).toEqual(["venture-type", "equipment", "sales-target-year-3"]);
  });

  it("taken back, the first-year sales are not said again, as the future was picked", () => {
    const kept = keepWhatIf(picked(), 45_000);
    expect(withoutIdeaAnswer(kept, "idea:sales-year-1")!).toEqual(picked());
    expect(profileRows(withoutIdeaAnswer(kept, "idea:sales-year-1")!.profile).slice(2).map((r) => r.value)).toEqual(["Not said", "Not said"]);
  });
});

// The idea harness's bug of 2026-10-17 (the maintainer's "Yes, fix both", 2026-10-20): on a future picked on
// Pick a future, equipment is saved as not said. The box's answer set the field but left equipment on the
// not-said list, so road evaluation still read it as unanswered, "Not told yet" kept asking, and the save
// dropped it.
describe("a future picked on Pick a future: the equipment answer", () => {
  const picked = () => scenarioForPickedFuture({ road: generalRoadV2026, place: "CA-AB", name: "" }, "picked-equipment");
  const on = (scenario: Scenario) => input({ road: generalRoadV2026, roadChosen: true, skillItems: [], scenario });
  const asked = (i: RoadEvaluationInput) => notToldYet(i, evaluateRoad(i)).map((r) => r.id);
  const equipmentAnswer = (i: RoadEvaluationInput) => evaluateRoad(i).answers.find((a) => a.id === "idea:equipment")!;

  it("answered in the box, it is the person's: off “Not told yet”, on the told list, and the receipt names it", () => {
    const before = on(picked());
    expect(asked(before)).toContain("equipment");
    expect(equipmentAnswer(before).given).toBe(false);
    for (const yes of [true, false]) {
      const after = on(answerEquipment(before.scenario, yes));
      expect(after.scenario.profile.capitalPurchasePlanned).toBe(yes);
      // Only equipment comes off: the kind of venture and the sales targets were still never asked.
      expect(after.scenario.profile.notSaid).toEqual(["venture-type", "sales-target-year-1", "sales-target-year-3"]);
      expect(asked(after), String(yes)).not.toContain("equipment");
      expect(equipmentAnswer(after)).toMatchObject({
        given: true,
        said: yes ? "you told us you're buying equipment, a vehicle or tools" : "you told us you're not buying equipment, a vehicle or tools",
      });
      expect(toldRows(after, evaluateRoad(after), kept()).map((r) => r.id)).toContain("idea:equipment");
    }
    // A yes changes the rules on road 0, so its receipt says what it changed, in the person's own answer.
    const yes = on(answerEquipment(before.scenario, true));
    expect(answerReceipt(before, yes).join(" ")).toMatch(/you told us you're buying equipment, a vehicle or tools/);
  });

  it("the save keeps the answer, and nothing else the person didn't say", () => {
    for (const yes of [true, false]) {
      const sent = JSON.parse(JSON.stringify({ scenario: answerEquipment(picked(), yes) }));
      const saved = parseScenarioInput(sent)!;
      expect(saved.profile.capitalPurchasePlanned, String(yes)).toBe(yes);
      expect(saved.profile.notSaid, String(yes)).toEqual(["venture-type", "sales-target-year-1", "sales-target-year-3"]);
      expect(asked(on(saved)), String(yes)).not.toContain("equipment");
    }
  });

  it("taken back, it is not said again, as the future was picked, and the question is back", () => {
    const answered = answerEquipment(picked(), true);
    const back = withoutIdeaAnswer(answered, "idea:equipment")!;
    expect(back.profile).toEqual(picked().profile);
    expect(asked(on(back))).toContain("equipment");
    // The told row's "what it unlocked" is the same change read the other way.
    expect(withoutAnswer(on(answered), "idea:equipment")!.scenario).toEqual(back);
  });

  it("on an idea from the intake, which asks every question, it adds no not-said list and changes an answer given", () => {
    const intake = inventedIdea();
    expect(intake.profile.notSaid).toBeUndefined();
    const yes = answerEquipment(intake, true);
    expect(yes.profile).toEqual({ ...intake.profile, capitalPurchasePlanned: true });
    expect(answerEquipment(yes, false).profile.capitalPurchasePlanned).toBe(false);
    // Taken back there, it is unanswered: no list is made up for an idea that never had one.
    expect(withoutIdeaAnswer(yes, "idea:equipment")!.profile).toEqual(intake.profile);
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
    // A status: the day of its last change. Ticks keep no day of their own, and the step's last change
    // isn't the tick's, so none is borrowed (2026-10-12, after review).
    expect(row("step:step-eval-train").day).toBe(dayOf("2026-10-03T15:00:00.000Z"));
    expect(row("ticks:step-eval-train").day).toBeNull();
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
    // The gauge's own count: with no ending picked, only the textbooks line is counted; the rest wait on the fork.
    expect(rows.find((r) => r.id === "cost-lines")!.question).toBe("Your numbers for 1 cost line not priced yet");
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
    // A third-year sales estimate on the intake: the number "I'd incorporate at" is compared with.
    const road0 = input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario: inventedIdea({ targetRevenueY3: 90_000 }) });
    const ids = notToldYet(road0, evaluateRoad(road0)).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["map-pick:gstTiming", "map-pick:incorporationTiming", "structure", "equipment", "incorporate-at"]));
    expect(ids.some((id) => id.startsWith("ending:"))).toBe(false);
    const decided = { ...road0, scenario: updateScenarioBranch(road0.scenario, "gstTiming", "stage-2a-voluntary-gst-registration") };
    expect(notToldYet(decided, evaluateRoad(decided)).map((r) => r.id)).not.toContain("map-pick:gstTiming");
    // The map's picks are asked only on today's road, where the map draws them.
    const other = input();
    expect(notToldYet(other, evaluateRoad(other)).map((r) => r.id).some((id) => id.startsWith("map-pick:"))).toBe(false);
  });

  // The idea harness's finding (2026-10-17): the rule compares "I'd incorporate at" with the third-year
  // sales estimate only, so without one no answer could light Incorporating, though the row said it would.
  it("asks “I'd incorporate at” only once there is a third-year sales estimate to compare it with, and says what it is compared with", () => {
    const onRoad0 = (y3: number) => input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario: inventedIdea({ targetRevenueY3: y3 }) });
    const blank = onRoad0(0);
    expect(notToldYet(blank, evaluateRoad(blank)).map((r) => r.id)).not.toContain("incorporate-at");
    // Why: with the box blank, every answer leaves the road as it was.
    for (const dollars of [1, 30_000, 80_000]) {
      expect(answerReceipt(blank, { ...blank, scenario: setIncorporateAt(blank.scenario, dollars) }), String(dollars)).toEqual([]);
    }

    const given = onRoad0(90_000);
    const row = notToldYet(given, evaluateRoad(given)).find((r) => r.id === "incorporate-at");
    expect(row).toMatchObject({ answer: "box", question: "The yearly sales at which you'd incorporate" });
    expect(row!.unlocks).toBe("“Incorporating” lighting once your third-year sales estimate reaches your own number");
    expect(cockpitWords.questions.incorporateAt.why).toContain("third-year sales estimate");
    // With the estimate, an answer it reaches lights the step: the receipt says so.
    expect(answerReceipt(given, { ...given, scenario: setIncorporateAt(given.scenario, 90_000) })).not.toEqual([]);
  });

  // The second review of PR #182 (2026-10-17): a future picked on road 0 keeps no third-year estimate and
  // nothing in the cockpit asks for one, so the row going away hid the dead end rather than fixing it. The
  // step's own words (its card and its panel's "Your answers") now say the light needs that estimate too,
  // instead of inviting a number no answer could make count. Since 2026-10-21 the cockpit asks for the
  // estimate ("a future picked on Pick a future: the third-year sales estimate", above); until it is given
  // the step still says what is missing, which this pins.
  it("on a future picked on road 0, Incorporating says it needs a third-year estimate the idea doesn't have", () => {
    const picked = scenarioForPickedFuture({ road: generalRoadV2026, place: "CA-AB", name: "" }, "picked-road-0");
    expect(picked.profile.targetRevenueY3).toBe(0);
    const road0 = input({ road: generalRoadV2026, roadChosen: true, skillItems: [], scenario: picked });
    const evaluation = evaluateRoad(road0);
    expect(notToldYet(road0, evaluation).map((r) => r.id)).not.toContain("incorporate-at");
    const reason = evaluation.rules.nodeReasons[INCORPORATING]!;
    expect(reason).not.toMatch(/set your own number to see this light/i);
    expect(reason).toMatch(/third-year revenue estimate reaches a number of your own/);
    expect(reason).toMatch(/no third-year revenue estimate on this idea/);
    // The panel's box still keeps a number (it is the person's), and the step then says what is missing.
    const answered = { ...road0, scenario: setIncorporateAt(road0.scenario, 50_000) };
    expect(answerReceipt(road0, answered)).toEqual([]);
    expect(evaluateRoad(answered).rules.nodeReasons[INCORPORATING]).toBe(
      "Check first: there's no third-year revenue estimate on this idea to compare with your own number ($50,000).",
    );
  });

  // The review of PR #182 (2026-10-17): the rule also reads Incorporation timing. With Liability / SR&ED
  // picked, "Incorporating" is off the path whatever the number, so no answer can change anything.
  it("doesn't ask “I'd incorporate at” when Incorporation timing is on the other side", () => {
    const base = input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario: inventedIdea({ targetRevenueY3: 90_000 }) });
    const otherSide = { ...base, scenario: updateScenarioBranch(base.scenario, "incorporationTiming", "stage-3b-incorporation-liability-sred") };
    expect(notToldYet(otherSide, evaluateRoad(otherSide)).map((r) => r.id)).not.toContain("incorporate-at");
    // Why: every answer leaves the road as it was.
    for (const dollars of [1, 50_000, 90_000, 500_000]) {
      expect(answerReceipt(otherSide, { ...otherSide, scenario: setIncorporateAt(otherSide.scenario, dollars) }), String(dollars)).toEqual([]);
    }
    // Picked back, the question is back.
    const back = { ...otherSide, scenario: updateScenarioBranch(otherSide.scenario, "incorporationTiming", "stage-3a-incorporation-80k-net") };
    expect(notToldYet(back, evaluateRoad(back)).map((r) => r.id)).toContain("incorporate-at");
  });

  // The idea harness's finding (2026-10-17): ride-share and taxi drivers register for GST/HST from the first
  // paid ride, so the rules colour both GST timing sides the same and neither pick changes anything.
  it("doesn't ask a map pick no rule reads for the idea: GST timing for ride-share and taxi driving", () => {
    const driver = input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario: inventedIdea({ activityTags: ["Ride-share or taxi driving"] }) });
    const ids = notToldYet(driver, evaluateRoad(driver)).map((r) => r.id);
    expect(ids).not.toContain("map-pick:gstTiming");
    // The other pick still changes the road, so it is still asked.
    expect(ids).toContain("map-pick:incorporationTiming");
    for (const side of ["stage-2a-voluntary-gst-registration", "stage-2b-mandatory-gst-registration"] as const) {
      expect(answerReceipt(driver, { ...driver, scenario: updateScenarioBranch(driver.scenario, "gstTiming", side) }), side).toEqual([]);
    }
    // The control: the same idea with a trade instead is asked.
    const trade = input({ road: generalRoadV2026, roadChosen: false, skillItems: [] });
    expect(notToldYet(trade, evaluateRoad(trade)).map((r) => r.id)).toContain("map-pick:gstTiming");
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
    // Keep saves it as the first-year sales, so a number the save would refuse isn't a what-if either.
    expect(parseWhatIf("1,000,000,000")).toBe(SALES_DOLLARS_MAX);
    expect(parseWhatIf("2000000000")).toBeNull();
    const save = (dollars: number) => parseScenarioInput(JSON.parse(JSON.stringify({ scenario: keepWhatIf(inventedIdea(), dollars) })));
    expect(save(SALES_DOLLARS_MAX)).not.toBeNull();
    expect(save(SALES_DOLLARS_MAX + 1)).toBeNull();
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
    // `sameOnEveryRow` (2026-10-12) says whether the rows differ at all, never which side is better.
    expect(Object.keys(view).sort()).toEqual(["forkId", "forkLabel", "picked", "rows", "sameOnEveryRow", "sides"]);
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

describe("where Compare is offered (the maintainer's answer of 2026-10-13)", () => {
  // Compare is offered only at a fork whose own pick, not the rules, decides steps. Worked out from road
  // evaluation of the road's own steps, never from a list of road ids.
  const road0 = (change: Partial<RoadEvaluationInput> = {}) =>
    input({ road: generalRoadV2026, roadChosen: false, skillItems: skillItemsV2026, ...change });
  const road1 = (change: Partial<RoadEvaluationInput> = {}) =>
    input({ road: roadApprenticeToOwnShopAB, roadChosen: true, skillItems: skillItemsV2026, ...change });
  const ids = (i: RoadEvaluationInput) => forksToCompare(i).map((f) => f.id);

  it("not on today's Alberta road: there the tax rules, not the fork's own pick, colour the sides", () => {
    expect(generalRoadV2026.forks.length).toBeGreaterThan(0);
    expect(ids(road0())).toEqual([]);
    // Flipping a toggle does move steps there (between check first and not on your path), but through
    // the rules, so both columns' step and money counts come out the same. The one exception: the
    // mandatory GST/HST registration step lists the GST/HST legal requirement and the voluntary one
    // lists nothing, so gstTiming's two skills rows differ (that is what each step lists, not the pick).
    const differsOn: Record<string, string[]> = { gstTiming: ["skills", "legal"], incorporationTiming: [] };
    for (const fork of generalRoadV2026.forks) {
      const runs = fork.sides.map((side) =>
        evaluateRoad(road0({ scenario: updateScenarioBranch(inventedIdea(), fork.id as BranchDecisionId, side as CFENodeId) })).steps,
      );
      const moved = runs[0]!.filter((step, i) => step.state !== runs[1]![i]!.state);
      expect(moved.length, fork.id).toBeGreaterThan(0);
      expect(moved.every((step) => step.reason.kind === "rules"), fork.id).toBe(true);
      const view = compareEndings(road0(), fork.id)!;
      expect(view.rows.filter((r) => r.values[0] !== r.values[1]).map((r) => r.id), fork.id).toEqual(differsOn[fork.id]);
    }
    // Over the GST line, with the other sides picked, or with a what-if: still none.
    expect(ids(road0({ scenario: inventedIdea({ targetRevenueY1: 90_000, targetRevenueY3: 200_000 }) }))).toEqual([]);
    const [gst, inc] = generalRoadV2026.forks;
    const flipped = updateScenarioBranch(
      updateScenarioBranch(inventedIdea(), "gstTiming", gst!.sides[0] as CFENodeId),
      "incorporationTiming",
      inc!.sides[1] as CFENodeId,
    );
    expect(ids(road0({ scenario: flipped, whatIf: { firstYearSalesDollars: 45_000 } }))).toEqual([]);
  });

  it("on the apprentice road: its fork puts one ending's steps on the path and the other's off it", () => {
    expect(ids(road1())).toEqual([roadApprenticeToOwnShopAB.forks[0]!.id]);
    expect(ids(input())).toEqual([FORK]);
  });

  // A road that isn't road 0, with a fork whose two sides the rules grey whichever is picked. A check of
  // road ids would offer it; only reading the steps leaves it out.
  const ruled = (change: Partial<RoadEvaluationInput> = {}) => input({ road: roadWithRuledFork(), roadChosen: true, skillItems: [], ...change });

  it("not on another road where the rules, not the pick, decide both sides", () => {
    const states = (i: RoadEvaluationInput) => evaluateRoad(i).steps.map((s) => `${s.stepId} ${s.state}`);
    const [a, b] = roadWithRuledFork().forks[0]!.sides;
    // Each side picked in turn: every step keeps its state.
    expect(states(ruled({ forkPicks: { [RULED_FORK]: { stepId: a!, from: "you" } } }))).toEqual(
      states(ruled({ forkPicks: { [RULED_FORK]: { stepId: b!, from: "you" } } })),
    );
    expect(ids(ruled())).toEqual([]);
    // The same road with first-year sales the rules read differently: now the pick decides a step.
    expect(ids(ruled({ scenario: inventedIdea({ targetRevenueY1: 45_000 }) }))).toEqual([RULED_FORK]);
  });

  it("a what-if doesn't bring the offer: it is worked out from the person's own answers", () => {
    expect(ids(ruled({ whatIf: { firstYearSalesDollars: 45_000 } }))).toEqual([]);
  });

  it("whatever the person picked or marked: the offer is the road's, not the person's", () => {
    const fork = roadApprenticeToOwnShopAB.forks[0]!;
    expect(ids(road1({ forkPicks: { [fork.id]: { stepId: fork.sides[1], from: "you" } } }))).toEqual([fork.id]);
    // Both endings marked not for me: the fork still decides the steps after them.
    const neither = road1({ progress: fork.sides.map((stepId) => ({ stepId, status: "not-for-me" as const, doneWhenIds: [] })) });
    expect(ids(neither)).toEqual([fork.id]);
    // Every step marked not for me greys them all alike on both sides; the offer still doesn't go away.
    const all = road1({
      progress: roadApprenticeToOwnShopAB.steps.map((s) => ({ stepId: s.id, status: "not-for-me" as const, doneWhenIds: [] })),
    });
    expect(ids(all)).toEqual([fork.id]);
  });

  it("never changes the input it reads", () => {
    const i = road1();
    const before = JSON.stringify(i);
    forksToCompare(i);
    expect(JSON.stringify(i)).toBe(before);
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
    expect(off).toContain("This visit");
  });

  it("a receipt is a status line, and an empty one says nothing on the road changed", () => {
    const html = renderToStaticMarkup(createElement(ReceiptLines, { lines: [] }));
    expect(html).toContain('role="status"');
    expect(html).toContain("Saved. Nothing on the road changed.");
  });

  // That these components write no sentence or label of their own is tests/cockpit-own-words.spec.ts
  // (2026-10-17), which reads every file in components/cockpit/.

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
