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
 *
 * A screen added after the baseline was recorded (`ADDED_SCREENS`, since 2026-10-21) has no baseline row: the
 * baseline is a record of one day. It gets its budget the written way below instead, and from then on its
 * budget can only go down, like every other.
 */

/** The screens the baseline of 2026-10-17 measured, in the order the spec opens them. */
export const BASELINE_SCREENS = [
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

/**
 * Screens added after the baseline (the written way for a new screen's first row, below `FIRST_MEASURED`). Each is a
 * part of a screen the baseline measured, named in `ADDED_SCREEN_PART_OF`.
 */
export const ADDED_SCREENS = [
  // About this job (2026-10-22, task 25h; docs/ui-spec/cockpit/about-this-job.md, "The budget"): the cockpit on
  // road 1 with the panel open for a picked job.
  "cockpit-about-job",
  // Pick a future's three steps (2026-10-22; docs/ui-spec/futures/02-where-you-are.md, 03-road-match.md): step 1
  // is measured as `futures` (the page opens on it); these are the parts after it, on Pick a future and on the
  // intake page (the typed way ends on the same steps).
  // Step 3 has three cases (03-road-match.md): `futures-road-written` is case A (a road written for the job, under
  // "Written for your pick of job"), `futures-road` case B (no road written for it), `futures-road-skipped` case C
  // (the job skipped); on the intake page likewise. The intake's case C (`intake-road-skipped`) counts 6 controls
  // on a tablet, over the intake's 5: the maintainer's call 38 of 2026-10-22 accepts 6 there as that step's own
  // limit, since it is the same step as Pick a future's case C, whose limit at that width is 7, so its row stands
  // beside Pick a future's (`ADDED_SCREEN_PART_OF`).
  "futures-area",
  "futures-region",
  "futures-outside",
  "futures-road-written",
  "futures-road",
  "futures-road-skipped",
  "intake-steps",
  "intake-area",
  "intake-region",
  "intake-road-written",
  "intake-road",
  "intake-road-skipped",
  // Outside Alberta (2026-10-21, task 28d; docs/ui-spec/futures/04-outside-alberta.md): Pick a future's step 3 for
  // a person in Ontario who skipped the job, every future listed (the federal steps first, under "Written for all
  // of Canada", the two Alberta futures folded behind one button), a state of Pick a future; and the cockpit on
  // the federal road, a first visit from Ontario, a sibling of the cockpit on road 0.
  "futures-outside-alberta",
  "cockpit-federal",
] as const;

/** Every screen measured. */
export const SCREENS = [...BASELINE_SCREENS, ...ADDED_SCREENS] as const;
export type ScreenId = (typeof SCREENS)[number];
export type AddedScreenId = (typeof ADDED_SCREENS)[number];

/**
 * The baseline screen each added screen is a part, a state or a sibling of: its first row may not be busier than
 * that screen's baseline row (a new screen starts at most as busy as the screen it stands beside).
 */
export const ADDED_SCREEN_PART_OF: Record<AddedScreenId, (typeof BASELINE_SCREENS)[number]> = {
  "cockpit-about-job": "cockpit-road-1",
  "futures-area": "futures",
  "futures-region": "futures",
  "futures-outside": "futures",
  "futures-road-written": "futures",
  "futures-road": "futures",
  "futures-road-skipped": "futures",
  "intake-steps": "intake",
  "intake-area": "intake",
  "intake-region": "intake",
  "intake-road-written": "intake",
  "intake-road": "intake",
  // The same step as Pick a future's case C (call 38 of 2026-10-22): no busier than Pick a future's baseline.
  "intake-road-skipped": "futures",
  "futures-outside-alberta": "futures",
  "cockpit-federal": "cockpit-road-0",
};

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
 * A new screen's first row (the written way, 2026-10-22): `BASELINE` is a record of 2026-10-17 and never changes,
 * so a screen added later can't be put in it. Its first row goes here instead, in the pull request that adds the
 * screen, and is then a record like the baseline:
 *
 * - it is what the gate measures for the new screen as it opens (Chromium on Ubuntu, CI's Browser tests job),
 *   with the pull request naming the run;
 * - it is at or under the baseline row of the screen it is a part of (`ADDED_SCREEN_PART_OF`), so a part of a
 *   screen is never allowed more than the screen itself (the smallest text at or over it);
 * - once on main it never changes (`tests/clutter-budgets.spec.ts` compares it with main's), and the screen's
 *   budget in `BUDGETS` starts at it and can only go down, as every budget does.
 *
 * About this job (2026-10-22, task 25h; docs/ui-spec/cockpit/about-this-job.md, "The budget"): open on road 1
 * for a picked job (Cabinetmakers), a part of the cockpit on road 1, its regions the first visit's plus the panel
 * slot the layout rule already counts. On a phone the sheet covers the road, so its controls are the sheet's (the
 * spec's ceiling: road 1's 14 there). CI run 39732926050 counted 8, 2, 5 and 9.5 px on a phone, 9, 28, 5 and
 * 9.5 px on a tablet and 9, 23, 5 and 9.5 px on a laptop, the same as Chromium on Windows.
 *
 * Pick a future's three steps (tasks 28b, 23g; docs/ui-spec/futures/02-where-you-are.md and 03-road-match.md,
 * "Regions and controls"): area, region, the screen outside Alberta that asks nothing, and step 3 on case B (a
 * job with no written road: the no-road block, About this job's place, the other futures), each on Pick a
 * future after a job pick; and on the intake page, step 1 and step 3 case B, inside the intake's own region with
 * the preview rail put away. Measured on 2026-10-22 (see the pull request for the run).
 *
 * The same day (the PR #202 review: only case B had a row), step 3's case A (a road written for the job, under
 * "Written for your pick of job") and case C (the job skipped) on Pick a future, and the intake page's 2a, 2b
 * and case A, each at or under its screen's baseline row, as CI's Ubuntu run measured them (run 39748625442).
 * Chromium on Windows counts the same but one place, case A on Pick a future at laptop size: 4 controls where
 * Ubuntu has 5 (its Look inside reaches the first window on Ubuntu), so the row is Ubuntu's 5. The intake's case C
 * has no row: on a tablet it counts 6 controls on Windows (the Not here yet? box and the footer's link both reach
 * the first window), over the intake's 5, so it is shown to the maintainer instead (see `ADDED_SCREENS`).
 *
 * Outside Alberta (2026-10-21, task 28d; docs/ui-spec/futures/04-outside-alberta.md, "Regions and controls"):
 * Pick a future's step 3 for a person in Ontario with the job skipped (`futures-outside-alberta`: the federal card
 * and one fold button where an Albertan has two **Look inside**), at or under Pick a future's baseline; and the
 * cockpit on the federal road (`cockpit-federal`), at or under road 0's, which it counts the same as.
 */
export const FIRST_MEASURED: Partial<Record<AddedScreenId, Partial<Record<WidthId, Clutter>>>> = {
  "cockpit-about-job": { phone: m(8, 2, 5, 9.5), tablet: m(9, 28, 5, 9.5), laptop: m(9, 23, 5, 9.5) },
  "futures-area": { phone: m(4, 5, 5, 10.5), tablet: m(4, 5, 5, 10.5), laptop: m(4, 5, 5, 10.5) },
  "futures-region": { phone: m(4, 5, 5, 10.5), tablet: m(4, 5, 5, 10.5), laptop: m(4, 5, 5, 10.5) },
  "futures-outside": { phone: m(4, 4, 5, 10.5), tablet: m(4, 4, 5, 10.5), laptop: m(4, 4, 5, 10.5) },
  "futures-road-written": { phone: m(6, 5, 6, 10.5), tablet: m(6, 5, 6, 10.5), laptop: m(6, 5, 6, 10.5) },
  "futures-road": { phone: m(6, 3, 6, 10.5), tablet: m(6, 6, 6, 10.5), laptop: m(6, 3, 6, 10.5) },
  "futures-road-skipped": { phone: m(6, 4, 6, 10.5), tablet: m(6, 7, 6, 10.5), laptop: m(6, 6, 6, 10.5) },
  "intake-steps": { phone: m(3, 5, 5, 10.5), tablet: m(3, 5, 5, 10.5), laptop: m(3, 5, 5, 10.5) },
  "intake-area": { phone: m(3, 5, 5, 10.5), tablet: m(3, 5, 5, 10.5), laptop: m(3, 5, 5, 10.5) },
  "intake-region": { phone: m(3, 5, 5, 10.5), tablet: m(3, 5, 5, 10.5), laptop: m(3, 5, 5, 10.5) },
  "intake-road-written": { phone: m(3, 3, 6, 10.5), tablet: m(3, 4, 6, 10.5), laptop: m(3, 3, 6, 10.5) },
  "intake-road": { phone: m(3, 2, 6, 10.5), tablet: m(3, 5, 6, 10.5), laptop: m(3, 2, 6, 10.5) },
  "futures-outside-alberta": { phone: m(6, 5, 6, 10.5), tablet: m(6, 7, 6, 10.5), laptop: m(6, 5, 6, 10.5) },
  "cockpit-federal": { phone: m(7, 17, 4, 9.5), tablet: m(8, 29, 5, 9.5), laptop: m(8, 27, 5, 9.5) },
  "intake-road-skipped": { phone: m(3, 3, 5, 10.5), tablet: m(3, 6, 5, 10.5), laptop: m(3, 5, 5, 10.5) },
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
 *
 * 2026-10-22, Pick a future's three steps (tasks 28b, 23g): the page opens on step 1, *What's closest to your
 * work?*, with nothing typed: the nav, the step's heading, the step and the site footer, and five controls (the
 * back link, the word mark, the search box, Skip, the footer's link), five text sizes. Lowered from 6 regions, 5,
 * 7 and 6 controls and 6 text sizes to 4, 5, 5, 5 and 5, as docs/ui-spec/futures/01-whats-closest-to-your-work.md
 * designs; the cards, *Name it* and *Not here yet?* are step 3, measured as `futures-road`.
 *
 * 2026-10-22, the batch 4 follow-up (task 28h), the maintainer's calls on the batch 4 page:
 * - Call 37, "Trim it to 5": the typed way's last step, both versions (`intake-road`, a job with no written road;
 *   `intake-road-written`, a road written for the job), 6 to 5 text sizes. On the intake page step 3's headings
 *   take the lead size the intake already draws instead of the title size (components/front-door/
 *   job-and-road-steps.tsx), so the step shows the intake's own five sizes.
 * - Call 38, "Accept 6 as this step's own limit": the typed way's last step with the job skipped
 *   (`intake-road-skipped`), its first row in `FIRST_MEASURED`: 3, 6 and 5 controls on a phone, a tablet and a
 *   laptop (on a tablet the whole step fits the window, so the Not here yet? box and the footer's link both count),
 *   standing beside Pick a future's case C (`ADDED_SCREEN_PART_OF`), and 5 text sizes with call 37.
 * - Pick a future outside Alberta (`futures-outside-alberta`): lowered to what CI's Ubuntu run counts on main
 *   (run 39879574374, f6e9a81): 4, 6 and 4 controls, one fewer than its first row at every size (the row was
 *   Windows' count before the steps were joined with the federal card).
 * - Step 3 for a job with no written road, with About this job's rows in place (task 28c): the rows push the cards'
 *   Look inside below a tablet's first window, so \`futures-road\` 6 to 3 and \`intake-road\` 5 to 2 controls there,
 *   as CI's Ubuntu run counts them (run 39896985007); phone and laptop already at those counts.
 */
export const BUDGETS: ClutterTable = {
  "front-door": { phone: m(4, 7, 6, 9.5), tablet: m(4, 11, 6, 9.5), laptop: m(4, 11, 6, 9.5) },
  start: { phone: m(3, 5, 3, 10.5), tablet: m(3, 5, 3, 10.5), laptop: m(3, 5, 3, 10.5) },
  futures: { phone: m(4, 5, 5, 10.5), tablet: m(4, 5, 5, 10.5), laptop: m(4, 5, 5, 10.5) },
  intake: { phone: m(4, 5, 5, 9.5), tablet: m(4, 5, 5, 9.5), laptop: m(4, 5, 5, 9.5) },
  ventures: { phone: m(4, 10, 7, 9.5), tablet: m(4, 19, 7, 9.5), laptop: m(4, 14, 7, 9.5) },
  "your-data": { phone: m(9, 7, 7, 9.5), tablet: m(9, 7, 7, 9.5), laptop: m(9, 7, 7, 9.5) },
  "example-mara": { phone: m(7, 11, 5, 9.5), tablet: m(8, 23, 5, 9.5), laptop: m(8, 21, 5, 9.5) },
  "cockpit-road-0": { phone: m(7, 17, 4, 9.5), tablet: m(8, 29, 5, 9.5), laptop: m(8, 27, 5, 9.5) },
  "cockpit-road-1": { phone: m(7, 14, 4, 9.5), tablet: m(8, 25, 5, 9.5), laptop: m(8, 23, 5, 9.5) },
  plan: { phone: m(10, 2, 5, 10.5), tablet: m(10, 2, 5, 10.5), laptop: m(10, 2, 5, 10.5) },
  // Added screens start at their first row (FIRST_MEASURED) and can only go down from there.
  "cockpit-about-job": { phone: m(8, 2, 5, 9.5), tablet: m(9, 28, 5, 9.5), laptop: m(9, 23, 5, 9.5) },
  "futures-area": { phone: m(4, 5, 5, 10.5), tablet: m(4, 5, 5, 10.5), laptop: m(4, 5, 5, 10.5) },
  "futures-region": { phone: m(4, 5, 5, 10.5), tablet: m(4, 5, 5, 10.5), laptop: m(4, 5, 5, 10.5) },
  "futures-outside": { phone: m(4, 4, 5, 10.5), tablet: m(4, 4, 5, 10.5), laptop: m(4, 4, 5, 10.5) },
  "futures-road-written": { phone: m(6, 5, 6, 10.5), tablet: m(6, 5, 6, 10.5), laptop: m(6, 5, 6, 10.5) },
  "futures-road": { phone: m(6, 3, 6, 10.5), tablet: m(6, 3, 6, 10.5), laptop: m(6, 3, 6, 10.5) },
  "futures-road-skipped": { phone: m(6, 4, 6, 10.5), tablet: m(6, 7, 6, 10.5), laptop: m(6, 6, 6, 10.5) },
  "intake-steps": { phone: m(3, 5, 5, 10.5), tablet: m(3, 5, 5, 10.5), laptop: m(3, 5, 5, 10.5) },
  "intake-area": { phone: m(3, 5, 5, 10.5), tablet: m(3, 5, 5, 10.5), laptop: m(3, 5, 5, 10.5) },
  "intake-region": { phone: m(3, 5, 5, 10.5), tablet: m(3, 5, 5, 10.5), laptop: m(3, 5, 5, 10.5) },
  "intake-road-written": { phone: m(3, 3, 5, 10.5), tablet: m(3, 4, 5, 10.5), laptop: m(3, 3, 5, 10.5) },
  "intake-road": { phone: m(3, 2, 5, 10.5), tablet: m(3, 2, 5, 10.5), laptop: m(3, 2, 5, 10.5) },
  "futures-outside-alberta": { phone: m(6, 4, 6, 10.5), tablet: m(6, 6, 6, 10.5), laptop: m(6, 4, 6, 10.5) },
  "cockpit-federal": { phone: m(7, 17, 4, 9.5), tablet: m(8, 29, 5, 9.5), laptop: m(8, 27, 5, 9.5) },
  "intake-road-skipped": { phone: m(3, 3, 5, 10.5), tablet: m(3, 6, 5, 10.5), laptop: m(3, 5, 5, 10.5) },
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
