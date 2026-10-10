// [8i] The SQLite the desktop app's main process opens the data file with: the migrator, the first-start
// encryption, finishing an owed wipe (and, with backups, the backup and restore steps). It is
// better-sqlite3-multiple-ciphers, the same package and file the server reaches through Prisma
// (lib/db/client.ts), so both sides open an encrypted file the same way. docs/architecture/database-encryption.md.
//
// Where it is loaded from: the installed app keeps the package only in its server's folder
// (resources/server/node_modules), never inside app.asar, so desktop/main.mjs calls useSqliteFrom() with
// that folder before anything opens a file. A copy run from the source code, and the tests, load it from
// the top folder's node_modules. (Not `import.meta.url`: Playwright loads desktop files for the desktop
// test through its CommonJS transform, where import.meta is a syntax error.)
import { closeSync, openSync, readSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/** The folder whose node_modules holds the package; null: the current folder's. */
let home = null;
/** @type {any} */
let Database = null;

/** Loads the package from `folder`'s node_modules from now on (desktop/main.mjs: the server's folder). */
export function useSqliteFrom(folder) {
  home = folder;
  Database = null;
}

function load() {
  Database ??= createRequire(path.join(home ?? process.cwd(), "package.json"))("better-sqlite3");
  return Database;
}

/** The SQL that gives SQLite3 Multiple Ciphers a raw 256-bit key: the key itself, with no key derivation. */
export function keyPragma(key) {
  return `key = "x'${key.toString("hex")}'"`;
}

/** Thrown by openDatabase when the file can't be read with the key given (or without one). The message is DotAmi's. */
export class CannotOpenDatabase extends Error {
  constructor(keyed) {
    super(keyed ? "the data file can't be opened with this key" : "the data file can't be opened without a key");
    this.name = "CannotOpenDatabase";
    this.keyed = keyed;
  }
}

/**
 * Opens a data file, with its key when it has one, and reads one page so a wrong or missing key fails
 * here (CannotOpenDatabase), not later. Foreign keys are on, as SQLite3 Multiple Ciphers is built
 * (SQLITE_DEFAULT_FOREIGN_KEYS=1, like node:sqlite before it).
 * @param {string} file
 * @param {{ key?: Buffer | null, readonly?: boolean, fileMustExist?: boolean }} [options]
 */
export function openDatabase(file, { key = null, readonly = false, fileMustExist = false } = {}) {
  const Db = load();
  const db = new Db(file, { readonly, fileMustExist });
  try {
    if (key) db.pragma(keyPragma(key));
    db.prepare("SELECT count(*) FROM sqlite_master").get();
  } catch (error) {
    db.close();
    if (error?.code === "SQLITE_NOTADB") throw new CannotOpenDatabase(Boolean(key));
    throw error;
  }
  return db;
}

/** A database held only in memory, made from a page image (the bytes serialize() gives). */
export function openImage(image) {
  const Db = load();
  return new Db(image);
}

/** Runs one or more SQL statements: SQL only, never a program (better-sqlite3's `exec`). */
export function runSql(db, sql) {
  return db["exec"](sql);
}

/** What the first 16 bytes of every plain SQLite file are. */
const PLAIN_HEADER = Buffer.from("SQLite format 3\0", "latin1");

/**
 * What a data file is, from its first bytes (database-encryption.md § 4, "The check, exactly"):
 * "absent" (no file, or 0 bytes: a new database), "plain" (starts "SQLite format 3" and a zero byte),
 * or "encrypted" (anything else, which must open with the key; a plain file damaged at its start lands
 * here too, and the start then says it may be damaged as well as locked).
 * @param {string} file
 * @returns {"absent" | "plain" | "encrypted"}
 */
export function fileKind(file) {
  let size;
  try {
    size = statSync(file).size;
  } catch {
    return "absent";
  }
  if (size === 0) return "absent";
  const head = Buffer.alloc(16);
  const fd = openSync(file, "r");
  try {
    readSync(fd, head, 0, 16, 0);
  } finally {
    closeSync(fd);
  }
  return head.equals(PLAIN_HEADER) ? "plain" : "encrypted";
}
