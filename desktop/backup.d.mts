// Types for desktop/backup.mjs, so the TypeScript tests can import it.
export const BACKUP_EXTENSION: "dotami-backup";
export const RECEIPTS_FOLDER: "receipts";
export const RECEIPT_EXTENSIONS: Readonly<Record<"image/jpeg" | "image/png" | "image/webp" | "application/pdf" | "image/heic", string>>;
/** True for a name DotAmi gives a receipt file: 32 hex characters and one of RECEIPT_EXTENSIONS. */
export function isReceiptFileName(name: string): boolean;

export type BackupErrorKind = "not-a-backup" | "damaged" | "needs-passphrase" | "cannot-decrypt" | "newer-app" | "changed-while-writing";

export class BackupError extends Error {
  constructor(kind: BackupErrorKind, message: string);
  kind: BackupErrorKind;
}

/** Every backup made before receipts were carried: the database alone. */
export interface BackupHeaderV1 {
  format: 1;
  appVersion: string;
  createdAt: string;
  migrations: string[];
  payloadSha256: string;
  payloadBytes: number;
  encryption: null | {
    cipher: "aes-256-gcm";
    kdf: "scrypt";
    N: number;
    r: number;
    p: number;
    salt: string;
    iv: string;
    tag: string;
  };
}

/** The database and the receipt files, one after another; the tag (if locked) after them. */
export interface BackupHeaderV2 {
  format: 2;
  appVersion: string;
  createdAt: string;
  migrations: string[];
  files: { path: string; bytes: number; sha256: string }[];
  encryption: null | {
    cipher: "aes-256-gcm";
    kdf: "scrypt";
    N: number;
    r: number;
    p: number;
    salt: string;
    iv: string;
  };
}

export type BackupHeader = BackupHeaderV1 | BackupHeaderV2;

export function writeBackup(
  dbFile: string,
  outFile: string,
  options: { passphrase?: string; appVersion: string; now?: () => number; receiptKey?: Buffer | null; databaseKey?: Buffer | null },
): { encrypted: boolean; bytes: number; migrations: string[]; receipts: number; missingReceipts: number; unreadableReceipts: number };

/** [8i] The data file's live rows as a rebuilt page image, in memory only; with the migrations and receipt files it describes. */
export function rebuiltImage(dbFile: string, key?: Buffer | null): { image: Buffer; migrations: string[]; described: string[] };

export function readBackup(
  file: string,
  options?: { passphrase?: string; unpackTo?: { receiptsDir: string } | null; receiptKey?: Buffer | null },
): { header: BackupHeader; files: { path: string; bytes: number }[]; database: Buffer | null };

export function backupReceiptsNote(receipts: number, missingReceipts: number, options?: { unreadable?: number; locked?: boolean }): string;

export function restoreReceiptsNote(format: 1 | 2, receiptsInBackup: number, receiptsHere: number): string;

export function stagedReceiptsFolder(stagingFile: string): string;

export function discardRestore(stagingFile: string): void;

export function prepareRestore(
  file: string,
  options: { passphrase?: string; migrationsDir: string; stagingFile: string; receiptKey?: Buffer | null; databaseKey?: Buffer | null },
): { header: BackupHeader; receipts: number };

export function applyRestore(
  stagingFile: string,
  dbFile: string,
  options: { backupDir: string; now?: () => number; databaseKey?: Buffer | null },
): { safetyCopy: string | null; receiptsMovedTo: string | null; receiptsRestored: number };
