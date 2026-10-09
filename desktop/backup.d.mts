// Types for desktop/backup.mjs, so the TypeScript tests can import it.
export const BACKUP_EXTENSION: "dotami-backup";
export const RECEIPTS_FOLDER: "receipts";

export type BackupErrorKind = "not-a-backup" | "damaged" | "needs-passphrase" | "cannot-decrypt" | "newer-app";

export class BackupError extends Error {
  constructor(kind: BackupErrorKind, message: string);
  kind: BackupErrorKind;
}

export interface BackupHeader {
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

export function writeBackup(
  dbFile: string,
  outFile: string,
  options: { passphrase?: string; appVersion: string; now?: () => number },
): { encrypted: boolean; bytes: number; migrations: string[] };

export function readBackup(file: string, options?: { passphrase?: string }): { header: BackupHeader; db: Buffer };

export function prepareRestore(
  file: string,
  options: { passphrase?: string; migrationsDir: string; stagingFile: string },
): { header: BackupHeader };

export function applyRestore(
  stagingFile: string,
  dbFile: string,
  options: { backupDir: string; now?: () => number },
): { safetyCopy: string | null; receiptsMovedTo: string | null };
