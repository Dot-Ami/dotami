import { MAINTAINER_READ_ON } from "@/lib/engines/shared/maintainer-reads";

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
        // 2026-06-08) answered 404 on 2026-10-13; a tool found these words on the new page that day. The maintainer
        // read the new page in full on 2026-10-25.
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: ["tax incentives are intended to encourage businesses to conduct research and development in Canada."],
        },
        note: "CRA SR&ED program overview.",
      },
      // The four below were added 2026-10-24 for the rates and the limit the card quotes (the maintainer's reading
      // list of 2026-10-23, items grant-sred/* and sred-expenditure-limit-6-million). Its tool found each quote on its
      // page that day (./sred-official-words.ts), and the maintainer read each page in full on 2026-10-25: the read wins
      // on screen ("Read by a person"), and the tool checks stay.
      {
        // The page's own title (./sred-official-words.ts, SRED_PAGES.whatAre).
        title: "What are SR&ED tax incentives",
        authority: "CRA",
        jurisdiction: "CA",
        url: SRED_PAGES.whatAre,
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
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
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: { checkedOn: SRED_QUOTES_FOUND_ON, quotes: [SRED_WORDS.ccpcEnhanced] },
        note: "Which CCPCs may earn the enhanced 35% rate, up to their expenditure limit for the year, and how associated corporations share that limit.",
      },
      {
        title: "What's new for corporations",
        authority: "CRA",
        jurisdiction: "CA",
        url: SRED_PAGES.whatsNew,
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: { checkedOn: SRED_QUOTES_FOUND_ON, quotes: [SRED_WORDS.limitSixMillion] },
        note: "The CRA's list of corporation income tax changes; its line on the SR&ED expenditure limit sits under 2025 – Federal.",
      },
      {
        title: "Income Tax Act s.127(10.2) — expenditure limit",
        authority: "federal",
        jurisdiction: "CA",
        url: SRED_PAGES.act127,
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
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
        // which rested only on the maintainer's read (his answer of 2026-10-24: his reads weren't recorded then). None
        // of the card's quotes says the enhanced rate is refundable, so the card leaves it unsaid until a held quote
        // does (docs/engines/citations.md, § Blocked, item 5). His reads of 2026-10-25 record only that he read these
        // pages in full, not what he found on refunds.
        // Until 2026-10-24 the note said "confirm the current limit with an advisor" and gave no limit. The limit is
        // $6 million in the consolidated Act's s.127(10.2) (the reading list found the formula), for tax years
        // beginning on or after 2024-12-16. No held quote carries that date, so it is on no screen and in no field, only
        // here and in docs/engines/citations.md (the rule: no number or date without a held quote); the card gives the amount only
        // inside the CRA's quote.
        note: `The CRA: “${SRED_WORDS.ccpcEnhanced}” The CRA's What's new for corporations: “${SRED_WORDS.limitSixMillion}”`,
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
      // Reworded 2026-10-23 to ISED's loans page (the maintainer's reading list, item grant-csbfp/equipment-limit):
      // the $500,000 is the most of a term loan for leasehold improvements and equipment together, not for
      // equipment alone.
      "Federal loan-guarantee program (not a grant), through a bank, caisse populaire or credit union. ISED's loans page says it 'makes it easier for small businesses to get loans from financial institutions by sharing the risk with lenders': 'Up to a maximum of $1,000,000 for term loans for any one borrower, of which no more than $500,000 can be used for purchasing leasehold improvements and purchasing or improving new or used equipment'; 'For real property and equipment, security must be taken on the assets financed.'",
    eligibility:
      // The line on rolling in equipment bought "within the past 365 days" came out 2026-10-23: no ISED page held it
      // (the maintainer's reading list, item grant-csbfp/365-days).
      // Since a review of 2026-10-24, ISED's words only: "under the revenue ceiling" and "no revenue history
      // required" were DotAmi's own, and no citation held them.
      "Borrowers, in ISED's words: 'Small businesses or start-ups operating in Canada'.",
    lensAnnotations: {
      // Shown on screen as the card's payoff. Until a review of 2026-10-24 it also said, in DotAmi's own words, that
      // the program "may make financing available without revenue history" and that "Loan interest and fees may be
      // deductible; the loan itself is not income": tax information no citation held.
      tax: "If equipment or leasehold improvements are on the venture's path, ISED's loans page on this program: 'makes it easier for small businesses to get loans from financial institutions by sharing the risk with lenders'.",
      legal: "If applying, the lender relationship is a real credit obligation — personal guarantees and registration fees apply. This is financing, not free money.",
    },
    citations: [
      {
        title: "Canada Small Business Financing Program",
        authority: "federal",
        jurisdiction: "CA",
        url: "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en",
        // Read on 2026-07-02 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        note: "ISED program hub — equipment financing with government loan guarantee.",
      },
      {
        title: "Helping small businesses get loans (Canada Small Business Financing Program)",
        authority: "federal",
        jurisdiction: "CA",
        // Added 2026-10-23: a tool found these words on ISED's loans page that day (option B), and the maintainer read
        // the page in full on 2026-10-25.
        url: "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en/canada-small-business-financing-program/find-loan-your-small-business/helping-small-businesses-get-loans",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-23",
          quotes: [
            "makes it easier for small businesses to get loans from financial institutions by sharing the risk with lenders",
            "Small businesses or start-ups operating in Canada",
            "Discuss your business needs with a financial officer at any bank, caisse populaire, or credit union in Canada.",
            "Up to a maximum of $1,000,000 for term loans for any one borrower, of which no more than $500,000 can be used for purchasing leasehold improvements and purchasing or improving new or used equipment",
            "For real property and equipment, security must be taken on the assets financed.",
          ],
        },
        note: "ISED's page on the program's loans: who can borrow, the most that can be borrowed and for what, rates, the registration fee and security.",
      },
    ],
    provinces: ["AB", "BC", "ON", "CA"],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D", "Trades", "Manufacturing", "Hospitality"],
    estimatedValue: "Up to $500,000 of a term loan for leasehold improvements and equipment (loan guarantee, not a grant)",
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
    // Alberta's page: “The program is delivered by Alberta and funded by the Government of Canada through the
    // Canada–Alberta Workforce Development Agreement.” (held by the source's tool check since 2026-10-29). Until then no
    // held quote said who else funds it, and this said "Alberta". No screen shows this field, and no line reconciles
    // the sentence with the funding table's "Government of Alberta" row.
    authority: "Alberta / federal",
    // "Employer:" and "Government of Alberta:" are the page's funding table's own row labels, each held with its line as
    // one row ("Employer | Must contribute 25% …"): since 2026-10-29 scripts/check-quotes.mjs reads a table row as one
    // piece (the maintainer's answer of 2026-10-29). The $100,000 line sits in the second row's cell too, as its second
    // item, but only a row's nearest item is held with its label, so it stands as its own quote; it names its subject.
    description:
      "In the words of Alberta's page on this program: Employer: “Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire”; Government of Alberta: “Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year”; “An employer is eligible for up to a maximum amount of $100,000 per fiscal year”.",
    // No screen draws a program's eligibility. The page's lists, each after its own lead-in, as the tool check of
    // 2026-10-29 holds them (found on 2026-10-27 first). Three items are times, which DotAmi never writes, so each is in
    // the tool check only and a "…" marks its place: “be operational in Alberta for at least one year” and “have an
    // active legal entity status throughout the grant term” (the employer list's first two), and “be completed within
    // 52 weeks” (the training list's second). Until 2026-10-29 the one-year rule was here. The costs list's first item,
    // "examination fees", is two words, under the checker's three, so a "…" marks it too. A "…" also stands before
    // “Registered employers must also:”, which follows the page's list of eligible employer types ("Employers must be
    // one of the following eligible types:" …, in plain quote marks here: not held): that list isn't held, nor are its lists of ineligible employers and
    // ineligible training, since they come close to whether a sole proprietor counts, the maintainer's call. The
    // travel-costs sentence between the costs list and its NOTE is quoted in its place (the review of #223).
    eligibility:
      "Alberta's page on this program: … “Registered employers must also:” … “be in good standing”; “carry Workers Compensation Benefits coverage for trainees”; “comply with provincial agreements”. “Training must be directly related to the trainees’ current or future job and fall within at least one of the following skills categories:” “Business Process and Operations Management: Improving processes, systems, operations, and resource management”; “Technical: Specialized skills that enhance efficiency, quality, and problem solving”; “Digital and Technological: Skills to use, manage, and integrate digital tools and technologies”. “Training must also:” “be relevant to the trainee’s job”; … “include interaction with a qualified instructor”; “be instructional and structured”; “take place in Alberta, except under exceptional circumstances”. “The Canada–Alberta Productivity Grant is available for direct training costs only, including:” … “tuition or course fees charged by the training provider”; “textbooks or software”. “Small and medium-sized organizations may be eligible for travel costs related to training”. “Employee wages and general business assets are not eligible”.",
    lensAnnotations: {
      // Shown on screen as the card's payoff (lib/brain/evaluate.ts evaluateGrant). Outside the quotes: the compass's
      // "If", the page's name and the table's own row labels only, never what the program may do. Until 2026-10-29 the
      // labels weren't held, so neither line named who contributes which.
      tax: "If training employees is on the venture's path, Alberta's page on this program: Employer: “Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire”; Government of Alberta: “Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year”; “An employer is eligible for up to a maximum amount of $100,000 per fiscal year”.",
      // The employer's share and the page's requirements for registered employers, the two times among them left out,
      // and a "…" for the unheld list of eligible employer types the lead-in follows (see eligibility).
      legal:
        "Alberta's page on this program: Employer: “Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire”; … “Registered employers must also:” … “be in good standing”; “carry Workers Compensation Benefits coverage for trainees”; “comply with provincial agreements”.",
    },
    citations: [
      {
        title: "Canada-Alberta Productivity Grant",
        authority: "provincial",
        jurisdiction: "AB",
        // The maintainer's reading list (2026-10-23, items capg-75-percent, capg-5000-per-trainee,
        // capg-100000-per-employer and capg-operational-one-year) fetched the page that day from the Job Grant's old
        // address, which redirects here, and its tool (the repo's matcher, the same whole-word, one-block match as
        // scripts/check-quotes.mjs) found the first four quotes below on it. The maintainer read the page in full on
        // 2026-10-25, so its card says "Read by a person" (the read wins on screen); the tool check stays. A networked
        // `node scripts/check-quotes.mjs` run found them again on 2026-10-26, before merge (docs/engines/citations.md, rule 4).
        // Since 2026-10-29 this is one check of that day (the maintainer's answer of 2026-10-29 for the sentences found
        // on 2026-10-27: "One new check that holds the old and new sentences", dated by its run): one
        // `node scripts/check-quotes.mjs --url … --quote …` run found all 27 quotes, the four above, the funding table's
        // two rows (a row's cells joined by " | ", the checker's row reading of the same day), and the page's
        // requirements for registered employers, what training and costs count, and who delivers and funds it. (A first
        // run that day held 26; the review of #223 added the travel-costs sentence, so a second run held all 27, and
        // this check is that run's.)
        url: "https://www.alberta.ca/canada-alberta-productivity-grant",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-29",
          quotes: [
            "Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire.",
            "Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year.",
            "An employer is eligible for up to a maximum amount of $100,000 per fiscal year.",
            "be operational in Alberta for at least one year",
            "Employer | Must contribute 25% of the total eligible training costs for existing employees or individuals (includes unemployed individuals) they intend to hire.",
            "Government of Alberta | Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year.",
            "Registered employers must also:",
            "have an active legal entity status throughout the grant term",
            "be in good standing",
            "carry Workers Compensation Benefits coverage for trainees",
            "comply with provincial agreements",
            "Training must be directly related to the trainees’ current or future job and fall within at least one of the following skills categories:",
            "Business Process and Operations Management: Improving processes, systems, operations, and resource management",
            "Technical: Specialized skills that enhance efficiency, quality, and problem solving",
            "Digital and Technological: Skills to use, manage, and integrate digital tools and technologies",
            "Training must also:",
            "be relevant to the trainee’s job",
            "be completed within 52 weeks",
            "include interaction with a qualified instructor",
            "be instructional and structured",
            "take place in Alberta, except under exceptional circumstances",
            "The Canada–Alberta Productivity Grant is available for direct training costs only, including:",
            "tuition or course fees charged by the training provider",
            "textbooks or software",
            "Small and medium-sized organizations may be eligible for travel costs related to training.",
            "Employee wages and general business assets are not eligible.",
            "The program is delivered by Alberta and funded by the Government of Canada through the Canada–Alberta Workforce Development Agreement.",
          ],
        },
        note: "Alberta's program page: its funding table (the employer's and the Government of Alberta's shares of training costs, the most per employed trainee and per employer), who delivers and funds the program, what registered employers meet, and the training and costs it lists.",
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
      "Alberta's page: Government of Alberta: “Contributes the other 75% of the cost to a maximum of $5,000 per employed trainee per fiscal year”; “An employer is eligible for up to a maximum amount of $100,000 per fiscal year”.",
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
 * The Canada-Alberta Productivity Grant, whose page the Job Grant's address now opens, is in the catalog above under its
 * own id, `grant-capg` (2026-10-24, the same call: "ADD it"), saying only the quotes a tool found on its page. The
 * maintainer read that page in full on 2026-10-25, so its source says "Read by a person on 2026-10-25"
 * (docs/engines/citations.md, § The maintainer's reads of 2026-10-25).
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
