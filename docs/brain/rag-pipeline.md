# RAG Pipeline — Spec

Last updated: 2026-07-02 · Status: **not built** · Build order: #4 (last, deliberately)

## Job — and the boundary that matters more than the job

Citation-grounded retrieval over real Canadian tax law (ITA sections, CRA guidance,
provincial equivalents) so the Lens can quote and cite actual statute/guidance text instead
of relying on model memory.

**Boundary (locked architecture decision, see `docs/brain/README.md`): RAG explains, rules
decide.** Retrieval output feeds LLM *prose* in the Lens and assists catalog
authoring/verification. It never sets node states, unlock lists, or risk levels. If a
retrieved passage contradicts an engine entry, that's a catalog bug to fix in TypeScript —
file it, don't patch it at runtime.

## Why this is built last

1. Needs stack changes a maintainer must approve: pgvector extension + an embeddings provider
   (Anthropic has no embeddings API; **Voyage** is the recommended pairing — but provider
   choice is a maintainer cost decision, flag before committing).
2. Rules + Risk deliver the differentiating product behavior with zero new infra.
3. A RAG layer without deterministic rules underneath just produces better-worded guesses.

## Corpus

| Source | What | Notes |
|--------|------|-------|
| Income Tax Act | Justice Laws consolidated XML/HTML | Section-structured; the canonical layer |
| CRA guidance | T4002, IT folios/bulletins, program pages (SR&ED, CCA classes, GST/HST) | The pages engine citations already link to — start here, it's the content users actually see |
| Provincial | AB/BC/ON program + registry pages | Match v1 province scope; don't ingest all provinces |

Scope discipline: v1 corpus = **only sources already cited by engine entries + the ITA
sections behind them**. Do not boil the ocean; grow corpus when an engine entry needs it.

## Ingestion (repo script, versioned corpus first)

`scripts/corpus/` produces versioned, reviewable artifacts **before** anything touches the DB:

1. Fetch → normalize to markdown, one file per source document, YAML frontmatter:
   `{ sourceUrl, authority, jurisdiction, fetchedAt, lastVerified, docType }`.
2. Corpus files live in the repo (or repo-adjacent storage if size demands — flag if so).
   Same `lastVerified` discipline as engines; a stale corpus is a bug.
3. Chunking: **section-aware, never fixed-size.** Statutes and CRA pages have real hierarchy
   (Part → Division → Section → Subsection; page → heading). One chunk = one
   subsection/heading-block, prefixed with its ancestor-heading path as context. Target
   ≤ ~800 tokens; split oversized subsections at paragraph boundaries keeping the heading
   prefix.
4. Embed + load: chunk table rows with embedding, full citation metadata, and the
   corpus-file hash (so re-ingestion is diffable and idempotent).

## Storage (existing Postgres, monolith preserved)

```prisma
model CorpusDoc   { id, sourceUrl @unique, authority, jurisdiction, docType,
                    fetchedAt, lastVerified, contentHash, chunks CorpusChunk[] }
model CorpusChunk { id, docId, headingPath, text, tokenCount,
                    embedding Unsupported("vector(1024)"), tsv Unsupported("tsvector") }
```

pgvector is available on Neon/Vercel Postgres. Dimension pinned by the chosen embedding
model — record the model id + dimension in a `CorpusMeta` row; mixing embedding models in
one table is a silent-failure classic.

## Retrieval

- **Hybrid, both legs always:** tsvector/BM25 keyword + cosine vector, merged with
  reciprocal-rank fusion. Tax queries are full of exact terms of art ("small supplier",
  "Class 50") where keyword wins, wrapped in natural language where vector wins.
- Filters: jurisdiction + authority from the venture profile (an AB sole prop shouldn't
  retrieve ON-only guidance unless comparing).
- Top-k ≈ 8 into the Lens prompt as structured blocks:
  `{ headingPath, sourceUrl, lastVerified, text }`. The system prompt requires the model to
  cite `sourceUrl`s it used and say "not in my sources" rather than improvise — extend
  `lib/providers/llm/system-prompt.ts`, keep the existing compass-voice rules.
- Reranker: skip in v1. Add only if retrieval quality measurably fails golden queries.

## Citation tracking (the point of the whole thing)

Every Lens answer paragraph that leans on a retrieved chunk must carry its citation, in
the same `{ title, authority, jurisdiction, url, lastVerified }` shape engines already use.
UI renders them like the source chips on intake preview cards (signed-off pattern).

## Testing

- Golden retrieval queries with expected doc hits (e.g. "when do I have to register for
  GST" → CRA when-to-register page top-3).
- Ingestion idempotency: re-run on unchanged sources → zero row churn (hash check).
- Citation integrity: every chunk's `sourceUrl` resolves to a live corpus doc; every corpus
  doc has `lastVerified`.
- Boundary test: Lens answers about eligibility must include the "confirm with a
  professional" framing — RAG text never upgrades a yellow to green.
