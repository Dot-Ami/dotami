# Free-text entry box + Map it

Page: Landing (`/`) · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-10-24 (the draft is held in the window's memory, never its storage; Delete → Your statements
takes the sentence from it); 2026-10-12 (the box, its chips and Map it now sit inside the second of three doors, *I already have an idea*, with everything below unchanged: [04-three-doors.md](./04-three-doors.md)); 2026-10-11 (words typed before the page has finished loading are kept; the sentence is saved with the idea, dated and word for word, once per sentence typed; the box takes up to 2,000 characters and says so when full)

## What it is

The textarea + `Map it →` pill, inside the door *I already have an idea* since 2026-10-12. Until
then it was the entire product surface of this page.

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
  The same goes for words the browser itself puts back in the box: leave the front page with a full
  page load (a typed address, a reload elsewhere) and press Back, and the browser refills the box
  before the scripts run. Those words now stay and `Map it →` works with them; before, they showed for
  a moment and were emptied. Leaving by an in-app link or `Map it →` draws the page fresh, with an
  empty box. Browser test: "words the browser puts back in the front page's box after Back stay…".
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
`ANTHROPIC_API_KEY` or on any error. Since 2026-10-17 the keyword matching proposes only what the words
state (the idea harness's findings): a province only when they name one place in Canada (a city named
with a place outside Canada right after it doesn't count, nor does anything when the person is moving out
of Canada, read as the move's own first "to"; none with two provinces; a city that is also a first name
only after "in", "to"… or beside its province, and since 2026-10-23 (the maintainer's call a-call-14) after the
French "à", "au", "aux", "en" and "dans" too, with the provinces' French names read as their English ones
("Colombie-Britannique", "Nouvelle-Écosse", with or without accents and hyphens; "Terre-Neuve" only with its
hyphen); a place outside Canada named anywhere else changes nothing,
"moving to Calgary to open a store that ships to the USA" included); a kind of work only where it is the
person's own (not the customers', not their day job, not an app or AI tool they use); and "Equipment /
vehicle purchase on the path" only when they say buying, leasing, getting, needing or writing one off, with
up to four describing words between ("buy a brand new delivery van"), not when they rule it out, already
have it, it is the customers' or the customers need work done on it ("contractors need trucks detailed"),
or the work is a service on other people's ("I replace computers for small offices"). Each case is in
`tests/intent-fallback.spec.ts`.

**Persistence:** the merged draft is held in the window's memory only (`journey-provider.tsx`,
`lib/journey/held-journey.ts`), never in the window's storage (since 2026-10-24; until then the tab's
`sessionStorage`, `dotami-journey-v3`, which a journey page now removes unread). No server log. A
reload, a new window or the desktop app's Go menu before the idea is saved starts the intake afresh;
moving between DotAmi's pages, Mara's example included, keeps it. Since 2026-10-11 the sentence is also **saved with the idea**:
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
- **The window** sends it only while it isn't done. Every "Open my map →" makes a new idea (a new
  scenario id), for instance after "Edit venture profile" on the map leads back through the intake,
  so the server's rule alone would copy the sentence onto every new idea. The draft's
  `manualEntryDone` is set once a save that carried the sentence succeeds (`afterFirstSave`); a done
  sentence stays in the draft, so the intake still shows it, but is never sent again. When Delete on
  `/your-data` removes "Your statements", the sentence goes from the window's memory too, with its
  copy in `description` and the parse's reading of it, `intentParse` (`afterStatementsDeleted`
  through `intakeAfterDelete`, since 2026-10-24; until then it stayed in the tab's draft, marked
  done); the picks confirmed from it stay, as picks for the idea ("Your ideas" resets the whole draft).
  A new sentence typed here or in the intake's box clears the mark and goes with the next idea.

A save that fails (no database) leaves the sentence not done, so the next "Open my map →" from
this window can still keep it; the cockpit's save line says the save failed. Another window open at
the time of a Delete keeps its own memory: it writes its sentence only if no save there had kept it yet.

The goals are chips, not words, so they belong to the idea (deleted with "Your ideas") and go with
every new idea as they stand. Some can be marked by the parser from the sentence (step 3 above) and
confirmed on Screen A, so the idea's card reads "Goals marked on the intake", not "you picked".
Neither feeds the map: the cockpit's rules still don't read goals (`lib/scenarios/evaluation-profile.ts`).
