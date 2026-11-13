r"""Ingest a federal Act from the official Justice Canada XML.

Run: ``python tools/law-store/contract/ingest_xml.py ita``
     ``python ... --all``            every registered source with an ``xml_path``
     ``python ... ita --dry-run``

SOURCE, and why we trust it (checked 2026-08-19):
  1. The Government of Canada's Open Government Portal (open.canada.ca) links directly to
     ``github.com/justicecanada/laws-lois-xml`` as that dataset's own resource.
  2. LICENSE.md is the Open Government Licence - Canada, (c) Government of Canada.
  3. s.85(1) of the Income Tax Act pulled from that XML is BYTE-IDENTICAL to the text we
     had already stored from laws-lois.justice.gc.ca directly.
Stated honestly: the GitHub org carries no "verified" badge. (3) is what actually settles
it -- a provenance claim can be faked, a byte-identical match against the official site
cannot. Anything that stops matching is a reason to stop ingesting, not to shrug.

WHY XML RATHER THAN THE HTML WE SCRAPED FIRST: the XML carries per-SECTION
``lims:lastAmendedDate`` and ``lims:inforce-start-date``, plus explicit ``<Repealed>``.
Without them an amendment anywhere in a 7.6 MB Act marks EVERY quote from it stale, which
is a permanent false alarm; with them only the sections that actually moved flip. Repealed
provisions are the dangerous case -- currently invisible, and they read as good law.

The text stored is the FLATTENED text, so every existing gate (verbatim matching,
truncation, anchoring) keeps working unchanged. The XML gives structure and dates; it does
not change what a quote is.
"""

from __future__ import annotations

import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).resolve().parent))

from corpus_contract import (
    CorpusContract,
    Provenance,
    RefusalError,
    Snapshot,
    load_registry,
)

RAW_BASE = "https://raw.githubusercontent.com/justicecanada/laws-lois-xml/main/"
USER_AGENT = "dotami-law-store/0.1 (legal corpus; +https://github.com/Dot-Ami/dotami)"
TIMEOUT = 300
LIMS = "{http://justice.gc.ca/lims}"


@dataclass
class Parsed:
    text: str
    provisions: list[tuple]  # (label, heading, start, end, ordinal, inforce, amended, repealed)
    currency: str


def _flatten(element: ElementTree.Element) -> str:
    """All text under an element, in document order, whitespace collapsed."""
    return re.sub(r"\s+", " ", "".join(element.itertext())).strip()


def parse_act(xml_bytes: bytes) -> Parsed:
    """Flatten an Act to text and index its BODY sections with their own dates.

    Two traps found on the real CBCA XML, 2026-08-19:

    * **Schedules renumber from 1.** A `<Section>` under `Schedule/BillPiece` is a schedule
      ITEM, not a section of the Act, and CBCA schedule item 1 is a list of Criminal Code
      offences. Indexing it alongside body section 1 ("Short title") would let a citation to
      "CBCA s.1" resolve to criminal offences. Only `Body` sections are indexed; schedules
      are deliberately out of scope until they are modelled properly.
    * **`pit-date` is not the currency date.** The root carries `lims:current-date`
      (what the consolidation is current TO) alongside `lims:pit-date` and
      `lims:lastAmendedDate` (when it last CHANGED). Those are different questions and the
      first is the one a citation needs.

    The flattened text and the offsets come from the SAME walk, so `char_start`/`char_end`
    index exactly the string that gets stored. Two passes is how they drift apart.
    """
    root = ElementTree.fromstring(xml_bytes)
    currency = (root.get(LIMS + "current-date") or root.get(LIMS + "pit-date") or "")[:10]

    body = root.find("Body")
    if body is None:
        return Parsed("", [], currency)

    stream = _Stream()
    for section in body.iter("Section"):
        label_node = section.find("Label")
        label = (label_node.text or "").strip() if label_node is not None else ""
        if not label:
            continue
        heading_node = section.find("MarginalNote")
        heading = _flatten(heading_node) if heading_node is not None else ""
        stream.add(label, heading, section)

    # Schedules, in their OWN label namespace (S2.5.2g, 2026-09-13). The CBCA trap above
    # was a schedule item labelled "1" colliding with body s.1; "Sch. II Class 50" cannot
    # collide with anything in a Body. Needed because the Income Tax Regulations keep the
    # CCA classes in Schedule II as Heading+Provision pairs, not Sections.
    for schedule in root.findall("Schedule"):
        _walk_schedule(schedule, stream)
    return Parsed("".join(stream.parts), stream.provisions, currency)


@dataclass
class _Stream:
    """The single walk that produces BOTH the flattened text and the offsets into it.

    Keeping the buffer, the cursor and the ordinal together is what guarantees
    ``char_start``/``char_end`` index exactly the string that gets stored (see parse_act).
    """

    parts: list[str] = field(default_factory=list)
    provisions: list[tuple] = field(default_factory=list)
    cursor: int = 0
    ordinal: int = 0

    def add(self, label: str, heading: str, node: ElementTree.Element) -> None:
        """Flatten one node into the text stream and index it under ``label``."""
        text = _flatten(node)
        if not text:
            return
        block = text + chr(10) * 2
        start = self.cursor
        self.parts.append(block)
        self.provisions.append(
            (
                label,
                heading,
                start,
                start + len(text),
                self.ordinal,
                node.get(LIMS + "inforce-start-date", ""),
                node.get(LIMS + "lastAmendedDate", ""),
                _is_repealed(node),
            )
        )
        self.cursor += len(block)
        self.ordinal += 1


_CLASS_HEADING = re.compile(r"^\s*(CLASS\s+\d+(?:\.\d+)?)", re.IGNORECASE)


def _walk_schedule(schedule: ElementTree.Element, stream: _Stream) -> None:
    """Index a Schedule's items under a "Sch. <label>" prefix.

    Two shapes seen in the real XML (2026-09-13, Income Tax Regulations C.R.C., c. 945):
      * ``Schedule/Section`` (Schedules I, III–VI) → label "Sch. III s.1".
      * ``Schedule/Heading + Provision`` pairs (Schedule II, the CCA classes) → label
        "Sch. II Class 50"; the heading text ("CLASS 8(20 per cent)") is kept as the
        heading so the rate stays visible as TEXT, never stored as a fact.
    Anything else in a schedule (forms, tables) is left unindexed — a known gap, not a
    silent merge.
    """
    # The schedule's own label lives under <ScheduleFormHeading>, not as a direct child.
    label_node = schedule.find("ScheduleFormHeading/Label")
    raw = (label_node.text or "").strip() if label_node is not None else ""
    if not raw:
        return
    prefix = "Sch. " + re.sub(r"^SCHEDULE\s+", "", raw, flags=re.IGNORECASE)

    for section in schedule.iter("Section"):
        lab = section.find("Label")
        label = (lab.text or "").strip() if lab is not None else ""
        if not label:
            continue
        note = section.find("MarginalNote")
        heading = _flatten(note) if note is not None else ""
        stream.add(f"{prefix} s.{label}", heading, section)

    children = list(schedule)
    for i, node in enumerate(children):
        if node.tag != "Heading":
            continue
        heading = _flatten(node)
        m = _CLASS_HEADING.match(heading)
        nxt = children[i + 1] if i + 1 < len(children) else None
        if m is None or nxt is None or nxt.tag != "Provision":
            continue
        stream.add(f"{prefix} {m.group(1).title()}", heading, nxt)


def _is_repealed(section: ElementTree.Element) -> int:
    """1 only when the WHOLE section is repealed, not one of its subsections.

    A genuinely repealed section has no subsections left and its entire content is the
    notice -- e.g. Income Tax Act s.15.1 is exactly
    ``<Section><Label>15.1</Label><Text><Repealed>[Repealed, 2023, c. 26,
    s. 7]</Repealed></Text></Section>``.

    Two wrong rules were tried first, and both are worth remembering:
      * `.//Repealed` (any descendant) marked s.85 -- the rollover, live law -- as repealed,
        because subsections 85(1), 85(1.1) and 85(4) each carry their own repeal marker.
        That inflated the ITA to 212 "repealed" sections, nearly all false, and it hit the
        longest and most-cited provisions hardest.
      * direct-child `<Repealed>` only found ZERO, because the notice sits under `<Text>`.

    Subsection-level repeal is real and worth capturing later at subsection granularity.
    It is a different fact from "this section is gone".
    """
    if any(child.tag == "Subsection" for child in section):
        return 0
    return 1 if section.find(".//Repealed") is not None else 0


def drop_duplicate_labels(provisions: list[tuple]) -> tuple[list[tuple], list[str]]:
    """Keep the FIRST occurrence of each label; report the rest.

    An Act can legitimately repeat a section number across Parts or schedules. The unique
    index would refuse the whole batch, so duplicates are dropped and NAMED rather than
    silently merged -- a dropped section is a known gap, a merged one is a wrong answer.
    """
    seen: set[str] = set()
    kept: list[tuple] = []
    dropped: list[str] = []
    for row in provisions:
        if row[0] in seen:
            dropped.append(row[0])
            continue
        seen.add(row[0])
        kept.append(row)
    return kept, dropped


def fetch_xml(xml_path: str) -> bytes:
    request = urllib.request.Request(RAW_BASE + xml_path, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read()


def _fetch_and_parse(key: str, entry: dict) -> tuple[Parsed | None, str]:
    """Everything that can fail before the store is touched. (Parsed, "") or (None, why).

    Split from ingest() when the return-count rule fired, and it is the right seam anyway:
    this half is pure I/O-and-parsing with no database in scope, so it can be reasoned
    about -- and later tested -- without a store at all.
    """
    xml_path = entry.get("xml_path")
    if not xml_path:
        return None, f"{key}: no xml_path registered -- stays on the HTML pipeline"
    try:
        raw = fetch_xml(xml_path)
    except (urllib.error.URLError, OSError, ValueError) as exc:
        return None, f"{key}: UNREACHABLE {type(exc).__name__} -- {exc}"
    try:
        parsed = parse_act(raw)
    except ElementTree.ParseError as exc:
        return None, f"{key}: XML PARSE FAILED -- {exc}"
    if not parsed.provisions:
        return None, f"{key}: parsed 0 sections -- has the XML schema changed?"
    return parsed, ""


def ingest(corpus: CorpusContract, key: str, entry: dict, *, dry_run: bool = False) -> str:
    parsed, problem = _fetch_and_parse(key, entry)
    if parsed is None:
        return problem

    kept, dropped = drop_duplicate_labels(parsed.provisions)
    dated = sum(1 for row in kept if row[6])
    repealed = sum(1 for row in kept if row[7])
    summary = (
        f"{len(kept)} sections ({dated} with amendment dates, {repealed} repealed)"
        f"{f', {len(dropped)} dup labels dropped: {dropped[:4]}' if dropped else ''}"
    )

    if dry_run:
        return (
            f"{key}: {len(parsed.text):,} chars, currency={parsed.currency or 'NONE'}, "
            f"{summary} [dry-run]"
        )
    if not parsed.currency:
        return f"{key}: REFUSED -- no currency date in the XML; nothing would be quotable"

    url = RAW_BASE + entry["xml_path"]
    provenance = Provenance(
        source=key,
        recorded_by="ingest_xml",
        source_ref=url,
        source_captured_at=parsed.currency,
        confidence="verified",
        note="official Justice Canada XML; verified byte-identical to laws-lois",
    )
    try:
        receipt = corpus.record_document(
            key,
            url,
            parsed.text,
            snapshot=Snapshot(
                currency_raw=parsed.currency, currency_iso=parsed.currency, source_format="xml"
            ),
            provenance=provenance,
        )
        if receipt.created:
            stored = corpus.record_provisions(receipt.row_id, kept, provenance=provenance)
            detail = f"+{stored} provision rows"
        else:
            # Same text, but the PARSER may have improved since it was last indexed --
            # provisions are derived, so re-derive them rather than leaving stale flags.
            result = corpus.reparse_provisions(receipt.row_id, kept, provenance=provenance)
            bits = [f"re-derived {result['updated']} provisions"]
            if result["inserted"]:
                bits.append(f"{result['inserted']} new")
            if result["repeal_flag_changed"]:
                bits.append(f"{result['repeal_flag_changed']} repeal flags CORRECTED")
            detail = ", ".join(bits)
    except RefusalError as exc:
        return f"{key}: REFUSED -- {exc}"

    verb = "stored" if receipt.created else "unchanged"
    return f"{key}: {verb} doc={receipt.row_id}, {len(parsed.text):,} chars, {summary}, {detail}"


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry_run = "--dry-run" in sys.argv
    registry = load_registry()
    if not args:
        print("usage: ingest_xml.py <source-key> [--dry-run] | --all [--dry-run]")
        return 1
    keys = [k for k, v in registry.items() if v.get("xml_path")] if args[0] == "--all" else args
    unknown = [k for k in keys if k not in registry]
    if unknown:
        print(f"not registered: {unknown} -- no entry, no ingestion", file=sys.stderr)
        return 1
    with CorpusContract() as corpus:
        for key in keys:
            print(ingest(corpus, key, registry[key], dry_run=dry_run))
    return 0


if __name__ == "__main__":
    sys.exit(main())
