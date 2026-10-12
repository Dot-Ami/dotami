"use client";

import { useJourney } from "@/components/shared/journey-provider";
import { GhostLink, Pill, WordMark } from "@/components/ui";
import { frontDoorWords } from "@/lib/front-door/words";
import { applyIntentToDraft, type IntentParseResult } from "@/lib/journey/intent";
import { parseIntentFallback } from "@/lib/journey/intent-fallback";
import { STATEMENT_FULL_NOTE, STATEMENT_MAX_CHARS } from "@/lib/person/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * The front door (decision 6 of 2026-10-11: it leads with the dream; docs/ui-spec/landing/04-three-doors.md):
 * the headline and three doors. The first, *Start from where I want to be*, opens /start. The second is
 * the 2026-07-02 workshop's front door, unchanged: the free-text box captures the situation in the
 * person's own words, and the chips below only fill it with example phrasings. The third says plainly that
 * the invented example future isn't written yet.
 */
const EXAMPLE_PROMPTS = [
  "I want to monetize a hobby",
  "I'm already running a business — optimize my write-offs",
  "I don't know what to start yet — show me what's available",
] as const;

export function LandingPage() {
  const router = useRouter();
  const { setIntake, resetJourney } = useJourney();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // The server sends this page already drawn, so on a slow computer the box can be typed into before
  // the page's scripts have run. React then starts from an empty `text` and never hears those
  // keystrokes (it takes what is already in the box as its starting point), so "Map it" stayed greyed
  // out and the next redraw emptied the box. Take whatever is in the box once, when React takes the
  // page over. A layout effect runs before any redraw can empty the box, and before the person can
  // type again, so nothing typed is lost and ordinary typing still goes through onChange.
  useLayoutEffect(() => {
    const typedBeforeLoad = boxRef.current?.value ?? "";
    if (typedBeforeLoad !== "") setText(typedBeforeLoad);
  }, []);

  async function handleMapIt() {
    const trimmed = text.trim();
    if (trimmed.length === 0 || parsing) return;
    setParsing(true);

    let result: IntentParseResult;
    try {
      const res = await fetch("/api/intent/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      result = res.ok ? ((await res.json()) as IntentParseResult) : parseIntentFallback(trimmed);
    } catch {
      // Offline / network failure — the box never dead-ends.
      result = parseIntentFallback(trimmed);
    }

    // Landing is always the front door of a NEW journey — a returning visitor typing a
    // fresh description should never inherit the previous session's tags/goals/province/
    // scenario (audit-2026-07-04 H1). Reset first, then apply the parse onto a clean
    // draft; React batches these so `applyIntentToDraft` sees the fresh default, not the
    // stale one.
    resetJourney();
    // The day the person typed it, in their own calendar, goes with the sentence: it is saved with the
    // idea, word for word, when the intake first saves it.
    setIntake((prev) => applyIntentToDraft(prev, result, trimmed, new Date().toLocaleDateString("en-CA")));
    router.push("/intake");
  }

  const doors = frontDoorWords.doors;
  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col bg-ink">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rule-soft px-4 py-7 sm:px-8 md:px-14">
        <WordMark />
        <div className="flex flex-wrap items-center gap-5">
          <GhostLink href="/ventures" tone="stone">
            {frontDoorWords.nav.futures}
          </GhostLink>
          <GhostLink href="/cockpit" tone="stone">
            {frontDoorWords.nav.cockpit}
          </GhostLink>
          <GhostLink href="/settings" tone="stone">
            {frontDoorWords.nav.settings}
          </GhostLink>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 md:px-14">
        <section className="w-full max-w-[1120px]">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-bold leading-[1.05] tracking-tight text-paper md:text-5xl lg:text-[56px]">
              {frontDoorWords.headline}
            </h1>
            <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-relaxed text-paper-dim">{frontDoorWords.subline}</p>
          </div>

          {/* The three doors (decision 6 of 2026-10-11), in this order: the dream first. Side by side on a
              wide window, one under the other on a narrow one. */}
          <ul aria-label={frontDoorWords.doorsLabel} className="mt-10 grid gap-4 text-left lg:grid-cols-[1fr_1.35fr_1fr]">
            <li className="flex flex-col gap-3 rounded-[10px] border border-maple-soft bg-ink2 p-5">
              <h2 className="font-serif text-[20px] font-bold leading-snug tracking-tight text-paper">{doors.dream.title}</h2>
              <p className="text-[13px] leading-relaxed text-paper-dim">{doors.dream.body}</p>
              <p className="text-[12px] text-stone">{doors.dream.stays}</p>
              <div className="mt-auto flex justify-end">
                <Link
                  href="/start"
                  className="inline-flex items-center gap-2 rounded-full border border-maple bg-maple px-4 py-2 text-xs font-medium tracking-wide text-[#fff8ee]"
                >
                  {doors.dream.go}
                </Link>
              </div>
            </li>

            <li className="flex flex-col gap-3 rounded-[10px] border border-rule bg-ink2 p-5">
              <h2 className="font-serif text-[20px] font-bold leading-snug tracking-tight text-paper">{doors.idea.title}</h2>
              <p className="text-[13px] leading-relaxed text-paper-dim">{doors.idea.body}</p>
              {/* Today's box, unchanged: everything it did, it still does (docs/ui-spec/landing/01-free-text-entry.md). */}
              <div className="flex w-full flex-col overflow-hidden rounded-[10px] border border-rule bg-ink3 focus-within:border-maple-soft">
                <textarea
                  ref={boxRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleMapIt();
                  }}
                  placeholder="What are you building — or what do you want to write off? Any venture works: a video game studio, weekend woodworking, a plumbing company, “I bought a workstation”…"
                  rows={3}
                  // The most a statement holds; the browser drops anything past it, so a note says so below.
                  maxLength={STATEMENT_MAX_CHARS}
                  className="min-h-[88px] flex-1 resize-none border-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-paper outline-hidden placeholder:text-stone-dim"
                />
                <div className="flex justify-end border-t border-rule-soft px-3 py-2">
                  <Pill variant="maple" onClick={handleMapIt} disabled={parsing || text.trim().length === 0}>
                    {parsing ? "Reading…" : "Map it →"}
                  </Pill>
                </div>
              </div>
              {text.length >= STATEMENT_MAX_CHARS ? (
                <p role="status" className="text-[12px] text-amber">
                  {STATEMENT_FULL_NOTE}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setText(prompt)}
                    className="rounded-full border border-rule px-3 py-1.5 text-left text-[12px] text-stone transition hover:border-maple-soft hover:text-paper"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </li>

            {/* No link and no button: the invented example future isn't written yet, and this says so. */}
            <li className="flex flex-col gap-3 rounded-[10px] border border-dashed border-rule bg-ink p-5">
              <h2 className="font-serif text-[20px] font-bold leading-snug tracking-tight text-paper-dim">{doors.example.title}</h2>
              <p className="text-[13px] leading-relaxed text-stone">{doors.example.body}</p>
              <p className="mt-auto self-start rounded-sm border border-rule px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone-dim">
                {doors.example.tag}
              </p>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
