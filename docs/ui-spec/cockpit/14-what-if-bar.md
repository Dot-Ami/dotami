# The what-if bar

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/what-if-bar.tsx` (words:
`lib/cockpit/words.ts` `whatIf`)
Type: form + banner

Last updated: 2026-10-14 (it no longer covers the legend, below); 2026-10-12 (built; docs/architecture/future-cockpit.md
§ 2, Cockpit screen as built, part 2)

> **Changed 2026-10-17 — the calm first view (S2.5.30c).** Folded on a first visit. Folded, the bar and *This visit* are hidden whole (a half-typed number kept) and **Show the what-if bar** sits in *Next on your road*, followed while a what-if is on by *Your what-if, not a forecast* and its number. Open, it is a region of its own with **Fold the what-if bar** at its start, as before ([12-folding-and-phone.md](./12-folding-and-phone.md)).

> **Changed 2026-10-20 — shown from Look closer (the maintainer's pick).** **Show the what-if bar** is an item of the goal bar's **Look closer** menu while the bar is folded, no longer a button in *Next on your road*, so the first view on a tablet or a laptop has one control fewer. *Next on your road* still says *Your what-if, not a forecast* and its number while a what-if is on and the bar is folded ([11-next-on-your-road.md](./11-next-on-your-road.md)).

## What it is

A band under the map, above *This visit* and *Next on your road*, named *What-if* for a screen
reader:

- **Try first-year sales of $** and a box (whole dollars), then **Try**.
- While a what-if is on: the banner **Your what-if, not a forecast**, the receipt of what it relit
  (13-receipts.md), **Keep** and **Clear**.

The bar starts where the map's legend ends and never covers it: from 768 px, when a what-if makes the
bar taller than the room left under the road's minimum area (12rem), the column holding the road, the
legend and the bar scrolls down instead (12-folding-and-phone.md, "The road's minimum area"; until
2026-10-14 the legend slid under the bar and its **Fold the legend** couldn't be clicked).

## What it does (behavior on interact)

- **Try**: the number goes to road evaluation's `whatIf` for the screen's run; the rules and tax cards
  and the steps the rules colour relight at once. It never touches a money sum, a figure or a gauge's
  numbers, and nothing is kept: a reload clears it. A number that isn't a whole, non-negative number of
  dollars is refused on screen (*Write a whole number of dollars, like 45000.*).
- **Keep**: writes the number as the idea's own first-year sales (the Year 1 field the intake keeps, saved
  with the map), never a figure, and clears the what-if; a receipt follows, and the answer is a row in
  *What you've told DotAmi*.
- **Clear**: takes the what-if off; nothing was kept.
- After **Keep** the *Try* box is emptied (the number is the idea's own now), and the receipt shows once
  the map's save has answered (2026-10-12, after review).

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
