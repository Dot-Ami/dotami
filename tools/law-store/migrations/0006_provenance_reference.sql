-- 0006_provenance_reference.sql — provenance can describe a reference (2026-08-19)
--
-- Applied by contract/new_store.py, after the files before it.
--
-- THIS IS THE SECOND TIME. 0002 added `provision` and forgot to widen this CHECK; 0005
-- added `reference` and forgot again. Both times the failure was clean -- the transaction
-- rolled back, nothing partial landed, and the CHECK caught a Python constant that had
-- drifted from the schema. That is the constraint doing its job, twice.
--
-- Fixing only the constraint would guarantee a third time, so `CorpusContract.open()` now
-- reads this CHECK out of `sqlite_master` and compares it against its own `ENTITIES`
-- tuple, refusing to open when they disagree. The drift becomes a startup error naming
-- both sides instead of an IntegrityError halfway through a batch insert.
--
-- SQLite cannot ALTER a CHECK, so the table is rebuilt; the copy preserves every existing
-- provenance row and its ids.

PRAGMA foreign_keys=OFF;

CREATE TABLE provenance_new (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  entity             TEXT NOT NULL CHECK (entity IN ('document', 'quote', 'source_check',
                                                     'provision', 'reference')),
  row_id             INTEGER NOT NULL,
  source             TEXT NOT NULL,
  source_ref         TEXT,
  source_captured_at TEXT,
  recorded_by        TEXT NOT NULL,
  recorded_at        TEXT NOT NULL,
  confidence         TEXT NOT NULL DEFAULT 'verified'
                       CHECK (confidence IN ('verified', 'inferred', 'guess')),
  note               TEXT
);

INSERT INTO provenance_new (id, entity, row_id, source, source_ref, source_captured_at,
                            recorded_by, recorded_at, confidence, note)
  SELECT id, entity, row_id, source, source_ref, source_captured_at,
         recorded_by, recorded_at, confidence, note
  FROM provenance;

DROP TABLE provenance;
ALTER TABLE provenance_new RENAME TO provenance;

CREATE INDEX idx_prov_row ON provenance(entity, row_id);

PRAGMA foreign_keys=ON;
