// The desktop app ([7b]): the same DotAmi, in its own window, with the data on this computer.
//
// On launch: pick the data folder (the app's own folder, or DOTAMI_DATA_DIR) → bring the database
// file up to date with Prisma's own `migrate deploy` → start the self-contained Next.js server
// (built by desktop/build.mjs) on a free port bound to 127.0.0.1 → open a window on it.
// Nothing listens beyond this computer, and the window can't navigate anywhere else: outside
// links open in the person's own browser. Plan: docs/architecture/desktop-app.md.
import { spawn } from "node:child_process";
import { mkdirSync, accessSync, constants, createWriteStream, existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, dialog, Menu, session, shell, utilityProcess } from "electron";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = path.join(root, ".next-desktop", "standalone", "server.js");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const schema = path.join(root, "prisma", "schema.prisma");

app.setName("DotAmi");
// Tests (and anyone who wants their data elsewhere) point the app at another folder. Must be set
// before the single-instance lock, which is kept per data folder.
if (process.env.DOTAMI_DATA_DIR) app.setPath("userData", path.resolve(process.env.DOTAMI_DATA_DIR));

/** @type {BrowserWindow | null} */
let win = null;
/** @type {Electron.UtilityProcess | null} */
let server = null;
let quitting = false;

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
  const log = createWriteStream(path.join(logDir, "server.log"), { flags: "a" });
  log.write(`\n--- ${new Date().toISOString()} starting DotAmi ${app.getVersion()}\n`);

  // Prisma reads `file:` URLs with forward slashes on every system.
  const databaseUrl = `file:${dbFile.replace(/\\/g, "/")}`;

  // A fresh data folder gets its database here; an existing one gets any new migrations.
  const migrated = await run(prismaCli, ["migrate", "deploy", "--schema", schema], { DATABASE_URL: databaseUrl }, log);
  log.write(`[desktop] database setup finished with code ${migrated}\n`);
  if (migrated !== 0) {
    return fail(`DotAmi couldn't prepare its database:\n${dbFile}\n\nDetails are in ${path.join(logDir, "server.log")}.`);
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
}

/**
 * The server's environment: what Node needs to run, plus the app's own settings — and never a
 * model key from the shell it was started from. DotAmi ships no key; the person's model comes
 * from the app's settings once the Lens exists ([9a]).
 */
function serverEnv(own) {
  const env = { ...process.env, ...own, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
  delete env.ANTHROPIC_API_KEY;
  delete env.DOTAMI_DATA_DIR;
  return env;
}

/**
 * Runs a one-off Node script with Electron's own Node; resolves with its exit code. Output goes
 * to the log. A plain child process, not a utility process: a utility process stays alive after
 * its script finishes (seen 2026-10-05 — the Prisma CLI finished and `exit` never came).
 */
function run(script, args, extraEnv, log) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: root,
      windowsHide: true,
      // CHECKPOINT_DISABLE: without it the Prisma CLI reports to https://checkpoint.prisma.io on
      // each run (node_modules/prisma/build/index.js, checked 2026-10-05). The app sends nothing.
      env: { ...process.env, ...extraEnv, ELECTRON_RUN_AS_NODE: "1", CHECKPOINT_DISABLE: "1", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.on("error", (error) => {
      log.write(`[desktop] ${error}\n`);
      resolve(null);
    });
    child.on("exit", (code) => resolve(code));
  });
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
