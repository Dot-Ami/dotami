# The three doors

Page: Landing (`/`) · Component: `components/discovery/landing-page.tsx` (words:
`lib/front-door/words.ts`)
Type: link + embedded entry box + display

Last updated: 2026-10-12 (built; the maintainer's decision 6 of 2026-10-11, "the front door leads with
the dream"; design: docs/architecture/future-cockpit.md § 1, The way in as built)

## What it is

The page's headline and three doors under it, one list (`role="list"`, each door a list item with its
own heading), in this order. Side by side on a wide window, one under the other on a narrow one. The page is
exactly the window less the shared footer and scrolls inside when the doors don't fit, so the disclaimer
footer stays in the window (the same goes for `/start` and `/futures`).

| Door | Heading (level 2) | What is in it |
|---|---|---|
| 1, the main one | **Start from where I want to be** | One line on what it does, *"What you type here stays on this computer."*, and the link **Start here →** (`/start`). Drawn with the accent border. |
| 2 | **I already have an idea** | One line, then today's box, **Map it →** and the three example chips, exactly as before ([01-free-text-entry.md](./01-free-text-entry.md), [02-example-chips.md](./02-example-chips.md)). |
| 3 | **Show me an example first** | *"Coming: a filled-in future for an invented person, clearly labelled. It isn't written yet."* and a muted *Not written yet* tag. No link and no button: nothing is clickable in it. |

Headline (level 1): *"See the road to the work and life you want."*; under it *"Every step, skill and
start-up cost, with its sources."*

## What it does (behavior on interact)

- **Start here →** opens `/start` (*Your destination*). It doesn't reset the tab's journey, so answers
  already given in this tab are still there.
- Door 2 behaves as the box always has: **Map it →** resets the tab's journey, reads the sentence and
  opens the intake.
- Door 3 does nothing yet.

## Why it exists (user purpose)

A first-time person starts from where they want to be, not from a form about a business (decision 6).
People who already have an idea keep the box they had, one door over.

## Copy (current labels)

All in `lib/front-door/words.ts` `frontDoorWords`. Door 1 is the only one that says what is typed stays
on this computer: its answers go only to DotAmi's own server. Door 2's sentence can go to a model when
a model key is set up (the intake's parser; Settings says so), so door 2 doesn't say it.

## State touched (field names only)

None (door 2: see its own file).

## Downstream consumers (where the data goes today)

`/start` → `/futures` → `/cockpit?venture=<id>`.

## Cleanup / open questions

- Door 3 waits for the invented example future (docs/architecture/future-cockpit.md § 13, *the example
  future's content*). The still picture of a filled-in cockpit waits for it too.

## Backend wiring

None on this control.
