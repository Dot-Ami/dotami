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
