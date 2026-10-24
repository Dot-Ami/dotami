# How a source was checked: read, or checked by a tool

Last updated: 2026-10-24 (the reading list's tool checks of 2026-10-23, § The reading list's tool
checks; 2026-10-13: pages that moved, § When a cited page moves; 2026-10-12: the first tool
checks in the catalogs: the honest map's six pages, § Tool checks in the catalogs; 2026-10-11: the
maintainer's decision; same day, after review: a card says "Read by a person" only when the catalog
records that a person did the reading)

Every citation in every catalog says how it was checked, and a card always says which kind of
check it had.

## The decision

On 2026-10-11 the maintainer chose between two ways of keeping up with new sources:

- **A** — the maintainer reads every page before its change merges;
- **B** — every citation records how it was checked: *read by a person* on a date, or *checked by a
  tool* on a date, where a tool check means the live page was fetched and code confirmed that the
  quoted words appear on it. The maintainer chooses which pages to read, and the card always says
  which kind of check it had.

The maintainer's words: "yah, im cool with option B". This page is option B.

**A correction made the same day, before it merged.** The first version showed every existing
`lastVerified` as "Read by a person on <date>", because the contract said that is what the field
meant. A review found the catalogs' own records say otherwise for some entries: the GST/HST
small-supplier page moved and its new address was last read by an AI model (its note says so), and
many entries were read in build sessions that never recorded whether a person or a model did the
reading. So a read now says who did it only when that is on record (`readBy`), and otherwise says
"Read on <date>. Who read it wasn't recorded." Nothing in option B changes: a card still says which
kind of check a source had, and it never claims a person read a page unless one is recorded as
having read it.

## The shape

```ts
interface EngineCitation {
  title: string;
  authority: "CRA" | "federal" | "provincial";
  jurisdiction: "CA" | "AB" | "BC" | "ON";
  url: string;
  note: string;
  // At least one of these two:
  lastVerified?: string;            // the day the source was last read in full
  readBy?: "person" | "model";      // who did that read, ONLY when it is on record; needs lastVerified
  toolCheck?: {
    checkedOn: string;              // the day a tool fetched the page and found every quote on it
    quotes: string[];               // the exact words the entry relies on, each at least three words
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

- **`lastVerified` keeps its name**: every citation written before 2026-10-11 has one, and renaming
  it would touch every entry for no gain to anyone reading a card. Its meaning is now what the
  records support: the day the source was last read in full, by whoever read it.
- **`readBy`** is separate so that a claim about *who* read it is made on purpose, entry by entry,
  and only from a record (a note, a commit or the maintainer's word). Left out, nothing is claimed.
  Today the T2125 lines' sources (the 2025 form and two chapters of Guide T4002) say `"person"`
  (the maintainer checked them on 2026-10-10, as their notes record), and so does the CRA's page on
  the reporting rules for digital platforms under the ride-share platform card (the maintainer read
  it himself on 2026-10-11). The GST/HST small-supplier
  page under the compliance entry said `"model"` until 2026-10-12; it now carries a tool check
  instead (§ Tool checks in the catalogs). Every other source leaves it out.
- **`toolCheck`** says who did the checking, in the same words the card uses ("Checked by a tool").
  A name like `machineVerified` or `autoVerified` was ruled out: a tool only confirms that some
  words are on a page. It does not read for meaning, and it cannot tell whether the entry says what
  the page says.
- **`checkedOn`**, not `lastVerified` again, so the two dates can never be mixed up in code or in a
  search of the catalogs.
- **`quotes`** are the words the entry relies on, copied from the page. They are what the tool
  checks, so a quote is short (a phrase or a sentence of at least three words), never a paraphrase,
  and never the whole page. One letter or a bare number would be found on almost any page.

## Rules

1. A citation has a read date, a tool check, or both. `readBy` needs a read date and is `"person"`
   or `"model"`. A tool check has at least one quote; no quote is empty or under three words.
2. Both dates are written `YYYY-MM-DD`, and neither is after today.
3. **When a read and a tool check both exist, the read wins on screen** (it was read for meaning).
   The tool check stays in the catalog (the readout API returns it).
4. A tool check is recorded only after `node scripts/check-quotes.mjs --url … --quote …` reported
   every one of its quotes as found on the live page. The builder copies the date the script printed.
   The script never writes a file itself. Run with no arguments, it checks every recorded tool check
   again, which shows when a page has changed under a citation.
5. A person who reads a source sets `lastVerified` to that day and `readBy: "person"`; a tool check
   may stay. An AI model that reads one sets `readBy: "model"`. A read nobody can say who did leaves
   `readBy` out.
6. Every tax-line year's form (the first citation of each year, the one the Tax year hint dates) has
   `readBy: "person"`: those screens say DotAmi "has read" the form and show its line numbers.
7. Nothing else changes: a citation still names the official source, `note` still says what is
   there in one line, and the source order in [CONTRIBUTING.md](../../CONTRIBUTING.md) still applies.

## What people see

One function writes the words, so every screen says the same thing
([`lib/engines/shared/citation-check.ts`](../../lib/engines/shared/citation-check.ts)):

| The citation has | The words | Colour |
|---|---|---|
| a read with `readBy: "person"` | `Read by a person on 2026-10-10` | grey |
| a read with no `readBy` | `Read on 2026-06-08. Who read it wasn't recorded.` | grey |
| a read with `readBy: "model"` | `Read by an AI model on 2026-10-06. Not read by a person yet.` | amber |
| only a tool check | `Checked by a tool on 2026-10-11: it found on the page the exact words this entry relies on. Not read by a person yet.` | amber |

Amber is the map's "check first" colour: it marks the two kinds that say no person has read the
page. A read with no record of who did it stays grey, because it makes no claim either way and it is
most of the catalog. Under a tool check, the card and the playbook export list the words it found
("Words found on the page: “…”"), so a reader can see what was checked.

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
node scripts/check-quotes.mjs --url "https://www.canada.ca/…" --quote "first exact words" --quote "second exact words"

# Afterwards, any time: every citation in the catalogs that already has a tool check.
node scripts/check-quotes.mjs
```

For each page it fetches it, turns the HTML into plain text, and looks for each quote. Turning it
into text drops scripts, styles, the head and other elements that never show, and elements the page
hides itself (the `hidden` attribute, an inline `display:none`); it removes tags and decodes
entities. Text hidden only by a stylesheet class still counts, such as canada.ca's screen-reader-only
`wb-inv` text: a screen reader reads it, and the script doesn't read stylesheets.

Before comparing it changes only:

- runs of whitespace (spaces, tabs, line breaks, non-breaking spaces) into one space;
- typographic quotes and primes into straight ones (‘ ’ ‚ ‛ ′ → `'`, “ ” „ ‟ ″ → `"`);
- dashes and the minus sign into a hyphen (‐ ‑ ‒ – — ― − → `-`);
- the invisible soft hyphen (a line-break hint a reader never sees) is removed.

Nothing else: not letter case, not punctuation, not accents. And a quote counts as found only:

- **as whole words**: a quote that starts or ends with a letter or digit never matches inside a
  longer word or number, so "30,000 in a year" is not found in "$130,000 in a year", "applicable
  here" is not found in "inapplicable here", and "$30,000" is not found in "$30,000.50";
- **inside one block**: a quote is never stitched together from two table cells, two list items,
  two paragraphs or across a line break (`<br>`). Words joined only by inline tags (a link, bold, an
  abbreviation) still count as one run of text.

It prints *found* or *not found* for every quote and exits with code 1 if any quote is missing or a
page couldn't be fetched, and 2 for a usage error (a quote under three words among them). When every
quote is found it prints the date to record as `checkedOn`.

A PDF is not read by the script (it says so and counts the citation as not checked); a person reads
PDFs. Its test, [`tests/check-quotes.spec.ts`](../../tests/check-quotes.spec.ts), uses saved sample
pages and never reaches the network.

## Tool checks in the catalogs

The first ones, recorded on 2026-10-12 for the pages the honest map (#145) quotes, each after
`node scripts/check-quotes.mjs --url … --quote …` found every quote on the live page. None of
these pages is recorded as read by a person, so each card says *Checked by a tool on 2026-10-12* in
amber.

| Page | Where it is cited | What the quotes are |
|---|---|---|
| CRA, *When to register for and start charging the GST/HST* | the GST/HST compliance entry, the two GST stages, the structure ladder's sole proprietor + GST/HST rung (`CRA_WHEN_TO_REGISTER_TOOL_CHECK`, [`lib/engines/compliance/v2026/gst-official-words.ts`](../../lib/engines/compliance/v2026/gst-official-words.ts)) | the CRA's two small-supplier tests and what follows each, the line on registering voluntarily; on the compliance entry also the exclusions in its description |
| Corporations Canada, *Services, fees and processing times* | the federal way to incorporate ([`lib/engines/cfe/v2026/incorporation-routes.ts`](../../lib/engines/cfe/v2026/incorporation-routes.ts)) | the $200 and $12 online fees, the $100 express service, no Nuans report needed, business days |
| Corporations Canada, *Register a federal corporation in a province or territory* | the federal way | registering in each province, and that most charge for it |
| Alberta, *Incorporate an Alberta corporation* | the Alberta way | a government fee and a service fee; no NUANS report for a number name |
| Alberta, *Find a business registry* | the Alberta way | registry agents' service fees are not regulated |
| Alberta, *Annual returns for corporations, cooperatives and organizations* | the Alberta way | the annual return goes to a service provider, who charges both fees |
| CRA, *Sharing economy* (its commercial ridesharing section) | the ride-share and taxi GST/HST entry (`CRA_SHARING_ECONOMY_TOOL_CHECK`, [`lib/engines/compliance/v2026/ride-share-official-words.ts`](../../lib/engines/compliance/v2026/ride-share-official-words.ts)) | the two sentences on the card, the line on combined sales under $30,000, and that food delivery isn't charged as ride-sharing |
| CRA, *GST/HST information for taxi operators and commercial ride-sharing drivers* | the ride-share and taxi entry | registering even as a small supplier |
| CRA, GST/HST Info Sheet GI-196 | the ride-share and taxi entry | registration effective from the first taxable supply, 30 days to apply, and its example |
| Excise Tax Act s.240 | the ride-share and taxi entry | s.240(1.1): a small supplier carrying on a taxi business must be registered |
| Excise Tax Act s.123 | the ride-share and taxi entry | the definition of a taxi business, paragraph (b): rides arranged through an electronic platform |

The ride-share and taxi pages were added on 2026-10-12, with #147 (docs/engines/compliance.md § How
its sources are checked); every quote was found as typed. The platform-reporting page that #147 also
cites is a read by a person, not a tool check.

One rewrite: the CRA page puts a footnote number straight after "threshold" in both tests
("threshold1"), so the two sentences can't be found as typed. The tool check holds the words on each
side of that number instead ("You exceed the $30,000", then the rest of each sentence), and the card
shows the sentences without the footnote numbers, as a person reads them;
[`tests/honest-map.spec.ts`](../../tests/honest-map.spec.ts) checks every quoted sentence is covered.
The incorporation routes are in the list every check reads
([`lib/engines/all-citations.ts`](../../lib/engines/all-citations.ts)), so running the script with no
arguments checks them again with the rest.

On 2026-10-15 (build list item 19) three more citations on the first written future were checked:
Tradesecrets' *Apply Online* page for the Red Seal application fee (*"Red Seal Application | $150"*, a
list item whose own vertical bars are part of the quote, and *"Programs for Experienced Workers"*), and
alberta.ca's *Register a business name* for two named lines' reasons (the pointer to the Registry Agent
Product Catalogue, and that the Business Name Report is provided by NUANS members). The script's
whole-word match was also shown to fail where it should: *"Red Seal Application | $15"* was reported NOT
FOUND on the same page.

## When a cited page moves

On 2026-10-13 every distinct address the catalogs cite (104, from
[`lib/engines/all-citations.ts`](../../lib/engines/all-citations.ts)) was fetched twice, with a normal
browser's user-agent and a pause between requests. Both runs agreed: 84 answered, 20 answered "page not
found" (404), none were blocked. Most of the 20 were CRA pages that moved when it reorganised its
business-expense, SR&ED and corporation pages.

What was done, for each dead address:

- **Where the same government keeps that content now, and the words the entry relies on are there**,
  the citation's `url` points at the new page and it carries a `toolCheck` of that day, recorded only
  after `node scripts/check-quotes.mjs --url … --quote …` found every quote. Its `lastVerified` is
  removed: that read was of the old page, and it says nothing about the new one, so a card would
  otherwise say "Read on 2026-06-08" next to a page nobody has read. A comment beside the `url` keeps
  the old address and its read date. The card shows the tool check in amber until a person reads the
  page. 23 citations on 19 addresses moved this way. Where the new page has a different name, the
  `title` names it. A card shows the quotes as "the exact words this entry relies on", so each is a
  whole sentence, or a whole phrase that names the entry's subject: never words cut off before their
  subject, a page's disclaimer, or a line from a worked example. Where two pages carry the content, the
  one that states the rule as it is today is cited (the tax on split income cites the CRA's line 40424
  page, not its guidance on the 2017 draft proposals).
- **Where no current page carries those words**, the citation is left exactly as it was, for the
  maintainer: the entry's claim may have changed, and no tool rewrites a rule. Three citations, on two
  addresses: the Alberta Investor Tax Credit (its page answers page not found; news reports say the
  program ended in 2019, not checked against an official page),
  and the two sources of the *Retained earnings planning* stage, "Paying dividends" and "Salary or
  dividends", which shared one address that was a corporation-return line about dividends received.

[`tests/moved-government-pages.spec.ts`](../../tests/moved-government-pages.spec.ts) holds the list: no
citation may cite a dead address except the three left for a person, and each moved citation points at
its new page with a tool check and no old read date. It never reaches the network; running
`node scripts/check-quotes.mjs` with no arguments re-checks the new pages with the rest.

## The reading list's tool checks (2026-10-23)

On 2026-10-23 the maintainer's reading list fetched the pages behind its 30 *Needs you first* items
(each an amount or a rule DotAmi shows next to the government's words) and, with the repo's matcher
(the same whole-word, one-block match as `scripts/check-quotes.mjs`), found on them words the
corrections of 2026-10-24 rely on. Each is recorded as a tool check of that day on the entry the
list checked, and on no other citation of the same page. They were found by the list's matcher, not
by a run of the script, so before merge a networked `node scripts/check-quotes.mjs` run (no
arguments) must find each again (rule 4). No person is recorded as having read these pages yet: the
maintainer's saved reads come in a later change, which adds `lastVerified` and `readBy: "person"`
to the citations he read.

| Page | Where it is cited | What the quotes are |
|---|---|---|
| CRA, the SR&ED tax incentives' rates (https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/what-are-sred-tax-incentives.html) | program *SR&ED tax incentives* (`grant-sred`; `SRED_WORDS`, [`lib/engines/grants/v2026/sred-official-words.ts`](../../lib/engines/grants/v2026/sred-official-words.ts)) | the basic 15% rate, the enhanced 35% for some corporations, and that some businesses may also earn a refundable credit. The page's own title isn't held, so the citation's title describes it. |
| CRA, *How certain relationships affect the small business deduction and SR&ED investment tax credits* | `grant-sred` (the CCPC rate) | some CCPCs may earn the enhanced 35% up to their expenditure limit for the year (never the page's worked example with an older limit) |
| CRA, *What's new for corporations* | `grant-sred` (the CCPC rate) | the expenditure limit for the enhanced 35% raised to $6 million (never the page's line that it lists proposed, announced or enacted changes) |
| Income Tax Act s.127(10.2) | `grant-sred` | the expenditure limit's formula, from $6 million. The list recorded "formula found" for this page, so the sentence that leads into it is not kept. |
| Alberta, *Canada-Alberta Productivity Grant* (https://www.alberta.ca/canada-alberta-productivity-grant) | program *Canada-Alberta Productivity Grant* (`grant-capg`, added 2026-10-24), named by map stage *Hire first employee* on road 0 | the employer's 25% and the program's 75% of eligible training costs, at most $5,000 per employed trainee and $100,000 per employer per fiscal year, and that an employer be operational in Alberta for at least one year. Fetched from the Canada-Alberta Job Grant's old address, which redirects there. |

The $6 million applies to tax years beginning on or after 2024-12-16. No held quote carries that
date, so it is kept here and in a comment on the CCPC rate only: no screen says it, and no field holds
it (the maintainer's answer of 2026-10-24).

## How this relates to the other checks

- **`verification`** (confirmed / supported / partial) is about the statute store: the provision's
  own text was read and compared with the entry. It is a different question from "were these words
  on the page", and it stays as it is.
- The task list's item *Check sources against the law's own words* ([docs/task-list.md](../task-list.md),
  [11b]) is the larger plan: a model proposes quotes, code checks them, a person decides. This page is
  the record and the checker that plan needs; the model step is not built.
