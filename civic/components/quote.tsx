import Link from "next/link";

import { formatDate } from "@/lib/dates";
import { STATEMENT_TYPE_LABEL, locatorText } from "@/lib/locator";
import type { ResolvedPassage } from "@/lib/query";

/**
 * A passage, quoted from its source with where it sits and a link to it in place. The words come
 * from the source record, never from the page that shows them.
 */
export function Quote({
  passage,
  compact = false,
}: {
  passage: ResolvedPassage | null;
  compact?: boolean;
}) {
  if (!passage) {
    // Fails loudly rather than quietly showing nothing: an unresolvable link is a data bug.
    return (
      <p className="rounded border border-warn bg-warn-bg p-2 text-sm text-warn">
        Evidence link does not resolve.
      </p>
    );
  }
  return (
    <figure
      className="rounded border border-line bg-doc-bg/40 p-3"
      data-passage={`${passage.sourceId}#${passage.id}`}
    >
      <blockquote className={`border-l-4 border-doc pl-3 ${compact ? "text-sm" : ""}`}>
        <p>&ldquo;{passage.text}&rdquo;</p>
      </blockquote>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        {passage.speaker && (
          <span>
            Speaker: {passage.speaker.label}
            {passage.speaker.identification !== "named-in-record" &&
              ` (${passage.speaker.identification === "unknown" ? "not identified" : "identified by inference"})`}
            ·
          </span>
        )}
        {passage.statementType && <span>{STATEMENT_TYPE_LABEL[passage.statementType]} ·</span>}
        <span>
          {passage.publisher}, <cite className="not-italic">{passage.sourceTitle}</cite> (
          {formatDate(passage.publishedOn)}), {locatorText(passage.locator)}
        </span>
        <Link href={passage.href} className="font-medium">
          Open in source
        </Link>
      </figcaption>
    </figure>
  );
}
