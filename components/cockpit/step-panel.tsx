"use client";

import { useState, type ReactNode } from "react";

import { AmountForm } from "@/components/cockpit/amount-form";
import { CantKeepNote } from "@/components/cockpit/example-mode";
import { ReceiptLines } from "@/components/cockpit/receipt-lines";
import { BranchToggle } from "@/components/cockpit/strategy-map";
import { QuestionBox } from "@/components/cockpit/told-list";
import { Fold, ItemRow, NodeDetailPanel } from "@/components/node-detail-panel";
import { CitationLinks } from "@/components/shared/citation-links";
import { Pill } from "@/components/ui";
import { itemsForStep } from "@/lib/brain/node-items";
import type { EvaluationResult } from "@/lib/brain/types";
import { emptySectionLine, stepRequirementsNone } from "@/lib/cockpit/view";
import { cockpitWords as words } from "@/lib/cockpit/words";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { stepSourcesForPlace, type Road, type RoadStep, type SkillItem } from "@/lib/engines/roads/v2026";
import type { EngineCitation } from "@/lib/engines/shared/types";
import type { CostLineAmountFrom } from "@/lib/figures/types";
import { formatMoney } from "@/lib/format/money-and-months";
import { SKILL_MARKS, STEP_STATUSES, type SkillMarkValue, type StepStatus } from "@/lib/futures/types";
import { landscapeWords } from "@/lib/landscape/words";
import type { StepEvaluation } from "@/lib/roads";
import type { BranchDecision } from "@/lib/scenarios/branches";

/**
 * The step panel (docs/architecture/future-cockpit.md § 1 row 5, § 2 "Cockpit screen as built"): what a
 * person sees and does on one step. It replaces node detail and keeps all of it: on a road 0 step it is
 * node detail with these sections put between the two lines and the cards; on any other road it draws
 * the step's own line, cards and sources the same way.
 *
 * Every click here is one of the person's own answers, saved by the page through the cockpit's routes;
 * a quote is only proposed here and counts once the person agrees to it in the agree prompt.
 */

export interface StepPanelProps {
  road: Road;
  step: RoadStep;
  evaluation: StepEvaluation;
  /** The rules run road evaluation made, for this step's cards. */
  rules: EvaluationResult;
  skillItems: readonly SkillItem[];
  /** The person's mark on each listed skill item, by id. */
  marks: ReadonlyMap<string, SkillMarkValue>;
  selectedSkillId: string | null;
  /** Road 0's toggle for the fork this step is a side of, so it can be flipped from here too. */
  branch: { decision: BranchDecision; activeOptionId: BranchDecision["options"][number]["id"]; isDefault: boolean; onChange: (optionId: BranchDecision["options"][number]["id"]) => void } | null;
  /** False while the idea isn't saved: nothing can be kept, and the controls say so. */
  canSave: boolean;
  /** The last save's refusal, in the server's own words, or null. */
  error: string | null;
  onStatus: (status: StepStatus | null) => void;
  /** Saves the step's ticks; when it returns a promise, the boxes wait for it (see "Done when" below). */
  onTicks: (doneWhenIds: string[]) => Promise<unknown> | void;
  onMark: (skillItemId: string, mark: SkillMarkValue | null) => void;
  onSelectSkill: (skillItemId: string | null) => void;
  /**
   * The person's pick of job, counted: its name, how many items the government's list has and how many
   * the person marked; null when none is picked. Shown under the step's own skills with `onOpenJobList`,
   * which opens the Skills list (to the list, or to the question when none is picked). A panel drawn
   * without `onOpenJobList` shows neither.
   */
  job?: { label: string; listed: number; marked: number } | null;
  onOpenJobList?: () => void;
  /** Proposes the person's number for a named cost line; resolves to an error, or null once the agree prompt opened. */
  onProposeQuote: (lineId: string, amountCents: number, from: CostLineAmountFrom) => Promise<string | null>;
  /** The idea's province code, for the ways of incorporating written for it (road 0's node detail). */
  province: string;
  /** The person's own "I'd incorporate at $___", or null when not given (road 0's node detail). */
  ownNumber: number | null;
  /** Sets or clears that number. */
  onOwnNumberChange: (value: number | null) => void;
  /** Drawn above that number's box: the Incorporating step's estimate box (`ThirdYearEstimate`), from the page. */
  ownNumberLead?: ReactNode;
  onClose: () => void;
  /** The receipt of the last answer given in this panel, or null (part 2, 2026-10-12). */
  receipt?: readonly string[] | null;
  /**
   * Opens "Compare the two endings" on this step's fork; shown only on a step that is a side of one. The
   * page passes it only for a fork Compare is offered at (lib/cockpit/told.ts `forksToCompare`).
   */
  onCompare?: (forkId: string) => void;
  /**
   * Opens "Others in this line of work" (2026-10-17); the page passes it only on a step its road marks as
   * opening a business (`RoadStep.opensABusiness`), as the goal bar offers it on every road.
   */
  onLandscape?: () => void;
}

export function StepPanel(props: StepPanelProps) {
  const { step, rules, onClose, province, ownNumber, onOwnNumberChange, ownNumberLead } = props;
  const items = itemsForStep(rules.unlocks, step);
  const node = cfeCatalogV2026.nodes.find((n) => n.id === step.id);
  const sections = <StepSections {...props} />;
  // The step's sources for the idea's own place, and a line saying how many other provinces' pages were left
  // out (task 28d; on every road since the maintainer's call a-call-12, 2026-10-23), counting the pages the
  // road drawn for this place left out of the step's done-when lines, cost lines and links (`roadForPlace`).
  const sources = stepSourcesForPlace(props.road, step, province);
  const sourcesNote = sources.leftOut > 0 ? words.panel.sourcesOtherProvinces(sources.leftOut) : null;

  return (
    <section aria-label={words.panel.region} className="h-full">
      {node ? (
        <NodeDetailPanel
          node={sourcesNote ? { ...node, citations: sources.shown } : node}
          sourcesNote={sourcesNote}
          items={items}
          province={province}
          // The rules' own sentence naming the person's answers behind this stage's colour (2026-10-11).
          reason={rules.nodeReasons[node.id]}
          ownNumber={ownNumber}
          onOwnNumberChange={onOwnNumberChange}
          ownNumberLead={ownNumberLead}
          onClose={onClose}
        >
          {sections}
        </NodeDetailPanel>
      ) : (
        <OtherRoadStep step={step} citations={sources.shown} sourcesNote={sourcesNote} items={items} onClose={onClose}>
          {sections}
        </OtherRoadStep>
      )}
    </section>
  );
}

/**
 * The Incorporating step's estimate box (docs/ui-spec/cockpit/incorporating-estimate.md, 2026-10-21): the
 * person's own third-year sales estimate, which the step compares with their "I'd incorporate at". Given, it
 * shows the number with "Change your number", as a cost line's quote does; not given (a future picked on
 * Pick a future keeps none), the box asks for it. Saved by the page, which shows the receipt in this panel.
 */
export function ThirdYearEstimate({
  value,
  canSave,
  onSave,
}: {
  /** The estimate in whole dollars, or null when the idea holds none (0, or not said). */
  value: number | null;
  canSave: boolean;
  /** Keeps whole dollars; resolves to an error, or null once kept. */
  onSave: (dollars: number) => Promise<string | null>;
}) {
  const q = words.questions.salesYear3;
  const [changing, setChanging] = useState(false);
  const save = async (dollars: string | number) => {
    const refused = await onSave(Number(dollars));
    if (!refused) setChanging(false);
    return refused;
  };
  return (
    <div role="group" aria-label={q.question} className="mt-4 rounded-lg border border-rule bg-ink2 p-3">
      <p className="text-body leading-5 text-stone">{words.steps.incorporatingBoth}</p>
      {value !== null && !changing ? (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
          <span className="text-lead text-paper">{q.question}</span>
          <span className="font-mono text-lead text-paper">{formatMoney(value * 100)}</span>
          <button type="button" disabled={!canSave} onClick={() => setChanging(true)} className="text-body text-maple hover:underline disabled:opacity-50">
            {words.panel.changeQuote}
          </button>
        </div>
      ) : (
        <div className="mt-1.5">
          <QuestionBox
            title={q.question}
            why={q.why}
            control={{ kind: "dollars", label: q.box, value }}
            canSave={canSave}
            onSave={save}
            // Changing a number given can be left as it was; a box asking for one has nothing to fold.
            onDontKnow={value !== null ? () => setChanging(false) : undefined}
          />
        </div>
      )}
    </div>
  );
}

/** A step from a road other than road 0: its own line, the sections, its cards and its sources. */
function OtherRoadStep({
  step,
  citations,
  sourcesNote,
  items,
  onClose,
  children,
}: {
  step: RoadStep;
  /** The step's sources as drawn for the idea's place, and the line about any left out. */
  citations: readonly EngineCitation[];
  sourcesNote: string | null;
  items: ReturnType<typeof itemsForStep>;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="h-full overflow-y-auto border-l border-rule bg-ink3 p-5 text-body leading-snug">
      <div className="flex items-start justify-between gap-4">
        <h2 className="min-w-0 font-serif text-2xl font-bold leading-tight text-paper">{step.label}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-rule px-2.5 py-1 text-lead text-stone hover:bg-ink2"
          aria-label={words.lists.close}
        >
          ×
        </button>
      </div>
      <p className="mt-3 text-lead leading-6 text-paper">{step.summary}</p>
      {children}
      {items.forThisStage.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {items.forThisStage.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      ) : null}
      <Fold title={words.panel.sources(citations.length)}>
        <CitationLinks citations={[...citations]} />
        {sourcesNote ? <p className="mt-2 text-body text-stone">{sourcesNote}</p> : null}
      </Fold>
    </aside>
  );
}

const heading = "mb-1.5 font-mono text-label uppercase tracking-[0.14em] text-stone-dim";
const toggle = (on: boolean) =>
  `rounded-full border px-2.5 py-1 text-body font-medium disabled:opacity-50 ${
    on ? "border-maple bg-maple text-[#fff8ee]" : "border-rule text-stone hover:bg-ink2"
  }`;

function StepSections({
  road,
  step,
  evaluation,
  skillItems,
  marks,
  selectedSkillId,
  branch,
  canSave,
  error,
  onStatus,
  onTicks,
  onMark,
  onSelectSkill,
  onProposeQuote,
  receipt,
  onCompare,
  onLandscape,
  job = null,
  onOpenJobList,
}: StepPanelProps) {
  const [quoting, setQuoting] = useState<string | null>(null);
  // Each save sends the step's whole list of ticks on the lines drawn here, built from what was last read back (a
  // tick on a line this place leaves out is kept: lib/futures/types.ts `ticksToSave`). A second tick
  // before that read-back would send a list without the first, so the boxes wait until it lands.
  // While they wait they show the list just sent, so a click ticks the box at once; once the save is
  // read back (or refused, with the reason shown above) they show what is kept again, so a refused
  // tick never stays on screen. Kept per step: the person can open another step meanwhile.
  const [pending, setPending] = useState<{ stepId: string; ids: string[] } | null>(null);
  async function tick(doneWhenIds: string[]) {
    setPending({ stepId: step.id, ids: doneWhenIds });
    try {
      await onTicks(doneWhenIds);
    } finally {
      setPending(null);
    }
  }
  const ticking = pending !== null;
  const fork = road.forks.find((f) => f.sides.includes(step.id));
  const pickedSide =
    evaluation.reason.kind === "fork-picked"
      ? step.id
      : evaluation.reason.kind === "fork-other-side"
        ? evaluation.reason.pickedStepId
        : null;
  const ticked = new Set(evaluation.doneWhen.tickedIds);
  // What the boxes show: the list on its way for this step, else what is kept.
  const shown = pending?.stepId === step.id ? new Set(pending.ids) : ticked;
  const itemById = new Map(skillItems.map((item) => [item.id, item]));
  // The step's needs in its own order, split by kind: legal requirements, then listed skills.
  const needed = step.needs.flatMap((id) => {
    const item = itemById.get(id);
    return item ? [item] : [];
  });
  const requirements = needed.filter((item) => item.kind === "legal-requirement");
  const listedSkills = needed.filter((item) => item.kind !== "legal-requirement");
  const requirementsLeftOut = requirements.length === 0 ? stepRequirementsNone(step, skillItems) : null;
  const needRow = (item: SkillItem) => (
    <SkillRow
      key={item.id}
      item={item}
      mark={marks.get(item.id) ?? null}
      selected={selectedSkillId === item.id}
      canSave={canSave}
      onMark={(mark) => onMark(item.id, mark)}
      onSelect={() => onSelectSkill(selectedSkillId === item.id ? null : item.id)}
    />
  );

  return (
    <div className="mt-5 space-y-5">
      {!canSave ? <CantKeepNote className="rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2 text-body text-amber" /> : null}
      {error ? (
        <p role="alert" className="rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2 text-body text-amber">
          {error}
        </p>
      ) : null}
      {receipt ? <ReceiptLines lines={receipt} /> : null}

      <div>
        <h3 className={heading}>{words.panel.whyColour}</h3>
        <p className="text-body leading-5 text-paper-dim">{evaluation.because}</p>
      </div>

      {fork ? (
        <div>
          <h3 className={heading}>{words.panel.fork}</h3>
          {branch ? (
            <BranchToggle decision={branch.decision} activeOptionId={branch.activeOptionId} isDefault={branch.isDefault} onChange={branch.onChange} />
          ) : (
            <p className="text-body text-paper-dim">
              {pickedSide ? words.panel.forkPicked(road.steps.find((s) => s.id === pickedSide)?.label ?? pickedSide) : words.panel.forkNotPicked}
            </p>
          )}
          {onCompare ? (
            <Pill className="mt-2" size="small" variant="ghost" onClick={() => onCompare(fork.id)}>
              {words.compare.openAtFork}
            </Pill>
          ) : null}
        </div>
      ) : null}

      {/* On the step where a business of one's own opens: the same panel the goal bar opens. */}
      {onLandscape ? (
        <div>
          <Pill size="small" variant="ghost" onClick={onLandscape}>
            {landscapeWords.open}
          </Pill>
        </div>
      ) : null}

      <div>
        <h3 className={heading}>{words.panel.status}</h3>
        <div className="flex flex-wrap gap-1.5">
          {STEP_STATUSES.map((status) => {
            const on = evaluation.status === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={on}
                disabled={!canSave}
                onClick={() => onStatus(on ? null : status)}
                className={toggle(on)}
              >
                {words.panel.statusButtons[status]}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-small text-stone-dim">{words.panel.statusHelp}</p>
      </div>

      <div>
        <h3 className={heading}>{words.panel.doneWhen}</h3>
        {step.doneWhen.length === 0 ? (
          <p className="text-body text-stone">{emptySectionLine(step, "doneWhen")}</p>
        ) : (
          <>
            <p className="mb-1.5 font-mono text-small text-stone">{words.panel.doneWhenTicked(evaluation.doneWhen.ticked, evaluation.doneWhen.total)}</p>
            <ul className="space-y-2">
              {step.doneWhen.map((line) => {
                const on = shown.has(line.id);
                const boxId = `done-when-${step.id}-${line.id}`;
                return (
                  <li key={line.id} className="rounded-sm border border-rule-soft bg-ink2 p-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        id={boxId}
                        checked={on}
                        disabled={!canSave || ticking}
                        onChange={() => void tick(on ? [...ticked].filter((id) => id !== line.id) : [...ticked, line.id])}
                        className="mt-0.5 accent-[#c2593a]"
                      />
                      <label htmlFor={boxId} className="text-body leading-5 text-paper">
                        {line.text}
                      </label>
                    </div>
                    <div className="mt-1.5 pl-5">
                      <CitationLinks citations={[line.citation]} compact />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* What the step needs that isn't a skill (an ID number, an agreement): its legal requirements, under a
          heading of their own above the skills (the screen review of 2026-10-23 found "Alberta Student Number"
          listed as a skill). Drawn only on a step that has one, or whose every one the idea's place left out,
          which it then says (`stepRequirementsNone`: road 1's Alberta items, seen from Ontario). */}
      {requirements.length > 0 || requirementsLeftOut ? (
        <div>
          <h3 className={heading}>{words.panel.whatItNeeds}</h3>
          {requirementsLeftOut ? (
            <p className="text-body text-stone">{requirementsLeftOut}</p>
          ) : (
            <ul className="space-y-2">{requirements.map(needRow)}</ul>
          )}
        </div>
      ) : null}

      <div>
        <h3 className={heading}>{words.panel.skills}</h3>
        {listedSkills.length === 0 ? (
          <p className="text-body text-stone">{emptySectionLine(step, "skills", skillItems)}</p>
        ) : (
          <ul className="space-y-2">{listedSkills.map(needRow)}</ul>
        )}
        {/* The government's list for the person's pick of job belongs to the job, not to a step (no
            official source ties one of its skills to a step), so the panel only counts it and opens it. */}
        {onOpenJobList ? (
          <div className="mt-2 text-body text-stone">
            <p>{job ? words.panel.jobLine(job.label, job.listed, job.marked) : words.panel.noJob}</p>
            <Pill className="mt-1" size="small" variant="ghost" onClick={onOpenJobList}>
              {job ? words.panel.openJobList : words.panel.pickJob}
            </Pill>
          </div>
        ) : null}
      </div>

      <div>
        <h3 className={heading}>{words.panel.costs}</h3>
        {evaluation.costs.length === 0 ? (
          <p className="text-body text-stone">{emptySectionLine(step, "costs")}</p>
        ) : (
          <>
            {evaluation.money === "left-out" ? <p className="mb-1.5 text-body text-stone">{words.panel.costsLeftOut}</p> : null}
            {evaluation.money === "waits-on-a-pick" && evaluation.waitsOnForkId ? (
              <p className="mb-1.5 text-body text-amber">
                {words.panel.costsWaiting(road.forks.find((f) => f.id === evaluation.waitsOnForkId)?.label ?? evaluation.waitsOnForkId)}
              </p>
            ) : null}
            <ul className="space-y-2">
              {evaluation.costs.map((line) => {
                const catalogLine = step.costs.find((c) => c.id === line.lineId);
                return (
                  <li key={line.lineId} className="rounded-sm border border-rule-soft bg-ink2 p-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
                      <span className="text-body text-paper">{line.label}</span>
                      {/* A blank has no amount at all, never $0: its kind says it isn't priced yet. */}
                      <span className="font-mono text-body text-paper">{line.kind === "named-not-priced" ? "" : formatMoney(line.amountCents)}</span>
                      <span className={`font-mono text-label uppercase tracking-wider ${line.kind === "named-not-priced" ? "text-amber" : "text-stone"}`}>
                        {words.panel.costKind[line.kind]}
                      </span>
                    </div>
                    {/* A fee that applies only sometimes shows its condition; no total on the screen adds it. */}
                    {line.kind === "official-fee" && line.onlyIf !== undefined ? (
                      <p className="mt-1 text-body text-amber">{words.panel.onlyIf(line.onlyIf)}</p>
                    ) : null}
                    {line.kind === "official-fee" ? (
                      <div className="mt-1.5">
                        <CitationLinks citations={[line.citation]} compact />
                      </div>
                    ) : null}
                    {/* Where a named line's name comes from (a blank template), when it has a source. */}
                    {catalogLine?.kind === "named" && catalogLine.nameSource ? (
                      <div className="mt-1.5">
                        <CitationLinks citations={[catalogLine.nameSource]} compact />
                      </div>
                    ) : null}
                    {catalogLine?.kind === "named" ? (
                      quoting === line.lineId ? (
                        <AmountForm
                          askFrom
                          disabled={!canSave}
                          onCancel={() => setQuoting(null)}
                          onSubmit={async (cents, from) => {
                            const problem = await onProposeQuote(line.lineId, cents, from);
                            if (!problem) setQuoting(null);
                            return problem;
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={!canSave}
                          onClick={() => setQuoting(line.lineId)}
                          className="mt-1.5 text-body text-maple hover:underline disabled:opacity-50"
                        >
                          {line.kind === "your-quote" ? words.panel.changeQuote : words.panel.addQuote}
                        </button>
                      )
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Pages the person opens themselves (a registry, BizPaL); drawn only when the step has any. */}
      {step.officialLinks.length > 0 ? (
        <div>
          <h3 className={heading}>{words.panel.officialLinks}</h3>
          <ul className="space-y-1">
            {step.officialLinks.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noreferrer" className="text-body text-maple hover:underline">
                  {link.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One listed skill with the person's mark: Have, Learning, Not yet, and I don't know (which keeps no
 * mark). Exported for the skills list behind the Skills gauge, which shows the same row.
 */
export function SkillRow({
  item,
  mark,
  selected,
  canSave,
  onMark,
  onSelect,
}: {
  item: SkillItem;
  mark: SkillMarkValue | null;
  selected: boolean;
  canSave: boolean;
  onMark: (mark: SkillMarkValue | null) => void;
  onSelect: () => void;
}) {
  return (
    <li className="rounded-sm border border-rule-soft bg-ink2 p-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <button
          type="button"
          aria-pressed={selected}
          title={words.panel.showSteps(item.label)}
          onClick={onSelect}
          className={`text-left text-body font-semibold hover:underline ${selected ? "text-maple" : "text-paper"}`}
        >
          {item.label}
        </button>
        <span className="font-mono text-label uppercase tracking-wider text-stone">{words.panel.skillKind[item.kind]}</span>
        {mark === "have" && item.kind === "legal-requirement" ? <span className="font-mono text-label text-sage">{words.panel.youHold}</span> : null}
      </div>
      <MarkButtons mark={mark} canSave={canSave} onMark={onMark} />
      {/* The item's own sources, mark or no mark: a legal requirement is never shown without its law; drawn for the
          idea's place (`skillItemsForPlace`), and one resting only on another province's pages isn't listed there
          (`roadForPlace`). */}
      <div className="mt-1.5">
        <CitationLinks citations={item.citations} compact />
        {item.sourcesLeftOutForPlace ? <p className="mt-1 text-small text-stone-dim">{words.panel.sourcesOtherProvinces(item.sourcesLeftOutForPlace)}</p> : null}
      </div>
      {mark === "not-yet" && item.howToGetIt ? (
        <div className="mt-1.5 text-body text-stone">
          <p>
            {words.panel.howToGet} {item.howToGetIt.text}
          </p>
          <div className="mt-1">
            <CitationLinks citations={[item.howToGetIt.citation]} compact />
          </div>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Have · Learning · Not yet · I don't know. Pressing the mark that's on leaves it on; I don't know removes
 * it. On a skill the person typed, removing the mark removes the skill, so that button says Remove
 * (`clearLabel`).
 */
export function MarkButtons({
  mark,
  canSave,
  onMark,
  clearLabel = words.panel.dontKnow,
}: {
  mark: SkillMarkValue | null;
  canSave: boolean;
  onMark: (mark: SkillMarkValue | null) => void;
  clearLabel?: string;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {SKILL_MARKS.map((value) => (
        <button key={value} type="button" aria-pressed={mark === value} disabled={!canSave} onClick={() => onMark(value)} className={toggle(mark === value)}>
          {words.panel.marks[value]}
        </button>
      ))}
      <button type="button" disabled={!canSave || mark === null} onClick={() => onMark(null)} className={toggle(false)}>
        {clearLabel}
      </button>
    </div>
  );
}
