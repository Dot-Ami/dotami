# Next / Launch

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`  
Type: button (wizard advance + final launch)

## What it is

Bottom-right primary action on every wizard step.

## What it does (behavior on interact)

| Step | Label | Action |
|------|-------|--------|
| 1–3 | `Next →` | `setCurrentStep(step + 1)` |
| 4 (final) | `Next: Exploration →` | `handleContinue()` |

**`handleContinue()` sequence:**

1. Merge `intake.goals` → `intake.goalWeights` via `seedGoalWeightsFromIntakeGoals`
2. Build scenario via `buildScenarioFromIntake` (new UUID)
3. `setScenario(scenario)`
4. `router.push("/explore")`

No validation gate — user can proceed with empty goals or default values.

## Why it exists (user purpose)

Clear forward motion through the wizard; final step launches the exploration phase with a seeded scenario ready for path ranking.

## Copy (current labels)

- `Next →` (steps 1–3)
- `Next: Exploration →` (step 4)

## State touched (field names only)

- `currentStep` (steps 1–3)
- `intake.goalWeights` (step 4 launch)
- `scenario` (step 4 launch)

## Downstream consumers (where the data goes today)

- **`/explore`** — receives full journey state (intake + scenario)

## Cleanup / open questions

- Add minimum validation (e.g. at least one goal) before launch?
- Step 4 Next could say "Launch exploration" for clarity.

## Backend wiring

TBD — to be specified later. Phase 5: persist intake + scenario snapshot on launch.
