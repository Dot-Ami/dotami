import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionCard } from "@/components/action-card";
import { Pill } from "@/components/badges";
import { IssueNav } from "@/components/issue-nav";
import { NotResearched } from "@/components/not-researched";
import { Quote } from "@/components/quote";
import { formatDate } from "@/lib/dates";
import { getActions, getIssue } from "@/lib/query";
import { VERIFICATION_MAX_AGE_DAYS } from "@/lib/rules/deadlines";

export const metadata: Metadata = { title: "Action plan" };

export default async function ActionsPage({ params }: { params: Promise<{ issueId: string }> }) {
  const issue = getIssue((await params).issueId);
  if (!issue) notFound();
  if (issue.state === "intake-only") {
    return (
      <div>
        <IssueNav issueId={issue.id} title={issue.title} current="actions" />
        <NotResearched title={issue.title} />
      </div>
    );
  }
  const actions = getActions(issue.id);

  return (
    <div>
      <IssueNav issueId={issue.id} title={issue.title} current="actions" />
      <h1 className="text-2xl font-semibold">Action plan</h1>
      <p className="mt-1 max-w-3xl text-muted">
        Each route names who receives it, the process and where that process is written down, who
        may use it, its deadline, and its limits. Nothing here is sent for you. You draft, you
        approve, you send.
      </p>
      <p className="mt-2 max-w-3xl text-sm">
        A deadline is shown as current only if it is still ahead of the demo&rsquo;s today (
        {formatDate(actions.today)}) and was checked against its source in the last{" "}
        {VERIFICATION_MAX_AGE_DAYS} days.
      </p>

      <Section id="open" title={`Open now, with a checked date (${actions.open.length})`}>
        {actions.open.map((r) => (
          <ActionCard key={r.id} route={r} issueId={issue.id} />
        ))}
      </Section>

      <Section
        id="check"
        title={`Dates to check before relying on them (${actions.checkDate.length})`}
      >
        {actions.checkDate.map((r) => (
          <ActionCard key={r.id} route={r} issueId={issue.id} />
        ))}
      </Section>

      <Section id="anytime" title={`No fixed deadline (${actions.noDeadline.length})`}>
        {actions.noDeadline.map((r) => (
          <ActionCard key={r.id} route={r} issueId={issue.id} />
        ))}
      </Section>

      <Section id="no-route" title={`No verified route (${actions.noRoutes.length})`}>
        <p className="text-sm text-muted">
          Questions people ask that have no verified way to act on them. Saying so beats inventing a
          route.
        </p>
        {actions.noRoutes.map((n) => (
          <article
            key={n.id}
            className="rounded border border-open bg-open-bg p-4"
            data-no-route={n.id}
          >
            <p className="font-semibold">{n.question}</p>
            <p className="mt-1">
              <Pill tone="open">No verified route</Pill> {n.why}
            </p>
            <div className="mt-2 space-y-2">
              {n.basis.map((p) => (
                <Quote key={p.href} passage={p} compact />
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold">What could be researched</p>
            <ul className="list-disc pl-5 text-sm">
              {n.couldBeResearched.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </article>
        ))}
      </Section>

      <Section id="closed" title={`Closed (${actions.closed.length})`}>
        {actions.closed.map((r) => (
          <ActionCard key={r.id} route={r} issueId={issue.id} />
        ))}
      </Section>

      <Section id="outcomes" title="What happened after people acted">
        <ol className="space-y-2">
          {actions.outcomes.map((o) => (
            <li key={o.id} className="rounded border border-line bg-card p-3 text-sm">
              <p className="text-muted">{formatDate(o.date)}</p>
              <p>{o.whatWasDone}</p>
              <p>
                Response: {o.response} <Pill>{o.result.replace("-", " ")}</Pill>
              </p>
            </li>
          ))}
        </ol>
        <p className="text-sm">
          Your own log of what you sent is kept in this browser, on the{" "}
          <Link href={`/issues/${issue.id}/coalition`}>coalition page</Link>.
        </p>
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-8" data-section={id}>
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}
