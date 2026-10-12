# The lists behind the gauges: skills, money, your date

Page: Cockpit (`/cockpit?venture=<id>`) · Component: `components/cockpit/gauge-panels.tsx`
(`SkillsListPanel`, `MoneyListPanel`, `DatePanel`)
Type: panel (list + toggle buttons + forms)

Last updated: 2026-10-12 (built; docs/architecture/future-cockpit.md § 2, Cockpit screen as built)

## What it is

Clicking the Skills, Start-up money or Your date gauge opens one of these in the right-hand panel, in
place of a step, each a region named by its title with a × button named *Close*:

- **Skills on this road**: every skill item the road lists, once, in the order the road first needs it,
  each with the same row as the step panel (name, kind, **Have / Learning / Not yet / I don't know**, its
  sources, *you said you hold this*, the official way to get it). With none: *No skills are listed on this road yet.
  Your own skills are below.* Then **Your own skills**: each one the person added, tagged *added by you*,
  with **Have / Learning / Not yet** and **Remove** in place of *I don't know*, since taking the mark off
  a skill the person typed removes the skill (*None added yet.* when empty); and **Add a skill**: a box (*A skill in your own words*,
  up to 120 characters) and **Add as have**, **Add as learning**, **Add as not yet** (off until something
  is typed). A skill of one's own is kept only with a mark.
- **Start-up money**: **Your savings for starting** (the agreed amount or *Not given yet.*, then
  *Nothing counts until you agree to it.*) with **Add your savings** / **Change your savings**, which opens
  the amount box (no *where it came from*); then every step with cost lines, in road order, its name a
  button that opens the step, and each line with its amount and kind (*official fee · source and day
  read*, *your quote · agreed*, *not priced yet*, a blank with no amount); an official fee that applies
  only sometimes with *Only if: <its condition>. Not added to any total.*; an official fee's citation, and
  a named line's name source when it has one, under the line through `CitationLinks`. With none: *No cost
  lines on this road yet.*
- **Your date**: the month and the count (*May 2029 · 31 months from today*) or *not set*; **Month and
  year** (a month box that offers nothing before this month); *Only you set it. DotAmi counts the months
  to it and nothing else.*; **Save** and **Clear** (off while none is set).

## What it does (behavior on interact)

- Marks: `POST /api/skill-marks { skillItemId | ownLabel, mark }`; the same skill of one's own typed with
  other capital letters is one mark.
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

`SkillMark`; `Figure` (kind `savings-for-start`); `Venture.targetMonth`, `Venture.targetMonthSetAt`.

## Downstream consumers (where the data goes today)

Road evaluation's gauges; *What DotAmi knows about you* and Delete, as for the step panel.

## Cleanup / open questions

- The skills list has no OaSIS list yet (the person's pick of job comes with its own pull request).

## Backend wiring

`app/api/skill-marks/route.ts`, `app/api/futures/[id]/date/route.ts`, the figures routes.
