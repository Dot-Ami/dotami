import type { GrantProgram } from "./types";

const LAST_VERIFIED = "2026-06-08";

export const grantProgramsV2026 = [
  {
    id: "grant-sred",
    label: "SR&ED tax incentives",
    kind: "tax-credit",
    authority: "CRA / federal",
    description:
      "Scientific Research and Experimental Development (SR&ED) program provides tax credits and deductions for eligible R&D in Canada.",
    eligibility:
      "Eligible SR&ED work performed in Canada; CCPCs may access enhanced ITC rates subject to taxable income and capital limits.",
    lensAnnotations: {
      tax: "If the venture performs systematic experimentation to resolve technological uncertainty, SR&ED may unlock ITCs and deductions — with contemporaneous documentation.",
      legal:
        "If contractors perform SR&ED work, contracts and IP terms may affect eligibility and claim allocation.",
    },
    citations: [
      {
        title: "Scientific Research and Experimental Development (SR&ED) tax incentives",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA SR&ED program overview.",
      },
    ],
    provinces: ["AB", "BC", "ON", "CA"],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D", "Manufacturing"],
    estimatedValue: "15–35% ITC on eligible expenditures",
    ratesByStructure: [
      {
        structure: "sole-prop",
        rate: 0.15,
        refundable: false,
        note: "Unincorporated claimants earn the basic 15% non-refundable ITC.",
      },
      {
        structure: "sole-prop-gst",
        rate: 0.15,
        refundable: false,
        note: "GST registration does not change the SR&ED rate — incorporation does.",
      },
      {
        structure: "ccpc",
        rate: 0.35,
        refundable: true,
        note: "CCPCs may earn the enhanced 35% refundable ITC up to the expenditure limit — confirm the current limit with an advisor.",
      },
    ],
  },
  {
    id: "grant-cajg",
    label: "Canada-Alberta Job Grant (CAJG)",
    kind: "grant",
    authority: "Alberta / federal",
    description:
      "Employer-driven training grant covering a portion of third-party training costs for employees.",
    eligibility:
      "Alberta employers with Canada Revenue Agency business number; training must be third-party and job-related.",
    lensAnnotations: {
      tax: "If hiring and upskilling staff, CAJG may unlock partial training cost recovery — separate from wage deductibility.",
      legal: "If workers are employees, employment standards and payroll obligations apply alongside grant eligibility.",
    },
    citations: [
      {
        title: "Canada-Alberta Job Grant",
        authority: "provincial",
        jurisdiction: "AB",
        url: "https://www.alberta.ca/canada-alberta-job-grant",
        lastVerified: LAST_VERIFIED,
        note: "Alberta CAJG program page.",
      },
    ],
    provinces: ["AB"],
    structures: ["sole-prop-gst", "ccpc"],
    activityTags: ["Trades", "Consulting", "Hospitality"],
    estimatedValue: "Up to 2/3 of training costs",
  },
  {
    id: "grant-irap",
    label: "NRC IRAP",
    kind: "grant",
    authority: "NRC / federal",
    description:
      "Industrial Research Assistance Program provides advisory services and funding to accelerate technology innovation in Canadian SMEs.",
    eligibility:
      "Incorporated Canadian SME with growth potential; project must involve technology innovation with commercial potential.",
    lensAnnotations: {
      tax: "If product R&D needs non-dilutive funding, IRAP may unlock project contributions — often alongside SR&ED.",
      legal: "If IP is central to the venture, grant agreements may include reporting and milestone obligations.",
    },
    citations: [
      {
        title: "NRC IRAP",
        authority: "federal",
        jurisdiction: "CA",
        url: "https://nrc.canada.ca/en/support-technology-innovation/nrc-irap",
        lastVerified: LAST_VERIFIED,
        note: "NRC IRAP program overview.",
      },
    ],
    provinces: ["AB", "BC", "ON", "CA"],
    structures: ["ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D", "Manufacturing"],
    estimatedValue: "Varies by project",
  },
  {
    id: "grant-abti",
    label: "Alberta Investor Tax Credit (ABTIC)",
    kind: "tax-credit",
    authority: "Alberta",
    description:
      "Tax credit for investors in eligible Alberta small businesses — relevant when raising capital.",
    eligibility:
      "Eligible Alberta small business corporation; investor and corporation must meet program criteria.",
    lensAnnotations: {
      tax: "If raising equity from Alberta investors, ABTIC may unlock investor-side credits — subject to annual caps.",
      legal: "If securities are issued, prospectus and private placement rules may apply alongside program eligibility.",
    },
    citations: [
      {
        title: "Alberta Investor Tax Credit",
        authority: "provincial",
        jurisdiction: "AB",
        url: "https://www.alberta.ca/alberta-investor-tax-credit",
        lastVerified: LAST_VERIFIED,
        note: "Alberta ABTIC program page.",
      },
    ],
    provinces: ["AB"],
    structures: ["ccpc"],
    activityTags: ["Software / SaaS", "Manufacturing"],
    estimatedValue: "30% investor credit on eligible investments",
  },
  {
    id: "grant-bc-innovate",
    label: "BC Innovate BC programs",
    kind: "grant",
    authority: "BC",
    description:
      "Provincial innovation funding and support for BC technology ventures.",
    eligibility:
      "BC-based technology companies; program-specific criteria apply.",
    lensAnnotations: {
      tax: "If the venture is BC-based with tech commercialization goals, provincial programs may unlock non-dilutive support.",
      legal: "Grant agreements may include reporting, IP, and residency obligations.",
    },
    citations: [
      {
        title: "Innovate BC",
        authority: "provincial",
        jurisdiction: "BC",
        url: "https://www.innovatebc.ca/",
        lastVerified: LAST_VERIFIED,
        note: "BC innovation agency program hub.",
      },
    ],
    provinces: ["BC"],
    structures: ["sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D"],
    estimatedValue: "Varies by program",
  },
  {
    id: "grant-on-innovation",
    label: "Ontario innovation and scale-up supports",
    kind: "grant",
    authority: "Ontario",
    description:
      "Provincial programs supporting Ontario SMEs in technology and manufacturing scale-up.",
    eligibility:
      "Ontario-based businesses; program-specific revenue, sector, and job-creation criteria.",
    lensAnnotations: {
      tax: "If scaling in Ontario, provincial grants may unlock co-funded projects — separate from federal SR&ED.",
      legal: "Application and reporting obligations vary by program stream.",
    },
    citations: [
      {
        title: "Ontario business grants and funding",
        authority: "provincial",
        jurisdiction: "ON",
        url: "https://www.ontario.ca/page/business-grants-and-funding-ontario-government",
        lastVerified: LAST_VERIFIED,
        note: "Ontario government business funding hub.",
      },
    ],
    provinces: ["ON"],
    structures: ["sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "Manufacturing", "Consulting"],
    estimatedValue: "Varies by program",
  },
  {
    id: "grant-alberta-innovates",
    label: "Alberta Innovates funding programs",
    kind: "grant",
    authority: "Alberta",
    description:
      "Provincial innovation agency funding projects that support the growth and diversification of Alberta's economy — programs for SMEs, startups, and R&D ventures.",
    eligibility:
      "Alberta-based ventures; program-specific criteria apply (stage, sector, matching funds vary by stream).",
    lensAnnotations: {
      tax: "If the venture is Alberta-based with a technology or R&D character, Alberta Innovates streams may unlock non-dilutive project funding — often stackable with SR&ED.",
      legal: "Funding agreements may carry reporting, IP, and residency obligations per stream.",
    },
    citations: [
      {
        title: "Alberta Innovates",
        authority: "provincial",
        jurisdiction: "AB",
        url: "https://albertainnovates.ca/",
        lastVerified: "2026-07-02",
        note: "Alberta Innovates program hub — verified live 2026-07-02.",
      },
    ],
    provinces: ["AB"],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D", "Manufacturing"],
    estimatedValue: "Varies by program stream",
  },
  {
    id: "grant-csbfp",
    label: "Canada Small Business Financing Program (CSBFP)",
    kind: "financing",
    authority: "ISED / federal",
    description:
      "Federal loan-guarantee program (not a grant): borrow from a bank or credit union with the government guaranteeing most of the lender's loss. Up to $500K specifically for equipment; collateral is the financed equipment itself.",
    eligibility:
      "Canadian small businesses under the revenue ceiling; startup-friendly — no revenue history required. Equipment purchased within the past 365 days may be rolled into a CSBFP loan retroactively.",
    lensAnnotations: {
      tax: "If equipment is on the venture's path, CSBFP may make financing available without revenue history — and the 365-day retroactive window means buying now does not forfeit the option. Loan interest and fees may be deductible; the loan itself is not income.",
      legal: "If applying, the lender relationship is a real credit obligation — personal guarantees and registration fees apply. This is financing, not free money.",
    },
    citations: [
      {
        title: "Canada Small Business Financing Program",
        authority: "federal",
        jurisdiction: "CA",
        url: "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en",
        lastVerified: "2026-07-02",
        note: "ISED program hub — equipment financing with government loan guarantee.",
      },
    ],
    provinces: ["AB", "BC", "ON", "CA"],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D", "Trades", "Manufacturing", "Hospitality"],
    estimatedValue: "Up to $500K equipment financing (loan guarantee, not a grant)",
  },
] satisfies GrantProgram[];

export type GrantProgramId = (typeof grantProgramsV2026)[number]["id"];
