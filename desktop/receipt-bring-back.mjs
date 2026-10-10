// [8i] "Bring these receipts back" (docs/architecture/expense-records.md § 12): after Start a new key
// moved the receipts locked with a key that couldn't be opened into backups/receipts-locked-<time>/
// (desktop/receipt-key.mjs setAsideLockedReceipts), the desktop app can bring them back once Windows
// opens their old key on this account again (the Windows profile came back, the old receipts.key turned
// up).
//
// Only the desktop app's main process can ask Windows to open a key, so it does the whole job here; the
// server never sees an old key and isn't told anything (it reads each receipt file from the disk every
// time it shows one). For each receipt, one at a time:
//   its Receipt row (by the id in its name) → the key its header names → decrypted in memory and checked
//   against the row (size and SHA-256) → locked again with the current key → written beside its final
//   name, flushed, renamed into receipts/, read back and checked → only then the set-aside copy removed.
// Anything that fails is left exactly where it was and named, and the next receipt is tried.
//
// Plain Node and no Electron import (`store` is safeStorage in the app, a stand-in in
// tests/receipt-bring-back.spec.ts). Everything here is synchronous on purpose: the main process runs a
// request from start to end before it looks at the next, so two presses can never overlap.
import { createHash } from "node:crypto";
import { closeSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readdirSync, readSync, renameSync, rmSync, unlinkSync, writeSync } from "node:fs";
import path from "node:path";

import { RECEIPT_EXTENSIONS } from "./backup.mjs";
import { decryptReceipt, ENCRYPTED_OVERHEAD, encryptedKeyId, encryptReceipt, isEncryptedReceipt, keyIdOf } from "./receipt-crypto.mjs";
import { openKeyFile, RECEIPT_KEY_FILE } from "./receipt-key.mjs";
import { openDatabase } from "./sqlite.mjs";
import { listLockedReceiptFolders, LOCKED_FOLDER_NAME } from "./wipe-pending.mjs";

/** The receipts folder beside the data file (lib/expenses/receipts/store.ts RECEIPTS_FOLDER). */
const RECEIPTS_FOLDER = "receipts";
/** A finished receipt file DotAmi named: its id and the extension of its type. Nothing else is touched. */
const RECEIPT_NAME = new RegExp(`^([0-9a-f]{32})\\.(${Object.values(RECEIPT_EXTENSIONS).join("|")})$`);
/** The suffix of the file written before it is renamed into place: the same one the first-start pass uses, so its leftovers are removed by the next start. */
const IN_PROGRESS = ".encrypting";
/** Receipts are at most 10 MB (the maintainer's cap); a bigger file is not one DotAmi kept. */
const MAX_FILE_BYTES = 10 * 1024 * 1024 + ENCRYPTED_OVERHEAD;

/**
 * Why a request was refused (nothing moved). The page has a sentence for each (lib/expenses/receipts/
 * protection.ts BRING_BACK_REFUSED); the log gets the rule in words.
 */
const REFUSED_RULE = {
  "not-dotami-window": "it wasn't asked by DotAmi's own window",
  "no-current-key": "this start's receipts key isn't open",
  closing: "DotAmi is closing",
  "not-a-set-aside-folder": "that isn't a folder Start a new key made",
  "data-file-unreadable": "the data file couldn't be read",
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** True when `target` is a real folder, not a link or junction (lstat doesn't follow them; Node reports a junction as a link). */
function isRealFolder(target) {
  try {
    const info = lstatSync(target);
    return info.isDirectory() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

/** True when anything at all is at `target`, a link included. */
function somethingAt(target) {
  try {
    lstatSync(target);
    return true;
  } catch {
    return false;
  }
}

/** A whole file through one handle, or null when it is bigger than any receipt or can't be read. */
function readSmall(file) {
  let fd;
  try {
    fd = openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const size = fstatSync(fd).size;
    if (size > MAX_FILE_BYTES) return null;
    const bytes = Buffer.alloc(size);
    let read = 0;
    while (read < size) {
      const n = readSync(fd, bytes, read, size - read, read);
      if (n === 0) break;
      read += n;
    }
    return read === size ? bytes : null;
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

/** The receipt files DotAmi named in a set-aside folder: regular files only, never a link, sorted. */
function receiptNamesIn(folder) {
  return readdirSync(folder, { withFileTypes: true })
    .filter((e) => e.isFile() && RECEIPT_NAME.test(e.name))
    .map((e) => e.name)
    .sort();
}

/**
 * Every key that can open a set-aside receipt, by its id: the old key file in each receipts-locked
 * folder that this account can open, and this start's own key. All the folders' keys, not only the
 * folder's own: a move cut short leaves receipts in one folder and the key file in the next (§ 10).
 */
function keysFor(backups, store, platform, currentKey) {
  const keys = new Map([[keyIdOf(currentKey), currentKey]]);
  if (!isRealFolder(backups)) return keys;
  for (const entry of readdirSync(backups, { withFileTypes: true })) {
    if (!entry.isDirectory() || !LOCKED_FOLDER_NAME.test(entry.name)) continue;
    const file = path.join(backups, entry.name, RECEIPT_KEY_FILE);
    try {
      if (!lstatSync(file).isFile()) continue;
    } catch {
      continue;
    }
    const { key } = openKeyFile(file, store, platform);
    if (key) keys.set(keyIdOf(key), key);
  }
  return keys;
}

/**
 * The Receipt rows of the data file, by id: what each receipt file must match. Read-only, with the data
 * file's key when it is encrypted (desktop/sqlite.mjs); throws when the file can't be opened.
 * @param {string} dbFile
 * @param {Buffer | null} databaseKey
 * @returns {Map<string, { type: string, bytes: number, sha256: string }>}
 */
export function receiptRowsIn(dbFile, databaseKey) {
  const db = openDatabase(dbFile, { key: databaseKey, readonly: true, fileMustExist: true });
  try {
    const rows = new Map();
    for (const r of db.prepare(`SELECT id, type, bytes, sha256 FROM "Receipt"`).all()) {
      rows.set(String(r.id), { type: String(r.type), bytes: Number(r.bytes), sha256: String(r.sha256) });
    }
    return rows;
  } finally {
    db.close();
  }
}

/** The first refusal rule both calls share, or null: DotAmi's own window, and this start's key open. */
function refusedFor({ fromDotAmi, opened }) {
  if (!fromDotAmi) return "not-dotami-window";
  if (opened?.state !== "on" || !Buffer.isBuffer(opened.key) || opened.key.length !== 32) return "no-current-key";
  return null;
}

/**
 * The set-aside folders the page lists (expense-records.md § 12, "Where it shows"): each receipts-locked
 * folder still holding encrypted receipt files, how many, and how many of them a key here opens. Answers
 * only DotAmi's own window, and only while this start's key is open. Reads the first bytes of each file
 * (the key id), never more; changes nothing.
 * @param {string} dataDir
 * @param {{ fromDotAmi: boolean, opened: any, store: import("./receipt-key.mjs").KeyStore, platform?: string, log: (line: string) => void }} options
 * @returns {{ outcome: "refused", reason: string } | { outcome: "listed", folders: { name: string, path: string, receipts: number, canOpen: number }[] }}
 */
export function listSetAsideReceipts(dataDir, { fromDotAmi, opened, store, platform = process.platform, log }) {
  const reason = refusedFor({ fromDotAmi, opened });
  if (reason) {
    log(`[desktop] listing set-aside receipts was refused: ${REFUSED_RULE[reason]}`);
    return { outcome: "refused", reason };
  }
  const backups = path.join(dataDir, "backups");
  const keys = keysFor(backups, store, platform, opened.key);
  const folders = [];
  for (const name of listLockedReceiptFolders(path.join(dataDir, "dotami.db")).names) {
    const folder = path.join(backups, name);
    let receipts = 0;
    let canOpen = 0;
    for (const file of receiptNamesIn(folder)) {
      const head = readHead(path.join(folder, file));
      // Plain files aren't what Start a new key set aside, and are never offered.
      if (!head || !isEncryptedReceipt(head)) continue;
      receipts += 1;
      if (keys.has(encryptedKeyId(head))) canOpen += 1;
    }
    if (receipts > 0) folders.push({ name, path: folder, receipts, canOpen });
  }
  return { outcome: "listed", folders };
}

/** The first 32 bytes of a file (enough for the magic and the key id), or null. */
function readHead(file) {
  let fd;
  try {
    fd = openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const head = Buffer.alloc(32);
    const n = readSync(fd, head, 0, head.length, 0);
    return head.subarray(0, n);
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

/**
 * Brings the receipts in one set-aside folder back into receipts/, locked with this start's key
 * (expense-records.md § 12, "What the button does"). The main process decides from what it knows itself:
 * refused, with nothing moved, unless the request is from DotAmi's own window, this start's key is open,
 * the app isn't closing, `folderName` is exactly a folder Start a new key makes and both it and the
 * backups folder are real folders (never a link or junction), and the data file's rows can be read.
 *
 * `left` names each receipt that stayed, by the name DotAmi gave its file, with why:
 *   "no-record"     no Receipt row with its id (the record, or its receipt, was deleted since), or a row
 *                   of another type than its name says
 *   "no-key"        no key here opens it
 *   "changed"       it doesn't open with its key, or doesn't match its row (size or SHA-256)
 *   "already-there" a file of that name is already in receipts/
 *   "not-written"   it couldn't be written into receipts/ (undone: only what this step made is removed)
 * `oldCopiesLeft`: brought back, but the set-aside copy couldn't be removed (another program had it open).
 *
 * `onStep(step, name)` is for the tests, which throw at "temp-written" or "placed" to stop a write there.
 * @param {string} dataDir
 * @param {string} folderName
 * @param {{
 *   fromDotAmi: boolean,
 *   opened: any,
 *   quitting: boolean,
 *   store: import("./receipt-key.mjs").KeyStore,
 *   platform?: string,
 *   readRows: () => Map<string, { type: string, bytes: number, sha256: string }>,
 *   log: (line: string) => void,
 *   onStep?: (step: "temp-written" | "placed", name: string) => void,
 * }} options
 */
export function bringBackReceipts(dataDir, folderName, { fromDotAmi, opened, quitting, store, platform = process.platform, readRows, log, onStep = () => {} }) {
  const refuse = (reason) => {
    log(`[desktop] bringing set-aside receipts back was refused: ${REFUSED_RULE[reason]}`);
    return { outcome: "refused", reason };
  };
  const first = refusedFor({ fromDotAmi, opened });
  if (first) return refuse(first);
  if (quitting) return refuse("closing");
  // The name is checked against DotAmi's own pattern before it goes near a path, so nothing the page
  // sends ("..", a slash, another folder) can point anywhere else.
  if (typeof folderName !== "string" || !LOCKED_FOLDER_NAME.test(folderName)) return refuse("not-a-set-aside-folder");
  const backups = path.join(dataDir, "backups");
  const folder = path.join(backups, folderName);
  if (!isRealFolder(backups) || !isRealFolder(folder)) return refuse("not-a-set-aside-folder");
  let rows;
  try {
    rows = readRows();
  } catch {
    return refuse("data-file-unreadable");
  }

  const current = opened.key;
  const keys = keysFor(backups, store, platform, current);
  const receiptsDir = path.join(dataDir, RECEIPTS_FOLDER);
  mkdirSync(receiptsDir, { recursive: true });
  const broughtBack = [];
  const oldCopiesLeft = [];
  const left = [];

  for (const name of receiptNamesIn(folder)) {
    const [, id, extension] = name.match(RECEIPT_NAME);
    const from = path.join(folder, name);
    const file = readSmall(from);
    // Plain files and files too big to be a receipt aren't what Start a new key set aside: not touched, not named.
    if (!file || !isEncryptedReceipt(file)) continue;

    const row = rows.get(id);
    if (!row || RECEIPT_EXTENSIONS[row.type] !== extension) {
      left.push({ name, why: "no-record" });
      continue;
    }
    const key = keys.get(encryptedKeyId(file));
    if (!key) {
      left.push({ name, why: "no-key" });
      continue;
    }
    let plain;
    try {
      plain = decryptReceipt(file, { key, id });
    } catch {
      plain = null;
    }
    if (!plain || plain.length !== row.bytes || sha256(plain) !== row.sha256) {
      left.push({ name, why: "changed" });
      continue;
    }
    const target = path.join(receiptsDir, name);
    // Never over a file already there (put back by hand, or a copy brought back before).
    if (somethingAt(target)) {
      left.push({ name, why: "already-there" });
      continue;
    }

    const temp = `${target}${IN_PROGRESS}`;
    /** What this step made on the disk, removed again if it fails. */
    let made = null;
    try {
      const locked = encryptReceipt(plain, { key: current, id });
      // "wx": never overwrite anything, even a leftover of an earlier try (the next start removes those).
      const fd = openSync(temp, "wx");
      made = temp;
      try {
        let done = 0;
        while (done < locked.length) done += writeSync(fd, locked, done, locked.length - done);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      onStep("temp-written", name);
      renameSync(temp, target);
      made = target;
      onStep("placed", name);
      // Read back from the disk and opened with the current key: the set-aside copy goes only once the
      // new one is known to open and match.
      const back = readSmall(target);
      const reopened = back ? decryptReceipt(back, { key: current, id }) : null;
      if (!reopened || reopened.length !== row.bytes || sha256(reopened) !== row.sha256) throw new Error("the receipt written back doesn't match its row");
    } catch {
      if (made) rmSync(made, { force: true });
      left.push({ name, why: "not-written" });
      continue;
    }
    broughtBack.push(name);
    try {
      unlinkSync(from);
    } catch {
      oldCopiesLeft.push(name);
    }
  }

  log(`[desktop] set-aside receipts: ${broughtBack.length} brought back, ${left.length} left where they were`);
  return { outcome: "done", folder, broughtBack, oldCopiesLeft, left };
}
