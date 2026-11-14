# Phases — Reasoning Conventions

Catalog: `lib/engines/phases/v2026/` (4 standings, 3 legal forms, 33 changes, as of 2026-11-12) · Checks:
`phaseCatalogProblems` in `lib/engines/phases/v2026/validate.ts`, run by `tests/phase-catalog.spec.ts` · Story:
S2.5.48, every phase a business can go through, task 48c

## What it holds

The phases a business can go through once it exists as an idea, as the official pages name them. A phase is three
things kept apart, the way the pages keep them:

| List | What it is |
|---|---|
| `standings` | Where a business stands, one at a time: not started, running, paused, ended |
| `legalForms` | The three business structures the CRA lists, and whether DotAmi's rules hold each one today (in your own name and a corporation do; a partnership doesn't yet) |
| `changes` | What a business can go through, in six groups: keeping the record straight, who owns it or what it is, growing, stopping, coming back, catching up |

A change holds:

| Field | What it is |
|---|---|
| `id` | Permanent: `change-` and what changes (`change-pausing`) |
| `planLabel` | Its label in the story's plan (K1 to C4), to read the two side by side |
| `group` | One of the six groups |
| `name` | In plain words |
| `forms` | What its pages say about each legal form: `yes`, `no` (it can't apply), `result` (it ends in that form), `not-said`, `not-read` |
| `from` | Where the business can stand when it starts |
| `leadsTo` | What it can lead to (a standing or another change), each with the page that says so and the words it says it in |
| `roadId` | The road whose steps it holds, once written; `null` for all 33 today |
| `citations` | The pages it is written from, each with the words it leans on |

Every source is a citation like every catalog's ([citations.md](./citations.md)): a tool check whose quotes
`node scripts/check-quotes.mjs` found on the live page. Three of the pages (the CRA's "Setting up your
business", "Sole proprietorship" and "Corporation") are among those the maintainer read in full on 2026-10-25, so
their citations record that read too and say "Read by a person on 2026-10-25" (citations.md, § The maintainer's
reads of 2026-10-25). A source whose quoted words sit in a fold that is shut
when the page opens also names that fold (`fold.label`, and `fold.under` when the page uses the same label for
more than one fold). A person who opens the page sees the fold's label, not the words, until they open it.

## Where it came from

The list the maintainer read against the CRA's "Maintain your business" page on 2026-11-12 (task 48b), held
as test data in `tests/fixtures/phases/v1.ts` (task 48a, pull request #247). His read: all 58 entries marked or
noted, 55 right, nothing missing; his three notes were two words that sit inside folds on Alberta's pages and
one page that was down when he read it. `tests/phase-catalog.spec.ts` holds the catalog to that list: the same
ids, names, groups, forms, starting points, roads and pages.

One link was held back at first: the list has *The owner retires or steps away* leading to *Selling the
business*, and no CRA page says so (its retirement page and its selling page don't mention each other). On the
maintainer's "Look for a page" (2026-11-13), none of the sites the list allowed said it; Alberta's career site,
ALIS, did (*Buy Yourself a Business—And a Job*: owners looking to retire may offer good terms to the right
buyer). On his "Use the Alberta page" the link cites that page, and ALIS joined the sites phase pages may come
from. `PHASE_LINKS_HELD_BACK` is empty and stays as the place a link goes when no page says it.

## Authoring rules

1. **Ids are forever.** A wrong entry is fixed in place, never renumbered, and its id is never given to another.
   Standings, legal forms and changes share one set of ids, so a "leads to" never means two things.
2. **Every entry has a source, and every "leads to" names an entry that exists** (the two checks of the story's
   plan, § 3.2). The validator reports both, by entry.
3. **A "leads to" cites the page that says so.** Its words are quoted like any source's; DotAmi's own reading of
   how the pages link each other is never enough. A link no page states is held back and listed, never written
   in without a source.
4. **Pages, never files, from the listed sites.** No source is a PDF or another download: the quote check reads
   web pages only. Every source is on one of `PHASE_SOURCE_HOSTS` (canada.ca, the federal registries, Alberta's
   main site and its career site ALIS, Statistics Canada); a new site is the maintainer's decision, made in that
   one list, which the test list's check reads too.
   And no quote carries advice words ("you should"): where a page's sentence has them, the quote starts after them
   (`tests/helpers/verdict-words.ts`), as the closing page's sentence on dissolving does.
5. **Name the fold.** When the quoted words sit in a fold that is shut when the page opens, the source carries the
   fold's own label (the maintainer's notes on his read of 2026-11-12: the words he was told to look for weren't on
   the screen he opened). Folds were found in the raw pages (`<details>` on canada.ca, Alberta's accordion items)
   and confirmed in a browser.
6. **Nothing about the person.** The catalog says what the official pages say a business can go through. Where a
   person's business stands is the person's own statement (task 48d), never worked out from this catalog.

## Not here yet

- **The facts each change needs and the papers it names** (the plan's § 2): each is asked or named on a step,
  with that step's page, when a change's steps are written (tasks 48g and 48k).
- **Steps.** No change has a road yet; the first, pausing and resuming, is task 48g.
- **A screen.** Nothing on screen reads this catalog. `lib/engines/all-citations.ts` lists its sources so the
  quote check reads them with every other catalog's; `tests/phase-catalog.spec.ts` checks that nothing else
  imports it.
- **The other kinds of organization** (co-operatives, not-for-profit corporations, limited and limited liability
  partnerships, societies, groups that are not incorporated): kept for a later build, on the maintainer's note on
  decision b2, in the test list only.
