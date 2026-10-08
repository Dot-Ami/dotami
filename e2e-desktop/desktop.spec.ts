/**
 * The desktop app, used like a person uses it: start it, describe a venture, close it, start it
 * again — the venture is still there; save a file the page made; back up on one computer, restore
 * on another. Each run gets
 * its own empty data folders (DOTAMI_DATA_DIR), so the database is created and migrated by the
 * app itself on first launch. Native file dialogs are answered by replacing them in the app's
 * main process; the passphrase window is the real one, filled in like a person would.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";

const root = path.resolve(__dirname, "..");

let tmp = "";
let dataDir = "";
let app: ElectronApplication | null = null;

// DOTAMI_DESKTOP_EXE points the test at a packaged app (dist-desktop/out/win-unpacked/DotAmi.exe,
// from `npm run desktop:package`) instead of running this checkout with Electron.
const packagedExe = process.env.DOTAMI_DESKTOP_EXE;

async function launch(dir = dataDir): Promise<Page> {
  // ANTHROPIC_API_KEY is set here on purpose: the app must not pass a key from the shell it was
  // started from to its server (desktop/main.mjs serverEnv) — the settings page proves it didn't.
  // DOTAMI_NO_UPDATE_CHECK keeps a packaged app from asking GitHub for updates during the test.
  app = await electron.launch({
    ...(packagedExe ? { executablePath: packagedExe, args: [] } : { args: [root] }),
    env: { ...process.env, DOTAMI_DATA_DIR: dir, ANTHROPIC_API_KEY: "sk-from-the-shell", DOTAMI_NO_UPDATE_CHECK: "1" },
  });
  const page = await app.firstWindow();
  await page.waitForURL(/^http:\/\/127\.0\.0\.1:\d+\//);
  return page;
}

async function quit() {
  await app?.close();
  app = null;
}

/** Describe a venture and open its map — the same path as e2e/app.spec.ts; it's saved as "My venture". */
async function describeVenture(page: Page) {
  await page.getByPlaceholder(/What are you building/).fill("A mobile bike repair business with a van in Calgary");
  await page.getByRole("button", { name: "Map it →" }).click();
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: "Looks right →" }).click();
  await page.getByText("Current employment", { exact: true }).locator("xpath=following-sibling::select").selectOption("self-employed");
  await page.getByRole("button", { name: "Open my map →" }).click();
  await expect(page.getByRole("button", { name: /^Sole Prop activation, / })).toBeVisible();
}

/** Clicks one of the app's own menu items, as the person would. */
async function clickMenu(id: string) {
  await app!.evaluate(({ Menu }, itemId) => {
    Menu.getApplicationMenu()!.getMenuItemById(itemId)!.click();
  }, id);
}

test.beforeEach(() => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "dotami-desktop-"));
  dataDir = path.join(tmp, "computer-a");
  mkdirSync(dataDir);
});

test.afterEach(async () => {
  // Close the app even when the test failed part-way, so its folders can be removed.
  await quit().catch(() => {});
  try {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  } catch (error) {
    // Electron's graphics process can keep its shader cache locked for a moment after the app
    // quits on Windows. A leftover temp folder is harmless; don't let it hide the real result.
    console.warn(`left behind ${tmp}: ${(error as Error).message}`);
  }
});

test("start → describe a venture → close → start again: the venture is still there", async () => {
  // First launch on an empty folder: the app creates its own database there.
  let page = await launch();
  await expect(page.getByRole("heading", { name: /Map any venture/ })).toBeVisible();
  expect(existsSync(path.join(dataDir, "dotami.db"))).toBe(true);
  // The start is in the log, written by desktop/log.mjs: the start line and the database step.
  const startLog = readFileSync(path.join(dataDir, "logs", "server.log"), "utf8");
  expect(startLog).toMatch(/--- \S+ starting DotAmi \d+\.\d+\.\d+/);
  expect(startLog).toContain("[desktop] database ready");
  expect(startLog).not.toContain("[desktop] stopped:");

  await describeVenture(page);

  // The settings page reports the app's own data file, and that nothing leaves the computer —
  // the key in the shell's environment never reached the server.
  await page.goto(new URL("/settings", page.url()).toString());
  await expect(page.getByRole("region", { name: "Data and backups" }).locator("code").first()).toHaveText(
    path.join(dataDir, "dotami.db"),
  );
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("File → Back up…");
  await expect(page.getByRole("region", { name: "Privacy" })).toContainText("DotAmi sends nothing off this computer.");

  // An outside link opens in the person's own browser, never inside the app's window.
  await app!.evaluate(({ shell }) => {
    (globalThis as { opened?: string[] }).opened = [];
    shell.openExternal = async (url: string) => {
      (globalThis as { opened?: string[] }).opened!.push(url);
    };
  });
  await page.getByRole("link", { name: "open source on GitHub" }).click();
  await expect.poll(() => app!.evaluate(() => (globalThis as { opened?: string[] }).opened)).toEqual([
    "https://github.com/Dot-Ami/dotami",
  ]);
  expect(app!.windows()).toHaveLength(1);
  expect(new URL(page.url()).hostname).toBe("127.0.0.1");

  await quit();

  // Second launch, same folder: the venture saved before closing is still there.
  page = await launch();
  await expect(page.getByRole("heading", { name: /Map any venture/ })).toBeVisible();
  await page.getByRole("link", { name: "Your ideas →" }).click();
  await expect(page.getByRole("heading", { name: "My venture", level: 2 })).toBeVisible();
});

test("Add to my calendar asks where to save with a Save dialog, writes the file there, and writes nothing when cancelled", async () => {
  const page = await launch();
  await page.goto(new URL("/settings", page.url()).toString());
  const row = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Figure reminders", level: 3, exact: true }) });
  const quarterly = row.getByRole("checkbox", { name: "Quarterly" });
  await expect(quarterly).toBeEnabled(); // the saved value has been read
  const saved = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/settings" && r.request().method() === "PUT");
  await quarterly.check();
  expect((await saved).status()).toBe(200);

  // The Save dialog is answered by replacing it in the main process (a native dialog can't be
  // clicked from a test). Every download's end state and save path are recorded, so a cancel —
  // or a file written somewhere without asking — can be seen too.
  const target = path.join(tmp, "chosen folder", "reminders.ics");
  mkdirSync(path.dirname(target));
  await app!.evaluate(({ dialog, session }, file) => {
    type Seen = { asked: Array<{ title?: string; defaultPath?: string }>; answer?: string; ends: string[]; paths: string[] };
    const g = globalThis as unknown as { seen: Seen };
    g.seen = { asked: [], answer: file, ends: [], paths: [] };
    dialog.showSaveDialogSync = ((...args: unknown[]) => {
      const options = args.at(-1) as { title?: string; defaultPath?: string };
      g.seen.asked.push({ title: options.title, defaultPath: options.defaultPath });
      return g.seen.answer;
    }) as typeof dialog.showSaveDialogSync;
    // Ahead of the app's own listener, so a download it cancels at once is still seen to end.
    // (prependListener has no typed overload for this event, so the item is typed by hand.)
    session.defaultSession.prependListener("will-download", (_event: unknown, item: Electron.DownloadItem) => {
      item.once("done", (_e, state) => {
        g.seen.ends.push(state);
        g.seen.paths.push(item.getSavePath());
      });
    });
  }, target);
  const seen = () =>
    app!.evaluate(() => (globalThis as unknown as { seen: { asked: Array<{ defaultPath?: string }>; ends: string[]; paths: string[] } }).seen);

  await row.getByRole("button", { name: "Add to my calendar" }).click();
  // The file is where the person chose, and it is the calendar file.
  await expect.poll(async () => (await seen()).ends, { timeout: 15_000 }).toEqual(["completed"]);
  expect((await seen()).paths).toEqual([target]);
  const text = readFileSync(target, "utf8");
  expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  expect(text).toContain("\r\nRRULE:FREQ=MONTHLY;INTERVAL=3\r\n");
  // The dialog was asked once, offering the file's own name.
  const { asked } = await seen();
  expect(asked).toHaveLength(1);
  expect(path.basename(asked[0].defaultPath ?? "")).toBe("DotAmi figure reminders.ics");

  // Cancel: the download is cancelled and nothing new is written in the chosen folder.
  await app!.evaluate(() => {
    (globalThis as unknown as { seen: { answer?: string } }).seen.answer = undefined;
  });
  await row.getByRole("button", { name: "Add to my calendar" }).click();
  await expect.poll(async () => (await seen()).ends).toEqual(["completed", "cancelled"]);
  expect((await seen()).asked).toHaveLength(2);
  expect(readdirSync(path.dirname(target))).toEqual(["reminders.ics"]);

  // A download that doesn't come from DotAmi's own page (a data: URL has no origin) is cancelled
  // without a dialog — even with a save answer waiting.
  await app!.evaluate((_electron, file) => {
    (globalThis as unknown as { seen: { answer?: string } }).seen.answer = file;
  }, target);
  await page.evaluate(() => {
    const a = document.createElement("a");
    a.href = "data:text/plain,not%20from%20DotAmi";
    a.download = "other.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  await expect.poll(async () => (await seen()).ends).toEqual(["completed", "cancelled", "cancelled"]);
  expect((await seen()).asked).toHaveLength(2);
  expect(readdirSync(path.dirname(target))).toEqual(["reminders.ics"]);

  // The window is still DotAmi's settings page: saving didn't navigate it anywhere.
  expect(new URL(page.url()).pathname).toBe("/settings");
});

test("back up on one computer → restore on another: the same ventures, locked with a passphrase", async () => {
  test.setTimeout(180_000);
  const backupFile = path.join(tmp, "DotAmi backup.dotami-backup");
  const passphrase = "correct horse battery staple";

  // Computer A: describe a venture, then File → Back up… with a passphrase.
  let page = await launch();
  await describeVenture(page);
  await app!.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: file })) as typeof dialog.showSaveDialog;
    dialog.showMessageBox = (async () => ({ response: 0, checkboxChecked: false })) as typeof dialog.showMessageBox;
  }, backupFile);
  const backupPrompt = app!.waitForEvent("window");
  await clickMenu("backup");
  const prompt = await backupPrompt;
  // The warning from the settings doc is shown before a passphrase is set.
  await expect(prompt.getByText("lose it and the backup can't be opened — nobody can recover it")).toBeVisible();
  await prompt.locator("#pass").fill(passphrase);
  await prompt.locator("#confirm").fill(passphrase);
  await prompt.getByRole("button", { name: "Back up" }).click();
  await expect.poll(() => existsSync(backupFile), { timeout: 30_000 }).toBe(true);
  await quit();

  // Computer B: a fresh, empty app.
  const computerB = path.join(tmp, "computer-b");
  mkdirSync(computerB);
  page = await launch(computerB);
  await page.getByRole("link", { name: "Your ideas →" }).click();
  await expect(page.getByText("Nothing saved yet.")).toBeVisible();

  // File → Restore from a backup… — a wrong passphrase first, then the right one. The app restarts
  // itself after a restore; the test stops that and starts it again itself.
  await app!.evaluate(({ dialog, app: electronApp }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog;
    dialog.showMessageBox = (async () => ({ response: 0, checkboxChecked: false })) as typeof dialog.showMessageBox;
    electronApp.relaunch = () => {};
  }, backupFile);
  const firstPrompt = app!.waitForEvent("window");
  await clickMenu("restore");
  const wrong = await firstPrompt;
  await wrong.locator("#pass").fill("not the passphrase");
  const secondPrompt = app!.waitForEvent("window");
  await wrong.getByRole("button", { name: "Open" }).click();
  const right = await secondPrompt;
  await expect(right.getByRole("alert")).toContainText("That passphrase didn't open it");
  await right.locator("#pass").fill(passphrase);
  const closed = app!.waitForEvent("close");
  await right.getByRole("button", { name: "Open" }).click();
  await closed;
  app = null;

  // Computer B, started again: the venture from computer A is there.
  page = await launch(computerB);
  await page.getByRole("link", { name: "Your ideas →" }).click();
  await expect(page.getByRole("heading", { name: "My venture", level: 2 })).toBeVisible();
  // What B had before was kept, in its backups folder.
  expect(readdirSync(path.join(computerB, "backups")).some((f) => f.startsWith("dotami-before-restore-"))).toBe(true);
});
