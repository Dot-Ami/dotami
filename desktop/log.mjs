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
 * Opens (or creates) the log file for appending.
 * @param {string} file
 * @returns {{ file: string, write: (text: string | Uint8Array) => void, follow: (stream: NodeJS.ReadableStream | null | undefined) => void }}
 */
export function openLog(file) {
  mkdirSync(path.dirname(file), { recursive: true });
  const fd = openSync(file, "a");

  const write = (text) => {
    try {
      writeSync(fd, text);
    } catch {
      // A full disk or a vanished folder must not stop the app; the log is a note, not the data.
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
