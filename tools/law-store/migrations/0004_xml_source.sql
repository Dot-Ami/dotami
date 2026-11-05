-- 0004_xml_source.sql — carry what the official XML knows that HTML cannot (2026-08-19)
--
-- Applied by contract/new_store.py, after the files before it.
--
-- SOURCE VERIFIED before this migration was written, three independent ways:
--   1. open.canada.ca (Government of Canada Open Government Portal) links directly to
--      github.com/justicecanada/laws-lois-xml as the dataset's own resource
--   2. LICENSE.md is the Open Government Licence - Canada, (c) Government of Canada
--   3. s.85(1) of the Income Tax Act pulled from that XML is byte-identical to the text
--      already stored here from laws-lois.justice.gc.ca itself
-- Noted honestly: the GitHub org is not "verified" by GitHub's own badge system. The
-- content match in (3) is what actually settles it -- provenance claims can be faked,
-- a byte-identical match against the official site cannot.
--
-- WHAT THE XML ADDS, measured on the Income Tax Act (14 MB):
--   * per-SECTION `lims:lastAmendedDate` and `lims:inforce-start-date`. Today an amendment
--     anywhere in a 7.6 MB Act marks EVERY quote from it SUPERSEDED. With these, only
--     quotes from sections that actually moved flip -- the difference between a usable
--     staleness signal and a permanent false alarm.
--   * 548 <Repealed> markers. A repealed provision is currently invisible to us, which is
--     the most dangerous kind of stale: it reads as perfectly good law.
--   * real nesting (856 Section / 5,351 Subsection / 13,211 Paragraph) instead of a regex
--     over "Marginal note:".
--
-- HTML sources (Alberta) keep working unchanged: every column added here is nullable, and
-- `source_format` records which pipeline produced a row so the two never get confused.

-- Which pipeline produced this document. HTML rows predate the XML source and stay valid;
-- they simply carry less. Defaulting to 'html' keeps the three existing rows honest.
ALTER TABLE document ADD COLUMN source_format TEXT NOT NULL DEFAULT 'html';

-- Per-section dates. NULL means "this pipeline could not tell us", never "unchanged" --
-- the same rule the freshness checker follows, for the same reason.
ALTER TABLE provision ADD COLUMN inforce_start TEXT;
ALTER TABLE provision ADD COLUMN last_amended  TEXT;

-- 0 = in force, 1 = repealed. NOT a delete: a repealed section still needs to be readable
-- for a point-in-time question about a year when it was in force.
ALTER TABLE provision ADD COLUMN repealed INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_provision_amended ON provision(last_amended);
CREATE INDEX idx_provision_repealed ON provision(repealed);

-- Section-level staleness. `quote_status` (v1) answers "did this Act move?"; this answers
-- the question that actually matters: "did the section I quoted move?"
CREATE VIEW quote_precision AS
SELECT
  q.id              AS quote_id,
  q.provision_label AS provision_label,
  d.source_key      AS source_key,
  p.last_amended    AS section_last_amended,
  p.repealed        AS section_repealed,
  CASE
    WHEN p.id IS NULL            THEN 'UNANCHORED'
    WHEN p.repealed = 1          THEN 'REPEALED'
    WHEN p.last_amended IS NULL  THEN 'NO_SECTION_DATE'
    ELSE 'ANCHORED'
  END AS status
FROM quote q
JOIN document d ON d.id = q.document_id
LEFT JOIN provision p ON p.id = q.provision_id;
