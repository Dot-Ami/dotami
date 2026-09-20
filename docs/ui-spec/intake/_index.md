# Intake — page overview

Last updated: 2026-09-13 (S2.5.4a added Screen 0; 2026-07-02 workshop content below verified against shipped code)

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
