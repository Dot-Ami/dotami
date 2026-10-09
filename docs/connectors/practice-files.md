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
| Xero Receivable Invoice Detail (Excel) | title rows, a Voided invoice, a line amount and the Total saved as formulas with no value | Invoice Date wins over Due Date; "Line Amount (ex)" is pre-filled and "Unit Price (ex)" is not; the Voided invoice is left out through the pre-filled Status column; the line whose formula has no saved value is listed as such, never as empty |
| QuickBooks Online (Excel) | Sales by Customer Detail with many lines per customer, with one line per customer, and a Transaction List | title rows, customer-name rows and "Total for" rows are listed as left out, not added; a list with no totals rows; the Transaction List's Payment row is left out through the pre-filled Type column |
| Wave (CSV) | Account Transactions for the Sales account; Income by Customer | the account's name and the Starting Balance, Totals, Balance Change and Ending Balance rows are listed, not added; Debit and Credit are never pre-filled (the person picks Credit); Income by Customer, with no dates, names Account Transactions instead; a refund in Debit is pinned as a gap |
| FreshBooks (CSV) | Invoice Details with a summary on top, dates written yyyy-mm-dd, mmm d, yyyy, dd/mm/yyyy and dd.mm.yy; the old Revenue by Client with months across | the real row of column names is found under the summary, every date shape reads (dd.mm.yy once the person says the century), Issue Date, Subtotal and Status are pre-filled, and the Draft is left out; Revenue by Client starts on months across and gives July, August and September to the cent, from every client row or from its Total row |
| Sage Accounting, Canada (CSV) | the Sales list (Invoice Number first, a Void and a credit note); the Sales Day Book with a Type column and a totals row | "Total" beside a tax column is never pre-filled (the person picks Net); a negative credit note lowers its month; a bare "Type" is not pre-filled; the Void is left out through the pre-filled Status column |
| Sage 50 Canadian (CSV) | Customer Sales Detail grouped by customer, dates 07-14-2026; the same with 07-14-26; the same in French, semicolons, windows-1252 | the grouped report reads and "Revenue" is pre-filled; the old .xls export is refused with a sentence saying what to do, so the route is .csv ([sage-50-canada.md](sage-50-canada.md)); the two-digit years read once the person says the century; the French file, four "1 000,00" columns a line, reads on its semicolons |

## Known gaps

### Open, found 2026-10-08

Each is a test written to pass only while the gap is there, so the day a fix lands it errors until
it is turned into a normal test. One is in `tests/figures-file-packages.spec.ts`, under "gaps the
newer practice files found, fails today", written with `it.fails`: one test, one gap. (Two-digit
years, months across the top, a report with no dates, a French semicolon file with several amount
columns, a formula saved with no value, a summary block above the table, Draft invoices and voided
invoices, eight more gaps found, are fixed: see below.) They are fixed in follow-on slices, not in
the one that found them.

| Gap | What happens today | Practice file | Fixed by |
| --- | --- | --- | --- |
| A refund paid back sits in a ledger's Debit column | with Credit picked, the refund's row is listed as "no amount" and August reads 320.00 against a true 280.00 | `wave-account-transactions` | the refunds slice |

### Fixed, found 2026-10-08

**A French semicolon file with several comma-decimal columns** (Sage 50 Canadian in French:
revenue, cost, profit and margin written "1 000,00"; practice file `sage50-french`). The commas
won the delimiter guess, every line was split on them, no column names were found and nothing was
added up; a French file with one amount column read, and so had the smaller French file of the
2026-10-06 design pass. Now, before guessing, `lib/figures/file/read-csv.ts` reads the first lines
on their semicolons: when at least two lines split, and the cells holding a comma on those lines
are amounts at least twice as often as text, the commas are decimal marks and the file is read on
its semicolons. So a French description with a comma ("Design, impressions") doesn't undo it. A
comma file whose commas sit in its text keeps the guess as it was, so a stray semicolon in it
doesn't move it off its commas (a file built so its semicolons cut lines into amount-looking
pieces could still be misread; none of the practice files is like that).
The file now reads like the English one: "Revenu" pre-filled, day-first dates, July, August and
September to the cent. The `it.fails` test is a normal passing test, under "a French semicolon
file with several amount columns, and a formula with no saved value", and the rule has its own
tests in `tests/figures-file-read.spec.ts`.

**A formula saved with no value** (Xero: an Excel export with formulas can show 0.00 until Enable
Editing; practice file `xero-receivable-invoice-detail`). The line was listed as "no amount", as if
the cell were empty. The workbook library gives such a cell as empty, and DotAmi never works a
formula out, so `lib/figures/file/unsaved-formulas.ts` reads the sheets' XML once more for which
cells hold a formula and no saved value. The row is now listed as "a formula Excel didn't save a
value for (open the file in Excel, click Enable Editing if it asks, save it, then drop it here
again)", and nothing is guessed for it: August still leaves its 60.00 out, now saying why. The
same holds for a date cell, and for a cell under a month in a months-across report. The `it.fails`
test is a normal passing test beside the French one; the rules have their own tests in
`tests/figures-file-read.spec.ts`, `tests/figures-file-logic.spec.ts` and
`tests/figures-file-months-across.spec.ts`. (The file's Voided line is left out by the Status
column, below, so August has no total at all.)

**Months across the top** (FreshBooks' old Revenue by Client; practice file
`freshbooks-revenue-by-client`). No date sat under any column, so no column names were found and
nothing was added up. Now the screen starts on "Months across the top, one column per month",
with row 4 guessed as the month names: July, August and September come out 500.00, 476.19 and
300.00 from every client row added down each month (the Total row left out), and the same from the
Total row taken alone. A month name DotAmi can't be sure of (Jul, Jul 26) stops the table with the
column named, never guessed (a builder default; the decision of 2026-10-07 is that these reports are read). The `it.fails` test is a normal passing test,
under "months across the top, and a report with no dates", and the rules have their own tests in
`tests/figures-file-months-across.spec.ts`.

**A report with no dates at all** (Wave's Income by Customer; practice file
`wave-income-by-customer`). The screen said only that no row of column names was found. Now it
recognises the report by the three column names Wave documents and names Account Transactions, the
Wave report with a date on every line. The browser test that pinned it with `test.fail()` is a
normal passing test in `e2e/app.spec.ts`; a second test checks no other practice file is told to
export a different report.

**Dates with a two-digit year** (FreshBooks' dd.mm.yy, Sage 50's own 12-03-05; practice files
`freshbooks-invoices-two-digit-year` and `sage50-two-digit-year`). No date was read, so no column
names were found and nothing was added up. Now the screen asks once, "Is 26 the year 2026?", and
reads every two-digit year in the date column in the century the person chose, adding nothing up
until then; DotAmi never picks the century (decision of 2026-10-07). Both `it.fails` tests are
normal passing tests, under "two-digit years, read once the person says the century", and the rules
have their own tests in `tests/figures-file-two-digit-years.spec.ts`. The summary block and the
Draft are fixed in that file too, like the other FreshBooks files (below).

Three more gaps found the same day are fixed by the void and draft slice (decision of 2026-10-07:
fix every gap the practice files found).
Their `it.fails` tests are now normal passing tests in `tests/figures-file-packages.spec.ts`, under
"void and draft invoices, and a summary above the table", and the rules have their own tests in
`tests/figures-file-status-column.spec.ts`.

| Gap | What the screen does now |
| --- | --- |
| A summary block above the table (FreshBooks' Invoice Details) was taken for the column names | when the first row of names found names no date column, a wider row below it that does (before the first dated row) wins: every FreshBooks Invoice Details file opens on row 5, with Issue Date, Subtotal and Status pre-filled. A row that already names its date column is kept, and a row the person picks is never moved |
| A Draft invoice was counted as a sale (FreshBooks' August 726.19 against a true 476.19) | an optional Status column, pre-filled from a header that is exactly "Status" or "Statut", leaves rows marked Void, Voided, Deleted or Draft out and lists them; August is 476.19 |
| A voided invoice was counted as a sale (Sage Accounting's August 150.00 against a true -50.00; Xero's Receivable Invoice Detail counted its Voided line) | the same Status column: Sage's August is -50.00, and Xero's Voided line is listed as left out. Xero's August has no total, because its other line is the formula saved with no value, which is listed and never worked out (above) |

Only one status word is published: FreshBooks' help page names Draft (read 2026-10-08). Void
(Sage Accounting) and Voided (Xero) are assumed: Sage's page says to void an invoice rather than
delete it (read 2026-10-08) and Xero's says its report includes voided and deleted invoices by
default (as of 2026-10-06), but neither shows the word in the status cell, so Deleted is assumed too.
The "Status" column title is assumed for all three. The French words (annulé, supprimé, brouillon)
are assumed until someone sees a real French export.

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
