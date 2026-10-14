/**
 * When the installed app asks GitHub for a newer version, and what a failed check leaves in the log
 * (desktop/update-check.mjs, wired by desktop/main.mjs).
 *
 * The maintainer, 2026-10-08: "I would like it to appear right as the app opens (if possible)"; and
 * 2026-10-13: "the update sign is still taking too long to pop up after the app is opened. nearly
 * 15-20 seconds". Until this change the check started only after the server had started and the whole
 * first page had loaded (`await win.loadURL(origin)`, then `checkForUpdates(false)`). Now it starts as
 * soon as the log is open, before the server, and what it finds waits for the main window
 * (tests/desktop-update-notice.spec.ts covers the waiting).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { checkForUpdates, mainWindowGate } from "../desktop/update-check.mjs";

const root = path.join(__dirname, "..");

type Box = { type?: string; title?: string; message: string; detail?: string };

function fakeDialog() {
  const shown: Box[] = [];
  return { shown, dialog: { showMessageBox: (options: Box) => (shown.push(options), Promise.resolve({ response: 0 })) } };
}

describe("checkForUpdates", () => {
  it("asks the updater straight away, with no window, server or page needed", async () => {
    let asked = 0;
    const { shown, dialog } = fakeDialog();
    const lines: string[] = [];
    await checkForUpdates({
      on: true,
      byHand: false,
      loadUpdater: async () => ({ checkForUpdates: async () => (asked++, { isUpdateAvailable: false }) }),
      dialog,
      log: (line) => lines.push(line),
      version: "0.4.0",
    });
    expect(asked).toBe(1);
    // The check at start says nothing when there's nothing new.
    expect(shown).toEqual([]);
    expect(lines).toEqual([]);
  });

  it("a failed check logs the error's name and code only, never its message (which can name folders on this computer)", async () => {
    const folder = "C:\\Users\\someone-4417\\AppData\\Local\\dotami-updater";
    const error = Object.assign(new Error(`ENOTFOUND github.com while writing ${folder}\\pending`), { code: "ENOTFOUND" });
    const lines: string[] = [];
    const { shown, dialog } = fakeDialog();
    await checkForUpdates({
      on: true,
      byHand: false,
      loadUpdater: async () => ({ checkForUpdates: () => Promise.reject(error) }),
      dialog,
      log: (line) => lines.push(line),
      version: "0.4.0",
    });
    expect(lines).toEqual(["[update] check failed (Error, ENOTFOUND)"]);
    expect(lines.join("")).not.toContain("someone-4417");
    expect(lines.join("")).not.toContain("github.com");
    // At start a failed check is only a log line; the person didn't ask.
    expect(shown).toEqual([]);
  });

  it("a failed load of the updater itself is logged the same way", async () => {
    const lines: string[] = [];
    const { dialog } = fakeDialog();
    await checkForUpdates({
      on: true,
      byHand: false,
      loadUpdater: () => Promise.reject(Object.assign(new TypeError("Cannot find module C:\\Users\\someone-4417\\x"), { code: "ERR_MODULE_NOT_FOUND" })),
      dialog,
      log: (line) => lines.push(line),
      version: "0.4.0",
    });
    expect(lines).toEqual(["[update] check failed (TypeError, ERR_MODULE_NOT_FOUND)"]);
  });

  it("Help → Check for updates still says what it found, or that it couldn't check", async () => {
    const latest = fakeDialog();
    await checkForUpdates({
      on: true,
      byHand: true,
      loadUpdater: async () => ({ checkForUpdates: async () => ({ isUpdateAvailable: false }) }),
      dialog: latest.dialog,
      log: () => {},
      version: "0.4.0",
    });
    expect(latest.shown.map((b) => b.message)).toEqual(["You have the latest version (0.4.0)."]);

    const failed = fakeDialog();
    await checkForUpdates({
      on: true,
      byHand: true,
      loadUpdater: async () => ({ checkForUpdates: () => Promise.reject(new Error("offline")) }),
      dialog: failed.dialog,
      log: () => {},
      version: "0.4.0",
    });
    expect(failed.shown.map((b) => b.message)).toEqual(["DotAmi couldn't check for updates right now."]);
  });

  it("a copy run from source never loads the updater; asked by hand, it says it updates with git", async () => {
    let loaded = 0;
    const quiet = fakeDialog();
    await checkForUpdates({ on: false, byHand: false, loadUpdater: async () => (loaded++, { checkForUpdates: async () => null }), dialog: quiet.dialog, log: () => {}, version: "0.4.0" });
    expect(quiet.shown).toEqual([]);
    const asked = fakeDialog();
    await checkForUpdates({ on: false, byHand: true, loadUpdater: async () => (loaded++, { checkForUpdates: async () => null }), dialog: asked.dialog, log: () => {}, version: "0.4.0" });
    expect(asked.shown.map((b) => b.message)).toEqual(["This copy runs from DotAmi's source code."]);
    expect(loaded).toBe(0);
  });
});

describe("mainWindowGate", () => {
  it("holds what arrives before the main window shows, runs it once when it shows, and runs later things at once", () => {
    const gate = mainWindowGate();
    const ran: string[] = [];
    gate.whenShown(() => ran.push("early"));
    expect(ran).toEqual([]);
    gate.open();
    expect(ran).toEqual(["early"]);
    gate.open();
    expect(ran).toEqual(["early"]);
    gate.whenShown(() => ran.push("late"));
    expect(ran).toEqual(["early", "late"]);
  });
});

// desktop/main.mjs decides the order. These read its source; the order can't be driven without
// starting Electron, and the desktop tests switch the update check off (DOTAMI_NO_UPDATE_CHECK).
describe("how desktop/main.mjs starts the check", () => {
  const main = readFileSync(path.join(root, "desktop", "main.mjs"), "utf8");
  const start = main.slice(main.indexOf("async function start("), main.indexOf("\n}\n", main.indexOf("async function start(")));

  it("starts the check before the start-up windows, the server and the first page load, right after the log opens", () => {
    const at = start.indexOf("checkForUpdates(false)");
    expect(at, "start() no longer starts the update check").toBeGreaterThan(-1);
    expect(at).toBeGreaterThan(start.indexOf("log = openLog("));
    for (const later of ["openReceiptKey(", "prepareDatabase(", "migrate(dbFile", "utilityProcess.fork(", "waitForServer(", "loadURL("]) {
      expect(start.indexOf(later), `start() has no ${later}`).toBeGreaterThan(-1);
      expect(at, `the check should start before ${later}`).toBeLessThan(start.indexOf(later));
    }
    // Once only: nothing after the page load starts a second check.
    expect(start.indexOf("checkForUpdates(false)", at + 1)).toBe(-1);
  });

  it("lets what the check found show only once the main window is on the screen", () => {
    const ready = start.slice(start.indexOf('win.once("ready-to-show"'));
    expect(ready.indexOf("mainWindow.open()")).toBeGreaterThan(ready.indexOf("win?.show()"));
    // On one line: the call's own arguments hold braces (a template string), so read to the line's end.
    expect(main).toMatch(/showUpdateProgress\(\{.*whenShown: mainWindow\.whenShown/);
  });
});
