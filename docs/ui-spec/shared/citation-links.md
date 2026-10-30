# A source's line: how it was checked

Last updated: 2026-10-29 (a line under a source's title saying what its page holds, § What it is, set on the
Motor vehicle expenses write-off's s.67.3 only; the CRA's rate page says "Read by a person on 2026-10-29", his read
of its table, and the Alberta sales-tax card's new source "Checked by a tool on 2026-10-29", § Today);
2026-10-27 (the maintainer's reads of 2026-10-25: every source of the 31 pages he read in
full says "Read by a person on 2026-10-25", the Delete menu's record-keeping line among them, § Today;
2026-10-24: the Delete menu's record-keeping line: its citation also keeps a tool check,
which its read outranks, so the line doesn't change; § Today: the reading list's new sources say "Checked
by a tool"; 2026-10-23: the words a tool check found are drawn by one component, `PageQuotes`, also on
the ways to incorporate and *Your plan*; 2026-10-12: § Today: the honest map's six pages now
carry a tool check; before that,
2026-10-11: read or checked by a tool, the maintainer's decision of 2026-10-11, option B; same day,
after review: "Read by a person" only when a person is recorded as the reader;
docs/engines/citations.md)

Page: every page that shows a citation (the map's node detail, the intake's live preview, *What
DotAmi knows about you*, *Your ideas*' Tax year hint, *Your plan*) and the playbook export and readout API ·
Component: `components/shared/citation-links.tsx` (`CitationLinks`), the words a tool check found drawn by
`components/shared/page-quotes.tsx` (`PageQuotes`) · Words: `lib/engines/shared/citation-check.ts`
(`howCheckedWords`, `isCheckFirst`, `toolCheckQuotes`, `PAGE_QUOTES_LEAD`) ·
Type: link list

## What it is

Every citation is a link to its official page (title ↗), with its authority, its place, how it
was checked, and the statute-check chip where one exists. "Show the words"
([show-the-words.md](./show-the-words.md)) sits under it on statute citations.

**What the page holds** (since 2026-10-29, the maintainer's note on the s.67.3 source: "there should be a subtitle
explaining what the page holds in plain english so the user (if they read it) knows what to looks for while
reading."). A citation with `pageHolds` has one more line, right under its title and above its authority line, in
small grey type (`text-small`, `text-stone`), inside the same link: one plain-English sentence of DotAmi's own
saying what the page holds. It comes from [`lib/engines/shared/words.ts`](../../../lib/engines/shared/words.ts),
never from the component, and a citation without one draws nothing there. Today only the Motor vehicle expenses
write-off's first source has one:

- Title: `Income Tax Act s.67.3 — Limitation re cost of leasing passenger vehicle ↗` (the section's own heading;
  until 2026-10-29 `Income Tax Act s.18(1)(a), s.67, s.67.2, s.67.3 — purpose test, reasonableness, interest and
  lease caps`, which named three provisions the page doesn't hold)
- Line: `Only section 67.3 is on this page: the limit on how much of a passenger vehicle's lease charges can be
  deducted, and the formulas that set it.`

Its four "Show the words" buttons (ITA 18(1)(a), 67, 67.2, 67.3) are unchanged: they read the law store, not the
page. The line adds no control, no region and no new text size, and the source shows only after a click (the
clutter limit measures every screen with nothing clicked, `e2e/clutter-budget.spec.ts`).

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
- `Words found on the page: “<quote>” · “<quote>”` (under a tool check, on the card). The label is
  `PAGE_QUOTES_LEAD`, drawn only by `PageQuotes`, the one component that draws the words a tool check found
  on an official page (since 2026-10-23). An official page's own durations, such as "It will cost $200 and
  will take 1 day.", may stand only there, never as a line of DotAmi's own (`tests/prerelease-honesty.spec.ts`).

The words come from one function, `howCheckedWords`; no screen writes them itself, and
`tests/citation-check.spec.ts` fails on any file in `app/`, `components/` or `lib/` other than
`lib/engines/shared/citation-check.ts` that reads a citation's `lastVerified` or `readBy`.

## Everywhere the same words show

- **The map's node detail** (`components/node-detail-panel.tsx`): each item's sources and
  *Sources for this stage*, through `CitationLinks`; on Incorporating's ways to incorporate, each fee line's
  own quotes after the same label, through `PageQuotes` (since 2026-10-23).
- **The intake's live preview** ([../intake/live-preview.md](../intake/live-preview.md)), through
  `CitationLinks`.
- **"Show the words"**: unchanged; its "current to <date>" is the law store's date for the Act, not
  a check of the citation. The citation's own line above it says how it was checked.
- **What DotAmi knows about you, Delete** ([../your-data/delete-menu.md](../your-data/delete-menu.md)):
  from 2026-10-11 the record-keeping line ended `(Read on 2026-10-08. Who read it wasn't recorded.)` where it said
  `(read 2026-10-08)`, in grey; a model's read, or a tool check with no read, there would be amber,
  like the card. It doesn't list a tool check's words. Since 2026-10-24 that citation also keeps a
  tool check of 2026-10-23 (the CRA's "Generally, …" sentence on the six years and the one after it);
  the read outranks it, so the line still said that read, in grey. Since 2026-10-27 that read is the
  maintainer's, of the page in full on 2026-10-25, so the line ends `(Read by a person on 2026-10-25)`.
- **What DotAmi knows about you, What leaves this computer** ([../your-data/_index.md](../your-data/_index.md)):
  since 2026-10-27, while a model key is set, the intake's row says how Anthropic's own retention page was
  checked (`Checked by a tool on 2026-10-27: …`, in amber) and lists the words found, after *Words found on
  the page:*, through `PageQuotes`.
- **Your ideas, Add a figure, Tax year** ([../ventures/_index.md](../ventures/_index.md)): `Line 8299
  on the CRA's 2025 T2125 ("Gross business or professional income"). Read by a person on 2026-10-10.`
  A year's form always has a person's read (`tests/engine-integrity.spec.ts`), because this sentence
  and the other-year one say DotAmi "has read" it; so this hint is never amber for how it was checked.
- **The playbook export** (Export on the map; since 2026-10-23 `lib/playbook/road-export.ts`, the same lines,
  until then `lib/playbook/render-markdown.ts`, which no page calls now): each citation line
  ends `· <the words>` where it ended `· verified <date>`; a tool check's line is followed by one
  sub-bullet per quote, `  - *Words found on the page:* "<quote>"`, before the note. In the front
  matter, `catalog_last_verified` keeps its name but is the oldest day one of the sources was read,
  by anyone (a tool check is not a read; `n/a` when none was read), and
  `sources_read_by_a_person: <n> of <total>` follows it.
- **Your plan** ([../plan/_index.md](../plan/_index.md)): each source's line says how it was checked, and
  the words a tool found follow under `Words found on the page:`, one quote a line, in italics (`PageQuotes`
  `layout="lines"`, since 2026-10-23).
- **The readout API** (`GET /api/readout`): each citation under `evaluation.unlocks[].citations`
  keeps its fields (`lastVerified`, `readBy` and `toolCheck` when it has them) and gains
  `howChecked`, the same words.

## State touched

None. Read from the catalogs only.

## Today

Every citation in the catalogs was read or checked by a tool. The T2125 lines' sources say "Read by
a person on 2026-10-10" (the maintainer checked them, as their notes record). From 2026-10-12 six
pages said "Checked by a tool on 2026-10-12: it found on the page the exact words this entry relies on. Not read by a
person yet.", in amber (a source line lists the words found under it; each way to incorporate
quotes them on its own line after *Words found on the page:*, `components/node-detail-panel.tsx`): the CRA's "When to register for and start
charging the GST/HST" (the compliance entry, both GST/HST stages and the sole proprietor + GST/HST
rung; until 2026-10-12 it said "Read by an AI model on 2026-10-06"), and the five pages behind the
two ways to incorporate: Corporations Canada's "Services, fees and processing times" and "Register a
federal corporation in a province or territory", and Alberta's "Incorporate an Alberta
corporation", "Find a business registry" and "Annual returns for corporations, cooperatives and
organizations" (docs/engines/citations.md, § Tool checks in the catalogs). The pages that moved after
that said "Checked by a tool" too (§ When a cited page moves there). From 2026-10-24 (the maintainer's
reading list of 2026-10-23) so did the sources it added: the SR&ED card's four new pages, the
Canada-Alberta Productivity Grant's page and *SR&ED deepening*'s third source ("Checked by a tool on
2026-10-23"), and *Sole Prop activation*'s third ("on 2026-10-12", the check its words already had;
§ The reading list's tool checks there). Since 2026-10-27 every source of the 31 pages the maintainer read
in full on 2026-10-25 says "Read by a person on 2026-10-25", in grey, with no words found listed under it
(the read wins on screen; § The maintainer's reads of 2026-10-25 there): the CRA's "When to register for
and start charging the GST/HST", the SR&ED card's pages, the Productivity Grant's page and *Sole Prop
activation*'s third among them, and the moved pages he read (the SR&ED, home office, motor vehicle and T2
guide pages). The five pages behind the two ways to incorporate still say "Checked by a tool", as do the
moved pages he didn't read. Since 2026-10-29 the CRA's GST/HST rate page, under *Ontario HST (13%)* and *Alberta — no
provincial sales tax*, says "Read by a person on 2026-10-29", his later read of its table's rows, and the Alberta
card's second source, Alberta's *About Tax and Revenue Administration*, says "Checked by a tool on 2026-10-29", in
amber, with “Alberta has no sales tax.” after *Words found on the page:*. A source with a read and no record of who did it says
"Read on <date>. Who read it wasn't recorded." No citation is read by an AI model any more.
`e2e/app.spec.ts` ("every source says how it was checked") checks a stage's sources, the playbook
export and the readout in the browser.
