# Outside Alberta, honestly: the federal steps, and "Written for Alberta" with your province named

Page: Pick a future (`/futures`, step 3) and the cockpit (`/cockpit?venture=<id>`) · Components: the shared
three-step component (planned), `FutureCardItem`, `components/cockpit/goal-bar.tsx`, the step panel · Road:
a new catalog road built with `roadFromCfe` (`lib/engines/roads/v2026/from-cfe.ts:25-85`) · Words:
`lib/front-door/words.ts` `pickWords`, `lib/cockpit/words.ts`
Type: a card, a fold button, the goal bar's line, a sources line

Last updated: 2026-10-20 (designed before it is built, task 28g, for task 28d. The approved plan's phase 2: the
federal steps that apply everywhere, plus "Written for Alberta" with the person's own province named; full BC
and Ontario roads come in phase 4. Updated 2026-10-21 for the maintainer's call 2: no region question outside
Alberta for now; *About this job* shows the province-wide wage figure.)

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
2026-10-20: no finding.
