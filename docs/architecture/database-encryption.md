# Encrypting the database file — design ([8i])

Status: **design, 2026-10-09, written before any code. Nothing is built, and the build waits for a
choice only the maintainer can make (§ 12).** The maintainer said yes (2026-10-09) to encrypting
DotAmi's database file, after the receipt files (the receipt encryption is pull request #128, not
merged yet; this design is written on `main` and names #128 where it reuses its key mechanism). The
receipts design priced this at about 8 to 12 working days. This page is what it would take, the
packages that could do it (each reviewed under the outside-code rule), and the questions.

The costs are my rough estimates in working days, not measurements. Every "measured" below says
how; everything else is read from code or documentation, and says so.

## The short version

- **What it protects:** the data file (`dotami.db`) and its safety copies, against another Windows
  account on the same computer, a copied or synced data folder, and a stolen disk without disk
  encryption. **Not** against anything running as the person (§ 1).
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
- **Why it stops here:** replacing how Prisma reaches the database, and adding a native package,
  are the maintainer's calls; the performance cost can't be measured until he allows the package to
  be installed and run (the review only reads it, as the HEIC review did); and what happens when
  the key is lost is a product choice (§ 10). The questions are in § 12.

## 1. What it protects, and what it doesn't

The same threat model as the receipts (#128). Encryption at rest means the data file on the disk is
unreadable without one key, and the key is kept so that only the person's own Windows account on
this computer can open it. It protects the data file and its safety copies against:

- **Another account on the same computer** (a family member's, a guest's) that can read the data
  folder: it finds a file it can't read.
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
- **A backup with no passphrase.** It holds the data file decrypted, so that it restores on another
  computer (§ 8); anyone with the file can read it. DotAmi says so when it makes one, as today.
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
  sets of behaviour to test.
- **The package goes on the privacy inventory's list of packages that ship** (network: no), the
  licence notices, and `desktop/left-out.mjs` drops the seven platform binaries the installer never uses.

## 4. The encrypted file

- **Whole-file, page by page**: SQLite3 Multiple Ciphers encrypts every page of the database as
  SQLite writes it, and is designed to encrypt the rollback journal's pages too (not measured: a test
  in § 11 scans a journal caught mid-transaction); nothing in the file is plain except what the cipher
  needs (a random 16-byte salt at the start). The file no longer begins with `SQLite format 3`,
  which is how DotAmi tells an encrypted file from a plain one.
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
  the encrypted file; the existing test that scans the file's bytes for a deleted marker string
  then proves both that the rows are gone and that nothing is plain.
- **The referee.** `tests/desktop-migrate.spec.ts` uses `prisma migrate status` to check the
  migrator; Prisma's schema engine can't open an encrypted file, so that comparison keeps running on
  a plain file (the migrator works the same with or without a key), and new tests run every
  migration on an encrypted file and check the bookkeeping table and the seeded data through the
  package.

## 6. Encrypting an existing plain file, once, at the first start

The desktop app, at a start where the key is open and the data file is still plain, encrypts it
before the migrator runs and before the server starts. **It never loses data:** at every moment
either the whole plain file or a whole, checked encrypted file is in place, and a note says which
step comes next.

1. **Check the plain file first**: open it (which lets SQLite finish or undo a transaction an
   earlier crash left), `PRAGMA integrity_check` must say `ok`. If not, nothing is changed and the
   start says so, as the migrator does for a half-done update.
2. **Write the encrypted copy** to `dotami.db.encrypting` (never overwriting anything), with the key,
   then flush it to the disk. How it is made is measured first in the build: a single SQLite copy
   into a keyed new file if the library supports it; otherwise a plain copy encrypted in place with
   `PRAGMA rekey` (documented), whose plain bytes are then wiped like the original's.
3. **Check the copy**: open it with the key; `integrity_check` says `ok`; every table has the same
   rows as the plain file (counted, and a SHA-256 over each table's rows in key order); Prisma's
   bookkeeping table is identical; and the copy does **not** open without the key.
4. **Write the note** `database-encrypting.json` (the step and the copy's size and SHA-256), flushed.
5. **Swap**: rename `dotami.db` to `dotami.db.plain-to-wipe`, then `dotami.db.encrypting` to
   `dotami.db`. Each rename is one step for the file system.
6. **Wipe the plain file**: overwrite `dotami.db.plain-to-wipe` with zeros, its whole length,
   flush, delete. Then delete the note.

**After a crash**, the next start reads the note: with no note, a leftover `.encrypting` is removed
(the plain file is still whole) and the encryption starts again; with the note, a missing `dotami.db`
and an `.encrypting` whose size and SHA-256 match the note mean "finish the swap"; an encrypted
`dotami.db` matching the note and a `.plain-to-wipe` mean "finish the wipe". A file that doesn't match
the note is never removed: the start stops with a plain sentence and the files stay for help.

**The plain safety copies already in `backups/`** (the migrator's `dotami-before-….db`, restore's
safety copy, a leftover `restore-staging.db`) hold everything the data file held. Each is encrypted the
same way, file by file (crash-safe the same way), then its plain bytes wiped. A file another program
has open stays as it is, still restorable, and is tried again at the next start. The log gets counts
only, never a name or a value.

**What it can't promise**, said in Settings: the overwrite makes the plain bytes unreadable through
the file system, not necessarily on the physical disk (§ 1).

## 7. Settings and *What DotAmi knows about you*

- **Settings → Data and backups** says, in the desktop app with the key open: the data file is
  encrypted, with a key only this Windows account can open; what that protects and what it doesn't
  (§ 1, in a few lines); that losing the key loses the data except what a backup holds (§ 10); and
  that a backup without a passphrase isn't encrypted. In a copy run from source: "This copy's data
  file isn't encrypted", and why (§ 9).
- ***What DotAmi knows about you*** says the same in one line beside the data file's path, and lists
  `database.key` among the files kept in the data folder (`lib/privacy/inventory.ts`, `FOLDERS` and the
  files list), with what removes it.
- The settings catalog gains no switch: encryption is on wherever there is a key store, as for the
  receipts. Whether people should be able to turn it off is not proposed.

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
- **Restoring** reads the backup's data file into memory, runs today's checks there (that it is
  whole, which migrations it has, that a newer DotAmi didn't make it), and writes it to the staging
  file **encrypted with this computer's key**; the swap is as today. Formats 1 and 2 restore the same
  way, since both hold a plain data file. A restore on a computer whose key can't be opened (§ 10)
  makes a new key first, because restoring is the way back.
- **The message after backing up** says plainly that a backup without a passphrase holds the data
  unencrypted. Whether to require a passphrase now is a question (§ 12).

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
or computer, or `database.key` or Electron's `Local State` file is deleted.

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
- **Not built without the maintainer's word** (§ 12): starting fresh while keeping the locked file;
  a recovery key the person writes down.

## 11. Tests (each must fail when its rule is removed)

- The file on the disk doesn't contain a marker string written through the app, in the data file,
  its journal mid-transaction, the safety copy and the staging file; a plain file does (the control).
- Prisma reads and writes through the adapter with the key; without the key, opening fails with
  DotAmi's sentence and nothing is changed.
- Dates: one written by the built-in engine before the move and one written after are stored the same
  way (an integer of milliseconds) and read back equal.
- The first-start encryption, killed at every step (after the copy, after the note, between the two
  renames, during the wipe): the next start finishes it, every seeded idea, figure, link, map
  progress, setting, expense record and receipt row survives, and the plain bytes are gone from the
  data folder.
- The migrator on an encrypted file: every migration applies, `Venture` and its children survive,
  the safety copy is encrypted.
- A backup of an encrypted file restores on a "second computer" (another data folder with another
  key), locked and not; real format-1 and format-2 backups still restore; no plain copy is written to
  the disk while backing up (a scan of the temporary folder).
- A lost key (a deleted `database.key`, a key file from another data folder): the app changes nothing
  and says so; restoring a backup works.
- `DEBUG` never reaches the server's environment.
- `e2e-desktop/desktop.spec.ts`: the real app encrypts a seeded plain folder at its first start and
  then shows the data; Settings says the file is encrypted.

## 12. For the maintainer: the choices, with what each costs

**Question 1 — how to encrypt** (the build can't start without it):

| Option | What changes for a person | What it costs | What it asks of DotAmi |
|---|---|---|---|
| **A. Prisma's driver adapter with `better-sqlite3-multiple-ciphers`** | The data file and its safety copies are unreadable without this Windows account; backups restore anywhere | About **9 to 11 days** in three pull requests (below); 2.4 MB in the installer; performance **not measured yet** | A native package (MIT, reviewed by reading, not yet run) in the app and the migrator; Prisma talking to the database through an adapter (Prisma's own, which Prisma 7 requires anyway) |
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

**Question 2 — when the key is lost** (§ 10), for the build of A:

| Option | What it gives | What it costs |
|---|---|---|
| **Backups only** (as receipts) | Restore a backup; anything since is lost | Nothing more; DotAmi says it in Settings and when it can't open the key |
| **A recovery key** | DotAmi shows a code once, for the person to write down or print; typing it in opens the data file anywhere | About +1.5 days; anyone who has the code and a copy of the data folder can read everything, so where it is kept matters |
| **Start fresh, keeping the locked file** | A button that moves the locked file and its key into `backups/` and starts empty | About +0.5 day; the old file can still be opened if the key comes back |

**Question 3 — backups:** a backup without a passphrase holds the data unencrypted (it has to, to
restore on another computer). Keep it optional with today's warning, or require a passphrase from
now on.

**My recommendation** (mine, not a fact): A, measured first; backups only plus *start fresh*, with
the warnings; the passphrase kept optional. Not a reason to prefer A on its own: the adapter is the
direction Prisma itself is going.

**The build, if A** (stacked pull requests, each reviewable on its own):

1. **The packages and the Prisma connection** (about 3 days): the measurements above; the two
   packages, reviewed, pinned and on the inventory, the notices and the left-out list; DotAmi's keyed
   adapter factory; the date format; `DEBUG` out of the server's environment; the key file (built on
   #128's key code once that merges); the server opening an encrypted file in the desktop app.
2. **The migrator and the first-start encryption** (about 3 to 4 days): `migrate.mjs` and the wipe on
   the new package; encrypting an existing file and the safety copies, crash-safe; the lost-key start;
   Settings and *What DotAmi knows about you*.
3. **Backups and restore** (about 2 to 3 days): no plain copy on the disk; restore writing the
   encrypted staging file; formats 1 and 2.

## 13. Not checked

- **Nothing was run.** The candidate packages were downloaded into a scratch folder outside the
  repository, unpacked and read, never installed or imported, as the HEIC review did: the outside-code
  rule reviews a package before it is used. So the performance cost, whether the prebuilt binary loads
  in Electron 44, and how `VACUUM INTO`, `serialize()` and the backup API treat an encrypted file are
  all unmeasured; each is named above where it matters.
- The prebuilt binaries were not rebuilt from source to compare; their npm provenance says they were
  built by the project's own GitHub Actions workflow.
- SQLite3 Multiple Ciphers' cipher code was not read line by line (tens of thousands of lines); its
  licence notices, its default cipher and how it takes a raw key were.
- A Mac: there is no Mac build of DotAmi yet; there `safeStorage` uses the Keychain.
