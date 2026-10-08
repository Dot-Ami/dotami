// Runs the Prisma CLI with its usage check-in switched off; the `prisma:*` npm scripts go through
// here. Without CHECKPOINT_DISABLE the CLI reports to https://checkpoint.prisma.io on every
// command; scripts/telemetry-off.mjs says what it sends and why it is set here and not in .env.
// DotAmi sends nothing.
import { runWithTelemetryOff } from "./telemetry-off.mjs";

runWithTelemetryOff(["prisma", "build", "index.js"], process.argv.slice(2));
