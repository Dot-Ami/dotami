import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function Chip({ active, children, className, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 font-mono text-[10.5px] tracking-wide transition",
        active
          ? "border-maple-soft bg-maple/10 text-maple"
          : "border-rule text-stone hover:border-rule-soft",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
