"use client";

import { useState } from "react";

import { howCheckedWords, isCheckFirst, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import type { CitationVerificationStatus, CorpusPointer, EngineCitation } from "@/lib/engines/shared/types";
import { httpsOnly } from "@/lib/http/safe-url";
import { provisionLines } from "@/lib/law/provision-lines";

import { PageQuotes } from "./page-quotes";

/**
 * S2.5.4f (decided 2026-09-13) — show the law on every item, as clickable official links.
 * Every citation is a link to its official URL (Justice Canada for the Act, canada.ca for
 * CRA), with authority · jurisdiction · how it was checked ("Read by a person on <date>", "Read on
 * <date>. Who read it wasn't recorded.", an AI model's read or "Checked by a tool on <date>: …",
 * 2026-10-11), and the statute-check status where one exists.
 * PARTIAL is amber on purpose: it is the gap the UI must show, not hide.
 *
 * S2.5.4i (decided 2026-09-14) — "Show the words". A citation that carries
 * `corpus` pointers grows one button per provision; each fetches the provision's own text from
 * the law store through `/api/law/provision` and shows it here with its currency date. Nothing
 * is summarised; when the paragraph walk did not land, it says so and shows the section start.
 */

/** Worst-first: a single partial citation makes the item partial. */
export function worstStatus(citations: EngineCitation[]): CitationVerificationStatus | undefined {
  const statuses = citations.map((c) => c.verification?.status).filter(Boolean);
  if (statuses.includes("partial")) return "partial";
  if (statuses.includes("supported")) return "supported";
  if (statuses.includes("confirmed")) return "confirmed";
  return undefined;
}

const STATUS_CLASS: Record<CitationVerificationStatus, string> = {
  confirmed: "border-sage/60 text-sage",
  supported: "border-spruce-line text-[#9fc0c4]",
  partial: "border-amber text-amber",
};

export function StatusChip({ status, className = "" }: { status: CitationVerificationStatus; className?: string }) {
  return (
    <span
      className={`rounded-sm border px-1.5 py-0.5 font-mono text-label uppercase tracking-wider ${STATUS_CLASS[status]} ${className}`}
      title={
        status === "partial"
          ? "Part of this rests on Regulations not yet in the corpus — figures come from CRA pages only."
          : status === "confirmed"
            ? "Provision text read from the Act; says exactly what this entry says."
            : "Provision text read from the Act; supports this entry, with the omissions the reading found now in the text."
      }
    >
      {status}
    </span>
  );
}

export function CitationLinks({ citations, compact = false }: { citations: EngineCitation[]; compact?: boolean }) {
  if (citations.length === 0) return null;
  return (
    <ul className={compact ? "space-y-1" : "space-y-1.5"}>
      {citations.map((c) => (
        <li key={`${c.url}-${c.title}`} className={`rounded-sm border border-rule ${compact ? "p-1.5" : "p-2"} text-body`}>
          <a href={c.url} target="_blank" rel="noreferrer" className="block hover:opacity-90">
            <span className="flex items-start gap-2">
              <span className="min-w-0 flex-1 font-semibold text-paper">{c.title} ↗</span>
              {c.verification ? <StatusChip status={c.verification.status} className="shrink-0" /> : null}
            </span>
            {/* How it was checked (decided 2026-10-11, docs/engines/citations.md). A person's read,
                or a read nobody recorded the reader of, keeps its place on the one line; an AI
                model's read or a tool check gets its own line, in amber, because it says no person
                has read the page yet. A tool check lists the words it found under that line. */}
            {!isCheckFirst(c) ? (
              <span className="mt-0.5 block font-mono text-label uppercase tracking-wider text-stone">
                {c.authority} · {c.jurisdiction} · {howCheckedWords(c)}
              </span>
            ) : (
              <>
                <span className="mt-0.5 block font-mono text-label uppercase tracking-wider text-stone">
                  {c.authority} · {c.jurisdiction}
                </span>
                <span className="mt-1 block text-small leading-4 text-amber">{howCheckedWords(c)}</span>
                {/* The official-quote component: the page's own words, after their label. */}
                <PageQuotes quotes={toolCheckQuotes(c)} className="mt-0.5 block text-small leading-4 text-stone" />
              </>
            )}
            {c.verification?.status === "partial" ? (
              <span className="mt-1 block text-small leading-4 text-amber">{c.verification.method}</span>
            ) : null}
          </a>
          {c.corpus && c.corpus.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {c.corpus.map((p) => (
                <ProvisionWords key={`${p.source}-${p.label}-${p.sub ?? ""}`} pointer={p} />
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

interface ProvisionResponse {
  found: boolean;
  reason?: string;
  sourceName?: string;
  citation?: string;
  officialUrl?: string;
  documentCurrency?: string;
  label?: string;
  heading?: string | null;
  inforceStart?: string | null;
  repealed?: boolean;
  text?: string;
  textLength?: number;
  focus?: { sub: string; found: boolean; snippet: string } | null;
}

const SECTION_PREVIEW_CHARS = 1200;

// One step of indent per level: subsection, paragraph, subparagraph, clause, subclause. Written out
// in full so Tailwind finds each class in the source.
const INDENT = ["pl-0", "pl-3", "pl-6", "pl-9", "pl-12"];

/**
 * A provision's words laid out as the Act prints them (#9): one line per subsection, paragraph and
 * subparagraph, indented by level, with each marginal note on a line of its own in small italics.
 * The store sends one run-on string; lib/law/provision-lines.ts finds the breaks without changing a
 * word. `more` marks a section cut short for the preview with " …" on its last line.
 */
export function ProvisionText({ text, more }: { text: string; more: boolean }) {
  const lines = provisionLines(text);
  return (
    <div className="mt-1.5 space-y-1 font-serif text-body leading-relaxed text-paper">
      {lines.map((line, i) => (
        <p
          key={i}
          className={`whitespace-pre-wrap ${INDENT[line.depth] ?? INDENT[INDENT.length - 1]}${line.note ? " text-small italic text-stone" : ""}`}
        >
          {more && i === lines.length - 1 ? `${line.text} …` : line.text}
        </p>
      ))}
    </div>
  );
}

function pointerLabel(p: CorpusPointer): string {
  const src = p.source === "ita" ? "ITA" : p.source === "itr" ? "Reg." : p.source.toUpperCase();
  return `${src} ${p.label}${p.sub ?? ""}`;
}

/** One button per provision: closed = the pointer; open = the words, dated, or the honest miss. */
function ProvisionWords({ pointer }: { pointer: CorpusPointer }) {
  const [state, setState] = useState<"closed" | "loading" | "open" | "error">("closed");
  const [data, setData] = useState<ProvisionResponse | null>(null);

  async function toggle() {
    if (state === "open") {
      setState("closed");
      return;
    }
    if (data) {
      setState("open");
      return;
    }
    setState("loading");
    try {
      const qs = new URLSearchParams({ source: pointer.source, label: pointer.label, ...(pointer.sub ? { sub: pointer.sub } : {}) });
      const res = await fetch(`/api/law/provision?${qs.toString()}`);
      const body = (await res.json()) as ProvisionResponse;
      setData(body);
      setState("open");
    } catch {
      setData({ found: false, reason: "Could not reach the app." });
      setState("error");
    }
  }

  return (
    <div className="min-w-0 flex-1 basis-full">
      <button
        type="button"
        onClick={() => void toggle()}
        className="rounded-sm border border-maple-soft bg-maple/10 px-1.5 py-0.5 font-mono text-label uppercase tracking-wider text-maple hover:bg-maple/20"
      >
        {state === "loading" ? "Reading…" : state === "open" ? `Hide ${pointerLabel(pointer)}` : `Show the words · ${pointerLabel(pointer)}`}
      </button>
      {state === "open" || state === "error" ? (
        <div className="mt-1.5 rounded-sm border border-rule-soft bg-ink px-2.5 py-2">
          {data?.found ? (
            <>
              <p className="font-mono text-label uppercase tracking-wider text-stone">
                {data.sourceName} · {data.citation} · s.{data.label}
                {data.heading ? ` — ${data.heading}` : ""} · current to {data.documentCurrency}
                {data.repealed ? " · REPEALED" : ""}
              </p>
              {data.focus && !data.focus.found ? (
                <p className="mt-1 text-small text-amber">
                  Could not locate {data.focus.sub} inside s.{data.label} by walking the paragraph markers — showing the start of the section instead. Open the official text to read the paragraph.
                </p>
              ) : null}
              {data.focus?.found ? (
                <ProvisionText text={data.focus.snippet} more={false} />
              ) : (
                <ProvisionText
                  text={(data.text ?? "").slice(0, SECTION_PREVIEW_CHARS)}
                  more={(data.textLength ?? 0) > SECTION_PREVIEW_CHARS}
                />
              )}
              <p className="mt-1.5 font-mono text-label uppercase tracking-wider text-stone-dim">
                The provision&apos;s own words, read from the law store through its contract. Not a summary.{" "}
                {httpsOnly(data.officialUrl) ? (
                  <a href={httpsOnly(data.officialUrl) ?? undefined} target="_blank" rel="noreferrer" className="text-maple hover:underline">
                    official text ↗
                  </a>
                ) : null}
              </p>
            </>
          ) : (
            <p className="text-small text-amber">{data?.reason ?? "Not found."}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
