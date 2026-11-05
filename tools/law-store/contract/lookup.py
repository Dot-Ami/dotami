r"""Read one provision, through the contract, as JSON — DotAmi's "show me the words" (S2.5.4i).

    python tools/law-store/contract/lookup.py --source itr --label "Sch. II Class 50"
    python tools/law-store/contract/lookup.py --source ita --label 20 --sub "(1)(a)"

Why this exists: every write-off entry in DotAmi cites a section of the Act; the citation was
a link to a 7 MB page. This prints the provision's own text, its currency date and where it
came from, so the app can show the words on the screen. It reads through ``CorpusContract``
(``latest_document`` -> ``find_provision`` -> ``provision_text``) — never its own SQL — so the
same refusals apply: an unregistered source, an undated document, a label that is not there
all come back as ``{"found": false, "reason": ...}``, never as a guess.

``--sub`` is BEST-EFFORT: provisions are stored at section level ("20", "1100",
"Sch. II Class 50"). A sub-path like "(1)(a)" is located by walking the markers in order and
the snippet is cut at the next marker of the same depth. ``focus.found`` says whether that
walk succeeded; when it did not, the whole section is still returned and the caller says so.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

from corpus_contract import CorpusContract, RefusalError, load_registry

SNIPPET_MAX = 4000
MARKER = re.compile(r"\(([0-9]+(?:\.[0-9]+)?|[a-z]+(?:\.[0-9]+)?)\)")  # (1) (a) (xxxvi) (c.3)


def _walk_sub(text: str, sub: str) -> tuple[bool, str]:
    """Locate a sub-path like '(1)(a)(xxxvi)' by walking markers in order.

    Returns (found, snippet). The snippet runs from the last marker to the next marker at
    the same depth (same bracket style), capped at SNIPPET_MAX.
    """
    parts = MARKER.findall(sub)
    if not parts:
        return False, ""
    pos = 0
    for part in parts:
        idx = _find_real_marker(text, part, pos)
        if idx == -1:
            return False, ""
        pos = idx
    # end of snippet: next REAL marker of the same kind as the last part, or a hard cap
    last = parts[-1]
    kind = _marker_kind(last)
    end = len(text)
    for m in MARKER.finditer(text, pos + len(last) + 2):
        if _marker_kind(m.group(1)) == kind and _is_real_marker(text, m.start(), m.end()):
            end = m.start()
            break
    return True, text[pos:end].strip()[:SNIPPET_MAX]


def _marker_kind(token: str) -> str:
    head = token.split(".")[0]
    if head.isdigit():
        return "num"
    return "roman" if set(head) <= set("ivx") else "alpha"


def _is_real_marker(text: str, start: int, end: int) -> bool:
    """A paragraph marker in the flattened statute text (no line breaks survive parsing) is
    followed straight by its body -- ``property(a)such part`` -- while a cross-reference is
    chained: ``18(1)(a),`` (preceded by ``)``) or ``(1)(b)`` (followed by ``(``)."""
    before = text[start - 1] if start > 0 else ""
    after = text[end] if end < len(text) else ""
    return after.isalpha() and before != ")"


def _find_real_marker(text: str, part: str, start: int) -> int:
    needle = f"({part})"
    idx = text.find(needle, start)
    while idx != -1:
        if _is_real_marker(text, idx, idx + len(needle)):
            return idx
        idx = text.find(needle, idx + 1)
    return -1


def lookup(source: str, label: str, sub: str | None = None) -> dict[str, Any]:
    """The whole answer as one dict. Never raises for a miss; raises only on a broken store."""
    registry = load_registry()
    entry = registry.get(source)
    if entry is None:
        return {"found": False, "reason": f"source '{source}' is not in the legal-basis registry"}

    with CorpusContract() as contract:
        document = contract.latest_document(source)
        if document is None:
            return {"found": False, "reason": f"no dated document ingested for '{source}'"}
        provision = contract.find_provision(document["id"], label)
        if provision is None:
            return {
                "found": False,
                "reason": f"no provision labelled '{label}' in {entry.get('name', source)}",
                "documentCurrency": document["currency_iso"],
            }
        text = contract.provision_text(provision)
        provenance = [
            {
                "source": row["source"],
                "sourceRef": row["source_ref"],
                "recordedBy": row["recorded_by"],
                "recordedAt": row["recorded_at"],
                "confidence": row["confidence"],
            }
            for row in contract.provenance_for("provision", provision["id"])
        ]

    focus: dict[str, Any] | None = None
    if sub:
        found, snippet = _walk_sub(text, sub)
        focus = {"sub": sub, "found": found, "snippet": snippet if found else ""}

    return {
        "found": True,
        "source": source,
        "sourceName": entry.get("name"),
        "citation": entry.get("citation"),
        "officialUrl": (entry.get("urls") or [None])[0],
        "textUrl": entry.get("text_url"),
        "documentId": document["id"],
        "documentCurrency": document["currency_iso"],
        "sourceFormat": document["source_format"],
        "label": provision["label"],
        "heading": provision["heading"],
        "inforceStart": provision["inforce_start"],
        "lastAmended": provision["last_amended"],
        "repealed": bool(provision["repealed"]),
        "text": text,
        "textLength": len(text),
        "focus": focus,
        "provenance": provenance,
        "readThrough": "CorpusContract: latest_document -> find_provision -> provision_text",
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", required=True, help="registry key: ita, itr, cbca, abca")
    parser.add_argument(
        "--label", required=True, help='provision label, e.g. "20" or "Sch. II Class 50"'
    )
    parser.add_argument("--sub", default=None, help='best-effort sub-path, e.g. "(1)(a)"')
    args = parser.parse_args(argv)
    try:
        result = lookup(args.source, args.label, args.sub)
    except RefusalError as exc:
        result = {"found": False, "reason": f"contract refused: {exc}"}
    json.dump(result, sys.stdout, ensure_ascii=True)  # ASCII-safe: Windows consoles are cp1252
    sys.stdout.write("\n")
    return 0 if result.get("found") else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
