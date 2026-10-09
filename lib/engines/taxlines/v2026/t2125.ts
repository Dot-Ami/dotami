import type { EngineCitation } from "@/lib/engines/shared/types";
import type { TaxLineEntry } from "./types";

/**
 * [8f] The four T2125 totals: gross income, total expenses, net income before adjustments and net
 * income. Read 2026-10-08 from the CRA's 2025 form (T2125 E (25), the text pdf.js reads from the
 * standard-print PDF, page by page) and, where it has a section on the line, Guide T4002.
 *
 * What the form says about GST/HST matters for the rest of DotAmi: line 8299 is built from amount 3A
 * (gross sales "include GST/HST collected or collectible") minus amount 3B (GST/HST, provincial sales
 * tax, returns, allowances, discounts), so 8299 is a total WITHOUT the GST/HST collected. It is not
 * the "gross-revenue" figure the GST/HST small-supplier card counts, and the card never reads it
 * (lib/brain/records.ts; tests/brain-records.spec.ts).
 *
 * The farming (T2042) and fishing (T2121) forms have their own lines (the guide's line 9899 is
 * farming's net income before adjustments); this catalog has the business and professional form only.
 */

const READ = "2026-10-08";

/** The 2025 form itself: every line below is read from it. */
const FORM_2025: EngineCitation = {
  title: "Form T2125, Statement of Business or Professional Activities, 2025 (T2125 E (25))",
  authority: "CRA",
  jurisdiction: "CA",
  url: "https://www.canada.ca/content/dam/cra-arc/formspubs/pbg/t2125/t2125-25e.pdf",
  lastVerified: READ,
  note:
    "Read 2026-10-08, the standard-print PDF listed as the current (2025) version on the CRA's T2125 page (page details dated 2026-05-01). Nine pages, each footed 'T2125 E (25)'.",
};

/** Guide T4002, Chapter 2 (Income), the 2025 guide (T4002(E) Rev. 25). */
const GUIDE_INCOME: EngineCitation = {
  title: "Guide T4002, Self-employed Business, Professional, Commission, Farming, and Fishing Income 2025, Chapter 2: Income",
  authority: "CRA",
  jurisdiction: "CA",
  url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-4.html",
  lastVerified: READ,
  note:
    "Read 2026-10-08 (page details dated 2026-04-16). Section 'Line 8299 – Gross business or professional income': line 8000 (adjusted gross sales or adjusted professional fees) plus reserves deducted last year (line 8290) plus other income (line 8230). Amount 3A includes GST/HST collected or collectible; amount 3B, included in 3A, is the GST/HST, provincial sales tax, returns, allowances and discounts.",
};

/** Guide T4002, Chapter 3 (Expenses), which also covers Parts 4 and 5 of the form. */
const GUIDE_EXPENSES: EngineCitation = {
  title: "Guide T4002, Self-employed Business, Professional, Commission, Farming, and Fishing Income 2025, Chapter 3: Expenses",
  authority: "CRA",
  jurisdiction: "CA",
  url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002/t4002-5.html",
  lastVerified: READ,
  note:
    "Read 2026-10-08 (page details dated 2026-04-16). Section 'Line 9899 or 9369 – Net income (loss) before adjustments': for business and professional income, line 9369 on Form T2125, the gross income minus the total expenses, a loss in brackets. Section 'Line 9946 – Your net income (loss)': your net income or loss, a loss in brackets. The chapter has no section of its own for line 9368; the form defines it.",
};

export const t2125LinesV2026: readonly TaxLineEntry[] = [
  {
    id: "t2125-gross-business-income",
    form: "T2125",
    figureKind: "business-gross-income",
    description:
      "Gross business or professional income for the year: sales, commissions or fees after taking out the GST/HST, provincial sales tax, returns, allowances and discounts, plus last year's reserves and other income.",
    yearsRead: [
      {
        taxYear: 2025,
        formVersion: "T2125 E (25)",
        line: "8299",
        printedLabel: "Gross business or professional income",
        whereOnForm: "Part 3C, page 2",
        citations: [
          {
            ...FORM_2025,
            note: `${FORM_2025.note} Line 8299, Part 3C, page 2: 'Gross business or professional income: Line 8000 plus amount 3O'. Part 3A: amount 3A is gross sales 'include GST/HST collected or collectible'; amount 3B (GST/HST, provincial sales tax, returns, allowances, discounts and GST/HST adjustments) is included in 3A and subtracted from it. The form says to report line 8299 on line 13499 (business), 13699 (professional) or 13899 (commission) of the return.`,
          },
          GUIDE_INCOME,
        ],
      },
    ],
  },
  {
    id: "t2125-total-business-expenses",
    form: "T2125",
    figureKind: "business-total-expenses",
    description: "The total of the business expenses claimed on the form (amounts 4B to 4V), before business-use-of-home expenses.",
    yearsRead: [
      {
        taxYear: 2025,
        formVersion: "T2125 E (25)",
        line: "9368",
        printedLabel: "Total expenses",
        whereOnForm: "Part 4, page 3",
        citations: [
          {
            ...FORM_2025,
            note: `${FORM_2025.note} Line 9368, Part 4, page 3: 'Total expenses: Total of amounts 4B to 4V'. Business-use-of-home expenses are not in it: they are line 9945, in Part 5.`,
          },
        ],
      },
    ],
  },
  {
    id: "t2125-net-business-income-before-adjustments",
    form: "T2125",
    figureKind: "business-net-income-before-adjustments",
    description: "Gross income (or gross profit) minus total expenses, before a partner's share and business-use-of-home expenses. A loss is negative.",
    yearsRead: [
      {
        taxYear: 2025,
        formVersion: "T2125 E (25)",
        line: "9369",
        printedLabel: "Net income (loss) before adjustments",
        whereOnForm: "Part 4, page 3",
        citations: [
          {
            ...FORM_2025,
            note: `${FORM_2025.note} Line 9369, Part 4, page 3: 'Net income (loss) before adjustments: Amount 4A minus line 9368', where amount 4A is gross business or professional income (line 8299) or gross profit (line 8519).`,
          },
          GUIDE_EXPENSES,
        ],
      },
    ],
  },
  {
    id: "t2125-net-business-income",
    form: "T2125",
    figureKind: "business-net-income",
    description: "Your net income (loss) from the business: your share of the income before adjustments, plus the Canadian journalism labour tax credit and any GST/HST rebate for partners, less other deductible amounts and business-use-of-home expenses. A loss is negative.",
    yearsRead: [
      {
        taxYear: 2025,
        formVersion: "T2125 E (25)",
        line: "9946",
        printedLabel: "Your net income (loss)",
        whereOnForm: "Part 5, page 3",
        citations: [
          {
            ...FORM_2025,
            note: `${FORM_2025.note} Line 9946, Part 5, page 3: 'Your net income (loss): Amount 5D minus line 9945' (line 9945 is business-use-of-home expenses). The form says to report line 9946 on line 13500 (business), 13700 (professional) or 13900 (commission) of the return.`,
          },
          GUIDE_EXPENSES,
        ],
      },
    ],
  },
];
