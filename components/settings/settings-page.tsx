import Link from "next/link";
import type { ReactNode } from "react";

import { GhostLink, WordMark } from "@/components/ui";
import { databaseProtectionText } from "@/lib/db/protection";
import { BringBackReceipts } from "@/components/expenses/bring-back-receipts";
import { StartNewReceiptKey } from "@/components/expenses/start-new-key";
import { receiptProtectionText } from "@/lib/expenses/receipts/protection";
import type { BankSourcesState } from "@/lib/figures/source-account-name";
import { SETTING_GROUPS, settingsInGroup, type SettingEntry, type SettingGroupId } from "@/lib/settings/catalog";
import type { SettingsToday } from "@/lib/settings/today";
import type { FigureRemindersValue } from "@/lib/settings/values";
import { settingsWords } from "@/lib/settings/words";

import { BankAccountsControl } from "./bank-accounts-control";
import { CopyPathButton } from "./copy-path-button";
import { DatabaseEncryptionControl } from "./database-encryption-control";
import { FigureRemindersControl } from "./figure-reminders-control";

const TASK_LIST_URL = "https://github.com/Dot-Ami/dotami/blob/main/docs/task-list.md";
const PART_4_URL =
  "https://github.com/Dot-Ami/dotami/blob/main/docs/architecture/settings-and-edge-cases.md#part-4--not-decided-yet-the-maintainers-calls";
const NEXT_TELEMETRY_URL = "https://nextjs.org/telemetry";

/**
 * S2.5.7g — the settings page. One screen for every setting in Part 1 of
 * docs/architecture/settings-and-edge-cases.md, grouped; the rows come from lib/settings/catalog.ts.
 *
 * Each group opens with what is true in this copy TODAY (read on the server from the app's own
 * environment), then lists the settings planned for it with their default and the warning shown
 * before switching on anything risky. A setting whose story isn't built has no control — it
 * says which story brings it. The story that builds a setting adds its control here.
 *
 * `reminders` is the saved "Figure reminders" value, read on the server (the first setting
 * that is live); null when the data file couldn't be read. `bankSources` is the [8g] bank and
 * card accounts list, also read on the server; null when it couldn't be read.
 */
export function SettingsPage({
  today,
  reminders,
  bankSources = null,
}: {
  today: SettingsToday;
  reminders: FigureRemindersValue | null;
  bankSources?: BankSourcesState | null;
}) {
  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col bg-ink">
      <nav className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        <GhostLink href="/" tone="stone">
          {settingsWords.page.back}
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-small uppercase tracking-[0.14em] text-stone">{settingsWords.page.name}</p>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-10">
        <header>
          <h1 className="font-serif text-display font-bold leading-[1.15] tracking-tight text-paper">
            {settingsWords.page.heading.lead}{" "}
            <span className="font-normal italic text-maple">{settingsWords.page.heading.rest}</span>
          </h1>
          <p className="mt-2 max-w-xl text-lead text-paper-dim">
            {settingsWords.page.intro.before}{" "}
            <a href={TASK_LIST_URL} target="_blank" rel="noreferrer" className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple">
              {settingsWords.page.intro.link}
            </a>
            {settingsWords.page.intro.after}
          </p>
        </header>

        <nav aria-label={settingsWords.page.groups} className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5">
          {SETTING_GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="text-body text-stone underline decoration-rule underline-offset-4 hover:text-paper">
              {g.title}
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-10">
          {SETTING_GROUPS.map((g) => (
            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="scroll-mt-6">
              <h2 id={`${g.id}-title`} className="font-serif text-xl font-bold tracking-tight text-paper">
                {g.title}
              </h2>
              <p className="mt-0.5 text-body text-stone">{g.blurb}</p>

              <div className="mt-3 rounded-lg border border-spruce-line/60 bg-spruce/20 px-4 py-3">
                <p className="font-mono text-label uppercase tracking-[0.14em] text-sage">{settingsWords.page.today}</p>
                <div className="mt-1.5 space-y-2 text-lead leading-relaxed text-paper">{todayFor(g.id, today)}</div>
              </div>

              <ul className="mt-3 space-y-3">
                {settingsInGroup(g.id).map((s) => (
                  <SettingRow key={s.id} setting={s} reminders={reminders} bankSources={bankSources} today={today} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function SettingRow({
  setting,
  reminders,
  bankSources,
  today,
}: {
  setting: SettingEntry;
  reminders: FigureRemindersValue | null;
  bankSources: BankSourcesState | null;
  today: SettingsToday;
}) {
  // [8g] The accounts list shows as soon as there is something in it, even while the switch itself
  // is still planned: taking an account back must always be possible. Nothing can add one before
  // the statement screen exists, so today it shows only on a file that already holds an account.
  const showAccounts =
    setting.id === "bank-records" && bankSources !== null && (bankSources.accounts.length > 0 || bankSources.everyAccountSince !== null);

  const words = settingsWords.row;
  const status =
    setting.status === "undecided"
      ? words.undecided
      : setting.status === "planned"
        ? words.planned(setting.story)
        : setting.status === "asked"
          ? words.asked(setting.where)
          : null;

  return (
    <li className="rounded-lg border border-rule bg-ink2 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold text-paper">{setting.label}</h3>
        {status ? (
          // Not upper-cased: the story code must read exactly as the task list writes it ("[7b]").
          <span className="rounded-sm border border-rule px-1.5 py-0.5 font-mono text-small tracking-wide text-stone">
            {status}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-body text-paper-dim">{setting.does}</p>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-body">
        <dt className="font-mono text-label uppercase leading-[18px] tracking-[0.14em] text-stone">{words.default}</dt>
        <dd className="text-paper">{setting.defaultValue}</dd>
        <dt className="font-mono text-label uppercase leading-[18px] tracking-[0.14em] text-stone">{words.choices}</dt>
        <dd className="text-paper-dim">
          {setting.status === "undecided" ? (
            <a href={PART_4_URL} target="_blank" rel="noreferrer" className="underline decoration-stone-dim underline-offset-2 hover:text-paper">
              {setting.options}
            </a>
          ) : (
            setting.options
          )}
        </dd>
      </dl>
      {setting.warning ? (
        <p className="mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-1.5 text-body text-amber">
          <span className="font-mono text-label uppercase tracking-[0.14em]">
            {words.warning}{" "}
          </span>
          {setting.warning}
        </p>
      ) : null}
      {setting.id === "database-encryption" && setting.status === "live" ? (
        <div className="mt-3 border-t border-rule-soft pt-3">
          <DatabaseEncryptionControl lock={today.database.state} />
        </div>
      ) : null}
      {setting.id === "figure-reminders" && setting.status === "live" ? (
        <div className="mt-3 border-t border-rule-soft pt-3">
          <FigureRemindersControl initial={reminders ? reminders.cadences : null} />
        </div>
      ) : null}
      {showAccounts ? (
        <div className="mt-3 border-t border-rule-soft pt-3">
          <BankAccountsControl initial={bankSources!} />
        </div>
      ) : null}
    </li>
  );
}

/**
 * [8i] Whether the receipt files are encrypted in this copy, and what losing the key means
 * (docs/architecture/expense-records.md § 9). Read from the app's own environment on every visit.
 */
function ReceiptProtectionLine({
  state,
  setAsideTo,
  desktop,
  dataFileEncrypted,
  lockedFolders,
}: {
  state: SettingsToday["receipts"];
  setAsideTo: string | null;
  desktop: boolean;
  dataFileEncrypted: boolean;
  /** Folders Start a new key set receipts aside in, still holding one (expense-records.md § 12). */
  lockedFolders: number;
}) {
  const { headline, detail, tone } = receiptProtectionText(state, setAsideTo, { desktop, dataFileEncrypted });
  return (
    <div>
      <p className={tone === "problem" ? "text-amber" : "text-paper-dim"}>
        <strong className={tone === "problem" ? "font-semibold" : "font-semibold text-paper"}>{headline}</strong> {detail}
      </p>
      {/* Offered only while the key can't be opened (expense-records.md § 10). */}
      {state === "key-unreadable" ? <StartNewReceiptKey /> : null}
      {/* Receipts set aside earlier, and bringing them back once their old key opens (§ 12). */}
      <BringBackReceipts lockedFolders={lockedFolders} lockState={state} desktop={desktop} />
    </div>
  );
}

/**
 * [8i] Whether the data file is encrypted in this copy, what that protects and doesn't, and what losing
 * the key means (docs/architecture/database-encryption.md § 7). Read from the app's own environment on
 * every visit; says "encrypted" only when the desktop app opened the file with its key.
 */
function DatabaseProtectionLine({ database }: { database: SettingsToday["database"] }) {
  const { headline, detail } = databaseProtectionText(database.state, database.plainLeft);
  return (
    <p className="text-paper-dim">
      <strong className="font-semibold text-paper">{headline}</strong> {detail}
    </p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="break-all rounded-sm bg-ink px-1.5 py-0.5 font-mono text-body text-paper">{children}</code>;
}

/** The "Today" lines for one group. Every sentence they say must stay true of the running app. */
function todayFor(group: SettingGroupId, today: SettingsToday): ReactNode {
  const words = settingsWords.today;
  switch (group) {
    case "data": {
      const { path, exists } = today.dataFile;
      if (!path) {
        return <p>{words.data.noPath}</p>;
      }
      if (!exists) {
        return (
          <p>
            {words.data.noFile.before} <Code>{path}</Code>
            {words.data.noFile.after} <Code>{words.data.noFile.command}</Code> {words.data.noFile.createsIt}
          </p>
        );
      }
      return (
        <>
          <p>{words.data.oneFile}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Code>{path}</Code>
            <CopyPathButton path={path} />
          </div>
          <DatabaseProtectionLine database={today.database} />
          <ReceiptProtectionLine
            state={today.receipts}
            setAsideTo={today.receiptsSetAside}
            desktop={today.desktop}
            dataFileEncrypted={today.database.state === "on"}
            lockedFolders={today.receiptsLockedFolders}
          />
          {today.desktop ? (
            <p className="text-paper-dim">
              <strong className="font-semibold text-paper">{words.data.backUp.backUp}</strong> {words.data.backUp.backUpDoes}{" "}
              <strong className="font-semibold text-paper">{words.data.backUp.restore}</strong> {words.data.backUp.restoreDoes}
            </p>
          ) : (
            <p className="text-paper-dim">{words.data.copyIt}</p>
          )}
          <p className="text-paper-dim">{words.data.diskEncryption}</p>
        </>
      );
    }
    case "figures":
      return (
        <p>
          {words.figures.before}{" "}
          <Link href="/your-data" className="underline decoration-stone-dim underline-offset-2 hover:text-paper">
            {words.figures.link}
          </Link>
          {words.figures.after}
        </p>
      );
    case "lens":
      return <p>{words.lens}</p>;
    case "map":
      return <p>{words.map(today.taxYear)}</p>;
    case "privacy": {
      const privacy = words.privacy;
      const source = privacy.fromSource;
      const sends = today.intake.sentTo === "anthropic" || today.updates === "github";
      return (
        <>
          {sends ? (
            <p>
              <strong>{privacy.whatLeaves}</strong>
            </p>
          ) : (
            <p>
              <strong>{privacy.nothing}</strong> {privacy.readHereNoKey}
            </p>
          )}
          {today.intake.sentTo === "anthropic" ? (
            <p>
              {privacy.toAnthropic.before} <Code>{today.intake.model}</Code>
              {privacy.toAnthropic.because}
              <Code>{privacy.toAnthropic.keyName}</Code>
              {privacy.toAnthropic.isSet} <Code>{privacy.toAnthropic.envFile}</Code> {privacy.toAnthropic.after}
            </p>
          ) : null}
          {today.updates === "github" ? (
            <p>
              {privacy.updateCheck}
              {today.intake.sentTo === "anthropic" ? null : <> {privacy.readHere}</>}
            </p>
          ) : null}
          <p className="text-paper-dim">
            {privacy.noServer.before}{" "}
            <Link href="/your-data" className="underline decoration-stone-dim underline-offset-2 hover:text-paper">
              {privacy.noServer.link}
            </Link>
            {privacy.noServer.after}
          </p>
          {today.updates === "github" ? null : (
            <p className="text-paper-dim">
              {source.lead}{" "}
              <a href={NEXT_TELEMETRY_URL} target="_blank" rel="noreferrer" className="underline decoration-stone-dim underline-offset-2 hover:text-paper">
                {source.telemetryLink}
              </a>
              {source.readOn}
              <Code>{source.dev}</Code>, <Code>{source.build}</Code> {source.andTheRest} <Code>{source.ci}</Code> {source.runsPrismaOnce}{" "}
              <Code>{source.npxNext}</Code> {source.or} <Code>{source.npxPrisma}</Code> {source.skipTheSwitch}{" "}
              <Code>{source.nextOff}</Code> {source.and} <Code>{source.prismaOff}</Code> {source.inYourEnvironment}{" "}
              <Code>{source.dev}</Code> {source.devAlsoAsks}
            </p>
          )}
        </>
      );
    }
    case "updates":
      return (
        <>
          {today.updates === "github" ? (
            <p>
              {words.updates.thisIsVersion} <Code>{today.version}</Code>
              {words.updates.fromGitHub}
            </p>
          ) : (
            <p>
              {words.updates.thisIsVersion} <Code>{today.version}</Code>
              {words.updates.fromSource}
            </p>
          )}
          {/* The third-party notices (/licences): the licences of everything DotAmi ships with. */}
          <p>
            {words.updates.licences.before}{" "}
            <Link href="/licences" className="underline decoration-stone-dim underline-offset-2 hover:text-paper">
              {words.updates.licences.link}
            </Link>
            {today.desktop ? <> {words.updates.licences.alsoInHelp}</> : ""}.
          </p>
        </>
      );
  }
}
