# Cockpit canvas — the map as tier columns

Last updated: 2026-10-11 (the map draws a road, and today's map is the road "Starting any business in
Alberta", unchanged; the cards' colours follow the person's own branch picks; a stage card's
accessible name says its colour in words; the legend gains grey's words; the Incorporating card no
longer lights from an amount DotAmi chose; 2026-10-06: card notes on how recent the figures are, [8e]; the map itself S2.5.4j — built and verified in the pane 2026-09-16). **Supersedes** the React
Flow graph this file described until 2026-09-16 (see git history before commit S2.5.4j).

**Component:** `components/cockpit/strategy-map.tsx` · **Road data:** `lib/engines/roads/v2026/`
(today: `generalRoadV2026`, built from `lib/engines/cfe/v2026/tiers.ts` and `nodes.ts` by `roadFromCfe`)
· **Design record:** this file (decided 2026-09-16) and docs/architecture/future-cockpit.md § 6.

**The map draws any road (2026-10-11).** The component takes a `Road` and imports nothing from the
CFE catalog: a column is a road column (`TIER n` is its place from the left, its name and the line
under it are the column's `label` and `summary`), a stage card is a road step (its name, and its
`summary` as the two-line text), the toggle in a column is the one for the column's `forkId`, and the
hover arrows follow the steps' `next`. Every saved idea is drawn on road 0 until storage lets it name
another road. Nothing a person sees or does on the map changed: `tests/road-map.spec.ts` draws six saved
states through the road and compares the HTML, byte for byte, with what the old map drew, and a browser
test checks the columns, cards, toggles and arrows.

## What it is

A CSS grid of tier columns (four in v2026: Before the venture · Sole proprietor ·
Incorporating · Corporation running). No edges, no free-form layout, no React Flow.

Each column: `TIER n` · label · one-line subtitle · the branch toggle that belongs to it
(GST timing in Tier 2, Incorporation timing in Tier 3 — "default, not your pick yet" until
clicked). Then, in the column's order, one **stage card** per step the column lists
(for road 0, the catalog's nodes whose `stage` the tier lists, in catalog order), and under each
stage card one **lever card** per evaluator item relevant to that stage
(`itemsForNode(...).forThisStage`).

| Card | Shows | Click |
|---|---|---|
| Stage | name · chip (**now · your pick · done · ahead · not on your path**, from the branch picks) · trigger (2 lines) · left bar coloured by the evaluator (green met · amber plausible · grey n/a), run on the person's own branch picks | opens node detail |
| Lever | dot + type chip (Write-off / Grant / Threshold / …) · title · **applies** (green) or **check first** (amber) · `fork` when incorporating would change it · `in use before <year>` when time-boxed · PARTIAL chip when a citation is partial | opens the stage's node detail |

Stage and lever buttons have explicit accessible names. Stage names include the current status,
the left bar's colour in words and the action — "Sole Prop activation, now, applies as answered,
opens detail"; the words are **applies as answered** (green), **check first** (amber) and
**doesn't apply as answered** (grey), so the colour is never the only way to tell. Lever names
identify the item whose details open. Stage selection remains exposed as `aria-pressed`.

**The colours follow the person's own picks (2026-10-11).** The cockpit runs the rules with the
venture's own `activeBranches` (`lib/scenarios/evaluate-scenario.ts` `evaluateScenario`, which the
cockpit and the readout API both call), so flipping GST timing or Incorporation timing recolours
the cards at once. Until then the cockpit ran the rules on the default picks, so a flipped toggle
moved the chips but not the colours. `tests/scenario-evaluation.spec.ts` fails if any screen or
route runs the map's rules on a saved venture without its picks.

**Incorporating (Tier 3, node id `stage-3a-incorporation-80k-net`, kept: ids are forever).** Until
2026-10-11 this card was "Incorporation at $80K net" and turned green when the third-year revenue
estimate reached $80,000 — a number no cited page sets, compared against sales although it was
written as net income. Now it is **Incorporating**, its trigger line reads "DotAmi doesn't pick a
point to incorporate. You do, with your accountant or lawyer.", and it is amber (**check first**)
while it is the selected option of Incorporation timing (the person's pick, or the default until
they click; its chip says "your pick" either way, a known wording gap, docs/task-list.md [10f]) and
grey when the other option is selected. No amount lights it. Its
detail keeps only cited facts: the CRA's corporation page and the small business deduction's
$500,000 business limit from the T2 guide. The toggle's options read **When you decide** and
**Liability / SR&ED**. Retained earnings planning (Tier 4) lights only when the person set their
structure to a corporation. Not yet: federal and Alberta incorporation side by side, and the
person's own "I'd incorporate at $___" (both come with the future cockpit).

Lever cards are hidden under a stage that is "not on your path". Grey (not applicable) items
are never drawn. A legend sits under the grid, with the three colours in the same words as the
cards' accessible names: **applies as answered**, **check first — confirm, time-boxed, or one fork
away** and **doesn't apply as answered** (the grey entry added 2026-10-11).

**Hover / select a stage card (ruling 2, same day):** `components/cockpit/map-arrows.tsx` draws
an SVG overlay of arrows from that card along the road's `RoadStep.next` (road 0: the nodes'
`branches`, unchanged) — solid to the next step,
dashed and fainter for each step after, to the end of the tree; rightwards when the target is
in a later tier, downwards inside a tier. Cards off that future dim to 35%. Hover wins while
the pointer is on a card; the selected card keeps its arrows otherwise. Arrows reach "not on
your path" cards too — those are the other paths. Measured 2026-09-16 on "Sole Prop
activation": 4 solid + 14 dashed, 1 card dimmed.

## What it does not do (charter)

No dollar ranges — the reference image had "$3K–$7K/yr" on every card; no engine computes
that, so nothing is shown. No ordering by merit; columns are lifecycle order, cards
are catalog order. No venture knowledge in the component: figures reach the screen only
through the evaluator's `why` / `expires` / `fromRecords`.

## When a card rests on the person's figures ([8a], [8e])

Under a card's text, node detail shows a green line when confirmed figures decided it or were
read for it: "From your records · N figures · N rows · from <sources> · see your figures".
Under it, a second grey line of whole sentences written by the rule (`RecordsBasis.notes`,
`lib/brain/evaluate.ts`; the component only prints them):

- "Newest figure ends September 30, 2026." — the last day of the newest figure the card counted.
  Left out when it counted none.
- "July to September 2026 isn't fully covered yet." / "April to June 2026 and 2 earlier quarters
  aren't fully covered yet." — recent quarters the rule reads that the figures don't cover in
  full, newest first. A quarter already explained as "two figures cover the same month" isn't
  repeated here.
- "One older figure isn't read: this rule looks only at the last four complete calendar quarters
  (October 2025 to September 2026) and the current one." — figures from before the first quarter
  the rule reads are listed, never dropped. The span comes from the rule's own `thresholdTest`,
  not from a number here; the current quarter is also read (for the single-quarter test), hence
  "and the current one".

A figure whose period ends after today is never counted (a wrong computer clock when it was
typed, a clock set back since, a restored backup). The card's own text says so, with the date:
"One figure isn't counted: it ends after today (2026-10-31) — check its date."

"Today" is the person's own calendar day (`lib/figures/use-local-today.ts`). It is read again when
the window comes back into view or gets focus, and at the next local midnight, so a map left open
across midnight or a quarter end moves to the new day without a reload.

## Layout

`min-width: 820px`, four `minmax(195px, 1fr)` columns; fits an 1100 px window with the left
rail and no horizontal scroll (measured 2026-09-16 at 1260 px: canvas 1005 px, grid 965 px).
Narrower panes scroll the canvas horizontally, not the page.

## Verified 2026-09-16

Smart-glasses venture: 4 tiers, 10 stage cards, 5 lever cards; GST toggle in Tier 2; clicking
"Home office expenses" opened node detail with "For you on this stage · 2"; no React Flow
element in the DOM; cockpit route JS 85.4 kB → 15.4 kB.
