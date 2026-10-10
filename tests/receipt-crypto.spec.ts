/**
 * [8i] Receipt files encrypted at rest (desktop/receipt-crypto.mjs; the design is
 * docs/architecture/expense-records.md § 9): the file format, every way a file can fail to open, and
 * encrypting the receipts already on the disk once, at the first start, without ever losing one, even
 * when the app is ended part-way.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decryptReceipt,
  ENCRYPTED_HEADER_BYTES,
  ENCRYPTED_OVERHEAD,
  encryptedKeyId,
  encryptReceipt,
  encryptReceiptsIn,
  isEncryptedReceipt,
  keyIdOf,
  ReceiptCryptoError,
} from "../desktop/receipt-crypto.mjs";
import { isReceiptFileName } from "../desktop/backup.mjs";
import { heicPicture } from "../lib/expenses/receipts/heic/picture";
import { heic } from "./helpers/heic-files";
import { pdf, png } from "./helpers/receipt-files";

const ID = "0123456789abcdef0123456789abcdef";
const OTHER_ID = "fedcba9876543210fedcba9876543210";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-receipt-crypto-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

/** The ReceiptCryptoError kind a call throws, or "no error". */
function failure(run: () => unknown): string {
  try {
    run();
    return "no error";
  } catch (error) {
    if (error instanceof ReceiptCryptoError) return error.kind;
    throw error;
  }
}

describe("the encrypted file", () => {
  const key = randomBytes(32);
  const plain = png(7, 5);

  it("round-trips, and holds none of the receipt's own bytes", () => {
    const file = encryptReceipt(plain, { key, id: ID });
    expect(file.length).toBe(plain.length + ENCRYPTED_OVERHEAD);
    expect(file.subarray(0, 14).toString("ascii")).toBe("DOTAMI-RECEIPT");
    expect(isEncryptedReceipt(file)).toBe(true);
    expect(encryptedKeyId(file)).toBe(keyIdOf(key));
    // The PNG's own signature and its picture chunk are nowhere in the file.
    expect(file.indexOf(plain.subarray(0, 8))).toBe(-1);
    expect(file.indexOf(plain.subarray(16, 32))).toBe(-1);
    expect(decryptReceipt(file, { key, id: ID }).equals(plain)).toBe(true);
  });

  it("uses a new nonce every time, so the same receipt never encrypts to the same bytes", () => {
    const a = encryptReceipt(plain, { key, id: ID });
    const b = encryptReceipt(plain, { key, id: ID });
    expect(a.equals(b)).toBe(false);
    expect(a.subarray(23, 35).equals(b.subarray(23, 35))).toBe(false);
  });

  it("a plain receipt of every accepted kind is never taken for an encrypted one", () => {
    for (const bytes of [png(2, 2), pdf({ text: "x" }), Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1")]) {
      expect(isEncryptedReceipt(bytes)).toBe(false);
    }
    // A HEIC file starts with its box size, then "ftyp"; the size can't spell "DOTA" under 10 MB.
    expect(isEncryptedReceipt(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic", "ascii")]))).toBe(false);
  });

  it("a changed byte anywhere is refused as damaged: the header, the ciphertext, the tag", () => {
    const good = encryptReceipt(plain, { key, id: ID });
    // Every byte of the header except the key id's (its own answer, below), one in the middle of the
    // ciphertext, and the last byte of the tag.
    const positions = [0, 13, 14, ...Array.from({ length: 12 }, (_, i) => 23 + i), ENCRYPTED_HEADER_BYTES + 3, good.length - 1];
    for (const at of positions) {
      const bad = Buffer.from(good);
      bad[at] ^= 0x01;
      const kind = failure(() => decryptReceipt(bad, { key, id: ID }));
      // The magic and the format byte are what make it an encrypted receipt at all.
      expect([at, kind]).toEqual([at, at < 14 ? "not-encrypted" : at === 14 ? "unknown-format" : "damaged"]);
    }
  });

  it("a file cut short is refused as damaged, even one shorter than the header", () => {
    const good = encryptReceipt(plain, { key, id: ID });
    expect(failure(() => decryptReceipt(good.subarray(0, good.length - 1), { key, id: ID }))).toBe("damaged");
    expect(failure(() => decryptReceipt(good.subarray(0, 20), { key, id: ID }))).toBe("damaged");
  });

  it("the wrong key is told apart from a damaged file by the key's id", () => {
    const good = encryptReceipt(plain, { key, id: ID });
    expect(failure(() => decryptReceipt(good, { key: randomBytes(32), id: ID }))).toBe("other-key");
  });

  it("a key id changed to match another key still fails: the id is authenticated", () => {
    const other = randomBytes(32);
    const bad = Buffer.from(encryptReceipt(plain, { key, id: ID }));
    Buffer.from(keyIdOf(other), "hex").copy(bad, 15);
    expect(failure(() => decryptReceipt(bad, { key: other, id: ID }))).toBe("damaged");
  });

  it("the file's id is part of what is authenticated: a receipt renamed to another receipt's id is refused", () => {
    const good = encryptReceipt(plain, { key, id: ID });
    expect(failure(() => decryptReceipt(good, { key, id: OTHER_ID }))).toBe("damaged");
  });

  it("a plain file is not decrypted, it is said to be plain", () => {
    expect(failure(() => decryptReceipt(plain, { key, id: ID }))).toBe("not-encrypted");
  });

  it("refuses a key that isn't 32 bytes and an id that isn't DotAmi's", () => {
    expect(() => encryptReceipt(plain, { key: randomBytes(16), id: ID })).toThrow();
    expect(() => encryptReceipt(plain, { key, id: "../x" })).toThrow();
  });
});

/** A receipts folder with DotAmi-named plain files; returns their names and bytes. */
function plainReceipts(folder: string, count: number): Map<string, Buffer> {
  mkdirSync(folder, { recursive: true });
  const files = new Map<string, Buffer>();
  for (let i = 0; i < count; i += 1) {
    const name = `${randomBytes(16).toString("hex")}.${i % 2 === 0 ? "png" : "pdf"}`;
    const bytes = i % 2 === 0 ? png(3 + i, 2) : pdf({ text: `receipt ${i}` });
    writeFileSync(path.join(folder, name), bytes);
    files.set(name, bytes);
  }
  return files;
}

/** Every receipt in `files` still opens, from the plain file or the encrypted one, to the same bytes. */
function expectAllReadable(folder: string, files: Map<string, Buffer>, key: Buffer) {
  for (const [name, bytes] of files) {
    const onDisk = readFileSync(path.join(folder, name));
    const shown = isEncryptedReceipt(onDisk) ? decryptReceipt(onDisk, { key, id: name.slice(0, 32) }) : onDisk;
    expect(shown.equals(bytes), name).toBe(true);
  }
}

describe("encrypting the receipts already on the disk", () => {
  const key = randomBytes(32);

  it("encrypts every plain receipt once, leaves encrypted ones and other files alone", () => {
    const folder = path.join(dir, "receipts");
    const files = plainReceipts(folder, 3);
    writeFileSync(path.join(folder, "my-own-note.txt"), "the person's own file");
    writeFileSync(path.join(folder, `${"a".repeat(32)}.png.partial`), png(2, 2));

    const first = encryptReceiptsIn(folder, key, { isReceiptName: isReceiptFileName });
    expect(first).toEqual({ encrypted: 3, already: 0, failed: 0, leftoversRemoved: 0 });
    for (const name of files.keys()) expect(isEncryptedReceipt(readFileSync(path.join(folder, name)))).toBe(true);
    expectAllReadable(folder, files, key);
    // Not DotAmi's receipt names: never touched.
    expect(readFileSync(path.join(folder, "my-own-note.txt"), "utf8")).toBe("the person's own file");
    expect(isEncryptedReceipt(readFileSync(path.join(folder, `${"a".repeat(32)}.png.partial`)))).toBe(false);

    const again = encryptReceiptsIn(folder, key, { isReceiptName: isReceiptFileName });
    expect(again).toEqual({ encrypted: 0, already: 3, failed: 0, leftoversRemoved: 0 });
    expect(readdirSync(folder).sort()).toEqual([...files.keys(), "my-own-note.txt", `${"a".repeat(32)}.png.partial`].sort());
  });

  it("a HEIC photo kept plain by an earlier version is encrypted too, and decrypts to a photo the HEIC reader opens ([8i])", () => {
    const folder = path.join(dir, "receipts");
    mkdirSync(folder, { recursive: true });
    const photo = heic();
    const name = `${ID}.heic`;
    writeFileSync(path.join(folder, name), photo);
    expect(isReceiptFileName(name)).toBe(true);

    expect(encryptReceiptsIn(folder, key, { isReceiptName: isReceiptFileName })).toEqual({ encrypted: 1, already: 0, failed: 0, leftoversRemoved: 0 });
    const onDisk = readFileSync(path.join(folder, name));
    expect(isEncryptedReceipt(onDisk)).toBe(true);
    expect(onDisk.indexOf(photo.subarray(0, 24))).toBe(-1);
    expect(heicPicture(new Uint8Array(onDisk)).ok).toBe(false);
    const shown = decryptReceipt(onDisk, { key, id: ID });
    expect(shown.equals(photo)).toBe(true);
    expect(heicPicture(new Uint8Array(shown)).ok).toBe(true);
  });

  it("a folder that isn't there is nothing to do", () => {
    expect(encryptReceiptsIn(path.join(dir, "none"), key, { isReceiptName: isReceiptFileName })).toEqual({
      encrypted: 0,
      already: 0,
      failed: 0,
      leftoversRemoved: 0,
    });
  });

  it("a half-written leftover from an earlier start is removed and the receipt encrypted from its whole plain file", () => {
    const folder = path.join(dir, "receipts");
    const files = plainReceipts(folder, 1);
    const [name, bytes] = [...files][0];
    // What a start ended in the middle of writing leaves: the start of an encrypted file.
    writeFileSync(path.join(folder, `${name}.encrypting`), encryptReceipt(bytes, { key, id: name.slice(0, 32) }).subarray(0, 40));
    const result = encryptReceiptsIn(folder, key, { isReceiptName: isReceiptFileName });
    expect(result).toEqual({ encrypted: 1, already: 0, failed: 0, leftoversRemoved: 1 });
    expect(readdirSync(folder)).toEqual([name]);
    expectAllReadable(folder, files, key);
  });

  it("a file it can't encrypt now stays plain and readable, and is counted", () => {
    const folder = path.join(dir, "receipts");
    const files = plainReceipts(folder, 2);
    const [blocked] = [...files.keys()];
    // A leftover it can't remove stands in for "another program has it open": the write that would
    // follow can't start, so that receipt is left as it was.
    mkdirSync(path.join(folder, `${blocked}.encrypting`));
    const result = encryptReceiptsIn(folder, key, { isReceiptName: isReceiptFileName });
    expect(result.encrypted).toBe(1);
    expect(result.failed).toBe(1);
    expect(isEncryptedReceipt(readFileSync(path.join(folder, blocked)))).toBe(false);
    expectAllReadable(folder, files, key);
  });

  // The app ended for real (process.exit in a child process, no clean-up) at each step of each file:
  // whatever is on the disk afterwards, every receipt opens, and the next start finishes the job.
  for (const step of ["temp-written", "renamed"] as const) {
    for (const at of [0, 1, 2]) {
      it(`a start ended after "${step}" of file ${at + 1} of 3 loses no receipt, and the next start finishes`, () => {
        const folder = path.join(dir, "receipts");
        const files = plainReceipts(folder, 3);
        const script = path.join(__dirname, "helpers", "encrypt-receipts-then-exit.mjs");
        const out = execFileSync(process.execPath, [script, folder, key.toString("base64"), step, String(at)], { encoding: "utf8" });
        // The child really did stop at that step (it prints nothing once it gets past it).
        expect(out.trim()).toBe(`stopping at ${step} ${at}`);
        expectAllReadable(folder, files, key);

        const next = encryptReceiptsIn(folder, key, { isReceiptName: isReceiptFileName });
        expect(next.failed).toBe(0);
        expect(next.encrypted + next.already).toBe(3);
        for (const name of files.keys()) expect(isEncryptedReceipt(readFileSync(path.join(folder, name)))).toBe(true);
        expectAllReadable(folder, files, key);
        expect(readdirSync(folder).sort()).toEqual([...files.keys()].sort());
        expect(existsSync(path.join(folder, `${[...files.keys()][at]}.encrypting`))).toBe(false);
      });
    }
  }
});
