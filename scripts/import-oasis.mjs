// Turns four files of the government of Canada's OaSIS 2025 Version 1.0 dataset into DotAmi's catalog
// module of skills and knowledge for each job: lib/engines/oasis/v2026/data.ts. The design, and why
// these files: docs/architecture/future-cockpit.md § 6, "Skills, and the government's list for your
// pick of job, as built".
//
// A developer script. It is never shipped (the installer copies the built app, not scripts/), and it is
// outside the app's network check (tests/helpers/source-scan.ts doesn't read scripts/), so the download
// below is never something DotAmi does on a person's computer; it runs only when a builder asks for it.
//
//   node scripts/import-oasis.mjs              Rebuilds the module from the files in data/oasis-2025-v1.0/.
//   node scripts/import-oasis.mjs --check      Rebuilds it in memory and fails if the committed module differs.
//   node scripts/import-oasis.mjs --download   Fetches fresh copies of the four files first, then rebuilds; a file
//                                              whose SHA-256 isn't the one pinned in OASIS_FILES is not written.
//
// The files are committed as downloaded, line endings aside, so the import can be redone; the module records
// each file's SHA-256, of its text with the byte-order mark dropped and line endings evened out to "\n",
// since git may check a file out with Windows line endings. Exit code 0 when it worked (or the check
// matched), 1 when it didn't, 2 for a usage error.
//
// Since 2026-10-20 it is one small adapter on the research kit's import core, scripts/lib/import-kit.mjs, which
// does the reading, pins, header, --check and --download for every importer. What is left here is OaSIS's own:
// its files and their pins, and how their rows become the module. The dataset's title, publisher, page, file
// addresses, licence and credit line come from its card in the source registry ("oasis-2025",
// lib/engines/research-kit/v2026/registry.ts). --check also checks each file against its pin first.

import { defineImport, evenText, fingerprint, runIfMain } from "./lib/import-kit.mjs";

export { evenText, fingerprint };

/** Where the files are kept, relative to the repo's top folder. */
export const OASIS_DATA_DIR = "data/oasis-2025-v1.0";
/** The module the import writes, relative to the repo's top folder. */
export const OASIS_MODULE_PATH = "lib/engines/oasis/v2026/data.ts";

/**
 * The four files: the taxonomy (the code of each skill and knowledge area, which becomes its permanent id),
 * the skills and knowledge ratings for each job, and each job's name. Their download addresses on
 * open.canada.ca are on the registry card.
 *
 * `sha256` pins each file: the fingerprint of the committed copy, taken as `fingerprint` takes it. --download
 * writes a fetched file only when its fingerprint is this one, so a changed file on the server (or anything
 * in between) can't slip into the data folder unnoticed. A new version from the government means updating
 * these by hand, on purpose; tests/oasis-import.spec.ts checks they match what the module records. All four
 * are UTF-8, each starting with a byte-order mark.
 */
const OASIS = defineImport({
  name: "import-oasis",
  label: "OaSIS",
  script: "scripts/import-oasis.mjs",
  pinsName: "OASIS_FILES",
  sourceId: "oasis-2025",
  dataDir: OASIS_DATA_DIR,
  modulePath: OASIS_MODULE_PATH,
  files: [
    { key: "guide", name: "guide_oasis_2025_v4.0.csv", sha256: "382910bc4854580d0d6e4f86305b6ad6b6a431a3dc3e7309d0cb5f87fa5e0565", encoding: "utf-8" },
    { key: "skills", name: "skills_oasis_2025_v1.1.csv", sha256: "00b88abc4042cec1e9648b5475436a6bee1de482d5dab18d3f1026acd5afc077", encoding: "utf-8" },
    { key: "knowledge", name: "knowledge_oasis_2025_v.1.1.csv", sha256: "7cd7600229c3ba63b9480be6a9dc4ec745df9719e045887c2652c0c37fa25d3c", encoding: "utf-8" },
    { key: "labels", name: "labels_oasis_2025_v1.1.csv", sha256: "96de86f4bbf2006683c993206a7bd39c9f396bd11f969354f70be8f0b8d0c13d", encoding: "utf-8" },
  ],
  build: (texts) => buildOasisModule(texts),
});

/** The four files, each with its key, name, download address, pinned SHA-256 and encoding. */
export const OASIS_FILES = OASIS.files;

/**
 * Each family the import reads: its file, the taxonomy category its columns belong to, and the highest
 * rating its scale allows (skills: "1 - Lowest Level to 5 - Highest Level"; knowledge: "1 - Basic Level
 * to 3 - Advanced Level", as the government's profile pages print them). 0 is in both files too; the
 * profile pages print it as "0 – Not applicable".
 */
const FAMILIES = [
  { family: "skills", file: "skills", category: "F", top: 5 },
  { family: "knowledge", file: "knowledge", category: "G", top: 3 },
];

const JOB_CODE = /^\d{5}\.\d{2}$/;

/**
 * Rows of a semicolon-separated file. A field may be in double quotes (the taxonomy quotes a name that
 * holds a tab), with "" for a quote inside it. Blank lines are skipped.
 */
export function parseSemicolonCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const body = evenText(text);
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ";") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

/** A name as it is compared: spaces and tabs evened out, no case. The files and the taxonomy differ in both. */
const comparable = (name) => name.replace(/\s+/g, " ").trim().toLocaleLowerCase("en");
/** A name as it is shown: the taxonomy's, with its stray spaces and tabs taken out. */
const tidy = (name) => name.replace(/\s+/g, " ").trim();

/** One family's ratings for every job, in the taxonomy's order of its descriptors. */
function readFamily(text, family, descriptors, fileName) {
  const [header, ...rows] = parseSemicolonCsv(text);
  const columns = header.slice(2).map((name) => {
    const matches = descriptors.filter((d) => comparable(d.name) === comparable(name));
    if (matches.length !== 1) {
      throw new Error(`${fileName}: the column "${tidy(name)}" matches ${matches.length} entries of the taxonomy's ${family.family}, not one`);
    }
    return matches[0].code;
  });
  if (new Set(columns).size !== columns.length) throw new Error(`${fileName}: two columns match the same taxonomy entry`);
  // The descriptors of this family that the file rates, in the taxonomy's order (never the file's).
  const order = descriptors.filter((d) => columns.includes(d.code));
  const ratings = new Map();
  for (const row of rows) {
    const code = row[0];
    if (!JOB_CODE.test(code)) throw new Error(`${fileName}: "${code}" isn't a job code like 72311.00`);
    if (ratings.has(code)) throw new Error(`${fileName}: the job ${code} is in it twice`);
    const byCode = new Map(columns.map((c, i) => [c, row[i + 2] ?? ""]));
    const digits = order
      .map((d) => {
        const value = byCode.get(d.code);
        if (!/^\d$/.test(value) || Number(value) > family.top) {
          throw new Error(`${fileName}: rating "${value}" for ${tidy(d.name)} of job ${code} is outside its scale (0 to ${family.top})`);
        }
        return value;
      })
      .join("");
    ratings.set(code, digits);
  }
  return { order, ratings };
}

/**
 * The module's text from the four files' text: { guide, skills, knowledge, labels }. Throws, naming the
 * file and what is wrong, on a column that matches no taxonomy entry, a rating outside its scale, or a
 * job that isn't in every file.
 */
export function buildOasisModule(texts) {
  const taxonomy = parseSemicolonCsv(texts.guide)
    .slice(1)
    .filter((r) => r[1] === "Descriptor")
    .map((r) => ({ code: r[0], name: r[2] }));
  const families = FAMILIES.map((family) => ({
    family,
    ...readFamily(
      texts[family.file],
      family,
      taxonomy.filter((d) => d.code.startsWith(`${family.category}.`)),
      OASIS_FILES.find((f) => f.key === family.file).name,
    ),
  }));

  const labelsFile = OASIS_FILES.find((f) => f.key === "labels").name;
  const jobs = parseSemicolonCsv(texts.labels)
    .slice(1)
    .map((r) => {
      if (!JOB_CODE.test(r[0])) throw new Error(`${labelsFile}: "${r[0]}" isn't a job code like 72311.00`);
      return { code: r[0], label: tidy(r[1] ?? "") };
    });
  const listed = new Set(jobs.map((j) => j.code));
  for (const { family, ratings } of families) {
    for (const code of ratings.keys()) if (!listed.has(code)) throw new Error(`the job ${code} has ${family.family} ratings but no name in ${labelsFile}`);
    for (const code of listed) if (!ratings.has(code)) throw new Error(`the job ${code} has no ${family.family} ratings`);
  }

  const q = (s) => JSON.stringify(s);
  const descriptors = families.flatMap(({ family, order }) => order.map((d) => `    [${q(d.code)}, ${q(family.family)}, ${q(tidy(d.name))}],`));
  const occupations = jobs.map((j) => `    [${q(j.code)}, ${q(j.label)}, ${families.map((f) => q(f.ratings.get(j.code))).join(", ")}],`);
  return [
    // The licence's attribution line and the dataset, from the registry card (scripts/lib/import-kit.mjs).
    ...OASIS.header(
      `Generated by scripts/import-oasis.mjs from the files in ${OASIS_DATA_DIR}/. Don't edit it by hand: tests/oasis-import.spec.ts rebuilds it on every run and fails on any difference.`,
    ),
    "",
    'import type { OasisData } from "./types";',
    "",
    "export const oasisData: OasisData = {",
    "  files: [",
    ...OASIS_FILES.map((f) => `    { name: ${q(f.name)}, sha256: ${q(fingerprint(texts[f.key]))} },`),
    "  ],",
    "  // [taxonomy code, family, name], in the taxonomy's order.",
    "  descriptors: [",
    ...descriptors,
    "  ],",
    "  // [job code, name, skills ratings, knowledge ratings]: one digit per descriptor of that family, in the",
    "  // order above. 0 is \"Not applicable\" on the government's profile pages.",
    "  occupations: [",
    ...occupations,
    "  ],",
    "};",
    "",
  ].join("\n");
}

/** The whole run (rebuild, --check or --download); returns the exit code. */
export const main = OASIS.main;

// Run only when called as a script, not when a test imports it.
await runIfMain(import.meta.url, OASIS);
