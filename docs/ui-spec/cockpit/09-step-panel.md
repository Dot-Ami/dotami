# Step panel (in place of node detail)

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/step-panel.tsx` (on a road 0
step it wraps `components/node-detail-panel.tsx`; the quote box is `components/cockpit/amount-form.tsx`)
Type: panel (display + toggle buttons + checkboxes + form)

Last updated: 2026-10-24 (a tick on a line the idea's place leaves out is kept, and skill items drawn for the place, second review of #207; *Why this colour* on SR&ED deepening without a research kind of work, issue #40, 2026-10-13; built 2026-10-12, docs/architecture/future-cockpit.md § 1 row 5 and § 2, Cockpit screen as built)

> **Changed 2026-10-12 — part 2.** Every answer given here (a status, ticks, a skill mark, a quote once agreed, the fork's toggle) shows its receipt under the panel's refusal line ([13-receipts.md](./13-receipts.md)); opening another step clears it. At a fork, **Compare the endings** opens *Compare the two endings* on that fork ([15-compare.md](./15-compare.md)); since 2026-10-13 (the maintainer's answer to PR #159's question 1) only at a fork whose own pick, not the rules, puts steps on or off the path (`lib/cockpit/told.ts` `forksToCompare`), so not on a road 0 step, where the toggle is the pick, the tax rules colour the sides whichever is picked, and no Compare button shows. The *I'd incorporate at* box saves as the person types and gives no receipt.
>
> **Changed 2026-10-17 — Others in this line of work.** On a step its road marks as opening a business (`RoadStep.opensABusiness`; today only road 1's *Open your own shop*), a button **Others in this line of work**, under the fork's lines, opens that panel in place of the step ([landscape.md](./landscape.md)).

## What it is

The right-hand panel when a step is selected, a region named *Step*. It replaces node detail and keeps
all of it: on a step of today's general road it is node detail (the stage, the name, **Trigger** and
**If it applies**, *Compass, not GPS*, **For you on this stage**, **Elsewhere on your map**, **More about
this stage**, **Sources for this stage** through `CitationLinks` with each source's how-checked words and
**Show the words**, and the × button named *Close node detail panel*; since the honest-map change,
#145, also the **Your answers** line, the CRA's quoted words, *I'd incorporate at $___* and the ways
to incorporate side by side, [07-node-detail.md](./07-node-detail.md)), with these sections put between
the two lines and the cards. On a step of any other road it shows the step's name, its one line, the
same sections, its cards and *Sources for this step*.

The sections, in order:

1. **Why this colour** — road evaluation's sentence for the step (*"Today's rules light it, from your place
   (Alberta) and …"*, *"You marked this step not for me."*; since 2026-10-13, on *SR&ED deepening* for an
   idea without a research kind of work, *"None of the kinds of work on this idea is Software / SaaS,
   Manufacturing or AI / ML / R&D, and this step is on your path only with one of them."* (or *"This idea
   has no kinds of work on it, …"*), never what the person did or didn't tell DotAmi, where it said *"Today's rules give it this colour; no single answer of yours changes that."*, issue #40,
   [03-canvas.md](./03-canvas.md)).
2. **The road splits here: you choose** — only on a side of a fork. On today's road, that column's toggle
   (the same as on the map, *default, not your pick yet* until clicked). On another road, *Your pick:
   “…”* or *No side picked yet* (picking an ending is part 2's *Compare*).
3. **Your status** — **Doing**, **Done**, **Not for me**, each `aria-pressed`. Pressing one saves it;
   pressing the one that is on takes it back (*Press the one that is on to take it back.*).
4. **Done when** — each line of the step with a checkbox, its words as the box's label, and its citation
   under it; *1 of 2 ticked*. Ticking or unticking saves at once: the box shows the click straight away
   and the boxes wait (disabled) until the save is read back; a refused save puts the box back as kept and
   shows the reason above, so a box never stays ticked over a refusal. The count is what is kept. Empty:
   *No “done when” lines are written for this step yet.* Only the lines drawn for the idea's place are listed
   (`roadForPlace`); a tick on a line it leaves out is kept whatever list a save sends, and shows again where
   the line is drawn (second review of #207, 2026-10-24). Empty because the place left every line out: *This
   step's “done when” lines rest on other provinces' pages, so none is shown for your place.* (`emptySectionLine`
   in `lib/cockpit/view.ts`, which Your plan asks too).
5. **Skills it needs** — each skill item the step lists: its name (a button that selects it and dims the
   steps that don't list it), its kind (*legal requirement* or *listed skill*), **Have**, **Learning**,
   **Not yet** (`aria-pressed`) and **I don't know** (removes the mark; off when there is none), and the
   item's own sources through `CitationLinks`, mark or no mark. A legal requirement marked have reads
   *you said you hold this*; one marked not yet shows *The official way to get it:* with its cited route.
   Empty: *No skills are listed for this step yet.*, or, where the place left every item out, *The skills this
   step lists rest on other provinces' pages, so none is shown for your place.* (2026-10-24). Under the step's own items (2026-10-12), one line about
   the government's list for the person's pick of job, which belongs to the job, never to a step: with a job
   picked, *Your pick of job, “Cabinetmakers”: 44 on the government's list, 1 marked. The list is for the
   job, not for this step.* and **Open the list**; with none, *Pick the job closest to your work to see the
   government's skills list for it.* and **Pick a job**. Either button opens the Skills list behind the
   Skills gauge (and switches the Skills overlay on). Road 0's *Mandatory GST registration* lists its one
   legal requirement here, *A GST/HST registration with the Canada Revenue Agency*, with the compliance
   catalog's source. Since 2026-10-24 (second review of #207) the items are drawn for the idea's place: an item
   none of whose sources is federal or the place's own isn't listed there (`roadForPlace`; road 1's three Alberta
   items, *Alberta Student Number* among them, seen from Ontario), its pages counted in the step's *n sources for
   other provinces aren't shown.* line, and a mark on it stays the person's; a listed item shows its federal and
   own-province sources and its way to get it only when that page is one of them, with *n sources for other
   provinces aren't shown.* under them when some were left out (`skillItemsForPlace`). An item selected before
   the idea's place leaves it out stops dimming the map, so the map never stays dimmed with no row to unselect it
   (`linkedSkill` in `lib/cockpit/view.ts`); the selection itself is kept, so a later move to a place that lists the
   item again dims the map by it again and shows its row pressed.
6. **Costs** — each line in one of the three kinds: an official fee with its amount, *official fee ·
   source and day read* and its citation (one that applies only sometimes adds *Only if: <its condition>.
   Not added to any total.*, where a condition that already ends in a full stop gets no second one); the person's agreed number with *your quote · agreed* and
   **Change your number**; or a named line with *not priced yet* and **Add your quote**. A named line whose
   name has a source (a blank template) shows that citation too. Above them, *Not
   counted in the sums: this step is not on your path.* or *Not counted yet: it waits on a pick at “…”.*
   when road evaluation leaves them out. Empty: *No cost lines are written for this step yet.*, or, where the
   place left every line out, *This step's cost lines rest on other provinces' pages, so none is shown for your
   place.* (2026-10-24).
7. **Official pages you open yourself** — the step's own links (a registry, BizPaL), each opening in a new
   tab. Drawn only when the step has any; no shipped step has one yet.

**Add your quote** opens a box: **Amount** (read like 12,500 or 12500.50; *Write it like 12,500 or
12500.50.* otherwise; never below zero), **Where it came from** (a quote, a link, a receipt, your
guess), *Nothing counts until you agree to it.*, **Next: agree** and **Cancel**.

## What it does (behavior on interact)

- Status and ticks: `POST /api/futures/<id>/progress { roadId, stepId, status }` or `{ roadId, stepId,
  doneWhenIds }`; on success the page reads back what is kept and the map, gauges and *Next on your road*
  change. A refusal shows in an amber line at the top of the panel, in the server's words. Each save of
  ticks sends the step's whole list, so the boxes are off from a tick until that save is read back (a
  second quick tick would otherwise send a list without the first). The list sent holds the ticks kept on
  lines the place on screen leaves out, and the storage keeps those by the place in the file whatever list
  arrives (`ticksToSave`, 2026-10-24), so a tick from another province, or *Take back*, never removes one.
- Marks: `POST /api/skill-marks { skillItemId, mark }` (`mark: null` for I don't know).
- **Next: agree**: `POST /api/figures/propose` with source *typed by you*, one figure of kind
  `start-up-cost-line`, dated today at both ends, with `costLine { roadId, stepId, lineId, amountFrom }`;
  then the agree prompt opens, its row reading *A start-up cost (your number) · … · “Tools” on “Set up
  your shop”, from a quote*. The number counts only after **Agree**; closing the prompt leaves it
  waiting. Agreeing to a new number for the same line takes back the old one (storage).
- An idea not saved yet (only in this tab): every control is off and *This idea is not saved yet, so
  nothing here can be kept.* shows.
- × closes the panel.

## Why it exists (user purpose)

Everything about one step and the controls to do it, in one place, with every claim one click from its
source.

## Copy (current labels)

`lib/cockpit/words.ts` (`panel`, `amounts`); road evaluation's reason from `lib/roads/words.ts`; node
detail's own words unchanged.

## State touched (field names only)

`StepProgress.status`, `StepProgress.doneWhenIds`, `StepProgress.changes`; `SkillMark`; `Figure` (kind
`start-up-cost-line`, `roadId`, `roadStepId`, `costLineId`, `amountFrom`), status `proposed` until agreed.

## Downstream consumers (where the data goes today)

Road evaluation (the gauges, the colours, *Next on your road*); *What DotAmi knows about you* counts the
rows; Delete wipes them (step progress with the ideas, skill marks on their own box, figures with *Your
figures*).

## Cleanup / open questions

- On today's general road no step has *done when* lines, listed skills or cost lines yet, so those
  sections show their empty line until the road's content lands.
- A receipt line after each answer comes with part 2's *What you've told DotAmi*.

## Backend wiring

`app/api/futures/[id]/progress/route.ts`, `app/api/skill-marks/route.ts`, `app/api/figures/propose` and
`agree` (the agree prompt).
