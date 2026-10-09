/**
 * [8i] Whether this copy of DotAmi encrypts its receipt files, and the key when it does (the design is
 * docs/architecture/expense-records.md § 9).
 *
 * The desktop app's main process opens the key (desktop/receipt-key.mjs) and starts this server with:
 *   DOTAMI_RECEIPT_LOCK  "on" | "no-key-store" | "key-unreadable"
 *   DOTAMI_RECEIPT_KEY   the key, base64 (only when "on")
 * A copy run from source sets neither: it has no operating-system key store, so its receipts are kept
 * unencrypted ("source"), and the settings page and What DotAmi knows about you say so.
 *
 * The key is taken out of the environment the first time it is read and kept on globalThis, so it is
 * never in the environment of anything this server might start, and every server bundle (each route
 * is bundled on its own) reads the same one.
 */
import { keyIdOf } from "@/desktop/receipt-crypto.mjs";

/** What this copy does with receipt files. The key stays on the server: it is never sent to a page. */
export type ReceiptLock =
  | { state: "on"; key: Buffer; keyId: string }
  /** Run from source: no operating-system key store, so receipts are kept unencrypted. */
  | { state: "source" }
  /** The desktop app, but the operating system's key store isn't available: kept unencrypted. */
  | { state: "no-key-store" }
  /** The desktop app has a key file this account can't open, and receipts are locked with it. */
  | { state: "key-unreadable" }
  /**
   * The key couldn't be opened and the person pressed Start a new key (expense-records.md § 10): the
   * locked receipts were moved to `setAsideTo` (null when nothing was left to move), and the desktop app
   * makes a new key at its next start. Never read from the environment: only markNewKeyAtRestart sets it,
   * for the rest of this server's run. Nothing can be added or shown until then.
   */
  | { state: "new-key-at-restart"; setAsideTo: string | null };

export type ReceiptLockState = ReceiptLock["state"];

// A plain property name, not a symbol: the privacy scan refuses globalThis read by a computed key.
type Holder = { __dotamiReceiptLock?: ReceiptLock };

/** Reads the lock from an environment, without changing it. */
export function readReceiptLock(env: Record<string, string | undefined>): ReceiptLock {
  switch (env.DOTAMI_RECEIPT_LOCK) {
    case "on": {
      const key = Buffer.from(env.DOTAMI_RECEIPT_KEY ?? "", "base64");
      // The main process always sends 32 bytes; anything else is treated as a key that can't be opened,
      // so nothing is written unencrypted by mistake and nothing is shown that can't be checked.
      return key.length === 32 ? { state: "on", key, keyId: keyIdOf(key) } : { state: "key-unreadable" };
    }
    case "no-key-store":
      return { state: "no-key-store" };
    case "key-unreadable":
      return { state: "key-unreadable" };
    default:
      return { state: "source" };
  }
}

/** This server's lock: read once from process.env, then the key is removed from it. */
export function receiptLock(): ReceiptLock {
  const holder = globalThis as Holder;
  if (!holder.__dotamiReceiptLock) {
    holder.__dotamiReceiptLock = readReceiptLock(process.env);
    delete process.env.DOTAMI_RECEIPT_KEY;
  }
  return holder.__dotamiReceiptLock;
}

/** Only the state, for pages: never the key. */
export function receiptLockState(env: Record<string, string | undefined> = process.env): ReceiptLockState {
  return env === process.env ? receiptLock().state : readReceiptLock(env).state;
}

/** After Start a new key moved the locked receipts aside: what this server says until it is restarted. */
export function markNewKeyAtRestart(setAsideTo: string | null): void {
  (globalThis as Holder).__dotamiReceiptLock = { state: "new-key-at-restart", setAsideTo };
}

/** Where Start a new key moved the locked receipts during this run, or null (not pressed, or nothing moved). */
export function receiptsSetAsideTo(lock: ReceiptLock = receiptLock()): string | null {
  return lock.state === "new-key-at-restart" ? lock.setAsideTo : null;
}

/** For the tests: forget what was read, so the next receiptLock() reads the environment again. */
export function __resetReceiptLockForTests() {
  delete (globalThis as Holder).__dotamiReceiptLock;
}
