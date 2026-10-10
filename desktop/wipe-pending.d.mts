// Types for desktop/wipe-pending.mjs, so lib/privacy/delete.ts and the TypeScript tests can import it.
export const SAFETY_COPY_NAME: RegExp;
/** The names DotAmi gives the folders it sets receipts aside in, in the backups folder ([8i]). */
export const SET_ASIDE_FOLDER_NAME: RegExp;

export function wipePendingFile(dbFile: string): string;

export function backupsFolder(dbFile: string): string;

export function listSafetyCopies(dbFile: string): { names: string[]; others: number };

export function deleteSafetyCopies(
  dbFile: string,
  names: readonly string[],
  options?: { remove?: (file: string) => void },
): { deleted: string[]; left: string[] };

export function listSetAsideReceiptFolders(dbFile: string): { names: string[] };

export function deleteSetAsideReceiptFolders(
  dbFile: string,
  names: readonly string[],
  options?: { remove?: (file: string) => void },
): { deleted: string[]; left: string[] };

export function readWipePending(dbFile: string): { since: string | null; backups: string[]; receiptFolders: string[] } | null;

export function writeWipePending(dbFile: string, owed: { backups: readonly string[]; receiptFolders?: readonly string[]; since?: string }): void;

export function clearWipePending(dbFile: string): void;

export function finishPendingWipe(
  dbFile: string,
  options: { vacuum: (dbFile: string) => boolean; log?: (line: string) => void; remove?: (file: string) => void },
): { ran: false } | { ran: true; wiped: boolean; backupsLeft: string[]; receiptFoldersLeft: string[] };
