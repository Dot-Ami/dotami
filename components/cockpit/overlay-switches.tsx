"use client";

import type { Overlays } from "@/lib/cockpit/view";
import { cockpitWords as words } from "@/lib/cockpit/words";

/**
 * The row of overlay switches over the map (docs/architecture/future-cockpit.md § 2): Road is always on;
 * Skills, Money and Rules & tax switch their layer on the road, each with its count for the whole road.
 */
export function OverlaySwitches({
  overlays,
  counts,
  onToggle,
}: {
  overlays: Overlays;
  counts: { skillsListed: number; costLines: number; rulesCards: number };
  onToggle: (overlay: keyof Overlays) => void;
}) {
  const switches: { id: keyof Overlays; label: string; count: string }[] = [
    { id: "skills", label: words.road.skills, count: words.road.skillsCount(counts.skillsListed) },
    { id: "money", label: words.road.money, count: words.road.moneyCount(counts.costLines) },
    { id: "rules", label: words.road.rules, count: words.road.rulesCount(counts.rulesCards) },
  ];
  return (
    // data-region: one of the cockpit's regions the clutter limit counts (docs/ui-spec/README.md).
    <div data-region="overlays" role="group" aria-label={words.road.overlays} className="flex flex-wrap items-center gap-1.5 border-b border-rule bg-ink3 px-5 py-2 text-[11px] text-stone">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]">{words.road.overlays}</span>
      <span className="rounded-full border border-rule px-2.5 py-0.5 text-paper-dim">
        {words.road.road} <span className="text-stone-dim">· {words.road.alwaysOn}</span>
      </span>
      {switches.map(({ id, label, count }) => (
        <button
          key={id}
          type="button"
          aria-pressed={overlays[id]}
          onClick={() => onToggle(id)}
          className={`rounded-full border px-2.5 py-0.5 ${overlays[id] ? "border-maple bg-[#2a1a15] text-paper" : "border-rule text-paper-dim hover:border-spruce-line"}`}
        >
          {label}
          <span className="ml-1 text-stone-dim">· {count}</span>
        </button>
      ))}
    </div>
  );
}
