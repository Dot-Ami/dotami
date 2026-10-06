# Ideas page (`/ventures`) — page overview

Last updated: 2026-10-06 (Your figures + agree prompt, [8a]/[8b]; the rest S2.5.4i, verified in the pane 2026-09-16)

**Route:** `/ventures` · **Component:** `components/ventures/ventures-page.tsx` ·
**API:** `GET /api/ventures` · `PATCH /api/ventures/[id]` · `POST|DELETE /api/ventures/[id]/links`
**Data:** `lib/db/ventures.ts` → Prisma `Venture` (+ `stage`, `notes`) and `VentureLink`; figures: `components/ventures/figures-panel.tsx` + `agree-prompt.tsx` → `/api/figures/*` → Prisma `Figure`.

**Decided 2026-09-14:** every business idea is labelled, saved and stored, and ideas can
cross-reference each other — so a new project lands next to what is already in progress
instead of starting from nothing.

## What it does

One card per saved venture, **ordered by when it was last touched** — never by any merit the
app computed (charter: DotAmi supplies information and options; the person supplies judgment). A
venture becomes a card the first time "Save / resume" is pressed on its map.

| Control | Behaviour | Persists to |
|---|---|---|
| **Settings** (nav, right) | opens `/settings` (added 2026-10-05, [7g]) | — |
| **New idea →** | resets the session journey, opens `/intake` | — |
| **Stage** select (Idea · Prototype · First customers · Established) | `PATCH { stage }` on change | `Venture.stage` |
| **Your notes** textarea | `PATCH { notes }` on blur, only if changed; "Saved." / "Save failed." under it | `Venture.notes` — their words, never summarised |
| **Open in cockpit →** | `/cockpit?venture=<id>` — that venture wins over the session and becomes the session | — |
| **Your figures** list | loads `GET /api/figures?venture=<id>` (only the idea's id is in the address; amounts travel in bodies). Confirmed totals, newest period first: kind · period · amount · "from <source> · N rows" · "edited by you" · **Retract**. Retracted ones sit greyed under "Retracted" with their date. Empty: "No figures yet." (added 2026-10-06, [8a]) | `Figure` rows (status `confirmed` / `retracted`) |
| **Retract** (on a figure) | asks inline "Retract this figure? Cards go back to your estimate." **Retract** / **Keep** (no browser dialog); Retract → `POST /api/figures/retract` | `Figure.status` → `retracted`, `retractedAt` |
| **N figures waiting for you to agree** + **Review** | amber banner when any figure is `proposed` (from an importer, the Lens, an outside agent, or typed here); Review opens the agree prompt | — |
| **Add a figure** (What · From · To · Amount · Currency) | every input has a label. Amount is read as cents ("12,500" or "12500.50"; anything else shows that hint). Submit → `POST /api/figures/propose` with source "typed by you", then **the agree prompt opens** — a typed figure is not confirmed by typing it | `Figure` row, status `proposed` |
| **Agree prompt** (dialog, [8b]) | "Agree to these figures?" Figures grouped "From <source>"; each row has its kind, period, an editable amount, currency and **Discard**. **Agree** → `POST /api/figures/agree` (edited amounts sent as `edits`); **No, I'll do it myself** → `POST /api/figures/discard` for everything shown. **Only Agree confirms a figure.** **Close**, Escape and a click outside confirm nothing — the proposals stay waiting. Over 20 figures: Agree stays off until the list has been scrolled to the end ("Scroll through all N to agree"). Errors show inside the prompt and nothing closes | `Figure.status` → `confirmed` (`editedByPerson` + new amount when edited) or `discarded` |
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
