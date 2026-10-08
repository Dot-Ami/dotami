# The journal reader — hledger and Ledger files ([8h])

Status: the core is built (`lib/figures/books/journal.ts`, `journal-amount.ts`); there is no
screen yet, so nothing a person sees has changed. Tests: `tests/figures-books-journal.spec.ts`,
with two invented journals in `tests/fixtures/journals/`.

## Why DotAmi has its own

hledger is GPL-3.0 and DotAmi is Apache-2.0. The maintainer decided on 2026-10-07 that DotAmi
writes its own reader. It was written only from hledger's published documentation, never by
reading or translating hledger's or Ledger's source code:

- the hledger manual, [hledger.org/1.50/hledger.html](https://hledger.org/1.50/hledger.html)
  (the manual for hledger 1.50.5), chapter "Journal": Comments, Transactions, Dates (Simple
  dates, Posting dates), Status, Code, Description, Transaction comments, Postings, The two space
  delimiter, Account names, Amounts, Decimal marks, Digit group marks, Commodity, Costs, Balance
  assertions, Posting comments, Transaction balancing, Tags, and Directives (account and account
  types, alias, commodity, decimal-mark, D, include, P, payee, tag, Y, apply account, periodic
  transactions, auto postings, balance assignments, other Ledger directives). Read 2026-10-08.
- "hledger and Ledger", [hledger.org/ledger.html](https://hledger.org/ledger.html): value
  expressions, lot annotations, secondary dates, Ledger-only directives. Read 2026-10-08.

No code, comment or test text was copied from either project, and DotAmi adds no dependency on
them. The separate question of offering hledger itself in the installer is still the
maintainer's, and is not part of this reader.

## What it reads

A journal's bytes become the same accounts-and-lines shape every book reader hands to
`lib/figures/books/totals.ts`, which adds up the accounts the person ticks, month by month, in
exact cents, one list per currency.

- **Transactions**: a dated first line (`2026-03-31`, `2026/3/31` or `2026.3.31`), then indented
  postings and comment lines. Status marks, codes, descriptions, payees and notes are skipped and
  never kept. A secondary date (`2026-03-31=2026-04-02`) is skipped: the first date is the
  transaction's date in both programs unless asked otherwise.
- **Postings**: account (ends at two spaces or a tab), amount, cost (`@`, `@@`), balance assertion
  (skipped: only hledger checks it). One posting per transaction may leave its amount out; it is
  worked out exactly when the rest is in one commodity, costs converted. A transaction with no
  cost and one commodity must add up to exactly zero.
- **Posting dates**: a `date:` tag in the posting's comment moves that posting to its own day
  (a yearless one takes the transaction's year). `date2:` is skipped.
- **Amounts**: commodity on the left or the right, quoted when it isn't letters or a currency sign,
  a minus before or after a left-hand symbol, a point or a comma as the decimal mark, commas,
  points or spaces (including no-break and thin spaces) between groups of three, `1E3` notation.
  Nothing is rounded; an amount that isn't whole cents is left out of the totals and listed.
- **Directives**: `account` (with a `type:` tag, by letter or name; children take their nearest
  declared parent's type, otherwise the type comes from the top-level name: assets, liabilities or
  debts, equity, income or revenue, expenses), `commodity` (its sample amount and `format` line say
  which mark is that commodity's decimal mark), `decimal-mark`, `P`, `payee`, `tag`, comment lines
  (`;`, `#`, `*`) and `comment` … `end comment` blocks.
- **Accounts and currencies**: a journal account can hold several commodities, so each
  account-and-commodity pair is its own account to tick, never added together. A commodity written
  as an ISO 4217 code (`CAD`) is that currency. A symbol such as `$` could be several currencies, so
  it counts only once the person says which (the `currencyOf` option, for the screen to ask).

## What it refuses

Each refusal names what DotAmi didn't read and its line number, and never quotes the line. The
whole journal is refused, since a missing piece could change any month's total:

include files · periodic (`~`) and automated (`=`) transactions · balance assignments · value
expressions and lot notes (parentheses in an amount) · lot prices and dates (`{ }`, `[ ]`) ·
virtual postings · `alias` and `apply account` · `D` and `Y` defaults · the Ledger-only directives
hledger skips but Ledger obeys (`assert`, `bucket`, `capture`, `check`, `define`, `eval`, `expr`,
`python`, `value`, `test`, `apply fixed`, `apply tag`, command-line options) · unknown directives
and indented lines it can't place · dates without a year · a `date:` tag on a transaction or an
account (the manual doesn't say what it does there) · Ledger's `[date]` posting dates · an amount
like `1,000` or `1.000` that hledger reads as one and other programs as a thousand, unless a
`decimal-mark` or `commodity` line above it settles it · digit groups other than threes · a
transaction that doesn't add up · an account name with a semicolon, an unusual space or a hidden
character · an account more than 100 levels deep · control characters, files that aren't UTF-8
text, and files over 10 MB.

## Not done yet

- The screen, and proposing the totals into the agree prompt.
- Virtual postings: refused for now, because whether they count is the person's choice.
- Transactions with costs or several commodities are not checked for balancing (hledger balances
  those at a display precision and may infer costs; DotAmi doesn't redo that).
- The Ledger reading of `1,50` (a decimal comma) has not been checked against Ledger's own
  documentation; the reader follows hledger's manual there.
