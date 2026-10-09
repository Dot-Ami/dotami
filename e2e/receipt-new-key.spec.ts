/**
 * [8i] "Start a new key…" in a real browser, on the production build (docs/architecture/expense-records.md
 * § 10): the button shows under the amber line while the receipts' key can't be opened, asks twice with
 * the cost said first, changes nothing when cancelled at either step, and then names the folder the
 * locked receipts went to, on the page and on the disk.
 *
 * The suite's own server is a copy from source, whose key state is "source", where the button never
 * shows. So this file starts a second server of its own, from the same build, with the environment the
 * desktop app gives its server when the key can't be opened (DOTAMI_RECEIPT_LOCK=key-unreadable;
 * desktop/main.mjs receiptLockEnv), over a data folder of its own (prisma/e2e-new-key/) holding a
 * receipt locked with a lost key and a key file this account can't open. It runs with the real rate
 * limits: the browser tests' switch is set only for the suite's own server (playwright.config.ts).
 */
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const PORT = 3124;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const root = process.cwd();
const folder = path.join(root, "prisma", "e2e-new-key");
const LOCKED = `${"ab".repeat(16)}.png`;
const lockedBytes = Buffer.concat([Buffer.from("DOTAMI-RECEIPT\x01", "latin1"), Buffer.from("0011223344556677", "hex"), Buffer.alloc(40, 3)]);
const keyFile = JSON.stringify({ format: 1, keyId: "0011223344556677", wrapped: Buffer.from("not this account's").toString("base64") });

let server: ChildProcess | null = null;

/** True when something already answers on the port (another run's server): this file then stops. */
const portTaken = () =>
  new Promise<boolean>((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: PORT });
    socket.setTimeout(2000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });

/** A fresh data folder: the tables, one locked receipt, a key file this account can't open. */
function prepareFolder() {
  if (existsSync(folder)) rmSync(folder, { recursive: true, force: true });
  mkdirSync(path.join(folder, "receipts"), { recursive: true });
  execFileSync(process.execPath, [path.join(root, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: "file:./e2e-new-key/dotami.db", CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
  writeFileSync(path.join(folder, "receipts", LOCKED), lockedBytes);
  writeFileSync(path.join(folder, "receipts.key"), keyFile);
}

/** Every file in the data folder but the database's own, with its bytes: "nothing moved" means unchanged. */
function files(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (at: string) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, e.name);
      if (e.isDirectory()) walk(full);
      else if (!e.name.startsWith("dotami.db")) out[path.relative(folder, full)] = readFileSync(full).toString("base64");
    }
  };
  walk(folder);
  return out;
}

test.beforeAll(async () => {
  test.setTimeout(120_000);
  if (await portTaken()) throw new Error(`Port ${PORT} is already in use: another run's server is answering there. Stop it, then start again.`);
  prepareFolder();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: "file:./e2e-new-key/dotami.db",
    ANTHROPIC_API_KEY: "",
    NEXT_TELEMETRY_DISABLED: "1",
    DOTAMI_RECEIPT_LOCK: "key-unreadable",
  };
  delete env.DOTAMI_E2E_RATE_LIMITS;
  delete env.DOTAMI_RECEIPT_KEY;
  // The build the suite's own server is running (playwright.config.ts built it before starting).
  server = spawn(process.execPath, [path.join(root, "scripts", "next.mjs"), "start", "-H", "127.0.0.1", "-p", String(PORT)], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Ready when THIS server says so (the same rule as the suite's own server).
  await new Promise<void>((resolve, reject) => {
    let said = "";
    const timer = setTimeout(() => reject(new Error(`the second server didn't start:\n${said}`)), 90_000);
    const listen = (chunk: Buffer) => {
      said += chunk.toString();
      if (/Ready in \d/.test(said)) {
        clearTimeout(timer);
        resolve();
      }
    };
    server!.stdout!.on("data", listen);
    server!.stderr!.on("data", listen);
    server!.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`the second server stopped (code ${code}):\n${said}`));
    });
  });
});

test.afterAll(async () => {
  if (server && server.exitCode === null) {
    const stopped = new Promise((resolve) => server!.once("exit", resolve));
    server.kill();
    await stopped;
  }
  server = null;
  rmSync(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
});

const dataRegion = (page: Page) => page.getByRole("region", { name: "Data and backups" });

test("Start a new key: asked twice with the cost first, nothing moved on cancel, then the folder named on the page and on the disk", async ({ page }) => {
  // Offered wherever the amber line shows: the Expenses page and What DotAmi knows about you, as well as Settings.
  await page.goto(`${ORIGIN}/expenses`);
  await expect(page.getByRole("status").filter({ hasText: "DotAmi can't open the key to your receipts." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a new key…" })).toBeVisible();
  await page.goto(`${ORIGIN}/your-data`);
  await expect(page.getByText("DotAmi can't open the key to your receipts.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a new key…" })).toBeVisible();

  await page.goto(`${ORIGIN}/settings`);
  const data = dataRegion(page);
  await expect(data).toContainText("DotAmi can't open the key to your receipts.");
  const before = files();

  // First ask: the cost, said exactly, and Cancel changes nothing.
  await data.getByRole("button", { name: "Start a new key…" }).click();
  let dialog = page.getByRole("dialog", { name: "Start a new key, and give up the locked receipts?" });
  await expect(dialog).toContainText("Starting one gives those receipts up for good, unless the old key comes back");
  await expect(dialog).toContainText("Nothing is deleted.");
  await expect(dialog).toContainText("restore it instead (File → Restore from a backup…)");
  // Cancel has the focus: Enter on the first sight of it doesn't go on.
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect(files()).toEqual(before);

  // Second ask, cancelled: still nothing.
  await data.getByRole("button", { name: "Start a new key…" }).click();
  await page.getByRole("dialog", { name: "Start a new key, and give up the locked receipts?" }).getByRole("button", { name: "Continue…" }).click();
  dialog = page.getByRole("dialog", { name: "Are you sure?" });
  await expect(dialog).toContainText("given up for good unless the old key comes back");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(files()).toEqual(before);

  // Both answered: the locked receipt and the key file go to one folder in backups/, named on the page.
  await data.getByRole("button", { name: "Start a new key…" }).click();
  await page.getByRole("dialog", { name: "Start a new key, and give up the locked receipts?" }).getByRole("button", { name: "Continue…" }).click();
  await page.getByRole("dialog", { name: "Are you sure?" }).getByRole("button", { name: "Give up the locked receipts and start a new key" }).click();

  const backups = path.join(folder, "backups");
  await expect.poll(() => (existsSync(backups) ? readdirSync(backups) : [])).toHaveLength(1);
  const [aside] = readdirSync(backups);
  expect(aside).toMatch(/^receipts-locked-\d+$/);
  const movedTo = path.join(backups, aside);
  expect(readdirSync(movedTo).sort()).toEqual([LOCKED, "receipts.key"]);
  expect(readFileSync(path.join(movedTo, LOCKED)).equals(lockedBytes)).toBe(true);
  expect(readFileSync(path.join(movedTo, "receipts.key"), "utf8")).toBe(keyFile);
  expect(readdirSync(path.join(folder, "receipts"))).toEqual([]);
  expect(existsSync(path.join(folder, "receipts.key"))).toBe(false);

  // The line now says where they went and what to do, and the button is gone.
  await expect(data).toContainText("DotAmi starts a new key for your receipts the next time it starts.");
  await expect(data).toContainText(movedTo);
  await expect(data).toContainText("Close DotAmi and open it again");
  await expect(data.getByRole("button", { name: "Start a new key…" })).toHaveCount(0);

  // The other two places say the same, without the button.
  await page.goto(`${ORIGIN}/expenses`);
  await expect(page.getByRole("status").filter({ hasText: "DotAmi starts a new key for your receipts the next time it starts." })).toContainText(movedTo);
  await expect(page.getByRole("button", { name: "Start a new key…" })).toHaveCount(0);
  await page.goto(`${ORIGIN}/your-data`);
  await expect(page.getByText("DotAmi starts a new key for your receipts the next time it starts.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a new key…" })).toHaveCount(0);
});
