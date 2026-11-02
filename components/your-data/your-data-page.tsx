import Link from "next/link";
import type { ReactNode } from "react";

import { CopyPathButton } from "@/components/settings/copy-path-button";
import { GhostLink, WordMark } from "@/components/ui";
import type { FolderFacts, Holdings, SentFacts, SentState, TableCount } from "@/lib/privacy/holdings";
import { recordRetentionV2026 } from "@/lib/engines/compliance/v2026";
import { databaseProtectionText } from "@/lib/db/protection";
import { BringBackReceipts } from "@/components/expenses/bring-back-receipts";
import { StartNewReceiptKey } from "@/components/expenses/start-new-key";
import { receiptProtectionText } from "@/lib/expenses/receipts/protection";
import { DELETE_MENU, NOT_CLEARED_BY_DELETE, SET_ASIDE_RECEIPTS_WARNING, type WindowStorageEntry } from "@/lib/privacy/inventory";
import { SAFETY_COPIES_KEY, SET_ASIDE_RECEIPTS_KEY } from "@/lib/privacy/kept-links";
import {
  anthropicRetentionQuotesToDraw,
  ANTHROPIC_RETENTION_CHECK,
  ANTHROPIC_RETENTION_URL,
} from "@/lib/privacy/anthropic-retention-official-words";
import { howCheckedWords, isCheckFirst, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import { PageQuotes } from "@/components/shared/page-quotes";
import { yourDataWords } from "@/lib/person/words";

import { DeleteMenu } from "./delete-menu";
import { FiguresBySource } from "./figures-by-source";
import { plural, sizeWords } from "./format";

const words = yourDataWords.page;
const { counted, itOrThem } = yourDataWords;

const SECTIONS = (["figures", "file", "computer", "leaves", "removing"] as const).map((id) => ({ id, title: words.sections[id] }));

/**
 * [8d] "What DotAmi knows about you". One page that lists everything
 * DotAmi keeps about the person, counted from the data file each time it opens (never a stored
 * claim), so the person can check DotAmi's word against the file itself.
 *
 * Every row is drawn from lib/privacy/inventory.ts, a list a test checks against the schema, the
 * package list and the code: a new table, a browser-storage key, a package that ships and that
 * DotAmi names itself (not the ones those pull in), or one of the kinds of request the test names
 * (fetch-style calls, WebRTC, node's net and child_process, electron's loaders, session lookups and
 * crash reporter, imports of the packages on its network list) fails that test until it is listed.
 * That is a safety net, not a proof. The test does not see a request a package makes inside its own
 * code, a package on neither of its lists, deliberate disguises, anything that makes the page load
 * an address, the folders it doesn't read, or what a program the app starts then does
 * (tests/helpers/source-scan.ts lists each). So this
 * page shows what the list says; GitHub's Dependency review check (known vulnerabilities and
 * licences only), the browser's Content-Security-Policy (connect-src, img-src, default-src,
 * form-action: not WebRTC or navigation) and code review cover the rest. The one control that
 * changes anything is Delete, in the last section (components/your-data/delete-menu.tsx); there is
 * no forget-a-source control yet. docs/ui-spec/your-data/_index.md says what it deliberately leaves out.
 *
 * `holdings` is null when the data file couldn't be read: the page says so instead of failing.
 */
export function YourDataPage({ holdings }: { holdings: Holdings | null }) {
  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col bg-ink">
      {/* data-region marks the blocks the clutter limit counts (docs/ui-spec/README.md, "The layout rule"). */}
      <nav data-region="nav" className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        <GhostLink href="/settings" tone="stone">
          {words.back}
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-small uppercase tracking-[0.14em] text-stone">{words.navLabel}</p>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-10">
        <header data-region="intro">
          <h1 className="font-serif text-display font-bold leading-[1.15] tracking-tight text-paper">
            {words.heading.start} <span className="font-normal italic text-maple">{words.heading.stress}</span>
          </h1>
          <p className="mt-2 max-w-xl text-lead text-paper-dim">{words.intro}</p>
        </header>

        {holdings === null ? (
          <p role="alert" className="mt-8 rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-lead text-amber">
            {words.unreadable}
          </p>
        ) : (
          <>
            <nav data-region="on-this-page" aria-label={words.onThisPage} className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-body text-stone underline decoration-rule underline-offset-4 hover:text-paper"
                >
                  {s.title}
                </a>
              ))}
            </nav>

            <div className="mt-8 space-y-10">
              <Section id="figures" title={words.sections.figures}>
                <FiguresBySource figures={holdings.figures} />
              </Section>

              <Section id="file" title={words.sections.file}>
                <p className="mt-0.5 text-body text-stone">{words.tables.lead}</p>
                <ul className="mt-3 space-y-3">
                  {holdings.tables.map((t) => (
                    <TableRow key={t.entry.model} table={t} ideasWithNotes={holdings.ideasWithNotes} />
                  ))}
                </ul>
              </Section>

              <Section id="computer" title={words.sections.computer}>
                <DataFileRow holdings={holdings} />
                <ul className="mt-3 space-y-3">
                  {holdings.folders.map((f) => (
                    <FolderRow
                      key={f.entry.id}
                      facts={f}
                      desktop={holdings.desktop}
                      receiptFiles={f.entry.id === "receipts" ? holdings.receiptFiles : null}
                      dataFileEncrypted={holdings.database.state === "on"}
                    />
                  ))}
                </ul>
                <h3 className="mt-5 font-semibold text-paper">{words.window.heading}</h3>
                <p className="mt-0.5 max-w-2xl text-body text-stone">{words.window.lead}</p>
                <ul className="mt-3 space-y-3">
                  {holdings.windowStorage.map((w) => (
                    <WindowRow key={`${w.store}:${w.key}`} entry={w} />
                  ))}
                </ul>
                <p className="mt-4 max-w-2xl text-body text-stone">
                  {words.protection.start}{" "}
                  <Link href="/settings#data" className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple">
                    {words.protection.link}
                  </Link>
                  {words.protection.end}
                </p>
              </Section>

              <Section id="leaves" title={words.sections.leaves}>
                <ul className="mt-3 space-y-3">
                  {holdings.sentElsewhere.map((s) => (
                    <SentRow key={s.entry.id} facts={s} />
                  ))}
                </ul>
                <p className="mt-4 max-w-2xl text-body text-stone">
                  {words.leaves.start}{" "}
                  <Link href="/settings#privacy" className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple">
                    {words.leaves.link}
                  </Link>
                  {words.leaves.end}
                </p>
              </Section>

              <Section id="removing" title={words.sections.removing}>
                <div className="mt-3 max-w-2xl space-y-2 text-lead text-paper-dim">
                  <p>{words.removing.onTheCard}</p>
                  <p>{words.removing.delete}</p>
                </div>
                <DeleteMenu
                  menu={DELETE_MENU}
                  counts={{
                    ...Object.fromEntries(holdings.tables.map((t) => [t.entry.model, t.count])),
                    // The safety-copies box counts files, under its folder's name, and the receipt
                    // folders set aside in that folder, which it clears too ([8i]).
                    [SAFETY_COPIES_KEY]: holdings.safetyCopies,
                    [SET_ASIDE_RECEIPTS_KEY]: holdings.setAsideReceiptFolders,
                  }}
                  keptCounts={holdings.keptLinks}
                  tableNames={{
                    ...Object.fromEntries(holdings.tables.map((t) => [t.entry.model, t.entry.name])),
                    [SAFETY_COPIES_KEY]: words.removing.safetyCopies,
                    [SET_ASIDE_RECEIPTS_KEY]: words.removing.setAsideFolders,
                  }}
                  notCleared={NOT_CLEARED_BY_DELETE}
                  retention={recordRetentionV2026}
                  desktop={holdings.desktop}
                  wipePending={holdings.wipePending}
                  setAsideWarning={SET_ASIDE_RECEIPTS_WARNING}
                />
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
    <section id={id} data-region={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
      <h2 id={`${id}-title`} className="font-serif text-xl font-bold tracking-tight text-paper">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="break-all rounded-sm bg-ink px-1.5 py-0.5 font-mono text-body text-paper">{children}</code>;
}

/** What takes a record out, under the same words as the settings rows: a label, then the sentence. */
function Removal({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-body text-paper-dim">
      <span className="font-mono text-label uppercase tracking-[0.14em] text-stone">{words.tables.removedBy}</span>
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
        <span className="font-mono text-body text-paper">
          {count === 0 ? words.tables.none : plural(count, counted.record)}
          {entry.model === "Venture" && count > 0 ? words.tables.withNotes(ideasWithNotes) : ""}
          {entry.model === "Figure" && count > 0 ? words.tables.listedAbove : ""}
        </span>
      </div>
      <p className="mt-1 text-body text-paper-dim">{entry.holds}</p>
      {/* A table that can hold something about other people says so, under the same kind of label. */}
      {entry.aboutOthers ? (
        <p className="mt-2 text-body text-paper-dim">
          <span className="font-mono text-label uppercase tracking-[0.14em] text-stone">{words.tables.aboutOthers}</span>
          {entry.aboutOthers}
        </p>
      ) : null}
      {/* Answers a spec names on lines of their own (Your ideas: your area and your economic region), each under
          its own name in the same small label style. */}
      {(entry.lines ?? []).map((line) => (
        <p key={line.name} className="mt-2 text-body text-paper-dim">
          <span className="font-mono text-label uppercase tracking-[0.14em] text-stone">{line.name} · </span>
          {line.holds}
        </p>
      ))}
      <Removal>{entry.removedBy}</Removal>
    </li>
  );
}

function DataFileRow({ holdings }: { holdings: Holdings }) {
  const { path, exists, bytes } = holdings.dataFile;
  return (
    <div className="mt-3 rounded-lg border border-spruce-line/60 bg-spruce/20 px-4 py-3">
      <p className="font-mono text-label uppercase tracking-[0.14em] text-sage">{words.dataFile.label}</p>
      {path ? (
        <div className="mt-1.5 space-y-1.5 text-lead text-paper">
          <p>
            {words.dataFile.isThisFile}
            {exists && bytes !== null ? ` (${sizeWords(bytes)})` : ""}
            {exists ? ":" : words.dataFile.notThereYet}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Code>{path}</Code>
            {exists ? <CopyPathButton path={path} /> : null}
          </div>
          <DatabaseProtection database={holdings.database} />
        </div>
      ) : (
        <p className="mt-1.5 text-lead text-paper">{words.dataFile.noSingleFile}</p>
      )}
    </div>
  );
}

/** [8i] Whether the data file is encrypted, in the same words as Settings (lib/db/protection.ts). */
function DatabaseProtection({ database }: { database: Holdings["database"] }) {
  const { headline, detail } = databaseProtectionText(database.state, database.plainLeft);
  return (
    <p className="text-body text-paper-dim">
      <strong className="font-semibold text-paper">{headline}</strong> {detail}
    </p>
  );
}

function FolderRow({
  facts,
  desktop,
  receiptFiles,
  dataFileEncrypted,
}: {
  facts: FolderFacts;
  desktop: boolean;
  /** For the receipts folder only: how its files are kept ([8i], expense-records.md § 9). */
  receiptFiles: Holdings["receiptFiles"] | null;
  /** [8i] Whether the data file is encrypted too: the receipts' sentence about it depends on it. */
  dataFileEncrypted: boolean;
}) {
  const { entry } = facts;
  let status: ReactNode;
  if (facts.path === null) {
    status = <p className="mt-2 text-body text-stone">{words.folders.noDataFile}</p>;
  } else if (!facts.exists) {
    status = (
      <p className="mt-2 text-body text-stone">
        {entry.whenAbsent ??
          (desktop || !entry.desktopOnly ? words.folders.noneYet : words.folders.noneHere)}
      </p>
    );
  } else if (!facts.readable) {
    status = (
      <p className="mt-2 text-body text-amber">{words.folders.notAllowed}</p>
    );
  } else {
    status = (
      <div className="mt-2 space-y-1.5 text-body text-paper">
        <p>
          {facts.files !== null
            ? `${plural(facts.files, counted.file)}${facts.bytes !== null ? words.folders.inAll(sizeWords(facts.bytes)) : ""}`
            : facts.bytes !== null
              ? sizeWords(facts.bytes)
              : words.folders.present}
          {facts.newestOn ? ` · ${facts.files !== null ? words.folders.newestWritten : words.folders.lastWritten} ${facts.newestOn}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Code>{facts.path}</Code>
          <CopyPathButton path={facts.path} />
        </div>
        <p className="text-body text-stone-dim">
          {receiptFiles ? words.folders.countedReceipts : words.folders.countedOnly}
        </p>
      </div>
    );
  }
  return (
    <li className="rounded-lg border border-rule bg-ink2 px-4 py-3">
      <h3 className="font-semibold text-paper">{entry.name}</h3>
      <p className="mt-1 text-body text-paper-dim">{entry.holds}</p>
      {receiptFiles ? <ReceiptProtection files={receiptFiles} desktop={desktop} dataFileEncrypted={dataFileEncrypted} /> : null}
      {status}
    </li>
  );
}

/**
 * [8i] Whether this copy encrypts receipt files, what losing the key means, and how the files in the
 * folder are kept right now, counted from their first bytes (lib/expenses/receipts/store.ts
 * describeReceiptFiles).
 */
function ReceiptProtection({
  files,
  desktop,
  dataFileEncrypted,
}: {
  files: Holdings["receiptFiles"];
  desktop: boolean;
  dataFileEncrypted: boolean;
}) {
  const { headline, detail, tone } = receiptProtectionText(files.state, files.setAsideTo, { desktop, dataFileEncrypted });
  const total = files.encrypted + files.plain + files.locked;
  const counts: string[] = [];
  if (files.state === "on" && total > 0) {
    counts.push(words.receipts.encryptedOf(files.encrypted, plural(total, counted.receiptFile)));
    if (files.plain > 0) {
      counts.push(words.receipts.notEncryptedYet(plural(files.plain, counted.file), files.plain === 1 ? itOrThem.one : itOrThem.many));
    }
  }
  if (files.locked > 0) {
    counts.push(
      files.state === "source"
        ? words.receipts.encryptedByTheApp(plural(files.locked, counted.file), files.locked === 1 ? itOrThem.one : itOrThem.many)
        : words.receipts.lockedElsewhere(plural(files.locked, counted.file)),
    );
  }
  return (
    <div className={`mt-2 space-y-1 text-body ${tone === "problem" ? "text-amber" : "text-paper-dim"}`}>
      <p>
        <strong className={tone === "problem" ? "font-semibold" : "font-semibold text-paper"}>{headline}</strong> {detail}
      </p>
      {counts.length > 0 ? <p>{counts.join(" ")}</p> : null}
      {/* Offered only while the key can't be opened (expense-records.md § 10). */}
      {files.state === "key-unreadable" ? <StartNewReceiptKey /> : null}
      {/* Receipts set aside earlier, and bringing them back once their old key opens (§ 12). */}
      <BringBackReceipts lockedFolders={files.lockedFolders} lockState={files.state} desktop={desktop} />
    </div>
  );
}

function WindowRow({ entry }: { entry: WindowStorageEntry }) {
  return (
    <li className="rounded-lg border border-rule bg-ink2 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="font-semibold text-paper">{entry.name}</h4>
        <span className="rounded-sm border border-rule px-1.5 py-0.5 font-mono text-small tracking-wide text-stone">
          {entry.store === "localStorage" ? words.window.untilCleared : words.window.untilWindowCloses}
        </span>
      </div>
      <p className="mt-1 text-body text-paper-dim">{entry.holds}</p>
      <p className="mt-2 text-body text-paper-dim">
        <span className="font-mono text-label uppercase tracking-[0.14em] text-stone">{words.window.howLong}</span>
        {entry.lasts}
      </p>
      <p className="mt-1 text-body text-stone-dim">
        {words.window.storedUnder} <Code>{entry.key}</Code>
      </p>
    </li>
  );
}

const SENT_STATE_WORDS: Record<SentState, string> = words.sent.states;

/** One row of "What leaves this computer". Exported for its test (tests/privacy-holdings.spec.ts). */
export function SentRow({ facts }: { facts: SentFacts }) {
  const { entry } = facts;
  // The quotes follow the check the row shows: once a person's read of Anthropic's page is recorded, that read
  // outranks the tool check, the row says so, and no quote is listed (toolCheckQuotes is empty), under either label.
  const retention = anthropicRetentionQuotesToDraw(toolCheckQuotes(ANTHROPIC_RETENTION_CHECK));
  return (
    <li className="rounded-lg border border-rule bg-ink2 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold text-paper">{entry.name}</h3>
        <span
          className={
            facts.state === "active"
              ? "rounded-sm border border-amber/40 px-1.5 py-0.5 font-mono text-small tracking-wide text-amber"
              : "rounded-sm border border-rule px-1.5 py-0.5 font-mono text-small tracking-wide text-stone"
          }
        >
          {SENT_STATE_WORDS[facts.state]}
        </span>
      </div>
      <p className="mt-1 text-body text-paper">{facts.detail}</p>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-body">
        <dt className="font-mono text-label uppercase leading-[18px] tracking-[0.14em] text-stone">{words.sent.when}</dt>
        <dd className="text-paper-dim">{entry.when}</dd>
        <dt className="font-mono text-label uppercase leading-[18px] tracking-[0.14em] text-stone">{words.sent.what}</dt>
        <dd className="text-paper-dim">{entry.what}</dd>
        <dt className="font-mono text-label uppercase leading-[18px] tracking-[0.14em] text-stone">{words.sent.takingItBack}</dt>
        <dd className="text-paper-dim">{entry.canTakeBack}</dd>
      </dl>
      {entry.id === "intake-sentence" && facts.state === "active" ? (
        // Anthropic's period in its own words, after the label that says whose they are (never DotAmi's paraphrase).
        <div className="mt-2 text-body text-stone">
          <p>
            {words.sent.anthropicKeeps}{" "}
            <a
              href={ANTHROPIC_RETENTION_URL}
              target="_blank"
              rel="noreferrer"
              className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple"
            >
              {words.sent.anthropicPage}
            </a>
            {words.sent.anthropicPageEnd}{" "}
            {/* In the same words and colour as every source: amber while no person has read the page. */}
            <span className={isCheckFirst(ANTHROPIC_RETENTION_CHECK) ? "text-amber" : "text-stone"}>
              {howCheckedWords(ANTHROPIC_RETENTION_CHECK)}
            </span>
          </p>
          <PageQuotes quotes={retention.forApiUsers} layout="lines" className="mt-1 space-y-0.5 text-paper-dim" />
          {/* The page's two other sections, after the five and under a label of their own (the maintainer, 2026-10-29). */}
          <PageQuotes
            quotes={retention.alsoSays}
            lead={words.sent.anthropicAlsoSays}
            layout="lines"
            className="mt-1 space-y-0.5 text-paper-dim"
          />
        </div>
      ) : null}
    </li>
  );
}
