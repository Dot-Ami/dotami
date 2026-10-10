/**
 * [8i] Receipts, the server side: a copy of each receipt file in the receipts/ folder beside the data
 * file, and a Receipt row describing it (the maintainer's decision of 2026-10-07: section 2, option A
 * of docs/architecture/expense-records.md; the design as built is § 7 there).
 *
 * The rules this file keeps:
 *   - DotAmi names every file itself: "<32 random hex>.<extension of the type read from the bytes>".
 *     Nothing a caller sends becomes part of a path; the person's own file name isn't kept at all.
 *   - The type is read from the bytes (sniff.ts), here, whatever the window already checked.
 *   - At most 10 MB, and a picture no larger than the pixel limits (types.ts).
 *   - The server stores the bytes and never opens, decodes or runs them: sniff.ts reads a few header
 *     bytes to learn the type and size, and that is all.
 *   - A receipt is added only to a record the person agreed to; removing and reading one (for the
 *     viewer, readReceiptFile) work on any of their records. Agents can do none of the three: the
 *     routes answer only DotAmi's own page.
 *   - Nothing here logs a word, an amount, a file name or a path.
 *   - In the desktop app the file on the disk is encrypted (expense-records.md § 9): AES-256-GCM with
 *     the key the app opened (lock.ts), in the format of desktop/receipt-crypto.mjs. The row's size and
 *     SHA-256 are always of the receipt's own bytes, checked after decrypting. A copy run from source
 *     has no key and keeps the bytes as they are; a plain file still opens wherever it is found.
 *
 * Files and rows can drift apart (the app stops between the two writes, a record's row is deleted
 * and the database takes its Receipt row with it). sweepOrphanReceipts() removes DotAmi's own files
 * that no row describes; it runs after every delete and before every add.
 */

import { createHash, randomBytes } from "node:crypto";
import { mkdir, open, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";

import {
  decryptReceipt,
  ENCRYPTED_OVERHEAD,
  encryptedKeyId,
  encryptReceipt,
  isEncryptedReceipt,
  ReceiptCryptoError,
} from "@/desktop/receipt-crypto.mjs";
import { databaseFilePath } from "@/lib/settings/today";

import { findPersonExpense, rowToExpense } from "../store";
import type { ExpenseView } from "../types";
import { receiptLock, type ReceiptLock } from "./lock";
import { LOCKED_RECEIPT_MESSAGES, receiptsCanBeAdded } from "./protection";
import { RECEIPT_REFUSALS } from "./refusals";
import { sniffReceipt } from "./sniff";
import { extensionOf, isReceiptType, MAX_RECEIPT_BYTES, RECEIPT_ID, RECEIPT_TYPES, type ReceiptType } from "./types";

/** The folder's name beside the data file. lib/privacy/inventory.ts FOLDERS lists it under this name. */
export const RECEIPTS_FOLDER = "receipts";

/** How old an unfinished write (".partial") must be before the sweep treats it as abandoned. */
const PARTIAL_AGE_MS = 10 * 60_000;

/** Only names DotAmi itself writes; anything else in the folder is never touched. */
const EXTENSIONS = RECEIPT_TYPES.map((t) => t.extension).join("|");
const STORED_NAME = new RegExp(`^([0-9a-f]{32})\\.(${EXTENSIONS})$`);
// Group 1 is the final name the write was heading for ("<id>.<ext>").
const PARTIAL_NAME = new RegExp(`^([0-9a-f]{32}\\.(?:${EXTENSIONS}))\\.partial$`);

/** A receipt request that can't be done as asked. `message` is said to the person as is; `status` is the HTTP answer. */
export class ReceiptError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ReceiptError";
  }
}

/**
 * The receipts folder for this copy: "receipts" beside the data file DATABASE_URL points at, or null
 * when it doesn't point at a file (then DotAmi keeps no receipts). The desktop app's data file is
 * <data folder>/dotami.db, so its receipts sit in <data folder>/receipts.
 */
export function receiptsFolder(databaseUrl: string | undefined = process.env.DATABASE_URL, cwd: string = process.cwd()): string | null {
  const file = databaseFilePath(databaseUrl, cwd);
  return file ? path.join(path.dirname(file), RECEIPTS_FOLDER) : null;
}

/** The stored file's name: built only from DotAmi's own id and the type it read, both checked again here. */
export function receiptFileName(id: string, type: string): string {
  if (!RECEIPT_ID.test(id) || !isReceiptType(type)) throw new Error("not a receipt DotAmi named");
  return `${id}.${extensionOf(type)}`;
}

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

const noFolder = () => new ReceiptError("This copy of DotAmi has no data folder, so it can't keep receipt files.", 409);
const keyUnreadable = () => new ReceiptError(LOCKED_RECEIPT_MESSAGES.keyUnreadable, 409);

/** The bytes as they go on the disk: encrypted for this receipt's id when the key is open, as they are otherwise. */
const onDiskBytes = (bytes: Uint8Array, id: string, lock: ReceiptLock): Uint8Array =>
  lock.state === "on" ? encryptReceipt(bytes, { key: lock.key, id }) : bytes;

/**
 * The receipt's own bytes from what is on the disk: decrypted when the file is encrypted, as they are
 * when it is plain. Throws ReceiptError when it can't be opened here (another key, or no key in this
 * copy), and returns null when it is damaged or changed (the caller says so in its own words).
 */
function receiptBytesOf(file: Buffer, id: string, lock: ReceiptLock): Buffer | null {
  if (!isEncryptedReceipt(file)) return file;
  switch (lock.state) {
    case "source":
      throw new ReceiptError(LOCKED_RECEIPT_MESSAGES.source, 409);
    case "no-key-store":
      throw new ReceiptError(LOCKED_RECEIPT_MESSAGES.noKeyStore, 409);
    case "key-unreadable":
    case "key-out-of-reach":
    case "new-key-at-restart":
      throw keyUnreadable();
  }
  try {
    return decryptReceipt(file, { key: lock.key, id });
  } catch (error) {
    if (error instanceof ReceiptCryptoError && error.kind === "other-key") throw new ReceiptError(LOCKED_RECEIPT_MESSAGES.otherKey, 409);
    if (error instanceof ReceiptCryptoError) return null;
    throw error;
  }
}

/**
 * Keeps `bytes` as the receipt of one of the person's agreed records. Returns the record as the page
 * shows it. Refuses (ReceiptError) a file DotAmi doesn't keep, a record that isn't theirs or isn't
 * agreed, and a record that already has a receipt (the person removes the old one first).
 *
 * Order of writes: the bytes go to "<name>.partial"; then the row; then the rename. A sweep keeps
 * young .partial files, so it can't remove a file that is still being written. If the app stops
 * before the row, the .partial is an orphan the sweep removes later. If it stops after the row and
 * before the rename, the sweep finishes the rename later (checking size and SHA-256 against the
 * row first), so the record never keeps a receipt whose only copy was thrown away.
 *
 * With the key open (`lock`, the desktop app), what goes on the disk is the encrypted file, made in
 * memory; the row describes the receipt's own bytes. While the key can't be opened, nothing is added.
 */
export async function addReceipt(
  prisma: PrismaClient,
  folder: string | null,
  expenseId: unknown,
  bytes: Uint8Array,
  lock: ReceiptLock = receiptLock(),
): Promise<ExpenseView> {
  if (!folder) throw noFolder();
  // No key to encrypt with: the old one can't be opened, or a new one comes only at the next start.
  if (!receiptsCanBeAdded(lock.state)) throw keyUnreadable();
  if (typeof expenseId !== "string" || expenseId.length === 0) throw new ReceiptError("Say which expense record the receipt is for.", 400);

  const sniffed = sniffReceipt(bytes);
  if (!sniffed.ok) throw new ReceiptError(RECEIPT_REFUSALS[sniffed.code], sniffed.code === "too-big" ? 413 : 400);

  const record = await findPersonExpense(prisma, expenseId);
  if (!record || record.status === "discarded") throw new ReceiptError("That expense record isn't in DotAmi.", 404);
  if (record.status !== "confirmed") {
    throw new ReceiptError("A receipt can be added only to a record you agreed to. Agree to it first.", 409);
  }
  if (record.receipt) throw new ReceiptError("This record already has a receipt. Remove it first to add another.", 409);

  // Before writing, so files left by an earlier crash don't pile up.
  await sweepOrphanReceipts(prisma, folder, Date.now, lock);

  const id = randomBytes(16).toString("hex");
  const name = receiptFileName(id, sniffed.type);
  const finalPath = path.join(folder, name);
  const partialPath = `${finalPath}.partial`;
  await mkdir(folder, { recursive: true });
  // "wx": never overwrite anything, even a file with this random name.
  await writeFile(partialPath, onDiskBytes(bytes, id, lock), { flag: "wx" });

  try {
    await prisma.receipt.create({
      data: { id, expenseId: record.id, type: sniffed.type, bytes: bytes.length, sha256: sha256(bytes) },
    });
  } catch (error) {
    await rm(partialPath, { force: true });
    // Another window added one to the same record in between (the one-receipt-per-record index).
    if ((error as { code?: unknown })?.code === "P2002") {
      throw new ReceiptError("This record already has a receipt. Remove it first to add another.", 409);
    }
    throw error;
  }

  try {
    await rename(partialPath, finalPath);
  } catch (error) {
    // The row must not describe a file that isn't there: undo it, then report the failure.
    await prisma.receipt.deleteMany({ where: { id } });
    await rm(partialPath, { force: true });
    throw error;
  }

  const saved = await findPersonExpense(prisma, record.id);
  return rowToExpense(saved!);
}

/**
 * Removes the receipt of one of the person's records: the row first, then the file. Returns the
 * record. A file that can't be removed now (another program has it open) is left for the next sweep;
 * the row is already gone, so DotAmi no longer shows or backs it up.
 */
export async function removeReceipt(prisma: PrismaClient, folder: string | null, expenseId: unknown): Promise<ExpenseView> {
  if (typeof expenseId !== "string" || expenseId.length === 0) throw new ReceiptError("Say which expense record you mean.", 400);
  const record = await findPersonExpense(prisma, expenseId);
  if (!record || record.status === "discarded") throw new ReceiptError("That expense record isn't in DotAmi.", 404);
  if (!record.receipt) throw new ReceiptError("This record has no receipt.", 409);

  await prisma.receipt.deleteMany({ where: { id: record.receipt.id } });
  if (folder) {
    try {
      await rm(path.join(folder, receiptFileName(record.receipt.id, record.receipt.type)), { force: true });
    } catch {
      // Left for the sweep (the file is no longer described by any row).
    }
  }
  const after = await findPersonExpense(prisma, record.id);
  return rowToExpense(after!);
}

export interface SweepResult {
  /** DotAmi's own files no row describes (and abandoned .partial files), removed now. */
  removed: number;
  /** Files of DotAmi's that should have gone but couldn't be removed (in use, no permission). */
  failed: number;
  /** DotAmi's files still described by a row, left alone. */
  kept: number;
}

/**
 * Removes every file in the receipts folder that DotAmi wrote and no Receipt row describes: a record
 * deleted (its row went with it), a receipt removed when the file couldn't go at once, a write the
 * app never finished. Anything not named the way DotAmi names files is never touched, so a file the
 * person put in the folder themselves stays.
 *
 * The folder is listed BEFORE the rows are read: a receipt added in between has its row written before
 * its file gets its final name, so it can never be listed as a file without a row.
 *
 * One abandoned write is not an orphan: the app stopped after addReceipt wrote the row but before it
 * renamed "<name>.partial" to "<name>". That .partial is the only copy of a receipt the record says it
 * has, so the sweep finishes the add instead (finishAbandonedAdd) when the bytes are the ones the row
 * describes, and drops the row along with the file when they aren't.
 */
export async function sweepOrphanReceipts(
  prisma: PrismaClient,
  folder: string | null,
  now: () => number = Date.now,
  lock: ReceiptLock = receiptLock(),
): Promise<SweepResult> {
  const result: SweepResult = { removed: 0, failed: 0, kept: 0 };
  if (!folder) return result;
  let names: string[];
  try {
    names = (await readdir(folder, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
  } catch (error) {
    if ((error as { code?: unknown })?.code === "ENOENT") return result;
    throw error;
  }

  const rows = await prisma.receipt.findMany({ select: { id: true, type: true, bytes: true, sha256: true } });
  const byName = new Map<string, DescribedFile>();
  for (const r of rows) {
    if (RECEIPT_ID.test(r.id) && isReceiptType(r.type)) byName.set(receiptFileName(r.id, r.type), r);
  }

  for (const name of names) {
    let orphan = false;
    if (STORED_NAME.test(name)) {
      orphan = !byName.has(name);
    } else {
      const partial = name.match(PARTIAL_NAME);
      if (!partial) continue; // not DotAmi's
      let age: number;
      try {
        age = now() - (await stat(path.join(folder, name))).mtimeMs;
      } catch {
        continue; // gone already
      }
      if (age <= PARTIAL_AGE_MS) continue; // may still be being written
      const finalName = partial[1];
      const row = byName.get(finalName);
      // A row describes it and the finished file isn't there: this is the only copy.
      if (row && !names.includes(finalName)) {
        const outcome = await finishAbandonedAdd(prisma, folder, name, finalName, row, lock);
        if (outcome === "finished") {
          result.kept += 1;
          continue;
        }
        if (outcome === "failed") {
          result.failed += 1;
          continue;
        }
        // "dropped": the row is gone; the file goes below like any other orphan.
      }
      orphan = true;
    }
    if (!orphan) {
      result.kept += 1;
      continue;
    }
    try {
      await rm(path.join(folder, name), { force: true });
      result.removed += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

/** What a Receipt row says about its file, enough to check the bytes. */
interface DescribedFile {
  id: string;
  bytes: number;
  sha256: string;
}

/**
 * An add the app stopped between the row and the rename. If the .partial file is exactly what the
 * row describes (same size, same SHA-256), it is renamed into place and the receipt is whole again
 * ("finished"). If it isn't (the write itself was cut short), the row is removed, since no copy of
 * the receipt it describes exists, and the caller removes the file ("dropped"). "failed": the file
 * couldn't be read or renamed now; both are left for a later sweep.
 *
 * An encrypted .partial is decrypted to be checked. One that this copy can't open (another key, or no
 * key here) is "failed", never "dropped": it may be the only copy, and a copy with the key can finish it.
 */
async function finishAbandonedAdd(
  prisma: PrismaClient,
  folder: string,
  partialName: string,
  finalName: string,
  row: DescribedFile,
  lock: ReceiptLock,
): Promise<"finished" | "dropped" | "failed"> {
  const partialPath = path.join(folder, partialName);
  let matches: boolean;
  try {
    // One open file for both the size and the bytes, so they are of the same file. The size first,
    // so a file far larger than any receipt is never read whole.
    const handle = await open(partialPath, "r");
    try {
      const size = (await handle.stat()).size;
      if (size !== row.bytes && size !== row.bytes + ENCRYPTED_OVERHEAD) {
        matches = false;
      } else {
        const plain = receiptBytesOf(await handle.readFile(), row.id, lock);
        matches = plain !== null && plain.length === row.bytes && sha256(plain) === row.sha256;
      }
    } finally {
      await handle.close();
    }
  } catch {
    // Unreadable now, or encrypted with a key this copy doesn't have (receiptBytesOf threw).
    return "failed";
  }
  if (!matches) {
    await prisma.receipt.deleteMany({ where: { id: row.id } });
    return "dropped";
  }
  try {
    await rename(partialPath, path.join(folder, finalName));
    return "finished";
  } catch {
    return "failed";
  }
}

/** The stored type of a receipt row, narrowed; exported for the viewer route and the tests. */
export function storedType(type: string): ReceiptType | null {
  return isReceiptType(type) ? type : null;
}

/**
 * Reads one record's receipt file for the viewer (expense-records.md § 8, rule 2): the path is built
 * from the row, never from the request; at most 10 MB is read; and the size and SHA-256 must match
 * what the row says, so a file changed or replaced on the disk since it was added is refused, not
 * shown. Works on any of the person's records that has a receipt (agreed or taken back). Returns the
 * type DotAmi stored and the bytes; the window checks the bytes again before drawing anything.
 *
 * An encrypted file is decrypted here, in memory, and only then checked against the row; nothing
 * decrypted is written anywhere. One encrypted with another key, or found by a copy with no key, is
 * refused with a sentence that says which (protection.ts LOCKED_RECEIPT_MESSAGES); a damaged one is
 * "changed", like any other file that no longer matches its row.
 */
export async function readReceiptFile(
  prisma: PrismaClient,
  folder: string | null,
  expenseId: unknown,
  lock: ReceiptLock = receiptLock(),
): Promise<{ type: ReceiptType; bytes: Buffer }> {
  if (!folder) throw noFolder();
  if (typeof expenseId !== "string" || expenseId.length === 0) throw new ReceiptError("Say which expense record you mean.", 400);
  const record = await findPersonExpense(prisma, expenseId);
  if (!record || record.status === "discarded") throw new ReceiptError("That expense record isn't in DotAmi.", 404);
  const receipt = record.receipt;
  const type = receipt ? storedType(receipt.type) : null;
  if (!receipt || !type || !RECEIPT_ID.test(receipt.id)) throw new ReceiptError("This record has no receipt.", 404);

  const changed = () =>
    new ReceiptError(
      "The receipt file changed on this computer since you added it, so DotAmi won't show it. Remove the receipt and add it again.",
      409,
    );
  const file = path.join(folder, receiptFileName(receipt.id, type));
  let handle;
  try {
    handle = await open(file, "r");
  } catch (error) {
    if ((error as { code?: unknown })?.code === "ENOENT") {
      const aside = await setAsideFolderHolding(folder, path.basename(file));
      if (aside) {
        throw new ReceiptError(
          `This receipt was set aside when DotAmi started a new key, because the old key couldn't be opened. It is in ${aside}, and opens again only with the old key. To keep a receipt on this record, remove this one and add the file again.`,
          404,
        );
      }
      throw new ReceiptError("The receipt file isn't in the receipts folder any more. Remove the receipt, and add it again if you have it.", 404);
    }
    throw error;
  }
  try {
    // The size first, from the file system: a file that grew is refused before it is read. On the
    // disk a receipt is its own size (plain) or exactly ENCRYPTED_OVERHEAD more (encrypted).
    const { size } = await handle.stat();
    const encryptedSize = receipt.bytes + ENCRYPTED_OVERHEAD;
    if ((size !== receipt.bytes && size !== encryptedSize) || receipt.bytes > MAX_RECEIPT_BYTES) throw changed();
    const onDisk = Buffer.alloc(size);
    let read = 0;
    while (read < size) {
      const { bytesRead } = await handle.read(onDisk, read, size - read, read);
      if (bytesRead === 0) break;
      read += bytesRead;
    }
    if (read !== size) throw changed();
    // A plain file can't start with the encrypted file's magic, so each size goes with one kind only.
    if (isEncryptedReceipt(onDisk) ? size !== encryptedSize : size !== receipt.bytes) throw changed();
    const bytes = receiptBytesOf(onDisk, receipt.id, lock);
    if (bytes === null || bytes.length !== receipt.bytes || sha256(bytes) !== receipt.sha256) throw changed();
    return { type, bytes };
  } finally {
    await handle.close();
  }
}

/** The folders Start a new key moves locked receipts into (desktop/receipt-key.mjs setAsideLockedReceipts). */
const SET_ASIDE_FOLDER = /^receipts-locked-\d+(?:-\d+)?$/;

/**
 * The set-aside folder in backups/ (beside the receipts folder) that holds the file `name`, or null. Only
 * DotAmi's own folder names are looked in, and only for a name DotAmi built from a receipt row.
 */
async function setAsideFolderHolding(folder: string, name: string): Promise<string | null> {
  const backups = path.join(path.dirname(folder), "backups");
  let entries;
  try {
    entries = await readdir(backups, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !SET_ASIDE_FOLDER.test(entry.name)) continue;
    try {
      if ((await stat(path.join(backups, entry.name, name))).isFile()) return path.join(backups, entry.name);
    } catch {
      // Not in this one.
    }
  }
  return null;
}

/** How the receipt files on the disk are kept, for What DotAmi knows about you. Counts only. */
export interface ReceiptFilesProtection {
  /** Encrypted with the key this copy has open. */
  encrypted: number;
  /** Kept as they were given: no key here, or not encrypted yet. */
  plain: number;
  /** Encrypted with a key this copy can't open (a lost key, or the desktop app's key seen from source). */
  locked: number;
}

/**
 * Counts DotAmi's own receipt files in `folder` by how they are kept, reading only the first bytes of
 * each (the magic and the key's id): never a whole file, never a name outside the count.
 */
export async function describeReceiptFiles(folder: string | null, lock: ReceiptLock = receiptLock()): Promise<ReceiptFilesProtection> {
  const counts: ReceiptFilesProtection = { encrypted: 0, plain: 0, locked: 0 };
  if (!folder) return counts;
  let names: string[];
  try {
    names = (await readdir(folder, { withFileTypes: true })).filter((e) => e.isFile() && STORED_NAME.test(e.name)).map((e) => e.name);
  } catch {
    return counts;
  }
  for (const name of names) {
    let head: Buffer;
    try {
      const handle = await open(path.join(folder, name), "r");
      try {
        head = Buffer.alloc(32);
        const { bytesRead } = await handle.read(head, 0, head.length, 0);
        head = head.subarray(0, bytesRead);
      } finally {
        await handle.close();
      }
    } catch {
      continue;
    }
    if (!isEncryptedReceipt(head)) counts.plain += 1;
    else if (lock.state === "on" && encryptedKeyId(head) === lock.keyId) counts.encrypted += 1;
    else counts.locked += 1;
  }
  return counts;
}
