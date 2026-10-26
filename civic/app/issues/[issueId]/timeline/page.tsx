import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KindLabel, Pill } from "@/components/badges";
import { IssueNav } from "@/components/issue-nav";
import { NotResearched } from "@/components/not-researched";
import { Quote } from "@/components/quote";
import { formatDate } from "@/lib/dates";
import { getIssue, getTimeline } from "@/lib/query";

export const metadata: Metadata = { title: "Decisions and authority" };

export default async function TimelinePage({ params }: { params: Promise<{ issueId: string }> }) {
  const issue = getIssue((await params).issueId);
  if (!issue) notFound();
  if (issue.state === "intake-only") {
    return (
      <div>
        <IssueNav issueId={issue.id} title={issue.title} current="timeline" />
        <NotResearched title={issue.title} />
      </div>
    );
  }
  const decisions = getTimeline(issue.id);

  return (
    <div>
      <IssueNav issueId={issue.id} title={issue.title} current="timeline" />
      <h1 className="text-2xl font-semibold">Decisions, authority and timeline</h1>
      <p className="mt-1 max-w-3xl text-muted">
        Two separate decisions, by two separate bodies, under two separate laws. Original wording
        sits beside every plain-language explanation. This is general information about a process,
        not legal advice; the flags say where a lawyer&rsquo;s reading is needed.
      </p>

      {decisions.map((d) => (
        <section key={d.id} aria-labelledby={`d-${d.id}`} className="mt-8" data-decision={d.id}>
          <h2 id={`d-${d.id}`} className="text-xl font-semibold">
            {d.title}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <Pill tone={d.inForce ? "act" : "open"}>
              <span data-testid={`stage-${d.id}`}>{d.stageLabel}</span>
            </Pill>
            <span className="text-sm text-muted">
              {d.instrument} · {d.jurisdiction}
            </span>
          </p>
          <p className="mt-1">{d.stageMeaning}</p>
          <div className="mt-2 space-y-2">
            {d.stageBasis.map((p) => (
              <Quote key={p.href} passage={p} compact />
            ))}
          </div>

          <div className="mt-4 rounded border border-line bg-card p-3">
            <h3 className="font-semibold">Who has authority: {d.authority?.name}</h3>
            <p>{d.authority?.decides}</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {d.authority?.cannotDecide.map((c) => (
                <li key={c}>Can&rsquo;t decide: {c}</li>
              ))}
            </ul>
          </div>

          <h3 className="mt-4 font-semibold">The text, and what it means</h3>
          <ul className="mt-2 space-y-4">
            {d.provisions.map((p) => (
              <li
                key={p.id}
                className="rounded border border-line bg-card p-3"
                data-force={p.force}
              >
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {p.label}{" "}
                  <Pill
                    tone={p.force === "binding" ? "act" : p.force === "guidance" ? "plain" : "open"}
                  >
                    {p.forceLabel}
                  </Pill>
                  {p.expertReviewNeeded && <Pill tone="warn">Needs a lawyer&rsquo;s reading</Pill>}
                </p>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <KindLabel kind="documented">Original wording</KindLabel>
                    <div className="mt-1">
                      <Quote passage={p.original} compact />
                    </div>
                  </div>
                  <div>
                    <KindLabel kind="interpretation">Plain language (ours)</KindLabel>
                    <p className="mt-1">{p.plainLanguage}</p>
                    <p className="mt-1 text-sm text-muted">{p.forceMeaning}</p>
                    <p className="mt-1 text-sm">
                      Effective date:{" "}
                      {p.effectiveDate
                        ? formatDate(p.effectiveDate)
                        : "none of its own: it depends on a later step"}
                    </p>
                    {p.definitions && (
                      <p className="text-sm">Defines: {p.definitions.join(", ")}</p>
                    )}
                    {p.enforcement && <p className="text-sm">Enforcement: {p.enforcement}</p>}
                    <p className="mt-1 text-sm">
                      <KindLabel kind="unresolved">Uncertainty</KindLabel> {p.uncertainty}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mt-4 font-semibold">Timeline</h3>
          <ol className="mt-2 border-l-2 border-line pl-4">
            {d.events.map((e) => (
              <li key={e.id} className="relative mb-3" data-when={e.when}>
                <span
                  aria-hidden="true"
                  className={`absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full border-2 ${e.when === "past" ? "border-muted bg-muted" : "border-doc bg-card"}`}
                />
                <p className="text-sm text-muted">
                  {e.date ? formatDate(e.date) : "Date not known"} ·{" "}
                  {e.when === "past"
                    ? "past"
                    : e.when === "ahead"
                      ? `ahead (${e.dateCertainty})`
                      : "no date set"}
                  {e.interventionPoint && " · "}
                  {e.interventionPoint && <KindLabel kind="action">Point to take part</KindLabel>}
                </p>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm">{e.description}</p>
                {e.source && (
                  <p className="text-xs">
                    <a href={e.source.href}>Source: {e.source.sourceTitle}</a>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
