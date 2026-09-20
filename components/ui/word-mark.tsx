import { cn } from "@/lib/utils/cn";
import Link from "next/link";

interface WordMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-[22px]",
  lg: "text-2xl",
};

export function WordMark({ className, size = "md", href = "/" }: WordMarkProps) {
  const classes = cn(
    "font-serif italic font-normal text-maple tracking-tight no-underline transition hover:opacity-80",
    sizeClasses[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="DotAmi home">
        DotAmi
      </Link>
    );
  }

  return <span className={classes}>DotAmi</span>;
}
