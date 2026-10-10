# SQLCipher packages for Node: a review

**Read on 2026-10-09**, for [database-encryption.md](../architecture/database-encryption.md) (encrypting
DotAmi's data file), under the maintainer's rule for outside code. Downloaded into a scratch folder
outside the repository with `npm pack`, unpacked and read. **Nothing was installed into DotAmi,
imported or run**, and nothing is added to the app by this change.

[SQLCipher](https://github.com/sqlcipher/sqlcipher) (Zetetic, BSD-3-Clause, 7,301 stars, pushed
2026-10-09) is the best-known encrypted SQLite: AES-256-CBC with an HMAC-SHA512 on every page and a key
derived with PBKDF2 (or a raw key). Its own project publishes no Node package; these do:

| Package | Version read | Licence | What it is |
|---|---|---|---|
| [`@journeyapps/sqlcipher`](https://github.com/journeyapps/node-sqlcipher) | 6.0.0 (2026-04-29) | BSD-3-Clause | A fork of the `sqlite3` package (asynchronous, callback style) built with a SQLCipher amalgamation (SQLite 3.51.3 inside; the SQLCipher release itself isn't named in the package) |
| `@signalapp/sqlcipher` | 4.1.0 (2026-08-20) | **AGPL-3.0-only** | Signal's own; not a candidate (the AGPL would apply to the whole app) |
| `@signalapp/better-sqlite3` | 9.0.13 (last published 2025-11-03) | MIT | Signal's earlier fork of `better-sqlite3` with SQLCipher; superseded by `@signalapp/sqlcipher`, two major versions behind `better-sqlite3`; not read further |

## `@journeyapps/sqlcipher`: not recommended

- **No Prisma adapter.** Prisma has adapters for `better-sqlite3` and libSQL, not for the `sqlite3`
  package's asynchronous interface. DotAmi would write and own one (several days, and every Prisma
  upgrade would be DotAmi's to keep up with), or stop using Prisma for its data.
- **Compiles at install.** Its install script is `node-gyp rebuild`: every computer that runs
  `npm ci` for DotAmi (contributors, CI, the release build) would need Visual Studio's C++ tools and
  Python. On Windows its `deps/sqlite3.gyp` links OpenSSL's `libcrypto` from a `deps/OpenSSL-Win64`
  folder that the published package doesn't contain, so OpenSSL's libraries would have to be supplied
  too (read in the file; not tried).
- **Licence:** BSD-3-Clause, SQLCipher BSD-style, OpenSSL Apache-2.0: none is a problem.
- **Advisories:** none in GitHub's database or the repositories (checked 2026-10-09). It bundles
  SQLite 3.51.3; SQLite has fixed CVEs in 3.52.0 and 3.53.2 since ([sqlite.org/cves.html](https://www.sqlite.org/cves.html)).
- **Maintenance:** 210 stars; last release 2026-04-29.

The SQLCipher **file format** is still available without this package: SQLite3 Multiple Ciphers (in
`better-sqlite3-multiple-ciphers`, [its review](better-sqlite3-multiple-ciphers-review.md)) reads
and writes it as one of its ciphers.

SHA-256 of the tarball read: `journeyapps-sqlcipher-6.0.0.tgz`
`ad3ee0e551de315b230db78e2294d41868b5c166d44c0c87da35fb6b87bde54c`.

## Not checked

Building or running it; the C code.
