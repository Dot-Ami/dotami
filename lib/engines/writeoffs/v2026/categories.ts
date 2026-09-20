import type { WriteOffCategory } from "./types";

const LAST_VERIFIED = "2026-06-08";

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
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses/business-use-home-expenses.html",
        lastVerified: LAST_VERIFIED,
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
      "Logbook or reasonable basis for business-use percentage; personal use portion not deductible. Two statutory caps apply to passenger vehicles regardless of business use: loan interest is limited to a prescribed daily amount ($250 per 30 days in the Act), and lease costs to a prescribed monthly amount ($600 per 30 days in the Act) — both 'or such other amount as may be prescribed', so confirm the current figure.",
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
        lastVerified: "2026-09-13",
        verification: { status: "supported", method: "Provision text read from the consolidated Act in corpus.db (2026-09-13); the 67.2 / 67.3 caps the reading found are now in the entry text." },
        note: "Read from the consolidated Act (the maintainers' statute store). Proportionality rests on 18(1)(a) 'to the extent... for the purpose of gaining or producing income'; 67 requires reasonableness. The earlier text mentioned lease costs without the caps: 67.2 limits interest ($250/30 days) and 67.3 limits lease charges ($600/30 days), each 'or such other amount as may be prescribed'.",
      },
      {
        title: "Motor vehicle expenses",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses/motor-vehicle-expenses.html",
        lastVerified: LAST_VERIFIED,
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
        note: "The delegate the Act points to. Class definition, declining-balance rate and the time-boxed first-year factor all read from the Regulations' own text with its currency date — the numbers are the provision's words, not a stored rate.",
      },
      {
        title: "Classes of depreciable property",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses/capital-cost-allowance/classes-depreciable-property.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA CCA class listing including Class 50.",
      },
      {
        title: "T4002 Chapter 4 — Capital cost allowance (immediate expensing measures)",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html",
        lastVerified: "2026-07-02",
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
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses/meals-entertainment-expenses.html",
        lastVerified: LAST_VERIFIED,
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
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive/claim-sred-expenditures.html",
        lastVerified: LAST_VERIFIED,
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
        title: "Capital cost allowance (CCA)",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses/capital-cost-allowance.html",
        lastVerified: LAST_VERIFIED,
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
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/business-expenses.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA general business expense deductibility.",
      },
    ],
    structures: ["sole-prop", "sole-prop-gst", "ccpc"],
    activityTags: ["Software / SaaS", "Consulting", "Content / streaming"],
    provinces: ["AB", "BC", "ON", "CA"],
  },
] satisfies WriteOffCategory[];

export type WriteOffCategoryId = (typeof writeOffCategoriesV2026)[number]["id"];
