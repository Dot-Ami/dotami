// The desktop app ([7b]): the same DotAmi, in its own window, with the data on this computer.
//
// On launch: pick the data folder (the app's own folder, or DOTAMI_DATA_DIR) → bring the database
// file up to date (desktop/migrate.mjs, Prisma's own migration files) → start the self-contained
// Next.js server (built by desktop/build.mjs) on a free port bound to 127.0.0.1 → open a window on
// it. Nothing listens beyond this computer, and the window can't navigate anywhere else: outside
// links open in the person's own browser. Plan: docs/architecture/desktop-app.md.
import { randomBytes } from "node:crypto";
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
  RECEIPT_EXTENSIONS,
  RECEIPTS_FOLDER,
  restoreReceiptsNote,
  writeBackup,
} from "./backup.mjs";
import { DATABASE_KEY_FILE, makeDatabaseKey, openDatabaseKey, setAsideLockedFileUnderNewKey } from "./database-key.mjs";
import { encryptFile, EncryptionStopped, plainLeftovers, readNote, resumeEncryption } from "./encrypt-database.mjs";
import { describeError, openLog } from "./log.mjs";
import { migrate, MigrationRefused, vacuumFile } from "./migrate.mjs";
import { PREPARING_TITLE, preparingWindow, waitShowingWindow } from "./preparing.mjs";
import { encryptReceiptsIn, keyIdOf } from "./receipt-crypto.mjs";
import { newReceiptKey, openReceiptKey, RECEIPT_KEY_FILE, receiptLockEnv, restartForNewKey, revertReceiptKey, saveReceiptKey } from "./receipt-key.mjs";
import { CannotOpenDatabase, FileNotReadable, fileKind, openDatabase, useSqliteFrom } from "./sqlite.mjs";
import { showUpdateProgress } from "./update-notice.mjs";
import { finishPendingWipe, SAFETY_COPY_NAME } from "./wipe-pending.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Installed: the server ships as its own folder beside the app (desktop/package.mjs); from a
// checkout, it's desktop/build.mjs's output.
const serverEntry = app.isPackaged
  ? path.join(process.resourcesPath, "server", "server.js")
  : path.join(root, ".next-desktop", "standalone", "server.js");
const migrations = path.join(root, "prisma", "migrations");
/** A receipt file DotAmi named: 32 random hex characters and one of its receipt types' extensions (backup.mjs). */
const RECEIPT_FILE_NAME = new RegExp(`^[0-9a-f]{32}\\.(${Object.values(RECEIPT_EXTENSIONS).join("|")})$`);

app.setName("DotAmi");
// Tests (and anyone who wants their data elsewhere) point the app at another folder. Must be set
// before the single-instance lock, which is kept per data folder.
if (process.env.DOTAMI_DATA_DIR) app.setPath("userData", path.resolve(process.env.DOTAMI_DATA_DIR));

/** @type {BrowserWindow | null} */
let win = null;
/** @type {Electron.UtilityProcess | null} */
let server = null;
let quitting = false;
/**
 * [8i] True until the main window exists. The windows shown before it (the one before the first
 * encryption, the backup passphrase it can open) close on their own, and closing the last window must
 * not quit the app while it is still starting.
 */
let starting = true;
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
 * [8i] The data file's key (desktop/database-key.mjs) when the file is encrypted, else null; and what the
 * server is told about it (lib/db/lock.ts): "on", "off" (the person said Not now), "never", or
 * "no-key-store", with how many plain copies are still on the disk. The key is never written anywhere but
 * database.key, wrapped.
 * @type {Buffer | null}
 */
let databaseKey = null;
/** @type {{ state: "on" | "off" | "never" | "no-key-store", plainLeft: number }} */
let databaseLock = { state: "no-key-store", plainLeft: 0 };
/** The setting a "Never" answer saves once the file is migrated (the Setting table may not exist before). */
let neverChosen = false;
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
// already under way: closing that last window mustn't quit again under the message. [8i] Nor while
// the app is still starting: the windows before the main one close on their own.
app.on("window-all-closed", () => {
  if (!quitting && !starting) app.quit();
});
app.on("before-quit", () => {
  quitting = true;
  server?.kill();
});

// [8i] HEIC receipts are drawn by the graphics chip, through Chromium's video decoder (option D of
// docs/connectors/heic-decoder-review.md). Chromium gives its graphics process three crashes in a short
// window before it switches hardware graphics off for the rest of the session, so DotAmi never lets a
// HEIC near the graphics chip twice in a row of trouble: once the graphics process has stopped for any
// reason, or the page reports a HEIC that failed, no HEIC is drawn again until DotAmi restarts. The
// page asks through desktop/window-preload.cjs (lib/expenses/receipts/viewer/heic-session.ts).
let heicStopped = false;
app.on("child-process-gone", (_event, details) => {
  if (details.type !== "GPU") return;
  if (!heicStopped) log?.write(`[desktop] the graphics process stopped (${details.reason}); HEIC receipts won't be drawn until DotAmi restarts\n`);
  heicStopped = true;
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
  // [8i] The main process opens the data file with the same SQLite package as the server, from the
  // server's own folder (desktop/sqlite.mjs): the installed app keeps it only there.
  useSqliteFrom(path.dirname(serverEntry));

  // [8i] The receipts' key, opened first so a backup made from the window below carries the receipts
  // (docs/architecture/expense-records.md § 9). Before the server starts, so nothing else has the files
  // open. The log gets counts only.
  try {
    // On the very first start of a data folder this waits (about ten seconds) for Windows' own key to
    // reach the disk, so a crash can never leave a receipts key nothing can open (receipt-key.mjs); the
    // preparing window is on the screen meanwhile (preparing.mjs), and only then.
    receiptKey = await openReceiptKey(dataDir, safeStorage, { keyStoreSaved: waitShowingWindow(dataDir, preparing) });
  } catch (error) {
    return fail(`DotAmi couldn't prepare the key that encrypts your receipts, in:\n${dataDir}\n\nNothing was changed. Details are in ${path.join(logDir, "server.log")}.`, error);
  }
  log.write(`[desktop] receipts: ${describeReceiptKey(receiptKey)}\n`);

  // [8i] The data file's key, and encrypting the file when it is new or the person says so
  // (docs/architecture/database-encryption.md § 6). Stops the start, having changed nothing, when the
  // key can't be opened or the files are in a state DotAmi didn't leave them in.
  try {
    if (!(await prepareDatabase())) return;
  } catch (error) {
    // The data file (or the note's file) is there but another program holds it: never taken for a new
    // folder, so nothing was made or changed (desktop/sqlite.mjs fileKind).
    if (error instanceof FileNotReadable) return fail(error.message);
    throw error;
  }

  // A Delete whose wipe couldn't finish (the computer was busy, the disk full, or it was switched
  // off part-way) left a "wipe pending" note beside the data file: finish it now, before the server
  // opens the file. Only then — an ordinary start, with no note, does nothing here: free space in
  // the file is normal after any edit, and rebuilding it on every start would only slow it down.
  // It never stops the start: what still can't be done stays owed for the next one.
  const wipe = finishPendingWipe(dbFile, { vacuum: (file) => vacuumFile(file, databaseKey), log: (line) => log.write(`${line}\n`) });
  if (wipe.ran) log.write(`[desktop] wipe-pending note ${wipe.wiped && wipe.backupsLeft.length === 0 && wipe.receiptFoldersLeft.length === 0 ? "cleared" : "kept for the next start"}\n`);

  // A fresh data folder gets its database here; an existing one gets any new migrations, after a
  // backup copy in backups/. A database from a newer DotAmi, or a half-done update, is refused
  // untouched (the one exception is the owed wipe just above: when a "wipe pending" note was there,
  // the file has already been rebuilt, with the same contents, before these checks run).
  try {
    const { applied, backup } = migrate(dbFile, migrations, { log: (line) => log.write(`${line}\n`), key: databaseKey });
    log.write(`[desktop] database ready (${applied.length} update(s) applied${backup ? `, backup ${backup}` : ""})\n`);
  } catch (error) {
    if (error instanceof MigrationRefused) return fail(error.message);
    // The one error whose words the log keeps: which update failed and what the database objected
    // to (a table or a column), which is what a failed update needs to be fixed. The privacy
    // inventory's entry for the log says so.
    log.write(`[desktop] ${error}\n`);
    return fail(`DotAmi couldn't prepare its database:\n${dbFile}\n\nNothing was changed. Details are in ${path.join(logDir, "server.log")}.`, error);
  }

  // [8i] "Never" from the window: saved now that the file has its Setting table (Settings can turn it back on).
  if (neverChosen) saveEncryptionChoice(false);

  // [8i] Any receipt file not encrypted yet (docs/architecture/expense-records.md § 9).
  if (receiptKey.state === "on") encryptExistingReceipts(receiptKey.key);

  const port = await freePort();
  server = utilityProcess.fork(serverEntry, [], {
    cwd: path.dirname(serverEntry),
    stdio: "pipe",
    serviceName: "DotAmi server",
    env: serverEnv({ PORT: String(port), HOSTNAME: "127.0.0.1", DATABASE_URL: databaseUrl, ...receiptLockEnv(receiptKey), ...databaseLockEnv() }),
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
  answerWindowCalls(origin);

  starting = false;
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 520,
    title: "DotAmi",
    backgroundColor: "#161619",
    show: false,
    // The preload gives DotAmi's pages three calls and nothing else (desktop/window-preload.cjs: two
    // about HEIC, one to restart after Start a new key); the window stays sandboxed and isolated. No window here may turn its sandbox off, and no command-line
    // switch may turn off Chromium's sandboxes or run the graphics process inside the browser process
    // (tests/desktop-sandbox.spec.ts lists the switches and fails if one appears).
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(root, "desktop", "window-preload.cjs") },
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
 * the desktop app always runs with the real limits (lib/api/rate-limit.ts, E2E_RATE_LIMITS_ENV). Nor
 * DEBUG, which would make the database library print query values into the log.
 */
function serverEnv(own) {
  // DOTAMI_UPDATES tells the settings page what this copy does about updates (lib/settings/today.ts).
  // DOTAMI_DESKTOP tells it this is the desktop app, which has Back up and Restore in its File menu.
  const updates = updatesOn ? "github" : "";
  // A receipt key never comes from the shell either: only the one this app opened (receiptLockEnv).
  // Nor the data file's key, nor what the server is told about it ([8i]).
  const { DOTAMI_RECEIPT_KEY: _fromShell, DOTAMI_DATABASE_KEY: _dbKey, DOTAMI_DATABASE_LOCK: _dbLock, DOTAMI_DATABASE_PLAIN_LEFT: _dbLeft, ...inherited } = process.env;
  void _fromShell;
  void _dbKey;
  void _dbLock;
  void _dbLeft;
  const env = { ...inherited, ...own, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", DOTAMI_UPDATES: updates, DOTAMI_DESKTOP: "1" };
  delete env.ANTHROPIC_API_KEY;
  delete env.DOTAMI_DATA_DIR;
  delete env.DOTAMI_E2E_RATE_LIMITS;
  // [8i] The database adapter prints every query with its values when DEBUG names it, and the server's
  // output goes into logs/server.log (docs/architecture/database-encryption.md § 3).
  delete env.DEBUG;
  return env;
}

/**
 * [8i] What the server is told about the data file (lib/db/lock.ts reads it): the state, the key only when
 * it is "on", and how many plain copies are still on the disk. The server takes the key out of its
 * environment the first time it reads it.
 */
function databaseLockEnv() {
  const env = { DOTAMI_DATABASE_LOCK: databaseLock.state, DOTAMI_DATABASE_PLAIN_LEFT: String(databaseLock.plainLeft) };
  if (databaseLock.state === "on" && databaseKey) env.DOTAMI_DATABASE_KEY = databaseKey.toString("base64");
  return env;
}

/** The data file's safety copies in backups/ (DotAmi's own names only) and a leftover restore staging file. */
function safetyCopyFiles() {
  const files = [];
  const backups = path.join(dataDir, "backups");
  try {
    for (const e of readdirSync(backups, { withFileTypes: true })) {
      if (e.isFile() && SAFETY_COPY_NAME.test(e.name)) files.push(path.join(backups, e.name));
    }
  } catch {
    // No backups folder yet.
  }
  const staging = path.join(dataDir, "restore-staging.db");
  if (existsSync(staging)) files.push(staging);
  return files;
}

/**
 * [8i] Opens the data file's key and decides, before the migrator or the server touches the file, whether
 * it is (or becomes) encrypted (docs/architecture/database-encryption.md § 6 and § 10):
 * - an encryption a crash left part-way is finished first;
 * - an encrypted file: its key must open, or the start stops having changed nothing (showLostKey);
 * - a new data folder: a key is made and the migrator creates the file encrypted from its first byte;
 * - an existing plain file: unless the person said "Never" (the setting), the window asks first, with
 *   Back up first…, Encrypt now, Not now and Never;
 * - no key store: the file stays plain, and Settings says why.
 * Then the plain safety copies are encrypted too. Returns false when the start must stop (it has said why).
 */
async function prepareDatabase() {
  const say = (line) => log.write(`[database] ${line}\n`);
  const copies = safetyCopyFiles();
  // A safety copy another program holds counts as not locked here (it is tried again at the next start);
  // the data file itself is never guessed at: fileKind throws, and the start stops having changed nothing.
  const copyKind = (f) => {
    try {
      return fileKind(f);
    } catch (error) {
      if (error instanceof FileNotReadable) return "held";
      throw error;
    }
  };
  const locked = fileKind(dbFile) === "encrypted" || copies.some((f) => copyKind(f) === "encrypted") || readNote(dataDir) !== null;
  const opened = openDatabaseKey(dataDir, safeStorage, { locked });
  if (opened.state === "key-unreadable") {
    say(
      opened.storeUnavailable
        ? "the key store isn't available right now; nothing was changed"
        : opened.missing
          ? "the key file is missing; nothing was changed"
          : "the key can't be opened by this account; nothing was changed",
    );
    await showLostKey(opened);
    return false;
  }
  let key = opened.state === "on" ? opened.key : null;
  try {
    const resumed = resumeEncryption(dataDir, key, { log: say });
    if (resumed.action !== "none") say(`an encryption left part-way: ${resumed.action}${resumed.wipePending ? " (the plain copy's wipe is still owed)" : ""}`);
  } catch (error) {
    if (error instanceof EncryptionStopped) {
      fail(error.message);
      return false;
    }
    throw error;
  }

  const kind = fileKind(dbFile);
  if (kind === "encrypted") {
    // The key file opened, but is it this file's key? One that holds another key (put back from another
    // folder, or saved by a restore that couldn't finish) is the lost-key case, not a failed update.
    if (!key || !opensWith(dbFile, key)) {
      say("the key file opens, but holds another key; nothing was changed");
      await showLostKey({ state: "key-unreadable", keyId: opened.state === "on" ? opened.keyId : null, missing: false, wrongKey: true });
      return false;
    }
    databaseKey = key;
    databaseLock = { state: "on", plainLeft: 0 };
    say("the data file is encrypted; key open");
  } else if (opened.state === "no-key-store") {
    databaseLock = { state: "no-key-store", plainLeft: 0 };
    say("the operating system's key store isn't available, so the data file is kept unencrypted");
    return true;
  } else if (kind === "absent") {
    // A new data file: created encrypted from its first byte by the migrator. A key that already opens is
    // kept, never replaced: encrypted safety copies (or the data file, put back) may be locked with it
    // (desktop/database-key.mjs: never replaced automatically once anything is encrypted with it).
    key ??= await newDatabaseKey(say);
    if (!key) return true;
    databaseKey = key;
    databaseLock = { state: "on", plainLeft: 0 };
    say("a new data file, encrypted from its first byte");
    return true;
  } else {
    // An existing plain file: asked first, unless the person said "Never".
    if (!readEncryptionChoice()) {
      databaseLock = { state: "never", plainLeft: 0 };
      say("kept unencrypted: the person chose Never (Settings can turn it on)");
      return true;
    }
    const answer = await askToEncrypt();
    say(`the window before encrypting was shown; the answer: ${answer}`);
    if (answer === "not-now" || answer === "never") {
      neverChosen = answer === "never";
      databaseLock = { state: answer === "never" ? "never" : "off", plainLeft: 0 };
      return true;
    }
    key ??= await newDatabaseKey(say);
    if (!key) return true;
    try {
      const done = encryptFile(dataDir, dbFile, key, { log: say });
      databaseKey = key;
      databaseLock = { state: "on", plainLeft: done.wipePending ? 1 : 0 };
      say(`the data file is encrypted${done.wipePending ? "; the plain copy's wipe is owed" : ""}`);
      // What an earlier version let Chromium cache (pages and answers holding the data in plain text) is
      // cleared once, now; from now on nothing is cached (lockDown).
      await session.defaultSession.clearCache();
      say("the window's cache was cleared");
    } catch (error) {
      if (!(error instanceof EncryptionStopped)) throw error;
      if (error.kind === "busy" || error.kind === "pending") {
        // Nothing moved (another program holds the file, or an earlier plain copy's wipe is still owed):
        // carry on unencrypted, and ask again at the next start.
        say(error.kind === "busy" ? "the data file was busy; kept unencrypted for now" : "an earlier wipe is still owed; kept unencrypted for now");
        databaseLock = { state: "off", plainLeft: 0 };
        await dialog.showMessageBox({ type: "info", title: "DotAmi", message: "Your data file wasn't encrypted this time.", detail: error.message });
        return true;
      }
      fail(error.message);
      return false;
    }
  }

  // The plain safety copies (made before updates and restores) are encrypted the same way, one by one; one
  // another program holds stays as it is, still restorable, and is tried again at the next start. Only one
  // file is encrypted at a time: while a plain copy's wipe is owed, encryptFile refuses ("pending"), so the
  // note that names it is never replaced and the copy is never forgotten.
  let notYet = 0;
  for (const file of copies.filter((f) => existsSync(f) && ["plain", "held"].includes(copyKind(f)))) {
    try {
      if (copyKind(file) === "held") throw new EncryptionStopped("busy", "held");
      encryptFile(dataDir, file, databaseKey, { log: say });
    } catch (error) {
      notYet += 1;
      say(`a safety copy couldn't be encrypted yet (${error instanceof EncryptionStopped ? error.kind : describeError(error)})`);
    }
  }
  // What is still plain on the disk: the copies not encrypted yet, and every plain copy whose wipe is owed
  // (the data file's and the safety copies'), counted from the disk itself.
  const left = notYet + plainLeftovers(dataDir).filter((f) => !f.endsWith("-journal")).length;
  databaseLock = { state: "on", plainLeft: left };
  if (left > 0) say(`${left} plain cop${left === 1 ? "y" : "ies"} still on the disk; tried again at the next start`);
  return true;
}

/** Whether the encrypted file opens with `key` (read-only; nothing is written). */
function opensWith(file, key) {
  try {
    openDatabase(file, { key, readonly: true, fileMustExist: true }).close();
    return true;
  } catch (error) {
    if (error instanceof CannotOpenDatabase) return false;
    throw error;
  }
}

/**
 * A new key for the data file, saved wrapped and read back (desktop/database-key.mjs), or null when this
 * computer has no key store that can keep it (the file then stays plain, and Settings says so).
 */
async function newDatabaseKey(say) {
  try {
    // The receipts' key was opened first, so Windows' own key is on the disk by now; the preparing window
    // shows only if it still has to wait.
    const made = await makeDatabaseKey(dataDir, safeStorage, { keyStoreSaved: waitShowingWindow(dataDir, preparing) });
    say(`a key was made${made.setAside ? "; a key file this account couldn't open was moved to the backups folder" : ""}`);
    return made.key;
  } catch (error) {
    say(`no key could be made (${describeError(error)}); the data file is kept unencrypted`);
    databaseLock = { state: "no-key-store", plainLeft: 0 };
    return null;
  }
}

/**
 * [8i] Whether the person still wants the data file encrypted: false only after "Never" (the
 * "database-encryption" setting, saved as {"on":false}; lib/settings/values.ts). Read from the plain
 * file itself; a file without the Setting table yet, or no row, means yes.
 */
function readEncryptionChoice() {
  let db;
  try {
    db = openDatabase(dbFile, { readonly: true, fileMustExist: true });
    const row = db.prepare(`SELECT value FROM "Setting" WHERE key = 'database-encryption'`).get();
    if (!row) return true;
    return JSON.parse(row.value)?.on !== false;
  } catch {
    return true;
  } finally {
    db?.close();
  }
}

/** Saves the "database-encryption" setting, as the settings store writes it (lib/settings/store.ts). */
function saveEncryptionChoice(on) {
  let db;
  try {
    db = openDatabase(dbFile, { key: databaseKey });
    db.prepare(`INSERT INTO "Setting" (key, value, updatedAt) VALUES ('database-encryption', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`).run(
      JSON.stringify({ on }),
      Date.now(),
    );
  } catch (error) {
    log?.write(`[database] the answer couldn't be saved (${describeError(error)}); the window asks again at the next start\n`);
  } finally {
    db?.close();
  }
}

/**
 * [8i] One of the start-up windows (desktop/encrypt-ask.html, desktop/lost-key.html): a local page that can
 * send back only one of `answers` (desktop/choice-preload.cjs, checked again here). Closing it answers
 * `closed`. Resolves with the answer.
 * @param {"encrypt-ask" | "lost-key"} which
 * @param {readonly string[]} answers
 * @param {string} closed
 * @param {{ status?: string, detail?: string, height?: number }} [options]
 */
function askInWindow(which, answers, closed, { status = "", detail = "", height = 600 } = {}) {
  // The "Preparing DotAmi…" window, if a first start showed it, has nothing more to wait for.
  preparing.close("a question before the main window");
  return new Promise((resolve) => {
    const ask = new BrowserWindow({
      width: 620,
      height,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: "DotAmi",
      backgroundColor: "#161619",
      webPreferences: { preload: path.join(root, "desktop", "choice-preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    ask.setMenu(null);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener("dotami-choice", onAnswer);
      if (!ask.isDestroyed()) ask.close();
      resolve(value);
    };
    const onAnswer = (event, message) => {
      // Only this window's own page, and only one of its answers, is believed (Electron security checklist #17).
      if (event.sender !== ask.webContents || message?.which !== which) return;
      finish(answers.includes(message?.answer) ? message.answer : closed);
    };
    ipcMain.on("dotami-choice", onAnswer);
    ask.on("closed", () => finish(closed));
    void ask.loadFile(path.join(root, "desktop", `${which}.html`), { query: { which, status, detail } });
  });
}

/**
 * [8i] The window before an existing data file is first encrypted (desktop/encrypt-ask.html): what it
 * protects and what it doesn't, what a lost key costs, and four answers. "Back up first…" runs File →
 * Back up… on the still-plain file and comes back here. Closing the window counts as "Not now".
 * Resolves with "encrypt", "not-now" or "never".
 */
async function askToEncrypt() {
  let status = "";
  for (;;) {
    const answer = await askInWindow("encrypt-ask", ["encrypt", "backup", "not-now", "never"], "not-now", { status });
    if (answer !== "backup") return answer;
    const made = await backUp();
    status = made ? `Backed up to ${made}. Keep it somewhere other than this computer.` : "No backup was made.";
  }
}

/**
 * [8i] The start when the data file is encrypted and its key can't be opened (§ 10): nothing on the disk is
 * changed, and the person is told what happened and what can bring the data back (desktop/lost-key.html),
 * before the main window opens. Then the app quits.
 */
async function showLostKey(opened) {
  const why = opened.storeUnavailable
    ? "Windows' key store isn't available right now. Restart Windows (or sign out and in again), then start DotAmi again."
    : opened.missing
      ? `The key file (${DATABASE_KEY_FILE}, beside the data file) is missing.`
      : opened.wrongKey
        ? `The key file (${DATABASE_KEY_FILE}, beside the data file) opens, but holds another key, not this data file's.`
        : "Windows won't open its key for this Windows account, or the key file holds another key.";
  // While Windows' key store is only unavailable for now, a restart may bring the key back: nothing that sets
  // the locked file aside is offered, and the answer is refused here too.
  const answers = opened.storeUnavailable ? ["quit", "open-folder"] : ["quit", "open-folder", "restore"];
  const status = opened.storeUnavailable ? "store-unavailable" : "";
  for (;;) {
    const answer = await askInWindow("lost-key", answers, "quit", { detail: why, status, height: 460 });
    if (answer === "open-folder") {
      await shell.openPath(dataDir);
      continue;
    }
    // Restore relaunches the app when it has replaced the data; otherwise (cancelled) the window comes back.
    if (answer === "restore") {
      await restore({ databaseKeyLost: true });
      continue;
    }
    break;
  }
  quitting = true;
  app.quit();
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
 * The three calls the page may make (desktop/window-preload.cjs). Each is believed only from DotAmi's
 * own window showing one of its own pages (Electron security checklist #17).
 *   - The two HEIC questions: "may I still draw a HEIC?" and "a HEIC just failed". Anything else asking
 *     is told HEIC is stopped, and anything else reporting a failure is ignored.
 *   - The restart after Start a new key ([8i], docs/architecture/expense-records.md § 11): the page asks
 *     once the server has moved the locked receipts aside, and restartForNewKey (receipt-key.mjs)
 *     decides from what this process knows: this start's key, the receipts folder on the disk, whether
 *     the app is already quitting. Anything else asking is refused, and nothing restarts.
 */
function answerWindowCalls(origin) {
  const fromDotAmi = (event) => {
    if (!win || event.sender !== win.webContents) return false;
    try {
      return new URL(event.senderFrame?.url ?? "").origin === origin;
    } catch {
      return false;
    }
  };
  ipcMain.handle("dotami-heic-stopped", (event) => (fromDotAmi(event) ? heicStopped : true));
  ipcMain.on("dotami-heic-failed", (event) => {
    if (!fromDotAmi(event)) return;
    if (!heicStopped) log?.write(`[desktop] a HEIC receipt couldn't be drawn; HEIC receipts won't be drawn until DotAmi restarts\n`);
    heicStopped = true;
  });
  ipcMain.handle("dotami-restart-for-new-key", (event) =>
    restartForNewKey(dataDir, {
      fromDotAmi: fromDotAmi(event),
      opened: receiptKey,
      quitting,
      relaunch: () => app.relaunch(),
      // Like a restore: the server has the data file open, so it is stopped and waited for first, with
      // `quitting` set so its exit isn't taken for a failure.
      stopServer: async () => {
        quitting = true;
        if (!server) return;
        const stopped = new Promise((resolve) => server.once("exit", resolve));
        server.kill();
        await stopped;
      },
      exit: (code) => app.exit(code),
      log: (line) => log?.write(`${line}\n`),
    }),
  );
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
 * with a passphrase the person chooses (desktop/backup.mjs). [8i] The passphrase is required (the
 * maintainer's decision of 2026-10-10): the window refuses an empty one and so does writeBackup. Meant
 * to be kept somewhere other than this computer.
 */
async function backUp() {
  const passphrase = await askPassphrase("backup");
  if (passphrase === null || passphrase === "") return null;
  const day = new Date().toLocaleDateString("en-CA");
  const { canceled, filePath } = await dialog.showSaveDialog(win ?? undefined, {
    title: "Back up DotAmi",
    defaultPath: path.join(app.getPath("documents"), `DotAmi backup ${day}.${BACKUP_EXTENSION}`),
    filters: [{ name: "DotAmi backup", extensions: [BACKUP_EXTENSION] }],
  });
  if (canceled || !filePath) return null;
  try {
    // [8i] Receipts go in as their own bytes, decrypted with this computer's key, so the backup restores
    // on a computer whose key differs (expense-records.md § 9).
    const key = receiptKey?.state === "on" ? receiptKey.key : null;
    const { encrypted, receipts, missingReceipts, unreadableReceipts } = writeBackup(dbFile, filePath, {
      passphrase,
      appVersion: app.getVersion(),
      receiptKey: key,
      // [8i] The data file goes in decrypted, rebuilt in memory, so the backup restores anywhere.
      databaseKey,
    });
    log?.write(
      `[backup] wrote ${filePath} (${encrypted ? "locked" : "not locked"}; ${receipts} receipt files, ${missingReceipts} missing, ${unreadableReceipts} couldn't be opened)\n`,
    );
    await dialog.showMessageBox(win ?? undefined, {
      type: "info",
      title: "Backed up",
      message: `Backed up to ${filePath}`,
      detail:
        "It's locked with your passphrase: without it, nobody can open it, and nobody can recover the passphrase. " +
        backupReceiptsNote(receipts, missingReceipts, { unreadable: unreadableReceipts, locked: encrypted }) +
        (key && receipts > 0
          ? "Your receipts here are encrypted with a key Windows keeps for your account: if that key is ever lost (a Windows profile reset), a backup is how they come back. "
          : "") +
        "Keep a copy somewhere other than this computer. To protect the data that stays here, turn on your computer's disk encryption (see Settings → Data and backups).",
    });
    return filePath;
  } catch (error) {
    log?.write(`[backup] failed: ${error}\n`);
    await dialog.showMessageBox(win ?? undefined, { type: "error", title: "Backup failed", message: "DotAmi couldn't write the backup.", detail: String(error?.message ?? error) });
    return null;
  }
}

/**
 * File → Restore from a backup…: everything is checked on a temporary copy first — the
 * passphrase, that the file is whole, that a newer DotAmi didn't make it — and only then, after
 * the person confirms, the current data is copied to backups/ and replaced. The app restarts so
 * the database opens fresh (and an older backup is upgraded by desktop/migrate.mjs).
 */
/**
 * @param {{ databaseKeyLost?: boolean }} [options] `databaseKeyLost` ([8i]): from the lost-key window, the
 * data file here is encrypted with a key that can't be opened. The backup is then staged under a new key,
 * and once the person confirms, the locked data file and its key file go to backups/ (never deleted) and
 * the new key is saved before the restore is put in place (database-encryption.md § 10).
 */
async function restore({ databaseKeyLost = false } = {}) {
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
  // [8i] The key the restored data file is staged under: this computer's own, or, when it is lost, a new
  // one, kept in memory and saved only once the person confirms.
  const stagingKey = databaseKeyLost ? randomBytes(32) : databaseKey;
  let passphrase = "";
  let header;
  let receipts = 0;
  for (;;) {
    try {
      // [8i] The restored data file is staged encrypted with this computer's key when the file here is.
      ({ header, receipts } = prepareRestore(filePaths[0], { passphrase, migrationsDir: migrations, stagingFile: staging, receiptKey: restoreKey, databaseKey: stagingKey }));
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
      `The backup was made ${new Date(header.createdAt).toLocaleString()} by DotAmi ${header.appVersion}. ` +
      (databaseKeyLost
        ? "The data file here, which can't be opened, and its key file go to the backups folder as they are, never deleted, and the restored data gets a new key."
        : "A safety copy of what's here now goes to the backups folder first.") +
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
  if (databaseKeyLost) {
    // [8i] The locked data file into backups/ first (never deleted), then the new key (the old key file goes
    // there too); only then the restore. In that order so a failure never leaves a new key beside the old
    // locked file: a move that fails changes nothing, and a key that can't be saved puts the file back
    // (desktop/database-key.mjs setAsideLockedFileUnderNewKey).
    try {
      const { lockedTo, keySetAside } = await setAsideLockedFileUnderNewKey(dataDir, dbFile, safeStorage, stagingKey);
      log?.write(`[restore] the locked data file and its key went to the backups folder${keySetAside || lockedTo ? "" : " (there were none)"}; a new key for the data file was saved\n`);
    } catch (error) {
      log?.write(`[restore] the locked data file couldn't be set aside under a new key (step: ${error?.step ?? "?"}): ${describeError(error)}\n`);
      discardRestore(staging);
      dialog.showErrorBox(
        "DotAmi",
        error?.step === "set-aside"
          ? `The restore didn't happen: DotAmi couldn't move the locked data file into the backups folder (${error?.code ?? "error"}; another program may have it open). Nothing was changed. DotAmi will restart.`
          : "The restore didn't happen: DotAmi couldn't save a new key for your data, so the locked data file was put back where it was. Nothing was changed. DotAmi will restart.",
      );
      app.relaunch();
      app.exit(0);
      return;
    }
    databaseKey = stagingKey;
  }
  try {
    const { safetyCopy, receiptsMovedTo, receiptsRestored } = applyRestore(staging, dbFile, { backupDir: path.join(dataDir, "backups"), databaseKey });
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
    return readdirSync(path.join(folder, RECEIPTS_FOLDER)).filter((name) => RECEIPT_FILE_NAME.test(name)).length;
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
