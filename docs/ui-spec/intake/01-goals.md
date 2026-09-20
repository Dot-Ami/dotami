# Section 01 — Situation / goals

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`  
Type: situation card group + future custom input

## What it is

Wizard **step 1** is a fallback/clarifier for users who arrive through manual custom entry or direct `/intake`. It should not ask an abstract "what do you want?" question. It should help users recognize their real-world situation and show what DotAmi can do with it.

Current UI still has four goal tiles. Direction: expand/replace them with a richer set of situation-first cards plus a custom text path.

## What it does (behavior on interact)

- Click a tile toggles selection on/off (multi-select).
- Selected tiles show maple border + tinted background.
- Selection updates `intake.goals[]` immediately in journey state (sessionStorage via `JourneyProvider`).
- On final launch (`Next: Exploration →`), goals are converted to `goalWeights` via `seedGoalWeightsFromIntakeGoals()` before navigation.

Future behavior:

- Situation cards map to existing goal/path/engine tags.
- Custom text is accepted when none of the cards fit.
- Custom text is eventually labeled/categorized into actionable tags so the product can point the user in the right direction.
- The live preview should update immediately with likely sourced unlocks (write-offs, grants, thresholds, next actions).

## Why it exists (user purpose)

New users often do not know what is possible. This step should make possibilities visible, not just collect preferences. A user should learn something useful immediately and feel the app is applying real expertise to their situation.

**Option B behavior:** landing intent cards are treated as having answered enough to start at venture details. Goals remain a fallback/clarifier for custom manual entry and direct `/intake`.

## Copy (current labels)

Current helper: *"Pick what matters most to you — it sorts the paths you'll see next."*

Direction: replace with copy closer to:

> Pick what is already happening in your life. We will use it to surface paths, write-offs, grants, thresholds, and next actions that may fit.

| ID | Title |
|----|-------|
| `replace-income` | Replace or reduce employment income |
| `write-offs` | Write off things I'm already buying |
| `scale-ccpc` | Scale toward CCPC / corporate structure |
| `discover-now` | Understand what's available to me right now |

Candidate situation-card set to explore:

| Situation | Why it works |
|-----------|--------------|
| I bought tools, a vehicle, software, or equipment and want it to count | Immediately points to write-offs and documentation requirements |
| I am side-hustling while still employed | Common user state; points to sole-prop activation, GST threshold, write-offs |
| I am freelancing or billing clients already | Points to structure, invoicing, GST, incorporation timing |
| I am building software, AI, hardware, or a product | Points to SR&ED, Class 50 equipment, SaaS tools, IP/structure |
| I am making a hobby official | Points to Day 1 write-offs, business-use tests, low-risk start |
| I want to know which grants or credits might apply | Points to grants engine and province/activity filters |
| I want to lower tax on income I am already earning | Points to tax ladder, structure timing, salary/dividend later |
| Something else — I will describe it | Custom text path for uncategorized needs |

## State touched (field names only)

- `intake.goals: IntakeGoalId[]`
- `intake.goalWeights` (derived on launch, not on each toggle)
- Future: `intake.manualEntry` / custom intent labels (exact schema TBD)

## Downstream consumers (where the data goes today)

- **`/explore`** — `goalWeights` ranks path cards (`lib/paths/scoring.ts`).
- **Intake live preview** — goal chips in right panel.
- **Explore filter rail** — displays goal-derived weights (sliders).
- **Cockpit** — does **not** consume goals today (no fork prioritization wired).
- Future **live preview** — should show sourced/actionable unlocks as soon as the situation is selected.

## Cleanup / open questions

- Default draft pre-selects two goals — user may not realize they chose them.
- Landing entry cards now skip this step via `?start=venture`; they still do not pre-fill goals.
- Enforce minimum one goal before Next? (not implemented)
- Future: map landing intent → default goals if we switch from skip to confirm/adjust.
- Replace abstract goal tiles with situation cards.
- Add custom text input and later intent categorization.
- Each selected situation should produce at least one immediate, sourced preview item where possible.

## Backend wiring

TBD — to be specified later.
