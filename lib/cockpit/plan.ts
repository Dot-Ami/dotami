import type { EngineCitation } from "@/lib/engines/shared/types";
import { howCheckedWords, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import type { CostLineAsShown, SkillItem } from "@/lib/engines/roads/v2026";
import { COST_LINE_AMOUNT_FROM_LABELS } from "@/lib/figures/types";
import { formatMoney } from "@/lib/format/money-and-months";
import type { SkillMarkValue } from "@/lib/futures/types";
import { evaluateRoad, type RoadEvaluationInput, type StepEvaluation } from "@/lib/roads";
import type { BranchDecisionId } from "@/lib/scenarios/branches";
import { isBranchDecided } from "@/lib/scenarios/graph";
import { generalRoadV2026 } from "@/lib/engines/roads/v2026";
import { areaLabel, regionLabel } from "@/lib/front-door/where";

import { dayOfMoment, toldDay, toldRows, type KeptAnswers } from "./told";
import { gaugeView } from "./view";
import { cockpitWords as words } from "./words";

/**
 * Your plan (docs/ui-spec/plan/_index.md; docs/architecture/future-cockpit.md § 2, "Your plan as built";
 * issue #41): one idea's plan, laid out to be read and printed, as data. Pure: the page reads what DotAmi
 * keeps (lib/futures/read-plan.ts), builds the cockpit's own road-evaluation input from it
 * (./view.ts `cockpitInput`), and this turns that into every line the page shows. It runs road evaluation
 * and the told list itself, so the plan's states, sums and rows are the cockpit's, never a second reading.
 *
 * Every sentence comes from ./words.ts (or road evaluation's own words), every amount through
 * lib/format/money-and-months.ts. Nothing is ranked or left out because of what it says: every step of the
 * road is listed, on the path or not. A cost line with no number has no amount here at all, so nothing
 * can print it as $0.
 */

export interface PlanArgs {
  ideaName: string;
  /** The cockpit's input for this idea, from what is kept (./view.ts `cockpitInput`). Any what-if is ignored. */
  input: RoadEvaluationInput;
  /** The days kept with each answer, and the idea's figures in every state (for a quote's day and source). */
  kept: KeptAnswers;
  /** The sentence typed on the front door for this idea, word for word with its day. */
  firstWords: { text: string; saidAt: string } | null;
  /** The person's newest answer to "where do you want to be", word for word with its day. */
  destination: { text: string; saidAt: string } | null;
  /** The yearly income the person agreed to, with the day agreed; a proposed one is never passed. */
  incomeWanted: { amountCents: number; agreedOn: string } | null;
  /** The day the person picked this idea's road, or null. */
  roadChosenOn: string | null;
  /** The day the person picked their job for the government's list, or null. */
  jobPickedOn: string | null;
  /**
   * The person's answers on Pick a future's step 2, Where you are (2026-10-22), each with its day; left out or
   * null when not asked. Shown back as kept; nothing on the road reads them.
   */
  where?: { area: { value: string; setOn: string | null } | null; region: { value: string; setOn: string | null } | null };
  /** The person's own day, YYYY-MM-DD: the day the plan is made. */
  today: string;
}

/** A source as printed: its title, its address (the link's text too), how it was checked, and any words a tool found. */
export interface PlanSource {
  title: string;
  url: string;
  checked: string;
  quotes: readonly string[];
}

export interface PlanCostLine {
  lineId: string;
  label: string;
  /** Null for a named line not priced yet: no amount at all, never $0. */
  amount: string | null;
  kind: string;
  /** A fee's condition, or whose number a quote is and where it came from. */
  note: string | null;
  /** An official fee's source; null for the person's own number and a blank. */
  source: PlanSource | null;
}

export interface PlanStep {
  id: string;
  label: string;
  summary: string;
  status: string;
  state: string;
  because: string;
  doneWhenTitle: string;
  doneWhen: { text: string; ticked: boolean; mark: string; source: PlanSource }[];
  skills: { label: string; mark: string }[];
  /** "n cost lines, under Start-up money", or null for a step with none. */
  costCount: string | null;
  officialLinks: { label: string; url: string }[];
  sources: PlanSource[];
}

export interface PlanView {
  title: string;
  ideaName: string;
  made: string;
  words: { text: string; line: string }[];
  wordsNone: string | null;
  target: string | null;
  road: {
    future: string;
    picked: string;
    /** Your area and your region as you picked them, one line each; empty when neither was asked. */
    where: string[];
    endings: string[];
    gauges: { label: string; value: string; lines: string[] }[];
  };
  steps: { order: string; columns: { label: string; summary: string; steps: PlanStep[] }[] };
  skills: {
    road: { label: string; kind: string; mark: string }[];
    roadNone: string | null;
    own: { label: string; mark: string; day: string }[];
    ownNone: string | null;
    job: { title: string; items: { label: string; mark: string }[]; notMarked: string; attribution: string } | null;
    noJob: string | null;
  };
  money: { sums: string[]; byStep: { step: string; note: string | null; lines: PlanCostLine[] }[]; none: string | null };
  told: { rows: { said: string; day: string; unlocked: string[] }[]; none: string | null };
  notAdvice: string;
}

/** The plan's lines for Where you are: each answer kept, as its drop-down named it, with its day. */
function whereLines(where: PlanArgs["where"], province: string): string[] {
  const lines: string[] = [];
  const area = where?.area ? areaLabel(where.area.value) : null;
  if (area) lines.push(words.plan.whereArea(area, where!.area!.setOn));
  const region = where?.region ? regionLabel(where.region.value, province) : null;
  if (region) lines.push(words.plan.whereRegion(region, where!.region!.setOn));
  return lines;
}

function source(c: EngineCitation): PlanSource {
  return { title: c.title, url: c.url, checked: howCheckedWords(c), quotes: [...toolCheckQuotes(c)] };
}

const markWords = (mark: SkillMarkValue | undefined) => (mark ? words.plan.mark[mark] : words.plan.mark.none);

export function buildPlan(args: PlanArgs): PlanView {
  // The plan is what is kept: a what-if on screen is never part of it.
  const input: RoadEvaluationInput = { ...args.input, whatIf: null };
  const { road, scenario } = input;
  const evaluation = evaluateRoad(input);
  const stepEval = new Map(evaluation.steps.map((s) => [s.stepId, s]));
  const stepLabel = (id: string) => road.steps.find((s) => s.id === id)?.label ?? id;
  const itemById = new Map<string, SkillItem>(input.skillItems.map((item) => [item.id, item]));
  const markOf = new Map(input.skillMarks.flatMap((m) => (m.skillItemId !== null ? [[m.skillItemId, m.mark] as const] : [])));

  // --- The person's words: the idea's own sentence, then the destination when it is another sentence.
  const said: PlanView["words"] = [];
  if (args.firstWords) said.push({ text: args.firstWords.text, line: words.plan.typedFor(args.firstWords.saidAt) });
  if (args.destination && args.destination.text !== args.firstWords?.text) {
    said.push({ text: args.destination.text, line: words.plan.destination(args.destination.saidAt) });
  }

  // --- The road: the goal bar's line, who picked it, each fork's ending in Compare's words.
  const place = scenario.profile.province;
  const roadPlaces: readonly string[] = road.provinces;
  const writtenHere = roadPlaces.includes(place) || roadPlaces.includes("CA");
  const endings = road.forks.map((fork) => {
    const pick = input.forkPicks[fork.id];
    let pickWords: string;
    if (!pick) pickWords = words.compare.nonePicked;
    else if (pick.from === "you") pickWords = words.compare.yourPick(stepLabel(pick.stepId));
    // Road 0's forks are the map's toggles: the person's pick only once they clicked one.
    else if (road.id === generalRoadV2026.id && isBranchDecided(fork.id as BranchDecisionId, scenario.state)) pickWords = words.compare.yourPick(stepLabel(pick.stepId));
    else pickWords = words.compare.mapDefault(stepLabel(pick.stepId));
    return words.plan.ending(fork.label, pickWords);
  });
  const gauges = gaugeView(evaluation, road, scenario);

  // --- Each step, column by column, every one of them.
  const columns = road.columns.map((column) => ({
    label: column.label,
    summary: column.summary,
    steps: column.steps.flatMap((id) => {
      const step = road.steps.find((s) => s.id === id);
      const evaluated = stepEval.get(id);
      return step && evaluated ? [planStep(step, evaluated)] : [];
    }),
  }));

  function planStep(step: (typeof road.steps)[number], evaluated: StepEvaluation): PlanStep {
    const ticked = new Set(evaluated.doneWhen.tickedIds);
    return {
      id: step.id,
      label: step.label,
      summary: step.summary,
      status: evaluated.status ? words.plan.status(words.road.statusChip[evaluated.status]) : words.plan.noStatus,
      state: words.plan.state[evaluated.state],
      because: evaluated.because,
      doneWhenTitle: step.doneWhen.length === 0 ? words.panel.doneWhenNone : words.plan.doneWhen(evaluated.doneWhen.ticked, evaluated.doneWhen.total),
      doneWhen: step.doneWhen.map((line) => ({
        text: line.text,
        ticked: ticked.has(line.id),
        mark: ticked.has(line.id) ? words.plan.ticked : words.plan.notTicked,
        source: source(line.citation),
      })),
      skills: step.needs.flatMap((id) => {
        const item = itemById.get(id);
        return item ? [{ label: item.label, mark: markWords(markOf.get(id)) }] : [];
      }),
      costCount: step.costs.length > 0 ? words.plan.costCount(step.costs.length) : null,
      officialLinks: step.officialLinks.map((link) => ({ label: link.label, url: link.url })),
      sources: step.citations.map(source),
    };
  }

  // --- Skills: the road's items once each, in road order, then the person's own, then the job's list.
  const roadItemIds = [...new Set(road.steps.flatMap((s) => s.needs))].filter((id) => itemById.has(id));
  const ownDay = new Map(args.kept.skillMarks.flatMap((m) => (m.skillItemId === null && m.ownLabel ? [[m.ownLabel, m.markedOn] as const] : [])));
  const own = input.skillMarks.flatMap((m) =>
    m.skillItemId === null && m.ownLabel ? [{ label: m.ownLabel, mark: markWords(m.mark), day: ownDay.get(m.ownLabel) ?? words.told.dayNotKept }] : [],
  );
  const job = input.job ?? null;
  // Names only, and only the items the person marked: the government's ratings are never shown.
  const jobMarked = job ? job.items.filter((item) => markOf.has(item.id)) : [];

  // --- Money: every cost line by step, in road order, in its three kinds.
  const byStep = road.columns
    .flatMap((c) => c.steps)
    .flatMap((id) => {
      const step = road.steps.find((s) => s.id === id);
      const evaluated = stepEval.get(id);
      if (!step || !evaluated || evaluated.costs.length === 0) return [];
      const note =
        evaluated.money === "left-out"
          ? words.panel.costsLeftOut
          : evaluated.money === "waits-on-a-pick" && evaluated.waitsOnForkId
            ? words.panel.costsWaiting(road.forks.find((f) => f.id === evaluated.waitsOnForkId)?.label ?? evaluated.waitsOnForkId)
            : null;
      return [{ step: step.label, note, lines: evaluated.costs.map((line) => costLine(step.id, line)) }];
    });

  function costLine(stepId: string, line: CostLineAsShown): PlanCostLine {
    if (line.kind === "official-fee") {
      return {
        lineId: line.lineId,
        label: line.label,
        amount: formatMoney(line.amountCents),
        kind: words.plan.costKind["official-fee"],
        // The step panel's own words, which add a full stop only when the condition doesn't end in one.
        note: line.onlyIf !== undefined ? words.panel.onlyIf(line.onlyIf) : null,
        source: source(line.citation),
      };
    }
    if (line.kind === "your-quote") {
      // The agreed figure behind it, for its day and where the amount came from (the newest agreed one).
      const agreed = args.kept.figures
        .filter(
          (f) =>
            f.status === "confirmed" &&
            f.kind === "start-up-cost-line" &&
            f.costLine?.roadId === road.id &&
            f.costLine.stepId === stepId &&
            f.costLine.lineId === line.lineId,
        )
        .sort((a, b) => (b.confirmedAt ?? "").localeCompare(a.confirmedAt ?? ""))[0];
      return {
        lineId: line.lineId,
        label: line.label,
        amount: formatMoney(line.amountCents),
        kind: words.plan.costKind["your-quote"],
        // Road evaluation prices a line only from an agreed figure, so one is there; if a hand-edited file
        // left none, the line still shows as the person's, with no day or source made up for it.
        note: agreed?.costLine ? words.plan.quoteNote(dayOfMoment(agreed.confirmedAt), COST_LINE_AMOUNT_FROM_LABELS[agreed.costLine.amountFrom]) : null,
        source: null,
      };
    }
    return { lineId: line.lineId, label: line.label, amount: null, kind: words.plan.costKind["named-not-priced"], note: null, source: null };
  }

  // --- What you've told DotAmi: the cockpit's left list, row for row.
  const told = toldRows(input, evaluation, args.kept).map((row) => ({
    said: row.said,
    day: toldDay(row),
    // The list shows nothing for an answer the map needs, and its own line when nothing changes.
    unlocked: row.unlocked === null ? [] : row.unlocked.length === 0 ? [words.told.nothingChanged] : row.unlocked,
  }));

  return {
    title: words.plan.title,
    ideaName: args.ideaName,
    made: words.plan.made(args.today),
    words: said,
    wordsNone: said.length === 0 ? words.plan.wordsNone : null,
    target: args.incomeWanted ? words.goal.target(args.incomeWanted.amountCents, args.incomeWanted.agreedOn) : null,
    road: {
      future: writtenHere ? words.goal.future(road.label) : words.goal.drawnOnly(road.label, road.provinces, place),
      picked: input.roadChosen ? words.plan.roadChosen(args.roadChosenOn) : words.plan.roadDefault,
      where: whereLines(args.where, input.scenario.profile.province),
      endings: endings.length > 0 ? endings : [words.plan.noForks],
      // The invitations are left out: there is nothing to click on paper.
      gauges: (["steps", "skills", "money", "date"] as const).map((id) => ({
        label: words.gauges[id].label,
        value: gauges[id].value,
        lines: gauges[id].lines,
      })),
    },
    steps: { order: words.plan.order, columns },
    skills: {
      road: roadItemIds.map((id) => {
        const item = itemById.get(id)!;
        return { label: item.label, kind: words.panel.skillKind[item.kind], mark: markWords(markOf.get(id)) };
      }),
      roadNone: roadItemIds.length === 0 ? words.gauges.skills.noneListed : null,
      own,
      ownNone: own.length === 0 ? words.plan.ownNone : null,
      job: job
        ? {
            title: words.plan.job(job.label, job.code, args.jobPickedOn),
            items: jobMarked.map((item) => ({ label: item.label, mark: markWords(markOf.get(item.id)) })),
            notMarked: words.plan.jobNotMarked(job.items.length - jobMarked.length, job.items.length),
            attribution: words.lists.job.attribution,
          }
        : null,
      noJob: job ? null : words.plan.noJob,
    },
    money: {
      sums: [gauges.money.value, ...gauges.money.lines],
      byStep,
      none: byStep.length === 0 ? words.lists.moneyNone : null,
    },
    told: { rows: told, none: told.length === 0 ? words.told.none : null },
    notAdvice: words.plan.notAdvice,
  };
}
