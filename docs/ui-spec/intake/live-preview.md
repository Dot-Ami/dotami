# Live preview rail

> **S2.5.4h (2026-09-14) — removed.** The preview no longer derives an equipment purchase from the “Write things off” chip — only the explicit toggle sets `capitalPurchasePlanned`. `today` is the local calendar day, matching the cockpit. The behaviour below is the pre-cut record, kept for reference; the shipped surface is described in `CLAUDE.md` § What the app is.

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`
(`PreviewRail`/`PreviewRow`) — shared by Screen A and Screen B
Type: preview panel

Last updated: 2026-07-02 (page-mechanics workshop — **full rewrite**, previous doc described
the pre-2026-07-02 card/graph-teaser version which no longer exists in the shipped code)
Workshop status: **signed off**

## What it is

Right-side rail, always visible on both screens. Shows what the current intake draft
unlocks, live, as the user edits any field.

## What it does (behavior on interact)

- `evaluateProfile(buildEvaluationProfile(intake), { today })` — the Strategy Rules
  Engine (`lib/brain/`) — runs on every render, memoized on `[intake, today]`. This is the
  **entire** data pipeline; nothing here is hardcoded in the component.
- `rankUnlocks(evaluation.unlocks)`: drops `gray`-state items, sorts by
  `(fork ? 4 : 0) + (expires ? 2 : 0) + (state === "yellow" ? 1 : 0)` descending —
  fork-bearing and time-boxed items surface first.
- Renders the top 3 (`PREVIEW_VISIBLE`) as collapsed rows; remainder shown only as a
  count: "N more in your map →". Each row: colored dot (sage = green, amber = yellow),
  type chip (`item.typeChip`), title, +/− expand toggle. The toggle exposes `aria-expanded`
  and names the item whose details it opens or closes.
- Expanded row shows: why (`item.why`), payoff (`item.payoff`), expiry line if
  time-boxed (`item.expires`, "in use before \<year\>"), fork block if present
  (`item.fork.label`/`.note`), risk block if present (level: professional-required /
  caution / keep-records, GAAR flag, why + mitigation), and **every citation as a link to
  its official URL** (`CitationLinks`, `components/shared/citation-links.tsx` — S2.5.4f,
  2026-09-13; replaces the single `item.source` label): title ↗ · authority · jurisdiction ·
  verified date · statute-check status chip where one exists. A **PARTIAL** chip also sits
  on the collapsed row header when any citation is partial (`worstStatus`), so the
  Regulations gap (S2.5.2g) is visible before expanding.
- Province coverage banner: if `coverage === "federal-only"`, shows "Federal rules only
  for your province so far — provincial coverage coming" above the list.
- Empty state (`unlocks.length === 0`): "Answer to see what unlocks — every item is
  sourced, explained, and risk-rated." Never fakes fullness with placeholder content.

## Why it exists (user purpose)

The trust-building surface — proves DotAmi has real Canadian venture knowledge applied to
*this* user's specific answers, before they commit to opening the full cockpit. Compass
language throughout ("may unlock," never "you qualify for").

## State touched

Read-only — consumes the entire `intake` draft via `buildEvaluationProfile`, writes
nothing back. Local `expandedId` state (which row is expanded) resets on remount, not
persisted.

## Data source

`lib/brain/evaluateProfile` + `lib/brain/buildEvaluationProfile` — reads engine catalogs
under `lib/engines/*/v2026/` plus the Strategy Rules Engine's predicate DSL, evaluated
fresh against the live draft. No API call, no network request — pure client-side
computation (same code path the cockpit later uses for node states, once Phase 6's
remaining item — cockpit node coloring — ships).

## Superseded

The previous version of this doc described step-grouped cards (`Goals` / `Venture` /
`Location` / `Refine` sections), a compact graph-node teaser, and card ranking as "Phase
5+ backend work." None of that reflects the shipped component — the rail is
engine-evaluated today, not deferred, and grouping is by rank score, not active step (the
step concept doesn't exist in the 2-screen flow).
