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
  | { state: "key-unreadable" };

export type ReceiptLockState = ReceiptLock["state"];

const SLOT = Symbol.for("dotami.receipt-lock");
type Holder = { [SLOT]?: ReceiptLock };

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
  if (!holder[SLOT]) {
    holder[SLOT] = readReceiptLock(process.env);
    delete process.env.DOTAMI_RECEIPT_KEY;
  }
  return holder[SLOT];
}

/** Only the state, for pages: never the key. */
export function receiptLockState(env: Record<string, string | undefined> = process.env): ReceiptLockState {
  return env === process.env ? receiptLock().state : readReceiptLock(env).state;
}

/** For the tests: forget what was read, so the next receiptLock() reads the environment again. */
export function __resetReceiptLockForTests() {
  delete (globalThis as Holder)[SLOT];
}
