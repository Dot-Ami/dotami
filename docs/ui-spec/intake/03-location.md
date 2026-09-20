# Section 03 — Location

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`  
Type: select dropdowns

Last updated: 2026-06-11  
Workshop status: **Signed off — Phase 4 intake workshop**

## What it is

Wizard **step 3** — province and employment context.

## What it does (behavior on interact)

| Control | Behavior |
|---------|----------|
| Province | Single-select AB / BC / ON → `intake.province` |
| Current employment | Single-select from employment enum → `intake.employmentStatus` |

Updates journey state immediately. Preview panel reflects province in profile line.

Workshop direction:

- Province remains limited to AB / BC / ON for v1 scope.
- Employment status remains a lightweight context selector, not an eligibility claim.
- The right preview should immediately switch from generic map text to **province-specific and employment-aware hints**: registration thresholds, grant/program possibilities, payroll/hiring flags, and compliance branches.

## Why it exists (user purpose)

Canadian venture rules are province-specific (GST, incorporation, grants). Employment status affects which thresholds and branches apply on the map.

Step 3 is the trust step: it proves DotAmi is not giving generic startup advice. The user should see that changing province or employment context changes the sourced map.

## Copy (current labels)

- Section title: *Where are you operating?*
- Province (Alberta, British Columbia, Ontario)
- Current employment: employee, apprentice, self-employed, unemployed, other

## Immediate-value preview requirements

When Step 3 fields change, the live preview should eventually surface cards such as:

- `GST/HST small supplier threshold may matter` with CRA source.
- `Provincial registration path changes by province` with the applicable registry/source chip.
- `Training or hiring programs may differ by province` with source chips for AB / BC / ON program candidates.
- `Employment context affects branch timing` for employee/apprentice/self-employed cases, without claiming eligibility.

Cards must say why they appear, for example: `Shown because province is Alberta and hire-first is possible later`.

## State touched (field names only)

- `intake.province`
- `intake.employmentStatus`

## Downstream consumers (where the data goes today)

- **`buildScenarioFromIntake`** — scenario profile province + employment
- **`/explore`** — province filter in path scoring (`criteria.province`)
- **Live preview** — profile subtitle

## Cleanup / open questions

- v1 scope is AB/BC/ON only — PRD locked and signed off for this intake pass.
- Required for a meaningful map, but Phase 4 does not add blocking validation before Next.

## Backend wiring

TBD — to be specified later. Backend should filter preview-card candidates by province and employment status using sourced engine/catalog data.
