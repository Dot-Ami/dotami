/**
 * [8i] "Start a new key" on the server's side (docs/architecture/expense-records.md § 10): while the
 * receipts' key can't be opened, the person may give up the receipts it locks. The locked files and the
 * key file are moved aside, never deleted (desktop/receipt-key.mjs setAsideLockedReceipts, the same rule
 * for "locked" the desktop app uses at start), and the desktop app makes the new key at its next start:
 * only its main process can reach Windows' key store, so this server can't make one itself.
 *
 * Until that restart this server's lock is "new-key-at-restart" (lock.ts), so the pages say where the
 * files went, nothing is added or shown, and a second press is refused.
 */
import path from "node:path";

import { setAsideLockedReceipts } from "@/desktop/receipt-key.mjs";
import { databaseFilePath } from "@/lib/settings/today";

import { markNewKeyAtRestart, receiptLock, type ReceiptLock } from "./lock";
import { ReceiptError } from "./store";

export interface NewKeyStarted {
  /** The folder the locked receipts (and the old key file) were moved to; null when nothing was left to move. */
  movedTo: string | null;
  /** How many receipt files were moved. */
  receipts: number;
  /** Whether the old key file (receipts.key) was there and moved with them. */
  keyFile: boolean;
}

/** Why there is no key to start again, for each lock this can't act on. Each says nothing was moved. */
const REFUSED: Record<Exclude<ReceiptLock["state"], "key-unreadable">, string> = {
  on: "The key to your receipts opens fine, so there's no new key to start. Nothing was moved.",
  source: "This copy doesn't encrypt receipts, so there's no key to start again. Nothing was moved.",
  "no-key-store": "This copy doesn't encrypt receipts, so there's no key to start again. Nothing was moved.",
  "new-key-at-restart": "DotAmi already moved the locked receipts aside. Close it and open it again to start the new key.",
};

/**
 * Moves the locked receipts and the key file aside, only while `lock` is "key-unreadable" (ReceiptError
 * 409 otherwise, with nothing moved). The data folder is the one holding the data file DATABASE_URL
 * points at: the desktop app's receipts.key and receipts/ sit beside its dotami.db.
 */
export function startNewReceiptKey(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
  lock: ReceiptLock = receiptLock(),
  now: () => number = Date.now,
): NewKeyStarted {
  if (lock.state !== "key-unreadable") throw new ReceiptError(REFUSED[lock.state], 409);
  const dataFile = databaseFilePath(databaseUrl);
  if (!dataFile) throw new ReceiptError("This copy of DotAmi has no data folder, so there's no key to start again. Nothing was moved.", 409);
  const { folder, receipts, keyFile } = setAsideLockedReceipts(path.dirname(dataFile), { now });
  markNewKeyAtRestart(folder);
  return { movedTo: folder, receipts, keyFile };
}
