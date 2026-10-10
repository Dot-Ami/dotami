/**
 * [8d] The safety copies in the backups folder and the "wipe pending" marker
 * (desktop/wipe-pending.mjs): Delete may remove only DotAmi's own safety copies, never follows a
 * link out of the folder, and a wipe that couldn't finish is finished at the next start of the
 * desktop app — only when Delete left the marker, never on an ordinary start.
 *
 * [8i] The same box clears the receipt folders DotAmi set aside in the backups folder
 * (receipts-locked-… from Start a new key, receipts-before-restore-… from a restore;
 * docs/architecture/expense-records.md § 11): only those folders, only DotAmi's files in them, never
 * through a link, and owed in the marker like a safety copy when one can't be cleared yet.
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RECEIPT_EXTENSIONS } from "../desktop/backup.mjs";
import { migrate, vacuumFile } from "../desktop/migrate.mjs";
import {
  backupsFolder,
  deleteSafetyCopies,
  deleteSetAsideReceiptFolders,
  finishPendingWipe,
  listSafetyCopies,
  listSetAsideReceiptFolders,
  readWipePending,
  wipePendingFile,
  writeWipePending,
} from "../desktop/wipe-pending.mjs";

const migrations = path.join(path.resolve(__dirname, ".."), "prisma", "migrations");
/** Text no real data holds, so finding it in a file's bytes can only mean the deleted row. */
const MARKER = "zq-wipe-pending-marker-4417";

let dir = "";
let dbFile = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-wipe-pending-"));
  dbFile = path.join(dir, "data", "dotami.db");
  mkdirSync(path.dirname(dbFile), { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

/** Can this machine make a link to a file? Windows needs Developer Mode or administrator rights for it. */
const fileLinksWork = (() => {
  const probe = mkdtempSync(path.join(os.tmpdir(), "dotami-link-probe-"));
  try {
    writeFileSync(path.join(probe, "a"), "a");
    symlinkSync(path.join(probe, "a"), path.join(probe, "b"), "file");
    return true;
  } catch {
    return false;
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
})();

/** Writes a file into the data file's backups folder. */
function inBackups(name: string, text = "copy") {
  mkdirSync(backupsFolder(dbFile), { recursive: true });
  const file = path.join(backupsFolder(dbFile), name);
  writeFileSync(file, text);
  return file;
}

/** Runs SQL on the file and closes it again (Windows won't delete an open file). */
function run(file: string, sql: string, ...params: (string | number)[]) {
  const db = new DatabaseSync(file);
  try {
    db.prepare(sql).run(...params);
  } finally {
    db.close();
  }
}

/**
 * A real data file in which a statement holding the marker was deleted the plain way, so its words
 * are still in the file's free space, plus a safety copy made before that delete, which holds them
 * as a live row.
 */
function dataFileWithDeletedWords(): { copy: string } {
  migrate(dbFile, migrations);
  run(dbFile, `INSERT INTO "User" (id, updatedAt) VALUES ('u', 0)`);
  run(dbFile, `INSERT INTO "PersonStatement" (id, userId, text, saidAt) VALUES ('s', 'u', ?, 0)`, `statement ${MARKER}`);
  mkdirSync(backupsFolder(dbFile), { recursive: true });
  const copy = path.join(backupsFolder(dbFile), "dotami-before-restore-1760000000000.db");
  run(dbFile, `VACUUM INTO '${copy.replace(/'/g, "''")}'`);
  run(dbFile, `DELETE FROM "PersonStatement"`);
  return { copy };
}

const holdsMarker = (file: string) => readFileSync(file).includes(Buffer.from(MARKER));

describe("which files count as DotAmi's safety copies", () => {
  it("lists only the copies DotAmi names itself, directly in the folder; everything else stays out", () => {
    inBackups("dotami-before-restore-1760000000000.db");
    inBackups("dotami-before-20261008005701_settings-1760000000001.db");
    inBackups("my notes.txt");
    inBackups("dotami.db");
    inBackups("dotami-before-restore-1.db.bak");
    mkdirSync(path.join(backupsFolder(dbFile), "dotami-before-folder-1.db"));
    expect(listSafetyCopies(dbFile)).toEqual({
      names: ["dotami-before-20261008005701_settings-1760000000001.db", "dotami-before-restore-1760000000000.db"],
      others: 4,
    });
  });

  it("is empty when there is no backups folder", () => {
    expect(listSafetyCopies(dbFile)).toEqual({ names: [], others: 0 });
  });

  it("never follows a backups folder that is a link (or junction) to somewhere else, and deletes nothing there", () => {
    const elsewhere = path.join(dir, "someone else's folder");
    mkdirSync(elsewhere);
    const theirs = path.join(elsewhere, "dotami-before-restore-1760000000000.db");
    writeFileSync(theirs, "not DotAmi's to delete");
    symlinkSync(elsewhere, backupsFolder(dbFile), "junction");
    // The link really leads there: read through it, the file is visible.
    expect(readdirSync(backupsFolder(dbFile))).toEqual(["dotami-before-restore-1760000000000.db"]);

    expect(listSafetyCopies(dbFile)).toEqual({ names: [], others: 0 });
    expect(deleteSafetyCopies(dbFile, ["dotami-before-restore-1760000000000.db"])).toEqual({
      deleted: [],
      left: ["dotami-before-restore-1760000000000.db"],
    });
    expect(existsSync(theirs)).toBe(true);
  });

  it.skipIf(!fileLinksWork)("never deletes a link that wears a safety copy's name, or what it points at", () => {
    const outside = path.join(dir, "important.db");
    writeFileSync(outside, "keep me");
    mkdirSync(backupsFolder(dbFile), { recursive: true });
    symlinkSync(outside, path.join(backupsFolder(dbFile), "dotami-before-restore-1.db"), "file");
    expect(listSafetyCopies(dbFile).names).toEqual([]);
    expect(deleteSafetyCopies(dbFile, ["dotami-before-restore-1.db"]).left).toEqual(["dotami-before-restore-1.db"]);
    expect(readFileSync(outside, "utf8")).toBe("keep me");
  });

  it("deletes the named copies only, and refuses any other name (the data file, a path out of the folder)", () => {
    writeFileSync(dbFile, "the live data");
    const copy = inBackups("dotami-before-restore-1760000000000.db");
    const kept = inBackups("dotami-before-restore-1760000000999.db");
    const notes = inBackups("notes.txt");
    const result = deleteSafetyCopies(dbFile, [
      "dotami-before-restore-1760000000000.db",
      "../dotami.db",
      "dotami.db",
      "notes.txt",
      "dotami-before-x/../../dotami.db",
    ]);
    expect(result).toEqual({ deleted: ["dotami-before-restore-1760000000000.db"], left: [] });
    expect(existsSync(copy)).toBe(false);
    expect(existsSync(kept)).toBe(true);
    expect(existsSync(notes)).toBe(true);
    expect(readFileSync(dbFile, "utf8")).toBe("the live data");
  });

  it("keeps a copy it couldn't delete as still owed (another program had it open)", () => {
    inBackups("dotami-before-restore-1.db");
    inBackups("dotami-before-restore-2.db");
    const busy = (file: string) => {
      if (file.endsWith("-2.db")) throw Object.assign(new Error("busy"), { code: "EBUSY" });
      rmSync(file);
    };
    expect(deleteSafetyCopies(dbFile, ["dotami-before-restore-1.db", "dotami-before-restore-2.db"], { remove: busy })).toEqual({
      deleted: ["dotami-before-restore-1.db"],
      left: ["dotami-before-restore-2.db"],
    });
  });
});

describe("the wipe-pending marker", () => {
  it("is a file beside the data file holding a date and DotAmi's own file names, nothing of the person's", () => {
    writeWipePending(dbFile, { backups: ["dotami-before-restore-2.db", "dotami-before-restore-1.db", "../escape.db"], since: "2026-10-08T00:00:00.000Z" });
    expect(wipePendingFile(dbFile)).toBe(path.join(path.dirname(dbFile), "dotami.db.wipe-pending"));
    expect(JSON.parse(readFileSync(wipePendingFile(dbFile), "utf8"))).toEqual({
      format: 1,
      since: "2026-10-08T00:00:00.000Z",
      backups: ["dotami-before-restore-1.db", "dotami-before-restore-2.db"],
      receiptFolders: [],
    });
  });

  it("reads back only names DotAmi gives its copies; a damaged marker still means a wipe is owed, of no copies", () => {
    expect(readWipePending(dbFile)).toBeNull();
    writeFileSync(wipePendingFile(dbFile), JSON.stringify({ format: 1, backups: ["dotami-before-restore-1.db", "C:\\Windows\\x.db", 7] }));
    expect(readWipePending(dbFile)).toEqual({ since: null, backups: ["dotami-before-restore-1.db"], receiptFolders: [] });
    writeFileSync(wipePendingFile(dbFile), "{ not json");
    expect(readWipePending(dbFile)).toEqual({ since: null, backups: [], receiptFolders: [] });
  });
});

describe("finishing a wipe at start-up", () => {
  it("does nothing at all on an ordinary start, with no marker: no vacuum, the deleted words stay in the free space", () => {
    const { copy } = dataFileWithDeletedWords();
    // The problem is real: a plain delete leaves the words in the file's bytes.
    expect(holdsMarker(dbFile)).toBe(true);
    let vacuums = 0;
    const result = finishPendingWipe(dbFile, {
      vacuum: (file) => {
        vacuums += 1;
        return vacuumFile(file);
      },
    });
    expect(result).toEqual({ ran: false });
    expect(vacuums).toBe(0);
    expect(holdsMarker(dbFile)).toBe(true);
    expect(existsSync(copy)).toBe(true);
    expect(existsSync(wipePendingFile(dbFile))).toBe(false);
  });

  it("with the marker: deletes the copies it names, wipes the file, removes the marker; a copy made since stays", () => {
    const { copy } = dataFileWithDeletedWords();
    writeWipePending(dbFile, { backups: [path.basename(copy)] });
    const newer = inBackups("dotami-before-restore-1769999999999.db", "made after the Delete");
    const lines: string[] = [];
    const result = finishPendingWipe(dbFile, { vacuum: vacuumFile, log: (l) => lines.push(l) });

    expect(result).toEqual({ ran: true, wiped: true, backupsLeft: [], receiptFoldersLeft: [] });
    expect(existsSync(copy)).toBe(false);
    expect(holdsMarker(dbFile)).toBe(false);
    expect(existsSync(wipePendingFile(dbFile))).toBe(false);
    expect(readFileSync(newer, "utf8")).toBe("made after the Delete");
    expect(lines).toEqual(["[wipe] finished the wipe an earlier Delete left owed (1 safety copy deleted)"]);
    // The data file still opens, with its rows: only free space went.
    const db = new DatabaseSync(dbFile);
    expect(db.prepare(`SELECT id FROM "User"`).all()).toEqual([{ id: "u" }]);
    db.close();
  });

  it("when the wipe fails again (disk full, file busy), the marker stays for the next start and the app still starts", () => {
    const { copy } = dataFileWithDeletedWords();
    writeWipePending(dbFile, { backups: [path.basename(copy)], since: "2026-10-08T01:02:03.000Z" });
    const lines: string[] = [];
    const full = () => {
      throw Object.assign(new Error(`disk full while writing ${MARKER}`), { code: "ERR_SQLITE_ERROR" });
    };
    const result = finishPendingWipe(dbFile, { vacuum: full, log: (l) => lines.push(l) });
    expect(result).toEqual({ ran: true, wiped: false, backupsLeft: [], receiptFoldersLeft: [] });
    // The copy could go, so it did; the file's wipe is still owed.
    expect(existsSync(copy)).toBe(false);
    expect(readWipePending(dbFile)).toEqual({ since: "2026-10-08T01:02:03.000Z", backups: [], receiptFolders: [] });
    // The log names only the error's code, never its words.
    expect(lines.join("\n")).not.toContain(MARKER);
    expect(lines[0]).toBe("[wipe] the data file couldn't be wiped yet (ERR_SQLITE_ERROR)");

    // Next start, with room again: finished.
    expect(finishPendingWipe(dbFile, { vacuum: vacuumFile })).toEqual({ ran: true, wiped: true, backupsLeft: [], receiptFoldersLeft: [] });
    expect(holdsMarker(dbFile)).toBe(false);
    expect(existsSync(wipePendingFile(dbFile))).toBe(false);
  });

  it("a copy that still can't be deleted stays named in the marker", () => {
    dataFileWithDeletedWords();
    inBackups("dotami-before-restore-2.db");
    writeWipePending(dbFile, { backups: ["dotami-before-restore-1760000000000.db", "dotami-before-restore-2.db"] });
    const busy = (file: string) => {
      if (file.endsWith("-2.db")) throw Object.assign(new Error("busy"), { code: "EBUSY" });
      rmSync(file);
    };
    expect(finishPendingWipe(dbFile, { vacuum: vacuumFile, remove: busy })).toEqual({
      ran: true,
      wiped: true,
      backupsLeft: ["dotami-before-restore-2.db"],
      receiptFoldersLeft: [],
    });
    expect(readWipePending(dbFile)?.backups).toEqual(["dotami-before-restore-2.db"]);
  });

  it("a damaged marker still finishes the wipe, deletes no copies, and is removed", () => {
    const { copy } = dataFileWithDeletedWords();
    writeFileSync(wipePendingFile(dbFile), "{ not json");
    expect(finishPendingWipe(dbFile, { vacuum: vacuumFile })).toEqual({ ran: true, wiped: true, backupsLeft: [], receiptFoldersLeft: [] });
    expect(holdsMarker(dbFile)).toBe(false);
    expect(existsSync(copy)).toBe(true);
    expect(existsSync(wipePendingFile(dbFile))).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// [8i] The receipt folders set aside in the backups folder (expense-records.md § 11).

/** A receipt file name as DotAmi gives one: 32 random hex characters and the extension. */
const receiptName = (extension = "png") => `${randomBytes(16).toString("hex")}.${extension}`;

/** Bytes no other file holds: what a byte scan looks for once the file is meant to be gone. */
const unique = (label: string) => Buffer.concat([Buffer.from(`zq-set-aside-${label}-`), randomBytes(24)]);

/** A folder in the backups folder holding the files named, as Start a new key or a restore leaves one. */
function setAside(name: string, files: Record<string, string | Buffer> = {}) {
  const folder = path.join(backupsFolder(dbFile), name);
  mkdirSync(folder, { recursive: true });
  for (const [file, body] of Object.entries(files)) writeFileSync(path.join(folder, file), body);
  return folder;
}

/** Every file under the test's folder holding any of `needles`, as paths relative to it. */
function holdingAny(needles: Buffer[], at = dir, prefix = ""): string[] {
  return readdirSync(at, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(at, item.name);
    if (item.isDirectory()) return holdingAny(needles, full, `${prefix}${item.name}/`);
    if (!item.isFile()) return [];
    const bytes = readFileSync(full);
    return needles.some((n) => bytes.includes(n)) ? [`${prefix}${item.name}`] : [];
  });
}

describe("the receipt folders set aside in the backups folder ([8i])", () => {
  it("lists only the folders DotAmi sets receipts aside in, when they hold something DotAmi named or nothing at all", () => {
    setAside("receipts-locked-1760000000000", { [receiptName()]: "locked", "receipts.key": "{}" });
    setAside("receipts-locked-1760000000000-1", { [receiptName("pdf")]: "locked" });
    setAside("receipts-before-restore-1760000000001", { [receiptName("heic")]: "kept before a restore" });
    // Empty: a move cut short before its first file. Nothing in it, so nothing is lost by clearing it.
    setAside("receipts-locked-1760000000002");
    // Only the person's own file: nothing of DotAmi's to clear, so it isn't counted.
    setAside("receipts-locked-1760000000003", { "my scan.png": "the person's own" });
    // Names DotAmi never gives a set-aside folder.
    setAside("receipts-old", { [receiptName()]: "x" });
    setAside("receipts-locked-17x", { [receiptName()]: "x" });
    setAside("receipts", { [receiptName()]: "x" });
    // A file wearing a folder's name.
    inBackups("receipts-locked-1760000000004");
    inBackups("dotami-before-restore-1760000000000.db");
    expect(listSetAsideReceiptFolders(dbFile)).toEqual({
      names: [
        "receipts-before-restore-1760000000001",
        "receipts-locked-1760000000000",
        "receipts-locked-1760000000000-1",
        "receipts-locked-1760000000002",
      ],
    });
  });

  it("is empty when there is no backups folder, or when the backups folder is a link to somewhere else", () => {
    expect(listSetAsideReceiptFolders(dbFile)).toEqual({ names: [] });
    const elsewhere = path.join(dir, "someone else's folder");
    mkdirSync(path.join(elsewhere, "receipts-locked-1"), { recursive: true });
    const theirs = path.join(elsewhere, "receipts-locked-1", receiptName());
    writeFileSync(theirs, "not DotAmi's to delete");
    symlinkSync(elsewhere, backupsFolder(dbFile), "junction");
    expect(listSetAsideReceiptFolders(dbFile)).toEqual({ names: [] });
    expect(deleteSetAsideReceiptFolders(dbFile, ["receipts-locked-1"])).toEqual({ deleted: [], left: ["receipts-locked-1"] });
    expect(existsSync(theirs)).toBe(true);
  });

  it("never follows a set-aside folder that is a link or junction, and deletes nothing behind it", () => {
    const elsewhere = path.join(dir, "elsewhere");
    mkdirSync(elsewhere);
    const theirs = path.join(elsewhere, receiptName());
    writeFileSync(theirs, "not DotAmi's to delete");
    mkdirSync(backupsFolder(dbFile), { recursive: true });
    symlinkSync(elsewhere, path.join(backupsFolder(dbFile), "receipts-locked-1760000000000"), "junction");
    // The link really leads there.
    expect(readdirSync(path.join(backupsFolder(dbFile), "receipts-locked-1760000000000"))).toEqual([path.basename(theirs)]);

    expect(listSetAsideReceiptFolders(dbFile)).toEqual({ names: [] });
    expect(deleteSetAsideReceiptFolders(dbFile, ["receipts-locked-1760000000000"])).toEqual({ deleted: [], left: ["receipts-locked-1760000000000"] });
    expect(existsSync(theirs)).toBe(true);
  });

  it("deletes only DotAmi's files in the named folders, and each folder once it's empty; nothing of them is left in any file", () => {
    writeFileSync(dbFile, "the live data");
    const live = path.join(path.dirname(dbFile), "receipts");
    mkdirSync(live);
    const liveReceipt = path.join(live, receiptName());
    writeFileSync(liveReceipt, "a receipt in use");
    const gone = [unique("locked-a"), unique("locked-partial"), unique("locked-key"), unique("restore-a"), unique("restore-encrypting")];
    const locked = setAside("receipts-locked-1760000000000", {
      [receiptName()]: gone[0],
      [`${receiptName("pdf")}.partial`]: gone[1],
      "receipts.key": gone[2],
    });
    const before = setAside("receipts-before-restore-1760000000001", {
      [receiptName("webp")]: gone[3],
      [`${receiptName("heic")}.encrypting`]: gone[4],
      // The person's own things in the receipts folder before a restore: never DotAmi's to delete.
      "my scan.png": "the person's own",
      [`${receiptName()}.bak`]: "not a name DotAmi gives",
    });
    mkdirSync(path.join(before, "sub"));
    writeFileSync(path.join(before, "sub", receiptName()), "inside a folder DotAmi didn't make");
    const untouched = setAside("receipts-locked-1760000000002", { [receiptName()]: "not named in this Delete" });
    // The problem is real: before, the bytes are there.
    expect(holdingAny(gone)).toHaveLength(5);

    const result = deleteSetAsideReceiptFolders(dbFile, [
      "receipts-locked-1760000000000",
      "receipts-before-restore-1760000000001",
      // Never a name DotAmi doesn't give a set-aside folder, or a path out of the backups folder.
      "../receipts",
      "receipts",
      "receipts-locked-1760000000000/../../receipts",
      "dotami-before-restore-1760000000000.db",
    ]);
    expect(result).toEqual({ deleted: ["receipts-locked-1760000000000", "receipts-before-restore-1760000000001"], left: [] });
    expect(existsSync(locked)).toBe(false);
    // What DotAmi didn't name stays, and the folder with it.
    expect(readdirSync(before).sort()).toEqual([readdirSync(before).find((n) => n.endsWith(".png.bak"))!, "my scan.png", "sub"].sort());
    expect(readdirSync(path.join(before, "sub"))).toHaveLength(1);
    expect(readdirSync(untouched)).toHaveLength(1);
    expect(readFileSync(liveReceipt, "utf8")).toBe("a receipt in use");
    expect(readFileSync(dbFile, "utf8")).toBe("the live data");
    // The byte scan: no file anywhere under the data folder holds anything of the files deleted.
    expect(holdingAny(gone)).toEqual([]);
  });

  it.skipIf(!fileLinksWork)("never deletes a link inside that wears a receipt's name, or what it points at", () => {
    const outside = path.join(dir, "important.png");
    writeFileSync(outside, "keep me");
    const folder = setAside("receipts-locked-1");
    const link = path.join(folder, receiptName());
    symlinkSync(outside, link, "file");
    expect(deleteSetAsideReceiptFolders(dbFile, ["receipts-locked-1"])).toEqual({ deleted: ["receipts-locked-1"], left: [] });
    expect(readFileSync(outside, "utf8")).toBe("keep me");
    expect(existsSync(folder)).toBe(true);
  });

  it("deletes a receipt of every type DotAmi keeps (the extensions desktop/backup.mjs gives), and nothing with another extension", () => {
    const names = Object.values(RECEIPT_EXTENSIONS).map((ext) => receiptName(ext));
    const other = receiptName("jpeg");
    const folder = setAside("receipts-locked-1", Object.fromEntries([...names, other].map((n) => [n, n])));
    expect(deleteSetAsideReceiptFolders(dbFile, ["receipts-locked-1"])).toEqual({ deleted: ["receipts-locked-1"], left: [] });
    expect(readdirSync(folder)).toEqual([other]);
  });

  it("keeps a folder whose file another program has open as still owed, and a folder already gone counts as cleared", () => {
    const busyName = receiptName();
    setAside("receipts-locked-1", { [receiptName()]: "a", [busyName]: "b" });
    const busy = (file: string) => {
      if (file.endsWith(busyName)) throw Object.assign(new Error("busy"), { code: "EBUSY" });
      rmSync(file);
    };
    expect(deleteSetAsideReceiptFolders(dbFile, ["receipts-locked-1", "receipts-locked-2"], { remove: busy })).toEqual({
      deleted: ["receipts-locked-2"],
      left: ["receipts-locked-1"],
    });
    expect(readdirSync(path.join(backupsFolder(dbFile), "receipts-locked-1"))).toEqual([busyName]);
  });

  it("the marker owes the folders too, by DotAmi's own names only; an earlier version's marker owes none", () => {
    writeWipePending(dbFile, {
      backups: ["dotami-before-restore-1.db"],
      receiptFolders: ["receipts-locked-2", "receipts-before-restore-1", "../receipts", "receipts"],
      since: "2026-10-10T00:00:00.000Z",
    });
    expect(JSON.parse(readFileSync(wipePendingFile(dbFile), "utf8"))).toEqual({
      format: 1,
      since: "2026-10-10T00:00:00.000Z",
      backups: ["dotami-before-restore-1.db"],
      receiptFolders: ["receipts-before-restore-1", "receipts-locked-2"],
    });
    expect(readWipePending(dbFile)).toEqual({
      since: "2026-10-10T00:00:00.000Z",
      backups: ["dotami-before-restore-1.db"],
      receiptFolders: ["receipts-before-restore-1", "receipts-locked-2"],
    });
    writeFileSync(wipePendingFile(dbFile), JSON.stringify({ format: 1, since: "2026-10-08T00:00:00.000Z", backups: [] }));
    expect(readWipePending(dbFile)).toEqual({ since: "2026-10-08T00:00:00.000Z", backups: [], receiptFolders: [] });
  });

  it("at start-up, with the marker: clears the folders it names and removes the marker; a folder set aside since stays", () => {
    dataFileWithDeletedWords();
    const owed = setAside("receipts-locked-1760000000000", { [receiptName()]: "owed", "receipts.key": "{}" });
    const newer = setAside("receipts-locked-1769999999999", { [receiptName()]: "set aside after the Delete" });
    writeWipePending(dbFile, { backups: ["dotami-before-restore-1760000000000.db"], receiptFolders: ["receipts-locked-1760000000000"] });
    const lines: string[] = [];
    expect(finishPendingWipe(dbFile, { vacuum: vacuumFile, log: (l) => lines.push(l) })).toEqual({
      ran: true,
      wiped: true,
      backupsLeft: [],
      receiptFoldersLeft: [],
    });
    expect(existsSync(owed)).toBe(false);
    expect(readdirSync(newer)).toHaveLength(1);
    expect(existsSync(wipePendingFile(dbFile))).toBe(false);
    expect(lines).toEqual(["[wipe] finished the wipe an earlier Delete left owed (1 safety copy and 1 set-aside receipt folder deleted)"]);
  });

  it("at start-up, a folder that still can't be cleared stays named in the marker", () => {
    dataFileWithDeletedWords();
    const busyName = receiptName();
    setAside("receipts-before-restore-1", { [busyName]: "held open" });
    writeWipePending(dbFile, { backups: [], receiptFolders: ["receipts-before-restore-1"] });
    const busy = (file: string) => {
      if (file.endsWith(busyName)) throw Object.assign(new Error("busy"), { code: "EBUSY" });
      rmSync(file);
    };
    const lines: string[] = [];
    expect(finishPendingWipe(dbFile, { vacuum: vacuumFile, remove: busy, log: (l) => lines.push(l) })).toEqual({
      ran: true,
      wiped: true,
      backupsLeft: [],
      receiptFoldersLeft: ["receipts-before-restore-1"],
    });
    expect(readWipePending(dbFile)?.receiptFolders).toEqual(["receipts-before-restore-1"]);
    expect(lines).toEqual(["[wipe] still owed: 0 safety copies; 1 set-aside receipt folder"]);
  });
});
