"use client";

import { createContext, useContext } from "react";

import type { ReceiptLockState } from "@/lib/expenses/receipts/lock";
import { KEY_LOSS_SENTENCE, RECEIPTS_CANT_BE_ADDED, receiptProtectionText } from "@/lib/expenses/receipts/protection";
import { expensesWords } from "@/lib/expenses/words";

import { StartNewReceiptKey } from "./start-new-key";

/**
 * [8i] How this copy keeps receipt files (docs/architecture/expense-records.md § 9), read on the server
 * by the Expenses page's route and handed down here: only the state, never the key. "source" until the
 * server says otherwise, so nothing claims encryption that isn't there.
 */
export const ReceiptProtectionContext = createContext<ReceiptLockState>("source");

export const useReceiptProtection = () => useContext(ReceiptProtectionContext);

/** One sentence for the note before a receipt is chosen: whether the copy is encrypted, and what losing the key means. */
export function receiptNoteSentence(state: ReceiptLockState): string {
  switch (state) {
    case "on":
      return expensesWords.protection.on(KEY_LOSS_SENTENCE);
    case "source":
      return expensesWords.protection.source;
    case "no-key-store":
      return expensesWords.protection.noKeyStore;
    case "key-unreadable":
    case "key-out-of-reach":
    case "new-key-at-restart":
      // Add a receipt isn't offered in these (receiptsCanBeAdded); said all the same, never a claim
      // about what was moved.
      return RECEIPTS_CANT_BE_ADDED;
  }
}

/**
 * The amber line at the top of the Expenses page while the receipts' key can't be opened, with Start a
 * new key… (expense-records.md § 10) only when the key store is there ("key-unreadable", not
 * "key-out-of-reach"); after that, until the restart, where the locked receipts went. Nothing otherwise.
 * `desktop`: the desktop app, which restarts by itself after the button (§ 11).
 */
export function ReceiptKeyProblem({ setAsideTo = null, desktop = false }: { setAsideTo?: string | null; desktop?: boolean }) {
  const state = useReceiptProtection();
  if (state !== "key-unreadable" && state !== "key-out-of-reach" && state !== "new-key-at-restart") return null;
  const { headline, detail } = receiptProtectionText(state, setAsideTo, { desktop });
  return (
    <div className="mt-4 max-w-2xl rounded-sm border border-amber/40 px-3 py-2 text-body text-amber">
      <p role="status">
        <strong className="font-semibold">{headline}</strong> {detail}
      </p>
      {state === "key-unreadable" ? <StartNewReceiptKey /> : null}
    </div>
  );
}
