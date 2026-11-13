r"""Split a stored document into addressable provisions.

Run: ``python tools/law-store/contract/parse_provisions.py ita``
     ``python ... --all``       every stored document that has a parser
     ``python ... ita --dry-run``

Why this exists: without it, ``provision_label`` on a quote is decorative. The citation
gate could only prove "these words appear somewhere in this Act", which on 2026-08-14
passed a quote labelled s.85(1) that actually matched somewhere else -- the phrase occurs
170 times in the Income Tax Act. With provisions parsed, the label itself is checkable.

ONE parser per document LAYOUT, not per source, because that is what actually varies:

  ``laws-lois``  federal consolidations (Income Tax Act, CBCA). Every section is preceded
                 by a "Marginal note: <heading>" line, then the section number. Verified
                 2026-08-14: 695 provisions in the ITA, 294 in the CBCA, every label
                 unique inside its document.

Alberta's King's Printer uses a different layout with no marginal notes and a long table
of contents ahead of the body. It has NO parser here, deliberately -- guessing at a second
layout without reading it properly is how you get provisions that are quietly wrong, which
is worse than none. It stays whole-document and the contract falls back to requiring
document-wide unique quotes for it.

A parser that produces duplicate labels inside one document is REJECTED rather than stored:
the unique index would refuse it anyway, and a mis-split is a parser bug to fix, not data.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from corpus_contract import CorpusContract, Provenance, RefusalError

# "Marginal note: Transfer of property..." newline, then " 85 " (non-breaking spaces are
# what laws-lois actually emits around the number, hence \u00a0 in the class).
LAWS_LOIS = re.compile(
    r"Marginal note:[ \t]*(?P<heading>[^\n]*)\n[ \u00a0]*(?P<label>\d+(?:\.\d+)*)[ \u00a0]"
)

# Which layout a source uses. Keyed by source_key because that is what we hold; the VALUE
# is the layout, so two sources sharing a publisher share a parser.
LAYOUTS = {"ita": "laws-lois", "cbca": "laws-lois"}


@dataclass(frozen=True)
class Provision:
    label: str
    heading: str
    char_start: int
    char_end: int
    ordinal: int


def parse_laws_lois(text: str) -> list[Provision]:
    """Sections of a federal consolidation, each running to the next marginal note."""
    matches = list(LAWS_LOIS.finditer(text))
    provisions: list[Provision] = []
    for ordinal, match in enumerate(matches):
        end = matches[ordinal + 1].start() if ordinal + 1 < len(matches) else len(text)
        provisions.append(
            Provision(
                label=match.group("label"),
                heading=" ".join(match.group("heading").split()),
                char_start=match.start(),
                char_end=end,
                ordinal=ordinal,
            )
        )
    return provisions


PARSERS = {"laws-lois": parse_laws_lois}


def check_labels_unique(provisions: list[Provision]) -> list[str]:
    """Duplicate labels mean the parser mis-split. Report them; never store them."""
    seen: dict[str, int] = {}
    for provision in provisions:
        seen[provision.label] = seen.get(provision.label, 0) + 1
    return sorted(label for label, count in seen.items() if count > 1)


def parse_document(source_key: str, text: str) -> tuple[list[Provision], str]:
    """Returns (provisions, problem). A source with no parser is not an error."""
    layout = LAYOUTS.get(source_key)
    if layout is None:
        return [], f"no parser for {source_key} -- stays whole-document"
    provisions = PARSERS[layout](text)
    if not provisions:
        return [], f"{layout} parser matched nothing -- has the site layout changed?"
    duplicates = check_labels_unique(provisions)
    if duplicates:
        return [], f"parser produced duplicate labels {duplicates[:5]} -- refusing to store"
    return provisions, ""


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry_run = "--dry-run" in sys.argv
    if not args:
        print("usage: parse_provisions.py <source-key> [--dry-run] | --all [--dry-run]")
        return 1

    with CorpusContract() as corpus:
        keys = list(LAYOUTS) if args[0] == "--all" else args
        for key in keys:
            document = corpus.latest_document(key)
            if document is None:
                print(f"{key}: no stored document")
                continue
            provisions, problem = parse_document(key, document["text"])
            if problem:
                print(f"{key}: {problem}")
                continue
            labels = [p.label for p in provisions]
            if dry_run:
                print(
                    f"{key}: {len(provisions)} provisions, {labels[:6]} ... {labels[-3:]} [dry-run]"
                )
                continue
            try:
                stored = corpus.record_provisions(
                    document["id"],
                    [(p.label, p.heading, p.char_start, p.char_end, p.ordinal) for p in provisions],
                    provenance=Provenance(
                        source=key,
                        recorded_by="parse_provisions",
                        source_ref=document["url"],
                        source_captured_at=document["currency_iso"] or "",
                    ),
                )
            except RefusalError as exc:
                print(f"{key}: REFUSED -- {exc}")
                continue
            print(f"{key}: {stored} provisions stored (document {document['id']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
