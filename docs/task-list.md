# Task list — what's being built, and what you can pick up

Last updated: 2026-10-09. Every story planned for DotAmi, with its tasks. The plan behind it is
[architecture/use-cases.md](architecture/use-cases.md) (who it's for, the decisions, the build
order); the settings and edge cases each story must test are in
[architecture/settings-and-edge-cases.md](architecture/settings-and-edge-cases.md) — the codes in
brackets match.

**Status:** ✅ done · 🟡 partly done (what's left is listed) · 🔄 in progress · ⬜ not started ·
⏸ waiting on a decision or another story.

**To pick something up:** comment on the linked issue, or open one naming the code (e.g. "[8c]")
and the first pull request you'd send. Every commit is signed off (`git commit -s`, see
[DCO.md](../DCO.md)); content follows [CONTRIBUTING.md](../CONTRIBUTING.md) — cited, dated, plain
English. A story is done when its tasks are ticked **and** its edge cases have tests. Some stories
need a maintainer's decision first (⏸); those are marked.

**Order:** the desktop app → your figures → the Lens → the questionnaire and planning. The map's
content and the project itself run alongside everything.

---

## 7 — The desktop app (one download, everything on your computer)

- ✅ **[7a] SQLite database.** One file, no database server (#60).
- 🔄 **[7b] The Electron app** — the same screens in their own window
  ([how it runs](architecture/desktop-app.md); `npm run desktop:build && npm run desktop`).
  - [x] Build Next.js as a self-contained server the app can start
  - [x] Electron starts it on a private local port and opens a window on it
  - [x] The database file in the user's own app folder; created and migrated on first launch
  - [x] App menu: about, quit, open data folder
  - [x] A test: start → describe a venture → close → start again → it's still there
  - [x] An installer you double-click (`npm run desktop:installer`; the same test runs on the packaged app)
  - [x] A Windows build from CI, with the desktop test on the packaged app (Mac and Linux after)
- ✅ **[7c] Backup, restore, moving to a new computer** (desktop app, File menu;
  [how it works](architecture/desktop-app.md#backup-and-restore-7c)).
  - [x] *Back up* copies the database file; optional passphrase encryption
  - [x] *Restore* checks a backup before replacing anything, and keeps a copy of what it replaces
  - [x] Setup suggests turning on disk encryption (the settings page, Windows Home and Pro)
  - [x] A test: back up on one computer → restore on another → the same ventures
- 🔄 **[7d] Installers and automatic updates** (unsigned, through GitHub releases, for now;
  [how to release](architecture/desktop-app.md#releasing-an-update)).
  - [x] A Windows installer built on each version tag, uploaded to a draft release (Mac and Linux after) —
    the workflow file was unreadable from #77 until its fix on 2026-10-06; v0.2.0 was built before it
  - [x] The app checks for updates, downloads, and asks before installing; pre-releases only reach pre-release copies
  - [x] It says so the moment an update is found and shows the download in the taskbar; the start-up log is written straight to the disk, so a start that stops leaves its reason
  - [x] Before a database change, the app backs up the database (and refuses data from a newer version)
  - [x] Proven end to end: a published release reaches an installed app (by hand, on the maintainer's computer: 0.2.0 → 0.2.1, 2026-10-08; not an automated test)
  - [x] Third-party licence notices: the installer carries `THIRD-PARTY-NOTICES.txt` (every package that
    ships, its version and licence text, written at build time; packaging stops if one is missing), shown
    at Help → Licences and from Settings → Updates
  - [x] The server leaves out what it never loads: sharp with libvips (LGPL) and the TypeScript compiler,
    with what only they pull in (about 30 MB; the build stops if something still needs one, a desktop
    test fails if one comes back)
  - [ ] ⏸ Code signing and app stores — later
- ⏸ **[7e] Landing page website** — what it is, demos, a download button. Later; hosting not decided.
- ⏸ **[7f] Move an existing PostgreSQL install into the app** — not planned for now: the maintainer
  starts fresh in the app rather than moving data (decided 2026-10-05). If you self-hosted on
  PostgreSQL before the SQLite switch and need your data moved, open an issue.
- 🟡 **[7g] The settings page** — one screen for every setting in Part 1 of the edge-case doc;
  each story adds its own rows.
  - [x] One screen (`/settings`), grouped: data and backups · your figures · the Lens · the map ·
    privacy · updates — each group opens with what is true of this copy today
  - [x] Every Part 1 setting listed with its default, choices, warning and the story that brings
    it; a test keeps the page and Part 1 in step
  - [x] A browser test for the page
  - [ ] A setting changed there survives a restart — waits for the first setting that can be
    switched (none can yet; each arrives with its story, starting with [7b]'s data folder)

## 8 — Your figures (confirmed totals, never the records) · roadmap §5 · #46

- ✅ **[8a] The figures store.** One kind so far: revenue (gross). Typed in on the ideas page;
  file drop is [8c], the Lens is [9].
  - [x] A figure: kind, period, amount (integer cents), currency, source, proposed / confirmed / retracted
  - [x] The rules engine reads confirmed figures; a figure beats an estimate where it settles the
    rule (the GST/HST card: one quarter over $30,000, or four quarters — counted only from figures
    that are exactly a calendar month or quarter; nothing split, converted or added twice)
  - [x] Cards say *"From your records · N figures · N rows"*, the source named, the figures one click away
  - [x] A privacy review of the store before the first import lands
    ([figures-privacy-review.md](architecture/figures-privacy-review.md) — found and fixed a DNS
    rebinding hole: the app now answers only on this computer's own address)
- ✅ **[8b] The agree prompt** — figures are confirmed only by the person agreeing; *Agree* or
  *No, I'll do it myself*; nothing can skip it.
  - [x] The figures grouped by where they came from; amounts editable (stored as "edited by you"); discard one
  - [x] Close or Escape confirms nothing; more than 20 figures → *Agree* only after scrolling through them
  - [x] Only DotAmi's own page can confirm: the route agents and importers use can only propose (tested)
  - [x] Every time it opens, one line above the buttons: "Double-check what DotAmi did, and how, before you agree."
- 🟡 **[8c] Drop a file: Excel and CSV.** "Add from a file" on the ideas page.
  - [x] Read in the app's window, in memory, never sent or kept; one total per calendar month + its
    row count + the file name are what's stored (as proposed figures — the agree prompt decides)
  - [x] Map the date and amount columns (guessed only when the column names make it clear); the
    edge cases in [settings-and-edge-cases.md](architecture/settings-and-edge-cases.md#your-figures)
  - [x] Asks "Where is this file from?" before any file is read, for every file (maintainer's decision,
    2026-10-07): a bank or credit card file is turned away unopened, with a plain warning, until [8g] exists
  - [ ] [8c-2] and [8c-3] below

All of [8c-2] to [8h] were researched on 2026-10-06; the design, the shared data model and the
decisions are in [architecture/figures-roadmap.md](architecture/figures-roadmap.md). The maintainer
answered the decisions on 2026-10-07. Each story's first slice is merged; the next slices follow the
roadmap's build order.

- 🔄 **[8c-2] Remember a file's columns, and recognise the same file dropped twice.**
  - [x] The file's fingerprint and column-name matching, worked out in the window; nothing stored (#81)
  - [ ] Keeping the column choice (a setting that starts on)
  - [ ] Recognising the same file twice (waits on where a figure's source is kept)
- 🔄 **[8c-3] Practice files shaped like each accounting program's export** — never a real export.
  - [x] Xero and QuickBooks Online, with today's known gaps pinned as "fails today" tests (#84)
  - [x] QuickBooks' sales no longer counted twice: an optional Type column leaves Payment and Deposit
    rows out and lists them; the screen's steps now live in one shared function the tests also call
  - [x] Fixed the other gaps they found: Xero's price-per-item column is no longer pre-filled, its invoice date wins over the due date, and one-line customers keep their Date guess
  - [x] Wave, FreshBooks, Sage Accounting, Sage 50 Canadian, and Xero's Receivable Invoice Detail: practice
    files checked to the cent, nine gaps they found pinned by eleven "fails today" tests; a line on "Add from a
    file" saying each program's export was only tested on files shaped from its help pages
  - [x] Ask on GitHub for the column-names row of real exports: posted 2026-10-09 as
    [issue #124](https://github.com/Dot-Ami/dotami/issues/124)
  - [ ] Check each row pasted in reply (no figures, client or company names), then mark those titles
    "documented" in their practice files, citing the issue
  - [x] Two-digit years: one question per file ("Is 05 the year 2005?"), never guessed; every
    preview shows the earliest and latest date read, in words, to check against the file
  - [x] "These dates are right": a tick-box beside that line, needed before Review; another file, date
    column, date order or century answer empties it ("These months are right" for months across)
  - [x] Months across the top (FreshBooks' Revenue by Client): pick the row of month names and where
    the totals come from, one total per month; a report with no dates (Wave's Income by Customer)
    names the report to export instead
  - [x] A French semicolon file with several comma-decimal columns (Sage 50) reads on its
    semicolons; an Excel formula saved with no value is listed as one, with what to do, never as
    "no amount" and never guessed
  - [x] Void, deleted and draft invoices left out through an optional Status column, and the FreshBooks
    summary block no longer taken for the column names
  - [x] Refunds in a ledger's Debit column taken off the month they were paid back, through an
    optional "Refunds / money out" column, under the same rule as the bank statement totals
- 🔄 **[8d] Sources, and "What DotAmi knows about me"** — every figure, where it came from;
  *forget this source*; *delete everything*.
  - [x] The read-only page, a test that fails when something DotAmi keeps isn't listed on it, and logs
    that hold events only (#86)
  - [x] *Delete*: pick what to delete and see what else it affects — one button, tick-boxes per kind
    of data, asked twice, wiped from the file (a byte-scan test proves it); statements all at once only
  - [x] *Delete* can also clear the backups folder (only DotAmi's own safety copies, never through a
    link), and a wipe that didn't finish completes at the next start of the desktop app, only when
    Delete left its "wipe pending" note
  - [ ] *Delete* clears what the desktop window stored in earlier launches (waits on how to reach it)
  - [ ] *Forget this source* (waits on where a figure's source is kept)
- 🔄 **[8e] How old is each figure** — its age on screen; cards say when they lean on an old one.
  - [x] Every figure's age; a figure dated after today is flagged and never counted (it could make the
    GST/HST card say "over $30,000"); dates in the person's own day (#85)
  - [x] The server measures "a period that has ended" against the computer's own day, not the UTC day
    (a period ending "tomorrow" was accepted on Canadian evenings)
  - [x] The first saved setting: tick monthly, quarterly and/or yearly on the settings page, and a
    "Remind me about this idea" switch (off until turned on) on each idea; both survive a reload (browser-tested).
    One small `Setting` table that every later setting reuses
  - [x] Reminders: a banner on the ideas page and the idea's map when a period has ended that the agreed
    figures don't cover, with "Add figures" and "Not this time" (counted per kind of figure; unit-tested, browser test written in `e2e/figure-reminders.spec.ts`)
  - [x] Reminders: an "add to my calendar" file: one repeating event per ticked box, made in the page
    (RFC 5545 rules unit-tested in `tests/figures-calendar.spec.ts`; the download browser-tested; the desktop
    app's Save dialog desktop-tested)
- 🔄 **[8f] Tax software, through the CRA's line numbers.**
  - [x] Read last year's return PDF in the window and show each T2125's lines 8299, 9368, 9369 and 9946
    with their pages, or a plain refusal (pictures only, password-locked, no T2125); nothing proposed
    or kept. Mozilla's pdf.js, pinned and reviewed, in a worker that can't connect anywhere
    ([review](connectors/pdf-reader-review.md))
  - [x] The four T2125 totals as figure kinds, named for what they mean (business gross income, total
    expenses, net income before adjustments, net income), cited to the CRA's 2025 form and guide
    ([engine doc](engines/taxlines.md)); each figure keeps its tax year and the form and line as read
    (two optional columns); a year whose form isn't read yet says so; the GST/HST card never reads them
  - [ ] In: last year's return PDF → figures tagged with form and line
  - [ ] Out: a sheet of each figure next to the line it goes on, for any tax software
  - [ ] Connector notes: Wealthsimple Tax, TurboTax
- 🔄 **[8g] Bank and card records** — opt-in, behind a warning. (Until it is built, "Add from a
  file" turns a bank or card file away unread — see [8c].)
  - [x] Ticked bank rows to complete-month totals; a row has no field for an account or card number (#82)
  - [x] OFX/QFX reader: the free `ofx-js` package read in full and pinned at 1.1.2, wrapped so
    account numbers never leave it, pending rows and repeated ids are handled, and a file with its
    own document type, two downloads joined together, or too many entries is refused; no screen
    yet ([review](connectors/ofx-reader-review.md))
  - [x] The accounts list behind the warning: each account under the person's own name for it
    ("ending" plus four digits allowed, no other run of four digits), the warning button pressed and
    the day, taken back in Settings, and on the Delete menu; the warnings' words written. The
    switch stays "planned" until the screen arrives, so nothing can add an account yet
  - [ ] The switch, the warning on screen, the statement screen, the OFX files on the screen (run the reader in a Web Worker)
- 🔄 **[8h] Books on disk** — read-only: ledger/hledger, GnuCash, Sage 50, QuickBooks Desktop.
  - [x] GnuCash XML reader, revenue accounts to monthly totals; refuses what it doesn't
    fully understand (#83)
  - [x] hledger / Ledger journals: DotAmi's own reader, written from hledger's manual; accounts and
    monthly totals through the same core; refuses what it doesn't read by name and line; no screen
    yet ([journal-reader.md](connectors/journal-reader.md))
  - [x] A GnuCash book on "Add from a file": read in a background worker (up to 50 MB, a one-minute
    limit), its accounts listed with the income ones ticked, monthly totals proposed under the
    source kind "books" ("Books / file"); unknown GnuCash features refused by name
    ([gnucash.md](connectors/gnucash.md))
  - [x] A ticked account the book doesn't mark as income gets a note that a sale may be counted
    twice; information only, nothing unticked or blocked
  - [ ] Journals on the screen, GnuCash database (SQLite) books, Sage 50, QuickBooks Desktop
- 🔄 **[8i] Business expense records** — a record of each business expense the person adds (date,
  amount, who it was paid to, what for, a category they pick, an optional receipt file), so the
  person has a record of what they spent and labelled; DotAmi never decides on its own that one is
  deductible. **Design written and decided** (2026-10-07, after the maintainer asked for a record of
  every business expense); the store for typed records and the screen to type them are built
  (2026-10-08, with the maintainer's decisions of that day); receipts are kept as copies, carried by backups and shown inside DotAmi (2026-10-08), and encrypted in the desktop app (2026-10-09); the other ways in are not.
  - [x] Design and the options with their costs: [architecture/expense-records.md](architecture/expense-records.md)
  - [x] The privacy review (typed records and receipts as built):
    [figures-privacy-review.md](architecture/figures-privacy-review.md#privacy-review-expense-records-and-receipts-8i)
  - [x] Decided: single records with their receipt files, copied into the data folder and carried
    by backups; every way in (typed, spreadsheet rows, bank rows, a receipt photo the Lens reads)
  - [x] The store for typed records: the `Expense` table (a new migration), the checks, the propose /
    agree / retract / discard / list routes (agents can only propose; agree, retract and discard answer only to DotAmi's own page), the privacy list and
    /your-data's count, and the "totals, never single transactions" wording reworded for expenses
  - [x] The screen to type records, *Your expenses* (`/expenses`, from the ideas page and each idea):
    type many and agree once in a review list that lets you untick any; a record "not attached yet"
    attached to an idea later; the person's own business share; refunds kept as a negative amount or
    as a refund record linked to the purchase; agent and file proposals wait there for the agree click
    ([ui-spec](ui-spec/expenses/_index.md))
  - [x] Receipts as copies: a `receipts/` folder beside the data file, the type read from the bytes
    (JPEG, PNG, WebP, PDF), 10 MB and a pixel cap, random names, a SHA-256; *Add a receipt* / *Remove
    receipt* on the Expenses page (agreed records only; page-only routes); a *Your receipts* box on the
    Delete menu, receipts going with *Your expense records*; a sweep for files no record describes
    ([expense-records.md § 7](architecture/expense-records.md))
  - [x] Backups that carry the receipts: backup format 2 streams the data file and every receipt it
    describes in 1 MB pieces, the passphrase covering both; old (format 1) backups still restore
    ([desktop-app.md § Backup and restore](architecture/desktop-app.md))
  - [x] Showing a receipt inside DotAmi: the security design first
    ([expense-records.md § 8](architecture/expense-records.md)), then **Show receipt**: pictures from a
    `blob:` address, PDFs drawn by pdf.js in a no-network worker, every file checked again before it
    is drawn; browser tests with hostile files
  - [x] Receipt files encrypted at rest in the desktop app (the maintainer's yes of 2026-10-09): the
    design and threat model first ([expense-records.md § 9](architecture/expense-records.md)), then
    AES-256-GCM per file with one key kept only wrapped by Windows (`safeStorage`), existing receipts
    encrypted once at the first start without risking one, backups that still restore on another
    computer, and plain words where the person looks (Settings, *What DotAmi knows about you*, the note
    before adding a receipt). A copy run from source keeps them unencrypted and says so. Open for the
    maintainer: encrypting the data file too, and a "start a new key" button
  - [x] The entries in the Delete menu ([8d]): expense records have their own box, counting every
    record. Deleting ideas keeps their records as "not attached yet" (the maintainer's decision of
    2026-10-08), and the menu says how many stay, where they are kept and how to delete them before
    the person confirms (the count includes turned-down records, which no list shows, and it says so)
  - [x] Start a new key while the key can't be opened (the maintainer said yes, 2026-10-09): asked twice,
    the locked receipts and the key file moved to `backups/receipts-locked-<time>/`, never deleted by that step (since § 11, Delete's safety-copies box can clear it), the new
    key made at the next start; never offered while the key is only out of reach for now (the key store
    unavailable), and no Add a receipt while none can be added; and a "Preparing DotAmi…" window during
    the first start's wait ([expense-records.md § 10](architecture/expense-records.md)).
  - [x] Two follow-ups (the maintainer said yes, 2026-10-10): the desktop app restarts by itself after
    Start a new key, saying so first, only from its own window and only once the receipts are moved (a
    copy run from source says to restart it by hand); and the Delete menu's safety-copies box also
    clears the receipt folders set aside in `backups/` (`receipts-locked-…`, `receipts-before-restore-…`),
    with a warning, owed in the wipe-pending note if cut short
    ([expense-records.md § 11](architecture/expense-records.md))
  - [x] iPhone (HEIC) photos as receipts (the maintainer said yes, 2026-10-09): the decoders reviewed
    ([connectors/heic-decoder-review.md](connectors/heic-decoder-review.md)), then option D chosen after a
    double-check and built: kept exactly as given, read by DotAmi's own container reader in a
    no-network worker and drawn by the graphics chip through WebCodecs, on *Show receipt* only; where the
    computer can't decode HEVC it is kept and the viewer says so. Not tried on a Mac
  - [ ] Before DotAmi is sold: the HEVC patent questions (they cover the Electron build already shipped)
    answered by a software-patent lawyer ([the list](connectors/heic-decoder-review.md#questions-for-a-software-patent-lawyer-before-dotami-is-sold))
  - [ ] Encrypting the database file (the maintainer said yes, 2026-10-09; chose how on 2026-10-10):
    designed and the packages reviewed ([architecture/database-encryption.md](architecture/database-encryption.md));
    the four decisions (option A measured first, backups only plus "Start fresh", a passphrase required
    on every backup, "Not now" and "Never" allowed) are at the top of that page; then the build in
    stacked pull requests (the Prisma connection, the key and first-start encryption, backups and
    restore, "Start fresh")
  - [ ] From a spreadsheet's rows · from a bank statement's ticked rows ([8g]) · a receipt photo the Lens reads ([9])

## 9 — The Lens (DotAmi's built-in agent)

- ⬜ **[9a] Pick your model** — three ways in, one setup screen: a provider's own key, OpenRouter,
  or a model on your own machine; keys in the OS keychain.
- ⬜ **[9b] Know the model before you use it** — test it directly (an image, a tool call, how much
  it reads); say in plain words what you'd miss; an accuracy score on invented receipts.
- ⬜ **[9c] The test set** — invented receipts, returns and statements with known answers, and a scorer.
- ⬜ **[9d] Lens, first version** — explains cards, proposes changes and figures; reading and proposing only.
- ⬜ **[9e] Information, never orders** — anything read from a page, file or email is data; actions
  it asks for need the person's approval; nothing leaves the computer without asking.
- ⬜ **[9f] Permission levels, a log, and undo.**
- ⬜ **[9g] Lens powers, one at a time, each behind a switch and a warning.**
  - [ ] Web search
  - [ ] Read files in chosen folders
  - [ ] Run commands
  - [ ] The built-in browser (Playwright)
  - [ ] Write back to accounting software
- ⬜ **[9h] Your own keys for a live connection** — through the vendor's official MCP server.
- ⬜ **[9i] DotAmi as an MCP server** · roadmap §7 · #48
  - [ ] Read-only tools first: `readout`, `list_ventures`, `list_statements`, `law_provision`
  - [ ] Then `propose_facts`, `set_progress`, `add_question`

## 10 — The questionnaire and planning

- ⬜ **[10a] Choose-your-own-adventure questionnaire.**
  - [ ] Questions as data: one file per question — wording, answers, where each answer leads,
    which cards it feeds, why it's asked
  - [ ] "I don't know" always allowed
  - [ ] Asked in the order a professional would
  - [ ] A test that every path ends somewhere
- ⬜ **[10b] Progress per step** — done · doing · not for me · roadmap §2 · #43
- ⬜ **[10c] Tasks and questions per step** · roadmap §3 · #44
- ⬜ **[10d] Deadlines and reminders** — cited, with a reminder before each.
- ⬜ **[10e] The accountant package** — one export of the map, confirmed figures, open questions · extends #41

## 11 — The map's content: the tools, tactics and tricks

- ⬜ **[11a] Roadmaps as data** — one file per step; a checker refuses a step with no source · roadmap §1 · #42
- ⬜ **[11b] Check sources against the law's own words** — a model quotes, code checks the quote
  appears word for word in the official text, a person decides.
- ⬜ **[11c] Flag stale sources automatically** — with #37
- ⬜ **[11d] Two people per change** — the checker of a source is never its author.
- ⬜ **[11e] Reviewed by an accountant** — a roadmap is *reviewed* only after a professional reads it.
- ⬜ **[11f] Strategy roadmaps** · roadmap §6 · #47 — each cited, with its audit and anti-avoidance read:
  - [ ] Holding company + operating company
  - [ ] The small business deduction and how it's reduced
  - [ ] Salary versus dividends
  - [ ] Income splitting and the rules that limit it
  - [ ] The lifetime capital gains exemption on small-business shares
  - [ ] The estate freeze
  - [ ] The family trust
  - [ ] Intercorporate dividends and the anti-avoidance rule around them
  - [ ] Using losses across a group
  - [ ] The capital dividend account
  - [ ] Shareholder loans
  - [ ] Tax-deferred rollovers and reorganisations
  - [ ] Retirement savings inside a corporation
  - [ ] Leaving the country
- ⬜ **[11g] Catch-up paths for people already behind.**
- ⬜ **[11h] Pausing, closing, moving province.**
- ⬜ **[11i] New tax years** — every card says which year.
- ⬜ **[11j] Beyond Canada; Quebec; French** · roadmap §4 · #45
- ⬜ **[11k] Fixes already reported** — good places to start:
  - [ ] #36 federal rules say "because you selected <province>"
  - [ ] #39 tier 1 subtitle wording
  - [ ] #9 statute text with paragraph breaks
  - [ ] #6 hide the empty vault line
  - [ ] #10 a van buyer sees no vehicle class
  - [ ] #11 prep-tool references filtered by structure
  - [ ] #40 hide R&D-only steps without an R&D tag
  - [ ] #5 "YOUR PICK" on a branch never picked
  - [ ] #38 "New idea" restarts at About-you
  - [ ] #41 playbook print view
  - [ ] #4 the cockpit on a phone

## 12 — People and structures

- ⬜ **[12a] Ventures that span companies.**
- ⬜ **[12b] Co-owners and spouses.**

## 13 — The project itself

- 🔄 **[13a] Contributors** — issues as the to-do list; every commit signed off, merges included.
- 🔄 **[13b] Releases** — tags, changelog, release notes; the app's updates come from these.
  - [x] Version tags (v0.1.0, v0.2.0) and [CHANGELOG.md](../CHANGELOG.md)
  - [x] A tag builds the Windows installer into a draft release; the maintainer writes the notes and publishes
  - [ ] A release after v0.2.0 built by the fixed workflow and published end to end (with [7d])
- 🔄 **[13c] Security** — CodeQL, grouped Dependabot, audit; a privacy review for each import path;
  a threat model for the Lens's powers before [9g].
  - [ ] Newer advisories (checked 2026-10-06): `source-map-js` 1.2.1 (build-time; a patch — Dependabot
    #71) · `sprintf-js` (build-time, under the installer builder; no fix published)
  - [x] `sharp` 0.35.5 — its SVG reader's advisory (#73) · `postcss-selector-parser` — gone with
    Tailwind 4 (#80)
  - [ ] Build-time tooling advisory GHSA-vfj7-8cjw-p6xm (`braces` stack-exhaustion). **No fixed
    version exists yet** — it covers every `braces` release up to 3.0.3, the newest (checked
    2026-10-06). Since Tailwind 4 it reaches DotAmi only through Next's ESLint plugin
    (`eslint-config-next` → `fast-glob` → `micromatch`), when lint runs (`next build` runs it
    too), on the project's own glob patterns; nothing shipped to people runs it. Wait for a fixed
    `braces`, or for the plugin to drop it.
  - [x] Tailwind 3 → 4 — 2026-10-06; Tailwind 4's own packages don't use `braces` (replaced
    Dependabot's #72, which only bumped the version and failed every build)
- ✅ **[13e] Tests that use the app like a person** — Playwright on the real build, a CI job on
  every pull request (#64); `npm run test:browser`. Each new screen adds its own test. A required
  check on `main` since 2026-10-05: nothing merges with them failing.
  - [x] The suite never trips the app's rate limits by accident — 2026-10-09; on the test server
    only a request that names its own bucket is counted (`DOTAMI_E2E_RATE_LIMITS=opt-in`, set by
    `playwright.config.ts` alone), and `e2e/rate-limit.spec.ts` shows the shipped limit still holds
  - [x] A run waits for its own server, never another run's on the same port — 2026-10-09
- ⏸ **[13f] Privacy policy, terms, and the usage-sharing decision** — needed before the first download.
  - [x] Decided (2026-10-05): ask people whether to share anonymous usage — off unless they say yes
  - [ ] ⏸ Maintainer's decisions: what exactly is sent, where it goes, who sees the results; a
    privacy policy and terms
  - [x] A privacy log ([privacy-log.md](privacy-log.md)): what each version keeps, sends, ships and
    asks, the record the policy and terms will be written from; a test fails when a version has no section
  - [x] Next.js telemetry off by default for people running from source (`npm run dev`, `build`,
    `start`, `lint` through `scripts/next.mjs`; CI already had it off)
  - [x] Prisma's check-in off by default for people running from source (the `prisma:*` scripts; CI
    already had it off). Not reachable from a script: `npm ci`'s own Prisma run and `npx` by hand
- ⬜ **[13g] Screen-by-screen review.** For every screen, five questions answered with evidence:
  - [ ] **Useful:** what does a first-time person learn here that they didn't know?
  - [ ] **Guides:** is the next step obvious, and does it go somewhere that helps?
  - [ ] **Honest:** every figure and claim shows where it came from; nothing invented
  - [ ] **Wired:** what's typed or clicked saves, reloads and survives a restart; errors handled
  - [ ] **Tested:** a browser test covers its main path and edge cases
  - Already found: the intake's field labels aren't tied to their dropdowns (a screen reader can't name them).
- ✅ **[13i] The landing page and intake were dead in production builds** — fixed in #64.
