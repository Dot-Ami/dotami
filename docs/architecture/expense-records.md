# Business expense records and receipts — design ([8i])

Status: design, 2026-10-07; **decided the same day (section 0), not built yet.** It exists
because the maintainer said (2026-10-07, on the "keep expense records?" question): if it is a
business expense, keep a record of it, with as much detail as possible, so DotAmi can later help
people see what is, or could be, a business expense. This page is the design and privacy review
that came first. The privacy section to add to
[figures-privacy-review.md](figures-privacy-review.md#privacy-review--proposed-expense-records-and-receipts-8i)
is written there as a PROPOSED draft. The costs are my rough estimates in working days, not
measurements.

## 0. Decided (the maintainer, 2026-10-07)

- **What is kept:** option C of question 1 — single expense records **and** their receipt files.
- **Receipts:** a copy in the DotAmi data folder (option A of section 2), and backups carry them (the
  backup change in section 2).
- **Ways in:** all of them, so each person can use whichever feels most natural — typed, a
  spreadsheet's rows, a bank statement's ticked rows (once the bank and card statements story,
  [8g], is built) and a receipt photo read by the Lens (once the Lens, [9], is built).
- **Smaller choices:** hold the seller's address and the vendor's GST/HST number (both optional,
  typed by the person); the Lens may suggest a category, which waits for the person's click like
  any proposal.
- **Build order** (the recommendation in section 5, accepted): typed records with the agree prompt
  first; then receipts as copies together with the backup change; then the entries in the Delete
  menu; then the other ways in, each after what it needs.

Rule 1 of section 3 ("totals, never single transactions") and rule 5 ("imported files are never
kept") are reworded for expenses in the same change as the first code, as section 3 says. Still open:
section 6.

## 1. What a record would hold, and what it would not

**One expense record, in the person's own database on their computer, holds:**

| Field | Notes |
|---|---|
| Which idea (venture) | same link as a figure has today; deleting the idea deletes its records, asked first |
| Date | a calendar day, never shifted by time zone (settings doc, Part 3) |
| Amount and currency | whole cents, currency as given, never converted (same as figures) |
| Paid to | the person's own words, short, e.g. "Staples" |
| Seller's address, vendor's GST/HST number | **optional, to decide (section 5)**: the CRA lists both for a record (section 4); an address is more sensitive than a name |
| What for | the person's own words, e.g. "printer paper" |
| Category | optional; the person's own pick (see section 4). Kept only when the person picked it, or agreed to one proposed to them (section 5, smaller choices); DotAmi never fills one in on its own |
| Receipt | optional; one file the person adds (section 2) |
| Where it came from | typed by the person · a spreadsheet · a bank statement's ticked rows · the Lens · the file name or source label, as figures already do |
| State | waiting · agreed · taken back · turned down, with the days; "edited by you" |

**It would not hold:** a bank or card number, a login, anything about a person other than the
owner on purpose, a "this is deductible" flag, a deductible amount, a tax-saving estimate, or a
category chosen by DotAmi from the seller's name. It never holds the spreadsheet or statement a
record was read from (those stay read in the window, in memory, as the spreadsheet drop ([8c]) does today).

Two honest limits. "Paid to" can itself be sensitive (a clinic, a lawyer, a union), more so than
an amount. And a receipt file is kept as the person gave it: receipts often print the last four
digits of a card or the buyer's name, and DotAmi cannot scrub a photo, so the person is told that
on screen when they add one.

## 2. Receipts: where they live, backups, and the Delete menu

A receipt is a file (a photo or a PDF). Three ways to keep it:

| | What it is | Backups | Delete | Costs |
|---|---|---|---|---|
| **A. A copy in a folder** | `receipts/` inside the data folder, beside `dotami.db`; DotAmi names each file itself (a random id, never the person's file name); the record stores the id, size, type and a SHA-256 | **Not carried today.** Backup copies only the database (`desktop/backup.mjs`, `VACUUM INTO`) and reads it all into memory | the app removes the file; its bytes may stay readable on the disk until overwritten, which DotAmi cannot prevent | +3 days for the folder, size cap, type check, random names, a sweep for orphans; **+3-4 days** to make backups carry the folder (a new backup format that streams, since today's reads the whole file at once) |
| **B. Inside the database file** | the bytes in a table | carried free; the "wipe free space" step planned for the "What DotAmi knows about you" page and its Delete menu ([8d]) covers it | deleting the row and wiping removes it | +2 days; but the database grows with every receipt, every update's safety copy (`migrate.mjs`) and every backup copies all of it, and a 10 MB cap times a few hundred receipts is gigabytes |
| **C. A pointer only** | DotAmi stores where the file already is, never a copy | nothing to carry; a moved or deleted file is a dead link | removes the pointer only; the person's file stays where it is | +1 day; no backup change, no orphan sweep, and it is the only option that leaves the receipt file outside DotAmi |

What each keeps against the recorded rules (section 3): **A and B** keep a copy of a file the person
gave, which changes rule 5 (imported files are never kept or sent to the server). **C** keeps only
a location, so rule 5 and "no data held by default" stand; the cost is that DotAmi cannot show or
back up the receipt, because the file is outside its reach.

**Backups.** With A or B the backup and the restore must say what they carry. A backup that
carries records but not their receipts would restore to a list of "receipt missing", so if A is
chosen without the backup change, the File → Back up… dialog has to say it in plain words.

**The Delete menu** (planned as part of the "What DotAmi knows about you" page, [8d]: pick the
kinds of data to delete and see what else it affects, [task list](../task-list.md)). Expense records and receipt files would be two separate
choices in it:

- Deleting a record deletes its receipt file (a receipt with no record has no meaning).
- Deleting only receipt files keeps the records, marked "no receipt".
- Deleting an idea removes its records (the database does it) but not files on disk, so the
  app deletes the files itself and the orphan sweep catches a crash in between.
- Figures the person already agreed to stay unless picked, because each was agreed on its own;
  the menu says so, and lists what a card will do when a figure goes.
- It lists what it cannot reach: the old copies in `backups/` (already counted on `/your-data`),
  and the person's own copy of a receipt outside DotAmi.
- The warning cites the CRA's retention rule (section 4: six years from the end of the last tax
  year a record relates to, longer in some cases), so deleting is the person's decision, not
  DotAmi's to nudge.

Uninstalling the desktop app leaves the data folder, so receipts stay too (open question in the
settings doc, Part 4 §6).

## 3. The recorded rules this would change

Stated neutrally; each says where it is written today. Nothing is edited until the maintainer
decides.

1. **"Totals, never single transactions."** Written in [figures-privacy-review.md:11](figures-privacy-review.md),
   [figures-roadmap.md:7](figures-roadmap.md), [use-cases.md:20 and 298](use-cases.md) ("Never kept:
   individual transactions"), the Figure paragraph of [CLAUDE.md](../../CLAUDE.md), the ideas-page
   text "never your individual transactions" (`components/ventures/figures-panel.tsx:98`) and the
   `Figure` entry in `lib/privacy/inventory.ts:220`. Single records are single transactions, so
   with options B or C of section 5 all of these are reworded, in the same change as the code.
2. **"DotAmi holds no data by default; it stores only what the person agrees to."**
   ([use-cases.md](use-cases.md) decisions 2 and 3, [figures-roadmap.md:12](figures-roadmap.md)).
   This can stay true if records follow the figures' pattern: nothing is stored as agreed until
   the person's click in the agree prompt, and the person adds receipts themselves.
3. **Bank and card statements keep only agreed monthly totals, and the bank's description text
   never leaves the page.** The first is written in [figures-roadmap.md:236](figures-roadmap.md)
   (the bank and card statements story, [8g]); the second in code, `lib/figures/bank/types.ts:49-53`
   (the description "can hold names and even digits of other people's accounts, so it never goes
   into a result and never leaves the page"). Records from a statement's ticked rows would keep rows
   and a "paid to" taken from the description, which both say they do not. They stay as they are
   unless the maintainer says otherwise (option "from a bank statement" in section 5).
4. **`/your-data` and the inventory.** `tests/privacy-inventory.spec.ts` fails when a new database
   table is not listed in `lib/privacy/inventory.ts`; the page then shows it, with what removes
   it. **It does not catch a new folder:** the folder check there only confirms that the folders
   already listed are still written by the file named for them. A `receipts/` folder has to be added
   by hand to `FOLDERS` in `lib/privacy/inventory.ts` (widening its `id` list), or the test extended
   to fail on an unlisted folder; that extension is about +0.5 day and belongs to the cost of
   receipts as copies (option A of section 2).
5. **"Imported files are never sent to the server or kept."** Written in
   [figures-privacy-review.md:11](figures-privacy-review.md), [figures-roadmap.md:7](figures-roadmap.md)
   and [use-cases.md:297](use-cases.md) (the "Never kept" column: "the files they import"). Receipts
   as a copy in a folder or in the database (options A and B of section 2) change it: the bytes
   have to reach the local server to be stored. A pointer only (option C) does not.

Unchanged: the rules engine reads agreed figures only; records feed no card; DotAmi files
nothing; the server stores a receipt's bytes (options A and B) but never parses, opens or runs
them.

## 4. How this connects to write-offs

DotAmi's write-off catalog (`lib/engines/writeoffs/v2026/`, seven entries today, each with its
statute or CRA page) is cited law that the maintainers wrote and a human checked. Records are the
person's own statement of what they spent and how they labelled it. The two meet only here:

- The category list on a record is the person's own pick, either the catalog's names ("Home
  office expenses", "Meals and entertainment") or their own words. A category never means
  "DotAmi says this is deductible".
- The screen may show next to a record: "You labelled this *Software subscriptions*; the rule
  and its source are on that card", linking the catalog entry with its caveats. It never totals a
  deduction, never estimates tax saved, and never picks a category from a seller's name
  (`CLAUDE.md`: never derive a fact the person did not state; not tax advice).
- Whether the Lens (the planned built-in agent, [9]) may propose a category is a maintainer
  choice (section 5, smaller choices), because it is the one path where DotAmi would suggest which
  write-off an expense belongs to. If allowed, it arrives as a waiting proposal and only the
  person's click in the agree prompt keeps it.
- The CRA ties records to claims: "You are required by law to keep records of all your
  transactions to be able to support your income and expense claims" ([Business records](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-records.html),
  read 2026-10-07). That is the link between good records and write-offs. **Proposed:** DotAmi says
  what the CRA asks people to keep, and never that a record raises, or makes certain, a deduction
  (not tax advice); this is a design guard for the maintainer to confirm, not a statement of law.

**What the CRA says** (canada.ca pages read 2026-10-07, through a fetch tool that summarises each
page; a person should re-read them before any sentence is copied into a catalog entry, which is
what "last verified" means here):

- Keep receipts or vouchers for purchases; a receipt shows the date, the seller's and the buyer's
  names and addresses, what was bought, and the vendor's business number if they are a GST/HST
  registrant and the price is $100 or more before tax. Without a receipt, the expense journal
  records the seller's name and address, the amount, the date and the details. They are kept in
  case the CRA asks; they are not sent with the return ([Business records](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-records.html),
  page dated 2026-08-31).
- Records are generally kept six years from the end of the last tax year they relate to; for
  "long-term acquisitions and disposal of property, the share registry, or other historical
  information" they are kept indefinitely; under an objection or appeal, until the latest of the
  resolution, the end of further-appeal time or the six years. They are kept at the person's place
  of business or home in Canada ([Where to keep your records](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html),
  dated 2026-08-03).
- A paper receipt may be replaced by an electronic image only if the image meets the CRA's
  conditions (an accurate copy; a Canadian standard for the scanning, CAN/CGSB-72.34); otherwise
  the paper is kept ([Paper and electronic formats](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/acceptable-format-imaging-paper-documents-backing-electronic-files.html),
  dated 2026-08-03). **So DotAmi must never say that adding a photo means the paper can be thrown
  away.** The same page advises duplicate copies of electronic records, which bears on backups.
- Overview: [Keeping records](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records.html),
  dated 2026-06-30.

## 5. Options, with what each costs (for the maintainer to choose)

Costs are rough working days for the build including tests and docs, and include the privacy
inventory and `/your-data` entry.

**Question 1: what is kept**

| Option | Gives the maintainer's goal? | Cost |
|---|---|---|
| **A. Totals per category per month**, like revenue figures | No record of receipts; no rule changes | 3-4 days |
| **B. Single expense records** (section 1) | Yes, without files | 8-10 days, including reusing the agree prompt for records |
| **C. B plus receipt files** | Yes | B plus the receipts row below |

**Question 2: receipts** (with C). Each shows what it keeps, which recorded rule it changes
(section 3) and its cost:

| Option | Keeps | Rule changed | Cost |
|---|---|---|---|
| A copy in a folder | the file's bytes, beside the database | rule 5; the folder is added to the inventory by hand (rule 4) | +3 days; +3-4 more so backups carry it; +0.5 for the inventory check |
| Inside the database | the file's bytes, in the database | rule 5 | +2 days; the database grows with each receipt |
| A pointer only | a location, no bytes | none | +1 day |
| None | nothing | none | 0 |

**Question 3: how a record gets in** (typing is in B; each of these is extra)

| Way in | Cost | Note |
|---|---|---|
| Typed by the person | included | goes through the agree prompt like a typed figure |
| Rows of a spreadsheet the person drops | +3 days | reuses the spreadsheet drop's reader ([8c]), in the window; keeps rows instead of totals, a change to rule 1 above |
| A bank statement's ticked rows | +4 days, after the bank and card statements story ([8g]) is built | keeps rows, and a "paid to" from the bank's description, which rule 3 above says it does not; the description can carry account digits, so a new rule would be needed (proposed in the privacy section: refuse or clean a run of four or more digits; this is new, not part of [8g] today) |
| A receipt photo read by the Lens | not scheduled | needs the Lens ([9]); a hosted model's company would see the photo, the existing "own key" warning |

**Question 4: the Delete menu** is part of the delete slice of the "What DotAmi knows about you"
page ([8d]); records and receipts add about 2 days to it, plus 1 for the orphan sweep.

**Smaller choices:** whether a typed record needs the agree click when the person is typing forty
receipts in a row (today's rule says a typed figure does); an optional "business share" for
mixed-use purchases; the file size cap (10 MB matches today's reading cap); whether a receipt is
shown inside the app or opened in the computer's own viewer; whether to hold the optional seller's
address and vendor GST/HST number (about +0.5 day; an address is more sensitive than a name);
whether the Lens may propose a category for a record (see section 4; it would wait for the person's
click).

**Recommendation:** (mine, not a fact) build in slices: first typed records with the agree
prompt and no files (about 8-10 days), so the privacy changes can be judged on their own; then
receipts as copies in the data folder together with the backup change (about 7 days); then
the Delete menu entries. Leave the bank-statement route until the bank and card statements story
([8g]) exists and the maintainer has ruled on rule 3 above.

## 6. Still open

Decided on 2026-10-07 (section 0): what is kept, where receipts live, whether backups carry them,
the ways in, the seller's address and GST/HST number, and the Lens suggesting a category. Still open:

- Whether a person can keep a record without an idea attached (today figures need one).
- Whether a typed record needs the agree click when someone types many receipts in a row.
- An optional "business share" for mixed-use purchases; the receipt size cap; whether a receipt
  opens inside the app or in the computer's own viewer.
- The bank-statement route's own rules (rule 3 of section 3), when the bank and card statements
  story exists.
- The CRA text above is a summary read today; a human re-read before it enters the catalog.
