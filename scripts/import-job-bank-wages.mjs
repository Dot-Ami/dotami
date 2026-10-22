// Turns Job Bank's 2025 wage file, published by Employment and Social Development Canada on open.canada.ca,
// into DotAmi's wage module: lib/engines/wages/v2026/data.ts (task 25i; research note 25s; the maintainer's
// K5 B of 2026-10-16, and his word of 2026-10-21 that the build may download this file, pinned by checksum
// like the other government files).
//
// A developer script. It is never shipped (the installer copies the built app, not scripts/), and it is
// outside the app's network check (tests/helpers/source-scan.ts doesn't read scripts/), so the download is
// never something DotAmi does on a person's computer; it runs only when a builder asks for it. It fetches the
// open-data file only, never Job Bank's own pages (their terms bar scripts: the job-bank-pages card).
//
//   node scripts/import-job-bank-wages.mjs              Rebuilds the module from data/job-bank-wages-2025/.
//   node scripts/import-job-bank-wages.mjs --check      Rebuilds it in memory and fails if the committed module differs.
//   node scripts/import-job-bank-wages.mjs --download   Fetches the file first; it is written only when its SHA-256
//                                                       is the one pinned in WAGE_FILES, then the module is rebuilt.
//
// One small adapter on the research kit's import core (scripts/lib/import-kit.mjs), which does the reading,
// pins, header, --check and --download. What is left here is the wage file's own: its pin, and how its rows
// become the module. Wages only: the module keeps each row's job group, geography, source code, method, basis,
// low / median / high, reference period, comment and revision date, and leaves out the average, the quartiles,
// the French columns and the share of employees with non-wage benefits (its definition isn't cited). The file
// has no outlook columns, and none would be read.

import { defineImport, evenText, fingerprint, importAppModule, runIfMain } from "./lib/import-kit.mjs";

export { evenText, fingerprint };

const { levelOfSourceCode, NOT_PUBLISHED } = await importAppModule("lib/engines/wages/v2026/levels.ts");

/** Where the file is kept, relative to the repo's top folder. */
export const WAGE_DATA_DIR = "data/job-bank-wages-2025";
/** The module the import writes, relative to the repo's top folder. */
export const WAGE_MODULE_PATH = "lib/engines/wages/v2026/data.ts";

/**
 * The one file, as published on the dataset's page (its address is on the registry card "job-bank-wages").
 * `sha256` pins it: the fingerprint of its text, taken as `fingerprint` takes it (byte-order mark dropped, line
 * endings evened out). Downloaded 2026-10-21: 17,981,889 bytes, UTF-8 with a byte-order mark and "\r\n" line
 * endings (git stores "\n"), 44,376 rows.
 * A new file from the government means updating this by hand, on purpose.
 */
const WAGES = defineImport({
  name: "import-job-bank-wages",
  label: "Job Bank wages",
  script: "scripts/import-job-bank-wages.mjs",
  pinsName: "WAGE_FILES",
  sourceId: "job-bank-wages",
  dataDir: WAGE_DATA_DIR,
  modulePath: WAGE_MODULE_PATH,
  files: [
    {
      key: "wages",
      name: "2a71-das-wage2025opendata-esdc-all-19nov2025-vf.csv",
      sha256: "9be9c52da5f9a5329f3a1d0a7130035c07a9b4af8aca7cba91d8057e46199441",
      encoding: "utf-8",
    },
  ],
  build: (texts) => buildWageModule(texts),
});

/** The file, with its key, name, download address, pinned SHA-256 and encoding. */
export const WAGE_FILES = WAGES.files;

/**
 * Rows of a comma-separated file. A field may be in double quotes (the comments are, since they hold commas),
 * with "" for a quote inside it. The text has no byte-order mark and "\n" line endings (evenText). A last
 * empty line is not a row.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("the file ends inside a quoted field");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** The columns the import reads, by the file's own names. The source column is found by its prefix (below). */
const COLUMNS = {
  noc: "NOC_CNP",
  province: "prov",
  code: "ER_Code_Code_RE",
  name: "ER_Name",
  low: "Low_Wage_Salaire_Minium",
  median: "Median_Wage_Salaire_Median",
  high: "High_Wage_Salaire_Maximal",
  method: "Data_Source_E",
  period: "Reference_Period",
  revised: "Revision_Date_Date_revision",
  annual: "Annual_Wage_Flag_Salaire_annuel",
  comment: "Wage_Comment_E",
};
/** The source column has the file's year in its name ("Source2025_NHQ"), so it is found by its start. */
const SOURCE_COLUMN = /^Source\d{4}_/;

const NOC = /^NOC_(\d{5})$/;
const GEOGRAPHY = /^ER(\d{2}|\d{4})$/;
const FIGURE = /^\d+(?:\.\d+)?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The wage data (lib/engines/wages/v2026/types.ts, WageData) from the file's text, byte-order mark included.
 * Throws, naming the line and what is wrong, on a file that isn't UTF-8 with a byte-order mark, a missing
 * column, a row of the wrong length, a job or geography code of the wrong shape, a figure that isn't a plain
 * number, a row marked N/A that has figures, a geography code with two names or provinces, a job group listed
 * twice for one geography, or a source code that names two levels. Nothing is filled in: an empty figure stays
 * empty (null), and a row the file doesn't have is not made up.
 */
export function readWageFile(text, { name = WAGE_FILES[0].name } = {}) {
  // The import core has already refused bytes that aren't UTF-8; this file also starts with a byte-order mark,
  // and one without it isn't the file as published.
  if (!text.startsWith("﻿")) throw new Error(`${name} should be UTF-8 with a byte-order mark, and has no byte-order mark`);
  const [header, ...rows] = parseCsv(evenText(text));
  const at = {};
  for (const [key, column] of Object.entries(COLUMNS)) {
    at[key] = header.indexOf(column);
    if (at[key] < 0) throw new Error(`${name} has no column ${column}`);
  }
  const sources = header.filter((h) => SOURCE_COLUMN.test(h));
  if (sources.length !== 1) throw new Error(`${name} should have one source column like Source2025_NHQ, and has ${sources.length}`);
  at.source = header.indexOf(sources[0]);

  // Each word that repeats is listed once, in the order it first appears, and rows point at it by number.
  const lists = { sourceCodes: [], methods: [], periods: [], comments: [], revisionDates: [] };
  const numberOf = (list, value) => {
    const i = lists[list].indexOf(value);
    if (i >= 0) return i;
    lists[list].push(value);
    return lists[list].length - 1;
  };
  const geographies = new Map();
  const seen = new Set();
  const out = [];
  rows.forEach((row, i) => {
    const line = i + 2;
    const where = `${name}, line ${line}`;
    if (row.length !== header.length) throw new Error(`${where} has ${row.length} fields, not ${header.length}`);
    const noc = NOC.exec(row[at.noc]);
    if (!noc) throw new Error(`${where}: "${row[at.noc]}" isn't a job group like NOC_72311`);
    const code = row[at.code];
    if (!GEOGRAPHY.test(code)) throw new Error(`${where}: "${code}" isn't a geography code like ER48 or ER4830`);
    const province = row[at.province];
    const place = row[at.name];
    if (province === "" || place === "") throw new Error(`${where}: the geography ${code} has no province or no name`);
    const known = geographies.get(code);
    if (!known) geographies.set(code, { province, place });
    else if (known.province !== province || known.place !== place) {
      throw new Error(`${where}: ${code} is "${province}, ${place}" here and "${known.province}, ${known.place}" earlier`);
    }
    if ((code === "ER00") !== (province === "NAT")) throw new Error(`${where}: ER00 is Canada's code and NAT its province code; this row has ${code} and ${province}`);
    const key = `${noc[1]} ${code}`;
    if (seen.has(key)) throw new Error(`${where}: job group ${noc[1]} has a second row for ${code}`);
    seen.add(key);

    const figures = [row[at.low], row[at.median], row[at.high]];
    for (const figure of figures) {
      if (figure !== "" && !FIGURE.test(figure)) throw new Error(`${where}: "${figure}" isn't a figure like 19.23`);
    }
    const source = row[at.source];
    if (source === "") throw new Error(`${where} has no source code (the file says N/A for a row it doesn't publish)`);
    if (source === NOT_PUBLISHED && figures.some((f) => f !== "")) throw new Error(`${where} is marked ${NOT_PUBLISHED} but has figures`);
    try {
      levelOfSourceCode(source);
    } catch (error) {
      throw new Error(`${where}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const annual = row[at.annual];
    if (annual !== "0" && annual !== "1") throw new Error(`${where}: the annual flag is "${annual}", not 0 or 1`);
    const period = row[at.period];
    if (period === "") throw new Error(`${where} has no reference period (the file says NA for a row it doesn't publish)`);
    const revised = row[at.revised];
    if (!DAY.test(revised)) throw new Error(`${where}: the revision date "${revised}" isn't a day like 2025-11-19`);

    out.push([
      noc[1],
      code,
      ...figures.map((f) => (f === "" ? null : f)),
      numberOf("sourceCodes", source),
      numberOf("methods", row[at.method]),
      numberOf("periods", period),
      Number(annual),
      numberOf("comments", row[at.comment]),
      numberOf("revisionDates", revised),
    ]);
  });
  if (out.length === 0) throw new Error(`${name} has no rows`);

  // The row for each province or territory as a whole: its ER + two-digit code where the file has one, or the
  // one code of a place the file gives only one (Prince Edward Island's ER1110). Read from the codes, never
  // from a name; a place with several regions and no two-digit code gets none.
  const byProvince = new Map();
  for (const [code, { province }] of geographies) {
    if (province === "NAT") continue;
    if (!byProvince.has(province)) byProvince.set(province, []);
    byProvince.get(province).push(code);
  }
  const wholeProvince = [];
  for (const [province, codes] of byProvince) {
    const own = codes.filter((c) => c.length === 4);
    if (own.length > 1) throw new Error(`${name}: ${province} has two codes of its own (${own.join(", ")})`);
    if (own.length === 1) wholeProvince.push([province, own[0]]);
    else if (codes.length === 1) wholeProvince.push([province, codes[0]]);
  }

  return {
    file: { name, sha256: fingerprint(text) },
    geographies: [...geographies].map(([code, { province, place }]) => [code, province, place]),
    wholeProvince,
    ...lists,
    rows: out,
  };
}

/** The module's text from the file's text: { wages }. */
export function buildWageModule(texts) {
  const data = readWageFile(texts.wages);
  const q = (value) => JSON.stringify(value);
  const list = (values) => values.map((v) => `    ${q(v)},`);
  return [
    // The licence's attribution line and the dataset, from the registry card (scripts/lib/import-kit.mjs).
    ...WAGES.header(
      `Generated by scripts/import-job-bank-wages.mjs from the file in ${WAGE_DATA_DIR}/. Don't edit it by hand: npm run data:check and tests/wages-import.spec.ts rebuild it and fail on any difference. Wages only, as the file gives them: what workers in a job group were paid, never a person's income, and never added to a cost, a total or a gauge.`,
    ),
    "",
    'import type { WageData } from "./types";',
    "",
    "export const wageData: WageData = {",
    `  file: { name: ${q(data.file.name)}, sha256: ${q(data.file.sha256)} },`,
    "  // [geography code, the file's province code, the file's English name], in the file's order.",
    "  geographies: [",
    ...data.geographies.map((g) => `    [${g.map(q).join(", ")}],`),
    "  ],",
    "  // [province code, the geography code of its row as a whole], read from the file's codes.",
    "  wholeProvince: [",
    ...data.wholeProvince.map((p) => `    [${p.map(q).join(", ")}],`),
    "  ],",
    "  sourceCodes: [",
    ...list(data.sourceCodes),
    "  ],",
    "  methods: [",
    ...list(data.methods),
    "  ],",
    "  periods: [",
    ...list(data.periods),
    "  ],",
    "  comments: [",
    ...list(data.comments),
    "  ],",
    "  revisionDates: [",
    ...list(data.revisionDates),
    "  ],",
    "  // [NOC, geography code, low, median, high, source code, method, period, annual (1) or hourly (0), comment,",
    "  // revision date]: figures as the file's text (null where empty), the rest numbers into the lists above.",
    "  rows: [",
    ...data.rows.map((r) => `    ${q(r)},`),
    "  ],",
    "};",
    "",
  ].join("\n");
}

/** The whole run (rebuild, --check or --download); returns the exit code. */
export const main = WAGES.main;

// Run only when called as a script, not when a test imports it.
await runIfMain(import.meta.url, WAGES);
