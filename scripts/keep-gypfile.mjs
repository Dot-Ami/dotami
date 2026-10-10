// [8i] Puts `"gypfile": false` back on the database package's entry in package-lock.json, and with
// --check only says whether it is there (exit code 1 when it isn't).
//
//   node scripts/keep-gypfile.mjs           add it (changes nothing when it is already there)
//   node scripts/keep-gypfile.mjs --check   exit 1 when it is missing
//
// Why: better-sqlite3-multiple-ciphers ships a prebuilt SQLite for each kind of computer, and its
// package.json says `"gypfile": false` so npm doesn't try to compile it. But `npm ci` (and `npm install`
// in a fresh checkout) reads each package from package-lock.json, which npm writes without that field,
// so npm sees the package's binding.gyp and runs `node-gyp rebuild`: that needs Visual Studio's C++
// tools on Windows, fails without them, and downloads Node's headers when it does run (seen 2026-10-10:
// `npm ci` failed on a computer with no C++ tools). npm keeps the field when it is in the lockfile entry
// (it loads each entry whole), but drops it whenever it rewrites the lockfile (`npm install <package>`,
// a Dependabot update). tests/database-package.spec.ts fails until this script has put it back.
// Only reads and writes package-lock.json; reaches nothing on the network.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const LOCKFILE = path.join(process.cwd(), "package-lock.json");
/** Where npm installs the package: under the name the Prisma adapter loads it by. */
export const DATABASE_PACKAGE_ENTRY = "node_modules/better-sqlite3";

const text = readFileSync(LOCKFILE, "utf8");
const lock = JSON.parse(text);
const entry = lock.packages?.[DATABASE_PACKAGE_ENTRY];
if (!entry) {
  console.error(`package-lock.json has no ${DATABASE_PACKAGE_ENTRY}: run npm install first`);
  process.exit(1);
}
if (entry.gypfile === false) {
  console.log(`package-lock.json: ${DATABASE_PACKAGE_ENTRY} already says "gypfile": false`);
  process.exit(0);
}
if (process.argv.includes("--check")) {
  console.error(`package-lock.json: ${DATABASE_PACKAGE_ENTRY} is missing "gypfile": false; run node scripts/keep-gypfile.mjs`);
  process.exit(1);
}
// Inserted after "license", keeping npm's own layout (two spaces, a newline at the end, the same line endings).
const ordered = {};
for (const [key, value] of Object.entries(entry)) {
  ordered[key] = value;
  if (key === "license") ordered.gypfile = false;
}
if (!("gypfile" in ordered)) ordered.gypfile = false;
lock.packages[DATABASE_PACKAGE_ENTRY] = ordered;
const eol = text.includes("\r\n") ? "\r\n" : "\n";
writeFileSync(LOCKFILE, JSON.stringify(lock, null, 2).replace(/\n/g, eol) + eol);
console.log(`package-lock.json: added "gypfile": false to ${DATABASE_PACKAGE_ENTRY}`);
