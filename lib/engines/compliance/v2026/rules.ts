import { CRA_SMALL_SUPPLIER_TESTS, CRA_WHEN_TO_REGISTER_TOOL_CHECK, CRA_WHEN_TO_REGISTER_URL } from "./gst-official-words";
import {
  CRA_GI_196_TOOL_CHECK,
  CRA_GI_196_URL,
  CRA_PLATFORM_REPORTING,
  CRA_PLATFORM_REPORTING_READ,
  CRA_PLATFORM_REPORTING_URL,
  CRA_RIDESHARING_REGISTRATION,
  CRA_SHARING_ECONOMY_TOOL_CHECK,
  CRA_SHARING_ECONOMY_URL,
  CRA_TAXI_RIDE_SHARING_TOOL_CHECK,
  CRA_TAXI_RIDE_SHARING_URL,
  ETA_123_TOOL_CHECK,
  ETA_123_URL,
  ETA_240_TOOL_CHECK,
  ETA_240_URL,
} from "./ride-share-official-words";
import type { ComplianceRule } from "./types";

const LAST_VERIFIED = "2026-06-08";

export const complianceRulesV2026 = [
  {
    id: "compliance-gst-small-supplier",
    label: "GST/HST small-supplier threshold",
    ruleType: "gst-threshold",
    description:
      "Most Canadian businesses need not register for GST/HST while they are small suppliers: until their worldwide taxable supplies are over $30,000 in a single calendar quarter, or over the previous four (or fewer) consecutive calendar quarters. Supplies of financial services, sales of capital property and goodwill from selling a business don't count.",
    threshold: "$30,000 in a single calendar quarter, or over the previous four (or fewer) consecutive calendar quarters",
    thresholdAmount: 30000,
    thresholdTest: { singleQuarter: true, consecutiveQuarters: 4 },
    // Quoted on the card, word for word; until 2026-10-11 the card paraphrased them.
    officialWords: CRA_SMALL_SUPPLIER_TESTS,
    lensAnnotations: {
      // "Most businesses", not "you": the cited page lists people who must register even as small
      // suppliers (taxi and ride-sharing drivers, some non-residents), and the line counts associates' supplies.
      tax: "While neither of the CRA's two $30,000 tests is met, most businesses are small suppliers and need not register yet (the CRA's page lists exceptions); registering voluntarily remains an option for input tax credits.",
      legal: "If B2B customers require a GST number, registration may be needed before the threshold.",
    },
    citations: [
      {
        title: "When to register for and start charging the GST/HST",
        authority: "CRA",
        jurisdiction: "CA",
        url: CRA_WHEN_TO_REGISTER_URL,
        // Option B (docs/engines/citations.md): a tool found the words this entry relies on, the two
        // tests on the card and the exclusions in its description, on the live page. No person has read it.
        toolCheck: {
          checkedOn: CRA_WHEN_TO_REGISTER_TOOL_CHECK.checkedOn,
          quotes: [
            ...CRA_WHEN_TO_REGISTER_TOOL_CHECK.quotes,
            "do not include revenues from supplies of financial services",
            "sales of capital property",
            "goodwill from the sale of a business.",
          ],
        },
        note:
          "CRA small-supplier registration rules (the old address, …/when-register.html, answered 404 on 2026-10-06; an AI model read the new one that day). The two tests on the card are copied from its table, and the exclusions from its footnote 1; scripts/check-quotes.mjs found those words on the page on 2026-10-12.",
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
  {
    // 2026-10-11: until then a driver expecting under $30,000 was told on a green card that most
    // businesses "need not register yet". The small-supplier line doesn't apply to this work.
    id: "compliance-gst-taxi-ride-sharing",
    label: "GST/HST for ride-share and taxi driving: from the first paid ride",
    // The GST/HST registration family the small-supplier rule is in, although this rule has no line.
    ruleType: "gst-threshold",
    description:
      "The CRA says self-employed taxi operators and commercial ride-sharing drivers have to register for GST/HST even if they are small suppliers: the $30,000 line doesn't apply to those rides. For commercial ride-sharing, its info sheet GI-196 says registration takes effect the day the driver starts making taxable supplies, and the driver has to apply before the thirtieth day after that.",
    officialWords: CRA_RIDESHARING_REGISTRATION,
    lensAnnotations: {
      tax: "If you drive passengers for fares arranged through an app, or run a taxi business, the CRA says registration for those rides is needed whatever you earn, from the day of your first paid ride, with 30 days to apply (GI-196, for ride-sharing). That date is worth taking to your accountant.",
      legal:
        "The law is the Excise Tax Act: s.240(1.1) requires a small supplier who carries on a taxi business to be registered, and its definition of a taxi business (s.123(1)) takes in rides arranged through an electronic platform. The CRA's pages are about self-employed drivers.",
    },
    setsAsideThreshold: {
      ruleId: "compliance-gst-small-supplier",
      why: "The CRA says the $30,000 small-supplier line doesn't apply to commercial ride-sharing or to a taxi business, so it doesn't decide when your rides need registering.",
      stillDecides:
        "The $30,000 line still counts for your other sales: the CRA says that while your combined sales stay under $30,000, the required registration generally covers only the ride-sharing, unless you ask for more.",
    },
    reasonNamesTags: true,
    // Option B (docs/engines/citations.md): each page below carries a tool check, the words this entry
    // relies on found on the live page on 2026-10-12. No person is recorded as having read them.
    citations: [
      {
        title: "Sharing economy: commercial ridesharing",
        authority: "CRA",
        jurisdiction: "CA",
        url: CRA_SHARING_ECONOMY_URL,
        toolCheck: CRA_SHARING_ECONOMY_TOOL_CHECK,
        note: "Page details dated 2025-10-20. The two sentences on the card are copied from its \"Commercial ridesharing\" section, as is the line on combined sales under $30,000 (\"your mandatory GST/HST registration will generally only apply to your commercial ridesharing services unless you request otherwise\"); scripts/check-quotes.mjs found those words on the page on 2026-10-12.",
      },
      {
        title: "GST/HST information for taxi operators and commercial ride-sharing drivers",
        authority: "CRA",
        jurisdiction: "CA",
        url: CRA_TAXI_RIDE_SHARING_URL,
        toolCheck: CRA_TAXI_RIDE_SHARING_TOOL_CHECK,
        note: "Page details dated 2026-08-31: \"If you are a self-employed taxi operator or commercial ride-sharing driver who supplies taxable passenger transportation services, you must register for a GST/HST account even if you are a small supplier.\" scripts/check-quotes.mjs found that sentence on the page on 2026-10-12.",
      },
      {
        title: "GI-196, GST/HST and Commercial Ride-sharing Services",
        authority: "CRA",
        jurisdiction: "CA",
        url: CRA_GI_196_URL,
        toolCheck: CRA_GI_196_TOOL_CHECK,
        note: "Info sheet dated February 2023, page details 2025-04-24: \"Although the effective date of registration will be the particular day on which the self-employed commercial ride-sharing driver starts to make taxable supplies, they are only required to apply to the CRA for registration before the thirtieth day after that particular day.\" Its example: a first ride on September 1, 2022, an application due by September 30, 2022, and registration effective September 1, 2022. scripts/check-quotes.mjs found those words on the page on 2026-10-12.",
      },
      {
        title: "Excise Tax Act s.240(1.1) — taxi business",
        authority: "federal",
        jurisdiction: "CA",
        url: ETA_240_URL,
        toolCheck: ETA_240_TOOL_CHECK,
        note: "Act current to 2026-09-21: \"Notwithstanding subsection (1), every small supplier who carries on a taxi business is required to be registered for the purposes of this Part in respect of that business.\" scripts/check-quotes.mjs found that sentence on the page on 2026-10-12.",
      },
      {
        title: "Excise Tax Act s.123(1) — definition of taxi business",
        authority: "federal",
        jurisdiction: "CA",
        url: ETA_123_URL,
        toolCheck: ETA_123_TOOL_CHECK,
        note: "Paragraph (b) of the definition takes in transporting passengers for fares by motor vehicle within a municipality and its environs when the transportation is arranged or coordinated through an electronic platform or system; scripts/check-quotes.mjs found its words on the page on 2026-10-12.",
      },
    ],
    provinces: ["AB", "BC", "ON", "CA"],
    industryTags: ["Ride-share or taxi driving"],
  },
  {
    // 2026-10-11. Says "information", as the CRA's page does: the page doesn't say "earnings". And
    // "may", "certain sellers": the page says the sellers reported "may include" rideshare drivers.
    id: "compliance-platform-reporting-rideshare",
    label: "Ride-share platforms may report drivers' information to the CRA",
    // A type of its own, approved by the maintainer on 2026-10-12 (docs/engines/compliance.md, authoring rule 1).
    ruleType: "platform-reporting",
    description:
      "Under the reporting rules for digital platform operators (Part XX of the Income Tax Act), certain platform operators collect information on certain sellers who use them, verify it and report it to the CRA each year. The CRA lists rideshare and delivery services among the activities whose sellers may be reported.",
    officialWords: CRA_PLATFORM_REPORTING,
    lensAnnotations: {
      tax: "If you drive through an app, its operator may report information about you to the CRA each year, apart from anything you report yourself.",
      legal: "The rules are in Part XX of the Income Tax Act, and the reporting is the platform operator's duty.",
    },
    citations: [
      {
        title: "Reporting Rules for Digital Platforms",
        authority: "CRA",
        jurisdiction: "CA",
        url: CRA_PLATFORM_REPORTING_URL,
        // The maintainer read this page himself on 2026-10-11.
        lastVerified: CRA_PLATFORM_REPORTING_READ,
        readBy: "person",
        note: "Read by the maintainer on 2026-10-11, page details dated 2025-08-01. The sentences on the card are copied from it, with the list item \"Rideshare and delivery services\" from the list of activities whose sellers \"may\" be reported; the page says \"The rules are contained in Part XX of the Income Tax Act\".",
      },
    ],
    reasonNamesTags: true,
    provinces: ["AB", "BC", "ON", "CA"],
    industryTags: ["Ride-share or taxi driving"],
  },
] satisfies ComplianceRule[];

export type ComplianceRuleId = (typeof complianceRulesV2026)[number]["id"];
