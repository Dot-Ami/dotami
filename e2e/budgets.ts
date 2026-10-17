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
] as const;
export type ScreenId = (typeof SCREENS)[number];

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
 * The limit each screen is held to: at most the baseline, and lowered as screens get calmer.
 *
 * The calm first view (S2.5.30c, 2026-10-17) lowered the cockpit's first visit and Mara's example to what they
 * measure with it: regions 9 to 4 on a laptop and tablet and 8 to 3 on a phone (the plan's aim was at most 5,
 * 4 and 3), controls in the first window 34 to 28, 39 to 31 and 18 to 16 on road 0 (27 to 25, 35 to 28 and 17
 * to 14 on road 1), short of the plan's aim of 20, 16 and 12. What is left in the first window is the road's
 * own step cards (the first two columns), the four gauges, Next on your road's three steps and one button for
 * each folded thing; getting to 20 would mean hiding road cards or a way back to something folded (the pull
 * request explains). Text sizes 15 to 12, and the smallest text up from 8 to 8.5 px. Mara's example: 10 to 5
 * regions, and controls 23 to 21 on a laptop (CI run 39077075677; Chromium on Windows counts 23 there, see
 * `WINDOWS_EXTRA`).
 *
 * One control more on road 0's phone and laptop, the same day (17 and 29; 31 on a tablet, unchanged): a review
 * found Rules & tax two clicks away behind "Show more layers", so the Money and Rules & tax switches are drawn
 * again and that button is gone. Road 1 and Mara's example, on road 1, are unchanged: road 1 has no rules and tax
 * cards, so its Rules & tax switch is drawn but can't be pressed (it has nothing to show) and isn't counted.
 *
 * Lowered on 2026-10-17, before the limit reached main, where the count got stricter than the baseline's:
 * a control now counts only when at least 24 px of it shows each way (or all of it), so a card's bare edge
 * under a fold no longer does (the cockpit on both roads, CI run 39067156272); and *What DotAmi knows about
 * you* is measured on the seed alone, on the spec's own server, where it was measured after the suite's
 * earlier tests had filled the data file with figures.
 *
 * The front door at tablet size stays at 11: on Windows its last button ("Show me Mara's example") shows
 * only a strip above the site footer and isn't counted (10); on Ubuntu, the gate, enough of it shows to count
 * (11, CI run 39067156272).
 */
export const BUDGETS: ClutterTable = {
  "front-door": { phone: m(4, 7, 8, 9.5), tablet: m(4, 11, 8, 9.5), laptop: m(4, 11, 8, 9.5) },
  start: { phone: m(3, 5, 4, 10), tablet: m(3, 5, 4, 10), laptop: m(3, 5, 4, 10) },
  futures: { phone: m(6, 5, 10, 10), tablet: m(6, 7, 10, 10), laptop: m(6, 6, 10, 10) },
  intake: { phone: m(4, 5, 6, 8.5), tablet: m(4, 5, 6, 8.5), laptop: m(4, 5, 6, 8.5) },
  ventures: { phone: m(4, 10, 9, 9), tablet: m(4, 19, 9, 9), laptop: m(4, 14, 9, 9) },
  "your-data": { phone: m(9, 7, 11, 9.5), tablet: m(9, 7, 11, 9.5), laptop: m(9, 7, 11, 9.5) },
  "example-mara": { phone: m(4, 11, 11, 8.5), tablet: m(5, 26, 13, 8.5), laptop: m(5, 21, 13, 8.5) },
  "cockpit-road-0": { phone: m(3, 17, 11, 8.5), tablet: m(4, 31, 12, 8.5), laptop: m(4, 29, 12, 8.5) },
  "cockpit-road-1": { phone: m(3, 14, 10, 8.5), tablet: m(4, 28, 12, 8.5), laptop: m(4, 25, 12, 8.5) },
  plan: { phone: m(10, 2, 10, 10), tablet: m(10, 2, 10, 10), laptop: m(10, 2, 10, 10) },
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
 * two more of its cards show enough to count.
 */
export const WINDOWS_EXTRA: Partial<Record<ScreenId, Partial<Record<WidthId, Extra>>>> = {
  "example-mara": { laptop: { controls: 2 } },
};
