# NOC 2021 Version 1.0: the elements file DotAmi imports

One file of Statistics Canada's *National Occupational Classification (NOC) 2021 Version 1.0*, as listed on
[the classification's page](https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1) (publisher:
Statistics Canada; its [open.canada.ca record](https://open.canada.ca/data/en/dataset/1feee3b5-8068-4dbb-b361-180875837593)
says it is made available under the
[Statistics Canada Open Licence](https://www.statcan.gc.ca/en/reference/licence)). Adapted from Statistics
Canada, National Occupational Classification (NOC) 2021 Version 1.0, 2021. This does not constitute an
endorsement by Statistics Canada of this product.

| File | What DotAmi uses it for |
|---|---|
| `noc-2021-v1.0-elements.csv` | For each of the 516 five-digit job groups: its title, its example titles ("Illustrative example(s)", "All examples", "Inclusion(s)") and its "Employment requirements", which *About this job* quotes word for word as the government's own lines |

The file's other rows (main duties, exclusions, additional information) are read past and not shipped: nothing
in DotAmi uses them yet. A job group is what the first five digits of an OaSIS job code name (72311.00 is in
group 72311), so every OaSIS job reaches its group's lines.

It is kept as fetched so the import can be redone, except that git stores it with "\n" line endings (a Windows
checkout may write them back with "\r\n"); the import evens line endings out before it hashes or reads it, so
its SHA-256 is that of the file's text either way: `node scripts/import-noc.mjs` turns it into
`lib/engines/noc/v2021/data.ts`, and `--check` (and `tests/noc-import.spec.ts`) fails if the module isn't
exactly what this file makes. `npm run data:check` (in CI, inside `npm run ci:quality`) checks the file against
its pin and rebuilds the module, offline. The licence notice and the classification's title come from its card
in the source registry (`lib/engines/research-kit/v2026/registry.ts`, card `noc-2021-elements`); the reading,
pin and header are the research kit's import core, `scripts/lib/import-kit.mjs`.

**Where this copy came from.** On 2026-10-21 Statistics Canada's site answered a script asking for this file
with a "Security Check" page (HTTP 403), so it couldn't be fetched again that day, and nothing was done to get
past that check. The committed copy is the one fetched on 2026-10-15 that research note 28f measured (the raw
file's SHA-256, `50c3e31a90b0150cc5b8efd29ec020c2fd9ea5fc5b0a171ed65d3cd9a0abf32f`, is recorded in that note);
its header and first rows matched the live file on 2026-10-20. `node scripts/import-noc.mjs --download` writes
a fetched copy only when its SHA-256 matches the pin in the script's `NOC_FILES`, so until the site answers
scripts again it stops with the server's answer and writes nothing. Taking a new version means updating that
pin by hand, on purpose, after reading what changed.

Nothing in this folder ships with the app; the module made from it does, with its notice
(`lib/engines/noc/v2021/LICENCE.txt`, listed on `/licences`).
