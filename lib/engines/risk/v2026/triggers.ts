import { S245_CITATION, S245_QUOTES } from "./gaar-official-words";
import type { RetiredRiskEntry, RiskCombination, RiskEntry } from "./types";

const LAST_VERIFIED = "2026-07-02";

/**
 * Audit-trigger catalog. Seed entries from the maintainers' validated research
 * (2026-07-01) + standard CRA audit-trigger patterns. Severity
 * calibration per docs/brain/risk-calculator.md — GAAR is reserved for
 * substance-sensitive structures, not maximized ordinary deductions.
 */
export const riskEntriesV2026 = [
  {
    id: "risk-home-office-percentage",
    // No screen shows a risk read's label. Until 2026-10-24 "Home office percentage outliers".
    label: "Home office: the CRA's conditions and limit",
    severity: "caution",
    gaarExposure: false,
    appliesTo: ["writeoff-home-office"],
    // The CRA page's own words since 2026-10-24 (the maintainer's reading list of 2026-10-23, item
    // risk-home-office-percentage): "Workspace percentages well above typical floor-area math draw review; the
    // exclusive-use test is where claims fail" and "Base the claim on measured floor area, document exclusive business
    // use, and keep the calculation with your records" were DotAmi's own. His note: floor area is one reasonable basis,
    // not the only one, and using the space only for the business is asked only when it isn't the principal place of
    // business. No held quote gives the page's sentence on how to work out the business part, so the box says nothing
    // about it. The "or" between the two conditions is s.18(12)'s: the write-off card cites the section, and its
    // eligibility text gives both conditions.
    why: "The CRA's page on business-use-of-home expenses: “You can deduct expenses for the business use of a workspace in your home” if “it is your principal place of business”, or if “you use the space only to earn your business income, and you use it on a regular and ongoing basis to meet your clients, customers, or patients”.",
    mitigation: "The same page, on the amount: it “cannot be more than your net income from the business before you deduct these expenses”.",
    citations: [
      {
        title: "Business-use-of-home expenses",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/report-business-income-expenses/business-expenses/business-use-home-expenses.html,
        // read 2026-07-02) answered 404 on 2026-10-13; a tool found these words on the new page that day. The last two
        // joined on 2026-10-24: the same day's check found them for the home office write-off's citation of this page
        // (lib/engines/writeoffs/v2026/categories.ts), and the reading list found all four there again on 2026-10-23.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "You can deduct expenses for the business use of a workspace in your home",
            "you use the space only to earn your business income, and you use it on a regular and ongoing basis to meet your clients, customers, or patients",
            "it is your principal place of business",
            "cannot be more than your net income from the business before you deduct these expenses",
          ],
        },
        note: "CRA workspace-in-home requirements: the two conditions, and the limit to the business's net income.",
      },
    ],
  },
  {
    id: "risk-vehicle-logbook",
    label: "Vehicle claims without a logbook",
    severity: "caution",
    gaarExposure: false,
    appliesTo: ["writeoff-vehicle"],
    why: "Business-use percentage claims without contemporaneous trip records are routinely reduced on review; 100% business use on a personal vehicle is a classic trigger.",
    mitigation: "Keep a trip logbook (date, destination, purpose, kilometres) from day one — reconstructed logs carry less weight.",
    citations: [
      {
        title: "Motor vehicle records",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/report-business-income-expenses/business-expenses/motor-vehicle-expenses/motor-vehicle-records.html,
        // read 2026-07-02) answered 404 on 2026-10-13; a tool found these words on the new page that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses/motor-vehicle-expenses/motor-vehicle-records.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "The best evidence to support the use of a vehicle is an accurate logbook of business travel maintained for the entire year",
            "showing for each business trip, the destination, the reason for the trip and the distance covered.",
          ],
        },
        note: "CRA logbook expectations for vehicle claims.",
      },
    ],
  },
  {
    id: "risk-mixed-use-equipment",
    label: "Mixed personal/business equipment use",
    severity: "caution",
    gaarExposure: false,
    trigger: { field: "capitalPurchasePlanned", op: "eq", value: true },
    appliesTo: ["writeoff-cca-class-50", "writeoff-capital-equipment"],
    why: "Claiming 100% business use on equipment that plausibly has personal use (computers, workstations) invites apportionment challenges.",
    mitigation: "Set an honest business-use percentage before claiming, write down how you arrived at it, and apply it consistently to CCA.",
    citations: [
      {
        title: "Personal use of property",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/business-expenses/capital-cost-allowance.html, read 2026-07-02)
        // answered 404 on 2026-10-13. Its successor, Claiming capital cost allowance, sends property
        // used both ways to this page; a tool found this sentence on it that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/personal-use-property.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: ["If you buy property for both business and personal use, you can calculate the business use of the property."],
        },
        note: "CCA claims follow business-use portion.",
      },
    ],
  },
  {
    id: "risk-immediate-expensing-timing",
    label: "Enhanced first-year deduction timing",
    severity: "professional-required",
    gaarExposure: false,
    appliesTo: ["writeoff-cca-class-50"],
    // The maintainer's reading list of 2026-10-23 (item risk-immediate-expensing-timing) found the dates line and the
    // accountant line match the guide. "Getting the year wrong misstates income and unwinds on review" and "keep
    // purchase and deployment records" were DotAmi's own, held by no source, and came out on 2026-10-24.
    why: "The 100% first-year treatment depends on acquisition and available-for-use dates.",
    mitigation: "Confirm eligibility and the available-for-use date with an accountant before filing.",
    citations: [
      {
        title: "T4002 Chapter 4 — Capital cost allowance (immediate expensing measures)",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html",
        lastVerified: LAST_VERIFIED,
        // The guide's sentence on the dates, which the reading list's tool found on the live page on 2026-10-23 with
        // the repo's matcher (the same whole-word, one-block match as scripts/check-quotes.mjs); a networked
        // `node scripts/check-quotes.mjs` run should find it again (docs/engines/citations.md, rule 4). It ends on a
        // colon before the factors, which DotAmi doesn't hold, so the box doesn't quote it. Only this citation keeps
        // it: the Class 50 write-off's citation of the same chapter keeps the check it had.
        toolCheck: {
          checkedOn: "2026-10-23",
          quotes: [
            "Under proposed changes, if property included in Class 44, 46, or 50 is acquired and becomes available for use after April 15, 2024, the following factors apply:",
          ],
        },
        note: "Date conditions for enhanced first-year CCA.",
      },
    ],
  },
  {
    id: "risk-sred-documentation",
    label: "SR&ED claim documentation quality",
    severity: "professional-required",
    gaarExposure: false,
    appliesTo: ["grant-sred", "writeoff-rd"],
    why: "SR&ED claims are review-heavy; claims without contemporaneous project records (hypotheses, iterations, failures) are where credits get denied.",
    mitigation: "Keep dated experiment logs as you work (an R&D log habit), and have an SR&ED-experienced professional shape the claim before filing.",
    citations: [
      {
        title: "SR&ED expenditures claim guidance",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/scientific-research-experimental-development-tax-incentive/claim-sred-expenditures.html,
        // read 2026-07-02) answered 404 on 2026-10-13. What to keep is now on the claim's Get ready
        // page; a tool found these words there that day.
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-claim/get-ready.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "Keeping proper documentation will make it easier to prepare and support your claim.",
            "Be sure to keep all technical and financial documentation that can support your claim",
          ],
        },
        note: "Contemporaneous documentation expectations.",
      },
    ],
  },
  // Repeated losses → hobby reclassification (risk-hobby-reclassification) came off on 2026-10-24: RETIRED_RISK_ENTRIES.
  {
    id: "risk-ladder-skipping",
    label: "Early Holdco/Trust structures (GAAR-sensitive)",
    severity: "professional-required",
    gaarExposure: true,
    appliesTo: ["structure-holdco", "structure-family-trust"],
    // The section's own words since 2026-10-24 (the maintainer's reading list of 2026-10-23, item risk-ladder-skipping:
    // s.245 asks for no professional advice or documentation). "Reads as structure-for-tax's-sake — exactly what the
    // General Anti-Avoidance Rule exists to unwind" and "Cross them with professional advice tied to a genuine business
    // purpose, documented at the time" were DotAmi's own. The quotes are listed, never joined by words of DotAmi's: the
    // Act's words between them aren't held.
    why: `Income Tax Act s.245, in its own words: “${S245_QUOTES.contains}”; “${S245_QUOTES.denies}”; “${S245_QUOTES.abuse}”.`,
    mitigation: `The same section: “${S245_QUOTES.parliament}”.`,
    // The same citation is listed under the Holding company and Family trust cards, where this box shows.
    citations: [S245_CITATION],
  },
  {
    id: "risk-self-declared-valuation",
    // No screen shows a risk read's label. Until 2026-10-24 "Self-declared valuation as collateral"; the id stays (IDs
    // are forever).
    label: "CSBFP loans: security on the assets financed",
    severity: "professional-required",
    gaarExposure: false,
    appliesTo: ["grant-csbfp"],
    // ISED's rule on security, quoted, and nothing else, since 2026-10-24 (the maintainer's reading list of 2026-10-23,
    // item risk-self-declared-valuation, and his answer of 2026-10-24: keep the read, saying only ISED's rule). It said
    // a valuation from the price of equipment to be bought "is circular and can read as collateral misrepresentation to
    // a lender", DotAmi's own, and that the financed equipment is the collateral "at the lesser of purchase price or
    // appraised value", which is a different rule from this one and on no page DotAmi cites. The box names the page it
    // quotes because it draws no sources; the program card lists the loans page among its own (#208, merged in on
    // 2026-10-27), so it is one click away under the card.
    why: "“For real property and equipment, security must be taken on the assets financed.”",
    mitigation: "ISED's words, from its page on loans under this program.",
    citations: [
      {
        // The page's own title isn't held (only its address), so this one describes it.
        title: "ISED: loans under the Canada Small Business Financing Program",
        authority: "federal",
        jurisdiction: "CA",
        // Until 2026-10-24 the read cited ISED's program hub (…/canada-small-business-financing-program/en, read
        // 2026-07-02), which holds none of these words. The reading list's tool found this sentence on the loans page
        // on 2026-10-23 with the repo's matcher (the same whole-word, one-block match as scripts/check-quotes.mjs); a
        // networked `node scripts/check-quotes.mjs` run should find it again (docs/engines/citations.md, rule 4).
        url: "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en/canada-small-business-financing-program/find-loan-your-small-business/helping-small-businesses-get-loans",
        toolCheck: {
          checkedOn: "2026-10-23",
          quotes: ["For real property and equipment, security must be taken on the assets financed."],
        },
        note: "ISED's page on the program's loans: security for real property and equipment.",
      },
    ],
  },
] satisfies RiskEntry[];

export const riskCombinationsV2026 = [
  {
    id: "combo-max-deductions-low-revenue",
    memberIds: ["writeoff-home-office", "writeoff-vehicle", "writeoff-cca-class-50"],
    severityBump: "caution",
    why: "Several maximized deduction categories against low or no revenue elevates the overall review profile beyond any single claim.",
  },
] satisfies RiskCombination[];

export type RiskEntryId = (typeof riskEntriesV2026)[number]["id"];

/**
 * Reads taken off the catalog (docs/brain/risk-calculator.md, § Retired risk reads), in the shape the compliance
 * catalog's RETIRED_COMPLIANCE_RULES and the grants catalog's retired programs (#207) have. Their ids are never used
 * again, not even for a read on the same subject, which comes back under a new id (IDs are forever); nothing here
 * reaches a screen, and tests/retired-entries.spec.ts holds this list to the catalog.
 */
export const RETIRED_RISK_ENTRIES: readonly RetiredRiskEntry[] = [
  {
    id: "risk-hobby-reclassification",
    label: "Repeated losses → hobby reclassification",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html",
    readOn: "2026-10-23",
    why: "On the maintainer's reading list of 2026-10-23 the read didn't match its source: its one page, the CRA's Setting up your business, doesn't support what it said about losses year after year, the reasonable-expectation-of-profit question, or running the venture \"business-like\" with \"records that show profit intent\", and DotAmi holds no quote from a page that does. Nothing sourced was left to say, so the Hobby vs. business card shows no risk box. A read on its subject comes back only under a new id, citing a page on business versus personal pursuits and quoting it.",
  },
];
