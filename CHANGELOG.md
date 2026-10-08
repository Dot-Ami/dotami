# Changelog

Every catalog entry carries its own `lastVerified` date — the day a human read its source.
This file is the other half: what changed in the project between snapshots. A version here is
a dated snapshot, not a promise of stability.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Your figures** ([8a]) — on the ideas page, totals you've agreed to (revenue for now), never
  your transactions. Where they settle a rule, the map uses them instead of your estimates: the
  GST/HST card says what your confirmed quarters add up to, and *"From your records"* with the
  source. Only figures that are exactly a calendar month or quarter are counted; nothing is split,
  converted or added twice, and the card says what it left out.
- **The agree prompt** ([8b]) — nothing counts until you agree: figures grouped by where they came
  from, amounts editable, *Agree* or *No, I'll do it myself*. Closing it confirms nothing, and only
  DotAmi's own page can confirm — the route importers and agents use can only propose.
- **Add from a file** ([8c]) — drop an Excel (.xlsx) or CSV export of your sales and DotAmi
  proposes one revenue total per month, each with how many rows it adds up. The file is read inside
  the app's window and never sent or kept; only the totals you agree to are saved. It finds the
  column names, guesses the date and amount columns only when their names make it clear, asks once
  when a date like 03/04/2026 could be read two ways, reads "1 234,56" and Windows-encoded French
  files, and lists every row it left out with the reason. Macro workbooks, old .xls or
  password-locked files, pictures renamed .xlsx and files over 10 MB are refused with what to do
  instead. Months already waiting or agreed with the same total aren't proposed twice. Every time,
  it first asks where the file is from; a bank or credit card file is turned away without being
  opened, since bank statements aren't supported yet.
- **A "Type column" for files that list a sale and its payment** — QuickBooks' transaction lists
  hold an invoice and then a Payment row for the same money, which was added up twice. "Add from a
  file" now has an optional Type column, pre-filled only when a column is headed exactly
  "Transaction Type" (a bare "Type" column is picked by hand). Rows typed Payment or Deposit are left out of the totals and listed,
  with a note that in QuickBooks they are money received for a sale on another row and a way to
  undo it if they are the person's own sales ("choose None"); every other row counts as before, and
  choosing "None" counts every row. A Deposit made straight to an income account is also left out.
  Nothing about the column is stored.
- **A reminder in the agree prompt**: before the buttons, every time it opens, *"Double-check what
  DotAmi did, and how, before you agree."*
- **Figure reminders** ([8e]) — DotAmi's first setting you can change and keep. On the settings
  page, tick how often you'd like to be reminded to bring your figures up to date: monthly,
  quarterly and yearly, any combination or none. Each idea on the ideas page has a *Remind me about
  this idea* switch, off until you turn it on. Both survive closing the app. Your choices are saved
  now; the reminder itself (a banner and a calendar file) comes in a later step, so nothing
  reminds you yet. The choices sit in the data file in a new small settings table that later
  settings will share, they are listed on *What DotAmi knows about you*, and only DotAmi's own
  window can read or change them. A database update adds the table without touching your ideas,
  figures, links or map progress (a test proves it).

### Changed
- **"Today" for figures is your computer's own day.** The server used to decide in UTC, so for a few
  hours each Canadian evening it accepted a period ending "tomorrow". It now uses the day on this
  computer, which in the desktop app and a self-hosted copy is your day.

### Documented
- **Business expense records** ([8i]) — a design and a proposed privacy review for keeping single
  business expenses and their receipts, with the options and what each costs, and the maintainer's
  decisions of 2026-10-07 (single records with receipt files). Nothing is built yet
  (`docs/architecture/expense-records.md`).

### Fixed
- **"Add from a file" no longer pre-fills a price per item as the amount.** A column named
  UnitAmount, Unit Price, Rate, Price each or Prix unitaire is the price of one item, not what was
  sold: Xero's UnitAmount gave July $150 against a true $350. Those columns are left for you to
  pick; a real line total (LineAmount, Amount, Total Price) is still pre-filled, unless the sheet also has a tax
  column, when a "Total" may include the tax and is left for the person to pick, as before.
- **It pre-fills the invoice date, not the due date.** Names written without spaces (InvoiceDate,
  Invoice_Date) are now read as "date", and a due-date column (including the French
  "échéance") is never chosen by its name; it is pre-filled only when it is the one column that is
  mostly dates.
- **It pre-fills Date in a grouped report with one line per customer.** Customer-name rows and
  "Total for" rows no longer count against the date column. You still check every pick.
- The GST/HST card's CRA source had moved (the old page answered 404); it links to the new page.
- Releases: the workflow creates the draft first, so a release is one draft, not one per file — and
  the workflow file is valid again (that change had made it unreadable, so a version tag would have
  built nothing).

## [0.2.0] — 2026-10-06

The first desktop release: DotAmi in its own window on Windows, with an installer, an update
button, and backup and restore. The installer isn't code-signed yet, so Windows shows "Windows
protected your PC" on first install (More info → Run anyway).

### Added
- **The desktop app** (Windows first; `docs/architecture/desktop-app.md`): DotAmi in its own
  window, its data in one file in the app's own folder (`%APPDATA%\DotAmi`), its server listening
  on this computer only. The window shows only DotAmi's pages; outside links open in your browser.
- **An installer and the update button.** The installed app checks GitHub Releases when it
  starts (and on Help → Check for updates), downloads a newer version and **asks before
  installing it**. Releases are built by CI as drafts and reach installed apps only when the
  maintainer publishes them. Pre-release versions reach only pre-release copies.
- **Backup and restore** (File menu): one `.dotami-backup` file, locked with a passphrase if you
  choose (AES-256-GCM); a restore checks the file first, keeps a copy of what it replaces, and
  refuses a backup from a newer version.
- **Database updates the app applies itself**, keeping Prisma's own bookkeeping (checked against
  Prisma's `migrate status`): it backs the database up before changing it and refuses data saved
  by a newer version or a half-finished update.
- **The settings page** (`/settings`): every planned setting with its default, its warning and
  the task that brings it, plus what is true of this copy today — where the data is, what leaves
  the computer, how updates arrive, how to turn on disk encryption.
- Desktop tests (`npm run test:desktop`): start → describe a venture → close → start again; back
  up on one computer → restore on another. CI runs them on Windows against the packaged app.

### Changed
- Node 22.13 or later (the desktop app's database code uses Node's built-in SQLite); CI and
  `.nvmrc` use Node 24, the version inside the desktop app.
- The Prisma CLI's usage check-in (`checkpoint.prisma.io`) is switched off for the project's
  `prisma:*` scripts and in CI; the desktop app doesn't ship the Prisma CLI at all.
- README and the settings page now say what tools report while you build from source (Next.js
  telemetry, Prisma's check-in during `npm ci`) and how to stop it.

### Security
- **DotAmi answers only on this computer's own address.** A web page could use DNS rebinding to
  read and write DotAmi's data (a request carrying another site's name was answered). Every
  request whose Host isn't `localhost`, `127.0.0.1`, `[::1]` or `*.localhost` is now refused;
  `DOTAMI_ALLOWED_HOSTS` lists extra names for deliberate use on your own network.

### Also in 0.2.0 — earlier changes since the first snapshot (2026-09-20 → 10-03)

#### Added
- `npm run seed` — two invented ventures so a fresh clone shows a working map instead of an
  empty app.
- Per-request Content-Security-Policy on every page; fonts served from this origin instead of
  a third party.
- Byte caps, per-client rate limits and same-origin JSON checks on every write route.
- CodeQL and OpenSSF Scorecard workflows; Dependabot configuration; `.gitleaks.toml`.
- Prettier and `.editorconfig` (configured, not yet part of the gate).
- Node pinned (`.nvmrc`, `engines`) to match CI — Node 20 then; Node 22.13+ / 24 from this release (above).
- Issue chooser, bug-report template, `CODEOWNERS`, `CITATION.cff`, README badges.
- **Browser tests** (`npm run test:browser`, Playwright, `e2e/`): the real build on a fresh
  database, driven like a person — one sentence to a saved map, a stage change surviving a
  reload, the disclaimer footer inside the window. A CI job runs them on every pull request.

#### Changed
- **Database: PostgreSQL → SQLite (2026-09-28).** The whole database is now one file
  (`prisma/dotami.db` by default), so DotAmi needs no database server — the first step toward
  a desktop app. The four list fields are stored as JSON arrays. The eight PostgreSQL
  migrations are replaced by one SQLite starting migration (they remain in git history).
  **If you already run DotAmi on PostgreSQL:** a fresh SQLite file starts empty. Stay on the
  commit before this change until a copy script lands, or re-enter your ventures; nothing is
  deleted from your PostgreSQL database.
- The database layer now has a test: `tests/db-roundtrip.spec.ts` migrates a throwaway SQLite
  file, saves and reloads ventures, links and statements, and deletes the file.
- Stack moved to Next.js 15.5 / React 19 / Vitest 4. The 14.x line had no fix for
  GHSA-p293-qw3h-jr36 (unauthenticated remote code execution on Windows hosts).
- The dev server and the documented Postgres container bind to `127.0.0.1`, not every
  interface.
- `@anthropic-ai/sdk` 0.92 → 0.127 (the optional intake parser's only dependency).
- Recharts removed — nothing imported it after the projection footer was cut.

#### Fixed
- **The landing page and the intake were dead in production builds** (`npm run build && npm
  start`) from 2026-09-21: they were pre-rendered at build time, so their scripts carried no CSP
  nonce and the browser blocked every one — the text box filled, but "Map it" never enabled.
  Development mode renders per request, so it never showed. Every page now renders per request
  (`app/layout.tsx`), as the Next.js CSP guide requires. Found by the first browser test.
- Links built from data the app did not write are restricted to absolute `https:` URLs.
- `deepmerge-ts` forced to 8.x (GHSA-ggr8-5vv4-36mx). It arrives through Prisma's CLI and
  no Prisma release — including 7.10 — has moved off the vulnerable 7.x yet.
- Documents that described a CI job, a hosted deploy and file paths that do not exist.

## [0.1.0] — 2026-09-20

### Added
- First public release: seven catalogs (74 citations) behind a deterministic rules engine,
  the intake, the map, saved ideas, the JSON readout, and the optional local statute store.
