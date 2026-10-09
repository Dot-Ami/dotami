// The safety copies in the backups folder, and the "wipe pending" marker that Delete leaves
// beside the data file until its wipe is finished ([8d]).
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
// The marker is written before the wipe starts and removed once it has worked, so a wipe that the
// computer cut short (busy, out of disk, switched off) is finished the next time the desktop app
// starts. Without a marker, start-up does nothing here: free space in the file is normal after
// any ordinary edit, and rebuilding the file on every start would slow it for nothing.
import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

/** The names DotAmi gives its own safety copies: `dotami-before-<migration or "restore">-<time>.db`. */
export const SAFETY_COPY_NAME = /^dotami-before-[A-Za-z0-9_-]+\.db$/;

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
  const folder = backupsFolder(dbFile);
  const deleted = [];
  const left = [];
  // Checked once more here, not only when listing: the folder could have been swapped for a link.
  const folderOk = isRealFolder(folder);
  for (const name of new Set(names)) {
    if (!SAFETY_COPY_NAME.test(name)) continue;
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

function isSymlink(target) {
  try {
    return lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * The marker, or null when there is none. A marker that can't be read as DotAmi wrote it still
 * means a wipe is owed, but owes no safety copies: names are only ever taken from a marker that
 * reads back cleanly, and even then only names DotAmi gives its copies.
 * @param {string} dbFile
 * @returns {{ since: string | null, backups: string[] } | null}
 */
export function readWipePending(dbFile) {
  const file = wipePendingFile(dbFile);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const backups = Array.isArray(parsed?.backups)
      ? parsed.backups.filter((n) => typeof n === "string" && SAFETY_COPY_NAME.test(n))
      : [];
    return { since: typeof parsed?.since === "string" ? parsed.since : null, backups };
  } catch {
    return { since: null, backups: [] };
  }
}

/**
 * Writes the marker: a wipe of the data file is owed, and these safety copies are to be deleted.
 * It holds no data of the person's: a date and DotAmi's own file names.
 * @param {string} dbFile
 * @param {{ backups: readonly string[], since?: string }} owed
 */
export function writeWipePending(dbFile, { backups, since = new Date().toISOString() }) {
  const body = { format: 1, since, backups: [...new Set(backups)].filter((n) => SAFETY_COPY_NAME.test(n)).sort() };
  writeFileSync(wipePendingFile(dbFile), `${JSON.stringify(body, null, 2)}\n`);
}

/** Removes the marker: the wipe is finished. */
export function clearWipePending(dbFile) {
  rmSync(wipePendingFile(dbFile), { force: true });
}

/**
 * Finishes a wipe that Delete left owed, and only then: no marker, nothing happens (not even the
 * vacuum). With one, it deletes the safety copies the marker names, rebuilds the data file with
 * `vacuum`, and removes the marker once both worked. Anything that fails stays owed, in the marker,
 * for the next try. Never throws: a wipe that can't finish mustn't stop the app from starting.
 * @param {string} dbFile
 * @param {{ vacuum: (dbFile: string) => boolean, log?: (line: string) => void, remove?: (file: string) => void }} options
 *   `vacuum` returns true when the file has no free space left, and may throw.
 * @returns {{ ran: false } | { ran: true, wiped: boolean, backupsLeft: string[] }}
 */
export function finishPendingWipe(dbFile, { vacuum, log = () => {}, remove }) {
  const owed = readWipePending(dbFile);
  if (!owed) return { ran: false };
  const { left } = deleteSafetyCopies(dbFile, owed.backups, { remove });
  let wiped = false;
  try {
    // A data file that is gone has nothing left to wipe.
    wiped = existsSync(dbFile) ? vacuum(dbFile) === true : true;
  } catch (error) {
    log(`[wipe] the data file couldn't be wiped yet (${error?.code ?? error?.name ?? "error"})`);
  }
  try {
    if (wiped && left.length === 0) clearWipePending(dbFile);
    else writeWipePending(dbFile, { backups: left, since: owed.since ?? undefined });
  } catch (error) {
    log(`[wipe] couldn't update the wipe-pending note (${error?.code ?? error?.name ?? "error"})`);
  }
  log(
    wiped && left.length === 0
      ? `[wipe] finished the wipe an earlier Delete left owed (${owed.backups.length} safety cop${owed.backups.length === 1 ? "y" : "ies"} deleted)`
      : `[wipe] still owed: ${wiped ? "" : "the data file's free space; "}${left.length} safety cop${left.length === 1 ? "y" : "ies"}`,
  );
  return { ran: true, wiped, backupsLeft: left };
}
