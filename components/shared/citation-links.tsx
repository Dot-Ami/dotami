"use client";

import { useState } from "react";

import type { CitationVerificationStatus, CorpusPointer, EngineCitation } from "@/lib/engines/shared/types";

/**
 * S2.5.4f (decided 2026-09-13) — show the law on every item, as clickable official links.
 * Every citation is a link to its official URL (Justice Canada for the Act, canada.ca for
 * CRA), with authority · jurisdiction · verified date, and the statute-check status where one
 * exists. PARTIAL is amber on purpose: it is the gap the UI must show, not hide.
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
      className={`rounded border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider ${STATUS_CLASS[status]} ${className}`}
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
        <li key={`${c.url}-${c.title}`} className={`rounded border border-rule ${compact ? "p-1.5" : "p-2"} text-xs`}>
          <a href={c.url} target="_blank" rel="noreferrer" className="block hover:opacity-90">
            <span className="flex items-start gap-2">
              <span className="min-w-0 flex-1 font-semibold text-paper">{c.title} ↗</span>
              {c.verification ? <StatusChip status={c.verification.status} className="shrink-0" /> : null}
            </span>
            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-stone">
              {c.authority} · {c.jurisdiction} · verified {c.lastVerified}
            </span>
            {c.verification?.status === "partial" ? (
              <span className="mt-1 block text-[10px] leading-4 text-amber">{c.verification.method}</span>
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
        className="rounded border border-maple-soft bg-maple/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-maple hover:bg-maple/20"
      >
        {state === "loading" ? "Reading…" : state === "open" ? `Hide ${pointerLabel(pointer)}` : `Show the words · ${pointerLabel(pointer)}`}
      </button>
      {state === "open" || state === "error" ? (
        <div className="mt-1.5 rounded border border-rule-soft bg-ink px-2.5 py-2">
          {data?.found ? (
            <>
              <p className="font-mono text-[9px] uppercase tracking-wider text-stone">
                {data.sourceName} · {data.citation} · s.{data.label}
                {data.heading ? ` — ${data.heading}` : ""} · current to {data.documentCurrency}
                {data.repealed ? " · REPEALED" : ""}
              </p>
              {data.focus && !data.focus.found ? (
                <p className="mt-1 text-[10px] text-amber">
                  Could not locate {data.focus.sub} inside s.{data.label} by walking the paragraph markers — showing the start of the section instead. Open the official text to read the paragraph.
                </p>
              ) : null}
              <p className="mt-1.5 whitespace-pre-wrap font-serif text-[12px] leading-relaxed text-paper">
                {data.focus?.found
                  ? data.focus.snippet
                  : `${(data.text ?? "").slice(0, SECTION_PREVIEW_CHARS)}${(data.textLength ?? 0) > SECTION_PREVIEW_CHARS ? " …" : ""}`}
              </p>
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-stone-dim">
                The provision&apos;s own words, read from the law store through its contract. Not a summary.{" "}
                {data.officialUrl ? (
                  <a href={data.officialUrl} target="_blank" rel="noreferrer" className="text-maple hover:underline">
                    official text ↗
                  </a>
                ) : null}
              </p>
            </>
          ) : (
            <p className="text-[10px] text-amber">{data?.reason ?? "Not found."}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
