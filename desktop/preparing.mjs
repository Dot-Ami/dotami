// [8i] The "Preparing DotAmi…" window (docs/architecture/expense-records.md § 10). The first start of a
// new data folder waits about ten seconds before its window opens: the receipts' key is saved only once
// Windows' own key for it is in the data folder's "Local State" file, which Chromium writes about ten
// seconds after start (desktop/receipt-key.mjs waitForLocalState). Nothing was on the screen in those
// seconds. This shows a small window during that wait only, closes it when the main window shows, and
// lets the failure path close it before its message (desktop/main.mjs fail()).
//
// This file never imports Electron, so the tests can run it in plain Node (tests/desktop-preparing.spec.ts);
// desktop/main.mjs hands it the function that makes the real window.
import { localStateHoldsKey, waitForLocalState } from "./receipt-key.mjs";

/** The window's title, and the page's (desktop/preparing.html). */
export const PREPARING_TITLE = "Preparing DotAmi…";

/**
 * Whether saving a receipts key now would wait for Windows' own key: on Windows, while Local State
 * doesn't hold it yet. A Mac's Keychain keeps its item at once, so a Mac never waits.
 * @param {string} dataDir
 * @param {string} [platform]
 */
export function startWillWait(dataDir, platform = process.platform) {
  return platform === "win32" && !localStateHoldsKey(dataDir);
}

/**
 * @typedef {{ isDestroyed(): boolean, destroy(): void }} ClosableWindow
 * @typedef {{ show(): void, close(reason: string): void, isOpen(): boolean }} PreparingWindow
 */

/**
 * The window's life: shown at most once, closed at most once, and never shown after it was closed (a
 * start that failed, or whose main window already showed, never brings it back).
 * @param {() => ClosableWindow} open makes the window (desktop/main.mjs: a small BrowserWindow on preparing.html)
 * @param {{ log?: (line: string) => void }} [options]
 * @returns {PreparingWindow}
 */
export function preparingWindow(open, { log } = {}) {
  /** @type {ClosableWindow | null} */
  let window = null;
  let done = false;
  return {
    show() {
      if (window || done) return;
      window = open();
      log?.(`[desktop] showing the "${PREPARING_TITLE}" window while Windows saves its own key`);
    },
    close(reason) {
      if (done) return;
      done = true;
      if (!window) return;
      // destroy(), not close(): it is gone at once, before a failure message that blocks until clicked,
      // and the window has nothing of its own to save.
      if (!window.isDestroyed()) window.destroy();
      window = null;
      log?.(`[desktop] the preparing window closed (${reason})`);
    },
    isOpen() {
      return window !== null && !window.isDestroyed();
    },
  };
}

/**
 * What desktop/main.mjs passes openReceiptKey as `keyStoreSaved`: called only when a new receipts key is
 * about to be saved, so an ordinary start (the key opens) never gets here. It shows the window when that
 * save is about to wait, then waits.
 * @param {string} dataDir
 * @param {PreparingWindow} preparing
 * @param {{ platform?: string, wait?: () => Promise<boolean> }} [options] `wait` is for the tests
 */
export function waitShowingWindow(dataDir, preparing, { platform = process.platform, wait } = {}) {
  return async () => {
    if (startWillWait(dataDir, platform)) preparing.show();
    return (wait ?? (() => waitForLocalState(dataDir, { platform })))();
  };
}
