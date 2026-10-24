# The four questions

Page: Your destination (`/start`) · Component: `components/front-door/destination-page.tsx`
Type: wizard step (one question at a time) + receipts

Last updated: 2026-10-24 (where the answers are held, the line under the receipts of 2 and 3, and the
no-database words of 1 and 4; the first question reworded 2026-10-20; built 2026-10-12)

## What it is

The four questions of `DESTINATION_QUESTIONS` (`lib/front-door/questions.ts`), in that list's order.
The list is data: each question has a permanent id, its words, a *Why we ask* line, a *What it
unlocks* line, the kind of answer, its choices, whether it can be skipped and what that button says,
and where the answer is kept. The screen draws whatever the list holds, so the later step-by-step
questionnaire starts from the same four.

The page's level 1 heading, *Your destination*, is for a screen reader only (the nav says it). Each
question shows its words (a level 2 heading), *Why we ask: …* and *What it unlocks: …*, then its
answer controls. An answered question stays above the next one, with the answer shown back, its
receipt (`role="status"`, so a screen reader hears it) and **Change**.

What is already in the data file counts as answered: the page is drawn on the server, which reads the
newest destination and the income agreed to (`lib/front-door/kept.ts`). A returning person (a reload, a new
tab or window, the desktop app started again or its Go menu, or after the front door's *Map it*, which starts
the journey afresh) sees questions 1 and 4 answered, with **Change**, and is asked 2 and 3 again.

Questions 2 and 3, and what 1 and 4 came to on this page (*I don't know yet*, a skipped or turned-down income,
words kept with no database), are held in the window's memory only (`lib/journey/held-journey.ts`; never in
window storage since 2026-10-23). They stay while the person moves between DotAmi's pages, the invented example
included. A page loaded afresh (a reload, a new window, the desktop app's Go menu, which opens its pages with
`loadURL`) starts that memory empty, and the data file gives back only 1 and 4, so 2 and 3 are asked again, a
future picked or not. The receipts of *I don't know yet*, **Skip** and a turned-down income already say nothing
new was kept, so they carry no further line.

After each answer, focus moves to the next question's heading, or to **Pick a future →** when none is
left; **Change** moves it to the question it opens.

| Id | Question | Answer controls | Required |
|---|---|---|---|
| `destination` | *What do you want your work and life to look like? Use your own words.* (until 2026-10-20 it began "In a few years", a span of time DotAmi wrote; reworded on the maintainer's pick) | a box (up to 2,000 characters, `STATEMENT_MAX_CHARS`), **Keep my words**, **I don't know yet** | no |
| `looking-for` | *Are you after a business of your own, a job or career, or both?* | **A business of my own** · **A job or career** · **Both, or not sure** | yes (*Both, or not sure* is an answer) |
| `place` | *Which province or territory are you in?* | a dropdown of the thirteen places, by name, valued by code (`CA-AB` …), and **Use this place** | yes, no *I don't know*: no road can be drawn without one |
| `income-wanted` | *What yearly income do you want, before tax?* | an amount box (dollars), **Keep it**, **Skip** | no |

## What it does (behavior on interact)

- **Keep my words**: `POST /api/person/statements { text, saidAt, kind: "destination" }` (the person's
  own day). The words are kept exactly as typed, ends trimmed. Receipt: *"Kept word for word, dated
  <day>. It goes at the top of each future you pick on Pick a future; an idea you describe in your own
  sentence shows that sentence instead."*, the words shown back in quotes. A refusal shows the server's
  own words and keeps the question open; no database: *"Not kept: no database reachable. A reload, a new
  window or the desktop app's Go menu asks it again."* (`destinationWords.receipts.destinationTabOnly`; until
  2026-10-23 it said the words stayed in the tab, and they were written to the tab's window storage; until
  2026-10-24 *"Only this page holds it: a reload or a new window asks it again."*). Changing it later keeps a
  new statement; the old one stays.
- **I don't know yet**: nothing new is kept. *"Nothing kept. You can say it later; nothing here waits
  on it."* When words are already kept (given in this window or in the data file): *"Nothing new kept. Your
  words of <day> are still kept and still show on top of your futures; Delete on What DotAmi knows
  about you removes them, with all your statements."*
- A choice on `looking-for`: held in the window's memory, and kept on the idea of each future picked.
  Receipt: *"Of the <m> futures listed, <n> include a business of your own."* (or *"… a job or career."*;
  *includes* when n is 1); *Both, or not sure*: *"All <m> futures listed are shown."* (*"The 1 future
  listed is shown."*). Counted from the kind (`business`, `career`, `both`) of each road *Pick a future*
  lists.
- **Use this place**: held and kept as `looking-for` is. Receipt from the catalogs: *"Alberta's rules and
  the federal rules apply. <n> futures listed are written for Alberta."* For a place whose own rules aren't
  written: *"The federal rules apply; <place>'s own rules aren't written yet."* and, when no listed future is written
  for it, *"No future listed is written for <place> yet: the ones shown are written for other places,
  and each says which."* A future written for all of Canada (the federal steps, listed outside Alberta since
  task 28d) is counted apart, never as the place's own: *"1 future listed is written for all of Canada; none is
  written for <place> yet."*
- Under the receipts of `looking-for` and `place` (only those two; since 2026-10-23), one more line in grey,
  outside the receipt's `role="status"`: *"Kept with each future you pick, and nowhere else: a reload, a new
  window or the desktop app's Go menu asks it again, a future picked or not."*
  (`destinationWords.keptWithEachFuture`). It shows whenever the question is answered on this page, after a pick
  too, since each future picked keeps them again. Until 2026-10-24 it was *"Kept with the future you pick. Until
  then only this page holds it: a reload or a new window asks it again."*, which read as if a pick ended the
  asking (`/start` reads neither answer back from the data file) and left out the Go menu.
- **Keep it** (income), or Enter in the amount box: the amount is read with the same reader as every
  amount box (`12,500` or `12500.50`); one it can't read says so under the box and nothing is sent.
  Otherwise `POST /api/person-figures/propose { kind: "income-wanted", amountCents }` and the agree
  prompt opens ([02-income-agree-prompt.md](./02-income-agree-prompt.md)). A refusal shows the server's own
  words under the box; a proposal that doesn't reach the server: *"Not kept: no database reachable. The amount
  is still in the box."* (`destinationWords.receipts.incomeNotKept`; since 2026-10-24: until then the words
  receipt of question 1 was shown, which said a page held the answer). Nothing is proposed either way, and the
  amount stays in the box. Agreed: *"Your target:
  $70,000 a year, before tax, agreed <day>. Nothing compares it with anything."* Turned down:
  *"Turned down. It stays in your data file, marked turned down and shown nowhere, until Delete on What
  DotAmi knows about you removes it."*
- **Skip** (income): nothing new is kept. *"Not given. Nothing here waits on it."*
- Turned down or skipped while a target agreed before is still current, the receipt adds: *"Your target
  of $70,000, agreed <day>, still stands; Delete on What DotAmi knows about you removes it."*
- **Change**: opens that question again with its answer filled in, below the others.

## Why it exists (user purpose)

The top of the plan is the person's own goal, in their words (decision 6); the place and the kind of
future decide what can be drawn; the income sits beside every future as their own number, never judged.

## Copy (current labels)

Questions, why and unlocks lines, choices and skip buttons: `lib/front-door/questions.ts`. Everything
else (buttons, receipts, the nav label): `lib/front-door/words.ts`. Amounts: `formatMoney`.

## State touched (field names only)

`intake.destination.{destination, lookingFor, place, incomeWanted}` in the journey draft, held in the window's
memory (`lib/journey/held-journey.ts`); never in window storage.

## Downstream consumers (where the data goes today)

- The destination: a `PersonStatement` row with `kind: "destination"`; the cockpit's goal bar shows the
  newest one on an idea that has no first sentence; *What DotAmi knows about you* counts it under *Your
  statements*.
- `looking-for` and `place`: written on the idea when a future is picked (`Venture.lookingFor` with its
  moment, `Venture.province`). *Pick a future* reads them from the window's memory, so a page of it loaded
  afresh shows *"Say which province or territory you're in first."* ([../futures/_index.md](../futures/_index.md)).
- The income: a `PersonFigure` row; the goal bar's *Your target* once agreed.

## Cleanup / open questions

- Hours a week, *won't do* and the dream-life list are phase 2 (§ 3).
- The place has no *I don't know*, though § 3 says one is always an answer; the maintainer's call
  (docs/architecture/future-cockpit.md § 13).
- An income proposed and then left (the prompt closed without deciding) stays *proposed* in the data
  file, shown nowhere; **Keep it** again proposes a new one.

## Backend wiring

`POST /api/person/statements` (accepts `kind: "destination"` since 2026-10-12) · `POST
/api/person-figures/propose` · `/agree` (DotAmi's own window only) · `/discard`.
