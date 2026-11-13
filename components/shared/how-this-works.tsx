import type { ReactNode } from "react";

import { howThisWorksWords as words } from "@/lib/front-door/words";

/**
 * The one fold under a question (the maintainer's pick w1 C of 2026-11-11, story S2.5.52): every note around the
 * question (how the screen works, what is kept, where its facts come from) waits here, closed until the person
 * opens it. *Learn more* at its foot opens the official page the screen's facts come from, in the person's own
 * browser, where the screen has one; the link carries nothing about the person.
 *
 * A native fold (`<details>`), like the step panel's (components/node-detail-panel.tsx, Fold): it opens with Enter
 * or Space, a screen reader says whether it is open, and the browser's find-in-page opens it to a match. It is not
 * remembered: it closes again when the screen is drawn afresh. Its one button is allowed by the maintainer's answer
 * of 2026-11-11 (e2e/budgets.ts, FOLD_ALLOWANCE). Text sizes are the screen's own (small and body), so the fold
 * adds none.
 *
 * `id` lets a control point at a note inside it with aria-describedby, which a screen reader reads even while the
 * fold is closed.
 */
export function HowThisWorks({
  children,
  learnMore,
  className = "",
}: {
  children: ReactNode;
  /** The official page behind the screen's facts, and what it is in words for its name; none where there is none. */
  learnMore?: { url: string; what: string };
  className?: string;
}) {
  return (
    <details data-how-this-works className={`group border-t border-rule-soft pt-3 ${className}`}>
      <summary className="cursor-pointer list-none font-mono text-small uppercase tracking-[0.14em] text-stone hover:text-paper">
        <span aria-hidden className="mr-1.5 inline-block transition group-open:rotate-90">
          ▸
        </span>
        {words.summary}
      </summary>
      <div className="mt-2 space-y-2 text-body leading-snug text-stone">
        {children}
        {learnMore ? (
          <p>
            <a
              href={learnMore.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={words.learnMoreName(learnMore.what)}
              className="border-b border-rule-soft text-paper hover:text-maple"
            >
              {words.learnMore}
            </a>
          </p>
        ) : null}
      </div>
    </details>
  );
}
