import { structureLadderV2026 } from "@/lib/engines/structure/v2026";
import type { StructureStepId } from "@/lib/engines/structure/v2026";

interface StructureLadderRailProps {
  /** null = the person has not set a structure yet (S2.5.4d) — no rung is "Current" or "Passed". */
  activeStepId: StructureStepId | null;
}

export function StructureLadderRail({ activeStepId }: StructureLadderRailProps) {
  const activeIndex =
    activeStepId === null ? -1 : structureLadderV2026.findIndex((step) => step.id === activeStepId);

  return (
    <section className="border-t border-rule-soft pt-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
        Structure ladder
      </p>
      <p className="mt-1 text-[10px] leading-snug text-stone-dim">
        Entity progression — Canada, the first jurisdiction mapped. Prep orientation, not filing advice.
      </p>
      {activeStepId === null ? (
        <p className="mt-1 text-[10px] leading-snug text-amber">
          No rung marked — set your structure above and the ladder places you.
        </p>
      ) : null}
      <ol className="mt-3 space-y-0">
        {structureLadderV2026.map((step, index) => {
          const isActive = step.id === activeStepId;
          const isPast = activeIndex >= 0 && index < activeIndex;
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
                className={`font-mono text-[9px] uppercase tracking-wider ${
                  isActive ? "text-maple" : isPast ? "text-sage" : "text-stone-dim"
                }`}
              >
                {isActive ? "Current" : isPast ? "Passed" : activeStepId === null ? "" : "Ahead"}
              </p>
              <p className={`text-xs font-semibold ${isActive ? "text-paper" : "text-stone"}`}>
                {step.label}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-stone-dim">{step.trigger}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
