// Builds the server the desktop app runs: `next build` in standalone mode into .next-desktop/,
// then copies in what the standalone server doesn't carry on its own (public/ and the static
// assets — nextjs.org/docs/app/api-reference/config/next-config-js/output), and removes any
// environment file the build copied, so a developer's own .env (keys, local paths) can never
// end up inside a desktop app. Runs Next's own entry point with this Node — no shell, same on
// every operating system.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { NOTICES_FILE, writeNotices } from "./notices.mjs";

const root = process.cwd();
const dist = path.join(root, ".next-desktop");
const standalone = path.join(dist, "standalone");

rmSync(dist, { recursive: true, force: true });
// `next build` rewrites tsconfig.json and next-env.d.ts to point at the build folder it's using;
// for this one-off folder that's churn in two committed files, so put them back afterwards.
const kept = ["tsconfig.json", "next-env.d.ts"].map((f) => [f, readFileSync(path.join(root, f))]);
try {
  execFileSync(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"], {
    env: { ...process.env, DOTAMI_DESKTOP_BUILD: "1", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "inherit",
  });
} finally {
  for (const [f, content] of kept) writeFileSync(path.join(root, f), content);
}

const server = path.join(standalone, "server.js");
if (!existsSync(server)) throw new Error(`desktop build: ${server} was not produced`);

cpSync(path.join(dist, "static"), path.join(standalone, ".next-desktop", "static"), { recursive: true });
if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
}

// Two things the build copies that must never ship (both seen 2026-10-05): the project's .env,
// copied next to server.js; and a git log file, swept in because the file tracer reads
// `path.resolve(cwd, "prisma", file)` in lib/settings/today.ts as "any file under any folder
// called prisma". Take them out.
const envFiles = readdirSync(standalone).filter((f) => f === ".env" || f.startsWith(".env."));
for (const f of envFiles) rmSync(path.join(standalone, f));
const gitCopied = existsSync(path.join(standalone, ".git"));
rmSync(path.join(standalone, ".git"), { recursive: true, force: true });

// Then refuse to finish if anything private is still in the app — git data, an env file or a
// database anywhere in the tree. This is the check that the removal above was enough.
const forbidden = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === ".git" || entry.name === ".env" || entry.name.startsWith(".env.") || /\.db(-\w+)?$/.test(entry.name)) {
      forbidden.push(path.relative(root, full));
    } else if (entry.isDirectory()) {
      walk(full);
    }
  }
})(standalone);
if (forbidden.length) {
  throw new Error(`desktop build: private files inside the app build:\n  ${forbidden.join("\n  ")}`);
}

// The third-party notices for exactly what this build ships (desktop/notices.mjs): every package in
// the server's node_modules, the desktop app's own packages and Electron, beside server.js, where the
// /licences page reads it. It replaces any copy of the source checkout's list the build traced in.
// desktop/package.mjs copies it beside DotAmi.exe too, and refuses to package a package it doesn't list.
const notices = writeNotices(root, path.join(standalone, NOTICES_FILE), { standalone });
console.log(`desktop build: ${NOTICES_FILE} lists ${notices.length} entries`);

const removed = [...envFiles, ...(gitCopied ? [".git"] : [])];
console.log(`desktop build ready: ${path.relative(root, server)}${removed.length ? ` (removed ${removed.join(", ")})` : ""}`);
