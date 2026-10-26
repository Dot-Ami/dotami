# Civic Trace: architecture

*What the prototype implements, and the simplest architecture that could carry the single-issue
pilot and a reviewed public beta. Written 2026-10-26.*

## Principles

1. **One evidence system, several doors.** The website, the API and a future MCP server are access
   layers over the same query functions. None has its own logic, so a rule (which status may be
   shown, which deadline counts as current) applies everywhere at once.
2. **Rules decide; people review; models at most assist.** Statuses, deadline states, legal-force
   labels, independence counts and the approval gate are deterministic code. If models are added
   later, they propose passage boundaries, transcript alignments or table readings for a person
   to confirm. They never set a status or write a quotation.
3. **Quotations are references.** A quotation is `{ sourceId, passageId }`, rendered from the
   archived passage. There is no field to type one into.
4. **A monolith.** One web application, one relational database, one object store, one background
   job runner. No microservices or multi-agent pipelines: the bottleneck is human review, not
   compute, and every extra moving part is a place for provenance to break.

## Shape

```
  public sources                     people
  (records, filings, video, posts)   (researchers, reviewers, residents, coalitions)
        │                                      │
        ▼                                      ▼
┌──────────────────┐   ┌────────────────────────────────────────────────────────────┐
│ Ingestion        │   │ Web app (Next.js): issue pages, evidence explorer, source   │
│ fetch · archive  │   │ viewer, decisions, actions + approval gate, coalition       │
│ hash · extract   │   │ spaces, researcher/reviewer tools (pilot)                   │
│ locate passages  │   └───────────────┬────────────────────────────────────────────┘
└───────┬──────────┘                   │            ┌─────────────────────────┐
        ▼                              │            │ Read-only API  /api/v0  │
┌──────────────────┐                   │            └───────────┬─────────────┘
│ Source store     │                   │            ┌───────────┴─────────────┐
│ blobs by SHA-256 │                   │            │ MCP server (planned)    │
│ versions, terms  │                   │            └───────────┬─────────────┘
└───────┬──────────┘                   ▼                        ▼
        ▼                 ┌──────────────────────────────────────────────────────┐
┌──────────────────┐      │ Query layer (lib/query.ts)                            │
│ Evidence graph   │─────▶│   └ rules (lib/rules/): status guard, deadlines,      │
│ passages, claims │      │     legal force, review gate, independence, approval, │
│ entities, links, │      │     statement check, content check, archive hash      │
│ decisions, routes│      └──────────────────────────────────────────────────────┘
└──────────────────┘
        ▲
        │ review events, corrections, disputes (audit log)
```

In the prototype, the source store and evidence graph are typed TypeScript modules
(`lib/demo/*.ts`) holding invented data. Ingestion, the stores' database and the
researcher/reviewer tools are not built.

## Components

### Source ingestion (pilot)

- **Manual first.** A researcher registers a source by address or upload. Assisted extraction comes
  later and is always confirmed by a person.
- **Fetch politely and lawfully:** one request per document, honouring robots rules and the
  publisher's terms; no bulk scraping; record the terms that apply (register Q12).
- **Archive on fetch:** store the bytes, their SHA-256, the retrieval time and, where allowed, a
  third-party archive copy. A source page always shows whether the text still matches its hash.
- **Extract with locators:** text with page numbers; tables as tables; figures as images with
  caption, axes, units and legend recorded; transcripts with timestamps and speaker identification
  (named in the record, inferred, unknown).
- **Passages are confirmed by a person** before anything can cite them.

### Hostile content

Source documents are untrusted input:

- **Text is data, never instructions.** Source text is rendered escaped (React does this), never as
  HTML, and is never handed to a model that has tools or write access. If a model assists
  extraction, its output is a proposal in a review queue, and the source text it read is quoted
  back to the reviewer beside it, so text planted to manipulate it is visible.
- **Uploads:** type checked from the bytes, size capped, stored outside the web root, never
  executed, parsed in a sandboxed worker with a time limit. PDFs are rendered to text and images,
  not run.
- **The MCP server returns passages as quoted data with provenance**, so a client model can tell
  source text from instructions. That is a mitigation for prompt injection, not a guarantee.

### Document storage and provenance

- **Blobs** in object storage, addressed by SHA-256; never edited, only superseded.
- **Versions:** each re-fetch that changes the content makes a new version with a date and a note;
  passages belong to a version. A claim cites a passage in a specific version.
- **Copies and derivations:** a source can declare what it copies (`derivedFromId`), and a passage
  what it repeats (`repeats`), which the independence rule follows.
- **Terms:** per source, whether a full copy may be shown or only short passages with a link.

### Claims and evidence

- A **claim** is a precise proposition with a kind, where it is asserted, a status, a one-line
  reason, evidence links (supports, against, qualifies, context) each with a note, and five
  separate fields: supported conclusion, interpretation, unknowns, what would change it, justified
  action. Broad claims are split (`splitInto`).
- **Status guard:** a verdict with no matching evidence is shown as unresolved.
- **Independence:** assertions and evidence are counted by distinct publishers at the root of any
  repeats.
- **Figures:** extractions record method (stated in a table, or estimated by eye), range and
  reader; a claim depending on an estimate needs a science reviewer.

### Entities and typed relationships

- **Entities** are organisations and public offices. Private individuals are never entities.
- **Relationships** use eleven precise types, each with what it means and what it does not. There
  is no "controls" type. Each relationship carries exact amounts, dates, evidence and a status.

### Decision timelines

- A **decision** has an authority, a jurisdiction, an instrument, a stage and the passages that
  establish it. A stage short of a decision is always labelled "not in force" or "not decided".
- **Provisions** pair original wording (a passage) with plain language and a legal force. Text from
  a proposed law can't be shown as binding; a guideline can't be shown as more than guidance.
- **Timeline events** carry date certainty and mark intervention points.

### Review workflow (pilot)

```
draft ──▶ in review ──▶ reviewed
              │             ▲
              ▼             │
      needs expert review ──┘     (any state) ──▶ corrected (logged) ──▶ re-review
```

- Two reviews for high-stakes claims, one otherwise; a science reviewer for estimated values; a law
  reviewer for provisions flagged "needs a lawyer's reading".
- A reviewer can't review their own claim. Every review, status change and correction is an
  append-only event with who, when and why.
- **Disputes** (from anyone, including the institutions involved) open a correction request that a
  different reviewer handles; the outcome is logged on the claim. **Appeals** go to an editor not
  involved in either.
- **Private research and public publication are separate states:** drafts and coalition spaces
  are private; only reviewed claims are public.

### Action routes

- A **route** has a receiving body, a decision-maker, a process and eligibility (each citing
  passages), a deadline with its source, how it was worked out and when it was last checked, what
  it needs, effort (labelled a guess), limits, unknowns and the claims it rests on.
- **Deadline rule:** open only when ahead and checked within 14 days; otherwise "check this date"
  or "closed". The clock is passed in: the demo uses its own; a deployment uses the real date.
- **No-route records** answer common questions that have no verified route.
- **Approval gate:** final text is handed back only after the person approves this exact text for
  this destination. Nothing is sent: the person sends it. No endpoint accepts submissions, and the
  browser policy blocks connections and form posts to other addresses.

### Coalition spaces

- Prototype: browser-local. Pilot: private spaces with invited members (pseudonyms allowed),
  roles, tasks, questions, the position-statement check, disclosures, disagreements, milestones and
  outcomes. Moderation: the content check first, then human moderators. Nothing a coalition writes is
  public unless its members publish it.

### Website

Next.js App Router, server-rendered pages over the query layer, small client components for
drafting, the coalition workspace and the place picker. Per-request Content-Security-Policy with a
nonce; host check against DNS rebinding; no third-party scripts.

## Minimal data model

| Entity | Key fields |
| --- | --- |
| Jurisdiction | id, name, level, parent |
| Entity | id, name, kind (company, regulator, council, public office, …), jurisdiction |
| Authority | entity, jurisdiction, what it decides, what it cannot, basis (passages) |
| Source | id, title, kind, publisher, commissioned by, published, retrieved, original address, archive {date, sha256}, versions, derived from, terms (pilot) |
| Passage | source (+ version), id, locator (page/section/table/figure/timestamp), text, statement type, speaker {label, identification}, repeats |
| Figure / Extraction | caption passage, axes {label, unit, scale}, series, markers; extraction {x, value, unit, method, range, reader, note} |
| Claim | id, issue, proposition, kind, asserted in (passages), status, reason, evidence links {passage, stance, note}, supported conclusion, interpretation, unknowns, would change, justified action, split into, related, depends on extractions, safety questions, high stakes, review |
| Review event *(pilot)* | claim, reviewer, expertise, date, decision, note |
| Correction | claim, date, change, reason |
| Relationship | type, from, to, detail, period, evidence links, status, does not establish |
| Decision | issue, title, instrument, authority, jurisdiction, stage, stage basis |
| Provision | decision, original (passage), plain language, force, definitions, exemptions, enforcement, effective date, uncertainty, expert review needed |
| Timeline event | decision, date, date certainty, title, description, source, intervention point |
| Action route | issue, decision, kind, outcome sought, authority, received by, process + basis, eligibility + basis, deadline {date, time, source, derivation, last checked}, needs, effort, limits, unknowns, rests on claims, destination label |
| No route | issue, question, why, basis, could be researched |
| Outcome entry | issue, date, route, what was done, response, result, source |
| Issue | title, state (researched / intake only), jurisdictions, tags, summary, key question, affected groups {group, how, confidence, basis}, decisions, claims |
| Coalition *(private store)* | issue, objective + route, roles, members {pseudonym, role, disclosure}, tasks, questions, position statement {paragraphs {kind, text, basis}, reviews}, disagreements, milestones |

The prototype's TypeScript types are in `lib/model.ts`. For the pilot, PostgreSQL fits: relational
for the graph, JSON for locators and safety checklists, full-text search before any search engine.

## API (built, v0, read-only)

| Operation | Route | Query function |
| --- | --- | --- |
| `search_issues` | `GET /api/v0/issues?q=&jurisdiction=` | `searchIssues` |
| `get_issue` | `GET /api/v0/issues/{issueId}` | `getIssue` |
| `get_claim_evidence` | `GET /api/v0/claims/{claimId}` | `getClaim` |
| `get_decision_timeline` | `GET /api/v0/issues/{issueId}/timeline` | `getTimeline` |
| `get_action_options` | `GET /api/v0/issues/{issueId}/actions` | `getActions` |
| `get_source` | `GET /api/v0/sources/{sourceId}` | `getSource` |

Every answer is `{ apiVersion, demo: true, notice, demoClock, data }`. Routes export only `GET`
(other methods get 405). The actions answer leaves out draft templates: the API describes routes and
doesn't prepare submissions. A pilot would add versioning, pagination, rate limits and caching
headers for published (reviewed) content. A write API, if ever, would be for authenticated
reviewers only.

## MCP interface (planned, not implemented)

An MCP server would be a third door onto the same query layer: no new logic and no write tools.

- **Tools**, read-only and one-to-one with the API: `search_issues`, `get_issue`,
  `get_claim_evidence`, `get_decision_timeline`, `get_action_options`, `get_source`.
- **Resources:** `issue://{id}`, `claim://{id}`, `source://{id}#{passage}`, so a client can cite a
  passage by a stable address.
- **Every result carries** the status with its meaning and what it doesn't mean, the review state,
  the demo flag (or published/draft state), and passages as quoted data with source and locator.
  This lets a client model answer "is X true?" with the status and its limits instead of a yes or no.
- **No tools that act:** no send, submit, file, post or contact. An assistant could help a person
  draft; the approval gate stays in the web app, in front of the person.
- **Prompt-injection posture:** source text goes back marked as quoted source content; the server
  never follows instructions found in sources; a test suite of planted instructions would be part
  of the build.
- **Transport:** stdio for a local server first, using the same Node runtime and calling the query
  functions directly.

Nothing in this repository implements MCP yet, and the prototype doesn't claim it does.

## Security and privacy

- **Prototype:** local only (host check), no accounts, no server-side user data, CSP with
  `connect-src 'self'` and `form-action 'self'`, browser storage for per-person conveniences only,
  framework telemetry switched off in the npm scripts.
- **Pilot additions:** reviewer and coalition accounts with MFA; role-based access (researcher,
  reviewer, editor, coalition member); an audit log; rate limits; backups; a privacy review and
  retention policy before any personal data is stored; moderation tools; a published process for
  takedowns, corrections and disputes.

## What the prototype implements

| Part | State |
| --- | --- |
| Data model, demo dataset, rules, query layer | Built (`lib/`) |
| Web screens (home, issue, evidence, claim, source, organisations, decisions, actions, coalition, method) | Built (`app/`, `components/`) |
| Read-only API | Built (`app/api/v0/`) |
| Archive hash check, approval gate, content check, statement check | Built |
| Coalition storage | Mocked (browser) |
| Ingestion, editor, review queue, disputes, accounts, MCP | Not built |
