import { MAINTAINER_READ_ON } from "@/lib/engines/shared/maintainer-reads";

import type { WriteOffCategory } from "./types";

// Until 2026-10-13 the CRA pages here shared one read date, 2026-06-08. Each of those pages moved; the
// new addresses carry a tool check instead, and each comment names the old address and its read date.
// A page the maintainer read in full on 2026-10-25 carries his read too, which wins on screen
// (docs/engines/citations.md, § The maintainer's reads of 2026-10-25).

export const writeOffCategoriesV2026 = [
  {
    id: "writeoff-home-office",
    label: "Home office expenses",
    description:
      "Portion of home costs attributable to a dedicated workspace used primarily for business.",
    eligibility:
      "The work space must be EITHER the principal place of business, OR used exclusively for earning business income AND used on a regular and continuous basis for meeting clients, customers or patients there. Exclusive use alone is not enough. The deduction cannot exceed the year's income from the business (excess carries forward). Reasonable allocation method required.",
    lensAnnotations: {
      tax: "If work happens from home, a reasonable portion of rent, utilities, insurance, and maintenance may be deductible.",
      legal: "If zoning or lease rules restrict home business use, local bylaws may affect operating legitimacy.",
    },
    citations: [
      {
        title: "Income Tax Act s.18(12) — Work space in home",
        corpus: [{ source: "ita", label: "18", sub: "(12)" }],
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-18.html",
        lastVerified: "2026-09-13",
        verification: { status: "supported", method: "Provision text read from the consolidated Act in corpus.db (2026-09-13); the entry text carries the two conditions the reading added." },
        note: "Read from the consolidated Act (the maintainers' statute store; s.18 last amended 2026-03-26). Two conditions the earlier text omitted: the exclusive-use branch ALSO requires regular client meetings on site, and 18(12)(b) caps the deduction at the year's business income.",
      },
      {
        title: "Business-use-of-home expenses",
        authority: "CRA",
        jurisdiction: "CA",
        // The page moved: its old address (…/report-business-income-expenses/business-expenses/business-use-home-expenses.html,
        // read 2026-06-08) answered 404 on 2026-10-13. A tool found these words on the new page that day
        // (option B, docs/engines/citations.md), and the maintainer read it in full on 2026-10-25. The fifth, the
        // page's sentence on the business part, joined on 2026-10-27: `node scripts/check-quotes.mjs` found all five
        // that day, so the check is that day's (the home office risk read quotes it).
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-27",
          quotes: [
            "You can deduct expenses for the business use of a workspace in your home",
            "it is your principal place of business",
            "you use the space only to earn your business income, and you use it on a regular and ongoing basis to meet your clients, customers, or patients",
            "cannot be more than your net income from the business before you deduct these expenses",
            "To calculate the part you can deduct, use a reasonable basis, such as the area of the workspace divided by the total area of your home.",
          ],
        },
        note: "CRA home office expense guidance.",
      },
    ],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "Consulting", "Content / streaming", "Trades"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "writeoff-vehicle",
    label: "Motor vehicle expenses",
    description:
      "Vehicle costs for business use — fuel, insurance, maintenance, lease, or CCA on owned vehicles.",
    eligibility:
      // The amounts are the ones Income Tax Regulations s.7307 prescribe, not the Act's own $250 and $600 (each
      // "or such other amount as may be prescribed"): corrected 2026-10-23 from the maintainer's reading list. Each is
      // an amount per 30 days (the Act's A × B / 30 in s.67.2 and s.67.3(c)), said since a review of 2026-10-24.
      "Logbook or reasonable basis for business-use percentage; personal use portion not deductible. Two statutory caps apply to passenger vehicles regardless of business use: loan interest under the Act's s.67.2, whose amount Income Tax Regulations s.7307 prescribe as $350 for each 30 days of interest for a car acquired after 2023 ($300 for one acquired after 2000 and before 2024), and lease costs under s.67.3, whose amount s.7307 prescribes as $1,100 plus sales tax for each 30 days of a lease entered into after 2024 (earlier leases have their own amounts in the same section).",
    lensAnnotations: {
      tax: "If the venture requires travel to clients or job sites, business-use vehicle costs may be deductible proportionally.",
      legal: "If employees drive company vehicles, insurance and safety obligations differ from owner-operated use.",
    },
    citations: [
      {
        title: "Income Tax Act s.18(1)(a), s.67, s.67.2, s.67.3 — purpose test, reasonableness, interest and lease caps",
        corpus: [
          { source: "ita", label: "18", sub: "(1)(a)" },
          { source: "ita", label: "67" },
          { source: "ita", label: "67.2" },
          { source: "ita", label: "67.3" },
        ],
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-67.3.html",
        // Read from the statute store on 2026-09-13 (who read it wasn't recorded; `verification` keeps that check);
        // the maintainer read the page in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        verification: { status: "supported", method: "Provision text read from the consolidated Act in corpus.db (2026-09-13): the 67.2 / 67.3 caps and their A × B / 30 formula. The amounts in the entry text are the ones Income Tax Regulations s.7307 prescribe (the next source), which that reading didn't cover." },
        note: "Read from the consolidated Act (the maintainers' statute store). Proportionality rests on 18(1)(a) 'to the extent... for the purpose of gaining or producing income'; 67 requires reasonableness. 67.2 limits interest and 67.3 limits lease charges; the Act's own figures, $250 and $600, each stand 'or such other amount as may be prescribed', and the amounts prescribed are in Income Tax Regulations s.7307 (the next source).",
      },
      {
        title: "Income Tax Regulations s.7307 — the amounts prescribed for the interest and lease caps (ss.67.2, 67.3)",
        corpus: [
          { source: "itr", label: "7307", sub: "(2)" },
          { source: "itr", label: "7307", sub: "(3)" },
        ],
        authority: "federal",
        jurisdiction: "CA",
        // Added 2026-10-23 (the maintainer's reading list, item writeoff-vehicle/interest-and-lease-caps): a tool
        // found these words on the consolidated Regulations' page that day (option B), and the maintainer read it in
        // full on 2026-10-25.
        url: "https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._945/section-7307.html",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-23",
          quotes: [
            "For the purpose of the description of A in section 67.2 of the Act, the amount prescribed in respect of an automobile that is acquired",
            "or after 2000 and before 2024, is $300; and",
            "after 2023, is $350.",
            "For the purpose of the description of A in paragraph 67.3(c) of the Act, the amount prescribed in respect of a taxation year of a lessee is",
            "for leases entered into after 2024, $1,100, and",
            "is the sum of the federal and provincial sales taxes that would have been payable on a monthly payment under the lease",
          ],
        },
        note: "The consolidated Income Tax Regulations: s.7307(2) prescribes the interest amount for s.67.2 of the Act by when the car was acquired, s.7307(3) the lease amount for s.67.3 by when the lease was entered into, plus sales tax.",
      },
      {
        title: "Motor vehicle expenses",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/report-business-income-expenses/business-expenses/motor-vehicle-expenses.html,
        // read 2026-06-08) answered 404 on 2026-10-13; a tool found this sentence on the new page that day, and the
        // maintainer read it in full on 2026-10-25.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses/motor-vehicle-expenses.html",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: ["You can deduct expenses you incur to run a motor vehicle you use to earn business income."],
        },
        note: "CRA motor vehicle expense rules.",
      },
    ],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Trades", "Consulting", "Hospitality"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "writeoff-cca-class-50",
    label: "CCA Class 50 — computer equipment",
    description:
      "Computer hardware and systems software depreciated under Class 50 (normally 55% declining balance). New additions acquired after April 15, 2024 and available for use before 2027 may qualify for an enhanced 100% first-year deduction.",
    eligibility:
      "Equipment acquired to earn business income; available for sole props and corporations. Enhanced first-year treatment has acquisition and available-for-use date conditions.",
    lensAnnotations: {
      tax: "If GPUs, workstations, or servers support the venture, Class 50 CCA may unlock accelerated write-off of hardware. A deduction returns roughly your marginal tax rate at filing, not the purchase price.",
      legal: "If equipment is financed or leased, contract terms affect ownership and deductibility.",
    },
    citations: [
      {
        title: "Income Tax Act s.20(1)(a) — capital cost allowance, 'as is allowed by regulation'",
        corpus: [{ source: "ita", label: "20", sub: "(1)(a)" }],
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-20.html",
        lastVerified: "2026-09-13",
        verification: { status: "supported", method: "s.20(1)(a) read from corpus.db (2026-09-13): the Act allows CCA 'as is allowed by regulation' and delegates classes, rates and the first-year rule to the Income Tax Regulations. The Regulations are now in the corpus (S2.5.2g) and resolve every delegated figure — see the next citation." },
        note: "Read from the consolidated Act (the maintainers' statute store). The Act authorizes CCA and delegates classes, rates and the enhanced first-year rule to the Income Tax Regulations (Schedule II, Reg. 1100). Those were ingested 2026-09-13 and the delegated figures are verified there.",
      },
      {
        title: "Income Tax Regulations Sch. II Class 50; s.1100(1)(a)(xxxvi); s.1100(2)(c.3) — class definition, 55% rate, 2024-04-15 → before-2027 first-year factor",
        corpus: [
          { source: "itr", label: "Sch. II Class 50" },
          { source: "itr", label: "1100", sub: "(1)(a)(xxxvi)" },
          { source: "itr", label: "1100", sub: "(2)(c.3)" },
        ],
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._945/section-1100.html",
        lastVerified: "2026-09-13",
        verification: { status: "confirmed", method: "Read verbatim from corpus.db (Regulations current to 2026-06-21). Sch. II Class 50: 'general-purpose electronic data processing equipment and systems software for that equipment'. s.1100(1)(a)(xxxvi): 'of Class 50, 55 per cent'. s.1100(2)(c.3): 'if the class is Class 50, (i) 9/11, for property that was acquired and became available for use by the taxpayer after April 15, 2024 and before 2027, and (ii) nil … after 2026'. The 100% first year is arithmetic on that factor: 0.55 × (1 + 9/11) = 1.00." },
        // "the time-boxed first-year factor" until 2026-10-24: a time word of DotAmi's own, drawn in the cockpit's
        // Export panel (the playbook's markdown, lib/playbook/render-markdown.ts "Note:"). The factor has an end
        // date, as the map's legend says.
        note: "The delegate the Act points to. Class definition, declining-balance rate and the first-year factor with its end date all read from the Regulations' own text with its currency date — the numbers are the provision's words, not a stored rate.",
      },
      {
        title: "Classes of depreciable property",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/business-expenses/capital-cost-allowance/classes-depreciable-property.html,
        // read 2026-06-08) answered 404 on 2026-10-13; a tool found these words on the new page that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/classes-depreciable-property.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "Include in Class 50 with a CCA rate of 55% property acquired after March 18, 2007",
            "general-purpose electronic data processing equipment and systems software for that equipment",
          ],
        },
        note: "CRA CCA class listing including Class 50.",
      },
      {
        title: "T4002 Chapter 4 — Capital cost allowance (immediate expensing measures)",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html",
        // Read on 2026-07-02 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        note: "Class 50 enhanced 100% first-year deduction for property acquired after 2024-04-15 and available for use before 2027.",
      },
    ],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D", "Content / streaming"],
    ccaClass: "50",
    decliningBalanceRate: 0.55,
    firstYearIncentive: {
      rate: 1,
      acquiredAfter: "2024-04-15",
      availableForUseBefore: "2027-01-01",
      note: "If the equipment is acquired and in use before 2027, the enhanced 100% first-year deduction may apply — confirm exact eligibility and timing with an accountant before relying on it.",
    },
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "writeoff-meals",
    label: "Meals and entertainment (50% rule)",
    description:
      "Business meals and entertainment generally limited to 50% deductibility.",
    eligibility:
      "Expense incurred to earn income; reasonable and documented; subject to 50% limitation.",
    lensAnnotations: {
      tax: "If client meetings include meals, 50% of eligible amounts may be deductible — not the full bill.",
      legal: "If receipts lack business purpose documentation, claims may be challenged on audit.",
    },
    citations: [
      {
        title: "Income Tax Act s.67.1(1) — Expenses for food, etc.",
        corpus: [{ source: "ita", label: "67.1", sub: "(1)" }],
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-67.1.html",
        lastVerified: "2026-09-13",
        verification: { status: "confirmed", method: "Provision text read verbatim from the consolidated Act in corpus.db (2026-09-13): 'deemed to be 50 per cent'." },
        note: "CONFIRMED verbatim from the consolidated Act (the maintainers' statute store; last amended 2013-12-12): an amount for food, beverages or entertainment 'is deemed to be 50 per cent of the lesser of (a) the amount actually paid or payable... and (b) an amount... that would be reasonable in the circumstances.' Exceptions exist (e.g. 67.1(1.1) long-haul truck drivers).",
      },
      {
        title: "Meals and entertainment expenses",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/business-expenses/meals-entertainment-expenses.html, read 2026-06-08)
        // answered 404 on 2026-10-13. The rule is now a section of the CRA's Business expenses page; a
        // tool found this sentence there that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses.html#mealsandentertainmentallowablepartonly",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: ["The maximum amount you can claim for food, beverages and entertainment expenses is 50% of the lesser of the following amounts"],
        },
        note: "CRA 50% meals and entertainment rule.",
      },
    ],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Consulting", "Hospitality"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "writeoff-rd",
    label: "R&D and SR&ED-eligible expenditures",
    description:
      "Salaries, materials, and contract payments for eligible SR&ED work — may qualify for enhanced credits.",
    eligibility:
      "Work meets SR&ED eligibility criteria; contemporaneous project records maintained.",
    lensAnnotations: {
      tax: "If experimentation resolves technological uncertainty, R&D spend may unlock SR&ED credits beyond ordinary deductions.",
      legal: "Contractor SR&ED agreements should clarify IP and work-for-hire terms.",
    },
    citations: [
      {
        title: "Income Tax Act s.37(1), s.127, s.248(1) — SR&ED deduction, investment tax credit, and definition",
        corpus: [
          { source: "ita", label: "37", sub: "(1)" },
          { source: "ita", label: "127" },
          { source: "ita", label: "248", sub: "(1)" },
        ],
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-37.html",
        lastVerified: "2026-09-13",
        verification: { status: "confirmed", method: "Provision text read verbatim from the consolidated Act in corpus.db (2026-09-13); the 248(1) definition expressly includes computer programming in support." },
        note: "CONFIRMED from the consolidated Act (the maintainers' statute store; s.37 and s.248 last amended 2026-03-26). 37(1) permits deducting current expenditures on SR&ED 'related to a business of the taxpayer, carried on in Canada and directly undertaken'. 248(1) defines SR&ED as 'systematic investigation or search... by means of experiment or analysis' and expressly includes computer programming where 'commensurate with the needs, and directly in support' of the qualifying work. The credit lives in s.127. Note the definition requires technological ADVANCEMENT, not just novelty.",
      },
      {
        title: "SR&ED expenditures",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/scientific-research-experimental-development-tax-incentive/claim-sred-expenditures.html,
        // read 2026-06-08) answered 404 on 2026-10-13; a tool found these words on the new page that day, and the
        // maintainer read it in full on 2026-10-25.
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-claim.html",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: ["determine which expenditures may be allowable (salary or wages, materials, contracts, overhead, and third-party payments)"],
        },
        note: "CRA SR&ED expenditure claim guidance.",
      },
    ],
    structures: ["sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "AI / ML / R&D", "Manufacturing"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "writeoff-capital-equipment",
    label: "Capital equipment (tools, machinery)",
    description:
      "Depreciable capital property — tools, machinery, furniture — claimed via CCA over time.",
    eligibility:
      "Property acquired for business use; correct CCA class applied; available for relevant structures.",
    lensAnnotations: {
      tax: "If the venture requires durable tools or shop equipment, CCA may spread deductions over the asset life.",
      legal: "If equipment is leased, ownership and buyout terms affect CCA eligibility.",
    },
    citations: [
      {
        title: "Income Tax Act s.20(1)(a) — capital cost allowance, 'as is allowed by regulation'",
        corpus: [{ source: "ita", label: "20", sub: "(1)(a)" }],
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-20.html",
        lastVerified: "2026-09-13",
        verification: { status: "supported", method: "s.20(1)(a) read from corpus.db (2026-09-13): CCA 'as is allowed by regulation' — the class and rate are delegated to the Income Tax Regulations, now in the corpus (S2.5.2g); see the next citation." },
        note: "Read from the consolidated Act (the maintainers' statute store). The Act authorizes CCA; the class ('8') and its rate live in the Income Tax Regulations (Schedule II, Reg. 1100), ingested 2026-09-13 and verified there.",
      },
      {
        title: "Income Tax Regulations Sch. II Class 8; s.1100(1)(a)(viii) — class definition and 20% rate",
        corpus: [
          { source: "itr", label: "Sch. II Class 8" },
          { source: "itr", label: "1100", sub: "(1)(a)(viii)" },
        ],
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._945/section-1100.html",
        lastVerified: "2026-09-13",
        verification: { status: "confirmed", method: "Read verbatim from corpus.db (Regulations current to 2026-06-21). Sch. II heading 'CLASS 8 (20 per cent)'; definition begins 'Property not included in Class 1, 2, 7, 9, 11, 17, 30, 57 or 58 that is (a) a structure that is manufacturing or processing machinery or equipment; (b) tangible property attached to a building …'. s.1100(1)(a)(viii): 'of Class 8, 20 per cent'." },
        note: "The delegate the Act points to. Class 8 is the residual class for machinery and equipment not placed elsewhere; the 20% rate is the provision's own text with its currency date.",
      },
      {
        title: "Claiming capital cost allowance (CCA)",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/business-expenses/capital-cost-allowance.html, read 2026-06-08)
        // answered 404 on 2026-10-13; a tool found these words on the new page that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: ["you can deduct their cost over a period of several years", "This yearly deduction is called a capital cost allowance (CCA)"],
        },
        note: "CRA CCA overview.",
      },
    ],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Trades", "Manufacturing", "Woodworking"],
    ccaClass: "8",
    provinces: ["AB", "BC", "ON", "CA"],
  },
  {
    id: "writeoff-saas-tools",
    label: "Software subscriptions (current expense)",
    description:
      "SaaS tools, cloud hosting, and software subscriptions used to earn business income.",
    eligibility:
      "Expense incurred in the year to earn income; business-use portion documented.",
    lensAnnotations: {
      tax: "If the venture runs on cloud and SaaS stack, subscriptions may be fully deductible as current expenses.",
      legal: "If software licenses restrict commercial use, terms may affect business legitimacy.",
    },
    citations: [
      {
        title: "Income Tax Act s.9(1), s.18(1)(a), s.18(1)(b) — profit, purpose test, and the capital-outlay bar",
        corpus: [
          { source: "ita", label: "9", sub: "(1)" },
          { source: "ita", label: "18", sub: "(1)(a)" },
          { source: "ita", label: "18", sub: "(1)(b)" },
        ],
        authority: "federal",
        jurisdiction: "CA",
        url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-18.html",
        lastVerified: "2026-09-13",
        verification: { status: "supported", method: "Provision text read from the consolidated Act in corpus.db (2026-09-13); the current-vs-capital distinction the entry relies on is 18(1)(b)." },
        note: "SUPPORTED, read from the consolidated Act (the maintainers' statute store). Income is 'profit' (9(1)); an outlay is deductible 'to the extent... for the purpose of gaining or producing income' (18(1)(a)) but NOT if it is 'an outlay... on account of capital' (18(1)(b)). The load-bearing distinction is current vs capital: recurring subscriptions are current; a perpetual licence or purchased software is capital and goes through CCA instead.",
      },
      {
        title: "Business expenses",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/report-business-income-expenses/business-expenses.html, read
        // 2026-06-08) answered 404 on 2026-10-13; a tool found these words on the new page that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "You cannot claim expenses you incur to buy capital property.",
            "as a rule, you can deduct any reasonable current expense you incur to earn income.",
          ],
        },
        note: "CRA general business expense deductibility.",
      },
    ],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "Consulting", "Content / streaming"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
] satisfies WriteOffCategory[];

export type WriteOffCategoryId = (typeof writeOffCategoriesV2026)[number]["id"];
