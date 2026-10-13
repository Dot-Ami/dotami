# Folding the regions, and phone width

Page: Cockpit (`/cockpit?venture=<id>`) · Components: `components/cockpit/cockpit-page.tsx` (the rail, the
panel, the header's *Fold all panels*, the phone sheets), `components/cockpit/folding.tsx` (the buttons,
focus after a fold), `components/cockpit/use-sheet.ts` (the phone sheets' keyboard),
`components/cockpit/goal-bar.tsx` (the goal bar),
`components/cockpit/strategy-map.tsx` (the legend, the road's own area),
`components/cockpit/what-if-bar.tsx` (the what-if bar and *This visit*); the remembered answers:
`lib/cockpit/folds.ts`; words: `lib/cockpit/words.ts` (`folds`)
Type: toggle buttons + layout

Last updated: 2026-10-13 (the what-if bar folds too, below); built 2026-10-12 (docs/architecture/future-cockpit.md
§ 2, "Folding and phone width"; closes issue #4)

## What it is

Five regions of the cockpit fold to make room for the road, each with its own button (the fifth, the
what-if bar, since 2026-10-13, when part 2 put it under the map):

| Region | Open, its button says | Folded, it shows | and its button says |
|---|---|---|---|
| Left rail (venture details, *In your words*, the ladder, the save line) | **Fold venture details** (top of the rail) | a narrow strip | **Show venture details** |
| Goal bar and its four gauges | **Fold goal and gauges** (right of the goal line) | one line: the four gauges as buttons, name and value (the lines under each gauge in the button's title) | **Show goal and gauges** |
| The right-hand panel (a step, a gauge's list, the month box, Export) | **Fold the panel** (a thin bar at the panel's top) | a narrow strip (wide window) or a bar along the bottom that is one full-width button, 44 px tall (narrow window) | **Show the panel: <what it holds>**, e.g. *Show the panel: Sole Prop activation* |
| The map's legend | **Fold the legend** (start of the legend line) | one line | **Show the legend** |
| The what-if bar and *This visit* under the map (part 2) | **Fold the what-if bar** (start of the bar) | one line; while a what-if is on, the line still says *Your what-if, not a forecast* and its number, as the map is still relit by it | **Show the what-if bar** |

Part 2's other panels fold with the region they sit in: *What you've told DotAmi / Not told yet* and the
one-question box are at the top of the left rail and fold with it; *Compare the two endings* and the
receipts shown in a step or a list are in the right-hand panel and fold with it; *This visit* folds with
the what-if bar.

The header has **Fold all panels** (folds all five), which reads **Show all panels** once all five are
folded (opens all five). It is hidden below 768 px, where the rail and the panel are sheets.

Each fold button carries `aria-expanded` (open = true) and `aria-controls` naming its region; *Fold all
panels* names the regions drawn at the time (the panel only while it holds something). On a phone the
fold buttons are at least 32 px tall.

## What it does (behavior on interact)

- A click folds or opens that region at once. Nothing inside is removed: the folded content stays on the
  page, hidden (the open goal bar sits behind its one line), and is back as it was when the region opens
  (a half-typed statement included, and the rail's scroll position).
- **Focus follows the fold.** After a fold or show, focus is on the button that now stands for the region
  (the strip, the one line's *Show goal and gauges*, the panel's bar or its *Fold the panel*), never
  dropped to the top of the page. *Fold all panels*, the legend's button and the what-if bar's button
  stay where they are and keep focus.
- **Remembered per browser.** Every click writes the five answers to this browser's storage
  (`localStorage`, key `dotami-cockpit-folds`, a JSON object such as
  `{"rail":true,"goal":false,"panel":false,"legend":true,"whatIf":false}`; an answer stored before
  2026-10-13 has no `whatIf`, which reads as open).
  The cockpit reads it when it opens. If storage can't be read or written, everything opens and folding
  still works until the window closes. Anything in the stored value other than `true` reads as open. In
  the desktop app each launch has its own local address and so its own empty storage: the folds last until
  the app closes.
- **The panel stays folded** while the person picks other steps, gauges or Export: the new thing goes in
  the folded panel and the strip names it. **Close** inside the panel closes it and clears what it held,
  as before; the fold answer is kept for the next thing opened.
- **Phone width (below 768 px).** The page never scrolls sideways. The rail is not drawn as a column:
  **Venture details** in the header opens it as a full-width sheet, and **Close venture details** at the
  sheet's top closes it (not remembered: it is closed whenever the cockpit opens). The right-hand panel
  opens as a full-width sheet over the page, closed by its own **Close**. While a sheet is open, focus is
  on its first control, Tab and Shift+Tab go round inside it, **Escape** closes it (the same as its
  Close), the page behind it is inert, and when it closes focus goes back to the button or card that
  opened it. The road's area is 70 % of the window's height and scrolls sideways one column at a time
  (each column the window's width less the margins; the scroll snaps to a column's edge); the page
  scrolls down to *Next on your road* and the legend under it.
- **Below 1024 px, the folded panel's bar** is fixed along the bottom of the window, and the page leaves
  room under its last line for it, so it never covers the *Information, not legal or tax advice* line.
- **768 to 1024 px.** The rail is a column; the right-hand panel opens as a 420 px drawer under the
  header, over the right of the road, so the header's *Export* and *Fold all panels* stay free to click.
- **From 1024 px**, as part 1: the rail, the road and the panel side by side.

## Why it exists (user purpose)

The maintainer, 2026-10-12: *"we need to be able to open and close any menu in order to see the entire
roadmap"*. With all of them folded at 1280x720, every card on road 0 fits in the road's area once
scrolled to, and that area is at least 400 px tall (it was 296 px with everything open). Issue #4: at
375 px the legend left the road 20 px of height. Part 2 added the what-if bar under the map, which takes
the road's height too, so it folds the same way (2026-10-13).

## Copy (current labels)

All in `lib/cockpit/words.ts` `folds`: *Fold venture details* · *Show venture details* · *Venture
details* · *Close venture details* · *Fold goal and gauges* · *Show goal and gauges* · *Fold the panel* ·
*Show the panel: <title>* · *Fold the legend* · *Show the legend* · *Legend* · *Fold the what-if bar* ·
*Show the what-if bar* · *Fold all panels* · *Show all panels* · the road's area, for a screen reader:
*The road*. The folded panel's strip names Compare as *Compare the two endings* (`compare.region`).

## State touched (field names only)

Browser storage only: `localStorage` `dotami-cockpit-folds` (`rail`, `goal`, `panel`, `legend`,
`whatIf`). Nothing in the data file.

## Downstream consumers (where the data goes today)

None. The answers are read only by the cockpit page in the same browser.

## Cleanup / open questions

- Part 2's left list (*What you've told DotAmi*) lives in the same rail and folds with it (2026-10-13,
  as built).
- On a phone, the folded goal bar's gauges scroll sideways inside their line when they don't fit.

## Backend wiring

None.
