/**
 * [8i] Finishing a turn-off at a later start (desktop/decrypt-database.mjs finishTurningOff;
 * docs/architecture/database-encryption.md § 15.2 and § 15.3): the safety copies still locked with the key
 * are decrypted and the key is deleted only when the turn-off note names that key. Found in review
 * (2026-10-10): "a plain data file, the setting off and a key that opens" is also what a data file moved
 * out of the folder leaves behind, followed by Never, and decrypting the safety copies and deleting the key
 * then made the moved file impossible to open.
 *
 * - No note, or a note naming another key: nothing is decrypted, the key stays.
 * - A note naming the key: the safety copies are decrypted, the key and the note are deleted.
 * - A safety copy an earlier Delete still owes is skipped (decrypting it would write deleted data out in
 *   plain text just before the owed delete), and keeps the key until it is gone.
 * - The note holds the key's id only, never the key.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { clearTurnedOff, decryptFile, finishTurningOff, markTurnedOff, TURNED_OFF_NOTE, turnedOffWith } from "../desktop/decrypt-database.mjs";
import { encryptFile } from "../desktop/encrypt-database.mjs";
import { keyIdOf } from "../desktop/receipt-crypto.mjs";
import { fileKind, openDatabase } from "../desktop/sqlite.mjs";
import { clearWipePending, deleteSafetyCopies, writeWipePending } from "../desktop/wipe-pending.mjs";

const root = mkdtempSync(path.join(tmpdir(), "dotami-turn-off-"));
afterAll(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }));

const KEY = Buffer.alloc(32, 0x42);
const OTHER_KEY = Buffer.alloc(32, 0x17);
const MARKER = "zq-turn-off-marker-5170";
const COPY_NAME = "dotami-before-20260101000000_x.db";

let n = 0;
/**
 * A data folder as locking left it: dotami.db encrypted with KEY, a safety copy in backups/ encrypted with
 * KEY too, and a stand-in database.key (finishTurningOff only deletes it; it never reads it).
 */
function lockedFolder() {
  n += 1;
  const dir = path.join(root, `folder-${n}`);
  mkdirSync(path.join(dir, "backups"), { recursive: true });
  const dbFile = path.join(dir, "dotami.db");
  const db = openDatabase(dbFile);
  db.exec("CREATE TABLE words (id INTEGER PRIMARY KEY, said TEXT)");
  db.prepare("INSERT INTO words (said) VALUES (?)").run(MARKER);
  db.close();
  encryptFile(dir, dbFile, KEY);
  const copy = path.join(dir, "backups", COPY_NAME);
  copyFileSync(dbFile, copy);
  const keyFile = path.join(dir, "database.key");
  writeFileSync(keyFile, JSON.stringify({ format: 1, keyId: keyIdOf(KEY), wrapped: "stand-in" }));
  return { dir, dbFile, copy, keyFile };
}

/** A plain, empty data file where the migrator would make one. */
function newPlainDataFile(dbFile: string) {
  const db = openDatabase(dbFile);
  db.exec("CREATE TABLE fresh (id INTEGER PRIMARY KEY)");
  db.close();
}

const opensWith = (file: string, key: Buffer) => {
  const db = openDatabase(file, { key, readonly: true, fileMustExist: true });
  try {
    return (db.prepare("SELECT said FROM words").get() as { said: string }).said;
  } finally {
    db.close();
  }
};

describe("nothing is decrypted, and the key stays, without a turn-off note naming the key", () => {
  it("a data file moved out of the folder, then Never beside its key: the key and the encrypted safety copy stay", () => {
    const f = lockedFolder();
    const movedTo = path.join(root, `moved-${n}.db`);
    renameSync(f.dbFile, movedTo);
    // The new-folder window, answered Never: the migrator makes a plain data file.
    newPlainDataFile(f.dbFile);

    expect(finishTurningOff(f.dir, f.dbFile, KEY, { files: [f.copy] })).toEqual({ ran: false });
    expect(fileKind(f.copy)).toBe("encrypted");
    expect(existsSync(f.keyFile)).toBe(true);
    // The moved file can still be opened with the key, if it is put back.
    expect(opensWith(movedTo, KEY)).toBe(MARKER);
  });

  it("a note naming another key changes nothing either", () => {
    const f = lockedFolder();
    markTurnedOff(f.dir, OTHER_KEY);
    decryptFile(f.dir, f.dbFile, KEY);
    expect(turnedOffWith(f.dir, KEY)).toBe(false);
    expect(finishTurningOff(f.dir, f.dbFile, KEY, { files: [f.copy] })).toEqual({ ran: false });
    expect(fileKind(f.copy)).toBe("encrypted");
    expect(existsSync(f.keyFile)).toBe(true);
  });
});

describe("with a turn-off note naming the key", () => {
  it("the safety copies are decrypted, then the key is deleted, and the note with it", () => {
    const f = lockedFolder();
    markTurnedOff(f.dir, KEY);
    expect(turnedOffWith(f.dir, KEY)).toBe(true);
    decryptFile(f.dir, f.dbFile, KEY);

    expect(finishTurningOff(f.dir, f.dbFile, KEY, { files: [f.copy] })).toEqual({ ran: true, decrypted: 1, notYet: 0, skipped: 0, keyDeleted: true, lockedLeft: 0 });
    expect(fileKind(f.copy)).toBe("plain");
    expect(existsSync(f.keyFile)).toBe(false);
    expect(existsSync(path.join(f.dir, TURNED_OFF_NOTE))).toBe(false);
  });

  it("a safety copy an earlier Delete still owes isn't decrypted; it keeps the key until it is gone", () => {
    const f = lockedFolder();
    // Delete couldn't remove the copy (another program held it), so its note owes it.
    writeWipePending(f.dbFile, { backups: [COPY_NAME] });
    markTurnedOff(f.dir, KEY);
    decryptFile(f.dir, f.dbFile, KEY);

    expect(finishTurningOff(f.dir, f.dbFile, KEY, { files: [f.copy] })).toEqual({ ran: true, decrypted: 0, notYet: 0, skipped: 1, keyDeleted: false, lockedLeft: 1 });
    // The deleted data is never written out in plain text: the copy stays encrypted, and only the data
    // file (decrypted, as the person chose) holds the words.
    expect(fileKind(f.copy)).toBe("encrypted");
    expect(readFileSync(f.copy).includes(Buffer.from(MARKER))).toBe(false);
    expect(existsSync(f.keyFile)).toBe(true);
    expect(turnedOffWith(f.dir, KEY)).toBe(true);

    // The owed delete happens (desktop/wipe-pending.mjs finishPendingWipe); the next start deletes the key.
    deleteSafetyCopies(f.dbFile, [COPY_NAME]);
    clearWipePending(f.dbFile);
    expect(finishTurningOff(f.dir, f.dbFile, KEY, { files: [] })).toEqual({ ran: true, decrypted: 0, notYet: 0, skipped: 0, keyDeleted: true, lockedLeft: 0 });
    expect(existsSync(f.keyFile)).toBe(false);
  });

  it("a safety copy that can't be decrypted yet keeps the key, and the note, for a later start", () => {
    const f = lockedFolder();
    markTurnedOff(f.dir, KEY);
    decryptFile(f.dir, f.dbFile, KEY);
    // Stands in for a copy another program holds: an earlier change's note makes decryptFile refuse ("pending").
    writeFileSync(path.join(f.dir, "database-encrypting.json"), "{ not json");
    const result = finishTurningOff(f.dir, f.dbFile, KEY, { files: [f.copy] });
    expect(result).toMatchObject({ ran: true, decrypted: 0, notYet: 1, keyDeleted: false });
    expect(fileKind(f.copy)).toBe("encrypted");
    expect(existsSync(f.keyFile)).toBe(true);
    expect(turnedOffWith(f.dir, KEY)).toBe(true);
  });
});

describe("the turn-off note", () => {
  it("holds the key's id only, never the key, and clearTurnedOff removes it", () => {
    const f = lockedFolder();
    markTurnedOff(f.dir, KEY);
    const text = readFileSync(path.join(f.dir, TURNED_OFF_NOTE), "utf8");
    expect(JSON.parse(text)).toEqual({ format: 1, keyId: keyIdOf(KEY) });
    expect(text.includes(KEY.toString("hex"))).toBe(false);
    expect(text.includes(KEY.toString("base64"))).toBe(false);
    // Written beside its name, then renamed: no .tmp is left.
    expect(readdirSync(f.dir).filter((name) => name.startsWith(TURNED_OFF_NOTE))).toEqual([TURNED_OFF_NOTE]);
    clearTurnedOff(f.dir);
    expect(existsSync(path.join(f.dir, TURNED_OFF_NOTE))).toBe(false);
    expect(turnedOffWith(f.dir, KEY)).toBe(false);
  });

  it("a note that can't be read names no key", () => {
    const f = lockedFolder();
    writeFileSync(path.join(f.dir, TURNED_OFF_NOTE), "{ not json");
    expect(turnedOffWith(f.dir, KEY)).toBe(false);
    expect(finishTurningOff(f.dir, f.dbFile, KEY, { files: [f.copy] })).toEqual({ ran: false });
  });
});
