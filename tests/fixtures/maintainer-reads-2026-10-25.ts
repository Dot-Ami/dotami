/**
 * The 31 pages the maintainer read in full on 2026-10-25, copied from his reading list of that day (the reading-list
 * page built for him from #211's sources: he ticked "I've read it in full now" on all 31 there, on 2026-10-25). On
 * 2026-10-24 he decided that his reads made with an AI model's help count as a person's read, but only for pages he
 * checked himself; these are those pages (docs/engines/citations.md, § The maintainer's reads of 2026-10-25).
 *
 * Each address and title is copied as the list has it, in its order: the title is the list's, which can differ from a
 * citation's own title, so the test matches on the address only. tests/maintainer-reads.spec.ts holds every
 * catalog citation of these addresses at that read, and no other citation at that day.
 */
export const MAINTAINER_READ_DAY = "2026-10-25";

export const MAINTAINER_READ_PAGES: readonly { title: string; url: string }[] = [
  {
    title: "SR&ED tax incentives: the credit's rates",
    url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/what-are-sred-tax-incentives.html",
  },
  {
    title: "How certain relationships affect the small business deduction and SR&ED investment tax credits",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/business-tax-credits/how-relationships-affect-small-business-deduction-sred-investment-tax-credits.html",
  },
  {
    title: "What's new for corporations",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/whats-new-corporations.html",
  },
  {
    title: "T2 Corporation Income Tax Guide - Small business deduction",
    url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html",
  },
  {
    title: "Determine if you need to register for a payroll account",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/open-manage-payroll-account/determine-need-register.html",
  },
  {
    title: "Where to keep your records, for how long and how to request the permission to destroy them early",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html",
  },
  {
    title: "T4002 Chapter 4 — Capital cost allowance (immediate expensing measures)",
    url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-6.html",
  },
  {
    title: "Income Tax Act s.127(10.2) — expenditure limit",
    url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-127.html",
  },
  {
    title: "Canada-Alberta Productivity Grant",
    url: "https://www.alberta.ca/canada-alberta-productivity-grant",
  },
  {
    title: "Helping small businesses get loans (Canada Small Business Financing Program)",
    url: "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en/canada-small-business-financing-program/find-loan-your-small-business/helping-small-businesses-get-loans",
  },
  {
    title: "Income Tax Regulations s.7307 — the amounts prescribed for the interest and lease caps (ss.67.2, 67.3)",
    url: "https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._945/section-7307.html",
  },
  {
    title: "Employment standards",
    url: "https://www.alberta.ca/employment-standards",
  },
  {
    title: "Business-use-of-home expenses",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html",
  },
  {
    title: "Business income",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html",
  },
  {
    title: "Income Tax Act s.18(1)(a), s.67, s.67.2, s.67.3 — purpose test, reasonableness, interest and lease caps",
    url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-67.3.html",
  },
  {
    title: "Income Tax Act s.245 — General Anti-Avoidance Rule",
    url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-245.html",
  },
  {
    title: "Canada Small Business Financing Program",
    url: "https://ised-isde.canada.ca/site/canada-small-business-financing-program/en",
  },
  {
    title: "When to register for and start charging the GST/HST",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html",
  },
  {
    title: "Scientific Research and Experimental Development (SR&ED) tax incentives",
    url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html",
  },
  {
    title: "GST/HST rates / Harmonized sales tax",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html",
  },
  {
    title: "Motor vehicle expenses",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-expenses/motor-vehicle-expenses.html",
  },
  {
    title: "Sole proprietorship",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html",
  },
  {
    title: "Business registration with the CRA",
    url: "https://www.canada.ca/en/services/taxes/business-registration.html",
  },
  {
    title: "Corporation",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/corporation.html",
  },
  {
    title: "SR&ED claim preparation / SR&ED expenditures",
    url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-claim.html",
  },
  {
    title: "SR&ED glossary",
    url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/glossary.html",
  },
  {
    title: "Set up and manage employee payroll information",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/set-up-new-employee.html",
  },
  {
    title: "Federal incorporation",
    url: "https://ised-isde.canada.ca/site/corporations-canada/en/federal-incorporation",
  },
  {
    title: "Provincial Sales Tax (PST)",
    url: "https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst",
  },
  {
    title: "Employment standards",
    url: "https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards",
  },
  {
    title: "Small business - Your guide to the Employment Standards Act",
    url: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/small-business",
  },
];
