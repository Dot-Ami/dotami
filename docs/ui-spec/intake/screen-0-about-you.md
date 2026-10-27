# Screen 0 — "Before the venture — about you"

Page: Intake (`/intake`) · Component: `components/discovery/intake-page.tsx` (`AboutScreen`)
+ `components/shared/person-statements.tsx` (`PersonStatements`, `variant="full"`)
Type: free-text composer + dated record list (wizard step, skippable)

Last updated: 2026-10-24 (a statement that couldn't be saved stays in its box, said not kept; nothing in the
window's storage, the maintainer's rule); 2026-10-12 (no line about an external source of statements when none is set up, #6;
issue #38: shown first only to a person with no saved idea yet; a second idea starts on Screen A, and
**← Back** from there reaches this screen; [_index.md](./_index.md));
2026-10-11 (the sentence typed on the front door is listed here too, tagged with its idea; other typed rows say "typed in DotAmi", no longer "typed here"); 2026-09-13 (S2.5.4a — first vertical slice of the UI/UX + backend session)
Workshop status: **built 2026-09-13; the behaviour below is the shipped surface**

## What it is

The first intake screen, before anything about the venture. Its framing (decided 2026-09-13):
**get to know the person first.** It asks one thing — what should DotAmi know about you — and
keeps the answer as a **dated statement in the person's own words**. Below the composer it
shows everything already on record, newest first: statements typed in DotAmi (the database) and, when a
self-hosted build configures one, an external read-only source (see "External sources" below).
Since 2026-10-11 the database half includes the sentence typed on the front door (or in the intake's
box) for each idea: the intake's first save keeps it as one of the person's statements, linked to the
idea (docs/ui-spec/landing/01-free-text-entry.md § Persistence). It is listed here like any other
statement, tagged with the idea it was typed for, because it is the person's own words and "Your
statements" deletes it.

## What it does (behavior on interact)

- **Composer** — textarea (max `STATEMENT_MAX_CHARS` = 2000, live counter), a "Said on" date
  input defaulting to today (max today), and `Keep this`. Click → `POST /api/person/statements`
  `{ text, saidAt }`.
  - 200 → the statement is prepended to the list with source `typed in DotAmi`; note "Kept,
    with the date." (sage).
  - 400 → the server's plain-English reason shows under the composer (empty, too long, bad date).
  - 503 (no database), or any other refusal but a 400 → **not kept**: the words stay in the box and the note reads *"Not kept. Your words are
    still in the box, and Keep this tries again."* (amber; the status line above says why). No answer
    at all → *"Not kept: the server didn't answer. Your words are still in the box, and Keep this tries
    again."* (amber). Words in `lib/person/words.ts` `statementWords`. Nothing goes to the window's
    storage (since 2026-10-24; until then the statement went to `sessionStorage`,
    `dotami-person-unsaved`, and was listed tagged `typed · not saved`; a journey page now removes that
    key unread, `lib/journey/window-storage.ts`).
- **Record list** — one card per statement: `saidAt` (mono), source tag (`typed for your idea
  “<idea name>”` for a front-door sentence whose idea still exists · `typed in DotAmi` for every
  other typed one, including a front-door sentence whose idea was deleted, which can't be told
  apart from one typed here · `vault · <file>`; `statementSourceLabel` in
  `lib/person/types.ts`), the text in serif, and a `+`/`−` toggle when a
  verbatim body exists (a constraint's paragraph, a question's "why this is open").
- **Status lines (guardrails visible on the surface):**
  `db.available === false` → amber "No database reachable — nothing typed here will be
  saved." · fetch failure → amber
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
· "1 of 6 · About you" (the typed way's one numbering since 2026-10-23, `_index.md`) · "You can skip this. Nothing here gates the map." · "Continue →".

## State touched (field names only)

**None of the journey draft.** `PersonStatements` holds its own state and never calls
`setIntake` — the evaluator cannot see anything typed here, by construction. Nothing in the
window's storage: a statement that couldn't be saved stays in the box only (since 2026-10-24).

## Downstream consumers (where the data goes today)

`GET /api/person/statements` is read by this screen and by the cockpit left rail
(`docs/ui-spec/cockpit/02-left-rail.md` § In your words). Nothing else. **Not** the brain,
**not** the Lens, **not** the playbook — deliberately (S2.5.4a: remember and show, do not
pretend to use).

## Backend wiring

- **Database:** `PersonStatement` model (`prisma/schema.prisma`), migration
  `prisma/migrations/20260913000000_person_statements/`. Columns: `text`, `saidAt` (DATE —
  the person's claim), `createdAt`, and since 2026-10-11 `ventureId` (nullable: the idea a
  front-door sentence was typed for, cleared when the idea is deleted; migration
  `20261011120000_first_words`). `listTypedStatements` returns it as `idea: { id, name }`. **No UPDATE or DELETE path exists** — the contract's
  "newer beats older, never overwritten" is enforced by the absence of the code, not by a
  check. Helpers: `lib/person/statements.ts` (`listTypedStatements`, `addTypedStatement`;
  stub user upserted on first write, same pattern as the venture save).
- **External sources:** none in this build — typed statements only (`source: "typed"`).
  `"vault"` is reserved in the types for a self-hosted, read-only source of dated statements
  (for example a personal notes folder read live from disk, never copied into the database). A
  build that adds one reports it through `vault.available` and the source tag; this build
  always returns `vault.available=false` with the reason "No external statement source
  configured." Since 2026-10-12 the screen says nothing about it (#6): the old mono line
  "Vault: No external statement source configured." showed to everyone, named a feature nobody
  has set up, and "vault" meant nothing to a stranger. A build that adds a source adds its own
  line for when that source can't be read. The route still reports `vault` in its answer, for
  any program that reads it.
- **Route:** `app/api/person/statements/route.ts` — GET merges both sources newest-first
  and reports each half's availability; POST validates (non-empty, ≤2000 chars, real
  past-or-today ISO date) and appends.
- **Tests (in the gate):** `tests/person-statements.spec.ts` — parser fixtures, fail-soft
  availability, ordering, date validation (8 tests).

## Verified 2026-09-13

- No external source configured → `vault.available:false` with its reason, shown on the surface
  (until 2026-10-12; since then the route still says so and the screen doesn't, #6).
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
