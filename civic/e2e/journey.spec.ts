import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * The prototype's promises, checked in a real browser against the production build:
 * evidence links resolve, unsupported claims stay unresolved, stale or past deadlines aren't
 * shown as current, proposed policy isn't labelled enacted, demo content is labelled on every
 * screen, and nothing external happens without approval (nor, in fact, at all).
 */
const ISSUE = "/issues/corvane-meadowmere";
const SCREENS = [
  "/",
  "/?q=nothing-matches-this",
  "/method",
  ISSUE,
  `${ISSUE}/evidence`,
  `${ISSUE}/claims/emissions-safe`,
  `${ISSUE}/claims/below-guideline-normal`,
  `${ISSUE}/organisations`,
  `${ISSUE}/timeline`,
  `${ISSUE}/actions`,
  `${ISSUE}/coalition`,
  "/sources/air-assessment",
  "/issues/meadowmere-transit-fares",
];

/** Records every request the page makes, and every console error, for the whole test. */
function watch(page: Page) {
  const requests: Request[] = [];
  const errors: string[] = [];
  page.on("request", (r) => requests.push(r));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return {
    errors,
    external: () =>
      requests
        .map((r) => r.url())
        .filter((u) => !/^http:\/\/127\.0\.0\.1:3201\//.test(u) && !u.startsWith("data:")),
    writes: () =>
      requests.filter((r) => r.method() !== "GET").map((r) => `${r.method()} ${r.url()}`),
  };
}

test("every screen carries the demo banner, loads without errors, and reaches no other address", async ({
  page,
}) => {
  const seen = watch(page);
  for (const path of SCREENS) {
    await page.goto(path);
    const banner = page.getByTestId("demo-banner");
    await expect(banner, path).toBeVisible();
    await expect(banner, path).toContainText("DEMO: invented data");
  }
  expect(seen.errors).toEqual([]);
  expect(seen.external()).toEqual([]);
});

test("every evidence link on every claim page lands on the passage it names", async ({ page }) => {
  await page.goto(`${ISSUE}/evidence`);
  const claimLinks = await page
    .locator("[data-claim] a[href*='/claims/']")
    .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
  expect(claimLinks.length).toBe(13);
  // Collect every passage each claim page links to, then load each source once and find them all.
  const anchors = new Map<string, Set<string>>();
  for (const claimPath of claimLinks) {
    await page.goto(claimPath);
    const sourceLinks = await page
      .getByRole("link", { name: "Open in source" })
      .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
    expect(sourceLinks.length, claimPath).toBeGreaterThan(0);
    for (const href of sourceLinks) {
      const [sourcePath, anchor] = href.split("#");
      expect(sourcePath, href).toMatch(/^\/sources\/[\w-]+$/);
      if (!anchors.has(sourcePath)) anchors.set(sourcePath, new Set());
      anchors.get(sourcePath)!.add(anchor);
    }
  }
  let checked = 0;
  for (const [sourcePath, ids] of anchors) {
    const response = await page.goto(sourcePath);
    expect(response?.status(), sourcePath).toBe(200);
    for (const id of ids) {
      await expect(
        page.locator(`[id="${id}"][data-passage-anchor]`),
        `${sourcePath}#${id}`,
      ).toHaveCount(1);
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThan(30);
});

test("source pages confirm their text matches the archived copy", async ({ page }) => {
  await page.goto("/sources/air-assessment#table-5");
  await expect(page.getByTestId("hash-check")).toHaveAttribute("data-matches", "true");
  await expect(page.locator("#table-5")).toBeVisible();
});

test("unsupported claims stay visibly unresolved", async ({ page }) => {
  await page.goto(`${ISSUE}/evidence`);
  await expect(page.locator('[data-claim="emissions-safe"]')).toHaveAttribute(
    "data-status",
    "unresolved",
  );
  await expect(page.locator('[data-claim="emissions-safe"]')).toContainText("Unresolved");
  await expect(page.locator('[data-claim="upset-conditions"]')).toContainText(
    "Insufficient evidence",
  );

  await page.goto(`${ISSUE}/claims/guideline-protects-children`);
  await expect(page.getByTestId("status-reason")).toContainText("Insufficient evidence");
  await expect(page.getByTestId("status-reason")).toContainText(
    "Not studied is not the same as disproved",
  );

  // The chart-dependent claim says why it isn't reviewed.
  await page.goto(`${ISSUE}/claims/below-guideline-normal`);
  await expect(page.getByTestId("review-blockers")).toContainText("estimated by eye");
  await expect(page.getByTestId("extraction-warning")).toBeVisible();
  await expect(page.locator('[data-method="visually-estimated"]')).toHaveCount(2);

  // The coalition can't state it as fact either.
  await page.goto(`${ISSUE}/coalition`);
  await expect(page.locator('[data-paragraph="p4"]')).toHaveAttribute("data-ok", "false");
  await expect(page.getByTestId("statement-readiness")).toContainText("Not ready");
});

test("expired or unverified deadlines don't appear as actionable current deadlines", async ({
  page,
}) => {
  await page.goto(ISSUE);
  const now = page.getByTestId("actionable-now");
  await expect(now.locator("[data-route]")).toHaveCount(2);
  await expect(now.locator('[data-route="written-submission"]')).toHaveCount(0);
  await expect(now.locator('[data-route="open-house-feedback"]')).toHaveCount(0);

  await page.goto(`${ISSUE}/actions`);
  await expect(page.locator('[data-section="open"] [data-route]')).toHaveCount(2);
  const stale = page.locator('[data-section="check"] [data-route="written-submission"]');
  await expect(stale).toHaveAttribute("data-deadline-state", "check-date");
  await expect(stale).toContainText("Check this date before relying on it");
  const closed = page.locator('[data-section="closed"] [data-route="open-house-feedback"]');
  await expect(closed).toHaveAttribute("data-deadline-state", "closed");
  // A closed route offers no draft.
  await expect(closed.getByRole("button", { name: "Start a draft" })).toHaveCount(0);
});

test("proposed policies are not labelled enacted", async ({ page }) => {
  await page.goto(`${ISSUE}/timeline`);
  await expect(page.getByTestId("stage-bylaw-2030-14")).toHaveText("Proposed: not in force");
  const bylaw = page.locator('[data-decision="bylaw-2030-14"]');
  await expect(bylaw).not.toContainText("Enacted");
  await expect(bylaw.locator("[data-force]")).toHaveCount(4);
  await expect(bylaw.locator('[data-force="binding"]')).toHaveCount(0);
  await expect(
    page.locator('[data-decision="air-approval"] [data-force="guidance"]'),
  ).toContainText("Guidance: not a legal limit");
});

test("nothing external happens without approval, and nothing is sent even with it", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const seen = watch(page);
  await page.goto(`${ISSUE}/actions`);
  await page.getByTestId("start-draft-statement-of-concern").click();
  const drafter = page.getByTestId("drafter-statement-of-concern");
  await drafter.getByRole("button", { name: "Review before sending" }).click();

  // Approval is impossible until both confirmations are ticked.
  const approve = drafter.getByTestId("approve");
  await expect(approve).toBeDisabled();
  await drafter.getByTestId("confirm-destination").check();
  await expect(approve).toBeDisabled();
  await drafter.getByTestId("confirm-read").check();
  await approve.click();

  // The template still has [placeholders]: approved, but refused.
  await expect(drafter.getByTestId("gate-reasons")).toContainText("square brackets");
  await expect(drafter.getByTestId("handoff")).toHaveCount(0);

  // Write it properly, approve again: handed back to the person, nothing sent.
  await drafter.getByRole("button", { name: "Keep editing" }).click();
  await drafter
    .getByLabel("Draft")
    .fill(
      "To the Board, re file WERB-2030-0117. I live east of the site. I ask the Board to require upset-condition modelling before deciding.",
    );
  await drafter.getByRole("button", { name: "Review before sending" }).click();
  await drafter.getByTestId("approve").click();
  await expect(drafter.getByTestId("handoff")).toContainText("Nothing has been sent");

  // Edited after approval: the approval no longer counts.
  await drafter.getByRole("button", { name: "Keep editing" }).click();
  await drafter.getByLabel("Draft").fill("Changed after approval.");
  await drafter.getByRole("button", { name: "Review before sending" }).click();
  await expect(drafter.getByTestId("handoff")).toHaveCount(0);

  // A contact detail in the draft is caught before review.
  await drafter.getByLabel("Draft").fill("Phone the councillor at home on 555-201-3344.");
  await expect(drafter.getByTestId("draft-finding").first()).toContainText("phone number");

  expect(seen.writes()).toEqual([]);
  expect(seen.external()).toEqual([]);
});

test("the coalition workspace keeps changes in this browser and refuses doxxing and accusations", async ({
  page,
}) => {
  await page.goto(`${ISSUE}/coalition`);
  const note = page.getByTestId("add-note");
  await note.getByRole("textbox").fill("Her home address is 42 Maple Crescent");
  await note.getByRole("button", { name: "Add" }).click();
  await expect(note.getByTestId("blocked-reason").first()).toContainText("Not added");
  await expect(page.getByTestId("notes").locator("li")).toHaveCount(0);

  await note.getByRole("textbox").fill("The councillor is corrupt");
  await note.getByRole("button", { name: "Add" }).click();
  await expect(note.getByTestId("blocked-reason")).toContainText("Integrity Commissioner");

  const task = page.getByTestId("add-task");
  await task.getByRole("textbox").fill("Ask the Town Clerk whether speakers register in advance");
  await task.getByRole("button", { name: "Add" }).click();
  await page.reload();
  await expect(page.getByTestId("task-list")).toContainText("speakers register in advance");

  await page.getByTestId("clear-local").click();
  await page.reload();
  await expect(page.getByTestId("task-list")).not.toContainText("speakers register in advance");
});

test("an unresearched issue and an unmatched search say so instead of guessing", async ({
  page,
}) => {
  await page.goto("/issues/meadowmere-transit-fares");
  await expect(page.getByTestId("not-researched")).toContainText(
    "No evidence has been gathered or reviewed",
  );
  await page.goto("/?q=fluoride");
  await expect(page.getByTestId("no-results")).toContainText("doesn’t guess");
});

test("the API is read-only and labelled", async ({ request }) => {
  const list = await request.get("/api/v0/issues?q=air");
  expect(list.status()).toBe(200);
  const body = await list.json();
  expect(body.demo).toBe(true);
  expect(body.data.map((i: { id: string }) => i.id)).toEqual(["corvane-meadowmere"]);
  for (const method of ["post", "put", "delete", "patch"] as const) {
    expect((await request[method]("/api/v0/issues")).status(), method).toBe(405);
  }
  const actions = await (await request.get("/api/v0/issues/corvane-meadowmere/actions")).json();
  expect(actions.data.open.map((r: { id: string }) => r.id).sort()).toEqual([
    "speak-at-hearing",
    "statement-of-concern",
  ]);
});
