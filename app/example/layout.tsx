import type { ReactNode } from "react";

/**
 * The invented example future's pages (docs/ui-spec/example/_index.md). Outside app/(journey)/ on purpose:
 * that layout's journey provider reads and writes the tab's journey in sessionStorage, and the example
 * must touch no browser storage at all. The page brings its own read-only journey.
 */
export default function ExampleLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[calc(100vh-2.5rem)] bg-ink text-paper font-sans text-body leading-snug antialiased">{children}</div>;
}
