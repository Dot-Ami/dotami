import type { ClaimStatus, Confidence, ReviewState, Stance } from "@/lib/model";
import { REVIEW_INFO } from "@/lib/rules/review";
import { STATUS_INFO } from "@/lib/rules/status";

const STATUS_STYLE: Record<ClaimStatus, string> = {
  supported: "text-act bg-act-bg border-act",
  "partially-supported": "text-doc bg-doc-bg border-doc",
  contradicted: "text-warn bg-warn-bg border-warn",
  unresolved: "text-open bg-open-bg border-open",
  "insufficient-evidence": "text-muted bg-card border-muted border-dashed",
};

/** A claim's status: symbol and words, never colour alone. */
export function StatusBadge({ status }: { status: ClaimStatus }) {
  const info = STATUS_INFO[status];
  return (
    <span
      data-status={status}
      title={`${info.meaning} Doesn't mean: ${info.notMeaning}`}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      <span aria-hidden="true">{info.symbol}</span>
      {info.label}
    </span>
  );
}

export function ReviewBadge({ state }: { state: ReviewState }) {
  return (
    <span
      data-review={state}
      title={REVIEW_INFO[state].meaning}
      className="inline-flex items-center whitespace-nowrap rounded border border-line bg-card px-2 py-0.5 text-xs text-muted"
    >
      Review: {REVIEW_INFO[state].label}
    </span>
  );
}

/**
 * The five kinds of content the brief says must never blur: what a source says, our
 * interpretation, what is unresolved, a proposed action, and review status.
 */
export type ContentKind = "documented" | "interpretation" | "unresolved" | "action" | "review";

const KIND: Record<ContentKind, { label: string; style: string }> = {
  documented: { label: "Documented: the source's words", style: "text-doc bg-doc-bg" },
  interpretation: { label: "Our interpretation", style: "text-interp bg-interp-bg" },
  unresolved: { label: "Unresolved", style: "text-open bg-open-bg" },
  action: { label: "Proposed action", style: "text-act bg-act-bg" },
  review: { label: "Review status", style: "text-muted bg-card border border-line" },
};

export function KindLabel({ kind, children }: { kind: ContentKind; children?: React.ReactNode }) {
  return (
    <span
      data-kind={kind}
      className={`inline-block rounded px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${KIND[kind].style}`}
    >
      {children ?? KIND[kind].label}
    </span>
  );
}

/** A block of one kind of content, with its label on top and a coloured edge. */
export function KindBlock({
  kind,
  title,
  children,
}: {
  kind: ContentKind;
  title?: string;
  children: React.ReactNode;
}) {
  const edge: Record<ContentKind, string> = {
    documented: "border-doc",
    interpretation: "border-interp border-dashed",
    unresolved: "border-open",
    action: "border-act",
    review: "border-line",
  };
  return (
    <section
      data-kind={kind}
      className={`rounded-r border-l-4 bg-card py-3 pl-4 pr-3 ${edge[kind]}`}
    >
      <div className="mb-1">
        <KindLabel kind={kind}>{title}</KindLabel>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export const STANCE_LABEL: Record<Stance, string> = {
  supports: "Supports",
  contradicts: "Points against",
  qualifies: "Qualifies",
  context: "Context",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  documented: "Documented",
  modelled: "Modelled, not measured",
  uncertain: "Uncertain",
  projection: "A projection",
  "not-assessed": "Not assessed",
};

export function Pill({
  children,
  tone = "plain",
}: {
  children: React.ReactNode;
  tone?: "plain" | "warn" | "act" | "open" | "doc";
}) {
  const style = {
    plain: "border-line text-muted bg-card",
    warn: "border-warn text-warn bg-warn-bg",
    act: "border-act text-act bg-act-bg",
    open: "border-open text-open bg-open-bg",
    doc: "border-doc text-doc bg-doc-bg",
  }[tone];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {children}
    </span>
  );
}
