"use client";

import { useId, useState } from "react";

import { FoldButton } from "@/components/cockpit/folding";
import { ReceiptLines } from "@/components/cockpit/receipt-lines";
import { Pill } from "@/components/ui";
import { parseWhatIf } from "@/lib/cockpit/told";
import { cockpitWords as words } from "@/lib/cockpit/words";

/** The bar's and "This visit"'s ids, for the fold buttons' aria-controls (the header's names the bar's). */
export const WHAT_IF_BAR_ID = "cockpit-what-if";
export const THIS_VISIT_ID = "cockpit-this-visit";

/**
 * The what-if bar and "This visit" (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built,
 * part 2"), under the map. "Try first-year sales of $___" relights the rules for the screen's run under a
 * fixed banner, "Your what-if, not a forecast"; it never touches a money sum or a figure and is kept
 * nowhere, until Keep makes it the idea's own first-year sales. "This visit" keeps this visit's newest
 * receipt lines, so one closed with its panel isn't lost; a reload starts it empty.
 *
 * 2026-10-12, after review: named "This visit" (it was "Since last time", which reads as "since my last
 * visit"), and it shows only the newest line, the rest behind "n more this visit": five lines took the
 * map down to its tier headings at 1280 by 720. Keep also empties the Try box, as the number is kept.
 *
 * 2026-10-13, folding (future-cockpit.md § 2, "Folding and phone width"): given `fold`, the bar and "This
 * visit" fold together to one line with a button, the same way the map's legend does, so every region of
 * the cockpit folds. Folded, what they hold stays on the page, hidden (a half-typed number included), and
 * while a what-if is on the one line still says so, banner and number, because the map is still relit by
 * it. Left out, the bar is drawn as before.
 *
 * The calm first view (2026-10-17, S2.5.30c): folded, the bar and "This visit" are no line of their own. The
 * whole bar stays on the page, hidden, and the cockpit draws `WhatIfShowButton` in the road's bottom line,
 * under the map where the bar was, still saying while a what-if is on that it is one, and its number. Open,
 * the bar is a region of its own again.
 */
export function WhatIfBar({
  whatIf,
  receipt,
  sinceLastTime,
  onTry,
  onKeep,
  onClear,
  fold,
}: {
  /** The what-if on now, in whole dollars, or null. */
  whatIf: number | null;
  /** What the what-if relit, when it was the last answer; null for none. */
  receipt: readonly string[] | null;
  /** This visit's newest receipt lines, newest first. (The prop keeps its first name.) */
  sinceLastTime: readonly string[];
  onTry: (dollars: number) => void;
  onKeep: () => void;
  onClear: () => void;
  /** In the cockpit: whether the bar is folded, and the button's action. Left out, it has no fold button. */
  fold?: { folded: boolean; onToggle: () => void };
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  // "This visit" shows its newest line until the person asks for the rest.
  const [allLines, setAllLines] = useState(false);
  const shownLines = allLines ? sinceLastTime : sinceLastTime.slice(0, 1);
  const folded = fold?.folded ?? false;
  const hasThisVisit = sinceLastTime.length > 0;

  function tryIt(event: React.FormEvent) {
    event.preventDefault();
    const dollars = parseWhatIf(text);
    if (dollars === null) return setProblem(words.questions.box.wholeDollars);
    setProblem(null);
    onTry(dollars);
  }

  return (
    <>
      {/* data-region: one of the cockpit's regions the clutter limit counts (docs/ui-spec/README.md), when it
          is drawn. Folded, it is hidden, never removed: what it holds is there when it opens. */}
      <section
        data-region="what-if"
        aria-label={words.whatIf.region}
        hidden={folded || undefined}
        className="flex flex-col gap-1.5 border-t border-rule bg-ink2 px-5 py-2 text-[12px]"
      >
        {fold ? (
          <div className="flex flex-wrap items-center gap-2">
            <FoldButton
              folded={false}
              region="whatIf"
              label={words.folds.whatIf.fold}
              controls={hasThisVisit ? `${WHAT_IF_BAR_ID} ${THIS_VISIT_ID}` : WHAT_IF_BAR_ID}
              onClick={fold.onToggle}
            />
          </div>
        ) : null}
        <div id={WHAT_IF_BAR_ID} className="flex flex-col gap-1.5">
          <form onSubmit={tryIt} className="flex flex-wrap items-center gap-2">
            <label htmlFor={`${id}-sales`} className="text-paper-dim">
              {words.whatIf.label}
            </label>
            <input
              id={`${id}-sales`}
              type="text"
              inputMode="numeric"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={problem ? true : undefined}
              className="w-28 rounded-sm border border-rule bg-ink px-2 py-0.5 text-right font-mono text-[12px] text-paper outline-hidden focus:border-maple-soft"
            />
            <Pill type="submit" size="small" variant="ghost">
              {words.whatIf.try}
            </Pill>
            {problem ? (
              <span role="alert" className="text-[11px] text-amber">
                {problem}
              </span>
            ) : null}
          </form>
          {whatIf !== null ? (
            <div className="grid gap-1.5 rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber">{words.whatIf.banner}</p>
              <p className="text-[11.5px] text-paper-dim">{words.whatIf.on(whatIf)}</p>
              {receipt ? <ReceiptLines lines={receipt} empty={words.whatIf.nothingChanged} /> : null}
              <div className="flex flex-wrap items-center gap-2">
                <Pill
                  size="small"
                  variant="maple"
                  onClick={() => {
                    // The number is the idea's own now; the box is for the next what-if.
                    setText("");
                    onKeep();
                  }}
                >
                  {words.whatIf.keep}
                </Pill>
                <Pill size="small" variant="ghost" onClick={onClear}>
                  {words.whatIf.clear}
                </Pill>
                <span className="text-[10.5px] text-stone">{words.whatIf.keepHelp}</span>
              </div>
            </div>
          ) : receipt ? (
            // After Keep the what-if is off and the number is the idea's own; its receipt still shows here.
            <ReceiptLines lines={receipt} />
          ) : null}
        </div>
      </section>
      {hasThisVisit ? (
        <section id={THIS_VISIT_ID} hidden={folded || undefined} aria-label={words.receipts.thisVisit} className="border-t border-rule bg-ink2 px-5 py-1.5 text-[11px]">
          <div className="flex items-baseline gap-3">
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone">{words.receipts.thisVisit}</h2>
            {sinceLastTime.length > 1 ? (
              <button type="button" className="text-[10.5px] text-stone underline hover:text-paper" aria-expanded={allLines} onClick={() => setAllLines((v) => !v)}>
                {allLines ? words.receipts.fewer : words.receipts.moreThisVisit(sinceLastTime.length - 1)}
              </button>
            ) : null}
          </div>
          <div className="mt-0.5 space-y-0.5 text-stone">
            {shownLines.map((line, i) => (
              // The same line can come twice (an answer given, taken back, given again), so the key keeps its place too.
              <p key={`${i}-${line}`}>{line}</p>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

/**
 * The folded what-if bar's way back (the calm first view, 2026-10-17): one button in the road's bottom line.
 * While a what-if is on, the map is still relit by it, so the button says so, banner and number.
 */
export function WhatIfShowButton({ whatIf, hasThisVisit, onShow }: { whatIf: number | null; hasThisVisit: boolean; onShow: () => void }) {
  return (
    <>
      <FoldButton
        folded
        region="whatIf"
        label={words.folds.whatIf.show}
        controls={hasThisVisit ? `${WHAT_IF_BAR_ID} ${THIS_VISIT_ID}` : WHAT_IF_BAR_ID}
        onClick={onShow}
      />
      {whatIf !== null ? (
        <>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber">{words.whatIf.banner}</span>
          <span className="text-[11.5px] text-paper-dim">{words.whatIf.on(whatIf)}</span>
        </>
      ) : null}
    </>
  );
}
