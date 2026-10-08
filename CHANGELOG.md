# Changelog

Every catalog entry carries its own `lastVerified` date — the day a human read its source.
This file is the other half: what changed in the project between snapshots. A version here is
a dated snapshot, not a promise of stability.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Delete** ([8d]) — "What DotAmi knows about you" gets one Delete button. It opens a list of what
  you can delete: your ideas (with their notes, links and map progress), your figures, your expense
  records, your statements ("In your words", all of them at once, never one by one) and your
  settings. Each box says what else goes with it (deleting ideas also deletes their figures, expense
  records and map progress) and has a Learn more. A cited line says Delete doesn't touch your own
  books, and that the CRA says business records are generally kept six years. DotAmi asks twice,
  refuses if anything changed in between, deletes in one step (a failure part-way deletes nothing),
  then wipes the deleted records out of the data file so they can't be dug back out of it. Only
  DotAmi's own window can do this, never an agent. The list says plainly what it doesn't reach yet:
  the safety copies in the backups folder and what the desktop window stored in earlier launches.
  "Remembered columns" has its place on the list, switched off until DotAmi remembers columns.
- **Add from last year's return** ([8f], first step) — a new button under *Your figures*. Drop the
  PDF of last year's return that your tax software saved, and for each T2125 (Statement of Business
  or Professional Activities) in it DotAmi shows lines 8299, 9368, 9369 and 9946, the page each is
  printed on and the amount beside it. Nothing is added to your figures or kept yet: you look, and
  Close forgets the file. A scan or photo, a password-locked PDF, or a return without a T2125 gets a
  plain sentence saying why and what to do instead. The PDF is read on your computer, inside the
  app's window, by Mozilla's PDF reader (pdf.js), which DotAmi pinned and reviewed and runs in a
  separate worker that can't connect to anything.
- **A reader for hledger and Ledger journals** ([8h], core only; no screen yet, so nothing changes
  for you today) — DotAmi's own code for the plain-text books hledger and Ledger keep. It turns a
  journal into its accounts and their monthly totals: dates, transactions, postings, amounts with
  the currency on either side, a point or a comma as the decimal mark, account declarations and
  their types, and comments. Totals are exact cents, one list per currency, never rounded or
  converted; a symbol like `$` counts as a currency only once you say which one it is. Anything it
  doesn't fully understand (include files, periodic or automated transactions, balance assignments,
  value expressions, unknown directives, an amount like `1,000` that one program reads as a
  thousand and another as one) turns the journal away with what it was and its line number, never
  quoting the line. So does a transaction that doesn't add up, including one paid in another
  currency, and a comment block left open over dated lines, which would otherwise make months
  quietly disappear. Descriptions, payees and comments are never kept. It was written from hledger's
  published manual, not from hledger's code (`docs/connectors/journal-reader.md`). Tested on
  invented journals only.
- **"Add from a file" says how far it has been tested** — once a file is read, one line says that
  each accounting program's export was tested on files shaped from that program's help pages, not
  on real exports, so check the columns and totals.
- **Add to my calendar** ([8e]) — beside the Figure reminders tick-boxes on the settings page, a
  button saves a calendar file (.ics) with one repeating event per ticked box: *"Bring your DotAmi
  figures up to date"* on the first day after each month, quarter or year ends. Open it with your
  calendar app or use its Import menu; Google Calendar imports a file only on a computer, at
  calendar.google.com (Settings, then Import & export). No real calendar import has been tested
  yet. Importing the same file twice adds a second copy, and the page says so. The file is made
  inside the page and nothing is sent anywhere. It holds only general words (no amounts, no idea names), because a
  calendar that syncs online shares its events with the company that runs it. The calendar can't
  see DotAmi, so it reminds you whether or not your figures are already in, and the page says so.
- **Saving a file in the desktop app asks where** — a file made in the page (the calendar file, a
  playbook) now opens a Save dialog with the file's own name; Cancel saves nothing. Only DotAmi's
  own pages can start a save.
- **Two-digit years on "Add from a file"** ([8c-3]) — a file with dates like 12-03-05 (Sage 50) or
  03.12.26 (FreshBooks) used to find no dates at all. Now it gets one question, "Is 05 the year
  2005?", with Yes and No, and no totals until it is answered. DotAmi never picks the century
  itself. The answer is for that file only: the next file is asked again. The year is taken to be
  the last number, as in those programs' short dates.
- **Every file's preview says how its dates were read** — above the monthly totals, the earliest
  and latest date in words ("Dates read: 3 December 2005 to 28 February 2006"), to check against
  the file. A date in a month that isn't over yet is included, so a year read wrong can't hide there.

### Changed
- **A PDF dropped on "Add from a file"** now says it is a PDF and points to *Add from last year's
  return*, instead of "That isn't a spreadsheet".
- **Running DotAmi from its source code no longer reports to Next.js.** `npm run dev`, `npm run build`,
  `npm run start` and `npm run lint` now start Next.js with its anonymous usage reports switched off, as
  the Prisma scripts, CI and the desktop app already did; one small script switches both
  (`scripts/telemetry-off.mjs`), and works the same from cmd, PowerShell and bash. Still to set by hand:
  `npm ci` runs Prisma once on its own, and `npx next` / `npx prisma` typed by hand skip the scripts.
  `npm run dev` still asks npm's registry which Next.js version is newest; nothing turns that off.
  The settings page and README say so.
- **Practice files for Wave, FreshBooks, Sage Accounting and Sage 50 Canadian** (behind the scenes,
  nothing changes on screen beyond the "Add from a file" line under Added) — invented files laid out from each program's own
  help pages, plus Xero's Receivable Invoice Detail, each checked to the cent. They found nine
  things DotAmi gets wrong today, now written down as tests that fail the day each is fixed: a
  refund in a Wave ledger, voided and draft invoices counted as sales, FreshBooks' summary block
  taken for the column names, two-digit years (since fixed, under Added), months across the top, a
  Wave report with no dates, a French Sage 50 file with several comma-decimal columns split on its
  commas, and a formula saved with no value reported as an empty amount. See
  docs/connectors/practice-files.md.

### Documented
- **The privacy log** (`docs/privacy-log.md`) — what each version keeps, sends, ships and asks you to
  agree to, from 0.1.0 on, and what the future privacy policy will need to say. Every change that
  affects it adds a line under [Unreleased]; a test fails when a version has no section.

### Fixed
- **The desktop app says an update is coming as soon as it finds one.** It used to download the
  new version (about 130 MB) in silence and speak only when it was ready, so at start-up the
  update seemed slow to appear. Now a message says *"DotAmi (new version) is available, downloading
  now"* right away, without blocking the app, and the app's taskbar button fills up as it
  downloads. When it's ready you're asked the same question as before, *Restart and update* or
  *Later*; nothing installs without that click. If the download fails, you're told nothing was
  installed. The version you're running is the one that shows this, so you'll first see it on the
  update after the one that brings it.
- **A start that stops part-way now leaves its reason in the log.** The desktop app's log
  (`logs/server.log` in its data folder) was written in the background, so a start that was ended
  or failed while it updated the database left no line at all, not even "starting DotAmi" (seen on
  2026-10-08 during the update to 0.2.1; the data was unharmed). Every line is now written to the
  disk straight away, including what stopped the start (DotAmi's message and the error's name and
  code), and a start made by the updater says so. If the log itself can't be opened, DotAmi starts
  without it instead of refusing to start.

### Security
- **Workers started from DotAmi's own script files can't connect anywhere.** A browser applies a
  worker's own response policy, not the page's, so Next's static files now carry one that allows
  DotAmi's scripts and nothing else. No worker before the return reader loaded from those files.

## [0.2.1] — 2026-10-08

Your figures arrive: totals you agree to on the ideas page, added by hand or from an Excel or CSV
export, with reminders when a month, quarter or year ends without them. Behind the scenes, the
store for business expense records and a bank-file (OFX) reader are in place; neither has a screen
yet. Updating from 0.2.0 adds three small tables to your data file (figures, settings, expense
records) without touching your ideas, links or map progress; the app backs the file up first.

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
  this idea* switch, off until you turn it on. Both survive closing the app. The choices sit in the data file in a new small settings table that later
  settings will share, they are listed on *What DotAmi knows about you*, and only DotAmi's own
  window can read or change them. A database update adds the table without touching your ideas,
  figures, links or map progress (a test proves it).
- **An OFX/QFX bank-file reader** ([8g]) — the code that will read the download most Canadian banks
  offer for Quicken and QuickBooks. Nothing on any screen uses it yet, so nothing changes for you
  today; "Add from a file" still turns bank files away. It is built on `ofx-js`, a free package
  someone else wrote, pinned at exactly 1.1.2 after it was read in full. The reader never lets
  an account, branch or bank number out (they are blanked even where a bank printed one in a
  memo, including the other account's number in a transfer between your own accounts), never counts a transaction that hasn't posted, applies the bank's corrections, counts a
  repeated transaction id once, and turns away a file that declares its own document type, two
  downloads pasted together (the package alone would silently keep only the first), a file with an
  unreasonable number of entries, and one it can't read with certainty (an amount like "1,000",
  which could be a thousand or one dollar, is kept as an unreadable row, never guessed). Tested on invented
  statements only.
- **The store for expense records** ([8i], first slice; no screen yet) — DotAmi can now hold single
  business expenses you agree to keep: the day, the amount and currency, who it was paid to and what
  for (your words), a category only if you pick one, and the seller's address and GST/HST number if
  you give them. Like figures, a record is only proposed until you agree to it in DotAmi's own
  window; an agent or a script can only propose; agreeing, taking back and turning down answer only to DotAmi's own window.
  There is no field for a bank or card number, DotAmi never picks a category or marks anything
  deductible, and a purchase can't be dated after your computer's own day. The records are in the
  data file's new expense table and counted on *What DotAmi knows about you*. A database update adds the
  table without touching your ideas, figures, links, map progress or settings (a test proves it).
  The screen to type a record, receipts and the other ways in come in later steps.
- **The reminder banner** ([8e]) — for each idea whose *Remind me about this idea* switch is on,
  and each of monthly, quarterly and yearly you ticked, DotAmi checks the most recent month,
  calendar quarter or year that has ended. If your agreed figures for that idea don't cover it, the
  ideas page and the idea's map say so: *"September 2026 ended and your figures for <idea> don't
  cover it"*, with **Add figures** (opens the figure entry) and **Not this time** (hides it until the
  next period of that cadence ends, and stays hidden after a restart). Only agreed figures count,
  and only ones inside the period: a quarterly figure covers the quarter but not each month for a
  monthly reminder, and three agreed monthly figures cover the quarter. Figures still waiting for
  your agreement don't count, and the banner says how many are waiting. It is worked out from your
  own day and your own figures on this computer, never shows an amount, and is left out when the
  figures can't be read rather than guessing. Your *Not this time* answers are kept inside the
  Figure reminders setting, so they are listed under *Your settings* on *What DotAmi knows about you*.

### Changed
- **"Today" for figures is your computer's own day.** The server used to decide in UTC, so for a few
  hours each Canadian evening it accepted a period ending "tomorrow". It now uses the day on this
  computer, which in the desktop app and a self-hosted copy is your day.

### Documented
- **Business expense records** ([8i]) — a design and a proposed privacy review for keeping single
  business expenses and their receipts, with the options and what each costs, and the maintainer's
  decisions of 2026-10-07 (single records with receipt files). The store for typed records is built
  (see Added); receipts and the screens are not (`docs/architecture/expense-records.md`).
- **A review of the OFX reader package** ([8g]) — what `ofx-js` 1.1.2 does line by line, what it
  does with a document-type declaration, huge or damaged files, repeated ids, pending rows,
  corrections, several accounts and character sets, the five things found and how each is handled,
  a comparison with `ofx-data-extractor`, and how to switch to an edited copy if one is ever needed
  (`docs/connectors/ofx-reader-review.md`).
- **"Totals, never single transactions" now says what is true.** Figures are still totals; the
  privacy review, the figures roadmap, the use-cases plan, the contract and the *Your figures* entry
  on *What DotAmi knows about you* now say that single business expense records are the one place
  DotAmi keeps single transactions, and a record only counts as kept once you agree to it. Receipts are still proposed.

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
