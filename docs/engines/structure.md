# Structure Engine — Reasoning Conventions

Catalog: `lib/engines/structure/v2026/ladder.ts` (~5 steps as of 2026-07-02) · Priority: medium

## What it holds

The entity ladder: Sole Prop → Sole Prop + GST → CCPC → Holdco → Family Trust, each with
transition triggers (prose), citations, and lens annotations. Rendered in the cockpit
structure-ladder rail.

## The validated mental model (encode, don't re-derive)

Seed research (maintainers' notes, 2026-07-01) locked the gating logic:

- **Rungs are gated by triggers, not ambition.** First revenue dollar unlocks Sole Prop;
  ~$30K revenue forces the GST decision; ~$80K net income or liability/SR&ED needs make
  incorporation worth modeling; Holdco protects *existing* profits; Trust handles
  succession/income-splitting.
- **Skipping rungs doesn't solve spending problems.** Holdco/Trust do not make equipment
  affordable and don't add liability protection beyond what basic incorporation provides.
  A profile with a small capital purchase and no retained earnings should *never* see
  Holdco/Trust as green or yellow — gray with an honest "this rung protects assets you
  don't have yet".
- **Early Holdco/Trust entry is GAAR-sensitive** — pairs with a `professional-required`,
  `gaarExposure: true` Risk entry.

## How it should reason (target)

- Transition triggers become typed thresholds (`{ trigger: "net-income", gte: 80000 }`,
  `{ trigger: "liability-exposure" }`, `{ trigger: "sred-refundability" }`) so the rules
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
