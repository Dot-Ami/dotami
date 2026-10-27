import { cfeNodesV2026, type CFENodeId } from "../../cfe/v2026/nodes";
import { cfeTiersV2026 } from "../../cfe/v2026/tiers";
import { CRA_NOT_COUNTED, CRA_SOLE_PROPRIETOR_COUNTS } from "../../compliance/v2026/gst-official-words";
import { complianceRulesV2026 } from "../../compliance/v2026/rules";
import type { CitationAuthority, EngineCitation, Province } from "../../shared/types";
import { roadFromCfe } from "./from-cfe";
import { keepRecordsStep } from "./keep-records";
import type { DoneWhenLine, NamedCostLine, RoadStep, SkillItem } from "./types";

/**
 * Road 0: today's ten-step map as a road (docs/architecture/future-cockpit.md § 6). Every saved
 * future is drawn on it until storage lets a future name another road.
 *
 * Its two forks are today's two toggles. Their ids are the keys a person's picks are already saved
 * under (`ScenarioState.activeBranches`), and their names and sides are the toggles' own
 * (`lib/scenarios/branches.ts`); tests/roads.spec.ts fails if the two ever differ. They are spelled
 * out here rather than imported so the catalog keeps no imports from the app layer.
 *
 * Each step names its rules and tax cards (`engineHints`, by catalog id). Until 2026-10-12 this list
 * lived in lib/brain/node-items.ts as NODE_ENGINE_HINTS; it moved onto the road unchanged, so a road
 * names its own cards (docs/architecture/future-cockpit.md § 2, Cockpit screen as built), and
 * tests/engine-integrity.spec.ts still checks every id names a real catalog entry.
 *
 * Its own content (2026-10-12, § 6 "Road 0's content as built"): about three done-when lines on each
 * of the ten map stages, and three "before you open" steps in the first column. Every source here is a
 * tool check, not a read (option B, docs/engines/citations.md): each quote was found word for word on
 * its live page by `node scripts/check-quotes.mjs --url … --quote …` on CHECKED_ON, and nobody is
 * recorded as having read these pages, so none has a read date. A line says only what its quotes say,
 * and no amount is written anywhere: Alberta's registry fees sit in a catalogue that stops tools, and
 * permit fees vary, so they are named lines the person prices. Sole Prop activation also carries the
 * seven named start-up cost lines the design names (tools, a space deposit, insurance, …), names only.
 * Since 2026-10-14 the first column also holds "Keep your records from day one" (./keep-records.ts),
 * whose sources were checked by the tool that day.
 */

/** The day scripts/check-quotes.mjs found every quote below on its page. */
const CHECKED_ON = "2026-10-12";

interface Page {
  title: string;
  authority: CitationAuthority;
  jurisdiction: Province;
  url: string;
  /** What the page is, in one line; the quotes say what this entry relies on. */
  note: string;
}

const CRA = "https://www.canada.ca/en/revenue-agency/services";

// Each page once; each citation below picks the quotes it relies on. Four of the map stages' own
// sources now answer "page not found" (the Employees page, the line 4600 page, two SR&ED pages), so
// their lines cite the pages where that content is today; the stages' sources are the tax map's.
const PAGES = {
  employmentIncome: {
    title: "Employment and self-employment income (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/employment-self-employment-income.html`,
    note: "The lines of a personal tax return where employment income and self-employment income are reported.",
  },
  soleProprietorship: {
    title: "Sole proprietorship (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html`,
    note: "What a sole proprietorship is, how its owner reports and pays tax, and billing in the business's name.",
  },
  businessRecords: {
    title: "Business records (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/topics/sole-proprietorships-partnerships/business-records.html`,
    note: "The income, expense and property records a sole proprietor or partnership keeps, and for how long.",
  },
  gstVoluntary: {
    title: "Register voluntarily for a GST/HST account (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/topics/gst-hst-businesses/account-register-voluntarily.html`,
    note: "Registering for the GST/HST by choice while a small supplier, and what a registrant then has to do.",
  },
  inputTaxCredits: {
    title: "Input tax credits (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/topics/gst-hst-businesses/calculate-prepare-report/input-tax-credit.html`,
    note: "How a GST/HST registrant claims back the GST/HST paid on business purchases, and the records it needs.",
  },
  gstWhenToRegister: {
    title: "When to register for and start charging the GST/HST (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/topics/gst-hst-businesses/when-register-charge.html`,
    note: "The CRA's small-supplier tests, and when a business must or may register for the GST/HST.",
  },
  corporation: {
    title: "Corporation (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/small-businesses-self-employed-income/setting-your-business/corporation.html`,
    note: "What a corporation is, how one is set up, its T2 return, and a shareholder's and a director's liability.",
  },
  federalIncorporation: {
    title: "Federal incorporation (Corporations Canada)",
    authority: "federal",
    jurisdiction: "CA",
    url: "https://ised-isde.canada.ca/site/corporations-canada/en/federal-incorporation",
    note: "Incorporating a business federally: what it creates and who can.",
  },
  relationships: {
    title: "How certain relationships affect the small business deduction and SR&ED investment tax credits (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/topics/corporations/business-tax-credits/how-relationships-affect-small-business-deduction-sred-investment-tax-credits.html`,
    note: "What a CCPC is, and how associated corporations share the business limit and the SR&ED expenditure limit.",
  },
  newEmployee: {
    title: "Set up and manage employee payroll information (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/topics/payroll/set-up-new-employee.html`,
    note: "What an employer gets from a new employee before paying them.",
  },
  payrollAccount: {
    title: "Determine if you need to register for a payroll account (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/topics/payroll/open-manage-payroll-account/determine-need-register.html`,
    note: "Who must register for a CRA payroll account, by when, and how a worker's status is decided.",
  },
  wcbWorkerCoverage: {
    title: "Worker coverage (WCB-Alberta)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.wcb.ab.ca/insurance-and-premiums/types-of-coverage/worker-coverage.html",
    note: "When an Alberta employer must open a WCB account for its workers.",
  },
  registerName: {
    title: "Register a business name (alberta.ca)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.alberta.ca/register-business-name",
    note: "Registering a trade name or partnership in Alberta: the forms, the name rules, and that registering has a government fee and a service fee.",
  },
  businessNames: {
    title: "Business names (alberta.ca)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.alberta.ca/business-names",
    note: "Alberta's business-name rules, including when an email address is required.",
  },
  findRegistry: {
    title: "Find a business registry (alberta.ca)",
    authority: "provincial",
    jurisdiction: "AB",
    url: "https://www.alberta.ca/find-business-registry",
    note: "Registry agents who record business registrations, and their service fees.",
  },
  t5Guide: {
    title: "T5 Guide: Return of Investment Income (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/forms-publications/publications/t4015/t5-guide-return-investment-income.html`,
    note: "When a payer prepares T5 slips, including for dividends, when it doesn't have to, and the filing deadline.",
  },
  t5Slip: {
    title: "Completing the T5 slip (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/topics/completing-slips-summaries/financial-slips-summaries/return-investment-income-t5/t5-slip/completing-t5-slip.html`,
    note: "The boxes of a T5 slip, including when a dividend is an eligible dividend.",
  },
  amendSlips: {
    title: "Amend, cancel, add, or replace slips and summaries (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/tax/businesses/topics/payroll/file-information-returns-slip-summaries/make-corrections-after-filing/amend.html`,
    note: "Correcting slips after filing, and what can't be changed, such as salary into dividends.",
  },
  sredT661: {
    title: "Describe work and report expenditures with Form T661 (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/scientific-research-experimental-development-tax-incentive-program/sred-claim/report-expenditures-t661.html`,
    note: "Describing SR&ED work and reporting its expenditures on Form T661.",
  },
  sredFilingPolicy: {
    title: "SR&ED Filing Requirements Policy (CRA)",
    authority: "CRA",
    jurisdiction: "CA",
    url: `${CRA}/scientific-research-experimental-development-tax-incentive-program/filing-requirements-policy.html`,
    note: "The forms and the reporting deadline for an SR&ED claim.",
  },
  bizpal: {
    title: "BizPaL",
    authority: "federal",
    jurisdiction: "CA",
    url: "https://bizpal.ca/",
    note: "The permit and licence finder run by the federal, provincial and territorial, and municipal governments.",
  },
  bizpalFaq: {
    title: "BizPaL frequently asked questions",
    authority: "federal",
    jurisdiction: "CA",
    url: "https://bizpal.ca/en/faq/",
    note: "What BizPaL covers, what it costs, and what to do where a municipality isn't on it.",
  },
} as const satisfies Record<string, Page>;

/**
 * A citation of one page, checked by the tool on CHECKED_ON: the quotes are the exact words it found
 * there. Never a read date: nobody is recorded as having read these pages.
 */
function checked(page: Page, ...quotes: string[]): EngineCitation {
  const { title, authority, jurisdiction, url, note } = page;
  return { title, authority, jurisdiction, url, note, toolCheck: { checkedOn: CHECKED_ON, quotes } };
}

function named(id: string, label: string, nameSource?: EngineCitation): NamedCostLine {
  return nameSource ? { id, kind: "named", label, nameSource } : { id, kind: "named", label };
}

// Quotes used more than once, kept in one place so two citations of the same words can't drift.
const Q = {
  sixYears:
    "You are generally required to keep your records for a minimum of six years from the end of the last tax year to which they relate.",
  fourQuarters: "over the previous four (or fewer) consecutive calendar quarters (but not in a single calendar quarter).",
  register29: "You will have to register within 29 days of your effective date of registration.",
  tradeNameIndividual: "an individual does business under a name other than their own personal name",
  tradeNameCorporation: "a corporation does business under a name other than its legal name",
  registerSteps: "Follow these steps to register a trade name or partnership and get a registration statement.",
  proofOfFiling: "it will be entered into the Corporate Registry and you will get a proof of filing.",
  bizpalWhat:
    "BizPaL is an online service that benefits Canadian businesses by helping them identify which permits and licences they require and how to obtain them.",
  notAllInclusive: "the BizPaL database is not all inclusive.",
  cityHall: "To acquire the permits and licences from your municipality, you may contact your local city hall.",
  costsVary: "Costs for permits and licences vary.",
  separateAccount:
    "If your business has a name other than your own, you'll need a separate bank account to process cheques payable to your business.",
} as const;

// ---- Done-when lines on today's ten map stages ----------------------------------------------------

/** Every map stage gets its lines; the type fails the build if one is left out. */
const stageDoneWhen = {
  "stage-0-employee-apprentice-baseline": [
    {
      id: "dw-start-baseline-employment",
      text: "Your pay from a job is reported as employment income, on line 10100 of your tax return.",
      citation: checked(PAGES.employmentIncome, "Line 10100 - Employment income", "Report your employment income."),
    },
    {
      id: "dw-start-baseline-business-lines",
      text: "Income from a business, once there is any, is reported on its own lines: 13499 to 14300, self-employment income or loss.",
      citation: checked(
        PAGES.employmentIncome,
        "Lines 13499 to 14300 - Self-employment income",
        "Report self-employment income or loss from a business, a profession, commission, farming or fishing.",
      ),
    },
    {
      id: "dw-start-baseline-sole-prop",
      text: "You know what a sole proprietorship is before starting one: an unincorporated business owned by one person, with no separate legal status from them, whose risks extend even to their personal property and assets.",
      citation: checked(
        PAGES.soleProprietorship,
        "A sole proprietorship is an unincorporated business that is owned by one individual.",
        "does not have separate legal status from the business",
        "The risks extend even to your personal property and assets.",
      ),
    },
  ],
  "stage-1-sole-prop-activation": [
    {
      id: "dw-start-soleprop-records",
      text: "You keep a record of your daily income and expenses, get a receipt or other voucher for each business purchase, and keep these records for at least six years from the end of the last tax year they relate to (the CRA says you are generally required to).",
      citation: checked(
        PAGES.businessRecords,
        "Keep a record of your daily income and expenses.",
        "Always get receipts or other vouchers when you buy something for your business.",
        Q.sixYears,
      ),
    },
    {
      id: "dw-start-soleprop-return",
      text: "You report the business's income (or loss) on your T1 income tax and benefit return, with financial statements or the forms that apply, such as Form T2125, Statement of Business or Professional Activities.",
      citation: checked(
        PAGES.soleProprietorship,
        "A sole proprietor pays taxes by reporting income (or loss) on a T1 income tax and benefit return.",
        "When you file your income tax and benefit return, you must include financial statements or one or more of the following forms, as applicable:",
        "Form T2125, Statement of Business or Professional Activities",
      ),
    },
    {
      id: "dw-start-soleprop-instalments",
      text: "You checked whether you have to pay your income tax, and Canada Pension Plan (CPP) contributions on your own income, by instalments.",
      citation: checked(
        PAGES.soleProprietorship,
        "As a sole proprietor, you may have to pay your income tax by payments called instalments.",
        "You may also need to make instalment payments for CPP contributions on your own income.",
      ),
    },
  ],
  "stage-2a-voluntary-gst-registration": [
    {
      id: "dw-start-gstvol-registered",
      text: "You registered by choice for a GST/HST (Goods and Services Tax / Harmonized Sales Tax) account while still a small supplier; your registration usually takes effect the day you asked, or up to 30 days before.",
      citation: checked(
        PAGES.gstVoluntary,
        "You may register for a GST/HST account if you make taxable sales, leases, or other supplies in Canada.",
        "If you request your GST/HST account when you are still a small supplier, your effective date of registration is usually the date of your request.",
        "It can generally also be up to 30 days before that day.",
      ),
    },
    {
      id: "dw-start-gstvol-charge-file",
      text: "You charge, collect and remit the GST/HST on your taxable supplies, and file GST/HST returns on a regular basis.",
      citation: checked(
        PAGES.gstVoluntary,
        "Charge, collect and remit the GST/HST that applies on your taxable supplies of property and services",
        "File GST/HST returns on a regular basis",
      ),
    },
    {
      id: "dw-start-gstvol-one-year",
      text: "You know you must stay registered for at least one year before you can cancel, unless you stop your commercial activities.",
      citation: checked(
        PAGES.gstVoluntary,
        "Stay registered for at least one year before you can cancel your registration (unless you stop your commercial activities)",
      ),
    },
    {
      id: "dw-start-gstvol-itc-evidence",
      text: "Before you claim an input tax credit (how a registrant gets back the GST/HST paid on purchases and expenses for its commercial activities), you have the documents that support it.",
      citation: checked(
        PAGES.inputTaxCredits,
        "As a GST/HST registrant, you recover the GST/HST paid or payable on your purchases and expenses related to your commercial activities by claiming input tax credits (ITCs)",
        "You obtain sufficient documentary evidence to substantiate the ITC prior to making the claim in a GST/HST return.",
      ),
    },
  ],
  "stage-2b-mandatory-gst-registration": [
    {
      // What counts is wider than one business's sales (the CRA counts every business, and associates),
      // and narrower than every dollar in (it leaves out financial services, capital property and
      // goodwill). Both halves are the same footnote on the page.
      id: "dw-start-gstman-tests",
      text: "You checked your taxable revenues against both of the CRA's (the Canada Revenue Agency's) small-supplier tests: a single calendar quarter on its own, and the previous four (or fewer) consecutive calendar quarters. What counts is your revenues before expenses from your worldwide taxable supplies, and those of your associates (the CRA's word) if they were associated at the beginning of the calendar quarter. Revenues from financial services, sales of capital property (such as business equipment you sell) and goodwill from the sale of a business don't count.",
      citation: checked(
        PAGES.gstWhenToRegister,
        "in a single calendar quarter.",
        Q.fourQuarters,
        // Shared with Sole Prop activation's note on the tests, which quotes them (gst-official-words.ts).
        CRA_SOLE_PROPRIETOR_COUNTS,
        "If you are a partnership or a corporation, include the total amount of all revenues (before expenses) from your worldwide taxable supplies and those of your associates (if they were associated at the beginning of the particular calendar quarter).",
        // One sentence on the page, quoted in two parts (gst-official-words.ts says why).
        ...CRA_NOT_COUNTED,
      ),
    },
    {
      id: "dw-start-gstman-one-quarter",
      text: "If you went over $30,000 in a single calendar quarter, you charge GST/HST on the sale that took you over, and register within 29 days of your effective date of registration.",
      citation: checked(
        PAGES.gstWhenToRegister,
        "You are no longer a small supplier and have to charge GST/HST on the supply that made you exceed $30,000 within the calendar quarter.",
        Q.register29,
      ),
    },
    {
      id: "dw-start-gstman-four-quarters",
      text: "If you went over $30,000 across the previous four (or fewer) calendar quarters, you stop being a small supplier at the end of the month after that quarter, and register within 29 days of your effective date of registration.",
      citation: checked(
        PAGES.gstWhenToRegister,
        Q.fourQuarters,
        "You are no longer a small supplier at the end of the month following the quarter in which you exceed $30,000.",
        Q.register29,
      ),
    },
    {
      id: "dw-start-gstman-charging",
      text: "You charge GST/HST on your taxable supplies from your effective date of registration.",
      citation: checked(
        PAGES.gstWhenToRegister,
        "You have to start charging GST/HST on your taxable supplies starting on your effective date of registration.",
      ),
    },
  ],
  "stage-3a-incorporation-80k-net": [
    {
      id: "dw-start-inc-articles",
      text: "The corporation is set up: its articles of incorporation are completed and sent to the provincial, territorial or federal government.",
      citation: checked(
        PAGES.corporation,
        "You set up a corporation by completing articles of incorporation and sending the documents to the appropriate provincial, territorial, or federal governments.",
      ),
    },
    {
      id: "dw-start-inc-t2",
      text: "You know the corporation files a T2 Corporation Income Tax Return no later than six months after the end of every tax year, even if it owes no tax.",
      citation: checked(
        PAGES.corporation,
        "A corporation has to file a T2 Corporation Income Tax Return no later than six months after the end of every tax year, even if it does not owe taxes.",
      ),
    },
    {
      id: "dw-start-inc-guarantee",
      text: "You know one place limited liability stops: as a shareholder you aren't responsible for the corporation's debts, but a debt you personally guarantee is yours if the corporation doesn't pay it back.",
      citation: checked(
        PAGES.corporation,
        "As a shareholder of your corporation, you have limited liability.",
        "This means that you and the other shareholders are not responsible for the corporation's debts.",
        "However, limited liability may not always protect you from creditors.",
        "If you agree to this condition, you will be personally liable for that debt if the corporation does not pay it back.",
      ),
    },
    {
      // The owner of a one-person corporation is usually its director too, so this is theirs as well.
      id: "dw-start-inc-directors",
      text: "You know another: a director may also be liable for amounts the corporation owes if it failed to deduct, withhold, remit or pay amounts as the Income Tax Act, the Employment Insurance Act, the Canada Pension Plan, the Excise Act 2001 or the Excise Tax Act requires.",
      citation: checked(
        PAGES.corporation,
        "Directors may also be liable to pay amounts owed by the corporation if it has failed to deduct, withhold, remit, or pay amounts as required by the Income Tax Act, the Employment Insurance Act, the Canada Pension Plan, the Excise Act 2001, and the Excise Tax Act.",
      ),
    },
  ],
  "stage-3b-incorporation-liability-sred": [
    {
      id: "dw-start-incsred-incorporated",
      text: "The corporation exists: incorporating created a new legal entity. Any business operating in Canada can incorporate federally.",
      citation: checked(
        PAGES.federalIncorporation,
        "When incorporating, you create a new legal entity called a corporation.",
        "Any business and not-for-profit operating in Canada can incorporate federally.",
      ),
    },
    {
      id: "dw-start-incsred-ccpc",
      text: "You checked whether the corporation is a Canadian-controlled private corporation (CCPC): in general, a private corporation, resident in Canada, not controlled by non-residents or public corporations. The small business deduction and the enhanced investment tax credit for scientific research and experimental development (SR&ED) are for certain CCPCs.",
      citation: checked(
        PAGES.relationships,
        "The small business deduction (SBD) and the investment tax credit (ITC) for scientific research and experimental development (SR&ED) at the enhanced rate are available to certain Canadian-controlled private corporations (CCPC).",
        "a private corporation",
        "a resident in Canada",
        "In general terms, a corporation is a CCPC if it is all of the following:",
        "not controlled directly or indirectly by one or more non-resident persons or public corporations",
      ),
    },
    {
      id: "dw-start-incsred-associated",
      text: "If it is associated with other CCPCs, they share the business limit and the SR&ED expenditure limit; the agreements that allocate them are schedules T2SCH23 and T2SCH49.",
      citation: checked(
        PAGES.relationships,
        "When one CCPC is associated with other CCPCs, these corporations must share the business limit.",
        "When one CCPC is associated with other CCPCs, these corporations must share the expenditure limit.",
        "T2SCH23, Agreement Among Associated Canadian-Controlled Private Corporations to Allocate the Business Limit",
        "T2SCH49, Agreement Among Associated Canadian-Controlled Private Corporations to Allocate the Expenditure Limit",
      ),
    },
  ],
  "branch-hire-first-employee": [
    {
      id: "dw-start-hire-status",
      text: "You checked that the worker is an employee, not self-employed: the facts of the working relationship as a whole decide, and either of you can ask for a CPP/EI (Canada Pension Plan / Employment Insurance) ruling.",
      citation: checked(
        PAGES.payrollAccount,
        "The facts of the working relationship as a whole decide the employment status.",
        "either one of you can request a CPP/EI ruling to determine the status",
      ),
    },
    {
      id: "dw-start-hire-before-pay",
      text: "Before the first pay, you have the employee's social insurance number and their completed TD1 forms.",
      citation: checked(
        PAGES.newEmployee,
        "Get the employee's social insurance number",
        "get the completed TD1 forms before you pay an employee",
      ),
    },
    {
      id: "dw-start-hire-payroll-account",
      text: "You registered for a CRA payroll account before your first remittance due date: the 15th day of the month after the month you began withholding deductions from the employee's pay, unless the CRA tells you to remit using a different frequency.",
      citation: checked(
        PAGES.payrollAccount,
        "You have to register for a payroll account before the first remittance due date.",
        "Your first remittance due date is the 15th day of the month following the month in which you began withholding deductions from your employee's pay, unless the CRA tells you to remit using a different frequency.",
      ),
    },
    {
      id: "dw-start-hire-wcb",
      text: "If your industry must have workers' compensation coverage, you opened a WCB-Alberta (Workers' Compensation Board) account within 15 days of hiring your first worker.",
      citation: checked(
        PAGES.wcbWorkerCoverage,
        "If you operate in an industry that's required to have workers' compensation coverage (a mandatory industry), you must open a WCB-Alberta account within 15 days of hiring your first worker.",
      ),
    },
  ],
  "branch-service-vs-productize": [
    {
      id: "dw-start-service-income-records",
      text: "Your income records show the date, amount and source of each payment, each supported by original documents.",
      citation: checked(
        PAGES.businessRecords,
        "Your income records must include the date, amount, and source of the income.",
        "Support all income entries with original documents.",
      ),
    },
    {
      id: "dw-start-service-separate-records",
      text: "You keep separate records for each business you run.",
      citation: checked(PAGES.businessRecords, "Keep separate records for each business you run."),
    },
    {
      id: "dw-start-service-name",
      text: "If you do business under a name other than your own (or, for a corporation, other than its legal name), that is a trade name, and it is registered.",
      citation: checked(PAGES.registerName, Q.registerSteps, Q.tradeNameIndividual, Q.tradeNameCorporation),
    },
  ],
  "stage-4-retained-earnings-planning": [
    {
      id: "dw-start-retained-t5",
      text: "When the corporation pays dividends to a resident of Canada, it prepares a T5 slip, files the T5 information return and gives each recipient a copy, by the last day of February after the calendar year, unless one of the T5 Guide's exceptions applies (among them, amounts to one recipient that total less than $50 for the year, and capital dividends).",
      citation: checked(
        PAGES.t5Guide,
        "If you make certain types of payments to a resident of Canada, or if you receive certain types of payments as a nominee or agent for a person resident in Canada, you have to prepare a T5 slip.",
        "eligible dividends and dividends other than eligible dividends (including most deemed dividends)",
        "You have to file a T5 information return by the last day of February following the calendar year to which the information return applies.",
        "You must give recipients a copy of their T5 slips, by the last day of February following the calendar year to which the information return applies.",
        "You do not have to prepare a T5 slip to report:",
        "amounts paid to one recipient when the total amount for the year is less than $50",
        "capital dividends, as described in Income Tax Folio S3-F2-C1, Capital Dividends",
      ),
    },
    {
      id: "dw-start-retained-eligible",
      text: "A dividend is an eligible dividend only if the corporation paying it designated it as one (among other requirements).",
      citation: checked(
        PAGES.t5Slip,
        "Among other requirements, to be eligible dividends, taxable dividends must have been designated as such by the corporation paying the taxable dividend.",
      ),
    },
    {
      id: "dw-start-retained-no-switch",
      text: "Each payment to you is recorded as what it is when it is made: the CRA says that if payments to a shareholder were recorded as salary and deductions at source were required, they can't later be changed into dividends, on the slips or in your records.",
      citation: checked(
        PAGES.amendSlips,
        "You cannot change the nature of the income paid (for example, from salary to dividends).",
        "If the payments you made to a shareholder were recorded as salary payments (in your books and records) and deductions at source were required, you cannot do any of the following:",
        "Retroactively change your records and convert the payments to dividends",
      ),
    },
  ],
  "stage-4-sred-deepening": [
    {
      id: "dw-start-sred-t661",
      text: "For each project, you described the work and reported its expenditures on Form T661, Scientific Research and Experimental Development (SR&ED) Expenditures Claim.",
      citation: checked(
        PAGES.sredT661,
        "You will use Form T661, Scientific Research and Experimental Development (SR&ED) Expenditures Claim, to describe the work carried out for each project and report the associated expenditures.",
      ),
    },
    {
      id: "dw-start-sred-spent",
      text: "You worked out how much you spent on each SR&ED project during the tax year.",
      citation: checked(
        PAGES.sredT661,
        "To report your expenditures, you must first calculate how much you spent on an SR&ED project during the tax year.",
      ),
    },
    {
      id: "dw-start-sred-deadline",
      text: "You filed by the SR&ED reporting deadline (for a corporation, generally 18 months after its tax year end); a claim can't be filed or changed after it.",
      citation: checked(
        PAGES.sredFilingPolicy,
        "For example, the SR&ED reporting deadline for corporations is generally 18 months after the tax year end.",
        "A taxpayer cannot file or make a change to an SR&ED claim after the SR&ED reporting deadline.",
      ),
    },
  ],
} satisfies Record<CFENodeId, DoneWhenLine[]>;

// ---- Before you open: three steps in the first column ---------------------------------------------

const SOLE_PROP = "stage-1-sole-prop-activation";

const registerName: RoadStep = {
  id: "step-start-register-name",
  label: "Register your business name, if you use one",
  summary:
    "If you do business under a name other than your own, you register it in Alberta as a trade name (or register your partnership) and get proof of filing.",
  next: [SOLE_PROP],
  doneWhen: [
    {
      id: "dw-start-name-when",
      text: "You checked whether you need to: a trade name is used when an individual does business under a name other than their own personal name, and 2 or more people (or corporations) doing business together as partners form a partnership.",
      citation: checked(
        PAGES.registerName,
        "A trade name is used when:",
        Q.tradeNameIndividual,
        "A partnership is created when 2 or more individuals, or 2 or more corporations, do business together as partners.",
      ),
    },
    {
      id: "dw-start-name-ending",
      text: "The name doesn't end in 'limited', 'incorporated' or 'corporation', and doesn't use their short forms (such as Ltd., Inc. or Corp.) or their French forms.",
      citation: checked(
        PAGES.registerName,
        "cannot use the words 'limited', 'incorporated' or 'corporation' at the end of the business name",
        "cannot use the abbreviated forms of these words (such as Ltd., Inc., or Corp., or the French forms/abbreviations of those words)",
      ),
    },
    {
      // The page names no price for the report, so it is a line here, not a cost.
      id: "dw-start-name-report",
      text: "You decided whether to get a Business Name Report first (optional): it lists registered business, corporation and trademark names similar to yours, and comes from authorized NUANS members.",
      citation: checked(
        PAGES.registerName,
        "This step is recommended, but not mandatory.",
        "The report contains registered business, corporation and trademark names that are similar to your proposed business name.",
        "The report is provided by authorized NUANS members.",
      ),
    },
    {
      id: "dw-start-name-form",
      text: "You filled in the Declaration of Trade Name (a trade name or sole proprietorship), or the Declaration of Partnership (a partnership).",
      citation: checked(
        PAGES.registerName,
        "If you are registering a trade name or sole proprietorship, use the Declaration of Trade Name.",
        "If you are registering a partnership, use the Declaration of Partnership and, if needed, the Special Authority to Execute a Declaration.",
      ),
    },
    {
      id: "dw-start-name-proof",
      text: "It was entered into the Corporate Registry and you got proof of filing (registering doesn't make the name yours); your federal business number comes by email, unless you already have one.",
      citation: checked(
        PAGES.registerName,
        Q.proofOfFiling,
        "Registering a business name does not grant any right of ownership of the name.",
        "You will receive an email when your federal business number is issued, unless one has previously been assigned to you as an individual or corporation.",
      ),
    },
    {
      id: "dw-start-name-email",
      text: "You gave an email address, which registering a business name requires.",
      citation: checked(PAGES.businessNames, "An email address is required when", "or registering a business name"),
    },
  ],
  needs: [],
  costs: [
    // Both amounts sit in Alberta's Registry Agent Product Catalogue, which stops tools with a human
    // check; they stay named until a person reads them there.
    named(
      "cost-start-name-government-fee",
      "Government fee to register the name (in Alberta's Registry Agent Product Catalogue)",
      checked(PAGES.registerName, "Service providers will charge a government fee and a service fee to register your business name."),
    ),
    named(
      "cost-start-name-service-fee",
      "Registry agent's service fee (set by your agent)",
      checked(PAGES.findRegistry, "Service fees are not regulated and may vary from one agent to another."),
    ),
  ],
  officialLinks: [
    { label: "Register a business name", url: PAGES.registerName.url },
    { label: "Find a business registry", url: PAGES.findRegistry.url },
  ],
  citations: [checked(PAGES.registerName, Q.registerSteps, Q.proofOfFiling)],
};

const permitsBizpal: RoadStep = {
  id: "step-start-permits-bizpal",
  label: "Look up your permits and licences (BizPaL)",
  summary:
    "BizPaL, a free government service, lists permits and licences from every level of government for the business activities you pick; its list isn't complete.",
  next: [SOLE_PROP],
  doneWhen: [
    {
      id: "dw-start-bizpal-searched",
      text: "You picked the business activities you plan in BizPaL, for your place, and got its list of permits and licences from every level of government.",
      citation: checked(
        PAGES.bizpalFaq,
        "Entrepreneurs simply select the business activities they plan to undertake and BizPaL then automatically generates a list of all required permits and licences from all levels of government (federal, provincial, territorial and municipal)",
      ),
    },
    {
      id: "dw-start-bizpal-more",
      text: "You looked further than that list, because BizPaL's database isn't complete.",
      citation: checked(
        PAGES.bizpalFaq,
        Q.notAllInclusive,
        "You will still have to conduct additional research to ensure that your business is regulatory compliant.",
      ),
    },
    {
      id: "dw-start-bizpal-city-hall",
      text: "If your municipality isn't on BizPaL, you contacted your local city hall about its permits and licences.",
      citation: checked(PAGES.bizpalFaq, "What can I do if my municipality is not on BizPaL?", Q.cityHall),
    },
    {
      id: "dw-start-bizpal-applied",
      text: "You got the permits and licences you need; BizPaL itself is free, but each one can have its own cost, and those costs vary.",
      citation: checked(
        PAGES.bizpalFaq,
        "No, BizPaL is a free service offered by the government however a cost may be associated to acquiring the permits and licences you need.",
        Q.costsVary,
      ),
    },
  ],
  needs: [],
  costs: [named("cost-start-permit-licence-fees", "Permit and licence fees (they vary)", checked(PAGES.bizpalFaq, Q.costsVary))],
  officialLinks: [
    { label: "BizPaL", url: PAGES.bizpal.url },
    { label: "BizPaL frequently asked questions", url: PAGES.bizpalFaq.url },
  ],
  citations: [
    checked(PAGES.bizpal, "Search for the permits and licences you may need to start or grow your business."),
    checked(PAGES.bizpalFaq, Q.bizpalWhat),
  ],
};

const businessAccount: RoadStep = {
  id: "step-start-business-account",
  label: "A separate bank account for the business, if it has a name other than yours",
  // The CRA's condition stays in: it says a business with a name other than your own needs one, not
  // that every business does.
  summary:
    "The CRA (Canada Revenue Agency) says a business with a name other than your own needs a separate bank account for cheques payable to it; the account's statements are records you keep.",
  next: [SOLE_PROP],
  doneWhen: [
    {
      id: "dw-start-account-named",
      text: "If your business has a name other than your own, you opened a separate bank account to process cheques payable to the business.",
      citation: checked(PAGES.soleProprietorship, Q.separateAccount),
    },
    {
      id: "dw-start-account-billing",
      text: "You bill customers in the name you operate under: your own name, or your registered business name.",
      citation: checked(
        PAGES.soleProprietorship,
        "If you operate as an individual, just bill your customers or clients in your own name.",
        "If you operate under a registered business name, bill your clients and customers in the business's name.",
      ),
    },
    {
      id: "dw-start-account-statements",
      text: "You keep the account's deposit slips, bank statements and cancelled cheques with your records, generally for at least six years from the end of the last tax year they relate to.",
      citation: checked(PAGES.businessRecords, "Keep your duplicate deposit slips, bank statements, and cancelled cheques.", Q.sixYears),
    },
  ],
  needs: [],
  // Left uncited on purpose: no official page sets or names a bank's fees, and the line carries no
  // amount, only a blank the person fills from their own bank.
  costs: [named("cost-start-bank-fees", "Bank account fees (set by your bank)")],
  officialLinks: [],
  citations: [
    checked(PAGES.soleProprietorship, Q.separateAccount),
    checked(PAGES.businessRecords, "Keep your duplicate deposit slips, bank statements, and cancelled cheques."),
  ],
};

/**
 * Keep your records from day one (2026-10-14; the step itself is ./keep-records.ts, shared with the
 * apprentice road). It sits with the other before-you-open steps: records cover what a business spends
 * as well as what it takes in, and spending can start before the first sale. Nothing leads to it, so road
 * evaluation draws it on the path for every idea on this road, like the three steps above; no rule reads it.
 */
const keepRecords = keepRecordsStep(
  {
    step: "step-start-keep-records",
    what: "dw-start-records-what",
    everyTransaction: "dw-start-records-every-transaction",
    how: "dw-start-records-how",
    whereHowLong: "dw-start-records-where-how-long",
  },
  [SOLE_PROP],
);

// ---- Named start-up cost lines (2026-10-12) ----------------------------------------------------------

/**
 * The start-up costs the design names (docs/architecture/future-cockpit.md § 5 and § 6, "The official
 * fees catalog and start-up cost lines as built"), on the first step where the business runs. Names
 * only: each is a blank the person prices through the agree prompt, never an amount DotAmi chose. None
 * cites a source for its name: the BDC and Futurpreneur cash-flow templates keep their lines inside
 * spreadsheets, which the quote checker can't check, and their pages don't list these names.
 */
const startUpCosts: NamedCostLine[] = [
  named("cost-start-tools-equipment", "Tools and equipment"),
  named("cost-start-space-deposit", "Space deposit"),
  named("cost-start-insurance", "Insurance"),
  named("cost-start-vehicle", "Vehicle"),
  named("cost-start-first-materials", "First materials"),
  named("cost-start-software", "Software"),
  named("cost-start-living-while-starting", "Money to live on while starting"),
];

// ---- Legal requirements, from the compliance catalog where it cites one ----------------------------

/**
 * A legal requirement made from a compliance entry: the entry's own citations, unchanged, so the
 * requirement says no more than the catalog already cites (docs/architecture/future-cockpit.md § 6,
 * "Skills, and the government's list for your pick of job, as built"). Throws if the entry is gone, so
 * a renamed entry can't leave a requirement with no source.
 */
function fromCompliance(id: string, label: string, ruleId: string): SkillItem {
  const rule = complianceRulesV2026.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`road 0: no compliance entry ${ruleId} for ${id}`);
  return { id, label, kind: "legal-requirement", citations: [...rule.citations] };
}

const SKILL_GST_HST_REGISTRATION = "skill-ca-gst-hst-registration";

/**
 * Road 0's legal requirements. Only one of its steps has one the compliance catalog cites: once a small
 * supplier is over either of the CRA's $30,000 tests, "You must register for the GST/HST." (a quote the
 * tool found on the CRA's page, in that entry's citation). The entry is already one of the step's cards.
 * Left out on purpose: the payroll and WCB-Alberta accounts (no compliance entry cites them; the hire-first
 * step's done-when lines do), Alberta trades licensing (no road 0 step; some trades only), voluntary
 * registration (a choice), and the ride-share rule (the same registration, a card on the same step).
 */
export const skillItemsStartingAnyBusinessAB: readonly SkillItem[] = [
  fromCompliance(SKILL_GST_HST_REGISTRATION, "A GST/HST registration with the Canada Revenue Agency", "compliance-gst-small-supplier"),
];

// ---- The road ------------------------------------------------------------------------------------

/**
 * Road 0 as `roadFromCfe` builds it, kept as its own value so the federal road (./federal-steps-ca.ts,
 * 2026-10-21) is built from the same parts, less the Alberta-only ones, and can't drift from road 0's
 * federal steps.
 */
export const roadZeroParts: Parameters<typeof roadFromCfe>[0] = {
  id: "road-starting-any-business-ab",
  label: "Starting any business in Alberta (tax and structure)",
  kind: "business",
  provinces: ["AB"],
  // The tax and structure steps for any business: written for no particular job, and says so.
  codes: { occupations: "no-particular-job" },
  nodes: cfeNodesV2026,
  tiers: cfeTiersV2026,
  forks: [
    {
      id: "gstTiming",
      label: "GST timing",
      sides: ["stage-2a-voluntary-gst-registration", "stage-2b-mandatory-gst-registration"],
    },
    {
      id: "incorporationTiming",
      label: "Incorporation timing",
      sides: ["stage-3a-incorporation-80k-net", "stage-3b-incorporation-liability-sred"],
    },
  ],
  engineHints: {
    "stage-1-sole-prop-activation": [
      "writeoff-home-office",
      "writeoff-saas-tools",
      "compliance-hobby-vs-business",
      // From the first ride through an app, the platform may be reporting to the CRA (2026-10-11).
      "compliance-platform-reporting-rideshare",
    ],
    "stage-2a-voluntary-gst-registration": ["grant-sred", "writeoff-cca-class-50", "compliance-gst-small-supplier"],
    "stage-2b-mandatory-gst-registration": [
      "compliance-gst-small-supplier",
      // Registration from the first paid ride, for ride-share and taxi driving (2026-10-11).
      "compliance-gst-taxi-ride-sharing",
    ],
    "stage-3a-incorporation-80k-net": ["grant-on-innovation"],
    "stage-3b-incorporation-liability-sred": ["grant-sred", "grant-irap", "writeoff-rd", "writeoff-cca-class-50"],
    "stage-4-sred-deepening": ["grant-sred", "grant-irap"],
    "stage-4-retained-earnings-planning": ["grant-on-innovation"],
    // The Canada-Alberta Productivity Grant: training costs for employees (2026-10-24, the maintainer's call a-call-1).
    "branch-hire-first-employee": ["writeoff-vehicle", "grant-capg"],
  },
  doneWhen: stageDoneWhen,
  costs: { "stage-1-sole-prop-activation": startUpCosts },
  needs: { "stage-2b-mandatory-gst-registration": [SKILL_GST_HST_REGISTRATION] },
  // SR&ED deepening is about scientific research and experimental development, by its own sources, so
  // a sign painter's map draws it off the path, saying why, instead of "ahead" (issue #40, 2026-10-13).
  // The kinds of work are the three today's rules read for this step (lib/brain/evaluate.ts
  // LIABILITY_SRED_TAGS); tests/research-steps.spec.ts holds the two lists equal. Incorporation for
  // liability/SR&ED isn't marked: it is about liability too, not research only.
  onlyForKindsOfWork: {
    "stage-4-sred-deepening": { tags: ["Software / SaaS", "Manufacturing", "AI / ML / R&D"] },
  },
  addedSteps: [
    { columnId: "tier-1-before", step: registerName },
    { columnId: "tier-1-before", step: permitsBizpal },
    { columnId: "tier-1-before", step: businessAccount },
    { columnId: "tier-1-before", step: keepRecords },
  ],
};

export const roadStartingAnyBusinessAB = roadFromCfe(roadZeroParts);
