# The Incorporating fix: asking for your third-year sales estimate on a picked future

Page: Cockpit (`/cockpit?venture=<id>`), road 0 (and the federal road) · Components: *Not told yet* and the
one-question box ([12-told-list.md](./12-told-list.md); `lib/cockpit/told.ts` `notToldYet`), the step panel of
*Incorporating* ([09-step-panel.md](./09-step-panel.md), [07-node-detail.md](./07-node-detail.md)) · Words:
`lib/cockpit/words.ts` `questions`, `lib/roads/words.ts` `salesYear`
Type: a *Not told yet* row, a number box, a take-back

Last updated: 2026-10-20 (designed before it is built, task 28g, for the *Incorporating* fix. The maintainer,
2026-10-20: fix both known bugs, and the *Incorporating* one needs a design here.)

No mockup: it changes one row and one box on screens that already exist.

## The bug, in plain words

On road 0, *Incorporating* (`stage-3a-incorporation-80k-net`) lights when the person's own third-year sales
estimate reaches their own *I'd incorporate at* number (`lib/brain/evaluate.ts` `computeNodeStates`). A future
picked on *Pick a future* keeps no third-year estimate: it saves 0, with the sales targets on its *not said*
list (`lib/front-door/start-future.ts`), and nothing in the cockpit asks for one (only the intake's Year 3 box
sets it). So on a picked future the step can never light, and the step's box for *I'd incorporate at* takes a
number that changes nothing (`docs/task-list.md`, *Still listed for the maintainer*; pinned in
`tests/cockpit-told.spec.ts`).

## The fix: ask for the estimate where the step needs it

**1. A *Not told yet* row,** on a road that holds *Incorporating*, when the idea has no third-year estimate
(0, or on the not-said list): **Your third-year sales estimate**, answered in the one-question box. It sits in
the fixed order just before the *I'd incorporate at* row, which already appears only once an estimate exists
(`incorporateAtChangesSomething`, `lib/cockpit/told.ts:325-338`). So the two are asked one after the other,
estimate first, and neither is asked where it would change nothing.

**2. The step's own panel.** *Incorporating*'s panel holds the *I'd incorporate at* box today. Above it, one
more box, **Your third-year sales estimate**, with the line *This step lights when your third-year sales
estimate reaches your own “I'd incorporate at” number. Both are yours.* Where the estimate is already given
(an intake idea), the box shows it with **Change your number**, as the cost lines' boxes do.

**3. Saving it.** The answer is the person's own typed number, like the intake's Year 3 box: whole dollars, saved
from the box as the intake's Year 3 box and the *I'd incorporate at* box save theirs, with no agree prompt. It sets
`targetRevenueY3` and takes **only the third-year target** off the not-said list. Today one id, `sales-targets`,
covers both targets (`lib/scenarios/types.ts:95`), so the build splits it into `sales-target-year-1` and
`sales-target-year-3` (ids are forever: a saved `sales-targets` is read as both, as PR #190 reads `equipment`
with `withSaid`). The first-year target stays *Not said* on the rail.

**4. The receipt,** worked out from the two runs of the rules as every receipt is: *Because you told us
third-year sales of $120,000: …* (the existing `salesYear(3)` words), or *Saved. Nothing on the road changed.*
when the *I'd incorporate at* number isn't given yet; the *I'd incorporate at* row then appears in *Not told
yet*.

**5. Taking it back.** *What you've told DotAmi* lists *your third-year sales number ($120,000)* with **Take
back**, as today. Taking it back sets the estimate to 0 **and** puts `sales-target-year-3` back on the not-said
list, so a picked future is exactly as it was when picked: the rail says *Not said* again, the row comes back
to *Not told yet*, and the *I'd incorporate at* row leaves it (it changes nothing without an estimate).

## Words

```words
cockpitWords.questions.salesYear3 = {
  question: "Your third-year sales estimate",
  why: "Your own estimate. The Incorporating step compares it with the yearly sales at which you'd incorporate. DotAmi has no number of its own for this.",
  unlocks: "“Incorporating” able to light, once you also give the yearly sales at which you'd incorporate",
  box: "Dollars of sales in your third year",
}
cockpitWords.steps.incorporatingBoth = "This step lights when your third-year sales estimate reaches your own “I'd incorporate at” number. Both are yours."
```

Kept as they are: `questions.incorporateAt` (its *why* already says it is compared with the third-year
estimate), `questions.box` (*Save*, *I don't know*, *Write a whole number of dollars, like 45000.*), and
`lib/roads/words.ts` `salesYear(3)` (*you told us third-year sales of $N*, *you took back your third-year sales
number*).

## What is new on the screen vs today

| Today (a future picked on road 0) | With the fix |
|---|---|
| *Incorporating* can never light; its panel takes *I'd incorporate at*, which changes nothing | *Not told yet* asks for the estimate; the panel holds both boxes; with both given, the step lights as it does on an intake idea |
| The rail's *Target Y3* says *Not said* for good | It shows the person's estimate once given, and *Not said* again after **Take back** |

## Regions and controls

No region added, and the first-visit counts don't change: *Not told yet* sits in the rail, folded on a first
visit, and the step panel opens on a click. The new row is one more item of an existing list, shown only on a
road that holds *Incorporating* and only while the estimate is missing; the panel gains one box. Budgets
unchanged: `cockpit-road-0` 7, 8 and 8 regions; 17, 29 and 27 controls.

## How a screen reader hears it

The row is a button in the *Not told yet* list named by its question, described by its *unlocks* line; the box
opens with focus on the number field, named *Dollars of sales in your third year* and described by the why-line.
The receipt is read by the existing status line.

## Phone (375 px)

As every one-question box: the rail is a sheet; the box opens in it at full width.

## Tests the build adds

The harness's known gap for *Incorporating* on a picked future leaves `tests/fixtures/ideas/known-gaps.ts`; a
browser test answers the estimate and the *I'd incorporate at* number on a picked future, sees the step light,
reloads, takes the estimate back and sees the not-said list restored (as PR #190's test does for equipment); a
control keeps the old save and fails.

## Not in this version

- Asking for the first-year target in the cockpit (only the what-if bar's **Keep** sets it; see the pull
  request's finding about **Keep** on a picked future).
- Any number of DotAmi's own for when to incorporate.

## Checked against the rules

Every string in the words block was run through `VERDICT_WORDS`, `findVerdicts` and `findTimeWords` on
2026-10-20: no finding. *Third-year* names the person's own estimate's year, as the existing words do
(`questions.incorporateAt.why`); it is not a duration.
