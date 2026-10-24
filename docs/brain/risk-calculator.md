# Risk Calculator — Spec

Last updated: 2026-10-24 (the maintainer's reading list of 2026-10-23: four reads corrected to what their pages
say and one retired, § What the reads quote and § Retired risk reads) · Status: **not built** · Build order: #3 (after rules engine)

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
  2026-10-24 (§ Retired risk reads).
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
equipment, SR&ED documentation) weren't on the list and are unchanged. No source is recorded as read
by him yet (his saved reads come in a later change).

| Read | What it says now | What came out | Its quotes and their check |
| --- | --- | --- | --- |
| `risk-home-office-percentage` | The CRA's page on business-use-of-home expenses: you can deduct the expenses if the space is the principal place of business, or if it is used only for the business and on a regular and ongoing basis to meet clients; and the amount can't be more than the business's net income, all quoted | "floor-area math", "the exclusive-use test is where claims fail", "measured floor area", "document exclusive business use", "keep the calculation" (the maintainer's note: floor area is one reasonable basis, not the only one, and using the space only for the business is asked only when it isn't the principal place of business; no held quote gives the page's sentence on how to work out the business part, so the read says nothing about it) | four quotes, from the home office write-off's tool check of the same page of 2026-10-13 |
| `risk-immediate-expensing-timing` | "The 100% first-year treatment depends on acquisition and available-for-use dates." / "Confirm eligibility and the available-for-use date with an accountant before filing." (the words the maintainer found match the guide) | "getting the year wrong misstates income and unwinds on review", "keep purchase and deployment records" | the guide's sentence on the dates, a tool check of 2026-10-23 on this read only. It ends on a colon before the factors, which aren't held, so the box doesn't quote it. |
| `risk-ladder-skipping` | "Income Tax Act s.245, in its own words:" and three of the section's phrases, listed with nothing of DotAmi's between them; as the mitigation, "The same section:" and a fourth, “while not preventing taxpayers from obtaining tax benefits contemplated by Parliament” | "structure-for-tax's-sake", "exactly what the General Anti-Avoidance Rule exists to unwind", "Cross them with professional advice tied to a genuine business purpose, documented at the time" (s.245 asks for no advice or documentation) | the four quotes docs/glossary.md's GAAR entry holds, found by `scripts/check-quotes.mjs` on 2026-10-12, in one citation (`S245_CITATION`, `lib/engines/risk/v2026/gaar-official-words.ts`) shared with the Holding company and Family trust cards |
| `risk-self-declared-valuation` | ISED's rule, quoted: “For real property and equipment, security must be taken on the assets financed.”, and that these are ISED's words from its page on loans under the program | "is circular and can read as collateral misrepresentation to a lender", "at the lesser of purchase price or appraised value" (a different rule from the security rule, on no page DotAmi cites) | ISED's loans page, a tool check of 2026-10-23; the read cited ISED's program hub until then |
| `risk-hobby-reclassification` | retired (§ Retired risk reads) | all of it | none |

A risk box draws no sources of its own: the card it shows on lists only the card's own citations. So
a page a read quotes is cited under that card too: the home office page under the home office
write-off, s.245 under the Holding company and Family trust cards. ISED's loans page is under the
loan program's card once #208 adds it there; until then the box names the page it quotes.

## Retired risk reads

A read taken off the catalog stays listed here and in `RETIRED_RISK_ENTRIES`
(`lib/engines/risk/v2026/triggers.ts`, the same shape as the compliance catalog's retired rules and the
grants catalog's retired programs, #207), and its id is never used for another read.
[`tests/retired-entries.spec.ts`](../../tests/retired-entries.spec.ts) holds the list to the catalog: no
retired id is a live entry, nothing on the map names one, and every read that ever shipped is either live
or here.

| Id | Read | Its page, as cited | Why it came off (page opened 2026-10-23) |
| --- | --- | --- | --- |
| `risk-hobby-reclassification` | Repeated losses → hobby reclassification | https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html | On the maintainer's reading list it didn't match its source: the CRA's *Setting up your business* doesn't support what it said about losses year after year, the reasonable-expectation-of-profit question, or running the venture "business-like" with "records that show profit intent", and DotAmi holds no quote from a page that does. |

The *Hobby vs. business income test* card still shows; it no longer carries a risk box, and its colour
doesn't change. The read comes back under the same id only for the same subject, citing a page on business
versus personal pursuits and quoting it.

## Testing

Same discipline as every engine: integrity tests (ids unique, citations present, severities
valid, `appliesTo` ids resolve to real engine entries), plus golden: the GPU/workstation
scenario's unlock set must carry the expected chips (Class 50+IEI → `professional-required`
with 2027 note; SR&ED → `professional-required`; home office → `caution`).
