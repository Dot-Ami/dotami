# Working in a cloud session

Last updated: 2026-10-27, after the cloud session of 2026-10-25 to 27 (it merged #207, #206, #208, #210 and
#209 on the maintainer's word, and brought #211 up to date with his reads). How a claude.ai cloud session
worked on DotAmi, what it can't do, and what it leaves for a normal session on the maintainer's computer.

## What a cloud session can't do

- **Download Prisma's engines.** `binaries.prisma.sh` answers 403, so `prisma generate`, `prisma migrate`
  and every unit suite that makes a database with them fail.
- **Reach government sites.** `node scripts/check-quotes.mjs` (and `npm run quality:report -- --live`) can't
  open the pages DotAmi quotes, so no tool check can be recorded or re-checked there (citations.md rule 4).
- **Read a claude.ai page's saved answers** unless that session published the page itself. The maintainer's
  answers on an older page reach a new session only through him, or through a page the new session makes.
- **Run the desktop tests** (`npm run test:desktop`): CI runs them on Windows.

## How it worked anyway (nothing here is committed)

- **Types and unit tests:** an untracked `prisma/schema.local.prisma` (the schema with `engineType =
  "client"` in its generator), generated with `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`,
  `PRISMA_SCHEMA_ENGINE_BINARY=/bin/false` and `PRISMA_QUERY_ENGINE_LIBRARY` pointing at an empty file.
  Typecheck, lint and every unit test without a database then run.
- **The unit failures that are the sandbox's, not the code's:** the database suites (each fails at
  `migrate deploy` with "Failed to fetch sha256 checksum … 403"), `tests/desktop-migrate.spec.ts`, and the
  windows-1252 test in `tests/figures-file-read.spec.ts`. `tests/data-check.spec.ts` can time out when the
  machine is busy: run it alone before calling it a failure.
- **Browser tests:** an untracked `playwright.local.config.ts` that imports `playwright.config.ts`, puts a
  stand-in for `e2e/prepare-db.mjs` in its place (the desktop app's own migrator, `desktop/migrate.mjs`, makes
  the tables, then `prisma/seed.ts` runs), uses Chromium at `/opt/pw-browsers/chromium`, and, when several
  checkouts run at once, gives each its own port. `e2e/clutter-budget.spec.ts` makes its own database and
  port, so it runs only with a temporary local patch.
- **CI is the referee** for the database tests, the desktop tests and anything the sandbox can't run. Never
  call a pull request green from the sandbox alone.

## Merging pull requests in the maintainer's order

- Bring each up to date with `git merge --signoff --no-edit origin/main` (never a rebase, never GitHub's
  *Update branch*), run the checks, push, wait for green CI, then squash-merge on his word.
- **A pull request that carries an earlier one's first commits** (built on its branch before it merged) gets
  conflicts from those copies, not from its own work. `git merge-tree --write-tree --merge-base <the carried
  commit> origin/main <its head>` lays only its own changes over main; start the real merge, load that tree
  with `git read-tree --reset -u <tree>`, solve what's left, and commit: still a merge commit. On 2026-10-25
  this cut #208's conflicts from 14 to 6 and #210's from 16 to 5.
- **A clean merge can still be wrong.** Run the whole unit suite and the browser files that read words after
  every merge with main. Found this way on 2026-10-25 to 27: a test checking the road as written after #207
  drew roads for the person's place; a time-words exception left stale once #208 removed its line; a browser
  test waiting for words #210 changed; a list renamed by #209 and looked up by #207's test under its old
  name. Two independent read-only reviews of the biggest merge (#209's 18 files) found eleven more,
  among them a legal requirement called a skill and uncited tax definitions on the structure ladder.

## Left for a normal session (it needs the internet or Windows)

1. `node scripts/check-quotes.mjs` with no arguments: re-checks every quote DotAmi holds (337 tool checks on
   11 government and BizPaL sites as of 2026-10-27, none on the sites DotAmi never fetches). Done in a normal
   session on 2026-10-26: all 779 quotes found, #211's 49 quotes dated 2026-10-23 among them, so citations.md
   rule 4's exception is closed.
2. `npm run quality:report -- --live`: source health, the pages that answer "not found".
3. The official words citations.md § *Blocked* still needs (Alberta's no-PST page, the SR&ED refund
   questions, the home office sentence, two pages' own titles, the Productivity Grant's other conditions).
4. The prices Mara's example rests on that the review couldn't re-open (Autodesk Fusion 403, Busy Bee Tools
   and Lee Valley 429, QuickBooks timed out), and the AI provider's retention period on *What DotAmi knows
   about you*, to quote word for word (docs/task-list.md).
5. `npm run ci:quality` with the database tests, `npm run test:browser`, and on Windows `npm run test:desktop`.
