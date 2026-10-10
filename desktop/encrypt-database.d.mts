// Types for desktop/encrypt-database.mjs, so the TypeScript tests can import it.
export const ENCRYPTING_NOTE: string;
export const DECRYPTING_NOTE: string;
export const COPY_SUFFIX: string;
export const PLAIN_SUFFIX: string;
export type CrashPoint = "copied" | "checked" | "note-swap" | "first-rename" | "second-rename" | "note-wipe" | "plain-deleted";
export class EncryptionStopped extends Error {
  kind: "damaged" | "busy" | "stuck" | "mismatch" | "pending";
}
export function notePath(dataDir: string): string;
export function readNote(dataDir: string): null | { unreadable: true } | { step: "swap" | "wipe"; file: string; size: number; sha256: string };
export function wipeFile(file: string): void;
export function setAsideLockedFile(dataDir: string, dbFile: string, now?: () => number): string | null;
export function wipeFile(file: string, options?: { remove?: (file: string) => void }): void;
export function plainLeftovers(dataDir: string): string[];
export function encryptFile(
  dataDir: string,
  file: string,
  key: Buffer,
  options?: { log?: (line: string) => void; crashAt?: CrashPoint; rename?: (from: string, to: string) => void },
): { crashed: true } | { wipePending: boolean };
export function resumeEncryption(
  dataDir: string,
  key: Buffer | null,
  options?: { log?: (line: string) => void },
):
  | { action: "none" }
  | { action: "cleared" }
  | { action: "finished"; file: string; wipePending: boolean }
  | { action: "restart"; file: string };
