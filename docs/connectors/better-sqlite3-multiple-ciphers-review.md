# `better-sqlite3-multiple-ciphers` and Prisma's `better-sqlite3` adapter: a review

**Read on 2026-10-09**, for [database-encryption.md](../architecture/database-encryption.md) (encrypting
DotAmi's data file). Under the maintainer's rule for outside code (2026-10-07: a free library someone
else built, scanned and reviewed before use, pinned, its licence, advisories and network behaviour
checked, edited if needed), this page is the review **before** use: the packages were downloaded
into a scratch folder outside the repository with `npm pack`, unpacked and read. **Nothing was
installed into DotAmi, imported or run.** Nothing here is added to the app by this change.

| Package | Version read | Licence | What it is |
|---|---|---|---|
| [`better-sqlite3-multiple-ciphers`](https://github.com/m4heshd/better-sqlite3-multiple-ciphers) | 13.0.3 (2026-08-07) | MIT | `better-sqlite3` (the synchronous SQLite package for Node) built with [SQLite3 Multiple Ciphers](https://github.com/utelle/SQLite3MultipleCiphers), an encryption extension for SQLite |
| [`@prisma/adapter-better-sqlite3`](https://github.com/prisma/prisma/tree/main/packages/adapter-better-sqlite3) | 6.19.3 (matches DotAmi's Prisma) | Apache-2.0 | Prisma's own adapter that lets Prisma Client run its queries through `better-sqlite3` |
| `@prisma/driver-adapter-utils` (pulled in by the adapter) | 6.19.3 | Apache-2.0 | Prisma's shared adapter types and its debug logger |
| [`node-addon-api`](https://github.com/nodejs/node-addon-api) (the package's only dependency, `^8.0.0`) | 8.9.2 (latest in that range, `npm view`) | MIT | The Node.js project's C++ headers for writing Node-API add-ons: used to compile the binary, not loaded when it runs (below) |

## The short version

- **Licence: clean for the desktop app.** The package is MIT. The C code inside it is SQLite (public
  domain) and SQLite3 Multiple Ciphers (MIT), which itself bundles small pieces under MIT (AEGIS, by
  Frank Denis), BSD-3-Clause (SHA-2, by Olivier Gay), CC0-or-Apache-2.0 (Argon2's BLAKE2b), public
  domain (MD5, BearSSL-derived code) and MIT/Unlicense (miniz). **No LGPL or GPL text** in its
  sources (searched for `LGPL`, `GNU General`, `GNU Lesser`), so the rule since #119 (no LGPL in the
  desktop app) holds.
- **Network: none found.** Its JavaScript requires only `fs`, `path`, `util` and its own files; the
  Windows binary imports only `node.exe` and `KERNEL32.dll` (no `ws2_32.dll`, no WinHTTP, no URL
  strings). SQLite has no network code. The privacy inventory would list it as network "no".
- **Built for Electron without a compiler.** Version 13 uses Node-API: the Windows binary's imports
  are 72 `napi_` functions and no V8 symbols, so one file loads in Node and in Electron of any
  version, with no rebuild for Electron's own ABI (expected from the imports; **not run**). No
  install script (`"gypfile": false`); the eight platform binaries ship inside the package.
- **Built in public.** The binaries are built by the project's own GitHub Actions workflow
  (`build-and-publish.yml`) and published with npm provenance (an SLSA attestation on the registry for
  13.0.3), so `npm audit signatures` can check that the published package came from that workflow.
  The binaries were not rebuilt here from source to compare.
- **No known advisories** (GitHub's advisory database for the npm package, and the security
  advisories of both repositories, checked 2026-10-09). It bundles SQLite 3.53.4, current as of
  this review; SQLite's own security fixes are listed at [sqlite.org/cves.html](https://www.sqlite.org/cves.html)
  and a new SQLite means a new version of this package, so it has to be kept current, like pdf.js.
- **The adapter has no setting for a key**, writes dates differently from Prisma's built-in engine
  by default, and its debug output prints query values. All three are handled by DotAmi's own code
  (below); none needs the adapter edited.

## What was checked, and how

| What | How | Result |
|---|---|---|
| Versions, dates, licences, dependencies | `npm view`; each package's `package.json` and `LICENSE` | As in the table above. The package depends only on `node-addon-api`; the adapter on `better-sqlite3` and `@prisma/driver-adapter-utils`, which depends on `@prisma/debug` (already in DotAmi through Prisma) |
| Licences inside the C code | Searched the 369,498-line `deps/sqlite3/sqlite3.c` for licence and copyright lines and read each block | As listed above; no LGPL or GPL |
| What versions it bundles | `SQLITE_VERSION` and `SQLITE3MC_VERSION_STRING` in the sources; the same strings in the Windows binary | SQLite 3.53.4, SQLite3 Multiple Ciphers 2.4.0, in both |
| The Windows binary | A small read-only script (printable strings in the file; it never loads it) over `prebuilds/win32-x64.node`, 2,365,952 bytes | 72 `napi_` imports, 0 V8 symbols; DLLs `node.exe`, `KERNEL32.dll`; no network words; ciphers `chacha20`, `sqlcipher`, `aes128cbc`, `aes256cbc`, `ascon128`, `aegis` |
| The JavaScript | Read `lib/` in full (database, binding loader, wrappers) | Loads the binary for the platform from its own `prebuilds/` folder; `rowFactory` builds a small function with `Function(...)` to make row objects (as `better-sqlite3` does), which runs on the server, never in a page |
| Compile settings | `deps/defines.gypi` | `SQLITE_DEFAULT_FOREIGN_KEYS=1` (foreign keys on, as in `node:sqlite`), `SQLITE_USE_URI=0`, `SQLITE_DQS=0`, `SQLITE_OMIT_SHARED_CACHE`, among others |
| How a raw key is taken | SQLite3 Multiple Ciphers' `sqlite3mcExtractRawKey` and each cipher's call to it | `PRAGMA key = "x'<64 hex>'"` is used as the key itself, with no key derivation, for ChaCha20, SQLCipher, Ascon and AEGIS |
| Default cipher | `CODEC_TYPE_DEFAULT` in the source; the library's documentation | ChaCha20-Poly1305, with a 16-byte tag per page and 32 reserved bytes per page |
| Maintenance | GitHub repository data, releases, commits, contributors | Created 2021; 243 stars; at least 30 contributors (the first page of GitHub's list); last release 13.0.4-beta.0 on 2026-09-21; follows `better-sqlite3`'s releases, whose maintainers include this package's author. SQLite3 Multiple Ciphers: since 2018, 685 stars, pushed 2026-10-07, one main author |
| Advisories | `gh api advisories?ecosystem=npm&affects=…`; each repository's security advisories | None |
| Size | The tarball and its files | 34 MB unpacked (14 MB of C source, 20 MB for eight platforms' binaries); **2.4 MB** would ship (the Windows x64 binary and the JavaScript) |

SHA-256 of the tarballs read: `better-sqlite3-multiple-ciphers-13.0.3.tgz`
`24a11e221247fc003f755ad0f82126bc6b0295d0be1c06f3cb3e48d9db8eb898`;
`prisma-adapter-better-sqlite3-6.19.3.tgz`
`bfc4b28bae109e4b1e4c45283a11f6deb60a4433b142ce17a4667f66677677c7`.

## The adapter, read line by line where it matters

`@prisma/adapter-better-sqlite3` 6.19.3 is about 660 lines of compiled JavaScript.

- **Opening.** `createBetterSQLite3Client` strips `file:` from the URL, calls
  `new Database(path, options)` with the rest of the options, and turns on safe integers (whole
  numbers come back as `BigInt`, so nothing over 2^53 is rounded). It loads the package by the name
  `better-sqlite3`; an npm `overrides` entry would point that name at
  `better-sqlite3-multiple-ciphers`, whose interface is the same.
- **The override needs a guard.** The adapter's own dependency is `better-sqlite3 ^11.9.0`
  (`npm view @prisma/adapter-better-sqlite3@6.19.3 dependencies`). The real `better-sqlite3` 11.10.0
  runs `prebuild-install || node-gyp rebuild --release` when it installs, which downloads a binary
  from the internet, and it has no encryption. If the override ever stopped applying (a lockfile that
  drifted, a nested version range), that package, unreviewed, would be installed and shipped, and an
  install-time download is a network call DotAmi's source scan can't see. So the pull request that
  adds the packages adds a test that resolves `better-sqlite3` from the adapter's folder and checks it
  is `better-sqlite3-multiple-ciphers` at the pinned version, and fails if `package-lock.json` has a
  `node_modules/better-sqlite3` entry or any `prebuild-install`.
- **No key setting.** Neither 6.19.3 nor 7.10.0 (also read) has one. The connection it makes is an
  ordinary property (`client`) of the object its factory returns, so DotAmi's own factory can ask
  Prisma's to connect, run `PRAGMA key` on `client` before any query, check the file opens, and only
  then hand the connection to Prisma Client. A test fails if a future version moves `client`.
- **Dates.** `timestampFormat` defaults to `"iso8601"` (text such as `2026-10-09T00:00:00.000+00:00`);
  `"unixepoch-ms"` writes a whole number of milliseconds. Prisma's built-in engine writes milliseconds
  (measured 2026-10-09 on DotAmi's own schema: `User.createdAt` stored as `integer 1791578381103`), so
  DotAmi would set `"unixepoch-ms"` and test that old and new dates agree.
- **Transactions.** One connection, a lock around each transaction, `BEGIN` / `COMMIT` / `ROLLBACK`,
  only the `SERIALIZABLE` level (SQLite's only one). The same behaviour DotAmi relies on today.
- **Errors.** SQLite errors become Prisma's adapter errors carrying SQLite's own code and message;
  the message is SQLite's (for example "file is not a database"), not a query's values. DotAmi's
  rule that no error text reaches the log (`lib/prisma.ts`, `tests/error-logging.spec.ts`) is unchanged.
- **Debug output prints values.** Each query is passed to `debug("%O", query)`, arguments included.
  `@prisma/debug` prints only when the `DEBUG` environment variable names it. The desktop app's server
  environment must remove `DEBUG`, with a test, as it already removes the model key and the browser
  tests' rate-limit switch.

## What DotAmi would have to do (if the maintainer chooses this)

- Pin both packages exactly; `npm audit signatures` in the gate that adds them.
- List the package in `lib/privacy/inventory.ts` (ships, network "no"), the licence notices
  (`desktop/notices.mjs` reads the package's own `LICENSE`; SQLite3 Multiple Ciphers' notices are in
  its source headers, so the notices file needs them added), and leave the other platforms' binaries
  out of the installer (`desktop/left-out.mjs`).
- Copy it into the installed app beside the server too, because the migrator runs in Electron's main
  process, which loads packages from the app itself, not from the server's folder (the way
  `electron-updater` is copied today: `DESKTOP_APP_PACKAGES` in `desktop/notices.mjs`).
- Keep it current with SQLite's security releases.
- `node-addon-api` (MIT, 420 KB of C++ headers and a small `index.js` that gives their folder) comes
  in as the package's only dependency. Nothing in the package's JavaScript requires it (its
  `require` calls, listed from `lib/` on 2026-10-09, are `fs`, `path`, `util` and its own files), so
  it is only for compiling; the desktop server is built in Next's standalone mode, which copies only
  the files the server loads, so it shouldn't reach the installer. Expected, not checked: the pull
  request that adds the package lists the installer's files to confirm, and if it is there, it goes on
  the inventory and the notices like any shipped package.

## Installed (2026-10-10)

The maintainer chose this package on 2026-10-10. Installed pinned (`better-sqlite3` →
`npm:better-sqlite3-multiple-ciphers@13.0.3`, with an `overrides` entry, and
`@prisma/adapter-better-sqlite3` 6.19.3): the tarballs npm fetched have the SHA-256s above;
`npm audit signatures` verified the registry signatures of all 670 installed packages and 147
attestations; `npm audit --omit=dev` found 0 vulnerabilities. Loaded in Node 25.8 it reports SQLite
3.53.4 and SQLite3 Multiple Ciphers 2.4.0. The cost in time was measured first
([database-encryption.md § 14](../architecture/database-encryption.md#14-measured-before-anything-else-was-built-2026-10-10)).

## Not checked

- At the time of this review, loading or running anything: the performance, whether the binary loads
  in Electron 44's server process and main process, and the behaviour of `VACUUM INTO`, `serialize()`
  and the backup API on an encrypted file. Since measured or tested as the build goes (the section above).
- Rebuilding the binaries from source to compare with the published ones.
- Reading SQLite3 Multiple Ciphers' cipher code line by line (its licences, default cipher and key
  handling were read).
