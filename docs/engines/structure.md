# Structure Engine — Reasoning Conventions

Catalog: `lib/engines/structure/v2026/ladder.ts` (~5 steps as of 2026-07-02) · Priority: medium

## What it holds

The entity ladder: Sole Prop → Sole Prop + GST → CCPC → Holdco → Family Trust, each with
transition triggers (prose), citations, and lens annotations. Rendered in the cockpit
structure-ladder rail.

## The validated mental model (encode, don't re-derive)

Seed research (maintainers' notes, 2026-07-01) locked the gating logic:

- **Rungs are gated by triggers, not ambition.** First revenue dollar unlocks Sole Prop;
  taxable supplies over $30,000 (the CRA's small-supplier test) force the GST decision;
  incorporating is the person's own call — DotAmi sets no income at which it becomes "worth
  modeling" (an uncited "~$80K net income" line was removed on 2026-10-11). The
  liability/SR&ED stage reads no stated need: it lights from the idea's activity tags (Software /
  SaaS, Manufacturing or AI / ML / R&D), which the intake's parser can mark from the sentence and
  the person confirms on the intake. That tag-means-SR&ED reading is an open item for the cockpit
  build (docs/task-list.md, [10f]); since 2026-10-11 the stage's card says which tag lit it. Holdco protects *existing* profits; Trust handles
  succession/income-splitting.
- **Skipping rungs doesn't solve spending problems.** Holdco/Trust do not make equipment
  affordable and don't add liability protection beyond what basic incorporation provides.
  A profile with a small capital purchase and no retained earnings should *never* see
  Holdco/Trust as green or yellow — gray with an honest "this rung protects assets you
  don't have yet".
- **Early Holdco/Trust entry is GAAR-sensitive** — pairs with a `professional-required`,
  `gaarExposure: true` Risk entry.

## How it should reason (target)

- Transition triggers become typed thresholds — only amounts a cited page sets, never one
  DotAmi picks — or typed facts the person states (`{ trigger: "liability-exposure" }`,
  `{ trigger: "sred-refundability" }`, the person's own "I'd incorporate at $___") so the rules
  engine can compute "current rung + next rung worth modeling" from the profile.
- Structure is the **gating field** for other engines (SR&ED rates, IRAP eligibility,
  income-splitting). When a lever is structure-gated, the correct surface is the *fork*
  ("incorporating would change X and Y"), computed here and consumed by Grants/Write-offs
  near-miss logic.
- The two cockpit branch decisions (`gstTiming`, `incorporationTiming` in
  `lib/scenarios/branches.ts`) are manual picks today; the rules engine should eventually
  *recommend-by-surfacing* (show what each pick unlocks) but the pick stays with the user.
  Compass, not GPS.

## Authoring rules

1. Ladder steps must keep `nextSteps` pointing at real step ids — the ladder is a graph
   the UI walks.
2. Any claim about what a structure protects or unlocks needs a citation; corporate-law
   claims cite provincial/federal registries, tax claims cite CRA.
3. Do not add rungs (LP, co-op, partnership) without maintainer approval — the five-rung
   ladder is locked v1 scope.
