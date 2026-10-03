import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests: the app built and started for real, driven like a person would drive it.
 *
 * Each run gets a fresh SQLite file (`prisma/e2e.db`) with the two demo ventures, made by
 * `e2e/prepare-db.mjs` before the server starts. The intake parser runs on its keyword
 * fallback (no model key), so results are the same on every machine.
 */
const PORT = 3123;
const DATABASE_URL = "file:./e2e.db";

export default defineConfig({
  testDir: "e2e",
  // One shared database, so tests run one after another in a known order.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } }],
  webServer: {
    command: `node e2e/prepare-db.mjs && npm run build && npx next start -H 127.0.0.1 -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL,
      // Empty on purpose: the intake parser uses its deterministic keyword fallback.
      ANTHROPIC_API_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
