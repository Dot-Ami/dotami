r"""Fetch one registered source and record it as a dated snapshot.

Run: ``python tools/law-store/contract/fetch_document.py cbca``
     ``python ... --all``          every registered source with a usable text URL
     ``python ... cbca --dry-run`` fetch and report, write nothing

This is the only thing that puts law text into the store, and it goes through
``CorpusContract`` like everything else -- no direct SQL.

Three things it will not do, each for a reason that bit us already:

  * it will not fetch a source that is not in the registry (no entry, no ingestion)
  * it will not store a document whose currency date it could not read -- it stores it
    with ``confidence: guess`` and a UNVERIFIED note instead, and the contract then
    refuses to let anything quote it
  * it will not confuse the landing page with the law. Verified 2026-08-14: the CBCA
    landing page is 4 KB of table-of-contents and carries the currency line but no
    statutory text at all. ``text_url`` in the registry names the body when it differs,
    and a fetch that comes back suspiciously small is reported, not silently stored.
"""

from __future__ import annotations

import html as html_module
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from corpus_contract import (
    CorpusContract,
    Provenance,
    RefusalError,
    Snapshot,
    load_registry,
)

USER_AGENT = "dotami-law-store/0.1 (legal corpus; +https://github.com/Dot-Ami/dotami)"
TIMEOUT = 60
MAX_BYTES = 25_000_000
# A statute page under this is almost certainly a table of contents or an error page.
# Reported rather than enforced -- some regulations really are short.
SUSPICIOUSLY_SMALL = 20_000

MONTHS = (
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
)


def to_iso(raw: str) -> str:
    """Normalize a printed date to YYYY-MM-DD, or return '' when it is not a date.

    Two shapes appear on the sites we registered: `2026-06-17` and `September 1, 2025`.
    The raw string is kept alongside this in the store, because normalizing is lossy and
    the raw string is the evidence of what the page actually said.
    """
    raw = raw.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw
    match = re.fullmatch(r"([A-Z][a-z]+)\s+(\d{1,2}),\s*(\d{4})", raw)
    if match and match.group(1).lower() in MONTHS:
        month = MONTHS.index(match.group(1).lower()) + 1
        try:
            return datetime(int(match.group(3)), month, int(match.group(2))).strftime("%Y-%m-%d")
        except ValueError:
            return ""
    return ""


def html_to_text(raw_html: str) -> str:
    """Tags out, entities decoded, whitespace collapsed.

    Deliberately not a real parser: the citation gate normalizes whitespace on both sides
    before matching, so the only thing that must survive here is the words in order.
    """
    body = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw_html)
    body = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</h\d>", "\n", body)
    body = re.sub(r"<[^>]+>", " ", body)
    body = html_module.unescape(body)
    body = re.sub(r"[ \t\r\f\v]+", " ", body)
    return re.sub(r"\n\s*\n+", "\n\n", body).strip()


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return response.read(MAX_BYTES).decode("utf-8", errors="replace")


def ingest(corpus: CorpusContract, key: str, entry: dict, *, dry_run: bool = False) -> str:
    """Fetch one source and record it. Returns a one-line report."""
    if entry.get("ingestible") is False:
        # A source can be legitimately registered and still not be a document -- the CRA
        # folio INDEX is a page of links, and storing it would file a table of contents as
        # though it were guidance. Registered-but-not-ingestible keeps that decision
        # visible instead of the source quietly vanishing from the registry.
        return f"{key}: SKIPPED -- registered but marked ingestible: false"
    citable = (entry.get("urls") or [""])[0]
    text_url = entry.get("text_url") or citable
    if not text_url:
        return f"{key}: no URL registered"

    try:
        raw_html = fetch(text_url)
    except (urllib.error.URLError, OSError, ValueError) as exc:
        return f"{key}: UNREACHABLE {type(exc).__name__} -- {exc}"

    text = html_to_text(raw_html)
    selector = entry.get("currency_selector", "")
    raw_date = ""
    if selector:
        flat = re.sub(r"\s+", " ", text)
        at = flat.find(selector)
        if at >= 0:
            window = flat[at + len(selector) : at + len(selector) + 120]
            found = re.search(r"[A-Z][a-z]+ \d{1,2}, \d{4}|\d{4}-\d{2}-\d{2}", window)
            raw_date = found.group(0) if found else ""
    iso = to_iso(raw_date)

    size_note = "  [SMALL - is this the landing page?]" if len(text) < SUSPICIOUSLY_SMALL else ""
    if dry_run:
        return (
            f"{key}: {len(text):,} chars, currency={iso or 'UNREADABLE'} "
            f"(raw {raw_date!r}) [dry-run]{size_note}"
        )

    provenance = Provenance(
        source=key,
        recorded_by="fetch_document",
        source_ref=text_url,
        source_captured_at=raw_date,
        confidence="verified" if iso else "guess",
        note="" if iso else "UNVERIFIED: currency line not found -- not quotable",
    )
    try:
        receipt = corpus.record_document(
            key, text_url, text,
            snapshot=Snapshot(currency_raw=raw_date, currency_iso=iso,
                              source_format="html"),
            provenance=provenance,
        )
    except RefusalError as exc:
        return f"{key}: REFUSED -- {exc}"

    verb = "stored" if receipt.created else "unchanged (identical content already held)"
    return (
        f"{key}: {verb}, id={receipt.row_id}, {len(text):,} chars, "
        f"currency={iso or 'UNREADABLE'}{size_note}"
    )


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry_run = "--dry-run" in sys.argv
    registry = load_registry()

    if not args or args[0] in ("-h", "--help"):
        print("usage: fetch_document.py <source-key> [--dry-run] | --all [--dry-run]")
        print("registered:", ", ".join(registry))
        return 1

    keys = list(registry) if args[0] == "--all" else args
    unknown = [k for k in keys if k not in registry]
    if unknown:
        print(f"not registered: {', '.join(unknown)} -- no entry, no ingestion", file=sys.stderr)
        return 1

    with CorpusContract() as corpus:
        for key in keys:
            print(ingest(corpus, key, registry[key], dry_run=dry_run))
    return 0


if __name__ == "__main__":
    sys.exit(main())
