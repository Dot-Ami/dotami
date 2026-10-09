# Privacy review — before the figures store ([8a])

Status: 2026-10-06. Required by [8a] before the first figure is stored: the figures (revenue,
income, the price of a big purchase) are the most sensitive thing DotAmi will hold. Plan of record:
[use-cases.md § What the back end stores](use-cases.md#what-the-back-end-stores).

## What will be stored

Confirmed totals only, each with: what it is, the period or date, the amount and currency, where it
came from (a source name, the file name, how many rows were summed), who confirmed it and when.
**Not stored:** individual transactions (apart from the business expense records the person agrees to keep, reviewed in the last section), the imported files (not even sent to the local server — [8c] reads them in the app's window; the one file DotAmi keeps is a receipt the person adds to an expense record, reviewed in the last section), bank or card numbers ([8g]), login
details for anything. All of it in the one database file on the person's computer.

## Who could reach it, and what stops them

| Who | How | What stops it | Status |
|---|---|---|---|
| Someone with the computer or its disk | reads the database file | the operating system's disk encryption — the settings page says how (Windows Device encryption on Home, BitLocker on Pro, FileVault on a Mac) | the person's choice; DotAmi says so |
| Someone with a backup file | opens it | a backup passphrase (AES-256-GCM, [7c]) | the person's choice; the warning is shown |
| A website the person visits — a write | a page fires a request at DotAmi's local address | cross-site writes and non-JSON writes refused (`lib/api/body-limit.ts`, 2026-09-20); the browser's CORS rules block other methods | in place |
| A website the person visits — DNS rebinding | the page re-points its own domain at 127.0.0.1, then reads and writes as if DotAmi were its own site | **was open:** `GET /api/ventures` with `Host: evil.example` returned every venture (2026-10-06). **Fixed:** every request whose Host isn't this computer's own name is refused with 421 (`lib/http/allowed-host.ts`, `middleware.ts`), prefetches included | fixed; `e2e/app.spec.ts` "DNS rebinding guard" fails on the old code (200) and passes now |
| A file the person drops ([8c]) | a spreadsheet crafted to attack its reader, or simply holding every transaction | it is read inside the app's window, in memory: the bytes never go to the server or the disk, and only the monthly totals the person goes on to agree to are sent (`/api/figures/propose`). Its type is decided by its first bytes, macros refuse the file, the size is capped before reading (only the first 8 KB is looked at, to tell a GnuCash book apart) and again before unpacking, and no library error text is shown (it could quote the file). A reader bug stays inside the page's sandbox, away from the database | in place (2026-10-06) |
| A calendar company ([8e] Add to my calendar) | the person imports the reminders file into a calendar that syncs online (Google, Microsoft, Apple), whose company then holds the events | the file is made in the page from the ticked boxes alone and holds only general words: the title "Bring your DotAmi figures up to date", which period ended, and that the calendar can't see DotAmi. No amount, no idea name, no figure, no date of anything the person did. The page says a syncing calendar shares the words. Unit-tested: the event text has no digits, so no amount can be in it (`tests/figures-calendar.spec.ts`) | in place (2026-10-08) |
| A return PDF the person drops ([8f]) | the most sensitive file yet (name, address, social insurance number, income), or a PDF crafted to attack its reader | read inside the app's window, in memory, in a worker of DotAmi's own whose script carries a policy that refuses every connection (`next.config.mjs`, `workerPolicy`; a browser test proves a fetch from inside it is refused). The bytes move into that worker and pdf.js's copy is destroyed after each read; the worker stops when the panel closes. Nothing is proposed, sent, stored or logged in this step; only the four T2125 lines and their pages are shown. pdf.js is pinned and reviewed, with drawing, fonts, scripts, forms and downloads switched off ([review](../connectors/pdf-reader-review.md)) | in place (2026-10-08), shown only; proposing figures from it is the next step |
| A GnuCash book the person drops ([8h]) | every transaction the person ever entered, with customers' names, or a book crafted to attack its reader (a zip bomb, odd XML) | read in a worker of DotAmi's own, in memory, under the same policy that refuses every connection (`workerPolicy`; a browser test proves a fetch from inside it is refused). The bytes move into the worker; only the accounts and posted lines come back to the window, and only the monthly totals of the accounts the person ticks are sent, under the source kind "books", to wait in the agree prompt. Up to 50 MB and 200 MB unpacked, checked before reading and while unpacking; a read is stopped after a minute; DotAmi's own strict XML reader refuses document types and custom entities, and unknown GnuCash features, account types and transaction parts are refused by name. No book text is ever in a message or a log. The worker holds on to nothing once it has answered and stops when the panel closes or on Change or Cancel; a read stopped while the book is still loading never starts one ([connector notes](../connectors/gnucash.md)) | in place (2026-10-08) |
| Another computer on the network | connects to the port | the server listens on 127.0.0.1 only | in place |
| Another program on this computer | reads the file, or calls the local server (no login) | **nothing in DotAmi** — a program running as the person can already read their files. Same trust as the person's own account; stated, not defended | by design for a single-user app |
| A model the Lens uses ([9]) | reads figures to answer | the person's chosen model and permission level; a hosted model's company sees what it reads (the "own key" warning) | when the Lens exists |

## Rules for building the store

1. **Amounts never in a URL** — not in query strings or paths (they end up in logs and history).
   Figures travel in request and response bodies only.
2. **No figure values in logs** — `logs/server.log` in the desktop app gets events, never amounts.
3. **Confirming is the person's click** — only the agree prompt ([8b]) turns a proposed figure into
   a confirmed one; the server refuses confirmation from anything else, and a test proves it.
4. **Deleting a venture deletes its figures** (asked first); *forget this source* retracts its figures ([8d]).
   *As built (2026-10-08):* the Delete menu on /your-data deletes whole kinds of data (ideas, which
   take their figures with them and keep their expense records as "not attached yet", saying so
   first, by the maintainer's decision of 2026-10-08; figures; expense records; statements, all at
   once; settings). It asks twice, refuses if the counts changed in between, deletes in one
   transaction, then runs VACUUM so the deleted rows are gone from the file's bytes, not only marked
   free (`tests/privacy-delete.spec.ts` scans the file for a marker string; a plain delete leaves it
   there). Only DotAmi's own page can call it (`refuseUnlessFromAppPage`), and its body goes through
   `readJsonWithLimit`. *Forget this source* isn't built.
   *Added 2026-10-08:* a box for the safety copies in the backups folder (whole copies of the file,
   so they still hold what was deleted), warning that afterwards only a backup saved elsewhere could
   bring anything back. It deletes only DotAmi's own `dotami-before-….db` files directly in
   `backups/`, never through a link (`desktop/wipe-pending.mjs`). A wipe that can't finish leaves a
   "wipe pending" note (written before the delete, removed once the wipe and the copies are done),
   and the desktop app finishes it at its next start, only when the note is there
   (`tests/desktop-wipe-pending.spec.ts`, `e2e-desktop/desktop.spec.ts`: the marker string is gone
   from `dotami.db` and `backups/` after the restart, and an ordinary start without the note leaves
   it).
5. **Every write route** goes through `readJsonWithLimit` (cross-site, JSON-only and size checks).

## Bank and card accounts ([8g], built 2026-10-08, no screen adds one yet)

The `SourceAccount` table holds, per account, the person's own name for it, which of the statement
warning's three buttons they pressed, the day they agreed and the day they took it back. **Not
stored:** an account, card, bank, branch or transit number, a file name, or a hash of any of them (an
account number has so few possible values that a hash can be reversed by trying them all). The name
is the only way in for digits, so it is checked on the server: "ending" plus exactly four digits at
the end is allowed (the maintainer's decision, 2026-10-07), and any other run of four or more digits
is refused, counting digits split by anything but a letter (spaces, hyphens, en dashes, commas, brackets, accent marks) as one run, digits of any
script, and refusing hidden characters (`lib/figures/source-account-name.ts`). The routes
(`/api/figures/bank-sources`, `/retire`) answer only DotAmi's own page, read their bodies through
`readJsonWithLimit`, refuse a field they don't know (so a number can't ride along unread), and log
only an error's name and code. Adding needs the *Bank and card records* switch on; the switch stays
planned until the statement screen exists, so today nothing can add an account. The names are
counted on *What DotAmi knows about you*, never shown there, and Delete has a box for them. Who can
read them: anyone who can open the data file (disk encryption is the answer, as for figures).
Nothing links a figure to its account yet; when something does, that link must be hand-written SQL
with a test that seeded data survives.

## Open

- What still holds deleted data after Delete, said on the menu itself: the safety copies in the
  backups folder unless that box is ticked, what the desktop window stored in earlier launches (a
  later decision), and the drive under the data file (SQLite's journal and a deleted safety copy are
  removed, not overwritten, and a drive keeps its own spare copies; disk encryption covers that). Until Delete is used, a figure that was taken back or turned down keeps
  its amount in the file, and the page lists it.
- The wipe needs free disk space about the size of the file and no other connection mid-change. When
  it can't run, the rows are still deleted and the page says their space isn't wiped yet, with a
  button to try again; the desktop app also finishes it at its next start. If even the small "wipe
  pending" note can't be written (a completely full disk), the next start can't know: the page's
  retry is then the only way.
- Other programs on the computer can read everything — a per-launch secret for the local server
  wouldn't change that (they can read the file directly), so it isn't proposed.
- An unlocked backup is readable by whoever holds it; the default stays "no passphrase" because a
  forgotten passphrase loses the data for good. The maintainer may want this the other way round.

---

## Privacy review: expense records and receipts ([8i])

**Typed expense records are reviewed here and built (2026-10-07, the store: the table, the checks and
the routes; 2026-10-08, the screen to type and agree to them, with the maintainer's decisions of that
day). Receipt files are kept too (2026-10-08: the store, adding and removing one, the Delete menu and
the sweep; reviewed under "Receipts" below, the design as built in expense-records.md § 7), desktop
backups carry them, and *Show receipt* shows one inside DotAmi (its security design is
expense-records.md § 8).** The
maintainer decided on 2026-10-07 to keep single expense records and their receipt files, copied into
the data folder and carried by backups, with every way in. The design and the options are in
[expense-records.md](expense-records.md). For expense records this section replaces the "Not stored:
individual transactions" line above; the sentences listed in expense-records.md § 3, rule 1 were
reworded in the same change as the code.

### What is stored (typed records: built)

Per expense: the idea it is attached to, or none ("not attached yet", the maintainer's decision of
2026-10-08), the date, the amount and currency, who it was paid to and what for (the
words typed by the person, or proposed by an agent and still waiting for the person's click), an
optional category the person picked, an optional seller's address and
vendor's GST/HST number (both typed by the person), the person's own optional business share (a whole
percent, 1 to 100, kept beside the full amount), the optional GST/HST part, and for a refund or credit
the way the person chose to keep it (a negative amount, or a refund record), the purchase it came from
and the credit note's details when given; where it came from (typed, a file, or an agent),
and its state with the days it was proposed, agreed to and taken back. Held in the `Expense` table of
the one database file, nowhere else. **Not stored:** a bank or card number (the table has no column
for one, and a test lists the columns), a login, the spreadsheet or statement a record was read from,
a category, business share or "deductible" mark chosen by DotAmi, an amount worked out from the
share, and any receipt (there is no column for a file: a receipt is a file of its own, described by
its own table, below). Records typed on the Expenses page are held
only in that window (not in browser storage) until the person agrees to them; closing the window
forgets them.
Figures stay totals; only expense records are single transactions.

### What is more sensitive than a total

- **Who it was paid to.** One record can say where the person shops, which clinic, which lawyer. A
  total says none of that. The seller's address, when given, says more again. Both are the person's
  words; DotAmi checks only their length and that they hold no control characters.
- **Free text can hold what DotAmi never asks for.** Nothing stops a person typing a card number into
  "what for"; DotAmi has no field for one and does not read the words for digits. The agree prompt
  shows every word back before it counts.

### Who could reach it, and what stops it (records)

| Who | How | What stops it | Status |
|---|---|---|---|
| Someone with the computer or its disk | reads the database file | the operating system's disk encryption, as for everything above | the person's choice; DotAmi says so |
| Someone with a backup file | opens it | the backup passphrase, as above; a backup copies the whole database, expense records included | the person's choice |
| A website the person visits | writes or reads through DotAmi's local address | the same guards as the figures: cross-site and non-JSON writes refused (`lib/api/body-limit.ts`), the Host check (`middleware.ts`) | in place |
| DotAmi's own agent paths, or any program that calls the API | tries to confirm, take back, turn down or move a record | `/api/expenses/agree`, `/retract`, `/discard` and `/attach` answer only to DotAmi's own page (`Sec-Fetch-Site: same-origin`); `/propose` can create nothing but "proposed" and refuses a body that names a status; `tests/expenses-store.spec.ts` and `tests/expenses-typed.spec.ts` prove each | in place |
| Any program on the computer that calls the API | reads the expense list (`GET /api/expenses`; with no idea named it now returns every one of the person's records: payee, amount, address, GST/HST number) | open to any local caller that passes the Host check, by the same trust as the data file itself, which any program running as the person can read; `/api/ventures` was already open the same way. Only an idea's id ever goes in the address | accepted, same as the data file |
| Another program on this computer | reads the file, or sets the page header itself | **nothing in DotAmi**: same trust as the person's own account, as above | by design for a single-user app |
| A model the Lens ([9]) uses | reads records to answer or to propose | the person's chosen model and permission level | when the Lens exists |

### Rules for building it (extending 1-5 above)

6. **Nothing about a record in a URL or a log.** Not the amount (rule 1), and also not who it was
   paid to, what for, the category or the address. A record is addressed by its id only (the list
   takes only the idea's id in its query); a failing route logs the error's name and code and nothing
   else (`logRouteError`), and a refusal names a record's position, never its words. *Built and tested.*
7. **Confirming stays the person's click** (rule 3). A typed record, one from a spreadsheet, a
   statement or the Lens is *waiting* until the agree prompt; no caller can name a status. *Built and
   tested.* The maintainer decided (2026-10-08) "type many, agree once": records the person types stay
   in the window until one click agrees to all of them, minus any the person unticked in the review
   list; anything an agent or a file proposes still waits for that click.
8. **A receipt's bytes** reach the server only for storing, which is never parsing, opening or running
   them, and no receipt leaves the computer except by the person's own act or through a model they
   allowed. This changes the rule above that imported files are never sent to the server or kept
   (expense-records.md § 3, rule 5). *Built: the server reads a few header bytes for the type and size, hashes
   the file and writes it; adding and removing answer only DotAmi's own page (tests/expenses-receipts.spec.ts).*
9. **Delete removes the file with the record**, and the Delete menu names what it cannot remove.
   *Built: “Your expense records” takes the receipts, rows and files; “Your receipts” removes every
   receipt and keeps the records; the menu names the disk under a removed file (tests/privacy-delete.spec.ts).*
10. **No account or card number is kept.** There is no field for one. For a "paid to" taken from a
    bank row (not built; the bank and card statements story, [8g]), a run of four or more digits would
    be refused or cleaned; that is new, not part of [8g] today, and taking any "paid to" from a bank
    row reverses the guarantee in `lib/figures/bank/types.ts:49-53` (expense-records.md § 3, rule 3).
11. **Every new table is listed in `lib/privacy/inventory.ts`** before merge; the test fails until it
    is. *Built: the `Expense` table is listed, and /your-data counts it.* **A new `receipts/` folder is
    not caught by that test**: the folder check only confirms the folders already listed are still
    written. It has to be added by hand to `FOLDERS` there, or the test extended to fail on an unlisted
    folder (expense-records.md § 3, rule 4), so /your-data shows it. *Built: added by hand, with the
    `Receipt` table; the test checks the store still names the folder.*

### The vendor's GST/HST number

The field is optional and typed by the person. DotAmi checks its shape only: the CRA describes a
program account number as a 9-digit business number, a 2-letter program identifier and a 4-digit
reference number, and the GST/HST identifier is RT (for example 123456789 RT 0001) ([Program accounts
you may need](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/business-registration/business-number-program-account/need-program-accounts.html),
Canada Revenue Agency, page dated 2026-09-03, read 2026-10-07). Nine digits alone are accepted too,
because receipts often print only the business number. Spaces, hyphens and letter case are ignored and
the stored form uses the CRA's spacing. DotAmi does not look the number up (that would be a request to
the CRA) and does not say whether it is real; a seller outside Canada has none, so the field can stay
blank. A person should re-read the CRA page before any sentence of it is copied into a catalog.

### Receipts: built (the store, 2026-10-08)

Built as option A of expense-records.md § 2, with backups that carry the receipts; the design as
built is § 7 there; showing one inside DotAmi is § 8 (its security design, written before the viewer).

What is stored: optionally one receipt file per agreed record, exactly as the person gave it, in a
`receipts/` folder beside the database, named by DotAmi (32 random hex characters and the extension of
the type it read from the bytes), never by the person's file name, which is not sent or kept. The
`Receipt` table holds which record it belongs to, the type, the size, a SHA-256 and the day it was
added. Only JPEG, PNG, WebP and PDF are kept, decided from the first bytes; at most 10 MB; a picture at
most 50 megapixels and 20,000 pixels on a side, read from its header before anything decodes it.

- **A receipt can carry what DotAmi would never ask for**: the last digits of a card, the buyer's
  name and address, another person's details on a client invoice. DotAmi cannot remove them from a
  photo; the person is told on screen before choosing the file.
- **Files, not rows**: deleting a row in the database and deleting a file on a disk are different
  acts, and a deleted file can stay readable on the disk until it is overwritten. The Delete menu says
  so under *What Delete doesn't reach*.

| Who | How | What stops it | Status |
|---|---|---|---|
| Someone with the computer or its disk | reads `receipts/` | the operating system's disk encryption; a receipt copy is not encrypted by DotAmi | the person's choice; DotAmi says so |
| Someone with a backup | opens it | a backup holds the receipts with the data file; the backup passphrase, when set, covers them (AES-256-GCM over the whole stream, its file list authenticated); an unlocked backup is readable by whoever holds it, as before | the person's choice; built (desktop-app.md § Backup and restore) |
| A receipt file crafted to attack whatever opens it | the person adds it | type decided by its first bytes (not its name or the browser's type), SVG and web pages refused, a size cap checked before the file is read, a pixel cap read from the header; the server never decodes, parses or runs it. Shown inside DotAmi only by what can't run a script: a picture by the browser's image decoder from a `blob:` address, a PDF drawn by pdf.js in a worker that can reach nothing, with no annotation layer and no scripting; the bytes are checked again (type, pixels) before drawing; never a frame or Chromium's PDF viewer (expense-records.md § 8) | built; browser tests with hostile files (`e2e/receipt-viewer.spec.ts`) |
| A web page or program naming a file | tries `../` or a drive path through a receipt route | DotAmi names every stored file itself (a random id); the person's file name is never sent; the routes take a record's id, look it up in the database and build the name from the row; they answer only DotAmi's own page and sit behind the Host check like every route | built; `tests/expenses-receipts.spec.ts` tries `../`, a drive path and a type that isn't one of the four |
| An agent or another program | adds, removes or reads a receipt | adding, removing and reading (`POST /api/expenses/receipt/file`) answer only DotAmi's own page (`Sec-Fetch-Site: same-origin`); the bytes come back as `application/octet-stream` with `nosniff` and a sandbox policy, and only after their size and SHA-256 match the row | built |
| A model the Lens uses | reads receipts to propose records | the person's chosen model and permission level; a hosted model's company sees what it reads | when the Lens exists |
| Someone who finds the data after "delete" | reads leftover bytes | the database is wiped (`VACUUM`); a removed receipt file is deleted, and DotAmi cannot promise its bytes are gone from the disk, which the Delete menu says | built |

### Open (for the maintainer)

- Whether DotAmi should offer to encrypt the `receipts/` folder itself; today it relies on disk
  encryption, as it does for the database.
- Whether the Delete menu may mention age at all, or stay silent about it; DotAmi supplies the
  information, the person decides. If it does, the CRA's wording is six years from the end of the
  last tax year a record relates to; indefinitely for long-term property, the share registry and
  similar history; longer under an objection or appeal ([Where to keep your records](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html),
  page dated 2026-08-03, read 2026-10-07). A cut-off by a receipt's own age would be wrong, so
  "older than six years" must not be the rule.
- Whether a refund or credit (a negative amount) may be a record. Today an amount must be more than
  zero.
