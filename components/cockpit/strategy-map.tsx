"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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
import type { Scenario, ScenarioNodeStatus } from "@/lib/scenarios/types";

/**
 * S2.5.4j — the map as tier columns (decided 2026-09-16: the free-form graph was hard to
 * follow visually; a column-per-tier layout replaced it). Deliberately NOT copied from the
 * reference layout: per-card dollar ranges — no engine computes them, so none are shown.
 *
 * 2026-10-11: the map draws whatever road it is given (`lib/engines/roads/v2026/`) and holds no
 * map of its own. Today's ten-step tax map is the road "Starting any business in Alberta", drawn
 * exactly as before, plus three before-you-open steps (2026-10-12): tests/road-map.spec.ts cuts those
 * three cards out and compares the rest of the HTML with what the old map drew.
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
 */

/** A toggle option's id: a step the toggle switches between. */
type BranchOptionId = BranchDecision["options"][number]["id"];

interface StrategyMapProps {
  road: Road;
  scenario: Scenario;
  evaluation: EvaluationResult;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  decidedBranchIds: ReadonlySet<string>;
  onBranchChange: (decision: BranchDecision, optionId: BranchOptionId) => void;
  /** The cockpit's overlays. Left out, the map draws as it did before them. */
  overlays?: Overlays;
  /** Road evaluation's result for each step: its colour, the person's status and the badges. */
  stepEvaluations?: ReadonlyMap<string, StepEvaluation>;
  /** A skill selected in the step panel or the skills list: the steps that don't list it dim. */
  linkedSkillId?: string | null;
}

const STAGE_CHIP: Record<ScenarioNodeStatus, { label: string; className: string }> = {
  active: { label: "now", className: "text-maple bg-maple/15" },
  decision: { label: "your pick", className: "text-amber bg-amber/15" },
  complete: { label: "done", className: "text-sage bg-sage/15" },
  upcoming: { label: "ahead", className: "text-stone bg-rule/30" },
  ghost: { label: "not on your path", className: "text-stone-dim border border-stone-dim" },
};

/**
 * The left accent in words, for the card's accessible name, so the colour is never the only way to
 * tell (2026-10-11). The same words as the legend.
 */
const COLOUR_WORDS: Record<"green" | "yellow" | "gray", string> = {
  green: "applies as answered",
  yellow: "check first",
  gray: "doesn't apply as answered",
};

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
  decidedBranchIds,
  onBranchChange,
  overlays,
  stepEvaluations,
  linkedSkillId = null,
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-5 pt-5">
        <div ref={setWrap} className="relative">
          <div
            className="grid min-w-[820px] gap-3.5"
            style={{ gridTemplateColumns: `repeat(${road.columns.length}, minmax(195px, 1fr))` }}
          >
            {road.columns.map((column, i) => (
              <TierColumn
                key={column.id}
                column={column}
                ordinal={i + 1}
                // The road's checks guarantee every listed step exists; the filter only keeps types honest.
                steps={column.steps.map((id) => stepsById.get(id)).filter((s): s is RoadStep => s !== undefined)}
                scenario={scenario}
                evaluation={evaluation}
                selectedStepId={selectedStepId}
                onSelectStep={onSelectStep}
                decidedBranchIds={decidedBranchIds}
                onBranchChange={onBranchChange}
                focus={focus}
                overlays={overlays}
                stepEvaluations={stepEvaluations}
                linkedSkillId={linkedSkillId}
              />
            ))}
          </div>
          <ArrowOverlay container={wrap} cards={cardsRef.current} columnOf={columnOf} edges={edges} />
        </div>
      </div>
      <Legend
        coverage={evaluation.provinceCoverage}
        // Only once a card is set aside by the person, so the map drawn without the cockpit stays as it was.
        setAsideShown={[...(stepEvaluations?.values() ?? [])].some((s) => s.status === "not-for-me")}
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
const NO_RULE_CHIP = { label: "no rule yet", className: "text-stone border border-rule" };

function TierColumn({
  column,
  ordinal,
  steps,
  scenario,
  evaluation,
  selectedStepId,
  onSelectStep,
  decidedBranchIds,
  onBranchChange,
  focus,
  overlays,
  stepEvaluations,
  linkedSkillId,
}: Omit<StrategyMapProps, "road"> & { column: RoadColumn; ordinal: number; steps: RoadStep[]; focus: MapFocus }) {
  // A fork gets a toggle when it is one of today's two (GST timing, Incorporation timing); the
  // toggle keeps its own option names. Other roads' forks are picked on Compare, later in phase 1.
  const decision = column.forkId ? branchDecisions.find((d) => d.id === column.forkId) : undefined;

  return (
    <section className="flex min-w-0 flex-col gap-3 pb-6">
      <header className="border-b border-rule pb-2.5">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-maple">Tier {ordinal}</p>
        <h3 className="mt-0.5 font-serif text-[15px] font-bold leading-tight tracking-tight text-paper">{column.label}</h3>
        <p className="mt-0.5 text-[10.5px] leading-snug text-stone">{column.summary}</p>
        {overlays && column.forkId ? (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-amber">{cockpitWords.road.forkSplits}</p>
        ) : null}
        {decision ? (
          <BranchToggle
            decision={decision}
            activeOptionId={scenario.state.activeBranches[decision.id]}
            isDefault={!decidedBranchIds.has(decision.id)}
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
        const chip = !ruled ? NO_RULE_CHIP : place.from === "you" ? STATUS_CHIP[place.status] : STAGE_CHIP[place.status];
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
  const ruled = colour !== undefined;
  // The colour in words, so it is never the only way to tell. A step with no colour says so instead.
  const accessibleName =
    colourWords === null
      ? `${step.label}, no rule reads this step yet, shows where it leads`
      : `${step.label}, ${chip.label}, ${colourWords}, ${badges.map((b) => `${b}, `).join("")}opens detail`;
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
      className={`w-full rounded-lg border border-l-[3px] bg-ink3 p-3 text-left transition hover:border-maple-soft ${
        ghost ? "border-dashed opacity-60" : "border-rule"
      } ${ruled ? ACCENT[colour] : "border-l-rule-soft"} ${selected ? "ring-2 ring-maple/30" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-serif text-[14px] font-bold leading-tight tracking-tight text-paper">{step.label}</h4>
        <span className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider ${chip.className}`}>
          {chip.label}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-stone">{step.summary}</p>
      {badges.length > 0 ? (
        <span className="mt-1.5 flex flex-wrap gap-1">
          {badges.map((badge) => (
            <span key={badge} className="rounded-xs border border-rule-soft bg-ink px-1.5 py-0.5 font-mono text-[9.5px] text-paper-dim">
              {badge}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}

/** The one dated fact the evaluator carries for this item, or nothing — never an invented range.
 * (Figures like the $30K line stay in the catalog and reach the screen through `item.why`.) */
function leverFact(item: UnlockItem): string | null {
  return item.expires ? `in use before ${item.expires.slice(0, 4)}` : null;
}

function LeverCard({ item, onClick }: { item: UnlockItem; onClick: () => void }) {
  const dot = item.state === "green" ? "bg-sage" : "bg-amber";
  const label = item.state === "green" ? "applies" : "check first";
  const fact = leverFact(item);
  const partial = worstStatus(item.citations) === "partial";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${item.typeChip}: ${item.title}, ${label}${item.fork ? ", fork" : ""}${partial ? ", partial citation" : ""}${fact ? `, ${fact}` : ""}, opens detail`}
        className="w-full rounded-md border border-rule bg-ink2 px-2.5 py-2 text-left transition hover:border-maple-soft"
      >
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
          <span className="shrink-0 rounded-sm border border-rule px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-stone">
            {item.typeChip}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-paper" title={item.title}>
            {item.title}
          </span>
          {partial ? <StatusChip status="partial" className="shrink-0" /> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[8.5px] uppercase tracking-wider">
          <span className={item.state === "green" ? "text-sage" : "text-amber"}>{label}</span>
          {item.fork ? <span className="text-amber">· fork</span> : null}
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
      <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-stone">
        {decision.label}
        {isDefault ? <span className="ml-1.5 text-amber">· default, not your pick yet</span> : null}
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
              className={`rounded-full px-2 py-1 text-[10px] font-medium ${
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

function Legend({ coverage, setAsideShown }: { coverage: EvaluationResult["provinceCoverage"]; setAsideShown: boolean }) {
  return (
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-rule bg-ink3 px-5 py-2.5 font-mono text-[9px] uppercase tracking-wider text-stone">
      <span className="text-maple">Hover a card: arrows show where it leads — solid next, dashed further on</span>
      <span className="text-stone-dim">Stage chip = where it sits on your path</span>
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-sage" /> applies as answered</span>
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-amber" /> check first — confirm, time-boxed, or one fork away</span>
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-rule" /> doesn&apos;t apply as answered</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-[3px] rounded-xs bg-rule" /> left bar = what your answers support</span>
      {setAsideShown ? <span className="text-stone-dim">{cockpitWords.road.setAsideLegend}</span> : null}
      {coverage === "federal-only" ? <span className="text-amber">federal rules only for this province</span> : null}
      <span className="ml-auto normal-case tracking-normal text-stone-dim">Compass, not GPS — nothing here is a recommendation.</span>
    </footer>
  );
}
