# Roads — Reasoning Conventions

Catalog: `lib/engines/roads/v2026/` (1 road as of 2026-10-11) · Design:
[../architecture/future-cockpit.md](../architecture/future-cockpit.md) § 6 · Checks:
`lib/engines/roads/v2026/validate.ts`, run on every road by `tests/roads.spec.ts`

## What it holds

A **road** is one future — a business, a career, or both — drawn as columns of steps, left to right.
Each step has a one-line summary, the steps it leads to (`next`), its *done when* lines, the skill items
it needs, its cost lines, links to official pages the person opens themselves, and its citations. A
**fork** is two steps a person chooses between (stay employed or open your own shop). The map in the
cockpit draws whatever road it is given and holds no steps of its own.

| Road | Id | What it is |
|---|---|---|
| Starting any business in Alberta (tax and structure) | `road-starting-any-business-ab` | Road 0: today's ten-step map (`lib/engines/cfe/v2026/`) wrapped by `roadFromCfe`, unchanged. The general road every saved future is drawn on until it names another |

The first written future, *From apprentice to your own shop (Alberta)*, joins later in phase 1.

## Authoring rules

1. **Every step is cited.** At least one citation per step, and each *done when* line carries its own:
   the page that says that line, read by a person. A step with no citation, or a *done when* line
   without one, fails the checks.
2. **A citation is an https page, checked the way every catalog's citations are**
   ([citations.md](./citations.md)): a real read date (`lastVerified`, `YYYY-MM-DD`, a day that
   exists, with `readBy` when who read it is on record), a tool check (`toolCheck`) with its quotes,
   or both. A read date is the day the page was read, never the day the file was edited, so it can't
   be a day that hasn't come yet (the checks take "today" as the newest date anywhere on Earth). The
   road's own `lastVerified` must be the newest read date in it (a tool check is not a read); road 0's
   is worked out from its nodes. A step's official links (pages the person opens themselves) must be
   https pages too. Screens say how each source was checked in the same words as everywhere else
   (`howCheckedWords`, `lib/engines/shared/citation-check.ts`).
3. **Ids are forever.** Road, column, step, fork, *done when* line and cost line ids are what a
   person's progress, ticks, quotes and picks are kept against. Rename labels freely; never an id.
   Every id must be unique within its road. `tests/roads.spec.ts` keeps the list of every road,
   column, step, fork, *done when* line, cost line and skill item id that has shipped: removing or
   renaming one fails, and a new one must be added to it.
4. **Every step sits in exactly one column**, and columns name only real steps. `next` and a fork's
   two sides name real steps; a column's `forkId` names a real fork.
5. **Three kinds of cost, two in the catalog** (decision 2 of 2026-10-11). An *official fee* has an
   amount in whole cents (never a range or an average) and one citation whose `lastVerified` is the
   day the fee was read there. A *named* line has a name and no amount ("tools: add your quote"); it
   may cite where the name comes from (a blank cash-flow template, linked, not copied). The third kind,
   *your quote*, is the person's agreed number and is never written into a catalog.
   `costLineAsShown` turns a line plus the person's agreed amount into what a screen shows; a named
   line with no agreed amount has no amount at all, so it can't be added up as $0, and neither can a
   quote that isn't a whole, non-negative number of cents. A step's `costs` is a flat list: two fee
   lines can't yet be marked as alternatives (federal or Alberta incorporation), so don't add up every
   official fee on a step; the design's § 6 ("The road type as built") names the two ways to add it.
6. **Skill items are one shared list** (`skillItemsV2026`) so a person's mark carries across roads.
   Each item is cited, and so is its *how to get it* line. A step's `needs` must name items on the list.
   Skills for a job come only from the job the person picked (OaSIS, *your pick of job*); DotAmi never
   claims which skills a business needs.
7. **Content not yet written stays empty, never guessed.** Road 0's *done when* lines, cost lines,
   skill items and official links are empty until they are read from the official pages; the checks
   allow empty lists and refuse uncited entries.
8. **Places use today's values** (`AB`, `BC`, `ON`, `CA`). How places are stored is still the
   maintainer's decision; don't add new place codes here.
9. **No layout in the catalog.** A road says what the steps are and how they connect; how a screen
   draws them is the screen's business. A fork's id is the key its pick is saved under: road 0's forks
   reuse `gstTiming` and `incorporationTiming`, the keys saved branch picks already use. A column's
   `forkId` says which fork is decided in that column, not where a toggle goes; it carries today's two
   toggles over, and the map chooses to show them in the column header.
11. **Lever cards are not on the step yet.** The sketch's `engineHints` is not on `RoadStep`: today's
    cards are matched to a step by its id through `NODE_ENGINE_HINTS` in `lib/brain/node-items.ts`.
    The road-evaluation pull request moves them onto the step; don't add a new road's cards to
    `lib/brain/`.
10. **Road order is the order added**, never a ranking (decision 3).
