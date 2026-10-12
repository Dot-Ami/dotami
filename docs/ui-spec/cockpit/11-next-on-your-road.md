# Next on your road

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/next-on-your-road.tsx`
(`lib/cockpit/view.ts` `nextOnYourRoad`)
Type: list of buttons

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built)

## What it is

A strip under the map, a region named *Next on your road*: the heading *Next on your road · the order
steps happen, not importance*, then up to three buttons, *1 · Sole Prop activation*, *2 · …*. They are the
first steps in road order (column by column, top to bottom) that are on the person's path and not done,
read the way each card's chip reads (`lib/cockpit/view.ts` `mapPlace`): the person's own status where
they set one, else the map's worked-out place. So a step is left out when the person marked it done or
not for me; when, with no status of theirs, its chip is the map's *done* (stage 0 on today's road) or *not
on your path* (the side of a fork not picked); and when road evaluation puts it off the path (grey). With
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
