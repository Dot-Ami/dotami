"use client";

import { createContext, useContext } from "react";

import type { ReceiptLockState } from "@/lib/expenses/receipts/lock";
import { KEY_LOSS_SENTENCE, receiptProtectionText } from "@/lib/expenses/receipts/protection";

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
      return `In this app the copy is encrypted, with a key Windows keeps for your Windows account only. ${KEY_LOSS_SENTENCE}`;
    case "source":
      return "In this copy, run from source, the copy isn't encrypted: anyone who can read the receipts folder can open it. The desktop app encrypts receipts.";
    case "no-key-store":
      return "On this computer the copy isn't encrypted (the key store Windows keeps for your account isn't available to DotAmi right now): anyone who can read the receipts folder can open it.";
    case "key-unreadable":
    case "new-key-at-restart":
      return receiptProtectionText(state).detail;
  }
}

/**
 * The amber line at the top of the Expenses page while the receipts' key can't be opened, with Start a
 * new key… (expense-records.md § 10); after that, until the restart, where the locked receipts went.
 * Nothing otherwise.
 */
export function ReceiptKeyProblem({ setAsideTo = null }: { setAsideTo?: string | null }) {
  const state = useReceiptProtection();
  if (state !== "key-unreadable" && state !== "new-key-at-restart") return null;
  const { headline, detail } = receiptProtectionText(state, setAsideTo);
  return (
    <div className="mt-4 max-w-2xl rounded-sm border border-amber/40 px-3 py-2 text-[12.5px] text-amber">
      <p role="status">
        <strong className="font-semibold">{headline}</strong> {detail}
      </p>
      {state === "key-unreadable" ? <StartNewReceiptKey /> : null}
    </div>
  );
}
