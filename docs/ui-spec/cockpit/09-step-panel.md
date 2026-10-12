# Step panel (in place of node detail)

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/step-panel.tsx` (on a road 0
step it wraps `components/node-detail-panel.tsx`; the quote box is `components/cockpit/amount-form.tsx`)
Type: panel (display + toggle buttons + checkboxes + form)

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 1 row 5 and § 2, Cockpit screen as built)

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
   (Alberta) and …"*, *"You marked this step not for me."*).
2. **The road splits here: you choose** — only on a side of a fork. On today's road, that column's toggle
   (the same as on the map, *default, not your pick yet* until clicked). On another road, *Your pick:
   “…”* or *No side picked yet* (picking an ending is part 2's *Compare*).
3. **Your status** — **Doing**, **Done**, **Not for me**, each `aria-pressed`. Pressing one saves it;
   pressing the one that is on takes it back (*Press the one that is on to take it back.*).
4. **Done when** — each line of the step with a checkbox, its words as the box's label, and its citation
   under it; *1 of 2 ticked*. Ticking or unticking saves at once. Empty: *No “done when” lines are written
   for this step yet.*
5. **Skills it needs** — each skill item the step lists: its name (a button that selects it and dims the
   steps that don't list it), its kind (*legal requirement* or *listed skill*), **Have**, **Learning**,
   **Not yet** (`aria-pressed`) and **I don't know** (removes the mark; off when there is none), and the
   item's own sources through `CitationLinks`, mark or no mark. A legal requirement marked have reads
   *you said you hold this*; one marked not yet shows *The official way to get it:* with its cited route.
   Empty: *No skills are listed for this step yet.*
6. **Costs** — each line in one of the three kinds: an official fee with its amount, *official fee ·
   source and day read* and its citation; the person's agreed number with *your quote · agreed* and
   **Change your number**; or a named line with *not priced yet* and **Add your quote**. A named line whose
   name has a source (a blank template) shows that citation too. Above them, *Not
   counted in the sums: this step is not on your path.* or *Not counted yet: it waits on a pick at “…”.*
   when road evaluation leaves them out. Empty: *No cost lines are written for this step yet.*
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
  second quick tick would otherwise send a list without the first).
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
