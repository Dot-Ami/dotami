# Engine Layer Contract

Every engine under `lib/engines/<name>/v2026/` follows this contract.

## Catalog shape

```typescript
interface EngineCatalog<TEntry> {
  version: "v2026";
  jurisdiction: "Canada";
  lastVerified: string; // ISO date
  entries: TEntry[];
}
```

## Citation requirements

Every entry must include at least one citation with:

- `title`, `authority` (`CRA` | `federal` | `provincial`), `jurisdiction` (`AB` | `BC` | `ON` | `CA`)
- `url`, `note`
- how it was checked, at least one of: `lastVerified` (the day it was read; `readBy` says who,
  only when that is on record) and
  `toolCheck: { checkedOn, quotes }` (the day `scripts/check-quotes.mjs` found the quoted words on
  the live page; decided 2026-10-11). Shape, names and rules:
  [docs/engines/citations.md](../engines/citations.md).

## Lens annotations

Entries that affect tax or legal decisions include `lensAnnotations: { tax, legal }` using compass-not-GPS language ("if X, this unlocks Y").

## Per-engine entry types

| Engine | Entry type | Key fields |
|--------|------------|------------|
| CFE | `CFENode` | id, stage, trigger, branches, financialImpact |
| Structure | `StructureStep` | id, entityType, transitionTrigger, nextSteps |
| Grants | `GrantProgram` | id, eligibility, provinces, structures |
| Write-off | `WriteOffCategory` | id, ccaClass?, structures, activityTags |
| Compliance | `ComplianceRule` | id, ruleType, provinces, threshold? |
| Templates | `TemplateReference` | id, docType, externalUrl, prepNote |

## Archetype binding

`ArchetypeConfig` references engine entry ids:

- `forkPriority: ForkChipConfig[]` — cockpit header
- `grantIds`, `writeOffIds` — exploration fast-facts
- `cfeNodeSequence` — which nodes surface first
- `defaultScenario` — profile + branch defaults

## Integrity tests

`tests/engine-integrity.spec.ts` validates: unique ids, citations present, every citation read or checked by a tool with its quotes (no read or check dated after today, no quote under three words), every tax-line year's form read by a person, archetype ids resolve to real engine entries.
