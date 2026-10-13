# Your destination — page overview

Page: `/start` · Component: `components/front-door/destination-page.tsx` (questions:
`lib/front-door/questions.ts`; receipts: `lib/front-door/receipts.ts`; words: `lib/front-door/words.ts`)

Last updated: 2026-10-12 (built; the maintainer's decision 6 of 2026-10-11; design:
docs/architecture/future-cockpit.md § 1, The way in as built)

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

`useJourney()` — the tab's journey draft gains `destination` (the answers so far: the destination's
words and how they were kept, the *business / career / both* choice, the place code, and what the income
question came to). It is kept in the tab only (`dotami-journey-v3`, sessionStorage); the destination
and the income are also in the data file as soon as they are kept.
