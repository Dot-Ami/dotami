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
        // Moved: the old address (…/scientific-research-experimental-development-tax-incentive.html, read
        // 2026-06-08) answered 404 on 2026-10-13; a tool found these words on the new page that day.
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: ["tax incentives are intended to encourage businesses to conduct research and development in Canada."],
        },
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
        // Moved: the old address (…/support-technology-innovation/nrc-irap, read 2026-06-08) answered 404
        // on 2026-10-13; a tool found these words on the NRC's About NRC IRAP page that day.
        url: "https://nrc.canada.ca/en/support-technology-innovation/about-nrc-industrial-research-assistance-program",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "is Canada's leading innovation assistance program for small and medium-sized businesses.",
            "We do this through financial assistance, advisory services and connections to the best business and R&D expertise in Canada.",
          ],
        },
        note: "NRC IRAP program overview.",
      },
    ],
    provinces: ["AB", "BC", "ON", "CA"],
    structures: ["ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D", "Manufacturing"],
    estimatedValue: "Varies by project",
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
        // Moved: the old hub (…/page/business-grants-and-funding-ontario-government, read 2026-06-08)
        // answered "We can't find that page" on 2026-10-13. Ontario's funding list for businesses is now a
        // section of this page; a tool found this sentence on it that day.
        url: "https://www.ontario.ca/page/business-and-economy",
        toolCheck: { checkedOn: "2026-10-13", quotes: ["Ontario has a number of funds available for business and not-for-profit entrepreneurs."] },
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

/** A program taken off the catalog: why, in the official page's own terms, and the day that page was read. */
export interface RetiredGrantProgram {
  id: string;
  label: string;
  /** The program's own page, as the catalog cited it. */
  url: string;
  /** The day a tool opened that page to see what it says now. */
  readOn: string;
  why: string;
}

/**
 * Programs taken off (the maintainer's call a-call-1, 2026-10-23: "take both off" before release 0.5.0). Their ids
 * are never reused for another program. Nothing here reaches a screen; docs/engines/grants.md keeps the same list.
 * The Canada-Alberta Productivity Grant, which replaced the Job Grant, is added only after the maintainer reads its
 * amounts.
 */
export const RETIRED_GRANT_PROGRAMS: readonly RetiredGrantProgram[] = [
  {
    id: "grant-abti",
    label: "Alberta Investor Tax Credit (ABTIC)",
    url: "https://www.alberta.ca/alberta-investor-tax-credit",
    readOn: "2026-10-23",
    why:
      "Alberta's page for it answers page not found. A search finds Alberta's corporate tax special notice Vol. 5 No. 54, titled 'Budget 2019 elimination of corporate tax credits' (open.alberta.ca); its page refused the tool, so its words were not checked.",
  },
  {
    id: "grant-cajg",
    label: "Canada-Alberta Job Grant (CAJG)",
    url: "https://www.alberta.ca/canada-alberta-job-grant",
    readOn: "2026-10-23",
    why: "Alberta's page for it now opens the Canada-Alberta Productivity Grant's page (https://www.alberta.ca/canada-alberta-productivity-grant), a different program with its own amounts.",
  },
];
