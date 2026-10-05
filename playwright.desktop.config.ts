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
  reporter: "list",
  timeout: 120_000,
  use: { trace: "retain-on-failure" },
});
