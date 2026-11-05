r"""Extract the cross-references a provision makes, and what KIND each one is.

Run: ``python tools/law-store/contract/extract_references.py ita``
     ``python ... --all`` | ``python ... ita --dry-run``

Statute works like a Bible, where a mark points at every other place a thing is dealt
with. Measured on the stored Income Tax Act: 5,030 "subsection N(n)" references, 542 "subject to", 434 "notwithstanding", 557 "as defined in".
**Section 85 alone makes 55 outbound references.** A section read alone is therefore not
just incomplete -- it can be exactly backwards.

THE KIND IS THE WHOLE VALUE. Three of the four kinds change what an answer MEANS:

  subject_to       the citing rule LOSES to the target. "Subject to section 84.1" means
                   84.1 wins. Miss it and the answer inverts.
  notwithstanding  the citing rule WINS over the target. Inverts the other way.
  defined_in       the ordinary meaning of the term is WRONG; only the statutory
                   definition counts. "Eligible property" is not English, it is a defined
                   term with its own provision.
  reference        a plain pointer -- worth following, flips nothing.

Flattening these into one "related" edge throws away the only part that can change an
answer, which is exactly what a naive graph build does.

Deliberately conservative: this finds pointers, it does not interpret them. An unresolved
target (a pointer to another Act, or to a section we do not hold) stays in the table with
no resolution rather than being dropped -- an unresolvable "subject to" is a real finding.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from corpus_contract import CorpusContract, Provenance, RefusalError

# A statutory pointer: the unit word, the section number, then any nested (1)(a)(i) parts.
UNIT = r"(?:section|subsection|paragraph|subparagraph|clause)s?"
TARGET = r"(\d+(?:\.\d+)*)((?:\([^)\s]{1,8}\))*)"
POINTER = rf"{UNIT}\s+{TARGET}"

# Ordered: the qualifier patterns are tried FIRST and claim their span, so a plain
# reference never double-counts text already recognised as a precedence operator.
QUALIFIED = (
    ("subject_to", re.compile(rf"subject\s+to\s+{POINTER}", re.I)),
    ("notwithstanding", re.compile(rf"(?:notwithstanding|despite)\s+{POINTER}", re.I)),
    (
        "defined_in",
        re.compile(
            rf"(?:as\s+defined\s+in|within\s+the\s+meaning\s+(?:assigned\s+by|of))\s+{POINTER}",
            re.I,
        ),
    ),
)
PLAIN = re.compile(POINTER, re.I)

# A qualifier phrase often names SEVERAL sections: "subject to sections 134, 135 and 138".
# Until 2026-08-25 only the first survived, because the pattern above stops at one pointer.
# Measured then: 29 phrases across the Income Tax Act and the CBCA named more than one
# DISTINCT section, so those blocking edges never entered the store at all and the
# qualifiers gate could not fire on them -- a silent miss, not a noisy one.
#
# The continuation is walked in Python rather than bolted onto the regex, because it needs
# a judgement the regex cannot express: "and 138" is a citation, "and 3 years later" is
# not. A bare number only counts when it either carries a subsection part -- "and 26(2)" --
# or is followed by another connector, closing punctuation, or the end of the phrase.
# Guessing instead of checking here would invent references, and a fabricated blocking
# edge is a gate crying wolf, which is how gates stop being read.
CONTINUATION = re.compile(rf"\s*(?:,|and|or|to)\s+(?:{UNIT}\s+)?{TARGET}", re.I)

# What may follow a bare number and still leave it a citation: another connector, closing
# punctuation, the end of the text, or the statutory tail "of this Act" / "of that section".
# `of` earns its place because after a number in statute it is almost always that tail --
# and it is what distinguishes "sections 134, 135 and 138 of this Act" from "and 3 years
# of records", where the number is followed by a NOUN rather than by `of`.
_LOOKS_LIKE_MORE_CITATION = re.compile(r"\s*(?:,|and\b|or\b|to\b|of\b|[).;:]|$)", re.I)


@dataclass(frozen=True)
class Reference:
    kind: str
    target_label: str
    target_detail: str
    raw: str
    offset: int


def _walk_list(text: str, start: int, targets: list[tuple[str, str]]) -> tuple[int, list]:
    """Consume "…, 135 and 138" after a qualifier's first pointer.

    Returns where the phrase actually ends and every target it named. Stops at the first
    thing that does not look like a continued citation, so an ordinary sentence carrying
    on after the qualifier -- "subject to section 85 and 3 years of records" -- contributes
    nothing beyond s.85.
    """
    position = start
    while True:
        match = CONTINUATION.match(text, position)
        if match is None:
            return position, targets
        label, detail = match.group(1), match.group(2) or ""
        named_unit = bool(re.match(rf"\s*(?:,|and|or|to)\s+{UNIT}\s", match.group(0), re.I))
        if not (detail or named_unit or _LOOKS_LIKE_MORE_CITATION.match(text, match.end())):
            return position, targets
        targets.append((label, detail))
        position = match.end()


def extract(text: str, base_offset: int = 0) -> list[Reference]:
    """Every pointer in one provision's text, most specific kind first.

    `claimed` tracks character spans already recognised by a qualifier pattern, so
    "subject to section 84.1" yields ONE subject_to edge rather than also a plain
    reference to the same words.
    """
    found: list[Reference] = []
    claimed: list[tuple[int, int]] = []

    for kind, pattern in QUALIFIED:
        for match in pattern.finditer(text):
            end, targets = _walk_list(text, match.end(), [(match.group(1), match.group(2) or "")])
            claimed.append((match.start(), end))
            raw = text[match.start() : end]
            seen: set[str] = set()
            for label, detail in targets:
                # One edge per DISTINCT section: "subsections 152(4) to 152(6)" is one
                # qualifier on s.152, not two. The gate works at section granularity, so
                # a second edge to the same section is noise it would report twice.
                if label in seen:
                    continue
                seen.add(label)
                found.append(Reference(kind, label, detail, raw, base_offset + match.start()))

    for match in PLAIN.finditer(text):
        if any(start <= match.start() < end for start, end in claimed):
            continue
        found.append(
            Reference(
                "reference",
                match.group(1),
                match.group(2) or "",
                match.group(0),
                base_offset + match.start(),
            )
        )
    return found


def extract_for_document(corpus: CorpusContract, document_id: int) -> list[tuple]:
    """Rows ready for the store, one per (provision, pointer)."""
    rows: list[tuple] = []
    provisions = corpus.conn.execute(
        "SELECT id, label, char_start, char_end FROM provision WHERE document_id=?"
        " ORDER BY ordinal",
        (document_id,),
    )
    document = corpus.get_document(document_id)
    text = document["text"]
    for provision in provisions.fetchall():
        body = text[provision["char_start"] : provision["char_end"]]
        for reference in extract(body, provision["char_start"]):
            # A section pointing at itself is noise: "subsection (1) of this section"
            # renders as the section's own number and carries no information.
            if reference.target_label == provision["label"]:
                continue
            rows.append(
                (
                    provision["id"],
                    document_id,
                    reference.target_label,
                    reference.target_detail,
                    reference.kind,
                    reference.raw,
                    reference.offset,
                )
            )
    return rows


def _self_test() -> int:
    """Offline, no store. Every case is a phrase shape taken from the real Acts.

    Added 2026-08-25 with the multi-target fix (audit F3). The extractor had no test at
    all, and the fix it needed was precisely the kind measurement catches and reading does
    not: only the FIRST section of "sections 134, 135 and 138" was ever stored, so those
    blocking edges never reached the gate.

    Both sides are covered on purpose. The list cases prove the extra targets are found;
    the last two prove an ordinary sentence carrying on after a qualifier contributes
    nothing -- inventing a reference is not a smaller mistake than missing one, it is the
    gate crying wolf, which is how gates stop being read.
    """
    cases: list[tuple[str, str, list[str]]] = [
        ("subject to sections 134, 135 and 138", "subject_to", ["134", "135", "138"]),
        ("subject to sections 134, 135 and 138 of this Act", "subject_to", ["134", "135", "138"]),
        ("notwithstanding subsections 16(3) and 26(2)", "notwithstanding", ["16", "26"]),
        ("Notwithstanding subsection 34(2) or 35(3)", "notwithstanding", ["34", "35"]),
        ("subject to paragraph 87(2)(e.4) and subsection 142.6(5)", "subject_to", ["87", "142.6"]),
        ("as defined in subsection 248(1) and section 249", "defined_in", ["248", "249"]),
        # One edge per DISTINCT section: a range inside one section is one qualifier.
        ("notwithstanding subsections 152(4) to 152(6)", "notwithstanding", ["152"]),
        ("subject to section 85", "subject_to", ["85"]),
        # The sentence simply continues; "3" is a quantity, not a citation.
        ("subject to section 85 and 3 years of records", "subject_to", ["85"]),
        ("subject to section 85 and the taxpayer files", "subject_to", ["85"]),
    ]
    failures = 0
    for text, kind, expected in cases:
        got = [r.target_label for r in extract(text) if r.kind == kind]
        ok = got == expected
        failures += not ok
        print(f"{'  ok  ' if ok else 'FAIL  '}{text!r} -> {got}")
    # A qualifier phrase must not also be counted as a plain reference to the same words.
    doubled = [r for r in extract("subject to sections 134, 135 and 138") if r.kind == "reference"]
    ok = not doubled
    failures += not ok
    print(f"{'  ok  ' if ok else 'FAIL  '}a claimed list is not double-counted as plain references")
    print("\nALL PASS" if not failures else f"\n{failures} FAILURES")
    return 1 if failures else 0


def main() -> int:
    if "--self-test" in sys.argv[1:]:
        return _self_test()
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry_run = "--dry-run" in sys.argv
    if not args:
        print("usage: extract_references.py <source-key> [--dry-run] | --all [--dry-run]")
        return 1
    with CorpusContract() as corpus:
        keys = (
            [
                r["source_key"]
                for r in corpus.conn.execute("SELECT DISTINCT source_key FROM document")
            ]
            if args[0] == "--all"
            else args
        )
        for key in keys:
            document = corpus.latest_document(key)
            if document is None or not corpus.has_provisions(document["id"]):
                print(f"{key}: no parsed provisions -- run the ingester first")
                continue
            rows = extract_for_document(corpus, document["id"])
            counts: dict[str, int] = {}
            for row in rows:
                counts[row[4]] = counts.get(row[4], 0) + 1
            summary = ", ".join(f"{k}={v}" for k, v in sorted(counts.items())) or "none"
            if dry_run:
                print(f"{key}: {len(rows)} references ({summary}) [dry-run]")
                continue
            try:
                stored = corpus.record_references(
                    document["id"],
                    rows,
                    provenance=Provenance(
                        source=key,
                        recorded_by="extract_references",
                        source_ref=document["url"],
                        source_captured_at=document["currency_iso"] or "",
                        confidence="inferred",
                        note="pattern-extracted pointers; kinds are mechanical, not read",
                    ),
                )
            except RefusalError as exc:
                print(f"{key}: REFUSED -- {exc}")
                continue
            print(f"{key}: {stored} references stored ({summary})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
