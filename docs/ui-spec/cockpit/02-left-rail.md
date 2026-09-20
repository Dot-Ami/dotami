# Left rail: venture block, field rows, archetype switcher, save / edit

> **S2.5.4h (2026-09-14) — removed.** “Switch labeled example” and the archetype label/planning line are removed; prep-tool references show all four catalog entries once the structure is set. The behaviour below is the pre-cut record, kept for reference; the shipped surface is described in `CLAUDE.md` § What the app is.

Page: Cockpit (`/cockpit`) · Component: `components/cockpit/cockpit-page.tsx`
Type: sidebar (mixed display + button group + links)

Last updated: 2026-09-13 (S2.5.4a — archetype hidden for real ventures, "In your words" section added; rest is the 2026-07-05 workshop)
Workshop status: documented, sign-off pending

## What it is

240px rail stacking, top to bottom: venture identity block, six `FieldRow` profile
lines, "Switch labeled example" archetype buttons, `StructureLadderRail`,
`TemplatesRail` (both surface 7), Save/resume + Edit venture profile buttons, and a
"Compass, not GPS" footer line. This is the rail every audit calls the most cluttered
spot in the product — it carries 6+ unrelated concerns.

## What it does (behavior on interact)

- **Changed 2026-09-13 (S2.5.4a):** `archetype.label` and `archetype.planningFocus` render
  **only when `isLabeledExampleScenario(currentScenario)`** (`lib/archetypes/resolve.ts`),
  prefixed "Labeled example ·". An intake-built venture shows `type · province` only, and
  its Structure row reads `<structure> · assumed` because intake has no structure control
  and the value came from the resolved archetype (`build-scenario-from-intake.ts:54`). Reason:
  the agent contract bars presenting the user as an archetype (`CLAUDE.md` § Product
  philosophy).
- **Structure row is a control (S2.5.4d, 2026-09-13).** For intake-built ventures the row is a
  `<select>` — Not set / Sole prop / Corporation — writing `profile.structure` +
  `profile.structureSource` (`"user"`) into the local and session scenario
  (`handleStructureChange`). While unset, the map assumes sole-prop (the same assumption
  `buildEvaluationProfile` already makes) and the row says "Map assumes sole prop until you
  set it." `structureSource` is persisted (`Venture.structureSource`, migration
  `20260913010000_structure_source`) so a reloaded venture does not turn an assumption back
  into a fact. Labeled examples keep the read-only `FieldRow`.
- **Structure ladder "Current" is derived from the scenario, not the archetype (S2.5.4d).**
  `ladderStepId` = null while unset (no rung marked, amber line), else sole-prop →
  `structure-sole-prop`, corporation → `structure-ccpc`. The archetype constant is used only
  for labeled examples. Before this, an apprentice with $0 revenue read "Passed / Passed /
  Current: CCPC" (maintainer ruling: "right now the current data is just make believe"*).
- **Prep-tool references are hidden while structure is unset (S2.5.4d)** — the template set
  belongs to the resolved archetype, not the user; a one-line placeholder says so.
- **"In your words" (new 2026-09-13)** — `PersonStatements variant="rail"`
  (`components/shared/person-statements.tsx`) between the FieldRows and the archetype
  switcher: dated verbatim statements newest-first (typed + vault), a collapsed
  "+ Add something" composer, and the same on-surface status lines as intake Screen 0.
  Full behaviour: `docs/ui-spec/intake/screen-0-about-you.md`. Holds no venture state.
- **Venture block + FieldRows** — display-only. Reads `currentScenario.profile` (name,
  type, province, targetRevenueY1/Y3 via `Intl.NumberFormat` CAD, structure,
  employmentStatus) plus `archetype.label` and `archetype.planningFocus`.
  `archetype = resolveArchetypeForScenario(currentScenario)` — matches
  `scenario.archetypeId` (or legacy `scenario.id`) against the 4 archetypes, else
  falls back to the default example archetype. **Custom intake ventures therefore show
  Maya's archetype label + planningFocus** under their own name unless
  `resolveArchetypeForIntake` assigned a closer one at build time (C3 fix reduces but
  does not eliminate this — 4 archetypes cover 4 of 8 path shapes).
- **"Switch labeled example"** — one button per `archetypesV2026` entry.
  `handleArchetypeSwitch`: rebuilds the scenario entirely via
  `buildScenarioFromArchetype`, sets it as both local and session scenario
  (`setScenario`), clears selection/panels, returns to Plan tab. **Destructive:** it
  replaces the user's real scenario in the session with the example — there is no undo
  and no confirmation; a user who built a custom venture and taps "Maya — woodworker"
  loses their working state (recoverable only if previously saved to Postgres).
- **Autosave + "Save now" (issue #1, 2026-09-20).** Every edit on this page (structure
  select, branch toggles) calls `scheduleSave(next)`: the save line reads *"Unsaved
  changes…"*, and `AUTOSAVE_DELAY_MS` (800 ms) after the last edit `persist()` POSTs
  `{ scenario }` to `/api/scenario/save` via `lib/journey/save-scenario.ts` (an upsert keyed
  by `scenario.id` — repeat saves are idempotent). Outcome on the line: *"Saved · 12:04"*
  (sage, local time, stays until the next edit) or *"Save unavailable — kept in this tab.
  Save now retries."* (maple). Before any edit the line reads *"Edits save
  automatically."* **"Save now"** skips the pause and is the retry. The intake already
  saved the venture on **Open my map**, so a cockpit reached from the intake is on disk
  before it renders. (H7 transactionality still open.)
- **"Edit venture profile"** — link to `/intake` (whole-journey walkthrough; the
  quick-edit vs full-intake question from 2026-06-10 stands).

## Why it exists (user purpose)

Answer "what venture am I looking at and with what assumptions" + escape hatches to
change or persist it. The archetype switcher is a dev/review affordance (per the
2026-06-10 doc) living in the primary user surface.

## Copy (current labels)

"Venture" · `<name>` · `<archetype label> · <type> · <province>` · `<planningFocus>` ·
FieldRow labels: Type / Province / Target Y1 / Target Y3 / Structure / Employed ·
"Switch labeled example" · "Save now" / "Saving…" · save line: "Edits save automatically." /
"Unsaved changes…" / "Saved · <hh:mm>" / "Save unavailable — kept in this tab. Save now retries."
· "Edit venture profile" · "Compass, not GPS. Profile drives which surfaces appear on
the map. DotAmi never files, predicts, or replaces an accountant."

## State touched (field names only)

Reads `currentScenario.profile`, archetype config. Writes `currentScenario` + session
`scenario` (switcher, save), local `saveState`.

## Downstream consumers (where the data goes today)

Save → `/api/scenario/save` → `parseScenarioInput` → venture + scenarioState upsert in
Postgres (stub user). Archetype switch → full scenario replacement → graph, footer,
Lens context, export all re-derive.

## Cleanup / open questions

- **Archetype switcher placement:** dev affordance in user chrome, and destructive
  without confirmation. Move behind a labeled example/demo mode, or guard it.
- **Rail scope** (2026-06-10 question, still open): profile fields + switcher +
  structure ladder + templates + save/edit compete in 240px. Must-show/hide decision
  needed — candidates to relocate: structure ladder and templates to canvas/node detail
  (surface 7 workshop), switcher behind a demo toggle.
- Archetype label/planningFocus shown for custom ventures is example bleed-through —
  either hide when the archetype is a fallback or label it as an example lens.
- ~~Save button says "Save / resume" but only saves~~ Fixed 2026-09-20 (issue #1): "Save
  now" + autosave; resume still happens implicitly at route load.

## Backend wiring

`/api/scenario/save` (exists, validated). Resume path: server component reads latest
venture for stub user. H7 transactionality open.
