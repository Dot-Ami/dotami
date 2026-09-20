import { cn } from "@/lib/utils/cn";

interface OrDividerProps {
  children?: string;
  className?: string;
}

export function OrDivider({ children = "or describe it yourself", className }: OrDividerProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-[1320px] items-center gap-[18px] font-mono text-[10px] uppercase tracking-[0.14em] text-stone-dim",
        className,
      )}
    >
      <span className="h-px flex-1 bg-rule-soft" />
      {children}
      <span className="h-px flex-1 bg-rule-soft" />
    </div>
  );
}
