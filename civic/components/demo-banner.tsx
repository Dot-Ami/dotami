import { DEMO_CLOCK, DEMO_NOTICE } from "@/lib/demo/world";
import { formatDate } from "@/lib/dates";

/** On every page, above everything, and it can't be dismissed. */
export function DemoBanner() {
  return (
    <div
      role="note"
      aria-label="Demo data notice"
      data-testid="demo-banner"
      className="border-b-2 border-[var(--color-demo)] bg-[var(--color-demo-bg)] text-[var(--color-ink)]"
    >
      <p className="mx-auto max-w-5xl px-4 py-2 text-sm">
        <strong className="text-[var(--color-demo)]">DEMO: invented data.</strong> {DEMO_NOTICE} The
        demo runs on a fictional timeline; its &ldquo;today&rdquo; is {formatDate(DEMO_CLOCK)}.
      </p>
    </div>
  );
}
