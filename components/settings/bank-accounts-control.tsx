"use client";

import { useEffect, useId, useState } from "react";

import { postJson } from "@/components/ventures/agree-prompt";
import { describeAllowance, type BankSourcesState } from "@/lib/figures/source-account-name";

/**
 * [8g] The bank and card accounts list under "Bank and card records" on Settings: each account the
 * person allowed, under their own name for it, with which warning button they pressed and the day,
 * and a "Take back" for each — plus "Always allow every account", when that was chosen.
 *
 * Shown only when there is something to list (settings-page.tsx decides). Adding an account is the
 * statement screen's job (the warning's three buttons); this list only shows and takes back, and
 * taking back works whether the setting is on or off.
 *
 * `initial` is what the server read when the page was built. The browser's Back button can show
 * the page from memory, so the list asks the app again when it appears; a Take back on an account
 * already gone answers "isn't in your list any more" and the list is read again.
 */
export function BankAccountsControl({ initial }: { initial: BankSourcesState }) {
  const [state, setState] = useState<BankSourcesState>(initial);
  // The id being confirmed ("every" for every account), or null.
  const [asking, setAsking] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const headingId = useId();

  async function reload() {
    try {
      const res = await fetch("/api/figures/bank-sources", { cache: "no-store" });
      if (res.ok) setState((await res.json()) as BankSourcesState);
    } catch {
      // Keep what is on screen; a Take back still checks with the app.
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function takeBack(what: { id: string } | { every: true }, name: string) {
    setWorking(true);
    setMessage(null);
    const result = await postJson("/api/figures/bank-sources/retire", what);
    setWorking(false);
    setAsking(null);
    if (!result.ok) {
      setMessage(result.error);
      await reload();
      return;
    }
    setState(result.body as BankSourcesState);
    setMessage(`Taken back: ${name}.`);
  }

  const empty = state.accounts.length === 0 && state.everyAccountSince === null;

  return (
    <section aria-labelledby={headingId}>
      <h4 id={headingId} className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">
        Your bank and card accounts
      </h4>
      {empty ? <p className="mt-1.5 text-[12.5px] text-paper-dim">No accounts in your list.</p> : null}
      <ul className="mt-1.5 space-y-2">
        {state.everyAccountSince !== null ? (
          <Item
            title="Every account"
            detail={`Always allowed since ${state.everyAccountSince}, including accounts added later`}
            asking={asking === "every"}
            working={working}
            question="Take back “Always allow every account”? Each account's next statement shows the warning again, unless you chose “Always allow this account” for it."
            onAsk={() => setAsking("every")}
            onCancel={() => setAsking(null)}
            onConfirm={() => void takeBack({ every: true }, "every account")}
          />
        ) : null}
        {state.accounts.map((a) => (
          <Item
            key={a.id}
            title={a.name}
            detail={describeAllowance(a)}
            asking={asking === a.id}
            working={working}
            question={`Take back “${a.name}”? It leaves this list, and its next statement shows the warning again as a new account. Figures already read from it stay.`}
            onAsk={() => setAsking(a.id)}
            onCancel={() => setAsking(null)}
            onConfirm={() => void takeBack({ id: a.id }, a.name)}
          />
        ))}
      </ul>
      {message ? (
        <p role="status" className="mt-2 text-[12px] text-paper-dim">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function Item(props: {
  title: string;
  detail: string;
  asking: boolean;
  working: boolean;
  question: string;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <li className="rounded-md border border-rule-soft px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="break-words font-semibold text-paper">{props.title}</p>
          <p className="text-[12px] text-paper-dim">{props.detail}</p>
        </div>
        {props.asking ? null : (
          <button
            type="button"
            onClick={props.onAsk}
            disabled={props.working}
            aria-label={`Take back ${props.title}`}
            className="rounded-sm border border-amber/50 px-2.5 py-1 text-[12px] font-semibold text-amber transition hover:bg-amber/10 disabled:opacity-50"
          >
            Take back
          </button>
        )}
      </div>
      {props.asking ? (
        <div role="group" aria-label={`Take back ${props.title}?`} className="mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2">
          <p className="text-[12px] text-amber">{props.question}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={props.onCancel}
              disabled={props.working}
              className="rounded-sm border border-rule px-2.5 py-1 text-[12px] text-paper transition hover:bg-ink disabled:opacity-50"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={props.onConfirm}
              disabled={props.working}
              className="rounded-sm border border-amber/50 px-2.5 py-1 text-[12px] font-semibold text-amber transition hover:bg-amber/10 disabled:opacity-50"
            >
              {props.working ? "Taking back…" : "Yes, take it back"}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
