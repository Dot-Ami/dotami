// Runs the Prisma CLI with its usage check-in switched off; the `prisma:*` npm scripts go through
// here. Without CHECKPOINT_DISABLE the CLI reports to https://checkpoint.prisma.io on every
// command — the command name, versions, the operating system and a fixed random ID for this
// computer (node_modules/prisma/build/child.js, checked 2026-10-05). Setting it in .env doesn't
// work: the CLI reads .env only after it has reported (tested 2026-10-05). DotAmi sends nothing.
import { spawnSync } from "node:child_process";
import path from "node:path";

const cli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, CHECKPOINT_DISABLE: "1" },
});
process.exit(result.status ?? 1);
