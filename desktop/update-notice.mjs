// What the person sees while an update arrives ([7d]).
//
// Until 0.2.1 the app downloaded a new version (about 130 MB) in silence and spoke only when it
// was ready, so at start-up nothing said an update was coming for a minute or more (the
// maintainer, 2026-10-08: "I would like it to appear right as the app opens"). Now, as soon as
// GitHub says there is a newer version:
//   - a message says so, and that nothing installs without the person's click. It has no parent
//     window, so it doesn't block the app: the person can read it, close it, or keep working;
//   - the app's taskbar button fills up as the download goes (Windows' own progress display);
//   - when the download is checked and ready, the message closes itself and the same question as
//     before is asked: "Restart and update" or "Later". Installing is still only ever that click.
// If the download fails, the progress is cleared and the person is told nothing was installed.
//
// The updater, the dialog module and the window are passed in, so tests can drive this with fakes
// (tests/desktop-update-notice.spec.ts).

/**
 * @param {{
 *   updater: import("node:events").EventEmitter & { quitAndInstall: () => void },
 *   dialog: Pick<Electron.Dialog, "showMessageBox">,
 *   window: () => (Pick<Electron.BrowserWindow, "setProgressBar" | "isDestroyed"> | null),
 *   log: (line: string) => void,
 * }} parts
 */
export function showUpdateProgress({ updater, dialog, window, log }) {
  /** @type {AbortController | null} */
  let notice = null;
  let downloading = false;

  // Electron: below 0 removes the bar, above 1 shows it moving without a percentage.
  const bar = (value) => {
    const win = window();
    if (win && !win.isDestroyed()) win.setProgressBar(value);
  };
  const closeNotice = () => {
    notice?.abort();
    notice = null;
  };

  updater.on("update-available", (info) => {
    downloading = true;
    closeNotice();
    notice = new AbortController();
    bar(2);
    log(`[update] DotAmi ${info.version} is available; downloading`);
    // Not awaited and not attached to the window: the app stays usable while the message is up.
    void dialog
      .showMessageBox({
        type: "info",
        title: "Update available",
        buttons: ["OK"],
        message: `DotAmi ${info.version} is available, downloading now.`,
        detail:
          "You can keep working. You'll be asked before it installs: nothing changes until you click Restart and update. The taskbar button shows how far the download has got.",
        signal: notice.signal,
      })
      .catch(() => {});
  });

  updater.on("download-progress", (progress) => {
    // A download whose size the server didn't give has no percentage; the bar keeps moving instead.
    if (downloading && Number.isFinite(progress?.percent)) bar(Math.max(0, Math.min(1, progress.percent / 100)));
  });

  updater.on("update-downloaded", async (info) => {
    downloading = false;
    bar(-1);
    closeNotice();
    const win = window();
    const { response } = await dialog.showMessageBox(win && !win.isDestroyed() ? win : undefined, {
      type: "info",
      title: "Update ready",
      buttons: ["Restart and update", "Later"],
      defaultId: 0,
      cancelId: 1,
      message: `DotAmi ${info.version} is ready to install.`,
      detail: "Your data stays in its folder, and the app copies it to backups/ before any change to how it's stored.",
    });
    if (response === 0) updater.quitAndInstall();
  });

  // The updater reports a failed check and a failed download the same way. A failed check is
  // already handled where the check is made (desktop/main.mjs checkForUpdates); only a download
  // the person was told about needs a word here.
  updater.on("error", () => {
    if (!downloading) return;
    downloading = false;
    bar(-1);
    closeNotice();
    log("[update] the download didn't finish");
    void dialog
      .showMessageBox({
        type: "warning",
        title: "Update",
        message: "The update didn't finish downloading.",
        detail: "Nothing was installed and your data wasn't touched. DotAmi tries again the next time it starts, or use Help → Check for updates.",
      })
      .catch(() => {});
  });
}
