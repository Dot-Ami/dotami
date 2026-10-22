/**
 * The clutter limit for every main screen at three window sizes (docs/ui-spec/README.md, "The layout rule";
 * the maintainer's pick of 2026-10-17: a calm first view, enforced by a limit on how busy a screen can get).
 * `e2e/clutter-budget.spec.ts` measures each screen and fails when one goes over its budget.
 *
 * Two tables:
 * - `BASELINE` is what each screen measured on the day the limit was set. It is a record: never edit it.
 * - `BUDGETS` is the limit each screen is held to. It starts equal to the baseline and can only go down
 *   (the smallest text size can only go up): `tests/clutter-budgets.spec.ts` fails on a budget above the
 *   baseline or above main's. When a change makes a screen calmer, lower its budget in the same pull
 *   request, so the room it freed can't fill up again unseen; once that is on main, it can't be raised back.
 */

/** The screens measured, in the order the spec opens them. */
export const SCREENS = [
  "your-data",
  "front-door",
  "start",
  "futures",
  "intake",
  "ventures",
  "example-mara",
  "cockpit-road-0",
  "cockpit-road-1",
  "plan",
  "cockpit-about-job",
] as const;
export type ScreenId = (typeof SCREENS)[number];

/**
 * The screens added after the baseline was recorded (2026-10-17), each with its first row in `FIRST_MEASURED`
 * instead of the baseline, which never changes. The baseline's screens are the rest of `SCREENS`.
 */
export const ADDED_SCREENS = ["cockpit-about-job"] as const satisfies readonly ScreenId[];

/** The three window sizes: a phone, a tablet standing up, and a small laptop (the suite's own default). */
export const WIDTHS = [
  { id: "phone", width: 375, height: 812 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "laptop", width: 1280, height: 720 },
] as const;
export type WidthId = (typeof WIDTHS)[number]["id"];

export interface Clutter {
  /** Drawn blocks marked `data-region`, anywhere on the page. */
  regions: number;
  /** Usable controls inside the first window, before any scrolling, at least 24 px of each showing (or all of it). */
  controls: number;
  /** Distinct computed font sizes of the text drawn on the page. */
  textSizes: number;
  /** The smallest of those sizes, in px. */
  smallestTextPx: number;
}

export type ClutterTable = Partial<Record<ScreenId, Partial<Record<WidthId, Clutter>>>>;

/** One row: regions, controls in the first window, text sizes, the smallest text in px. */
const m = (regions: number, controls: number, textSizes: number, smallestTextPx: number): Clutter => ({
  regions,
  controls,
  textSizes,
  smallestTextPx,
});

/**
 * What each screen measured on 2026-10-17 (main 6f1aa3f plus the `data-region` marks), as the gate measures
 * it: in Chromium on Ubuntu, in CI's Browser tests job (run 39061924221), the full suite. A record: never
 * edit it.
 *
 * Chromium on Windows measured the same everywhere (on its own and in the full suite, the larger kept) but
 * at one place: the cockpit on road 1 at laptop size, 30 controls in the first window where Ubuntu has 27.
 * The gate's number is the one kept; `WINDOWS_EXTRA` below let a local run on Windows pass, until the count
 * stopped counting a card's bare edge (see `BUDGETS`).
 */
export const BASELINE: ClutterTable = {
  "front-door": { phone: m(4, 7, 8, 9.5), tablet: m(4, 11, 8, 9.5), laptop: m(4, 11, 8, 9.5) },
  start: { phone: m(3, 5, 4, 10), tablet: m(3, 5, 4, 10), laptop: m(3, 5, 4, 10) },
  futures: { phone: m(6, 5, 10, 10), tablet: m(6, 7, 10, 10), laptop: m(6, 6, 10, 10) },
  intake: { phone: m(4, 5, 6, 8.5), tablet: m(4, 5, 6, 8.5), laptop: m(4, 5, 6, 8.5) },
  ventures: { phone: m(4, 10, 9, 9), tablet: m(4, 19, 9, 9), laptop: m(4, 14, 9, 9) },
  "your-data": { phone: m(9, 10, 11, 9.5), tablet: m(9, 12, 11, 9.5), laptop: m(9, 11, 11, 9.5) },
  "example-mara": { phone: m(9, 13, 11, 8.5), tablet: m(10, 26, 14, 8.5), laptop: m(10, 23, 14, 8.5) },
  "cockpit-road-0": { phone: m(8, 19, 12, 8), tablet: m(9, 42, 15, 8), laptop: m(9, 37, 15, 8) },
  "cockpit-road-1": { phone: m(8, 17, 10, 8.5), tablet: m(9, 38, 14, 8.5), laptop: m(9, 27, 14, 8.5) },
  plan: { phone: m(10, 2, 10, 10), tablet: m(10, 2, 10, 10), laptop: m(10, 2, 10, 10) },
};

/**
 * The first row of each screen added after the baseline (`ADDED_SCREENS`): what CI's Browser tests job (Chromium
 * on Ubuntu, the gate) counted the first time the screen ran there. A record like the baseline: never raised
 * (`tests/clutter-budgets.spec.ts` compares it with main's), and its budget starts equal to it.
 *
 * About this job (2026-10-22, task 25h; docs/ui-spec/cockpit/about-this-job.md, "The budget"), the first: open
 * on road 1 for a picked job (Cabinetmakers), its regions the first visit's plus the panel slot the layout rule
 * already counts. On a phone the sheet covers the road, so its controls are the sheet's (the spec's ceiling:
 * road 1's 14 there). CI run 39732926050 counted 8, 2, 5 and 9.5 px on a phone, 9, 28, 5 and 9.5 px on a tablet
 * and 9, 23, 5 and 9.5 px on a laptop, the same as Chromium on Windows.
 */
export const FIRST_MEASURED: ClutterTable = {
  "cockpit-about-job": { phone: m(8, 2, 5, 9.5), tablet: m(9, 28, 5, 9.5), laptop: m(9, 23, 5, 9.5) },
};

/**
 * The limit each screen is held to: at most the baseline, and lowered as screens get calmer.
 *
 * The calm first view (S2.5.30c, 2026-10-17) lowered the cockpit's first visit and Mara's example to what they
 * measure with it: regions 9 to 8 on a laptop and tablet and 8 to 7 on a phone (the plan's aim was at most 5,
 * 4 and 3; see below), controls in the first window 34 to 28, 39 to 31 and 18 to 16 on road 0 (27 to 25, 35 to 28 and 17
 * to 14 on road 1), short of the plan's aim of 20, 16 and 12. What is left in the first window is the road's
 * own step cards (the first two columns), the four gauges, Next on your road's three steps and one button for
 * each folded thing; getting to 20 would mean hiding road cards or a way back to something folded (the pull
 * request explains). Text sizes 15 to 12, and the smallest text up from 8 to 8.5 px. Mara's example: 10 to 8
 * regions (9 to 7 on a phone), and controls 23 to 21 on a laptop (CI run 39077075677).
 *
 * One control more on road 0, the same day (17, 32 and 29): a review
 * found Rules & tax two clicks away behind "Show more layers", so the Money and Rules & tax switches are drawn
 * again and that button is gone. Road 1 and Mara's example, on road 1, are unchanged: road 1 has no rules and tax
 * cards, so its Rules & tax switch is drawn but can't be pressed (it has nothing to show) and isn't counted.
 *
 * The regions, the same day: the calm view first set them at 4, 4 and 3 (Mara 5, 5 and 4) by marking the header
 * and the goal bar as one region and the overlay row, the map and Next on your road as another. A review found
 * those blocks all still drawn in the first window, and the layout rule's own definition (docs/ui-spec/README.md,
 * rule 2) still naming the header, the goal bar and a bar under the road as regions of their own, so each
 * block's own mark went back, and the coach line, a block of its own on a first visit, got one. The first
 * visit folds the legend and the what-if bar (two regions fewer) and adds the coach line (one more).
 *
 * Lowered on 2026-10-17, before the limit reached main, where the count got stricter than the baseline's:
 * a control now counts only when at least 24 px of it shows each way (or all of it), so a card's bare edge
 * under a fold no longer does (the cockpit on both roads, CI run 39067156272); and *What DotAmi knows about
 * you* is measured on the seed alone, on the spec's own server, where it was measured after the suite's
 * earlier tests had filled the data file with figures.
 *
 * On a phone, the same day, a review found the calm view had put the road about 100 px lower than before it:
 * nothing above the road folds there, and the coach line (82 px) and the overlay switches, drawn 32 px tall,
 * were added above it. The coach line moved under the road on a phone and the switches went to 24 px, so the
 * road starts where it did before the calm view; with the road higher, road 0 shows two more of its own cards
 * in the first window and Got it leaves it (17 to 18; road 1 stays at 14, one card in and Got it out). Still at
 * most the baseline's 19.
 *
 * The front door at tablet size stays at 11: on Windows its last button ("Show me Mara's example") shows
 * only a strip above the site footer and isn't counted (10); on Ubuntu, the gate, enough of it shows to count
 * (11, CI run 39067156272).
 *
 * The type scale, the same day (S2.5.30d; docs/ui-spec/README.md, "The type scale"): six named text sizes in
 * place of twenty-three ad hoc ones, so every screen counts fewer distinct sizes and none draws text under
 * 9.5 px. Text sizes and the smallest text set to what the screens measure with it (Chromium, the same on
 * Windows and Ubuntu: a computed font size doesn't depend on the platform): the cockpit on both roads 11, 12
 * and 12 to 4, 5 and 5 (smallest 8.5 to 9.5 px), Mara's example 11, 13 and 13 to 5, the front door 8 to 6,
 * Your destination 4 to 3 (smallest 10 to 10.5 px), Pick a future 10 to 6 (10 to 10.5 px), the intake 6 to 5
 * (8.5 to 9.5 px), Your futures 9 to 7 (9 to 9.5 px), What DotAmi knows about you 11 to 7, and Your plan 10
 * to 5 (10 to 10.5 px). Regions and controls keep their budgets. A review found the scale's first values (body
 * 12 px, lead 14, title 18, display 26) took text a person reads down a size from main: the default running
 * text and every 13 px use to 12, 15 to 14, 28 to 26. Each value is now the largest of the old sizes it stands
 * in for (body 13, lead 15, title 19, display 28), so no text is smaller than on main; the counts above stay,
 * as each size only moved.
 *
 * Chromium on Windows, with those values (the full browser suite, 2026-10-19): regions, text sizes and the
 * smallest text as budgeted on every screen, and controls in the first window within the budget everywhere,
 * under it at seven sizes: the front door 10 on a tablet (the strip above the site footer, as before the
 * scale), and, the larger body text pushing the last of them below the window, Your futures 9 on a phone and
 * 13 on a laptop, Mara's example 25 on a tablet, the cockpit on road 0 17 and 31, and on road 1 26 on a
 * tablet; Mara's example on a laptop counts 23, as before the scale (`WINDOWS_EXTRA`). The budgets are the
 * gate's numbers, measured on Ubuntu, so they are lowered from a CI run's, not from these.
 *
 * The same review (2026-10-19) found the scale's first count of 21 there on Windows came from two buttons
 * cut off, not a calmer screen: Next on your road's three step names, at body size, filled their row and
 * pushed **Show the legend** and **Show the what-if bar** to a line under the window's edge, 5 px showing.
 * From 1024 px those buttons now sit at the right of the line's heading (components/cockpit/next-on-your-road.tsx),
 * so they show again and count again, and on road 0 the line is one row shorter (29 on a laptop, was 28).
 * With them back, CI on Ubuntu counted Mara's example at laptop size at 23 (run 39371971585), over its 21.
 *
 * 2026-10-20, the maintainer's pick (a calmer screen, not a higher limit): those two buttons became items of the
 * goal bar's Look closer menu, so the road screens count fewer controls on a tablet and a laptop (on a phone
 * they were under the window's edge already; road 0 counts one fewer there). Lowered to what CI on Ubuntu counts
 * with it (run 39418090969; Chromium on Windows counts the same for these three screens at all three sizes): Mara's example 26 to 23 on a
 * tablet (21 on a laptop and 11 on a phone, as budgeted), the cockpit on road 0 18, 32 and 29 to 17, 29 and
 * 27, and on road 1 28 and 25 to 25 and 23 on a tablet and a laptop (14 on a phone, as budgeted).
 *
 * A screen added after the baseline (`ADDED_SCREENS`) starts at its first row in `FIRST_MEASURED` and only goes
 * down from there, like the rest.
 */
export const BUDGETS: ClutterTable = {
  "front-door": { phone: m(4, 7, 6, 9.5), tablet: m(4, 11, 6, 9.5), laptop: m(4, 11, 6, 9.5) },
  start: { phone: m(3, 5, 3, 10.5), tablet: m(3, 5, 3, 10.5), laptop: m(3, 5, 3, 10.5) },
  futures: { phone: m(6, 5, 6, 10.5), tablet: m(6, 7, 6, 10.5), laptop: m(6, 6, 6, 10.5) },
  intake: { phone: m(4, 5, 5, 9.5), tablet: m(4, 5, 5, 9.5), laptop: m(4, 5, 5, 9.5) },
  ventures: { phone: m(4, 10, 7, 9.5), tablet: m(4, 19, 7, 9.5), laptop: m(4, 14, 7, 9.5) },
  "your-data": { phone: m(9, 7, 7, 9.5), tablet: m(9, 7, 7, 9.5), laptop: m(9, 7, 7, 9.5) },
  "example-mara": { phone: m(7, 11, 5, 9.5), tablet: m(8, 23, 5, 9.5), laptop: m(8, 21, 5, 9.5) },
  "cockpit-road-0": { phone: m(7, 17, 4, 9.5), tablet: m(8, 29, 5, 9.5), laptop: m(8, 27, 5, 9.5) },
  "cockpit-road-1": { phone: m(7, 14, 4, 9.5), tablet: m(8, 25, 5, 9.5), laptop: m(8, 23, 5, 9.5) },
  plan: { phone: m(10, 2, 5, 10.5), tablet: m(10, 2, 5, 10.5), laptop: m(10, 2, 5, 10.5) },
  "cockpit-about-job": { phone: m(8, 2, 5, 9.5), tablet: m(9, 28, 5, 9.5), laptop: m(9, 23, 5, 9.5) },
};

/** What Chromium on Windows may count over a budget: only regions, controls and text sizes, never fewer. */
export type Extra = Partial<Pick<Clutter, "regions" | "controls" | "textSizes">>;

/**
 * Where Chromium on Windows draws a screen differently from the gate, the extra it measures over the budget
 * there. Added to the budget only when the browser test runs on Windows, so a local run there passes on an
 * unchanged screen; CI runs on Ubuntu and never reads this, so it never loosens the gate. When a change
 * makes the two agree, take its line out.
 *
 * Emptied on 2026-10-17: the one difference then (road 1 at laptop size, 30 controls on Windows and 27 on
 * Ubuntu) was three road cards showing only a sliver of their edge on Windows, which no longer count.
 *
 * Mara's example at laptop size, since the calm first view (2026-10-17): 23 controls on Windows, 21 on Ubuntu
 * (CI run 39077075677). Windows' text wraps a little shorter in the goal bar, so the road starts higher and
 * two more of its cards show enough to count. (For a few hours on 2026-10-19 the type scale took this line
 * out, counting 21 on Windows; that count was two of Next on your road's buttons pushed below the window, and
 * with them back in view it is 23 again.)
 *
 * Emptied again on 2026-10-20: with Show the legend and Show the what-if bar in the Look closer menu, Windows
 * and Ubuntu both count Mara's example at laptop size at 21 (CI run 39418090969, and the browser tests run on
 * Windows the same day).
 */
export const WINDOWS_EXTRA: Partial<Record<ScreenId, Partial<Record<WidthId, Extra>>>> = {};
