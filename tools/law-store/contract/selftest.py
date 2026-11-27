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
from ingest_xml import drop_duplicate_labels, parse_act

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


# Invented XML in the official file's shape, for the two section-reading rules. Every word
# is made up; only the element names and nesting follow the real files. No whitespace sits
# between elements (except case 15), so a section's flattened text is its pieces joined end
# to end and the expected strings further down can be written out by hand.
REPEAL_XML = (
    '<Statute xmlns:lims="http://justice.gc.ca/lims" lims:current-date="2026-03-31">'
    "<Body>"
    # 10: a notice and a historical note -> repealed
    "<Section><Label>10</Label><MarginalNote>Old rule</MarginalNote>"
    "<Text><Repealed>[Repealed, 2020, c. 1, s. 2]</Repealed></Text>"
    "<HistoricalNote><HistoricalNoteSubItem>2020, c. 1, s. 2</HistoricalNoteSubItem>"
    "</HistoricalNote></Section>"
    # 11: a notice and nothing else -> repealed
    "<Section><Label>11</Label><Text><Repealed>[Repealed, 2020, c. 1, s. 3]</Repealed></Text>"
    "</Section>"
    # 12: paragraphs, one of them repealed -> live section
    "<Section><Label>12</Label><MarginalNote>Mixed</MarginalNote><Text>Lead-in words:</Text>"
    "<Paragraph><Label>(a)</Label><Text>Live paragraph words.</Text></Paragraph>"
    "<Paragraph><Label>(b)</Label><Text><Repealed>[Repealed, 2019, c. 3, s. 4]</Repealed></Text>"
    "</Paragraph></Section>"
    # 13: subsections, one of them repealed -> live section
    "<Section><Label>13</Label>"
    "<Subsection><Label>(1)</Label><Text>Live subsection words.</Text></Subsection>"
    "<Subsection><Label>(2)</Label><Text><Repealed>[Repealed, 2019, c. 3, s. 5]</Repealed></Text>"
    "</Subsection></Section>"
    # 14: one Text holding a mark AND live words -> live section
    "<Section><Label>14</Label>"
    "<Text><Repealed>[Repealed, 2018, c. 5, s. 6]</Repealed> Other live words here.</Text>"
    "</Section>"
    # 15: a notice broken over lines and padded with blanks -> still repealed
    "<Section><Label>15</Label><Text>\n  <Repealed>[Repealed,\n   2017, c. 7, s. 8]</Repealed>\n"
    "</Text></Section>"
    # 16: a Definition child next to a bare notice -> never flagged as a whole
    "<Section><Label>16</Label><Text><Repealed>[Repealed, 2016, c. 9, s. 1]</Repealed></Text>"
    "<Definition><Text>invented term means something.</Text></Definition></Section>"
    # 17: no Text at all, only a mark in the marginal note -> not flagged
    "<Section><Label>17</Label><MarginalNote><Repealed>[Repealed]</Repealed></MarginalNote>"
    "</Section>"
    "</Body>"
    "<Schedule><ScheduleFormHeading><Label>SCHEDULE II</Label></ScheduleFormHeading>"
    # a class with children, one of them repealed -> live class
    "<Heading>CLASS 7</Heading>"
    "<Provision><Text>Invented class words.</Text><Paragraph><Label>(a)</Label>"
    "<Text><Repealed>[Repealed, 2015, c. 2, s. 2]</Repealed></Text></Paragraph></Provision>"
    # a notice-only class -> repealed
    "<Heading>CLASS 9</Heading>"
    "<Provision><Text><Repealed>[Repealed, 2017, c. 7, s. 8]</Repealed></Text></Provision>"
    "</Schedule>"
    "</Statute>"
)


def _check_repeal_flag() -> list[bool]:
    """A section is repealed only when its whole content is the notice (Rule 1).

    The fault, found on the official Income Tax Act and Regulations files: a section with
    no Subsection and a Repealed mark ANYWHERE inside was flagged whole, so sections made of
    paragraphs or definitions, with one repealed paragraph, were refused as quotes. Each
    case here is one shape from those files, in invented words.
    """
    parsed = parse_act(REPEAL_XML.encode("utf-8"))
    flagged = {row[0]: bool(row[7]) for row in parsed.provisions}
    return [
        _check("notice with a historical note is flagged", flagged["10"]),
        _check("notice with nothing else is flagged", flagged["11"]),
        _check("section of paragraphs, one repealed, is not flagged", not flagged["12"]),
        _check("section of subsections, one repealed, is not flagged", not flagged["13"]),
        _check("Text with a mark and live words is not flagged", not flagged["14"]),
        _check("notice split over lines is still flagged (whitespace ignored)", flagged["15"]),
        _check("section with a Definition is not flagged", not flagged["16"]),
        _check("mark only in the marginal note is not flagged", not flagged["17"]),
        _check("Schedule II class with children is not flagged", not flagged["Sch. II Class 7"]),
        _check("notice-only Schedule II class is flagged", flagged["Sch. II Class 9"]),
    ]


# Sections 2 and 3 each quote a whole section inside an amending provision (under
# ReadAsText), as the real files do. The first quoted label matches no real section; the
# second repeats the label of real section 1. The Schedule item quotes one too.
NESTED_XML = (
    '<Statute xmlns:lims="http://justice.gc.ca/lims" lims:current-date="2026-03-31">'
    "<Body>"
    "<Section><Label>1</Label><MarginalNote>First</MarginalNote><Text>Outer one.</Text></Section>"
    "<Section><Label>2</Label><Text>Amending lead-in.</Text>"
    "<Subsection><Label>(1)</Label><Text>Replace it with:</Text>"
    "<ReadAsText><Section><Label>“88</Label><Text>Quoted words.</Text></Section></ReadAsText>"
    "</Subsection></Section>"
    "<Section><Label>3</Label><Text>Outer three.</Text>"
    "<Subsection><Label>(1)</Label>"
    "<ReadAsText><Section><Label>1</Label><Text>Repeated label words.</Text></Section>"
    "</ReadAsText></Subsection></Section>"
    "<Section><Label>4</Label><Text>Outer four.</Text></Section>"
    "</Body>"
    "<Schedule><ScheduleFormHeading><Label>SCHEDULE I</Label></ScheduleFormHeading>"
    "<Section><Label>1</Label><Text>Item one.</Text><Subsection><Label>(1)</Label>"
    "<ReadAsText><Section><Label>7</Label><Text>Quoted item words.</Text></Section>"
    "</ReadAsText></Subsection></Section>"
    "</Schedule>"
    "</Statute>"
)

# The text block by block, in the order the walk meets the sections; label None = a quoted
# section, which is a block of its own straight after the section holding it. That is where
# its words have always been, and the stored text, its hash and every offset depend on it
# staying there.
NESTED_BLOCKS = [
    ("1", "1FirstOuter one."),
    ("2", "2Amending lead-in.(1)Replace it with:“88Quoted words."),
    (None, "“88Quoted words."),
    ("3", "3Outer three.(1)1Repeated label words."),
    (None, "1Repeated label words."),
    ("4", "4Outer four."),
    ("Sch. I s.1", "1Item one.(1)7Quoted item words."),
    (None, "7Quoted item words."),
]


def _check_nested_sections() -> list[bool]:
    """A Section quoted inside another section is not a section of the Act (Rule 2).

    The official files quote whole sections inside amending provisions. Walking every
    Section element indexed those as sections: one became a row labelled with a stray quote
    mark, another repeated a real label (and was only dropped by the duplicate-label rule).
    The expected text and offsets are built here from the invented strings above, not by
    calling the walk under test.
    """
    parsed = parse_act(NESTED_XML.encode("utf-8"))
    expected_text = "".join(block + "\n\n" for _, block in NESTED_BLOCKS)
    expected_rows: dict[str, tuple[int, int]] = {}
    block_of: dict[str, str] = {}
    cursor = 0
    for label, block in NESTED_BLOCKS:
        if label is not None:
            expected_rows[label] = (cursor, cursor + len(block))
            block_of[label] = block
        cursor += len(block) + 2
    labels = [row[0] for row in parsed.provisions]
    kept, dropped = drop_duplicate_labels(parsed.provisions)
    got_rows = {row[0]: (row[2], row[3]) for row in parsed.provisions}
    return [
        _check(
            "quoted sections get no row; the rows are exactly the real sections",
            labels == list(expected_rows),
            f"got {labels}",
        ),
        _check("no row for the quoted section with a stray label", "“88" not in labels),
        _check(
            "a quoted section repeating a real label leaves no duplicate to drop",
            dropped == [] and len(kept) == len(parsed.provisions),
            f"dropped {dropped}",
        ),
        _check(
            "quoted blocks are still blocks of their own in the document text",
            # Not just a substring: the enclosing section's block repeats these words, so
            # only the blank lines either side prove the standalone block was kept.
            "\n\n“88Quoted words.\n\n" in parsed.text
            and "\n\n1Repeated label words.\n\n" in parsed.text,
        ),
        _check(
            "document text is exactly the blocks, quoted ones included",
            parsed.text == expected_text,
        ),
        _check("every real section keeps its start and end", got_rows == expected_rows),
        _check(
            "every real section keeps its ordinal (its block's place in the text)",
            {row[0]: row[4] for row in parsed.provisions}
            == {lab: i for i, (lab, _) in enumerate(NESTED_BLOCKS) if lab is not None},
        ),
        _check(
            "each row's offsets index its own words",
            all(parsed.text[s:e] == block_of[lab] for lab, (s, e) in got_rows.items()),
        ),
    ]


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
        passed.extend(_check_repeal_flag())
        passed.extend(_check_nested_sections())

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
