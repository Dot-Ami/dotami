import { itemsForStep } from "@/lib/brain/node-items";
import type { ConfirmedFigure } from "@/lib/brain/types";
import { generalRoadV2026, type Road, type SkillItem } from "@/lib/engines/roads/v2026";
import { formatMoney } from "@/lib/format/money-and-months";
import { BUSINESS_TOTAL_KINDS, COST_LINE_AMOUNT_FROM_LABELS, type FigureView } from "@/lib/figures/types";
import type { PersonFigureView } from "@/lib/futures/person-figures";
import type { SkillMarkValue, StepStatus } from "@/lib/futures/types";
import { agreedPlanning, type RoadEvaluation, type RoadEvaluationInput, type StepEvaluation } from "@/lib/roads";
import type { Scenario } from "@/lib/scenarios/types";

import { cockpitWords as words } from "./words";

/**
 * The cockpit screen's plumbing between what is kept and what is drawn (docs/architecture/future-cockpit.md
 * § 2, "Cockpit screen as built"). Pure: the page reads the stored answers, `cockpitInput` turns them into
 * one road-evaluation input, and the other functions turn the result into the gauges, badges and lists the
 * screen shows. No layout, no clock, no fetch.
 */

/** Which overlays are switched on. Road is always on, so it isn't here. */
export interface Overlays {
  skills: boolean;
  money: boolean;
  rules: boolean;
}

/** The first visit: Rules & tax on (the map as it looked before the overlays), Skills and Money off. */
export const FIRST_OVERLAYS: Overlays = { skills: false, money: false, rules: true };

export type GaugeId = "steps" | "skills" | "money" | "date";

/** What the screen read for one idea (GET /api/futures/<id>); a future not saved yet has none. */
export interface KeptFuture {
  forkPicks: Record<string, { stepId: string; pickedOn: string | null; from: "you" | "map" }>;
  targetMonth: string | null;
}

/**
 * Builds road evaluation's input from what is kept. Two rules live here:
 *  - Only business totals the person agreed to reach the rules; the planning numbers (savings, a cost
 *    line's quote) reach the money sums through `agreedPlanning`, and a proposed number reaches nothing.
 *  - A step's status comes only from step progress, the person's own clicks. The map's active, done and
 *    set-aside lists are worked out from its toggles and are never passed in as statuses.
 */
export function cockpitInput(args: {
  road: Road;
  roadChosen: boolean;
  skillItems: readonly SkillItem[];
  scenario: Scenario;
  figures: readonly FigureView[];
  personFigures: readonly PersonFigureView[];
  future: KeptFuture | null;
  progress: readonly { stepId: string; status: StepStatus | null; doneWhenIds: readonly string[] }[];
  skillMarks: readonly { skillItemId: string | null; ownLabel: string | null; mark: SkillMarkValue }[];
  today: string;
}): RoadEvaluationInput {
  const businessKinds: readonly string[] = BUSINESS_TOTAL_KINDS;
  const confirmedFigures: ConfirmedFigure[] = args.figures
    .filter((f) => f.status === "confirmed" && businessKinds.includes(f.kind))
    .map(({ id, kind, periodStart, periodEnd, amountCents, currency, sourceLabel, sourceRows }) => ({
      id,
      kind,
      periodStart,
      periodEnd,
      amountCents,
      currency,
      sourceLabel,
      sourceRows,
    }));

  // Road 0's forks are the map's toggles, read from the idea as the screen holds it (a click on a toggle
  // shows at once, before the map's autosave lands). Every other road's picks are kept on the future.
  let forkPicks: RoadEvaluationInput["forkPicks"];
  if (args.road.id === generalRoadV2026.id) {
    const branches: Record<string, string> = args.scenario.state.activeBranches;
    forkPicks = Object.fromEntries(
      args.road.forks.flatMap((fork) =>
        fork.sides.includes(branches[fork.id]) ? [[fork.id, { stepId: branches[fork.id], from: "map" as const }]] : [],
      ),
    );
  } else {
    forkPicks = Object.fromEntries(
      Object.entries(args.future?.forkPicks ?? {}).map(([forkId, pick]) => [forkId, { stepId: pick.stepId, from: pick.from }]),
    );
  }

  return {
    road: args.road,
    roadChosen: args.roadChosen,
    skillItems: args.skillItems,
    scenario: args.scenario,
    confirmedFigures,
    forkPicks,
    skillMarks: args.skillMarks,
    progress: args.progress,
    agreed: agreedPlanning(args.road.id, args.figures, args.personFigures),
    targetMonth: args.future?.targetMonth ?? null,
    whatIf: null,
    today: args.today,
  };
}

/**
 * "Next on your road": the first steps in road order that are on the person's path and not marked done
 * or not for me. Road order is the order steps happen, never importance, and the screen says so.
 */
export function nextOnYourRoad(evaluation: RoadEvaluation, count = 3): StepEvaluation[] {
  return evaluation.steps
    .filter((s) => s.state !== "not-on-your-path" && s.status !== "done" && s.status !== "not-for-me")
    .slice(0, count);
}

/** A step's priced sum on the Money overlay: official fees plus the person's agreed numbers. */
function pricedCents(step: StepEvaluation): number {
  return step.costs.reduce((sum, line) => (line.kind === "named-not-priced" ? sum : sum + line.amountCents), 0);
}

/** The badges an overlay puts on one step: "needs 3 · you have 2" and "$1,500 · 1 not priced". */
export function stepBadges(step: StepEvaluation, overlays: Overlays): string[] {
  const badges: string[] = [];
  if (overlays.skills && step.needs.listed > 0) badges.push(words.road.needs(step.needs.listed, step.needs.have));
  if (overlays.money && step.costs.length > 0) {
    const parts: string[] = [];
    const priced = step.costs.filter((line) => line.kind !== "named-not-priced");
    const blanks = step.costs.length - priced.length;
    if (priced.length > 0) parts.push(formatMoney(pricedCents(step)));
    // A blank is counted as a blank, never shown as $0.
    if (blanks > 0) parts.push(words.road.notPriced(blanks));
    if (step.money === "waits-on-a-pick") parts.push(words.road.waitsOnPick);
    if (step.money === "left-out") parts.push(words.road.leftOut);
    badges.push(parts.join(" · "));
  }
  return badges;
}

/** The counts on the overlay switches, for the whole road. */
export function overlayCounts(road: Road, evaluation: RoadEvaluation): { skillsListed: number; costLines: number; rulesCards: number } {
  const cards = new Set<string>();
  for (const step of road.steps) for (const item of itemsForStep(evaluation.rules.unlocks, step).forThisStage) cards.add(item.id);
  return {
    skillsListed: evaluation.gauges.skills.listed,
    costLines: road.steps.reduce((n, s) => n + s.costs.length, 0),
    rulesCards: cards.size,
  };
}

export interface GaugeLines {
  value: string;
  /** Plain lines under the value: counts and sums. */
  lines: string[];
  /** One invitation when a part isn't given yet; never a verdict. */
  invite: string | null;
}

/** The four gauges' words, from one road evaluation. */
export function gaugeView(evaluation: RoadEvaluation, road: Road): Record<GaugeId, GaugeLines> {
  const g = evaluation.gauges;
  const label = (id: string) => road.steps.find((s) => s.id === id)?.label ?? id;

  const next = nextOnYourRoad(evaluation, 1)[0];
  const steps: GaugeLines = {
    value: words.gauges.steps.value(g.steps.done, g.steps.total),
    lines: [
      ...(g.steps.doing > 0 ? [words.gauges.steps.doing(g.steps.doing)] : []),
      next ? words.gauges.steps.next(label(next.stepId)) : words.gauges.steps.noneNext,
    ],
    invite: null,
  };

  const s = g.skills;
  const own = s.addedByYou;
  const ownLine = own.have + own.learning + own.notYet > 0 ? [words.gauges.skills.own(own.have, own.learning, own.notYet)] : [];
  const skills: GaugeLines =
    s.listed === 0
      ? { value: words.gauges.skills.noneListed, lines: ownLine, invite: ownLine.length === 0 ? words.gauges.skills.addOwn : null }
      : {
          value: words.gauges.skills.value(s.have, s.learning, s.notYet),
          lines: [words.gauges.skills.notMarked(s.notMarked, s.listed), ...ownLine],
          invite: s.notMarked > 0 ? words.gauges.skills.invite : null,
        };

  const m = g.money;
  const anyLines = road.steps.some((step) => step.costs.length > 0);
  const savingsLine = m.savingsCents === null ? words.gauges.money.noSavings : words.gauges.money.savings(m.savingsCents);
  const money: GaugeLines = {
    value: anyLines ? words.gauges.money.value(m.officialFeesCents, m.yourNumbersCents) : words.gauges.money.noLines,
    lines: [
      ...(m.notPricedLines > 0 ? [words.gauges.money.notPriced(m.notPricedLines)] : []),
      ...(m.leftOutLines > 0 ? [words.gauges.money.leftOut(m.leftOutLines)] : []),
      ...m.waitingOnForks.map((w) => words.gauges.money.waiting(w.lines, w.label)),
      savingsLine,
      // Road evaluation gives the difference only when there are savings and a line with an amount.
      ...(m.differenceCents !== null ? [words.gauges.money.difference(m.differenceCents)] : []),
    ],
    invite: m.savingsCents === null ? words.gauges.money.invite : null,
  };

  const date: GaugeLines = g.date
    ? { value: words.gauges.date.value(g.date.targetMonth), lines: [words.gauges.date.months(g.date.monthsFromToday)], invite: null }
    : { value: words.gauges.date.notSet, lines: [], invite: words.gauges.date.invite };

  return { steps, skills, money, date };
}

/**
 * The agree prompt's line under a start-up cost: which named line on which step, and where its amount
 * came from. Null for every other kind of figure.
 */
export function costLineNote(roads: readonly Road[], figure: FigureView): string | null {
  if (figure.kind !== "start-up-cost-line" || !figure.costLine) return null;
  const { roadId, stepId, lineId, amountFrom } = figure.costLine;
  const step = roads.find((r) => r.id === roadId)?.steps.find((s) => s.id === stepId);
  const line = step?.costs.find((c) => c.id === lineId);
  if (!step || !line) return null;
  return words.agreeNote(line.label, step.label, COST_LINE_AMOUNT_FROM_LABELS[amountFrom]);
}
