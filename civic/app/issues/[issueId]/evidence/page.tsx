import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Pill, ReviewBadge, StatusBadge } from "@/components/badges";
import { IssueNav } from "@/components/issue-nav";
import { NotResearched } from "@/components/not-researched";
import type { ClaimKind, ClaimStatus } from "@/lib/model";
import { getClaim, getIssue } from "@/lib/query";
import { STATUS_INFO } from "@/lib/rules/status";

export const metadata: Metadata = { title: "Evidence" };

const KIND_LABEL: Record<ClaimKind, string> = {
  scientific: "Scientific",
  legal: "Legal",
  factual: "Factual",
  attribution: "Who said what",
  relationship: "Relationship",
  historical: "Historical",
  prediction: "Prediction",
};

export default async function EvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ issueId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const issue = getIssue((await params).issueId);
  if (!issue) notFound();
  const { status = "" } = await searchParams;

  if (issue.state === "intake-only") {
    return (
      <div>
        <IssueNav issueId={issue.id} title={issue.title} current="evidence" />
        <NotResearched title={issue.title} />
      </div>
    );
  }

  const claims = issue.claims
    .filter((c) => !status || c.status === status)
    .map((c) => getClaim(c.id)!);
  const statuses = Object.keys(STATUS_INFO) as ClaimStatus[];

  return (
    <div>
      <IssueNav issueId={issue.id} title={issue.title} current="evidence" />
      <h1 className="text-2xl font-semibold">Evidence explorer</h1>
      <p className="mt-1 max-w-3xl text-muted">
        Every claim made about this issue, worded precisely enough to test, with the passages that
        bear on it. Broad claims are split into the separate propositions they bundle together.
      </p>

      <nav aria-label="Filter by status" className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/issues/${issue.id}/evidence`}
          aria-current={!status ? "page" : undefined}
          className={!status ? "font-semibold" : ""}
        >
          All ({issue.claims.length})
        </Link>
        {statuses.map((s) => {
          const n = issue.claims.filter((c) => c.status === s).length;
          return (
            <Link
              key={s}
              href={`/issues/${issue.id}/evidence?status=${s}`}
              aria-current={status === s ? "page" : undefined}
              className={status === s ? "font-semibold" : ""}
            >
              {STATUS_INFO[s].label} ({n})
            </Link>
          );
        })}
      </nav>

      <ul className="mt-4 space-y-3">
        {claims.map((c) => {
          const count = (stance: string) => c.evidence.filter((e) => e.stance === stance).length;
          return (
            <li
              key={c.id}
              className="rounded border border-line bg-card p-4"
              data-claim={c.id}
              data-status={c.summary.status}
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={c.summary.status} />
                <ReviewBadge state={c.reviewGate.state} />
                <Pill>{KIND_LABEL[c.kind]}</Pill>
                {c.highStakes && <Pill tone="warn">High stakes: two reviews required</Pill>}
              </div>
              <p className="mt-2 text-lg">
                <Link href={`/issues/${issue.id}/claims/${c.id}`}>{c.proposition}</Link>
              </p>
              <p className="text-sm">{c.summary.statusReason}</p>
              <p className="mt-1 text-sm text-muted">
                {count("supports")} supporting · {count("contradicts")} against ·{" "}
                {count("qualifies")} qualifying · {count("context")} context
                {c.assertions.passages > 0 &&
                  ` · claimed in ${c.assertions.passages} passage(s) from ${c.assertions.origins.length} independent origin(s)`}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
