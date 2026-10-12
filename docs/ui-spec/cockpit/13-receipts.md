# Receipts and Since last time

Page: Cockpit (`/cockpit?venture=<id>`) · Components: `components/cockpit/receipt-lines.tsx`, shown by
the step panel, the lists behind the gauges, `told-list.tsx`, `compare-endings.tsx`, `what-if-bar.tsx`;
*Since last time* in `components/cockpit/what-if-bar.tsx` (words: `lib/cockpit/words.ts` `receipts`;
lines: `lib/roads/` `roadReceipt`, through `lib/cockpit/told.ts` `answerReceipt`)
Type: status line (display)

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built, part 2)

## What it is

- **A receipt**: after an answer is saved, one or more plain lines saying what it changed, each starting
  with the answer: *Because you told us “Sole Prop activation” is done, 1 of 13 steps are now done.* A
  status line (`role="status"`, named *What changed*), shown where the answer was given: the step panel,
  the Skills / Start-up money / Your date list, *Compare*, the left list, or the what-if bar. With no
  change: *Saved. Nothing on the road changed.*
- **Since last time**: a line under the map, above *Next on your road*: the newest five receipt lines of
  this visit, newest first. Empty (not shown) until the first answer of the visit.

## What it does (behavior on interact)

Nothing to click. A receipt is replaced by the next answer's; it stays until then. A reload empties
*Since last time*.

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
  reminders) needs the day of the last visit, which isn't kept; not built.
- The *I'd incorporate at* box in a step's panel saves as the person types and gives no receipt; the same
  answer in the one-question box does.

## Backend wiring

None of its own.
