"use client";

import { nextOnYourRoad } from "@/lib/cockpit/view";
import { cockpitWords as words } from "@/lib/cockpit/words";
import type { Road } from "@/lib/engines/roads/v2026";
import type { RoadEvaluation } from "@/lib/roads";

/**
 * "Next on your road" (docs/architecture/future-cockpit.md § 2): the next three steps on the person's path
 * that aren't marked done or not for me, in the order the road runs. The screen says that order is the
 * order steps happen, never importance. Clicking one opens it in the step panel.
 */
export function NextOnYourRoad({
  road,
  evaluation,
  onSelectStep,
}: {
  road: Road;
  evaluation: RoadEvaluation;
  onSelectStep: (stepId: string) => void;
}) {
  const next = nextOnYourRoad(evaluation);
  const label = (id: string) => road.steps.find((s) => s.id === id)?.label ?? id;
  return (
    <section aria-label={words.next.title} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule bg-ink2 px-5 py-2 text-[12px]">
      <h2 className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-stone">
        {words.next.title} <span className="normal-case tracking-normal text-stone-dim">· {words.next.note}</span>
      </h2>
      {next.length === 0 ? (
        <p className="text-stone">{words.next.none}</p>
      ) : (
        <ol className="flex flex-wrap gap-x-4 gap-y-1">
          {next.map((step, i) => (
            <li key={step.stepId}>
              <button type="button" onClick={() => onSelectStep(step.stepId)} className="text-paper-dim hover:text-paper hover:underline">
                {words.next.item(i + 1, label(step.stepId))}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
