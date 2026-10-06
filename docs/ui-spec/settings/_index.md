# Settings (`/settings`) — page overview

Last updated: 2026-10-05 ([7g] — the shell)

**Route:** `/settings` · **Component:** `components/settings/settings-page.tsx` (server-rendered;
the one interactive control is `copy-path-button.tsx`) · **Rows:** `lib/settings/catalog.ts` ·
**Today facts:** `lib/settings/today.ts` · **Reached from:** "Settings" on the landing page header
and the ideas page nav.

## What it is for

One screen for every setting in Part 1 of
[settings-and-edge-cases.md](../../architecture/settings-and-edge-cases.md), so a person can see
what DotAmi does now and what each setting will let them change — before any of it is built.

## Layout

Groups, in this order: **Data and backups · Your figures · The Lens and outside agents · The map ·
Privacy · Updates.** "The map" holds the three Part 1 rows that fit none of the others (deadline
reminders, tax year, language). A row of jump links sits under the heading.

Each group:

1. **Today** — what is true of this copy right now, read on the server from the app's own
   environment on every visit (never a stored claim):
   - Data and backups: the absolute path of the database file (from `DATABASE_URL`, relative
     paths read from `prisma/` as Prisma does) with a **Copy path** button; "no file there yet"
     when it's missing; a plain line when the URL isn't a SQLite file. In the desktop app
     (`DOTAMI_DESKTOP=1`): where Back up and Restore are (File menu); from source: copying the
     file is a backup. Always: how to turn on disk encryption (Windows Device encryption on Home,
     BitLocker on Pro — Microsoft's page, read 2026-10-06; FileVault on a Mac).
   - Your figures: DotAmi keeps the totals the person agrees to, each with its source and the day
     agreed; one taken back stops counting but stays in the data file; the intake's revenue
     estimates are separate. Links to `/your-data` ("What DotAmi knows about you"), which lists every
     figure ([8a], [8d]).
   - The Lens: no model chosen; no outside agent can connect.
   - The map: the tax year the catalogs cover.
   - Privacy: what leaves the computer — the sentence typed to describe a venture goes to
     Anthropic only when `ANTHROPIC_API_KEY` is set (the intake parser's own test); the installed
     app's update check shows GitHub the computer's internet address and version
     (`DOTAMI_UPDATES=github`); DotAmi has no server and collects no usage data; from source:
     Next.js telemetry and Prisma's check-in, and how to stop them. Includes a link, "What DotAmi
     knows about you", to `/your-data` ([8d], docs/ui-spec/your-data/_index.md).
   - Updates: the version; the installed app checks GitHub at start and asks before installing;
     a copy run from source updates with git.
2. **One card per setting** — label · what it controls · Default · Choices · the warning shown
   before switching on the risky option (amber) · a status chip: `Not built yet · [code]`,
   `Asked each time · <where>` (the backup passphrase — asked in the passphrase window, which
   shows the same warning), or `Waiting on a decision` (the usage-sharing row, whose Choices link
   to Part 4).

| Control | Behaviour | Persists to |
|---|---|---|
| Jump links | in-page anchors to each group | — |
| **Copy path** | copies the data file path; says "Copied", or "Copy failed — select it instead" when the clipboard is refused | — |
| Public task list / Part 4 / nextjs.org links | open in a new tab | — |
| **What DotAmi knows about you** (Privacy group, and again in Your figures) | opens `/your-data` in the same tab | — |

## What it deliberately does not do

- **No setting can be changed yet.** Every setting in Part 1 belongs to a feature that isn't
  built; a switch that did nothing would be lying. The story that builds a setting flips its row
  to `live` in the catalog and adds its control, its storage and a browser test that the change
  survives a restart — `tests/settings-catalog.spec.ts` asserts there are no live rows until then.
- No settings are stored, so there is no settings table or API yet. The data folder [7b] can't be
  stored inside the database it points at; that story decides where app-level settings live.
- Never shows a key, only whether one is set.

## Kept in step

`tests/settings-catalog.spec.ts` fails if the catalog and Part 1 disagree — a setting in one and
not the other, a different default, choices or story code, or a quoted warning reworded in one
place. Change both in the same commit.

## Verified 2026-10-05

`e2e/app.spec.ts` › "the settings page …" on the production build: reached from the landing
page and the ideas page; all six groups; the data file shown is the run's throwaway `e2e.db`;
Privacy says nothing is sent (no key in the test run); every setting shows its default, its
warning when it has one, and its story; no form controls on the page; Copy path puts exactly the
shown path on the clipboard; no sideways scroll at 390 px wide.
