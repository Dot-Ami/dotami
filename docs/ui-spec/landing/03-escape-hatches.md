# Escape hatches — sample venture / open cockpit

> **S2.5.4h (2026-09-14) — removed.** “See a sample venture →” is removed with the archetypes; only “Open cockpit →” remains, and the cockpit now has an empty state for the no-venture case (the open question below is answered). The behaviour below is the pre-cut record, kept for reference; the shipped surface is described in `CLAUDE.md` § What the app is.

Page: Landing (`/`) · Component: `components/discovery/landing-page.tsx`

Last updated: 2026-07-02

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
  Navigates to `/cockpit` with whatever `scenario`/`intake` already exist in
  `sessionStorage` from a prior visit, or nothing at all on a first visit.

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
