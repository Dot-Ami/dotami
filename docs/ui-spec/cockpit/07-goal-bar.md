# Goal bar and the four gauges

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/goal-bar.tsx` (words:
`lib/cockpit/words.ts`; numbers: `lib/cockpit/view.ts` `gaugeView`, from `lib/roads/` `evaluateRoad`)
Type: display + button group

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built)

## What it is

A band under the header, across the whole page, named *Your goal and gauges* for a screen reader:

- The idea's first sentence, the one typed on the front door for it, in quotes, word for word.
- A line: *your words · 2026-10-10* (the day it was typed); *Your target: $70,000 a year, before tax
  (yours, agreed 2026-10-11)* only when the person agreed to a yearly income; *Future: <road's name>*, or,
  when the road isn't written for the idea's province (nor for all of Canada), *Map drawn: <road's name> ·
  written for AB; this idea is in BC*, so a BC idea is never told its future is an Alberta one.
- Four gauge buttons, four across at any width (each at least 190 px; on a narrow window the row scrolls
  sideways, so the bar stays one row tall and the map keeps its room). Each has its name and
  a tag for where its numbers come from, a value, plain lines under it, and at most one amber invitation:

| Gauge | Tag | Value | Lines | Invitation |
|---|---|---|---|---|
| **Steps** | count | *1 of 10 marked done* | *2 doing* (when any); *next on your road: “Sole Prop activation”*, or *no step on your path is waiting* | — |
| **Skills** | your marks | *1 have · 1 learning · 1 not yet*, or *No skills are listed on this road yet* | *2 not marked, out of 5 listed*; *your own skills: 1 have · 0 learning · 0 not yet* when the person added any | *Mark them to see what each step still needs* while any is unmarked; *Add skills of your own in the list* when the road lists none and none are added |
| **Start-up money** | yours + cited | *$1,860 official fees (3 lines) · $3,400 your numbers (1 line)*; a part with no lines is left out, and with no number of the person's it reads *your numbers: not given yet*, never $0; or *No cost lines on this road yet* | *4 not priced yet*; *2 left out: not on your path*; *5 wait on a pick at “Ending”*; *savings $12,000* or *savings: not given yet*; *savings minus both: $10,200* only when road evaluation gives that difference | *Add your savings in the list* while there are none |
| **Your date** | yours | *May 2029*, or *not set* | *31 months from today* | *Add your month and year to count the months to it* while not set |

## What it does (behavior on interact)

Clicking a gauge marks it pressed (`aria-pressed`) and does the following; clicking the pressed gauge
again closes what it opened and un-presses it (the overlay it switched on stays on):

- **Steps** opens the first step of *Next on your road* in the step panel (Road is always on).
- **Skills** switches the Skills overlay on and opens the skills list in the right panel.
- **Start-up money** switches the Money overlay on and opens the money list.
- **Your date** opens the month box.

Closing the list, or picking a step on the map, un-presses it. Every save on the page (a status, a tick,
a mark, a number agreed, a month) reads back what is kept and the gauges change at once.

## Why it exists (user purpose)

The destination on top in the person's own words, and the four gaps (steps, skills, money, time) as
counts and sums, so they can see where they stand without DotAmi judging it.

## Copy (current labels)

All in `lib/cockpit/words.ts` (`goal`, `gauges`). Amounts and months through
`lib/format/money-and-months.ts`. No gauge uses a verdict word; `tests/cockpit-screen.spec.ts` runs
every sentence past *enough, ready, best, should, recommend, on track, behind*.

## State touched (field names only)

None written. Reads `PersonStatement` (the idea's first, through `GET /api/futures/<id>` `firstWords`),
`PersonFigure` (the agreed `income-wanted`, `incomeWanted`), and road evaluation's `gauges`.

## Downstream consumers (where the data goes today)

None: display only.

## Cleanup / open questions

- The yearly income target is shown when agreed, but no screen asks for it yet (the *Your destination*
  screen does).
- A step counts as done only when the person marked it done; the map's own *done* chip on stage 0 (worked
  out from its toggles) is not counted. It isn't offered as *next on your road* either, since its card
  reads *done*.

## Backend wiring

`GET /api/futures/<id>` (app/api/futures/[id]/route.ts); `/api/figures?venture=<id>` for the figures.
