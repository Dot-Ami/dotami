# Intake — page overview

Last updated: 2026-10-12 (issue #38: the intake opens on Screen 0, *About you*, only for a person with
no saved idea yet; anyone with one starts on Screen A, the screen they came for, and **← Back** from
Screen A still opens *About you*. Whether there is a saved idea is read on the server when the page is
drawn (`app/(journey)/intake/page.tsx`), so the first screen never changes under the person; with no
database it reads as none, and the intake starts on *About you* as before); 2026-09-13 (Screen 0 added;
2026-07-02 workshop content below verified against shipped code)

> **Designed 2026-10-20, not built yet (task 28g).** Screen B's **Open my map →** becomes **Next: the work
> closest to yours →**, which shows Pick a future's three steps (the job, where you are, the road) on this
> page, the live preview rail put away for them; the idea is saved at the road step's **Look inside**, on the
> road the person opened, so a typed idea no longer lands on the general road without saying why. The steps
> sit inside this page's own `intake` region, so its limit (4 regions, 5 controls at every width) holds for
> each: 3 regions, and the build held to its 5 controls, with the site footer's link counted. On this page the road step
> draws no *Name it* box (Screen B already asks it) and no regions of its own. Design:
> [../futures/01-whats-closest-to-your-work.md](../futures/01-whats-closest-to-your-work.md) § *Where it sits,
> on both ways in*; the counts per step in [01](../futures/01-whats-closest-to-your-work.md),
> [02](../futures/02-where-you-are.md) and [03](../futures/03-road-match.md) § *Regions and controls*.
> **Decided 2026-10-21 (the maintainer, call 1, "same-steps"):** the typed way ends on these three steps
> instead of opening the map.
>
> **Built 2026-10-22.** Screen B's button reads **Next: the work closest to yours →** and opens the three steps
> inside the `intake` region with the preview rail put away; the nav's **← Back** goes back one part, and from
> step 1 to Screen B. The idea is saved at step 3's **Look inside**, on the road opened, with the intake's
> answers and the steps' (`lib/journey/first-save.ts` `withTheSteps`); a save that fails opens nothing and says
> so (before, the map opened on the tab's copy). Clutter rows `intake-steps` and `intake-road`
> (`e2e/budgets.ts`).
>
> **The maintainer's calls of 2026-10-22, built in the batch 4 follow-up (task 28h).** Call 37: the last step,
> in both versions (a road written for the job, and none written), shows the intake's own 5 text sizes: its
> headings take the lead size the intake already draws instead of the title size. Call 38: with the job skipped,
> the last step counts 6 controls on a tablet (← Back, the word mark, both **Look inside**, the *Not here yet?*
> box, the footer's link), accepted as that step's own limit (`intake-road-skipped`, beside Pick a future's same
> step, 7 there). Call 36: a failed save opens nothing and says so, as built.

**Route:** `/intake`
**Component:** [components/discovery/intake-page.tsx](../../../components/discovery/intake-page.tsx) (one file — both screens + preview rail)

## Page job

Ask what the person wants DotAmi to know about them, in their words, dated (Screen 0 —
"get to know about me first", maintainer ruling 2026-09-13); then confirm the AI's translation of the
user's own words about the venture (Screen A), then ground it with location and optional
numbers (Screen B) — straight to cockpit. The live preview rail is
shared by both screens and is fully engine-driven (`evaluateProfile`, `lib/brain/`) — no
hardcoded content.

## Current control index (verified 2026-07-02)

| Control | File |
|---------|------|
| Screen 0 — About you (dated verbatim statements, skippable) | [screen-0-about-you.md](./screen-0-about-you.md) |
| Screen A — Confirm (incl. empty-state fallback box) | [screen-a-confirm.md](./screen-a-confirm.md) |
| Screen B — Ground it | [screen-b-ground.md](./screen-b-ground.md) |
| Live preview rail | [live-preview.md](./live-preview.md) |

## Layout

- Top nav: Back (home from Screen 0, `screen` state flip from A and B) + WordMark + "1 of 3 / 2 of 3 / 3 of 3" progress label
- Main column (`flex-1`): active screen
- Right column (`420px`, `lg:` breakpoint): live preview rail, always visible

## Flow in / out

| Direction | Route / action |
|-----------|-----------------|
| **In** | `/intake` from Landing's `Map it →` (draft pre-filled), or direct visit (Screen A renders its own empty-state fallback box) |
| **Out** | `/cockpit` (primary, `Open my map →`), `/explore` (secondary, only when goals include `discover-now`) |

## Superseded (do not use — kept for history only)

These describe the 4-step wizard, fully replaced 2026-07-02 by the two-screen flow above.
Content is stale (references AB/BC/ON-only provinces, a left context rail, and step-grouped
preview cards that no longer exist):

`01-goals.md`, `step-1-framing.md`, `02-venture.md`, `03-location.md`, `04-optional.md`,
`examples.md`, `next.md`, `nav.md`.
