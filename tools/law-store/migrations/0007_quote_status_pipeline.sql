-- 0007_quote_status_pipeline.sql — never compare dates across pipelines (2026-08-25)
--
-- Applied by contract/new_store.py, after the files before it.
--
-- THIS IS THE SAME BUG AS 0004's, IN A PLACE THE 2026-08-19 FIX DID NOT REACH.
-- That day found that ordering HTML and XML rows together by date kept selecting HTML, so
-- the switch to the official XML was silently inert. `latest_document()` was fixed to let
-- the registry's `preferred_format` decide. `quote_status` was not, and it makes exactly
-- the same comparison.
--
-- The two pipelines report different KINDS of date and are not comparable:
--   * HTML carries the SITE-WIDE consolidation date -- 2026-06-17 on every Act at once
--   * XML carries a per-Act `current-date` -- 2026-06-14 for the Income Tax Act
-- So `MAX(currency_iso)` per source_key picks the HTML row every time, and measured on the
-- live store on 2026-08-24 the result was backwards in both directions at once:
--   quote 4, anchored to the authoritative XML  -> SUPERSEDED
--   quote 3, anchored to the superseded scrape  -> CURRENT
-- A staleness flag that is wrong in both directions is worse than none: it teaches the
-- reader to ignore it, which is the failure these mechanisms exist to prevent.
--
-- THE FIX HERE is narrow and is only half the answer: group by (source_key, source_format)
-- so a document is only ever compared against its OWN pipeline. That question -- "did the
-- pipeline that produced this quote publish something newer?" -- is one SQL can answer
-- honestly without knowing the registry.
--
-- THE OTHER HALF cannot live in SQL, and deliberately does not: "is this the pipeline we
-- would cite from today?" is the registry's call, and mirroring `preferred_format` into a
-- column would be a second copy that rots on its own schedule -- the drift failure this
-- store has already had twice. `CorpusContract.quote_status()` answers it in Python by
-- comparing against `latest_document()`, the SAME single answer `sources_for_gates()` is
-- built from, so the two can never disagree. **The contract method is the sanctioned
-- reader; this view is the within-pipeline half of what it reports.**
--
-- `document_id` and `source_format` are added to the output so that method can do its work
-- without a second query, and so anyone reading the view directly can see which pipeline a
-- row came from rather than having to infer it.

DROP VIEW quote_status;

CREATE VIEW quote_status AS
SELECT
  q.id                AS quote_id,
  q.document_id       AS document_id,
  q.provision_label   AS provision_label,
  d.source_key        AS source_key,
  d.source_format     AS source_format,
  d.currency_iso      AS quoted_currency,
  latest.currency_iso AS latest_currency,
  CASE
    WHEN d.currency_iso IS NULL                  THEN 'UNVERIFIABLE'
    WHEN latest.currency_iso > d.currency_iso    THEN 'SUPERSEDED'
    ELSE 'CURRENT'
  END AS status
FROM quote q
JOIN document d ON d.id = q.document_id
LEFT JOIN (
  SELECT source_key, source_format, MAX(currency_iso) AS currency_iso
  FROM document
  WHERE currency_iso IS NOT NULL
  GROUP BY source_key, source_format
) latest ON latest.source_key = d.source_key
        AND latest.source_format = d.source_format;
