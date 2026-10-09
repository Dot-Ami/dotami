# `libsql` and Prisma's libSQL adapter: a review

**Read on 2026-10-09**, for [database-encryption.md](../architecture/database-encryption.md) (encrypting
DotAmi's data file), under the maintainer's rule for outside code. The packages were downloaded into a
scratch folder outside the repository with `npm pack`, unpacked and read. **Nothing was installed into
DotAmi, imported or run**, and nothing is added to the app by this change.

| Package | Version read | Licence | What it is |
|---|---|---|---|
| [`libsql`](https://github.com/tursodatabase/libsql-js) | 0.5.29 (2026-09-29) | MIT | A `better-sqlite3`-style package around libSQL, Turso's fork of SQLite, as a Rust binary |
| `@libsql/win32-x64-msvc` | 0.5.29 | MIT | That binary for Windows |
| [`@libsql/client`](https://github.com/tursodatabase/libsql-client-ts) | 0.18.0 (0.17 for Prisma 6.19's adapter) | MIT | Turso's client: local files through `libsql`, and remote databases over HTTP and WebSockets |
| `@prisma/adapter-libsql` | 6.19.3 | Apache-2.0 | Prisma's adapter for `@libsql/client` |

## The short version: not recommended

- **A network stack inside the binary.** The Windows binary (8,875,520 bytes) imports `ws2_32.dll`
  (Windows' network library) and carries the strings of Rust's tokio TCP code, rustls (TLS) and an HTTP
  header table: libSQL can sync a local file with a database on Turso's servers (`syncUrl`), and that
  code is compiled into the same file that would open DotAmi's data. `@libsql/client` adds HTTP and
  WebSocket clients (`@libsql/hrana-client`, `@libsql/isomorphic-ws`). DotAmi would never pass a
  remote address, but its network check reads only JavaScript and TypeScript: it can't see what a
  binary can do, so the inventory would have to list the package as able to reach the network.
- **An older SQLite.** The binary carries SQLite 3.45.1 (January 2024) and SQLite3 Multiple Ciphers
  1.8.1 (strings in the binary). SQLite has fixed nine CVEs in later versions (CVE-2025-29087,
  -29088, -3277, -52099 in 3.49.1; CVE-2025-6965 in 3.50.2; CVE-2025-7709 in 3.50.3; CVE-2025-70873 in
  3.52.0; CVE-2026-11822 and -11824 in 3.53.2; [sqlite.org/cves.html](https://www.sqlite.org/cves.html),
  read 2026-10-09). Whether libSQL's fork carries its own fixes for them was not checked.
- **Encryption that can't detect tampering.** `libsql`'s JavaScript passes `encryptionCipher`,
  defaulting to `"aes256cbc"`, and the only cipher name in the binary is `aes256cbc`. In SQLite3
  Multiple Ciphers that scheme "does not use a Hash Message Authentication Code (HMAC)" (its
  documentation): a page changed on the disk is decrypted into something else rather than refused.
- **Licence:** MIT throughout, with Prisma's adapter under Apache-2.0. Not a problem.
- **Advisories:** none in GitHub's database for `libsql` or `@libsql/client`, and none published by the
  repositories (checked 2026-10-09).
- **Maintenance:** active (`libsql-js` pushed 2026-09-29; `libsql` 17,263 stars, pushed 2026-10-01).
  Turso's newer database is a separate rewrite, not this code.

## What was checked, and how

| What | How | Result |
|---|---|---|
| Encryption options | Read `index.js` of `libsql` 0.5.29 | `encryptionCipher` default `"aes256cbc"`, `encryptionKey`; `syncUrl`, `authToken` and `remoteEncryptionKey` for the cloud sync |
| The Windows binary | A small read-only script (printable strings; it never loads the file) | 8.9 MB; Node-API through `neon`; imports include `ws2_32.dll`, `bcrypt.dll`, `crypt32.dll`; tokio's `net/tcp/socket.rs`, rustls and HTTP header names; SQLite 3.45.1, SQLite3 Multiple Ciphers 1.8.1; cipher name `aes256cbc` only |
| Prisma's adapter | Read `dist/index-node.js` | `createClient(config)` from `@libsql/client`, so a key would go in through the client's `encryptionKey`; a lock around transactions, like the `better-sqlite3` adapter |
| Dependencies | `npm view` | `@libsql/client` → `libsql`, `@libsql/core`, `@libsql/hrana-client` (→ `@libsql/isomorphic-ws`), `js-base64`, `promise-limit` |

SHA-256 of the tarballs read: `libsql-0.5.29.tgz`
`d544d35b43bf1f4fecc4607656faab9735273554d244f4ec7cdf473bcc449ffe`; `libsql-win32-x64-msvc-0.5.29.tgz`
`7034df5dac3d21867e16d0d9db9e74dee61b4c4f74749cd878521714d774e780`;
`prisma-adapter-libsql-6.19.3.tgz` `0492b8d3eed44525c087cdcac3c32ac2fc9e9a96b50e1845465814d7530a40e8`.

## Not checked

Running anything; whether libSQL's fork patched the SQLite CVEs above itself; the Rust source.
