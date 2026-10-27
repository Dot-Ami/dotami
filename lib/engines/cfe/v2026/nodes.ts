import {
  CRA_NOT_COUNTED,
  CRA_SMALL_SUPPLIER_TESTS,
  CRA_SOLE_PROPRIETOR_COUNTS,
  CRA_VOLUNTARY_REGISTRATION,
  CRA_WHEN_TO_REGISTER_TOOL_CHECK,
  CRA_WHEN_TO_REGISTER_URL,
} from "@/lib/engines/compliance/v2026/gst-official-words";
import { SRED_PAGES, SRED_QUOTES_FOUND_ON, SRED_WORDS } from "@/lib/engines/grants/v2026/sred-official-words";
import { MAINTAINER_READ_ON } from "@/lib/engines/shared/maintainer-reads";

import type { CFENode } from "./types";

/**
 * The day the stages' first sources were read, by someone nobody recorded. A source the maintainer read in full on
 * 2026-10-25 says MAINTAINER_READ_ON and `readBy: "person"` instead (docs/engines/citations.md, § The maintainer's
 * reads of 2026-10-25), and its comment says when it was read before.
 */
const LAST_VERIFIED = "2026-05-01";

/**
 * The day the maintainer's reading list fetched the pages behind its items and, with the repo's matcher (the
 * same whole-word, one-block match as scripts/check-quotes.mjs), found on them the words Incorporating and Hire
 * first employee now quote (the two SR&ED stages' 35% is SRED_QUOTES_FOUND_ON, the same day). Each is kept as a
 * tool check of that day on the stage the list checked, and on no other citation of the page (his answer of
 * 2026-10-24). A networked `node scripts/check-quotes.mjs` run should find each again before merge
 * (docs/engines/citations.md, § The reading list's tool checks). Each of these pages was then read in full by the
 * maintainer on 2026-10-25, and the read wins on screen; the tool checks stay.
 */
const READING_LIST_FOUND_ON = "2026-10-23";

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
        title: "Line 10100 – Employment income",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/completing-a-tax-return/income/employment-self-employment-income/employment-income.html,
        // read 2026-05-01) answered 404 on 2026-10-13; a tool found these words on the CRA's line 10100
        // page that day.
        url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-10100-employment-income.html",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "Employment income consists of amounts that you receive as salary, wages, commissions",
            "Employment income is usually shown in box 14 of your T4 slip.",
          ],
        },
        note: "CRA guidance for reporting employment income on an individual tax return.",
      },
      {
        title: "Sole proprietorship",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html",
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
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
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        note: "CRA guidance on sole proprietors reporting business income and related obligations.",
      },
      {
        title: "Business registration with the CRA",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/services/taxes/business-registration.html",
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        note: "CRA business registration entry point for business numbers and program accounts.",
      },
      {
        // Since 2026-10-24 (the maintainer's reading list): the page the first projection note quotes, for what
        // counts toward the $30,000 tests, so the stage that says $30,000 cites the page that sets it. Each quote is
        // one the two GST/HST stages or road 0's dw-start-gstman-tests line holds from scripts/check-quotes.mjs on
        // 2026-10-12, so it keeps that day. The maintainer read the page in full on 2026-10-25.
        title: "When to register for and start charging the GST/HST",
        authority: "CRA",
        jurisdiction: "CA",
        url: CRA_WHEN_TO_REGISTER_URL,
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: CRA_WHEN_TO_REGISTER_TOOL_CHECK.checkedOn,
          quotes: ["You exceed the $30,000", CRA_SOLE_PROPRIETOR_COUNTS, ...CRA_NOT_COUNTED],
        },
        note: "The CRA's small-supplier tests, and what a sole proprietor counts toward them.",
      },
    ],
    financialImpact: {
      summary:
        "Revenue and expenses start flowing through the personal tax return as self-employment business income.",
      projectionNotes: [
        // Until 2026-10-24 "Track gross revenue against …": the maintainer's reading list asked for what the CRA
        // counts instead, in its words, from the page cited above (tests/reading-list-corrections.spec.ts § 4). The
        // tests' periods are only in the CRA's own words now, quoted in full on Mandatory GST registration.
        `For the CRA's two $30,000 small-supplier tests (quoted in full on Mandatory GST registration), its page says: “${CRA_SOLE_PROPRIETOR_COUNTS}” And, on what is left out: “${CRA_NOT_COUNTED[0]}” “${CRA_NOT_COUNTED[1]}”`,
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
      "Neither of the CRA's two $30,000 small-supplier tests is met, but the venture wants GST/HST registration for input tax credits or for business customers.",
    description:
      "A small supplier can register voluntarily for GST/HST if carrying on commercial activity in Canada. If the venture registers before the mandatory threshold, this unlocks GST/HST collection, filing obligations, and input tax credit recovery on eligible business purchases.",
    taxImpact:
      "Registration creates a requirement to charge, collect, remit, and file GST/HST returns. It can also unlock ITCs for GST/HST paid on eligible inputs used in commercial activity.",
    lensAnnotations: {
      tax: "If customers are mostly GST/HST registrant businesses and startup inputs are material, this unlocks earlier ITC recovery while adding filing discipline.",
      legal:
        "If registration is voluntary, this unlocks ongoing registrant obligations before either of the CRA's $30,000 tests is met.",
    },
    // 2026-10-11: the CRA's own line on registering by choice, from the page the small-supplier test is on.
    officialWords: CRA_VOLUNTARY_REGISTRATION,
    citations: [
      {
        title: "When to register for and start charging the GST/HST",
        authority: "CRA",
        jurisdiction: "CA",
        url: CRA_WHEN_TO_REGISTER_URL,
        // A tool found the words this stage quotes on the live page (option B), and the maintainer read the page in
        // full on 2026-10-25; the read wins on screen.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: CRA_WHEN_TO_REGISTER_TOOL_CHECK,
        note: "CRA page with the small-supplier tests and the line on registering voluntarily (page details 2026-06-16).",
      },
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
            "The CRA's small-supplier tests: taxable supplies over $30,000 in a single calendar quarter, or over the previous four (or fewer) consecutive calendar quarters.",
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
      "Taxable supplies over $30,000 in a single calendar quarter, or over the previous four (or fewer) consecutive calendar quarters (the CRA's two tests, quoted in full in this stage's detail).",
    description:
      "When the venture stops being a small supplier, GST/HST registration becomes a compliance gate. If either of the CRA's $30,000 tests is met, this unlocks mandatory registration timing, charging GST/HST, filing returns, and remittance planning.",
    taxImpact:
      "GST/HST becomes a trust-style cash flow obligation: collect from customers, claim eligible ITCs, file returns, and remit net tax by CRA deadlines.",
    lensAnnotations: {
      tax: "If taxable supplies may go over $30,000 in a single calendar quarter, or over the previous four (or fewer) consecutive calendar quarters, this unlocks watching each quarter and avoids surprise remittance exposure.",
      legal:
        "If either test is met, this unlocks a compliance obligation rather than an optional optimization choice.",
    },
    // 2026-10-11: the two tests word for word, instead of a paraphrase that dropped "(or fewer)".
    officialWords: CRA_SMALL_SUPPLIER_TESTS,
    citations: [
      {
        title: "When to register for and start charging the GST/HST",
        authority: "CRA",
        jurisdiction: "CA",
        url: CRA_WHEN_TO_REGISTER_URL,
        // A tool found the words this stage quotes on the live page (option B), and the maintainer read the page in
        // full on 2026-10-25; the read wins on screen.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: CRA_WHEN_TO_REGISTER_TOOL_CHECK,
        note: "CRA guidance on small supplier status, mandatory registration, and timing (page details 2026-06-16). The two tests in this stage's detail are copied from its table.",
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
            "Taxable supplies in a single calendar quarter, or over the previous four (or fewer) consecutive calendar quarters.",
        },
      ],
    },
    branches: ["stage-3a-incorporation-80k-net", "stage-3b-incorporation-liability-sred"],
  },
  {
    // The id keeps its old words because ids are forever (saved ideas and exports name it). Until
    // 2026-10-11 this stage was "Incorporation at $80K net" and lit once the third-year SALES estimate
    // reached $80,000 — a "v0 heuristic" no official page sets, written as NET income. DotAmi doesn't
    // pick a point to incorporate: the person does, so no amount lights this card
    // (lib/brain/evaluate.ts computeNodeStates; docs/ui-spec/cockpit/03-canvas.md § Incorporating).
    id: "stage-3a-incorporation-80k-net",
    label: "Incorporating",
    stage: "stage-3a",
    trigger: "DotAmi doesn't pick a point to incorporate. You do, with your accountant or lawyer.",
    // 2026-10-11: the person's own number, kept as theirs; with it, this card turns green when their
    // third-year revenue estimate reaches it (lib/brain/evaluate.ts computeNodeStates).
    asksOwnNumber: {
      id: "incorporateAt",
      label: "I'd incorporate at",
      help: "Your own yearly sales number, kept as yours. No law sets one, so DotAmi has none. With it, this card applies once your third-year estimate reaches it.",
    },
    description:
      "Incorporation creates a separate legal taxpayer. If the business keeps money inside it after what the owner takes out personally, this unlocks CCPC planning, small business deduction modeling, corporate filings, and salary/dividend tradeoff analysis.",
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
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        note: "CRA overview of corporations as separate legal entities and tax filers.",
      },
      {
        title: "T2 Corporation Income Tax Guide - Small business deduction",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html",
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        // The two runs of words the business-limit estimate below quotes. The reading list's matcher found both on the
        // page on 2026-10-23: the first was its suggested quote, the second the words structure-ccpc's citation of
        // the page already held (2026-10-13), which that citation keeps.
        toolCheck: {
          checkedOn: READING_LIST_FOUND_ON,
          quotes: [
            "The maximum allowable business limit for a corporation that is not associated with any other corporation is $500,000.",
            "throughout the tax year may be able to claim the small business deduction",
          ],
        },
        note: "CRA guidance on the small business deduction and business limit.",
      },
    ],
    financialImpact: {
      summary:
        "Incorporation may shift timing: some earnings can be taxed corporately and retained for reinvestment instead of all profit being taxed personally each year.",
      projectionNotes: [
        "Model owner cash needs before treating incorporation as useful.",
        "Include recurring corporation filing, bookkeeping, and professional costs in the comparison.",
      ],
      estimates: [
        {
          // The maintainer's reading list (2026-10-23): a maximum, not automatic. Until 2026-10-24 the value was
          // "$500,000" and the basis DotAmi's paraphrase; both quotes are the T2 guide's (its citation's tool check
          // above). The label is unchanged: "Up to" in the value already says it is a maximum.
          label: "Federal SBD business limit",
          value: "Up to $500,000",
          basis:
            "The CRA's T2 guide says corporations that were Canadian-controlled private corporations (CCPCs) “throughout the tax year may be able to claim the small business deduction”, and: “The maximum allowable business limit for a corporation that is not associated with any other corporation is $500,000.”",
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
      "Liability exposure, enterprise contracts, external funding, or SR&ED-style product development makes the corporation itself matter, whatever the income.",
    description:
      "Some ventures incorporate because the structure itself matters. If risk, contracting, IP ownership, or SR&ED eligibility becomes central, this unlocks corporation planning even when pure tax deferral is not yet the main driver.",
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
        url: SRED_PAGES.relationships,
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        // The sentence the 35% estimate below quotes: the reading list's matcher found it on the page on 2026-10-23
        // (lib/engines/grants/v2026/sred-official-words.ts). The read wins on screen.
        toolCheck: { checkedOn: SRED_QUOTES_FOUND_ON, quotes: [SRED_WORDS.ccpcEnhanced] },
        note: "CRA guidance on CCPC relationships, SBD, and SR&ED investment tax credits.",
      },
      {
        title: "Federal incorporation",
        authority: "federal",
        jurisdiction: "CA",
        url: "https://ised-isde.canada.ca/site/corporations-canada/en/federal-incorporation",
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
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
          // Until 2026-10-24 a paraphrase ("CRA guidance describes enhanced SR&ED ITC access for certain CCPCs subject
          // to limits and relationships."); now the CRA's own sentence (the maintainer's reading list: 35% for
          // eligible CCPCs, within the limit).
          basis: `The CRA: “${SRED_WORDS.ccpcEnhanced}”`,
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
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        note: "CRA guidance for setting up payroll information for a new employee.",
      },
      {
        title: "Determine if you need to register for a payroll account",
        authority: "CRA",
        jurisdiction: "CA",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/open-manage-payroll-account/determine-need-register.html",
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        // The two sentences the payroll-timing estimate below quotes, both held by road 0's
        // dw-start-hire-payroll-account from its check of 2026-10-12, which keeps that date. The reading list's
        // matcher found both on the page again on 2026-10-23 (the second was its suggested quote).
        toolCheck: {
          checkedOn: READING_LIST_FOUND_ON,
          quotes: [
            "You have to register for a payroll account before the first remittance due date.",
            "Your first remittance due date is the 15th day of the month following the month in which you began withholding deductions from your employee's pay, unless the CRA tells you to remit using a different frequency.",
          ],
        },
        note: "CRA guidance on when an employer needs a payroll program account.",
      },
      {
        title: "Small business - Your guide to the Employment Standards Act",
        authority: "provincial",
        jurisdiction: "ON",
        url: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/small-business",
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        note: "Ontario employment standards reference for small businesses.",
      },
      {
        title: "Employment standards",
        authority: "provincial",
        jurisdiction: "BC",
        url: "https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards",
        // Read on 2026-05-01 (who read it wasn't recorded); the maintainer read it in full on 2026-10-25.
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        note: "BC employment standards reference for employers and workers.",
      },
      {
        // The maintainer's call a-call-12 (2026-10-23): Alberta's own page, since every road now shows a person
        // only the federal pages and their own province's. A tool found these words on it on 2026-10-23, and the
        // maintainer read it in full on 2026-10-25 (docs/engines/citations.md).
        title: "Employment standards",
        authority: "provincial",
        jurisdiction: "AB",
        url: "https://www.alberta.ca/employment-standards",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-23",
          quotes: [
            "Employment standards set out the rights and obligations of employers and employees in Alberta.",
            "This includes the minimum standards that employers must provide to employees.",
          ],
        },
        note: "Alberta employment standards reference for employers and employees.",
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
          // The CRA's own words (the maintainer's reading list, 2026-10-23: the claim matches), so no deadline is said
          // in DotAmi's words. Until 2026-10-24 "Before first remittance due date", on "CRA payroll registration
          // guidance."
          label: "Payroll account timing",
          value: "“before the first remittance due date”",
          basis:
            "The CRA: “You have to register for a payroll account before the first remittance due date.” “Your first remittance due date is the 15th day of the month following the month in which you began withholding deductions from your employee's pay, unless the CRA tells you to remit using a different frequency.”",
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
      // Until 2026-10-24 "Enhanced rates for CCPCs subject to taxable income limits", which no held quote says; now
      // the condition of the CRA's sentence this stage's 35% quotes (the maintainer's reading list).
      "Eligible SR&ED expenditures generate ITCs and deductions. The enhanced rate is for some CCPCs, up to their expenditure limit for the year. Provincial top-ups may apply in some jurisdictions.",
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
        // Moved: the old address (…/scientific-research-experimental-development-tax-incentive/claim-sred-expenditures.html,
        // read 2026-05-01) answered 404 on 2026-10-13; a tool found these words on the new page that day
        // (the second is how the page describes its "Get ready to claim" step: the records to keep). The maintainer
        // read the new page in full on 2026-10-25.
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-claim.html",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "After conducting SR&ED work, you can prepare to file your SR&ED tax incentives claim.",
            "Understand how to claim, resources you'll need, reporting deadlines, and what supporting documentation to keep",
          ],
        },
        note: "CRA SR&ED claim preparation guidance.",
      },
      {
        title: "SR&ED glossary",
        authority: "CRA",
        jurisdiction: "CA",
        // Moved: the old address (…/scientific-research-experimental-development-tax-incentive/glossary.html,
        // read 2026-05-01) answered 404 on 2026-10-13; a tool found these words on the new page that day:
        // its entry for the systematic investigation the stage's records track, and one of the kinds of
        // work the law's definition of SR&ED leaves out (routine work, kept apart from SR&ED). The maintainer read
        // the new page in full on 2026-10-25.
        url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/glossary.html",
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: {
          checkedOn: "2026-10-13",
          quotes: [
            "The systematic investigation or search called for in the definition of SR&ED is an approach that includes defining a problem, advancing a hypothesis towards resolving that problem, planning and testing the hypothesis by experiment or analysis, and developing logical conclusions based on the results.",
            "quality control or routine testing of materials, devices, products or processes",
          ],
        },
        note: "CRA SR&ED terminology and eligibility concepts.",
      },
      {
        // Added 2026-10-24 for the stage's 35% (the maintainer's answer of that day: quote this page's line, as
        // Incorporation for liability/SR&ED does). He asked for the glossary's line stating 35%, which no tool has
        // found, so the stage quotes the sentence the reading list's matcher found here on 2026-10-23. The maintainer
        // read the page in full on 2026-10-25.
        title: "How certain relationships affect the small business deduction and SR&ED investment tax credits",
        authority: "CRA",
        jurisdiction: "CA",
        url: SRED_PAGES.relationships,
        lastVerified: MAINTAINER_READ_ON,
        readBy: "person",
        toolCheck: { checkedOn: SRED_QUOTES_FOUND_ON, quotes: [SRED_WORDS.ccpcEnhanced] },
        note: "Which CCPCs may earn the enhanced 35% rate, up to their expenditure limit for the year.",
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
          // Until 2026-10-24 "CRA enhanced SR&ED ITC rate for qualifying CCPCs.", with no source of the stage stating
          // 35%; now the CRA's sentence, from the relationships page cited above.
          basis: `The CRA: “${SRED_WORDS.ccpcEnhanced}”`,
        },
      ],
    },
    branches: [],
  },
] satisfies CFENode[];

export type CFENodeId = (typeof cfeNodesV2026)[number]["id"];
