# Cockpit canvas — the map as tier columns

Last updated: 2026-09-16 (S2.5.4j — built and verified in the pane). **Supersedes** the React
Flow graph this file described until 2026-09-16 (see git history before commit S2.5.4j).

**Component:** `components/cockpit/strategy-map.tsx` · **Tier data:**
`lib/engines/cfe/v2026/tiers.ts` · **Design record:** this file (decided 2026-09-16).

## What it is

A CSS grid of tier columns (four in v2026: Before the venture · Sole proprietor ·
Incorporating · Corporation running). No edges, no free-form layout, no React Flow.

Each column: `TIER n` · label · one-line subtitle · the branch toggle that belongs to it
(GST timing in Tier 2, Incorporation timing in Tier 3 — "default, not your pick yet" until
clicked, S2.5.4d). Then, in catalog order, one **stage card** per lifecycle node whose
`stage` the tier lists, and under each stage card one **lever card** per evaluator item
relevant to that stage (`itemsForNode(...).forThisStage`, S2.5.4e).

| Card | Shows | Click |
|---|---|---|
| Stage | name · chip (**now · your pick · done · ahead · not on your path**, from the branch picks) · trigger (2 lines) · left bar coloured by the evaluator (green met · amber plausible · grey n/a) | opens node detail |
| Lever | dot + type chip (Write-off / Grant / Threshold / …) · title · **applies** (green) or **check first** (amber) · `fork` when incorporating would change it · `in use before <year>` when time-boxed · PARTIAL chip when a citation is partial | opens the stage's node detail |

Stage and lever buttons have explicit accessible names. Stage names include the current status
and the action; lever names identify the item whose details open. Stage selection remains exposed
as `aria-pressed`.

Lever cards are hidden under a stage that is "not on your path". Grey (not applicable) items
are never drawn. A legend sits under the grid.

**Hover / select a stage card (ruling 2, same day):** `components/cockpit/map-arrows.tsx` draws
an SVG overlay of arrows from that card along `CFENode.branches` — solid to the next step,
dashed and fainter for each step after, to the end of the tree; rightwards when the target is
in a later tier, downwards inside a tier. Cards off that future dim to 35%. Hover wins while
the pointer is on a card; the selected card keeps its arrows otherwise. Arrows reach "not on
your path" cards too — those are the other paths. Measured 2026-09-16 on "Sole Prop
activation": 4 solid + 14 dashed, 1 card dimmed.

## What it does not do (charter)

No dollar ranges — the reference image had "$3K–$7K/yr" on every card; no engine computes
that, so nothing is shown. No ordering by merit; columns are lifecycle order, cards
are catalog order. No venture knowledge in the component: figures reach the screen only
through the evaluator's `why` / `expires`.

## Layout

`min-width: 820px`, four `minmax(195px, 1fr)` columns; fits an 1100 px window with the left
rail and no horizontal scroll (measured 2026-09-16 at 1260 px: canvas 1005 px, grid 965 px).
Narrower panes scroll the canvas horizontally, not the page.

## Verified 2026-09-16

Smart-glasses venture: 4 tiers, 10 stage cards, 5 lever cards; GST toggle in Tier 2; clicking
"Home office expenses" opened node detail with "For you on this stage · 2"; no React Flow
element in the DOM; cockpit route JS 85.4 kB → 15.4 kB.
