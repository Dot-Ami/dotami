# The desktop app — how it runs ([7b])

Status: 2026-10-05, first slice built: runs from a checkout (`npm run desktop`), not yet packaged
as an installer. Plan of record: [use-cases.md § The desktop app](use-cases.md#the-desktop-app--database-and-shell-go-given-2026-09-29).
Edge cases: [settings-and-edge-cases.md § The Electron app](settings-and-edge-cases.md#the-desktop-app).

## What happens when it starts

`desktop/main.mjs`, in order:

1. **Data folder.** The app's own folder (`%APPDATA%\DotAmi` on Windows), or `DOTAMI_DATA_DIR`
   if set. It must be writable, or the app says so and stops.
2. **One copy per data folder.** A second launch brings the first window forward.
3. **The database.** `dotami.db` in that folder, created or brought up to date by Prisma's own
   `prisma migrate deploy`, run with Electron's Node. Output goes to `logs/server.log` in the
   data folder. `CHECKPOINT_DISABLE=1` is set: without it the Prisma CLI reports to
   `https://checkpoint.prisma.io` on every run (found in `node_modules/prisma/build/index.js`,
   2026-10-05; Prisma's environment-variable reference doesn't list it).
4. **The server.** The self-contained Next.js server built by `desktop/build.mjs`, started as an
   Electron utility process on a free port bound to `127.0.0.1` — reachable from this computer
   only. Its environment never carries a model key from the shell that started the app
   (`ANTHROPIC_API_KEY` is removed): DotAmi ships no key, and the person's model will come from
   the app's own settings ([9a]).
5. **The window.** It shows only DotAmi's own pages. New windows are refused; an `https` link to
   anywhere else opens in the person's own browser. The only permission granted is writing to
   the clipboard (the settings page's *Copy path*). Electron's defaults stay on and are set
   explicitly: context isolation, sandbox, no Node in pages
   ([Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security), read
   2026-10-05).
6. **Menu.** File → Open data folder · Quit; Go → Home · Your ideas · Settings; View; Help →
   About (version, data folder) · Source on GitHub.

Anything that goes wrong says what happened in a dialog and quits — never a blank window.

## The build (`npm run desktop:build`)

`next build` in standalone mode into `.next-desktop/` (its own folder, so it never overwrites
the `.next` a running dev server uses), then:

- copies `public/` and the static assets in (the standalone server doesn't carry them —
  [Next.js `output`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output));
- **removes the project's `.env`**, which Next copies next to `server.js`, and a stray `.git`
  file the tracer swept in;
- **fails the build** if any git data, env file or database is still inside it.
- puts back `tsconfig.json` and `next-env.d.ts`, which `next build` rewrites for a new folder.

Why the build script and not `outputFileTracingExcludes`: Next 15.5 joins those globs with the
OS path separator, so on Windows they never match
(`node_modules/next/dist/build/collect-build-traces.js:503`).

## Tests

`npm run test:desktop` builds the server, then `e2e-desktop/desktop.spec.ts` drives the real app
on an empty temporary data folder: the database is created on first launch · a venture is
described and mapped · the settings page shows the app's own data file and says nothing leaves
the computer (the test starts the app with a model key in its environment, which must not reach
the server) · an outside link goes to the person's browser, the window stays on DotAmi · close,
start again, the venture is still there.

## Not done yet

- **An installer / double-click.** Packaging (the Prisma CLI and its engine must ship with it,
  about 40 MB of engines on Windows) and a Windows build in CI.
- Not tested yet: a second launch while the first runs; a data folder that can't be written;
  the app killed mid-save; a server that never answers.
- A backup before a migration changes an existing database ([7d]).
- The data folder can't be moved from the settings page yet ([7b]'s settings row).
