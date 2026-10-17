# Roads — Reasoning Conventions

Catalog: `lib/engines/roads/v2026/` (2 roads as of 2026-10-12; a step both share since 2026-10-14) · Design:
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
| Starting any business in Alberta (tax and structure) | `road-starting-any-business-ab` | Road 0: today's ten-step map (`lib/engines/cfe/v2026/`) wrapped by `roadFromCfe`, plus its own content (2026-10-12): 47 *done when* lines (three or four on each of the ten map stages, and on the new steps) and three *before you open* steps in the first column (register your business name, look up permits and licences on BizPaL, a separate bank account), every new source a tool check; seven named start-up cost lines on *Sole Prop activation*. Since 2026-10-14 a fourth step in the first column, *Keep your records from day one* (`step-start-keep-records`, four more lines, 51 in all). The general road every saved future is drawn on until it names another |
| From apprentice to your own shop (Alberta) | `road-apprentice-to-own-shop-ab` | The first written future (`apprentice-to-own-shop-ab.ts`): a Cabinetmaker's training, the certificate, the fork between staying employed and opening a shop, and the first years on your own; then it joins road 0 at *Incorporating*. Every source is a tool check. Listed on *Pick a future* since 2026-10-13, where its card says its sources were checked by a tool, not read by a person. Since 2026-10-14, *Keep your records from day one* (`step-shop-keep-records`) is first in *Open the doors*, 17 steps in all |

**Keep your records from day one** (2026-10-14, `keep-records.ts`): one step on every business road,
because a business must keep its records from the start and records missed early are hard to put back
together later. It is written once and each road builds it with its own permanent ids (`keepRecordsStep(ids,
next)`), so the two can't drift apart. Its four *done when* lines come from the CRA's own *Keeping
records* pages (who has to keep records and what counts; what the CRA says happens without them; how
they must be kept, electronic records and backups included; where, and for how long: generally six years
from the end of the last tax year they relate to, with the CRA's note that records kept outside Canada and
opened from Canada don't count as kept in Canada, and two of the other periods the CRA lists, indefinitely
for records about long-term property and six years from the filing date for a late return), each a tool
check made that day, no read claimed. The summary says it is the CRA speaking, since the CRA's page covers
only the laws it administers. It has no cost line (keeping records has no official fee) and one official
link, the CRA's *Keeping records* page. How road evaluation colours it is the road's own arrows, not a
rule: no rule reads a sale, an expense or any other answer for it. Each road places it where that road's
business begins (the CRA's pages say records are kept by persons carrying on a business). On road 0 it is in the first
column with the other *before you open* steps, leading to *Sole Prop activation* (records cover what a
business spends as well as what it takes in, and spending can start before the first sale); nothing
leads to it, so it is on the path for every idea, whatever its structure or work situation, until the
person marks it *not for me*. On road 1 only *Open your own shop* leads to it, so it says *check first*
while the fork has no pick, is on the path once the person picks their own shop, and is off the path if
they stay employed. A new business road adds it the same way, where its business begins
(`tests/keep-records-step.spec.ts`).

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
5. **Three kinds of cost, two in the catalog** (decision 2 of 2026-10-11). An *official fee* is written
   once, in the official fees catalog ([fees.md](./fees.md), since 2026-10-12): a road's fee line names
   it by `feeId` and is built with `feeLine(lineId, label, feeId)`, which copies the fee's amount,
   source and condition; never type an amount in a road file (a test refuses one). The line keeps its
   own permanent id and label. A fee has an
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
   claims which skills a business needs, so the government's list is its own catalog
   (`lib/engines/oasis/v2026/`), never in `needs`. A legal requirement the compliance catalog already
   cites is built from that entry and carries its citations (road 0's GST/HST registration, 2026-10-12).
7. **Content not yet written stays empty, never guessed.** Road 0's *done when* lines and its
   *before you open* steps are written (2026-10-12, in `starting-any-business-ab.ts`, passed to
   `roadFromCfe` as `doneWhen` by step id and `addedSteps` by column); its map stages' skill items and
   official links are empty until they are read from the official pages, and so are their cost lines,
   except *Sole Prop activation*'s seven named start-up lines (2026-10-12, passed as `costs` by step id:
   tools and equipment, space deposit, insurance, vehicle, first materials, software, money to live on
   while starting; names only, no amount, no source yet: [future-cockpit.md § 6, *The official fees
   catalog and start-up cost lines as built*](../architecture/future-cockpit.md)); the checks allow
   empty lists and refuse uncited entries.
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
12. **A step for some kinds of work only says which, and stays on the map** (2026-10-13, issue #40).
    `onlyForKindsOfWork: { tags }` on a step: `tags` are the intake's kinds of work
    (`ACTIVITY_TAXONOMY` in `lib/journey/intent.ts`), one of which the step needs to be on the path.
    Without one of them, road evaluation puts the step off the path, with a reason naming the kinds of work
    on the idea and the ones the step needs (*"None of the kinds of work on this idea is …, and this step is
    on your path only with one of them."*), never what the person did or didn't tell DotAmi: a kind of work
    they typed in their own words may say the same thing and still not be one of these. The catalog writes
    no sentence for it. The step is still drawn and still opens, never removed (the map doesn't pre-filter
    paths). Use it only where the step's own sources make it about that work (road 0's *SR&ED deepening*:
    scientific research and experimental development), and keep the tags the same as any rule that
    already reads them for the step (a test holds road 0's equal to the rules'), with every lever card the
    step names grey without one of them (a dashed card hides its lever cards; a test holds that too). The
    checks refuse an empty list; `tests/research-steps.spec.ts` refuses a kind of work the intake doesn't
    ask.
13. **A new road comes with the ideas that should reach it, and passes the idea harness** (S2.5.29g,
    the plan of 2026-10-17). Add at least 10 ideas to the idea corpus (`tests/fixtures/ideas/v1.ts`, at
    the next free numbers, written the way a person would type them) whose `road` is the new one: people
    of different kinds, and the odd ways they write (a city with no province, two provinces, French, a
    typo). Give the road a name in the corpus's `ROAD_IDS` (and `ExpectedRoad`) so ideas can expect it:
    `tests/idea-corpus.spec.ts` counts the ideas expecting each road in the catalog (`roadsV2026`) and
    fails while one has fewer than 10, so a road with no name there counts 0 and fails. The harness's
    *Pick a future* way in runs every named road. `npm run test` then
    runs `tests/idea-harness.spec.ts`, which takes every idea through the app the way a person's words go
    through it today and checks, on the new road too: no verdict words, no $0 for a blank cost line, every
    amount an official fee, the person's own or quoted by a citation, no times (a period an official page
    requires, such as "1,360 hours", is listed with its step in `tests/helpers/time-words.ts`), every path
    ending somewhere honest (every fork side reaches the road's end or its join, every question asked
    changes something), nothing derived, and the same output for the same input. It fails on any failure
    the known-gaps list (`tests/fixtures/ideas/known-gaps.ts`) doesn't name, and on any gap it names that
    now passes, so a road that fixes a gap takes those ideas off the list in the same pull request. What
    it saw is written to `test-results/idea-coverage.md`.

How a road meets a person's answers (each step's state and its reason, the four gauges, the receipts)
is not in the catalog: it is `lib/roads/` ([future-cockpit.md § 6, *Road evaluation as
built*](../architecture/future-cockpit.md)). What in a road file it reads: a fork's two sides and the
`next` arrows decide which steps are on a person's path once they pick, a step's `onlyForKindsOfWork`
puts it off the path for an idea without one of its kinds of work (rule 12), and a step's cost lines count
in the sums only while that step is on the path.
