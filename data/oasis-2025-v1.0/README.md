# OaSIS 2025 Version 1.0: the four files DotAmi imports

Four files of the government of Canada's *Occupational and Skills Information System (OaSIS) - 2025
Version 1.0*, as downloaded from
[the dataset's page on open.canada.ca](https://open.canada.ca/data/en/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec)
(publisher: Employment and Social Development Canada; date published 2025-10-30; record modified
2026-10-04). Contains information licensed under the
[Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada).

| File | What DotAmi uses it for |
|---|---|
| `guide_oasis_2025_v4.0.csv` | The taxonomy: the code of each skill and knowledge area, which becomes its permanent id |
| `skills_oasis_2025_v1.1.csv` | Each job's ratings on the 33 skills |
| `knowledge_oasis_2025_v.1.1.csv` | Each job's ratings on the 44 knowledge areas |
| `labels_oasis_2025_v1.1.csv` | Each job's name, for *Pick the job closest to your work* |

They are kept as downloaded so the import can be redone, except that git stores them with "\n" line
endings (a Windows checkout may write them back with "\r\n"); the import evens line endings out before
it hashes or reads them, so its SHA-256s are those of the official files' text either way: `node scripts/import-oasis.mjs`
turns them into `lib/engines/oasis/v2026/data.ts`, and `--check` (and `tests/oasis-import.spec.ts`)
fails if the module isn't exactly what these files make. `--download` fetches fresh copies first, and
writes each one only when its SHA-256 is the one pinned for it in the script's `OASIS_FILES`; a file
that differs is not written, and the script says what it expected and what it got. Taking a new version
from the government means updating that pinned value by hand, on purpose. `npm run data:check` (in CI, inside
`npm run ci:quality`) checks each file against its pin and rebuilds the module, offline. The licence line and
the dataset's title come from its card in the source registry (`lib/engines/research-kit/v2026/registry.ts`,
card `oasis-2025`); the reading, pins and header are the research kit's import core, `scripts/lib/import-kit.mjs`.
Nothing in this folder ships with the app; the module made from it does, with its licence line.

Why these files and not the others (Work Activities, Abilities, …), how much of each list is shown,
and how each item is cited: [docs/architecture/future-cockpit.md](../../docs/architecture/future-cockpit.md)
§ 6, *Skills, and the government's list for your pick of job, as built*. The government does not
endorse DotAmi or anyone's use of this data.
