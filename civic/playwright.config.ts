import { defineConfig } from "@playwright/test";

/**
 * Browser tests run the production build (dev mode hides production-only failures such as a
 * content-security-policy that blocks the page's own scripts). Port 3201, so a running `npm run
 * dev` or `npm start` on 3200 is never the server under test.
 *
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE points at an already-installed Chromium where `npx playwright
 * install` isn't possible (a sandbox, an offline machine); leave it unset everywhere else.
 */
const PORT = 3201;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: `node scripts/next.mjs build && node scripts/next.mjs start -H 127.0.0.1 -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
