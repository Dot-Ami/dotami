# Free-text entry box + Map it

Page: Landing (`/`) · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-10-11 (the sentence is saved with the idea, dated and word for word; the box takes up to 2,000 characters)

## What it is

The textarea + `Map it →` pill. The entire product surface of this page — every other
control exists to help fill or bypass this one.

## What it does (behavior on interact)

- Typing updates local `text` state only. The box takes up to 2,000 characters (`maxLength`,
  `STATEMENT_MAX_CHARS`), the most a statement can hold, so what is saved is always the whole
  sentence, never a cut one.
- Submit via click on `Map it →` or ⌘/Ctrl+Enter. Button disabled while `text` is empty or
  a request is in flight (`parsing`, label swaps to "Reading…").
- On submit (`handleMapIt`):
  1. `POST /api/intent/parse` with `{ text: trimmed }`.
  2. Response `IntentParseResult` on success (`source: "llm"`); local
     `parseIntentFallback(trimmed)` on any non-OK response or thrown error
     (`source: "fallback"`) — never blocks the user.
  3. `applyIntentToDraft(prevDraft, result, trimmed, today)` merges onto the existing intake draft
     additively (union of activity tags/goals, province only overwritten if detected) and keeps
     the sentence with the person's own calendar day it was typed (`manualEntrySaidAt`).
  4. `useJourney().setIntake(...)` persists the merged draft (session-scoped, see Data
     source below).
  5. `router.push("/intake")`.

## Why it exists (user purpose)

Compass rule applied to input: let the user describe their situation in their own words,
translate it, but never decide for them — Screen A is where they confirm.

## State touched

`intake.ventureType`, `intake.activityTags`, `intake.goals`, `intake.province`,
`intake.capitalPurchasePlanned`, `intake.manualEntry`, `intake.manualEntrySaidAt`,
`intake.description`, `intake.intentParse`.

## Data source

`POST /api/intent/parse` (`app/api/intent/parse/route.ts`) — Anthropic tool-use
(`report_intent` forced tool), sanitized against `ACTIVITY_TAXONOMY` / `PROVINCES` /
`GOAL_IDS`; falls back to `lib/journey/intent-fallback.ts` keyword matching when no
`ANTHROPIC_API_KEY` or on any error.

**Persistence:** merged draft written to `sessionStorage` (`journey-provider.tsx`) —
browser-tab-scoped, no server log. Since 2026-10-11 the sentence is also **saved with the idea**:
when the intake's "Open my map →" first saves the idea (`POST /api/scenario/save` with
`firstWords: { text, saidAt }` and `goals`), the sentence becomes one dated statement in the
person's own words (`PersonStatement`, linked to the idea by a nullable `ventureId`), and the goal
picks go on the idea (`Venture.goals`). Until then they lived only in the tab and were lost when it
closed.

Why a statement and not a column on the idea: a statement already is "the person's words, dated,
never edited" — the store the charter names for them. So it is listed on What DotAmi knows under
"Your statements" and deleted with them, with no new kind of data to explain, and the venture card
reads it back through the link. Deleting the idea keeps the statement (the link is cleared,
`onDelete: SetNull`), like every other statement; deleting "Your statements" takes it. Written
once: only the save that creates the idea carries it, so a later save of the same idea (the
cockpit's autosave) can never write it again, even after the person deleted it. A save that fails
(no database) loses it, as it loses the idea; the cockpit's save line says the save failed.

The goals are picks, not words, so they belong to the idea (deleted with "Your ideas").
Neither feeds the map: the cockpit's rules still don't read goals (`lib/scenarios/evaluation-profile.ts`).
