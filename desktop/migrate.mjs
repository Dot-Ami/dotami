// Brings the desktop app's database up to date by applying Prisma's own migration files
// (prisma/migrations/*/migration.sql) with the same SQLite the server uses ([8i]: better-sqlite3-multiple-ciphers,
// through desktop/sqlite.mjs, so an encrypted data file is opened with its key) — instead of shipping
// the Prisma CLI, which is ~146 MB of engines for five kinds of database and reports usage to
// checkpoint.prisma.io. (Until [8i] it used node:sqlite, the SQLite built into Electron's Node, which
// can't open an encrypted file.)
//
// It keeps Prisma's own bookkeeping table exactly as `prisma migrate deploy` does (same table, a
// SHA-256 of the file's bytes, times in milliseconds — read from a database Prisma migrated,
// 2026-10-05), so `prisma migrate status` agrees with it; tests/desktop-migrate.spec.ts checks
// that both ways round.
//
// Safer than "apply whatever is pending": it refuses, without changing anything, a database
// that a newer DotAmi has already migrated, and one where a migration was left half-done; and it
// copies the database to backups/ before changing one that already has data in it.
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { openDatabase, runSql } from "./sqlite.mjs";

const BOOKKEEPING = `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
)`;

/** Thrown for a database the app must not touch; `message` is written for the person. */
export class MigrationRefused extends Error {}

/**
 * @param {string} dbFile the database file (created if missing)
 * @param {string} migrationsDir the folder holding one folder per migration
 * @param {{ backupDir?: string, now?: () => number, log?: (line: string) => void, key?: Buffer | null }} [options]
 *   `key`: the data file's key ([8i]); a new file is created encrypted with it from its first byte, and the
 *   safety copy before an update is encrypted with it too (VACUUM INTO keeps the source's encryption).
 * @returns {{ applied: string[], backup: string | null }}
 */
export function migrate(dbFile, migrationsDir, options = {}) {
  const now = options.now ?? Date.now;
  const log = options.log ?? (() => {});
  const local = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(migrationsDir, d.name, "migration.sql")))
    .map((d) => d.name)
    .sort();

  const db = openDatabase(dbFile, { key: options.key ?? null });
  try {
    runSql(db, BOOKKEEPING);
    const rows = db.prepare(`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`).all();
    const live = rows.filter((r) => r.rolled_back_at === null);

    const unfinished = live.filter((r) => r.finished_at === null);
    if (unfinished.length > 0) {
      throw new MigrationRefused(
        `A database update was left half-done (${unfinished.map((r) => r.migration_name).join(", ")}). ` +
          "Nothing was changed. Restore a backup from the data folder's backups/ folder, or ask for help on GitHub.",
      );
    }
    const known = new Set(local);
    const unknown = live.filter((r) => !known.has(r.migration_name));
    if (unknown.length > 0) {
      throw new MigrationRefused(
        "This data was saved by a newer version of DotAmi. Nothing was changed — update the app, then open it again.",
      );
    }

    const done = new Set(live.map((r) => r.migration_name));
    const pending = local.filter((name) => !done.has(name));
    for (const r of live) {
      // Prisma's deploy only warns about an edited migration too; a checkout with different line
      // endings changes the bytes without changing the SQL, so this is a note, not a refusal.
      const sum = sha256(path.join(migrationsDir, r.migration_name, "migration.sql"));
      if (sum !== r.checksum) log(`[migrate] note: ${r.migration_name} differs from the file that was applied`);
    }
    if (pending.length === 0) return { applied: [], backup: null };

    // An existing database gets a full copy before anything changes it. VACUUM INTO writes a
    // consistent copy even if something else has the file open, and an encrypted file's copy is
    // encrypted with the same key (measured 2026-10-10; tests/desktop-migrate.spec.ts checks).
    let backup = null;
    if (done.size > 0) {
      const dir = options.backupDir ?? path.join(path.dirname(dbFile), "backups");
      mkdirSync(dir, { recursive: true });
      backup = path.join(dir, `dotami-before-${pending[0]}-${now()}.db`);
      db.prepare("VACUUM INTO ?").run(backup);
      log(`[migrate] backed up to ${backup}`);
    }

    for (const name of pending) {
      const file = path.join(migrationsDir, name, "migration.sql");
      const sql = readFileSync(file, "utf8");
      const id = randomUUID();
      // One transaction per migration: SQLite undoes schema changes too, so a failure leaves
      // the database exactly as it was before this migration.
      runSql(db, "BEGIN IMMEDIATE");
      try {
        db.prepare(
          `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, ?, 0)`,
        ).run(id, sha256(file), name, now());
        runSql(db, sql);
        db.prepare(`UPDATE "_prisma_migrations" SET finished_at = ?, applied_steps_count = 1 WHERE id = ?`).run(now(), id);
        runSql(db, "COMMIT");
      } catch (error) {
        runSql(db, "ROLLBACK");
        throw new Error(`database update ${name} failed and was undone: ${error.message}`);
      }
      log(`[migrate] applied ${name}`);
    }
    return { applied: pending, backup };
  } finally {
    db.close();
  }
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/**
 * Rebuilds the database file (VACUUM) so the space of deleted rows, and the words in it, is gone
 * from the file. Used only to finish a wipe that Delete left owed (desktop/wipe-pending.mjs), before
 * the server opens the file. Returns true when the file has no free pages left; throws when SQLite
 * can't do it (not enough disk, the file busy, the key wrong).
 * @param {string} dbFile
 * @param {Buffer | null} [key] the data file's key, when it is encrypted ([8i])
 * @returns {boolean}
 */
export function vacuumFile(dbFile, key = null) {
  const db = openDatabase(dbFile, { key });
  try {
    runSql(db, "VACUUM");
    const row = db.prepare("PRAGMA freelist_count").get();
    return Number(row?.freelist_count ?? 1) === 0;
  } finally {
    db.close();
  }
}
