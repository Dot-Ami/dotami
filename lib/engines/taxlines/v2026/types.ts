import type { EngineCitation } from "@/lib/engines/shared/types";
import type { FigureKind } from "@/lib/figures/types";

/**
 * [8f] The tax-line catalog: which CRA form line each of DotAmi's tax-form figure kinds goes on.
 *
 * A line is read from the CRA's own form for one tax year at a time. The form is reissued every
 * year and the CRA can renumber a line from one year's form to the next, so a
 * line is only ever shown for a year listed in `yearsRead`. Any other year is "not read yet", never
 * the nearest year's number. Years are read in stages, starting with 2025 (the maintainer's
 * decision, 2026-10-07): a year is added when someone needs it and a person has read that year's
 * form.
 */

/** The forms this catalog has lines for. Only the T2125 so far. */
export type TaxFormCode = "T2125";

/** One tax year's form, read by a person: where the line is and what the form prints beside it. */
export interface TaxLineYearRead {
  /** The tax year the form is for. */
  taxYear: number;
  /** The form's code as printed at the foot of each page, e.g. "T2125 E (25)". */
  formVersion: string;
  /** The line number printed on that year's form. A string: CRA numbers are labels, not amounts. */
  line: string;
  /** The words the form prints beside the line, as printed. */
  printedLabel: string;
  /** Where on the form, for a person checking it: "Part 3C, page 2". */
  whereOnForm: string;
  /** The CRA form (and guide, where it has a section on the line) this was read from. */
  citations: EngineCitation[];
}

export interface TaxLineEntry {
  /** Catalog id, permanent: "<form>-<what it is>", never the line number (numbers can move). */
  id: string;
  form: TaxFormCode;
  /**
   * The figure kind (lib/figures/types.ts FIGURE_KINDS) a total on this line is kept as. Its plain
   * name is FIGURE_KIND_LABELS there, so the name isn't written twice.
   */
  figureKind: FigureKind;
  /** One plain sentence on what the amount is, in the CRA's terms. */
  description: string;
  /** Oldest first. Empty would mean the line is known by name only; every entry has at least one. */
  yearsRead: readonly TaxLineYearRead[];
}
