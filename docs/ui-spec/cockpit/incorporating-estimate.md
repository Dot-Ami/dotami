# The Incorporating fix: asking for your third-year sales estimate on a picked future (with the what-if Keep bug)

Page: Cockpit (`/cockpit?venture=<id>`), road 0 (and the federal road) · Components: *Not told yet* and the
one-question box ([12-told-list.md](./12-told-list.md); `lib/cockpit/told.ts` `notToldYet`), the step panel of
*Incorporating* ([09-step-panel.md](./09-step-panel.md), [07-node-detail.md](./07-node-detail.md)) · Words:
`lib/cockpit/words.ts` `questions`, `lib/roads/words.ts` `salesYear`
Type: a *Not told yet* row, a number box, a take-back

Last updated: 2026-10-21 (designed before it is built, task 28g, for the *Incorporating* fix. The maintainer,
2026-10-20: fix both known bugs, and the *Incorporating* one needs a design here. **Decided 2026-10-21 (the
maintainer, call 6, "fix"):** the what-if **Keep** bug on a picked future is fixed in the **same** pull request
as the *Incorporating* fix; its part is *The what-if Keep bug* below.)

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

## The what-if Keep bug, fixed in the same pull request (the maintainer's call 6, 2026-10-21)

**The bug.** On a future picked on *Pick a future*, both sales targets start on the *not said* list under one
id, `sales-targets` (`lib/front-door/start-future.ts`, `lib/scenarios/types.ts:95`). The what-if bar's
**Keep** (`keepWhatIf`, `lib/cockpit/told.ts:360-363`, called from `components/cockpit/cockpit-page.tsx`) sets
the idea's first-year sales, `targetRevenueY1`, to the what-if, but leaves `sales-targets` on the not-said
list. So after **Keep**:

- the rail's *Target Y1* (`lib/cockpit/profile-rows.ts` `profileRows`) and *Your plan* and its export
  (`lib/playbook/render-markdown.ts` `formatProfileBlock`), which both read `isNotSaid(profile,
  "sales-targets")`, still say *Not said*;
- while the road reads the number: road evaluation takes `targetRevenueY1` as the person's own first-year
  sales (the rules' sales lines, such as the CRA's $30,000 line, `lib/brain/evaluate.ts`).

The screen and the road disagree about the same answer. Today's test (`tests/cockpit-told.spec.ts`, *Keep
makes it the idea's own first-year sales, and changes nothing else*) runs on an intake idea, which has nothing
on its not-said list, so it doesn't see this.

**The fix.** With the split of `sales-targets` into `sales-target-year-1` and `sales-target-year-3` (part 3
above), **Keep** sets `targetRevenueY1` **and** takes `sales-target-year-1` off the not-said list
(`withSaid`, as `answerEquipment` does for `equipment`). The third-year target is untouched: it stays *Not
said* until the person gives it (part 1). The rail and *Your plan* read each year's own id, so after **Keep**
*Target Y1* shows the kept amount, *Target Y3* still says *Not said*, and the road reads the same number the
screen shows. Taking the first-year number back (*What you've told DotAmi*, **Take back**) sets it to 0 and puts
`sales-target-year-1` back on the not-said list, as part 5 does for the third year. **Clear** on the what-if bar
is unchanged: it clears the what-if, not a kept number. No words change: the receipt and the told row use the
existing `salesYear(1)` words (*you told us first-year sales of $N*).

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
| After the what-if bar's **Keep**, the rail's *Target Y1* and *Your plan* say *Not said* while the road reads the kept number | *Target Y1* and *Your plan* show the kept number the road reads; *Target Y3* stays *Not said* until given |

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

For the **Keep** bug: a unit test in `tests/cockpit-told.spec.ts` runs **Keep** on a **picked** future (not the
intake idea today's test uses) and checks that `targetRevenueY1` is the kept number, `sales-target-year-1` is
off the not-said list, `sales-target-year-3` is still on it, and the rail's rows read *Target Y1* as the amount
and *Target Y3* as *Not said*; run against today's `keepWhatIf`, it fails (the year-1 target stays not said). A
browser test keeps a what-if on a picked future, reloads, and reads the same amount on the rail and on *Your
plan*. A saved `sales-targets` (from before the split) is read as both ids, so an old future still reads *Not
said* for both until each is given.

## Not in this version

- A *Not told yet* row or box asking for the first-year target in the cockpit: only the what-if bar's **Keep**
  sets it, and after this fix **Keep** also marks it as said (above).
- Any number of DotAmi's own for when to incorporate.

## Checked against the rules

Every string in the words block was run through `VERDICT_WORDS`, `findVerdicts` and `findTimeWords` on
2026-10-20: no finding. *Third-year* names the person's own estimate's year, as the existing words do
(`questions.incorporateAt.why`); it is not a duration.
