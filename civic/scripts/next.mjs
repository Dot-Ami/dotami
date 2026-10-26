// Runs the Next.js command (`next dev`, `next build`, `next start`) with its anonymous usage
// reports switched off. The prototype sends nothing anywhere, and that includes the framework's
// own telemetry. `npx next …` run by hand skips this: set NEXT_TELEMETRY_DISABLED=1 yourself.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bin = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [bin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
