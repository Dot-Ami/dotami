import { defineConfig } from "@playwright/test";

/**
 * Desktop-app tests ([7b]): the real Electron app, started the way a person starts it, on a
 * throwaway data folder. `npm run test:desktop` builds the app's server first
 * (desktop/build.mjs). Playwright's Electron support is labelled experimental
 * (playwright.dev/docs/api/class-electron, read 2026-10-05).
 */
export default defineConfig({
  testDir: "e2e-desktop",
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // On CI, a JSON report as well: scripts/playwright-summary.mjs reads it so the run's summary page says how
  // many tests failed on the first try and passed on the retry, which the list alone leaves in the log
  // (.github/workflows/ci.yml). It sits in test-results/, beside the failed tries' traces that CI keeps.
  reporter: process.env.CI
    ? [["list"], ["json", { outputFile: "test-results/report.json" }]]
    : "list",
  timeout: 120_000,
  // Every failed try keeps its trace, a flaky test's failed first try included; a passed try's is deleted.
  use: { trace: "retain-on-failure" },
});
