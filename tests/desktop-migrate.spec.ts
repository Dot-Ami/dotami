/**
 * The desktop app's migrator (desktop/migrate.mjs) against Prisma itself: what it does must look,
 * to Prisma's own `migrate status`, exactly like `prisma migrate deploy` did it — and a database
 * Prisma migrated must need nothing from it. Plus the cases it exists to be safe about.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate, MigrationRefused } from "../desktop/migrate.mjs";

const root = path.resolve(__dirname, "..");
const migrations = path.join(root, "prisma", "migrations");
const localNames = ["20260928000000_sqlite_init"];

let dir = "";
let dbFile = "";

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-migrate-"));
  dbFile = path.join(dir, "dotami.db");
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

/** Opens the file, runs one query, closes it again (Windows won't delete an open file). */
function query<T>(file: string, sql: string, ...params: (string | number | null)[]): T[] {
  const db = new DatabaseSync(file);
  try {
    return db.prepare(sql).all(...params) as T[];
  } finally {
    db.close();
  }
}

const tables = (file: string) =>
  query<{ name: string }>(file, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map((r) => r.name);
const columns = (file: string, table: string) => query<{ name: string }>(file, `PRAGMA table_info("${table}")`).map((c) => c.name);
const fileHash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Prisma's own verdict on a database file, through the project's check-in-free wrapper. */
function prisma(args: string[], file: string): { code: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [path.join(root, "scripts", "prisma.mjs"), ...args], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: `file:${file.replace(/\\/g, "/")}` },
      encoding: "utf8",
      stdio: "pipe",
    });
    return { code: 0, out };
  } catch (error) {
    const e = error as { status: number; stdout: string; stderr: string };
    return { code: e.status, out: `${e.stdout}${e.stderr}` };
  }
}

describe("desktop migrator — the same result as Prisma's own migrate deploy", () => {
  it("gives a new file every migration, recorded so that Prisma's status check agrees", () => {
    const result = migrate(dbFile, migrations);
    expect(result).toEqual({ applied: localNames, backup: null });
    expect(tables(dbFile)).toEqual(expect.arrayContaining(["User", "Venture", "PersonStatement", "ScenarioState", "_prisma_migrations"]));

    const [row] = query<{ checksum: string; finished_at: number | null; applied_steps_count: number }>(
      dbFile,
      `SELECT checksum, finished_at, applied_steps_count FROM "_prisma_migrations"`,
    );
    expect(row.checksum).toBe(fileHash(path.join(migrations, localNames[0], "migration.sql")));
    expect(row.finished_at).toEqual(expect.any(Number));
    expect(row.applied_steps_count).toBe(1);

    const status = prisma(["migrate", "status"], dbFile);
    expect(status.out).toContain("Database schema is up to date");
    expect(status.code).toBe(0);
  }, 60_000);

  it("finds nothing to do on a database Prisma migrated itself", () => {
    expect(prisma(["migrate", "deploy"], dbFile).code).toBe(0);
    expect(migrate(dbFile, migrations)).toEqual({ applied: [], backup: null });
  }, 60_000);

  it("changes nothing the second time", () => {
    migrate(dbFile, migrations);
    expect(migrate(dbFile, migrations)).toEqual({ applied: [], backup: null });
  });
});

describe("desktop migrator — the cases it must refuse, back up or undo", () => {
  it("refuses a database a newer DotAmi has migrated, and leaves the file exactly as it was", () => {
    migrate(dbFile, migrations);
    query(dbFile, `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, started_at, applied_steps_count) VALUES ('x', 'y', '29990101000000_from_the_future', 1, 1, 1) RETURNING id`);
    const before = fileHash(dbFile);
    expect(() => migrate(dbFile, migrations)).toThrow(MigrationRefused);
    expect(() => migrate(dbFile, migrations)).toThrow(/newer version of DotAmi/);
    expect(fileHash(dbFile)).toBe(before);
  });

  it("refuses a database where an update was left half-done", () => {
    migrate(dbFile, migrations);
    query(dbFile, `UPDATE "_prisma_migrations" SET finished_at = NULL RETURNING id`);
    expect(() => migrate(dbFile, migrations)).toThrow(/left half-done/);
  });

  it("backs up an existing database before a new migration, and undoes one that fails", () => {
    const mine = path.join(dir, "migrations");
    cpSync(migrations, mine, { recursive: true });
    migrate(dbFile, mine);
    query(dbFile, `INSERT INTO "User" (id, updatedAt) VALUES ('someone', 0) RETURNING id`);

    // A good new migration: the backup holds the data as it was, the database gains the column.
    mkdirSync(path.join(mine, "29990101000000_add_x"));
    writeFileSync(path.join(mine, "29990101000000_add_x", "migration.sql"), `ALTER TABLE "User" ADD COLUMN "x" TEXT;\n`);
    const { applied, backup } = migrate(dbFile, mine, { backupDir: path.join(dir, "backups"), now: () => 42 });
    expect(applied).toEqual(["29990101000000_add_x"]);
    expect(backup).toBe(path.join(dir, "backups", "dotami-before-29990101000000_add_x-42.db"));
    expect(existsSync(backup!)).toBe(true);
    expect(query<{ id: string }>(backup!, `SELECT id FROM "User"`)).toEqual([{ id: "someone" }]);
    expect(columns(backup!, "User")).not.toContain("x");
    expect(columns(dbFile, "User")).toContain("x");

    // A broken one: its first statement is undone with it, and it isn't recorded as applied.
    mkdirSync(path.join(mine, "29990102000000_broken"));
    writeFileSync(path.join(mine, "29990102000000_broken", "migration.sql"), `ALTER TABLE "User" ADD COLUMN "y" TEXT;\nTHIS IS NOT SQL;\n`);
    expect(() => migrate(dbFile, mine, { backupDir: path.join(dir, "backups") })).toThrow(/failed and was undone/);
    expect(columns(dbFile, "User")).not.toContain("y");
    expect(query(dbFile, `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '29990102000000_broken'`)).toEqual([]);
    expect(query<{ id: string }>(dbFile, `SELECT id FROM "User"`)).toEqual([{ id: "someone" }]);
  });
});
