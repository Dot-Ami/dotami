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
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { _electron as electron, expect, test, type ElectronApplication, type Page, type Worker } from "@playwright/test";

import { readBackup } from "../desktop/backup.mjs";
import { LEFT_OUT, leftOutIn, ownPlatformBuild } from "../desktop/left-out.mjs";
import { migrate } from "../desktop/migrate.mjs";
import { missingFromNotices, NOTICES_FILE, packagesIn } from "../desktop/notices.mjs";
import { ENCRYPTED_OVERHEAD, encryptedKeyId } from "../desktop/receipt-crypto.mjs";
import { localStateHoldsKey } from "../desktop/receipt-key.mjs";
import { fileKind, openDatabase, runSql as runOn } from "../desktop/sqlite.mjs";
import { VIEW_MESSAGES } from "../lib/expenses/receipts/viewer/messages";
import { parseNotices } from "../lib/licences/notices";
import { INVENTED_AMOUNTS, otherFormPage, t2125Pages } from "../tests/fixtures/returns/cra-layout";
import { makePdf } from "../tests/helpers/make-pdf";
import { heic } from "../tests/helpers/heic-files";
import { pdf, png } from "../tests/helpers/receipt-files";
import { wipePendingFile, writeWipePending } from "../desktop/wipe-pending.mjs";

const root = path.resolve(__dirname, "..");

let tmp = "";
let dataDir = "";
let app: ElectronApplication | null = null;

// DOTAMI_DESKTOP_EXE points the test at a packaged app (dist-desktop/out/win-unpacked/DotAmi.exe,
// from `npm run desktop:package`) instead of running this checkout with Electron.
const packagedExe = process.env.DOTAMI_DESKTOP_EXE;

/** Starts the app on a data folder, without waiting for its window. */
async function startApp(dir = dataDir): Promise<ElectronApplication> {
  // ANTHROPIC_API_KEY is set here on purpose: the app must not pass a key from the shell it was
  // started from to its server (desktop/main.mjs serverEnv) — the settings page proves it didn't.
  // DOTAMI_E2E_RATE_LIMITS is set on purpose too: the browser tests' rate-limit switch must never
  // reach the desktop server either (the rate-limit test below proves it didn't).
  // DOTAMI_NO_UPDATE_CHECK keeps a packaged app from asking GitHub for updates during the test.
  // DEBUG is set on purpose: the database library prints every query with its values when DEBUG names
  // it, and the desktop app must not pass it to its server ([8i]; the first test reads the log).
  app = await electron.launch({
    ...(packagedExe ? { executablePath: packagedExe, args: [] } : { args: [root] }),
    env: {
      ...process.env,
      DOTAMI_DATA_DIR: dir,
      ANTHROPIC_API_KEY: "sk-from-the-shell",
      DOTAMI_E2E_RATE_LIMITS: "opt-in",
      DOTAMI_NO_UPDATE_CHECK: "1",
      DEBUG: "prisma*",
    },
  });
  return app;
}

/**
 * The main window, once it shows DotAmi's own server. Not simply the first window: a first start shows
 * the small "Preparing DotAmi…" window before it ([8i], desktop/preparing.mjs).
 */
async function mainWindow(electronApp: ElectronApplication): Promise<Page> {
  const isMain = (p: Page) => /^http:\/\/127\.0\.0\.1:\d+\//.test(p.url());
  await expect.poll(() => electronApp.windows().some(isMain), { timeout: 90_000, intervals: [100] }).toBe(true);
  return electronApp.windows().find(isMain)!;
}

async function launch(dir = dataDir): Promise<Page> {
  return mainWindow(await startApp(dir));
}

/** The titles of the app's open windows, read in its main process. */
const windowTitles = () =>
  app!.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed()).map((w) => w.getTitle()));

/** The desktop log, and how much of it there is now (to read only what a later start writes). */
const desktopLog = (dir = dataDir) => {
  const file = path.join(dir, "logs", "server.log");
  return existsSync(file) ? readFileSync(file, "utf8") : "";
};

async function quit() {
  await app?.close();
  app = null;
}

/**
 * [8i] Starts the app and returns one of the windows that come before the main one: the window before an
 * existing plain data file is first encrypted ("encrypt-ask"), or the one when the data file's key can't
 * be opened ("lost-key"). A first start of a new data folder shows "Preparing DotAmi…" before either.
 */
async function launchTo(which: "encrypt-ask" | "lost-key", dir = dataDir): Promise<Page> {
  const electronApp = await startApp(dir);
  const isIt = (p: Page) => p.url().includes(`/desktop/${which}.html`);
  await expect.poll(() => electronApp.windows().some(isIt), { timeout: 90_000, intervals: [100] }).toBe(true);
  return electronApp.windows().find(isIt)!;
}

/** [8i] Answers the window before the first encryption, then waits for the main window. */
async function answerEncryptAsk(ask: Page, button: "Encrypt now" | "Not now" | "Never…"): Promise<Page> {
  await expect(ask.getByRole("heading", { name: "Lock your data file with a key?" })).toBeVisible();
  await ask.getByRole("button", { name: button, exact: true }).click();
  if (button === "Never…") {
    await expect(ask.getByRole("heading", { name: "Never lock the data file?" })).toBeVisible();
    await ask.getByRole("button", { name: "Keep it unencrypted" }).click();
  }
  return mainWindow(app!);
}

/**
 * [8i] The data file's key, opened by the running app's own safeStorage (Windows' protection for this
 * account, with the data folder's Local State): the test needs it to read the decrypted page image.
 */
async function dataKey(dir = dataDir): Promise<Buffer> {
  const { wrapped } = JSON.parse(readFileSync(path.join(dir, "database.key"), "utf8")) as { wrapped: string };
  const base64 = await app!.evaluate(({ safeStorage }, w) => safeStorage.decryptString(Buffer.from(w, "base64")), wrapped);
  return Buffer.from(base64, "base64");
}

/** [8i] A data folder as an earlier DotAmi left it: a migrated, plain data file holding one statement. */
function seedPlainFolder(dir: string, words: string) {
  const dbFile = path.join(dir, "dotami.db");
  migrate(dbFile, path.join(root, "prisma", "migrations"));
  const db = openDatabase(dbFile);
  try {
    runOn(db, `INSERT INTO "User" (id, email, updatedAt) VALUES ('u1', 'stub@dotami.local', 0)`);
    db.prepare(`INSERT INTO "PersonStatement" (id, userId, text, saidAt) VALUES ('s1', 'u1', ?, 0)`).run(words);
  } finally {
    db.close();
  }
  return dbFile;
}

/** Every file under a folder whose raw bytes hold `words`, relative to it. */
function filesHolding(dir: string, words: string): string[] {
  const found: string[] = [];
  const walk = (at: string) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, e.name);
      if (e.isDirectory()) walk(full);
      else if (readFileSync(full).includes(Buffer.from(words))) found.push(path.relative(dir, full));
    }
  };
  walk(dir);
  return found.sort();
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

/**
 * The bytes DotAmi's own page gets back for a record's receipt (the viewer's request), as base64: the
 * receipt decrypted by the app's server. Found by the record's "paid to".
 */
async function receiptBytesShown(page: Page, paidTo: string): Promise<string> {
  return page.evaluate(async (who) => {
    const list = (await (await fetch("/api/expenses")).json()) as { expenses: { id: string; paidTo: string }[] };
    const expenseId = list.expenses.find((e) => e.paidTo === who)!.id;
    const res = await fetch("/api/expenses/receipt/file", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expenseId }),
    });
    if (!res.ok) return `refused ${res.status}: ${await res.text()}`;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let text = "";
    for (const b of bytes) text += String.fromCharCode(b);
    return btoa(text);
  }, paidTo);
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
  // [8i] A new data folder's file is encrypted from its first byte, with a key kept only wrapped by Windows.
  expect(startLog).toContain("[database] a new data file, encrypted from its first byte");
  expect(fileKind(path.join(dataDir, "dotami.db"))).toBe("encrypted");
  expect(Object.keys(JSON.parse(readFileSync(path.join(dataDir, "database.key"), "utf8"))).sort()).toEqual(["format", "keyId", "wrapped"]);

  await describeVenture(page);
  // [8i] The venture went through the database library, with DEBUG set in the shell: none of its query
  // output reached the log (desktop/main.mjs serverEnv removes DEBUG).
  const afterWrite = readFileSync(path.join(dataDir, "logs", "server.log"), "utf8");
  expect(afterWrite).not.toContain("prisma:driver-adapter");
  expect(afterWrite).not.toContain("[js::");

  // The settings page reports the app's own data file, and that nothing leaves the computer —
  // the key in the shell's environment never reached the server.
  await page.goto(new URL("/settings", page.url()).toString());
  await expect(page.getByRole("region", { name: "Data and backups" }).locator("code").first()).toHaveText(
    path.join(dataDir, "dotami.db"),
  );
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("File → Back up…");
  // Backups carry the receipts folder now, and the page says so.
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("with your receipt files in it");
  await expect(page.getByRole("region", { name: "Data and backups" })).not.toContainText("doesn't hold the receipts folder");
  // [8i] The receipts are encrypted in the desktop app, with a key kept only wrapped by Windows; the
  // page says so, precisely what that protects (not "another account" in general: Windows' folder
  // permissions already keep other standard accounts out), and what losing that key means.
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("Your receipt files are encrypted on this computer.");
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText(
    "Windows already keeps other standard accounts on this computer out of your data folder",
  );
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("except those in a backup");
  // [8i] The data file is encrypted too, and the page says so, in the same precise words.
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("Your data file is encrypted on this computer.");
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("is encrypted too, with a key of its own");
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("On: your data file is encrypted, and stays encrypted.");
  expect(startLog).toContain("[desktop] receipts: key open (made now)");
  const keyFile = JSON.parse(readFileSync(path.join(dataDir, "receipts.key"), "utf8"));
  expect(Object.keys(keyFile).sort()).toEqual(["format", "keyId", "wrapped"]);
  // The key file was written only once Windows' own key for it was on the disk (Electron's Local
  // State), so a crash in the first seconds can't leave a receipts key nothing can open.
  expect(localStateHoldsKey(dataDir)).toBe(true);
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
  // [8i] Its name is in the encrypted file, never in its bytes.
  await quit();
  expect(filesHolding(dataDir, "My venture")).toEqual([]);
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
  // [8i] The database package keeps only this computer's prebuilt SQLite (desktop/left-out.mjs), and the
  // venture above was saved through it.
  expect(readdirSync(path.join(modules, "better-sqlite3", "prebuilds"))).toEqual([ownPlatformBuild()]);

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

test("back up on one computer → restore on another: the same ventures and receipt files, locked with a passphrase", async () => {
  test.setTimeout(180_000);
  const backupFile = path.join(tmp, "DotAmi backup.dotami-backup");
  const passphrase = "correct horse battery staple";
  const receipt = png(5, 3);

  // Computer A: describe a venture, then keep an expense record with a receipt ([8i]), the way the
  // Expenses page does it (from DotAmi's own page, so the page-only routes answer).
  let page = await launch();
  await describeVenture(page);
  const kept = await page.evaluate(async (file) => {
    const post = async (url: string, body: unknown) => {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      return { status: res.status, body: (await res.json()) as { expenses?: { id: string }[] } };
    };
    const day = new Date().toLocaleDateString("en-CA");
    const proposed = await post("/api/expenses/propose", {
      ventureId: null,
      source: { kind: "agent", label: "the desktop test" },
      expenses: [{ date: day, amountCents: 4_599, paidTo: "Example Stationery desktop test", whatFor: "paper" }],
    });
    const id = proposed.body.expenses![0].id;
    const agreed = await post("/api/expenses/agree", { expenseIds: [id] });
    const added = await post("/api/expenses/receipt", { expenseId: id, file });
    return [proposed.status, agreed.status, added.status];
  }, receipt.toString("base64"));
  expect(kept).toEqual([201, 200, 200]);
  const receiptsA = readdirSync(path.join(dataDir, "receipts"));
  expect(receiptsA).toHaveLength(1);
  // [8i] On A's disk the receipt is encrypted with A's key: none of the picture's bytes are in the file.
  const onDiskA = readFileSync(path.join(dataDir, "receipts", receiptsA[0]));
  expect(onDiskA.subarray(0, 14).toString("latin1")).toBe("DOTAMI-RECEIPT");
  expect(onDiskA.indexOf(receipt.subarray(0, 16))).toBe(-1);
  expect(onDiskA.length).toBe(receipt.length + ENCRYPTED_OVERHEAD);
  // ...and it opens as exactly the bytes that were added.
  expect(await receiptBytesShown(page, "Example Stationery desktop test")).toEqual(receipt.toString("base64"));

  // File → Back up… with a passphrase; the message afterwards says the receipt is in it.
  await app!.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: file })) as typeof dialog.showSaveDialog;
    dialog.showMessageBox = (async (...args: unknown[]) => {
      const options = (args.length > 1 ? args[1] : args[0]) as { detail?: string };
      (globalThis as { lastDetail?: string }).lastDetail = options.detail;
      return { response: 0, checkboxChecked: false };
    }) as typeof dialog.showMessageBox;
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
  await expect
    .poll(() => app!.evaluate(() => (globalThis as { lastDetail?: string }).lastDetail ?? ""), { timeout: 30_000 })
    .toContain("It holds your 1 receipt file too.");
  // Locked: the receipt's bytes aren't readable in the file.
  expect(readFileSync(backupFile).indexOf(receipt.subarray(0, 16))).toBe(-1);
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
  // The receipt came with it under the same name, encrypted with B's own key (B's key file is not A's),
  // and it opens on B as exactly the bytes added on A.
  expect(readdirSync(path.join(computerB, "receipts"))).toEqual(receiptsA);
  const onDiskB = readFileSync(path.join(computerB, "receipts", receiptsA[0]));
  expect(onDiskB.subarray(0, 14).toString("latin1")).toBe("DOTAMI-RECEIPT");
  expect(onDiskB.indexOf(receipt.subarray(0, 16))).toBe(-1);
  const keyIdA = JSON.parse(readFileSync(path.join(dataDir, "receipts.key"), "utf8")).keyId;
  const keyIdB = JSON.parse(readFileSync(path.join(computerB, "receipts.key"), "utf8")).keyId;
  expect(keyIdB).not.toBe(keyIdA);
  expect(encryptedKeyId(onDiskB)).toBe(keyIdB);
  await page.goto(new URL("/expenses", page.url()).toString());
  await expect(
    page.getByRole("list", { name: "Records you agreed to" }).getByRole("listitem").filter({ hasText: "Example Stationery desktop test" }),
  ).toContainText(`Receipt: PNG picture · ${receipt.length} bytes`);
  expect(await receiptBytesShown(page, "Example Stationery desktop test")).toEqual(receipt.toString("base64"));
});

test("receipts kept before this version are encrypted at the first start, and still open ([8i])", async () => {
  // A data folder as an earlier DotAmi left it: a migrated database with an agreed record and its
  // receipt, the file kept plain, and no key yet.
  const dbFile = path.join(dataDir, "dotami.db");
  migrate(dbFile, path.join(root, "prisma", "migrations"));
  const receipt = png(4, 4, { rgb: [20, 120, 60] });
  const id = "8".repeat(32);
  const db = new DatabaseSync(dbFile);
  try {
    db.prepare(
      `INSERT INTO "Expense" (id, date, amountCents, paidTo, whatFor, sourceKind, sourceLabel, status) VALUES ('e8', ?, 1500, 'Example Hardware desktop first start', 'screws', 'typed', 'typed by you', 'confirmed')`,
    ).run(Date.parse("2026-10-01T00:00:00Z"));
    db.prepare(`INSERT INTO "Receipt" (id, expenseId, type, bytes, sha256) VALUES (?, 'e8', 'image/png', ?, ?)`).run(
      id,
      receipt.length,
      createHash("sha256").update(receipt).digest("hex"),
    );
  } finally {
    db.close();
  }
  mkdirSync(path.join(dataDir, "receipts"));
  writeFileSync(path.join(dataDir, "receipts", `${id}.png`), receipt);
  expect(existsSync(path.join(dataDir, "receipts.key"))).toBe(false);

  // [8i] A plain data file from before: the window asks first; "Not now" keeps this test about receipts.
  const page = await answerEncryptAsk(await launchTo("encrypt-ask"), "Not now");
  // Encrypted at the start, before the window opened.
  const onDisk = readFileSync(path.join(dataDir, "receipts", `${id}.png`));
  expect(onDisk.subarray(0, 14).toString("latin1")).toBe("DOTAMI-RECEIPT");
  expect(onDisk.indexOf(receipt.subarray(0, 16))).toBe(-1);
  expect(readdirSync(path.join(dataDir, "receipts"))).toEqual([`${id}.png`]);
  expect(readFileSync(path.join(dataDir, "logs", "server.log"), "utf8")).toContain("[desktop] receipts: 1 file(s) encrypted now, 0 couldn't be yet");
  await page.goto(new URL("/expenses", page.url()).toString());
  expect(await receiptBytesShown(page, "Example Hardware desktop first start")).toEqual(receipt.toString("base64"));
  // What DotAmi knows about you counts it as encrypted.
  await page.goto(new URL("/your-data", page.url()).toString());
  await expect(page.getByText("1 of 1 receipt file encrypted with this computer's key.")).toBeVisible();
});

test("a receipts key this Windows account can't open: nothing is changed, and the app says what to do ([8i])", async () => {
  // A key file wrapped for some other account (here: bytes Windows can't open at all), and a receipt
  // locked with that key.
  const first = await launch();
  await first.goto(new URL("/expenses", first.url()).toString());
  await quit();
  writeFileSync(
    path.join(dataDir, "receipts.key"),
    JSON.stringify({ format: 1, keyId: "0011223344556677", wrapped: Buffer.from("not something this account wrapped").toString("base64") }),
  );
  const lockedName = `${"9".repeat(32)}.pdf`;
  mkdirSync(path.join(dataDir, "receipts"), { recursive: true });
  const locked = Buffer.concat([Buffer.from("DOTAMI-RECEIPT\x01", "latin1"), Buffer.from("0011223344556677", "hex"), Buffer.alloc(40, 1)]);
  writeFileSync(path.join(dataDir, "receipts", lockedName), locked);
  const keyBefore = readFileSync(path.join(dataDir, "receipts.key"));

  const page = await launch();
  await page.goto(new URL("/settings", page.url()).toString());
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("DotAmi can't open the key to your receipts.");
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("File → Restore from a backup…");
  // Nothing on the disk was changed: the key file and the locked receipt are as they were.
  expect(readFileSync(path.join(dataDir, "receipts.key")).equals(keyBefore)).toBe(true);
  expect(readFileSync(path.join(dataDir, "receipts", lockedName)).equals(locked)).toBe(true);
  expect(readFileSync(path.join(dataDir, "logs", "server.log"), "utf8")).toContain(
    // The log now says which of the two it is: the key store was there, so this account can't open it.
    "the key file can't be opened by this account; 1 receipt file(s) are encrypted and can't be opened; nothing was changed",
  );
});

test("a deleted receipts.key with encrypted receipts: no new key is made, and Settings and Expenses say so in amber ([8i])", async () => {
  // The first start makes the key; a receipt encrypted with it (its header is all the start reads);
  // then receipts.key is deleted, as in Explorer, where it would sit in the Recycle Bin.
  const first = await launch();
  await first.goto(new URL("/expenses", first.url()).toString());
  await quit();
  const keyId = JSON.parse(readFileSync(path.join(dataDir, "receipts.key"), "utf8")).keyId as string;
  const lockedName = `${"8".repeat(32)}.png`;
  mkdirSync(path.join(dataDir, "receipts"), { recursive: true });
  const locked = Buffer.concat([Buffer.from("DOTAMI-RECEIPT\x01", "latin1"), Buffer.from(keyId, "hex"), Buffer.alloc(40, 2)]);
  writeFileSync(path.join(dataDir, "receipts", lockedName), locked);
  rmSync(path.join(dataDir, "receipts.key"));

  const page = await launch();
  await page.goto(new URL("/settings", page.url()).toString());
  const data = page.getByRole("region", { name: "Data and backups" });
  await expect(data).toContainText("DotAmi can't open the key to your receipts.");
  await expect(data).toContainText("put it back (it may be in the Recycle Bin)");
  await page.goto(new URL("/expenses", page.url()).toString());
  await expect(page.getByRole("status").filter({ hasText: "DotAmi can't open the key to your receipts." })).toBeVisible();
  // No new key was made over the receipt it can't open, and the receipt is as it was.
  expect(readFileSync(path.join(dataDir, "receipts", lockedName)).equals(locked)).toBe(true);
  expect(existsSync(path.join(dataDir, "receipts.key"))).toBe(false);
  expect(readFileSync(path.join(dataDir, "logs", "server.log"), "utf8")).toContain(
    "the key file is missing; 1 receipt file(s) are encrypted and can't be opened; nothing was changed",
  );
});

test("Start a new key: the locked receipt and the key file are moved aside, and the next start makes a new key ([8i])", async () => {
  const first = await launch();
  // Never offered while the key opens fine.
  await first.goto(new URL("/settings", first.url()).toString());
  await expect(first.getByRole("region", { name: "Data and backups" })).toContainText("Your receipt files are encrypted on this computer.");
  await expect(first.getByRole("button", { name: "Start a new key…" })).toHaveCount(0);
  await quit();
  // A key file wrapped for some other account, and a receipt locked with that key (as in the test above).
  writeFileSync(
    path.join(dataDir, "receipts.key"),
    JSON.stringify({ format: 1, keyId: "0011223344556677", wrapped: Buffer.from("not something this account wrapped").toString("base64") }),
  );
  const lockedName = `${"7".repeat(32)}.pdf`;
  mkdirSync(path.join(dataDir, "receipts"), { recursive: true });
  const locked = Buffer.concat([Buffer.from("DOTAMI-RECEIPT\x01", "latin1"), Buffer.from("0011223344556677", "hex"), Buffer.alloc(40, 4)]);
  writeFileSync(path.join(dataDir, "receipts", lockedName), locked);
  const keyBefore = readFileSync(path.join(dataDir, "receipts.key"));

  const page = await launch();
  await page.goto(new URL("/settings", page.url()).toString());
  const data = page.getByRole("region", { name: "Data and backups" });
  await expect(data).toContainText("DotAmi can't open the key to your receipts.");
  await data.getByRole("button", { name: "Start a new key…" }).click();
  await page.getByRole("dialog", { name: "Start a new key, and give up the locked receipts?" }).getByRole("button", { name: "Continue…" }).click();
  await page.getByRole("dialog", { name: "Are you sure?" }).getByRole("button", { name: "Give up the locked receipts and start a new key" }).click();
  await expect(data).toContainText("DotAmi starts a new key for your receipts the next time it starts.");

  // Moved, not deleted: the receipt and the key file side by side in one folder in backups/, named on the page.
  const backups = path.join(dataDir, "backups");
  const aside = readdirSync(backups).filter((n) => n.startsWith("receipts-locked-"));
  expect(aside).toHaveLength(1);
  const movedTo = path.join(backups, aside[0]);
  await expect(data).toContainText(movedTo);
  expect(readFileSync(path.join(movedTo, lockedName)).equals(locked)).toBe(true);
  expect(readFileSync(path.join(movedTo, "receipts.key")).equals(keyBefore)).toBe(true);
  expect(existsSync(path.join(dataDir, "receipts", lockedName))).toBe(false);
  expect(existsSync(path.join(dataDir, "receipts.key"))).toBe(false);
  await quit();

  // The next start makes the new key (Local State is already written, so it doesn't wait).
  const logBefore = desktopLog().length;
  const again = await launch();
  await again.goto(new URL("/settings", again.url()).toString());
  await expect(again.getByRole("region", { name: "Data and backups" })).toContainText("Your receipt files are encrypted on this computer.");
  const keyId = JSON.parse(readFileSync(path.join(dataDir, "receipts.key"), "utf8")).keyId as string;
  expect(keyId).toMatch(/^[0-9a-f]{16}$/);
  expect(keyId).not.toBe("0011223344556677");
  const thisStart = desktopLog().slice(logBefore);
  expect(thisStart).toContain("[desktop] receipts: key open (made now)");
  expect(thisStart).not.toContain("Preparing DotAmi");
  // The set-aside folder is left exactly as it was.
  expect(readdirSync(movedTo).sort()).toEqual([lockedName, "receipts.key"]);
});

test("the first start of a new data folder shows \"Preparing DotAmi…\" while it waits, closed when the main window shows; an ordinary start never shows it ([8i])", async () => {
  await startApp();
  // Up during the wait for Windows' own key (about ten seconds).
  await expect.poll(() => windowTitles(), { timeout: 30_000, intervals: [100] }).toContain("Preparing DotAmi…");
  const page = await mainWindow(app!);
  // Gone once the main window shows: one window left, the app's own.
  await expect.poll(() => windowTitles(), { timeout: 10_000 }).toHaveLength(1);
  expect(await windowTitles()).not.toContain("Preparing DotAmi…");
  await expect(page.getByPlaceholder(/What are you building/)).toBeVisible();
  const first = desktopLog();
  const shown = first.indexOf('[desktop] showing the "Preparing DotAmi…" window while Windows saves its own key');
  const keyMade = first.indexOf("[desktop] receipts: key open (made now)");
  const closed = first.indexOf("[desktop] the preparing window closed (the main window showed)");
  expect(shown).toBeGreaterThan(-1);
  expect(keyMade).toBeGreaterThan(shown);
  expect(closed).toBeGreaterThan(keyMade);
  await quit();

  // An ordinary start: the key opens, nothing waits, and the window never opens.
  const before = desktopLog().length;
  await launch();
  expect(await windowTitles()).toHaveLength(1);
  const second = desktopLog().slice(before);
  expect(second).toContain("[desktop] receipts: key open\n");
  expect(second).not.toContain("Preparing DotAmi");
  expect(second).not.toContain("preparing window");
});

test("a start that fails while \"Preparing DotAmi…\" is up closes it before the failure message, which still shows ([8i])", async () => {
  // A folder where the new key file is first written: saving the key fails right after the wait.
  mkdirSync(path.join(dataDir, "receipts.key.partial"));
  await startApp();
  await expect.poll(() => windowTitles(), { timeout: 30_000, intervals: [100] }).toContain("Preparing DotAmi…");
  // The failure message is answered here so the test can read it, and the app is kept open to look.
  await app!.evaluate(({ app: electronApp, BrowserWindow, dialog }) => {
    const seen = globalThis as unknown as { __failure: unknown; __realQuit: () => void; __quitAsked: boolean };
    seen.__failure = null;
    seen.__quitAsked = false;
    seen.__realQuit = electronApp.quit.bind(electronApp);
    electronApp.quit = () => {
      seen.__quitAsked = true;
    };
    dialog.showErrorBox = (_title: string, message: string) => {
      seen.__failure = { message, windows: BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed()).map((w) => w.getTitle()) };
    };
  });
  const failure = () => app!.evaluate(() => (globalThis as unknown as { __failure: { message: string; windows: string[] } | null }).__failure);
  await expect.poll(failure, { timeout: 60_000 }).not.toBeNull();
  const shown = (await failure())!;
  // The message showed, and when it did, no window was left behind it.
  expect(shown.message).toContain("DotAmi couldn't prepare the key that encrypts your receipts");
  expect(shown.windows).toEqual([]);
  expect(await app!.evaluate(() => (globalThis as unknown as { __quitAsked: boolean }).__quitAsked)).toBe(true);
  const log = desktopLog();
  expect(log.indexOf("[desktop] the preparing window closed (start-up failed)")).toBeGreaterThan(-1);
  expect(log.indexOf("[desktop] stopped: DotAmi couldn't prepare the key")).toBeGreaterThan(log.indexOf("[desktop] the preparing window closed (start-up failed)"));
  expect(existsSync(path.join(dataDir, "receipts.key"))).toBe(false);

  // Now let it quit for real.
  const closedApp = app!.waitForEvent("close");
  await app!.evaluate(() => (globalThis as unknown as { __realQuit: () => void }).__realQuit()).catch(() => {});
  await closedApp;
  app = null;
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

test("a PDF receipt is drawn inside the app, in a worker that can reach nothing ([8i])", async () => {
  // The desktop window's own build of pdf.js, worker and policy, as in the browser test
  // (e2e/receipt-viewer.spec.ts): the receipt's pages come back as pictures, and the worker can't connect.
  const page = await launch();
  await page.goto(new URL("/expenses", page.url()).toString());
  const id = await page.evaluate(async (file) => {
    const post = async (url: string, body: unknown) =>
      (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json() as Promise<{
        expenses?: { id: string }[];
      }>;
    const day = new Date().toLocaleDateString("en-CA");
    const proposed = await post("/api/expenses/propose", {
      ventureId: null,
      source: { kind: "agent", label: "the desktop test" },
      expenses: [{ date: day, amountCents: 2_500, paidTo: "Example Print Shop desktop viewer", whatFor: "toner" }],
    });
    const expenseId = proposed.expenses![0].id;
    await post("/api/expenses/agree", { expenseIds: [expenseId] });
    await post("/api/expenses/receipt", { expenseId, file });
    return expenseId;
  }, pdf({ text: "Example Print Shop receipt" }).toString("base64"));
  expect(id).toBeTruthy();
  await page.reload();
  const workers: Worker[] = [];
  page.on("worker", (w) => workers.push(w));
  const row = page.getByRole("list", { name: "Records you agreed to" }).getByRole("listitem").filter({ hasText: "Example Print Shop desktop viewer" });
  await row.getByRole("button", { name: "Show receipt" }).click();
  const drawn = page.getByRole("dialog", { name: /^Receipt: / }).getByRole("img", { name: "Page 1 of 1" });
  await expect(drawn).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() =>
      drawn.evaluate((el) => {
        const c = el as HTMLCanvasElement;
        const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < data.length; i += 4) if (data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100) return true;
        return false;
      }),
    )
    .toBe(true);
  const viewerWorker = workers.find((w) => new URL(w.url()).pathname.startsWith("/_next/static/"));
  expect(viewerWorker, "the receipt viewer's worker").toBeTruthy();
  expect(await viewerWorker!.evaluate(() => fetch("/api/expenses").then(() => "reached", () => "refused"))).toBe("refused");
  // The window is still DotAmi's Expenses page: nothing in the receipt moved it.
  expect(new URL(page.url()).pathname).toBe("/expenses");
});

test("a HEIC receipt is drawn by the graphics chip where it decodes HEVC, or plainly refused; once the graphics process stops, DotAmi doesn't try again ([8i])", async () => {
  // Option D of docs/connectors/heic-decoder-review.md, in the app's own window. The invented photo is
  // a 2 × 2 grid of flat colours (red, green / blue, white) turned a quarter anticlockwise, so a drawn
  // picture shows green, white / red, blue: the tiles were placed and the rotation applied.
  const page = await launch();
  await page.goto(new URL("/expenses", page.url()).toString());
  // The window's bridge gives the page exactly its two HEIC calls (desktop/window-preload.cjs).
  expect(await page.evaluate(() => Object.keys((window as unknown as { dotamiDesktop: object }).dotamiDesktop).sort())).toEqual(["heicFailed", "heicStopped"]);
  const photo = heic({ transforms: [["irot", 1]] });
  const id = await page.evaluate(async (file) => {
    const post = async (url: string, body: unknown) =>
      (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json() as Promise<{
        expenses?: { id: string }[];
      }>;
    const day = new Date().toLocaleDateString("en-CA");
    const proposed = await post("/api/expenses/propose", {
      ventureId: null,
      source: { kind: "agent", label: "the desktop test" },
      expenses: [{ date: day, amountCents: 1_800, paidTo: "Example Corner Store desktop HEIC", whatFor: "printer paper" }],
    });
    const expenseId = proposed.expenses![0].id;
    await post("/api/expenses/agree", { expenseIds: [expenseId] });
    await post("/api/expenses/receipt", { expenseId, file });
    return expenseId;
  }, photo.toString("base64"));
  expect(id).toBeTruthy();
  const receipts = readdirSync(path.join(dataDir, "receipts"));
  expect(receipts).toHaveLength(1);
  expect(receipts[0]).toMatch(/^[0-9a-f]{32}\.heic$/);
  // Encrypted on the disk like every other receipt (#128), with this data folder's key: none of the
  // photo's own bytes, not even its ftyp box, are in the file.
  const onDisk = readFileSync(path.join(dataDir, "receipts", receipts[0]));
  expect(onDisk.subarray(0, 14).toString("latin1")).toBe("DOTAMI-RECEIPT");
  expect(onDisk.length).toBe(photo.length + ENCRYPTED_OVERHEAD);
  expect(onDisk.indexOf(photo.subarray(0, 24))).toBe(-1);
  expect(encryptedKeyId(onDisk)).toBe(JSON.parse(readFileSync(path.join(dataDir, "receipts.key"), "utf8")).keyId);
  // The window is handed the photo itself, decrypted in memory, which is what the HEIC reader opens below.
  expect(await receiptBytesShown(page, "Example Corner Store desktop HEIC")).toEqual(photo.toString("base64"));

  await page.reload();
  // What this computer's graphics chip says about the photo's codec decides which answer is right.
  const decodes = await page.evaluate(async () =>
    typeof VideoDecoder === "undefined" ? false : (await VideoDecoder.isConfigSupported({ codec: "hvc1.1.2.L186.90", codedWidth: 128, codedHeight: 128 })).supported === true,
  );
  console.log(`this computer's graphics chip ${decodes ? "decodes" : "doesn't decode"} the invented HEVC`);
  const workers: Worker[] = [];
  page.on("worker", (w) => workers.push(w));
  const row = page.getByRole("list", { name: "Records you agreed to" }).getByRole("listitem").filter({ hasText: "Example Corner Store desktop HEIC" });
  await row.getByRole("button", { name: "Show receipt" }).click();
  const dialog = page.getByRole("dialog", { name: /^Receipt: / });
  await expect(dialog).toContainText("HEIC photo, shown inside DotAmi from its copy on this computer, drawn by this computer's graphics chip.");
  if (decodes) {
    const drawn = dialog.getByRole("img", { name: "The receipt photo (256 × 256 pixels)" });
    await expect(drawn).toBeVisible({ timeout: 30_000 });
    const pixels = await drawn.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const g = c.getContext("2d")!;
      return [
        [64, 64],
        [192, 64],
        [64, 192],
        [192, 192],
      ].map(([x, y]) => Array.from(g.getImageData(x, y, 1, 1).data.slice(0, 3)));
    });
    const near = (got: number[], want: number[]) => got.every((v, i) => Math.abs(v - want[i]) <= 40);
    const expected = [
      [0, 160, 0],
      [255, 255, 255],
      [255, 0, 0],
      [0, 0, 255],
    ];
    expect(
      pixels.map((p, i) => near(p, expected[i])),
      JSON.stringify(pixels),
    ).toEqual([true, true, true, true]);
  } else {
    await expect(dialog.getByRole("alert")).toHaveText(VIEW_MESSAGES.heicUnsupported);
    await expect(dialog.getByRole("img")).toHaveCount(0);
  }
  // The HEIC worker came from DotAmi's own files and can't reach DotAmi's server (or anything else).
  const heicWorker = workers.find((w) => new URL(w.url()).pathname.startsWith("/_next/static/"));
  expect(heicWorker, "the HEIC worker").toBeTruthy();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();

  // The graphics process stops (as a crash would report it): from now on, until DotAmi restarts, no
  // HEIC is handed to the graphics chip, even after a reload of the page.
  await app!.evaluate(({ app: electronApp }) => {
    electronApp.emit("child-process-gone", {}, { type: "GPU", reason: "crashed", exitCode: 1 });
  });
  await page.reload();
  const started = workers.length;
  await row.getByRole("button", { name: "Show receipt" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(VIEW_MESSAGES.heicStopped);
  await expect(dialog.getByRole("img")).toHaveCount(0);
  expect(workers.length, "no HEIC worker started").toBe(started);
  expect(readFileSync(path.join(dataDir, "logs", "server.log"), "utf8")).toContain(
    "[desktop] the graphics process stopped (crashed); HEIC receipts won't be drawn until DotAmi restarts",
  );
  // The stored file is untouched, and still opens as the photo.
  expect(readFileSync(path.join(dataDir, "receipts", receipts[0])).equals(onDisk)).toBe(true);
  expect(await receiptBytesShown(page, "Example Corner Store desktop HEIC")).toEqual(photo.toString("base64"));
});

/** Text no real data holds, so finding it in a file's bytes can only mean the deleted statement. */
const MARKER = "zq-desktop-delete-marker-5813";

/**
 * Does this file hold the marker? A plain file: in its raw bytes. [8i] An encrypted one: in its decrypted
 * page image (every page, free ones included), read with `key`, since its raw bytes never hold it.
 */
function holdsMarker(file: string, key: Buffer | null = null): boolean {
  if (fileKind(file) !== "encrypted") return readFileSync(file).includes(Buffer.from(MARKER));
  if (!key) throw new Error(`${file} is encrypted: pass its key`);
  const db = openDatabase(file, { key, readonly: true, fileMustExist: true });
  try {
    return db.serialize().includes(Buffer.from(MARKER));
  } finally {
    db.close();
  }
}

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
  // [8i] The data file is encrypted: the words are checked in its decrypted image, read with its key.
  const key = await dataKey();
  const status = await page.evaluate(
    async (text) =>
      (await fetch("/api/person/statements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }))
        .status,
    `statement ${MARKER}`,
  );
  expect(status).toBe(200);
  await backUpTo(elsewhere, passphrase);
  await restoreFrom(elsewhere, passphrase);

  // The "before": the words are in the data file and in the safety copy (encrypted with the same key),
  // and in no file's raw bytes.
  expect(holdsMarker(dbFile, key)).toBe(true);
  expect(safetyCopies(dataDir)).toHaveLength(1);
  expect(holdsMarker(path.join(dataDir, "backups", safetyCopies(dataDir)[0]), key)).toBe(true);
  expect(filesHolding(dataDir, MARKER)).toEqual([]);

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

  // The "after": in no page of the data file, no safety copy left, no journal, no wipe still owed.
  expect(holdsMarker(dbFile, key)).toBe(false);
  expect(safetyCopies(dataDir)).toEqual([]);
  for (const f of readdirSync(path.join(dataDir, "backups"))) {
    if (f.endsWith(".db")) expect(holdsMarker(path.join(dataDir, "backups", f), key), f).toBe(false);
  }
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
  expect(holdsMarker(dbFile, key)).toBe(true);
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
  // [8i] The data file is encrypted: the words are put in, and checked, with its key.
  const key = await dataKey();
  await quit();
  mkdirSync(path.join(dataDir, "backups"));
  const copyName = "dotami-before-restore-1760000000000.db";
  const db = openDatabase(dbFile, { key });
  db.prepare(`INSERT OR IGNORE INTO "User" (id, updatedAt) VALUES ('wipe-test', 0)`).run();
  db.prepare(`INSERT INTO "PersonStatement" (id, userId, text, saidAt) VALUES ('wipe-test', 'wipe-test', ?, 0)`).run(`statement ${MARKER}`);
  db.prepare("VACUUM INTO ?").run(path.join(dataDir, "backups", copyName));
  // SQLite3 Multiple Ciphers overwrites deleted words at once on an encrypted file (secure_delete); a
  // leftover like an earlier, plain DotAmi's is made by switching that off for this one delete.
  db.pragma("secure_delete = OFF");
  db.prepare(`DELETE FROM "PersonStatement" WHERE id = 'wipe-test'`).run();
  db.close();
  expect(holdsMarker(dbFile, key)).toBe(true);

  // An ordinary start, with no note: nothing is wiped or deleted. (This is also the test's control:
  // without the note, the words would stay.)
  page = await launch();
  await expect(page.getByRole("heading", { name: /Map any venture/ })).toBeVisible();
  await quit();
  expect(holdsMarker(dbFile, key)).toBe(true);
  expect(safetyCopies(dataDir)).toEqual([copyName]);
  expect(readFileSync(logFile, "utf8")).not.toContain("[wipe]");

  // The note Delete leaves when its wipe can't finish: the next start finishes it.
  writeWipePending(dbFile, { backups: [copyName] });
  page = await launch();
  await expect(page.getByRole("heading", { name: /Map any venture/ })).toBeVisible();
  await quit();
  expect(holdsMarker(dbFile, key)).toBe(false);
  expect(safetyCopies(dataDir)).toEqual([]);
  expect(existsSync(wipePendingFile(dbFile))).toBe(false);
  const log = readFileSync(logFile, "utf8");
  expect(log).toContain("[wipe] finished the wipe an earlier Delete left owed (1 safety copy deleted)");
  expect(log).toContain("[desktop] wipe-pending note cleared");
  expect(log).not.toContain(MARKER);
});

const PLAIN_WORDS = "zq-desktop-plain-statement-4471";

test("an existing plain data file: the window asks first, and Encrypt now encrypts it, keeps everything and wipes the plain file ([8i])", async () => {
  const dbFile = seedPlainFolder(dataDir, `statement ${PLAIN_WORDS}`);
  expect(filesHolding(dataDir, PLAIN_WORDS)).toEqual(["dotami.db"]);

  const ask = await launchTo("encrypt-ask");
  // What it protects, what it doesn't, what a lost key costs, and the four answers.
  await expect(ask.getByText("your Windows account on this computer")).toBeVisible();
  await expect(ask.getByText(/everything not in a backup is lost/)).toBeVisible();
  for (const name of ["Back up first…", "Encrypt now", "Not now", "Never…"]) await expect(ask.getByRole("button", { name, exact: true })).toBeVisible();
  const page = await answerEncryptAsk(ask, "Encrypt now");

  // The statement is still there, read from the encrypted file.
  const statements = await page.evaluate(async () => (await (await fetch("/api/person/statements")).json()) as { statements: { text: string }[] });
  expect(statements.statements.map((s) => s.text)).toContain(`statement ${PLAIN_WORDS}`);
  await page.goto(new URL("/settings", page.url()).toString());
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("Your data file is encrypted on this computer.");
  const log = readFileSync(path.join(dataDir, "logs", "server.log"), "utf8");
  expect(log).toContain("[database] the window before encrypting was shown; the answer: encrypt");
  expect(log).toContain("[database] the data file is encrypted");
  expect(log).not.toContain(PLAIN_WORDS);
  await quit();

  // No plain byte left anywhere in the data folder, no half-done files, and the file opens only with its key.
  expect(fileKind(dbFile)).toBe("encrypted");
  expect(filesHolding(dataDir, PLAIN_WORDS)).toEqual([]);
  for (const name of ["dotami.db.plain-to-wipe", "dotami.db.encrypting", "database-encrypting.json"]) expect(existsSync(path.join(dataDir, name)), name).toBe(false);

  // The next start asks nothing and opens it.
  const again = await launch();
  await expect(again.getByRole("heading", { name: /Map any venture/ })).toBeVisible();
});

test("Not now keeps the file plain and asks again; Never keeps it plain and doesn't; the Settings switch brings the question back ([8i])", async () => {
  test.setTimeout(240_000);
  const dbFile = seedPlainFolder(dataDir, `statement ${PLAIN_WORDS}`);

  // Not now: plain, said so, and asked again at the next start.
  let page = await answerEncryptAsk(await launchTo("encrypt-ask"), "Not now");
  await page.goto(new URL("/settings", page.url()).toString());
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("Your data file isn't encrypted yet.");
  await quit();
  expect(fileKind(dbFile)).toBe("plain");

  // Never, after its warning: plain, said so, and the switch shows it.
  page = await answerEncryptAsk(await launchTo("encrypt-ask"), "Never…");
  await page.goto(new URL("/settings", page.url()).toString());
  const data = page.getByRole("region", { name: "Data and backups" });
  await expect(data).toContainText("You chose to keep it unencrypted");
  await expect(data.getByLabel("Encrypt the data file")).not.toBeChecked();
  await quit();
  expect(fileKind(dbFile)).toBe("plain");

  // The next start doesn't ask: straight to the main window.
  page = await launch();
  await page.goto(new URL("/settings", page.url()).toString());
  // Turning the switch on: saved, and the next start asks again.
  // Clicked, not "checked": the box shows what the app saved, so it ticks once the save answers.
  await page.getByRole("region", { name: "Data and backups" }).getByLabel("Encrypt the data file").click();
  await expect(page.getByRole("region", { name: "Data and backups" }).getByLabel("Encrypt the data file")).toBeChecked();
  await expect(page.getByRole("region", { name: "Data and backups" })).toContainText("DotAmi asks to encrypt your data file the next time it starts.");
  await quit();

  page = await answerEncryptAsk(await launchTo("encrypt-ask"), "Encrypt now");
  await quit();
  expect(fileKind(dbFile)).toBe("encrypted");
  expect(filesHolding(dataDir, PLAIN_WORDS)).toEqual([]);
});

test("Back up first… makes a backup of the still-plain file, then comes back to the question ([8i])", async () => {
  seedPlainFolder(dataDir, `statement ${PLAIN_WORDS}`);
  const backupFile = path.join(tmp, "before encrypting.dotami-backup");
  const passphrase = "correct horse battery staple";
  const ask = await launchTo("encrypt-ask");
  await app!.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: target })) as typeof dialog.showSaveDialog;
    dialog.showMessageBox = (async () => ({ response: 0, checkboxChecked: false })) as typeof dialog.showMessageBox;
  }, backupFile);
  const prompted = app!.waitForEvent("window");
  const askedAgain = app!.waitForEvent("window", { predicate: (w) => w !== ask && w.url().includes("encrypt-ask.html") });
  await ask.getByRole("button", { name: "Back up first…" }).click();
  const prompt = await prompted;
  await prompt.locator("#pass").fill(passphrase);
  await prompt.locator("#confirm").fill(passphrase);
  await prompt.getByRole("button", { name: "Back up" }).click();
  const back = await askedAgain;
  await expect(back.getByRole("status")).toContainText("Backed up to");
  await answerEncryptAsk(back, "Encrypt now");
  await quit();

  // The backup holds the still-plain data, and opens.
  const { database } = readBackup(backupFile, { passphrase, unpackTo: { receiptsDir: path.join(tmp, "unpacked") } });
  expect(database!.subarray(0, 15).toString("latin1")).toBe("SQLite format 3");
  expect(database!.includes(Buffer.from(PLAIN_WORDS))).toBe(true);
});

test("a data file whose key can't be opened: nothing changes, the app says what to do, and putting the key back brings everything back ([8i])", async () => {
  let page = await launch();
  await describeVenture(page);
  await quit();
  const dbFile = path.join(dataDir, "dotami.db");
  const keyFile = path.join(dataDir, "database.key");
  const aside = path.join(tmp, "database.key.aside");
  writeFileSync(aside, readFileSync(keyFile));
  rmSync(keyFile);
  const before = readFileSync(dbFile);

  const window = await launchTo("lost-key");
  await expect(window.getByRole("heading", { name: "DotAmi can't open your data" })).toBeVisible();
  await expect(window.getByText(/The key file \(database.key, beside the data file\) is missing\./)).toBeVisible();
  await expect(window.getByText("Nothing was changed.")).toBeVisible();
  const closed = app!.waitForEvent("close");
  await window.getByRole("button", { name: "Quit" }).click();
  await closed;
  app = null;
  // Nothing on the disk changed, and no new key was made.
  expect(readFileSync(dbFile).equals(before)).toBe(true);
  expect(existsSync(keyFile)).toBe(false);
  expect(readFileSync(path.join(dataDir, "logs", "server.log"), "utf8")).toContain("[database] the key file is missing; nothing was changed");

  // Put back (as from the Recycle Bin): everything comes back.
  writeFileSync(keyFile, readFileSync(aside));
  page = await launch();
  await page.getByRole("link", { name: "Your ideas →" }).click();
  await expect(page.getByRole("heading", { name: "My venture", level: 2 })).toBeVisible();
});
