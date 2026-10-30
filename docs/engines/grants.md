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
  that line ([citations.md](citations.md), *Blocked*, item 4).
  The CCPC's said refundable ("35% (refundable)", "35% refundable
  treatment") on the maintainer's word alone, which no record held, and none of its quotes says
  it, so it says neither too ([citations.md](citations.md), *Blocked*). The 35% is the CRA's “Some CCPCs may earn an ITC
  at an enhanced rate of 35% on qualified SR&ED expenditures up to their expenditure limit for the
  year.”, and the limit, $6 million, is on the card only inside the CRA's *What's new for
  corporations* line (Income Tax Act s.127(10.2) holds the formula). The tax years it applies from
  are in no held quote, so no screen or field says them ([citations.md](citations.md), *The reading
  list's tool checks*). Until then the CCPC's note said "confirm the current limit with an advisor".
  The four pages added for these quotes are tool checks of 2026-10-23. The maintainer read each of
  them in full on 2026-10-25, with the program's own page ([citations.md](citations.md), § The
  maintainer's reads of 2026-10-25), so their sources say *Read by a person on 2026-10-25*. The
  policy page, the card's sixth source, is a tool check of 2026-10-29 that no person has read yet, so its source
  says *Checked by a tool on 2026-10-29* in amber. The CCPC's note quotes none of its lines: they run
  to several kinds of corporation and expenditure, and the sole proprietor's fork copies that note.
  Whether the CCPC's card says its 35% is refunded is still the maintainer's call (his answer of
  2026-10-29 was about the sole proprietor's card; [citations.md](citations.md), *Blocked*, item 4).

## The Canada-Alberta Productivity Grant (`grant-capg`)

Added 2026-10-24 on the maintainer's call a-call-1 ("ADD it", on his reading list of 2026-10-23).
It is the program whose page the Canada-Alberta Job Grant's address now opens
(https://www.alberta.ca/canada-alberta-productivity-grant); its id is its own, and `grant-cajg` is
never reused.

- **What it says.** Every amount and rule is a quote the citation holds, each found on the page by
  the reading list's tool on 2026-10-23: “Must contribute 25% of the total eligible training costs
  …”, “Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal
  year”, “An employer is eligible for up to a maximum amount of $100,000 per fiscal year”, and “be
  operational in Alberta for at least one year”. Outside the quotes DotAmi says only the compass's
  "If" and the page's name: who contributes the 25% and who the 75% isn't in the words held, so no
  line names it. The card's payoff (`lensAnnotations.tax`) shows the first three, in curly quote
  marks. The one-year rule is a time, so it is on no card's line (it is in `eligibility`, which no
  screen draws for a program). It showed only among the words found on the page, under the card's
  source, as every tool check's quotes do, until the maintainer's read of the page was recorded
  (2026-10-25): the read wins on screen and that list of words is no longer drawn, so no screen
  shows the one-year rule now. The screens' no-times check (`e2e/idea-sweep.spec.ts`) lets a quoted
  time through only while a tool check alone holds it.
- **How it was checked.** A tool check of 2026-10-23, then the maintainer's read of the page in
  full on 2026-10-25, which wins on screen: its card says *Read by a person on 2026-10-25* and no
  longer lists the four quotes, which the tool check keeps in the catalog. A networked
  `node scripts/check-quotes.mjs` run found them again on 2026-10-26, before merge (rule 4 of
  [citations.md](citations.md)).
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
- **Not yet held** (needs the page's words): its other requirements for employers (the reading list
  summarises active legal entity status, good standing, WCB coverage for trainees and complying
  with provincial agreements, without quotes), whether a sole proprietor counts as an employer,
  what training counts, and who else funds it (`authority` is "Alberta").

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
