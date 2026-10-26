# Civic Trace (prototype)

A local prototype of a public-interest investigation and civic-action tool: it takes one public
decision and shows what each source says, what the evidence actually supports, what is unknown, who
has the authority to decide, which verified processes people can use to take part, and what happened
when they did.

> **Everything in it is invented demo data:** a fictional town, province, company, substance,
> documents, quotations, figures and a 2030 timeline. No deadline in it is real. It is not legal,
> scientific or medical advice, and it never sends, files or publishes anything.

*Working name, not checked for trademarks.*

## Planning documents

| File | What it covers |
| --- | --- |
| [CONCEPT.md](CONCEPT.md) | Definition, users, value, boundaries, three niches, the recommendation, evidence versus campaigning |
| [PRD.md](PRD.md) | Problem, goals, personas, use cases, requirements (built / mocked / deferred), trust, accessibility, privacy, acceptance criteria, risks, metrics |
| [USER_JOURNEYS.md](USER_JOURNEYS.md) | Concerned resident, volunteer researcher, coalition organiser: every stage, call to action, error and uncertainty state, and the no-route cases |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Ingestion, provenance, claims, relationships, decisions, review, action routes, API, the MCP plan, the data model |
| [ROADMAP.md](ROADMAP.md) | Prototype → single-issue pilot → reviewed public beta → expansion, with exit criteria and what to test with users |
| [RESEARCH_REGISTER.md](RESEARCH_REGISTER.md) | Assumptions, open questions, sources to verify (all pending: see below), sourced versus proposed, uncertainties |

## Run it

Needs Node.js 22.13 or later. From this folder:

```bash
npm install
npm run dev          # http://127.0.0.1:3200
```

or the production build:

```bash
npm run build && npm start   # http://127.0.0.1:3200
```

The scripts switch off Next.js's usage reports. The server answers only on this computer
(`localhost`, `127.0.0.1`).

### Checks

```bash
npm run typecheck
npm test                 # unit and data tests (Vitest)
npx playwright install chromium   # once
npm run test:browser     # browser tests against the production build, on port 3201
npm run check            # typecheck + unit tests + build
```

If Chromium is already installed somewhere and `playwright install` isn't possible, point the
browser tests at it with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium`.

## A tour (five minutes)

1. **Home**: search "air" or pick a jurisdiction; set *Where are you?* (it stays in the browser).
2. **Issue overview**: the question, eight sections answering what happened, what stage each
   decision is at and who decides, what is documented, what is disputed or unknown, who might be
   affected (your place first), upcoming points to take part, what one person and a group can do,
   and what happened after people acted.
3. **Evidence → "Air emissions … will be safe"**: *Unresolved*, split into three propositions; the
   safety checklist (for whom, conditions, dose, evidence type, children, uncertainty factors,
   funding, overreach).
4. **"Under the modelled normal-operations scenario…"**: the figure with its log scale, two
   readings by eye that disagree, and why the claim needs expert review.
5. **"Council has already approved the rezoning"**: *Contradicted*; four posts, two of them
   repeats, so two independent origins.
6. **Organisations**: holding shares for clients is not owning; funding is not control.
7. **Decisions & authority**: two bodies, two laws; the bylaw is *Proposed: not in force*; original
   wording beside plain language; a guideline is *not a legal limit*.
8. **Actions**: two open routes with checked dates, one *Check this date before relying on it*, one
   closed, two questions with *No verified route*. Start a draft, try to approve it with the
   template's brackets still in, then fill them and approve: *Nothing has been sent.*
9. **Coalition**: a position statement with one paragraph held back; try adding a note with a phone
   number or "corrupt".

## What is implemented

- **Data model** (`lib/model.ts`) and one fully worked demo issue (`lib/demo/`): 24 sources with 68
  passages, 13 claims, 6 typed relationships, 2 decisions with 8 provisions, 7 action routes, 2
  no-route records, an outcome log and a coalition seed. One more issue is listed as *not
  researched*.
- **Rules** (`lib/rules/`), deterministic and tested:
  - status guard: a verdict with no matching evidence is shown as unresolved
  - deadline states: open only if still ahead and checked within 14 days
  - legal force: proposed text never binding, guidelines never more than guidance
  - review gate: two reviews for high stakes, a science reviewer for estimated figure values
  - independence: repeats followed to their origin
  - archive hash: SHA-256 over each source's text, checked on every view
  - approval gate and content check
  - position-statement check
- **One query layer** (`lib/query.ts`) used by every page and the API.
- **Screens** (`app/`): home and search, issue overview, evidence explorer, claim page, source viewer,
  organisations, decisions and authority, actions with drafting and the approval gate, coalition
  workspace, method page.
- **Read-only API** (`app/api/v0/`, GET only):

  | Operation | Route |
  | --- | --- |
  | Index | `GET /api/v0` |
  | Search issues | `GET /api/v0/issues?q=&jurisdiction=` |
  | One issue | `GET /api/v0/issues/{id}` |
  | A claim with its evidence | `GET /api/v0/claims/{id}` |
  | Decision timeline | `GET /api/v0/issues/{id}/timeline` |
  | Action options | `GET /api/v0/issues/{id}/actions` |
  | A source | `GET /api/v0/sources/{id}` |

  Every answer carries `demo: true`, the notice and the demo clock.
- **Safeguards:** a per-request Content-Security-Policy with `connect-src 'self'` and
  `form-action 'self'`; a host check against DNS rebinding; no third-party scripts, analytics or
  cookies.

## What is mocked

- **All content.** Nothing describes a real decision.
- **The reviewers, the review history and the corrections.**
- **The coalition workspace.** It starts from seed data, and whatever you add is kept in your
  browser's storage (keys starting `civic-trace:`); the page has a button that clears it.
- **The outcome log.** Seeded entries, plus your own "I sent it" entries, kept in your browser.
- **The dispute button**, which is shown disabled.
- **The figure.** Drawn from the demo's data. A real deployment would show the original image too.
- **Sending.** It doesn't exist. Approval hands the text back to you to copy.

## Known limitations

- **No ingestion or editor.** Sources and claims are typed into TypeScript files by hand.
- **No accounts, no sharing, no moderation beyond a pattern check.** The pattern check misses things
  and can flag innocent text.
- **No MCP server.** It is designed in ARCHITECTURE.md § MCP and not implemented. Nothing here
  claims MCP support.
- **No real sources verified.** The research session's fetches of government and registry sites
  were denied by the build environment's network policy (RESEARCH_REGISTER.md).
- **Not yet tested with people.** No assistive-technology audit, and English only.
- **The "where are you?" choice** only reorders sections; eligibility is never decided for you.
- **One issue.** Search is a keyword match over a handful of records.

## Next validation steps

1. Moderated sessions with five to eight people across the three personas, using the questions in
   ROADMAP.md § Stage 0 (above all: is "insufficient evidence" read as "false"?).
2. A lawyer and a scientist read the demo's legal and scientific framing for what would mislead if
   it were real.
3. Unblock the research environment's network access and complete the source checks in
   RESEARCH_REGISTER.md.
4. Choose the pilot jurisdiction and live decision (Q1–Q2), then build ingestion and the
   review queue for that one issue.

## Where this lives

This folder sits inside the DotAmi repository only because that was the repository available when
it was built. It is self-contained, with its own `package.json`, dependencies, tests and server. It
imports nothing from DotAmi and DotAmi imports nothing from it. DotAmi's root `tsconfig.json`
excludes it, and DotAmi's privacy inventory lists it as a folder its network scan doesn't read. It
can be moved to its own repository as it is.
