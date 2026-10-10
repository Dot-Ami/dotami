// Types for desktop/decrypt-database.mjs, so the TypeScript tests can import it.
export const DECRYPTING_NOTE: string;
export const DECRYPT_COPY_SUFFIX: string;
export const ENCRYPTED_SUFFIX: string;
export type DecryptCrashPoint = "copied" | "checked" | "note-swap" | "first-rename" | "second-rename" | "note-wipe" | "old-deleted";
export class DecryptionStopped extends Error {
  kind: "damaged" | "busy" | "stuck" | "mismatch" | "pending";
}
export function readDecryptNote(dataDir: string): null | { unreadable: true } | { step: "swap" | "wipe"; file: string; size: number; sha256: string };
export function decryptFile(
  dataDir: string,
  file: string,
  key: Buffer,
  options?: { log?: (line: string) => void; crashAt?: DecryptCrashPoint; rename?: (from: string, to: string) => void },
): { crashed: true } | { wipePending: boolean };
export function resumeDecryption(
  dataDir: string,
  key: Buffer | null,
  options?: { log?: (line: string) => void },
):
  | { action: "none" }
  | { action: "cleared" }
  | { action: "finished"; file: string; wipePending: boolean }
  | { action: "restart"; file: string };
export function filesLockedWith(dataDir: string, key: Buffer): string[];
export function deleteKeyWhenUnused(dataDir: string, key: Buffer, options?: { remove?: (file: string) => void }): { deleted: boolean; lockedLeft: number };
