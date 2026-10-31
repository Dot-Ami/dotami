# Escape hatches — sample venture / open cockpit

> **2026-10-24 — Your expenses, with no idea saved.** With no idea saved, “Your expenses →” (`frontDoorWords.nav.expenses`) is drawn instead while the Expenses page has a record to list: any record not turned down, such as the records kept when Delete took the ideas, or an agent's proposals waiting. It is read on the server beside the saved-idea check (`lib/front-door/saved-idea.ts` `hasListedExpenses`, by the Expenses page's own rule, `lib/expenses/store.ts` `LISTED_EXPENSE`) and opens `/expenses`. With an idea saved it isn't drawn: “Your futures →” leads to the page, whose nav links it. With nothing saved and no record, only “Settings”. So the header never holds more than three links.
>
> **The limit, in a browser copy only.** The links are as the data file stood when `/` was drawn. Back and Forward in a browser bring the page back from the browser's memory as it was first drawn, and a second window keeps what it was drawn with, so after an idea is saved elsewhere they can still show only “Settings” (or “Your expenses →”) until the page is drawn again: a reload, or opening `/` from a link. The desktop app has one window and no Back or Forward, and its Go → Home and View → Reload draw `/` afresh. Drawing the page again each time it is shown was left out: it adds a server draw on every visit, which can overlap a door clicked at once.

> **2026-10-23 — shown only once an idea is saved.** The front door's “Your futures →” and “Open cockpit →” are drawn only when the data file holds a saved idea (`lib/front-door/saved-idea.ts`, read on the server when `/` is drawn); for a brand-new person both opened empty pages. “Settings” is always there.

> **S2.5.4h (2026-09-14) — removed.** “See a sample venture →” is removed with the archetypes; only “Open cockpit →” remains, and the cockpit now has an empty state for the no-venture case (the open question below is answered). The behaviour below is the pre-cut record, kept for reference; the shipped surface is described in `CLAUDE.md` § What the app is.

Page: Landing (`/`) · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-10-24 (Your expenses with no idea saved, and the Back limit; Open cockpit's idea: the window's memory, never its storage); 2026-07-02

## What they are

Two links that skip the free-text → parse → intake flow entirely.

| Control | Location |
|---------|----------|
| "See a sample venture →" | Footer, right-aligned (only element left in the footer after the 2026-07-02 clutter removal) |
| "Open cockpit →" | Header, right side |

## What they do (behavior on interact)

- **Sample venture:** `handleSample()` → `setScenario(buildScenarioFromArchetypeId("maya-woodworker"))`
  then `router.push("/cockpit?sample=maya-woodworker")`. Builds a fully-formed scenario
  client-side from the Maya archetype, bypassing intent parse and intake completely.
- **Open cockpit:** raw `<GhostLink href="/cockpit">` — no handler, no state change.
  Navigates to `/cockpit` with the idea last open in this window, held in the window's memory
  (since 2026-10-24; until then the tab's `sessionStorage`), else the most recently saved idea, or
  the empty state when none is saved.

## Why they exist (user purpose)

Sample venture: fastest way to see a fully-populated cockpit without typing anything —
demo/evaluation path. Open cockpit: quick return path for a user who already has a
scenario going in this session.

## State touched

Sample venture: `scenario` (full overwrite, no merge). Open cockpit: none.

## Data source

Sample venture: `buildScenarioFromArchetypeId("maya-woodworker")`
(`lib/scenarios/build-scenario-from-intake.ts`) — archetype catalog, not hardcoded in the
component. Open cockpit: none (reads whatever cockpit itself resolves from session state).

## Open question

"Open cockpit →" has no guard for the empty-state case — what should render? Not resolved
here, deferred to the Cockpit workshop session (surface 6) — answered by the S2.5.4h note
at the top of this file.
