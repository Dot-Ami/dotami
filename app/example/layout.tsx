import type { ReactNode } from "react";

/**
 * The invented example future's pages (docs/ui-spec/example/_index.md). Outside app/(journey)/ on purpose:
 * that layout's journey provider holds the person's journey and removes what an older DotAmi left in the
 * window's storage, and the example must touch neither: no browser storage at all, and none of the person's
 * journey. The page brings its own read-only journey; the person's is held in the window's memory meanwhile
 * (lib/journey/held-journey.ts), so it is there again on the way back.
 */
export default function ExampleLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[calc(100vh-2.5rem)] bg-ink text-paper font-sans text-body leading-snug antialiased">{children}</div>;
}
