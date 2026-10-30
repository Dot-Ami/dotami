# How a source was checked: read, or checked by a tool

Last updated: 2026-10-27 (the maintainer's reads of 2026-10-25: every citation of the 31 pages he read
in full says "Read by a person on 2026-10-25", § The maintainer's reads of 2026-10-25; the same day, main
with #207 and #208 merged into the reading list's corrections: the two
checks that waited on them are plain checks, § The reading list's corrections; 2026-10-24: the reading
list's tool checks of 2026-10-23, § The reading list's tool checks, and the corrections they back, with
what is still blocked, § The reading list's corrections;
2026-10-13: pages that moved, § When a cited page moves; 2026-10-12: the first tool
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
  page under the compliance entry said `"model"` until 2026-10-12; it then carried a tool check
  instead (§ Tool checks in the catalogs). Since 2026-10-27 every citation of the 31 pages the
  maintainer read in full on 2026-10-25 says `"person"` too, that page among them (§ The
  maintainer's reads of 2026-10-25). Every other source leaves it out.
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
   The script never writes a file itself. Run with no arguments, it checks every tool check in the
   catalogs again (`lib/engines/all-citations.ts`), which shows when a page has changed under a citation.
   One check outside the catalogs, Anthropic's retention words on *What DotAmi knows about you*
   (`lib/privacy/anthropic-retention-official-words.ts`, 2026-10-27), is re-checked by running the script
   with `--url` and its quotes. One exception, closed on 2026-10-26:
   the tool checks dated 2026-10-23 (§ The reading list's tool checks) were recorded from the
   maintainer's reading list's matcher, the same whole-word, one-block match as the script, run that
   day where the script couldn't be. A networked `node scripts/check-quotes.mjs` run with no arguments
   found every one of them again on 2026-10-26 (25 citations, 49 quotes; all 779 quotes DotAmi holds
   were found that day), before the change that records them (the reading list's corrections) merged.
   Their `checkedOn` stays 2026-10-23, the day the words were first found, except the Productivity
   Grant's: since 2026-10-29 its citation holds one check of that day, a run of the script that found
   its four quotes of 2026-10-23 with the new ones (the maintainer's answer of 2026-10-29, § The reading
   list's corrections, *Blocked*, the Productivity Grant's other conditions).
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
on the map (and in the intake's preview), the line under "Delete" on *What DotAmi knows about you* (and,
since 2026-10-27, the intake's row there, for Anthropic's own retention page),
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
  abbreviation) still count as one run of text. The one way across a cell's edge is a table row's
  own piece, next.

**A table row as one piece** (since 2026-10-29, the maintainer's answer of that day: "Teach the
checker to read a table row as one piece"). Every row (`<tr>`) with two cells or more also gives one
piece of its own: its cells' text in order, joined by **` | `** (a space, a vertical bar, a space).
A quote addresses a row by writing it that way, label cell first: on Alberta's Productivity Grant page
the funding table's row is found as
`Employer | Must contribute 25% of the total eligible training costs … they intend to hire.` Every cell
stays a block of its own as well, so a cell alone is found as before, and every quote found before
this change is found the same way: on 2026-10-29 the no-argument run on the old code found all 784
recorded quotes, and on the new code all 806, the same 784 and the Productivity Grant's 22 new ones.
What the joiner can and can't do:

- It stands only for the edge between two cells of one row. Rows never join: no quote runs from one
  row into the next, even where the page leaves out a closing `</tr>`.
- Inside a cell, a list item, a paragraph or a line break still ends a piece. So across an edge a
  quote reaches only the nearest item on each side: the label cell and the first line of a list
  beside it, never its second line (`Government of Alberta | Contributes the other 75% …` is found;
  the same label before that cell's second line, *An employer is eligible …*, is not).
- Without the joiner, or with another one (`Employer Must contribute …`, `Employer: Must contribute
  …`), the label and its line are still two pieces, and a wrong label (`Government of Alberta | Must
  contribute 25% …`) is not found.
- A row the page hides (the `hidden` attribute, an inline `display:none`) is never read, and a row
  that holds another table gives no piece of its own (the inner table's rows give theirs).
- A page may write ` | ` inside one block of its own (Tradesecrets' *"Red Seal Application |
  $150"*, a list item): such a quote is found there, as before. So a ` | ` in a quote means a cell's
  edge or the page's own bar; either way the words sit side by side as the quote has them.
- It finds words in a row only as whole words, like any quote, so a quoted label shows the label sits
  beside its line in one row, not that its cell holds nothing else.
- **It can't help a table a script draws.** It reads the page's HTML as fetched; a table the page's
  own script fills in after loading isn't in that HTML, so its rows can't be found. The CRA's table
  of GST/HST rates is one (the *Blocked* items on Alberta's 5% and Ontario's 13% below): the row
  reading doesn't settle them.

It prints *found* or *not found* for every quote and exits with code 1 if any quote is missing or a
page couldn't be fetched, and 2 for a usage error (a quote under three words among them). When every
quote is found it prints the date to record as `checkedOn`.

A PDF is not read by the script (it says so and counts the citation as not checked); a person reads
PDFs. Its test, [`tests/check-quotes.spec.ts`](../../tests/check-quotes.spec.ts), uses saved sample
pages and never reaches the network.

## Tool checks in the catalogs

The first ones, recorded on 2026-10-12 for the pages the honest map (#145) quotes, each after
`node scripts/check-quotes.mjs --url … --quote …` found every quote on the live page. None of
these pages was recorded as read by a person then, so each card said *Checked by a tool on 2026-10-12*
in amber. The CRA's *When to register for and start charging the GST/HST* was read in full by the
maintainer on 2026-10-25, so its citations say *Read by a person on 2026-10-25* now and keep their tool
checks (§ The maintainer's reads of 2026-10-25); the other pages below still say *Checked by a tool*.

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

On 2026-10-23 (the maintainer's call a-call-12) map stage *Hire first employee* gained Alberta's own
*Employment standards* page (https://www.alberta.ca/employment-standards,
[`lib/engines/cfe/v2026/nodes.ts`](../../lib/engines/cfe/v2026/nodes.ts)), now that every road shows a
person only the federal pages and their own province's: a tool found *"Employment standards set out the
rights and obligations of employers and employees in Alberta."* and *"This includes the minimum
standards that employers must provide to employees."* on it that day. It had no read date, so its card
said *Checked by a tool on 2026-10-23* in amber until the maintainer read it in full on 2026-10-25; it
says *Read by a person on 2026-10-25* now.

## Waiting for the maintainer's read

Sources added with a tool check only, for a person to read (the maintainer's call d-call-5: a person
reads money amounts and the rules that add a step; a source page is added checked by a tool and
labelled so). Once read, the citation gains `lastVerified` (the day) and `readBy: "person"`, and
its row leaves this list.

| Added | Page | Where it is cited | What to read for |
|---|---|---|---|

None waits now. The three pages listed here until 2026-10-27 (Alberta's *Employment standards* on *Hire
first employee*, Income Tax Regulations s.7307 under *Motor vehicle expenses*, and ISED's *Helping small
businesses get loans* under the Canada Small Business Financing Program), and the pages the reading list's
corrections added with a tool check only (the Canada-Alberta Productivity Grant's page and the SR&ED
pages among them), were read in full by the maintainer on 2026-10-25 (§ The maintainer's reads of
2026-10-25).

## The maintainer's reads of 2026-10-25

On 2026-10-25 the maintainer read 31 source pages in full, from a reading list built for him from the
pages the reading list's corrections cite (each entry named the page, every place DotAmi cites it and what
to read it for). He ticked each one *I've read it in full now* on that list, the same day; the ticks are
recorded there, on his reading-list page. On 2026-10-24 he had decided that his reads made with an AI
model's help count as a person's read, but only for the pages he actually checked himself: these 31.

Every citation of those pages, in every catalog
([`lib/engines/all-citations.ts`](../../lib/engines/all-citations.ts)), now has `lastVerified:
"2026-10-25"` and `readBy: "person"` (rule 5; `MAINTAINER_READ_ON` in
[`lib/engines/shared/maintainer-reads.ts`](../../lib/engines/shared/maintainer-reads.ts)), so its source
says *Read by a person on 2026-10-25*, in grey. A read on record before it (dated 2026-05-01 to 2026-10-08,
none recording who read it) is replaced, and the citation's comment says when it was; a tool
check it had stays in the catalog (the readout API returns it), and the read wins on screen (rule 3), so
the words a tool found are no longer listed under these sources. The roads build their citations from page
objects, so there the read is the page's `read`, which every citation of that page copies. Each road's own
date is worked out from its sources, so all three moved: road 0's and the federal road's from 2026-05-01,
and the apprentice road's from empty, to 2026-10-25. Nothing else changed: no title, address, note,
quote or tool check.
[`tests/maintainer-reads.spec.ts`](../../tests/maintainer-reads.spec.ts) holds every citation of the 31
pages at that read, and no other citation at that day, reading the pages from
[`tests/fixtures/maintainer-reads-2026-10-25.ts`](../../tests/fixtures/maintainer-reads-2026-10-25.ts),
copied from his list.

| # | Page | Citations |
|---|---|---|
| 1 | [SR&ED tax incentives: the credit's rates](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/what-are-sred-tax-incentives.html) | 1 |
| 2 | [How certain relationships affect the small business deduction and SR&ED investment tax credits](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/business-tax-credits/how-relationships-affect-small-business-deduction-sred-investment-tax-credits.html) | 11 |
| 3 | [What's new for corporations](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/whats-new-corporations.html) | 1 |
| 4 | [T2 Corporation Income Tax Guide - Small business deduction](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html) | 4 |
| 5 | [Determine if you need to register for a payroll account](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/open-manage-payroll-account/determine-need-register.html) | 9 |
| 6 | [Where to keep your records, for how long and how to request the permission to destroy them early](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html) | 7 |
| 7 | [T4002 Chapter 4 — Capital cost allowance (immediate expensing measures)](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html) | 2 |
| 8 | [Income Tax Act s.127(10.2) — expenditure limit](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.html) | 1 |
| 9 | [Canada-Alberta Productivity Grant](https://www.alberta.ca/canada-alberta-productivity-grant) | 1 |
| 10 | [Helping small businesses get loans (Canada Small Business Financing Program)](https://ised-isde.canada.ca/site/canada-small-business-financing-program/en/canada-small-business-financing-program/find-loan-your-small-business/helping-small-businesses-get-loans) | 2 |
| 11 | [Income Tax Regulations s.7307 — the amounts prescribed for the interest and lease caps (ss.67.2, 67.3)](https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._945/section-7307.html) | 1 |
| 12 | [Employment standards](https://www.alberta.ca/employment-standards) | 3 |
| 13 | [Business-use-of-home expenses](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html) | 2 |
| 14 | [Business income](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html) | 1 |
| 15 | [Income Tax Act s.18(1)(a), s.67, s.67.2, s.67.3 — purpose test, reasonableness, interest and lease caps](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-67.3.html) | 1 |
| 16 | [Income Tax Act s.245 — General Anti-Avoidance Rule](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-245.html) | 3 |
| 17 | [Canada Small Business Financing Program](https://ised-isde.canada.ca/site/canada-small-business-financing-program/en) | 1 |
| 18 | [When to register for and start charging the GST/HST](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html) | 24 |
| 19 | [Scientific Research and Experimental Development (SR&ED) tax incentives](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html) | 1 |
| 20 | [GST/HST rates / Harmonized sales tax](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html) | 2 |
| 21 | [Motor vehicle expenses](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses/motor-vehicle-expenses.html) | 1 |
| 22 | [Sole proprietorship](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html) | 19 |
| 23 | [Business registration with the CRA](https://www.canada.ca/en/services/taxes/business-registration.html) | 3 |
| 24 | [Corporation](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/corporation.html) | 11 |
| 25 | [SR&ED claim preparation / SR&ED expenditures](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-claim.html) | 4 |
| 26 | [SR&ED glossary](https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/glossary.html) | 3 |
| 27 | [Set up and manage employee payroll information](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/set-up-new-employee.html) | 5 |
| 28 | [Federal incorporation](https://ised-isde.canada.ca/site/corporations-canada/en/federal-incorporation) | 5 |
| 29 | [Provincial Sales Tax (PST)](https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst) | 1 |
| 30 | [Employment standards](https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards) | 3 |
| 31 | [Small business - Your guide to the Employment Standards Act](https://www.ontario.ca/document/your-guide-employment-standards-act-0/small-business) | 3 |

136 citations in all, as [`lib/engines/all-citations.ts`](../../lib/engines/all-citations.ts) lists
them (a map stage's sources count again under each road that draws the stage).

What his reads don't settle, and stays open:

- **The tool checks of 2026-10-23** (rule 4's exception): a read of a page says nothing about whether
  `node scripts/check-quotes.mjs` finds the list's quotes on it. That was settled apart from his reads: a
  networked run found each of them on 2026-10-26, before the reading list's corrections merged.
- **Two pages' questions his ticks don't answer.** The CRA's page on which GST/HST rate to charge was on the
  list for its table of rates (Ontario at 13% HST, Alberta at 5% GST with no provincial sales tax): the read is
  recorded, but what he found in the table isn't, so *Blocked* items 1 and 2 below stay as they are. And
  s.67.3 of the Act was on it with a question, whether the citation's title (which also names s.18(1)(a),
  s.67 and s.67.2, not on that page) or its address should change: the citation is unchanged until he says.

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
  maintainer: the entry's claim may have changed, and no tool rewrites a rule. Two citations, on one
  address: the two sources of the *Retained earnings planning* stage, "Paying dividends" and "Salary or
  dividends", which shared one address that was a corporation-return line about dividends received.
  (A third, the Alberta Investor Tax Credit's page, left on 2026-10-23 with the program itself: the
  maintainer took it off the catalog, call a-call-1; docs/engines/grants.md, *Retired programs*.)

[`tests/moved-government-pages.spec.ts`](../../tests/moved-government-pages.spec.ts) holds the list: no
citation may cite a dead address except the two left for a person, and each moved citation points at
its new page with a tool check and no old read date. It never reaches the network; running
`node scripts/check-quotes.mjs` with no arguments re-checks the new pages with the rest.

## The reading list's tool checks (2026-10-23)

On 2026-10-23 the maintainer's reading list fetched the pages behind its 30 *Needs you first* items
(each an amount or a rule DotAmi shows next to the government's words) and, with the repo's matcher
(the same whole-word, one-block match as `scripts/check-quotes.mjs`), found on them words the
corrections of 2026-10-24 rely on. Each is recorded as a tool check of that day on the entry the
list checked, and on no other citation of the same page. They were found by the list's matcher, not
by a run of the script; a networked `node scripts/check-quotes.mjs` run (no arguments) found each
again on 2026-10-26, before merge (rule 4). The maintainer read every one of these pages in full on
2026-10-25 (§ The maintainer's reads of 2026-10-25), so each of their citations carries his read now,
which wins on screen, and keeps its tool check; his read didn't stand in for that networked run.

| Page | Where it is cited | What the quotes are |
|---|---|---|
| CRA, the SR&ED tax incentives' rates (https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/what-are-sred-tax-incentives.html) | program *SR&ED tax incentives* (`grant-sred`; `SRED_WORDS`, [`lib/engines/grants/v2026/sred-official-words.ts`](../../lib/engines/grants/v2026/sred-official-words.ts)) | the basic 15% rate, the enhanced 35% for some corporations, and that some businesses may also earn a refundable credit. The citation's title is the page's own, *What are SR&ED tax incentives*, since `node scripts/check-quotes.mjs` found it on the page on 2026-10-27; until then it described the page. |
| CRA, *How certain relationships affect the small business deduction and SR&ED investment tax credits* | `grant-sred` (the CCPC rate); map stages *Incorporation for liability/SR&ED* (`stage-3b-incorporation-liability-sred`, whose read wins on screen) and *SR&ED deepening* (`stage-4-sred-deepening`, a new source of that stage, a tool check only until the maintainer's read of 2026-10-25), each quoting it for its 35% (*SR&ED deepening*'s 35% quotes the SR&ED glossary since 2026-10-27, and the stage keeps this page for its tax impact) | some CCPCs may earn the enhanced 35% up to their expenditure limit for the year (never the page's worked example with an older limit) |
| CRA, T2 guide chapter 4 (https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html) | map stage *Incorporating* (`stage-3a-incorporation-80k-net`, [`lib/engines/cfe/v2026/nodes.ts`](../../lib/engines/cfe/v2026/nodes.ts)), its business-limit estimate | that the maximum allowable business limit for a corporation not associated with any other is $500,000 (the list's quote), and that CCPCs "throughout the tax year may be able to claim the small business deduction", the words structure-ccpc's citation of the page holds from its own check of 2026-10-13, which keeps that date. The list found both held quotes for the page that day. The stage's read wins on screen (2026-05-01, the maintainer's of 2026-10-25 since then). |
| CRA, *Determine if you need to register for a payroll account* | map stage *Hire first employee* (`branch-hire-first-employee`), its payroll account timing | that you register for a payroll account before the first remittance due date, and when that date is (the list's quote): the two sentences road 0's `dw-start-hire-payroll-account` holds from its check of 2026-10-12, which keeps that date. The list found all five quotes held for the page that day. The stage's read wins on screen (2026-05-01, the maintainer's of 2026-10-25 since then). |
| CRA, *What's new for corporations* | `grant-sred` (the CCPC rate) | the expenditure limit for the enhanced 35% raised to $6 million (never the page's line that it lists proposed, announced or enacted changes) |
| Income Tax Act s.127(10.2) | `grant-sred` | the expenditure limit's formula, from $6 million. The list recorded "formula found" for this page, so the sentence that leads into it is not kept. |
| CRA, *Where to keep your records, for how long and how to request the permission to destroy them early* | the Delete menu's records line (`cra-business-records-retention`, [`lib/engines/compliance/v2026/record-keeping.ts`](../../lib/engines/compliance/v2026/record-keeping.ts)) | that records are generally kept six years from the end of the last tax year they relate to, and for a different period in some situations: the two sentences every road's *Keep your records from day one* step holds from its own check of 2026-10-14, which keeps that date. The list found all ten quotes held for this page that day. The citation's read wins on screen (rule 3; 2026-10-08, the maintainer's of 2026-10-25 since then). |
| Alberta, *Canada-Alberta Productivity Grant* (https://www.alberta.ca/canada-alberta-productivity-grant) | program *Canada-Alberta Productivity Grant* (`grant-capg`, added 2026-10-24), named by map stage *Hire first employee* on road 0 | the 25% and the other 75% of eligible training costs (who contributes which isn't in the quotes), at most $5,000 per employed trainee and $100,000 per employer per fiscal year, and “be operational in Alberta for at least one year”. Fetched from the Canada-Alberta Job Grant's old address, which redirects there. Since 2026-10-29 the citation's one check is of that day: one run of the script found these four with the funding table's two rows and the page's sentences found on 2026-10-27 (*Blocked*, the Productivity Grant's other conditions). |
| CRA, Guide T4002, chapter 4 (https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html) | risk read *Enhanced first-year deduction timing* (`risk-immediate-expensing-timing`, [`lib/engines/risk/v2026/triggers.ts`](../../lib/engines/risk/v2026/triggers.ts)) | the guide's sentence on the dates for Class 44, 46 or 50 property under proposed changes. It ends on a colon before the factors, which aren't held, so no screen quotes it. The Class 50 write-off's citation of the same chapter keeps no tool check (its read of 2026-07-02 is the maintainer's of 2026-10-25 since then). |
| ISED, the program's loans page (https://ised-isde.canada.ca/site/canada-small-business-financing-program/en/canada-small-business-financing-program/find-loan-your-small-business/helping-small-businesses-get-loans) | the loan program's risk read (`risk-self-declared-valuation`) | that for real property and equipment, security must be taken on the assets financed. The read cited ISED's program hub until 2026-10-24. The citation's title is the page's own, *Helping small businesses get loans*, since `node scripts/check-quotes.mjs` found it on the page on 2026-10-27; until then it described the page. The program's own card (`grant-csbfp`) cites the page too, with #208's tool check of the same day (listed under § Waiting for the maintainer's read until his read of 2026-10-25), so the page the box quotes is listed under the card. |

Two more risk reads quote pages whose words were already held, so they keep those checks' dates
rather than the list's: the home office read quotes the CRA's *Business-use-of-home expenses* in the
quotes the home office write-off's citation of that page holds (four from its check of 2026-10-13; since
2026-10-27 a fifth, the page's sentence on working out the business part, which one run found with the
four that day, so both citations' checks are of that day),
and the anti-avoidance read (`risk-ladder-skipping`) quotes Income Tax Act s.245 in four of the five
phrases docs/glossary.md's GAAR entry holds from `node scripts/check-quotes.mjs` on 2026-10-12. That citation
(`S245_CITATION`, [`lib/engines/risk/v2026/gaar-official-words.ts`](../../lib/engines/risk/v2026/gaar-official-words.ts))
kept the risk catalog's read of 2026-07-02, now the maintainer's of 2026-10-25, which wins on screen, and
is also listed under the Holding company and Family trust cards, where that read shows: a risk box draws
no sources of its own.

One map stage cites a page for a quote whose check was already held, so it keeps that check's date:
*Sole Prop activation* (`stage-1-sole-prop-activation`) said "Track gross revenue against" the CRA's
$30,000 tests and cited neither page that sets them. Since 2026-10-24 its note quotes what the CRA says a
sole proprietor counts toward the tests and what is left out, and the stage cites the CRA's *When to
register for and start charging the GST/HST*, with a tool check of 2026-10-12 holding those words and
"You exceed the $30,000": each is a quote the two GST/HST stages or road 0's `dw-start-gstman-tests` line
holds from `node scripts/check-quotes.mjs` that day (`CRA_SOLE_PROPRIETOR_COUNTS` and `CRA_NOT_COUNTED`,
[`lib/engines/compliance/v2026/gst-official-words.ts`](../../lib/engines/compliance/v2026/gst-official-words.ts)).
The list found all 22 quotes held for that page on 2026-10-23. The new source had no read, so it said
"Checked by a tool" in amber under the stage until the maintainer read the page on 2026-10-25; it says
"Read by a person on 2026-10-25" now.

One page the list opened gets no tool check: the CRA's page on which GST/HST rate to charge, cited by
*Ontario HST (13%)* and *Alberta — no provincial sales tax*. Its table of rates isn't in the page's
HTML, so no tool can find one of its rows, and the two sentences the list found there with a rate
are worked examples (an Ontario furniture store's sale, a Manitoba electronics store's), which are
never recorded as the rate (docs/engines/compliance.md, § From the maintainer's reading list).

The $6 million applies to tax years beginning on or after 2024-12-16. No held quote carries that
date, so it is kept here and in a comment on the CCPC rate only: no screen says it, and no field holds
it (the rule: no number or date on screen without a held quote).

## The reading list's corrections (2026-10-24)

The maintainer's reading list of 2026-10-23 checked 30 entries, and his answers of 2026-10-24 decided
what changed. 23 of them are below. The other seven belong to other changes: the Canada-Alberta Job
Grant and the Alberta Investor Tax Credit (`grant-cajg`, `grant-abti`, three items) and Alberta's
employment-standards page on *Hire first employee* (one item) to #207; the loan program's equipment
limit and its 365-day line (`grant-csbfp`, two items) and the vehicle's interest and lease caps
(`writeoff-vehicle`, one item) to #208, both merged before this change. The 365-day line stays out (his
answer 5).

**Merged after #207 and #208** (main merged in on 2026-10-27). Two of its rows lean on theirs. The Job
Grant's address opens the Productivity Grant's page, so while `grant-cajg` was in the catalog an
Alberta idea in the Job Grant's kinds of work would have shown two cards for one program; #207 took it
off. And the loan program's risk box quotes ISED's loans page, which a risk box doesn't draw; #208 added
that page to `grant-csbfp`, so it is under the card. Each was an `it.fails` check until the merge, and
each turned red then and is a plain check now (`tests/productivity-grant.spec.ts`, which also holds
`grant-cajg` in #207's `RETIRED_GRANT_PROGRAMS` and `grant-capg` out of it;
`tests/reading-list-corrections.spec.ts` § 6). Road 0's 11 panels in the panels fixture were redrawn
from the merged code at that merge (`tests/cost-panels-unchanged.spec.ts`).

Three rules from his answers hold for every row:

- **His reads are recorded only as he made them.** Until 2026-10-27 no read of his was recorded, and
  each source below said what it said before, or "Checked by a tool" in amber where a tool check was all
  it had. His answers 1 and 2 gave `lastVerified` and `readBy: "person"` only to the citations he checked.
  His reading list of 2026-10-25 was by page, and named under each page every place DotAmi cites it; he
  read all 31 of its pages in full, so every citation of them carries his read now, and no citation of any
  other page does (§ The maintainer's reads of 2026-10-25).
- **A correction stands on a quote, never on his note alone.** The quote is one a citation already
  held, or one the list's matcher found on the live page on 2026-10-23, kept as a tool check of that
  day (§ The reading list's tool checks). Where no quote says it, the entry says only what is quoted, or
  nothing, and the gap is listed under *Blocked* below.
- **An entry with nothing sourced left to say comes off,** and its id is kept with the reason in its
  catalog's retired list and never used for anything else (IDs are forever).

| Entry | Reading-list item(s) | What changed | The evidence |
|---|---|---|---|
| *SR&ED tax incentives* (`grant-sred`) | `grant-sred/estimatedValue`, `grant-sred/rate-unincorporated`, `grant-sred/rate-ccpc`, `sred-expenditure-limit-6-million` | A sole proprietor's card no longer calls the 15% credit non-refundable; it quotes the basic rate and that some businesses may also earn a refundable credit. The CCPC's note quotes the enhanced 35% up to the expenditure limit, and the $6 million limit, where it said "confirm the current limit with an advisor"; its card and the fork no longer call the 35% "refundable", a word no quote holds (*Blocked*). The range "15–35%" (on no screen) is unchanged. | Four new sources, tool checks of 2026-10-23: the CRA's rates page, its relationships page, *What's new for corporations*, and s.127(10.2)'s formula ([grants.md](grants.md)) |
| *Ontario HST (13%)* (`compliance-on-hst`) | `compliance-on-hst` | Unchanged. | None held: the rate table isn't in the page's HTML, and the one 13% sentence found is a worked example (*Blocked*) |
| *Alberta — no provincial sales tax* (`compliance-ab-no-pst`) | `compliance-ab-no-pst` | "… simplifying provincial sales tax compliance" is gone. The line says "The CRA's table of GST/HST rates lists Alberta at 5% GST, with no provincial sales tax.", which is still DotAmi's wording of a table row, and the catalog says so beside it. | None held, for the same reason (*Blocked*) |
| *BC Provincial Sales Tax (PST)* (`compliance-bc-pst`) | `compliance-bc-pst` | Unchanged. | No quote is held from its page |
| *Ontario food premises licensing* (`compliance-food-premises-on`) | `compliance-food-premises-on` | Retired: it cited a revoked regulation and said more than it ([compliance.md](compliance.md), § Retired rules). | A retirement claims nothing: the reading list notes the cited regulation is revoked, and the one in force hasn't been read (*Blocked*) |
| The Delete menu's records line (`cra-business-records-retention`) | `cra-business-records-retention` | The line is unchanged (it already said "generally"); its citation also keeps the CRA's two sentences. Four design-doc lines that gave the six years without "generally" now give it. | Tool check of 2026-10-23; a read wins on screen (2026-10-08, the maintainer's of 2026-10-25 since then) |
| Home office read (`risk-home-office-percentage`) | `risk-home-office-percentage` | DotAmi's own words on floor area and exclusive use are gone; the box quotes the CRA's two conditions and the limit to the business's net income, and since 2026-10-27 the page's sentence on working out the business part (a reasonable basis, "such as" the workspace's share of the home's area). | The quotes the home office write-off's citation of the page holds (tool check of 2026-10-13, of 2026-10-27 since the fifth joined) |
| First-year deduction read (`risk-immediate-expensing-timing`) | `risk-immediate-expensing-timing` | "Getting the year wrong misstates income and unwinds on review" and "keep purchase and deployment records" are gone; the rest stays. | The guide's sentence on the dates, tool check of 2026-10-23, on no screen (it ends on a colon) |
| Repeated-losses read (`risk-hobby-reclassification`) | `risk-hobby-reclassification` | Retired: its one page supports none of it ([risk-calculator.md](../brain/risk-calculator.md), § Retired risk reads). | No held quote from a page that does (*Blocked*) |
| Anti-avoidance read (`risk-ladder-skipping`) | `risk-ladder-skipping` | DotAmi's advice ("professional advice tied to a genuine business purpose, documented at the time") is gone; the box lists s.245's own phrases, joined by nothing of DotAmi's, and the Holding company and Family trust cards list s.245 as a source. | Four of the five phrases docs/glossary.md's GAAR entry holds (tool check of 2026-10-12) |
| Loan program read (`risk-self-declared-valuation`) | `risk-self-declared-valuation` | Kept (his answer 3), saying only ISED's rule on security; "the lesser of purchase price or appraised value" is gone. It cites ISED's loans page in place of the program's hub. | “For real property and equipment, security must be taken on the assets financed.”, tool check of 2026-10-23 |
| *Sole Prop activation* (`stage-1-sole-prop-activation`) | `stage-1-sole-prop-activation/projection-30000` | "Track gross revenue against" the two tests is gone; the note quotes what the CRA says a sole proprietor counts and what is left out, and points to *Mandatory GST registration* for the tests. | A new source, *When to register for and start charging the GST/HST*, with the tool check of 2026-10-12 those words already had |
| *Incorporating* (`stage-3a-incorporation-80k-net`) | `stage-3a-incorporation-80k-net/sbd-limit` | The business limit's "$500,000", which read as automatic, is "Up to $500,000", on the T2 guide's words: CCPCs “may be able to claim” the deduction. | Tool check of 2026-10-23 on the T2 guide's citation; a read wins on screen (2026-05-01, the maintainer's of 2026-10-25 since then) |
| *Incorporation for liability/SR&ED* (`stage-3b-incorporation-liability-sred`) | `stage-3b-incorporation-liability-sred/35` | The 35% quotes the CRA: some CCPCs, up to their expenditure limit for the year. | Tool check of 2026-10-23 on the relationships page's citation; a read wins on screen (2026-05-01, the maintainer's of 2026-10-25 since then) |
| *SR&ED deepening* (`stage-4-sred-deepening`) | `stage-4-sred-deepening/35` | The 35% quotes the same CRA line (his answer 4); "subject to taxable income limits" is gone from its tax impact. Since 2026-10-27 the 35% quotes the SR&ED glossary's own entry, the line he asked for; the relationships page stays for the tax impact. | The relationships page as a third source, tool check of 2026-10-23 (and the maintainer's read of 2026-10-25 since then); the glossary's citation, tool check of 2026-10-27 (its two quotes and the 35% line, found together) |
| *Hire first employee* (`branch-hire-first-employee`) | `branch-hire-first-employee/payroll-timing` | "Before first remittance due date" is “before the first remittance due date”, on the CRA's two sentences. | Tool check of 2026-10-23 on the payroll page's citation; a read wins on screen (2026-05-01, the maintainer's of 2026-10-25 since then) |
| *Canada-Alberta Productivity Grant* (`grant-capg`) | `capg-75-percent`, `capg-5000-per-trainee`, `capg-100000-per-employer`, `capg-operational-one-year` | Added (his call a-call-1), saying only the page's words, in curly quote marks, with no subject before the 25% and 75% lines (none was held until 2026-10-29, when the table's own row labels came on: *Blocked*); the one-year rule is on no card's line; it was among the words found on the page under the card's source until the maintainer's read of 2026-10-25, which wins there, so it is on no screen now ([grants.md](grants.md)). | Four quotes, tool check of 2026-10-23 (since 2026-10-29 one check of that day holding them with the new quotes) |

### Blocked: what each needs

Each needs an official page's own words, found by `node scripts/check-quotes.mjs` on a networked
machine, before DotAmi says more than it does now. They are listed in [task-list.md](../task-list.md)
[11b] too.

1. **Alberta, no PST and GST at 5%.** A page whose HTML says it. Alberta's *About Tax and Revenue
   Administration* ("Alberta has no sales tax.", [S17] in
   [other-ways-to-build.md](../architecture/other-ways-to-build.md)) is a candidate no tool has checked,
   and it says nothing of the 5%. Or the maintainer's ruling on how a row of a table is recorded.
   The card's line credits the CRA's table with "no provincial sales tax", on the maintainer's read
   alone: no tool can see the table, and a rate table may show only Alberta's 5% GST (British
   Columbia, which has a PST, would show the same). His read of the page is recorded (2026-10-25), but
   what he found in the table isn't: his word on the Alberta row settles it; if the table shows only the
   5%, the line says only that.
2. **Ontario's 13% HST.** The same table.
3. **Ontario food premises.** The regulation in force, read, and what it requires, quoted, under a new
   id.
4. **Repeated losses.** A CRA, Act or folio page on business versus personal pursuits, with its words.
5. **SR&ED, refunded or not.** Whether, and how much of, a sole proprietor's 15% credit is refunded,
   and whether a CCPC's enhanced 35% is: no held quote says either (the CCPC's "refundable" rested on
   the maintainer's read alone), so neither card says it. Looked for on 2026-10-27, and the CRA's own
   pages say different things, each found by the script that day: the relationships page the card
   already cites (its page date 2025-07-21), “Corporations and unincorporated businesses may earn a
   non-refundable ITC at the rate of 15%.”; the CRA's *SR&ED Investment Tax Credit Policy* (2026-10-07,
   not cited yet), “Generally, for an individual (other than a trust), the refundable ITC is 40% of the
   unclaimed balance of ITC earned in the current year for qualified SR&ED expenditures.” The policy
   page's CCPC lines run to several kinds of corporation and expenditure, so a part of them would read
   as the whole. Which page, if either, the card quotes is the maintainer's call.
6. **SR&ED's $6 million.** The tax years it applies from (beginning on or after 2024-12-16) are in no
   held quote, and only the formula of s.127(10.2) is held, not the sentence that leads into it. The
   same policy page says “For tax years that begin after December 15, 2024, the maximum expenditure
   limit is $6 million per year.” (found 2026-10-27); it waits with item 5, since it would be that
   page's first citation, and the card's date guard (no year of DotAmi's own) is the maintainer's
   NO TIMES call.
7. **The Productivity Grant's other conditions.** Settled on 2026-10-29 by the maintainer's two
   answers of that day (his reading page, item 5; "Yes, build them"), except two things below.
   - *The labels before the 25% and 75% lines* ("Teach the checker to read a table row as one
     piece"): the checker reads a table row as one piece (§ The checker), and found the funding
     table's rows "Employer | Must contribute 25% …" and "Government of Alberta | Contributes the other
     75% …" on the page, so the card writes Employer: “Must contribute 25% …” and Government of Alberta:
     “Contributes the other 75% …”, the labels being the page's own cells.
   - *The sentences found on the page on 2026-10-27* ("One new check that holds the old and new
     sentences", dated by its run): its requirements for registered employers, what training and costs
     count, and who delivers and funds it. One run of `node scripts/check-quotes.mjs --url … --quote …`
     found all 26 quotes (the four of 2026-10-23, the two rows, these sentences) on 2026-10-29, and the
     citation holds that one check, dated 2026-10-29 ([grants.md](grants.md)). The three items that are
     times (the one-year rule, “have an active legal entity status throughout the grant term” and “be
     completed within 52 weeks”) are in the check only, on no line; `authority` is "Alberta / federal",
     on the page's sentence quoted in the catalog's comment. His read of 2026-10-25 stays and wins on
     screen.
   - *Still open:* whether a sole proprietor counts as an employer (the page never says "sole
     proprietor", so no line says either way), and the CAPG applicant guidelines the page points to for
     full details, unread (open.alberta.ca refused one plain fetch on 2026-10-27, not retried).

Three more were settled on 2026-10-27 (four changes, counting the two titles), each by
`node scripts/check-quotes.mjs` finding the words on the live page that day:

- **SR&ED deepening's 35% from the SR&ED glossary**, the line the maintainer asked for. The stage's
  35% quotes it (“Some Canadian-controlled private corporations (CCPCs) that meet certain requirements
  may earn investment tax credits at the enhanced rate of 35%”), and the glossary's citation holds it
  with its two older quotes, found together, so its check is of that day. The entry's next sentence (a
  $3 million threshold, older than the $6 million the CRA's other pages give) is never quoted.
- **Home office: how to work out the business part.** The box quotes the page's sentence: “To
  calculate the part you can deduct, use a reasonable basis, such as the area of the workspace divided
  by the total area of your home.” Both citations of the page hold it with their four older quotes,
  found together, so their checks are of that day.
- **Two pages' own titles:** *What are SR&ED tax incentives* (the CRA's rates page) and *Helping small
  businesses get loans* (ISED's loans page), each the page's main heading, are now the citations'
  titles. Their tool checks are unchanged: a title isn't words an entry relies on.

Another, every tool check of 2026-10-23 (found by the list's matcher, not a run of the script), was
settled on 2026-10-26: a networked `node scripts/check-quotes.mjs` run with no arguments found each of
them again (rule 4).

### Outside the list: open questions for the maintainer

Three things on the same cards say in DotAmi's own words what the corrections above took out or
couldn't source. None is one of the entries he checked, so none is changed here (his answer 2: only
the entries he checked); each waits for his call. They are listed in [task-list.md](../task-list.md)
[11b] too.

1. **The structure ladder's fork label.** The Holding company and Family trust cards show the fork
   "Holding company (Holdco) needs a real business purpose first" (and the same for Family trust;
   `lib/brain/evaluate.ts` `evaluateStructureStep`), right above the anti-avoidance box that no
   longer speaks of a business purpose. The label states a requirement no held quote states.
2. **"Professional required" over two boxes.** The anti-avoidance read and the loan program's read
   keep `severity: "professional-required"`, so their boxes are headed "Professional required"
   (`components/node-detail-panel.tsx`, `components/discovery/intake-page.tsx`). The heading is
   DotAmi's own calibration ([risk-calculator.md](../brain/risk-calculator.md), § Severity
   semantics): the maintainer's note on the anti-avoidance read is that s.245 asks for no professional
   advice, and ISED's quoted rule names none. `tests/engine-integrity.spec.ts` holds every GAAR read at
   `professional-required`, so changing either heading is his call, not a test edit.
3. **The Hobby vs. business income test card** (`compliance-hobby-vs-business`). Its description and
   line say the CRA weighs a reasonable expectation of profit and business-like conduct, citing the
   CRA's *Setting up your business*: the page the retired hobby read's record says supports neither
   (`RETIRED_RISK_ENTRIES`). It is another citation of the same page. He read the page in full on
   2026-10-25, so its source says "Read by a person on 2026-10-25"; the card's words are unchanged, and
   whether the page supports them is still his call.

## How this relates to the other checks

- **`verification`** (confirmed / supported / partial) is about the statute store: the provision's
  own text was read and compared with the entry. It is a different question from "were these words
  on the page", and it stays as it is.
- The task list's item *Check sources against the law's own words* ([docs/task-list.md](../task-list.md),
  [11b]) is the larger plan: a model proposes quotes, code checks them, a person decides. This page is
  the record and the checker that plan needs; the model step is not built.
