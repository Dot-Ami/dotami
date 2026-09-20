# Engine Reasoning Docs

Last updated: 2026-07-02

One file per engine: what it holds, how it reasons (today vs target), and the authoring
conventions that keep a cheaper model's output correct. The *catalog shape contract*
(types, citations, integrity tests) lives in `docs/architecture/engines.md`; these files
are about **semantics and judgment**. Brain-layer specs (rules evaluator, risk, RAG) live
in `docs/brain/`.

| Engine | File | Brain priority |
|--------|------|----------------|
| Write-off | [writeoffs.md](./writeoffs.md) | **High** |
| Grants | [grants.md](./grants.md) | **High** |
| Compliance | [compliance.md](./compliance.md) | **High** |
| Risk (7th engine, shipped 2026-07-02) | `lib/engines/risk/v2026/` + [../brain/risk-calculator.md](../brain/risk-calculator.md) | **High** |
| Structure | [structure.md](./structure.md) | Medium |
| CFE | [cfe.md](./cfe.md) | Medium |
| Templates | [templates.md](./templates.md) | Low |

## Conventions that apply to every engine (do not deviate)

1. **Catalogs are read-only, versioned, year-locked TypeScript** under
   `lib/engines/<name>/v2026/`. Never in Postgres. New year = new folder, not edits that
   erase history.
2. **Every entry cites its source** (`title, authority, jurisdiction, url, lastVerified,
   note`). No citation, no entry — the integrity test enforces presence; *you* enforce that
   the URL actually supports the claim.
3. **Compass language in all `lensAnnotations` and notes**: "if X, this may unlock Y".
   Never "you should", never "you qualify".
4. **Encode numbers as data, not prose.** "55% declining balance" inside a description
   string is invisible to the rules engine. Rates, thresholds, caps, and expiry dates get
   typed fields when the brain consumes them.
5. **Time-boxed rules carry `expires`** (ISO date) and are surfaced yellow with the
   deadline, never green. Example: Class 50 Immediate Expensing (before 2027).
6. **Aggressive levers are included, rated, and cited — never omitted.** If a lever is
   legal but audit-sensitive, it goes in with a Risk entry attached (see
   `docs/brain/risk-calculator.md`). Omitting it violates the product philosophy;
   including it without a risk read violates it too.
7. **`lastVerified` is a promise.** If you touch an entry, re-check its source and bump
   the date; if you can't verify, don't touch the entry.
8. **IDs are forever.** Archetypes, annotations, and (soon) risk entries reference engine
   ids. Rename labels freely; never rename ids.

## Known duplication — status

The hardcoded preview-card builders in `components/discovery/intake-page.tsx` were
**deleted 2026-07-02** — the intake preview now renders `evaluateProfile()` output. The
rule stands permanently: **never add venture knowledge to a component** — add it to a
catalog and let the brain drive the UI.

Residual violations to sweep (found in the 2026-07-04 audit): "$30K GST
line" copy in `intake-page.tsx`, stage/GST labels in `exploration-page.tsx` and
`cockpit-projection-footer.tsx`, `lib/brain/goal-effects.ts` cards with empty citations,
and the static node→engine hint maps in `lib/archetypes/annotations.ts` (parallel source
of truth until cockpit node coloring wires to the evaluator).
