# Pick a future — page overview

Page: `/futures` · Component: `components/front-door/pick-future-page.tsx` (cards:
`lib/front-door/futures.ts`; words: `lib/front-door/words.ts`)

Last updated: 2026-10-24 (the place and *business / career / both* are held in the window's memory until a future is
picked, never in its storage, so a page loaded afresh says no place was answered); 2026-10-13 (the first written future listed; design: docs/architecture/future-cockpit.md § 1, The way in as built)

> **Designed 2026-10-20, not built yet — phase 2's three steps (task 28g).** Pick a future becomes three
> steps in the page's one step region, one at a time, asked before any road is drawn: **1. What's closest to
> your work?** ([01-whats-closest-to-your-work.md](./01-whats-closest-to-your-work.md): the person's own words
> searched in the government's example job titles, grouped by how many of their words each job holds, Skip
> allowed, nothing picked without a click); **2. Where you are**
> ([02-where-you-are.md](./02-where-you-are.md): which area, then which economic region, each with its
> why-line; only after a job is picked; in Alberta only for now); **3. Pick a future**
> ([03-road-match.md](./03-road-match.md): the road written for the picked job first, or *No road is written
> for this job yet* with *About this job* shown in place and road 0 under it; no silent fallback, and nothing
> saved for a job with no road until a future is opened). Outside Alberta, step 2 asks nothing and says why,
> *About this job* shows the province-wide wage figure, and step 3 shows the federal steps first
> ([04-outside-alberta.md](./04-outside-alberta.md)). The typed way (*I already have an idea*) ends on the
> same three steps, on the intake page, in place of **Open my map**. The table and controls below are today's,
> until the build's pull requests (28b, 23g, 28c, 28d) change them.
>
> **The maintainer's calls of 2026-10-21** on these designs: (1) the typed way ends on the same three steps;
> (2) outside Alberta no region question for now, the province-wide wage figure, and the question added
> province by province once each province's region list is checked against Statistics Canada's own pages;
> (3) a job with no written road saves nothing (a kind of saved idea with no road may come in phase 3, with
> the career road).
>
> **As built, 2026-10-22 (tasks 28b, 23g, 29h).** The three steps are one component,
> `components/front-door/job-and-road-steps.tsx` (the search box and results: `job-search.tsx`; a card:
> `future-card.tsx`), drawn on `/futures` and, on the typed way, on the intake page after Screen B; the flow's
> state and its back link are `lib/front-door/three-steps.ts`, step 3's order `lib/front-door/road-match.ts`
> (`roadsWrittenForJob`, then every other listed road, in the order written). Where the build differs from the
> design, or adds to it:
> - **The search runs on DotAmi's own server** (`POST /api/jobs/search`, `searchJobTitles`), so the titles file
>   never goes into a page's code; the words typed are sent in the request's body, never in an address, and
>   nothing keeps them. Pick a future, the intake and the cockpit's skills list all call it: one picker.
> - **Words added** (`lib/front-door/words.ts`): a line while the search runs (*Looking in the government's
>   example titles…*, in the status line whenever words are typed and their answer isn't in yet; the second review
>   found it was never drawn) and one if it can't run, said only for the words that failed; the
>   group heading with its count; the matched line for a job found by its own name or a typed code
>   (*Matched the job's name “…”*, *Matched the job's code …*), so neither reads as an example title; *Your
>   area: not answered* on 2b when 2a was left on *Choose one*; the Statistics Canada link's name saying it opens
>   outside DotAmi; step 3's kicker *3 of 3 · Pick a future*; and the intake's button, *Next: the work closest to
>   yours →*.
> - **A job with no written road (case B):** the honest heading, its lines, then *About this job*'s four rows in
>   place (`data-about-this-job-slot`), opened by the design's sentence *Here is what the government publishes
>   about this job.*, then *Nothing is saved until you open a future.*; then the other futures, road 0's card
>   saying it isn't written for the job. (Until task 28c, 2026-10-22, the batch 4 follow-up, an amber placeholder
>   held the rows' place; see 03, *As built (28c)*.)
> - **The goal bar's lines saying why a road is drawn** (03, *After Look inside*), built with task 28c: written for
>   your pick of job, not written for it, or saved before a road was picked.
> - **Since the batch 4 follow-up (2026-10-22, the maintainer's calls on the batch 4 page):** *Not here yet?*
>   opens the federal steps outside Alberta, with its three lines saying so (call 33); each card counts the
>   sources the person will be shown inside, the federal card's through the step panel's own filter (call 34); and
>   step 2's three lines about *About this job* are drawn again, now that it reads the region and has its
>   **Change** (02, top).
> - **Kept:** the job, the area and the region, each with its day, by the save that creates the idea at
>   **Look inside** (02, *What is kept*); `Venture.landscapeArea`, `landscapeAreaSetAt`, `economicRegion`,
>   `economicRegionSetAt` are new (migration `20261022000000_where_you_are`, four added columns). A save that
>   fails opens nothing and says so, on both pages.
> - **Clutter** (`e2e/budgets.ts`; regions / controls in the first window at 375, 768 and 1280 px / text
>   sizes): step 1 is measured as `futures`, lowered from 6 / 5, 7, 6 / 6 to **4 / 5, 5, 5 / 5**; the later
>   parts have rows of their own (`FIRST_MEASURED`, the written way for a new screen's first row): 2a
>   `futures-area` 4 / 5, 5, 5 / 5; 2b `futures-region` 4 / 5, 5, 5 / 5 (6 once *I don't know* shows the
>   Statistics Canada link, as designed); outside Alberta `futures-outside` 4 / 4, 4, 4 / 5; step 3 case B
>   `futures-road` 6 / 3, 6, 3 / 6; on the intake page step 1 `intake-steps` 3 / 5, 5, 5 / 5 and step 3 case B
>   `intake-road` 3 / 2, 5, 2 / 6 (the intake's baseline is 6 text sizes; its budget, measured on Screen A, 5).
>   Measured in Chromium on Windows and checked by CI's Ubuntu run in the pull request.

## Page job

Choose the one future to look inside, and see what each holds before any more questions. Reached
from *Your destination*'s **Pick a future →**. Next: the cockpit on the new idea.

## Layout

- Top nav: **← Your destination** (`/start`), the word mark, *Pick a future*.
- Heading *Pick a future to look inside*, and *"In the order they were written, not ranked. More
  futures are being written."*
- The `looking-for` receipt again, so the person sees what their answer counted.
- **Name it (optional)**: one box above the cards, up to 80 characters; left empty, the idea is named
  after the road.
- One card per future it lists (`LISTED_ROAD_IDS` in `lib/front-door/futures.ts`, in the catalog's
  order; `role="list"`). Today that is two: road 0, *Starting any business in Alberta*, and the first
  written future, *From apprentice to your own shop (Alberta)*. The first written future's sources are
  all tool checks, so its card's sources line is one amber part, *"n checked by a tool only, not read
  by a person yet"*; the maintainer decided on 2026-10-13 that it may be listed that way
  (docs/architecture/future-cockpit.md § 13, *Listing a road nobody has read*). Its **Look inside**
  opens the cockpit on its own road (`e2e/front-door.spec.ts`).
- **Not here yet?** under the cards.

## Controls

| Control | Behaviour | Persists to |
|---|---|---|
| A card | display: the road's name (level 2 heading); what it holds (*A business* · *A career and a business* · *A career*); *Written for Alberta*, plus *"You said <place>."* when that isn't the person's place; counts only: *n steps · n skills listed · n official fees found · n cost lines you'd price*; and *Sources: n read · m checked by a tool only, not read by a person yet* (the second part amber, and left out when it is 0), counted through `lib/engines/shared/citation-check.ts` over every citation on the road (its steps, *done when* lines, official fees and named lines' sources) and the skill items it lists | — |
| **Look inside →** (one per card, named *Look inside <road's name>*) | builds the idea (the place answered, the name typed or the road's name; the work situation *not said*; the kind of venture, equipment and both sales targets *not said*, listed in `notSaid`, with the intake's starting values in their columns), saves it with `POST /api/scenario/save` carrying `roadId` and `lookingFor` in the first save, then opens `/cockpit?venture=<id>`. Disabled while saving. With no database the page says so and stays: a future that couldn't be saved isn't opened | `Venture` (with `roadId`, `roadChosenAt`, `lookingFor`, `lookingForSetAt`, `province`, `employmentStatus = NOT_SAID`, `notSaid`), `ScenarioState` |
| **Not here yet?** box + **Keep my note and look inside the general road** | keeps the note as one of the person's statements (`POST /api/person/statements`) and empties the box, then does what **Look inside** does on the general road (*Starting any business in Alberta*). Note not kept: *"Not saved: no database reachable. Nothing was opened."* Note kept but the road not opened: *"Your note is kept. The general road couldn't be opened: no database reachable."* | `PersonStatement`, then as above |
| No place answered yet | the cards are replaced by *"Say which province or territory you're in first."* and a link back to `/start`. Since 2026-10-23 also when the page is loaded afresh before a pick (a reload of `/futures`, a new window, or the desktop app's Go menu, which opens its pages with `loadURL`): the place is held in the window's memory only, and `/start` asks it again. Moving between DotAmi's pages, Mara's example and back included, keeps it | — |

## Page-level state

`useJourney()` — reads `intake.destination` (the place and the *business / career / both* answer), held in the
window's memory only (`lib/journey/held-journey.ts`), never in its storage (these answers since 2026-10-23, the
rest of the journey since 2026-10-24); after a pick, sets the journey's scenario to the new idea, held the same
way. The pick keeps the place and the answer on the idea (`Venture.province`, `Venture.lookingFor`).

## Not built yet

*Which job is closest to the work you'd do yourself?* (decision 5) comes with the OaSIS import; the road
drawn in grey before the pick. *(2026-10-20: designed as step 1, [01-whats-closest-to-your-work.md](./01-whats-closest-to-your-work.md);
the grey road before the pick stays out: the cockpit draws it whole.)*

## Phase 2's steps (designed 2026-10-20)

| Step | File |
|---|---|
| 1. What's closest to your work? | [01-whats-closest-to-your-work.md](./01-whats-closest-to-your-work.md) |
| 2. Where you are: your area, then your region | [02-where-you-are.md](./02-where-you-are.md) |
| 3. Pick a future: the road written for your job, or an honest "not written yet" | [03-road-match.md](./03-road-match.md) |
| Outside Alberta: the federal steps, and "Written for Alberta" with your province named | [04-outside-alberta.md](./04-outside-alberta.md) |
