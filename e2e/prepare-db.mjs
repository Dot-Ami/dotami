// Gives the browser tests a fresh database: deletes the e2e data folder, creates its tables,
// and loads the two invented demo ventures. Runs Prisma's and tsx's own entry points with this
// Node — no shell, same on every operating system.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
// The data file and the receipts folder beside it ([8i]) live in a folder of their own, so each run
// starts with no receipt files and never touches a developer's own prisma/receipts.
const folder = path.join(root, "prisma", "e2e");
if (existsSync(folder)) rmSync(folder, { recursive: true, force: true });
mkdirSync(folder, { recursive: true });
// The file earlier versions of this script used, left over in a checkout.
const oldFile = path.join(root, "prisma", "e2e.db");
for (const f of [oldFile, `${oldFile}-journal`]) {
  if (existsSync(f)) rmSync(f);
}

// CHECKPOINT_DISABLE: the Prisma CLI's usage check-in stays off (scripts/prisma.mjs says why).
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "file:./e2e/dotami.db", CHECKPOINT_DISABLE: "1" };
const run = (script, args) =>
  execFileSync(process.execPath, [path.join(root, "node_modules", ...script), ...args], {
    env,
    stdio: "inherit",
  });

run(["prisma", "build", "index.js"], ["migrate", "deploy"]);
run(["tsx", "dist", "cli.mjs"], ["prisma/seed.ts"]);
