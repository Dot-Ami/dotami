# The desktop app — how it runs, installs and updates ([7b], [7d])

Status: 2026-10-05. Runs from a checkout (`npm run desktop`), packages into a Windows installer
(`npm run desktop:installer`), and updates itself from GitHub Releases. Not yet released: the
first release is the maintainer's call. Plan of record:
[use-cases.md § The desktop app](use-cases.md#the-desktop-app--database-and-shell-go-given-2026-09-29).
Edge cases: [settings-and-edge-cases.md § The desktop app](settings-and-edge-cases.md#the-desktop-app).

## What happens when it starts

`desktop/main.mjs`, in order:

1. **Data folder.** The app's own folder (`%APPDATA%\DotAmi` on Windows), or `DOTAMI_DATA_DIR`
   if set. It must be writable, or the app says so and stops.
2. **One copy per data folder.** A second launch brings the first window forward.
3. **The database.** `dotami.db` in that folder, created or brought up to date by
   `desktop/migrate.mjs` (below). Output goes to `logs/server.log` in the data folder.
4. **The server.** The self-contained Next.js server, started as an Electron utility process on a
   free port bound to `127.0.0.1` — reachable from this computer only. Its environment never
   carries a model key from the shell that started the app (`ANTHROPIC_API_KEY` is removed):
   DotAmi ships no key, and the person's model will come from the app's own settings ([9a]).
5. **The window.** It shows only DotAmi's own pages. New windows are refused; an `https` link to
   anywhere else opens in the person's own browser. The only permission granted is writing to
   the clipboard (the settings page's *Copy path*). Electron's defaults stay on and are set
   explicitly: context isolation, sandbox, no Node in pages
   ([Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security), read
   2026-10-05).
6. **Updates** (installed app only) — see below.
7. **Menu.** File → Back up… · Restore from a backup… · Open data folder · Quit; Go → Home · Your
   ideas · Settings; View; Help → About · Check for updates · Source on GitHub.

Anything that goes wrong says what happened in a dialog and quits — never a blank window.

## The database migrator (`desktop/migrate.mjs`)

The app applies Prisma's own migration files (`prisma/migrations/*/migration.sql`) with the
SQLite built into Electron's Node (`node:sqlite`; added in Node 22.5, no flag since 22.13, a
"release candidate" from 25.7 — [Node docs](https://nodejs.org/api/sqlite.html), read 2026-10-05 —
so still marked experimental in Electron 44's Node 24.21). It replaces shipping the Prisma CLI,
which is about 146 MB of engines for five kinds of database and reports usage to
`checkpoint.prisma.io` on every run.

- **Same bookkeeping as Prisma.** It writes Prisma's `_prisma_migrations` table exactly as
  `prisma migrate deploy` does — SHA-256 of the file's bytes, times in milliseconds (read from a
  database Prisma migrated). `tests/desktop-migrate.spec.ts` uses **Prisma's own `migrate status`
  as the referee**: a database the app migrated must read "up to date", and a database Prisma
  migrated must need nothing from the app. (Checked that the referee bites: with the migrator
  not marking a migration finished, Prisma's check fails the test on its own.)
- **Refuses, untouched:** a database a newer DotAmi has migrated ("update the app first"), and one
  where an update was left half-done.
- **Backs up first:** before changing a database that already has data, a full copy goes to
  `backups/` in the data folder (`VACUUM INTO`, consistent even if the file is open).
- **All or nothing per migration:** each runs in a transaction; SQLite undoes schema changes too,
  so a failure leaves the database exactly as it was and unrecorded.

## Backup and restore ([7c], `desktop/backup.mjs`)

**File → Back up…** asks for an optional passphrase (twice; the warning *"lose it and the backup
can't be opened — nobody can recover it"* is shown first), then where to save, and writes one
`.dotami-backup` file. **File → Restore from a backup…** opens one, asks for its passphrase if it's
locked, checks it, asks for confirmation, keeps a safety copy of the current data in `backups/`,
swaps it in and restarts the app (an older backup is then upgraded by the migrator).

- **The file:** `DOTAMI-BACKUP` + a JSON header (format, app version, date, the migrations it
  holds, the SHA-256 of the database) + the database — made with `VACUUM INTO`, consistent even
  while the app has it open. Written beside its real name and renamed, so a crash never leaves a
  half-written file that looks finished.
- **Locked backups:** AES-256-GCM, key from the passphrase with scrypt (N 131072, r 8, p 1). The
  header is authenticated too, so editing any of it makes the backup refuse to open. A header that
  asks for different scrypt settings is refused, so a hostile file can't make the app hang.
- **Checked before anything changes:** not a backup · damaged (cut short, a changed byte, or a
  database SQLite's `integrity_check` rejects) · locked and the passphrase is wrong (GCM can't tell
  a wrong passphrase from a damaged file, so the message says both) · made by a newer DotAmi. All
  checks run on a temporary copy; the live data is untouched until the person confirms.
- **The passphrase window** is a local page with no network access (its own CSP) that can send
  back only the passphrase or "cancel"; the app checks the message came from that window.
- **Tests:** `tests/desktop-backup.spec.ts` (9 cases; checked that it bites — without header
  authentication, the edited-header case fails) and the desktop test "back up on one computer →
  restore on another", through the real passphrase window, a wrong passphrase first (checked: with
  the swap skipped it fails).

## Building and packaging

- `npm run desktop:build` — `next build` in standalone mode into `.next-desktop/` (its own folder,
  so it never overwrites the `.next` a running dev server uses). It removes the project's `.env`,
  which Next copies next to `server.js`, and a stray `.git` file the tracer once swept in, then
  **fails if any git data, env file or database is still inside**. It puts back `tsconfig.json`
  and `next-env.d.ts`, which `next build` rewrites for a new folder. (Not
  `outputFileTracingExcludes`: Next 15.5 joins those globs with the OS path separator, so on
  Windows they never match — `collect-build-traces.js:503`.)
- `npm run desktop:package` — an unpacked app in `dist-desktop/out/win-unpacked/`.
  `npm run desktop:installer` — the installer, `DotAmi Setup <version>.exe` (about 126 MB), plus
  `latest.yml`. `desktop/package.mjs` stages only what ships: the main process, the migrator, the
  migration files, the updater (with its locked dependencies) and the server — then checks the
  finished app for private files again. The server is copied in after electron-builder assembles
  the app, because electron-builder's file filters drop `node_modules` from both `files` and
  `extraResources` (both tried: the first package was 5 MB and couldn't have started).
- **Installs per user**, no administrator rights (`%LOCALAPPDATA%\Programs\DotAmi`). **Uninstalling
  leaves the data folder alone** — whether to offer deleting it is an open decision (settings doc,
  Part 4 §6). Not code-signed: Windows shows "Windows protected your PC" on first install (signing
  is deferred until app stores, the maintainer's call 2026-09-29).

## Updates

The installed app checks GitHub Releases when it starts (and on Help → Check for updates),
downloads a newer version, and **asks before installing it** — nothing installs without the
person's click ("Restart and update"). A copy run from the source code never checks; it updates
with git. The settings page says which kind of copy it is, and its Privacy group says what the
check reveals: GitHub sees the computer's internet address and which version it runs.

- **Only published releases count.** CI uploads every build as a **draft**; a draft is invisible to
  installed apps until the maintainer publishes it.
- **Pre-releases for work in progress.** A version with a pre-release tag (`0.2.0-dev.1`) published
  as a GitHub *pre-release* reaches only copies that are themselves on a pre-release version —
  electron-updater's own `allowPrerelease` default
  (`node_modules/electron-updater/out/AppUpdater.d.ts`). Normal copies stay on normal releases.
- **What protects an update.** The download must match the SHA-512 in the release's `latest.yml`
  (a corrupted or swapped download is refused). Both come from the same release, so the real lock
  is **who can publish a release on `Dot-Ami/dotami`** — the maintainer's GitHub account (keep
  two-factor sign-in on). Code signing would add a second, independent check; it's deferred.

### Releasing an update

1. Bump `version` in `package.json` (e.g. `0.1.1`, or `0.2.0-dev.1` for a pre-release) in a PR.
2. After it merges: `git tag v0.1.1 && git push origin v0.1.1`.
3. `.github/workflows/release.yml` checks the tag matches `package.json`, packages the app, runs
   the desktop test on the packaged app, builds the installer and uploads it to a **draft** release.
4. Read the draft on GitHub (for a pre-release, tick *Set as a pre-release*), then **Publish**.
   Installed apps pick it up the next time they start.

## Tests

- `npm run test:desktop` builds the server and drives the app from this checkout;
  `DOTAMI_DESKTOP_EXE=<path to DotAmi.exe>` points the same test at a packaged app. Empty data
  folder → database created → describe a venture → the settings page shows the app's own data file
  and "nothing leaves this computer" although the app was started with a model key in its
  environment → an outside link goes to the browser, the window stays → close → start again → the
  venture is still there. CI runs it on Windows against the packaged app (`ci.yml` job
  "Desktop app (Windows)").
- `tests/desktop-migrate.spec.ts` — the migrator against Prisma's own status check, plus the
  refuse / back up / undo cases.

## Not done yet

- An update actually released on GitHub reaching an installed app (needs the first two releases).
- Not tested: a second launch while the first runs; an unwritable data folder; the app killed
  mid-save; a server that never answers; the update dialog itself.
- An app icon (the default Electron icon is used); Mac and Linux builds.
