// [8i] Decrypting the data file and its safety copies after the person turned locking off in Settings,
// without ever losing data (docs/architecture/database-encryption.md § 15.3). The reverse of
// desktop/encrypt-database.mjs, step for step:
//   1. the encrypted file must open with its key and pass SQLite's integrity check;
//   2. the plain copy <file>.decrypting is written by SQLite straight from the keyed connection into a file
//      attached with an empty key (database-copy.mjs copyIntoPlainFile), then flushed to the disk;
//   3. the copy is checked: plain, opens without a key, passes the integrity check, and holds the same
//      tables, rows and indexes as the encrypted file;
//   4. the note (database-decrypting.json) says "swap", with the copy's size and SHA-256 (written beside its
//      name, then renamed);
//   5. <file> is renamed <file>.encrypted-to-wipe, then <file>.decrypting is renamed <file>;
//   6. the note says "wipe";
//   7. the encrypted original (and a journal beside it) is overwritten with zeros, flushed and deleted;
//      then the note is deleted.
// A first rename another program refuses moves nothing; the plain copy and the note are wiped at once, so
// no plain copy waits beside the encrypted file for the session, and the next start begins again. A second
// rename refused puts the first one back, and is then the same. Anything else that fails in steps 1 to 4 (a
// full disk) changes nothing either: the same clean-up, and DecryptionStopped("failed") says why.
// A rollback journal beside the encrypted file (a write the server didn't finish) is rolled back with the key
// before step 1's read-only check, which can't do it itself (sqlite.mjs rollBackJournal).
// resumeDecryption reads what is on the disk at a start and finishes, redoes or stops (§ 15.3's table).
// The data folder has one note at a time across both directions: decryptFile refuses while either note is
// there, and encryptFile does the same (encrypt-database.mjs).
//
// deleteKeyWhenUnused removes database.key, zero-filled first, only once nothing DotAmi keeps opens with it.
// finishTurningOff does the rest of a turn-off at later starts (safety copies, then the key), and only while
// the turn-off note (database-turned-off.json, § 15.2) names the key: it is never guessed from the files.
// The log gets the step and counts only, never a name of the person's, a value or the key.
import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { DATABASE_KEY_FILE } from "./database-key.mjs";
import { contentsOf, copyIntoPlainFile, differences } from "./database-copy.mjs";
import { DECRYPTING_NOTE, ENCRYPTING_NOTE, wipeFile } from "./encrypt-database.mjs";
import { keyIdOf } from "./receipt-crypto.mjs";
import { CannotOpenDatabase, FileNotReadable, fileKind, openDatabase, rollBackJournal } from "./sqlite.mjs";
import { backupsFolder, readWipePending } from "./wipe-pending.mjs";

export { DECRYPTING_NOTE };
/** The plain copy being written beside the file. lib/privacy/inventory.ts FOLDERS lists it. */
export const DECRYPT_COPY_SUFFIX = ".decrypting";
/** The encrypted original, swapped out and waiting to be wiped. lib/privacy/inventory.ts FOLDERS lists it. */
export const ENCRYPTED_SUFFIX = ".encrypted-to-wipe";
/** SQLite's rollback journal beside a file. */
const JOURNAL = "-journal";

/**
 * Where the tests stop a decryption, as a crash would: after the copy is written, after it is checked,
 * after the note says "swap", after each of the two renames, after the note says "wipe", and after the
 * encrypted original is deleted but before the note is.
 * @typedef {"copied" | "checked" | "note-swap" | "first-rename" | "second-rename" | "note-wipe" | "old-deleted"} DecryptCrashPoint
 */

/** Thrown when a file can't be decrypted now and nothing was changed; `message` is written for the person. */
export class DecryptionStopped extends Error {
  /**
   * "failed": anything else went wrong before the swap (a full disk, an input/output error); nothing was
   * changed, and a later start can try again.
   * @param {"damaged" | "busy" | "stuck" | "mismatch" | "pending" | "failed"} kind @param {string} message
   */
  constructor(kind, message) {
    super(message);
    this.name = "DecryptionStopped";
    this.kind = kind;
  }
}

function notePath(dataDir) {
  return path.join(dataDir, DECRYPTING_NOTE);
}

/**
 * The decryption's note, or null when there is none; { unreadable: true } when it is there but can't be
 * read as DotAmi wrote it. `file` is the file being decrypted, relative to the data folder.
 * @returns {null | { unreadable: true } | { step: "swap" | "wipe", file: string, size: number, sha256: string }}
 */
export function readDecryptNote(dataDir) {
  const file = notePath(dataDir);
  if (!existsSync(file)) return null;
  try {
    const n = JSON.parse(readFileSync(file, "utf8"));
    // A relative name inside the data folder, never one that climbs out of it.
    const okFile = typeof n?.file === "string" && n.file.length > 0 && !path.isAbsolute(n.file) && !n.file.split(/[\\/]/).includes("..");
    if (n?.format === 1 && (n.step === "swap" || n.step === "wipe") && okFile && Number.isInteger(n.size) && /^[0-9a-f]{64}$/.test(n.sha256)) {
      return { step: n.step, file: n.file, size: n.size, sha256: n.sha256 };
    }
  } catch {
    // Falls through: a note that can't be read.
  }
  return { unreadable: true };
}

/**
 * Whether a decryption left part-way still needs the data file's key (§ 15.3, "Which of these need the
 * key"): its note says "swap" (resumeDecryption may have to check the encrypted file again), or the file it
 * names is still encrypted (or can't be read now, so DotAmi can't tell). A note at "wipe" beside a plain file
 * (or beside a safety copy the person deleted) needs none: step 7 wipes without reading. desktop/main.mjs
 * counts a decryption note as "something is locked" only when this says so, so a plain, readable data file
 * is never shown as locked because a wipe is still owed. A note that can't be read needs none either.
 * @param {string} dataDir
 */
export function decryptionNeedsKey(dataDir) {
  const note = readDecryptNote(dataDir);
  if (note === null || "unreadable" in note) return false;
  if (note.step === "swap") return true;
  try {
    return fileKind(path.join(dataDir, note.file)) === "encrypted";
  } catch {
    return true;
  }
}

/** Writes the note so it is never half there: beside its name, flushed, then renamed into place. */
function writeNote(dataDir, note) {
  const file = notePath(dataDir);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ format: 1, ...note }, null, 2)}\n`);
  flush(tmp);
  renameSync(tmp, file);
}

function removeNote(dataDir) {
  rmSync(notePath(dataDir), { force: true });
  rmSync(`${notePath(dataDir)}.tmp`, { force: true });
}

function flush(file) {
  const fd = openSync(file, "r+");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function sha256Of(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** The encrypted file's contents, after it opened with `key` and passed SQLite's integrity check (step 1). */
function checkedEncrypted(file, key) {
  // Two sentences, because they mean different things to the person: a file that opened with its key but
  // has a bad page isn't a key problem, and saying so would send them looking for the wrong fix.
  const noKey = () =>
    new DecryptionStopped("damaged", "The data file didn't open with its key, so DotAmi didn't decrypt it. It is still encrypted, and nothing was changed.");
  const failedCheck = () =>
    new DecryptionStopped(
      "damaged",
      "The data file didn't pass SQLite's own check (part of it may be damaged), so DotAmi didn't decrypt it. It is still encrypted, and nothing was changed.",
    );
  let db;
  try {
    // A write the server didn't finish is rolled back first: the read-only open below can't, and would fail
    // with SQLITE_READONLY_ROLLBACK at every start. A wrong key touches no committed data (CannotOpenDatabase).
    rollBackJournal(file, key);
    db = openDatabase(file, { key, readonly: true, fileMustExist: true });
  } catch (error) {
    if (error instanceof CannotOpenDatabase || /^SQLITE_(CORRUPT|NOTADB)/.test(error?.code ?? "")) throw noKey();
    // Any other SQLite error (busy, an input/output error) is "not this time", never a guess at the file.
    if (/^SQLITE_/.test(error?.code ?? "")) throw couldNotDecrypt(file, error);
    throw error;
  }
  try {
    if (db.pragma("integrity_check", { simple: true }) !== "ok") throw failedCheck();
    return contentsOf(db);
  } catch (error) {
    if (error instanceof DecryptionStopped) throw error;
    // Opened with the key, then a page whose authentication tag no longer matches (SQLite3 Multiple Ciphers
    // reports a changed page as SQLITE_CORRUPT or "not a database").
    if (/^SQLITE_(CORRUPT|NOTADB)/.test(error?.code ?? "")) throw failedCheck();
    if (/^SQLITE_/.test(error?.code ?? "")) throw couldNotDecrypt(file, error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * The DecryptionStopped("failed") for anything that went wrong before the swap other than a damaged file, a
 * busy file or a copy that didn't match. A full disk is the likely one (the plain copy is as big as the data
 * file), so it is said in words the person can act on.
 */
function couldNotDecrypt(file, error) {
  const code = String(error?.code ?? error?.name ?? "error");
  const name = path.basename(file);
  if (/^SQLITE_FULL/.test(code) || code === "ENOSPC") {
    return new DecryptionStopped(
      "failed",
      `There isn't enough free space on the disk for a decrypted copy of ${name}, so DotAmi didn't decrypt it. It is still encrypted, and nothing was changed. Free up some space; DotAmi tries again at its next start.`,
    );
  }
  return new DecryptionStopped("failed", `DotAmi couldn't decrypt ${name} this time (${code}). It is still encrypted, and nothing was changed; DotAmi tries again at its next start.`);
}

/** What is wrong with the plain copy: [] when it is plain, opens without a key, is whole and holds what `expected` says (step 3). */
function checkCopy(copy, expected) {
  if (fileKind(copy) !== "plain") return ["the copy isn't a plain SQLite file"];
  let db;
  try {
    db = openDatabase(copy, { readonly: true, fileMustExist: true });
    if (db.pragma("integrity_check", { simple: true }) !== "ok") return ["the copy didn't pass SQLite's own check"];
    return differences(expected, contentsOf(db));
  } catch (error) {
    if (error instanceof CannotOpenDatabase) return ["the copy doesn't open without a key"];
    throw error;
  } finally {
    db?.close();
  }
}

/** Zero-fills and deletes what an unfinished decryption of `file` left beside it (a plain copy), and the note's .tmp. */
function clearLeftovers(file, dataDir) {
  for (const f of [`${file}${DECRYPT_COPY_SUFFIX}`, `${file}${DECRYPT_COPY_SUFFIX}${JOURNAL}`]) wipeFile(f);
  rmSync(`${notePath(dataDir)}.tmp`, { force: true });
}

/**
 * Decrypts one encrypted file with `key`, steps 1 to 7. `file` is in the data folder `dataDir` (the data
 * file, or a safety copy in backups/). Returns { crashed } when the tests stopped it at `crashAt`, otherwise
 * { wipePending } (true when the encrypted original is still there because another program holds it: the
 * note stays at "wipe" and the next start tries again). Throws DecryptionStopped when nothing was changed.
 * @param {string} dataDir
 * @param {string} file
 * @param {Buffer} key
 * @param {{ log?: (line: string) => void, crashAt?: DecryptCrashPoint, rename?: (from: string, to: string) => void, copyInto?: typeof copyIntoPlainFile }} [options]
 *   `rename` replaces the two renames of step 5 in the tests (a file another program holds); `copyInto`
 *   replaces step 2's copy (a disk that fills up part-way).
 */
export function decryptFile(dataDir, file, key, { log = () => {}, crashAt, rename = renameSync, copyInto = copyIntoPlainFile } = {}) {
  // One note per data folder, across both directions: a new note would replace one that is still owed.
  if (readDecryptNote(dataDir) !== null || existsSync(path.join(dataDir, ENCRYPTING_NOTE))) {
    throw new DecryptionStopped(
      "pending",
      "DotAmi is still finishing an earlier change to its files (an encryption or a decryption another program held up), so it didn't start another. Nothing was changed; DotAmi tries again at its next start.",
    );
  }
  clearLeftovers(file, dataDir);
  const copy = `${file}${DECRYPT_COPY_SUFFIX}`;
  try {
    const expected = checkedEncrypted(file, key);
    // Opened read-write and without fileMustExist on purpose: an attached file is opened with the main file's
    // flags, and the copy has to be created. Nothing is written to the encrypted file itself.
    const source = openDatabase(file, { key });
    try {
      copyInto(source, copy);
    } finally {
      source.close();
    }
    if (crashAt === "copied") return { crashed: true };
    const problems = checkCopy(copy, expected);
    if (problems.length > 0) {
      clearLeftovers(file, dataDir);
      throw new DecryptionStopped("mismatch", `The decrypted copy didn't match the data file (${problems.join("; ")}), so it was thrown away. The file is still encrypted, and nothing was changed.`);
    }
    if (crashAt === "checked") return { crashed: true };
    writeNote(dataDir, { step: "swap", file: path.relative(dataDir, file), size: statSync(copy).size, sha256: sha256Of(copy) });
  } catch (error) {
    if (error instanceof DecryptionStopped) throw error;
    // Steps 1 to 4 never touch the encrypted file, so whatever failed here (a full disk while the copy was
    // written, an input/output error) changed nothing the person relies on. What was made so far goes now:
    // the plain copy, then a note that may already name it. Only if that clean-up fails too does the error
    // reach the start as it is (the next start's resumeDecryption clears what is left).
    try {
      clearLeftovers(file, dataDir);
      removeNote(dataDir);
    } catch {
      throw error;
    }
    throw couldNotDecrypt(file, error);
  }
  if (crashAt === "note-swap") return { crashed: true };
  return swapAndWipe(dataDir, file, { log, crashAt, rename });
}

/** Steps 5 to 7, from a note that says "swap" and a checked copy in place. */
function swapAndWipe(dataDir, file, { log, crashAt, rename = renameSync }) {
  const copy = `${file}${DECRYPT_COPY_SUFFIX}`;
  const old = `${file}${ENCRYPTED_SUFFIX}`;
  try {
    rename(file, old);
  } catch (error) {
    // Nothing has moved: another program holds the file, which is still whole and encrypted. The plain copy
    // goes now rather than at the next start: left in place it would sit beside the encrypted file for the
    // whole session, holding whatever Delete removes meanwhile (and a safety copy deleted from the Delete
    // menu would leave it behind for good). The copy first, then the note: if the copy can't be wiped, the
    // note still names it and the next start deals with it. The setting still says off, so the next start
    // decrypts again from step 1.
    clearLeftovers(file, dataDir);
    removeNote(dataDir);
    throw new DecryptionStopped(
      "busy",
      `Another program has ${path.basename(file)} open (${error?.code ?? "busy"}), so DotAmi couldn't decrypt it now. It is still encrypted, and nothing was changed; DotAmi tries again at its next start.`,
    );
  }
  if (crashAt === "first-rename") return { crashed: true };
  try {
    rename(copy, file);
  } catch (error) {
    // Another program (an antivirus scanning the new copy) refused the plain copy's rename into place. The
    // encrypted original goes back to its own name, so the folder is never left without its data file, and
    // then it is the same as a refused first rename. If even that rename is refused, the error goes on as it
    // is: the note says "swap", and the next start finishes the swap (§ 15.3, "between the two renames").
    rename(old, file);
    clearLeftovers(file, dataDir);
    removeNote(dataDir);
    throw new DecryptionStopped(
      "busy",
      `Another program has ${path.basename(file)} open (${error?.code ?? "busy"}), so DotAmi couldn't decrypt it now. It is still encrypted, and nothing was changed; DotAmi tries again at its next start.`,
    );
  }
  if (crashAt === "second-rename") return { crashed: true };
  const note = readDecryptNote(dataDir);
  writeNote(dataDir, { step: "wipe", file: path.relative(dataDir, file), size: note?.size ?? 0, sha256: note?.sha256 ?? "0".repeat(64) });
  if (crashAt === "note-wipe") return { crashed: true };
  return finishWipe(dataDir, file, { log, crashAt });
}

/** Step 7: the encrypted original and its journal zero-filled and deleted, then the note. */
function finishWipe(dataDir, file, { log, crashAt }) {
  const old = `${file}${ENCRYPTED_SUFFIX}`;
  try {
    wipeFile(old);
    wipeFile(`${old}${JOURNAL}`);
  } catch (error) {
    log(`[decrypt] the encrypted original couldn't be wiped yet (${error?.code ?? error?.name ?? "error"}); tried again at the next start`);
    return { wipePending: true };
  }
  if (crashAt === "old-deleted") return { crashed: true };
  removeNote(dataDir);
  return { wipePending: false };
}

/**
 * At a start, before anything opens the files: finishes, redoes or stops a decryption a crash (or a busy
 * file) left part-way, by what is on the disk (§ 15.3's table). Returns:
 *   { action: "none" }  nothing was under way (or the key isn't open, and nothing that needs it was done)
 *   { action: "cleared" }  a plain copy an unfinished decryption left was wiped; the encrypted file is as it was
 *       (with `file` and `wipePending`: a deleted safety copy's encrypted original was wiped, or is still owed)
 *   { action: "finished", file, wipePending }  the decryption of `file` is finished (or only its wipe is owed)
 *   { action: "restart", file }  the encrypted file changed after its copy was made: the copy was thrown away
 * Throws DecryptionStopped("stuck") when the files are in a state DotAmi didn't leave; nothing is removed.
 * @param {string} dataDir
 * @param {Buffer | null} key  null when the key can't be opened: only what needs no key is done (step 7)
 * @param {{ log?: (line: string) => void }} [options]
 */
export function resumeDecryption(dataDir, key, { log = () => {} } = {}) {
  const note = readDecryptNote(dataDir);
  if (note === null || "unreadable" in note) {
    // Steps 1 to 4 never touched the encrypted file, so a plain copy left beside it goes and the encrypted
    // file stays. A copy whose own file is missing is never wiped: then the swap had begun, and without a
    // note to say so this isn't a state DotAmi leaves (an unreadable note can't happen with writeNote's rename).
    const leftovers = filesEndingIn(dataDir, [DECRYPT_COPY_SUFFIX, `${DECRYPT_COPY_SUFFIX}${JOURNAL}`]);
    const orphaned = leftovers.filter((f) => f.endsWith(DECRYPT_COPY_SUFFIX) && !existsSync(f.slice(0, -DECRYPT_COPY_SUFFIX.length)));
    if (orphaned.length > 0) {
      throw new DecryptionStopped("stuck", stuckMessage(dataDir, [DECRYPTING_NOTE, ...orphaned.map((f) => path.relative(dataDir, f))]));
    }
    const had = leftovers.length > 0 || existsSync(`${notePath(dataDir)}.tmp`) || note !== null;
    for (const f of leftovers) wipeFile(f);
    removeNote(dataDir);
    return { action: had ? "cleared" : "none" };
  }
  const file = path.join(dataDir, note.file);
  const copy = `${file}${DECRYPT_COPY_SUFFIX}`;
  const old = `${file}${ENCRYPTED_SUFFIX}`;
  let kind;
  try {
    kind = fileKind(file);
  } catch (error) {
    // Another program holds the file the note names: nothing can be decided now. Without the key nothing was
    // going to be done anyway (as before step 7 was finished without one); with it, the start says so.
    if (error instanceof FileNotReadable && !key) return { action: "none" };
    throw error;
  }
  const copyMatches = () => existsSync(copy) && statSync(copy).size === note.size && sha256Of(copy) === note.sha256;
  const fileMatches = () => kind === "plain" && statSync(file).size === note.size && sha256Of(file) === note.sha256;
  const opensPlain = () => {
    if (kind !== "plain") return false;
    try {
      openDatabase(file, { readonly: true, fileMustExist: true }).close();
      return true;
    } catch {
      return false;
    }
  };

  // Step 7 only wipes files, without reading them, so a note at "wipe" is finished whether or not the key
  // opens (decryptionNeedsKey says the same to the start: then a key that can't be opened stops nothing).
  if (note.step === "wipe" && !existsSync(copy)) {
    if (opensPlain()) return { action: "finished", file, ...finishWipe(dataDir, file, { log }) };
    // The safety copy was deleted from the Delete menu while its encrypted original's wipe was owed (another
    // program held it, and DotAmi ran on): the person asked for that copy to be gone, so its encrypted
    // original goes too. Only in backups/: a missing data file is never taken for a deleted one.
    if (kind === "absent" && path.dirname(note.file) === "backups") {
      const wiped = finishWipe(dataDir, file, { log });
      if (!wiped.wipePending) log("[decrypt] a safety copy was deleted while its encrypted original's wipe was owed; that original was wiped too");
      return { action: "cleared", file, ...wiped };
    }
  }
  // Every step from here either needs the key to check the encrypted file or follows one that did.
  if (!key) return { action: "none" };

  if (note.step === "swap") {
    // An encrypted F beside its own .encrypted-to-wipe isn't a state DotAmi leaves: the first rename happened,
    // and something (an older DotAmi, which ignores this note) made a new F since. The plain copy may be the
    // only readable copy of the person's data, so nothing is wiped: it stops below.
    if (kind === "encrypted" && copyMatches() && !existsSync(old)) {
      // Something could have written to the encrypted file since the copy was made, or a page of it gone bad:
      // check and compare again. Either way the encrypted file is whole as it is, so the copy just goes.
      let problems;
      try {
        problems = checkCopy(copy, checkedEncrypted(file, key));
      } catch (error) {
        if (!(error instanceof DecryptionStopped)) throw error;
        problems = [error.message];
      }
      if (problems.length > 0) {
        clearLeftovers(file, dataDir);
        removeNote(dataDir);
        log("[decrypt] the data file changed or failed its check after its decrypted copy was made; the copy was thrown away");
        return { action: "restart", file };
      }
      return { action: "finished", file, ...swapAndWipe(dataDir, file, { log }) };
    }
    // A safety copy deleted from the Delete menu (lib/privacy/delete.ts, desktop/wipe-pending.mjs) after a
    // crash left its plain copy, and before this start: the person asked for it to be gone, so its plain
    // copy goes too. Only in backups/, and only with no .encrypted-to-wipe (the swap never began): a missing
    // data file is never taken for a deleted one.
    if (kind === "absent" && copyMatches() && !existsSync(old) && path.dirname(note.file) === "backups") {
      clearLeftovers(file, dataDir);
      removeNote(dataDir);
      log("[decrypt] a safety copy was deleted part-way through its decryption; its decrypted copy was wiped");
      return { action: "cleared" };
    }
    if (kind === "absent" && copyMatches() && existsSync(old)) {
      renameSync(copy, file);
      writeNote(dataDir, { step: "wipe", file: note.file, size: note.size, sha256: note.sha256 });
      return { action: "finished", file, ...finishWipe(dataDir, file, { log }) };
    }
    if (fileMatches() && !existsSync(copy)) {
      writeNote(dataDir, { step: "wipe", file: note.file, size: note.size, sha256: note.sha256 });
      return { action: "finished", file, ...finishWipe(dataDir, file, { log }) };
    }
  }
  throw new DecryptionStopped("stuck", stuckMessage(dataDir, [DECRYPTING_NOTE, note.file, `${note.file}${DECRYPT_COPY_SUFFIX}`, `${note.file}${ENCRYPTED_SUFFIX}`]));
}

/** Files in the data folder and its backups/ folder whose names end in one of `endings`. */
function filesEndingIn(dataDir, endings) {
  const found = [];
  for (const folder of [dataDir, path.join(dataDir, "backups")]) {
    let names;
    try {
      names = readdirSync(folder, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of names) if (e.isFile() && endings.some((x) => e.name.endsWith(x))) found.push(path.join(folder, e.name));
  }
  return found;
}

/** A database file DotAmi keeps: a name ending ".db", or ".db" followed by one of its own suffixes; never a journal. */
const DATABASE_NAME = /\.db($|\.)/;

/**
 * Every database file in the data folder and its backups/ folder that opens with `key`, relative to the
 * data folder, sorted: what keeps the key alive. A file another program holds right now counts (it may be
 * locked with the key; DotAmi can't tell, so it keeps the key). A file locked with another key doesn't.
 * @param {string} dataDir
 * @param {Buffer} key
 */
export function filesLockedWith(dataDir, key) {
  const locked = [];
  for (const folder of [dataDir, path.join(dataDir, "backups")]) {
    let entries;
    try {
      entries = readdirSync(folder, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isFile() || !DATABASE_NAME.test(e.name) || e.name.endsWith(JOURNAL)) continue;
      const file = path.join(folder, e.name);
      try {
        if (fileKind(file) !== "encrypted") continue;
        openDatabase(file, { key, readonly: true, fileMustExist: true }).close();
      } catch (error) {
        // Doesn't open with this key (another key, or not a database at all): it doesn't keep the key.
        if (error instanceof CannotOpenDatabase || /^SQLITE_(CORRUPT|NOTADB)/.test(error?.code ?? "")) continue;
        // Anything else (FileNotReadable: another program holds it; SQLITE_BUSY…) means DotAmi can't tell,
        // so it counts, and the key is kept until a start that can.
        if (!(error instanceof FileNotReadable) && !error?.code) throw error;
      }
      locked.push(path.relative(dataDir, file));
    }
  }
  return locked.sort();
}

/**
 * Deletes database.key (overwritten with zeros first, as the files are) once nothing DotAmi keeps opens with
 * `key` any more and no note is there (a file part-way through a change may still need it). Otherwise it
 * stays, and the next start tries again. Returns { deleted, lockedLeft } (lockedLeft: how many files still
 * open with it). Throws when the key file can't be wiped (another program holds it).
 * @param {string} dataDir
 * @param {Buffer} key
 * @param {{ remove?: (file: string) => void }} [options]  `remove` stands in for the delete in the tests.
 */
export function deleteKeyWhenUnused(dataDir, key, { remove } = {}) {
  const lockedLeft = filesLockedWith(dataDir, key).length;
  const noted = existsSync(path.join(dataDir, ENCRYPTING_NOTE)) || existsSync(notePath(dataDir));
  if (lockedLeft > 0 || noted) return { deleted: false, lockedLeft };
  const keyFile = path.join(dataDir, DATABASE_KEY_FILE);
  if (!existsSync(keyFile)) {
    // Nothing left to delete, so the turn-off is finished.
    clearTurnedOff(dataDir);
    return { deleted: false, lockedLeft: 0 };
  }
  wipeFile(keyFile, remove ? { remove } : undefined);
  // A key file a crash left half-written (database-key.mjs writes beside the name first).
  wipeFile(`${keyFile}.partial`);
  // The turn-off note goes with the key it names: there is nothing left for it to finish.
  clearTurnedOff(dataDir);
  return { deleted: true, lockedLeft: 0 };
}

/**
 * [8i] The turn-off note (database-encryption.md § 15.2): written by the desktop app just before it decrypts
 * the data file because the person turned locking off, naming the key by its id only (keyIdOf: the same 16
 * hex characters database.key shows). What a turn-off leaves for later starts (a safety copy another
 * program held, a key that couldn't be deleted yet) is finished only while this note names the key that
 * opens. It is never guessed from "a plain data file, the setting off, and a key that opens": a data file
 * moved out of the folder leaves exactly that behind once Never is chosen for the new one, and its key and
 * encrypted safety copies must then stay. lib/privacy/inventory.ts FOLDERS lists it.
 */
export const TURNED_OFF_NOTE = "database-turned-off.json";

function turnedOffPath(dataDir) {
  return path.join(dataDir, TURNED_OFF_NOTE);
}

/** Writes the turn-off note for `key` (beside its name, flushed, then renamed, like the other notes). */
export function markTurnedOff(dataDir, key) {
  const file = turnedOffPath(dataDir);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ format: 1, keyId: keyIdOf(key) }, null, 2)}\n`);
  flush(tmp);
  renameSync(tmp, file);
}

/** Whether the turn-off note is there and names `key`. A note that can't be read names no key. */
export function turnedOffWith(dataDir, key) {
  try {
    const note = JSON.parse(readFileSync(turnedOffPath(dataDir), "utf8"));
    return note?.format === 1 && note.keyId === keyIdOf(key);
  } catch {
    return false;
  }
}

/** Removes the turn-off note (and a .tmp a crash left): the turn-off was finished or cancelled. */
export function clearTurnedOff(dataDir) {
  rmSync(turnedOffPath(dataDir), { force: true });
  rmSync(`${turnedOffPath(dataDir)}.tmp`, { force: true });
}

/**
 * [8i] The rest of a turn-off, after the data file was decrypted (at the same start, or a later one): each of
 * `files` (the safety copies DotAmi names itself, from desktop/main.mjs) still encrypted with `key` is
 * decrypted, one at a time; then the key file is deleted once nothing opens with it (deleteKeyWhenUnused).
 * Does nothing at all, { ran: false }, unless the turn-off note names `key`.
 *
 * A safety copy an earlier Delete still owes (its "wipe pending" note names it, because another program
 * held it) is skipped: it is about to be deleted (desktop/wipe-pending.mjs finishPendingWipe, later in the
 * same start), and decrypting it first would write the deleted data out in plain text. It keeps the key
 * until it is gone; the next start deletes the key.
 *
 * Never throws for a file it can't decrypt yet (counted in notYet, tried at the next start). Throws only if
 * the key file can't be wiped (another program holds it); the note stays, so the next start tries again.
 * @param {string} dataDir
 * @param {string} dbFile  the data file, for the Delete's "wipe pending" note beside it
 * @param {Buffer} key
 * @param {{ files: readonly string[], log?: (line: string) => void }} options
 */
export function finishTurningOff(dataDir, dbFile, key, { files, log = () => {} }) {
  if (!turnedOffWith(dataDir, key)) return { ran: false };
  const owed = new Set((readWipePending(dbFile)?.backups ?? []).map((name) => path.join(backupsFolder(dbFile), name)));
  let decrypted = 0;
  let notYet = 0;
  let skipped = 0;
  for (const file of files) {
    try {
      if (fileKind(file) !== "encrypted") continue;
      if (owed.has(file)) {
        skipped += 1;
        continue;
      }
      // Only a copy this key opens: one locked with another key (set aside after a lost key) is left alone.
      openDatabase(file, { key, readonly: true, fileMustExist: true }).close();
    } catch (error) {
      if (error instanceof CannotOpenDatabase) continue;
      notYet += 1;
      log(`[decrypt] a safety copy couldn't be checked yet (${error?.code ?? error?.name ?? "error"})`);
      continue;
    }
    try {
      decryptFile(dataDir, file, key, { log });
      decrypted += 1;
    } catch (error) {
      notYet += 1;
      log(`[decrypt] a safety copy couldn't be decrypted yet (${error instanceof DecryptionStopped ? error.kind : (error?.code ?? error?.name ?? "error")})`);
    }
  }
  const { deleted, lockedLeft } = deleteKeyWhenUnused(dataDir, key);
  return { ran: true, decrypted, notYet, skipped, keyDeleted: deleted, lockedLeft };
}

/** The sentence for files DotAmi didn't leave in this state: what is there, and that nothing was removed. */
function stuckMessage(dataDir, names) {
  const there = names.filter((n) => existsSync(path.join(dataDir, n)));
  return `DotAmi found its data files part-way through being decrypted, in a state it didn't leave them in (${there.join(", ")} in ${dataDir}). It didn't change or remove anything. Keep these files as they are and ask for help on GitHub.`;
}
