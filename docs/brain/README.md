# DotAmi Brain — Architecture of Record

Last updated: 2026-07-04 (status corrected after code-review audit)

The "brain" is the intelligence layer that turns the static engine catalogs into
profile-driven reasoning. It has three components, specified in this folder:

| Component | File | One-line job | Status |
|-----------|------|--------------|--------|
| Strategy Rules Engine | [strategy-rules-engine.md](./strategy-rules-engine.md) | Deterministic evaluator: `(profile, catalogs) → unlocks + node states (green/yellow/gray)` | **Built** (v0, 2026-07-02): `lib/brain/` — predicate DSL, `evaluateProfile`, golden-tested |
| Risk Calculator | [risk-calculator.md](./risk-calculator.md) | Audit-trigger + GAAR-exposure catalog; attaches an honest risk chip to every surfaced lever | **Built** (v0, 2026-07-02): `lib/engines/risk/v2026/` — 8 entries; **known gap: `riskCombinations` and structure-ladder GAAR flags not yet evaluated** (audit-2026-07-04 H2) |
| RAG pipeline | [rag-pipeline.md](./rag-pipeline.md) | Citation-grounded retrieval over ITA/CRA/provincial text — explains, never decides | **Not built** — needs stack promotion (pgvector, embeddings provider) |

Intake live preview reads from the evaluator (hardcoded card builders deleted).
Remaining wire-up: cockpit node coloring from evaluator states (Phase 6 exit item).
Evaluator correctness issues found in the 2026-07-04 audit (GST boundary, `acquiredAfter`,
hardcoded structure) have boundary tests in `tests/brain-evaluate-boundaries.spec.ts`.

---

## Product philosophy (non-negotiable — design against this)

DotAmi surfaces every **legal** lever with the same aggressiveness a well-connected
accountant/lawyer offers a wealthy client. "Legal but aggressive" is the target zone —
never watered down to generic conservative defaults, never illegal.

The Risk Calculator is what makes this safe: it flags GAAR exposure (Canada's General
Anti-Avoidance Rule — structures whose primary purpose is tax avoidance without genuine
business substance get unwound), audit triggers, and reassessment risk on each strategy.
The user always gets the full aggressive picture PLUS an honest risk read per option.

Concretely, when implementing:

- **Never remove or hide a legal lever because it's aggressive.** Rate it instead.
- **Never present an aggressive lever without its risk chip.**
- **"Know every loophole" is the wrong target** — GAAR exists precisely to unwind
  substance-free structures. The engine's job: every *legitimate* lever + flag which ones
  need a professional before acting.
- Compass not GPS still applies: "if X, this unlocks Y", never "you should".

## Core architecture decision (do not re-litigate without maintainer approval)

**Rules decide; RAG explains.** Node states, unlock lists, and risk flags come from
deterministic, versioned, golden-tested TypeScript — never from LLM output at runtime.
The RAG layer grounds Lens *explanations* in real statute text with citations and assists
catalog authoring/verification. Why:

1. Hallucinated tax law must never drive UI state.
2. Engines stay auditable and testable (`tests/engine-integrity.spec.ts`, golden scenarios).
3. It preserves the existing invariant: engines are read-only catalogs, Postgres stores
   user state only.

## Build order (locked in the 2026-07-02 audit; reasoning matters)

1. **Seed-data corrections** — encode the validated research (Class 50 Immediate Expensing,
   CSBFP, SR&ED rate split) into the existing catalogs. Hours of work, immediate value.
2. **Strategy Rules Engine** — zero new infrastructure, replaces the hardcoded intake
   preview, delivers the product's differentiating behavior.
3. **Risk Calculator** — parallel catalog + evaluator extension; completes the philosophy.
4. **RAG pipeline last** — needs new infra (pgvector, embeddings provider = stack changes
   a maintainer must approve) and is additive polish on top of working rules.

This deliberately inverts "start with the flashy RAG pipeline." Do not reorder without
maintainer sign-off.

## Seed / test data

Seed research is the maintainers' 2026-07-01 notes (not in this repo — every fact below
stands on its cited source). Key facts (verify `lastVerified` before relying):

- **Class 50** computer equipment: normally 55% declining balance; **Immediate Expensing
  Incentive = 100% first-year** for property acquired + in use **before 2027** (confirm with
  accountant — encode as yellow, not green).
- **CSBFP** (Canada Small Business Financing Program): federal **loan guarantee** (not a
  grant), up to $500K for equipment, 74% of loans go to businesses <1yr old, **365-day
  retroactive window**, collateral = the equipment itself.
- **SR&ED**: sole props 15% non-refundable ITC vs CCPCs 35% refundable — a structure-gated
  rate split, prime rules-engine material.
- **Tax ladder gating**: Sole Prop → CCPC → Holdco → Trust; Holdco/Trust do NOT solve
  equipment affordability (they protect existing assets / handle succession) — the ladder
  says don't skip rungs for small purchases.

**Canonical golden scenario** (must pass before the rules engine ships): AB sole prop,
AI/R&D + software activity, capital equipment purchase (GPU/workstation) →
SR&ED flagged (yellow, 15% non-refundable at sole-prop), Class 50 + Immediate Expensing
active (yellow — 2027 deadline), IRAP gated on incorporation (gray→yellow fork), Alberta
Innovates flagged, GST fork surfaced, CSBFP surfaced (financing). This is the previously
hardcoded wireframe example, now generated.

## Phase / process status

Brain work beyond the rules engine has **no phase contract yet**. A maintainer opens a phase
before it becomes active build work.
