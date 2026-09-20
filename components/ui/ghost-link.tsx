import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type GhostLinkTone = "paper" | "stone" | "maple";

interface GhostLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  tone?: GhostLinkTone;
}

const toneClasses: Record<GhostLinkTone, string> = {
  paper: "text-paper border-rule",
  stone: "text-stone border-rule-soft",
  maple: "text-maple border-maple-soft",
};

export function GhostLink({ tone = "paper", className, ...props }: GhostLinkProps) {
  return (
    <Link
      className={cn(
        "text-xs no-underline border-b pb-0.5 transition hover:opacity-80",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
