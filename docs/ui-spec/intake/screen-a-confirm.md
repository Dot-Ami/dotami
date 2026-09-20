# Screen A — "Did we get this right?"

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx`
Type: confirm screen (intent-parse output)

Last updated: 2026-07-02 (page-mechanics workshop, verified line-by-line against shipped code)
Workshop status: **signed off**

## What it is

The first intake screen. Renders the intent parse of whatever the user typed as
**editable chip groups**, and asks one question: did we get this right?

## What it does (behavior on interact)

- **Gate:** `hasInput` — true if `intake.intentParse` is set, or `activityTags`/
  `customTags`/`goals` non-empty, or `manualEntry` non-empty. If false (direct `/intake`
  visit with no prior Landing submission), renders `ConfirmEmptyState` instead: the same
  free-text box + `Map it →` as Landing, POSTing to the same `/api/intent/parse`
  (`handleInlineParse`). Once that resolves, `hasInput` flips true automatically — no
  explicit "confirmed" transition, purely state-derived.
- Chip groups (each editable in place):
  - **Venture type** — service / product / side-gig (single select, `Chip` toggle sets
    `intake.ventureType`).
  - **Activity** — `ACTIVITY_TAXONOMY` tags, toggleable (`toggleTag`); an "add your own"
    input appends to `intake.customTags` on Enter (kept for display; not matched against
    any engine catalog).
  - **Goals** — 4 fixed chips (`GOAL_CHIPS`: write-offs, replace-income, scale-ccpc,
    discover-now), toggleable (`toggleGoal`).
  - **Also picked up** — capital-purchase toggle (same field Screen B also edits — see
    `screen-b-ground.md`) + detected province as a
    removable chip (click clears `intake.province` back to `null`).
- **Unmapped honesty:** `intake.intentParse.unmapped` fragments render under "We
  couldn't map this — pick the closest below" in an amber block. This fires legitimately
  for generic phrasing the taxonomy can't specify (e.g. "a hobby") — not a bug, the
  product philosophy is admitting the gap rather than guessing.
- Primary action: `Looks right →` — local `setScreen("ground")` only. No validation, no
  API call, no state write beyond the screen flip.

## Why it exists (user purpose)

Compass rule applied to AI: the model proposes, the user confirms. This is also the
escape hatch for any venture the taxonomy doesn't cover yet — unmapped fragments are
never silently dropped.

## State touched

`intake.ventureType`, `intake.activityTags`, `intake.customTags`, `intake.goals`,
`intake.province` (removable chip only, never set here), `intake.capitalPurchasePlanned`,
`intake.manualEntry`/`intake.description`/`intake.intentParse` (via the empty-state
fallback box's `applyIntentToDraft`, identical to Landing's flow).

## Data source

`POST /api/intent/parse` (only reachable from this screen via the empty-state fallback
box) — Anthropic tool-use (suggestions only), keyword fallback
(`lib/journey/intent-fallback.ts`) when no API key or on error. Whether to persist the
query text is unbuilt and undecided — same as Landing, this text only lives in `sessionStorage`.

## Fixed 2026-07-02

The fallback matcher had no keyword coverage for "monetize a hobby" phrasing (one of
Landing's three example chips) — produced an entirely unmapped result (no venture type,
tags, or goals). Fixed in `lib/journey/intent-fallback.ts` (added monetize-related
keywords to the `discover-now` goal).
