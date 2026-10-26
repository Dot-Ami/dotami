import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KindBlock, Pill, ReviewBadge, STANCE_LABEL, StatusBadge } from "@/components/badges";
import { ExtractionTable, FigureChart } from "@/components/figure-chart";
import { IssueNav } from "@/components/issue-nav";
import { Quote } from "@/components/quote";
import { formatDate } from "@/lib/dates";
import type { Stance } from "@/lib/model";
import { entity, getClaim, getIssue, passage } from "@/lib/query";
import { REVIEW_INFO } from "@/lib/rules/review";
import { STATUS_INFO } from "@/lib/rules/status";

type Props = { params: Promise<{ issueId: string; claimId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const claim = getClaim((await params).claimId);
  return { title: claim ? `Claim: ${claim.proposition}` : "Claim not found" };
}

const STANCE_ORDER: Stance[] = ["supports", "contradicts", "qualifies", "context"];

export default async function ClaimPage({ params }: Props) {
  const { issueId, claimId } = await params;
  const issue = getIssue(issueId);
  const claim = getClaim(claimId);
  if (!issue || !claim || claim.issueId !== issue.id) notFound();
  const status = claim.summary.status;

  return (
    <div>
      <IssueNav issueId={issue.id} title={issue.title} current="evidence" />
      <p className="text-sm">
        <Link href={`/issues/${issue.id}/evidence`}>All claims</Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{claim.proposition}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        <ReviewBadge state={claim.reviewGate.state} />
        {claim.highStakes && <Pill tone="warn">High stakes</Pill>}
      </div>
      <p className="mt-2 max-w-3xl" data-testid="status-reason">
        <strong>{STATUS_INFO[status].label}:</strong> {claim.summary.statusReason}{" "}
        <span className="text-muted">
          ({STATUS_INFO[status].meaning} It doesn&rsquo;t mean{" "}
          {lower(STATUS_INFO[status].notMeaning)})
        </span>
      </p>

      <div className="mt-6 grid gap-6">
        <section aria-labelledby="says">
          <h2 id="says" className="text-xl font-semibold">
            What sources say
          </h2>
          {claim.assertedIn.length === 0 ? (
            <p className="mt-1 text-muted">
              No source makes this claim outright. It is a question the evidence raises, split out
              from a broader claim.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted" data-testid="independence">
                Claimed in {claim.assertions.passages} passage(s) from{" "}
                {claim.assertions.origins.length} independent origin(s)
                {claim.assertions.repeats > 0 &&
                  `; ${claim.assertions.repeats} of them repeat another passage, so they don't count as separate confirmation`}
                .
              </p>
              <div className="mt-2 space-y-2">
                {claim.assertedIn.map((p) => (
                  <Quote key={p.href} passage={p} compact />
                ))}
              </div>
            </>
          )}
        </section>

        <section aria-labelledby="evidence">
          <h2 id="evidence" className="text-xl font-semibold">
            The evidence
          </h2>
          <p className="mt-1 text-sm text-muted">
            Supporting and contradicting passages come from{" "}
            {claim.evidenceIndependence.origins.length} independent publisher(s):{" "}
            {claim.evidenceIndependence.origins
              .map((o) => entity(o.publisherId)?.name ?? o.publisherId)
              .join("; ") || "none"}
            .
          </p>
          {STANCE_ORDER.map((stance) => {
            const links = claim.evidence.filter((e) => e.stance === stance);
            if (links.length === 0) return null;
            return (
              <div key={stance} className="mt-3">
                <h3 className="font-semibold">{STANCE_LABEL[stance]}</h3>
                <ul className="mt-1 space-y-3">
                  {links.map((link) => (
                    <li key={`${link.sourceId}#${link.passageId}`} data-stance={stance}>
                      <Quote passage={link.passage} />
                      <p className="mt-1 text-sm">
                        <span className="font-semibold text-interp">
                          Why it bears on the claim (our reading):
                        </span>{" "}
                        {link.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        {claim.figures.map((figure) => (
          <section key={figure.id} aria-labelledby={`fig-${figure.id}`}>
            <h2 id={`fig-${figure.id}`} className="text-xl font-semibold">
              The figure this rests on
            </h2>
            <div className="mt-2">
              <Quote
                passage={passage({ sourceId: figure.sourceId, passageId: figure.captionPassageId })}
                compact
              />
            </div>
            <div className="mt-3">
              <FigureChart figure={figure} highlight={claim.dependsOnExtractions} />
              <ExtractionTable figure={figure} ids={claim.dependsOnExtractions} />
            </div>
            {claim.extractions.some((e) => e.method === "visually-estimated") && (
              <p
                className="mt-2 rounded border border-open bg-open-bg p-2 text-sm"
                data-testid="extraction-warning"
              >
                Part of this assessment rests on values estimated by eye from a chart with a
                logarithmic scale. The two readings differ. Until a qualified reviewer reads it, or
                the report states the value, this claim can&rsquo;t be marked reviewed.
              </p>
            )}
          </section>
        ))}

        <KindBlock kind="documented" title="What the evidence supports">
          <p>{claim.supportedConclusion}</p>
        </KindBlock>
        <KindBlock kind="interpretation">
          <p>{claim.interpretation}</p>
        </KindBlock>
        <KindBlock kind="unresolved" title="What remains unknown">
          {claim.unknowns.length === 0 ? (
            <p>Nothing noted.</p>
          ) : (
            <ul className="list-disc pl-5">
              {claim.unknowns.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          )}
        </KindBlock>
        {claim.wouldChange.length > 0 && (
          <section aria-labelledby="change" className="rounded border border-line bg-card p-3">
            <h2 id="change" className="font-semibold">
              What would change this assessment
            </h2>
            <ul className="mt-1 list-disc pl-5">
              {claim.wouldChange.map((w) => (
                <li key={w.evidence}>
                  <span className="font-semibold">
                    Toward {w.toward === "support" ? "supported" : "contradicted"}:
                  </span>{" "}
                  {w.evidence}
                </li>
              ))}
            </ul>
          </section>
        )}
        <KindBlock kind="action" title="What action the evidence justifies">
          <p>{claim.actionJustified}</p>
          <p className="text-sm">
            <Link href={`/issues/${issue.id}/actions`}>See the action routes</Link>
          </p>
        </KindBlock>

        {claim.splitInto.length > 0 && (
          <section aria-labelledby="split">
            <h2 id="split" className="text-xl font-semibold">
              Split into separate propositions
            </h2>
            <p className="text-sm text-muted">
              Each is assessed on its own. Evidence for one doesn&rsquo;t carry over to the others.
            </p>
            <ul className="mt-2 space-y-2">
              {claim.splitInto.map((c) => (
                <li key={c.id}>
                  <StatusBadge status={c.status} />{" "}
                  <Link href={`/issues/${issue.id}/claims/${c.id}`}>{c.proposition}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {claim.related.length > 0 && (
          <section aria-labelledby="related">
            <h2 id="related" className="text-xl font-semibold">
              Related, but separate
            </h2>
            <ul className="mt-2 space-y-2">
              {claim.related.map((c) => (
                <li key={c.id}>
                  <StatusBadge status={c.status} />{" "}
                  <Link href={`/issues/${issue.id}/claims/${c.id}`}>{c.proposition}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {claim.scientificQuestions && (
          <section aria-labelledby="science">
            <h2 id="science" className="text-xl font-semibold">
              &ldquo;Is it safe?&rdquo;, asked properly
            </h2>
            <p className="text-sm text-muted">
              The questions a safety claim has to answer, and what the reviewed sources say to each.
              A blank is shown as a blank.
            </p>
            <dl className="mt-2 divide-y divide-line rounded border border-line bg-card">
              {claim.scientificQuestions.map((q) => (
                <div key={q.question} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr]">
                  <dt className="font-semibold">{q.question}</dt>
                  <dd>
                    <Pill tone={q.answered === "answered-by-source" ? "doc" : "open"}>
                      {q.answered === "answered-by-source"
                        ? "Answered by the sources"
                        : q.answered === "not-addressed"
                          ? "Not addressed"
                          : "Unclear: our reading"}
                    </Pill>
                    <p className="mt-1">{q.answer}</p>
                    {q.basis.length > 0 && (
                      <p className="text-sm">
                        {q.basis.map((b, i) => (
                          <span key={b.href}>
                            {i > 0 && " · "}
                            <Link href={b.href}>{b.sourceTitle.split(":")[0]}</Link>
                          </span>
                        ))}
                      </p>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-muted">
              A hazard found in an animal study is not a demonstrated risk at a given exposure, and
              a guideline or approval isn&rsquo;t proof of safety. This checklist shows what has and
              hasn&rsquo;t been looked at; it is not a scientific review.
            </p>
          </section>
        )}

        <section aria-labelledby="review" className="rounded border border-line bg-card p-3">
          <h2 id="review" className="font-semibold">
            Review
          </h2>
          <p className="mt-1">
            <ReviewBadge state={claim.reviewGate.state} />{" "}
            {REVIEW_INFO[claim.reviewGate.state].meaning}
          </p>
          {claim.reviewGate.blockers.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-sm" data-testid="review-blockers">
              {claim.reviewGate.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          <ul className="mt-2 text-sm">
            {claim.review.reviews.map((r) => (
              <li key={r.reviewer + r.date}>
                {formatDate(r.date)}: {r.reviewer} ({r.expertise}){r.note && `: ${r.note}`}
              </li>
            ))}
          </ul>
          {claim.review.corrections.length > 0 && (
            <>
              <h3 className="mt-2 font-semibold">Corrections</h3>
              <ul className="text-sm">
                {claim.review.corrections.map((c) => (
                  <li key={c.date + c.change}>
                    {formatDate(c.date)}: {c.change}{" "}
                    <span className="text-muted">Why: {c.reason}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-2 text-sm text-muted">
            Think this is wrong? In a real deployment, a dispute here opens a correction request
            that a different reviewer handles, and the outcome is logged above. In this prototype
            the button does nothing:{" "}
            <button type="button" disabled className="rounded border border-line px-2 text-muted">
              Dispute this assessment (not built)
            </button>
          </p>
        </section>
      </div>
    </div>
  );
}

function lower(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
