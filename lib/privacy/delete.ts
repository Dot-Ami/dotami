import type { Prisma, PrismaClient } from "@prisma/client";

import { logRouteError } from "@/lib/api/log-error";

import { DELETE_MENU, type DeleteKindId, type DeleteMenuEntry, type KeptLink } from "./inventory";
import { affectedTables, keptLinkKey, keptLinks } from "./kept-links";

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
 * What this can't reach: the disk under the file (the journal SQLite writes during a change is
 * deleted afterwards, not overwritten, and a drive keeps its own spare copies), the safety copies
 * in the backups folder, and what the window stored in earlier launches. The page says each.
 */

/** A request this can't carry out as asked; the message is said to the person as is. */
export class DeleteInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeleteInputError";
  }
}

/** How many rows each table holds, keyed by the model's name in prisma/schema.prisma. */
export type TableCounts = Record<string, number>;

export type DeleteResult =
  | {
      /** Something changed since the person looked (an import, an agent's proposal): nothing was deleted. */
      status: "changed";
      counts: TableCounts;
    }
  | {
      status: "deleted";
      /** Rows removed from each affected table. */
      deleted: TableCounts;
      /** Rows left in each affected table, read back after the delete: all zero. Null when the read-back failed. */
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

/** Reads `seen` from a request: a count per key (a table, or a kept link), as the page showed them. Anything else is refused. */
function readSeen(seen: unknown, models: readonly string[]): TableCounts {
  if (typeof seen !== "object" || seen === null || Array.isArray(seen)) {
    throw new DeleteInputError("Say how many records you saw, so DotAmi can check nothing changed since.");
  }
  const out: TableCounts = {};
  for (const m of models) {
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

/**
 * Deletes every row of the tables the ticked kinds name, then wipes the file.
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
 */
export async function deleteData(
  prisma: PrismaClient,
  request: { kinds: unknown; seen: unknown },
): Promise<DeleteResult> {
  const entries = pickKinds(request.kinds);
  const models = affectedTables(entries);
  const links = keptLinks(entries);
  const keys = [...models, ...links.map(keptLinkKey)];
  const seen = readSeen(request.seen, keys);

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
    if (error instanceof CountsChanged) return { status: "changed", counts: error.counts };
    throw error;
  }

  const deleted = Object.fromEntries(models.map((m) => [m, before[m]]));
  const wiped = await wipeFreeSpace(prisma);
  // The rows are gone by now. If reading the file back fails, say that, rather than throw into
  // the route's "nothing was deleted" answer, which would no longer be true.
  const keptModels = [...new Set(links.map((k) => k.model))];
  let left: TableCounts | null;
  let keptTotals: TableCounts | null;
  try {
    left = await countTables(prisma, models);
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

/** The ids on the menu, for the route's own checks and the tests. */
export const DELETE_KIND_IDS: readonly DeleteKindId[] = DELETE_MENU.map((e) => e.id);
