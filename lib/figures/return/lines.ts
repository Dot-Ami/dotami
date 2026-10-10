/**
 * [8f] The four T2125 lines the return reader looks for, as the CRA prints them.
 *
 * Source: CRA, Form T2125 "Statement of Business or Professional Activities", 2025 version
 * (T2125 E (25)), https://www.canada.ca/content/dam/cra-arc/formspubs/pbg/t2125/t2125-25e.pdf,
 * read 2026-10-08. Line 8299 is in Part 3C on page 2; 9368 and 9369 in Part 4 and 9946 in Part 5,
 * all on page 3. On the form each line number is printed on its own, just left of the amount box,
 * and the box sits to its right on the same row (8299, 9369 and 9946 in the right-hand column at
 * about 484 points from the page's left edge; 9368 in the middle column at about 382). The same
 * numbers also appear inside sentences ("Gross business income (line 8299 of Part 3C)"); those
 * are mentions, not the line, and the reader skips them.
 *
 * [8f] The lines themselves now live in the cited, versioned catalog
 * (lib/engines/taxlines/v2026/t2125.ts), each with the figure kind a total on it is kept as. This
 * list is read from there, so the reader and the store can't disagree on a number or a label.
 */

import { newestYearRead, taxLinesCatalogV2026 } from "@/lib/engines/taxlines/v2026";
import type { FigureKind } from "../types";

export interface ReturnLine {
  /** The line number as printed. */
  line: string;
  /** The words printed beside it on the newest form read (2025). */
  label: string;
  /** The figure kind a total on this line is kept as. */
  kind: FigureKind;
}

/**
 * The newest form's numbers: the reader looks for the layout of the newest form a person has read.
 * Catalog order (8299, 9368, 9369, 9946), which is the order on the form.
 */
export const T2125_LINES: readonly ReturnLine[] = taxLinesCatalogV2026.entries
  .filter((e) => e.form === "T2125")
  .map((e) => {
    const newest = newestYearRead(e);
    return { line: newest.line, label: newest.printedLabel, kind: e.figureKind };
  });

/** Printed at the top of the form's first page, and how the reader tells one copy from the next. */
export const T2125_TITLE = "Statement of Business or Professional Activities";

/**
 * The form's code as the CRA prints it at the foot of every page: "T2125 E (25)" (or "F" on the
 * French form), as a run of its own. A run may carry more after the version ("T2125 E (25) Page 2
 * of 9"), and the bare code "T2125" alone also counts. A sentence that only NAMES the form ("attach
 * Form T2125", printed on the T1 and Schedule 8) does not: that page isn't a T2125.
 */
export const T2125_CODE = /^T2125(?:\s+[EF]\s*\(\d{2}\)(?:\s.*)?)?$/;

/** "8299, 9368, 9369 and 9946": the lines as they read in a sentence. */
const LINE_LIST = (() => {
  const numbers = T2125_LINES.map((l) => l.line);
  return `${numbers.slice(0, -1).join(", ")} and ${numbers[numbers.length - 1]}`;
})();

/** The sentence under "Choose a PDF" saying what the reader looks for. Built here so it can't drift from the list. */
export const T2125_HINT = `For each T2125 (${T2125_TITLE}) in it, DotAmi shows lines ${LINE_LIST} and the page each is on.`;
