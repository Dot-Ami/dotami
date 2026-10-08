/**
 * What the person sees while an update arrives (desktop/update-notice.mjs), driven with a fake
 * updater that emits electron-updater's own events, a fake dialog module and a fake window.
 *
 * The maintainer, 2026-10-08: when the app was opened from the Start menu it took a while before
 * anything said there was an update — the app downloaded about 130 MB in silence and spoke only
 * when it was ready. Now the person is told the moment the update is found, sees the download in
 * the taskbar, and installing is still only ever their click on "Restart and update".
 */
import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it } from "vitest";

import { showUpdateProgress, type MessageBoxOptions } from "../desktop/update-notice.mjs";

type Shown = { parent: unknown; options: MessageBoxOptions };

let updater: EventEmitter & { quitAndInstall: () => void; installs: number };
let shown: Shown[];
let answers: number[];
let progress: number[];
let lines: string[];
let fakeWindow: { setProgressBar(value: number): void; isDestroyed(): boolean } | null;

const tick = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  updater = Object.assign(new EventEmitter(), {
    installs: 0,
    quitAndInstall() {
      updater.installs += 1;
    },
  });
  shown = [];
  answers = [];
  progress = [];
  lines = [];
  fakeWindow = { setProgressBar: (value) => progress.push(value), isDestroyed: () => false };
  const dialog = {
    // Like Electron's: (options) or (window, options). A box given an AbortSignal closes when it fires.
    showMessageBox(...args: [MessageBoxOptions] | [unknown, MessageBoxOptions]) {
      const [parent, options] = args.length === 2 ? args : [undefined, args[0]];
      shown.push({ parent, options });
      if (options.signal) {
        return new Promise<{ response: number }>((resolve) => options.signal!.addEventListener("abort", () => resolve({ response: -1 })));
      }
      return Promise.resolve({ response: answers.shift() ?? 0 });
    },
  };
  showUpdateProgress({ updater, dialog, window: () => fakeWindow, log: (line) => lines.push(line) });
});

describe("as soon as a newer version is found", () => {
  it("says so at once, without blocking the app, and starts the taskbar progress", () => {
    updater.emit("update-available", { version: "0.2.2" });

    expect(shown).toHaveLength(1);
    expect(shown[0].options.message).toBe("DotAmi 0.2.2 is available, downloading now.");
    expect(shown[0].options.detail).toContain("You'll be asked before it installs");
    // No parent window: the message doesn't stop the person using the app.
    expect(shown[0].parent).toBeUndefined();
    expect(shown[0].options.buttons).toEqual(["OK"]);
    // Moving bar until the first bytes arrive (Electron: a value above 1).
    expect(progress).toEqual([2]);
    expect(lines).toEqual(["[update] DotAmi 0.2.2 is available; downloading"]);
    // Nothing installs on its own.
    expect(updater.installs).toBe(0);
  });

  it("fills the taskbar button as the download goes, and clears it when the download is done", async () => {
    updater.emit("update-available", { version: "0.2.2" });
    updater.emit("download-progress", { percent: 25, total: 100, transferred: 25, bytesPerSecond: 1, delta: 25 });
    updater.emit("download-progress", { percent: 80.5, total: 100, transferred: 80, bytesPerSecond: 1, delta: 55 });
    updater.emit("download-progress", { percent: Number.NaN });
    answers.push(1);
    updater.emit("update-downloaded", { version: "0.2.2" });
    await tick();

    expect(progress).toEqual([2, 0.25, 0.805, -1]);
  });
});

describe("when the download is ready", () => {
  it("closes the first message and asks the same question as before: Restart and update, or Later", async () => {
    updater.emit("update-available", { version: "0.2.2" });
    const first = shown[0].options.signal!;
    expect(first.aborted).toBe(false);

    answers.push(1); // "Later"
    updater.emit("update-downloaded", { version: "0.2.2" });
    await tick();

    expect(first.aborted).toBe(true);
    expect(shown).toHaveLength(2);
    expect(shown[1].parent).toBe(fakeWindow);
    expect(shown[1].options.message).toBe("DotAmi 0.2.2 is ready to install.");
    expect(shown[1].options.buttons).toEqual(["Restart and update", "Later"]);
    expect(shown[1].options.cancelId).toBe(1);
    // "Later": nothing installs.
    expect(updater.installs).toBe(0);
  });

  it("installs only on the person's click on Restart and update", async () => {
    updater.emit("update-available", { version: "0.2.2" });
    answers.push(0); // "Restart and update"
    updater.emit("update-downloaded", { version: "0.2.2" });
    await tick();
    expect(updater.installs).toBe(1);
  });

  it("still asks when there is no window (the app is closing, or it never opened)", async () => {
    fakeWindow = null;
    updater.emit("update-available", { version: "0.2.2" });
    answers.push(1);
    updater.emit("update-downloaded", { version: "0.2.2" });
    await tick();
    expect(shown.map((s) => s.options.title)).toEqual(["Update available", "Update ready"]);
    expect(shown[1].parent).toBeUndefined();
    expect(updater.installs).toBe(0);
  });
});

describe("when something goes wrong", () => {
  it("a failed download clears the progress, closes the first message and says nothing was installed", () => {
    updater.emit("update-available", { version: "0.2.2" });
    updater.emit("download-progress", { percent: 40 });
    updater.emit("error", new Error("net::ERR_CONNECTION_RESET"));

    expect(shown[0].options.signal!.aborted).toBe(true);
    expect(progress).toEqual([2, 0.4, -1]);
    expect(shown).toHaveLength(2);
    expect(shown[1].options.message).toBe("The update didn't finish downloading.");
    expect(shown[1].options.detail).toContain("Nothing was installed");
    expect(lines).toContain("[update] the download didn't finish");
    // Progress after the failure (a late event) doesn't bring the bar back.
    updater.emit("download-progress", { percent: 60 });
    expect(progress).toEqual([2, 0.4, -1]);
  });

  it("a failed check alone (nothing being downloaded) shows nothing here; the check itself reports it", () => {
    updater.emit("error", new Error("getaddrinfo ENOTFOUND github.com"));
    expect(shown).toEqual([]);
    expect(progress).toEqual([]);
  });
});
