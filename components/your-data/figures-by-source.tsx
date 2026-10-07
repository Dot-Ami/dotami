import type { Holdings, HeldFigure, HeldSource } from "@/lib/privacy/holdings";

import {
  SOURCE_KIND_WORDS,
  STATUS_COUNT_WORDS,
  STATUS_ORDER,
  STATUS_WORDS,
  amountWords,
  countLine,
  kindWords,
  periodWords,
  plural,
} from "./format";

/**
 * "Your figures, by source" on /your-data: every figure in the data file, in the groups the
 * person would recognise — a file name, "typed by you", an agent. Server-rendered and read-only;
 * a source opens to show each figure with the days it was proposed, agreed to and taken back.
 *
 * Sources are native <details>: they open and close without any script, work from the keyboard,
 * and stay collapsed until asked for, so a long history doesn't bury the page. Turned-down
 * figures are listed too — they're hidden everywhere else but their amounts are still stored.
 */
export function FiguresBySource({ figures }: { figures: Holdings["figures"] }) {
  if (figures.total === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-rule px-4 py-5 text-sm text-stone">
        No figures are kept. Nothing has been typed, read from a file, or proposed to you.
      </p>
    );
  }

  return (
    <>
      <p className="mt-3 text-sm text-paper">
        {plural(figures.total, "figure")} in the data file:{" "}
        {STATUS_ORDER.map((s) => `${figures.byStatus[s]} ${STATUS_COUNT_WORDS[s]}`).join(" · ")}.
      </p>
      <p className="mt-1 max-w-2xl text-[12px] text-stone">
        A figure you took back or turned down stops counting, but its amount is still stored in the file, so it
        is listed here with the rest.
      </p>
      <ul className="mt-4 space-y-3">
        {figures.sources.map((source) => (
          <SourceRow key={`${source.sourceKind}:${source.sourceLabel}`} source={source} />
        ))}
      </ul>
    </>
  );
}

function SourceRow({ source }: { source: HeldSource }) {
  const days =
    source.firstProposedOn === source.lastProposedOn
      ? `proposed ${source.firstProposedOn}`
      : `proposed ${source.firstProposedOn} to ${source.lastProposedOn}`;
  return (
    <li className="rounded-lg border border-rule bg-ink2">
      <details className="group">
        <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="min-w-0 wrap-break-word font-semibold text-paper">{source.sourceLabel}</h3>
            <span className="rounded-sm border border-rule px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-stone">
              {SOURCE_KIND_WORDS[source.sourceKind] ?? source.sourceKind}
            </span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-stone-dim group-open:hidden">
              Show {plural(source.figures.length, "figure")}
            </span>
            <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-wider text-stone-dim group-open:inline">
              Hide
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-paper-dim">{countLine(source.counts)}</p>
          <p className="mt-0.5 text-[12px] text-stone">
            {source.ideaNames.length === 1 ? "Idea" : "Ideas"}: {source.ideaNames.join(", ")} · {days}
          </p>
        </summary>
        <ul className="space-y-2 border-t border-rule-soft px-4 py-3">
          {source.figures.map((figure) => (
            <FigureRow key={figure.id} figure={figure} showIdea={source.ideaNames.length > 1} />
          ))}
        </ul>
      </details>
    </li>
  );
}

function FigureRow({ figure, showIdea }: { figure: HeldFigure; showIdea: boolean }) {
  // A figure that is only history reads quieter than one that is counting.
  const counting = figure.status === "confirmed" || figure.status === "proposed";
  return (
    <li className={counting ? "text-xs" : "text-xs text-stone-dim"}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className={counting ? "font-semibold text-paper" : "font-semibold"}>{kindWords(figure.kind)}</span>
        <span>{periodWords(figure.periodStart, figure.periodEnd)}</span>
        <span className="font-mono">{amountWords(figure.amountCents, figure.currency)}</span>
        <span className="rounded-sm border border-rule px-1.5 py-px font-mono text-[9.5px] uppercase tracking-wider">
          {STATUS_WORDS[figure.status] ?? figure.status}
        </span>
        {figure.editedByPerson ? (
          <span className="font-mono text-[9px] uppercase tracking-wider text-maple">edited by you</span>
        ) : null}
        {figure.sourceRows !== null ? (
          <span>{plural(figure.sourceRows, "row")} summed</span>
        ) : null}
        {showIdea ? <span>· {figure.ideaName}</span> : null}
      </div>
      {/* Only the days that happened. Turning a proposal down isn't dated in the data file, so it has no day here. */}
      <dl className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-stone">
        <div className="flex gap-1">
          <dt>Proposed</dt>
          <dd className="font-mono text-paper-dim">{figure.proposedOn}</dd>
        </div>
        {figure.agreedOn ? (
          <div className="flex gap-1">
            <dt>Agreed</dt>
            <dd className="font-mono text-paper-dim">{figure.agreedOn}</dd>
          </div>
        ) : null}
        {figure.takenBackOn ? (
          <div className="flex gap-1">
            <dt>Taken back</dt>
            <dd className="font-mono text-paper-dim">{figure.takenBackOn}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}
