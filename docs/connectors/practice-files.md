# Practice files — shaped from help pages, not real exports

Status: 2026-10-06, first slice ([8c-3]): Xero and QuickBooks Online. The other packages in
[the connectors research](README.md) (Wave, FreshBooks, Sage Accounting, Sage 50 Canadian) follow.

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
  other words, in another order.
- Vendors change these pages. The pages were read by the design pass on 2026-10-06; Xero's help
  pages are drawn by script and could not be read again while building, and Intuit's developer
  page describes the report as data, not as an Excel file.
- The one way to close that gap is a header row copied from a real export (column names only,
  never a figure). Whether to do that is the maintainer's call.

## What is covered so far

| Package                                             | Files                                                                                                     | What each one tests                                                                                                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Xero invoice export (CSV, one row per invoice line) | day-first dates, month-first dates, dates that can't say which, a French file                             | the date question is asked only when needed; comma decimals and Windows-1252 bytes read; a month still running is left out                                                                           |
| QuickBooks Online (Excel)                           | Sales by Customer Detail with many lines per customer, with one line per customer, and a Transaction List | title rows, customer-name rows and "Total for" rows are listed as left out, not added; a list with no totals rows; the Transaction List's Payment row is left out through the pre-filled Type column |

## Known gaps

None open at the moment. The gaps the practice files found were each written as a test that passed
only while the gap existed (`it.fails`); every one has been fixed and is now a normal passing test.

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
