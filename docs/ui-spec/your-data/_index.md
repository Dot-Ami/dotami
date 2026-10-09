# What DotAmi knows about you (`/your-data`) — page overview

Last updated: 2026-10-09 ([8i] — how the receipt files are kept, and the key's file; Start a new key while the key can't be opened; 2026-10-08: [8h] — the "Books / file" kind; [8d] — the Delete menu, and its safety-copies box and unfinished-wipe note; deleting ideas keeps their expense records, "not attached yet", and the menu says how many before you confirm; first slice read-only 2026-10-06; a card for expense records, [8i])

**Route:** `/your-data` · **Page:** `app/(journey)/your-data/page.tsx` (server-rendered on every
visit, `force-dynamic`, like `/settings`) · **Components:** `components/your-data/` · **Reader:**
`lib/privacy/holdings.ts` · **What it lists:** `lib/privacy/inventory.ts` · **Reached from:** the
Privacy group on `/settings`.

## What it is for

One screen that lists everything DotAmi keeps about the person, counted from the data file each
time it opens — so the person can check DotAmi's word against the file instead of taking it. It
shows every figure by where it came from, counts of everything else in the file, what sits outside
the file, and what leaves the computer.

It **shows**, and it has one control that changes anything: **Delete**, in the last section, which
erases whole kinds of data from the file after asking twice ([delete-menu.md](delete-menu.md)). There
is no forget-a-source button yet.

## Layout

A heading, a one-paragraph note that the page counts from the file and changes nothing unless Delete
is used, a row of
jump links, then five sections in this order:

1. **Your figures, by source** — a one-line total ("7 figures in the data file: 4 agreed · 1
   waiting · 1 taken back · 1 turned down"), a note that a figure taken back or turned down still
   has its amount stored, then one collapsed row per **source**. A source is the pair *(kind,
   name)*: a file someone named "typed by you" stays apart from the figures that were typed
   (the agree prompt groups by name alone; this page doesn't). A row shows the source's name, its
   kind (Typed by you · Read from a file · Proposed by an agent · Read from a tax return ·
   Books / file), counts
   by state, the idea or ideas it touched and the days it was proposed. Opening it lists every
   figure: what it is, the exact period, the amount, its state, "edited by you", the rows summed,
   and the days it was **proposed**, **agreed** and **taken back** (only those that happened;
   turning a proposal down isn't dated in the file). Days are the calendar day on this computer.
   An empty file says "No figures are kept."
2. **Everything else in the data file** — one card per table in the inventory: its plain name,
   how many records, what it holds, and **what takes a record out today** (including "nothing, by
   design" for statements and "nothing in the app yet" for ideas). Ideas add "N with your notes".
   Counts include everything, e.g. the turned-down figures no other screen shows. "Your settings"
   (added 2026-10-07, [8e]) counts the saved choices — one record per setting that has been
   changed, so 0 until the first tick or switch — and says that unticking or turning a switch off
   overwrites the choice but leaves the record in the file. "Your expense records" (added 2026-10-07,
   [8i]) counts every single business expense in the file (typed, or proposed by an agent; waiting,
   agreed, taken-back and turned-down ones alike), 0 until the first one is proposed. It says what a record holds (never a bank or card
   number, no receipt file; since 2026-10-08 also the idea or none, the person's own business share, the GST/HST part and how a refund is kept), that taking one back or turning one down keeps the row, and that nothing in the app erases a single record yet. Only the count is shown here: no payee, no words, no amount.
   "Your bank and card accounts" (added 2026-10-08, [8g]) counts the accounts in the file, in use and
   taken back; it shows no name (Settings lists them) and says Take back leaves the row until Delete.
3. **On this computer, outside the data file** — the data file's path with **Copy path**; the
   safety-copies folder and the log (desktop app only): how many files, how big, the day of the
   newest, the path with **Copy path** — only counted and dated, never opened (the log's row says
   what it holds, including that a start that fails writes DotAmi's message, which can name the
   data folder, with the error's name and code, and that a failed database update adds the
   database's words about which update failed and what it objected to); and the window's
   own storage (what DotAmi puts in `localStorage`/`sessionStorage`, how long it stays). A row for
   the "wipe pending" note Delete leaves beside the data file while a wipe is still owed ("None: no
   wipe is owed." when it isn't there). A line pointing at disk encryption in Settings. The receipts folder's row ([8i], 2026-10-09) also says
   whether this copy encrypts receipt files (the same sentences as Settings,
   `lib/expenses/receipts/protection.ts`, amber when the key can't be opened, with **Start a new key…**
   under it then, the same control and the same two asks as on Settings, `docs/ui-spec/settings/_index.md`;
   afterwards, until the restart, the amber "DotAmi starts a new key…" line with the folder) and counts the files by
   how they are kept, read from the first few bytes of each and nothing more ("N of M receipt files
   encrypted with this computer's key.", any not encrypted yet, any locked with a key this computer
   can't open); its footnote says those first bytes were read. A row for **the key to your receipt
   files** (`receipts.key`, desktop app only): what it is, that the key itself is written nowhere else,
   and that losing it, or the Windows profile that opens it, loses the receipts except those in a
   backup.
4. **What leaves this computer** — the intake sentence (to Anthropic only when a model key is set
   for this copy; says whether it is happening here, links Anthropic's own retention page when it
   is, and that DotAmi can't take it back), the desktop update check (GitHub sees the computer's
   address and the version), and files the person saves themselves (DotAmi doesn't know where
   they are). Each says when, what, and whether it can be taken back.
5. **Taking things out** — what the person can do elsewhere (retract an agreed figure, discard a
   waiting one, remove a link between two ideas), a line saying Delete erases whole kinds of data and
   can't pick out a single one, then the **Delete** button and its menu
   ([delete-menu.md](delete-menu.md)). The table cards in section 2 say, in "What takes it out", which
   box on the menu removes them.

When the data file can't be read the page says so in one amber line and shows nothing else, and
logs only the error's name and code.

| Control | Behaviour | Persists to |
|---|---|---|
| Jump links | in-page anchors to each section | — |
| A source row (`<details>`) | opens and closes with Enter/Space or a click; no script | — |
| **Copy path** (data file, safety copies, log) | copies the path; "Copied", or "Copy failed — select it instead" | — |
| ← Settings, the Settings → links | plain links | — |
| **Delete** and its menu, two asks, result | see [delete-menu.md](delete-menu.md) | deletes rows from the data file, and DotAmi's safety copies when ticked, and wipes it (`POST /api/your-data/delete`) |
| **Finish it now** (only while an earlier Delete's wipe is owed) | see [delete-menu.md](delete-menu.md) | finishes the wipe and the owed safety copies (`POST /api/your-data/delete`, `retryWipe`) |

## What it deliberately does not do

- **No forget, and no delete of a single thing.** "Forget this source" waits on where a figure's
  source is kept (a later decision). Delete works on whole kinds of data only: statements are
  deleted all at once or not at all (the maintainer's decision, 2026-10-07), and there is no
  delete-one-idea or delete-one-figure control here.
- **Delete doesn't clear the window's earlier leftovers yet.** The menu says so in plain words; how
  to reach what the desktop window stored in earlier launches is a later decision. The safety copies
  in the backups folder have their own box (2026-10-08).
- **No query string, no amounts in a URL** (privacy review, rule 1): the page takes none, and the
  source names it shows are text on the page, never links.
- **No figure value in any log** (rule 2): a failed read logs the error's name and code only.
- Never summarises the person's words into a profile; statements are only counted here.
- Never opens a backup or the log: it reads their names, sizes and dates.

## Kept in step

`lib/privacy/inventory.ts` is the list the page is drawn from, and `tests/privacy-inventory.spec.ts`
fails when `prisma/schema.prisma` gains a model, or any code under `app/`, `components/` or `lib/`
uses a browser-storage key (or a new kind of storage) that the inventory doesn't list. It also
fails when a package ships that the inventory's dependency list doesn't name with whether it can
reach the network (a package in `package.json` "dependencies", one `desktop/package.mjs` copies into
the installer, or one imported by a file under `app/`, `components/` or `lib/`, or by `middleware.*`
or `instrumentation*.*` in the top folder, which Next bundles even when `package.json` lists it only
under devDependencies; only the packages DotAmi names, not the ones those pull in), when a file
imports a package `package.json` doesn't declare, and when a source file makes one of the requests
below that the inventory doesn't list.

**What the request check catches.** It reads the syntax tree of every `.ts`, `.tsx`, `.mts`,
`.cts`, `.js`, `.jsx`, `.mjs` and `.cjs` file under `app/`, `components/`, `lib/` and `desktop/` and
in the repo's top folder (`middleware.ts`, `next.config.mjs`, `instrumentation.ts` and the rest),
and refuses, unless that one call is listed with a reason: `fetch`, `fetchLater`, `sendBeacon`,
`XMLHttpRequest`, `WebSocket`, `EventSource`, `WebTransport` and `WebSocketStream` whose address
isn't one literal `/…` path on DotAmi's own server (also through the helper `postJson`, however it
is imported, renamed, re-exported or reached through a namespace); `RTCPeerConnection` (WebRTC)
always; those names handed on or looked up by a string or a computed key; node's `http`, `https`,
`http2`, `tls`, `dgram` and `dns` (any import) and every call into node's `net` and `child_process`
(`child_process.spawn("python"` is one line, a second call is another); electron's `net` and
`autoUpdater`, every `loadURL`, `loadFile` and `downloadURL`, `session.fetch`, `session.preconnect`
and `session.resolveHost`, and `crashReporter.start` (it uploads crash dumps to an address); and any
import, by package name (a subpath counts), of a package on the scan's own fixed list of HTTP-client,
update and analytics packages or that the dependency list marks "yes" or "unverified". A package on
neither list is not refused for being imported. A name written with an escape, a module named by a
template or by joined strings, `require` reached through `createRequire`, and `fetch` called through
`.call`/`.bind` are read as what they are. `XMLHttpRequest`'s `.open` is read only in a file that
itself spells `XMLHttpRequest`.

**What it does not catch.** A request a package makes inside its own code (Next.js, Prisma, React,
electron-updater: only the import is seen). Deliberate disguises: a copy of `window` under another
name, code run from a string (the global `eval`, the `Function` constructor, electron's
`webContents.executeJavaScript`), workers, node internals. An `XMLHttpRequest` made by a helper in
one file and opened in another. Anything that makes the page load an address
instead of calling a function: a `<script src>`, `new Image().src`, a link or form, `window.open`,
`location`, `shell.openExternal`. Next.js settings that make the server fetch for a page
(`rewrites`, `NextResponse.rewrite`). Folders outside those above (`scripts/`, `prisma/`, `tests/`,
`e2e/`, `e2e-desktop/`: the inventory lists each with a reason, and the test fails on a new one such
as `pages/` or `public/`, and on any file that imports code from one); HTML and CSS files; and what
a program the app starts then does (the statute store's script). The browser-storage check above
still reads text, so a quote inside a regular expression could hide a key written after it.

**What stands behind it.** (1) GitHub's Dependency review check on a pull request: it fails a change
that adds a package with a known high or critical vulnerability or a licence the project can't
ship, it does not look at what a package does on the network, and it runs only while the repository
variable `DEPENDENCY_REVIEW` is `on`. (2) In the browser, the Content-Security-Policy in
`middleware.ts`: `connect-src 'self'` stops fetch, `fetchLater`, XMLHttpRequest, sendBeacon,
WebSocket and EventSource reaching another address, `img-src 'self' blob: data:` stops images,
`default-src 'self'` covers frames and media, and `form-action 'self'` stops a form posting
elsewhere. It does not stop WebRTC (`connect-src` doesn't govern it and no `webrtc` directive is
set), is not known to stop WebTransport or WebSocketStream, doesn't stop navigation (`window.open`,
links), can't stop a script that a running script adds (`script-src` carries `'strict-dynamic'`),
and covers nothing that runs on the server or in the desktop app's main process. A worker started
from one of DotAmi's own script files (the return reader's) follows that file's policy instead,
set in `next.config.mjs` on `/_next/static/`: `default-src 'none'; script-src 'self'`, so it
connects nowhere at all. (3) Code review.
The full lists are in the header of `tests/helpers/source-scan.ts`, and a test there pins each
thing the scan misses.

`tests/privacy-holdings.spec.ts` checks the reader's counts, grouping
and dates on a throwaway database. `tests/error-logging.spec.ts` checks the log claim in section 3
for DotAmi's own routes, and `tests/prisma-log.spec.ts` checks it for the database library: it runs a
write built wrongly on purpose, in its own process, and fails if anything on stdout or stderr
(which the desktop app copies into the log) holds the values the write carried.

The database library's own error report can quote those values, so `lib/prisma.ts` switches it off
and prints one fixed line naming only the part of the database code that reported the error. The log
entry says so.

## Covered by

`e2e/your-data.spec.ts`: a typed and agreed figure appears under "typed by you" with its agreed day;
the response is `Cache-Control: no-store`; no amount in any URL; every inventory table and window key
is on the page; reached from Settings → Privacy; until Delete is opened there are no form controls and
no forget button; no sideways scroll at 390 px wide; and the Delete menu's main path (see
[delete-menu.md](delete-menu.md)). `tests/privacy-delete.spec.ts` covers what each box deletes, the
one transaction, the count check and the wipe (a byte scan of the file).

Checked by hand on 2026-10-06 against the production build and a scratch database (seven invented
figures across two ideas): the response header is `Cache-Control: private, no-cache, no-store,
max-age=0, must-revalidate`; the page lists the four states, both ideas of a shared file, a file
named "typed by you" apart from the typed figures, and the turned-down figure; at 375 px wide the
page does not scroll sideways.
