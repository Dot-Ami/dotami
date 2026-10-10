// Types for desktop/receipt-bring-back.mjs, so the TypeScript tests can import it.
import type { KeyStore, OpenedReceiptKey } from "./receipt-key.mjs";

/** What a Receipt row says about its file: enough to check the bytes. */
export interface ReceiptRow {
  type: string;
  bytes: number;
  sha256: string;
}

export type BringBackRefusal = "not-dotami-window" | "no-current-key" | "closing" | "not-a-set-aside-folder" | "data-file-unreadable";
export type BringBackLeft = "no-record" | "no-key" | "changed" | "already-there" | "not-written";

export function receiptRowsIn(dbFile: string, databaseKey: Buffer | null): Map<string, ReceiptRow>;

export function listSetAsideReceipts(
  dataDir: string,
  options: { fromDotAmi: boolean; opened: OpenedReceiptKey | null; store: KeyStore; platform?: string; log: (line: string) => void },
):
  | { outcome: "refused"; reason: BringBackRefusal }
  | { outcome: "listed"; folders: { name: string; path: string; receipts: number; canOpen: number }[] };

export function bringBackReceipts(
  dataDir: string,
  folderName: string,
  options: {
    fromDotAmi: boolean;
    opened: OpenedReceiptKey | null;
    quitting: boolean;
    store: KeyStore;
    platform?: string;
    readRows: () => Map<string, ReceiptRow>;
    log: (line: string) => void;
    onStep?: (step: "temp-written" | "placed", name: string) => void;
  },
):
  | { outcome: "refused"; reason: BringBackRefusal }
  | { outcome: "done"; folder: string; broughtBack: string[]; oldCopiesLeft: string[]; left: { name: string; why: BringBackLeft }[] };
