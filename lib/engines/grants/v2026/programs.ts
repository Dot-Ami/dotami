import { SRED_PAGES, SRED_QUOTES_FOUND_ON, SRED_WORDS } from "./sred-official-words";
import type { GrantProgram } from "./types";

const LAST_VERIFIED = "2026-06-08";

/** The CRA's two lines a sole proprietor's SR&ED card quotes, with or without the GST/HST (2026-10-24). */
const SOLE_PROP_SRED_NOTE = `The CRA: “${SRED_WORDS.basicRate}” “${SRED_WORDS.someRefundable}”`;

export const grantProgramsV2026 = [
  {
    id: "grant-sred",
    label: "SR&ED tax incentives",
    kind: "tax-credit",
    authority: "CRA / federal",
    description:
      "Scientific Research and Experimental Development (SR&ED) program provides tax credits and deductions for eligible R&D in Canada.",
    eligibility:
      // Until 2026-10-24 "subject to taxable income and capital limits", which no held quote names; now the condition
      // in the CRA's sentence on the enhanced rate (the maintainer's reading list: 35% for eligible CCPCs, within the
      // limit).
      "Eligible SR&ED work performed in Canada; some CCPCs may earn the enhanced rate, up to their expenditure limit for the year.",
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
      // The four below were added 2026-10-24 for the rates and the limit the card quotes (the maintainer's reading
      // list of 2026-10-23, items grant-sred/* and sred-expenditure-limit-6-million). Its tool found each quote on its
      // page that day (./sred-official-words.ts); no read of these pages is on record, so each card says "Checked by a
      // tool" in amber and lists the words.
      {
        title: "SR&ED tax incentives: the credit's rates",
        authority: "CRA",
        jurisdiction: "CA",
        url: SRED_PAGES.whatAre,
        toolCheck: {
          checkedOn: SRED_QUOTES_FOUND_ON,
          quotes: [SRED_WORDS.basicRate, SRED_WORDS.enhancedRate, SRED_WORDS.someRefundable],
        },
        note: "The SR&ED investment tax credit's basic and enhanced rates, and that some businesses may also earn a refundable credit.",
      },
      {
        title: "How certain relationships affect the small business deduction and SR&ED investment tax credits",
        authority: "CRA",
        jurisdiction: "CA",
        url: SRED_PAGES.relationships,
        toolCheck: { checkedOn: SRED_QUOTES_FOUND_ON, quotes: [SRED_WORDS.ccpcEnhanced] },
        note: "Which CCPCs may earn the enhanced 35% rate, up to their expenditure limit for the year, and how associated corporations share that limit.",
      },
      {
        title: "What's new for corporations",
        authority: "CRA",
        jurisdiction: "CA",
        url: SRED_PAGES.whatsNew,
        toolCheck: { checkedOn: SRED_QUOTES_FOUND_ON, quotes: [SRED_WORDS.limitSixMillion] },
        note: "The CRA's list of corporation income tax changes; its line on the SR&ED expenditure limit sits under 2025 – Federal.",
      },
      {
        title: "Income Tax Act s.127(10.2) — expenditure limit",
        authority: "federal",
        jurisdiction: "CA",
        url: SRED_PAGES.act127,
        toolCheck: { checkedOn: SRED_QUOTES_FOUND_ON, quotes: [SRED_WORDS.actFormula] },
        note: "The formula for a CCPC's expenditure limit for a taxation year, from $6 million (the consolidated Act).",
      },
    ],
    provinces: ["AB", "BC", "ON", "CA"],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D", "Manufacturing"],
    // Shown on no screen. The range is the CRA's basic and enhanced rates (its page on the credit's rates, above).
    estimatedValue: "15–35% ITC on eligible expenditures",
    ratesByStructure: [
      {
        structure: "sole-prop",
        rate: 0.15,
        // No `refundable`: until 2026-10-24 this said "non-refundable" ("Unincorporated claimants earn the basic 15%
        // non-refundable ITC."). The maintainer's reading list notes an individual can get part of the credit
        // refunded; no held quote says that or how much, so the card says neither and quotes the CRA's two lines.
        note: SOLE_PROP_SRED_NOTE,
      },
      {
        structure: "sole-prop-gst",
        rate: 0.15,
        // Until 2026-10-24: "GST registration does not change the SR&ED rate — incorporation does." Incorporating
        // changes it only for some CCPCs (the CRA's sentence on the enhanced rate), so the card quotes the CRA instead.
        note: SOLE_PROP_SRED_NOTE,
      },
      {
        structure: "ccpc",
        rate: 0.35,
        // No `refundable` since 2026-10-24: the card said "35% (refundable)" and its fork "35% refundable treatment",
        // which rested only on the maintainer's read (his answer of 2026-10-24: his reads aren't recorded yet). None of
        // the card's quotes says the enhanced rate is refundable, so the card leaves it unsaid until a held quote or
        // his recorded read does (docs/engines/citations.md, § Blocked).
        // Until 2026-10-24 the note said "confirm the current limit with an advisor" and gave no limit. The limit is
        // $6 million in the consolidated Act's s.127(10.2) (the reading list found the formula), for tax years
        // beginning on or after 2024-12-16. No held quote carries that date, so it is on no screen and in no field, only
        // here and in docs/engines/citations.md (the maintainer's answer of 2026-10-24); the card gives the amount only
        // inside the CRA's quote.
        note: `The CRA: “${SRED_WORDS.ccpcEnhanced}” The CRA's What's new for corporations: “${SRED_WORDS.limitSixMillion}”`,
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
  {
    // The maintainer's call a-call-1 on his reading list of 2026-10-23: "ADD it". The program whose page the
    // Canada-Alberta Job Grant's old address now opens (https://www.alberta.ca/canada-alberta-job-grant redirects
    // there). Its own id: grant-cajg is never reused. Every amount and rule below is the page's own words, each held as
    // a quote of the citation; DotAmi's own words only name the page and give the compass's "If"
    // (tests/productivity-grant.spec.ts).
    id: "grant-capg",
    label: "Canada-Alberta Productivity Grant",
    kind: "grant",
    // Alberta's page. No held quote says who else funds it, so "federal" is not claimed. No screen shows this field.
    authority: "Alberta",
    description:
      "In the words of Alberta's page on this program: “Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire”; “Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year”; “An employer is eligible for up to a maximum amount of $100,000 per fiscal year”.",
    // No screen draws a program's eligibility. The page's one-year rule is a time, which DotAmi shows only as the
    // page's quoted words, so it stays off the card's line (lensAnnotations.tax); it is on screen only among the
    // words found on the page, under the card's source.
    eligibility: "Employers, in Alberta's words, one of the requirements its page lists: “be operational in Alberta for at least one year”.",
    lensAnnotations: {
      // Shown on screen as the card's payoff (lib/brain/evaluate.ts evaluateGrant). Outside the quotes: the compass's
      // "If" and the page's name only, never what the program may do. The page's subjects for the 25% and 75% lines
      // aren't held, so none is added, here or in the legal line.
      tax: "If training employees is on the venture's path, Alberta's page on this program: “Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire”; “Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year”; “An employer is eligible for up to a maximum amount of $100,000 per fiscal year”.",
      legal:
        "Alberta's page on this program: “Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire”.",
    },
    citations: [
      {
        title: "Canada-Alberta Productivity Grant",
        authority: "provincial",
        jurisdiction: "AB",
        // The maintainer's reading list (2026-10-23, items capg-75-percent, capg-5000-per-trainee,
        // capg-100000-per-employer and capg-operational-one-year) fetched the page that day from the Job Grant's old
        // address, which redirects here, and its tool (the repo's matcher, the same whole-word, one-block match as
        // scripts/check-quotes.mjs) found these four quotes on it. No read of the page is on record yet, so its card
        // says "Checked by a tool" in amber. A networked `node scripts/check-quotes.mjs` run should find them again
        // before merge (docs/engines/citations.md, rule 4).
        url: "https://www.alberta.ca/canada-alberta-productivity-grant",
        toolCheck: {
          checkedOn: "2026-10-23",
          quotes: [
            "Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire.",
            "Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year.",
            "An employer is eligible for up to a maximum amount of $100,000 per fiscal year.",
            "be operational in Alberta for at least one year",
          ],
        },
        note: "Alberta's program page: the employer's and the program's shares of eligible training costs, the most per employed trainee and per employer, and what an employer meets.",
      },
    ],
    provinces: ["AB"],
    // Open at every structure: no held word of the page limits it to a corporation. Leaving the sole proprietorship out
    // would make evaluateGrant's near-miss say "requires incorporation (CCPC)", as the Job Grant's card wrongly did.
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    // No kind of work: the page's held words name none, so DotAmi names none. It shows for every Alberta idea, and its
    // reason names only the place (lib/brain/evaluate.ts evaluateGrant).
    activityTags: [],
    estimatedValue:
      "Alberta's page: “Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year”; “An employer is eligible for up to a maximum amount of $100,000 per fiscal year”.",
  },
] satisfies GrantProgram[];

export type GrantProgramId = (typeof grantProgramsV2026)[number]["id"];
