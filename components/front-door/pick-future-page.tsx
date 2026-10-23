"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useJourney } from "@/components/shared/journey-provider";
import { GhostLink, WordMark } from "@/components/ui";
import { roadsV2026, type Road } from "@/lib/engines/roads/v2026";
import { listedRoads } from "@/lib/front-door/futures";
import { lookingForReceipt, provinceOfPlace } from "@/lib/front-door/receipts";
import { firstSaveForPickedFuture, scenarioForPickedFuture } from "@/lib/front-door/start-future";
import { back, backLabel, FIRST_STEP, type StepsState } from "@/lib/front-door/three-steps";
import { pickWords as words } from "@/lib/front-door/words";
import { withTheSteps, type StepAnswers } from "@/lib/journey/first-save";
import { saveScenario } from "@/lib/journey/save-scenario";

import { JobAndRoadSteps, type RoadJobNames } from "./job-and-road-steps";

/**
 * *Pick a future* (`/futures`; docs/ui-spec/futures/_index.md). Since 2026-10-22 it opens on the three steps
 * (components/front-door/job-and-road-steps.tsx): the job closest to the person's work, where they are, then the
 * futures it lists, the one written for their job first, in the order the catalog lists them, never ranked.
 * Picking one saves a new idea on that road in one request (the place answered, the name typed or the road's own,
 * the business / career / both answer, and the steps' answers, each kept with its moment) and opens the cockpit on
 * it. Nothing about the person is put in an address: the idea's id is the only thing there.
 *
 * `roadJobs` are the job groups each listed road is written for, with their titles, read on the server
 * (app/(journey)/futures/page.tsx), since the classification's file is too big for a page.
 */
export function PickFuturePage({ roadJobs }: { roadJobs: RoadJobNames }) {
  const router = useRouter();
  const { intake, setScenario, hydrated } = useJourney();
  const draft = intake.destination ?? {};
  // The steps' answers, in this page's memory only (never the window's storage): a reload starts again.
  const [steps, setSteps] = useState<StepsState>(FIRST_STEP);

  const place = draft.place;
  const province = place ? provinceOfPlace(place) : null;
  // The roads this page lists for the person's place (lib/front-door/futures.ts): outside Alberta, the federal
  // steps for any business in Canada too, first (task 28d).
  const listed = useMemo(() => listedRoads(roadsV2026, province), [province]);

  /** Saves the idea on `road` with the steps' answers, then opens the cockpit on it; false when nothing was saved. */
  async function lookInside(road: Road, answers: StepAnswers, name: string): Promise<boolean> {
    if (!place) return false;
    const scenario = scenarioForPickedFuture({ road, place, name }, crypto.randomUUID());
    // An unanswered question 2 is kept as no answer, never filled in.
    const saved = await saveScenario(scenario, withTheSteps(firstSaveForPickedFuture(road, draft.lookingFor ?? null), road.id, answers));
    if (!saved.ok || !saved.ventureId) return false;
    setScenario(scenario);
    router.push(`/cockpit?venture=${encodeURIComponent(saved.ventureId)}`);
    return true;
  }

  const previous = back(steps, province);
  const backClass = "border-b border-rule-soft pb-0.5 text-body text-stone transition hover:opacity-80";

  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col bg-ink">
      {/* data-region marks the blocks the clutter limit counts (docs/ui-spec/README.md, "The layout rule"). */}
      <nav data-region="nav" className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        {/* The one back link goes back one part of the steps; on the first, back to Your destination. */}
        {previous === null || !place ? (
          <GhostLink href="/start" tone="stone">
            {words.back}
          </GhostLink>
        ) : (
          <button type="button" onClick={() => setSteps(previous)} className={backClass}>
            {backLabel(steps, province, words.back)}
          </button>
        )}
        <WordMark />
        <p className="ml-auto font-mono text-small uppercase tracking-[0.14em] text-stone">{words.navLabel}</p>
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-8">
          {!hydrated ? null : !place ? (
            <>
              <header data-region="intro">
                <h1 className="font-serif text-display font-bold leading-[1.15] tracking-tight text-paper">{words.heading}</h1>
                <p className="mt-2 text-lead text-paper-dim">{words.order}</p>
              </header>
              <p data-region="no-place" className="rounded-lg border border-dashed border-rule p-6 text-lead text-stone">
                {words.noPlace}{" "}
                <Link href="/start" className="border-b border-rule-soft text-paper hover:text-maple">
                  {words.noPlaceLink}
                </Link>
              </p>
            </>
          ) : (
            <JobAndRoadSteps
              host="futures"
              state={steps}
              setState={setSteps}
              place={place}
              listed={listed}
              roadJobs={roadJobs}
              introExtra={draft.lookingFor ? <p className="mt-1 text-body text-stone">{lookingForReceipt(draft.lookingFor, listed)}</p> : null}
              onLookInside={lookInside}
            />
          )}
        </div>
      </main>
    </div>
  );
}
