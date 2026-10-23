# Grants Engine — Reasoning Conventions

Catalog: `lib/engines/grants/v2026/programs.ts` (6 entries as of 2026-10-23) · Priority: **high**

## What it holds

Federal/provincial programs (SR&ED, IRAP, Innovate BC, ON supports, Alberta Innovates, CSBFP)
with eligibility prose, structure/province/activity arrays, citations, and `estimatedValue`
strings. The rules engine reads them (`lib/brain/evaluate.ts` `evaluateGrant`); a road's step
names the ones its panel lists (`engineHints`). Two programs came off on 2026-10-23 (see
*Retired programs* below).

## How it should reason (target)

- **Green/yellow/gray from predicates**, same DSL as everything else. Program eligibility
  is naturally predicate-shaped: province, structure, activity, sometimes revenue/headcount.
- **Structure-gated programs are the star use case for near-miss yellow.** IRAP requires a
  CCPC (`structures: ["ccpc"]`): for a sole prop the correct output is not gray — it's
  *"incorporation would unlock IRAP"* (gray→yellow fork). This one behavior is most of the
  product's aggressive-picture promise. Same for SR&ED's rate split (below).
- Rates that differ by structure are **data, not prose**: SR&ED = 15% non-refundable ITC
  (sole prop) vs 35% refundable (CCPC). The current entry hides this in
  `estimatedValue: "15–35%"`. The split is validated seed research and prime fork-surfacing
  material ("incorporating changes your SR&ED position from 15% non-refundable to 35%
  refundable").

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
never said. The Canada-Alberta Productivity Grant is added only after the maintainer reads its
amounts (not in this change).
