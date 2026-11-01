// Says what a Playwright run did, on the CI run's summary page: how many tests passed, how many failed, and
// how many failed on their first try and passed when Playwright ran them again ("flaky").
//
//   node scripts/playwright-summary.mjs <report.json> [title] [artifact name]
//
// Playwright runs a failed test once more on CI (`retries: 1` in playwright.desktop.config.ts), and a test that
// passes on that second try counts as passed: the job stays green, and nothing on the run's page said a first
// try had failed. This reads the JSON report the config writes on CI and prints the counts, with each test that
// needed a second try and the first line of its first try's error. On GitHub Actions it also appends that to
// the job's summary ($GITHUB_STEP_SUMMARY), writes `failed` and `flaky` counts as step outputs ($GITHUB_OUTPUT)
// so the workflow keeps the failed tries' traces only when there are some, and prints one warning per flaky
// test, which GitHub lists on the run's page.
//
// Information only: the exit code is 0, also when the report is missing (the tests then never got to the end,
// and the step that ran them has failed already) or can't be read (empty, cut off, not a report: then both
// counts are `unknown`, which the workflow treats as a reason to keep test-results/), and 2 for a usage error.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const USAGE = "Usage: node scripts/playwright-summary.mjs <report.json> [title] [artifact name]";

/** Playwright's error messages carry the terminal's colour codes; the summary page would show them as text. */
// The escape character is the point of this pattern (it starts every colour code), so the lint rule
// against control characters in a regular expression is switched off for this one line.
// eslint-disable-next-line no-control-regex
const stripColours = (text) => text.replace(/\u001b\[[0-9;]*m/g, "");

/** The first line of an error that says something, without colour codes. */
function firstLine(message) {
  const lines = stripColours(message ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] ?? "(no error message)";
}

/**
 * Every test in the report, one entry per test and project, with its place in the file, its titles joined the
 * way Playwright's own list prints them, its outcome and the results of each try. Suites nest (a file, then any
 * `test.describe` inside it), so this walks them all.
 */
export function testsIn(report, { cwd = process.cwd() } = {}) {
  const found = [];
  // The report names a file from the config's test folder (`desktop.spec.ts`); from the checkout's top folder it
  // reads the way Playwright's own list prints it (`e2e-desktop/desktop.spec.ts`).
  const rootDir = report.config?.rootDir;
  const fileOf = (file) =>
    rootDir ? path.relative(cwd, path.join(rootDir, file)).split(path.sep).join("/") : file;
  const walk = (suite, titles) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        found.push({
          where: `${fileOf(spec.file)}:${spec.line}`,
          title: [...titles, spec.title].join(" › "),
          // "expected" (passed, or skipped on purpose), "unexpected" (failed every try), "flaky", "skipped".
          status: test.status,
          results: test.results ?? [],
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
  };
  // A file's own suite is titled with the file's name, which `where` already says.
  for (const file of report.suites ?? []) walk(file, []);
  return found;
}

/** What the run did, counted from its tests, and the words for the summary page. */
export function summarize(report, { title = "Playwright tests", artifact = "" } = {}) {
  const tests = testsIn(report);
  const flaky = tests.filter((t) => t.status === "flaky");
  const failed = tests.filter((t) => t.status === "unexpected");
  const skipped = tests.filter((t) => t.status === "skipped").length;
  const passed = tests.filter((t) => t.status === "expected").length;
  // Errors outside any test (a server that never started, a file that didn't load).
  const runErrors = (report.errors ?? []).map((error) => firstLine(error.message));

  const counts = [`${passed} passed`, `${flaky.length} flaky`, `${failed.length} failed`];
  if (skipped) counts.push(`${skipped} skipped`);
  const lines = [`### ${title}: ${counts.join(", ")}`, ""];

  /** A test's line: where it is, its title, and its first try's error. */
  const testLine = (t) => {
    const first = t.results.find((r) => r.retry === 0) ?? t.results[0];
    return `- \`${t.where}\` ${t.title}. First try: ${firstLine(first?.error?.message ?? first?.errors?.[0]?.message)}`;
  };
  if (flaky.length) {
    lines.push(
      `**${flaky.length === 1 ? "1 test" : `${flaky.length} tests`} failed on the first try and passed on the second**, so the job stayed green:`,
      ...flaky.map(testLine),
      "",
    );
  }
  if (failed.length)
    lines.push(
      `**${failed.length === 1 ? "1 test" : `${failed.length} tests`} failed on every try:**`,
      ...failed.map(testLine),
      "",
    );
  if (runErrors.length)
    lines.push("**The run itself stopped with an error:**", ...runErrors.map((e) => `- ${e}`), "");
  if (!flaky.length && !failed.length && !runErrors.length)
    lines.push("No test needed a second try.", "");
  if ((flaky.length || failed.length) && artifact) {
    lines.push(
      `The failed tries' traces and error notes are kept with this run, in the artifact **${artifact}** (open a trace with \`npx playwright show-trace <trace.zip>\`).`,
      "",
    );
  }

  return {
    passed,
    flaky: flaky.length,
    failed: failed.length,
    skipped,
    flakyTests: flaky,
    markdown: lines.join("\n"),
  };
}

/** A GitHub Actions warning annotation; its message escaped the way workflow commands need. */
export function warningFor(t) {
  const escape = (s) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  return `::warning title=Flaky test::${escape(`${t.where} ${t.title} failed on the first try and passed on the second.`)}`;
}

export function main(argv, { env = process.env, log = console.log } = {}) {
  const [reportFile, title, artifact] = argv;
  if (!reportFile) {
    log(USAGE);
    return 2;
  }
  if (!existsSync(reportFile)) {
    log(
      `${reportFile} isn't there: the tests didn't get to the end, so there is nothing to count.`,
    );
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, "failed=0\nflaky=0\n");
    return 0;
  }
  let result;
  try {
    result = summarize(JSON.parse(readFileSync(reportFile, "utf8")), { title, artifact });
  } catch {
    // An empty or cut-off file (a run stopped while writing it) or something that isn't a report: say so in one
    // line rather than fail the step, and leave the counts unknown so the traces are kept.
    const said = `### ${title ?? "Playwright tests"}: the test report couldn't be read, so nothing was counted; CI keeps test-results/ with the run.`;
    log(said);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${said}\n`);
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, "failed=unknown\nflaky=unknown\n");
    return 0;
  }
  log(result.markdown);
  for (const t of result.flakyTests) log(warningFor(t));
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${result.markdown}\n`);
  if (env.GITHUB_OUTPUT)
    appendFileSync(env.GITHUB_OUTPUT, `failed=${result.failed}\nflaky=${result.flaky}\n`);
  return 0;
}

// Run only when called as a script, not when a test imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
