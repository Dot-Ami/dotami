# A source's line: how it was checked

Last updated: 2026-10-11 (read by a person or checked by a tool, the maintainer's decision of
2026-10-11, option B; docs/engines/citations.md)

Page: every page that shows a citation (the map's node detail, the intake's live preview, *What
DotAmi knows about you*, *Your ideas*' Tax year hint) and the playbook export and readout API ·
Component: `components/shared/citation-links.tsx` (`CitationLinks`) · Words:
`lib/engines/shared/citation-check.ts` (`howCheckedWords`) · Type: link list

## What it is

Every citation is a link to its official page (title ↗), with its authority, its place, how it
was checked, and the statute-check chip where one exists. "Show the words"
([show-the-words.md](./show-the-words.md)) sits under it on statute citations.

## What it does

Nothing new to click. The line under the title says how the source was checked:

| The citation has | What shows |
|---|---|
| a person's read (`lastVerified`), with or without a tool check | one line as before: `CRA · CA · Read by a person on 2026-10-10` (small capitals, grey, where "verified 2026-10-10" was) |
| only a tool check (`toolCheck`) | `CRA · CA` on that line, then a line of its own in amber: `Checked by a tool on 2026-10-11: the quoted words were found on the page. Not read by a person yet.` |

When both exist, the person's read is what shows. Amber is the map's "check first" colour: a tool
check proves the quoted words are on the page, not that the entry reads them right.

## Why it exists

The maintainer decided on 2026-10-11 that a source may be checked by a tool instead of read by a
person before it merges, as long as every card says which kind of check it had, so a reader always
knows whether a person has read the page behind a claim.

## Copy (current labels)

- `Read by a person on <YYYY-MM-DD>`
- `Checked by a tool on <YYYY-MM-DD>: the quoted words were found on the page. Not read by a person yet.`

The words come from one function, `howCheckedWords`; no screen writes them itself, and
`tests/citation-check.spec.ts` fails on any file in `app/`, `components/` or `lib/` other than
`lib/engines/shared/citation-check.ts` that reads a citation's `lastVerified`.

## Everywhere the same words show

- **The map's node detail** (`components/node-detail-panel.tsx`): each item's sources and
  *Sources for this stage*, through `CitationLinks`.
- **The intake's live preview** ([../intake/live-preview.md](../intake/live-preview.md)), through
  `CitationLinks`.
- **"Show the words"**: unchanged; its "current to <date>" is the law store's date for the Act, not
  a check of the citation. The citation's own line above it says how it was checked.
- **What DotAmi knows about you, Delete** ([../your-data/delete-menu.md](../your-data/delete-menu.md)):
  the record-keeping line ends `(Read by a person on 2026-10-08)` where it said `(read 2026-10-08)`.
- **Your ideas, Add a figure, Tax year** ([../ventures/_index.md](../ventures/_index.md)): `Line 8299
  on the CRA's 2025 T2125 ("Gross business or professional income"). Read by a person on 2026-10-10.`
- **The playbook export** (Export on the map, `lib/playbook/render-markdown.ts`): each citation line
  ends `· Read by a person on <date>` (or the tool words) where it ended `· verified <date>`. The
  front matter's `catalog_last_verified` is the oldest day a person read one of the sources; when
  some sources have only a tool check, a line `sources_not_read_by_a_person: <count>` follows it.
- **The readout API** (`GET /api/readout`): each citation under `evaluation.unlocks[].citations`
  keeps its fields (`lastVerified`, `toolCheck` when it has one) and gains `howChecked`, the same
  words.

## State touched

None. Read from the catalogs only.

## Today

Every citation in the catalogs was read by a person, so every card says "Read by a person on …".
No citation changed kind in the change that added tool checks. `e2e/app.spec.ts` ("every source says
how it was checked") checks a stage's sources, the playbook export and the readout in the browser.
