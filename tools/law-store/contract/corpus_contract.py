r"""Typed contract for the legal/tax corpus store — the ONLY sanctioned writer.

Store: ``tools/law-store/law.db``, a build output that is never committed (schema:
``migrations/``, applied by ``new_store.py``). The app's side of it:
``docs/architecture/law-store.md``.

Callers get these typed methods, which enforce provenance and the refusals below, and
never a query they composed themselves. Authoring the SQL in here at build time is not
"raw access."

Four refusals, all raising rather than warning, because a warning on a tax citation is a
warning nobody reads:

  * a quote against a document whose currency date could not be read -- an undateable
    document cannot be shown to be current, so nothing may be built on it. The registered
    Alberta act is live proof this happens.
  * a quote against a source not in ``registry.yaml`` -- no entry, no ingestion.
  * a write with no provenance -- where a fact came from is not optional here.
  * any delete -- corpus history is the audit defence; superseding is a new row.

Documents are IMMUTABLE. There is no update method for ``document.text`` and that is the
point: an amendment inserts a new snapshot and ``quote_status`` reports the older quotes
as SUPERSEDED. Nothing is ever silently rewritten under a citation.
"""

from __future__ import annotations

import hashlib
import re
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parent.parent
DB_PATH = REPO / "law.db"
REGISTRY_PATH = REPO / "registry.yaml"

ENTITIES = ("document", "quote", "source_check", "provision", "reference")
CONFIDENCES = ("verified", "inferred", "guess")

# Which schema this contract speaks. Named rather than written twice as a literal: the
# check and its error message drifting apart is the same class of bug as ENTITIES drifting
# from the provenance CHECK, and this store has already had that one twice.
SCHEMA_VERSION = 7


class RefusalError(Exception):
    """The contract will not do this. Return it to the caller; never work around it."""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Provenance:
    """Where a row came from. Required on every write -- there is no default caller."""

    source: str
    recorded_by: str
    source_ref: str = ""
    source_captured_at: str = ""
    confidence: str = "verified"
    note: str = ""

    def validate(self) -> None:
        if not self.source or not self.recorded_by:
            raise RefusalError("provenance needs both `source` and `recorded_by`")
        if self.confidence not in CONFIDENCES:
            raise RefusalError(f"confidence must be one of {CONFIDENCES}, got {self.confidence!r}")


@dataclass(frozen=True)
class ProbeFields:
    """What a source said about itself during a freshness check.

    These four travel together everywhere -- they are exactly what a freshness probe reads.
    Passing them as one object is the seam the argument-count rule was pointing at.
    """

    currency_raw: str = ""
    currency_iso: str = ""
    etag: str = ""
    last_modified: str = ""


@dataclass(frozen=True)
class Snapshot:
    """What we know about one fetched version, apart from its text.

    These three always travel together and come from the same fetch, so they are one
    argument rather than three -- which is what the argument-count rule was pointing at.
    `source_format` records WHICH pipeline produced the row; see `latest_document` for why
    that has to be explicit rather than inferred from dates.
    """

    currency_raw: str = ""
    currency_iso: str = ""
    source_format: str = "html"


@dataclass(frozen=True)
class Receipt:
    entity: str
    row_id: int
    created: bool  # False = an identical row already existed and was reused


def load_registry(path: Path = REGISTRY_PATH) -> dict[str, dict]:
    """Registered sources. The YAML stays canonical for legal basis -- never mirrored
    into SQL, because a second copy of a licence term rots on its own schedule."""
    if not path.exists():
        raise RefusalError(f"registry missing at {path} -- no entry, no ingestion")
    loaded = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return loaded.get("sources", {}) or {}


class CorpusContract:
    """Open it, use the typed methods, close it. Every write carries provenance."""

    def __init__(self, db_path: Path = DB_PATH, registry_path: Path = REGISTRY_PATH):
        self.db_path = Path(db_path)
        self.registry_path = Path(registry_path)
        self._conn: sqlite3.Connection | None = None
        self._registry: dict[str, dict] = {}

    def __enter__(self) -> CorpusContract:
        return self.open()

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def open(self) -> CorpusContract:
        if not self.db_path.exists():
            raise RefusalError(
                f"no store at {self.db_path} -- run new_store.py first; "
                f"this contract never issues DDL"
            )
        self._conn = sqlite3.connect(self.db_path, isolation_level=None)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys=ON")  # the quote->document link is load-bearing
        version = self._conn.execute("PRAGMA user_version").fetchone()[0]
        if version != SCHEMA_VERSION:
            # Close before raising: a refusal that leaves a live handle behind makes the
            # caller's cleanup fail on Windows, which is how this was found.
            self.close()
            raise RefusalError(
                f"store is schema v{version}, this contract speaks v{SCHEMA_VERSION}"
            )
        self._assert_entities_match_schema()
        self._registry = load_registry(self.registry_path)
        return self

    def _assert_entities_match_schema(self) -> None:
        """Refuse to open if ENTITIES has drifted from the provenance CHECK constraint.

        This exists because the drift happened TWICE: 0002 added `provision` and 0005 added
        `reference`, and both times only the Python tuple was widened. Each failure was
        clean -- the CHECK fired, the transaction rolled back -- but it fired halfway
        through a batch insert with an opaque IntegrityError. Comparing the two at open()
        turns that into a startup refusal that names both sides.

        The schema is the authority here; this constant is the copy, so a mismatch is
        reported as the constant being wrong.
        """
        row = self.conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='provenance'"
        ).fetchone()
        if row is None:
            self.close()
            raise RefusalError("provenance table is missing from the store")
        match = re.search(
            r"entity\s+TEXT\s+NOT NULL\s+CHECK\s*\(\s*entity IN\s*\(([^)]*)\)",
            row["sql"],
            re.I | re.S,
        )
        if match is None:
            return  # constraint not in a shape we can read; do not block on a parse failure
        in_schema = {
            value.strip().strip("'\"") for value in match.group(1).split(",") if value.strip()
        }
        if in_schema != set(ENTITIES):
            self.close()
            raise RefusalError(
                f"ENTITIES has drifted from the schema. Store allows {sorted(in_schema)}; "
                f"this contract lists {sorted(ENTITIES)}. Add a migration widening the "
                f"provenance CHECK before using the new entity."
            )

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            raise RefusalError("contract is not open")
        return self._conn

    # --- writes ------------------------------------------------------------------

    @contextmanager
    def _transaction(self) -> Iterator[None]:
        """A row and its provenance land together or not at all.

        The store runs in autocommit, so without this an invalid Provenance raised AFTER
        the row insert and left an orphan document with no chain of custody -- found by
        the selftest's integrity check, which is the whole reason that check exists.
        """
        self.conn.execute("BEGIN")
        try:
            yield
        except Exception:
            self.conn.execute("ROLLBACK")
            raise
        self.conn.execute("COMMIT")

    def _record_provenance(self, entity: str, row_id: int, provenance: Provenance) -> None:
        provenance.validate()
        self.conn.execute(
            "INSERT INTO provenance (entity, row_id, source, source_ref, source_captured_at,"
            " recorded_by, recorded_at, confidence, note) VALUES (?,?,?,?,?,?,?,?,?)",
            (
                entity,
                row_id,
                provenance.source,
                provenance.source_ref or None,
                provenance.source_captured_at or None,
                provenance.recorded_by,
                now_iso(),
                provenance.confidence,
                provenance.note or None,
            ),
        )

    def record_document(
        self,
        source_key: str,
        url: str,
        text: str,
        *,
        snapshot: Snapshot | None = None,
        provenance: Provenance,
    ) -> Receipt:
        """Store one fetched snapshot. Re-recording identical content is a no-op.

        Idempotent on (source_key, content hash) so the nightly job is safe to re-run and
        a re-issued page with unchanged text does not become a phantom new version.
        """
        snapshot = snapshot or Snapshot()
        entry = self._registry.get(source_key)
        if entry is None:
            raise RefusalError(
                f"source {source_key!r} is not in the registry -- no entry, no ingestion"
            )
        if not text.strip():
            raise RefusalError(f"{source_key}: refusing to store an empty document")

        digest = sha256(text)
        existing = self.conn.execute(
            "SELECT id FROM document WHERE source_key=? AND content_sha256=?", (source_key, digest)
        ).fetchone()
        if existing:
            return Receipt("document", existing["id"], created=False)

        provenance.validate()  # before any INSERT -- a refusal must leave no orphan row
        stamp = now_iso()
        with self._transaction():
            cursor = self.conn.execute(
                "INSERT INTO document (source_key, url, kind, jurisdiction, currency_raw,"
                " currency_iso, text, content_sha256, byte_length, fetched_at, created_at,"
                " source_format) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    source_key,
                    url,
                    entry.get("kind", "structure"),
                    entry.get("jurisdiction", "CA"),
                    snapshot.currency_raw or None,
                    snapshot.currency_iso or None,
                    text,
                    digest,
                    len(text.encode("utf-8")),
                    stamp,
                    stamp,
                    snapshot.source_format,
                ),
            )
            row_id = int(cursor.lastrowid)
            self._record_provenance("document", row_id, provenance)
        return Receipt("document", row_id, created=True)

    def record_quote(
        self, document_id: int, provision_label: str, text: str, *, provenance: Provenance
    ) -> Receipt:
        """Bind a verified span to one document version. Refuses undateable documents."""
        document = self.conn.execute("SELECT * FROM document WHERE id=?", (document_id,)).fetchone()
        if document is None:
            raise RefusalError(f"no document {document_id}")
        if document["currency_iso"] is None:
            raise RefusalError(
                f"document {document_id} ({document['source_key']}) has no readable currency "
                f"date -- it cannot be shown to be current, so nothing may be quoted from it"
            )
        if document["source_key"] not in self._registry:
            raise RefusalError(
                f"source {document['source_key']!r} is no longer registered -- "
                f"existing documents stay as history, but new quotes are refused"
            )
        occurrences = document["text"].count(text)
        if occurrences == 0:
            raise RefusalError(
                f"{provision_label}: that text does not appear verbatim in document "
                f"{document_id} -- the citation gate would reject it"
            )

        # ANCHORED PATH (schema v2): when the document has been split into sections, the
        # label stops being decorative -- the quote must fall inside the section it names.
        # This is the real fix for the 2026-08-14 bug, where "the following rules apply"
        # was verbatim in the Act, labelled s.85(1), and matched somewhere else entirely.
        provision = self.find_provision(document_id, provision_label.lstrip("s."))
        if self.has_provisions(document_id):
            if provision is None:
                known = self.conn.execute(
                    "SELECT COUNT(*) FROM provision WHERE document_id=?", (document_id,)
                ).fetchone()[0]
                raise RefusalError(
                    f"{provision_label}: document {document_id} has {known} parsed "
                    f"provisions and none is labelled {provision_label!r}"
                )
            if provision["repealed"]:
                # A repealed section reads exactly like live law -- that is what makes it
                # the most dangerous kind of stale. Refused rather than flagged.
                raise RefusalError(
                    f"{provision_label}: that section is REPEALED "
                    f"(last amended {provision['last_amended']}). Its text still reads like "
                    f"law, which is precisely why quoting it is refused."
                )
            body = self.provision_text(provision)
            if text not in body:
                raise RefusalError(
                    f"{provision_label}: that text is in document {document_id} but NOT in "
                    f"{provision_label} ('{provision['heading']}') -- it belongs to a "
                    f"different section, which is exactly the mislabelling this check exists "
                    f"to catch"
                )
            if body.count(text) > 1:
                raise RefusalError(
                    f"{provision_label}: appears {body.count(text)} times within that "
                    f"section -- quote more of the passage until it is unique"
                )
            offset = document["text"].find(text, provision["char_start"])
            return self._insert_quote(
                document_id, provision_label, text, offset, provision["id"], provenance
            )

        # UNPARSED FALLBACK: no parser for this layout yet (Alberta today), so uniqueness
        # across the whole document is the only anchor available.
        if occurrences > 1:
            # Found 2026-08-14 on the real Income Tax Act: "the following rules apply"
            # occurs 170 times, so it verified fine while labelled s.85(1) and the match
            # was somewhere else entirely. Verbatim-and-present is NOT the same as
            # belonging to the cited provision. Until documents are split into sections,
            # uniqueness is what stands in for anchoring -- and requiring a citation to be
            # uniquely locatable is better practice regardless.
            raise RefusalError(
                f"{provision_label}: that text appears {occurrences} times in document "
                f"{document_id} -- it does not identify one provision. Quote more of the "
                f"passage until it is unique."
            )

        return self._insert_quote(
            document_id, provision_label, text, document["text"].find(text), None, provenance
        )

    def _insert_quote(
        self,
        document_id: int,
        provision_label: str,
        text: str,
        offset: int,
        provision_id: int | None,
        provenance: Provenance,
    ) -> Receipt:
        existing = self.conn.execute(
            "SELECT id FROM quote WHERE document_id=? AND provision_label=? AND text=?",
            (document_id, provision_label, text),
        ).fetchone()
        if existing:
            return Receipt("quote", existing["id"], created=False)

        provenance.validate()
        stamp = now_iso()
        with self._transaction():
            cursor = self.conn.execute(
                "INSERT INTO quote (document_id, provision_label, text, char_offset,"
                " verified_at, created_at, provision_id) VALUES (?,?,?,?,?,?,?)",
                (document_id, provision_label, text, offset, stamp, stamp, provision_id),
            )
            row_id = int(cursor.lastrowid)
            self._record_provenance("quote", row_id, provenance)
        return Receipt("quote", row_id, created=True)

    def record_provisions(
        self, document_id: int, rows: list[tuple], *, provenance: Provenance
    ) -> int:
        """Store a document's parsed sections. All or nothing; re-parsing is a no-op.

        Provisions belong to a document VERSION, so an amendment gets its own set and the
        old ones keep reading exactly as they did. Nothing here copies the text -- only
        offsets, so a provision can never drift from the document it points into.
        """
        if self.get_document(document_id) is None:
            raise RefusalError(f"no document {document_id}")
        existing = self.conn.execute(
            "SELECT COUNT(*) FROM provision WHERE document_id=?", (document_id,)
        ).fetchone()[0]
        if existing:
            return 0  # already parsed; re-running the parser changes nothing

        provenance.validate()
        stamp = now_iso()
        with self._transaction():
            for row in rows:
                # 5-tuple = the HTML parser (no dates available); 8-tuple = the XML
                # pipeline, which also carries in-force / amendment dates and repeal.
                label, heading, start, end, ordinal = row[:5]
                inforce, amended, repealed = (row[5:8] + (None, None, 0)[len(row) - 5 :])[:3]
                cursor = self.conn.execute(
                    "INSERT INTO provision (document_id, label, heading, char_start,"
                    " char_end, ordinal, created_at, inforce_start, last_amended, repealed)"
                    " VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (
                        document_id,
                        label,
                        heading or None,
                        start,
                        end,
                        ordinal,
                        stamp,
                        inforce or None,
                        amended or None,
                        int(repealed or 0),
                    ),
                )
                self._record_provenance("provision", int(cursor.lastrowid), provenance)
        return len(rows)

    def reparse_provisions(
        self, document_id: int, rows: list[tuple], *, provenance: Provenance
    ) -> dict[str, int]:
        """Re-derive provision metadata for a document after the parser improves.

        Provisions are DERIVED data -- offsets and flags computed from `document.text`,
        which itself never changes. So unlike a document or a quote, a provision can be
        legitimately recomputed, and it has to be: the repeal rule was wrong twice before it
        was right, and without this the wrong flags stay in the store forever. The
        `record_provisions` no-op that makes re-running safe is exactly what blocks a fix.

        UPDATE in place, keyed by label -- never delete-and-reinsert. Quotes carry
        `provision_id`, and deleting would either break that link or silently orphan a
        citation. The provision is the same provision; we merely read it correctly now.
        """
        if self.get_document(document_id) is None:
            raise RefusalError(f"no document {document_id}")
        provenance.validate()
        changed = updated = inserted = 0
        stamp = now_iso()
        with self._transaction():
            for row in rows:
                label, heading, start, end, ordinal = row[:5]
                inforce, amended, repealed = (row[5:8] + (None, None, 0)[len(row) - 5 :])[:3]
                existing = self.conn.execute(
                    "SELECT id, repealed, last_amended FROM provision"
                    " WHERE document_id=? AND label=?",
                    (document_id, label),
                ).fetchone()
                if existing is None:
                    cursor = self.conn.execute(
                        "INSERT INTO provision (document_id, label, heading, char_start,"
                        " char_end, ordinal, created_at, inforce_start, last_amended,"
                        " repealed) VALUES (?,?,?,?,?,?,?,?,?,?)",
                        (
                            document_id,
                            label,
                            heading or None,
                            start,
                            end,
                            ordinal,
                            stamp,
                            inforce or None,
                            amended or None,
                            int(repealed or 0),
                        ),
                    )
                    self._record_provenance("provision", int(cursor.lastrowid), provenance)
                    inserted += 1
                    continue
                if existing["repealed"] != int(repealed or 0):
                    changed += 1
                self.conn.execute(
                    "UPDATE provision SET heading=?, char_start=?, char_end=?, ordinal=?,"
                    " inforce_start=?, last_amended=?, repealed=? WHERE id=?",
                    (
                        heading or None,
                        start,
                        end,
                        ordinal,
                        inforce or None,
                        amended or None,
                        int(repealed or 0),
                        existing["id"],
                    ),
                )
                updated += 1
        return {"updated": updated, "inserted": inserted, "repeal_flag_changed": changed}

    def record_references(
        self, document_id: int, rows: list[tuple], *, provenance: Provenance
    ) -> int:
        """Store the pointers a document's provisions make. Derived; re-derivable.

        Cleared and rebuilt for the document rather than merged: references are computed
        from immutable `document.text`, so a re-run with a better extractor should REPLACE
        what the older one found. Nothing references a `reference` row, so unlike
        provisions there is no foreign key to preserve -- which is why this one may clear
        where `reparse_provisions` had to update in place.
        """
        if self.get_document(document_id) is None:
            raise RefusalError(f"no document {document_id}")
        provenance.validate()
        stamp = now_iso()
        with self._transaction():
            self.conn.execute("DELETE FROM reference WHERE document_id=?", (document_id,))
            for from_id, doc_id, label, detail, kind, raw, offset in rows:
                self.conn.execute(
                    "INSERT OR IGNORE INTO reference (from_provision_id, document_id,"
                    " target_label, target_detail, kind, raw, char_offset, created_at)"
                    " VALUES (?,?,?,?,?,?,?,?)",
                    (from_id, doc_id, label, detail or None, kind, raw, offset, stamp),
                )
            count = self.conn.execute(
                "SELECT COUNT(*) FROM reference WHERE document_id=?", (document_id,)
            ).fetchone()[0]
            self._record_provenance("reference", document_id, provenance)
        return count

    def blocking_references(self, provision_id: int) -> list[sqlite3.Row]:
        """The qualifiers on a provision that can flip an answer.

        `subject_to` / `notwithstanding` / `defined_in` only -- a plain pointer is worth
        following but changes nothing, and mixing them would bury the ones that matter.
        """
        return list(
            self.conn.execute(
                "SELECT * FROM blocking_reference WHERE from_provision_id=?"
                " ORDER BY kind, target_label",
                (provision_id,),
            )
        )

    def find_provision(self, document_id: int, label: str) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT * FROM provision WHERE document_id=? AND label=?", (document_id, label)
        ).fetchone()

    def provision_text(self, provision: sqlite3.Row) -> str:
        document = self.get_document(provision["document_id"])
        return document["text"][provision["char_start"] : provision["char_end"]]

    def has_provisions(self, document_id: int) -> bool:
        return bool(
            self.conn.execute(
                "SELECT 1 FROM provision WHERE document_id=? LIMIT 1", (document_id,)
            ).fetchone()
        )

    def record_check(
        self,
        source_key: str,
        url: str,
        status: str,
        *,
        probe: ProbeFields | None = None,
        detail: str = "",
    ) -> Receipt:
        """One freshness probe. History, not last-known-state: 'when did this start
        failing?' is a real question a single overwritten row cannot answer."""
        probe = probe or ProbeFields()
        cursor = self.conn.execute(
            "INSERT INTO source_check (source_key, url, status, currency_raw, currency_iso,"
            " etag, last_modified, detail, checked_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (
                source_key,
                url,
                status,
                probe.currency_raw or None,
                probe.currency_iso or None,
                probe.etag or None,
                probe.last_modified or None,
                detail or None,
                now_iso(),
            ),
        )
        return Receipt("source_check", int(cursor.lastrowid), created=True)

    def delete(self, *_args: object, **_kwargs: object) -> None:
        raise RefusalError(
            "the corpus does not delete -- version history IS the audit defence. "
            "An amendment is a new document; a bad row is annotated, not removed."
        )

    # --- reads -------------------------------------------------------------------

    def get_document(self, document_id: int) -> sqlite3.Row | None:
        return self.conn.execute("SELECT * FROM document WHERE id=?", (document_id,)).fetchone()

    def preferred_format(self, source_key: str) -> str:
        """Which pipeline is authoritative for this source. The registry decides."""
        entry = self._registry.get(source_key) or {}
        return "xml" if entry.get("xml_path") else "html"

    def latest_document(self, source_key: str) -> sqlite3.Row | None:
        """Newest DATEABLE snapshot from this source's AUTHORITATIVE pipeline.

        Filtering by format BEFORE comparing dates is load-bearing, and it was found the
        hard way (2026-08-19): the two pipelines report different KINDS of date. The HTML
        pages carry the site-wide consolidation date -- 2026-06-17 on every Act at once --
        while the XML carries a per-Act `current-date`. Ordering them together by date kept
        selecting the HTML row, so the whole switch to XML was silently inert and the gates
        went on reading scraped text.

        Undateable documents are never 'latest', at any format.
        """
        row = self.conn.execute(
            "SELECT * FROM document WHERE source_key=? AND currency_iso IS NOT NULL"
            " AND source_format=? ORDER BY currency_iso DESC, id DESC LIMIT 1",
            (source_key, self.preferred_format(source_key)),
        ).fetchone()
        if row is not None:
            return row
        # Preferred pipeline has not run for this source yet: fall back rather than go
        # blind. The caller can read `source_format` and tell which it got.
        return self.conn.execute(
            "SELECT * FROM document WHERE source_key=? AND currency_iso IS NOT NULL"
            " ORDER BY currency_iso DESC, id DESC LIMIT 1",
            (source_key,),
        ).fetchone()

    def document_as_of(self, source_key: str, when: str) -> sqlite3.Row | None:
        """What this source said on a given date -- the point-in-time audit answer.

        Pipeline-scoped for the same reason `latest_document` is, and missed when that one
        was fixed on 2026-08-19: the HTML site-wide date and the XML per-Act date are
        different measurements, so ordering them together answers the wrong question.
        Measured on the live store 2026-08-24, this returned the superseded HTML scrape for
        BOTH the Income Tax Act and the CBCA -- on the one query whose whole job is to be
        the audit defence.

        Same fallback as `latest_document`: if the authoritative pipeline has not run for
        this source, answer from what there is rather than go blind, and let the caller
        read `source_format` to see which it got.
        """
        row = self.conn.execute(
            "SELECT * FROM document WHERE source_key=? AND currency_iso IS NOT NULL"
            " AND source_format=? AND currency_iso <= ?"
            " ORDER BY currency_iso DESC, id DESC LIMIT 1",
            (source_key, self.preferred_format(source_key), when),
        ).fetchone()
        if row is not None:
            return row
        return self.conn.execute(
            "SELECT * FROM document WHERE source_key=? AND currency_iso IS NOT NULL"
            " AND currency_iso <= ? ORDER BY currency_iso DESC, id DESC LIMIT 1",
            (source_key, when),
        ).fetchone()

    def sources_for_gates(self) -> dict[str, str]:
        """`{source_key: text}` for the answer gates.

        Built FROM `latest_document` rather than its own SQL, so the gates can never check
        different text from the one the contract calls current. Two queries answering
        "which is latest" is two chances to disagree, and this one already disagreed once.
        """
        keys = [
            row["source_key"]
            for row in self.conn.execute(
                "SELECT DISTINCT source_key FROM document WHERE currency_iso IS NOT NULL"
            )
        ]
        latest = {key: self.latest_document(key) for key in keys}
        return {key: row["text"] for key, row in latest.items() if row is not None}

    def quote_precision(self) -> list[sqlite3.Row]:
        """Section-level staleness: did the SECTION I quoted move, not just the Act."""
        return list(self.conn.execute("SELECT * FROM quote_precision ORDER BY quote_id"))

    def quote_status(self) -> list[dict]:
        """Is this citation still good? The sanctioned answer -- read this, not the view.

        The `quote_status` VIEW answers the half SQL can answer honestly: did this quote's
        OWN pipeline publish something newer. It cannot answer the other half, because
        "which pipeline do we cite from" is the registry's call and mirroring that into a
        column would be a second copy that drifts -- this store has had that failure twice.

        So the remaining rule is applied here, against `latest_document()` -- the same
        single answer `sources_for_gates()` is built from, so the gates and the staleness
        flag can never disagree about which document is current. A quote is CURRENT only if
        it is anchored to the document the contract would cite today.

        Found 2026-08-24: with only the view's half, a quote from the authoritative XML
        read SUPERSEDED while one from the superseded HTML scrape read CURRENT -- backwards
        in both directions at once.

        `why` is the plain-English reason, because a status nobody can act on is a status
        nobody reads.
        """
        newest: dict[str, int | None] = {}
        rows = []
        for row in self.conn.execute("SELECT * FROM quote_status"):
            record = dict(row)
            key = record["source_key"]
            if key not in newest:
                current = self.latest_document(key)
                newest[key] = current["id"] if current is not None else None
            if record["status"] == "UNVERIFIABLE":
                record["why"] = "this document has no readable currency date"
            elif record["status"] == "SUPERSEDED":
                record["why"] = (
                    f"a newer {record['source_format']} version of this source exists "
                    f"({record['latest_currency']} vs {record['quoted_currency']})"
                )
            elif newest[key] is not None and record["document_id"] != newest[key]:
                record["status"] = "SUPERSEDED"
                record["why"] = (
                    f"quoted from the {record['source_format']} pipeline, which the "
                    f"registry no longer treats as authoritative for {key}"
                )
            else:
                record["why"] = ""
            rows.append(record)
        return sorted(rows, key=lambda r: (r["status"], r["quote_id"]))

    def provenance_for(self, entity: str, row_id: int) -> list[sqlite3.Row]:
        if entity not in ENTITIES:
            raise RefusalError(f"entity must be one of {ENTITIES}")
        return list(
            self.conn.execute(
                "SELECT * FROM provenance WHERE entity=? AND row_id=? ORDER BY id", (entity, row_id)
            )
        )

    def row_counts(self) -> dict[str, int]:
        return {
            t: self.conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            for t in (*ENTITIES, "provenance")
        }

    def verify_integrity(self) -> dict[str, list[str]]:
        """Content-hash every document and confirm every row has provenance.

        The hash check is what makes editing the DB behind this contract's back visible:
        text that no longer matches its recorded digest was changed by something that did
        not go through here.
        """
        problems: dict[str, list[str]] = {"hash_mismatch": [], "missing_provenance": []}
        for row in self.conn.execute("SELECT id, source_key, text, content_sha256 FROM document"):
            if sha256(row["text"]) != row["content_sha256"]:
                problems["hash_mismatch"].append(f"document {row['id']} ({row['source_key']})")
        for entity in ("document", "quote"):
            for row in self.conn.execute(
                f"SELECT id FROM {entity} WHERE id NOT IN"
                f" (SELECT row_id FROM provenance WHERE entity=?)",
                (entity,),
            ):
                problems["missing_provenance"].append(f"{entity} {row['id']}")
        return problems
