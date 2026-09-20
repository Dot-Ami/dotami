import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

interface CapsProps {
  children: ReactNode;
  className?: string;
}

export function Caps({ children, className }: CapsProps) {
  return (
    <span
      className={cn(
        "font-mono text-[10.5px] uppercase tracking-[0.14em]",
        className,
      )}
    >
      {children}
    </span>
  );
}
