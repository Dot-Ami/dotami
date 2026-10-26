import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Pill, StatusBadge } from "@/components/badges";
import { ExtractionTable, FigureChart } from "@/components/figure-chart";
import { formatDate } from "@/lib/dates";
import { STATEMENT_TYPE_LABEL, locatorText } from "@/lib/locator";
import { getSource, source as rawSource } from "@/lib/query";
import { archiveMatches, canonicalText, sha256Hex } from "@/lib/rules/integrity";

type Props = { params: Promise<{ sourceId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = getSource((await params).sourceId);
  return { title: doc ? `Source: ${doc.title}` : "Source not found" };
}

export default async function SourcePage({ params }: Props) {
  const doc = getSource((await params).sourceId);
  if (!doc) notFound();
  const raw = rawSource(doc.id)!;
  const matches = archiveMatches(raw);
  const computed = sha256Hex(canonicalText(raw));

  return (
    <article>
      <p className="text-sm text-muted">Source document · invented for the demo</p>
      <h1 className="mt-1 text-2xl font-semibold">{doc.title}</h1>

      <dl className="mt-4 grid gap-x-4 gap-y-1 rounded border border-line bg-card p-4 text-sm sm:grid-cols-[11rem_1fr]">
        <dt className="text-muted">Kind</dt>
        <dd>{doc.kind.replace(/-/g, " ")}</dd>
        <dt className="text-muted">Publisher</dt>
        <dd>{doc.publisher}</dd>
        {doc.commissionedBy && (
          <>
            <dt className="text-muted">Commissioned by</dt>
            <dd>{doc.commissionedBy}</dd>
          </>
        )}
        <dt className="text-muted">Published</dt>
        <dd>{formatDate(doc.publishedOn)}</dd>
        <dt className="text-muted">Retrieved</dt>
        <dd>{formatDate(doc.retrievedOn)}</dd>
        <dt className="text-muted">Original address</dt>
        <dd>
          <code className="break-all">{doc.originalUrl}</code>{" "}
          <span className="text-muted">(a demo address: there is no real page)</span>
        </dd>
        <dt className="text-muted">Archived copy</dt>
        <dd>
          Captured {formatDate(doc.archive.archivedOn)}. SHA-256{" "}
          <code className="break-all">{doc.archive.sha256}</code>
          <span className="mt-1 block" data-testid="hash-check" data-matches={matches}>
            {matches ? (
              <Pill tone="act">✓ The text below matches the archived copy</Pill>
            ) : (
              <Pill tone="warn">
                ✕ The text below does NOT match the archived copy (now {computed.slice(0, 12)}…)
              </Pill>
            )}
          </span>
        </dd>
        <dt className="text-muted">Versions</dt>
        <dd>
          <ul>
            {doc.versions.map((v) => (
              <li key={v.version}>
                {v.version} ({formatDate(v.date)}){v.note && `: ${v.note}`}
              </li>
            ))}
          </ul>
        </dd>
        {doc.derivedFrom && (
          <>
            <dt className="text-muted">Based on</dt>
            <dd>
              <Link href={`/sources/${doc.derivedFrom.id}`}>{doc.derivedFrom.title}</Link>. Repeats
              of it are not separate evidence.
            </dd>
          </>
        )}
      </dl>

      <section aria-labelledby="passages" className="mt-6">
        <h2 id="passages" className="text-xl font-semibold">
          Passages
        </h2>
        <p className="text-sm text-muted">
          The source&rsquo;s own words. Every quotation in the prototype links to one of these.
        </p>
        <ol className="mt-3 space-y-3">
          {doc.passages.map((p) => (
            <li
              key={p.id}
              id={p.id}
              className="rounded border border-line bg-card p-3"
              data-passage-anchor={p.id}
            >
              <p className="text-xs text-muted">
                {locatorText(p.locator)}
                {p.statementType && ` · ${STATEMENT_TYPE_LABEL[p.statementType]}`}
                {p.speaker &&
                  ` · Speaker: ${p.speaker.label} (${p.speaker.identification.replace(/-/g, " ")})`}
              </p>
              <p className="mt-1">{p.text}</p>
              {p.speaker?.note && (
                <p className="mt-1 text-xs text-muted">Transcription note: {p.speaker.note}</p>
              )}
              {p.repeatsPassage && (
                <p className="mt-1 text-sm">
                  <Pill tone="open">Repeats another passage</Pill>{" "}
                  <Link href={p.repeatsPassage.href}>{p.repeatsPassage.sourceTitle}</Link>
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {raw.figures?.map((f) => (
        <section key={f.id} aria-labelledby={`f-${f.id}`} className="mt-6">
          <h2 id={`f-${f.id}`} className="text-xl font-semibold">
            {locatorText(raw.passages.find((p) => p.id === f.captionPassageId)!.locator)}
          </h2>
          <div className="mt-2">
            <FigureChart figure={f} />
            <ExtractionTable figure={f} />
          </div>
        </section>
      ))}

      {doc.kind === "video-transcript" && (
        <p className="mt-6 rounded border border-open bg-open-bg p-3 text-sm">
          Transcripts can be wrong, and a short clip can change what words mean. Each passage above
          gives its timestamps so it can be checked against the full recording, and says how the
          speaker was identified.
        </p>
      )}

      <section aria-labelledby="cited" className="mt-6">
        <h2 id="cited" className="text-xl font-semibold">
          Claims that cite this source
        </h2>
        <ul className="mt-2 space-y-2">
          {doc.citedBy.map((c) => (
            <li key={c.id}>
              <StatusBadge status={c.status} />{" "}
              <Link href={`/issues/${c.issueId}/claims/${c.id}`}>{c.proposition}</Link>
            </li>
          ))}
          {doc.citedBy.length === 0 && (
            <li className="text-muted">None: used for a process, a date or a relationship.</li>
          )}
        </ul>
      </section>
    </article>
  );
}
