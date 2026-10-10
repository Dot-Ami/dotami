import type { Prisma, PrismaClient } from "@prisma/client";

import {
  clearWipePending,
  deleteSafetyCopies,
  deleteSetAsideReceiptFolders,
  listSafetyCopies,
  listSetAsideReceiptFolders,
  readWipePending,
  writeWipePending,
} from "@/desktop/wipe-pending.mjs";
import { logRouteError } from "@/lib/api/log-error";

import { DELETE_MENU, type DeleteKindId, type DeleteMenuEntry, type KeptLink } from "./inventory";
import { affectedTables, folderKeys, keptLinkKey, keptLinks, SAFETY_COPIES_KEY, SET_ASIDE_RECEIPTS_KEY } from "./kept-links";

/**
 * [8d] The "Delete" menu on /your-data, the server side. The person ticks kinds of data
 * (lib/privacy/inventory.ts DELETE_MENU says which tables each kind empties and which the database
 * empties along with them), the page asks twice, and this removes them — then wipes the data
 * file's free space so the deleted rows can't be read back out of it.
 *
 * Why a wipe at all: SQLite doesn't erase a deleted row, it marks the space free. Until that space
 * is reused, the words are still sitting in the file's bytes (tests/privacy-delete.spec.ts shows it
 * with a marker string). VACUUM rebuilds the file from what is left, so the free pages — and the
 * deleted text in them — are gone. It needs free disk space about the size of the file, and it
 * can't run while another connection is in the middle of a transaction; when it fails, the rows
 * are still deleted and the page says their space isn't wiped yet, with a way to try again.
 *
 * The safety copies in the backups folder are whole copies of the file, so they still hold what
 * was deleted. They have their own box: ticked, DotAmi's own copies there are deleted too
 * (desktop/wipe-pending.mjs says which files those are, and never follows a link out of the folder).
 * [8i] The same box clears the receipt folders DotAmi set aside there (Start a new key's
 * receipts-locked-…, a restore's receipts-before-restore-…; expense-records.md § 11): their count is
 * checked like the copies', and only DotAmi's own files in them go.
 *
 * A wipe that can't finish now is finished later. Before anything is deleted, a "wipe pending" note
 * goes beside the data file, naming the safety copies and set-aside folders still to delete; it is
 * removed once the wipe and those deletions have worked. The desktop app finishes what the note owes the next time it
 * starts (desktop/main.mjs), and "Try the wipe again" finishes it now (finishWipe).
 *
 * What this can't reach: the disk under the file (the journal SQLite writes during a change is
 * deleted afterwards, not overwritten; a deleted safety copy isn't overwritten either; and a drive
 * keeps its own spare copies) and what the window stored in earlier launches. The page says each.
 */

/** A request this can't carry out as asked; the message is said to the person as is. */
export class DeleteInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeleteInputError";
  }
}

/**
 * How many rows each table holds, keyed by the model's name in prisma/schema.prisma — and, when the
 * safety-copies box is ticked, how many safety copies, under SAFETY_COPIES_KEY, and how many receipt
 * folders set aside in the backups folder, under SET_ASIDE_RECEIPTS_KEY.
 */
export type TableCounts = Record<string, number>;

// The keys the box's files are counted under (lib/privacy/kept-links.ts, shared with the menu in the window).
export { SAFETY_COPIES_KEY, SET_ASIDE_RECEIPTS_KEY };

/** Where the data file is, for the safety copies and the wipe-pending note. */
export interface DeleteFiles {
  /** The data file's path; null or missing when the database setting isn't a file. */
  dataFile?: string | null;
  /** Deletes one file: unlinkSync, unless a test needs one that fails. */
  remove?: (file: string) => void;
}

export type DeleteResult =
  | {
      /** Something changed since the person looked (an import, an agent's proposal): nothing was deleted. */
      status: "changed";
      counts: TableCounts;
    }
  | {
      status: "deleted";
      /** Rows removed from each affected table (and safety copies, under SAFETY_COPIES_KEY, when ticked). */
      deleted: TableCounts;
      /**
       * Rows left in each affected table, read back after the delete: all zero. Safety copies left
       * are ones another program held open; the wipe-pending note keeps them owed. Null when the
       * read-back failed.
       */
      left: TableCounts | null;
      /**
       * Rows that stayed with their link cleared, per table (an idea's expense records, now "not
       * attached yet"): how many lost the link, and how many rows the table holds afterwards (null
       * when the read-back failed). Absent when the ticked kinds keep nothing.
       */
      kept?: Record<string, { unlinked: number; total: number | null }>;
      /** True once the file's free space is wiped; false means the rows are gone but their space isn't wiped yet. */
      wiped: boolean;
    };

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type TableDelegate = {
  count(args?: { where: Record<string, unknown> }): Promise<number>;
  deleteMany(): Promise<{ count: number }>;
};

/** A table's client by its model name; the inventory names tables, so one Prisma doesn't know throws loudly. */
function table(client: PrismaClient | Prisma.TransactionClient, model: string): TableDelegate {
  const delegate = (client as unknown as Record<string, TableDelegate | undefined>)[lowerFirst(model)];
  if (!delegate || typeof delegate.deleteMany !== "function") {
    throw new Error(`The delete menu names "${model}", but the database client has no such table.`);
  }
  return delegate;
}

/**
 * The menu entries a request ticked, in the menu's own order, or a DeleteInputError. A kind
 * DotAmi doesn't keep yet (remembered columns) can't be ticked, and neither can an unknown one.
 */
export function pickKinds(kinds: unknown): DeleteMenuEntry[] {
  if (!Array.isArray(kinds) || kinds.length === 0) {
    throw new DeleteInputError("Tick at least one kind of data to delete.");
  }
  const wanted = new Set<string>();
  for (const k of kinds) {
    if (typeof k !== "string") throw new DeleteInputError("That isn't a kind of data DotAmi can delete.");
    wanted.add(k);
  }
  for (const k of wanted) {
    const entry = DELETE_MENU.find((e) => e.id === k);
    if (!entry) throw new DeleteInputError("That isn't a kind of data DotAmi can delete.");
    if (!entry.built) throw new DeleteInputError(`DotAmi doesn't keep ${entry.label.toLowerCase()} yet, so there is nothing to delete.`);
  }
  return DELETE_MENU.filter((e) => wanted.has(e.id));
}

// affectedTables and keptLinks live in ./kept-links, shared with the menu in the window, so both
// sides work out the same tables and kept links. Re-exported here for the route and the tests.
export { affectedTables, keptLinks };

/**
 * The counts a set of menu entries needs from the page: every table it touches, then, if that box is
 * ticked, the safety copies and the receipt folders set aside in the backups folder.
 */
export function affectedKeys(entries: readonly DeleteMenuEntry[]): string[] {
  const keys = affectedTables(entries);
  for (const e of entries) for (const k of folderKeys(e)) if (!keys.includes(k)) keys.push(k);
  return keys;
}

async function countTables(client: PrismaClient | Prisma.TransactionClient, models: readonly string[]): Promise<TableCounts> {
  const counts: TableCounts = {};
  for (const m of models) counts[m] = await table(client, m).count();
  return counts;
}

/**
 * How many rows each kept link still points somewhere, keyed by keptLinkKey ("Expense.ventureId"):
 * the records that would lose their link, which is the number the menu warns about. The page reads
 * these (lib/privacy/holdings.ts) and the delete checks them again, like the table counts.
 */
export async function countKeptLinks(client: PrismaClient | Prisma.TransactionClient, links: readonly KeptLink[]): Promise<TableCounts> {
  const counts: TableCounts = {};
  for (const k of links) counts[keptLinkKey(k)] = await table(client, k.model).count({ where: { [k.field]: { not: null } } });
  return counts;
}

/**
 * Reads `seen` from a request: a count per key (a table, a kept link, or the safety copies), as the
 * page showed them. Anything else is refused.
 */
function readSeen(seen: unknown, keys: readonly string[]): TableCounts {
  if (typeof seen !== "object" || seen === null || Array.isArray(seen)) {
    throw new DeleteInputError("Say how many records you saw, so DotAmi can check nothing changed since.");
  }
  const out: TableCounts = {};
  for (const m of keys) {
    const n = (seen as Record<string, unknown>)[m];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0) {
      throw new DeleteInputError("Say how many records you saw, so DotAmi can check nothing changed since.");
    }
    out[m] = n;
  }
  return out;
}

/** Thrown inside the transaction to roll it back when the counts moved; never leaves this file. */
class CountsChanged extends Error {
  constructor(readonly counts: TableCounts) {
    super("counts changed");
  }
}

/**
 * Wipes the file's free space (VACUUM), outside any transaction, and says whether it worked: true
 * when the file has no free pages left. A failure (another connection busy, not enough disk) is
 * reported as false, never thrown — the rows are already gone, and the person is told the wipe
 * is still owed. Only the error's name and code are logged (lib/api/log-error.ts).
 */
export async function wipeFreeSpace(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe("VACUUM");
    const rows = await prisma.$queryRawUnsafe<{ freelist_count: number | bigint }[]>("PRAGMA freelist_count");
    return Number(rows[0]?.freelist_count ?? 1) === 0;
  } catch (error) {
    logRouteError("your-data/delete wipe", error);
    return false;
  }
}

/** `a`, then whatever of `b` isn't in it already. */
const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];

type Note = ReturnType<typeof readWipePending>;

/**
 * Puts the wipe-pending note back the way it was before this Delete, because nothing was deleted
 * after all: the earlier note if there was one, none if not. A note owing safety copies the person
 * didn't end up deleting would delete them at the next start, so this matters.
 */
function restoreNote(dataFile: string, previous: Note) {
  try {
    if (previous) {
      writeWipePending(dataFile, { backups: previous.backups, receiptFolders: previous.receiptFolders, since: previous.since ?? undefined });
    } else clearWipePending(dataFile);
  } catch (error) {
    logRouteError("your-data/delete wipe note", error);
  }
}

/** After the wipe: no note when everything is done, otherwise a note owing what is left. */
function settleNote(dataFile: string, since: string | undefined, wiped: boolean, copiesLeft: readonly string[], foldersLeft: readonly string[]) {
  try {
    if (wiped && copiesLeft.length === 0 && foldersLeft.length === 0) clearWipePending(dataFile);
    else writeWipePending(dataFile, { backups: copiesLeft, receiptFolders: foldersLeft, since });
  } catch (error) {
    logRouteError("your-data/delete wipe note", error);
  }
}

/**
 * Deletes every row of the tables the ticked kinds name (and, when that box is ticked, DotAmi's
 * safety copies in the backups folder and the receipt folders it set aside there), then wipes the file.
 *
 * `seen` is the count of each affected table as the person saw it when they confirmed. If any
 * differs from the file now, nothing is deleted and the fresh counts come back, so the person
 * never deletes something they weren't shown. The check and the delete run in one transaction,
 * so nothing can slip in between, and a failure part-way deletes nothing.
 *
 * Ideas are deleted by deleting their rows: the schema's onDelete: Cascade takes their links, map
 * progress and figures with them (DELETE_MENU's `alsoDeletes`, which a test keeps equal to the
 * schema), so this needs no list of an idea's children of its own. Their expense records are kept:
 * onDelete: SetNull clears each record's idea (the maintainer's decision of 2026-10-08). The page
 * told the person how many would stay, so that number is in `seen` and checked like the rest: a
 * record attached to an idea since they looked makes the warning untrue, and nothing is deleted.
 *
 * The safety copies and the set-aside receipt folders are files, so they can't be in the transaction:
 * their counts are checked first, and they are deleted only once the rows are. Without
 * `files.dataFile` there is no folder to look in and no note to leave: the safety-copies box is
 * refused, and the rest works as before.
 */
export async function deleteData(
  prisma: PrismaClient,
  request: { kinds: unknown; seen: unknown },
  files: DeleteFiles = {},
): Promise<DeleteResult> {
  const entries = pickKinds(request.kinds);
  const models = affectedTables(entries);
  const links = keptLinks(entries);
  // What the transaction checks: every affected table and every kept link's count.
  const keys = [...models, ...links.map(keptLinkKey)];
  const withCopies = entries.some((e) => e.folder === "backups");
  const dataFile = files.dataFile ?? null;
  if (withCopies && !dataFile) {
    throw new DeleteInputError("This copy of DotAmi has no data folder, so it has no safety copies to delete.");
  }
  const seen = readSeen(request.seen, [...affectedKeys(entries), ...links.map(keptLinkKey)]);

  // The safety copies and set-aside receipt folders being deleted: listed once, and checked against
  // what the person saw.
  const copies = withCopies && dataFile ? listSafetyCopies(dataFile).names : [];
  const folders = withCopies && dataFile ? listSetAsideReceiptFolders(dataFile).names : [];
  const fileCounts: TableCounts = withCopies ? { [SAFETY_COPIES_KEY]: copies.length, [SET_ASIDE_RECEIPTS_KEY]: folders.length } : {};
  if (withCopies && (copies.length !== seen[SAFETY_COPIES_KEY] || folders.length !== seen[SET_ASIDE_RECEIPTS_KEY])) {
    return {
      status: "changed",
      counts: {
        ...(await countTables(prisma, models)),
        ...(await countKeptLinks(prisma, links)),
        ...fileCounts,
      },
    };
  }

  // The note goes down before anything is deleted, so a wipe the computer cuts short from here on
  // is finished later. It owes what an earlier Delete still owed plus the copies and folders ticked
  // now. If it can't be written (a full disk), the delete goes ahead and the page offers the retry.
  const previous = dataFile ? readWipePending(dataFile) : null;
  const owedCopies = union(previous?.backups ?? [], copies);
  const owedFolders = union(previous?.receiptFolders ?? [], folders);
  const since = previous?.since ?? new Date().toISOString();
  let noted = false;
  if (dataFile) {
    try {
      writeWipePending(dataFile, { backups: owedCopies, receiptFolders: owedFolders, since });
      noted = true;
    } catch (error) {
      logRouteError("your-data/delete wipe note", error);
    }
  }

  let before: TableCounts;
  try {
    before = await prisma.$transaction(
      async (tx) => {
        const now = { ...(await countTables(tx, models)), ...(await countKeptLinks(tx, links)) };
        if (keys.some((k) => now[k] !== seen[k])) throw new CountsChanged(now);
        for (const e of entries) {
          for (const m of e.tables) await table(tx, m).deleteMany();
        }
        return now;
      },
      // A big file takes longer than Prisma's 5-second default; the person is waiting on this one.
      { timeout: 60_000, maxWait: 10_000 },
    );
  } catch (error) {
    // Nothing was deleted, so nothing new is owed.
    if (noted && dataFile) restoreNote(dataFile, previous);
    if (error instanceof CountsChanged) {
      return {
        status: "changed",
        counts: { ...error.counts, ...fileCounts },
      };
    }
    throw error;
  }

  // Only the tables go in `deleted`: the kept links' counts in `before` aren't deletions.
  const deleted: TableCounts = Object.fromEntries(models.map((m) => [m, before[m]]));

  // The rows are gone. Now the copies and the set-aside folders (one another program holds a file of
  // open stays owed), then the wipe.
  const copiesLeft = dataFile ? deleteSafetyCopies(dataFile, owedCopies, { remove: files.remove }).left : [];
  const foldersLeft = dataFile ? deleteSetAsideReceiptFolders(dataFile, owedFolders, { remove: files.remove }).left : [];
  if (withCopies) {
    deleted[SAFETY_COPIES_KEY] = copies.filter((n) => !copiesLeft.includes(n)).length;
    deleted[SET_ASIDE_RECEIPTS_KEY] = folders.filter((n) => !foldersLeft.includes(n)).length;
  }
  // Deleting only safety copies leaves nothing in the data file to wipe, unless an earlier wipe is owed.
  const wiped = models.length > 0 || previous ? await wipeFreeSpace(prisma) : true;
  if (noted && dataFile) settleNote(dataFile, since, wiped, copiesLeft, foldersLeft);

  // The rows are gone by now. If reading the file back fails, say that, rather than throw into
  // the route's "nothing was deleted" answer, which would no longer be true.
  const keptModels = [...new Set(links.map((k) => k.model))];
  let left: TableCounts | null;
  let keptTotals: TableCounts | null;
  try {
    left = await countTables(prisma, models);
    if (withCopies) {
      left[SAFETY_COPIES_KEY] = copies.filter((n) => copiesLeft.includes(n)).length;
      left[SET_ASIDE_RECEIPTS_KEY] = folders.filter((n) => foldersLeft.includes(n)).length;
    }
    keptTotals = await countTables(prisma, keptModels);
  } catch (error) {
    logRouteError("your-data/delete read-back", error);
    left = null;
    keptTotals = null;
  }
  if (links.length === 0) return { status: "deleted", deleted, left, wiped };
  const kept: Record<string, { unlinked: number; total: number | null }> = {};
  for (const k of links) {
    const prev = kept[k.model]?.unlinked ?? 0;
    kept[k.model] = { unlinked: prev + before[keptLinkKey(k)], total: keptTotals ? keptTotals[k.model] : null };
  }
  return { status: "deleted", deleted, left, kept, wiped };
}

/**
 * "Try the wipe again": finishes what an earlier Delete still owes — the safety copies and set-aside
 * receipt folders its note names, then the wipe — and removes the note once all of it has worked.
 * With no note it just wipes, as before. `backupsLeft` and `receiptFoldersLeft` count the copies and
 * folders still owed (another program holds a file open).
 */
export async function finishWipe(
  prisma: PrismaClient,
  files: DeleteFiles = {},
): Promise<{ wiped: boolean; backupsLeft: number; receiptFoldersLeft: number }> {
  const dataFile = files.dataFile ?? null;
  const owed = dataFile ? readWipePending(dataFile) : null;
  const left = dataFile && owed ? deleteSafetyCopies(dataFile, owed.backups, { remove: files.remove }).left : [];
  const foldersLeft = dataFile && owed ? deleteSetAsideReceiptFolders(dataFile, owed.receiptFolders, { remove: files.remove }).left : [];
  const wiped = await wipeFreeSpace(prisma);
  if (dataFile && owed) settleNote(dataFile, owed.since ?? undefined, wiped, left, foldersLeft);
  return { wiped, backupsLeft: left.length, receiptFoldersLeft: foldersLeft.length };
}

/** The ids on the menu, for the route's own checks and the tests. */
export const DELETE_KIND_IDS: readonly DeleteKindId[] = DELETE_MENU.map((e) => e.id);
