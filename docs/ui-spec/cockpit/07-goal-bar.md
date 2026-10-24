# Goal bar and the four gauges

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/goal-bar.tsx` (words:
`lib/cockpit/words.ts`; numbers: `lib/cockpit/view.ts` `gaugeView`, from `lib/roads/` `evaluateRoad`)
Type: display + button group

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built; the same
day, **Fold goal and gauges** folds the bar to one line that keeps the four gauges as buttons, name and value
only, with **Show goal and gauges**; remembered in this browser, [12-folding-and-phone.md](./12-folding-and-phone.md);
and an idea with no first sentence, such as one picked on *Pick a future*, shows the person's newest destination
from *Your destination* in its place, with its day: *where you want to be · your words · <day>*;
`GET /api/futures/<id>` gives it as `destination`)

> **Changed 2026-10-12 — part 2.** After the future's name, on a road with a fork, a **Compare** button opens *Compare the two endings* in the right-hand panel ([15-compare.md](./15-compare.md)).
>
> **Changed 2026-10-13 — the maintainer's answer to PR #159's question 1.** The **Compare** button shows only on a road with a fork whose own pick, not the rules, puts steps on or off the path (`lib/cockpit/told.ts` `forksToCompare`): today the apprentice road, not today's Alberta road (road 0), where a toggle moves steps only through the tax rules, which colour the sides whichever is picked, so both columns' counts would come out the same. With none, there is no button.
>
> **Changed 2026-10-17 — Others in this line of work.** After *Compare* (or after the future's name where Compare isn't offered), on every road, a button **Others in this line of work** opens that panel in the right-hand slot ([landscape.md](./landscape.md)). It is on the open bar only; the folded bar keeps the gauges alone.
>
> **Changed 2026-10-17 — Look closer (the calm first view, S2.5.30c).** *Compare* and *Others in this line of work* are no longer buttons of their own: they are the items of one **Look closer ▾** menu button after the future's name, the same place, in that order (*Compare the two endings* only where it was offered before). *About this job* joins the menu when it is built ([research-kit.md](../../architecture/research-kit.md) § 4.2). It is a WAI-ARIA menu button (`components/cockpit/look-closer-menu.tsx`): `aria-haspopup="menu"` and `aria-expanded`; Enter, Space or the down arrow opens it on its first item, the up arrow on its last; the arrows, Home and End move between items; Enter or Space picks one, which opens it in the right-hand panel; Escape closes the menu and puts focus back on the button; Tab or a click elsewhere closes it. Closed, its items aren't drawn. On a road with nothing to look closer at there is no button. The bar sits under the header in one strip with it, the header's background behind both; it is still a region of its own for the clutter limit.
>
> **Changed 2026-10-20 — Look closer shows the folded legend and what-if bar (the maintainer's pick).** After the panel's items the menu lists **Show the legend** and **Show the what-if bar** while each is folded (both are on a first visit), in place of the button each had at the end of *Next on your road*: Mara's example at 1280 × 720 counted 23 controls against a limit of 21 with those buttons in view, and the limits only go down. Picking one shows it and moves focus to its fold button; folding it again moves focus back to **Look closer** (without scrolling the page, which on a phone would jump back up from the map). The folded bar's one line carries the menu too, after the gauges, with all its items, so neither is ever more than the menu away, and *Compare* and *Others in this line of work* are now reachable from the folded bar as well (until now they were on the open bar only, as the note above says). On a road with no panel item the menu is still drawn while something is folded under the map.

## What it is

A band under the header, across the whole page, named *Your goal and gauges* for a screen reader:

- The idea's first sentence, the one typed on the front door for it, in quotes, word for word.
- On the invented example (since 2026-10-14) the target line says what the number is when it is a published
  statistic, in place of *agreed*: *Mara's target: $52,255 a year, before tax: the average yearly salary of
  employed cabinetmakers in Alberta (alis, Government of Alberta) (2023 Alberta Wage and Salary Survey)*
  (`targetFrom`; docs/ui-spec/example/_index.md).
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
| **Skills** | your marks | *1 have · 1 learning · 1 not yet*, or *No skills are listed on this road yet* | *2 not marked, out of 5 listed*; *your own skills: 1 have · 0 learning · 0 not yet* when the person added any; *your pick of job: 1 have · 0 learning · 0 not yet, of 44 listed* when the person picked a job (2026-10-12) | *Mark them to see what each step still needs* while any is unmarked; *Add skills of your own in the list* when the road lists none and none are added |
| **Start-up money** | yours + cited | *$1,860 official fees (3 lines) · $3,400 your numbers (1 line)*; a part with no lines is left out, and with no number of the person's it reads *your numbers: not given yet*, never $0; or *No cost lines on this road yet* | *1 official fee applies only sometimes, not added up* (an `onlyIf` fee, in neither part); *4 not priced yet*; *2 left out: not on your path*; *5 wait on a pick at “Ending”*, and since 2026-10-23 with the official fees among them named, *21 wait on a pick at “Stay employed or open your own shop”, 2 official fees among them ($150)*, so on a road whose endings carry the same waiting fees (the apprentice road today) the gauge's fees plus those are what Compare shows for an ending (review 30f, gap 17), and on one whose endings carry different fees they add both sides' fees, more than any one ending reaches; *savings $12,000* or *savings: not given yet*; *savings minus both: $10,200* only when road evaluation gives that difference | *Add your savings in the list* while there are none |
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
