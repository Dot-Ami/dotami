# Landing — control index

Page: `/` · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-09-20 — hero copy: "Map any venture. / Find your path." with the
subtitle "Every path to financial freedom — structures, write-offs, grants, thresholds —
sourced, risk-rated, cited to the law. Canada is the first jurisdiction mapped." (was
"Map any Canadian venture."; the page-mechanics workshop below is from 2026-07-02).

## Controls

| Group | File | Summary |
|-------|------|---------|
| Free-text box + Map it | `01-free-text-entry.md` | The page's one real control — captures text, calls intent parse, routes to intake |
| Example chips | `02-example-chips.md` | Fill the box, no submission |
| Escape hatches | `03-escape-hatches.md` | Sample venture + open cockpit — both skip parsing |

## Page-level state

`useJourney()` — reads/writes `intake` (via `setIntake`) and `scenario` (via `setScenario`).
No other server state on this page.
