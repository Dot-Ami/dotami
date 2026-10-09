// Builds the installable desktop app ([7d]): `npm run desktop:package` (an unpacked app folder to
// test) or `npm run desktop:installer` (the Windows installer). On a release tag, CI runs the
// installer build with `--publish`, which uploads it to a DRAFT GitHub release — nothing reaches
// anyone's computer until the maintainer publishes that draft by hand.
//
// It stages exactly what the installed app needs into dist-desktop/app/ — the Electron main
// process, the migrator, the migration files, the self-contained server and the updater — and
// nothing else, then refuses to continue if any git data, env file or database is in there.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { Arch, build, Platform } from "electron-builder";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const installer = args.has("--installer");
const publish = args.has("--publish") ? "always" : "never";
const stage = path.join(root, "dist-desktop", "app");
const serverStage = path.join(root, "dist-desktop", "server");
const out = path.join(root, "dist-desktop", "out");
const rootPkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const version = (name) => JSON.parse(readFileSync(path.join(root, "node_modules", name, "package.json"), "utf8")).version;

// 1. The self-contained server (desktop/build.mjs runs its own private-file check).
execFileSync(process.execPath, [path.join(root, "desktop", "build.mjs")], { stdio: "inherit" });

// 2. Stage the app.
rmSync(path.join(root, "dist-desktop"), { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const f of ["main.mjs", "migrate.mjs", "backup.mjs", "receipt-crypto.mjs", "receipt-key.mjs", "log.mjs", "update-notice.mjs", "passphrase.html", "passphrase.js", "passphrase-preload.cjs"]) {
  cpSync(path.join(root, "desktop", f), path.join(stage, "desktop", f));
}
cpSync(path.join(root, "prisma", "migrations"), path.join(stage, "prisma", "migrations"), { recursive: true });
copyWithDependencies("electron-updater", stage);
// The server ships as its own folder beside the app (resources/server), copied as-is: inside the
// app folder, electron-builder silently drops the server's node_modules (seen 2026-10-05 — the
// first package was 5 MB and its server couldn't have started).
cpSync(path.join(root, ".next-desktop", "standalone"), serverStage, { recursive: true });
writeFileSync(
  path.join(stage, "package.json"),
  JSON.stringify(
    {
      name: rootPkg.name,
      productName: "DotAmi",
      version: rootPkg.version,
      description: "Every path to financial freedom, mapped and cited. Information, not advice.",
      homepage: "https://github.com/Dot-Ami/dotami",
      author: "DotAmi contributors",
      license: "Apache-2.0",
      main: "desktop/main.mjs",
      dependencies: { "electron-updater": version("electron-updater") },
    },
    null,
    2,
  ),
);

// 3. Nothing private inside — the same rule as the server build, over everything that ships.
const forbidden = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === ".git" || entry.name === ".env" || entry.name.startsWith(".env.") || /\.db(-\w+)?$/.test(entry.name)) {
      forbidden.push(path.relative(root, full));
    } else if (entry.isDirectory()) {
      walk(full);
    }
  }
}
walk(stage);
walk(serverStage);
if (forbidden.length) throw new Error(`desktop package: private files staged:\n  ${forbidden.join("\n  ")}`);

// 4. Package. Per-user install (no administrator rights); uninstalling leaves the data folder
// alone — whether to offer deleting it is still an open decision (settings doc, Part 4 §6).
await build({
  projectDir: stage,
  targets: Platform.WINDOWS.createTarget(installer ? ["nsis"] : ["dir"], Arch.x64),
  publish,
  config: {
    appId: "io.github.dot-ami.dotami",
    productName: "DotAmi",
    electronVersion: version("electron"),
    directories: { output: out },
    npmRebuild: false,
    files: ["**/*"],
    // Copy the server in after electron-builder has assembled the app and before it makes the
    // installer: its own file filters drop node_modules from `files` AND `extraResources` (both
    // tried 2026-10-05), so the copy is ours, then the finished app is checked for private files.
    afterPack: async ({ appOutDir }) => {
      const dest = path.join(appOutDir, "resources", "server");
      cpSync(serverStage, dest, { recursive: true });
      if (!existsSync(path.join(dest, "node_modules", "next", "package.json"))) {
        throw new Error("desktop package: the server's node_modules didn't make it into the app");
      }
      walk(appOutDir);
      if (forbidden.length) throw new Error(`desktop package: private files in the app:\n  ${forbidden.join("\n  ")}`);
    },
    win: { target: "nsis" },
    nsis: { oneClick: true, perMachine: false, deleteAppDataOnUninstall: false },
    publish: [{ provider: "github", owner: "Dot-Ami", repo: "dotami", releaseType: "draft" }],
  },
});
console.log(`desktop package ready in ${path.relative(root, out)}`);

/**
 * Copies a package and everything it depends on (as installed in this checkout's node_modules,
 * so the versions are the locked ones) into the staged app's node_modules.
 */
function copyWithDependencies(name, into, seen = new Set()) {
  if (seen.has(name)) return;
  seen.add(name);
  const from = path.join(root, "node_modules", name);
  if (!existsSync(from)) throw new Error(`desktop package: ${name} is not installed`);
  cpSync(from, path.join(into, "node_modules", name), { recursive: true });
  const pkg = JSON.parse(readFileSync(path.join(from, "package.json"), "utf8"));
  for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) {
    // A dependency nested under this package came along with the copy above.
    if (existsSync(path.join(from, "node_modules", dep))) continue;
    copyWithDependencies(dep, into, seen);
  }
}
