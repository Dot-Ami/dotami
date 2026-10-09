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
 *   - A receipt is added only to a record the person agreed to; removing one works on any of their
 *     records. Agents can do neither: the routes answer only DotAmi's own page.
 *   - Nothing here logs a word, an amount, a file name or a path.
 *
 * Files and rows can drift apart (the app stops between the two writes, a record's row is deleted
 * and the database takes its Receipt row with it). sweepOrphanReceipts() removes DotAmi's own files
 * that no row describes; it runs after every delete and before every add.
 */

import { createHash, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";

import { databaseFilePath } from "@/lib/settings/today";

import { findPersonExpense, rowToExpense } from "../store";
import type { ExpenseView } from "../types";
import { RECEIPT_REFUSALS } from "./refusals";
import { sniffReceipt } from "./sniff";
import { extensionOf, isReceiptType, RECEIPT_ID, RECEIPT_TYPES, type ReceiptType } from "./types";

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
 */
export async function addReceipt(prisma: PrismaClient, folder: string | null, expenseId: unknown, bytes: Uint8Array): Promise<ExpenseView> {
  if (!folder) throw noFolder();
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
  await sweepOrphanReceipts(prisma, folder);

  const id = randomBytes(16).toString("hex");
  const name = receiptFileName(id, sniffed.type);
  const finalPath = path.join(folder, name);
  const partialPath = `${finalPath}.partial`;
  await mkdir(folder, { recursive: true });
  // "wx": never overwrite anything, even a file with this random name.
  await writeFile(partialPath, bytes, { flag: "wx" });

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
export async function sweepOrphanReceipts(prisma: PrismaClient, folder: string | null, now: () => number = Date.now): Promise<SweepResult> {
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
        const outcome = await finishAbandonedAdd(prisma, folder, name, finalName, row);
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
 */
async function finishAbandonedAdd(
  prisma: PrismaClient,
  folder: string,
  partialName: string,
  finalName: string,
  row: DescribedFile,
): Promise<"finished" | "dropped" | "failed"> {
  const partialPath = path.join(folder, partialName);
  let matches: boolean;
  try {
    // The size first, so a file far larger than any receipt is never read whole.
    const size = (await stat(partialPath)).size;
    matches = size === row.bytes && sha256(await readFile(partialPath)) === row.sha256;
  } catch {
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
