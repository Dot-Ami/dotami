"use client";

import { useEffect, useMemo, useState } from "react";
import { Pill } from "@/components/ui";
import type { PlaybookSkeleton } from "@/lib/playbook/types";
import { renderPlaybookMarkdown } from "@/lib/playbook/render-markdown";
import type { Scenario } from "@/lib/scenarios/types";

interface PlaybookExportPanelProps {
  scenario: Scenario;
  onClose: () => void;
}

function slugifyFileStem(name: string): string {
  const stem = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return stem.length > 0 ? stem : "venture";
}

/**
 * The prep-tool export: the scenario's catalog skeleton (profile, branch picks, every visible
 * node with its citations) rendered to markdown for an accountant or lawyer. S2.5.4h: facts
 * only — the LLM narrative paragraphs are gone with the rest of the in-app AI.
 */
export function PlaybookExportPanel({ scenario, onClose }: PlaybookExportPanelProps) {
  const [skeleton, setSkeleton] = useState<PlaybookSkeleton | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const markdown = useMemo(() => (skeleton ? renderPlaybookMarkdown(skeleton) : ""), [skeleton]);

  useEffect(() => {
    const controller = new AbortController();
    setSkeleton(null);
    setError(null);
    setLoading(true);

    fetch("/api/playbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const envelope = (await response.json().catch(() => ({}))) as {
          skeleton?: PlaybookSkeleton;
          error?: string;
        };
        if (!response.ok || !envelope.skeleton) {
          setError(typeof envelope.error === "string" ? envelope.error : `Request failed (${response.status}).`);
          return;
        }
        setSkeleton(envelope.skeleton);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Network error while building the playbook.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [scenario]);

  async function handleCopyMarkdown() {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyHint("Copied to clipboard.");
      setTimeout(() => setCopyHint(null), 2500);
    } catch {
      setCopyHint("Clipboard unavailable in this browser context.");
      setTimeout(() => setCopyHint(null), 3500);
    }
  }

  function handleSaveMarkdown() {
    if (!markdown || !skeleton) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugifyFileStem(skeleton.profile.name)}-playbook.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-ink3 text-paper">
      <div className="flex items-start gap-3 border-b border-rule-soft p-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-maple">
            Export playbook
          </p>
          <h2 className="mt-2 font-serif text-xl font-bold leading-tight text-paper">
            {scenario.profile.name}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-stone">
            Planning map from catalog data — not advice. Verify with CRA, provincial sources,
            and qualified professionals.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-rule px-2.5 py-1 text-sm text-stone hover:bg-ink2"
          aria-label="Close playbook panel"
        >
          ×
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-rule-soft px-5 py-3">
        <Pill variant="ghost" size="small" onClick={() => void handleCopyMarkdown()} disabled={!markdown}>
          Copy markdown
        </Pill>
        <Pill variant="maple" size="small" onClick={handleSaveMarkdown} disabled={!markdown}>
          Save as .md
        </Pill>
      </div>

      {copyHint ? <p className="px-5 py-1 text-xs text-sage">{copyHint}</p> : null}
      {error ? (
        <p className="mx-5 mt-2 rounded-lg border border-maple-soft bg-maple/10 px-3 py-2 text-xs text-maple">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {loading ? <p className="text-sm text-stone">Building playbook…</p> : null}
        {markdown ? (
          <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-stone">
            {markdown}
          </pre>
        ) : !loading && !error ? (
          <p className="text-sm text-stone">No playbook content available.</p>
        ) : null}
      </div>
    </aside>
  );
}
