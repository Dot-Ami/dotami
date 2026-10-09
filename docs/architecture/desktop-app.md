# The desktop app — how it runs, installs and updates ([7b], [7d])

Status: 2026-10-08. Runs from a checkout (`npm run desktop`), packages into a Windows installer
(`npm run desktop:installer`), and updates itself from GitHub Releases. Released as 0.2.0
(2026-10-06) and 0.2.1 (2026-10-08). Plan of record:
[use-cases.md § The desktop app](use-cases.md#the-desktop-app--database-and-shell-go-given-2026-09-29).
Edge cases: [settings-and-edge-cases.md § The desktop app](settings-and-edge-cases.md#the-desktop-app).

## What happens when it starts

`desktop/main.mjs`, in order:

1. **Data folder.** The app's own folder (`%APPDATA%\DotAmi` on Windows), or `DOTAMI_DATA_DIR`
   if set. It must be writable, or the app says so and stops.
2. **One copy per data folder.** A second launch brings the first window forward.
3. **The log, then the database.** `logs/server.log` in the data folder is opened first and every
   line is written straight to the disk (`desktop/log.mjs`, `writeSync` on a file opened for
   appending): the start line (with *"started by the updater"* when the installer started it), the
   migrator's lines, *"database ready"*, the server's own output, and whatever stopped a start
   (*"[desktop] stopped: …"*, written before the error dialog: DotAmi's message and the error's
   name and code only). A log that can't be opened (a read-only file, a full disk) is skipped, never
   a reason not to start. Until 0.2.1 the log was a stream that
   wrote in the background while start-up ran synchronously, so a start killed or failed before the
   server left no line at all (seen 2026-10-08). Then, **only if Delete left a "wipe pending" note**
   beside the data file (`dotami.db.wipe-pending`: its wipe couldn't finish because the computer
   was busy, the disk was full or it was switched off), the app finishes that wipe before the server
   opens the file: it deletes the safety copies the note names (DotAmi's own `dotami-before-….db`
   files in `backups/`, never through a link), rebuilds the file with `VACUUM`, and removes the note
   (`desktop/wipe-pending.mjs`, `vacuumFile` in `desktop/migrate.mjs`). Whatever still fails stays
   in the note for the next start and never stops this one; the log says which. An ordinary start,
   with no note, does nothing here: free space in the file is normal after any edit, and rebuilding
   the file on every start would slow it for nothing. Then `dotami.db` in that folder is created or
   brought up to date by `desktop/migrate.mjs` (below).
4. **The server.** The self-contained Next.js server, started as an Electron utility process on a
   free port bound to `127.0.0.1` — reachable from this computer only. Its environment never
   carries a model key from the shell that started the app (`ANTHROPIC_API_KEY` is removed):
   DotAmi ships no key, and the person's model will come from the app's own settings ([9a]).
5. **The window.** It shows only DotAmi's own pages. New windows are refused; an `https` link to
   anywhere else opens in the person's own browser. The only permission granted is writing to
   the clipboard (the settings page's *Copy path*). A file the page saves (the calendar file, a
   playbook) goes where the person picks in a Save dialog, and Cancel saves nothing; a download that
   doesn't come from DotAmi's own page is cancelled (`saveDownload`, desktop-tested). Without that
   handler Electron showed its own built-in dialog, which a test can't answer (checked 2026-10-08).
   Electron's defaults stay on and are set
   explicitly: context isolation, sandbox, no Node in pages
   ([Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security), read
   2026-10-05).
6. **Updates** (installed app only) — see below.
7. **Menu.** File → Back up… · Restore from a backup… · Open data folder · Quit; Go → Home · Your
   ideas · Settings; View; Help → About · Check for updates · Licences (the `/licences` page) ·
   Source on GitHub.

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
  where an update was left half-done. One exception: when a Delete left a "wipe pending" note, the
  start finishes that wipe first (`VACUUM`, which keeps the contents and frees the deleted space), so
  such a file is rebuilt before these checks refuse it.
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
- **Third-party notices** (`desktop/notices.mjs`). The built code is minified and the server's
  `node_modules` keeps only the files it runs, so the packages' own licence files don't travel with
  them. `desktop:build` writes `THIRD-PARTY-NOTICES.txt` beside `server.js`: one entry per package
  in the server's `node_modules`, per package in DotAmi's dependencies (what the page code bundles,
  such as pdf.js and ofx-js), per package the app itself carries (electron-updater and what it pulls
  in), the code Next.js carries inside itself, Tailwind's base styles, the two fonts and Electron —
  each with its version, licence and the licence and notice files from the package, word for word
  (third-party notice files such as TypeScript's `ThirdPartyNoticeText.txt` included).
  A package with no licence file stops the build until `LICENCE_ELSEWHERE` in that file says where
  its terms are. `desktop:package` then refuses to package if any package in the app's or the
  server's `node_modules` has no entry for its exact version, copies the file beside `DotAmi.exe`,
  and checks that electron-builder put Electron's `LICENSE.electron.txt` and Chromium's
  `LICENSES.chromium.html` there too (it copies both from Electron's download). The app shows the
  file at Help → Licences (`/licences`). `npm run build` writes the same kind of list, without
  Electron, for a copy run from source.
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

**What the person sees** (`desktop/update-notice.mjs`; the app that is running shows it, so it first
appears on the update after the release that brings it): the moment a newer version is found, a
message — *"DotAmi <version> is available, downloading now"*, and that nothing changes until they
click *Restart and update* — and the app's taskbar button fills up as the download goes.
When the download is checked, that message closes itself and the usual question appears:
*Restart and update* or *Later*. A failed download clears the progress and says nothing was
installed. Until 0.2.1 the app said nothing until the whole download (about 130 MB) had finished,
so at start-up an update looked slow to appear (the maintainer, 2026-10-08).

Why a message plus the taskbar, and not something quieter: the message has no parent window, so it
doesn't block the app (the person can close it or just keep working); the taskbar progress alone
is what's easy to miss. A Windows notification can be silenced by *Do not disturb*, and a banner
inside the page would need a bridge from the app into its pages, which they don't have today.

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

### Updating on Windows: what runs when

Read 2026-10-08 in the versions this checkout locks (electron-updater 6.8.9, electron-builder's
`app-builder-lib` 26.15.3), for the one-click installer DotAmi builds (`desktop/package.mjs`:
`oneClick: true`, per user):

1. **The click.** *Restart and update* calls `autoUpdater.quitAndInstall()` with no arguments
   (`desktop/update-notice.mjs:79`). That means not silent, and "run the app afterwards" taken from
   `autoRunAppAfterInstall`, which defaults to true
   (`node_modules/electron-updater/out/BaseUpdater.js:13-16`, `AppUpdater.js:119`).
2. **The installer starts, the app quits.** The downloaded installer is started on its own
   (detached) with `--updated --force-run` (`NsisUpdater.js:107-113`, `BaseUpdater.js:129-140`);
   then, on the next turn of the event loop, the app quits normally (`BaseUpdater.js:17-22`), which
   stops DotAmi's server (`desktop/main.mjs`, `before-quit`).
3. **The installer closes any DotAmi still running — first, and only then.** Its first step
   (`node_modules/app-builder-lib/templates/nsis/installSection.nsh:33`) looks for any process
   started from the install folder; after an update it waits 0.3 s, then 1 s more if one is still
   there, then ends it — with PowerShell's `Stop-Process`, which ends a process outright (no chance
   to tidy up), or, without PowerShell, `taskkill`, which asks first and forces after another
   second (`include/allowOnlyOneInstallerInstance.nsh:105-160`, `:81-103`). The old version's
   uninstaller, which the installer runs and waits for next, does the same check at its own start
   (`uninstaller.nsh:2`, run from `include/installUtil.nsh:224`).
4. **Files, shortcuts, then the app.** It installs the new files and shortcuts, then — last —
   starts DotAmi once, through its Start-menu shortcut, with `--updated`
   (`installSection.nsh:66-75`, `:91-97`; `common.nsh:123-131`; `RUN_AFTER_FINISH` is on because
   DotAmi doesn't set `runAfterFinish: false`, `out/targets/nsis/NsisTarget.js:408`), and exits. It
   doesn't wait for the app or touch it afterwards.

**Does that explain the start of 2026-10-08,** killed right after its safety copy? Not by itself.
The installer ends DotAmi processes only before it installs, so the copy it ends is always the old
version; the start that was killed was the new one (its safety copy is named after a migration only
0.2.1 has: `dotami-before-20261006180658_figures-…`), and the installer starts that one last and
leaves it alone. What's left: the start was ended from outside (by the person or another program),
or it failed and its message was lost with the rest of that run's log. The log is now written
straight to the disk, so the next time it says more: a failure DotAmi catches leaves *"[desktop]
stopped: …"*; a start line followed by nothing was ended or crashed outside DotAmi's own error
handling (closed from the task manager, another program, or a crash in Electron or the database
engine). A launch turned away because another copy still holds the one-copy lock (for example a
new copy started while the old one is still quitting) writes no line at all, since the lock is
taken before the log is opened. Not changed, listed: the installer gives the
old version 1.3 s to quit before ending it outright (electron-builder's `customCheckAppRunning` macro
could lengthen that); with the database migrator's transactions and safety copy that is not a risk
to the data.

### Releasing an update

1. Bump `version` in `package.json` (e.g. `0.1.1`, or `0.2.0-dev.1` for a pre-release) in a PR.
   The same PR turns [Unreleased] in [`docs/privacy-log.md`](../privacy-log.md) (what DotAmi keeps,
   sends, ships and asks) into that version's dated section, as it does in `CHANGELOG.md`;
   `tests/privacy-log.spec.ts` fails until the version has one.
2. After it merges: `git tag v0.1.1 && git push origin v0.1.1`.
3. `.github/workflows/release.yml` checks the tag matches `package.json`, packages the app, runs
   the desktop test on the packaged app, builds the installer and uploads it to a **draft** release.
   Packaging writes the third-party notices from the packages it ships and stops if one has no
   entry (see *Building and packaging*); a new dependency with no licence file stops it here, so
   add that package to `LICENCE_ELSEWHERE` in `desktop/notices.mjs` in a PR first.
4. Read the draft on GitHub (for a pre-release, tick *Set as a pre-release*), then **Publish**.
   Before publishing, open the unpacked app's Help → Licences (or `THIRD-PARTY-NOTICES.txt` beside
   `DotAmi.exe` in a test install) and check it lists the version's new packages.
   Installed apps pick it up the next time they start.

## Tests

- `npm run test:desktop` builds the server and drives the app from this checkout;
  `DOTAMI_DESKTOP_EXE=<path to DotAmi.exe>` points the same test at a packaged app. Empty data
  folder → database created → describe a venture → the settings page shows the app's own data file
  and "nothing leaves this computer" although the app was started with a model key in its
  environment → an outside link goes to the browser, the window stays → close → start again → the
  venture is still there. CI runs it on Windows against the packaged app (`ci.yml` job
  "Desktop app (Windows)"). Delete ([8d]): an idea and a statement holding a marker string, a backup
  saved elsewhere and restored (which leaves a safety copy) → Delete with ideas, statements and the
  safety copies ticked → after closing, the marker is in no byte of `dotami.db` or `backups/` → the
  backup saved elsewhere still restores. And a wipe Delete couldn't finish: an ordinary start leaves
  the deleted words in the file (the control), a start with the "wipe pending" note removes them and
  the owed safety copy. The same run opens Help → Licences (Electron, the server's packages and
  electron-updater are listed) and checks every package in the server's `node_modules` has an entry
  for its exact version; on a packaged app, also that the notices, `LICENSE.electron.txt` and
  `LICENSES.chromium.html` sit beside `DotAmi.exe`.
- `tests/desktop-wipe-pending.spec.ts` — which files count as safety copies, that a link out of
  `backups/` is never followed, and that a start finishes a wipe only when the note is there.
- `tests/third-party-notices.spec.ts` — the notices generator and the packaging check on invented
  `node_modules` folders (a missing package, a nested or scoped one, another version, a package with
  no licence file), plus this checkout's own list: every dependency, every package the page code or
  the style sheet imports, and what `desktop/package.mjs` copies in. (Checked that it bites: six
  deliberate breaks, each fails it.)
- `tests/desktop-migrate.spec.ts` — the migrator against Prisma's own status check, plus the
  refuse / back up / undo cases.
- `tests/desktop-startup-log.spec.ts` — replays a start in its own process and kills it the moment
  the migrator reports its safety copy (the 2026-10-08 case): the log must still hold the start
  line and the backup line, and the database must be unchanged. (Checked that it bites: with the
  old background stream the log file isn't even there.) Also that `main.mjs` ships every file of
  its own that it imports.
- `tests/desktop-update-notice.spec.ts` — the update messages and taskbar progress, driven by a fake
  updater sending electron-updater's events: told at once, progress, the same *Restart and update* /
  *Later* question, installing only on that click, a failed download. (Checked that it bites: with
  the old code, 6 of its 7 cases fail; the one that passes is "installs only on the click".)

## Not done yet

- An automated test of a released update reaching an installed app. (It has happened by hand: the
  maintainer's computer went from 0.2.0 to 0.2.1 on 2026-10-08.)
- Not tested: a second launch while the first runs; an unwritable data folder; the app killed
  mid-save; a server that never answers; the update dialogs in the real app (they're tested with a
  fake updater, not against a release).
- An app icon (the default Electron icon is used); Mac and Linux builds.
