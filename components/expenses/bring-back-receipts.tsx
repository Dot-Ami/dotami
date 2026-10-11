"use client";

import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/your-data/delete-menu";
import type { ReceiptLockState } from "@/lib/expenses/receipts/lock";
import {
  BRING_BACK_LEFT,
  BRING_BACK_REFUSED,
  bringBackDoneText,
  SET_ASIDE_FROM_SOURCE,
  SET_ASIDE_LIST_FAILED,
  SET_ASIDE_NEEDS_OPEN_KEY,
  setAsideFolderText,
  type BringBackLeftReason,
  type BringBackRefusal,
  type SetAsideFolderCounts,
} from "@/lib/expenses/receipts/protection";

/** One folder as the desktop app lists it (desktop/receipt-bring-back.mjs listSetAsideReceipts). */
interface SetAsideFolder extends SetAsideFolderCounts {
  name: string;
}

type Refused = { outcome: "refused"; reason: BringBackRefusal };
type Listed = { outcome: "listed"; folders: SetAsideFolder[] } | Refused;
type Done = { outcome: "done"; folder: string; broughtBack: string[]; oldCopiesLeft: string[]; left: { name: string; why: BringBackLeftReason }[] } | Refused;

/** The desktop window's two calls for this (desktop/window-preload.cjs); absent in a copy run from source. */
interface BringBackBridge {
  listSetAsideReceipts(): Promise<Listed>;
  bringBackReceipts(folder: string): Promise<Done>;
}

const bridge = (): BringBackBridge | null => {
  const candidate = typeof window === "undefined" ? undefined : (window as unknown as { dotamiDesktop?: Partial<BringBackBridge> }).dotamiDesktop;
  return candidate && typeof candidate.listSetAsideReceipts === "function" && typeof candidate.bringBackReceipts === "function"
    ? (candidate as BringBackBridge)
    : null;
};

/** A refusal's sentence; a reason this page doesn't know (a newer desktop app) reads as no answer. */
const refusedText = (reason: string) => BRING_BACK_REFUSED[reason as BringBackRefusal] ?? BRING_BACK_REFUSED["no-answer"];

/**
 * [8i] The receipts Start a new key set aside, and "Bring these receipts back" for each folder whose old
 * key this Windows account can open again (docs/architecture/expense-records.md § 12). On Settings → Data
 * and backups and in the "Your receipt files" row of What DotAmi knows about you.
 *
 * The server tells the page only how many such folders there are (`lockedFolders`, from their names on
 * the disk). Whether a key opens is something only the desktop app's main process can find out, so the
 * page asks it through the window's bridge, and the main process does the work itself. A copy run from
 * source, and the desktop app while its own key isn't open, say why there is no button instead.
 */
export function BringBackReceipts({ lockedFolders, lockState, desktop }: { lockedFolders: number; lockState: ReceiptLockState; desktop: boolean }) {
  if (lockedFolders <= 0) return null;
  if (!desktop) return <p className="mt-2 text-[12px] text-paper-dim">{SET_ASIDE_FROM_SOURCE}</p>;
  if (lockState !== "on") return <p className="mt-2 text-[12px] text-paper-dim">{SET_ASIDE_NEEDS_OPEN_KEY}</p>;
  return <SetAsideFolders />;
}

function SetAsideFolders() {
  // null while the desktop app is being asked.
  const [folders, setFolders] = useState<SetAsideFolder[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [asking, setAsking] = useState<SetAsideFolder | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; left: { name: string; why: BringBackLeftReason }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function list() {
    const desktopApp = bridge();
    const answer: Listed = desktopApp ? await desktopApp.listSetAsideReceipts().catch(() => ({ outcome: "refused", reason: "no-answer" }) as const) : { outcome: "refused", reason: "no-answer" };
    if (answer.outcome === "listed") {
      setFolders(answer.folders);
      setListError(null);
    } else {
      setFolders([]);
      setListError(SET_ASIDE_LIST_FAILED);
    }
  }

  useEffect(() => {
    void list();
  }, []);

  async function bringBack(folder: SetAsideFolder) {
    const desktopApp = bridge();
    setBusy(true);
    setError(null);
    const answer: Done = desktopApp ? await desktopApp.bringBackReceipts(folder.name).catch(() => ({ outcome: "refused", reason: "no-answer" }) as const) : { outcome: "refused", reason: "no-answer" };
    setBusy(false);
    setAsking(null);
    if (answer.outcome !== "done") setError(refusedText(answer.reason));
    else setResult({ text: bringBackDoneText(answer), left: answer.left });
    // Asked again rather than refreshing the page: a folder with nothing left drops out of the list, and
    // this line about what happened stays on the screen. After no answer too: the list then shows what
    // is really still set aside.
    await list();
  }

  return (
    <div className="mt-2 space-y-2 text-[12px] text-paper-dim">
      {listError ? <p>{listError}</p> : null}
      {(folders ?? []).map((folder) => {
        const { summary, canBringBack } = setAsideFolderText(folder);
        return (
          <div key={folder.name}>
            <p className="break-words">{summary}</p>
            {canBringBack ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAsking(folder);
                }}
                className="mt-1 rounded-sm border border-rule px-2.5 py-1 text-[12px] font-semibold text-paper transition hover:border-maple hover:text-maple"
              >
                Bring these receipts back
              </button>
            ) : null}
          </div>
        );
      })}

      {asking ? (
        <ConfirmDialog
          title="Bring these receipts back?"
          intro="DotAmi opens each receipt in this folder with its old key, checks it against its expense record, locks it again with the key DotAmi uses now, and puts it back in the receipts folder; only then is it removed from the set-aside folder."
          confirmLabel={busy ? "Bringing them back…" : "Bring them back"}
          busy={busy}
          onCancel={() => setAsking(null)}
          onConfirm={() => void bringBack(asking)}
        >
          <div className="space-y-2 text-[12.5px] text-paper-dim">
            <p className="break-words">From {asking.path}.</p>
            <p>
              A receipt whose record was deleted since, or that doesn&apos;t match its record, stays where it is, and DotAmi names
              it. Receipts you added since the new key was started aren&apos;t touched.
            </p>
            <p>
              The old key file stays in the folder. Delete on What DotAmi knows about you (“Safety copies in the backups
              folder”) can clear the folder later.
            </p>
          </div>
        </ConfirmDialog>
      ) : null}

      {result ? (
        <div role="status" className="text-paper">
          <p>{result.text}</p>
          {result.left.length > 0 ? (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-paper-dim">
              {result.left.map((l) => (
                <li key={l.name} className="break-words">
                  <code className="font-mono text-[11.5px]">{l.name}</code>: {BRING_BACK_LEFT[l.why] ?? BRING_BACK_LEFT["not-written"]}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-[12.5px] text-amber">
          {error}
        </p>
      ) : null}
    </div>
  );
}
