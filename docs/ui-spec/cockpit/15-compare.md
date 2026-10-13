# Compare the two endings · This is mine

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/compare-endings.tsx` (words:
`lib/cockpit/words.ts` `compare`; rows: `lib/cockpit/told.ts` `compareEndings`)
Type: panel (table + toggle buttons)

Last updated: 2026-10-13 (offered only where a pick changes the road; docs/architecture/future-cockpit.md § 2, Cockpit screen as built, part 2)

> **Changed 2026-10-13 — the maintainer's answer to PR #159's question 1.** Compare is offered only at a
> fork whose pick changes the road: `lib/cockpit/told.ts` `forksToCompare` runs road evaluation once
> with each side picked (without the person's step statuses and without the what-if) and keeps a fork
> when some step's state differs between the two runs because of that fork's pick. It reads the road's
> own steps, never a list of road ids. Today that is the apprentice road's fork and neither of today's
> Alberta road's two forks (road 0), whose steps the rules colour whichever side is picked, so Compare
> would show two columns of the same numbers there. Where no fork is offered there is no **Compare**
> button on the goal bar and no **Compare the endings** in the step panel at all, not a button that does
> nothing; on road 0 the pick is made on the map's toggle, in the step panel's toggle, or in the
> one-question box.

## What it is

Opened in the right-hand panel, in place of a step or a list, as a region named *Compare the two
endings* with a × button named *Close*. Opened from **Compare** on the goal bar, **Compare the endings**
in the step panel at a fork, or a *Not told yet* ending row, each only at a fork Compare is offered at
(above).

- With more than one fork offered on the road, a row of buttons names each in road order (pressed = shown).
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

- Under each column, **This is mine**, named for a screen reader with its side (*This is mine: Open
  your own shop*). No score, no total, no badge and no highlighted column: both columns are drawn the
  same; only which **This is mine** is pressed differs.
- On road 0 each column head also gives the map toggle's own short name for that side (*on the map:
  “Voluntary now”*), as the step's name and the toggle's differ. Since 2026-10-13 road 0 offers no
  Compare, so this line is not reached today; it stays for a road 0 fork that one day changes the road.
- When no row differs between the two sides: *None of these rows differ between the two endings today.*
  (Not reached through the offer rule today either, which leaves out forks whose steps don't change; it
  stays for a fork whose steps change but whose counted rows happen not to.)
- Worked out without the what-if (2026-10-12, after review): a what-if relights the rules and tax cards
  on both sides alike, and this panel carries no what-if banner.

## What it does (behavior on interact)

- **This is mine**: on road 0 (not offered there today, above), sets the map's toggle for that fork, on either side, the default side
  included, which is kept as the person's pick (key `decided`) and reads *Your pick* after a reload (saved with the map, as the toggle
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
- A *Not told yet* ending row (roads other than road 0) opens Compare on its fork whether or not the
  offer rule keeps that fork. No written road has such a fork today: on any road but road 0 a pick puts
  one side's steps off the path.

## Backend wiring

`app/api/futures/[id]/ending/route.ts` (`lib/futures/future.ts` `pickEnding`); `/api/scenario/save`.
