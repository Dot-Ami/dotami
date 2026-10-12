# A source's line: how it was checked

Last updated: 2026-10-11 (read or checked by a tool, the maintainer's decision of 2026-10-11, option
B; same day, after review: "Read by a person" only when a person is recorded as the reader;
docs/engines/citations.md)

Page: every page that shows a citation (the map's node detail, the intake's live preview, *What
DotAmi knows about you*, *Your ideas*' Tax year hint) and the playbook export and readout API ·
Component: `components/shared/citation-links.tsx` (`CitationLinks`) · Words:
`lib/engines/shared/citation-check.ts` (`howCheckedWords`, `isCheckFirst`, `toolCheckQuotes`) ·
Type: link list

## What it is

Every citation is a link to its official page (title ↗), with its authority, its place, how it
was checked, and the statute-check chip where one exists. "Show the words"
([show-the-words.md](./show-the-words.md)) sits under it on statute citations.

## What it does

Nothing new to click. The line under the title says how the source was checked:

| The citation has | What shows |
|---|---|
| a read a person is recorded as doing (`readBy: "person"`), with or without a tool check | one line: `CRA · CA · Read by a person on 2026-10-10` (small capitals, grey, where "verified 2026-10-10" was) |
| a read with no record of who did it (no `readBy`), with or without a tool check | one line: `CRA · CA · Read on 2026-06-08. Who read it wasn't recorded.` (grey) |
| a read by an AI model (`readBy: "model"`) | `CRA · CA` on that line, then a line of its own in amber: `Read by an AI model on 2026-10-06. Not read by a person yet.` |
| only a tool check (`toolCheck`) | `CRA · CA` on that line, then a line of its own in amber: `Checked by a tool on 2026-10-11: it found on the page the exact words this entry relies on. Not read by a person yet.`, and under it, grey: `Words found on the page: “…” · “…”` |

When a read and a tool check both exist, the read is what shows. Amber is the map's "check first"
colour, for the two kinds that say no person has read the page: a model's read, or a tool check,
which proves the words are on the page, not that the entry reads them right. A read nobody recorded
the reader of stays grey: it claims nothing either way.

## Why it exists

The maintainer decided on 2026-10-11 that a source may be checked by a tool instead of read by a
person before it merges, as long as every card says which kind of check it had, so a reader always
knows whether a person has read the page behind a claim. A card never says a person read it unless
the catalog records that one did.

## Copy (current labels)

- `Read by a person on <YYYY-MM-DD>`
- `Read on <YYYY-MM-DD>. Who read it wasn't recorded.`
- `Read by an AI model on <YYYY-MM-DD>. Not read by a person yet.`
- `Checked by a tool on <YYYY-MM-DD>: it found on the page the exact words this entry relies on. Not read by a person yet.`
- `Words found on the page: “<quote>” · “<quote>”` (under a tool check, on the card only)

The words come from one function, `howCheckedWords`; no screen writes them itself, and
`tests/citation-check.spec.ts` fails on any file in `app/`, `components/` or `lib/` other than
`lib/engines/shared/citation-check.ts` that reads a citation's `lastVerified` or `readBy`.

## Everywhere the same words show

- **The map's node detail** (`components/node-detail-panel.tsx`): each item's sources and
  *Sources for this stage*, through `CitationLinks`.
- **The intake's live preview** ([../intake/live-preview.md](../intake/live-preview.md)), through
  `CitationLinks`.
- **"Show the words"**: unchanged; its "current to <date>" is the law store's date for the Act, not
  a check of the citation. The citation's own line above it says how it was checked.
- **What DotAmi knows about you, Delete** ([../your-data/delete-menu.md](../your-data/delete-menu.md)):
  the record-keeping line ends `(Read on 2026-10-08. Who read it wasn't recorded.)` where it said
  `(read 2026-10-08)`, in grey; a model's read or a tool check there would be amber, like the card.
  It doesn't list a tool check's words.
- **Your ideas, Add a figure, Tax year** ([../ventures/_index.md](../ventures/_index.md)): `Line 8299
  on the CRA's 2025 T2125 ("Gross business or professional income"). Read by a person on 2026-10-10.`
  A year's form always has a person's read (`tests/engine-integrity.spec.ts`), because this sentence
  and the other-year one say DotAmi "has read" it; so this hint is never amber for how it was checked.
- **The playbook export** (Export on the map, `lib/playbook/render-markdown.ts`): each citation line
  ends `· <the words>` where it ended `· verified <date>`; a tool check's line is followed by one
  sub-bullet per quote, `  - *Words found on the page:* "<quote>"`, before the note. In the front
  matter, `catalog_last_verified` keeps its name but is the oldest day one of the sources was read,
  by anyone (a tool check is not a read; `n/a` when none was read), and
  `sources_read_by_a_person: <n> of <total>` follows it.
- **The readout API** (`GET /api/readout`): each citation under `evaluation.unlocks[].citations`
  keeps its fields (`lastVerified`, `readBy` and `toolCheck` when it has them) and gains
  `howChecked`, the same words.

## State touched

None. Read from the catalogs only.

## Today

Every citation in the catalogs was read. The T2125 lines' sources say "Read by a person on
2026-10-10" (the maintainer checked them, as their notes record); the GST/HST small-supplier source
under the compliance entry says "Read by an AI model on 2026-10-06. Not read by a person yet.", in
amber (its page moved and only a model has read the new address); every other source says "Read on
<date>. Who read it wasn't recorded." No citation has a tool check yet. `e2e/app.spec.ts` ("every
source says how it was checked") checks a stage's sources, the playbook export and the readout in
the browser.
