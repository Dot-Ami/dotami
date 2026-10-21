# Where you are: your area, then your region (step 2 of 3)

Page: Pick a future (`/futures`), and the intake's last screen on the typed way · Component: the shared
three-step component (`components/front-door/job-and-road-steps.tsx`, planned; words `lib/front-door/words.ts`
`whereStepWords`; the lists: `lib/places/alberta-areas.ts` and the economic-region catalog of task 25e)
Type: wizard step, two parts, one question each (a drop-down each)

Last updated: 2026-10-20 (designed before it is built, task 28g, for tasks 23g and 25e. The maintainer's picks
of 2026-10-20: the area is asked once, right after the job pick; only "which area" for now, the industry
question waits for phase 3; Statistics Canada publishes no standalone city-to-economic-region file, so DotAmi
asks "which region are you in?" with the regions listed. Research: `25s-wage-regions.md`.)

Mockup: `C:\dotami-wt\designs-phase2\02-where-you-are.html`.

## When it is asked

Right after a job is picked in step 1, once, before the futures. **Skip** on step 1 skips this step too: with
no job there is no wage row to choose, and the area alone reads nothing in this version, so neither question
is asked (step 3 opens at once). Outside Canada the flow never starts: Pick a future already stops at
*Your destination* with *only Canada is mapped* (issue #45, unchanged).

## What it is

Two parts in the step region, one question on screen at a time, so each fits the phone's limit:

**2a. Which area are you in?** (Alberta only, see *Outside Alberta* below)

- *Your pick of job: Barbers · 63210.02* at the top, and the nav's back link reads **← Change your pick of job**
  (it takes the place of **← Your destination**, so it is not an extra control).
- The question, its why-line, and one drop-down: *Choose one* (nothing picked), then **Calgary**,
  **Edmonton**, **Lethbridge**, **Red Deer** (Alberta's four census metropolitan areas in the 2021 census, A to
  Z), **Somewhere else in Alberta** and **I don't know**.
- A hint under it saying what the four areas are.
- **Next →**. Leaving *Choose one* is allowed: the area is then not kept (null, never "I don't know").

**2b. Which region are you in?**

- The area answer shown back (*Your area: Somewhere else in Alberta*). The nav's back link now reads **← Back
  to your area** (the nav's one back link always goes back one part: from 2a to step 1, from 2b to 2a).
- The question, its why-line, and one drop-down: *Choose one*, then Alberta's eight economic regions as
  Statistics Canada publishes them, in its code order (4810 to 4880), and **I don't know**:
  1. Lethbridge–Medicine Hat (4810)
  2. Camrose–Drumheller (4820)
  3. Calgary (4830)
  4. Banff–Jasper–Rocky Mountain House (4840)
  5. Red Deer (4850)
  6. Edmonton (4860)
  7. Athabasca–Grande Prairie–Peace River (4870)
  8. Wood Buffalo–Cold Lake (4880)

  The published names use a double hyphen (*Lethbridge--Medicine Hat*); the catalog keeps them as published,
  and the screen draws an en dash so a screen reader doesn't say "dash dash". The code isn't shown in the
  list; it is what is kept.
- **Which towns are in each region? Statistics Canada's list ↗**, a fixed link to the economic-region page for
  Alberta (`https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVD=1368923&CVD=1368932&CPV=48&CST=01012021&CLV=2&MLV=5`,
  read 2026-10-20 by research 25s), opening in the person's browser, carrying nothing about them.
- **Next: the futures →**.

**Never derived.** The region is never filled in, pre-selected or narrowed from the area, even where the area
sits wholly in one region (Calgary, Lethbridge, Red Deer, research 25s): the person picks it. The why-line says
why the two are asked apart. Neither is ever read from the idea's words or from *More about where* (which is
not in this version).

## Words (as they would sit in `lib/front-door/words.ts`)

```words
whereStepWords = {
  stepCount: "2 of 3 · Where you are",
  heading: "Where you are in Alberta",
  picked: "Your pick of job: <job> · <code>",
  area: {
    label: "Which area are you in?",
    why: "Kept with this future for the official counts of businesses by area, which aren't in this version. Until then nothing reads it.",
    hint: "The four areas are Statistics Canada's census metropolitan areas: a city and the towns around it.",
    choose: "Choose one",
    calgary: "Calgary",
    edmonton: "Edmonton",
    lethbridge: "Lethbridge",
    redDeer: "Red Deer",
    elsewhere: "Somewhere else in Alberta",
    dontKnow: "I don't know",
    next: "Next →",
    shownBack: "Your area: <area>",
    back: "← Back to your area",
  },
  region: {
    label: "Which region are you in?",
    why: "Job Bank publishes wages by economic region, a larger map than a city's area. DotAmi doesn't work your region out from your area: the Edmonton area reaches into two regions, and “Somewhere else in Alberta” could be any of them.",
    order: "Listed in Statistics Canada's code order.",
    dontKnowNote: "With “I don't know”, About this job shows the Alberta-wide figure.",
    lookup: "Which towns are in each region? Statistics Canada's list ↗",
    next: "Next: the futures →",
  },
  outside: {
    heading: "Where you are in <province>",
    areaNotAsked: "The area question lists Alberta's areas only in this version, so it isn't asked for <province>.",
    oneRegion: "Job Bank publishes one region for <province>, so there is nothing to pick here.",
  },
  kept: "Both answers are kept with this future once you open it, on this computer only. Change them from About this job in the cockpit.",
}
```

## Outside Alberta (a person whose place on *Your destination* is another province or territory)

- **2a is not asked.** The area list is Alberta's census metropolitan areas only in this version, and the
  counts it waits for are Alberta-first. The step opens on 2b with *The area question lists Alberta's areas
  only in this version, so it isn't asked for Ontario.*
- **2b lists that province's own economic regions**, by code and name as the wage file publishes them
  (`ER_Code_Code_RE` and `ER_Name` for the province, research 25s), in code order, plus **I don't know**,
  which shows the province-wide row where the file has one.
- **Prince Edward Island, Yukon, the Northwest Territories and Nunavut** each have one code only in the wage
  file (`ER1110`, `ER6010`, `ER6110`, `ER6210`, research 25s): the question isn't asked, and the step says
  *Job Bank publishes one region for Yukon, so there is nothing to pick here.* before **Next: the futures →**.
- Research 25s checked Alberta's regions against Statistics Canada's own pages; the other provinces' lists come
  from the wage file and aren't checked against those pages yet (25s, open question 5). That is a call for the
  maintainer (see the pull request's questions).

## What is kept, and where

| Answer | Column (add-only migration, task 23g / 25e) | Values | Set-at column |
|---|---|---|---|
| Area | `Venture.landscapeArea` (the name 23g's task gives it) | `cma-825` Calgary, `cma-835` Edmonton, `cma-810` Lethbridge, `cma-830` Red Deer (Statistics Canada's census metropolitan area codes), `ab-elsewhere`, `dont-know`; null when not asked or left on *Choose one* | `landscapeAreaSetAt` |
| Region | `Venture.economicRegion` (new, research 25s § 3: its own column) | The 4-character region code (`4810`…`4880`; another province's codes the same way), or `dont-know`; null when not asked | `economicRegionSetAt` |

Saved with the idea at step 3's **Look inside** (the first save), not before: until then the answers live in
the flow's memory only, never in the window's storage. Shown back on *Your plan* and in *What DotAmi knows about
you* (issue #41), deleted with the idea, and in the plan export. *I don't know* is kept as the person's answer,
not turned into "Alberta-wide": About this job shows the Alberta-wide row **because** they said they don't
know, and says so.

**Privacy inventory lines** (`lib/privacy/inventory.ts`; the privacy test fails until each exists):

- *Your area*: *"The area you picked (one of Alberta's four census metropolitan areas, somewhere else in Alberta,
  or I don't know) and the day. Kept with the idea on this computer; shown on Your plan; deleted and exported
  with it. Nothing reads it in this version."*
- *Your economic region*: *"The economic region you picked, or I don't know, and the day. Kept with the idea on
  this computer; About this job reads it to choose which published wage row to show. Deleted and exported with
  the idea."*

**Privacy log, under [Unreleased], in the build's pull request:** *"Asks: which area and which economic region
you're in, once, right after you pick a job. Keeps: your answers and the day, on this computer only; deleted
and exported with the idea. Nothing is sent."* This pull request is design only, so the log doesn't change
yet.

## What is new on the screen vs today

Nothing like it exists today: places are province-level only (`lib/places/codes.ts:15-44`). It takes the step
region's place; it adds no region.

## Regions and controls

- **Regions: 4** (nav, intro, step region, site footer), as on step 1; under the `futures` budget's 6.
- **Controls, 2a:** the back link, the word mark, the area drop-down, **Next →**: **4**.
- **Controls, 2b:** the back link (**← Back to your area**), the word mark, the region drop-down, the
  Statistics Canada link, **Next: the futures →**: **5**, at every width.
- **The budget:** the step gets its own row in the build (task 29j's written way for a new screen's first
  row), at or under the `futures` row: phone 5, tablet 7, laptop 6. Two parts, one question each, are what
  keep it inside the phone's 5: both drop-downs, the link and both buttons on one screen would be 7.

## How a screen reader hears it

- Each part is a group named by its question. The drop-down is a native `<select>` named by the question and
  described by its why-line and hint, so the reason is heard before the choice.
- The region list's order line (*Listed in Statistics Canada's code order.*) is part of its description.
- **Next →** moves focus to the next part's question; the back link to the part before's question.
- The Statistics Canada link's name says it opens Statistics Canada's list; it is marked as opening outside
  DotAmi.

## Phone (375 px)

One column; each drop-down at full width, opening the phone's own picker. The why-lines sit above the
drop-down, the hint and order line below it, then **Next**.

## Not in this version

- The industry question (phase 3, with the business counts; the maintainer's pick).
- *More about where*, the optional free-text box (23g: only if the maintainer keeps it).
- Any lookup from a city or a postal code to a region (research 25s: none is published as a file for Alberta;
  the Geographic Attribute File's download blocks scripts).
- The area question for a person outside Alberta.

## Checked against the rules

Every string in the words block was run through `VERDICT_WORDS`, `findVerdicts` and `findTimeWords` on
2026-10-20: no finding.
