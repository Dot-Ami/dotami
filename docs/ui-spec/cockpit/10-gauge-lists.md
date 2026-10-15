# The lists behind the gauges: skills, money, your date

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/gauge-panels.tsx`
(`SkillsListPanel`, `MoneyListPanel`, `DatePanel`)
Type: panel (list + toggle buttons + forms)

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built; *Your pick of job* from § 6, Skills as built)

> **Changed 2026-10-12 — part 2.** A mark, a skill of one's own, savings once agreed or a month saved in one of these lists shows its receipt under the list's title ([13-receipts.md](./13-receipts.md)). The lists also open from *Not told yet* (**Open the skills list**, **Open the money list**) and from a told row's **Change**.

## What it is

Clicking the Skills, Start-up money or Your date gauge opens one of these in the right-hand panel, in
place of a step, each a region named by its title with a × button named *Close*:

- **Skills on this road**: under the heading *On this road's steps* (so the job's list below never reads
  as the road's), every skill item the road lists, once, in the order the road first needs it,
  each with the same row as the step panel (name, kind, **Have / Learning / Not yet / I don't know**, its
  sources, *you said you hold this*, the official way to get it). With none: *No skills are listed on this road yet.
  Your own skills are below.* Then **Your own skills**: each one the person added, tagged *added by you*,
  with **Have / Learning / Not yet** and **Remove** in place of *I don't know*, since taking the mark off
  a skill the person typed removes the skill (*None added yet.* when empty); and **Add a skill**: a box (*A skill in your own words*,
  up to 120 characters) and **Add as have**, **Add as learning**, **Add as not yet** (off until something
  is typed). A skill of one's own is kept only with a mark. Then **Your pick of job** (2026-10-12): with
  none picked, *Pick the job closest to the work you'd do yourself*, the line *Optional. DotAmi then shows
  the government's skills list for that job, each item tagged “your pick of job”. Change it or take it back
  here any time.*, and a search box (*Search jobs by name or code*) that lists up to ten of the
  government's jobs holding every word typed, each anywhere in the name or at the start of the code, in
  the dataset's order, each a button reading *Cabinetmakers · 72311.00* (*No job name or code holds those
  words.* when none does; *Showing 10 of 56 jobs that match. Type more of the name or the code to narrow
  it.* when more match than are shown); then the licence's line with its link, as below. With one picked: *Cabinetmakers · 72311.00 · picked 2026-10-12*, **Change**
  (the search again, with **Cancel**) and **Take back**; *This is the government's list for the job you
  picked. DotAmi doesn't say which skills a business needs.*; then **Skills** and
  **Knowledge**, each with its source once (the dataset's page, checked by a tool) and its items in the
  dataset's order, each row its name, the tag *your pick of job* and **Have / Learning / Not yet / I don't
  know**; last, the licence's line *Contains information licensed under the Open Government Licence –
  Canada.* with a link, *The licence*. Names only: no rating is drawn.
- **Start-up money**: **Your savings for starting** (the agreed amount or *Not given yet.*, then
  *Nothing counts until you agree to it.*) with **Add your savings** / **Change your savings**, which opens
  the amount box (no *where it came from*); then every step with cost lines, in road order, its name a
  button that opens the step, and each line with its amount and kind (*official fee · source and day
  read*, *your quote · agreed*, *not priced yet*, a blank with no amount); an official fee that applies
  only sometimes with *Only if: <its condition>. Not added to any total.* (a condition that already ends
  in a full stop gets no second one); an official fee's citation, and
  a named line's name source when it has one, under the line through `CitationLinks`. With none: *No cost
  lines on this road yet.*
- **Your date**: the month and the count (*May 2029 · 31 months from today*) or *not set*; **Month and
  year** (a month box that offers nothing before this month); *Only you set it. DotAmi counts the months
  to it and nothing else.*; **Save** and **Clear** (off while none is set).

## What it does (behavior on interact)

- Marks: `POST /api/skill-marks { skillItemId | ownLabel, mark }`; the same skill of one's own typed with
  other capital letters is one mark. A mark on an item of the job's list is kept for the person and stays
  when the job is changed or taken back (one id per skill, shared by every job).
- Pick of job: `POST /api/futures/<id>/job { code }` (`null` takes it back); a code that isn't on the
  government's list is refused.
- Savings: `POST /api/figures/propose` (kind `savings-for-start`, dated today, source *typed by you*), then
  the agree prompt; counted only after **Agree**; agreeing to a new one takes back the old one.
- Date: `POST /api/futures/<id>/date { month }` (`null` clears); a month already gone is refused with
  *That month has already gone.*
- On success the page reads back what is kept, so the gauges change at once; a refusal shows at the top
  of the list in the server's words. An idea not saved yet: controls off and the not-saved line.

## Why it exists (user purpose)

Each gauge opens the list it counts, so the person can fill in the part that says *not given yet*.

## Copy (current labels)

`lib/cockpit/words.ts` (`lists`, `amounts`, `panel.marks`).

## State touched (field names only)

`SkillMark`; `Figure` (kind `savings-for-start`); `Venture.targetMonth`, `Venture.targetMonthSetAt`; `Venture.occupationCode`, `Venture.occupationPickedAt`.

## Downstream consumers (where the data goes today)

Road evaluation's gauges; *What DotAmi knows about you* and Delete, as for the step panel.

## Cleanup / open questions

- ~~The skills list has no OaSIS list yet.~~ Built 2026-10-12. Whether the government's ratings are shown
  beside the names is the maintainer's open item 20; names only until then.

## Backend wiring

`app/api/skill-marks/route.ts`, `app/api/futures/[id]/date/route.ts`, `app/api/futures/[id]/job/route.ts`, the figures routes; the list from `lib/engines/oasis/v2026`.
