/**
 * The app's rate limits, on the real production build.
 *
 * The test server runs with DOTAMI_E2E_RATE_LIMITS=opt-in (playwright.config.ts): a request is
 * counted only when it names its own bucket in the x-dotami-e2e-rate-limit header, so the rest of
 * the suite, however large it grows, never trips a limit by accident (lib/api/rate-limit.ts says
 * why). This test names a bucket of its own and shows the shipped limit still holds, then shows
 * the suite's unlabelled requests really aren't counted. The desktop app never has the switch
 * (desktop/main.mjs serverEnv removes it; e2e-desktop/desktop.spec.ts checks).
 */
import { expect, test, type Page } from "@playwright/test";

// The settings routes' limit (app/api/settings/route.ts): 120 requests a minute per client.
const SETTINGS_LIMIT = 120;

/**
 * Asks for the reminders setting `times` times from inside the page (the settings routes answer
 * only DotAmi's own window), one after another, under `label` if given. Returns each status, and
 * the last answer's Retry-After header and error text.
 */
async function askSettings(page: Page, times: number, label: string | null) {
  return page.evaluate(
    async ({ times, label }) => {
      const statuses: number[] = [];
      let retryAfter: string | null = null;
      let error: string | null = null;
      for (let i = 0; i < times; i++) {
        const res = await fetch("/api/settings?id=figure-reminders", {
          cache: "no-store",
          headers: label ? { "x-dotami-e2e-rate-limit": label } : {},
        });
        statuses.push(res.status);
        retryAfter = res.headers.get("Retry-After");
        error = res.status === 429 ? ((await res.json()) as { error: string }).error : null;
      }
      return { statuses, retryAfter, error };
    },
    { times, label },
  );
}

const count = (statuses: number[], status: number) => statuses.filter((s) => s === status).length;

test("the settings limit still holds for a client that is counted, and the rest of the suite isn't counted", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

  // A bucket of this test's own, new on every run: the limit's worth of requests is answered...
  const label = `rate-limit-spec-${Date.now()}`;
  const allowed = await askSettings(page, SETTINGS_LIMIT, label);
  expect(count(allowed.statuses, 200)).toBe(SETTINGS_LIMIT);

  // ...and the next one is refused, with how long to wait.
  const refused = await askSettings(page, 1, label);
  expect(refused.statuses).toEqual([429]);
  expect(refused.error).toBe("Too many requests — slow down and try again shortly.");
  expect(Number(refused.retryAfter)).toBeGreaterThanOrEqual(1);
  expect(Number(refused.retryAfter)).toBeLessThanOrEqual(60);

  // Requests without a label, as every other browser test sends them: more than two minutes' worth
  // of the limit in a few seconds, all answered. With the switch off they would share one bucket,
  // and at least one of these would be refused whatever that bucket already held.
  const suite = await askSettings(page, 2 * SETTINGS_LIMIT + 10, null);
  expect(count(suite.statuses, 200)).toBe(2 * SETTINGS_LIMIT + 10);

  // The counted bucket is still full: the unlabelled requests neither used it nor reset it.
  expect((await askSettings(page, 1, label)).statuses).toEqual([429]);
});
