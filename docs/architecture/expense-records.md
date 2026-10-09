# Business expense records and receipts — design ([8i])

Status: design, 2026-10-07; **decided the same day and on 2026-10-08 (section 0). The store for typed records is built (the first slice: the table, the checks, the routes and the privacy list), and so is the screen to type them, *Your expenses* (`/expenses`, the second slice, 2026-10-08; [ui-spec](../ui-spec/expenses/_index.md)); receipts are kept too (the third slice, 2026-10-08: a copy of each file in a `receipts/` folder beside the data file, added and removed on the Expenses page, a box on the Delete menu and a sweep for files no record describes; § 7). Backups carry the receipts (2026-10-08, a backup format that streams; old backups still restore; § 7). Receipts open inside DotAmi (2026-10-08; the security design, § 8, written first). The desktop app encrypts the receipt files (decided 2026-10-09; the design, § 9, written first); the other ways in are not built.** It exists
because the maintainer said (2026-10-07, on the "keep expense records?" question): if it is a
business expense, keep a record of it, with as much detail as possible, so DotAmi can later help
people see what is, or could be, a business expense. This page is the design and privacy review
that came first. The privacy review is the last section of
[figures-privacy-review.md](figures-privacy-review.md#privacy-review-expense-records-and-receipts-8i):
typed records are reviewed there as built; receipts stay marked PROPOSED. The costs are my rough estimates in working days, not
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

Rule 1 of section 3 ("totals, never single transactions") was reworded for expenses in the change
that built the store (the first slice, 2026-10-07). Rule 5 ("imported files are never kept") was
reworded in the change that keeps receipts (§ 7): a receipt file the person adds is the one file
DotAmi keeps. Still open: section 6.

### The maintainer's decisions (2026-10-08)

Taken for the typing screen (the second slice), which builds the first four:

1. **Not attached yet.** A record can be saved without an idea attached and attached to an idea later,
   so a record's link to an idea is optional. The database change rebuilds the `Expense` table only
   (SQLite can't make a column optional in place); `Venture` is never copied, dropped or renamed, and a
   test seeds ideas, figures, links, map progress, settings and expense records and checks that every
   one survives the update (`tests/desktop-migrate.spec.ts`). Attaching, moving and detaching answer
   only to DotAmi's own page (`POST /api/expenses/attach`). Deleting an idea keeps its records (the
   next decision, below).
2. **Type many, agree once.** The person types as many records as they like; a review list shows them
   all, ticked, with **Agree to all N**, and lets them untick any first (the unticked ones stay on the
   typed list). Typed records are not sent or kept until that click. Anything an agent or a file
   proposes still waits for the agree click, as before.
3. **Business share.** An optional "business share %" per record: the person's own number, a whole
   percent from 1 to 100, kept as typed beside the full amount. DotAmi shows both and never decides the
   share, never multiplies it out, and never says what is deductible. The limits are typo guards: whole
   numbers only, so it reads back exactly as typed; 0 is refused (a record with no business share is
   left blank, or not kept); over 100 is a typo.
4. **Refunds and credits.** The person chooses how each one is kept: a negative amount on a record (which
   may point to the purchase it came from), or a separate refund record holding the amount that came
   back and linked to the original purchase. Whichever way, the record keeps the refund's date, the link
   to the original (when there is one), the GST/HST part if given, and the credit note's details if
   given. DotAmi never says how a refund is taxed. Sources read on 2026-10-08, cited as sources, not as
   advice:
   - Income Tax Act, s. 12(1)(x) and 12(2.2) (reimbursements and refunds of an outlay or expense, and
     the election to reduce the outlay instead): [section 12](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-12.html).
   - CRA guide T4002, chapter 2 (Income), the note under line 8230 (Other income): a rebate, grant or
     assistance is used to reduce the particular expense (or an asset's capital cost) it applies to, and
     is included in income only when it can't be used that way:
     [T4002, chapter 2](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-4.html).
   - Excise Tax Act, s. 232: the GST/HST adjustment for a refund or credit needs a credit note, and falls
     in the reporting period in which it is received: [section 232](https://laws-lois.justice.gc.ca/eng/acts/E-15/section-232.html).
   - Income Tax Act, s. 230, and CRA IC78-10R5 (paragraph 6): records must let the amounts be
     determined, and the CRA does not specify the books and records (so either way of keeping a refund
     is a record). [Section 230](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-230.html);
     [IC78-10R5](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/ic78-10/books-records-retention-destruction.html).
5. **Receipts (not built in this slice; recorded here for the receipts slice).** A receipt file may be at
   most **10 MB**, the same cap as today's file reading. Receipts open **inside DotAmi** (the maintainer
   chose this over the computer's own viewer). Showing an outside file inside the window needs its own
   security design and tests in the receipts slice (section 6).

### The maintainer's decision (2026-10-08): deleting an idea keeps its expense records

Once a record could exist without an idea, the question in section 6 was whether deleting an idea
should still delete the records attached to it. The maintainer decided to keep them, on condition
that people are told so, and told where the records are kept, so that someone who wants them gone
can delete them. Built in the same change as the typing screen:

- **The database keeps them.** The link from a record to its idea is `ON DELETE SET NULL`
  (`onDelete: SetNull` in `prisma/schema.prisma`, and the typed-expenses migration's own table
  definition, which no released version had yet). Deleting an idea clears each of its records'
  idea, so they wait "not attached yet" with every other field as it was, refund links included;
  they can be attached to another idea from the Expenses page. Figures, links between ideas and
  map progress still go with the idea. Tested by `tests/desktop-migrate.spec.ts` (ideas, figures,
  settings, expense records and refund links survive the update; deleting an idea afterwards
  leaves its records with no idea) and `tests/expenses-store.spec.ts` /
  `tests/expenses-typed.spec.ts`.
- **People are told before they confirm.** The only way to delete an idea today is the Delete menu
  on *What DotAmi knows about you* (there is no delete-one-idea control). Ticking *Your ideas* says,
  under the box and again in the first confirm dialog: how many expense records stay; that they
  stay as "not attached yet"; where they are kept (DotAmi's data file on this computer, counted on
  that page under *Your expense records*, listed on the Expenses page under *Not attached to an idea
  yet* except the ones the person turned down, which are kept and counted but shown on no list);
  and how to delete them (tick *Your expense records* too; no single record can be deleted
  yet). The count includes turned-down records, which is why the warning names them. That number is checked again when the person confirms, like the table counts, so a record
  attached in between stops the delete.
- **The counts are true.** The *Your ideas* box no longer counts expense records as deleted, and the
  *Your expense records* box counts every record, attached or not. A test fails if a box would show
  a whole-table count for a table it only partly empties (`tests/privacy-delete.spec.ts`).
- **Their receipts stay too** (built with receipts, § 7): a receipt belongs to its record, not to the
  idea, so deleting an idea leaves both the receipt's row and its file.
- **Not built:** deleting a single expense record. *Take back* and *Turn down* keep the row; only the
  Delete menu's *Your expense records* box removes records, all at once.

## 1. What a record would hold, and what it would not

**One expense record, in the person's own database on their computer, holds:**

| Field | Notes |
|---|---|
| Which idea (venture) | optional since 2026-10-08: a record can be "not attached yet" and attached later; deleting an idea keeps its records, "not attached yet" (the maintainer's decision of 2026-10-08, section 0) |
| Date | a calendar day, never shifted by time zone (settings doc, Part 3) |
| Amount and currency | whole cents, currency as given, never converted (same as figures) |
| Paid to | the person's own words, short, e.g. "Staples" |
| Seller's address, vendor's GST/HST number | optional, typed by the person (decided, section 0): the CRA lists both for a record (section 4); an address is more sensitive than a name |
| What for | the person's own words, e.g. "printer paper" |
| Category | optional; the person's own pick (see section 4). Kept only when the person picked it, or agreed to one proposed to them (section 5, smaller choices); DotAmi never fills one in on its own |
| Business share | optional; the person's own whole percent, 1 to 100, kept beside the full amount (decided 2026-10-08); DotAmi never sets it or multiplies it out |
| GST/HST part | optional; the GST/HST included in the amount, as the person gives it, whole cents, never more than the amount |
| Refund or credit | the person's choice (decided 2026-10-08): a negative amount on a record, or a separate refund record; the purchase it came from (optional for a negative amount, needed for a refund record) and the credit note's details, when given |
| Receipt | optional; one file the person adds (section 2) |
| Where it came from | typed by the person · a spreadsheet · a bank statement's ticked rows · the Lens · the file name or source label, as figures already do |
| State | waiting · agreed · taken back · turned down, with the days; "edited by you" |

**It would not hold:** a bank or card number, a login, anything about a person other than the
owner on purpose, a "this is deductible" flag, a deductible amount, a tax-saving estimate, or a
category chosen by DotAmi from the seller's name. It never holds the spreadsheet or statement a
record was read from (those stay read in the window, in memory, as the spreadsheet drop ([8c]) does today).

**How a record is checked** (`lib/expenses/validate.ts`; the limits are typo guards, not
tax rules): the date is a real calendar day, not after the person's own day on the computer and not
before 1970-01-01; the amount is whole cents, never zero and at most ten billion dollars either way; it
is below zero only on a refund or credit kept as a negative amount, and a refund record holds the amount
that came back, above zero, with the purchase it came from; that purchase must be one of the person's
records, not turned down, kept as a purchase (never another refund); only a refund or credit may carry a
credit note (up to 200 characters) or point to a purchase; the GST/HST part is whole cents, zero or more,
at most the amount; the business share is a whole percent from 1 to 100; the currency is three capital
letters, as given; "paid to" is 1 to 120 characters and "what for" 1 to 200; the category, when given,
is up to 80, the address up to 300; none holds control characters. Not checked: that a refund is dated
after its purchase, or in the same currency (the person's own record says what happened). The GST/HST number is checked for shape only (nine digits,
optionally RT and four more; the CRA's wording and the date it was read are in the privacy review).
The ways in the store accepts are typed, a file and an agent; "bank" is appended with the bank and card
statements story ([8g]).

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
- Deleting an idea keeps its records, "not attached yet" (section 0, 2026-10-08), so their receipt
  files stay with them.
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

Stated neutrally; each says where it is written today. Rule 1 was reworded with the store (the
first slice); the others are reworded when what changes them is built.

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

**Smaller choices** (the first four were decided on 2026-10-08, section 0): whether a typed record needs the agree click when the person is typing forty
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
the ways in, the seller's address and GST/HST number, and the Lens suggesting a category. Decided on
2026-10-08 (section 0): a record without an idea, type many and agree once, the business share, refunds
and credits kept either way, the receipt size cap (10 MB), receipts opening inside DotAmi, and that
deleting an idea keeps its records "not attached yet", with people told so first. Decided on
2026-10-09: the desktop app encrypts the receipt files (§ 9; its own open questions are there). Still open:

- The bank-statement route's own rules (rule 3 of section 3), when the bank and card statements
  story exists.
- The CRA text above is a summary read today; a human re-read before it enters the catalog.

## 7. Receipts as built: the store, the Delete menu and the sweep (2026-10-08)

The third slice: option A of section 2, as the maintainer decided, and backups that carry the
receipts (the backup change of section 2). Showing a receipt inside DotAmi is § 8.

**Where a receipt lives.** A copy of the file in a `receipts/` folder beside the data file
(`<data folder>/receipts/` in the desktop app; `prisma/receipts/` beside a copy run from source,
ignored by git). Since 2026-10-09 the desktop app encrypts each file (§ 9); a copy run from source
keeps them plain. The folder is listed by hand in `FOLDERS` in `lib/privacy/inventory.ts` (rule 4 of
section 3: no test finds a new folder on its own), so *What DotAmi knows about you* shows its path,
its file count and its size. A `Receipt` table describes each file: which record it belongs to, the
type DotAmi read from its bytes, its size and its SHA-256, and the day it was added. One receipt per
record (a unique index). The table is new; its migration is one `CREATE TABLE` and its index, and
touches no other table (`tests/desktop-migrate.spec.ts` checks every statement and that seeded ideas,
figures, links, map progress, settings and expense records survive it).

**What DotAmi checks when a receipt is added** (`lib/expenses/receipts/`):

1. **The type comes from the bytes, never the name or what the browser says.** `sniff.ts` reads the
   first bytes: JPEG (`FF D8 FF`), PNG (its 8-byte signature), WebP (`RIFF....WEBP`) or PDF (`%PDF-`),
   each only at the very first byte. Anything else is refused, with a sentence that names what it
   most likely is: SVG and web pages (they can carry a script), GIF, HEIC (no safe decoder in the
   window yet), BMP, TIFF, AVIF, text, archives, programs. A file that is two things at once (a JPEG
   whose later bytes are a web page) is taken as what its first bytes say.
2. **At most 10 MB** (the maintainer's cap), checked from the size before the window reads the file
   and again on the server, whose body limit is the base64 of 10 MB.
3. **A picture's size is read from its header and checked before anything decodes it:** at most
   50 megapixels and 20,000 pixels on a side, so a few hundred bytes that claim a 30,000 × 30,000
   picture (a "decompression bomb") are refused unopened. A picture whose header has no readable
   size is refused as damaged.
4. **DotAmi names the file itself:** 32 random hex characters and the extension of the type it read
   (`3f9c….png`). The person's file name is never sent to the server and never kept; nothing a caller
   sends becomes part of a path.
5. **The server stores the bytes and never opens them:** it reads a few header bytes to learn the
   type and size, hashes the file, and writes it. It never decodes, renders, parses or runs it.
6. **Only an agreed record takes a receipt**, and only DotAmi's own page can add or remove one
   (`POST /api/expenses/receipt`, `POST /api/expenses/receipt/remove`, both `Sec-Fetch-Site:
   same-origin` only, like agree and attach). An agent can propose records but never add, remove or
   read a receipt, and nothing sends a receipt off the computer.
7. **Nothing about a receipt goes in an address or the log.** A failing route logs the error's name
   and code only.

**Order of writes.** The bytes go to `<name>.partial` (opened with "never overwrite"), then the
`Receipt` row is written, then the file is renamed to its final name. If the app stops before the
row, the `.partial` file has no row and the sweep removes it once it is ten minutes old. If it stops
after the row and before the rename, the `.partial` file is the only copy of a receipt the record
says it has: the sweep does not remove it, it finishes the rename once the file is ten minutes old,
after checking its size and SHA-256 against the row. If those don't match (the write itself was cut
short), the sweep removes the row and the file, so the record shows no receipt rather than one
DotAmi can't show.

**Removing.** *Remove receipt* on a record (agreed or taken back) asks once, then deletes the row,
then the file; the record stays. The Delete menu gets a box, *Your receipts*: every receipt row and
file goes, the records stay. *Your expense records* takes the receipts with the records (the row by
`ON DELETE CASCADE`, the file by the sweep). Deleting ideas keeps the records and so their receipts.
The Delete menu's *What Delete doesn't reach* now says a removed file's bytes can stay on the disk
until overwritten.

**The sweep.** `sweepOrphanReceipts` removes every file in the folder that DotAmi named and no
row describes: a deleted record's file, a file that couldn't be removed at once (another program had
it open), a write abandoned for more than ten minutes that no row describes (one a row describes is
finished instead, as above). A file not named the way DotAmi names files is
never touched, so something the person put in the folder stays. It runs before every receipt is added
and after every delete that removed receipts; the Delete menu says how many files went, and how many
couldn't go yet.

**Backups carry the receipts** (the backup change of section 2; the format is in
[desktop-app.md § Backup and restore](desktop-app.md#backup-and-restore-7c-desktopbackupmjs)). A backup
now holds the data file and every receipt file it describes, in a format that streams: each file is
read, hashed, encrypted and written in 1 MB pieces, so a few hundred receipts need no more memory than
one. A locked backup's passphrase covers the receipts too. *File → Back up…* says how many receipt
files went in, and names any DotAmi has a record of but couldn't find. A restore unpacks the receipts,
checked, beside the staged data file; on confirm the receipts folder here moves whole into `backups/`
(`receipts-before-restore-<time>`, beside the safety copy that describes it) and the backup's own
receipts take its place; if the swap fails both go back. **Old backups (format 1) still restore**;
they hold no receipts, so the receipts folder here is moved aside the same way and the question before
the restore says the restored records have no receipt files.

**Tested by** `tests/expenses-receipts.spec.ts` (the sniffing, hostile files, the pixel and size
limits, random names, the hash, only agreed records, one per record, removing, the sweep, the routes
answering only DotAmi's page, nothing in the log), `tests/privacy-delete.spec.ts` (both Delete menu
boxes, rows and files), `tests/desktop-backup.spec.ts` (receipts round-trip plain and locked, a changed
tag, file list or receipt refused, hostile file lists, the folders put back when the swap fails, real
format-1 backups restored), `e2e-desktop/desktop.spec.ts` (a receipt carried from one computer to
another through File → Back up… and Restore), `tests/desktop-migrate.spec.ts` and `e2e/expenses.spec.ts` (adding a receipt in
a real browser: an SVG named `.png` refused in the window with nothing sent, a PNG kept under a name
DotAmi made up and never the file's own, then removed).

## 8. Showing a receipt inside DotAmi: the security design (2026-10-08)

Written before any viewer code, as the maintainer asked when choosing (2026-10-08) to open receipts
inside DotAmi rather than in the computer's own viewer. A receipt is an outside file, and it may have
been made to attack whatever opens it. This section is what the viewer must do, and the tests that
hold it to that. Status: **designed first, then built in the same change** (the section was
committed on its own before any viewer code; "Built by" below names the files).

**What could go wrong**, and what each rule below answers:

| Threat | Example | Rules |
|---|---|---|
| Script in the file runs in DotAmi's page | an SVG or web page with `<script>`; a PDF's own JavaScript | 1, 3, 4, 5 |
| The file reaches the network | a PDF link, form submit, remote font or image; a picture's address | 2, 4, 7 |
| The file moves the window | Chromium's built-in PDF viewer, a `file:` address, a link in the PDF | 5 |
| A crafted picture or PDF exhausts memory | a few hundred bytes claiming 30,000 × 30,000 pixels; a PDF with a huge page or image | 3, 4, 6 |
| The file is two things at once (a polyglot) | a PNG whose tail is a web page; a PDF that is also HTML | 1, 3, 4 |
| The file on the disk is not the one that was added | another program replaced or edited it; a row and a file that disagree | 1, 2 |

**The rules.**

1. **The bytes decide the type, every time.** When a receipt is added, DotAmi reads its first bytes
   (§ 7): JPEG, PNG, WebP or PDF, nothing else; the name and the browser's type are ignored. When it
   is shown, the window reads the bytes it was sent again with the same check and compares the answer
   with the type the row stored; any disagreement (or a refusal) and nothing is drawn. SVG, HTML, XML,
   GIF and the rest are refused at both points. **HEIC stays refused** until there is a decoder that
   runs the same way (no script, no network, in a worker or the browser's own decoder): Chromium can't
   decode HEIC itself, and a WebAssembly decoder would be a new package to review first.
2. **How the bytes reach the page.** `POST /api/expenses/receipt/file { expenseId }`, answering only
   DotAmi's own page (`Sec-Fetch-Site: same-origin`), like adding and removing. Being a POST that
   reads a JSON body, it can't be an address that a link, an `<img>`, a frame or the window itself can
   load, and no other site or program can read it through the browser. The server builds the file's
   path from the row (never from the request), reads at most 10 MB, and checks the size and the
   SHA-256 against the row before answering: a file changed or replaced on the disk is refused with a
   plain sentence, and a missing one is named as missing. The answer is `application/octet-stream`
   with `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment`, `Cache-Control: no-store`
   and a Content-Security-Policy of its own (`default-src 'none'; frame-ancestors 'none'; sandbox`),
   so even if it were ever loaded as a page, nothing in it could run. Next applies the headers in
   `next.config.mjs` over a route's own, so that file sets this policy for this one path too
   (`receiptFilePolicy`; otherwise the general `frame-ancestors 'none'` would replace it).
3. **Pictures** are shown by the browser's own image decoder and nothing else: the bytes become a
   `Blob` with the type DotAmi read (never one taken from the file), a `blob:` address of that blob is
   the `src` of an `<img>`, and the address is revoked when the viewer closes. An `<img>` never runs a
   script, whatever the bytes hold. The page's Content-Security-Policy already allows pictures only
   from DotAmi itself, `data:` and `blob:` (`img-src 'self' blob: data:` in `middleware.ts`); nothing
   is widened for this. Before the picture is decoded, its width and height are read from its header
   (the same code as at adding) and checked again: at most 50 megapixels and 20,000 pixels a side.
4. **PDFs** are drawn by pdf.js onto a canvas, in a worker of DotAmi's own, with the return reader's
   setup ([8f], `lib/figures/return/`): pdf.js's parser and renderer both run in that one worker (no
   second worker, no script loaded by address), which is served from DotAmi's own files under a policy
   that refuses every connection, DotAmi's server included (`workerPolicy` in `next.config.mjs`), and
   with the same options (`PDF_OPTIONS`: no `eval`, no XFA, no font loaded into the page, no data
   files fetched, no WebAssembly). pdf.js runs a PDF's JavaScript only through its separate scripting
   sandbox, which DotAmi never loads; it builds no annotation layer (so no link or form field in the
   PDF can be clicked or submitted) and no text layer. Each page is drawn on an `OffscreenCanvas` in
   the worker and handed to the page as a finished picture (`ImageBitmap`), shown in a `<canvas>`.
   Limits: at most 20 pages drawn (the viewer says how many more there are), a page drawn at most
   16 megapixels (the scale is lowered to fit), all drawn pages together at most 80 megapixels (about
   320 MB; twenty Letter or A4 pages fit, pages at the per-page cap stop after five, and the viewer
   says how many it shows), pictures inside the PDF at most 50 megapixels (pdf.js's `maxImageSize`),
   and the worker is stopped if a file takes longer than 20 seconds. Closing the viewer ends its
   worker, and a viewer closed while the bytes are still arriving starts none.
5. **Never Chromium's PDF viewer, never a navigation.** No `<iframe>`, `<embed>` or `<object>` is
   ever given a receipt; the page's policy already has `object-src 'none'`, and gains `frame-src 'none'`
   (DotAmi has no frames), so not even a mistake could put one in a frame. The desktop app leaves
   Electron's plugins off (the PDF viewer is one), its window already refuses to navigate anywhere but
   DotAmi's own pages, and DotAmi never opens a receipt with `shell.openPath` or a `file:` address.
6. **Size limits** are those above: 10 MB a file (checked by the server before it reads further), the
   picture limits read from the header before decoding, and the PDF page, canvas, image and time limits.
7. **Nothing leaves the computer.** The viewer makes one request, to DotAmi's own server; the PDF
   worker can't connect anywhere; a picture is never given an address outside the page. Agents can't
   read a receipt: the route answers only DotAmi's page.

**Tests with hostile files** (each must fail when its rule is removed):

- A PDF with JavaScript (an `OpenAction` that would show an alert and one that would open an
  address): drawn, with no dialog, no request beyond the receipt's own, and the window not moved.
- Polyglots: a valid PNG with a web page and a script after its end, and a PDF with a web page
  appended: each shown by its own type's reader, no script runs.
- A picture whose header claims 30,000 × 30,000 pixels, put in the receipts folder with a matching row
  (as a file from elsewhere could be): refused in the window before it is decoded, nothing drawn.
- A row and a file that disagree: an SVG under a `.png` row, and a PDF under a picture row: refused in
  the window, nothing drawn.
- A file changed on the disk after it was added: refused by the server.
- A PDF of 20 pages, each drawn at the per-page cap (100 × 625 points, 1600 × 10,000 pixels): five
  pages drawn, and the viewer says so.
- The route itself: only DotAmi's page gets the bytes; the answer's headers are the ones above, read
  from the built server (not only from the route's code); the path comes from the row.

**Built by** (2026-10-08, in the same change, after this section): rule 1, `lib/expenses/receipts/sniff.ts`
and `checkShownBytes` in `lib/expenses/receipts/viewer/open.ts`; rule 2, `app/api/expenses/receipt/file/route.ts`,
`readReceiptFile` in `lib/expenses/receipts/store.ts`, `lib/expenses/receipts/file-headers.ts` and
`receiptFilePolicy` in `next.config.mjs`; rule 3,
`lib/expenses/receipts/viewer/open.ts` and `components/expenses/receipt-viewer.tsx`; rule 4,
`lib/expenses/receipts/viewer/draw-pdf.ts` and `pdf-pages.worker.ts` beside it; rule 5, `frame-src 'none'`
in `middleware.ts`. Tested by `tests/expenses-receipt-viewer.spec.ts`, `tests/security-hardening.spec.ts`,
`e2e/receipt-viewer.spec.ts` (every hostile file above, in a real browser on the production build) and
`e2e-desktop/desktop.spec.ts` (a PDF receipt drawn in the app's own window, its worker unable to reach
DotAmi's server).

**Known limits.** The server's size check before reading is a cheap first look; the SHA-256 check after
it catches the same files, so no test tells the two apart. The drawn pages have a total cap, but pdf.js
itself has no overall memory cap while it reads a file: a crafted PDF can still unpack a stream far
larger than the file and crash the worker (or the window) before the 20-second limit; nothing is lost, nothing was being saved (the same limit as the return reader,
`docs/connectors/pdf-reader-review.md`). A drawn page is a picture: its text can't be selected or
searched, and there is no zoom beyond the window's own.

## 9. Encrypting the receipts: the design (2026-10-09)

The maintainer said yes (2026-10-09) to the question the privacy review had left open since receipts
were kept: should DotAmi encrypt the `receipts/` folder itself, rather than rely only on the
computer's disk encryption. This section was written and committed before any code, like § 8. Status:
**designed first, then built in the same change** ("Built by" at the end names the files).

### What it protects, and what it doesn't

Encryption at rest means the receipt files on the disk are unreadable without one key, and the key is
kept so that only the person's own account on this computer can open it. So it protects the files
against:

- **Another account on the same computer** (a family member's, a guest's) that can read the data
  folder: it finds files it can't read.
- **A copied or synced data folder**: a copy of `%APPDATA%\DotAmi` on a USB stick, in a folder a cloud
  service syncs, or inside another computer's backup. The receipt files and the key file travel, but
  the key can't be opened on another computer or another account. (One exception, said plainly:
  Windows accounts set up to roam between computers, as some workplaces do, can share this protection.)
- **A stolen disk or computer without disk encryption**: the receipts are unreadable from the disk on
  its own. This is only as strong as the Windows account's password: Windows protects the key with it,
  so an account with no password, or a guessable one, gives little protection here. Disk encryption is
  still the stronger answer for a stolen computer, and the settings page keeps saying how to turn it on.

It does **not** protect against:

- **Anything running as the person while DotAmi can open the files.** A program the person runs (a
  piece of malware, a script, an agent given their files) can ask Windows to open the key exactly as
  DotAmi does, or ask DotAmi's own server. That is the same trust the rest of DotAmi works with (the
  privacy review's "another program on this computer" row): stated, not defended.
- **The database.** `dotami.db` is **not encrypted**, today or by this change. It holds every expense
  record in full (the day, the amount, who was paid and what for, the seller's address and GST/HST
  number when given), every figure, the person's own statements, and for each receipt its kind, size,
  fingerprint and the day it was added. A copied data folder still gives all of that away. Encrypting
  the database is a separate option for the maintainer, with its cost below.
- **What was on the disk before.** A receipt's bytes written before this version (the plain copy that
  encrypting replaces, a receipt removed earlier) can stay in the disk's free space until overwritten,
  as any deleted file can; disk encryption covers that. While a receipt is shown, its bytes are in the
  memory of DotAmi's server and window, and the operating system can write memory to its page file,
  which disk encryption also covers.
- **A backup with no passphrase.** Its receipts are written decrypted (so that it restores on another
  computer, below), and anyone with the file can read them. DotAmi says so when it makes one.

**The separate option: encrypting the database.** Not built, not proposed for this change. What it
would take, as my rough estimate in working days (not a measurement): the database library DotAmi
uses (Prisma, with its own SQLite engine) can't open an encrypted SQLite file, so the app would move
to Prisma's "driver adapter" with an SQLite build that encrypts (a new native package, reviewed under
the outside-package rule and rebuilt for Electron); the desktop migrator, backups, restore and the
safety copies all open the file with Node's own SQLite, which can't read an encrypted file either, so
each would change; a copy run from source would need a key too. About 8 to 12 days with the tests, plus
the package review. A cheaper half-step on Windows Pro only is the operating system's own file
encryption (EFS) on the data folder, which Windows Home doesn't have. The maintainer decides whether
either is worth it.

### The key

- **One random key for the receipts of a data folder**: 32 bytes from Node's `crypto.randomBytes`,
  made by the desktop app the first time it starts with this version.
- **Kept only wrapped by the operating system's per-user protection.** The file `receipts.key` beside
  the data file holds the key encrypted by Electron's `safeStorage`. On Windows that is DPAPI, Windows'
  protection for one account's secrets: Electron keeps its own key, itself protected by DPAPI, in the
  `Local State` file of the same data folder, and encrypts with it. On a Mac it is the Keychain (there
  is no Mac build yet). `receipts.key` also holds the key's id (below), which isn't secret.
- **Never anywhere else in the clear**: not in the database, not in a backup (a backup holds the data
  file and the receipts only, never `receipts.key`), not in the log, never sent anywhere. While the app
  runs, the key is in the memory of its main process and its server process: the main process opens
  the key at start and hands it to the server it starts in the server's environment, and the server
  takes it out of its environment the first time it reads it.
- **The key's id**: the first 8 bytes of a SHA-256 of the key, written in each encrypted file's header.
  It isn't secret (it can't be turned back into the key). It lets DotAmi tell "encrypted with another
  key" (the key was lost or replaced) from "damaged or changed", and count the receipts a lost key
  locks.
- **On Linux** Electron can fall back to a fixed, built-in password when no keyring is running
  (`basic_text`); DotAmi treats that as no key store (below). There is no Linux build yet.
- **Never saved before Windows' own key is on the disk** (found while building, measured 2026-10-09 on
  Electron 44 and Windows 11): Electron makes its own key when the app starts but writes it to
  `Local State` only about ten seconds later (9.98 s in a fresh folder, whether or not `safeStorage`
  was called). A receipts key wrapped in those seconds could not be opened after a crash, and nor could
  a receipt encrypted with it. So `receipts.key` is written, and the key used, only once `Local State`
  holds Electron's key. Every data folder an earlier DotAmi ran in for ten seconds has it already;
  the very first start of a new data folder waits about ten seconds before its window opens. If it
  never comes (30 seconds), no key is saved and receipts stay as they are for that start. One narrow
  case remains: after a Windows profile reset, `Local State` still holds the old, unopenable key until
  Chromium rewrites it, so a crash in the first ten seconds of that start could still lose a receipt
  added in those seconds.

### A copy run from source has no key store

A copy started with `npm run dev` or `npm start` is a plain Node server with no Electron, so it has no
operating-system key store. DotAmi does **not** invent a key file of its own there (a key beside the
files it locks protects nothing). So:

- **Receipts stay unencrypted in a copy run from source**, as before this change, and that is said, not
  hidden: Settings → Data and backups and *What DotAmi knows about you* (under the receipts folder) both
  say "Receipts in this copy aren't encrypted", why, and that the desktop app encrypts them.
- **The same if the desktop app finds no key store** (`safeStorage` not available, or Linux's
  `basic_text`), with that reason instead.
- **A receipt the desktop app encrypted, opened by a copy that can't open it** (a copy from source
  pointed at the desktop app's data folder): refused with a plain sentence saying which copy can open
  it. It is never shown garbled and never encrypted a second time.

### Losing the key

If the Windows profile is reset, an administrator resets the account's password (Windows then can't
open what DPAPI protected), the data folder is moved to another account or computer, or `receipts.key`
or Electron's `Local State` file is deleted, the key can't be opened, and **the receipts encrypted with
it are lost, except those in a backup**: a backup holds them decrypted, so restoring it brings them back
under the new key. This is said where the person will see it: on Settings → Data and backups, on *What
DotAmi knows about you* under the receipts folder, in the note before adding a receipt, and in the
message after File → Back up….

When the app starts and can't open the key:

- **It changes nothing on the disk**: `receipts.key` and every receipt stay as they are, because the key
  may come back (a Mac Keychain prompt answered "Deny", a profile that loads later).
- **If no receipt is locked with that key** (the folder is empty, or holds only plain files), nothing
  can be lost: the unreadable key file is moved to `backups/receipts-key-unreadable-<time>.key` and a
  new key is made.
- **Otherwise** receipts can't be added or shown while the key can't be opened, and Settings, *What
  DotAmi knows about you* and the Expenses page say so, with the two ways forward that need no new
  decision: **restore a backup** (File → Restore from a backup… brings the receipts back under a new
  key; the unreadable key file moves into `backups/` beside the receipts folder it locks), or **delete
  the receipts** (the Delete menu's *Your receipts*), after which the next start makes a new key.
  A button to start a new key while keeping the unreadable receipts is a question for the maintainer
  (below), not built.

### The encrypted file

AES-256-GCM, one file per receipt, with Node's own `crypto` (no new package). Each file:

| Bytes | What |
|---|---|
| 14 | the text `DOTAMI-RECEIPT` |
| 1 | the format, 1 |
| 8 | the key's id |
| 12 | a random nonce, new for every file and every time it is written |
| the receipt's size | the ciphertext |
| 16 | GCM's tag |

- **Associated data**: the 35 header bytes above, then the receipt's id (the 32 hex characters that name
  the file). So a file renamed to another receipt's name, a changed byte, a changed key id or format
  all fail to open, as tampering. The `Receipt` row still holds the receipt's own size and SHA-256, of
  the decrypted bytes, and they are checked after decrypting, as before.
- **Independent of the file's type**: a file keeps its name `<id>.<extension>`, and nothing in the
  encryption looks at the type, so a type added later (HEIC is being added separately) needs nothing
  here. None of the accepted types' own first bytes is `DOTAMI-RECEIPT`, so a file that doesn't start
  with it is a plain receipt.
- **Adding** (`addReceipt`): when the key is open, the server encrypts the bytes in memory, and the
  encrypted file goes through the same order of writes as § 7 (`.partial`, then the row, then the
  rename). The sweep's check of a half-finished add decrypts first, then compares size and SHA-256; a
  `.partial` it can't open with the key it has is left alone, never removed.
- **Showing** (`readReceiptFile`): the server decrypts in memory, checks the size and SHA-256, and
  answers the window exactly as before (§ 8); nothing decrypted is written to the disk. A plain receipt
  (from before this version, or from a copy run from source) still opens, with the same checks.

### Existing receipts are encrypted once, at the first start

The desktop app, at each start, after the database is up to date and before its server starts,
encrypts every plain receipt file DotAmi named in `receipts/` and in the receipts folders earlier
restores moved into `backups/` (`receipts-before-restore-<time>`). For each file: the encrypted bytes
are written to `<name>.encrypting` (never overwriting anything) and flushed to the disk, then that file
is renamed over the plain one, which the file system does in one step. **A crash never loses a
receipt**: before the rename the plain file is whole and the leftover `.encrypting` file is removed at
the next start, which tries again; after it, the encrypted file is whole. A file that can't be done now
(another program has it open) stays plain, still opens, and is tried at the next start. The log gets
counts only, never a name. After the first start of this version there is normally nothing left to do.

### Backups (format 2, unchanged)

- **A backup restores on another computer**, whose key differs: File → Back up… decrypts each receipt
  in memory and writes the receipt's own bytes, the same size and SHA-256 the backup's file list gives.
  The backup format stays 2: a backup made before this change and one made after look the same.
- **A locked backup stays locked by its passphrase**: the passphrase's AES-256-GCM covers the receipts
  as before.
- **An unlocked backup says plainly that its receipts aren't encrypted**: the passphrase window and the
  message after backing up both say it.
- **Restoring** encrypts each receipt with this computer's key as it is unpacked, after its size and
  SHA-256 are checked, so the receipts are never written to this computer's disk unencrypted when the
  key is open. Format 1 backups hold no receipts and restore as before; format 2 backups, made before
  or after this change, restore the same way. In the desktop app with no key store, restored receipts
  are written plain, as everything else there.
- **A receipt locked with a lost key can't go into a backup**: it is counted and named in the message
  afterwards, like one that's missing.

### Tests (each must fail when its rule is removed)

- The file format: a round trip; a changed byte anywhere (header, ciphertext, tag), a file cut short,
  the wrong key, a renamed file (another receipt's id) and a changed key id all refused, each with its
  own answer (`tests/receipt-crypto.spec.ts`).
- The first-start encryption: every plain receipt encrypted, an encrypted one left alone, a file
  DotAmi didn't name never touched, the receipts folders in `backups/` too; a crash between any two
  steps (a real process ended part-way) leaves every receipt readable, and the next start finishes.
- The key: made and wrapped once, never stored unwrapped, opened again at the next start; an
  unreadable key with no locked receipts set aside and replaced; with locked receipts, nothing touched;
  no key store (and Linux's `basic_text`) meaning "not encrypted"; never saved before `Local State`
  holds Electron's key (`tests/receipt-key.spec.ts`, with a stand-in for `safeStorage`; and in the real
  app, where `Local State` must hold the key whenever `receipts.key` exists).
- The store: added receipts are encrypted on the disk and shown as the bytes that were added; a
  tampered or swapped file refused; a file from another key refused with its own sentence; from source,
  plain as before, and an encrypted file refused with its sentence; a half-finished encrypted add
  finished by the sweep (`tests/expenses-receipts.spec.ts`).
- Backups: a backup from computer A restores on computer B with B's key, the receipt bytes the same;
  locked and unlocked; format 1 and format 2 fixtures still restore; no unencrypted receipt file in
  the staging folder (`tests/desktop-backup.spec.ts`).
- The real app (`e2e-desktop/desktop.spec.ts`): a receipt added in the app is encrypted on the disk,
  `receipts.key` holds no copy of the key, and the record's receipt opens; back up on one computer,
  restore on another, and it opens there.

### Built by (2026-10-09, in the same change, after this section)

The file format and the first-start pass, `desktop/receipt-crypto.mjs` (one file, imported by both the
desktop app and the server, so the format exists once); the key, `desktop/receipt-key.mjs`; the start,
the backup and the restore, `desktop/main.mjs` and `desktop/backup.mjs`; the server's side,
`lib/expenses/receipts/lock.ts` (the key from the desktop app, taken out of the server's environment on
first read) and `lib/expenses/receipts/store.ts` (encrypting at adding, decrypting to show, the sweep's
check, `describeReceiptFiles`); the sentences, `lib/expenses/receipts/protection.ts`, shown by
`components/settings/settings-page.tsx`, `components/your-data/your-data-page.tsx` and
`components/expenses/receipt-protection.tsx`. Backups made before this change by the earlier writer are
kept as `tests/fixtures/backups/format-2-{plain,locked}.dotami-backup` and restored by the tests.

**Checked that the tests bite** (each rule broken on purpose, then put back): the file's id left out of
the associated data fails the renamed-file test (and, in the store, the swapped-file test); the plain
file removed before the encrypted one is in place fails the three crash tests ended after
"temp-written"; leftovers not removed fail the leftover test and those three; the key written unwrapped
fails the "kept only wrapped" tests; a key replaced although receipts are locked by it fails the
"nothing changes" tests; Linux's `basic_text` accepted fails its test; a receipt written plain with the
key open fails five store tests; a receipt from another key dropped by the sweep fails its test; a
backup that copies the encrypted bytes, or a restore that stages receipts plain, fails the backup tests;
the wait for `Local State` ignored fails its unit test, and removed from the app fails the desktop test
(the key file was there while `Local State` wasn't).

### Still open (for the maintainer)

- Whether to encrypt the database too (the option above, with its cost).
- Whether to offer a button that starts a new key while receipts are locked with one that can't be
  opened (giving up those receipts for good unless the old key comes back), or keep the two ways
  forward above.
