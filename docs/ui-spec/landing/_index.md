# Landing — control index

Page: `/` · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-10-12 — the front door leads with the dream (the maintainer's decision 6 of
2026-10-11): headline "See the road to the work and life you want." and three doors, `04-three-doors.md`;
the free-text box and its chips are door 2, unchanged; the header's "Your ideas →" is "Your futures →".
Before that, 2026-09-24 — shared footer: disclaimer and repository link added on every route;
hero copy: "Map any venture. / Find your path." with the
subtitle "Every path to financial freedom — structures, write-offs, grants, thresholds —
sourced, risk-rated, cited to the law. Canada is the first jurisdiction mapped." (was
"Map any Canadian venture."; the page-mechanics workshop below is from 2026-07-02).

## Controls

| Group | File | Summary |
|-------|------|---------|
| The three doors | `04-three-doors.md` | Start from where I want to be (`/start`) · I already have an idea (the box below) · Show me an example first (not written yet, no link) |
| Free-text box + Map it | `01-free-text-entry.md` | Door 2 — captures text, calls intent parse, routes to intake |
| Example chips | `02-example-chips.md` | Fill the box, no submission |
| Escape hatches | `03-escape-hatches.md` | Sample venture + open cockpit — both skip parsing |
| Settings link | `../settings/_index.md` | Header, after "Open cockpit →" — opens `/settings` (added 2026-10-05, [7g]) |

The shared root layout also renders a footer on every route: "Information, not legal or tax
advice · a prep tool for you and your accountant · open source on GitHub", with the final phrase
linking to the public repository. The root footer has a fixed `2.5rem` height; viewport-filling
landing, journey and cockpit wrappers subtract that height so the disclaimer remains visible
without page-level scrolling. Intake content may still scroll internally when its form exceeds
the viewport.

## Page-level state

`useJourney()` — reads/writes `intake` (via `setIntake`) and `scenario` (via `setScenario`).
No other server state on this page.
