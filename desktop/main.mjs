// The desktop app ([7b]): the same DotAmi, in its own window, with the data on this computer.
//
// On launch: pick the data folder (the app's own folder, or DOTAMI_DATA_DIR) → bring the database
// file up to date (desktop/migrate.mjs, Prisma's own migration files) → start the self-contained
// Next.js server (built by desktop/build.mjs) on a free port bound to 127.0.0.1 → open a window on
// it. Nothing listens beyond this computer, and the window can't navigate anywhere else: outside
// links open in the person's own browser. Plan: docs/architecture/desktop-app.md.
import { mkdirSync, accessSync, constants, existsSync, readdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, session, shell, utilityProcess } from "electron";

import {
  applyRestore,
  BACKUP_EXTENSION,
  BackupError,
  backupReceiptsNote,
  discardRestore,
  isReceiptFileName,
  prepareRestore,
  RECEIPTS_FOLDER,
  restoreReceiptsNote,
  writeBackup,
} from "./backup.mjs";
import { describeError, openLog } from "./log.mjs";
import { migrate, MigrationRefused, vacuumFile } from "./migrate.mjs";
import { PREPARING_TITLE, preparingWindow, waitShowingWindow } from "./preparing.mjs";
import { encryptReceiptsIn, keyIdOf } from "./receipt-crypto.mjs";
import { newReceiptKey, openReceiptKey, RECEIPT_KEY_FILE, receiptLockEnv, revertReceiptKey, saveReceiptKey } from "./receipt-key.mjs";
import { showUpdateProgress } from "./update-notice.mjs";
import { finishPendingWipe } from "./wipe-pending.mjs";

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
/**
 * The receipts' key ([8i], desktop/receipt-key.mjs), opened at start: "on" with the key, "no-key-store",
 * or "key-unreadable". Never written anywhere but receipts.key, wrapped.
 * @type {import("./receipt-key.mjs").OpenedReceiptKey | null}
 */
let receiptKey = null;
/**
 * The "Preparing DotAmi…" window ([8i], desktop/preparing.mjs): shown only while a first start waits for
 * Windows to save its own key, closed when the main window shows or the start fails.
 */
const preparing = preparingWindow(openPreparingWindow, { log: (line) => log?.write(`${line}\n`) });

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

// While a start is failing (fail() closes the preparing window, then shows its message), quitting is
// already under way: closing that last window mustn't quit again under the message.
app.on("window-all-closed", () => {
  if (!quitting) app.quit();
});
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

  // A Delete whose wipe couldn't finish (the computer was busy, the disk full, or it was switched
  // off part-way) left a "wipe pending" note beside the data file: finish it now, before the server
  // opens the file. Only then — an ordinary start, with no note, does nothing here: free space in
  // the file is normal after any edit, and rebuilding it on every start would only slow it down.
  // It never stops the start: what still can't be done stays owed for the next one.
  const wipe = finishPendingWipe(dbFile, { vacuum: vacuumFile, log: (line) => log.write(`${line}\n`) });
  if (wipe.ran) log.write(`[desktop] wipe-pending note ${wipe.wiped && wipe.backupsLeft.length === 0 ? "cleared" : "kept for the next start"}\n`);

  // A fresh data folder gets its database here; an existing one gets any new migrations, after a
  // backup copy in backups/. A database from a newer DotAmi, or a half-done update, is refused
  // untouched (the one exception is the owed wipe just above: when a "wipe pending" note was there,
  // the file has already been rebuilt, with the same contents, before these checks run).
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

  // [8i] The receipts' key, then any receipt file not encrypted yet (docs/architecture/expense-records.md
  // § 9). Before the server starts, so nothing else has the files open. The log gets counts only.
  try {
    // On the very first start of a data folder this waits (about ten seconds) for Windows' own key to
    // reach the disk, so a crash can never leave a receipts key nothing can open (receipt-key.mjs); the
    // preparing window is on the screen meanwhile (preparing.mjs), and only then.
    receiptKey = await openReceiptKey(dataDir, safeStorage, { keyStoreSaved: waitShowingWindow(dataDir, preparing) });
  } catch (error) {
    return fail(`DotAmi couldn't prepare the key that encrypts your receipts, in:\n${dataDir}\n\nNothing was changed. Details are in ${path.join(logDir, "server.log")}.`, error);
  }
  log.write(`[desktop] receipts: ${describeReceiptKey(receiptKey)}\n`);
  if (receiptKey.state === "on") encryptExistingReceipts(receiptKey.key);

  const port = await freePort();
  server = utilityProcess.fork(serverEntry, [], {
    cwd: path.dirname(serverEntry),
    stdio: "pipe",
    serviceName: "DotAmi server",
    env: serverEnv({ PORT: String(port), HOSTNAME: "127.0.0.1", DATABASE_URL: databaseUrl, ...receiptLockEnv(receiptKey) }),
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
  win.once("ready-to-show", () => {
    win?.show();
    // In the same step, so there is never a moment with neither window on the screen.
    preparing.close("the main window showed");
  });
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
 * from the app's settings once the Lens exists ([9a]). Nor the browser tests' rate-limit switch:
 * the desktop app always runs with the real limits (lib/api/rate-limit.ts, E2E_RATE_LIMITS_ENV).
 */
function serverEnv(own) {
  // DOTAMI_UPDATES tells the settings page what this copy does about updates (lib/settings/today.ts).
  // DOTAMI_DESKTOP tells it this is the desktop app, which has Back up and Restore in its File menu.
  const updates = updatesOn ? "github" : "";
  // A receipt key never comes from the shell either: only the one this app opened (receiptLockEnv).
  const { DOTAMI_RECEIPT_KEY: _fromShell, ...inherited } = process.env;
  void _fromShell;
  const env = { ...inherited, ...own, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", DOTAMI_UPDATES: updates, DOTAMI_DESKTOP: "1" };
  delete env.ANTHROPIC_API_KEY;
  delete env.DOTAMI_DATA_DIR;
  delete env.DOTAMI_E2E_RATE_LIMITS;
  return env;
}

/** The log line about the key: its state and what happened to it, never the key or its id. */
function describeReceiptKey(opened) {
  if (opened.state === "on") {
    return `key open${opened.made ? " (made now)" : ""}${opened.setAside ? "; a key file this account couldn't open was moved to the backups folder" : ""}`;
  }
  if (opened.state === "no-key-store") return "the operating system's key store isn't available, so receipts are kept unencrypted";
  const why = opened.storeUnavailable
    ? "the key store isn't available right now"
    : opened.missing
      ? "the key file is missing"
      : "the key file can't be opened by this account";
  return `${why}; ${opened.locked} receipt file(s) are encrypted and can't be opened; nothing was changed`;
}

/**
 * Encrypts every receipt file still kept plain (desktop/receipt-crypto.mjs): the receipts folder, and
 * the ones earlier restores moved into backups/. A file it can't do now stays plain, still opens, and is
 * tried at the next start. Never a reason not to start.
 */
function encryptExistingReceipts(key) {
  const backups = path.join(dataDir, "backups");
  let folders = [path.join(dataDir, RECEIPTS_FOLDER)];
  try {
    folders = folders.concat(
      readdirSync(backups, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith("receipts-before-restore-"))
        .map((e) => path.join(backups, e.name)),
    );
  } catch {
    // No backups folder yet.
  }
  const total = { encrypted: 0, already: 0, failed: 0 };
  for (const folder of folders) {
    try {
      const done = encryptReceiptsIn(folder, key, { isReceiptName: isReceiptFileName });
      total.encrypted += done.encrypted;
      total.already += done.already;
      total.failed += done.failed;
    } catch (error) {
      log?.write(`[desktop] receipts: a folder couldn't be read to encrypt it (${describeError(error)})\n`);
    }
  }
  if (total.encrypted > 0 || total.failed > 0) {
    log?.write(`[desktop] receipts: ${total.encrypted} file(s) encrypted now, ${total.failed} couldn't be yet (tried again at the next start)\n`);
  }
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
 * (the settings page's Copy path button); a file the page saves goes through a Save dialog.
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
  session.defaultSession.on("will-download", (_event, item, contents) => saveDownload(item, contents, origin));
}

/**
 * A file made in the page ("Add to my calendar", a playbook, later the tax sheet's CSV) goes where
 * the person picks in a Save dialog; Cancel cancels it. Nothing is ever written without asking.
 *
 * Without this, Electron falls back to its own built-in dialog (seen 2026-10-08: the download
 * waited with no save path). That one can't be answered by a test, so it could break unseen, and
 * it offers no file type. Only DotAmi's own pages may start a download (a blob: URL carries the
 * page's origin); anything else is cancelled.
 *
 * The dialog is the synchronous one on purpose: Electron reads the save path only during this
 * event, and the window is modal behind the dialog either way.
 */
function saveDownload(item, contents, origin) {
  let ours = false;
  try {
    ours = new URL(item.getURL()).origin === origin;
  } catch {
    ours = false;
  }
  if (!ours) {
    log?.write(`[download] refused one not started by DotAmi's own page\n`);
    item.cancel();
    return;
  }
  const name = item.getFilename();
  const extension = path.extname(name).slice(1);
  const parent = (contents && BrowserWindow.fromWebContents(contents)) ?? win;
  const options = {
    title: `Save ${name}`,
    defaultPath: path.join(app.getPath("downloads"), name),
    filters: extension ? [{ name: `.${extension} file`, extensions: [extension] }] : [],
  };
  const chosen = parent ? dialog.showSaveDialogSync(parent, options) : dialog.showSaveDialogSync(options);
  if (!chosen) {
    item.cancel();
    return;
  }
  item.setSavePath(chosen);
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
          // The third-party notices the build wrote (desktop/notices.mjs), shown by the /licences page.
          { id: "licences", label: "Licences", click: go("/licences") },
          { label: "Source on GitHub", click: () => void shell.openExternal("https://github.com/Dot-Ami/dotami") },
        ],
      },
    ]),
  );
}

/**
 * File → Back up…: one file holding the whole database and the receipt files it describes, locked
 * with a passphrase if the person chooses one (desktop/backup.mjs). Meant to be kept somewhere other
 * than this computer.
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
    // [8i] Receipts go in as their own bytes, decrypted with this computer's key, so the backup restores
    // on a computer whose key differs (expense-records.md § 9).
    const key = receiptKey?.state === "on" ? receiptKey.key : null;
    const { encrypted, receipts, missingReceipts, unreadableReceipts } = writeBackup(dbFile, filePath, {
      passphrase,
      appVersion: app.getVersion(),
      receiptKey: key,
    });
    log?.write(
      `[backup] wrote ${filePath} (${encrypted ? "locked" : "not locked"}; ${receipts} receipt files, ${missingReceipts} missing, ${unreadableReceipts} couldn't be opened)\n`,
    );
    await dialog.showMessageBox(win ?? undefined, {
      type: "info",
      title: "Backed up",
      message: `Backed up to ${filePath}`,
      detail:
        (encrypted ? "It's locked with your passphrase. " : "It isn't locked: anyone with the file can open it. ") +
        backupReceiptsNote(receipts, missingReceipts, { unreadable: unreadableReceipts, locked: encrypted }) +
        (key && receipts > 0
          ? "Your receipts here are encrypted with a key Windows keeps for your account: if that key is ever lost (a Windows profile reset), a backup is how they come back. "
          : "") +
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
  // [8i] The key the restored receipts are encrypted with as they are unpacked (expense-records.md § 9):
  // this computer's own key; or, when its key file can't be opened, a new key, kept in memory and
  // saved only once the person confirms (the restore then replaces every receipt the old key locked).
  const keyLost = receiptKey?.state === "key-unreadable";
  // Start a new key (expense-records.md § 10) may have moved receipts.key aside since this start: the
  // dialog then says it is missing, not that it goes to the backups folder.
  const keyFileGone = keyLost && (receiptKey.missing || !existsSync(path.join(dataDir, RECEIPT_KEY_FILE)));
  const restoreKey = receiptKey?.state === "on" ? receiptKey.key : keyLost ? newReceiptKey() : null;
  let passphrase = "";
  let header;
  let receipts = 0;
  for (;;) {
    try {
      ({ header, receipts } = prepareRestore(filePaths[0], { passphrase, migrationsDir: migrations, stagingFile: staging, receiptKey: restoreKey }));
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
    detail:
      `The backup was made ${new Date(header.createdAt).toLocaleString()} by DotAmi ${header.appVersion}. A safety copy of what's here now goes to the backups folder first.` +
      restoreReceiptsNote(header.format, receipts, receiptFileCount(dataDir)) +
      (keyLost
        ? keyFileGone
          ? " The key to the receipts here is missing: they go to the backups folder as they are, and the restored receipts get a new key."
          : " The key to the receipts here can't be opened on this Windows account: it goes to the backups folder with them, and the restored receipts get a new key."
        : ""),
  });
  if (response !== 0) {
    discardRestore(staging);
    return;
  }

  // The server has the database open; stop it and wait, so the file can be replaced.
  quitting = true;
  if (server) {
    const stopped = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await stopped;
  }
  /** Where the unreadable key file went when a new key was saved below (null: there was none). */
  let newKeySaved = null;
  if (keyLost) {
    // Saved before the swap: the staged receipts are encrypted with this key, so without it saved they
    // would be lost. The unreadable key file moves into backups/, never deleted.
    try {
      newKeySaved = await saveReceiptKey(dataDir, safeStorage, restoreKey);
      log?.write(`[restore] a new receipts key was saved; the one this account couldn't open went to the backups folder\n`);
    } catch (error) {
      log?.write(`[restore] the new receipts key couldn't be saved: ${describeError(error)}\n`);
      discardRestore(staging);
      dialog.showErrorBox("DotAmi", "The restore didn't happen: DotAmi couldn't save a new key for your receipts. Nothing was changed. DotAmi will restart.");
      app.relaunch();
      app.exit(0);
      return;
    }
  }
  try {
    const { safetyCopy, receiptsMovedTo, receiptsRestored } = applyRestore(staging, dbFile, { backupDir: path.join(dataDir, "backups") });
    log?.write(
      `[restore] restored from ${filePaths[0]}; safety copy ${safetyCopy ?? "(no previous data)"}; ${receiptsRestored} receipt files restored${receiptsMovedTo ? `; receipts folder moved to ${receiptsMovedTo}` : ""}\n`,
    );
  } catch (error) {
    // The swap is the last step: if it fails, the data is still what it was (or, at worst, the
    // safety copy in backups/ holds it). Say so and restart either way — the server is stopped.
    log?.write(`[restore] failed to replace the data: ${error}\n`);
    let keyNote = "";
    if (newKeySaved) {
      // The old receipts are back in place (applyRestore undoes its moves), and they need the old key
      // file, not the one saved for the restored receipts: otherwise the next start says "encrypted"
      // over receipts it can't open.
      try {
        const outcome = revertReceiptKey(dataDir, keyIdOf(restoreKey), newKeySaved.setAside);
        log?.write(`[restore] the new receipts key was ${outcome === "reverted" ? "taken back; the old key file is in place again" : "kept: restored receipts are locked with it"}\n`);
        if (outcome === "kept" && newKeySaved.setAside) keyNote = `\n\nThe key file this Windows account couldn't open was moved to:\n${newKeySaved.setAside}`;
      } catch (revertError) {
        log?.write(`[restore] the new receipts key couldn't be taken back: ${describeError(revertError)}\n`);
        if (newKeySaved.setAside) keyNote = `\n\nThe key file this Windows account couldn't open was moved to:\n${newKeySaved.setAside}`;
      }
    }
    dialog.showErrorBox("DotAmi", `The restore didn't finish: ${error?.message ?? error}\n\nYour data was copied to the backups folder first.${keyNote ? `${keyNote}\n\n` : " "}DotAmi will restart.`);
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
      height: mode === "backup" ? 480 : 270,
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

/**
 * How many receipt files DotAmi keeps in the data folder ([8i]): files named the way DotAmi names
 * them (lib/expenses/receipts/store.ts), counted from their names only. 0 when there is no folder.
 */
function receiptFileCount(folder) {
  try {
    return readdirSync(path.join(folder, RECEIPTS_FOLDER)).filter((name) => /^[0-9a-f]{32}\.(jpg|png|webp|pdf)$/.test(name)).length;
  } catch {
    return 0;
  }
}

/**
 * The "Preparing DotAmi…" window: small, local, no script (desktop/preparing.html's own policy lets it
 * load and reach nothing), and with no working close button, since closing it would end a start half
 * done. Not the window the app runs in; lockDown() isn't in place yet when it opens, and it has no links.
 */
function openPreparingWindow() {
  const window = new BrowserWindow({
    width: 420,
    height: 170,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    title: PREPARING_TITLE,
    backgroundColor: "#161619",
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  window.setMenu(null);
  void window.loadFile(path.join(root, "desktop", "preparing.html"));
  return window;
}

/** Says what went wrong in plain words, then quits — never a blank window. */
function fail(message, error) {
  if (error) console.error(error);
  if (quitting) return;
  quitting = true;
  // Before the message, so the preparing window can't stay behind it.
  preparing.close("start-up failed");
  // Into the log before the dialog: the dialog waits for a click, and the person may end the app
  // from the task manager instead. DotAmi's own message (it can name the data folder) and only the
  // error's name and code, as everywhere else in the log; a failed database update has already
  // written what the database objected to, in start().
  log?.write(`[desktop] stopped: ${message.replace(/\s*\n+\s*/g, " ")}${error ? ` (${describeError(error)})` : ""}\n`);
  dialog.showErrorBox("DotAmi", message);
  server?.kill();
  app.quit();
}
