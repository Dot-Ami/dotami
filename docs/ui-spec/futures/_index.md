# Pick a future — page overview

Page: `/futures` · Component: `components/front-door/pick-future-page.tsx` (cards:
`lib/front-door/futures.ts`; words: `lib/front-door/words.ts`)

Last updated: 2026-10-13 (the first written future listed; design: docs/architecture/future-cockpit.md § 1, The way in as built)

> **Designed 2026-10-20, not built yet — phase 2's three steps (task 28g).** Pick a future becomes three
> steps in the page's one step region, one at a time, asked before any road is drawn: **1. What's closest to
> your work?** ([01-whats-closest-to-your-work.md](./01-whats-closest-to-your-work.md): the person's own words
> searched in the government's example job titles, grouped by how many of their words each job holds, Skip
> allowed, nothing picked without a click); **2. Where you are**
> ([02-where-you-are.md](./02-where-you-are.md): which area, then which economic region, each with its
> why-line; only after a job is picked); **3. Pick a future**
> ([03-road-match.md](./03-road-match.md): the road written for the picked job first, or *No road is written
> for this job yet* with *About this job* shown in place and road 0 under it; no silent fallback). Outside
> Alberta, step 3 shows the federal steps first ([04-outside-alberta.md](./04-outside-alberta.md)). The typed
> way (*I already have an idea*) ends on the same three steps, on the intake page, in place of **Open my
> map**. The table and controls below are today's, until the build's pull requests (28b, 23g, 28c, 28d)
> change them.

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
| No place answered yet | the cards are replaced by *"Say which province or territory you're in first."* and a link back to `/start` | — |

## Page-level state

`useJourney()` — reads `intake.destination`; after a pick, sets the session's scenario to the new idea.

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
