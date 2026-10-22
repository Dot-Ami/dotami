/**
 * The shape of Job Bank's published wages, as scripts/import-job-bank-wages.mjs writes them into ./data.ts
 * (docs/architecture/research-kit.md § 4.2 and § 5.4; research note 25s). Compact on purpose: the file has
 * 44,376 rows, so each row is one short tuple and the words that repeat (source codes, methods, periods,
 * comments, revision dates) are listed once and pointed at by number.
 *
 * Wages only. The file's average, quartiles, French columns and its share of employees with non-wage
 * benefits are left out, and there is no outlook field at all (K5 C was not picked).
 */

/**
 * The level a row's own source code says it is, read from the code's token alone (./levels.ts), never from
 * the row's region name: `CAN` national, `PR` a province or territory as a whole, `ER` an economic region.
 * `not-stated` for a code with none of those tokens (`CIHI 2023-24`, `JUDGE 2024`, `Yukon 2023-24`, and
 * `LFS 2023-24 ATL NOC5`, as docs/ui-spec/cockpit/about-this-job.md reads it); `not-published` for `N/A`, a
 * row the government did not publish figures for.
 */
export type WageLevel = "national" | "province" | "economic-region" | "not-stated" | "not-published";

/** Hourly, or annual where the file's `Annual_Wage_Flag_Salaire_annuel` is 1. */
export type WageBasis = "hourly" | "annual";

/**
 * What a geography code is, by its shape in the file: `ER00` Canada, `ER` + two digits a province or
 * territory (`ER48` Alberta), `ER` + four digits an economic region (`ER4830` Calgary). This is the row's
 * place in the file, not its level: Hairstylists and barbers under `ER4830` carries a `PR` code.
 */
export type WageGeographyKind = "canada" | "province" | "economic-region";

/** [geography code "ER4830", the file's province code "AB", the file's English name "Calgary"]. */
export type WageGeographyRow = readonly [code: string, province: string, name: string];

/**
 * One row of the file: [job group (NOC 2021, five digits), geography code, low, median, high, source code,
 * method, reference period, 1 when annual and 0 when hourly, comment, revision date]. Low, median and high are
 * the file's own text ("19.23"), null where the file leaves the field empty; the rest are numbers pointing into
 * the lists of the same name in WageData.
 */
export type WageDataRow = readonly [
  noc: string,
  geography: string,
  low: string | null,
  median: string | null,
  high: string | null,
  source: number,
  method: number,
  period: number,
  annual: 0 | 1,
  comment: number,
  revised: number,
];

export interface WageData {
  /** The file the import read, with the SHA-256 of its text (no byte-order mark, "\n" line endings). */
  file: { name: string; sha256: string };
  /** Every geography code the file gives, with its province code and English name, in the file's order. */
  geographies: readonly WageGeographyRow[];
  /**
   * [province code, the geography code of its row as a whole]: its `ER` + two-digit code, or, for a province
   * or territory the file gives no such code (Prince Edward Island, Yukon, the Northwest Territories and
   * Nunavut in 2025), the one code it has. Read from the file's codes by the import; never assumed.
   */
  wholeProvince: readonly (readonly [province: string, geography: string])[];
  /** The `Source…_NHQ` column's values, as the file gives them ("EI 2023-24 ER NOC5", "N/A"). */
  sourceCodes: readonly string[];
  /** The `Data_Source_E` column's values ("Labour Force Survey"; "NA" and "" are kept as the file has them). */
  methods: readonly string[];
  /** The `Reference_Period` column's values ("2023-2024", "2024", "2021", "NA"). */
  periods: readonly string[];
  /** The `Wage_Comment_E` column's values, "" for none. */
  comments: readonly string[];
  /** The `Revision_Date_Date_revision` column's values ("2025-11-19"). */
  revisionDates: readonly string[];
  /** Every row, in the file's order. */
  rows: readonly WageDataRow[];
}
