r"""Offline selftest for the corpus contract. No network, temp DB, no side effects.

Run: ``python tools/law-store/contract/selftest.py``

Every refusal in the contract gets a case that PROVES it fires, and the happy path gets a
case that proves it does not fire for the wrong reason. A gate with no failing test is a
gate nobody has shown works -- the answer gates' truncation gate shipped green against a
test case that was itself wrong, which is why this file exists in this shape.

The three ``quote_status`` states are checked against real rows rather than asserted,
because that view is the mechanism that keeps an amendment from silently invalidating a
citation, and a view that silently returns the wrong string would look identical.
"""

from __future__ import annotations

import sqlite3
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from corpus_contract import (
    CorpusContract,
    ProbeFields,
    Provenance,
    RefusalError,
    Snapshot,
)
from ingest_xml import parse_act

MIGRATIONS = Path(__file__).resolve().parent.parent / "migrations"

REGISTRY_YAML = """sources:
  ita:
    key: ita
    name: Income Tax Act
    kind: structure
    jurisdiction: CA
    urls:
      - https://laws-lois.justice.gc.ca/eng/acts/i-3.3/
    xml_path: eng/acts/I-3.3.xml
  undateable:
    key: undateable
    name: A source whose currency line we cannot read
    kind: structure
    jurisdiction: CA-AB
    urls:
      - https://example.invalid/act
"""

TEXT_V1 = "85 (1) Where a taxpayer has disposed of eligible property, the following rules apply."
TEXT_V2 = "85 (1) Where a taxpayer has disposed of eligible property, other rules now apply."

PROV = Provenance(
    source="ita",
    recorded_by="selftest",
    source_ref="https://example/ita",
    source_captured_at="2026-06-17",
    confidence="verified",
)


def _build_store(tmp: Path) -> tuple[Path, Path]:
    """A v1 store built from the REAL migration file, so the test cannot drift from it."""
    db = tmp / "corpus.db"
    conn = sqlite3.connect(db)
    files = sorted(MIGRATIONS.glob("[0-9][0-9][0-9][0-9]_*.sql"))
    for path in files:
        conn.executescript(path.read_text(encoding="utf-8"))
    conn.execute(f"PRAGMA user_version={len(files)}")
    conn.commit()
    conn.close()
    registry = tmp / "registry.yaml"
    registry.write_text(REGISTRY_YAML, encoding="utf-8")
    return db, registry


def _expect_refusal(name: str, fn) -> bool:
    try:
        fn()
    except RefusalError as exc:
        print(f"  ok  {name}: refused -- {str(exc)[:72]}")
        return True
    print(f"FAIL  {name}: was ALLOWED and should not have been")
    return False


def _check(name: str, condition: bool, detail: str = "") -> bool:
    print(f"{'  ok  ' if condition else 'FAIL  '}{name}{': ' + detail if detail else ''}")
    return condition


def _check_provision_anchoring(corpus, document_id: int) -> list[bool]:
    """The label becomes checkable, or it is decoration.

    Split out of run() when the statement-count rule fired -- these checks are one idea
    (a quote must live inside the section it names) and read better as their own unit.
    """
    passed: list[bool] = []
    # --- provision anchoring: the label becomes checkable -----------------
    # Without this the label is decorative. The 2026-08-14 bug was a quote
    # labelled s.85(1) that was verbatim in the Act and matched elsewhere.
    corpus.record_provisions(document_id, [("85", "Rollover", 0, len(TEXT_V1), 0)], provenance=PROV)
    passed.append(_check("provisions stored", corpus.has_provisions(document_id)))
    passed.append(
        _check(
            "re-parsing is a no-op", corpus.record_provisions(document_id, [], provenance=PROV) == 0
        )
    )
    passed.append(
        _expect_refusal(
            "quote against a label that does not exist",
            lambda: corpus.record_quote(document_id, "9999", "eligible property", provenance=PROV),
        )
    )
    anchored = corpus.record_quote(document_id, "85", "eligible property", provenance=PROV)
    got = corpus.conn.execute(
        "SELECT provision_id FROM quote WHERE id=?", (anchored.row_id,)
    ).fetchone()[0]
    passed.append(_check("anchored quote carries its provision_id", got is not None))
    return passed


def _check_pipeline_preference(corpus, scraped_quote_id: int) -> list[bool]:
    """The registry decides which pipeline is authoritative -- never the date.

    Regression guard for 2026-08-19: HTML rows carry the SITE-WIDE consolidation date
    (one date across every Act at once) and XML rows a per-Act date, so ordering both by
    date kept selecting HTML and the switch to the official XML was silently inert.

    Extended 2026-08-25 (audit F1). That fix reached `latest_document` and stopped there.
    The `quote_status` view and `document_as_of` went on comparing the two date kinds, and
    on the live store the result read backwards in BOTH directions at once: the quote
    anchored to the authoritative XML said SUPERSEDED, and the one from the superseded
    scrape said CURRENT. The trap is reproduced below on purpose -- the XML row here
    carries the OLDER date and is still the row we would cite today.
    """
    passed: list[bool] = []
    xml_doc = corpus.record_document(
        "ita",
        "https://example/ita.xml",
        TEXT_V1 + " XML edition",
        snapshot=Snapshot(
            currency_raw="2026-01-01", currency_iso="2026-01-01", source_format="xml"
        ),
        provenance=PROV,
    )
    chosen = corpus.latest_document("ita")
    passed.append(
        _check(
            "XML wins even with an OLDER date, because the registry prefers it",
            chosen["id"] == xml_doc.row_id and chosen["source_format"] == "xml",
            f"got doc={chosen['id']} format={chosen['source_format']}",
        )
    )
    passed.append(
        _check(
            "sources_for_gates agrees with latest_document",
            corpus.sources_for_gates().get("ita") == chosen["text"],
        )
    )
    xml_quote = corpus.record_quote(
        xml_doc.row_id, "s.85(1)", "the following rules apply", provenance=PROV
    )
    status = {row["quote_id"]: row for row in corpus.quote_status()}
    passed.append(
        _check(
            "quote on the authoritative pipeline is CURRENT despite its older date",
            status[xml_quote.row_id]["status"] == "CURRENT",
            f"got {status[xml_quote.row_id]['status']}",
        )
    )
    passed.append(
        _check(
            "quote on the pipeline we no longer prefer is SUPERSEDED, and says why",
            status[scraped_quote_id]["status"] == "SUPERSEDED"
            and "authoritative" in status[scraped_quote_id]["why"],
            f"got {status[scraped_quote_id]['status']}",
        )
    )
    passed.append(
        _check(
            "point-in-time answer agrees with latest_document, not with the newest date",
            corpus.document_as_of("ita", "2026-12-31")["id"] == chosen["id"],
        )
    )
    return passed


SCHEDULE_XML = (
    '<Regulation xmlns:lims="http://justice.gc.ca/lims" lims:current-date="2026-03-31">'
    "<Body>"
    '<Section lims:inforce-start-date="2017-01-01"><Label>1</Label>'
    "<MarginalNote>Short title</MarginalNote><Text>Body section one.</Text></Section>"
    "</Body>"
    "<Schedule><ScheduleFormHeading><Label>SCHEDULE II</Label>"
    "<TitleText>Capital Cost Allowances</TitleText></ScheduleFormHeading>"
    "<Heading>CLASS 8(20 per cent)</Heading>"
    '<Provision lims:inforce-start-date="2018-06-21"><Text>Machinery.</Text></Provision>'
    "<Heading>CLASS 50</Heading>"
    '<Provision lims:inforce-start-date="2018-06-21">'
    "<Text>Data processing equipment.</Text></Provision>"
    "</Schedule>"
    "<Schedule><ScheduleFormHeading><Label>SCHEDULE III</Label></ScheduleFormHeading>"
    "<Section><Label>1</Label><Text>Schedule three item one.</Text></Section>"
    "</Schedule>"
    "</Regulation>"
)


def _check_schedule_parsing() -> list[bool]:
    """The CBCA trap (schedule item 1 read as body s.1) must stay closed while Schedule II
    classes become citable. Both halves are asserted, and the offsets must index the stored
    text exactly -- the property every verbatim gate depends on."""
    parsed = parse_act(SCHEDULE_XML.encode("utf-8"))
    labels = [row[0] for row in parsed.provisions]
    by_label = {row[0]: row for row in parsed.provisions}
    out = [
        _check("body section keeps its bare label", "1" in labels),
        _check(
            "schedule section is namespaced, never a bare label",
            "Sch. III s.1" in labels and labels.count("1") == 1,
        ),
        _check("Schedule II classes are indexed by class", "Sch. II Class 50" in labels
               and "Sch. II Class 8" in labels),
        _check(
            "class heading keeps the rate as TEXT",
            by_label.get("Sch. II Class 8", ("", ""))[1] == "CLASS 8(20 per cent)",
        ),
        _check(
            "class provision carries its own in-force date",
            by_label.get("Sch. II Class 50", ("",) * 6)[5] == "2018-06-21",
        ),
    ]
    row = by_label.get("Sch. II Class 50")
    out.append(
        _check(
            "offsets index exactly the stored text",
            row is not None and parsed.text[row[2] : row[3]] == "Data processing equipment.",
        )
    )
    return out


def run() -> int:
    passed: list[bool] = []
    with tempfile.TemporaryDirectory() as raw_tmp:
        tmp = Path(raw_tmp)
        db, registry = _build_store(tmp)

        with CorpusContract(db, registry) as corpus:
            # --- happy path -------------------------------------------------------
            first = corpus.record_document(
                "ita",
                "https://example/ita",
                TEXT_V1,
                snapshot=Snapshot(currency_raw="2026-06-17", currency_iso="2026-06-17"),
                provenance=PROV,
            )
            passed.append(_check("document stored", first.created, f"id={first.row_id}"))

            again = corpus.record_document(
                "ita",
                "https://example/ita",
                TEXT_V1,
                snapshot=Snapshot(currency_raw="2026-06-17", currency_iso="2026-06-17"),
                provenance=PROV,
            )
            passed.append(
                _check(
                    "re-storing identical content is a no-op",
                    not again.created and again.row_id == first.row_id,
                )
            )

            quote = corpus.record_quote(
                first.row_id, "s.85(1)", "the following rules apply", provenance=PROV
            )
            passed.append(_check("quote bound to that version", quote.created))

            prov_rows = corpus.provenance_for("document", first.row_id)
            passed.append(
                _check(
                    "provenance recorded",
                    len(prov_rows) == 1 and prov_rows[0]["source_ref"] == "https://example/ita",
                )
            )

            # --- refusals ---------------------------------------------------------
            passed.append(
                _expect_refusal(
                    "unregistered source",
                    lambda: corpus.record_document("not-registered", "u", "x", provenance=PROV),
                )
            )
            passed.append(
                _expect_refusal(
                    "empty document",
                    lambda: corpus.record_document("ita", "u", "   ", provenance=PROV),
                )
            )
            passed.append(
                _expect_refusal(
                    "quote text not verbatim in the document",
                    lambda: corpus.record_quote(
                        first.row_id, "s.85(1)", "words never printed", provenance=PROV
                    ),
                )
            )
            passed.append(
                _expect_refusal(
                    "provenance with no recorded_by",
                    lambda: corpus.record_document(
                        "ita", "u", "some text", provenance=Provenance(source="x", recorded_by="")
                    ),
                )
            )
            passed.append(
                _expect_refusal(
                    "bad confidence value",
                    lambda: corpus.record_document(
                        "ita",
                        "u",
                        "other text",
                        provenance=Provenance(source="x", recorded_by="y", confidence="probably"),
                    ),
                )
            )
            passed.append(_expect_refusal("delete", corpus.delete))

            # An undateable document may be STORED (the failed attempt is worth recording)
            # but may never be quoted. This is the live Alberta case.
            undateable = corpus.record_document(
                "undateable",
                "https://example.invalid/act",
                "Some text with no date line.",
                provenance=Provenance(
                    source="undateable",
                    recorded_by="selftest",
                    confidence="guess",
                    note="UNVERIFIED: no currency line",
                ),
            )
            passed.append(_check("undateable document is stored", undateable.created))
            passed.append(
                _expect_refusal(
                    "quote against an undateable document",
                    lambda: corpus.record_quote(
                        undateable.row_id, "s.1", "Some text", provenance=PROV
                    ),
                )
            )

            # --- amendment: the whole reason this schema exists --------------------
            second = corpus.record_document(
                "ita",
                "https://example/ita",
                TEXT_V2,
                snapshot=Snapshot(currency_raw="2026-09-01", currency_iso="2026-09-01"),
                provenance=PROV,
            )
            passed.append(
                _check(
                    "amendment creates a NEW version, old one kept",
                    second.created and second.row_id != first.row_id,
                )
            )

            newer_quote = corpus.record_quote(
                second.row_id, "s.85(1)", "other rules now apply", provenance=PROV
            )
            undateable_quote_blocked = True  # proven above

            statuses = {row["quote_id"]: row["status"] for row in corpus.quote_status()}
            passed.append(
                _check(
                    "old quote flips to SUPERSEDED",
                    statuses.get(quote.row_id) == "SUPERSEDED",
                    f"got {statuses.get(quote.row_id)}",
                )
            )
            passed.append(
                _check(
                    "new quote is CURRENT",
                    statuses.get(newer_quote.row_id) == "CURRENT",
                    f"got {statuses.get(newer_quote.row_id)}",
                )
            )
            passed.append(_check("undateable text was never quotable", undateable_quote_blocked))

            passed.extend(_check_provision_anchoring(corpus, first.row_id))

            # --- point-in-time: the audit-defence payoff ---------------------------
            march = corpus.document_as_of("ita", "2026-07-01")
            passed.append(
                _check(
                    "point-in-time query returns the version in force then",
                    march is not None and march["id"] == first.row_id,
                )
            )
            latest = corpus.latest_document("ita")
            passed.append(
                _check(
                    "latest is the amended version",
                    latest is not None and latest["id"] == second.row_id,
                )
            )

            # --- feeding the answer gates -----------------------------------------
            gate_input = corpus.sources_for_gates()
            passed.append(
                _check(
                    "gate input carries only the newest of each source",
                    gate_input.get("ita") == TEXT_V2,
                )
            )
            passed.append(
                _check(
                    "undateable source is withheld from the gates", "undateable" not in gate_input
                )
            )

            # --- freshness history --------------------------------------------------
            corpus.record_check(
                "ita",
                "https://example/ita",
                "UNCHANGED",
                probe=ProbeFields(currency_raw="2026-06-17", currency_iso="2026-06-17"),
                detail="currency unchanged",
            )
            corpus.record_check("ita", "https://example/ita", "UNREACHABLE", detail="HTTP 503")
            checks = list(
                corpus.conn.execute(
                    "SELECT status FROM source_check WHERE source_key='ita' ORDER BY id"
                )
            )
            passed.append(
                _check(
                    "freshness history keeps every probe, not just the last",
                    [r["status"] for r in checks] == ["UNCHANGED", "UNREACHABLE"],
                )
            )

            # Runs LAST on purpose: it changes which document is 'latest' for ita,
            # so anything asserting on latest_document must already have run.
            passed.extend(_check_pipeline_preference(corpus, newer_quote.row_id))

            # --- integrity -----------------------------------------------------------
            problems = corpus.verify_integrity()
            passed.append(
                _check(
                    "integrity clean on a well-formed store",
                    not problems["hash_mismatch"] and not problems["missing_provenance"],
                )
            )

            corpus.conn.execute("UPDATE document SET text='tampered' WHERE id=?", (first.row_id,))
            tampered = corpus.verify_integrity()
            passed.append(
                _check(
                    "tampering with document text is detected", len(tampered["hash_mismatch"]) == 1
                )
            )
            corpus.conn.execute("UPDATE document SET text=? WHERE id=?", (TEXT_V1, first.row_id))

        # --- XML parser: schedules in their own label namespace (S2.5.2g) -------------
        passed.extend(_check_schedule_parsing())

        # --- schema-version guard -------------------------------------------------
        conn = sqlite3.connect(db)
        conn.execute("PRAGMA user_version=99")
        conn.commit()
        conn.close()
        passed.append(
            _expect_refusal(
                "opening a store whose schema this contract does not speak",
                lambda: CorpusContract(db, registry).open(),
            )
        )

    failures = passed.count(False)
    print(f"\n{'ALL PASS' if not failures else str(failures) + ' FAILURES'} ({len(passed)} checks)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run())
