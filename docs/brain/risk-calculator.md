# Risk Calculator — Spec

Last updated: 2026-10-27 (a repeated-losses read is back under a new id, `risk-losses-source-of-income`, quoting the
CRA's Income Tax Audit Manual, chapter 27; the home office read quotes the CRA's sentence on the business part; ISED's loans page's
own title; ISED's loans page is under the loan program's card, from #208, merged in; 2026-10-24:
the maintainer's reading list of 2026-10-23: four reads corrected to what their pages say and one retired, § What
the reads quote and § Retired risk reads) · Status: **not built** · Build order: #3 (after rules engine)

## Job

The compliance safety valve that makes "legal but aggressive" honest. Two parts:

1. **Audit-trigger catalog** — a new versioned engine (`lib/engines/risk/v2026/`) of known
   CRA audit triggers and GAAR-exposure patterns, each with severity and predicate triggers.
2. **Risk evaluator** — extends the Strategy Rules Engine output: every surfaced lever gets
   a risk chip; strategy *combinations* get combination-level risk bumps.

> **Open flag (maintainers decide):** this is written as a seventh
> engine because the entry shape and consumers differ from Compliance. But "six engines" is
> product language used everywhere (README, CLAUDE.md, the engine docs). Get the count blessed before
> building, or fold into Compliance as a `risk` entry type if the maintainers prefer.

## Entry shape

```typescript
interface RiskEntry {
  id: string;                          // "risk-home-office-percentage"
  label: string;
  severity: "info" | "caution" | "professional-required";
  gaarExposure: boolean;               // true only for substance-sensitive structures
  trigger: Predicate;                  // same DSL as strategy-rules-engine.md
  appliesTo: string[];                 // engine entry ids this risk attaches to, e.g. ["writeoff-home-office"]
  why: string;                         // what draws CRA attention, plain language
  mitigation: string;                  // what makes the position defensible (documentation, logs, substance)
  citations: EngineCitation[];         // same citation contract as every engine
}
```

Combination heuristics are a second table:

```typescript
interface RiskCombination {
  id: string;
  memberIds: string[];                 // engine entry ids that together raise the profile
  severityBump: "caution" | "professional-required";
  why: string;                         // e.g. "Multiple maximized deductions against low revenue elevates review likelihood"
}
```

## Severity semantics (calibration guidance for authors)

| Severity | Meaning | Example |
|----------|---------|---------|
| `info` | Normal claim, keep records | Software subscriptions as current expense |
| `caution` | Legitimate but pattern-matched by CRA; documentation quality decides outcomes | Home office %, vehicle logbook, meals 50% |
| `professional-required` | Do not act without an accountant/lawyer | SR&ED claims, Immediate Expensing eligibility timing, incorporation timing, anything `gaarExposure: true` |

**GAAR calibration:** `gaarExposure: true` is reserved for structures whose *primary purpose*
could be read as tax avoidance without business substance (e.g. Holdco/Trust rungs entered
early, income-splitting arrangements). Ordinary deductions maximized aggressively are
`caution`, not GAAR — don't cry wolf, or the flag loses meaning.

## Output contract

Every `UnlockItem` from the Strategy Rules Engine carries:

```typescript
risk: {
  level: "info" | "caution" | "professional-required";
  gaar: boolean;
  why: string;
  mitigation: string;
} | null   // null only for Templates references
```

UI direction (Phase 4+ workshop decides final form): a small risk chip on each card,
consistent with the existing type/source chip pattern from the signed-off intake preview.
The aggressive option is **never** removed or sorted below safer ones because of risk —
risk informs, it does not censor. That ordering rule is philosophy, not style.

## Seed entries (author these first — validated research)

From the maintainers' seed research (2026-07-01) + standard CRA audit-trigger knowledge:

- Home office (`caution`). Since 2026-10-24 it quotes the CRA's page: its two conditions (the principal place of
  business, or a space used only for the business and on a regular and ongoing basis to meet clients) and that the
  amount can't be more than the business's net income. The seed's floor-area and exclusive-use mitigation came out
  (§ What the reads quote).
- Vehicle business-use claims without logbook (`caution`).
- Mixed personal/business use of capital equipment — honest apportionment % (`caution`,
  attaches to `writeoff-cca-class-50`).
- Immediate Expensing timing (`professional-required`, expires 2027 — attach to Class 50). Since 2026-10-24 it says
  only that the 100% first-year treatment depends on the acquisition and available-for-use dates, and to confirm
  them with an accountant before filing.
- SR&ED claim quality / contemporaneous documentation (`professional-required`).
- Repeated losses → hobby reclassification (`caution`, attached to the hobby-vs-business rule). Retired on
  2026-10-24 (§ Retired risk reads). Since 2026-10-27 a read on the subject is back under a new id,
  `risk-losses-source-of-income` (`caution`, the same card, no trigger, as the retired read had), quoting the CRA's
  Income Tax Audit Manual, chapter 27 (§ What the reads quote).
- Early Holdco/Trust ladder-skipping (`professional-required`, `gaarExposure: true`) —
  seed research explicitly validated that these rungs don't solve equipment affordability.
  Since 2026-10-24 the read is Income Tax Act s.245's own words, listed, and the Holding company and Family
  trust cards cite the section.
- The CSBFP loan's security (`professional-required`; until 2026-10-24 "Self-declared valuation as
  collateral", flagged in seed research as circular/misrepresentation-adjacent). Since 2026-10-24 it says only
  ISED's rule on security, quoted.

## What the reads quote

The maintainer's reading list of 2026-10-23 checked five of these reads against their pages. Since
2026-10-24 the four kept say only what a page they cite says, quoted, with a few words naming the page,
or the words the maintainer found match its page. The other three (vehicle logbook, mixed-use
equipment, SR&ED documentation) weren't on the list and are unchanged. The pages the four kept cite were
read in full by him on 2026-10-25, and their citations say so since 2026-10-27
([citations.md](../engines/citations.md), § The maintainer's reads of 2026-10-25).

One more read came back on 2026-10-27, on the retired repeated-losses read's subject, under a new id
(`risk-losses-source-of-income`; the maintainer's "yah, lets use it" of that day). It says only what the CRA's Income
Tax Audit Manual, chapter 27, says: three of its sentences, quoted whole, joined only by the labels "The CRA's Income
Tax Audit Manual, chapter 27:" and "The same page:". Its label is neutral DotAmi wording, "Losses and whether there is
a source of income", and no screen shows it. Nobody has read the page in full, so its source is checked by a tool only.

| Read | What it says now | What came out | Its quotes and their check |
| --- | --- | --- | --- |
| `risk-home-office-percentage` | The CRA's page on business-use-of-home expenses: you can deduct the expenses if the space is the principal place of business, or if it is used only for the business and on a regular and ongoing basis to meet clients; and the amount can't be more than the business's net income; since 2026-10-27, on working out the business part, a reasonable basis "such as" the workspace's share of the home's area; all quoted | "floor-area math", "the exclusive-use test is where claims fail", "measured floor area", "document exclusive business use", "keep the calculation" (the maintainer's note: floor area is one reasonable basis, not the only one, and using the space only for the business is asked only when it isn't the principal place of business; until 2026-10-27 no held quote gave the page's sentence on how to work out the business part, and the read said nothing about it; since then it quotes that sentence, whose "such as" keeps floor area one basis) | the quotes the home office write-off's citation of the same page holds: four from its tool check of 2026-10-13, and the business-part sentence, found with them on 2026-10-27, so both checks are of that day |
| `risk-immediate-expensing-timing` | "The 100% first-year treatment depends on acquisition and available-for-use dates." / "Confirm eligibility and the available-for-use date with an accountant before filing." (the words the maintainer found match the guide) | "getting the year wrong misstates income and unwinds on review", "keep purchase and deployment records" | the guide's sentence on the dates, a tool check of 2026-10-23 on this read only. It ends on a colon before the factors, which aren't held, so the box doesn't quote it. |
| `risk-ladder-skipping` | "Income Tax Act s.245, in its own words:" and three of the section's phrases, listed with nothing of DotAmi's between them; as the mitigation, "The same section:" and a fourth, “while not preventing taxpayers from obtaining tax benefits contemplated by Parliament” | "structure-for-tax's-sake", "exactly what the General Anti-Avoidance Rule exists to unwind", "Cross them with professional advice tied to a genuine business purpose, documented at the time" (s.245 asks for no advice or documentation) | four of the five quotes docs/glossary.md's GAAR entry holds, found by `scripts/check-quotes.mjs` on 2026-10-12, in one citation (`S245_CITATION`, `lib/engines/risk/v2026/gaar-official-words.ts`) shared with the Holding company and Family trust cards |
| `risk-self-declared-valuation` | ISED's rule, quoted: “For real property and equipment, security must be taken on the assets financed.”, and that these are ISED's words from its page on loans under the program | "is circular and can read as collateral misrepresentation to a lender", "at the lesser of purchase price or appraised value" (a different rule from the security rule, on no page DotAmi cites) | ISED's loans page, a tool check of 2026-10-23; the read cited ISED's program hub until then |
| `risk-hobby-reclassification` | retired (§ Retired risk reads) | all of it | none |
| `risk-losses-source-of-income` (since 2026-10-27, on the Hobby vs. business card) | "The CRA's Income Tax Audit Manual, chapter 27:" “An activity undertaken in the pursuit of profit, even with erroneous business decisions that cause it to never experience any actual profit, is still a source of income.” "The same page:" “Objective evidence showing an intention to create losses to offset taxable income may lead to the courts to conclude that no source of income exists.”; as the mitigation, "The same page:" “If there is a personal element to the activity and the activity is undertaken in a sufficiently commercial manner, there is a source of income and income must be reported and losses may be claimed.” | nothing: a new read. Never quoted from the same page: the auditors' own instructions (the two-stage approach and its first question), the list of factors to consider, the sentence on the reasonable expectation of profit test on its own, and any line with a time in it | the three sentences, a tool check of 2026-10-27 (`node scripts/check-quotes.mjs` found all three on the live page that day), on this read only; no read by anyone yet, so it says "Checked by a tool" in amber |

A risk box draws no sources of its own: the card it shows on lists only the card's own citations. So
a page a read quotes is cited under that card too: the home office page under the home office
write-off, s.245 under the Holding company and Family trust cards, and ISED's loans page under the
loan program's card (#208's source, merged in on 2026-10-27; until then the card listed ISED's hub only).
The box also names the page it quotes. One exception, for now: the audit manual's chapter 27 is not under
the Hobby vs. business card, which this change leaves as it was (its own words are an open question for the
maintainer, [citations.md](../engines/citations.md), § Outside the list, item 3). The box names the page;
whether the card lists it is his call.

## Retired risk reads

A read taken off the catalog stays listed here and in `RETIRED_RISK_ENTRIES`
(`lib/engines/risk/v2026/triggers.ts`, the same shape as the compliance catalog's retired rules and the
grants catalog's retired programs, #207), and its id is never used again.
[`tests/retired-entries.spec.ts`](../../tests/retired-entries.spec.ts) holds the list to the catalog: no
retired id is a live entry, nothing on the map names one, and every read that ever shipped is either live
or here.

| Id | Read | Its page, as cited | Why it came off (page opened 2026-10-23) |
| --- | --- | --- | --- |
| `risk-hobby-reclassification` | Repeated losses → hobby reclassification | https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html | On the maintainer's reading list it didn't match its source: the CRA's *Setting up your business* doesn't support what it said about losses year after year, the reasonable-expectation-of-profit question, or running the venture "business-like" with "records that show profit intent", and DotAmi holds no quote from a page that does. |

The *Hobby vs. business income test* card still shows, and its colour doesn't change. A read on its subject
comes back only under a new id, as a retired compliance rule's does, citing a page on business versus personal
pursuits and quoting it. One did on 2026-10-27: `risk-losses-source-of-income`, quoting the CRA's Income Tax
Audit Manual, chapter 27 (§ What the reads quote). From 2026-10-24 until then the card carried no risk box.

## Testing

Same discipline as every engine: integrity tests (ids unique, citations present, severities
valid, `appliesTo` ids resolve to real engine entries), plus golden: the GPU/workstation
scenario's unlock set must carry the expected chips (Class 50+IEI → `professional-required`
with 2027 note; SR&ED → `professional-required`; home office → `caution`).
