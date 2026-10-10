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
// Anything that fails is left exactly where it was and named, and the next receipt is tried: one
// receipt's failure never ends the run, so the answer always says what really moved.
//
// The list the page shows counts for the button only receipts that could come back (a row of the right
// type, not already in receipts/, a key here that opens it, not found changed by an earlier press), and
// counts the others apart so the page can say why. A folder an earlier Delete still owes (its wipe-pending
// note names it) is never offered, and the button refuses it: Delete said those receipts can't come back.
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
import { listLockedReceiptFolders, LOCKED_FOLDER_NAME, readWipePending } from "./wipe-pending.mjs";

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
  "delete-owed": "an earlier Delete still owes that folder",
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * Set-aside files a press found changed or damaged, by full path, with the size and modified time they
 * had then. The list doesn't offer them again while DotAmi runs (checking every file's SHA-256 on every
 * visit would mean reading every set-aside receipt each time). Forgotten when DotAmi closes, and as soon
 * as the file itself changes again.
 * @type {Map<string, string>}
 */
const foundChanged = new Map();

/** A file's size and modified time, as foundChanged keeps them, or null when it can't be read. */
function stamp(file) {
  try {
    const info = lstatSync(file);
    return `${info.size}:${info.mtimeMs}`;
  } catch {
    return null;
  }
}

/** The data file beside the receipts folder (desktop/main.mjs keeps it there). */
const dataFileIn = (dataDir) => path.join(dataDir, "dotami.db");

/** The set-aside folders an earlier Delete still owes (its wipe-pending note names them). */
function owedFolders(dataDir) {
  try {
    return new Set(readWipePending(dataFileIn(dataDir))?.receiptFolders ?? []);
  } catch {
    return new Set();
  }
}

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
  const read = readReceiptFile(file);
  return read.status === "ok" ? read.bytes : null;
}

/**
 * A set-aside file, read through one handle, and what it turned out to be:
 *   "ok"         the whole file (at most the size of a receipt)
 *   "too-big"    bigger than any receipt DotAmi keeps; only its first bytes, to tell encrypted from plain
 *   "unreadable" it couldn't be opened or read (another program has it open, say)
 * @returns {{ status: "ok", bytes: Buffer } | { status: "too-big", head: Buffer } | { status: "unreadable" }}
 */
function readReceiptFile(file) {
  let fd;
  try {
    fd = openSync(file, "r");
  } catch {
    return { status: "unreadable" };
  }
  try {
    const size = fstatSync(fd).size;
    // A file too big to be a receipt is never read whole: its first bytes say whether it is encrypted.
    const wanted = size > MAX_FILE_BYTES ? 32 : size;
    const bytes = Buffer.alloc(wanted);
    let read = 0;
    while (read < wanted) {
      const n = readSync(fd, bytes, read, wanted - read, read);
      if (n === 0) break;
      read += n;
    }
    if (read !== wanted) return { status: "unreadable" };
    return size > MAX_FILE_BYTES ? { status: "too-big", head: bytes } : { status: "ok", bytes };
  } catch {
    return { status: "unreadable" };
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
 * folder still holding encrypted receipt files, how many, and what each one is, so the page offers the
 * button only for receipts that could really come back and says why the others can't:
 *   canBringBack  a row of the right type, not already in receipts/, and a key here opens it
 *   noKey         no key here opens it (`keyFile` says whether the folder has a receipts.key of its own)
 *   noRecord      no Receipt row with its id, or a row of another type
 *   alreadyBack   a file of that name is already in receipts/ (this is an old copy)
 *   changed       bigger than any receipt, or found changed by a press while DotAmi runs
 *   unreadable    it couldn't be read just now (another program has it open)
 * A folder an earlier Delete still owes is listed with `deleteOwed` and nothing counted for the button.
 * Answers only DotAmi's own window, only while this start's key is open, and only when the data file's
 * rows can be read. Reads the first bytes of each file (the key id) and its size, never more; changes
 * nothing.
 * @param {string} dataDir
 * @param {{ fromDotAmi: boolean, opened: any, store: import("./receipt-key.mjs").KeyStore, platform?: string, readRows: () => Map<string, { type: string, bytes: number, sha256: string }>, log: (line: string) => void }} options
 */
export function listSetAsideReceipts(dataDir, { fromDotAmi, opened, store, platform = process.platform, readRows, log }) {
  const refuse = (reason) => {
    log(`[desktop] listing set-aside receipts was refused: ${REFUSED_RULE[reason]}`);
    return { outcome: "refused", reason };
  };
  const reason = refusedFor({ fromDotAmi, opened });
  if (reason) return refuse(reason);
  const backups = path.join(dataDir, "backups");
  const receiptsDir = path.join(dataDir, RECEIPTS_FOLDER);
  const names = listLockedReceiptFolders(dataFileIn(dataDir)).names;
  if (names.length === 0) return { outcome: "listed", folders: [] };
  let rows;
  try {
    rows = readRows();
  } catch {
    return refuse("data-file-unreadable");
  }
  const keys = keysFor(backups, store, platform, opened.key);
  const owed = owedFolders(dataDir);
  const folders = [];
  for (const name of names) {
    const folder = path.join(backups, name);
    const counts = { receipts: 0, canBringBack: 0, noKey: 0, noRecord: 0, alreadyBack: 0, changed: 0, unreadable: 0 };
    const deleteOwed = owed.has(name);
    for (const file of receiptNamesIn(folder)) {
      const full = path.join(folder, file);
      const read = readHead(full);
      // Can't be read now: counted, so a receipt is never left out without a word.
      if (!read) {
        counts.receipts += 1;
        counts.unreadable += 1;
        continue;
      }
      // Plain files aren't what Start a new key set aside, and are never offered.
      if (!isEncryptedReceipt(read.head)) continue;
      counts.receipts += 1;
      // A folder Delete still owes isn't sorted: none of it is offered.
      if (deleteOwed) continue;
      const [, id, extension] = file.match(RECEIPT_NAME);
      const row = rows.get(id);
      if (read.size > MAX_FILE_BYTES || (foundChanged.has(full) && foundChanged.get(full) === stamp(full))) counts.changed += 1;
      else if (!row || RECEIPT_EXTENSIONS[row.type] !== extension) counts.noRecord += 1;
      else if (somethingAt(path.join(receiptsDir, file))) counts.alreadyBack += 1;
      else if (!keys.has(encryptedKeyId(read.head))) counts.noKey += 1;
      else counts.canBringBack += 1;
    }
    if (counts.receipts > 0) {
      if (deleteOwed) counts.unreadable = 0;
      folders.push({ name, path: folder, ...counts, keyFile: isFileAt(path.join(folder, RECEIPT_KEY_FILE)), deleteOwed });
    }
  }
  return { outcome: "listed", folders };
}

/** True when a regular file (not a link) is at `target`. */
function isFileAt(target) {
  try {
    return lstatSync(target).isFile();
  } catch {
    return false;
  }
}

/** The first 32 bytes of a file (enough for the magic and the key id) and its size, or null when it can't be read. */
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
    return { head: head.subarray(0, n), size: fstatSync(fd).size };
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
 * The folder must also not be one an earlier Delete still owes (its wipe-pending note names it).
 *
 * `left` names each receipt that stayed, by the name DotAmi gave its file, with why:
 *   "no-record"     no Receipt row with its id (the record, or its receipt, was deleted since), or a row
 *                   of another type than its name says
 *   "no-key"        no key here opens it
 *   "changed"       it doesn't open with its key, doesn't match its row (size or SHA-256), or is bigger
 *                   than any receipt DotAmi keeps
 *   "already-there" a file of that name is already in receipts/
 *   "in-use"        it couldn't be read (another program has it open)
 *   "not-written"   it couldn't be written into receipts/ (undone: only what this step made is removed),
 *                   or anything else went wrong on its way back
 * `oldCopiesLeft`: brought back, but the set-aside copy couldn't be removed (another program had it open).
 *
 * One receipt's failure never ends the run: whatever throws while one receipt is handled, it is named
 * "not-written" and the next is tried, so the answer always says what really moved.
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
  // Delete told the person these receipts can never be opened again; its unfinished wipe still owes this
  // folder, so nothing in it comes back.
  if (owedFolders(dataDir).has(folderName)) return refuse("delete-owed");
  let rows;
  try {
    rows = readRows();
  } catch {
    return refuse("data-file-unreadable");
  }

  const step = {
    rows,
    keys: keysFor(backups, store, platform, opened.key),
    current: opened.key,
    receiptsDir: path.join(dataDir, RECEIPTS_FOLDER),
    onStep,
  };
  mkdirSync(step.receiptsDir, { recursive: true });
  const broughtBack = [];
  const oldCopiesLeft = [];
  const left = [];

  for (const name of receiptNamesIn(folder)) {
    let result;
    try {
      result = bringBackOne(path.join(folder, name), name, step);
    } catch {
      // Not expected (every step catches its own failures), but if anything does throw, this receipt is
      // named and the run goes on: earlier receipts may already have moved, and the answer must say so.
      result = { left: "not-written" };
    }
    if (result.skip) continue;
    if (result.left) {
      left.push({ name, why: result.left });
      continue;
    }
    broughtBack.push(name);
    if (result.oldCopyLeft) oldCopiesLeft.push(name);
  }

  log(`[desktop] set-aside receipts: ${broughtBack.length} brought back, ${left.length} left where they were`);
  return { outcome: "done", folder, broughtBack, oldCopiesLeft, left };
}

/**
 * One set-aside receipt, start to end (bringBackReceipts): `{ skip: true }` for a plain file (not what
 * Start a new key set aside), `{ left: <why> }` when it stays where it was, or `{ oldCopyLeft }` once it
 * is back in receipts/.
 */
function bringBackOne(from, name, { rows, keys, current, receiptsDir, onStep }) {
  const [, id, extension] = name.match(RECEIPT_NAME);
  const read = readReceiptFile(from);
  // Another program holding it is said, never skipped: the page names it and the person can try again.
  if (read.status === "unreadable") return { left: "in-use" };
  if (read.status === "too-big") return isEncryptedReceipt(read.head) ? { left: "changed" } : { skip: true };
  const file = read.bytes;
  // Plain files aren't what Start a new key set aside: not touched, not named.
  if (!isEncryptedReceipt(file)) return { skip: true };

  const row = rows.get(id);
  if (!row || RECEIPT_EXTENSIONS[row.type] !== extension) return { left: "no-record" };
  const key = keys.get(encryptedKeyId(file));
  if (!key) return { left: "no-key" };
  let plain;
  try {
    plain = decryptReceipt(file, { key, id });
  } catch {
    plain = null;
  }
  if (!plain || plain.length !== row.bytes || sha256(plain) !== row.sha256) {
    // Remembered so the list doesn't offer it again while DotAmi runs (unless the file changes again).
    const at = stamp(from);
    if (at) foundChanged.set(from, at);
    return { left: "changed" };
  }
  const target = path.join(receiptsDir, name);
  // Never over a file already there (put back by hand, or a copy brought back before).
  if (somethingAt(target)) return { left: "already-there" };

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
    if (made) {
      try {
        rmSync(made, { force: true });
      } catch {
        // Another program has the new file open too. A `.encrypting` leftover is removed by the next
        // start's pass over receipts/ (§ 9); a placed file stays, and the list then counts this receipt
        // as already back. Either way its set-aside copy is untouched.
      }
    }
    return { left: "not-written" };
  }
  try {
    unlinkSync(from);
    return { oldCopyLeft: false };
  } catch {
    return { oldCopyLeft: true };
  }
}
