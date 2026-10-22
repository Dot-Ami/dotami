// The research kit's import core (docs/architecture/research-kit.md § 5.4): what every importer of a
// government file does the same way, so each dataset only says what is its own. An importer (one small adapter
// per dataset, like scripts/import-oasis.mjs) names its source's card in the source registry
// (lib/engines/research-kit/v2026/registry.ts), its files with their pinned SHA-256 and text encoding, and how
// to turn their text into a module. This core then:
//   - reads each file in its own encoding: UTF-8, with or without a byte-order mark (the invisible marker some
//     files start with), or Latin-1 (some Statistics Canada files, and the Canadian Occupational Projection
//     System's); a UTF-8 file marked `bom: true` must start with the mark, checked before a download is written;
//   - fingerprints each file's text and checks it against its pin;
//   - writes the module's licence header from the registry card: its credit line (with the table id and
//     reference period filled in, when the card's line asks for them) and its licence;
//   - says when the source's stated next release has come (the amber "A newer … may be out." line);
//   - runs the three ways an importer is used: rebuild, --check and --download (future-cockpit.md § 6).
//
// A developer script, like the importers: never shipped (the installer copies the built app, not scripts/),
// and outside the app's network check (tests/helpers/source-scan.ts doesn't read scripts/), so the download
// below runs only when a builder asks for it, never on a person's computer.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The repo's top folder. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * One of the app's own TypeScript modules, loaded from a script. Under vitest, vite compiles it; under plain
 * node, tsx does (as scripts/check-quotes.mjs loads the catalogs), so `node scripts/import-oasis.mjs` needs no
 * flag on any node version the project supports.
 */
export async function importAppModule(relative) {
  const url = pathToFileURL(path.join(ROOT, relative)).href;
  if (process.env.VITEST) return import(/* @vite-ignore */ url);
  const { tsImport } = await import("tsx/esm/api");
  return tsImport(url, import.meta.url);
}

const { SOURCES, LICENCES } = await importAppModule("lib/engines/research-kit/v2026/registry.ts");
const { catalogFreshness } = await importAppModule("lib/engines/research-kit/v2026/freshness.ts");

/** The source registry, as the importers read it. */
export const registry = { sources: SOURCES, licences: LICENCES };

// ---- Text -----------------------------------------------------------------------------------------

/** The encodings a file can be declared in. */
export const ENCODINGS = ["utf-8", "latin1"];

/**
 * A file's text from its bytes, in its declared encoding. A UTF-8 file's byte-order mark is kept here (evenText
 * drops it), so the text is the file's own. Throws, naming the file, when the bytes can't be that encoding: a
 * UTF-8 file with bytes UTF-8 doesn't allow (most likely a Latin-1 file), or a "Latin-1" file that starts with
 * a UTF-8 byte-order mark.
 */
export function decode(bytes, encoding, name = "the file") {
  if (encoding === "utf-8") {
    try {
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      throw new Error(`${name} is declared UTF-8 but isn't valid UTF-8 (is it Latin-1?)`);
    }
  }
  if (encoding === "latin1") {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      throw new Error(`${name} is declared Latin-1 but starts with a UTF-8 byte-order mark (is it UTF-8?)`);
    }
    return Buffer.from(bytes).toString("latin1");
  }
  throw new Error(`${name}: unknown encoding "${encoding}" (one of ${ENCODINGS.join(", ")})`);
}

/** The text as an import reads it: no byte-order mark, "\n" line endings. */
export function evenText(text) {
  return text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

/** A file's SHA-256, of its text evened out, so the same file checked out with other line endings matches. */
export function fingerprint(text) {
  return createHash("sha256").update(evenText(text), "utf8").digest("hex");
}

/**
 * Rows of a comma-separated file, the way the government's CSV files write them: a field may be in double
 * quotes (to hold a comma, a line break or a quote, written ""), and blank lines are skipped. `separator` is
 * "," unless a file says otherwise. The text is evened out first, so "\r\n" never ends up inside a field.
 */
export function parseCsv(text, separator = ",") {
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
    else if (c === separator) {
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

/** Throws, naming the file, when its first row isn't exactly the header the importer was written for. */
export function expectHeader(rows, expected, name) {
  const got = rows[0] ?? [];
  if (got.length !== expected.length || got.some((cell, i) => cell !== expected[i])) {
    throw new Error(`${name}: the header is "${got.join(",")}", not the "${expected.join(",")}" this import reads`);
  }
}

// ---- The licence header, from the registry card ------------------------------------------------------

/** The widest a header line may run, "// " included. */
const HEADER_WIDTH = 110;

/** Text as comment lines no wider than HEADER_WIDTH, broken between words. */
export function commentLines(text, width = HEADER_WIDTH) {
  const lines = [];
  let line = "//";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line !== "//" && line.length + 1 + word.length > width) {
      lines.push(line);
      line = "//";
    }
    line += ` ${word}`;
  }
  lines.push(line);
  return lines;
}

/** The card for a source id (from the registry, or the cards a test plants). Throws when there is none. */
export function sourceCard(id, cards = SOURCES) {
  const card = cards.find((c) => c.id === id);
  if (!card) throw new Error(`the source registry has no card "${id}" (lib/engines/research-kit/v2026/registry.ts)`);
  return card;
}

/**
 * The card's credit line with its `{table}` and `{period}` filled from the import's table id and reference
 * period. Throws when the line asks for one the import didn't give, or the card owes no credit line.
 */
export function creditLine(card, { tableId, referencePeriod } = {}) {
  if (card.creditLine === null) throw new Error(`${card.id}: the card has no credit line, so nothing from it may be shipped`);
  const values = { "{table}": tableId, "{period}": referencePeriod };
  return card.creditLine.replace(/\{[^}]*\}/g, (placeholder) => {
    const value = values[placeholder];
    if (value === undefined || value === "") {
      throw new Error(`${card.id}: the credit line needs ${placeholder}, and the import gives none (its tableId and referencePeriod)`);
    }
    return value;
  });
}

/**
 * The header every generated module starts with: the credit line, the licence's page, the source's title,
 * publisher and page, then the importer's own note (how the module was made, and what checks it).
 */
export function moduleHeader(card, { tableId, referencePeriod, note }) {
  const licence = LICENCES[card.licence];
  const said = [tableId && `table ${tableId}`, referencePeriod && `reference period ${referencePeriod}`].filter(Boolean);
  return [
    ...commentLines(creditLine(card, { tableId, referencePeriod })),
    `// ${licence.url}`,
    "//",
    ...commentLines(`${card.name}, ${card.publisher}: ${card.url}`),
    ...(said.length > 0 ? commentLines(`Read from ${said.join(", ")}.`) : []),
    "//",
    ...commentLines(note),
  ];
}

// ---- One importer -----------------------------------------------------------------------------------

const SHA256 = /^[0-9a-f]{64}$/;

/** Today's day, YYYY-MM-DD, in the computer's own time zone. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * An importer, from what is its own:
 *   name        "import-oasis": the start of every line it prints
 *   label       "OaSIS": in the download's user-agent
 *   script      "scripts/import-oasis.mjs", and pinsName "OASIS_FILES": where its pins are, for its messages
 *   sourceId    its card in the source registry (the card must be `ship`)
 *   dataDir     where its files are kept, under data/ ("data/oasis-2025-v1.0")
 *   modulePath  the module it writes, under lib/engines/ ("lib/engines/oasis/v2026/data.ts")
 *   files       [{ key, name, sha256, encoding }]; each name one of the card's files, whose address it takes
 *   tableId, referencePeriod   optional, for the credit line and header
 *   build(texts) the module's text from { key: text }
 * Throws when any of it doesn't fit the registry. `cards` is the registry's, unless a test plants its own.
 */
export function defineImport(spec, { cards = SOURCES } = {}) {
  const card = sourceCard(spec.sourceId, cards);
  if (card.access !== "ship") throw new Error(`${spec.name}: the card ${card.id} is "${card.access}", not "ship", so nothing from it may be imported`);
  const files = spec.files.map((f) => {
    const listed = (card.files ?? []).find((c) => c.name === f.name);
    if (!listed) throw new Error(`${spec.name}: ${f.name} isn't one of the files on the card ${card.id}`);
    if (!SHA256.test(f.sha256)) throw new Error(`${spec.name}: the pin for ${f.name} isn't a SHA-256`);
    if (!ENCODINGS.includes(f.encoding)) throw new Error(`${spec.name}: ${f.name} has an unknown encoding "${f.encoding}"`);
    if (f.bom && f.encoding !== "utf-8") throw new Error(`${spec.name}: ${f.name} is ${f.encoding}; only a UTF-8 file can be asked to start with a byte-order mark`);
    return { key: f.key, name: f.name, url: listed.url, sha256: f.sha256, encoding: f.encoding, bom: f.bom === true };
  });
  const { name, label, script, pinsName, dataDir, modulePath, tableId, referencePeriod, build } = spec;
  const where = (root, f) => path.join(root, dataDir, f.name);

  /**
   * A file's text from its bytes, in its own encoding; throws, naming the file, when a file marked `bom` has no
   * byte-order mark. The fingerprint drops the mark, so a copy without it matches the pin: this is what refuses it.
   */
  function textOf(bytes, f) {
    const text = decode(bytes, f.encoding, f.name);
    if (f.bom && !text.startsWith("﻿")) throw new Error(`${f.name} should be UTF-8 with a byte-order mark, and has no byte-order mark`);
    return text;
  }

  /** The files' text, read from the data folder, each in its own encoding. */
  function readTexts(root = ROOT) {
    return Object.fromEntries(files.map((f) => [f.key, textOf(readFileSync(where(root, f)), f)]));
  }

  /** What is wrong with the committed files against their pins: a missing file, or one whose SHA-256 differs. */
  function checkPins(root = ROOT) {
    const problems = [];
    for (const f of files) {
      let got;
      try {
        got = fingerprint(textOf(readFileSync(where(root, f)), f));
      } catch (error) {
        problems.push(`${dataDir}/${f.name} couldn't be read (${error instanceof Error ? error.message : String(error)})`);
        continue;
      }
      if (got !== f.sha256) {
        problems.push(
          `${dataDir}/${f.name} is not the file pinned for it: its SHA-256 (of the text, line endings evened out) is ${got}, the pin in ${pinsName} (${script}) is ${f.sha256}`,
        );
      }
    }
    return problems;
  }

  /**
   * Downloads each file into the data folder, as the server sends it, but only when its fingerprint is the
   * pinned one; the first file that differs is not written and stops the download (files before it matched, so
   * they are the committed ones). Never throws: a failure is a message.
   */
  async function download(root, log) {
    mkdirSync(path.join(root, dataDir), { recursive: true });
    for (const f of files) {
      try {
        const response = await fetch(f.url, { redirect: "follow", headers: { "user-agent": `DotAmi ${label} import (developer script)` } });
        if (!response.ok) return `${f.name}: the server answered ${response.status}`;
        const bytes = Buffer.from(await response.arrayBuffer());
        // Read as readTexts reads the committed copy (its encoding, byte-order mark kept for evenText to drop),
        // before anything is written: bytes the rebuild would refuse never land over the committed file.
        let text;
        try {
          text = textOf(bytes, f);
        } catch (error) {
          return `${error instanceof Error ? error.message : String(error)}, so it was not written`;
        }
        const got = fingerprint(text);
        if (got !== f.sha256) {
          // main() adds ". Nothing was rebuilt.", so the message ends without a full stop.
          return [
            `${f.name} is not the file this script expects, so it was not written.`,
            `  Its SHA-256 (of the text, line endings evened out): expected ${f.sha256}, got ${got}.`,
            `  Check the dataset's page, ${card.url}. If ${card.publisher} has published a new version, read what`,
            `  changed, then update the pinned sha256 for ${f.name} in ${pinsName} (${script}) on purpose`,
            `  and download again`,
          ].join("\n");
        }
        writeFileSync(where(root, f), bytes);
        log(`downloaded ${f.name}`);
      } catch (error) {
        return `${f.name}: couldn't be downloaded (${error instanceof Error ? error.message : String(error)})`;
      }
    }
    return null;
  }

  /** The whole run; returns the exit code: 0 when it worked (or the check matched), 1 when it didn't, 2 for a usage error. */
  async function main(argv, { root = ROOT, log = console.log, on = today() } = {}) {
    const unknown = argv.filter((a) => a !== "--check" && a !== "--download");
    if (unknown.length > 0 || (argv.includes("--check") && argv.includes("--download"))) {
      log(`${name}: unknown or clashing arguments: ${argv.join(" ")}`);
      log(`Usage: node ${script} [--check | --download]`);
      return 2;
    }
    // The source's stated next release has come: say so, whatever the run (it never fails a run by itself).
    const freshness = catalogFreshness(card, on);
    if (freshness.stale) log(`${name}: ${freshness.line} ${card.name} gave ${card.nextRelease.date} for its next ${card.nextRelease.what}: ${card.url}`);

    if (argv.includes("--download")) {
      const problem = await download(root, log);
      if (problem) {
        log(`${name}: ${problem}. Nothing was rebuilt.`);
        return 1;
      }
    }
    if (argv.includes("--check")) {
      const problems = checkPins(root);
      if (problems.length > 0) {
        for (const problem of problems) log(`${name}: ${problem}.`);
        log(`${name}: the files in ${dataDir} don't match their pins, so nothing was rebuilt.`);
        return 1;
      }
    }
    let made;
    try {
      made = build(readTexts(root));
    } catch (error) {
      log(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
    const target = path.join(root, modulePath);
    if (argv.includes("--check")) {
      let committed = "";
      try {
        committed = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
      } catch {
        // No module yet: it differs.
      }
      if (committed === made) {
        log(`${modulePath} is what the files in ${dataDir} make.`);
        return 0;
      }
      log(`${modulePath} is NOT what the files in ${dataDir} make. Run node ${script} and look at the difference.`);
      return 1;
    }
    writeFileSync(target, made);
    log(`wrote ${modulePath} (${Buffer.byteLength(made, "utf8")} bytes)`);
    return 0;
  }

  return {
    name,
    script,
    card,
    dataDir,
    modulePath,
    files,
    /** The module's header lines, with the importer's own note. */
    header: (note) => moduleHeader(card, { tableId, referencePeriod, note }),
    readTexts,
    checkPins,
    main,
  };
}

/** Runs an importer's main() when its file is the one node was started with, not when a test imports it. */
export async function runIfMain(importMetaUrl, importer) {
  if (process.argv[1] && importMetaUrl === pathToFileURL(process.argv[1]).href) {
    process.exitCode = await importer.main(process.argv.slice(2));
  }
}
