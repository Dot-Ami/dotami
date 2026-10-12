# Task list — what's being built, and what you can pick up

Last updated: 2026-10-11. Every story planned for DotAmi, with its tasks. The plan behind it is
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
content and the project itself run alongside everything. **Changed 2026-10-11:** the future
cockpit (§ 14) is now first, because the maintainer named it the top priority on 2026-10-10; it
takes in the planning pieces of § 10 ([10b] progress, [10c] tasks) and starts § 11's roadmaps as
data. Its design: [architecture/future-cockpit.md](architecture/future-cockpit.md).

---

## 14 — Look inside your future (the future cockpit) · first priority since 2026-10-10

A person starts from where they want to be, in their own words, picks one business or career to look
inside, and sees its whole road at once: every step, the skills it needs, the official fees and the
blank cost lines they price themselves. The cockpit is where they plan it and then do it. The design
and the maintainer's six decisions of 2026-10-11:
[architecture/future-cockpit.md](architecture/future-cockpit.md).

- 🔄 **[14a] Phase 1 — Look inside one future (Alberta).** About two calendar weeks.
  - [x] The design, written before any code ([future-cockpit.md](architecture/future-cockpit.md))
  - [x] Fixes carried in, the first three (#142, 2026-10-11): the uncited $80,000 incorporation
    trigger off the map (the step is now *Incorporating*, cited facts only, lit only while it is the
    selected option, which is your pick or the default until you click; the toggle's *$80K net* option, its sibling step's wording and the export lose the figure too, and
    a test fails on any dollar figure on the map that no cited page sets); the map coloured from your
    own branch picks; the sentence and goals you type at the start saved, dated and word for word
  - [x] Fixes carried in, the rest (#145, 2026-10-11): your own "I'd incorporate at $___" on the
    *Incorporating* step; federal and Alberta incorporation side by side, from their official pages
    (Alberta's registry fees stay named blanks until a person reads the Registry agent product
    catalogue; picking a route and totalling fees come with the cost lines); the GST/HST card quoting
    the CRA's exact two tests, with the uncited 70% "approaching the line" watch
    (`THRESHOLD_WATCH_RATIO`, docs/engines/cfe.md rule 2) gone with it. 2026-10-12: the six pages
    these quote carry a tool check instead of a read date (option B, docs/engines/citations.md § Tool
    checks in the catalogs); none is read by a person yet
  - [x] Smaller follow-ups from the same fixes (#145, 2026-10-11): "Incorporation for liability/SR&ED"
    lights from an activity tag (Software / SaaS, Manufacturing, AI / ML / R&D) the intake's parser can
    mark from the sentence, and the card now says so, naming the tag; a stage card's chip says
    "default" until the person clicks its toggle, not "your pick" (the playbook export and the readout
    API say "default" too)
  - [x] Ride-share and taxi drivers (#147, 2026-10-11): a kind of work of their own, GST/HST
    registration from the first paid ride (the $30,000 line doesn't apply to them, Excise Tax Act
    s.240(1.1)), and a card on the platforms' reporting to the CRA (docs/engines/compliance.md).
    2026-10-12: the platform-reporting page is recorded as read by the maintainer (2026-10-11); the
    other pages these cards cite carry a tool check instead of a read date (option B)
  - [ ] Ride-share and taxi follow-ons: the keyword reader still marks "platform" and "app" as Software /
    SaaS, so a driver "using the Uber platform" gets that tag too; the platform-reporting card for the
    other activities the CRA lists (selling goods, renting property, personal services)
  - [x] The new `platform-reporting` rule type: approved by the maintainer on 2026-10-12
    (docs/engines/compliance.md, authoring rule 1), as was green for a driver who picked *Voluntary now*
  - [ ] Waiting on the maintainer: decide whether the older cards for a kind of work (hobby vs.
    business, the licensing cards) should name the tag that lit them, as the two ride-share cards do,
    instead of only the province
  - [ ] Liability / SR&ED: ask the person about a liability or research need instead of reading only the
    activity tags
  - [ ] Change the sentence on an idea's card: today it can only be removed, with "Your statements"
  - [x] Any road can be drawn: a road type (columns, steps, forks, skill items, cost lines, each cited
    and dated), the map changed to draw it, and today's map wrapped as *Starting any business in
    Alberta* (2026-10-11: `lib/engines/roads/v2026/`, [engines/roads.md](engines/roads.md); road 0's
    *done when* lines, cost lines and *before you open* steps come with the content)
  - [x] Road 0's content: about three cited *done when* lines on each of today's ten steps, and the
    *before you open* steps (register your business name, look up permits and licences on BizPaL, a
    separate bank account), every source a tool check (2026-10-12,
    `lib/engines/roads/v2026/starting-any-business-ab.ts`; in the cockpit, road evaluation colours the
    three new cards as on your road; drawn without it, the map shows them as "no rule yet")
    - [ ] Still open on it: cost lines, skill items and official links on the ten map stages; four
      map stages' own sources point at pages that answer "page not found" (a read, or a tool check
      in place of it, is the maintainer's call); a person's read of each page
  - [x] What you tell DotAmi is kept: your skill marks (once, for every future), your progress on each
    step, the future's road, ending, your date and the sales at which you'd incorporate, and three new
    kinds of number you agree to (income you want, kept once for you rather than on one future;
    savings for starting; a start-up cost line); listed and deletable on *What DotAmi knows about you*
    (2026-10-11: the storage and its server-side code, `lib/futures/`, with no screen yet; the design's
    open items on each number's time period, the per-person table and the speed of *What you've told
    DotAmi* settled in [future-cockpit.md § 7](architecture/future-cockpit.md). The sales at which you'd
    incorporate stay where the honest-map change keeps them, with the map's answers. 2026-10-12: each
    idea's place is now stored in the data file as its international code, such as `CA-AB` for Alberta;
    every answer kept on a future has its date; one current number per cost line and per idea's
    savings. Still to come, each in the open lines below: the job you pick, the *business / career /
    both* answer, the *This is mine* pin, a step's own date, the catalogs' place keys)
  - [x] Receipts: after each answer, one line saying what it changed ("Because you marked 9 skills: 3
    steps now say needs 0 more"), worked out by running the rules before and after (2026-10-12: road
    evaluation, `lib/roads/`: each step's state with its reason in your own answers, the four gauges as
    counts and sums, and the receipt lines, from one pure function and one words file; no screen shows
    them yet, which the cockpit line below does; [§ 6](architecture/future-cockpit.md))
  - [ ] The cockpit: your destination and four gauges (steps, skills, start-up money, your date);
    *What you've told DotAmi / Not told yet*; the Road, Skills, Money and Rules & tax overlays; the
    step panel with its *done when* checklist, skill marks and three kinds of cost; *Next on your
    road*; the what-if bar; compare the two endings and *This is mine* (kept on the future: one added
    column); the export gains all of it. On today's Alberta road the step panel sets a step's status
    through the map, which keeps it ([§ 7](architecture/future-cockpit.md)); the step panel also moves
    today's lever cards onto the road step, so any road can name its own ([§ 6](architecture/future-cockpit.md))
    (2026-10-12, part 1 built: the goal bar and four gauges, the four overlays, the step panel with status,
    *done when* checklist, skill marks and three kinds of cost through the agree prompt, the lists behind
    the gauges, *Next on your road*, and the lever cards on the road step; a road 0 step's status is kept
    with the step progress, not the map, the line below; [§ 2, Cockpit screen as built](architecture/future-cockpit.md).
    Part 2: *What you've told DotAmi / Not told yet* with a receipt after each answer, the what-if bar,
    compare the two endings, *This is mine*, *Since last time*, and the export gaining it all.
    2026-10-12, part 2 built: *What you've told DotAmi* (each answer with its day and what it unlocked,
    **Change** and **Take back**), *Not told yet* with *I don't know* and the one-question box, a receipt
    after every answer where it was given, the what-if bar with **Keep** and **Clear**, *Compare the two
    endings* with **This is mine** (an ending on a road other than today's kept through its own route);
    [§ 2, Cockpit screen as built, part 2](architecture/future-cockpit.md). After review the same day:
    the forks picked are kept with the map, the default side included; the intake's equipment chip left
    off is not an answer; receipts of answers kept with the map wait for the save; *This visit* named for
    what it holds; Compare without the what-if)
    - [ ] Still open on it: *Since last time* on a return visit (steps marked since the last visit, dates
      coming up, figure reminders: it needs the day of the last visit, which isn't kept; today *This
      visit* holds this visit's receipts only); the export gaining the told list, the what-ifs and the
      ending picked; the yearly income question, and taking it back; remembering the last overlay used;
      a *Change* on one of the intake's answers opening that question instead of the intake's first
      screen; receipt lines that name the steps and cards they count; a No to buying equipment survives
      a later save from the intake only if the chip is then switched on or answered again in the box
  - [x] Today's Alberta road keeps its step statuses with the rest of your step progress instead of on
    the map, so *Since last time* can list those changes too (the map then reads them;
    [§ 7](architecture/future-cockpit.md)) (2026-10-12, with the cockpit screen: the map's chip shows the
    person's status where they set one; the map's own lists stay worked out from its toggles)
  - [ ] The way in: three doors on the front page, *Your destination* (four short questions, a receipt
    after each), *Pick a future*, and *Your ideas* renamed *Your futures*. The *business / career /
    both* answer is kept on the future (one added column) when this screen asks it
  - [x] The first written future, *From apprentice to your own shop (Alberta)*: steps from
    Alberta's current trade pages, every *done when* line cited to its step's official page, official
    fees, cost-line names, legal requirements (in the catalog 2026-10-12, every source a tool check,
    `lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts`; no screen lists it until *Pick a future*)
    - [ ] Still open on it: Alberta's registry fees (the Registry Agent Product Catalogue stops
      tools, so a person reads them); the apprentice wage percentages per period (they need a typed
      field); a person's read of each page, which turns its "checked by a tool" into a read; whether
      *Pick a future* may list a road no person has read yet (the maintainer's call, design § 13)
  - [ ] The government's skills list (OaSIS) for the job you pick, tagged *your pick of job*; the job
    you pick is kept on the future (an occupation code and the day you picked it: one added column each)
  - [ ] *Show me an example first*: a filled-in, clearly invented example future
  - [ ] A browser test for the main path: front door → destination → pick a future → cockpit → mark a
    skill → price a line → what-if → compare → *This is mine*
  - [ ] Day-5 checkpoint: the gauges, receipts and the Skills and Money overlays running on today's
    Alberta road, for the maintainer to click through. Raise then: *I don't know* on a skill keeps no
    mark (the design's table listed it as a fourth mark; [§ 7](architecture/future-cockpit.md))
  - [ ] The catalogs' place keys (`AB`, `CA`) and the app's own place type moved to international codes
    such as `CA-AB`, as the data file already stores them (2026-10-12). No phase 1 screen needs it; it
    comes before any place outside Canada is added
- ⬜ **[14b] Phase 2 — Compare futures, dates and your dream numbers.** A second written future; a
  shelf of *Possible futures* (business, career, side gig) with *Peek inside*: what the work looks like
  running, the road, skills, costs to start, and your own numbers beside it with no verdict; *Side by
  side* across your saved futures, sorted by one thing you choose, said on screen; *Keep as a copy* for
  a what-if; a time strip from your own dates (each step's own date kept then: one added column); hours you want, things you won't do, and a dream-life
  list that adds up your own monthly amounts into your target; *I paid this* linking an expense to a
  planned cost. Before this phase is locked, the maintainer is asked again whether to show typical
  numbers beside the official fees and your own quotes (the approved plan's follow-up to decision 2).
- ⏸ **[14c] Phase 3 — The Lens helps, on your own model.** Waits on § 9. Your résumé read where it
  sits, proposing skill marks that quote the line they came from, for you to tick; *Ask the Lens* on a
  step, its drafts tagged "drafted by your model, not from DotAmi's sources"; it never writes into your
  own words; where to find a licensed professional for steps that need one.
- ⬜ **[14d] Phase 4 — More futures, more places.** More businesses and careers; B.C. and Ontario
  versions; futures written by contributors, one cited file per step, through a checker that refuses an
  uncited step.
- ⬜ **[14e] Built to change.** Roads, overlays and questions kept as data the screens read, so the
  layout can change as the cockpit grows without rewriting the rules; each phase reviewed with the
  maintainer before the next is locked.

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
  - [x] *Back up* copies the database file; locked with a passphrase, optional at first and required
    for every backup since 0.3.0 ([8i]; older backups without one still restore)
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
  - [x] Electron 44.5.1 → 44.7.0 (2026-10-11): 55 fixes copied from Chrome's engine, and time-zone
    data 2026d (British Columbia stays on UTC-7 from November 2026, so "today" there turns over an hour
    earlier; a desktop test checks it); reaches installed copies with the next release
  - [ ] ⏸ Code signing and app stores — later
- ⏸ **[7e] Landing page website** — what it is, demos, a download button. Later; hosting not decided.
- ⏸ **[7f] Move an existing PostgreSQL install into the app** — not planned for now: the maintainer
  starts fresh in the app rather than moving data (decided 2026-10-05). If you self-hosted on
  PostgreSQL before the SQLite switch and need your data moved, open an issue.
- 🟡 **[7g] The settings page** — one screen for every setting in Part 1 of the edge-case doc;
  each story adds its own rows. Two settings can be changed there so far: Figure reminders ([8e]) and
  Encrypt the data file ([8i]).
  - [x] One screen (`/settings`), grouped: data and backups · your figures · the Lens · the map ·
    privacy · updates — each group opens with what is true of this copy today
  - [x] Every Part 1 setting listed with its default, choices, warning and the story that brings
    it; a test keeps the page and Part 1 in step
  - [x] A browser test for the page
  - [x] A setting changed there survives a restart: Encrypt the data file, unticked in Settings, is
    acted on at the desktop app's next start and still unticked after it (desktop-tested in
    `e2e-desktop/desktop.spec.ts`, "turning locking off"); Figure reminders survive a reload
    (browser-tested)
  - [ ] Edge cases still untested: a refused clipboard ("Copy failed — select it instead"), because
    a browser grants the clipboard in tests; the saved choices read again when the window is focused
    or comes back from the browser's memory
    ([settings-and-edge-cases.md](architecture/settings-and-edge-cases.md), the settings page)

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
- ✅ **[8e] How old is each figure** — its age on screen; cards say when they lean on an old one.
  - [x] Every figure's age; a figure dated after today is flagged and never counted (it could make the
    GST/HST card say "over $30,000"); dates in the person's own day (#85)
  - [x] The GST/HST card says the last day its newest figure covers ("Newest figure ends …") and which
    quarters aren't fully covered; no cut-off for "old" is picked, since no source sets one (#85,
    `tests/brain-records.spec.ts`)
  - [x] The server measures "a period that has ended" against the computer's own day, not the UTC day
    (a period ending "tomorrow" was accepted on Canadian evenings)
  - [x] The first saved setting: tick monthly, quarterly and/or yearly on the settings page, and a
    "Remind me about this idea" switch (off until turned on) on each idea; both survive a reload (browser-tested).
    One small `Setting` table that every later setting reuses
  - [x] Reminders: a banner on the ideas page and the idea's map when a period has ended that the agreed
    figures don't cover, with "Add figures" and "Not this time" (counted per kind of figure; unit-tested, and browser-tested in `e2e/figure-reminders.spec.ts`)
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
  (2026-10-08, with the maintainer's decisions of that day); receipts are kept as copies, carried by backups and shown inside DotAmi (2026-10-08), and encrypted in the desktop app (2026-10-09); the data file itself is encrypted in the desktop app too, asked first (released in 0.3.0); the other ways in are not.
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
    before adding a receipt). A copy run from source keeps them unencrypted and says so. The two
    questions this left for the maintainer were both answered yes and built: a "start a new key"
    button and encrypting the data file too (both below)
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
  - [x] The third follow-up (the maintainer said yes, 2026-10-10): **Bring these receipts back**, in the
    desktop app, for each `backups/receipts-locked-…` folder whose old key this Windows account can open
    again; asked once; each receipt checked against its record, locked again with the current key, put
    back, and only then removed from the folder; anything that fails stays and is named; the button only
    for receipts that could really come back, never for a folder an earlier Delete still owes (review fix
    round, 2026-10-10); an unfinished add set aside with the rest comes back too, a key file in another
    set-aside folder is said as such, and "already back" only when that copy opens (second review fix
    round, 2026-10-10)
    ([expense-records.md § 12](architecture/expense-records.md)). Not done, with the reasons there: the
    receipt folders a restore or Start fresh set aside
  - [x] iPhone (HEIC) photos as receipts (the maintainer said yes, 2026-10-09): the decoders reviewed
    ([connectors/heic-decoder-review.md](connectors/heic-decoder-review.md)), then option D chosen after a
    double-check and built: kept exactly as given, read by DotAmi's own container reader in a
    no-network worker and drawn by the graphics chip through WebCodecs, on *Show receipt* only; where the
    computer can't decode HEVC it is kept and the viewer says so. Not tried on a Mac
  - [ ] Before DotAmi is sold: the HEVC patent questions (they cover the Electron build already shipped)
    answered by a software-patent lawyer ([the list](connectors/heic-decoder-review.md#questions-for-a-software-patent-lawyer-before-dotami-is-sold))
  - [x] Encrypting the database file (the maintainer said yes, 2026-10-09; chose how on 2026-10-10;
    released in 0.3.0):
    designed and the packages reviewed ([architecture/database-encryption.md](architecture/database-encryption.md));
    built in stacked pull requests (#132, #134, #135, #136, #139): (A) the packages, the Prisma adapter and the measurements;
    (B) the key, the first-start encryption, the window that asks first, the Settings switch, and the
    migrator, backups and restore on the new package; (C) a passphrase on every backup and restoring
    from the lost-key window; (D) the "Start fresh" button
    - [x] (A) the packages installed and measured (no slowdown a person would notice), every Prisma
      Client moved to one factory (`lib/db/client.ts`)
    - [x] (B) the key, a new folder encrypted from its first byte, the window that asks first (four
      answers), the crash-safe first-start encryption, the lost-key window, the Settings switch, and
      the migrator, backups and restore on the new package
    - [x] (C) a passphrase on every backup; Restore from a backup… in the lost-key window, under a new
      key, the locked file kept in backups/
    - [x] (D) Start fresh… in the lost-key window, asked twice; the locked file, its key and the receipts
      kept in backups/
    - [x] A brand-new data folder asked the same four choices (Back up first… turned off there), and
      the Settings switch able to turn locking off: the next start decrypts the data file and its safety
      copies, crash-safe, and deletes the key once nothing opens with it (the maintainer said yes,
      2026-10-10; [database-encryption.md § 15](architecture/database-encryption.md)); after review, the
      turn-off is recorded in a note naming the key, a damaged file stays encrypted without stopping the
      start, and a blocked swap leaves no plain copy; after a second review, a safety copy deleted while
      its encrypted original's wipe was owed, a readable file shown as locked, and a full disk no longer
      stop DotAmi from starting
    - [x] Found in review, older than this change (on main): an encrypted data file left with a
      half-written change (a power cut mid-write leaves its rollback journal) failed every start, because
      the key was checked on a read-only open that can't roll the journal back (desktop/main.mjs
      opensWith); now the file is opened once read-write with its key first, so SQLite rolls it back
    - [ ] A question for the maintainer: turn receipt encryption off too?
  - [ ] From a spreadsheet's rows · from a bank statement's ticked rows ([8g]) · a receipt photo the Lens reads ([9])
  - [ ] Words typed into the *Your expenses* form before the page has finished loading are emptied
    when it loads (found 2026-10-11 by the review of the front page's same fix; only on a reload or a
    typed address). The front page's way, reading what is already in each box as the page loads, with
    its own browser test that holds the page's scripts back

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
- ⬜ **[10b] Progress per step** — done · doing · not for me · roadmap §2 · #43 (2026-10-11: built as
  part of [14a], in the cockpit)
- ⬜ **[10c] Tasks and questions per step** · roadmap §3 · #44 (2026-10-11: each step's *done when*
  checklist is built in [14a]; the questions per step come later)
- ⬜ **[10d] Deadlines and reminders** — cited, with a reminder before each.
- ⬜ **[10e] The accountant package** — one export of the map, confirmed figures, open questions · extends #41
- 🔄 **[10f] Look inside your future** — the same plan as [14a], written twice on 2026-10-11 (once by
  the fixes in #142, once by the design in #141). Its tasks, done and open, are now listed once, under
  [14a] in § 14; this code stays so links to it still lead somewhere.

## 11 — The map's content: the tools, tactics and tricks

- ⬜ **[11a] Roadmaps as data** — one file per step; a checker refuses a step with no source · roadmap §1 · #42
  (2026-10-11: the road type in [14a] is the first part; the contributor files and the checker are [14d])
- ⬜ **[11b] Check sources against the law's own words** — a model quotes, code checks the quote
  appears word for word in the official text, a person decides.
  - [x] The record and the code check (2026-10-11, the maintainer's option B): a citation may carry a
    tool check (the day and the quotes) instead of, or as well as, a read; every card says which
    ("Read by a person on …" only when a person is recorded as the reader, "Read on …" otherwise, or
    "Checked by a tool on …"); `node scripts/check-quotes.mjs` checks the quotes on the live page · [docs/engines/citations.md](engines/citations.md)
  - [ ] A model proposes the quotes for a source (not built)
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
- ✅ **[13b] Releases** — tags, changelog, release notes; the app's updates come from these.
  - [x] Version tags (v0.1.0, v0.2.0, v0.2.1, v0.3.0) and [CHANGELOG.md](../CHANGELOG.md)
  - [x] A tag builds the Windows installer into a draft release; the maintainer writes the notes and publishes
  - [x] A release after v0.2.0 built by the fixed workflow and published end to end (with [7d]): v0.2.1
    and v0.3.0 were each built by the release workflow from their tag and published; 0.2.0 → 0.2.1
    reached an installed app (by hand, 2026-10-08)
  - [x] A release with a database change ships its migration, which the desktop app applies itself
    (`tests/desktop-migrate.spec.ts`), and says so in its CHANGELOG entry
- 🔄 **[13c] Security** — CodeQL, grouped Dependabot, audit; a privacy review for each import path;
  a threat model for the Lens's powers before [9g].
  - [x] `source-map-js` 1.2.1 → 1.2.2 (build-time; Dependabot #71, merged 2026-10-07)
  - [ ] `sprintf-js` GHSA-hp3w-g68c-fv3c (build-time, under the installer builder: `electron-builder` →
    `app-builder-lib` → `@electron/get` → `global-agent` → `roarr`). **No fixed version exists yet** — it covers every
    release up to 1.1.3, the newest (checked 2026-10-11)
  - [x] `sharp` 0.35.5 — its SVG reader's advisory (#73) · `postcss-selector-parser` — gone with
    Tailwind 4 (#80)
  - [ ] Build-time tooling advisory GHSA-vfj7-8cjw-p6xm (`braces` stack-exhaustion). **No fixed
    version exists yet** — it covers every `braces` release up to 3.0.3, the newest (checked
    2026-10-06 and again 2026-10-11). Since Tailwind 4 it reaches DotAmi only through Next's ESLint plugin
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
  - [x] The desktop test types into the front page only once it has finished loading, and words a
    person types before then are kept by the page (a browser test holds the page's scripts back) —
    2026-10-11; the desktop test had failed on CI three times in about 15 hours with "Map it" greyed out
- ⏸ **[13f] Privacy policy, terms, and the usage-sharing decision** — planned for before the first
  download; the first installer (0.2.0, 2026-10-06) went out before them, so they are still owed. Until
  then the privacy log below is the record of what each version keeps, sends, ships and asks.
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

## 15 — Real examples: how real people started (later)

There are endless ways to start something. Besides the official road, people want to see how real
people actually began — often with very little — so they can find a way to start soon. This is a
library of those stories, each one cited and labelled, kept apart from the official rules. Recorded
2026-10-11 at the maintainer's request; not started.

- ⬜ **[15a] What one real example is.** One business a real person started: what it was, what it took
  in their own words (money, skills, tools, time), where and when, the link to where they said it (a
  video, an article, a testimonial) and the day it was read. Shown labelled "a real example of what one
  person says they did — not advice, not a promise". A new kind of source, with its own section in
  [CONTRIBUTING.md](../CONTRIBUTING.md) before the first entry.
- ⬜ **[15b] The AI answers from the library, with links.** When the Lens suggests a way to start, it
  looks the examples up and quotes them with their links, so every suggestion points at a real source.
  A test that every answer cites an example or an official page. How the AI learns from the library is
  for the maintainer to confirm (he raised training or fine-tuning it on 2026-10-11). The recommended
  way is looking the examples up rather than training them into a model, because a trained model
  can't point back to the source it learned from and could blend stories into something nobody did.
- ⬜ **[15c] Finding examples.** A search proposes candidate stories from public articles, videos and
  testimonials; a person (or the creator) checks each one before it enters the library.
- ⬜ **[15d] Creators as contributors.** People who already show others how to start businesses can add
  or approve their own entries, credited and linked back, through a simple submission form or GitHub.
- ⬜ **[15e] Permissions.** Beyond a link and a short quote, using someone's video or article needs their
  permission; the terms are checked by a professional before anything more is republished.
- ⬜ **[15f] "What I have right now."** You say what you could put in (money you have on hand, skills,
  tools, time). Every future and example stays listed; you can sort them by one thing you pick
  ("lowest start-up money", "could start this month") or turn on a filter for ones that started with
  means like yours, said on screen and cleared with one click. DotAmi never narrows the list on its
  own. What you type stays yours.

## 16 — Your own test results (later)

Recorded 2026-10-11 at the maintainer's request; not started.

- ⬜ **[16a] Bring in a test result.** Import (and export again) the results of an IQ or personality test
  you took elsewhere, kept as your own document, dated and exactly as given; shown, exported and deleted
  like everything else.
- ⬜ **[16b] You choose what it may inform.** For each result: "may the Lens use this when suggesting
  futures?" DotAmi never turns it into a type or label of you, and anything suggested from it is a
  proposal you tick.

## 17 — DotAmi gets better over time (later)

Recorded 2026-10-11 at the maintainer's request; not started. Today everything stays on each person's
computer and DotAmi runs no server.

- ⬜ **[17a] What gets better, and how we know.** Which parts improve with use (the examples library's
  coverage, the questions, the suggestions), measured against the test set ([9c]).
- ⬜ **[17b] Keeping the library clean.** Duplicates merged, sources and dates checked, examples and
  roads filed, so the library stays trustworthy as it grows.
- ⏸ **[17c] Learning from many people — only if each person says yes.** Nothing is pooled unless the
  person agrees (off unless they say yes, as decided for usage sharing in [13f]); it needs anonymising,
  a place for it to go, and the privacy policy and terms first ([13f]).
