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
   node's text that isn't one of the cited amounts it lists, or whose page the node doesn't cite
   (the second half since 2026-10-24: until then Sole Prop activation said $30,000 and cited neither
   page that sets it; it now cites the CRA's *When to register for and start charging the GST/HST*,
   the maintainer's reading list of 2026-10-23).
   The one exception that was left, in the evaluator where that test can't see it, went on
   2026-10-11: `THRESHOLD_WATCH_RATIO` (0.7) turned a GST/HST card amber at 70% of the line
   (about $21,000) and called the estimate "approaching" it. No cited page sets 70%. A threshold
   card now changes only when the cited test itself is met, and `tests/honest-map.spec.ts` fails
   if a watch ratio comes back.
   **Where the official words matter, quote them.** A node (or compliance rule) can carry
   `officialWords`: sentences copied exactly from one of its own cited pages, shown in quotation
   marks. The GST/HST cards quote the CRA's two small-supplier tests this way
   (`lib/engines/compliance/v2026/gst-official-words.ts`); the paraphrase they replaced dropped
   the CRA's "(or fewer)". Every other mention says "over $30,000 in a single calendar quarter, or
   over the previous four (or fewer) consecutive calendar quarters", never "$30K".
   **Ways of taking a stage sit side by side** (`lib/engines/cfe/v2026/incorporation-routes.ts`,
   2026-10-11): each line is an official fee whose amount is inside the quoted words of its own
   page, a named blank, or "not needed"; DotAmi totals nothing and picks no way.
   **Quoted words are tool-checked** (option B, [citations.md](citations.md)): since 2026-10-12 the
   page behind every official-words box and every way's line carries a `toolCheck` whose quotes are
   the words relied on, found on the live page by `scripts/check-quotes.mjs`, never a read date
   that would claim a person read it.
   **A quote in a node's own text is held by one of its own sources** (2026-10-24, the maintainer's
   reading list): where an estimate's value or basis, or a projection note, gives a page's words, they
   sit in curly quotation marks and are among the `toolCheck` quotes of a citation of that same node,
   so the page is one click away under *Sources for this stage*. A citation that also has a read keeps
   it, and the read wins on screen (rule 3 of [citations.md](citations.md)); quotes the reading list's
   matcher found on 2026-10-23 are recorded as a tool check of that day, on the stage the list checked
   only (citations.md, § The reading list's tool checks). As built: Sole Prop activation's note on what
   counts toward the $30,000 tests, Incorporating's business limit ("Up to $500,000"), Hire first
   employee's payroll account timing, and the 35% on Incorporation for liability/SR&ED and SR&ED
   deepening. `tests/reading-list-corrections.spec.ts` § 4 fails on a quoted run that no citation of
   its node holds.
   **A number only the person can give** is asked on the node (`asksOwnNumber`): Incorporating's
   "I'd incorporate at $___" is the only thing that can light it green.
3. Node count is version-locked scope (v1 = 10; 20+ is roadmap v4). Do not add nodes
   without maintainer approval.
4. `financialImpact.projectionNotes` feed the modeling footer — numbers there must agree
   with the engine that owns them (CCA math belongs to Write-offs; don't fork the numbers).
5. Stage semantics mirror the Structure ladder but are not the same axis: CFE = lifecycle
   events on a timeline; Structure = entity form. A node like "Incorporating"
   *references* a ladder rung, it doesn't duplicate it.
