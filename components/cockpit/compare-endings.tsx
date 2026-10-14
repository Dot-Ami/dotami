"use client";

import { ReceiptLines } from "@/components/cockpit/receipt-lines";
import type { CompareView } from "@/lib/cockpit/told";
import { cockpitWords as words } from "@/lib/cockpit/words";

/**
 * Compare the two endings (docs/architecture/future-cockpit.md § 1 row 6, § 2 "Cockpit screen as built,
 * part 2"): the two sides of one fork as columns, on the same rows, each a count or a sum from road
 * evaluation run with that side picked (lib/cockpit/told.ts `compareEndings`). No score, no total, no
 * badge, and no highlighted column: both columns are drawn with the same classes, and the only thing
 * that differs between them is which "This is mine" is pressed. The person picks; DotAmi doesn't.
 *
 * 2026-10-12, after review: on road 0 each column head also gives the map toggle's own short name, a line
 * says so when no row differs (two identical columns otherwise read as a fault), and each "This is mine"
 * names its side for a screen reader.
 *
 * 2026-10-13, the maintainer's answer: Compare is offered only at a fork whose own pick, not the rules,
 * puts steps on or off the path, so `forks` holds only those (lib/cockpit/told.ts `forksToCompare`,
 * worked out there, read here). Today that leaves out road 0, whose sides the tax rules colour whichever
 * is picked, so both columns' step and money counts come out the same (only the GST fork's skills rows
 * differ, from what the mandatory registration step lists); the toggle names and the "no row differs" line
 * stay for any road where they come up.
 */

const heading = "font-mono text-[9px] uppercase tracking-[0.14em] text-stone-dim";
// One class for every value cell in both columns, so neither column can be drawn as the better one.
const cell = "border-b border-rule-soft px-2 py-1.5 align-top font-mono text-[11.5px] text-paper";
const columnHead = "border-b border-rule px-2 py-1.5 text-left align-bottom text-[12px] font-semibold leading-snug text-paper";

export function CompareEndings({
  view,
  forks,
  canSave,
  error,
  receipt,
  onPickFork,
  onThisIsMine,
  onClose,
}: {
  /** The fork shown; null when the road has none. */
  view: CompareView | null;
  /** Every fork Compare is offered at on this road, in road order, to choose which one to compare. */
  forks: readonly { id: string; label: string }[];
  canSave: boolean;
  error: string | null;
  receipt: readonly string[] | null;
  onPickFork: (forkId: string) => void;
  /** Keeps the side picked as the person's ending at this fork. */
  onThisIsMine: (stepId: string) => void;
  onClose: () => void;
}) {
  const sideLabel = (stepId: string) => view?.sides.find((s) => s.stepId === stepId)?.label ?? stepId;
  return (
    <section aria-label={words.compare.region} className="h-full overflow-y-auto border-l border-rule bg-ink3 p-5 text-[13px] leading-snug">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-2xl font-bold leading-tight text-paper">{words.compare.region}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={words.lists.close}
          className="rounded-full border border-rule px-2.5 py-1 text-sm text-stone hover:bg-ink2"
        >
          ×
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2 text-[11px] text-amber">
          {error}
        </p>
      ) : null}
      {!canSave ? <p className="mt-3 text-[11px] text-amber">{words.panel.notSaved}</p> : null}

      {forks.length > 1 ? (
        <div className="mt-4">
          <p className={heading}>{words.compare.whichFork}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {forks.map((fork) => (
              <button
                key={fork.id}
                type="button"
                aria-pressed={view?.forkId === fork.id}
                onClick={() => onPickFork(fork.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  view?.forkId === fork.id ? "border-maple text-paper" : "border-rule text-stone hover:bg-ink2"
                }`}
              >
                {fork.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {view === null ? (
        <p className="mt-4 text-[12px] text-stone">{words.compare.noForks}</p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-[12px] text-paper-dim">
            {view.picked === null
              ? words.compare.nonePicked
              : view.picked.byPerson
                ? words.compare.yourPick(sideLabel(view.picked.stepId))
                : words.compare.mapDefault(sideLabel(view.picked.stepId))}
          </p>
          <p className="text-[11px] text-stone">{words.compare.order}</p>
          {receipt ? <ReceiptLines lines={receipt} /> : null}
          {view.sameOnEveryRow ? <p className="text-[11px] text-stone">{words.compare.noRowDiffers}</p> : null}
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr>
                <td></td>
                {view.sides.map((side) => (
                  <th key={side.stepId} scope="col" className={columnHead}>
                    {side.label}
                    {side.toggleLabel ? (
                      <span className="mt-0.5 block font-mono text-[10px] font-normal text-stone">{words.compare.onTheMap(side.toggleLabel)}</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="border-b border-rule-soft py-1.5 pr-2 text-left align-top text-[11px] font-normal text-stone">
                    {row.label}
                  </th>
                  {row.values.map((value, i) => (
                    <td key={view.sides[i]!.stepId} className={cell}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td></td>
                {view.sides.map((side) => {
                  const mine = view.picked?.stepId === side.stepId && view.picked.byPerson;
                  return (
                    <td key={side.stepId} className={cell}>
                      <button
                        type="button"
                        aria-pressed={mine}
                        aria-label={words.compare.thisIsMineFor(side.label)}
                        disabled={!canSave}
                        // The pressed one is already the person's: pressing it again changes nothing.
                        onClick={() => (mine ? undefined : onThisIsMine(side.stepId))}
                        className="rounded-full border border-rule px-2.5 py-1 font-sans text-[11px] text-paper hover:bg-ink2 disabled:opacity-50 aria-pressed:border-maple"
                      >
                        {words.compare.thisIsMine}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
