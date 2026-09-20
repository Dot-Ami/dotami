import type { ComplianceRule } from "./types";

const LAST_VERIFIED = "2026-06-08";

export const complianceRulesV2026 = [
  {
    id: "compliance-gst-small-supplier",
    label: "GST/HST small-supplier threshold",
    ruleType: "gst-threshold",
    description:
      "Most Canadian businesses need not register for GST/HST until worldwide taxable supplies exceed $30,000 in a single calendar quarter or over four consecutive quarters.",
    threshold: "$30,000 rolling four-quarter / single quarter",
    thresholdAmount: 30000,
    lensAnnotations: {
      tax: "If revenue stays under $30K, small-supplier status may defer GST registration — voluntary registration remains an option for ITCs.",
      legal: "If B2B customers require a GST number, registration may be needed before the threshold.",
    },
    citations: [
      {
        title: "When to register for GST/HST",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA small-supplier registration rules.",
      },
    ],
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "compliance-bc-pst",
    label: "BC Provincial Sales Tax (PST)",
    ruleType: "pst-hst",
    description:
      "BC charges PST on taxable goods and certain services. GST/HST and PST are separate obligations.",
    threshold: "Varies by goods/services",
    lensAnnotations: {
      tax: "If selling taxable goods in BC, PST registration and collection may apply alongside GST.",
      legal: "If operating across provinces, nexus and registration rules differ by jurisdiction.",
    },
    citations: [
      {
        title: "Provincial Sales Tax (PST)",
        authority: "provincial",
        jurisdiction: "BC",
        url: "https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst",
        lastVerified: LAST_VERIFIED,
        note: "BC PST overview.",
      },
    ],
    provinces: ["BC"],
  },
  {
    id: "compliance-on-hst",
    label: "Ontario HST (13%)",
    ruleType: "pst-hst",
    description:
      "Ontario participates in HST at 13%. Registered businesses charge and remit HST on taxable supplies.",
    threshold: "GST/HST registration rules apply",
    lensAnnotations: {
      tax: "If customers are in Ontario, HST applies to taxable supplies once registered.",
      legal: "Invoices must show HST registration number when required.",
    },
    citations: [
      {
        title: "Harmonized sales tax",
        authority: "CRA",
        jurisdiction: "ON",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA HST rate guidance for participating provinces.",
      },
    ],
    provinces: ["ON"],
  },
  {
    id: "compliance-ab-no-pst",
    label: "Alberta — no provincial sales tax",
    ruleType: "pst-hst",
    description:
      "Alberta has no PST. GST applies at 5% on taxable supplies once registered.",
    lensAnnotations: {
      tax: "If operating only in Alberta, GST (not HST) applies — simplifying provincial sales tax compliance.",
      legal: "Federal GST rules still apply for registration and remittance.",
    },
    citations: [
      {
        title: "GST/HST rates",
        authority: "CRA",
        jurisdiction: "AB",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA GST rate for non-HST provinces.",
      },
    ],
    provinces: ["AB"],
  },
  {
    id: "compliance-hobby-vs-business",
    label: "Hobby vs. business income test",
    ruleType: "hobby-vs-business",
    description:
      "CRA evaluates whether activity is a business (reasonable expectation of profit) or a hobby (personal pursuit).",
    lensAnnotations: {
      tax: "If the activity lacks profit motive and business-like conduct, income may not be treated as business income — expenses may be limited.",
      legal: "If selling to the public, consumer protection and licensing rules may still apply regardless of hobby status.",
    },
    citations: [
      {
        title: "Business income",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA business vs. personal activity framing.",
      },
    ],
    provinces: ["AB", "BC", "ON", "CA"],
    industryTags: ["Content / streaming", "Woodworking", "Creator / influencer"],
  },
  {
    id: "compliance-trades-licensing-ab",
    label: "Alberta trades licensing",
    ruleType: "licensing",
    description:
      "Certain trades in Alberta require apprenticeship, certification, or business licensing.",
    lensAnnotations: {
      tax: "Licensing costs may be deductible business expenses when incurred to earn income.",
      legal: "If performing regulated trades, provincial certification may be required before commercial work.",
    },
    citations: [
      {
        title: "Trades and occupations",
        authority: "provincial",
        jurisdiction: "AB",
        url: "https://www.alberta.ca/trades-occupations",
        lastVerified: LAST_VERIFIED,
        note: "Alberta regulated trades overview.",
      },
    ],
    provinces: ["AB"],
    industryTags: ["Trades", "Woodworking"],
  },
  {
    id: "compliance-food-premises-on",
    label: "Ontario food premises licensing",
    ruleType: "licensing",
    description:
      "Food service and certain hospitality ventures require public health and municipal licensing in Ontario.",
    lensAnnotations: {
      tax: "Permit and inspection fees may be deductible when tied to earning business income.",
      legal: "If serving food to the public, public health compliance is typically required before opening.",
    },
    citations: [
      {
        title: "Food premises regulation",
        authority: "provincial",
        jurisdiction: "ON",
        url: "https://www.ontario.ca/laws/regulation/900562",
        lastVerified: LAST_VERIFIED,
        note: "Ontario Regulation 562 — Food Premises.",
      },
    ],
    provinces: ["ON"],
    industryTags: ["Hospitality", "Food service"],
  },
] satisfies ComplianceRule[];

export type ComplianceRuleId = (typeof complianceRulesV2026)[number]["id"];
