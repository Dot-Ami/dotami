"use client";

import type { ReactNode } from "react";

import { nextOnYourRoad } from "@/lib/cockpit/view";
import { cockpitWords as words } from "@/lib/cockpit/words";
import type { Road } from "@/lib/engines/roads/v2026";
import type { RoadEvaluation } from "@/lib/roads";
import type { Scenario } from "@/lib/scenarios/types";

/**
 * "Next on your road" (docs/architecture/future-cockpit.md § 2): the next three steps on the person's path
 * that aren't done or set aside, as each card's own chip shows it, in the order the road runs. The screen says that order is the
 * order steps happen, never importance. Clicking one opens it in the step panel.
 *
 * The calm first view (2026-10-17, S2.5.30c): the line is the foot of the road's column, still a region of its
 * own for the clutter limit, and it carried, after the steps, the buttons that show what folds under the map
 * (the legend and the what-if bar), where those were. Since 2026-10-20 those are in the goal bar's Look closer
 * menu (the maintainer's pick, so the screens stay within their clutter limits), and `after` holds only the
 * folded what-if bar's note while a what-if is on; from 1024 px it is drawn at the right of the title (below).
 */
export function NextOnYourRoad({
  road,
  evaluation,
  scenario,
  onSelectStep,
  after,
}: {
  road: Road;
  evaluation: RoadEvaluation;
  /** The idea, for the map's own chips (road 0's done and not-on-your-path cards). */
  scenario: Scenario;
  onSelectStep: (stepId: string) => void;
  /** Drawn at the end of the line: the folded what-if bar's note, while a what-if is on. */
  after?: ReactNode;
}) {
  const next = nextOnYourRoad(evaluation, scenario);
  const label = (id: string) => road.steps.find((s) => s.id === id)?.label ?? id;
  // From 1024 px the line is a grid: the title with `after` at its right, then the steps on a row of their
  // own, full width. In one wrapping row what came after the steps dropped to a line below them once three
  // long step names filled the width (Mara's example at 1280 x 720, where that line is under the first
  // window's edge; the type scale's review, 2026-10-19). The order in the page stays title, steps, `after`.
  // Below 1024 px it wraps as before.
  const toEnd = "lg:col-span-2 lg:row-start-2";
  return (
    // data-region: one of the cockpit's regions the clutter limit counts (docs/ui-spec/README.md).
    <section
      data-region="next-on-your-road"
      aria-label={words.next.title}
      className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule bg-ink2 px-5 py-2 text-body lg:grid lg:grid-cols-[minmax(0,1fr)_auto]"
    >
      <h2 className="font-mono text-label uppercase tracking-[0.12em] text-stone">
        {words.next.title} <span className="normal-case tracking-normal text-stone-dim">· {words.next.note}</span>
      </h2>
      {next.length === 0 ? (
        <p className={`text-stone ${toEnd}`}>{words.next.none}</p>
      ) : (
        <ol className={`flex flex-wrap gap-x-4 gap-y-1 ${toEnd}`}>
          {next.map((step, i) => (
            <li key={step.stepId}>
              <button type="button" onClick={() => onSelectStep(step.stepId)} className="text-paper-dim hover:text-paper hover:underline">
                {words.next.item(i + 1, label(step.stepId))}
              </button>
            </li>
          ))}
        </ol>
      )}
      {after ? <span className="ml-auto flex flex-wrap items-center gap-2 lg:col-start-2 lg:row-start-1">{after}</span> : null}
    </section>
  );
}
