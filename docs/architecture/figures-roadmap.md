# Your figures: roadmap for the stories not started yet

Status: proposal, read-only reconciliation of seven story designs, 2026-10-06, against main `8007477`.
Scope: [8c-2], [8c-3], [8d], [8e], [8f], [8g], [8h]. These are the not-started stories after [8a] (figures store), [8b] (agree prompt) and [8c] (Excel/CSV drop), which are merged in #77 and #78.
Rules that bind every story (from `CLAUDE.md`, `docs/architecture/figures-privacy-review.md`):

- Figures are **totals, never transactions** (a single business expense is not a figure: it is an expense record, [8i], [expense-records.md](expense-records.md)). A file's bytes are read in the window, in memory, and never sent or kept.
- **Only the person's click in the agree prompt confirms a figure.** No permission level skips it (ruling 2026-09-28).
- IDs are forever: figure kinds, source kinds and any new id list can only be appended to.
- Every rule, rate or threshold shown is cited and dated. DotAmi never invents a number, never says "you should", and never files anything.
- No amount in a URL; no figure value in a log; every write goes through `readJsonWithLimit`.
- Maintainer rulings that shape this plan (newer beats older): Excel first, checked against each vendor's own docs (2026-09-23). DotAmi holds no data or keys by default and doesn't re-read live (2026-09-24, settled after). People may bring their own keys (2026-09-27). Bank records are allowed with a warning, the user's choice (2026-09-28). Figures are confirmed only by an agreement click (2026-09-28). Any tax tool, through the CRA's form and line numbers (2026-09-28).

---

## 1. One shared data model

Several designs invented separate tables for the same thing. This is the single set.

| Table | What it holds | Used by |
|---|---|---|
| `FigureSource` | One row per batch proposed (a file drop, a typed batch, an agent batch, a return PDF, a statement, a books read): idea, kind, label, optional SHA-256 fingerprint of the file, rows, optional account, created, forgotten. **No amounts.** Unique on (idea, fingerprint). | 8c-2, 8d, 8f, 8g, 8h |
| `Figure.sourceId` | Link from each figure to its batch, with on-delete set-null. The existing `sourceKind`, `sourceLabel` and `sourceRows` text stays on every figure. | all |
| `SourceAccount` | A bank or card account that many statements come from: the person's own name for it (no 4+ digit runs), kind, when the warning was agreed, retired. **No account or card number, no hash of one.** | 8g (and 8d's forget) |
| `ReaderPreset` | "Remember what I picked": (reader, key) to a choice, e.g. date and amount columns for a given column-name row. Not tied to an idea; capped about 100 per reader. | 8c-2 (`file-columns`), later 8g (`bank-csv-columns`), 8h (`books-accounts`) |
| `Setting` | DotAmi's first stored settings: key (a catalog id) and value. | 8e, maybe 8g and 8c-2 |
| `Figure.taxYear`, `Figure.formLine` | Optional; only if 8f decision 3 says yes. | 8f |

New permanent ids, named once: source kind `bank` (8g); maybe `books` (8h, decided before 8h proposes anything); the 8f T2125 kinds; maybe one 8g kind; `SourceAccount.kind` values; `ReaderPreset.reader` values; `Setting` keys = catalog ids.

### Migration order

1. **M1 settings**: a new `Setting` table. Prisma's generated SQL is fine.
2. **M2 figure sources**: new `FigureSource` and `ReaderPreset` tables, plus a **hand-written** `ALTER TABLE "Figure" ADD COLUMN "sourceId" ... REFERENCES "FigureSource"("id") ON DELETE SET NULL`. Prisma would otherwise copy the whole Figure table. The desktop migrator (`desktop/migrate.mjs:101`) runs every migration inside `BEGIN IMMEDIATE`, and SQLite ignores `PRAGMA foreign_keys=OFF` inside a transaction (sqlite.org/foreignkeys.html, read 2026-10-06). The 8c-2 design checked on a scratch copy that the hand-written line leaves `prisma migrate diff` empty. A backfill of old rows is optional (a maintainer question).
3. **M3 source accounts**: a new `SourceAccount` table plus a hand-written `ALTER TABLE "FigureSource" ADD COLUMN "accountId" ... REFERENCES "SourceAccount"("id") ON DELETE SET NULL`. Alternative: create both inside M2.
4. **M4 tax lines** (optional): plain `ADD COLUMN`s on Figure.

Every migration must pass `tests/desktop-migrate.spec.ts` plus a drift check that prints "This is an empty migration". **Standing trap:** any later generated rebuild of `FigureSource` or `SourceAccount`, run by the desktop migrator with foreign keys on, would blank every child's link. Later changes to those tables need hand-written SQL and a test.

---

## 2. Build order

*Status 2026-10-07:* rows 2-6, 8 and 10 are merged (#81-#87; row 10 is the "Where is this file from?"
question). The maintainer answered the decisions on 2026-10-07, so the "Blocked by" column below is the
original plan; what still waits is the shared question of where a figure's source is kept (row 11, and
the account link in row 13), plus a few smaller choices taken up as each slice starts.

| # | Work | Blocked by |
|---|---|---|
| 1 | Record fixes: the Sage 50 Canada row in `docs/connectors/README.md:49` (links a US-edition article), the Figure table missing from `CLAUDE.md:51`, the stale comment at `prisma/schema.prisma:78`, the stale settings line | nothing |
| 2 | 8e first slice: figure ages, local-day dates, the card refuses future-dated figures, today rolls over | nothing |
| 3 | 8d read-only page + inventory test; 8d log hardening | nothing |
| 4 | 8c-3 practice files + "fails today" tests | nothing (the pipeline move waits on 8c-3 decision 8) |
| 5 | 8c-2 window helpers (fingerprint, column matching) | nothing |
| 6 | 8g pure bank-totals logic | nothing |
| 7 | 8f read-only PDF spike | nothing technically; leans on 8f decision 1 |
| 8 | 8h books core + GnuCash XML (no proposing yet) | the source-kind name before proposing |
| 9 | M1 + 8e reminders | settings location, yearly, which ideas, delivery |
| 10 | Catch bank files in today's file drop | 8g decision 8 |
| 11 | M2 + 8c-2 storage and screen + 8d "Forget this source" | the shared source decisions |
| 12 | 8d "Delete everything" | 8d decisions 1, 2, 5 |
| 13 | M3 + 8g rest | 8g decisions |
| 14 | 8f kinds, catalog, screen, sheet | 8f decisions |
| 15 | 8c-3 gap fixes | 8c-3 decisions |
| 16 | 8h desktop readers | 8h decisions, test machines |
| 17 | 8e Windows notification | 8e delivery decision |

---

## 3. The stories

### [8c-2] Remember a file's columns, and recognise the same file dropped twice

**What it does.** The second time someone drops a spreadsheet with the same column names, DotAmi pre-fills the date and amount columns, the date order and the amount style; the person still checks and agrees. DotAmi also takes a fingerprint (SHA-256) of each file inside the window. If the very same file comes back, DotAmi says when it was first dropped and proposes nothing again. Only column names (or less, per decision) and the fingerprint are kept, never a figure from the file.

**Design.**
- `lib/figures/file/fingerprint.ts` uses `crypto.subtle.digest` and returns null where it is missing (plain-http network addresses).
- `lib/figures/file/layout.ts` normalises a column-name row and finds a remembered one in rows 1-30. It only accepts a row that passes `looksLikeHeader`, so a data row is never remembered.
- Propose accepts a `fingerprint` (64 lowercase hex characters). It records a `FigureSource` and refuses a live duplicate.
- `GET /api/figures/sources`; `GET/POST /api/figures/layouts` and `.../layouts/forget`. Writes are page-only (`refuseUnlessFromAppPage`).
- The layout is saved only after Review.

**Edge cases.**
- A renamed copy is recognised.
- A re-exported file has different bytes (an .xlsx zip stores times per entry), so the 8c totals check stays the main guard.
- Xero's 500-per-export batches share column names.
- A remembered column wider than this file is ignored.
- Dates that settle the order beat a remembered order.
- An outside agent sending a fingerprint is a maintainer question.

**Sources (read 2026-10-06):**
- developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
- developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
- developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy
- sqlite.org/lang_altertable.html, lang_createindex.html, foreignkeys.html
- nodejs.org/api/sqlite.html
- prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions
- pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
- quickbooks.intuit.com/learn-support/en-ca/help-article/business-reports/customize-reports-using-new-modern-view/L2ta2XZDQ_CA_en_CA
- central.xero.com/0/article/Export-invoices-and-bills (not re-readable as text today)
- support.freshbooks.com/hc/en-us/articles/227478548

**Decisions:** where sources live; what forget does; the same file after a turn-down; one idea or all; what is kept about column names; a setting or always on.

### [8c-3] Practice files shaped like each accounting program's export

**What it does.** Six invented spreadsheets, shaped by each vendor's own help pages: QuickBooks Online, Xero, Wave, FreshBooks, Sage Accounting and Sage 50 Canadian. Each runs through the real file-drop steps and is checked to the cent, with every left-out row listed by reason. No real export and no real figures anywhere.

**Design.**
- `tests/fixtures/packages/*.ts` builds each file in code.
- `tests/helpers/encode.ts` writes windows-1252 bytes.
- `make-xlsx` gains formulas saved without a value.
- One table-driven `tests/figures-file-packages.spec.ts`.
- Known gaps are pinned with `it.fails` until fixed, then become normal tests.

Gaps already found by running the real code:
- Xero `UnitAmount` is pre-filled (July $150 against a true $350). *Fixed 2026-10-07.*
- A sparse QuickBooks grouped report gets no date guess. *Fixed 2026-10-07.*
- Xero `InvoiceDate` is not pre-filled. *Fixed 2026-10-07.*
- An Invoice and its Payment are counted twice. *Fixed 2026-10-07 (#89, the Type column).*
- A FreshBooks summary row is taken as the header.
- A Wave refund sits in a Debit column.
- A Sage void invoice is counted.
- Two-digit years are refused.
- Months-across reports can't be read.

**Sources (read 2026-10-06):**
- central.xero.com/s/article/ Export-invoices-and-bills, Import-customer-invoices-GL, Import-customer-invoices-US, Receivable-Invoice-Detail-report-New, Export-or-print-a-report
- QuickBooks Canada export and report help pages
- developer.intuit.com/app/developer/qbo/docs/api/accounting/report-entities/transactionlist
- support.waveapps.com articles 38600080764692, 4411360860692, 38991118101908, 38970823071508, 4416673958676, 115005571103
- support.freshbooks.com articles 219575467, 227478548, 360022118351, 360002789691
- ca-kb.sage.com solutions 210129222721353, 240304191727837, 240304191731950
- help-sage50.na.sage.com/en-ca/core/2026/Content/Reports_Forms/ExportingReports.htm, plus the 2016/2023/2024 date and language pages

Column names are marked "assumed" wherever a vendor doesn't publish them.

**Decisions:** guessed headers; record vs fix; payments; debit/credit (shared with 8g refunds); voids; two-digit years; months across; shared pipeline.

### [8d] What DotAmi knows about you; "Forget this source"; "Delete everything"

**What it does.** A page, read from the data file each time it opens, lists every figure by source with its dates. It also lists statements (verbatim), ideas, links, map progress, the backups folder, the window's own storage, and anything sent elsewhere. "Forget this source" takes back agreed figures and turns down waiting ones. "Delete everything" asks twice, deletes in one transaction, then wipes the file's free space (VACUUM), and lists what it can't reach.

**Design.**
- `lib/privacy/inventory.ts`, with a test that fails if any Prisma model or browser-storage key is missing from it.
- `lib/privacy/holdings.ts`; the page `/your-data`.
- `POST /api/figures/forget-source`; `POST /api/your-data/delete-everything` (refuses if counts changed between the two asks).
- Logs hardened to the error's name and code only.

Found today:
- Deleted rows stay readable in the file until VACUUM (checked on a scratch file).
- Four routes log whole error objects.
- The retracted date shows the UTC day.

**Sources (read 2026-10-06):**
- sqlite.org/lang_vacuum.html, sqlite.org/pragma.html
- Prisma v6 transactions and referential actions
- electronjs.org/docs/latest/api/session and /api/app
- MDN Same-origin policy and sessionStorage
- privacy.claude.com/en/articles/7996866 (30-day API retention, updated 2026-07-01; re-checked)
- canada.ca keeping-records page (modified 2026-08-03)

**Decisions:** what "everything" covers; whether statements may be deleted; forget keeps or erases (shared); what a source is (shared); where delete runs; agents (shared); the CRA records line.

### [8e] How old each figure is

**What it does.**
- Each figure says how long ago its period ended and the person's own day it was agreed.
- A future-dated figure is flagged, and no card uses it.
- Cards say their newest figure's end, which recent quarter isn't covered, and which older figures their rule doesn't read.
- An optional reminder (off by default) says when a period ended uncovered.
- "Old" never comes from an invented number.

**Design.**
- `lib/figures/age.ts` works on day strings plus `Intl` (no new library).
- `readRevenue` moves future-dated figures to "not counted" and lists out-of-window ones.
- A hook keeps "today" current while the window is open.
- The `Setting` table; `GET/PUT /api/settings`; a banner. (Built as a pure function in `lib/figures/reminder.ts` run by the page on figures it already loaded, so no `GET /api/figures/reminder` route exists.)
- Optionally a Windows notification from the desktop main process, with generic text only.

Reproduced today: a future October 2026 figure makes the card read "over $30,000", and a 2024 figure silently disappears.

**Sources (read 2026-10-06):**
- canada.ca when-register-charge page (modified 2026-06-16; re-checked)
- RC4022 (reporting periods by revenue; re-checked)
- canada.ca reporting-requirements-deadlines and instalment due-dates pages
- electronjs.org notifications tutorial, Notification and session APIs
- electron-builder scheme.json (appId as the Windows app id)
- learn.microsoft.com notification UX guidance; support.microsoft.com notification settings
- MDN Date.parse and Intl.RelativeTimeFormat
- RFC 5545
- playwright.dev emulation and clock

**Decisions:** an "old" label; reminder delivery; yearly; which ideas; ~~server clock (shared)~~ decided 2026-10-07 (the computer's own day); where settings live (shared). **Must count coverage per kind**, so yearly T2125 totals don't silence revenue reminders.

**Decided 2026-10-07 (maintainer), built in the settings slice:** where settings live: one small `Setting` table, a name and a value per row, that every later setting reuses. Yearly: monthly, quarterly and yearly are tick-boxes, any combination or none. Which ideas: a switch per idea, off unless turned on. Reminder delivery is a banner plus a calendar file; that is a later slice, so for now the choices are saved and nothing reminds yet. (Since built: the banner on 2026-10-07, the calendar file, "Add to my calendar", on 2026-10-08.) The per-idea switches are a list of idea ids inside the reminders setting's value, not a column on `Venture`, so an idea that is later removed leaves nothing that can break (an id that matches no idea is ignored).

### [8f] Tax software, through the CRA's line numbers

**What it does.** The person drops last year's return PDF. DotAmi reads it in the window, finds the T2125 totals (line 8299 gross business or professional income; 9368; 9369; 9946 net income, which carries to T1 13500/13700/13900) and proposes each with its form, line and page. A tax sheet lists agreed figures beside the CRA line they belong on, to copy into any tax software. DotAmi never files.

**Design.**
- `pdfjs-dist` 6.4.299, pinned exactly and never below 6.2.108 (GHSA-hq66-cqwq-w95j / CVE-2026-16633 affects older 6.x).
- Run in its own module worker with every fetch off; the viewer, annotation layer and scripting are never loaded.
- `lib/figures/return/*`.
- A cited line catalog under `lib/engines/taxlines/v2026/`.
- New figure kinds whose names are a decision.
- `return-drop.tsx` and `tax-sheet.tsx`.

**Edge cases.**
- Picture-only and password-locked PDFs are refused.
- Wealthsimple's condensed mailing copy may lack the T2125.
- TurboTax worksheets repeat lines: one figure if the amounts match, a held conflict if not.
- Two T2125s (a partner, or two businesses): nothing is pre-ticked.
- Older years use older T1 lines (162/135 in 2018).
- Quebec.
- Hidden white-on-white text becomes a held conflict.

**Sources (read 2026-10-06):**
- canada.ca T2125 Part 3 page (modified 2026-08-31); T2125 forms page (modified 2026-05-01)
- T4002 chapters (Rev. 25; lines 8299 and 9946 re-checked)
- canada.ca self-employment lines page (modified 2026-01-20; re-checked)
- CRA blank T2125 PDFs 2018-2025 (script check only)
- canada.ca Quebec tax package page
- help.wealthsimple.com articles 4409636031515, 4409187561243, 4409704624795
- TurboTax Canada print/save articles
- registry.npmjs.org/pdfjs-dist; github.com/advisories GHSA-hq66-cqwq-w95j and GHSA-wgrm-67xf-hhpq (re-checked)
- unpdf, pdf-parse, pdf2json and mupdf evaluated and not proposed

**Decisions:** plain code vs the Lens; kind names; form/line columns; years; lines; sheet form; Quebec; test files.

### [8g] Bank and card statements, opt-in

**What it does.**
- A warning comes first; DotAmi never asks for a bank login.
- A CSV or OFX/QFX transactions download is read in the window.
- Nothing counts as revenue until the person ticks it; every box starts unticked.
- Only agreed monthly totals are kept, under the person's own account name.
- Account and card numbers never leave the reader.

**Design.**
- `lib/figures/bank/*` (totals, CSV columns, OFX reader).
- **OFX reader (built, no screen yet):** `lib/figures/bank/read-ofx.ts` wraps the free `ofx-js` package,
  pinned at exactly 1.1.2 after the maintainer's decision (2026-10-07) to use one someone else built and read it
  first. The reading, what was found and how each finding is handled:
  [connectors/ofx-reader-review.md](../connectors/ofx-reader-review.md). Run it in a Web Worker
  from the screen: the package cannot be interrupted once it starts.
- Source kind `bank`; `SourceAccount` (the warning agreed once per account, or per file).
- Routes under `/api/figures/bank-sources`, so the browser privacy check still covers them.
- The server replaces any client label with the account's name.
- A proposed privacy rule 6, enforced by type: the reader's result has no account fields. Proven by a byte scan of the database file and its `-wal` after Agree.

**Edge cases.**
- Partial months aren't proposed.
- Pending transactions are never counted.
- OFX corrections are applied.
- Duplicate FITIDs count once.
- Other currencies aren't converted.
- Overlapping CSVs are refused.
- Transfers, loans, refunds and equipment sales start unticked. The CRA excludes capital-property sales from the $30,000 test.
- A DOCTYPE or entity declaration in OFX is refused (built: `readOfx`).
- Two OFX downloads pasted into one file are refused, not read as the first only (built; `ofx-js` alone drops the second without a word).
- 10 MB crafted files are capped before parsing (10 MB, 500,000 tags, no tag attributes, 100,000 transactions) and checked against a clock (the worst crafted file built so far took a few seconds); the wait is bounded, not removed, until the screen runs the reader in a Web Worker.

**Sources (read 2026-10-06):**
- financialdataexchange.org OFX work group and OFX Banking 2.3 PDF
- www.ofx.net (now parked; re-checked)
- TD EasyWeb help ids 351, 352, 842, 336
- help.scotiabank.com download articles
- desjardins.com system-modernization, AccèsD FAQ and statements pages
- RBC and CIBC how-to pages (formats not listed)
- BMO business help (personal pages unread)
- canada.ca when-register-charge page
- CRA Folio S5-F4-C1
- npm and GitHub advisories for ofx-js, ofx-data-extractor, node-ofx-parser, fast-xml-parser, xml2js

**Decisions:** warning frequency; a separate switch; same or new kind; ~~OFX reader~~ (decided 2026-10-07: a free package, read first; see the review above); last four digits; currency; refunds (shared with 8c-3); catching bank files in today's file drop (urgent: today's drop reads bank CSVs with no warning; this is on main since #78 and in no release).

### [8h] Books on your computer, read only

**What it does.** Reads plain-text journals, GnuCash, Sage 50 Canadian and QuickBooks Desktop without changing them. It adds up the revenue accounts the person picks into monthly totals that wait in the agree prompt.

**Design.**
- A shared books core (accounts in, monthly totals out, exact cents, per currency, scheduled transactions never counted).
- GnuCash XML in the window first (fflate is already a dependency; a streaming XML parser or DOMParser).
- GnuCash SQLite, hledger, Sage 50 (ODBC with a "Read data"-only Sage user) and QuickBooks Desktop (SDK, query requests only, pinned by a test) need desktop placement, a decision.
- A desktop-reader row goes into the privacy review before any of those merge.

**Edge cases.**
- The program has the book open: GnuCash saves through a temp file, so DotAmi reads the last save. A `.LCK` file is visible only to a desktop reader. QuickBooks single-user mode is never requested.
- A book from a newer version: refused by the GnuCash features list or table versions; hledger's minimum version is checked.
- Income accounts can hold interest or GST/HST collected, so the person decides.
- A read-only proof hashes the file before and after.

**Sources (read 2026-10-06):**
- hledger.org manual, install and Ledger-compatibility pages; github.com/simonmichael/hledger
- ledger-cli.org docs, download page and LICENSE
- gnucash.org file and backup guides; wiki.gnucash.org XML and SQL pages
- GnuCash source: gnucash-v2.rnc, gnc-features.cpp, the dbi, xml and sql backends, gnc-date.h, LICENSE
- help-sage50.na.sage.com 2026 third-party rights (re-checked), third-party software and Connection Manager pages
- ca-kb.sage.com SDK and data-folder articles
- us-kb.sage.com 221924750012693 (US edition, Pervasive; re-checked)
- developer.intuit.com QuickBooks Desktop SDK pages
- QuickBooks Canada discontinuation and CSV export pages
- nodejs.org/api/sqlite.html; sqlite.org/c3ref/open.html
- MDN CSP script-src; github.com/sql-js/sql.js

**Decisions:** desktop code; journals; GnuCash SQLite; the Sage password; remembered picks (shared); pre-ticking; size limit.

---

## 4. Decisions only the maintainer can make (grouped)

**Shared**
- Where sources live.
- What forget does.
- Whether to backfill old rows.
- The same file after a turn-down.
- One idea or all.
- What is kept about column names and picks.
- Where settings live.
- ~~Which clock sets "today" on the server.~~ Decided by the maintainer 2026-10-07: the computer's own local day.
- What agents may do.
- How today's file drop catches bank files.

**Per story**
- 8c-3: the six package questions plus the shared pipeline.
- 8d: what "everything" covers, statements, where delete runs, the CRA records line.
- 8e: an "old" label, reminder delivery, yearly, which ideas.
- 8f: eight questions.
- 8g: seven questions.
- 8h: six questions.

Each is written out with options in the reconciliation output.

---

## 5. Conflicts resolved or flagged

- Three source tables merged into one `FigureSource` plus `SourceAccount`. One link column on Figure, not two.
- Two or three remembered-choice tables merged into `ReaderPreset`.
- 8e's reminder state key breaks its own catalog-only rule. Resolved 2026-10-07 (banner slice): "Not this time" is a `dismissed` list inside the Figure reminders value, not a Setting key of its own.
- The 8g routes moved under `/api/figures` so the browser privacy allow-list still holds.
- 8e reminder coverage must filter by kind (8f yearly totals).
- `splitAlreadyKnown` must be generalised by kind before 8f, 8g and 8h reuse it.
- 8f kind names: a "self-employment" prefix is broader than T2125.
- The 8h source kind must be named before any books figure is stored.
- Fingerprint scope for PDFs, statements and books is undecided.
- 8d forgets per batch while 8g forgets per account.
- Four designs edit `file-drop.tsx`: the pipeline is moved out first.
- The UTC date fix appeared twice; it is at `figures-panel.tsx:180`.
- The discard route lacks the page-only guard used by retract and agree.
- The plan text says the Lens reads returns.
- The Xero batch-boundary month is owned by no story.

## 6. Checks run on 2026-10-06 (read-only)

Re-read today:
- CRA T4002 chapters 2 and 3 (lines 8299 and 9946)
- CRA "When to register" (modified 2026-06-16)
- RC4022 thresholds
- CRA self-employment lines page (modified 2026-01-20)
- Sage 50 Canadian 2026 third-party rights
- The us-kb.sage.com ODBC article (Pervasive, US edition)
- FreshBooks report export (CSV, one currency)
- www.ofx.net (redirects to a parking page)
- GitHub advisories for pdfjs-dist
- npm versions of pdfjs-dist, ofx-js and @noble/hashes
- Anthropic's API retention page

Could not be read as text: Xero Central (rendered by script).

Repository facts checked: `FIGURE_KINDS`, `FIGURE_SOURCE_KINDS`, the `Figure` model, `BEGIN IMMEDIATE` in the desktop migrator, the CSP line, the missing `vault-reader.ts`, the retracted-date line, and that no release tag contains #77.

## 7. Not yet verified

- Xero's 500-per-export limit (could not be read today).
- The Sage cloud-sync advice (no URL).
- The 32-bit-only ODBC claim for the Canadian edition (inferred).
- BMO, RBC and CIBC formats.
- The CRA GST/HST currency-conversion rule (not read).
- The T2125 line list across years (script check only).
- The Wealthsimple and TurboTax PDF layouts (undocumented).
- The qbXML licence and the CRA form-copying terms (not read).
