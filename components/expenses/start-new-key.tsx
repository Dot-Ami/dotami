"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postJson } from "@/components/ventures/agree-prompt";
import { ConfirmDialog } from "@/components/your-data/delete-menu";
import { expensesWords } from "@/lib/expenses/words";

const words = expensesWords.newKey;

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
  const files = receipts === 0 ? "" : receipts === 1 ? words.moved.oneFile : words.moved.files(receipts);
  const what = [files, keyFile ? words.moved.oldKeyFile : ""].filter(Boolean).join(words.moved.and);
  return `${what.charAt(0).toUpperCase()}${what.slice(1)} ${receipts + (keyFile ? 1 : 0) === 1 ? words.moved.was : words.moved.were}`;
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
          className="rounded-sm border border-amber/50 px-2.5 py-1 text-body font-semibold text-amber transition hover:bg-amber/10"
        >
          {words.start}
        </button>
      ) : null}

      {step === "warn" ? (
        <ConfirmDialog
          title={words.warn.title}
          intro={words.warn.intro}
          confirmLabel={words.warn.confirm}
          focusCancel
          onCancel={() => setStep("closed")}
          onConfirm={() => setStep("sure")}
        >
          <div className="space-y-2 text-body text-paper-dim">
            <p>{words.warn.nothingDeleted}</p>
            <p>{words.warn.restoreInstead}</p>
          </div>
        </ConfirmDialog>
      ) : null}

      {step === "sure" ? (
        <ConfirmDialog
          title={words.sure.title}
          intro={words.sure.intro(canRestart ? words.sure.restartsItself : words.sure.startsNextTime)}
          confirmLabel={busy ? words.sure.moving : words.sure.confirm}
          focusCancel
          busy={busy}
          onCancel={() => setStep("closed")}
          onConfirm={() => void start()}
        >
          <p className="text-body text-paper-dim">{words.sure.cancel}</p>
        </ConfirmDialog>
      ) : null}

      {step === "done" && started ? (
        <p role="status" className="mt-1 text-body text-amber">
          {started.movedTo ? words.done.moved(movedSentence(started), started.movedTo) : words.done.nothingToMove}{" "}
          {restarting ? words.done.restartingNow : words.done.restartByHand}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-body text-amber">
          {error}
        </p>
      ) : null}
    </div>
  );
}
