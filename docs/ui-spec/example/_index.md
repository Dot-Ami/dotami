# The example future — page overview

Page: `/example/<id>` (one today: `/example/mara`) · Route: `app/example/[id]/page.tsx` · Components:
`components/cockpit/cockpit-page.tsx` (the cockpit, drawn with `example`), `components/cockpit/example-mode.tsx`
(the banner and the note) · Data: `lib/examples/mara.ts` · Words: `lib/cockpit/words.ts` `example`
Type: page (the cockpit, read-only)

Last updated: 2026-10-13 (designed before the code; the maintainer's pick of 2026-10-13: the front door's
third door opens a filled-in, clearly invented example future, Mara, on the first written road; design:
docs/architecture/future-cockpit.md § 13 and its appendix)

## What it is

The cockpit, drawn for an invented person instead of a saved idea: Mara, on *From apprentice to your own
shop (Alberta)*. It is the same screen a person gets for their own future, drawn by the same components
from the same run of road evaluation (`lib/roads/` `evaluateRoad`); only where the answers come from is
different. Her answers are data in their own file, `lib/examples/mara.ts`, never rows in the data file:
her words (*"My own small furniture shop, four-day weeks, home for supper."*), *Both, or not sure*,
Alberta, a target of $70,000 a year agreed, Cabinetmakers as the job closest to her work, 9 skills marked
(6 have, 2 learning, 1 not yet), her own quotes on *Open your own shop* ($3,400 for *Woodworking machines
and tools*, $2,000 for *Shop space deposit*), $12,000 of savings, no incorporation number of her own,
*This is mine* on *Open your own shop*, and 1 step marked done (*Register as a Cabinetmaker apprentice*).
It opens with her what-if on: first-year sales of $45,000.

Every number on the page is either Mara's own invented figure (from that one file) or the catalogs' own
(official fees with their sources, counts of steps, skills and lines). Where the appendix's counts and
the catalog's differ, the page shows the catalog's (the receipts below).

## The banner (never folds)

A row of its own above the header, outside every region that folds (the header's *Fold all panels*
doesn't touch it), and always on screen (since 2026-10-14, after review): it sits above the cockpit's
grid (`ExampleFrame` in `components/cockpit/example-mode.tsx`), sticks to the top of the window when the
page scrolls on a phone, and the phone's full-width sheets and the 768–1023 px step drawer start under it
(its measured height is the CSS variable `--example-banner-h`; 0 px on a person's own future, whose
sheets and drawer are unchanged). While a phone sheet is open the banner stays in sight but can't be
reached, like everything else behind the sheet. It says:

- **Invented person, invented numbers, not real data. Nothing here is saved.** (bold)
- *Mara's example future: an invented person on a written road. Here, "you" and "your" mean Mara, the
  invented person.* (the second sentence since 2026-10-14: the receipts and buttons are the words every
  person's own cockpit uses, so their "you" is said once to mean her; *What Mara did* says it again)
- **Start my own future →**, a link to `/start` (*Your destination*, the front door's first door).
- A status line (read out by a screen reader), empty until a control that would save is used; then
  *"This is an example. Start your own to keep anything."*

## What works, and what answers instead

Reading works everywhere: the gauges and their lists, the overlay switches, the map and its hover arrows,
opening a step (its *done when* lines, skills, costs, sources and *Show the words*), *Next on your road*,
*Compare the two endings*, the what-if bar's **Try** and **Clear** (a what-if is kept nowhere, as on every
cockpit), the told list's **I don't know** (keeps nothing), and folding (for this page only: remembered
nowhere).

Every control that would save is drawn disabled, with the note *"This is an example. Start your own to
keep anything."* in place of the *"This idea is not saved yet"* line (step panel, the skills, money and
date lists, Compare, the told list), or, where a control isn't disabled, answers with that sentence in
the banner's status line and does nothing else:

| Control | In the example |
|---|---|
| A step's **Doing / Done / Not for me**, its *done when* boxes, **Add your quote** | Disabled, the note shown in the step panel |
| Skill marks (step panel and the Skills list), **Add a skill**, the pick of job | Disabled, the note shown |
| **Add your savings**, the month box's **Save** / **Clear** | Disabled, the note shown |
| **This is mine** | Disabled, the note shown; her pick stays pressed |
| The told list's **Change**, **Take back** and the not-told rows' **Answer** | Disabled, the note shown under the list's heading |
| The rail's **Structure** select | Disabled, the note under it |
| The what-if bar's **Keep** | Answers in the banner; the what-if stays on |
| **Export** (the header) | Answers in the banner; no plan is made |
| The step panel's *I'd incorporate at* box, a map toggle | Answers in the banner (neither is drawn on road 1 today) |

The rail's *Save now*, the save line, *Edit venture profile* and *All futures* are not drawn; **Start my
own future →** is drawn in their place. *In your words* shows Mara's words from the example, never the
real person's statements. The header's back link is **← Front door** (`/`). No figure reminder and no
agree prompt is ever drawn.

## Her answers are labelled hers (since 2026-10-14)

Where a person's own cockpit labels an answer or a number as theirs, the example says Mara's name
instead (`lib/cockpit/words.ts` `example.theirs`, given to the goal bar, `gaugeView` and the told list as
`person`; a person's own future is unchanged):

| A person's own cockpit | The example |
|---|---|
| *In your words* | *In Mara's words* |
| *where you want to be · your words · <day>* | *where Mara wants to be · Mara's words · <day>* |
| *Your target: $70,000 a year, before tax (yours, agreed <day>)* | *Mara's target: $70,000 a year, before tax (Mara's, agreed <day>)* |
| Gauge tags *your marks*, *yours + cited*, *yours*; the gauge *Your date* | *Mara's marks*, *Mara's + cited*, *Mara's*; *Mara's date* |
| *$5,400 your numbers (2 lines)*; *your pick of job: …*; *your own skills: …* | *$5,400 Mara's numbers (2 lines)*; *Mara's pick of job: …*; *Mara's own skills: …* |
| *What you've told DotAmi*, *16 things you've told DotAmi* | *What Mara told DotAmi*, *16 things Mara told DotAmi* |

The receipt lines (*"Because you marked 9 skills…"*) and the step panel's buttons keep the words every
cockpit uses; the banner and *What Mara did* say once that "you" there means Mara. *What Mara did*'s
headings say her name, not a pronoun (*Mara's skill marks*, *The step Mara marked done*), so a second
example person never inherits hers.

## What it never does

- **No write of any kind.** The example sends no request that writes (no `POST` to any `/api/…` route),
  and reads none of the person's data either: it doesn't ask `/api/ventures`, `/api/figures` or
  `/api/futures/<id>`, so nothing of the real person's appears in it.
- **No browser storage.** The page is outside the journey's pages (`app/(journey)/`), so the journey
  draft in `sessionStorage` is neither read nor written; the fold answers are not read from or written to
  `localStorage`; *In your words* reads no list of unsaved statements. The browser test compares both
  storages, the data file's row counts and the requests sent, before and after clicking every kind of
  save control (`e2e/example-future.spec.ts`).

## The receipts it shows (worked out, never written)

The told list shows, for each of Mara's answers, what it unlocked, through the same `withoutAnswer` and
`roadReceipt` every cockpit uses. Measured on the catalog of 2026-10-13 (`tests/example-future.spec.ts`
keeps them true):

- Her 9 marks: *"Because you marked 9 skills, 4 steps now have every skill they list marked have."* (the
  appendix wrote *3 steps now say needs 0 more*; road 1 lists three skills of its own, and her two *have*
  marks cover every skill on four steps).
- The Steps gauge: *1 of 16 marked done* (the appendix wrote *0 of 22* before she marked one; road 1 has
  16 steps).
- The money gauge, plain arithmetic: *$1,220 official fees (7 lines) · $5,400 Mara's numbers (2 lines)*,
  *1 official fee applies only sometimes, not added up*, *29 not priced yet*, *savings $12,000*, *savings
  minus both: $5,380* (the appendix wrote *4 lines not priced yet*; road 1 names 31 lines to price, 29
  once her two quotes are in).
- The what-if: *"Because you tried first-year sales of $45,000 (your what-if, not a forecast), 1 rules
  and tax card now says check first."*

## Why it exists (user purpose)

The front door's third door: a person who wants to see what DotAmi draws before telling it anything can
look inside a whole, filled-in future (decision 6 of 2026-10-11), knowing every line of it is invented.

## State touched (field names only)

None. Nothing is kept anywhere.

## Downstream consumers

None. **Start my own future →** opens `/start`.

## Cleanup / open questions

- The still picture of a filled-in cockpit on the front door (§ 1 row 1) can now be drawn from this
  example; not done here.
- The appendix's *"Since last time: 1 step marked done"* needs the return visit's list, not built yet.
