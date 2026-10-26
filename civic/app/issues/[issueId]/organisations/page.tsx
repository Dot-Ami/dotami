import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Pill } from "@/components/badges";
import { IssueNav } from "@/components/issue-nav";
import { NotResearched } from "@/components/not-researched";
import { Quote } from "@/components/quote";
import { getIssue, getOrganisations } from "@/lib/query";

export const metadata: Metadata = { title: "Organisations and relationships" };

export default async function OrganisationsPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const issue = getIssue((await params).issueId);
  if (!issue) notFound();
  const orgs = getOrganisations(issue.id);
  if (!orgs) {
    return (
      <div>
        <IssueNav issueId={issue.id} title={issue.title} current="organisations" />
        <NotResearched title={issue.title} />
      </div>
    );
  }

  return (
    <div>
      <IssueNav issueId={issue.id} title={issue.title} current="organisations" />
      <h1 className="text-2xl font-semibold">Organisations and their relationships</h1>
      <p className="mt-1 max-w-3xl text-muted">
        Each relationship is one precise type, with the exact amounts and dates the evidence gives,
        and what it does not show next to it. There is no &ldquo;controls&rdquo; or &ldquo;is
        behind&rdquo; type: those words fold several different relationships into one accusation. A
        possible conflict of interest is a question to investigate, not a finding.
      </p>

      <ul className="mt-6 space-y-4">
        {orgs.relationships.map((r) => (
          <li
            key={r.id}
            className="rounded border border-line bg-card p-4"
            data-relationship={r.type}
          >
            <p className="text-lg">
              <strong>{r.from?.name}</strong> <Pill tone="doc">{r.typeInfo.label}</Pill>{" "}
              <strong>{r.to?.name}</strong>
            </p>
            <p className="mt-1">{r.detail}</p>
            <p className="mt-1 text-sm text-muted">
              Status: {r.statusLabel}
              {r.period?.asOf && ` · as at ${r.period.asOf}`}
              {r.period?.to && ` · until ${r.period.to}`}
            </p>
            <div className="mt-2 space-y-2">
              {r.evidence.map((e) => (
                <Quote key={`${e.sourceId}#${e.passageId}`} passage={e.passage} compact />
              ))}
            </div>
            <div className="mt-2 rounded bg-open-bg p-2 text-sm">
              <p className="font-semibold">This does not establish:</p>
              <ul className="list-disc pl-5">
                <li>{r.typeInfo.doesNotMean}</li>
                {r.doesNotEstablish.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>

      <section aria-labelledby="types" className="mt-8">
        <h2 id="types" className="text-xl font-semibold">
          Relationship types used here
        </h2>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          {Object.entries(orgs.types).map(([key, t]) => (
            <div key={key} className="rounded border border-line bg-card p-3 text-sm">
              <dt className="font-semibold">{t.label}</dt>
              <dd>{t.means}</dd>
              <dd className="text-muted">Doesn&rsquo;t mean: {t.doesNotMean}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="bodies" className="mt-8">
        <h2 id="bodies" className="text-xl font-semibold">
          Everyone involved
        </h2>
        <p className="text-sm text-muted">
          Public offices are named by office, not by the person who holds them.
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {orgs.entities.map((e) => (
            <li key={e.id} className="rounded border border-line bg-card p-3 text-sm">
              <p className="font-semibold">{e.name}</p>
              <p>{e.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
