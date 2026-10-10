"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postJson } from "@/components/ventures/agree-prompt";
import { ConfirmDialog } from "@/components/your-data/delete-menu";

/** What the route answers (app/api/expenses/receipt/new-key/route.ts). */
interface Started {
  movedTo: string | null;
  receipts: number;
  keyFile: boolean;
}

/** The desktop window's call to restart after the move (desktop/window-preload.cjs); absent in a copy run from source. */
interface RestartBridge {
  restartForNewKey(): Promise<"restarting" | "refused">;
}

const restartBridge = (): RestartBridge | null => {
  const candidate = typeof window === "undefined" ? undefined : (window as unknown as { dotamiDesktop?: Partial<RestartBridge> }).dotamiDesktop;
  return candidate && typeof candidate.restartForNewKey === "function" ? (candidate as RestartBridge) : null;
};

/** How long "DotAmi will restart now…" is on the page before the restart is asked for, so it can be read. */
const RESTART_PAUSE_MS = 2_000;

/** "2 locked receipt files and the old key file were", "1 locked receipt file was", "the old key file was". */
function movedSentence({ receipts, keyFile }: Started): string {
  const files = receipts === 0 ? "" : receipts === 1 ? "1 locked receipt file" : `${receipts} locked receipt files`;
  const what = [files, keyFile ? "the old key file" : ""].filter(Boolean).join(" and ");
  return `${what.charAt(0).toUpperCase()}${what.slice(1)} ${receipts + (keyFile ? 1 : 0) === 1 ? "was" : "were"}`;
}

/**
 * [8i] "Start a new key…" (docs/architecture/expense-records.md § 10), shown under the amber line
 * "DotAmi can't open the key to your receipts." on Settings, What DotAmi knows about you and the Expenses
 * page, and only there: the caller renders it only while the server's lock is "key-unreadable".
 *
 * Asked twice, the cost said first: a new key gives up the receipts locked with the old one unless the
 * old key comes back. Nothing is sent until the second answer; Cancel, Escape or a click outside at
 * either step changes nothing.
 *
 * Then (§ 11): in the desktop app, the page says "DotAmi will restart now…" with where the files went,
 * and a moment later asks the window's bridge to restart; the desktop app decides for itself whether
 * to (desktop/receipt-key.mjs restartForNewKey). If it doesn't, or in a copy run from source, which has
 * no bridge, the page is refreshed and the amber line above says to restart by hand.
 */
export function StartNewReceiptKey() {
  const router = useRouter();
  const [step, setStep] = useState<"closed" | "warn" | "sure" | "done">("closed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<Started | null>(null);
  // Read when the button is pressed, not while rendering: the server's render has no window.
  const [canRestart, setCanRestart] = useState(false);
  const [restarting, setRestarting] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const result = await postJson("/api/expenses/receipt/new-key", { giveUp: true });
    setBusy(false);
    if (!result.ok) {
      setStep("closed");
      setError(result.error);
      return;
    }
    setStarted(result.body as Started);
    setStep("done");
    const bridge = restartBridge();
    if (!bridge) {
      // The pages' line about the key is the server's: it now says where the files went, until the restart.
      router.refresh();
      return;
    }
    // Said first, then asked for: the person reads what is about to happen before the window closes.
    setRestarting(true);
    await new Promise((resolve) => setTimeout(resolve, RESTART_PAUSE_MS));
    const answer = await bridge.restartForNewKey().catch(() => "refused" as const);
    // "restarting": the app is closing, and this page with it.
    if (answer === "restarting") return;
    setRestarting(false);
    router.refresh();
  }

  return (
    <div className="mt-2">
      {step !== "done" ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setCanRestart(restartBridge() !== null);
            setStep("warn");
          }}
          className="rounded-sm border border-amber/50 px-2.5 py-1 text-[12px] font-semibold text-amber transition hover:bg-amber/10"
        >
          Start a new key…
        </button>
      ) : null}

      {step === "warn" ? (
        <ConfirmDialog
          title="Start a new key, and give up the locked receipts?"
          intro="A new key can't open the receipts locked with the old one. Starting one gives those receipts up for good, unless the old key comes back: receipts.key found again (it may be in the Recycle Bin), or the Windows profile that could open it."
          confirmLabel="Continue…"
          focusCancel
          onCancel={() => setStep("closed")}
          onConfirm={() => setStep("sure")}
        >
          <div className="space-y-2 text-[12.5px] text-paper-dim">
            <p>
              Nothing is deleted. DotAmi moves the locked receipt files, and the old key file if it&apos;s there, into a new
              folder in the backups folder beside its data file, and tells you where. Your expense records stay; a receipt
              that was set aside says so when you open it.
            </p>
            <p>
              If you have a backup made before the key was lost, restore it instead (File → Restore from a backup…): it
              brings those receipts back.
            </p>
          </div>
        </ConfirmDialog>
      ) : null}

      {step === "sure" ? (
        <ConfirmDialog
          title="Are you sure?"
          intro={`The receipts locked with the old key are given up for good unless the old key comes back. ${
            canRestart ? "Then DotAmi restarts by itself to start the new key." : "DotAmi starts the new key the next time it starts."
          }`}
          confirmLabel={busy ? "Moving them aside…" : "Give up the locked receipts and start a new key"}
          focusCancel
          busy={busy}
          onCancel={() => setStep("closed")}
          onConfirm={() => void start()}
        >
          <p className="text-[12.5px] text-paper-dim">Press Cancel to keep things as they are.</p>
        </ConfirmDialog>
      ) : null}

      {step === "done" && started ? (
        <p role="status" className="mt-1 text-[12.5px] text-amber">
          {started.movedTo ? `Done. ${movedSentence(started)} moved to ${started.movedTo}.` : "Done. There were no locked receipt files left to move."}{" "}
          {restarting ? "DotAmi will restart now to start the new key…" : "Close DotAmi and open it again to start the new key."}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-[12.5px] text-amber">
          {error}
        </p>
      ) : null}
    </div>
  );
}
