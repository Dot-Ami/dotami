# Ideas page (`/ventures`) — page overview

Last updated: 2026-09-16 (S2.5.4i — built and verified in the pane)

**Route:** `/ventures` · **Component:** `components/ventures/ventures-page.tsx` ·
**API:** `GET /api/ventures` · `PATCH /api/ventures/[id]` · `POST|DELETE /api/ventures/[id]/links`
**Data:** `lib/db/ventures.ts` → Prisma `Venture` (+ `stage`, `notes`) and `VentureLink`.

**Decided 2026-09-14:** every business idea is labelled, saved and stored, and ideas can
cross-reference each other — so a new project lands next to what is already in progress
instead of starting from nothing.

## What it does

One card per saved venture, **ordered by when it was last touched** — never by any merit the
app computed (charter: DotAmi supplies information and options; the person supplies judgment). A
venture becomes a card the first time "Save / resume" is pressed on its map.

| Control | Behaviour | Persists to |
|---|---|---|
| **New idea →** | resets the session journey, opens `/intake` | — |
| **Stage** select (Idea · Prototype · First customers · Established) | `PATCH { stage }` on change | `Venture.stage` |
| **Your notes** textarea | `PATCH { notes }` on blur, only if changed; "Saved." / "Save failed." under it | `Venture.notes` — their words, never summarised |
| **Open in cockpit →** | `/cockpit?venture=<id>` — that venture wins over the session and becomes the session | — |
| **Cross-references** list | one line per link: kind · other idea (link to its cockpit) · their reason · remove | `VentureLink` |
| **+ Link** (kind · other idea · why) | `POST /links { toId, kind, note }`; one row per pair (re-linking updates it) | `VentureLink` |

Link kinds: **Sister company · Overlaps with · Feeds into · Related to.** A link is stored once
and shown on both cards.

## What it deliberately does not do

- No ranking, no score, no "best idea" — the order is recency of touch.
- No editing of the venture's facts (type, province, tags, numbers) — those live on the intake
  and the map, where the evaluator reads them.
- No "advice keyed to the kind of business" yet: the activity taxonomy is the spine for that
  and the evaluator already keys catalog entries on it; a cross-idea readout is the next
  story, not this page.

## Empty state

"Nothing saved yet. Describe one on the intake and press Save on its map." + the New-idea button.

## Verified 2026-09-16 (pane, `localhost:3000`)

Stage → Prototype and a note both landed in Postgres (`select name, stage, notes`); a second
idea created through the full intake → map → Save journey appeared with its tag,
capital flag and `structureSource = assumed` (the S2.5.4h bug fix, proven end to end); a
"Sister company" link showed on both cards and removed cleanly. Test data cleaned afterwards.
