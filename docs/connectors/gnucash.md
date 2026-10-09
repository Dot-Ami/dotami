# GnuCash books ([8h])

Status: built 2026-10-08. **Add from a file** on the ideas page accepts a GnuCash book saved in
GnuCash's XML format, compressed (GnuCash's default) or not. Code: `lib/figures/books/` (the
reader `gnucash-xml.ts`, the worker `worker.ts` and `read-book.ts`, the screen's rules
`review.ts`) and `components/ventures/books-drop.tsx`. Tests: `tests/figures-books-gnucash.spec.ts`,
`tests/figures-books-review.spec.ts`, `tests/figures-books-logic.spec.ts`, and the browser tests
"a GnuCash book: …" in `e2e/app.spec.ts`. Every book in the tests is invented
(`tests/helpers/make-gnucash.ts`); none came from a real person.

## What the person sees

1. **Add from a file**, then *Accounting software or a spreadsheet you keep*, then drop the book or
   choose it. DotAmi tells a book from a spreadsheet by its first bytes (a gzip file, or XML that
   opens with GnuCash's `<gnc-v2>` element), not by its name.
2. "Reading … A GnuCash book is read in the background, so this window stays usable." The book is
   read in a worker; a read that runs past a minute is stopped.
3. **File: name**, then *DotAmi read your last save. Anything changed in GnuCash after that save
   isn't in it.* GnuCash writes the book to disk only when the person saves, so the file is the
   last save.
4. **Accounts in this book**: every account, with its type in plain words and its currency. The
   ones GnuCash marks as income start ticked (the maintainer's decision, 2026-10-07); any account
   can be ticked or unticked. An income account can hold interest or GST/HST collected rather
   than sales, so they are shown, never hidden, and the line above the list says so. An account
   whose direction GnuCash doesn't fix (type NONE or TRADING) or that holds shares rather than
   money can't be ticked, and says why. A ticked account GnuCash doesn't mark as income (a bank,
   an expense) gets a note under it: *This isn't an income account in your book. If a sale also
   lands here, it may be counted twice.* A sale is posted to both sides, so ticking the bank next
   to the income account adds it up twice. The note is information only: the tick stays and is
   counted.
5. **Monthly totals**, one table per currency, in exact cents, never converted or rounded. Then
   what was left out and why (a month that isn't over, an amount that isn't whole cents, a date
   DotAmi can't read), any month already in DotAmi with the same total, and how many scheduled
   transaction lines the book holds (plans, never counted).
6. **Review these N figures** sends only the monthly totals to `/api/figures/propose`, under the
   source kind `books` with the file's name as the label, and the agree prompt opens. Nothing is
   confirmed until the person presses Agree.

Where the source is named to people (the *What DotAmi knows about you* page), it reads
**Books / file**. The id `books` and that wording are the maintainer's (2026-10-08).

## Limits, and why

- **50 MB** for the book as dropped, compressed or not (the maintainer's decision, 2026-10-07: a
  larger limit than a spreadsheet's 10 MB, read by a background worker). Checked from the file's
  size before a byte past its first 8 KB is read.
- **200 MB once unpacked.** A compressed book is unpacked a slice at a time and stopped the moment
  it passes 200 MB, so a zip bomb never fills memory. On invented books GnuCash's XML took roughly a
  kilobyte per transaction, so this is well over a hundred thousand transactions; an invented book
  of 150,000 transactions (167 MB of XML) read in about four seconds in Node on a developer's
  laptop (not measured inside a browser worker, and never on a real GnuCash save). A compressed
  book near the 50 MB limit can unpack past 200 MB; it is refused with a sentence that says so.
  Lifting that would need a reader that walks the XML as it unpacks, rather than all at once.
- **One minute** per read. The worker is ended at once when it passes, and when the panel closes or
  another file is chosen.

## What it refuses, by name

The reader refuses what it doesn't fully understand instead of guessing (the full list is the
header of `lib/figures/books/gnucash-xml.ts`): a GnuCash *feature* the book lists that GnuCash 5
doesn't know, named in the sentence the way GnuCash itself names it; a file version other than
2.0.0; an account type it doesn't know, named; a part inside a transaction it doesn't know,
named; a part that may appear once appearing twice; XML outside the small subset DotAmi's own
reader handles (document types, custom entities); a book saved as a SQLite database (with how to
save an XML copy instead; reading those is a later decision). No sentence quotes an amount, an
account name or a line of the book.

## What it keeps

Nothing from the book. Its bytes move into the worker, which holds on to nothing once it has
answered and is stopped when the panel closes or on Change or Cancel; the accounts and lines
the worker hands back live only in the open panel. Only the totals the person agrees to are stored,
as figures (`Figure` rows), with the file's name and how many lines were added. Which accounts were
ticked is not remembered. Privacy review row: `docs/architecture/figures-privacy-review.md`.

## Sources

GnuCash's own file format, read 2026-10-06 for the reader's first slice: `gnucash-v2.rnc` (which
GnuCash marks non-normative), `gnc-features.cpp`, `gnc-date.h`, and gnucash.org's file and backup
guides. The "last save" note follows GnuCash's save-through-a-temporary-file behaviour noted in
`docs/architecture/figures-roadmap.md` § [8h].
