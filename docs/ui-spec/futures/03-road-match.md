# Pick a future: the road written for your job, or an honest "not written yet" (step 3 of 3)

Page: Pick a future (`/futures`), and the intake's last screen on the typed way · Component: the shared
three-step component (planned), with today's cards (`components/front-door/pick-future-page.tsx`
`FutureCardItem`, `lib/front-door/futures.ts`) and *About this job*'s rows
([../cockpit/about-this-job.md](../cockpit/about-this-job.md)) · Words: `lib/front-door/words.ts`
`pickWords` (extended) and `lib/cockpit/words.ts` `goal`
Type: list of cards, a no-road block, buttons

Last updated: 2026-10-20 (designed before it is built, task 28g, for task 28c. The maintainer's picks of
2026-10-16, K6 A: a job with no written road shows *About this job* by default, with road 0 one click away; of
2026-10-20: the career road joins in phase 3, so it is not offered now; no sending an idea with no road to the
maintainers, D4 = no.)

Mockup: `C:\dotami-wt\designs-phase2\03-road-match.html` (a job with no road; a smaller frame below shows a job
with one).

## The rule

A road whose `codes.occupations` (task 25e) holds the picked job's 5-digit NOC code comes first, under its own
heading. Otherwise the step says **No road is written for <job> yet.** and shows *About this job* there and
then, with road 0 under it. **No silent fallback**: `roadForFuture`'s default (`lib/futures/types.ts:39-42`)
is never reached without a line saying why the road drawn is the one drawn.

## What it is, case by case

### A. A road is written for the picked job (example: Cabinetmakers, 72311.00)

- The nav's back link goes back one part, as on step 2: **← Back to your region** after 2b (or after 2a where
  2b wasn't asked, **← Back to your area**), **← Back to your work** after a Skip. Every answer given so far stays
  in the flow's memory and is offered again.
- Heading *Pick a future to look inside* and today's order line, then *Your pick of job: Cabinetmakers ·
  72311.00 · your pick of job*.
- *Name it (optional)*, as today.
- The cards, in two groups (one list region, two headings):
  1. **Written for your pick of job**: road 1's card, with one more line, *Written for Cabinetmakers
     (72311).*
  2. **The other futures, in the order they were written**: road 0's card as today.
- *Not here yet?* as today.

### B. No road is written for the picked job (example: Barbers, 63210.02)

- The same nav, heading, order line and pick line.
- In the list region, first, a block named by its heading **No road is written for Barbers (63210.02)
  yet.**, then its lines, then *About this job*'s four rows **shown in place, open by default**, the same
  component and words as the cockpit's panel, hosted here (its *Close* button isn't drawn: there is nothing to
  close back to). This is K6 A's "shown by default for a job with no road".
- Then **The other futures, in the order they were written**: road 0's card, *Starting any business in Alberta
  (tax and structure)*, with one more line, *Not written for Barbers. It covers the tax and structure steps
  for any business in Alberta.*, and road 1's card (written for another job; its *Written for Cabinetmakers
  (72311).* line says so).
- *Name it (optional)* moves under the cards in this case, so the no-road block is the first thing after the
  pick line; *Not here yet?* under it, as today.
- **Nothing is saved** until the person presses a card's **Look inside**: a future with no road is never
  saved, because a saved idea with no road (`roadId` null) is drawn on road 0, and that would be the silent
  fallback this task removes. The block's last line says so.

### C. The person skipped the job question

- No pick line. The cards, all in one group, in the order they were written, with *You didn't pick a job, so
  no future is matched to one. These are all the futures written so far, in the order they were written.*
- *None is written yet for closing, pausing or selling a business, or for catching up on filings. Not here
  yet? keeps your note.* The same words for everyone who skips: DotAmi doesn't read the person's words to
  guess which kind of idea it is (the corpus's closing, pausing, selling and catch-up ideas, and illegal ones
  such as corpus 250 and 252, see the same screen; nothing on it judges the idea).

### After Look inside: what the cockpit says

The goal bar's future line (`lib/cockpit/words.ts` `goal.future`, `goal.drawnOnly`) says why this road:

| The idea | The goal bar's line |
|---|---|
| Opened on the road written for its job | *Future: From apprentice to your own shop (Alberta) · written for your pick of job* |
| Opened on road 0 with a job that has no road | *Future: Starting any business in Alberta (tax and structure) · not written for your pick of job, Barbers* |
| Opened with no job picked | *Future: <road>* (the person picked this road; as today) |
| An idea saved before this change with no road (`roadId` null: typed ideas, and every idea from before roads) | *Map drawn: Starting any business in Alberta (tax and structure) · the general road, because this idea was saved before a road was picked for it* |

The cockpit doesn't open *About this job* by itself (the panel is the person's to open, from **Look closer**;
the road stays the screen's one primary thing). For an idea whose job has no road, the *Look closer* menu's
*About this job* item is its first item.

## Words

```words
pickWords (additions) = {
  pickLine: "Your pick of job: <job> · <code>",
  backToRegion: "← Back to your region",
  backToArea: "← Back to your area",
  backToWork: "← Back to your work",
  writtenForJobHeading: "Written for your pick of job",
  othersHeading: "The other futures, in the order they were written",
  writtenForJob: "Written for <job> (<noc>).",
  noRoad: {
    heading: "No road is written for <job> (<code>) yet.",
    body: "Here is what the government publishes about this job. If you plan to run a business of your own, the general road below covers the tax and structure steps for any business in Alberta. It isn't written for <job>, and opening it doesn't say you're starting a business.",
    nothingSaved: "Nothing is saved until you open a future.",
  },
  road0NotForJob: "Not written for <job>. It covers the tax and structure steps for any business in Alberta.",
  skipped: "You didn't pick a job, so no future is matched to one. These are all the futures written so far, in the order they were written.",
  skippedNoneFor: "None is written yet for closing, pausing or selling a business, or for catching up on filings. Not here yet? keeps your note.",
}
cockpitWords.goal (additions) = {
  forJob: "written for your pick of job",
  notForJob: "not written for your pick of job, <job>",
  savedBeforeRoads: "Map drawn: <road> · the general road, because this idea was saved before a road was picked for it",
}
```

*Not here yet?* keeps its words; its note stays on this computer. Nothing is sent to the maintainers (D4: no,
until a privacy policy exists).

## What is new on the screen vs today

| Today | With this design |
|---|---|
| Two cards, in the order written, for everyone | The card written for the picked job under its own heading first; the rest under *The other futures, in the order they were written* |
| No word about the job | The pick line, and the no-road block with *About this job* in place |
| An idea saved with no road opens on road 0 with no line about it | The goal bar says which road is drawn and why, in every case |

## Regions and controls

- **Regions: 6**, as today: nav, intro, *Name it*, the list (both groups and the no-road block are one list
  region: items of one list, README rule 2), *Not here yet?*, site footer. *About this job*'s rows sit inside
  the list region here; it is the same component as the cockpit's panel, not a region of its own on this page.
- **Controls in the first window, case A:** back link, word mark, name box, the two **Look inside**: the same
  five DotAmi draws today. Case B: back link, word mark, and whatever of *About this job*'s three links reach
  the first window (on a laptop the rules row's quote fills it, so likely none); the **Look inside** buttons
  are below it. Case C: as today.
- **The budget:** today's `futures` row (6 regions; 5, 7 and 6 controls) holds; this step gets its own row in
  the build (29j), measured on case B, the longest, and lowered to what CI measures.

### On the intake page (the typed way)

The intake's own row holds there: **4 regions** (nav, intake, preview, site footer) and **5 controls** at every
width (`BUDGETS.intake`, `e2e/budgets.ts`). Drawn as on `/futures`, step 3 would be 6 regions (nav, intro,
*Name it*, the list, *Not here yet?*, footer), over the intake's 4. So on the intake page it is drawn
differently, with nothing taken away from what the person can do:

- **Regions: 3.** The step's heading, pick line, cards (both groups and the no-road block) and *Not here yet?*
  all sit inside the intake's own `intake` region, as parts of the step, with no `data-region` marks of their
  own; the preview rail stays put away (as on steps 1 and 2). Nav, `intake`, site footer: 3, under 4. Nothing
  inside the `intake` region is a landmark or section of its own outside a region, so the gate's check on
  unmarked blocks holds.
- ***Name it (optional)* isn't drawn on the intake page**: Screen B already asks it (*Name it — optional*,
  `components/discovery/intake-page.tsx`), and the idea is saved with that answer, as **Open my map** saves it
  today.
- **Controls in the first window:** the intake's **← Back**, the word mark, the cards' **Look inside**
  buttons and the site footer's link (the gate counts it; see step 1's file). Case A at a laptop: back, word
  mark, two **Look inside**, footer link: **5**, the intake's limit. Case C: as case A. On a phone one **Look
  inside** reaches the first window: 4. Case B: back, word mark, footer link (3), plus whichever of *About
  this job*'s controls reach the first window (**Change**, the three links, and on a phone **Show all n
  lines**). The government's quote sits above them, so how many reach the first window depends on how long a
  job's requirements text is; it isn't known before the build.
- The gate measures the intake as it opens (Screen A), so none of this is measured by CI on the intake page
  until the build adds a row for it. The build's pull request adds one, measured on case B with the job whose
  requirements text is shortest among the corpus's Alberta ideas (29j), at or under the intake's 5. If CI
  measures more, the pull request shows the maintainer that screen instead of raising the row.

## How a screen reader hears it

- Each group is a level 2 heading; the cards stay a list named *Written futures*.
- The no-road block is a region named by its heading (*No road is written for Barbers (63210.02) yet.*), so it
  is announced as the first thing after the pick line, and *About this job*'s rows inside it keep their own
  level 3 headings (*Employment requirements* …).
- A card's extra line (*Written for Cabinetmakers (72311).*, *Not written for Barbers. …*) is part of the
  card's description, read with its **Look inside** button.

## Phone (375 px)

One column. The no-road heading, its lines, then *About this job*'s rows stacked (the quoted requirements
first, then wages, counts, *Where to look yourself*), then the cards one under the other. On a phone the quoted
requirements fold after their first five lines into **Show all n lines of the government's text**, so the cards
aren't pushed far down; the fold opens in place and is the government's text in full once opened.

## State touched

At **Look inside**, the first save (`POST /api/scenario/save`) carries what today's does plus the flow's
answers: `roadId`, `roadChosenAt`, `lookingFor`, `occupationCode`, `occupationPickedAt`, `landscapeArea`,
`landscapeAreaSetAt`, `economicRegion`, `economicRegionSetAt` ([02-where-you-are.md](./02-where-you-are.md)). On
the typed way it also carries the intake's answers, as **Open my map** does today.

## Downstream consumers

The cockpit's goal bar; the idea harness (task 29h: the picked way ends on a road drawn with a line saying why,
or on this step's honest no-road ending; `ends:road-drawn` accepts both); the coverage report (silent fallbacks
= 0, task 28c's measure).

## Not in this version

- The career road for any job (task 28e, phase 3): not offered, and not mentioned as coming.
- A road for closing, pausing, selling or catching up (placed in phase 3 by the maintainer).
- Sending an idea with no road to the maintainers (D4: no).
- A future saved with no road.

## Checked against the rules

Every string in the words block was run through `VERDICT_WORDS`, `findVerdicts` and `findTimeWords` on
2026-10-20: no finding.
