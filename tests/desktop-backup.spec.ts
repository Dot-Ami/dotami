/**
 * The desktop app's backups (desktop/backup.mjs): a backup restores to the same data, on a new
 * computer too, receipt files included ([8i], format 2); a backup made before receipts were carried
 * (format 1) still restores; a locked one stays unreadable without the passphrase; and every kind of bad file
 * is refused, with the live database left exactly as it was.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyRestore,
  BackupError,
  backupReceiptsNote,
  prepareRestore,
  readBackup,
  rebuiltImage,
  RECEIPT_EXTENSIONS,
  restoreReceiptsNote,
  stagedReceiptsFolder,
  writeBackup,
} from "../desktop/backup.mjs";
import { RECEIPT_TYPES } from "../lib/expenses/receipts/types";
import { migrate } from "../desktop/migrate.mjs";
import { decryptReceipt, encryptedKeyId, encryptReceipt, isEncryptedReceipt, keyIdOf } from "../desktop/receipt-crypto.mjs";
import { CannotOpenDatabase, fileKind, openDatabase, runSql as runOn } from "../desktop/sqlite.mjs";

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

/**
 * [8i] A passphrase on every backup (the maintainer's decision of 2026-10-10). The unlocked backups the
 * tests below make (with `allowUnlocked`) stand for the ones older versions wrote, which still restore.
 */
describe("desktop backup — every new backup is locked ([8i])", () => {
  it("refuses an empty passphrase and writes nothing", () => {
    const out = path.join(dir, "out.dotami-backup");
    expect(kindOf(() => writeBackup(makeDb(path.join(dir, "dotami.db")), out, { appVersion: "1" }))).toBe("needs-passphrase");
    expect(existsSync(out)).toBe(false);
    expect(existsSync(`${out}.partial`)).toBe(false);
  });

  it("the desktop app never asks for an unlocked one, and its passphrase window refuses an empty passphrase", () => {
    const desktop = path.join(path.resolve(__dirname, ".."), "desktop");
    expect(readFileSync(path.join(desktop, "main.mjs"), "utf8")).not.toContain("allowUnlocked");
    expect(readFileSync(path.join(desktop, "passphrase.js"), "utf8")).toContain('if (backup && pass === "") {');
  });
});

describe("desktop backup — round trips", () => {
  it("restores a plain backup onto a new computer", () => {
    const backup = path.join(dir, "plain.dotami-backup");
    const info = writeBackup(makeDb(path.join(dir, "old", "dotami.db")), backup, { appVersion: "1.2.3" , allowUnlocked: true });
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
    expect(applyRestore(staging, target, { backupDir: path.join(dir, "new", "backups") })).toEqual({
      safetyCopy: null,
      receiptsMovedTo: null,
      receiptsRestored: 0,
    });
    expect(users(target)).toEqual(["someone"]);
    expect(existsSync(staging)).toBe(false);
  });

  it("restores a locked backup with its passphrase, and keeps the data unreadable without it", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"));
    const plain = path.join(dir, "plain.dotami-backup");
    const locked = path.join(dir, "locked.dotami-backup");
    writeBackup(source, plain, { appVersion: "1.2.3" , allowUnlocked: true });
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
    writeBackup(makeDb(path.join(dir, "dotami.db")), backup, { appVersion: "1" , allowUnlocked: true });
    const cut = path.join(dir, "cut.dotami-backup");
    const flipped = path.join(dir, "flipped.dotami-backup");
    const original = readFileSync(backup);
    writeFileSync(cut, original.subarray(0, original.length - 100));
    writeFileSync(flipped, original);
    flipLastByte(flipped);

    expect(kindOf(() => readBackup(cut))).toBe("damaged");
    expect(kindOf(() => readBackup(flipped))).toBe("damaged");
    expect(readBackup(backup).files[0].bytes).toBeGreaterThan(0);
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
    writeBackup(source, backup, { appVersion: "9.0.0" , allowUnlocked: true });

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
    writeBackup(makeDb(path.join(dir, "old", "dotami.db"), "from-backup"), backup, { appVersion: "1" , allowUnlocked: true });

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

  it("moves the live receipts folder into the backups folder whole, so a restore can never lose a receipt file", () => {
    // The restored data file doesn't describe the receipt files beside the live one, so DotAmi's
    // sweep would remove them if they stayed; the safety copy beside them does describe them.
    const backup = path.join(dir, "mine.dotami-backup");
    writeBackup(makeDb(path.join(dir, "old", "dotami.db"), "from-backup"), backup, { appVersion: "1" , allowUnlocked: true });
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
    writeBackup(makeDb(path.join(dir, "dotami.db")), out, { appVersion: "1" , allowUnlocked: true });
    expect(existsSync(out)).toBe(true);
    expect(existsSync(`${out}.partial`)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// [8i] Receipts in backups (format 2), and backups made before them (format 1).

const fixtures = path.join(path.resolve(__dirname, ".."), "tests", "fixtures", "backups");
const id = (c: string) => c.repeat(32);

/**
 * Adds an expense record with a receipt row to a migrated database, and writes the file the row
 * describes into the receipts folder beside it (unless `onDisk` is false). Returns the file's name.
 */
function addReceipt(dbFile: string, idChar: string, type: keyof typeof RECEIPT_EXTENSIONS, content: Buffer | string, onDisk = true): string {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content, "latin1");
  const expenseId = `e-${idChar}`;
  query(
    dbFile,
    `INSERT INTO "Expense" (id, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, status) VALUES (?, 10, 4599, 'Example Stationery Ltd', 'paper', 'typed', 'typed by you', 'confirmed') RETURNING id`,
    expenseId,
  );
  query(
    dbFile,
    `INSERT INTO "Receipt" (id, expenseId, type, bytes, sha256) VALUES (?, ?, ?, ?, ?) RETURNING id`,
    id(idChar),
    expenseId,
    type,
    bytes.length,
    createHash("sha256").update(bytes).digest("hex"),
  );
  const name = `${id(idChar)}.${RECEIPT_EXTENSIONS[type]}`;
  if (onDisk) {
    const folder = path.join(path.dirname(dbFile), "receipts");
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, name), bytes);
  }
  return name;
}

/** The receipts folder beside a database: each file's name and bytes, sorted by name. */
function receiptFiles(dbFile: string): Record<string, string> {
  const folder = path.join(path.dirname(dbFile), "receipts");
  if (!existsSync(folder)) return {};
  return Object.fromEntries(
    readdirSync(folder)
      .sort()
      .map((n) => [n, createHash("sha256").update(readFileSync(path.join(folder, n))).digest("hex")]),
  );
}

describe("desktop backup — receipts travel with the data (format 2)", () => {
  it("holds every receipt the data file describes, and a restore on another computer brings each back byte for byte", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"), "with-receipts");
    const pdfName = addReceipt(source, "a", "application/pdf", "%PDF-1.4 an invented receipt\n%%EOF\n");
    // Bigger than one piece the writer reads at a time (1 MB), so it crosses a boundary.
    const big = Buffer.alloc(2_500_000, 7);
    big.write("\x89PNG\r\n\x1a\n", 0, "latin1");
    const pngName = addReceipt(source, "b", "image/png", big);
    // A file DotAmi named that no row describes (a leftover), and one the person put there: neither goes in.
    const folder = path.join(dir, "old", "receipts");
    writeFileSync(path.join(folder, `${id("c")}.jpg`), "a leftover");
    writeFileSync(path.join(folder, "my notes.txt"), "mine");
    const expected = { [pdfName]: receiptFiles(source)[pdfName], [pngName]: receiptFiles(source)[pngName] };

    for (const passphrase of ["", PASSPHRASE]) {
      const backup = path.join(dir, `with-receipts${passphrase ? "-locked" : ""}.dotami-backup`);
      // The unlocked one stands for a backup an older version wrote ([8i]).
      const info = writeBackup(source, backup, { appVersion: "1.2.3", passphrase, allowUnlocked: passphrase === "" });
      expect(info).toMatchObject({ encrypted: passphrase !== "", receipts: 2, missingReceipts: 0 });
      expect(info.bytes).toBe(readFileSync(backup).length);
      if (passphrase) expect(readFileSync(backup).indexOf("an invented receipt")).toBe(-1);
      else expect(readFileSync(backup).indexOf("an invented receipt")).toBeGreaterThan(-1);

      const computer = path.join(dir, `new-${passphrase ? "locked" : "plain"}`);
      const staging = path.join(computer, "dotami.db.restoring");
      const prepared = prepareRestore(backup, { passphrase, migrationsDir: migrations, stagingFile: staging });
      expect(prepared.header.format).toBe(2);
      expect(prepared.receipts).toBe(2);
      expect(prepared.header.format === 2 && prepared.header.files.map((f) => f.path)).toEqual([
        "dotami.db",
        `receipts/${pdfName}`,
        `receipts/${pngName}`,
      ]);

      const target = path.join(computer, "dotami.db");
      expect(applyRestore(staging, target, { backupDir: path.join(computer, "backups") })).toEqual({
        safetyCopy: null,
        receiptsMovedTo: null,
        receiptsRestored: 2,
      });
      expect(users(target)).toEqual(["with-receipts"]);
      expect(receiptFiles(target)).toEqual(expected);
      expect(existsSync(staging)).toBe(false);
      expect(existsSync(stagedReceiptsFolder(staging))).toBe(false);
    }
  }, 120_000);

  it("replaces the receipts here with the backup's, keeping the ones here beside the safety copy", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"), "from-backup");
    const fromBackup = addReceipt(source, "a", "application/pdf", "%PDF-1.4 from the backup");
    const backup = path.join(dir, "mine.dotami-backup");
    writeBackup(source, backup, { appVersion: "1" , allowUnlocked: true });

    const live = makeDb(path.join(dir, "live", "dotami.db"), "from-live");
    const fromLive = addReceipt(live, "d", "image/png", "a picture kept here");
    const backupDir = path.join(dir, "live", "backups");
    const staging = path.join(dir, "live", "dotami.db.restoring");
    prepareRestore(backup, { migrationsDir: migrations, stagingFile: staging });
    const result = applyRestore(staging, live, { backupDir, now: () => 45 });

    expect(result.receiptsRestored).toBe(1);
    expect(Object.keys(receiptFiles(live))).toEqual([fromBackup]);
    expect(readdirSync(path.join(backupDir, "receipts-before-restore-45"))).toEqual([fromLive]);
    expect(users(result.safetyCopy!)).toEqual(["from-live"]);
  });

  it("counts a receipt the data file describes but the folder doesn't have, instead of inventing one", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"));
    addReceipt(source, "a", "application/pdf", "%PDF-1.4 here");
    addReceipt(source, "b", "image/webp", "RIFF....WEBP gone", false);
    const backup = path.join(dir, "missing.dotami-backup");
    expect(writeBackup(source, backup, { appVersion: "1" , allowUnlocked: true })).toMatchObject({ receipts: 1, missingReceipts: 1 });
    const { header } = readBackup(backup);
    expect(header.format === 2 && header.files.map((f) => f.path)).toEqual(["dotami.db", `receipts/${id("a")}.pdf`]);
  });

  it("refuses a locked backup whose tag, file list or a receipt's bytes changed, and stages nothing", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"));
    addReceipt(source, "a", "application/pdf", "%PDF-1.4 a receipt that will be changed");
    const locked = path.join(dir, "locked.dotami-backup");
    writeBackup(source, locked, { appVersion: "1", passphrase: PASSPHRASE });
    const original = readFileSync(locked);

    const tag = path.join(dir, "tag.dotami-backup");
    writeFileSync(tag, original);
    flipLastByte(tag);
    const listed = path.join(dir, "listed.dotami-backup");
    writeFileSync(listed, original);
    rewriteHeader(listed, (header) => {
      (header.files as { path: string }[])[1].path = `receipts/${id("f")}.pdf`;
    });
    const inside = path.join(dir, "inside.dotami-backup");
    const changed = Buffer.from(original);
    changed[changed.length - 20] ^= 0x01; // a byte of the receipt's ciphertext, just before the tag
    writeFileSync(inside, changed);

    const staging = path.join(dir, "staging", "dotami.db.restoring");
    for (const file of [tag, listed, inside]) {
      expect(kindOf(() => prepareRestore(file, { passphrase: PASSPHRASE, migrationsDir: migrations, stagingFile: staging })), file).toBe(
        "cannot-decrypt",
      );
      expect(existsSync(staging)).toBe(false);
      expect(existsSync(stagedReceiptsFolder(staging))).toBe(false);
    }
    expect(kindOf(() => prepareRestore(locked, { migrationsDir: migrations, stagingFile: staging }))).toBe("needs-passphrase");
    expect(kindOf(() => prepareRestore(locked, { passphrase: "wrong", migrationsDir: migrations, stagingFile: staging }))).toBe("cannot-decrypt");
    // The untouched original still restores, so each refusal above is about its change.
    expect(prepareRestore(locked, { passphrase: PASSPHRASE, migrationsDir: migrations, stagingFile: staging }).receipts).toBe(1);
  }, 120_000);

  it("refuses a plain backup with a receipt's byte changed or cut short", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"));
    addReceipt(source, "a", "application/pdf", "%PDF-1.4 a receipt that will be changed");
    const plain = path.join(dir, "plain.dotami-backup");
    writeBackup(source, plain, { appVersion: "1" , allowUnlocked: true });
    const original = readFileSync(plain);
    const flipped = path.join(dir, "flipped.dotami-backup");
    writeFileSync(flipped, original);
    flipLastByte(flipped);
    const cut = path.join(dir, "cut.dotami-backup");
    writeFileSync(cut, original.subarray(0, original.length - 5));

    const staging = path.join(dir, "staging", "dotami.db.restoring");
    for (const file of [flipped, cut]) {
      expect(kindOf(() => prepareRestore(file, { migrationsDir: migrations, stagingFile: staging })), file).toBe("damaged");
      expect(existsSync(staging)).toBe(false);
      expect(existsSync(stagedReceiptsFolder(staging))).toBe(false);
    }
  });

  it("refuses a file list that names anything but the data file and DotAmi's own receipt names, and writes nothing outside the staging folder", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"));
    addReceipt(source, "a", "application/pdf", "%PDF-1.4 a receipt");
    const plain = path.join(dir, "plain.dotami-backup");
    writeBackup(source, plain, { appVersion: "1" , allowUnlocked: true });

    type Entry = { path: string; bytes: number; sha256: string };
    const hostile: [string, (files: Entry[]) => void][] = [
      ["a path out of the folder", (f) => (f[1].path = "receipts/../../escaped.pdf")],
      ["a path to the data file's own name", (f) => (f[1].path = "dotami.db")],
      ["an absolute path", (f) => (f[1].path = "C:/Windows/escaped.pdf")],
      ["a name DotAmi doesn't make", (f) => (f[1].path = "receipts/receipt.pdf")],
      ["a script's extension", (f) => (f[1].path = `receipts/${id("a")}.html`)],
      ["the same receipt twice", (f) => f.push({ ...f[1] })],
      ["a receipt over 10 MB", (f) => (f[1].bytes = 10 * 1024 * 1024 + 1)],
      ["the data file not first", (f) => f.reverse()],
      ["no files at all", (f) => f.splice(0)],
      ["a negative size", (f) => (f[1].bytes = -1)],
    ];
    const staging = path.join(dir, "staging", "dotami.db.restoring");
    for (const [what, change] of hostile) {
      const file = path.join(dir, "hostile.dotami-backup");
      writeFileSync(file, readFileSync(plain));
      rewriteHeader(file, (header) => change(header.files as Entry[]));
      expect(kindOf(() => prepareRestore(file, { migrationsDir: migrations, stagingFile: staging })), what).toBe("not-a-backup");
    }
    expect(allFiles(dir).filter((f) => f.includes("escaped"))).toEqual([]);
    expect(existsSync(path.join(dir, "staging"))).toBe(false);
  });

  it("puts both receipts folders back when the data file can't be swapped", () => {
    const source = makeDb(path.join(dir, "old", "dotami.db"));
    addReceipt(source, "a", "application/pdf", "%PDF-1.4 from the backup");
    const backup = path.join(dir, "mine.dotami-backup");
    writeBackup(source, backup, { appVersion: "1" , allowUnlocked: true });
    const live = makeDb(path.join(dir, "live", "dotami.db"), "from-live");
    const fromLive = addReceipt(live, "d", "image/png", "kept here");
    const staging = path.join(dir, "live", "dotami.db.restoring");
    prepareRestore(backup, { migrationsDir: migrations, stagingFile: staging });
    // The staged data file goes missing, so the last step (the swap) fails.
    rmSync(staging);

    expect(() => applyRestore(staging, live, { backupDir: path.join(dir, "live", "backups"), now: () => 46 })).toThrow();
    expect(Object.keys(receiptFiles(live))).toEqual([fromLive]);
    expect(readdirSync(stagedReceiptsFolder(staging))).toEqual([`${id("a")}.pdf`]);
    expect(existsSync(path.join(dir, "live", "backups", "receipts-before-restore-46"))).toBe(false);
    expect(users(live)).toEqual(["from-live"]);
  });

  it("names receipt files the way the app does", () => {
    expect(Object.entries(RECEIPT_EXTENSIONS).sort()).toEqual(RECEIPT_TYPES.map((t) => [t.type, t.extension]).sort());
  });

  it("reads and writes in pieces: no whole-file read in the format-2 writer or reader", () => {
    // A guard against a return to reading files whole from the disk (format 1 did, and still does for
    // the old backups it reads). The two functions that handle format 2 must not read a file whole.
    // [8i] The data file itself is held in memory on purpose since it can be encrypted: its decrypted,
    // rebuilt image is what goes in, so no plain copy is written to the disk (rebuiltImage; the design
    // is docs/architecture/database-encryption.md § 8). Receipts are still read one at a time.
    const code = readFileSync(path.join(path.resolve(__dirname, ".."), "desktop", "backup.mjs"), "utf8");
    const body = (name: string) => {
      const start = code.indexOf(`function ${name}(`);
      expect(start, name).toBeGreaterThan(-1);
      const next = code.indexOf("\nfunction ", start + 1);
      const nextExport = code.indexOf("\nexport function ", start + 1);
      const end = Math.min(...[next, nextExport].filter((i) => i > 0));
      return code.slice(start, end);
    };
    for (const name of ["writeBackup", "readFormat2"]) {
      expect(body(name), name).not.toMatch(/readFileSync|writeFileSync\(|Buffer\.concat/);
    }
  });
});

describe("desktop backup — backups made before receipts were carried (format 1)", () => {
  it("restores a plain and a locked one made by the earlier version, then the update adds the receipts table", () => {
    for (const [file, passphrase] of [
      ["format-1-plain.dotami-backup", ""],
      ["format-1-locked.dotami-backup", PASSPHRASE],
    ] as const) {
      const computer = path.join(dir, file);
      const staging = path.join(computer, "dotami.db.restoring");
      const backup = path.join(fixtures, file);
      if (passphrase) {
        expect(kindOf(() => prepareRestore(backup, { migrationsDir: migrations, stagingFile: staging }))).toBe("needs-passphrase");
        expect(kindOf(() => prepareRestore(backup, { passphrase: "wrong", migrationsDir: migrations, stagingFile: staging }))).toBe(
          "cannot-decrypt",
        );
      }
      const prepared = prepareRestore(backup, { passphrase, migrationsDir: migrations, stagingFile: staging });
      expect(prepared.header).toMatchObject({ format: 1, appVersion: "0.2.1" });
      expect(prepared.receipts).toBe(0);

      const target = path.join(computer, "dotami.db");
      // Receipts here already: moved aside whole, since the old backup has none.
      mkdirSync(path.join(computer, "receipts"), { recursive: true });
      writeFileSync(path.join(computer, "receipts", `${id("e")}.pdf`), "%PDF-1.4 kept");
      const result = applyRestore(staging, target, { backupDir: path.join(computer, "backups"), now: () => 47 });
      expect(result.receiptsRestored).toBe(0);
      expect(readdirSync(path.join(computer, "backups", "receipts-before-restore-47"))).toEqual([`${id("e")}.pdf`]);
      expect(users(target)).toEqual(["made-before-receipts"]);
      expect(query(target, `SELECT name FROM sqlite_master WHERE name = 'Receipt'`)).toEqual([]);

      // Starting the app runs the update: the receipts table is added; the old data stays.
      const { applied } = migrate(target, migrations);
      expect(applied.some((n) => n.endsWith("_receipts"))).toBe(true);
      expect(query(target, `SELECT id, paidTo FROM "Expense"`)).toEqual([{ id: "e1", paidTo: "Example Stationery Ltd" }]);
      expect(query(target, `SELECT name FROM "Venture"`)).toEqual([{ name: "An idea from an old backup" }]);
      expect(query(target, `SELECT count(*) AS n FROM "Receipt"`)).toEqual([{ n: 0 }]);
    }
  }, 120_000);
});

// ---------------------------------------------------------------------------------------------
// [8i] Receipts encrypted at rest (expense-records.md § 9): a backup holds each receipt's own bytes, so
// it restores on another computer whose key differs, and a restore encrypts them with that computer's
// key as they are unpacked. The backup format is unchanged.

describe("desktop backup — receipts encrypted at rest", () => {
  const keyA = randomBytes(32);
  const keyB = randomBytes(32);
  const RECEIPT = "%PDF-1.4 an invented receipt, encrypted on computer A\n%%EOF\n";

  /** Every file under `folder` that holds `text` in the clear. */
  const holding = (folder: string, text: string) => allFiles(folder).filter((f) => readFileSync(f).indexOf(text) !== -1);

  /** Computer A: a database with one record whose receipt file is encrypted with keyA, as the app writes it. */
  function computerA(): { db: string; name: string } {
    const db = makeDb(path.join(dir, "a", "dotami.db"), "computer-a");
    const name = addReceipt(db, "a", "application/pdf", RECEIPT);
    const file = path.join(dir, "a", "receipts", name);
    writeFileSync(file, encryptReceipt(readFileSync(file), { key: keyA, id: id("a") }));
    expect(holding(path.join(dir, "a", "receipts"), "an invented receipt")).toEqual([]);
    return { db, name };
  }

  it("a backup from computer A restores on computer B, whose key differs: the same receipt, encrypted with B's key", () => {
    const { db, name } = computerA();
    for (const passphrase of ["", PASSPHRASE]) {
      const backup = path.join(dir, `a${passphrase ? "-locked" : ""}.dotami-backup`);
      const info = writeBackup(db, backup, { appVersion: "1", passphrase, receiptKey: keyA, allowUnlocked: passphrase === "" });
      expect(info).toMatchObject({ receipts: 1, missingReceipts: 0, unreadableReceipts: 0 });
      // The backup lists the receipt's own size and SHA-256, not the encrypted file's.
      const { header } = readBackup(backup, { passphrase });
      expect(header.format === 2 && header.files[1]).toEqual({
        path: `receipts/${name}`,
        bytes: RECEIPT.length,
        sha256: createHash("sha256").update(RECEIPT, "latin1").digest("hex"),
      });
      // Without a passphrase the receipt is readable in the backup, as the backup message says; with one, it isn't.
      expect(readFileSync(backup).indexOf("an invented receipt") !== -1).toBe(passphrase === "");

      const computerB = path.join(dir, `b${passphrase ? "-locked" : ""}`);
      const staging = path.join(computerB, "dotami.db.restoring");
      expect(prepareRestore(backup, { passphrase, migrationsDir: migrations, stagingFile: staging, receiptKey: keyB }).receipts).toBe(1);
      // Staged encrypted, never in the clear on B's disk, even before the person confirms.
      const staged = readFileSync(path.join(stagedReceiptsFolder(staging), name));
      expect(isEncryptedReceipt(staged)).toBe(true);
      expect(encryptedKeyId(staged)).toBe(keyIdOf(keyB));
      expect(holding(computerB, "an invented receipt")).toEqual([]);

      const target = path.join(computerB, "dotami.db");
      applyRestore(staging, target, { backupDir: path.join(computerB, "backups") });
      const restored = readFileSync(path.join(computerB, "receipts", name));
      expect(decryptReceipt(restored, { key: keyB, id: id("a") }).toString("latin1")).toBe(RECEIPT);
      // A's key can't open it: B's copy is B's own.
      expect(() => decryptReceipt(restored, { key: keyA, id: id("a") })).toThrow();
      expect(users(target)).toEqual(["computer-a"]);
    }
  }, 120_000);

  it("a receipt this computer can't open is left out of the backup and counted, never copied as it is", () => {
    const { db } = computerA();
    for (const receiptKey of [null, keyB]) {
      const backup = path.join(dir, "unreadable.dotami-backup");
      expect(writeBackup(db, backup, { appVersion: "1", receiptKey , allowUnlocked: true })).toMatchObject({ receipts: 0, missingReceipts: 0, unreadableReceipts: 1 });
      const { header } = readBackup(backup);
      expect(header.format === 2 && header.files.map((f) => f.path)).toEqual(["dotami.db"]);
      expect(readFileSync(backup).indexOf("DOTAMI-RECEIPT")).toBe(-1);
    }
  });

  it("backups made before receipts were encrypted (format 2, plain and locked) restore, encrypted with this computer's key", () => {
    // Made by the earlier writer (desktop/backup.mjs before this change), holding one plain receipt.
    for (const [file, passphrase] of [
      ["format-2-plain.dotami-backup", ""],
      ["format-2-locked.dotami-backup", PASSPHRASE],
    ] as const) {
      const computer = path.join(dir, file);
      const staging = path.join(computer, "dotami.db.restoring");
      const prepared = prepareRestore(path.join(fixtures, file), { passphrase, migrationsDir: migrations, stagingFile: staging, receiptKey: keyB });
      expect(prepared).toMatchObject({ header: { format: 2, appVersion: "0.2.1" }, receipts: 1 });
      const target = path.join(computer, "dotami.db");
      applyRestore(staging, target, { backupDir: path.join(computer, "backups") });
      const restored = readFileSync(path.join(computer, "receipts", `${id("7")}.pdf`));
      expect(decryptReceipt(restored, { key: keyB, id: id("7") }).toString("latin1")).toContain("An invented receipt, kept before DotAmi encrypted receipts.");
      expect(users(target)).toEqual(["made-before-encryption"]);
      expect(query(target, `SELECT paidTo FROM "Expense"`)).toEqual([{ paidTo: "Example Print Shop" }]);
    }
    // With no key (a copy with no key store), the same backup restores its receipt as it was.
    const plainComputer = path.join(dir, "no-key");
    const staging = path.join(plainComputer, "dotami.db.restoring");
    prepareRestore(path.join(fixtures, "format-2-plain.dotami-backup"), { migrationsDir: migrations, stagingFile: staging });
    applyRestore(staging, path.join(plainComputer, "dotami.db"), { backupDir: path.join(plainComputer, "backups") });
    expect(readFileSync(path.join(plainComputer, "receipts", `${id("7")}.pdf`), "latin1")).toContain("An invented receipt");
  }, 120_000);

  it("format 1 backups (no receipts) still restore when a key is given", () => {
    const computer = path.join(dir, "format-1");
    const staging = path.join(computer, "dotami.db.restoring");
    const prepared = prepareRestore(path.join(fixtures, "format-1-plain.dotami-backup"), { migrationsDir: migrations, stagingFile: staging, receiptKey: keyB });
    expect(prepared).toMatchObject({ header: { format: 1 }, receipts: 0 });
    applyRestore(staging, path.join(computer, "dotami.db"), { backupDir: path.join(computer, "backups") });
    expect(users(path.join(computer, "dotami.db"))).toEqual(["made-before-receipts"]);
  });
});

describe("desktop backup — what the dialogs say about receipts", () => {
  it("an unlocked backup says its receipts aren't encrypted in it, and receipts left out for the key are named", () => {
    expect(backupReceiptsNote(2, 0, { locked: false })).toBe(
      "It holds your 2 receipt files too. The receipt files in it aren't encrypted either: anyone with the backup can open them. ",
    );
    expect(backupReceiptsNote(1, 0, { locked: false })).toBe(
      "It holds your 1 receipt file too. The receipt file in it isn't encrypted either: anyone with the backup can open it. ",
    );
    expect(backupReceiptsNote(1, 0, { locked: true })).toBe("It holds your 1 receipt file too. ");
    expect(backupReceiptsNote(0, 0, { locked: false, unreadable: 3 })).toBe(
      "3 receipt files couldn't be opened with this computer's key, so they aren't in the backup (Settings → Data and backups says why). ",
    );
  });

  it("Back up says how many receipts it holds, and names the ones it couldn't find", () => {
    expect(backupReceiptsNote(0, 0)).toBe("");
    expect(backupReceiptsNote(1, 0)).toBe("It holds your 1 receipt file too. ");
    expect(backupReceiptsNote(3, 0)).toBe("It holds your 3 receipt files too. ");
    expect(backupReceiptsNote(2, 1)).toBe(
      "It holds your 2 receipt files too. 1 receipt file DotAmi has a record of wasn't in the receipts folder, so it isn't in the backup. ",
    );
    expect(backupReceiptsNote(0, 2)).toBe("2 receipt files DotAmi has a record of weren't in the receipts folder, so they aren't in the backup. ");
  });

  it("Restore says what the backup brings and where the receipts here go, and an old backup says it has none", () => {
    expect(restoreReceiptsNote(2, 0, 0)).toBe("");
    expect(restoreReceiptsNote(2, 4, 0)).toBe(" It holds 4 receipt files.");
    expect(restoreReceiptsNote(2, 1, 1)).toBe(" It holds 1 receipt file. The 1 receipt file here now goes to the backups folder too, with the safety copy.");
    expect(restoreReceiptsNote(2, 0, 3)).toBe(" The 3 receipt files here now go to the backups folder too, with the safety copy.");
    expect(restoreReceiptsNote(1, 0, 0)).toBe("");
    expect(restoreReceiptsNote(1, 0, 2)).toBe(
      " This backup was made before backups held receipt files: your receipts folder is moved into the backups folder as it is, and the restored records have no receipt files.",
    );
  });
});

/**
 * [8i] Backups of an encrypted data file (docs/architecture/database-encryption.md § 8): the backup holds
 * the data decrypted, so it restores on another computer with another key; nothing plain is written to
 * the disk while backing up or restoring; and words deleted since the last wipe stay out of it.
 */
describe("desktop backup — an encrypted data file ([8i])", () => {
  const KEY_A = Buffer.alloc(32, 0xa1);
  const KEY_B = Buffer.alloc(32, 0xb2);
  const MARKER = "zq-backup-encrypted-marker-6610";

  /** A migrated data file created encrypted with `key`, holding one statement with the marker. */
  function encryptedDb(file: string, key: Buffer) {
    mkdirSync(path.dirname(file), { recursive: true });
    migrate(file, migrations, { key });
    const db = openDatabase(file, { key });
    try {
      runOn(
        db,
        `INSERT INTO "User" (id, updatedAt) VALUES ('someone', 0);
         INSERT INTO "PersonStatement" (id, userId, text, saidAt) VALUES ('s1', 'someone', 'statement ${MARKER}', 0);`,
      );
    } finally {
      db.close();
    }
    return file;
  }
  const statements = (file: string, key: Buffer | null) => {
    const db = openDatabase(file, { key, readonly: true, fileMustExist: true });
    try {
      return db.prepare(`SELECT text FROM "PersonStatement"`).all();
    } finally {
      db.close();
    }
  };

  it("restores on a second computer, under that computer's key, and on a third without encryption", () => {
    const a = encryptedDb(path.join(dir, "computer-a", "dotami.db"), KEY_A);
    const out = path.join(dir, "out.dotami-backup");
    writeBackup(a, out, { passphrase: PASSPHRASE, appVersion: "9.9.9", databaseKey: KEY_A });
    // The backup never holds the key, in any form.
    const backup = readFileSync(out);
    for (const form of [KEY_A, Buffer.from(KEY_A.toString("hex")), Buffer.from(KEY_A.toString("base64"))]) expect(backup.includes(form)).toBe(false);

    // Computer B, whose data file is encrypted with its own key.
    const b = encryptedDb(path.join(dir, "computer-b", "dotami.db"), KEY_B);
    const stagingB = path.join(dir, "computer-b", "restore-staging.db");
    prepareRestore(out, { passphrase: PASSPHRASE, migrationsDir: migrations, stagingFile: stagingB, databaseKey: KEY_B });
    // Staged encrypted with B's key, never plain on the disk.
    expect(fileKind(stagingB)).toBe("encrypted");
    expect(readFileSync(stagingB).includes(Buffer.from(MARKER))).toBe(false);
    const { safetyCopy } = applyRestore(stagingB, b, { backupDir: path.join(dir, "computer-b", "backups"), databaseKey: KEY_B });
    expect(statements(b, KEY_B)).toEqual([{ text: `statement ${MARKER}` }]);
    expect(() => statements(b, KEY_A)).toThrow(CannotOpenDatabase);
    // The safety copy of what B had is encrypted with B's key too.
    expect(fileKind(safetyCopy!)).toBe("encrypted");
    expect(statements(safetyCopy!, KEY_B)).toHaveLength(1);

    // Computer C keeps its data file unencrypted: the same backup restores plain there.
    const c = makeDb(path.join(dir, "computer-c", "dotami.db"));
    const stagingC = path.join(dir, "computer-c", "restore-staging.db");
    prepareRestore(out, { passphrase: PASSPHRASE, migrationsDir: migrations, stagingFile: stagingC });
    applyRestore(stagingC, c, { backupDir: path.join(dir, "computer-c", "backups") });
    expect(fileKind(c)).toBe("plain");
    expect(statements(c, null)).toEqual([{ text: `statement ${MARKER}` }]);
  });

  it("writes nothing plain to the disk while backing up: no temporary copy anywhere", () => {
    const a = encryptedDb(path.join(dir, "computer-a", "dotami.db"), KEY_A);
    const tmpBefore = new Set(readdirSync(os.tmpdir()));
    const out = path.join(dir, "out.dotami-backup");
    writeBackup(a, out, { passphrase: PASSPHRASE, appVersion: "9.9.9", databaseKey: KEY_A });
    const made = readdirSync(os.tmpdir()).filter((name) => !tmpBefore.has(name) && name.startsWith("dotami-backup-"));
    expect(made).toEqual([]);
    // In the data folder, only the data file (the backup went elsewhere, locked).
    expect(allFiles(path.join(dir, "computer-a")).map((f) => path.basename(f))).toEqual(["dotami.db"]);
    expect(readFileSync(out).includes(Buffer.from(MARKER))).toBe(false);
  });

  it("a backup without the key can't be made from an encrypted file, and changes nothing", () => {
    const a = encryptedDb(path.join(dir, "computer-a", "dotami.db"), KEY_A);
    const was = fileHash(a);
    expect(() => writeBackup(a, path.join(dir, "out.dotami-backup"), { passphrase: PASSPHRASE, appVersion: "9.9.9" })).toThrow(CannotOpenDatabase);
    expect(fileHash(a)).toBe(was);
    expect(existsSync(path.join(dir, "out.dotami-backup"))).toBe(false);
  });

  it("leaves out words deleted since the last wipe: the image is rebuilt before it is written (the image before is the control)", () => {
    // A plain file, where SQLite leaves deleted words in the file's free space.
    const file = makeDb(path.join(dir, "plain", "dotami.db"));
    query(file, `INSERT INTO "PersonStatement" (id, userId, text, saidAt) VALUES ('s1', 'someone', 'statement ${MARKER}', 0)`);
    query(file, `DELETE FROM "PersonStatement"`);
    // The control: the file's own page image still holds the deleted words.
    const raw = openDatabase(file, { readonly: true, fileMustExist: true });
    try {
      expect(raw.serialize().includes(Buffer.from(MARKER))).toBe(true);
    } finally {
      raw.close();
    }
    expect(rebuiltImage(file).image.includes(Buffer.from(MARKER))).toBe(false);
    const out = path.join(dir, "out.dotami-backup");
    writeBackup(file, out, { passphrase: PASSPHRASE, appVersion: "9.9.9" });
    const { database } = readBackup(out, { passphrase: PASSPHRASE, unpackTo: { receiptsDir: path.join(dir, "unpacked-receipts") } });
    expect(database!.includes(Buffer.from("SQLite format 3"))).toBe(true);
    expect(database!.includes(Buffer.from(MARKER))).toBe(false);
  });
});
