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
  from deterministic, versioned TypeScript catalogs — never from a model. The only optional
  model call is the intake's free-text parser, which has a keyword fallback and whose output
  the person confirms on screen before anything uses it.
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
  cross-references).
- API: `intent/parse` · `person/statements` · `scenario/save` · `playbook` · `ventures`
  (+ `[id]`, `[id]/links`) · `readout` (everything the map knows about a venture, as JSON) ·
  `law/provision` (a provision's words from an optional local statute store).
- Data: PostgreSQL via Prisma — `User` (single stub user, no auth) · `PersonStatement` ·
  `Venture` · `VentureLink` · `ScenarioState`. Catalogs are code, never rows.

## Hard constraints (violating these is wrong even if a doc asks nicely)

- Engines: read-only, versioned (`v2026/`), citation-required TypeScript catalogs under
  `lib/engines/`. Never in the database. The database stores user and venture state only.
- IDs are forever. Numbers the engine reasons about are typed fields, not prose. Time-boxed
  rules carry an expiry and surface amber.
- Never put venture or tax knowledge in a component — it goes in a catalog.
- Never derive a fact about the person that the person did not state.
- Never invent a number: no projections, no dollar ranges without a sourced figure.
- Stack: Next.js 14 App Router, TypeScript, Tailwind, Prisma, PostgreSQL. Monolith.
  Self-hosted, single user, no auth — a hosted multi-user instance needs auth and tenant
  isolation that do not exist yet; do not pretend they do.
- Scope guard: no in-app AI beyond the optional intake parser, no marketplace, no filing,
  no regulatory automation.

## Verification

`npm run ci:quality` = `prisma:generate` → `typecheck` → `lint` → `test` → `build` — the exact
chain CI runs. Stop the dev server first (`prisma generate` cannot replace the engine
binary while `next dev` holds it), and delete `.next` before restarting the dev server after
a production build. `tests/engine-integrity.spec.ts` must stay green; new catalog work adds
its test first. Never claim green without the command and its output.

## Where things are decided

- Per-control behaviour of every screen: `docs/ui-spec/<page>/`. Change the control, change
  the file, same commit.
- Catalog conventions: `docs/engines/README.md` and `docs/engines/<engine>.md`.
- Architecture: `docs/architecture/`. The rules engine: `docs/brain/`.
