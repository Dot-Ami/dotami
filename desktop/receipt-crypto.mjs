// [8i] Receipt files encrypted at rest: the file format, and encrypting the receipts already on the
// disk once, at the first start of the version that brings this. The design, written before this
// code, is docs/architecture/expense-records.md § 9.
//
// One file per receipt, AES-256-GCM with Node's own crypto:
//   14 bytes   the text "DOTAMI-RECEIPT"
//    1 byte    the format, 1
//    8 bytes   the key's id: the first 8 bytes of SHA-256(key). Not secret; it tells "made with another
//              key" (a lost or replaced key) apart from "damaged or changed".
//   12 bytes   a random nonce, new every time a file is written
//    n bytes   the ciphertext, as long as the receipt itself
//   16 bytes   GCM's tag
// GCM's additional authenticated data is those 35 header bytes followed by the receipt's id (the 32 hex
// characters that name the file), so a renamed file, a changed key id or format, or any changed byte
// fails to open.
//
// Nothing here looks at what kind of file the receipt is: a type added later (HEIC, say) needs no
// change. None of the accepted kinds starts with "DOTAMI-RECEIPT", so a file that doesn't is plain.
//
// This one file is shared by the desktop app's main process (the first-start encryption, backups and
// restores) and DotAmi's server (lib/expenses/receipts/store.ts imports it), so there is one copy of
// the format. It uses only node: modules and never imports Electron.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { closeSync, fstatSync, fsyncSync, openSync, readdirSync, readSync, renameSync, rmSync, writeSync } from "node:fs";
import path from "node:path";

const MAGIC = Buffer.from("DOTAMI-RECEIPT", "ascii");
const FORMAT = 1;
const KEY_ID_BYTES = 8;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const KEY_ID_AT = MAGIC.length + 1;
const NONCE_AT = KEY_ID_AT + KEY_ID_BYTES;

/** Bytes before the ciphertext: magic, format, key id, nonce. */
export const ENCRYPTED_HEADER_BYTES = NONCE_AT + NONCE_BYTES;
/** How much longer an encrypted file is than the receipt it holds. */
export const ENCRYPTED_OVERHEAD = ENCRYPTED_HEADER_BYTES + TAG_BYTES;

/** A receipt's id: the 32 random hex characters DotAmi names each file with (lib/expenses/receipts/types.ts RECEIPT_ID). */
const RECEIPT_ID = /^[0-9a-f]{32}$/;
/** The id at the start of a file name DotAmi gave: "<id>.<extension>". */
const ID_OF_NAME = /^([0-9a-f]{32})\./;

/**
 * Why a file didn't open. `kind`:
 *   "not-encrypted"   it doesn't start with the magic: a plain receipt
 *   "unknown-format"  the magic, then a format this DotAmi doesn't know
 *   "other-key"       encrypted with a key other than the one given (the key's id differs)
 *   "damaged"         cut short, changed, or renamed to another receipt's id: the tag check failed
 */
export class ReceiptCryptoError extends Error {
  /** @param {"not-encrypted" | "unknown-format" | "other-key" | "damaged"} kind */
  constructor(kind) {
    super(`receipt file: ${kind}`);
    this.name = "ReceiptCryptoError";
    this.kind = kind;
  }
}

/** The key's id as 16 hex characters: the first 8 bytes of its SHA-256. It can't be turned back into the key. */
export function keyIdOf(key) {
  return createHash("sha256").update(key).digest().subarray(0, KEY_ID_BYTES).toString("hex");
}

/** True when `bytes` (the whole file, or at least its first 14 bytes) is an encrypted receipt of any format. */
export function isEncryptedReceipt(bytes) {
  return bytes.length >= MAGIC.length && Buffer.from(bytes.buffer, bytes.byteOffset, MAGIC.length).equals(MAGIC);
}

/** The key id an encrypted file names (needs its first 23 bytes), or null for a plain or too-short one. */
export function encryptedKeyId(bytes) {
  if (!isEncryptedReceipt(bytes) || bytes.length < NONCE_AT) return null;
  return Buffer.from(bytes.buffer, bytes.byteOffset + KEY_ID_AT, KEY_ID_BYTES).toString("hex");
}

function checkKeyAndId(key, id) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) throw new Error("a receipt key is 32 bytes");
  if (typeof id !== "string" || !RECEIPT_ID.test(id)) throw new Error("not a receipt id DotAmi made");
}

/** The associated data: the header as written, then the receipt's id. */
const aadOf = (header, id) => Buffer.concat([header, Buffer.from(id, "ascii")]);

/**
 * Encrypts one receipt's bytes for the file named by `id`. Returns the whole file.
 * @param {Uint8Array} plain
 * @param {{ key: Buffer, id: string }} options
 */
export function encryptReceipt(plain, { key, id }) {
  checkKeyAndId(key, id);
  const header = Buffer.concat([MAGIC, Buffer.from([FORMAT]), Buffer.from(keyIdOf(key), "hex"), randomBytes(NONCE_BYTES)]);
  const cipher = createCipheriv("aes-256-gcm", key, header.subarray(NONCE_AT), { authTagLength: TAG_BYTES });
  cipher.setAAD(aadOf(header, id));
  return Buffer.concat([header, cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
}

/**
 * Opens one encrypted receipt file. Returns the receipt's own bytes, or throws ReceiptCryptoError.
 * GCM checks the tag only at the end, so nothing decrypted is returned before the whole file has passed.
 * @param {Uint8Array} file
 * @param {{ key: Buffer, id: string }} options
 */
export function decryptReceipt(file, { key, id }) {
  checkKeyAndId(key, id);
  if (!isEncryptedReceipt(file)) throw new ReceiptCryptoError("not-encrypted");
  const bytes = Buffer.from(file.buffer, file.byteOffset, file.length);
  if (bytes.length <= MAGIC.length) throw new ReceiptCryptoError("damaged");
  if (bytes[MAGIC.length] !== FORMAT) throw new ReceiptCryptoError("unknown-format");
  if (bytes.length < ENCRYPTED_OVERHEAD) throw new ReceiptCryptoError("damaged");
  if (encryptedKeyId(bytes) !== keyIdOf(key)) throw new ReceiptCryptoError("other-key");
  const header = bytes.subarray(0, ENCRYPTED_HEADER_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(NONCE_AT), { authTagLength: TAG_BYTES });
  decipher.setAAD(aadOf(header, id));
  decipher.setAuthTag(bytes.subarray(bytes.length - TAG_BYTES));
  try {
    return Buffer.concat([decipher.update(bytes.subarray(ENCRYPTED_HEADER_BYTES, bytes.length - TAG_BYTES)), decipher.final()]);
  } catch {
    throw new ReceiptCryptoError("damaged");
  }
}

/** A receipt file's id: the 32 hex characters before the first dot of a name DotAmi gave it, or null. */
export function receiptIdOfName(name) {
  const match = name.match(ID_OF_NAME);
  return match ? match[1] : null;
}

/** The suffix of the file the first-start encryption writes before renaming it over the plain one. */
const IN_PROGRESS = ".encrypting";

/** Plain receipts are at most 10 MB (the maintainer's cap); a bigger file is not one DotAmi kept, and is left alone. */
const MAX_PLAIN_BYTES = 10 * 1024 * 1024;

/**
 * Encrypts every plain receipt in `folder` with `key` (expense-records.md § 9, "Existing receipts are
 * encrypted once"). Run by the desktop app at every start, before its server starts, so it normally
 * finds nothing to do after the first.
 *
 * Only files `isReceiptName` says DotAmi named are touched (backup.mjs isReceiptFileName, which follows
 * the receipt types the app accepts); everything else in the folder is left as it is.
 *
 * Crash-safe, file by file: the encrypted bytes go to "<name>.encrypting" (opened so it never
 * overwrites anything), are flushed to the disk, and then that file is renamed over the plain one,
 * which the file system does in one step. Ended before the rename, the plain file is whole and the
 * leftover is removed at the next run; ended after it, the encrypted file is whole. A file that can't
 * be done now (another program has it open) stays plain, counted in `failed`, and is tried next time.
 *
 * `onStep(step, name)` is for the tests, which end the process at "temp-written" or "renamed".
 * @param {string} folder
 * @param {Buffer} key
 * @param {{ isReceiptName: (name: string) => boolean, onStep?: (step: "temp-written" | "renamed", name: string) => void }} options
 * @returns {{ encrypted: number, already: number, failed: number, leftoversRemoved: number }}
 */
export function encryptReceiptsIn(folder, key, { isReceiptName, onStep = () => {} }) {
  const result = { encrypted: 0, already: 0, failed: 0, leftoversRemoved: 0 };
  let entries;
  try {
    entries = readdirSync(folder, { withFileTypes: true }).map((e) => ({ name: e.name, isFile: e.isFile() }));
  } catch (error) {
    if (error?.code === "ENOENT") return result;
    throw error;
  }

  // Leftovers of a run that was ended part-way. Their plain file is still whole, so they go.
  for (const { name, isFile } of entries) {
    if (!isFile || !name.endsWith(IN_PROGRESS) || !isReceiptName(name.slice(0, -IN_PROGRESS.length))) continue;
    try {
      rmSync(path.join(folder, name));
      result.leftoversRemoved += 1;
    } catch {
      // Left for the next run; the write below for its receipt then fails and is counted.
    }
  }

  const receipts = entries
    .filter((e) => e.isFile && isReceiptName(e.name))
    .map((e) => e.name)
    .sort();
  for (const name of receipts) {
    const id = receiptIdOfName(name);
    if (!id) continue;
    const file = path.join(folder, name);
    const temp = `${file}${IN_PROGRESS}`;
    let plain;
    try {
      plain = readSmallFile(file);
    } catch {
      result.failed += 1;
      continue;
    }
    if (plain === null) continue; // bigger than any receipt DotAmi keeps: not one of its own
    if (isEncryptedReceipt(plain)) {
      result.already += 1;
      continue;
    }
    let tempIsOurs = false;
    try {
      const encrypted = encryptReceipt(plain, { key, id });
      const fd = openSync(temp, "wx");
      tempIsOurs = true;
      try {
        let done = 0;
        while (done < encrypted.length) done += writeSync(fd, encrypted, done, encrypted.length - done);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      onStep("temp-written", name);
      renameSync(temp, file);
      tempIsOurs = false;
      result.encrypted += 1;
      onStep("renamed", name);
    } catch {
      result.failed += 1;
      // Only a temp file this run created is removed; the plain receipt was never touched.
      if (tempIsOurs) rmSync(temp, { force: true });
    }
  }
  return result;
}

/** A file's bytes through one open handle, or null when it is bigger than any receipt (plain or encrypted). */
function readSmallFile(file) {
  const fd = openSync(file, "r");
  try {
    const size = fstatSync(fd).size;
    if (size > MAX_PLAIN_BYTES + ENCRYPTED_OVERHEAD) return null;
    const bytes = Buffer.alloc(size);
    let read = 0;
    while (read < size) {
      const n = readSync(fd, bytes, read, size - read, read);
      if (n === 0) break;
      read += n;
    }
    return bytes.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}
