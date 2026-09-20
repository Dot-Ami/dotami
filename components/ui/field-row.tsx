import { cn } from "@/lib/utils/cn";

interface FieldRowProps {
  label: string;
  value: string;
  className?: string;
}

export function FieldRow({ label, value, className }: FieldRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-rule-soft py-2 text-xs",
        className,
      )}
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">
        {label}
      </span>
      <span className="font-mono text-xs capitalize text-paper">{value}</span>
    </div>
  );
}
