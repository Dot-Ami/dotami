"use client";

import { gaugeView, type GaugeId } from "@/lib/cockpit/view";
import { cockpitWords as words } from "@/lib/cockpit/words";
import type { Road } from "@/lib/engines/roads/v2026";
import type { RoadEvaluation } from "@/lib/roads";

/**
 * The top of the cockpit (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built"): the
 * person's own first sentence, word for word and dated; their yearly target only when they agreed to
 * one, labelled theirs; the future by its road's name; and four gauges from road evaluation, each tagged
 * with where its numbers come from. Counts and sums only: no gauge says whether a number is enough.
 * Clicking a gauge opens its overlay and its list.
 */

const GAUGES: GaugeId[] = ["steps", "skills", "money", "date"];

export function GoalBar({
  road,
  evaluation,
  firstWords,
  target,
  active,
  onGauge,
}: {
  road: Road;
  evaluation: RoadEvaluation;
  /** The sentence typed on the front door for this idea, as kept: word for word, with its day. */
  firstWords: { text: string; saidAt: string } | null;
  /** The yearly income the person agreed to, with the day agreed; null when there is none. */
  target: { amountCents: number; agreedOn: string } | null;
  active: GaugeId | null;
  onGauge: (gauge: GaugeId) => void;
}) {
  const view = gaugeView(evaluation, road);
  return (
    <section aria-label={words.goal.region} className="grid gap-2.5 border-b border-rule bg-ink2 px-5 py-3">
      {firstWords ? (
        <p className="font-serif text-[17px] italic leading-snug text-paper">“{firstWords.text}”</p>
      ) : null}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-stone">
        {firstWords ? <span>{words.goal.yourWords(firstWords.saidAt)}</span> : null}
        {target ? <span>{words.goal.target(target.amountCents, target.agreedOn)}</span> : null}
        <span>{words.goal.future(road.label)}</span>
      </p>
      {/* Four across at any width: on a narrow window the row scrolls sideways rather than stacking, so
          the bar stays one row tall and the map keeps its room (phone width is its own next piece of work). */}
      <div className="grid auto-cols-[minmax(190px,1fr)] grid-flow-col gap-2.5 overflow-x-auto">
        {GAUGES.map((id) => {
          const gauge = view[id];
          const label = words.gauges[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active === id}
              onClick={() => onGauge(id)}
              className={`grid content-start gap-0.5 rounded-md border bg-ink px-3 py-2 text-left transition hover:border-spruce-line ${
                active === id ? "border-maple" : "border-rule"
              }`}
            >
              <span className="flex justify-between gap-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-stone">
                {label.label}
                <span className="normal-case tracking-normal text-stone-dim">{label.tag}</span>
              </span>
              <span className="text-[13px] tabular-nums text-paper">{gauge.value}</span>
              {gauge.lines.map((line) => (
                <span key={line} className="text-[11px] text-stone">
                  {line}
                </span>
              ))}
              {gauge.invite ? <span className="text-[11px] text-amber">{gauge.invite}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
