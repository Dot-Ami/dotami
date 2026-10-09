import type { ReactNode } from "react";

import { GhostLink, WordMark } from "@/components/ui";
import type { NoticeEntry, NoticeKind, Notices } from "@/lib/licences/notices";

const LICENSE_URL = "https://github.com/Dot-Ami/dotami/blob/main/LICENSE";

/** The page's sections, in order: one per kind of entry the notices file has. */
const SECTIONS: readonly { kind: NoticeKind; id: string; title: string; blurb: string }[] = [
  {
    kind: "runtime",
    id: "runtime",
    title: "The desktop app's runtime",
    blurb: "What the installed app runs on. Chromium's own notices are a separate file in the app's folder, named below.",
  },
  {
    kind: "package",
    id: "packages",
    title: "Packages",
    blurb: "Code written by others that DotAmi is built with and ships.",
  },
  {
    kind: "inside",
    id: "inside",
    title: "Copied inside other packages",
    blurb:
      "Code a package above carries inside itself (Next.js ships its own copies of these). Where that package includes no licence file for a copy, the entry says so.",
  },
  { kind: "font", id: "fonts", title: "Fonts", blurb: "The fonts the pages are set in." },
];

/**
 * /licences: the third-party notices DotAmi ships (THIRD-PARTY-NOTICES.txt, written when the app is
 * built by desktop/notices.mjs and read on the server by lib/licences/notices.ts). Reached from the
 * settings page (Updates) and, in the desktop app, from Help → Licences. Each entry opens to show
 * its licence word for word.
 *
 * `notices` is "missing" in a copy that was never built (`npm run dev`), and "unreadable" when the
 * file is there but not in the shape this page expects: the page says which, never an empty list.
 */
export function LicencesPage({ notices }: { notices: Notices | "missing" | "unreadable" }) {
  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col bg-ink">
      <nav className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        <GhostLink href="/settings" tone="stone">
          ← Settings
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-stone">Licences</p>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-10">
        <header>
          <h1 className="font-serif text-[26px] font-bold leading-[1.15] tracking-tight text-paper">
            Licences, <span className="font-normal italic text-maple">and who wrote what.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-paper-dim">
            DotAmi is open source under the{" "}
            <a href={LICENSE_URL} target="_blank" rel="noreferrer" className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple">
              Apache License 2.0
            </a>
            . It is built with work by many other people. Each piece that ships with this copy is listed below with its
            version and its licence; open one to read the licence word for word, as its authors wrote it.
          </p>
        </header>

        {notices === "missing" ? (
          <Alert>
            This copy of DotAmi hasn&apos;t been built, so the list hasn&apos;t been written yet. <Code>npm run build</Code>{" "}
            (or <Code>npm run notices</Code>) writes it; the installed app always has it.
          </Alert>
        ) : notices === "unreadable" ? (
          <Alert>
            DotAmi found its licence list but couldn&apos;t read it. The file is <Code>THIRD-PARTY-NOTICES.txt</Code> in the
            folder DotAmi&apos;s server runs from; it can be opened with any text editor.
          </Alert>
        ) : (
          <Listed notices={notices} />
        )}
      </main>
    </div>
  );
}

function Listed({ notices }: { notices: Notices }) {
  const sections = SECTIONS.map((s) => ({ ...s, entries: notices.entries.filter((e) => e.kind === s.kind) })).filter(
    (s) => s.entries.length > 0,
  );
  return (
    <>
      <p className="mt-4 text-[12px] text-stone">
        {notices.entries.length} entries, from <Code>THIRD-PARTY-NOTICES.txt</Code>, written when this copy was built (
        {notices.header.split("\n")[1] ?? "DotAmi"}).
      </p>
      <nav aria-label="On this page" className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-xs text-stone underline decoration-rule underline-offset-4 hover:text-paper">
            {s.title} ({s.entries.length})
          </a>
        ))}
      </nav>
      <div className="mt-8 space-y-10">
        {sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-6">
            <h2 id={`${s.id}-title`} className="font-serif text-xl font-bold tracking-tight text-paper">
              {s.title}
            </h2>
            <p className="mt-0.5 text-[12px] text-stone">{s.blurb}</p>
            <ul className="mt-3 space-y-2">
              {s.entries.map((e) => (
                <EntryRow key={`${e.name}@${e.version}`} entry={e} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

/** One entry: name, version and licence; opening it shows where it ships and its licence text. */
function EntryRow({ entry }: { entry: NoticeEntry }) {
  return (
    <li className="rounded-lg border border-rule bg-ink2">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5">
          <span className="font-semibold text-paper">{entry.name}</span>
          <span className="font-mono text-[11px] text-stone">{entry.version}</span>
          <span className="ml-auto rounded-sm border border-rule px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-paper-dim">
            {entry.licence}
          </span>
        </summary>
        <div className="border-t border-rule-soft px-4 py-3">
          <ul className="space-y-0.5 text-[12px] text-paper-dim">
            {entry.shipsIn.map((s) => (
              <li key={s}>Ships in {s}.</li>
            ))}
          </ul>
          {entry.note ? <p className="mt-2 text-[12px] text-amber">{entry.note}</p> : null}
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded border border-rule-soft bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-paper-dim">
            {entry.text}
          </pre>
        </div>
      </details>
    </li>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-8 rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-sm text-amber">
      {children}
    </p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="break-all rounded-sm bg-ink2 px-1.5 py-0.5 font-mono text-[12px] text-paper">{children}</code>;
}
