// Two of the tools DotAmi is built with report usage on their own unless told not to. This runs
// one of them with both reports switched off; the npm scripts go through scripts/next.mjs and
// scripts/prisma.mjs, which call it.
//
// - Next.js sends anonymous counts to telemetry.nextjs.org on `next dev`, `next build` and
//   `next lint` (the command, versions, the kind of computer, the app's size; nextjs.org/telemetry,
//   read 2026-10-05). It reads NEXT_TELEMETRY_DISABLED when it starts
//   (node_modules/next/dist/telemetry/storage.js), so the variable must be in its environment.
// - The Prisma CLI reports to checkpoint.prisma.io on every command: the command name, versions,
//   the operating system and a fixed random ID for this computer
//   (node_modules/prisma/build/child.js, checked 2026-10-05). Setting it in .env doesn't work: the
//   CLI reads .env only after it has reported (tested 2026-10-05).
//
// Setting the variables here, in a Node script, works the same from Windows cmd, PowerShell and
// bash, which an inline `NAME=1 next dev` in package.json would not, and needs no extra package.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TELEMETRY_OFF = Object.freeze({ NEXT_TELEMETRY_DISABLED: "1", CHECKPOINT_DISABLE: "1" });

// The project's own folder, found from this file rather than the current folder, so the right
// node_modules is used wherever the command is started from.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Runs a package's command-line entry (a path under node_modules) with this Node and the reports
 * off, passing the arguments, the terminal and the exit code straight through.
 */
export function runWithTelemetryOff(cliFromRoot, args) {
  const cli = path.join(root, "node_modules", ...cliFromRoot);
  const child = spawn(process.execPath, [cli, ...args], {
    stdio: "inherit",
    env: { ...process.env, ...TELEMETRY_OFF },
  });
  // `next dev` runs until stopped. Hand a stop request on to it, so stopping this script never
  // leaves the server running on its own. On Windows, Ctrl+C already reaches every program in the
  // console window, and killing the child there would cut its own shutdown short, so this only
  // waits for it to exit.
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      if (process.platform === "win32" && signal === "SIGINT") return;
      child.kill(signal);
    });
  }
  child.on("error", (error) => {
    console.error(`Couldn't start ${cli}: ${error.message}`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}
