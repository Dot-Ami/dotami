import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import type { NodeItems } from "@/lib/brain/node-items";
import type { UnlockItem } from "@/lib/brain/types";
import { CitationLinks, StatusChip, worstStatus } from "@/components/shared/citation-links";
import { OfficialWordsBlock } from "@/components/shared/official-words";
import type { CFENode, CFEOwnNumber, CFERoute, CFERouteLine } from "@/lib/engines/cfe/v2026";
import { incorporationRoutesFor, provinceNotWrittenNote, routesHeading } from "@/lib/engines/cfe/v2026/incorporation-routes";
import { ownNumberFromTyping } from "@/lib/scenarios/branches";
import { PROVINCE_LABELS, type Province } from "@/lib/scenarios/types";

interface NodeDetailPanelProps {
  node: CFENode;
  onClose: () => void;
  /** S2.5.4e: engine items from the evaluator, split by relevance to this node. */
  items: NodeItems;
  /** The idea's province code, for the ways of taking this stage that are written for it. */
  province: string;
  /** The rules' sentence on which of the person's answers set this stage's colour, if any. */
  reason?: string;
  /** The person's own number for this stage (`node.asksOwnNumber`), or null when not given. */
  ownNumber?: number | null;
  /** Set or clear the person's own number. Absent = the panel shows it without an input. */
  onOwnNumberChange?: (value: number | null) => void;
  /**
   * The cockpit's step panel puts its own sections here (status, done when, skills, costs), between the
   * two lines and the cards (2026-10-12; docs/architecture/future-cockpit.md § 2). Nothing else changes.
   */
  children?: ReactNode;
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
export function NodeDetailPanel({
  node,
  onClose,
  items,
  province,
  reason,
  ownNumber = null,
  onOwnNumberChange,
  children,
}: NodeDetailPanelProps) {
  const { routes, provinceNotWritten } = incorporationRoutesFor(node.id, province);
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
        {reason ? <Line label="Your answers" text={reason} /> : null}
      </div>
      {node.officialWords ? <OfficialWordsBlock words={node.officialWords} className="mt-3" /> : null}
      {node.asksOwnNumber ? (
        <OwnNumberField ask={node.asksOwnNumber} value={ownNumber} onChange={onOwnNumberChange} />
      ) : null}
      {routes.length > 0 ? <RoutesSideBySide routes={routes} provinceNotWritten={provinceNotWritten} /> : null}
      <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone-dim">
        Compass, not GPS · planning information, not tax or legal advice
      </p>

      {children}

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
export function Fold({ title, children }: { title: string; children: React.ReactNode }) {
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

export function ItemRow({ item }: { item: UnlockItem }) {
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
          <span className="mr-2 rounded-sm border border-rule px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-stone">
            {item.typeChip}
          </span>
          <span className="text-sm font-semibold text-paper">{item.title}</span>
          {worstStatus(item.citations) === "partial" ? <StatusChip status="partial" className="ml-2" /> : null}
          <span className="mt-1 block text-xs leading-5 text-stone">{item.why}</span>
        </span>
        <span className="font-mono text-xs text-stone">{open ? "−" : "+"}</span>
      </button>
      {item.officialWords ? (
        // The official test, word for word, always in view (2026-10-11: the GST/HST card). Outside the
        // toggle button, because the quote carries a link.
        <OfficialWordsBlock words={item.officialWords} className="mt-2" />
      ) : null}
      {item.fromRecords ? (
        // [8a] The person's own confirmed figures decided (or were read for) this card: say so,
        // name where they came from, and keep them one click away. Outside the toggle button,
        // because a link can't sit inside a button.
        <p className="mt-1.5 pl-3.5 font-mono text-[10px] leading-4 text-sage">
          {item.fromRecords.summary}
          {item.fromRecords.sources.length > 0
            ? ` · from ${item.fromRecords.sources.map((s) => s.label).join(", ")}`
            : ""}{" "}
          ·{" "}
          <Link href="/ventures" className="underline decoration-sage/50 underline-offset-2 hover:text-paper">
            see your figures
          </Link>
        </p>
      ) : null}
      {item.fromRecords && item.fromRecords.notes.length > 0 ? (
        // [8e] How recent those figures are and what the read leaves out: whole sentences
        // written by the rule (lib/brain), shown as they are.
        <p className="mt-0.5 pl-3.5 font-mono text-[10px] leading-4 text-stone">{item.fromRecords.notes.join(" ")}</p>
      ) : null}
      {open ? (
        <div className="mt-3 space-y-2.5 border-t border-rule-soft pt-3 text-xs leading-5 text-stone">
          <p className="text-paper-dim">{item.payoff}</p>
          {item.expires ? (
            <p className="font-mono text-[10px] text-amber">Time-boxed · in use before {item.expires.slice(0, 4)}</p>
          ) : null}
          {item.fork ? (
            <div className="rounded-sm border border-amber/40 bg-amber/5 p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-wider text-amber">{item.fork.label}</p>
              <p className="mt-1">{item.fork.note}</p>
            </div>
          ) : null}
          {item.risk ? (
            <div className="rounded-sm border border-maple-soft bg-maple/5 p-2.5">
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

/**
 * A number only the person gives (2026-10-11: "I'd incorporate at $___"), labelled as theirs. Digits
 * only; empty clears it. The words come from the catalog (`CFENode.asksOwnNumber`).
 */
function OwnNumberField({
  ask,
  value,
  onChange,
}: {
  ask: CFEOwnNumber;
  value: number | null;
  onChange?: (value: number | null) => void;
}) {
  const id = useId();
  return (
    <div className="mt-4 rounded-lg border border-rule bg-ink2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-sm text-paper">
          {ask.label}
        </label>
        <span className="text-sm text-stone" aria-hidden>
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value === null ? "" : String(value)}
          disabled={!onChange}
          onChange={(e) => {
            // Digits only, and never more than a save can keep (ownNumberFromTyping).
            onChange?.(ownNumberFromTyping(e.target.value));
          }}
          className="w-32 rounded-sm border border-rule bg-ink px-2 py-1 font-mono text-sm text-paper focus:border-maple focus:outline-hidden"
        />
        <span className="rounded-sm border border-rule px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-stone">
          your number
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-stone">{ask.help}</p>
    </div>
  );
}

const PER_WORDS: Record<NonNullable<CFERouteLine["per"]>, string> = { once: "once", year: "a year" };

/**
 * The ways of taking this stage, side by side, from each one's own page (2026-10-11: federal and
 * Alberta incorporation). No total and no pick: the person compares and chooses.
 */
function RoutesSideBySide({ routes, provinceNotWritten }: { routes: CFERoute[]; provinceNotWritten: string | null }) {
  const missingName = provinceNotWritten ? (PROVINCE_LABELS[provinceNotWritten as Province] ?? provinceNotWritten) : null;
  return (
    <section className="mt-5" aria-label="Ways to take this step">
      <h3 className="mb-2 font-mono text-[9px] uppercase tracking-[0.14em] text-stone-dim">
        {routesHeading(routes.length, missingName)}
      </h3>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {routes.map((route) => (
          <article key={route.id} className="rounded-lg border border-rule bg-ink2 p-3 text-xs leading-5">
            <h4 className="font-serif text-[14px] font-bold leading-tight text-paper">{route.label}</h4>
            <p className="mt-1 text-stone">{route.summary}</p>
            <ul className="mt-2 space-y-2">
              {route.lines.map((line) => (
                <li key={line.id} className="border-t border-rule-soft pt-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-paper-dim">{line.label}</span>
                    <span className="shrink-0 font-mono text-[11px] text-paper">{lineAmount(line)}</span>
                  </div>
                  <p className="mt-0.5 text-stone">
                    {line.quotes.map((quote, i) => (
                      <q key={i} className="mr-1">
                        {quote}
                      </q>
                    ))}
                    <a
                      href={line.citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10px] text-maple underline decoration-maple/40 underline-offset-2"
                    >
                      source, read {line.citation.lastVerified}
                    </a>
                  </p>
                </li>
              ))}
            </ul>
            {route.blanksNote ? <p className="mt-2 text-[11px] text-stone-dim">{route.blanksNote}</p> : null}
          </article>
        ))}
      </div>
      {missingName ? <p className="mt-2 text-[11px] text-stone-dim">{provinceNotWrittenNote(missingName)}</p> : null}
    </section>
  );
}

/** The amount column: the page's amount, or plainly none. */
function lineAmount(line: CFERouteLine): string {
  if (line.kind === "not-needed") return "not needed";
  if (line.kind === "named-blank") return "no amount read";
  const per = line.per ? ` ${PER_WORDS[line.per]}` : "";
  return `$${line.amountCad!.toLocaleString("en-CA")}${per}`;
}
