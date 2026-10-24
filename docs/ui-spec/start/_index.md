# Your destination — page overview

Page: `/start` · Component: `components/front-door/destination-page.tsx` (questions:
`lib/front-door/questions.ts`; receipts: `lib/front-door/receipts.ts`; words: `lib/front-door/words.ts`)

Last updated: 2026-10-24 (the answers held in the window's memory, which the example keeps and a reload, a new
window or the desktop app's Go menu empties, and the words that say so; built 2026-10-12, the maintainer's
decision 6 of 2026-10-11; design: docs/architecture/future-cockpit.md § 1, The way in as built)

## Page job

Get where the person wants to end up, one question at a time, and pay off each answer with a one-line
receipt saying what it changed. Reached from the front door's first door, *Start from where I want to
be*. Next: *Pick a future* (`/futures`).

## Layout

- Top nav: **← Back** (`/`), the word mark, and *Your destination · question n of 4* (or *4 of 4
  answered* at the end).
- One column: every answered question, each with the answer shown back, its receipt and **Change**;
  under them, the one question being asked; at the end, **Pick a future →**.

## Controls

| Group | File |
|---|---|
| The four questions, their receipts and Change | [01-questions.md](./01-questions.md) |
| The agree prompt for the yearly income | [02-income-agree-prompt.md](./02-income-agree-prompt.md) |
| **Pick a future →** | shown once the place is answered and the income question answered or skipped; opens `/futures` |

## Page-level state

`useJourney()` — the journey draft gains `destination` (the answers so far: the destination's
words and how they were kept, the *business / career / both* choice, the place code, and what the income
question came to). It is held in the window's memory only, never in its storage (since 2026-10-24,
`lib/journey/held-journey.ts`; from 2026-10-12 to 2026-10-23 it was also written to the tab's
`sessionStorage`, `dotami-journey-v3`); the destination and the income are also in the data file as soon
as they are kept, and business-or-career and the place with each future picked.

That memory outlives the journey's own pages: the answers are still there when the person moves between
DotAmi's pages, *Show me an example first* and back included. A page loaded afresh (a reload, a new window, or
the desktop app's Go menu, which opens its pages with `loadURL`) starts it empty, and `/start` reads only 1 and
4 back from the data file (`lib/front-door/kept.ts`), so 2 and 3 are asked again, a future picked or not. The
words say so where an answer is not kept: the line under the receipts of 2 and 3, and the no-database receipt
of 1 ([01-questions.md](./01-questions.md)).

Delete on *What DotAmi knows about you* takes from that memory what it takes from the data file: the words with
*Your statements*, the income with *The yearly income you said you want*, all four answers with *Your ideas*
(`lib/journey/window-storage.ts` `intakeAfterDelete`; [../your-data/delete-menu.md](../your-data/delete-menu.md)),
so `/start` never shows back an answer the data file no longer holds.
