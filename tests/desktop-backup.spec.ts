/**
 * The desktop app's backups (desktop/backup.mjs): a backup restores to the same data, on a new
 * computer too; a locked one stays unreadable without the passphrase; and every kind of bad file
 * is refused, with the live database left exactly as it was.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyRestore, BackupError, prepareRestore, readBackup, writeBackup } from "../desktop/backup.mjs";
import { migrate } from "../desktop/migrate.mjs";

const migrations = path.join(path.resolve(__dirname, ".."), "prisma", "migrations");
const PASSPHRASE = "correct horse";
const MAGIC_BYTES = 14;

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-backup-test-"));
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

/** A real, migrated database holding one User row. */
function makeDb(file: string, userId = "someone"): string {
  mkdirSync(path.dirname(file), { recursive: true });
  migrate(file, migrations);
  query(file, `INSERT INTO "User" (id, updatedAt) VALUES (?, 0) RETURNING id`, userId);
  return file;
}

const users = (file: string) => query<{ id: string }>(file, `SELECT id FROM "User" ORDER BY id`).map((r) => r.id);
const fileHash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Every file under a folder, so a test can prove nothing was left behind. */
function allFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? allFiles(path.join(folder, e.name)) : [path.join(folder, e.name)],
  );
}

/** Splits a backup file into its parts, lets the test change them, and puts it back together. */
function rewriteHeader(file: string, change: (header: Record<string, unknown>) => void) {
  const bytes = readFileSync(file);
  const headerEnd = MAGIC_BYTES + 4 + bytes.readUInt32BE(MAGIC_BYTES);
  const header = JSON.parse(bytes.toString("utf8", MAGIC_BYTES + 4, headerEnd));
  change(header);
  const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(headerBytes.length);
  writeFileSync(file, Buffer.concat([bytes.subarray(0, MAGIC_BYTES), length, headerBytes, bytes.subarray(headerEnd)]));
}

function flipLastByte(file: string) {
  const bytes = readFileSync(file);
  bytes[bytes.length - 1] ^= 0xff;
  writeFileSync(file, bytes);
}

/** The BackupError kind a call throws, or "no error" so a missing refusal fails the comparison. */
function kindOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof BackupError ? error.kind : `other error: ${(error as Error).message}`;
  }
  return "no error";
}

describe("desktop backup — round trips", () => {
  it("restores a plain backup onto a new computer", () => {
    const backup = path.join(dir, "plain.dotami-backup");
    const info = writeBackup(makeDb(path.join(dir, "old", "dotami.db")), backup, { appVersion: "1.2.3" });
    expect(info.encrypted).toBe(false);
    // Every migration the app ships — read from the folder, so a new migration doesn't break this.
    const shipped = readdirSync(migrations, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(path.join(migrations, d.name, "migration.sql")))
      .map((d) => d.name)
      .sort();
    expect(shipped.length).toBeGreaterThan(0);
    expect(info.migrations).toEqual(shipped);
    expect(info.bytes).toBe(readFileSync(backup).length);

    const staging = path.join(dir, "new", "dotami.db.restoring");
    const { header } = prepareRestore(backup, { migrationsDir: migrations, stagingFile: staging });
    expect(header.appVersion).toBe("1.2.3");

    const target = path.join(dir, "new", "dotami.db");
    expect(applyRestore(staging, target, { backupDir: path.join(dir, "new", "backups") })).toEqual({ safetyCopy: null, receiptsMovedTo: null });
    expect(users(target)).toEqual(["someone"]);
    expect(existsSync(staging)).toBe(false);
  });

  it("restores a locked backup with its passphrase, and keeps the data unreadable without it", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"));
    const plain = path.join(dir, "plain.dotami-backup");
    const locked = path.join(dir, "locked.dotami-backup");
    writeBackup(source, plain, { appVersion: "1.2.3" });
    const info = writeBackup(source, locked, { appVersion: "1.2.3", passphrase: PASSPHRASE });
    expect(info.encrypted).toBe(true);

    // The row's text sits in the plain backup and nowhere in the locked one.
    expect(readFileSync(plain).indexOf("someone")).toBeGreaterThan(-1);
    expect(readFileSync(locked).indexOf("someone")).toBe(-1);

    const staging = path.join(dir, "new", "dotami.db.restoring");
    prepareRestore(locked, { passphrase: PASSPHRASE, migrationsDir: migrations, stagingFile: staging });
    const target = path.join(dir, "new", "dotami.db");
    applyRestore(staging, target, { backupDir: path.join(dir, "new", "backups") });
    expect(users(target)).toEqual(["someone"]);
  }, 60_000);
});

describe("desktop backup — locked backups", () => {
  it("asks for the passphrase, and refuses a wrong one, without leaving anything behind", () => {
    const locked = path.join(dir, "locked.dotami-backup");
    writeBackup(makeDb(path.join(dir, "dotami.db")), locked, { appVersion: "1", passphrase: PASSPHRASE });
    const staging = path.join(dir, "staging.db");

    expect(kindOf(() => prepareRestore(locked, { migrationsDir: migrations, stagingFile: staging }))).toBe("needs-passphrase");
    expect(existsSync(staging)).toBe(false);
    expect(kindOf(() => prepareRestore(locked, { passphrase: "wrong", migrationsDir: migrations, stagingFile: staging }))).toBe(
      "cannot-decrypt",
    );
    expect(existsSync(staging)).toBe(false);
  }, 60_000);

  it("refuses a locked backup with one flipped byte, or an edited header", () => {
    const locked = path.join(dir, "locked.dotami-backup");
    writeBackup(makeDb(path.join(dir, "dotami.db")), locked, { appVersion: "1", passphrase: PASSPHRASE });
    const flipped = path.join(dir, "flipped.dotami-backup");
    const edited = path.join(dir, "edited.dotami-backup");
    writeFileSync(flipped, readFileSync(locked));
    writeFileSync(edited, readFileSync(locked));
    flipLastByte(flipped);
    rewriteHeader(edited, (header) => {
      header.appVersion = "9.9.9";
    });

    expect(kindOf(() => readBackup(flipped, { passphrase: PASSPHRASE }))).toBe("cannot-decrypt");
    expect(kindOf(() => readBackup(edited, { passphrase: PASSPHRASE }))).toBe("cannot-decrypt");
    // The untouched original still opens, so the two refusals above are about the changes.
    expect(readBackup(locked, { passphrase: PASSPHRASE }).header.appVersion).toBe("1");
  }, 60_000);
});

describe("desktop backup — damaged and foreign files", () => {
  it("refuses a plain backup that was cut short or had a byte changed", () => {
    const backup = path.join(dir, "plain.dotami-backup");
    writeBackup(makeDb(path.join(dir, "dotami.db")), backup, { appVersion: "1" });
    const cut = path.join(dir, "cut.dotami-backup");
    const flipped = path.join(dir, "flipped.dotami-backup");
    const original = readFileSync(backup);
    writeFileSync(cut, original.subarray(0, original.length - 100));
    writeFileSync(flipped, original);
    flipLastByte(flipped);

    expect(kindOf(() => readBackup(cut))).toBe("damaged");
    expect(kindOf(() => readBackup(flipped))).toBe("damaged");
    expect(readBackup(backup).db.length).toBeGreaterThan(0);
  });

  it("refuses files that aren't backups: random bytes, a raw database, an empty file", () => {
    const random = path.join(dir, "random.bin");
    const empty = path.join(dir, "empty.dotami-backup");
    writeFileSync(random, Buffer.from(Array.from({ length: 1024 }, (_, i) => (i * 131 + 7) % 256)));
    writeFileSync(empty, "");
    const rawDb = makeDb(path.join(dir, "dotami.db"));

    for (const file of [random, rawDb, empty]) expect(kindOf(() => readBackup(file))).toBe("not-a-backup");
    expect(() => readBackup(random)).toThrow("This file isn't a DotAmi backup.");
  });
});

describe("desktop backup — restoring safely", () => {
  it("refuses a backup from a newer DotAmi and leaves the live database exactly as it was", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"));
    query(
      source,
      `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, started_at, applied_steps_count) VALUES ('x', 'y', '29990101000000_from_the_future', 1, 1, 1) RETURNING id`,
    );
    const backup = path.join(dir, "future.dotami-backup");
    writeBackup(source, backup, { appVersion: "9.0.0" });

    const live = makeDb(path.join(dir, "live", "dotami.db"), "keep-me");
    const before = fileHash(live);
    const staging = path.join(dir, "live", "dotami.db.restoring");
    const run = () => prepareRestore(backup, { migrationsDir: migrations, stagingFile: staging });

    expect(kindOf(run)).toBe("newer-app");
    expect(() => run()).toThrow(/newer version of DotAmi/);
    expect(existsSync(staging)).toBe(false);
    expect(fileHash(live)).toBe(before);
  });

  it("keeps a safety copy of the data it replaces, and leaves no half-finished files", () => {
    const backup = path.join(dir, "mine.dotami-backup");
    writeBackup(makeDb(path.join(dir, "old", "dotami.db"), "from-backup"), backup, { appVersion: "1" });

    const live = makeDb(path.join(dir, "live", "dotami.db"), "from-live");
    const backupDir = path.join(dir, "live", "backups");
    const staging = path.join(dir, "live", "dotami.db.restoring");
    prepareRestore(backup, { migrationsDir: migrations, stagingFile: staging });
    const { safetyCopy } = applyRestore(staging, live, { backupDir, now: () => 42 });

    expect(safetyCopy).toBe(path.join(backupDir, "dotami-before-restore-42.db"));
    expect(users(safetyCopy!)).toEqual(["from-live"]);
    expect(users(live)).toEqual(["from-backup"]);
    expect(allFiles(dir).filter((f) => f.endsWith(".partial"))).toEqual([]);
  });

  it("moves the receipts folder into the backups folder whole, so a restore can never lose a receipt file", () => {
    // A backup of this kind holds the data file only. The restored data file doesn't describe the
    // receipt files beside the live one, so DotAmi's sweep would remove them if they stayed.
    const backup = path.join(dir, "mine.dotami-backup");
    writeBackup(makeDb(path.join(dir, "old", "dotami.db"), "from-backup"), backup, { appVersion: "1" });
    const live = makeDb(path.join(dir, "live", "dotami.db"), "from-live");
    const receipts = path.join(dir, "live", "receipts");
    mkdirSync(receipts);
    writeFileSync(path.join(receipts, `${"a".repeat(32)}.pdf`), "%PDF-1.4 a receipt");
    const backupDir = path.join(dir, "live", "backups");
    const staging = path.join(dir, "live", "dotami.db.restoring");
    prepareRestore(backup, { migrationsDir: migrations, stagingFile: staging });

    const { receiptsMovedTo } = applyRestore(staging, live, { backupDir, now: () => 43 });
    expect(receiptsMovedTo).toBe(path.join(backupDir, "receipts-before-restore-43"));
    expect(existsSync(receipts)).toBe(false);
    expect(readFileSync(path.join(receiptsMovedTo!, `${"a".repeat(32)}.pdf`), "utf8")).toBe("%PDF-1.4 a receipt");
    expect(users(live)).toEqual(["from-backup"]);
  });

  it("puts the receipts folder back when the data file can't be swapped", () => {
    const live = makeDb(path.join(dir, "live", "dotami.db"), "from-live");
    const receipts = path.join(dir, "live", "receipts");
    mkdirSync(receipts);
    writeFileSync(path.join(receipts, `${"b".repeat(32)}.png`), "a picture");
    // A staging file that isn't there makes the final swap fail.
    const missing = path.join(dir, "live", "nothing-staged.db");
    expect(() => applyRestore(missing, live, { backupDir: path.join(dir, "live", "backups"), now: () => 44 })).toThrow();
    expect(readFileSync(path.join(receipts, `${"b".repeat(32)}.png`), "utf8")).toBe("a picture");
    expect(existsSync(path.join(dir, "live", "backups", "receipts-before-restore-44"))).toBe(false);
    expect(users(live)).toEqual(["from-live"]);
  });

  it("never leaves a .partial file beside a finished backup", () => {
    const out = path.join(dir, "out.dotami-backup");
    writeBackup(makeDb(path.join(dir, "dotami.db")), out, { appVersion: "1" });
    expect(existsSync(out)).toBe(true);
    expect(existsSync(`${out}.partial`)).toBe(false);
  });
});
