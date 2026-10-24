import { cockpitWords } from "@/lib/cockpit/words";
import { structureLadderV2026 } from "@/lib/engines/structure/v2026";
import type { StructureStepId } from "@/lib/engines/structure/v2026";

/** The ladder's words (lib/cockpit/words.ts, since 2026-10-17; in plain words since 2026-10-23). */
const words = cockpitWords.rail.ladder;

interface StructureLadderRailProps {
  /** null = the person has not set a structure yet (S2.5.4d) — no rung is "Current" or "Passed". */
  activeStepId: StructureStepId | null;
}

/**
 * The ways a business can be set up, in the catalog's order, each in plain words (the catalog's own labels and
 * trigger lines are tax terms: "Holding company (Holdco)", "Estate freeze, succession, or income splitting").
 * The cockpit draws it only on the tax and structure roads (lib/engines/roads/v2026 `drawsTheStructureLadder`).
 */
export function StructureLadderRail({ activeStepId }: StructureLadderRailProps) {
  const activeIndex =
    activeStepId === null ? -1 : structureLadderV2026.findIndex((step) => step.id === activeStepId);

  return (
    <section className="border-t border-rule-soft pt-4">
      <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">{words.title}</p>
      <p className="mt-1 text-small leading-snug text-stone-dim">{words.note}</p>
      {activeStepId === null ? <p className="mt-1 text-small leading-snug text-amber">{words.noRung}</p> : null}
      <ol className="mt-3 space-y-0">
        {structureLadderV2026.map((step, index) => {
          const isActive = step.id === activeStepId;
          const isPast = activeIndex >= 0 && index < activeIndex;
          // A rung the words file doesn't name yet shows the catalog's label, never nothing.
          const plain = words.rungs[step.id] ?? { name: step.label, line: "" };
          return (
            <li
              key={step.id}
              className={`relative border-l-2 py-2 pl-3 ${
                isActive
                  ? "border-maple"
                  : isPast
                    ? "border-sage/50"
                    : "border-rule"
              }`}
            >
              <p
                className={`font-mono text-label uppercase tracking-wider ${
                  isActive ? "text-maple" : isPast ? "text-sage" : "text-stone-dim"
                }`}
              >
                {isActive ? words.current : isPast ? words.passed : activeStepId === null ? "" : words.ahead}
              </p>
              <p className={`text-body font-semibold ${isActive ? "text-paper" : "text-stone"}`}>{plain.name}</p>
              {plain.line ? <p className="mt-0.5 text-small leading-snug text-stone-dim">{plain.line}</p> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
