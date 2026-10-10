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
// resumeDecryption reads what is on the disk at a start and finishes, redoes or stops (§ 15.3's table).
// The data folder has one note at a time across both directions: decryptFile refuses while either note is
// there, and encryptFile does the same (encrypt-database.mjs).
//
// deleteKeyWhenUnused removes database.key, zero-filled first, only once nothing DotAmi keeps opens with it.
// The log gets the step and counts only, never a name of the person's, a value or the key.
import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { DATABASE_KEY_FILE } from "./database-key.mjs";
import { contentsOf, copyIntoPlainFile, differences } from "./database-copy.mjs";
import { DECRYPTING_NOTE, ENCRYPTING_NOTE, wipeFile } from "./encrypt-database.mjs";
import { CannotOpenDatabase, FileNotReadable, fileKind, openDatabase } from "./sqlite.mjs";

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
  /** @param {"damaged" | "busy" | "stuck" | "mismatch" | "pending"} kind @param {string} message */
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
  const damaged = () =>
    new DecryptionStopped(
      "damaged",
      "The data file didn't open with its key, or didn't pass SQLite's own check, so DotAmi didn't decrypt it. It is still encrypted, and nothing was changed.",
    );
  let db;
  try {
    db = openDatabase(file, { key, readonly: true, fileMustExist: true });
    if (db.pragma("integrity_check", { simple: true }) !== "ok") throw damaged();
    return contentsOf(db);
  } catch (error) {
    if (error instanceof DecryptionStopped) throw error;
    // A wrong key, or a page whose authentication tag no longer matches (SQLite3 Multiple Ciphers reports
    // a changed page as SQLITE_CORRUPT or "not a database").
    if (/^SQLITE_(CORRUPT|NOTADB)/.test(error?.code ?? "") || error instanceof CannotOpenDatabase) throw damaged();
    throw error;
  } finally {
    db?.close();
  }
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
 * @param {{ log?: (line: string) => void, crashAt?: DecryptCrashPoint, rename?: (from: string, to: string) => void }} [options]
 *   `rename` replaces the first rename in the tests (a file another program holds).
 */
export function decryptFile(dataDir, file, key, { log = () => {}, crashAt, rename = renameSync } = {}) {
  // One note per data folder, across both directions: a new note would replace one that is still owed.
  if (readDecryptNote(dataDir) !== null || existsSync(path.join(dataDir, ENCRYPTING_NOTE))) {
    throw new DecryptionStopped(
      "pending",
      "DotAmi is still finishing an earlier change to its files (an encryption or a decryption another program held up), so it didn't start another. Nothing was changed; DotAmi tries again at its next start.",
    );
  }
  clearLeftovers(file, dataDir);
  const expected = checkedEncrypted(file, key);
  const copy = `${file}${DECRYPT_COPY_SUFFIX}`;
  // Opened read-write and without fileMustExist on purpose: an attached file is opened with the main file's
  // flags, and the copy has to be created. Nothing is written to the encrypted file itself.
  const source = openDatabase(file, { key });
  try {
    copyIntoPlainFile(source, copy);
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
    // Nothing has moved: another program holds the file. The next start redoes this step.
    throw new DecryptionStopped(
      "busy",
      `Another program has ${path.basename(file)} open (${error?.code ?? "busy"}), so DotAmi couldn't decrypt it now. It is still encrypted, and nothing was changed; DotAmi tries again at its next start.`,
    );
  }
  if (crashAt === "first-rename") return { crashed: true };
  renameSync(copy, file);
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
 *   { action: "finished", file, wipePending }  the decryption of `file` is finished (or only its wipe is owed)
 *   { action: "restart", file }  the encrypted file changed after its copy was made: the copy was thrown away
 * Throws DecryptionStopped("stuck") when the files are in a state DotAmi didn't leave; nothing is removed.
 * @param {string} dataDir
 * @param {Buffer | null} key  null when the key can't be opened: nothing is changed
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
  // Every step from here either needs the key to check the encrypted file or follows one that did.
  if (!key) return { action: "none" };
  const file = path.join(dataDir, note.file);
  const copy = `${file}${DECRYPT_COPY_SUFFIX}`;
  const old = `${file}${ENCRYPTED_SUFFIX}`;
  const kind = fileKind(file);
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

  if (note.step === "swap") {
    if (kind === "encrypted" && copyMatches()) {
      // Something could have written to the encrypted file since the copy was made: compare again.
      const problems = checkCopy(copy, checkedEncrypted(file, key));
      if (problems.length > 0) {
        clearLeftovers(file, dataDir);
        removeNote(dataDir);
        log("[decrypt] the data file changed after its decrypted copy was made; the copy was thrown away");
        return { action: "restart", file };
      }
      return { action: "finished", file, ...swapAndWipe(dataDir, file, { log }) };
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
  if (note.step === "wipe" && opensPlain() && !existsSync(copy)) {
    return { action: "finished", file, ...finishWipe(dataDir, file, { log }) };
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
  if (!existsSync(keyFile)) return { deleted: false, lockedLeft: 0 };
  wipeFile(keyFile, remove ? { remove } : undefined);
  // A key file a crash left half-written (database-key.mjs writes beside the name first).
  wipeFile(`${keyFile}.partial`);
  return { deleted: true, lockedLeft: 0 };
}

/** The sentence for files DotAmi didn't leave in this state: what is there, and that nothing was removed. */
function stuckMessage(dataDir, names) {
  const there = names.filter((n) => existsSync(path.join(dataDir, n)));
  return `DotAmi found its data files part-way through being decrypted, in a state it didn't leave them in (${there.join(", ")} in ${dataDir}). It didn't change or remove anything. Keep these files as they are and ask for help on GitHub.`;
}
