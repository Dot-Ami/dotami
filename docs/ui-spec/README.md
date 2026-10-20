# UI behavior specs

Last updated: 2026-10-17 (the layout rule and the clutter limit, below; the same day, the cockpit's calm first view and its regions as built, S2.5.30c, and the type scale, S2.5.30d); 2026-06-10

Per-page catalogs of **what each interactive control does and why** — purpose-first, backend wiring deferred until Phase 5.

## The layout rule (the maintainer, 2026-10-17)

Asked for after *"there's a LOT on the screen"*: a calm first view, kept calm by a limit on how busy a
screen may get. Every screen, and every feature added to one, follows these four lines.

1. **One primary thing per screen.** On the cockpit it is the road. Everything else on the screen is there
   to read or change the primary thing, and is drawn quieter than it.
2. **New features never add a region.** A region is a block a person has to take in on its own: a header
   or nav bar, the goal bar, a rail, the road, the legend, a bar under the road, a panel, a section of a
   page, the site's footer. Items of one list (ideas, futures, steps, cards) are one region together. A
   new feature opens in a region the screen already has, in the cockpit the right-hand panel or the step
   panel, from the place where its question comes up (a button on the step, a row in a list, one header
   button), never as a new bar, rail or box on the page.
3. **The first visit shows the least.** A person who has just arrived sees the primary thing and the one
   or two ways into it; the rest waits folded until they ask for it
   ([architecture/future-cockpit.md](../architecture/future-cockpit.md) § 2, *First visit and return
   visits*).
4. **Everything folds, and is remembered.** Any region but the primary thing can be folded with a button
   that says what it does, and stays the way the person left it on their next visit (the cockpit's
   answers are in `lib/cockpit/folds.ts`; a new remembered answer is listed in `lib/privacy/inventory.ts`).

**Where the planned features land** (none adds a region):

| Planned feature | Where it opens | Opened from |
|---|---|---|
| The ways to get each cost line (already have it, buy, rent, lease; [architecture/other-ways-to-build.md](../architecture/other-ways-to-build.md)) | The step panel, folded inside each cost row | The cost row itself |
| *Others in this line of work* ([cockpit/landscape.md](cockpit/landscape.md)) | The right-hand panel | The goal bar's *Look closer* menu (since 2026-10-17), and a step that opens a business |
| *About this job* (the job's facts, wages and requirements; [architecture/research-kit.md](../architecture/research-kit.md) § 4) | The right-hand panel | The goal bar's *Look closer* menu, beside *Compare the two endings* and *Others in this line of work* (§ 4.2; the menu since 2026-10-17, S2.5.30c); and a job with no written road shows it by default (§ 4.1, K6 A): the no-road screen offers it beside road 0 and the career road (S2.5.28c) |
| The Lens ([architecture/use-cases.md](../architecture/use-cases.md)) | The right-hand panel; on a phone, a sheet (`components/cockpit/use-sheet.ts`) | One button in the header, and *Ask the Lens about this* in the step panel |
| *Sort by one thing you choose* ([architecture/lens-comparisons.md](../architecture/lens-comparisons.md)) | Inside the list it sorts | Only on *Your futures*, *Compare* and the alternatives on road 1's training column, nowhere else (S2.5.24f, lens-comparisons.md § 11; the 2026-10-17 plan's list named the first two) |

**The cockpit's regions, as rule 2 counts them (2026-10-17, with the calm first view, S2.5.30c).** The header;
the goal bar; the rail (a folded strip from 768 px counts too); the overlay switches; the coach line, on a
first visit until *Got it*; the road; the legend and the what-if bar while open; *Next on your road*; the panel
while it holds something; the site's footer; and the example's banner on Mara's page. The header and the goal
bar share one strip, and the overlay row, the map and *Next on your road* one column, but each is a block a
person takes in on its own, so each keeps its own mark. A first visit folds the legend, the what-if bar and the
road's later columns to one button each: 8 regions from 768 px and 7 on a phone (9 and 8 before), one fewer
once the coach line is put away ([cockpit/12-folding-and-phone.md](cockpit/12-folding-and-phone.md)). For a
few hours on 2026-10-17 the strip and the column were each counted as one region, which read as 4 and 3; a
review found the blocks still drawn and the rule's own definition unchanged, so the marks went back.

### The clutter limit (`e2e/clutter-budget.spec.ts`)

A browser test opens the main screens (the front door, *Your destination*, *Pick a future*, the intake,
the cockpit on road 0 and on road 1 as a first visit, *Your plan*, *Your futures*, *What DotAmi knows about
you* and the example, Mara) at 375×812, 768×1024 and 1280×720, and measures four things on each:

| Measure | What it counts |
|---|---|
| Regions | Blocks marked `data-region="<name>"` that are drawn (not hidden, not zero-sized), anywhere on the page. The count sees only marked blocks, so the test also fails on any drawn landmark or section (`header`, `nav`, `aside`, `footer`, `section`, `main`, their ARIA roles, and `role="group"`) that has no mark, sits inside no region and holds none |
| Controls | Links, buttons, boxes, menus and switches that can be used (not disabled, not behind a sheet) and show inside the first window, before any scrolling: at least 24 px of each showing each way (WCAG 2.2's smallest target size), or all of it where it is smaller, so a card's bare edge under a fold isn't counted; a control inside another counts once |
| Text sizes | Distinct computed font sizes of the text drawn on the page (text a screen reader alone hears is left out) |
| Smallest text | The smallest of those sizes, in px |

The limits are in `e2e/budgets.ts`. They started at what each screen measured on 2026-10-17 (the baseline,
kept beside them), and they can only go down: a unit test (`tests/clutter-budgets.spec.ts`) fails if any
limit is above its baseline or above what it is on main, or the smallest text below either, so a limit once
lowered can't be raised back later (CI compares with main; locally, with where the branch left
`origin/main`). A screen over its limit fails the browser
suite. To add a region, take one away first; a new screen arrives with its own `data-region` marks and its
own row in `e2e/budgets.ts`. The test saves a screenshot of each screen at each width with its results.

The test starts a server of its own, from the suite's build, over a data folder of its own
(`prisma/e2e-clutter/`, holding only the two demo ventures), so what it measures doesn't depend on what
the suite's other tests saved. *What DotAmi knows about you* counts everything in the data file, so it is
measured first, on that seed alone.

The numbers are the gate's: Chromium on Ubuntu, in CI's *Browser tests* job. Where Chromium on Windows
measures more on a screen, `WINDOWS_EXTRA` in `e2e/budgets.ts` adds the difference for a run on Windows
only, so a local run there passes on an unchanged screen; CI never reads it. Since the calm first view it holds
one line, Mara's example at 1280×720 (23 controls on Windows, 21 on Ubuntu). It was emptied once: the one
such difference (the cockpit on road 1 at 1280×720, 30 controls on Windows and 27 on Ubuntu) was three road
cards showing only their edge on Windows, which the count no longer takes in. Windows measures one fewer
in one place, the front door at 768×1024 (10 controls; 11 on Ubuntu), where its last button shows only a
strip above the site footer.

## The type scale (S2.5.30d, 2026-10-17)

Six named text sizes, and no others. They are Tailwind theme tokens in `app/globals.css` (`--text-label` …
`--text-display`, each with its line height as a length), used as `text-label` … `text-display`:

| Name | Size | Line | Where it is used |
|---|---|---|---|
| `text-label` | 9.5 px | 13 px | kickers and chips: the mono, uppercase, tracked labels over a block or on a card |
| `text-small` | 10.5 px | 14 px | notes under a field, the legend, a secondary line |
| `text-body` | 13 px | 16 px | running text (the page's default), buttons, rows, the map's card lines (in place of Tailwind's `text-xs`) |
| `text-lead` | 15 px | 20 px | card and column headings, the intake's box, a page's subline (in place of `text-sm`) |
| `text-title` | 19 px | 28 px | section headings, a quoted sentence (in place of `text-lg`) |
| `text-display` | 28 px | 32 px | page titles |

Headlines larger than that (the front door's hero, a door's title, the word mark) keep Tailwind's own steps,
`text-xl` and up. Before this the screens had grown twenty-three ad hoc sizes (`text-[8px]` to `text-[46px]`,
in 661 places, half-pixel neighbours among them), and one screen counted fifteen distinct sizes. Each old
size went to the named size of its group (`tests/helpers/type-scale-renames.ts` has the whole table): 8–9.5 px
to label, 10–10.5 to small, 11–13 (and `text-xs`, 12) to body, 14–15 (and `text-sm`, 14) to lead, 16–19 (and
`text-base`, `text-lg`) to title, 26–28 to display, and the few above to Tailwind's steps. Each named size is
the largest size of its group, so no text is smaller than it was before the scale: the page's default running
text stays 13 px, and text that was 11 or 12 px grows to it (a first version set body at 12 px, lead 14, title
18 and display 26, which took the default running text, *Your plan* and the front door's door bodies down a
pixel; a review found it). The smallest text on any screen is now 9.5 px (the baseline's was 8 px; 8.5 px
after the calm first view). `tests/type-scale.spec.ts` refuses any arbitrary size written as a class (`text-[9px]`,
`text-[0.7rem]`, `text-[length:…]`) and the four Tailwind sizes the named ones replaced, with a control that
plants each kind. A new size is a change to the scale, made in the theme and in this table, never in a
component.

## Convention

| Layer | Location | Purpose |
|-------|----------|---------|
| Design workshop | the dated S2.5.4 notes at the top of each `docs/ui-spec/<page>/` file | Page job, must-show/hide, maintainer sign-off |
| **UI behavior spec** | `docs/ui-spec/<page>/` | Control groups: behavior, copy, state fields, downstream consumers |
| Backend wiring | TBD in each control file | Database, APIs, validation — filled in Phase 5 |

## Folder structure

```
docs/ui-spec/
  README.md
  _control-template.md
  <page>/
    _index.md          # page overview + control index
    <control-group>.md # one file per logical control group
```

**One folder per page** (e.g. `intake/`, `landing/`, `explore/`, `cockpit/`).  
**One file per control group** — not one file per pixel (e.g. all four goal tiles live in `01-goals.md`).

## When to update

When adding, removing, or changing any clickable, form field, search bar, toggle, or nav control:

1. Update the matching `docs/ui-spec/<page>/<group>.md`
2. Update the dated note at the top of the page's `_index.md` if the page's purpose changed

## Template

Copy [\_control-template.md](./_control-template.md) for new control groups.
