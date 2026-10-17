# UI behavior specs

Last updated: 2026-10-17 (the layout rule and the clutter limit, below); 2026-06-10

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
| *Others in this line of work* ([cockpit/landscape.md](cockpit/landscape.md)) | The right-hand panel | The goal bar, and a step that opens a business |
| *About this job* (the job's facts, wages and requirements) | The right-hand panel | The goal bar, and the skills list |
| The Lens ([architecture/use-cases.md](../architecture/use-cases.md)) | The right-hand panel; on a phone, a sheet (`components/cockpit/use-sheet.ts`) | One button in the header, and *Ask the Lens about this* in the step panel |
| *Sort by one thing you choose* ([architecture/lens-comparisons.md](../architecture/lens-comparisons.md)) | Inside the list it sorts | Only on *Your futures* and *Compare*, nowhere else |

### The clutter limit (`e2e/clutter-budget.spec.ts`)

A browser test opens the main screens (the front door, *Your destination*, *Pick a future*, the intake,
the cockpit on road 0 and on road 1 as a first visit, *Your plan*, *Your futures*, *What DotAmi knows about
you* and the example, Mara) at 375×812, 768×1024 and 1280×720, and measures four things on each:

| Measure | What it counts |
|---|---|
| Regions | Blocks marked `data-region="<name>"` that are drawn (not hidden, not zero-sized), anywhere on the page |
| Controls | Links, buttons, boxes, menus and switches that can be used (not disabled, not behind a sheet) and are at least partly inside the first window, before any scrolling; a control inside another counts once |
| Text sizes | Distinct computed font sizes of the text drawn on the page (text a screen reader alone hears is left out) |
| Smallest text | The smallest of those sizes, in px |

The limits are in `e2e/budgets.ts`. They started at what each screen measured on 2026-10-17 (the baseline,
kept beside them), and they can only go down: a unit test (`tests/clutter-budgets.spec.ts`) fails if any
limit is above its baseline or above what it is on main, or the smallest text below either, so a limit once
lowered can't be raised back later (CI compares with main; locally, with where the branch left
`origin/main`). A screen over its limit fails the browser
suite. To add a region, take one away first; a new screen arrives with its own `data-region` marks and its
own row in `e2e/budgets.ts`. The test saves a screenshot of each screen at each width with its results.

The numbers are the gate's: Chromium on Ubuntu, in CI's *Browser tests* job. Chromium on Windows measured
the same on 2026-10-17 at every screen and size but one: the cockpit on road 1 at 1280×720 has 30 controls
in its first window there and 27 on Ubuntu. `WINDOWS_EXTRA` in `e2e/budgets.ts` adds those 3 for a run on
Windows only, so a local run there passes on an unchanged screen; CI never reads it.

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
