# Engine Reasoning Docs

Last updated: 2026-10-12 (the official fees catalog, [fees.md](./fees.md); 2026-10-11: the roads catalog, [14a]; how a source was checked: read by a person
or checked by a tool, [citations.md](./citations.md); 2026-10-08: the tax-lines catalog, [8f])

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
| Tax lines ([8f], 2026-10-08) | [taxlines.md](./taxlines.md) | Low (read by the figures store and the return reader, not by the map) |
| Roads ([14a], 2026-10-11) | [roads.md](./roads.md) | High (the map draws a road; today's map is road 0) |
| Official fees (2026-10-12) | [fees.md](./fees.md) | Medium (each fee written once; roads and the ways to incorporate name it by id) |

## Conventions that apply to every engine (do not deviate)

1. **Catalogs are read-only, versioned, year-locked TypeScript** under
   `lib/engines/<name>/v2026/`. Never in the database. New year = new folder, not edits that
   erase history.
2. **Every entry cites its source** (`title, authority, jurisdiction, url, note`, and how it
   was checked: `lastVerified` and/or `toolCheck`). No citation, no entry — the integrity test
   enforces presence; *you* enforce that the URL actually supports the claim.
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
   **Or a tool check** (the maintainer's decision of 2026-10-11, option B): instead of, or as
   well as, a person's read, a citation may carry `toolCheck: { checkedOn, quotes }`, recorded
   only after `node scripts/check-quotes.mjs --url … --quote …` found every quote on the live
   page as whole words. It needs one of the two; the card says which ("Read by a person on …"
   only when `readBy: "person"` records it, "Read on …. Who read it wasn't recorded." for a read
   nobody recorded the reader of, or "Checked by a tool on …: it found on the page the exact words
   this entry relies on. Not read by a person yet."). A tool check says the words are on the
   page, not that the entry reads them right.
   The shape, the names and the rules: [citations.md](./citations.md).
8. **IDs are forever.** Archetypes, annotations, and (soon) risk entries reference engine
   ids. Rename labels freely; never rename ids.
9. **A new entry usually needs a hint too.** Each road step names the catalog entry ids that
   show on its card in `engineHints` (road 0's are in
   `lib/engines/roads/v2026/starting-any-business-ab.ts`; until 2026-10-12 they were
   `NODE_ENGINE_HINTS` in `lib/brain/node-items.ts`, which now reads them from the road). Add your
   id to the step it belongs under; an entry with no hint still appears, but only under "Elsewhere
   on your map". `tests/engine-integrity.spec.ts` fails on a hint naming an id no catalog has.

## Known duplication — status

The hardcoded preview-card builders in `components/discovery/intake-page.tsx` were
**deleted 2026-07-02** — the intake preview now renders `evaluateProfile()` output. The
rule stands permanently: **never add venture knowledge to a component** — add it to a
catalog and let the brain drive the UI.

Since then `exploration-page.tsx`, `cockpit-projection-footer.tsx` and `lib/archetypes/`
were deleted (S2.5.4h, 2026-09-14); the node→engine hint map lived in
`lib/brain/node-items.ts` as `NODE_ENGINE_HINTS` and since 2026-10-12 is each road step's
`engineHints` (convention 9 above).

Residual to sweep: the `lib/brain/goal-effects.ts` cards that still carry empty citations. (The
"$30K GST line" copy in `components/discovery/intake-page.tsx` went on 2026-10-11.)
