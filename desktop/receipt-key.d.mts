// Types for desktop/receipt-key.mjs, so the TypeScript tests can import it.

export const RECEIPT_KEY_FILE: "receipts.key";

/** What the key file needs of Electron's safeStorage (a stand-in in the tests). */
export interface KeyStore {
  isEncryptionAvailable(): boolean;
  encryptString(text: string): Buffer;
  decryptString(wrapped: Buffer): string;
  getSelectedStorageBackend?(): string;
}

export type OpenedReceiptKey =
  | { state: "on"; key: Buffer; keyId: string; made: boolean; setAside: string | null }
  | { state: "no-key-store" }
  | { state: "key-unreadable"; keyId: string | null; locked: number; missing: boolean };

/** Thrown by saveReceiptKey when the operating system's own key never reached the disk: nothing was saved. */
export class KeyStoreNotSaved extends Error {}

export function keyStoreAvailable(store: KeyStore, platform?: string): boolean;
export function newReceiptKey(): Buffer;
export function localStateHoldsKey(dataDir: string): boolean;
export function waitForLocalState(
  dataDir: string,
  options?: { platform?: string; timeoutMs?: number; now?: () => number; sleep?: (ms: number) => Promise<unknown> },
): Promise<boolean>;
export function openReceiptKey(
  dataDir: string,
  store: KeyStore,
  options?: { platform?: string; now?: () => number; keyStoreSaved?: () => Promise<boolean> },
): Promise<OpenedReceiptKey>;
export function saveReceiptKey(
  dataDir: string,
  store: KeyStore,
  key: Buffer,
  options?: { now?: () => number; keyStoreSaved?: () => Promise<boolean> },
): Promise<{ setAside: string | null }>;
export function revertReceiptKey(dataDir: string, newKeyId: string, setAside: string | null): "reverted" | "kept";
export function countLockedReceipts(receiptsDir: string, keyId: string | null): number;
