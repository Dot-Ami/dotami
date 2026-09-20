import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type PillVariant =
  | "maple"
  | "ghost"
  | "elev"
  | "amber-out"
  | "spruce-out"
  | "maple-out";

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillVariant;
  size?: "default" | "small";
  asChild?: boolean;
  children: ReactNode;
}

const variantClasses: Record<PillVariant, string> = {
  maple: "bg-maple text-[#fff8ee] border-maple",
  ghost: "bg-transparent text-paper border-rule",
  elev: "bg-ink3 text-paper border-rule",
  "amber-out": "border-amber text-amber bg-transparent",
  "spruce-out": "border-spruce-line text-[#9bb9bd] bg-transparent",
  "maple-out": "border-maple text-maple bg-transparent",
};

export function Pill({
  variant = "ghost",
  size = "default",
  className,
  children,
  type = "button",
  ...props
}: PillProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium tracking-wide cursor-pointer transition",
        size === "small" ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-xs",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
