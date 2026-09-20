# Section 04 — Refine (optional)

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`  
Type: number inputs + checkbox

Last updated: 2026-09-21
Workshop status: **Signed off — Phase 4 intake workshop**

## What it is

Wizard **step 4** — optional revenue and hiring assumptions. Entire step is skippable via Next without editing.

## What it does (behavior on interact)

| Control | Behavior |
|---------|----------|
| Target Y1 revenue | Number input → `intake.targetRevenueY1` |
| Target Y3 revenue | Number input → `intake.targetRevenueY3` |
| Show a hire-first path | Checkbox → `intake.hireFirst` |

Defaults come from `defaultIntakeDraft()`. User can press Next without changing anything.

Workshop direction:

- Step 4 remains explicitly optional and skippable.
- Revenue fields should be framed as rough assumptions, not forecasts.
- Hire-first should be user-facing branch language, not internal graph language. Preferred label direction: `Show a hire-first path`.
- The right preview should show how rough numbers and hiring intent affect thresholds and graph branches.

## Why it exists (user purpose)

Revenue targets unlock threshold nodes (GST, incorporation timing) on the map. Hire-first toggles a branch on the scenario graph. Optional because many users do not know targets on day one.

Step 4 should reduce pressure. The page can say "skip if unsure" while still making it clear that a rough answer unlocks more precise threshold checks later.

## Copy (current labels)

- Section title: *Refine your map (optional)*
- Helper: *Optional — skip if you are not sure yet. More detail unlocks more nodes on your map.*
- Target Y1 revenue / Target Y3 revenue
- Current label: *Show a hire-first path*

## Immediate-value preview requirements

When Step 4 fields change, the live preview should eventually surface cards such as:

- `GST/HST threshold watch` when target revenue approaches or exceeds the small supplier threshold.
- `Hiring path adds payroll / worker classification branches` when hire-first is enabled.
- `Skip is okay` reminder when optional fields are empty, keeping the primary launch available.

Cards must avoid deterministic financial advice. Use `may trigger`, `watch`, `if this applies`, and source chips for threshold/compliance references.

## State touched (field names only)

- `intake.targetRevenueY1`
- `intake.targetRevenueY3`
- `intake.hireFirst`

## Downstream consumers (where the data goes today)

- **`buildScenarioFromIntake`** — revenue targets and hireFirst on scenario profile/branches
- **Live preview** — node count and graph shape
- **Cockpit map** — uses scenario revenue assumptions for threshold and incorporation branches

## Cleanup / open questions

- Former sections 05–06 (ops, personal context) remain deferred; do not add them before Phase 5 planning.
- Dedicated Step 4 is signed off for this pass; no collapsible sub-form needed now.

## Backend wiring

TBD — to be specified later. Backend should convert rough revenue and hire-first state into threshold and branch preview candidates.
