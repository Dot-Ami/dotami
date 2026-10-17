"use client";

import { FoldButton } from "@/components/cockpit/folding";
import type { Overlays } from "@/lib/cockpit/view";
import { cockpitWords as words } from "@/lib/cockpit/words";

/** The extra switches' id, for their fold button's aria-controls. */
export const LAYERS_ID = "cockpit-more-layers";

/**
 * The row of overlay switches over the map (docs/architecture/future-cockpit.md § 2): Road is always on;
 * Skills, Money and Rules & tax switch their layer on the road, each with its count for the whole road.
 *
 * The calm first view (2026-10-17, S2.5.30c): the row is the top line of the road's own block, not a region
 * of its own. Given `layers`, the switches past Skills (Money, Rules & tax) fold behind "Show more layers",
 * folded on a first visit; a layer that is on keeps its switch in sight even then, so it can always be
 * switched off where it is. Given `roadAhead`, the row also carries the button that folds the road's later
 * columns back (folded, the folded column itself is the button that shows them).
 */
export function OverlaySwitches({
  overlays,
  counts,
  onToggle,
  layers,
  roadAhead,
}: {
  overlays: Overlays;
  counts: { skillsListed: number; costLines: number; rulesCards: number };
  onToggle: (overlay: keyof Overlays) => void;
  /** The extra layers' fold. Left out, every switch shows. */
  layers?: { folded: boolean; onToggle: () => void };
  /** Shown only while the road ahead is open: its fold button, and the ids of the columns it folds. */
  roadAhead?: { controls: string; onFold: () => void };
}) {
  const switches: { id: keyof Overlays; label: string; count: string }[] = [
    { id: "skills", label: words.road.skills, count: words.road.skillsCount(counts.skillsListed) },
    { id: "money", label: words.road.money, count: words.road.moneyCount(counts.costLines) },
    { id: "rules", label: words.road.rules, count: words.road.rulesCount(counts.rulesCards) },
  ];
  const folded = layers?.folded ?? false;
  const switchButton = ({ id, label, count }: (typeof switches)[number]) => (
    <button
      key={id}
      type="button"
      aria-pressed={overlays[id]}
      onClick={() => onToggle(id)}
      className={`rounded-full border px-2.5 py-0.5 max-md:min-h-8 ${overlays[id] ? "border-maple bg-[#2a1a15] text-paper" : "border-rule text-paper-dim hover:border-spruce-line"}`}
    >
      {label}
      <span className="ml-1 text-stone-dim">· {count}</span>
    </button>
  );
  return (
    <div role="group" aria-label={words.road.overlays} className="flex flex-wrap items-center gap-1.5 border-b border-rule bg-ink3 px-5 py-2 text-[11px] text-stone">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]">{words.road.overlays}</span>
      <span className="rounded-full border border-rule px-2.5 py-0.5 text-paper-dim">
        {words.road.road} <span className="text-stone-dim">· {words.road.alwaysOn}</span>
      </span>
      {switchButton(switches[0]!)}
      {/* The extra layers: folded, only one that is on stays in sight. */}
      <span id={LAYERS_ID} className="contents">
        {switches.slice(1).map((s) => (!folded || overlays[s.id] ? switchButton(s) : null))}
      </span>
      {layers ? (
        <FoldButton
          folded={folded}
          region="layers"
          label={folded ? words.folds.layers.show : words.folds.layers.fold}
          controls={LAYERS_ID}
          onClick={layers.onToggle}
        />
      ) : null}
      {roadAhead ? (
        <FoldButton folded={false} region="roadAhead" label={words.folds.roadAhead.fold} controls={roadAhead.controls} onClick={roadAhead.onFold} className="ml-auto" />
      ) : null}
    </div>
  );
}
