# Next on your road

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/next-on-your-road.tsx`
(`lib/cockpit/view.ts` `nextOnYourRoad`)
Type: list of buttons

Last updated: 2026-10-23 (only the person's own Done counts as done); 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built)

> **Changed 2026-10-12 — part 2.** Above it, under the map: the what-if bar ([14-what-if-bar.md](./14-what-if-bar.md)) and, once an answer was given this visit, *Since last time* ([13-receipts.md](./13-receipts.md)).

> **Changed 2026-10-17 — the calm first view (S2.5.30c).** The line is the foot of the road's column, still a region of its own for the clutter limit. After the steps it carries **Show the legend** and **Show the what-if bar** while those are folded (both are on a first visit), under the map where they were ([12-folding-and-phone.md](./12-folding-and-phone.md)).

> **Changed 2026-10-19 — the type scale's review (S2.5.30d).** From 1024 px those buttons sit at the right of the heading, and the steps have the row under it to themselves. With the steps at body size (13 px), three long step names filled the row and pushed the buttons to a line of their own below it: on Mara's example at 1280 × 720 that line was under the window's edge, 5 px of the buttons showing. Below 1024 px the line wraps as before (heading, steps, buttons). The page's order is unchanged either way, so a keyboard reaches the steps before the buttons.

> **Changed 2026-10-20 — the buttons moved to Look closer (the maintainer's pick).** With both buttons back in view, Mara's example at 1280 × 720 counted 23 controls on its first screen against its limit of 21, and the limits only go down. **Show the legend** and **Show the what-if bar** are now items of the goal bar's **Look closer** menu ([07-goal-bar.md](./07-goal-bar.md)), listed while each is folded: two controls fewer on every road's first view on a tablet or a laptop (on a phone they were under the window's edge already). The line keeps, at the right of its heading from 1024 px, only *Your what-if, not a forecast* and its number while the what-if bar is folded and a what-if is on, with nothing to press.

> **Changed 2026-10-23 — nothing is done until the person marks it (the pre-release review).** The map's own lists put *Employee/Apprentice baseline* first on every idea, and its chip said *done*, so this list left it out and started at the first *before you open* step. Its chip now says *starting point*, and only the person's own **Done** counts: on today's road with nothing marked the list reads *1 · Employee/Apprentice baseline*, *2 · Register your business name, if you use one*, *3 · Look up your permits and licences (BizPaL)* (`lib/cockpit/view.ts` `doneOnMap`; `e2e/cockpit.spec.ts`).

## What it is

A strip under the map, a region named *Next on your road*: the heading *Next on your road · the order
steps happen, not importance*, then up to three buttons, *1 · Employee/Apprentice baseline*, *2 · …* on
today's road before anything is marked. They are the first steps in road order (column by column, top to
bottom) that are on the person's path and not marked done, read the way each card's chip reads
(`lib/cockpit/view.ts` `mapPlace`): the person's own status where they set one, else the map's
worked-out place. So a step is left out when the person marked it done or not for me; when, with no
status of theirs, its chip is the map's *not on your path* (the side of a fork not picked); and when road
evaluation puts it off the path (grey). Only the person's own **Done** counts as done: the map's *starting
point* (stage 0 on today's road, which the map's lists put first on every idea) is listed like any other
step until the person marks it done (2026-10-23; until then its chip said *done* and it was left out). With
none: *No step on your path is waiting.*

## What it does (behavior on interact)

Clicking one opens it in the step panel. The list changes as soon as a status is saved.

## Why it exists (user purpose)

What comes next, in the order the road runs, without DotAmi ranking anything.

## Copy (current labels)

`lib/cockpit/words.ts` (`next`).

## State touched (field names only)

None.

## Downstream consumers (where the data goes today)

The Steps gauge's *next on your road* line uses the first one.

## Cleanup / open questions

None yet.

## Backend wiring

None: from road evaluation in the browser.
