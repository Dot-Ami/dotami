# The optional statute store behind "Show the words"

`GET /api/law/provision?source=<key>&label=<label>&sub=<path>` can show a provision's own
text next to a citation — the paragraph, the Act's currency date, and where the text came
from. The app does **not** ship the statutes; it calls a local store when one is configured.

## The contract the app expects

`LAW_STORE_PATH` points at a directory containing `contract/lookup.py`. The app runs

```
python <dir>/contract/lookup.py --source ita --label 20 --sub "(1)(a)"
```

and expects **one JSON object on stdout**:

```json
{
  "found": true,
  "source": "ita", "sourceName": "Income Tax Act (Canada)", "citation": "R.S.C., 1985, c. 1 (5th Supp.)",
  "officialUrl": "https://laws-lois.justice.gc.ca/eng/acts/i-3.3/",
  "documentCurrency": "2026-06-14", "sourceFormat": "xml",
  "label": "20", "heading": "Deductions permitted…", "inforceStart": "…", "lastAmended": null, "repealed": false,
  "text": "…the whole section…", "textLength": 67480,
  "focus": { "sub": "(1)(a)", "found": true, "snippet": "(a) such part of the capital cost…" },
  "provenance": [ { "source": "…", "sourceRef": "…", "recordedBy": "…", "recordedAt": "…", "confidence": "verified" } ]
}
```

or `{"found": false, "reason": "…"}` with a non-zero exit. Keys: `source` is a registry key
(`ita` Income Tax Act · `itr` Income Tax Regulations · `cbca` · `abca`), `label` is the
section label as the store indexes it (`"20"`, `"1100"`, `"Sch. II Class 50"`), `sub` is a
best-effort paragraph path and `focus.found` says whether it landed.

When the variable is unset, the route answers 503 with a plain reason and every citation
stays a link to the official text. Nothing else in the app depends on the store.

## Why it is not in this repo

Ingesting consolidated statutes is its own project: a registry of sources with their legal
basis, immutable dated snapshots, provenance on every row, and refusals (no undated
document, no unregistered source, no deletes). One such store exists privately and is what
the maintainers verify catalog entries against; the citation fields on every entry
(`verification.status`, `method`, `corpus` pointers) are the visible result. A public,
reusable store is welcome as a separate project that implements the contract above.
