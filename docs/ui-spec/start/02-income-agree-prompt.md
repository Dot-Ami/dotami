# The agree prompt for the yearly income

Page: Your destination (`/start`) · Component: `components/front-door/income-agree-prompt.tsx`
Type: modal dialog

Last updated: 2026-10-12 (built)

## What it is

A dialog (`role="dialog"`, `aria-modal`), titled *Agree to this number?*, opened after **Keep it** on the
income question proposed the amount. One row: *The yearly income you want, before tax · typed by you ·
<day>*, the amount in an editable box with *CAD* beside it, and what agreeing changes: *"It shows as
your target at the top of each future you open. Nothing compares it with anything."* Then the line every
agree prompt shows, *"Double-check what DotAmi did, and how, before you agree."*, and two buttons:
**No, I'll do it myself** and **Agree**.

It is its own small prompt, not the figures' one: that one is built for totals over a period on one
idea, and this number belongs to the person.

## What it does (behavior on interact)

- **Agree**: reads the box (an amount it can't read says *"Write it like 12,500 or 12500.50."* and
  sends nothing), then `POST /api/person-figures/agree { ids, edits? }` (an edit only when the amount
  changed). Only DotAmi's own window can do this. Agreeing takes back the income agreed before, which
  stays in the history. The prompt closes and the receipt shows.
- **No, I'll do it myself**: `POST /api/person-figures/discard { ids }`; the number is turned down and
  hidden; receipt *"Not kept."*
- **Close**, Escape or a click on the dim backdrop: closes, deciding nothing; the number waits,
  proposed, and the question stays open.
- Focus goes to the amount box on open, Tab stays inside the dialog, and focus returns to what opened
  it on close.

## Why it exists (user purpose)

No number counts until the person agrees to it (docs/architecture/figures-privacy-review.md).

## Copy (current labels)

`lib/front-door/words.ts` `incomePromptWords`; the check-first line and the amount help are the figures
prompt's own (`CHECK_FIRST_LINE`, `AMOUNT_HELP`).

## State touched (field names only)

`PersonFigure.status`, `confirmedAt`, `amountCents`, `editedByPerson`, `retractedAt`.

## Downstream consumers (where the data goes today)

The cockpit's goal bar (*Your target*), *What DotAmi knows about you*.

## Backend wiring

`app/api/person-figures/agree/route.ts`, `discard/route.ts` → `lib/futures/person-figures.ts`.
