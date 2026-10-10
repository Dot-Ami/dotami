// [8i] Encrypting a data file that is still plain, once, without ever losing data
// (docs/architecture/database-encryption.md § 6). Used for the data file at the first start where the
// person said "Encrypt now", and for the plain safety copies in backups/.
//
// At every moment either the whole plain file or a whole, checked encrypted file is in place, and a note
// beside the data file (database-encrypting.json) says which step comes next:
//   1. the plain file must pass SQLite's integrity check (opening it lets SQLite finish or undo what an
//      earlier crash left);
//   2. the encrypted copy <file>.encrypting is written by SQLite straight into a keyed file
//      (database-copy.mjs: no plain copy is ever made) and flushed to the disk;
//   3. the copy is checked: it passes the integrity check, holds the same tables, rows and indexes as the
//      plain file, and doesn't open without the key;
//   4. the note says "swap", with the copy's size and SHA-256 (written beside its name, then renamed);
//   5. <file> is renamed <file>.plain-to-wipe, then <file>.encrypting is renamed <file>;
//   6. the note says "wipe";
//   7. the plain file (and a journal beside it) is overwritten with zeros, flushed and deleted; then the
//      note is deleted.
// resumeEncryption reads what is on the disk at a start and finishes, redoes or stops (§ 6's table).
//
// The log gets the step and counts only, never a name of the person's, a value or the key.
import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";

import { contentsOf, copyIntoKeyedFile, differences } from "./database-copy.mjs";
import { CannotOpenDatabase, fileKind, openDatabase } from "./sqlite.mjs";

/** The note's name, beside the data file. lib/privacy/inventory.ts FOLDERS lists it. */
export const ENCRYPTING_NOTE = "database-encrypting.json";
export const COPY_SUFFIX = ".encrypting";
export const PLAIN_SUFFIX = ".plain-to-wipe";
/** SQLite's rollback journal beside a file. */
const JOURNAL = "-journal";

/**
 * Where the tests stop an encryption, as a crash (or the computer switching off) would: after the copy is
 * written, after it is checked, after the note says "swap", after each of the two renames, after the note
 * says "wipe", and after the plain file is deleted but before the note is.
 * @typedef {"copied" | "checked" | "note-swap" | "first-rename" | "second-rename" | "note-wipe" | "plain-deleted"} CrashPoint
 */

/** Thrown when a file can't be encrypted now and nothing was changed; `message` is written for the person. */
export class EncryptionStopped extends Error {
  /** @param {"damaged" | "busy" | "stuck" | "mismatch"} kind @param {string} message */
  constructor(kind, message) {
    super(message);
    this.name = "EncryptionStopped";
    this.kind = kind;
  }
}

/** The note's path for a data folder. */
export function notePath(dataDir) {
  return path.join(dataDir, ENCRYPTING_NOTE);
}

/**
 * The note, or null when there is none; { unreadable: true } when it is there but can't be read as
 * DotAmi wrote it. `file` is the file being encrypted, relative to the data folder.
 * @returns {null | { unreadable: true } | { step: "swap" | "wipe", file: string, size: number, sha256: string }}
 */
export function readNote(dataDir) {
  const file = notePath(dataDir);
  if (!existsSync(file)) return null;
  try {
    const n = JSON.parse(readFileSync(file, "utf8"));
    const okFile = typeof n?.file === "string" && n.file.length > 0 && !path.isAbsolute(n.file) && !n.file.split(/[\\/]/).includes("..");
    if (n?.format === 1 && (n.step === "swap" || n.step === "wipe") && okFile && Number.isInteger(n.size) && /^[0-9a-f]{64}$/.test(n.sha256)) {
      return { step: n.step, file: n.file, size: n.size, sha256: n.sha256 };
    }
  } catch {
    // Falls through: a note that can't be read.
  }
  return { unreadable: true };
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

/**
 * Overwrites a file with zeros, its whole length, flushes it, then deletes it. Nothing when it isn't
 * there. Throws when another program holds it (Windows: EBUSY or EPERM): the caller keeps it owed.
 * On a solid-state disk this makes the bytes unreadable through the file system, not necessarily on the
 * physical disk (§ 1); DotAmi says so in Settings.
 */
export function wipeFile(file) {
  let size;
  try {
    size = statSync(file).size;
  } catch {
    return;
  }
  const fd = openSync(file, "r+");
  try {
    const zeros = Buffer.alloc(64 * 1024);
    for (let at = 0; at < size; ) {
      const n = Math.min(zeros.length, size - at);
      at += writeSync(fd, zeros, 0, n, at);
    }
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  rmSync(file);
}

/** The plain file's contents, after SQLite's integrity check (step 1). A file SQLite finds damaged is refused, unchanged. */
function checkedPlain(file) {
  const damaged = () =>
    new EncryptionStopped("damaged", "The data file didn't pass SQLite's own check, so DotAmi didn't encrypt it. Nothing was changed.");
  let db;
  try {
    db = openDatabase(file, { fileMustExist: true });
    if (db.pragma("integrity_check", { simple: true }) !== "ok") throw damaged();
    return contentsOf(db);
  } catch (error) {
    // SQLite's own words for a damaged file: SQLITE_CORRUPT (and its extended codes) or "not a database".
    if (/^SQLITE_(CORRUPT|NOTADB)/.test(error?.code ?? "") || error instanceof CannotOpenDatabase) throw damaged();
    throw error;
  } finally {
    db?.close();
  }
}

/** What is wrong with the encrypted copy: [] when it is whole, holds what `expected` says, and doesn't open without the key (step 3). */
function checkCopy(copy, key, expected) {
  if (fileKind(copy) !== "encrypted") return ["the copy isn't encrypted"];
  try {
    openDatabase(copy, { readonly: true, fileMustExist: true }).close();
    return ["the copy opens without the key"];
  } catch (error) {
    if (!(error instanceof CannotOpenDatabase)) throw error;
  }
  const db = openDatabase(copy, { key, readonly: true, fileMustExist: true });
  try {
    if (db.pragma("integrity_check", { simple: true }) !== "ok") return ["the copy didn't pass SQLite's own check"];
    return differences(expected, contentsOf(db));
  } finally {
    db.close();
  }
}

/** Zero-fills and deletes what an unfinished encryption of `file` left beside it, and the note's .tmp. */
function clearLeftovers(file, dataDir) {
  for (const f of [`${file}${COPY_SUFFIX}`, `${file}${COPY_SUFFIX}${JOURNAL}`]) wipeFile(f);
  rmSync(`${notePath(dataDir)}.tmp`, { force: true });
}

/**
 * Encrypts one plain file with `key`, steps 1 to 7. `file` is in the data folder `dataDir` (the data file,
 * or a safety copy in backups/). Returns { crashed } when the tests stopped it at `crashAt`, otherwise
 * { wipePending } (true when the plain file is still there because another program holds it: the note
 * stays at "wipe" and the next start tries again). Throws EncryptionStopped when nothing was changed.
 * @param {string} dataDir
 * @param {string} file
 * @param {Buffer} key
 * @param {{ log?: (line: string) => void, crashAt?: CrashPoint, rename?: (from: string, to: string) => void }} [options]
 *   `rename` replaces the first rename in the tests (a file another program holds).
 */
export function encryptFile(dataDir, file, key, { log = () => {}, crashAt, rename = renameSync } = {}) {
  clearLeftovers(file, dataDir);
  const expected = checkedPlain(file);
  const copy = `${file}${COPY_SUFFIX}`;
  // Opened without fileMustExist on purpose: an attached file is opened with the main file's flags, and
  // the copy has to be created (the file itself was just checked, in step 1).
  const source = openDatabase(file);
  try {
    copyIntoKeyedFile(source, copy, key);
  } finally {
    source.close();
  }
  if (crashAt === "copied") return { crashed: true };
  const problems = checkCopy(copy, key, expected);
  if (problems.length > 0) {
    clearLeftovers(file, dataDir);
    throw new EncryptionStopped("mismatch", `The encrypted copy didn't match the data file (${problems.join("; ")}), so it was thrown away. Nothing was changed.`);
  }
  if (crashAt === "checked") return { crashed: true };
  writeNote(dataDir, { step: "swap", file: path.relative(dataDir, file), size: statSync(copy).size, sha256: sha256Of(copy) });
  if (crashAt === "note-swap") return { crashed: true };
  return swapAndWipe(dataDir, file, { log, crashAt, rename });
}

/** Steps 5 to 7, from a note that says "swap" and a checked copy in place. */
function swapAndWipe(dataDir, file, { log, crashAt, rename = renameSync }) {
  const copy = `${file}${COPY_SUFFIX}`;
  const plain = `${file}${PLAIN_SUFFIX}`;
  try {
    rename(file, plain);
  } catch (error) {
    // Nothing has moved: another program holds the file. The next start redoes this step.
    throw new EncryptionStopped(
      "busy",
      `Another program has ${path.basename(file)} open (${error?.code ?? "busy"}), so DotAmi couldn't encrypt it now. Nothing was changed; DotAmi tries again at its next start.`,
    );
  }
  if (crashAt === "first-rename") return { crashed: true };
  renameSync(copy, file);
  if (crashAt === "second-rename") return { crashed: true };
  const note = readNote(dataDir);
  writeNote(dataDir, { step: "wipe", file: path.relative(dataDir, file), size: note?.size ?? 0, sha256: note?.sha256 ?? "0".repeat(64) });
  if (crashAt === "note-wipe") return { crashed: true };
  return finishWipe(dataDir, file, { log, crashAt });
}

/** Step 7: the plain file and its journal zero-filled and deleted, then the note. */
function finishWipe(dataDir, file, { log, crashAt }) {
  const plain = `${file}${PLAIN_SUFFIX}`;
  try {
    wipeFile(plain);
    wipeFile(`${plain}${JOURNAL}`);
  } catch (error) {
    log(`[encrypt] the plain copy couldn't be wiped yet (${error?.code ?? error?.name ?? "error"}); tried again at the next start`);
    return { wipePending: true };
  }
  if (crashAt === "plain-deleted") return { crashed: true };
  removeNote(dataDir);
  return { wipePending: false };
}

/**
 * At a start, before anything opens the files: finishes, redoes or stops an encryption a crash (or a busy
 * file) left part-way, by what is on the disk (§ 6's table). With no note it only clears leftovers of an
 * encryption that never got as far as the note. Returns:
 *   { action: "none" }  nothing was under way (or the key isn't open, and nothing that needs it was done)
 *   { action: "cleared" }  leftovers of an unfinished copy were wiped; the plain file is as it was
 *   { action: "finished", file, wipePending }  the encryption of `file` is finished (or only its wipe is owed)
 *   { action: "restart", file }  the plain file changed after its copy was made: the copy was thrown away
 * Throws EncryptionStopped("stuck") when the files are in a state DotAmi didn't leave; nothing is removed.
 * @param {string} dataDir
 * @param {Buffer | null} key  null when the key can't be opened: nothing is changed
 * @param {{ log?: (line: string) => void }} [options]
 */
export function resumeEncryption(dataDir, key, { log = () => {} } = {}) {
  const note = readNote(dataDir);
  if (note === null || "unreadable" in note) {
    // An unreadable note can't happen with the rename in writeNote, but is handled like no note: steps 1
    // to 4 never touched the plain file, so their leftovers go and the plain file stays. Any file in the
    // data folder or backups/ can have leftovers, so every ".encrypting" there goes.
    const leftovers = leftoverCopies(dataDir);
    const had = leftovers.length > 0 || existsSync(`${notePath(dataDir)}.tmp`) || note !== null;
    for (const f of leftovers) wipeFile(f);
    removeNote(dataDir);
    return { action: had ? "cleared" : "none" };
  }
  // Every step from here either needs the key to check the encrypted file or follows one that did.
  if (!key) return { action: "none" };
  const file = path.join(dataDir, note.file);
  const copy = `${file}${COPY_SUFFIX}`;
  const plain = `${file}${PLAIN_SUFFIX}`;
  const kind = fileKind(file);
  const copyMatches = () => existsSync(copy) && statSync(copy).size === note.size && sha256Of(copy) === note.sha256;
  const fileMatches = () => kind === "encrypted" && statSync(file).size === note.size && sha256Of(file) === note.sha256;
  const opensWithKey = () => {
    if (kind !== "encrypted") return false;
    try {
      openDatabase(file, { key, readonly: true, fileMustExist: true }).close();
      return true;
    } catch {
      return false;
    }
  };

  if (note.step === "swap") {
    if (kind === "plain" && copyMatches()) {
      // Something (a copy run from source) could have written to the plain file since: compare again.
      const problems = checkCopy(copy, key, checkedPlain(file));
      if (problems.length > 0) {
        clearLeftovers(file, dataDir);
        removeNote(dataDir);
        log("[encrypt] the data file changed after its encrypted copy was made; the copy was thrown away");
        return { action: "restart", file };
      }
      return { action: "finished", file, ...swapAndWipe(dataDir, file, { log }) };
    }
    if (kind === "absent" && copyMatches() && existsSync(plain)) {
      renameSync(copy, file);
      writeNote(dataDir, { step: "wipe", file: note.file, size: note.size, sha256: note.sha256 });
      return { action: "finished", file, ...finishWipe(dataDir, file, { log }) };
    }
    if (fileMatches() && !existsSync(copy)) {
      writeNote(dataDir, { step: "wipe", file: note.file, size: note.size, sha256: note.sha256 });
      return { action: "finished", file, ...finishWipe(dataDir, file, { log }) };
    }
  }
  if (note.step === "wipe" && opensWithKey() && !existsSync(copy)) {
    return { action: "finished", file, ...finishWipe(dataDir, file, { log }) };
  }
  throw new EncryptionStopped(
    "stuck",
    stuckMessage(dataDir, [ENCRYPTING_NOTE, note.file, `${note.file}${COPY_SUFFIX}`, `${note.file}${PLAIN_SUFFIX}`]),
  );
}

/** Every "<file>.encrypting" (and its journal) in the data folder and its backups/ folder. */
function leftoverCopies(dataDir) {
  const found = [];
  for (const folder of [dataDir, path.join(dataDir, "backups")]) {
    let names;
    try {
      names = readdirSync(folder);
    } catch {
      continue;
    }
    for (const n of names) if (n.endsWith(COPY_SUFFIX) || n.endsWith(`${COPY_SUFFIX}${JOURNAL}`)) found.push(path.join(folder, n));
  }
  return found;
}

/** The sentence for files DotAmi didn't leave in this state: what is there, and that nothing was removed. */
function stuckMessage(dataDir, names) {
  const there = names.filter((n) => existsSync(path.join(dataDir, n)));
  return `DotAmi found its data files part-way through being encrypted, in a state it didn't leave them in (${there.join(", ")} in ${dataDir}). It didn't change or remove anything. Keep these files as they are and ask for help on GitHub.`;
}
