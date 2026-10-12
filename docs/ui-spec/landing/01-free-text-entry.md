# Free-text entry box + Map it

Page: Landing (`/`) · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-10-11 (words typed before the page has finished loading are kept; the sentence is saved with the idea, dated and word for word, once per sentence typed; the box takes up to 2,000 characters and says so when full)

## What it is

The textarea + `Map it →` pill. The entire product surface of this page — every other
control exists to help fill or bypass this one.

## What it does (behavior on interact)

- Typing updates local `text` state only. The box takes up to 2,000 characters (`maxLength`,
  `STATEMENT_MAX_CHARS`), the most a statement can hold. The browser drops anything typed or
  pasted past that, so once the box is full an amber line under it says so (`STATEMENT_FULL_NOTE`:
  "That's the most this box holds: 2,000 characters. Anything typed or pasted past that wasn't
  taken, so check the end of your text."). The intake's own "What are you building?" box does the
  same.
- Words typed before the page has finished loading are kept. The server sends the page already
  drawn, so on a slow computer the box can be typed into before the page's scripts have run; React
  never hears those keystrokes. Once, when React takes the page over (a layout effect, before any
  redraw), whatever is in the box becomes `text`, so `Map it →` enables and the words stay. Until
  2026-10-11 the button stayed greyed out and the next redraw emptied the box (CI's desktop test hit
  it three times in about 15 hours). Browser test: `e2e/app.spec.ts`, "words typed on the front page
  before it has finished loading…", which holds the page's scripts back while it types.
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
`intake.manualEntryDone` (cleared: a new sentence isn't kept with any idea yet),
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
chips as they stand on the intake go on the idea (`Venture.goals`). Until then they lived only in the
tab and were lost when it closed.

Why a statement and not a column on the idea: a statement already is "the person's words, dated,
never edited" — the store the charter names for them. So it is listed on What DotAmi knows under
"Your statements" and deleted with them, with no new kind of data to explain, and the venture card
reads it back through the link. Deleting the idea keeps the statement (the link is cleared,
`onDelete: SetNull`), like every other statement; deleting "Your statements" takes it.

Written once per sentence typed, in two places (`lib/journey/first-save.ts`):

- **The server** writes it only when the save creates the idea, so a later save of the same idea
  (the cockpit's autosave) can never write it again.
- **The tab** sends it only while it isn't done. Every "Open my map →" makes a new idea (a new
  scenario id), for instance after "Edit venture profile" on the map leads back through the intake,
  so the server's rule alone would copy the sentence onto every new idea and write back one the
  person deleted. The draft's `manualEntryDone` is set once a save that carried the sentence
  succeeds (`afterFirstSave`), and when Delete on `/your-data` removes "Your statements" from this
  tab (`afterStatementsDeleted`; "Your ideas" resets the whole draft already). A done sentence
  stays in the draft, so the intake still shows it, but is never sent again. A new sentence typed
  here or in the intake's box clears the mark and goes with the next idea.

A save that fails (no database) leaves the sentence not done, so the next "Open my map →" from
this tab can still keep it; the cockpit's save line says the save failed. Another tab open at the
time of a Delete keeps its own draft: it writes its sentence only if no save there had kept it yet.

The goals are chips, not words, so they belong to the idea (deleted with "Your ideas") and go with
every new idea as they stand. Some can be marked by the parser from the sentence (step 3 above) and
confirmed on Screen A, so the idea's card reads "Goals marked on the intake", not "you picked".
Neither feeds the map: the cockpit's rules still don't read goals (`lib/scenarios/evaluation-profile.ts`).
