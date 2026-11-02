"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Pill } from "@/components/ui";
import { T2125_HINT, T2125_LINES } from "@/lib/figures/return/lines";
import type { ReturnReader } from "@/lib/figures/return/read-pdf";
import type { ReturnReadResult, T2125Copy } from "@/lib/figures/return/types";
import { venturesWords } from "@/lib/ventures/words";

/**
 * [8f] "Add from last year's return": reads a return PDF in this window and SHOWS, for each T2125
 * in it, lines 8299, 9368, 9369 and 9946 with the page each is printed on. Nothing is proposed,
 * sent or kept in this slice: the person looks, and Close forgets the file. The reader (pdf.js, in a
 * worker of DotAmi's own) loads only when a file is picked, so the ideas page costs nothing extra
 * for someone who never uses this.
 */

const ALERT = "mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-body text-amber";
const ACCEPT = ".pdf,application/pdf";

type Phase = "pick" | "reading" | "done";

const words = venturesWords.returnDrop;
const common = venturesWords.common;

function pagesText(copy: T2125Copy): string {
  return copy.firstPage === copy.lastPage ? words.pages.one(copy.firstPage) : words.pages.range(copy.firstPage, copy.lastPage);
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
      aria-label={words.region}
      // A PDF let go anywhere on the panel must not make the browser open it.
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="rounded-sm border border-rule-soft bg-ink px-3 py-3"
    >
      {phase === "pick" ? (
        <div
          role="group"
          aria-label={words.dropRegion}
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
          <p className="text-body text-paper">{words.dropLine}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Pill
              data-autofocus
              variant="elev"
              size="small"
              aria-describedby={`${uid}-hint`}
              onClick={() => inputRef.current?.click()}
            >
              {words.choosePdf}
            </Pill>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              aria-label={words.choosePdf}
              tabIndex={-1}
              onChange={onPicked}
              className="sr-only"
            />
          </div>
          <p id={`${uid}-hint`} className="mt-2 text-body text-stone-dim">
            {T2125_HINT} {words.readHere}
          </p>
        </div>
      ) : null}

      {phase === "reading" ? (
        <p
          data-autofocus
          tabIndex={-1}
          role="status"
          className="text-body text-stone-dim outline-hidden"
        >
          {common.reading} {fileName}…
        </p>
      ) : null}

      {phase === "done" && result && !result.ok ? (
        <p role="alert" className={ALERT}>
          {result.error}
        </p>
      ) : null}

      {phase === "done" && result?.ok ? (
        <div>
          <p data-autofocus tabIndex={-1} className="text-body text-paper-dim outline-hidden">
            {common.file} <span className="text-paper">{fileName}</span> · {result.pageCount}{" "}
            {words.pageWord(result.pageCount)} ·{" "}
            {words.copies(result.copies.length)}
          </p>
          {result.copies.map((copy, index) => (
            <table key={copy.firstPage} className="mt-3 text-body">
              <caption className="mb-1 text-left font-mono text-label uppercase tracking-[0.14em] text-stone">
                {result.copies.length === 1
                  ? words.caption.one(pagesText(copy))
                  : words.caption.of(index + 1, result.copies.length, pagesText(copy))}
              </caption>
              <thead>
                <tr className="text-left text-small text-stone-dim">
                  <th scope="col" className="pr-4 font-normal">
                    {words.columns.line}
                  </th>
                  <th scope="col" className="pr-4 font-normal">
                    {words.columns.onTheForm}
                  </th>
                  <th scope="col" className="pr-4 font-normal">
                    {words.columns.page}
                  </th>
                  <th scope="col" className="font-normal">
                    {words.columns.amount}
                  </th>
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
                        <td className="text-amber">{words.notFound}</td>
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
                        <td className="text-amber">{words.nothingBeside}</td>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          ))}
          <p className="mt-3 max-w-prose text-body text-stone-dim">{words.checkThese}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {phase === "done" ? (
          <Pill data-autofocus={result && !result.ok ? true : undefined} variant="ghost" size="small" onClick={another}>
            {common.chooseAnother}
          </Pill>
        ) : null}
        <Pill variant="ghost" size="small" onClick={onClose}>
          {common.close}
        </Pill>
      </div>
    </div>
  );
}
