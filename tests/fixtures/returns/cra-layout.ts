/**
 * INVENTED return PDFs laid out like the CRA's own T2125 — never a real return, never a real figure.
 *
 * Where each piece of text sits comes from the CRA's published form: Form T2125 "Statement of
 * Business or Professional Activities", 2025 version (T2125 E (25)),
 * https://www.canada.ca/content/dam/cra-arc/formspubs/pbg/t2125/t2125-25e.pdf, read 2026-10-08
 * by pulling each text run's position out of it with pdf.js. The x/y numbers below are those
 * positions, rounded (PDF points from the page's bottom-left corner; the page is 612 x 792).
 *
 * ASSUMED, not seen: where tax software prints the AMOUNT. The CRA's form is blank; this puts each
 * amount inside the box to the right of its line number, on the same row (right-hand column boxes
 * span about 500 to 575 points, the middle column's about 400 to 478). Every amount here is made up.
 *
 * Only the parts of the form the reader looks at are reproduced: the title and form code (to find a
 * copy), the four lines and the line numbers around them (so the reader must pick the right one),
 * and the sentences that MENTION a line ("line 8299 of Part 3C"), which must not be read as one.
 */

import type { PdfPage, PdfText } from "../../helpers/make-pdf";

const FOOTER: PdfText = { x: 21, y: 23.6, text: "T2125 E (25)" };
const PROTECTED: PdfText[] = [
  { x: 478.4, y: 766.4, text: "Protected B" },
  { x: 531.4, y: 766.4, text: "when completed" },
];

/** Where the amount for each kind of box goes (assumed; see the header). */
const RIGHT_BOX_X = 520;
const MIDDLE_BOX_X = 420;

/** An amount as printed beside a line: the text, or dollars and cents in two boxes. */
export type Printed = string | { dollars: string; cents: string } | null;

export interface T2125Spec {
  /** Amounts beside each line; null or left out = an empty box. */
  amounts?: Partial<Record<"8000" | "8299" | "9368" | "9369" | "9946" | "9945" | "9270", Printed>>;
  /** Move each amount's baseline down by this many points (software rarely lines up exactly). */
  amountDrop?: number;
}

function amountAt(x: number, y: number, printed: Printed | undefined): PdfText[] {
  if (printed === null || printed === undefined) return [];
  if (typeof printed === "string") return [{ x, y, text: printed }];
  return [
    { x, y, text: printed.dollars },
    { x: x + 42, y, text: printed.cents },
  ];
}

/** The three pages of one T2125 the reader cares about (the CRA's pages 1 to 3). */
export function t2125Pages(spec: T2125Spec = {}): PdfPage[] {
  const a = spec.amounts ?? {};
  const drop = spec.amountDrop ?? 0;
  const right = (y: number, p: Printed | undefined) => amountAt(RIGHT_BOX_X, y - drop, p);
  const middle = (y: number, p: Printed | undefined) => amountAt(MIDDLE_BOX_X, y - drop, p);

  const page1: PdfPage = {
    texts: [
      ...PROTECTED,
      { x: 167.6, y: 734.7, text: "Statement of Business or Professional Activities", size: 12 },
      { x: 29.8, y: 715.2, text: "• Use this form to calculate your self-employment business and professional income." },
      { x: 39, y: 663.8, text: "Part 1 – Identification" },
      { x: 39, y: 475.2, text: "Part 2 – Internet business activities" },
      FOOTER,
    ],
  };

  const page2: PdfPage = {
    texts: [
      ...PROTECTED,
      { x: 39, y: 354.8, text: "Part 3C – Gross business or professional income" },
      { x: 484.2, y: 346, text: "8000" },
      { x: 27, y: 341.8, text: "Adjusted gross sales (amount 3G) or adjusted professional fees (amount 3N)" },
      ...right(346, a["8000"]),
      { x: 382.2, y: 331, text: "8290" },
      { x: 39, y: 326.8, text: "Reserves deducted last year" },
      { x: 382.2, y: 304, text: "8230" },
      { x: 42, y: 313.1, text: "Other income (specify):" },
      { x: 579.7, y: 288.8, text: "3O" },
      { x: 484.2, y: 274, text: "8299" },
      { x: 27, y: 269.8, text: "Gross business or professional income" },
      { x: 177.3, y: 269.8, text: ": Line 8000 plus amount 3O" },
      ...right(274, a["8299"]),
      {
        x: 27,
        y: 254.8,
        text: "Report the gross business or professional income from line 8299 on the applicable line of your income tax and benefit return as indicated below:",
      },
      { x: 41.7, y: 239.2, text: "• business income on line 13499" },
      FOOTER,
    ],
  };

  const page3: PdfPage = {
    texts: [
      ...PROTECTED,
      { x: 39, y: 741.8, text: "Part 3D – Cost of goods sold and gross profit" },
      { x: 27, y: 716.8, text: "Gross business income (line 8299 of Part 3C)." },
      { x: 39, y: 573.8, text: "Part 4 – Net income (loss) before adjustments" },
      { x: 179.5, y: 560.8, text: "(line 8299 of Part 3C) or" },
      { x: 382.2, y: 304, text: "9936" },
      { x: 480, y: 304.1, text: "4U" },
      { x: 382.2, y: 289, text: "9270" },
      { x: 33, y: 289.2, text: "Other expenses (specify):" },
      ...middle(289, a["9270"]),
      { x: 480, y: 289.1, text: "4V" },
      { x: 382.2, y: 277, text: "9368" },
      { x: 220.3, y: 276.2, text: "Total expenses" },
      { x: 278.1, y: 276.2, text: ": Total of amounts 4B to 4V" },
      ...middle(277, a["9368"]),
      { x: 484.2, y: 262, text: "9369" },
      { x: 27, y: 257.8, text: "Net income (loss) before adjustments" },
      { x: 169.7, y: 257.8, text: ": Amount 4A minus" },
      { x: 241.7, y: 257.8, text: "line 9368" },
      ...right(262, a["9369"]),
      { x: 39, y: 234.8, text: "Part 5 – Your net income (loss)" },
      { x: 33, y: 221.8, text: "Your share of line 9369 or the amount from your T5013 slip, Statement of Partnership Income." },
      { x: 480, y: 226.3, text: "5A" },
      { x: 484.2, y: 166, text: "9943" },
      { x: 484.2, y: 142, text: "9945" },
      { x: 27, y: 137.8, text: "Business-use-of-home expenses (amount 7P)" },
      ...right(142, a["9945"]),
      { x: 484.2, y: 130, text: "9946" },
      { x: 27, y: 125.8, text: "Your net income (loss)" },
      { x: 113.2, y: 125.8, text: ": Amount 5D minus" },
      { x: 185.7, y: 125.8, text: "line 9945" },
      ...right(130, a["9946"]),
      { x: 27, y: 113.8, text: "Report the net income amount from line 9946 on the applicable line of your income tax and benefit return as indicated below:" },
      FOOTER,
    ],
  };

  return [page1, page2, page3];
}

/** A page of another form, the way a full return has them around the T2125 (invented, no figures that matter). */
export function otherFormPage(title: string, code: string): PdfPage {
  return {
    texts: [
      ...PROTECTED,
      { x: 167.6, y: 734.7, text: title, size: 12 },
      { x: 27, y: 600, text: "Business income" },
      { x: 382.2, y: 600, text: "13499" },
      { x: 420, y: 600, text: "1,000.00" },
      { x: 21, y: 23.6, text: code },
    ],
  };
}

/** One invented business's amounts, the ones the browser test and most unit tests use. They add up. */
export const INVENTED_AMOUNTS = {
  "8000": "48,250.00",
  "8299": "48,250.00",
  "9270": "1,230.45",
  "9368": "12,730.45",
  "9369": "35,519.55",
  "9945": "2,500.00",
  "9946": "33,019.55",
} as const;
