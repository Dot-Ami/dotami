// The desktop app's log, logs/server.log in the data folder.
//
// Every line goes to the disk before write() returns (writeSync on a file opened for appending).
// Until 0.2.1 the log was a WriteStream, which opens its file and writes in the background: start-up
// is synchronous up to the server (the migrator above all), so a start that was killed or failed in
// that stretch left nothing behind, not even its "starting DotAmi" line (seen 2026-10-08). The lines
// are short and few, so writing them one at a time costs nothing a person would notice.
import { mkdirSync, openSync, writeSync } from "node:fs";
import path from "node:path";

/**
 * Opens (or creates) the log file for appending. Never throws: if the file can't be opened (a
 * read-only server.log, a "logs" that is a file, a full disk) the log it gives does nothing, and
 * the app starts anyway. The log is a note, not the data.
 * @param {string} file
 * @returns {{ file: string, write: (text: string | Uint8Array) => void, follow: (stream: NodeJS.ReadableStream | null | undefined) => void }}
 */
export function openLog(file) {
  let fd = -1;
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    fd = openSync(file, "a");
  } catch (error) {
    // Only the name and code: the message would carry the path, which the caller already has.
    console.error(`[desktop] the log can't be opened (${describeError(error)}); starting without it`);
  }

  const write = (text) => {
    if (fd < 0) return;
    try {
      writeSync(fd, text);
    } catch {
      // A full disk or a vanished folder must not stop the app.
    }
  };

  return {
    file,
    write,
    // The server's output (its stdout and stderr), written as it arrives, the same way.
    follow: (stream) => {
      stream?.on("data", (chunk) => write(chunk));
    },
  };
}

/**
 * The logger handed to electron-updater (autoUpdater.logger in desktop/main.mjs).
 *
 * The updater writes errors on every channel: `Error: <stack>` on error, `${e}` in its warn lines
 * ("Couldn't write out staging user ID: Error: EPERM … <userData>\.updaterId"), and an error's
 * message in a few info lines ("Cannot run installer: error code: …, error message: …"). A stack or
 * message names folders on this computer, which hold the person's Windows account name. So error and
 * warn always leave one fixed line, and an info line that reports a failure does too; the check's own
 * line in main.mjs says which error it was, by name and code. Other info lines are its progress
 * ("Checking for update", "Found version …") and are kept as given; one of them names the folder an
 * update downloads to. debug is dropped.
 * @param {(text: string) => void} write
 */
export function updaterLogger(write) {
  return {
    info: (m) => write(UPDATER_FAILURE.test(String(m)) ? "[update] the updater reported a problem\n" : `[update] ${m}\n`),
    warn: () => write("[update] the updater gave a warning\n"),
    error: () => write("[update] the updater reported an error\n"),
    debug: () => {},
  };
}

// The words electron-updater 6.8.11 uses when an info line carries a failure (NsisUpdater.js:135,
// DownloadedUpdateHelper.js:102; the same lines as 6.8.9's, re-read 2026-10-30).
const UPDATER_FAILURE = /error|cannot|can't|couldn't|failed|unable/i;

/**
 * "Error, EPERM": an error's name and code, never its message, which can quote what it was given.
 * The same rule as lib/api/log-error.ts describeError, for the desktop side (plain JavaScript, so it
 * can't import the TypeScript one).
 * @param {unknown} error
 * @returns {string}
 */
export function describeError(error) {
  const name = error instanceof Error ? error.name : "unknown";
  const code = typeof error?.code === "string" ? error.code : "-";
  return `${name}, ${code}`;
}
