# Projection footer

Page: Cockpit (`/cockpit`, Plan tab) · Component:
`components/cockpit/cockpit-projection-footer.tsx` · Lib: `lib/scenarios/projection.ts`
Type: chart panel (display-only)

Last updated: 2026-07-05 (page-mechanics workshop)
Workshop status: documented, sign-off pending

## What it is

Fixed 228px footer under the Plan graph: "PLANNING PROJECTION" header, an assumption
line, a slice legend, and a Recharts composed chart — stacked bars (four lifecycle
"tax-pressure" slices) + a dashed illustrative revenue line, Y1–Y5.

## What it does (behavior on interact)

Display-only (hover tooltips). Recomputes live via
`computeFiveYearProjection(profile, activeBranches)` whenever the profile or a branch
toggle changes — flipping GST timing or incorporation timing visibly moves the slices,
which makes it the second real feedback loop on the page after node recoloring.

## Where the numbers come from (the finding)

`lib/scenarios/projection.ts` — **illustrative heuristics, not engine data**:

- Revenue: linear interpolation Y1→Y3 from profile targets, then flat 8%/yr
  (`LATE_YEAR_GROWTH`) for Y4–5.
- GST envelope: `5/105` of revenue from the enrollment year (voluntary → Y1; wait →
  first year revenue ≥ `GST_SMALL_SUPPLIER = 30000`).
- Stage slices: hardcoded fractions of revenue (baseline 1.2%, sole-prop 7.5% dropping
  to ~2.9% post-incorporation, incorporation 5.8% + 1.5%/yr, etc.).

Two audit-relevant notes: (1) the constants live in `lib/` prose, not an engine
catalog, and are not citation-backed (M6/M11-adjacent — acceptable only because the
chart is labeled illustrative); (2) the threshold check uses `>= 30000` while the brain
(post-H3) treats exactly $30,000 as *not yet exceeded* — a planning-only inconsistency,
but the same class of bug H3 fixed.

**Assumption visibility (the standing workshop question):** the assumption line states
Y1/Y3 targets, province, and active branches — but not the growth rate, the slice
fractions, or what "tax pressure" means. The chart looks more precise than its inputs.

## Why it exists (user purpose)

Show the medium-term financial consequence of the decisions being flipped above it —
the "if X then Y shape changes" compass promise in chart form.

## Copy (current labels)

"PLANNING PROJECTION · Five-year revenue line + tax-pressure slices" · "Y1 — Y5 ·
illustrative only" · "Assumes \<Y1\> → \<Y3\> targets in \<province\>. Active branches:
\<summary\>." · slice legends "Stage 0 · baseline / Stage 1 · sole-prop / Stage 2 · GST
path / Stage 3 · incorporation".

## State touched (field names only)

Read-only: `profile.targetRevenueY1/Y3`, `profile.province`,
`scenarioState.activeBranches`.

## Downstream consumers

None — display only.

## Cleanup / open questions

- Surface the assumptions: tooltip or expandable "how this is computed" listing growth
  rate + slice basis; or reduce visual precision (fewer slices) to match input quality.
- Align the $30K comparison with the brain's exceed-not-reach rule (`>`), trivially.
- Post-v1: derive slices from engine/evaluator outputs instead of hardcoded fractions
  (the "smarter later" path); move constants to a catalog if the brain ever reasons
  about them.
- ~~Zero-target profiles produce an all-zero chart~~ **Resolved 2026-09-13 (S2.5.4d):** when
  Y1 and Y3 are both 0 the footer renders "PLANNING PROJECTION · not drawn yet" with a
  one-line prompt to add targets, instead of an empty chart.

## Backend wiring

None. TBD post-v1.
