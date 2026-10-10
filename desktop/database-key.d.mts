// Types for desktop/database-key.mjs, so the TypeScript tests can import it.
import type { KeyStore } from "./receipt-key.mjs";

export const DATABASE_KEY_FILE: string;
export { KeyStoreNotSaved, NoKeyStore } from "./receipt-key.mjs";
export class KeyNotReadableAfterSave extends Error {}
export type OpenedDatabaseKey =
  | { state: "on"; key: Buffer; keyId: string }
  | { state: "none"; unreadable: boolean }
  | { state: "no-key-store" }
  | { state: "key-unreadable"; keyId: string | null; missing: boolean; storeUnavailable: boolean; wrongKey?: boolean };
export function openDatabaseKey(dataDir: string, store: KeyStore, options: { locked: boolean; platform?: string }): OpenedDatabaseKey;
export function setAsideLockedFileUnderNewKey(
  dataDir: string,
  dbFile: string,
  store: KeyStore,
  key: Buffer,
  options?: {
    platform?: string;
    now?: () => number;
    keyStoreSaved?: () => Promise<boolean>;
    setAside?: (dataDir: string, dbFile: string, now?: () => number) => string | null;
  },
): Promise<{ lockedTo: string | null; keySetAside: string | null }>;
export function makeDatabaseKey(
  dataDir: string,
  store: KeyStore,
  options?: { platform?: string; now?: () => number; keyStoreSaved?: () => Promise<boolean>; key?: Buffer },
): Promise<{ key: Buffer; keyId: string; setAside: string | null }>;
