# Strategy Rules Engine — Spec

Last updated: 2026-07-04 · Status: **built (v0, 2026-07-02)** — `lib/brain/evaluate.ts`,
`predicates.ts`, `types.ts`; golden-tested (`tests/brain-evaluate.spec.ts`). This spec is
now the reference contract; the 2026-07-04 audit's findings (GST `>=` boundary, unevaluated
`acquiredAfter`, hardcoded `structure: "sole-prop"` in `buildEvaluationProfile`, missing
archetype goldens) have boundary tests in `tests/brain-evaluate-boundaries.spec.ts`.

## Job

A pure, deterministic evaluator that takes the user's actual profile and the engine catalogs
and produces what the UI currently fakes:

```
evaluateProfile(profile, catalogs) → {
  unlocks:    UnlockItem[]      // write-offs, grants, thresholds, compliance checks that apply
  nodeStates: Record<CFENodeId, "green" | "yellow" | "gray">
  forks:      SurfacedFork[]    // decision branches worth showing (GST timing, incorporation…)
}
```

No LLM calls. No network. No Postgres. Pure function over TypeScript data — same testing
story as the existing catalogs.

## Where it lives

`lib/brain/evaluate.ts` (+ `lib/brain/predicates.ts`, `lib/brain/types.ts`). It consumes
`lib/engines/*/v2026/` catalogs and the `VentureProfile`/`IntakeDraft` shapes that already
exist in `lib/scenarios/types.ts` and `lib/journey/types.ts`.

## Rules are data: the predicate DSL

Do NOT write per-entry functions. Extend engine entry types with an optional typed
`conditions` field using a small predicate DSL:

```typescript
type Predicate =
  | { field: "province";        op: "in";       value: Province[] }
  | { field: "structure";       op: "in";       value: StructureEntityType[] }
  | { field: "activityTags";    op: "intersects"; value: string[] }
  | { field: "targetRevenueY1"; op: "gte" | "lt"; value: number }
  | { field: "hireFirst";       op: "eq";       value: boolean }
  | { field: "employmentStatus"; op: "in";      value: EmploymentStatus[] }
  | { field: "capitalPurchasePlanned"; op: "eq"; value: boolean }   // new intake field, see below
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate };

interface EntryConditions {
  applies: Predicate;          // green if true
  cautions?: Array<{           // any matching caution downgrades green → yellow
    when: Predicate;
    note: string;              // compass language: why professional confirmation is needed
    expires?: string;          // ISO date for time-boxed incentives (e.g. IEI before 2027)
  }>;
}
```

Why a DSL and not functions: predicates are reviewable data (a cheaper model can author
them safely and a test can enumerate them), they serialize into golden-test fixtures, and
they can't smuggle in side effects.

Migration note: the existing `structures` / `activityTags` / `provinces` arrays on entries
are an implicit AND of `in`/`intersects` predicates. The evaluator should treat those legacy
arrays as conditions when `conditions` is absent, so catalogs migrate incrementally.

## Semantics: green / yellow / gray

| State | Meaning | Rule |
|-------|---------|------|
| **green** | Applies to this profile as answered | `applies` true, no caution matched |
| **yellow** | Plausibly available; needs professional confirmation, is near a threshold, or is time-boxed | `applies` true + a caution matched, or `applies` would be true under a one-fork change (e.g. "if you incorporate") |
| **gray** | Not applicable / different branch | `applies` false with no near-miss |

**Yellow is the product's signature state.** Aggressive-but-legal levers (Immediate
Expensing, SR&ED at sole-prop rates, voluntary GST registration for ITCs) are yellow with
an explanation — never hidden, never presented as guaranteed. The near-miss rule ("gray→yellow
fork") is what surfaces things like *IRAP requires a CCPC — incorporation would unlock it*,
which is exactly the aggressive-picture behavior the product promises.

Every `UnlockItem` must carry: entry id, engine name, state, `why` (one sentence tied to
the profile answers that triggered it — templated from the matched predicate, not free
text), the entry's citation(s), and its risk chip (from the Risk Calculator once built).

## What it replaces (delete, don't merge)

`components/discovery/intake-page.tsx` `buildGoalPreviewCards` / `buildVenturePreviewCards` /
`buildLocationPreviewCards` / `buildRefinePreviewCards` (~lines 120–330) are hardcoded
placeholders for this evaluator. When wiring: **the signed-off UI contract stays** (card
anatomy: title, type chip, "why shown", compass payoff, source chip — see
`docs/ui-spec/intake/live-preview.md`), the data source changes underneath. Also replaces
the static hint maps in `lib/archetypes/annotations.ts` eventually — but keep archetype
`grantIds`/`writeOffIds` as *example seeds*, since labeled examples (Maya) still need
curated content when there's no real profile.

`recomputeScenarioState()` in `lib/scenarios/branches.ts` keeps owning branch bookkeeping;
`nodeStates` from the evaluator feeds node *coloring*. Don't collapse the two in v0 of the
brain — separate change, separate review.

## New intake fields (needs maintainer sign-off — intake is a signed-off surface)

The GPU/workstation golden scenario needs at least `capitalPurchasePlanned` (bool or amount
band) to trigger Class 50/CSBFP. The 2026-05-18 wireframe already specced "capital equipment"
as an optional Step-4 field, so this is consistent with locked direction — but any intake UI
change re-opens a signed-off surface. Flag it, don't sneak it.

## Testing (gate for shipping)

- Golden scenario: GPU/workstation (see `docs/brain/README.md` § seed data) — exact expected
  unlock set and states, snapshot-tested.
- Representative profiles (see `tests/brain-evaluate.spec.ts`) each get an expected-unlocks golden test.
- Integrity: every predicate references real profile fields; every caution has a note;
  every entry with `expires` has a future-or-flagged date (extend `tests/engine-integrity.spec.ts`).
- Determinism: same input → same output, no Date.now() inside evaluation (pass `today` in).
