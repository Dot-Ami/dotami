# Navigation (Back + WordMark)

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`  
Type: nav

## What it is

Top bar with journey back control and DotAmi home link.

## What it does (behavior on interact)

- **← Back (step 1):** `GhostLink` to `/` — returns to landing.
- **← Back (steps 2–4):** button decrements `currentStep` by 1 — previous wizard step.
- **DotAmi (WordMark):** link to `/` — home from anywhere on intake.

## Why it exists (user purpose)

Users must never feel trapped in the wizard. Back retraces steps; WordMark is a consistent escape to home.

## Copy (current labels)

- `← Back`
- `DotAmi`

## State touched (field names only)

- `currentStep` (local React state, steps 2–4 back only)

## Downstream consumers (where the data goes today)

None — navigation only.

## Cleanup / open questions

- Step 1 Back could stay as link vs button for consistency.
- Post-auth: home may route to dashboard instead of landing (v2).

## Backend wiring

TBD — to be specified later.
