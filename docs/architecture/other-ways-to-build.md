# Other ways to build: buy, rent or lease, and where to look for tax and legal help (design)

Status: **Design, not built. Waiting on the maintainer's calls (§ 9).** Written 2026-10-15; revised the same day after
the maintainer's answers. **Call 1 is answered (C).** Calls 2–9 still wait on the maintainer, plus two the research kit
adds (§ 9). No product code until they are answered. In the public task list this is [14f](../task-list.md) (the maintainer's tracker: story S2.5.22, tasks
22a–22d); the build tasks are S2.5.22e onward (§ 10).

Read with [future-cockpit.md](future-cockpit.md) (the cockpit, the road data model, decision 2: no averages for a real
person), [use-cases.md](use-cases.md) (the Lens, the planned built-in agent, and its permission levels),
[connectors-and-agents.md](connectors-and-agents.md) (agents propose, the person confirms) and
[competitive-landscape.md](competitive-landscape.md) (S2.5.23). Added after the answers:
[research-kit.md](research-kit.md) (S2.5.25, one kit that makes all of this work for any job, not only the cabinetmaker)
and [lens-comparisons.md](lens-comparisons.md) (S2.5.24, the Lens answering "cheapest", "fastest" and "strongest
foundation").

Every fact about a rule, a price source, a licence or terms of use carries a source number ([S1]…) from § 13, all seen
on **2026-10-15**. `*` = read through a summarising tool; `†` = reported by the design's reviewer, not yet read. Every
string in quote marks in § 4 is found word for word by `scripts/check-quotes.mjs` or read by a person, with the day
recorded, before anything ships (task S2.5.22e). Anything unconfirmed is in § 12 and never stated as fact. Day counts
are rough working-day estimates.

## 1. The request

The maintainer, 2026-10-15, word for word:

> "this looks great, because now that we have a more realistic estimate of costs and expenses, we can now point someone
> in the right direction for their tax and legal situation, as well as more ways in which someone could build a
> business, like -for example- if someone couldn't write off all of these tools, they could potentially just rent, or
> lease and see where that could take them with appropriate cost estimates. Of course the users would have to provide
> more detailed info for dotami to then give the user a more detailed future scaped plan."

The tracker splits it: **22a** buy, rent or lease side by side for each start-up cost line, with its price and official
tax treatment; **22b** which official rules the person's own numbers and picks bring into view, and where to get
qualified help, never a verdict; **22c** more detail from the person, kept in their own words and figures; **22d** this
design and the maintainer's calls.

**His answers, later that day, word for word** (item 1 answers this doc's call 1; items 2–4 answer
competitive-landscape.md's calls 3, 2 and 1):

> "1. agreed. And not only this, but when they use the lense chat, the lense chat SHOULD be able to answer questions
> like "Hey, whats the cheapest option", or "whats the fastest option?", or "which one of these would have the strongest
> long-term foundation for me to build out other business's" + any other edge cases like this. that means, we obviously
> need to make a story and tasks for the lense chat to be able to do this as well. So what data would the lense chat
> require, how would we get it, how does it know? etc etc"

> "Now with all of that said, we're still clearly just talking about the cabinet makers shop; but of course all of these
> same tools and tactics will need to be applied to any job or career path; which means this will have to turn into a
> library, or script, or a combo of the two, but it makes no sense building all of this out repeatedly for every single
> job and business possibility."

What that changes here: the Lens questions are story S2.5.24 ([lens-comparisons.md](lens-comparisons.md)); § 4.10 says
what this doc gives it. The "any job" ask is story S2.5.25 ([research-kit.md](research-kit.md)); § 5.1 re-keys
everything here that was written for the cabinetmaker, so any road gets it.

Rulings kept: **pick 2A** (2026-10-11: a real person's cost lines are official fees plus their own quotes; averages only
in the invented example); **option B** (2026-10-11: sources checked by a tool or read by a person); **2026-09-24**
("dotami shouldn't hold the data… access only if the user allows it, like any other software"); **value over more safety
settings**.

## 2. The idea in one paragraph, from the person's side

Today *Open your own shop* shows *Woodworking machines and tools: add your quote*: one blank that only fits a purchase.
After this story, any line that can be had more than one way, on **any road**, asks **How would you get this?**
(*Already have it · Buy · Rent · Lease · Not decided*). Each way gets its own row, always in that order, with the
person's own number (or *add your quote*) and how the Canada Revenue Agency (CRA) treats that way, quoted and linked.
The start-up money gauge counts only the way picked; rent and lease payments sit in their own row. Picking a way brings
the official rules it touches into view, and *Where to ask* names the government offices, regulators and funded
non-profits that match the road's province, area and job. The screens pick no way and rank none. If the person asks the
Lens "which is cheapest?", the Lens answers from the person's own numbers, as call K7 settles (§ 4.10).

## 3. What the design starts from (already built)

- **Cost lines.** A step's `costs` hold official-fee lines and named lines (`lib/engines/roads/v2026/types.ts:76-77`,
  `NamedCostLine` :168); a screen shows three kinds: official fee, your quote, named but not priced (`CostLineAsShown`
  :184). None has a buy, rent or lease dimension. Road 1's *Open your own shop* names eight lines, including tools,
  *Shop space deposit*, *Vehicle*, *Design or CAD software* and a cited *Legal advice on the business form*
  (`lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts:866-879`); road 0 names seven
  (`lib/engines/roads/v2026/starting-any-business-ab.ts:786-792`).
- **The person's numbers.** A `start-up-cost-line` Figure prices one named line; `amountFrom` records quote, link,
  receipt or your guess (`lib/figures/types.ts`). One current number per line per idea (`future-cockpit.md:1673-1678`).
  An official fee can't be priced (`lib/figures/store.ts:104`). A Figure the Lens proposes counts only once the person
  agrees.
- **Precedents.** The ways to incorporate are listed side by side and neither counts until the person picks
  (`lib/engines/cfe/v2026/incorporation-routes.ts:4-8`); this design closes the gap "two fee lines can't yet be marked
  as alternatives" (`future-cockpit.md:966-971`). `ScenarioState.activeBranches` holds answers as JSON with no migration
  (`incorporateAt`, `decided`, `equipmentNo`; `lib/db/scenario-state-json.ts:1-22`).
- **Tax treatment already cited** in `lib/engines/writeoffs/v2026/categories.ts`: *Capital equipment* (Income Tax Act
  20(1)(a), Class 8 at 20%, a lease note); *CCA Class 50*, the one entry using `firstYearIncentive` (:163); *Vehicle*
  (lease and interest caps, "or such other amount as may be prescribed"); *Software* (current versus capital). Each
  entry already lists its `provinces` (e.g. :307-308). Nothing covers renting business property or leasing equipment as
  a yearly expense.
- **What lights capital cost allowance (CCA) cards today:** only the equipment answer, `capitalRelevant = entry.ccaClass
  !== undefined && profile.capitalPurchasePlanned` (`lib/brain/evaluate.ts:130`). A time-boxed incentive turns an entry
  amber with its expiry (:137-150). Citation authority can only be `"CRA" | "federal" | "provincial"`
  (`lib/engines/shared/types.ts:5`). Every business road has *Keep your records from day one*
  (`lib/engines/roads/v2026/keep-records.ts`, #174).
- **Keys the kit builds on.** `Road.provinces` (`lib/engines/roads/v2026/types.ts:23`) and the person's own job pick,
  `Venture.occupationCode`, an OaSIS (the government's Occupational and Skills Information System) code
  (`prisma/schema.prisma:169`). The kit has every road name its job codes (NOC, National Occupational Classification
  2021), keeps each job's industry codes (NAICS, North American Industry Classification System 2022) once in a
  job-links catalog, and uses the person's own area pick ([research-kit.md](research-kit.md) § 5.3, task S2.5.25e).

## 4. What a person sees

All words go through `lib/cockpit/words.ts` and the verdict-word checks (`tests/helpers/verdict-words.ts`,
`e2e/no-verdict.spec.ts`, `e2e/journey.spec.ts`): no *best*, *better*, *should*, *recommend* or *#1*. Those lists
don't hold *cheaper*, *cheapest*, *save*, *saves*, *lowest*, *fastest*, *strongest* or *costs less* today, so a
`WAYS_WORDS` list with them is checked on the ways words file (task S2.5.22j).
Ways always appear as Already have it · Buy · Rent · Lease; the order never depends on price. **Amounts in mockups are
round placeholders, not sourced figures.** The screens are the same on every road; only line names and *Where to ask*
rows differ, chosen by the road's keys (§ 5.1).

### 4.1 The step panel: a cost line with ways

```
Woodworking machines and tools · How would you get this?
  [Already have it] [Buy] [Rent] [Lease] [Not decided]
  DotAmi doesn't pick one. You can price more than one way and pick later.
  See the ways side by side ▾
  Buy     $10,000 · your quote
  Rent    $400 every 4 weeks · your quote
  Lease   Add your quote
  How the tax rules treat each way ▸     What to ask for in writing ▸ (Lease)
  Places that publish rent prices ▸ (links)
  Nothing on this line counts in Start-up money until you pick a way.
```

- The fold is one more entry in the existing `dotami-cockpit-folds` object (`lib/cockpit/folds.ts:27`); its inventory
  entry (`lib/privacy/inventory.ts:609`) is updated to name it. Below 768 px the rows stack.
- **No difference line on any screen.** Never "Rent costs $X less"; each row shows only the person's number.
- *Places that publish rent prices* (call 1, C) lists links for this kind of item, alphabetical, no amounts, with
  *"DotAmi doesn't recommend or rank anyone."* It is a view over the kit's source registry (§ 5).

### 4.2 How the tax rules treat each way

Cited lines from the write-offs catalog, each opening *Sources* with *Checked by a tool on …* or *Read by a person on
…*. Quote marks = the source's words; no quote marks = DotAmi's plain label. These lines belong to **kinds of asset**
(equipment, small tools, vehicle, software, space), not to woodworking, so every road's lines of that kind show them.

- **Buy.** The cost is claimed through CCA over several years. Tools of $500 or more each go in Class 8 (20%) [S1];
  tools under $500 bought on or after May 2, 2006 go in Class 12 (100%), while dies, jigs, patterns, moulds, lasts and
  the cutting or shaping part of a machine stay under the half-year rule [S1]. The half-year rule: "In the year you
  acquire a depreciable property, you can usually claim CCA only on one-half of your net additions to a class." [S3]
  Some classes are exempt [S4]`*`.
  - **Always directly under that line, in amber:** *CRA's Income Tax Folio S3-F4-C1 says changes made by Bill C-15
    provide temporary enhanced CCA for some property [S7]`*`, and CRA's guide T4002 says the half-year rule does not
    apply to property that gets the enhanced treatment [S4]`*`. Which property, and from which dates, is a question for
    your accountant.* No dates or multiplier until S2.5.22e reads them in the enacted Act or Regulations (§ 12). Once
    read, it uses the same entry's `firstYearIncentive` field and amber state (`lib/brain/evaluate.ts:137-150`); until
    then it is an amber note on that entry, never a separate card, so the two can't drift apart.
  - *Which class each item goes in is a question for your accountant.*
- **Rent.** "You can deduct rent incurred for property used in your business." [S12] On space lines only, the row adds
  that this is line 8910 of form T2125 [S12]; that page doesn't address renting equipment, so elsewhere *which line of
  your return it goes on* is a question to take (§ 4.7).
- **Lease.** "Deduct the lease payments incurred in the year for property used in your business." [S13] The lessor and
  lessee can jointly elect to treat a lease as a purchase on Form T2145 [S13][S14]. Conditions: the property's total
  fair market value is more than $25,000 [S13]; the lease is for "more than one year"; property prescribed in section
  8200 of the Regulations is excluded; the election is filed "with both the lessor and lessee's income tax return"
  [S7]`*`. After a tool check, in the page's words: "office furniture and vehicles often do not" qualify [S13].
- **Already have it.** Personal property moved into the business, "such as a car or a personal computer", falls under
  the half-year rule [S4]`*`. *Its value for tax is a question for your accountant.*
- **Vehicle lines, Buy and Lease rows** (Finance Canada 2026 limits [S5]), always shown, no question first: Class 10.1
  ceiling $39,000 before tax; deductible lease cost $1,100 a month before tax for leases from 2026-01-01; deductible
  interest on a new car loan $350 a month. *These limits apply to a "passenger vehicle" as tax law defines it; whether
  yours is one is a question for your accountant.* No lease election on vehicles.
- **Under every row:** *What any deduction is worth depends on your own tax situation, which DotAmi doesn't work out.
  This is information for you and your accountant, not tax advice.*

### 4.3 What to ask for in writing

**Lease.** The items Alberta's Cost of Credit Disclosure Regulation, section 19, lists for a lease disclosure statement:
term, cash value, payments, estimated residual value, buyout price, when and how the lease can end early and what that
costs, payments for unreasonable wear or excess use, the annual percentage rate (APR) and total lease cost [S29]. King's
Printer allows reproducing Alberta's regulations with acknowledgment [S29]. S29 is a PDF, so a person reads it word for
word first (S2.5.22e). One line follows, in the Act's words once checked: *Alberta's Consumer Protection Act says its
Part 9, which includes leases, applies when the agreement is entered into "primarily for personal, family, household or
farming purposes" [S30]. Whether these items apply to a business lease is a question for a lawyer or Service Alberta.
The list still works as things to ask for in writing.*

**Rent.** DotAmi's own checklist, plain words, no citation: *Ask what the deposit is, whether there's a damage waiver,
whether tax is included, and what delivery costs.* No company page is cited in a catalog. The person can tick each item
as received (their own mark). Both lists are keyed by **province**: another province shows its own cited list once a
person reads one, and none until then.

### 4.4 The Money gauge (call 4, option C)

> **To start:** $8,000 · 4 lines you priced, 2 official fees · 3 lines not priced yet · **1 line priced 2 ways, not
> picked: not counted**
> **Paid as you go:** $400 every 4 weeks · from 1 line you'd rent
> *Your $400 × your 6 = $2,400. These are your numbers multiplied, not a forecast.*

A line priced two or more ways and not picked counts in neither total, and says so (the incorporation-routes precedent).
*Already have it* is neither priced nor unpriced (*"1 line you said you have"*). A picked Rent or Lease amount goes in
*Paid as you go* with the period typed: never turned into months, never added to *To start*, never compared with a Buy
number; the multiplied line appears only when the person typed a count. Receipts compare two runs of the rules:
*"Because you picked Lease for Vehicle: 2 rules now in view; the line moved to Paid as you go."*

### 4.5 Rules your answers bring into view (Rules & tax overlay)

A section of the existing overlay. Each card names the answer or road step that lit it:

- *Shown because you picked Buy for Woodworking machines and tools* (Classes 8 and 12, half-year and amber lines) or
  *Buy or Lease for Vehicle* (the 2026 limits [S5]): as in § 4.2.
- *Shown because Keep your records from day one is on your road.* Keep records six years from the end of the last tax
  year they relate to; long-term property records indefinitely; in Canada unless the CRA gives written permission [S19].
- *Shown because you said the lease runs more than one year and what's in it is worth $31,000.* The lease-as-purchase
  election, its conditions and "office furniture and vehicles often do not" [S7][S13]; never on vehicles. Also: *"A
  lease of more than one year is one of the interests Alberta's Personal Property Registry records [S40]; what that
  means for you is a question for a lawyer."*
- *Shown because you picked Rent.* Rent is deductible [S12]; restoring something to its original condition is usually a
  current expense, improving it is capital [S11].
- *Shown because you said you'd work from home.* Business use of home counts only for a principal place of business, or
  a space used to meet clients on a regular and ongoing basis, and cannot create or increase a business loss [S18].
- *Shown because you said you're not registered for GST/HST* (goods and services tax / harmonized sales tax). Only
  registrants claim input tax credits, only for business use; a new registrant may claim credits on capital property on
  hand the day they register [S16]`*`; after a tool check, CRA also lists "certain capital property" among things you
  can't claim credits on [S16]. Registration is required past $30,000 in one calendar quarter or over four quarters in a
  row, counting associates' sales [S15]. *"Alberta has no sales tax."* [S17] *How these apply to what you'd buy is a
  question for your accountant.* Reads only the person's own `gstRegistered` answer.

A rule needing a number DotAmi never works out shows unlit: *"Tax instalments come into view once you and your
accountant know your tax owing (over $3,000)."* [S41] Licences are not a lit card: whether one applies depends on what
the person would sell, so it goes in *Where to ask* and the questions to take.

### 4.6 Where to ask

In the right-hand panel, from every card above, and in *Your plan*. Grouped by kind (government, then regulators' public
directories, then government-funded advice), alphabetical inside each group, introduced with *"DotAmi doesn't recommend
or rank anyone. Each is described in its own words."* "Free" appears only where the place's own page says so. Rows are
**keyed** (§ 5.1): a row shows when its province matches the road and, if it names a job or industry code, when the road
carries that code. For road 1 in Alberta today:

- **CRA Liaison Officers** (every province). Free, confidential help with business tax obligations; you can request a
  visit. S2.5.22m cites CRA's current service page after a tool check, rather than the 2024 tax tip [S33], and says
  nothing about who qualifies.
- **Service Alberta business licensing office.** *Ask whether any licence applies to what you'd sell (Alberta lists
  licence types such as Prepaid contracting)* [S37].
- **Your city** (keyed by area). Calgary: every business registers with the City and gets location approval [S38].
  Edmonton: every business needs a business licence [S39]. Links only, all of the province's areas, alphabetical; no
  city question.
- **CPA Alberta: Verify a CPA member** [S35] (Chartered Professional Accountants). DotAmi's description: checks
  registration, not whether someone suits your situation.
- **Law Society of Alberta: Find a Lawyer** [S43]`†`, linked once its quote passes ("does not recommend or endorse
  individual lawyers"). Its former referral service closed on 2023-09-22 and "did not provide free legal advice" [S36].
  DotAmi promises no free consultation.
- **Business Link Alberta.** A government-funded non-profit offering "free one-to-one guidance" [S34].

Opening a link is the person's own click; nothing about the person goes in it.

### 4.7 Your plan (print)

*Your plan* gains four sections, drawn from what is kept, nothing generated: (1) **How you'd get each start-up item**
(way picked or *not decided*, your number for each way, ticks); (2) **In your words: how you'd set this up**, word for
word and dated; (3) **Questions to take to your accountant / to your lawyer**, one catalog question per rule in view
with its source, e.g. *"Which capital cost allowance class does each item go in?"*, *"Does my lease qualify for the
T2145 election?"*, *"Which line of my return does renting equipment go on?"*, *"Is my vehicle a passenger vehicle for
tax?"*, *"Does any Alberta licence apply to what I'd sell?"*; (4) **Where to ask**. The line *not legal or tax advice; a
prep tool for your accountant and lawyer* (`lib/cockpit/words.ts:601`) stays. Questions belong to asset kinds and rules,
so every road gets them.

### 4.8 The new questions (22c, call 3)

Questions are asked only while something on screen depends on them (`future-cockpit.md:781`); *I don't know* is always
an answer:

1. **"How would you get this?"** per line with ways, in the money list (a many-answer question isn't a one-box question,
   `future-cockpit.md:638-644`); *Not told yet* (`lib/cockpit/told.ts:248-306`) gains *"How you'd get 5 start-up
   items"*.
2. **"What's your number?"** per way: today's agree prompt plus the way's name; for Rent or Lease also *every* (4 hours
   · day · week · 4 weeks · month · year) and, optionally, *how many*.
3. **After a Lease pick:** *"Is the lease longer than one year?"* and *"What is everything in it worth?"* (their
   number).
4. **Once per idea, after any line is priced:** *"Are you registered for GST/HST?"* (yes · no · I don't know), kept only
   as `gstRegistered`; never prefilled from road 0's `gstTiming` map fork (`lib/brain/evaluate.ts:539`), `equipmentNo`
   or revenue figures. Test: any `gstTiming` and no `gstRegistered` shows the GST row as not told.
5. **Once per idea:** *"Where would you work?"* Rented space · shared space · home · not sure (road 1 may say *shop*;
   the kit's generic word is *space*).
6. **Optional box:** *"In your own words: how you'd set this up"*, kept dated and word for word, read by no rule; the
   screen says so.

No *passenger vehicle* question (a tax classification; the limits are always shown). No profile, no city question, no
hours question (hours are phase 2, `future-cockpit.md:807`).

### 4.9 Mara's example (invented person, real numbers; call 9)

With call 9 A1 or A2, Mara's tools line shows a **Rent** row beside her Buy total and her space line two shared-shop
memberships, each credited in *Where these numbers come from*: Rogers Rent-All, Calgary, 10-inch table saw on a stand:
$50 a day, $198 a week, and $398, which the page labels "Monthly" [S20]; the shop's policies define its longest period
as a 4-week rental, "any 28 consecutive day period" [S21], and Mara's row shows the period in the shop's own word.
Protospace, Calgary: "$55 / month for 24/7 access", with a wood shop [S23]. ENTS, Edmonton: $120 a month, joined in
person after a safety orientation, members 18 or older [S24]. The example picks no way for Mara.

### 4.10 Asking the Lens about the ways (S2.5.24; settled by calls K7, K8 and K9)

The conversation is designed in [lens-comparisons.md](lens-comparisons.md); this doc supplies the facts. The Lens reads
them through the kit's read tools (`list_options`, `road_view`; task S2.5.25k), each value returned with its source.
**What it could show from this design, if K7 allows sorting the person's own numbers.** DotAmi's code draws the card;
every amount and product comes from `list_options`, and the Lens's reply guard (lens-comparisons.md § 6.4) fails any
digit or comparison word in the model's own text:

```
Woodworking machines and tools · your numbers, before tax
  Buy     $10,000 · your quote · once
  Rent    $400 · your quote · every 4 weeks × your 6 = $2,400 (your numbers multiplied, not a forecast)
  Lease   not priced
Sorted by money paid for this line, on your numbers: your choice. DotAmi doesn't rank ways.
Not in these numbers: what the machine is worth after, tax, Lease (no number), 3 other lines not priced.
```

> *(the model, no numbers)* These are the amounts you typed, side by side; what each costs after tax is a question for
> your accountant.

- **"Cheapest":** only the person's own agreed per-way numbers, like for like (same period, or their own count). Never
  after tax; never a listed price the person didn't agree to. Every answer carries the *Not in these numbers* line.
- **"Fastest":** nothing here carries a time; a rental period is a price, not a wait. Only typed, cited times on road
  steps could answer it (call K9, task S2.5.25j).
- **"Strongest long-term foundation":** the Lens can lay out the cited differences (Buy: property in a CCA class; Lease:
  deductible payments and the T2145 election; Rent: a deductible expense) and ask what the person means by "foundation".
  Which matters most is the person's measure (call K8).

## 5. How it's built

| Piece | Kind | Lives in |
|---|---|---|
| Way ids, **line kinds** and the ways each kind offers, questions to take, ask-in-writing lists | Catalog | `lib/engines/ways/v2026/` (new): `ways.ts`, `line-kinds.ts`, `ask-for.ts` (keyed by province), `questions.ts`, `validate.ts`. Points to write-off entries; no tax text of its own |
| Which kind a named line is | Catalog | `NamedCostLine.lineKind?` (equipment · small-tools · vehicle · space · software · none) plus an optional `ways?: WayId[]` override, in `lib/engines/roads/v2026/types.ts`; set in roads 0 and 1 and emitted by the research-pack skeleton (S2.5.25f) |
| Tax treatment of each way | Catalog | `lib/engines/writeoffs/v2026/categories.ts`, keyed by asset kind and its existing `provinces`: new *Rent of business property*, *Leasing costs* (election as condition), *Small tools (Class 12)*; *Vehicle* gains the 2026 amounts [S5]; *Capital equipment* gains the amber line |
| Proposed or unclear measures | Catalog | Same catalog, `status: "proposed"`, day seen, re-check before each release; no rule reads them (calls 6, 7) |
| Places to ask | Catalog | `lib/engines/help/v2026/places.ts` (new); each row has `provinces` and optional `areas`, `occupations` (NOC), `industries` (NAICS); citation authority gains `"regulator"`, `"not-for-profit"`, `"municipal"` (`lib/engines/shared/types.ts:5`, `docs/engines/citations.md`) |
| Places that publish rent prices (call 1 C) | Source registry cards, not legal citations | The kit's registry (`lib/engines/sources/v2026/registry.ts`, S2.5.25b): link, what the page lists, day seen, how checked, link-only display, keyed by line kind and area. No company page enters a catalog |
| Pages the Lens must never fetch | Source registry cards | Same registry, access `never-automated`, one list for every story: every source whose terms forbid automated access (S2.5.25b), including DOZR [S25], Meta [S26]`*`, Kijiji [S42]`†` once its quote passes, and the sites in competitive-landscape.md § 4.4 |
| The person's number for one way | Person's data | `Figure` gains nullable `wayId`, `rentEvery` (4h · day · week · 4weeks · month · year), `rentCount`, by `ALTER TABLE ADD COLUMN` only; names avoid `periodStart`/`periodEnd` (`prisma/schema.prisma:223-224`) |
| Way picked, follow-ups, ticks | Person's answers | `ScenarioState.activeBranches` JSON via `lib/db/scenario-state-json.ts`: `lineWays` (line id → way, `leaseOverOneYear`, `ticks`), `gstRegistered`, `workplace`; read only through `readMapAnswers` |
| "How you'd set this up" | Person's words | `PersonStatement` `kind: "how-id-build"` (`prisma/schema.prisma:92`) |
| Mara's rent and membership prices; words | Example data; screen text | `lib/examples/` sources (PR #170, merged); `lib/cockpit/words.ts` (`ways`, `help`), generic wording only |

- **No ways, no change.** A line of kind `none` (*Legal advice*, *Money to live on*) behaves as today; official fees
  never get ways and `validate.ts` refuses one.
- **One current number per line and way.** The Figure store's "takes back the one before" key gains `wayId`, changing
  `future-cockpit.md:1673-1678` to "one current number per cost line per way" (S2.5.22h updates it). Older numbers read
  as `wayId = null`: *"your number, way not said"*.
- **Money.** `evaluateRoad` (`lib/roads/`) yields one `CostLineAsShown` per priced way: *To start* adds fees and the
  picked way's one-time amount; *Paid as you go* lists picked Rent and Lease by period; new counts
  `waysPricedNotPicked`, `saidHave`; a test proves nothing counts twice. The same rows are what `list_options`
  (S2.5.25k) returns to the Lens.
- **Rules.** A pure function beside `evaluateRoad` lights § 4.5 from catalog conditions, the person's answers and the
  road's steps. The profile gains `waysPicked`; `lib/brain/evaluate.ts:130` also reads a Buy pick. A priced line alone
  lights nothing (the person might rent); a test proves it.
- **The Lens, later** (task list [9d] and [9g]; not built). Finding listed prices is now one shared feature for every
  source, S2.5.25p (*live look-ups on the person's own account*), replacing S2.5.22p. Only after the person turns on web
  search or the browser behind its warning, and only when they ask (*"Find listed prices for Rent: Woodworking machines
  and tools"*), it reads only the one page they name, once per ask: no crawling, no cache. It may *propose* a Figure
  with `amountFrom: "link"`, the page, the words seen and the day; it counts only after the agree prompt.
  `never-automated` domains are unreachable in code, not by prompt.

### 5.1 What the kit makes generic, and what stays per road

| Written for the cabinetmaker | Now keyed by | A new road gets it by |
|---|---|---|
| Which lines have ways | Line kind | Giving each named line a kind; the research pack's skeleton already does (S2.5.25f); the validator refuses a line neither kinded nor marked `none` (S2.5.25g) |
| Tax treatment per way (Classes 8 and 12, rent, lease, vehicle limits) | Asset kind + province | Nothing: entries attach to kinds, not roads |
| Ask-in-writing lists | Province | A person reading that province's list; none shown until then |
| *Where to ask* rows | Province, area, job code, industry code | Its keys; a job's own regulator is one more keyed row, found and cited by a person |
| Places that publish rent prices | Line kind + area | A registry card per place, checked like any source |
| Questions to take | Rule and asset kind | Nothing |

Still per road: line names and labels, any job-specific regulator row, and examples like Mara's. The kit's second-road
proof (S2.5.25l, a hairstylist road) must get ways, tax rows and *Where to ask* with no code outside its road file.

## 6. What's stored and what leaves the computer

- **Kept in the person's data file:** Figure columns `wayId`, `rentEvery`, `rentCount`; JSON keys `lineWays`,
  `gstRegistered`, `workplace`; `PersonStatement` kind `how-id-build`. Each is listed in `lib/privacy/inventory.ts` (the
  privacy test fails until it is) and counted on `/your-data`; the first two go with *Your ideas* on the Delete menu,
  the statement with *Your statements*. The kit's keys describe roads, not the person, and add nothing here.
- **Kept in the browser:** the ways fold, inside the existing `dotami-cockpit-folds` object (`lib/cockpit/folds.ts:27`;
  inventory entry `lib/privacy/inventory.ts:609` updated). No new key.
- **Sent: nothing new.** Catalogs and the registry ship in the app. Links open in the person's browser and carry no
  amount and nothing about the person (`docs/architecture/figures-privacy-review.md:42`,
  `lib/engines/roads/v2026/types.ts:78`). The Lens look-up is S2.5.25p's request (the one named page, plus the person's
  own model), with its `SENT_ELSEWHERE` entry and privacy log line in that task.
- **Privacy log lines** (`docs/privacy-log.md`, [Unreleased], one per pull request that adds them):
  1. *"Added: for each start-up cost line of an idea, how you say you'd get it (already have it, buy, rent, lease, not
     decided). The rules read it to show which tax pages apply. Deleted with the idea. Nothing is sent."*
  2. *"Added: a start-up number can name the way it prices and, for rent or a lease, how often it is paid and how many
     times, as you typed it. Nothing is sent."*
  3. *"Added, if you say: whether a lease runs more than a year and what it covers is worth, whether you're registered
     for GST/HST, and where you'd work. Nothing is sent."*
  4. *"Added: an optional note in your own words, 'how you'd set this up', kept dated and word for word, read by no
     rule. Nothing is sent."*

## 7. Rules check (`CLAUDE.md`)

| Rule | How this design meets it |
|---|---|
| Information and options, never a verdict (CLAUDE.md:22-24) | Fixed way order, identical rows, *DotAmi doesn't pick one*, no difference line; help grouped by kind, alphabetical, *doesn't recommend or rank anyone*; new screens join the no-verdict walk |
| Doesn't rank options by what it thinks matters to the person | **Collision, stated plainly:** the maintainer wants the Lens to answer "cheapest" and "strongest foundation"; this doc's screens say nothing about which costs less. Screens unchanged until call 11 (K7/K8) decides |
| Rules decide; the Lens never changes a catalog (:25-30) | Treatments, conditions, questions, places and registry cards are versioned catalogs; the Lens only proposes a number the person agrees to |
| Every rule, rate, threshold, date cited (:31-40) | Every catalog line cited and read or tool-checked; quotes checked first (S2.5.22e); DotAmi's labels carry no quote marks; regulators, non-profits and cities get their own citation kinds |
| Not legal or tax advice; never files (:41-43) | Class, election, passenger vehicle, return line and consumer-law reach are questions to take; Form T2145 linked, never filled |
| The person's words stay theirs (:44-46) | `how-id-build` kept word for word, dated, read by no rule |
| Never derive a fact about the person (:199) | Ways only from clicks; a priced line lights nothing; GST status only from its own answer; no class, city, licence or vehicle classification assigned; keys belong to roads |
| Never invent a number (:200) | Official fees, agreed numbers, and published prices in the invented example only (pick 2A); only price × the person's count, labelled *not a forecast*; no tax value, multiplier or undated incentive |
| Scope guard (:218-222) | No ordering, booking, lender matching or comparison across sellers; shops are credited sources or links |
| Inventory and privacy log (:161-167, :269-272); migrations never rebuild `Venture` (`future-cockpit.md:1545-1550`) | § 6; JSON keys, `Figure` by `ADD COLUMN` only, checked in `tests/desktop-migrate.spec.ts` |
| Powerful Lens actions off until turned on; value over more safety settings | S2.5.25p only after web or browser is on behind its warning; no new setting or permission screen |

## 8. Honest limits

- **Lease prices and deposits are not published.** BDC (the Business Development Bank of Canada) says "pricing is unique
  to each financing request" [S28]. The Canada Small Business Financing Program publishes ceilings only: prime + 3%
  floating and a 2% registration fee [S27]. A real person's Lease row is only their own quote.
- **Few rent prices are public.** One Calgary shop publishes them with no login [S20]; it doesn't publish deposits
  ("please call") but does an 8% damage waiver [S21]. Two makerspaces publish dues [S23][S24]. Sunbelt's Calgary page
  showed none; Home Depot Canada, United Rentals and Herc could not be read; no Edmonton shop with prices was found.
  Items for other jobs were not researched.
- **Reusing published prices is unsettled, so a DotAmi-built rent-price list is not offered.** Rogers Rent-All has no
  terms page but a copyright line [S22]. CBRE's Calgary report "cannot be reproduced without prior written permission"
  [S31]. DOZR's terms forbid "any collection and use of any product listings, descriptions, or prices" [S25]. Mara's
  prices rest on the same kind of reuse; asking each shop first removes the question (call 9).
- **Statistics Canada publishes only a price index** for equipment rental and leasing [S32], not dollar prices.
- **Nobody here can say what a deduction is worth, or which way costs less after tax**, the Lens included: that needs
  the person's tax situation and a projection.
- **The enhanced first-year treatment** shows no number or dates: no official page read states the multiplier, CRA's
  guide still says "under proposed changes" [S4], and the after-2024 and before-2034 dates come only from the Library of
  Parliament's summary of the bill as introduced [S8].
- **Classification stays open.** CRA limits Class 53 (manufacturing machinery) to property "acquired after 2015 and
  before 2026" [S1]; whether any road's machines count as manufacturing equipment is the accountant's question. Class 13
  (leasehold improvements) "depends on the type of leasehold interest" [S2]. The Productivity Mega Deduction is a
  proposal (Finance Canada, 2026-09-15 and 2026-10-01 [S9][S10]); no bill was seen. No official Alberta commercial-lease
  guide was confirmed.
- **The kit makes slots generic, not facts.** Each new province still needs its own read ask-in-writing list and *Where
  to ask* rows; until then that road shows fewer rows and says so.

## 9. Calls for the maintainer

Recommendations are to the maintainer; the product recommends nothing. Options, costs and risks for calls 2–9 are
unchanged and stay in the pull request and the calls list that comes with this doc.

1. **Where a real person's rent and lease prices come from. Answered 2026-10-15 (the maintainer): C**: own quotes plus
   the checklist and links to places that publish rent prices, now; the Lens finds listed prices on request later. His
   words begin "agreed. And not only this, but when they use the lense chat…" (full text in § 1). Built as registry
   cards (S2.5.25b) and the shared look-up (S2.5.25p); his comparison ask is S2.5.24.
2. **How ways are kept and counted.** Unchanged. Recommended: A (one picked way per line, a number for each way, only
   the picked way counts); E (staged) if the tax and legal pointers are wanted sooner.
3. **How much more to ask.** Unchanged. Recommended: C (picks light cited cards, three follow-ups, the own-words box).
4. **How rent and lease amounts are entered and shown.** Unchanged. Recommended: C (*Paid as you go* with period,
   optional count, *your numbers multiplied*). The count is also what lets the Lens put Buy and Rent on one scale (§
   4.10).
5. **Which places appear in *Where to ask*.** Options unchanged. Recommended: C (government, regulators' directories,
   Business Link Alberta). The kit changes only where rows live (keyed), so a job's own regulator can be one more row.
6. **Proposed or unclear tax changes.** Unchanged. Recommended: B (an amber, dated line with no numbers).
7. **Where the tax treatment lives.** Unchanged. Recommended: B (the write-offs catalog). The kit leans on B: those
   entries already carry `provinces`, so asset-kind keys reach every road with no copy.
8. **Which ways a line offers.** Unchanged. Recommended: A (Already have it, Buy, Rent, Lease; shared space through
   *Where would you work?*).
9. **Mara's example.** Unchanged. Recommended: A2 (credited prices after a short written OK from Rogers Rent-All,
   Protospace and ENTS, emails the maintainer sends), with B shown until the OKs arrive.

**10. New, from the kit: how does a line get its ways on a road nobody has written yet?** *Why it matters:* the
maintainer said "it makes no sense building all of this out repeatedly for every single job"; tagging ways by hand on
every line of every road is exactly that.

- **A. By hand on each line** (the original design). Same screens. 0 extra days. Risk: a forgotten tag silently hides
  the ways on a new road.
- **B. By line kind** (equipment, small tools, vehicle, space, software, none), with a per-line override. Same screens
  on every road. +0.5 day in S2.5.22f. Risk: an odd line gets a kind that doesn't fit; the writer overrides it, and the
  validator refuses a line with no kind.
- **C. By line kind and job code**, so a job could narrow its ways. +1 day. Risk: no source says which jobs rent or
  lease what, so choosing would be DotAmi's judgment, close to "never derive a fact".

Recommended: **B**. It does what his words ask with the least judgment by DotAmi.

**11. Where call 1's new ask meets the binding rules (decided once, as K7 and K8 in [research-kit.md](research-kit.md)
§ 10; answering K7 answers this).** The binding rule says DotAmi "does not rank options by what it thinks matters to the
person". Decision 3 already allows sorting by "one countable measure the person picks, always said on screen"
(`future-cockpit.md:47-48`, :836-837), and the research found that consistent with `CLAUDE.md:22-24`. The options as
they touch this doc:

- **A. Keep the rule as decision 3 already reads it** (= K7 A). The Lens sorts the person's own per-way numbers by a
  measure the person names, computed by code, with unpriced lines counted, before tax, with the *Not in these numbers*
  line, and says *"sorted by <measure>: your choice"* (§ 4.10). This already answers "cheapest by my numbers". Ways
  screens unchanged: no difference line on any screen. Risk: the Lens says something the ways screen doesn't; one
  sentence there says so.
- **B. A, plus the single word "lowest" outside the frame** ("Rent is lowest by your numbers"), with a dated
  `CLAUDE.md` note. Risk: one more exception to keep honest in tests.
- **C. Screens also sort ways by the person's numbers** (= K7 C). Risk: the screen starts to look like a recommendation,
  and the verdict checks need rewriting.

Recommended: **A** for "cheapest"; "fastest" and "strongest" follow K9 and K8 (nothing here carries a time, and
DotAmi holds no measure of "foundation"). His call; this doc follows K7/K8.

## 10. Tasks

| Id | Title | Done when | Days | Waits on |
|---|---|---|---|---|
| S2.5.22e | Re-check quotes; read the enhanced-deduction text | Every quote in § 4 found by `scripts/check-quotes.mjs` or read by a person, day recorded (PDFs S8, S29); anything not found dropped, not reworded; enhanced first-year rules and dates read in the enacted text, or recorded as not consolidated | 1 | — |
| S2.5.22f | Ways catalog and line kinds | `lib/engines/ways/v2026/` with ways, line kinds, questions, ask-in-writing lists keyed by province (Lease cited; Rent in DotAmi's words); road 0 and road 1 lines carry a kind; validate refuses ways on fees and named lines with no kind; integrity green | 2 | 2, 8, 10, K1 |
| S2.5.22g | Tax treatment entries | Rent, leasing (election and its "often do not" line), Class 12; vehicle 2026 amounts and "passenger vehicle" line; amber line under half-year; proposed items per call 6; entries keyed by asset kind; every citation read or tool-checked | 2 | 6, 7 |
| S2.5.22h | Storage | `Figure` `wayId`/`rentEvery`/`rentCount` by ADD COLUMN; JSON keys via `readMapAnswers`; store key per way; `future-cockpit.md` § 7 updated; inventory, Delete menu, privacy log; migrate test passes | 1.5 | 2, 3, 4 |
| S2.5.22i | Road evaluation and money | *To start*, *Paid as you go*, *not picked*, *said have*; receipts; no-double-count test; per-way rows readable by S2.5.25k's `list_options` | 1.5 | 2, 4 |
| S2.5.22j | Screens: ways side by side | Step panel rows, agree prompt with way and period, money list, rent-price links fold, phone width; fold in `dotami-cockpit-folds` with inventory updated; ui-spec with round placeholders; browser test; no-verdict and journey walks; a words test fails on any `WAYS_WORDS` entry (cheaper, cheapest, save, saves, lowest, fastest, strongest, costs less) on a ways screen | 2.5 | 2, 4, 8 |
| S2.5.22k | Rules your answers bring into view | Pure function plus `evaluate.ts` predicate; each card names its answer or step; records card from the records step; no licence card; tests: a priced line alone lights nothing, `gstTiming` never lights GST | 2 | 3, 6, 7 |
| S2.5.22l | The new questions | § 4.8 in *Not told yet* only when needed; *I don't know*; `gstRegistered` only as its own answer; no passenger-vehicle question; own-words statement kept | 1.25 | 3 |
| S2.5.22m | Where to ask and questions to take | Keyed help catalog (province, area, job, industry); new citation kinds in the type and `docs/engines/citations.md`; Find a Lawyer and CRA's current Liaison Officer page tool-checked; panel and four *Your plan* sections; print test; a road with no matching rows says so | 2.25 | 5, K1 |
| S2.5.22n | Places that publish rent prices | **Now a view over the source registry (S2.5.25b):** cards for Rogers Rent-All, Protospace and ENTS, keyed by line kind and area; in the link check | 0 here | 1 (answered) |
| S2.5.22o | Mara's ways | Rows per call 9, every number sourced and credited, periods in the shop's words; with A2, written OKs recorded first (about 0.25 day of the maintainer's time); example tests green | 1 | 9 |
| S2.5.22p | Lens proposes a listed price | **Replaced by S2.5.25p** (one live look-up feature for every source); § 5's limits (one named page, no crawl, no cache, agree prompt, `never-automated` unreachable) are its done-when for prices | 0 here | 1 (answered) |

About **17 build days before the Lens**; the kit's own tasks are counted in research-kit.md. With call 2 option E, a
first stage of about 5 days (S2.5.22e, S2.5.22g, S2.5.22m and the pick part of S2.5.22f) ships the tax treatment, the
pointers and *Where to ask* before any per-way number is kept. S2.5.22d (this doc) is done when calls 2–11 are answered.

## 11. Not in scope

- The competitive landscape ([competitive-landscape.md](competitive-landscape.md)), the kit itself
  ([research-kit.md](research-kit.md)) and the Lens's comparison conversation
  ([lens-comparisons.md](lens-comparisons.md)).
- Working out tax owed, any deduction's value, instalments, or which way costs less after tax; assigning a CCA class or
  vehicle classification; filling or filing Form T2145 or any form.
- Loan or lease calculators, and the financing program beyond its catalog entry
  (`lib/engines/grants/v2026/programs.ts`); asking the person's city; hiring and workers' compensation (a separate
  story).
- Ask-in-writing lists and *Where to ask* rows for provinces other than Alberta (the keys are ready; the reading isn't);
  typical numbers for a real person (phase-2 open item, `future-cockpit.md` § 13).

## 12. Open questions (never stated as fact in the product)

- **The enhanced deduction:** which property, dates in the enacted text, the first-year factor, and why CRA guides still
  say "proposed" after Royal Assent (Bill C-15 received Royal Assent on 2026-03-26 [S6]; that release doesn't mention
  CCA). Re-check the Productivity Mega Deduction on LEGISinfo before every release.
- **Classes:** Class 43 (30%) or Class 8 for 2026 machinery bought by a small shop (only a verifier's note covers Class
  43); which classes name manufacturing, and whether an industry code could light that question (not read); the Class 8
  separate-class election for equipment of $1,000 or more, Class 6 and the Class 13 formula (not seen on a CRA page).
  **The 5% GST rate** was not confirmed on a page read; only "Alberta has no sales tax" was.
- **The rest of the lease election:** an arm's-length condition, and what section 8200 excludes; T2145's text was not
  read.
- **Pages seen but not tool-checked:** Find a Lawyer wording [S43]; LawCentral Alberta's limited-scope help; Kijiji's
  terms on scrapers [S42]; BDC's equipment-loan page; Rogers Rent-All's FAQ line that rented items can be bought later;
  CRA's current Liaison Officer page.
- **Rent-price sources beyond links:** whether any rental shop or marketplace offers an official API (application
  programming interface) or MCP (Model Context Protocol) server whose terms allow look-ups on the person's own account.
  Not researched; the registry records it per source if found (call K2).
- **Keys:** whether competitive-landscape's own area answer (its call 6) may narrow *Where to ask*; whether six line
  kinds cover every road's lines.
- **Makerspace membership tax treatment:** none found; the row sends it to the accountant. **Legal reach:** whether
  Alberta's consumer lease rules reach a business lease; what personal property registration means for a lessee.
  **Permission:** whether Rogers Rent-All, Protospace and ENTS agree to their prices in Mara's example (call 9 A2).

## 13. Sources (seen 2026-10-15; `*` = read through a summariser, re-check by tool; `†` = reported by the reviewer, not yet read)

- [S1] CRA, *Classes of depreciable property* (Classes 8, 12 with exceptions, 50, 1; Class 53 "acquired after 2015 and before 2026"). `*` https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/classes-depreciable-property.html
- [S2] CRA, *Capital cost allowance (CCA) classes* (Classes 10, 10.1, 13). https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/classes.html
- [S3] CRA, *Basic information about capital cost allowance* (half-year rule). https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/basic-information-about-capital-cost-allowance.html
- [S4] CRA, T4002 Chapter 4 (exempt classes, transferred personal property, "under proposed changes"). `*` https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html
- [S5] Finance Canada, 2026 automobile deduction limits (2026-01-14). https://www.canada.ca/en/department-finance/news/2026/01/government-announces-the-2026-automobile-deduction-limits-and-expense-benefit-rates-for-businesses.html
- [S6] Finance Canada, Bill C-15 Royal Assent (2026-03-26); does not mention CCA. https://www.canada.ca/en/department-finance/news/2026/03/legislation-passes-to-implement-budget-2025-canada-strong.html
- [S7] CRA, Income Tax Folio S3-F4-C1 (enhanced CCA; s.16.1 lease conditions). `*` https://www.canada.ca/en/revenue-agency/services/tax/technical-information/income-tax/income-tax-folios-index/series-3-property-investments-savings-plans/series-3-property-investments-savings-plans-folio-4-capital-cost-allowance/income-tax-folio-s3-f4-c1-general-discussion-capital-cost-allowance.html
- [S8] Library of Parliament, Bill C-15 legislative summary (2026-01-19), bill as introduced; a PDF, a person reads it. https://library-biblio.parl.ca/staticfiles/PublicWebsite/Home/ResearchPublications/LegislativeSummaries/PDF/45-1/45-1-C15-E.pdf
- [S9] Finance Canada, Productivity Mega Deduction backgrounder (2026-09-15, a proposal). https://www.canada.ca/en/department-finance/news/2026/09/government-of-canada-introduces-new-productivity-mega-deduction-to-boost-canadas-advantage-as-the-most-competitive-g7-country-for-new-business-inve.html
- [S10] Finance Canada, release of 2026-10-01 (a proposal). https://www.canada.ca/en/department-finance/news/2026/10/the-government-of-canada-introduces-new-productivity-mega-deduction-to-help-businesses-invest-grow-and-create-jobs-in-canada.html
- [S11] CRA, *Current or capital expenses*. https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses/current-capital-expenses.html
- [S12] CRA, *Line 8910 – Rent*. https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/line-8910-rent.html
- [S13] CRA, *Leasing costs*. https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses/leasing-costs.html
- [S14] CRA, Form T2145. https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2145.html
- [S15] CRA, *When to register for and start charging the GST/HST*. https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html
- [S16] CRA, *Input tax credits* (modified 2026-10-14). `*` https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/calculate-prepare-report/input-tax-credit.html
- [S17] Alberta, *About Tax and Revenue Administration*. https://www.alberta.ca/about-tra
- [S18] CRA, *Business-use-of-home expenses*. https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html
- [S19] CRA, *Where to keep your records, for how long…*. https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html
- [S20] Rogers Rent-All, 10-inch table saw on stand. https://www.rogersrentall.ca/equipment.asp?action=category&category=36&key=041%2D0062
- [S21] Rogers Rent-All, *Rental Policies*. https://www.rogersrentall.ca/policies.asp
- [S22] Rogers Rent-All, FAQ, with the footer copyright line. https://www.rogersrentall.ca/faq.asp
- [S23] Protospace. https://protospace.ca/
- [S24] ENTS, *Join now*. https://ents.ca/join_now/
- [S25] DOZR, *Terms & Conditions*. https://i.dozr.com/terms
- [S26] Meta, *Automated Data Collection Terms*. `*` https://www.facebook.com/legal/automated_data_collection_terms
- [S27] ISED (Innovation, Science and Economic Development Canada), Canada Small Business Financing Program. https://ised-isde.canada.ca/site/canada-small-business-financing-program/en/canada-small-business-financing-program/find-loan-your-small-business/helping-small-businesses-get-loans
- [S28] BDC, *Equipment financing: a step-by-step guide*. https://www.bdc.ca/en/articles-tools/money-finance/get-financing/equipment-financing-101-everything-you-need-know
- [S29] Alberta, Cost of Credit Disclosure Regulation, AR 198/1999, s.19; a PDF, a person reads it. https://kings-printer.alberta.ca/documents/Regs/1999_198.pdf
- [S30] Alberta, Consumer Protection Act, Part 9, s.60. https://kings-printer.alberta.ca/1266.cfm?display=html&isbncln=9780779805143&leg_type=Acts&page=c26p3.cfm
- [S31] CBRE, Calgary Industrial Figures Q2 2026. https://mktgdocs.cbre.com/2299/caf96f5f-26c2-4177-97bd-b2616473d3fc-1472007596/Calgary_Industrial__Figures_Q2.pdf
- [S32] Statistics Canada, table 18-10-0279-01. https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810027901
- [S33] CRA, *Meet the Liaison Officers* (2024-03-12, a tax tip; to be replaced by the current service page). https://www.canada.ca/en/revenue-agency/news/newsroom/tax-tips/tax-tips-2024/our-experts-can-help-you-understand-your-business-tax-obligations-meet-liaison-officers.html
- [S34] Business Link Alberta, *About*. https://businesslink.ca/about/
- [S35] CPA Alberta, *Verify Member*. https://services.cpaalberta.ca/VerifyEntity/Members/
- [S36] Law Society of Alberta, Lawyer Referral Service closure. https://www.lawsociety.ab.ca/?p=25078
- [S37] Alberta, *Business licence or charitable registration*. https://www.alberta.ca/business-licence-or-charitable-registration-in-alberta
- [S38] City of Calgary, *Opening a business in Calgary*. https://www.calgary.ca/pda/pd/mybusiness/business-101.html
- [S39] City of Edmonton, *Business Licensing*. https://www.edmonton.ca/business_economy/business-licensing
- [S40] Alberta, *Personal Property Liens – Register an interest*. https://www.alberta.ca/personal-property-liens-register-interest
- [S41] CRA, *Who has to pay instalments*. https://www.canada.ca/en/revenue-agency/services/payments/payments-cra/individual-payments/income-tax-instalments/who-pays-instalments.html
- [S42] Kijiji, *Terms of Use*. `†` https://community.kijiji.ca/t/kijiji-terms-of-use/29
- [S43] Law Society of Alberta, *Find a Lawyer*. `†` https://www.lawsociety.ab.ca/public/findalawyer/
