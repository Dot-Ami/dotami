# Landing — control index

Page: `/` · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-10-24 — "Your expenses →" in the header while no idea is saved and the Expenses
page has a record to list (`03-escape-hatches.md`); the journey held in the window's memory, never its storage.
Before that, 2026-10-12 — the front door leads with the dream (the maintainer's decision 6 of
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
| The three doors | `04-three-doors.md` | Start from where I want to be (`/start`) · I already have an idea (the box below) · Show me an example first (`/example/mara`, the invented example future, since 2026-10-13) |
| Free-text box + Map it | `01-free-text-entry.md` | Door 2 — captures text, calls intent parse, routes to intake |
| Example chips | `02-example-chips.md` | Fill the box, no submission |
| Escape hatches | `03-escape-hatches.md` | Open cockpit, which skips parsing (the sample venture went 2026-09-14); "Your futures →" and "Open cockpit →" only once an idea is saved (2026-10-23) |
| Your expenses link | `../expenses/_index.md` | Header, only while no idea is saved and the Expenses page has a record to list — "Your expenses →", opens `/expenses` (2026-10-24; `03-escape-hatches.md`) |
| Settings link | `../settings/_index.md` | Header, last, always — opens `/settings` (added 2026-10-05, [7g]) |

The shared root layout also renders a footer on every route: "Information, not legal or tax
advice · a prep tool for you and your accountant · open source on GitHub", with the final phrase
linking to the public repository. The root footer has a fixed `2.5rem` height; viewport-filling
landing, journey and cockpit wrappers subtract that height so the disclaimer remains visible
without page-level scrolling. Intake content may still scroll internally when its form exceeds
the viewport.

## Page-level state

`useJourney()` — reads/writes `intake` (via `setIntake`) and `scenario` (via `setScenario`), the journey held in
the window's memory, never its storage (`lib/journey/held-journey.ts`, since 2026-10-24).
Read on the server each time `/` is drawn, for the header's links only: whether an idea is saved
(`hasSavedIdea`) and, when none is, whether the Expenses page has a record to list
(`hasListedExpenses`), both in `lib/front-door/saved-idea.ts` (2026-10-23, 2026-10-24). In a browser
copy, Back and Forward show the links as first drawn (`03-escape-hatches.md`).
