import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { forksAreTheMapToggles, type Fork } from "@/lib/engines/roads/v2026";
import { SALES_DOLLARS_MAX } from "@/lib/db/scenario-state-json";
import type { FigureView } from "@/lib/figures/types";
import {
  evaluateRoad,
  REQUIRED_ANSWER_IDS,
  roadReceipt,
  withoutAnswer,
  type MarkCounts,
  type RoadEvaluation,
  type RoadEvaluationInput,
  type StepEvaluation,
} from "@/lib/roads";
import { branchDecisions, updateScenarioBranch, type BranchDecisionId } from "@/lib/scenarios/branches";
import { isBranchDecided } from "@/lib/scenarios/graph";
import { isNotSaid, withSaid, withSalesTarget } from "@/lib/scenarios/not-said";
import type { Scenario } from "@/lib/scenarios/types";

import { cockpitWords as words } from "./words";

/**
 * The cockpit screen's part 2 (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built, part
 * 2"): "What you've told DotAmi", "Not told yet", receipts, the what-if and "Compare the two endings",
 * all worked out from road evaluation (lib/roads/) and nothing else. Pure: no layout, no clock, no fetch.
 *
 * Every number here is a count or a sum road evaluation gave; every sentence comes from road evaluation's
 * words or ./words.ts. Nothing ranks an answer, a question or an ending.
 */

/** A receipt: road evaluation before an answer and after it, compared (lib/roads/receipts.ts). */
export function answerReceipt(before: RoadEvaluationInput, after: RoadEvaluationInput): string[] {
  return roadReceipt(evaluateRoad(before), evaluateRoad(after));
}

const capitalised = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar day an ISO moment fell on, on this computer (the person's own day, as the server's helper gives it). */
export function dayOfMoment(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// --- What you've told DotAmi

/** The days kept with each kind of answer, as GET /api/futures/<id> and the figures list give them. */
export interface KeptAnswers {
  progress: readonly { stepId: string; changes: readonly { at: string; status: string | null }[]; updatedAt: string }[];
  skillMarks: readonly { skillItemId: string | null; ownLabel: string | null; markedOn: string }[];
  /** The day each ending was picked, by fork id (null for road 0's map picks, which keep no day). */
  forkPickedOn: Readonly<Record<string, string | null>>;
  targetMonthSetOn: string | null;
  /** The idea's figures, every state: only agreed ones date an answer or are taken back. */
  figures: readonly FigureView[];
  incomeWantedOn: string | null;
}

/** Which question the one-question box asks. */
export type BoxQuestion =
  | "date"
  | "savings"
  | "place"
  | "structure"
  | "equipment"
  | "sales-year-3"
  | "incorporate-at"
  | `map-pick:${string}`;

/** Where "Change" goes for a row. */
export type ToldChange =
  | { kind: "step"; stepId: string }
  | { kind: "skills" }
  | { kind: "compare"; forkId: string }
  | { kind: "box"; question: BoxQuestion }
  | { kind: "intake" }
  | { kind: "figures" }
  | { kind: "none" };

/** How "Take back" removes a row's answer; the same change `withoutAnswer` makes. */
export type ToldTakeBack =
  | { kind: "skill-mark"; skillItemId: string }
  | { kind: "own-skill"; ownLabel: string }
  | { kind: "step-status"; stepId: string }
  | { kind: "step-ticks"; stepId: string }
  | { kind: "figures"; figureIds: string[] }
  | { kind: "date" }
  | { kind: "ending"; forkId: string }
  /** The idea's own answers, through the map's save (lib/roads/without-answer.ts `withoutIdeaAnswer`). */
  | { kind: "idea" }
  | { kind: "none"; why: "required" | "figures" | "no-route" };

export interface ToldRow {
  id: string;
  /** The answer in its own words: "You told us your date is May 2029". */
  said: string;
  /** Its take back in road evaluation's own words ("you took back your date"), for a receipt with no lines. */
  takenBack: string;
  /** The day kept with the answer, YYYY-MM-DD; null where nothing keeps one. */
  day: string | null;
  /** Receipt lines of road evaluation without the answer against with it; null where it can't be taken away. */
  unlocked: string[] | null;
  change: ToldChange;
  takeBack: ToldTakeBack;
}

/**
 * The day a told row shows: the day kept with it or, where none is kept, where the figures' days are or
 * that it isn't kept. One place for the cockpit's list and the plan, so the two can't drift apart.
 */
export function toldDay(row: Pick<ToldRow, "day" | "takeBack">): string {
  return row.day ?? (row.takeBack.kind === "none" && row.takeBack.why === "figures" ? words.told.dayOnYourIdeas : words.told.dayNotKept);
}

/** The agreed figures behind a planning answer, newest agreed first. */
function agreedFigures(figures: readonly FigureView[], match: (f: FigureView) => boolean): FigureView[] {
  return figures
    .filter((f) => f.status === "confirmed" && match(f))
    .sort((a, b) => (b.confirmedAt ?? "").localeCompare(a.confirmedAt ?? ""));
}

/**
 * One row per answer road evaluation read that the person gave, in its fixed order. A default the person
 * hasn't set is never a row, and neither is a what-if, which is never kept.
 */
export function toldRows(input: RoadEvaluationInput, evaluation: RoadEvaluation, kept: KeptAnswers): ToldRow[] {
  return evaluation.answers
    .filter((a) => a.given && a.id !== "what-if")
    .map((a) => {
      const without = withoutAnswer(input, a.id);
      return {
        id: a.id,
        said: capitalised(a.said),
        takenBack: a.takenBack,
        day: dayFor(a.id, input, kept),
        unlocked: without === null ? null : roadReceipt(evaluateRoad(without), evaluation),
        change: changeFor(a.id),
        takeBack: takeBackFor(a.id, input, kept),
      };
    });
}

function dayFor(id: string, input: RoadEvaluationInput, kept: KeptAnswers): string | null {
  const [kind, ...rest] = id.split(":");
  const key = rest.join(":");
  switch (kind) {
    case "skill":
      return kept.skillMarks.find((m) => m.skillItemId === key)?.markedOn ?? null;
    case "own-skill":
      return kept.skillMarks.find((m) => m.skillItemId === null && m.ownLabel?.toLocaleLowerCase() === key)?.markedOn ?? null;
    case "step":
      // The day the status last changed.
      return dayOfMoment(kept.progress.find((p) => p.stepId === key)?.changes.at(-1)?.at);
    case "ticks":
      // Ticks keep no day of their own, and the step's last change (a status, say) isn't the tick's, so
      // none is borrowed: the row says the day isn't kept (2026-10-12, after review).
      return null;
    case "fork":
      return kept.forkPickedOn[key] ?? null;
    case "cost-line": {
      const [stepId, lineId] = key.split("/");
      const road = input.road.id;
      const f = agreedFigures(
        kept.figures,
        (x) => x.kind === "start-up-cost-line" && x.costLine?.roadId === road && x.costLine.stepId === stepId && x.costLine.lineId === lineId,
      )[0];
      return dayOfMoment(f?.confirmedAt);
    }
    case "savings":
      return dayOfMoment(agreedFigures(kept.figures, (x) => x.kind === "savings-for-start")[0]?.confirmedAt);
    case "income-wanted":
      return kept.incomeWantedOn;
    case "date":
      return kept.targetMonthSetOn;
  }
  // The idea's answers from the intake and the map's picks: no day is kept for each, and none is borrowed.
  return null;
}

function changeFor(id: string): ToldChange {
  const [kind, ...rest] = id.split(":");
  const key = rest.join(":");
  switch (kind) {
    case "skill":
    case "own-skill":
      return { kind: "skills" };
    case "step":
    case "ticks":
      return { kind: "step", stepId: key };
    case "cost-line":
      return { kind: "step", stepId: key.split("/")[0] };
    case "fork":
      return { kind: "compare", forkId: key };
    case "map-pick":
      return { kind: "box", question: `map-pick:${key}` };
    case "savings":
      return { kind: "box", question: "savings" };
    case "date":
      return { kind: "box", question: "date" };
    case "income-wanted":
      return { kind: "none" };
  }
  switch (id) {
    case "idea:structure":
      return { kind: "box", question: "structure" };
    case "idea:equipment":
      return { kind: "box", question: "equipment" };
    // The third-year estimate is asked in the cockpit's box since 2026-10-21 (a picked future has no intake
    // to go back to); the first-year number is still the intake's, or Keep on the what-if.
    case "idea:sales-year-3":
      return { kind: "box", question: "sales-year-3" };
    case "idea:incorporate-at":
      return { kind: "box", question: "incorporate-at" };
    case "idea:figures":
      return { kind: "figures" };
    // The place is asked in the cockpit's box and saved with this idea (S2.5.33, bug 33a, 2026-10-23). Until then
    // its Change opened the intake, whose save is always a new idea: a second idea, the first in the old province.
    case "idea:place":
      return { kind: "box", question: "place" };
  }
  // The kind of venture, work situation, kinds of work, sales and hire-first: the intake asks them.
  return { kind: "intake" };
}

function takeBackFor(id: string, input: RoadEvaluationInput, kept: KeptAnswers): ToldTakeBack {
  if (REQUIRED_ANSWER_IDS.includes(id)) return { kind: "none", why: "required" };
  if (id === "idea:figures") return { kind: "none", why: "figures" };
  if (id.startsWith("idea:") || id.startsWith("map-pick:")) return { kind: "idea" };
  const [kind, ...rest] = id.split(":");
  const key = rest.join(":");
  switch (kind) {
    case "skill":
      return { kind: "skill-mark", skillItemId: key };
    case "own-skill": {
      const mark = input.skillMarks.find((m) => m.skillItemId === null && m.ownLabel?.toLocaleLowerCase() === key);
      return mark?.ownLabel ? { kind: "own-skill", ownLabel: mark.ownLabel } : { kind: "none", why: "no-route" };
    }
    case "step":
      return { kind: "step-status", stepId: key };
    case "ticks":
      return { kind: "step-ticks", stepId: key };
    case "fork":
      return { kind: "ending", forkId: key };
    case "date":
      return { kind: "date" };
    case "cost-line": {
      const [stepId, lineId] = key.split("/");
      const road = input.road.id;
      const ids = agreedFigures(
        kept.figures,
        (x) => x.kind === "start-up-cost-line" && x.costLine?.roadId === road && x.costLine.stepId === stepId && x.costLine.lineId === lineId,
      ).map((f) => f.id);
      return ids.length > 0 ? { kind: "figures", figureIds: ids } : { kind: "none", why: "no-route" };
    }
    case "savings": {
      const ids = agreedFigures(kept.figures, (x) => x.kind === "savings-for-start").map((f) => f.id);
      return ids.length > 0 ? { kind: "figures", figureIds: ids } : { kind: "none", why: "no-route" };
    }
  }
  // The yearly income target: no route takes it back yet, and no screen asks for it yet.
  return { kind: "none", why: "no-route" };
}

// --- Not told yet

export type NotToldId =
  | "date"
  | "savings"
  | "cost-lines"
  | "skills"
  | "structure"
  | "equipment"
  | "sales-year-3"
  | "incorporate-at"
  | `ending:${string}`
  | `map-pick:${string}`;

export interface NotToldRow {
  id: NotToldId;
  question: string;
  unlocks: string;
  /** How it is answered: in the one-question box, or by opening a list or Compare. */
  answer: "box" | "skills" | "money" | "compare";
  forkId?: string;
}

/** Road 0's step that lights from the person's own "I'd incorporate at" number (its id is forever). */
const INCORPORATING_STEP = "stage-3a-incorporation-80k-net";

/**
 * Each answer DotAmi asks for here that the person hasn't given, in the fixed order it asks them, never
 * by importance: the month, the savings, the cost lines not priced, the skills not marked, an ending at
 * each fork of this road with no pick, road 0's map picks still on their default, the structure the map
 * assumes, buying equipment, the third-year sales estimate Incorporating compares, and road 0's own "I'd
 * incorporate at" number.
 */
export function notToldYet(input: RoadEvaluationInput, evaluation: RoadEvaluation): NotToldRow[] {
  const q = words.questions;
  const rows: NotToldRow[] = [];
  const onRoad0 = forksAreTheMapToggles(input.road);
  const notGiven = (id: string) => evaluation.answers.some((a) => a.id === id && !a.given);
  const money = evaluation.gauges.money;

  if (input.targetMonth === null) rows.push({ id: "date", question: q.date.question, unlocks: q.date.unlocks, answer: "box" });
  if (input.agreed.savingsCents === null) rows.push({ id: "savings", question: q.savings.question, unlocks: q.savings.unlocks, answer: "box" });
  if (money.notPricedLines > 0) {
    rows.push({ id: "cost-lines", question: q.costLines.question(money.notPricedLines), unlocks: q.costLines.unlocks, answer: "money" });
  }
  if (evaluation.gauges.skills.notMarked > 0) {
    rows.push({ id: "skills", question: q.skills.question(evaluation.gauges.skills.notMarked), unlocks: q.skills.unlocks, answer: "skills" });
  }
  if (!onRoad0) {
    // Road 0's forks always hold the map's pick; they are asked below, as map picks.
    for (const fork of input.road.forks) {
      if (input.forkPicks[fork.id]) continue;
      rows.push({ id: `ending:${fork.id}`, question: q.ending.question(fork.label), unlocks: q.ending.unlocks, answer: "compare", forkId: fork.id });
    }
  } else {
    for (const fork of input.road.forks) {
      if (!notGiven(`map-pick:${fork.id}`)) continue;
      // A pick no rule reads for this idea isn't asked: when the side the map doesn't hold changes nothing
      // on the road, neither answer would (GST timing for ride-share and taxi driving, where registration
      // is required from the first paid ride whichever side is picked, 2026-10-11). Worked out from the
      // road, as forksToCompare is, so a rule that starts reading the pick brings the question back.
      if (!pickChangesSomething(input, evaluation, fork)) continue;
      rows.push({ id: `map-pick:${fork.id}`, question: q.mapPick.question(fork.label), unlocks: q.mapPick.unlocks, answer: "box", forkId: fork.id });
    }
  }
  if (notGiven("idea:structure")) rows.push({ id: "structure", question: q.structure.question, unlocks: q.structure.unlocks, answer: "box" });
  if (notGiven("idea:equipment")) rows.push({ id: "equipment", question: q.equipment.question, unlocks: q.equipment.unlocks, answer: "box" });
  const incorporating = input.road.steps.find((s) => s.id === INCORPORATING_STEP);
  // Incorporating compares two numbers that are both the person's: their third-year sales estimate and their
  // own "I'd incorporate at". A future picked on Pick a future keeps no estimate, so it is asked here first
  // (docs/ui-spec/cockpit/incorporating-estimate.md, 2026-10-21); until then the step could never light
  // there. Each is asked only where some answer would change the road, so the estimate comes first and the
  // other number once there is an estimate to compare it with.
  if (onRoad0 && incorporating && !hasThirdYearEstimate(input) && salesYear3ChangesSomething(input, evaluation)) {
    rows.push({ id: "sales-year-3", question: q.salesYear3.question, unlocks: q.salesYear3.unlocks, answer: "box" });
  }
  if (onRoad0 && incorporating && (input.scenario.state.incorporateAt ?? null) === null && incorporateAtChangesSomething(input, evaluation)) {
    rows.push({ id: "incorporate-at", question: q.incorporateAt.question, unlocks: q.incorporateAt.unlocks(incorporating.label), answer: "box" });
  }
  return rows;
}

/** Whether the idea holds the person's own third-year sales estimate: above 0 and not on the not-said list. */
function hasThirdYearEstimate(input: RoadEvaluationInput): boolean {
  const profile = input.scenario.profile;
  return profile.targetRevenueY3 > 0 && !isNotSaid(profile, "sales-target-year-3");
}

/**
 * True when a third-year estimate could change the road. The rule that reads it (lib/brain/evaluate.ts
 * computeNodeStates) compares it with the person's own "I'd incorporate at", so the two are tried together:
 * the person's number where they gave one, else the estimate itself as both (an estimate that reaches the
 * number lights the step). With Incorporation timing on the other side every pair leaves the road as it
 * was, so the estimate isn't asked there. On its own, before "I'd incorporate at" is given, the estimate
 * changes nothing; what it opens is that question (its receipt then says nothing changed).
 */
function salesYear3ChangesSomething(input: RoadEvaluationInput, evaluation: RoadEvaluation): boolean {
  const own = input.scenario.state.incorporateAt ?? null;
  const estimate = own ?? 1;
  const tried: Scenario = {
    ...input.scenario,
    profile: withSalesTarget(input.scenario.profile, 3, estimate),
    state: { ...input.scenario.state, incorporateAt: own ?? estimate },
  };
  return roadReceipt(evaluation, evaluateRoad({ ...input, scenario: tried })).length > 0;
}

/**
 * True when some "I'd incorporate at" answer changes something on the road. The rule (lib/brain/evaluate.ts
 * computeNodeStates) reads the Incorporation timing pick and compares the number with the person's own
 * third-year sales estimate: without the estimate, or with the other side picked, every answer leaves the
 * road as it was (the idea harness's finding and the review of PR #182, 2026-10-17). The estimate itself is
 * the answer that would light the most, so it is the one tried, the way pickChangesSomething tries the other
 * side: a rule that starts reading something else is checked the same way.
 */
function incorporateAtChangesSomething(input: RoadEvaluationInput, evaluation: RoadEvaluation): boolean {
  const thirdYear = input.scenario.profile.targetRevenueY3;
  if (!(thirdYear > 0)) return false;
  // The number is put on the scenario directly, not through the box's save (setIncorporateAt): this asks
  // whether the rule reads it, and a broken save must still show up as a question that changes nothing.
  const answered = { ...input.scenario, state: { ...input.scenario.state, incorporateAt: thirdYear } };
  return roadReceipt(evaluation, evaluateRoad({ ...input, scenario: answered })).length > 0;
}

/** True when picking the side of a road 0 fork the map doesn't hold now changes something on the road. */
function pickChangesSomething(input: RoadEvaluationInput, evaluation: RoadEvaluation, fork: Fork): boolean {
  const held = (input.scenario.state.activeBranches as Record<string, string>)[fork.id];
  const other = fork.sides.find((side) => side !== held);
  if (!other) return true;
  return roadReceipt(evaluation, evaluateRoad(withSide(input, fork, other))).length > 0;
}

// --- The what-if

/**
 * A sales number the person typed (the what-if, the third-year estimate, "I'd incorporate at"): whole,
 * non-negative dollars no larger than the save keeps, or the words that say what is wrong with it. Until
 * the review of PR #198 the boxes took any digits, so a number the save refuses stayed on screen and every
 * later save of the idea failed until it was changed.
 */
export function readWholeDollars(text: string): { dollars: number } | { problem: string } {
  const plain = text.trim().replace(/^\$/, "").replace(/,/g, "").trim();
  if (!/^\d+$/.test(plain)) return { problem: words.questions.box.wholeDollars };
  const dollars = Number(plain);
  if (dollars > SALES_DOLLARS_MAX) return { problem: words.questions.box.tooLarge };
  return { dollars };
}

/** What the person typed as a what-if: a whole number of dollars Keep could save, or null. */
export function parseWhatIf(text: string): number | null {
  const read = readWholeDollars(text);
  return "dollars" in read ? read.dollars : null;
}

/**
 * "Keep": the what-if becomes the idea's own first-year sales (the intake's Year 1 field), never a figure.
 * On a picked future it also takes the first-year target off the not-said list (2026-10-21): until then
 * road evaluation read the kept number while the rail and the plan still said "Not said" for it. The
 * third-year target is left as it was.
 */
export function keepWhatIf(scenario: Scenario, dollars: number): Scenario {
  return { ...scenario, profile: withSalesTarget(scenario.profile, 1, dollars) };
}

// --- The idea's own answers, given in the one-question box

/**
 * The person's answer to "Are you buying equipment, a vehicle or tools?". On a future picked on Pick a
 * future equipment starts as not said; the answer takes it off that list, or road evaluation, the save and
 * the read back would all still treat it as unanswered (the idea harness's bug of 2026-10-17).
 */
export function answerEquipment(scenario: Scenario, yes: boolean): Scenario {
  return { ...scenario, profile: { ...withSaid(scenario.profile, "equipment"), capitalPurchasePlanned: yes } };
}

/**
 * The person's own third-year sales estimate, typed in whole dollars in the one-question box or the
 * Incorporating step's panel, saved as the intake's Year 3 box saves it (no agree prompt: it is the person's
 * typed number, never a figure). On a picked future only the third-year target comes off the not-said list.
 */
export function answerSalesYear3(scenario: Scenario, dollars: number): Scenario {
  return { ...scenario, profile: withSalesTarget(scenario.profile, 3, dollars) };
}

// --- Compare the two endings

export type CompareRowId =
  | "steps-on-path"
  | "not-done"
  | "not-on-path"
  | "skills"
  | "legal"
  | "fees"
  | "yours"
  | "not-priced"
  | "only-if"
  | "cards";

const COMPARE_ROWS: readonly CompareRowId[] = ["steps-on-path", "not-done", "not-on-path", "skills", "legal", "fees", "yours", "not-priced", "only-if", "cards"];

export interface CompareView {
  forkId: string;
  forkLabel: string;
  /**
   * The fork's two sides, in the fork's own order: the step's name, and on road 0 the map toggle's own
   * short name for the same side (the two differ: "Mandatory GST registration" is "When the CRA's tests
   * say" on the toggle), else null.
   */
  sides: { stepId: string; label: string; toggleLabel: string | null }[];
  /** The pick that stands, and whether it is the person's (on road 0, a pick still on the map's default isn't). */
  picked: { stepId: string; byPerson: boolean } | null;
  /** The same rows for both sides: counts and sums only. */
  rows: { id: CompareRowId; label: string; values: [string, string] }[];
  /** True when no row differs between the two sides, which the panel says rather than leave it to look broken. */
  sameOnEveryRow: boolean;
}

/** The input with one side of the fork picked: on road 0 the map's toggle, on any other road the future's pick. */
function withSide(input: RoadEvaluationInput, fork: Fork, stepId: string): RoadEvaluationInput {
  const onMap = forksAreTheMapToggles(input.road) && branchDecisions.some((d) => d.id === fork.id);
  const scenario = onMap ? updateScenarioBranch(input.scenario, fork.id as BranchDecisionId, stepId as CFENodeId) : input.scenario;
  return { ...input, scenario, forkPicks: { ...input.forkPicks, [fork.id]: { stepId, from: onMap ? "map" : "you" } } };
}

/** The reasons road evaluation gives a step whose state this fork's pick decides. */
function decidedBy(reason: StepEvaluation["reason"], forkId: string): boolean {
  return (
    (reason.kind === "fork-picked" || reason.kind === "fork-other-side" || reason.kind === "after-other-side") &&
    reason.forkId === forkId
  );
}

/**
 * The forks "Compare the two endings" is offered at (the maintainer's answer of 2026-10-13): only where
 * the fork's own pick, not the rules, puts steps on or off the path. Road evaluation is run once with
 * each side picked; a fork counts when some step's state differs between the two runs and the reason, in
 * either run, is this fork's pick (the side picked, the side not picked, or a step only reached through
 * it). A step the rules colour differently in the two runs doesn't count.
 *
 * Worked out from the road's own steps, never from a list of road ids. On today's Alberta road flipping
 * a toggle does move steps (between "check first" and "not on your path"), but the tax rules do that,
 * colouring the sides whichever is picked, and both columns' step and money counts come out the same
 * (only gstTiming's skills rows differ: the mandatory registration step lists the GST/HST legal
 * requirement, the voluntary one nothing); so none of its forks is offered, and the map's own toggles pick there. On the apprentice road the pick itself puts
 * one ending's steps on the path and the other's off it, so its fork is.
 *
 * The person's step statuses and the what-if are left out of both runs, so the offer is the road's and
 * doesn't come and go as the person marks steps or tries a number: two endings both marked "not for me"
 * are still a fork whose pick decides the steps after them, and a what-if that would move a side's rules
 * colour doesn't bring the offer (both tested on invented roads). In road order.
 */
export function forksToCompare(input: RoadEvaluationInput): Fork[] {
  const base: RoadEvaluationInput = { ...input, whatIf: null, progress: [] };
  return base.road.forks.filter((fork) => {
    const [a, b] = fork.sides.map((side) => evaluateRoad(withSide(base, fork, side)).steps);
    const other = new Map(b!.map((step) => [step.stepId, step]));
    return a!.some((step) => {
      const twin = other.get(step.stepId);
      return twin !== undefined && twin.state !== step.state && (decidedBy(step.reason, fork.id) || decidedBy(twin.reason, fork.id));
    });
  });
}

/**
 * "Compare the two endings": road evaluation run once with each side of the fork picked, and the same
 * rows read from both runs. No score, no total, no order but the fork's own. Null for a fork not on the road.
 *
 * Worked out without the what-if (2026-10-12, after review): a what-if relights the rules and tax cards on
 * both sides alike, and the Compare panel carries no "your what-if" banner, so its counts must be the
 * ones the person's own answers give.
 */
export function compareEndings(withWhatIf: RoadEvaluationInput, forkId: string): CompareView | null {
  const input: RoadEvaluationInput = { ...withWhatIf, whatIf: null };
  const fork = input.road.forks.find((f) => f.id === forkId);
  if (!fork) return null;
  const stepById = new Map(input.road.steps.map((s) => [s.id, s]));
  const kindOf = new Map(input.skillItems.map((item) => [item.id, item.kind]));
  const markOf = new Map(input.skillMarks.flatMap((m) => (m.skillItemId !== null ? [[m.skillItemId, m.mark] as const] : [])));

  const columns = fork.sides.map((side) => {
    const evaluation = evaluateRoad(withSide(input, fork, side));
    const onPath = evaluation.steps.filter((s) => s.state !== "not-on-your-path");
    // Skills listed on the steps on this path, each counted once, with the person's marks.
    const items = [...new Set(onPath.flatMap((s) => stepById.get(s.stepId)?.needs ?? []))];
    const skills: MarkCounts = { listed: items.length, have: 0, learning: 0, notYet: 0, notMarked: 0 };
    for (const id of items) {
      const mark = markOf.get(id);
      if (mark === "have") skills.have += 1;
      else if (mark === "learning") skills.learning += 1;
      else if (mark === "not-yet") skills.notYet += 1;
      else skills.notMarked += 1;
    }
    const m = evaluation.gauges.money;
    const cards = evaluation.rules.unlocks;
    const c = words.compare;
    const values: Record<CompareRowId, string> = {
      "steps-on-path": String(onPath.length),
      "not-done": String(onPath.filter((s) => s.status !== "done").length),
      "not-on-path": String(evaluation.steps.length - onPath.length),
      skills: c.skills(skills.have, skills.learning, skills.notYet, skills.notMarked),
      legal: String(items.filter((id) => kindOf.get(id) === "legal-requirement").length),
      fees: m.officialFeeLines > 0 ? c.money(m.officialFeesCents, m.officialFeeLines) : c.feesNone,
      yours: m.yourNumberLines > 0 ? c.money(m.yourNumbersCents, m.yourNumberLines) : c.yoursNone,
      "not-priced": c.lines(m.notPricedLines),
      "only-if": c.onlyIf(m.onlyIfFeeLines),
      cards: c.cards(cards.filter((u) => u.state === "green").length, cards.filter((u) => u.state === "yellow").length),
    };
    return values;
  });

  const pick = input.forkPicks[fork.id];
  const picked =
    pick && fork.sides.includes(pick.stepId)
      ? {
          stepId: pick.stepId,
          // On road 0 the map always holds a pick; it is the person's only once they clicked it or moved it off the default.
          byPerson: pick.from === "you" || (branchDecisions.some((d) => d.id === fork.id) && isBranchDecided(fork.id as BranchDecisionId, input.scenario.state)),
        }
      : null;

  // On road 0 the fork is one of the map's toggles, whose sides have short names of their own.
  const toggle = forksAreTheMapToggles(input.road) ? branchDecisions.find((d) => d.id === fork.id) : undefined;
  const rows = COMPARE_ROWS.map((id) => ({ id, label: words.compare.rows[id], values: [columns[0][id], columns[1][id]] as [string, string] }));
  return {
    forkId: fork.id,
    forkLabel: fork.label,
    sides: fork.sides.map((id) => ({
      stepId: id,
      label: stepById.get(id)?.label ?? id,
      toggleLabel: toggle?.options.find((o) => o.id === id)?.label ?? null,
    })),
    picked,
    rows,
    sameOnEveryRow: rows.every((r) => r.values[0] === r.values[1]),
  };
}
