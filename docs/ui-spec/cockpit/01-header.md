# Header: back link, tabs, fork chips, Focus / Lens / Export / ?

> **S2.5.4h (2026-09-14) — removed.** Tabs, fork chips, Lens, Focus and ? are removed; the header is Back · wordmark · venture name · Export. The behaviour below is the pre-cut record, kept for reference; the shipped surface is described in `CLAUDE.md` § What the app is.

Page: Cockpit (`/cockpit`) · Component: `components/cockpit/cockpit-page.tsx`
Type: nav + tab group + chip strip + button group

Last updated: 2026-07-05 (page-mechanics workshop)
Workshop status: documented, sign-off pending

## What it is

52px three-zone header (`240px / 1fr / 320px`): left = "← Back" + WordMark + venture
name; center = Plan/Track/Compare tabs + archetype fork chips; right = Focus, Lens,
Export pills + "?" circle.

## What it does (behavior on interact)

- **"← Back"** — static link to `/explore` for every user (**M9**: most users arrived
  from `/intake` and never saw Explore).
- **Venture name** — display-only, `currentScenario.profile.name`.
- **Tabs** — local `activeTab` state swaps the canvas child: `plan` → graph,
  `track`/`compare` → `CockpitPlaceholderTab` (surface 8). Track/Compare carry an amber
  "soon" superscript.
- **Fork chips** — `getForkChipsForArchetype(archetype, currentScenario)`
  (`lib/archetypes/forks.ts`): the archetype's `forkPriority` list joined with
  `branchDecisions` labels + the scenario's active option per decision. A chip renders
  "resolved" (45% opacity) unless it's the archetype's current focus decision (first
  fork still on its default branch). **Not interactive** — each chip ends with an
  "Explore →" caption that is a `<span>`, not a link (M9 note). Duplicates the branch
  toggles on the canvas (03) as display-only echoes.
- **"Focus" pill** — **no onClick. Dead control.**
- **"Lens" pill** — toggles `rightPanel` between `"lens"` and `null` (04). Also
  openable via `?lens=open` query param on load.
- **"Export" pill** — sets `rightPanel = "playbook"` (04 / surface 11).
- **"?" circle** — **no onClick. Dead control.**

## Why it exists (user purpose)

Orientation (whose venture, which mode) + the two cross-cutting actions (Lens, Export).
Fork chips intend to surface "your open decisions" at eye level — but as non-interactive
echoes of the canvas toggles they add a second, unclickable copy of the same state.

## Copy (current labels)

"← Back" · "Plan / Track / Compare" (+ "soon") · chip format `<category> <decision
label>: <active option>` + "Explore →" · "Focus" · "Lens" · "Export" · "?".

## State touched (field names only)

Local: `activeTab`, `rightPanel`. Reads `currentScenario.profile.name`,
`scenario.state.activeBranches` (via fork chips), archetype `forkPriority`.

## Downstream consumers (where the data goes today)

Tab state and panel state are render-only. Fork chips consume but never mutate scenario
state.

## Cleanup / open questions

- Remove or wire "Focus" and "?" — two dead controls in the primary header.
- Fork chips: make them the *interactive* branch controls (and drop the canvas overlay),
  make them links to the node detail, or cut them. Two renderings of the same decision
  state with different affordances is the clutter pattern every audit flags.
- "Explore →" caption is misleading (not a link; Explore is demoted anyway).
- Back-link destination must depend on actual origin (intake vs explore) — M9 fix.

## Backend wiring

None (client state only). TBD after workshop decisions.
