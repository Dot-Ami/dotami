# Screen 0 — "Before the venture — about you"

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx` (`AboutScreen`)
+ `components/shared/person-statements.tsx` (`PersonStatements`, `variant="full"`)
Type: free-text composer + dated record list (wizard step, skippable)

Last updated: 2026-09-13 (S2.5.4a — first vertical slice of the UI/UX + backend session)
Workshop status: **built 2026-09-13; the behaviour below is the shipped surface**

## What it is

The first intake screen, before anything about the venture. Its framing (decided 2026-09-13):
**get to know the person first.** It asks one thing — what should DotAmi know about you — and
keeps the answer as a **dated statement in the person's own words**. Below the composer it
shows everything already on record, newest first: statements typed here (Postgres) and, when a
self-hosted build configures one, an external read-only source (see "External sources" below).

## What it does (behavior on interact)

- **Composer** — textarea (max `STATEMENT_MAX_CHARS` = 2000, live counter), a "Said on" date
  input defaulting to today (max today), and `Keep this`. Click → `POST /api/person/statements`
  `{ text, saidAt }`.
  - 200 → the statement is prepended to the list with source `typed here`; note "Kept, with
    the date." (sage).
  - 400 → the server's plain-English reason shows under the composer (empty, too long, bad date).
  - 503 / network failure → **kept in this tab only**: written to `sessionStorage`
    (`dotami-person-unsaved`), rendered in the list tagged `TYPED · NOT SAVED` (amber), note
    "Kept in this tab only." The cockpit rail reads the same key, so it still shows up there.
- **Record list** — one card per statement: `saidAt` (mono), source tag (`typed here` ·
  `typed · not saved` · `vault · <file>`), the text in serif, and a `+`/`−` toggle when a
  verbatim body exists (a constraint's paragraph, a question's "why this is open").
- **Status lines (guardrails visible on the surface):**
  `db.available === false` → amber "No database reachable — nothing typed here will be
  saved." · `vault.available === false` → mono "Vault: <reason>" · fetch failure → amber
  "Couldn't load what's on record". The empty state reads "Nothing on record yet." only after
  a load has actually completed — never while loading.
- **Footer line, always:** "Shown back as you said it · not scored · not summarised · newer
  sits above older."
- **Continue →** — local `setScreen("confirm")`. **Always enabled.** Copy beside it: "You can
  skip this. Nothing here gates the map."
- **← Back** → `/` (this is the first screen). Screen A's Back now returns here.

## Why it exists (user purpose)

The agent contract (`CLAUDE.md` § Product philosophy, "The person's words stay the person's
words") allows DotAmi to hold what the person said about themselves **only** as dated
verbatim quotes — never a profile, never an archetype — and says it must ask rather than
assume. Before this screen the product asked nothing about the person, defaulted employment
to "employee", and filed a sentence about the person as the venture's name (found 2026-09-13).

## Copy (current labels)

"Before the venture — *about you.*" · "What should DotAmi know about you? How you work,
what you won't do, what you're after. It keeps your words with the date you said them — it
does not turn them into a type of person, and nothing you write here is used to rank
anything." · placeholder "Anything you want DotAmi to know about you — how you work, what you
won't do, what you're after. Your words, kept as-is." · "Said on" · "Keep this" / "Keeping…"
· "1 of 3 · About you" · "You can skip this. Nothing here gates the map." · "Continue →".

## State touched (field names only)

**None of the journey draft.** `PersonStatements` holds its own state and never calls
`setIntake` — the evaluator cannot see anything typed here, by construction. Client-only:
`sessionStorage["dotami-person-unsaved"]` for statements that could not be saved.

## Downstream consumers (where the data goes today)

`GET /api/person/statements` is read by this screen and by the cockpit left rail
(`docs/ui-spec/cockpit/02-left-rail.md` § In your words). Nothing else. **Not** the brain,
**not** the Lens, **not** the playbook — deliberately (S2.5.4a: remember and show, do not
pretend to use).

## Backend wiring

- **Postgres:** `PersonStatement` model (`prisma/schema.prisma`), migration
  `prisma/migrations/20260913000000_person_statements/`. Columns: `text`, `saidAt` (DATE —
  the person's claim), `createdAt`. **No UPDATE or DELETE path exists** — the contract's
  "newer beats older, never overwritten" is enforced by the absence of the code, not by a
  check. Helpers: `lib/person/statements.ts` (`listTypedStatements`, `addTypedStatement`;
  stub user upserted on first write, same pattern as the venture save).
- **External sources:** none in this build — typed statements only (`source: "typed"`).
  `"vault"` is reserved in the types for a self-hosted, read-only source of dated statements
  (for example a personal notes folder read live from disk, never copied into Postgres). A
  build that adds one reports it through `vault.available` and the source tag; this build
  always returns `vault.available=false` with the reason "No external statement source
  configured."
- **Route:** `app/api/person/statements/route.ts` — GET merges both sources newest-first
  and reports each half's availability; POST validates (non-empty, ≤2000 chars, real
  past-or-today ISO date) and appends.
- **Tests (in the gate):** `tests/person-statements.spec.ts` — parser fixtures, fail-soft
  availability, ordering, date validation (8 tests).

## Verified 2026-09-13

- No external source configured → `vault.available:false` with its reason, shown on the surface.
- Browser walk with no database: POST → 503, statement kept in-tab and tagged, then visible
  on the cockpit rail after `Open my map →`.
- **Real Postgres write, same day (later):** local Postgres 17 in Docker,
  `npm run prisma:deploy` applied all four migrations, POST → 200 through the screen, and
  `SELECT` on `"PersonStatement"` returned the row (`saidAt 2026-09-13`, FK to the stub
  user).
- **Fixed during the proof:** "Said on" defaulted to the UTC day (reads as tomorrow in the
  evening anywhere west of UTC). Client now uses the local day; the server allows one day of slack.

## Cleanup / open questions

- Whether "About you" should also be reachable from the cockpit as a full page (today: the
  rail's "+ Add something" is the only post-intake entry).
- Retracting a statement: today impossible by design; if it is ever wanted, it is a dated
  "retracted" row, not a delete.
- ~~`intake.name` still falls back to the parse's `rawLabel`~~ Fixed in S2.5.4d (same day):
  Screen B has a name field and the raw-label fallback is gone.
