-- 0005_references.sql — the cross-references between provisions (2026-08-19)
--
-- Applied by contract/new_store.py, after the files before it.
--
-- WHY: statute works like a Bible with a symbol pointing at every other place a thing is
-- mentioned. Measured in the stored Income Tax Act: 5,030 "subsection N(n)" references,
-- 1,848 "section N", 1,703 "paragraph N(n)(l)",
-- 542 "subject to", 434 "notwithstanding", 557 "as defined in". **Section 85 alone makes
-- 55 outbound references.**
--
-- A section is therefore NOT self-contained, and an answer that reads one section and stops
-- is the failure mode this whole corpus exists to prevent. Storing the edges is what turns
-- "find me a loophole" from guesswork into traversal: a benefit that survives its own
-- chain of qualifiers is a real finding; one that does not is noise.
--
-- THE KIND COLUMN IS THE POINT. These are not all the same edge:
--   subject_to       "subject to section 84.1" -- the cited rule LOSES to the target.
--                    Missing one inverts the answer.
--   notwithstanding  "notwithstanding subsection 85(1)" -- the cited rule WINS over the
--                    target. Also inverts, in the other direction.
--   defined_in       "as defined in subsection 248(1)" -- the everyday meaning of the word
--                    is WRONG; only the statutory definition counts.
--   reference        a plain pointer. Worth following, but it does not flip anything.
-- Flattening these into one "related" edge would throw away the only part that changes an
-- answer, which is precisely the mistake a naive graph build makes.
--
-- Edges hang off a PROVISION of a DOCUMENT VERSION, so they are re-derived per snapshot and
-- an amendment cannot leave a stale edge pointing at text that no longer says that.
-- Derived data, like `provision`: rebuildable from `document.text`, never authored.

CREATE TABLE reference (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  from_provision_id INTEGER NOT NULL REFERENCES provision(id),
  document_id       INTEGER NOT NULL REFERENCES document(id),
  target_label      TEXT    NOT NULL,   -- '84.1' — the section number pointed at
  target_detail     TEXT,               -- '(1)' / '(1)(a)' when the pointer is finer
  kind              TEXT    NOT NULL CHECK (kind IN (
                      'subject_to', 'notwithstanding', 'defined_in', 'reference')),
  raw               TEXT    NOT NULL,   -- the matched phrase, verbatim, for audit
  char_offset       INTEGER,            -- where in document.text it was found
  created_at        TEXT    NOT NULL
);

-- Same span found twice by two patterns is one edge, not two.
CREATE UNIQUE INDEX idx_reference_span
  ON reference(from_provision_id, kind, target_label, COALESCE(target_detail, ''), char_offset);
CREATE INDEX idx_reference_from   ON reference(from_provision_id, kind);
CREATE INDEX idx_reference_target ON reference(document_id, target_label);
CREATE INDEX idx_reference_kind   ON reference(kind);

-- The qualifiers that can flip an answer, resolved to the provision they point at.
-- `resolved_provision_id` is NULL when the target is not a section we hold -- an
-- unresolvable "subject to" is a REAL finding (it usually means a cross-Act pointer), not
-- a row to hide.
CREATE VIEW blocking_reference AS
SELECT
  r.id                AS reference_id,
  r.from_provision_id AS from_provision_id,
  p.label             AS from_label,
  d.source_key        AS source_key,
  r.kind              AS kind,
  r.target_label      AS target_label,
  r.target_detail     AS target_detail,
  r.raw               AS raw,
  t.id                AS resolved_provision_id,
  t.heading           AS resolved_heading
FROM reference r
JOIN provision p ON p.id = r.from_provision_id
JOIN document  d ON d.id = r.document_id
LEFT JOIN provision t ON t.document_id = r.document_id AND t.label = r.target_label
WHERE r.kind IN ('subject_to', 'notwithstanding', 'defined_in');
