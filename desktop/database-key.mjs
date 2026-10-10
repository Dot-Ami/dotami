// [8i] The key that encrypts the data file (dotami.db) and its safety copies, kept only wrapped by the
// operating system's per-user protection: Electron's safeStorage (DPAPI for the Windows account), the
// same mechanism as the receipts' key (desktop/receipt-key.mjs), in a file of its own, `database.key`.
// The design: docs/architecture/database-encryption.md § 2 and § 10.
//
// The file is JSON, as receipts.key is:
//   { "format": 1, "keyId": "<16 hex: the first 8 bytes of SHA-256(key)>", "wrapped": "<base64 of what
//     safeStorage.encryptString made of the key's base64>" }
// The key itself is never written anywhere else: not in the database, not in a backup, not in the log.
//
// Two rules differ from the receipts' key, which is why it is a file of its own:
// - It is made only when something is about to be encrypted (a new data folder, or the person saying
//   "Encrypt now"), never just because the app started.
// - Once anything is encrypted with it, it is never replaced automatically: a missing or unreadable key
//   file leaves everything as it is ("key-unreadable"), because the key may come back (a profile that
//   loads later, database.key put back from the Recycle Bin), and a new key would open nothing.
// A key is saved only once Windows' own key is on the disk (receipt-key.mjs waitForLocalState), and is
// read back from the disk and opened before it is used, so a key that can't be opened is never used to
// lock anything (§ 10, "Two cheap checks").
//
// `store` is Electron's safeStorage in the app and a stand-in in the tests (tests/database-key.spec.ts).
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeSync } from "node:fs";
import path from "node:path";

import { keyIdOf } from "./receipt-crypto.mjs";
import { KeyStoreNotSaved, keyStoreAvailable, NoKeyStore, waitForLocalState } from "./receipt-key.mjs";

/** The key file's name beside the data file. lib/privacy/inventory.ts FOLDERS lists it under this name. */
export const DATABASE_KEY_FILE = "database.key";
const KEY_BYTES = 32;
const KEY_ID = /^[0-9a-f]{16}$/;

export { KeyStoreNotSaved, NoKeyStore };

/** Thrown by makeDatabaseKey when the key it saved can't be read back and opened: it was removed, and nothing was locked with it. */
export class KeyNotReadableAfterSave extends Error {
  constructor() {
    super("the data file's key couldn't be opened right after it was saved");
    this.name = "KeyNotReadableAfterSave";
  }
}

/**
 * Opens the data file's key for the data folder `dataDir`. It never makes one (makeDatabaseKey does).
 * `locked` says whether anything is encrypted already (the data file or a safety copy).
 * Returns:
 *   { state: "on", key, keyId }  the key is open
 *   { state: "none", unreadable }  there is no usable key, and nothing is locked: a key may be made when
 *       something is to be encrypted (`unreadable`: a key file is there that this account can't open; it
 *       will be moved to backups/, never deleted)
 *   { state: "no-key-store" }  the operating system's protection isn't available and nothing is locked
 *   { state: "key-unreadable", keyId, missing, storeUnavailable }  something is locked, and no key here
 *       opens it: the key file can't be opened by this account, holds another key, is `missing`, or the
 *       key store isn't available right now (`storeUnavailable`: a restart may bring it back, so nothing
 *       may be given up for it). Nothing on the disk is changed.
 * @param {string} dataDir
 * @param {import("./receipt-key.mjs").KeyStore} store
 * @param {{ locked: boolean, platform?: string }} options
 */
export function openDatabaseKey(dataDir, store, { locked, platform = process.platform }) {
  const file = path.join(dataDir, DATABASE_KEY_FILE);
  const missing = !existsSync(file);
  if (!keyStoreAvailable(store, platform)) {
    if (locked) return { state: "key-unreadable", keyId: missing ? null : readKeyFile(file).keyId, missing, storeUnavailable: true };
    return { state: "no-key-store" };
  }
  if (missing) return locked ? { state: "key-unreadable", keyId: null, missing: true, storeUnavailable: false } : { state: "none", unreadable: false };
  const { keyId, key } = unwrap(file, store);
  if (key) return { state: "on", key, keyId: keyIdOf(key) };
  return locked ? { state: "key-unreadable", keyId, missing: false, storeUnavailable: false } : { state: "none", unreadable: true };
}

/**
 * Makes a new key, saves it wrapped as database.key (once the operating system's own key is on the disk),
 * reads it back from the disk and opens it, and only then returns it. A key file already there (one that
 * can't be opened: the caller has checked nothing is locked with it) is moved to
 * backups/database-key-unreadable-<time>.key first, never deleted. Written beside its name, flushed,
 * then renamed into place, so a crash leaves either the old file or the whole new one.
 * Throws NoKeyStore (no real key store), KeyStoreNotSaved (Windows' own key never reached the disk) or
 * KeyNotReadableAfterSave; in each case nothing is locked with any new key.
 * @param {string} dataDir
 * @param {import("./receipt-key.mjs").KeyStore} store
 * @param {{ platform?: string, now?: () => number, keyStoreSaved?: () => Promise<boolean>, key?: Buffer }} [options]
 *   `key`: the key to save instead of a new random one (a restore that brings its own).
 * @returns {Promise<{ key: Buffer, keyId: string, setAside: string | null }>}
 */
export async function makeDatabaseKey(dataDir, store, { platform = process.platform, now = Date.now, keyStoreSaved, key = randomBytes(KEY_BYTES) } = {}) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) throw new Error("a database key is 32 bytes");
  if (!keyStoreAvailable(store, platform)) throw new NoKeyStore();
  const file = path.join(dataDir, DATABASE_KEY_FILE);
  // Wrapped first: on Windows this makes sure Electron's own key exists, and the wait is for that key to
  // reach the disk.
  const wrapped = store.encryptString(key.toString("base64")).toString("base64");
  if (!(await (keyStoreSaved ?? (() => waitForLocalState(dataDir, { platform })))())) throw new KeyStoreNotSaved();
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
    setAside = path.join(backups, `database-key-unreadable-${now()}.key`);
    renameSync(file, setAside);
  }
  renameSync(partial, file);
  // Read back from the disk and opened before anything is locked with it.
  const back = unwrap(file, store).key;
  if (!back || !back.equals(key)) {
    rmSync(file, { force: true });
    if (setAside) renameSync(setAside, file);
    throw new KeyNotReadableAfterSave();
  }
  return { key, keyId: keyIdOf(key), setAside };
}

/** The key file as parsed: its key id (null if it isn't readable as one), and the parsed JSON. */
function readKeyFile(file) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { keyId: null, parsed: null };
  }
  const keyId = typeof parsed?.keyId === "string" && KEY_ID.test(parsed.keyId) ? parsed.keyId : null;
  return { keyId, parsed };
}

/** The key file's key id (null if the file isn't readable as one) and its key (null if it can't be opened). */
function unwrap(file, store) {
  const { keyId, parsed } = readKeyFile(file);
  if (parsed?.format !== 1 || keyId === null || typeof parsed.wrapped !== "string") return { keyId, key: null };
  try {
    const key = Buffer.from(store.decryptString(Buffer.from(parsed.wrapped, "base64")), "base64");
    // The id was written from the key; a key that doesn't match it is not the one the file needs.
    if (key.length !== KEY_BYTES || keyIdOf(key) !== keyId) return { keyId, key: null };
    return { keyId, key };
  } catch {
    return { keyId, key: null };
  }
}
