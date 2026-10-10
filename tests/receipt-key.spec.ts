/**
 * [8i] The receipts' key (desktop/receipt-key.mjs; expense-records.md § 9, "The key" and "Losing the
 * key"): made once, kept only wrapped by the operating system's per-user protection, opened again at the
 * next start; what happens when it can't be opened; no key store meaning "not encrypted", never a key
 * file of DotAmi's own; never saved before Windows' own key for it is on the disk; and "Start a new
 * key" setting the locked receipts and the key file aside (expense-records.md § 10). Electron's
 * safeStorage is replaced by a stand-in that wraps per "account", the way DPAPI does: one account can't
 * open what another wrapped.
 *
 * Each test names the platform it models instead of taking the one it runs on: the same file runs on
 * Windows here and on GitHub's Linux runner, where the production rule is different (Electron's fixed
 * built-in password, "basic_text", is no key store). Most tests model Windows; "which key stores count"
 * below models Linux and a Mac by name.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { decryptReceipt, encryptReceipt, keyIdOf } from "../desktop/receipt-crypto.mjs";
import {
  countLockedReceipts,
  KeyStoreNotSaved,
  keyStoreAvailable,
  localStateHoldsKey,
  newReceiptKey,
  NoKeyStore,
  openReceiptKey,
  RECEIPT_KEY_FILE,
  receiptLockEnv,
  restartForNewKey,
  revertReceiptKey,
  saveReceiptKey,
  setAsideLockedReceipts,
  waitForLocalState,
  type KeyStore,
} from "../desktop/receipt-key.mjs";
import { isReceiptFileName, RECEIPT_EXTENSIONS } from "../desktop/backup.mjs";
import { heic } from "./helpers/heic-files";
import { png } from "./helpers/receipt-files";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-receipt-key-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

/** The platform these tests model unless they say otherwise: Windows, whose DPAPI the stand-in copies. */
const WINDOWS = "win32";
/** The key store's own key is on the disk already (the waiting has its own tests below). */
const saved = async () => true;
const open = (folder: string, store: KeyStore, options: Parameters<typeof openReceiptKey>[2] = {}) =>
  openReceiptKey(folder, store, { platform: WINDOWS, keyStoreSaved: saved, ...options });
const save = (folder: string, store: KeyStore, key: Buffer, options: Parameters<typeof saveReceiptKey>[3] = {}) =>
  saveReceiptKey(folder, store, key, { platform: WINDOWS, keyStoreSaved: saved, ...options });

/**
 * A stand-in for Electron's safeStorage: what one "account" wraps, only that account can open. Like
 * Electron, it has getSelectedStorageBackend only when given a backend (Electron has it on Linux only).
 */
function accountStore(account: string, { available = true, backend }: { available?: boolean; backend?: string } = {}): KeyStore & { wraps: number } {
  const secret = createHash("sha256").update(account).digest();
  const xor = (bytes: Buffer) => Buffer.from(bytes.map((b, i) => b ^ secret[i % secret.length]));
  const store = {
    wraps: 0,
    isEncryptionAvailable: () => available,
    encryptString(text: string) {
      store.wraps += 1;
      return Buffer.concat([Buffer.from(`${account}:`, "utf8"), xor(Buffer.from(text, "utf8"))]);
    },
    decryptString(wrapped: Buffer) {
      const prefix = Buffer.from(`${account}:`, "utf8");
      if (!wrapped.subarray(0, prefix.length).equals(prefix)) throw new Error("Error while decrypting the ciphertext provided to safeStorage.decryptString.");
      return xor(wrapped.subarray(prefix.length)).toString("utf8");
    },
    ...(backend ? { getSelectedStorageBackend: () => backend } : {}),
  };
  return store;
}

/** Every file under a folder, with its bytes. */
function snapshot(folder: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, e.name);
      if (e.isDirectory()) walk(full);
      else out[path.relative(folder, full)] = readFileSync(full).toString("base64");
    }
  };
  if (existsSync(folder)) walk(folder);
  return out;
}

/** True if any file under `folder` holds the key's bytes, as raw bytes, base64 or hex. */
function keyAppearsIn(folder: string, key: Buffer): boolean {
  return Object.values(snapshot(folder)).some((b64) => {
    const bytes = Buffer.from(b64, "base64");
    return bytes.indexOf(key) !== -1 || bytes.toString("latin1").includes(key.toString("base64")) || bytes.toString("latin1").includes(key.toString("hex"));
  });
}

/** A receipt file encrypted with `key` in the receipts folder. */
function lockedReceipt(key: Buffer) {
  const id = randomBytes(16).toString("hex");
  mkdirSync(path.join(dir, "receipts"), { recursive: true });
  writeFileSync(path.join(dir, "receipts", `${id}.png`), encryptReceipt(png(2, 2), { key, id }));
}

describe("the receipts' key", () => {
  it("is made once, kept only wrapped, and opened again at the next start", async () => {
    const store = accountStore("account-a");
    const first = await open(dir, store);
    expect(first.state).toBe("on");
    if (first.state !== "on") return;
    expect(first.made).toBe(true);
    expect(first.key.length).toBe(32);
    expect(first.keyId).toBe(keyIdOf(first.key));

    // The file holds the key's id and the wrapped key, never the key itself in any spelling.
    const file = JSON.parse(readFileSync(path.join(dir, RECEIPT_KEY_FILE), "utf8"));
    expect(Object.keys(file).sort()).toEqual(["format", "keyId", "wrapped"]);
    expect(file.keyId).toBe(first.keyId);
    expect(keyAppearsIn(dir, first.key)).toBe(false);

    const second = await open(dir, store);
    expect(second.state).toBe("on");
    if (second.state !== "on") return;
    expect(second.made).toBe(false);
    expect(second.key.equals(first.key)).toBe(true);
    expect(store.wraps).toBe(1);
  });

  it("each data folder gets its own key", async () => {
    const store = accountStore("account-a");
    mkdirSync(path.join(dir, "a"));
    mkdirSync(path.join(dir, "b"));
    const a = await open(path.join(dir, "a"), store);
    const b = await open(path.join(dir, "b"), store);
    expect(a.state === "on" && b.state === "on" && !a.key.equals(b.key)).toBe(true);
  });

  it("can't be opened by another account: with no receipt locked by it, it is set aside (kept) and a new key made", async () => {
    const original = await open(dir, accountStore("account-a"));
    expect(original.state).toBe("on");
    const wrappedBefore = readFileSync(path.join(dir, RECEIPT_KEY_FILE));

    const elsewhere = await open(dir, accountStore("account-b"), { now: () => 1_700_000_000_000 });
    expect(elsewhere.state).toBe("on");
    if (elsewhere.state !== "on" || original.state !== "on") return;
    expect(elsewhere.made).toBe(true);
    expect(elsewhere.key.equals(original.key)).toBe(false);
    expect(elsewhere.setAside).toBe(path.join(dir, "backups", "receipts-key-unreadable-1700000000000.key"));
    // The old key file is kept, byte for byte, in case the account that can open it comes back.
    expect(readFileSync(elsewhere.setAside!).equals(wrappedBefore)).toBe(true);
  });

  it("can't be opened, and receipts are locked by it: nothing on the disk changes", async () => {
    const original = await open(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    lockedReceipt(original.key);
    lockedReceipt(randomBytes(32)); // locked by some other key: no key here opens it either, so it counts too
    const before = snapshot(dir);

    const elsewhere = await open(dir, accountStore("account-b"));
    expect(elsewhere).toEqual({ state: "key-unreadable", keyId: original.keyId, locked: 3, missing: false, storeUnavailable: false });
    expect(snapshot(dir)).toEqual(before);
  });

  it("a key file that isn't one (cut short, edited) counts as unreadable, and every encrypted receipt as locked", async () => {
    lockedReceipt(randomBytes(32));
    writeFileSync(path.join(dir, RECEIPT_KEY_FILE), '{"format":1,"keyId":"0011');
    const before = snapshot(dir);
    expect(await open(dir, accountStore("account-a"))).toEqual({ state: "key-unreadable", keyId: null, locked: 1, missing: false, storeUnavailable: false });
    expect(snapshot(dir)).toEqual(before);
  });

  it("a wrapped key that opens to a different key than its id says is not used", async () => {
    const store = accountStore("account-a");
    const made = await open(dir, store);
    if (made.state !== "on") throw new Error("expected a key");
    lockedReceipt(made.key);
    const file = JSON.parse(readFileSync(path.join(dir, RECEIPT_KEY_FILE), "utf8"));
    file.wrapped = store.encryptString(randomBytes(32).toString("base64")).toString("base64");
    writeFileSync(path.join(dir, RECEIPT_KEY_FILE), JSON.stringify(file));
    expect(await open(dir, store)).toEqual({ state: "key-unreadable", keyId: made.keyId, locked: 1, missing: false, storeUnavailable: false });
  });

  it("an unreadable key file with only receipts locked by yet another key is not replaced either", async () => {
    // Replacing it would leave those receipts behind a green "encrypted" line, with nothing saying so.
    await open(dir, accountStore("account-a"));
    lockedReceipt(randomBytes(32));
    const before = snapshot(dir);
    const result = await open(dir, accountStore("account-b"));
    expect(result.state).toBe("key-unreadable");
    expect(result.state === "key-unreadable" && result.locked).toBe(1);
    expect(snapshot(dir)).toEqual(before);
  });

  it("a deleted receipts.key with receipts locked by it: no new key is made, nothing changes, and putting the file back opens them", async () => {
    const store = accountStore("account-a");
    const original = await open(dir, store);
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    lockedReceipt(original.key);
    const keyFile = readFileSync(path.join(dir, RECEIPT_KEY_FILE));
    rmSync(path.join(dir, RECEIPT_KEY_FILE)); // deleted in Explorer: it is in the Recycle Bin
    const before = snapshot(dir);

    let waited = 0;
    const gone = await openReceiptKey(dir, store, { platform: WINDOWS, keyStoreSaved: async () => ((waited += 1), true) });
    expect(gone).toEqual({ state: "key-unreadable", keyId: null, locked: 2, missing: true, storeUnavailable: false });
    expect(existsSync(path.join(dir, RECEIPT_KEY_FILE))).toBe(false);
    expect(snapshot(dir)).toEqual(before);
    expect(waited).toBe(0);
    expect(store.wraps).toBe(1); // only the first key was ever wrapped

    // Put back from the Recycle Bin: the same key opens, and nothing was lost in between.
    writeFileSync(path.join(dir, RECEIPT_KEY_FILE), keyFile);
    const back = await open(dir, store);
    expect(back.state === "on" && back.key.equals(original.key) && !back.made).toBe(true);
  });

  it("a missing receipts.key with no encrypted receipt (only plain ones) is simply made", async () => {
    mkdirSync(path.join(dir, "receipts"));
    writeFileSync(path.join(dir, "receipts", `${randomBytes(16).toString("hex")}.png`), png(2, 2));
    const made = await open(dir, accountStore("account-a"));
    expect(made.state === "on" && made.made).toBe(true);
  });

  it("no key store now, but receipts are already encrypted: the key can't be opened, never 'kept unencrypted'", async () => {
    const original = await open(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    const before = snapshot(dir);
    const gone = accountStore("account-a", { available: false });
    expect(await open(dir, gone)).toEqual({ state: "key-unreadable", keyId: original.keyId, locked: 1, missing: false, storeUnavailable: true });
    expect(snapshot(dir)).toEqual(before);
    expect(gone.wraps).toBe(0);
    // The same with the key file gone too.
    rmSync(path.join(dir, RECEIPT_KEY_FILE));
    expect(await open(dir, gone)).toEqual({ state: "key-unreadable", keyId: null, locked: 1, missing: true, storeUnavailable: true });
    // A key file but nothing encrypted with it yet: nothing to lose, so plainly "no key store".
    rmSync(path.join(dir, "receipts"), { recursive: true });
    writeFileSync(path.join(dir, RECEIPT_KEY_FILE), "{}");
    expect(await open(dir, gone)).toEqual({ state: "no-key-store" });
  });

  it("with no key store, receipts aren't encrypted, and DotAmi never makes a key file of its own", async () => {
    expect(await open(dir, accountStore("account-a", { available: false }))).toEqual({ state: "no-key-store" });
    expect(existsSync(path.join(dir, RECEIPT_KEY_FILE))).toBe(false);
    expect(snapshot(dir)).toEqual({});
  });

  it("saving a new key over one that can't be opened moves the old file into backups first", async () => {
    await open(dir, accountStore("account-a"));
    const old = readFileSync(path.join(dir, RECEIPT_KEY_FILE));
    const fresh = newReceiptKey();
    const { setAside } = await save(dir, accountStore("account-b"), fresh, { now: () => 5 });
    expect(setAside).toBe(path.join(dir, "backups", "receipts-key-unreadable-5.key"));
    expect(readFileSync(setAside!).equals(old)).toBe(true);
    const reopened = await open(dir, accountStore("account-b"));
    expect(reopened.state === "on" && reopened.key.equals(fresh)).toBe(true);
    expect(readdirSync(dir).filter((f) => f.startsWith(RECEIPT_KEY_FILE))).toEqual([RECEIPT_KEY_FILE]);
  });

  describe("a restore that saved a new key and then couldn't swap the data in", () => {
    it("puts the old key file back, byte for byte, when no receipt in the folder is locked with the new key", async () => {
      await open(dir, accountStore("account-a"));
      lockedReceipt(randomBytes(32)); // the old receipts, still in place after the swap was undone
      const old = readFileSync(path.join(dir, RECEIPT_KEY_FILE));
      const fresh = newReceiptKey();
      const { setAside } = await save(dir, accountStore("account-b"), fresh, { now: () => 7 });
      expect(revertReceiptKey(dir, keyIdOf(fresh), setAside)).toBe("reverted");
      expect(readFileSync(path.join(dir, RECEIPT_KEY_FILE)).equals(old)).toBe(true);
      expect(existsSync(setAside!)).toBe(false);
      // So the next start says the key can't be opened, instead of "on" over receipts it can't open.
      expect((await open(dir, accountStore("account-b"))).state).toBe("key-unreadable");
    });

    it("removes the new key when there was no key file before", async () => {
      lockedReceipt(randomBytes(32));
      const fresh = newReceiptKey();
      const { setAside } = await save(dir, accountStore("account-a"), fresh);
      expect(setAside).toBe(null);
      expect(revertReceiptKey(dir, keyIdOf(fresh), setAside)).toBe("reverted");
      expect(existsSync(path.join(dir, RECEIPT_KEY_FILE))).toBe(false);
      expect(await open(dir, accountStore("account-a"))).toEqual({ state: "key-unreadable", keyId: null, locked: 1, missing: true, storeUnavailable: false });
    });

    it("keeps the new key when receipts in the folder are already locked with it (the restored ones stayed in place)", async () => {
      await open(dir, accountStore("account-a"));
      const fresh = newReceiptKey();
      const { setAside } = await save(dir, accountStore("account-b"), fresh);
      lockedReceipt(fresh);
      const before = snapshot(dir);
      expect(revertReceiptKey(dir, keyIdOf(fresh), setAside)).toBe("kept");
      expect(snapshot(dir)).toEqual(before);
    });
  });

  it("counts the receipts a key locks, .partial files of an unfinished add included", () => {
    const key = randomBytes(32);
    lockedReceipt(key);
    const id = randomBytes(16).toString("hex");
    writeFileSync(path.join(dir, "receipts", `${id}.pdf.partial`), encryptReceipt(Buffer.from("%PDF-1.4"), { key, id }));
    writeFileSync(path.join(dir, "receipts", `${randomBytes(16).toString("hex")}.png`), png(2, 2)); // plain
    writeFileSync(path.join(dir, "receipts", "notes.txt"), "DOTAMI-RECEIPT but not DotAmi's");
    expect(countLockedReceipts(path.join(dir, "receipts"), keyIdOf(key))).toBe(2);
    expect(countLockedReceipts(path.join(dir, "receipts"), null)).toBe(2);
    expect(countLockedReceipts(path.join(dir, "nowhere"), null)).toBe(0);
  });
});

// Which key stores count, by platform (keyStoreAvailable). On Linux, Electron falls back to a password
// built into Chromium ("basic_text") when no keyring is running: a key "wrapped" with it is readable by
// anyone with the file, so DotAmi treats it as no key store at all, and keeps receipts unencrypted and
// says so rather than claim protection that isn't there. These tests pin that rule down on every
// runner, whatever platform the runner itself is.
describe("which key stores count, on each platform", () => {
  it("Windows and a Mac: the operating system's store counts whenever it is available, and no backend is asked", () => {
    for (const platform of ["win32", "darwin"]) {
      expect(keyStoreAvailable(accountStore("a"), platform)).toBe(true);
      expect(keyStoreAvailable(accountStore("a", { available: false }), platform)).toBe(false);
      // Electron has no backend question there; even a stand-in that answered one isn't asked.
      expect(keyStoreAvailable(accountStore("a", { backend: "basic_text" }), platform)).toBe(true);
    }
  });

  it("Linux: a real keyring counts; the fixed built-in password, an unknown backend or none named doesn't", () => {
    for (const backend of ["gnome_libsecret", "kwallet", "kwallet5", "kwallet6"]) {
      expect(keyStoreAvailable(accountStore("a", { backend }), "linux")).toBe(true);
      expect(keyStoreAvailable(accountStore("a", { backend, available: false }), "linux")).toBe(false);
    }
    expect(keyStoreAvailable(accountStore("a", { backend: "basic_text" }), "linux")).toBe(false);
    expect(keyStoreAvailable(accountStore("a", { backend: "unknown" }), "linux")).toBe(false);
    expect(keyStoreAvailable(accountStore("a"), "linux")).toBe(false);
  });

  it.each([
    { platform: "win32", backend: undefined },
    { platform: "darwin", backend: undefined },
    { platform: "linux", backend: "gnome_libsecret" },
    { platform: "linux", backend: "kwallet6" },
  ])("$platform $backend: a key is made, opened again, and can't be opened by another account", async ({ platform, backend }) => {
    const store = accountStore("account-a", { backend });
    const first = await open(dir, store, { platform });
    if (first.state !== "on") throw new Error(`expected a key, got ${first.state}`);
    expect(first.made).toBe(true);
    const again = await open(dir, store, { platform });
    expect(again.state === "on" && again.key.equals(first.key) && !again.made).toBe(true);
    lockedReceipt(first.key);
    expect(await open(dir, accountStore("account-b", { backend }), { platform })).toEqual({
      state: "key-unreadable",
      keyId: first.keyId,
      locked: 1,
      missing: false,
      storeUnavailable: false,
    });
  });

  it("Linux with only the fixed built-in password (basic_text): no key file is made and receipts stay unencrypted", async () => {
    const store = accountStore("account-a", { backend: "basic_text" });
    mkdirSync(path.join(dir, "receipts"));
    writeFileSync(path.join(dir, "receipts", `${randomBytes(16).toString("hex")}.png`), png(2, 2));
    const before = snapshot(dir);
    expect(await open(dir, store, { platform: "linux" })).toEqual({ state: "no-key-store" });
    expect(await open(dir, accountStore("account-a", { backend: "unknown" }), { platform: "linux" })).toEqual({ state: "no-key-store" });
    expect(await open(dir, accountStore("account-a"), { platform: "linux" })).toEqual({ state: "no-key-store" });
    expect(existsSync(path.join(dir, RECEIPT_KEY_FILE))).toBe(false);
    expect(snapshot(dir)).toEqual(before);
    expect(store.wraps).toBe(0); // nothing was ever "wrapped" with the fixed password
  });

  it("Linux whose keyring went away (basic_text now) with receipts already encrypted: the key can't be opened, nothing changes", async () => {
    const original = await open(dir, accountStore("account-a", { backend: "gnome_libsecret" }), { platform: "linux" });
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    const before = snapshot(dir);
    const fallback = accountStore("account-a", { backend: "basic_text" });
    expect(await open(dir, fallback, { platform: "linux" })).toEqual({ state: "key-unreadable", keyId: original.keyId, locked: 1, missing: false, storeUnavailable: true });
    expect(snapshot(dir)).toEqual(before);
    expect(fallback.wraps).toBe(0);
  });

  it("a restore never saves a key under the fixed built-in password: refused before anything is wrapped or written", async () => {
    await open(dir, accountStore("account-a", { backend: "gnome_libsecret" }), { platform: "linux" });
    const before = snapshot(dir);
    const fallback = accountStore("account-b", { backend: "basic_text" });
    await expect(save(dir, fallback, newReceiptKey(), { platform: "linux" })).rejects.toBeInstanceOf(NoKeyStore);
    expect(fallback.wraps).toBe(0);
    expect(snapshot(dir)).toEqual(before);
    // The same for a store that isn't available at all (Windows here).
    const unavailable = accountStore("account-b", { available: false });
    await expect(save(dir, unavailable, newReceiptKey())).rejects.toBeInstanceOf(NoKeyStore);
    expect(unavailable.wraps).toBe(0);
    expect(snapshot(dir)).toEqual(before);
  });
});

// On Windows, safeStorage encrypts with a key of Electron's own, itself protected by DPAPI and kept in
// the data folder's "Local State" file, which Chromium writes about ten seconds after it starts
// (measured 2026-10-09: 9.98 s in a fresh folder, with or without a safeStorage call). A receipts key
// wrapped before that file holds it could not be opened after a crash in those seconds, and nor could
// any receipt encrypted with it. So nothing is saved until it is there.
describe("never saved before Windows' own key is on the disk", () => {
  const localState = (osCrypt: object | null) =>
    writeFileSync(path.join(dir, "Local State"), JSON.stringify(osCrypt ? { os_crypt: osCrypt } : { browser: {} }));

  it("reads whether Local State holds the protected key", () => {
    expect(localStateHoldsKey(dir)).toBe(false);
    localState(null);
    expect(localStateHoldsKey(dir)).toBe(false);
    localState({ encrypted_key: "" });
    expect(localStateHoldsKey(dir)).toBe(false);
    localState({ encrypted_key: "RFBBUEkBAAAA0Iyd3wEV0RGMegDAT8KX6w==" });
    expect(localStateHoldsKey(dir)).toBe(true);
    writeFileSync(path.join(dir, "Local State"), "{ cut sho");
    expect(localStateHoldsKey(dir)).toBe(false);
  });

  it("waits until it is written, and gives up after the time allowed", async () => {
    let slept = 0;
    // The file appears after the third look.
    const appearing = await waitForLocalState(dir, {
      platform: "win32",
      timeoutMs: 10_000,
      sleep: async (ms) => {
        slept += ms;
        if (slept >= 600) localState({ encrypted_key: "RFBBUEk=" });
      },
    });
    expect(appearing).toBe(true);
    expect(slept).toBe(600);

    rmSync(path.join(dir, "Local State"));
    let clock = 0;
    const never = await waitForLocalState(dir, { platform: "win32", timeoutMs: 1_000, now: () => clock, sleep: async (ms) => void (clock += ms) });
    expect(never).toBe(false);
    expect(clock).toBe(1_000);
    // Not Windows: nothing to wait for (a Mac's Keychain keeps its item at once).
    expect(await waitForLocalState(dir, { platform: "darwin", timeoutMs: 0 })).toBe(true);
  });

  it("when it never comes, no key file is written and receipts stay unencrypted for this start", async () => {
    const result = await openReceiptKey(dir, accountStore("account-a"), { platform: WINDOWS, keyStoreSaved: async () => false });
    expect(result).toEqual({ state: "no-key-store" });
    expect(existsSync(path.join(dir, RECEIPT_KEY_FILE))).toBe(false);
    expect(readdirSync(dir).filter((f) => f.startsWith(RECEIPT_KEY_FILE))).toEqual([]);
    // Saving a replacement key (the restore path) refuses the same way, and changes nothing.
    await open(dir, accountStore("account-a"));
    const before = snapshot(dir);
    await expect(saveReceiptKey(dir, accountStore("account-b"), newReceiptKey(), { platform: WINDOWS, keyStoreSaved: async () => false })).rejects.toBeInstanceOf(
      KeyStoreNotSaved,
    );
    expect(snapshot(dir)).toEqual(before);
  });

  it("an existing key is opened without waiting", async () => {
    await open(dir, accountStore("account-a"));
    let asked = 0;
    const reopened = await openReceiptKey(dir, accountStore("account-a"), {
      platform: WINDOWS,
      keyStoreSaved: async () => {
        asked += 1;
        return false;
      },
    });
    expect(reopened.state).toBe("on");
    expect(asked).toBe(0);
  });
});

// "Start a new key" (expense-records.md § 10): while the key can't be opened, the person may give up the
// receipts it locks. They are moved aside, never deleted, with the key file, so that the next start makes
// a new key, and so that putting them back opens them again if the old key ever comes back.
describe("setting the locked receipts aside to start a new key", () => {
  /** Every file under `folder`, by its bytes only, sorted: what was kept, wherever it now is. */
  const contents = (folder: string) => Object.values(snapshot(folder)).sort();

  /** A data folder whose key account-a made and account-b can't open, with what the tests below need. */
  async function lockedFolder() {
    const original = await open(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    lockedReceipt(original.key);
    lockedReceipt(randomBytes(32)); // locked by yet another key: no key here opens it either
    const partialId = randomBytes(16).toString("hex");
    writeFileSync(path.join(dir, "receipts", `${partialId}.pdf.partial`), encryptReceipt(Buffer.from("%PDF-1.4"), { key: original.key, id: partialId }));
    const plain = `${randomBytes(16).toString("hex")}.png`;
    writeFileSync(path.join(dir, "receipts", plain), png(2, 2));
    writeFileSync(path.join(dir, "receipts", "notes.txt"), "DOTAMI-RECEIPT but not DotAmi's");
    const opened = await open(dir, accountStore("account-b"));
    expect(opened).toMatchObject({ state: "key-unreadable", locked: 4, missing: false });
    return { original, plain };
  }

  it("moves every locked receipt and then the key file into one new folder in backups, and deletes nothing", async () => {
    const { plain } = await lockedFolder();
    const keyBefore = readFileSync(path.join(dir, RECEIPT_KEY_FILE));
    const lockedBefore = readdirSync(path.join(dir, "receipts")).filter((n) => n !== plain && n !== "notes.txt");
    const everything = contents(dir);

    const result = setAsideLockedReceipts(dir, { now: () => 42 });
    const aside = path.join(dir, "backups", "receipts-locked-42");
    expect(result).toEqual({ folder: aside, receipts: 4, keyFile: true });
    // The locked files and the key file, byte for byte, side by side; nothing else.
    expect(readdirSync(aside).sort()).toEqual([...lockedBefore, RECEIPT_KEY_FILE].sort());
    expect(readFileSync(path.join(aside, RECEIPT_KEY_FILE)).equals(keyBefore)).toBe(true);
    // A plain receipt opens without a key, and a file DotAmi didn't name is never touched: both stay.
    expect(readdirSync(path.join(dir, "receipts")).sort()).toEqual([plain, "notes.txt"].sort());
    expect(existsSync(path.join(dir, RECEIPT_KEY_FILE))).toBe(false);
    // Nothing deleted: every file that was there is still somewhere in the data folder.
    expect(contents(dir)).toEqual(everything);
    // One rule for "locked" here and at the next start: nothing is left for it to count.
    expect(countLockedReceipts(path.join(dir, "receipts"), null)).toBe(0);
  });

  it("sets aside a locked receipt of every type DotAmi keeps, a HEIC photo included (the names backups go by)", async () => {
    const original = await open(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    mkdirSync(path.join(dir, "receipts"), { recursive: true });
    // One locked file per receipt extension backup.mjs knows ([8i] #130 added "heic"), so a type added
    // later can't be left behind in receipts/ while its key is moved away.
    const names = Object.values(RECEIPT_EXTENSIONS).map((ext) => {
      const id = randomBytes(16).toString("hex");
      const name = `${id}.${ext}`;
      const bytes = ext === "heic" ? heic() : png(2, 2);
      writeFileSync(path.join(dir, "receipts", name), encryptReceipt(bytes, { key: original.key, id }));
      expect(isReceiptFileName(name)).toBe(true);
      return name;
    });
    expect(names.some((n) => n.endsWith(".heic"))).toBe(true);
    expect(await open(dir, accountStore("account-b"))).toMatchObject({ state: "key-unreadable", locked: names.length });

    const result = setAsideLockedReceipts(dir, { now: () => 43 });
    expect(result).toEqual({ folder: path.join(dir, "backups", "receipts-locked-43"), receipts: names.length, keyFile: true });
    expect(readdirSync(path.join(dir, "backups", "receipts-locked-43")).sort()).toEqual([...names, RECEIPT_KEY_FILE].sort());
    expect(readdirSync(path.join(dir, "receipts"))).toEqual([]);
  });

  it("after it, the next start makes a new key; putting the folder back opens the old receipts again", async () => {
    const { original } = await lockedFolder();
    const { folder } = setAsideLockedReceipts(dir, { now: () => 7 });

    const next = await open(dir, accountStore("account-b"));
    expect(next.state).toBe("on");
    if (next.state !== "on") return;
    expect(next.made).toBe(true);
    expect(next.key.equals(original.key)).toBe(false);

    // Later the old key comes back (here: the account that wrapped it). With DotAmi closed, the person
    // moves the folder's files back into receipts/ and its key file over the new one.
    for (const name of readdirSync(folder!)) {
      const to = name === RECEIPT_KEY_FILE ? path.join(dir, RECEIPT_KEY_FILE) : path.join(dir, "receipts", name);
      writeFileSync(to, readFileSync(path.join(folder!, name)));
    }
    const back = await open(dir, accountStore("account-a"));
    expect(back.state).toBe("on");
    if (back.state !== "on") return;
    expect(back.made).toBe(false);
    expect(back.key.equals(original.key)).toBe(true);
    const opened = readdirSync(path.join(dir, "receipts"))
      .filter((n) => /^[0-9a-f]{32}\.png$/.test(n))
      .map((n) => {
        try {
          return decryptReceipt(readFileSync(path.join(dir, "receipts", n)), { key: back.key, id: n.slice(0, 32) }).equals(png(2, 2));
        } catch {
          return false;
        }
      });
    // The two locked with the old key open again; the plain one is plain, and the third key's stays locked.
    expect(opened.filter(Boolean).length).toBe(2);
  });

  it("with receipts.key missing, moves only the locked receipts; the folder has no key file to hold", async () => {
    const original = await open(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    rmSync(path.join(dir, RECEIPT_KEY_FILE));
    expect(await open(dir, accountStore("account-a"))).toMatchObject({ state: "key-unreadable", missing: true, locked: 1 });

    const result = setAsideLockedReceipts(dir, { now: () => 8 });
    expect(result).toEqual({ folder: path.join(dir, "backups", "receipts-locked-8"), receipts: 1, keyFile: false });
    expect(readdirSync(result.folder!)).toHaveLength(1);
    const next = await open(dir, accountStore("account-a"));
    expect(next).toMatchObject({ state: "on", made: true });
  });

  it("with nothing locked and no key file, moves nothing and makes no folder", () => {
    mkdirSync(path.join(dir, "receipts"));
    writeFileSync(path.join(dir, "receipts", `${randomBytes(16).toString("hex")}.png`), png(2, 2));
    const before = snapshot(dir);
    expect(setAsideLockedReceipts(dir, { now: () => 9 })).toEqual({ folder: null, receipts: 0, keyFile: false });
    expect(snapshot(dir)).toEqual(before);
    expect(existsSync(path.join(dir, "backups"))).toBe(false);
  });

  it("moves the key file last: cut short, the key stays beside the receipts not moved yet, and pressing again moves the rest", async () => {
    await lockedFolder();
    const keyBefore = readFileSync(path.join(dir, RECEIPT_KEY_FILE));
    let renames = 0;
    // The second move fails, as if the computer were switched off there.
    const cutShort = (from: string, to: string) => {
      renames += 1;
      if (renames === 2) throw Object.assign(new Error("switched off"), { code: "EIO" });
      renameSync(from, to);
    };
    expect(() => setAsideLockedReceipts(dir, { now: () => 10, rename: cutShort })).toThrow("switched off");
    expect(readdirSync(path.join(dir, "backups", "receipts-locked-10"))).toHaveLength(1);
    expect(readFileSync(path.join(dir, RECEIPT_KEY_FILE)).equals(keyBefore)).toBe(true);
    expect(countLockedReceipts(path.join(dir, "receipts"), null)).toBe(3);

    const again = setAsideLockedReceipts(dir, { now: () => 11 });
    expect(again).toEqual({ folder: path.join(dir, "backups", "receipts-locked-11"), receipts: 3, keyFile: true });
    expect(countLockedReceipts(path.join(dir, "receipts"), null)).toBe(0);
  });

  it("never reuses a folder that is already there: two presses in the same millisecond get two folders", async () => {
    await lockedFolder();
    mkdirSync(path.join(dir, "backups", "receipts-locked-12"), { recursive: true });
    writeFileSync(path.join(dir, "backups", "receipts-locked-12", "already-here.txt"), "kept");
    const result = setAsideLockedReceipts(dir, { now: () => 12 });
    expect(result.folder).toBe(path.join(dir, "backups", "receipts-locked-12-1"));
    expect(readdirSync(path.join(dir, "backups", "receipts-locked-12"))).toEqual(["already-here.txt"]);
  });
});

// What the desktop app tells its server (desktop/main.mjs hands it receiptLockEnv's answer), and so
// whether the pages offer Start a new key (expense-records.md § 10). It is offered only when a new key
// could really be made at the next start and would really give something up: the key store is there,
// and receipts are locked. While the key store is only unavailable for now, the key itself may still
// open at a later start, so nothing is offered that would set it aside.
describe("what the server is told, and when Start a new key is offered", () => {
  it("the key opens: the server gets it, with the state 'on'", async () => {
    const opened = await open(dir, accountStore("account-a"));
    if (opened.state !== "on") throw new Error("expected a key");
    expect(receiptLockEnv(opened)).toEqual({ DOTAMI_RECEIPT_LOCK: "on", DOTAMI_RECEIPT_KEY: opened.key.toString("base64") });
  });

  it("no key store and nothing encrypted: 'no-key-store', and no key", async () => {
    expect(receiptLockEnv(await open(dir, accountStore("account-a", { available: false })))).toEqual({ DOTAMI_RECEIPT_LOCK: "no-key-store" });
  });

  it("another account's key, receipts locked by it: 'key-unreadable', which offers Start a new key", async () => {
    const original = await open(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    expect(receiptLockEnv(await open(dir, accountStore("account-b")))).toEqual({ DOTAMI_RECEIPT_LOCK: "key-unreadable" });
  });

  it("receipts.key missing, receipts locked, the key store there: 'key-unreadable', which offers it", async () => {
    const original = await open(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    rmSync(path.join(dir, RECEIPT_KEY_FILE));
    expect(receiptLockEnv(await open(dir, accountStore("account-a")))).toEqual({ DOTAMI_RECEIPT_LOCK: "key-unreadable" });
  });

  it("the key store unavailable for now, receipts locked: 'key-out-of-reach', never offered, and the key opens again once the store is back", async () => {
    const original = await open(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    const down = await open(dir, accountStore("account-a", { available: false }));
    expect(down).toMatchObject({ state: "key-unreadable", storeUnavailable: true, locked: 1 });
    expect(receiptLockEnv(down)).toEqual({ DOTAMI_RECEIPT_LOCK: "key-out-of-reach" });
    // The same with receipts.key gone as well: no new key could be made while the store is down.
    const keyFile = readFileSync(path.join(dir, RECEIPT_KEY_FILE));
    rmSync(path.join(dir, RECEIPT_KEY_FILE));
    expect(receiptLockEnv(await open(dir, accountStore("account-a", { available: false })))).toEqual({ DOTAMI_RECEIPT_LOCK: "key-out-of-reach" });
    // Nothing was set aside, so the key the receipts need opens them once the store is back.
    writeFileSync(path.join(dir, RECEIPT_KEY_FILE), keyFile);
    const back = await open(dir, accountStore("account-a"));
    expect(back.state === "on" && back.key.equals(original.key)).toBe(true);
  });

  it("a key file that can't be opened, nothing locked, and the new key not saved yet: 'key-out-of-reach' (nothing to give up; the next start tries again)", async () => {
    await open(dir, accountStore("account-a"));
    const opened = await open(dir, accountStore("account-b"), { keyStoreSaved: async () => false });
    expect(opened).toMatchObject({ state: "key-unreadable", locked: 0 });
    expect(receiptLockEnv(opened)).toEqual({ DOTAMI_RECEIPT_LOCK: "key-out-of-reach" });
  });
});

describe("restarting by itself after Start a new key (expense-records.md § 11)", () => {
  /** Stand-ins for Electron and the server: each call is recorded, in order. */
  function electron({ relaunchFails = false } = {}) {
    const calls: string[] = [];
    const lines: string[] = [];
    return {
      calls,
      lines,
      relaunch: () => {
        calls.push("relaunch");
        if (relaunchFails) throw new Error("relaunch refused");
      },
      stopServer: async () => {
        calls.push("stop server");
      },
      exit: (code: number) => {
        calls.push(`exit ${code}`);
      },
      log: (line: string) => {
        lines.push(line);
      },
    };
  }

  /** A data folder whose key can't be opened by this account, with receipts locked by it: what this start opened. */
  async function unreadable() {
    const original = await open(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    lockedReceipt(original.key);
    const opened = await open(dir, accountStore("account-b"));
    expect(receiptLockEnv(opened)).toEqual({ DOTAMI_RECEIPT_LOCK: "key-unreadable" });
    return opened;
  }

  it("once the locked receipts are set aside: the relaunch is asked for first, then the server is stopped, then the app exits", async () => {
    const opened = await unreadable();
    setAsideLockedReceipts(dir);
    const e = electron();
    expect(await restartForNewKey(dir, { opened, fromDotAmi: true, quitting: false, ...e })).toBe("restarting");
    expect(e.calls).toEqual(["relaunch", "stop server", "exit 0"]);
    expect(e.lines).toEqual(["[desktop] restarting to start the new receipts key"]);
    // The next start finds nothing locked and makes the new key, as for a missing key file.
    const next = await open(dir, accountStore("account-b"));
    expect(next).toMatchObject({ state: "on", made: true });
  });

  it("never before the move: while a locked receipt is still in the folder, nothing restarts", async () => {
    const opened = await unreadable();
    const e = electron();
    expect(await restartForNewKey(dir, { opened, fromDotAmi: true, quitting: false, ...e })).toBe("refused");
    expect(e.calls).toEqual([]);
    expect(e.lines).toEqual(["[desktop] a restart for a new receipts key was refused: receipts are still locked with the old key"]);
  });

  it("only for DotAmi's own window: anything else asking restarts nothing", async () => {
    const opened = await unreadable();
    setAsideLockedReceipts(dir);
    const e = electron();
    expect(await restartForNewKey(dir, { opened, fromDotAmi: false, quitting: false, ...e })).toBe("refused");
    expect(e.calls).toEqual([]);
    expect(e.lines).toEqual(["[desktop] a restart for a new receipts key was refused: it wasn't asked by DotAmi's own window"]);
  });

  it("only in the state the button shows in: never when this start's key opened, with no key store, or with the key only out of reach", async () => {
    const states: Parameters<typeof restartForNewKey>[1]["opened"][] = [
      null,
      { state: "on", key: randomBytes(32), keyId: "0011223344556677", made: false, setAside: null },
      { state: "no-key-store" },
      // The key store unavailable for now, and nothing locked with a new key not saved yet: "key-out-of-reach".
      { state: "key-unreadable", keyId: null, locked: 2, missing: false, storeUnavailable: true },
      { state: "key-unreadable", keyId: "0011223344556677", locked: 0, missing: false, storeUnavailable: false },
    ];
    for (const opened of states) {
      const e = electron();
      expect(await restartForNewKey(dir, { opened, fromDotAmi: true, quitting: false, ...e }), JSON.stringify(opened?.state)).toBe("refused");
      expect(e.calls).toEqual([]);
      expect(e.lines).toEqual(["[desktop] a restart for a new receipts key was refused: this start's receipts key wasn't one Start a new key replaces"]);
    }
  });

  it("not while the app is already quitting (a restore, or a start that failed)", async () => {
    const opened = await unreadable();
    setAsideLockedReceipts(dir);
    const e = electron();
    expect(await restartForNewKey(dir, { opened, fromDotAmi: true, quitting: true, ...e })).toBe("refused");
    expect(e.calls).toEqual([]);
  });

  it("a relaunch Electron refuses stops nothing: the server keeps running, the app stays open, and the next start still makes the key", async () => {
    const opened = await unreadable();
    setAsideLockedReceipts(dir);
    const e = electron({ relaunchFails: true });
    expect(await restartForNewKey(dir, { opened, fromDotAmi: true, quitting: false, ...e })).toBe("refused");
    expect(e.calls).toEqual(["relaunch"]);
    expect(e.lines).toEqual(["[desktop] DotAmi couldn't restart itself for the new receipts key (Error); it makes the key at its next start"]);
    expect(await open(dir, accountStore("account-b"))).toMatchObject({ state: "on", made: true });
  });

  it("logs no path and no file name", async () => {
    const opened = await unreadable();
    setAsideLockedReceipts(dir);
    const e = electron();
    await restartForNewKey(dir, { opened, fromDotAmi: true, quitting: false, ...e });
    for (const line of e.lines) {
      expect(line).not.toContain(dir);
      expect(line).not.toMatch(/[0-9a-f]{32}|receipts-locked-/);
    }
  });
});
