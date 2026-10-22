// Quality numbers you can see (the plan's S2.5.32, task 32a): prints them and writes test-results/quality.md.
//
//   npm run quality:report                     every part: the idea harness, the job search against the corpus,
//                                              the clutter from the last browser run, and source health
//   npm run quality:report -- --clutter-only   only the clutter (CI's Browser tests job, after its run)
//   npm run quality:report -- --live           every part, plus a live run of the quote checker
//                                              (scripts/check-quotes.mjs) for the dead and changed pages
//   npm run quality:line                       only the one Quality line the release pull request puts in the
//                                              CHANGELOG (docs/architecture/desktop-app.md § Releasing an update);
//                                              `npm run quality:line -- --live` adds the live check to it
//
// Everything is counted from what the tests compute, on this computer (scripts/lib/quality.ts says how), and
// nothing is sent anywhere. The clutter is read from the files the last browser run left in test-results/
// (`npm run test:browser` first, for that part). Only `--live` reaches the network: it fetches the government
// pages the catalogs cite, the same requests `node scripts/check-quotes.mjs` makes; CI never passes it.
//
// The numbers never fail anything yet: the exit code is 0 unless the script itself breaks (2 for a usage error).

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const USAGE = "Usage: node scripts/quality-report.mjs [--clutter-only | --live] [--line]";

/** Reads the flags; a string is a usage problem. */
export function parseArgs(argv) {
  const flags = { clutterOnly: false, line: false, live: false };
  for (const arg of argv) {
    if (arg === "--clutter-only") flags.clutterOnly = true;
    else if (arg === "--line") flags.line = true;
    else if (arg === "--live") flags.live = true;
    else return `unknown argument "${arg}"`;
  }
  if (flags.clutterOnly && flags.line) return "--line needs every part: leave out --clutter-only";
  if (flags.clutterOnly && flags.live) return "--live checks the sources, which --clutter-only leaves out";
  return flags;
}

/** The quote checker over every recorded tool check, its own lines kept quiet; what it found, for the report. */
async function liveCheck() {
  const { main: checkQuotes } = await import("./check-quotes.mjs");
  let found = null;
  console.error("Checking every tool-checked citation's page on the live web (scripts/check-quotes.mjs)…");
  await checkQuotes([], { log: () => {}, onResult: (run) => (found = run) });
  return found;
}

async function main(argv) {
  const flags = parseArgs(argv);
  if (typeof flags === "string") {
    console.error(`quality-report: ${flags}\n${USAGE}`);
    return 2;
  }
  // TypeScript, loaded through tsx, which reads tsconfig's "@/" paths (as scripts/check-quotes.mjs does).
  const { tsImport } = await import("tsx/esm/api");
  const { countQuality, qualityLine, qualityMarkdown } = await tsImport("./lib/quality.ts", import.meta.url);
  const folder = "test-results";
  const live = flags.live ? await liveCheck() : null;
  const numbers = countQuality({ today: new Date().toLocaleDateString("en-CA"), folder, clutterOnly: flags.clutterOnly, live });
  const line = qualityLine(numbers);
  if (flags.line) {
    console.log(line);
    return 0;
  }
  const report = `${qualityMarkdown(numbers)}\n## The Quality line\n\n${line}\n`;
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, "quality.md"), report);
  console.log(report);
  console.log(`(written to ${path.join(folder, "quality.md")})`);
  return 0;
}

// Run only when called as a script, not when a test imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
