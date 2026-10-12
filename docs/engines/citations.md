# How a source was checked: read by a person, or checked by a tool

Last updated: 2026-10-11 (the maintainer's decision of 2026-10-11)

Every citation in every catalog says how it was checked. There are two kinds of check, and a
card always says which one it had.

## The decision

On 2026-10-11 the maintainer chose between two ways of keeping up with new sources:

- **A** — he reads every page before its change merges;
- **B** — every citation records how it was checked: *read by a person* on a date, or *checked by a
  tool* on a date, where a tool check means the live page was fetched and code confirmed that the
  quoted words appear on it word for word. He reads whatever he chooses, and the card always says
  which kind of check it had.

His words: "yah, im cool with option B". This page is option B.

## The shape

```ts
interface EngineCitation {
  title: string;
  authority: "CRA" | "federal" | "provincial";
  jurisdiction: "CA" | "AB" | "BC" | "ON";
  url: string;
  note: string;
  // At least one of these two:
  lastVerified?: string;            // the day a PERSON read the source (unchanged meaning)
  toolCheck?: {
    checkedOn: string;              // the day a tool fetched the page and found every quote on it
    quotes: string[];               // the exact words the entry relies on, one or more short quotes
  };
  verification?: …;                 // unchanged: the statute-store check (confirmed/supported/partial)
  corpus?: …;                       // unchanged: pointers for "Show the words"
}
```

The type (`CitationCheck` in [`lib/engines/shared/types.ts`](../../lib/engines/shared/types.ts))
makes "at least one" a compile error, and
[`tests/engine-integrity.spec.ts`](../../tests/engine-integrity.spec.ts) checks it again on every
catalog at run time.

**Why these names.**

- **`lastVerified` keeps its name and its meaning**: the day a human read the source. Every citation
  written before 2026-10-11 has one, the catalogs and their docs already use it that way, and
  renaming it would touch every entry for no gain to anyone reading a card. None of them changes kind
  in the change that adds tool checks.
- **`toolCheck`** says who did the checking, in the same words the card uses ("Checked by a tool").
  A name like `machineVerified` or `autoVerified` was ruled out: in this repo *verified* means a
  person read it, and a tool only confirms that some words are on a page. It does not read for
  meaning, and it cannot tell whether the entry says what the page says.
- **`checkedOn`**, not `lastVerified` again, so the two dates can never be mixed up in code or in a
  search of the catalogs.
- **`quotes`** are the words the entry relies on, copied from the page. They are what the tool
  checks, so a quote is short (a sentence or a phrase), never a paraphrase, and never the whole page.

## Rules

1. A citation has a person date, a tool check, or both. A tool check has at least one quote, and no
   quote is empty.
2. Both dates are written `YYYY-MM-DD`. A tool check's date is never after today.
3. **When both exist, the person's read wins on screen.** The tool check stays in the catalog (the
   readout API returns it), but the card says "Read by a person on <date>".
4. A tool check is recorded only after `node scripts/check-quotes.mjs --url … --quote …` reported
   every one of its quotes as found on the live page. The builder copies the date the script printed.
   The script never writes a file itself. Run with no arguments, it checks every recorded tool check
   again, which shows when a page has changed under a citation.
5. A person who reads a tool-checked source adds `lastVerified` with the day they read it; the tool
   check may stay.
6. Nothing else changes: a citation still names the official source, `note` still says what is
   there in one line, and the source order in [CONTRIBUTING.md](../../CONTRIBUTING.md) still applies.

## What people see

One function writes the words, so every screen says the same thing
([`lib/engines/shared/citation-check.ts`](../../lib/engines/shared/citation-check.ts)):

| The citation has | The words |
|---|---|
| a person date (with or without a tool check) | `Read by a person on 2026-10-10` |
| only a tool check | `Checked by a tool on 2026-10-11: the quoted words were found on the page. Not read by a person yet.` |

They appear wherever a citation's date showed before: the source list under each item and stage
on the map (and in the intake's preview), the line under "Delete" on *What DotAmi knows about you*,
the Tax year hint in *Add a figure*, the playbook export, and the readout API (`howChecked` on each
citation). The per-screen detail is in
[docs/ui-spec/shared/citation-links.md](../ui-spec/shared/citation-links.md).

## The checker: `scripts/check-quotes.mjs`

A developer script. It is never shipped (the installer copies the built app, not `scripts/`), and
`scripts/` is outside the app's network check (`tests/helpers/source-scan.ts`), so the fetch it makes
is never part of what DotAmi does on a person's computer.

```bash
# Before recording a new tool check: one page, the quotes you mean to rely on.
node scripts/check-quotes.mjs --url "https://www.canada.ca/…" --quote "first exact words" --quote "second"

# Afterwards, any time: every citation in the catalogs that already has a tool check.
node scripts/check-quotes.mjs
```

For each page it fetches it, turns the HTML into plain text (scripts, styles
and tags removed, entities decoded), and looks for each quote. Before comparing it changes only:

- runs of whitespace (spaces, tabs, line breaks, non-breaking spaces) into one space;
- typographic quotes into straight ones (‘ ’ ‚ ‛ ′ → `'`, “ ” „ ‟ ″ → `"`);
- dashes into a hyphen (‐ ‑ ‒ – — ― − → `-`).

Nothing else: not letter case, not punctuation, not accents. It prints *found* or *not found* for
every quote and exits with code 1 if any quote is missing or a page couldn't be fetched. When every
quote is found it prints the date to record as `checkedOn`.

A PDF is not read by the script (it says so and counts the citation as not checked); a person reads
PDFs. Its test, [`tests/check-quotes.spec.ts`](../../tests/check-quotes.spec.ts), uses saved sample
pages and never reaches the network.

## How this relates to the other checks

- **`verification`** (confirmed / supported / partial) is about the statute store: someone read the
  provision's own text and compared it with the entry. It is a different question from "were these
  words on the page", and it stays as it is.
- The task list's item *Check sources against the law's own words* ([docs/task-list.md](../task-list.md),
  [11b]) is the larger plan: a model proposes quotes, code checks them, a person decides. This page is
  the record and the checker that plan needs; the model step is not built.
