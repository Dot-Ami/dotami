# Changelog

Every catalog entry carries its own `lastVerified` date — the day a human read its source.
This file is the other half: what changed in the project between snapshots. A version here is
a dated snapshot, not a promise of stability.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `npm run seed` — two invented ventures so a fresh clone shows a working map instead of an
  empty app.
- Per-request Content-Security-Policy on every page; fonts served from this origin instead of
  a third party.
- Byte caps, per-client rate limits and same-origin JSON checks on every write route.
- CodeQL and OpenSSF Scorecard workflows; Dependabot configuration; `.gitleaks.toml`.
- Prettier and `.editorconfig` (configured, not yet part of the gate).
- Node 20 pinned (`.nvmrc`, `engines`) to match CI.
- Issue chooser, bug-report template, `CODEOWNERS`, `CITATION.cff`, README badges.
- **Browser tests** (`npm run test:browser`, Playwright, `e2e/`): the real build on a fresh
  database, driven like a person — one sentence to a saved map, a stage change surviving a
  reload, the disclaimer footer inside the window. A CI job runs them on every pull request.

### Changed
- **Database: PostgreSQL → SQLite (2026-09-28).** The whole database is now one file
  (`prisma/dotami.db` by default), so DotAmi needs no database server — the first step toward
  a desktop app. The four list fields are stored as JSON arrays. The eight PostgreSQL
  migrations are replaced by one SQLite starting migration (they remain in git history).
  **If you already run DotAmi on PostgreSQL:** a fresh SQLite file starts empty. Stay on the
  commit before this change until a copy script lands, or re-enter your ventures; nothing is
  deleted from your PostgreSQL database.
- The database layer now has a test: `tests/db-roundtrip.spec.ts` migrates a throwaway SQLite
  file, saves and reloads ventures, links and statements, and deletes the file.
- Stack moved to Next.js 15.5 / React 19 / Vitest 4. The 14.x line had no fix for
  GHSA-p293-qw3h-jr36 (unauthenticated remote code execution on Windows hosts).
- The dev server and the documented Postgres container bind to `127.0.0.1`, not every
  interface.
- `@anthropic-ai/sdk` 0.92 → 0.127 (the optional intake parser's only dependency).
- Recharts removed — nothing imported it after the projection footer was cut.

### Fixed
- **The landing page and the intake were dead in production builds** (`npm run build && npm
  start`) from 2026-09-21: they were pre-rendered at build time, so their scripts carried no CSP
  nonce and the browser blocked every one — the text box filled, but "Map it" never enabled.
  Development mode renders per request, so it never showed. Every page now renders per request
  (`app/layout.tsx`), as the Next.js CSP guide requires. Found by the first browser test.
- Links built from data the app did not write are restricted to absolute `https:` URLs.
- `deepmerge-ts` forced to 8.x (GHSA-ggr8-5vv4-36mx). It arrives through Prisma's CLI and
  no Prisma release — including 7.10 — has moved off the vulnerable 7.x yet.
- Documents that described a CI job, a hosted deploy and file paths that do not exist.

## [0.1.0] — 2026-09-20

### Added
- First public release: seven catalogs (74 citations) behind a deterministic rules engine,
  the intake, the map, saved ideas, the JSON readout, and the optional local statute store.
