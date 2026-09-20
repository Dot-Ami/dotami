# Write-off Engine — Reasoning Conventions

Catalog: `lib/engines/writeoffs/v2026/categories.ts` (7 entries as of 2026-07-02) · Priority: **high**

## What it holds

Expense categories keyed by structure, activity tags, and province — each with CRA
citation, eligibility prose, and tax/legal lens annotations. Today it is pure annotation
data; nothing evaluates it against a profile.

## How it should reason (target)

A write-off surfaces when its `conditions` predicate (see
`docs/brain/strategy-rules-engine.md`) matches the profile:

- **Green**: activity/structure/province match, no caution. E.g. SaaS founder → software
  subscriptions.
- **Yellow**: matches but needs apportionment honesty, documentation, or professional
  confirmation. Home office (exclusive-use test), vehicle (logbook), **anything CCA with
  mixed personal/business use**, and every time-boxed incentive.
- **Gray**: structure or activity rules it out.

`why` strings are templated from the matched predicate ("Shown because you selected
Alberta and AI/R&D activity"), matching the signed-off intake card anatomy.

## Authoring rules specific to this engine

1. **CCA entries encode class, rate, and incentive as data**: `ccaClass`, declining-balance
   rate, and any first-year incentive with its `expires` date. The current Class 50 entry
   describes "55% declining balance" in prose and **omits the Immediate Expensing Incentive
   (100% first-year, acquired + in use before 2027)** — fixing this is seed task #1
   (validated research: maintainers' notes, 2026-07-01).
2. **Deduction ≠ refund.** Copy must never imply "free". A deduction returns roughly the
   marginal rate at filing time. The seed research locked this framing: "'Write it off for
   free' is not a real outcome." Lens annotations should reflect value honestly
   ("may recover ~your marginal rate of the cost at filing").
3. **Percentage-limited categories** (meals 50%) get the limit as a typed field when the
   rules engine lands, not just prose.
4. **Structure gating matters**: some write-offs behave differently for sole props vs
   CCPCs — if the treatment differs, prefer two entries (or a per-structure field) over
   one blurry entry.
5. Every audit-sensitive category pairs with a Risk entry (`docs/brain/risk-calculator.md`
   seed list: home office %, vehicle logbook, mixed-use equipment).

## Seed backlog (validated, ready to author)

- Class 50 + Immediate Expensing Incentive (fix existing entry; `expires: 2027-01-01`;
  yellow + professional-required risk).
- Mixed-use apportionment guidance on capital equipment (caution risk attached).
- CCA year-1 modeling numbers (55% DB with half-year rule vs 100% IEI) as data for the
  projection footer — coordinate with Modeling layer before adding.
