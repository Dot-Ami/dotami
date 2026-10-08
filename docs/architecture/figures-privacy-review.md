# Privacy review — before the figures store ([8a])

Status: 2026-10-06. Required by [8a] before the first figure is stored: the figures (revenue,
income, the price of a big purchase) are the most sensitive thing DotAmi will hold. Plan of record:
[use-cases.md § What the back end stores](use-cases.md#what-the-back-end-stores).

## What will be stored

Confirmed totals only, each with: what it is, the period or date, the amount and currency, where it
came from (a source name, the file name, how many rows were summed), who confirmed it and when.
**Not stored:** individual transactions, the imported files (not even sent to the local server — [8c] reads them in the app's window), bank or card numbers ([8g]), login
details for anything. All of it in the one database file on the person's computer.

## Who could reach it, and what stops them

| Who | How | What stops it | Status |
|---|---|---|---|
| Someone with the computer or its disk | reads the database file | the operating system's disk encryption — the settings page says how (Windows Device encryption on Home, BitLocker on Pro, FileVault on a Mac) | the person's choice; DotAmi says so |
| Someone with a backup file | opens it | a backup passphrase (AES-256-GCM, [7c]) | the person's choice; the warning is shown |
| A website the person visits — a write | a page fires a request at DotAmi's local address | cross-site writes and non-JSON writes refused (`lib/api/body-limit.ts`, 2026-09-20); the browser's CORS rules block other methods | in place |
| A website the person visits — DNS rebinding | the page re-points its own domain at 127.0.0.1, then reads and writes as if DotAmi were its own site | **was open:** `GET /api/ventures` with `Host: evil.example` returned every venture (2026-10-06). **Fixed:** every request whose Host isn't this computer's own name is refused with 421 (`lib/http/allowed-host.ts`, `middleware.ts`), prefetches included | fixed; `e2e/app.spec.ts` "DNS rebinding guard" fails on the old code (200) and passes now |
| A file the person drops ([8c]) | a spreadsheet crafted to attack its reader, or simply holding every transaction | it is read inside the app's window, in memory: the bytes never go to the server or the disk, and only the monthly totals the person goes on to agree to are sent (`/api/figures/propose`). Its type is decided by its first bytes, macros refuse the file, the size is capped before reading and again before unpacking, and no library error text is shown (it could quote the file). A reader bug stays inside the page's sandbox, away from the database | in place (2026-10-06) |
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

## Privacy review — PROPOSED: expense records and receipts ([8i])

**PROPOSED DRAFT, 2026-10-07 — the design was decided the same day (single records with receipt
copies in the data folder, carried by backups; expense-records.md § 0), but nothing is built, so
nothing above this line changes yet.** The design and the options are in
[expense-records.md](expense-records.md).
If expense records are built, this section replaces the "Not stored: individual transactions" line
above for expenses, and the sentences listed in expense-records.md § 3 are reworded in the same
change.

### What would be stored

Per expense: the idea, the date, the amount and currency, who it was paid to and what for (the
person's words), an optional category the person picked, where it came from, its state and days.
If the maintainer chooses to hold them (expense-records.md § 5, smaller choices): the seller's
address and the vendor's GST/HST number, both optional and typed by the person. Optionally one
receipt file, as the person gave it. **Not stored:** a bank or card number, a login,
the spreadsheet or statement a record was read from, a category or "deductible" mark chosen by
DotAmi. In the one database file, plus (if receipts are copied) a `receipts/` folder beside it.

### What is more sensitive than a total

- **Who it was paid to.** One record can say where the person shops, which clinic, which lawyer.
  A total says none of that. A seller's address, if held, says more again.
- **A receipt can carry what DotAmi would never ask for**: the last digits of a card, the buyer's
  name and address, another person's details on a client invoice. DotAmi cannot remove them from
  a photo; the person is told on screen when adding one.
- **Files, not rows**: deleting a row in the database and deleting a file on a disk are different
  acts, and a deleted file can stay readable on the disk until it is overwritten.

### Who could reach it, and what stops them (new rows)

| Who | How | What would stop it | Status |
|---|---|---|---|
| Someone with the computer or its disk | reads `receipts/` or the database | same as above: the operating system's disk encryption; a receipt copy is not encrypted by DotAmi | the person's choice; DotAmi says so |
| Someone with a backup | opens it | the backup passphrase, which must also cover the receipts if they are carried | needs the backup change (expense-records.md § 2) |
| A receipt file crafted to attack whatever opens it | the person adds or opens it | type decided by its first bytes (not its name), a size cap before reading, DotAmi never parses it on the server, and never runs it; how it is shown (in the window or the computer's own viewer) is an open choice | proposed |
| A web page or program naming a file | tries `../` or a drive path through a receipt route | DotAmi names every stored file itself (a random id); the person's file name is kept as text only, never used as a path; the route takes an id, checks it against the database, and sits behind the Host check like every route | proposed; a test would try `../`, a drive letter and a long name |
| A model the Lens (the planned built-in agent, [9]) uses | reads receipts to propose records | the person's chosen model and permission level; a hosted model's company sees what it reads | when the Lens exists |
| Someone who finds the data after "delete" | reads leftover bytes | the database is wiped (`VACUUM`) as the "What DotAmi knows about you" page and its Delete menu ([8d]) plan; DotAmi cannot promise it for files on the disk, and says so in the Delete menu's "what I can't reach" list | proposed |

### Rules for building it (extending 1-5 above)

6. **Nothing about a record in a URL or a log.** Not the amount (rule 1), and also not who it was
   paid to, what for, the category or a receipt's file name. A record or receipt is addressed by
   its id only; logs carry events, never these values.
7. **Confirming stays the person's click** (rule 3). A record from a spreadsheet, a statement or
   the Lens is *waiting* until the agree prompt; only a record the person types may be decided
   otherwise, and that is the maintainer's choice.
8. **The server stores a receipt's bytes but never parses, opens or runs them**, and no receipt
   leaves the computer except by the person's own act or through a model they allowed. If receipts
   are copied (not just pointed to), this changes the rule above that imported files are never
   sent to the server or kept (expense-records.md § 3, rule 5).
9. **Delete removes the file with the record**, and the Delete menu names what it cannot remove.
10. **No account or card number is kept.** New in this proposal (it is not in the bank and card
    statements design, [8g], today, which keeps the bank's description text on the page only): a
    "paid to" taken from a bank row would be refused or cleaned if it holds a run of four or more
    digits. Taking any "paid to" from a bank row reverses the guarantee in
    `lib/figures/bank/types.ts:49-53` (expense-records.md § 3, rule 3).
11. **Every new table is listed in `lib/privacy/inventory.ts`** before merge; the test fails until
    it is. **A new `receipts/` folder is not caught by that test**: the folder check only confirms
    the folders already listed are still written. It has to be added by hand to `FOLDERS` there, or
    the test extended to fail on an unlisted folder (expense-records.md § 3, rule 4), so `/your-data`
    shows it.

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
