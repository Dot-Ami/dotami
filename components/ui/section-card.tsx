import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

type SectionBadge = "required" | "optional" | "done";

interface SectionCardProps {
  number: string;
  title: string;
  badge?: SectionBadge;
  children: ReactNode;
  className?: string;
}

const badgeClasses: Record<SectionBadge, string> = {
  required: "border-maple-soft bg-maple/10 text-maple",
  optional: "border-rule-soft bg-stone/10 text-stone",
  done: "border-sage/30 bg-sage/10 text-sage",
};

const badgeLabels: Record<SectionBadge, string> = {
  required: "Required",
  optional: "Optional",
  done: "✓ Done",
};

export function SectionCard({
  number,
  title,
  badge,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn("rounded-lg border border-rule bg-ink3", className)}>
      <div className="flex items-center gap-3 border-b border-rule-soft px-5 py-4">
        <span className="font-mono text-[11px] tracking-wide text-maple">{number}</span>
        <h3 className="flex-1 font-serif text-lg font-bold tracking-tight text-paper">{title}</h3>
        {badge ? (
          <span
            className={cn(
              "rounded px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] border",
              badgeClasses[badge],
            )}
          >
            {badgeLabels[badge]}
          </span>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
