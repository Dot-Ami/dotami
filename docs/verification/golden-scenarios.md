# Golden scenarios (Phase 2)

This document locks what “golden” means for DotAmi v0 deterministic verification. Catalog bodies stay in `lib/cfe/v2026/`; golden **inputs** are `Scenario` objects under `tests/fixtures/golden-scenarios.ts` (kept outside `lib/` so Tailwind’s `lib/**/*.ts` scan stays clear of Vitest files).

Original v0 success criteria: five golden scenarios; structure exact; illustrative projection numbers stable in-repo via regression tests, with ±10% reserved for future cross-checks against external spreadsheets.

## Fixture index

| ID | Intent | Profile highlights | Branch picks |
| --- | --- | --- | --- |
| `example-service` | Golden example / default canvas | AB service, apprentice, 60k → 180k Y1–Y3 | Voluntary GST, incorporation at $80K net |
| `golden-bc-product-sred` | Product + SR&ED-style incorporation timing | BC, self-employed, 90k → 200k | Voluntary GST, liability / SR&ED incorporation |
| `golden-on-mandatory-low-ramp` | Mandatory GST + small-supplier curve | ON employee, 20k → 50k | Wait for $30K, incorporation at $80K net |
| `golden-ab-hire-first` | Hire-first branch visible | AB apprentice, hire-first | Same defaults as v0 intake |
| `golden-intake-on-sidegig` | Intake → `Scenario` pipeline | ON side-gig, employee | Defaults from `v0ScenarioDefaultActiveBranches` |

## Automated checks (`npm run test`)

- CFE node count = 8.
- Each fixture: `buildPlaybookSkeleton` produces two branch summaries, non-empty disclaimer, unique visible node IDs, every slice id exists in the catalog.
- Example service venture: visible playbook node set equals the five-node default path (baseline, sole prop, voluntary GST, $80K incorporation, service vs productize).
- Hire-first fixture: playbook includes `branch-hire-first-employee`.
- Projection: Example service venture five-year rows match the locked baseline array; mandatory low-ramp has `gstEnvelope === 0` in Y1 and positive by Y2; SR&ED path shows lower Y3 incorporation slice than the $80K path for the same profile.
- Graph: inactive GST option ghosted on Example service venture; `updateScenarioBranch` swaps ghost/active; `buildScenarioGraph` yields eight nodes.

## Manual / API-key smoke (not in CI)

- PRD “Example service venture first 12 months useful without a CPA” and disclaimer tone: qualitative maintainer sign-off.

## Source links

- Fixtures: `tests/fixtures/golden-scenarios.ts`
- Spec: `tests/golden-deterministic.spec.ts`
- Projection rules: `lib/scenarios/projection.ts`
- Branch state: `lib/scenarios/branches.ts`
