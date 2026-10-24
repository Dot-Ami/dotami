# How a source was checked: read, or checked by a tool

Last updated: 2026-10-24 (the reading list's tool checks of 2026-10-23, § The reading list's tool
checks, and the corrections they back, with what is still blocked, § The reading list's corrections;
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
   again, which shows when a page has changed under a citation. One open exception, waiting for the
   maintainer's word (proposed 2026-10-24 by the session that built the change, not decided by him): the tool checks dated 2026-10-23 (§ The reading list's tool checks) were
   recorded from his reading list's matcher, the same whole-word, one-block match as the script, run
   that day where the script couldn't be. They are not confirmed by the script yet: a networked
   `node scripts/check-quotes.mjs` run with no arguments must find each of them again before the
   change that records them (the reading list's corrections) merges, not later with his reads.
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
| CRA, *How certain relationships affect the small business deduction and SR&ED investment tax credits* | `grant-sred` (the CCPC rate); map stages *Incorporation for liability/SR&ED* (`stage-3b-incorporation-liability-sred`, whose read of 2026-05-01 still wins on screen) and *SR&ED deepening* (`stage-4-sred-deepening`, a new source of that stage, tool check only), each quoting it for its 35% | some CCPCs may earn the enhanced 35% up to their expenditure limit for the year (never the page's worked example with an older limit) |
| CRA, T2 guide chapter 4 (https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html) | map stage *Incorporating* (`stage-3a-incorporation-80k-net`, [`lib/engines/cfe/v2026/nodes.ts`](../../lib/engines/cfe/v2026/nodes.ts)), its business-limit estimate | that the maximum allowable business limit for a corporation not associated with any other is $500,000 (the list's quote), and that CCPCs "throughout the tax year may be able to claim the small business deduction", the words structure-ccpc's citation of the page holds from its own check of 2026-10-13, which keeps that date. The list found both held quotes for the page that day. The stage's read of 2026-05-01 still wins on screen. |
| CRA, *Determine if you need to register for a payroll account* | map stage *Hire first employee* (`branch-hire-first-employee`), its payroll account timing | that you register for a payroll account before the first remittance due date, and when that date is (the list's quote): the two sentences road 0's `dw-start-hire-payroll-account` holds from its check of 2026-10-12, which keeps that date. The list found all five quotes held for the page that day. The stage's read of 2026-05-01 still wins on screen. |
| CRA, *What's new for corporations* | `grant-sred` (the CCPC rate) | the expenditure limit for the enhanced 35% raised to $6 million (never the page's line that it lists proposed, announced or enacted changes) |
| Income Tax Act s.127(10.2) | `grant-sred` | the expenditure limit's formula, from $6 million. The list recorded "formula found" for this page, so the sentence that leads into it is not kept. |
| CRA, *Where to keep your records, for how long and how to request the permission to destroy them early* | the Delete menu's records line (`cra-business-records-retention`, [`lib/engines/compliance/v2026/record-keeping.ts`](../../lib/engines/compliance/v2026/record-keeping.ts)) | that records are generally kept six years from the end of the last tax year they relate to, and for a different period in some situations: the two sentences every road's *Keep your records from day one* step holds from its own check of 2026-10-14, which keeps that date. The list found all ten quotes held for this page that day. The citation's read of 2026-10-08 still wins on screen (rule 3). |
| Alberta, *Canada-Alberta Productivity Grant* (https://www.alberta.ca/canada-alberta-productivity-grant) | program *Canada-Alberta Productivity Grant* (`grant-capg`, added 2026-10-24), named by map stage *Hire first employee* on road 0 | the 25% and the other 75% of eligible training costs (who contributes which isn't in the quotes), at most $5,000 per employed trainee and $100,000 per employer per fiscal year, and “be operational in Alberta for at least one year”. Fetched from the Canada-Alberta Job Grant's old address, which redirects there. |
| CRA, Guide T4002, chapter 4 (https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html) | risk read *Enhanced first-year deduction timing* (`risk-immediate-expensing-timing`, [`lib/engines/risk/v2026/triggers.ts`](../../lib/engines/risk/v2026/triggers.ts)) | the guide's sentence on the dates for Class 44, 46 or 50 property under proposed changes. It ends on a colon before the factors, which aren't held, so no screen quotes it. The Class 50 write-off's citation of the same chapter keeps its read of 2026-07-02 and no tool check. |
| ISED, the program's loans page (https://ised-isde.canada.ca/site/canada-small-business-financing-program/en/canada-small-business-financing-program/find-loan-your-small-business/helping-small-businesses-get-loans) | the loan program's risk read (`risk-self-declared-valuation`) | that for real property and equipment, security must be taken on the assets financed. The read cited ISED's program hub until 2026-10-24. The page's own title isn't held, so the citation's title describes it. |

Two more risk reads quote pages whose words were already held, so they keep those checks' dates
rather than the list's: the home office read quotes the CRA's *Business-use-of-home expenses* in the
four quotes the home office write-off's citation of that page holds from its check of 2026-10-13,
and the anti-avoidance read (`risk-ladder-skipping`) quotes Income Tax Act s.245 in four of the five
phrases docs/glossary.md's GAAR entry holds from `node scripts/check-quotes.mjs` on 2026-10-12. That citation
(`S245_CITATION`, [`lib/engines/risk/v2026/gaar-official-words.ts`](../../lib/engines/risk/v2026/gaar-official-words.ts))
keeps the risk catalog's read of 2026-07-02, which wins on screen, and is now also listed under the
Holding company and Family trust cards, where that read shows: a risk box draws no sources of its own.

One map stage cites a page for a quote whose check was already held, so it keeps that check's date:
*Sole Prop activation* (`stage-1-sole-prop-activation`) said "Track gross revenue against" the CRA's
$30,000 tests and cited neither page that sets them. Since 2026-10-24 its note quotes what the CRA says a
sole proprietor counts toward the tests and what is left out, and the stage cites the CRA's *When to
register for and start charging the GST/HST*, with a tool check of 2026-10-12 holding those words and
"You exceed the $30,000": each is a quote the two GST/HST stages or road 0's `dw-start-gstman-tests` line
holds from `node scripts/check-quotes.mjs` that day (`CRA_SOLE_PROPRIETOR_COUNTS` and `CRA_NOT_COUNTED`,
[`lib/engines/compliance/v2026/gst-official-words.ts`](../../lib/engines/compliance/v2026/gst-official-words.ts)).
The list found all 22 quotes held for that page on 2026-10-23. The new source has no read, so it says
"Checked by a tool" in amber under the stage.

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
(`writeoff-vehicle`, one item) to #208. The 365-day line stays out (his answer 5).

**Merge order: #207, then #208, then this change.** Two of its rows lean on theirs. The Job Grant's
address now opens the Productivity Grant's page, so until #207 takes `grant-cajg` off, an Alberta idea
in the Job Grant's kinds of work shows two cards for one program. And the loan program's risk box
quotes ISED's loans page, which a risk box doesn't draw; until #208 adds that page to `grant-csbfp`,
the card lists only ISED's hub. Each gap has an `it.fails` check naming the change that closes it
(`tests/productivity-grant.spec.ts`, `tests/reading-list-corrections.spec.ts` § 6): it turns red once
both changes are in, and becomes a plain check then. The panels fixture is redrawn last, after the
rebase.

Three rules from his answers hold for every row:

- **No read of his is recorded yet.** He will send the reading list with his saved reads, and a later
  change gives `lastVerified` and `readBy: "person"` to the citations he checked, and to no other
  citation of the same pages (his answers 1 and 2). Until then each source below says what it said
  before, or "Checked by a tool" in amber where a tool check is all it has.
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
| The Delete menu's records line (`cra-business-records-retention`) | `cra-business-records-retention` | The line is unchanged (it already said "generally"); its citation also keeps the CRA's two sentences. Four design-doc lines that gave the six years without "generally" now give it. | Tool check of 2026-10-23; the read of 2026-10-08 still wins on screen |
| Home office read (`risk-home-office-percentage`) | `risk-home-office-percentage` | DotAmi's own words on floor area and exclusive use are gone; the box quotes the CRA's two conditions and the limit to the business's net income. | The four quotes the home office write-off's citation of the page holds (tool check of 2026-10-13) |
| First-year deduction read (`risk-immediate-expensing-timing`) | `risk-immediate-expensing-timing` | "Getting the year wrong misstates income and unwinds on review" and "keep purchase and deployment records" are gone; the rest stays. | The guide's sentence on the dates, tool check of 2026-10-23, on no screen (it ends on a colon) |
| Repeated-losses read (`risk-hobby-reclassification`) | `risk-hobby-reclassification` | Retired: its one page supports none of it ([risk-calculator.md](../brain/risk-calculator.md), § Retired risk reads). | No held quote from a page that does (*Blocked*) |
| Anti-avoidance read (`risk-ladder-skipping`) | `risk-ladder-skipping` | DotAmi's advice ("professional advice tied to a genuine business purpose, documented at the time") is gone; the box lists s.245's own phrases, joined by nothing of DotAmi's, and the Holding company and Family trust cards list s.245 as a source. | Four of the five phrases docs/glossary.md's GAAR entry holds (tool check of 2026-10-12) |
| Loan program read (`risk-self-declared-valuation`) | `risk-self-declared-valuation` | Kept (his answer 3), saying only ISED's rule on security; "the lesser of purchase price or appraised value" is gone. It cites ISED's loans page in place of the program's hub. | “For real property and equipment, security must be taken on the assets financed.”, tool check of 2026-10-23 |
| *Sole Prop activation* (`stage-1-sole-prop-activation`) | `stage-1-sole-prop-activation/projection-30000` | "Track gross revenue against" the two tests is gone; the note quotes what the CRA says a sole proprietor counts and what is left out, and points to *Mandatory GST registration* for the tests. | A new source, *When to register for and start charging the GST/HST*, with the tool check of 2026-10-12 those words already had |
| *Incorporating* (`stage-3a-incorporation-80k-net`) | `stage-3a-incorporation-80k-net/sbd-limit` | The business limit's "$500,000", which read as automatic, is "Up to $500,000", on the T2 guide's words: CCPCs “may be able to claim” the deduction. | Tool check of 2026-10-23 on the T2 guide's citation; its read of 2026-05-01 still wins on screen |
| *Incorporation for liability/SR&ED* (`stage-3b-incorporation-liability-sred`) | `stage-3b-incorporation-liability-sred/35` | The 35% quotes the CRA: some CCPCs, up to their expenditure limit for the year. | Tool check of 2026-10-23 on the relationships page's citation; its read of 2026-05-01 still wins on screen |
| *SR&ED deepening* (`stage-4-sred-deepening`) | `stage-4-sred-deepening/35` | The 35% quotes the same CRA line (his answer 4); "subject to taxable income limits" is gone from its tax impact. | The relationships page as a third source, tool check of 2026-10-23 only |
| *Hire first employee* (`branch-hire-first-employee`) | `branch-hire-first-employee/payroll-timing` | "Before first remittance due date" is “before the first remittance due date”, on the CRA's two sentences. | Tool check of 2026-10-23 on the payroll page's citation; its read of 2026-05-01 still wins on screen |
| *Canada-Alberta Productivity Grant* (`grant-capg`) | `capg-75-percent`, `capg-5000-per-trainee`, `capg-100000-per-employer`, `capg-operational-one-year` | Added (his call a-call-1), saying only the page's words, in curly quote marks, with no subject before the 25% and 75% lines (none is held); the one-year rule is on no card's line, only among the words found on the page under the card's source ([grants.md](grants.md)). | Four quotes, tool check of 2026-10-23 |

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
   Columbia, which has a PST, would show the same). His saved read of the table settles it; if the
   table shows only the 5%, the line says only that.
2. **Ontario's 13% HST.** The same table.
3. **Ontario food premises.** The regulation in force, read, and what it requires, quoted, under a new
   id.
4. **Repeated losses.** A CRA, Act or folio page on business versus personal pursuits, with its words.
5. **SR&ED, refunded or not.** Whether, and how much of, a sole proprietor's 15% credit is refunded,
   and whether a CCPC's enhanced 35% is: no held quote says either (the CCPC's "refundable" rested on
   the maintainer's read alone), so neither card says it.
6. **SR&ED's $6 million.** The tax years it applies from (beginning on or after 2024-12-16) are in no
   held quote, and only the formula of s.127(10.2) is held, not the sentence that leads into it.
7. **SR&ED deepening's 35% from the SR&ED glossary**, the line the maintainer asked for. No tool has
   found it; until one does, the stage quotes the relationships page.
8. **Home office: how to work out the business part.** The CRA page's sentence on it (floor area as
   one reasonable basis) isn't held, so the box says nothing about it.
9. **Two pages' own titles:** the CRA's SR&ED rates page and ISED's loans page. Neither is held, so
   each citation describes its page.
10. **The Productivity Grant's other conditions:** its other requirements for employers (the list
    summarises active legal entity status, good standing, WCB coverage for trainees and complying with
    provincial agreements, without quotes), whether a sole proprietor counts as an employer, what
    training counts, who else funds it, and the page's subject labels before the 25% and 75% lines.
11. **Every tool check of 2026-10-23.** The list's matcher found these words, not a run of the
    script, so a networked `node scripts/check-quotes.mjs` run (no arguments) must find each again
    before this change merges (rule 4 and its exception).

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
   (`RETIRED_RISK_ENTRIES`). It is another citation of the same page, so it is unchanged until he
   reads it.

## How this relates to the other checks

- **`verification`** (confirmed / supported / partial) is about the statute store: the provision's
  own text was read and compared with the entry. It is a different question from "were these words
  on the page", and it stays as it is.
- The task list's item *Check sources against the law's own words* ([docs/task-list.md](../task-list.md),
  [11b]) is the larger plan: a model proposes quotes, code checks them, a person decides. This page is
  the record and the checker that plan needs; the model step is not built.
