"use client";

import { useId, useRef, useState } from "react";

import { Pill } from "@/components/ui";
import { postJson } from "@/components/ventures/agree-prompt";
import { sizeWords } from "@/components/your-data/format";
import { RECEIPT_REFUSALS } from "@/lib/expenses/receipts/refusals";
import { sniffReceipt } from "@/lib/expenses/receipts/sniff";
import { MAX_RECEIPT_BYTES, typeName } from "@/lib/expenses/receipts/types";
import type { ExpenseView } from "@/lib/expenses/types";

import { ReceiptViewer } from "./receipt-viewer";

/**
 * [8i] A record's receipt, on the Expenses page: what is kept ("Receipt: PDF · 1.2 MB · added …")
 * with **Show receipt** (inside DotAmi, receipt-viewer.tsx) and **Remove receipt**, or **Add a receipt**
 * for an agreed record that has none.
 *
 * Adding one: the person is told first, in plain words, that the file is kept exactly as given (so
 * whatever is printed on it is kept too) and what kinds and size are accepted. The file is checked
 * here before anything is sent (the same check the server makes again, lib/expenses/receipts/sniff.ts),
 * then sent as base64 in JSON to DotAmi's own server, which keeps a copy beside the data file. The
 * file's name is never sent. Nothing about it goes in an address.
 */

const LINK = "text-[10.5px] text-stone hover:text-paper";

/** The file's bytes as base64, without loading them into a JavaScript string twice. */
function base64Of(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    // "data:<type>;base64,<data>": only the part after the comma is the file.
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function ReceiptLine({ record, onChanged }: { record: ExpenseView; onChanged: () => Promise<void> | void }) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(file: File) {
    setError(null);
    // The cap first, from the size alone, so a huge file is never read.
    if (file.size > MAX_RECEIPT_BYTES) {
      setError(RECEIPT_REFUSALS["too-big"]);
      return;
    }
    setBusy(true);
    try {
      const sniffed = sniffReceipt(new Uint8Array(await file.arrayBuffer()));
      if (!sniffed.ok) {
        setError(RECEIPT_REFUSALS[sniffed.code]);
        return;
      }
      const result = await postJson("/api/expenses/receipt", { expenseId: record.id, file: await base64Of(file) });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAdding(false);
      await onChanged();
    } catch {
      setError("DotAmi couldn't read that file. Nothing was kept.");
    } finally {
      setBusy(false);
      // So picking the same file again (after fixing something) still fires a change.
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await postJson("/api/expenses/receipt/remove", { expenseId: record.id });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmingRemove(false);
    await onChanged();
  }

  const errorLine = error ? (
    <p role="alert" className="mt-1 text-[11px] text-amber">
      {error}
    </p>
  ) : null;

  if (record.receipt) {
    const r = record.receipt;
    return (
      <div className="mt-1.5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone">
          <span>
            {/* The day on the person's own clock: the stored time is UTC, which is already tomorrow on a Canadian evening. */}
            Receipt: {typeName(r.type)} · {sizeWords(r.bytes)} · added {new Date(r.addedAt).toLocaleDateString("en-CA")}
          </span>
          <button type="button" onClick={() => setShowing(true)} className={LINK}>
            Show receipt
          </button>
          {confirmingRemove ? (
            <span className="flex items-center gap-2">
              <span className="text-paper-dim">Remove this receipt? DotAmi deletes its copy of the file; the record stays.</span>
              <button type="button" onClick={() => void remove()} disabled={busy} className="text-maple hover:underline">
                Remove receipt
              </button>
              <button type="button" onClick={() => setConfirmingRemove(false)} className="hover:text-paper">
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmingRemove(true)} className={LINK}>
              Remove receipt
            </button>
          )}
        </div>
        {errorLine}
        {showing ? (
          <ReceiptViewer expenseId={record.id} type={r.type} title={`${record.date} · ${record.paidTo}`} onClose={() => setShowing(false)} />
        ) : null}
      </div>
    );
  }

  // Only a record the person agreed to takes a receipt (the server says the same).
  if (record.status !== "confirmed") return null;

  return (
    <div className="mt-1.5">
      {adding ? (
        <div className="rounded-sm border border-rule bg-ink px-2.5 py-2 text-[11px] text-paper-dim">
          <p>
            DotAmi keeps a copy of the file exactly as you give it, on this computer: anything printed on it (the last digits of a card, your name and
            address) is kept too. A JPEG, PNG, WebP or HEIC (iPhone) picture, or a PDF, up to 10 MB; DotAmi checks what is inside the file, not its
            name. A HEIC photo is shown with this computer&apos;s graphics chip, and some computers can&apos;t show one (it is kept either way). The copy is your
            own record; it says nothing about whether you can stop keeping the original.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor={inputId} className="cursor-pointer rounded-sm border border-rule px-2 py-0.5 text-paper hover:border-maple-soft">
              {busy ? "Adding…" : "Choose the receipt file"}
            </label>
            <input
              ref={input}
              id={inputId}
              type="file"
              // A hint for the file picker only; the bytes decide.
              accept="image/jpeg,image/png,image/webp,image/heic,.heic,application/pdf"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void add(file);
              }}
            />
            <Pill variant="ghost" size="small" onClick={() => setAdding(false)} disabled={busy}>
              Not now
            </Pill>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAdding(true);
          }}
          className={LINK}
        >
          Add a receipt
        </button>
      )}
      {errorLine}
    </div>
  );
}
