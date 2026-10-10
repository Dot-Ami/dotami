import Link from "next/link";
import type { ReactNode } from "react";

import { GhostLink, WordMark } from "@/components/ui";
import { receiptProtectionText } from "@/lib/expenses/receipts/protection";
import type { BankSourcesState } from "@/lib/figures/source-account-name";
import { SETTING_GROUPS, settingsInGroup, type SettingEntry, type SettingGroupId } from "@/lib/settings/catalog";
import type { SettingsToday } from "@/lib/settings/today";
import type { FigureRemindersValue } from "@/lib/settings/values";

import { BankAccountsControl } from "./bank-accounts-control";
import { CopyPathButton } from "./copy-path-button";
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
          ← Back
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-stone">Settings</p>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-10">
        <header>
          <h1 className="font-serif text-[26px] font-bold leading-[1.15] tracking-tight text-paper">
            Settings, <span className="font-normal italic text-maple">and what&apos;s true today.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-paper-dim">
            Each group starts with what this copy of DotAmi does right now. Below that is every
            setting planned for it: its default, its choices, and the warning you&apos;ll see
            before switching on anything risky. Only the ones with a tick-box below can be
            changed so far; each of the others arrives with the feature it controls, named by its
            code on the{" "}
            <a href={TASK_LIST_URL} target="_blank" rel="noreferrer" className="text-paper underline decoration-stone-dim underline-offset-2 hover:text-maple">
              public task list
            </a>
            .
          </p>
        </header>

        <nav aria-label="Setting groups" className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5">
          {SETTING_GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="text-xs text-stone underline decoration-rule underline-offset-4 hover:text-paper">
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
              <p className="mt-0.5 text-[12px] text-stone">{g.blurb}</p>

              <div className="mt-3 rounded-lg border border-spruce-line/60 bg-spruce/20 px-4 py-3">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-sage">Today</p>
                <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-paper">{todayFor(g.id, today)}</div>
              </div>

              <ul className="mt-3 space-y-3">
                {settingsInGroup(g.id).map((s) => (
                  <SettingRow key={s.id} setting={s} reminders={reminders} bankSources={bankSources} />
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
}: {
  setting: SettingEntry;
  reminders: FigureRemindersValue | null;
  bankSources: BankSourcesState | null;
}) {
  // [8g] The accounts list shows as soon as there is something in it, even while the switch itself
  // is still planned: taking an account back must always be possible. Nothing can add one before
  // the statement screen exists, so today it shows only on a file that already holds an account.
  const showAccounts =
    setting.id === "bank-records" && bankSources !== null && (bankSources.accounts.length > 0 || bankSources.everyAccountSince !== null);

  const status =
    setting.status === "undecided"
      ? "Waiting on a decision"
      : setting.status === "planned"
        ? `Not built yet · [${setting.story}]`
        : setting.status === "asked"
          ? `Asked each time · ${setting.where}`
          : null;

  return (
    <li className="rounded-lg border border-rule bg-ink2 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold text-paper">{setting.label}</h3>
        {status ? (
          // Not upper-cased: the story code must read exactly as the task list writes it ("[7b]").
          <span className="rounded-sm border border-rule px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-stone">
            {status}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[12.5px] text-paper-dim">{setting.does}</p>
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12px]">
        <dt className="font-mono text-[9.5px] uppercase leading-[18px] tracking-[0.14em] text-stone">Default</dt>
        <dd className="text-paper">{setting.defaultValue}</dd>
        <dt className="font-mono text-[9.5px] uppercase leading-[18px] tracking-[0.14em] text-stone">Choices</dt>
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
        <p className="mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-1.5 text-[12px] text-amber">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em]">Warning · </span>
          {setting.warning}
        </p>
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
function ReceiptProtectionLine({ state }: { state: SettingsToday["receipts"] }) {
  const { headline, detail, tone } = receiptProtectionText(state);
  return (
    <p className={tone === "problem" ? "text-amber" : "text-paper-dim"}>
      <strong className={tone === "problem" ? "font-semibold" : "font-semibold text-paper"}>{headline}</strong> {detail}
    </p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="break-all rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[12px] text-paper">{children}</code>;
}

/** The "Today" lines for one group. Every sentence here must stay true of the running app. */
function todayFor(group: SettingGroupId, today: SettingsToday): ReactNode {
  switch (group) {
    case "data": {
      const { path, exists } = today.dataFile;
      if (!path) {
        return <p>This copy&apos;s database setting doesn&apos;t point at a file, so there is no single data file to show.</p>;
      }
      if (!exists) {
        return (
          <p>
            Your data file belongs at <Code>{path}</Code>, but there&apos;s no file there yet.{" "}
            <Code>npm run prisma:deploy</Code> creates it (README, Quick start).
          </p>
        );
      }
      return (
        <>
          {/* Receipt files ([8i]) live in a receipts folder beside the data file, not inside it. */}
          <p>Your data is one file on this computer, plus the copies of your receipts in a folder named receipts beside it:</p>
          <div className="flex flex-wrap items-center gap-2">
            <Code>{path}</Code>
            <CopyPathButton path={path} />
          </div>
          <ReceiptProtectionLine state={today.receipts} />
          {today.desktop ? (
            <p className="text-paper-dim">
              <strong className="font-semibold text-paper">File → Back up…</strong> makes one file you
              can keep somewhere else, locked with a passphrase if you choose, with your receipt
              files in it.{" "}
              <strong className="font-semibold text-paper">File → Restore from a backup…</strong> puts
              one back — on this computer or a new one — after checking it, and keeps a copy of
              what was here in the backups folder.
            </p>
          ) : (
            <p className="text-paper-dim">
              Copying that file and the receipts folder beside it while DotAmi is stopped is a
              complete backup; deleting both starts over. The desktop app has Back up and Restore in
              its File menu.
            </p>
          )}
          <p className="text-paper-dim">
            {/* Microsoft's own page, read 2026-10-06: support.microsoft.com "Device encryption in Windows". */}
            The backup doesn&apos;t protect this computer&apos;s copy if the computer is lost or
            stolen — disk encryption does. On Windows: Settings → Privacy &amp; security → Device
            encryption (on Windows Home; Pro also has BitLocker). It needs supported hardware and is
            only switched on by itself if you signed in with a Microsoft account. On a Mac:
            FileVault.
          </p>
        </>
      );
    }
    case "figures":
      return (
        <p>
          DotAmi keeps the totals you agree to, each with where it came from and the day you agreed.
          It also keeps the ones still waiting for your answer, and the ones you turned down or took
          back. None of those count, but every one stays in your data file, amount included. Your
          revenue estimates from the intake are kept separately. Every figure, and where it came from,
          is listed on{" "}
          <Link href="/your-data" className="underline decoration-stone-dim underline-offset-2 hover:text-paper">
            What DotAmi knows about you
          </Link>
          .
        </p>
      );
    case "lens":
      return (
        <p>
          No model is chosen: the Lens isn&apos;t built yet (it arrives with [9a]), and no outside
          agent can connect. The only AI in the app today is the reader for the sentence you type to
          describe a venture — see Privacy.
        </p>
      );
    case "map":
      return (
        <p>
          The cards use the {today.taxYear} rules, the only tax year mapped so far. The app is in
          English.
        </p>
      );
    case "privacy": {
      const sends = today.intake.sentTo === "anthropic" || today.updates === "github";
      return (
        <>
          {sends ? (
            <p>
              <strong>What leaves this computer:</strong>
            </p>
          ) : (
            <p>
              <strong>DotAmi sends nothing off this computer.</strong> The sentence you type to
              describe a venture is read here, by keyword matching — no model key is set.
            </p>
          )}
          {today.intake.sentTo === "anthropic" ? (
            <p>
              The sentence you type to describe a venture is sent to Anthropic to be read (model{" "}
              <Code>{today.intake.model}</Code>), because a model key (<Code>ANTHROPIC_API_KEY</Code>)
              is set for this copy, usually in its <Code>.env</Code> file. Empty the key and it&apos;s
              read here, by keyword matching, instead.
            </p>
          ) : null}
          {today.updates === "github" ? (
            <p>
              When the app starts, it asks GitHub whether there&apos;s a newer version, and downloads
              it if there is. GitHub sees this computer&apos;s internet address and which version it
              runs — none of your data.
              {today.intake.sentTo === "anthropic" ? null : " The sentence you type to describe a venture is read here, by keyword matching."}
            </p>
          ) : null}
          <p className="text-paper-dim">
            DotAmi has no server of its own and collects no usage data. Links to official sources
            and to GitHub open those sites only when you click them. Everything DotAmi keeps about
            you is listed on{" "}
            <Link href="/your-data" className="underline decoration-stone-dim underline-offset-2 hover:text-paper">
              What DotAmi knows about you
            </Link>
            .
          </p>
          {today.updates === "github" ? null : (
          <p className="text-paper-dim">
            If you run DotAmi from its source code: two tools it is built with report anonymous
            counts unless told not to — the Next.js framework to Vercel when it builds or runs in
            development mode (the command, versions, the kind of computer, the app&apos;s size;{" "}
            <a href={NEXT_TELEMETRY_URL} target="_blank" rel="noreferrer" className="underline decoration-stone-dim underline-offset-2 hover:text-paper">
              nextjs.org/telemetry
            </a>
            , read 2026-10-05), and the Prisma database tool to Prisma each time it runs. The
            project&apos;s own commands (<Code>npm run dev</Code>, <Code>npm run build</Code> and the
            rest) switch both off. Installing with <Code>npm ci</Code> runs Prisma once on its own,
            and <Code>npx next</Code> or <Code>npx prisma</Code> typed by hand skip the switch: set{" "}
            <Code>NEXT_TELEMETRY_DISABLED=1</Code> and <Code>CHECKPOINT_DISABLE=1</Code> in your
            environment for those. <Code>npm run dev</Code> also asks npm&apos;s registry which
            Next.js version is newest each time it starts; npm sees this computer&apos;s internet address
            and nothing else.
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
              This is version <Code>{today.version}</Code>. Each time it starts, the app checks GitHub
              for a newer version and downloads it, then asks before installing it — nothing installs
              without your click. Help → Check for updates does it now.
            </p>
          ) : (
            <p>
              This is version <Code>{today.version}</Code>, run from DotAmi&apos;s source code: it updates
              with git, not by itself. The installed app checks GitHub for new versions.
            </p>
          )}
          {/* The third-party notices (/licences): the licences of everything DotAmi ships with. */}
          <p>
            DotAmi is open source under the Apache License 2.0, and ships with work by many other people.
            Each piece, its version and its licence, word for word:{" "}
            <Link href="/licences" className="underline decoration-stone-dim underline-offset-2 hover:text-paper">
              Licences
            </Link>
            {today.desktop ? " (also under Help → Licences)" : ""}.
          </p>
        </>
      );
  }
}
