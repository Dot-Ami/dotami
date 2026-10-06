# What DotAmi knows about you (`/your-data`) — page overview

Last updated: 2026-10-06 ([8d] — first slice: read-only)

**Route:** `/your-data` · **Page:** `app/(journey)/your-data/page.tsx` (server-rendered on every
visit, `force-dynamic`, like `/settings`) · **Components:** `components/your-data/` · **Reader:**
`lib/privacy/holdings.ts` · **What it lists:** `lib/privacy/inventory.ts` · **Reached from:** the
Privacy group on `/settings`.

## What it is for

One screen that lists everything DotAmi keeps about the person, counted from the data file each
time it opens — so the person can check DotAmi's word against the file instead of taking it. It
shows every figure by where it came from, counts of everything else in the file, what sits outside
the file, and what leaves the computer.

This first slice only **shows**. There is no forget button and no delete button, no write route
and no database change; the page says so itself (the last section) so it never implies one exists.

## Layout

A heading, a one-paragraph note that the page counts from the file and changes nothing, a row of
jump links, then five sections in this order:

1. **Your figures, by source** — a one-line total ("7 figures in the data file: 4 agreed · 1
   waiting · 1 taken back · 1 turned down"), a note that a figure taken back or turned down still
   has its amount stored, then one collapsed row per **source**. A source is the pair *(kind,
   name)*: a file someone named "typed by you" stays apart from the figures that were typed
   (the agree prompt groups by name alone; this page doesn't). A row shows the source's name, its
   kind (Typed by you · Read from a file · Proposed by an agent · Read from a tax return), counts
   by state, the idea or ideas it touched and the days it was proposed. Opening it lists every
   figure: what it is, the exact period, the amount, its state, "edited by you", the rows summed,
   and the days it was **proposed**, **agreed** and **taken back** (only those that happened;
   turning a proposal down isn't dated in the file). Days are the calendar day on this computer.
   An empty file says "No figures are kept."
2. **Everything else in the data file** — one card per table in the inventory: its plain name,
   how many records, what it holds, and **what takes a record out today** (including "nothing, by
   design" for statements and "nothing in the app yet" for ideas). Ideas add "N with your notes".
   Counts include everything, e.g. the turned-down figures no other screen shows.
3. **On this computer, outside the data file** — the data file's path with **Copy path**; the
   safety-copies folder and the log (desktop app only): how many files, how big, the day of the
   newest, the path with **Copy path** — only counted and dated, never opened; and the window's
   own storage (what DotAmi puts in `localStorage`/`sessionStorage`, how long it stays). A line
   pointing at disk encryption in Settings.
4. **What leaves this computer** — the intake sentence (to Anthropic only when a model key is set
   for this copy; says whether it is happening here, links Anthropic's own retention page when it
   is, and that DotAmi can't take it back), the desktop update check (GitHub sees the computer's
   address and the version), and files the person saves themselves (DotAmi doesn't know where
   they are). Each says when, what, and whether it can be taken back.
5. **Taking things out** — what the person can do today (retract an agreed figure, discard a
   waiting one, remove a link between two ideas) and what nothing in DotAmi can do yet (erase a figure, a
   statement or an idea).

When the data file can't be read the page says so in one amber line and shows nothing else, and
logs only the error's name and code.

| Control | Behaviour | Persists to |
|---|---|---|
| Jump links | in-page anchors to each section | — |
| A source row (`<details>`) | opens and closes with Enter/Space or a click; no script | — |
| **Copy path** (data file, safety copies, log) | copies the path; "Copied", or "Copy failed — select it instead" | — |
| ← Settings, the Settings → links | plain links | — |

## What it deliberately does not do

- **No forget, no delete, no write.** "Forget this source" and "Delete everything" come in later
  slices; each needs maintainer rulings first (what "everything" covers, whether statements may
  be deleted — `prisma/schema.prisma` `PersonStatement` says they can't — and where the wipe
  runs). This page must not grow a control for either without them.
- **No query string, no amounts in a URL** (privacy review, rule 1): the page takes none, and the
  source names it shows are text on the page, never links.
- **No figure value in any log** (rule 2): a failed read logs the error's name and code only.
- Never summarises the person's words into a profile; statements are only counted here.
- Never opens a backup or the log: it reads their names, sizes and dates.

## Kept in step

`lib/privacy/inventory.ts` is the list the page is drawn from, and `tests/privacy-inventory.spec.ts`
fails when `prisma/schema.prisma` gains a model, or any code under `app/`, `components/` or `lib/`
uses a browser-storage key (or a new kind of storage, or a new request out of the computer), that
the inventory doesn't list. `tests/privacy-holdings.spec.ts` checks the reader's counts, grouping
and dates on a throwaway database. `tests/error-logging.spec.ts` checks the log claim in section 3
for DotAmi's own routes, and `tests/prisma-log.spec.ts` checks it for the database library: it runs a
write built wrongly on purpose, in its own process, and fails if anything on stdout or stderr
(which the desktop app copies into the log) holds the values the write carried.

The database library's own error report can quote those values, so `lib/prisma.ts` switches it off
and prints one fixed line naming only the part of the database code that reported the error. The log
entry says so.

## Covered by

`e2e/your-data.spec.ts` (written; it runs in CI and has not been run anywhere yet): a typed and
agreed figure appears under "typed by you" with its agreed day; the response is
`Cache-Control: no-store`; no amount in any URL; every inventory table and window key is on the page;
reached from Settings → Privacy; read-only (no form controls, no delete or forget button); no
sideways scroll at 390 px wide.

Checked by hand on 2026-10-06 against the production build and a scratch database (seven invented
figures across two ideas): the response header is `Cache-Control: private, no-cache, no-store,
max-age=0, must-revalidate`; the page lists the four states, both ideas of a shared file, a file
named "typed by you" apart from the typed figures, and the turned-down figure; at 375 px wide the
page does not scroll sideways.
