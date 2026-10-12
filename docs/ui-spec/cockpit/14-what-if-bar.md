# The what-if bar

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/what-if-bar.tsx` (words:
`lib/cockpit/words.ts` `whatIf`)
Type: form + banner

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built, part 2)

## What it is

A band under the map, above *Since last time* and *Next on your road*, named *What-if* for a screen
reader:

- **Try first-year sales of $** and a box (whole dollars), then **Try**.
- While a what-if is on: the banner **Your what-if, not a forecast**, the receipt of what it relit
  (13-receipts.md), **Keep** and **Clear**.

## What it does (behavior on interact)

- **Try**: the number goes to road evaluation's `whatIf` for the screen's run; the rules and tax cards
  and the steps the rules colour relight at once. It never touches a money sum, a figure or a gauge's
  numbers, and nothing is kept: a reload clears it. A number that isn't a whole, non-negative number of
  dollars is refused on screen (*Write a whole number of dollars, like 45000.*).
- **Keep**: writes the number as the idea's own first-year sales (the Year 1 field the intake keeps, saved
  with the map), never a figure, and clears the what-if; a receipt follows, and the answer is a row in
  *What you've told DotAmi*.
- **Clear**: takes the what-if off; nothing was kept.

## Why it exists (user purpose)

To peer ahead without a forecast: the person's own number relights the rules, labelled as theirs.

## Copy (current labels)

`lib/cockpit/words.ts` `whatIf`.

## State touched (field names only)

None until **Keep**; then the idea's `targetRevenueY1`, through the map's save.

## Downstream consumers (where the data goes today)

Road evaluation's run for the screen (cards, step colours, the *Rules & tax* overlay).

## Cleanup / open questions

- Third-year sales have no what-if yet.

## Backend wiring

None until **Keep** (`/api/scenario/save`).
