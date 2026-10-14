"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";

import type { StoryPart } from "@/lib/examples/story";
import { cockpitWords as words } from "@/lib/cockpit/words";

/**
 * The cockpit drawn read-only for an invented example person (docs/ui-spec/example/_index.md; since
 * 2026-10-13): the banner that never folds, the line every panel shows where nothing can be kept, and the
 * example's story. The page itself is components/cockpit/cockpit-page.tsx, given `example`.
 */

/** Set (to the example's sentence) only while the cockpit draws an example; null on a person's own future. */
export const ExampleNoteContext = createContext<string | null>(null);

/**
 * The line a panel shows when nothing on it can be kept: on an example, that it is one; on a person's own
 * idea not saved yet, that it isn't saved.
 */
export function CantKeepNote({ className }: { className: string }) {
  const example = useContext(ExampleNoteContext);
  return <p className={className}>{example ?? words.panel.notSaved}</p>;
}

/** The note only an example shows, for a list that says nothing when a person's own idea isn't saved. */
export function ExampleOnlyNote({ className }: { className: string }) {
  const example = useContext(ExampleNoteContext);
  return example ? <p className={className}>{example}</p> : null;
}

/**
 * The banner over the whole cockpit: a row of its own, outside every region that folds. The status line
 * stays empty until a control that would save is used, then says the example keeps nothing (`notice` is a
 * counter so the same sentence is read out again on each click).
 */
export function ExampleBanner({ person, notice }: { person: string; notice: number }) {
  return (
    <section
      aria-label={words.example.region}
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-amber/50 bg-amber/10 px-4 py-2 text-[12px] md:px-[22px]"
    >
      <p className="font-semibold text-amber">{words.example.banner}</p>
      <p className="text-paper-dim">
        {words.example.whose(person)} {words.example.youMeans(person)}
      </p>
      <p role="status" className="text-amber">
        {/* The key makes a repeated click a new announcement, not the same text left in place. */}
        {notice > 0 ? <span key={notice}>{words.example.cantKeep}</span> : null}
      </p>
      <Link
        href="/start"
        className="ml-auto inline-flex items-center rounded-full border border-maple bg-maple px-3 py-1 text-[11.5px] font-medium text-[#fff8ee]"
      >
        {words.example.startOwn}
      </Link>
    </section>
  );
}

/**
 * The page around the cockpit on an example (2026-10-14, after review): the banner above the cockpit's
 * own grid, never inside it, so it can stay at the top of the window. On a phone the page itself scrolls,
 * and a sticky row inside a grid only sticks within its own grid row; here it sticks for the whole page.
 * Its height, measured as it wraps, is `--example-banner-h`, which the phone sheets and the tablet drawer
 * start below (cockpit-page.tsx), so no sheet is ever drawn over it. A person's own future has no frame:
 * `person` null gives back the cockpit as it was.
 */
export function ExampleFrame({
  person,
  notice,
  inert,
  children,
}: {
  person: string | null;
  notice: number;
  /** While a sheet covers the page on a phone, the banner stays in sight but can't be reached. */
  inert: boolean;
  children: ReactNode;
}) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const measure = () => setHeight(el.getBoundingClientRect().height);
    measure();
    // The banner wraps to more lines on a narrow window, and its status line appears after a click.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [person]);

  if (person === null) return <>{children}</>;
  return (
    <div
      style={{ "--example-banner-h": `${height}px` } as CSSProperties}
      className="flex h-[calc(100vh-2.5rem)] flex-col max-md:block max-md:h-auto"
    >
      {/* bg-ink under the banner's see-through amber, so the page scrolling beneath never shows through. */}
      <div ref={bannerRef} inert={inert} className="sticky top-0 z-50 shrink-0 bg-ink">
        <ExampleBanner person={person} notice={notice} />
      </div>
      {children}
    </div>
  );
}

/** What the example person did, each part with the lines road evaluation gives for it. */
export function ExampleStory({ person, parts }: { person: string; parts: readonly StoryPart[] }) {
  return (
    <section aria-label={words.example.story.region(person)} className="flex flex-col gap-2">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">{words.example.story.region(person)}</h2>
      <p className="text-[10.5px] leading-snug text-stone-dim">{words.example.story.note}</p>
      {/* The lines are the receipts every person's own cockpit gives, "you" and all: said once who that is. */}
      <p className="text-[10.5px] leading-snug text-amber">{words.example.youMeans(person)}</p>
      <ul className="space-y-2">
        {parts.map((part) => (
          <li key={part.id} className="rounded-sm border border-rule-soft bg-ink2 p-2">
            <p className="text-[11.5px] font-semibold text-paper">{words.example.story.parts[part.id](person)}</p>
            <ul className="mt-1 space-y-0.5">
              {part.lines.map((line) => (
                <li key={line} className="text-[11px] leading-snug text-paper-dim">
                  {line}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
