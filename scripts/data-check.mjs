// `npm run data:check`: every importer's committed data checked offline. For each importer below, its data
// files are checked against their pinned SHA-256, and its module is rebuilt in memory from them and compared
// with the committed module, line for line: the importer's own `--check` (scripts/lib/import-kit.mjs). Nothing
// is fetched; a `--check` never downloads. It is part of `npm run ci:quality` and runs in CI on every pull
// request, so a changed byte in a government file, or a hand edit to a generated module, can't get in.
//
// A new importer is added to IMPORTERS; tests/data-check.spec.ts fails while any scripts/import-*.mjs is
// missing from it.
//
// Exit code 0 when every importer's check passed, 1 when any failed.

import path from "node:path";
import { pathToFileURL } from "node:url";

import { ROOT } from "./lib/import-kit.mjs";

/** Every importer, by its script, relative to the repo's top folder. */
export const IMPORTERS = ["scripts/import-oasis.mjs"];

/** Runs every importer's --check on the files under `root`; returns the exit code. */
export async function main({ root = ROOT, log = console.log, importers = IMPORTERS } = {}) {
  const failed = [];
  for (const script of importers) {
    const importer = await import(pathToFileURL(path.join(ROOT, script)).href);
    const code = await importer.main(["--check"], { root, log });
    if (code !== 0) failed.push(script);
  }
  if (failed.length > 0) {
    log(`data:check: ${failed.length} of ${importers.length} importers failed: ${failed.join(", ")}.`);
    return 1;
  }
  const n = importers.length;
  log(`data:check: every importer's files match their pins and rebuild its module exactly (${n} importer${n === 1 ? "" : "s"}).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
