/**
 * [8i] Showing a receipt inside DotAmi, in a real browser against the production build, by the rules
 * of § 8 of docs/architecture/expense-records.md: a picture through the image decoder from a blob:
 * address, a PDF drawn by pdf.js in DotAmi's own worker, and hostile files: a PDF with JavaScript,
 * polyglots, a picture claiming 900 megapixels, files that disagree with their row, a file changed on
 * the disk. The hostile files that DotAmi would refuse to keep are put straight into this run's
 * receipts folder with a matching row, as a file from somewhere else could be. Names are invented.
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { RECEIPT_REFUSALS } from "../lib/expenses/receipts/refusals";
import { VIEW_MESSAGES } from "../lib/expenses/receipts/viewer/messages";
import { manyPagePdf, pdf, png } from "../tests/helpers/receipt-files";

// This run's data folder (playwright.config.ts): the data file and the receipts folder beside it.
const DATA = path.join(process.cwd(), "prisma", "e2e");
const EXTENSION: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf" };

const agreedRow = (page: Page, text: string): Locator =>
  page.getByRole("list", { name: "Records you agreed to" }).getByRole("listitem").filter({ hasText: text });

/** Opens this run's data file for a moment, waiting out the server's own writes. */
const openData = () => new DatabaseSync(path.join(DATA, "dotami.db"), { timeout: 5_000 });

/** Keeps one agreed record through DotAmi's own routes, from its own page; returns its id. */
async function keptRecord(page: Page, paidTo: string): Promise<string> {
  return page.evaluate(async (payee) => {
    const post = async (url: string, body: unknown) =>
      (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json() as Promise<{
        expenses: { id: string }[];
      }>;
    const day = new Date().toLocaleDateString("en-CA");
    const proposed = await post("/api/expenses/propose", {
      ventureId: null,
      source: { kind: "agent", label: "the viewer test" },
      expenses: [{ date: day, amountCents: 1_234, paidTo: payee, whatFor: "a receipt to look at" }],
    });
    const id = proposed.expenses[0].id;
    await post("/api/expenses/agree", { expenseIds: [id] });
    return id;
  }, paidTo);
}

/** Adds a receipt through the page, as a person does. */
async function addThroughPage(row: Locator, name: string, mimeType: string, buffer: Buffer) {
  await row.getByRole("button", { name: "Add a receipt" }).click();
  await row.getByLabel("Choose the receipt file").setInputFiles({ name, mimeType, buffer });
  await expect(row.getByRole("button", { name: "Show receipt" })).toBeVisible();
}

/**
 * Puts a file straight into the receipts folder with a row describing it (its true size and SHA-256),
 * bypassing every check DotAmi makes when a receipt is added.
 */
function plant(expenseId: string, type: string, bytes: Buffer) {
  const id = randomBytes(16).toString("hex");
  // The folder exists once DotAmi has kept a receipt; a run that starts with this test makes it.
  mkdirSync(path.join(DATA, "receipts"), { recursive: true });
  writeFileSync(path.join(DATA, "receipts", `${id}.${EXTENSION[type]}`), bytes);
  const db = openData();
  try {
    db.prepare(`INSERT INTO "Receipt" (id, expenseId, type, bytes, sha256) VALUES (?, ?, ?, ?, ?)`).run(
      id,
      expenseId,
      type,
      bytes.length,
      createHash("sha256").update(bytes).digest("hex"),
    );
  } finally {
    db.close();
  }
}

/** Watches the page for anything a receipt must never cause: a dialog, a new window, a request. */
function watch(page: Page) {
  const seen = { dialogs: [] as string[], popups: 0, requests: [] as string[], urls: [] as string[] };
  page.on("dialog", (d) => {
    seen.dialogs.push(d.message());
    void d.dismiss();
  });
  page.on("popup", () => (seen.popups += 1));
  // A blob: address is the page reading its own Blob; it is listed as "blob" so it can be told apart.
  page.on("request", (r) => seen.requests.push(r.url().startsWith("blob:") ? `${r.method()} blob` : `${r.method()} ${new URL(r.url()).pathname}`));
  page.on("request", (r) => seen.urls.push(r.url()));
  return seen;
}

const viewer = (page: Page) => page.getByRole("dialog", { name: /^Receipt: / });

/** True when a drawn page has dark pixels on it (the receipt's text), not just a white sheet. */
async function hasInk(canvas: Locator): Promise<boolean> {
  return canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < data.length; i += 4) if (data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100) return true;
    return false;
  });
}

test("a receipt opens inside DotAmi: a picture from a blob: address, a PDF drawn page by page in DotAmi's own worker", async ({ page }) => {
  const PAYEE = `Example Copy Centre viewer test ${Date.now()}`;
  await page.goto("/expenses");
  await keptRecord(page, PAYEE);
  await page.reload();
  const row = agreedRow(page, PAYEE);
  await expect(row).toBeVisible();
  const seen = watch(page);

  // A picture.
  const picture = png(6, 4, { rgb: [20, 20, 20] });
  await addThroughPage(row, "receipt.png", "image/png", picture);
  seen.requests.length = 0;
  await row.getByRole("button", { name: "Show receipt" }).click();
  const dialog = viewer(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("PNG picture, shown inside DotAmi from its copy on this computer. Nothing in it can be clicked or run.");
  const img = dialog.getByRole("img", { name: "The receipt picture (6 × 4 pixels)" });
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(6);
  expect(await img.getAttribute("src")).toMatch(/^blob:http:\/\/127\.0\.0\.1:\d+\//);
  // The bytes, from DotAmi's own server, then the page reading its own Blob: nothing else.
  expect(seen.requests).toEqual(["POST /api/expenses/receipt/file", "GET blob"]);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();

  // A PDF: drawn by pdf.js in a worker started from DotAmi's own files.
  await row.getByRole("button", { name: "Remove receipt" }).click();
  await row.getByRole("button", { name: "Remove receipt" }).click();
  await addThroughPage(row, "receipt.pdf", "application/pdf", pdf({ text: "Example Copy Centre receipt" }));
  const workers: string[] = [];
  page.on("worker", (w) => workers.push(new URL(w.url()).pathname));
  seen.requests.length = 0;
  await row.getByRole("button", { name: "Show receipt" }).click();
  const pageOne = viewer(page).getByRole("img", { name: "Page 1 of 1" });
  await expect(pageOne).toBeVisible();
  await expect.poll(() => hasInk(pageOne)).toBe(true);
  expect(workers.some((w) => w.startsWith("/_next/static/"))).toBe(true);
  expect(seen.requests.filter((r) => !r.startsWith("GET /_next/static/"))).toEqual(["POST /api/expenses/receipt/file"]);
  // Escape closes it.
  await page.keyboard.press("Escape");
  await expect(viewer(page)).toBeHidden();
  expect(seen.dialogs).toEqual([]);
  expect(seen.popups).toBe(0);
});

test("hostile receipts: a PDF with JavaScript and polyglots are drawn and nothing in them runs; a huge picture, a swapped file and a changed file are refused", async ({
  page,
}) => {
  const stamp = Date.now();
  await page.goto("/expenses");
  const start = page.url();
  const ids: Record<string, string> = {};
  for (const name of ["js-pdf", "png-polyglot", "pdf-polyglot", "huge", "svg-as-png", "pdf-as-png", "changed"]) {
    ids[name] = await keptRecord(page, `Example Hostile ${name} ${stamp}`);
  }
  // DotAmi wouldn't keep these three, so they are put in the folder directly, each with a matching row.
  plant(ids.huge, "image/png", png(1, 1, { claim: { width: 30_000, height: 30_000 } }));
  plant(ids["svg-as-png"], "image/png", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(\'svg ran\')"/>'));
  plant(ids["pdf-as-png"], "image/png", pdf({ text: "a PDF under a picture's row" }));
  await page.reload();
  const seen = watch(page);
  const row = (name: string) => agreedRow(page, `Example Hostile ${name} ${stamp}`);

  // A PDF whose OpenAction would show an alert and send a form to an address, and whose close action
  // would open one. It is a real PDF, so it is kept; drawn by pdf.js, its JavaScript never runs.
  const withJs = pdf({
    text: "A receipt with JavaScript in it",
    catalogExtra: "/OpenAction 6 0 R /AA << /WC 7 0 R >> ",
    extraObjects: [
      "<< /Type /Action /S /JavaScript /JS (app.alert('pdf ran'); this.submitForm('http://127.0.0.1:9/steal');) >>",
      "<< /Type /Action /S /URI /URI (http://127.0.0.1:9/opened) >>",
    ],
  });
  await addThroughPage(row("js-pdf"), "receipt.pdf", "application/pdf", withJs);
  await row("js-pdf").getByRole("button", { name: "Show receipt" }).click();
  let drawn = viewer(page).getByRole("img", { name: "Page 1 of 1" });
  await expect(drawn).toBeVisible();
  await expect.poll(() => hasInk(drawn)).toBe(true);
  await page.keyboard.press("Escape");

  // A valid PNG with a web page and a script after its end: shown as the picture it starts as.
  const pngPolyglot = Buffer.concat([png(3, 3, { rgb: [0, 0, 0] }), Buffer.from("<html><script>alert('png ran')</script></html>", "latin1")]);
  await addThroughPage(row("png-polyglot"), "receipt.html", "text/html", pngPolyglot);
  await row("png-polyglot").getByRole("button", { name: "Show receipt" }).click();
  const img = viewer(page).getByRole("img", { name: "The receipt picture (3 × 3 pixels)" });
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(3);
  await page.keyboard.press("Escape");

  // A PDF with a web page appended: drawn as the PDF.
  const pdfPolyglot = Buffer.concat([pdf({ text: "A PDF that is also a page" }), Buffer.from("<html><script>alert('pdf page ran')</script></html>", "latin1")]);
  await addThroughPage(row("pdf-polyglot"), "receipt.pdf", "application/pdf", pdfPolyglot);
  await row("pdf-polyglot").getByRole("button", { name: "Show receipt" }).click();
  drawn = viewer(page).getByRole("img", { name: "Page 1 of 1" });
  await expect(drawn).toBeVisible();
  await expect.poll(() => hasInk(drawn)).toBe(true);
  await page.keyboard.press("Escape");

  // Refused in the window, before anything decodes them: the alert first, then no picture at all.
  const refusedWith: [string, string][] = [
    ["huge", RECEIPT_REFUSALS["too-many-pixels"]],
    ["svg-as-png", VIEW_MESSAGES.unreadable],
    ["pdf-as-png", VIEW_MESSAGES.replaced],
  ];
  for (const [name, message] of refusedWith) {
    await row(name).getByRole("button", { name: "Show receipt" }).click();
    await expect(viewer(page).getByRole("alert")).toHaveText(message);
    await expect(viewer(page).getByRole("img")).toHaveCount(0);
    await page.keyboard.press("Escape");
  }

  // A picture added properly, then changed on the disk: the server refuses it.
  await addThroughPage(row("changed"), "receipt.png", "image/png", png(4, 4));
  const db = openData();
  const receiptId = (db.prepare(`SELECT id FROM "Receipt" WHERE expenseId = ?`).get(ids.changed) as { id: string }).id;
  db.close();
  const stored = path.join(DATA, "receipts", `${receiptId}.png`);
  const changed = Buffer.from(readFileSync(stored));
  changed[changed.length - 1] ^= 0xff;
  writeFileSync(stored, changed);
  await row("changed").getByRole("button", { name: "Show receipt" }).click();
  await expect(viewer(page).getByRole("alert")).toContainText("The receipt file changed on this computer since you added it");
  await expect(viewer(page).getByRole("img")).toHaveCount(0);
  await page.keyboard.press("Escape");

  // Nothing ran, nothing opened, nothing went anywhere but DotAmi's own routes, and the window stayed put.
  expect(seen.dialogs).toEqual([]);
  expect(seen.popups).toBe(0);
  // Every request stayed on this computer, at DotAmi's own address (its pages, its scripts, its routes,
  // and the page's own blob: addresses); none went to the addresses inside the PDF.
  const origin = new URL(start).origin;
  expect(seen.urls.length).toBeGreaterThan(0);
  expect(seen.urls.filter((u) => !(u.startsWith(`${origin}/`) || u.startsWith(`blob:${origin}/`)))).toEqual([]);
  expect(seen.urls.filter((u) => u.includes("/steal") || u.includes("/opened") || u.includes(":9/"))).toEqual([]);
  // The receipt bytes were asked for once per Show receipt, by POST.
  expect(seen.requests.filter((r) => r.endsWith("/api/expenses/receipt/file"))).toEqual(Array(7).fill("POST /api/expenses/receipt/file"));
  expect(page.url()).toBe(start);
});

test("the receipt route answers only DotAmi's own page, and never as a page", async ({ page }) => {
  const PAYEE = `Example Route viewer test ${Date.now()}`;
  await page.goto("/expenses");
  const id = await keptRecord(page, PAYEE);
  await page.reload();
  await addThroughPage(agreedRow(page, PAYEE), "receipt.pdf", "application/pdf", pdf({ text: "zq-route-marker" }));

  // From the page: the bytes, as plain data.
  const fromPage = await page.evaluate(async (expenseId) => {
    const res = await fetch("/api/expenses/receipt/file", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expenseId }) });
    const header = (name: string) => res.headers.get(name);
    return {
      status: res.status,
      type: header("content-type"),
      nosniff: header("x-content-type-options"),
      disposition: header("content-disposition"),
      cache: header("cache-control"),
      csp: header("content-security-policy"),
      text: await res.text(),
    };
  }, id);
  expect(fromPage).toMatchObject({ status: 200, type: "application/octet-stream", nosniff: "nosniff", disposition: "attachment", cache: "no-store" });
  // The policy the real server sends (next.config.mjs's headers are applied over the route's own, so
  // they must carry it too): were the answer ever loaded as a page, nothing in it could run or load.
  expect(fromPage.csp).toBe("default-src 'none'; frame-ancestors 'none'; sandbox");
  expect(fromPage.text).toContain("zq-route-marker");

  // From outside the page (an agent, a script, another program through the browser): refused.
  const outside = await page.request.post("/api/expenses/receipt/file", { data: { expenseId: id } });
  expect(outside.status()).toBe(403);
  expect(await outside.text()).not.toContain("zq-route-marker");
  // As an address: there is no GET, so nothing can load it as a page or a picture.
  const asAddress = await page.request.get("/api/expenses/receipt/file");
  expect(asAddress.status()).toBe(405);
});

// Each page is held to MAX_PAGE_PIXELS, but 20 pages at that cap would be about 1.3 GB of pictures.
// Tall, narrow pages (100 x 625 points) are drawn at exactly the per-page cap, 1600 x 10,000 pixels;
// the viewer stops when the pages so far reach its total and says how many it shows.
test("a hostile PDF of 20 huge pages: only as many pages as the memory limit allows are drawn, and the viewer says so", async ({ page }) => {
  test.setTimeout(90_000);
  const PAYEE = `Example Tall Pages viewer test ${Date.now()}`;
  await page.goto("/expenses");
  await keptRecord(page, PAYEE);
  await page.reload();
  const row = agreedRow(page, PAYEE);
  await addThroughPage(row, "receipt.pdf", "application/pdf", manyPagePdf(20, 100, 625));
  const seen = watch(page);

  await row.getByRole("button", { name: "Show receipt" }).click();
  const first = viewer(page).getByRole("img", { name: "Page 1 of 20" });
  await expect(first).toBeVisible({ timeout: 30_000 });
  expect(await first.evaluate((el) => [(el as HTMLCanvasElement).width, (el as HTMLCanvasElement).height])).toEqual([1600, 10_000]);
  await expect(viewer(page)).toContainText("DotAmi shows the first 5 pages; this PDF has 20. The rest are kept in the file.");
  await expect(viewer(page).getByRole("img", { name: /^Page \d+ of 20$/ })).toHaveCount(5);
  await expect(viewer(page).getByRole("img", { name: "Page 6 of 20" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  expect(seen.dialogs).toEqual([]);
});
