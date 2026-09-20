import { useState } from "react";

import type { NodeItems } from "@/lib/brain/node-items";
import type { UnlockItem } from "@/lib/brain/types";
import { CitationLinks, StatusChip, worstStatus } from "@/components/shared/citation-links";
import type { CFENode } from "@/lib/engines/cfe/v2026";

interface NodeDetailPanelProps {
  node: CFENode;
  onClose: () => void;
  /** S2.5.4e: engine items from the evaluator, split by relevance to this node. */
  items: NodeItems;
}

/**
 * Node detail — the education surface.
 *
 * Rewritten 2026-09-13 (S2.5.4e) on two decisions: wire the panel to the real evaluator run,
 * and explain concepts very briefly, expanding only when the person asks. Two lines first
 * (trigger + what it unlocks); everything else opens on demand. The
 * engine sections come from the evaluator run on THIS scenario — never from an archetype's
 * id lists — so an Alberta venture never sees BC entries.
 */
export function NodeDetailPanel({ node, onClose, items }: NodeDetailPanelProps) {
  return (
    <aside className="h-full overflow-y-auto border-l border-rule bg-ink3 p-5 text-[13px] leading-snug">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-maple">{node.stage}</p>
          <h2 className="mt-1.5 font-serif text-2xl font-bold leading-tight text-paper">{node.label}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-rule px-2.5 py-1 text-sm text-stone hover:bg-ink2"
          aria-label="Close node detail panel"
        >
          ×
        </button>
      </div>

      {/* The two lines */}
      <div className="mt-4 space-y-2.5">
        <Line label="Trigger" text={node.trigger} />
        <Line label="If it applies" text={node.lensAnnotations.tax} />
      </div>
      <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone-dim">
        Compass, not GPS · planning information, not tax or legal advice
      </p>

      {/* For you — evaluator ∩ this stage */}
      <section className="mt-6">
        <h3 className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-stone-dim">
          For you on this stage · {items.forThisStage.length}
        </h3>
        {items.forThisStage.length === 0 ? (
          <p className="text-xs leading-5 text-stone">
            Nothing on this stage matches your answers yet — province, structure, activity and
            the capital-purchase toggle decide what appears.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.forThisStage.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      <Fold title={`Elsewhere on your map · ${items.elsewhere.length}`}>
        {items.elsewhere.length === 0 ? (
          <p className="text-xs leading-5 text-stone">Nothing else applies to your answers yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.elsewhere.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </Fold>

      <Fold title="More about this stage">
        <div className="space-y-3 text-xs leading-5 text-stone">
          <Block label="Description" text={node.description} />
          <Block label="Tax impact" text={node.taxImpact} />
          <Block label="Legal note" text={node.lensAnnotations.legal} />
          <Block label="Financial impact" text={node.financialImpact.summary} />
          {node.financialImpact.projectionNotes.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {node.financialImpact.projectionNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          {node.financialImpact.estimates.map((estimate) => (
            <div key={`${estimate.label}-${estimate.value}`} className="rounded-lg border border-rule bg-ink2 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[9px] uppercase tracking-wider text-stone">{estimate.label}</span>
                <span className="font-mono text-sm text-paper">{estimate.value}</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-stone">{estimate.basis}</p>
            </div>
          ))}
        </div>
      </Fold>

      <Fold title={`Sources for this stage · ${node.citations.length}`}>
        <CitationLinks citations={node.citations} />
      </Fold>
    </aside>
  );
}

function Line({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-sm leading-6 text-paper">
      <span className="mr-2 font-mono text-[9px] uppercase tracking-[0.14em] text-stone-dim">{label}</span>
      {text}
    </p>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-stone-dim">{label}</p>
      <p className="mt-1 text-paper-dim">{text}</p>
    </div>
  );
}

/** Native disclosure — closed by default; the person asks for more by opening it. */
function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group mt-5 border-t border-rule-soft pt-3">
      <summary className="cursor-pointer list-none font-mono text-[9px] uppercase tracking-[0.14em] text-stone hover:text-paper">
        <span className="mr-1.5 inline-block transition group-open:rotate-90">▸</span>
        {title}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

const STATE_DOT: Record<UnlockItem["state"], string> = {
  green: "bg-sage",
  yellow: "bg-amber",
  gray: "bg-stone-dim",
};

function ItemRow({ item }: { item: UnlockItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-rule bg-ink2 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={open}
        aria-label={`${open ? "Hide" : "Show"} details for ${item.title}`}
      >
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${STATE_DOT[item.state]}`} />
        <span className="min-w-0 flex-1">
          <span className="mr-2 rounded border border-rule px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-stone">
            {item.typeChip}
          </span>
          <span className="text-sm font-semibold text-paper">{item.title}</span>
          {worstStatus(item.citations) === "partial" ? <StatusChip status="partial" className="ml-2" /> : null}
          <span className="mt-1 block text-xs leading-5 text-stone">{item.why}</span>
        </span>
        <span className="font-mono text-xs text-stone">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="mt-3 space-y-2.5 border-t border-rule-soft pt-3 text-xs leading-5 text-stone">
          <p className="text-paper-dim">{item.payoff}</p>
          {item.expires ? (
            <p className="font-mono text-[10px] text-amber">Time-boxed · in use before {item.expires.slice(0, 4)}</p>
          ) : null}
          {item.fork ? (
            <div className="rounded border border-amber/40 bg-amber/5 p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-wider text-amber">{item.fork.label}</p>
              <p className="mt-1">{item.fork.note}</p>
            </div>
          ) : null}
          {item.risk ? (
            <div className="rounded border border-maple-soft bg-maple/5 p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-wider text-maple">
                {item.risk.level.replace("-", " ")}
                {item.risk.gaar ? " · GAAR" : ""}
              </p>
              <p className="mt-1">{item.risk.why}</p>
              <p className="mt-1 text-stone-dim">{item.risk.mitigation}</p>
            </div>
          ) : null}
          <CitationLinks citations={item.citations} />
        </div>
      ) : null}
    </li>
  );
}
