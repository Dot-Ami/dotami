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
  | { state: "key-unreadable"; keyId: string | null; locked: number; missing: boolean; storeUnavailable: boolean };

/** Thrown by saveReceiptKey when the operating system's own key never reached the disk: nothing was saved. */
export class KeyStoreNotSaved extends Error {}
/** Thrown by saveReceiptKey when there is no key store that really protects a key: nothing was saved. */
export class NoKeyStore extends Error {}

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
  options?: { platform?: string; now?: () => number; keyStoreSaved?: () => Promise<boolean> },
): Promise<{ setAside: string | null }>;
/** What the desktop app tells its server: "key-unreadable" only when Start a new key may be offered. */
export function receiptLockEnv(
  opened: OpenedReceiptKey,
): { DOTAMI_RECEIPT_LOCK: "on"; DOTAMI_RECEIPT_KEY: string } | { DOTAMI_RECEIPT_LOCK: "no-key-store" | "key-unreadable" | "key-out-of-reach" };
/** Restarts the desktop app after Start a new key, only when the main process's own checks allow it (§ 11). */
export function restartForNewKey(
  dataDir: string,
  options: {
    opened: OpenedReceiptKey | null;
    fromDotAmi: boolean;
    quitting: boolean;
    relaunch: () => void;
    stopServer: () => Promise<void>;
    exit: (code: number) => void;
    log: (line: string) => void;
  },
): Promise<"restarting" | "refused">;
export function revertReceiptKey(dataDir: string, newKeyId: string, setAside: string | null): "reverted" | "kept";
export function countLockedReceipts(receiptsDir: string, keyId: string | null): number;
export function setAsideLockedReceipts(
  dataDir: string,
  options?: { now?: () => number; rename?: (from: string, to: string) => void },
): { folder: string | null; receipts: number; keyFile: boolean };
/** Opens a receipts key file set aside elsewhere (expense-records.md § 12); never throws, changes nothing. */
export function openKeyFile(file: string, store: KeyStore, platform?: string): { keyId: string | null; key: Buffer | null };
