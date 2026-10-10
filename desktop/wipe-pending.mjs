// The safety copies in the backups folder, the receipt folders DotAmi set aside there, and the
// "wipe pending" marker that Delete leaves beside the data file until its wipe is finished ([8d]).
//
// Two programs use this file: DotAmi's server (lib/privacy/delete.ts, when the person ticks
// "Safety copies in the backups folder" on the Delete menu) and the desktop app at start-up
// (desktop/main.mjs, which finishes a wipe that couldn't finish). It uses only the file system, so
// the server can bundle it; the database part (VACUUM) is passed in by each caller.
//
// Deleting files on someone's disk is the dangerous part, so it is fenced in three ways:
//   - only the folder named "backups" beside the data file, and only when that folder is a real
//     folder: a link or junction to somewhere else is refused, never followed;
//   - only files directly inside it whose names DotAmi itself gives its safety copies
//     (desktop/migrate.mjs and desktop/backup.mjs write `dotami-before-<what>-<time>.db`), and
//     only regular files, never a link; anything else in the folder stays;
//   - at start-up, only the copies the marker names: the ones the person ticked and confirmed and
//     that couldn't be deleted then. A copy made since is never touched.
//
// [8i] The same box also clears the receipt folders DotAmi set aside in the backups folder
// (docs/architecture/expense-records.md § 11): `receipts-locked-<time>` (Start a new key) and
// `receipts-before-restore-<time>` (a restore). Fenced the same way, one level deeper: only folders
// directly inside a real backups folder, with exactly those names, that are real folders themselves
// (never a link or junction); inside, only regular files DotAmi named (a receipt file, an unfinished
// write of one, the old receipts.key); anything else inside stays, and the folder with it. An emptied
// folder is removed.
//
// [8i] And what a lost key leaves there (docs/architecture/database-encryption.md § 15): the receipts
// folder Start fresh sets aside (`receipts-before-start-fresh-<time>`, cleared like a restore's), the old
// key files a new key moves aside (`receipts-key-unreadable-<time>.key`, `database-key-unreadable-<time>.key`)
// and the locked data file a lost key's restore or Start fresh moves aside (`dotami-locked-<time>.db`, with
// its `-journal`). Fenced like the safety copies: DotAmi's exact names, directly in a real backups folder,
// regular files only.
//
// The marker is written before the wipe starts and removed once it has worked, so a wipe that the
// computer cut short (busy, out of disk, switched off) is finished the next time the desktop app
// starts. Without a marker, start-up does nothing here: free space in the file is normal after
// any ordinary edit, and rebuilding the file on every start would slow it for nothing.
import { existsSync, lstatSync, readdirSync, readFileSync, rmdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

/** The names DotAmi gives its own safety copies: `dotami-before-<migration or "restore">-<time>.db`. */
export const SAFETY_COPY_NAME = /^dotami-before-[A-Za-z0-9_-]+\.db$/;

/**
 * The names DotAmi gives the folders it sets receipts aside in, directly in the backups folder:
 * `receipts-locked-<time>`, with `-<n>` when two were made in the same millisecond (Start a new key,
 * desktop/receipt-key.mjs setAsideLockedReceipts), `receipts-before-restore-<time>` (a restore,
 * desktop/backup.mjs applyRestore) and `receipts-before-start-fresh-<time>` ([8i] Start fresh,
 * desktop/main.mjs startFresh). <time> is Date.now().
 */
export const SET_ASIDE_FOLDER_NAME = /^receipts-(?:locked-\d+(?:-\d+)?|before-restore-\d+|before-start-fresh-\d+)$/;

/**
 * [8i] The names DotAmi gives a key file it moves aside when it makes a new key beside one that couldn't
 * be opened: `receipts-key-unreadable-<time>.key` (desktop/receipt-key.mjs saveReceiptKey) and
 * `database-key-unreadable-<time>.key` (desktop/database-key.mjs makeDatabaseKey). Never the live key files
 * (`receipts.key`, `database.key`), which sit beside the data file, not in backups/.
 */
export const SET_ASIDE_KEY_NAME = /^(?:receipts|database)-key-unreadable-\d+\.key$/;

/**
 * [8i] The name DotAmi gives a data file it moves aside because its key is lost (desktop/encrypt-database.mjs
 * setAsideLockedFile): `dotami-locked-<time>.db`. Its journal, when it had one, goes beside it under the same
 * name with `-journal`, and is cleared with it.
 */
export const LOCKED_DATA_FILE_NAME = /^dotami-locked-\d+\.db$/;
const JOURNAL = "-journal";

/**
 * The files DotAmi puts in those folders: a receipt file under the name DotAmi gave it (32 random hex
 * characters and the extension of its type: desktop/backup.mjs RECEIPT_EXTENSIONS, which
 * tests/desktop-wipe-pending.spec.ts keeps equal to this list), an unfinished write of one (".partial"
 * from adding, ".encrypting" from the first-start pass), and the old key file. A folder a restore moved
 * here is the whole receipts folder as it was, so it can also hold what the person put there: never
 * matched, never deleted.
 */
const SET_ASIDE_FILE_NAME = /^(?:[0-9a-f]{32}\.(?:jpg|png|webp|pdf|heic)(?:\.(?:partial|encrypting))?|receipts\.key)$/;

/** The marker's file: beside the data file, named after it (`dotami.db.wipe-pending`). */
export function wipePendingFile(dbFile) {
  return `${dbFile}.wipe-pending`;
}

/** The backups folder of a data file: `backups/` in the same folder. */
export function backupsFolder(dbFile) {
  return path.join(path.dirname(dbFile), "backups");
}

/** True when `target` is a real folder, not a link or junction to one (lstat doesn't follow links). */
function isRealFolder(target) {
  try {
    const info = lstatSync(target);
    return info.isDirectory() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

/** True when `target` is a regular file, not a link to one. */
function isRealFile(target) {
  try {
    const info = lstatSync(target);
    return info.isFile() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * The safety copies DotAmi made in the data file's backups folder: names only, sorted. Empty when
 * there is no folder, or when the folder is a link (not ours to follow). `others` counts what else
 * is in the folder, which Delete leaves alone.
 * @param {string} dbFile
 * @returns {{ names: string[], others: number }}
 */
export function listSafetyCopies(dbFile) {
  const folder = backupsFolder(dbFile);
  if (!isRealFolder(folder)) return { names: [], others: 0 };
  const names = [];
  let others = 0;
  for (const item of readdirSync(folder, { withFileTypes: true })) {
    // Dirent says what the entry itself is, without following a link.
    if (item.isFile() && SAFETY_COPY_NAME.test(item.name)) names.push(item.name);
    else others += 1;
  }
  return { names: names.sort(), others };
}

/**
 * Deletes the named safety copies from the backups folder. A name that isn't one DotAmi gives its
 * copies (so also anything with a slash or "..") is never deleted, and neither is a link; a copy
 * that is already gone counts as deleted. `remove` is unlinkSync, replaceable in tests.
 * @param {string} dbFile
 * @param {readonly string[]} names
 * @param {{ remove?: (file: string) => void }} [options]
 * @returns {{ deleted: string[], left: string[] }}
 */
export function deleteSafetyCopies(dbFile, names, { remove = unlinkSync } = {}) {
  return deleteFilesNamed(dbFile, names, SAFETY_COPY_NAME, remove);
}

/**
 * [8i] The key files DotAmi moved aside in the data file's backups folder when it made a new key
 * (SET_ASIDE_KEY_NAME): names only, sorted; regular files directly in the folder, never a link. Empty
 * when there is no backups folder, or when it is a link.
 * @param {string} dbFile
 * @returns {{ names: string[] }}
 */
export function listSetAsideKeyFiles(dbFile) {
  const folder = backupsFolder(dbFile);
  if (!isRealFolder(folder)) return { names: [] };
  const names = readdirSync(folder, { withFileTypes: true })
    .filter((item) => item.isFile() && SET_ASIDE_KEY_NAME.test(item.name))
    .map((item) => item.name);
  return { names: names.sort() };
}

/**
 * [8i] Deletes the named set-aside key files, fenced exactly like the safety copies (deleteSafetyCopies):
 * only SET_ASIDE_KEY_NAME, never a link, one already gone counts as deleted, one another program holds is
 * left, still owed.
 * @param {string} dbFile
 * @param {readonly string[]} names
 * @param {{ remove?: (file: string) => void }} [options]
 * @returns {{ deleted: string[], left: string[] }}
 */
export function deleteSetAsideKeyFiles(dbFile, names, { remove = unlinkSync } = {}) {
  return deleteFilesNamed(dbFile, names, SET_ASIDE_KEY_NAME, remove);
}

/** The name a locked data file's journal would have its file's name under, or null when it isn't one. */
function lockedFileOfJournal(name) {
  if (!name.endsWith(JOURNAL)) return null;
  const file = name.slice(0, -JOURNAL.length);
  return LOCKED_DATA_FILE_NAME.test(file) ? file : null;
}

/**
 * [8i] The locked data files DotAmi moved aside in the data file's backups folder, by the data file's name
 * (`dotami-locked-<time>.db`), sorted, each once: its journal counts with it, and a journal whose file is
 * already gone (removed by hand, or a removal cut short in an older order) is listed under its file's
 * name, so no part of one is out of Delete's reach. Regular files only, never a link. Empty when there is
 * no backups folder, or when it is a link.
 * @param {string} dbFile
 * @returns {{ names: string[] }}
 */
export function listLockedDataFiles(dbFile) {
  const folder = backupsFolder(dbFile);
  if (!isRealFolder(folder)) return { names: [] };
  const names = new Set();
  for (const item of readdirSync(folder, { withFileTypes: true })) {
    if (!item.isFile()) continue;
    if (LOCKED_DATA_FILE_NAME.test(item.name)) names.add(item.name);
    else {
      const file = lockedFileOfJournal(item.name);
      if (file) names.add(file);
    }
  }
  return { names: [...names].sort() };
}

/**
 * [8i] Deletes the named locked data files, each with its journal. The journal goes first, then the file:
 * if the journal can't go (another program holds it, or a link wears its name), the file stays too, so
 * the page never shows a file gone while part of it is left uncounted, and the name stays owed. A name
 * that isn't LOCKED_DATA_FILE_NAME (so also anything with a slash or "..") is never touched, nor is a
 * link, nor anything behind a backups folder that is a link. One already gone, journal and all, counts
 * as deleted. `remove` is unlinkSync, replaceable in tests.
 * @param {string} dbFile
 * @param {readonly string[]} names
 * @param {{ remove?: (file: string) => void }} [options]
 * @returns {{ deleted: string[], left: string[] }}
 */
export function deleteLockedDataFiles(dbFile, names, { remove = unlinkSync } = {}) {
  const folder = backupsFolder(dbFile);
  const deleted = [];
  const left = [];
  // Checked again here, not only when listing: the folder could have been swapped for a link.
  const folderOk = isRealFolder(folder);
  for (const name of new Set(names)) {
    if (!LOCKED_DATA_FILE_NAME.test(name)) continue;
    if (!folderOk) {
      if (existsSync(folder)) left.push(name);
      else deleted.push(name);
      continue;
    }
    const file = path.join(folder, name);
    let stuck = false;
    for (const part of [`${file}${JOURNAL}`, file]) {
      if (!existsSync(part) && !isSymlink(part)) continue;
      // Once more just before it goes: a regular file, not a link (or folder) put there since.
      if (!isRealFile(part)) {
        stuck = true;
        break;
      }
      try {
        remove(part);
      } catch {
        stuck = true;
        break;
      }
    }
    (stuck ? left : deleted).push(name);
  }
  return { deleted, left };
}

/**
 * Deletes the named files directly in the backups folder, only when the name matches `pattern` in full
 * and the file is a regular file (never a link, never through a backups folder that is a link). One
 * already gone counts as deleted; one that can't be removed (another program holds it) is left.
 * @param {string} dbFile
 * @param {readonly string[]} names
 * @param {RegExp} pattern
 * @param {(file: string) => void} remove
 * @returns {{ deleted: string[], left: string[] }}
 */
function deleteFilesNamed(dbFile, names, pattern, remove) {
  const folder = backupsFolder(dbFile);
  const deleted = [];
  const left = [];
  // Checked once more here, not only when listing: the folder could have been swapped for a link.
  const folderOk = isRealFolder(folder);
  for (const name of new Set(names)) {
    if (!pattern.test(name)) continue;
    const file = path.join(folder, name);
    if (!folderOk) {
      // Nothing of ours to delete behind a link; if the folder is simply gone, so are the copies.
      if (existsSync(folder)) left.push(name);
      else deleted.push(name);
      continue;
    }
    if (!existsSync(file) && !isSymlink(file)) {
      deleted.push(name);
      continue;
    }
    if (!isRealFile(file)) {
      left.push(name);
      continue;
    }
    try {
      remove(file);
      deleted.push(name);
    } catch {
      // Another program has it open (Windows won't delete an open file), or no permission: it
      // stays owed, and the marker keeps its name for the next try.
      left.push(name);
    }
  }
  return { deleted, left };
}

/** The files in a set-aside folder that DotAmi put there: regular files with its names, never a link. */
function dotAmiFilesIn(folder) {
  return readdirSync(folder, { withFileTypes: true })
    .filter((item) => item.isFile() && SET_ASIDE_FILE_NAME.test(item.name))
    .map((item) => item.name);
}

/**
 * [8i] The receipt folders DotAmi set aside in the data file's backups folder, by name, sorted: real
 * folders with the names it gives them that hold at least one file it named, or nothing at all (a move
 * cut short before its first file). A folder holding only what the person put there has nothing of
 * DotAmi's to clear, so it isn't listed. Empty when there is no backups folder, or it is a link.
 * @param {string} dbFile
 * @returns {{ names: string[] }}
 */
export function listSetAsideReceiptFolders(dbFile) {
  const backups = backupsFolder(dbFile);
  if (!isRealFolder(backups)) return { names: [] };
  const names = [];
  for (const item of readdirSync(backups, { withFileTypes: true })) {
    // Dirent says what the entry itself is: a junction or link wearing the name isn't a directory here.
    if (!item.isDirectory() || !SET_ASIDE_FOLDER_NAME.test(item.name)) continue;
    const folder = path.join(backups, item.name);
    try {
      if (readdirSync(folder).length === 0 || dotAmiFilesIn(folder).length > 0) names.push(item.name);
    } catch {
      // Can't be read (permissions): nothing DotAmi could clear either.
    }
  }
  return { names: names.sort() };
}

/**
 * [8i] Clears the named set-aside receipt folders: deletes the files DotAmi put in each (never a link,
 * never anything else), then removes the folder if that left it empty. A folder counts as cleared once
 * none of DotAmi's files is left in it, even if the person's own files keep it there; one that is
 * already gone counts as cleared; one with a file that couldn't be deleted (another program has it
 * open) is left, still owed. A name that isn't one DotAmi gives a set-aside folder (so also anything
 * with a slash or "..") is never touched, and neither is a folder behind a link. `remove` is
 * unlinkSync, replaceable in tests.
 * @param {string} dbFile
 * @param {readonly string[]} names
 * @param {{ remove?: (file: string) => void }} [options]
 * @returns {{ deleted: string[], left: string[] }}
 */
export function deleteSetAsideReceiptFolders(dbFile, names, { remove = unlinkSync } = {}) {
  const backups = backupsFolder(dbFile);
  const deleted = [];
  const left = [];
  // Checked again here, not only when listing: either folder could have been swapped for a link.
  const backupsOk = isRealFolder(backups);
  for (const name of new Set(names)) {
    if (!SET_ASIDE_FOLDER_NAME.test(name)) continue;
    const folder = path.join(backups, name);
    if (!backupsOk) {
      if (existsSync(backups)) left.push(name);
      else deleted.push(name);
      continue;
    }
    if (!existsSync(folder) && !isSymlink(folder)) {
      deleted.push(name);
      continue;
    }
    if (!isRealFolder(folder)) {
      left.push(name);
      continue;
    }
    let stuck = false;
    try {
      for (const file of dotAmiFilesIn(folder)) {
        const target = path.join(folder, file);
        // Once more per file, just before it goes: a regular file, not a link put there since.
        if (!isRealFile(target)) continue;
        try {
          remove(target);
        } catch {
          stuck = true;
        }
      }
    } catch {
      stuck = true;
    }
    if (stuck) {
      left.push(name);
      continue;
    }
    try {
      // rmdir, not rm: it removes only an empty folder, so the person's own files (and the folder
      // holding them) can never go with it.
      rmdirSync(folder);
    } catch {
      // Not empty: what is left is the person's, and stays. Nothing of DotAmi's is owed.
    }
    deleted.push(name);
  }
  return { deleted, left };
}

function isSymlink(target) {
  try {
    return lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * The marker, or null when there is none. A marker that can't be read as DotAmi wrote it still
 * means a wipe is owed, but owes no safety copies or folders: names are only ever taken from a marker
 * that reads back cleanly, and even then only names DotAmi gives its copies and set-aside folders. A
 * marker an earlier version wrote has no `receiptFolders` (or [8i] no `keyFiles` / `lockedFiles`), and
 * owes none of those.
 * @param {string} dbFile
 * @returns {{ since: string | null, backups: string[], receiptFolders: string[], keyFiles: string[], lockedFiles: string[] } | null}
 */
export function readWipePending(dbFile) {
  const file = wipePendingFile(dbFile);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const names = (list, pattern) => (Array.isArray(list) ? list.filter((n) => typeof n === "string" && pattern.test(n)) : []);
    return {
      since: typeof parsed?.since === "string" ? parsed.since : null,
      backups: names(parsed?.backups, SAFETY_COPY_NAME),
      receiptFolders: names(parsed?.receiptFolders, SET_ASIDE_FOLDER_NAME),
      keyFiles: names(parsed?.keyFiles, SET_ASIDE_KEY_NAME),
      lockedFiles: names(parsed?.lockedFiles, LOCKED_DATA_FILE_NAME),
    };
  } catch {
    return { since: null, backups: [], receiptFolders: [], keyFiles: [], lockedFiles: [] };
  }
}

/** Each name once, only the ones `pattern` allows, sorted: what the marker may hold. */
const ownNames = (list, pattern) => [...new Set(list)].filter((n) => pattern.test(n)).sort();

/**
 * Writes the marker: a wipe of the data file is owed, and these safety copies, set-aside receipt
 * folders and [8i] set-aside key files and locked data files are to be deleted. It holds no data of the
 * person's: a date and DotAmi's own names.
 * @param {string} dbFile
 * @param {{ backups: readonly string[], receiptFolders?: readonly string[], keyFiles?: readonly string[], lockedFiles?: readonly string[], since?: string }} owed
 */
export function writeWipePending(dbFile, { backups, receiptFolders = [], keyFiles = [], lockedFiles = [], since = new Date().toISOString() }) {
  const body = {
    format: 1,
    since,
    backups: ownNames(backups, SAFETY_COPY_NAME),
    receiptFolders: ownNames(receiptFolders, SET_ASIDE_FOLDER_NAME),
    keyFiles: ownNames(keyFiles, SET_ASIDE_KEY_NAME),
    lockedFiles: ownNames(lockedFiles, LOCKED_DATA_FILE_NAME),
  };
  writeFileSync(wipePendingFile(dbFile), `${JSON.stringify(body, null, 2)}\n`);
}

/** Removes the marker: the wipe is finished. */
export function clearWipePending(dbFile) {
  rmSync(wipePendingFile(dbFile), { force: true });
}

const copies = (n) => `${n} safety cop${n === 1 ? "y" : "ies"}`;
const folders = (n) => `${n} set-aside receipt folder${n === 1 ? "" : "s"}`;
const keyFiles = (n) => `${n} set-aside key file${n === 1 ? "" : "s"}`;
const lockedFiles = (n) => `${n} locked data file${n === 1 ? "" : "s"}`;

/** "a", "a and b", "a, b and c". */
const listed = (parts) => (parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`);

/**
 * Deletes everything the marker (or a Delete) owes in the backups folder: the safety copies, the
 * set-aside receipt folders and [8i] the set-aside key files and locked data files. Returns what is
 * still left of each, by name. Shared by the start-up finish here and by lib/privacy/delete.ts.
 * @param {string} dbFile
 * @param {{ backups: readonly string[], receiptFolders: readonly string[], keyFiles: readonly string[], lockedFiles: readonly string[] }} owed
 * @param {{ remove?: (file: string) => void }} [options]
 * @returns {{ backupsLeft: string[], receiptFoldersLeft: string[], keyFilesLeft: string[], lockedFilesLeft: string[] }}
 */
export function deleteOwedFiles(dbFile, owed, { remove } = {}) {
  return {
    backupsLeft: deleteSafetyCopies(dbFile, owed.backups, { remove }).left,
    receiptFoldersLeft: deleteSetAsideReceiptFolders(dbFile, owed.receiptFolders, { remove }).left,
    keyFilesLeft: deleteSetAsideKeyFiles(dbFile, owed.keyFiles, { remove }).left,
    lockedFilesLeft: deleteLockedDataFiles(dbFile, owed.lockedFiles, { remove }).left,
  };
}

/**
 * Finishes a wipe that Delete left owed, and only then: no marker, nothing happens (not even the
 * vacuum). With one, it deletes the safety copies, clears the set-aside receipt folders and deletes the
 * set-aside key files and locked data files the marker names, rebuilds the data file with `vacuum`, and
 * removes the marker once all of it worked. Anything that fails stays owed, in the marker, for the next
 * try. Never throws: a wipe that can't finish mustn't stop the app from starting.
 * @param {string} dbFile
 * @param {{ vacuum: (dbFile: string) => boolean, log?: (line: string) => void, remove?: (file: string) => void }} options
 *   `vacuum` returns true when the file has no free space left, and may throw.
 * @returns {{ ran: false } | { ran: true, wiped: boolean, backupsLeft: string[], receiptFoldersLeft: string[], keyFilesLeft: string[], lockedFilesLeft: string[] }}
 */
export function finishPendingWipe(dbFile, { vacuum, log = () => {}, remove }) {
  const owed = readWipePending(dbFile);
  if (!owed) return { ran: false };
  const left = deleteOwedFiles(dbFile, owed, { remove });
  let wiped = false;
  try {
    // A data file that is gone has nothing left to wipe.
    wiped = existsSync(dbFile) ? vacuum(dbFile) === true : true;
  } catch (error) {
    log(`[wipe] the data file couldn't be wiped yet (${error?.code ?? error?.name ?? "error"})`);
  }
  const done = wiped && Object.values(left).every((names) => names.length === 0);
  try {
    if (done) clearWipePending(dbFile);
    else {
      writeWipePending(dbFile, {
        backups: left.backupsLeft,
        receiptFolders: left.receiptFoldersLeft,
        keyFiles: left.keyFilesLeft,
        lockedFiles: left.lockedFilesLeft,
        since: owed.since ?? undefined,
      });
    }
  } catch (error) {
    log(`[wipe] couldn't update the wipe-pending note (${error?.code ?? error?.name ?? "error"})`);
  }
  // Each kind past the safety copies is said only when the marker owed some, so an older marker's line
  // reads as before.
  const owedOthers = [
    [owed.receiptFolders.length, folders],
    [owed.keyFiles.length, keyFiles],
    [owed.lockedFiles.length, lockedFiles],
  ];
  const leftOthers = [
    [left.receiptFoldersLeft.length, folders],
    [left.keyFilesLeft.length, keyFiles],
    [left.lockedFilesLeft.length, lockedFiles],
  ];
  const said = (pairs) => pairs.filter(([n]) => n > 0).map(([n, words]) => words(n));
  log(
    done
      ? `[wipe] finished the wipe an earlier Delete left owed (${listed([copies(owed.backups.length), ...said(owedOthers)])} deleted)`
      : `[wipe] still owed: ${wiped ? "" : "the data file's free space; "}${[copies(left.backupsLeft.length), ...said(leftOthers)].join("; ")}`,
  );
  return { ran: true, wiped, ...left };
}
