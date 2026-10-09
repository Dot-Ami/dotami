// [8i] The key that encrypts the receipt files (desktop/receipt-crypto.mjs), kept only wrapped by the
// operating system's per-user protection: Electron's safeStorage, which is DPAPI for the Windows
// account on Windows (Electron keeps its own DPAPI-protected key in the data folder's "Local State"
// file and encrypts with it) and the Keychain on a Mac. The design: docs/architecture/expense-records.md
// § 9, "The key" and "Losing the key".
//
// The key file, "receipts.key" beside the data file, is JSON:
//   { "format": 1, "keyId": "<16 hex: the first 8 bytes of SHA-256(key)>", "wrapped": "<base64 of what
//     safeStorage.encryptString made of the key's base64>" }
// The key itself is never written anywhere: not here, not in the database, not in a backup, not in the
// log. The main process hands it to its own server in the server's environment (desktop/main.mjs).
//
// `store` is Electron's safeStorage in the app and a stand-in in the tests (tests/receipt-key.spec.ts);
// this file never imports Electron, so the tests can run it in plain Node.
//
// One catch, measured 2026-10-09 (Electron 44 on Windows 11): safeStorage encrypts with Electron's own
// key, which Chromium makes when the app starts and writes to "Local State" (protected by DPAPI) only
// about ten seconds later (9.98 s in a fresh folder, whether or not safeStorage was called). A receipts
// key wrapped before then could not be opened after a crash in those seconds, and nor could any receipt
// encrypted with it. So a key is never saved, and so never used, until Local State holds that key
// (waitForLocalState). Every data folder an earlier DotAmi ran in for ten seconds already has it.
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, renameSync, rmSync, writeSync } from "node:fs";
import { setTimeout as sleepFor } from "node:timers/promises";
import path from "node:path";

import { encryptedKeyId, isEncryptedReceipt, keyIdOf } from "./receipt-crypto.mjs";

/** The key file's name beside the data file. lib/privacy/inventory.ts FOLDERS lists it under this name. */
export const RECEIPT_KEY_FILE = "receipts.key";
/** The receipts folder beside the data file (lib/expenses/receipts/store.ts RECEIPTS_FOLDER). */
const RECEIPTS_FOLDER = "receipts";
const KEY_BYTES = 32;
const KEY_ID = /^[0-9a-f]{16}$/;

/**
 * @typedef {{ isEncryptionAvailable(): boolean, encryptString(text: string): Buffer, decryptString(wrapped: Buffer): string, getSelectedStorageBackend?(): string }} KeyStore
 */

/**
 * Whether `store` really protects what it wraps. On Linux, Electron falls back to a fixed password
 * built into Chromium ("basic_text") when no keyring is running, which protects nothing; DotAmi treats
 * that (and "unknown") as no key store at all.
 * @param {KeyStore} store
 */
export function keyStoreAvailable(store, platform = process.platform) {
  if (!store.isEncryptionAvailable()) return false;
  if (platform === "linux") {
    const backend = store.getSelectedStorageBackend?.() ?? "unknown";
    if (backend === "basic_text" || backend === "unknown") return false;
  }
  return true;
}

/** A new random key for the receipts. */
export function newReceiptKey() {
  return randomBytes(KEY_BYTES);
}

/** Thrown by saveReceiptKey when the operating system's own key never reached the disk: nothing was saved. */
export class KeyStoreNotSaved extends Error {
  constructor() {
    super("the operating system's key store hasn't saved its own key yet");
    this.name = "KeyStoreNotSaved";
  }
}

/** Electron's "Local State" file in the data folder holds the DPAPI-protected key safeStorage uses (Windows). */
export function localStateHoldsKey(dataDir) {
  try {
    const state = JSON.parse(readFileSync(path.join(dataDir, "Local State"), "utf8"));
    return typeof state?.os_crypt?.encrypted_key === "string" && state.os_crypt.encrypted_key.length > 0;
  } catch {
    return false;
  }
}

/**
 * Waits until Local State holds safeStorage's own key (Windows only; a Mac's Keychain keeps its item at
 * once), looking every 200 ms. True when it is there, false after `timeoutMs`. Asynchronous on purpose:
 * Chromium writes the file from the same thread JavaScript runs on, so a blocking wait would never see it.
 * @param {string} dataDir
 * @param {{ platform?: string, timeoutMs?: number, now?: () => number, sleep?: (ms: number) => Promise<unknown> }} [options]
 */
export async function waitForLocalState(dataDir, { platform = process.platform, timeoutMs = 30_000, now = Date.now, sleep = sleepFor } = {}) {
  if (platform !== "win32") return true;
  const deadline = now() + timeoutMs;
  for (;;) {
    if (localStateHoldsKey(dataDir)) return true;
    if (now() >= deadline) return false;
    await sleep(200);
  }
}

/**
 * Opens the receipts' key for the data folder `dataDir`, making one the first time. Returns:
 *   { state: "on", key, keyId, made, setAside }  the key is open; `made` when it was just made,
 *       `setAside` the path an unreadable old key file was moved to (nothing it locked was lost)
 *   { state: "no-key-store" }  the operating system's protection isn't available: receipts stay
 *       unencrypted, and no key file is made (a key beside the files it locks would protect nothing)
 *   { state: "key-unreadable", keyId, locked }  a key file is there but this account can't open it,
 *       and `locked` receipt files are encrypted with it. Nothing on the disk is changed: the key may
 *       come back (a Keychain prompt answered "Deny", a profile that loads later).
 * A new key is saved only once the operating system's own key is on the disk (`keyStoreSaved`, by
 * default waitForLocalState); if it never gets there, nothing is saved: "no-key-store" for a new
 * folder (receipts stay as they are), "key-unreadable" for a replacement; the next start tries again.
 * @param {string} dataDir
 * @param {KeyStore} store
 * @param {{ platform?: string, now?: () => number, keyStoreSaved?: () => Promise<boolean> }} [options]
 */
export async function openReceiptKey(dataDir, store, { platform = process.platform, now = Date.now, keyStoreSaved } = {}) {
  if (!keyStoreAvailable(store, platform)) return { state: "no-key-store" };
  const waitForStore = keyStoreSaved ?? (() => waitForLocalState(dataDir, { platform }));
  const file = path.join(dataDir, RECEIPT_KEY_FILE);
  if (!existsSync(file)) {
    const key = newReceiptKey();
    try {
      await saveReceiptKey(dataDir, store, key, { now, keyStoreSaved: waitForStore });
    } catch (error) {
      if (error instanceof KeyStoreNotSaved) return { state: "no-key-store" };
      throw error;
    }
    return { state: "on", key, keyId: keyIdOf(key), made: true, setAside: null };
  }

  const { keyId, key } = unwrap(file, store);
  if (key) return { state: "on", key, keyId: keyIdOf(key), made: false, setAside: null };

  // Can't be opened. If nothing is locked with it, nothing can be lost by starting a new key; the
  // old file is kept in backups/ all the same.
  const locked = countLockedReceipts(path.join(dataDir, RECEIPTS_FOLDER), keyId);
  if (locked > 0) return { state: "key-unreadable", keyId, locked };
  const fresh = newReceiptKey();
  let setAside;
  try {
    ({ setAside } = await saveReceiptKey(dataDir, store, fresh, { now, keyStoreSaved: waitForStore }));
  } catch (error) {
    if (error instanceof KeyStoreNotSaved) return { state: "key-unreadable", keyId, locked: 0 };
    throw error;
  }
  return { state: "on", key: fresh, keyId: keyIdOf(fresh), made: true, setAside };
}

/**
 * Writes `key`, wrapped, as the data folder's receipts key. A key file already there (one that can't
 * be opened: this is only called for a new folder, or to replace such a file) is moved first to
 * backups/receipts-key-unreadable-<time>.key, never deleted. Written beside its name, flushed, then
 * renamed into place, so a crash leaves either the old file or the whole new one. Nothing is written
 * until `keyStoreSaved` says the operating system's own key is on the disk (KeyStoreNotSaved otherwise).
 * @param {string} dataDir
 * @param {KeyStore} store
 * @param {Buffer} key
 * @param {{ now?: () => number, keyStoreSaved?: () => Promise<boolean> }} [options]
 * @returns {Promise<{ setAside: string | null }>}
 */
export async function saveReceiptKey(dataDir, store, key, { now = Date.now, keyStoreSaved } = {}) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) throw new Error("a receipt key is 32 bytes");
  const file = path.join(dataDir, RECEIPT_KEY_FILE);
  // Wrapped first: on Windows this makes sure Electron's own key exists, and the wait below is for that
  // key to reach the disk.
  const wrapped = store.encryptString(key.toString("base64")).toString("base64");
  if (!(await (keyStoreSaved ?? (() => waitForLocalState(dataDir)))())) throw new KeyStoreNotSaved();
  const content = Buffer.from(JSON.stringify({ format: 1, keyId: keyIdOf(key), wrapped }), "utf8");
  const partial = `${file}.partial`;
  rmSync(partial, { force: true });
  const fd = openSync(partial, "wx");
  try {
    let done = 0;
    while (done < content.length) done += writeSync(fd, content, done, content.length - done);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  let setAside = null;
  if (existsSync(file)) {
    const backups = path.join(dataDir, "backups");
    mkdirSync(backups, { recursive: true });
    setAside = path.join(backups, `receipts-key-unreadable-${now()}.key`);
    renameSync(file, setAside);
  }
  renameSync(partial, file);
  return { setAside };
}

/** The key file's key id (null if the file isn't readable as one) and its key (null if it can't be opened). */
function unwrap(file, store) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { keyId: null, key: null };
  }
  const keyId = typeof parsed?.keyId === "string" && KEY_ID.test(parsed.keyId) ? parsed.keyId : null;
  if (parsed?.format !== 1 || keyId === null || typeof parsed.wrapped !== "string") return { keyId, key: null };
  try {
    const key = Buffer.from(store.decryptString(Buffer.from(parsed.wrapped, "base64")), "base64");
    // The id was written from the key; a key that doesn't match it is not the one the files need.
    if (key.length !== KEY_BYTES || keyIdOf(key) !== keyId) return { keyId, key: null };
    return { keyId, key };
  } catch {
    return { keyId, key: null };
  }
}

/**
 * How many receipt files in `receiptsDir` are encrypted with the key whose id is `keyId` (any key, when
 * null). Every file whose name starts with a receipt id counts, an unfinished add's ".partial" too.
 * Only the first bytes of each are read.
 */
export function countLockedReceipts(receiptsDir, keyId) {
  let names;
  try {
    names = readdirSync(receiptsDir, { withFileTypes: true })
      .filter((e) => e.isFile() && /^[0-9a-f]{32}\./.test(e.name))
      .map((e) => e.name);
  } catch {
    return 0;
  }
  let locked = 0;
  for (const name of names) {
    const head = readHead(path.join(receiptsDir, name), 32);
    if (!head || !isEncryptedReceipt(head)) continue;
    if (keyId === null || encryptedKeyId(head) === keyId) locked += 1;
  }
  return locked;
}

/** The first `length` bytes of a file (fewer if it's shorter), or null when it can't be read. */
function readHead(file, length) {
  let fd;
  try {
    fd = openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const head = Buffer.alloc(length);
    const n = readSync(fd, head, 0, length, 0);
    return head.subarray(0, n);
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}
