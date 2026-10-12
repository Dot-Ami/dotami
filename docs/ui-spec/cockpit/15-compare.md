# Compare the two endings · This is mine

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/compare-endings.tsx` (words:
`lib/cockpit/words.ts` `compare`; rows: `lib/cockpit/told.ts` `compareEndings`)
Type: panel (table + toggle buttons)

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built, part 2)

## What it is

Opened in the right-hand panel, in place of a step or a list, as a region named *Compare the two
endings* with a × button named *Close*. Opened from **Compare** on the goal bar, **Compare the endings**
in the step panel at a fork, or a *Not told yet* ending row.

- With more than one fork on the road, a row of buttons names each fork in road order (pressed = shown).
- One line: whose pick stands: *Your pick: “…”*, *The map's default pick: “…”, not yours yet* (road 0),
  or *No side picked yet*.
- *In the order the road shows them.*
- A table: a column per side, headed with the side's step name; the same rows in both, each a count or
  a sum from road evaluation run with that side picked:

| Row | Example |
|---|---|
| Steps on your path | 12 |
| Not marked done | 11 |
| Not on your path | 3 |
| Skills listed on your path | 2 have · 0 learning · 1 not yet · 2 not marked |
| Legal requirements among them | 1 |
| Official fees | $1,860 (3 lines), or *none* |
| Your numbers | $3,400 (1 line), or *not given yet* |
| Not priced yet | 4 lines |
| Official fees that apply only sometimes | 1 line, not added up |
| Rules and tax cards | 6 apply · 2 check first |

- Under each column, **This is mine**. No score, no total, no badge and no highlighted column: both
  columns are drawn the same; only which **This is mine** is pressed differs.

## What it does (behavior on interact)

- **This is mine**: on road 0, sets the map's toggle for that fork (saved with the map, as the toggle
  on the map does); on any other road, `POST /api/futures/<id>/ending { forkId, stepId }`. Then the
  receipt shows in the panel. Pressing the pressed one again does nothing; an ending is taken back from
  *What you've told DotAmi*.
- A refusal shows at the top in the server's words; an idea not saved yet has the buttons off.

## Why it exists (user purpose)

To see the two endings of a fork next to each other on the same rows and pick one, without DotAmi saying
which is better.

## Copy (current labels)

`lib/cockpit/words.ts` `compare`.

## State touched (field names only)

`ScenarioState.activeBranches` (road 0, through the map's save); `Venture.forkPicks` (other roads).

## Downstream consumers (where the data goes today)

Road evaluation (step states, money sums, which steps are on the path); *What you've told DotAmi*.

## Cleanup / open questions

- The person's target and what-if rows are left out: neither changes with the ending, and no screen asks
  for the target yet.

## Backend wiring

`app/api/futures/[id]/ending/route.ts` (`lib/futures/future.ts` `pickEnding`); `/api/scenario/save`.
