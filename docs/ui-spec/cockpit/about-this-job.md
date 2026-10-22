# About this job

Page: Cockpit (`/cockpit?venture=<id>`), in the right-hand panel; also shown in place on Pick a future's
no-road block ([../futures/03-road-match.md](../futures/03-road-match.md)) · Component:
`components/cockpit/about-this-job-panel.tsx` (planned; words `lib/about-job/words.ts`; data from the research
kit's library: job facts from 28a and 25i, links from the source registry 25b)
Type: panel (four rows in fixed order, links)

Last updated: 2026-10-20 (designed before it is built, task 28g, for task 25h. The maintainer's picks: K5 B of
2026-10-16, official wage ranges each labelled with its real geography level; of 2026-10-20, *About this job*
ships **without** business counts, the rules row quotes the job's Employment requirements word for word as the
government's words, and *Where to look yourself* links Job Bank's general search page with the job's name and
code shown as text to copy, never the job in a web address; of 2026-10-21, call 2: outside Alberta no region is
asked and the wage row is the one for the province or territory as a whole, labelled by its own source
code, said on screen. Design:
[../../architecture/research-kit.md](../../architecture/research-kit.md) § 4.2.)

Mockup: `C:\dotami-wt\designs-phase2\05-about-this-job.html` (an invented cabinetmaker in Calgary, corpus idea
`idea-v1-0276`, on road 1).

## Where it opens

- **The goal bar's *Look closer* menu**, an item *About this job*, listed only when the idea has a picked job
  (`Venture.occupationCode`). For a job with a written road it is the menu's last panel item (after *Compare
  the two endings* and *Others in this line of work*); for a job with no written road, its first.
- **In place on Pick a future's no-road block**, open by default (K6 A), the same component and words, with no
  *Close* button.

In the cockpit it is a panel in the right-hand slot, one thing at a time like *Compare* and *Others in this
line of work*, a region named *About this job* with a × button named *Close*. Opening it clears the last
receipt and the pressed gauge, as the others do. It changes nothing on the road, gives no receipt, and no
rule reads anything in it. On a phone it is a full-width sheet, between 768 and 1023 px a drawer
([12-folding-and-phone.md](./12-folding-and-phone.md)). No region is added: the panel slot is already one.

## The rows, always in this order

The kicker: *Cabinetmakers · 72311.00 · your pick of job*.

### 1. Employment requirements (the government's words)

- Heading *Employment requirements*, and *The government's words, quoted in full for job group 72311
  Cabinetmakers:*
- Every *Employment requirements* line of the job's 5-digit group in the NOC 2021 Version 1.0 elements file,
  word for word, in the file's order, each as its own line inside one quotation block (`<blockquote>`, marked
  `data-official-quote` with its citation), and **each line inside quote marks** (“…”), drawn as text, so the
  screen checks read it as a quote. Lines the file gives as sub-headings within a group (*Hairstylists*,
  *Barbers* for 63210) stay as sub-headings.
- When the picked OaSIS profile is one of several in its group (Barbers, 63210.02, in group 63210 Hairstylists
  and barbers): *The group holds more than one job, so some lines are about the others.*
- The source line (below). The quote's durations (*a four-year apprenticeship program*) are the government's
  own words, shown as its words. DotAmi writes nothing about them.

**How the quoted lines pass the screen checks** (the whole-screen walks read the visible text, not the
`data-official-quote` mark, so the mark alone isn't enough):

- *No times.* The idea sweep's screen check (`e2e/idea-sweep.spec.ts` `withoutQuotedWords`) skips only what
  stands inside “…”; the harness's pieces carry the lines as `official-quote` (`tests/helpers/text-pieces.ts`).
  The quote marks on each line are what make both true.
- *No verdicts.* `e2e/no-verdict.spec.ts` reads every screen with `findVerdicts`, which lifts a phrase only
  when its sentence is in `OFFICIAL_QUOTE_ALLOWANCES` (`tests/helpers/verdict-words.ts`) **and** stands in
  quote marks. Run over all 2,122 *Employment requirements* lines of the elements file (copy of 2026-10-15)
  on 2026-10-20, `findVerdicts` catches one, with or without quote marks: group 53200 (Athletes),
  *“A background combining athletic training and college or university
  studies is strongly recommended.”* (phrase *recommended*). So the build (25h, with 28a's import) adds that
  sentence to `OFFICIAL_QUOTE_ALLOWANCES`, word for word, with its *where* (this row, group 53200) and *why*
  (the government's own requirement line, quoted in full and labelled as its words), and 28a's importer test
  runs `findVerdicts` over every shipped requirement line and fails on any it catches that has no allowance,
  so a re-pinned file can't bring a new one in unseen. Nothing is reworded or left out of the quote.

Example (72311 Cabinetmakers, the four lines as the elements file holds them, the copy of 2026-10-15 used by
research 28f; 28a's importer reads the pinned download and the build's test checks the shipped text against it):

> Completion of secondary school is usually required.
> Completion of a four-year apprenticeship program  or A combination of over four years of work experience in
> the trade and some high school or college courses in cabinetmaking is usually required to be eligible for
> trade certification.
> Trade certification is available, but voluntary, in all provinces and territories.
> Red Seal endorsement is also available to qualified cabinetmakers upon successful completion of the
> interprovincial Red Seal examination.

(The double space before *or* is in the file and is kept; the screen shows the line as written, each line
inside its own quote marks.)

### 2. Wages published for this job group

- Heading *Wages published for this job group*, and the **level** taken from the row's source code
  (`Source2025_NHQ`), never from its region name (research-kit.md § 4.2; research 25s § 2):

  | Source code token | Label |
  |---|---|
  | `ER` | *Economic region: <name>* |
  | `PR` | *Alberta-wide figure* (the province's own name elsewhere) |
  | `CAN` | *Canada-wide figure* |
  | `SAE … ER` | *Small-area estimate, <region>* |
  | none (`CIHI…`, `JUDGE 2024`, `Yukon…`) | *Level not stated* |

  with the method from `Data_Source_E` (*Labour Force Survey*, *Employment Insurance data*, *small-area
  estimate*, *Census*), because two `PR` rows can differ by survey (research 25s: Hairstylists and barbers under
  Edmonton is `EI 2023-24 PR NOC5`, under Alberta `LFS 2023-24 PR NOC5`).
- *Hourly · low $18.00 · median $23.00 · high $30.00* (or *Yearly* where `Annual_Wage_Flag` is 1).
- *Reference period 2023-2024 · Employment Insurance data* (per row, as the file gives it).
- *Low is in most cases the 10th percentile and high the 90th, as Job Bank's method page says.*
- The fixed line: *What workers in this job group were paid. Not what a shop earns, and not what you would
  earn.*
- Which row: the row for the person's region (*Your region: Calgary (your pick)*); for *I don't know* or no
  answer, the province's own row (*You said you don't know your region.* / *Your region isn't picked.*), with
  **Change** opening the region drop-down in place (the same list and why-line as Pick a future's step 2b).
- **Outside Alberta** (decided 2026-10-21, the maintainer's call 2, "province-wide"): no region is asked, so
  the row is always the one the wage file gives for the province or territory as a whole, and there is no
  **Change**. That is its two-digit `ER<pp>` row (as Alberta's is `ER48`), or, for Prince Edward Island, Yukon,
  the Northwest Territories and Nunavut, which have no `ER<pp>` row and one code each (`ER1110`, `ER6010`,
  `ER6110`, `ER6210`, each named after the place itself, research 25s), that one code's row. The build's
  importer reads which code each place has and never assumes an `ER<pp>` row exists.
  - **Its label comes from its source code, as every row's does, never from this rule.** A `PR` code reads
    *Ontario-wide figure* (*Yukon-wide figure* for a territory). In the 2025 file (counted 2026-10-21) the
    same row can instead carry an `ER` code (`Census 2021 ER NOC5`, on 10 rows of Yukon, the Northwest
    Territories and Nunavut: *Economic region: Yukon*) or no level token (`CIHI 2023-24`, `JUDGE 2024`,
    `Yukon 2023-24`, and `LFS 2023-24 ATL NOC5` on the four Atlantic provinces' rows: *Level not stated*), and
    then that is what the label says. No province's or territory's own row carries a `CAN` code in that file;
    if a later file has one, it reads *Canada-wide figure* like any other.
  - **Under the label:** *DotAmi asks your region only in Alberta for now, so this is the row the wage file
    gives for Ontario as a whole, with the level its own code gives it.* The line says which row is shown and
    why, never its level, so it can't contradict a label that reads *Canada-wide figure*, *Economic region: …*
    or *Level not stated*. It never says "province-wide", and never calls a territory a province (*the row the
    wage file gives for Nunavut as a whole*).
  - When a province's region list has been checked against Statistics Canada's own pages and its
    question added ([../futures/02-where-you-are.md](../futures/02-where-you-are.md), *Outside Alberta*), that
    province gets the Alberta behaviour above: its region's row, *I don't know*, and **Change**.
- **When the region's row is shown under the region but its code says province** (Hairstylists and barbers
  under Calgary, `LFS 2023-24 PR NOC5`): *Shown under Calgary, but the government's code for this row says it is
  an Alberta-wide figure.*
- **When the region's row has no figures** (`N/A`; cabinetmakers in five Alberta regions, research 25s): *Not
  published for Red Deer. The government's note: “Due to data limitations, the wage for this occupation cannot
  be published. Please refer to the wage published for this occupation at the provincial level.”* Then *The row
  that note points to:* and that row, with its own level label. Never a silent fallback. Where the note names no
  level (225 rows, research 25s), only *Not published for <region>.* shows, and no other row.
- The source line: *Job Bank wage file 2025, revised 2025-11-19. Contains information licensed under the Open
  Government Licence – Canada.* No Job Bank or Government of Canada logo, and nothing styled as Job Bank's own
  screen (OGL's exemptions, research 25s verifier's check).
- `EmployeesWithNonWageBenefit_Pct` is not shown (its definition isn't cited; research 25s, open question 4).

Example rows, real, from the 2025 wage file as research 25s read it on 2026-10-20 (all hourly, CAD):

| Job | Row | Low / median / high | Source code | Label |
|---|---|---|---|---|
| 72311 Cabinetmakers | `ER4830` Calgary | 18 / 23 / 30 | `EI 2023-24 ER NOC5` | *Economic region: Calgary* |
| 63210 Hairstylists and barbers | `ER48` Alberta | 15 / 19.23 / 26 | `LFS 2023-24 PR NOC5` | *Alberta-wide figure* |
| 63210 Hairstylists and barbers | `ER4830` Calgary | 15 / 19.23 / 26 | `LFS 2023-24 PR NOC5` | *Alberta-wide figure*, with the *Shown under Calgary* line |

### 3. Business counts

- Heading *Business counts*, and *Not in this version. DotAmi doesn't show how many businesses work in this
  line yet; the official counts by area come with a later version.*
- *Your area: Somewhere else in Alberta (your pick). Nothing reads it yet.* when an area is kept (or *Your area
  isn't picked.*), so the person sees the answer they gave and that it does nothing yet. There is no
  **Change** for the area here in this version: nothing reads it, so a way to change it comes with the counts
  (phase 3). Step 2's `kept` line promises only the region's **Change** ([../futures/02-where-you-are.md](../futures/02-where-you-are.md)).

### 4. Where to look yourself

- *Search with this job's name and code: * then the text **Cabinetmakers · 72311.00 · NOC 72311**, in the mono
  type, selectable (select to copy). No Copy button in this version.
- Three links, each to the site's own general page, from the source registry (25b), each `target="_blank"
  rel="noopener noreferrer"` (in the desktop app, handed to the person's browser, as every link is):
  - **Job Bank: Search wages ↗** `https://www.jobbank.gc.ca/trend-analysis/search-wages` (research 25s, read
    2026-10-20: *Search wages - Job Bank*, searching by job title or city)
  - **BizPaL: business permits and licences ↗** `https://bizpal.ca/` (read 2026-10-20: *Home - BizPaL*, heading
    *Business Permit and Licence Information*)
  - **Alberta Tradesecrets: trade profiles ↗** `https://tradesecrets.alberta.ca/trades-in-alberta/profiles/`
    (read 2026-10-20: *Trade Profiles*, the list of Alberta's designated trades; *Cabinetmaker* and *Hairstylist*
    are on it). Outside Alberta it is left out: *Tradesecrets is Alberta's trade list, so it isn't listed for
    Ontario.*
- *Each opens in your browser at the site's own page. The links carry nothing about you or this job.* The
  addresses are fixed: no search words, no job code, nothing of the person's (the same check as
  `tests/landscape-words.spec.ts`, over these links).

### Footer

*What the government publishes about this job, side by side. Nothing here says whether it fits you.*

## Words (as they would sit in `lib/about-job/words.ts`)

```words
aboutJobWords = {
  region: "About this job",
  menuItem: "About this job",
  close: "Close",
  kicker: "<job> · <code> · your pick of job",
  rules: {
    heading: "Employment requirements",
    lead: "The government's words, quoted in full for job group <noc> <group title>:",
    groupNote: "The group holds more than one job, so some lines are about the others.",
    showAll: "Show all <n> lines of the government's text",
    source: "Statistics Canada, National Occupational Classification 2021 Version 1.0, Employment requirements, read <day>.",
  },
  wages: {
    heading: "Wages published for this job group",
    levelRegion: "Economic region: <region>",
    levelProvince: "<province>-wide figure",
    levelCanada: "Canada-wide figure",
    levelSmallArea: "Small-area estimate, <region>",
    levelNotStated: "Level not stated",
    hourly: "Hourly · low <low> · median <median> · high <high>",
    yearly: "Yearly · low <low> · median <median> · high <high>",
    period: "Reference period <period> · <method>",
    lowHigh: "Low is in most cases the 10th percentile and high the 90th, as Job Bank's method page says.",
    notYours: "What workers in this job group were paid. Not what a shop earns, and not what you would earn.",
    yourRegion: "Your region: <region> (your pick)",
    dontKnow: "You said you don't know your region.",
    notPicked: "Your region isn't picked.",
    outsideAlberta: "DotAmi asks your region only in Alberta for now, so this is the row the wage file gives for <place> as a whole, with the level its own code gives it.",
    change: "Change",
    shownUnder: "Shown under <region>, but the government's code for this row says it is a <province>-wide figure.",
    notPublished: "Not published for <region>.",
    govNote: "The government's note: “<comment>”",
    pointsTo: "The row that note points to:",
    source: "Job Bank wage file 2025, revised 2025-11-19.",
  },
  counts: {
    heading: "Business counts",
    notInVersion: "Not in this version. DotAmi doesn't show how many businesses work in this line yet; the official counts by area come with a later version.",
    yourArea: "Your area: <area> (your pick). Nothing reads it yet.",
    areaNotPicked: "Your area isn't picked.",
  },
  links: {
    heading: "Where to look yourself",
    copy: "Search with this job's name and code:",
    jobBank: "Job Bank: Search wages ↗",
    bizpal: "BizPaL: business permits and licences ↗",
    tradesecrets: "Alberta Tradesecrets: trade profiles ↗",
    notAlberta: "Tradesecrets is Alberta's trade list, so it isn't listed for <province>.",
    note: "Each opens in your browser at the site's own page. The links carry nothing about you or this job.",
  },
  footer: "What the government publishes about this job, side by side. Nothing here says whether it fits you.",
}
```

The licence lines are data, word for word, from the source registry (25b): OGL – Canada's *Contains information
licensed under the Open Government Licence – Canada.* for the wage file, and Statistics Canada's Open Licence
lines for the elements file (*Adapted from Statistics Canada, National Occupational Classification 2021 Version
1.0* … *This does not constitute an endorsement by Statistics Canada of this product.*, research 28f), each also
listed on `/licences` and in THIRD-PARTY when the importer that ships the file lands.

## What is new on the screen vs today

A new item in *Look closer* (when a job is picked) and a new panel in the existing slot. Today the menu's code
says *About this job* "joins it later" (`components/cockpit/look-closer-menu.tsx:13`), and the skills list shows
only the government's skills list for the job.

## Regions and controls

- **Regions:** none added. The right-hand panel is already a region while it holds something (README, *The
  cockpit's regions*); a first visit opens with it empty, as today, so the first-visit counts don't change.
- **Controls:** the menu's items aren't drawn while it is closed, so *Look closer* stays one control. Open, the
  panel holds *Close*, **Change** (region), the three links, and on a phone **Show all n lines**: 5 or 6.
  Outside Alberta there is no **Change** and no Tradesecrets link: 3 or 4.
- **The budget:** like *Compare* and *Others in this line of work*, it opens only on the person's click, so the
  first-visit rows (`cockpit-road-0`, `cockpit-road-1`, `example-mara`) don't change. The build adds one row
  measured with the panel open on road 1 (29j's written way for a new screen's first row): its regions are the
  first visit's plus the panel slot the layout rule already counts (rule 2), and its controls are what CI
  measures, held from then on. On a phone the sheet covers the road, so that row counts the sheet: at most
  today's 14 for road 1 on a phone.

## How a screen reader hears it

- The panel is a region named *About this job*, focus moves to its heading when it opens, and *Close* puts
  focus back on *Look closer*.
- Each row is a level 3 heading. The quotation block is announced as a block quote, preceded by its lead line
  (*The government's words, quoted in full …*), so the voice is clear before the words.
- The wage line is read as one sentence: *Hourly, low 18 dollars, median 23 dollars, high 30 dollars* (the
  amounts are text, not a chart).
- The copy text is plain text; each link's name ends with *opens in your browser*.

## Phone (375 px)

A full-width sheet over the road, with *Close* at its top. Rows stacked; the quote folds after five lines into
**Show all n lines of the government's text**; links full width.

## State touched

Reads `occupationCode`, `economicRegion`, `landscapeArea`, and the idea's province; writes only
`economicRegion` and `economicRegionSetAt` through **Change**, which is drawn only in a province whose region
question exists (Alberta in this version). Nothing else. No inventory line beyond step 2's. **Change** is also
how a person who picked their job later in the skills list (and so was never asked step 2) sets a region
for the first time; the area isn't set or changed here (row 3).

## Downstream consumers

None. No rule, gauge, receipt or export reads the panel. (The plan export shows the person's area and region as
their answers, from step 2, not from this panel.)

## Never on screen

A verdict on the job, a wage written as the person's income or a shop's, a trend arrow, an outlook rating (K5 C
was not picked), a business count (not in this version), the job's code inside any web address, a Job Bank
logo.

## Not in this version

- Business counts (phase 3, 23f/25d) and the industry question.
- Changing the area (phase 3, with the counts that read it).
- The main-duties text, skills (already in the skills list), outlooks.
- A Copy button.

## Checked against the rules

Every string in the words block was run through `VERDICT_WORDS`, `findVerdicts` and `findTimeWords` on
2026-10-20, and again on 2026-10-21 after the maintainer's calls: no finding. The quoted requirement lines hold durations (*four-year*, *several years*); they are the
government's words, an *official-quote* piece, and are not DotAmi's. All 2,122 of them were also run through
`findVerdicts` on 2026-10-20: one is caught (group 53200, *recommended*), handled by an allowance as row 1 says.
