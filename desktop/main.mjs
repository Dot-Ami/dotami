// The desktop app ([7b]): the same DotAmi, in its own window, with the data on this computer.
//
// On launch: pick the data folder (the app's own folder, or DOTAMI_DATA_DIR) → bring the database
// file up to date (desktop/migrate.mjs, Prisma's own migration files) → start the self-contained
// Next.js server (built by desktop/build.mjs) on a free port bound to 127.0.0.1 → open a window on
// it. Nothing listens beyond this computer, and the window can't navigate anywhere else: outside
// links open in the person's own browser. Plan: docs/architecture/desktop-app.md.
import { mkdirSync, accessSync, constants, existsSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell, utilityProcess } from "electron";

import { applyRestore, BACKUP_EXTENSION, BackupError, prepareRestore, writeBackup } from "./backup.mjs";
import { describeError, openLog } from "./log.mjs";
import { migrate, MigrationRefused } from "./migrate.mjs";
import { showUpdateProgress } from "./update-notice.mjs";

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
/** @type {import("./log.mjs").DesktopLog | null} */
let log = null;
let dataDir = "";
let dbFile = "";

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
  dataDir = app.getPath("userData");
  dbFile = path.join(dataDir, "dotami.db");
  try {
    mkdirSync(dataDir, { recursive: true });
    accessSync(dataDir, constants.W_OK);
  } catch (error) {
    return fail(`DotAmi can't write to its data folder:\n${dataDir}\n\nCheck that the folder exists and that you're allowed to change it.`, error);
  }
  // Opened as soon as the data folder is known to be writable, and written straight to the disk
  // (desktop/log.mjs): a start that stops anywhere after this line leaves its reason in the log.
  const logDir = path.join(dataDir, "logs");
  log = openLog(path.join(logDir, "server.log"));
  // --updated: the installer started this copy after an update (electron-builder's NSIS
  // StartApp; docs/architecture/desktop-app.md § Updating on Windows).
  const how = process.argv.includes("--updated") ? " (started by the updater)" : "";
  log.write(`\n--- ${new Date().toISOString()} starting DotAmi ${app.getVersion()}${how}\n`);

  if (!existsSync(serverEntry)) {
    return fail("This copy of DotAmi hasn't been built yet. Run `npm run desktop:build`, then start it again.");
  }

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
    // The one error whose words the log keeps: which update failed and what the database objected
    // to (a table or a column), which is what a failed update needs to be fixed. The privacy
    // inventory's entry for the log says so.
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
  log.follow(server.stdout);
  log.follow(server.stderr);
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
    // "Downloading now" the moment a newer version is found, the taskbar button as progress, then
    // "Restart and update" / "Later" once it's downloaded and checked (desktop/update-notice.mjs).
    // The same for the check at start and for Help → Check for updates.
    showUpdateProgress({ updater: autoUpdater, dialog, window: () => win, log: (line) => log?.write(`${line}\n`) });
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    if (byHand && !result?.isUpdateAvailable) {
      void dialog.showMessageBox({ type: "info", title: "Updates", message: `You have the latest version (${app.getVersion()}).` });
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
  // DOTAMI_DESKTOP tells it this is the desktop app, which has Back up and Restore in its File menu.
  const updates = updatesOn ? "github" : "";
  const env = { ...process.env, ...own, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", DOTAMI_UPDATES: updates, DOTAMI_DESKTOP: "1" };
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
          { id: "backup", label: "Back up…", click: () => void backUp() },
          { id: "restore", label: "Restore from a backup…", click: () => void restore() },
          { type: "separator" },
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

/**
 * File → Back up…: one file holding the whole database, locked with a passphrase if the person
 * chooses one (desktop/backup.mjs). Meant to be kept somewhere other than this computer.
 */
async function backUp() {
  const passphrase = await askPassphrase("backup");
  if (passphrase === null) return;
  const day = new Date().toLocaleDateString("en-CA");
  const { canceled, filePath } = await dialog.showSaveDialog(win ?? undefined, {
    title: "Back up DotAmi",
    defaultPath: path.join(app.getPath("documents"), `DotAmi backup ${day}.${BACKUP_EXTENSION}`),
    filters: [{ name: "DotAmi backup", extensions: [BACKUP_EXTENSION] }],
  });
  if (canceled || !filePath) return;
  try {
    const { encrypted } = writeBackup(dbFile, filePath, { passphrase, appVersion: app.getVersion() });
    log?.write(`[backup] wrote ${filePath} (${encrypted ? "locked" : "not locked"})\n`);
    await dialog.showMessageBox(win ?? undefined, {
      type: "info",
      title: "Backed up",
      message: `Backed up to ${filePath}`,
      detail:
        (encrypted ? "It's locked with your passphrase. " : "It isn't locked: anyone with the file can open it. ") +
        "Keep a copy somewhere other than this computer. To protect the data that stays here, turn on your computer's disk encryption (see Settings → Data and backups).",
    });
  } catch (error) {
    log?.write(`[backup] failed: ${error}\n`);
    await dialog.showMessageBox(win ?? undefined, { type: "error", title: "Backup failed", message: "DotAmi couldn't write the backup.", detail: String(error?.message ?? error) });
  }
}

/**
 * File → Restore from a backup…: everything is checked on a temporary copy first — the
 * passphrase, that the file is whole, that a newer DotAmi didn't make it — and only then, after
 * the person confirms, the current data is copied to backups/ and replaced. The app restarts so
 * the database opens fresh (and an older backup is upgraded by desktop/migrate.mjs).
 */
async function restore() {
  const { canceled, filePaths } = await dialog.showOpenDialog(win ?? undefined, {
    title: "Restore DotAmi from a backup",
    properties: ["openFile"],
    filters: [{ name: "DotAmi backup", extensions: [BACKUP_EXTENSION] }],
  });
  if (canceled || filePaths.length === 0) return;
  const staging = path.join(dataDir, "restore-staging.db");
  let passphrase = "";
  let header;
  for (;;) {
    try {
      ({ header } = prepareRestore(filePaths[0], { passphrase, migrationsDir: migrations, stagingFile: staging }));
      break;
    } catch (error) {
      if (error instanceof BackupError && (error.kind === "needs-passphrase" || error.kind === "cannot-decrypt")) {
        const message = error.kind === "cannot-decrypt" ? "That passphrase didn't open it. Try again — or the file may be damaged." : "";
        const again = await askPassphrase("restore", message);
        if (again === null) return;
        passphrase = again;
        continue;
      }
      log?.write(`[restore] refused: ${error}\n`);
      await dialog.showMessageBox(win ?? undefined, {
        type: "error",
        title: "Can't restore",
        message: error instanceof BackupError ? error.message : "DotAmi couldn't read that backup. Nothing was changed.",
      });
      return;
    }
  }

  const { response } = await dialog.showMessageBox(win ?? undefined, {
    type: "warning",
    title: "Restore from a backup",
    buttons: ["Replace and restart", "Cancel"],
    defaultId: 1,
    cancelId: 1,
    message: "This replaces everything in DotAmi on this computer with the backup.",
    detail: `The backup was made ${new Date(header.createdAt).toLocaleString()} by DotAmi ${header.appVersion}. A safety copy of what's here now goes to the backups folder first.`,
  });
  if (response !== 0) {
    rmSync(staging, { force: true });
    return;
  }

  // The server has the database open; stop it and wait, so the file can be replaced.
  quitting = true;
  if (server) {
    const stopped = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await stopped;
  }
  try {
    const { safetyCopy } = applyRestore(staging, dbFile, { backupDir: path.join(dataDir, "backups") });
    log?.write(`[restore] restored from ${filePaths[0]}; safety copy ${safetyCopy ?? "(no previous data)"}\n`);
  } catch (error) {
    // The swap is the last step: if it fails, the data is still what it was (or, at worst, the
    // safety copy in backups/ holds it). Say so and restart either way — the server is stopped.
    log?.write(`[restore] failed to replace the data: ${error}\n`);
    dialog.showErrorBox("DotAmi", `The restore didn't finish: ${error?.message ?? error}\n\nYour data was copied to the backups folder first. DotAmi will restart.`);
  }
  app.relaunch();
  app.exit(0);
}

/**
 * A small window asking for a backup passphrase. Resolves with the passphrase ("" = none, for a
 * backup), or null if the person cancels or closes it. The window is a local page that can only
 * send back the passphrase or "cancel" (desktop/passphrase-preload.cjs); its message is checked
 * to come from that window before it's believed (Electron security checklist #17).
 */
function askPassphrase(mode, message = "") {
  return new Promise((resolve) => {
    const prompt = new BrowserWindow({
      parent: win ?? undefined,
      modal: Boolean(win),
      width: 460,
      height: mode === "backup" ? 360 : 270,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: "DotAmi",
      backgroundColor: "#161619",
      webPreferences: {
        preload: path.join(root, "desktop", "passphrase-preload.cjs"),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });
    prompt.setMenu(null);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener("dotami-passphrase", onAnswer);
      if (!prompt.isDestroyed()) prompt.close();
      resolve(value);
    };
    const onAnswer = (event, answer) => {
      if (event.sender !== prompt.webContents) return;
      finish(answer?.cancelled ? null : String(answer?.passphrase ?? ""));
    };
    ipcMain.on("dotami-passphrase", onAnswer);
    prompt.on("closed", () => finish(null));
    void prompt.loadFile(path.join(root, "desktop", "passphrase.html"), { query: { mode, message } });
  });
}

/** Says what went wrong in plain words, then quits — never a blank window. */
function fail(message, error) {
  if (error) console.error(error);
  if (quitting) return;
  quitting = true;
  // Into the log before the dialog: the dialog waits for a click, and the person may end the app
  // from the task manager instead. DotAmi's own message (it can name the data folder) and only the
  // error's name and code, as everywhere else in the log; a failed database update has already
  // written what the database objected to, in start().
  log?.write(`[desktop] stopped: ${message.replace(/\s*\n+\s*/g, " ")}${error ? ` (${describeError(error)})` : ""}\n`);
  dialog.showErrorBox("DotAmi", message);
  server?.kill();
  app.quit();
}
