# The example future — page overview

Page: `/example/<id>` (one today: `/example/mara`) · Route: `app/example/[id]/page.tsx` · Components:
`components/cockpit/cockpit-page.tsx` (the cockpit, drawn with `example`), `components/cockpit/example-mode.tsx`
(the banner and the note), `components/cockpit/example-sources.tsx` (*Where these numbers come from*) · Data:
`lib/examples/mara.ts` (her answers), `lib/examples/mara-sources.ts` (the prices and statistics behind her
numbers), `lib/examples/stats.ts` (every average) · Words: `lib/cockpit/words.ts` `example`
Type: page (the cockpit, read-only)

Last updated: 2026-10-14 (real numbers: the maintainer, 2026-10-14, "Lets go for A, but try to go as in depth
as possible; like recommending tools, software, and lets use stats to drum up the average cost of these
tools. Once done; make sure to let the user know where you got those numbers and averages."). First
written 2026-10-13, before the code (the maintainer's pick of 2026-10-13: the front door's third door opens a
filled-in, clearly invented example future, Mara, on the first written road; design:
docs/architecture/future-cockpit.md § 13 and its appendix)

## What it is

The cockpit, drawn for an invented person instead of a saved idea: Mara, on *From apprentice to your own
shop (Alberta)*. It is the same screen a person gets for their own future, drawn by the same components
from the same run of road evaluation (`lib/roads/` `evaluateRoad`); only where the answers come from is
different. Her answers are data in their own file, `lib/examples/mara.ts`, never rows in the data file:
her words (*"My own small furniture shop, four-day weeks, home for supper."*), *Both, or not sure*,
Alberta, Cabinetmakers as the job closest to her work, 9 skills marked (6 have, 2 learning, 1 not yet), no
incorporation number of her own, *This is mine* on *Open your own shop*, and 1 step marked done (*Register as
a Cabinetmaker apprentice*).

**Mara is invented; her numbers are real** (since 2026-10-14, the maintainer's option A: "ground Mara's
example in real, cited numbers where they exist; numbers nothing real can supply stay blank"). None is typed
in her file; each is taken from `lib/examples/mara-sources.ts`, entries seen on 2026-10-14 and confirmed by a
second check, and every average is worked out by `lib/examples/stats.ts`:

| Her number | What it is | How it is worked out |
|---|---|---|
| *Woodworking machines and tools* on *Open your own shop*: **$14,993.62** | 12 of the tools the trade's official descriptions name (Alberta Cabinetmaker Curriculum Guide 0361, the Red Seal standard, NOC 72311), picked for this example (they name more; the panel's *Not priced yet* lists them), one of each, mid-range shop grade | Each tool's average of its 3 to 5 listed prices from Canadian sellers (KMS Tools, Busy Bee Tools, Canadian Woodworker, Federated Tool Supply, Princess Auto, Lee Valley, ARDEC), the 12 averages added up; *amountFrom* "a link" |
| Yearly income goal: **$52,255** | The average yearly salary of employed cabinetmakers in Alberta (alis, 2023 Alberta Wage and Salary Survey) | The figure as the source prints it; nothing converted. The goal bar says what it is in place of "agreed" |
| What-if, first-year sales: **$610,300** | The average yearly revenue of small and medium household and institutional furniture makers in Canada (ISED, NAICS 33712, 2024) | The source's 610.3 thousand dollars; an average over existing businesses, **not a first-year figure**, and the what-if bar says so |
| Savings, shop space deposit | Blank: **not priced yet** | Nothing real can supply one person's savings, and no source gives a typical lease deposit |

Until 2026-10-14 these were invented ($70,000 a year, quotes of $3,400 and $2,000, $12,000 of savings, a
$45,000 what-if); none of them appears in any file now (`tests/example-sources.spec.ts`). The catalogs'
own numbers (official fees with their sources, counts of steps, skills and lines) are as before. Where the
appendix's counts and the catalog's differ, the page shows the catalog's (the receipts below).

## The banner (never folds)

A row of its own above the header, outside every region that folds (the header's *Fold all panels*
doesn't touch it), and always on screen (since 2026-10-14, after review): it sits above the cockpit's
grid (`ExampleFrame` in `components/cockpit/example-mode.tsx`), sticks to the top of the window when the
page scrolls on a phone, and the phone's full-width sheets and the 768–1023 px step drawer start under it
(its measured height is the CSS variable `--example-banner-h`; 0 px on a person's own future, whose
sheets and drawer are unchanged). While a phone sheet is open the banner stays in sight but can't be
reached, like everything else behind the sheet. It says:

- **Mara is invented; the prices and statistics are real, from the sources listed, seen on 2026-10-14.
  Nothing here is saved.** (bold; since 2026-10-14. It was *Invented person, invented numbers, not real
  data. Nothing here is saved.*, which an example with no sources would still say.)
- *Mara's example future: an invented person on a written road. Here, "you" and "your" mean Mara, the
  invented person.* (the second sentence since 2026-10-14: the receipts and buttons are the words every
  person's own cockpit uses, so their "you" is said once to mean her; *What Mara did* says it again)
- **Where these numbers come from** (since 2026-10-14), a button (`aria-expanded`, `aria-controls`) that opens
  the panel below under the banner, inside its sticky row, so it is reachable from anywhere on the page; it
  reads **Hide where these numbers come from** while open. Closed when the page opens; remembered nowhere.
- **Start my own future →**, a link to `/start` (*Your destination*, the front door's first door).
- A status line (read out by a screen reader), empty until a control that would save is used; then
  *"This is an example. Start your own to keep anything."*

## Where these numbers come from (since 2026-10-14)

A region of that name under the banner (at most 60% of the window's height, scrolling inside), opened and
closed by the banner's button. Read-only; it sends nothing and keeps nothing. In order:

1. *Mara is invented, and so are Mara's answers. Every price and statistic on this page is real…; the
   official fees are from DotAmi's own cited catalog.* (since 2026-10-14, after review: it said *Every
   number on this page is real*, while her marks, her step done and her day are invented), and **Mara's
   numbers, and how each is worked out**: the four rows of the table above, each with its source's link
   (the what-if's row: *Mara's what-if, tried as first-year sales: $610,300, which is …*).
2. **12 of the tools the trade's official descriptions name, picked for this example, with average prices
   from Canadian sellers**, *in the order the Alberta curriculum teaches them, not by price*; the class
   priced (mid-range, shop-grade, picked for this example; single-phase; benchtop, jobsite, cordless and
   industrial machines left out; CAD before GST and shipping); the three official descriptions, linked. Then each of the 12 tools as a fold (a native `<details>`,
   remembered nowhere): its name and *Average of N listed prices: $X (median $Y; from $low to $high)*;
   opened, where the official descriptions name it, with their words and link, and every price: the amount,
   the seller, the day seen, the page's link, the product as the page names it (a sale, clearance or
   back-order said there), the words seen on the page around the price, and a note where the second check
   found one (a premium model that pulls the average up, a clearance price on an item out of stock, a
   class match in doubt).
3. **Software listed for this example, with listed prices in Canadian dollars**: design and drawing (SketchUp,
   Autodesk Fusion), cut lists and sheet layout (free tiers only: no paid plan is listed in Canadian
   dollars), bookkeeping and invoicing (QuickBooks Online Canada, Xero, FreshBooks, Wave). Each category
   says *Average of N plans billed month to month: $X a month (median…; from… to…)* over its plans billed
   month to month only (a yearly price is never turned into a monthly one; a plan billed once a year that
   its page prints by the month, SketchUp's annual plans, reads *$15.08 a month, billed yearly* and is
   listed apart, the same as Fusion's yearly term, since 2026-10-14 after review; a free tier never pulls an
   average down), then every plan with its price as listed, how it is billed, its words and link.
4. **What cabinetmakers earn in Alberta**, **Small furniture and cabinet businesses in Canada**, **Industrial
   space rents in Alberta, for context**: every statistic with its value as the source prints it, its unit
   and period, the source linked, the day seen, its words and what to know about it (employees only; not a
   first-year figure; net, with the costs on top and the gross rent listed beside it where the report gives
   them, for Calgary and Edmonton alike; an asking rate; a link that needs the browser's cookies).
5. **Not priced yet, and why** and **Seen but not used, and why**.

No line in it ranks, recommends or says what to buy: "recommending tools", as the maintainer asked, is a
pick of the tools the trade's official descriptions name, with what sellers charge, never called the
trade's whole list. The verdict and framing words are `tests/helpers/verdict-words.ts` (each with a
control): `tests/example-sources.spec.ts` checks the words, the data and the strings typed in the example's
components; the browser test checks the rendered banner, goal bar, what-if bar and panel.

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
| *Your target: $52,255 a year, before tax (yours, agreed <day>)* | *Mara's target: $52,255 a year, before tax: the average yearly salary of employed cabinetmakers in Alberta (alis, Government of Alberta) (2023 Alberta Wage and Salary Survey)* (since 2026-10-14: a statistic, so which one and when, in place of "agreed") |
| Gauge tags *your marks*, *yours + cited*, *yours*; the gauge *Your date* | *Mara's marks*, *Mara's + cited*, *Mara's*; *Mara's date* |
| *$14,993.62 your numbers (1 line)*; *your pick of job: …*; *your own skills: …* | *$14,993.62 Mara's numbers (1 line)*; *Mara's pick of job: …*; *Mara's own skills: …* |
| *What you've told DotAmi*, *16 things you've told DotAmi* | *What Mara told DotAmi*, *16 things Mara told DotAmi* |

The receipt lines (*"Because you marked 9 skills…"*) and the step panel's buttons keep the words every
cockpit uses; the banner and *What Mara did* say once that "you" there means Mara. *What Mara did*'s
headings say her name, not a pronoun (*Mara's skill marks*, *Mara's start-up cost, from listed prices*, *The
step Mara marked done*), so a second example person never inherits hers. While her own what-if is on, the
what-if bar adds, on the number's own line, *Mara's what-if is an industry average (Data year 2024), not a
first-year figure.* (short on purpose: a line more under the bar squeezed the map until its legend was out of
reach at 1280 by 720; the panel names the average).

## What it never does

- **No write of any kind.** The example sends no request that writes (no `POST` to any `/api/…` route),
  and reads none of the person's data either: it doesn't ask `/api/ventures`, `/api/figures` or
  `/api/futures/<id>`, so nothing of the real person's appears in it.
- **No browser storage.** The page is outside the journey's pages (`app/(journey)/`), so the journey
  draft in `sessionStorage` is neither read nor written; the fold answers are not read from or written to
  `localStorage`; *In your words* reads no list of unsaved statements. The browser test
  (`e2e/example-future.spec.ts`) compares both storages, the data file's row counts and the requests sent
  before and after clicking **Keep** and **Export**, the two save controls that answer in the banner; it
  checks that every other control in the table above is disabled (the step's status and skill marks, the
  Skills list's marks, *Add a skill* with a skill typed and the pick of job, the savings button, the date's
  **Save** with a month typed and **Clear**, **This is mine**, the told list's **Change**, **Take back**
  and **Answer**, and the **Structure** select) rather than clicking them. Any request to DotAmi's API
  other than `/api/law/provision` (a law's words, nothing of the person's) fails it, as does any request
  that writes.

## The receipts it shows (worked out, never written)

The told list shows, for each of Mara's answers, what it unlocked, through the same `withoutAnswer` and
`roadReceipt` every cockpit uses. Measured on the catalog of 2026-10-14 with her real numbers
(`tests/example-future.spec.ts` keeps them true):

- Her 9 marks: *"Because you marked 9 skills, 4 steps now have every skill they list marked have."* (the
  appendix wrote *3 steps now say needs 0 more*; road 1 lists three skills of its own, and her two *have*
  marks cover every skill on four steps).
- The Steps gauge: *1 of 17 marked done* (the appendix wrote *0 of 22* before she marked one; road 1 has
  17 steps since 2026-10-14, when *Keep your records from day one* was added; 16 before).
- The money gauge, plain arithmetic: *$1,220 official fees (7 lines) · $14,993.62 Mara's numbers (1 line)*,
  *1 official fee applies only sometimes, not added up*, *30 not priced yet*, *savings: not given yet* (no
  difference is worked out without savings; the appendix wrote *4 lines not priced yet*; road 1 names 31
  lines to price, 30 once the machines line is priced).
- Her start-up cost: *"Because you told us your number for “Woodworking machines and tools” on “Open your
  own shop” is $14,993.62, 30 cost lines are not priced yet."* No savings part: a part is shown only when
  its answer changed something.
- The what-if: *"Because you tried first-year sales of $610,300 (your what-if, not a forecast), 1 rules
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
- The other cost lines on *Open your own shop* (insurance, vehicle, first materials, legal advice, money to
  live on while starting) and *Design or CAD software* stay not priced: not researched in this pass, or a
  subscription the one-amount line can't hold without picking a plan for her.
- The prices were seen on one day (2026-10-14); sale prices end and pages move. Re-seeing them is a
  rerun of the same research, then this page's numbers follow (every average is worked out from the data).
