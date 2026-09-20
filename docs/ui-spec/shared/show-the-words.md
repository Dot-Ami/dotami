# "Show the words" — a provision's text on every statute citation

Last updated: 2026-09-16 (S2.5.4i — built and verified in the pane)

**Component:** `components/shared/citation-links.tsx` (`ProvisionWords`) · **API:**
`GET /api/law/provision?source=&label=&sub=` (`app/api/law/provision/route.ts`) ·
**Data:** `EngineCitation.corpus: CorpusPointer[]` (`lib/engines/shared/types.ts`) ·
**Store side:** `<store>/contract/lookup.py` (docs/architecture/law-store.md) — reads through `CorpusContract`, never SQL.

**Decided 2026-09-14/15:** wire the statute store in wherever it strengthens the app, and never
let the app say something is legal or not without a deep dive into whether it actually is.
This is the deep dive's first half: the law's own words, on the screen, dated.

## What it does

Every citation whose title names a section of the Income Tax Act or the Income Tax
Regulations carries one or more `corpus` pointers (`{ source, label, sub? }`). Each pointer
renders a small maple button under the citation link — *"Show the words · ITA 20(1)(a)"*.

On click the app calls `/api/law/provision`, which runs the law store's `lookup.py` (local
grant via `LAW_STORE_PATH`) and shows:

- a caption: source name · citation · section · heading · **current to <date>** (the store's
  currency date for that Act) · REPEALED if so;
- the words: the paragraph the pointer names when the store's marker walk landed
  (`focus.found = true`), otherwise the **start of the section** with an amber line saying
  the paragraph could not be located and to open the official text;
- a footer: "The provision's own words, read from the law store through its contract. Not a
  summary." + a link to the official text.

Results are cached per server process (statute text does not change under a citation; the
currency date rides along regardless).

## Failure modes, all said on screen

| Case | What shows |
|---|---|
| `LAW_STORE_PATH` unset / store missing | "Law store not reachable from this machine … The citation link still works." (503) |
| label not in the store | the store's own reason, e.g. "no provision labelled '99999' in Income Tax Act (Canada)" (404) |
| sub-path not located | section start + the amber "could not locate (9)(z) inside s.20" line |
| bad input | 400 with the rule ("source must be ita, itr, cbca or abca") |

## Pointers today (9, all on write-off entries, all verified to resolve 2026-09-16)

ITA 18(12) · 18(1)(a) · 18(1)(b) · 67 · 67.1(1) · 67.2 · 67.3 · 20(1)(a) · 37(1) · 127 · 248(1) ·
9(1) · Reg. Sch. II Class 50 · 1100(1)(a)(xxxvi) · 1100(2)(c.3) · Sch. II Class 8 · 1100(1)(a)(viii).
`tests/engine-integrity.spec.ts` enforces the pointer shape on every statute citation.

## Verified 2026-09-16 (pane)

Smart-glasses venture → node "Incorporation for liability/SR&ED" → CCA Class 50 → four
buttons; **Reg. 1100(2)(c.3)** opened to *"(c.3) if the class is Class 50, (i) 9/11, for property
that was acquired and became available for use by the taxpayer after April 15, 2024 and before
2027, and (ii) nil …"* current to 2026-06-21; **ITA 20(1)(a)** opened to *"such part of the
capital cost to the taxpayer of property … as is allowed by regulation;"* current to 2026-06-14.
