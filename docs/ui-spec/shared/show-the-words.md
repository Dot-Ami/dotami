# "Show the words" — a provision's text on every statute citation

Last updated: 2026-10-12 (the words keep the Act's paragraph breaks, #9); 2026-10-11 (the
citation above the button says how it was checked; 2026-09-16:
S2.5.4i — built and verified in the pane)

**Component:** `components/shared/citation-links.tsx` (`ProvisionWords`) · **API:**
`GET /api/law/provision?source=&label=&sub=` (`app/api/law/provision/route.ts`) ·
**Data:** `EngineCitation.corpus: CorpusPointer[]` (`lib/engines/shared/types.ts`) ·
**Store side:** `<store>/contract/lookup.py` (docs/architecture/law-store.md) — reads through `CorpusContract`, never SQL.

**Decided 2026-09-14/15:** wire the statute store in wherever it strengthens the app, and never
let the app say something is legal or not without a deep dive into whether it actually is.
This is the deep dive's first half: the law's own words, on the screen, dated.

## What it does

**2026-10-11:** the citation line above the button now says how the citation was checked, "Read by
a person on <date>", "Read on <date>. Who read it wasn't recorded.", an AI model's read or "Checked
by a tool on <date>: …" ([citation-links.md](./citation-links.md)).
The button and its panel are unchanged: the panel's "current to <date>" is the law store's date for
the Act, not a check of the citation.

Every citation whose title names a section of the Income Tax Act or the Income Tax
Regulations carries one or more `corpus` pointers (`{ source, label, sub? }`). Each pointer
renders a small maple button under the citation link — *"Show the words · ITA 20(1)(a)"*.

On click the app calls `/api/law/provision`, which runs the law store's `lookup.py` (local
grant via `LAW_STORE_PATH`) and shows:

- a caption: source name · citation · section · heading · **current to <date>** (the store's
  currency date for that Act) · REPEALED if so;
- the words: the paragraph the pointer names when the store's marker walk landed
  (`focus.found = true`), otherwise the **start of the section** with an amber line saying
  the paragraph could not be located and to open the official text. **Since 2026-10-12 (#9)**
  the words are drawn as the Act lays them out, one line per subsection, paragraph,
  subparagraph, clause and subclause, each indented one step further than the level above
  (`(1)` · `(a)` · `(i)` · `(A)` · `(I)`), and each marginal note (*Capital outlay or loss*)
  on a line of its own above the paragraph it names, in small italics. The section's heading
  is drawn the same way only where the store glued the section's number to it (*General
  limitations* + `18(1)In…`, *Limitation re cost of leasing passenger vehicle* + `67.3Notwithstanding…`);
  other text before the first label is the law's own words (Class 50's definition, *Property
  acquired after March 18, 2007 that is …*) and is drawn as ordinary text, and so is a formula's
  variable glued to its definition (`…the vehicle,Dis the amount…`). Until then they ran
  together as one block: the store hands the text over as one string with no space between a
  paragraph and the next label (`…for a taxation year,(a)no amount…`). The split is for the
  eye only (`lib/law/provision-lines.ts` `provisionLines`, drawn by `ProvisionText`): the
  words are never changed, and a reference inside a sentence (*subparagraph (a)(i) or (ii)*,
  *paragraph 20(1)(f) except*) stays where it is, also when the store glued it to the next
  word: right after another label (*subparagraph (c)(ii)exceeds*, ITA 248(1)) or after a space
  (*clauses A to (C)to be used*, ITA 37(1)), since the store puts no space before a part it
  joined. `(i)` right after `(h)` is paragraph (i), not a subparagraph, unless `(ii)` follows
  it. `tests/provision-lines.spec.ts`, on the store's own text for ITA 18(12), ITA 18(1)
  (a)–(l), ITA 248(1), ITA 37(1), ITA 67, ITA 67.3, Reg. 1100(2)(c.3) and Reg. Sch. II Class 50,
  read 2026-10-12;
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
