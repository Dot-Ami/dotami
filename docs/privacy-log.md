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

- **The data file is encrypted in the desktop app ([8i]).** The same rows as before, in `dotami.db`,
  now encrypted page by page (ChaCha20-Poly1305) with a 256-bit key, and its safety copies in
  `backups/` with the same key. One new file, **`database.key`** beside it: the key wrapped by
  Windows' per-user protection (Electron's `safeStorage`), with the key's id; the key itself is
  written nowhere else, never in a backup or the log ([`desktop/database-key.mjs`](../desktop/database-key.mjs)).
  While a file is being encrypted, **`database-encrypting.json`** holds which of DotAmi's own files
  and the step (no data of the person's), and `dotami.db.encrypting` / `dotami.db.plain-to-wipe`
  exist for moments. The plain file is overwritten with zeros, then deleted; on a solid-state disk
  that doesn't promise the old bytes are physically gone, and copies Windows or a synced folder made
  before aren't changed (said in Settings). A copy run from source keeps the file plain and says so.
  Listed in [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts) (`FOLDERS`).
- **No answer from DotAmi's API is kept in a cache on the disk any more ([8i]).** Every `/api/…`
  answer is sent `Cache-Control: no-store` ([`next.config.mjs`](../next.config.mjs)); before, the
  desktop window's Chromium could keep one (a statement's words were found in the `Cache` folder in the
  data folder). The desktop app clears that cache once when it first encrypts the data file.
- **Start a new key moves locked receipts aside, never deletes them ([8i], 2026-10-09).** While the
  desktop app can't open the receipts' key, the person may press *Start a new key…* (asked twice). The
  server then moves every receipt file locked with a key it can't open, and `receipts.key`, into a new
  folder beside the data file, `backups/receipts-locked-<time>/`
  ([`desktop/receipt-key.mjs`](../desktop/receipt-key.mjs) `setAsideLockedReceipts`,
  [`lib/expenses/receipts/new-key.ts`](../lib/expenses/receipts/new-key.ts)), and the next start makes a
  new key as for a missing key file. The `Receipt` rows stay in the data file (their size and SHA-256
  are what the files must match if the old key comes back). No new table, column or browser-storage
  key; the log gets a count only. *What DotAmi knows about you* names the new folder under the safety
  copies and the key file. Tested by [`tests/receipt-key.spec.ts`](../tests/receipt-key.spec.ts),
  [`tests/receipt-new-key.spec.ts`](../tests/receipt-new-key.spec.ts),
  [`e2e/receipt-new-key.spec.ts`](../e2e/receipt-new-key.spec.ts) and the desktop test.

- **HEIC photos as receipts ([8i], 2026-10-09).** A receipt may now also be a HEIC photo (what
  iPhones save), kept exactly as given under a `.heic` name in the same `receipts/` folder, with the
  same 10 MB and pixel caps, encrypted in the desktop app like every receipt (a `.heic` file is one of
  the receipt names the first-start pass and backups go by), backed up, removed and deleted like every
  receipt. DotAmi keeps no converted or decoded copy: the picture exists in the window only while it
  is shown. No new table,
  column or browser-storage key (the `Receipt` row's type is `image/heic`). In the desktop app,
  `logs/server.log` gains at most one line a session when the graphics process stops, or a HEIC can't be
  drawn, saying HEIC receipts won't be drawn until restart (with Electron's one-word reason, such as
  `crashed`; nothing about the receipt). [`lib/expenses/receipts/heic/`](../lib/expenses/receipts/heic/),
  [`desktop/main.mjs`](../desktop/main.mjs); tested by
  [`tests/expenses-receipts.spec.ts`](../tests/expenses-receipts.spec.ts) and
  [`tests/heic-container.spec.ts`](../tests/heic-container.spec.ts).

- **Two more facts on a figure** ([8f]): `Figure.taxYear`, the tax year a T2125 total is for, and
  `Figure.formLine`, the form and line it was read from ("T2125 8299"). Both are empty for every
  figure that existed before, and for revenue figures; a typed T2125 total has a tax year and no form
  line; only a figure read from a tax return may carry a form line, so "as printed on your return"
  is never said of one that wasn't. Four new kinds of figure: business gross income, total expenses,
  net income before adjustments and net income. They sit in the same table and are removed the same
  way as every other figure; "What DotAmi knows about you" lists these figures but does not show their
  tax year and form line yet (a later step) ([`prisma/migrations/20261010120000_figure_tax_line`](../prisma/migrations/20261010120000_figure_tax_line/migration.sql),
  [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts)). Nothing new leaves the computer.

- **A return PDF the person drops ([8f], *Add from last year's return*): nothing is kept.** The
  file is read in memory inside the app's window, in a worker of DotAmi's own
  ([`lib/figures/return/`](../lib/figures/return/)); its bytes move into that worker, pdf.js's
  copy is destroyed after each read, and the worker stops when the panel closes. Only lines 8299,
  9368, 9369 and 9946 of each T2125 and their pages are shown; nothing is proposed, written to the
  database or the disk, or logged, and there is no new table, column or browser-storage key.
  Tested by [`tests/figures-return-read.spec.ts`](../tests/figures-return-read.spec.ts).

- **A GnuCash book the person drops ([8h], *Add from a file*): only the totals they agree to are
  kept.** The book's bytes move into the books worker, which holds on to nothing once it has
  answered and is stopped when the panel closes
  ([`lib/figures/books/read-book.ts`](../lib/figures/books/read-book.ts)); its accounts and posted
  lines live only in the open panel, and which accounts were ticked is not remembered. The
  monthly totals the person reviews and agrees to are stored as figures (the existing `Figure`
  table) with the new source kind `books`, the book's file name as the source's name and how many
  lines were added. No new table, column or browser-storage key; nothing from the book is logged.
  Tested by [`tests/figures-books-review.spec.ts`](../tests/figures-books-review.spec.ts) and the
  browser test in [`e2e/app.spec.ts`](../e2e/app.spec.ts).

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
- **Receipt files ([8i], *Add a receipt* on the Expenses page).** A copy of each receipt the
  person adds to an agreed expense record, exactly as given (whatever is printed on it, such as the
  last digits of a card or a name and address, is in the copy), in a new `receipts/` folder beside the
  data file: `<data folder>/receipts/` in the desktop app, `prisma/receipts/` beside a copy run from
  source. DotAmi names each file itself (32 random hex characters and the extension of the type it
  read from the bytes); the person's file name is never sent or kept. Only JPEG, PNG, WebP and PDF
  (and HEIC, since the HEIC entry at the top of this section), decided from the file's first bytes; at most 10 MB; a picture at most 50 megapixels. A new `Receipt`
  table describes each file: its record, type, size, SHA-256 and the day it was added
  ([`lib/expenses/receipts/`](../lib/expenses/receipts/),
  [`prisma/migrations/20261008180000_receipts`](../prisma/migrations/20261008180000_receipts/migration.sql),
  which adds that one table and touches no other, tested by
  [`tests/desktop-migrate.spec.ts`](../tests/desktop-migrate.spec.ts)). Both are listed on *What
  DotAmi knows about you* ([`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts) `TABLES`,
  `FOLDERS`; the folder was added by hand, since no test finds a new folder on its own). The desktop
  app encrypts the copies (the next entry); a copy run from source doesn't, and says so.
  **Backups hold the receipts** (a new backup format, 2): every receipt file the data file describes
  goes into the backup with it, under the same passphrase when the backup is locked (AES-256-GCM over
  the whole stream, the header and its file list included). A restore brings them back, and moves the
  receipts folder that was here into `backups/` (`receipts-before-restore-<time>`) beside the safety
  copy, so it stays on the computer until the person deletes it. Backups made before this (format 1)
  still restore; they hold no receipts ([`desktop/backup.mjs`](../desktop/backup.mjs), tested by
  [`tests/desktop-backup.spec.ts`](../tests/desktop-backup.spec.ts) and
  [`e2e-desktop/desktop.spec.ts`](../e2e-desktop/desktop.spec.ts)). While a restore is being checked,
  the backup's receipts are unpacked into a staging folder beside the data file
  (`restore-staging.db-receipts`), removed if the person cancels or the backup is refused.
- ***Add from a file*'s Refunds / money out column ([8c-3]) keeps nothing.** It is one more
  optional pick on the panel, never pre-filled: no new table, column, file or browser-storage key.
  What leaves the page is unchanged in kind: the monthly totals, now with any picked refunds taken
  off (a month can be below zero), go to the agree prompt as before, and only the ones the person
  agrees to are kept ([`lib/figures/file/totals.ts`](../lib/figures/file/totals.ts),
  [`lib/figures/refunds.ts`](../lib/figures/refunds.ts)).
- ***Add from a file*'s Status column ([8c-3]) keeps nothing.** It is a pick on the panel only,
  like the Type column: no new table, column, file or browser-storage key, and only the monthly
  totals the person agrees to are kept, as before
  ([`lib/figures/file/totals.ts`](../lib/figures/file/totals.ts)).
- **A "wipe pending" note beside the data file, only while a Delete's wipe is unfinished ([8d]).**
  Delete writes `dotami.db.wipe-pending` (named after the data file) just before it deletes and
  wipes, and removes it once the wipe and any safety copies it was deleting are done. It holds the
  time the Delete started and the file names of safety copies still to delete, nothing the person
  typed and no amount ([`desktop/wipe-pending.mjs`](../desktop/wipe-pending.mjs)). While it is
  there, the desktop app finishes the wipe at its next start and writes one or two lines to
  `logs/server.log` saying how many safety copies it deleted, or that the wipe is still owed with
  the error's code only. Listed on *What DotAmi knows about you*
  ([`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts)).
- **Delete ([8d]) keeps nothing else new.** No new table, column or browser-storage key; its one
  new file is the "wipe pending" note above, and only while a wipe is unfinished. After
  deleting it rebuilds the data file (SQLite's `VACUUM`) so the deleted rows can't be read back out
  of its free space ([`lib/privacy/delete.ts`](../lib/privacy/delete.ts)). A failed delete or wipe
  adds one line to the log with only the error's name and code, never what was deleted.
- **Bank and card accounts ([8g]): a new table, `SourceAccount`, empty until the statement screen
  lands.** Each row holds the person's own name for an account ("Business chequing", "Visa ending
  1234"), which of the statement warning's three buttons they pressed, the day they agreed, and the
  day they took it back. Never an account, card, bank, branch or transit number, a file name, or a
  scrambled copy (hash) of any of them: a name with a run of four or more digits is refused unless
  it is "ending" and four digits at the end, counting digits split by anything but a letter (spaces, dashes, commas, brackets, accent marks), and digits
  of any script, as one run ([`lib/figures/source-account-name.ts`](../lib/figures/source-account-name.ts)).
  "Always allow every account" will be kept as the moment it was pressed, inside the
  `bank-records` setting (the `Setting` table). Nothing can add an account yet: the setting stays
  *planned* and the route refuses while it is
  ([`lib/figures/source-accounts.ts`](../lib/figures/source-accounts.ts)). Listed on *What DotAmi
  knows about you*, which counts the accounts and never shows their names
  ([`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts)); tested by
  [`tests/bank-sources.spec.ts`](../tests/bank-sources.spec.ts).
- **Receipt files are encrypted in the desktop app ([8i], decided 2026-10-09).** Each file in
  `receipts/` is AES-256-GCM-encrypted with one random key per data folder, the file's id
  authenticated with it ([`desktop/receipt-crypto.mjs`](../desktop/receipt-crypto.mjs)). The key is
  kept only in a new file beside the data file, `receipts.key`, wrapped by Electron's `safeStorage`
  (DPAPI for the person's Windows account; Electron keeps its own DPAPI-protected key in the data
  folder's `Local State` file); the file also holds the key's id (the first 8 bytes of its SHA-256,
  not secret) ([`desktop/receipt-key.mjs`](../desktop/receipt-key.mjs)). The key is never written
  anywhere else: not in the data file, not in a backup, not in the log. While the app runs it is in
  the memory of its main process and its server, which gets it in its environment and removes it
  from there on first read ([`lib/expenses/receipts/lock.ts`](../lib/expenses/receipts/lock.ts)).
  The key file is written only once Electron's own key is in `Local State` (Chromium writes it about
  ten seconds after start), so the very first start of a new data folder waits about that long.
  Receipts kept before this version are encrypted at the first start, crash-safe, including the
  receipts folders earlier restores moved into `backups/`. A key file Windows can't open, when no
  receipt is encrypted, is moved to `backups/receipts-key-unreadable-<time>.key` (never deleted)
  and a new one made; while any receipt is encrypted, a key file that can't be opened, a missing
  `receipts.key` or a key store that isn't available changes nothing on the disk and makes no key, and
  the pages say so in amber. A restore whose last step fails puts the old key file back. **Not encrypted:** the data file itself (every expense record, and each
  receipt's kind, size, fingerprint and day added), the safety copies, the log, and a copy run from
  source, which has no key store and keeps receipts plain; Settings and *What DotAmi knows about you*
  say each. Listed in [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts) `FOLDERS`
  (`receipts-key`). *What DotAmi knows about you* now reads the first few bytes of each receipt file
  (never more) to count how they are kept. Design and threat model:
  [expense-records.md § 9](architecture/expense-records.md#9-encrypting-the-receipts-the-design-2026-10-09).
  **Backups** hold each receipt's own bytes, decrypted, so they restore on another computer; a
  restore encrypts them with that computer's key as they are unpacked, so nothing is staged
  unencrypted. The backup format is unchanged.

### What leaves the computer, and to whom

- **Showing a HEIC receipt sends nothing off the computer.** DotAmi's own reader opens the photo in a
  worker under the same no-connection policy as the PDF viewer's, and the picture data inside goes,
  through the browser's video decoder, to this computer's graphics driver (or, on a Mac, the operating
  system's decoder), which decodes it on the graphics chip
  ([`lib/expenses/receipts/viewer/draw-heic.ts`](../lib/expenses/receipts/viewer/draw-heic.ts); the
  path in full is in [the decoder review](connectors/heic-decoder-review.md#corrections-from-the-double-check-2026-10-09)).
  The worker's policy is unchanged; the browser tests check the viewer makes one request, to DotAmi's
  own server ([`e2e/receipt-viewer.spec.ts`](../e2e/receipt-viewer.spec.ts)).

- **The return reader sends nothing.** pdf.js is given the PDF's bytes, never an address, and
  its own data-file fetches are switched off (`PDF_OPTIONS` in
  [`lib/figures/return/extract.ts`](../lib/figures/return/extract.ts)). The worker it runs in
  is served with its own policy that refuses every connection, DotAmi's own server included
  ([`next.config.mjs`](../next.config.mjs), `workerPolicy`); the browser test tries a fetch from
  inside the worker and the browser refuses it ([`e2e/app.spec.ts`](../e2e/app.spec.ts)).

- **The books reader sends nothing out.** Its worker runs under the same policy, and the browser
  test checks a fetch from inside it is refused. The one request is from DotAmi's page to
  DotAmi's own server, `POST /api/figures/propose`, carrying only the monthly totals, the file's
  name and line counts: never an account name, a transaction or the book
  ([`e2e/app.spec.ts`](../e2e/app.spec.ts) checks every request the page makes).

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
- **A receipt goes nowhere but DotAmi's own server.** The window sends its bytes as base64 to
  `POST /api/expenses/receipt` on this computer; no address carries anything about it, the file's
  name is not sent, and no route sends a receipt's bytes back out
  ([`app/api/expenses/receipt/route.ts`](../app/api/expenses/receipt/route.ts)). The record list
  (`GET /api/expenses`, which any program on the computer can call, agents included) does say
  whether a record has a receipt, and its kind, size and day added; never its bytes, its
  fingerprint, its id or where it is ([`lib/expenses/store.ts`](../lib/expenses/store.ts)
  `rowToExpense`).
- **Showing a receipt sends nothing out.** *Show receipt* asks DotAmi's own server for the bytes
  (`POST /api/expenses/receipt/file`, page-only), shows a picture from a `blob:` address of the page's
  own, and draws a PDF in a worker whose policy refuses every connection; nothing a PDF asks for (a
  link, a form submit, a font, a picture) is fetched, and its JavaScript never runs
  ([`lib/expenses/receipts/viewer/`](../lib/expenses/receipts/viewer/), tested with hostile files by
  [`e2e/receipt-viewer.spec.ts`](../e2e/receipt-viewer.spec.ts)).
- **Delete sends nothing out.** Its one request goes from DotAmi's page to DotAmi's own server
  (`POST /api/your-data/delete`) and carries only the ticked kinds and the counts the person saw
  ([`app/api/your-data/delete/route.ts`](../app/api/your-data/delete/route.ts)).

- **The bank and card accounts list sends nothing out.** Its requests go from DotAmi's page to
  DotAmi's own server (`GET` and `POST /api/figures/bank-sources`, `POST
  /api/figures/bank-sources/retire`) and carry only an account's name, which button was pressed and
  an id; any other caller, an agent included, is refused
  ([`app/api/figures/bank-sources/route.ts`](../app/api/figures/bank-sources/route.ts)).

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
- **Encrypting the receipts sends nothing anywhere ([8i]).** The key is made with Node's own
  `crypto.randomBytes` and wrapped by Windows on this computer; nothing about it, or any receipt, is
  sent. The privacy scan finds no new request.

### Packages that ship

- **`better-sqlite3-multiple-ciphers` 13.0.3 and `@prisma/adapter-better-sqlite3` 6.19.3, pinned
  exactly ([8i]).** The database now reads and writes through Prisma's adapter and this package:
  SQLite 3.53.4 with SQLite3 Multiple Ciphers 2.4.0, an encryption extension, as one prebuilt file for
  each kind of computer (MIT; the C code it is built from is public domain, MIT, BSD-3-Clause and
  CC0-or-Apache-2.0, with no LGPL or GPL; its notices are copied into `THIRD-PARTY-NOTICES.txt` from the
  C source, word for word, by [`desktop/notices.mjs`](../desktop/notices.mjs)). Network: none found
  (its JavaScript requires only node's `fs`, `path` and `util`; the Windows file imports only
  `node.exe` and `KERNEL32.dll`); no install script, and it isn't compiled when it installs (the
  lockfile keeps its `"gypfile": false`, which `npm ci` would otherwise lose; compiling would download
  Node's headers). `package.json` names it `better-sqlite3`, the
  name the adapter loads, and [`tests/database-package.spec.ts`](../tests/database-package.spec.ts)
  fails if the real `better-sqlite3` (no encryption, and a download when it installs) is ever
  installed instead. The desktop app's server carries only the Windows x64 file (2.4 MB; the other
  seven are left out by [`desktop/left-out.mjs`](../desktop/left-out.mjs)). Reviewed 2026-10-09
  ([the review](connectors/better-sqlite3-multiple-ciphers-review.md)); listed in
  [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts) (`DEPENDENCIES`). **Nothing is encrypted
  by this change**, and nothing new is kept or sent: the same file holds the same rows, dates stored
  the same way ([`tests/db-dates.spec.ts`](../tests/db-dates.spec.ts)). The adapter's debug output
  prints query values when the `DEBUG` environment variable names it: the desktop app removes `DEBUG`
  from its server's environment ([`desktop/main.mjs`](../desktop/main.mjs) `serverEnv`;
  `e2e-desktop/desktop.spec.ts` checks the log).
- **HEIC photos add no package.** The container reader is DotAmi's own code; the decoder is the
  graphics driver's, reached through Chromium's WebCodecs, which Electron already ships. Not new: the
  Electron build DotAmi has always shipped includes Chromium's HEVC parser and hardware-assist decoding
  code, and ffmpeg with H.264 and AAC; whether that raises a patent question before DotAmi is sold is
  listed for a lawyer in [the decoder review](connectors/heic-decoder-review.md#questions-for-a-software-patent-lawyer-before-dotami-is-sold).

- **`pdfjs-dist` 6.4.299 (Mozilla's pdf.js), pinned exactly.** Apache-2.0. It can reach the
  network (a PDF, character maps, fonts and decoders from addresses it is given, and its own
  worker script); DotAmi gives it no address, turns its data-file fetches off and runs it in the
  worker that can't connect. It is bundled into the page's own script files, not copied into the
  desktop app's server. Reviewed 2026-10-08
  ([`docs/connectors/pdf-reader-review.md`](connectors/pdf-reader-review.md)); listed in
  [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts) (`DEPENDENCIES`, `LIBRARY_IMPORTS`).
- **No package added or removed; the installer now carries a list of them.** `THIRD-PARTY-NOTICES.txt`
  (beside `DotAmi.exe`, and in the server's folder) names every package, font and piece of bundled
  code by others that ships, with its version, licence and licence text, written from the packages
  at build time ([`desktop/notices.mjs`](../desktop/notices.mjs)); the new `/licences` page and
  Help → Licences show it. It is a text file the app reads from its own folder: nothing is kept
  about the person, nothing is sent, and the page asks nothing. The list also shows what the
  installer already carried without being named before, among them TypeScript and the image
  library sharp (with libvips, LGPL-3.0-or-later) that Next's file tracer copies into the server.
- **Ten packages removed from the desktop app's server; nothing added.** The build now deletes
  sharp, its prebuilt builds with libvips (`@img/sharp-win32-x64`, `@img/sharp-wasm32` and, on other
  systems, `@img/sharp-libvips-*`), `@img/colour`, `detect-libc`, `@emnapi/runtime`, `typescript`,
  `source-map-support`, `buffer-from` and `source-map` from the server it ships
  ([`desktop/left-out.mjs`](../desktop/left-out.mjs), [`desktop/build.mjs`](../desktop/build.mjs)):
  Next's file tracer copied them in, but only Next's image optimiser loads sharp and only Next's
  build loads TypeScript, and the rest are what those two pull in. The desktop build switches the
  image optimiser off ([`next.config.mjs`](../next.config.mjs)), so `/_next/image` answers 404. The
  server is 89.1 MB → 59.4 MB, the installed app 476.7 MB → 446.8 MB and the installer
  133.8 MB → 126.1 MB (0.2.1 built on Windows, 2026-10-08). The notices file drops their entries
  (183 → 172, semver with them: only sharp named it), and with them the only LGPL-licensed code it
  listed. The build stops if the app's own server code or a
  package that stays needs one of them; `e2e-desktop/desktop.spec.ts` fails if one comes back into
  the built or packaged server, and drives the app without them. A copy run from the source code
  still installs sharp with Next, as before.
- **No new package for encrypting the receipts ([8i]).** It uses Node's own `crypto` (AES-256-GCM,
  SHA-256, random bytes) and Electron's own `safeStorage`, both already in the app.

### New powers or permissions

- **A page-only route that moves receipt files ([8i]).** `POST /api/expenses/receipt/new-key`
  ([`app/api/expenses/receipt/new-key/route.ts`](../app/api/expenses/receipt/new-key/route.ts)) answers
  only DotAmi's own window (an agent or another program gets 403 and nothing moves), reads its body
  through `readJsonWithLimit`, needs `{ giveUp: true }`, and does anything only while the receipts' key
  can't be opened. It moves files within the data folder; it deletes nothing and sends nothing.
- **A second, small window at a first start ([8i]).** "Preparing DotAmi…"
  ([`desktop/preparing.html`](../desktop/preparing.html)) is a local page with no script and a
  Content-Security-Policy of `default-src 'none'`, listed with the app's other local loads in
  [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts) `LOCAL_REQUESTS`. It shows nothing of the
  person's and reaches nothing.
- **The receipt viewer can start a third worker of DotAmi's own, for HEIC photos**, under the same
  no-connection policy ([`lib/expenses/receipts/viewer/heic-picture.worker.ts`](../lib/expenses/receipts/viewer/heic-picture.worker.ts)),
  and through it ask the computer's graphics chip to decode the photo, only when the person clicks
  *Show receipt*. The desktop window gains a preload ([`desktop/window-preload.cjs`](../desktop/window-preload.cjs))
  that gives DotAmi's pages two calls and nothing else ("has a HEIC failed, or the graphics process
  stopped, since DotAmi started?" and "a HEIC just failed"), believed only from DotAmi's own window; the
  main process now listens for the graphics process stopping (`child-process-gone`). The window stays
  sandboxed, and a test fails if anything turns a sandbox off
  ([`tests/desktop-sandbox.spec.ts`](../tests/desktop-sandbox.spec.ts)).

- **The page can start one worker of DotAmi's own, the return reader's.** It gets no new
  reach: DotAmi's static script files now carry a policy (`default-src 'none'; script-src
  'self'`) that lets such a worker load DotAmi's own scripts and connect nowhere
  ([`next.config.mjs`](../next.config.mjs)). No worker loaded from those files before.

- **A second worker, the books reader's ([8h]),** under the same policy, so it connects nowhere
  either (the browser test tries a fetch from inside it and the browser refuses it,
  [`e2e/app.spec.ts`](../e2e/app.spec.ts)). It reads a GnuCash book and is stopped after a
  minute, or when the panel closes ([`lib/figures/books/read-book.ts`](../lib/figures/books/read-book.ts)).

- **The desktop app can save a file the page makes, where the person picks.** A file made in the
  page (the calendar file, a playbook) opens DotAmi's own Save dialog with the file's name and
  type; only DotAmi's own pages can start a save, and any other download is cancelled without a
  dialog ([`desktop/main.mjs`](../desktop/main.mjs), `saveDownload`; tested by
  [`e2e-desktop/desktop.spec.ts`](../e2e-desktop/desktop.spec.ts)). Before this, Electron's
  built-in dialog handled a playbook save.

- **Attaching an expense record to an idea, or moving it, answers only to DotAmi's own page**
  (`POST /api/expenses/attach`, like agree, take back and turn down), never an agent
  ([`app/api/expenses/attach/route.ts`](../app/api/expenses/attach/route.ts)).
- **DotAmi's server can now write files beside the data file, and delete them**, but only the
  receipt files it named itself: adding and removing a receipt answer only DotAmi's own page, never an
  agent (`refuseUnlessFromAppPage`), and the sweep that removes receipt files no record describes
  never touches a file it didn't name ([`lib/expenses/receipts/store.ts`](../lib/expenses/receipts/store.ts),
  tested by [`tests/expenses-receipts.spec.ts`](../tests/expenses-receipts.spec.ts)). The server stores
  a receipt's bytes and never decodes or runs them; for a HEIC photo it reads the container's
  structure with DotAmi's own bounded reader to learn the picture's size, and nothing more.
- **The page can start a second worker of DotAmi's own, the receipt viewer's**, which runs pdf.js
  to draw a PDF receipt's pages, under the same no-connection policy as the return reader's
  ([`lib/expenses/receipts/viewer/pdf-pages.worker.ts`](../lib/expenses/receipts/viewer/pdf-pages.worker.ts),
  listed in `LIBRARY_IMPORTS`). Reading a receipt's bytes answers only DotAmi's own page, never an
  agent, and the page's policy now refuses frames (`frame-src 'none'` in
  [`middleware.ts`](../middleware.ts)), so no receipt can reach Chromium's built-in PDF viewer.
- **DotAmi can now erase data from its own file.** The Delete button on *What DotAmi knows about
  you* empties the ticked kinds (ideas with their links, map progress and figures, keeping their
  expense records as "not attached yet"; figures; expense records; every statement at once;
  settings). Only DotAmi's own page can ask for
  it: the route refuses any other caller, an agent included
  ([`app/api/your-data/delete/route.ts`](../app/api/your-data/delete/route.ts),
  `refuseUnlessFromAppPage`; tested by [`tests/privacy-delete.spec.ts`](../tests/privacy-delete.spec.ts)).
  Statements still can't be edited or deleted one at a time.
- **The desktop app uses Windows' per-account protection for one secret ([8i]).** `safeStorage`
  (DPAPI) wraps the receipts' key at the first start and unwraps it at each start. On Windows this
  asks nothing of the person. (On a Mac, Electron uses the Keychain, which can ask the person to allow
  it; there is no Mac build.) No other new power: the server still can't reach anything new.

### What the person must agree to

- **Before an existing data file is first encrypted ([8i]),** a window says what it protects (an
  administrator account while the person is signed out, a copy of the folder, the disk read outside
  Windows), what it doesn't (anything running as the person; copies already made), that a lost key
  loses everything not in a backup, and that an older DotAmi can't open the file afterwards; with
  **Back up first…**, **Encrypt now**, **Not now** and **Never…** (a second warning first:
  [`desktop/encrypt-ask.html`](../desktop/encrypt-ask.html)). Settings → Data and backups has an
  **Encrypt the data file** switch (on by default; turning it off asks first). A new data folder is
  encrypted without asking. The log records that the window was shown and which button was pressed.
- **Giving up receipts locked with a lost key is asked twice ([8i]).** The first ask says that a new
  key can't open them, so they are given up for good unless the old key comes back, that nothing is
  deleted and where they go, and to restore a backup instead if there is one; the second asks again.
  Cancel is focused on both, and cancelling either changes nothing
  ([`components/expenses/start-new-key.tsx`](../components/expenses/start-new-key.tsx)).
- **Adding a HEIC receipt** asks nothing new: the note before *Choose the receipt file* now names HEIC,
  and says some computers can't show one, and that it is kept either way.

- **Reading last year's return needs the person to pick or drop the PDF**, under *Add from last
  year's return*; it only shows lines, so there is nothing to agree to yet. *Close* forgets the
  file.

- **A file with two-digit years needs one answer before any totals show** ([8c-3]): "Is 05 the
  year 2005?" on *Add from a file*. The answer only says how to read that file's dates; it is held
  in the panel for that file and never stored, sent or remembered for the next file
  ([`components/ventures/file-drop.tsx`](../components/ventures/file-drop.tsx),
  [`lib/figures/file/preview.ts`](../lib/figures/file/preview.ts)). Every preview now also shows
  the earliest and latest date read, for the person to check before they review the figures;
  agreeing is unchanged.

- **A figure from a GnuCash book needs the same three steps as one from a spreadsheet**: the
  person answers *Accounting software or a spreadsheet you keep*, picks or drops the book, and
  presses *Agree* in the agree prompt after *Review*. The accounts GnuCash marks as income start
  ticked, and every tick is the person's to change before anything is proposed
  ([`components/ventures/books-drop.tsx`](../components/ventures/books-drop.tsx)).

- **The dates must be confirmed before Review** ([8c-3]): on *Add from a file*, the person ticks
  *These dates are right* (or *These months are right*, for a report with the months across the
  top) beside the line saying which dates were read; until then *Review* can't be pressed. The tick
  is emptied whenever another file, date column, date order or century answer changes the dates
  read. It is held in the panel only, never stored, sent or remembered for the next file
  ([`components/ventures/file-drop.tsx`](../components/ventures/file-drop.tsx),
  [`lib/figures/file/preview.ts`](../lib/figures/file/preview.ts) `followDatesCheck`). Nothing new
  is kept or sent; the agree prompt that follows is unchanged.

- **A report with the months across the top asks how it is laid out** ([8c-3]): on *Add from a
  file*, "The file has" (one row per sale, or months across the top), "Month names are in row"
  and "Totals come from" (every row, or one row). Like the other pickers, the answers only say how
  to read that file; they are held in the panel and never stored, sent or remembered for the next
  file ([`components/ventures/file-drop.tsx`](../components/ventures/file-drop.tsx),
  [`lib/figures/file/across.ts`](../lib/figures/file/across.ts)). Only the monthly totals the
  person reviews and agrees to are kept, exactly as before; nothing new is kept or sent. For these
  reports the figures are kept without a row count (one client row goes into every month, so a
  count added up across months would mislead): slightly less is kept, never more.

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
- **Deleting the safety copies is its own tick-box, with a warning.** It is never ticked for the
  person; the box, the first ask and the second ask each say that afterwards only a backup saved
  somewhere else could bring anything back
  ([`components/your-data/delete-menu.tsx`](../components/your-data/delete-menu.tsx)).
- **Adding a receipt needs the person to choose the file**, after a note that the copy is kept
  exactly as given and what is accepted; a file DotAmi doesn't keep is refused in the window and
  nothing is sent. *Remove receipt* asks once ([`components/expenses/receipt-line.tsx`](../components/expenses/receipt-line.tsx)).
- **Deleting needs two answers.** The person ticks what to delete, then *Delete these?* lists
  every count and *Delete them now?* says it can't be undone, with focus on Cancel. If anything
  changed in the file since the person looked, nothing is deleted
  ([`components/your-data/delete-menu.tsx`](../components/your-data/delete-menu.tsx),
  [`lib/privacy/delete.ts`](../lib/privacy/delete.ts)).

- **Reading a bank or card statement will need two warnings, and their words are now fixed**
  ([8g]; the maintainer's decision, 2026-10-07): the setting's own warning before *Bank and card
  records* is turned on, and before a statement from an account not always allowed, *Before DotAmi
  reads a bank or card statement*, with *Allow once*, *Always allow this account*, *Always allow
  every account* and *Cancel* (`BANK_STATEMENT_WARNING` in
  [`lib/settings/catalog.ts`](../lib/settings/catalog.ts), word for word in Part 1 of
  [settings-and-edge-cases.md](architecture/settings-and-edge-cases.md)). Neither is shown yet: the
  setting stays *planned*, with no switch, until the statement screen exists. Taking an account
  back in Settings asks once (*Yes, take it back* or *Keep it*).

- No change to what needs a click: an update still installs only after *Restart and update*.
  What changed is when the person hears of it: a notice that a new version is downloading now
  appears as soon as one is found, without blocking the app, and the taskbar button shows the
  download's progress ([`desktop/update-notice.mjs`](../desktop/update-notice.mjs), tested by
  [`tests/desktop-update-notice.spec.ts`](../tests/desktop-update-notice.spec.ts)).
- **Nothing new to agree to for encrypted receipts ([8i]).** It is on in the desktop app with no
  choice to make (the maintainer's decision of 2026-10-09); there is no setting.

### How to remove it

- **`database.key` ([8i])** is never removed or replaced by DotAmi while anything is encrypted with
  it; deleting it by hand (or a Windows profile reset) loses everything in the data file except what
  a backup holds, and DotAmi then says so and changes nothing. Once encrypted, the file isn't
  decrypted again by DotAmi; Delete works on it as before.
- **Receipts set aside by Start a new key ([8i])** stay in `backups/receipts-locked-<time>/` until the
  person deletes that folder with DotAmi closed; the Delete menu doesn't reach it (it says so, beside
  the receipts folders a restore moves there).
- **HEIC receipts** are removed like every receipt (*Remove receipt*, or Delete's *Your receipts* /
  *Your expense records*); there is no decoded copy to remove.

- Nothing new to remove: the return reader keeps nothing (above).
- **Expense records:** *Take back* and *Turn down* on the Expenses page stop a record counting but
  keep the row. Deleting ideas keeps them too, as "not attached yet". Only the Delete menu's *Your
  expense records* box removes them, all at once; nothing removes a single record yet.
- Figures agreed from a GnuCash book are ordinary figures: *Retract* on the ideas page and the
  Delete button's "figures" box remove them like any other. Nothing else from the book is kept.
- **Receipts:** *Remove receipt* on a record (agreed or taken back) deletes its row and its file; the
  Delete menu's *Your receipts* box removes them all and keeps the records, and *Your expense records*
  takes the receipts with the records. Deleting ideas keeps both. A file that couldn't be removed at
  once is removed the next time a receipt is added or deleted. A removed file's bytes can stay on the
  disk until written over, which the menu says. The receipts folder a restore moved into `backups/` is
  not touched by Delete, even with *Safety copies in the backups folder* ticked (that box deletes
  only DotAmi's `dotami-before-….db` copies); the menu says so.
- **The Delete button on *What DotAmi knows about you*** removes ideas, figures, expense records,
  statements and settings from the data file, then wipes the file's free space; if the wipe can't
  run, the page says so and offers to try again. **What it doesn't reach yet**, and the page says
  each (`NOT_CLEARED_BY_DELETE` in [`lib/privacy/inventory.ts`](../lib/privacy/inventory.ts)): the
  safety copies in `backups/`, what the desktop window stored in earlier launches, the log,
  anything that already left the computer, and the disk under the data file. The placeholder
  account (`User`) stays (`KEPT_BY_DELETE`).
- **Delete can now remove the safety copies in `backups/`** (the tick-box *Safety copies in the
  backups folder*). It removes only the files DotAmi names its own copies (`dotami-before-….db`)
  directly in that folder, never a file through a link, and leaves anything else the person put
  there. A deleted copy's file is removed, not overwritten, so the disk can still hold its pieces
  (the menu says so). A wipe or a copy that couldn't be finished is finished at the desktop app's
  next start, and only then: an ordinary start does nothing here
  ([`desktop/main.mjs`](../desktop/main.mjs), tested by
  [`e2e-desktop/desktop.spec.ts`](../e2e-desktop/desktop.spec.ts)). Still not reached: what the
  desktop window stored in earlier launches, the log, anything that already left the computer, and
  the disk under the data file.
- **Bank and card accounts:** *Take back* beside an account in Settings stops it being used, but
  its row (the name and days) stays in the data file. Delete, with *Your bank and card accounts*
  ticked, erases every account, taken back or not. Figures read from an account's statements are
  not removed with it (nothing links a figure to its account yet), and "Always allow every
  account" goes with *Your settings*.
- **The receipts' key file (`receipts.key`) is never removed by DotAmi ([8i]),** not by Delete and
  not by uninstalling (the data folder stays). Deleting it, or `Local State`, by hand loses every
  receipt encrypted with it, except those in a backup; Delete's *Your receipts* removes the receipts
  themselves.

### What the policy will need to say

- **Encryption at rest ([8i])** protects against an administrator account while the person is signed
  out, a copied or synced data folder, and a disk read outside Windows; not against anything running
  as the person, and only as strong as the Windows password. Losing the key loses the data except what
  a backup holds. Backups hold the data decrypted (so they restore elsewhere); an older version can't
  open an encrypted file.
- A HEIC photo added as a receipt is kept as given. Showing it hands the picture data to the person's
  own graphics driver or operating system to decode, on their computer; nothing is sent elsewhere, and
  DotAmi keeps no decoded copy. Keeping graphics drivers and the operating system up to date is part of
  keeping that safe, and is the person's (or their computer maker's) to do.

- A receipt is a copy of the person's own file, kept as given: it can hold their name, address,
  the last digits of a card or another person's details, which DotAmi never asks for and cannot
  remove. It stays on the computer, encrypted by the desktop app (not by a copy run from source); a
  backup carries it, locked only if the person set a passphrase for that backup.
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
- Delete removes DotAmi's own copy only: backups the person made and anything already shared
  still hold what was deleted, and so do the safety copies in the backups folder unless the person
  ticks them, and the CRA generally
  expects business records to be kept six years, which Delete doesn't change.
- A GnuCash book the person drops is read on their computer, in memory, in a worker that can't
  connect anywhere, and is not kept or sent; only the monthly totals of the accounts they tick,
  and agree to, are stored, as figures from "Books / file".
- The names people give their bank and card accounts are kept in the data file, with the day
  they agreed to the warning and the day they took the account back; "ending" and four digits is
  the most of a number a name may hold. DotAmi never keeps the account or card number itself.
- In the desktop app, receipt files are encrypted on the computer with a key only the person's
  Windows account can open. Other standard accounts are already kept out of the data folder by
  Windows' folder permissions; what encryption adds is protection from an administrator account,
  copies of the folder and a disk read outside Windows, not from programs the person runs (or an
  administrator runs as them). The data file is not encrypted. A backup
  without a passphrase holds the receipts unencrypted. Losing the key (a Windows profile reset) loses
  the receipts except those in a backup. A copy run from source doesn't encrypt them.

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
- **Encrypting the database file** — the maintainer said yes on 2026-10-09, and on 2026-10-10 chose
  how: the package above (installed, and measured first), backups only plus a "Start fresh" button
  when the key is lost, a passphrase required on every backup, and a person free to say "Not now" or
  "Never" (with a switch in Settings). Being built in stacked pull requests; until they merge the data
  file still relies on the computer's disk encryption. If built as designed,
  DotAmi would keep one new file, `database.key` (a random key wrapped by Windows' per-user
  protection), and ship one native package; a backup without a passphrase would still hold the data
  unencrypted, a lost key would lose everything not in a backup, and an older DotAmi couldn't open
  the file (going back would need a backup). It would add one thing the person must agree to: a
  window before an existing data file is first encrypted, saying what changes and what a lost key
  costs, with **Back up first…** and **Encrypt now** (whether it also offers **Not now** is one of the
  questions). Waiting for the maintainer's choice of package, of what happens when the key is lost,
  and of whether a person may decline
  ([database-encryption.md](architecture/database-encryption.md), its § 12;
  [the privacy review](architecture/figures-privacy-review.md#privacy-review-encrypting-the-database-file-design-2026-10-09-not-built)).
- **Deleting things.** The Delete menu is built ([8d], above), and can clear the safety copies in
  the backups folder. Still open: clearing what the desktop window stored in earlier launches, and
  whether an agent may ever delete ([delete-menu.md](ui-spec/your-data/delete-menu.md#cleanup--open-questions)).
- Found while writing this log, not yet raised as decisions: the desktop app's log
  (`logs/server.log`) is appended to and never trimmed, and nothing removes old safety copies in
  `backups/` by itself, only the person through Delete ([`desktop/main.mjs`](../desktop/main.mjs),
  [`desktop/migrate.mjs`](../desktop/migrate.mjs));
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
