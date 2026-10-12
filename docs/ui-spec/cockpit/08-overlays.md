# Overlay switches, and what they put on the road

Page: Cockpit (`/cockpit?venture=<id>`) · Components: `components/cockpit/overlay-switches.tsx`,
`components/cockpit/strategy-map.tsx` (props `overlays`, `stepEvaluations`, `linkedSkillId`)
Type: toggle group + map decoration

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built)

## What it is

A row over the map, a group named *Overlays*: **Road · always on** (not a button), then three toggle
buttons, each with its count for the whole road: **Skills · 5 listed**, **Money · 8 cost lines**,
**Rules & tax · 6 cards** (the rules and tax cards the map draws, each counted once: none from a card drawn
dashed, so none from a step the person marked not for me or the side of a fork not picked).

First visit: **Rules & tax** on, so the map looks as it did before the overlays; **Skills** and **Money**
off. The choice is not remembered between visits yet.

## What it does (behavior on interact)

- **Skills** on: each step that lists skills gets a badge *needs 3 · you have 2* (items the step lists,
  and how many the person marked *have*).
- **Money** on: each step with cost lines gets a badge with its priced sum (official fees plus the
  person's agreed numbers; an official fee that applies only sometimes is never in it, and the badge says
  *n only sometimes, not added*) and *n not priced*, plus *waits on a pick* or *not counted: not on your path*
  when road evaluation leaves its lines out of the sums. A blank line is never shown as $0.
- **Rules & tax** off: the lever cards under the stage cards are hidden; on, they are drawn as before.
- Badges are drawn under the card's line and read out in the card's accessible name, between its colour
  and *opens detail*: "Train, ahead, applies as answered, needs 2 · you have 0, opens detail".

Also on the map, from road evaluation (`evaluateRoad`):

- **Colours** are each step's state: green *applies*, amber *check first*, grey *not on your path*. On
  today's general road these are exactly the rules' colours, so nothing changes until the person marks
  a step *not for me*, which greys it. That grey is the person's choice, not the rules': the card's name
  reads *set aside by you* in place of *doesn't apply as answered*, and the legend adds *not for me = set
  aside by you, not a reading of your answers* while any card is set aside.
- **The chip** shows the person's own status where they set one (*doing*, *done*, *not for me*; *not for
  me* draws the card dashed and hides its lever cards). Where they set none, the map's worked-out chip
  is shown as before (*now · your pick · done · ahead · not on your path*).
- **A fork's column** says *The road splits here: you choose* under its line.
- **A skill selected** in the step panel or the skills list dims every step that doesn't list it.

Drawn without these props the map is byte for byte what it was (`tests/road-map.spec.ts`).

## Why it exists (user purpose)

One picture with layers switched on and off (decision 4A of 2026-10-11), so the person sees what skills,
money and rules each step carries without a separate screen for each.

## Copy (current labels)

`lib/cockpit/words.ts` (`road`). Badge text is built by `lib/cockpit/view.ts` `stepBadges`.

## State touched (field names only)

Local `overlays`, `selectedSkillId` in `components/cockpit/cockpit-page.tsx`. Nothing saved.

## Downstream consumers (where the data goes today)

None.

## Cleanup / open questions

- Remember the last overlay used, per person (the design asks for it; it needs a saved setting or a
  browser-storage key listed in the privacy inventory).
- Badges duplicate a little of the step panel; kept short on purpose.

## Backend wiring

None: drawn from road evaluation in the browser.
