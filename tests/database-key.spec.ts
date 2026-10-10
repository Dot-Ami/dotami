/**
 * [8i] The data file's key (desktop/database-key.mjs; docs/architecture/database-encryption.md § 2 and
 * § 10): made only when something is to be encrypted, kept only wrapped by the operating system's per-user
 * protection, read back and opened before it is used, and never replaced while anything is locked with
 * it. Electron's safeStorage is replaced by a stand-in that wraps per "account", the way DPAPI does: one
 * account can't open what another wrapped (the same stand-in as tests/receipt-key.spec.ts).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DATABASE_KEY_FILE,
  KeyNotReadableAfterSave,
  makeDatabaseKey,
  NoKeyStore,
  KeyStoreNotSaved,
  openDatabaseKey,
  setAsideLockedFileUnderNewKey,
} from "../desktop/database-key.mjs";
import type { KeyStore } from "../desktop/receipt-key.mjs";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-database-key-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

const WINDOWS = "win32";
const saved = async () => true;
const make = (folder: string, store: KeyStore, options: Parameters<typeof makeDatabaseKey>[2] = {}) =>
  makeDatabaseKey(folder, store, { platform: WINDOWS, keyStoreSaved: saved, ...options });
const open = (folder: string, store: KeyStore, locked: boolean) => openDatabaseKey(folder, store, { locked, platform: WINDOWS });

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

describe("making the key", () => {
  it("saves it wrapped, never in the clear, and opens it again at the next start", async () => {
    const store = accountStore("dot");
    expect(open(dir, store, false)).toEqual({ state: "none", unreadable: false });
    const { key, keyId, setAside } = await make(dir, store);
    expect(key).toHaveLength(32);
    expect(setAside).toBeNull();
    const file = readFileSync(path.join(dir, DATABASE_KEY_FILE));
    // The key's bytes, its base64 and its hex appear nowhere in the file.
    for (const form of [key, Buffer.from(key.toString("base64")), Buffer.from(key.toString("hex"))]) expect(file.includes(form)).toBe(false);
    expect(Object.keys(JSON.parse(file.toString("utf8"))).sort()).toEqual(["format", "keyId", "wrapped"]);
    expect(open(dir, store, true)).toEqual({ state: "on", key, keyId });
  });

  it("isn't saved until Windows' own key is on the disk, and isn't saved at all with no real key store", async () => {
    await expect(make(dir, accountStore("dot"), { keyStoreSaved: async () => false })).rejects.toThrow(KeyStoreNotSaved);
    await expect(make(dir, accountStore("dot", { available: false }))).rejects.toThrow(NoKeyStore);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("is read back from the disk and opened before it is used: a key that can't be opened is removed, never used", async () => {
    // A key store that wraps but can't open what it wrapped (Local State replaced in between, say).
    const broken: KeyStore = { ...accountStore("dot"), decryptString: () => { throw new Error("can't"); } };
    await expect(make(dir, broken)).rejects.toThrow(KeyNotReadableAfterSave);
    expect(existsSync(path.join(dir, DATABASE_KEY_FILE))).toBe(false);
  });

  it("moves a key file this account can't open to backups/ (never deletes it) when nothing is locked with it", async () => {
    await make(dir, accountStore("someone-else"));
    const old = readFileSync(path.join(dir, DATABASE_KEY_FILE));
    expect(open(dir, accountStore("dot"), false)).toEqual({ state: "none", unreadable: true });
    const { setAside } = await make(dir, accountStore("dot"), { now: () => 1234 });
    expect(setAside).toBe(path.join(dir, "backups", "database-key-unreadable-1234.key"));
    expect(readFileSync(setAside!)).toEqual(old);
  });
});

describe("when the key can't be opened and something is locked with it", () => {
  it("another account's key: key-unreadable, and nothing on the disk changes", async () => {
    await make(dir, accountStore("someone-else"));
    const before = readFileSync(path.join(dir, DATABASE_KEY_FILE));
    expect(open(dir, accountStore("dot"), true)).toMatchObject({ state: "key-unreadable", missing: false });
    expect(readFileSync(path.join(dir, DATABASE_KEY_FILE))).toEqual(before);
    expect(readdirSync(dir)).toEqual([DATABASE_KEY_FILE]);
  });

  it("a missing key file is never replaced while something is locked", () => {
    expect(open(dir, accountStore("dot"), true)).toEqual({ state: "key-unreadable", keyId: null, missing: true, storeUnavailable: false });
    expect(readdirSync(dir)).toEqual([]);
  });

  it("a damaged key file, or one holding another key under this id, opens nothing", async () => {
    const { keyId } = await make(dir, accountStore("dot"));
    writeFileSync(path.join(dir, DATABASE_KEY_FILE), "{ not json");
    expect(open(dir, accountStore("dot"), true)).toMatchObject({ state: "key-unreadable", keyId: null });
    // A wrapped key whose id doesn't match the id written beside it.
    const other = await make(dir, accountStore("dot"));
    const parsed = JSON.parse(readFileSync(path.join(dir, DATABASE_KEY_FILE), "utf8"));
    writeFileSync(path.join(dir, DATABASE_KEY_FILE), JSON.stringify({ ...parsed, keyId }));
    expect(other.keyId).not.toBe(keyId);
    expect(open(dir, accountStore("dot"), true)).toMatchObject({ state: "key-unreadable", keyId });
  });

  it("no key store right now, with something locked: key-unreadable, not 'no key store'", async () => {
    await make(dir, accountStore("dot"));
    // Said apart from a lost key: a restart may bring the store back, so the window mustn't offer to give anything up.
    expect(open(dir, accountStore("dot", { available: false }), true)).toMatchObject({ state: "key-unreadable", storeUnavailable: true });
    expect(open(dir, accountStore("dot"), true)).toMatchObject({ state: "on" });
    expect(open(dir, accountStore("dot", { available: false }), false)).toEqual({ state: "no-key-store" });
  });
});

describe("a restore from the lost-key window: the locked file set aside, then the new key saved", () => {
  /** A data folder whose data file is locked with a key this account can't open: another account's key file. */
  async function lockedFolder() {
    await make(dir, accountStore("someone-else"));
    const dbFile = path.join(dir, "dotami.db");
    writeFileSync(dbFile, Buffer.from("encrypted bytes stand-in"));
    return { dbFile, keyBefore: readFileSync(path.join(dir, DATABASE_KEY_FILE)), dbBefore: readFileSync(dbFile) };
  }
  const newKey = Buffer.alloc(32, 0x5e);
  const backupsHolding = (prefix: string) => (existsSync(path.join(dir, "backups")) ? readdirSync(path.join(dir, "backups")).filter((f) => f.startsWith(prefix)) : []);

  it("does both, in that order, and deletes nothing", async () => {
    const { dbBefore, keyBefore } = await lockedFolder();
    const done = await setAsideLockedFileUnderNewKey(dir, path.join(dir, "dotami.db"), accountStore("dot"), newKey, { platform: WINDOWS, keyStoreSaved: saved, now: () => 9 });
    expect(done.lockedTo).toMatch(/dotami-locked-\d+\.db$/);
    expect(readFileSync(done.lockedTo!).equals(dbBefore)).toBe(true);
    expect(readFileSync(done.keySetAside!).equals(keyBefore)).toBe(true);
    expect(open(dir, accountStore("dot"), true)).toMatchObject({ state: "on", key: newKey });
    expect(existsSync(path.join(dir, "dotami.db"))).toBe(false);
  });

  it("a locked file another program holds: nothing changes, and no new key is saved", async () => {
    const { dbFile, dbBefore, keyBefore } = await lockedFolder();
    const held = () => {
      throw Object.assign(new Error("resource busy or locked"), { code: "EBUSY" });
    };
    const failed = await setAsideLockedFileUnderNewKey(dir, dbFile, accountStore("dot"), newKey, { platform: WINDOWS, keyStoreSaved: saved, setAside: held }).then(
      () => null,
      (error: unknown) => error,
    );
    // The key file is the one found, byte for byte: never a new key beside the old locked file.
    expect(readFileSync(path.join(dir, DATABASE_KEY_FILE)).equals(keyBefore)).toBe(true);
    expect(backupsHolding("database-key-")).toEqual([]);
    expect(readFileSync(dbFile).equals(dbBefore)).toBe(true);
    expect(failed).toMatchObject({ step: "set-aside", code: "EBUSY" });
  });

  it("a key that can't be saved: the locked file is put back where it was, and the old key file stays", async () => {
    const { dbFile, dbBefore, keyBefore } = await lockedFolder();
    await expect(
      setAsideLockedFileUnderNewKey(dir, dbFile, accountStore("dot"), newKey, { platform: WINDOWS, keyStoreSaved: async () => false }),
    ).rejects.toMatchObject({ step: "key" });
    expect(readFileSync(dbFile).equals(dbBefore)).toBe(true);
    expect(readFileSync(path.join(dir, DATABASE_KEY_FILE)).equals(keyBefore)).toBe(true);
    expect(backupsHolding("dotami-locked-")).toEqual([]);
  });
});
