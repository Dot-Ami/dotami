# The four questions

Page: Your destination (`/start`) · Component: `components/front-door/destination-page.tsx`
Type: wizard step (one question at a time) + receipts

Last updated: 2026-10-12 (built)

## What it is

The four questions of `DESTINATION_QUESTIONS` (`lib/front-door/questions.ts`), in that list's order.
The list is data: each question has a permanent id, its words, a *Why we ask* line, a *What it
unlocks* line, the kind of answer, its choices, whether it can be skipped and what that button says,
and where the answer is kept. The screen draws whatever the list holds, so the later step-by-step
questionnaire starts from the same four.

Each question shows its words (a level 2 heading), *Why we ask: …* and *What it unlocks: …*, then its
answer controls. An answered question stays above the next one, with the answer shown back, its
receipt (`role="status"`, so a screen reader hears it) and **Change**.

| Id | Question | Answer controls | Required |
|---|---|---|---|
| `destination` | *In a few years, what do you want your work and life to look like? Use your own words.* | a box (up to 2,000 characters, `STATEMENT_MAX_CHARS`), **Keep my words**, **I don't know yet** | no |
| `looking-for` | *Are you after a business of your own, a job or career, or both?* | **A business of my own** · **A job or career** · **Both, or not sure** | yes (*Both, or not sure* is an answer) |
| `place` | *Which province or territory are you in?* | a dropdown of the thirteen places, by name, valued by code (`CA-AB` …), and **Use this place** | yes, no *I don't know*: no road can be drawn without one |
| `income-wanted` | *What yearly income do you want, before tax?* | an amount box (dollars), **Keep it**, **Skip** | no |

## What it does (behavior on interact)

- **Keep my words**: `POST /api/person/statements { text, saidAt, kind: "destination" }` (the person's
  own day). The words are kept exactly as typed, ends trimmed. Receipt: *"Kept word for word, dated
  <day>. It goes at the top of each future you open."*, the words shown back in quotes. A refusal shows
  the server's own words and keeps the question open; no database: *"Not kept: no database reachable.
  It stays in this tab only."* Changing it later keeps a new statement; the old one stays.
- **I don't know yet**: nothing is kept. *"Nothing kept. You can say it later; nothing here waits on
  it."*
- A choice on `looking-for`: kept in the tab. Receipt: *"<n> of the <m> written futures include a
  business of your own."* (or *"… a job or career."*); *Both, or not sure*: *"All <m> written futures
  are shown."* Counted from each road's `kind` (`business`, `career`, `both`).
- **Use this place**: kept in the tab. Receipt from the catalogs: *"Alberta's rules and the federal rules
  apply. <n> futures are written for Alberta."* For a place whose own rules aren't written: *"The
  federal rules apply; <place>'s own rules aren't written yet."* and, when no future is written for it,
  *"No future is written for <place> yet: the ones shown are written for other places, and each says
  which."*
- **Keep it** (income): the amount is read with the same reader as every amount box (`12,500` or
  `12500.50`); one it can't read says so under the box and nothing is sent. Otherwise `POST
  /api/person-figures/propose { kind: "income-wanted", amountCents }` and the agree prompt opens
  ([02-income-agree-prompt.md](./02-income-agree-prompt.md)). Agreed: *"Your target: $70,000 a year,
  before tax, agreed <day>. Nothing compares it with anything."* Turned down: *"Not kept."*
- **Skip** (income): nothing is kept. *"Not given. Nothing here waits on it."*
- **Change**: opens that question again with its answer filled in, below the others.

## Why it exists (user purpose)

The top of the plan is the person's own goal, in their words (decision 6); the place and the kind of
future decide what can be drawn; the income sits beside every future as their own number, never judged.

## Copy (current labels)

Questions, why and unlocks lines, choices and skip buttons: `lib/front-door/questions.ts`. Everything
else (buttons, receipts, the nav label): `lib/front-door/words.ts`. Amounts: `formatMoney`.

## State touched (field names only)

`intake.destination.{destination, lookingFor, place, incomeWanted}` in the tab's journey draft.

## Downstream consumers (where the data goes today)

- The destination: a `PersonStatement` row with `kind: "destination"`; the cockpit's goal bar shows the
  newest one on an idea that has no first sentence; *What DotAmi knows about you* counts it under *Your
  statements*.
- `looking-for` and `place`: written on the idea when a future is picked (`Venture.lookingFor` with its
  moment, `Venture.province`).
- The income: a `PersonFigure` row; the goal bar's *Your target* once agreed.

## Cleanup / open questions

- Hours a week, *won't do* and the dream-life list are phase 2 (§ 3).

## Backend wiring

`POST /api/person/statements` (accepts `kind: "destination"` since 2026-10-12) · `POST
/api/person-figures/propose` · `/agree` (DotAmi's own window only) · `/discard`.
