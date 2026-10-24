import { tagsIntersect } from "@/lib/brain/predicates";
import type { ConfirmedFigure, EvaluationResult, NodeStateColor } from "@/lib/brain/types";
import type { JobList } from "@/lib/engines/oasis/v2026";
import {
  costLineAsShown,
  forksAreTheMapToggles,
  generalRoadV2026,
  type CostLineAsShown,
  type Fork,
  type Road,
  type SkillItem,
} from "@/lib/engines/roads/v2026";
import type { SkillMarkValue, StepStatus } from "@/lib/futures/types";
import type { BranchDecisionId } from "@/lib/scenarios/branches";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";
import { isBranchDecided } from "@/lib/scenarios/graph";
import { isNotSaid } from "@/lib/scenarios/not-said";
import { PROVINCES, PROVINCE_LABELS, type Scenario } from "@/lib/scenarios/types";

import type { AgreedPlanning } from "./agreed";
import { futureEdges, futureSet, reachableAvoiding } from "./paths";
import {
  answer,
  because,
  EMPLOYMENT_WORDS,
  STRUCTURE_WORDS,
  VENTURE_TYPE_WORDS,
  type AnswerGroup,
  type AnswerWords,
} from "./words";

/**
 * Road evaluation (docs/architecture/future-cockpit.md § 6, "Road evaluation as built"): one pure
 * function that turns a road and everything the person told DotAmi into each step's state with its
 * reason, and the four gauges as counts and sums. No I/O, no clock, nothing about layout: the caller
 * reads the stored answers (lib/futures/, lib/figures/) and passes them in, and any screen can draw
 * what comes back. tests/road-evaluation.spec.ts fails if this folder imports anything that reads a
 * file, the database, the network or the clock.
 *
 * Its two runs for the same input always give the same result, which is what makes a receipt a
 * difference between two runs (./receipts.ts) rather than text anyone wrote.
 */

/** Today's three card colours, under the names the cockpit uses for them. */
export type StepState = "applies" | "check-first" | "not-on-your-path";

const STATE_OF_COLOUR: Record<NodeStateColor, StepState> = {
  green: "applies",
  yellow: "check-first",
  gray: "not-on-your-path",
};

export interface RoadEvaluationInput {
  road: Road;
  /** True when the person chose this road; false when it is today's general road by default. */
  roadChosen: boolean;
  /** The shared skill list, for the names of the items a road's steps need. */
  skillItems: readonly SkillItem[];
  /** The idea's answers and the map's picks, as the rules read them (its saved map). */
  scenario: Scenario;
  /** The idea's business figures the person agreed to. Never a proposed, taken-back or turned-down one. */
  confirmedFigures?: readonly ConfirmedFigure[];
  /** The ending picked at each fork of this road (lib/futures/future.ts `readFuture`). */
  forkPicks: Readonly<Record<string, { stepId: string; from: "you" | "map" }>>;
  /** Every skill mark the person set (lib/futures/skill-marks.ts). */
  skillMarks: readonly { skillItemId: string | null; ownLabel: string | null; mark: SkillMarkValue }[];
  /**
   * The government's list for the job the person picked as closest to their work
   * (lib/engines/oasis/v2026 `oasisListForJob`), or none. Counted apart on the Skills gauge, never tied to
   * a step: no official source says which step needs which skill on it (decision 5 of 2026-10-11).
   */
  job?: JobList | null;
  /**
   * The person's progress on this road's steps: the status they set and the "done when" lines they
   * ticked, from step progress (lib/futures/step-progress.ts) only. On today's general road (road 0) the
   * map's active, done and set-aside lists are worked out from its toggles, not set by anyone, so they
   * must never be passed in here as statuses (lib/cockpit/view.ts `cockpitInput` doesn't). Since
   * 2026-10-12 the person sets road 0's statuses in the cockpit, kept in step progress like any road's.
   */
  progress: readonly { stepId: string; status: StepStatus | null; doneWhenIds: readonly string[] }[];
  /** The planning numbers the person agreed to (./agreed.ts). */
  agreed: AgreedPlanning;
  /** The person's own month and year, "2029-05", or null. */
  targetMonth: string | null;
  /** "Try first-year sales of $___": whole dollars. Relights the rules for this run; never a figure. */
  whatIf?: { firstYearSalesDollars: number } | null;
  /** The person's own calendar day, YYYY-MM-DD. */
  today: string;
}

/** Why a step is in its state, as data; `because` on the step is the same reason as a sentence. */
export type StepReason =
  | { kind: "not-for-me" }
  /** The road writes the step for some kinds of work only, and the idea has none of these. */
  | { kind: "kinds-of-work"; tags: string[] }
  /** Today's rules decide; `answerIds` are the person's answers that colour depends on (may be none). */
  | { kind: "rules"; answerIds: string[] }
  | { kind: "fork-picked"; forkId: string; from: "you" | "map" }
  | { kind: "fork-other-side"; forkId: string; pickedStepId: string; from: "you" | "map" }
  | { kind: "fork-not-picked"; forkId: string }
  | { kind: "after-other-side"; forkId: string; sideStepId: string; pickedStepId: string; from: "you" | "map" }
  | { kind: "after-fork-not-picked"; forkId: string }
  | { kind: "on-your-road" };

/** Counts of the person's marks on a list of skill items. Unmarked items are counted, never assumed. */
export interface MarkCounts {
  listed: number;
  have: number;
  learning: number;
  notYet: number;
  notMarked: number;
}

export interface StepEvaluation {
  stepId: string;
  state: StepState;
  reason: StepReason;
  /** The reason in one sentence, in the person's own answers. */
  because: string;
  /** The status the person set (doing, done, not for me), or null. */
  status: StepStatus | null;
  /** The "done when" lines ticked, as a count and by id in the step's own order (the step panel's boxes). */
  doneWhen: { ticked: number; total: number; tickedIds: string[] };
  /** What the step needs from the shared skill list, against the person's marks: "needs 3 · you have 2". */
  needs: MarkCounts;
  /** Each cost line as a screen shows it: official fee, your quote, or named and not priced yet. */
  costs: CostLineAsShown[];
  /**
   * Whether the step's cost lines are in the money sums: "counted"; "left-out" while the step is not on
   * the person's path; "waits-on-a-pick" while it hangs on a fork with no pick yet (`waitsOnForkId`).
   */
  money: "counted" | "left-out" | "waits-on-a-pick";
  waitsOnForkId: string | null;
}

/** One answer the evaluation read, in plain words, so a receipt can say which answer made a change. */
export interface ToldAnswer extends AnswerWords {
  /** Stable for the same question: "skill:<id>", "step:<id>", "what-if", "idea:place" … */
  id: string;
  group: AnswerGroup;
  /**
   * False for a default the person hasn't set (a map pick not clicked, the hire-first path while off,
   * the structure the map assumes, buying equipment unanswered); its words say it is a default. A
   * "What you've told DotAmi" list shows only the given ones.
   */
  given: boolean;
  /**
   * True on a mark on an item of the government's list for the picked job (and only there). Such a
   * mark is read here only while its job is picked, but it is kept whatever the pick is, so when the
   * pick changes a receipt doesn't count it coming into or out of view as given or taken back.
   */
  onJobList?: true;
}

export interface RoadGauges {
  steps: { done: number; doing: number; notOnYourPath: number; total: number };
  /**
   * Each skill item the road lists, once; the person's own added skills apart; and, apart again, the
   * government's list for the job the person picked (null when none is picked).
   */
  skills: MarkCounts & {
    /**
     * The same items split by kind: the listed skills, and the legal requirements (an ID number, an
     * agreement, a certificate), which the cockpit never counts as skills (the screen review of 2026-10-23).
     * An item missing from the catalog counts as a listed skill, as the step panel draws it.
     */
    listedSkills: MarkCounts;
    legalRequirements: MarkCounts;
    addedByYou: { have: number; learning: number; notYet: number };
    yourPickOfJob: (MarkCounts & { code: string; label: string }) | null;
  };
  money: {
    officialFeesCents: number;
    officialFeeLines: number;
    /**
     * Official fees that apply only sometimes (`onlyIf`, such as a rewrite after a failed exam): counted,
     * never added to the official fees, since nothing yet lets the person say the condition holds.
     */
    onlyIfFeeLines: number;
    yourNumbersCents: number;
    yourNumberLines: number;
    /** Named lines with no number yet: counted, never added up as $0. */
    notPricedLines: number;
    /** Lines on steps not on the person's path. */
    leftOutLines: number;
    /** Lines waiting on a fork with no pick yet, per fork, in road order. */
    waitingOnForks: { forkId: string; label: string; lines: number }[];
    savingsCents: number | null;
    /** Savings minus (official fees + your numbers): only when there are savings and a line with an amount. */
    differenceCents: number | null;
  };
  /** Calendar months from this month to the person's month; only when they set one. */
  date: { targetMonth: string; monthsFromToday: number } | null;
}

export interface RoadEvaluation {
  roadId: string;
  roadLabel: string;
  /** Every step, in road order (column by column, top to bottom). */
  steps: StepEvaluation[];
  gauges: RoadGauges;
  /** The yearly income the person wants, passed through and compared with nothing. */
  yourTarget: { incomeWantedCents: number } | null;
  /** The what-if this run used, or null (none given, or not a whole, non-negative number of dollars). */
  whatIf: { firstYearSalesDollars: number } | null;
  /** Today's rules and tax cards, from the same run (the Rules & tax overlay). */
  rules: EvaluationResult;
  /** Every answer this run read, in plain words, in a fixed order; defaults are marked `given: false`. */
  answers: ToldAnswer[];
}

/** A rules run with one answer changed, to see which answers a step's colour depends on. */
interface RulesRun {
  scenario: Scenario;
  figures: readonly ConfirmedFigure[];
  whatIf: number | null;
}

interface RulesAnswer {
  answer: ToldAnswer;
  /** The same run with this answer taken away, given each other value it can have, or its fork flipped. */
  variants: RulesRun[];
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function runRules(run: RulesRun, today: string): EvaluationResult {
  // The what-if goes to the rules as a what-if, not written into the idea's own sales, so a card it
  // lights says "your what-if", never "your Y1 revenue target".
  return evaluateScenario(run.scenario, {
    today,
    figures: run.figures,
    ...(run.whatIf === null ? {} : { whatIfFirstYearSales: run.whatIf }),
  });
}

/**
 * The idea's answers the rules read, each with the runs that change it. Only real alternatives are
 * tried: another place, kind of venture, work situation or structure; a toggle flipped; the other side
 * of a map fork; a number, the kinds of work, the figures or the what-if taken away. A number is never
 * replaced by one DotAmi made up.
 */
function rulesAnswers(base: RulesRun): RulesAnswer[] {
  const { scenario } = base;
  const profile = scenario.profile;
  const withProfile = (change: Partial<Scenario["profile"]>): RulesRun => ({
    ...base,
    scenario: { ...scenario, profile: { ...profile, ...change } },
  });
  const out: RulesAnswer[] = [];
  const add = (id: string, words: AnswerWords, variants: RulesRun[], given = true) =>
    out.push({
      answer: { id, group: id.startsWith("map-pick:") ? "map-pick" : id === "what-if" ? "what-if" : "idea", given, ...words },
      variants,
    });

  add(
    "idea:place",
    answer.place(PROVINCE_LABELS[profile.province] ?? profile.province),
    PROVINCES.filter((p) => p !== profile.province).map((province) => withProfile({ province })),
  );
  // A future picked on Pick a future was saved with the intake's starting kind, unasked (2026-10-12):
  // it is tried like any other, but never listed as something the person told DotAmi.
  const typeSaid = !isNotSaid(profile, "venture-type");
  add(
    "idea:venture-type",
    typeSaid
      ? answer.ventureType(VENTURE_TYPE_WORDS[profile.type] ?? profile.type)
      : answer.ventureTypeUnanswered(VENTURE_TYPE_WORDS[profile.type] ?? profile.type),
    (Object.keys(VENTURE_TYPE_WORDS) as (keyof typeof VENTURE_TYPE_WORDS)[])
      .filter((t) => t !== profile.type)
      .map((type) => withProfile({ type })),
    typeSaid,
  );
  add(
    "idea:work-situation",
    answer.workSituation(EMPLOYMENT_WORDS[profile.employmentStatus] ?? profile.employmentStatus),
    (Object.keys(EMPLOYMENT_WORDS) as (keyof typeof EMPLOYMENT_WORDS)[])
      .filter((e) => e !== profile.employmentStatus)
      .map((employmentStatus) => withProfile({ employmentStatus })),
    // "Not said" was never told, so it is not on the list of what the person told DotAmi.
    profile.employmentStatus !== "not-said",
  );
  add(
    "idea:structure",
    answer.structure(STRUCTURE_WORDS[profile.structure] ?? profile.structure, profile.structureSource === "user"),
    (Object.keys(STRUCTURE_WORDS) as (keyof typeof STRUCTURE_WORDS)[])
      .filter((s) => s !== profile.structure)
      .map((structure) => withProfile({ structure, structureSource: "user" })),
    // "assumed" is the map's first rung until the person sets one; undefined is an older complete row.
    profile.structureSource !== "assumed",
  );
  const tags = profile.activityTags ?? [];
  if (tags.length > 0) add("idea:kinds-of-work", answer.kindsOfWork(tags), [withProfile({ activityTags: [] })]);
  // The idea keeps no record of whether the hire-first toggle was touched: on means the person
  // switched it on; off may be the default, so it is worded as a state, not as something they did.
  add("idea:hire-first", answer.hireFirst(profile.hireFirst), [withProfile({ hireFirst: !profile.hireFirst })], profile.hireFirst);
  // Unanswered reads as "no" to the rules (lib/brain), and says so. A picked future's is not said even
  // when a caller filled in "no" for it.
  const equipmentAnswered = profile.capitalPurchasePlanned !== undefined && !isNotSaid(profile, "equipment");
  const equipment = profile.capitalPurchasePlanned ?? false;
  add(
    "idea:equipment",
    equipmentAnswered ? answer.equipment(equipment) : answer.equipmentUnanswered(),
    [withProfile({ capitalPurchasePlanned: !equipment })],
    equipmentAnswered,
  );
  if (profile.targetRevenueY1 > 0) {
    add("idea:sales-year-1", answer.salesYear(1, profile.targetRevenueY1), [withProfile({ targetRevenueY1: 0 })]);
  }
  if (profile.targetRevenueY3 > 0) {
    add("idea:sales-year-3", answer.salesYear(3, profile.targetRevenueY3), [withProfile({ targetRevenueY3: 0 })]);
  }
  if (base.figures.length > 0) add("idea:figures", answer.businessFigures(base.figures.length), [{ ...base, figures: [] }]);
  if (base.whatIf !== null) add("what-if", answer.whatIf(base.whatIf), [{ ...base, whatIf: null }]);
  // The person's own "I'd incorporate at $___", kept with the map's picks: taking it away is the only
  // alternative, since DotAmi has no number of its own for it.
  const incorporateAt = scenario.state.incorporateAt ?? null;
  if (incorporateAt !== null) {
    add("idea:incorporate-at", answer.incorporateAt(incorporateAt), [
      { ...base, scenario: { ...scenario, state: { ...scenario.state, incorporateAt: null } } },
    ]);
  }

  // The map's own picks (today's general road's two forks, kept with the map): flipping one is the
  // other answer the person can give there. A pick the person hasn't clicked is the map's default. The
  // map keeps the person's clicks with its answers (since 2026-10-12, the default side included), and a
  // saved pick off the default was the person's either way (`isBranchDecided`).
  for (const fork of generalRoadV2026.forks) {
    const picked = scenario.state.activeBranches[fork.id];
    if (!fork.sides.includes(picked)) continue;
    const other = fork.sides.find((side) => side !== picked)!;
    const label = (id: string) => generalRoadV2026.steps.find((s) => s.id === id)?.label ?? id;
    // Road 0's fork ids are the map's two branch decisions.
    const byPerson = isBranchDecided(fork.id as BranchDecisionId, scenario.state);
    add(`map-pick:${fork.id}`, answer.mapPick(fork.label, label(picked), byPerson), [
      {
        ...base,
        scenario: {
          ...scenario,
          state: { ...scenario.state, activeBranches: { ...scenario.state.activeBranches, [fork.id]: other as typeof picked } },
        },
      },
    ], byPerson);
  }
  return out;
}

/** A what-if is used only when it is a whole, non-negative number of dollars; anything else is no what-if. */
function usableWhatIf(whatIf: RoadEvaluationInput["whatIf"]): number | null {
  const dollars = whatIf?.firstYearSalesDollars;
  return typeof dollars === "number" && Number.isSafeInteger(dollars) && dollars >= 0 ? dollars : null;
}

function monthsBetween(today: string, month: string): number | null {
  const now = /^(\d{4})-(\d{2})/.exec(today);
  const target = MONTH.exec(month);
  if (!now || !target) return null;
  return Number(target[1]) * 12 + Number(target[2]) - (Number(now[1]) * 12 + Number(now[2]));
}

function countMarks(ids: readonly string[], marks: ReadonlyMap<string, SkillMarkValue>): MarkCounts {
  const unique = [...new Set(ids)];
  const counts: MarkCounts = { listed: unique.length, have: 0, learning: 0, notYet: 0, notMarked: 0 };
  for (const id of unique) {
    const mark = marks.get(id);
    if (mark === "have") counts.have += 1;
    else if (mark === "learning") counts.learning += 1;
    else if (mark === "not-yet") counts.notYet += 1;
    else counts.notMarked += 1;
  }
  return counts;
}

export function evaluateRoad(input: RoadEvaluationInput): RoadEvaluation {
  const { road, today } = input;
  const whatIf = usableWhatIf(input.whatIf);
  const baseRun: RulesRun = { scenario: input.scenario, figures: input.confirmedFigures ?? [], whatIf };
  const rules = runRules(baseRun, today);
  const ruleColours = rules.nodeStates as Record<string, NodeStateColor>;
  const stepById = new Map(road.steps.map((s) => [s.id, s]));
  const stepLabel = (id: string) => stepById.get(id)?.label ?? id;

  // Which answers each rules-coloured step hangs on: run the rules once per changed answer and see
  // which steps change colour. Today's rules take about a hundredth of a millisecond a run.
  const ideaAnswers = rulesAnswers(baseRun);
  const dependsOn = new Map<string, string[]>();
  if (road.steps.some((s) => s.id in ruleColours)) {
    for (const { answer: told, variants } of ideaAnswers) {
      const changes = new Set<string>();
      for (const variant of variants) {
        const colours = runRules(variant, today).nodeStates as Record<string, NodeStateColor>;
        for (const step of road.steps) {
          if (step.id in ruleColours && colours[step.id] !== ruleColours[step.id]) changes.add(step.id);
        }
      }
      for (const stepId of changes) dependsOn.set(stepId, [...(dependsOn.get(stepId) ?? []), told.id]);
    }
  }
  const factOf = new Map(ideaAnswers.map(({ answer: told }) => [told.id, told.fact]));

  // The forks: the side picked, the side not picked, and both sides of a fork with no pick yet.
  const picked = new Map<string, { fork: Fork; from: "you" | "map" }>();
  const notPicked = new Map<string, { fork: Fork; pickedStepId: string; from: "you" | "map" }>();
  const pending = new Map<string, Fork>();
  for (const fork of road.forks) {
    const pick = input.forkPicks[fork.id];
    if (pick && fork.sides.includes(pick.stepId)) {
      picked.set(pick.stepId, { fork, from: pick.from });
      for (const side of fork.sides) {
        if (side !== pick.stepId) notPicked.set(side, { fork, pickedStepId: pick.stepId, from: pick.from });
      }
    } else {
      for (const side of fork.sides) pending.set(side, fork);
    }
  }
  // Walked from where the road begins: the steps still reachable without a side not picked are on the
  // path; those still reachable without any undecided side too are settled.
  const reachable = reachableAvoiding(road, new Set());
  const onPath = reachableAvoiding(road, new Set(notPicked.keys()));
  const settled = reachableAvoiding(road, new Set([...notPicked.keys(), ...pending.keys()]));
  const ahead = (from: string) => futureSet(futureEdges(stepById, from));

  const progressOf = new Map(input.progress.filter((p) => stepById.has(p.stepId)).map((p) => [p.stepId, p]));
  // The kinds of work the idea has (the intake's activity tags, confirmed there), for steps written for
  // some kinds of work only, matched the way the rules match them (`tagsIntersect`), so the road and the
  // rules can never disagree on whether an idea has one. None at all (an idea saved from Pick a future)
  // is none of them.
  const kindsOfWork = input.scenario.profile.activityTags ?? [];
  const hasKindOfWork = (tags: readonly string[]) => tagsIntersect(kindsOfWork, [...tags]);
  const itemMarks = new Map(
    input.skillMarks.flatMap((m) => (m.skillItemId !== null ? [[m.skillItemId, m.mark] as const] : [])),
  );
  const quoteOf = new Map(input.agreed.costLines.map((q) => [`${q.stepId}/${q.lineId}`, q.amountCents]));

  const roadOrder = [...new Set([...road.columns.flatMap((c) => c.steps), ...road.steps.map((s) => s.id)])].filter((id) =>
    stepById.has(id),
  );

  // On road 0 the rules colour every step the person hasn't marked not for me (see `progress`).
  const onRoadZero = forksAreTheMapToggles(road);
  // Whether this road's own forks put a step off the path or leave it waiting on a pick. On another
  // road that reuses a road 0 step, that comes before the rules' colour: the rules know nothing of
  // this road's forks, and a step after the side not picked must not be drawn on the path.
  const forkDecides = (stepId: string) =>
    notPicked.has(stepId) || pending.has(stepId) || (reachable.has(stepId) && !settled.has(stepId));

  const steps: StepEvaluation[] = roadOrder.map((stepId) => {
    const step = stepById.get(stepId)!;
    const progress = progressOf.get(stepId);
    const status = progress?.status ?? null;

    let state: StepState;
    let reason: StepReason;
    let text: string;
    if (status === "not-for-me") {
      // The person's own word beats everything: "not for me" greys a step, it never removes it.
      state = "not-on-your-path";
      reason = { kind: "not-for-me" };
      text = because.notForMe();
    } else if (step.onlyForKindsOfWork && !hasKindOfWork(step.onlyForKindsOfWork.tags)) {
      // The road's own rule (road 0's SR&ED deepening, issue #40): without one of the step's kinds of
      // work it is off the path, saying which kinds of work it needs. It stays on the road and still
      // opens; with one of them, the rules and forks below decide as for any step.
      state = "not-on-your-path";
      reason = { kind: "kinds-of-work", tags: [...step.onlyForKindsOfWork.tags] };
      text = because.kindsOfWork(kindsOfWork, step.onlyForKindsOfWork.tags);
    } else if (stepId in ruleColours && (onRoadZero || !forkDecides(stepId))) {
      state = STATE_OF_COLOUR[ruleColours[stepId]];
      const answerIds = dependsOn.get(stepId) ?? [];
      reason = { kind: "rules", answerIds };
      text = because.rules(state, answerIds.map((id) => factOf.get(id) ?? id));
    } else if (picked.has(stepId)) {
      const { fork, from } = picked.get(stepId)!;
      state = "applies";
      reason = { kind: "fork-picked", forkId: fork.id, from };
      text = because.forkPicked(fork.label, from);
    } else if (notPicked.has(stepId)) {
      const { fork, pickedStepId, from } = notPicked.get(stepId)!;
      state = "not-on-your-path";
      reason = { kind: "fork-other-side", forkId: fork.id, pickedStepId, from };
      text = because.forkOtherSide(fork.label, stepLabel(pickedStepId), from);
    } else if (pending.has(stepId)) {
      const fork = pending.get(stepId)!;
      state = "check-first";
      reason = { kind: "fork-not-picked", forkId: fork.id };
      text = because.forkNotPicked(fork.label);
    } else if (reachable.has(stepId) && !onPath.has(stepId)) {
      // Only reached through a side the person didn't pick: name that side.
      const [sideStepId, side] = [...notPicked].find(([sideId]) => ahead(sideId).has(stepId))!;
      state = "not-on-your-path";
      reason = { kind: "after-other-side", forkId: side.fork.id, sideStepId, pickedStepId: side.pickedStepId, from: side.from };
      text = because.afterOtherSide(stepLabel(sideStepId), side.fork.label, stepLabel(side.pickedStepId), side.from);
    } else if (onPath.has(stepId) && !settled.has(stepId)) {
      const fork = [...pending].find(([sideId]) => ahead(sideId).has(stepId))![1];
      state = "check-first";
      reason = { kind: "after-fork-not-picked", forkId: fork.id };
      text = because.afterForkNotPicked(fork.label);
    } else {
      state = "applies";
      reason = { kind: "on-your-road" };
      text = because.onYourRoad(road.label, input.roadChosen);
    }

    const waitsOn = reason.kind === "fork-not-picked" || reason.kind === "after-fork-not-picked" ? reason.forkId : null;
    return {
      stepId,
      state,
      reason,
      because: text,
      status,
      doneWhen: (() => {
        // Only this step's own lines, in its own order: a stale id from a rewritten step never shows.
        const given = new Set(progress?.doneWhenIds ?? []);
        const tickedIds = step.doneWhen.filter((line) => given.has(line.id)).map((line) => line.id);
        return { ticked: tickedIds.length, total: step.doneWhen.length, tickedIds };
      })(),
      needs: countMarks(step.needs, itemMarks),
      costs: step.costs.map((line) => costLineAsShown(line, quoteOf.get(`${stepId}/${line.id}`))),
      money: state === "not-on-your-path" ? "left-out" : waitsOn !== null ? "waits-on-a-pick" : "counted",
      waitsOnForkId: state === "not-on-your-path" ? null : waitsOn,
    };
  });

  return {
    roadId: road.id,
    roadLabel: road.label,
    steps,
    gauges: gauges(input, road, steps, itemMarks),
    yourTarget: input.agreed.incomeWantedCents === null ? null : { incomeWantedCents: input.agreed.incomeWantedCents },
    whatIf: whatIf === null ? null : { firstYearSalesDollars: whatIf },
    rules,
    answers: [...ideaAnswers.map((a) => a.answer), ...personAnswers(input, road)],
  };
}

function gauges(
  input: RoadEvaluationInput,
  road: Road,
  steps: readonly StepEvaluation[],
  itemMarks: ReadonlyMap<string, SkillMarkValue>,
): RoadGauges {
  const own = input.skillMarks.filter((m) => m.skillItemId === null);
  const roadItems = road.steps.flatMap((s) => s.needs);
  const legal = new Set(input.skillItems.filter((item) => item.kind === "legal-requirement").map((item) => item.id));

  const money: RoadGauges["money"] = {
    officialFeesCents: 0,
    officialFeeLines: 0,
    onlyIfFeeLines: 0,
    yourNumbersCents: 0,
    yourNumberLines: 0,
    notPricedLines: 0,
    leftOutLines: 0,
    waitingOnForks: [],
    savingsCents: input.agreed.savingsCents,
    differenceCents: null,
  };
  const waiting = new Map<string, number>();
  for (const step of steps) {
    if (step.money === "left-out") money.leftOutLines += step.costs.length;
    else if (step.money === "waits-on-a-pick") {
      waiting.set(step.waitsOnForkId!, (waiting.get(step.waitsOnForkId!) ?? 0) + step.costs.length);
    } else {
      for (const line of step.costs) {
        if (line.kind === "official-fee" && line.onlyIf !== undefined) {
          // A fee that applies only sometimes stays out of the total (docs/engines/roads.md).
          money.onlyIfFeeLines += 1;
        } else if (line.kind === "official-fee") {
          money.officialFeesCents += line.amountCents;
          money.officialFeeLines += 1;
        } else if (line.kind === "your-quote") {
          money.yourNumbersCents += line.amountCents;
          money.yourNumberLines += 1;
        } else {
          // A blank is counted as a blank, never added up as $0.
          money.notPricedLines += 1;
        }
      }
    }
  }
  money.waitingOnForks = road.forks.flatMap((fork) =>
    (waiting.get(fork.id) ?? 0) > 0 ? [{ forkId: fork.id, label: fork.label, lines: waiting.get(fork.id)! }] : [],
  );
  // Plain arithmetic, and only on numbers that exist: savings and at least one line with an amount.
  if (money.savingsCents !== null && money.officialFeeLines + money.yourNumberLines > 0) {
    money.differenceCents = money.savingsCents - (money.officialFeesCents + money.yourNumbersCents);
  }

  const months = input.targetMonth === null ? null : monthsBetween(input.today, input.targetMonth);
  return {
    steps: {
      done: steps.filter((s) => s.status === "done").length,
      doing: steps.filter((s) => s.status === "doing").length,
      notOnYourPath: steps.filter((s) => s.state === "not-on-your-path").length,
      total: steps.length,
    },
    skills: {
      ...countMarks(roadItems, itemMarks),
      listedSkills: countMarks(
        roadItems.filter((id) => !legal.has(id)),
        itemMarks,
      ),
      legalRequirements: countMarks(
        roadItems.filter((id) => legal.has(id)),
        itemMarks,
      ),
      addedByYou: {
        have: own.filter((m) => m.mark === "have").length,
        learning: own.filter((m) => m.mark === "learning").length,
        notYet: own.filter((m) => m.mark === "not-yet").length,
      },
      yourPickOfJob: input.job
        ? {
            code: input.job.code,
            label: input.job.label,
            ...countMarks(
              input.job.items.map((item) => item.id),
              itemMarks,
            ),
          }
        : null,
    },
    money,
    date: input.targetMonth !== null && months !== null ? { targetMonth: input.targetMonth, monthsFromToday: months } : null,
  };
}

/** The person's own answers about this road, in plain words, for the receipts. Each one was given. */
function personAnswers(input: RoadEvaluationInput, road: Road): ToldAnswer[] {
  const out: Omit<ToldAnswer, "given">[] = [];
  const stepById = new Map(road.steps.map((s) => [s.id, s]));
  // The items this road lists, and those on the government's list for the person's pick of job.
  const jobItems = input.job?.items ?? [];
  const onRoad = new Set(road.steps.flatMap((s) => s.needs));
  const listed = new Set([...onRoad, ...jobItems.map((item) => item.id)]);
  const itemLabel = new Map([...input.skillItems, ...jobItems].map((item) => [item.id, item.label]));

  for (const fork of road.forks) {
    const pick = input.forkPicks[fork.id];
    // The map's picks are already among the idea's answers; these are the ones made on this road.
    if (pick?.from === "you" && fork.sides.includes(pick.stepId)) {
      out.push({ id: `fork:${fork.id}`, group: "fork", ...answer.forkPick(fork.label, stepById.get(pick.stepId)!.label) });
    }
  }
  if (input.job) out.push({ id: "job", group: "job", ...answer.job(input.job.label) });
  for (const mark of input.skillMarks) {
    if (mark.skillItemId !== null) {
      // Only items this road or the picked job's list has: a mark on another road's item changes nothing here.
      if (!listed.has(mark.skillItemId)) continue;
      const label = itemLabel.get(mark.skillItemId) ?? mark.skillItemId;
      // Read here only because of the pick of job (not one of the road's own items): say so, for the receipts.
      const onJobList = onRoad.has(mark.skillItemId) ? {} : { onJobList: true as const };
      out.push({ id: `skill:${mark.skillItemId}`, group: "skill", ...answer.skill(label, mark.mark, false), ...onJobList });
    } else if (mark.ownLabel !== null) {
      // One skill whatever its capital letters, as the storage keeps it.
      out.push({ id: `own-skill:${mark.ownLabel.toLocaleLowerCase()}`, group: "own-skill", ...answer.skill(mark.ownLabel, mark.mark, true) });
    }
  }
  for (const p of input.progress) {
    const step = stepById.get(p.stepId);
    if (!step) continue;
    if (p.status !== null) {
      out.push({ id: `step:${step.id}`, group: "step", ...answer.stepStatus(step.label, p.status) });
    }
    const ticked = new Set(p.doneWhenIds.filter((id) => step.doneWhen.some((line) => line.id === id))).size;
    if (ticked > 0) out.push({ id: `ticks:${step.id}`, group: "ticks", ...answer.ticks(step.label, ticked, step.doneWhen.length) });
  }
  for (const quote of input.agreed.costLines) {
    const step = stepById.get(quote.stepId);
    const line = step?.costs.find((c) => c.id === quote.lineId && c.kind === "named");
    // A number that isn't a whole, non-negative number of cents is shown as not priced, so it isn't an answer either.
    if (!step || !line || !Number.isSafeInteger(quote.amountCents) || quote.amountCents < 0) continue;
    out.push({ id: `cost-line:${step.id}/${line.id}`, group: "cost-line", ...answer.costLine(line.label, step.label, quote.amountCents) });
  }
  if (input.agreed.savingsCents !== null) out.push({ id: "savings", group: "money", ...answer.savings(input.agreed.savingsCents) });
  if (input.agreed.incomeWantedCents !== null) {
    out.push({ id: "income-wanted", group: "money", ...answer.incomeWanted(input.agreed.incomeWantedCents) });
  }
  if (input.targetMonth !== null && MONTH.test(input.targetMonth)) {
    out.push({ id: "date", group: "date", ...answer.date(input.targetMonth) });
  }
  return out.map((told) => ({ ...told, given: true }));
}
