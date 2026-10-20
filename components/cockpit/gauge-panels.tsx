"use client";

import { useEffect, useState, type ReactNode } from "react";

import { AmountForm } from "@/components/cockpit/amount-form";
import { CantKeepNote } from "@/components/cockpit/example-mode";
import { ReceiptLines } from "@/components/cockpit/receipt-lines";
import { MarkButtons, SkillRow } from "@/components/cockpit/step-panel";
import { CitationLinks } from "@/components/shared/citation-links";
import { Pill } from "@/components/ui";
import { cockpitWords as words } from "@/lib/cockpit/words";
import { OASIS_LICENCE_URL, searchOasisJobs, type JobList } from "@/lib/engines/oasis/v2026";
import type { Road, SkillItem } from "@/lib/engines/roads/v2026";
import { formatMoney, formatMonth } from "@/lib/format/money-and-months";
import type { SkillMarkView } from "@/lib/futures/skill-marks";
import { SKILL_MARKS, type SkillMarkValue } from "@/lib/futures/types";
import type { RoadEvaluation } from "@/lib/roads";
import { monthsFromToday } from "@/lib/roads/words";

/**
 * The lists behind the gauges (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built"):
 * clicking the Skills, Start-up money or Your date gauge opens one of these in the right-hand panel, in
 * place of a step. Each is the person's own answers, saved by the page through the cockpit's routes; the
 * savings go through the agree prompt like every figure.
 */

/** Which skill a mark is on: one from the road's list, or one of the person's own, by its words. */
export type SkillKey = { skillItemId: string } | { ownLabel: string };

function PanelShell({
  title,
  onClose,
  error,
  receipt,
  children,
}: {
  title: string;
  onClose: () => void;
  error: string | null;
  /** The receipt of the last answer given in this list (part 2, 2026-10-12), or null. */
  receipt?: readonly string[] | null;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="h-full overflow-y-auto border-l border-rule bg-ink3 p-5 text-body leading-snug">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold leading-tight text-paper">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={words.lists.close}
          className="rounded-full border border-rule px-2.5 py-1 text-lead text-stone hover:bg-ink2"
        >
          ×
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2 text-body text-amber">
          {error}
        </p>
      ) : null}
      {receipt ? (
        <div className="mt-3">
          <ReceiptLines lines={receipt} />
        </div>
      ) : null}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

const heading = "mb-1.5 font-mono text-label uppercase tracking-[0.14em] text-stone-dim";

export function SkillsListPanel({
  road,
  skillItems,
  marks,
  selectedSkillId,
  canSave,
  error,
  job,
  jobPickedOn,
  onMark,
  onSelectSkill,
  onPickJob,
  onClose,
  receipt,
}: {
  receipt?: readonly string[] | null;
  road: Road;
  skillItems: readonly SkillItem[];
  marks: readonly SkillMarkView[];
  selectedSkillId: string | null;
  canSave: boolean;
  error: string | null;
  /** The government's list for the person's pick of job, or null when none is picked. */
  job: JobList | null;
  /** The day the person picked it, or null. */
  jobPickedOn: string | null;
  onMark: (skill: SkillKey, mark: SkillMarkValue | null) => void;
  onSelectSkill: (skillItemId: string | null) => void;
  /** Picks a job by its code, or takes the pick back (null). */
  onPickJob: (code: string | null) => void;
  onClose: () => void;
}) {
  const [ownLabel, setOwnLabel] = useState("");
  // Every item the road lists, once, in the order the road first needs it.
  const listed = [...new Set(road.steps.flatMap((s) => s.needs))]
    .map((id) => skillItems.find((item) => item.id === id))
    .filter((item): item is SkillItem => item !== undefined);
  const markOf = new Map(marks.flatMap((m) => (m.skillItemId !== null ? [[m.skillItemId, m.mark] as const] : [])));
  const own = marks.filter((m) => m.ownLabel !== null);

  return (
    <PanelShell title={words.lists.skillsTitle} onClose={onClose} error={error} receipt={receipt}>
      {!canSave ? <CantKeepNote className="text-body text-amber" /> : null}
      <h3 className={heading}>{words.lists.roadTitle}</h3>
      {listed.length === 0 ? (
        <p className="text-body text-stone">{words.lists.skillsNone}</p>
      ) : (
        <ul className="space-y-2">
          {listed.map((item) => (
            <SkillRow
              key={item.id}
              item={item}
              mark={markOf.get(item.id) ?? null}
              selected={selectedSkillId === item.id}
              canSave={canSave}
              onMark={(mark) => onMark({ skillItemId: item.id }, mark)}
              onSelect={() => onSelectSkill(selectedSkillId === item.id ? null : item.id)}
            />
          ))}
        </ul>
      )}

      <div>
        <h3 className={heading}>{words.lists.ownTitle}</h3>
        {own.length === 0 ? <p className="text-body text-stone">{words.lists.ownNone}</p> : null}
        <ul className="space-y-2">
          {own.map((m) => (
            <li key={m.id} className="rounded-sm border border-rule-soft bg-ink2 p-2">
              <span className="text-body font-semibold text-paper">{m.ownLabel}</span>{" "}
              <span className="font-mono text-label uppercase tracking-wider text-stone">{words.lists.ownTag}</span>
              <MarkButtons
                mark={m.mark}
                canSave={canSave}
                onMark={(mark) => onMark({ ownLabel: m.ownLabel! }, mark)}
                // Taking the mark off a skill the person typed removes the skill; the button says so.
                clearLabel={words.lists.removeOwn}
              />
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <h4 className={heading}>{words.lists.addOwn}</h4>
          <label htmlFor="cockpit-own-skill" className="sr-only">
            {words.lists.ownBox}
          </label>
          <input
            id="cockpit-own-skill"
            type="text"
            maxLength={120}
            value={ownLabel}
            placeholder={words.lists.ownBox}
            onChange={(e) => setOwnLabel(e.target.value)}
            className="w-full rounded-sm border border-rule bg-ink2 px-2 py-1 text-body text-paper outline-hidden focus:border-maple-soft"
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {SKILL_MARKS.map((mark) => (
              <Pill
                key={mark}
                size="small"
                variant="ghost"
                disabled={!canSave || ownLabel.trim().length === 0}
                onClick={() => {
                  // A skill of one's own is kept only with a mark: "I don't know" keeps nothing.
                  onMark({ ownLabel: ownLabel.trim() }, mark);
                  setOwnLabel("");
                }}
              >
                {words.lists.addOwnAs(words.panel.marks[mark].toLowerCase())}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      <JobSection job={job} pickedOn={jobPickedOn} markOf={markOf} canSave={canSave} onMark={onMark} onPickJob={onPickJob} />
    </PanelShell>
  );
}

/**
 * "Your pick of job" (docs/architecture/future-cockpit.md § 6, "Skills, and the government's list for your
 * pick of job, as built"; decision 5 of 2026-10-11). With no job picked: the one optional question and a
 * search over the government's job names. With one: its name, Change and Take back, then its list in two
 * groups, each row tagged "your pick of job" with the person's marks, the group's source once, and the
 * licence's line. Names only: an item carries no rating, so none can be shown here.
 */
function JobSection({
  job,
  pickedOn,
  markOf,
  canSave,
  onMark,
  onPickJob,
}: {
  job: JobList | null;
  pickedOn: string | null;
  markOf: ReadonlyMap<string, SkillMarkValue>;
  canSave: boolean;
  onMark: (skill: SkillKey, mark: SkillMarkValue | null) => void;
  onPickJob: (code: string | null) => void;
}) {
  const [changing, setChanging] = useState(false);
  const [query, setQuery] = useState("");
  const searching = job === null || changing;
  const { jobs: results, total } = searching ? searchOasisJobs(query) : { jobs: [], total: 0 };

  function pick(code: string | null) {
    onPickJob(code);
    setChanging(false);
    setQuery("");
  }

  return (
    <div>
      <h3 className={heading}>{words.lists.job.title}</h3>
      {searching ? (
        <>
          <p className="text-body text-paper">{words.lists.job.ask}</p>
          <p className="mt-1 text-body text-stone">{words.lists.job.optional}</p>
          <input
            type="search"
            aria-label={words.lists.job.search}
            placeholder={words.lists.job.search}
            value={query}
            disabled={!canSave}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-2 w-full rounded-sm border border-rule bg-ink2 px-2 py-1 text-body text-paper outline-hidden focus:border-maple-soft"
          />
          {query.trim() !== "" && results.length === 0 ? <p className="mt-1.5 text-body text-stone">{words.lists.job.noMatch}</p> : null}
          {/* Ten at most are shown; say so when more match, so ten never read as all of them. */}
          {total > results.length ? <p className="mt-1.5 text-body text-stone">{words.lists.job.more(results.length, total)}</p> : null}
          {results.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {results.map((r) => (
                <li key={r.code}>
                  <button
                    type="button"
                    disabled={!canSave}
                    onClick={() => pick(r.code)}
                    className="w-full rounded-sm border border-rule-soft bg-ink2 px-2 py-1 text-left text-body text-paper hover:border-maple-soft"
                  >
                    {words.lists.job.result(r.label, r.code)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {changing ? (
            <Pill className="mt-1.5" size="small" variant="ghost" onClick={() => setChanging(false)}>
              {words.lists.job.cancel}
            </Pill>
          ) : null}
          {/* The job names searched are the government's data, so its licence line is here too. */}
          <OasisAttribution />
        </>
      ) : (
        <>
          <p className="text-body font-semibold text-paper">{words.lists.job.picked(job.label, job.code, pickedOn)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Pill size="small" variant="ghost" disabled={!canSave} onClick={() => setChanging(true)}>
              {words.lists.job.change}
            </Pill>
            <Pill size="small" variant="ghost" disabled={!canSave} onClick={() => pick(null)}>
              {words.lists.job.takeBack}
            </Pill>
          </div>
          <p className="mt-2 text-body text-stone">{words.lists.job.aboutTheList}</p>
          {(["skills", "knowledge"] as const).map((group) => {
            const items = job.items.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mt-3">
                <h4 className={heading}>{words.lists.job.groups[group]}</h4>
                {/* Every item of a group cites the same file of the dataset: shown once, above the rows. */}
                <CitationLinks citations={items[0]!.citations} compact />
                <ul className="mt-1.5 space-y-1.5">
                  {items.map((item) => (
                    <li key={item.id} className="rounded-sm border border-rule-soft bg-ink2 p-2">
                      <span className="text-body font-semibold text-paper">{item.label}</span>{" "}
                      <span className="font-mono text-label uppercase tracking-wider text-stone">{words.lists.job.tag}</span>
                      <MarkButtons mark={markOf.get(item.id) ?? null} canSave={canSave} onMark={(mark) => onMark({ skillItemId: item.id }, mark)} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <OasisAttribution />
        </>
      )}
    </div>
  );
}

/** The Open Government Licence's attribution line, word for word, with a link to the licence. */
function OasisAttribution() {
  return (
    <p className="mt-3 text-body text-stone">
      {words.lists.job.attribution}{" "}
      <a href={OASIS_LICENCE_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-paper">
        {words.lists.job.licence}
      </a>
    </p>
  );
}

export function MoneyListPanel({
  road,
  evaluation,
  canSave,
  error,
  onProposeSavings,
  onSelectStep,
  onClose,
  receipt,
}: {
  receipt?: readonly string[] | null;
  road: Road;
  evaluation: RoadEvaluation;
  canSave: boolean;
  error: string | null;
  /** Proposes the savings; resolves to an error, or null once the agree prompt opened. */
  onProposeSavings: (amountCents: number) => Promise<string | null>;
  onSelectStep: (stepId: string) => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const savings = evaluation.gauges.money.savingsCents;
  const withCosts = evaluation.steps.filter((s) => s.costs.length > 0);
  const label = (id: string) => road.steps.find((s) => s.id === id)?.label ?? id;

  return (
    <PanelShell title={words.lists.moneyTitle} onClose={onClose} error={error} receipt={receipt}>
      {!canSave ? <CantKeepNote className="text-body text-amber" /> : null}
      <div>
        <h3 className={heading}>{words.lists.savingsTitle}</h3>
        <p className="font-mono text-body text-paper">{savings === null ? words.lists.savingsNone : formatMoney(savings)}</p>
        <p className="mt-1 text-body text-stone">{words.amounts.agreeFirst}</p>
        {adding ? (
          <AmountForm
            askFrom={false}
            disabled={!canSave}
            onCancel={() => setAdding(false)}
            onSubmit={async (cents) => {
              const problem = await onProposeSavings(cents);
              if (!problem) setAdding(false);
              return problem;
            }}
          />
        ) : (
          <Pill className="mt-1.5" size="small" variant="ghost" disabled={!canSave} onClick={() => setAdding(true)}>
            {savings === null ? words.lists.addSavings : words.lists.changeSavings}
          </Pill>
        )}
      </div>

      {withCosts.length === 0 ? (
        <p className="text-body text-stone">{words.lists.moneyNone}</p>
      ) : (
        withCosts.map((step) => (
          <div key={step.stepId}>
            <h3 className={heading}>
              <button type="button" onClick={() => onSelectStep(step.stepId)} className="hover:text-paper hover:underline">
                {label(step.stepId)}
              </button>
            </h3>
            <ul className="space-y-1">
              {step.costs.map((line) => {
                const catalogLine = road.steps.find((s) => s.id === step.stepId)?.costs.find((c) => c.id === line.lineId);
                // The source behind the line, as in the step panel: an official fee's, or a named line's name.
                const source = line.kind === "official-fee" ? line.citation : catalogLine?.kind === "named" ? catalogLine.nameSource : undefined;
                return (
                  <li key={line.lineId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-rule-soft py-1">
                    <span className="text-body text-paper">{line.label}</span>
                    {/* A blank has no amount at all, never $0: its kind says it isn't priced yet. */}
                    <span className="font-mono text-body text-paper">{line.kind === "named-not-priced" ? "" : formatMoney(line.amountCents)}</span>
                    <span className={`font-mono text-label uppercase tracking-wider ${line.kind === "named-not-priced" ? "text-amber" : "text-stone"}`}>
                      {words.panel.costKind[line.kind]}
                    </span>
                    {/* A fee that applies only sometimes shows its condition; the gauge above doesn't add it. */}
                    {line.kind === "official-fee" && line.onlyIf !== undefined ? (
                      <p className="col-span-2 mt-1 text-body text-amber">{words.panel.onlyIf(line.onlyIf)}</p>
                    ) : null}
                    {source ? (
                      <div className="col-span-2 mt-1">
                        <CitationLinks citations={[source]} compact />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </PanelShell>
  );
}

export function DatePanel({
  targetMonth,
  monthsFromToday: months,
  today,
  canSave,
  error,
  onSave,
  onClose,
  receipt,
}: {
  receipt?: readonly string[] | null;
  targetMonth: string | null;
  monthsFromToday: number | null;
  /** The person's own day, YYYY-MM-DD: the box offers no month before this one. */
  today: string;
  canSave: boolean;
  error: string | null;
  /** Keeps the month (or clears it with null); resolves to an error to show, or null. */
  onSave: (month: string | null) => Promise<string | null>;
  onClose: () => void;
}) {
  const [value, setValue] = useState(targetMonth ?? "");
  const [problem, setProblem] = useState<string | null>(null);
  // A save elsewhere (or a reload) changes the kept month; the box follows it.
  useEffect(() => setValue(targetMonth ?? ""), [targetMonth]);

  async function save(month: string | null) {
    setProblem(await onSave(month));
  }

  return (
    <PanelShell title={words.lists.dateTitle} onClose={onClose} error={problem ?? error} receipt={receipt}>
      {!canSave ? <CantKeepNote className="text-body text-amber" /> : null}
      {targetMonth && months !== null ? (
        <p className="text-body text-paper">
          {formatMonth(targetMonth)} · {monthsFromToday(months)}
        </p>
      ) : (
        <p className="text-body text-stone">{words.gauges.date.notSet}</p>
      )}
      <div>
        <label htmlFor="cockpit-target-month" className={heading}>
          {words.lists.dateBox}
        </label>
        <input
          id="cockpit-target-month"
          type="month"
          value={value}
          min={today.slice(0, 7)}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 block rounded-sm border border-rule bg-ink2 px-2 py-1 font-mono text-body text-paper"
        />
        <p className="mt-1 text-body text-stone">{words.lists.dateHelp}</p>
        <div className="mt-2 flex gap-2">
          <Pill size="small" variant="maple" disabled={!canSave} onClick={() => void save(value === "" ? null : value)}>
            {words.lists.save}
          </Pill>
          <Pill size="small" variant="ghost" disabled={!canSave || targetMonth === null} onClick={() => void save(null)}>
            {words.lists.clear}
          </Pill>
        </div>
      </div>
    </PanelShell>
  );
}
