import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

interface MonoTextProps {
  children: ReactNode;
  className?: string;
}

export function MonoText({ children, className }: MonoTextProps) {
  return (
    <span className={cn("font-mono tabular-nums", className)}>{children}</span>
  );
}
