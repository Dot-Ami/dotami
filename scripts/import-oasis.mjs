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
//   node scripts/import-oasis.mjs --download   Fetches fresh copies of the four files first, then rebuilds.
//
// The files are committed as downloaded, line endings aside, so the import can be redone; the module records
// each file's SHA-256, of its text with the byte-order mark dropped and line endings evened out to "\n",
// since git may check a file out with Windows line endings. Exit code 0 when it worked (or the check
// matched), 1 when it didn't, 2 for a usage error.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DATASET = "https://open.canada.ca/data/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec/resource";

/** Where the files are kept, relative to the repo's top folder. */
export const OASIS_DATA_DIR = "data/oasis-2025-v1.0";
/** The module the import writes, relative to the repo's top folder. */
export const OASIS_MODULE_PATH = "lib/engines/oasis/v2026/data.ts";

/**
 * The four files, each with its download address on open.canada.ca: the taxonomy (the code of each skill
 * and knowledge area, which becomes its permanent id), the skills and knowledge ratings for each job, and
 * each job's name.
 */
export const OASIS_FILES = [
  { key: "guide", name: "guide_oasis_2025_v4.0.csv", url: `${DATASET}/2a7a17bf-b67c-4fc2-b636-959c7f1d7ae4/download/guide_oasis_2025_v4.0.csv` },
  { key: "skills", name: "skills_oasis_2025_v1.1.csv", url: `${DATASET}/bd9cf3f2-4cd5-47b1-ba74-ab68cd0a941b/download/skills_oasis_2025_v1.1.csv` },
  {
    key: "knowledge",
    name: "knowledge_oasis_2025_v.1.1.csv",
    url: `${DATASET}/b5c3eb08-dda8-4929-ba5d-b90582db6c70/download/knowledge_oasis_2025_v.1.1.csv`,
  },
  { key: "labels", name: "labels_oasis_2025_v1.1.csv", url: `${DATASET}/af53ca1d-5efc-4e52-ad42-9b858a4507c6/download/labels_oasis_2025_v1.1.csv` },
];

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

/** The text as the import reads it: no byte-order mark, "\n" line endings. */
export function evenText(text) {
  return text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

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

  const sha = (text) => createHash("sha256").update(evenText(text), "utf8").digest("hex");
  const q = (s) => JSON.stringify(s);
  const descriptors = families.flatMap(({ family, order }) => order.map((d) => `    [${q(d.code)}, ${q(family.family)}, ${q(tidy(d.name))}],`));
  const occupations = jobs.map((j) => `    [${q(j.code)}, ${q(j.label)}, ${families.map((f) => q(f.ratings.get(j.code))).join(", ")}],`);
  return [
    "// Contains information licensed under the Open Government Licence – Canada.",
    "// https://open.canada.ca/en/open-government-licence-canada",
    "//",
    "// Occupational and Skills Information System (OaSIS) - 2025 Version 1.0, Employment and Social Development",
    "// Canada: https://open.canada.ca/data/en/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec",
    "//",
    "// Generated by scripts/import-oasis.mjs from the files in data/oasis-2025-v1.0/. Don't edit it by hand:",
    "// tests/oasis-import.spec.ts rebuilds it on every run and fails on any difference.",
    "",
    'import type { OasisData } from "./types";',
    "",
    "export const oasisData: OasisData = {",
    "  files: [",
    ...OASIS_FILES.map((f) => `    { name: ${q(f.name)}, sha256: ${q(sha(texts[f.key]))} },`),
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

// ---- Running ---------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The four files' text, read from the data folder. */
function readFiles(root) {
  return Object.fromEntries(OASIS_FILES.map((f) => [f.key, readFileSync(path.join(root, OASIS_DATA_DIR, f.name), "utf8")]));
}

/** Downloads each file into the data folder, as the server sends it. Never throws: a failure is a message. */
async function download(root, log) {
  mkdirSync(path.join(root, OASIS_DATA_DIR), { recursive: true });
  for (const f of OASIS_FILES) {
    try {
      const response = await fetch(f.url, { redirect: "follow", headers: { "user-agent": "DotAmi OaSIS import (developer script)" } });
      if (!response.ok) return `${f.name}: the server answered ${response.status}`;
      writeFileSync(path.join(root, OASIS_DATA_DIR, f.name), Buffer.from(await response.arrayBuffer()));
      log(`downloaded ${f.name}`);
    } catch (error) {
      return `${f.name}: couldn't be downloaded (${error instanceof Error ? error.message : String(error)})`;
    }
  }
  return null;
}

/** The whole run; returns the exit code. */
export async function main(argv, { root = ROOT, log = console.log } = {}) {
  const unknown = argv.filter((a) => a !== "--check" && a !== "--download");
  if (unknown.length > 0 || (argv.includes("--check") && argv.includes("--download"))) {
    log(`import-oasis: unknown or clashing arguments: ${argv.join(" ")}`);
    log("Usage: node scripts/import-oasis.mjs [--check | --download]");
    return 2;
  }
  if (argv.includes("--download")) {
    const problem = await download(root, log);
    if (problem) {
      log(`import-oasis: ${problem}. Nothing was rebuilt.`);
      return 1;
    }
  }
  let made;
  try {
    made = buildOasisModule(readFiles(root));
  } catch (error) {
    log(`import-oasis: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const target = path.join(root, OASIS_MODULE_PATH);
  if (argv.includes("--check")) {
    let committed = "";
    try {
      committed = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
    } catch {
      // No module yet: it differs.
    }
    if (committed === made) {
      log(`${OASIS_MODULE_PATH} is what the files in ${OASIS_DATA_DIR} make.`);
      return 0;
    }
    log(`${OASIS_MODULE_PATH} is NOT what the files in ${OASIS_DATA_DIR} make. Run node scripts/import-oasis.mjs and look at the difference.`);
    return 1;
  }
  writeFileSync(target, made);
  log(`wrote ${OASIS_MODULE_PATH} (${Buffer.byteLength(made, "utf8")} bytes)`);
  return 0;
}

// Run only when called as a script, not when a test imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
