# Privacy review — before the figures store ([8a])

Status: 2026-10-06. Required by [8a] before the first figure is stored: the figures (revenue,
income, the price of a big purchase) are the most sensitive thing DotAmi will hold. Plan of record:
[use-cases.md § What the back end stores](use-cases.md#what-the-back-end-stores).

## What will be stored

Confirmed totals only, each with: what it is, the period or date, the amount and currency, where it
came from (a source name, the file name, how many rows were summed), who confirmed it and when.
**Not stored:** individual transactions, the imported files, bank or card numbers ([8g]), login
details for anything. All of it in the one database file on the person's computer.

## Who could reach it, and what stops them

| Who | How | What stops it | Status |
|---|---|---|---|
| Someone with the computer or its disk | reads the database file | the operating system's disk encryption — the settings page says how (Windows Device encryption on Home, BitLocker on Pro, FileVault on a Mac) | the person's choice; DotAmi says so |
| Someone with a backup file | opens it | a backup passphrase (AES-256-GCM, [7c]) | the person's choice; the warning is shown |
| A website the person visits — a write | a page fires a request at DotAmi's local address | cross-site writes and non-JSON writes refused (`lib/api/body-limit.ts`, 2026-09-20); the browser's CORS rules block other methods | in place |
| A website the person visits — DNS rebinding | the page re-points its own domain at 127.0.0.1, then reads and writes as if DotAmi were its own site | **was open:** `GET /api/ventures` with `Host: evil.example` returned every venture (2026-10-06). **Fixed:** every request whose Host isn't this computer's own name is refused with 421 (`lib/http/allowed-host.ts`, `middleware.ts`), prefetches included | fixed; `e2e/app.spec.ts` "DNS rebinding guard" fails on the old code (200) and passes now |
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
