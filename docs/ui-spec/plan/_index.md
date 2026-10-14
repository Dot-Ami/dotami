# Your plan — page overview

Page: `/plan?venture=<id>` · Components: `app/(journey)/plan/page.tsx` (reads what DotAmi keeps for the
idea, on the server), `components/cockpit/plan-page.tsx` (draws it), `components/cockpit/print-button.tsx`
(the one control that runs in the browser) · Content: `lib/cockpit/plan.ts` `buildPlan` (pure) · Words:
`lib/cockpit/words.ts` `plan` · Reads: `lib/futures/read-plan.ts`

Last updated: 2026-10-13 (first written, before the code; issue #41; design: docs/architecture/future-cockpit.md
§ 1 row 9 and § 2, *Your plan as built*)

## Page job

One idea's plan, laid out to be read and handed to a partner, an accountant, a lawyer or a lender, on
screen or on paper. It is made only from what DotAmi already keeps for the idea (the data file) and the
catalogs; it asks nothing, keeps nothing and sends nothing. Reached from the cockpit's **Export** panel.
Next: back to the cockpit.

The cockpit's Export panel keeps **Copy markdown** and **Save as .md** as they were (the developer-style
text); this page is the readable one, with **Print**, which also gives *Save as PDF* in the computer's own
print window.

## Layout

On screen: a bar along the top with **← Back to the cockpit** and **Print**, then one sheet in the
paper colour, the sections below in this order. On paper (print media): the bar is gone, the app's footer
is gone, the sheet is black on white, each section after the first starts on a new page, a step never
splits across two pages, and every link is printed as its address (each link's text is its address).

1. **Heading** — *Your plan*, the idea's name, and *"Made on <day> from what DotAmi keeps for this idea
   on this computer."* (the day is the computer's own day, YYYY-MM-DD).
2. **Where you want to be, in your words** — the sentence typed on the front door for this idea, in
   quotes, word for word, with *"typed for this idea · <day>"*; and the person's newest answer to
   *where do you want to be* (*"where you want to be · your words · <day>"*) when it is a different
   sentence. Neither is summarised, shortened or read by a rule. None kept: *"No words of yours are kept
   for this idea."* The yearly income the person agreed to, when there is one, in the goal bar's own
   words (*"Your target: $X a year, before tax (yours, agreed <day>)"*); a proposed or turned-down one is
   never shown.
3. **The future and its ending** — the goal bar's line (*Future: <road>*, or *Map drawn: … written for
   …; this idea is in …* when the road isn't written for the idea's place); who picked it (*"You picked
   this future on <day>."*, or *"No future picked: this idea is drawn on the general road."*); one line
   per fork, in road order: *"“<fork>”: Your pick: “<side>”"*, *"The map's default pick: “<side>”, not
   yours yet"* or *"No side picked yet."* (the Compare panel's words). A road with no fork says so.
   Then the four gauges as the goal bar shows them, label, value and lines, counts and sums only (no
   invitation lines: there is nothing to click on paper).
4. **Each step** — *"In the order the road shows them, not importance."* One block per column (its
   label and summary), one entry per step of the road, every step, on the path or not (nothing is left
   out because of its state): the step's name and one line; *Your status: doing / done / not for me*
   or *Your status: not set*; its state in the map's words (*applies as answered*, *check first*, *not
   on your path*) with road evaluation's reason sentence; *Done when (x of y ticked)* with each line
   marked *ticked* or *not ticked* and its source; the skills it needs, each with the person's mark;
   how many cost lines it has (the lines themselves are under *Start-up money*, by step); official pages; and its sources, each with how it was checked
   (`lib/engines/shared/citation-check.ts` `howCheckedWords`, and the quotes a tool found).
5. **Skills you marked** — names only. *On this road's steps*: every skill item the road lists, once,
   with *legal requirement* / *listed skill* and the person's mark (*have*, *learning*, *not yet*, or
   *not marked*). *Your own skills*: each with its mark and day. *Your pick of job*: the job's name and
   code and the day picked, the items the person marked (names only, never the government's ratings),
   *"n not marked, of m on the government's list"*, and the licence's attribution line word for word.
   No job picked: *"No job picked for the government's skills list."*
6. **Start-up money** — every cost line on the road, by step, in the three kinds and nothing else:
   - an **official fee** shows its amount, *official fee*, its source's title and address, and how and
     on which day the source was read or checked by a tool; a fee that applies only sometimes shows its
     condition and *"Not added to any total."*;
   - **your quote** shows the amount as the person's (*"your quote · agreed <day>, from <quote / link /
     receipt / your guess>"*);
   - a **named line not priced yet** shows its name and *not priced yet*, and no amount at all: never
     $0, never a typical number.
   Above the lines, the Start-up money gauge's sums (official fees, your numbers, not priced yet, left
   out, waiting on a pick, savings, savings minus both), each only where the gauge shows it.
   A step's lines carry the step panel's note when they aren't counted (*not on your path*, *waits on
   a pick*).
7. **What you've told DotAmi** — the cockpit's left list, row for row: what was said, its day (or *day
   not kept*), and what it unlocked (the receipt lines; *"Nothing on the road changes with or without
   it."* when none). The what-if is never here: it is never kept. Nothing told: the list's own empty
   line.
8. **What this plan is** — the standing line: *"DotAmi is not legal or tax advice. This plan is a
   preparation tool for your accountant and lawyer: it shows what you told DotAmi and where each fact
   comes from, and it ranks nothing."*

## Controls

| Control | Behaviour | Persists to |
|---|---|---|
| **Open your plan to read or print** (a link in the cockpit's Export panel, under Copy markdown and Save as .md) | opens `/plan?venture=<id>` in the same tab, for the idea on screen. An idea not saved yet (only in this tab) has no id: the link is replaced by *"Save this idea first: the plan is made from what DotAmi keeps."* | — |
| **← Back to the cockpit** | opens `/cockpit?venture=<id>` | — |
| **Print** | calls the browser's `window.print()`: the computer's own print window opens, where the person picks a printer or *Save as PDF*. In the desktop app it is Electron's same call, which opens Windows' print window (nothing in `desktop/` changes for it). DotAmi sends nothing anywhere; where the paper or the PDF goes is the person's choice | — |
| No idea with that id | *"DotAmi keeps no idea with this id on this computer."* and a link to *Your futures* | — |

## Page-level state

None. The page is drawn on the server for each visit from the data file (`force-dynamic`, like the
cockpit), so it shows what is saved: an answer still waiting for the cockpit's autosave shows after it
lands. The what-if, receipts of this visit and folded regions are not part of it.

## What it never does

- No new request: the page is one page load from DotAmi's own server, and Print is the browser's own
  call (the network check in `tests/privacy-inventory.spec.ts` stays green, and the inventory gains nothing).
- Nothing new kept, in the data file or the browser.
- No ranking, no "you should", no verdict: every sentence is in `lib/cockpit/words.ts` and passes the
  same verdict-word check as the cockpit's (`tests/cockpit-plan.spec.ts`).
- No invented number: every amount is an official fee from the fees catalog or a number the person
  agreed to, through `lib/format/money-and-months.ts`.

## Tests

`tests/cockpit-plan.spec.ts` (each section of `buildPlan`, a blank stays blank, an official fee's source
and day, a quote as the person's, the person's words verbatim, the told list, the standing line, no
verdict words, no sentence written in the component) · `e2e/plan.spec.ts` (open an idea's cockpit →
Export → the plan → the sections → print media hides the bar and the footer, breaks between sections,
no request leaves DotAmi's own server).
