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
 * either step changes nothing. Then the page is refreshed, and the line above says where the files went.
 */
export function StartNewReceiptKey() {
  const router = useRouter();
  const [step, setStep] = useState<"closed" | "warn" | "sure" | "done">("closed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<Started | null>(null);

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
    // The pages' line about the key is the server's: it now says where the files went, until the restart.
    router.refresh();
  }

  return (
    <div className="mt-2">
      {step !== "done" ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
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
          intro="The receipts locked with the old key are given up for good unless the old key comes back. DotAmi starts the new key the next time it starts."
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
          Close DotAmi and open it again to start the new key.
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
