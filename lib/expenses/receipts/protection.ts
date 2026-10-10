/**
 * [8i] What DotAmi says about how the receipt files are protected (the design is
 * docs/architecture/expense-records.md § 9). One place for the sentences, so Settings, What DotAmi
 * knows about you, the Expenses page and the viewer say the same thing. No node or browser import:
 * pages and the server both read it.
 *
 * Only the Windows desktop app is built today, so the sentences about the key name Windows.
 */
import type { ReceiptLockState } from "./lock";

export interface ReceiptProtectionText {
  /** One short line. */
  headline: string;
  /** What it means, and what to do when something is wrong. */
  detail: string;
  /** "ok": encrypted. "plain": kept unencrypted, said plainly. "problem": receipts can't be opened now. */
  tone: "ok" | "plain" | "problem";
}

/** Losing the key loses the receipts, except those in a backup: said wherever the person sees the encryption. */
export const KEY_LOSS_SENTENCE =
  "If your Windows profile is reset, or this data folder is moved to another account or computer, that key is gone and so are the receipts, except those in a backup (File → Back up…).";

/**
 * @param setAsideTo after Start a new key ("new-key-at-restart"): the folder the locked receipts were
 *   moved to, said in full so the person knows where they are (lock.ts receiptsSetAsideTo)
 * @param desktop the desktop app (lib/settings/today.ts), which restarts by itself after Start a new
 *   key (expense-records.md § 11); a copy run from source doesn't, and says so
 * @param options.dataFileEncrypted ([8i]) whether the data file is encrypted too (lib/db/lock.ts), which
 *   changes the last sentence of the "on" text: the records and what DotAmi notes about each receipt live there
 */
export function receiptProtectionText(
  state: ReceiptLockState,
  setAsideTo: string | null = null,
  { desktop = false, dataFileEncrypted = false }: { desktop?: boolean; dataFileEncrypted?: boolean } = {},
): ReceiptProtectionText {
  switch (state) {
    case "on":
      return {
        headline: "Your receipt files are encrypted on this computer.",
        // Precise on purpose: Windows' folder permissions already keep other standard accounts out of
        // the data folder, so the encryption's gain is against an administrator account, a copy of the
        // folder and a disk read outside Windows (expense-records.md § 9, "What it protects").
        detail: `Each one is locked with a key that Windows keeps for your Windows account only. Windows already keeps other standard accounts on this computer out of your data folder; the encryption means an administrator account, a copy of this data folder, or the disk read outside Windows can't read them either. Anything running as you can still open them, as DotAmi does, and so can a program an administrator runs as you. ${KEY_LOSS_SENTENCE} ${dataFileEncrypted ? "The data file, with your expense records and what DotAmi notes about each receipt, is encrypted too, with a key of its own." : "The data file itself isn't encrypted: your expense records in it, and what DotAmi notes about each receipt, are readable by anyone who can read the file."}`,
        tone: "ok",
      };
    case "source":
      return {
        headline: "Receipts in this copy aren't encrypted.",
        detail:
          "A copy run from source has no operating-system key store to keep a key in, so its receipt files are kept exactly as you gave them, readable by anyone who can read the folder. The desktop app encrypts them.",
        tone: "plain",
      };
    case "no-key-store":
      return {
        headline: "Receipts in this copy aren't encrypted.",
        detail:
          // Also what a first start says when Windows' own key didn't reach the disk in time
          // (desktop/receipt-key.mjs waitForLocalState): hence "right now" and "tries again".
          "The key store Windows keeps for your account isn't available to DotAmi right now, so receipt files are kept exactly as you gave them, readable by anyone who can read the folder. DotAmi tries again each time it starts.",
        tone: "plain",
      };
    case "key-unreadable":
      // Covers every way the key can be out of reach while receipts are encrypted: Windows won't open
      // it, the key store isn't available, or the file receipts.key is gone (desktop/receipt-key.mjs).
      return {
        headline: "DotAmi can't open the key to your receipts.",
        detail:
          "Windows won't open it for this account, or the key file (receipts.key, beside DotAmi's data file) is missing. That happens when the Windows profile is reset, when the data folder came from another account or computer, or when that file was deleted or moved. Until the key is back, receipts can't be shown or added. Nothing was changed or deleted. If you deleted or moved receipts.key, put it back (it may be in the Recycle Bin) and restart DotAmi. Otherwise, to get the receipts back, restore a backup (File → Restore from a backup…). Or delete them (Delete on What DotAmi knows about you, “Your receipts”) and restart DotAmi, which then starts a new key. Or, with no backup, start a new key (Start a new key…): the locked receipts are moved aside, not deleted, and given up unless the old key comes back.",
        tone: "problem",
      };
    case "key-out-of-reach":
      // The key store isn't available right now, or a new key wasn't saved yet (desktop/receipt-key.mjs
      // receiptLockEnv): the key may open at the next start, so Start a new key isn't offered.
      return {
        headline: "DotAmi can't open the key to your receipts right now.",
        detail:
          "The key store Windows keeps for your account isn't available to DotAmi at the moment, or Windows hadn't finished saving its own key when DotAmi started. Until the key opens, receipts can't be shown or added. Nothing was changed or deleted. DotAmi tries again each time it starts: close it and open it again, and if this keeps happening, restart Windows.",
        tone: "problem",
      };
    case "new-key-at-restart":
      // After Start a new key (expense-records.md § 10): the files are moved, and the desktop app makes the
      // new key at its next start; the server can't reach Windows' key store itself. The desktop app
      // restarts by itself (§ 11), so this line is read either just before it does, or after a restart
      // it refused; a copy run from source never restarts by itself, and says so.
      return {
        headline: "DotAmi starts a new key for your receipts the next time it starts.",
        detail: `${
          setAsideTo
            ? `The receipt files locked with the old key, and the old key file if it was there, were moved, not deleted, to ${setAsideTo}.`
            : "There were no locked receipt files left to move."
        } ${
          desktop
            ? "DotAmi restarts by itself to start it. If it hasn't, close DotAmi and open it again."
            : "This copy doesn't restart by itself: stop it and start it again to start the new key."
        } Until then, receipts can't be shown or added. Your expense records stay, and a receipt that was set aside says so when you open it. The moved files stay in that folder unless you clear them with Delete on What DotAmi knows: they open again only if the old key comes back.`,
        tone: "problem",
      };
  }
}

/**
 * Whether a receipt can be added in this state. Not while the key can't be opened, is out of reach, or
 * until the restart after Start a new key: there is no key to encrypt with, and nothing plain may go in
 * beside locked receipts (lib/expenses/receipts/store.ts addReceipt refuses the same).
 */
export function receiptsCanBeAdded(state: ReceiptLockState): boolean {
  return state !== "key-unreadable" && state !== "key-out-of-reach" && state !== "new-key-at-restart";
}

/** What an agreed record says instead of Add a receipt while receiptsCanBeAdded is false. */
export const RECEIPTS_CANT_BE_ADDED = "Receipts can't be added now: the amber line at the top of this page says why.";

// [8i] Bringing set-aside receipts back (expense-records.md § 12): the sentences Settings and What DotAmi
// knows about you show beside each folder Start a new key set receipts aside in, and after the button.

/** A copy run from source has no key store, so it can't open an old key: said instead of a button. */
export const SET_ASIDE_FROM_SOURCE =
  "Receipts were set aside in the backups folder when a new key was started. This copy runs from source and has no key store, so it can't bring them back. The desktop app can, if Windows can open their old key on your account again.";

/** The desktop app while its own key isn't open: there is no key to lock them with again. */
export const SET_ASIDE_NEEDS_OPEN_KEY =
  "Receipts were set aside in the backups folder when a new key was started. They can be brought back only while DotAmi's own receipts key opens.";

/** The desktop app didn't answer the list (it always should): said instead of the folders. */
export const SET_ASIDE_LIST_FAILED =
  "Receipts were set aside in the backups folder, but the desktop app didn't say whether they can be brought back. Reload this page to ask again.";

const receiptFiles = (n: number) => `${n} receipt file${n === 1 ? "" : "s"}`;

/** Where a found old key file goes: said whenever a folder has receipts and no receipts.key of its own. */
const PUT_FOUND_KEY_HERE = "If you find the old receipts.key (it may be in the Recycle Bin), put it in this folder and reload this page.";

/** One set-aside folder as the desktop app lists it (desktop/receipt-bring-back.mjs listSetAsideReceipts). */
export interface SetAsideFolderCounts {
  path: string;
  receipts: number;
  /** Could come back now: a row of the right type, not already back, and a key here opens it. */
  canBringBack: number;
  noKey: number;
  noRecord: number;
  alreadyBack: number;
  changed: number;
  unreadable: number;
  keyFile: boolean;
  deleteOwed: boolean;
}

/**
 * One set-aside folder's line: where it is, how many receipts, how many can come back, and why each of
 * the others can't. `canBringBack` is whether the button is offered: only while at least one receipt
 * could really come back, so a folder of receipts that never can doesn't keep its button for good.
 */
export function setAsideFolderText(f: SetAsideFolderCounts): { summary: string; canBringBack: boolean } {
  // Delete told the person these can never be opened again; its unfinished wipe still owes the folder.
  if (f.deleteOwed) {
    return {
      summary: `Receipts set aside in ${f.path} are being cleared by an earlier Delete that hasn't finished, so they can't be brought back. What DotAmi knows about you can finish it (Finish it now).`,
      canBringBack: false,
    };
  }
  const one = (n: number, single: string, many: string) => (n === 1 ? `1 of them ${single}` : `${n} of them ${many}`);
  const parts = [`${receiptFiles(f.receipts)} set aside in ${f.path}.`];
  if (f.canBringBack > 0 && f.canBringBack >= f.receipts) parts.push("This Windows account can open their old key again.");
  else if (f.canBringBack > 0) parts.push(`${f.canBringBack} of them can be brought back now.`);

  if (f.noKey > 0 && f.noKey >= f.receipts) {
    parts.push(
      f.keyFile
        ? "Their old key still can't be opened on this Windows account, so they can't be brought back."
        : `Their old key file isn't in this folder, so they can't be brought back. ${PUT_FOUND_KEY_HERE}`,
    );
  } else if (f.noKey > 0) {
    parts.push(
      f.keyFile
        ? `${one(f.noKey, "is", "are")} locked with an old key this Windows account still can't open.`
        : `${one(f.noKey, "is", "are")} locked with an old key whose file isn't in this folder. ${PUT_FOUND_KEY_HERE}`,
    );
  }
  if (f.noRecord > 0) {
    parts.push(
      one(f.noRecord, "can't come back: its expense record was deleted, or no longer has that receipt.", "can't come back: their expense records were deleted, or no longer have those receipts."),
    );
  }
  if (f.alreadyBack > 0) {
    parts.push(
      one(f.alreadyBack, "is already back in the receipts folder; the copy here is an old one.", "are already back in the receipts folder; the copies here are old ones."),
    );
  }
  if (f.changed > 0) {
    parts.push(
      one(
        f.changed,
        "changed or was damaged since it was set aside, so DotAmi won't bring it back.",
        "changed or were damaged since they were set aside, so DotAmi won't bring them back.",
      ),
    );
  }
  if (f.unreadable > 0) {
    parts.push(
      `${one(f.unreadable, "couldn't be read just now (another program may have it open).", "couldn't be read just now (another program may have them open).")} Reload this page to check again.`,
    );
  }
  // Delete is pointed to only when nothing left in the folder could ever come back.
  if (f.canBringBack === 0 && f.noKey === 0 && f.unreadable === 0 && f.noRecord + f.alreadyBack + f.changed > 0) {
    parts.push("Delete (“Safety copies in the backups folder”) on What DotAmi knows about you can clear this folder.");
  }
  return { summary: parts.join(" "), canBringBack: f.canBringBack > 0 };
}

/** Why one receipt stayed in the set-aside folder (desktop/receipt-bring-back.mjs bringBackReceipts `left`). */
export const BRING_BACK_LEFT = {
  "no-record": "Its expense record was deleted since, or no longer has this receipt, so it wasn't brought back.",
  "no-key": "Its old key can't be opened on this Windows account.",
  changed: "It changed or was damaged since it was set aside, so DotAmi won't bring it back.",
  "already-there": "A file of the same name is already in the receipts folder, so it was left as it is.",
  "not-written": "It couldn't be written to the receipts folder (another program may have the folder open). Try again.",
  "in-use": "Another program had it open, so it couldn't be read. Try again.",
} as const;

/**
 * Why the desktop app refused the whole request: every one of them moves nothing. "no-answer" is the
 * page's own, for no answer at all, and doesn't claim nothing moved: the page can't know.
 */
export const BRING_BACK_REFUSED = {
  "not-dotami-window": "Only DotAmi's own window can bring receipts back. Nothing was moved.",
  "no-current-key": "DotAmi's own receipts key isn't open right now, so there is no key to lock them with again. Nothing was moved.",
  closing: "DotAmi is closing. Nothing was moved.",
  "not-a-set-aside-folder": "That folder isn't one DotAmi set receipts aside in, or it is no longer there. Nothing was moved.",
  "data-file-unreadable": "DotAmi couldn't read its data file to check the receipts against their records. Nothing was moved.",
  "delete-owed": "An earlier Delete is still clearing that folder, so its receipts can't be brought back. Nothing was moved.",
  "no-answer": "The desktop app didn't answer. Reload this page to see which receipts are still set aside.",
} as const;

export type BringBackLeftReason = keyof typeof BRING_BACK_LEFT;
export type BringBackRefusal = keyof typeof BRING_BACK_REFUSED;

/** The line after the button: how many came back, and an old copy still in the folder. Each one left is named under it. */
export function bringBackDoneText({ broughtBack, oldCopiesLeft }: { broughtBack: readonly string[]; oldCopiesLeft: readonly string[]; left: readonly unknown[] }): string {
  if (broughtBack.length === 0) return "No receipt was brought back.";
  const n = broughtBack.length;
  const head = n === 1 ? "1 receipt brought back. It opens from its record again." : `${n} receipts brought back. They open from their records again.`;
  return oldCopiesLeft.length === 0
    ? head
    : `${head} The old copy of ${oldCopiesLeft.length} is still in the set-aside folder, because another program had it open.`;
}

/** Why one encrypted receipt can't be shown (the viewer says it in amber). */
export const LOCKED_RECEIPT_MESSAGES = {
  otherKey:
    "This receipt was encrypted with a key this Windows account can no longer open (after a Windows profile reset, or because the data folder came from another account or computer), so DotAmi can't show it. A backup made before then still holds it: File → Restore from a backup….",
  source:
    "This receipt was encrypted by the DotAmi desktop app, and this copy, run from source, has no way to open it. Open it in the desktop app.",
  noKeyStore:
    "This receipt is encrypted, and the key store Windows keeps for your account isn't available to DotAmi right now, so it can't be opened.",
  keyUnreadable:
    "DotAmi can't open the key to your receipts on this Windows account, so it can't show or add a receipt now. Settings → Data and backups says what happened and what you can do.",
} as const;
