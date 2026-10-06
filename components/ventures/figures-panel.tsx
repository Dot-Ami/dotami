"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { Pill } from "@/components/ui";
import { FIGURE_KINDS, FIGURE_KIND_LABELS, type FigureKind, type FigureView } from "@/lib/figures/types";
import { parseMoneyToCents } from "@/lib/figures/money";

import { AMOUNT_HELP, AgreePrompt, describePeriod, formatAmount, postJson } from "./agree-prompt";
import { FileDrop } from "./file-drop";

/**
 * [8a]/[8b] "Your figures" on an idea's card: the totals the person has agreed to, never
 * individual transactions. Anything proposed — by the person typing it here, by an importer or
 * by an agent — waits in the agree prompt; only "Agree" there confirms anything
 * (docs/architecture/figures-privacy-review.md, rule 3).
 *
 * The idea's id is the only thing that goes in a URL. Amounts travel in request and response
 * bodies, and nothing here logs them (rules 1 and 2).
 */

const FIELD =
  "rounded-sm border border-rule bg-ink px-2 py-1 text-sm text-paper outline-hidden placeholder:text-stone-dim focus:border-maple-soft";
const FIELD_LABEL = "block font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone";

/** Newest period first; ties broken by the start day so a month sorts above the year around it. */
function newestPeriodFirst(a: FigureView, b: FigureView): number {
  return b.periodEnd.localeCompare(a.periodEnd) || b.periodStart.localeCompare(a.periodStart);
}

export function FiguresPanel({ ventureId }: { ventureId: string }) {
  const [figures, setFigures] = useState<FigureView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<FigureView[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [retractBusy, setRetractBusy] = useState(false);
  // Which add form is open: typing one figure, or reading a file. Never both at once.
  const [adding, setAdding] = useState<"typed" | "file" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/figures?venture=${encodeURIComponent(ventureId)}`, { cache: "no-store" });
      const body = (await res.json()) as { figures?: FigureView[]; error?: string };
      if (!res.ok || !Array.isArray(body.figures)) {
        setLoadError(body.error ?? "Could not load your figures.");
        setFigures((current) => current ?? []);
        return;
      }
      setLoadError(null);
      setFigures(body.figures);
    } catch {
      setLoadError("Could not load your figures.");
      setFigures((current) => current ?? []);
    }
  }, [ventureId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retract(id: string) {
    if (retractBusy) return;
    setRetractBusy(true);
    setActionError(null);
    const result = await postJson("/api/figures/retract", { ventureId, figureIds: [id] });
    setRetractBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setConfirmingId(null);
    await load();
  }

  // Typed and file figures arrive the same way: the form closes and the agree prompt opens.
  function handleProposed(proposedFigures: FigureView[]) {
    setAdding(null);
    setReviewing(proposedFigures);
    // The new proposal exists now, so the banner should be right behind the prompt.
    void load();
  }

  const proposed = (figures ?? []).filter((f) => f.status === "proposed");
  const confirmed = (figures ?? []).filter((f) => f.status === "confirmed").sort(newestPeriodFirst);
  const retracted = (figures ?? []).filter((f) => f.status === "retracted").sort(newestPeriodFirst);

  return (
    <div className="mt-3 border-t border-rule-soft pt-3">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">Your figures</p>
      <p className="mt-1 text-[11px] text-stone-dim">
        Totals you&apos;ve agreed to — never your individual transactions. Where they settle a rule, cards use
        them instead of your estimates.
      </p>

      {loadError ? (
        <p role="alert" className="mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber">
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber">
          {actionError}
        </p>
      ) : null}

      {figures === null ? (
        <p className="mt-2 text-[11px] text-stone-dim">Loading…</p>
      ) : (
        <>
          {proposed.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2">
              <p className="text-xs text-amber">
                {proposed.length} {proposed.length === 1 ? "figure" : "figures"} waiting for you to agree
              </p>
              <Pill variant="amber-out" size="small" className="ml-auto" onClick={() => setReviewing(proposed)}>
                Review
              </Pill>
            </div>
          ) : null}

          {confirmed.length === 0 && retracted.length === 0 ? (
            <p className="mt-2 text-[11px] text-stone-dim">No figures yet.</p>
          ) : null}

          {confirmed.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {confirmed.map((f) => (
                <li key={f.id} className="text-xs">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="font-semibold text-paper">{FIGURE_KIND_LABELS[f.kind]}</span>
                    <span className="text-stone">{describePeriod(f.periodStart, f.periodEnd)}</span>
                    <span className="font-mono text-paper">{formatAmount(f.amountCents, f.currency)}</span>
                    <span className="text-stone-dim">
                      from {f.sourceLabel}
                      {f.sourceRows !== null ? ` · ${f.sourceRows} ${f.sourceRows === 1 ? "row" : "rows"}` : ""}
                    </span>
                    {f.editedByPerson ? (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-maple">edited by you</span>
                    ) : null}
                    {confirmingId !== f.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setConfirmingId(f.id);
                        }}
                        className="ml-auto text-[10px] text-stone-dim hover:text-maple"
                      >
                        Retract
                      </button>
                    ) : null}
                  </div>
                  {confirmingId === f.id ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2 rounded-sm border border-rule-soft bg-ink px-3 py-1.5">
                      <span className="text-[11px] text-paper-dim">Retract this figure? Cards go back to your estimate.</span>
                      <Pill variant="maple-out" size="small" onClick={() => void retract(f.id)} disabled={retractBusy}>
                        Retract
                      </Pill>
                      <Pill variant="ghost" size="small" onClick={() => setConfirmingId(null)} disabled={retractBusy}>
                        Keep
                      </Pill>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {retracted.length > 0 ? (
            <div className="mt-3">
              <p className="font-mono text-[9px] uppercase tracking-wider text-stone-dim">Retracted</p>
              <ul className="mt-1 space-y-1">
                {retracted.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-stone-dim opacity-70">
                    <span>{FIGURE_KIND_LABELS[f.kind]}</span>
                    <span>{describePeriod(f.periodStart, f.periodEnd)}</span>
                    <span className="font-mono">{formatAmount(f.amountCents, f.currency)}</span>
                    <span>from {f.sourceLabel}</span>
                    {f.retractedAt ? <span className="ml-auto">retracted {f.retractedAt.slice(0, 10)}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-3">
        {adding === "typed" ? (
          <AddFigureForm ventureId={ventureId} onCancel={() => setAdding(null)} onProposed={handleProposed} />
        ) : adding === "file" ? (
          <FileDrop
            ventureId={ventureId}
            existing={figures ?? []}
            onCancel={() => setAdding(null)}
            onProposed={handleProposed}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Pill variant="ghost" size="small" onClick={() => setAdding("typed")}>
              Add a figure
            </Pill>
            <Pill variant="ghost" size="small" onClick={() => setAdding("file")}>
              Add from a file
            </Pill>
          </div>
        )}
      </div>

      {reviewing ? (
        <AgreePrompt
          ventureId={ventureId}
          figures={reviewing}
          onDone={load}
          onClose={() => {
            // Closing decides nothing, but a per-row Discard may have changed the list.
            setReviewing(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

/** Typed figures go through the same door as every other figure: proposed, then the agree prompt. */
function AddFigureForm({
  ventureId,
  onCancel,
  onProposed,
}: {
  ventureId: string;
  onCancel: () => void;
  onProposed: (figures: FigureView[]) => void;
}) {
  const uid = useId();
  const [kind, setKind] = useState<FigureKind>(FIGURE_KINDS[0]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const cents = parseMoneyToCents(amount);
    setAmountError(cents === null ? AMOUNT_HELP : null);
    if (cents === null) return;
    if (!from || !to) {
      setError("Pick both dates.");
      return;
    }
    if (to < from) {
      setError("The end date can't be before the start date.");
      return;
    }
    const code = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      setError("Write the currency as three letters, like CAD.");
      return;
    }

    setBusy(true);
    const result = await postJson("/api/figures/propose", {
      ventureId,
      source: { kind: "typed", label: "typed by you" },
      figures: [{ kind, periodStart: from, periodEnd: to, amountCents: cents, currency: code }],
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const created = (result.body as { figures?: FigureView[] } | null)?.figures;
    if (!Array.isArray(created) || created.length === 0) {
      setError("That didn't go through. Nothing was changed.");
      return;
    }
    onProposed(created);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="rounded-sm border border-rule-soft bg-ink px-3 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <label htmlFor={`${uid}-kind`} className={FIELD_LABEL}>
            What
          </label>
          <select
            id={`${uid}-kind`}
            value={kind}
            onChange={(e) => setKind(e.target.value as FigureKind)}
            className={`${FIELD} mt-1`}
          >
            {FIGURE_KINDS.map((k) => (
              <option key={k} value={k}>
                {FIGURE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-from`} className={FIELD_LABEL}>
            From
          </label>
          <input id={`${uid}-from`} type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${FIELD} mt-1`} />
        </div>
        <div>
          <label htmlFor={`${uid}-to`} className={FIELD_LABEL}>
            To
          </label>
          <input id={`${uid}-to`} type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${FIELD} mt-1`} />
        </div>
        <div>
          <label htmlFor={`${uid}-amount`} className={FIELD_LABEL}>
            Amount
          </label>
          <input
            id={`${uid}-amount`}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountError(null);
            }}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? `${uid}-amount-problem` : undefined}
            placeholder="12,500"
            className={`${FIELD} mt-1 w-32 text-right font-mono`}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-currency`} className={FIELD_LABEL}>
            Currency
          </label>
          <input
            id={`${uid}-currency`}
            type="text"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`${FIELD} mt-1 w-16 font-mono uppercase`}
          />
        </div>
      </div>

      {amountError ? (
        <p id={`${uid}-amount-problem`} className="mt-2 text-[11px] text-amber">
          {amountError}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[11px] text-amber">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <Pill type="submit" variant="maple" size="small" disabled={busy}>
          Review this figure
        </Pill>
        <Pill variant="ghost" size="small" onClick={onCancel} disabled={busy}>
          Cancel
        </Pill>
        <p className="text-[11px] text-stone-dim">You&apos;ll be asked to agree before it counts.</p>
      </div>
    </form>
  );
}
