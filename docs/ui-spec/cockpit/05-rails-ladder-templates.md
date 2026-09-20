# Cockpit rails: structure ladder + prep-tool templates

> **S2.5.4h (2026-09-14) — removed.** The projection footer is gone; the templates rail lists all four references (no archetype picks them). The behaviour below is the pre-cut record, kept for reference; the shipped surface is described in `CLAUDE.md` § What the app is.

Page: Cockpit (`/cockpit`) · Components: `components/cockpit/structure-ladder-rail.tsx`,
`components/cockpit/templates-rail.tsx` (rendered inside the left rail, surface 7)
Type: display list + external-link list

Last updated: 2026-07-05 (page-mechanics workshop)
Workshop status: documented, sign-off pending

## What it is

Two stacked sections in the 240px left rail below the archetype switcher: "Structure
ladder" (entity progression steps with Current/Passed/Ahead markers) and "Prep-tool
references" (external links for the user's accountant/lawyer).

## What it does (behavior on interact)

- **Structure ladder** — display-only. Renders every `structureLadderV2026` step
  (engine catalog, `lib/engines/structure/v2026/`) with label + trigger text.
  **Changed 2026-09-13 (S2.5.4d):** `activeStepId` is derived from the scenario's own
  `profile.structure` for intake-built ventures (null while `structureSource` is
  "assumed" → no rung marked, "set your structure above and the ladder places you"); the
  static `archetype.structureStepId` is used only for labeled examples. Steps before the
  active one show "Passed", after it "Ahead".
- **Templates** — one external link per `archetype.templateIds` entry, resolved against
  `templatesCatalogV2026` (engine catalog). Opens `externalUrl` in a new tab. Unknown
  ids are silently dropped. **Changed 2026-09-13 (S2.5.4d):** hidden behind a one-line
  placeholder while the structure is unset — the archetype's template list is not the
  user's (a solo apprentice was being shown a shareholder agreement).

## Data origin

Both read engine catalogs (good — no hardcoded venture knowledge here). The *selection*
(which step is current, which templates show) comes from the static archetype config —
so custom ventures inherit whichever archetype `resolveArchetypeForScenario` fell back
to, including Maya's ladder position and template list for unmatched profiles.

## Why it exists (user purpose)

Ladder: orient the user on where their entity structure sits in the standard Canadian
progression. Templates: give the "prep tool for your accountant" promise concrete
artifacts.

## Copy (current labels)

"Structure ladder" · "Entity progression — Canada, the first jurisdiction mapped. Prep
orientation, not filing advice." · "Current / Passed / Ahead" · "Prep-tool references" · "Orientation
links for your accountant or lawyer — DotAmi does not generate legal documents." ·
"Open reference ↗".

## State touched (field names only)

Read-only. `archetype.structureStepId`, `archetype.templateIds`.

## Downstream consumers

None — pure display + outbound links.

## Cleanup / open questions

- **Ladder "Current" should derive from the scenario** (`profile.structure`, or the
  brain's `evaluateStructureStep` which already exists post-H2), not a static archetype
  constant — as shipped, flipping the incorporation branch or editing structure doesn't
  move the ladder.
- **Placement** (the standing surface-7 question): both sections compete with the
  venture profile for 240px. Candidates: ladder → canvas layer or node-detail content;
  templates → export/handoff surface (they're advisor-facing, like the Handoff Packet).
- Template relevance is archetype-static; a profile-aware selection (via the evaluator)
  is the "smarter later" path.

## Backend wiring

None. TBD with rail-scope decision.
