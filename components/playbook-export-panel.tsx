"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pill } from "@/components/ui";
import type { PlanArgs } from "@/lib/cockpit/plan";
import { cockpitWords as words } from "@/lib/cockpit/words";
import { renderRoadExport } from "@/lib/playbook/road-export";
import { saveTextFile } from "@/lib/utils/save-file";

interface PlaybookExportPanelProps {
  /**
   * The road on screen as the cockpit holds it: its own road-evaluation input (without any what-if), the days
   * kept with each answer and the person's words, exactly what *Your plan* reads (lib/cockpit/plan.ts).
   */
  planArgs: PlanArgs;
  /** The saved idea's id, for the link to its plan; null for an idea kept only in this tab. */
  ventureId: string | null;
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
 * The prep-tool export: the road on screen, step by step (lib/playbook/road-export.ts), rendered to markdown for
 * an accountant or lawyer. Since the pre-release fix of 2026-10-23 it is built here, from what the cockpit
 * already holds, rather than from the tax map's catalog stages on the server: so the export is the road the
 * person is looking at, on every road. Facts only (S2.5.4h).
 */
export function PlaybookExportPanel({ planArgs, ventureId, onClose }: PlaybookExportPanelProps) {
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const markdown = useMemo(() => renderRoadExport(planArgs), [planArgs]);

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
    if (!markdown) return;
    saveTextFile(`${slugifyFileStem(planArgs.ideaName)}-playbook.md`, "text/markdown;charset=utf-8", markdown);
  }

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-ink3 text-paper">
      <div className="flex items-start gap-3 border-b border-rule-soft p-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-small uppercase tracking-[0.14em] text-maple">
            Export playbook
          </p>
          <h2 className="mt-2 font-serif text-xl font-bold leading-tight text-paper">
            {planArgs.ideaName}
          </h2>
          <p className="mt-2 text-body leading-relaxed text-stone">
            Planning map from catalog data — not advice. Verify with CRA, provincial sources,
            and qualified professionals.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-rule px-2.5 py-1 text-lead text-stone hover:bg-ink2"
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

      {/* Issue #41: the same idea laid out to read and print, on a page of its own (docs/ui-spec/plan/). */}
      <div className="border-b border-rule-soft px-5 py-3">
        {ventureId ? (
          <Link href={`/plan?venture=${encodeURIComponent(ventureId)}`} className="text-body text-maple hover:underline">
            {words.plan.open} →
          </Link>
        ) : (
          <p className="text-body text-stone">{words.plan.notSaved}</p>
        )}
      </div>

      {copyHint ? <p className="px-5 py-1 text-body text-sage">{copyHint}</p> : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <pre className="whitespace-pre-wrap wrap-break-word font-sans text-body leading-relaxed text-stone">{markdown}</pre>
      </div>
    </aside>
  );
}
