// Backups of the desktop app's data: the database file (dotami.db) and, since format 2, the receipt
// files beside it ([8i], receipts/). Write one to a single `.dotami-backup` file (optionally locked
// with a passphrase), check one, and restore one.
//
// Format 2 (written since receipts are kept; docs/architecture/desktop-app.md § Backups):
//   14 bytes   the text "DOTAMI-BACKUP\n"
//    4 bytes   header length L, unsigned 32-bit big-endian
//    L bytes   the header: UTF-8 JSON (format 2, appVersion, createdAt, migrations, encryption, and
//              `files`: one { path, bytes, sha256 } per file, "dotami.db" first, then
//              "receipts/<DotAmi's own name>")
//   payload    every file's bytes, one after another in the header's order, or their AES-256-GCM
//              ciphertext as one stream
//   16 bytes   the GCM tag (locked backups only)
//
// The data file is read and written in pieces of CHUNK bytes, never whole, and receipts one at a
// time (each at most 10 MB, held whole while it is decrypted or encrypted: see [8i] below), so a
// backup of a big data file and a few hundred receipts needs no more memory than a small one. The header lists each
// file's size and SHA-256, so the writer reads each file twice: once to measure it, once to write
// it (and a file that changed in between stops the backup rather than writing a wrong one).
//
// Locked backups use a key derived from the passphrase with scrypt. The header is covered too: its
// exact bytes are GCM's "additional authenticated data", and the tag sits after the payload because
// it is known only at the end. A changed appVersion, salt, file list or any byte makes the tag check
// fail.
//
// Format 1 (every backup before format 2): the same 18 bytes, then a header with payloadSha256 and
// payloadBytes and the tag inside it, then the database alone. Still read and restored, the old way
// (whole, in memory), so a backup made by an older DotAmi always restores. It holds no receipts.
//
// Restoring is two steps so a bad backup can never touch the live data: prepareRestore() checks the
// file and unpacks it next to the live database (the receipts into a staging folder beside it);
// applyRestore() swaps both in once the app has closed its own connection to the database.
//
// Receipts encrypted at rest (docs/architecture/expense-records.md § 9, desktop/receipt-crypto.mjs):
// a backup always holds each receipt's own bytes, decrypted with this computer's key as it is written,
// so it restores on another computer, whose key differs; a passphrase still covers them, and without
// one they are readable by whoever has the file. A restore encrypts each receipt with this computer's
// key as it is unpacked, after its SHA-256 is checked. The format doesn't change: a backup made before
// receipts were encrypted reads the same. A receipt is at most 10 MB, so one is decrypted or encrypted
// whole, one at a time; the database is still streamed in pieces.
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import {
  closeSync,
  existsSync,
  fstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { decryptReceipt, ENCRYPTED_OVERHEAD, encryptReceipt, isEncryptedReceipt, receiptIdOfName } from "./receipt-crypto.mjs";

/** The file extension (without the dot) the app gives its backups. */
export const BACKUP_EXTENSION = "dotami-backup";

/** The receipts folder beside the database: the same name as RECEIPTS_FOLDER in lib/expenses/receipts/store.ts. */
export const RECEIPTS_FOLDER = "receipts";

/**
 * A receipt type's file extension, as lib/expenses/receipts/types.ts RECEIPT_TYPES names them (the
 * desktop code can't import the app's TypeScript; tests/desktop-backup.spec.ts keeps the two equal).
 */
export const RECEIPT_EXTENSIONS = Object.freeze({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf", "image/heic": "heic" });

/** A file DotAmi named in the receipts folder: 32 random hex characters and one of the extensions. */
const RECEIPT_NAME = new RegExp(`^[0-9a-f]{32}\\.(${Object.values(RECEIPT_EXTENSIONS).join("|")})$`);

/** True for a name DotAmi gives a receipt file (used by the first-start encryption, desktop/receipt-crypto.mjs). */
export const isReceiptFileName = (name) => RECEIPT_NAME.test(name);
/** The receipt cap (10 MB, the maintainer's decision); a backup that lists a bigger receipt is not one of ours. */
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const MAGIC = Buffer.from("DOTAMI-BACKUP\n", "ascii");
const FIXED_BYTES = MAGIC.length + 4; // magic + header length
const SCRYPT = { N: 131072, r: 8, p: 1 };
// scrypt at N=131072, r=8 needs about 128 MB; Node's default limit is 32 MB.
const SCRYPT_MAXMEM = 256 * 1024 * 1024;
const TAG_BYTES = 16;
/** How much of a file is read, hashed, encrypted and written at a time. */
const CHUNK = 1024 * 1024;
/** A header this long would list hundreds of thousands of files; anything longer isn't ours. */
const MAX_HEADER_BYTES = 64 * 1024 * 1024;
/** The database's name inside a format-2 backup. Always the first file. */
const DB_ENTRY = "dotami.db";

/**
 * Thrown for a backup the app can't use. `kind` says why, for code to branch on;
 * `message` is written for a non-technical person and says what to do.
 */
export class BackupError extends Error {
  /** @param {"not-a-backup" | "damaged" | "needs-passphrase" | "cannot-decrypt" | "newer-app" | "changed-while-writing"} kind @param {string} message */
  constructor(kind, message) {
    super(message);
    this.name = "BackupError";
    this.kind = kind;
  }
}

const notABackup = () => new BackupError("not-a-backup", "This file isn't a DotAmi backup.");
const damaged = () =>
  new BackupError("damaged", "This backup file is damaged, so it can't be restored. Nothing was changed. Try an older backup.");
const needsPassphrase = () => new BackupError("needs-passphrase", "This backup is locked. Enter the passphrase you chose when you made it.");
// GCM can't tell a wrong passphrase from a changed or truncated file — both just fail the
// authentication check — so the message has to cover both.
const cannotDecrypt = () => new BackupError("cannot-decrypt", "The passphrase is wrong, or the backup is damaged. Nothing was changed.");
const changedWhileWriting = () =>
  new BackupError(
    "changed-while-writing",
    "A receipt file changed or was removed while the backup was being written, so no backup was saved. Try again.",
  );

/**
 * Writes a backup of the database and the receipt files it describes to `outFile`.
 *
 * Which receipts go in: the files in the receipts folder that the database copy's Receipt table
 * describes. The folder is listed BEFORE the copy is taken, and a receipt's row is written before its
 * file gets its final name (lib/expenses/receipts/store.ts), so a receipt removed in between is in
 * neither, and one added in between has a row and no listed file: it counts as missing, like a
 * described file that isn't on the disk at all, and the caller says so. Files no row describes
 * (leftovers DotAmi's sweep would remove) are left out.
 *
 * Each receipt goes in as its own bytes: an encrypted one is decrypted with `receiptKey` (this
 * computer's key) in memory first. One this computer can't open (no key, another key, damaged) can't go
 * in, and is counted in `unreadableReceipts` for the caller to say so.
 * @param {string} dbFile the live database; its receipts are in the receipts folder beside it
 * @param {string} outFile where the backup goes (replaced if it exists)
 * @param {{ passphrase?: string, appVersion: string, now?: () => number, receiptKey?: Buffer | null }} options an empty passphrase means "not encrypted"
 * @returns {{ encrypted: boolean, bytes: number, migrations: string[], receipts: number, missingReceipts: number, unreadableReceipts: number }}
 */
export function writeBackup(dbFile, outFile, { passphrase = "", appVersion, now = Date.now, receiptKey = null } = {}) {
  const receiptsDir = path.join(path.dirname(dbFile), RECEIPTS_FOLDER);
  const listed = new Set(receiptNamesIn(receiptsDir));

  // VACUUM INTO writes a consistent copy even while the app has the database open; copying the
  // file itself could catch it halfway through a write.
  const scratch = mkdtempSync(path.join(os.tmpdir(), "dotami-backup-"));
  const copy = path.join(scratch, "copy.db");
  const partial = `${outFile}.partial`;
  let out = null;
  try {
    const source = new DatabaseSync(dbFile, { readOnly: true });
    try {
      source.prepare("VACUUM INTO ?").run(copy);
    } finally {
      source.close();
    }
    const migrations = appliedMigrations(copy);

    // First pass: every file's size and fingerprint, for the header.
    const files = [{ path: DB_ENTRY, source: copy, receipt: false, ...measure(copy) }];
    let missingReceipts = 0;
    let unreadableReceipts = 0;
    for (const name of describedReceipts(copy)) {
      const source = path.join(receiptsDir, name);
      const plain = listed.has(name) ? receiptForBackup(source, name, receiptKey) : "missing";
      if (plain === "missing") missingReceipts += 1;
      else if (plain === "unreadable") unreadableReceipts += 1;
      else files.push({ path: `${RECEIPTS_FOLDER}/${name}`, source, receipt: true, bytes: plain.length, sha256: sha256(plain) });
    }

    const encrypted = passphrase !== "";
    const header = {
      format: 2,
      appVersion,
      createdAt: new Date(now()).toISOString(),
      migrations,
      files: files.map((f) => ({ path: f.path, bytes: f.bytes, sha256: f.sha256 })),
      encryption: encrypted
        ? { cipher: "aes-256-gcm", kdf: "scrypt", ...SCRYPT, salt: randomBytes(16).toString("base64"), iv: randomBytes(12).toString("base64") }
        : null,
    };
    const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
    let cipher = null;
    if (encrypted) {
      const enc = header.encryption;
      cipher = createCipheriv("aes-256-gcm", deriveKey(passphrase, Buffer.from(enc.salt, "base64")), Buffer.from(enc.iv, "base64"), {
        authTagLength: TAG_BYTES,
      });
      cipher.setAAD(headerBytes);
    }

    // Written beside the real name and renamed at the end, so a crash or a full disk never leaves a
    // half-written file that looks like a finished backup.
    out = openSync(partial, "w");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(headerBytes.length);
    let written = writeAll(out, MAGIC) + writeAll(out, length) + writeAll(out, headerBytes);

    // Second pass: each file again, in pieces, checked against what the header says.
    const piece = Buffer.allocUnsafe(CHUNK);
    for (const f of files) {
      if (f.receipt) {
        // A receipt (at most 10 MB) is read, and decrypted if need be, whole; then written in pieces.
        const plain = receiptForBackup(f.source, path.basename(f.source), receiptKey);
        if (!Buffer.isBuffer(plain) || plain.length !== f.bytes || sha256(plain) !== f.sha256) throw changedWhileWriting();
        for (let at = 0; at < plain.length; at += CHUNK) {
          const part = plain.subarray(at, at + CHUNK);
          written += writeAll(out, cipher ? cipher.update(part) : part);
        }
        continue;
      }
      const hash = createHash("sha256");
      let count = 0;
      let fd;
      try {
        fd = openSync(f.source, "r");
      } catch {
        throw changedWhileWriting();
      }
      try {
        for (;;) {
          const n = readSync(fd, piece, 0, CHUNK, null);
          if (n === 0) break;
          const plain = piece.subarray(0, n);
          hash.update(plain);
          count += n;
          written += writeAll(out, cipher ? cipher.update(plain) : plain);
        }
      } finally {
        closeSync(fd);
      }
      if (count !== f.bytes || hash.digest("hex") !== f.sha256) throw changedWhileWriting();
    }
    if (cipher) {
      written += writeAll(out, cipher.final());
      written += writeAll(out, cipher.getAuthTag());
    }
    closeSync(out);
    out = null;
    renameSync(partial, outFile);
    return { encrypted, bytes: written, migrations, receipts: files.length - 1, missingReceipts, unreadableReceipts };
  } catch (error) {
    if (out !== null) closeSync(out);
    rmSync(partial, { force: true });
    throw error;
  } finally {
    rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

/**
 * Opens a backup file and checks all of it: the header, the passphrase, every file's size and
 * fingerprint and, for a locked one, the tag. Changes nothing, unless `unpackTo` names where to put
 * the database and the receipt files as they are read (prepareRestore does; the caller removes them
 * if this throws). A format-2 backup is read in pieces; a format-1 one whole, as it always was.
 * With `receiptKey` (this computer's key), each unpacked receipt is encrypted with it, after its
 * SHA-256 is checked; without one, receipts are unpacked as they are.
 * @param {string} file
 * @param {{ passphrase?: string, unpackTo?: { dbFile: string, receiptsDir: string } | null, receiptKey?: Buffer | null }} [options]
 * @returns {{ header: object, files: { path: string, bytes: number }[] }}
 * @throws {BackupError}
 */
export function readBackup(file, { passphrase = "", unpackTo = null, receiptKey = null } = {}) {
  const fd = openSync(file, "r");
  try {
    const size = fstatSync(fd).size;
    if (size < FIXED_BYTES) throw notABackup();
    const fixed = readExactly(fd, 0, FIXED_BYTES);
    if (!fixed.subarray(0, MAGIC.length).equals(MAGIC)) throw notABackup();
    const headerLength = fixed.readUInt32BE(MAGIC.length);
    if (headerLength > MAX_HEADER_BYTES || FIXED_BYTES + headerLength > size) throw notABackup();
    const headerBytes = readExactly(fd, FIXED_BYTES, headerLength);
    let header;
    try {
      header = JSON.parse(headerBytes.toString("utf8"));
    } catch {
      throw notABackup();
    }
    if (isFormat1Header(header)) return readFormat1(file, header, FIXED_BYTES + headerLength, passphrase, unpackTo);
    if (!isFormat2Header(header)) throw notABackup();
    return readFormat2(fd, size, header, headerBytes, passphrase, unpackTo, receiptKey);
  } finally {
    closeSync(fd);
  }
}

/**
 * Format 2: streams the payload through the cipher (if locked) into each file in turn. With a
 * `receiptKey`, a receipt is gathered whole instead (at most 10 MB: isFormat2Header refuses more),
 * checked, and only then written, encrypted, so no receipt is ever written here unencrypted.
 */
function readFormat2(fd, size, header, headerBytes, passphrase, unpackTo, receiptKey) {
  const enc = header.encryption;
  if (enc !== null && passphrase === "") throw needsPassphrase();
  const payloadStart = FIXED_BYTES + headerBytes.length;
  const total = header.files.reduce((sum, f) => sum + f.bytes, 0);
  // Cut short, or something added: either way the sizes the header gives can't be trusted.
  if (size !== payloadStart + total + (enc ? TAG_BYTES : 0)) throw damaged();

  let decipher = null;
  if (enc !== null) {
    const iv = Buffer.from(enc.iv, "base64");
    const salt = Buffer.from(enc.salt, "base64");
    if (iv.length !== 12 || salt.length === 0) throw notABackup();
    decipher = createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv, { authTagLength: TAG_BYTES });
    decipher.setAAD(headerBytes);
    decipher.setAuthTag(readExactly(fd, size - TAG_BYTES, TAG_BYTES));
  }
  // A wrong passphrase shows first as a file whose fingerprint doesn't match; for a locked backup
  // that is the same answer as a failed tag.
  const wrong = () => (enc !== null ? cannotDecrypt() : damaged());

  const piece = Buffer.allocUnsafe(CHUNK);
  let position = payloadStart;
  let left = total;
  let carry = Buffer.alloc(0);
  /** The next run of plain bytes, or null at the end of the payload. */
  const nextPlain = () => {
    if (carry.length > 0) {
      const c = carry;
      carry = Buffer.alloc(0);
      return c;
    }
    while (left > 0) {
      const n = readSync(fd, piece, 0, Math.min(CHUNK, left), position);
      if (n <= 0) throw wrong();
      position += n;
      left -= n;
      // Copied: `piece` is reused for the next read.
      const plain = decipher ? decipher.update(piece.subarray(0, n)) : Buffer.from(piece.subarray(0, n));
      if (plain.length > 0) return plain;
    }
    return null;
  };

  for (const entry of header.files) {
    const target = unpackTo ? targetOf(entry.path, unpackTo) : null;
    // The receipt's id, when this receipt is to be encrypted as it is unpacked.
    const encryptFor = target && receiptKey && entry.path !== DB_ENTRY ? receiptIdOfName(path.basename(target)) : null;
    let out = null;
    let whole = null;
    let filled = 0;
    if (target) {
      mkdirSync(path.dirname(target), { recursive: true });
      if (encryptFor) whole = Buffer.alloc(entry.bytes);
      else out = openSync(target, "wx");
    }
    const hash = createHash("sha256");
    let need = entry.bytes;
    try {
      while (need > 0) {
        const plain = nextPlain();
        if (!plain) throw wrong();
        const take = plain.length > need ? plain.subarray(0, need) : plain;
        if (take.length < plain.length) carry = plain.subarray(take.length);
        hash.update(take);
        if (out !== null) writeAll(out, take);
        if (whole !== null) filled += take.copy(whole, filled);
        need -= take.length;
      }
    } finally {
      if (out !== null) closeSync(out);
    }
    if (hash.digest("hex") !== entry.sha256) throw wrong();
    if (whole !== null) writeNewFile(target, encryptReceipt(whole, { key: receiptKey, id: encryptFor }));
  }
  if (decipher) {
    try {
      decipher.final();
    } catch {
      throw cannotDecrypt();
    }
  }
  return { header, files: header.files.map((f) => ({ path: f.path, bytes: f.bytes })) };
}

/** Format 1: the database alone, read whole (these backups were written whole, too). */
function readFormat1(file, header, headerEnd, passphrase, unpackTo) {
  const bytes = readFileSync(file);
  const payload = bytes.subarray(headerEnd);

  let db = payload;
  const enc = header.encryption;
  if (enc !== null) {
    if (passphrase === "") throw needsPassphrase();
    const tag = Buffer.from(enc.tag, "base64");
    const iv = Buffer.from(enc.iv, "base64");
    const salt = Buffer.from(enc.salt, "base64");
    if (tag.length !== 16 || iv.length !== 12 || salt.length === 0) throw notABackup();
    // Rebuild exactly what the writer authenticated: this same header text with the tag blanked.
    const aad = Buffer.from(JSON.stringify({ ...header, encryption: { ...enc, tag: "" } }), "utf8");
    try {
      const decipher = createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv, { authTagLength: 16 });
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);
      db = Buffer.concat([decipher.update(payload), decipher.final()]);
    } catch {
      throw cannotDecrypt();
    }
  }

  // Catches a cut-off or flipped-byte plain backup (encrypted ones already failed above).
  if (db.length !== header.payloadBytes || sha256(db) !== header.payloadSha256) throw damaged();
  if (unpackTo) {
    mkdirSync(path.dirname(unpackTo.dbFile), { recursive: true });
    writeFileSync(unpackTo.dbFile, db, { flag: "wx" });
  }
  return { header, files: [{ path: DB_ENTRY, bytes: db.length }] };
}

/** Where an unpacked file goes. The path was checked by isFormat2Header, so it is one of these two shapes. */
function targetOf(entryPath, { dbFile, receiptsDir }) {
  if (entryPath === DB_ENTRY) return dbFile;
  return path.join(receiptsDir, entryPath.slice(RECEIPTS_FOLDER.length + 1));
}

/** The folder prepareRestore() unpacks a backup's receipts into, beside the staged database. */
export function stagedReceiptsFolder(stagingFile) {
  return `${stagingFile}-receipts`;
}

/** Removes everything prepareRestore() staged (the database and the receipts folder beside it). */
export function discardRestore(stagingFile) {
  removeDatabaseFiles(stagingFile);
  rmSync(stagedReceiptsFolder(stagingFile), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

/**
 * Checks a backup and unpacks it beside the live database, without touching the live data: the
 * database to `stagingFile`, the receipts to stagedReceiptsFolder(stagingFile). On any failure both
 * are deleted before the error is thrown. With `receiptKey` (the key the receipts here will be opened
 * with), every receipt is staged encrypted with it.
 * @param {string} file the backup
 * @param {{ passphrase?: string, migrationsDir: string, stagingFile: string, receiptKey?: Buffer | null }} options
 * @returns {{ header: object, receipts: number }}
 * @throws {BackupError}
 */
export function prepareRestore(file, { passphrase = "", migrationsDir, stagingFile, receiptKey = null }) {
  // Whatever an earlier attempt left behind would otherwise mix with this one.
  discardRestore(stagingFile);
  try {
    const { header, files } = readBackup(file, {
      passphrase,
      unpackTo: { dbFile: stagingFile, receiptsDir: stagedReceiptsFolder(stagingFile) },
      receiptKey,
    });

    let migrations;
    try {
      const staged = new DatabaseSync(stagingFile);
      try {
        const verdict = staged.prepare("PRAGMA integrity_check").all();
        if (verdict.length !== 1 || verdict[0].integrity_check !== "ok") throw damaged();
        migrations = appliedMigrations(staged);
      } finally {
        staged.close();
      }
    } catch (error) {
      // SQLite itself rejecting the bytes ("file is not a database") also means damaged.
      throw error instanceof BackupError ? error : damaged();
    }

    // A backup with fewer migrations than this app knows is fine: the app upgrades it after the
    // restore. One with a migration this app has never heard of came from a newer app.
    const known = new Set(migrationNames(migrationsDir));
    if (migrations.some((name) => !known.has(name))) {
      throw new BackupError(
        "newer-app",
        "This backup was made by a newer version of DotAmi. Update the app first, then restore it. Nothing was changed.",
      );
    }
    return { header, receipts: files.length - 1 };
  } catch (error) {
    discardRestore(stagingFile);
    throw error;
  }
}

/**
 * Swaps a prepared database, and the receipts unpacked with it, in as the live ones. The caller must
 * have closed its own connection to `dbFile` first. An existing database is copied to `backupDir`
 * before it is replaced.
 *
 * The live receipts folder ([8i]) is moved into `backupDir` too, whole, beside that safety copy: the
 * safety copy describes those files, and the restored database doesn't (left in place, DotAmi's
 * sweep would take the ones it doesn't describe for leftovers and remove them). Then the backup's
 * own receipts, if it had any, become the receipts folder. A format-1 backup has none, so its
 * restored records have no receipt files.
 * @param {string} stagingFile the file prepareRestore() wrote
 * @param {string} dbFile the live database path
 * @param {{ backupDir: string, now?: () => number }} options
 * @returns {{ safetyCopy: string | null, receiptsMovedTo: string | null, receiptsRestored: number }}
 */
export function applyRestore(stagingFile, dbFile, { backupDir, now = Date.now }) {
  const stamp = now();
  let safetyCopy = null;
  if (existsSync(dbFile)) {
    mkdirSync(backupDir, { recursive: true });
    safetyCopy = path.join(backupDir, `dotami-before-restore-${stamp}.db`);
    const live = new DatabaseSync(dbFile);
    try {
      live.prepare("VACUUM INTO ?").run(safetyCopy);
    } finally {
      live.close();
    }
  }
  // Leftover journal files belong to the old database; next to the restored one they'd be applied
  // to it and corrupt it.
  for (const suffix of ["-journal", "-wal", "-shm"]) rmSync(`${dbFile}${suffix}`, { force: true });
  mkdirSync(path.dirname(dbFile), { recursive: true });

  // The folders move before the database is swapped: if a move fails, nothing has changed yet; if
  // the swap then fails, each goes back where it was.
  const receipts = path.join(path.dirname(dbFile), RECEIPTS_FOLDER);
  const staged = stagedReceiptsFolder(stagingFile);
  let receiptsMovedTo = null;
  if (existsSync(receipts)) {
    mkdirSync(backupDir, { recursive: true });
    receiptsMovedTo = path.join(backupDir, `receipts-before-restore-${stamp}`);
    renameSync(receipts, receiptsMovedTo);
  }
  let receiptsRestored = 0;
  let placed = false;
  try {
    if (existsSync(staged)) {
      receiptsRestored = readdirSync(staged).length;
      renameSync(staged, receipts);
      placed = true;
    }
    renameSync(stagingFile, dbFile);
  } catch (error) {
    // Best effort: a folder that can't go back stays where it is (in backups/, or staged), never lost.
    try {
      if (placed) renameSync(receipts, staged);
      if (receiptsMovedTo) renameSync(receiptsMovedTo, receipts);
    } catch {
      // The error that matters is the one below.
    }
    throw error;
  }
  return { safetyCopy, receiptsMovedTo, receiptsRestored };
}

/** "1 receipt file", "3 receipt files". */
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The sentence File → Back up… adds about receipts ([8i]), from what writeBackup() returned: how many
 * went in, and how many DotAmi has a record of but couldn't find. Empty when there are none of either.
 * `unreadable`: receipts this computer's key couldn't open, left out ([8i] § 9). `locked`: whether the
 * backup has a passphrase; an unlocked one says its receipts aren't encrypted in it.
 */
export function backupReceiptsNote(receipts, missingReceipts, { unreadable = 0, locked = true } = {}) {
  let note = receipts > 0 ? `It holds your ${plural(receipts, "receipt file")} too. ` : "";
  if (receipts > 0 && !locked) {
    note += `The receipt ${receipts === 1 ? "file in it isn't" : "files in it aren't"} encrypted either: anyone with the backup can open ${receipts === 1 ? "it" : "them"}. `;
  }
  if (missingReceipts > 0) {
    const one = missingReceipts === 1;
    note += `${plural(missingReceipts, "receipt file")} DotAmi has a record of ${one ? "wasn't" : "weren't"} in the receipts folder, so ${one ? "it isn't" : "they aren't"} in the backup. `;
  }
  if (unreadable > 0) {
    const one = unreadable === 1;
    note += `${plural(unreadable, "receipt file")} couldn't be opened with this computer's key, so ${one ? "it isn't" : "they aren't"} in the backup (Settings → Data and backups says why). `;
  }
  return note;
}

/**
 * The sentence the restore question adds about receipts ([8i]): what the backup brings, and what
 * happens to the receipt files here now. `format` is the backup's; `receiptsHere` counts the files
 * DotAmi named in the live receipts folder. Starts with a space, or is empty.
 */
export function restoreReceiptsNote(format, receiptsInBackup, receiptsHere) {
  if (format === 1) {
    return receiptsHere > 0
      ? " This backup was made before backups held receipt files: your receipts folder is moved into the backups folder as it is, and the restored records have no receipt files."
      : "";
  }
  let note = receiptsInBackup > 0 ? ` It holds ${plural(receiptsInBackup, "receipt file")}.` : "";
  if (receiptsHere > 0) {
    note += ` The ${plural(receiptsHere, "receipt file")} here now ${receiptsHere === 1 ? "goes" : "go"} to the backups folder too, with the safety copy.`;
  }
  return note;
}

/** The names in the receipts folder that DotAmi wrote (anything else there is never backed up). */
function receiptNamesIn(folder) {
  try {
    return readdirSync(folder, { withFileTypes: true })
      .filter((e) => e.isFile() && RECEIPT_NAME.test(e.name))
      .map((e) => e.name);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

/** The receipt file names a database's Receipt table describes, sorted; none when it has no such table. */
function describedReceipts(dbFile) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const table = db.prepare(`SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = 'Receipt'`).get();
    if (!table) return [];
    const names = [];
    for (const row of db.prepare(`SELECT id, type FROM "Receipt"`).all()) {
      const extension = Object.hasOwn(RECEIPT_EXTENSIONS, row.type) ? RECEIPT_EXTENSIONS[row.type] : null;
      const name = extension && typeof row.id === "string" ? `${row.id}.${extension}` : null;
      if (name && RECEIPT_NAME.test(name)) names.push(name);
    }
    return names.sort();
  } finally {
    db.close();
  }
}

/** A file's size and SHA-256, read in pieces. With `missingOk`, a file that isn't there gives null. */
function measure(file, { missingOk = false } = {}) {
  let fd;
  try {
    fd = openSync(file, "r");
  } catch (error) {
    if (missingOk && error?.code === "ENOENT") return null;
    throw error;
  }
  try {
    const hash = createHash("sha256");
    const piece = Buffer.allocUnsafe(CHUNK);
    let bytes = 0;
    for (;;) {
      const n = readSync(fd, piece, 0, CHUNK, null);
      if (n === 0) break;
      hash.update(piece.subarray(0, n));
      bytes += n;
    }
    return { bytes, sha256: hash.digest("hex") };
  } finally {
    closeSync(fd);
  }
}

/**
 * One receipt's own bytes, for a backup: read whole through one handle (a receipt is at most 10 MB),
 * and decrypted with `key` when the file is encrypted. "missing" when the file isn't there;
 * "unreadable" when it can't be opened here (no key, another key, damaged, or bigger than any receipt).
 */
function receiptForBackup(file, name, key) {
  let fd;
  try {
    fd = openSync(file, "r");
  } catch (error) {
    if (error?.code === "ENOENT") return "missing";
    throw error;
  }
  let onDisk;
  try {
    const size = fstatSync(fd).size;
    if (size > MAX_RECEIPT_BYTES + ENCRYPTED_OVERHEAD) return "unreadable";
    onDisk = Buffer.alloc(size);
    let got = 0;
    while (got < size) {
      const n = readSync(fd, onDisk, got, size - got, got);
      if (n <= 0) return "unreadable";
      got += n;
    }
  } finally {
    closeSync(fd);
  }
  if (!isEncryptedReceipt(onDisk)) return onDisk.length <= MAX_RECEIPT_BYTES ? onDisk : "unreadable";
  if (!key) return "unreadable";
  try {
    return decryptReceipt(onDisk, { key, id: receiptIdOfName(name) });
  } catch {
    return "unreadable";
  }
}

/** Writes a new file, never over an existing one (the staging folder starts empty). */
function writeNewFile(file, bytes) {
  const fd = openSync(file, "wx");
  try {
    writeAll(fd, bytes);
  } finally {
    closeSync(fd);
  }
}

/** Exactly `length` bytes from `position`, or "not a backup" when the file is shorter. */
function readExactly(fd, position, length) {
  const buffer = Buffer.alloc(length);
  let got = 0;
  while (got < length) {
    const n = readSync(fd, buffer, got, length - got, position + got);
    if (n <= 0) throw notABackup();
    got += n;
  }
  return buffer;
}

/** Writes all of `bytes` (writeSync may write less than asked); returns how many. */
function writeAll(fd, bytes) {
  let done = 0;
  while (done < bytes.length) done += writeSync(fd, bytes, done, bytes.length - done);
  return bytes.length;
}

/** scrypt, sized as the header says (a header that asks for anything else is refused). */
function deriveKey(passphrase, salt) {
  return scryptSync(passphrase, salt, 32, { ...SCRYPT, maxmem: SCRYPT_MAXMEM });
}

/** The scrypt and cipher settings writeBackup uses, and only those: a hostile file can't pick its own cost. */
function isEncryption(e, { withTag }) {
  return (
    typeof e === "object" &&
    e !== null &&
    e.cipher === "aes-256-gcm" &&
    e.kdf === "scrypt" &&
    e.N === SCRYPT.N &&
    e.r === SCRYPT.r &&
    e.p === SCRYPT.p &&
    typeof e.salt === "string" &&
    typeof e.iv === "string" &&
    (withTag ? typeof e.tag === "string" : !Object.hasOwn(e, "tag"))
  );
}

/** A format-1 header, shaped as the old writeBackup made them. */
function isFormat1Header(h) {
  if (typeof h !== "object" || h === null || Array.isArray(h) || h.format !== 1) return false;
  if (typeof h.payloadSha256 !== "string" || !Number.isSafeInteger(h.payloadBytes)) return false;
  return h.encryption === null || isEncryption(h.encryption, { withTag: true });
}

/**
 * A format-2 header: the database first, then only receipt files named the way DotAmi names them
 * (so no path in a backup can point anywhere else), each listed once, none over the receipt cap.
 */
function isFormat2Header(h) {
  if (typeof h !== "object" || h === null || Array.isArray(h) || h.format !== 2) return false;
  if (typeof h.appVersion !== "string" || typeof h.createdAt !== "string") return false;
  if (!Array.isArray(h.migrations) || !h.migrations.every((m) => typeof m === "string")) return false;
  if (!Array.isArray(h.files) || h.files.length === 0) return false;
  const seen = new Set();
  for (const [i, f] of h.files.entries()) {
    if (typeof f !== "object" || f === null || typeof f.path !== "string") return false;
    if (!Number.isSafeInteger(f.bytes) || f.bytes < 0) return false;
    if (typeof f.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(f.sha256)) return false;
    if (i === 0) {
      if (f.path !== DB_ENTRY) return false;
      continue;
    }
    const prefix = `${RECEIPTS_FOLDER}/`;
    if (!f.path.startsWith(prefix) || !RECEIPT_NAME.test(f.path.slice(prefix.length))) return false;
    if (f.bytes > MAX_RECEIPT_BYTES || seen.has(f.path)) return false;
    seen.add(f.path);
  }
  return h.encryption === null || isEncryption(h.encryption, { withTag: false });
}

/**
 * Names of the migrations Prisma's bookkeeping table says are applied, sorted. Takes a database
 * file path or an open database; a database with no bookkeeping table has applied none.
 */
function appliedMigrations(source) {
  const db = typeof source === "string" ? new DatabaseSync(source, { readOnly: true }) : source;
  try {
    const table = db.prepare(`SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = '_prisma_migrations'`).get();
    if (!table) return [];
    return db
      .prepare(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`)
      .all()
      .map((r) => r.migration_name)
      .sort();
  } finally {
    if (typeof source === "string") db.close();
  }
}

/** Same rule as migrate.mjs: a migration is a folder in migrationsDir. */
function migrationNames(migrationsDir) {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function removeDatabaseFiles(file) {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(`${file}${suffix}`, { force: true });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
