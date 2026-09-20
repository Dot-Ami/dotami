import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function SurfaceCard({ children, className, padding = "md" }: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-rule bg-ink3",
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
