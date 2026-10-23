import { expect, test } from "@playwright/test";

import { LAUNCH_SECRET_HEADER } from "../lib/http/launch-secret";
import { launchSecretHeaders } from "./launch-secret";

/**
 * The launch secret (lib/http/launch-secret.ts): the server answers only the app's own window.
 *
 * "Another program" here is this test process calling the server with Node's own fetch, the way a
 * program running under another Windows account on a shared computer could: it can reach
 * 127.0.0.1:<port> but has no way to learn the secret. Before 2026-10-23 it read every venture,
 * and with a hand-written `Sec-Fetch-Site: same-origin` it could confirm a figure and change a
 * setting. The browser in these tests sends the secret (playwright.config.ts), as DotAmi's window does.
 */

const DEMO = "Demo — Chinook Sign Painting";

/** The last calendar quarter that has ended, so a figure for it sits in the window the app accepts. */
function lastQuarter() {
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.floor(now.getMonth() / 3) - 1;
  if (quarter < 0) {
    quarter = 3;
    year -= 1;
  }
  const first = quarter * 3 + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { from: `${year}-${pad(first)}-01`, to: `${year}-${pad(first + 2)}-${new Date(Date.UTC(year, first + 2, 0)).getUTCDate()}` };
}

test("a program that isn't DotAmi's window gets nothing: no data, no confirming a figure, no changing a setting", async ({ page, request, baseURL }) => {
  const outside = (path: string, init: RequestInit = {}) => fetch(new URL(path, baseURL), init);
  // What a forger adds: the header the agree and settings routes used to trust on its own.
  const forged = { "content-type": "application/json", "sec-fetch-site": "same-origin" };

  // The app (it sends the secret) can see the demo venture and propose a figure for it.
  const listed = (await (await request.get("/api/ventures")).json()) as { ventures: { id: string; name: string }[] };
  const ventureId = listed.ventures.find((v) => v.name === DEMO)!.id;
  const { from, to } = lastQuarter();
  const proposed = await request.post("/api/figures/propose", {
    data: {
      ventureId,
      source: { kind: "agent", label: "launch-secret test" },
      figures: [{ kind: "gross-revenue", periodStart: from, periodEnd: to, amountCents: 4242, currency: "CAD" }],
    },
  });
  expect(proposed.status()).toBe(201);
  const figureId = ((await proposed.json()) as { figures: { id: string }[] }).figures[0].id;
  const statusOf = async () =>
    ((await (await request.get(`/api/figures?venture=${ventureId}`)).json()) as { figures: { id: string; status: string }[] }).figures.find((f) => f.id === figureId)
      ?.status;

  // 1. Reading the person's ideas: refused, and the answer names none of them.
  const ventures = await outside("/api/ventures");
  const venturesText = await ventures.text();
  expect(ventures.status, venturesText.slice(0, 200)).toBe(403);
  expect(venturesText).not.toContain("Chinook");

  // 2. Confirming a figure with a forged Sec-Fetch-Site: refused, and the figure is still only proposed.
  const agree = await outside("/api/figures/agree", { method: "POST", headers: forged, body: JSON.stringify({ ventureId, figureIds: [figureId] }) });
  expect(agree.status).toBe(403);
  expect(await statusOf()).toBe("proposed");

  // 3. Reading and changing a setting with the same forgery: refused, and nothing saved.
  expect((await outside("/api/settings?id=figure-reminders", { headers: forged })).status).toBe(403);
  const put = await outside("/api/settings", {
    method: "PUT",
    headers: forged,
    body: JSON.stringify({ id: "figure-reminders", value: { cadences: ["monthly"] } }),
  });
  expect(put.status).toBe(403);
  const reminders = (await (await request.get("/api/settings?id=figure-reminders", { headers: { "sec-fetch-site": "same-origin" } })).json()) as { value: { cadences: string[] } };
  expect(reminders.value.cadences).not.toContain("monthly");

  // 4. A page that shows the person's data, and a guessed secret of the right length: refused too.
  const pageAnswer = await outside("/ventures");
  expect(pageAnswer.status).toBe(403);
  expect(await pageAnswer.text()).not.toContain("Chinook");
  const guessed = await outside("/api/ventures", { headers: { [LAUNCH_SECRET_HEADER]: "A".repeat(43) } });
  expect(guessed.status).toBe(403);

  // 5. The same calls with the secret DotAmi's window sends are answered: the guard is the secret, nothing else.
  expect((await outside("/api/ventures", { headers: launchSecretHeaders() })).status).toBe(200);
  await page.goto("/ventures");
  await expect(page.getByRole("heading", { name: DEMO, level: 2 }).first()).toBeVisible();

  // Tidy up: the figure this test proposed is turned down, from the app's own page.
  const discarded = await page.evaluate(
    async ({ ventureId, figureId }) =>
      (await fetch("/api/figures/discard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ventureId, figureIds: [figureId] }) })).status,
    { ventureId, figureId },
  );
  expect(discarded).toBe(200);
});
