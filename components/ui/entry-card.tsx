import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import type { ReactNode } from "react";

interface EntryCardProps {
  href: string;
  symbol: string;
  title: string;
  body: string;
  cta: string;
  onClick?: () => void;
  className?: string;
}

export function EntryCard({
  href,
  symbol,
  title,
  body,
  cta,
  onClick,
  className,
}: EntryCardProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex min-h-[200px] flex-col rounded-[10px] border border-rule bg-ink3 p-6 transition hover:border-maple-soft",
        className,
      )}
    >
      <span className="font-serif text-[34px] leading-none text-maple">{symbol}</span>
      <h2 className="mt-[18px] font-serif text-[19px] font-bold tracking-tight text-paper">
        {title}
      </h2>
      <p className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-stone">{body}</p>
      <span className="mt-[18px] border-t border-rule-soft pt-3.5 text-xs tracking-wide text-maple group-hover:underline">
        {cta}
      </span>
    </Link>
  );
}

export function EntryCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:justify-center">
      {children}
    </div>
  );
}
