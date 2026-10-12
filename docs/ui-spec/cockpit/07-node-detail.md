# Node detail — what a stage's panel shows

Page: Cockpit (`/cockpit`) · Component: `components/node-detail-panel.tsx`
(quotes: `components/shared/official-words.tsx`)
Type: side panel with one text input

Last updated: 2026-10-11 (written with the honest-map fixes, docs/task-list.md [10f]; the panel
itself is from 2026-09-13)

## What it is

The right-hand panel that opens when a stage card or a lever card is clicked: the stage's name, its
**Trigger** and **If it applies** lines, the items on the map for this stage ("For you on this stage"),
and three folds (elsewhere on your map, more about this stage, sources). Since 2026-10-11 it can also
show, each only when the catalog gives it for that stage:

| Part | Shows | Where its words come from |
|---|---|---|
| **Your answers** line | One sentence on which of the person's answers set the stage's colour. Liability / SR&ED: "Lit because your intake has the activity tag Software / SaaS. This card reads only those tags, not a liability or research need you stated." (or that none of its three tags is on the intake). Incorporating: "Check first: set your own number to see this light. DotAmi has no number of its own for this." / "Lit because your third-year revenue estimate ($150,000) reaches your own number ($100,000)." / "…is under your own number…" / "Not on your path…" | The rules (`lib/brain/evaluate.ts` `computeNodeStates`, `EvaluationResult.nodeReasons`); the stage card shows the same sentence under its trigger |
| **Official words** box | An official page's own sentences, each in its own quotation marks, under a lead line naming whose words they are, with *Read it on the page*. Mandatory GST registration: the CRA's two small-supplier tests, each with what follows and from when. Voluntary GST registration: the CRA's line on registering by choice | `CFENode.officialWords` (`lib/engines/compliance/v2026/gst-official-words.ts`) |
| **I'd incorporate at $___** | A text input (digits only; anything else typed is dropped; empty clears it), tagged **your number**, with one line under it: "Your own yearly sales number, kept as yours. No law sets one, so DotAmi has none. With it, this card applies once your third-year estimate reaches it." Only on Incorporating | `CFENode.asksOwnNumber`; kept in `ScenarioState.incorporateAt` |
| **Ways to do this, side by side** | One column per way of taking the stage, under "2 ways to do this, side by side · DotAmi doesn't pick one". Incorporating, for an Alberta idea: **Federal (Corporations Canada)** and **Alberta (Corporate Registry)**. Each row: its name, its amount column (**$200 once**, **$12 a year**, **not needed**, or **no amount read**), the page's own words in quotation marks, and *source, read 2026-10-11*. Alberta's column ends: "Alberta's amounts are in the Registry agent product catalogue, which DotAmi hasn't read yet, so none is shown." No totals. For an idea in a province with no written route: the federal column, and "Incorporating under British Columbia law isn't written yet, so only the federal way is shown." | `lib/engines/cfe/v2026/incorporation-routes.ts` |

The GST/HST lever card in *For you on this stage* carries the same official-words box as the
mandatory stage, always in view under its *why* line (outside its show-details button, because the
box has a link).

## What it does (behavior on interact)

- Typing in **I'd incorporate at** changes the person's number at once: the Incorporating card and its
  *Your answers* line recolour and reword from the rules on the next render, and the cockpit's usual
  autosave writes it after the short pause (the save line reads "Unsaved changes…", then "Saved ·").
  Clearing the box clears the number; the card goes back to "check first".
- The number lights Incorporating green only while Incorporation timing is on **When you decide** and the
  third-year revenue estimate is at or above it (">=": "at" reads as reaching it). With no number it
  stays amber at any estimate; off the person's path it is grey. Nothing else reads the number.
- *Read it on the page* and *source* open the official page in a new window.

## Why it exists (user purpose)

To show nothing DotAmi made up. The GST/HST card paraphrased the CRA and, at 70% of the line (about
$21,000), went amber on DotAmi's own say-so; showing only the federal way to incorporate would choose
it for the person; and no law sets a sales level to incorporate at, so only the person's own number
may light that card (docs/architecture/future-cockpit.md § 9, fixes 1 to 3).

## Copy (current labels)

"Your answers" · "The Canada Revenue Agency's two tests, quoted from its page:" · "The Canada Revenue
Agency, on the same page:" · "Read it on the page" · "I'd incorporate at" · "$" · "your number" ·
"2 ways to do this, side by side · DotAmi doesn't pick one" · "not needed" · "no amount read" ·
"source, read <date>".

## State touched (field names only)

`scenario.state.incorporateAt` (through `setIncorporateAt`, `lib/scenarios/branches.ts`).

## Downstream consumers (where the data goes today)

The rules (`evaluateScenario` passes it as `incorporateAt`), the autosave (`/api/scenario/save`,
validated by `lib/db/parse-scenario-input.ts`, stored by `lib/db/scenario-state-json.ts` in the
`ScenarioState.activeBranches` JSON column under its own key), and the readout API (`scenario.state`,
and each node's `evaluatorReason`). The playbook export doesn't show it yet.

## Cleanup / open questions

- The person can't yet pick federal or Alberta, and nothing totals the fees: both come with the
  cockpit's cost lines and Start-up money gauge ([14a]).
- Alberta's fee amounts are named blanks until a person reads the Registry agent product catalogue.
- The phase 1 storage work may move `incorporateAt` to a column of its own on `Venture`
  (future-cockpit.md § 7).

## Backend wiring

`/api/scenario/save` (the cockpit's autosave), no new route.
