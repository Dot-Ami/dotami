# Free-text entry box + Map it

Page: Landing (`/`) · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-07-02

## What it is

The textarea + `Map it →` pill. The entire product surface of this page — every other
control exists to help fill or bypass this one.

## What it does (behavior on interact)

- Typing updates local `text` state only.
- Submit via click on `Map it →` or ⌘/Ctrl+Enter. Button disabled while `text` is empty or
  a request is in flight (`parsing`, label swaps to "Reading…").
- On submit (`handleMapIt`):
  1. `POST /api/intent/parse` with `{ text: trimmed }`.
  2. Response `IntentParseResult` on success (`source: "llm"`); local
     `parseIntentFallback(trimmed)` on any non-OK response or thrown error
     (`source: "fallback"`) — never blocks the user.
  3. `applyIntentToDraft(prevDraft, result, trimmed)` merges onto the existing intake draft
     additively (union of activity tags/goals, province only overwritten if detected).
  4. `useJourney().setIntake(...)` persists the merged draft (session-scoped, see Data
     source below).
  5. `router.push("/intake")`.

## Why it exists (user purpose)

Compass rule applied to input: let the user describe their situation in their own words,
translate it, but never decide for them — Screen A is where they confirm.

## State touched

`intake.ventureType`, `intake.activityTags`, `intake.goals`, `intake.province`,
`intake.capitalPurchasePlanned`, `intake.manualEntry`, `intake.description`,
`intake.intentParse`.

## Data source

`POST /api/intent/parse` (`app/api/intent/parse/route.ts`) — Anthropic tool-use
(`report_intent` forced tool), sanitized against `ACTIVITY_TAXONOMY` / `PROVINCES` /
`GOAL_IDS`; falls back to `lib/journey/intent-fallback.ts` keyword matching when no
`ANTHROPIC_API_KEY` or on any error.

**Persistence:** merged draft written to `sessionStorage` (`journey-provider.tsx`) —
browser-tab-scoped only, no server log, no Postgres write. Whether to log query text at all
is an open question for the maintainers.
