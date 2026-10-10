import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";

import { listSafetyCopies, wipePendingFile } from "@/desktop/wipe-pending.mjs";

import { receiptLock, receiptsSetAsideTo, type ReceiptLock, type ReceiptLockState } from "@/lib/expenses/receipts/lock";
import { describeReceiptFiles, RECEIPTS_FOLDER, type ReceiptFilesProtection } from "@/lib/expenses/receipts/store";
import {
  FIGURE_SOURCE_KINDS,
  FIGURE_STATUSES,
  type FigureSourceKind,
  type FigureStatus,
} from "@/lib/figures/types";
import type { SettingsToday } from "@/lib/settings/today";

import { countKeptLinks } from "./delete";
import {
  DELETE_MENU,
  FOLDERS,
  SENT_ELSEWHERE,
  TABLES,
  WINDOW_STORAGE,
  type FolderEntry,
  type SentElsewhereEntry,
  type TableEntry,
  type WindowStorageEntry,
} from "./inventory";

/**
 * What DotAmi is holding about the person right now, read from the data file and the folder
 * beside it — for the /your-data page. Nothing here is a stored claim: it is counted fresh on
 * every visit, from the same tables lib/privacy/inventory.ts lists, so the page can't say one
 * thing while the file holds another.
 *
 * Read-only on purpose. It counts and lists; it never writes, and it never opens a backup or the
 * log (only their names, sizes and dates).
 */

/** A figure as this page shows it — every status, including the ones hidden everywhere else. */
export interface HeldFigure {
  id: string;
  ideaName: string;
  /** lib/figures/types.ts FIGURE_KINDS; a string here so a kind this build doesn't know still shows. */
  kind: string;
  /** First and last calendar day the total covers, YYYY-MM-DD. */
  periodStart: string;
  periodEnd: string;
  /** Whole cents as exact digits ("-120050" for a loss): a string so a big amount can't lose a digit. */
  amountCents: string;
  currency: string;
  status: FigureStatus;
  editedByPerson: boolean;
  sourceRows: number | null;
  /** The calendar day on this computer, YYYY-MM-DD. A figure that was never agreed to (or taken back) has null. */
  proposedOn: string;
  agreedOn: string | null;
  takenBackOn: string | null;
}

/**
 * Everything that came from one source. A source is the pair (kind, label), never the label
 * alone: a file someone named "typed by you" must not merge with the figures that were typed.
 */
export interface HeldSource {
  sourceKind: FigureSourceKind;
  sourceLabel: string;
  /** The ideas this source's figures belong to, once each, A to Z. */
  ideaNames: string[];
  counts: Record<FigureStatus, number>;
  /** The earliest and latest day anything from this source was proposed. */
  firstProposedOn: string;
  lastProposedOn: string;
  figures: HeldFigure[];
}

export interface TableCount {
  entry: TableEntry;
  count: number;
}

export interface FolderFacts {
  entry: FolderEntry;
  /** Where it is (or would be), or null when this copy's database setting doesn't point at a file. */
  path: string | null;
  exists: boolean;
  /** For a folder: how many files are in it. Null for a single file, or when it couldn't be read. */
  files: number | null;
  /** Total size in bytes of what is there, or null when it couldn't be read. */
  bytes: number | null;
  /** The calendar day the newest file there was written, or null. */
  newestOn: string | null;
  readable: boolean;
}

export type SentState = "active" | "inactive" | "on-your-action";

export interface SentFacts {
  entry: SentElsewhereEntry;
  state: SentState;
  /** One line about this copy: the model's name, or "no key is set". */
  detail: string;
}

export interface Holdings {
  /** The installed desktop app, which makes safety copies and a log; a copy run from source makes neither. */
  desktop: boolean;
  /** One per table the inventory lists, in its order. */
  tables: TableCount[];
  /**
   * For each link the Delete menu clears while keeping the row (DELETE_MENU `keeps`), how many rows
   * it still holds, keyed "Expense.ventureId": the expense records that would stay, "not attached
   * yet", if the ideas were deleted.
   */
  keptLinks: Record<string, number>;
  /** How many ideas carry a note of the person's. */
  ideasWithNotes: number;
  figures: {
    total: number;
    byStatus: Record<FigureStatus, number>;
    sources: HeldSource[];
  };
  dataFile: { path: string | null; exists: boolean; bytes: number | null };
  folders: FolderFacts[];
  /**
   * How many of the files in the backups folder are DotAmi's own safety copies: what the Delete
   * menu's "Safety copies" box would delete (desktop/wipe-pending.mjs decides which files count).
   */
  safetyCopies: number;
  /** True while an earlier Delete's wipe is still owed (its note sits beside the data file). */
  wipePending: boolean;
  /**
   * [8i] How the receipt files are kept (docs/architecture/expense-records.md § 9): this copy's state
   * and the files counted by their first bytes only (encrypted with this copy's key, plain, or locked
   * with a key it can't open).
   */
  receiptFiles: ReceiptFilesProtection & { state: ReceiptLockState; setAsideTo: string | null };
  windowStorage: readonly WindowStorageEntry[];
  sentElsewhere: SentFacts[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The calendar day a moment fell on, on THIS computer — not in UTC. `toISOString().slice(0, 10)`
 * is the UTC day, which reads as tomorrow every evening west of Greenwich. This page runs on the
 * person's own computer (the desktop app, or a copy they host themselves), so the server's clock
 * is the person's clock.
 */
export function localCalendarDay(moment: Date): string {
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
}

/** A calendar day stored as midnight UTC (periods, statements' dates) — read back in UTC, never shifted. */
const storedDay = (d: Date) => d.toISOString().slice(0, 10);

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type Countable = { count(): Promise<number> };

/**
 * Counts a table by its model name. The inventory is the list of tables, so a table added to it
 * is counted here without a new line of code — and one Prisma doesn't know throws, loudly, in
 * tests/privacy-holdings.spec.ts rather than showing a silent zero.
 */
async function countTable(prisma: PrismaClient, model: string): Promise<number> {
  const delegate = (prisma as unknown as Record<string, Countable | undefined>)[lowerFirst(model)];
  if (!delegate || typeof delegate.count !== "function") {
    throw new Error(`The privacy inventory lists "${model}", but the database client has no such table.`);
  }
  return delegate.count();
}

function emptyStatusCounts(): Record<FigureStatus, number> {
  return Object.fromEntries(FIGURE_STATUSES.map((s) => [s, 0])) as Record<FigureStatus, number>;
}

/** Source order: typed, file, agent, tax return, books (the order lib/figures/types.ts lists them), then A to Z by name. */
function sourceOrder(a: HeldSource, b: HeldSource): number {
  const rank = (k: string) => {
    const i = (FIGURE_SOURCE_KINDS as readonly string[]).indexOf(k);
    return i === -1 ? FIGURE_SOURCE_KINDS.length : i;
  };
  return rank(a.sourceKind) - rank(b.sourceKind) || a.sourceLabel.localeCompare(b.sourceLabel);
}

async function readFigures(prisma: PrismaClient): Promise<Holdings["figures"]> {
  const rows = await prisma.figure.findMany({
    include: { venture: { select: { name: true } } },
    orderBy: [{ periodStart: "asc" }, { proposedAt: "asc" }, { id: "asc" }],
  });

  const byStatus = emptyStatusCounts();
  const groups = new Map<string, HeldSource>();

  for (const row of rows) {
    const status = row.status as FigureStatus;
    if (status in byStatus) byStatus[status] += 1;

    const proposedOn = localCalendarDay(row.proposedAt);
    const figure: HeldFigure = {
      id: row.id,
      ideaName: row.venture.name,
      kind: row.kind,
      periodStart: storedDay(row.periodStart),
      periodEnd: storedDay(row.periodEnd),
      amountCents: row.amountCents.toString(),
      currency: row.currency,
      status,
      editedByPerson: row.editedByPerson,
      sourceRows: row.sourceRows,
      proposedOn,
      agreedOn: row.confirmedAt ? localCalendarDay(row.confirmedAt) : null,
      takenBackOn: row.retractedAt ? localCalendarDay(row.retractedAt) : null,
    };

    // A JSON pair, so no label can be read as part of another source's kind.
    const key = JSON.stringify([row.sourceKind, row.sourceLabel]);
    let group = groups.get(key);
    if (!group) {
      group = {
        sourceKind: row.sourceKind as FigureSourceKind,
        sourceLabel: row.sourceLabel,
        ideaNames: [],
        counts: emptyStatusCounts(),
        firstProposedOn: proposedOn,
        lastProposedOn: proposedOn,
        figures: [],
      };
      groups.set(key, group);
    }
    group.figures.push(figure);
    if (status in group.counts) group.counts[status] += 1;
    if (!group.ideaNames.includes(figure.ideaName)) group.ideaNames.push(figure.ideaName);
    if (proposedOn < group.firstProposedOn) group.firstProposedOn = proposedOn;
    if (proposedOn > group.lastProposedOn) group.lastProposedOn = proposedOn;
  }

  const sources = [...groups.values()].sort(sourceOrder);
  for (const s of sources) s.ideaNames.sort((a, b) => a.localeCompare(b));
  return { total: rows.length, byStatus, sources };
}

/** Size and newest-write day of what is at `target`, from the file system's own record — nothing is opened. */
function inspect(target: string): Pick<FolderFacts, "exists" | "files" | "bytes" | "newestOn" | "readable"> {
  if (!existsSync(target)) return { exists: false, files: null, bytes: null, newestOn: null, readable: true };
  try {
    const info = statSync(target);
    if (!info.isDirectory()) {
      return { exists: true, files: null, bytes: info.size, newestOn: localCalendarDay(info.mtime), readable: true };
    }
    let files = 0;
    let bytes = 0;
    let newest = 0;
    for (const item of readdirSync(target, { withFileTypes: true })) {
      if (!item.isFile()) continue;
      const stat = statSync(path.join(target, item.name));
      files += 1;
      bytes += stat.size;
      newest = Math.max(newest, stat.mtimeMs);
    }
    return { exists: true, files, bytes, newestOn: newest > 0 ? localCalendarDay(new Date(newest)) : null, readable: true };
  } catch {
    // Found but not readable (permissions): say so rather than show a count that looks like zero.
    return { exists: true, files: null, bytes: null, newestOn: null, readable: false };
  }
}

/** DotAmi's own safety copies beside this data file; 0 when the folder can't be read (the folder row says so). */
function safetyCopiesIn(dataPath: string): number {
  try {
    return listSafetyCopies(dataPath).names.length;
  } catch {
    return 0;
  }
}

function sentFacts(entry: SentElsewhereEntry, today: SettingsToday): SentFacts {
  switch (entry.id) {
    case "intake-sentence":
      return today.intake.sentTo === "anthropic"
        ? { entry, state: "active", detail: `A model key is set, so it is being sent (model ${today.intake.model}).` }
        : { entry, state: "inactive", detail: "No model key is set, so it is read on this computer by keyword matching and goes nowhere." };
    case "update-check":
      return today.updates === "github"
        ? { entry, state: "active", detail: "This is the installed app, which checks at start." }
        : { entry, state: "inactive", detail: "This copy runs from source and updates with git, so it makes no update check." };
    case "files-you-save":
      return { entry, state: "on-your-action", detail: "Only when you choose to save one." };
  }
}

/**
 * Reads everything. `today` is lib/settings/today.ts's reading of this copy (where the data file
 * is, whether a key is set, desktop or source): the same facts the settings page shows. `lock` is
 * this server's receipts lock (lib/expenses/receipts/lock.ts); only its state and counts reach the page.
 */
export async function readHoldings(prisma: PrismaClient, today: SettingsToday, lock: ReceiptLock = receiptLock()): Promise<Holdings> {
  const tables: TableCount[] = [];
  for (const entry of TABLES) tables.push({ entry, count: await countTable(prisma, entry.model) });

  const keptLinks = await countKeptLinks(prisma, DELETE_MENU.flatMap((e) => e.keeps));
  const ideasWithNotes = await prisma.venture.count({ where: { notes: { not: "" } } });
  const figures = await readFigures(prisma);

  const dataPath = today.dataFile.path;
  const dataFolder = dataPath ? path.dirname(dataPath) : null;
  const dataInfo = dataPath ? inspect(dataPath) : null;
  const folders: FolderFacts[] = FOLDERS.map((entry) => {
    // The wipe-pending note is named after the data file, whatever that file is called.
    const target =
      dataPath && entry.id === "wipe-pending"
        ? wipePendingFile(dataPath)
        : dataFolder
          ? path.join(dataFolder, ...entry.relativePath.split("/"))
          : null;
    const facts = target
      ? inspect(target)
      : { exists: false, files: null, bytes: null, newestOn: null, readable: true };
    return { entry, path: target, ...facts };
  });
  const receiptCounts = await describeReceiptFiles(dataFolder ? path.join(dataFolder, RECEIPTS_FOLDER) : null, lock);

  return {
    desktop: today.desktop,
    tables,
    keptLinks,
    ideasWithNotes,
    figures,
    dataFile: { path: dataPath, exists: today.dataFile.exists, bytes: dataInfo?.bytes ?? null },
    folders,
    safetyCopies: dataPath ? safetyCopiesIn(dataPath) : 0,
    wipePending: folders.some((f) => f.entry.id === "wipe-pending" && f.exists),
    receiptFiles: { state: lock.state, setAsideTo: receiptsSetAsideTo(lock), ...receiptCounts },
    windowStorage: WINDOW_STORAGE,
    sentElsewhere: SENT_ELSEWHERE.map((entry) => sentFacts(entry, today)),
  };
}
