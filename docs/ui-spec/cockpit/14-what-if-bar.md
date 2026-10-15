# The what-if bar

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/what-if-bar.tsx` (words:
`lib/cockpit/words.ts` `whatIf`)
Type: form + banner

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built, part 2)

## What it is

A band under the map, above *This visit* and *Next on your road*, named *What-if* for a screen
reader:

- **Try first-year sales of $** and a box (whole dollars), then **Try**.
- While a what-if is on: the banner **Your what-if, not a forecast**, the receipt of what it relit
  (13-receipts.md), **Keep** and **Clear**.
- A note in amber on the number's own line, only when the page gives one (`note`; since 2026-10-14, on
  the invented example only, while its own what-if is on): what the number is when it isn't the person's
  own. Mara's what-if is a published statistic, so it says *Mara's what-if is an industry average (Data year
  2024), not a first-year figure.* (docs/ui-spec/example/_index.md). On the same line, not a new one: a line
  more under the bar squeezes the map above it. A person's own future never shows it.

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
