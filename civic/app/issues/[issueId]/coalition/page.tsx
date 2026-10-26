import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CoalitionWorkspace, type StatementCheckView } from "@/components/coalition-workspace";
import { IssueNav } from "@/components/issue-nav";
import { NotResearched } from "@/components/not-researched";
import { ALL, claimSummary, getCoalition, getIssue, getRoute, passage } from "@/lib/query";
import { checkParagraph, statementReadiness } from "@/lib/rules/statement";

export const metadata: Metadata = { title: "Coalition workspace" };

export default async function CoalitionPage({ params }: { params: Promise<{ issueId: string }> }) {
  const issue = getIssue((await params).issueId);
  if (!issue) notFound();
  const seed = getCoalition(issue.id);
  if (!seed) {
    return (
      <div>
        <IssueNav issueId={issue.id} title={issue.title} current="coalition" />
        <NotResearched title={issue.title} />
      </div>
    );
  }
  const route = getRoute(seed.objectiveActionId)!;
  const readiness = statementReadiness(seed.statement, ALL.CLAIMS, ALL.SOURCES);
  const paragraphs: StatementCheckView[] = seed.statement.paragraphs.map((p) => {
    const check = checkParagraph(p, ALL.CLAIMS, ALL.SOURCES);
    return {
      id: p.id,
      kind: p.kind,
      text: p.text,
      proposedBy: p.proposedBy,
      ...check,
      basis: p.basis.flatMap((b) => {
        if (b.passage) {
          const found = passage(b.passage);
          return found
            ? [{ label: `${found.sourceTitle.split(":")[0]} (passage)`, href: found.href }]
            : [];
        }
        const claim = b.claimId ? claimSummary(b.claimId) : null;
        return claim
          ? [
              {
                label: `claim: ${claim.statusLabel}`,
                href: `/issues/${issue.id}/claims/${claim.id}`,
              },
            ]
          : [];
      }),
    };
  });

  return (
    <div>
      <IssueNav issueId={issue.id} title={issue.title} current="coalition" />
      <h1 className="text-2xl font-semibold">{seed.name}</h1>
      <p className="mt-1 max-w-3xl text-muted">
        A mocked, local workspace. No account, nothing shared: what you add stays in this browser.
        It shows how a group could organise around one concrete objective without turning suspicion
        into accusation.
      </p>
      <div className="mt-6">
        <CoalitionWorkspace
          seed={seed}
          objectiveRoute={{ title: route.title, href: `/issues/${issue.id}/actions#${route.id}` }}
          claims={issue.claims.map((c) => ({
            id: c.id,
            proposition: c.proposition,
            status: c.status,
            href: `/issues/${issue.id}/claims/${c.id}`,
          }))}
          statement={{
            title: seed.statement.title,
            paragraphs,
            reviewsDone: readiness.reviewsDone,
            reviewsNeeded: readiness.reviewsNeeded,
            ready: readiness.ready,
          }}
          outcomes={issue.outcomes.map((o) => ({
            id: o.id,
            date: o.date,
            whatWasDone: o.whatWasDone,
            response: o.response,
            result: o.result,
          }))}
        />
      </div>
    </div>
  );
}
