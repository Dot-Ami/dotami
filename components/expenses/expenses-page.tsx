"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GhostLink, Pill, WordMark } from "@/components/ui";
import { postJson } from "@/components/ventures/agree-prompt";
import {
  draftToForm,
  draftToProposal,
  EMPTY_FORM,
  forAfterRefundShortcut,
  keptText,
  moneyText,
  nameTheRecord,
  purchaseLabel,
  recordFacts,
  type ExpenseDraft,
  type ExpenseFormValues,
} from "@/lib/expenses/display";
import type { ReceiptLockState } from "@/lib/expenses/receipts/lock";
import type { ExpenseView } from "@/lib/expenses/types";
import { useLocalToday } from "@/lib/figures/use-local-today";

import { ExpenseForm } from "./expense-form";
import { ExpenseReview, type ReviewRow } from "./expense-review";
import { ReceiptLine } from "./receipt-line";
import { ReceiptKeyProblem, ReceiptProtectionContext } from "./receipt-protection";

/**
 * [8i] "Your expenses" (/expenses, or /expenses?idea=<id> from an idea's card): typing business
 * expense records, agreeing to them, and the records DotAmi keeps. The maintainer's decisions
 * (2026-10-08) shape it:
 *   - type many, agree once: typed records sit on this window's list (not sent, not kept) until the
 *     person agrees to all of them, minus any they untick, in the review list;
 *   - a record can be "not attached yet" and attached to an idea later;
 *   - an optional business share, the person's own number, shown beside the full amount;
 *   - refunds and credits kept either way, the person's choice.
 * Anything an agent or a file proposed waits under "Waiting for you" for the same agree click.
 *
 * Only an idea's id ever goes in an address. What was paid, to whom and for what travel in request
 * and response bodies, and nothing here logs them. DotAmi picks no category, sets no share and says
 * nothing about what is deductible.
 */

interface Idea {
  id: string;
  name: string;
}

/** "all", "none" (not attached yet) or an idea's id. */
type Show = string;
const ALL = "all";
const NONE = "none";

const FIELD = "rounded-sm border border-rule bg-ink px-2 py-1 text-sm text-paper outline-hidden focus:border-maple-soft";
const SECTION_LABEL = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone";

const titleOf = (r: { date: string; paidTo: string; whatFor: string }) => `${r.date} · ${r.paidTo} — ${r.whatFor}`;
/** Newest day first, then the most recently proposed. */
const newestFirst = (a: ExpenseView, b: ExpenseView) => b.date.localeCompare(a.date) || b.proposedAt.localeCompare(a.proposedAt);

export function ExpensesPage({
  initialIdea,
  receiptProtection = "source",
  receiptsSetAside = null,
}: {
  initialIdea: string | null;
  /** How this copy keeps receipt files, read on the server ([8i], lib/expenses/receipts/lock.ts): only the state. */
  receiptProtection?: ReceiptLockState;
  /** After Start a new key, until the restart: where the locked receipts went (lock.ts receiptsSetAsideTo). */
  receiptsSetAside?: string | null;
}) {
  const today = useLocalToday();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [records, setRecords] = useState<ExpenseView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [show, setShow] = useState<Show>(initialIdea ?? ALL);

  // Typed and not yet kept: lives only in this window (no browser storage), so closing it forgets them.
  const [drafts, setDrafts] = useState<ExpenseDraft[]>([]);
  const [form, setForm] = useState<ExpenseFormValues>(EMPTY_FORM);
  const [target, setTarget] = useState<string>(initialIdea ?? NONE);
  const keyCounter = useRef(0);
  const newKey = useCallback(() => `draft-${++keyCounter.current}`, []);
  const formBox = useRef<HTMLDivElement>(null);

  const [reviewing, setReviewing] = useState<"typed" | "waiting" | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Every record of the person's, attached or not: the screen filters, and a refund's purchase may sit under another idea.
      const res = await fetch("/api/expenses", { cache: "no-store" });
      const body = (await res.json()) as { expenses?: ExpenseView[]; error?: string };
      if (!res.ok || !Array.isArray(body.expenses)) {
        setLoadError(body.error ?? "Could not load your expense records.");
        setRecords((current) => current ?? []);
        return;
      }
      setLoadError(null);
      setRecords(body.expenses);
    } catch {
      setLoadError("Could not load your expense records.");
      setRecords((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
    void (async () => {
      try {
        const res = await fetch("/api/ventures", { cache: "no-store" });
        const body = (await res.json()) as { ventures?: Idea[] };
        setIdeas((body.ventures ?? []).map((v) => ({ id: v.id, name: v.name })));
      } catch {
        setIdeas([]);
      }
    })();
  }, [load]);

  // An idea named in the address that isn't one of the person's falls back to "all" (and the typed list to "not attached").
  useEffect(() => {
    if (!ideas || !initialIdea || ideas.some((i) => i.id === initialIdea)) return;
    setShow(ALL);
    setTarget(NONE);
  }, [ideas, initialIdea]);

  const ideaName = useCallback((id: string | null) => (id === null ? null : (ideas?.find((i) => i.id === id)?.name ?? "an idea")), [ideas]);
  const byId = useMemo(() => new Map((records ?? []).map((r) => [r.id, r])), [records]);
  const inView = (r: ExpenseView) => show === ALL || (show === NONE ? r.ventureId === null : r.ventureId === show);

  const all = records ?? [];
  const waiting = all.filter((r) => r.status === "proposed" && inView(r)).sort(newestFirst);
  const agreed = all.filter((r) => r.status === "confirmed" && inView(r)).sort(newestFirst);
  const takenBack = all.filter((r) => r.status === "retracted" && inView(r)).sort(newestFirst);
  // What a refund may point to: purchases (above zero) still in play, anywhere.
  const purchases = all.filter((r) => r.recordKind === "expense" && r.amountCents > 0 && (r.status === "confirmed" || r.status === "proposed")).sort(newestFirst);

  const originalText = (r: { refundOfId: string | null }) => {
    if (r.refundOfId === null) return null;
    const original = byId.get(r.refundOfId);
    return original ? purchaseLabel(original) : null;
  };
  const factsFor = (r: ExpenseView | ExpenseDraft) => recordFacts(r, originalText(r));

  function addDraft(draft: ExpenseDraft) {
    setDrafts((current) => [...current, draft]);
    setNotice(null);
    // Ready for the next one: the day, currency and way of keeping refunds stay, the rest clears.
    setForm({ ...EMPTY_FORM, date: form.date, currency: form.currency, is: form.is, refundWay: form.refundWay });
    document.getElementById("expense-form")?.querySelector<HTMLElement>("input[type=date]")?.focus();
  }

  function editDraft(key: string) {
    const draft = drafts.find((d) => d.key === key);
    if (!draft) return;
    setDrafts((current) => current.filter((d) => d.key !== key));
    setForm(draftToForm(draft));
    formBox.current?.scrollIntoView?.({ block: "nearest" });
  }

  function recordRefundFor(purchase: ExpenseView) {
    setForm({ ...EMPTY_FORM, is: "refund", refundOfId: purchase.id, paidTo: purchase.paidTo, currency: purchase.currency, date: today });
    const nextTarget = forAfterRefundShortcut(target, drafts.length, purchase.ventureId);
    setTarget(nextTarget);
    // "For" covers the whole typed list, so with records already on it the shortcut leaves it alone and says so.
    const purchaseFor = purchase.ventureId ?? NONE;
    setNotice(
      nextTarget === purchaseFor
        ? null
        : `The typed list stays for ${target === NONE ? "“not attached to an idea yet”" : ideaName(target)}; the purchase is ${purchase.ventureId === null ? "not attached to an idea" : `for ${ideaName(purchase.ventureId)}`}. Change “For” above the list if this refund should go there too.`,
    );
    formBox.current?.scrollIntoView?.({ block: "nearest" });
    window.setTimeout(() => document.getElementById("expense-form")?.querySelector<HTMLElement>("input[type=radio]:checked")?.focus(), 0);
  }

  /** Typed records: proposed now (with the idea chosen above them, or none), then agreed in the same click. */
  async function agreeTyped(keys: string[]) {
    const chosen = keys.map((k) => drafts.find((d) => d.key === k)).filter((d): d is ExpenseDraft => d !== undefined);
    if (chosen.length === 0) return;
    setReviewBusy(true);
    setReviewError(null);
    const proposed = await postJson("/api/expenses/propose", {
      ventureId: target === NONE ? null : target,
      source: { kind: "typed", label: "typed by you" },
      expenses: chosen.map(draftToProposal),
    });
    if (!proposed.ok) {
      setReviewBusy(false);
      setReviewError(nameTheRecord(proposed.error, chosen.map(titleOf)));
      return;
    }
    const created = (proposed.body as { expenses?: ExpenseView[] } | null)?.expenses ?? [];
    // They exist in the data file now (waiting), so they leave the typed list whatever happens next.
    setDrafts((current) => current.filter((d) => !keys.includes(d.key)));
    const agreedResult = await postJson("/api/expenses/agree", { expenseIds: created.map((e) => e.id) });
    setReviewBusy(false);
    setReviewing(null);
    if (!agreedResult.ok) {
      setActionError(`They were saved as waiting, not agreed to: ${agreedResult.error} You can agree to them under “Waiting for you”.`);
    } else {
      setActionError(null);
      setNotice(keptText(agreedResult.body));
    }
    await load();
  }

  async function agreeWaiting(ids: string[]) {
    setReviewBusy(true);
    setReviewError(null);
    const result = await postJson("/api/expenses/agree", { expenseIds: ids });
    setReviewBusy(false);
    if (!result.ok) {
      setReviewError(nameTheRecord(result.error, ids.map((id) => (byId.get(id) ? titleOf(byId.get(id)!) : ""))));
      return;
    }
    setReviewing(null);
    setNotice(keptText(result.body));
    await load();
  }

  async function turnDown(id: string) {
    setReviewBusy(true);
    setReviewError(null);
    const result = await postJson("/api/expenses/discard", { expenseIds: [id] });
    setReviewBusy(false);
    if (!result.ok) {
      setReviewError(result.error);
      return;
    }
    await load();
  }

  async function takeBack(id: string) {
    setBusyId(id);
    setActionError(null);
    const result = await postJson("/api/expenses/retract", { expenseIds: [id] });
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setConfirmingId(null);
    await load();
  }

  async function attach(id: string, to: string) {
    setBusyId(id);
    setActionError(null);
    const result = await postJson("/api/expenses/attach", { expenseIds: [id], ventureId: to === NONE ? null : to });
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    await load();
  }

  const typedRows: ReviewRow[] = drafts.map((d) => ({
    key: d.key,
    title: titleOf(d),
    amount: moneyText(d.amountCents, d.currency),
    facts: factsFor(d),
  }));
  const waitingRows: ReviewRow[] = waiting.map((r) => ({
    key: r.id,
    title: titleOf(r),
    amount: moneyText(r.amountCents, r.currency),
    facts: [...factsFor(r), `From ${r.sourceLabel} · ${r.ventureId === null ? "not attached to an idea" : `for ${ideaName(r.ventureId)}`}`],
  }));

  const ideaOptions = (ideas ?? []).map((i) => (
    <option key={i.id} value={i.id}>
      {i.name}
    </option>
  ));

  return (
    <ReceiptProtectionContext.Provider value={receiptProtection}>
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col bg-ink">
      <nav className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        <GhostLink href="/ventures" tone="stone">
          ← Your ideas
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-stone">Your expenses</p>
        <GhostLink href="/settings" tone="stone">
          Settings
        </GhostLink>
      </nav>

      <main className="mx-auto w-full max-w-4xl flex-1 px-8 py-10">
        <header>
          <h1 className="font-serif text-[26px] font-bold leading-[1.15] tracking-tight text-paper">
            Your expense records, <span className="font-normal italic text-maple">in your own words.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-paper-dim">
            Each business expense you keep, one record at a time, on this computer. DotAmi keeps what you type and agree to. It never
            picks a category, never sets the business share, and never says what is deductible or how a refund is taxed. Not tax advice.
          </p>
          <ReceiptKeyProblem setAsideTo={receiptsSetAside} />
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <label htmlFor="expenses-show" className={SECTION_LABEL}>
            Show
          </label>
          <select id="expenses-show" value={show} onChange={(e) => setShow(e.target.value)} className={FIELD}>
            <option value={ALL}>All your records</option>
            <option value={NONE}>Not attached to an idea yet</option>
            {ideaOptions}
          </select>
        </div>

        {loadError ? (
          <p role="alert" className="mt-4 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-sm text-amber">
            {loadError}
          </p>
        ) : null}
        {actionError ? (
          <p role="alert" className="mt-4 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-sm text-amber">
            {actionError}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-4 rounded-sm border border-spruce-line bg-ink2 px-3 py-2 text-sm text-paper">
            {notice}
          </p>
        ) : null}

        {waiting.length > 0 ? (
          <section aria-label="Waiting for you" className="mt-6 flex flex-wrap items-center gap-3 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2">
            <p className="text-sm text-amber">
              {waiting.length} {waiting.length === 1 ? "record" : "records"} waiting for you to agree (proposed by an agent, a file, or typed earlier)
            </p>
            <Pill
              variant="amber-out"
              size="small"
              className="ml-auto"
              onClick={() => {
                setReviewError(null);
                setReviewing("waiting");
              }}
            >
              Review
            </Pill>
          </section>
        ) : null}

        <section aria-labelledby="type-heading" className="mt-8">
          <h2 id="type-heading" className="font-serif text-lg font-bold text-paper">
            Type expenses
          </h2>
          <p className="mt-1 text-[12px] text-stone">Type as many as you like; they wait on the list below until you agree to them, all at once.</p>
          <div ref={formBox} id="expense-form" className="mt-3 scroll-mt-4">
            <ExpenseForm values={form} onChange={setForm} onAdd={addDraft} today={today} purchases={purchases} newKey={newKey} />
          </div>

          {drafts.length > 0 ? (
            <div className="mt-4 rounded-sm border border-rule bg-ink2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className={SECTION_LABEL}>Typed, not kept yet · {drafts.length}</p>
                <label htmlFor="expenses-target" className="ml-auto text-[11px] text-stone">
                  For
                </label>
                <select id="expenses-target" value={target} onChange={(e) => setTarget(e.target.value)} className={FIELD}>
                  <option value={NONE}>Not attached to an idea yet</option>
                  {ideaOptions}
                </select>
              </div>
              <ul aria-label="Typed, not kept yet" className="mt-2 space-y-1.5">
                {drafts.map((d) => (
                  <li key={d.key} className="text-xs">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span className="text-paper">{titleOf(d)}</span>
                      <span className="font-mono text-paper">{moneyText(d.amountCents, d.currency)}</span>
                      <button type="button" onClick={() => editDraft(d.key)} className="ml-auto text-[10.5px] text-stone hover:text-paper">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrafts((current) => current.filter((x) => x.key !== d.key))}
                        className="text-[10.5px] text-stone-dim hover:text-maple"
                      >
                        Remove
                      </button>
                    </div>
                    {factsFor(d).length > 0 ? <p className="text-[10.5px] text-stone">{factsFor(d).join(" · ")}</p> : null}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Pill
                  variant="maple"
                  size="small"
                  onClick={() => {
                    setReviewError(null);
                    setReviewing("typed");
                  }}
                >
                  Review {drafts.length}
                </Pill>
                <p className="text-[11px] text-stone-dim">Kept only once you agree. Closing this window forgets this list.</p>
              </div>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="kept-heading" className="mt-10">
          <h2 id="kept-heading" className="font-serif text-lg font-bold text-paper">
            Records you agreed to
          </h2>
          {records === null ? (
            <p className="mt-2 text-[12px] text-stone-dim">Loading…</p>
          ) : agreed.length === 0 ? (
            <p className="mt-2 text-[12px] text-stone-dim">None here yet.</p>
          ) : (
            <ul aria-label="Records you agreed to" className="mt-3 space-y-2">
              {agreed.map((r) => (
                <RecordRow
                  key={r.id}
                  record={r}
                  facts={factsFor(r)}
                  ideaName={ideaName(r.ventureId)}
                  refunds={all.filter((x) => x.refundOfId === r.id && x.status !== "discarded")}
                  ideaOptions={ideaOptions}
                  busy={busyId === r.id}
                  confirming={confirmingId === r.id}
                  onConfirm={(on) => setConfirmingId(on ? r.id : null)}
                  onTakeBack={() => void takeBack(r.id)}
                  onAttach={(to) => void attach(r.id, to)}
                  onRecordRefund={r.recordKind === "expense" && r.amountCents > 0 ? () => recordRefundFor(r) : null}
                  onReceiptChanged={load}
                />
              ))}
            </ul>
          )}

          {takenBack.length > 0 ? (
            <>
              <p className={`${SECTION_LABEL} mt-6`}>Taken back</p>
              <ul aria-label="Taken back" className="mt-2 space-y-1.5 opacity-70">
                {takenBack.map((r) => (
                  <li key={r.id} className="text-xs text-stone">
                    <span className="text-paper-dim">{titleOf(r)}</span> <span className="font-mono">{moneyText(r.amountCents, r.currency)}</span>
                    {r.retractedAt ? ` · taken back ${r.retractedAt.slice(0, 10)}` : ""}
                    {/* Taking a record back keeps its receipt; this is where that one receipt can still be removed. */}
                    {r.receipt ? <ReceiptLine record={r} onChanged={load} /> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </main>

      {reviewing === "typed" ? (
        <ExpenseReview
          title="Agree to keep these records?"
          intro={`Nothing is kept until you agree. Untick any you want to leave out: they stay on your typed list. For: ${target === NONE ? "not attached to an idea yet" : (ideaName(target) ?? "")}.`}
          rows={typedRows}
          busy={reviewBusy}
          error={reviewError}
          onAgree={(keys) => void agreeTyped(keys)}
          onClose={() => setReviewing(null)}
        />
      ) : null}
      {reviewing === "waiting" ? (
        <ExpenseReview
          title="Agree to these proposed records?"
          intro="An agent, a file or an earlier visit proposed these. Nothing counts until you agree; untick any to leave them waiting, or turn one down."
          rows={waitingRows}
          busy={reviewBusy}
          error={reviewError}
          onAgree={(keys) => void agreeWaiting(keys)}
          onTurnDown={(key) => void turnDown(key)}
          onClose={() => setReviewing(null)}
        />
      ) : null}
    </div>
    </ReceiptProtectionContext.Provider>
  );
}

function RecordRow({
  record,
  facts,
  ideaName,
  refunds,
  ideaOptions,
  busy,
  confirming,
  onConfirm,
  onTakeBack,
  onAttach,
  onRecordRefund,
  onReceiptChanged,
}: {
  record: ExpenseView;
  facts: string[];
  ideaName: string | null;
  refunds: ExpenseView[];
  ideaOptions: React.ReactNode;
  busy: boolean;
  confirming: boolean;
  onConfirm: (on: boolean) => void;
  onTakeBack: () => void;
  onAttach: (to: string) => void;
  onRecordRefund: (() => void) | null;
  onReceiptChanged: () => Promise<void>;
}) {
  const current = record.ventureId ?? NONE;
  const [moveTo, setMoveTo] = useState(current);
  const selectId = `move-${record.id}`;

  return (
    <li className="rounded-sm border border-rule-soft bg-ink2 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="font-semibold text-paper">{titleOf(record)}</span>
        <span className="font-mono text-paper">{moneyText(record.amountCents, record.currency)}</span>
        <span className="text-stone-dim">{ideaName === null ? "Not attached to an idea yet" : `For ${ideaName}`}</span>
        <span className="text-stone-dim">from {record.sourceLabel}</span>
        {record.editedByPerson ? <span className="font-mono text-[9px] uppercase tracking-wider text-maple">edited by you</span> : null}
      </div>
      {facts.length > 0 ? <p className="mt-0.5 text-[11px] text-stone">{facts.join(" · ")}</p> : null}
      {refunds.length > 0 ? (
        <p className="mt-0.5 text-[11px] text-stone">
          Refunds linked to it:{" "}
          {refunds.map((x) => `${moneyText(Math.abs(x.amountCents), x.currency)} on ${x.date}${x.status === "proposed" ? " (waiting)" : x.status === "retracted" ? " (taken back)" : ""}`).join("; ")}
        </p>
      ) : null}
      <ReceiptLine record={record} onChanged={onReceiptChanged} />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="text-[10.5px] text-stone">
          {record.ventureId === null ? "Attach to" : "Move to"}
        </label>
        <select id={selectId} value={moveTo} onChange={(e) => setMoveTo(e.target.value)} disabled={busy} className="rounded-sm border border-rule bg-ink px-1.5 py-0.5 text-[11px] text-paper">
          <option value={NONE}>Not attached to an idea yet</option>
          {ideaOptions}
        </select>
        <Pill variant="ghost" size="small" disabled={busy || moveTo === current} onClick={() => onAttach(moveTo)}>
          {record.ventureId === null ? "Attach" : "Move"}
        </Pill>
        {onRecordRefund ? (
          <button type="button" onClick={onRecordRefund} className="text-[10.5px] text-stone hover:text-paper">
            Record a refund for this
          </button>
        ) : null}
        {confirming ? (
          <span className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-paper-dim">Take this record back? It stays listed as taken back.</span>
            <button type="button" onClick={onTakeBack} disabled={busy} className="text-[11px] text-maple hover:underline">
              Take back
            </button>
            <button type="button" onClick={() => onConfirm(false)} className="text-[11px] text-stone hover:text-paper">
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => onConfirm(true)} className="ml-auto text-[10.5px] text-stone-dim hover:text-maple">
            Take back
          </button>
        )}
      </div>
    </li>
  );
}
