import Link from "next/link";
import type { ReactNode } from "react";

import { CopyPathButton } from "@/components/settings/copy-path-button";
import { GhostLink, WordMark } from "@/components/ui";
import type { FolderFacts, Holdings, SentFacts, SentState, TableCount } from "@/lib/privacy/holdings";
import type { WindowStorageEntry } from "@/lib/privacy/inventory";

import { FiguresBySource } from "./figures-by-source";
import { plural, sizeWords } from "./format";

/** Anthropic's own page on how long it keeps what is sent to its API — read 2026-10-06. */
const ANTHROPIC_RETENTION_URL =
  "https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data";

const SECTIONS = [
  { id: "figures", title: "Your figures, by source" },
  { id: "file", title: "Everything else in the data file" },
  { id: "computer", title: "On this computer, outside the data file" },
  { id: "leaves", title: "What leaves this computer" },
  { id: "removing", title: "Taking things out" },
] as const;

/**
 * [8d] "What DotAmi knows about you" — the read-only first slice. One page that lists everything
 * DotAmi keeps about the person, counted from the data file each time it opens (never a stored
 * claim), so the person can check DotAmi's word against the file itself.
 *
 * Every row is drawn from lib/privacy/inventory.ts, the list a test keeps complete: a new table
 * or browser-storage key can't merge without appearing here. This page changes nothing and has no
 * forget or delete control; docs/ui-spec/your-data/_index.md says what it deliberately leaves out.
 *
 * `holdings` is null when the data file couldn't be read: the page says so instead of failing.
 */
export function YourDataPage({ holdings }: { holdings: Holdings | null }) {
  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col bg-ink">
      <nav className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        <GhostLink href="/settings" tone="stone">
          ← Settings
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-stone">Your data</p>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-10">
        <header>
          <h1 className="font-serif text-[26px] font-bold leading-[1.15] tracking-tight text-paper">
            What DotAmi <span className="font-normal italic text-maple">knows about you</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-paper-dim">
            Everything DotAmi keeps, counted from your data file each time you open this page — not a saved
            summary. This page only shows what&apos;s there; it changes nothing.
          </p>
        </header>

        {holdings === null ? (
          <p role="alert" className="mt-8 rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-sm text-amber">
            DotAmi couldn&apos;t read its data file just now, so it can&apos;t list what is in it. Nothing was
            changed. Check that the file is where Settings says it is, then reload this page.
          </p>
        ) : (
          <>
            <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-xs text-stone underline decoration-rule underline-offset-4 hover:text-paper"
                >
                  {s.title}
                </a>
              ))}
            </nav>

            <div className="mt-8 space-y-10">
              <Section id="figures" title="Your figures, by source">
                <FiguresBySource figures={holdings.figures} />
              </Section>

              <Section id="file" title="Everything else in the data file">
                <p className="mt-0.5 text-[12px] text-stone">
                  Every table in the data file, with how many records it holds and what takes one out today.
                </p>
                <ul className="mt-3 space-y-3">
                  {holdings.tables.map((t) => (
                    <TableRow key={t.entry.model} table={t} ideasWithNotes={holdings.ideasWithNotes} />
                  ))}
                </ul>
              </Section>

              <Section id="computer" title="On this computer, outside the data file">
                <DataFileRow holdings={holdings} />
                <ul className="mt-3 space-y-3">
                  {holdings.folders.map((f) => (
                    <FolderRow key={f.entry.id} facts={f} desktop={holdings.desktop} />
                  ))}
                </ul>
                <h3 className="mt-5 font-semibold text-paper">In this window</h3>
                <p className="mt-0.5 max-w-2xl text-[12px] text-stone">
                  These live in the window, not in the data file, so this page can&apos;t see what is in them
                  right now. This is what DotAmi puts there and how long it stays.
                </p>
                <ul className="mt-3 space-y-3">
                  {holdings.windowStorage.map((w) => (
                    <WindowRow key={`${w.store}:${w.key}`} entry={w} />
                  ))}
                </ul>
                <p className="mt-4 max-w-2xl text-[12px] text-stone">
                  Anyone who can use this computer can read all of this. Disk encryption is what protects it if
                  the computer is lost; how to turn it on is under{" "}
                  <Link href="/settings#data" className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple">
                    Settings → Data and backups
                  </Link>
                  .
                </p>
              </Section>

              <Section id="leaves" title="What leaves this computer">
                <ul className="mt-3 space-y-3">
                  {holdings.sentElsewhere.map((s) => (
                    <SentRow key={s.entry.id} facts={s} />
                  ))}
                </ul>
                <p className="mt-4 max-w-2xl text-[12px] text-stone">
                  DotAmi has no server of its own and collects no usage data. More on what leaves, including from
                  the tools DotAmi is built with, is under{" "}
                  <Link href="/settings#privacy" className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple">
                    Settings → Privacy
                  </Link>
                  .
                </p>
              </Section>

              <Section id="removing" title="Taking things out">
                <div className="mt-3 max-w-2xl space-y-2 text-sm text-paper-dim">
                  <p>
                    This page can&apos;t remove anything. What you can do today: on an idea&apos;s card, retract
                    an agreed figure or discard a waiting one (it stops counting, and its amount stays in the file,
                    listed above), and unlink two ideas.
                  </p>
                  <p>
                    Nothing in DotAmi erases a figure, a statement or an idea yet. The only way to remove everything
                    is by hand: close DotAmi, delete the data file, its safety copies and the log, and any backup you
                    saved elsewhere. What the window stores (above) stays until its site data is cleared.
                  </p>
                </div>
              </Section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <h2 id={`${id}-title`} className="font-serif text-xl font-bold tracking-tight text-paper">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="break-all rounded bg-ink px-1.5 py-0.5 font-mono text-[12px] text-paper">{children}</code>;
}

/** What takes a record out, under the same words as the settings rows: a label, then the sentence. */
function Removal({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-[12px] text-paper-dim">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">What takes it out · </span>
      {children}
    </p>
  );
}

function TableRow({ table, ideasWithNotes }: { table: TableCount; ideasWithNotes: number }) {
  const { entry, count } = table;
  return (
    <li className="rounded-lg border border-rule bg-ink2 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold text-paper">{entry.name}</h3>
        <span className="font-mono text-[12px] text-paper">
          {count === 0 ? "None" : plural(count, "record")}
          {entry.model === "Venture" && count > 0 ? ` · ${ideasWithNotes} with your notes` : ""}
          {entry.model === "Figure" && count > 0 ? " · listed above" : ""}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-paper-dim">{entry.holds}</p>
      <Removal>{entry.removedBy}</Removal>
    </li>
  );
}

function DataFileRow({ holdings }: { holdings: Holdings }) {
  const { path, exists, bytes } = holdings.dataFile;
  return (
    <div className="mt-3 rounded-lg border border-spruce-line/60 bg-spruce/20 px-4 py-3">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-sage">The data file</p>
      {path ? (
        <div className="mt-1.5 space-y-1.5 text-sm text-paper">
          <p>
            Everything in the sections above is this one file{exists && bytes !== null ? ` (${sizeWords(bytes)})` : ""}
            {exists ? ":" : ", which isn't there yet:"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Code>{path}</Code>
            {exists ? <CopyPathButton path={path} /> : null}
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-paper">
          This copy&apos;s database setting doesn&apos;t point at a single file, so there is no file to show.
        </p>
      )}
    </div>
  );
}

function FolderRow({ facts, desktop }: { facts: FolderFacts; desktop: boolean }) {
  const { entry } = facts;
  let status: ReactNode;
  if (facts.path === null) {
    status = <p className="mt-2 text-[12px] text-stone">This copy has no data file, so there is no folder beside it.</p>;
  } else if (!facts.exists) {
    status = (
      <p className="mt-2 text-[12px] text-stone">
        {desktop
          ? "None yet."
          : "None here. This copy runs from source; the desktop app is what makes it."}
      </p>
    );
  } else if (!facts.readable) {
    status = (
      <p className="mt-2 text-[12px] text-amber">It is there, but DotAmi isn&apos;t allowed to look inside, so it can&apos;t say what&apos;s in it.</p>
    );
  } else {
    status = (
      <div className="mt-2 space-y-1.5 text-[12.5px] text-paper">
        <p>
          {facts.files !== null
            ? `${plural(facts.files, "file")}${facts.bytes !== null ? `, ${sizeWords(facts.bytes)} in all` : ""}`
            : facts.bytes !== null
              ? sizeWords(facts.bytes)
              : "Present"}
          {facts.newestOn ? ` · ${facts.files !== null ? "newest written" : "last written"} ${facts.newestOn}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Code>{facts.path}</Code>
          <CopyPathButton path={facts.path} />
        </div>
        <p className="text-[11.5px] text-stone-dim">DotAmi only counted the files and read their dates; it never opened them.</p>
      </div>
    );
  }
  return (
    <li className="rounded-lg border border-rule bg-ink2 px-4 py-3">
      <h3 className="font-semibold text-paper">{entry.name}</h3>
      <p className="mt-1 text-[12.5px] text-paper-dim">{entry.holds}</p>
      {status}
    </li>
  );
}

function WindowRow({ entry }: { entry: WindowStorageEntry }) {
  return (
    <li className="rounded-lg border border-rule bg-ink2 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="font-semibold text-paper">{entry.name}</h4>
        <span className="rounded border border-rule px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-stone">
          {entry.store === "localStorage" ? "Stays until cleared" : "Gone when the window closes"}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-paper-dim">{entry.holds}</p>
      <p className="mt-2 text-[12px] text-paper-dim">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">How long · </span>
        {entry.lasts}
      </p>
      <p className="mt-1 text-[11.5px] text-stone-dim">
        Stored under <Code>{entry.key}</Code>
      </p>
    </li>
  );
}

const SENT_STATE_WORDS: Record<SentState, string> = {
  active: "Happening in this copy",
  inactive: "Not happening in this copy",
  "on-your-action": "Only when you choose",
};

function SentRow({ facts }: { facts: SentFacts }) {
  const { entry } = facts;
  return (
    <li className="rounded-lg border border-rule bg-ink2 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold text-paper">{entry.name}</h3>
        <span
          className={
            facts.state === "active"
              ? "rounded border border-amber/40 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-amber"
              : "rounded border border-rule px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-stone"
          }
        >
          {SENT_STATE_WORDS[facts.state]}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-paper">{facts.detail}</p>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12px]">
        <dt className="font-mono text-[9.5px] uppercase leading-[18px] tracking-[0.14em] text-stone">When</dt>
        <dd className="text-paper-dim">{entry.when}</dd>
        <dt className="font-mono text-[9.5px] uppercase leading-[18px] tracking-[0.14em] text-stone">What</dt>
        <dd className="text-paper-dim">{entry.what}</dd>
        <dt className="font-mono text-[9.5px] uppercase leading-[18px] tracking-[0.14em] text-stone">Taking it back</dt>
        <dd className="text-paper-dim">{entry.canTakeBack}</dd>
      </dl>
      {entry.id === "intake-sentence" && facts.state === "active" ? (
        <p className="mt-2 text-[12px] text-stone">
          How long Anthropic keeps it:{" "}
          <a
            href={ANTHROPIC_RETENTION_URL}
            target="_blank"
            rel="noreferrer"
            className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple"
          >
            its own page on data retention
          </a>{" "}
          (read 2026-10-06; it says API inputs and outputs are deleted within 30 days, with exceptions).
        </p>
      ) : null}
    </li>
  );
}
