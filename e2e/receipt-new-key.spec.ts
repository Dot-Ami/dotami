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
 *
 * After the move (expense-records.md § 11): a copy run from source has no window bridge, so nothing
 * restarts and the amber line says to restart it by hand; in the desktop window the page says "DotAmi
 * will restart now…" and only then asks the bridge (desktop/window-preload.cjs) to restart. The second
 * test stands in for that bridge, answering "refused" the way the desktop app does when it won't
 * restart, and starts its own server as the desktop app's (DOTAMI_DESKTOP=1); the real restart is the
 * desktop test's (e2e-desktop/desktop.spec.ts).
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

/**
 * Starts this file's own server on a fresh data folder. `desktop` starts it as the desktop app's server
 * (DOTAMI_DESKTOP=1, which the desktop app sets: lib/settings/today.ts), so its pages say what the
 * desktop app says.
 */
async function startServer({ desktop }: { desktop: boolean }) {
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
  delete env.DOTAMI_DESKTOP;
  if (desktop) env.DOTAMI_DESKTOP = "1";
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
}

async function stopServer() {
  if (server && server.exitCode === null) {
    const stopped = new Promise((resolve) => server!.once("exit", resolve));
    server.kill();
    await stopped;
  }
  server = null;
  rmSync(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

// The two servers run one after the other on the same port, each over a fresh data folder: a server
// can be pressed only once (afterwards its lock is "new-key-at-restart" until it restarts).
test.describe.configure({ mode: "serial" });

const dataRegion = (page: Page) => page.getByRole("region", { name: "Data and backups" });

/** One agreed record on this server, kept through DotAmi's own routes from its own page. */
async function keptRecord(page: Page, paidTo: string) {
  await page.evaluate(async (payee) => {
    const post = async (url: string, body: unknown) =>
      (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json() as Promise<{
        expenses: { id: string }[];
      }>;
    const day = new Date().toLocaleDateString("en-CA");
    const proposed = await post("/api/expenses/propose", {
      ventureId: null,
      source: { kind: "agent", label: "the new-key test" },
      expenses: [{ date: day, amountCents: 1_234, paidTo: payee, whatFor: "a record with no receipt yet" }],
    });
    await post("/api/expenses/agree", { expenseIds: [proposed.expenses[0].id] });
  }, paidTo);
}

/** The agreed record's row on the Expenses page: Add a receipt is never offered while no receipt can be added. */
async function expectNoAddReceipt(page: Page, paidTo: string) {
  const row = page.getByRole("list", { name: "Records you agreed to" }).getByRole("listitem").filter({ hasText: paidTo });
  await expect(row).toContainText("Receipts can't be added now: the amber line at the top of this page says why.");
  await expect(row.getByRole("button", { name: "Add a receipt" })).toHaveCount(0);
}

test.describe("a copy run from source (no window bridge)", () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await startServer({ desktop: false });
  });
  test.afterAll(stopServer);

  test("Start a new key: asked twice with the cost first, nothing moved on cancel, then the folder named on the page and on the disk", async ({ page }) => {
    // Offered wherever the amber line shows: the Expenses page and What DotAmi knows about you, as well as Settings.
    await page.goto(`${ORIGIN}/expenses`);
    await expect(page.getByRole("status").filter({ hasText: "DotAmi can't open the key to your receipts." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start a new key…" })).toBeVisible();
    // While the key can't be opened, an agreed record offers no Add a receipt (the server would refuse it).
    await keptRecord(page, "Corner Hardware");
    await page.reload();
    await expectNoAddReceipt(page, "Corner Hardware");
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

    // The line now says where they went and what to do, and the button is gone. This copy has no window
    // bridge, so nothing restarts: it says so plainly, and to restart it by hand (expense-records.md § 11).
    await expect(data).toContainText("DotAmi starts a new key for your receipts the next time it starts.");
    await expect(data).toContainText(movedTo);
    await expect(data).toContainText("This copy doesn't restart by itself: stop it and start it again to start the new key.");
    await expect(data).not.toContainText("DotAmi will restart now");
    await expect(data.getByRole("button", { name: "Start a new key…" })).toHaveCount(0);

    // The other two places say the same, without the button.
    await page.goto(`${ORIGIN}/expenses`);
    await expect(page.getByRole("status").filter({ hasText: "DotAmi starts a new key for your receipts the next time it starts." })).toContainText(movedTo);
    await expect(page.getByRole("button", { name: "Start a new key…" })).toHaveCount(0);
    // Nor until the restart: the page never claims there was nothing to move.
    await expectNoAddReceipt(page, "Corner Hardware");
    await expect(page.getByText("There were no locked receipt files left to move.")).toHaveCount(0);
    await page.goto(`${ORIGIN}/your-data`);
    await expect(page.getByText("DotAmi starts a new key for your receipts the next time it starts.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start a new key…" })).toHaveCount(0);
  });
});

test.describe("the desktop window (a stand-in for its bridge)", () => {
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await startServer({ desktop: true });
  });
  test.afterAll(stopServer);

  /** What the stand-in bridge was asked: when, and whether "DotAmi will restart now" was on the page then. */
  type Asked = { lineShown: boolean };
  const asked = (page: Page) => page.evaluate(() => (window as unknown as { __restartAsked: Asked[] }).__restartAsked);

  test("after the move the page says DotAmi will restart now, then asks the bridge once; a refused restart leaves the line saying to restart by hand", async ({ page }) => {
    // desktop/window-preload.cjs, stood in for: the same three calls, the restart answering "refused" as the
    // desktop app does when it won't restart. It records whether the page had said so first.
    await page.addInitScript(() => {
      const w = window as unknown as { __restartAsked: { lineShown: boolean }[]; dotamiDesktop: unknown };
      w.__restartAsked = [];
      w.dotamiDesktop = {
        heicStopped: () => Promise.resolve(false),
        heicFailed: () => {},
        restartForNewKey: () => {
          w.__restartAsked.push({ lineShown: document.body.innerText.includes("DotAmi will restart now to start the new key") });
          return Promise.resolve("refused");
        },
      };
    });
    await page.goto(`${ORIGIN}/settings`);
    const data = dataRegion(page);
    await expect(data).toContainText("DotAmi can't open the key to your receipts.");

    // The second ask says beforehand that DotAmi restarts by itself; cancelling asks for nothing.
    await data.getByRole("button", { name: "Start a new key…" }).click();
    await page.getByRole("dialog", { name: "Start a new key, and give up the locked receipts?" }).getByRole("button", { name: "Continue…" }).click();
    const sure = page.getByRole("dialog", { name: "Are you sure?" });
    await expect(sure).toContainText("Then DotAmi restarts by itself to start the new key.");
    await sure.getByRole("button", { name: "Cancel" }).click();
    expect(await asked(page)).toEqual([]);

    await data.getByRole("button", { name: "Start a new key…" }).click();
    await page.getByRole("dialog", { name: "Start a new key, and give up the locked receipts?" }).getByRole("button", { name: "Continue…" }).click();
    await page.getByRole("dialog", { name: "Are you sure?" }).getByRole("button", { name: "Give up the locked receipts and start a new key" }).click();

    // What is about to happen is said first, with where the files went; the restart is asked for after it.
    const backups = path.join(folder, "backups");
    await expect.poll(() => (existsSync(backups) ? readdirSync(backups) : [])).toHaveLength(1);
    const movedTo = path.join(backups, readdirSync(backups)[0]);
    const status = data.getByRole("status").filter({ hasText: "DotAmi will restart now to start the new key…" });
    await expect(status).toContainText(movedTo);
    await expect.poll(() => asked(page), { timeout: 10_000 }).toHaveLength(1);
    expect(await asked(page)).toEqual([{ lineShown: true }]);

    // Refused: nothing restarted, so the page is refreshed and the amber line says what to do by hand.
    await expect(data).toContainText("DotAmi starts a new key for your receipts the next time it starts.");
    await expect(data).toContainText("DotAmi restarts by itself to start it. If it hasn't, close DotAmi and open it again.");
    await expect(data).toContainText(movedTo);
    await expect(data.getByRole("button", { name: "Start a new key…" })).toHaveCount(0);
    // Asked once only.
    await page.waitForTimeout(3_000);
    expect(await asked(page)).toHaveLength(1);
  });
});
