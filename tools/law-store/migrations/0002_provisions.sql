-- 0002_provisions.sql — split documents into addressable provisions (2026-08-14)
--
-- Applied by contract/new_store.py, after the files before it.
--
-- WHY THIS EXISTS — the bug it closes:
-- v1 stored whole documents, so a citation could only be checked as "these words appear
-- somewhere in this Act." On 2026-08-14 that passed a quote labelled s.85(1) reading
-- "the following rules apply" -- a phrase occurring 170 times in the Income Tax Act, whose
-- actual match was elsewhere entirely. The stopgap was to demand document-wide uniqueness,
-- which works but forces needlessly long quotes and still never checks the LABEL.
--
-- With provisions parsed, `provision_label` stops being decorative: a quote is verified to
-- fall inside the section it names. That is the difference between "these words are in the
-- Act" and "these words are in section 85."
--
-- It also makes a real hazard visible: s.85 of the Income Tax Act is "Transfer of property
-- to corporation by shareholders"; s.85 of the CBCA is "List of security holders". Same
-- number, unrelated law. A citation without its document is ambiguous by construction.
--
-- Parsed counts at migration time: CBCA 294 provisions, Income Tax Act 695, all labels
-- unique within their document. Alberta's act uses a different layout and has NO parser
-- yet -- it stays whole-document, and the contract falls back to the uniqueness rule for it.

-- ---------------------------------------------------------------------------
-- provision — one addressable section of one document VERSION.
--
-- Tied to document_id, not to a source: when an Act is amended, the new snapshot gets its
-- own provisions, and the old ones stay exactly as they read at the time. `char_start` /
-- `char_end` are offsets into that document's text, so a provision is always re-derivable
-- and never becomes a second copy of the law that can drift.
-- ---------------------------------------------------------------------------
CREATE TABLE provision (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES document(id),
  label       TEXT    NOT NULL,          -- '85', '2.1' — the section number as printed
  heading     TEXT,                      -- the marginal note, e.g. 'Transfer of property...'
  char_start  INTEGER NOT NULL,
  char_end    INTEGER NOT NULL,
  ordinal     INTEGER NOT NULL,          -- order of appearance, so structure survives
  created_at  TEXT    NOT NULL
);

-- One row per section per document version. A duplicate label inside one document means
-- the parser mis-split, and this index turns that into a loud failure at parse time
-- instead of a quiet ambiguity at citation time.
CREATE UNIQUE INDEX idx_provision_label ON provision(document_id, label);
CREATE INDEX idx_provision_doc ON provision(document_id, ordinal);

-- ---------------------------------------------------------------------------
-- quote gains its anchor. NULLABLE on purpose: documents with no parser (Alberta today)
-- still support quoting under the document-wide uniqueness rule, so an unparsed source
-- degrades to the v1 behaviour rather than becoming unusable.
-- ---------------------------------------------------------------------------
ALTER TABLE quote ADD COLUMN provision_id INTEGER REFERENCES provision(id);
CREATE INDEX idx_quote_provision ON quote(provision_id);
