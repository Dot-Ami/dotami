/**
 * [8d] The safety copies in the backups folder and the "wipe pending" marker
 * (desktop/wipe-pending.mjs): Delete may remove only DotAmi's own safety copies, never follows a
 * link out of the folder, and a wipe that couldn't finish is finished at the next start of the
 * desktop app — only when Delete left the marker, never on an ordinary start.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate, vacuumFile } from "../desktop/migrate.mjs";
import {
  backupsFolder,
  deleteSafetyCopies,
  finishPendingWipe,
  listSafetyCopies,
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
    });
  });

  it("reads back only names DotAmi gives its copies; a damaged marker still means a wipe is owed, of no copies", () => {
    expect(readWipePending(dbFile)).toBeNull();
    writeFileSync(wipePendingFile(dbFile), JSON.stringify({ format: 1, backups: ["dotami-before-restore-1.db", "C:\\Windows\\x.db", 7] }));
    expect(readWipePending(dbFile)).toEqual({ since: null, backups: ["dotami-before-restore-1.db"] });
    writeFileSync(wipePendingFile(dbFile), "{ not json");
    expect(readWipePending(dbFile)).toEqual({ since: null, backups: [] });
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

    expect(result).toEqual({ ran: true, wiped: true, backupsLeft: [] });
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
    expect(result).toEqual({ ran: true, wiped: false, backupsLeft: [] });
    // The copy could go, so it did; the file's wipe is still owed.
    expect(existsSync(copy)).toBe(false);
    expect(readWipePending(dbFile)).toEqual({ since: "2026-10-08T01:02:03.000Z", backups: [] });
    // The log names only the error's code, never its words.
    expect(lines.join("\n")).not.toContain(MARKER);
    expect(lines[0]).toBe("[wipe] the data file couldn't be wiped yet (ERR_SQLITE_ERROR)");

    // Next start, with room again: finished.
    expect(finishPendingWipe(dbFile, { vacuum: vacuumFile })).toEqual({ ran: true, wiped: true, backupsLeft: [] });
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
    });
    expect(readWipePending(dbFile)?.backups).toEqual(["dotami-before-restore-2.db"]);
  });

  it("a damaged marker still finishes the wipe, deletes no copies, and is removed", () => {
    const { copy } = dataFileWithDeletedWords();
    writeFileSync(wipePendingFile(dbFile), "{ not json");
    expect(finishPendingWipe(dbFile, { vacuum: vacuumFile })).toEqual({ ran: true, wiped: true, backupsLeft: [] });
    expect(holdsMarker(dbFile)).toBe(false);
    expect(existsSync(copy)).toBe(true);
    expect(existsSync(wipePendingFile(dbFile))).toBe(false);
  });
});
