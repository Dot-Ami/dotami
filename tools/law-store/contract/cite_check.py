"""cite_check — prove or disprove a legal citation against the corpus. Never from memory.

WHY THIS EXISTS
---------------
On 2026-08-25 the maintainer asked "how do I know you didn't just make that up?" about a
set of statute sections an agent had asserted in chat. There was no way to know: the
claims came from model memory and nothing had been queried. This tool removes that
failure mode by making the check cheap, repeatable, and runnable by anyone.

THE PROPERTY THAT MAKES IT WORTH ANYTHING: it can fail.
Every run includes CONTROL claims that are deliberately fake. If a control ever comes back
FOUND, the tool is rigged or the store is corrupt, and the run exits non-zero. So does any
claim that does not come back FOUND. A proof that always passes proves nothing.

USAGE
    python tools/law-store/contract/cite_check.py                  # the built-in claim set
    python tools/law-store/contract/cite_check.py ita:85 cbca:146  # specific citations
    python tools/law-store/contract/cite_check.py --receipt        # also write a dated receipt

WHAT A PASS DOES AND DOES NOT MEAN
    FOUND     the section exists in the named Act, with the heading shown. That is ALL.
              It does NOT verify any claim about what the section MEANS, and it does not
              verify anything that depends on reading subsections together.
    NOT FOUND the section is not in that Act. A citation to it is unsupported.
    NO SOURCE that Act is not in the store at all. Nothing can be said about it here.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))

from contract.corpus_contract import CorpusContract  # noqa: E402

LOG_DIR = REPO / "receipts"

# Claims an agent asserted in chat on 2026-08-25, before any of them were checked.
DEFAULT_CLAIMS: list[tuple[str, str, str]] = [
    ("ita", "85", "rollover: transfer property to a corporation tax-deferred"),
    ("ita", "110.6", "lifetime capital gains exemption"),
    ("ita", "125", "small business deduction + business limit"),
    ("ita", "256", "associated corporations"),
    ("ita", "112", "inter-corporate dividend deduction"),
    ("ita", "149", "149(1)(l) non-profit exemption"),
    ("ita", "37", "SR&ED deduction"),
    ("ita", "8", "8(13) employee home-office restriction"),
    ("ita", "18", "18(12) business home-office restriction"),
    ("ita", "9", "income from business = profit"),
    ("ita", "248", "definitions incl. SR&ED"),
    ("cbca", "146", "unanimous shareholder agreement"),
]

# Deliberately false. These MUST NOT be found or the tool is not trustworthy.
CONTROLS: list[tuple[str, str, str]] = [
    ("ita", "9999", "invented section number"),
    ("ita", "85.7", "plausible-looking but invented"),
    ("abtax", "125", "Alberta corporate tax act — not in the store"),
]


def audit(claims, controls, write_receipt=False):
    lines: list[str] = []

    def out(s=""):
        print(s)
        lines.append(s)

    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    out(f"cite_check run {stamp}")
    out("=" * 72)

    with CorpusContract().open() as c:
        out(f"store row counts: {c.row_counts()}")
        out()
        out("documents actually in the store:")
        for row in c.conn.execute(
            "SELECT id, source_key, source_format, currency_iso, length(text) AS n "
            "FROM document ORDER BY id"
        ):
            out(
                f"  id={row['id']:<3} {row['source_key']:<7} {row['source_format']:<5} "
                f"current_to={row['currency_iso']:<12} {row['n']:>9,} chars "
                f"sections_parsed={c.has_provisions(row['id'])}"
            )
        out()

        def check(source_key, label):
            doc = c.latest_document(source_key)
            if doc is None:
                return "NO SOURCE", None, None
            prov = c.find_provision(doc["id"], label)
            if prov is None:
                return "NOT FOUND", None, None
            keys = prov.keys()
            heading = prov["heading"] if "heading" in keys else ""
            repealed = prov["repealed"] if "repealed" in keys else "?"
            return "FOUND", heading, repealed

        out("CLAIMS")
        found = notfound = nosource = 0
        for source_key, label, claimed in claims:
            verdict, heading, repealed = check(source_key, label)
            if verdict == "FOUND":
                found += 1
                out(f"  FOUND      {source_key} s.{label:<7} repealed={repealed}  {heading!r}")
                out(f"             asserted: {claimed}")
            elif verdict == "NOT FOUND":
                notfound += 1
                out(f"  NOT FOUND  {source_key} s.{label:<7}  asserted: {claimed}")
            else:
                nosource += 1
                out(f"  NO SOURCE  {source_key} s.{label:<7}  asserted: {claimed}")

        out()
        out("CONTROLS (these MUST NOT be found)")
        rigged = []
        for source_key, label, why in controls:
            verdict, heading, _ = check(source_key, label)
            ok = verdict != "FOUND"
            out(f"  {'ok  ' if ok else 'RIGGED'} {verdict:<9} {source_key} s.{label:<7} ({why})")
            if not ok:
                rigged.append(f"{source_key} s.{label}")

        out()
        out(
            f"SUMMARY  found={found}  not-found={notfound}  no-source={nosource}"
            f"  of {len(claims)} claims"
        )
        verdict = "PASS - the tool can fail" if not rigged else "FAILED: " + ", ".join(rigged)
        out(f"CONTROLS {verdict}")
        unproven = notfound + nosource
        out(f"CLAIMS   {'PASS' if not unproven else f'FAILED: {unproven} not proven'}")
        out()
        out("A FOUND verdict proves the section EXISTS with that heading. It proves nothing")
        out("about what the section means, and nothing about claims that need several")
        out("subsections read together. Those are still unverified.")

    if write_receipt:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        path = LOG_DIR / f"cite_check-{stamp[:10]}-{stamp[11:19].replace(':', '')}.txt"
        path.write_text("\n".join(lines), encoding="utf-8")
        print(f"\nreceipt written: {path}")

    # An unproven claim fails the run. Until 2026-11-04 only a rigged control did, so a run on an
    # empty store answered NO SOURCE twelve times and still exited 0.
    return 1 if rigged or unproven else 0


def main(argv: list[str]) -> int:
    write_receipt = "--receipt" in argv
    args = [a for a in argv if not a.startswith("--")]
    if args:
        claims = []
        for a in args:
            source_key, _, label = a.partition(":")
            if not label:
                print(f"bad citation {a!r} — use SOURCE:SECTION, e.g. ita:85")
                return 2
            claims.append((source_key, label, "(supplied on the command line)"))
    else:
        claims = DEFAULT_CLAIMS
    return audit(claims, CONTROLS, write_receipt)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
