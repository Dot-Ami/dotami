# Receipts and This visit

Page: Cockpit (`/cockpit?venture=<id>`) · Components: `components/cockpit/receipt-lines.tsx`, shown by
the step panel, the lists behind the gauges, `told-list.tsx`, `compare-endings.tsx`, `what-if-bar.tsx`;
*This visit* in `components/cockpit/what-if-bar.tsx` (words: `lib/cockpit/words.ts` `receipts`;
lines: `lib/roads/` `roadReceipt`, through `lib/cockpit/told.ts` `answerReceipt`)
Type: status line (display)

Last updated: 2026-10-24 (a failed save's receipt says only this window holds the answer, and what loses it); 2026-10-12 (built; after review the same day: receipts wait for the map's save, focus in the
left list, *This visit*; docs/architecture/future-cockpit.md § 2, Cockpit screen as built, part 2)

> **Changed 2026-10-24 — a change of place.** Its receipt names only the place: a tick count, a quote or a mark
> that came into or out of view because the road is drawn for the new place is neither said nor taken back
> (`drawnForPlace` on road evaluation's answers, `lib/roads/receipts.ts`), as a mark on the job's list is when the
> pick of job changes; and a step that lists no skill after the move, or listed none before it, is not counted as
> no longer having, or now having, every skill marked have. A move that leaves every listed skill out says so as the
> Skills gauge does, *…, this road's skills rest on other provinces' pages, so none is listed for your place.*, where
> it read *the skills now read 0 have, 0 learning, 0 not yet, 0 not marked* (third review of #207). Until then a
> move from Alberta to Ontario said *you ticked 1 of 3 “done when” lines on “Hire first employee”, you took back
> your ticks on … and you took back your number for …* (second review of #207).

## What it is

- **A receipt**: after an answer is saved, one or more plain lines saying what it changed, each starting
  with the answer: *Because you told us “Sole Prop activation” is done, 1 of 14 steps are now done.* A
  status line (`role="status"`, named *What changed*), shown where the answer was given: the step panel,
  the Skills / Start-up money / Your date list, *Compare*, the left list, or the what-if bar. With no
  change: *Saved. Nothing on the road changed.*; for a take back: *Saved: you took back … . Nothing on the
  road changed.*
- The idea's own answers, kept with the map (the structure, a map pick, buying equipment, *I'd
  incorporate at*, a what-if kept, a take back of one of them), wait for the map's save: in the left list
  the receipt says *Saving your answer…* until the save answers, then the lines, worked out from the idea
  the save read back; if the save fails, *Not saved yet: the save didn't go through. Only this window holds
  your answer: a reload or the desktop app's Go menu loses it. Save now tries again.* (until 2026-10-24 *Your
  answer stays in this tab*: the answer is in the journey held in the window's memory,
  `lib/journey/held-journey.ts`, never its storage). Elsewhere the receipt shows once the save has answered,
  and the save line says while it is on its way or failed.
- **This visit** (until 2026-10-12 *Since last time*): a line under the map, above *Next on your road*:
  the newest receipt line of this visit, with **n more this visit** for the rest (up to five, newest
  first) and **Show fewer**. Empty (not shown) until the first answer of the visit.

## What it does (behavior on interact)

A receipt is replaced by the next answer's; it stays until then. In the left list, where the row or box
the person used is gone once they answer, a new receipt takes the keyboard focus (it is focusable from
script only, `tabindex="-1"`) and is scrolled into view; the focus moves once per receipt, never when its
save answers later. **n more this visit** / **Show fewer** unfold and fold *This visit*. A reload empties
*This visit*.

## Why it exists (user purpose)

Each answer pays off at once with exactly what it changed, worked out by the rules and never written by a
model, so the person learns what each answer does.

## Copy (current labels)

The lines are road evaluation's (`lib/roads/words.ts`); the headings and the no-change line are
`lib/cockpit/words.ts` `receipts`.

## State touched (field names only)

None: worked out from two runs of road evaluation, before and after the save (after = what the save read
back), and kept only in the page's memory.

## Downstream consumers (where the data goes today)

None.

## Cleanup / open questions

- The return visit's *Since last time* (steps marked since the last visit, dates coming up, figure
  reminders) needs the day of the last visit, which isn't kept; not built. *This visit* keeps its own name
  until then.
- A receipt line counts steps and cards without naming them (*1 step now applies*); naming them is open.
- The *I'd incorporate at* box in a step's panel saves as the person types and gives no receipt; the same
  answer in the one-question box does.

## Backend wiring

None of its own.
