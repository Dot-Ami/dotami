import { buildPlan, type PlanView } from "@/lib/cockpit/plan";
import { answerEquipment, answerSalesYear3, compareEndings, forksToCompare, notToldYet, type KeptAnswers, type NotToldRow } from "@/lib/cockpit/told";
import { cockpitInput, gaugeView, nextOnYourRoad, stepBadges, type KeptFuture } from "@/lib/cockpit/view";
import { generalRoadV2026, roadsV2026, skillItemsV2026, type Road } from "@/lib/engines/roads/v2026";
import type { FigureView } from "@/lib/figures/types";
import { futureCards, listedRoads, sourcesLine } from "@/lib/front-door/futures";
import type { LookingFor as DoorLookingFor } from "@/lib/front-door/questions";
import { destinationReceipt, incomeReceipt, lookingForReceipt, placeName, placeReceipt } from "@/lib/front-door/receipts";
import { pickWords } from "@/lib/front-door/words";
import { firstSaveForPickedFuture, scenarioForPickedFuture } from "@/lib/front-door/start-future";
import { roadForFuture, SHIPPED_ROADS_CATALOG, type SkillMarkValue, type StepStatus } from "@/lib/futures/types";
import { firstSaveFromIntake } from "@/lib/journey/first-save";
import { applyIntentToDraft, type IntentParseResult } from "@/lib/journey/intent";
import { parseIntentFallback } from "@/lib/journey/intent-fallback";
import { defaultIntakeDraft, type IntakeDraft } from "@/lib/journey/types";
import type { PlaceCode } from "@/lib/places/codes";
import { evaluateRoad, roadReceipt, type RoadEvaluation, type RoadEvaluationInput } from "@/lib/roads";
import { monthsFromToday } from "@/lib/roads/words";
import { buildScenarioFromIntake } from "@/lib/scenarios/build-scenario-from-intake";
import { setIncorporateAt, updateScenarioBranch, type BranchDecisionId } from "@/lib/scenarios/branches";
import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { PROVINCE_LABELS, PROVINCES, type EmploymentStatus, type Province, type Scenario } from "@/lib/scenarios/types";

import { ROAD_IDS, type Idea, type PeopleType } from "../fixtures/ideas/v1";
import { officialFeeAmounts, quotedOfficialAmounts, type AmountLedger } from "./number-provenance";
import type { TextPiece } from "./text-pieces";

/**
 * One idea through the pipeline a person's words take in DotAmi today (S2.5.29b), with nothing mocked but
 * the person's own clicks. Two ways in:
 *
 * - **typed**: the front door's "I already have an idea" box → the keyword parser (`parseIntentFallback`,
 *   what the app runs when no AI key is set, as in CI) → `applyIntentToDraft` → the intake's two screens →
 *   `buildScenarioFromIntake` → the road the saved idea is drawn on (`roadForFuture`, as lib/futures/future.ts
 *   reads it: the intake saves no road, so road 0) → the cockpit.
 * - **picked**: *Your destination* and *Pick a future* → the person's click (`pickedChoice`: the road written
 *   for the idea, or else road 0, road 1 or the "Not here yet?" note, as the page offers all of them for any
 *   place in Canada) → `scenarioForPickedFuture`, `firstSaveForPickedFuture` → the cockpit. For every idea
 *   with a province or territory.
 *
 * In the cockpit the invented person answers a fixed list, one answer at a time, each with its receipt
 * (`answerReceipt`, two runs of road evaluation compared): their date, their savings, a quote for a cost
 * line, a skill mark, a pick at a fork, a step marked done. Then come *What you've told DotAmi*, *Not told
 * yet*, Compare and *Your plan* (`buildPlan`). Every sentence any of these writes is collected as a
 * `TextPiece`, so the invariants (./idea-invariants.ts) can read them all.
 *
 * Everything is pure and runs on a fixed day, so the same idea always gives the same run (invariant 7).
 */

/** The harness's own fixed day: the person's calendar day in every run. */
export const HARNESS_TODAY = "2026-10-17";
/** The month every invented person sets as Your date. */
export const HARNESS_TARGET_MONTH = "2028-05";
const AT_NOON = `${HARNESS_TODAY}T12:00:00.000Z`;

/**
 * The invented person's click on the intake's "Current employment" when their words don't say it: their own
 * answer, not anything DotAmi worked out. One per kind of person, so it is fixed.
 */
export const SCREEN_WORK_SITUATION: Record<PeopleType, EmploymentStatus> = {
  "only-an-idea": "employee",
  "side-hustle": "employee",
  "sole-prop-running": "self-employed",
  "incorporated-owner": "business-owner",
  "two-or-more-companies": "business-owner",
  "not-comfortable-with-computers": "other",
  "uses-an-agent": "self-employed",
  "records-scattered": "self-employed",
  "moves-pauses-closes": "self-employed",
  "already-behind": "self-employed",
  "outside-canada": "other",
};

/** Where a way in stopped before the cockpit, and why: an unanswered question, said on screen. */
export type IntakeEnd =
  /** Nothing typed: the box asks for the idea, and "Map it" does nothing until there are words. */
  | "describe-your-idea"
  /** The intake's place question has no answer: the person gave no Canadian place ("Canada is the first jurisdiction mapped"). */
  | "place-question";

export interface CockpitRun {
  way: "typed" | "picked";
  /** On the picked way, what the person clicked on Pick a future and the road it opens; null on the typed way. */
  pick: { by: "card" | "not-here"; roadId: string } | null;
  road: Road;
  roadChosen: boolean;
  /** As the cockpit first opens, before the person answers anything there. */
  fresh: { input: RoadEvaluationInput; evaluation: RoadEvaluation; notTold: NotToldRow[]; next: string[] };
  /** After every simulated answer. */
  final: { input: RoadEvaluationInput; evaluation: RoadEvaluation; notTold: NotToldRow[]; next: string[]; plan: PlanView };
  /**
   * After the fixed answers and then every question *Not told yet* still asks, answered one way each (only
   * with the question probes on; null without). The fixed answers never answer some questions (structure,
   * equipment, "I'd incorporate at"…), so *Not told yet* is never empty at `final`; here it can be, and
   * then the road must show a next step or be done.
   */
  answered: { evaluation: RoadEvaluation; notTold: NotToldRow[]; next: string[] } | null;
  /** Each answer and the receipt it gave. */
  receipts: { answer: string; lines: string[] }[];
  /** Each question *Not told yet* asked at first, and the receipt lines of the first answer to it that changed something (0: none did). */
  questions: { id: string; changes: number }[];
  ledger: AmountLedger;
  /** The words of the person's own date in this run ("19 months from today"), which no-times allows. */
  dateWords: string[];
}

export interface IdeaRun {
  idea: Idea;
  parse: IntentParseResult | null;
  draft: IntakeDraft | null;
  /** The province the person ends the intake with (their own pick), when they answer it. */
  province: Province | null;
  /** Where the typed way in stopped before the cockpit, or null when it reached it. */
  intakeEnd: IntakeEnd | null;
  typed: CockpitRun | null;
  picked: CockpitRun | null;
  pieces: TextPiece[];
}

const isProvince = (place: string): place is Province => (PROVINCES as readonly string[]).includes(place);
const placeCode = (province: Province) => `CA-${province}` as PlaceCode;

/** The person's own numbers in a run: fixed per idea from its number, so runs are repeatable. */
function ownNumbers(idea: Idea) {
  const n = Number(idea.id.slice(-4));
  return {
    savingsCents: 500_000 + (n % 7) * 125_000,
    quoteCents: 150_000 + (n % 5) * 35_000,
    incomeWantedCents: 5_000_000 + (n % 4) * 1_000_000,
    // Whole dollars, as the cockpit's box keeps a third-year sales estimate.
    salesYear3Dollars: 60_000 + (n % 6) * 20_000,
  };
}

/**
 * A figure the invented person agreed to, as the storage would give it back (lib/figures/types.ts FigureView),
 * on the harness's fixed day. Exported for the property tests, which build the same figures from generated
 * numbers.
 */
export function figure(idea: Pick<Idea, "id">, change: Partial<FigureView>): FigureView {
  return {
    // One figure per kind, and per cost line for quotes: the person can quote every line.
    id: `figure-${idea.id}-${change.kind}${change.costLine ? `-${change.costLine.lineId}` : ""}`,
    ventureId: `venture-${idea.id}`,
    kind: "savings-for-start",
    periodStart: HARNESS_TODAY,
    periodEnd: HARNESS_TODAY,
    amountCents: 0,
    currency: "CAD",
    sourceKind: "typed",
    sourceLabel: "typed by you",
    sourceRows: null,
    taxYear: null,
    formLine: null,
    costLine: null,
    status: "confirmed",
    editedByPerson: false,
    proposedAt: AT_NOON,
    confirmedAt: AT_NOON,
    retractedAt: null,
    ...change,
  };
}

/** What the cockpit keeps for one idea while the invented person answers. */
interface Kept {
  scenario: Scenario;
  figures: FigureView[];
  /** The day the person agreed to a yearly income, or null: the plan lists it, road evaluation never reads it. */
  incomeWantedOn: string | null;
  progress: { stepId: string; status: StepStatus | null; doneWhenIds: string[] }[];
  skillMarks: { skillItemId: string | null; ownLabel: string | null; mark: SkillMarkValue }[];
  future: KeptFuture;
  forkPickedOn: Record<string, string | null>;
  targetMonthSetOn: string | null;
}

function inputOf(road: Road, roadChosen: boolean, kept: Kept): RoadEvaluationInput {
  return cockpitInput({
    road,
    roadChosen,
    skillItems: skillItemsV2026,
    scenario: kept.scenario,
    figures: kept.figures,
    // As the app passes them (components/cockpit/cockpit-page.tsx, lib/futures/read-plan.ts): the agreed
    // income is shown beside the plan as its target line, never read by road evaluation.
    personFigures: [],
    future: kept.future,
    progress: kept.progress,
    skillMarks: kept.skillMarks,
    // Only the person picks a job, and the invented person never does: nothing may pick one for them.
    job: null,
    today: HARNESS_TODAY,
  });
}

function keptAnswers(kept: Kept): KeptAnswers {
  return {
    progress: kept.progress.map((p) => ({
      stepId: p.stepId,
      changes: p.status ? [{ at: AT_NOON, status: p.status }] : [],
      updatedAt: AT_NOON,
    })),
    skillMarks: kept.skillMarks.map((m) => ({ ...m, markedOn: HARNESS_TODAY })),
    forkPickedOn: kept.forkPickedOn,
    targetMonthSetOn: kept.targetMonthSetOn,
    figures: kept.figures,
    incomeWantedOn: kept.incomeWantedOn,
  };
}

const clone = (kept: Kept): Kept => ({
  ...kept,
  figures: [...kept.figures],
  progress: kept.progress.map((p) => ({ ...p, doneWhenIds: [...p.doneWhenIds] })),
  skillMarks: [...kept.skillMarks],
  future: { forkPicks: { ...kept.future.forkPicks }, targetMonth: kept.future.targetMonth },
  forkPickedOn: { ...kept.forkPickedOn },
});

/** The first named cost line, preferring one on a step whose money is counted, as "Add your quote" offers it. */
function firstNamedLine(road: Road, evaluation: RoadEvaluation): { stepId: string; lineId: string } | null {
  const named = evaluation.steps.flatMap((s) =>
    s.costs.filter((c) => c.kind === "named-not-priced").map((c) => ({ stepId: s.stepId, lineId: c.lineId, counted: s.money === "counted" })),
  );
  const pick = named.find((n) => n.counted) ?? named[0];
  return pick && road.steps.some((s) => s.id === pick.stepId) ? { stepId: pick.stepId, lineId: pick.lineId } : null;
}

/**
 * Each way the invented person might answer a question on *Not told yet*: the answers the box or list
 * offers, the one most likely to change something first (the probe stops at the first that does).
 */
function answersTo(row: NotToldRow, road: Road, evaluation: RoadEvaluation, idea: Idea, scenario: Scenario): ((kept: Kept) => void)[] {
  const own = ownNumbers(idea);
  switch (row.id) {
    case "date":
      return [(k) => void (k.future.targetMonth = HARNESS_TARGET_MONTH)];
    case "savings":
      return [(k) => void k.figures.push(figure(idea, { kind: "savings-for-start", amountCents: own.savingsCents }))];
    case "cost-lines": {
      const line = firstNamedLine(road, evaluation);
      return line
        ? [(k) => void k.figures.push(figure(idea, { kind: "start-up-cost-line", amountCents: own.quoteCents, costLine: { roadId: road.id, ...line, amountFrom: "quote" } }))]
        : [];
    }
    case "skills": {
      const item = [...new Set(road.steps.flatMap((s) => s.needs))][0];
      return item ? [(k: Kept) => void k.skillMarks.push({ skillItemId: item, ownLabel: null, mark: "have" })] : [];
    }
    case "structure":
      return (["corporation", "sole-prop"] as const).map(
        (structure) => (k: Kept) => void (k.scenario = { ...k.scenario, profile: { ...k.scenario.profile, structure, structureSource: "user" } }),
      );
    case "equipment":
      // The cockpit's own answer (its one-question box saves through the same function).
      return [true, false].map((yes) => (k: Kept) => void (k.scenario = answerEquipment(k.scenario, yes)));
    case "sales-year-3":
      // The person's own estimate, through the box's own save.
      return [(k: Kept) => void (k.scenario = answerSalesYear3(k.scenario, own.salesYear3Dollars))];
    case "incorporate-at": {
      // The rule compares the answer with the person's own third-year estimate: their estimate itself first
      // (reaching it lights the step), then numbers under and over one, for an estimate left blank.
      const y3 = scenario.profile.targetRevenueY3;
      return [...(y3 > 0 ? [y3] : []), 80_000, 30_000].map((dollars) => (k: Kept) => void (k.scenario = setIncorporateAt(k.scenario, dollars)));
    }
  }
  if (row.id.startsWith("ending:") || row.id.startsWith("map-pick:")) {
    const fork = road.forks.find((f) => f.id === row.forkId);
    if (!fork) return [];
    // On the map, the side that isn't its default first: clicking the default changes no step.
    const picked: string | undefined = (scenario.state.activeBranches as Record<string, string>)[fork.id];
    const sides = [...fork.sides].sort((a, b) => Number(a === picked) - Number(b === picked));
    return sides.map((side) => (k: Kept) => {
      if (row.id.startsWith("map-pick:")) k.scenario = updateScenarioBranch(k.scenario, fork.id as BranchDecisionId, side as CFENodeId);
      else {
        k.future.forkPicks[fork.id] = { stepId: side, pickedOn: HARNESS_TODAY, from: "you" };
        k.forkPickedOn[fork.id] = HARNESS_TODAY;
      }
    });
  }
  return [];
}

/**
 * One question on *Not told yet*, answered all the way: a quote for every line not priced, a mark on every
 * skill not marked, and for the rest the first answer `answersTo` gives.
 */
function answerEverything(row: NotToldRow, road: Road, evaluation: RoadEvaluation, idea: Idea, k: Kept) {
  const own = ownNumbers(idea);
  if (row.id === "cost-lines") {
    for (const step of evaluation.steps) {
      if (!road.steps.some((s) => s.id === step.stepId)) continue;
      for (const c of step.costs.filter((c) => c.kind === "named-not-priced")) {
        k.figures.push(figure(idea, { kind: "start-up-cost-line", amountCents: own.quoteCents, costLine: { roadId: road.id, stepId: step.stepId, lineId: c.lineId, amountFrom: "quote" } }));
      }
    }
    return;
  }
  if (row.id === "skills") {
    const marked = new Set(k.skillMarks.map((m) => m.skillItemId));
    for (const item of new Set(road.steps.flatMap((s) => s.needs))) {
      if (!marked.has(item)) k.skillMarks.push({ skillItemId: item, ownLabel: null, mark: "have" });
    }
    return;
  }
  answersTo(row, road, evaluation, idea, k.scenario)[0]?.(k);
}

/** The cockpit for one idea on one road: the person's answers, the lists, Compare and the plan. */
function runCockpit(
  idea: Idea,
  way: CockpitRun["way"],
  road: Road,
  roadChosen: boolean,
  scenario: Scenario,
  plan: { firstWords: PlanViewArgs["firstWords"]; destination: PlanViewArgs["destination"]; incomeWantedCents: number | null; yours: number[] },
  pieces: TextPiece[],
  options: RunOptions,
): CockpitRun {
  const own = ownNumbers(idea);
  const kept: Kept = {
    scenario,
    figures: [],
    incomeWantedOn: plan.incomeWantedCents === null ? null : HARNESS_TODAY,
    progress: [],
    skillMarks: [],
    future: { forkPicks: {}, targetMonth: null },
    forkPickedOn: {},
    targetMonthSetOn: null,
  };
  const at = (part: string) => `${way} › ${part}`;
  const add: AddPiece = (where, text, kind = "dotami") => {
    if (text) pieces.push({ where: at(where), text, kind });
  };

  // --- As the cockpit first opens.
  const freshInput = inputOf(road, roadChosen, kept);
  const freshEval = evaluateRoad(freshInput);
  const freshNotTold = notToldYet(freshInput, freshEval);
  const freshNext = nextOnYourRoad(freshEval, kept.scenario).map((s) => s.stepId);
  piecesOfEvaluation(add, "fresh", freshEval, freshInput);
  piecesOfNotTold(add, "fresh", freshNotTold);

  // Every question asked, answered each way the screen offers, against the cockpit as it opened, until one
  // answer changes something. A receipt here is the cockpit's own (`answerReceipt` is `roadReceipt` of the
  // two runs); the run before is the same for every answer, so it is worked out once.
  const questions = (options.probeQuestions ? freshNotTold : []).map((row) => {
    for (const answerIt of answersTo(row, road, freshEval, idea, kept.scenario)) {
      const k = clone(kept);
      answerIt(k);
      const afterInput = inputOf(road, roadChosen, k);
      const afterEval = evaluateRoad(afterInput);
      const changes = roadReceipt(freshEval, afterEval).length;
      if (changes > 0) return { id: row.id, changes };
      // An answer that changes nothing on its own can still open the question it is compared with: the
      // third-year sales estimate opens "I'd incorporate at" (docs/ui-spec/cockpit/incorporating-estimate.md,
      // its receipt "Saved. Nothing on the road changed."). The two answered together count, one question
      // deep, so a question that only ever leads to more questions that change nothing still fails.
      const opened = notToldYet(afterInput, afterEval).filter((next) => !freshNotTold.some((r) => r.id === next.id));
      for (const next of opened) {
        for (const answerNext of answersTo(next, road, afterEval, idea, k.scenario)) {
          const both = clone(k);
          answerNext(both);
          const together = roadReceipt(freshEval, evaluateRoad(inputOf(road, roadChosen, both))).length;
          if (together > 0) return { id: row.id, changes: together };
        }
      }
    }
    return { id: row.id, changes: 0 };
  });

  // --- The invented person's answers, in a fixed order, each with its receipt. Each answer's run after is
  // the next answer's run before.
  const receipts: CockpitRun["receipts"] = [];
  let current = freshEval;
  const answer = (name: string, change: (k: Kept) => void) => {
    change(kept);
    const after = evaluateRoad(inputOf(road, roadChosen, kept));
    const lines = roadReceipt(current, after);
    current = after;
    receipts.push({ answer: name, lines });
    lines.forEach((line, i) => add(`receipt › ${name} › ${i + 1}`, line));
  };
  answer("date", (k) => {
    k.future.targetMonth = HARNESS_TARGET_MONTH;
    k.targetMonthSetOn = HARNESS_TODAY;
  });
  answer("savings", (k) => void k.figures.push(figure(idea, { kind: "savings-for-start", amountCents: own.savingsCents })));
  const line = firstNamedLine(road, current);
  if (line) {
    answer("quote", (k) =>
      void k.figures.push(figure(idea, { kind: "start-up-cost-line", amountCents: own.quoteCents, costLine: { roadId: road.id, ...line, amountFrom: "quote" } })),
    );
  }
  const item = [...new Set(road.steps.flatMap((s) => s.needs))][0];
  if (item) answer("skill", (k) => void k.skillMarks.push({ skillItemId: item, ownLabel: null, mark: "have" }));
  const fork = road.forks[0];
  if (fork) {
    answer("fork", (k) => {
      if (road.id === generalRoadV2026.id) {
        // Road 0's forks are the map's toggles: the person clicks the side that isn't the default.
        const other = fork.sides.find((side) => side !== k.scenario.state.activeBranches[fork.id as BranchDecisionId]) ?? fork.sides[0];
        k.scenario = updateScenarioBranch(k.scenario, fork.id as BranchDecisionId, other as CFENodeId);
      } else {
        k.future.forkPicks[fork.id] = { stepId: fork.sides[fork.sides.length - 1], pickedOn: HARNESS_TODAY, from: "you" };
        k.forkPickedOn[fork.id] = HARNESS_TODAY;
      }
    });
  }
  const firstNext = nextOnYourRoad(current, kept.scenario, 1)[0];
  if (firstNext) answer("step-done", (k) => void k.progress.push({ stepId: firstNext.stepId, status: "done", doneWhenIds: [] }));

  // --- After every answer: the lists, Compare and the plan.
  const finalInput = inputOf(road, roadChosen, kept);
  const finalEval = current;
  const finalNotTold = notToldYet(finalInput, finalEval);
  const finalNext = nextOnYourRoad(finalEval, kept.scenario).map((s) => s.stepId);
  piecesOfEvaluation(add, "final", finalEval, finalInput);
  piecesOfNotTold(add, "final", finalNotTold);
  // "What you've told DotAmi" is the plan's list row for row (buildPlan runs `toldRows` itself); the words
  // a take back shows come from road evaluation's answers.
  for (const a of finalEval.answers.filter((a) => a.given)) add(`told › ${a.id} › taken back`, a.takenBack);
  for (const f of forksToCompare(finalInput)) {
    const view = compareEndings(finalInput, f.id);
    if (!view) continue;
    for (const side of view.sides) add(`compare › ${f.id} › side`, side.label, "catalog");
    for (const row of view.rows) {
      add(`compare › ${f.id} › ${row.id} › label`, row.label);
      row.values.forEach((v, i) => add(`compare › ${f.id} › ${row.id} › ${i + 1}`, v));
    }
  }

  const planView = buildPlan({
    ideaName: kept.scenario.profile.name,
    input: finalInput,
    kept: keptAnswers(kept),
    firstWords: plan.firstWords,
    destination: plan.destination,
    incomeWanted: plan.incomeWantedCents === null ? null : { amountCents: plan.incomeWantedCents, agreedOn: HARNESS_TODAY },
    roadChosenOn: roadChosen ? HARNESS_TODAY : null,
    jobPickedOn: null,
    today: HARNESS_TODAY,
  });
  piecesOfPlan(add, planView);

  // --- Then every question still asked, answered one way each, round after round (an answer can bring a
  // new question: a fork picked opens its side's skills), until nothing is asked or nothing more can be.
  let answered: CockpitRun["answered"] = null;
  if (options.probeQuestions) {
    const k = clone(kept);
    let evaluation = finalEval;
    let notTold = finalNotTold;
    for (let round = 0; round < 6 && notTold.length > 0; round += 1) {
      const before = JSON.stringify(notTold);
      for (const row of notTold) answerEverything(row, road, evaluation, idea, k);
      evaluation = evaluateRoad(inputOf(road, roadChosen, k));
      notTold = notToldYet(inputOf(road, roadChosen, k), evaluation);
      if (JSON.stringify(notTold) === before) break;
    }
    answered = { evaluation, notTold, next: nextOnYourRoad(evaluation, k.scenario).map((s) => s.stepId) };
  }

  const months = finalEval.gauges.date?.monthsFromToday;
  const roadFees = road.steps.flatMap((s) => s.costs.flatMap((c) => (c.kind === "official-fee" ? [c.amountCents] : [])));
  const yours = [...plan.yours, own.savingsCents, ...(line ? [own.quoteCents] : []), ...(plan.incomeWantedCents === null ? [] : [plan.incomeWantedCents])];
  return {
    way,
    pick: null,
    road,
    roadChosen,
    fresh: { input: freshInput, evaluation: freshEval, notTold: freshNotTold, next: freshNext },
    final: { input: finalInput, evaluation: finalEval, notTold: finalNotTold, next: finalNext, plan: planView },
    answered,
    receipts,
    questions,
    ledger: {
      officialFees: officialFeeAmounts(),
      yours,
      quotedThresholds: quotedOfficialAmounts(),
      // A sum adds official fees and the person's quotes; savings are only ever the start of a difference.
      addable: [...roadFees, ...(line ? [own.quoteCents] : [])],
    },
    dateWords: months === undefined ? [] : [monthsFromToday(months)],
  };
}

/**
 * Collects one piece of a screen's text: `where` is its place on screen (without the way in, which the
 * caller adds), `kind` whose words they are (DotAmi's unless said otherwise). Nothing is collected for an
 * empty or missing text.
 */
export type AddPiece = (where: string, text: string | null | undefined, kind?: TextPiece["kind"]) => void;

/** The cockpit's own words for one run of road evaluation: each step's reason, the badges and the gauges. */
export function piecesOfEvaluation(add: AddPiece, when: string, evaluation: RoadEvaluation, input: RoadEvaluationInput) {
  for (const step of evaluation.steps) {
    add(`${when} › step ${step.stepId} › because`, step.because);
    for (const badge of stepBadges(step, { skills: true, money: true, rules: true })) add(`${when} › step ${step.stepId} › badge`, badge);
  }
  const gauges = gaugeView(evaluation, input.road, input.scenario);
  for (const [id, gauge] of Object.entries(gauges)) {
    add(`${when} › gauge ${id}`, gauge.value);
    gauge.lines.forEach((l, i) => add(`${when} › gauge ${id} › ${i + 1}`, l));
    add(`${when} › gauge ${id} › invite`, gauge.invite);
  }
}

/** *Not told yet*: each question and what it unlocks. */
export function piecesOfNotTold(add: AddPiece, when: string, rows: readonly NotToldRow[]) {
  for (const row of rows) {
    add(`${when} › not told › ${row.id}`, row.question);
    add(`${when} › not told › ${row.id} › unlocks`, row.unlocks);
  }
}

/** *Your plan*, every line of it, each tagged with whose words it is. */
export function piecesOfPlan(add: AddPiece, p: PlanView) {
  {
    add("plan › title", p.title);
    add("plan › made", p.made);
    for (const w of p.words) {
      add("plan › words", w.text, "person");
      add("plan › words › line", w.line);
    }
    add("plan › words none", p.wordsNone);
    add("plan › target", p.target);
    add("plan › future", p.road.future);
    add("plan › picked", p.road.picked);
    p.road.endings.forEach((e) => add("plan › ending", e));
    for (const g of p.road.gauges) {
      add(`plan › gauge ${g.label}`, g.value);
      g.lines.forEach((l) => add(`plan › gauge ${g.label} › line`, l));
    }
    add("plan › order", p.steps.order);
    for (const column of p.steps.columns) {
      add(`plan › column ${column.label}`, column.label, "catalog");
      add(`plan › column ${column.label} › summary`, column.summary, "catalog");
      for (const s of column.steps) {
        const w = `plan › step ${s.id}`;
        add(`${w} › label`, s.label, "catalog");
        add(`${w} › summary`, s.summary, "catalog");
        add(`${w} › status`, s.status);
        add(`${w} › state`, s.state);
        add(`${w} › because`, s.because);
        add(`${w} › done when title`, s.doneWhenTitle);
        for (const d of s.doneWhen) {
          add(`${w} › done when`, d.text, "catalog");
          add(`${w} › done when › mark`, d.mark);
          addSource(`${w} › done when`, d.source);
        }
        s.skills.forEach((sk) => {
          add(`${w} › skill`, sk.label, "catalog");
          add(`${w} › skill › mark`, sk.mark);
        });
        add(`${w} › cost count`, s.costCount);
        s.officialLinks.forEach((l) => add(`${w} › official link`, l.label, "catalog"));
        s.sources.forEach((src) => addSource(w, src));
      }
    }
    for (const sk of p.skills.road) {
      add("plan › skills › road", sk.label, "catalog");
      add("plan › skills › road › kind", sk.kind);
      add("plan › skills › road › mark", sk.mark);
    }
    add("plan › skills › road none", p.skills.roadNone);
    add("plan › skills › own none", p.skills.ownNone);
    add("plan › skills › no job", p.skills.noJob);
    p.money.sums.forEach((s) => add("plan › money › sum", s));
    for (const group of p.money.byStep) {
      add(`plan › money › ${group.step}`, group.step, "catalog");
      add(`plan › money › ${group.step} › note`, group.note);
      for (const l of group.lines) {
        add(`plan › money › ${group.step} › line`, l.label, "catalog");
        // The amount alone, tagged with the line's kind, so "$0" can be told apart: an official fee of $0
        // (the business number is free) is a fee, a blank is never an amount.
        add(`plan › money › ${group.step} › line ${l.lineId} › amount (${l.kind})`, l.amount);
        add(`plan › money › ${group.step} › line ${l.lineId} › kind`, l.kind);
        add(`plan › money › ${group.step} › line ${l.lineId} › note`, l.note);
        if (l.source) addSource(`plan › money › ${group.step} › line ${l.lineId}`, l.source);
      }
    }
    add("plan › money none", p.money.none);
    for (const row of p.told.rows) {
      add("plan › told", row.said);
      add("plan › told › day", row.day);
      row.unlocked.forEach((u) => add("plan › told › unlocked", u));
    }
    add("plan › told none", p.told.none);
    add("plan › not advice", p.notAdvice);
  }

  function addSource(where: string, src: { title: string; checked: string; quotes: readonly string[] }) {
    add(`${where} › source`, src.title, "catalog");
    add(`${where} › source › checked`, src.checked);
    src.quotes.forEach((q) => add(`${where} › source › quote`, q, "official-quote"));
  }
}

type PlanViewArgs = Parameters<typeof buildPlan>[0];

/** The typed way in: the front door's box, the parser, the intake's two screens, then the cockpit. */
function typedWayIn(idea: Idea, pieces: TextPiece[], options: RunOptions): Pick<IdeaRun, "parse" | "draft" | "province" | "intakeEnd" | "typed"> {
  const words = idea.words;
  if (words.trim().length === 0) return { parse: null, draft: null, province: null, intakeEnd: "describe-your-idea", typed: null };
  // The app runs the AI parser only with the person's own key; without one (and in CI) it is this one.
  const parse = parseIntentFallback(words);
  const draft = applyIntentToDraft(defaultIntakeDraft(), parse, words, HARNESS_TODAY);
  pieces.push({ where: "typed › confirm › your words", text: parse.rawLabel, kind: "person" });
  // The intake's second screen: the person answers the place question with their own place. Someone
  // outside Canada, or who never says, can't answer it, and the screen says only Canada is mapped.
  if (!isProvince(idea.place)) return { parse, draft, province: null, intakeEnd: "place-question", typed: null };
  const province = idea.place;
  const scenario = buildScenarioFromIntake(
    {
      // "My venture" is the intake's own default name; the parse's sentence is never used as one.
      name: draft.name.trim() || "My venture",
      type: draft.ventureType,
      // The intake's optional sales boxes: the person's own numbers, 0 when they leave a box blank.
      targetRevenueY1: idea.y1 ?? 0,
      targetRevenueY3: idea.y3 ?? 0,
      province,
      hireFirst: draft.hireFirst,
      employmentStatus: idea.ws ?? SCREEN_WORK_SITUATION[idea.people],
      // The confirm screen's chips as the parse left them: the person clicks "Looks right".
      activityTags: [...draft.activityTags, ...draft.customTags],
      capitalPurchasePlanned: draft.capitalPurchasePlanned,
      stage: draft.ventureStage,
    },
    `scenario-${idea.id}`,
  );
  // The road the intake's first save keeps (lib/journey/first-save.ts: today none), drawn as
  // lib/futures/future.ts reads it: roadForFuture with that id, and "chosen" only when its id was kept.
  const roadId: string | null = firstSaveFromIntake(draft, HARNESS_TODAY).roadId ?? null;
  const road = roadForFuture(SHIPPED_ROADS_CATALOG, roadId);
  const roadChosen = roadId !== null && roadId === road.id;
  const typed = runCockpit(
    idea,
    "typed",
    road,
    roadChosen,
    scenario,
    {
      firstWords: { text: words, saidAt: HARNESS_TODAY },
      destination: null,
      incomeWantedCents: null,
      yours: [...(idea.y1 ? [idea.y1 * 100] : []), ...(idea.y3 ? [idea.y3 * 100] : [])],
    },
    pieces,
    options,
  );
  return { parse, draft, province, intakeEnd: null, typed };
}

const DOOR_LOOKING_FOR: Record<Idea["lookingFor"], DoorLookingFor | null> = {
  business: "business",
  career: "career",
  both: "both-or-not-sure",
  "not-said": null,
};

/**
 * What the invented person clicks on *Pick a future*. The page lists every written road for any place in
 * Canada (a road written for elsewhere says "Written for Alberta. You said …"), and "Not here yet?" keeps a
 * note and opens the general road. So: the road written for the idea when there is one; otherwise, by the
 * idea's number, road 0's card, road 1's card, or the note (road 0's card when there are no words to note).
 */
export function pickedChoice(idea: Idea): { by: "card" | "not-here"; roadId: string } {
  if (idea.road !== "none-written-yet") return { by: "card", roadId: ROAD_IDS[idea.road] };
  const n = Number(idea.id.slice(-4));
  if (n % 3 === 1) return { by: "card", roadId: ROAD_IDS["road-1"] };
  if (n % 3 === 2 && idea.words.trim().length > 0) return { by: "not-here", roadId: generalRoadV2026.id };
  return { by: "card", roadId: generalRoadV2026.id };
}

/**
 * The picked way in, for every idea in Canada: Your destination's four answers (question 2, business or
 * career, left unanswered when the idea doesn't say), Pick a future, the person's click (`pickedChoice`),
 * then the cockpit.
 */
function pickedWayIn(idea: Idea, pieces: TextPiece[], options: RunOptions): CockpitRun | null {
  // Pick a future asks for a province or territory first ("Say which province or territory you're in first").
  if (!isProvince(idea.place)) return null;
  const choice = pickedChoice(idea);
  const listed = listedRoads(roadsV2026);
  const own = ownNumbers(idea);
  const add = (where: string, text: string, kind: TextPiece["kind"] = "dotami") => pieces.push({ where: `picked › ${where}`, text, kind });
  const words = idea.words.trim().length > 0 ? idea.words : null;
  if (words) add("destination › receipt", destinationReceipt({ kept: "saved", text: words, saidAt: HARNESS_TODAY }));
  const lookingFor = DOOR_LOOKING_FOR[idea.lookingFor];
  if (lookingFor) add("looking for › receipt", lookingForReceipt(lookingFor, listed));
  add("place › receipt", placeReceipt(placeCode(idea.place), listed));
  add("income › receipt", incomeReceipt({ kind: "agreed", amountCents: own.incomeWantedCents, agreedOn: HARNESS_TODAY }));
  // Each card as components/front-door/pick-future-page.tsx writes it.
  for (const card of futureCards(listed, skillItemsV2026)) {
    const at = `pick a future › ${card.roadId}`;
    add(at, card.label, "catalog");
    add(`${at} › kind`, pickWords.kind[card.kind]);
    const places: readonly string[] = card.writtenFor;
    const names = places.map((p) => (p === "CA" ? pickWords.allOfCanada : ((PROVINCE_LABELS as Record<string, string>)[p] ?? p))).join(", ");
    add(`${at} › written for`, pickWords.writtenFor(names));
    if (!places.includes("CA") && !places.includes(idea.place)) add(`${at} › you said`, pickWords.youSaid(placeName(placeCode(idea.place))));
    add(`${at} › counts`, pickWords.counts(card.steps, card.skillsListed, card.officialFees, card.linesToPrice));
    for (const part of sourcesLine(card.sources)) add(`${at} › sources`, part.text);
  }
  // "Not here yet?": the note is kept as one of the person's statements (not shown in the plan), and the
  // general road opens the same way a card does.
  if (choice.by === "not-here") add("not here › your note", idea.words, "person");
  const picked = roadsV2026.find((r) => r.id === choice.roadId)!;
  const scenario = scenarioForPickedFuture({ road: picked, place: placeCode(idea.place), name: "" }, `scenario-${idea.id}-picked`);
  const firstSave = firstSaveForPickedFuture(picked, lookingFor);
  const road = roadForFuture(SHIPPED_ROADS_CATALOG, firstSave.roadId ?? null);
  const roadChosen = firstSave.roadId !== undefined && firstSave.roadId === road.id;
  return {
    ...runCockpit(
      idea,
      "picked",
      road,
      roadChosen,
      scenario,
      { firstWords: null, destination: words ? { text: words, saidAt: HARNESS_TODAY } : null, incomeWantedCents: own.incomeWantedCents, yours: [] },
      pieces,
      options,
    ),
    pick: choice,
  };
}

export interface RunOptions {
  /**
   * Answer every question *Not told yet* asks, each way, to see it changes something (invariant 5). On by
   * default; the second run for "same input, same output" leaves it out, since it only repeats the same
   * product calls the answers and the plan already make, and `runDigest` leaves its results out too.
   */
  probeQuestions: boolean;
}

/**
 * One idea, each way in it can take: typed for every idea with words, picked for every idea with a province
 * or territory, and one click on Pick a future of the several the page offers (see `pickedChoice`).
 */
export function runIdea(idea: Idea, options: RunOptions = { probeQuestions: true }): IdeaRun {
  const pieces: TextPiece[] = [];
  const typed = typedWayIn(idea, pieces, options);
  const picked = pickedWayIn(idea, pieces, options);
  return { idea, ...typed, picked, pieces };
}

/**
 * Everything a run shows and keeps, as one string, for "same input, same output". The inputs' catalogs
 * are left out (they are the same objects every run), and so are the question probes (see `RunOptions`);
 * every result a screen shows is in.
 */
export function runDigest(run: IdeaRun): string {
  const cockpit = (c: CockpitRun | null) =>
    c && {
      pick: c.pick,
      road: c.road.id,
      roadChosen: c.roadChosen,
      fresh: { evaluation: c.fresh.evaluation, notTold: c.fresh.notTold, next: c.fresh.next },
      final: { evaluation: c.final.evaluation, notTold: c.final.notTold, next: c.final.next, plan: c.final.plan },
      receipts: c.receipts,
    };
  return JSON.stringify({
    parse: run.parse,
    draft: run.draft,
    province: run.province,
    intakeEnd: run.intakeEnd,
    typed: cockpit(run.typed),
    picked: cockpit(run.picked),
    pieces: run.pieces,
  });
}
