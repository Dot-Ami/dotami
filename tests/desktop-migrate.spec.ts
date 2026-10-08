/**
 * The desktop app's migrator (desktop/migrate.mjs) against Prisma itself: what it does must look,
 * to Prisma's own `migrate status`, exactly like `prisma migrate deploy` did it — and a database
 * Prisma migrated must need nothing from it. Plus the cases it exists to be safe about.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate, MigrationRefused } from "../desktop/migrate.mjs";

const root = path.resolve(__dirname, "..");
const migrations = path.join(root, "prisma", "migrations");
// Every migration folder (one holding a migration.sql), oldest first — read from disk so a new
// migration doesn't mean editing this test. Folder names start with a timestamp, so a plain sort
// is apply order.
const localNames = readdirSync(migrations, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(path.join(migrations, entry.name, "migration.sql")))
  .map((entry) => entry.name)
  .sort();

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

    // Every migration recorded the way Prisma records it — each looked up by name, not by row order.
    for (const name of localNames) {
      const [row] = query<{ checksum: string; finished_at: number | null; applied_steps_count: number }>(
        dbFile,
        `SELECT checksum, finished_at, applied_steps_count FROM "_prisma_migrations" WHERE migration_name = ?`,
        name,
      );
      expect(row.checksum).toBe(fileHash(path.join(migrations, name, "migration.sql")));
      expect(row.finished_at).toEqual(expect.any(Number));
      expect(row.applied_steps_count).toBe(1);
    }

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

describe("desktop migrator — the settings table", () => {
  const settingsMigration = localNames.find((name) => name.endsWith("_settings"));

  /** The SQL of one migration without its comment lines or blank lines, one statement per entry. */
  const statementsOf = (name: string) =>
    readFileSync(path.join(migrations, name, "migration.sql"), "utf8")
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s !== "");

  /** Runs several statements (the test's own SQL, no input from anywhere) and closes the file again. */
  const runSql = (file: string, sql: string) => {
    const db = new DatabaseSync(file);
    try {
      db["exec"](sql);
    } finally {
      db.close();
    }
  };

  it("is a plain CREATE TABLE, so nothing else in the database is rebuilt", () => {
    expect(settingsMigration, "no migration ending in _settings").toBeDefined();
    const statements = statementsOf(settingsMigration!);
    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatch(/^CREATE TABLE "Setting" \(/);
    // The desktop migrator runs with foreign keys on. A migration that copied and dropped Venture
    // (Prisma does this when it "redefines" a table) would cascade-delete every idea's figures,
    // links and map progress — so nothing here may drop, rename or alter anything.
    expect(statements[0]).not.toMatch(/\b(DROP|ALTER|RENAME|INSERT|DELETE|PRAGMA)\b/i);
  });

  it("keeps every idea's figures, links and map progress when it is applied to a database that has them", () => {
    // Everything before the settings table, as a person on the last release has it.
    const before = path.join(dir, "migrations-before-settings");
    cpSync(migrations, before, { recursive: true });
    rmSync(path.join(before, settingsMigration!), { recursive: true, force: true });
    migrate(dbFile, before);
    expect(tables(dbFile)).not.toContain("Setting");

    // node:sqlite turns foreign keys on by default, as desktop/migrate.mjs's own connection does,
    // so this is the same mode a cascading delete would fire in.
    expect(query<{ foreign_keys: number }>(dbFile, "PRAGMA foreign_keys")).toEqual([{ foreign_keys: 1 }]);

    // Two ideas, a statement, a link, map progress and figures — one of every table with a parent.
    runSql(
      dbFile,
      `
      INSERT INTO "User" (id, updatedAt) VALUES ('u1', 0);
      INSERT INTO "PersonStatement" (id, userId, text, saidAt) VALUES ('s1', 'u1', 'in my words', 0);
      INSERT INTO "Venture" (id, userId, name, type, province, targetRevenueY1, targetRevenueY3, employmentStatus, notes, updatedAt)
        VALUES ('v1', 'u1', 'First idea', 'SERVICE', 'AB', 1000, 3000, 'EMPLOYEE', 'my note', 0),
               ('v2', 'u1', 'Second idea', 'PRODUCT', 'BC', 2000, 6000, 'SELF_EMPLOYED', '', 0);
      INSERT INTO "VentureLink" (id, fromId, toId, kind, note) VALUES ('l1', 'v1', 'v2', 'SISTER', 'same customers');
      INSERT INTO "ScenarioState" (id, ventureId, activeNodeIds, completedNodeIds, ghostedNodeIds, activeBranches, updatedAt)
        VALUES ('p1', 'v1', '["a"]', '["b"]', '[]', '[]', 0);
      INSERT INTO "Figure" (id, ventureId, kind, periodStart, periodEnd, amountCents, sourceKind, sourceLabel, status)
        VALUES ('f1', 'v1', 'gross-revenue', 0, 1, 1234500, 'typed', 'typed by you', 'confirmed'),
               ('f2', 'v1', 'gross-revenue', 2, 3, -50, 'file', 'sales.xlsx', 'proposed'),
               ('f3', 'v2', 'gross-revenue', 4, 5, 99, 'typed', 'typed by you', 'retracted');
    `,
    );
    const everything = () => ({
      users: query(dbFile, `SELECT * FROM "User" ORDER BY id`),
      statements: query(dbFile, `SELECT * FROM "PersonStatement" ORDER BY id`),
      ventures: query(dbFile, `SELECT * FROM "Venture" ORDER BY id`),
      links: query(dbFile, `SELECT * FROM "VentureLink" ORDER BY id`),
      progress: query(dbFile, `SELECT * FROM "ScenarioState" ORDER BY id`),
      // The amount is read back as text so a BigInt column can't trip the comparison.
      figures: query(
        dbFile,
        `SELECT id, ventureId, kind, periodStart, periodEnd, CAST(amountCents AS TEXT) AS amount, status FROM "Figure" ORDER BY id`,
      ),
    });
    const held = everything();
    expect(held.figures).toHaveLength(3);

    // Apply the settings table (and anything newer) the way the app does.
    const { applied, backup } = migrate(dbFile, migrations, { backupDir: path.join(dir, "backups"), now: () => 7 });
    expect(applied).toContain(settingsMigration);
    expect(backup).not.toBeNull();

    // Every row is still there, unchanged, and the new table is empty and usable.
    expect(everything()).toEqual(held);
    expect(tables(dbFile)).toContain("Setting");
    expect(query(dbFile, `SELECT * FROM "Setting"`)).toEqual([]);
    runSql(
      dbFile,
      `INSERT INTO "Setting" (key, value, updatedAt) VALUES ('figure-reminders', '{"cadences":["monthly"],"ideaIds":["v1"]}', 0)`,
    );
    expect(query(dbFile, `SELECT key FROM "Setting"`)).toEqual([{ key: "figure-reminders" }]);

    // The safety copy taken first holds the same ideas and figures.
    expect(query<{ n: number }>(backup!, `SELECT count(*) AS n FROM "Figure"`)).toEqual([{ n: 3 }]);
    expect(query<{ n: number }>(backup!, `SELECT count(*) AS n FROM "Venture"`)).toEqual([{ n: 2 }]);

    // And Prisma's own referee agrees the file matches the schema.
    const status = prisma(["migrate", "status"], dbFile);
    expect(status.out).toContain("Database schema is up to date");
    expect(status.code).toBe(0);

    // Deleting an idea still cascades to its own figures, links and progress, and to nothing else:
    // the settings row keeps the idea's id (readers ignore an id that matches no idea).
    runSql(dbFile, `DELETE FROM "Venture" WHERE id = 'v1'`);
    expect(query<{ id: string }>(dbFile, `SELECT id FROM "Figure" ORDER BY id`)).toEqual([{ id: "f3" }]);
    expect(query(dbFile, `SELECT * FROM "VentureLink"`)).toEqual([]);
    expect(query(dbFile, `SELECT * FROM "ScenarioState"`)).toEqual([]);
    expect(query<{ key: string }>(dbFile, `SELECT key FROM "Setting"`)).toEqual([{ key: "figure-reminders" }]);
  }, 60_000);
});
