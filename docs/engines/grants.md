# Grants Engine — Reasoning Conventions

Catalog: `lib/engines/grants/v2026/programs.ts` (7 entries as of 2026-10-24) · Priority: **high**

## What it holds

Federal/provincial programs (SR&ED, IRAP, Innovate BC, ON supports, Alberta Innovates, CSBFP,
the Canada-Alberta Productivity Grant) with eligibility prose, structure/province/activity arrays,
citations, and `estimatedValue` strings. The rules engine reads them (`lib/brain/evaluate.ts`
`evaluateGrant`); a road's step names the ones its panel lists (`engineHints`). Two programs came
off on 2026-10-23 (see *Retired programs* below), and the Productivity Grant came on on 2026-10-24
(see *The Canada-Alberta Productivity Grant*).

## How it should reason (target)

- **Green/yellow/gray from predicates**, same DSL as everything else. Program eligibility
  is naturally predicate-shaped: province, structure, activity, sometimes revenue/headcount.
- **Structure-gated programs are the star use case for near-miss yellow.** IRAP requires a
  CCPC (`structures: ["ccpc"]`): for a sole prop the correct output is not gray — it's
  *"incorporation would unlock IRAP"* (gray→yellow fork). This one behavior is most of the
  product's aggressive-picture promise. Same for SR&ED's rate split (below).
- Rates that differ by structure are **data, not prose** (`ratesByStructure`): SR&ED is 15% for
  a sole proprietor, with or without the GST/HST, and 35% for a CCPC, and the card's fork says so
  ("A CCPC may access 35% treatment instead of 15%."). **As built since 2026-10-24**
  (the maintainer's reading list of 2026-10-23, items `grant-sred/*` and
  `sred-expenditure-limit-6-million`): each rate's `note` quotes the CRA
  ([`sred-official-words.ts`](../../lib/engines/grants/v2026/sred-official-words.ts)), and
  `refundable` is set only where a held quote (or a recorded read) says it for that structure, which
  no rate's does yet, so no card says "refundable" or "non-refundable" in DotAmi's own words. The
  sole proprietor's said non-refundable until then; the reading list notes that an individual can
  get part of the credit refunded, and no held quote said how much, so that card said neither and
  quoted the CRA's “Your business may earn the credit at a basic rate of 15%.” and “Some businesses
  may also earn a refundable ITC.” Since 2026-10-29 (the maintainer's answer on two CRA pages that
  disagree: “it should always be the newer page because it's more up-to-date”) it also quotes the
  CRA's *SR&ED Investment Tax Credit Policy*: “Generally, for an individual (other than a trust), the
  refundable ITC is 40% of the unclaimed balance of ITC earned in the current year for qualified
  SR&ED expenditures.” Its `refundable` stays unset even so: a bare "(refundable)" after the 15%
  would drop the CRA's “Generally” and what the 40% is of. The older page, the CRA's *How certain
  relationships affect the small business deduction and SR&ED investment tax credits* (already a
  source of the card), says unincorporated businesses' credit is non-refundable; no card quotes
  that line ([citations.md](citations.md), *Blocked*, item 4; § Rules, rule 8: the newer page wins).
  The CCPC's said refundable ("35% (refundable)", "35% refundable
  treatment") on the maintainer's word alone, which no record held, and none of its quotes said
  it, so it said neither until 2026-10-30. Since his answer of that day (his reading page, item 8)
  the CCPC's note also quotes the policy page's section 4.1 list for corporations, whole and in
  order, under *The CRA's SR&ED Investment Tax Credit Policy:*: its lead-in and items 1 to 4, 13
  lines, which say for each kind of corporation and expenditure what share of the credit is
  refundable. Its `refundable` stays unset: the list says it, in the CRA's words, and a bare
  "refundable" after the 35% would say more than the list's lines say. The sole proprietor's fork copies the
  CCPC's note (`lib/brain/evaluate.ts`), so it shows the list too, beside the individual's 40%: why
  the list is never cut ([citations.md](citations.md), *Blocked*, item 4). The 35% is the CRA's “Some CCPCs may earn an ITC
  at an enhanced rate of 35% on qualified SR&ED expenditures up to their expenditure limit for the
  year.”, and the limit, $6 million, is on the card only inside the CRA's *What's new for
  corporations* line (Income Tax Act s.127(10.2) holds the formula). The tax years it applies from
  are in no held quote, so no screen or field says them ([citations.md](citations.md), *The reading
  list's tool checks*). Until then the CCPC's note said "confirm the current limit with an advisor".
  The four pages added for these quotes are tool checks of 2026-10-23. The maintainer read each of
  them in full on 2026-10-25, with the program's own page ([citations.md](citations.md), § The
  maintainer's reads of 2026-10-25), so their sources say *Read by a person on 2026-10-25*. The
  policy page, the card's sixth source, has one tool check that no person has read yet, so its source
  says *Checked by a tool on 2026-10-30* in amber: one run of `node scripts/check-quotes.mjs` found its
  heading, the individual's 40% line and the 13 lines of the list for corporations that day (until
  then a check of 2026-10-29 holding the 40% line alone). The list's own "in the year" and its one
  date, in its line on ECPCs, are the CRA's words inside its quote marks; DotAmi's words around them
  hold no time or date.

## The Canada-Alberta Productivity Grant (`grant-capg`)

Added 2026-10-24 on the maintainer's call a-call-1 ("ADD it", on his reading list of 2026-10-23).
It is the program whose page the Canada-Alberta Job Grant's address now opens
(https://www.alberta.ca/canada-alberta-productivity-grant); its id is its own, and `grant-cajg` is
never reused.

- **What it says.** Every amount and rule is a quote the citation holds. The card's payoff
  (`lensAnnotations.tax`) quotes, since 2026-10-30, the page's sentence on who delivers and funds it
  (*Who funds it*, below), then the page's funding table a row at a time, each line after its row's
  own label cell: Employer: “Must contribute 25% of the total eligible training costs …”; Government
  of Alberta: “Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per
  fiscal year”; and “An employer is eligible for up to a maximum amount of $100,000 per fiscal
  year”, which names its own subject. The labels are held since 2026-10-29, when
  `node scripts/check-quotes.mjs` learned to read a table row as one piece, its cells joined by
  " | " (the maintainer's answer of 2026-10-29, "Teach the checker to read a table row as one
  piece"; [citations.md](citations.md), § The checker), and found "Employer | Must contribute 25% …"
  and "Government of Alberta | Contributes the other 75% …" on the page. Until then no line named who
  contributes which. `eligibility` (which no screen draws for a program) quotes some of the page's
  lists, each after its own lead-in: the requirements for registered employers (“Registered
  employers must also:”), what training counts (“Training must be directly related to the trainees’
  current or future job and fall within at least one of the following skills categories:”,
  “Training must also:”) and some of the costs (“The Canada–Alberta Productivity Grant is available
  for direct training costs only, including:”), then the page's next two sentences, “Small and
  medium-sized organizations may be eligible for travel costs related to training” and “Employee
  wages and general business assets are not eligible”; the legal line quotes the employer's 25% and
  the employer requirements. These are not all the page says (*Still open*, below). Outside the
  quotes DotAmi writes only labels and separators: the page's name, the compass's "If", the table's
  row labels, and "…" where something is left out: before “Registered employers must also:”, which
  follows the page's unheld list of eligible employer types, and inside a list where an item is a
  time or is too short to check (the costs list's first item, "examination fees", is two words, under
  the checker's three). Until the review of #223 the costs passage left out the travel-costs
  sentence with no "…", so it read as complete.
- **No times.** Three of the page's items are times: “be operational in Alberta for at least one
  year”, “have an active legal entity status throughout the grant term” and “be completed within 52
  weeks”. Each is held in the source's tool check only, on no line of the entry, and a "…" marks its
  place in its list (the no-times check, `tests/helpers/time-words.ts`, doesn't see "throughout the
  grant term", so `tests/productivity-grant.spec.ts` names all three). Until 2026-10-29 the one-year
  rule was also in `eligibility`. It showed among the words found on the page, under the card's
  source, as every tool check's quotes do, until the maintainer's read of the page was recorded
  (2026-10-25): the read wins on screen and that list of words is no longer drawn, so no screen
  shows the one-year rule now. The screens' no-times check (`e2e/idea-sweep.spec.ts`) lets a quoted
  time through only while a tool check alone holds it.
- **How it was checked.** One tool check, of 2026-10-29. For the sentences found on the page on
  2026-10-27 the maintainer's answer of 2026-10-29 was "One new check that holds the old and new
  sentences", dated by its run: one `node scripts/check-quotes.mjs --url … --quote …` run found all 27
  quotes (the four of 2026-10-23, the two rows, the 2026-10-27 sentences and the travel-costs
  sentence), and its date replaced 2026-10-23. (A first run that day held 26; the review of #223
  added the travel-costs sentence, so a second run held all 27, and the check is that run's.) Before it: a tool check of 2026-10-23 (the reading list's matcher, found again by a
  networked run on 2026-10-26, rule 4 of [citations.md](citations.md)). The maintainer's read of the
  page in full on 2026-10-25 stays and wins on screen: the card says *Read by a person on
  2026-10-25* and lists none of the quotes, which the tool check keeps in the catalog.
- **Who funds it.** `authority` is "Alberta / federal" (the catalog's pattern, as "CRA / federal"),
  on the page's sentence “The program is delivered by Alberta and funded by the Government of Canada
  through the Canada–Alberta Workforce Development Agreement.”, quoted in the catalog's comment and
  held by the tool check. No screen shows the field. Since the maintainer's answer of 2026-10-30
  (his reading page, item 8) the card's payoff, and the entry's description, quote that sentence
  whole, first after "Alberta's page on this program:", as on the page (its Overview comes before
  the funding table): whole, because it says who delivers the program, not only who funds it. The
  check of 2026-10-29 already held it, so nothing new was recorded; a run of the script with all 27
  quotes on 2026-10-30 found every one again. No line reconciles the sentence with the table's
  "Government of Alberta" row in DotAmi's own words.
- **Who sees it.** Every idea in Alberta, at every structure and kind of work, always *check
  first*. `activityTags: []`: a program whose page names no kind of work shows for every idea in its
  provinces, and its card's reason names only the place the person picked ("Shown because you
  selected Alberta.", a provincial compliance rule's own line), never "your … activity match this
  program", which no answer was checked against (`lib/brain/evaluate.ts` `evaluateGrant`). All
  three structures are listed because no held word of the page limits it: a program open to a
  corporation but not listing the sole proprietorship is drawn as a near-miss that "requires
  incorporation (CCPC)", the Job Grant's mistake. No `ratesByStructure`: a rate there is written on
  the card as "this may be worth N%", which only fits a tax credit. Road 0's *Hire first employee*
  names it (`engineHints`), so the map draws it under that card for an idea that hires first; the
  apprentice road draws no rules and tax cards.
- **Still open.** Whether a sole proprietor counts as an employer: the page never says "sole
  proprietor" (the checker's matcher found none of "sole proprietor", "sole proprietorship" or "sole
  proprietors" on it on 2026-10-27), so no line says either way, and `structures` stays open at
  every structure. And the CAPG applicant guidelines the page points to for full details
  (open.alberta.ca) are unread: their page refused one plain fetch on 2026-10-27, which was not
  retried. Three of the page's own lists aren't held, and no line quotes them: the eligible employer
  types ("Employers must be one of the following eligible types:" …, in plain quote marks because
  no check holds it), which “Registered employers must also:” follows; the ineligible employers; and
  the ineligible training. They come close to
  the sole-proprietor question, which stays the maintainer's. Until 2026-10-29 the employer
  requirements, what training counts, who else funds it and the table's row labels were open too.

## Classification rule (flagged decision — see audit § Flags #5)

**CSBFP is a loan guarantee, not a grant**, and it must live in this engine anyway (users
don't care about our taxonomy; they care about "money levers"). Pending maintainer
confirmation, the recommended shape is a `kind` field:

```typescript
kind: "grant" | "tax-credit" | "financing"
```

CSBFP entry facts, as first written: up to $500K equipment, government guarantees up to 85% of
lender loss, 74% of loans to businesses <1yr old, a 365-day retroactive window, collateral = the
equipment itself. Compass framing: "if equipment is on your path, CSBFP may make financing
available without revenue history."

**As built since 2026-10-23** (the maintainer's reading list, items `grant-csbfp/equipment-limit` and
`grant-csbfp/365-days`): the entry says what ISED's loans page says, in its words and with its page as a
tool-checked source (*Helping small businesses get loans*): up to $1,000,000 in term loans for any one
borrower, of which no more than $500,000 for leasehold improvements and equipment together (not "specifically
for equipment"), and security taken on the assets financed. The 365-day roll-in line is gone: none of ISED's
program pages held it. The 85% and 74% figures were never on screen.

## Authoring rules specific to this engine

1. `estimatedValue` stays as display prose, but any rate the rules engine reasons about
   gets a typed field.
2. Program pages change often — grants entries need the most aggressive `lastVerified`
   discipline of any engine. If authoring from memory instead of the live program page, stop.
3. Provincial programs must set `provinces` narrowly (Alberta Innovates is AB-only). The wrong province
   surfacing a program is a trust-killer on the exact surface (intake preview) meant to
   build trust.
4. Umbrella entries ("Ontario innovation supports") are acceptable placeholders but should
   decompose into specific programs as they get verified — specific + cited beats broad + vague.
5. `"CA"` in `provinces` means the program is offered in every province and territory: the
   engine shows it wherever the person is, and since 2026-10-13 its card says so ("Shown because
   it is a federal program, offered in every province and territory, and your … activity matches
   it."), as a federal compliance rule's does since #36. A federal program open only in some
   regions must list those provinces and leave `"CA"` out, or that line would be untrue
   (`lib/brain/evaluate.ts` `evaluateGrant`; `tests/brain-evaluate.spec.ts`).

## Retired programs

Taken off the catalog and every road, with their tests and docs, on the maintainer's call a-call-1
(2026-10-23: "take both off", before release 0.5.0). The same list is data in
`lib/engines/grants/v2026/programs.ts` (`RETIRED_GRANT_PROGRAMS`), which
`tests/places-and-programs.spec.ts` holds to the catalog: neither id is in it, no road's step names
either, and their ids are never reused.

| Id | Program | Its page, as cited | What the page says now (read 2026-10-23) |
| --- | --- | --- | --- |
| `grant-abti` | Alberta Investor Tax Credit (ABTIC) | https://www.alberta.ca/alberta-investor-tax-credit | Page not found. A search finds Alberta's corporate tax special notice Vol. 5 No. 54, titled "Budget 2019 elimination of corporate tax credits" (open.alberta.ca); its page refused the tool, so its words were not checked. |
| `grant-cajg` | Canada-Alberta Job Grant (CAJG) | https://www.alberta.ca/canada-alberta-job-grant | Opens the Canada-Alberta Productivity Grant's page (https://www.alberta.ca/canada-alberta-productivity-grant), a different program with its own amounts. |

The Job Grant showed on road 0 as a *near-miss* ("Shown because your activity matches, but this
program requires incorporation (CCPC)"), on every map panel's *Elsewhere on your map* and on
Mandatory GST registration's *For you on this stage*: its `structures` left out the plain sole
proprietorship, so `evaluateGrant`'s near-miss fork read it as needing incorporation, which its page
never said. The Canada-Alberta Productivity Grant came on under its own id, `grant-capg`, on
2026-10-24 (the maintainer's call a-call-1, "ADD it"), saying only the four quotes a tool found on its
page (*The Canada-Alberta Productivity Grant*, above). The maintainer read that page in full on
2026-10-25, so its source says *Read by a person on 2026-10-25* ([citations.md](citations.md), § The
maintainer's reads of 2026-10-25).
