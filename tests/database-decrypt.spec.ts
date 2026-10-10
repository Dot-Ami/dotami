/**
 * [8i] Decrypting the data file after the person turned locking off in Settings, without ever losing
 * data (desktop/decrypt-database.mjs; docs/architecture/database-encryption.md § 15.3). The reverse of
 * tests/database-encrypt.spec.ts.
 *
 * - Every table's seeded data survives, the file opens without a key, and nothing encrypted or half-done
 *   is left in the folder; the encrypted file never held the words in its bytes (the control).
 * - Stopped at every step, as a crash would, the next start (resumeDecryption) finishes it, or leaves the
 *   encrypted file whole when it stopped before the swap.
 * - A file another program holds, an encrypted file written to after its copy was made, a note that can't
 *   be read, files in a state DotAmi didn't leave, a wipe held up, and a damaged file: nothing is lost.
 * - One note at a time across both directions: neither encryptFile nor decryptFile starts while the
 *   other's note is there.
 * - The key file is deleted (zero-filled first) only once nothing in the data folder opens with the key.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

import { afterAll, describe, expect, it, vi } from "vitest";

import { createDatabaseClient } from "@/lib/db/client";
import { TABLES } from "@/lib/privacy/inventory";
import { contentsOf } from "../desktop/database-copy.mjs";
import {
  DECRYPT_COPY_SUFFIX,
  decryptFile,
  DecryptionStopped,
  ENCRYPTED_SUFFIX,
  deleteKeyWhenUnused,
  filesLockedWith,
  readDecryptNote,
  resumeDecryption,
  type DecryptCrashPoint,
} from "../desktop/decrypt-database.mjs";
import { DECRYPTING_NOTE, encryptFile, EncryptionStopped, ENCRYPTING_NOTE, notePath } from "../desktop/encrypt-database.mjs";
import { CannotOpenDatabase, fileKind, openDatabase } from "../desktop/sqlite.mjs";
import { fileUrl, migratedFile } from "./helpers/migrated-db";
import { countEveryTable, seedEveryTable } from "./helpers/seed-every-table";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const root = mkdtempSync(path.join(tmpdir(), "dotami-decrypt-"));
afterAll(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }));

const KEY = Buffer.alloc(32, 0x42);
const OTHER_KEY = Buffer.alloc(32, 0x17);
const MARKER = "zq-decrypt-marker-6632";
const MODELS = TABLES.map((t) => t.model);

let n = 0;
/** A data folder with a migrated, seeded dotami.db, encrypted with KEY the way the desktop app does it. */
async function encryptedFolder() {
  n += 1;
  const dir = path.join(root, `folder-${n}`);
  mkdirSync(dir, { recursive: true });
  const file = migratedFile(path.join(dir, "dotami.db"));
  const db = createDatabaseClient({ url: fileUrl(file) });
  await seedEveryTable(db, MARKER);
  const counts = await countEveryTable(db, MODELS);
  await db.$disconnect();
  const contents = contentsOfFile(file, null);
  encryptFile(dir, file, KEY);
  return { dir, file, counts, contents };
}

function contentsOfFile(file: string, key: Buffer | null) {
  const db = openDatabase(file, { key, readonly: true, fileMustExist: true });
  try {
    return contentsOf(db);
  } finally {
    db.close();
  }
}

/** Every file under a folder whose bytes hold the marker, relative to it. */
function filesHoldingMarker(dir: string): string[] {
  const found: string[] = [];
  const walk = (at: string) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, e.name);
      if (e.isDirectory()) walk(full);
      else if (readFileSync(full).includes(Buffer.from(MARKER))) found.push(path.relative(dir, full));
    }
  };
  walk(dir);
  return found.sort();
}

const sha = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** The file is plain, holds what it held, opens without a key, and nothing encrypted or half-done is left beside it. */
async function expectPlainWhole(dir: string, file: string, before: { counts: Record<string, number>; contents: unknown }) {
  expect(fileKind(file)).toBe("plain");
  expect(contentsOfFile(file, null)).toEqual(before.contents);
  const db = createDatabaseClient({ url: fileUrl(file) });
  expect(await countEveryTable(db, MODELS)).toEqual(before.counts);
  await db.$disconnect();
  expect(readdirSync(dir).sort()).toEqual(["dotami.db"]);
}

/** The file is still encrypted with KEY and holds what it held. */
function expectStillEncrypted(file: string, before: { contents: unknown }) {
  expect(fileKind(file)).toBe("encrypted");
  expect(() => openDatabase(file, { readonly: true })).toThrow(CannotOpenDatabase);
  expect(contentsOfFile(file, KEY)).toEqual(before.contents);
}

describe("decrypting an encrypted data file", () => {
  it("keeps every table's seeded data, opens without a key, and leaves nothing encrypted or half-done", async () => {
    const before = await encryptedFolder();
    for (const model of MODELS) expect(before.counts[model], model).toBeGreaterThan(0);
    // The control: while encrypted, the person's words are in no file's bytes.
    expect(fileKind(before.file)).toBe("encrypted");
    expect(filesHoldingMarker(before.dir)).toEqual([]);

    expect(decryptFile(before.dir, before.file, KEY)).toEqual({ wipePending: false });
    await expectPlainWhole(before.dir, before.file, before);
    // Plain again: the words are readable in the file, as the person chose.
    expect(filesHoldingMarker(before.dir)).toEqual(["dotami.db"]);
  });

  it("refuses a damaged encrypted file, changing nothing", async () => {
    const { dir, file } = await encryptedFolder();
    // Damage a page in the middle (page 1 stays whole, so the file still opens with its key).
    const bytes = readFileSync(file);
    bytes.fill(0x5a, 8192 + 100, 8192 + 200);
    writeFileSync(file, bytes);
    const was = sha(file);
    expect(() => decryptFile(dir, file, KEY)).toThrow(DecryptionStopped);
    expect(sha(file)).toBe(was);
    expect(readdirSync(dir).sort()).toEqual(["dotami.db"]);
  });

  it("refuses with the wrong key, changing nothing", async () => {
    const { dir, file } = await encryptedFolder();
    const was = sha(file);
    expect(() => decryptFile(dir, file, OTHER_KEY)).toThrow(DecryptionStopped);
    expect(sha(file)).toBe(was);
    expect(readdirSync(dir).sort()).toEqual(["dotami.db"]);
  });
});

describe("stopped at every step, the next start finishes it", () => {
  const POINTS: DecryptCrashPoint[] = ["copied", "checked", "note-swap", "first-rename", "second-rename", "note-wipe", "old-deleted"];

  it.each(POINTS)("stopped after %s", async (crashAt) => {
    const before = await encryptedFolder();
    expect(decryptFile(before.dir, before.file, KEY, { crashAt })).toEqual({ crashed: true });
    const resumed = resumeDecryption(before.dir, KEY);
    if (crashAt === "copied" || crashAt === "checked") {
      // Stopped before the note: the encrypted file was never touched, the plain copy is wiped, and the
      // next start decrypts again from the beginning.
      expect(resumed).toEqual({ action: "cleared" });
      expectStillEncrypted(before.file, before);
      expect(readdirSync(before.dir).sort()).toEqual(["dotami.db"]);
      expect(filesHoldingMarker(before.dir)).toEqual([]);
      decryptFile(before.dir, before.file, KEY);
    } else {
      expect(resumed).toMatchObject({ action: "finished", wipePending: false });
    }
    await expectPlainWhole(before.dir, before.file, before);
  });

  it("a first rename another program refuses changes nothing; the next start does it", async () => {
    const before = await encryptedFolder();
    const refuse = () => {
      throw Object.assign(new Error("resource busy or locked"), { code: "EBUSY" });
    };
    expect(() => decryptFile(before.dir, before.file, KEY, { rename: refuse })).toThrow(/Another program has dotami.db open \(EBUSY\)/);
    expectStillEncrypted(before.file, before);
    expect(readDecryptNote(before.dir)).toMatchObject({ step: "swap", file: "dotami.db" });
    expect(resumeDecryption(before.dir, KEY)).toMatchObject({ action: "finished", wipePending: false });
    await expectPlainWhole(before.dir, before.file, before);
  });

  it("an encrypted file written to after its copy was made: the copy is thrown away, never swapped in", async () => {
    const before = await encryptedFolder();
    decryptFile(before.dir, before.file, KEY, { crashAt: "note-swap" });
    // Something writes to the still-encrypted file before the next start.
    const db = createDatabaseClient({ url: fileUrl(before.file), key: KEY });
    await db.personStatement.create({ data: { userId: (await db.user.findFirstOrThrow()).id, text: `later ${MARKER}`, saidAt: new Date() } });
    await db.$disconnect();
    const withLater = contentsOfFile(before.file, KEY);

    expect(resumeDecryption(before.dir, KEY)).toEqual({ action: "restart", file: before.file });
    expect(readdirSync(before.dir).sort()).toEqual(["dotami.db"]);
    expect(contentsOfFile(before.file, KEY)).toEqual(withLater);
    decryptFile(before.dir, before.file, KEY);
    expect(contentsOfFile(before.file, null)).toEqual(withLater);
  });

  it("a wipe that can't finish stays owed in the note, and finishes at a later start", async () => {
    const before = await encryptedFolder();
    decryptFile(before.dir, before.file, KEY, { crashAt: "note-wipe" });
    const old = `${before.file}${ENCRYPTED_SUFFIX}`;
    // Something holds the encrypted original so it can't be overwritten: stood in for by a folder of its name.
    renameSync(old, `${old}.aside`);
    mkdirSync(old);
    expect(resumeDecryption(before.dir, KEY)).toMatchObject({ action: "finished", wipePending: true });
    expect(readDecryptNote(before.dir)).toMatchObject({ step: "wipe" });
    rmSync(old, { recursive: true });
    renameSync(`${old}.aside`, old);
    expect(resumeDecryption(before.dir, KEY)).toMatchObject({ action: "finished", wipePending: false });
    await expectPlainWhole(before.dir, before.file, before);
  });

  it("a note that can't be read: the encrypted file stays and the leftovers go", async () => {
    const before = await encryptedFolder();
    decryptFile(before.dir, before.file, KEY, { crashAt: "checked" });
    writeFileSync(path.join(before.dir, DECRYPTING_NOTE), "{ not json");
    expect(resumeDecryption(before.dir, KEY)).toEqual({ action: "cleared" });
    expect(readdirSync(before.dir).sort()).toEqual(["dotami.db"]);
    expectStillEncrypted(before.file, before);
  });

  it("files in a state DotAmi didn't leave: it stops and removes nothing", async () => {
    const before = await encryptedFolder();
    decryptFile(before.dir, before.file, KEY, { crashAt: "first-rename" });
    // Someone deletes the plain copy by hand: the note says swap, the data file is gone, no copy.
    rmSync(`${before.file}${DECRYPT_COPY_SUFFIX}`);
    const left = readdirSync(before.dir).sort();
    expect(() => resumeDecryption(before.dir, KEY)).toThrow(DecryptionStopped);
    expect(() => resumeDecryption(before.dir, KEY)).toThrow(/didn't change or remove anything/);
    expect(readdirSync(before.dir).sort()).toEqual(left);
    expect(left).toEqual([`dotami.db${ENCRYPTED_SUFFIX}`, DECRYPTING_NOTE].sort());
  });

  it("without the key, a note is left as it is", async () => {
    const before = await encryptedFolder();
    decryptFile(before.dir, before.file, KEY, { crashAt: "note-swap" });
    const left = readdirSync(before.dir).sort();
    expect(resumeDecryption(before.dir, null)).toEqual({ action: "none" });
    expect(readdirSync(before.dir).sort()).toEqual(left);
  });

  it("a safety copy in backups/ is decrypted the same way, and its note names it", async () => {
    const before = await encryptedFolder();
    mkdirSync(path.join(before.dir, "backups"));
    const copy = path.join(before.dir, "backups", "dotami-before-001-x.db");
    copyFileSync(before.file, copy);
    expect(decryptFile(before.dir, copy, KEY, { crashAt: "note-wipe" })).toEqual({ crashed: true });
    expect(readDecryptNote(before.dir)).toMatchObject({ step: "wipe", file: path.join("backups", "dotami-before-001-x.db") });
    expect(resumeDecryption(before.dir, KEY)).toMatchObject({ action: "finished", wipePending: false });
    expect(fileKind(copy)).toBe("plain");
    expect(contentsOfFile(copy, null)).toEqual(before.contents);
    expect(readdirSync(path.join(before.dir, "backups"))).toEqual(["dotami-before-001-x.db"]);
  });
});

describe("one note at a time, across both directions", () => {
  it("decryptFile doesn't start while an encryption's note is there, and encryptFile doesn't while a decryption's is", async () => {
    const before = await encryptedFolder();
    // An encryption's note (a wipe still owed, say): decrypting would forget the file it names.
    writeFileSync(notePath(before.dir), JSON.stringify({ format: 1, step: "wipe", file: "backups/x.db", size: 1, sha256: "0".repeat(64) }));
    const was = sha(before.file);
    let stopped: unknown = null;
    try {
      decryptFile(before.dir, before.file, KEY);
    } catch (error) {
      stopped = error;
    }
    expect(stopped).toBeInstanceOf(DecryptionStopped);
    expect((stopped as DecryptionStopped).kind).toBe("pending");
    expect(sha(before.file)).toBe(was);
    rmSync(notePath(before.dir));

    // A decryption's note: encrypting another file now would start a second note.
    decryptFile(before.dir, before.file, KEY, { crashAt: "note-wipe" });
    mkdirSync(path.join(before.dir, "backups"), { recursive: true });
    const plainCopy = path.join(before.dir, "backups", "dotami-before-002-y.db");
    copyFileSync(before.file, plainCopy);
    stopped = null;
    try {
      encryptFile(before.dir, plainCopy, KEY);
    } catch (error) {
      stopped = error;
    }
    expect(stopped).toBeInstanceOf(EncryptionStopped);
    expect((stopped as EncryptionStopped).kind).toBe("pending");
    expect(fileKind(plainCopy)).toBe("plain");
    expect(existsSync(path.join(before.dir, ENCRYPTING_NOTE))).toBe(false);
  });
});

describe("the key file is deleted only once nothing opens with it", () => {
  /** A data folder after its data file was decrypted, with the key file still beside it. */
  async function decryptedFolderWithKey() {
    const before = await encryptedFolder();
    // An encrypted safety copy, made with the same key before the person turned locking off.
    mkdirSync(path.join(before.dir, "backups"));
    const copy = path.join(before.dir, "backups", "dotami-before-001-x.db");
    copyFileSync(before.file, copy);
    decryptFile(before.dir, before.file, KEY);
    const keyFile = path.join(before.dir, "database.key");
    writeFileSync(keyFile, JSON.stringify({ format: 1, keyId: "0011223344556677", wrapped: "stand-in" }));
    return { ...before, copy, keyFile };
  }

  it("a safety copy still encrypted with the key keeps it; once that copy is decrypted the key goes", async () => {
    const f = await decryptedFolderWithKey();
    expect(filesLockedWith(f.dir, KEY)).toEqual([path.join("backups", "dotami-before-001-x.db")]);
    expect(deleteKeyWhenUnused(f.dir, KEY)).toEqual({ deleted: false, lockedLeft: 1 });
    expect(existsSync(f.keyFile)).toBe(true);

    decryptFile(f.dir, f.copy, KEY);
    expect(filesLockedWith(f.dir, KEY)).toEqual([]);
    expect(deleteKeyWhenUnused(f.dir, KEY)).toEqual({ deleted: true, lockedLeft: 0 });
    expect(existsSync(f.keyFile)).toBe(false);
  });

  it("a file locked with another key doesn't keep it (a locked file set aside after a lost key)", async () => {
    const f = await decryptedFolderWithKey();
    decryptFile(f.dir, f.copy, KEY);
    // A data file set aside after a lost key: encrypted, but not with this key.
    const other = await encryptedFolder();
    const reKeyed = path.join(f.dir, "backups", "dotami-locked-1.db");
    copyFileSync(other.file, reKeyed);
    const db = openDatabase(reKeyed, { key: KEY });
    db.pragma(`rekey = "x'${OTHER_KEY.toString("hex")}'"`);
    db.close();
    expect(filesLockedWith(f.dir, KEY)).toEqual([]);
    expect(deleteKeyWhenUnused(f.dir, KEY)).toEqual({ deleted: true, lockedLeft: 0 });
    // It is left exactly as it was.
    expect(fileKind(reKeyed)).toBe("encrypted");
    expect(contentsOfFile(reKeyed, OTHER_KEY)).toEqual(other.contents);
  });

  it.each([DECRYPTING_NOTE, ENCRYPTING_NOTE])("never while %s is there, even when nothing else opens with the key", async (note) => {
    const f = await decryptedFolderWithKey();
    decryptFile(f.dir, f.copy, KEY);
    expect(filesLockedWith(f.dir, KEY)).toEqual([]);
    // A note means a file is part-way through a change that may still need the key.
    writeFileSync(path.join(f.dir, note), "{ not json");
    expect(deleteKeyWhenUnused(f.dir, KEY)).toMatchObject({ deleted: false });
    expect(existsSync(f.keyFile)).toBe(true);
  });

  it("writes zeros over the key file's whole length before it deletes it", async () => {
    const f = await decryptedFolderWithKey();
    decryptFile(f.dir, f.copy, KEY);
    const length = readFileSync(f.keyFile).length;
    const busy = () => {
      throw Object.assign(new Error("resource busy or locked"), { code: "EBUSY" });
    };
    // The delete is made to fail, so what the zeros left behind can be read.
    expect(() => deleteKeyWhenUnused(f.dir, KEY, { remove: busy })).toThrow(/busy/);
    const after = readFileSync(f.keyFile);
    expect(after.length).toBe(length);
    expect(after.every((b) => b === 0)).toBe(true);
  });
});
