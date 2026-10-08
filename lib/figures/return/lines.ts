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
 * These are READ-ONLY reading aids for this slice, not catalog entries: nothing is proposed or kept
 * from them. When the reader starts proposing figures, the lines move into a cited, versioned
 * catalog under lib/engines/ with the person-read lastVerified the catalogs require.
 */

export interface ReturnLine {
  /** The line number as printed. */
  line: string;
  /** The words printed beside it on the 2025 form. */
  label: string;
}

export const T2125_LINES: readonly ReturnLine[] = [
  { line: "8299", label: "Gross business or professional income" },
  { line: "9368", label: "Total expenses" },
  { line: "9369", label: "Net income (loss) before adjustments" },
  { line: "9946", label: "Your net income (loss)" },
];

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
