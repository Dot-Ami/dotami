# Risk Calculator — Spec

Last updated: 2026-07-02 · Status: **not built** · Build order: #3 (after rules engine)

## Job

The compliance safety valve that makes "legal but aggressive" honest. Two parts:

1. **Audit-trigger catalog** — a new versioned engine (`lib/engines/risk/v2026/`) of known
   CRA audit triggers and GAAR-exposure patterns, each with severity and predicate triggers.
2. **Risk evaluator** — extends the Strategy Rules Engine output: every surfaced lever gets
   a risk chip; strategy *combinations* get combination-level risk bumps.

> **Open flag (maintainers decide):** this is written as a seventh
> engine because the entry shape and consumers differ from Compliance. But "six engines" is
> product language used everywhere (README, CLAUDE.md, the engine docs). Get the count blessed before
> building, or fold into Compliance as a `risk` entry type if the maintainers prefer.

## Entry shape

```typescript
interface RiskEntry {
  id: string;                          // "risk-home-office-percentage"
  label: string;
  severity: "info" | "caution" | "professional-required";
  gaarExposure: boolean;               // true only for substance-sensitive structures
  trigger: Predicate;                  // same DSL as strategy-rules-engine.md
  appliesTo: string[];                 // engine entry ids this risk attaches to, e.g. ["writeoff-home-office"]
  why: string;                         // what draws CRA attention, plain language
  mitigation: string;                  // what makes the position defensible (documentation, logs, substance)
  citations: EngineCitation[];         // same citation contract as every engine
}
```

Combination heuristics are a second table:

```typescript
interface RiskCombination {
  id: string;
  memberIds: string[];                 // engine entry ids that together raise the profile
  severityBump: "caution" | "professional-required";
  why: string;                         // e.g. "Multiple maximized deductions against low revenue elevates review likelihood"
}
```

## Severity semantics (calibration guidance for authors)

| Severity | Meaning | Example |
|----------|---------|---------|
| `info` | Normal claim, keep records | Software subscriptions as current expense |
| `caution` | Legitimate but pattern-matched by CRA; documentation quality decides outcomes | Home office %, vehicle logbook, meals 50%, repeated losses (hobby-vs-business reclassification) |
| `professional-required` | Do not act without an accountant/lawyer | SR&ED claims, Immediate Expensing eligibility timing, incorporation timing, anything `gaarExposure: true` |

**GAAR calibration:** `gaarExposure: true` is reserved for structures whose *primary purpose*
could be read as tax avoidance without business substance (e.g. Holdco/Trust rungs entered
early, income-splitting arrangements). Ordinary deductions maximized aggressively are
`caution`, not GAAR — don't cry wolf, or the flag loses meaning.

## Output contract

Every `UnlockItem` from the Strategy Rules Engine carries:

```typescript
risk: {
  level: "info" | "caution" | "professional-required";
  gaar: boolean;
  why: string;
  mitigation: string;
} | null   // null only for Templates references
```

UI direction (Phase 4+ workshop decides final form): a small risk chip on each card,
consistent with the existing type/source chip pattern from the signed-off intake preview.
The aggressive option is **never** removed or sorted below safer ones because of risk —
risk informs, it does not censor. That ordering rule is philosophy, not style.

## Seed entries (author these first — validated research)

From the maintainers' seed research (2026-07-01) + standard CRA audit-trigger knowledge:

- Home-office percentage outliers (`caution`) — mitigation: floor-area math, exclusive use.
- Vehicle business-use claims without logbook (`caution`).
- Mixed personal/business use of capital equipment — honest apportionment % (`caution`,
  attaches to `writeoff-cca-class-50`).
- Immediate Expensing timing (`professional-required`, expires 2027 — attach to Class 50).
- SR&ED claim quality / contemporaneous documentation (`professional-required`).
- Repeated losses → hobby reclassification (`caution`, attaches to hobby-vs-business rule).
- Early Holdco/Trust ladder-skipping (`professional-required`, `gaarExposure: true`) —
  seed research explicitly validated that these rungs don't solve equipment affordability.
- Self-declared valuation as collateral (`professional-required`) — flagged in seed research
  as circular/misrepresentation-adjacent; CSBFP is the legitimate alternative.

## Testing

Same discipline as every engine: integrity tests (ids unique, citations present, severities
valid, `appliesTo` ids resolve to real engine entries), plus golden: the GPU/workstation
scenario's unlock set must carry the expected chips (Class 50+IEI → `professional-required`
with 2027 note; SR&ED → `professional-required`; home office → `caution`).
