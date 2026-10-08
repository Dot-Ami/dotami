# Privacy review — before the figures store ([8a])

Status: 2026-10-06. Required by [8a] before the first figure is stored: the figures (revenue,
income, the price of a big purchase) are the most sensitive thing DotAmi will hold. Plan of record:
[use-cases.md § What the back end stores](use-cases.md#what-the-back-end-stores).

## What will be stored

Confirmed totals only, each with: what it is, the period or date, the amount and currency, where it
came from (a source name, the file name, how many rows were summed), who confirmed it and when.
**Not stored:** individual transactions (apart from the business expense records the person agrees to keep, reviewed in the last section), the imported files (not even sent to the local server — [8c] reads them in the app's window), bank or card numbers ([8g]), login
details for anything. All of it in the one database file on the person's computer.

## Who could reach it, and what stops them

| Who | How | What stops it | Status |
|---|---|---|---|
| Someone with the computer or its disk | reads the database file | the operating system's disk encryption — the settings page says how (Windows Device encryption on Home, BitLocker on Pro, FileVault on a Mac) | the person's choice; DotAmi says so |
| Someone with a backup file | opens it | a backup passphrase (AES-256-GCM, [7c]) | the person's choice; the warning is shown |
| A website the person visits — a write | a page fires a request at DotAmi's local address | cross-site writes and non-JSON writes refused (`lib/api/body-limit.ts`, 2026-09-20); the browser's CORS rules block other methods | in place |
| A website the person visits — DNS rebinding | the page re-points its own domain at 127.0.0.1, then reads and writes as if DotAmi were its own site | **was open:** `GET /api/ventures` with `Host: evil.example` returned every venture (2026-10-06). **Fixed:** every request whose Host isn't this computer's own name is refused with 421 (`lib/http/allowed-host.ts`, `middleware.ts`), prefetches included | fixed; `e2e/app.spec.ts` "DNS rebinding guard" fails on the old code (200) and passes now |
| A file the person drops ([8c]) | a spreadsheet crafted to attack its reader, or simply holding every transaction | it is read inside the app's window, in memory: the bytes never go to the server or the disk, and only the monthly totals the person goes on to agree to are sent (`/api/figures/propose`). Its type is decided by its first bytes, macros refuse the file, the size is capped before reading and again before unpacking, and no library error text is shown (it could quote the file). A reader bug stays inside the page's sandbox, away from the database | in place (2026-10-06) |
| A return PDF the person drops ([8f]) | the most sensitive file yet (name, address, social insurance number, income), or a PDF crafted to attack its reader | read inside the app's window, in memory, in a worker of DotAmi's own whose script carries a policy that refuses every connection (`next.config.mjs`, `workerPolicy`; a browser test proves a fetch from inside it is refused). The bytes move into that worker and pdf.js's copy is destroyed after each read; the worker stops when the panel closes. Nothing is proposed, sent, stored or logged in this step; only the four T2125 lines and their pages are shown. pdf.js is pinned and reviewed, with drawing, fonts, scripts, forms and downloads switched off ([review](../connectors/pdf-reader-review.md)) | in place (2026-10-08), shown only; proposing figures from it is the next step |
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
5. **Every write route** goes through `readJsonWithLimit` (cross-site, JSON-only and size checks).

## Open

- Other programs on the computer can read everything — a per-launch secret for the local server
  wouldn't change that (they can read the file directly), so it isn't proposed.
- An unlocked backup is readable by whoever holds it; the default stays "no passphrase" because a
  forgotten passphrase loses the data for good. The maintainer may want this the other way round.

---

## Privacy review: expense records and receipts ([8i])

**Typed expense records are reviewed here and built (2026-10-07, the store: the table, the checks and
the routes; no screen yet). Receipt files are still PROPOSED: nothing of them is built.** The
maintainer decided on 2026-10-07 to keep single expense records and their receipt files, copied into
the data folder and carried by backups, with every way in. The design and the options are in
[expense-records.md](expense-records.md). For expense records this section replaces the "Not stored:
individual transactions" line above; the sentences listed in expense-records.md § 3, rule 1 were
reworded in the same change as the code.

### What is stored (typed records: built)

Per expense: the idea, the date, the amount and currency, who it was paid to and what for (the
words typed by the person, or proposed by an agent and still waiting for the person's click), an
optional category the person picked, an optional seller's address and
vendor's GST/HST number (both typed by the person), where it came from (typed, a file, or an agent),
and its state with the days it was proposed, agreed to and taken back. Held in the `Expense` table of
the one database file, nowhere else. **Not stored:** a bank or card number (the table has no column
for one, and a test lists the columns), a login, the spreadsheet or statement a record was read from,
a category or "deductible" mark chosen by DotAmi, and any receipt (there is no column for a file).
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
| DotAmi's own agent paths, or any program that calls the API | tries to confirm, take back or turn down a record | `/api/expenses/agree`, `/retract` and `/discard` answer only to DotAmi's own page (`Sec-Fetch-Site: same-origin`); `/propose` can create nothing but "proposed" and refuses a body that names a status; `tests/expenses-store.spec.ts` proves each | in place |
| Another program on this computer | reads the file, or sets the page header itself | **nothing in DotAmi**: same trust as the person's own account, as above | by design for a single-user app |
| A model the Lens ([9]) uses | reads records to answer or to propose | the person's chosen model and permission level | when the Lens exists |

### Rules for building it (extending 1-5 above)

6. **Nothing about a record in a URL or a log.** Not the amount (rule 1), and also not who it was
   paid to, what for, the category or the address. A record is addressed by its id only (the list
   takes only the idea's id in its query); a failing route logs the error's name and code and nothing
   else (`logRouteError`), and a refusal names a record's position, never its words. *Built and tested.*
7. **Confirming stays the person's click** (rule 3). A typed record, one from a spreadsheet, a
   statement or the Lens is *waiting* until the agree prompt; no caller can name a status. *Built and
   tested at the routes; the agree prompt for expenses is the next slice.* Whether a person typing many
   receipts in a row may skip the click is still the maintainer's open choice.
8. **A receipt's bytes** reach the server only for storing, which is never parsing, opening or running
   them, and no receipt leaves the computer except by the person's own act or through a model they
   allowed. This changes the rule above that imported files are never sent to the server or kept
   (expense-records.md § 3, rule 5). *PROPOSED: no receipt is stored yet.*
9. **Delete removes the file with the record**, and the Delete menu names what it cannot remove.
   *PROPOSED with receipts and the Delete menu ([8d]).*
10. **No account or card number is kept.** There is no field for one. For a "paid to" taken from a
    bank row (not built; the bank and card statements story, [8g]), a run of four or more digits would
    be refused or cleaned; that is new, not part of [8g] today, and taking any "paid to" from a bank
    row reverses the guarantee in `lib/figures/bank/types.ts:49-53` (expense-records.md § 3, rule 3).
11. **Every new table is listed in `lib/privacy/inventory.ts`** before merge; the test fails until it
    is. *Built: the `Expense` table is listed, and /your-data counts it.* **A new `receipts/` folder is
    not caught by that test**: the folder check only confirms the folders already listed are still
    written. It has to be added by hand to `FOLDERS` there, or the test extended to fail on an unlisted
    folder (expense-records.md § 3, rule 4), so /your-data shows it. *PROPOSED with receipts.*

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

### Receipts: still PROPOSED

Nothing below is built; it is what the design (expense-records.md § 2) would change.

What would be stored: optionally one receipt file per record, as the person gave it, in a
`receipts/` folder beside the database (named by DotAmi, never by the person's file name), plus its
size, type and a SHA-256 on the record.

- **A receipt can carry what DotAmi would never ask for**: the last digits of a card, the buyer's
  name and address, another person's details on a client invoice. DotAmi cannot remove them from a
  photo; the person is told on screen when adding one.
- **Files, not rows**: deleting a row in the database and deleting a file on a disk are different
  acts, and a deleted file can stay readable on the disk until it is overwritten.

| Who | How | What would stop it | Status |
|---|---|---|---|
| Someone with the computer or its disk | reads `receipts/` | the operating system's disk encryption; a receipt copy is not encrypted by DotAmi | the person's choice; DotAmi says so |
| Someone with a backup | opens it | the backup passphrase, which must also cover the receipts if they are carried | needs the backup change (expense-records.md § 2) |
| A receipt file crafted to attack whatever opens it | the person adds or opens it | type decided by its first bytes (not its name), a size cap before reading, DotAmi never parses it on the server, and never runs it; how it is shown (in the window or the computer's own viewer) is an open choice | proposed |
| A web page or program naming a file | tries `../` or a drive path through a receipt route | DotAmi names every stored file itself (a random id); the person's file name is kept as text only, never used as a path; the route takes an id, checks it against the database, and sits behind the Host check like every route | proposed; a test would try `../`, a drive letter and a long name |
| A model the Lens uses | reads receipts to propose records | the person's chosen model and permission level; a hosted model's company sees what it reads | when the Lens exists |
| Someone who finds the data after "delete" | reads leftover bytes | the database is wiped (`VACUUM`) as the "What DotAmi knows about you" page and its Delete menu ([8d]) plan; DotAmi cannot promise it for files on the disk, and says so in the Delete menu's "what I can't reach" list | proposed |

### Open (for the maintainer)

- Whether a copy of the receipt is kept at all, or only a pointer (expense-records.md § 2).
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
