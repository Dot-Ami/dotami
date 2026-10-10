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

import { migrate, MigrationRefused, vacuumFile } from "../desktop/migrate.mjs";
import { CannotOpenDatabase, fileKind, openDatabase, runSql as runOn } from "../desktop/sqlite.mjs";

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

describe("desktop migrator — the settings table", () => {
  const settingsMigration = localNames.find((name) => name.endsWith("_settings"));

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

describe("desktop migrator — the expenses table", () => {
  const expensesMigration = localNames.find((name) => name.endsWith("_expenses"));

  it("is a plain CREATE TABLE and its index, so nothing else in the database is rebuilt", () => {
    expect(expensesMigration, "no migration ending in _expenses").toBeDefined();
    const statements = statementsOf(expensesMigration!);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toMatch(/^CREATE TABLE "Expense" \(/);
    expect(statements[1]).toMatch(/^CREATE INDEX "Expense_ventureId_status_idx" ON "Expense"/);
    // The desktop migrator runs with foreign keys on. A migration that copied and dropped Venture
    // (Prisma does this when it "redefines" a table) would cascade-delete every idea's figures,
    // links and map progress — so nothing here may drop, rename or alter anything.
    // ("ON DELETE CASCADE" on the new table's own link to Venture is expected; a DELETE statement is not.)
    for (const statement of statements) {
      expect(statement).toMatch(/^CREATE (TABLE|INDEX) /);
      expect(statement).not.toMatch(/\b(DROP|ALTER|RENAME|INSERT|PRAGMA)\b|\bDELETE\s+FROM\b/i);
    }
  });

  it("keeps every idea's figures, links, map progress and settings when it is applied to a database that has them", () => {
    // Everything before the expenses table, as a person on the last release has it.
    const before = path.join(dir, "migrations-before-expenses");
    cpSync(migrations, before, { recursive: true });
    // This one and every later one (a later migration may change the Expense table it creates).
    for (const name of localNames.filter((n) => n >= expensesMigration!)) {
      rmSync(path.join(before, name), { recursive: true, force: true });
    }
    migrate(dbFile, before);
    expect(tables(dbFile)).not.toContain("Expense");
    expect(query<{ foreign_keys: number }>(dbFile, "PRAGMA foreign_keys")).toEqual([{ foreign_keys: 1 }]);

    // Two ideas, a statement, a link, map progress, figures and a saved setting — one of every
    // table with a parent, with invented values.
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
      INSERT INTO "Setting" (key, value, updatedAt) VALUES ('figure-reminders', '{"cadences":["monthly"],"ideaIds":["v1"]}', 0);
    `,
    );
    const everything = () => ({
      users: query(dbFile, `SELECT * FROM "User" ORDER BY id`),
      statements: query(dbFile, `SELECT * FROM "PersonStatement" ORDER BY id`),
      ventures: query(dbFile, `SELECT * FROM "Venture" ORDER BY id`),
      links: query(dbFile, `SELECT * FROM "VentureLink" ORDER BY id`),
      progress: query(dbFile, `SELECT * FROM "ScenarioState" ORDER BY id`),
      settings: query(dbFile, `SELECT * FROM "Setting" ORDER BY key`),
      // The amount is read back as text so a BigInt column can't trip the comparison.
      figures: query(
        dbFile,
        `SELECT id, ventureId, kind, periodStart, periodEnd, CAST(amountCents AS TEXT) AS amount, status FROM "Figure" ORDER BY id`,
      ),
    });
    const held = everything();
    expect(held.figures).toHaveLength(3);

    // Apply the expenses table (and anything newer) the way the app does.
    const { applied, backup } = migrate(dbFile, migrations, { backupDir: path.join(dir, "backups"), now: () => 9 });
    expect(applied).toContain(expensesMigration);
    expect(backup).not.toBeNull();

    // Every row is still there, unchanged, and the new table is empty and usable.
    expect(everything()).toEqual(held);
    expect(tables(dbFile)).toContain("Expense");
    expect(query(dbFile, `SELECT * FROM "Expense"`)).toEqual([]);
    runSql(
      dbFile,
      `
      INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, status)
        VALUES ('e1', 'v1', 0, 4599, 'Example Stationery Ltd', 'printer paper', 'typed', 'typed by you', 'confirmed'),
               ('e2', 'v2', 1, 1200, 'Example Cafe', 'client coffee', 'typed', 'typed by you', 'proposed');
    `,
    );
    expect(query<{ id: string }>(dbFile, `SELECT id FROM "Expense" ORDER BY id`)).toEqual([{ id: "e1" }, { id: "e2" }]);
    // The defaults the schema promises, filled in by the database itself.
    expect(
      query(dbFile, `SELECT currency, editedByPerson, agreedAt, retractedAt, category, sellerAddress, vendorGstNumber FROM "Expense" WHERE id = 'e2'`),
    ).toEqual([{ currency: "CAD", editedByPerson: 0, agreedAt: null, retractedAt: null, category: null, sellerAddress: null, vendorGstNumber: null }]);

    // The safety copy taken first holds the same ideas and figures (and has no expense table yet).
    expect(query<{ n: number }>(backup!, `SELECT count(*) AS n FROM "Figure"`)).toEqual([{ n: 3 }]);
    expect(query<{ n: number }>(backup!, `SELECT count(*) AS n FROM "Venture"`)).toEqual([{ n: 2 }]);
    expect(tables(backup!)).not.toContain("Expense");

    // And Prisma's own referee agrees the file matches the schema.
    const status = prisma(["migrate", "status"], dbFile);
    expect(status.out).toContain("Database schema is up to date");
    expect(status.code).toBe(0);

    // Deleting an idea still cascades to its own figures, links and progress, and to nothing else.
    // Its expense records stay, no longer attached to an idea (the newer typed-expenses migration
    // makes that link ON DELETE SET NULL); the other idea's figure and expense, and the setting,
    // are untouched.
    runSql(dbFile, `DELETE FROM "Venture" WHERE id = 'v1'`);
    expect(query<{ id: string }>(dbFile, `SELECT id FROM "Figure" ORDER BY id`)).toEqual([{ id: "f3" }]);
    expect(query(dbFile, `SELECT id, ventureId FROM "Expense" ORDER BY id`)).toEqual([
      { id: "e1", ventureId: null },
      { id: "e2", ventureId: "v2" },
    ]);
    expect(query(dbFile, `SELECT * FROM "VentureLink"`)).toEqual([]);
    expect(query(dbFile, `SELECT * FROM "ScenarioState"`)).toEqual([]);
    expect(query<{ key: string }>(dbFile, `SELECT key FROM "Setting"`)).toEqual([{ key: "figure-reminders" }]);
  }, 60_000);
});

describe("desktop migrator — typed expenses (an optional idea, refunds, a business share)", () => {
  const typedMigration = localNames.find((name) => name.endsWith("_expenses_typed"));

  it("rebuilds the Expense table and nothing else: Venture is never copied, dropped or renamed", () => {
    expect(typedMigration, "no migration ending in _expenses_typed").toBeDefined();
    const statements = statementsOf(typedMigration!);
    // SQLite can't make a column nullable in place, so Expense alone is rebuilt: new table, copy,
    // drop, rename, its two indexes. Each statement is pinned so a regenerated file that also
    // "redefines" another table fails here.
    expect(statements).toHaveLength(6);
    expect(statements[0]).toMatch(/^CREATE TABLE "new_Expense" \(/);
    // The maintainer's decision (2026-10-08): deleting an idea keeps its expense records, "not
    // attached yet", so the idea link clears instead of cascading. A refund's link to its purchase
    // clears the same way.
    expect(statements[0]).toContain(
      'CONSTRAINT "Expense_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture" ("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    expect(statements[0]).toContain(
      'CONSTRAINT "Expense_refundOfId_fkey" FOREIGN KEY ("refundOfId") REFERENCES "Expense" ("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    expect(statements[0]).not.toMatch(/ON DELETE CASCADE/);
    expect(statements[1]).toMatch(/^INSERT INTO "new_Expense" \([^)]*\) SELECT [^;]* FROM "Expense"$/);
    expect(statements[2]).toBe('DROP TABLE "Expense"');
    expect(statements[3]).toBe('ALTER TABLE "new_Expense" RENAME TO "Expense"');
    expect(statements[4]).toMatch(/^CREATE INDEX "Expense_ventureId_status_idx" ON "Expense"/);
    expect(statements[5]).toMatch(/^CREATE INDEX "Expense_refundOfId_idx" ON "Expense"/);
    for (const statement of statements) {
      // No PRAGMA: the desktop migrator runs inside a transaction with foreign keys on, where
      // "foreign_keys=OFF" does nothing, so a file that relied on it would behave differently there.
      expect(statement).not.toMatch(/\bPRAGMA\b|\bDELETE\s+FROM\b/i);
      // Venture appears only as the parent the new table's link points at.
      expect(statement.replace(/REFERENCES "Venture"/g, "")).not.toMatch(/Venture/);
      for (const other of ["Figure", "VentureLink", "ScenarioState", "Setting", "User", "PersonStatement"]) {
        expect(statement).not.toContain(`"${other}"`);
      }
    }
  });

  it("keeps every idea, figure, link, map progress, setting and expense record, and the old records read the same", () => {
    // Everything before this migration, as a person on 0.2.1 has it.
    const before = path.join(dir, "migrations-before-typed-expenses");
    cpSync(migrations, before, { recursive: true });
    for (const name of localNames.filter((n) => n >= typedMigration!)) {
      rmSync(path.join(before, name), { recursive: true, force: true });
    }
    migrate(dbFile, before);
    expect(columns(dbFile, "Expense")).not.toContain("businessSharePercent");
    expect(query<{ foreign_keys: number }>(dbFile, "PRAGMA foreign_keys")).toEqual([{ foreign_keys: 1 }]);

    // One of everything, with invented values: two ideas, a statement, a link, map progress,
    // figures, a setting, and expense records in three states on both ideas.
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
               ('f2', 'v2', 'gross-revenue', 4, 5, 99, 'typed', 'typed by you', 'retracted');
      INSERT INTO "Setting" (key, value, updatedAt) VALUES ('figure-reminders', '{"cadences":["monthly"],"ideaIds":["v1"]}', 0);
      INSERT INTO "Expense" (id, ventureId, date, amountCents, currency, paidTo, whatFor, category, sellerAddress, vendorGstNumber, sourceKind, sourceLabel, status, editedByPerson, proposedAt, agreedAt, retractedAt)
        VALUES ('e1', 'v1', 10, 4599, 'CAD', 'Example Stationery Ltd', 'printer paper', 'Office supplies', '1 Example Street', '123456789 RT 0001', 'typed', 'typed by you', 'confirmed', 1, 11, 12, NULL),
               ('e2', 'v2', 20, 1200, 'USD', 'Example Cafe', 'client coffee', NULL, NULL, NULL, 'agent', 'an agent', 'proposed', 0, 21, NULL, NULL),
               ('e3', 'v1', 30, 99999, 'CAD', 'Example Hardware', 'a ladder', NULL, NULL, NULL, 'file', 'receipts.csv', 'retracted', 0, 31, 32, 33);
    `,
    );
    const OLD_COLUMNS = `id, ventureId, date, CAST(amountCents AS TEXT) AS amount, currency, paidTo, whatFor, category, sellerAddress,
      vendorGstNumber, sourceKind, sourceLabel, status, editedByPerson, proposedAt, agreedAt, retractedAt`;
    const everything = () => ({
      users: query(dbFile, `SELECT * FROM "User" ORDER BY id`),
      statements: query(dbFile, `SELECT * FROM "PersonStatement" ORDER BY id`),
      ventures: query(dbFile, `SELECT * FROM "Venture" ORDER BY id`),
      links: query(dbFile, `SELECT * FROM "VentureLink" ORDER BY id`),
      progress: query(dbFile, `SELECT * FROM "ScenarioState" ORDER BY id`),
      settings: query(dbFile, `SELECT * FROM "Setting" ORDER BY key`),
      figures: query(dbFile, `SELECT id, ventureId, kind, CAST(amountCents AS TEXT) AS amount, status FROM "Figure" ORDER BY id`),
      expenses: query(dbFile, `SELECT ${OLD_COLUMNS} FROM "Expense" ORDER BY id`),
    });
    const held = everything();
    expect(held.expenses).toHaveLength(3);
    expect(held.figures).toHaveLength(2);

    // Apply it the way the app does: one transaction, foreign keys on, a safety copy first.
    const { applied, backup } = migrate(dbFile, migrations, { backupDir: path.join(dir, "backups"), now: () => 11 });
    // This one and every later one (the bank and card accounts and receipts tables sort after it).
    expect(applied).toEqual(localNames.filter((n) => n >= typedMigration!));
    expect(backup).not.toBeNull();

    // Every row of every table is still there and unchanged.
    expect(everything()).toEqual(held);
    expect(query<{ foreign_keys: number }>(dbFile, "PRAGMA foreign_keys")).toEqual([{ foreign_keys: 1 }]);
    // The old records gain the new fields empty: a plain expense, no share, no refund link.
    expect(
      query(dbFile, `SELECT id, recordKind, refundOfId, gstHstCents, creditNote, businessSharePercent FROM "Expense" ORDER BY id`),
    ).toEqual(
      ["e1", "e2", "e3"].map((id) => ({ id, recordKind: "expense", refundOfId: null, gstHstCents: null, creditNote: null, businessSharePercent: null })),
    );
    // The database's own consistency checks agree.
    expect(query(dbFile, "PRAGMA foreign_key_check")).toEqual([]);
    expect(query(dbFile, "PRAGMA integrity_check")).toEqual([{ integrity_check: "ok" }]);

    // Prisma's own referee agrees the file matches the schema.
    const status = prisma(["migrate", "status"], dbFile);
    expect(status.out).toContain("Database schema is up to date");
    expect(status.code).toBe(0);

    // What the change is for: a record not attached to any idea, and a refund linked to its expense.
    runSql(
      dbFile,
      `
      INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, businessSharePercent)
        VALUES ('e4', NULL, 40, 5000, 'Example Phone Co', 'phone bill', 'typed', 'typed by you', 40);
      INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, recordKind, refundOfId, gstHstCents, creditNote)
        VALUES ('r1', 'v1', 50, 1000, 'Example Stationery Ltd', 'returned paper', 'typed', 'typed by you', 'refund', 'e1', 50, 'CN-1');
    `,
    );
    expect(query(dbFile, `SELECT ventureId, businessSharePercent FROM "Expense" WHERE id = 'e4'`)).toEqual([{ ventureId: null, businessSharePercent: 40 }]);
    // A refund kept as a negative amount, on the other idea, linked to the first idea's purchase too.
    runSql(
      dbFile,
      `INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, recordKind, refundOfId)
        VALUES ('r2', 'v2', 60, -500, 'Example Stationery Ltd', 'price adjustment', 'typed', 'typed by you', 'expense', 'e1')`,
    );

    // What the database itself says about the two links, read from the rebuilt table.
    const links = query<{ table: string; from: string; on_delete: string }>(dbFile, `PRAGMA foreign_key_list("Expense")`)
      .map((k) => ({ table: k.table, from: k.from, on_delete: k.on_delete }))
      .sort((a, b) => a.from.localeCompare(b.from));
    expect(links).toEqual([
      { table: "Expense", from: "refundOfId", on_delete: "SET NULL" },
      { table: "Venture", from: "ventureId", on_delete: "SET NULL" },
    ]);

    // Deleting an idea (the maintainer's decision of 2026-10-08): its figures, links and map
    // progress go with it, and nothing of the other idea's. Its expense records STAY, every field as
    // it was, now "not attached yet"; the refund links between records still hold.
    const expenseRows = () =>
      query(dbFile, `SELECT id, ventureId, CAST(amountCents AS TEXT) AS amount, status, recordKind, refundOfId, creditNote FROM "Expense" ORDER BY id`);
    const beforeDelete = expenseRows() as { id: string; ventureId: string | null }[];
    expect(beforeDelete.filter((r) => r.ventureId === "v1").map((r) => r.id)).toEqual(["e1", "e3", "r1"]);
    runSql(dbFile, `DELETE FROM "Venture" WHERE id = 'v1'`);
    expect(query<{ id: string }>(dbFile, `SELECT id FROM "Venture" ORDER BY id`)).toEqual([{ id: "v2" }]);
    expect(query<{ id: string }>(dbFile, `SELECT id FROM "Figure" ORDER BY id`)).toEqual([{ id: "f2" }]);
    expect(expenseRows()).toEqual(beforeDelete.map((r) => (r.ventureId === "v1" ? { ...r, ventureId: null } : r)));
    expect(query(dbFile, `SELECT id, refundOfId FROM "Expense" WHERE refundOfId IS NOT NULL ORDER BY id`)).toEqual([
      { id: "r1", refundOfId: "e1" },
      { id: "r2", refundOfId: "e1" },
    ]);
    expect(query(dbFile, `SELECT * FROM "VentureLink"`)).toEqual([]);
    expect(query(dbFile, `SELECT * FROM "ScenarioState"`)).toEqual([]);
    expect(query<{ key: string }>(dbFile, `SELECT key FROM "Setting"`)).toEqual([{ key: "figure-reminders" }]);
    expect(query(dbFile, `SELECT id, text FROM "PersonStatement"`)).toEqual([{ id: "s1", text: "in my words" }]);
    expect(query(dbFile, "PRAGMA foreign_key_check")).toEqual([]);
  }, 60_000);

  it("deleting an expense keeps a refund that points at it, with the link cleared (a delete of every record still works)", () => {
    migrate(dbFile, migrations);
    runSql(
      dbFile,
      `
      INSERT INTO "User" (id, updatedAt) VALUES ('u1', 0);
      INSERT INTO "Venture" (id, userId, name, type, province, targetRevenueY1, targetRevenueY3, employmentStatus, notes, updatedAt)
        VALUES ('v1', 'u1', 'First idea', 'SERVICE', 'AB', 1000, 3000, 'EMPLOYEE', '', 0);
      INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel)
        VALUES ('e1', 'v1', 10, 4599, 'Example Stationery Ltd', 'printer paper', 'typed', 'typed by you');
      INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, recordKind, refundOfId)
        VALUES ('r1', NULL, 20, 1000, 'Example Stationery Ltd', 'returned paper', 'typed', 'typed by you', 'refund', 'e1');
    `,
    );
    runSql(dbFile, `DELETE FROM "Expense" WHERE id = 'e1'`);
    expect(query(dbFile, `SELECT id, recordKind, refundOfId FROM "Expense"`)).toEqual([{ id: "r1", recordKind: "refund", refundOfId: null }]);
    // And one statement that deletes every record (what a "delete all expense records" choice would run).
    runSql(
      dbFile,
      `INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, recordKind, refundOfId)
        VALUES ('e2', 'v1', 10, 500, 'Example Cafe', 'coffee', 'typed', 'typed by you', 'expense', NULL),
               ('r2', 'v1', 11, 100, 'Example Cafe', 'coffee refund', 'typed', 'typed by you', 'refund', 'e2')`,
    );
    runSql(dbFile, `DELETE FROM "Expense"`);
    expect(query(dbFile, `SELECT * FROM "Expense"`)).toEqual([]);
    expect(query<{ n: number }>(dbFile, `SELECT count(*) AS n FROM "Venture"`)).toEqual([{ n: 1 }]);
  });
});

describe("desktop migrator — the bank and card accounts table", () => {
  const accountsMigration = localNames.find((name) => name.endsWith("_source_accounts"));

  it("is one plain CREATE TABLE with no link to anything, so nothing else in the database is rebuilt", () => {
    expect(accountsMigration, "no migration ending in _source_accounts").toBeDefined();
    const statements = statementsOf(accountsMigration!);
    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatch(/^CREATE TABLE "SourceAccount" \(/);
    // Nothing links to it and it links to nothing yet: a later link INTO this table must be
    // hand-written SQL with its own test (the migrator runs with foreign keys on).
    expect(statements[0]).not.toMatch(/\b(FOREIGN KEY|REFERENCES)\b/i);
    expect(statements[0]).not.toMatch(/\b(DROP|ALTER|RENAME|INSERT|PRAGMA)\b|\bDELETE\s+FROM\b/i);
    // No column for a number of any kind, and no hash of one: the person's name for the account, the button, the dates.
    expect(statements[0]).not.toMatch(/number|acct|hash|digits|institution|transit|branch/i);
  });

  it("keeps every idea, figure, expense record, link, map progress and setting when it is applied to a database that has them", () => {
    // Everything before the accounts table, as a person on the last release has it.
    const before = path.join(dir, "migrations-before-source-accounts");
    cpSync(migrations, before, { recursive: true });
    rmSync(path.join(before, accountsMigration!), { recursive: true, force: true });
    migrate(dbFile, before);
    expect(tables(dbFile)).not.toContain("SourceAccount");
    expect(query<{ foreign_keys: number }>(dbFile, "PRAGMA foreign_keys")).toEqual([{ foreign_keys: 1 }]);

    // One of every table, with invented values.
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
               ('f2', 'v2', 'gross-revenue', 4, 5, 99, 'typed', 'typed by you', 'retracted');
      INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, status)
        VALUES ('e1', 'v1', 0, 4599, 'Example Stationery Ltd', 'printer paper', 'typed', 'typed by you', 'confirmed');
      INSERT INTO "Setting" (key, value, updatedAt) VALUES ('figure-reminders', '{"cadences":["monthly"],"ideaIds":["v1"]}', 0);
    `,
    );
    const everything = () => ({
      users: query(dbFile, `SELECT * FROM "User" ORDER BY id`),
      statements: query(dbFile, `SELECT * FROM "PersonStatement" ORDER BY id`),
      ventures: query(dbFile, `SELECT * FROM "Venture" ORDER BY id`),
      links: query(dbFile, `SELECT * FROM "VentureLink" ORDER BY id`),
      progress: query(dbFile, `SELECT * FROM "ScenarioState" ORDER BY id`),
      settings: query(dbFile, `SELECT * FROM "Setting" ORDER BY key`),
      figures: query(dbFile, `SELECT id, ventureId, CAST(amountCents AS TEXT) AS amount, status FROM "Figure" ORDER BY id`),
      expenses: query(dbFile, `SELECT id, ventureId, CAST(amountCents AS TEXT) AS amount, paidTo, status FROM "Expense" ORDER BY id`),
    });
    const held = everything();
    expect(held.figures).toHaveLength(2);
    expect(held.expenses).toHaveLength(1);

    // Apply the accounts table (and anything newer) the way the app does.
    const { applied, backup } = migrate(dbFile, migrations, { backupDir: path.join(dir, "backups"), now: () => 9 });
    expect(applied).toContain(accountsMigration);
    expect(backup).not.toBeNull();

    // Every row is still there, unchanged, and the new table is empty and usable.
    expect(everything()).toEqual(held);
    expect(tables(dbFile)).toContain("SourceAccount");
    expect(columns(dbFile, "SourceAccount")).toEqual(["id", "name", "allowance", "agreedAt", "retiredAt", "createdAt"]);
    expect(query(dbFile, `SELECT * FROM "SourceAccount"`)).toEqual([]);
    runSql(dbFile, `INSERT INTO "SourceAccount" (id, name, allowance, agreedAt) VALUES ('a1', 'Visa ending 1234', 'always', 0);`);
    expect(query(dbFile, `SELECT id, name, allowance, retiredAt FROM "SourceAccount"`)).toEqual([
      { id: "a1", name: "Visa ending 1234", allowance: "always", retiredAt: null },
    ]);
    expect(tables(backup!)).not.toContain("SourceAccount");

    // Prisma's own referee agrees the file matches the schema.
    const status = prisma(["migrate", "status"], dbFile);
    expect(status.out).toContain("Database schema is up to date");
    expect(status.code).toBe(0);

    // Deleting an idea still cascades to its own rows only, and never to the accounts, which belong to no idea.
    // Its expense record stays, no longer attached to an idea (the typed-expenses migration makes that
    // link ON DELETE SET NULL).
    runSql(dbFile, `DELETE FROM "Venture" WHERE id = 'v1'`);
    expect(query<{ id: string }>(dbFile, `SELECT id FROM "Figure" ORDER BY id`)).toEqual([{ id: "f2" }]);
    expect(query(dbFile, `SELECT id, ventureId FROM "Expense"`)).toEqual([{ id: "e1", ventureId: null }]);
    expect(query<{ id: string }>(dbFile, `SELECT id FROM "SourceAccount"`)).toEqual([{ id: "a1" }]);
    expect(query<{ key: string }>(dbFile, `SELECT key FROM "Setting"`)).toEqual([{ key: "figure-reminders" }]);
  }, 60_000);
});

describe("desktop migrator — receipts (a table describing each receipt file)", () => {
  const receiptsMigration = localNames.find((name) => name.endsWith("_receipts"));

  it("is a plain CREATE TABLE and its unique index, so nothing else in the database is rebuilt", () => {
    expect(receiptsMigration, "no migration ending in _receipts").toBeDefined();
    const statements = statementsOf(receiptsMigration!);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toMatch(/^CREATE TABLE "Receipt" \(/);
    // Deleting a record deletes its receipt's row; nothing else points at Receipt.
    expect(statements[0]).toContain(
      'CONSTRAINT "Receipt_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    expect(statements[1]).toBe('CREATE UNIQUE INDEX "Receipt_expenseId_key" ON "Receipt"("expenseId")');
    for (const statement of statements) {
      // With foreign keys on (the desktop migrator), copying and dropping a table would cascade: so
      // nothing here may drop, rename, alter or fill anything.
      expect(statement).toMatch(/^CREATE (TABLE|UNIQUE INDEX) /);
      expect(statement).not.toMatch(/\b(DROP|ALTER|RENAME|INSERT|PRAGMA)\b|\bDELETE\s+FROM\b/i);
      for (const other of ["Venture", "Figure", "VentureLink", "ScenarioState", "Setting", "User", "PersonStatement"]) {
        expect(statement).not.toContain(`"${other}"`);
      }
    }
  });

  it("keeps every idea, figure, link, map progress, setting and expense record when applied to a database that has them", () => {
    // Everything before the receipts table, as a person on the typed-expenses version has it.
    const before = path.join(dir, "migrations-before-receipts");
    cpSync(migrations, before, { recursive: true });
    for (const name of localNames.filter((n) => n >= receiptsMigration!)) {
      rmSync(path.join(before, name), { recursive: true, force: true });
    }
    migrate(dbFile, before);
    expect(tables(dbFile)).not.toContain("Receipt");
    expect(query<{ foreign_keys: number }>(dbFile, "PRAGMA foreign_keys")).toEqual([{ foreign_keys: 1 }]);

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
        VALUES ('f1', 'v1', 'gross-revenue', 0, 1, 1234500, 'typed', 'typed by you', 'confirmed');
      INSERT INTO "Setting" (key, value, updatedAt) VALUES ('figure-reminders', '{"cadences":["monthly"],"ideaIds":["v1"]}', 0);
      INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, status, businessSharePercent)
        VALUES ('e1', 'v1', 10, 4599, 'Example Stationery Ltd', 'printer paper', 'typed', 'typed by you', 'confirmed', 40),
               ('e2', NULL, 20, 1200, 'Example Cafe', 'client coffee', 'agent', 'an agent', 'proposed', NULL);
      INSERT INTO "Expense" (id, ventureId, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, recordKind, refundOfId)
        VALUES ('r1', 'v1', 30, 1000, 'Example Stationery Ltd', 'returned paper', 'typed', 'typed by you', 'refund', 'e1');
    `,
    );
    const everything = () => ({
      users: query(dbFile, `SELECT * FROM "User" ORDER BY id`),
      statements: query(dbFile, `SELECT * FROM "PersonStatement" ORDER BY id`),
      ventures: query(dbFile, `SELECT * FROM "Venture" ORDER BY id`),
      links: query(dbFile, `SELECT * FROM "VentureLink" ORDER BY id`),
      progress: query(dbFile, `SELECT * FROM "ScenarioState" ORDER BY id`),
      settings: query(dbFile, `SELECT * FROM "Setting" ORDER BY key`),
      figures: query(dbFile, `SELECT id, ventureId, kind, CAST(amountCents AS TEXT) AS amount, status FROM "Figure" ORDER BY id`),
      expenses: query(
        dbFile,
        `SELECT id, ventureId, date, CAST(amountCents AS TEXT) AS amount, paidTo, whatFor, status, recordKind, refundOfId, businessSharePercent FROM "Expense" ORDER BY id`,
      ),
    });
    const held = everything();
    expect(held.expenses).toHaveLength(3);

    // Apply it the way the app does: one transaction, foreign keys on, a safety copy first.
    const { applied, backup } = migrate(dbFile, migrations, { backupDir: path.join(dir, "backups"), now: () => 12 });
    expect(applied).toEqual([receiptsMigration]);
    expect(backup).not.toBeNull();
    expect(everything()).toEqual(held);
    expect(query(dbFile, `SELECT * FROM "Receipt"`)).toEqual([]);
    expect(query(dbFile, "PRAGMA foreign_key_check")).toEqual([]);
    expect(query(dbFile, "PRAGMA integrity_check")).toEqual([{ integrity_check: "ok" }]);
    const status = prisma(["migrate", "status"], dbFile);
    expect(status.out).toContain("Database schema is up to date");
    expect(status.code).toBe(0);

    // What the table is for: one receipt per record, and a second one for the same record refused.
    const sha = "a".repeat(64);
    runSql(
      dbFile,
      `INSERT INTO "Receipt" (id, expenseId, type, bytes, sha256) VALUES ('${"1".repeat(32)}', 'e1', 'image/jpeg', 1234, '${sha}'),
                                                                     ('${"2".repeat(32)}', 'e2', 'application/pdf', 99, '${sha}')`,
    );
    expect(() => runSql(dbFile, `INSERT INTO "Receipt" (id, expenseId, type, bytes, sha256) VALUES ('${"3".repeat(32)}', 'e1', 'image/png', 1, '${sha}')`)).toThrow(
      /UNIQUE/,
    );

    // Deleting an idea keeps its expense records "not attached yet" (the maintainer's decision of
    // 2026-10-08), and so their receipts stay too.
    runSql(dbFile, `DELETE FROM "Venture" WHERE id = 'v1'`);
    expect(query(dbFile, `SELECT id, ventureId FROM "Expense" ORDER BY id`)).toEqual([
      { id: "e1", ventureId: null },
      { id: "e2", ventureId: null },
      { id: "r1", ventureId: null },
    ]);
    expect(query(dbFile, `SELECT expenseId FROM "Receipt" ORDER BY expenseId`)).toEqual([{ expenseId: "e1" }, { expenseId: "e2" }]);
    // Deleting a record deletes its receipt's row (DotAmi's sweep removes the file); the refund that
    // pointed at it stays, its link cleared, as before.
    runSql(dbFile, `DELETE FROM "Expense" WHERE id = 'e1'`);
    expect(query(dbFile, `SELECT expenseId FROM "Receipt"`)).toEqual([{ expenseId: "e2" }]);
    expect(query(dbFile, `SELECT id, refundOfId FROM "Expense" WHERE id = 'r1'`)).toEqual([{ id: "r1", refundOfId: null }]);
    // Deleting every record (the Delete menu's expense records box) empties the table.
    runSql(dbFile, `DELETE FROM "Expense"`);
    expect(query(dbFile, `SELECT * FROM "Receipt"`)).toEqual([]);
    expect(query<{ n: number }>(dbFile, `SELECT count(*) AS n FROM "Figure"`)).toEqual([{ n: 0 }]);
    expect(query<{ n: number }>(dbFile, `SELECT count(*) AS n FROM "Venture"`)).toEqual([{ n: 1 }]);
    expect(query(dbFile, "PRAGMA foreign_key_check")).toEqual([]);
  }, 60_000);
});

/**
 * [8i] The migrator on an encrypted data file (docs/architecture/database-encryption.md § 5). Prisma's own
 * referee can't open an encrypted file, so the comparison with `migrate status` above keeps running on a
 * plain one (the migrator works the same with or without a key); these check the rest through the key.
 */
describe("desktop migrator — on an encrypted data file ([8i])", () => {
  const KEY = Buffer.alloc(32, 0x6b);
  const MARKER = "zq-migrate-encrypted-marker-3307";
  const withKey = <T>(file: string, read: (db: ReturnType<typeof openDatabase>) => T): T => {
    const db = openDatabase(file, { key: KEY, fileMustExist: true });
    try {
      return read(db);
    } finally {
      db.close();
    }
  };

  it("creates a new data file encrypted from its first byte, and applies every migration", () => {
    expect(migrate(dbFile, migrations, { key: KEY }).applied).toEqual(localNames);
    expect(fileKind(dbFile)).toBe("encrypted");
    expect(() => openDatabase(dbFile, { readonly: true })).toThrow(CannotOpenDatabase);
    expect(withKey(dbFile, (db) => db.prepare(`SELECT migration_name FROM "_prisma_migrations" ORDER BY migration_name`).all())).toEqual(
      localNames.map((migration_name) => ({ migration_name })),
    );
    // The next start has nothing to do.
    expect(migrate(dbFile, migrations, { key: KEY })).toEqual({ applied: [], backup: null });
  });

  it("applies an update to an encrypted file, keeps every idea's children, and its safety copy is encrypted with the same key", () => {
    const latest = localNames[localNames.length - 1];
    const before = path.join(dir, "migrations-before-latest");
    cpSync(migrations, before, { recursive: true });
    rmSync(path.join(before, latest), { recursive: true, force: true });
    migrate(dbFile, before, { key: KEY });
    withKey(dbFile, (db) =>
      runOn(
        db,
        `
        INSERT INTO "User" (id, updatedAt) VALUES ('u1', 0);
        INSERT INTO "PersonStatement" (id, userId, text, saidAt) VALUES ('s1', 'u1', 'statement ${MARKER}', 0);
        INSERT INTO "Venture" (id, userId, name, type, province, targetRevenueY1, targetRevenueY3, employmentStatus, notes, updatedAt)
          VALUES ('v1', 'u1', 'First idea', 'SERVICE', 'AB', 1000, 3000, 'EMPLOYEE', 'note ${MARKER}', 0),
                 ('v2', 'u1', 'Second idea', 'PRODUCT', 'BC', 2000, 6000, 'SELF_EMPLOYED', '', 0);
        INSERT INTO "VentureLink" (id, fromId, toId, kind, note) VALUES ('l1', 'v1', 'v2', 'SISTER', 'same customers');
        INSERT INTO "ScenarioState" (id, ventureId, activeNodeIds, completedNodeIds, ghostedNodeIds, activeBranches, updatedAt)
          VALUES ('p1', 'v1', '["a"]', '["b"]', '[]', '[]', 0);
        INSERT INTO "Figure" (id, ventureId, kind, periodStart, periodEnd, amountCents, sourceKind, sourceLabel, status)
          VALUES ('f1', 'v1', 'gross-revenue', 0, 1, 1234500, 'typed', 'typed by you', 'confirmed');
      `,
      ),
    );
    const everything = () =>
      withKey(dbFile, (db) => ({
        statements: db.prepare(`SELECT * FROM "PersonStatement" ORDER BY id`).all(),
        ventures: db.prepare(`SELECT * FROM "Venture" ORDER BY id`).all(),
        links: db.prepare(`SELECT * FROM "VentureLink" ORDER BY id`).all(),
        progress: db.prepare(`SELECT * FROM "ScenarioState" ORDER BY id`).all(),
        figures: db.prepare(`SELECT id, ventureId, CAST(amountCents AS TEXT) AS amount FROM "Figure" ORDER BY id`).all(),
      }));
    const held = everything();

    const { applied, backup } = migrate(dbFile, migrations, { key: KEY, backupDir: path.join(dir, "backups"), now: () => 9 });
    expect(applied).toEqual([latest]);
    expect(everything()).toEqual(held);
    expect(withKey(dbFile, (db) => db.prepare("PRAGMA foreign_key_check").all())).toEqual([]);

    // The safety copy before the update: encrypted, the words not in its bytes, and whole with the key.
    expect(fileKind(backup!)).toBe("encrypted");
    expect(readFileSync(backup!).includes(Buffer.from(MARKER))).toBe(false);
    expect(withKey(backup!, (db) => db.prepare(`SELECT count(*) AS n FROM "Venture"`).get())).toEqual({ n: 2 });
    // The control: the same words are in a plain file's bytes.
    const plain = path.join(dir, "plain.db");
    migrate(plain, before);
    runSql(plain, `INSERT INTO "User" (id, updatedAt) VALUES ('u1', 0); INSERT INTO "PersonStatement" (id, userId, text, saidAt) VALUES ('s1', 'u1', 'statement ${MARKER}', 0);`);
    expect(readFileSync(plain).includes(Buffer.from(MARKER))).toBe(true);
  });

  it("without the key it refuses and changes nothing; Delete's owed wipe runs with it", () => {
    migrate(dbFile, migrations, { key: KEY });
    const was = fileHash(dbFile);
    expect(() => migrate(dbFile, migrations)).toThrow(CannotOpenDatabase);
    expect(() => vacuumFile(dbFile)).toThrow(CannotOpenDatabase);
    expect(fileHash(dbFile)).toBe(was);
    expect(vacuumFile(dbFile, KEY)).toBe(true);
  });
});
