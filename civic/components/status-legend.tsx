import type { ClaimStatus } from "@/lib/model";
import { STATUS_INFO } from "@/lib/rules/status";

import { KindLabel, StatusBadge } from "./badges";

const ORDER: ClaimStatus[] = [
  "supported",
  "partially-supported",
  "contradicted",
  "unresolved",
  "insufficient-evidence",
];

export function StatusLegend() {
  return (
    <section aria-labelledby="legend" className="rounded border border-line bg-card p-4">
      <h2 id="legend" className="font-semibold">
        How to read a page
      </h2>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
        {ORDER.map((status) => (
          <div key={status}>
            <dt>
              <StatusBadge status={status} />
            </dt>
            <dd className="mt-0.5 text-muted">
              {STATUS_INFO[status].meaning} <em>Doesn&rsquo;t mean:</em>{" "}
              {STATUS_INFO[status].notMeaning}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex flex-wrap gap-2 text-sm">
        <KindLabel kind="documented" /> <KindLabel kind="interpretation" />{" "}
        <KindLabel kind="unresolved" />
        <KindLabel kind="action" /> <KindLabel kind="review" />
      </p>
      <p className="mt-1 text-sm text-muted">
        Each kind of content carries its own label. A quotation is always the source&rsquo;s own
        words, with a link to where they sit.
      </p>
    </section>
  );
}
