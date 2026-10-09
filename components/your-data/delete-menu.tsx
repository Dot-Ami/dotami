"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useJourney } from "@/components/shared/journey-provider";
import { postJson } from "@/components/ventures/agree-prompt";
import type { RecordRetentionEntry } from "@/lib/engines/compliance/v2026";
import type { DeleteKindId, DeleteMenuEntry } from "@/lib/privacy/inventory";

import { numberWords, plural } from "./format";

export interface DeleteMenuProps {
  menu: readonly DeleteMenuEntry[];
  /** Rows per table, read from the file when the page was drawn. */
  counts: Record<string, number>;
  /** The page's name for each table ("Your ideas"), from the inventory. */
  tableNames: Record<string, string>;
  notCleared: readonly { name: string; why: string }[];
  retention: RecordRetentionEntry;
  /** The installed desktop app has File → Back up…; a copy run from source doesn't. */
  desktop: boolean;
  /** An earlier Delete's wipe is still owed: its note sits beside the data file. */
  wipePending: boolean;
}

type Step = "closed" | "menu" | "first-ask" | "second-ask" | "working" | "done";

interface Outcome {
  deleted: Record<string, number>;
  /** Null when the server deleted but couldn't read the file back to count what is left. */
  left: Record<string, number> | null;
  wiped: boolean;
}

/** The key the safety copies' count goes under: the box's folder, beside the tables' names. */
const COPIES = "backups";

/** Every count a box touches: its own tables, the ones that go with them, then its folder's files. */
const tablesOf = (e: DeleteMenuEntry) => [...e.tables, ...e.alsoDeletes, ...(e.folder ? [e.folder] : [])];

/** "3 records", or "1 file" for the safety copies, which are files rather than rows. */
const countWords = (key: string, n: number) => (key === COPIES ? plural(n, "file") : plural(n, "record"));

/** Safety copies the server couldn't delete (another program had them open); 0 when none were ticked. */
const copiesLeftOf = (o: Outcome) => o.left?.[COPIES] ?? 0;

/**
 * [8d] The "Delete" button on "What DotAmi knows about you". It opens a menu of kinds of data, each
 * with what else goes with it and a Learn more; then DotAmi asks twice, in two dialogs, before
 * anything is sent. The server checks the counts the person saw against the file, deletes in one
 * transaction and wipes the file's free space (lib/privacy/delete.ts).
 *
 * Escape, Cancel or a click outside a dialog at either ask deletes nothing. Focus starts on Cancel
 * at the final ask, so a stray Enter can't delete.
 */
export function DeleteMenu({ menu, counts, tableNames, notCleared, retention, desktop, wipePending }: DeleteMenuProps) {
  const router = useRouter();
  const { resetJourney } = useJourney();
  const panelId = useId();
  const [step, setStep] = useState<Step>("closed");
  const [ticked, setTicked] = useState<DeleteKindId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retrying, setRetrying] = useState(false);
  // An earlier Delete's unfinished wipe, finished from here: null until "Finish it now" answers.
  const [pendingResult, setPendingResult] = useState<{ wiped: boolean; backupsLeft: number } | null>(null);

  const countOf = (e: DeleteMenuEntry) => tablesOf(e).reduce((sum, m) => sum + (counts[m] ?? 0), 0);
  const deletable = (e: DeleteMenuEntry) => e.built && countOf(e) > 0;
  const anything = menu.some(deletable);

  const chosen = menu.filter((e) => ticked.includes(e.id));
  const copiesTicked = chosen.some((e) => e.folder === COPIES);
  const affected: string[] = [];
  for (const e of chosen) for (const m of tablesOf(e)) if (!affected.includes(m)) affected.push(m);

  function toggle(id: DeleteKindId, on: boolean) {
    setTicked((prev) => (on ? [...prev.filter((k) => k !== id), id] : prev.filter((k) => k !== id)));
  }

  function backToMenu() {
    setStep("menu");
  }

  async function deleteNow() {
    setStep("working");
    setError(null);
    // What the person was shown; the server refuses (409) if the file holds anything else now.
    const seen = Object.fromEntries(affected.map((m) => [m, counts[m] ?? 0]));
    const result = await postJson("/api/your-data/delete", { kinds: ticked, seen });
    if (!result.ok) {
      setError(result.error);
      setStep("menu");
      // Fresh counts, so a second try shows what is really there.
      router.refresh();
      return;
    }
    const body = result.body as Outcome;
    setOutcome({ deleted: body.deleted, left: body.left, wiped: body.wiped });
    // The intake in progress can still hold a deleted idea; a Save on the map would bring it back.
    if (ticked.includes("ideas")) resetJourney();
    setTicked([]);
    setStep("done");
    router.refresh();
  }

  async function retryWipe() {
    setRetrying(true);
    const result = await postJson("/api/your-data/delete", { retryWipe: true });
    setRetrying(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const body = result.body as { wiped?: unknown; backupsLeft?: unknown };
    const wiped = body.wiped === true;
    const backupsLeft = typeof body.backupsLeft === "number" ? body.backupsLeft : 0;
    setOutcome((prev) =>
      prev ? { ...prev, wiped, left: prev.left && COPIES in prev.left ? { ...prev.left, [COPIES]: backupsLeft } : prev.left } : prev,
    );
    return { wiped, backupsLeft };
  }

  async function finishPending() {
    const answer = await retryWipe();
    if (answer) setPendingResult(answer);
    router.refresh();
  }

  const [citation] = retention.citations;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-expanded={step !== "closed" && step !== "done"}
          aria-controls={panelId}
          disabled={!anything && step === "closed"}
          onClick={() => {
            setError(null);
            setOutcome(null);
            setStep(step === "menu" ? "closed" : "menu");
          }}
          className="rounded-sm border border-amber/50 px-3 py-1.5 text-sm font-semibold text-amber transition hover:bg-amber/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
        {!anything && step === "closed" ? (
          <span className="text-[12px] text-stone">Nothing to delete: the data file holds nothing of yours.</span>
        ) : null}
      </div>

      {(wipePending || pendingResult) && !outcome && step === "closed" ? (
        <PendingNote desktop={desktop} retrying={retrying} result={pendingResult} onFinish={() => void finishPending()} />
      ) : null}
      {step === "done" && outcome ? (
        <DoneNote outcome={outcome} tableNames={tableNames} desktop={desktop} retrying={retrying} onRetry={() => void retryWipe()} />
      ) : null}
      {error && step !== "menu" ? (
        <p role="alert" className="mt-3 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-sm text-amber">
          {error}
        </p>
      ) : null}

      {step !== "closed" && step !== "done" ? (
        <div id={panelId} className="mt-3 rounded-lg border border-rule bg-ink2 px-4 py-4">
          <fieldset>
            <legend className="font-semibold text-paper">What do you want to delete?</legend>
            <p className="mt-1 text-[12px] text-stone">
              Tick what should go. Each box says what else goes with it. Nothing is deleted until you have said yes twice.
            </p>
            {error ? (
              <p role="alert" className="mt-3 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-sm text-amber">
                {error}
              </p>
            ) : null}
            <ul className="mt-3 space-y-3">
              {menu.map((e) => {
                const on = ticked.includes(e.id);
                const inputId = `${panelId}-${e.id}`;
                const total = countOf(e);
                return (
                  <li key={e.id} className="rounded-md border border-rule-soft px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={on}
                        disabled={!deletable(e)}
                        onChange={(ev) => toggle(e.id, ev.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-amber"
                      />
                      <div className="min-w-0">
                        <label htmlFor={inputId} className="font-semibold text-paper">
                          {e.label}
                        </label>
                        <p className="mt-0.5 font-mono text-[11px] text-stone">
                          {!e.built
                            ? "Not kept yet"
                            : total === 0
                              ? "Nothing to delete"
                              : tablesOf(e)
                                  .map((m) => `${tableNames[m] ?? m}: ${counts[m] ?? 0}`)
                                  .join(" · ")}
                        </p>
                        {/* The safety copies are the last way back, so their sentence reads as the warning it is. */}
                        <p className={`mt-1 text-[12.5px] ${e.folder ? "text-amber" : "text-paper-dim"}`}>{e.goesWithIt}</p>
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[12px] text-stone underline decoration-rule underline-offset-4 hover:text-paper">
                            Learn more
                          </summary>
                          <p className="mt-1 text-[12px] text-paper-dim">{e.learnMore}</p>
                        </details>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <div className="mt-4 space-y-2 text-[12.5px] text-paper-dim">
            <p>
              {retention.scope} The CRA says business records are generally kept for {numberWords(retention.retentionYears)}{" "}
              years from {retention.countsFrom}, with exceptions.{" "}
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple"
              >
                CRA: {citation.title}
              </a>{" "}
              <span className="text-stone">(read {citation.lastVerified})</span>
            </p>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold text-paper">What Delete doesn&apos;t reach</h4>
            <ul className="mt-1.5 space-y-1.5 text-[12px] text-paper-dim">
              {notCleared.map((n) => (
                <li key={n.name}>
                  <span className="text-paper">{n.name}.</span> {n.why}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={chosen.length === 0}
              onClick={() => {
                setError(null);
                setStep("first-ask");
              }}
              className="rounded-sm border border-amber/50 px-3 py-1.5 text-sm font-semibold text-amber transition hover:bg-amber/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete what&apos;s ticked…
            </button>
            <button
              type="button"
              onClick={() => {
                setTicked([]);
                setStep("closed");
              }}
              className="rounded-sm border border-rule px-3 py-1.5 text-sm text-stone transition hover:text-paper"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {step === "first-ask" ? (
        <ConfirmDialog
          title="Delete these?"
          intro="This is everything that goes. Check it before you go on."
          onCancel={backToMenu}
          confirmLabel="Yes, continue"
          onConfirm={() => setStep("second-ask")}
        >
          <ul className="space-y-2">
            {chosen.map((e) => (
              <li key={e.id} className="text-sm text-paper">
                <span className="font-semibold">{e.label}</span>
                <ul className="mt-0.5 space-y-0.5 pl-4 text-[12.5px] text-paper-dim">
                  {tablesOf(e).map((m) => (
                    <li key={m}>
                      {tableNames[m] ?? m}: {countWords(m, counts[m] ?? 0)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {copiesTicked ? (
            <p className="mt-3 text-[12.5px] text-amber">
              The safety copies go too, so afterwards only a backup you saved somewhere else could bring anything back.
            </p>
          ) : null}
          <p className="mt-3 text-[12.5px] text-paper-dim">
            Everything not ticked stays, and so does what Delete doesn&apos;t reach (what the window stored in earlier launches,
            the log).
            {/* Only said when there are copies to leave: a copy run from source has none. */}
            {!copiesTicked && (counts[COPIES] ?? 0) > 0
              ? " The safety copies in the backups folder aren't ticked, so they still hold what you delete."
              : null}
          </p>
        </ConfirmDialog>
      ) : null}

      {step === "second-ask" || step === "working" ? (
        <ConfirmDialog
          title="Delete them now?"
          intro="This can't be undone. DotAmi wipes them from the data file, so they can't be dug back out of it."
          onCancel={backToMenu}
          confirmLabel={step === "working" ? "Deleting…" : "Delete now"}
          onConfirm={() => void deleteNow()}
          busy={step === "working"}
          focusCancel
        >
          {copiesTicked ? (
            <p className="mb-2 text-[12.5px] text-amber">
              The safety copies in the backups folder go too. Afterwards, only a backup you saved somewhere else could bring
              anything back.
            </p>
          ) : null}
          <p className="text-[12.5px] text-paper-dim">
            {desktop
              ? "If you might want them back, cancel and use File → Back up… first; File → Restore puts a backup back."
              : "If you might want them back, cancel and copy the data file somewhere first; it is listed above."}
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

function DoneNote({
  outcome,
  tableNames,
  desktop,
  retrying,
  onRetry,
}: {
  outcome: Outcome;
  tableNames: Record<string, string>;
  desktop: boolean;
  retrying: boolean;
  onRetry: () => void;
}) {
  const rows = Object.keys(outcome.deleted);
  const copiesLeft = copiesLeftOf(outcome);
  return (
    <div role="status" className="mt-3 rounded-lg border border-spruce-line/60 bg-spruce/20 px-4 py-3 text-sm text-paper">
      <p className="font-semibold">Deleted.</p>
      <ul className="mt-1 space-y-0.5 text-[12.5px] text-paper-dim">
        {rows.map((m) => (
          <li key={m}>
            {tableNames[m] ?? m}: {countWords(m, outcome.deleted[m])} deleted
            {outcome.left ? `, ${outcome.left[m] ?? 0} left` : ""}
          </li>
        ))}
      </ul>
      {outcome.left ? null : (
        <p className="mt-2 text-[12.5px] text-amber">DotAmi couldn&apos;t read the data file back to count what is left. Reload this page to check.</p>
      )}
      {/* Deleting only safety copies takes nothing out of the data file, so there is no space to speak of. */}
      {outcome.wiped && rows.some((m) => m !== COPIES) ? (
        <p className="mt-2 text-[12.5px] text-paper-dim">Their space in the data file is wiped, so they can&apos;t be read back out of it.</p>
      ) : null}
      {outcome.wiped && copiesLeft === 0 ? null : (
        <div className="mt-2 space-y-1 text-[12.5px] text-amber">
          {outcome.wiped ? null : (
            <p>
              They are deleted, but their space in the data file isn&apos;t wiped yet, so their words could still be dug out of
              the file. The wipe needs free disk space about the size of the data file, and nothing else using the file.
            </p>
          )}
          {copiesLeft > 0 ? (
            <p>
              {plural(copiesLeft, "safety copy", "safety copies")} in the backups folder couldn&apos;t be deleted, because another
              program has {copiesLeft === 1 ? "it" : "them"} open. Close that program and try again.
            </p>
          ) : null}
          {desktop ? <p>If it still can&apos;t finish, the desktop app finishes it the next time it starts.</p> : null}
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="mt-2 rounded-sm border border-amber/50 px-2.5 py-1 text-[12px] font-semibold text-amber hover:bg-amber/10 disabled:opacity-50"
          >
            {retrying ? "Wiping…" : "Try the wipe again"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * An earlier Delete's wipe that hasn't finished (its note is beside the data file): said on the
 * page, with a button to finish it now. The desktop app also finishes it at its next start.
 */
function PendingNote({
  desktop,
  retrying,
  result,
  onFinish,
}: {
  desktop: boolean;
  retrying: boolean;
  result: { wiped: boolean; backupsLeft: number } | null;
  onFinish: () => void;
}) {
  if (result && result.wiped && result.backupsLeft === 0) {
    return (
      <p role="status" className="mt-3 text-[12.5px] text-paper-dim">
        Finished: the earlier Delete&apos;s wipe is done.
      </p>
    );
  }
  return (
    <div role="status" className="mt-3 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-[12.5px] text-amber">
      <p>
        An earlier Delete hasn&apos;t finished: what it deleted could still be dug out of the data file, or a safety copy it was
        deleting is still there.{" "}
        {desktop ? "The desktop app finishes it the next time it starts." : "Finish it here."}
      </p>
      {result ? <p className="mt-1">It still couldn&apos;t finish. Close any program using DotAmi&apos;s files, and check there is free disk space.</p> : null}
      <button
        type="button"
        onClick={onFinish}
        disabled={retrying}
        className="mt-2 rounded-sm border border-amber/50 px-2.5 py-1 text-[12px] font-semibold text-amber hover:bg-amber/10 disabled:opacity-50"
      >
        {retrying ? "Finishing…" : "Finish it now"}
      </button>
    </div>
  );
}

/** A modal ask with Cancel and one confirm button. Escape, Cancel and a click outside all cancel. */
function ConfirmDialog({
  title,
  intro,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  focusCancel = false,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  focusCancel?: boolean;
}) {
  const titleId = useId();
  const introId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (focusCancel ? cancelRef.current : confirmRef.current)?.focus();
    // Only on open: a re-render while working must not move focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!busy) onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep Tab inside the dialog while it is open.
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], summary");
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        // Only a click on the dim backdrop itself cancels, not a drag that ends there.
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={introId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-rule bg-ink2 p-5 outline-hidden"
      >
        <h2 id={titleId} className="font-serif text-xl font-bold tracking-tight text-paper">
          {title}
        </h2>
        <p id={introId} className="mt-1 text-sm text-paper-dim">
          {intro}
        </p>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-sm border border-rule px-3 py-1.5 text-sm text-paper transition hover:border-maple-soft disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-sm border border-amber/60 bg-amber/10 px-3 py-1.5 text-sm font-semibold text-amber transition hover:bg-amber/20 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
