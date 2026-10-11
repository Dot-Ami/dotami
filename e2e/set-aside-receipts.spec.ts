/**
 * [8i] Receipts set aside by Start a new key, seen from a copy run from source
 * (docs/architecture/expense-records.md § 12). Only the desktop app's main process can open an old key,
 * so a copy run from source never offers "Bring these receipts back": Settings and What DotAmi knows
 * about you say, in one sentence, that this copy can't, and that the desktop app can. The button itself
 * is driven in the real app (e2e-desktop/desktop.spec.ts).
 *
 * The suite's own server is a copy from source over prisma/e2e/. This file puts one set-aside folder
 * into its backups folder for its own test and removes it afterwards, so the other files' counts of
 * set-aside folders (e2e/your-data.spec.ts) are as they were.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { SET_ASIDE_FROM_SOURCE } from "../lib/expenses/receipts/protection";

const folder = path.join(process.cwd(), "prisma", "e2e", "backups", "receipts-locked-1760000000123");

test.afterEach(() => rmSync(folder, { recursive: true, force: true }));

test("a copy run from source says it can't bring set-aside receipts back, and offers no button", async ({ page }) => {
  // Before there is a set-aside folder: nothing is said about one.
  await page.goto("/settings");
  const data = page.getByRole("region", { name: "Data and backups" });
  await expect(data).toContainText("Receipts in this copy aren't encrypted.");
  await expect(data).not.toContainText(SET_ASIDE_FROM_SOURCE);

  // A folder as Start a new key leaves it: a locked receipt and the old key file.
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    path.join(folder, `${"cd".repeat(16)}.png`),
    Buffer.concat([Buffer.from("DOTAMI-RECEIPT\x01", "latin1"), Buffer.from("0011223344556677", "hex"), Buffer.alloc(40, 5)]),
  );
  writeFileSync(path.join(folder, "receipts.key"), JSON.stringify({ format: 1, keyId: "0011223344556677", wrapped: "bm90IHRoaXMgb25l" }));

  await page.reload();
  await expect(data).toContainText(SET_ASIDE_FROM_SOURCE);
  await expect(page.getByRole("button", { name: "Bring these receipts back" })).toHaveCount(0);

  await page.goto("/your-data");
  await expect(page.getByText(SET_ASIDE_FROM_SOURCE)).toBeVisible();
  await expect(page.getByRole("button", { name: "Bring these receipts back" })).toHaveCount(0);
});
