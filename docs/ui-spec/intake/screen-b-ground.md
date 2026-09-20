# Screen B — "Where does this operate?"

> **S2.5.4h (2026-09-14) — removed.** “Compare starting points →” (the Explore route) is removed; the only primary action is “Open my map →”. `seedGoalWeightsFromIntakeGoals` no longer runs on submit. The behaviour below is the pre-cut record, kept for reference; the shipped surface is described in `CLAUDE.md` § What the app is.

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`
Type: location + optional numbers screen

Last updated: 2026-07-02 (page-mechanics workshop, verified against shipped code)
Workshop status: **signed off**

## What it is

The second (final) intake screen: where the venture operates plus optional numbers, then
straight to the cockpit.

## Controls

- **Province / territory** — all 13 selectable. Under the select, always (2026-09-20):
  *"Canada is the first jurisdiction mapped; other countries are not on the map yet."*
  `FULL_COVERAGE_PROVINCES` (AB/BC/ON) render nothing further; the rest also show: *"Federal rules apply. Provincial coverage for
  \<province\> is coming — nothing shown will be wrong, some provincial programs just won't
  appear yet."* Federal (CA-wide) engine entries surface for every province regardless.
- **Current employment** — 7 options as of this session (was 5 — see Fixed below):
  employee, self-employed, business-owner, apprentice/student, retired, unemployed,
  other. Choosing **Other…** reveals a free-text input backed by a `<datalist>` cached in
  `localStorage` (`dotami-employment-suggestions`, key persists across sessions/tabs —
  the one piece of intake state that outlives `sessionStorage`).
- **Name it — optional (added 2026-09-13, S2.5.4d)** — text input (max 80) → `intake.name`.
  Resolves the 2026-07-02 open question ("`intake.name` has no editable UI control"). At
  submit the venture name is `intake.name.trim() || "My venture"` — the parse's `rawLabel`
  is **no longer** in the fallback chain, because it was usually a sentence about the
  person (a sentence like "I'm an apprentice in Calgary" used to become the venture name).
- **Optional numbers** — Y1/Y3 revenue targets with a one-line why-we-ask: *"Numbers
  unlock threshold watches — like the $30K GST line — on your map."* Digit-only input,
  skippable (defaults to 0, not required for submit).
- **Capital purchase toggle** — same `intake.capitalPurchasePlanned` field Screen A also
  has a toggle for (feeds the rules engine's Class 50 / CSBFP logic; pre-set if the parse
  detected it, editable here regardless of whether it was detected).
- **Hire-first toggle** — sets `intake.hireFirst`.
- Primary action: `Open my map →` (`openMap("/cockpit")`) — **hard-blocked while
  `intake.province === null`** (button disabled + explicit "Pick a province to open the
  map — it gates most of the rules" hint). On success: seeds `goalWeights` from
  `intake.goals` (`seedGoalWeightsFromIntakeGoals` — feeds Explore/Lens ranking), clears
  `intentParse`, builds the scenario (`buildScenarioFromIntake`), routes to `/cockpit`.
  If `intake.goals` includes `discover-now`, a secondary `Compare starting points →` link
  offers `openMap("/explore")` instead — same gate, same seeding.

## Why it exists

Province is the biggest single gate in every engine catalog; revenue and capital intent
power the threshold and equipment logic. Nothing on this screen is decorative — every
field feeds a specific downstream rule.

## State touched

`intake.province`, `intake.employmentStatus`, `intake.employmentOther`,
`intake.targetRevenueY1/Y3`, `intake.capitalPurchasePlanned`, `intake.hireFirst`, and at
submit: `intake.goalWeights`, `intake.intentParse` (cleared), plus `scenario` (full write
via `setScenario`).

## Fixed 2026-07-02

Employment dropdown only had 5 options; added "Already run a business"
(`business-owner`) and "Retired" (`retired`) as dedicated options instead of forcing them
into free-text Other. Required threading through `EmploymentStatus`
(`lib/scenarios/types.ts`), an additive Prisma migration
(`prisma/migrations/20260702010000_employment_business_owner_retired/`, same pattern as
the earlier province widen), and both enum mappers (`lib/db/scenario-to-prisma.ts`,
`lib/db/prisma-venture-to-scenario.ts`). Verified live: dropdown now renders 7 options.
