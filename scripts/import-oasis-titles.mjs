// Turns the government of Canada's OaSIS 2025 Version 1.0 "Example Titles" file into DotAmi's module of job
// titles: lib/engines/oasis/v2026/titles.ts. They are the words "What's closest to your work?" searches
// (docs/ui-spec/futures/01-whats-closest-to-your-work.md; research note 28f), keyed to the same 7-character
// OaSIS codes as the four files scripts/import-oasis.mjs reads.
//
// A developer script, like every importer: never shipped, outside the app's network check, and the download
// below runs only when a builder asks for it (scripts/lib/import-kit.mjs says more).
//
//   node scripts/import-oasis-titles.mjs              Rebuilds the module from the file in data/oasis-2025-v1.0/.
//   node scripts/import-oasis-titles.mjs --check      Checks the file against its pin, rebuilds the module in memory
//                                                     and fails if the committed module differs.
//   node scripts/import-oasis-titles.mjs --download   Fetches a fresh copy first; written only when its SHA-256 is
//                                                     the one pinned in OASIS_TITLES_FILES.
//
// The dataset's title, publisher, page, file address, licence and credit line come from its card in the source
// registry ("oasis-2025-example-titles", lib/engines/research-kit/v2026/registry.ts). Exit code 0 when it
// worked (or the check matched), 1 when it didn't, 2 for a usage error.

import { defineImport, expectHeader, fingerprint, parseCsv, runIfMain } from "./lib/import-kit.mjs";

/** Where the file is kept (beside the other OaSIS files), relative to the repo's top folder. */
export const OASIS_TITLES_DATA_DIR = "data/oasis-2025-v1.0";
/** The module the import writes, relative to the repo's top folder. */
export const OASIS_TITLES_MODULE_PATH = "lib/engines/oasis/v2026/titles.ts";

/**
 * The one file. `sha256` pins it, as the OaSIS importer pins its four: the fingerprint of the committed copy
 * (its text, byte-order mark dropped, line endings evened out). Downloaded from open.canada.ca on 2026-10-21,
 * on the maintainer's word of 2026-10-20. UTF-8, starting with a byte-order mark.
 */
const TITLES = defineImport({
  name: "import-oasis-titles",
  label: "OaSIS example titles",
  script: "scripts/import-oasis-titles.mjs",
  pinsName: "OASIS_TITLES_FILES",
  sourceId: "oasis-2025-example-titles",
  dataDir: OASIS_TITLES_DATA_DIR,
  modulePath: OASIS_TITLES_MODULE_PATH,
  files: [
    {
      key: "titles",
      name: "example-titles_oasis_2025_v1.0.csv",
      sha256: "170f7f342842ba43fed15609a9e1dde1d3aa75b1b7f2f06aa63126f9bc55ffb7",
      encoding: "utf-8",
    },
  ],
  build: (texts) => buildOasisTitlesModule(texts),
});

/** The file, with its key, name, download address, pinned SHA-256 and encoding. */
export const OASIS_TITLES_FILES = TITLES.files;

/** The header the file has, column for column. */
export const OASIS_TITLES_HEADER = ["OaSIS profile code", "Concordance number", "Job title type", "Job title text"];

/** The three kinds of title the file holds (research 28f found the third, "Inclusion", on checking). */
export const OASIS_TITLE_TYPES = ["Example", "Index", "Inclusion"];

const JOB_CODE = /^\d{5}\.\d{2}$/;

/**
 * The module's text from the file's text: { titles }. Every row is kept, in the file's order, as
 * [job code, title type, title]; the concordance number (which row of the classification the title came
 * from) isn't, since nothing in DotAmi reads it. A title is kept word for word, its spacing aside: spaces
 * at its ends are dropped, and any run of spaces or line breaks inside it becomes one space, as the OaSIS
 * importer does for job names (two titles of 42203.00 hold a stray line break mid-title in the 2026-10-21
 * copy, "orientation and mobility teacher of persons with" / "a visual impairment"). Throws, naming the file, on a header it wasn't written for, a code that isn't a job code, a type it
 * doesn't know, or an empty title.
 */
export function buildOasisTitlesModule(texts) {
  const name = OASIS_TITLES_FILES[0].name;
  const rows = parseCsv(texts.titles);
  expectHeader(rows, OASIS_TITLES_HEADER, name);
  const titles = rows.slice(1).map((row, i) => {
    const [code, , type, text] = row;
    const line = i + 2;
    if (row.length !== OASIS_TITLES_HEADER.length) throw new Error(`${name}, line ${line}: ${row.length} columns, not ${OASIS_TITLES_HEADER.length}`);
    if (!JOB_CODE.test(code)) throw new Error(`${name}, line ${line}: "${code}" isn't a job code like 72311.00`);
    if (!OASIS_TITLE_TYPES.includes(type)) throw new Error(`${name}, line ${line}: the title type "${type}" isn't one of ${OASIS_TITLE_TYPES.join(", ")}`);
    const title = text.replace(/\s+/g, " ").trim();
    if (title === "") throw new Error(`${name}, line ${line}: the title is empty`);
    return [code, type, title];
  });

  const q = (s) => JSON.stringify(s);
  return [
    // The licence's attribution line and the dataset, from the registry card (scripts/lib/import-kit.mjs).
    ...TITLES.header(
      `Generated by scripts/import-oasis-titles.mjs from ${OASIS_TITLES_DATA_DIR}/${name}. Don't edit it by hand: npm run data:check and tests/oasis-titles-import.spec.ts rebuild it and fail on any difference.`,
    ),
    "",
    'import type { OasisTitlesData } from "./types";',
    "",
    "export const oasisTitles: OasisTitlesData = {",
    "  files: [",
    ...OASIS_TITLES_FILES.map((f) => `    { name: ${q(f.name)}, sha256: ${q(fingerprint(texts[f.key]))} },`),
    "  ],",
    "  // [job code, title type, title], in the file's order.",
    "  titles: [",
    ...titles.map(([code, type, title]) => `    [${q(code)}, ${q(type)}, ${q(title)}],`),
    "  ],",
    "};",
    "",
  ].join("\n");
}

/** The whole run (rebuild, --check or --download); returns the exit code. */
export const main = TITLES.main;

// Run only when called as a script, not when a test imports it.
await runIfMain(import.meta.url, TITLES);
