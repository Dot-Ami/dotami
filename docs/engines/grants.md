# Grants Engine — Reasoning Conventions

Catalog: `lib/engines/grants/v2026/programs.ts` (6 entries as of 2026-07-02) · Priority: **high**

## What it holds

Federal/provincial programs (SR&ED, CAJG, IRAP, ABTIC, Innovate BC, ON supports) with
eligibility prose, structure/province/activity arrays, citations, and `estimatedValue`
strings. Nothing evaluates them at runtime; archetype configs hand-pick ids for display.

## How it should reason (target)

- **Green/yellow/gray from predicates**, same DSL as everything else. Program eligibility
  is naturally predicate-shaped: province, structure, activity, sometimes revenue/headcount.
- **Structure-gated programs are the star use case for near-miss yellow.** IRAP requires a
  CCPC (`structures: ["ccpc"]`): for a sole prop the correct output is not gray — it's
  *"incorporation would unlock IRAP"* (gray→yellow fork). This one behavior is most of the
  product's aggressive-picture promise. Same for SR&ED's rate split (below).
- Rates that differ by structure are **data, not prose**: SR&ED = 15% non-refundable ITC
  (sole prop) vs 35% refundable (CCPC). The current entry hides this in
  `estimatedValue: "15–35%"`. The split is validated seed research and prime fork-surfacing
  material ("incorporating changes your SR&ED position from 15% non-refundable to 35%
  refundable").

## Classification rule (flagged decision — see audit § Flags #5)

**CSBFP is a loan guarantee, not a grant**, and it must live in this engine anyway (users
don't care about our taxonomy; they care about "money levers"). Pending maintainer
confirmation, the recommended shape is a `kind` field:

```typescript
kind: "grant" | "tax-credit" | "financing"
```

CSBFP entry facts (validated): up to $500K equipment, government guarantees up to 85% of
lender loss, 74% of loans to businesses <1yr old, **365-day retroactive window** (equipment
bought now can roll into a CSBFP loan later — surface this; it changes purchase timing
decisions), collateral = the equipment itself. Compass framing: "if equipment is on your
path, CSBFP may make financing available without revenue history."

## Authoring rules specific to this engine

1. `estimatedValue` stays as display prose, but any rate the rules engine reasons about
   gets a typed field.
2. Program pages change often — grants entries need the most aggressive `lastVerified`
   discipline of any engine. If authoring from memory instead of the live program page, stop.
3. Provincial programs must set `provinces` narrowly (CAJG is AB-only). The wrong province
   surfacing a program is a trust-killer on the exact surface (intake preview) meant to
   build trust.
4. Umbrella entries ("Ontario innovation supports") are acceptable placeholders but should
   decompose into specific programs as they get verified — specific + cited beats broad + vague.
