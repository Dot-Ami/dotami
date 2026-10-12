# CFE (Career/Financial Engine) — Reasoning Conventions

Catalog: `lib/engines/cfe/v2026/nodes.ts` (10 nodes as of 2026-07-02) · Priority: medium
(`lib/cfe/` is a legacy shim re-export — never add content there)

## What it holds

Lifecycle nodes Stage 0–4 (employee baseline → sole-prop activation → GST fork →
incorporation fork → SR&ED deepening / retained-earnings planning) plus branch nodes
(hire-first, service-vs-productize). Each node: trigger, financial impact, citations,
lens annotations, branch ids. The cockpit draws it as road 0, *Starting any business in Alberta (tax
and structure)* ([roads.md](./roads.md), since 2026-10-11): tiers become columns, nodes become steps.

## Node state semantics (today vs target)

**Today:** `recomputeScenarioState()` (`lib/scenarios/branches.ts`) applies a fixed
template — stage-0 completed, stage-1 active, two binary branch picks, hire-first toggle —
for the chips. The colours come from `evaluateProfile` (`lib/brain/evaluate.ts`
`computeNodeStates`), always run on the venture's own picks through
`lib/scenarios/evaluate-scenario.ts` (since 2026-10-11; before that the cockpit ran it on the
default picks, so flipping a toggle didn't recolour the cards).

**Target:** the Strategy Rules Engine computes green/yellow/gray per node from the profile
(`docs/brain/strategy-rules-engine.md`):

- **Green** — on the user's current path (conditions met or stage already crossed).
- **Yellow** — reachable next: trigger conditions partially met, near a threshold, or one
  fork away. Yellow nodes are where the map earns its keep — they answer "what unlocks next".
- **Gray** — different branch or conditions clearly unmet.

Keep bookkeeping (completed/active/ghosted for graph layout) separate from brain coloring
in v0 of the brain; merging the two systems is its own reviewed change.

## Authoring rules

1. Node contract is strict (enforced by integrity tests): citations, `lastVerified`,
   tax + legal lens annotations, financial impact with projection notes, resolvable branch
   ids. No exceptions — the Lens context pack serializes all of it into prompts.
2. **Triggers should be authored predicate-ready**: "taxable supplies over $30,000 in one
   calendar quarter or over the last four" (the CRA's own test, cited) is translatable to a
   threshold; "when it feels right" is not. Vague triggers block the brain.
   **A number on a node comes from a page the node cites.** DotAmi doesn't pick a point of its
   own at which to take a step (a revenue at which to incorporate, a "planning trigger"): where
   no official page sets one, the choice is the person's, the node says so in its trigger, and
   it stays amber (check first) instead of lighting from an amount. Removed on 2026-10-11:
   "Incorporation at $80K net", whose $80,000 was a heuristic with no source and was compared
   against third-year *sales*. `tests/engine-integrity.spec.ts` fails on a dollar figure in a
   node's text that isn't one of the cited amounts it lists, or whose page the node doesn't cite.
   **One known exception is left, in the evaluator, not on a node,** so that test can't see it:
   `THRESHOLD_WATCH_RATIO` (0.7) in `lib/brain/evaluate.ts`. A first-year estimate, or a
   complete run of confirmed quarters, at 70% of the GST/HST line or more (about $21,000) turns
   the GST/HST card the person didn't pick from grey to amber, and makes the GST/HST compliance
   item say the estimate is "approaching" the line. No cited page sets that 70%. It predates this
   rule and goes in the GST/HST card rework, where the card uses only the CRA's own test
   (docs/task-list.md, [10f]); until then it is an uncited watch line, not a rule.
3. Node count is version-locked scope (v1 = 10; 20+ is roadmap v4). Do not add nodes
   without maintainer approval.
4. `financialImpact.projectionNotes` feed the modeling footer — numbers there must agree
   with the engine that owns them (CCA math belongs to Write-offs; don't fork the numbers).
5. Stage semantics mirror the Structure ladder but are not the same axis: CFE = lifecycle
   events on a timeline; Structure = entity form. A node like "Incorporating"
   *references* a ladder rung, it doesn't duplicate it.
