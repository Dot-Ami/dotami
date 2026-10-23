"use client";

import { useEffect, useState } from "react";

import { AboutThisJobRows } from "@/components/cockpit/about-this-job-panel";
import type { AboutJobView } from "@/lib/about-job/types";
import { pickWords } from "@/lib/front-door/words";

/**
 * *About this job*'s rows in place on step 3's no-road block (docs/ui-spec/futures/03-road-match.md, case B; K6 A:
 * shown by default for a job with no written road; task 28c), opened by the design's lead sentence, *Here is what
 * the government publishes about this job.* The same rows as the cockpit's panel (`AboutThisJobRows`), built on
 * DotAmi's own server for the answers on screen so far (`POST /api/jobs/about`, lib/about-job/view.ts), so the NOC
 * lines and the wage file stay out of the page's code. No Close (nothing to close back to) and no Change: the
 * region was answered one part back, and the nav's back link goes there.
 *
 * Nothing is kept: the answers travel in the request's body, never in an address, and nothing stores them. While
 * the rows are read the slot says so; if they can't be read it says that, never an empty slot and never anything
 * drawn in their place. The lead sentence shows only with the rows.
 */
export function AboutJobInPlace({
  job,
  province,
  area,
  region,
}: {
  job: { code: string; label: string };
  /** The person's province or territory ("AB"); null reads nothing. */
  province: string | null;
  area: string | null;
  region: string | null;
}) {
  const [read, setRead] = useState<{ key: string; view: AboutJobView | null } | null>(null);
  const key = JSON.stringify([job.code, province, area, region]);

  useEffect(() => {
    if (province === null) return;
    let cancelled = false;
    (async () => {
      let view: AboutJobView | null = null;
      try {
        const res = await fetch("/api/jobs/about", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job: job.code, province, area, region }),
        });
        if (res.ok) view = ((await res.json()) as { aboutJob?: AboutJobView | null }).aboutJob ?? null;
      } catch {
        view = null;
      }
      if (!cancelled) setRead({ key, view });
    })();
    return () => {
      cancelled = true;
    };
  }, [key, job.code, province, area, region]);

  const current = read?.key === key ? read : null;
  return (
    <div data-about-this-job-slot={job.code} className="space-y-2">
      {current === null ? (
        <p role="status" className="text-body text-stone">
          {pickWords.noRoad.aboutJobReading(job.label)}
        </p>
      ) : current.view === null ? (
        <p role="alert" className="text-body text-amber">
          {pickWords.noRoad.aboutJobFailed(job.label)}
        </p>
      ) : (
        <>
          <p className="text-body text-paper">{pickWords.noRoad.governmentLead}</p>
          <div className="text-body leading-snug" data-about-this-job={current.view.job.code}>
            <AboutThisJobRows view={current.view} />
          </div>
        </>
      )}
    </div>
  );
}
