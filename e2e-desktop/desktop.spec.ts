/**
 * The desktop app, used like a person uses it: start it, describe a venture, close it, start it
 * again — the venture is still there; save a file the page made; back up on one computer, restore
 * on another. Each run gets
 * its own empty data folders (DOTAMI_DATA_DIR), so the database is created and migrated by the
 * app itself on first launch. Native file dialogs are answered by replacing them in the app's
 * main process; the passphrase window is the real one, filled in like a person would. Delete
 * ([8d]) is driven from its menu, and the bytes of the data file and the backups folder are read
 * afterwards to prove the deleted words are gone, not just hidden.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { _electron as electron, expect, test, type ElectronApplication, type Page, type Worker } from "@playwright/test";

import { LEFT_OUT, leftOutIn } from "../desktop/left-out.mjs";
import { missingFromNotices, NOTICES_FILE, packagesIn } from "../desktop/notices.mjs";
import { parseNotices } from "../lib/licences/notices";
import { INVENTED_AMOUNTS, otherFormPage, t2125Pages } from "../tests/fixtures/returns/cra-layout";
import { makePdf } from "../tests/helpers/make-pdf";
import { wipePendingFile, writeWipePending } from "../desktop/wipe-pending.mjs";

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
  // DOTAMI_E2E_RATE_LIMITS is set on purpose too: the browser tests' rate-limit switch must never
  // reach the desktop server either (the rate-limit test below proves it didn't).
  // DOTAMI_NO_UPDATE_CHECK keeps a packaged app from asking GitHub for updates during the test.
  app = await electron.launch({
    ...(packagedExe ? { executablePath: packagedExe, args: [] } : { args: [root] }),
    env: {
      ...process.env,
      DOTAMI_DATA_DIR: dir,
      ANTHROPIC_API_KEY: "sk-from-the-shell",
      DOTAMI_E2E_RATE_LIMITS: "opt-in",
      DOTAMI_NO_UPDATE_CHECK: "1",
    },
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

test("Help → Licences shows the notices for what this app ships, and every package in it has an entry", async () => {
  const page = await launch();
  await clickMenu("licences");
  await expect(page).toHaveURL(/\/licences$/);
  // The list desktop/build.mjs wrote beside server.js: Electron itself, the server's packages and
  // the desktop app's own (electron-updater).
  const runtime = page.getByRole("region", { name: "The desktop app's runtime" });
  await expect(runtime.getByText("electron", { exact: true })).toBeVisible();
  await runtime.getByText("electron", { exact: true }).click();
  await expect(runtime).toContainText("LICENSES.chromium.html");
  const packages = page.getByRole("region", { name: "Packages" });
  for (const name of ["next", "react", "@prisma/client", "electron-updater"]) {
    await expect(packages.getByText(name, { exact: true })).toBeVisible();
  }

  // Every package inside the server that ships has an entry for its exact version: the same check
  // desktop/package.mjs runs before it packages anything. A packaged app keeps the server in
  // resources/server (and its own packages inside app.asar, checked when it was packaged).
  const server = packagedExe ? path.join(path.dirname(packagedExe), "resources", "server") : path.join(root, ".next-desktop", "standalone");
  const notices = readFileSync(path.join(server, NOTICES_FILE), "utf8");
  const shipped = packagesIn(path.join(server, "node_modules"));
  expect(shipped.map((p) => p.name)).toEqual(expect.arrayContaining(["next", "react", "@prisma/client"]));
  expect(missingFromNotices(notices, [path.join(server, "node_modules")])).toEqual([]);
  if (packagedExe) {
    // Beside DotAmi.exe: the notices, Electron's licence and Chromium's notices.
    for (const f of [NOTICES_FILE, "LICENSE.electron.txt", "LICENSES.chromium.html"]) {
      expect(existsSync(path.join(path.dirname(packagedExe), f)), f).toBe(true);
    }
  }
});

test("the server leaves out what it never loads (sharp with libvips, TypeScript), and the image route answers 404 instead of reaching for them", async () => {
  const page = await launch();
  // The app the person uses works without them: describe a venture and its map opens.
  await describeVenture(page);

  // The server's node_modules still has what it runs on…
  const server = packagedExe ? path.join(path.dirname(packagedExe), "resources", "server") : path.join(root, ".next-desktop", "standalone");
  const modules = path.join(server, "node_modules");
  expect(packagesIn(modules).map((p) => p.name)).toEqual(expect.arrayContaining(["next", "react", "react-dom", "@prisma/client"]));
  // …and none of what desktop/left-out.mjs names, at any depth.
  expect(LEFT_OUT.map((p) => p.name)).toEqual(expect.arrayContaining(["sharp", "@img/*", "typescript"]));
  expect(leftOutIn(modules).map((p) => `${p.name} ${p.version} (node_modules/${p.rel})`)).toEqual([]);

  // The notices follow what ships: entries for the server's packages, none for the left-out ones,
  // and so nothing under the LGPL (libvips was the only one).
  const notices = parseNotices(readFileSync(path.join(server, NOTICES_FILE), "utf8"));
  const names = notices.entries.map((e) => e.name);
  expect(names).toEqual(expect.arrayContaining(["next", "react", "@prisma/client", "electron"]));
  expect(names.filter((n) => n === "sharp" || n === "typescript" || n.startsWith("@img/"))).toEqual([]);
  expect(notices.entries.filter((e) => /LGPL/i.test(e.licence)).map((e) => `${e.name} ${e.licence}`)).toEqual([]);

  // Next's image optimiser is the only code that would load sharp. The desktop build turns it off,
  // so its route answers "not found" before it gets that far. A page of the app answers first, to
  // show the requests themselves reach the server.
  const origin = new URL(page.url()).origin;
  expect((await page.request.get(`${origin}/settings`)).status()).toBe(200);
  const image = await page.request.get(`${origin}/_next/image?url=${encodeURIComponent("/settings")}&w=64&q=75`);
  expect(image.status()).toBe(404);
});

test("the rate limits are the real ones, even when the shell sets the browser tests' switch", async () => {
  const page = await launch();
  await page.goto(new URL("/settings", page.url()).toString());
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

  // launch() starts the app with DOTAMI_E2E_RATE_LIMITS=opt-in in its environment. With the switch
  // on, these unlabelled requests would never be counted; the desktop server never gets it
  // (desktop/main.mjs serverEnv), so the settings limit, 120 a minute, holds as shipped.
  const statuses = await page.evaluate(async () => {
    const out: number[] = [];
    for (let i = 0; i < 125; i++) {
      out.push((await fetch("/api/settings?id=figure-reminders", { cache: "no-store" })).status);
    }
    return out;
  });
  // The page itself may have asked for the setting once or twice as it opened, so the refusals can
  // start a little before the 121st of these; everything before them was answered.
  const firstRefused = statuses.indexOf(429);
  expect(firstRefused).toBeGreaterThan(110);
  expect(firstRefused).toBeLessThanOrEqual(120);
  expect(statuses.slice(0, firstRefused).every((s) => s === 200)).toBe(true);
  expect(statuses.slice(firstRefused).every((s) => s === 429)).toBe(true);
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

test("last year's return is read inside the app, in a worker that can reach nothing ([8f])", async () => {
  // The same invented PDF as the browser test (laid out like the CRA's T2125; every amount made up),
  // read in the desktop app's own window: its server, its policy, its build of pdf.js.
  const page = await launch();
  await describeVenture(page);
  const workers: Worker[] = [];
  page.on("worker", (w) => workers.push(w));
  await page.goto(new URL("/ventures", page.url()).toString());
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "My venture", level: 2 }) })
    .first();
  await card.getByRole("button", { name: "Add from last year's return" }).click();
  await card.getByLabel("Choose a PDF").setInputFiles({
    name: "invented-return-2025.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(
      makePdf([otherFormPage("Income Tax and Benefit Return", "5000-R"), ...t2125Pages({ amounts: INVENTED_AMOUNTS })]),
    ),
  });
  const table = card.getByRole("table", { name: "T2125 on pages 2 to 4" });
  await expect(table).toBeVisible({ timeout: 30_000 });
  await expect(table.getByRole("row", { name: "8299 Gross business or professional income 3 48,250.00", exact: true })).toBeVisible();
  await expect(table.getByRole("row", { name: "9946 Your net income (loss) 4 33,019.55", exact: true })).toBeVisible();

  const reader = workers.find((w) => new URL(w.url()).pathname.startsWith("/_next/static/"));
  expect(reader, "the return reader's worker").toBeTruthy();
  expect(await reader!.evaluate(() => fetch("/api/figures").then(() => "reached", () => "refused"))).toBe("refused");
  await card.getByRole("button", { name: "Close" }).click();
});

/** Text no real data holds, so finding it in a file's bytes can only mean the deleted statement. */
const MARKER = "zq-desktop-delete-marker-5813";

/** Does this file's raw bytes hold the marker? */
const holdsMarker = (file: string) => readFileSync(file).includes(Buffer.from(MARKER));

/** DotAmi's own safety copies in a data folder's backups/ (the names desktop/wipe-pending.mjs deletes). */
const safetyCopies = (dir: string) =>
  existsSync(path.join(dir, "backups")) ? readdirSync(path.join(dir, "backups")).filter((f) => /^dotami-before-.+\.db$/.test(f)) : [];

/** File → Back up… with a passphrase, answered like the backup test above; the file lands at `file`. */
async function backUpTo(file: string, passphrase: string) {
  await app!.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: target })) as typeof dialog.showSaveDialog;
    dialog.showMessageBox = (async () => ({ response: 0, checkboxChecked: false })) as typeof dialog.showMessageBox;
  }, file);
  const opened = app!.waitForEvent("window");
  await clickMenu("backup");
  const prompt = await opened;
  await prompt.locator("#pass").fill(passphrase);
  await prompt.locator("#confirm").fill(passphrase);
  await prompt.getByRole("button", { name: "Back up" }).click();
  await expect.poll(() => existsSync(file), { timeout: 30_000 }).toBe(true);
}

/** File → Restore from a backup…, then the app closes itself to restart (the test starts it again). */
async function restoreFrom(file: string, passphrase: string) {
  await app!.evaluate(({ dialog, app: electronApp }, source) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [source] })) as typeof dialog.showOpenDialog;
    dialog.showMessageBox = (async () => ({ response: 0, checkboxChecked: false })) as typeof dialog.showMessageBox;
    electronApp.relaunch = () => {};
  }, file);
  const opened = app!.waitForEvent("window");
  await clickMenu("restore");
  const prompt = await opened;
  await prompt.locator("#pass").fill(passphrase);
  const closed = app!.waitForEvent("close");
  await prompt.getByRole("button", { name: "Open" }).click();
  await closed;
  app = null;
}

test("Delete with the safety copies ticked: the words are gone from dotami.db and backups/, and a backup saved elsewhere still restores", async () => {
  test.setTimeout(300_000);
  const elsewhere = path.join(tmp, "saved elsewhere", "DotAmi backup.dotami-backup");
  mkdirSync(path.dirname(elsewhere));
  const passphrase = "correct horse battery staple";
  const dbFile = path.join(dataDir, "dotami.db");

  // An idea and a statement holding the marker, a backup saved elsewhere, then a restore of it,
  // which leaves a safety copy of the data in backups/ the way the app really makes one.
  let page = await launch();
  await describeVenture(page);
  const status = await page.evaluate(
    async (text) =>
      (await fetch("/api/person/statements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }))
        .status,
    `statement ${MARKER}`,
  );
  expect(status).toBe(200);
  await backUpTo(elsewhere, passphrase);
  await restoreFrom(elsewhere, passphrase);

  // The "before": the words are in the data file and in the safety copy.
  expect(holdsMarker(dbFile)).toBe(true);
  expect(safetyCopies(dataDir)).toHaveLength(1);
  expect(holdsMarker(path.join(dataDir, "backups", safetyCopies(dataDir)[0]))).toBe(true);

  page = await launch();
  await page.goto(new URL("/your-data", page.url()).toString());
  const removing = page.getByRole("region", { name: "Taking things out" });
  await removing.getByRole("button", { name: "Delete", exact: true }).click();
  const box = removing.getByRole("listitem").filter({ has: page.getByLabel("Safety copies in the backups folder") });
  await expect(box).toContainText("Safety copies: 1");
  await expect(box).toContainText("Afterwards, only a backup you saved somewhere else could bring anything back.");
  await removing.getByLabel("Your ideas, with their notes, links and map progress").check();
  await removing.getByLabel("Your statements (“In your words”)").check();
  await removing.getByLabel("Safety copies in the backups folder").check();
  await removing.getByRole("button", { name: "Delete what's ticked…" }).click();
  await page.getByRole("dialog", { name: "Delete these?" }).getByRole("button", { name: "Yes, continue" }).click();
  const second = page.getByRole("dialog", { name: "Delete them now?" });
  await expect(second).toContainText("The safety copies in the backups folder go too.");
  await second.getByRole("button", { name: "Delete now" }).click();
  const done = removing.getByRole("status");
  await expect(done).toContainText("Safety copies: 1 file deleted, 0 left");
  await expect(done).toContainText("Their space in the data file is wiped");
  await quit();

  // The "after": in no byte of the data file, no safety copy left, no journal, no wipe still owed.
  expect(holdsMarker(dbFile)).toBe(false);
  expect(safetyCopies(dataDir)).toEqual([]);
  for (const f of readdirSync(path.join(dataDir, "backups"))) expect(holdsMarker(path.join(dataDir, "backups", f)), f).toBe(false);
  expect(existsSync(`${dbFile}-journal`)).toBe(false);
  expect(existsSync(wipePendingFile(dbFile))).toBe(false);

  // The backup saved elsewhere still brings it all back.
  page = await launch();
  await page.getByRole("link", { name: "Your ideas →" }).click();
  await expect(page.getByText("Nothing saved yet.")).toBeVisible();
  await restoreFrom(elsewhere, passphrase);
  page = await launch();
  await page.getByRole("link", { name: "Your ideas →" }).click();
  await expect(page.getByRole("heading", { name: "My venture", level: 2 })).toBeVisible();
  expect(holdsMarker(dbFile)).toBe(true);
});

test("a wipe Delete couldn't finish is finished at the next start, and only when Delete left its note", async () => {
  test.setTimeout(180_000);
  const dbFile = path.join(dataDir, "dotami.db");
  const logFile = path.join(dataDir, "logs", "server.log");

  // The app makes its database; then what an unfinished wipe leaves behind is set up by hand: a
  // statement deleted without the wipe (its words still in the file's free space) and a safety copy
  // made before that delete (holding them as a live row).
  let page = await launch();
  await expect(page.getByRole("heading", { name: /Map any venture/ })).toBeVisible();
  await quit();
  mkdirSync(path.join(dataDir, "backups"));
  const copyName = "dotami-before-restore-1760000000000.db";
  const db = new DatabaseSync(dbFile);
  db.prepare(`INSERT OR IGNORE INTO "User" (id, updatedAt) VALUES ('wipe-test', 0)`).run();
  db.prepare(`INSERT INTO "PersonStatement" (id, userId, text, saidAt) VALUES ('wipe-test', 'wipe-test', ?, 0)`).run(`statement ${MARKER}`);
  db.prepare("VACUUM INTO ?").run(path.join(dataDir, "backups", copyName));
  db.prepare(`DELETE FROM "PersonStatement" WHERE id = 'wipe-test'`).run();
  db.close();
  expect(holdsMarker(dbFile)).toBe(true);

  // An ordinary start, with no note: nothing is wiped or deleted. (This is also the test's control:
  // without the note, the words would stay.)
  page = await launch();
  await expect(page.getByRole("heading", { name: /Map any venture/ })).toBeVisible();
  await quit();
  expect(holdsMarker(dbFile)).toBe(true);
  expect(safetyCopies(dataDir)).toEqual([copyName]);
  expect(readFileSync(logFile, "utf8")).not.toContain("[wipe]");

  // The note Delete leaves when its wipe can't finish: the next start finishes it.
  writeWipePending(dbFile, { backups: [copyName] });
  page = await launch();
  await expect(page.getByRole("heading", { name: /Map any venture/ })).toBeVisible();
  await quit();
  expect(holdsMarker(dbFile)).toBe(false);
  expect(safetyCopies(dataDir)).toEqual([]);
  expect(existsSync(wipePendingFile(dbFile))).toBe(false);
  const log = readFileSync(logFile, "utf8");
  expect(log).toContain("[wipe] finished the wipe an earlier Delete left owed (1 safety copy deleted)");
  expect(log).toContain("[desktop] wipe-pending note cleared");
  expect(log).not.toContain(MARKER);
});
