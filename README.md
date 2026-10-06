# DotAmi

[![CI](https://github.com/Dot-Ami/dotami/actions/workflows/ci.yml/badge.svg)](https://github.com/Dot-Ami/dotami/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Dot-Ami/dotami/badge)](https://scorecard.dev/viewer/?uri=github.com/Dot-Ami/dotami)
[![Code: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-blue.svg)](LICENSE)
[![Content: CC BY-SA 4.0](https://img.shields.io/badge/content-CC%20BY--SA%204.0-lightgrey.svg)](LICENSE-CONTENT.md)

**Every path to financial freedom, mapped step by step and cited to the law — open source,
community-curated, so everyone has access to the same tools, tactics and tricks the elite have.**

## Mission

The people with the best accountants and lawyers already know which structures, write-offs,
thresholds, elections and strategies apply to them, and in what order. Everyone else finds
out late, or never. DotAmi exists to close that gap: **any and all paths that lead to
financial freedom, shown in the open**, each step with the statute or official page that
makes it work one click away. Not the biggest list — the most relevant. Not advice — the map,
with the sources, so you walk into your accountant's office knowing what to ask.

Describe what you want to build. DotAmi maps the lifecycle in front of you as tier columns
of cards — for a Canadian venture today: sole proprietor → GST/HST → incorporation → the
corporation running. Each card is a step or a lever (a write-off, a grant, a threshold, a
structure choice), lit by a deterministic rules engine from the answers *you* gave, with the
law behind it one click away.

> **DotAmi is information, not legal or tax advice.** It is a prep tool for you and your
> accountant and lawyer. It never files anything, never generates a binding document, and
> never claims a qualification. Every figure it shows carries its source and the date it was
> last verified — check that date before you rely on it.

## See it

![Describe a venture in one sentence, confirm what was understood, open the map, then read the statute behind a card](docs/media/intake-to-map.gif)

*A made-up venture on an empty database, with no API key: the keyword parser and the rules
engine did all of it. About 25 seconds, loops.*

| Confirm what was understood | The map | The law, in its own words |
|---|---|---|
| ![The confirm screen: venture type, kind of work, goals and province, parsed from one sentence](docs/media/intake-confirm.png) | ![The map: four tier columns of stage and lever cards, lit from the answers given](docs/media/map.png) | ![A card's citation expanded to the Income Tax Act's own text, with the audit caution above it](docs/media/show-the-words.png) |

## What it does

- **Intake → map.** Three screens (about you · confirm what you're building · where it
  operates) and the map opens. Nothing is pre-filled; blank stays blank.
- **The map.** Tier columns of stage cards and lever cards. A card says *applies* only when
  the rules engine says your answers meet the conditions; *check first* when it is
  plausible, time-boxed, or one decision away. Hover a card to see where it leads.
- **The law, on the card.** Every catalog entry cites the statute, the regulation or the tax
  authority's own page (today: the Income Tax Act, the Regulations, CRA and provincial
  sources), with a verification status and a `lastVerified` date.
- **Your ideas.** Save as many ventures as you like, stage them (idea → prototype → first
  customers → established), cross-reference the ones that overlap or could become sister
  companies.
- **Your words.** What you tell it about yourself is kept as dated statements in your own
  words — never summarised into a profile, never used to rank anything.
- **Your data stays yours.** Self-hosted, on your machine, in a database you own. Nothing
  is sent anywhere — not even a font request: every asset is served from your own machine.

## What it does not do (on purpose)

- It does not recommend. "If X, this may unlock Y" — never "you should".
- It does not invent numbers. No projections, no dollar ranges without a sourced figure.
- It does not run a model over your data. Node states, unlocks and risk reads are
  deterministic TypeScript over versioned catalogs. The only optional model call is the
  intake's free-text parser, and it has a keyword fallback.
- It does not file, sign, or submit anything.
- It does not hide the risk. Every lever carries its audit exposure and anti-avoidance read,
  stated plainly — the reader decides.

## Coverage today

**Canada is the first jurisdiction mapped:** federal + Alberta, British Columbia and Ontario
catalog entries; all 13 provinces and territories selectable, everywhere else in Canada gets
federal rules and an honest "provincial coverage pending" badge. **Every other country is
unmapped.** The catalogs are keyed by jurisdiction; a new one starts as a roadmap issue and
lands as cited nodes. **This is the part that needs you** — see
[CONTRIBUTING.md](CONTRIBUTING.md).

## Where this is going

[docs/roadmap.md](docs/roadmap.md) — roadmaps as data (one cited markdown file per node),
progress per venture, jurisdictions beyond Canada, connecting to accounting software and
financial records **locally**, and complex tax strategies and business structures mapped as
roadmaps of their own. Pick something up.

## Run it

Requires Node 22.13+ and `npm` (the desktop app's database tests use Node's built-in SQLite; CI
runs Node 24, the version inside the desktop app). The database is SQLite — a single file,
nothing else to install.

```bash
cp .env.example .env          # the default keeps your data in prisma/dotami.db
npm ci
npm run prisma:deploy         # creates the database file and its tables
npm run seed                  # optional: two invented ventures so the map has something to show
npm run dev                   # http://localhost:3000 — bound to this machine only
```

Self-hosted, single user, no auth — run it on your own machine. A hosted multi-user
instance needs authentication and tenant isolation that do not exist yet.

DotAmi itself sends nothing anywhere, but two tools it's built with report anonymous usage
counts unless told not to: Next.js on `npm run dev` / `npm run build`
([nextjs.org/telemetry](https://nextjs.org/telemetry); `npx next telemetry disable` stops it), and
the Prisma CLI each time it runs. The `prisma:*` scripts switch Prisma's off
(`scripts/prisma.mjs`); `npm ci` runs it once on its own, so set `CHECKPOINT_DISABLE=1` in your
environment before installing to stop that too. CI sets both off.

**Your data is the one file `DATABASE_URL` points at.** Back it up by copying it; start over
by deleting it and running `npm run prisma:deploy` again. It is never committed (`.gitignore`
covers `*.db`). Turn on your operating system's disk encryption (BitLocker, FileVault) — that
is what protects the file if the computer is lost.

The dev server listens on `127.0.0.1`, so nothing on your network can reach it. It also answers
only to this computer's own names (`localhost`, `127.0.0.1`), which stops a website you visit from
reaching it through DNS rebinding. If you deliberately open it to your LAN
(`npm run dev -- -H 0.0.0.0`), list the names you'll use in `DOTAMI_ALLOWED_HOSTS` (e.g.
`DOTAMI_ALLOWED_HOSTS=192.168.1.5,my-pc`), and know that there is no authentication in front of
the app.

Upgrading from a PostgreSQL install (before 2026-09-28): see the CHANGELOG entry for that
date before you pull — a fresh SQLite file starts empty.

**The desktop app (early, Windows first, not yet released):** `npm run desktop:build` then
`npm run desktop` opens DotAmi in its own window, with its data in the app's own folder
(`%APPDATA%\DotAmi` on Windows) instead of `prisma/`. `npm run desktop:installer` builds the
installer (`dist-desktop/out/`); the installed app updates itself from GitHub Releases and asks
before installing. How it works, and how releases are made:
[docs/architecture/desktop-app.md](docs/architecture/desktop-app.md).

The quality gate is `npm run ci:quality` (prisma generate → typecheck → lint → test → build);
CI runs the same chain on every pull request. **Browser tests:** `npm run test:browser` builds
the app, starts it on a fresh throwaway database and drives it in Chromium the way a person would
(first time: `npx playwright install chromium`). CI runs them on every pull request too.
**Desktop test:** `npm run test:desktop` builds the desktop app's server and drives the real app
(start → describe a venture → close → start again → still there). CI runs it on Windows against
the packaged app.

## Contribute

**Looking for something to pick up? [docs/task-list.md](docs/task-list.md)** lists every planned
story with its tasks, what's done, and what needs a decision first.

Any path to financial freedom you can cite: a jurisdiction, a structure, a strategy, a
write-off, a grant, a threshold, a correction, a fresher `lastVerified` date. The style guide
and the rules are in [CONTRIBUTING.md](CONTRIBUTING.md). Short version: one paragraph per
node, typed sources in a fixed order, **no entry without a citation**, nothing you have not
verified yourself, no self-promotion. Sign your commits off with the [DCO](DCO.md)
(`git commit -s`).

## Licenses

- Code: [Apache License 2.0](LICENSE).
- Content — catalog entries, roadmap nodes, documentation under `docs/`:
  [Creative Commons Attribution-ShareAlike 4.0](LICENSE-CONTENT.md).
- Canadian statutes and regulations quoted or cited are reproduced under the
  [Reproduction of Federal Law Order](https://laws-lois.justice.gc.ca/eng/regulations/SI-97-5/)
  and the equivalent provincial terms; CRA pages are linked, not copied. Other jurisdictions'
  texts follow their own official reproduction terms as they are added.

## Where things live

| | |
|---|---|
| Engine catalogs (the data) | `lib/engines/<engine>/v2026/` — write-offs, grants, compliance, structure, templates, risk, the lifecycle (CFE) |
| The rules engine | `lib/brain/` |
| The map | `components/cockpit/` · tiers in `lib/engines/cfe/v2026/tiers.ts` |
| Per-control behaviour of every screen | `docs/ui-spec/` |
| Catalog conventions (read before editing a catalog) | `docs/engines/README.md` |
| Architecture | `docs/architecture/` |
| Where this is going | `docs/roadmap.md` |
| Screenshots and the GIF above | `docs/media/` — from a made-up venture on an empty database |
| What changed between snapshots | `CHANGELOG.md` — entry dates live on the entries themselves |
