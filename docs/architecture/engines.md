# Engine Layer Contract

Last updated: 2026-10-31 (the catalog shape is now the one the ten catalogs export, read from the code; one row
per engine folder; the archetype section and its integrity-test clause are gone, as archetypes are).

Every folder under `lib/engines/` holds read-only code, versioned by the year of the rules or the dataset it
holds (`lib/engines/<name>/v2026/`; the job groups are `lib/engines/noc/v2021/`, after the classification's own
version), and never in the database. Three kinds live there:

- **Cited catalogs:** entries written by hand, each carrying the citation contract below.
- **Licensed datasets:** a government file imported by a script under `scripts/`, never typed by hand, kept with
  its licence's attribution line; `npm run data:check` runs every importer's `--check`
  ([research-kit.md](research-kit.md) § 5.4).
- **The terms registry:** the research kit's source cards, one per outside source: what its terms let DotAmi do,
  and the words that decided it. A card is a dated observation of a source's terms; it backs no rule.

## Catalog shape

The ten cited catalogs each export one object, `<name>CatalogV2026`, from their folder's `index.ts`, written
`as const`. Seven of them have this shape:

```typescript
{
  version: "v2026";
  jurisdiction: "Canada";
  lastVerified: string; // ISO date
  entries: readonly TEntry[];
}
```

That is the `EngineCatalog<TEntry>` type in `lib/engines/shared/types.ts`, but no catalog is declared with it, so
the compiler doesn't hold the catalogs to it. The other three differ from it. On 2026-10-31 `satisfies
EngineCatalog<unknown>` was added to all ten for one `tsc` run, which refused exactly these three, and then taken
out again (no catalog's data was changed):

| Catalog | How it differs |
|---------|----------------|
| `cfeCatalogV2026` (`lib/engines/cfe/v2026/index.ts`) | its list is `nodes`, not `entries` |
| `officialFeesCatalogV2026` (`lib/engines/fees/v2026/index.ts`) | no `lastVerified`: each fee has its own `citation` and its date |
| `riskCatalogV2026` (`lib/engines/risk/v2026/index.ts`) | also `combinations`, the strategy stacks that together raise an audit read |

The roads catalog's `lastVerified` is worked out, not written: the newest of its roads' own. The licensed datasets
and the registry export their own shapes (`NocData`, `OasisData`, `WageData`, `SourceCard`, each in its folder's
`types.ts`).

## Citation requirements

Every entry of a cited catalog must include at least one citation with:

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

One row per folder under `lib/engines/` (14 on 2026-10-31; `lib/engines/shared/` holds the types they share).

| Engine folder | Kind | Entry type | Key fields |
|---------------|------|------------|------------|
| `lib/engines/cfe/v2026/` (CFE) | cited catalog | `CFENode` | id, stage, trigger, branches, financialImpact |
| `lib/engines/roads/v2026/` (2026-10-11) | cited catalog | `Road` | id, columns, steps (next, doneWhen, needs, costs, citations), forks; checked by `roadProblems` (docs/engines/roads.md) |
| `lib/engines/structure/v2026/` | cited catalog | `StructureStep` | id, entityType, transitionTrigger, nextSteps |
| `lib/engines/grants/v2026/` | cited catalog | `GrantProgram` | id, eligibility, provinces, structures |
| `lib/engines/writeoffs/v2026/` | cited catalog | `WriteOffCategory` | id, ccaClass?, structures, activityTags |
| `lib/engines/compliance/v2026/` | cited catalog | `ComplianceRule` | id, ruleType, provinces, threshold? |
| `lib/engines/templates/v2026/` | cited catalog | `TemplateReference` | id, docType, externalUrl, prepNote |
| `lib/engines/risk/v2026/` | cited catalog | `RiskEntry`, `RiskCombination` | id, severity, gaarExposure, trigger?, appliesTo, mitigation; a combination's memberIds and severityBump |
| `lib/engines/taxlines/v2026/` | cited catalog | `TaxLineEntry` | id, form, figureKind, yearsRead (each year's line, printedLabel and citations) |
| `lib/engines/fees/v2026/` | cited catalog | `OfficialFee` | id, place, amountCents, per?, onlyIf?, citation |
| `lib/engines/oasis/v2026/` | licensed dataset (Open Government Licence – Canada; `scripts/import-oasis.mjs`, `scripts/import-oasis-titles.mjs`) | `OasisData`, `OasisTitlesData` | descriptors, occupations (ratings kept, never shown), titles |
| `lib/engines/noc/v2021/` | licensed dataset (Statistics Canada Open Licence; `scripts/import-noc.mjs`) | `NocData` | groups, titles, requirements |
| `lib/engines/wages/v2026/` | licensed dataset (Open Government Licence – Canada; `scripts/import-job-bank-wages.mjs`) | `WageData` | geographies, rows (job group, geography, low, median, high, source, period) |
| `lib/engines/research-kit/v2026/` | terms registry (`registry.ts`; beside it, `economic-regions.ts` holds Alberta's eight economic regions as Statistics Canada publishes them, under the Statistics Canada Open Licence) | `SourceCard` | id, access, licence, creditLine, termsUrl, termsQuote, seenOn, checkedBy |

## Integrity tests

`tests/engine-integrity.spec.ts` validates the cited catalogs: unique ids, citations present, every citation read
or checked by a tool with its quotes (no read or check dated after today, no quote under three words), every
tax-line year's form read by a person, `lib/engines/all-citations.ts` missing no catalog, risk entries'
`appliesTo` and combination ids naming real entries, time-boxed write-off incentives carrying their dates, the
default branch picks and the node hints naming real catalog ids, and every dollar figure on the map coming from a
page its stage cites. The other kinds have their own checks: `roadProblems` for the roads (`tests/roads.spec.ts`),
`officialFeeProblems` for the fees (`tests/official-fees.spec.ts`), each importer's `--check` for the licensed
datasets (`npm run data:check`; `tests/oasis-import.spec.ts`, `tests/noc-import.spec.ts`,
`tests/wages-import.spec.ts`), and `validateRegistry` for the registry (`tests/research-kit-registry.spec.ts`).
