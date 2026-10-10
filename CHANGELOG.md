# Changelog

Every catalog entry carries its own `lastVerified` date — the day a human read its source.
This file is the other half: what changed in the project between snapshots. A version here is
a dated snapshot, not a promise of stability.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **DotAmi restarts by itself after *Start a new key*** ([8i]) — once the locked receipts are moved
  aside, the page says where they went and "DotAmi will restart now to start the new key…", and the
  desktop app closes and opens again by itself, making the new key on the way up. You no longer have
  to close it and open it again. If the restart doesn't happen, nothing is lost: the files were already
  moved, the page says to close DotAmi and open it again, and the next start makes the key. A copy run
  from source doesn't restart by itself, and says so.
- **Delete can clear the receipts DotAmi set aside** ([8i]) — the Delete menu's *Safety copies in the
  backups folder* box now also clears the receipt folders DotAmi set aside there:
  `receipts-locked-…` (from *Start a new key*) and `receipts-before-restore-…` (from a restore). The
  box counts them, and once ticked it warns, there and at both asks, that afterwards those receipts can
  never be opened, even if the old key comes back. Only the files DotAmi put in them are deleted; a
  file of yours in one stays. A folder that can't be cleared yet (another program has a file open) is
  finished by *Finish it now* or the next time the desktop app starts. *What Delete doesn't reach* no
  longer lists them; it now names the key files set aside on their own
  (`receipts-key-unreadable-….key`), which Delete still leaves. With the box unticked, the first
  "are you sure" step says the set-aside receipt folders still hold their receipt files.
- **Start a new key for your receipts** ([8i]) — when the desktop app can't open the key your
  receipts are locked with (a Windows profile reset, a data folder from another account or computer,
  a deleted `receipts.key`), Settings, *What DotAmi knows about you* and the Expenses page now offer
  *Start a new key…* under the amber line, besides putting the key back, restoring a backup or
  deleting the receipts. It asks twice, saying first that the locked receipts are given up for good
  unless the old key comes back. Nothing is deleted: the locked receipt files and the old key file are
  moved into a new folder in the backups folder, and the page says where. The new key is made the next
  time DotAmi starts. Your expense records stay; a receipt that was set aside says so, and where it is,
  when you open it. Only DotAmi's own window can do this; an agent can't. It isn't offered while the
  key is only out of reach for now (Windows' key store not available at the moment): the page then
  says DotAmi tries again each time it starts. While no receipt can be added, an agreed record says so
  instead of offering *Add a receipt*.
- **"Preparing DotAmi…"** ([8i]) — the first start of a new data folder takes about ten seconds
  while Windows saves the key that protects your receipts, and nothing was on the screen. A small
  window now says what is happening, and closes as soon as DotAmi's window opens. Ordinary starts
  don't show it.
- **The four T2125 totals in "Add a figure"** ([8f]) — the list of what you can add gains business
  gross income (T2125 line 8299), business total expenses (9368), business net income before
  adjustments (9369) and business net income (9946). Choosing one asks for the tax year it is for and
  says which line of the CRA's form it goes on that year. DotAmi has read the CRA's 2025 form so far;
  for any other year it says "not read yet" instead of guessing the number, and still keeps the
  figure with its year. The tax year has to be the year the figure's period ends in, so a 2024
  total can't be filed under 2025 by a slip. Each figure remembers its tax year, and, once figures
  can be read from a return, the form and line printed on it (only a figure read from a return can
  have one). Every line is cited to the CRA's own 2025 T2125 and
  Guide T4002, checked by the maintainer on 2026-10-10 (`lib/engines/taxlines/`). Line 8299 leaves out the GST/HST you
  collected, so the GST/HST card never counts these totals; it still reads only your revenue figures.
- **Your expenses** ([8i], typed records) — a new page, *Your expenses*, reached from the ideas page
  (the link at the top, and *Expense records for this idea* on each idea's card). Type a business
  expense (the day, the amount, who you paid and what for; a category, a business share, the GST/HST
  part, the seller's address and GST/HST number if you like) and add it to a list; type as many as
  you like, then *Review* them and *Agree to all* at once. Untick any you want to leave out: they stay
  on your typed list. Nothing is kept until you agree, and closing the window forgets the typed list.
  There is no box for a bank or card number.
- **Not attached yet** — a record can be kept without an idea and attached to one later (*Attach* /
  *Move* on each record).
- **Deleting an idea keeps its expense records** (the maintainer's decision of 2026-10-08) — they
  stay in DotAmi's data file on your computer as "not attached yet", refund links included, and you
  can attach them to another idea. Before you delete, the Delete menu says how many stay, where they
  are kept and how to delete them too (tick *Your expense records*). The count includes records you
  turned down, which are kept but not listed on the Expenses page, and the warning says so.
- **Your business share** — an optional whole percent from 1 to 100 per record, kept as you typed it
  beside the full amount. DotAmi shows both; it never sets the share or works out a "deductible"
  amount from it. A share an agent or a file proposed is shown as theirs ("proposed by …"), never as
  your number.
- **Refunds and credits, your way** — keep each one as a negative amount on a record, or as a
  separate refund record linked to the purchase it came from (*Record a refund for this*). Either way
  it keeps the refund's date, the purchase, the GST/HST part and the credit note's details when you
  give them. DotAmi doesn't say how a refund is taxed.
- **Waiting for you** — records an agent or a file proposes wait on the same page until you agree
  (or turn them down), exactly as before.
- **Refunds taken off the month they were paid back** ([8c-3]) — ledger exports such as Wave's
  Account Transactions keep sales in one column (Credit) and refunds paid back to customers in
  another (Debit), and "Add from a file" only ever added up one, so a month with a refund read too
  high (the Wave practice file's August: 320.00 against a true 280.00). It now has an optional
  "Refunds / money out" column. It is never pre-filled, not even for a column named Debit or
  Refunds: you pick it. Each amount in it is taken off the month of its own row, the month the
  money went back, which may be later than the sale's; the preview says how many refunds each
  month had and what they took off, and says that a refund lowers the month it was paid back. A
  month can go below zero. The rule is the same one the bank statement totals use, kept in one
  place so the two screens can't disagree. Choosing "None" takes nothing off, as before. Nothing
  about the column is stored.
- **A "Status column" for invoice lists** ([8c-3]) — invoice lists from FreshBooks, Sage Accounting
  and Xero can include void, deleted and draft invoices, which were added up as sales. "Add from a
  file" now has an optional Status column, pre-filled only when a column is headed exactly "Status"
  or "Statut". Rows marked Void, Voided, Deleted or Draft (and, assumed for French files, Annulé,
  Supprimé or Brouillon) are left out of the totals and listed with the reason, beside the other
  left-out rows; any other status counts as before, only the chosen column is read, and choosing
  "None" counts every row. Nothing about the column is stored.
- **Add from a file reads a GnuCash book** ([8h]) — drop a GnuCash book (the `.gnucash` file,
  compressed as GnuCash saves it, or plain XML) where you drop a spreadsheet. DotAmi lists every
  account in it, with the ones GnuCash marks as income already ticked; tick or untick any of them,
  since an income account can also hold interest or GST/HST you collected. The monthly totals of
  the ticked accounts follow, one list per currency, exact to the cent, with what was left out and
  why, and the note "DotAmi read your last save" (changes not yet saved in GnuCash aren't in it).
  Review sends only those totals to the agree prompt; nothing counts until you agree. Books up to
  50 MB are read in the background, so the window stays usable, and a read is stopped after a
  minute. A book from a newer GnuCash, with a feature, account type or part DotAmi doesn't know,
  is turned away with that thing's name. Figures from a book are listed under **Books / file**.
- **A note beside a ticked book account that isn't income** ([8h]) — tick a bank, expense or other
  account GnuCash doesn't mark as income, and a plain note appears under it: "This isn't an income
  account in your book. If a sale also lands here, it may be counted twice." A sale is posted to
  both the income account and the bank, so ticking both adds it up twice. The note is all it does:
  the tick stays yours, the account is still counted, and nothing is blocked.
- **Bank and card accounts, the groundwork** ([8g]; nothing new to see until the statement screen
  arrives) — DotAmi can now keep a list of the bank and card accounts you allow it to read
  statements from, each under your own name for it ("Business chequing", "Visa ending 1234"), with
  which button you pressed on the warning (Allow once, Always allow this account, Always allow
  every account) and the day. A name may hold four digits only as "ending" plus four digits at the
  end; any other run of four or more digits is refused, so an account number can't slip in, and no
  account or card number is ever kept. Settings lists each account under *Bank and card records*
  with a *Take back*, and the Delete menu on *What DotAmi knows about you* gets a *Your bank and
  card accounts* box. The *Bank and card records* switch itself stays marked "not built yet": it,
  the warning and the statement screen arrive together, so no switch shows that does nothing, and
  until then nothing can add an account. The words of both warnings are written and reviewed now,
  in the settings list. Only DotAmi's own window can list, allow or take back an account, never an
  agent.
- **Licences** — a new page listing every piece of other people's work DotAmi ships with: each
  package, its version, its licence, where it ships, and the licence's own words (open an entry to
  read it). Reached from Settings → Updates, and in the desktop app from Help → Licences. The
  installer now carries the same list as `THIRD-PARTY-NOTICES.txt` beside DotAmi.exe, next to
  Electron's licence and Chromium's notices. The list is written from the packages themselves each
  time the app is built, and building the installer stops if a package that ships has no entry, so
  the minified app no longer drops the notices its packages' licences ask to be kept.
- **Delete can clear the safety copies, and finishes a wipe that was cut short** ([8d]) — the Delete
  list gets one more tick-box, "Safety copies in the backups folder", warning that afterwards only a
  backup you saved somewhere else could bring anything back. Only the copies DotAmi made itself are
  deleted; anything else in that folder stays, and a link out of the folder is never followed. If a
  wipe can't finish (the computer is busy, the disk is full), DotAmi leaves a small note beside the
  data file and the desktop app finishes the wipe the next time it starts. It does this only when
  that note is there, never on an ordinary start. The page also says when an earlier Delete hasn't
  finished, with "Finish it now".
- **Receipts** ([8i]) — *Add a receipt* on a record you agreed to keeps a copy of the file in a
  `receipts` folder beside DotAmi's data file: a JPEG, PNG or WebP picture or a PDF, up to 10 MB.
  DotAmi decides what a file is from what is inside it, not its name, refuses anything else (an SVG
  or a web page can carry a script), and refuses a picture too large to show safely. It names the copy
  itself with a random string; your file's name is never sent or kept. You are told first that the copy
  is kept exactly as you give it, so whatever is printed on it is kept too. *Remove receipt* deletes
  DotAmi's copy and keeps the record.
- **iPhone (HEIC) photos as receipts** ([8i]) — a HEIC photo is kept exactly as you give it, like any
  receipt, and *Show receipt* shows it: DotAmi reads the photo's container with its own code, in a
  worker that can't connect anywhere, and the computer's graphics chip decodes the picture (option D
  of `docs/connectors/heic-decoder-review.md`, chosen by the maintainer after a double-check). It works
  on computers whose graphics driver decodes HEVC; where it can't, the photo is still kept and DotAmi
  says so, and how to see it. A HEIC is decoded only when you click *Show receipt*, and after one fails
  DotAmi doesn't try another until it restarts. Bursts, animations and layered HEIF pictures are
  refused, and so is a HEIC whose tiles would ask the graphics chip to decode more than the pixel
  caps allow. Not tried on a Mac yet.
- **Show receipt** — a receipt opens inside DotAmi: a picture as it is, a PDF drawn page by page.
  Nothing in a receipt can be clicked or run (a PDF's links, forms and scripts do nothing), nothing
  is fetched from the internet, and DotAmi checks the file is the one you added before showing it;
  a file changed or replaced on your computer since then is refused, with what to do. A PDF shows at
  most 20 pages, and fewer when its pages are very large (80 megapixels in all), saying how many.
- **Backups hold your receipts** — *File → Back up…* now puts every receipt file in the backup with
  the data, locked by the same passphrase if you chose one, and says how many went in. *Restore*
  brings them back; the receipts already on this computer go to the backups folder beside the safety
  copy. Backups are now written and read a piece at a time, so a big data file or many receipts
  don't need more memory. Backups made by earlier versions still restore (they hold no receipts,
  and the question before restoring says so).
- **Your receipts on the Delete menu** — a box of its own that removes every receipt, files
  included, and keeps the records. *Your expense records* now takes their receipts with them.
  Deleting your ideas keeps their records and so their receipts. A receipt file left behind (another
  program had it open) is removed the next time you add or delete one; a file you put in the
  folder yourself is never touched. If DotAmi stopped half-way through adding a receipt, the next
  add or delete finishes it (after checking the file is the one it started with) instead of
  throwing the only copy away. The Settings page now says the receipts folder sits beside the data
  file, and that copying both is a backup when running from source.
- **Your receipts are encrypted in the desktop app** ([8i], the maintainer's decision of 2026-10-09)
  — each receipt file is locked (AES-256-GCM) with a key that Windows keeps for your Windows account
  only. Windows already keeps other standard accounts out of your data folder; the encryption means
  an administrator account, a copy of the data folder, or the disk read outside Windows can't read
  them either. Receipts you already have are encrypted the first time this version starts, one at a
  time, without ever risking one. Backups still hold your receipts and still restore on another
  computer; without a passphrase the receipts in a backup aren't encrypted, and the backup window
  says so. Losing the key (a Windows profile reset, the data folder moved to another account) loses
  the receipts except those in a backup; Settings, *What DotAmi knows about you* and the note before
  adding a receipt say so. If the key can't be opened, or the key file `receipts.key` is deleted while
  receipts are encrypted, DotAmi changes nothing and never makes a new key over them: Settings, *What
  DotAmi knows about you* and the Expenses page say so in amber, and what to do (put the file back,
  restore a backup, or delete the receipts). The data file itself is **not** encrypted, and Settings says that too. A
  copy run from source has no key store, so its receipts stay unencrypted, and it says so. The very
  first start of a new data folder takes about ten seconds longer: the key is saved only once Windows
  has saved its own part of it.
  Design: [expense-records.md § 9](docs/architecture/expense-records.md#9-encrypting-the-receipts-the-design-2026-10-09).
- **Delete** ([8d]) — "What DotAmi knows about you" gets one Delete button. It opens a list of what
  you can delete: your ideas (with their notes, links and map progress), your figures, your expense
  records, your statements ("In your words", all of them at once, never one by one) and your
  settings. Each box says what else goes with it (deleting ideas also deletes their figures and map
  progress; their expense records stay, counted, as "not attached yet") and has a Learn more. A cited line says Delete doesn't touch your own
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
- **"These dates are right" on "Add from a file"** ([8c-3]) — a tick-box beside the "Dates read"
  line that must be ticked before Review opens the agree prompt ("These months are right" for a
  report with the months across the top). Choosing another file, date column, date order or
  century answer empties it again, and going back to an earlier answer doesn't tick it again by
  itself. Retyping the currency or changing the amount column leaves it ticked. The tick is held
  only on the screen; nothing new is kept or sent.
- **Reports with the months across the top on "Add from a file"** ([8c-3]) — a report with one
  column per month, like FreshBooks' Revenue by Client, used to find no column names and add up
  nothing. A new "The file has" choice says whether the file has one row per sale with a date, or
  the months across the top; DotAmi starts on months across only when it finds no dates on the
  rows and a row of month names above some amounts, and says to check it. You pick the row holding
  the month names and where the totals come from: every row added down each month (the file's own
  totals rows left out, while a client whose name starts with "Total" is still counted), or one
  row only, such as the file's Total row. The screen lists the
  columns it read as months and the ones it didn't add (Client, Total). Month names are read in
  English and French with a four-digit year (Jul 2026, juillet 2026, 2026-07, 07/2026); a name
  that only looks like a month (Jul, Jul 26, a whole date) stops the table and the screen names
  the column, rather than guess the year. Left-out cells are listed the way Excel names them (C6).
  These figures go to the agree prompt without a row count: one client row goes into every month,
  so adding the months' counts would show more rows than the file has.
- **A report with no dates says which report to export instead** — Wave's Income by Customer (one
  total per customer, no dates) now gets a sentence naming Wave's Account Transactions report,
  which has a date on every line. Any other file with no date and no month at all is told to
  export a report that has a date on every sale.

### Changed
- **DotAmi's database layer now reads and writes through Prisma's adapter for `better-sqlite3`**
  ([8i], the first step of encrypting the data file; the maintainer's decision of 2026-10-10) — the
  package behind it is `better-sqlite3-multiple-ciphers` 13.0.3 (MIT; SQLite 3.53.4 with an
  encryption extension), with `@prisma/adapter-better-sqlite3` 6.19.3 (Apache-2.0), both pinned. Nothing
  is encrypted yet and nothing looks different: dates are stored as before (whole milliseconds), a
  transaction that rolls back no longer can take another request's write with it, and "database is
  locked" keeps SQLite's words. Measured first: the ideas, map, Expenses and *What DotAmi knows about
  you* pages are within a few milliseconds of before; the start loads the adapter in 16 to 30 ms more
  (`docs/architecture/database-encryption.md` § 14, `scripts/measure-database-adapter.ts`). The
  desktop app keeps only this computer's prebuilt SQLite (2.4 MB) and removes `DEBUG` from its
  server's environment, because the adapter's debug output prints query values.
- **Requests up to 16 MB reach DotAmi's routes whole** (`next.config.mjs`,
  `middlewareClientMaxBodySize`). Next cut every request body at 10 MiB on its way through
  `middleware.ts`, so a receipt near the 10 MB cap (sent as base64, about 14 MB) arrived broken and
  was refused with "Invalid JSON". Each route still has its own, smaller limit.
- **A database update** adds one table, `Receipt`, describing each receipt file; nothing else in
  the data file is touched (a test seeds ideas, figures, links, map progress, settings and expense
  records and checks each after the update), and the app backs the file up first.
- **A database update** rebuilds the expense records table only, so a record's idea can be empty
  (and is emptied, not deleted, when its idea is deleted) and the new fields fit; your ideas, figures, links, map progress, settings and existing expense records
  are kept as they are (a test seeds each and checks it after the update), and the app backs the
  file up first.
- **The desktop app is about 30 MB smaller once installed** (the installer about 8 MB smaller). Its
  server no longer carries the image library sharp (with libvips, LGPL-3.0-or-later) or the
  TypeScript compiler, which Next.js's build copied in although DotAmi never resizes an image and
  never compiles code while it runs, nor the small packages only those two needed. Next's image
  optimiser is switched off in the desktop app, so its address answers "not found" instead of
  reaching for the missing library. Their entries leave the app's licence list; nothing changes on
  screen otherwise. A copy run from the source code is unchanged.
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
  taken for the column names, two-digit years, months across the top and a Wave report with no
  dates (those three since fixed, under Added), a French Sage 50 file with several comma-decimal columns split on its
  commas, and a formula saved with no value reported as an empty amount (those two since fixed,
  under Fixed). See docs/connectors/practice-files.md.

### Documented
- **The privacy log** (`docs/privacy-log.md`) — what each version keeps, sends, ships and asks you to
  agree to, from 0.1.0 on, and what the future privacy policy will need to say. Every change that
  affects it adds a line under [Unreleased]; a test fails when a version has no section.
- **A review of the ways to show iPhone (HEIC) photos as receipts** ([8i]) — every decoder found
  (libheif in WebAssembly, the packages labelled MIT that carry it, two new permissive decoders, the
  graphics chip through Chromium's WebCodecs, Windows' own codec), with its licence, security, size
  and which computers it works on (including that DotAmi's worker policy blocks WebAssembly today, so
  every WebAssembly decoder needs that policy opened first), and a list of options with their costs
  for the maintainer to choose from. Nothing changes in the app: HEIC is still refused
  (`docs/connectors/heic-decoder-review.md`).
- **A design for encrypting the database file** ([8i]) — what it would protect and what it
  wouldn't, the key (wrapped by Windows' per-user protection, never in a backup), why Prisma's
  built-in engine and Node's own SQLite can't open an encrypted file, how the desktop migrator,
  backups and restore would change, encrypting an existing file once without ever losing data, a
  copy run from source (stays unencrypted, and says so), and losing the key. With reviews of the
  three candidate packages (`better-sqlite3-multiple-ciphers` with Prisma's adapter, `libsql`, the
  SQLCipher packages), the choices put to the maintainer with their costs, and the maintainer's four
  decisions of 2026-10-10 (option A, measured first; backups only plus "Start fresh"; a passphrase
  required on every backup; "Not now" and "Never" allowed). Nothing changes in the app
  (`docs/architecture/database-encryption.md`).

### Fixed
- **A French CSV with several amount columns is read on "Add from a file"** ([8c-3]) — a file saved
  with semicolons and amounts like "1 000,00" in several columns (Sage 50 Canadian in French) was
  split on its commas, so no column names were found and nothing was added up. When the commas on
  the lines that split on semicolons sit mostly inside amounts, DotAmi now reads the file on its
  semicolons, also when a description holds a comma ("Design, impressions"). A comma file whose
  commas sit in its text still reads on its commas when a semicolon turns up in it.
- **An Excel formula with no saved value is no longer called an empty amount** ([8c-3]) — some
  programs (Xero says so for its Excel reports) leave a sum for Excel to work out when the file is
  opened, so the cell holds a formula and no number until the file is saved again in Excel. Such a
  row was listed as "a date but no amount". Now it is listed as a formula Excel didn't save a value
  for, with what to do: open the file in Excel, click Enable Editing if it asks, save it, and drop
  it again. DotAmi still never works a formula out itself, so nothing is guessed for that row. The
  same goes for a cell under a month in a report with the months across the top.
- **A FreshBooks file with a summary on top opens on its real column names** ([8c-3]) — FreshBooks'
  Invoice Details puts a short summary ("Total Invoiced, Total Paid" over two figures) above the
  table, and "Add from a file" took the summary's two titles for the column names, with "Total
  Paid" pre-filled as the amount. It now takes the wider row of column names under the summary,
  the one that names the date column. A sheet whose first row of names already says "Date" keeps
  it, and a row you pick yourself is never moved.
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
- **The browser tests no longer trip the app's own rate limits** (developers only; the app's limits
  are unchanged). Every browser test reaches the test server as the same client, so as the suite
  grew it made more settings calls in a minute than a person would, and on a fast computer tests
  failed with "Too many requests" (429). The test server now starts with
  `DOTAMI_E2E_RATE_LIMITS=opt-in` (set only in `playwright.config.ts`; the desktop app removes it
  from its server): a request counts toward a limit only when it names its own bucket in the
  `x-dotami-e2e-rate-limit` header. `e2e/rate-limit.spec.ts` does, and shows the settings limit of
  120 a minute still refusing the 121st request, and that the suite's other requests aren't counted;
  the desktop test shows the switch never reaches the desktop app.
- **A browser-test run can no longer use another run's server.** The run used to start testing as
  soon as anything answered on its port, so when runs from two checkouts overlapped, the second
  one's tests reached the first one's server and database, and the two tests that put bank and card
  accounts straight into the test database found their lists missing. A run now waits for its own
  server to say it is ready, and stops with a plain message when the port is already taken
  (`e2e/port-free.mjs`).

### Security
- **Workers started from DotAmi's own script files can't connect anywhere.** A browser applies a
  worker's own response policy, not the page's, so Next's static files now carry one that allows
  DotAmi's scripts and nothing else. No worker before the return reader loaded from those files.
- **The answer carrying a receipt's bytes has a sandbox policy** (`default-src 'none';
  frame-ancestors 'none'; sandbox`), set in `next.config.mjs` as well as the route, since Next's
  general headers would otherwise replace the route's own. Were it ever loaded as a page, nothing in
  it could run or load.

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
