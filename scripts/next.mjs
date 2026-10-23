// Runs the Next.js command (`next dev`, `next build`, `next start`, `next lint`) with its anonymous
// usage reports switched off; the npm scripts go through here. scripts/telemetry-off.mjs says what
// Next.js would otherwise send and why it is done this way. `npx next …` run by hand skips this:
// set NEXT_TELEMETRY_DISABLED=1 yourself for that.
import { runWithTelemetryOff } from "./telemetry-off.mjs";

const [command] = process.argv.slice(2);

// A copy run from source has no window to carry a launch secret (lib/http/launch-secret.ts), so its
// server answers every program on this computer, other Windows accounts' included, while it runs.
// Said once, in the terminal, every time such a server starts (README § Run it).
if ((command === "dev" || command === "start") && !process.env.DOTAMI_LAUNCH_SECRET) {
  console.warn(
    "Developer copy: any program on this computer, under any Windows account, can read and change this copy's data while it runs. Keep your own data in the desktop app.",
  );
}

runWithTelemetryOff(["next", "dist", "bin", "next"], process.argv.slice(2));
