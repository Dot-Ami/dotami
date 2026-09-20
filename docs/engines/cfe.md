# CFE (Career/Financial Engine) — Reasoning Conventions

Catalog: `lib/engines/cfe/v2026/nodes.ts` (10 nodes as of 2026-07-02) · Priority: medium
(`lib/cfe/` is a legacy shim re-export — never add content there)

## What it holds

Lifecycle nodes Stage 0–4 (employee baseline → sole-prop activation → GST fork →
incorporation fork → SR&ED deepening / retained-earnings planning) plus branch nodes
(hire-first, service-vs-productize). Each node: trigger, financial impact, citations,
lens annotations, branch ids. This is the graph the cockpit renders.

## Node state semantics (today vs target)

**Today:** `recomputeScenarioState()` (`lib/scenarios/branches.ts`) applies a fixed
template — stage-0 completed, stage-1 active, two binary branch picks, hire-first toggle.
The profile does not influence node state beyond those picks.

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
2. **Triggers should be authored predicate-ready**: "net income sustained above ~$80K" is
   translatable to a threshold; "when it feels right" is not. Vague triggers block the
   brain.
3. Node count is version-locked scope (v1 = 10; 20+ is roadmap v4). Do not add nodes
   without maintainer approval.
4. `financialImpact.projectionNotes` feed the modeling footer — numbers there must agree
   with the engine that owns them (CCA math belongs to Write-offs; don't fork the numbers).
5. Stage semantics mirror the Structure ladder but are not the same axis: CFE = lifecycle
   events on a timeline; Structure = entity form. A node like "incorporation at $80K net"
   *references* a ladder rung, it doesn't duplicate it.
