/**
 * scripts/playwright-summary.mjs: what a desktop test run did, on the CI run's summary page, so a test that failed on
 * its first try and passed on its retry (Playwright's "flaky") is counted where people look, not only in the log.
 *
 * The reports below have the shape of Playwright's JSON report as 1.64 writes it (a real one, from an Electron test
 * made to fail on its first try, was read when this was written), cut to the fields the script reads.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { main, summarize, testsIn, warningFor } from "../scripts/playwright-summary.mjs";

const root = path.resolve(__dirname, "..");

/** A test's results: a first try and, when given, a retry. */
const tries = (...statuses: string[]) =>
  statuses.map((status, retry) => ({
    retry,
    status,
    ...(status === "failed" ? { error: { message: "\u001b[31mError: React never took over this element\u001b[39m\n\n  at react-ready.ts:38" } } : {}),
  }));

/** A report from the desktop config: one file, one describe, a flaky test, a passing one, a failing one and a skip. */
const report = {
  config: { rootDir: path.join(root, "e2e-desktop") },
  suites: [
    {
      title: "desktop.spec.ts",
      file: "desktop.spec.ts",
      specs: [
        { title: "back up on one computer → restore on another", file: "desktop.spec.ts", line: 646, tests: [{ status: "flaky", results: tries("failed", "passed") }] },
        { title: "start → close → start again", file: "desktop.spec.ts", line: 277, tests: [{ status: "expected", results: tries("passed") }] },
        { title: "only on Windows", file: "desktop.spec.ts", line: 900, tests: [{ status: "skipped", results: tries("skipped") }] },
      ],
      suites: [
        {
          title: "Delete",
          file: "desktop.spec.ts",
          specs: [{ title: "wipes the words", file: "desktop.spec.ts", line: 1399, tests: [{ status: "unexpected", results: tries("failed", "failed") }] }],
        },
      ],
    },
  ],
  errors: [],
};

const allPassed = {
  config: report.config,
  suites: [{ ...report.suites[0], specs: [report.suites[0].specs[1]], suites: [] }],
  errors: [],
};

describe("summarize", () => {
  it("names each test by its file from the checkout's top folder, its line and its titles, nested describes included", () => {
    expect(testsIn(report, { cwd: root }).map((t) => `${t.where} ${t.title} (${t.status})`)).toEqual([
      "e2e-desktop/desktop.spec.ts:646 back up on one computer → restore on another (flaky)",
      "e2e-desktop/desktop.spec.ts:277 start → close → start again (expected)",
      "e2e-desktop/desktop.spec.ts:900 only on Windows (skipped)",
      "e2e-desktop/desktop.spec.ts:1399 Delete › wipes the words (unexpected)",
    ]);
  });

  it("counts a test that failed first and passed on its retry as flaky, and lists it with its first try's error, colours taken out", () => {
    const result = summarize(report, { title: "Desktop app (Windows) 1/3", artifact: "desktop-test-results-1" });
    expect([result.passed, result.flaky, result.failed, result.skipped]).toEqual([1, 1, 1, 1]);
    expect(result.markdown).toContain("### Desktop app (Windows) 1/3: 1 passed, 1 flaky, 1 failed, 1 skipped");
    expect(result.markdown).toContain("**1 test failed on the first try and passed on the second**, so the job stayed green:");
    expect(result.markdown).toContain("restore on another. First try: Error: React never took over this element");
    expect(result.markdown).toContain("**1 test failed on every try:**");
    expect(result.markdown).toContain("the artifact **desktop-test-results-1**");
    expect(result.markdown).not.toContain("\u001b");
  });

  it("says plainly when no test needed a second try, and names no artifact then", () => {
    const result = summarize(allPassed, { title: "Desktop app (Windows) 2/3", artifact: "desktop-test-results-2" });
    expect(result.markdown).toBe("### Desktop app (Windows) 2/3: 1 passed, 0 flaky, 0 failed\n\nNo test needed a second try.\n");
  });

  it("lists an error outside any test, such as a server that never started", () => {
    const result = summarize({ ...allPassed, errors: [{ message: "Error: Timed out waiting 240000ms from config.webServer." }] });
    expect(result.markdown).toContain("**The run itself stopped with an error:**\n- Error: Timed out waiting 240000ms from config.webServer.");
    expect(result.markdown).not.toContain("No test needed a second try.");
  });

  it("escapes a warning's message the way GitHub's workflow commands need", () => {
    expect(warningFor({ where: "a.spec.ts:1", title: "100% done\nsecond line", status: "flaky", results: [] })).toBe(
      "::warning title=Flaky test::a.spec.ts:1 100%25 done%0Asecond line failed on the first try and passed on the second.",
    );
  });
});

describe("main", () => {
  let dir = "";
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("writes the summary and the counts for the workflow, and warns once per flaky test", () => {
    dir = mkdtempSync(path.join(os.tmpdir(), "playwright-summary-"));
    const file = path.join(dir, "report.json");
    writeFileSync(file, JSON.stringify(report));
    const env = { GITHUB_STEP_SUMMARY: path.join(dir, "summary.md"), GITHUB_OUTPUT: path.join(dir, "output.txt") };
    const lines: string[] = [];
    expect(main([file, "Desktop app (Windows) 1/3", "desktop-test-results-1"], { env, log: (l) => lines.push(l) })).toBe(0);
    expect(readFileSync(env.GITHUB_OUTPUT, "utf8")).toBe("failed=1\nflaky=1\n");
    expect(readFileSync(env.GITHUB_STEP_SUMMARY, "utf8")).toContain("1 passed, 1 flaky, 1 failed");
    expect(lines.filter((l) => l.startsWith("::warning"))).toHaveLength(1);
  });

  it("counts nothing, and still exits 0, when the run never wrote its report", () => {
    dir = mkdtempSync(path.join(os.tmpdir(), "playwright-summary-"));
    const env = { GITHUB_OUTPUT: path.join(dir, "output.txt") };
    const lines: string[] = [];
    expect(main([path.join(dir, "missing.json")], { env, log: (l) => lines.push(l) })).toBe(0);
    expect(readFileSync(env.GITHUB_OUTPUT, "utf8")).toBe("failed=0\nflaky=0\n");
    expect(lines.join("\n")).toContain("the tests didn't get to the end");
  });

  it("says how to call it when the report isn't named", () => {
    const lines: string[] = [];
    expect(main([], { env: {}, log: (l) => lines.push(l) })).toBe(2);
    expect(lines[0]).toMatch(/^Usage: node scripts\/playwright-summary\.mjs/);
  });
});

describe("the desktop CI job and its config agree", () => {
  const ci = readFileSync(path.join(root, ".github", "workflows", "ci.yml"), "utf8").replace(/\r\n/g, "\n");
  const config = readFileSync(path.join(root, "playwright.desktop.config.ts"), "utf8");

  it("reads the JSON report from where the config writes it on CI", () => {
    expect(config).toContain('["json", { outputFile: "test-results/report.json" }]');
    expect(ci).toContain("run: node scripts/playwright-summary.mjs test-results/report.json ");
  });

  it("keeps test-results/ only when a test failed or needed a second try, with an action pinned by its full commit", () => {
    const at = ci.indexOf("      - name: Keep the failed tries' traces\n");
    expect(at).toBeGreaterThan(ci.indexOf("      - name: Count the tests that needed a second try\n"));
    const block = ci.slice(at, ci.indexOf("\n\n", at));
    expect(block).toContain("if: ${{ !cancelled() && (failure() || steps.count.outputs.flaky != '0') }}");
    expect(block).toMatch(/uses: actions\/upload-artifact@[0-9a-f]{40} # v\d/);
    expect(block).toContain("path: test-results/");
  });
});
