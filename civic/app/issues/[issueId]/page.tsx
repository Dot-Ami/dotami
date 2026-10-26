import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AffectedList } from "@/components/affected-list";
import { KindBlock, KindLabel, Pill, ReviewBadge, StatusBadge } from "@/components/badges";
import { IssueNav } from "@/components/issue-nav";
import { NotResearched } from "@/components/not-researched";
import { formatDate } from "@/lib/dates";
import { getIssue } from "@/lib/query";

type Props = { params: Promise<{ issueId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const issue = getIssue((await params).issueId);
  return { title: issue?.title ?? "Issue not found" };
}

const SETTLED = new Set(["supported", "contradicted"]);

export default async function IssuePage({ params }: Props) {
  const issue = getIssue((await params).issueId);
  if (!issue) notFound();

  if (issue.state === "intake-only") {
    return (
      <div>
        <IssueNav issueId={issue.id} title={issue.title} current="overview" />
        <h1 className="text-2xl font-semibold">{issue.title}</h1>
        <p className="mt-1 text-sm text-muted">{issue.jurisdictions.join(" · ")}</p>
        <div className="mt-4">
          <NotResearched title={issue.title} />
        </div>
      </div>
    );
  }

  const settled = issue.claims.filter((c) => SETTLED.has(c.status));
  const open = issue.claims.filter((c) => !SETTLED.has(c.status));

  return (
    <div>
      <IssueNav issueId={issue.id} title={issue.title} current="overview" />
      <h1 className="text-2xl font-semibold">{issue.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {issue.jurisdictions.join(" · ")} · last reviewed {formatDate(issue.lastReviewedOn!)}
      </p>
      <p className="mt-3 max-w-3xl rounded bg-card p-3 text-lg">
        <span className="font-semibold">The question: </span>
        {issue.keyQuestion}
      </p>

      <div className="mt-6 grid gap-8">
        <section aria-labelledby="what-happened">
          <h2 id="what-happened" className="text-xl font-semibold">
            1. What happened?
          </h2>
          <div className="mt-2">
            <KindBlock kind="interpretation" title="Our summary of the record">
              <p>{issue.whatHappened}</p>
              <p className="text-sm text-muted">
                A summary is a rewrite. Each point in it is linked to its source on the{" "}
                <Link href={`/issues/${issue.id}/timeline`}>decisions page</Link> and the{" "}
                <Link href={`/issues/${issue.id}/evidence`}>evidence page</Link>.
              </p>
            </KindBlock>
          </div>
        </section>

        <section aria-labelledby="stage">
          <h2 id="stage" className="text-xl font-semibold">
            2. What stage are the decisions at, and who decides?
          </h2>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {issue.decisions.map((d) => (
              <li
                key={d.id}
                className="rounded border border-line bg-card p-3"
                data-decision={d.id}
              >
                <p className="font-semibold">{d.title}</p>
                <p className="mt-1">
                  <Pill tone={d.inForce ? "act" : "open"}>{d.stageLabel}</Pill>
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-muted">Decided by:</span> {d.authority?.name}
                </p>
                <p className="text-sm">{d.authority?.decides}</p>
                {d.authority?.cannotDecide.map((c) => (
                  <p key={c} className="text-sm text-muted">
                    Can&rsquo;t decide: {c}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <Link href={`/issues/${issue.id}/timeline`}>
              Full timeline, the law behind each decision, and its original wording
            </Link>
          </p>
        </section>

        <section aria-labelledby="documented">
          <h2 id="documented" className="text-xl font-semibold">
            3. What is documented?
          </h2>
          <p className="text-sm text-muted">
            Claims the reviewed evidence settles, for now, one way or the other.
          </p>
          <ClaimList claims={settled} issueId={issue.id} />
        </section>

        <section aria-labelledby="disputed">
          <h2 id="disputed" className="text-xl font-semibold">
            4. What is disputed or unknown?
          </h2>
          <p className="text-sm text-muted">
            Claims the evidence doesn&rsquo;t settle. &ldquo;Insufficient evidence&rdquo; means not
            enough has been found to judge, not that the claim is false.
          </p>
          <ClaimList claims={open} issueId={issue.id} />
        </section>

        <section aria-labelledby="affected">
          <h2 id="affected" className="text-xl font-semibold">
            5. Who might be affected, and how sure is that?
          </h2>
          <div className="mt-2">
            <AffectedList groups={issue.affected} />
          </div>
        </section>

        <section aria-labelledby="intervention">
          <h2 id="intervention" className="text-xl font-semibold">
            6. Is there an upcoming point to take part?
          </h2>
          <p className="text-sm text-muted">
            Only dates still ahead that were checked against their source in the last two weeks are
            listed here.
          </p>
          {issue.actionableNow.length === 0 ? (
            <p className="mt-2 rounded border border-line bg-card p-3">
              No verified upcoming deadline.
            </p>
          ) : (
            <ul className="mt-2 space-y-2" data-testid="actionable-now">
              {issue.actionableNow.map((r) => (
                <li
                  key={r.id}
                  className="rounded border border-act bg-act-bg p-3"
                  data-route={r.id}
                >
                  <KindLabel kind="action" />{" "}
                  <strong>
                    {formatDate(r.deadline!.date)}
                    {r.deadline!.time && `, ${r.deadline!.time}`}
                  </strong>
                  : {r.title}
                  <span className="block text-sm text-muted">
                    Demo date, not real. Checked against its source{" "}
                    {r.deadline!.check.checkedDaysAgo} day(s) before the demo&rsquo;s today.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="do">
          <h2 id="do" className="text-xl font-semibold">
            7. What can one person do? What can a group do?
          </h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-line bg-card p-3">
              <p className="font-semibold">On your own</p>
              <p className="text-sm">
                {issue.routeCount} action routes, each with who receives it, the process, who may
                use it, its limits and its source. Plus {issue.noRouteCount} questions people ask
                that have no verified route, said plainly.
              </p>
              <p className="mt-2">
                <Link href={`/issues/${issue.id}/actions`} className="font-semibold">
                  See the action plan
                </Link>
              </p>
            </div>
            <div className="rounded border border-line bg-card p-3">
              <p className="font-semibold">Together</p>
              <p className="text-sm">
                A working group with one concrete objective, shared evidence, open questions, roles,
                a reviewed position statement and an outcome log. Local to your browser in this
                prototype.
              </p>
              <p className="mt-2">
                <Link href={`/issues/${issue.id}/coalition`} className="font-semibold">
                  Open the coalition workspace
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="outcomes">
          <h2 id="outcomes" className="text-xl font-semibold">
            8. What happened after people acted?
          </h2>
          <ol className="mt-2 space-y-2">
            {issue.outcomes.map((o) => (
              <li key={o.id} className="rounded border border-line bg-card p-3">
                <p className="text-sm text-muted">{formatDate(o.date)}</p>
                <p>
                  <span className="font-semibold">Done:</span> {o.whatWasDone}
                </p>
                <p>
                  <span className="font-semibold">Response:</span> {o.response}{" "}
                  <Pill>{o.result.replace("-", " ")}</Pill>
                </p>
                {o.source && (
                  <p className="text-sm">
                    <Link href={o.source.href}>Record</Link>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function ClaimList({
  claims,
  issueId,
}: {
  claims: NonNullable<ReturnType<typeof getIssue>>["claims"];
  issueId: string;
}) {
  return (
    <ul className="mt-2 space-y-2">
      {claims.map((c) => (
        <li key={c.id} className="rounded border border-line bg-card p-3" data-claim={c.id}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            <ReviewBadge state={c.review} />
          </div>
          <p className="mt-1">
            <Link href={`/issues/${issueId}/claims/${c.id}`}>{c.proposition}</Link>
          </p>
          <p className="text-sm text-muted">{c.statusReason}</p>
        </li>
      ))}
    </ul>
  );
}
