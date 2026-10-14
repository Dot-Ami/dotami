// When the installed app asks GitHub for a newer version, and when what it finds may be shown ([7d]).
//
// Until 0.3.0 the check started only after the server had started and the whole first page had
// loaded, so on a slow start the update message came several seconds after the window (the
// maintainer, 2026-10-13: "nearly 15-20 seconds", on 0.2.1, which also downloaded before saying
// anything). Now desktop/main.mjs starts the check as soon as its log is open, before the start-up
// windows and the server, and what the check finds waits until the main window is on the screen
// (mainWindowGate below, used by desktop/update-notice.mjs): never over "Preparing DotAmi…" or the
// "Lock your data file with a key?" question.
//
// The updater and the dialog module are passed in, so tests can drive this with fakes
// (tests/desktop-update-check.spec.ts).
import { describeError } from "./log.mjs";

/**
 * Something to run now if the main window is on the screen, or as soon as it shows. Opened once, by
 * the main window's first ready-to-show; what was held runs once, in the order it arrived.
 * @returns {{ whenShown: (fn: () => void) => void, open: () => void }}
 */
export function mainWindowGate() {
  let shown = false;
  /** @type {(() => void)[]} */
  const held = [];
  return {
    whenShown: (fn) => {
      if (shown) fn();
      else held.push(fn);
    },
    open: () => {
      if (shown) return;
      shown = true;
      for (const fn of held.splice(0)) fn();
    },
  };
}

/**
 * Asks GitHub Releases for a newer version; the updater downloads it and desktop/update-notice.mjs says
 * so. Installing is always the person's click ("Restart and update"), never automatic.
 *
 * At start (byHand false) only a log line is written whatever happens; from Help → Check for updates
 * (byHand true) the person is told what was found or that the check couldn't be made.
 * @param {{
 *   on: boolean,
 *   byHand: boolean,
 *   loadUpdater: () => Promise<{ checkForUpdates: () => Promise<{ isUpdateAvailable?: boolean } | null | undefined> }>,
 *   dialog: { showMessageBox: (options: { type?: string, title?: string, message: string, detail?: string }) => Promise<unknown> },
 *   log: (line: string) => void,
 *   version: string,
 * }} parts
 */
export async function checkForUpdates({ on, byHand, loadUpdater, dialog, log, version }) {
  if (!on) {
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
  try {
    // Loading the updater is inside the try: at start nothing here may stop DotAmi from opening.
    const updater = await loadUpdater();
    const result = await updater.checkForUpdates();
    if (byHand && !result?.isUpdateAvailable) {
      void dialog.showMessageBox({ type: "info", title: "Updates", message: `You have the latest version (${version}).` });
    }
  } catch (error) {
    // The name and code only (desktop/log.mjs): an update error's message can carry the address it
    // tried and folders on this computer.
    log(`[update] check failed (${describeError(error)})`);
    if (byHand) {
      void dialog.showMessageBox({ type: "warning", title: "Updates", message: "DotAmi couldn't check for updates right now.", detail: "Check your internet connection and try again from Help → Check for updates." });
    }
  }
}
