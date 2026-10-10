// Types for desktop/receipt-bring-back.mjs, so the TypeScript tests can import it.
import type { KeyStore, OpenedReceiptKey } from "./receipt-key.mjs";

/** What a Receipt row says about its file: enough to check the bytes. */
export interface ReceiptRow {
  type: string;
  bytes: number;
  sha256: string;
}

export type BringBackRefusal = "not-dotami-window" | "no-current-key" | "closing" | "not-a-set-aside-folder" | "data-file-unreadable" | "delete-owed";
export type BringBackLeft = "no-record" | "no-key" | "changed" | "already-there" | "not-written" | "in-use";

/** One set-aside folder as the page is told about it: only `canBringBack` receipts are offered the button. */
export interface SetAsideFolder {
  name: string;
  path: string;
  receipts: number;
  canBringBack: number;
  noKey: number;
  noRecord: number;
  alreadyBack: number;
  changed: number;
  unreadable: number;
  /** Whether the folder holds a receipts.key of its own. */
  keyFile: boolean;
  /** An earlier Delete still owes this folder: nothing in it is offered. */
  deleteOwed: boolean;
}

export function receiptRowsIn(dbFile: string, databaseKey: Buffer | null): Map<string, ReceiptRow>;

export function listSetAsideReceipts(
  dataDir: string,
  options: {
    fromDotAmi: boolean;
    opened: OpenedReceiptKey | null;
    store: KeyStore;
    platform?: string;
    readRows: () => Map<string, ReceiptRow>;
    log: (line: string) => void;
  },
): { outcome: "refused"; reason: BringBackRefusal } | { outcome: "listed"; folders: SetAsideFolder[] };

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
