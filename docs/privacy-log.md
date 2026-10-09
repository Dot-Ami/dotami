# Privacy log — what each version keeps, sends, ships and asks

This is the running record DotAmi's privacy policy and terms of use will be written from. It is
**not** a privacy policy: there isn't one yet (see *Still open* below). Each version gets a
section that says, in plain words and with a link to the code or document that proves it:

- **What DotAmi keeps, and where** — database tables, files, browser storage.
- **What leaves the computer, and to whom** — every request out, and what the other side sees.
- **Packages that ship** — and whether each can reach the network.
- **New powers or permissions** — what the app can now do on the computer.
- **What the person must agree to** — every prompt, warning and click that stands between the
  person and something happening.
- **How to remove it** — and, said plainly, what can't be removed yet.
- **What the policy will need to say** — the sentences a policy writer must not miss.

The live list of what DotAmi keeps is [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts),
which the *What DotAmi knows about you* page (`/your-data`) is drawn from and which
[`tests/privacy-inventory.spec.ts`](../tests/privacy-inventory.spec.ts) keeps honest. This log is
the history of that list, plus what the list doesn't cover (developer tools, installers, what the
person is asked).

## How this log is kept

- **Every pull request that changes what DotAmi keeps, sends, ships or asks** adds a line under
  [Unreleased], under the heading it belongs to, with a link to the code.
- **The release pull request** (the one that bumps `version` in `package.json`) turns [Unreleased]
  into that version's section, dated, and starts a new empty [Unreleased].
  [`tests/privacy-log.spec.ts`](../tests/privacy-log.spec.ts) fails while `package.json`'s version,
  or any version in [`CHANGELOG.md`](../CHANGELOG.md), has no section here, and while a section
  lacks one of the seven parts above or leaves one empty.
- **A pre-release** (`0.2.2-dev.1`) is shipped to the people who opt into pre-releases, so it gets
  its own full section too, listed below the final version of the same number once that ships.
- **Facts only.** Every line is something the code or a dated document shows. Where nobody has
  checked, the line says *not checked*. Nothing here is a promise about a future version.

---

## [Unreleased]

### What DotAmi keeps, and where

- **A return PDF the person drops ([8f], *Add from last year's return*): nothing is kept.** The
  file is read in memory inside the app's window, in a worker of DotAmi's own
  ([`lib/figures/return/`](../lib/figures/return/)); its bytes move into that worker, pdf.js's
  copy is destroyed after each read, and the worker stops when the panel closes. Only lines 8299,
  9368, 9369 and 9946 of each T2125 and their pages are shown; nothing is proposed, written to the
  database or the disk, or logged, and there is no new table, column or browser-storage key.
  Tested by [`tests/figures-return-read.spec.ts`](../tests/figures-return-read.spec.ts).

- **The desktop app's log (`logs/server.log`) now keeps why a start stopped.** Every line is
  written to the disk at once ([`desktop/log.mjs`](../desktop/log.mjs)), so a start that is ended
  or fails part-way still leaves its lines. When the app can't start it writes the message it
  showed the person, which can name the data folder, with the error's name and code; when an
  update to the database file fails it also writes the database's own words about it (which
  update failed and what it objected to, such as a table or a column), never what the person
  typed or an amount. A start made by the updater says so on its first line. Listed on *What
  DotAmi knows about you* ([`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts)); tested by
  [`tests/desktop-startup-log.spec.ts`](../tests/desktop-startup-log.spec.ts). If the log can't
  be opened, the app starts without it.
- **A calendar file, only where the person saves it.** *Add to my calendar* on the settings page
  builds a calendar file (`.ics`) inside the page from the ticked Figure reminders boxes
  ([`lib/figures/calendar.ts`](../lib/figures/calendar.ts),
  [`lib/utils/save-file.ts`](../lib/utils/save-file.ts)). It holds only general words (*"Bring
  your DotAmi figures up to date"*) and one repeating date per box: no amounts, no idea names, no
  figures. Each event's ID is a random UUID made new for every file, so nothing in it identifies
  the person or the computer. DotAmi keeps no copy and no new table, column or browser-storage
  key. In the desktop app, a download refused because it didn't come from DotAmi's own page adds
  one line to `logs/server.log` naming nothing but the refusal
  ([`desktop/main.mjs`](../desktop/main.mjs), `saveDownload`).
- **Typed expense records ([8i], the *Your expenses* page, `/expenses`).** The `Expense` table
  gains: an idea that may be empty ("not attached yet"), the person's own business share (a whole
  percent, kept beside the full amount), a refund's link to the purchase it came from, the GST/HST
  part and a credit note's details. Records the person types stay in that window only (not in the
  data file, not in browser storage) until *Agree to all*; closing the window forgets them. There
  is no field for a bank or card number. The database update rebuilds this one table and nothing
  else ([`prisma/migrations/20261008120000_expenses_typed`](../prisma/migrations/20261008120000_expenses_typed/migration.sql),
  tested by [`tests/desktop-migrate.spec.ts`](../tests/desktop-migrate.spec.ts)).
- **Deleting an idea keeps its expense records** (the maintainer's decision of 2026-10-08). The
  database clears each record's idea instead of deleting the record (`onDelete: SetNull` in
  [`prisma/schema.prisma`](../prisma/schema.prisma)), so the records stay in DotAmi's data file
  on this computer as "not attached yet", with their refund links. *What DotAmi knows about you*
  keeps counting them under *Your expense records*, and the Expenses page lists them under *Not
  attached to an idea yet* ([`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts) `DELETE_MENU`
  `keeps`; tested by [`tests/privacy-delete.spec.ts`](../tests/privacy-delete.spec.ts)). Records
  the person turned down are kept and counted the same way but, as before, no list shows them; the
  Delete menu's warning says so, because its "N stay" count includes them.
- **Delete ([8d]) keeps nothing new.** No new table, column, file or browser-storage key. After
  deleting it rebuilds the data file (SQLite's `VACUUM`) so the deleted rows can't be read back out
  of its free space ([`lib/privacy/delete.ts`](../lib/privacy/delete.ts)). A failed delete or wipe
  adds one line to the log with only the error's name and code, never what was deleted.

### What leaves the computer, and to whom

- **The return reader sends nothing.** pdf.js is given the PDF's bytes, never an address, and
  its own data-file fetches are switched off (`PDF_OPTIONS` in
  [`lib/figures/return/extract.ts`](../lib/figures/return/extract.ts)). The worker it runs in
  is served with its own policy that refuses every connection, DotAmi's own server included
  ([`next.config.mjs`](../next.config.mjs), `workerPolicy`); the browser test tries a fetch from
  inside the worker and the browser refuses it ([`e2e/app.spec.ts`](../e2e/app.spec.ts)).

- **Nothing new is sent by DotAmi.** The calendar file is made in the page and saved by the
  browser or the desktop app; the browser test checks the click makes no request
  ([`e2e/app.spec.ts`](../e2e/app.spec.ts)). If the person imports it into a calendar that syncs
  online, the event text and dates go to the company that runs that calendar; the page says so.

- **The Expenses page sends nothing out.** Its requests go to DotAmi's own server; only an idea's
  id goes in an address, never who was paid, what for or an amount
  ([`app/api/expenses/route.ts`](../app/api/expenses/route.ts)).
- **The expense list can now be read whole.** `GET /api/expenses` with no idea named returns every
  record the page would list (all except turned-down ones), attached to an idea or not: who was
  paid, what for, the amount, the address and GST/HST number. Before, it needed `?venture=<id>`
  and returned one idea's records. Like the other read routes, it answers any program on this
  computer that passes the Host check; that is the same trust as the data file itself, and the
  figures list route still answers one idea at a time
  ([`docs/architecture/figures-privacy-review.md`](architecture/figures-privacy-review.md), "Any
  program on the computer that calls the API").
- **Delete sends nothing out.** Its one request goes from DotAmi's page to DotAmi's own server
  (`POST /api/your-data/delete`) and carries only the ticked kinds and the counts the person saw
  ([`app/api/your-data/delete/route.ts`](../app/api/your-data/delete/route.ts)).

- **Running DotAmi from its source code no longer reports to Next.js or Prisma through the
  project's own commands.** `npm run dev`, `npm run build`, `npm run start` and `npm run lint` now
  start Next.js with `NEXT_TELEMETRY_DISABLED=1` ([`scripts/next.mjs`](../scripts/next.mjs)), so
  Next.js no longer sends its anonymous usage counts to Vercel (`telemetry.nextjs.org`). The
  `prisma:*` scripts already switched off Prisma's check-in (`checkpoint.prisma.io`) since 0.2.0;
  both now share one switch, [`scripts/telemetry-off.mjs`](../scripts/telemetry-off.mjs), which
  sets both variables. CI already set both. Tested by
  [`tests/dev-telemetry.spec.ts`](../tests/dev-telemetry.spec.ts).
- **Still sent when running from source**, because DotAmi's scripts can't reach it:
  - `npx next …` or `npx prisma …` typed by hand, unless the variables are set in the shell.
  - `npm ci` runs `prisma generate` once on its own (the `postinstall` step of `@prisma/client`),
    which checks in with Prisma unless `CHECKPOINT_DISABLE=1` is set in the shell first.
  - `npm run dev` asks npm's registry (`registry.npmjs.org`) which Next.js version is newest each
    time it starts, to warn about an old version. No setting turns this off
    (`node_modules/next/dist/server/dev/hot-reloader-webpack.js`, `getVersionInfo`, read
    2026-10-08). npm sees the computer's internet address; nothing of the person's is sent.
  - Installing (`npm ci`) downloads packages from npm's registry and Prisma's engine files from
    Prisma's server, as any install does.
- None of this applies to the installed desktop app: it runs Next.js's built server and the Prisma
  client, but not `next dev`, `next build`, `next lint` or the Prisma command-line tool, and it
  starts its server with `NEXT_TELEMETRY_DISABLED=1` ([`desktop/main.mjs`](../desktop/main.mjs)).

### Packages that ship

- **`pdfjs-dist` 6.4.299 (Mozilla's pdf.js), pinned exactly.** Apache-2.0. It can reach the
  network (a PDF, character maps, fonts and decoders from addresses it is given, and its own
  worker script); DotAmi gives it no address, turns its data-file fetches off and runs it in the
  worker that can't connect. It is bundled into the page's own script files, not copied into the
  desktop app's server. Reviewed 2026-10-08
  ([`docs/connectors/pdf-reader-review.md`](connectors/pdf-reader-review.md)); listed in
  [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts) (`DEPENDENCIES`, `LIBRARY_IMPORTS`).

### New powers or permissions

- **The page can start one worker of DotAmi's own, the return reader's.** It gets no new
  reach: DotAmi's static script files now carry a policy (`default-src 'none'; script-src
  'self'`) that lets such a worker load DotAmi's own scripts and connect nowhere
  ([`next.config.mjs`](../next.config.mjs)). No worker loaded from those files before.

- **The desktop app can save a file the page makes, where the person picks.** A file made in the
  page (the calendar file, a playbook) opens DotAmi's own Save dialog with the file's name and
  type; only DotAmi's own pages can start a save, and any other download is cancelled without a
  dialog ([`desktop/main.mjs`](../desktop/main.mjs), `saveDownload`; tested by
  [`e2e-desktop/desktop.spec.ts`](../e2e-desktop/desktop.spec.ts)). Before this, Electron's
  built-in dialog handled a playbook save.

- **Attaching an expense record to an idea, or moving it, answers only to DotAmi's own page**
  (`POST /api/expenses/attach`, like agree, take back and turn down), never an agent
  ([`app/api/expenses/attach/route.ts`](../app/api/expenses/attach/route.ts)).
- **DotAmi can now erase data from its own file.** The Delete button on *What DotAmi knows about
  you* empties the ticked kinds (ideas with their links, map progress and figures, keeping their
  expense records as "not attached yet"; figures; expense records; every statement at once;
  settings). Only DotAmi's own page can ask for
  it: the route refuses any other caller, an agent included
  ([`app/api/your-data/delete/route.ts`](../app/api/your-data/delete/route.ts),
  `refuseUnlessFromAppPage`; tested by [`tests/privacy-delete.spec.ts`](../tests/privacy-delete.spec.ts)).
  Statements still can't be edited or deleted one at a time.

### What the person must agree to

- **Reading last year's return needs the person to pick or drop the PDF**, under *Add from last
  year's return*; it only shows lines, so there is nothing to agree to yet. *Close* forgets the
  file.

- **Saving a file in the desktop app needs the Save dialog's answer.** Cancel saves nothing; no
  file is written without the person choosing where. In a browser it is an ordinary download,
  following the browser's own setting.

- **Keeping typed expense records needs *Agree to all N*.** The review lists every typed record,
  ticked; unticked ones stay on the typed list. Records an agent or a file proposes still wait for
  the same click ([`components/expenses/expenses-page.tsx`](../components/expenses/expenses-page.tsx)).
- **Before ideas are deleted, the person is told their expense records stay.** Ticking *Your
  ideas* shows, under the box and again in *Delete these?*, how many expense records stay, that
  they stay as "not attached yet", where they are kept (DotAmi's data file on this computer,
  counted on that page) and how to delete them (tick *Your expense records* too; no single record
  can be deleted yet). That number is checked again when the person confirms: if a record was
  attached to an idea since, nothing is deleted
  ([`components/your-data/delete-menu.tsx`](../components/your-data/delete-menu.tsx),
  [`lib/privacy/delete.ts`](../lib/privacy/delete.ts)).
- **Deleting needs two answers.** The person ticks what to delete, then *Delete these?* lists
  every count and *Delete them now?* says it can't be undone, with focus on Cancel. If anything
  changed in the file since the person looked, nothing is deleted
  ([`components/your-data/delete-menu.tsx`](../components/your-data/delete-menu.tsx),
  [`lib/privacy/delete.ts`](../lib/privacy/delete.ts)).

- No change to what needs a click: an update still installs only after *Restart and update*.
  What changed is when the person hears of it: a notice that a new version is downloading now
  appears as soon as one is found, without blocking the app, and the taskbar button shows the
  download's progress ([`desktop/update-notice.mjs`](../desktop/update-notice.mjs), tested by
  [`tests/desktop-update-notice.spec.ts`](../tests/desktop-update-notice.spec.ts)).

### How to remove it

- Nothing new to remove: the return reader keeps nothing (above).
- **Expense records:** *Take back* and *Turn down* on the Expenses page stop a record counting but
  keep the row. Deleting ideas keeps them too, as "not attached yet". Only the Delete menu's *Your
  expense records* box removes them, all at once; nothing removes a single record yet.
- **The Delete button on *What DotAmi knows about you*** removes ideas, figures, expense records,
  statements and settings from the data file, then wipes the file's free space; if the wipe can't
  run, the page says so and offers to try again. **What it doesn't reach yet**, and the page says
  each (`NOT_CLEARED_BY_DELETE` in [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts)): the
  safety copies in `backups/`, what the desktop window stored in earlier launches, the log,
  anything that already left the computer, and the disk under the data file. The placeholder
  account (`User`) stays (`KEPT_BY_DELETE`).

### What the policy will need to say

- The desktop app's log can hold the location of the data folder and, after a failed database
  update, the database's description of what failed; it holds nothing the person typed.
- People who build DotAmi from its source code: the project's own commands switch off the usage
  reports of the tools it is built with; installing and the development server still contact
  npm's registry, and commands typed by hand report unless the person sets the two variables.
- A calendar file the person saves and imports leaves DotAmi's hands: once in a calendar that
  syncs online, its general reminder text and dates are held by that calendar's company, and
  deleting it is done in that calendar, not in DotAmi.
- A tax return the person drops is read on their computer, in memory, and not kept or sent; only
  four T2125 lines and their pages are shown. The PDF reader is Mozilla's pdf.js, run so it
  can't connect anywhere.
- Deleting an idea in DotAmi does not delete the business expense records attached to it: they
  stay on the person's computer, in DotAmi's data file, as "not attached yet", until the person
  deletes the expense records themselves. DotAmi says so before the idea is deleted.
- Delete removes DotAmi's own copy only: backups the person made, the safety copies in the
  backups folder and anything already shared still hold what was deleted, and the CRA generally
  expects business records to be kept six years, which Delete doesn't change.

### Still open (carried forward until decided)

Decisions the policy depends on. Each is in Part 4 of
[settings-and-edge-cases.md](architecture/settings-and-edge-cases.md#part-4--not-decided-yet-the-maintainers-calls)
unless marked otherwise.

- **Usage sharing.** Decided 2026-10-05: people are asked, and nothing is shared unless they say
  yes. **Not built; nothing is collected.** Still open: what would be sent, where it goes, who sees
  the results (Part 4 §1). Crash reports on their own are open too (§2).
- **A privacy policy and terms of use**, for the app and the landing page, reviewed by a privacy
  professional (including which privacy laws apply) **before anything is collected** and before the
  first download is promoted (§4, §1).
- **Minimum age** — who DotAmi is for, given it handles money and tax (§7).
- **Support channel** — where people ask for help: GitHub Discussions, email, or nothing yet (§8).
- **Uninstalling** — today it leaves the data folder (see 0.2.0); whether to offer deleting it (§6).
- **Accessibility target** — a published standard to test against (§9).
- **Exporting all your data** in an open format, beyond backups (§5).
- **Receipt files** for expense records — decided 2026-10-07 to keep copies in the data folder,
  carried by backups; not built ([figures-privacy-review.md](architecture/figures-privacy-review.md#receipts-still-proposed)).
- **Deleting things.** The Delete menu is built ([8d], above). Still open: clearing the backups
  folder from it, clearing what the desktop window stored in earlier launches, and whether an
  agent may ever delete ([delete-menu.md](ui-spec/your-data/delete-menu.md#cleanup--open-questions)).
- Found while writing this log, not yet raised as decisions: the desktop app's log
  (`logs/server.log`) is appended to and never trimmed, and nothing removes old safety copies in
  `backups/` ([`desktop/main.mjs`](../desktop/main.mjs), [`desktop/migrate.mjs`](../desktop/migrate.mjs));
  and nobody has yet checked what the browser engine inside the desktop app (Electron's Chromium)
  writes to the data folder or requests on its own.

---

## [0.2.1] — 2026-10-08

Your figures, reminders, and the store for expense records ([CHANGELOG](../CHANGELOG.md)).

### What DotAmi keeps, and where

All in the one data file (see 0.2.0 for where it is). Three new tables, listed in
[`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts) and on *What DotAmi knows about you*:

- **Your figures** (`Figure`) — totals about the business that the person typed, read from a file,
  or an agent proposed: the amount, the period, the currency, where it came from (for a file, **its
  file name** and how many rows were added up; [`prisma/schema.prisma`](../prisma/schema.prisma)),
  and the days it was proposed, agreed to and taken back. Turned-down and taken-back figures stay in
  the file with their amounts. Never the file itself.
- **Your settings** (`Setting`) — the first saved choice, *Figure reminders*: which of monthly,
  quarterly and yearly the person ticked, which ideas have their reminder switch on, and which
  reminder banners were answered *Not this time* (as an idea number DotAmi made up and the last day
  of the period). Never an amount or the person's words.
- **Your expense records** (`Expense`) — single business expenses, the one place DotAmi keeps
  single transactions: the day, amount and currency, who it was paid to and what for (the person's
  words), an optional category, seller's address and GST/HST number, where it came from, and its
  state with dates. **No bank or card number** (there is no column for one) and **no receipt file**.
  No screen uses it yet. Review: [figures-privacy-review.md](architecture/figures-privacy-review.md#privacy-review-expense-records-and-receipts-8i),
  design: [expense-records.md](architecture/expense-records.md).
- **Files dropped on "Add from a file"** (Excel, CSV) are read inside the app's window, in memory:
  the bytes never reach DotAmi's server or the disk; only the monthly totals go on to be proposed
  ([figures-privacy-review.md](architecture/figures-privacy-review.md)). A bank or card file is
  turned away unopened.
- **The log is cleaner.** Routes that failed used to write whole error objects, which can quote a
  statement's words or an idea's name, and the database library's own error report could print the
  values it was given; both now write only an error's name and code
  ([`lib/api/log-error.ts`](../lib/api/log-error.ts), [`lib/prisma.ts`](../lib/prisma.ts),
  [`tests/error-logging.spec.ts`](../tests/error-logging.spec.ts)). Lines written by 0.2.0 stay in
  the log (it is never trimmed).
- Browser storage: unchanged (see 0.1.0).

### What leaves the computer, and to whom

- **No new request out.** The same three as 0.2.0: the update check (desktop app), the intake
  sentence (a copy run from source with a model key), and files the person saves.
- **A network check now guards this.** `tests/privacy-inventory.spec.ts` reads the source and fails
  on a request, a network package, a table or a browser-storage key that isn't listed in the
  inventory. It is a safety net, not a proof: what it can't see is listed in the inventory's header.

### Packages that ship

New, each read before it was added ([`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts),
`DEPENDENCIES`):

- `fflate` — unzips spreadsheets; no network code found.
- `read-excel-file` — reads .xlsx; no network code found.
- `papaparse` — reads CSV; **can** fetch an address when asked (`download: true`), which DotAmi
  never asks; its one use is listed for review.
- `ofx-js` 1.1.2 — reads bank OFX/QFX files; pinned exactly and read in full
  ([ofx-reader-review.md](connectors/ofx-reader-review.md)); no screen uses it yet.
- Unchanged: `next`, `react`, `react-dom`, `@prisma/client`, `@anthropic-ai/sdk` (can reach
  Anthropic; used only with a key), and `electron-updater` in the desktop app (reaches GitHub).

### New powers or permissions

- **Agents and other programs can propose, never confirm.** The figures and expense routes accept a
  proposal from any program on the computer that calls DotAmi's local address; agreeing, taking back
  and turning down answer only to DotAmi's own window (`Sec-Fetch-Site: same-origin`; tested in
  [`tests/expenses-store.spec.ts`](../tests/expenses-store.spec.ts) and the figures tests).
- The settings route (`/api/settings`) answers only DotAmi's own window.

### What the person must agree to

- **Every figure is agreed to** in the agree prompt before it counts: grouped by source, amounts
  editable, *Agree* or *No, I'll do it myself*, with *"Double-check what DotAmi did, and how, before
  you agree."* above the buttons. Closing it agrees to nothing.
- **"Add from a file" asks where the file is from**, every time.
- Expense records wait for the same click (no screen for it yet).

### How to remove it

- *Retract* (an agreed figure) or *Discard* (a waiting one) stops it counting; **the row, amount
  included, stays in the data file**. Nothing erases a figure.
- A setting is changed by changing the choice; the row stays. Nothing deletes a setting.
- Nothing in the app removes an expense record.
- *What DotAmi knows about you* lists everything, and says it can't remove anything yet.
- Deleting the data file removes all of it; the safety copies in `backups/` hold everything the
  file held when they were made, retracted figures included.

### What the policy will need to say

- DotAmi keeps business totals and single business expense records the person agreed to keep, in a
  file on their own computer, and never a bank or card number.
- An expense record says who was paid and for what, which can reveal more than a total (a clinic, a
  lawyer); the words are the person's own.
- The name of a file a figure came from is kept with the figure.
- Files dropped into DotAmi are read in the window and not kept.
- Taking back or turning down a figure does not erase it; deletion doesn't exist yet. The policy
  must not promise deletion until it does.
- A program on the person's computer can propose figures and expense records; only the person's
  click in DotAmi's window makes them count.

---

## [0.2.0] — 2026-10-06

The first desktop release: an installer, the update button, backup and restore, and the move from
PostgreSQL to SQLite ([CHANGELOG](../CHANGELOG.md), [desktop-app.md](architecture/desktop-app.md)).

### What DotAmi keeps, and where

- **One SQLite file instead of a PostgreSQL server** (2026-09-28): `prisma/dotami.db` by default
  from source; `dotami.db` in the app's own folder (`%APPDATA%\DotAmi` on Windows) in the desktop
  app. The same five tables as 0.1.0.
- **Beside it, in the desktop app** ([desktop-app.md](architecture/desktop-app.md)):
  - `backups/` — whole copies of the data file, made before each database update and before each
    restore. Nothing removes them.
  - `logs/server.log` — what the app did (starting, updates, backups and restores with the file's
    location). Appended to, never trimmed. **In this version a failing route could write a whole
    error object**, which can quote a statement's words or an idea's name, and the database library's
    error report could print the values it was given; fixed in 0.2.1.
  - The window's browser storage (the three keys below) lives in this folder too
    ([`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts)). What else Electron's browser engine
    writes there (caches) is *not checked*.
- **Backup files** (`.dotami-backup`) wherever the person saves them: the whole database, locked
  with a passphrase (AES-256-GCM) only if the person chooses one. Default: no passphrase.
- **The settings page** reads facts about this copy (where the data file is, whether a model key
  is set; never the key itself) and stores nothing ([`lib/settings/today.ts`](../lib/settings/today.ts)).

### What leaves the computer, and to whom

- **The update check** (desktop app): each time it starts, and on *Help → Check for updates*, it
  asks GitHub Releases for a newer version and downloads it. GitHub sees the computer's internet
  address and which version it runs; none of the person's data. Off for a copy run from source.
- **The intake sentence**: the desktop app never sends it (it removes `ANTHROPIC_API_KEY` from its
  server's environment, [`desktop/main.mjs`](../desktop/main.mjs)). A copy run from source with a
  key sends the sentence to Anthropic, as in 0.1.0.
- **Fonts no longer come from Google** (2026-09-21): they ship with the app. Since then a page
  contacts only DotAmi's own server; a Content-Security-Policy on every page enforces it
  ([`middleware.ts`](../middleware.ts)).
- **Outside links** open in the person's own browser, only when clicked.
- **Developer tools**: Prisma's check-in is off for the `prisma:*` scripts and in CI; the desktop app
  doesn't ship the Prisma CLI. Next.js's telemetry is off in the desktop app, its build and CI, but
  **still on for `npm run dev` and `npm run build` from source** in this version; README and the
  settings page said how to turn it off (switched off by default after 0.2.1, see [Unreleased]).
- **Closed in this version:**
  - Every request whose Host isn't this computer's own name is refused (the DNS-rebinding guard,
    [`lib/http/allowed-host.ts`](../lib/http/allowed-host.ts)). Before it, a web page the person
    visited could read and write DotAmi's data through a rebinding trick (found in testing on
    2026-10-06; [figures-privacy-review.md](architecture/figures-privacy-review.md)).
  - The development server listens on `127.0.0.1` only (2026-09-20); before, anything on the same
    network could reach it.
  - Every write route now has a body-size cap and a rate limit (commit `4d1c18f`); in 0.1.0 only
    the two routes that could call Anthropic (`/api/intent/parse`, `/api/playbook`) had them.
  - Write routes accept only same-origin `application/json` bodies (commit `79a0082`, new in 0.2.0).

### Packages that ship

- `next` 15.5, `react` and `react-dom` 19, `@prisma/client`, `@anthropic-ai/sdk` (reaches Anthropic,
  only with a key).
- **Desktop app**: Electron (its browser engine and Node) and `electron-updater` (reaches GitHub
  Releases). Whether Electron's browser engine makes requests of its own is *not checked*.
- `recharts` removed (nothing used it).

### New powers or permissions

- **The desktop app** writes its data folder, runs its own server on a free port on `127.0.0.1`,
  downloads updates, opens backup and restore dialogs, and opens `https` links in the person's
  browser. The window may write to the clipboard (*Copy path*) and nothing else
  ([`desktop/main.mjs`](../desktop/main.mjs)). Installs per user, no administrator rights.
- **It is not code-signed**: Windows shows "Windows protected your PC" on first install.

### What the person must agree to

- Getting past Windows' warning on first install (*More info → Run anyway*). The installer is one
  click and shows no terms ([`desktop/package.mjs`](../desktop/package.mjs), `oneClick`).
- **Installing an update**: downloaded on its own, installed only after *Restart and update*.
- **A backup passphrase** is optional, after the warning *"lose it and the backup can't be opened —
  nobody can recover it"*.
- **A restore** is confirmed after the backup is checked; a copy of what it replaces is kept.

### How to remove it

- **Uninstalling leaves the data folder** (`deleteAppDataOnUninstall: false`); *File → Open data
  folder* shows it, and deleting it removes everything, backups and log included.
- Nothing in the app deletes an idea or a statement; a link between ideas has a *remove* button.
- Backup files the person saved are theirs: DotAmi doesn't know where they are.

### What the policy will need to say

- Where the data lives (one file in the app's folder), that DotAmi has no server, and that
  uninstalling leaves the data until the person deletes the folder.
- The update check: what GitHub sees, when it happens, and that updates install only on a click.
- Backups hold everything, are unlocked unless the person chooses a passphrase, and a lost
  passphrase can't be recovered.
- The log and the safety copies: what they hold, and that nothing trims them.
- The app is unsigned, and why the person sees Windows' warning.

---

## [0.1.0] — 2026-09-20 (snapshot)

The first public snapshot: a web app run from source, on a PostgreSQL database
(`git show v0.1.0`).

### What DotAmi keeps, and where

- **A PostgreSQL database** the person runs themselves (`prisma/schema.prisma` at `v0.1.0`):
  - `User` — one placeholder account, no sign-in.
  - `PersonStatement` — what the person said about themselves, word for word, dated; never edited
    or summarised.
  - `Venture` — each idea: name, type, province, first- and third-year revenue estimates, structure,
    whether hiring first, tags, a planned capital purchase, employment status, stage, notes.
  - `VentureLink` — links between ideas, with the person's reason.
  - `ScenarioState` — map progress: steps marked active, done or set aside, and branches taken.
- **Browser storage** (the same three keys to this day):
  - `localStorage` `dotami-employment-suggestions` — job descriptions typed under "Other…" on the
    intake, offered back next time; no end date.
  - `sessionStorage` `dotami-journey-v3` — the intake in progress, including the sentence typed and
    the revenue estimates; gone when the tab closes.
  - `sessionStorage` `dotami-person-unsaved` — a statement that couldn't be saved; gone when the tab
    closes.
- **A playbook** the person downloads is a file they save.

### What leaves the computer, and to whom

- **Every page view asked Google for fonts**: `app/globals.css` imported Inter and JetBrains Mono
  from `fonts.googleapis.com`, so Google's servers saw the computer's internet address and browser
  on each visit, although the README said nothing was sent. Fixed the next day (2026-09-21, in 0.2.0).
- **The intake sentence** went to Anthropic when the person set `ANTHROPIC_API_KEY`; otherwise a
  keyword matcher read it on the computer.
- **The optional statute store** ran `python` on its own `lookup.py` when `LAW_STORE_PATH` was set;
  what that program does is outside this repository.
- **Developer tools reported by default**: Next.js telemetry on `next dev`, `next build` and
  `next lint`; Prisma's check-in on every Prisma command.
- **Reachable from the network**: `next dev` listened on every network interface (fixed
  2026-09-20, after the snapshot), and nothing checked the Host a request was addressed to (fixed in
  0.2.0). There was no sign-in. The two routes that could call Anthropic (`/api/intent/parse`,
  `/api/playbook`) had a body-size cap and a rate limit; the other write routes had neither
  (`lib/api/body-limit.ts`, `lib/api/rate-limit.ts` at `v0.1.0`).

### Packages that ship

- `next` 14.2, `react` and `react-dom` 18, `@prisma/client`, `@anthropic-ai/sdk` 0.92 (reaches
  Anthropic, only with a key), `recharts` (listed, not used by any page). No check of each package's
  network use existed yet.

### New powers or permissions

- A server on the person's computer with no sign-in, and the statute store's `python` program.

### What the person must agree to

- Nothing was asked: no prompt, no terms.

### How to remove it

- Nothing in the app deleted an idea or a statement; a link between ideas had a *remove* button.
  Dropping the database removed everything. Browser storage: clearing the site's data.

### What the policy will need to say

- If the policy covers earlier versions: 0.1.0 contacted Google for fonts on every page, and its
  development server could be reached from the local network.
