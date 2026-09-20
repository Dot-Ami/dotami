import type { RiskCombination, RiskEntry } from "./types";

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
    label: "Home office percentage outliers",
    severity: "caution",
    gaarExposure: false,
    appliesTo: ["writeoff-home-office"],
    why: "Workspace percentages well above typical floor-area math draw review; the exclusive-use test is where claims fail.",
    mitigation: "Base the claim on measured floor area, document exclusive business use, and keep the calculation with your records.",
    citations: [
      {
        title: "Business-use-of-home expenses",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses/business-use-home-expenses.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA workspace-in-home requirements.",
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
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses/motor-vehicle-expenses/motor-vehicle-records.html",
        lastVerified: LAST_VERIFIED,
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
        title: "Capital cost allowance (CCA)",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses/capital-cost-allowance.html",
        lastVerified: LAST_VERIFIED,
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
    why: "The 100% first-year treatment depends on acquisition and available-for-use dates; getting the year wrong misstates income and unwinds on review.",
    mitigation: "Confirm eligibility and the available-for-use date with an accountant before filing — keep purchase and deployment records.",
    citations: [
      {
        title: "T4002 Chapter 4 — Capital cost allowance (immediate expensing measures)",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html",
        lastVerified: LAST_VERIFIED,
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
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive/claim-sred-expenditures.html",
        lastVerified: LAST_VERIFIED,
        note: "Contemporaneous documentation expectations.",
      },
    ],
  },
  {
    id: "risk-hobby-reclassification",
    label: "Repeated losses → hobby reclassification",
    severity: "caution",
    gaarExposure: false,
    appliesTo: ["compliance-hobby-vs-business"],
    why: "Year-after-year losses against employment income invite the reasonable-expectation-of-profit question; reclassification limits expense claims retroactively.",
    mitigation: "Run the venture business-like: separate accounts, a revenue plan, and records that show profit intent — not just deductions.",
    citations: [
      {
        title: "Setting up your business",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA business vs. personal activity framing.",
      },
    ],
  },
  {
    id: "risk-ladder-skipping",
    label: "Early Holdco/Trust structures (GAAR-sensitive)",
    severity: "professional-required",
    gaarExposure: true,
    appliesTo: ["structure-holdco", "structure-family-trust"],
    why: "Entering Holdco or Trust rungs without retained profits or a succession need reads as structure-for-tax's-sake — exactly what the General Anti-Avoidance Rule exists to unwind.",
    mitigation: "These rungs protect assets that already exist. Cross them with professional advice tied to a genuine business purpose, documented at the time.",
    citations: [
      {
        title: "Income Tax Act s.245 — General Anti-Avoidance Rule",
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-245.html",
        lastVerified: LAST_VERIFIED,
        note: "GAAR statutory text.",
      },
    ],
  },
  {
    id: "risk-self-declared-valuation",
    label: "Self-declared valuation as collateral",
    severity: "professional-required",
    gaarExposure: false,
    appliesTo: ["grant-csbfp"],
    why: "Valuing a new company from the price of equipment it intends to buy, then borrowing against that valuation, is circular and can read as collateral misrepresentation to a lender.",
    mitigation: "Use CSBFP as designed — the financed equipment itself is the collateral, at the lesser of purchase price or appraised value.",
    citations: [
      {
        title: "Canada Small Business Financing Program",
        authority: "federal",
        jurisdiction: "CA",
        url: "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en",
        lastVerified: LAST_VERIFIED,
        note: "Program collateral mechanics.",
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
