# Roads — Reasoning Conventions

Catalog: `lib/engines/roads/v2026/` (2 roads as of 2026-10-12) · Design:
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
| Starting any business in Alberta (tax and structure) | `road-starting-any-business-ab` | Road 0: today's ten-step map (`lib/engines/cfe/v2026/`) wrapped by `roadFromCfe`, plus its own content (2026-10-12): 47 *done when* lines (three or four on each of the ten map stages, and on the new steps) and three *before you open* steps in the first column (register your business name, look up permits and licences on BizPaL, a separate bank account), every new source a tool check. The general road every saved future is drawn on until it names another |
| From apprentice to your own shop (Alberta) | `road-apprentice-to-own-shop-ab` | The first written future (`apprentice-to-own-shop-ab.ts`): a Cabinetmaker's training, the certificate, the fork between staying employed and opening a shop, and the first years on your own; then it joins road 0 at *Incorporating*. Every source is a tool check. Listed on *Pick a future* since 2026-10-13, where its card says its sources were checked by a tool, not read by a person |

A road may name where it carries on after its last column: `joins: { roadId, columnId }`
(`roadJoinProblems` checks the road and column exist).

## Authoring rules

1. **Every step is cited.** At least one citation per step, and each *done when* line carries its own:
   the page that says that line, read or checked by a tool (rule 2). A step with no citation, or a
   *done when* line without one, fails the checks. A line says only what its quotes or its read
   support.
2. **A citation is an https page, checked the way every catalog's citations are**
   ([citations.md](./citations.md)): a real read date (`lastVerified`, `YYYY-MM-DD`, a day that
   exists, with `readBy` when who read it is on record), a tool check (`toolCheck`) with its quotes,
   or both. A read date is the day the page was read, never the day the file was edited, so it can't
   be a day that hasn't come yet (the checks take "today" as the newest date anywhere on Earth). The
   road's own `lastVerified` must be the newest read date in it (a tool check is not a read), and
   empty when none of its sources has been read yet; road 0's is worked out from its nodes. A tool
   check is recorded only after `node scripts/check-quotes.mjs --url … --quote …` found every quote
   that day; a quote it can't find (the page changed, a PDF, a page that blocks tools) is not
   recorded, and the line is rewritten to what the page says now or left out. Never write a read
   date for a page nobody read. A step's official links (pages the person opens themselves) must be
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
   amount in whole cents (never a range or an average) and one citation: a read (its `lastVerified`
   is the day the fee was read there), or a tool check whose quotes include the amount as the page
   writes it (`$150`, `$150.00`, `$1,500`; a $0 fee is exempt, since pages say "no cost"), and not as
   one end of a range (`$150-$200`, `$150 to $200`, `between $100 and $150`, `from $150` are refused).
   A fee that applies only sometimes (a rewrite after a failed exam) carries `onlyIf`, the condition in
   plain words, and says so in its label too; the checks refuse a label saying "only if" with no
   `onlyIf`, and a blank `onlyIf`. A total must leave such a fee out unless the person says the
   condition holds. A *named* line has a name and no amount ("tools: add your quote"); it
   may cite where the name comes from (a blank cash-flow template, linked, not copied). The third kind,
   *your quote*, is the person's agreed number and is never written into a catalog.
   `costLineAsShown` turns a line plus the person's agreed amount into what a screen shows; a named
   line with no agreed amount has no amount at all, so it can't be added up as $0, and neither can a
   quote that isn't a whole, non-negative number of cents. A step's `costs` is a flat list: two fee
   lines can't yet be marked as alternatives (federal or Alberta incorporation), so don't add up every
   official fee on a step; the design's § 6 ("The road type as built") names the two ways to add it.
6. **Skill items are one shared list** (`skillItemsV2026`) so a person's mark carries across roads.
   Each item is cited, and so is its *how to get it* line. A step's `needs` must name items on the list.
   A `legal-requirement` is something an official page says a person must hold or have for that step
   (a registration number, an agreement, a certificate); a certificate a page calls optional is not one.
   Skills for a job come only from the job the person picked (OaSIS, *your pick of job*); DotAmi never
   claims which skills a business needs.
7. **Content not yet written stays empty, never guessed.** Road 0's *done when* lines and its
   *before you open* steps are written (2026-10-12, in `starting-any-business-ab.ts`, passed to
   `roadFromCfe` as `doneWhen` by step id and `addedSteps` by column); its map stages' cost lines,
   skill items and official links are empty until they are read from the official pages; the checks
   allow empty lists and refuse uncited entries.
8. **Places use today's values** (`AB`, `BC`, `ON`, `CA`) in the catalog for now. The maintainer
   decided on 2026-10-11 that places are stored as international codes (`CA`, `CA-AB`); the storage
   code maps today's values to them (`lib/places/codes.ts`), and moving the catalogs over is a later
   pull request. Don't add a new place value here until then.
9. **No layout in the catalog.** A road says what the steps are and how they connect; how a screen
   draws them is the screen's business. A fork's id is the key its pick is saved under: road 0's forks
   reuse `gstTiming` and `incorporationTiming`, the keys saved branch picks already use. A column's
   `forkId` says which fork is decided in that column, not where a toggle goes; it carries today's two
   toggles over, and the map chooses to show them in the column header. Road 0's picks are kept in
   `ScenarioState.activeBranches`, as before; every other road's picks are kept on the saved future
   (`Venture.forkPicks`; docs/architecture/future-cockpit.md § 7, Storage as built).
11. **A step names its own lever cards** in its optional `engineHints`, by catalog id (2026-10-12,
    the cockpit screen; until then they were matched by step id through `NODE_ENGINE_HINTS` in
    `lib/brain/node-items.ts`, which now reads road 0's from the road). Whether a card applies is
    still the rules' call; the hint only says the card is about this step. Don't add a road's cards
    to `lib/brain/`.
10. **Road order is the order added**, never a ranking (decision 3).

How a road meets a person's answers (each step's state and its reason, the four gauges, the receipts)
is not in the catalog: it is `lib/roads/` ([future-cockpit.md § 6, *Road evaluation as
built*](../architecture/future-cockpit.md)). What in a road file it reads: a fork's two sides and the
`next` arrows decide which steps are on a person's path once they pick, and a step's cost lines count
in the sums only while that step is on the path.
