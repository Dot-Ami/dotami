import type { ReactNode } from "react";

import { GhostLink, WordMark } from "@/components/ui";
import type { NoticeEntry, NoticeKind, Notices } from "@/lib/licences/notices";
import { licencesWords as words } from "@/lib/licences/words";

const LICENSE_URL = "https://github.com/Dot-Ami/dotami/blob/main/LICENSE";

/** The page's sections, in order: one per kind of entry the notices file has. */
const SECTIONS: readonly { kind: NoticeKind; id: string; title: string; blurb: string }[] = [
  { kind: "runtime", id: "runtime", ...words.sections.runtime },
  { kind: "package", id: "packages", ...words.sections.packages },
  { kind: "inside", id: "inside", ...words.sections.inside },
  { kind: "font", id: "fonts", ...words.sections.fonts },
  { kind: "data", id: "data", ...words.sections.data },
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
          {words.back}
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-small uppercase tracking-[0.14em] text-stone">{words.name}</p>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-10">
        <header>
          <h1 className="font-serif text-display font-bold leading-[1.15] tracking-tight text-paper">
            {words.heading.lead} <span className="font-normal italic text-maple">{words.heading.rest}</span>
          </h1>
          <p className="mt-2 max-w-xl text-lead text-paper-dim">
            {words.intro.before}{" "}
            <a href={LICENSE_URL} target="_blank" rel="noreferrer" className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple">
              {words.intro.link}
            </a>
            {words.intro.after}
          </p>
        </header>

        {notices === "missing" ? (
          <Alert>
            {words.missing.notBuilt} <Code>{words.missing.build}</Code> {words.missing.or} <Code>{words.missing.notices}</Code>
            {words.missing.writesIt}
          </Alert>
        ) : notices === "unreadable" ? (
          <Alert>
            {words.unreadable.before} <Code>{words.file}</Code> {words.unreadable.after}
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
      <p className="mt-4 text-body text-stone">
        {notices.entries.length} {words.listed.entries} <Code>{words.file}</Code>
        {words.listed.written}
        {notices.header.split("\n")[1] ?? words.listed.noBuildLine}).
      </p>
      <nav aria-label={words.sectionsNav} className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-body text-stone underline decoration-rule underline-offset-4 hover:text-paper">
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
            <p className="mt-0.5 text-body text-stone">{s.blurb}</p>
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
          <span className="font-mono text-body text-stone">{entry.version}</span>
          <span className="ml-auto rounded-sm border border-rule px-1.5 py-0.5 font-mono text-small tracking-wide text-paper-dim">
            {entry.licence}
          </span>
        </summary>
        <div className="border-t border-rule-soft px-4 py-3">
          <ul className="space-y-0.5 text-body text-paper-dim">
            {entry.shipsIn.map((s) => (
              <li key={s}>{words.shipsIn(s)}</li>
            ))}
          </ul>
          {entry.note ? <p className="mt-2 text-body text-amber">{entry.note}</p> : null}
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded border border-rule-soft bg-ink px-3 py-2 font-mono text-body leading-relaxed text-paper-dim">
            {entry.text}
          </pre>
        </div>
      </details>
    </li>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-8 rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-lead text-amber">
      {children}
    </p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="break-all rounded-sm bg-ink2 px-1.5 py-0.5 font-mono text-body text-paper">{children}</code>;
}
