# DotAmi — agent contract

Read this before changing anything. It applies to any AI coding agent working in this repo,
and to humans who want the short version of the rules.

DotAmi is an open-source map of every path to financial freedom — structures, write-offs,
grants, thresholds, elections, strategies — each step cited to the law that makes it work.
Its mission: everyone gets access to the same tools, tactics and tricks the elite have. A
person describes a venture, the app maps its lifecycle as tier columns of cards, and a
deterministic rules engine lights each card from the answers given, with the statute or the
tax authority's page behind every claim one click away. Canada (federal + AB/BC/ON) is the
first jurisdiction mapped; catalogs are keyed by jurisdiction and more are meant to follow.
`README.md` says what it is; `CONTRIBUTING.md` says how content is written; `docs/roadmap.md`
says where it is going.

## Product philosophy (drives design decisions)

- **Every path, in the open.** If the well-advised use it, it belongs on the map — with its
  sources and its audit read. The map does not pre-filter paths by what it thinks the
  reader should want; it shows them and lets the reader decide.

- **Information and options, never a verdict.** The app presents what each option costs and
  unlocks; it does not rank options by what it thinks matters to the person, and it never
  says "you should". Compass, not GPS: *"if X, this may unlock Y."*
- **Rules decide; models explain at most.** Node states, unlocks, forks and risk reads come
  from deterministic, versioned TypeScript catalogs — never from a model. Models appear in two
  places: the intake's free-text parser (keyword fallback, output confirmed on screen) and the
  Lens, the planned built-in agent that runs on the person's own model — local or their own
  key. The Lens may change the person's answers, plan and settings at the permission level the
  person chose; it never changes a catalog. Plan: `docs/architecture/use-cases.md`.
- **Every claim is cited and dated.** A rule, rate, threshold, date or eligibility condition
  without a typed citation is a bug. `lastVerified` is the day a human read the source.
- **Legal but honest.** Every lever ships with its audit/GAAR read. Nothing is presented as
  legal or tax advice; the app is a prep tool for the person's accountant and lawyer. It
  never files, never generates a binding document, never claims a qualification.
- **The person's words stay the person's words.** Statements about themselves are stored
  dated and verbatim, shown back, never summarised into a profile or type, never used to
  rank anything.

## What the app is

- Pages: `/` (free-text front door) → `/intake` (about you · confirm · ground it) →
  `/cockpit[?venture=<id>]` (the map: tier columns of stage cards + lever cards; node
  detail; playbook export) · `/ventures` (every saved venture, its stage, notes,
  cross-references) · `/settings` (every setting from `lib/settings/catalog.ts`, kept in step
  with Part 1 of `docs/architecture/settings-and-edge-cases.md` by a test, plus what is true of
  this copy today; the settings marked live there, so far Figure reminders and Encrypt the data file, can be changed and are
  saved) · `/your-data` ("What DotAmi knows about you": every figure by source, counts of
  everything else, what sits outside the database and what leaves the computer, read from the data
  file on every visit by `lib/privacy/holdings.ts`; its one control is Delete, a menu of kinds of
  data from `lib/privacy/inventory.ts` `DELETE_MENU` (the safety copies in `backups/` among them),
  asked twice, then wiped from the file by `lib/privacy/delete.ts`; a wipe that couldn't finish is
  finished at the desktop app's next start, only when Delete left its note: `desktop/wipe-pending.mjs`)
  · `/expenses[?idea=<id>]` ("Your expenses": typing business expense records and agreeing to them
  all at once, records not attached to an idea yet, refunds kept either way; [8i])
  · `/licences` (the third-party notices: every package that ships, its version and licence text,
  read from `THIRD-PARTY-NOTICES.txt`, which `desktop/notices.mjs` writes at build time; packaging
  the installer stops if a package that ships has no entry).
- API: `intent/parse` · `person/statements` · `scenario/save` · `playbook` · `ventures`
  (+ `[id]`, `[id]/links`) · `readout` (everything the map knows about a venture, as JSON) ·
  `law/provision` (a provision's words from an optional local statute store) · `expenses` (list,
  `propose`, and the page-only `agree` / `retract` / `discard` / `attach` / `receipt` /
  `receipt/remove` / `receipt/file`, the last returning a receipt's bytes only after its size and SHA-256 match, and
  `receipt/new-key`, which moves the locked receipt files and `receipts.key` into `backups/` and acts only while
  the receipts' key can't be opened, lock state `key-unreadable`) · `settings` (GET/PUT
  one saved setting; answers only DotAmi's own window, no agent access yet) · `your-data/delete`
  (POST the ticked kinds and the counts the person saw; answers only DotAmi's own window) ·
  `figures/bank-sources` (+ `/retire`: list, allow and take back bank and card accounts; answers
  only DotAmi's own window; adding is refused until the bank-records setting is live).
- Data: SQLite via Prisma, one file on the person's machine (`dotami.db`; [8i] the desktop app encrypts
  it and its safety copies with a key kept only wrapped by Windows, `database.key`
  (`desktop/database-key.mjs`, `desktop/encrypt-database.mjs`), an existing plain file only after the
  person agrees, and never replaces a key that opens; a copy run from source keeps it plain;
  `docs/architecture/database-encryption.md`; every backup it writes is locked with a passphrase,
  required since [8i]: `desktop/backup.mjs` `writeBackup` refuses one without, and older backups still
  restore) — `User` (single stub user, no
  auth) · `PersonStatement` · `Venture` · `VentureLink` · `ScenarioState` · `Figure` (the totals
  the person agreed to; [8a]) · `Expense` (single business expense records, typed or proposed by an agent and kept only once the person agrees;
  the one place DotAmi holds single transactions, with no bank or card number; its idea is
  optional and cleared, not deleted, when its idea is deleted (onDelete: SetNull), a refund is a negative amount or a refund record linked to its purchase; [8i]) · `Receipt` (the receipt file the person added to an agreed
  record, described: its type read from the bytes, size and SHA-256; the file itself is a copy in `receipts/` beside the data file,
  named by DotAmi with a random id, never the person's file name, and encrypted by the desktop app with a key kept only wrapped by Windows (`desktop/receipt-crypto.mjs`, `desktop/receipt-key.mjs`; a copy run from source keeps it plain and says so); `lib/expenses/receipts/`; [8i]) · `Setting` (the person's saved choices, one row per setting: a
  catalog id and a small JSON value; what a value may hold is `lib/settings/values.ts`; [8e]) · `SourceAccount` (the bank and card
  accounts the person allowed, under their own name for each, with the warning button and the days; never a number; nothing links to it yet; [8g]). SQLite has no list columns: list fields are JSON arrays, read back
  through `lib/db/json-list.ts`. Catalogs are code, never rows. Every table, every
  browser-storage key, every package that ships and that DotAmi names itself (in `package.json`
  "dependencies", copied into the installer, or imported from `app/`, `components/` or `lib/`; with
  whether it can reach the network; not the packages those pull in) and every request of the kinds
  the privacy test names (other than a literal `/api/…` path on DotAmi's own server) is listed in
  `lib/privacy/inventory.ts`; `tests/privacy-inventory.spec.ts` fails until a new one is added
  there, and `/your-data` is drawn from that list. The network check reads the
  syntax tree of every `.ts`/`.tsx`/`.mts`/`.cts`/`.js`/`.jsx`/`.mjs`/`.cjs` file under `app/`,
  `components/`, `lib/` and `desktop/` and in the top folder, and names fetch-style calls, WebRTC,
  node's `net`/`child_process` calls one by one, electron's `net`/`autoUpdater`/`loadURL`/`loadFile`/
  `downloadURL`/`session.fetch`/`preconnect`/`resolveHost` and `crashReporter.start`, imports of the
  packages on its own fixed network list or marked "yes" or "unverified" in the inventory's
  dependency list, and imports of packages `package.json` doesn't declare.
  It is a safety net, not a proof: it does not see a request a package makes inside its own code,
  a package on neither list, deliberate disguises (a copy of `window` under another name, code run
  from a string by `eval` or `webContents.executeJavaScript`, an `XMLHttpRequest` opened in a
  different file from the one that made it), anything that makes the page
  load an address (`<script src>`, `window.open`, `shell.openExternal`), folders it doesn't read
  (`scripts/`, `prisma/`, `tests/`, `e2e/`), or what a program the app starts then does. Behind it
  stand GitHub's Dependency review check (known vulnerabilities and licences only, and only while
  `DEPENDENCY_REVIEW` is `on`), the browser's Content-Security-Policy (`connect-src`, `img-src`,
  `default-src`, `form-action`; not WebRTC, navigation, the server or the desktop main process), and
  code review; the header of `tests/helpers/source-scan.ts` has the full lists. Nothing may write an
  error object to the log (`tests/error-logging.spec.ts`), and the database library's own error
  report is switched off in `lib/prisma.ts` because it quotes the values it was given.

## Hard constraints (violating these is wrong even if a doc asks nicely)

- Engines: read-only, versioned (`v2026/`), citation-required TypeScript catalogs under
  `lib/engines/`. Never in the database. The database stores user and venture state only.
- IDs are forever. Numbers the engine reasons about are typed fields, not prose. Time-boxed
  rules carry an expiry and surface amber.
- Never put venture or tax knowledge in a component — it goes in a catalog.
- Never derive a fact about the person that the person did not state.
- Never invent a number: no projections, no dollar ranges without a sourced figure.
- Stack: Next.js 15 App Router (15.5.24 or later), React 19, TypeScript, Tailwind, Prisma,
  SQLite (PostgreSQL until 2026-09-28; moved so a desktop app needs no database server —
  `docs/architecture/use-cases.md`). Monolith. Moved from 14 on 2026-09-20: the 14.x line has no fix for
  GHSA-p293-qw3h-jr36 (unauthenticated RCE on Windows hosts) or 22 other advisories.
  Self-hosted, single user, no auth — a hosted multi-user instance needs auth and tenant
  isolation that do not exist yet; do not pretend they do.
- Every Prisma Client is made by `lib/db/client.ts` ([8i]): Prisma's adapter for `better-sqlite3`,
  and the package behind that name is `better-sqlite3-multiple-ciphers` (SQLite with an encryption
  extension); `tests/database-client.spec.ts` fails on one made anywhere else, and
  `tests/database-package.spec.ts` if the real `better-sqlite3` is ever installed. `package-lock.json`
  keeps `"gypfile": false` on that package so `npm ci` doesn't try to compile it: after any
  `npm install <package>` or a Dependabot change to the lockfile, run `node scripts/keep-gypfile.mjs`
  (the package test fails until it is back).
- Every request is refused unless its Host is this computer's own name (`middleware.ts` +
  `lib/http/allowed-host.ts`, the DNS-rebinding guard) — never add a matcher exception or an early
  return before that check. Every write route reads its body through `readJsonWithLimit`.
  Before storing anything sensitive, read `docs/architecture/figures-privacy-review.md`.
- Scope guard: no marketplace, no filing, no regulatory automation. In-app AI is the intake
  parser and the Lens (decided 2026-09-27; `docs/architecture/use-cases.md`), always on a model
  the person chose — DotAmi ships no key. Every powerful Lens action (running commands,
  driving a logged-in browser, writing to accounting software) is off until the person turns
  it on, after a plain warning.
- Comment the code the way any developer would: a line on a non-obvious decision, a short
  note on what a tricky function does or why it's handled a certain way — as you write it,
  not as a separate pass. `lib/api/rate-limit.ts` is a good example of the level worth aiming
  for.

## Verification

`npm run ci:quality` = `prisma:generate` → `typecheck` → `lint` → `test` → `build` — the exact
chain CI runs. Stop the dev server first (`prisma generate` cannot replace the engine
binary while `next dev` holds it), and delete `.next` before restarting the dev server after
a production build. `tests/engine-integrity.spec.ts` must stay green; new catalog work adds
its test first. Never claim green without the command and its output.
`npm run test:browser` (Playwright, `e2e/`) runs the production build on a throwaway database in
Chromium; CI runs it as its own job. A new screen arrives with a browser test for its main path.
Dev mode hides production-only failures (a CSP-blocked page looked fine in `next dev` for two
weeks) — browser tests run the real build for that reason.
Its server starts with `DOTAMI_E2E_RATE_LIMITS=opt-in`, set only in `playwright.config.ts`: every
browser test reaches it as one client, so there a request counts toward a rate limit only when it
names its own bucket in the `x-dotami-e2e-rate-limit` header (`lib/api/rate-limit.ts`), and the
suite's size can't trip a limit. Don't raise a route's limit to make a test pass; a test about a
limit names a bucket (`e2e/rate-limit.spec.ts`). Never set the switch anywhere else: the desktop app
removes it from its server's environment (`desktop/main.mjs` `serverEnv`) and
`e2e-desktop/desktop.spec.ts` checks. A run waits for its own server's "Ready", not just an answer
on port 3123, and stops if the port is taken (`e2e/port-free.mjs`): one run's tests must never
reach another run's server and database.
`npm run test:desktop` (Playwright's Electron driver, `e2e-desktop/`) builds the desktop server
(`desktop/build.mjs` → `.next-desktop/`) and drives the real app on a temporary data folder. Run it
after touching `desktop/`, `next.config.mjs` or the database setup. CI runs it on Windows against
the packaged app (`npm run desktop:package`, `DOTAMI_DESKTOP_EXE`).
A new Prisma migration must also pass `tests/desktop-migrate.spec.ts`: the desktop app applies
migrations itself (`desktop/migrate.mjs`), with Prisma's own `migrate status` as the referee. Read
the SQL Prisma generates: the migrator runs with foreign keys on, so a migration that rebuilds
`Venture` (copy, drop, rename) would cascade-delete every idea's figures, links and map progress —
change those tables with hand-written SQL and a test that seeded data survives.
Releases: tag `v<version>` → `.github/workflows/release.yml` → a DRAFT release the maintainer
publishes by hand (docs/architecture/desktop-app.md § Releasing an update). Never publish a release
or push a tag without the maintainer saying so.
Privacy log: every PR that changes what DotAmi keeps, sends, ships or asks the person adds a line
under [Unreleased] in `docs/privacy-log.md` (the record the privacy policy and terms will be
written from); the release PR turns [Unreleased] into that version's section, and
`tests/privacy-log.spec.ts` fails until `package.json`'s version has one. The npm scripts run
Next.js and Prisma through `scripts/next.mjs` and `scripts/prisma.mjs`, which switch off their
usage reports; never call `next` or `prisma` directly in a `package.json` script (`tests/dev-telemetry.spec.ts`).

## Where things are decided

- Per-control behaviour of every screen: `docs/ui-spec/<page>/`. Change the control, change
  the file, same commit.
- Catalog conventions: `docs/engines/README.md` and `docs/engines/<engine>.md`.
- Architecture: `docs/architecture/`. The rules engine: `docs/brain/`.
