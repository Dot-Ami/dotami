import { itemsForStep } from "@/lib/brain/node-items";
import type { ConfirmedFigure, UnlockItem } from "@/lib/brain/types";
import type { JobList } from "@/lib/engines/oasis/v2026";
import { forksAreTheMapToggles, roadForPlace, type Road, type RoadStep, type SkillItem } from "@/lib/engines/roads/v2026";
import { formatMoney } from "@/lib/format/money-and-months";
import { BUSINESS_TOTAL_KINDS, COST_LINE_AMOUNT_FROM_LABELS, type FigureView } from "@/lib/figures/types";
import type { PersonFigureView } from "@/lib/futures/person-figures";
import type { SkillMarkValue, StepStatus } from "@/lib/futures/types";
import { agreedPlanning, type RoadEvaluation, type RoadEvaluationInput, type StepEvaluation } from "@/lib/roads";
import { getScenarioNodeStatus } from "@/lib/scenarios/graph";
import type { Scenario, ScenarioNodeStatus } from "@/lib/scenarios/types";

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

/**
 * The first visit (future-cockpit.md § 2, "First visit and return visits"): only Road and Skills on, so the
 * road is what shows. Until the calm first view (2026-10-17, S2.5.30c) Rules & tax started on, the map as it
 * looked before the overlays. A return visit opens on the overlays the person last had on (lib/cockpit/folds.ts).
 */
export const FIRST_OVERLAYS: Overlays = { skills: true, money: false, rules: false };

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
 * The road is drawn for the idea's own place (`roadForPlace`, a-call-12): another province's done-when lines,
 * cost lines and links are left out and counted, so the cockpit and the plan never list them.
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
  /** The government's list for the job the person picked (lib/engines/oasis/v2026), or none. */
  job?: JobList | null;
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
  if (forksAreTheMapToggles(args.road)) {
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
    road: roadForPlace(args.road, args.scenario.profile.province),
    roadChosen: args.roadChosen,
    skillItems: args.skillItems,
    scenario: args.scenario,
    confirmedFigures,
    forkPicks,
    skillMarks: args.skillMarks,
    job: args.job ?? null,
    progress: args.progress,
    agreed: agreedPlanning(args.road.id, args.figures, args.personFigures),
    targetMonth: args.future?.targetMonth ?? null,
    whatIf: null,
    today: args.today,
  };
}

/**
 * The skill the map dims by: the one selected, only while the road drawn for the idea's place lists it. A change of
 * place can leave it out, and with it every row that unselects it, which would leave every card dimmed (second
 * review of #207). The selection itself is kept: back in a place that lists the item, the map dims by it again.
 */
export function linkedSkill(road: Pick<Road, "steps">, selected: string | null): string | null {
  return selected !== null && road.steps.some((step) => step.needs.includes(selected)) ? selected : null;
}

/**
 * The line a step's section shows with nothing drawn in it (second review of #207): that its lines rest on other
 * provinces' pages, when the road drawn for the idea's place left them all out (`leftOutForPlace`), else that none
 * is written yet. The step panel and Your plan ask here, so the two can't say different things.
 */
export function emptySectionLine(step: Pick<RoadStep, "leftOutForPlace">, section: "doneWhen" | "skills" | "costs"): string {
  const left = step.leftOutForPlace;
  if (section === "doneWhen") return left?.doneWhenIds.length ? words.panel.doneWhenNoneForPlace : words.panel.doneWhenNone;
  if (section === "skills") return left?.needs.length ? words.panel.skillsNoneForPlace : words.panel.skillsNone;
  return left?.costs.length ? words.panel.costsNoneForPlace : words.panel.costsNone;
}

/**
 * A road listing no skills: none written yet, or every one left out for the idea's place (`roadForPlace`). For the
 * Skills list (`list`), and the Skills gauge in the goal bar and on Your plan (`gauge`).
 */
export function roadSkillsNone(road: Pick<Road, "steps">): { list: string; gauge: string } {
  return road.steps.some((step) => step.leftOutForPlace?.needs.length)
    ? { list: words.lists.skillsNoneForPlace, gauge: words.gauges.skills.noneListedForPlace }
    : { list: words.lists.skillsNone, gauge: words.gauges.skills.noneListed };
}

/**
 * Where a step sits as its card's chip shows it: the person's own status where they set one, else the
 * place the map works out from its toggles (road 0's lists; a step of another road is "upcoming" there),
 * except that a step the road writes for some kinds of work only is off the path on an idea with none
 * of them (2026-10-13, issue #40).
 * The map, "Next on your road", the Steps gauge and the Rules & tax count all read it from here, so the
 * screen never lists as next a card it calls done or not on your path.
 */
export type MapPlace = { from: "you"; status: StepStatus } | { from: "map"; status: ScenarioNodeStatus };

export function mapPlace(stepId: string, scenario: Scenario, evaluated: StepEvaluation | undefined): MapPlace {
  const status = evaluated?.status ?? null;
  if (status) return { from: "you", status };
  // Off the path by the road's own rule, so the chip says "not on your path" rather than "ahead" and the
  // card is drawn dashed; it is still drawn and still opens. The toggles don't decide it.
  if (evaluated?.reason.kind === "kinds-of-work") return { from: "map", status: "ghost" };
  return { from: "map", status: getScenarioNodeStatus(stepId, scenario) };
}

/** A card drawn dashed with no lever cards: the person set it aside, or the map puts it off the path. */
export function setAsideOnMap(place: MapPlace): boolean {
  return place.from === "you" ? place.status === "not-for-me" : place.status === "ghost";
}

/** A card whose chip says done: the person marked it, or (with no status of theirs) the map worked it out. */
function doneOnMap(place: MapPlace): boolean {
  return place.from === "you" ? place.status === "done" : place.status === "complete";
}

/**
 * "Next on your road": the first steps in road order that are on the person's path and not done or set
 * aside, by the card's own chip, and that road evaluation doesn't put off the path. Road order is the
 * order steps happen, never importance, and the screen says so.
 */
export function nextOnYourRoad(evaluation: RoadEvaluation, scenario: Scenario, count = 3): StepEvaluation[] {
  return evaluation.steps
    .filter((s) => {
      const place = mapPlace(s.stepId, scenario, s);
      return s.state !== "not-on-your-path" && !setAsideOnMap(place) && !doneOnMap(place);
    })
    .slice(0, count);
}

type CostLine = StepEvaluation["costs"][number];

/** An official fee that applies only sometimes (`onlyIf`): counted on its own, never added to a sum. */
function onlyIfFee(line: CostLine): boolean {
  return line.kind === "official-fee" && line.onlyIf !== undefined;
}

/**
 * The badges an overlay puts on one step: "needs 3 · you have 2" and "$1,500 · 1 not priced". The sum is
 * official fees plus the person's agreed numbers, the same lines the Money gauge adds up: a fee that applies
 * only sometimes is counted beside it, as road evaluation counts it, never added in or dropped.
 */
export function stepBadges(step: StepEvaluation, overlays: Overlays): string[] {
  const badges: string[] = [];
  if (overlays.skills && step.needs.listed > 0) badges.push(words.road.needs(step.needs.listed, step.needs.have));
  if (overlays.money && step.costs.length > 0) {
    const parts: string[] = [];
    const priced = step.costs.filter((line) => line.kind !== "named-not-priced" && !onlyIfFee(line));
    const sometimes = step.costs.filter(onlyIfFee).length;
    const blanks = step.costs.filter((line) => line.kind === "named-not-priced").length;
    const pricedCents = priced.reduce((sum, line) => (line.kind === "named-not-priced" ? sum : sum + line.amountCents), 0);
    if (priced.length > 0) parts.push(formatMoney(pricedCents));
    if (sometimes > 0) parts.push(words.road.onlyIf(sometimes));
    // A blank is counted as a blank, never shown as $0.
    if (blanks > 0) parts.push(words.road.notPriced(blanks));
    if (step.money === "waits-on-a-pick") parts.push(words.road.waitsOnPick);
    if (step.money === "left-out") parts.push(words.road.leftOut);
    badges.push(parts.join(" · "));
  }
  return badges;
}

/**
 * The rules and tax cards the map draws, each once: those a step on the road names, from no card the map
 * draws dashed (set aside, or off the path). The Rules & tax switch counts these, and since the pre-release
 * fix of 2026-10-23 so does Compare's "Rules and tax cards" row, run once with each ending picked: until then
 * Compare counted every card the rules lit, so on the apprentice road it said "2 apply" while the switch said
 * "0 cards" (none of that road's steps names a card).
 */
export function rulesCardsOnMap(road: Road, evaluation: RoadEvaluation, scenario: Scenario): UnlockItem[] {
  const evaluated = new Map(evaluation.steps.map((s) => [s.stepId, s]));
  const cards = new Map<string, UnlockItem>();
  for (const step of road.steps) {
    if (setAsideOnMap(mapPlace(step.id, scenario, evaluated.get(step.id)))) continue;
    for (const item of itemsForStep(evaluation.rules.unlocks, step).forThisStage) if (!cards.has(item.id)) cards.set(item.id, item);
  }
  return [...cards.values()];
}

/**
 * The counts on the overlay switches: skills listed and cost lines for the whole road, and the rules and
 * tax cards the map draws (`rulesCardsOnMap`).
 */
export function overlayCounts(
  road: Road,
  evaluation: RoadEvaluation,
  scenario: Scenario,
): { skillsListed: number; costLines: number; rulesCards: number } {
  return {
    skillsListed: evaluation.gauges.skills.listed,
    costLines: road.steps.reduce((n, s) => n + s.costs.length, 0),
    rulesCards: rulesCardsOnMap(road, evaluation, scenario).length,
  };
}

export interface GaugeLines {
  value: string;
  /** Plain lines under the value: counts and sums. */
  lines: string[];
  /** One invitation when a part isn't given yet; never a verdict. */
  invite: string | null;
}

/**
 * The four gauges' words, from one road evaluation. `person` is an invented example person's name
 * (docs/ui-spec/example/_index.md): their own numbers are then called theirs, never the viewer's.
 */
export function gaugeView(evaluation: RoadEvaluation, road: Road, scenario: Scenario, person: string | null = null): Record<GaugeId, GaugeLines> {
  const g = evaluation.gauges;
  const label = (id: string) => road.steps.find((s) => s.id === id)?.label ?? id;

  const next = nextOnYourRoad(evaluation, scenario, 1)[0];
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
  // The person's own skills, then the government's list for their pick of job, each on its own line.
  const job = s.yourPickOfJob;
  const ownLine = [
    ...(own.have + own.learning + own.notYet > 0
      ? [person ? words.example.theirs.ownSkills(person, own.have, own.learning, own.notYet) : words.gauges.skills.own(own.have, own.learning, own.notYet)]
      : []),
    ...(job
      ? [person ? words.example.theirs.job(person, job.have, job.learning, job.notYet, job.listed) : words.gauges.skills.job(job.have, job.learning, job.notYet, job.listed)]
      : []),
  ];
  const skills: GaugeLines =
    s.listed === 0
      ? { value: roadSkillsNone(road).gauge, lines: ownLine, invite: ownLine.length === 0 ? words.gauges.skills.addOwn : null }
      : {
          value: words.gauges.skills.value(s.have, s.learning, s.notYet),
          lines: [words.gauges.skills.notMarked(s.notMarked, s.listed), ...ownLine],
          invite: s.notMarked > 0 ? words.gauges.skills.invite : null,
        };

  const m = g.money;
  const anyLines = road.steps.some((step) => step.costs.length > 0);
  const savingsLine = m.savingsCents === null ? words.gauges.money.noSavings : words.gauges.money.savings(m.savingsCents);
  // Each part only with lines behind it, and its count: no line means no amount, so never "$0 your numbers"
  // for a person who gave none (the same rule as the badges, where a blank is never $0).
  // A number kept on a line the idea's place leaves out was given: with none counted, the part says none is counted
  // for the place, never "not given yet", and a line counts what is kept (third review of #207).
  const keptForPlace = m.notCountedForPlaceLines;
  const moneyParts = [
    ...(m.officialFeeLines > 0 ? [words.gauges.money.fees(m.officialFeesCents, m.officialFeeLines)] : []),
    m.yourNumberLines > 0
      ? person
        ? words.example.theirs.numbers(person, m.yourNumbersCents, m.yourNumberLines)
        : words.gauges.money.yours(m.yourNumbersCents, m.yourNumberLines)
      : keptForPlace > 0
        ? person
          ? words.example.theirs.numbersNoneForPlace(person)
          : words.gauges.money.yoursNoneForPlace
        : person
          ? words.example.theirs.numbersNone(person)
          : words.gauges.money.yoursNone,
  ];
  const money: GaugeLines = {
    value: anyLines ? moneyParts.join(" · ") : words.gauges.money.noLines,
    lines: [
      // A fee that applies only sometimes is in neither part above: said here, so it is never silently dropped.
      ...(m.onlyIfFeeLines > 0 ? [words.gauges.money.onlyIf(m.onlyIfFeeLines)] : []),
      ...(m.notPricedLines > 0 ? [words.gauges.money.notPriced(m.notPricedLines)] : []),
      ...(m.leftOutLines > 0 ? [words.gauges.money.leftOut(m.leftOutLines)] : []),
      ...(keptForPlace > 0
        ? [person ? words.example.theirs.notCountedForPlace(person, keptForPlace) : words.gauges.money.notCountedForPlace(keptForPlace)]
        : []),
      ...m.waitingOnForks.map((w) => words.gauges.money.waiting(w.lines, w.label, w.officialFeesCents, w.officialFeeLines)),
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
