// Types for desktop/wipe-pending.mjs, so lib/privacy/delete.ts and the TypeScript tests can import it.
export const SAFETY_COPY_NAME: RegExp;
/** The names DotAmi gives the folders it sets receipts aside in, in the backups folder ([8i]). */
export const SET_ASIDE_FOLDER_NAME: RegExp;
/** [8i] The names DotAmi gives a key file it moves aside when it makes a new key. */
export const SET_ASIDE_KEY_NAME: RegExp;
/** [8i] The name DotAmi gives a data file it moves aside because its key is lost. */
export const LOCKED_DATA_FILE_NAME: RegExp;

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

export function listSetAsideKeyFiles(dbFile: string): { names: string[] };

export function deleteSetAsideKeyFiles(
  dbFile: string,
  names: readonly string[],
  options?: { remove?: (file: string) => void },
): { deleted: string[]; left: string[] };

export function listLockedDataFiles(dbFile: string): { names: string[] };

export function deleteLockedDataFiles(
  dbFile: string,
  names: readonly string[],
  options?: { remove?: (file: string) => void },
): { deleted: string[]; left: string[] };

/** What a wipe-pending note owes in the backups folder, by DotAmi's own names. */
export interface OwedFiles {
  backups: string[];
  receiptFolders: string[];
  keyFiles: string[];
  lockedFiles: string[];
}

/** What is still left of each kind after deleteOwedFiles, by name. */
export interface FilesLeft {
  backupsLeft: string[];
  receiptFoldersLeft: string[];
  keyFilesLeft: string[];
  lockedFilesLeft: string[];
}

export function deleteOwedFiles(
  dbFile: string,
  owed: { [K in keyof OwedFiles]: readonly string[] },
  options?: { remove?: (file: string) => void },
): FilesLeft;

export function readWipePending(dbFile: string): ({ since: string | null } & OwedFiles) | null;

export function writeWipePending(
  dbFile: string,
  owed: {
    backups: readonly string[];
    receiptFolders?: readonly string[];
    keyFiles?: readonly string[];
    lockedFiles?: readonly string[];
    since?: string;
  },
): void;

export function clearWipePending(dbFile: string): void;

export function finishPendingWipe(
  dbFile: string,
  options: { vacuum: (dbFile: string) => boolean; log?: (line: string) => void; remove?: (file: string) => void },
): { ran: false } | ({ ran: true; wiped: boolean } & FilesLeft);
