// Backups of the desktop app's one database file (dotami.db): write one to a single
// `.dotami-backup` file (optionally locked with a passphrase), check one, and restore one.
//
// File layout, the same for plain and encrypted backups:
//   14 bytes   the text "DOTAMI-BACKUP\n"
//    4 bytes   header length L, unsigned 32-bit big-endian
//    L bytes   the header: UTF-8 JSON (format, appVersion, createdAt, migrations, payloadSha256,
//              payloadBytes, encryption)
//   the rest   the payload: the database bytes, or their AES-256-GCM ciphertext
//
// Encrypted backups use a key derived from the passphrase with scrypt. The header is covered too:
// its exact JSON text, with `tag` set to "", is fed to GCM as "additional authenticated data". The
// tag can't be known before encrypting, so it is written as "" while encrypting and filled in
// after — and a changed appVersion, salt, or anything else in the header makes decryption fail.
//
// Restoring is two steps so a bad backup can never touch the live data: prepareRestore() checks the
// file and unpacks it next to the live database; applyRestore() swaps it in once the app has
// closed its own connection to the database.
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/** The file extension (without the dot) the app gives its backups. */
export const BACKUP_EXTENSION = "dotami-backup";

/** The receipts folder beside the database: the same name as RECEIPTS_FOLDER in lib/expenses/receipts/store.ts. */
export const RECEIPTS_FOLDER = "receipts";

const MAGIC = Buffer.from("DOTAMI-BACKUP\n", "ascii");
const FIXED_BYTES = MAGIC.length + 4; // magic + header length
const SCRYPT = { N: 131072, r: 8, p: 1 };
// scrypt at N=131072, r=8 needs about 128 MB; Node's default limit is 32 MB.
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

/**
 * Thrown for a backup the app can't use. `kind` says why, for code to branch on;
 * `message` is written for a non-technical person and says what to do.
 */
export class BackupError extends Error {
  /** @param {"not-a-backup" | "damaged" | "needs-passphrase" | "cannot-decrypt" | "newer-app"} kind @param {string} message */
  constructor(kind, message) {
    super(message);
    this.name = "BackupError";
    this.kind = kind;
  }
}

const notABackup = () => new BackupError("not-a-backup", "This file isn't a DotAmi backup.");
const damaged = () =>
  new BackupError("damaged", "This backup file is damaged, so it can't be restored. Nothing was changed. Try an older backup.");

/**
 * Writes a backup of the database to `outFile`.
 * @param {string} dbFile the live database
 * @param {string} outFile where the backup goes (replaced if it exists)
 * @param {{ passphrase?: string, appVersion: string, now?: () => number }} options an empty passphrase means "not encrypted"
 * @returns {{ encrypted: boolean, bytes: number, migrations: string[] }}
 */
export function writeBackup(dbFile, outFile, { passphrase = "", appVersion, now = Date.now } = {}) {
  // VACUUM INTO writes a consistent copy even while the app has the database open; copying the
  // file itself could catch it halfway through a write.
  const scratch = mkdtempSync(path.join(os.tmpdir(), "dotami-backup-"));
  const copy = path.join(scratch, "copy.db");
  let database;
  let migrations;
  try {
    const source = new DatabaseSync(dbFile, { readOnly: true });
    try {
      source.prepare("VACUUM INTO ?").run(copy);
    } finally {
      source.close();
    }
    migrations = appliedMigrations(copy);
    database = readFileSync(copy);
  } finally {
    rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }

  const encrypted = passphrase !== "";
  const header = {
    format: 1,
    appVersion,
    createdAt: new Date(now()).toISOString(),
    migrations,
    payloadSha256: sha256(database),
    payloadBytes: database.length,
    encryption: encrypted
      ? {
          cipher: "aes-256-gcm",
          kdf: "scrypt",
          ...SCRYPT,
          salt: randomBytes(16).toString("base64"),
          iv: randomBytes(12).toString("base64"),
          tag: "",
        }
      : null,
  };

  let payload = database;
  if (encrypted) {
    const enc = header.encryption;
    const cipher = createCipheriv("aes-256-gcm", deriveKey(passphrase, Buffer.from(enc.salt, "base64")), Buffer.from(enc.iv, "base64"), {
      authTagLength: 16,
    });
    cipher.setAAD(Buffer.from(JSON.stringify(header), "utf8")); // tag is "" here, see the top of the file
    payload = Buffer.concat([cipher.update(database), cipher.final()]);
    enc.tag = cipher.getAuthTag().toString("base64");
  }

  const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(headerBytes.length);
  const file = Buffer.concat([MAGIC, length, headerBytes, payload]);

  // Write beside the real name and rename, so a crash or a full disk never leaves a half-written
  // file that looks like a finished backup.
  const partial = `${outFile}.partial`;
  try {
    writeFileSync(partial, file);
    renameSync(partial, outFile);
  } catch (error) {
    rmSync(partial, { force: true });
    throw error;
  }
  return { encrypted, bytes: file.length, migrations };
}

/**
 * Opens a backup file, checks it, and returns its header and the database bytes. Changes nothing.
 * @param {string} file
 * @param {{ passphrase?: string }} [options]
 * @returns {{ header: object, db: Buffer }}
 * @throws {BackupError}
 */
export function readBackup(file, { passphrase = "" } = {}) {
  const bytes = readFileSync(file);
  if (bytes.length < FIXED_BYTES || !bytes.subarray(0, MAGIC.length).equals(MAGIC)) throw notABackup();
  const headerEnd = FIXED_BYTES + bytes.readUInt32BE(MAGIC.length);
  if (headerEnd > bytes.length) throw notABackup();
  let header;
  try {
    header = JSON.parse(bytes.toString("utf8", FIXED_BYTES, headerEnd));
  } catch {
    throw notABackup();
  }
  if (!isHeader(header)) throw notABackup();
  const payload = bytes.subarray(headerEnd);

  let db = payload;
  const enc = header.encryption;
  if (enc !== null) {
    if (passphrase === "") {
      throw new BackupError("needs-passphrase", "This backup is locked. Enter the passphrase you chose when you made it.");
    }
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
      // GCM can't tell a wrong passphrase from a changed or truncated file — both just fail the
      // authentication check — so the message has to cover both.
      throw new BackupError("cannot-decrypt", "The passphrase is wrong, or the backup is damaged. Nothing was changed.");
    }
  }

  // Catches a cut-off or flipped-byte plain backup (encrypted ones already failed above).
  if (db.length !== header.payloadBytes || sha256(db) !== header.payloadSha256) throw damaged();
  return { header, db };
}

/**
 * Checks a backup and unpacks its database to `stagingFile`, without touching the live database.
 * On any failure `stagingFile` is deleted before the error is thrown.
 * @param {string} file the backup
 * @param {{ passphrase?: string, migrationsDir: string, stagingFile: string }} options
 * @returns {{ header: object }}
 * @throws {BackupError}
 */
export function prepareRestore(file, { passphrase = "", migrationsDir, stagingFile }) {
  try {
    const { header, db } = readBackup(file, { passphrase });
    mkdirSync(path.dirname(stagingFile), { recursive: true });
    writeFileSync(stagingFile, db);

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
    return { header };
  } catch (error) {
    removeDatabaseFiles(stagingFile);
    throw error;
  }
}

/**
 * Swaps a prepared database in as the live one. The caller must have closed its own connection to
 * `dbFile` first. An existing database is copied to `backupDir` before it is replaced.
 *
 * The receipts folder beside the database ([8i]) is moved into `backupDir` too, whole, because the
 * restored database doesn't describe those files: left in place, DotAmi's sweep would take them for
 * leftovers and remove them. This kind of backup holds no receipt files, so the restored data has
 * no receipts; the moved folder is the person's copy of the ones they had.
 * @param {string} stagingFile the file prepareRestore() wrote
 * @param {string} dbFile the live database path
 * @param {{ backupDir: string, now?: () => number }} options
 * @returns {{ safetyCopy: string | null, receiptsMovedTo: string | null }}
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

  // Moved before the database is swapped: if the move fails, nothing has changed yet; if the swap
  // then fails, the folder goes back where it was.
  const receipts = path.join(path.dirname(dbFile), RECEIPTS_FOLDER);
  let receiptsMovedTo = null;
  if (existsSync(receipts)) {
    mkdirSync(backupDir, { recursive: true });
    receiptsMovedTo = path.join(backupDir, `receipts-before-restore-${stamp}`);
    renameSync(receipts, receiptsMovedTo);
  }
  try {
    renameSync(stagingFile, dbFile);
  } catch (error) {
    if (receiptsMovedTo) renameSync(receiptsMovedTo, receipts);
    throw error;
  }
  return { safetyCopy, receiptsMovedTo };
}

/** scrypt, sized as the header says (a header that asks for anything else is refused by isHeader). */
function deriveKey(passphrase, salt) {
  return scryptSync(passphrase, salt, 32, { ...SCRYPT, maxmem: SCRYPT_MAXMEM });
}

/** Only headers shaped like the ones writeBackup makes; stops a hostile file picking its own scrypt cost. */
function isHeader(h) {
  if (typeof h !== "object" || h === null || Array.isArray(h) || h.format !== 1) return false;
  if (typeof h.payloadSha256 !== "string" || !Number.isSafeInteger(h.payloadBytes)) return false;
  if (h.encryption === null) return true;
  const e = h.encryption;
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
    typeof e.tag === "string"
  );
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
