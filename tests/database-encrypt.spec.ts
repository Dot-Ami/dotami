/**
 * [8i] Encrypting an existing plain data file, once, without ever losing data
 * (desktop/encrypt-database.mjs; docs/architecture/database-encryption.md § 6).
 *
 * - Every table's seeded data survives, the file opens only with its key, and no plain byte of the
 *   person's words is left anywhere in the data folder (a raw scan of every file); the plain file holds
 *   them before (the control).
 * - Stopped at every step, as a crash would, the next start (resumeEncryption) finishes it, or leaves
 *   the plain file whole when it stopped before the swap.
 * - A file another program holds, a plain file written to after its copy was made, a note that can't be
 *   read, files in a state DotAmi didn't leave, and a damaged file: nothing is lost or removed.
 * - The wipe really writes zeros over the plain file's whole length before it deletes it, and a plain
 *   copy whose wipe is owed is never forgotten: no second file is encrypted while the note names it.
 * - A data file another program holds is never taken for a missing one (fileKind).
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

import { createDatabaseClient } from "@/lib/db/client";
import { TABLES } from "@/lib/privacy/inventory";
import { contentsOf } from "../desktop/database-copy.mjs";
import {
  COPY_SUFFIX,
  encryptFile,
  EncryptionStopped,
  ENCRYPTING_NOTE,
  notePath,
  PLAIN_SUFFIX,
  plainLeftovers,
  readNote,
  resumeEncryption,
  setAsideLockedFile,
  wipeFile,
  type CrashPoint,
} from "../desktop/encrypt-database.mjs";
import { CannotOpenDatabase, FileNotReadable, fileKind, openDatabase } from "../desktop/sqlite.mjs";
import { fileUrl, migratedFile } from "./helpers/migrated-db";
import { countEveryTable, seedEveryTable } from "./helpers/seed-every-table";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const root = mkdtempSync(path.join(tmpdir(), "dotami-encrypt-"));
afterAll(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }));

const KEY = Buffer.alloc(32, 0x42);
const MARKER = "zq-encrypt-marker-5521";
const MODELS = TABLES.map((t) => t.model);

let n = 0;
/** A data folder with a migrated, seeded, plain dotami.db; the client is closed so the file can be renamed. */
async function seededFolder() {
  n += 1;
  const dir = path.join(root, `folder-${n}`);
  mkdirSync(dir, { recursive: true });
  const file = migratedFile(path.join(dir, "dotami.db"));
  const db = createDatabaseClient({ url: fileUrl(file) });
  await seedEveryTable(db, MARKER);
  const counts = await countEveryTable(db, MODELS);
  await db.$disconnect();
  return { dir, file, counts, contents: contentsOfFile(file, null) };
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

/** The file is encrypted, holds what it held, opens only with the key, and nothing plain or half-done is left. */
async function expectEncryptedWhole(dir: string, file: string, before: { counts: Record<string, number>; contents: unknown }) {
  expect(fileKind(file)).toBe("encrypted");
  expect(() => openDatabase(file, { readonly: true })).toThrow(CannotOpenDatabase);
  expect(contentsOfFile(file, KEY)).toEqual(before.contents);
  const db = createDatabaseClient({ url: fileUrl(file), key: KEY });
  expect(await countEveryTable(db, MODELS)).toEqual(before.counts);
  await db.$disconnect();
  expect(filesHoldingMarker(dir)).toEqual([]);
  expect(readdirSync(dir).sort()).toEqual(["dotami.db"]);
}

describe("encrypting a plain data file", () => {
  it("keeps every table's seeded data, opens only with the key, and leaves no plain byte in the folder", async () => {
    const before = await seededFolder();
    // The guard: every table in the inventory has rows, so "every table survives" means something.
    for (const model of MODELS) expect(before.counts[model], model).toBeGreaterThan(0);
    // The control: the plain file holds the person's words as they were typed.
    expect(filesHoldingMarker(before.dir)).toEqual(["dotami.db"]);

    expect(encryptFile(before.dir, before.file, KEY)).toEqual({ wipePending: false });
    await expectEncryptedWhole(before.dir, before.file, before);
  });

  it("refuses a damaged file, changing nothing", async () => {
    const { dir, file } = await seededFolder();
    // Damage a page in the middle of the file (the header stays, so it still reads as plain).
    const bytes = readFileSync(file);
    bytes.fill(0x5a, 8192, 12288);
    writeFileSync(file, bytes);
    const was = sha(file);
    expect(() => encryptFile(dir, file, KEY)).toThrow(EncryptionStopped);
    expect(sha(file)).toBe(was);
    expect(readdirSync(dir).sort()).toEqual(["dotami.db"]);
  });
});

describe("stopped at every step, the next start finishes it", () => {
  const POINTS: CrashPoint[] = ["copied", "checked", "note-swap", "first-rename", "second-rename", "note-wipe", "plain-deleted"];

  it.each(POINTS)("stopped after %s", async (crashAt) => {
    const before = await seededFolder();
    expect(encryptFile(before.dir, before.file, KEY, { crashAt })).toEqual({ crashed: true });
    const resumed = resumeEncryption(before.dir, KEY);
    if (crashAt === "copied" || crashAt === "checked") {
      // Stopped before the note: the plain file was never touched, the copy is wiped, and the next start
      // asks again; encrypting then works as the first time.
      expect(resumed).toEqual({ action: "cleared" });
      expect(fileKind(before.file)).toBe("plain");
      expect(contentsOfFile(before.file, null)).toEqual(before.contents);
      expect(readdirSync(before.dir).sort()).toEqual(["dotami.db"]);
      encryptFile(before.dir, before.file, KEY);
    } else {
      expect(resumed).toMatchObject({ action: "finished", wipePending: false });
    }
    await expectEncryptedWhole(before.dir, before.file, before);
  });

  it("a first rename another program refuses changes nothing; the next start does it", async () => {
    const before = await seededFolder();
    const refuse = () => {
      throw Object.assign(new Error("resource busy or locked"), { code: "EBUSY" });
    };
    expect(() => encryptFile(before.dir, before.file, KEY, { rename: refuse })).toThrow(/Another program has dotami.db open \(EBUSY\)/);
    expect(fileKind(before.file)).toBe("plain");
    expect(contentsOfFile(before.file, null)).toEqual(before.contents);
    expect(readNote(before.dir)).toMatchObject({ step: "swap", file: "dotami.db" });
    expect(resumeEncryption(before.dir, KEY)).toMatchObject({ action: "finished", wipePending: false });
    await expectEncryptedWhole(before.dir, before.file, before);
  });

  it("a plain file written to after its copy was made: the copy is thrown away, never swapped in", async () => {
    const before = await seededFolder();
    encryptFile(before.dir, before.file, KEY, { crashAt: "note-swap" });
    // A copy run from source writes to the still-plain file before the next desktop start.
    const db = createDatabaseClient({ url: fileUrl(before.file) });
    await db.personStatement.create({ data: { userId: (await db.user.findFirstOrThrow()).id, text: `later ${MARKER}`, saidAt: new Date() } });
    await db.$disconnect();
    const withLater = contentsOfFile(before.file, null);

    expect(resumeEncryption(before.dir, KEY)).toEqual({ action: "restart", file: before.file });
    expect(readdirSync(before.dir).sort()).toEqual(["dotami.db"]);
    expect(contentsOfFile(before.file, null)).toEqual(withLater);
    encryptFile(before.dir, before.file, KEY);
    expect(contentsOfFile(before.file, KEY)).toEqual(withLater);
    expect(filesHoldingMarker(before.dir)).toEqual([]);
  });

  it("a wipe that can't finish stays owed in the note, and finishes at a later start", async () => {
    const before = await seededFolder();
    encryptFile(before.dir, before.file, KEY, { crashAt: "note-wipe" });
    const plain = `${before.file}${PLAIN_SUFFIX}`;
    // Something holds the plain copy so it can't be overwritten: stood in for by a folder of its name.
    renameSync(plain, `${plain}.aside`);
    mkdirSync(plain);
    expect(resumeEncryption(before.dir, KEY)).toMatchObject({ action: "finished", wipePending: true });
    expect(readNote(before.dir)).toMatchObject({ step: "wipe" });
    rmSync(plain, { recursive: true });
    renameSync(`${plain}.aside`, plain);
    expect(resumeEncryption(before.dir, KEY)).toMatchObject({ action: "finished", wipePending: false });
    await expectEncryptedWhole(before.dir, before.file, before);
  });

  it("a note that can't be read: the plain file stays and the leftovers go", async () => {
    const before = await seededFolder();
    encryptFile(before.dir, before.file, KEY, { crashAt: "checked" });
    writeFileSync(notePath(before.dir), "{ not json");
    expect(resumeEncryption(before.dir, KEY)).toEqual({ action: "cleared" });
    expect(readdirSync(before.dir).sort()).toEqual(["dotami.db"]);
    expect(contentsOfFile(before.file, null)).toEqual(before.contents);
  });

  it("files in a state DotAmi didn't leave: it stops and removes nothing", async () => {
    const before = await seededFolder();
    encryptFile(before.dir, before.file, KEY, { crashAt: "first-rename" });
    // Someone deletes the encrypted copy by hand: the note says swap, the data file is gone, no copy.
    rmSync(`${before.file}${COPY_SUFFIX}`);
    const left = readdirSync(before.dir).sort();
    expect(() => resumeEncryption(before.dir, KEY)).toThrow(EncryptionStopped);
    expect(() => resumeEncryption(before.dir, KEY)).toThrow(/didn't change or remove anything/);
    expect(readdirSync(before.dir).sort()).toEqual(left);
    expect(left).toEqual(["dotami.db.plain-to-wipe", ENCRYPTING_NOTE].sort());
  });

  it("without the key, a note is left as it is", async () => {
    const before = await seededFolder();
    encryptFile(before.dir, before.file, KEY, { crashAt: "note-wipe" });
    const left = readdirSync(before.dir).sort();
    expect(resumeEncryption(before.dir, null)).toEqual({ action: "none" });
    expect(readdirSync(before.dir).sort()).toEqual(left);
    expect(statSync(`${before.file}${PLAIN_SUFFIX}`).size).toBeGreaterThan(0);
    expect(existsSync(notePath(before.dir))).toBe(true);
  });
});

describe("a data file whose key is lost is set aside, never deleted ([8i])", () => {
  it("moves it and its journal into backups/ under a name Delete's safety-copies box never matches", async () => {
    const before = await seededFolder();
    encryptFile(before.dir, before.file, KEY);
    writeFileSync(`${before.file}-journal`, "journal");
    const bytes = readFileSync(before.file);
    const moved = setAsideLockedFile(before.dir, before.file, () => 77);
    expect(moved).toBe(path.join(before.dir, "backups", "dotami-locked-77.db"));
    expect(readFileSync(moved!).equals(bytes)).toBe(true);
    expect(readFileSync(`${moved}-journal`, "utf8")).toBe("journal");
    expect(existsSync(before.file)).toBe(false);
    // Not a name DotAmi gives its safety copies (desktop/wipe-pending.mjs SAFETY_COPY_NAME).
    expect(/^dotami-before-[A-Za-z0-9_-]+\.db$/.test(path.basename(moved!))).toBe(false);
    // Still opens, if its key comes back (the stand-in journal above is not a real one: set aside first).
    rmSync(`${moved}-journal`);
    expect(contentsOfFile(moved!, KEY)).toEqual(before.contents);
    expect(setAsideLockedFile(before.dir, before.file)).toBeNull();
  });
});

describe("a plain copy whose wipe is owed is never forgotten", () => {
  /** A plain safety copy in backups/, as the migrator leaves one before an update. */
  async function plainSafetyCopy(dir: string) {
    const other = await seededFolder();
    mkdirSync(path.join(dir, "backups"), { recursive: true });
    const copy = path.join(dir, "backups", "dotami-before-001-x.db");
    copyFileSync(other.file, copy);
    return { copy, contents: other.contents };
  }

  it("no second file is encrypted while the note names the data file's plain copy; once it is wiped, the copy is", async () => {
    const before = await seededFolder();
    // Stopped after the note says "wipe": the same files on the disk as a wipe another program held up.
    encryptFile(before.dir, before.file, KEY, { crashAt: "note-wipe" });
    const plain = `${before.file}${PLAIN_SUFFIX}`;
    const safety = await plainSafetyCopy(before.dir);
    const copyWas = sha(safety.copy);

    let stopped: unknown = null;
    try {
      encryptFile(before.dir, safety.copy, KEY);
    } catch (error) {
      stopped = error;
    }
    expect(stopped).toBeInstanceOf(EncryptionStopped);
    expect((stopped as EncryptionStopped).kind).toBe("pending");
    // The note still names the data file's plain copy, which is still there to be wiped; the safety copy is untouched.
    expect(readNote(before.dir)).toMatchObject({ step: "wipe", file: "dotami.db" });
    expect(existsSync(plain)).toBe(true);
    expect(sha(safety.copy)).toBe(copyWas);
    expect(plainLeftovers(before.dir)).toEqual([plain]);

    // The next start finishes the wipe, and then the safety copy is encrypted too: nothing plain is left.
    expect(resumeEncryption(before.dir, KEY)).toMatchObject({ action: "finished", wipePending: false });
    expect(encryptFile(before.dir, safety.copy, KEY)).toEqual({ wipePending: false });
    expect(plainLeftovers(before.dir)).toEqual([]);
    expect(contentsOfFile(safety.copy, KEY)).toEqual(safety.contents);
    expect(filesHoldingMarker(before.dir)).toEqual([]);
  });

  it("a plain copy no note names, beside a file the key opens, is wiped at the next start; one beside a file it doesn't open stays", async () => {
    const before = await seededFolder();
    encryptFile(before.dir, before.file, KEY, { crashAt: "note-wipe" });
    const plain = `${before.file}${PLAIN_SUFFIX}`;
    // What an earlier build could leave: the note gone, the plain copy still there.
    rmSync(notePath(before.dir));
    expect(filesHoldingMarker(before.dir)).toEqual([path.basename(plain)]);

    // Without the key, or with a key that doesn't open the file beside it, nothing is touched.
    expect(resumeEncryption(before.dir, null)).toEqual({ action: "none" });
    expect(resumeEncryption(before.dir, Buffer.alloc(32, 0x07))).toEqual({ action: "none" });
    expect(existsSync(plain)).toBe(true);

    expect(resumeEncryption(before.dir, KEY)).toEqual({ action: "cleared" });
    await expectEncryptedWhole(before.dir, before.file, before);
  });
});

describe("the wipe", () => {
  it("writes zeros over the plain file's whole length before it deletes it", () => {
    const file = path.join(root, "wipe-me.db");
    // Longer than one 64 KB block and not a multiple of it, so the last, partial block is covered too.
    const words = Buffer.from(`${MARKER} `.repeat(9000));
    writeFileSync(file, words);
    // The delete is made to fail, as when another program grabs the file at the last moment, so what the
    // zeros left behind can be read.
    const busy = () => {
      throw Object.assign(new Error("resource busy or locked"), { code: "EBUSY" });
    };
    expect(() => wipeFile(file, { remove: busy })).toThrow(/busy/);
    const after = readFileSync(file);
    expect(after.length).toBe(words.length);
    expect(after.every((b) => b === 0)).toBe(true);
    // The control: the same file before the wipe holds the words.
    expect(words.includes(Buffer.from(MARKER))).toBe(true);
    wipeFile(file);
    expect(existsSync(file)).toBe(false);
  });
});

describe("what a data file is (fileKind)", () => {
  it("a missing file is absent; a file this account can't read now is never taken for absent", async () => {
    expect(fileKind(path.join(root, "no-such.db"))).toBe("absent");
    const { file } = await seededFolder();
    expect(fileKind(file)).toBe("plain");
    if (process.platform === "win32") {
      // Held by another program with no sharing, as an antivirus scan or a sync app can (Windows: EBUSY).
      const holder = spawn("powershell.exe", [
        "-NoProfile",
        "-Command",
        `$f = [System.IO.File]::Open('${file.replace(/'/g, "''")}', 'Open', 'Read', 'None'); Write-Output held; Start-Sleep -Seconds 60; $f.Close()`,
      ]);
      try {
        await new Promise<void>((resolve, reject) => {
          holder.stdout.on("data", (d: Buffer) => d.toString().includes("held") && resolve());
          holder.on("exit", () => reject(new Error("the holder stopped before it held the file")));
        });
        expect(() => fileKind(file)).toThrow(FileNotReadable);
      } finally {
        holder.kill();
        await new Promise((r) => holder.once("exit", r));
      }
    } else if (process.getuid?.() !== 0) {
      // Elsewhere: a file this account may not read (EACCES). Root reads anything, so it can't show this.
      chmodSync(file, 0o000);
      try {
        expect(() => fileKind(file)).toThrow(FileNotReadable);
      } finally {
        chmodSync(file, 0o644);
      }
    }
    expect(fileKind(file)).toBe("plain");
  });
});
