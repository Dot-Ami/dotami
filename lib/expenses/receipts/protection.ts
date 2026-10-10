/**
 * [8i] What DotAmi says about how the receipt files are protected (the design is
 * docs/architecture/expense-records.md § 9). One place for the sentences, so Settings, What DotAmi
 * knows about you, the Expenses page and the viewer say the same thing. No node or browser import:
 * pages and the server both read it.
 *
 * Only the Windows desktop app is built today, so the sentences about the key name Windows.
 */
import type { ReceiptLockState } from "./lock";

export interface ReceiptProtectionText {
  /** One short line. */
  headline: string;
  /** What it means, and what to do when something is wrong. */
  detail: string;
  /** "ok": encrypted. "plain": kept unencrypted, said plainly. "problem": receipts can't be opened now. */
  tone: "ok" | "plain" | "problem";
}

/** Losing the key loses the receipts, except those in a backup: said wherever the person sees the encryption. */
export const KEY_LOSS_SENTENCE =
  "If your Windows profile is reset, or this data folder is moved to another account or computer, that key is gone and so are the receipts, except those in a backup (File → Back up…).";

export function receiptProtectionText(state: ReceiptLockState): ReceiptProtectionText {
  switch (state) {
    case "on":
      return {
        headline: "Your receipt files are encrypted on this computer.",
        // Precise on purpose: Windows' folder permissions already keep other standard accounts out of
        // the data folder, so the encryption's gain is against an administrator account, a copy of the
        // folder and a disk read outside Windows (expense-records.md § 9, "What it protects").
        detail: `Each one is locked with a key that Windows keeps for your Windows account only. Windows already keeps other standard accounts on this computer out of your data folder; the encryption means an administrator account, a copy of this data folder, or the disk read outside Windows can't read them either. Anything running as you can still open them, as DotAmi does, and so can a program an administrator runs as you. ${KEY_LOSS_SENTENCE} The data file itself isn't encrypted: your expense records in it, and what DotAmi notes about each receipt, are readable by anyone who can read the file.`,
        tone: "ok",
      };
    case "source":
      return {
        headline: "Receipts in this copy aren't encrypted.",
        detail:
          "A copy run from source has no operating-system key store to keep a key in, so its receipt files are kept exactly as you gave them, readable by anyone who can read the folder. The desktop app encrypts them.",
        tone: "plain",
      };
    case "no-key-store":
      return {
        headline: "Receipts in this copy aren't encrypted.",
        detail:
          // Also what a first start says when Windows' own key didn't reach the disk in time
          // (desktop/receipt-key.mjs waitForLocalState): hence "right now" and "tries again".
          "The key store Windows keeps for your account isn't available to DotAmi right now, so receipt files are kept exactly as you gave them, readable by anyone who can read the folder. DotAmi tries again each time it starts.",
        tone: "plain",
      };
    case "key-unreadable":
      // Covers every way the key can be out of reach while receipts are encrypted: Windows won't open
      // it, the key store isn't available, or the file receipts.key is gone (desktop/receipt-key.mjs).
      return {
        headline: "DotAmi can't open the key to your receipts.",
        detail:
          "Windows won't open it for this account, or the key file (receipts.key, beside DotAmi's data file) is missing. That happens when the Windows profile is reset, when the data folder came from another account or computer, or when that file was deleted or moved. Until the key is back, receipts can't be shown or added. Nothing was changed or deleted. If you deleted or moved receipts.key, put it back (it may be in the Recycle Bin) and restart DotAmi. Otherwise, to get the receipts back, restore a backup (File → Restore from a backup…). Or delete them (Delete on What DotAmi knows about you, “Your receipts”) and restart DotAmi, which then starts a new key.",
        tone: "problem",
      };
  }
}

/** Why one encrypted receipt can't be shown (the viewer says it in amber). */
export const LOCKED_RECEIPT_MESSAGES = {
  otherKey:
    "This receipt was encrypted with a key this Windows account can no longer open (after a Windows profile reset, or because the data folder came from another account or computer), so DotAmi can't show it. A backup made before then still holds it: File → Restore from a backup….",
  source:
    "This receipt was encrypted by the DotAmi desktop app, and this copy, run from source, has no way to open it. Open it in the desktop app.",
  noKeyStore:
    "This receipt is encrypted, and the key store Windows keeps for your account isn't available to DotAmi right now, so it can't be opened.",
  keyUnreadable:
    "DotAmi can't open the key to your receipts on this Windows account, so it can't show or add a receipt now. Settings → Data and backups says what happened and what you can do.",
} as const;
