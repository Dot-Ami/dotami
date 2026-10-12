# Cockpit shell + Plan tab — page overview

> **S2.5.4h (2026-09-14) — removed.** Track/Compare tabs, the Lens panel, the projection footer, header fork chips, Focus / ? / Graph-language controls and the `?sample=` labeled examples are gone; with no saved venture the cockpit shows an empty state pointing at the intake. The behaviour below is the pre-cut record, kept for reference; the shipped surface is described in `CLAUDE.md` § What the app is.
>
> **Corrected 2026-10-11 — the back links.** This banner said "`← Back` goes to `/intake`". The shipped cockpit (read in `components/cockpit/cockpit-page.tsx` on 2026-10-11) has no such link: the header's link is **"← Ideas"**, to `/ventures`, and the empty state's link is **"← Back"**, to `/`. The empty state's two buttons go to `/intake` and `/ventures`.
>
> **Changed 2026-10-11 — the cockpit's job, and planning.** The maintainer's decision of 2026-10-11 gives the cockpit one job: *"the cockpit shows one future you're considering, whole, and is where you work through it."* Planning and doing both happen in the cockpit. The July plan of a separate Track tab for progress (surface 8 below, cut on 2026-09-14) is retired for good, not waiting to come back. The new regions (destination bar and gauges, overlays, the told / not-told list, *Next on your road*, Compare) are designed in [docs/architecture/future-cockpit.md](../../architecture/future-cockpit.md) § 2; each gets its control file here in the pull request that builds it.
>
> **Changed 2026-10-11 — how a source was checked.** In node detail (each item's sources and *Sources for this stage*) and in the playbook export (Export), every citation's "verified <date>" now says how it was checked: **"Read by a person on <date>"** only when a person is recorded as the reader, **"Read on <date>. Who read it wasn't recorded."** for most sources, an amber **"Read by an AI model on <date>. Not read by a person yet."**, or, for a source checked only by a tool, an amber **"Checked by a tool on <date>: it found on the page the exact words this entry relies on. Not read by a person yet."** with the words found under it (the maintainer's decision of 2026-10-11, option B). Details: [../shared/citation-links.md](../shared/citation-links.md).
>
> **Built 2026-10-12 — the cockpit screen, part 1.** The goal bar and four gauges (`07`), the overlay switches (`08`), the step panel (`09`), the lists behind the gauges (`10`) and *Next on your road* (`11`), drawn from one run of road evaluation ([future-cockpit.md § 2, Cockpit screen as built](../../architecture/future-cockpit.md)). The page's rows are now: header · goal bar · body (left rail · overlay switches, map and *Next on your road* · right panel). Part 2 adds the left list, the what-if bar, *Compare* and *This is mine*.

Last updated: 2026-07-05 (page-mechanics workshop, surface 6/11 — verified against shipped code)

**Route:** `/cockpit`
**Components:** [components/cockpit/cockpit-page.tsx](../../../components/cockpit/cockpit-page.tsx)
(shell, header, left rail, canvas, panel switching),
[cockpit-page-client.tsx](../../../components/cockpit/cockpit-page-client.tsx) (Suspense wrapper),
[strategy-map.tsx](../../../components/cockpit/strategy-map.tsx) (tier-column renderer)
**Workshop status:** mechanics documented 2026-07-05; superseded by the S2.5.4h/j notes below.

## Scope note

This folder covers the shell and Plan tab (surface 6). Related surfaces documented
separately: rails + projection footer (7), Track/Compare tabs (8), Lens panel (9), node
detail overlay (10), export panel (11).

> **S2.5.4j (2026-09-16):** the canvas is now tier columns — see `03-canvas.md` (rewritten).
> The React Flow / dagre description below is history.

## Architecture in one paragraph

Server route `app/(journey)/cockpit/page.tsx` (`force-dynamic`) loads the stub user's
latest venture from the database (`loadLatestVentureScenarioForStubUser`), falling back to
`defaultExampleScenario` (Maya) on no-DB/no-rows/error. Client `CockpitPage` resolves the
working scenario by priority: session (`useJourney().scenario`) → `?sample=<archetypeId>`
→ server prop → Maya; after sessionStorage hydration it re-adopts the session scenario
once (audit C2 fix, verified present). All graph state is derived: `buildScenarioGraph`
maps the 10-node CFE catalog + `scenario.state` node-id lists to React Flow nodes/edges,
laid out left-to-right by dagre. Node status comes from `scenario.state`
(completed/active/decision/ghosted id lists recomputed by `recomputeScenarioState` from
2 branch decisions + `hireFirst`) — **not** from the brain evaluator; `evaluateProfile`
`nodeStates` are still unwired (Phase 6 remaining item / M12).

## Control index (verified 2026-07-05)

| Control group | File |
|---------------|------|
| Header: back, tabs, fork chips, Focus/Lens/Export/? | [01-header.md](./01-header.md) |
| Left rail: venture block, field rows, archetype switcher, save/edit | [02-left-rail.md](./02-left-rail.md) |
| Canvas: React Flow graph, branch toggles, overlays | [03-canvas.md](./03-canvas.md) |
| Right panel slot (node / lens / playbook switching) | [04-right-panel-slot.md](./04-right-panel-slot.md) |
| Rails: structure ladder + templates (surface 7) | [05-rails-ladder-templates.md](./05-rails-ladder-templates.md) |
| Projection footer (surface 7) | [06-projection-footer.md](./06-projection-footer.md) |
| Goal bar and the four gauges (2026-10-12) | [07-goal-bar.md](./07-goal-bar.md) |
| Overlay switches and what they put on the road (2026-10-12) | [08-overlays.md](./08-overlays.md) |
| Step panel, in place of node detail (2026-10-12) | [09-step-panel.md](./09-step-panel.md) |
| The lists behind the gauges: skills, money, your date (2026-10-12) | [10-gauge-lists.md](./10-gauge-lists.md) |
| Next on your road (2026-10-12) | [11-next-on-your-road.md](./11-next-on-your-road.md) |

## Flow in / out

| Direction | Route / action |
|-----------|-----------------|
| **In** | `/intake` "Open my map →" (primary) · `/explore` "Open →" / "Next: Cockpit →" · landing "Open cockpit →" (no guard) and "See a sample venture →" (`?sample=maya-woodworker`) · direct visit (server scenario or Maya) |
| **Out** | "← Back" → `/explore` (**M9 — wrong for intake-origin users**) · "Edit venture profile" → `/intake` · no forward path — the cockpit is a dead end (open question since 2026-06-10) |

## Known issues affecting this surface (audit cross-refs)

- **M9:** "← Back" targets `/explore` for everyone; fork chips say "Explore →" but are not links.
- ~~**M12:** node detail annotations come from static hint maps~~ **Resolved 2026-09-13 (S2.5.4e):** node detail runs the evaluator on the scenario; `lib/archetypes/annotations.ts` deleted.
- **Phase 6 remaining:** evaluator `nodeStates` not wired into `buildScenarioGraph`.
- **C1 (open):** lens/chat validation — enters through the Lens panel hosted in this shell.
- **Dead controls:** "Focus" pill, "?" help circle, "? Graph language" overlay — no handlers.
- **Low (audit):** `cfeNodeCount` prop passed to `CockpitPageClient` but unused.
