# Task list — what's being built, and what you can pick up

Last updated: 2026-10-05. Every story planned for DotAmi, with its tasks. The plan behind it is
[architecture/use-cases.md](architecture/use-cases.md) (who it's for, the decisions, the build
order); the settings and edge cases each story must test are in
[architecture/settings-and-edge-cases.md](architecture/settings-and-edge-cases.md) — the codes in
brackets match.

**Status:** ✅ done · 🔄 in progress · ⬜ not started · ⏸ waiting on a decision or another story.

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
  - [ ] An installer you double-click (packaging, with the database tools inside)
  - [ ] A Windows build from CI (Mac and Linux after)
- ⬜ **[7c] Backup, restore, moving to a new computer.**
  - [ ] *Back up* copies the database file; optional passphrase encryption
  - [ ] *Restore* checks a backup before replacing anything
  - [ ] Setup suggests turning on disk encryption
- ⬜ **[7d] Installers and automatic updates** (unsigned, through GitHub releases, for now).
  - [ ] An installer per operating system on each release
  - [ ] The app checks for and installs updates
  - [ ] ⏸ Code signing and app stores — later
- ⏸ **[7e] Landing page website** — what it is, demos, a download button. Later; hosting not decided.
- ⏸ **[7f] Move an existing PostgreSQL install into the app** — a copy script for anyone who
  self-hosted before the SQLite switch; runs on their own computer; waits for [7b].
- 🔄 **[7g] The settings page** — one screen for every setting in Part 1 of the edge-case doc;
  each story adds its own rows.
  - [x] One screen (`/settings`), grouped: data and backups · your figures · the Lens · the map ·
    privacy · updates — each group opens with what is true of this copy today
  - [x] Every Part 1 setting listed with its default, choices, warning and the story that brings
    it; a test keeps the page and Part 1 in step
  - [x] A browser test for the page
  - [ ] A setting changed there survives a restart — waits for the first setting that can be
    switched (none can yet; each arrives with its story, starting with [7b]'s data folder)

## 8 — Your figures (confirmed totals, never the records) · roadmap §5 · #46

- ⬜ **[8a] The figures store.**
  - [ ] A figure: kind, period or date, amount, typed fields, source, proposed / confirmed / retracted
  - [ ] The rules engine reads confirmed figures; a figure beats an estimate
  - [ ] Cards say *"from your records · N rows"*, source one click away
  - [ ] A privacy review of the store before the first import lands
- ⬜ **[8b] The agree prompt** — figures are confirmed only by the person agreeing; *Agree* or
  *No, I'll do it myself*; nothing can skip it.
- ⬜ **[8c] Drop a file: Excel and CSV.**
  - [ ] Read in memory, never kept; totals per period + row count + file name are what's stored
  - [ ] Map columns once per source, remembered
  - [ ] Invented test files per package (QuickBooks, Xero, Wave, FreshBooks, Sage) — never a real export
- ⬜ **[8d] Sources, and "What DotAmi knows about me"** — every figure, where it came from;
  *forget this source*; *delete everything*.
- ⬜ **[8e] How old is each figure** — its age on screen; cards say when they lean on an old one.
- ⬜ **[8f] Tax software, through the CRA's line numbers.**
  - [ ] In: last year's return PDF → figures tagged with form and line
  - [ ] Out: a sheet of each figure next to the line it goes on, for any tax software
  - [ ] Connector notes: Wealthsimple Tax, TurboTax
- ⬜ **[8g] Bank and card records** — opt-in, behind a warning.
- ⬜ **[8h] Books on disk** — read-only: ledger/hledger, GnuCash, Sage 50, QuickBooks Desktop.

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
- ⬜ **[13b] Releases** — tags, changelog, release notes.
- 🔄 **[13c] Security** — CodeQL, grouped Dependabot, audit; a privacy review for each import path;
  a threat model for the Lens's powers before [9g].
  - [ ] Build-time tooling advisory GHSA-vfj7-8cjw-p6xm (`braces` stack-exhaustion). **No fixed
    version exists yet** — it covers every `braces` release up to 3.0.3, the newest (checked
    2026-10-05). It reaches DotAmi only at build time, through Tailwind 3 and Next's ESLint plugin,
    on glob patterns from the project's own config; nothing shipped to people runs it. Either wait
    for a fixed `braces`, or the upgrade below.
  - [ ] Tailwind 3 → 4 (Tailwind 4's own packages don't use `braces`; then check the ESLint path)
- ✅ **[13e] Tests that use the app like a person** — Playwright on the real build, a CI job on
  every pull request (#64); `npm run test:browser`. Each new screen adds its own test. A required
  check on `main` since 2026-10-05: nothing merges with them failing.
- ⬜ **[13f] Privacy policy, terms, and the usage-sharing decision** ⏸ maintainer's decision;
  needed before the first download.
- ⬜ **[13g] Screen-by-screen review.** For every screen, five questions answered with evidence:
  - [ ] **Useful:** what does a first-time person learn here that they didn't know?
  - [ ] **Guides:** is the next step obvious, and does it go somewhere that helps?
  - [ ] **Honest:** every figure and claim shows where it came from; nothing invented
  - [ ] **Wired:** what's typed or clicked saves, reloads and survives a restart; errors handled
  - [ ] **Tested:** a browser test covers its main path and edge cases
  - Already found: the intake's field labels aren't tied to their dropdowns (a screen reader can't name them).
- ✅ **[13i] The landing page and intake were dead in production builds** — fixed in #64.
