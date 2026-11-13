-- 0003_provenance_entity.sql — let provenance describe a provision too (2026-08-14)
--
-- Applied by contract/new_store.py, after the files before it.
--
-- 0002 added the `provision` table but did NOT widen `provenance.entity`, whose CHECK
-- still listed only document/quote/source_check. The first real parse run therefore failed
-- mid-insert -- correctly: the transaction rolled back and left zero partial rows, and the
-- CHECK did exactly the job it exists for by catching a Python constant that had drifted
-- from the schema. Recorded here rather than quietly patched, because "the enforcement is
-- in the schema, not in the calling code" is the reason it worked.
--
-- SQLite cannot ALTER a CHECK constraint, so the table is rebuilt in place: the 12-column
-- copy below preserves every existing provenance row and its ids.

PRAGMA foreign_keys=OFF;

CREATE TABLE provenance_new (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  entity             TEXT NOT NULL CHECK (entity IN ('document', 'quote', 'source_check',
                                                     'provision')),
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
