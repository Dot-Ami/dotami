"use client";

import { FoldButton } from "@/components/cockpit/folding";
import type { Overlays } from "@/lib/cockpit/view";
import { cockpitWords as words } from "@/lib/cockpit/words";

/**
 * The row of overlay switches over the map (docs/architecture/future-cockpit.md § 2): Road is always on;
 * Skills, Money and Rules & tax switch their layer on the road, each with its count for the whole road.
 *
 * The calm first view (2026-10-17, S2.5.30c): a first visit has only Road and Skills on, but every switch is
 * drawn, so each layer is one click away and a switch never leaves the page under the person's keyboard focus
 * (for a few hours that day Money and Rules & tax folded behind "Show more layers"; a review found both
 * problems). Given `roadAhead`, the row also carries the button that folds the road's later columns back
 * (folded, the folded column itself is the button that shows them).
 */
export function OverlaySwitches({
  overlays,
  counts,
  onToggle,
  roadAhead,
}: {
  overlays: Overlays;
  counts: { skillsListed: number; costLines: number; rulesCards: number };
  onToggle: (overlay: keyof Overlays) => void;
  /** Shown only while the road ahead is open: its fold button, and the ids of the columns it folds. */
  roadAhead?: { controls: string; onFold: () => void };
}) {
  const switches: { id: keyof Overlays; label: string; count: string; empty: boolean }[] = [
    { id: "skills", label: words.road.skills, count: words.road.skillsCount(counts.skillsListed), empty: counts.skillsListed === 0 },
    { id: "money", label: words.road.money, count: words.road.moneyCount(counts.costLines), empty: counts.costLines === 0 },
    { id: "rules", label: words.road.rules, count: words.road.rulesCount(counts.rulesCards), empty: counts.rulesCards === 0 },
  ];
  return (
    <div role="group" aria-label={words.road.overlays} className="flex flex-wrap items-center gap-1.5 border-b border-rule bg-ink3 px-5 py-2 text-[11px] text-stone">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]">{words.road.overlays}</span>
      <span className="rounded-full border border-rule px-2.5 py-0.5 text-paper-dim">
        {words.road.road} <span className="text-stone-dim">· {words.road.alwaysOn}</span>
      </span>
      {switches.map(({ id, label, count, empty }) => (
        // A layer with nothing on this road (road 1 has no rules and tax cards) can't light anything, so its
        // switch is drawn off and can't be pressed; its count says why. The answer kept for other roads is
        // left as it is.
        <button
          key={id}
          type="button"
          aria-pressed={overlays[id] && !empty}
          disabled={empty}
          onClick={() => onToggle(id)}
          className={`rounded-full border px-2.5 py-0.5 max-md:min-h-8 ${overlays[id] && !empty ? "border-maple bg-[#2a1a15] text-paper" : "border-rule text-paper-dim hover:border-spruce-line"} disabled:cursor-default disabled:hover:border-rule`}
        >
          {label}
          <span className="ml-1 text-stone-dim">· {count}</span>
        </button>
      ))}
      {roadAhead ? (
        <FoldButton folded={false} region="roadAhead" label={words.folds.roadAhead.fold} controls={roadAhead.controls} onClick={roadAhead.onFold} className="ml-auto" />
      ) : null}
    </div>
  );
}
