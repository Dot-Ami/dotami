// Runs the Next.js command (`next dev`, `next build`, `next start`, `next lint`) with its anonymous
// usage reports switched off; the npm scripts go through here. scripts/telemetry-off.mjs says what
// Next.js would otherwise send and why it is done this way. `npx next …` run by hand skips this:
// set NEXT_TELEMETRY_DISABLED=1 yourself for that.
import { runWithTelemetryOff } from "./telemetry-off.mjs";

runWithTelemetryOff(["next", "dist", "bin", "next"], process.argv.slice(2));
