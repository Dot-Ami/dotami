# Pick a future — page overview

Page: `/futures` · Component: `components/front-door/pick-future-page.tsx` (cards:
`lib/front-door/futures.ts`; words: `lib/front-door/words.ts`)

Last updated: 2026-10-12 (built; design: docs/architecture/future-cockpit.md § 1, The way in as built)

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
- One card per written future (`roadsV2026`, in the order added; `role="list"`).
- **Not here yet?** under the cards.

## Controls

| Control | Behaviour | Persists to |
|---|---|---|
| A card | display: the road's name (level 2 heading); what it holds (*A business* · *A career and a business* · *A career*); *Written for Alberta*, plus *"You said <place>."* when that isn't the person's place; counts only: *n steps · n skills listed · n official fees found · n cost lines you'd price*; and *Sources: n read · m checked by a tool only, not read by a person yet* (the second part amber, and left out when it is 0), counted through `lib/engines/shared/citation-check.ts` over every citation on the road (its steps, *done when* lines, official fees and named lines' sources) and the skill items it lists | — |
| **Look inside →** (one per card, named *Look inside <road's name>*) | builds the idea (the place answered, the name typed or the road's name, the kind of venture *Service* as the intake starts, the work situation *not said*), saves it with `POST /api/scenario/save` carrying `roadId` and `lookingFor` in the first save, then opens `/cockpit?venture=<id>`. Disabled while saving. With no database the page says so and stays: a future that couldn't be saved isn't opened | `Venture` (with `roadId`, `roadChosenAt`, `lookingFor`, `lookingForSetAt`, `province`, `employmentStatus = NOT_SAID`), `ScenarioState` |
| **Not here yet?** box + **Keep my note and look inside the general road** | keeps the note as one of the person's statements (`POST /api/person/statements`), then does what **Look inside** does on the general road (*Starting any business in Alberta*) | `PersonStatement`, then as above |
| No place answered yet | the cards are replaced by *"Say which province or territory you're in first."* and a link back to `/start` | — |

## Page-level state

`useJourney()` — reads `intake.destination`; after a pick, sets the session's scenario to the new idea.

## Not built yet

*Which job is closest to the work you'd do yourself?* (decision 5) comes with the OaSIS import; the road
drawn in grey before the pick.
