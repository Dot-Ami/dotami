// Turns Statistics Canada's NOC 2021 Version 1.0 "elements" file into DotAmi's module of job groups:
// lib/engines/noc/v2021/data.ts. It keeps, for each of the 516 five-digit job groups, its title, its example
// titles and its "Employment requirements", the requirements word for word, as the government's own words
// (task 28a; docs/architecture/research-kit.md § 4.2; docs/ui-spec/cockpit/about-this-job.md, row 1). The job
// groups are what the first five digits of an OaSIS code name (72311.00 is in group 72311).
//
// A developer script, like every importer: never shipped, outside the app's network check, and the download
// below runs only when a builder asks for it (scripts/lib/import-kit.mjs says more).
//
//   node scripts/import-noc.mjs              Rebuilds the module from the file in data/noc-2021-v1.0/.
//   node scripts/import-noc.mjs --check      Checks the file against its pin, rebuilds the module in memory and
//                                            fails if the committed module differs.
//   node scripts/import-noc.mjs --download   Fetches a fresh copy first; written only when its SHA-256 is the one
//                                            pinned in NOC_FILES.
//
// The title, publisher, page, file address, licence and credit line come from the card "noc-2021-elements" in
// the source registry (lib/engines/research-kit/v2026/registry.ts): the Statistics Canada Open Licence's
// notice, the maintainer's call 4 of 2026-10-21. Exit code 0 when it worked (or the check matched), 1 when it
// didn't, 2 for a usage error.

import { defineImport, expectHeader, fingerprint, parseCsv, runIfMain } from "./lib/import-kit.mjs";

/** Where the file is kept, relative to the repo's top folder. */
export const NOC_DATA_DIR = "data/noc-2021-v1.0";
/** The module the import writes, relative to the repo's top folder. */
export const NOC_MODULE_PATH = "lib/engines/noc/v2021/data.ts";

/**
 * The reference date the Statistics Canada notice asks for ("Adapted from Statistics Canada, name of product,
 * reference date."): the classification's own year, as its name gives it.
 */
export const NOC_REFERENCE_PERIOD = "2021";

/**
 * The one file. `sha256` pins it: the fingerprint of the committed copy (its text, byte-order mark dropped,
 * line endings evened out). UTF-8, starting with a byte-order mark.
 *
 * Where the committed copy came from: Statistics Canada's page answered a script with a "Security Check" page
 * (HTTP 403) on 2026-10-21, so it couldn't be fetched again then; nothing gets past that check. The copy is
 * the one fetched on 2026-10-15 that research note 28f measured (its raw SHA-256,
 * 50c3e31a90b0150cc5b8efd29ec020c2fd9ea5fc5b0a171ed65d3cd9a0abf32f, is in that note), whose header and first
 * rows matched the live file on 2026-10-20. Until the page answers scripts again, --download stops with the
 * server's answer and writes nothing.
 */
const NOC = defineImport({
  name: "import-noc",
  label: "NOC 2021",
  script: "scripts/import-noc.mjs",
  pinsName: "NOC_FILES",
  sourceId: "noc-2021-elements",
  dataDir: NOC_DATA_DIR,
  modulePath: NOC_MODULE_PATH,
  referencePeriod: NOC_REFERENCE_PERIOD,
  files: [
    {
      key: "elements",
      name: "noc-2021-v1.0-elements.csv",
      sha256: "8bc4bb2fd768aa55887dbb2faee0a21afcaf800621c54a02d83c8739568e2afa",
      encoding: "utf-8",
    },
  ],
  build: (texts) => buildNocModule(texts),
});

/** The file, with its key, name, download address, pinned SHA-256 and encoding. */
export const NOC_FILES = NOC.files;

/** The header the file has, column for column. */
export const NOC_HEADER = ["Level", "Code - NOC 2021 V1.0", "Class title", "Element Type Label English", "Element Description English"];

/**
 * What the import does with each kind of element row. The three kinds of title and the requirements are kept;
 * the rest isn't read by anything in DotAmi yet, so it isn't shipped. A kind not listed here stops the import,
 * so a new version of the file can't bring a new kind in unseen.
 */
export const NOC_ELEMENT_KINDS = {
  "Illustrative example(s)": "illustrative",
  "All examples": "all",
  "Inclusion(s)": "inclusion",
  "Employment requirements": "requirement",
  "Exclusion(s)": null,
  "Main duties": null,
  "Additional information": null,
};

const GROUP_CODE = /^\d{5}$/;

/**
 * The module's text from the file's text: { elements }. Only rows of level 5 (the five-digit job groups,
 * every row in this file) are read. Each kept text is word for word but for the spaces the file leaves at the
 * end of almost every line (41,847 of its 44,037 rows end in one); a double space inside a line, or a
 * no-break space, is kept. Throws, naming the file and line, on a header it wasn't written for, a code that
 * isn't five digits, a group named two ways, an element kind it doesn't know, or an empty text.
 */
export function buildNocModule(texts) {
  const name = NOC_FILES[0].name;
  const rows = parseCsv(texts.elements);
  expectHeader(rows, NOC_HEADER, name);
  const groups = new Map();
  const titles = [];
  const requirements = [];
  rows.slice(1).forEach((row, i) => {
    const line = i + 2;
    if (row.length !== NOC_HEADER.length) throw new Error(`${name}, line ${line}: ${row.length} columns, not ${NOC_HEADER.length}`);
    const [level, code, classTitle, kind, description] = row;
    if (level !== "5") return;
    if (!GROUP_CODE.test(code)) throw new Error(`${name}, line ${line}: "${code}" isn't a five-digit job group code like 72311`);
    const title = classTitle.trim();
    if (groups.has(code) && groups.get(code) !== title) throw new Error(`${name}, line ${line}: group ${code} is "${groups.get(code)}" earlier and "${title}" here`);
    groups.set(code, title);
    if (!Object.hasOwn(NOC_ELEMENT_KINDS, kind)) throw new Error(`${name}, line ${line}: the element kind "${kind}" isn't one this import knows`);
    const keep = NOC_ELEMENT_KINDS[kind];
    if (keep === null) return;
    const text = description.trimEnd();
    if (text.trim() === "") throw new Error(`${name}, line ${line}: the ${kind} text is empty`);
    if (keep === "requirement") requirements.push([code, text]);
    else titles.push([code, keep, text]);
  });

  const q = (s) => JSON.stringify(s);
  return [
    // The Statistics Canada notice and the classification, from the registry card (scripts/lib/import-kit.mjs).
    ...NOC.header(
      `Generated by scripts/import-noc.mjs from ${NOC_DATA_DIR}/${name}. Don't edit it by hand: npm run data:check and tests/noc-import.spec.ts rebuild it and fail on any difference.`,
    ),
    "",
    'import type { NocData } from "./types";',
    "",
    "export const nocData: NocData = {",
    "  files: [",
    ...NOC_FILES.map((f) => `    { name: ${q(f.name)}, sha256: ${q(fingerprint(texts[f.key]))} },`),
    "  ],",
    "  // [group code, group title], in the file's order.",
    "  groups: [",
    ...[...groups].map(([code, title]) => `    [${q(code)}, ${q(title)}],`),
    "  ],",
    '  // [group code, kind, title]: "illustrative" (the file\'s "Illustrative example(s)"), "all" ("All examples")',
    '  // or "inclusion" ("Inclusion(s)"), in the file\'s order.',
    "  titles: [",
    ...titles.map(([code, kind, text]) => `    [${q(code)}, ${q(kind)}, ${q(text)}],`),
    "  ],",
    '  // [group code, line]: every "Employment requirements" line, the government\'s words, in the file\'s order.',
    "  requirements: [",
    ...requirements.map(([code, text]) => `    [${q(code)}, ${q(text)}],`),
    "  ],",
    "};",
    "",
  ].join("\n");
}

/** The whole run (rebuild, --check or --download); returns the exit code. */
export const main = NOC.main;

// Run only when called as a script, not when a test imports it.
await runIfMain(import.meta.url, NOC);
