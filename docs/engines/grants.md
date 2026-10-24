# Grants Engine — Reasoning Conventions

Catalog: `lib/engines/grants/v2026/programs.ts` (6 entries as of 2026-07-02) · Priority: **high**

## What it holds

Federal/provincial programs (SR&ED, CAJG, IRAP, ABTIC, Innovate BC, ON supports) with
eligibility prose, structure/province/activity arrays, citations, and `estimatedValue`
strings. Nothing evaluates them at runtime; archetype configs hand-pick ids for display.

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
  get part of the credit refunded, and no held quote says how much, so that card says neither and
  quotes the CRA's “Your business may earn the credit at a basic rate of 15%.” and “Some businesses
  may also earn a refundable ITC.” The CCPC's said refundable ("35% (refundable)", "35% refundable
  treatment") on the maintainer's read alone, which isn't recorded yet, and none of its quotes says
  it, so it says neither too ([citations.md](citations.md), *Blocked*). The 35% is the CRA's “Some CCPCs may earn an ITC
  at an enhanced rate of 35% on qualified SR&ED expenditures up to their expenditure limit for the
  year.”, and the limit, $6 million, is on the card only inside the CRA's *What's new for
  corporations* line (Income Tax Act s.127(10.2) holds the formula). The tax years it applies from
  are in no held quote, so no screen or field says them ([citations.md](citations.md), *The reading
  list's tool checks*). Until then the CCPC's note said "confirm the current limit with an advisor".
  The four pages added for these quotes are tool checks of 2026-10-23; no person is recorded as
  having read them.

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
  screen draws for a program); it shows only among the words found on the page, under the card's
  source, as every tool check's quotes do. The screens' no-times check (`e2e/idea-sweep.spec.ts`)
  lets a quoted time through only while a tool check alone holds it; once a read of the page is
  recorded, the read wins on screen and that list of words is no longer drawn.
- **How it was checked.** A tool check of 2026-10-23, with no read on record, so its card says
  *Checked by a tool* in amber and lists the four quotes. A networked
  `node scripts/check-quotes.mjs` run should find them again before merge (rule 4 of
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

CSBFP entry facts (validated): up to $500K equipment, government guarantees up to 85% of
lender loss, 74% of loans to businesses <1yr old, **365-day retroactive window** (equipment
bought now can roll into a CSBFP loan later — surface this; it changes purchase timing
decisions), collateral = the equipment itself. Compass framing: "if equipment is on your
path, CSBFP may make financing available without revenue history."

## Authoring rules specific to this engine

1. `estimatedValue` stays as display prose, but any rate the rules engine reasons about
   gets a typed field.
2. Program pages change often — grants entries need the most aggressive `lastVerified`
   discipline of any engine. If authoring from memory instead of the live program page, stop.
3. Provincial programs must set `provinces` narrowly (CAJG is AB-only). The wrong province
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
