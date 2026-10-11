/**
 * [8i] When a decryption left part-way still needs the data file's key (desktop/decrypt-database.mjs
 * decryptionNeedsKey; docs/architecture/database-encryption.md § 15.3, "Which of these need the key").
 * desktop/main.mjs counts a decryption note as "something is locked" only then, so a key that can't be
 * opened shows the lost-key window only when something really is locked with it.
 *
 * Found in the second review (2026-10-10): a note left at the wipe step (another program held the
 * encrypted original) made a plain, readable data file look locked. With Windows' key store briefly
 * unavailable, or the Windows password reset, the lost-key window then said "Your data file is
 * encrypted", and Restore would have set the readable file aside as a locked one.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { openDatabaseKey } from "../desktop/database-key.mjs";
import { DECRYPTING_NOTE, decryptFile, decryptionNeedsKey, deleteKeyWhenUnused } from "../desktop/decrypt-database.mjs";
import { encryptFile } from "../desktop/encrypt-database.mjs";
import { keyIdOf } from "../desktop/receipt-crypto.mjs";
import type { KeyStore } from "../desktop/receipt-key.mjs";
import { fileKind, openDatabase } from "../desktop/sqlite.mjs";
import { deleteSafetyCopies } from "../desktop/wipe-pending.mjs";

const root = mkdtempSync(path.join(tmpdir(), "dotami-key-needed-"));
afterAll(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }));

const KEY = Buffer.alloc(32, 0x42);
const COPY_NAME = "dotami-before-20260101000000_x.db";

let n = 0;
/** A data folder with dotami.db encrypted with KEY, a safety copy locked with it too, and a key file. */
function lockedFolder() {
  n += 1;
  const dir = path.join(root, `folder-${n}`);
  mkdirSync(path.join(dir, "backups"), { recursive: true });
  const dbFile = path.join(dir, "dotami.db");
  const db = openDatabase(dbFile);
  db.exec("CREATE TABLE words (id INTEGER PRIMARY KEY, said TEXT)");
  db.prepare("INSERT INTO words (said) VALUES ('kept')").run();
  db.close();
  encryptFile(dir, dbFile, KEY);
  const copy = path.join(dir, "backups", COPY_NAME);
  copyFileSync(dbFile, copy);
  writeFileSync(path.join(dir, "database.key"), JSON.stringify({ format: 1, keyId: keyIdOf(KEY), wrapped: "stand-in" }));
  return { dir, dbFile, copy };
}

/** Windows' key store, briefly unavailable (just after signing in, or during an update). */
const storeUnavailable: KeyStore = {
  isEncryptionAvailable: () => false,
  encryptString: () => {
    throw new Error("unavailable");
  },
  decryptString: () => {
    throw new Error("unavailable");
  },
};

/** What desktop/main.mjs prepareDatabase computes before it opens the key (the encryption's note aside). */
const lockedAtStart = (dir: string, dbFile: string) => fileKind(dbFile) === "encrypted" || decryptionNeedsKey(dir);

describe("a decryption note needs the key only while something is still encrypted", () => {
  it("no note: nothing needed", () => {
    const f = lockedFolder();
    expect(decryptionNeedsKey(f.dir)).toBe(false);
  });

  it("a note at the swap step needs it (the encrypted file may have to be checked again)", () => {
    const f = lockedFolder();
    decryptFile(f.dir, f.dbFile, KEY, { crashAt: "note-swap" });
    expect(decryptionNeedsKey(f.dir)).toBe(true);
  });

  it("a note at the wipe step beside the plain data file doesn't: the start goes on without the key, not to the lost-key window", () => {
    const f = lockedFolder();
    decryptFile(f.dir, f.dbFile, KEY, { crashAt: "note-wipe" });
    // The control: the data file is plain, and opens without any key.
    expect(fileKind(f.dbFile)).toBe("plain");
    openDatabase(f.dbFile, { readonly: true, fileMustExist: true }).close();
    expect(decryptionNeedsKey(f.dir)).toBe(false);
    expect(lockedAtStart(f.dir, f.dbFile)).toBe(false);
    // With the key store unavailable, the start is told there is no key store (the file stays plain, and
    // Settings says why), never that the data file is locked.
    expect(openDatabaseKey(f.dir, storeUnavailable, { locked: lockedAtStart(f.dir, f.dbFile), platform: "win32" })).toEqual({ state: "no-key-store" });
  });

  it("a note at the wipe step beside a safety copy the person deleted doesn't either", () => {
    const f = lockedFolder();
    decryptFile(f.dir, f.dbFile, KEY);
    decryptFile(f.dir, f.copy, KEY, { crashAt: "note-wipe" });
    deleteSafetyCopies(f.dbFile, [COPY_NAME]);
    expect(decryptionNeedsKey(f.dir)).toBe(false);
  });

  it("a note naming a file that is still encrypted needs it, whatever its step", () => {
    const f = lockedFolder();
    decryptFile(f.dir, f.dbFile, KEY);
    // Not a state DotAmi leaves (the start stops on it), but if it is ever there, the key is kept for it.
    writeFileSync(path.join(f.dir, DECRYPTING_NOTE), JSON.stringify({ format: 1, step: "wipe", file: path.join("backups", COPY_NAME), size: 1, sha256: "0".repeat(64) }));
    expect(fileKind(f.copy)).toBe("encrypted");
    expect(decryptionNeedsKey(f.dir)).toBe(true);
    // And the key itself is never deleted while any note is there.
    expect(deleteKeyWhenUnused(f.dir, KEY)).toMatchObject({ deleted: false });
  });

  it("a note that can't be read needs no key (the start clears it without one)", () => {
    const f = lockedFolder();
    decryptFile(f.dir, f.dbFile, KEY);
    writeFileSync(path.join(f.dir, DECRYPTING_NOTE), "{ not json");
    expect(decryptionNeedsKey(f.dir)).toBe(false);
  });
});
