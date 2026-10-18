# What you've told DotAmi · Not told yet · the one-question box

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/told-list.tsx` (words:
`lib/cockpit/words.ts` `told`; rows: `lib/cockpit/told.ts` `toldRows`, `notToldYet`; *what it unlocked*:
`lib/roads/` `withoutAnswer` + `roadReceipt`)
Type: list + buttons + inline form

Last updated: 2026-10-12 (built; after review the same day: what the save keeps, the receipt's focus,
buttons named by row; docs/architecture/future-cockpit.md § 2, Cockpit screen as built, part 2)

## What it is

The top of the left rail, above the rail as it was (venture details, structure, *In your words*, the
ladder, the save line). Two regions:

- **What you've told DotAmi** (a region with that name; heading with the count, *4 things you've told
  DotAmi*). One row per answer road evaluation read that the person gave, in road evaluation's fixed
  order; a default the person hasn't set (the map's default pick, the structure the map assumes) is never
  a row, and a what-if never is. Each row:
  - the answer in its own words: *You told us your date is May 2099*;
  - its day (*2026-10-12*), or *day not kept* for the intake's answers, road 0's map picks and ticked
    *done when* lines, which keep no day of their own (none is borrowed);
  - *What it unlocked*: the receipt lines of road evaluation run without the answer and with it (the same
    words a receipt uses), or *Nothing on the road changes with or without it.*; for the place, the kind
    of venture and the work situation, *The map needs this answer: it can be changed, not taken back.*;
  - **Change** and **Take back** (see below).
- **Not told yet** (a region with that name). Each missing answer as *<question> → unlocks <what>*, in
  the order DotAmi asks them (a line says *In the order DotAmi asks them, not importance*): your date;
  your savings; your numbers for the cost lines not priced yet; your marks on the skills not marked; an
  ending at each fork with no pick (roads other than road 0); your pick at each of road 0's forks while
  it is the map's default and not picked by you, and only where picking the other side changes something
  on the road (since 2026-10-17: GST timing isn't asked of ride-share and taxi drivers, registered from the
  first paid ride either way); your structure while the map assumes one; buying
  equipment while unanswered (the intake's chip left off is unanswered: off is the chip not picked);
  your own *I'd incorporate at* number (road 0), only where some answer changes the road: once the idea
  has a third-year sales estimate, the number it is compared with, and while Incorporation timing holds
  *Incorporating* (with Liability / SR&ED picked the step is off the path whatever the number) (since 2026-10-17; its line: *“Incorporating” lighting once your third-year
  sales estimate reaches your own number*; the step's panel takes the number at any time, and without an
  estimate the step says it needs one, which a future picked on road 0 can't give yet: `docs/task-list.md`). At most five show; **n more** shows the rest. Each row
  has **Answer** (or **Open the list** / **Compare the endings** for the rows answered elsewhere) and
  **I don't know**. With none missing: *Nothing missing that DotAmi asks here.*
  Rows the person said *I don't know* to fold into *n you don't know yet* with **Show them**.

**The one-question box** opens under a *Not told yet* row's **Answer**, or a told row's **Change** for
the same kinds: the question, its *why we ask* line, one control, **Save**, **I don't know**:

| Question | Control | Saved through |
|---|---|---|
| By when? (month and year) | a month box, nothing before this month | `POST /api/futures/<id>/date` |
| Savings you'd put toward starting | the amount box | `POST /api/figures/propose`, then the agree prompt |
| Your pick at “<fork>” (road 0) | its two sides | the map's toggle, saved with the map; either side is the person's pick, kept as decided (key `decided`) |
| Your structure | Sole prop · Corporation | the map's save |
| Buying equipment, a vehicle or tools? | Yes · No | the map's save (Yes in `Venture.capitalPurchasePlanned`, No under the map's key `equipmentNo`) |
| The yearly sales at which you'd incorporate | whole dollars | the map's save |

## What it does (behavior on interact)

- **Change**: opens where the answer is given: the step panel (a status, ticks, a quote), the Skills list
  (a mark, a skill of one's own), *Compare* (an ending), the one-question box (above), the intake (the
  idea's other answers: place, kind of venture, work situation, kinds of work, sales, hire-first), or the
  idea's figures on *Your ideas* (agreed business figures).
- **Take back**: removes that one answer, the way `withoutAnswer` does: a skill mark or own skill through
  `POST /api/skill-marks` with no mark; a status or the ticks through `POST /api/futures/<id>/progress`
  (`status: null`, `doneWhenIds: []`); a quote or savings through `POST /api/figures/retract` (kept as
  retracted); the month through the date route with `null`; an ending through `POST
  /api/futures/<id>/ending { stepId: null }`; the idea's own answers through the map's save (structure
  back to not set, a map pick back to the default, kinds of work emptied, a sales number to none,
  hire-first off, equipment unanswered, *I'd incorporate at* cleared). No take back for the place, the
  kind of venture and the work situation (the map needs them), for agreed business figures (taken back on
  *Your ideas*), or for the yearly income target (no route yet).
- Every save and take back shows its receipt at the top of the list (a status line), which takes the
  keyboard focus and is scrolled into view, and adds it to *This visit* (13-receipts.md). Answers kept
  with the map say *Saving your answer…* until the map's save answers, or *Not saved yet* if it fails.
- Each button is named with its row for a screen reader: *Change: You told us …*, *Take back: You told
  us …*, *Answer: By when? …*, *I don't know: By when? …*.
- **I don't know** keeps nothing: it folds the row (or closes the box) for this visit.
- An idea not saved yet: the buttons are off and the not-saved line shows.

## Why it exists (user purpose)

The person sees everything they've said, dated, what each answer changed, and can change or withdraw any
of it; and sees the questions still open, each with the one thing it would unlock, with *I don't know*
always an answer.

## Copy (current labels)

`lib/cockpit/words.ts` `told`, `questions`.

## State touched (field names only)

Reads everything `GET /api/futures/<id>` gives and the idea's figures. Writes, only on a click:
`SkillMark`, `StepProgress.status`, `StepProgress.doneWhenIds`, `Figure.status` (retracted),
`Venture.targetMonth`, `Venture.forkPicks`, and the idea's saved map (`Venture` profile fields,
`ScenarioState.activeBranches`).

## Downstream consumers (where the data goes today)

Road evaluation (every gauge, card and step colour); *What DotAmi knows about you* and Delete, as before.

## Cleanup / open questions

- *Your starting point* is not a section of its own: its answers are rows here.
- The export doesn't include this list yet.

## Backend wiring

`app/api/skill-marks/route.ts`, `app/api/futures/[id]/progress/route.ts`, `app/api/futures/[id]/date/route.ts`,
`app/api/futures/[id]/ending/route.ts`, `app/api/figures/propose/route.ts`, `app/api/figures/retract/route.ts`,
`/api/scenario/save` (the map's save).
