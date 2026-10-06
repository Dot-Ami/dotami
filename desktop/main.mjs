// The desktop app ([7b]): the same DotAmi, in its own window, with the data on this computer.
//
// On launch: pick the data folder (the app's own folder, or DOTAMI_DATA_DIR) → bring the database
// file up to date (desktop/migrate.mjs, Prisma's own migration files) → start the self-contained
// Next.js server (built by desktop/build.mjs) on a free port bound to 127.0.0.1 → open a window on
// it. Nothing listens beyond this computer, and the window can't navigate anywhere else: outside
// links open in the person's own browser. Plan: docs/architecture/desktop-app.md.
import { mkdirSync, accessSync, constants, createWriteStream, existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, dialog, Menu, session, shell, utilityProcess } from "electron";

import { migrate, MigrationRefused } from "./migrate.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Installed: the server ships as its own folder beside the app (desktop/package.mjs); from a
// checkout, it's desktop/build.mjs's output.
const serverEntry = app.isPackaged
  ? path.join(process.resourcesPath, "server", "server.js")
  : path.join(root, ".next-desktop", "standalone", "server.js");
const migrations = path.join(root, "prisma", "migrations");

app.setName("DotAmi");
// Tests (and anyone who wants their data elsewhere) point the app at another folder. Must be set
// before the single-instance lock, which is kept per data folder.
if (process.env.DOTAMI_DATA_DIR) app.setPath("userData", path.resolve(process.env.DOTAMI_DATA_DIR));

/** @type {BrowserWindow | null} */
let win = null;
/** @type {Electron.UtilityProcess | null} */
let server = null;
let quitting = false;
/** @type {import("node:fs").WriteStream | null} */
let log = null;

// Only the installed app updates itself, from GitHub Releases ([7d]); a copy run from the source
// code updates with git. Tests switch the check off so they never reach the internet.
const updatesOn = app.isPackaged && process.env.DOTAMI_NO_UPDATE_CHECK !== "1";
let updaterReady = false;

// One copy per data folder: a second launch brings the first window forward instead of starting
// a second server writing to the same file.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(start).catch((error) => fail("DotAmi couldn't start.", error));
}

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  quitting = true;
  server?.kill();
});

async function start() {
  const dataDir = app.getPath("userData");
  const dbFile = path.join(dataDir, "dotami.db");
  try {
    mkdirSync(dataDir, { recursive: true });
    accessSync(dataDir, constants.W_OK);
  } catch (error) {
    return fail(`DotAmi can't write to its data folder:\n${dataDir}\n\nCheck that the folder exists and that you're allowed to change it.`, error);
  }
  if (!existsSync(serverEntry)) {
    return fail("This copy of DotAmi hasn't been built yet. Run `npm run desktop:build`, then start it again.");
  }

  const logDir = path.join(dataDir, "logs");
  mkdirSync(logDir, { recursive: true });
  log = createWriteStream(path.join(logDir, "server.log"), { flags: "a" });
  log.write(`\n--- ${new Date().toISOString()} starting DotAmi ${app.getVersion()}\n`);

  // Prisma reads `file:` URLs with forward slashes on every system.
  const databaseUrl = `file:${dbFile.replace(/\\/g, "/")}`;

  // A fresh data folder gets its database here; an existing one gets any new migrations, after a
  // backup copy in backups/. A database from a newer DotAmi, or a half-done update, is refused
  // untouched.
  try {
    const { applied, backup } = migrate(dbFile, migrations, { log: (line) => log.write(`${line}\n`) });
    log.write(`[desktop] database ready (${applied.length} update(s) applied${backup ? `, backup ${backup}` : ""})\n`);
  } catch (error) {
    if (error instanceof MigrationRefused) return fail(error.message);
    log.write(`[desktop] ${error}\n`);
    return fail(`DotAmi couldn't prepare its database:\n${dbFile}\n\nNothing was changed. Details are in ${path.join(logDir, "server.log")}.`, error);
  }

  const port = await freePort();
  server = utilityProcess.fork(serverEntry, [], {
    cwd: path.dirname(serverEntry),
    stdio: "pipe",
    serviceName: "DotAmi server",
    env: serverEnv({ PORT: String(port), HOSTNAME: "127.0.0.1", DATABASE_URL: databaseUrl }),
  });
  server.stdout?.pipe(log, { end: false });
  server.stderr?.pipe(log, { end: false });
  server.on("exit", (code) => {
    if (!quitting) fail(`DotAmi's server stopped unexpectedly (code ${code}). Details are in ${path.join(logDir, "server.log")}.`);
  });

  const origin = `http://127.0.0.1:${port}`;
  log.write(`[desktop] server starting on ${origin}\n`);
  await waitForServer(origin, 30_000);
  log.write(`[desktop] server answering; opening the window\n`);
  lockDown(origin);
  buildMenu(origin, dataDir);

  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 520,
    title: "DotAmi",
    backgroundColor: "#161619",
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once("ready-to-show", () => win?.show());
  await win.loadURL(origin).catch((error) => {
    // ERR_ABORTED: another navigation (a menu item clicked during start-up) replaced the first
    // load. That isn't a failure; treating it as one closed the app (seen 2026-10-05).
    if (error?.code !== "ERR_ABORTED") throw error;
  });
  if (updatesOn) void checkForUpdates(false);
}

/**
 * Asks GitHub Releases for a newer version and downloads it; installing is always the person's
 * click ("Restart and update"), never automatic. Only published releases count — a draft the CI
 * made is invisible until the maintainer publishes it. A copy whose version has a pre-release tag
 * (e.g. 0.2.0-dev.1) also takes pre-releases; a normal copy doesn't (electron-updater's own
 * `allowPrerelease` default, node_modules/electron-updater/out/AppUpdater.d.ts). The download is
 * checked against the SHA-512 in the release's latest.yml before it can be installed.
 */
async function checkForUpdates(byHand) {
  if (!updatesOn) {
    if (byHand) {
      void dialog.showMessageBox({
        type: "info",
        title: "Updates",
        message: "This copy runs from DotAmi's source code.",
        detail: "It updates with git, not by itself. The installed app checks GitHub for new versions.",
      });
    }
    return;
  }
  const { autoUpdater } = (await import("electron-updater")).default;
  if (!updaterReady) {
    updaterReady = true;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.logger = {
      info: (m) => log?.write(`[update] ${m}\n`),
      warn: (m) => log?.write(`[update] ${m}\n`),
      error: (m) => log?.write(`[update] ${m}\n`),
      debug: () => {},
    };
    autoUpdater.on("update-downloaded", async (info) => {
      const { response } = await dialog.showMessageBox(win ?? undefined, {
        type: "info",
        title: "Update ready",
        buttons: ["Restart and update", "Later"],
        defaultId: 0,
        cancelId: 1,
        message: `DotAmi ${info.version} is ready to install.`,
        detail: "Your data stays in its folder, and the app copies it to backups/ before any change to how it's stored.",
      });
      if (response === 0) autoUpdater.quitAndInstall();
    });
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    if (byHand && !result?.isUpdateAvailable) {
      void dialog.showMessageBox({ type: "info", title: "Updates", message: `You have the latest version (${app.getVersion()}).` });
    } else if (byHand) {
      void dialog.showMessageBox({ type: "info", title: "Updates", message: `Downloading DotAmi ${result.updateInfo.version}…`, detail: "You'll be asked before it installs." });
    }
  } catch (error) {
    log?.write(`[update] check failed: ${error}\n`);
    if (byHand) {
      void dialog.showMessageBox({ type: "warning", title: "Updates", message: "DotAmi couldn't check for updates right now.", detail: "Check your internet connection and try again from Help → Check for updates." });
    }
  }
}

/**
 * The server's environment: what Node needs to run, plus the app's own settings — and never a
 * model key from the shell it was started from. DotAmi ships no key; the person's model comes
 * from the app's settings once the Lens exists ([9a]).
 */
function serverEnv(own) {
  // DOTAMI_UPDATES tells the settings page what this copy does about updates (lib/settings/today.ts).
  const updates = updatesOn ? "github" : "";
  const env = { ...process.env, ...own, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", DOTAMI_UPDATES: updates };
  delete env.ANTHROPIC_API_KEY;
  delete env.DOTAMI_DATA_DIR;
  return env;
}

/** A port nothing is using right now, on this computer only. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = /** @type {net.AddressInfo} */ (probe.address());
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(origin, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(origin, { method: "HEAD" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  throw new Error(`the server didn't answer on ${origin} within ${timeoutMs / 1000}s`);
}

/**
 * Electron's security checklist (electronjs.org/docs/latest/tutorial/security, read 2026-10-05):
 * the window may show only DotAmi's own pages; new windows are refused; an outside https link
 * opens in the person's own browser; the only permission granted is writing to the clipboard
 * (the settings page's Copy path button).
 */
function lockDown(origin) {
  const openOutside = (url) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
  };
  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      openOutside(url);
      return { action: "deny" };
    });
    contents.on("will-navigate", (event, url) => {
      if (new URL(url).origin !== origin) {
        event.preventDefault();
        openOutside(url);
      }
    });
  });
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(permission === "clipboard-sanitized-write" && new URL(contents.getURL()).origin === origin);
  });
}

function buildMenu(origin, dataDir) {
  const go = (pathname) => () => win?.loadURL(`${origin}${pathname}`);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          { label: "Open data folder", click: () => void shell.openPath(dataDir) },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "Go",
        submenu: [
          { label: "Home", click: go("/") },
          { label: "Your ideas", click: go("/ventures") },
          { label: "Settings", click: go("/settings") },
        ],
      },
      {
        label: "View",
        submenu: [{ role: "reload" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "togglefullscreen" }],
      },
      {
        label: "Help",
        submenu: [
          {
            label: "About DotAmi",
            click: () =>
              void dialog.showMessageBox({
                type: "info",
                title: "About DotAmi",
                message: `DotAmi ${app.getVersion()}`,
                detail: `Your data: ${dataDir}\n\nInformation, not legal or tax advice — a prep tool for you and your accountant. Open source: github.com/Dot-Ami/dotami`,
              }),
          },
          { label: "Check for updates…", click: () => void checkForUpdates(true) },
          { label: "Source on GitHub", click: () => void shell.openExternal("https://github.com/Dot-Ami/dotami") },
        ],
      },
    ]),
  );
}

/** Says what went wrong in plain words, then quits — never a blank window. */
function fail(message, error) {
  if (error) console.error(error);
  if (quitting) return;
  quitting = true;
  dialog.showErrorBox("DotAmi", message);
  server?.kill();
  app.quit();
}
