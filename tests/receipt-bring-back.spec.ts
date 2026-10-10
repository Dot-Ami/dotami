/**
 * [8i] Bringing set-aside receipts back (docs/architecture/expense-records.md § 12): after Start a new
 * key moved the locked receipts into backups/receipts-locked-<time>/, the desktop app can bring them back
 * once Windows opens their old key on this account again. Each receipt is opened with the old key,
 * checked against its Receipt row, locked again with the current key, put into receipts/ and only then
 * removed from the set-aside folder; anything that fails stays exactly where it was and is named.
 *
 * Electron's safeStorage is replaced by a stand-in that wraps per "account", the way DPAPI does: one
 * account can't open what another wrapped. The data file is a real SQLite file (the desktop app's own
 * package, desktop/sqlite.mjs) holding a Receipt table, encrypted with a key in the test that needs it.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { decryptReceipt, encryptedKeyId, encryptReceipt, encryptReceiptsIn, keyIdOf } from "../desktop/receipt-crypto.mjs";
import { isReceiptFileName, RECEIPT_EXTENSIONS } from "../desktop/backup.mjs";
import { bringBackReceipts, listSetAsideReceipts, receiptRowsIn } from "../desktop/receipt-bring-back.mjs";
import { RECEIPT_KEY_FILE, type KeyStore } from "../desktop/receipt-key.mjs";
import { openDatabase, runSql } from "../desktop/sqlite.mjs";
import { listLockedReceiptFolders } from "../desktop/wipe-pending.mjs";
import { pdf, png } from "./helpers/receipt-files";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-bring-back-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

const WINDOWS = "win32";
const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** A stand-in for Electron's safeStorage: what one "account" wraps, only that account can open. */
function accountStore(account: string, { available = true }: { available?: boolean } = {}): KeyStore {
  const secret = createHash("sha256").update(account).digest();
  const xor = (bytes: Buffer) => Buffer.from(bytes.map((b, i) => b ^ secret[i % secret.length]));
  return {
    isEncryptionAvailable: () => available,
    encryptString: (text: string) => Buffer.concat([Buffer.from(`${account}:`, "utf8"), xor(Buffer.from(text, "utf8"))]),
    decryptString(wrapped: Buffer) {
      const prefix = Buffer.from(`${account}:`, "utf8");
      if (!wrapped.subarray(0, prefix.length).equals(prefix)) throw new Error("Error while decrypting the ciphertext provided to safeStorage.decryptString.");
      return xor(wrapped.subarray(prefix.length)).toString("utf8");
    },
  };
}

/** A key file exactly as desktop/receipt-key.mjs saveReceiptKey writes it, wrapped by `store`. */
function keyFileFor(key: Buffer, store: KeyStore): string {
  return JSON.stringify({ format: 1, keyId: keyIdOf(key), wrapped: store.encryptString(key.toString("base64")).toString("base64") });
}

const dbFile = () => path.join(dir, "dotami.db");
const receiptsDir = () => path.join(dir, "receipts");
const backups = () => path.join(dir, "backups");

/** The data file with a Receipt table as the migrations make it (only the columns read here), encrypted when `key` is given. */
function makeDataFile(key: Buffer | null = null) {
  const db = openDatabase(dbFile(), { key });
  try {
    runSql(db, `CREATE TABLE "Receipt" ("id" TEXT NOT NULL PRIMARY KEY, "expenseId" TEXT NOT NULL, "type" TEXT NOT NULL, "bytes" INTEGER NOT NULL, "sha256" TEXT NOT NULL, "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  } finally {
    db.close();
  }
}

function addRow(id: string, type: string, bytes: Buffer, key: Buffer | null = null) {
  const db = openDatabase(dbFile(), { key });
  try {
    db.prepare(`INSERT INTO "Receipt" (id, expenseId, type, bytes, sha256) VALUES (?, ?, ?, ?, ?)`).run(id, `e-${id}`, type, bytes.length, sha256(bytes));
  } finally {
    db.close();
  }
}

/** A set-aside folder as Start a new key leaves it: receipts locked with `oldKey`, and (unless told not to) its key file. */
function setAsideFolder(name: string, oldKey: Buffer, store: KeyStore, { keyFile = true }: { keyFile?: boolean } = {}) {
  const folder = path.join(backups(), name);
  mkdirSync(folder, { recursive: true });
  if (keyFile) writeFileSync(path.join(folder, RECEIPT_KEY_FILE), keyFileFor(oldKey, store));
  return folder;
}

/** One receipt locked with `key` in `folder`, with its row unless told not to. Returns its name and own bytes. */
function lockedReceipt(folder: string, key: Buffer, { ext = "png", row = true, bytes }: { ext?: "png" | "pdf"; row?: boolean; bytes?: Buffer } = {}) {
  const id = randomBytes(16).toString("hex");
  const plain = bytes ?? (ext === "pdf" ? pdf() : png(3, 2, { rgb: [randomBytes(1)[0], 10, 10] }));
  writeFileSync(path.join(folder, `${id}.${ext}`), encryptReceipt(plain, { key, id }));
  if (row) addRow(id, ext === "pdf" ? "application/pdf" : "image/png", plain);
  return { id, name: `${id}.${ext}`, plain };
}

/** Every file under the data folder (but the data file), with its bytes: "nothing moved" means this is unchanged. */
function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    if (!existsSync(at)) return;
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, e.name);
      // A link (a junction, in the tests about links) is the test's own; what it points at is walked as itself.
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(full);
      else if (!e.name.startsWith("dotami.db")) out[path.relative(dir, full)] = readFileSync(full).toString("base64");
    }
  };
  walk(dir);
  return out;
}

/** What the desktop app's main process passes: this start's key open, from DotAmi's own window. */
function onKey(current: Buffer) {
  return { state: "on" as const, key: current, keyId: keyIdOf(current), made: false, setAside: null };
}

function call(folderName: string, store: KeyStore, current: Buffer, extra: Partial<Parameters<typeof bringBackReceipts>[2]> = {}) {
  const lines: string[] = [];
  const result = bringBackReceipts(dir, folderName, {
    fromDotAmi: true,
    opened: onKey(current),
    quitting: false,
    store,
    platform: WINDOWS,
    readRows: () => receiptRowsIn(dbFile(), null),
    log: (line: string) => lines.push(line),
    ...extra,
  });
  return { result, lines };
}

describe("bringing set-aside receipts back", () => {
  it("the old key opens: each receipt comes back locked with the current key, opens with it and matches its row; it leaves the folder, the old key file stays", () => {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const current = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-1000", oldKey, account);
    const a = lockedReceipt(folder, oldKey);
    const b = lockedReceipt(folder, oldKey, { ext: "pdf" });
    const keyFileBefore = readFileSync(path.join(folder, RECEIPT_KEY_FILE));

    const { result, lines } = call("receipts-locked-1000", account, current);
    expect(result).toEqual({ outcome: "done", folder, broughtBack: [a.name, b.name].sort(), oldCopiesLeft: [], left: [] });
    for (const r of [a, b]) {
      const onDisk = readFileSync(path.join(receiptsDir(), r.name));
      // Locked on the disk with the key DotAmi uses now, never the old one, and never plain.
      expect(encryptedKeyId(onDisk)).toBe(keyIdOf(current));
      expect(onDisk.indexOf(r.plain.subarray(0, 12))).toBe(-1);
      const opened = decryptReceipt(onDisk, { key: current, id: r.id });
      expect(opened.equals(r.plain)).toBe(true);
      expect(existsSync(path.join(folder, r.name))).toBe(false);
    }
    // Only the old key file is left in the set-aside folder, byte for byte; no temporary file anywhere.
    expect(readdirSync(folder)).toEqual([RECEIPT_KEY_FILE]);
    expect(readFileSync(path.join(folder, RECEIPT_KEY_FILE)).equals(keyFileBefore)).toBe(true);
    expect(readdirSync(receiptsDir()).sort()).toEqual([a.name, b.name].sort());
    // The log: counts only, never a name, a path or a key id.
    expect(lines).toEqual(["[desktop] set-aside receipts: 2 brought back, 0 left where they were"]);
    for (const line of lines) {
      expect(line).not.toContain(a.id);
      expect(line).not.toContain(dir);
      expect(line).not.toContain(keyIdOf(oldKey));
    }
  });

  it("a key this account can't open (another account wrapped it) moves nothing, and names each receipt", () => {
    makeDataFile();
    const oldKey = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-1001", oldKey, accountStore("the old profile"));
    const a = lockedReceipt(folder, oldKey);
    const b = lockedReceipt(folder, oldKey);
    const before = snapshot();

    const { result, lines } = call("receipts-locked-1001", accountStore("you"), randomBytes(32));
    expect(result).toEqual({
      outcome: "done",
      folder,
      broughtBack: [],
      oldCopiesLeft: [],
      left: [
        { name: a.name, why: "no-key" },
        { name: b.name, why: "no-key" },
      ].sort((x, y) => x.name.localeCompare(y.name)),
    });
    expect(snapshot()).toEqual(before);
    expect(lines).toEqual(["[desktop] set-aside receipts: 0 brought back, 2 left where they were"]);
  });

  it("a folder with no key file moves nothing", () => {
    makeDataFile();
    const oldKey = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-1002", oldKey, accountStore("you"), { keyFile: false });
    const a = lockedReceipt(folder, oldKey);
    const before = snapshot();
    const { result } = call("receipts-locked-1002", accountStore("you"), randomBytes(32));
    expect(result).toMatchObject({ outcome: "done", broughtBack: [], left: [{ name: a.name, why: "no-key" }] });
    expect(snapshot()).toEqual(before);
  });

  it("a key store that isn't available opens no old key: nothing moves", () => {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-1003", oldKey, account);
    lockedReceipt(folder, oldKey);
    const before = snapshot();
    const { result } = call("receipts-locked-1003", accountStore("you", { available: false }), randomBytes(32));
    expect(result).toMatchObject({ outcome: "done", broughtBack: [] });
    expect(snapshot()).toEqual(before);
  });

  it("the key in a second set-aside folder opens the first folder's receipts (a move cut short, then pressed again)", () => {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const first = setAsideFolder("receipts-locked-2000", oldKey, account, { keyFile: false });
    setAsideFolder("receipts-locked-2000-1", oldKey, account);
    const a = lockedReceipt(first, oldKey);
    const current = randomBytes(32);
    const { result } = call("receipts-locked-2000", account, current);
    expect(result).toMatchObject({ outcome: "done", broughtBack: [a.name], left: [] });
    expect(decryptReceipt(readFileSync(path.join(receiptsDir(), a.name)), { key: current, id: a.id }).equals(a.plain)).toBe(true);
  });

  it("a receipt with no row, a row of another type, a changed file, and one already in receipts/ are each left exactly where they were and named; the rest come back", () => {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const current = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-3000", oldKey, account);
    const good = lockedReceipt(folder, oldKey);
    // Its record (and so its row) was deleted since it was set aside.
    const noRow = lockedReceipt(folder, oldKey, { row: false });
    // The row says it is a PDF; the file is named .png.
    const otherType = lockedReceipt(folder, oldKey, { row: false });
    addRow(otherType.id, "application/pdf", otherType.plain);
    // Its bytes no longer match its row: re-encrypted (validly) over different bytes of the same size, so
    // only the SHA-256 can tell; and another over bytes of a different size.
    const changed = lockedReceipt(folder, oldKey);
    const sameSize = Buffer.from(changed.plain);
    sameSize[sameSize.length - 1] ^= 0xff;
    writeFileSync(path.join(folder, changed.name), encryptReceipt(sameSize, { key: oldKey, id: changed.id }));
    const resized = lockedReceipt(folder, oldKey);
    writeFileSync(path.join(folder, resized.name), encryptReceipt(png(5, 5), { key: oldKey, id: resized.id }));
    // A file that fails to open with the key its header names: one byte flipped near the end.
    const damaged = lockedReceipt(folder, oldKey);
    const damagedBytes = readFileSync(path.join(folder, damaged.name));
    damagedBytes[damagedBytes.length - 3] ^= 0xff;
    writeFileSync(path.join(folder, damaged.name), damagedBytes);
    // Put back by hand already: a file of the same name is in receipts/.
    const there = lockedReceipt(folder, oldKey);
    mkdirSync(receiptsDir(), { recursive: true });
    writeFileSync(path.join(receiptsDir(), there.name), "already here");

    const leftNames = [noRow, otherType, changed, resized, damaged, there].map((r) => r.name);
    const before = snapshot();
    const { result, lines } = call("receipts-locked-3000", account, current);
    expect(result).toMatchObject({ outcome: "done", broughtBack: [good.name], oldCopiesLeft: [] });
    const left = Object.fromEntries((result as { left: { name: string; why: string }[] }).left.map((l) => [l.name, l.why]));
    expect(left).toEqual({
      [noRow.name]: "no-record",
      [otherType.name]: "no-record",
      [changed.name]: "changed",
      [resized.name]: "changed",
      [damaged.name]: "changed",
      [there.name]: "already-there",
    });
    // Each one left is byte for byte where it was; the file already in receipts/ is untouched.
    const after = snapshot();
    for (const name of leftNames) expect(after[path.join("backups", "receipts-locked-3000", name)]).toBe(before[path.join("backups", "receipts-locked-3000", name)]);
    expect(readFileSync(path.join(receiptsDir(), there.name), "utf8")).toBe("already here");
    expect(readdirSync(receiptsDir()).sort()).toEqual([good.name, there.name].sort());
    expect(lines).toEqual(["[desktop] set-aside receipts: 1 brought back, 6 left where they were"]);
  });

  it("a write that fails part-way leaves that receipt where it was, removes only what it made, and the next receipt is still tried", () => {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const current = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-4000", oldKey, account);
    const receipts = [lockedReceipt(folder, oldKey), lockedReceipt(folder, oldKey), lockedReceipt(folder, oldKey)].sort((x, y) =>
      x.name.localeCompare(y.name),
    );
    const [first, second, third] = receipts;
    // Something in the way of the temporary name, not DotAmi's: the write can't be made, and it stays.
    mkdirSync(path.join(receiptsDir(), `${first.name}.encrypting`), { recursive: true });
    const before = snapshot();
    // The second fails after its file was renamed into place (as if reading it back failed): undone.
    const { result } = call("receipts-locked-4000", account, current, {
      onStep: (step: string, name: string) => {
        if (step === "placed" && name === second.name) throw new Error("stand-in: the read-back failed");
      },
    });
    expect(result).toMatchObject({
      outcome: "done",
      broughtBack: [third.name],
      left: [
        { name: first.name, why: "not-written" },
        { name: second.name, why: "not-written" },
      ],
    });
    const after = snapshot();
    for (const r of [first, second]) {
      const at = path.join("backups", "receipts-locked-4000", r.name);
      expect(after[at]).toBe(before[at]);
      expect(existsSync(path.join(receiptsDir(), r.name))).toBe(false);
    }
    // Only the folder that was in the way is left in receipts/ beside the receipt that came back.
    expect(readdirSync(receiptsDir()).sort()).toEqual([`${first.name}.encrypting`, third.name].sort());
    expect(lstatSync(path.join(receiptsDir(), `${first.name}.encrypting`)).isDirectory()).toBe(true);
  });

  it("stopped after the temporary file was written: the set-aside copy is untouched, and the next start's pass removes the leftover", () => {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const current = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-4100", oldKey, account);
    const a = lockedReceipt(folder, oldKey);
    const setAsideBefore = readFileSync(path.join(folder, a.name));
    // A crash right after the temporary file is flushed: the leftover is what a real crash leaves.
    let leftover: Buffer | null = null;
    call("receipts-locked-4100", account, current, {
      onStep: (step: string, name: string) => {
        if (step === "temp-written" && name === a.name) {
          leftover = readFileSync(path.join(receiptsDir(), `${a.name}.encrypting`));
          throw new Error("stand-in: stopped");
        }
      },
    });
    expect(readFileSync(path.join(folder, a.name)).equals(setAsideBefore)).toBe(true);
    expect(leftover).not.toBeNull();
    writeFileSync(path.join(receiptsDir(), `${a.name}.encrypting`), leftover!);
    // The desktop app's next start runs the first-start pass over receipts/ (desktop/main.mjs).
    const pass = encryptReceiptsIn(receiptsDir(), current, { isReceiptName: isReceiptFileName });
    expect(pass.leftoversRemoved).toBe(1);
    expect(readdirSync(receiptsDir())).toEqual([]);
  });

  it("leaves plain files, unfinished writes and files DotAmi didn't name alone", () => {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-4200", oldKey, account);
    const a = lockedReceipt(folder, oldKey);
    const partialId = randomBytes(16).toString("hex");
    writeFileSync(path.join(folder, `${partialId}.pdf.partial`), encryptReceipt(pdf(), { key: oldKey, id: partialId }));
    writeFileSync(path.join(folder, `${randomBytes(16).toString("hex")}.png`), png(2, 2));
    writeFileSync(path.join(folder, "my-notes.txt"), "mine");
    const { result } = call("receipts-locked-4200", account, randomBytes(32));
    expect(result).toMatchObject({ outcome: "done", broughtBack: [a.name], left: [] });
    expect(readdirSync(folder).length).toBe(4);
  });

  it("reads the rows from an encrypted data file with its key", () => {
    const dbKey = randomBytes(32);
    makeDataFile(dbKey);
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const current = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-4300", oldKey, account);
    const id = randomBytes(16).toString("hex");
    const plain = png(2, 3);
    writeFileSync(path.join(folder, `${id}.png`), encryptReceipt(plain, { key: oldKey, id }));
    addRow(id, "image/png", plain, dbKey);
    expect(receiptRowsIn(dbFile(), dbKey).get(id)).toEqual({ type: "image/png", bytes: plain.length, sha256: sha256(plain) });
    const { result } = call("receipts-locked-4300", account, current, { readRows: () => receiptRowsIn(dbFile(), dbKey) });
    expect(result).toMatchObject({ outcome: "done", broughtBack: [`${id}.png`] });
  });
});

describe("when bringing receipts back is refused, nothing moves", () => {
  function ready() {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const folder = setAsideFolder("receipts-locked-5000", oldKey, account);
    lockedReceipt(folder, oldKey);
    return { account, folder };
  }

  it.each([
    ["not DotAmi's own window", { fromDotAmi: false }, "not-dotami-window"],
    ["this start's key isn't open", { opened: { state: "key-unreadable", keyId: null, locked: 1, missing: true, storeUnavailable: false } }, "no-current-key"],
    ["no start yet", { opened: null }, "no-current-key"],
    ["DotAmi is closing", { quitting: true }, "closing"],
    [
      "the data file can't be read",
      {
        readRows: () => {
          throw new Error("SQLITE_NOTADB");
        },
      },
      "data-file-unreadable",
    ],
  ])("%s", (_label, extra, reason) => {
    const { account } = ready();
    const before = snapshot();
    const { result, lines } = call("receipts-locked-5000", account, randomBytes(32), extra as never);
    expect(result).toEqual({ outcome: "refused", reason });
    expect(snapshot()).toEqual(before);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[desktop\] bringing set-aside receipts back was refused: /);
    expect(lines[0]).not.toContain(dir);
  });

  it.each(["receipts-before-restore-5000", "receipts-locked-5000/..", "..", "receipts-locked-", "receipts-locked-5000 ", "../backups/receipts-locked-5000", "receipts-locked-9999"])(
    "a folder name DotAmi doesn't make, or none there: %j",
    (name) => {
      const { account } = ready();
      mkdirSync(path.join(backups(), "receipts-before-restore-5000"), { recursive: true });
      const before = snapshot();
      const { result } = call(name, account, randomBytes(32));
      expect(result).toEqual({ outcome: "refused", reason: "not-a-set-aside-folder" });
      expect(snapshot()).toEqual(before);
    },
  );

  it("a set-aside folder that is a link (a junction on Windows) is refused, never followed", () => {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const elsewhere = path.join(dir, "elsewhere");
    mkdirSync(elsewhere);
    writeFileSync(path.join(elsewhere, RECEIPT_KEY_FILE), keyFileFor(oldKey, account));
    lockedReceipt(elsewhere, oldKey);
    mkdirSync(backups());
    symlinkSync(elsewhere, path.join(backups(), "receipts-locked-6000"), "junction");
    const before = snapshot();
    const { result } = call("receipts-locked-6000", account, randomBytes(32));
    expect(result).toEqual({ outcome: "refused", reason: "not-a-set-aside-folder" });
    expect(snapshot()).toEqual(before);
  });

  it("a backups folder that is a link is refused, never followed", () => {
    makeDataFile();
    const account = accountStore("you");
    const oldKey = randomBytes(32);
    const realBackups = path.join(dir, "real-backups");
    const folder = path.join(realBackups, "receipts-locked-6100");
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, RECEIPT_KEY_FILE), keyFileFor(oldKey, account));
    lockedReceipt(folder, oldKey);
    symlinkSync(realBackups, backups(), "junction");
    const before = snapshot();
    const { result } = call("receipts-locked-6100", account, randomBytes(32));
    expect(result).toEqual({ outcome: "refused", reason: "not-a-set-aside-folder" });
    expect(snapshot()).toEqual(before);
  });
});

describe("the list of set-aside folders the page shows", () => {
  it("names each receipts-locked folder that holds receipts, counts them, and says how many an old key here opens", () => {
    makeDataFile();
    const account = accountStore("you");
    const opens = randomBytes(32);
    const lost = randomBytes(32);
    const a = setAsideFolder("receipts-locked-7000", opens, account);
    lockedReceipt(a, opens);
    lockedReceipt(a, opens);
    lockedReceipt(a, lost); // another key, nowhere to be found
    const b = setAsideFolder("receipts-locked-7001", lost, accountStore("the old profile"));
    lockedReceipt(b, lost);
    // Only the old key file left (everything was brought back): nothing to list.
    setAsideFolder("receipts-locked-7002", opens, account);
    // Not Start a new key's, not DotAmi's name: never listed here.
    mkdirSync(path.join(backups(), "receipts-before-restore-7003"));
    mkdirSync(path.join(backups(), "my-folder"));

    const lines: string[] = [];
    const listed = listSetAsideReceipts(dir, { fromDotAmi: true, opened: onKey(randomBytes(32)), store: account, platform: WINDOWS, log: (l: string) => lines.push(l) });
    expect(listed).toEqual({
      outcome: "listed",
      folders: [
        { name: "receipts-locked-7000", path: a, receipts: 3, canOpen: 2 },
        { name: "receipts-locked-7001", path: b, receipts: 1, canOpen: 0 },
      ],
    });
    // The server counts the same folders from their names and files (no key needed for that).
    expect(listLockedReceiptFolders(dbFile()).names).toEqual(["receipts-locked-7000", "receipts-locked-7001"]);
  });

  it("counts a folder holding a receipt of any type DotAmi keeps (its own list of extensions matches backup.mjs)", () => {
    for (const [i, ext] of Object.values(RECEIPT_EXTENSIONS).entries()) {
      const folder = path.join(backups(), `receipts-locked-80${i}`);
      mkdirSync(folder, { recursive: true });
      writeFileSync(path.join(folder, `${randomBytes(16).toString("hex")}.${ext}`), "x");
    }
    expect(listLockedReceiptFolders(dbFile()).names).toHaveLength(Object.values(RECEIPT_EXTENSIONS).length);
  });

  it("answers only DotAmi's own window, and only while this start's key is open", () => {
    const account = accountStore("you");
    const log = () => {};
    expect(listSetAsideReceipts(dir, { fromDotAmi: false, opened: onKey(randomBytes(32)), store: account, platform: WINDOWS, log })).toEqual({
      outcome: "refused",
      reason: "not-dotami-window",
    });
    expect(listSetAsideReceipts(dir, { fromDotAmi: true, opened: { state: "no-key-store" }, store: account, platform: WINDOWS, log } as never)).toEqual({
      outcome: "refused",
      reason: "no-current-key",
    });
    expect(listSetAsideReceipts(dir, { fromDotAmi: true, opened: onKey(randomBytes(32)), store: account, platform: WINDOWS, log })).toEqual({ outcome: "listed", folders: [] });
  });
});
