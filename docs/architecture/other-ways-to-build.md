# Other ways to build: buy, rent or lease, and where to look for tax and legal help (design)

Status: **Design, not built. Waiting on the maintainer's calls (section 9).** Written 2026-10-15. There is
no product code until the maintainer answers them. In the public task list this is
[14f](../task-list.md) (the maintainer's tracker calls it story S2.5.22, tasks 22a–22d); the build tasks
this design adds are S2.5.22e onward (§ 10).

Read with [future-cockpit.md](future-cockpit.md) (the cockpit, the road data model, decision 2: no
averages for a real person), [use-cases.md](use-cases.md) (the Lens and its permission levels) and
[connectors-and-agents.md](connectors-and-agents.md) (agents propose, the person confirms). The other
new story of the same day, seeing who else is in the same line of work, has its own design:
[competitive-landscape.md](competitive-landscape.md).

Every fact below about a rule, a price source, a licence or terms of use carries a source number ([S1]…)
from § 13. Every source was seen on **2026-10-15**. Sources marked `*` were read through a summarising
tool, and sources marked `†` were reported by the design's reviewer and not yet read by the research.
Before anything goes into a catalog, every string in quote marks in § 4 is found word for word by
`scripts/check-quotes.mjs` or read by a person, with the day recorded (task S2.5.22e). Anything the
research could not confirm is in § 12 and is never stated as fact.

Day counts are rough estimates in working days, not measurements.

## 1. The request

The maintainer, 2026-10-15, word for word:

> "this looks great, because now that we have a more realistic estimate of costs and expenses, we can
> now point someone in the right direction for their tax and legal situation, as well as more ways in
> which someone could build a business, like -for example- if someone couldn't write off all of these
> tools, they could potentially just rent, or lease and see where that could take them with appropriate
> cost estimates. Of course the users would have to provide more detailed info for dotami to then give
> the user a more detailed future scaped plan."

The tracker breaks it into four tasks:

- **22a:** buy, rent or lease side by side for each start-up cost line, each with its price and the
  official tax treatment of that way.
- **22b:** "point you in the right direction" on tax and legal matters. That means which official rules
  the person's own numbers and picks bring into view, and where to get qualified help. Never a verdict.
- **22c:** more detail from the person, for a more detailed plan: which extra questions to ask, kept as
  the person's own words and figures.
- **22d:** this design and the maintainer's calls, before any code.

Rulings this design keeps:

- **Pick 2A (2026-10-11).** A real person's cost lines are official fees plus their own quotes. Averages
  appear only in the invented example.
- **Option B (2026-10-11).** Sources are checked by a tool or read by a person.
- **2026-09-24.** "dotami shouldn't hold the data… access only if the user allows it, like any other
  software".
- **Value over more safety settings.**

## 2. The idea in one paragraph, from the person's side

Today someone looking at *Open your own shop* sees *Woodworking machines and tools: add your quote*. That
is one blank, and it only fits a purchase. After this story, a line that can be had more than one way asks
one new thing: **How would you get this?** The answers are *Already have it · Buy · Rent · Lease · Not
decided*.

Below the line, each way sits in its own row, in the same layout and always in that order. Each row has the
person's own number (or *add your quote*) and how the Canada Revenue Agency (CRA) treats that way, quoted and
linked. The start-up money gauge counts only the way the person picked. Rent and lease payments sit in their
own row instead of being multiplied into a forecast. Picking a way brings into view the official rules that
way touches. A short *Where to ask* list names the government offices, regulators and funded non-profits
that help with tax and legal questions.

DotAmi picks no way, ranks no way, and never says which costs less.

## 3. What the design starts from (what is already built)

- **Cost lines.** A road step's `costs` hold only official-fee lines and named lines
  (`lib/engines/roads/v2026/types.ts:76-77`, `NamedCostLine` :168). A screen shows exactly three kinds
  of cost line: official fee, your quote, and named but not priced (`CostLineAsShown` :184). None has a
  buy, rent or lease dimension.
  - Road 1's *Open your own shop* names eight lines, including *Woodworking machines and tools*, *Shop
    space deposit*, *Vehicle*, *Design or CAD software* and a cited *Legal advice on the business form*
    (`lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts:866-879`).
  - Road 0 names seven blanks (`lib/engines/roads/v2026/starting-any-business-ab.ts:786-792`).
- **The person's numbers.**
  - A `start-up-cost-line` Figure prices one named line. Its `amountFrom` records where the number came
    from: quote, link, receipt or your guess (`lib/figures/types.ts`).
  - Each idea keeps one current number per line (`future-cockpit.md:1602-1607`).
  - An official fee can't be priced (`lib/figures/store.ts:104`).
  - A Figure can be *proposed* by the Lens and counts only once the person agrees (`lib/figures/types.ts`).
- **Side by side with no pick from DotAmi.** The ways to incorporate are listed together, DotAmi picks
  none, and neither counts in the total until the person picks (`lib/engines/cfe/v2026/incorporation-routes.ts:4-8`).
  The open gap, "two fee lines can't yet be marked as alternatives", is at `future-cockpit.md:895-900`.
  This design closes it.
- **Answers kept with the map, with no migration.** `ScenarioState.activeBranches` holds a JSON object
  read through `readMapAnswers`. It already carries `incorporateAt`, `decided` and `equipmentNo`
  (`lib/db/scenario-state-json.ts:1-22`).
- **Tax treatment already cited.** The write-off catalog (`lib/engines/writeoffs/v2026/categories.ts`)
  already has:
  - *Capital equipment*: Income Tax Act 20(1)(a) and Class 8 at 20%, with a lease note;
  - *CCA Class 50*, the one entry that uses the `firstYearIncentive` field today (:163);
  - *Vehicle*: the Act's lease and interest caps, "or such other amount as may be prescribed";
  - *Software*: the current-versus-capital line.

  Nothing covers renting business property or leasing equipment as a yearly expense.
- **What lights the capital cost allowance cards today.** Only the person's equipment answer:
  `capitalRelevant = entry.ccaClass !== undefined && profile.capitalPurchasePlanned`
  (`lib/brain/evaluate.ts:130`). A priced line never lights them. A time-boxed incentive turns an entry
  amber with its expiry (`lib/brain/evaluate.ts:137-150`).
- **Citation kinds.** A catalog citation's authority can be only `"CRA" | "federal" | "provincial"`
  (`lib/engines/shared/types.ts:5`).
- **The records step.** Since #174 every business road has a *Keep your records from day one* step
  (`lib/engines/roads/v2026/keep-records.ts`).

## 4. What a person sees, screen by screen

All words go through `lib/cockpit/words.ts` and the verdict-word checks (`tests/helpers/verdict-words.ts`,
`e2e/no-verdict.spec.ts`, `e2e/journey.spec.ts`). None of them uses *best*, *better*, *cheaper*, *save*,
*should*, *recommend* or *#1*. Ways always appear in one fixed order (Already have it · Buy · Rent · Lease).
The order never depends on price.

**Amounts in these mockups are placeholders, not sourced figures.** The ui-spec pages use obviously round
placeholders.

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
  Nothing on this line counts in Start-up money until you pick a way.
```

- The fold is remembered like the cockpit's other folds: one more entry in the existing
  `dotami-cockpit-folds` object in `localStorage` (`lib/cockpit/folds.ts:27`), whose privacy inventory
  entry (`lib/privacy/inventory.ts:609`) is updated to name it. Below 768 px the rows stack.
- **No difference line, ever.** The screen never says "Rent costs $X less". Each row shows only the
  person's own number.

### 4.2 How the tax rules treat each way

These are cited lines from the write-offs catalog. Each opens *Sources* with *Checked by a tool on …* or
*Read by a person on …*. Text in quote marks is the source's own words; text without quote marks is
DotAmi's plain label. For the tools line:

- **Buy.** Buying: the cost is claimed through capital cost allowance (CCA) over several years.
  - Tools of $500 or more each go in Class 8 (20%) [S1].
  - Tools under $500 bought on or after May 2, 2006 go in Class 12 (100%) [S1]. Dies, jigs, patterns,
    moulds, lasts and the cutting or shaping part of a machine stay under the half-year rule [S1].
  - The half-year rule: "In the year you acquire a depreciable property, you can usually claim CCA only
    on one-half of your net additions to a class." [S3] Some classes are exempt [S4]`*`.
  - **Always directly under that line, in amber:** *CRA's Income Tax Folio S3-F4-C1 says changes made by
    Bill C-15 provide temporary enhanced CCA for some property [S7]`*`, and CRA's guide T4002 says the
    half-year rule does not apply to property that gets the enhanced treatment [S4]`*`. Which property,
    and from which dates, is a question for your accountant.* No dates and no multiplier are shown until task S2.5.22e reads them in the enacted Act or
    Regulations (§ 12). The line lives on the same catalog entry as the half-year text, through the
    existing `firstYearIncentive` field and its amber state (`lib/brain/evaluate.ts:137-150`), once those
    dates are read; until then it is an amber note on the same entry, never a separate card, so the two
    can't drift apart.
  - *Which class each tool goes in is a question for your accountant.*
- **Rent.** "You can deduct rent incurred for property used in your business." [S12] On the shop space
  line only, the row adds that this is line 8910 of form T2125 [S12]. On the tools and vehicle lines it
  doesn't, because that page doesn't address renting equipment; *which line of your return it goes on* is
  a question to take to the accountant (§ 4.7).
- **Lease.** "Deduct the lease payments incurred in the year for property used in your business." [S13]
  - The lessor and the lessee can jointly elect to treat a lease as a purchase on Form T2145 [S13][S14].
  - Conditions: the total fair market value of the property in the lease is more than $25,000 [S13]; the
    lease is for "more than one year"; property prescribed in section 8200 of the Regulations is excluded;
    and the election is filed "with both the lessor and lessee's income tax return" [S7]`*`.
  - After a tool check, in the page's own words: CRA says "office furniture and vehicles often do not"
    qualify [S13].
- **Already have it.** If you move personal property, "such as a car or a personal computer", into the
  business, the half-year rule applies to it [S4]`*`. *Its value for tax is a question for your
  accountant.*
- **Vehicle line only, Buy and Lease rows** (Finance Canada, 2026 limits [S5]), always shown, with no
  question asked first:
  - Class 10.1 ceiling: $39,000 before tax.
  - Deductible lease cost: $1,100 a month before tax for leases from 2026-01-01.
  - Deductible interest on a new car loan: $350 a month.
  - *These limits apply to a "passenger vehicle" as tax law defines it; whether yours is one is a
    question for your accountant.* The lease-as-purchase election is not shown on the vehicle line.
- **Under every row:** *What any deduction is worth depends on your own tax situation, which DotAmi
  doesn't work out. This is information for you and your accountant, not tax advice.*

### 4.3 What to ask for in writing

**Lease.** The checklist is the items Alberta's Cost of Credit Disclosure Regulation, section 19, lists for
a lease disclosure statement: the term, the cash value, the payments, the estimated residual value, the
buyout price, when and how the lease can end early and what that costs, payments for unreasonable wear or
excess use, the annual percentage rate (APR) and the total lease cost [S29]. King's Printer allows
reproducing Alberta's regulations with acknowledgment [S29]. S29 is a PDF, so a person reads it word for
word before the list ships (S2.5.22e).

One line follows, in the Act's own words once checked: *Alberta's Consumer Protection Act says its Part 9,
which includes leases, applies when the agreement is entered into "primarily for personal, family,
household or farming purposes" [S30]. Whether these items apply to a business lease is a question for a
lawyer or Service Alberta. The list still works as things to ask for in writing.*

**Rent.** The section 19 list is not shown under Rent: its items (residual value, buyout price, APR) are
about leases. Rent gets DotAmi's own short checklist, in plain words and with no citation: *Ask what the
deposit is, whether there's a damage waiver, whether tax is included, and what delivery costs.* No company
page is cited in a catalog.

The person can tick each item as received. A tick is the person's own mark.

### 4.4 The Money gauge (call 4, option C)

> **To start:** $8,000 · 4 lines you priced, 2 official fees · 3 lines not priced yet ·
> **1 line priced 2 ways, not picked: not counted**
> **Paid as you go:** $400 every 4 weeks · from 1 line you'd rent
> *Your $400 × your 6 = $2,400. These are your numbers multiplied, not a forecast.*

- A line with two or more ways priced and none picked counts in neither total, and the gauge says so.
  This follows the incorporation-routes precedent.
- *Already have it* counts as neither priced nor unpriced: *"1 line you said you have."*
- A picked Rent or Lease amount goes in *Paid as you go* with the period the person typed. It is never
  turned into months, never added to *To start*, and never compared with a Buy number. The multiplied
  line appears only when the person typed a count.
- Receipts work as they do today, by comparing two runs of the rules: *"Because you picked Lease for
  Vehicle: 2 rules now in view; the line moved to Paid as you go."*

### 4.5 Rules your answers bring into view (Rules & tax overlay)

This is a section of the existing overlay, not a new screen. Each card names the answer, or the step on
the road, that lit it:

- *Shown because you picked Buy for Woodworking machines and tools.* Capital equipment, Class 8 and
  Class 12, with the half-year line and the amber line under it exactly as in § 4.2.
- *Shown because Keep your records from day one is on your road.* Keep records six years from the end of
  the last tax year they relate to. Keep records of long-term property indefinitely. Keep them in Canada
  unless the CRA gives written permission [S19]. This card doesn't depend on any way picked.
- *Shown because you said the lease runs more than one year and what's in it is worth $31,000.* The
  lease-as-purchase election, with its conditions and CRA's "office furniture and vehicles often do not"
  line [S7][S13]. Never on the vehicle line. Also: *"A lease of more than one year is one of the interests
  Alberta's Personal Property Registry records [S40]; what that means for you is a question for a
  lawyer."*
- *Shown because you picked Buy or Lease for Vehicle.* The 2026 limits with their "passenger vehicle"
  line [S5], as in § 4.2.
- *Shown because you picked Rent.* Rent is deductible [S12], and the current-or-capital test for repairs:
  restoring something to its original condition is usually a current expense, improving it is capital [S11].
- *Shown because you said you'd work from home.* Business use of home. It counts only for a principal
  place of business, or a space used to meet clients on a regular and ongoing basis, and the expenses
  cannot create or increase a business loss [S18].
- *Shown because you said you're not registered for GST/HST* (goods and services tax / harmonized sales
  tax). Only registrants claim input tax credits, and only for business use. A new registrant may be able
  to claim credits on capital property on hand the day they register [S16]`*`. After a tool check, from
  the same page: CRA also lists "certain capital property" among things you can't claim credits on
  [S16]. Registration is required past $30,000 in one calendar quarter or over four quarters in a row
  [S15]; after a tool check, from the same page: the $30,000 counts your associates' sales too [S15].
  *"Alberta has no sales tax."* [S17] *How these apply to what you'd buy is a question for your
  accountant.* This card reads only the person's own `gstRegistered` answer (§ 4.8).

A rule that needs a number DotAmi never works out shows as a row with no light. For example: *"Tax
instalments come into view once you and your accountant know your tax owing (over $3,000)."* [S41]

Licences are not a lit card. Whether a licence applies depends on what the person would sell, which DotAmi
doesn't know, so it goes in *Where to ask* and the questions to take (§ 4.6, § 4.7).

### 4.6 Where to ask

This list sits in the right-hand panel, opens from every card above, and also appears in *Your plan*. It is
grouped by kind (government, then regulators' public directories, then government-funded advice) and is
alphabetical inside each group. It is introduced with *"DotAmi doesn't recommend or rank anyone. Each is
described in its own words."* Each row says what the place is and what it isn't, and says "free" only where
the place's own page does. DotAmi's own descriptions are plain text, with no quote marks and no source
number; quote marks are kept for the place's own words.

- **CRA Liaison Officers.** Free, confidential help with business tax obligations; you can request a
  visit. Task S2.5.22m cites CRA's current Liaison Officer service page after a tool check, rather than the
  2024 tax tip [S33], and says nothing about who qualifies.
- **Service Alberta business licensing office.** For whether a licence applies to what you'd sell: *Ask
  whether any licence applies to what you'd sell (Alberta lists licence types such as Prepaid
  contracting)* [S37].
- **Your city.** Calgary: every business registers with the City and gets location approval [S38].
  Edmonton: every business needs a business licence [S39]. These are links only.
- **CPA Alberta: Verify a CPA member** [S35]. DotAmi's description: checks registration, not whether
  someone suits your situation.
- **Law Society of Alberta: Find a Lawyer** [S43]`†`, linked once S2.5.22e passes its quote ("does not
  recommend or endorse individual lawyers"). Its former referral service closed on 2023-09-22 and "did not
  provide free legal advice" [S36]. DotAmi promises no free consultation.
- **Business Link Alberta.** A government-funded non-profit offering "free one-to-one guidance" [S34].

Opening a link is the person's own click, and nothing about the person goes in it.

### 4.7 Your plan (print)

Four new sections, all drawn from what is kept, with nothing generated:

1. **How you'd get each start-up item:** each line, the way picked (or *not decided*), your number for
   each way, and the checklist ticks.
2. **In your words: how you'd set this up:** the newest statement of that kind, word for word and dated.
3. **Questions to take to your accountant / to your lawyer:** one catalog question for each rule in view,
   each with its source. Examples: *"Which capital cost allowance class does each tool go in?"*, *"Does
   my lease qualify for the T2145 election?"*, *"Which line of my return does renting equipment go on?"*,
   *"Is my vehicle a passenger vehicle for tax?"* and *"Does any Alberta licence apply to what I'd sell?"*
4. **Where to ask:** the list from § 4.6.

The plan's existing line, *not legal or tax advice; a prep tool for your accountant and lawyer*
(`lib/cockpit/words.ts:481`), stays.

### 4.8 The new questions (22c, call 3)

Each question is asked only while something on screen depends on it (`future-cockpit.md:710`), and *I don't
know* is always an answer.

1. **"How would you get this?"**, once for each line that has ways. It opens the money list, because a
   question with several answers isn't a one-question-box question (`future-cockpit.md:567-573`). *Not told
   yet* (`lib/cockpit/told.ts:248-306`) gains *"How you'd get 5 start-up items"*.
2. **"What's your number?"** for each way. This is today's agree prompt plus the way's name. For Rent or
   Lease it also asks *every* (4 hours · day · week · 4 weeks · month · year) and, optionally, *how many*.
3. **After a Lease pick:** *"Is the lease longer than one year?"* and *"What is everything in it worth?"*
   The second is the person's own number.
4. **Once per idea, after any line is priced:** *"Are you registered for GST/HST?"* (yes · no · I don't
   know). It is kept only as its own explicit answer, `gstRegistered`. It is never prefilled from the
   road 0 `gstTiming` fork (a map pick about when registration sits on the plan, which holds the map's
   default and isn't kept for road 1 at all; `lib/brain/evaluate.ts:539`), from `equipmentNo`, or from
   revenue figures. A test: an idea with any `gstTiming` value and no `gstRegistered` answer shows the
   GST row as not told.
5. **Once per idea:** *"Where would you work?"* Rented shop · shared shop · home · not sure.
6. **Optional box:** *"In your own words: how you'd set this up"*, for example *"rent the big machines for
   a year, buy hand tools"*. It is kept dated and word for word, shown back, and read by no rule. The
   screen says so.

There is no *passenger vehicle* question: that is a tax classification, so the limits are always shown on
the vehicle line with the line saying so (§ 4.2). There is no profile, no city question and no hours
question (hours are phase 2, `future-cockpit.md:736`).

### 4.9 Mara's example (invented person, real numbers; call 9)

With call 9 option A1 or A2, Mara's tools line shows a **Rent** row beside her Buy total, and her space line
shows two shared-shop memberships. Each is credited in *Where these numbers come from*, the same way her tool
prices are:

- **Rent:** Rogers Rent-All, Calgary, 10-inch table saw on a stand: $50 a day, $198 a week, and $398, which
  the page labels "Monthly" [S20]. The shop's policies define its longest period as a 4-week rental, "any
  28 consecutive day period" [S21], and say to check each item for when the weekly rate applies. Mara's
  row shows the period in the shop's own word.
- **Shared shop:** Protospace, Calgary: "$55 / month for 24/7 access", with a wood shop [S23]. ENTS,
  Edmonton: $120 a month, joined in person after a safety orientation, members 18 or older [S24].

The example shows the rows and does not pick a way for Mara.

## 5. How it's built

| Piece | Kind | Lives in |
|---|---|---|
| Way ids, the lines each fits, questions to take, the ask-in-writing lists | Catalog (code) | `lib/engines/ways/v2026/` (new): `ways.ts`, `ask-for.ts`, `questions.ts`, `validate.ts`. Points to write-off entries; holds no tax text of its own |
| Which ways a named line offers | Catalog | `NamedCostLine.ways?: WayId[]` in `lib/engines/roads/v2026/types.ts`; set in road 0 and road 1 files |
| Tax treatment of each way | Catalog | `lib/engines/writeoffs/v2026/categories.ts`: new *Rent of business property*, *Leasing costs* (election as its condition), *Small tools (Class 12)*; *Vehicle* gains the 2026 prescribed amounts [S5]; *Capital equipment* gains the amber line of § 4.2 |
| Proposed or unclear measures | Catalog | In the same write-offs catalog, as entries with `status: "proposed"`, the day seen and a re-check before each release. No rule reads them; the ways catalog only points to them (call 6, call 7) |
| Places to ask | Catalog | `lib/engines/help/v2026/places.ts` (new); citation authority gains `"regulator"`, `"not-for-profit"` and `"municipal"` (`lib/engines/shared/types.ts:5`, `docs/engines/citations.md`) |
| Places that publish rent prices (call 1 B or C) | Dated observations, not legal citations | The same observation type as [competitive-landscape.md](competitive-landscape.md) § 4 (*Where to look*) and PR #170's `ExampleSources`: link, what the page lists, day seen, how checked. No company page enters a catalog |
| The person's number for one way | Person's data | `Figure` gains nullable `wayId`, `rentEvery` (4h · day · week · 4weeks · month · year) and `rentCount`, added with `ALTER TABLE ADD COLUMN` only. The names avoid Figure's existing `periodStart`/`periodEnd` (`prisma/schema.prisma:223-224`) |
| Which way counts, follow-up answers, checklist ticks | Person's answers | new keys in the `ScenarioState.activeBranches` JSON through `lib/db/scenario-state-json.ts`: `lineWays` (line id → way, plus `leaseOverOneYear`, `ticks`), `gstRegistered`, `workplace`. No migration, read only through `readMapAnswers` |
| "How you'd set this up" | Person's words | `PersonStatement` with `kind: "how-id-build"` (`prisma/schema.prisma:92`) |
| Mara's rent and membership prices | Example data | `lib/examples/` sources on PR #170's branch |
| Words | Screen text | `lib/cockpit/words.ts` (`ways`, `help`) |

How the parts fit:

- **Lines with no ways.** A line with no `ways` behaves exactly as today. *Legal advice* and *Money to live
  on* get none, and official fees never get ways. `validate.ts` refuses a way on an official fee.
- **One current number per line and way.** The Figure store's "takes back the one before" key gains
  `wayId`, so a new Rent number retracts only the old Rent number. This changes the documented rule "one
  current number for each cost line" (`future-cockpit.md:1602-1607`) to "one current number per cost line
  per way", and task S2.5.22h updates that page in the same pull request. A line priced before this change
  reads as `wayId = null`, shown as *"your number, way not said"*.
- **Money.** `evaluateRoad` (`lib/roads/`) produces one `CostLineAsShown` per priced way:
  - *To start* adds the official fees and the picked way's one-time amount;
  - *Paid as you go* lists picked Rent and Lease amounts by period;
  - new counts: `waysPricedNotPicked` and `saidHave`;
  - a test proves no line is ever counted twice.
- **Rules.** A pure function beside `evaluateRoad` lights the § 4.5 rows from catalog conditions, the
  person's answers and the steps on the road. The brain profile gains `waysPicked`. The capital cost
  allowance predicate at `lib/brain/evaluate.ts:130` also reads a Buy pick, and the card says which answer
  lit it.
  - A priced line alone lights nothing, because the person might rent. A test proves this.
- **Receipts.** Unchanged: a diff of two runs of the rules.
- **The Lens comes later** (task list [9d] and [9g]: the Lens's first version and its web and browser
  powers; not built). Once the person has switched on web search or the built-in browser behind its
  warning, and only when they ask (*"Find listed prices for Rent: Woodworking machines and tools"*), the
  Lens reads **only the one page the person names or opens, once per ask**. It doesn't crawl or follow
  links to other pages. It may *propose* a Figure with `amountFrom: "link"`, the page, the words seen and
  the day. The Figure counts only after the agree prompt. The Lens never caches a page and never writes a
  catalog. It refuses any domain on a small cited *do-not-fetch* catalog, which ships with DOZR [S25] and
  Meta [S26]`*`, and Kijiji [S42]`†` once its terms quote passes check-quotes. That rule is code, not a
  prompt.

## 6. What's stored and what leaves the computer

- **Kept, all in the person's own data file:**
  - the Figure columns `wayId`, `rentEvery`, `rentCount`;
  - the JSON keys `lineWays`, `gstRegistered`, `workplace`;
  - the `PersonStatement` kind `how-id-build`.

  Each is listed in `lib/privacy/inventory.ts` (the privacy test fails until it is) and counted on
  `/your-data`. The first two go with *Your ideas* on the Delete menu. The statement goes with *Your
  statements*.
- **Kept in the browser:** the ways fold, as one more entry inside the existing `dotami-cockpit-folds`
  object (`lib/cockpit/folds.ts:27`). Its inventory entry (`lib/privacy/inventory.ts:609`) is updated to
  name it. No new browser-storage key.
- **Sent: nothing new.**
  - The catalogs ship in the app.
  - Links open in the person's browser and carry no amount and nothing about the person
    (`docs/architecture/figures-privacy-review.md:42`, `lib/engines/roads/v2026/types.ts:78`).
  - The Lens price-finder (task S2.5.22p) is a new request when it is built: the one page the person
    names, plus the person's own model. It gets its own `SENT_ELSEWHERE` entry and log line then.
- **Privacy log lines** (`docs/privacy-log.md`, under [Unreleased], one for each pull request that adds
  them):
  1. *"Added: for each start-up cost line of an idea, how you say you'd get it (already have it, buy, rent,
     lease, not decided). The rules read it to show which tax pages apply. Deleted with the idea. Nothing
     is sent."*
  2. *"Added: a start-up number can name the way it prices and, for rent or a lease, how often it is paid
     and how many times, as you typed it. Nothing is sent."*
  3. *"Added, if you say: whether a lease runs more than a year and what it covers is worth, whether
     you're registered for GST/HST, and where you'd work. Nothing is sent."*
  4. *"Added: an optional note in your own words, 'how you'd set this up', kept dated and word for word,
     read by no rule. Nothing is sent."*

## 7. Rules check (`CLAUDE.md`)

| Rule | How this design meets it |
|---|---|
| Information and options, never a verdict (CLAUDE.md:22-24) | Ways in a fixed order and identical rows; *DotAmi doesn't pick one*; no difference or "less" line; help grouped by kind, alphabetical inside, with *doesn't recommend or rank anyone*; every new screen joins the no-verdict walk |
| Rules decide; the Lens never changes a catalog (:25-30) | Treatments, conditions, questions and places are versioned catalogs; the Lens only proposes a number the person agrees to |
| Every rule, rate, threshold and date cited (:31-40) | Every new catalog line carries a citation that was read or tool-checked; every string in quote marks is checked first (S2.5.22e); DotAmi's own labels carry no quote marks; regulators, non-profits and cities get labelled kinds, not mislabelled as government |
| Not legal or tax advice; never files (:41-43) | *Which class*, *does the election apply*, *is it a passenger vehicle*, *which line of the return* and *does the consumer list cover me* are questions to take; Form T2145 is linked, never filled |
| The person's words stay theirs (:44-46) | `how-id-build` is kept word for word, dated, shown back and read by no rule |
| Never derive a fact about the person (:196) | Ways come only from the person's clicks; a priced line lights nothing; GST status is only the person's own answer, never taken from a map fork; DotAmi never assigns a capital cost allowance class, a city, a licence or a vehicle classification |
| Never invent a number (:197) | Amounts are official fees, the person's agreed numbers, and published prices in the invented example only (pick 2A); multiplication only of the person's own price × count, labelled *not a forecast*; no tax value worked out; no incentive multiplier or date shown before it is read |
| Scope guard: no marketplace, no filing (:215-219) | No ordering, booking, lender matching or comparison across sellers; shops appear as credited sources (Mara) or links |
| Inventory and privacy log (:158-164, :266-269) | § 6 |
| Migrations never rebuild `Venture` (`future-cockpit.md:1474-1479`) | JSON keys need no migration; `Figure` gets `ADD COLUMN` only, with a seeded-data-survives check in `tests/desktop-migrate.spec.ts` |
| A question only when something on screen depends on it (`future-cockpit.md:710`) | § 4.8; each follow-up is asked only after the pick that needs it |
| Value over more safety settings | No new setting, warning or permission screen; the Lens part reuses the warnings the Lens already plans |

## 8. Honest limits (what can't be known or published)

- **Lease prices and deposits are not published.**
  - Lenders publish no single rate. BDC (the federal development bank) says "pricing is unique to each
    financing request" [S28].
  - The Canada Small Business Financing Program publishes ceilings only: prime + 3% floating and a 2%
    registration fee [S27].
  - A real person's Lease row is only ever their own quote.
- **Few rent prices are public.** One Calgary shop publishes them with no login [S20]. It does not publish
  deposits ("please call") but does publish an 8% damage waiver [S21]. Two makerspaces publish membership
  dues [S23][S24]. Sunbelt's Calgary page showed none. Home Depot Canada, United Rentals and Herc could not
  be read. No Edmonton tool-rental shop with published prices was found.
- **Reusing published prices is unsettled.**
  - Rogers Rent-All has no terms page but carries a copyright line [S22].
  - CBRE's Calgary report "cannot be reproduced without prior written permission" [S31].
  - DOZR's terms forbid "any collection and use of any product listings, descriptions, or prices" [S25].
  - Mara's existing tool prices rest on the same kind of reuse. Whether it is allowed is a lawyer's
    question; asking each shop first removes it (call 9).
- **Statistics Canada publishes only a price *index* for equipment rental and leasing** [S32], not dollar
  prices.
- **DotAmi can't say what a deduction is worth, or which way costs less after tax.** That needs the
  person's tax situation and a projection.
- **The enhanced first-year treatment isn't shown as a number or with dates.** It may apply to general
  property; this is not confirmed on an official page. No official page read states the multiplier, CRA's
  guide still says "under proposed changes" [S4], and the after-2024 and before-2034 dates come only from
  the Library of Parliament's summary of the bill as introduced [S8], not the enacted text.
- **Classification questions stay open.** CRA limits Class 53 (manufacturing machinery) to property
  "acquired after 2015 and before 2026" [S1]. Whether a cabinetmaker's machines count as manufacturing
  equipment at all is not settled.
- **Class 13 (leasehold improvements) has no single rate.** It "depends on the type of leasehold interest"
  [S2].
- **The Productivity Mega Deduction is a proposal** (Finance Canada, 2026-09-15 and 2026-10-01
  [S9][S10]). No bill was seen.
- **No official Alberta commercial-lease guide was confirmed.** Commercial lease terms stay a lawyer's
  question.

## 9. Calls for the maintainer

These calls are listed most consequential first. Each option's cost and risk are in the pull request and
in the calls list that comes with this doc. The product never recommends anything; the recommendations
below are to the maintainer.

1. **Where a real person's rent and lease prices come from.** Recommended: C (own quotes plus the
   checklist, and links to places that publish rent prices, now; the Lens finds listed prices once the
   Lens exists, reading only the one page the person names).
2. **How ways are kept and counted.** Options: A (one picked way per line, a number for each way, and
   only the picked way counts), B (three separate lines), C (a fork step), D (A plus whole-plan "all buy"
   and "all rent" totals), E (staged: ways, tax text and *Where to ask* first, about 5 days with no new
   number storage; a number per way after). Recommended: A; E if the maintainer wants the tax and legal
   pointers sooner.
3. **How much more should DotAmi ask, given that each answer can light a cited rule?** Recommended: C
   (picks light cited cards, three follow-ups each light a row, plus the own-words box).
4. **How rent and lease amounts are entered and shown.** Recommended: C (price and period in *Paid as you
   go*, and an optional count the person types, shown as *your numbers multiplied*).
5. **Which places appear in *Where to ask*.** Recommended: C (government, regulators' directories and
   Business Link Alberta).
6. **Proposed or unclear tax changes.** Recommended: B (an amber, dated line with no numbers).
7. **Where the tax treatment lives.** Recommended: B (in the write-offs catalog, with the ways pointing to
   it, proposed items included).
8. **Which ways a line offers.** Recommended: A (Already have it, Buy, Rent, Lease; shared shop entered
   through *Where would you work?*).
9. **Mara's example.** Options: A1 (credited rent and membership prices, shipped now), A2 (the same, after
   a short written OK from Rogers Rent-All, Protospace and ENTS, emails the maintainer sends), B (Rent and
   Lease left as named blanks with links), C (not now). Recommended: A2, with B shown until the OKs arrive.

## 10. Tasks

| Id | Title | Done when | Days | Waits on |
|---|---|---|---|---|
| S2.5.22e | Re-check quotes; read the enhanced-deduction text | Every string in quote marks in § 4 is found by `scripts/check-quotes.mjs` (web pages) or read by a person word for word, with the day recorded (PDFs: S8, S29); anything not found is dropped, not reworded. The enhanced first-year rules and their dates are read in the enacted Act or Regulations, or recorded as not yet consolidated | 1 | — |
| S2.5.22f | Ways catalog and lines that name their ways | `lib/engines/ways/v2026/` with ids, questions to take and the ask-in-writing lists (Lease cited; Rent in DotAmi's own words); road 0 and road 1 lines tagged; validate refuses ways on fees; integrity green | 1.5 | 2, 8 |
| S2.5.22g | Tax treatment entries | Write-offs gain rent, leasing (with the election and its "often do not" line), Class 12; vehicle gains 2026 amounts and the "passenger vehicle" line; capital equipment gains the amber line under the half-year line; proposed items as `status: "proposed"` entries per call 6; every citation read or tool-checked | 2 | 6, 7 |
| S2.5.22h | Storage | `Figure` `wayId`/`rentEvery`/`rentCount` by ADD COLUMN; JSON keys through `readMapAnswers`; store key per way; `future-cockpit.md` § 7 updated to "one current number per cost line per way"; inventory, Delete menu, privacy log; migrate test passes | 1.5 | 2, 3, 4 |
| S2.5.22i | Road evaluation and money | *To start*, *Paid as you go*, *not picked*, *said have* counts; receipts; no-double-count test | 1.5 | 2, 4 |
| S2.5.22j | Screens: ways side by side | Step panel rows, agree prompt with way and period, money list, phone width; the fold kept in `dotami-cockpit-folds` with its inventory entry updated; ui-spec updated with round placeholders; browser test; no-verdict and journey walks | 2.5 | 1, 2, 4, 8 |
| S2.5.22k | Rules your answers bring into view | Pure function plus `evaluate.ts` predicate; each card names its answer or step; the records card lit by the records step; no licence card; test that a priced line alone lights nothing; test that `gstTiming` never lights the GST row | 2 | 3, 6, 7 |
| S2.5.22l | The new questions | § 4.8 questions in *Not told yet* only when needed; *I don't know*; `gstRegistered` stored only as its own answer; no passenger-vehicle question; own-words statement kept | 1.25 | 3 |
| S2.5.22m | Where to ask and questions to take | Help catalog; `regulator`, `not-for-profit` and `municipal` citation kinds in the type and `docs/engines/citations.md`; the Law Society's Find a Lawyer page and CRA's current Liaison Officer page cited after tool checks; panel and the four *Your plan* sections; print test | 2 | 5 |
| S2.5.22n | Places that publish rent prices (links only) | Dated observations, alphabetical, no amounts, *doesn't recommend*; in the link check | 0.5 | 1 |
| S2.5.22o | Mara's ways | Her rows per call 9, every number sourced and credited, periods in the shop's own words; with A2, the shops' written OKs recorded first (the maintainer's emails, about 0.25 day of his time); example tests green | 1 | 9 |
| S2.5.22p | Lens proposes a listed price (later) | After [9d]/[9g]: reads only the one page the person names, once per ask, no crawling; proposed Figure with link, words and day; do-not-fetch catalog (DOZR, Meta, and Kijiji once checked) respected; `SENT_ELSEWHERE` entry and log line | 2 (after the Lens) | 1 |

That is about 17 build days before the Lens; S2.5.22p follows the Lens. With call 2 option E, a first stage
of about 5 days (S2.5.22e, S2.5.22g, S2.5.22m and the pick part of S2.5.22f) ships the tax treatment, the
pointers and *Where to ask* before any per-way number is kept. S2.5.22d (this doc) is done when the
maintainer has answered § 9.

## 11. Not in scope

- The competitive landscape, designed separately in [competitive-landscape.md](competitive-landscape.md).
  Both share one type, "a dated observation that isn't a legal citation", with PR #170's `ExampleSources`.
- Working out tax owed, any deduction's dollar value, or instalments.
- Assigning a capital cost allowance class, or a vehicle classification, for the person.
- Loan or lease calculators, and the financing program's terms beyond the existing catalog entry
  (`lib/engines/grants/v2026/programs.ts`).
- Filling or filing Form T2145, or any form.
- Asking the person's city.
- Hiring and workers' compensation duties (a separate story).
- Provinces other than Alberta.
- Typical numbers for a real person. This stays the phase-2 open item in `future-cockpit.md` § 13.

## 12. Open questions (never stated as fact in the product)

- **The enhanced deduction.** Which property it covers, its dates in the enacted text, the first-year
  factor for general property, and why CRA guides still say "proposed" after Royal Assent (Bill C-15
  received Royal Assent on 2026-03-26 [S6]; that release doesn't mention CCA).
- **Class 43 or Class 8.** Whether 2026 manufacturing machinery bought by a small woodworking shop falls in
  Class 43 (30%) or Class 8. Only a verifier's note covers Class 43.
- **The rest of the lease election.** Whether it has an arm's-length condition, and what section 8200
  excludes in practice. The T2145 form text was not read.
- **Rates not seen on a CRA page.** The Class 8 separate-class election for equipment of $1,000 or more;
  the Class 6 rate; the Class 13 formula.
- **The 5% GST rate itself.** It was not confirmed on a page read. Only "Alberta has no sales tax" was.
- **Pages a verifier or reviewer saw but that are not yet tool-checked.** The Law Society's *Find a
  Lawyer* page wording [S43]; LawCentral Alberta's limited-scope help; Kijiji's terms on scrapers [S42];
  BDC's equipment-loan page; Rogers Rent-All's FAQ line that rented items can be bought later; CRA's
  current Liaison Officer service page.
- **Whether a makerspace membership has any stated tax treatment.** None was found, so the row sends that
  question to the accountant.
- **Legal reach.** Whether Alberta's consumer lease rules reach a business lease, and what personal
  property registration means for a lessee. Both are lawyer questions.
- **Asking permission.** Whether Rogers Rent-All, Protospace and ENTS agree to their prices shipping in
  Mara's example (call 9, A2).
- **The proposal's status.** The Productivity Mega Deduction is re-checked on LEGISinfo before every
  release.

## 13. Sources (seen 2026-10-15; `*` = read through a summariser, re-check by tool; `†` = reported by the reviewer, not yet read)

- [S1] CRA, *Classes of depreciable property*. Covers Classes 8, 12 (with exceptions), 50 and 1, and the
  Class 53 limit "acquired after 2015 and before 2026". `*`
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/classes-depreciable-property.html
- [S2] CRA, *Capital cost allowance (CCA) classes*. Covers Classes 10, 10.1 and 13.
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/classes.html
- [S3] CRA, *Basic information about capital cost allowance*. The half-year rule.
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/basic-information-about-capital-cost-allowance.html
- [S4] CRA, T4002 Chapter 4. Exempt classes, transferred personal property, and "under proposed changes".
  `*` https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html
- [S5] Finance Canada, 2026 automobile deduction limits (2026-01-14).
  https://www.canada.ca/en/department-finance/news/2026/01/government-announces-the-2026-automobile-deduction-limits-and-expense-benefit-rates-for-businesses.html
- [S6] Finance Canada, Bill C-15 Royal Assent (2026-03-26). Does not mention CCA.
  https://www.canada.ca/en/department-finance/news/2026/03/legislation-passes-to-implement-budget-2025-canada-strong.html
- [S7] CRA, Income Tax Folio S3-F4-C1. Enhanced capital cost allowance and the s.16.1 lease conditions. `*`
  https://www.canada.ca/en/revenue-agency/services/tax/technical-information/income-tax/income-tax-folios-index/series-3-property-investments-savings-plans/series-3-property-investments-savings-plans-folio-4-capital-cost-allowance/income-tax-folio-s3-f4-c1-general-discussion-capital-cost-allowance.html
- [S8] Library of Parliament, Bill C-15 legislative summary (2026-01-19), of the bill as introduced. A PDF;
  a person reads it.
  https://library-biblio.parl.ca/staticfiles/PublicWebsite/Home/ResearchPublications/LegislativeSummaries/PDF/45-1/45-1-C15-E.pdf
- [S9] Finance Canada, Productivity Mega Deduction backgrounder (2026-09-15, a proposal).
  https://www.canada.ca/en/department-finance/news/2026/09/government-of-canada-introduces-new-productivity-mega-deduction-to-boost-canadas-advantage-as-the-most-competitive-g7-country-for-new-business-inve.html
- [S10] Finance Canada, release of 2026-10-01 (a proposal).
  https://www.canada.ca/en/department-finance/news/2026/10/the-government-of-canada-introduces-new-productivity-mega-deduction-to-help-businesses-invest-grow-and-create-jobs-in-canada.html
- [S11] CRA, *Current or capital expenses*.
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses/current-capital-expenses.html
- [S12] CRA, *Line 8910 – Rent*.
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/line-8910-rent.html
- [S13] CRA, *Leasing costs*.
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses/leasing-costs.html
- [S14] CRA, Form T2145. https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2145.html
- [S15] CRA, *When to register for and start charging the GST/HST*.
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html
- [S16] CRA, *Input tax credits* (modified 2026-10-14). `*`
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/calculate-prepare-report/input-tax-credit.html
- [S17] Alberta, *About Tax and Revenue Administration*. https://www.alberta.ca/about-tra
- [S18] CRA, *Business-use-of-home expenses*.
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html
- [S19] CRA, *Where to keep your records, for how long…*.
  https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html
- [S20] Rogers Rent-All, 10-inch table saw on stand.
  https://www.rogersrentall.ca/equipment.asp?action=category&category=36&key=041%2D0062
- [S21] Rogers Rent-All, *Rental Policies*. https://www.rogersrentall.ca/policies.asp
- [S22] Rogers Rent-All, FAQ, with the footer copyright line. https://www.rogersrentall.ca/faq.asp
- [S23] Protospace. https://protospace.ca/
- [S24] ENTS, *Join now*. https://ents.ca/join_now/
- [S25] DOZR, *Terms & Conditions*. https://i.dozr.com/terms
- [S26] Meta, *Automated Data Collection Terms*. `*`
  https://www.facebook.com/legal/automated_data_collection_terms
- [S27] ISED, Canada Small Business Financing Program.
  https://ised-isde.canada.ca/site/canada-small-business-financing-program/en/canada-small-business-financing-program/find-loan-your-small-business/helping-small-businesses-get-loans
- [S28] BDC, *Equipment financing: a step-by-step guide*.
  https://www.bdc.ca/en/articles-tools/money-finance/get-financing/equipment-financing-101-everything-you-need-know
- [S29] Alberta, Cost of Credit Disclosure Regulation, AR 198/1999, s.19. A PDF; a person reads it.
  https://kings-printer.alberta.ca/documents/Regs/1999_198.pdf
- [S30] Alberta, Consumer Protection Act, Part 9, s.60.
  https://kings-printer.alberta.ca/1266.cfm?display=html&isbncln=9780779805143&leg_type=Acts&page=c26p3.cfm
- [S31] CBRE, Calgary Industrial Figures Q2 2026.
  https://mktgdocs.cbre.com/2299/caf96f5f-26c2-4177-97bd-b2616473d3fc-1472007596/Calgary_Industrial__Figures_Q2.pdf
- [S32] Statistics Canada, table 18-10-0279-01. https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810027901
- [S33] CRA, *Meet the Liaison Officers* (2024-03-12, a tax tip; to be replaced by the current service page).
  https://www.canada.ca/en/revenue-agency/news/newsroom/tax-tips/tax-tips-2024/our-experts-can-help-you-understand-your-business-tax-obligations-meet-liaison-officers.html
- [S34] Business Link Alberta, *About*. https://businesslink.ca/about/
- [S35] CPA Alberta, *Verify Member*. https://services.cpaalberta.ca/VerifyEntity/Members/
- [S36] Law Society of Alberta, Lawyer Referral Service closure. https://www.lawsociety.ab.ca/?p=25078
- [S37] Alberta, *Business licence or charitable registration*.
  https://www.alberta.ca/business-licence-or-charitable-registration-in-alberta
- [S38] City of Calgary, *Opening a business in Calgary*. https://www.calgary.ca/pda/pd/mybusiness/business-101.html
- [S39] City of Edmonton, *Business Licensing*. https://www.edmonton.ca/business_economy/business-licensing
- [S40] Alberta, *Personal Property Liens – Register an interest*.
  https://www.alberta.ca/personal-property-liens-register-interest
- [S41] CRA, *Who has to pay instalments*.
  https://www.canada.ca/en/revenue-agency/services/payments/payments-cra/individual-payments/income-tax-instalments/who-pays-instalments.html
- [S42] Kijiji, *Terms of Use*. `†` https://community.kijiji.ca/t/kijiji-terms-of-use/29
- [S43] Law Society of Alberta, *Find a Lawyer*. `†` https://www.lawsociety.ab.ca/public/findalawyer/
