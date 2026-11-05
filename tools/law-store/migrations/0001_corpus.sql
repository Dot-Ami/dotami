-- 0001_corpus.sql — legal/tax corpus store, initial schema (2026-08-14)
--
-- Applied, with the rest of this folder in order, by contract/new_store.py. The contract
-- itself never issues DDL.
--
-- THE ONE IDEA THIS SCHEMA EXISTS FOR: a statute is only worth what its date is worth.
-- The Income Tax Act page read "current to 2026-06-17, last amended 2026-04-01" the day
-- this was written, and it moves on a budget cycle. A store that overwrote on amendment
-- would silently turn every past citation into a possible lie. So documents are IMMUTABLE
-- SNAPSHOTS, quotes are bound to one snapshot by foreign key, and an amendment makes the
-- affected quotes visibly SUPERSEDED instead of quietly wrong. (The maintainer's call
-- 2026-08-14: keep every version forever — audits look backwards.)
--
-- Facts / provenance split: the content tables hold only what a document says. Where it
-- came from, who fetched it and how confident they were lives in `provenance`. Nothing
-- about a row's origin is stored inline.
--
-- NOT stored here, deliberately: tax rates, brackets, thresholds, CCA rates and filing
-- deadlines. Those are fetched live at question time because a stored rate goes stale in
-- silence and then answers with total confidence. There is no rates table on purpose.
--
-- ALSO not stored here: legal basis and licence per source. Those stay canonical in
-- registry.yaml. Duplicating them into SQL would create a second source of truth that
-- rots independently.

-- ---------------------------------------------------------------------------
-- document — one immutable snapshot of one source, as fetched at one moment.
-- Never UPDATEd, only INSERTed. An amendment produces a NEW row.
--
-- `currency_raw` keeps what the page literally printed ("September 1, 2025" or
-- "2026-06-17"); `currency_iso` is the normalized form used for comparison. Both, because
-- normalizing is lossy and the raw string is the evidence.
--
-- `currency_iso` is NULLABLE on purpose: a source whose date we could not read is still
-- worth recording as a failed attempt. It is NOT quotable — the contract refuses, and
-- `quote_status` reports UNVERIFIABLE. The registered Alberta act is exactly this case.
-- ---------------------------------------------------------------------------
CREATE TABLE document (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key     TEXT    NOT NULL,          -- key into registry.yaml
  url            TEXT    NOT NULL,
  kind           TEXT    NOT NULL CHECK (kind IN ('structure', 'interpretation')),
  jurisdiction   TEXT    NOT NULL,          -- 'CA', 'CA-AB', ... so answers cannot blend them
  currency_raw   TEXT,                      -- verbatim from the page
  currency_iso   TEXT,                      -- YYYY-MM-DD, NULL when unreadable
  text           TEXT    NOT NULL,          -- the document itself
  content_sha256 TEXT    NOT NULL,          -- tamper + duplicate detection
  byte_length    INTEGER NOT NULL,
  fetched_at     TEXT    NOT NULL,          -- when WE pulled it
  created_at     TEXT    NOT NULL
);

-- Re-downloading identical content is a no-op, which makes the nightly job safe to re-run.
-- Keyed on the hash rather than the date: a page can be re-issued with a new currency line
-- and unchanged text, and that is not a new version of the law.
CREATE UNIQUE INDEX idx_document_content ON document(source_key, content_sha256);
CREATE INDEX idx_document_source   ON document(source_key, currency_iso);
CREATE INDEX idx_document_currency ON document(currency_iso);

-- ---------------------------------------------------------------------------
-- quote — a verbatim span that has been matched against ONE document version.
--
-- The foreign key is the load-bearing part of this whole schema: a quote can never float
-- free of the version it was taken from, so "is this citation still good?" is always
-- answerable. `char_offset` is where it matched, which lets a later re-verification find
-- it again cheaply and lets the truncation gate look at what follows.
-- ---------------------------------------------------------------------------
CREATE TABLE quote (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id     INTEGER NOT NULL REFERENCES document(id),
  provision_label TEXT    NOT NULL,         -- 's.85(1)' — a label, never trusted for matching
  text            TEXT    NOT NULL,         -- the verbatim span
  char_offset     INTEGER,                  -- where it matched in document.text
  verified_at     TEXT    NOT NULL,         -- when the citation gate last confirmed it
  created_at      TEXT    NOT NULL
);
CREATE UNIQUE INDEX idx_quote_span ON quote(document_id, provision_label, text);
CREATE INDEX idx_quote_document ON quote(document_id);

-- ---------------------------------------------------------------------------
-- source_check — freshness probe history, one row per check per source.
--
-- History rather than last-known-state on purpose: "when did this source start failing?"
-- is a real question, and a single overwritten row cannot answer it.
--
-- UNREACHABLE is stored as its own status because a network failure is NOT evidence of
-- freshness, and collapsing it into UNCHANGED would be the most dangerous bug available.
-- ---------------------------------------------------------------------------
CREATE TABLE source_check (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key    TEXT NOT NULL,
  url           TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('NEW', 'UNCHANGED', 'CHANGED', 'UNREACHABLE')),
  currency_raw  TEXT,
  currency_iso  TEXT,
  etag          TEXT,
  last_modified TEXT,
  detail        TEXT,
  checked_at    TEXT NOT NULL
);
CREATE INDEX idx_check_source ON source_check(source_key, checked_at);
CREATE INDEX idx_check_status ON source_check(status, checked_at);

-- ---------------------------------------------------------------------------
-- provenance — one row per (content row, source).
--
-- SQLite cannot express a foreign key across three parent tables, so (entity, row_id)
-- linkage is enforced by the contract API — which is why nothing here is written with
-- direct SQL: it is precisely what can bypass this.
-- ---------------------------------------------------------------------------
CREATE TABLE provenance (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  entity             TEXT NOT NULL CHECK (entity IN ('document', 'quote', 'source_check')),
  row_id             INTEGER NOT NULL,
  source             TEXT NOT NULL,         -- registry key, or the tool that supplied the row
  source_ref         TEXT,                  -- stable id at the source (the URL)
  source_captured_at TEXT,                  -- the SOURCE's own timestamp, verbatim
  recorded_by        TEXT NOT NULL,         -- the tool that wrote the row
  recorded_at        TEXT NOT NULL,
  confidence         TEXT NOT NULL DEFAULT 'verified'
                       CHECK (confidence IN ('verified', 'inferred', 'guess')),
  note               TEXT
);
CREATE INDEX idx_prov_row ON provenance(entity, row_id);

-- ---------------------------------------------------------------------------
-- quote_status — a VIEW, not a column, because a stored staleness flag rots the moment
-- a new document lands and nobody remembers to sweep. Computed on read, always true.
--
--   UNVERIFIABLE  its document has no readable currency date -> never quotable
--   SUPERSEDED    a newer version of that source exists -> re-verify before relying on it
--   CURRENT       its document is the newest we hold for that source
--
-- SUPERSEDED does NOT mean wrong. Most amendments leave most provisions untouched. It
-- means "unproven since the source moved", which is the honest state.
-- ---------------------------------------------------------------------------
CREATE VIEW quote_status AS
SELECT
  q.id                AS quote_id,
  q.provision_label   AS provision_label,
  d.source_key        AS source_key,
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
  SELECT source_key, MAX(currency_iso) AS currency_iso
  FROM document
  WHERE currency_iso IS NOT NULL
  GROUP BY source_key
) latest ON latest.source_key = d.source_key;
