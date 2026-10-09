/**
 * [8i] The receipts' key (desktop/receipt-key.mjs; expense-records.md § 9, "The key" and "Losing the
 * key"): made once, kept only wrapped by the operating system's per-user protection, opened again at the
 * next start; what happens when it can't be opened; and no key store meaning "not encrypted", never a
 * key file of DotAmi's own. Electron's safeStorage is replaced by a stand-in that wraps per "account",
 * the way DPAPI does: one account can't open what another wrapped.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { encryptReceipt, keyIdOf } from "../desktop/receipt-crypto.mjs";
import { countLockedReceipts, newReceiptKey, openReceiptKey, RECEIPT_KEY_FILE, saveReceiptKey, type KeyStore } from "../desktop/receipt-key.mjs";
import { png } from "./helpers/receipt-files";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-receipt-key-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

/** A stand-in for Electron's safeStorage: what one "account" wraps, only that account can open. */
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
  it("is made once, kept only wrapped, and opened again at the next start", () => {
    const store = accountStore("account-a");
    const first = openReceiptKey(dir, store);
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

    const second = openReceiptKey(dir, store);
    expect(second.state).toBe("on");
    if (second.state !== "on") return;
    expect(second.made).toBe(false);
    expect(second.key.equals(first.key)).toBe(true);
    expect(store.wraps).toBe(1);
  });

  it("each data folder gets its own key", () => {
    const store = accountStore("account-a");
    mkdirSync(path.join(dir, "a"));
    mkdirSync(path.join(dir, "b"));
    const a = openReceiptKey(path.join(dir, "a"), store);
    const b = openReceiptKey(path.join(dir, "b"), store);
    expect(a.state === "on" && b.state === "on" && !a.key.equals(b.key)).toBe(true);
  });

  it("can't be opened by another account: with no receipt locked by it, it is set aside (kept) and a new key made", () => {
    const original = openReceiptKey(dir, accountStore("account-a"));
    expect(original.state).toBe("on");
    const wrappedBefore = readFileSync(path.join(dir, RECEIPT_KEY_FILE));

    const elsewhere = openReceiptKey(dir, accountStore("account-b"), { now: () => 1_700_000_000_000 });
    expect(elsewhere.state).toBe("on");
    if (elsewhere.state !== "on" || original.state !== "on") return;
    expect(elsewhere.made).toBe(true);
    expect(elsewhere.key.equals(original.key)).toBe(false);
    expect(elsewhere.setAside).toBe(path.join(dir, "backups", "receipts-key-unreadable-1700000000000.key"));
    // The old key file is kept, byte for byte, in case the account that can open it comes back.
    expect(readFileSync(elsewhere.setAside!).equals(wrappedBefore)).toBe(true);
  });

  it("can't be opened, and receipts are locked by it: nothing on the disk changes", () => {
    const original = openReceiptKey(dir, accountStore("account-a"));
    if (original.state !== "on") throw new Error("expected a key");
    lockedReceipt(original.key);
    lockedReceipt(original.key);
    lockedReceipt(randomBytes(32)); // locked by some other key: not counted for this one
    const before = snapshot(dir);

    const elsewhere = openReceiptKey(dir, accountStore("account-b"));
    expect(elsewhere).toEqual({ state: "key-unreadable", keyId: original.keyId, locked: 2 });
    expect(snapshot(dir)).toEqual(before);
  });

  it("a key file that isn't one (cut short, edited) counts as unreadable, and every encrypted receipt as locked", () => {
    lockedReceipt(randomBytes(32));
    writeFileSync(path.join(dir, RECEIPT_KEY_FILE), '{"format":1,"keyId":"0011');
    const before = snapshot(dir);
    expect(openReceiptKey(dir, accountStore("account-a"))).toEqual({ state: "key-unreadable", keyId: null, locked: 1 });
    expect(snapshot(dir)).toEqual(before);
  });

  it("a wrapped key that opens to a different key than its id says is not used", () => {
    const store = accountStore("account-a");
    const made = openReceiptKey(dir, store);
    if (made.state !== "on") throw new Error("expected a key");
    lockedReceipt(made.key);
    const file = JSON.parse(readFileSync(path.join(dir, RECEIPT_KEY_FILE), "utf8"));
    file.wrapped = store.encryptString(randomBytes(32).toString("base64")).toString("base64");
    writeFileSync(path.join(dir, RECEIPT_KEY_FILE), JSON.stringify(file));
    expect(openReceiptKey(dir, store)).toEqual({ state: "key-unreadable", keyId: made.keyId, locked: 1 });
  });

  it("with no key store, receipts aren't encrypted, and DotAmi never makes a key file of its own", () => {
    expect(openReceiptKey(dir, accountStore("account-a", { available: false }))).toEqual({ state: "no-key-store" });
    expect(existsSync(path.join(dir, RECEIPT_KEY_FILE))).toBe(false);
    expect(snapshot(dir)).toEqual({});
  });

  it("on Linux, Electron's fixed built-in password (basic_text) is no key store; a real keyring is", () => {
    expect(openReceiptKey(dir, accountStore("account-a", { backend: "basic_text" }), { platform: "linux" })).toEqual({ state: "no-key-store" });
    expect(openReceiptKey(dir, accountStore("account-a", { backend: "unknown" }), { platform: "linux" })).toEqual({ state: "no-key-store" });
    expect(existsSync(path.join(dir, RECEIPT_KEY_FILE))).toBe(false);
    expect(openReceiptKey(dir, accountStore("account-a", { backend: "gnome_libsecret" }), { platform: "linux" }).state).toBe("on");
  });

  it("saving a new key over one that can't be opened moves the old file into backups first", () => {
    openReceiptKey(dir, accountStore("account-a"));
    const old = readFileSync(path.join(dir, RECEIPT_KEY_FILE));
    const fresh = newReceiptKey();
    const { setAside } = saveReceiptKey(dir, accountStore("account-b"), fresh, { now: () => 5 });
    expect(setAside).toBe(path.join(dir, "backups", "receipts-key-unreadable-5.key"));
    expect(readFileSync(setAside!).equals(old)).toBe(true);
    const reopened = openReceiptKey(dir, accountStore("account-b"));
    expect(reopened.state === "on" && reopened.key.equals(fresh)).toBe(true);
    expect(readdirSync(dir).filter((f) => f.startsWith(RECEIPT_KEY_FILE))).toEqual([RECEIPT_KEY_FILE]);
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
