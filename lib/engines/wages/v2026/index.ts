import { wageData } from "./data";
import { levelOfSourceCode } from "./levels";
import type { WageBasis, WageData, WageGeographyKind, WageLevel } from "./types";

export { levelOfSourceCode, NOT_PUBLISHED } from "./levels";
export type { WageBasis, WageData, WageDataRow, WageGeographyKind, WageGeographyRow, WageLevel } from "./types";

/**
 * Job Bank's published wages for each job group, from its 2025 open-data file (research note 25s; task 25i;
 * the maintainer's K5 B of 2026-10-16). A catalog like every other: code, never rows in the database, and
 * read-only. The *About this job* panel (25h) reads it, on the server only (lib/about-job/view.ts), so the
 * module never reaches the browser.
 *
 * What a caller gets is the file's own row, word for word, and nothing worked out from another row: the level
 * comes from the row's source code (./levels.ts), never its region name, and a combination the file has no row
 * for comes back as missing, never as a neighbour's row. A row the file has but publishes no figures for (`N/A`)
 * comes back as that row, with its comment, so a screen can say so (docs/ui-spec/cockpit/about-this-job.md § 2).
 *
 * A wage here is what workers in the job group were paid: never the person's income, and never added to a
 * cost, a total or a gauge (CLAUDE.md, "Never invent a number"). Low, median and high are kept as the file's
 * text for that reason as much as for exactness.
 */

/** One row of the wage file, as a caller gets it. */
export interface WageRow {
  /** The job group's NOC 2021 code, five digits ("72311"). */
  noc: string;
  /** Where the row sits in the file: its code, what kind of code it is, the file's province code and name. */
  geography: { code: string; kind: WageGeographyKind; province: string; name: string };
  /** The `Source…_NHQ` column, word for word ("LFS 2023-24 PR NOC5"; "N/A" when not published). */
  sourceCode: string;
  /** What the source code says the row is (./levels.ts). */
  level: WageLevel;
  /** The `Data_Source_E` column, word for word ("Labour Force Survey"; may be "NA" or empty). */
  method: string;
  basis: WageBasis;
  /** The file's text for each figure ("19.23"), or null where the file leaves it empty. */
  low: string | null;
  median: string | null;
  high: string | null;
  /** The `Reference_Period` column, word for word ("2023-2024"; "NA" when not published). */
  referencePeriod: string;
  revisionDate: string;
  /** The `Wage_Comment_E` column, word for word; "" when the file has none. */
  comment: string;
}

/** A look-up's answer: the file's row, or a plain "the file has no row for this". */
export type WageLookup = { found: true; row: WageRow } | { found: false; noc: string; geography: string; missing: string };

const NOC = /^\d{5}$/;
const REGION = /^(?:ER)?(\d{4})$/;

/** What kind of code it is, by its shape: ER00 Canada, ER + 2 digits a province, ER + 4 digits a region. */
function kindOf(code: string): WageGeographyKind {
  if (code === "ER00") return "canada";
  return code.length === 4 ? "province" : "economic-region";
}

/**
 * The look-ups over one set of wage data: the committed file's (`wages`, below), or a set a test builds from
 * a planted file. Built lazily, so loading the module costs nothing until a look-up runs.
 */
export function createWageLookup(data: WageData) {
  let index: Map<string, number> | null = null;
  const geographies = new Map(data.geographies.map(([code, province, name]) => [code, { code, province, name }]));
  const wholeProvince = new Map(data.wholeProvince.map(([province, code]) => [province, code]));
  const key = (noc: string, code: string) => `${noc} ${code}`;

  function rowAt(i: number): WageRow {
    const [noc, code, low, median, high, source, method, period, annual, comment, revised] = data.rows[i];
    const place = geographies.get(code);
    // The import writes every row's code into `geographies`; a row without one is a broken module.
    if (!place) throw new Error(`the wage data has a row for ${code}, which isn't in its list of geographies`);
    const sourceCode = data.sourceCodes[source];
    return {
      noc,
      geography: { ...place, kind: kindOf(code) },
      sourceCode,
      level: levelOfSourceCode(sourceCode),
      method: data.methods[method],
      basis: annual === 1 ? "annual" : "hourly",
      low,
      median,
      high,
      referencePeriod: data.periods[period],
      revisionDate: data.revisionDates[revised],
      comment: data.comments[comment],
    };
  }

  /** The file's row for one job and one geography code, exactly; missing when the file has none. */
  function exact(noc: string, code: string): WageLookup {
    if (!NOC.test(noc)) throw new Error(`"${noc}" isn't a five-digit NOC 2021 code like 72311`);
    index ??= new Map(data.rows.map((row, i) => [key(row[0], row[1]), i]));
    const at = index.get(key(noc, code));
    if (at === undefined) return { found: false, noc, geography: code, missing: `The wage file has no row for job group ${noc} in ${code}.` };
    return { found: true, row: rowAt(at) };
  }

  return {
    /**
     * The row for a job group in one economic region, by its four-digit code ("4830" or the file's "ER4830").
     * Exactly that row, whatever its source code says it is; never another region's or the province's.
     */
    forRegion(noc: string, region: string): WageLookup {
      const match = REGION.exec(region);
      if (!match) throw new Error(`"${region}" isn't an economic region's four-digit code like 4830 (or ER4830)`);
      return exact(noc, `ER${match[1]}`);
    },

    /**
     * The row for a job group in a province or territory as a whole, by the file's own province code ("AB";
     * the file spells Yukon "YK", the Northwest Territories "NWT" and Prince Edward Island "PEI"). That is the
     * province's own two-digit code's row (ER48 for Alberta), or the one code of a place that has no such row
     * (ER1110 for Prince Edward Island): whichever the import read from the file. Missing when the file gives
     * the place no row as a whole.
     */
    forProvince(noc: string, province: string): WageLookup {
      const code = wholeProvince.get(province);
      if (code === undefined) {
        if (!NOC.test(noc)) throw new Error(`"${noc}" isn't a five-digit NOC 2021 code like 72311`);
        return { found: false, noc, geography: province, missing: `The wage file has no row for ${province} as a whole.` };
      }
      return exact(noc, code);
    },

    /** The geography code of a province's row as a whole, as the import read it, or undefined. */
    wholeProvinceCode(province: string): string | undefined {
      return wholeProvince.get(province);
    },

    /**
     * The row for a job group in Canada as a whole (`ER00`), the row a note "at the national level" points to
     * (task 25h). Missing when the file has none.
     */
    forCanada(noc: string): WageLookup {
      return exact(noc, "ER00");
    },

    /** The file's English name for a geography code ("ER48" → "Alberta"), or undefined for a code it doesn't give. */
    geographyName(code: string): string | undefined {
      return geographies.get(code)?.name;
    },
  };
}

/** The look-ups over the committed 2025 wage file. */
export const wages = createWageLookup(wageData);
