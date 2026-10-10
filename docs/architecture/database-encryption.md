# Encrypting the database file — design ([8i])

Status: **design, 2026-10-09, written before any code; the maintainer's decisions of 2026-10-10 are
below, and the build follows them in stacked pull requests.** The maintainer said yes (2026-10-09) to
encrypting DotAmi's database file, after the receipt files (the receipt encryption, pull request
#128, merged on 2026-10-10; this design names #128 where it reuses its key mechanism). The receipts
design priced this at about 8 to 12 working days. This page is what it would take, the packages that
could do it (each reviewed under the outside-code rule), and the questions.

The costs are my rough estimates in working days, not measurements. Every "measured" below says
how; everything else is read from code or documentation, and says so.

## The maintainer's decisions (2026-10-10)

The maintainer answered the four questions of § 12 with "ok lets do it" to these picks. Where a
section below still describes the choice as open, this list is what holds.

1. **How: option A.** Add the one small free library (`better-sqlite3-multiple-ciphers`) to encrypt
   the data file, and move DotAmi's database layer to Prisma's driver adapter
   (`@prisma/adapter-better-sqlite3`, which Prisma 7 requires anyway). The first build pull request
   installs the pinned packages and **measures** the start-up, page queries, the Delete wipe and a
   backup against today's numbers before anything else is built, and the build **stops for the
   maintainer's word** if a person would notice the slowdown.
2. **When the key is lost: backups only, plus a "Start fresh" button** that keeps the locked file
   (moved aside into `backups/`, never deleted), asked twice, saying plainly what is given up. No
   recovery key.
3. **Backups: a passphrase is required from now on**, because a backup without one holds the data
   decrypted and would undo the encryption. Backups made before this change, with or without a
   passphrase, still restore.
4. **A person may say no.** The window before the first encryption offers **Back up first…**,
   **Encrypt now**, **Not now** (asked again at a later start) and **Never** (with a plain warning,
   and a switch in Settings to turn encryption on later).

## The short version

- **What it protects:** the data file (`dotami.db`) and its safety copies, against an administrator
  account on the same computer while the person is signed out (a standard account can't open the
  folder even today), a copied or synced data folder, and a stolen disk without disk encryption.
  **Not** against anything running as the person (§ 1).
- **The key:** 32 random bytes, kept only wrapped by Windows' per-user protection (Electron's
  `safeStorage`, DPAPI on Windows), in a `database.key` file beside the data file, the same way #128
  keeps the receipts key. Never in the clear on the disk, never in a backup, never in the log (§ 2).
- **The hard part is the database library.** Prisma's built-in SQLite engine can't open an
  encrypted file, and nor can Node's own `node:sqlite`, which the desktop migrator, backups, restore
  and the Delete wipe all use. So encrypting the file means **moving Prisma to a "driver adapter"**
  (Prisma's own way of letting a JavaScript SQLite package do the reading and writing) **and adding
  a native SQLite package that encrypts** (§ 3).
- **Three packages could do it; one fits.** `better-sqlite3-multiple-ciphers` (MIT; SQLite plus the
  SQLite3 Multiple Ciphers extension, MIT) with Prisma's `@prisma/adapter-better-sqlite3`
  (Apache-2.0). `libsql` carries a network stack and an older SQLite, with an encryption that
  can't detect tampering; `@journeyapps/sqlcipher` has no Prisma adapter and compiles at install.
  The reviews: [better-sqlite3-multiple-ciphers](../connectors/better-sqlite3-multiple-ciphers-review.md),
  [libsql](../connectors/libsql-review.md), [SQLCipher packages](../connectors/sqlcipher-review.md).
- **What was decided:** the maintainer chose A on 2026-10-10, with the performance measured before
  anything else is built, backups only plus a "Start fresh" button when the key is lost, a passphrase
  required on every backup, and a person free to say "Not now" or "Never" (the list above; the
  questions as asked are in § 12).

## 1. What it protects, and what it doesn't

The same threat model as the receipts (#128). Encryption at rest means the data file on the disk is
unreadable without one key, and the key is kept so that only the person's own Windows account on
this computer can open it. It protects the data file and its safety copies against:

- **An administrator account on the same computer, while the person isn't signed in.** A standard
  account (a family member's, a guest's) already can't open the data folder: Windows gives only the
  person's own account, `SYSTEM` and the Administrators group access to it (read with `icacls` on
  `%APPDATA%`). So what encryption adds here is against an administrator account, and only while the
  person is signed out: an administrator can run a program as the person while they are signed in,
  which is the case below that isn't defended. And it is only as strong as the person's Windows
  password, as for a stolen disk.
- **A copied or synced data folder**: a copy of `%APPDATA%\DotAmi` on a USB stick, in a folder a
  cloud service syncs, or inside another computer's backup. The data file and `database.key` travel,
  but the key can't be opened on another computer or account. (One exception, said plainly: Windows
  accounts set up to roam between computers, as some workplaces do, can share this protection.)
- **A stolen disk or computer without disk encryption**: the data file is unreadable from the disk
  on its own. This is only as strong as the Windows account's password: Windows protects the key with
  it, so an account with no password, or a guessable one, gives little protection here. Disk
  encryption stays the stronger answer for a stolen computer, and Settings keeps saying how to turn it
  on.

It does **not** protect against:

- **Anything running as the person while DotAmi can open the file.** A program the person runs
  (malware, a script, an agent given their files) can ask Windows to open the key exactly as DotAmi
  does, or ask DotAmi's own server, which answers anything on this computer. That is the trust the
  rest of DotAmi already works with (the privacy review's "another program on this computer" row):
  stated, not defended.
- **What was on the disk before.** The plain data file that the first start of an encrypting
  version replaces is overwritten and removed (§ 6), but on a solid-state disk, and on file systems
  that keep old blocks, overwriting a file doesn't promise its old bytes are physically gone, and
  Windows' own shadow copies, File History or a synced folder may already hold copies. Disk
  encryption covers that; DotAmi can't.
- **Memory.** While DotAmi runs, the data it shows is in the memory of its server and window, and
  Windows can write memory to its page file. Disk encryption covers that too.
- **A backup made before this change without a passphrase.** It holds the data file decrypted;
  anyone with the file can read it. From this change on, every backup needs a passphrase (§ 8).
- **The receipts.** They are #128's subject, with their own key; this design changes nothing there.

## 2. The key

- **One random key per data folder**: 32 bytes from Node's `crypto.randomBytes`, made by the desktop
  app the first time a version with this feature starts.
- **Kept only wrapped by the operating system.** The file `database.key` beside the data file holds
  the key encrypted by Electron's `safeStorage`: on Windows that is DPAPI, Windows' protection for one
  account's secrets (Electron keeps its own key, itself protected by DPAPI, in the data folder's
  `Local State` file, and encrypts with it). It also holds the key's id (the first 8 bytes of a
  SHA-256 of the key), which isn't secret and lets DotAmi tell "another key" from "damaged".
- **The same code as #128's receipts key**, generalised to take a file name, with the rules #128
  found while building: the key is saved, and used, only once `Local State` holds Electron's own key
  (Electron writes it about ten seconds after a first start; a key wrapped before then couldn't be
  opened after a crash); on Linux, Electron's built-in fallback password counts as no key store.
- **A separate key from the receipts', on purpose.** The receipts' rules let DotAmi make a new key
  when no receipt is encrypted; the data file is never empty once DotAmi has run, so its key must
  never be replaced automatically once the file is encrypted. Two files keep the two rules apart, and
  let #128 merge unchanged. Both are lost together in practice (the same Windows protection opens both).
- **Never anywhere else in the clear**: not in the database, not in a backup (a backup holds the data
  decrypted, never `database.key`), not in the log, never sent anywhere. While the app runs the key is
  in the memory of its main process (which migrates the file and makes backups) and of its server
  process: the main process hands it to the server in the server's environment, and the server takes
  it out of its environment the first time it reads it, as #128 does.
- **How it is given to SQLite**: as a raw 256-bit key (`PRAGMA key = "x'<64 hex digits>'"`), which
  SQLite3 Multiple Ciphers accepts for its default cipher without running a key derivation function
  (read in its source, `sqlite3mcExtractRawKey`): the key is already random, so stretching it adds
  nothing, and opening stays fast.

## 3. How Prisma would open an encrypted file

**What can't today.** DotAmi opens `dotami.db` in two ways:

| Who opens it | With what | Can it open an encrypted file? |
|---|---|---|
| The app's server (every page and route) | Prisma 6.19's built-in engine (`query_engine-windows.dll.node`, 21 MB, Prisma's own SQLite inside) | No: it has no way to take a key |
| The desktop migrator, backups, restore, the Delete wipe (`desktop/migrate.mjs`, `desktop/backup.mjs`, `vacuumFile`) | `node:sqlite`, the SQLite built into Node and Electron | No: it is built without an encryption extension |
| `prisma migrate deploy` (a copy run from source) and the migrator's test referee (`prisma migrate status`) | Prisma's schema engine | No |

**The way through: Prisma's driver adapters.** Prisma Client can hand every query to a JavaScript
database package (an "adapter") instead of its own engine's SQLite: the generated queries are the
same, and the package does the reading and writing. Prisma's adapter for `better-sqlite3` has been
published since Prisma 6.7 (April 2025, npm). **Prisma 7 makes an adapter
compulsory for every database** (Prisma's upgrade guide, read 2026-10-09: "The way to create a new
Prisma Client has changed to require a driver adapter for all databases"), so DotAmi moves to one at
the Prisma 7 upgrade whatever is decided here; for SQLite the guide's example is
`@prisma/adapter-better-sqlite3`. In Prisma 6.19 the adapter needs no preview flag (read in
`@prisma/client`'s runtime); the Rust engine still ships alongside it, so nothing gets smaller yet.

**The candidates** (each reviewed in full in its own page; versions read 2026-10-09):

| | **A. `better-sqlite3-multiple-ciphers`** + `@prisma/adapter-better-sqlite3` | **B. `libsql`** + `@libsql/client` + `@prisma/adapter-libsql` | **C. `@journeyapps/sqlcipher`** (SQLCipher) |
|---|---|---|---|
| Licence | MIT (package); SQLite public domain; SQLite3 Multiple Ciphers MIT; the code bundled in it MIT, BSD, CC0/Apache-2.0, public domain. **No LGPL or GPL** found in the sources. Adapter Apache-2.0 | MIT (all three); adapter Apache-2.0 | BSD-3-Clause; SQLCipher BSD-style; needs OpenSSL (Apache-2.0) |
| SQLite inside | 3.53.4, SQLite3 Multiple Ciphers 2.4.0 (current) | 3.45.1 (January 2024) and SQLite3 Multiple Ciphers 1.8.1, read from the Windows binary; nine SQLite CVEs fixed since (sqlite.org/cves.html) | 3.51.3, inside a SQLCipher amalgamation |
| Encryption | Several ciphers; the default, ChaCha20-Poly1305, has a 16-byte authentication tag on every page, so a changed page fails to open | `aes256cbc` only, by default: AES-256-CBC with **no authentication** (the cipher's own documentation: "does not use a Hash Message Authentication Code"), so a changed page isn't detected | AES-256-CBC with an HMAC-SHA512 on every page |
| Prisma adapter | Prisma's own, maintained in Prisma's repository | Prisma's own | **None**: DotAmi would write and own one around an asynchronous callback interface |
| Network | None: its JavaScript requires only `fs`, `path`, `util` and its own files; the Windows binary imports only `node.exe` and `KERNEL32.dll` | **Yes, compiled in**: the Windows binary carries a TCP/TLS/HTTP stack (`ws2_32.dll`, tokio, rustls) for its sync-to-cloud feature, and `@libsql/client` carries HTTP and WebSocket clients; DotAmi's network check can't see inside a binary | None in SQLCipher; not read further |
| Windows build for Electron | Prebuilt, bundled in the package, Node-API only (72 `napi_` imports, no V8 symbols), so the same file loads in Node and Electron without rebuilding (expected, **not run**); built in the project's public GitHub Actions and published with npm provenance | Prebuilt Node-API binary (8.9 MB) | **Compiles at install** (`node-gyp rebuild`): needs Visual Studio's C++ tools, Python and OpenSSL's libraries on the build machine |
| Size added to the installer | 2.4 MB (one Windows binary; the package's other seven platform binaries are left out) | 8.9 MB plus the client's JavaScript | not measured |
| Maintenance | Released 13.0.3 2026-08-07, 13.0.4-beta 2026-09-21; its author also maintains `better-sqlite3`; SQLite3 Multiple Ciphers pushed 2026-10-07 | Active; Turso's newer database is a separate rewrite | 6.0.0 2026-04-29 |
| Advisories (GitHub, 2026-10-09) | None for the package or its repositories | None | None |
| Fits DotAmi | **Yes** | No: a network stack inside the binary, an old SQLite, and unauthenticated encryption | No: no adapter, a compile step on every machine that installs it |

Not candidates: `@signalapp/sqlcipher` is AGPL-3.0; SQLite's own encryption extension (SEE) is a
paid licence; a WebAssembly SQLite (`@sqlite.org/sqlite-wasm`) has no encryption and no Prisma
adapter for files on a disk.

**Other ways, without a new package** (for completeness; each costs more or protects less):

- **Encrypting columns in the app** with Node's `crypto`: every text and amount column DotAmi
  encrypts can no longer be sorted, searched or totalled by the database, every query that does so
  moves into JavaScript, and the table names, row counts, dates and sizes stay readable. Weeks, not
  days, and it leaks more than whole-file encryption.
- **Windows' own file encryption (EFS)** on the data folder: Windows Pro only (Home, the common
  edition, doesn't have it), and DotAmi would have to run Windows' `cipher` command. Same protection
  for Pro users, none for Home.
- **Disk encryption only** (today): Settings already says how to turn it on.

**How A would be wired** (read in the adapter's code; to be proved by tests in the build):

- `@prisma/adapter-better-sqlite3` loads the package named `better-sqlite3`; an npm `overrides`
  entry points that name at `better-sqlite3-multiple-ciphers` (same author line, same interface).
  **The override is guarded.** The adapter asks for `better-sqlite3 ^11.9.0` (`npm view`), and the
  real `better-sqlite3` has no encryption and downloads its binary when it installs
  (`prebuild-install || node-gyp rebuild`), a network call nothing in DotAmi's source scan would see.
  If the override ever lapsed (a drifted lockfile, a nested range), that unreviewed package would
  ship. So a test resolves `better-sqlite3` from the adapter's own folder and checks it is
  `better-sqlite3-multiple-ciphers` at the pinned version, and fails if `package-lock.json` has a
  `node_modules/better-sqlite3` entry or any `prebuild-install`.
- The adapter has no setting for a key. Its connection is a plain property on the object it returns
  (`client`), so DotAmi's own small adapter factory (about 30 lines, `lib/db/`) asks Prisma's factory
  to connect, then sets the key with `PRAGMA key` before any query, checks that the file opens
  (`SELECT count(*) FROM sqlite_master`), and only then hands the connection to Prisma. A wrong or
  missing key fails there, with DotAmi's own sentence, never later in the middle of a page.
- **Dates must stay the same shape.** Measured 2026-10-09 with DotAmi's own Prisma 6.19.3: its
  built-in engine stores every `DateTime` as a whole number of milliseconds (`User.createdAt` stored
  as `integer 1791578381103`; `PersonStatement.saidAt` as `integer 1791504000000`). The adapter's
  default writes ISO-8601 text instead (its `timestampFormat` option, default `"iso8601"`, read in its
  code). So DotAmi sets `timestampFormat: "unixepoch-ms"`, and a test reads a date written before the
  move and one written after, and compares the stored type and value.
- **Its debug output prints query values.** The adapter logs each query with its arguments when the
  `DEBUG` environment variable names it (`@prisma/debug`, read in its code). The desktop server's
  environment (`serverEnv` in `desktop/main.mjs`) removes `DEBUG`, and a test checks, like the model
  key and the rate-limit switch today. `lib/prisma.ts`'s rule (no error text in the log) stays as it is.
- **One way of opening, everywhere.** The adapter is used in every copy, the desktop app and a copy
  run from source alike, with a key only where there is one (§ 9). Two ways of opening would mean two
  sets of behaviour to test. That includes the tests: today 15 places outside `lib/prisma.ts` build
  their own Prisma Client on the built-in engine (found with `grep -rn "new PrismaClient"`:
  `prisma/seed.ts`, `e2e/app.spec.ts`, `e2e/your-data.spec.ts`, and `tests/bank-sources`,
  `db-roundtrip`, `expenses-receipt-viewer`, `expenses-receipts`, `expenses-store`, `expenses-typed`,
  `figures` (twice), `privacy-delete`, `privacy-holdings` and `settings-store` (twice)). Left there,
  they would pass while the adapter, the date format and the wipe on an encrypted file went untested.
  So every one of them moves to the same factory (keyed, or plain where a test needs a plain file),
  and a test fails if `new PrismaClient` appears anywhere but the factory. `tests/prisma-log.spec.ts` and
  `tests/error-logging.spec.ts` (no error text in the log) run on the adapter, so that rule is proved
  on the path the app uses, not assumed. This adds about a day to the first pull request (§ 12).
- **The package goes on the privacy inventory's list of packages that ship** (network: no), the
  licence notices, and `desktop/left-out.mjs` drops the seven platform binaries the installer never uses.

## 4. The encrypted file

- **Whole-file, page by page**: SQLite3 Multiple Ciphers encrypts every page of the database as
  SQLite writes it, and is designed to encrypt the rollback journal's pages too (not measured: a test
  in § 11 scans a journal caught mid-transaction); nothing in the file is plain except what the cipher
  needs (a random 16-byte salt at the start). The file no longer begins with `SQLite format 3`,
  which is how DotAmi tells an encrypted file from a plain one. **The check, exactly:** no file, or a
  file of 0 bytes, is a new database; a file whose first 16 bytes are `SQLite format 3` and a zero
  byte is plain; anything else is treated as encrypted and must open with the key. A plain file
  damaged at its start therefore reaches the "can't open with this computer's key" path, which
  changes nothing on the disk (§ 10) and says the file may be damaged as well as locked. Settings
  says "encrypted" only when this check says so, never because the feature exists.
- **Cipher: the library's default, ChaCha20-Poly1305** (its "sqleet" scheme): a 16-byte
  authentication tag per page, so a page changed on the disk fails to open instead of being read as
  something else; 32 bytes reserved on each 4 KB page (under 1 % more space). Raw key, so no key
  derivation (§ 2). The alternative, SQLCipher's own format (AES-256-CBC with an HMAC-SHA512 per page,
  80 bytes a page), matters only if the file should open in SQLCipher's own tools; with a key nobody
  sees (§ 10), it shouldn't need to.
- **Journal mode stays `delete`** (measured: DotAmi's file is `journal_mode delete`, 4096-byte pages).
  SQLite3 Multiple Ciphers can't encrypt a plain file in place while it is in WAL mode (its
  documentation), and DotAmi doesn't use WAL.
- **Foreign keys stay on by default**: the package is compiled with `SQLITE_DEFAULT_FOREIGN_KEYS=1`
  (read in its `deps/defines.gypi`), as `node:sqlite` is, so the migrator's rule about `Venture`
  (never copy, drop and rename it) holds unchanged.

## 5. The desktop migrator, the Delete wipe, the safety copies

- **`desktop/migrate.mjs` moves from `node:sqlite` to the new package**, in Electron's main process,
  opening the file with the key before anything else. Its interface is close to `node:sqlite`'s
  (`exec`, `prepare(...).run/get/all`), so the change is mostly how the file is opened. Everything it
  does today stays: Prisma's own bookkeeping table, a checksum per migration, refusing a file a newer
  DotAmi migrated or one left half-done, one transaction per migration.
- **The safety copy before an update** (`backups/dotami-before-<migration>-<time>.db`) is written
  **encrypted with the same key**, never plain. Which SQLite step does that (`VACUUM INTO` keeping the
  source's encryption, or the backup API into a keyed copy) isn't in the library's documentation, so
  it is measured first in the build, and a test scans the copy for a marker string.
- **The Delete wipe** (`vacuumFile`, and `VACUUM` through Prisma in `lib/privacy/delete.ts`) runs on
  the encrypted file, and it still matters: deleted words stay in the file's free pages until
  `VACUUM` (`lib/privacy/delete.ts`), and anything that later reads the file with the key (a program
  running as the person, or a backup made from its image, § 8) would find them there. **The existing proof stops working on an encrypted
  file.** `tests/privacy-delete.spec.ts` and `tests/desktop-wipe-pending.spec.ts` look for a deleted
  marker string in the file's raw bytes; once the file is encrypted the marker is never visible
  there, wiped or not, so those checks would pass even with the wipe removed, and the control ("a
  plain delete leaves the words in the file's bytes") would fail. So on an encrypted file the scan
  runs on the **decrypted page image**: the file opened with the key and its whole image read with
  `serialize()` (every page, free pages included), then searched for the marker. The tests keep the
  raw-byte scan on a plain file and the `freelist_count == 0` check, and gain a fail-first control:
  on an encrypted file, Delete with the `VACUUM` switched off must leave the marker in the decrypted
  image.
- **The referee.** `tests/desktop-migrate.spec.ts` uses `prisma migrate status` to check the
  migrator; Prisma's schema engine can't open an encrypted file, so that comparison keeps running on
  a plain file (the migrator works the same with or without a key), and new tests run every
  migration on an encrypted file and check the bookkeeping table and the seeded data through the
  package.

## 6. Encrypting an existing plain file, once, at the first start

**A new data folder** never has a plain file: its database is created encrypted from its first byte.
With #128's key code (§ 2), the very first start of a new folder waits about ten
seconds for Electron to save its own key in `Local State` before any key is used, and the migrator, which creates `dotami.db`, runs after that
wait, with the key. Only if no key store comes (#128 gives up after 30 seconds, or there is none) is
the file created plain; Settings then says it isn't encrypted (§ 4's check), and a later start with a
key encrypts it as below.

**An existing plain file** (anyone who used DotAmi before this version) is encrypted at the first
start where the key is open, before the migrator runs and before the server starts. **The person is
told first, and offered a backup** (below). **It never loses data:** at every moment either the
whole plain file or a whole, checked encrypted file is in place, and a note says which step comes
next.

0. **Tell the person, before anything changes.** A window before the main one says, in a few plain
   lines: the data file is about to be locked with a key only this Windows account can open; what
   that protects and what it doesn't (§ 1); that if the key is ever lost, everything not in a backup
   is lost (§ 10); and that an older DotAmi can't open the file afterwards (§ 7). It offers **Back up
   first…** (today's File → Back up… on the still-plain file, then back to this window),
   **Encrypt now**, **Not now** (the file stays unencrypted and the window is shown again at a later
   start) and **Never** (the file stays unencrypted and the window isn't shown again; a plain warning
   first says what that leaves unprotected, and Settings keeps a switch to turn encryption on at any
   later start). The maintainer's decision 4 (2026-10-10). The log records that the window was shown
   and which button was pressed, nothing else.
1. **Check the plain file first**: open it (which lets SQLite finish or undo a transaction an
   earlier crash left), `PRAGMA integrity_check` must say `ok`. If not, nothing is changed and the
   start says so, as the migrator does for a half-done update.
2. **Write the encrypted copy** to `dotami.db.encrypting` (never overwriting anything), with the key,
   then flush it to the disk. How it is made is measured first in the build: a single SQLite copy
   into a keyed new file if the library supports it; otherwise a plain copy encrypted in place with
   `PRAGMA rekey` (documented). That fallback makes a second plain file for a moment, so: the copy is
   disposable (a crash just means it is wiped and made again), the rekey runs with
   `journal_mode = OFF` so no plain journal of it is written, and any leftover
   `dotami.db.encrypting-journal` is overwritten with zeros before it is deleted.
3. **Check the copy**: open it with the key; `integrity_check` says `ok`; every table has the same
   rows as the plain file (counted, and a SHA-256 over each table's rows in key order); Prisma's
   bookkeeping table is identical; and the copy does **not** open without the key.
4. **Write the note** `database-encrypting.json` saying step `swap`, with the copy's size and
   SHA-256. **Written so it is never half there:** to `database-encrypting.json.tmp`, flushed, then
   renamed into place (one step for the file system).
5. **Swap**: rename `dotami.db` to `dotami.db.plain-to-wipe`, then `dotami.db.encrypting` to
   `dotami.db`. Each rename is one step for the file system. If the first rename fails (on Windows,
   another program holding `dotami.db` open gives `EPERM` or `EBUSY`), nothing has moved: the start
   says which file is busy and stops, and the next start redoes this step.
6. **Rewrite the note** (the same `.tmp`-then-rename way) to step `wipe`. From here the note no
   longer depends on `dotami.db`'s bytes, which change as soon as the app runs.
7. **Wipe the plain file**: overwrite `dotami.db.plain-to-wipe` with zeros, its whole length,
   flush, delete; the same for a `dotami.db.plain-to-wipe-journal` if one exists. Then delete the
   note.

**At every start, the files decide what happens next.** Every state the steps above can leave, and
its action:

| What is on the disk | How it got there | What the start does |
|---|---|---|
| No note; `dotami.db` plain; maybe a `.encrypting`, a `.encrypting-journal` or a `.tmp` note | a crash in steps 1 to 4 | zero-fill and delete the leftovers (a leftover copy may hold plain bytes, step 2), delete the `.tmp`, start again from step 1 |
| A note that can't be read, `dotami.db` plain | can't happen with step 4's rename, but handled | as the row above |
| Note `swap`; `dotami.db` plain; `.encrypting` matching the note | a crash between steps 4 and 5, or step 5's first rename failed | redo step 3's comparison against the plain file (something, such as a copy run from source, could have written to it since); if they still agree, redo from step 5; if not, zero-fill and delete the copy and the note and start again from step 1 |
| Note `swap`; no `dotami.db`; `.encrypting` matching the note | a crash between the two renames | finish step 5, then 6 and 7 |
| Note `swap`; `dotami.db` encrypted and matching the note; no `.encrypting` | a crash between steps 5 and 6 | do steps 6 and 7 |
| Note `wipe`; `dotami.db` encrypted (opens with the key); `.plain-to-wipe` present | a crash in step 7, or the wipe couldn't finish | finish step 7 |
| Note `wipe`; `dotami.db` encrypted; no `.plain-to-wipe` | a crash after the delete, before the note went | delete the note |
| Anything else (a copy that doesn't match the note, `dotami.db` missing with no copy, a note `wipe` with a `dotami.db` that won't open) | something outside DotAmi changed the files | remove nothing; stop with a plain sentence naming the files, which stay for help |

**When the wipe can't finish** (antivirus or a sync program holding `dotami.db.plain-to-wipe` open):
the start goes on, on the encrypted file; the note stays at `wipe`; the wipe is tried again at every
start; and while the plain copy exists, Settings says so in a line, as the Delete menu's
"wipe pending" note does today.

**A journal SQLite rolls back itself.** If an earlier crash left a plain `dotami.db-journal`, step 1's
open lets SQLite undo the half-done transaction, and SQLite deletes that journal, it doesn't
overwrite it. Its old bytes are then in the disk's free space, the same as anything DotAmi deleted
before this version (§ 1, "what was on the disk before"); disk encryption covers that.

**The plain safety copies already in `backups/`** (the migrator's `dotami-before-….db`, restore's
safety copy, a leftover `restore-staging.db`) hold everything the data file held. Each is encrypted the
same way, file by file (crash-safe the same way), then its plain bytes wiped. A file another program
has open stays as it is, still restorable, and is tried again at the next start; Settings says so
while it exists, as for the data file's own leftover. The log gets counts only, never a name or a
value.

**What it can't promise**, said in Settings: the overwrite makes the plain bytes unreadable through
the file system, not necessarily on the physical disk (§ 1).

## 7. Settings and *What DotAmi knows about you*

- **Settings → Data and backups** says, in the desktop app with the key open: the data file is
  encrypted, with a key only this Windows account can open; what that protects and what it doesn't
  (§ 1, in a few lines); that losing the key loses the data except what a backup holds (§ 10); and
  that every backup is locked with a passphrase the person chooses. In a copy run from source: "This copy's data
  file isn't encrypted", and why (§ 9).
- **Going back to an older DotAmi.** An older release opens the data file with `node:sqlite` and
  Prisma's built-in engine, so it can't open the encrypted file, nor the encrypted safety copies made
  before an update (§ 5): it stops with SQLite's own error and changes nothing. Settings, the window
  before the first encryption (§ 6, step 0) and the privacy log say so in one line: going back to an
  older version needs a backup (which holds the data decrypted, § 8), restored in that version.
- ***What DotAmi knows about you*** says the same in one line beside the data file's path, and lists
  `database.key` among the files kept in the data folder (`lib/privacy/inventory.ts`, `FOLDERS` and the
  files list), with what removes it.
- **The settings catalog gains a switch** (the maintainer's decision 4, 2026-10-10): people may
  decline. Encryption is on by default wherever there is a key store, as for the receipts; a person
  who chose **Never** in the window before the first encryption (§ 6, step 0) can turn it on from
  Settings, and it then happens at the next start, through the same steps. The switch is in the
  settings catalog and Part 1 of [settings-and-edge-cases.md](settings-and-edge-cases.md).

## 8. Backups and restore

- **A backup restores on another computer**, whose key differs: File → Back up… writes the data
  file's **decrypted** bytes into the backup (inside the passphrase's AES-256-GCM when there is one),
  the same as today's format 2, so a backup made before this change and one made after look the same,
  and restore anywhere. The backup never holds `database.key`.
- **No plain copy on the disk while backing up.** Today the backup writes a `VACUUM INTO` copy to a
  temporary folder first. With the file encrypted, that copy would be the whole database in plain
  text on the disk. Instead the decrypted bytes go straight into the backup stream from memory (the
  database is small; receipts are separate files). Whether the library's `serialize()` of an
  encrypted connection gives the plain page image is not in its documentation, so it is the first
  thing measured in the backups slice; if no way keeps the plain bytes off the disk, the build stops
  and says so.
- **Rebuilt before it is written, so deleted words stay out of backups.** A page image is the whole
  file, free pages included, and free pages hold words that were deleted or edited over since the
  last `VACUUM` (`tests/privacy-delete.spec.ts`'s control shows them there after an ordinary delete).
  Today's `VACUUM INTO` builds the copy from the live rows only, so they never reach a backup, and
  that must stay true. So the image is loaded into a second, in-memory connection (the package's
  `new Database(image)`, which opens a serialized image in memory, read in its `lib/database.js`),
  `VACUUM` runs there, and only that rebuilt image is serialized into the backup.
  (`VACUUM INTO` an in-memory address isn't available: the package is built with `SQLITE_USE_URI=0`,
  per its review.) A test: a marker removed with an ordinary delete, no wipe, must not appear in
  the data file a backup holds once unlocked with its passphrase, and the control (the image before
  the rebuild) must hold it.
- **Restoring** reads the backup's data file into memory, runs today's checks there (that it is
  whole, which migrations it has, that a newer DotAmi didn't make it), and writes it to the staging
  file **encrypted with this computer's key**; the swap is as today. Formats 1 and 2 restore the same
  way, since both hold a plain data file. A restore on a computer whose key can't be opened (§ 10)
  makes a new key first, because restoring is the way back.
- **A passphrase is required from now on** (the maintainer's decision 3, 2026-10-10): a backup
  without one would hold the data decrypted and undo the encryption, so File → Back up… no longer
  offers to leave it out. Backups made before this change, with or without a passphrase, still
  restore.

## 9. A copy run from source has no key store

A copy started with `npm run dev` or `npm start` is a plain Node server with no Electron, so it has
no operating-system key store. **Decided in this design, the same rule #128 sets for receipts:**
DotAmi does not invent a key file of its own there (a key beside the file it locks protects
nothing), and **the data file stays unencrypted in a copy run from source**. That is said, not
hidden: Settings and *What DotAmi knows about you* say "This copy's data file isn't encrypted", why,
and that the desktop app encrypts it. The same if the desktop app finds no key store and has never
encrypted the file. A copy from source pointed at the desktop app's encrypted file can't open it, and
says so in a sentence naming the copy that can; it never shows a damaged-file error and never
changes the file.

## 10. Losing the key

The key can't be opened if the Windows profile is reset, an administrator resets the account's
password (Windows then can't open what DPAPI protected), the data folder is moved to another account
or computer, or `database.key` or Electron's `Local State` file is deleted. **Or, with nobody doing
anything, if `Local State` is damaged:** it is a Chromium settings file that Chromium rewrites while
running, and makes again, with a new key, if it finds it damaged (a crash or an antivirus program
cutting a write short). Everything wrapped with the old key then can't be opened.

Two cheap checks, part of the build: right after `database.key` is written, it is read back from the
disk and opened before the key is used for anything (so a key that couldn't be opened is never used
to lock the file); and at every start the key is opened before anything else, so a key that worked
last time and doesn't now is found at once and said plainly (below), never in the middle of a page.
Neither check can bring a lost key back; only a backup or a recovery key (§ 12, question 2) can.

**Then everything in the data file is lost, except what a backup holds.** This is the real cost of
the feature, and bigger than for receipts: the data file is everything (ideas, figures, expense
records, statements, settings). Restoring a backup brings it back under a new key.

When the app starts and can't open the key:

- **It changes nothing on the disk.** The key may come back (a profile that loads later, a
  `database.key` put back from the Recycle Bin), so the data file and the key file stay exactly as
  they are, and a missing `database.key` is **never** replaced while the file is encrypted.
- **It says so before any window opens**, in plain words: what happened, that nothing was changed,
  that putting `database.key` back (if it was moved or deleted) brings everything back, and the way
  forward that needs no new decision: **File → Restore from a backup…**, which moves the locked data
  file and its key file into `backups/` (never deleting them) and restores the backup under a new key.
- **Start fresh, keeping the locked file** (the maintainer's decision 2, 2026-10-10): a button in
  the same window, asked twice, which says plainly what is given up (everything in the locked file
  not in a backup, unless its key comes back), then moves the locked data file and its key file into
  `backups/` (never deleting them) and starts with an empty, encrypted data file under a new key.
  There is no recovery key.

## 11. Tests (each must fail when its rule is removed)

- The file on the disk doesn't contain a marker string written through the app, in the data file,
  its journal mid-transaction, the safety copy and the staging file; a plain file does (the control).
  (This raw scan proves only that nothing is plain; whether deleted words are gone is proved on the
  decrypted image, below.)
- Prisma reads and writes through the adapter with the key; without the key, opening fails with
  DotAmi's sentence and nothing is changed.
- Dates: one written by the built-in engine before the move and one written after are stored the same
  way (an integer of milliseconds) and read back equal.
- The first-start encryption, killed at every step (after the copy; after the note, before the
  first rename; with the first rename refused because the file is held open; between the two
  renames; after the swap, before the note says `wipe`; during the wipe; after the plain file is
  deleted, before the note is): the next start finishes it, every seeded idea, figure, link, map
  progress, setting, expense record and receipt row survives, and the plain bytes are gone from the
  data folder (a raw scan for the marker over every file there, journals included). Plus a note that
  can't be read, and a plain file written to after the copy was made (the copy is thrown away and
  made again, never swapped in).
- A new data folder: its database is encrypted from the first byte (the raw scan never finds the
  marker in any file, at any moment the test looks); with no key store, it is plain and Settings
  doesn't say "encrypted".
- The window before the first encryption: shown once for an existing plain file, never for a new
  folder or an already-encrypted file; **Back up first…** makes a backup of the still-plain file
  that restores.
- The Delete wipe on an encrypted file: the marker is gone from the **decrypted** page image
  (`serialize()`) and `freelist_count` is 0; the control, Delete with `VACUUM` switched off, leaves
  the marker in that image. The raw-byte scan and its control stay for a plain file.
- A backup of an encrypted file, unlocked with its passphrase, doesn't contain a marker removed with
  an ordinary delete (no wipe); the image before the rebuild does (the control). A backup can't be
  made without a passphrase.
- Every Prisma Client is made by the one factory: a test fails on `new PrismaClient` anywhere else.
- `better-sqlite3` resolved from the adapter's folder is `better-sqlite3-multiple-ciphers` at the
  pinned version; `package-lock.json` has no `node_modules/better-sqlite3` and no `prebuild-install`.
- The migrator on an encrypted file: every migration applies, `Venture` and its children survive,
  the safety copy is encrypted.
- A backup of an encrypted file restores on a "second computer" (another data folder with another
  key), locked and not; real format-1 and format-2 backups still restore; no plain copy is written to
  the disk while backing up (a scan of the temporary folder).
- A lost key (a deleted `database.key`, a key file from another data folder, a damaged
  `Local State`): the app changes nothing and says so; restoring a backup works. A key file that
  can't be read back right after it is written is never used.
- `DEBUG` never reaches the server's environment.
- `e2e-desktop/desktop.spec.ts`: the real app encrypts a seeded plain folder at its first start and
  then shows the data; Settings says the file is encrypted.

## 12. For the maintainer: the choices, with what each costs

**Answered on 2026-10-10** (see "The maintainer's decisions" at the top): A, measured first; backups
only plus *Start fresh*; a passphrase required; and yes, a person may say no ("Not now" and "Never",
with a switch in Settings). The questions are kept below as they were asked.

**Question 1 — how to encrypt** (the build can't start without it). Each option in one plain
sentence first; the package names and details are in the table and the linked reviews.

- **A (recommended).** Add one small, free library that locks the data file, and change how DotAmi's
  database layer talks to the file so it can use it (a change Prisma, the database layer, will
  require anyway at its next major version). About 10 to 12 days; the installer grows by 2.4 MB;
  whether pages get slower is not known until it is measured.
- **B.** The same with a different library. Not recommended: it carries code for talking to the
  internet inside it, an older SQLite, and a lock that can't tell if the file was tampered with.
- **C.** The same with the best-known locking library. Not recommended: DotAmi would have to write
  and maintain its own connection to it, and every machine that builds DotAmi would need a compiler.
- **D.** No new library: DotAmi scrambles the words and amounts itself, column by column. Weeks of
  work, and the shape of the data (dates, counts, sizes) stays readable.
- **E.** Not now: the data file keeps relying on the computer's disk encryption, as today.

| Option | What changes for a person | What it costs | What it asks of DotAmi |
|---|---|---|---|
| **A. Prisma's driver adapter with `better-sqlite3-multiple-ciphers`** | The data file and its safety copies are unreadable without this Windows account; backups restore anywhere | About **10 to 12 days** in three pull requests (below); 2.4 MB in the installer; performance **not measured yet** | A native package (MIT, reviewed by reading, not yet run) in the app and the migrator; Prisma talking to the database through an adapter (Prisma's own, which Prisma 7 requires anyway) |
| **B. `libsql`** | Same | About the same days; 8.9 MB | A native binary with a network stack inside it, an older SQLite, and encryption that can't detect a changed page. **Not recommended** |
| **C. SQLCipher through `@journeyapps/sqlcipher`** | Same | Several more days to write and own a Prisma adapter; a compiler, Python and OpenSSL on every build machine | Owning a database adapter. **Not recommended** |
| **D. Encrypt columns in the app** | Most words and amounts unreadable; table names, counts, dates and sizes readable | Weeks; every sort, search and total moved out of the database | No new package |
| **E. Not now** | As today: the data file relies on disk encryption, which Settings explains | Nothing | Nothing |

**If A:** the first step of the first pull request installs the two packages (pinned, their
signatures and provenance checked with `npm audit signatures`) and measures, on this computer, before
anything else is built: the app's start, an ideas page and the Expenses page's queries, the Delete
wipe and a backup, each with today's engine, with the adapter on a plain file, and with the adapter
on an encrypted file. The numbers go in the pull request; a difference a person would notice is
reported, and the build stops for your word.

**Question 2 — when the key is lost** (§ 10), for the build of A. The key can be lost without the
person doing anything (a damaged Windows settings file, an administrator resetting the password), so
"backups only" is safe only for someone who has a recent backup; the window before the first
encryption offers one (§ 6), but nothing makes people keep backing up.

| Option | What it gives | What it costs |
|---|---|---|
| **Backups only** (as receipts) | Restore a backup; anything since is lost | Nothing more; DotAmi says it in Settings, in the window before the first encryption, and when it can't open the key |
| **A recovery key** | DotAmi shows a code once, for the person to write down or print; typing it in opens the data file anywhere | About +1.5 days; anyone who has the code and a copy of the data folder can read everything, so where it is kept matters |
| **Start fresh, keeping the locked file** | A button that moves the locked file and its key into `backups/` and starts empty | About +0.5 day; the old file can still be opened if the key comes back |

**Question 3 — backups:** a backup without a passphrase holds the data unencrypted (it has to, to
restore on another computer). Keep it optional with today's warning, or require a passphrase from
now on.

**Question 4 — may a person say no?** Someone who already uses DotAmi is shown a window before their
existing file is first encrypted, with **Back up first…** and **Encrypt now** (§ 6, step 0). Should it
also offer **Not now**, keeping the file unencrypted?

| Option | What it gives | What it costs |
|---|---|---|
| **No: tell and offer a backup, then encrypt** (what the build does until you decide) | Everyone's file is encrypted; nobody is surprised, and everyone is offered a backup first | Nothing more; someone who would rather not risk losing the key can't decline |
| **Yes, "Not now", asked again at a later start** | The person decides when | About +0.5 day; a switch in Settings (in the settings catalog), and Settings saying the file isn't encrypted while it isn't |
| **Yes, "Never", with a switch in Settings to turn it on later** | The person decides whether | About +1 day; the same, plus encrypting from Settings at any later start |

**My recommendation** (mine, not a fact): A, measured first; backups only plus *start fresh*, with
the warnings; the passphrase kept optional; question 4 is yours alone, since it is about what people
are asked. Not a reason to prefer A on its own: the adapter is the direction Prisma itself is going.
(Kept as written before the answer: the maintainer chose to require the passphrase, and to let a
person say "Not now" or "Never"; the decisions at the top hold.)

**The build, if A** (stacked pull requests, each reviewable on its own):

1. **The packages and the Prisma connection** (about 4 days): the measurements above; the two
   packages, reviewed, pinned and on the inventory, the notices and the left-out list, with the test
   that the override holds; DotAmi's keyed adapter factory, and every place that builds a Prisma
   Client today (15, § 3) moved to it; the date format; `DEBUG` out of the server's environment; the
   key file (built on #128's key code once that merges); the server opening an encrypted file in the
   desktop app.
2. **The migrator and the first-start encryption** (about 3.5 to 4.5 days): `migrate.mjs` and the
   wipe on the new package, with the wipe's proof moved to the decrypted image; a new folder created
   encrypted; the window before the first encryption; encrypting an existing file and the safety
   copies, crash-safe in every state of § 6's table; the lost-key start; Settings and *What DotAmi
   knows about you*.
3. **Backups and restore** (about 2.5 to 3 days): no plain copy on the disk; the image rebuilt before
   it is written; restore writing the encrypted staging file; formats 1 and 2.

## 13. Not checked

- **Nothing was run** while this design was written. The candidate packages were downloaded into a
  scratch folder outside the repository, unpacked and read, never installed or imported, as the HEIC
  review did: the outside-code rule reviews a package before it is used. Since the maintainer's choice
  (2026-10-10), A is installed and measured (§ 14), and `serialize()` of an encrypted connection was
  seen to give the plain page image (the measurement's backup step checks it); whether the binary
  loads in Electron 44's server and main processes is proved by the desktop tests of each pull request.
- The prebuilt binaries were not rebuilt from source to compare; their npm provenance says they were
  built by the project's own GitHub Actions workflow.
- SQLite3 Multiple Ciphers' cipher code was not read line by line (tens of thousands of lines); its
  licence notices, its default cipher and how it takes a raw key were.
- A Mac: there is no Mac build of DotAmi yet; there `safeStorage` uses the Keychain.

## 14. Measured, before anything else was built (2026-10-10)

The maintainer's decision 1: install the two packages, measure against today's numbers, and stop if a
person would notice. Measured on the maintainer's computer (Windows 11, Node 25.8) with
`npx tsx scripts/measure-database-adapter.ts typical` and `… large`, which seed a data file, copy it,
encrypt the copy with a raw key, and time the same work three ways: today's built-in engine on the
plain file, the adapter on the plain file, and the adapter on the encrypted file. Medians, in
milliseconds; "typical" is 5 ideas, 400 expense records, 120 figures and 30 statements (a 300 KB
file), "large" is 25 ideas, 5,000 records, 2,000 figures and 300 statements (2.3 MB).

| What | Typical: today | adapter | encrypted | Large: today | adapter | encrypted |
|---|---:|---:|---:|---:|---:|---:|
| Start: load Prisma (and the adapter) | 31.3 | 47.1 | 49.4 | 61.8 | 91.2 | 89.3 |
| Start: open the file, first query | 16.2 | 19.7 | 20.0 | 49.4 | 38.1 | 42.4 |
| Start: the desktop migrator opens the file and reads its table | 0.7 | 1.0 | 1.2 | 1.2 | 1.6 | 1.9 |
| The ideas page's query | 2.1 | 5.4 | 2.7 | 7.4 | 4.6 | 3.8 |
| An idea's map | 1.0 | 1.9 | 1.3 | 3.3 | 1.7 | 1.4 |
| The Expenses page (every record) | 19.7 | 20.0 | 18.7 | 352.8 | 242.0 | 211.7 |
| *What DotAmi knows about you* | 15.7 | 13.7 | 12.5 | 96.1 | 95.2 | 92.4 |
| Delete's wipe (`VACUUM`) | 10.9 | 10.7 | 13.5 | 47.6 | 33.9 | 54.2 |
| A whole backup with a passphrase, today | 320.0 | | | 307.9 | | |
| The backup's data-file copy step (today `VACUUM INTO` a file; encrypted: the decrypted image read into memory and rebuilt there) | 10.6 | | 3.9 | 22.1 | | 17.4 |

**Reading it:** the one cost that grows is loading the adapter at start, 16 to 30 ms once per start
(the desktop app's start already waits for its server for seconds). Every page's query is within a few
milliseconds of today's, faster on the large file; the encryption itself adds 0 to 20 ms to the wipe
and nothing measurable to a page. Today's backup is about 300 ms, almost all of it the passphrase's
key derivation (scrypt), which doesn't change; its copy step is faster in memory. **No person would
notice, so the build goes on.** The runs vary by a few milliseconds between tries (the same row
measured twice differed by up to 5 ms); the script is in the repository to run again.

**Found while building the first pull request** (none of these needed a choice from the maintainer;
each is handled in `lib/db/client.ts` and tested):

- **A transaction could swallow another request's write.** The adapter has one connection; a query
  from another request that arrived while an interactive transaction was open ran inside it, and was
  undone with it when it rolled back, with no error (measured: the write was gone; Prisma's built-in
  engine kept it). DotAmi's client now makes every query wait its turn, a transaction holding the turn
  until it ends; `tests/database-client.spec.ts` shows the write kept, and the adapter on its own
  losing it (the control).
- **"Database is locked" lost its words.** The adapter reports SQLite's busy error with a kind Prisma
  6.19's engine doesn't know, so the error said "unknown variant `SocketTimeout`" instead of SQLite's
  "database is locked". DotAmi's client passes it on as SQLite's own error, as the engine did
  (`tests/privacy-delete.spec.ts`'s locked-wipe tests failed until it did).
- **Prisma connects as soon as a client is made**, so a file that can't be opened (no `DATABASE_URL`,
  the wrong key) became an error nothing waited for. The file is opened at the first query instead,
  inside the first turn, and the failure is that query's error.
- **`npm ci` tried to compile the package.** Its `package.json` says `"gypfile": false` (don't compile:
  the prebuilt files are inside), but npm writes the lockfile without that field and `npm ci` reads each
  package from the lockfile, so it saw the package's `binding.gyp` and ran `node-gyp rebuild`, which
  needs Visual Studio's C++ tools and failed on this computer, which has none (measured: `npm ci`
  failed; with the field in the lockfile it installed). The field is now in `package-lock.json`, and
  `tests/database-package.spec.ts` fails, naming `node scripts/keep-gypfile.mjs`, when npm rewrites
  the lockfile and drops it (any `npm install <package>`, or a Dependabot update, does). A question
  for the maintainer (the pull request's "Open"): keep this, or vendor an edited copy of the package,
  or install C++ tools on every computer that installs DotAmi's code.
- **The package's types can't be reached by its name** (its `exports` map leaves out `index.d.ts`), so
  `lib/db/better-sqlite3.d.ts` describes the part DotAmi uses.
- **The desktop build copied all eight systems' prebuilt SQLite** (20 MB); it keeps this computer's
  one (`desktop/left-out.mjs`, `removeOtherPlatformBuilds`), and the build stops if it isn't there.
  `node-addon-api` (the package's compile-time headers) isn't copied into the server; it is listed in
  the notices as one of DotAmi's dependencies' packages, as every package they pull in is.
