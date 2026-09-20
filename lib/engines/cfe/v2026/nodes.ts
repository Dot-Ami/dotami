import type { CFENode } from "./types";

const LAST_VERIFIED = "2026-05-01";

export const cfeNodesV2026 = [
  {
    id: "stage-0-employee-apprentice-baseline",
    label: "Employee/Apprentice baseline",
    stage: "stage-0",
    trigger:
      "Employment or apprenticeship income exists before the venture has taxable business activity.",
    description:
      "This baseline keeps employment income separate from venture activity. If the venture is still exploratory, this stage frames the starting point: personal employment income continues, and business obligations unlock only when commercial activity starts.",
    taxImpact:
      "Employment income remains reported through the normal personal tax path. Venture income, expenses, GST/HST, and payroll obligations are not active until business activity begins.",
    lensAnnotations: {
      tax: "If the venture is not yet carrying on business, this unlocks a clean baseline for comparing future sole-prop income against existing T4 employment income.",
      legal:
        "If no customers, contracts, or business name are active yet, this stage keeps the venture in planning mode rather than treating it as an operating business.",
    },
    citations: [
      {
        title: "Employees",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/income/employment-self-employment-income/employment-income.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance for reporting employment income on an individual tax return.",
      },
      {
        title: "Sole proprietorship",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA framing for when income is reported as self-employed business income.",
      },
    ],
    financialImpact: {
      summary:
        "Baseline cash flow is employment-driven; venture projection starts at $0 until commercial activity is activated.",
      projectionNotes: [
        "Use this node as the comparison anchor for after-tax venture income.",
        "No GST/HST or payroll program accounts are active from this node alone.",
      ],
      estimates: [
        {
          label: "Venture revenue",
          value: "$0",
          basis: "Planning baseline before commercial activity.",
        },
      ],
    },
    branches: ["stage-1-sole-prop-activation"],
  },
  {
    id: "stage-1-sole-prop-activation",
    label: "Sole Prop activation",
    stage: "stage-1",
    trigger:
      "First real commercial activity: paid customer, invoice, recurring offer, or business expenses incurred to earn income.",
    description:
      "Sole proprietorship is the simplest operating structure for a solo Canadian venture. If the venture starts earning income, this unlocks business income reporting, expense tracking, record retention, and possible CRA program accounts when thresholds or activities require them.",
    taxImpact:
      "Net business income flows to the owner personally. Eligible business expenses reduce net income. A CRA business number may become relevant when GST/HST, payroll, import/export, or corporation program accounts are needed.",
    lensAnnotations: {
      tax: "If paid work begins, this unlocks business income and expense tracking without creating a corporation.",
      legal:
        "If operating under a trade name or provincial registration rules apply, this unlocks business-name registration checks while personal liability remains with the proprietor.",
    },
    citations: [
      {
        title: "Sole proprietorship",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on sole proprietors reporting business income and related obligations.",
      },
      {
        title: "Business registration with the CRA",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/services/taxes/business-registration.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA business registration entry point for business numbers and program accounts.",
      },
    ],
    financialImpact: {
      summary:
        "Revenue and expenses start flowing through the personal tax return as self-employment business income.",
      projectionNotes: [
        "Track gross revenue against the $30,000 GST/HST small supplier threshold.",
        "Track expenses from the first business activity because later GST/HST registration may affect ITC planning.",
      ],
      estimates: [
        {
          label: "Structure cost",
          value: "Low",
          basis: "No corporation setup is required for the base sole-prop path.",
        },
      ],
    },
    branches: [
      "stage-2a-voluntary-gst-registration",
      "stage-2b-mandatory-gst-registration",
      "branch-hire-first-employee",
      "branch-service-vs-productize",
    ],
  },
  {
    id: "stage-2a-voluntary-gst-registration",
    label: "Voluntary GST registration",
    stage: "stage-2a",
    trigger:
      "Taxable supplies remain at or below $30,000, but the venture wants GST/HST registration for input tax credit strategy or B2B credibility.",
    description:
      "A small supplier can register voluntarily for GST/HST if carrying on commercial activity in Canada. If the venture registers before the mandatory threshold, this unlocks GST/HST collection, filing obligations, and input tax credit recovery on eligible business purchases.",
    taxImpact:
      "Registration creates a requirement to charge, collect, remit, and file GST/HST returns. It can also unlock ITCs for GST/HST paid on eligible inputs used in commercial activity.",
    lensAnnotations: {
      tax: "If customers are mostly GST/HST registrant businesses and startup inputs are material, this unlocks earlier ITC recovery while adding filing discipline.",
      legal:
        "If registration is voluntary, this unlocks ongoing registrant obligations even before the $30,000 mandatory threshold is crossed.",
    },
    citations: [
      {
        title: "Register voluntarily for a GST/HST account",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/account-register-voluntarily.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on voluntary GST/HST registration and registrant obligations.",
      },
      {
        title: "Input tax credits",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/calculate-prepare-report/input-tax-credit.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on claiming ITCs for eligible GST/HST paid or payable.",
      },
    ],
    financialImpact: {
      summary:
        "Cash flow changes because GST/HST collected is not revenue, while eligible GST/HST paid on inputs may be recoverable through ITCs.",
      projectionNotes: [
        "For B2B work, charging GST/HST may be neutral to customers who can claim ITCs.",
        "For consumer work, the same registration can raise visible customer price unless base pricing absorbs the tax.",
      ],
      estimates: [
        {
          label: "GST/HST threshold",
          value: "$30,000",
          basis:
            "Small supplier threshold measured against taxable supplies in a calendar quarter or four consecutive calendar quarters.",
        },
      ],
    },
    branches: ["stage-3a-incorporation-80k-net", "stage-3b-incorporation-liability-sred"],
  },
  {
    id: "stage-2b-mandatory-gst-registration",
    label: "Mandatory GST registration",
    stage: "stage-2b",
    trigger:
      "Taxable supplies exceed $30,000 in a single calendar quarter or over four consecutive calendar quarters.",
    description:
      "When the venture stops being a small supplier, GST/HST registration becomes a compliance gate. If the $30,000 rolling threshold is crossed, this unlocks mandatory registration timing, charging GST/HST, filing returns, and remittance planning.",
    taxImpact:
      "GST/HST becomes a trust-style cash flow obligation: collect from customers, claim eligible ITCs, file returns, and remit net tax by CRA deadlines.",
    lensAnnotations: {
      tax: "If rolling taxable supplies approach $30,000, this unlocks threshold monitoring and avoids surprise remittance exposure.",
      legal:
        "If the threshold is crossed, this unlocks a compliance obligation rather than an optional optimization choice.",
    },
    citations: [
      {
        title: "When to register for and start charging the GST/HST",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on small supplier status, mandatory registration, and timing.",
      },
      {
        title: "Small suppliers",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/2-2/small-suppliers.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA memorandum defining small supplier thresholds and calculations.",
      },
    ],
    financialImpact: {
      summary:
        "The venture needs to model GST/HST separately from revenue once mandatory registration is active.",
      projectionNotes: [
        "Set aside collected GST/HST instead of treating it as operating cash.",
        "Use eligible ITCs to reduce net remittance where documentation supports the claim.",
      ],
      estimates: [
        {
          label: "Mandatory registration trigger",
          value: "> $30,000",
          basis:
            "Taxable supplies in one calendar quarter or over the previous four consecutive calendar quarters.",
        },
      ],
    },
    branches: ["stage-3a-incorporation-80k-net", "stage-3b-incorporation-liability-sred"],
  },
  {
    id: "stage-3a-incorporation-80k-net",
    label: "Incorporation at $80K net",
    stage: "stage-3a",
    trigger:
      "Projected net business income reaches roughly $80,000 and retained earnings, tax deferral, or reinvestment becomes material.",
    description:
      "Incorporation creates a separate legal taxpayer. If net income is high enough to leave money inside the business after owner cash needs, this unlocks CCPC planning, small business deduction modeling, corporate filings, and salary/dividend tradeoff analysis.",
    taxImpact:
      "Active business income earned by a qualifying CCPC may access the small business deduction up to the business limit, changing tax timing and reinvestment capacity compared with sole-prop income taxed personally.",
    lensAnnotations: {
      tax: "If the owner does not need to withdraw all profit personally, this unlocks corporate tax deferral and SBD modeling.",
      legal:
        "If contracts, assets, or retained earnings are growing, this unlocks separate legal entity planning while adding corporate maintenance obligations.",
    },
    citations: [
      {
        title: "Corporation",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/corporation.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA overview of corporations as separate legal entities and tax filers.",
      },
      {
        title: "T2 Corporation Income Tax Guide - Small business deduction",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on the small business deduction and business limit.",
      },
    ],
    financialImpact: {
      summary:
        "At higher net income, incorporation may shift timing: some earnings can be taxed corporately and retained for reinvestment instead of all profit being taxed personally each year.",
      projectionNotes: [
        "Model owner cash needs before treating incorporation as useful.",
        "Include recurring corporation filing, bookkeeping, and professional costs in the comparison.",
      ],
      estimates: [
        {
          label: "Planning trigger",
          value: "~$80,000 net income",
          basis:
            "DotAmi v0 heuristic from the PRD, used as a modeling trigger rather than a statutory threshold.",
        },
        {
          label: "Federal SBD business limit",
          value: "$500,000",
          basis: "CRA T2 guide business limit for qualifying CCPC active business income.",
        },
      ],
    },
    branches: [
      "branch-hire-first-employee",
      "branch-service-vs-productize",
      "stage-4-retained-earnings-planning",
    ],
  },
  {
    id: "stage-3b-incorporation-liability-sred",
    label: "Incorporation for liability/SR&ED",
    stage: "stage-3b",
    trigger:
      "Liability exposure, enterprise contracts, external funding, or SR&ED-style product development becomes more important than the $80K net-income heuristic.",
    description:
      "Some ventures incorporate before the income threshold because the structure itself matters. If risk, contracting, IP ownership, or SR&ED eligibility becomes central, this unlocks corporation planning even when pure tax deferral is not yet the main driver.",
    taxImpact:
      "A CCPC structure can affect SR&ED investment tax credit access and corporate tax planning. The benefit depends on eligibility, associated corporations, expenditures, and whether the activity meets SR&ED criteria.",
    lensAnnotations: {
      tax: "If experimental product development is real and documented, this unlocks SR&ED eligibility analysis inside a CCPC model.",
      legal:
        "If liability or IP ownership is the trigger, this unlocks entity separation, contract readiness, and director/shareholder obligation checks.",
    },
    citations: [
      {
        title: "How certain relationships affect the small business deduction and SR&ED investment tax credits",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/business-tax-credits/how-relationships-affect-small-business-deduction-sred-investment-tax-credits.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on CCPC relationships, SBD, and SR&ED investment tax credits.",
      },
      {
        title: "Federal incorporation",
        authority: "federal",
        jurisdiction: "CA",
        url: "https://ised-isde.canada.ca/site/corporations-canada/en/federal-incorporation",
        lastVerified: LAST_VERIFIED,
        note: "Corporations Canada guidance on federal incorporation.",
      },
    ],
    financialImpact: {
      summary:
        "The financial case may come from risk containment, contract access, IP ownership, or SR&ED treatment rather than immediate tax savings.",
      projectionNotes: [
        "Model added corporate maintenance costs even if liability or SR&ED is the primary trigger.",
        "Track R&D activity contemporaneously if SR&ED may become relevant later.",
      ],
      estimates: [
        {
          label: "Enhanced SR&ED ITC reference",
          value: "35%",
          basis:
            "CRA guidance describes enhanced SR&ED ITC access for certain CCPCs subject to limits and relationships.",
        },
      ],
    },
    branches: [
      "branch-service-vs-productize",
      "branch-hire-first-employee",
      "stage-4-sred-deepening",
    ],
  },
  {
    id: "branch-hire-first-employee",
    label: "Hire first employee",
    stage: "branch",
    trigger:
      "The venture needs labour beyond the owner: employee schedule, payroll, supervision, or repeatable delivery capacity.",
    description:
      "Hiring the first employee changes the venture from solo execution to employer operations. If this branch is active, it unlocks payroll account setup, source deduction remittances, employment standards, workers compensation checks, and people-process overhead.",
    taxImpact:
      "Payroll creates employer remittance obligations for source deductions and employer contributions. Wages may be deductible business expenses when incurred to earn income, subject to normal documentation and reasonableness.",
    lensAnnotations: {
      tax: "If labour capacity is the bottleneck, this unlocks deductible payroll cost modeling plus CPP/EI/source deduction remittance planning.",
      legal:
        "If the worker is an employee rather than a contractor, this unlocks employment standards, payroll records, and provincial employer obligations.",
    },
    citations: [
      {
        title: "Set up and manage employee payroll information",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/set-up-new-employee.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance for setting up payroll information for a new employee.",
      },
      {
        title: "Determine if you need to register for a payroll account",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/open-manage-payroll-account/determine-need-register.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on when an employer needs a payroll program account.",
      },
      {
        title: "Small business - Your guide to the Employment Standards Act",
        authority: "provincial",
        jurisdiction: "ON",
        url: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/small-business",
        lastVerified: LAST_VERIFIED,
        note: "Ontario employment standards reference for small businesses.",
      },
      {
        title: "Employment standards",
        authority: "provincial",
        jurisdiction: "BC",
        url: "https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards",
        lastVerified: LAST_VERIFIED,
        note: "BC employment standards reference for employers and workers.",
      },
    ],
    financialImpact: {
      summary:
        "Hiring can raise delivery capacity but adds payroll remittances, admin time, compliance exposure, and fixed labour cost.",
      projectionNotes: [
        "Compare incremental revenue from capacity against wage, employer contribution, insurance, and admin load.",
        "Keep employee records separate from contractor/vendor records.",
      ],
      estimates: [
        {
          label: "Payroll account timing",
          value: "Before first remittance due date",
          basis: "CRA payroll registration guidance.",
        },
      ],
    },
    branches: ["stage-3a-incorporation-80k-net", "stage-3b-incorporation-liability-sred"],
  },
  {
    id: "branch-service-vs-productize",
    label: "Service vs. productize",
    stage: "branch",
    trigger:
      "The venture can keep selling custom labour or turn repeated delivery into a packaged product, template, SaaS, course, or repeatable offer.",
    description:
      "This branch compares a capacity-constrained service path against a productized path. If productization is active, it unlocks margin and scale modeling, IP ownership checks, different GST/HST customer impacts, and more emphasis on documentation and support obligations.",
    taxImpact:
      "Service and productized revenue can both be taxable business income, but the cost structure, GST/HST customer mix, eligible expenses, and IP/R&D profile can differ materially.",
    lensAnnotations: {
      tax: "If delivery becomes repeatable, this unlocks margin comparison between labour-heavy revenue and productized revenue with different input costs.",
      legal:
        "If IP or reusable assets become the offer, this unlocks ownership, licensing, customer terms, and support-liability checks.",
    },
    citations: [
      {
        title: "Keeping records",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on keeping business records for income, expenses, and tax obligations.",
      },
      {
        title: "Input tax credits",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/calculate-prepare-report/input-tax-credit.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA ITC guidance relevant to differing input profiles across service and productized paths.",
      },
      {
        title: "Register a business name",
        authority: "provincial",
        jurisdiction: "AB",
        url: "https://www.alberta.ca/register-business-name",
        lastVerified: LAST_VERIFIED,
        note: "Alberta business-name registration reference for operating names and structure checks.",
      },
    ],
    financialImpact: {
      summary:
        "Productization can lower marginal delivery cost over time but adds upfront build, support, maintenance, and IP/commercial terms work.",
      projectionNotes: [
        "Model service revenue as capacity-limited by owner or employee time.",
        "Model productized revenue with upfront build cost, lower marginal delivery cost, and support burden.",
      ],
      estimates: [
        {
          label: "Decision surface",
          value: "Margin vs. capacity",
          basis:
            "DotAmi v0 branch heuristic; exact projections depend on venture profile and active scenario state.",
        },
      ],
    },
    branches: ["stage-3a-incorporation-80k-net", "stage-3b-incorporation-liability-sred"],
  },
  {
    id: "stage-4-retained-earnings-planning",
    label: "Retained earnings planning",
    stage: "stage-4",
    trigger:
      "CCPC generates surplus beyond owner salary/dividend needs; reinvestment or extraction timing becomes a planning surface.",
    description:
      "Once a corporation earns more than the owner extracts personally, retained earnings accumulate inside the company. If surplus builds, this unlocks dividend timing, salary vs. dividend mix, GRIP/LRIP, and potential Holdco planning.",
    taxImpact:
      "Corporate tax paid on retained income. Personal tax applies when dividends or salary are extracted. Integration rules affect total tax on distributed earnings.",
    lensAnnotations: {
      tax: "If earnings stay in the corporation, deferral may apply — extraction timing becomes the planning lever.",
      legal:
        "If multiple shareholders exist, dividend policy and shareholder agreements may govern distribution rights.",
    },
    citations: [
      {
        title: "Paying dividends",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-income-tax/returns/completing-your-corporation-income-tax-t2-return/line-4600-dividends-received.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA dividend reporting and corporate distribution framing.",
      },
      {
        title: "Salary or dividends",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-income-tax/returns/completing-your-corporation-income-tax-t2-return/line-4600-dividends-received.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA guidance on compensation extraction from a corporation.",
      },
    ],
    financialImpact: {
      summary:
        "Retained earnings can fund growth without immediate personal tax — but extraction eventually triggers personal tax.",
      projectionNotes: [
        "Model owner cash needs separately from corporate surplus.",
        "Include corporate compliance costs in retained-earnings scenarios.",
      ],
      estimates: [
        {
          label: "Planning surface",
          value: "Salary vs. dividend mix",
          basis: "Common CCPC owner extraction planning.",
        },
      ],
    },
    branches: [],
  },
  {
    id: "stage-4-sred-deepening",
    label: "SR&ED deepening",
    stage: "stage-4",
    trigger:
      "R&D activity is systematic and documented; SR&ED claim preparation becomes a recurring annual process.",
    description:
      "Beyond initial incorporation for SR&ED access, mature ventures maintain contemporaneous project records, time tracking, and expenditure allocation. If R&D is core to the venture, this unlocks annual SR&ED claim workflows and potential IRAP stacking.",
    taxImpact:
      "Eligible SR&ED expenditures generate ITCs and deductions. Enhanced rates for CCPCs subject to taxable income limits. Provincial top-ups may apply in some jurisdictions.",
    lensAnnotations: {
      tax: "If experimentation is ongoing, annual SR&ED documentation may unlock recurring credits — with audit-ready records.",
      legal:
        "If contractors perform R&D, agreements should clarify IP ownership and eligible work allocation.",
    },
    citations: [
      {
        title: "SR&ED claim preparation",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive/claim-sred-expenditures.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA SR&ED claim preparation guidance.",
      },
      {
        title: "SR&ED glossary",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive/glossary.html",
        lastVerified: LAST_VERIFIED,
        note: "CRA SR&ED terminology and eligibility concepts.",
      },
    ],
    financialImpact: {
      summary:
        "Recurring SR&ED claims can materially offset R&D spend — documentation quality drives audit resilience.",
      projectionNotes: [
        "Track project hypotheses, experiments, and results contemporaneously.",
        "Separate SR&ED-eligible work from routine development.",
      ],
      estimates: [
        {
          label: "Enhanced ITC reference",
          value: "35%",
          basis: "CRA enhanced SR&ED ITC rate for qualifying CCPCs.",
        },
      ],
    },
    branches: [],
  },
] satisfies CFENode[];

export type CFENodeId = (typeof cfeNodesV2026)[number]["id"];
