"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useJourney } from "@/components/shared/journey-provider";
import { postJson } from "@/components/ventures/agree-prompt";
import type { RecordRetentionEntry } from "@/lib/engines/compliance/v2026";
import type { DeleteKindId, DeleteMenuEntry, KeptLink } from "@/lib/privacy/inventory";
import { keptLinkKey, keptLinks } from "@/lib/privacy/kept-links";

import { numberWords, plural } from "./format";

export interface DeleteMenuProps {
  menu: readonly DeleteMenuEntry[];
  /** Rows per table, read from the file when the page was drawn. */
  counts: Record<string, number>;
  /**
   * For each link a box clears while keeping the rows (DELETE_MENU `keeps`), how many rows it holds
   * now, keyed "Expense.ventureId": the expense records that stay, "not attached yet", when ideas go.
   */
  keptCounts: Record<string, number>;
  /** The page's name for each table ("Your ideas"), from the inventory. */
  tableNames: Record<string, string>;
  notCleared: readonly { name: string; why: string }[];
  retention: RecordRetentionEntry;
  /** The installed desktop app has File → Back up…; a copy run from source doesn't. */
  desktop: boolean;
}

type Step = "closed" | "menu" | "first-ask" | "second-ask" | "working" | "done";

interface Outcome {
  deleted: Record<string, number>;
  /** Null when the server deleted but couldn't read the file back to count what is left. */
  left: Record<string, number> | null;
  /** Rows that stayed with their link cleared, per table; absent when nothing was kept (lib/privacy/delete.ts). */
  kept?: Record<string, { unlinked: number; total: number | null }>;
  wiped: boolean;
}

/** Every table a box touches: its own, then the ones that go with it. */
const tablesOf = (e: DeleteMenuEntry) => [...e.tables, ...e.alsoDeletes];

// The key a kept link's count travels under ("Expense.ventureId") and the links the ticked boxes
// clear while keeping the rows come from lib/privacy/kept-links, the same code the server runs, so
// the warning's number and the server's check can't drift apart.
const keyOf = keptLinkKey;
const keptLinksOf = keptLinks;

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * [8d] The "Delete" button on "What DotAmi knows about you". It opens a menu of kinds of data, each
 * with what else goes with it and a Learn more; then DotAmi asks twice, in two dialogs, before
 * anything is sent. The server checks the counts the person saw against the file, deletes in one
 * transaction and wipes the file's free space (lib/privacy/delete.ts).
 *
 * Escape, Cancel or a click outside a dialog at either ask deletes nothing. Focus starts on Cancel
 * at the final ask, so a stray Enter can't delete.
 */
export function DeleteMenu({ menu, counts, keptCounts, tableNames, notCleared, retention, desktop }: DeleteMenuProps) {
  const router = useRouter();
  const { resetJourney } = useJourney();
  const panelId = useId();
  const [step, setStep] = useState<Step>("closed");
  const [ticked, setTicked] = useState<DeleteKindId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retrying, setRetrying] = useState(false);

  const countOf = (e: DeleteMenuEntry) => tablesOf(e).reduce((sum, m) => sum + (counts[m] ?? 0), 0);
  const deletable = (e: DeleteMenuEntry) => e.built && countOf(e) > 0;
  const anything = menu.some(deletable);

  const chosen = menu.filter((e) => ticked.includes(e.id));
  const affected: string[] = [];
  for (const e of chosen) for (const m of tablesOf(e)) if (!affected.includes(m)) affected.push(m);
  // What stays with its link cleared, and how many: said before the person confirms.
  const keptLinks = keptLinksOf(chosen);
  const kept = keptLinks.filter((k) => (keptCounts[keyOf(k)] ?? 0) > 0);

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
    // The number of records the warning said would stay is checked too, like the table counts.
    const seen = {
      ...Object.fromEntries(affected.map((m) => [m, counts[m] ?? 0])),
      ...Object.fromEntries(keptLinks.map((k) => [keyOf(k), keptCounts[keyOf(k)] ?? 0])),
    };
    const result = await postJson("/api/your-data/delete", { kinds: ticked, seen });
    if (!result.ok) {
      setError(result.error);
      setStep("menu");
      // Fresh counts, so a second try shows what is really there.
      router.refresh();
      return;
    }
    const body = result.body as Outcome;
    setOutcome({ deleted: body.deleted, left: body.left, kept: body.kept, wiped: body.wiped });
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
    const wiped = (result.body as { wiped?: unknown }).wiped === true;
    setOutcome((prev) => (prev ? { ...prev, wiped } : prev));
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

      {step === "done" && outcome ? (
        <DoneNote
          outcome={outcome}
          tableNames={tableNames}
          keeps={menu.flatMap((e) => e.keeps)}
          retrying={retrying}
          onRetry={() => void retryWipe()}
        />
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
                        {e.built && total > 0
                          ? e.keeps.map((k) => (
                              <p key={keyOf(k)} className="font-mono text-[11px] text-stone">
                                {capitalise(k.one)}s attached to them: {keptCounts[keyOf(k)] ?? 0}{" "}
                                {affected.includes(k.model)
                                  ? `(they go too: “${tableNames[k.model] ?? k.model}” is ticked)`
                                  : `(they stay, as “${k.becomes}”)`}
                              </p>
                            ))
                          : null}
                        <p className="mt-1 text-[12.5px] text-paper-dim">{e.goesWithIt}</p>
                        {on
                          ? kept
                              .filter((k) => e.keeps.some((own) => keyOf(own) === keyOf(k)))
                              .map((k) => <KeptWarning key={keyOf(k)} link={k} count={keptCounts[keyOf(k)] ?? 0} />)
                          : null}
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
                      {tableNames[m] ?? m}: {plural(counts[m] ?? 0, "record")}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {kept.length > 0 ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-paper">Kept, not deleted</p>
              {kept.map((k) => (
                <KeptWarning key={keyOf(k)} link={k} count={keptCounts[keyOf(k)] ?? 0} />
              ))}
            </div>
          ) : null}
          <p className="mt-3 text-[12.5px] text-paper-dim">
            Everything not ticked stays, and so does what Delete doesn&apos;t reach (the safety copies, what the window stored in
            earlier launches, the log).
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

/**
 * Said before the person confirms: how many rows stay, what they become, where they are kept and
 * how to delete them (the maintainer's decision of 2026-10-08, for an idea's expense records).
 */
function KeptWarning({ link, count }: { link: KeptLink; count: number }) {
  return (
    <p className="mt-1.5 rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-1.5 text-[12.5px] text-paper">
      <span className="font-semibold">
        {plural(count, link.one)} {count === 1 ? "stays" : "stay"}, as “{link.becomes}”.
      </span>{" "}
      {link.whereAndHow}
    </p>
  );
}

function DoneNote({
  outcome,
  tableNames,
  keeps,
  retrying,
  onRetry,
}: {
  outcome: Outcome;
  tableNames: Record<string, string>;
  keeps: readonly KeptLink[];
  retrying: boolean;
  onRetry: () => void;
}) {
  const rows = Object.keys(outcome.deleted);
  // A kept line only when something was kept: ticking ideas with no expense records attached would
  // otherwise say "0 records kept".
  const keptRows = Object.entries(outcome.kept ?? {}).filter(([, k]) => k.unlinked > 0);
  return (
    <div role="status" className="mt-3 rounded-lg border border-spruce-line/60 bg-spruce/20 px-4 py-3 text-sm text-paper">
      <p className="font-semibold">Deleted.</p>
      <ul className="mt-1 space-y-0.5 text-[12.5px] text-paper-dim">
        {rows.map((m) => (
          <li key={m}>
            {tableNames[m] ?? m}: {plural(outcome.deleted[m], "record")} deleted
            {outcome.left ? `, ${outcome.left[m] ?? 0} left` : ""}
          </li>
        ))}
        {keptRows.map(([m, k]) => (
          <li key={m}>
            {tableNames[m] ?? m}: {plural(k.unlinked, "record")} kept, now “{keeps.find((x) => x.model === m)?.becomes ?? "kept"}”
            {k.total === null ? "" : `; ${plural(k.total, "record")} in all`}
          </li>
        ))}
      </ul>
      {outcome.left ? null : (
        <p className="mt-2 text-[12.5px] text-amber">DotAmi couldn&apos;t read the data file back to count what is left. Reload this page to check.</p>
      )}
      {outcome.wiped ? (
        <p className="mt-2 text-[12.5px] text-paper-dim">Their space in the data file is wiped, so they can&apos;t be read back out of it.</p>
      ) : (
        <div className="mt-2 text-[12.5px] text-amber">
          <p>
            They are deleted, but their space in the data file isn&apos;t wiped yet, so their words could still be dug out of the
            file. The wipe needs free disk space about the size of the data file, and nothing else using the file.
          </p>
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
