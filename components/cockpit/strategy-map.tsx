"use client";

import { useCallback, useId, useMemo, useRef, useState, type CSSProperties } from "react";

import { FOLD_CONTROL, FoldButton } from "@/components/cockpit/folding";
import { ArrowOverlay } from "@/components/cockpit/map-arrows";
import { StatusChip, worstStatus } from "@/components/shared/citation-links";
import { itemsForStep } from "@/lib/brain/node-items";
import type { EvaluationResult, NodeStateColor, UnlockItem } from "@/lib/brain/types";
import { mapPlace, setAsideOnMap, stepBadges, type Overlays } from "@/lib/cockpit/view";
import { cockpitWords } from "@/lib/cockpit/words";
import type { Road, RoadColumn, RoadStep } from "@/lib/engines/roads/v2026";
import type { StepStatus } from "@/lib/futures/types";
import type { StepEvaluation, StepState } from "@/lib/roads";
import { columnNumbers, futureEdges, futureSet } from "@/lib/roads/paths";
import { branchDecisions, type BranchDecision } from "@/lib/scenarios/branches";
import { isBranchDecided, stageChipFor, type StageChipKind } from "@/lib/scenarios/graph";
import type { Scenario } from "@/lib/scenarios/types";

/**
 * S2.5.4j — the map as tier columns (decided 2026-09-16: the free-form graph was hard to
 * follow visually; a column-per-tier layout replaced it). Deliberately NOT copied from the
 * reference layout: per-card dollar ranges — no engine computes them, so none are shown.
 *
 * 2026-10-11: the map draws whatever road it is given (`lib/engines/roads/v2026/`) and holds no
 * map of its own. Today's ten-step tax map is the road "Starting any business in Alberta", drawn
 * exactly as before, plus four before-you-open steps (three on 2026-10-12, the records step on
 * 2026-10-14): tests/road-map.spec.ts cuts those four cards out and compares the rest of the HTML with
 * what the old map drew.
 *
 * Each column = one column of the road. Inside: a stage card per step the column lists, and under
 * each stage card a lever card per evaluator item relevant to that step (`itemsForNode`). Stage
 * chips say where the step sits on THIS venture's path; lever chips say what the answers given
 * support. Nothing here ranks or recommends.
 *
 * Ruling 2 (same day): hover or select a stage card and arrows show where it leads — the
 * road's own `next`, walked to the end (`map-arrows.tsx`); everything off that future dims.
 *
 * 2026-10-12, the cockpit screen (docs/architecture/future-cockpit.md § 2): given road evaluation's
 * result and the overlays, the cards take their colour from each step's state, their chip from the
 * person's own status where they set one, and the Skills and Money badges; Rules & tax switches the lever
 * cards; a selected skill dims the steps that don't list it. A card the person marked not for me says
 * "set aside by you" in place of its colour's words. Given none of that, the map draws exactly as before
 * (tests/road-map.spec.ts).
 *
 * 2026-10-12, folding and phone width (future-cockpit.md § 2): given `cockpit`, the legend folds with its
 * own button, the road's scrolling area is a region named for a screen reader, and below 768 px each
 * column is the window's width less the margins, the area scrolling sideways one column at a time (scroll
 * snap) at 70 % of the window's height. Without `cockpit` none of that is drawn and the HTML is unchanged.
 * 2026-10-14: from 768 px the road's area keeps at least 12rem of height, so the legend under it never
 * slides under the cockpit's what-if bar (the cockpit's canvas scrolls instead).
 *
 * 2026-10-17, the calm first view (S2.5.30c): in the cockpit, the columns after the first two can fold into
 * one column, "The road ahead · N steps", which shows them (`cockpit.roadAhead`); the folded legend is hidden
 * whole, shown again from the cockpit (since 2026-10-20 an item of the goal bar's Look closer menu). The
 * road's area keeps the clutter limit's
 * "road" mark. Drawn without `cockpit`, the HTML is still unchanged.
 */

/** What the cockpit adds to the map: the legend's fold, and the road ahead's. */
export interface MapInCockpit {
  legendFolded: boolean;
  onToggleLegend: () => void;
  /**
   * The calm first view (2026-10-17): the columns after the first `openColumns` fold into one column, "The
   * road ahead · N steps", which is the button that shows them. Left out, every column shows.
   */
  roadAhead?: { folded: boolean; onShow: () => void; openColumns: number };
}

/** The legend's id, for its fold button's aria-controls. */
export const LEGEND_ID = "cockpit-map-legend";

/** The ids of the columns the road ahead folds (every column after the first `openColumns`). */
export function roadAheadColumnIds(road: Road, openColumns: number): string[] {
  return road.columns.slice(openColumns).map((column) => `cockpit-road-ahead-${column.id}`);
}

/** A toggle option's id: a step the toggle switches between. */
type BranchOptionId = BranchDecision["options"][number]["id"];

interface StrategyMapProps {
  road: Road;
  scenario: Scenario;
  evaluation: EvaluationResult;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onBranchChange: (decision: BranchDecision, optionId: BranchOptionId) => void;
  /** The cockpit's overlays. Left out, the map draws as it did before them. */
  overlays?: Overlays;
  /** Road evaluation's result for each step: its colour, the person's status and the badges. */
  stepEvaluations?: ReadonlyMap<string, StepEvaluation>;
  /** A skill selected in the step panel or the skills list: the steps that don't list it dim. */
  linkedSkillId?: string | null;
  /** Drawn in the cockpit: the folding legend and the phone-width columns. Left out, the map is as before. */
  cockpit?: MapInCockpit;
}

/**
 * The chip's words (lib/scenarios/graph.ts `stageChipFor` decides which). Issue #5, 2026-10-11:
 * "your pick" only on what the person picked; an untouched toggle's side says "default", and the fork
 * drawn on every map says "open choice".
 */
const STAGE_CHIP: Record<StageChipKind, { label: string; className: string }> = {
  "first-stage": { label: cockpitWords.map.chips["first-stage"], className: "text-maple bg-maple/15" },
  "your-pick": { label: cockpitWords.map.chips["your-pick"], className: "text-amber bg-amber/15" },
  default: { label: cockpitWords.map.chips.default, className: "text-stone border border-amber/50" },
  "open-choice": { label: cockpitWords.map.chips["open-choice"], className: "text-stone border border-rule" },
  "starting-point": { label: cockpitWords.map.chips["starting-point"], className: "text-stone bg-rule/30" },
  ahead: { label: cockpitWords.map.chips.ahead, className: "text-stone bg-rule/30" },
  "not-on-your-path": { label: cockpitWords.map.chips["not-on-your-path"], className: "text-stone-dim border border-stone-dim" },
};

/**
 * The left accent in words, for the card's accessible name, so the colour is never the only way to
 * tell (2026-10-11). The same words as the legend.
 */
const COLOUR_WORDS: Record<"green" | "yellow" | "gray", string> = cockpitWords.map.colours;

/** The person's own status as the card's chip, where they set one. */
const STATUS_CHIP: Record<StepStatus, { label: string; className: string }> = {
  doing: { label: cockpitWords.road.statusChip.doing, className: "text-amber bg-amber/15" },
  done: { label: cockpitWords.road.statusChip.done, className: "text-sage bg-sage/15" },
  "not-for-me": { label: cockpitWords.road.statusChip["not-for-me"], className: "text-stone-dim border border-stone-dim" },
};

/** Road evaluation's states as today's three colours (the same meanings: green applies, amber check first). */
const COLOUR_OF_STATE: Record<StepState, NodeStateColor> = {
  applies: "green",
  "check-first": "yellow",
  "not-on-your-path": "gray",
};

/** Left accent from the evaluator's read of the answers: met · plausible · not applicable. */
const ACCENT: Record<"green" | "yellow" | "gray", string> = {
  green: "border-l-sage",
  yellow: "border-l-amber",
  gray: "border-l-rule",
};

export function StrategyMap({
  road,
  scenario,
  evaluation,
  selectedStepId,
  onSelectStep,
  onBranchChange,
  overlays,
  stepEvaluations,
  linkedSkillId = null,
  cockpit,
}: StrategyMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [wrap, setWrap] = useState<HTMLDivElement | null>(null);
  // Stage-card elements by step id, for the arrow overlay to measure. A ref (not state) so
  // registration during render never re-renders; the overlay re-measures on focus change.
  const cardsRef = useRef(new Map<string, HTMLElement>());
  const registerCard = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cardsRef.current.set(id, el);
    else cardsRef.current.delete(id);
  }, []);

  const stepsById = useMemo(() => new Map(road.steps.map((s) => [s.id, s])), [road]);
  const columnByStep = useMemo(() => columnNumbers(road), [road]);
  const columnOf = useCallback((id: string) => columnByStep.get(id) ?? 0, [columnByStep]);

  // Hover wins while the pointer is on a card; the selected card keeps its arrows otherwise.
  const focusId = hoveredId ?? selectedStepId;
  const edges = useMemo(() => (focusId ? futureEdges(stepsById, focusId) : []), [stepsById, focusId]);
  const future = useMemo(() => futureSet(edges), [edges]);

  const focus: MapFocus = { focusId, future, hover: setHoveredId, registerCard };

  // In the cockpit the columns are set by classes, so a phone-width window can give each column the
  // window's width; the number of columns comes in as a CSS variable. Outside it, the inline style as before.
  // The road ahead, folded: the first columns, then one column standing for the rest (they stay on the page,
  // hidden). Only when there is a column to fold.
  const ahead = cockpit?.roadAhead;
  const openColumns = ahead ? Math.max(1, ahead.openColumns) : road.columns.length;
  const aheadFolded = ahead !== undefined && ahead.folded && road.columns.length > openColumns;
  const columnCount = aheadFolded ? openColumns + 1 : road.columns.length;
  const grid = cockpit
    ? {
        className:
          "grid min-w-[820px] gap-3.5 grid-cols-[repeat(var(--road-columns),minmax(195px,1fr))] max-md:grid-cols-[repeat(var(--road-columns),calc(100vw-4.5rem))]",
        style: { "--road-columns": columnCount } as CSSProperties,
      }
    : { className: "grid min-w-[820px] gap-3.5", style: { gridTemplateColumns: `repeat(${columnCount}, minmax(195px, 1fr))` } };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        {...(cockpit
          ? {
              role: "region",
              "aria-label": cockpitWords.folds.roadRegion,
              // One of the cockpit's regions the clutter limit counts (docs/ui-spec/README.md).
              "data-region": "road",
              // Focus can be put here (not reached by Tab): the coach line's Got it hands it to the road as
              // the line goes (components/cockpit/cockpit-page.tsx).
              tabIndex: -1,
              className:
                // From 768 px the area is at least 12rem tall, grown from a zero basis (a percentage basis
                // would make its minimum the height of every card): with the what-if bar open it used to
                // shrink to 20 px, the legend sliding under the bar (2026-10-14).
                "min-h-0 flex-1 overflow-auto px-5 pt-5 md:min-h-48 md:basis-0 max-md:h-[70svh] max-md:flex-none max-md:snap-x max-md:snap-mandatory max-md:scroll-px-5",
            }
          : { className: "min-h-0 flex-1 overflow-auto px-5 pt-5" })}
      >
        <div ref={setWrap} className="relative">
          <div className={grid.className} style={grid.style}>
            {/* One list of children, the folded road ahead appended to it, so the map drawn without the cockpit
                keeps the same element tree, and the same generated ids, as before (tests/road-map.spec.ts). */}
            {[
              ...road.columns.map((column, i) => (
              <TierColumn
                key={column.id}
                column={column}
                ordinal={i + 1}
                // A column of the road ahead: folded, it stays on the page, hidden, behind the column below.
                {...(ahead && i >= openColumns ? { id: `cockpit-road-ahead-${column.id}`, hidden: aheadFolded } : {})}
                // The road's checks guarantee every listed step exists; the filter only keeps types honest.
                steps={column.steps.map((id) => stepsById.get(id)).filter((s): s is RoadStep => s !== undefined)}
                scenario={scenario}
                evaluation={evaluation}
                selectedStepId={selectedStepId}
                onSelectStep={onSelectStep}
                onBranchChange={onBranchChange}
                focus={focus}
                overlays={overlays}
                stepEvaluations={stepEvaluations}
                linkedSkillId={linkedSkillId}
                snap={cockpit !== undefined}
              />
              )),
              ...(aheadFolded && ahead
                ? [
                    <RoadAheadColumn
                      key="cockpit-road-ahead"
                      columns={road.columns.slice(openColumns)}
                      controls={roadAheadColumnIds(road, openColumns).join(" ")}
                      onShow={ahead.onShow}
                    />,
                  ]
                : []),
            ]}
          </div>
          <ArrowOverlay container={wrap} cards={cardsRef.current} columnOf={columnOf} edges={edges} />
        </div>
      </div>
      <Legend
        coverage={evaluation.provinceCoverage}
        // Only once a card is set aside by the person, so the map drawn without the cockpit stays as it was.
        setAsideShown={[...(stepEvaluations?.values() ?? [])].some((s) => s.status === "not-for-me")}
        fold={cockpit}
      />
    </div>
  );
}

/** What the columns need to know about the focused card and its future. */
interface MapFocus {
  focusId: string | null;
  future: ReadonlySet<string>;
  hover: (id: string | null) => void;
  registerCard: (id: string, el: HTMLElement | null) => void;
}

/**
 * A step's colour from today's rules, by step id, or undefined when the rules don't colour it (road
 * 0's before-you-open steps, or a step from another road). Such a step is drawn with no colour at all
 * rather than grey: grey says "doesn't apply as answered", which no rule decided (2026-10-12). Only
 * used when the map is drawn without road evaluation; in the cockpit every step has a state of its own.
 */
function colourOf(evaluation: EvaluationResult, stepId: string): NodeStateColor | undefined {
  const states: Partial<Record<string, NodeStateColor>> = evaluation.nodeStates;
  return states[stepId];
}

/** The chip on a step no rule reads yet: it claims neither a colour nor a place on the person's path. */
const NO_RULE_CHIP = { label: cockpitWords.map.noRule, className: "text-stone border border-rule" };

/** The rules' sentence naming the person's answers behind a step's colour, by step id (today's road only). */
function reasonOf(evaluation: EvaluationResult, stepId: string): string | undefined {
  const reasons: Partial<Record<string, string>> = evaluation.nodeReasons;
  return reasons[stepId];
}

function TierColumn({
  column,
  ordinal,
  steps,
  scenario,
  evaluation,
  selectedStepId,
  onSelectStep,
  onBranchChange,
  focus,
  overlays,
  stepEvaluations,
  linkedSkillId,
  snap,
  id,
  hidden,
}: Omit<StrategyMapProps, "road" | "cockpit"> & {
  column: RoadColumn;
  ordinal: number;
  steps: RoadStep[];
  focus: MapFocus;
  /** In the cockpit on a phone-width window, the road's sideways scroll stops at each column's edge. */
  snap: boolean;
  /** A column of the road ahead (cockpit only): its id, for the fold buttons, and whether it is folded away. */
  id?: string;
  hidden?: boolean;
}) {
  // A fork gets a toggle when it is one of today's two (GST timing, Incorporation timing); the
  // toggle keeps its own option names. Other roads' forks are picked on Compare, later in phase 1.
  const decision = column.forkId ? branchDecisions.find((d) => d.id === column.forkId) : undefined;

  return (
    <section id={id} hidden={hidden || undefined} className={snap ? "flex min-w-0 flex-col gap-3 pb-6 max-md:snap-start" : "flex min-w-0 flex-col gap-3 pb-6"}>
      <header className="border-b border-rule pb-2.5">
        <p className="font-mono text-label uppercase tracking-[0.16em] text-maple">{cockpitWords.map.tier(ordinal)}</p>
        <h3 className="mt-0.5 font-serif text-lead font-bold leading-tight tracking-tight text-paper">{column.label}</h3>
        <p className="mt-0.5 text-small leading-snug text-stone">{column.summary}</p>
        {overlays && column.forkId ? (
          <p className="mt-1 font-mono text-label uppercase tracking-wider text-amber">{cockpitWords.road.forkSplits}</p>
        ) : null}
        {decision ? (
          <BranchToggle
            decision={decision}
            activeOptionId={scenario.state.activeBranches[decision.id]}
            isDefault={!isBranchDecided(decision.id, scenario.state)}
            onChange={(optionId) => onBranchChange(decision, optionId)}
          />
        ) : null}
      </header>

      {steps.map((step) => {
        const evaluated = stepEvaluations?.get(step.id);
        // The person's own status wins the chip; otherwise the map's worked-out place on the path, as before.
        // The same reading decides "Next on your road" and the Rules & tax count (lib/cockpit/view.ts).
        const place = mapPlace(step.id, scenario, evaluated);
        // Road evaluation gives every step a state, the before-you-open steps included. Drawn without it,
        // a step today's rules don't read gets no colour and no place chip (road 0's done-when work).
        const colour = evaluated ? COLOUR_OF_STATE[evaluated.state] : colourOf(evaluation, step.id);
        const ruled = colour !== undefined;
        // On the map's own reading, "your pick" only for what the person picked (`stageChipFor`, issue #5).
        // A place `mapPlace` puts off the path reads "not on your path" whatever the toggles say: a step the
        // road writes for some kinds of work only, on an idea with none of them (issue #40). That card also
        // says why, in road evaluation's sentence.
        const offForKindsOfWork = evaluated?.reason.kind === "kinds-of-work";
        const chip = !ruled
          ? NO_RULE_CHIP
          : place.from === "you"
            ? STATUS_CHIP[place.status]
            : STAGE_CHIP[place.status === "ghost" ? "not-on-your-path" : stageChipFor(step.id, scenario)];
        const ghost = ruled && setAsideOnMap(place);
        // A step the person marked not for me is grey because they said so, not because of the rules: its
        // name says that instead of "doesn't apply as answered".
        const setAsideByYou = place.from === "you" && place.status === "not-for-me";
        const levers = itemsForStep(evaluation.unlocks, step).forThisStage;
        const showLevers = overlays ? overlays.rules : true;
        const badges = overlays && evaluated ? stepBadges(evaluated, overlays) : [];
        const selected = selectedStepId === step.id;
        // While a card is focused, everything that is neither it nor on its future dims; while a skill is
        // selected, every step that doesn't list it dims.
        const dimmed =
          (focus.focusId !== null && focus.focusId !== step.id && !focus.future.has(step.id)) ||
          (linkedSkillId !== null && linkedSkillId !== undefined && !step.needs.includes(linkedSkillId));
        return (
          <div key={step.id} className={`flex flex-col gap-1.5 transition-opacity ${dimmed ? "opacity-35" : ""}`}>
            <StageCard
              step={step}
              chip={chip}
              ghost={ghost}
              reason={offForKindsOfWork ? evaluated.because : reasonOf(evaluation, step.id)}
              colour={colour}
              colourWords={setAsideByYou ? cockpitWords.road.setAside : ruled ? COLOUR_WORDS[colour] : null}
              badges={badges}
              selected={selected}
              onClick={() => onSelectStep(step.id)}
              onHover={(on) => focus.hover(on ? step.id : null)}
              registerCard={(el) => focus.registerCard(step.id, el)}
            />
            {!ghost && showLevers && levers.length > 0 ? (
              <ul className="ml-3 flex flex-col gap-1.5 border-l border-rule-soft pl-3">
                {levers.map((item) => (
                  <LeverCard key={item.id} item={item} onClick={() => onSelectStep(step.id)} />
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function StageCard({
  step,
  chip,
  ghost,
  reason,
  colour,
  colourWords,
  badges,
  selected,
  onClick,
  onHover,
  registerCard,
}: {
  step: RoadStep;
  chip: { label: string; className: string };
  ghost: boolean;
  /** The rules' one sentence on which of the person's answers set this card's colour, if any. */
  reason?: string;
  /** Undefined only when the map is drawn without road evaluation and no rule reads the step. */
  colour: NodeStateColor | undefined;
  /** The left bar in words, for the card's accessible name; null when the card has no colour. */
  colourWords: string | null;
  /** The overlays' badges: drawn under the line, and read out in the card's name. */
  badges: string[];
  selected: boolean;
  onClick: () => void;
  onHover: (on: boolean) => void;
  registerCard: (el: HTMLElement | null) => void;
}) {
  const reasonId = useId();
  const ruled = colour !== undefined;
  // The colour in words, so it is never the only way to tell. A step with no colour says so instead.
  const accessibleName =
    colourWords === null ? cockpitWords.map.cardNameNoRule(step.label) : cockpitWords.map.cardName(step.label, chip.label, colourWords, badges);
  return (
    <button
      ref={registerCard}
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      aria-pressed={selected}
      aria-label={accessibleName}
      // The label replaces the button's text for a screen reader, so the reason line is pointed to
      // as the description; otherwise only sighted people would hear why the card has its colour.
      aria-describedby={reason ? reasonId : undefined}
      className={`w-full rounded-lg border border-l-[3px] bg-ink3 p-3 text-left transition hover:border-maple-soft ${
        ghost ? "border-dashed opacity-60" : "border-rule"
      } ${ruled ? ACCENT[colour] : "border-l-rule-soft"} ${selected ? "ring-2 ring-maple/30" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-serif text-lead font-bold leading-tight tracking-tight text-paper">{step.label}</h4>
        <span className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-label uppercase tracking-wider ${chip.className}`}>
          {chip.label}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-body leading-snug text-stone">{step.summary}</p>
      {reason ? (
        <p id={reasonId} className="mt-1.5 text-small leading-snug text-paper-dim">
          {reason}
        </p>
      ) : null}
      {badges.length > 0 ? (
        <span className="mt-1.5 flex flex-wrap gap-1">
          {badges.map((badge) => (
            <span key={badge} className="rounded-xs border border-rule-soft bg-ink px-1.5 py-0.5 font-mono text-label text-paper-dim">
              {badge}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}

/** The one dated fact the evaluator carries for this item, or nothing — never an invented range.
 * (Figures like the GST/HST line stay in the catalog and reach the screen through `item.why`.) */
function leverFact(item: UnlockItem): string | null {
  return item.expires ? cockpitWords.map.lever.inUseBefore(item.expires.slice(0, 4)) : null;
}

function LeverCard({ item, onClick }: { item: UnlockItem; onClick: () => void }) {
  const dot = item.state === "green" ? "bg-sage" : "bg-amber";
  const label = item.state === "green" ? cockpitWords.map.lever.applies : cockpitWords.map.colours.yellow;
  const fact = leverFact(item);
  const partial = worstStatus(item.citations) === "partial";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={cockpitWords.map.lever.name(item.typeChip, item.title, label, Boolean(item.fork), partial, fact)}
        className="w-full rounded-md border border-rule bg-ink2 px-2.5 py-2 text-left transition hover:border-maple-soft"
      >
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
          <span className="shrink-0 rounded-sm border border-rule px-1 py-0.5 font-mono text-label uppercase tracking-wider text-stone">
            {item.typeChip}
          </span>
          <span className="min-w-0 flex-1 truncate text-body font-semibold text-paper" title={item.title}>
            {item.title}
          </span>
          {partial ? <StatusChip status="partial" className="shrink-0" /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-label uppercase tracking-wider">
          <span className={item.state === "green" ? "text-sage" : "text-amber"}>{label}</span>
          {item.fork ? <span className="text-amber">{cockpitWords.map.lever.fork}</span> : null}
          {fact ? <span className="text-stone-dim">· {fact}</span> : null}
        </div>
      </button>
    </li>
  );
}

export function BranchToggle({
  decision,
  activeOptionId,
  isDefault,
  onChange,
}: {
  decision: BranchDecision;
  activeOptionId: BranchOptionId;
  /** S2.5.4d: true until the person clicks — the active option is a default, and says so. */
  isDefault: boolean;
  onChange: (optionId: BranchOptionId) => void;
}) {
  return (
    <fieldset className="mt-2.5 rounded-md border border-rule bg-ink3/90 p-2">
      <legend className="sr-only">{decision.label}</legend>
      <span className="mb-1 block font-mono text-label uppercase tracking-wider text-stone">
        {decision.label}
        {isDefault ? <span className="ml-1.5 text-amber">{cockpitWords.map.defaultNotPicked}</span> : null}
      </span>
      <div className="flex gap-1">
        {decision.options.map((option) => {
          const isActive = option.id === activeOptionId;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.id)}
              className={`rounded-full px-2 py-1 text-small font-medium ${
                isActive ? "bg-maple text-[#fff8ee]" : "text-stone hover:bg-ink2"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The road ahead, folded (the calm first view, 2026-10-17; future-cockpit.md § 2, "First visit and return
 * visits"): one column in place of the road's later columns, naming them and counting their steps. The whole
 * column is the button that shows them; the folded columns are on the page, hidden.
 */
function RoadAheadColumn({ columns, controls, onShow }: { columns: readonly RoadColumn[]; controls: string; onShow: () => void }) {
  const steps = columns.reduce((n, column) => n + column.steps.length, 0);
  return (
    <section className="flex min-w-0 flex-col pb-6 max-md:snap-start">
      <button
        type="button"
        aria-expanded={false}
        aria-controls={controls}
        aria-label={cockpitWords.folds.roadAhead.showNamed(
          columns.map((column) => column.label),
          steps,
        )}
        {...{ [FOLD_CONTROL]: "roadAhead" }}
        onClick={onShow}
        className="grid content-start gap-1.5 rounded-lg border border-dashed border-rule bg-ink3/60 p-3 text-left transition hover:border-maple-soft"
      >
        <span className="font-mono text-label uppercase tracking-[0.16em] text-maple">{cockpitWords.folds.roadAhead.title(steps)}</span>
        <span className="font-serif text-lead font-bold leading-tight tracking-tight text-paper">
          {cockpitWords.folds.roadAhead.columns(columns.map((column) => column.label))}
        </span>
        <span className="font-mono text-label uppercase tracking-[0.08em] text-stone">
          <span aria-hidden>+ </span>
          {cockpitWords.folds.roadAhead.show}
        </span>
      </button>
    </section>
  );
}

function Legend({
  coverage,
  setAsideShown,
  fold,
}: {
  coverage: EvaluationResult["provinceCoverage"];
  setAsideShown: boolean;
  /** In the cockpit: the legend folds to one line. Left out, the legend is drawn exactly as before. */
  fold?: MapInCockpit;
}) {
  const lines = <LegendLines coverage={coverage} setAsideShown={setAsideShown} />;
  if (!fold) {
    return (
      <footer className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-rule bg-ink3 px-5 py-2.5 font-mono text-label uppercase tracking-wider text-stone">
        {lines}
      </footer>
    );
  }
  // Folded, the whole legend stays on the page, hidden, and the cockpit shows it again from "Show the legend":
  // a button in the road's bottom line from 2026-10-17 (the calm first view), an item of the goal bar's Look
  // closer menu since 2026-10-20; until 2026-10-17 the folded legend was a line of its own with that button.
  // Open, it is a region of its own again.
  return (
    <footer
      data-region="legend"
      role="group"
      aria-label={cockpitWords.folds.legend.title}
      hidden={fold.legendFolded || undefined}
      className="flex items-start gap-3 border-t border-rule bg-ink3 px-5 py-2 font-mono text-label uppercase tracking-wider text-stone"
    >
      <FoldButton folded={false} region="legend" label={cockpitWords.folds.legend.fold} controls={LEGEND_ID} onClick={fold.onToggleLegend} />
      <div id={LEGEND_ID} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1.5 pt-0.5">
        {lines}
      </div>
    </footer>
  );
}

/**
 * The legend's lines: the arrows, the chips, the three colours, and the notes that apply to this map. The
 * words are lib/cockpit/words.ts `map.legend` and `map.colours`, except the last line: the strict word
 * list the words file is checked against (tests/helpers/verdict-words.ts VERDICT_WORDS) refuses the word
 * "recommendation" even in a line that denies one, and the map's recordings hold this line word for
 * word, so it stays here under tests/cockpit-own-words.spec.ts's one allowance until the maintainer
 * picks other words for it (2026-10-17).
 */
function LegendLines({ coverage, setAsideShown }: { coverage: EvaluationResult["provinceCoverage"]; setAsideShown: boolean }) {
  const legend = cockpitWords.map.legend;
  const colours = cockpitWords.map.colours;
  return (
    <>
      <span className="text-maple">{legend.arrows}</span>
      <span className="text-stone-dim">{legend.chip}</span>
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-sage" /> {colours.green}</span>
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-amber" /> {legend.checkFirst}</span>
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-rule" /> {colours.gray}</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-[3px] rounded-xs bg-rule" /> {legend.leftBar}</span>
      {setAsideShown ? <span className="text-stone-dim">{cockpitWords.road.setAsideLegend}</span> : null}
      {coverage === "federal-only" ? <span className="text-amber">{legend.federalOnly}</span> : null}
      <span className="ml-auto normal-case tracking-normal text-stone-dim">Compass, not GPS — nothing here is a recommendation.</span>
    </>
  );
}
