# Right panel slot (node / lens / playbook switching)

> **2026-10-26 — a step's legal requirements and skills apart in Export** (the review of #209's merge). Under each step, its legal requirements under *What it needs* and its listed skills under *Skills it needs*, each only when the step lists one, as the step panel and Your plan split them. Until then every item was printed under *Skills and requirements on this step*, the Alberta Student Number among them. Tests: `tests/cockpit-plan.spec.ts`.

> **2026-10-23 — Export is the road on screen** (pre-release fix; review 30f, gap 22). The panel's markdown is built in the browser from what the cockpit holds, by the same run as Your plan (`lib/playbook/road-export.ts` `renderRoadExport`, from `lib/cockpit/plan.ts` `buildPlan`): every step of the road, column by column, with its state and your status, its done-when lines (ticked or not, each with its source), its cost lines (an official fee with its amount and source, your agreed quote, or "no amount yet", never $0), its official links and its sources for your place, with the count of other provinces' pages left out. A road 0 step that is a stage of the tax map keeps that stage's catalog fields under it. Until then Export printed the tax map's catalog stages on every road: the apprentice road's export held none of its 17 steps. Nothing is sent to DotAmi's server to build it; any what-if is left out, as on Your plan. Tests: `tests/prerelease-numbers.spec.ts`.

> **2026-10-13 — the export opens your plan.** Under **Copy markdown** and **Save as .md** the Export panel has a link, **Open your plan to read or print**, to `/plan?venture=<id>`: the same idea laid out to read and print, with **Print** ([../plan/_index.md](../plan/_index.md); issue #41). An idea not saved yet shows *"Save this idea first: the plan is made from what DotAmi keeps."* in its place. Copy and Save are unchanged.

> **2026-10-12 — the panel folds, and is a sheet on a narrow window.** A thin bar at the panel's top holds **Fold the panel**; folded, the panel is a narrow strip (a bar along the bottom below 1024 px) with **Show the panel: <what it holds>**, and stays folded while other steps, gauges or Export are opened. Below 768 px the panel opens as a full-width sheet; from 768 to 1024 px as a 420 px drawer over the road. [12-folding-and-phone.md](./12-folding-and-phone.md).
>
> **2026-10-12 — the cockpit screen, part 1.** The slot holds one of: the step panel (in place of node detail, which it keeps whole; [09-step-panel.md](./09-step-panel.md)), the skills list, the money list or the month box behind the gauges ([10-gauge-lists.md](./10-gauge-lists.md)), or the playbook export. Clicking a step, a gauge or Export replaces what is there. The agree prompt opens over the whole page, as on the Ideas page.
>
> **S2.5.4h (2026-09-14) — removed.** The slot holds node detail or the playbook export only; the Lens panel is gone. The behaviour below is the pre-cut record, kept for reference; the shipped surface is described in `CLAUDE.md` § What the app is.

Page: Cockpit (`/cockpit`) · Component: `components/cockpit/cockpit-page.tsx`
Type: panel container / mode switch

Last updated: 2026-07-05 (page-mechanics workshop)
Workshop status: documented, sign-off pending

## What it is

A 380px right column that exists only when occupied (`grid-cols` switches between
2- and 3-column). One occupant at a time via local `rightPanel` state:
`"node"` → `NodeDetailPanel` (surface 10), `"lens"` → `PreviewLensPanel` (surface 9),
`"playbook"` → `PlaybookExportPanel` (surface 11), `null` → hidden.

## What it does (behavior on interact)

- **Open rules:** node click → `"node"` unless Lens is open (Lens holds the slot and
  receives `clickedNode` as context instead). Header "Lens" pill toggles `"lens"`;
  header "Export" pill sets `"playbook"`; `?lens=open` opens Lens on load.
- **Close rules:** node panel close clears both selection and panel; Lens close falls
  back to `"node"` if a node is still selected, else closes; playbook close → hidden.
- **Type note:** the `RightPanel` union includes `"export"` and `showRightSlot` checks
  it, but nothing ever sets `"export"` — dead enum member; the Export pill uses
  `"playbook"`.

## Why it exists (user purpose)

Keeps the map primary: detail, chat, and export are borrowed space, one at a time,
instead of competing permanent columns.

## State touched (field names only)

Local `rightPanel`, `selectedNodeId`. Children receive `currentScenario`,
`selectedNode`, `nodeItems` (S2.5.4e: evaluator output for this scenario split by node
relevance — `lib/brain/node-items.ts`; the M12 hint-map module is deleted).

## Downstream consumers (where the data goes today)

`PreviewLensPanel` → `lens-chat-panel` → POST `/api/lens/chat` (**C1 open**: scenario
not validated server-side). `PlaybookExportPanel` → POST `/api/playbook` until 2026-10-23; since then it builds
the markdown in the page (`lib/playbook/road-export.ts`) and sends nothing (the note at the top).
`NodeDetailPanel` is read-only over catalog + annotation data.

## Cleanup / open questions

- One-slot model is sound; the question is default state — Lens open by default for
  new arrivals or closed (surface 9 question).
- Remove dead `"export"` enum member (trivial hygiene with the redesign).
- Node-click-while-Lens-open silently swaps chat context; is that visible enough to
  the user? (Surface 9.)

## Backend wiring

Via children only (lens/chat, playbook APIs). C1 fix lands in `app/api/lens/chat/route.ts`.
