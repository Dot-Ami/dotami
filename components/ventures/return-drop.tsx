"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Pill } from "@/components/ui";
import { T2125_LINES } from "@/lib/figures/return/lines";
import type { ReturnReader } from "@/lib/figures/return/read-pdf";
import type { ReturnReadResult, T2125Copy } from "@/lib/figures/return/types";

/**
 * [8f] "Add from last year's return": reads a return PDF in this window and SHOWS, for each T2125
 * in it, lines 8299, 9368, 9369 and 9946 with the page each is printed on. Nothing is proposed,
 * sent or kept in this slice: the person looks, and Close forgets the file. The reader (pdf.js, in a
 * worker of DotAmi's own) loads only when a file is picked, so the ideas page costs nothing extra
 * for someone who never uses this.
 */

const ALERT = "mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber";
const ACCEPT = ".pdf,application/pdf";

type Phase = "pick" | "reading" | "done";

function pagesText(copy: T2125Copy): string {
  return copy.firstPage === copy.lastPage
    ? `page ${copy.firstPage}`
    : `pages ${copy.firstPage} to ${copy.lastPage}`;
}

export function ReturnDrop({ onClose }: { onClose: () => void }) {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reader = useRef<ReturnReader | null>(null);
  // Bumped for every file and when the panel closes, so a slow read can't land on a newer file.
  const readToken = useRef(0);

  const [phase, setPhase] = useState<Phase>("pick");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ReturnReadResult | null>(null);

  // Closing the panel stops the reader's worker and drops anything still being read.
  useEffect(() => {
    const token = readToken;
    const current = reader;
    return () => {
      token.current += 1;
      current.current?.close();
      current.current = null;
    };
  }, []);

  // Focus follows the screen, as in "Add from a file": what replaced the pressed button gets it.
  const screen = `${phase}|${result?.ok ?? ""}`;
  const lastScreen = useRef(screen);
  useEffect(() => {
    if (lastScreen.current === screen) return;
    lastScreen.current = screen;
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [screen]);

  async function openFile(file: File) {
    if (phase === "reading") return;
    const token = ++readToken.current;
    setFileName(file.name);
    setResult(null);
    setPhase("reading");
    let answer: ReturnReadResult;
    try {
      // pdf.js and the reader load now, not with the page.
      if (!reader.current) {
        const { ReturnReader } = await import("@/lib/figures/return/read-pdf");
        reader.current = new ReturnReader();
      }
      answer = await reader.current.read(file);
    } catch {
      const { REFUSALS } = await import("@/lib/figures/return/refusals");
      answer = { ok: false, code: "failed", error: REFUSALS.failed };
    }
    if (token !== readToken.current) return; // a newer file was picked, or the panel closed
    setResult(answer);
    setPhase("done");
  }

  function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires a change
    if (file) void openFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void openFile(file);
  }

  function another() {
    readToken.current += 1;
    setPhase("pick");
    setFileName("");
    setResult(null);
  }

  return (
    <div
      ref={panelRef}
      role="group"
      aria-label="Add from last year's return"
      // A PDF let go anywhere on the panel must not make the browser open it.
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="rounded-sm border border-rule-soft bg-ink px-3 py-3"
    >
      {phase === "pick" ? (
        <div
          role="group"
          aria-label="Drop a return PDF here"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-sm border border-dashed px-3 py-3 transition ${
            dragging
              ? "border-maple bg-maple/10"
              : "border-rule hover:border-maple-soft focus-within:border-maple-soft"
          }`}
        >
          <p className="text-xs text-paper">
            Drop the PDF of last year&apos;s return that your tax software saved, or
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Pill
              data-autofocus
              variant="elev"
              size="small"
              aria-describedby={`${uid}-hint`}
              onClick={() => inputRef.current?.click()}
            >
              Choose a PDF
            </Pill>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              aria-label="Choose a PDF"
              tabIndex={-1}
              onChange={onPicked}
              className="sr-only"
            />
          </div>
          <p id={`${uid}-hint`} className="mt-2 text-[11px] text-stone-dim">
            For each T2125 (Statement of Business or Professional Activities) in it, DotAmi shows
            lines 8299, 9368, 9369 and 9946 and the page each is on. It&apos;s read here, on this
            computer, and never kept. Nothing is added to your figures.
          </p>
        </div>
      ) : null}

      {phase === "reading" ? (
        <p
          data-autofocus
          tabIndex={-1}
          role="status"
          className="text-[11px] text-stone-dim outline-hidden"
        >
          Reading {fileName}…
        </p>
      ) : null}

      {phase === "done" && result && !result.ok ? (
        <p role="alert" className={ALERT}>
          {result.error}
        </p>
      ) : null}

      {phase === "done" && result?.ok ? (
        <div>
          <p data-autofocus tabIndex={-1} className="text-xs text-paper-dim outline-hidden">
            File: <span className="text-paper">{fileName}</span> · {result.pageCount}{" "}
            {result.pageCount === 1 ? "page" : "pages"} ·{" "}
            {result.copies.length === 1 ? "1 T2125" : `${result.copies.length} T2125s`}
          </p>
          {result.copies.map((copy, index) => (
            <table key={copy.firstPage} className="mt-3 text-xs">
              <caption className="mb-1 text-left font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">
                {result.copies.length === 1
                  ? `T2125 on ${pagesText(copy)}`
                  : `T2125 ${index + 1} of ${result.copies.length}, on ${pagesText(copy)}`}
              </caption>
              <thead>
                <tr className="text-left text-[10px] text-stone-dim">
                  <th scope="col" className="pr-4 font-normal">Line</th>
                  <th scope="col" className="pr-4 font-normal">On the form</th>
                  <th scope="col" className="pr-4 font-normal">Page</th>
                  <th scope="col" className="font-normal">Amount as printed</th>
                </tr>
              </thead>
              <tbody>
                {copy.lines.flatMap((found) => {
                  const label = T2125_LINES.find((l) => l.line === found.line)?.label ?? "";
                  if (found.occurrences.length === 0) {
                    return [
                      <tr key={found.line}>
                        <th scope="row" className="pr-4 text-left font-mono font-normal text-paper">
                          {found.line}
                        </th>
                        <td className="pr-4 text-stone">{label}</td>
                        <td className="pr-4 text-stone-dim">—</td>
                        <td className="text-amber">not found in this T2125</td>
                      </tr>,
                    ];
                  }
                  return found.occurrences.map((o, k) => (
                    <tr key={`${found.line}-${k}`}>
                      <th scope="row" className="pr-4 text-left font-mono font-normal text-paper">
                        {found.line}
                      </th>
                      <td className="pr-4 text-stone">{label}</td>
                      <td className="pr-4 text-stone">{o.page}</td>
                      {o.printed !== null ? (
                        <td className="text-right font-mono text-paper">{o.printed}</td>
                      ) : (
                        <td className="text-amber">nothing DotAmi can read beside it</td>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          ))}
          <p className="mt-3 max-w-prose text-[11px] text-stone-dim">
            Check these against your return. DotAmi only shows them: nothing is added to your
            figures or kept, and Close forgets the file.
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {phase === "done" ? (
          <Pill data-autofocus={result && !result.ok ? true : undefined} variant="ghost" size="small" onClick={another}>
            Choose another file
          </Pill>
        ) : null}
        <Pill variant="ghost" size="small" onClick={onClose}>
          Close
        </Pill>
      </div>
    </div>
  );
}
