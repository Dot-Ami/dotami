# Outside Alberta, honestly: the federal steps, and "Written for Alberta" with your province named

Page: Pick a future (`/futures`, step 3) and the cockpit (`/cockpit?venture=<id>`) · Components: the shared
three-step component (planned), `FutureCardItem`, `components/cockpit/goal-bar.tsx`, the step panel · Road:
a new catalog road built with `roadFromCfe` (`lib/engines/roads/v2026/from-cfe.ts:25-85`) · Words:
`lib/front-door/words.ts` `pickWords`, `lib/cockpit/words.ts`
Type: a card, a fold button, the goal bar's line, a sources line

Last updated: 2026-10-20 (designed before it is built, task 28g, for task 28d. The approved plan's phase 2: the
federal steps that apply everywhere, plus "Written for Alberta" with the person's own province named; full BC
and Ontario roads come in phase 4. Updated 2026-10-21 for the maintainer's call 2: no region question outside
Alberta for now; *About this job* shows the province-wide wage figure. Built 2026-10-21, task 28d with 29j: see
*As built* at the end.)

Mockup: `C:\dotami-wt\designs-phase2\04-outside-alberta.html` (an invented person in Ottawa, corpus idea
`idea-v1-0004`, picking Bakers).

## The federal road

One catalog road, **The federal steps for any business in Canada** (`road-federal-steps-ca`, a permanent id;
`provinces: ["CA"]`, kind *business*), built by `roadFromCfe` from road 0's map stages, with:

- **Alberta-only steps left out.** The register-a-name step (`step-start-register-name`) and every Alberta-only
  page and skill item road 0 carries (`registerName`, `businessNames`, `findRegistry`, `wcbWorkerCoverage`, task
  28d's list). The WCB-Alberta *done when* line on *Hire first employee* is left out with them.
- **Every other step kept as road 0 has it**, its *done when* lines and its rules and tax cards, so the person
  sees the same federal steps an Albertan does: the CRA's records, GST/HST registration (both sides of the
  fork), *Incorporating*, hiring, and the rest. Which of road 0's *before you open* steps stay (the business
  account, the records step, the permits step through BizPaL) is settled by the build's test, one rule: a step
  stays when what it asks the person to do rests on a federal (`CA`) citation; a step whose ask rests only on an
  Alberta page leaves. The step list the build ends with goes in the pull request for the maintainer to read.
- **Each step's sources filtered** to `CA` and the idea's own province when the step is drawn: an Ontario idea's
  *Hire first employee* shows the CRA's payroll page and Ontario's employment-standards guide, not British
  Columbia's (`lib/engines/cfe/v2026/nodes.ts:395-410`); *Service vs. productize* shows the CRA's input tax
  credit page, not Alberta's register-a-name page (`:461-467`). A filtered step says how many it left out
  (below), so nothing is hidden silently.

> **Decided 2026-10-21, the maintainer:** keep BC and Ontario on the list, with the missing roads said in the
> road's own words ("Yes, keep the list").

`FULL_COVERAGE_PROVINCES` (`lib/scenarios/types.ts:23`, AB, BC, ON) **stays as it is.** It says which provinces'
rules, grants and structure entries the catalogs carry, and that is true for BC and Ontario: the rules and tax
cards pick entries by each entry's own province list (`lib/brain/evaluate.ts` `provinceMatches`), and the
catalogs hold Ontario and BC entries (`lib/engines/compliance/v2026/rules.ts`, 8 lines naming `"ON"`;
`grants/v2026/programs.ts`, 5; `structure/v2026/ladder.ts`, 5). The constant drives the words that say so: the
intake's *Federal rules apply …* note (`components/discovery/intake-page.tsx:391-396`), the place receipt
(`lib/front-door/receipts.ts:86`) and the cockpit legend's *federal rules only for this province*
(`lib/cockpit/words.ts:747`). Taking BC and Ontario out would make those lines say "federal rules only" to an
Ontario idea while its Ontario rules and grants still show. What isn't written for BC and Ontario is a
**road** (their steps), and that is said by the road's own words below (*<province>'s own steps aren't
written yet*), which read the roads' `provinces`, as the place receipt already counts the roads written for a
place apart from the rules (*Ontario's rules and the federal rules apply.*, then how many futures are written
for it, `lib/front-door/words.ts:83-87`). The phase 2 task text asked for the constant to stop listing BC and
Ontario; this design meets what that asked for (nothing calls BC or Ontario covered by a road) without making
the rules lines untrue, and the pull request asks the maintainer to confirm it.

## Who sees it

Only a person whose place is outside Alberta and inside Canada. An Albertan doesn't: road 0 already holds the
same federal steps with Alberta's own. Outside Canada is unchanged: the flow stops at *Your destination* with
*only Canada is mapped* (issue #45).

## Pick a future, step 3, for a person outside Alberta

- The nav's back link reads **← Back to where you are** (step 2 outside Alberta asks nothing and says why,
  [02-where-you-are.md](./02-where-you-are.md)).
- The pick line and the no-road block (*No road is written for Bakers (63202.00) yet.*, with *About this job*
  in place; [03-road-match.md](./03-road-match.md) case B), when the job has no road; every road is Alberta's or
  the federal one today, so outside Alberta every job has no road of its own.
- **Written for all of Canada**: the federal road's card. Today's card lines, plus *The federal steps only.
  Ontario's own steps aren't written yet; a step shows an Ontario page only where a federal step cites one.*
- **Written for Alberta**, folded to one button: **Show the 2 futures written for Alberta**. Opened, the two
  cards show as today, each with today's *Written for Alberta. You said Ontario.* Folded so the person's own
  place comes first and the controls stay within the limit (one **Look inside** plus one fold button, where today
  there are two **Look inside**).

## In the cockpit, on the federal road

- **Goal bar:** *Future: The federal steps for any business in Canada · Ontario's own steps aren't written yet*
  (in place of today's *Map drawn: Starting any business in Alberta · written for AB; this idea is in ON*,
  `lib/cockpit/words.ts:32-33`, which still shows for an idea that opens an Alberta road from outside Alberta).
- **The step panel's sources:** *Sources for this step · n* as today, then, when the filter left some out,
  *<n> sources for other provinces aren't shown.* No button: they cite other provinces' pages, and the line
  says they exist so nothing is left out unsaid.
- **The rules and tax cards** pick entries by each entry's province list (`lib/brain/evaluate.ts:94-103`):
  an Ontario or BC idea sees the federal entries and its own province's entries the catalogs carry; any other
  province sees federal entries only, with the legend line *federal rules only for this province*
  (`words.ts:747`). Unchanged. So on the federal road an Ontario idea's steps are the federal ones, and its
  rules and tax cards still include Ontario's; the goal bar's line speaks of steps only, never of rules.
- **About this job** opens from **Look closer** as on any road. Outside Alberta no region is asked (decided
  2026-10-21, the maintainer's call 2, "province-wide"; [02-where-you-are.md](./02-where-you-are.md), *Outside
  Alberta*), so its wage row is always the one the wage file gives for the province as a whole, labelled by its
  own source code (*Ontario-wide figure* for a `PR` code), with the line *DotAmi asks your region only in
  Alberta for now, so this is the row the wage file gives for Ontario as a whole, with the level its own code
  gives it.* and no **Change**. Its *Where to look yourself* row leaves out Alberta's trade list (Tradesecrets)
  and says why ([../cockpit/about-this-job.md](../cockpit/about-this-job.md)).

## Words

```words
roadLabel: "The federal steps for any business in Canada",
pickWords (additions) = {
  canadaHeading: "Written for all of Canada",
  albertaHeading: "Written for Alberta",
  federalOnly: "The federal steps only. <province>'s own steps aren't written yet; a step shows a <province> page only where a federal step cites one.",
  showAlberta: "Show the <n> futures written for Alberta",
  hideAlberta: "Hide the futures written for Alberta",
}
cockpitWords (additions) = {
  goal.federal: "Future: <road> · <province>'s own steps aren't written yet",
  steps.otherProvinces: "<n> sources for other provinces aren't shown.",
  steps.otherProvincesOne: "1 source for other provinces isn't shown.",
}
```

Kept as they are: `pickWords.writtenFor` (*Written for all of Canada.*, `allOfCanada`), `pickWords.youSaid`
(*You said Ontario.*), `cockpitWords.goal.drawnOnly`.

## What is new on the screen vs today

| Today (an Ontario person) | With this design |
|---|---|
| Two Alberta cards, each *Written for Alberta. You said Ontario.* | The federal road's card first, under *Written for all of Canada*; the Alberta cards one click away, unchanged |
| Opening one draws an Alberta road (*Map drawn: … written for AB; this idea is in ON*) | The federal road draws only the steps that apply in Ontario, each with its federal and Ontario sources |
| BC and Ontario are labelled as having their provincial rules (`FULL_COVERAGE_PROVINCES`) | Unchanged: true of the rules and tax cards. The missing BC and Ontario roads are said by the road's own lines |

## Regions and controls

- **Pick a future:** 6 regions as today. Controls: one **Look inside** and the fold button in place of the two
  **Look inside**, so today's count. The clutter test measures an Alberta place today; the build adds an
  Ontario place to the measured screens (29j) with its first row at or under `futures`.
- **The cockpit on the federal road:** the same regions and controls as road 0 (its own clutter row from 29j,
  at or under `cockpit-road-0`: 7, 8 and 8 regions; 17, 29 and 27 controls); one or two steps fewer.

## How a screen reader hears it

- The two groups are level 2 headings; the fold button is a disclosure (`aria-expanded`) named by its words,
  controlling the Alberta list.
- The goal bar's line is read as one line, after the future's name, as today.
- *<n> sources for other provinces aren't shown.* is read after the step's sources list.

## Phone (375 px)

One column: the no-road block, the federal card, the fold button. Opening the fold puts the two Alberta cards
under it.

## Not in this version

- A full Ontario or BC road (their registries, fees, sales-tax rules; phase 4).
- The area and region questions for a person outside Alberta ([02-where-you-are.md](./02-where-you-are.md)):
  step 2 says why nothing is asked there; the region question is added province by province once each list is
  checked against Statistics Canada's own pages (the maintainer's call 2 of 2026-10-21).
- Any place outside Canada.

## Checked against the rules

Every string in the words block was run through `VERDICT_WORDS`, `findVerdicts` and `findTimeWords` on
2026-10-20: no finding. Since 2026-10-21 `tests/road-federal-steps.spec.ts` runs them on every change.

## As built (2026-10-21, task 28d with 29j)

- **The road:** `lib/engines/roads/v2026/federal-steps-ca.ts`, built by `roadFromCfe` from road 0's own parts
  (`roadZeroParts` in `starting-any-business-ab.ts`), so a change to road 0's federal steps reaches it. The
  build's rule, as the spec asks: a *before you open* step stays when its sources or its *done when* lines hold a
  federal (`CA`) page. The step list it ends with (13; road 0 has 14): *Employee/Apprentice baseline*, *Sole Prop
  activation*, *Voluntary GST registration*, *Mandatory GST registration*, *Incorporating*, *Incorporation for
  liability/SR&ED*, *Hire first employee*, *Service vs. productize*, *Retained earnings planning*, *SR&ED
  deepening*, *Look up your permits and licences (BizPaL)*, *A separate bank account for the business, if it has
  a name other than yours*, *Keep your records from day one*. Left out: *Register your business name, if you use
  one*, and every *done when* line, cost line and official link resting on an Alberta page (two lines:
  `dw-start-hire-wcb`, `dw-start-service-name`). Road 0's step and line ids are kept, and its two forks stay the
  map's own toggles (`forksAreTheMapToggles`).
- **Sources filtered when drawn**, not in the catalog: the road keeps each step's sources as road 0 has them;
  the step panel and *Your plan* draw the federal ones and the idea's own province's (`citationsForPlace`) and
  say *<n> sources for other provinces aren't shown.* On map stages the heading keeps its own words, *Sources for
  this stage · n*. **Export** does the same since 2026-10-22 (review of 28d): the cockpit sends the drawn road
  with the request (`app/api/playbook/route.ts`, a road nobody wrote is refused), and each section of the
  export lists the same sources with the same line under them (`lib/playbook/build-skeleton.ts`). Since
  2026-10-23 (the maintainer's call a-call-12) road 0 and road 1 draw them the same way, for the idea's own place:
  until then every source was kept there, so a person in Alberta saw Ontario's and British Columbia's
  employment-standards pages under *Hire first employee*, which now cites Alberta's own. The same day (review of
  the pull request) a road opened from another province also leaves out each step's *done when* lines, cost lines
  and official links resting on another province's page, by the federal road's rule, for any place
  (`roadForPlace`, applied in `cockpitInput` and the cockpit's drawn road), and the step's line counts those
  pages too (`stepSourcesForPlace`). The storage checks ticks and quotes against the whole road and keeps a tick
  on a line left out for the idea's place whatever list a save sends (`ticksToSave` in `lib/futures/types.ts`,
  second review, 2026-10-24), and the cockpit sends it too, by the place on screen, so ticking another line, or
  *Take back*, from Ontario never removes it, and moving back shows it again. The same review left out a skill
  item none of whose sources is federal or the place's own (road 1's three Alberta items, seen from another
  province), its pages counted in the step's line, and drew each listed item's sources for the place
  (`skillItemsForPlace`); a section left empty by the place says so, where it said none is written yet (*This
  step's “done when” lines rest on other provinces' pages, so none is shown for your place.*; road 1 from Ontario
  shows it on 13 of its 17 steps). Steps are not removed: an Alberta idea moved to Ontario keeps *Register your business
  name, if you use one*, with its summary as written, no *done when* lines and the count.
- **Pick a future:** step 3 of the three steps (`components/front-door/job-and-road-steps.tsx` `RoadStep`, on
  Pick a future and at the end of the intake): the federal card under *Written for all of Canada*, then the
  Alberta futures folded under *Written for Alberta*, after the no-road block or the skipped lines; the federal
  card's own line is drawn by `components/front-door/future-card.tsx`. Outside Alberta a job is matched only
  against the roads written for the person's place, so every job there is case B. (First built as its own list,
  `futures-list.tsx`, before the three steps; folded into step 3 when the two were joined, 2026-10-22.) The two
  lines above the groups say what is below them there ([03-road-match.md](./03-road-match.md)'s words are
  Alberta's, unchanged in Alberta): the no-road block's heading, which names the person's place (*No road is
  written for <job> (<code>) in Ontario yet.*, because a folded Alberta future may be written for the job and
  its card says so), its body, *If you plan to run a business of your own, the federal steps below are written
  for all of Canada, not for <job>. The futures written for Alberta are folded below them, and each card says
  what it's written for. Opening a future doesn't say you're starting a business.*, and the skipped
  line, *You didn't pick a job, so no future is matched to one. These are all the futures written so far: the
  federal steps, written for all of Canada, then the futures written for Alberta, folded below. Each group is in
  the order it was written.* (`pickWords.noRoad.body`, `pickWords.skipped` in `lib/front-door/words.ts`).
- **Your destination** counts the federal road for a place outside Alberta apart from the place's own: *1 future
  listed is written for all of Canada; none is written for Yukon yet.* where it said *No future listed is written
  for Yukon yet …* (`placeReceipt` in `lib/front-door/receipts.ts`, words in `lib/front-door/words.ts`). The first
  build counted it as written for the place (*1 future listed is written for Yukon.*), which the federal card
  contradicted (*Yukon's own steps aren't written yet*); the second review (2026-10-22) split the count. Alberta
  is unchanged (*2 futures listed are written for Alberta.*): the federal road isn't listed there.
- **Not here yet?** keeps the note and, outside Alberta, opens the federal steps (the maintainer's call 33 of
  2026-10-22, "It should do this for now"; `notHereRoad` in `lib/front-door/futures.ts`), with its three lines
  saying so: *Say what you'd look into, in your own words. It is kept as one of your statements, and the federal
  steps open.*, the button *Keep my note and look inside the federal steps*, and, if the road can't be opened,
  *Your note is kept. The federal steps couldn't be opened: no database reachable.* In Alberta it opens road 0, as
  before. The 13 corpus ideas outside Alberta that keep a note are now drawn on a road written for their place.
- **An Alberta future picked from outside Alberta**, behind *Show the 2 futures written for Alberta*, still draws
  an Alberta road, said by the goal bar's *Map drawn: … written for AB; this idea is in …*. The maintainer's call
  35 of 2026-10-22: an honest end, "they were told and chose it", as long as both labels stay on screen. The
  harness checks both for the 9 corpus ideas whose invented person does this (the card's *Written for Alberta.*
  and *You said <province>.*, with its line about the job picked, and the cockpit's line;
  `tests/helpers/idea-invariants.ts` `honestAlbertaPick`), and fails the end again without any one of them: *Written for Alberta.*, *You said <province>.*, the job line,
  the cockpit's line (each planted in `tests/idea-harness-plants.spec.ts`). The job line is the screen's own
  (`cardJobLine` in `lib/front-door/road-match.ts`), and `tests/future-card-honest-pick.spec.ts` finds every card label
  the harness reads in what `components/front-door/future-card.tsx` draws. The browser sweep still does it every week with a fixed idea (361, fixing
  bikes in Ottawa, road 1).
- **The card's sources line** counts only the sources the person will be shown inside (the maintainer's call 34 of
  2026-10-22): each step's own sources through `citationsForPlace`, the step panel's filter (`futureCards` with the
  person's province). On road 0 and road 1 every source shows, so their cards count as before.
- **About this job** outside Alberta (its province-wide wage row, Tradesecrets left out) is task 25h's.
- **Clutter** (`e2e/budgets.ts`, two new rows by the written way, `ADDED_SCREENS`; measured with Chromium on
  Windows, phone, tablet, laptop): *Pick a future* in Ontario (`futures-outside-alberta`) 6, 6, 6 regions and
  5, 7, 5 controls, at or under *Pick a future* in Alberta (6 regions; 5, 7, 6 controls); the cockpit on the
  federal road (`cockpit-federal`) 7, 8, 8 regions and 17, 29, 27 controls, the same as `cockpit-road-0`.
  Since the batch 4 follow-up (2026-10-22), `futures-outside-alberta`'s budget is what CI's Ubuntu run counts on main
  (run 39879574374): 4, 6 and 4 controls, one fewer than its first row at every size.
