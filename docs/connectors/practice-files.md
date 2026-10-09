# Practice files — shaped from help pages, not real exports

Status: 2026-10-09 (the request for real column names is posted, [below](#asking-for-real-column-names)). All six packages in [the connectors research](README.md) have practice files:
Xero and QuickBooks Online (2026-10-06), then Wave, FreshBooks, Sage Accounting, Sage 50 Canadian
and Xero's Receivable Invoice Detail (2026-10-08). The 2026-10-08 files found new gaps, pinned as
"fails today" tests [below](#open-found-2026-10-08); they are fixed in follow-on slices.

## What these are

Invented spreadsheets, one per layout, that let DotAmi's "Add from a file" steps be tried ahead of
time: guess the columns, work out how dates and amounts are written, add up each month, and list
every row the totals leave out. Those steps live in
[`lib/figures/file/preview.ts`](../../lib/figures/file/preview.ts), which the screen and the tests both
call, so a test runs what the screen runs. They live in code, not as files:
[`tests/fixtures/packages/`](../../tests/fixtures/packages/), run by
[`tests/figures-file-packages.spec.ts`](../../tests/figures-file-packages.spec.ts).

## What they are not

**They are not real exports.** No real export, person, client or figure was used. The company is
"Invented Shop Ltd.", the clients are "Invented Client A/B/C", and the amounts are made up. The
only things taken from a vendor are layout facts and column names from its own help pages, and
each one lists the page and the day it was read.

A test passing here means _DotAmi reads a file shaped like this_. It does not mean a real export
from that program works, because:

- Most vendors' help pages describe a report without listing its column titles. Each guessed title
  is marked **assumed** in its fixture, with the page it was guessed from. A real export may use
  other words, in another order. Of the 2026-10-08 files, only Wave's Income by Customer (all three
  titles), Sage Accounting's "Invoice Number" and three of Xero's Receivable Invoice Detail titles
  are documented; every other title is assumed.
- Vendors change these pages. The Xero and QuickBooks pages were read by the design pass on
  2026-10-06; Xero's help pages are drawn by script and could not be read again while building, and
  Intuit's developer page describes the report as data, not as an Excel file. The Wave, FreshBooks,
  Sage Accounting and Sage 50 pages were read on 2026-10-08.
- The one way to close that gap is a header row copied from a real export (column names only,
  never a figure). The request for that was posted on 2026-10-09 as
  [issue #124](https://github.com/Dot-Ami/dotami/issues/124); its text is kept
  [below](#asking-for-real-column-names).

The screen says so to everyone who drops a file: "Each accounting program's export was tested on
files shaped from that program's help pages, not on real exports, so check the columns and totals."

## What is covered so far

| Package | Files | What each one tests |
| --- | --- | --- |
| Xero invoice export (CSV, one row per invoice line) | day-first dates, month-first dates, dates that can't say which, a French file | the date question is asked only when needed; comma decimals and Windows-1252 bytes read; a month still running is left out |
| Xero Receivable Invoice Detail (Excel) | title rows, a Voided invoice, a line amount and the Total saved as formulas with no value | Invoice Date wins over Due Date; "Line Amount (ex)" is pre-filled and "Unit Price (ex)" is not; the voided invoice and the unsaved formula are pinned as gaps |
| QuickBooks Online (Excel) | Sales by Customer Detail with many lines per customer, with one line per customer, and a Transaction List | title rows, customer-name rows and "Total for" rows are listed as left out, not added; a list with no totals rows; the Transaction List's Payment row is left out through the pre-filled Type column |
| Wave (CSV) | Account Transactions for the Sales account; Income by Customer | the account's name and the Starting Balance, Totals, Balance Change and Ending Balance rows are listed, not added; Debit and Credit are never pre-filled (the person picks Credit); a refund in Debit and a report with no dates are pinned as gaps |
| FreshBooks (CSV) | Invoice Details with a summary on top, dates written yyyy-mm-dd, mmm d, yyyy, dd/mm/yyyy and dd.mm.yy; the old Revenue by Client with months across | once the person picks the real row of column names, every date shape but dd.mm.yy reads and Issue Date and Subtotal are pre-filled; the summary taken for column names, the Draft, dd.mm.yy and months across are pinned as gaps |
| Sage Accounting, Canada (CSV) | the Sales list (Invoice Number first, a Void and a credit note); the Sales Day Book with a Type column and a totals row | "Total" beside a tax column is never pre-filled (the person picks Net); a negative credit note lowers its month; a bare "Type" is not pre-filled; the void is pinned as a gap |
| Sage 50 Canadian (CSV) | Customer Sales Detail grouped by customer, dates 07-14-2026; the same with 07-14-26; the same in French, semicolons, windows-1252 | the grouped report reads and "Revenue" is pre-filled; the old .xls export is refused with a sentence saying what to do, so the route is .csv ([sage-50-canada.md](sage-50-canada.md)); two-digit years and the French file are pinned as gaps |

## Known gaps

### Open, found 2026-10-08

Each is a test written to pass only while the gap is there, so the day a fix lands it errors until
it is turned into a normal test. Ten are in `tests/figures-file-packages.spec.ts`, under "gaps the
newer practice files found, fails today", written with `it.fails`. The eleventh, Wave's report with
no dates, is a browser test in `e2e/app.spec.ts` written with `test.fail()`, because the sentence
the screen should show is the screen's own. Eleven tests, nine gaps. They are fixed in follow-on
slices, not in the one that found them.

| Gap | What happens today | Practice file | Fixed by |
| --- | --- | --- | --- |
| A refund paid back sits in a ledger's Debit column | with Credit picked, the refund's row is listed as "no amount" and August reads 320.00 against a true 280.00 | `wave-account-transactions` | the refunds slice |
| A report with no dates at all (Wave's Income by Customer) | "no row of column names found", and nothing says which report to export instead (Account Transactions) | `wave-income-by-customer` (pinned in the browser) | the months-across slice |
| A summary block above the table (FreshBooks' Invoice Details) | the summary's two titles are taken for the column names, and "Total Paid" is pre-filled as the amount over the invoice numbers; the person has to pick row 5 | every FreshBooks Invoice Details file | the void and draft slice |
| A Draft invoice | counted as a sale: August 726.19 against a true 476.19 | `freshbooks-invoices-iso` | the void and draft slice |
| A voided invoice | counted as a sale: Sage Accounting's August 150.00 against a true -50.00; Xero's Receivable Invoice Detail counts its Voided line | `sage-accounting-sales-list`, `xero-receivable-invoice-detail` | the void and draft slice |
| Dates with a two-digit year (FreshBooks dd.mm.yy, Sage 50's own 12-03-05) | no date is read, so no column names are found and nothing is added up | `freshbooks-invoices-two-digit-year`, `sage50-two-digit-year` | the two-digit years slice |
| Months across the top (FreshBooks' old Revenue by Client) | no column names found; nothing can be added up | `freshbooks-revenue-by-client` | the months-across slice |
| **New:** a French semicolon file with several comma-decimal columns (Sage 50's revenue, cost, profit and margin) | the commas win the delimiter guess, every line is split on them, no column names are found and nothing is added up. A French file with one amount column still reads | `sage50-french` | a follow-on slice, to be named by the maintainer |
| **New:** a formula saved with no value (Xero: an Excel export with formulas can show 0.00 until Enable Editing) | the line is listed as "no amount", as if the cell were empty, and August is 60.00 short | `xero-receivable-invoice-detail` | a follow-on slice, to be named by the maintainer |

The two marked **New** were not foreseen when the slices were planned. Like every gap here they are
to be fixed, not left pinned (decision of 2026-10-07); which slice fixes each is the maintainer's
call. The
design pass on 2026-10-06 had read a smaller French Sage 50-shaped file correctly; with every
money column of the report written "1 000,00" it no longer does.

### Fixed, found 2026-10-06

None of the gaps the Xero and QuickBooks files found is open. Each was written as a test that
passed only while the gap existed (`it.fails`); every one has been fixed and is now a normal passing
test.

Fixed since: **QuickBooks' Transaction List counted an invoice and its payment, so the same sale was
added twice** (decision of 2026-10-07). The Transaction List's `Transaction Type` header now
pre-fills an optional Type column, and rows typed Payment or Deposit are left out and listed ("N rows
typed Payment or Deposit, left out because a Type column is chosen", with the QuickBooks reason and
"choose None" if they are the person's own sales). The person can clear the column to count every
row. Its test is a normal passing test in the practice-file spec, and the rule has its own
tests in `tests/figures-file-type-column.spec.ts`. The practice file's layout is still shaped from
Intuit's Transaction List report page, not from a real Excel export.

Fixed since, the other three (decision of 2026-10-07: fix every gap the practice files found), in
`lib/figures/file/table.ts`, with rule tests in `tests/figures-file-logic.spec.ts`:

| Gap                                                                 | What the screen does now                                                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Xero's `UnitAmount` was pre-filled as the amount                    | price-per-item columns (UnitAmount, Unit Price, Rate, Price each, Prix unitaire) are never pre-filled; the person picks. LineAmount or Amount still is |
| Xero's `InvoiceDate` wasn't pre-filled                              | names written without spaces read as "date", and a due-date column (due, échéance) is never chosen by its name; it is pre-filled only when it is the one column that is mostly dates |
| QuickBooks' `Date` wasn't pre-filled when each customer had one line | a text cell alone on its row, or starting "Total", no longer counts against the date column                                                   |

Xero's export has no line-total column that its help pages name, so for those files nothing is
pre-filled as the amount and the person picks one. If they pick `UnitAmount`, the months are short
by the quantity on every line that sold more than one item; the fixtures keep that sum as a labelled
"SHORT" figure, and DotAmi does not multiply by a quantity column.

**The QuickBooks "one line per customer" fix rests on a guess about the layout.** The gap only
exists if a real Sales by Customer Detail export writes the customer names and the "Total for" rows
in the same column as `Date`. That layout is assumed: none of the help pages listed in
[the QuickBooks fixture](../../tests/fixtures/packages/quickbooks-online.ts) says where those cells
go. If a real export puts them elsewhere the fix changes nothing; until one has been checked, read
the original gap as possible, not confirmed.

## Asking for real column names

The maintainer's decision (2026-10-07): build on guessed names, mark them "assumed", warn the people
who use DotAmi, and ask on GitHub for the column-names row of real exports. The maintainer approved
the text below and it was **posted on 2026-10-09 as
[issue #124](https://github.com/Dot-Ami/dotami/issues/124)**; it is kept here as the record of what
was asked. Every row pasted in reply is checked for figures, client names or a company name before
anything enters the repository; a reply holding any of them is hidden, and nothing from it is
copied. A checked title then becomes "documented" in its fixture, citing the issue.

> **Title:** Help DotAmi read your accounting export: paste only its row of column names
>
> DotAmi's "Add from a file" turns an Excel or CSV export from your accounting program into one
> revenue total per month, read on your own computer. So far it has only been tested on invented
> files laid out from each program's help pages, because most help pages don't list a report's
> column titles. We'd like the real ones.
>
> **What we're asking for:** the one row of column names at the top of the table in an export.
> Nothing else.
>
> **Which reports:**
>
> - QuickBooks Online: Sales by Customer Detail, Transaction List by Date (Export to Excel)
> - Xero: the invoice export (CSV), Receivable Invoice Detail (Excel)
> - Wave: Account Transactions (General Ledger) (CSV)
> - FreshBooks: Invoice Details, Revenue by Client (Export for Excel)
> - Sage Accounting (Canada): the Sales list, the Sales Day Book (CSV)
> - Sage 50 Canadian: Customer Sales Detail (CSV), in English or in French
>
> **How:**
>
> 1. Export the report the way you normally do.
> 2. A CSV: open it in a plain text editor (Notepad, TextEdit), not Excel, so nothing is changed.
>    An Excel file: open it in Excel.
> 3. Copy only the row of column names and paste it in a comment, with the program, the report,
>    the language the program is set to, and your date format setting if you know it.
>
> **Please don't paste** any row below the column names, any amount, any client, customer or
> company name, an invoice number, or the title rows above the table (they often hold your
> company's name and dates). If a column title itself holds a name, replace it with NAME. A comment
> holding any of those will be hidden.
>
> **What happens next:** a maintainer checks each row, adds the titles to that program's practice
> file marked as seen in a real export (citing this issue), and re-runs the tests. If your titles
> differ from our guesses, that is exactly what we need to know.
