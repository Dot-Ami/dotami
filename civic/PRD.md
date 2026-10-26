# Civic Trace: product requirements

*Scope: the MVP that the prototype in this folder demonstrates, plus what the single-issue pilot
would need. "Built" means implemented and tested in the prototype; "Mocked" means it is shown with
invented data or local-only storage; "Deferred" means not built. Written 2026-10-26.*

## 1. Problem

Decisions that change people's surroundings and rights are made in public but are hard to follow:

- **The information is scattered** across a consultant's report, a guideline, a bylaw, minutes, a
  video, a notice and a corporate filing, each in its own format and vocabulary.
- **Both directions mislead.** Institutional summaries overstate certainty ("no health risk").
  Viral claims overstate wrongdoing ("already approved", "owns the company"). Most people have no
  way to check either.
- **Timing is unforgiving.** Windows for public input are short, set by rules people don't know,
  and often closed by the time anyone hears about the decision.
- **Generic AI summaries make it worse.** Fluent text without passages behind it is exactly the
  failure this tool exists to prevent.
- **Action rarely connects to authority.** "Raise awareness" and petitions to the wrong body use
  up energy that a five-minute hearing submission to the right one would have used well.
- **Nobody closes the loop.** People rarely find out whether taking part changed anything.

## 2. Goals

1. A person can understand, in minutes, what is being decided, at what stage, by whom, and what is
   established versus unknown, with every consequential claim one click from its source passage.
2. A person can find a verified way to take part that fits them (eligibility, deadline, effort), or
   learn plainly that none exists.
3. A group can organise around one concrete objective without turning suspicion into accusation.
4. Outcomes are tracked, so the tool learns which routes work.
5. Trust is earned across the spectrum: people on different sides of an issue rate the evidence
   layer as fair.

Non-goals are in CONCEPT.md § Boundaries.

## 3. Personas

- **Priya, concerned resident.** Lives 400 m from a proposed facility. Two children at the nearby
  school. Saw a viral clip saying the rezoning is "already approved". Has 30 minutes on a weeknight.
  Doesn't read technical reports and doesn't trust the company or the people shouting at it.
- **Tom, volunteer researcher.** Retired process engineer. Comfortable with PDFs and tables, not
  with law. Wants his work checked and credited, and is worried about being wrong in public.
- **Aisha, coalition organiser.** Runs a residents' association. Needs a defensible position, a
  task list, and to keep members from posting things that get the group sued or discredited.
- **Reviewer (secondary).** A volunteer or staff editor with a science, law or general background
  who checks claims, extractions and paragraphs against passages.

## 4. Primary use cases

| ID | Use case | Prototype |
| --- | --- | --- |
| UC1 | Find an issue by topic, place or jurisdiction | Built (keyword and jurisdiction search over demo issues) |
| UC2 | Read an issue overview that answers the core questions in order | Built |
| UC3 | Check a specific claim: status, passages for and against, what's unknown | Built |
| UC4 | See who decides each part, at what stage, under which text | Built |
| UC5 | Find and use a verified action route, or learn none exists | Built (routes, deadline states, no-route records) |
| UC6 | Draft a submission, approve the exact text, and send it yourself | Built (local draft, approval gate, copy text; never sends) |
| UC7 | Organise a group around an objective with a reviewed position statement | Mocked (browser-local workspace) |
| UC8 | Log what happened after acting | Mocked (seeded log plus a personal log in the browser) |
| UC9 | Add sources, write claims, review them | Deferred (demo content written by hand) |
| UC10 | Dispute an assessment and get a correction | Deferred (correction log shown; dispute button not built) |

## 5. MVP functional requirements

### Evidence

- **FR-1 Source records.** Each source has kind, publisher, commissioning party (when stated),
  published and retrieved dates, original address, archived copy with SHA-256, version history,
  and whether it copies another source. *Built (demo data); the hash is checked on every view.*
- **FR-2 Passages.** Every quotation is a passage of a source, with a locator (page, section, table,
  figure, timestamp), statement type, and speaker with how they were identified. No screen types a
  quotation. *Built.*
- **FR-3 Claims as precise propositions** with kind, where they are asserted, status (supported,
  partly supported, contradicted, unresolved, insufficient evidence), a one-line reason, evidence
  links by stance (supports, against, qualifies, context), and five separate fields: what the
  evidence supports, our interpretation, what is unknown, what would change the assessment, and what
  action is justified. *Built.*
- **FR-4 Splitting.** A broad claim is split into its separate propositions, each with its own
  status. *Built.*
- **FR-5 Status guard.** A verdict status with no matching evidence linked is shown as unresolved,
  with the reason. *Built and tested.*
- **FR-6 Independence.** Repeats are followed back to the passage they repeat; assertions and
  evidence are counted by independent origin. *Built.*
- **FR-7 Safety-claim checklist.** For an exposure claim: for whom, conditions, dose, route and
  duration, evidence type, endpoints, population, vulnerable groups, uncertainty factors, effect
  sizes, funding and conflicts, overreach, independent studies. Each answered from passages or shown
  as not addressed. *Built for the demo claim.*
- **FR-8 Figures.** Units, scale, legend, receptors, caption kept; values read off are labelled as
  stated in a table or estimated by eye, with range and reader; a claim resting on an estimate needs
  expert review. *Built.*

### Law and decisions

- **FR-9 Decisions** with authority, jurisdiction, instrument, stage (never "enacted" before it
  is), and the passages that establish the stage. *Built.*
- **FR-10 Provisions** with original wording (a passage) beside plain language, legal force
  (binding, would bind if passed, guidance, procedure), definitions, enforcement, effective date,
  uncertainty, and a "needs a lawyer's reading" flag. Proposed text can never be shown as binding.
  *Built.*
- **FR-11 Authority** with what it decides and what it cannot. *Built.*
- **FR-12 Timeline** with date certainty (fixed, scheduled, tentative, unknown) and intervention
  points. *Built.*

### Organisations

- **FR-13 Typed relationships** (ownership, beneficial ownership, assets managed for clients,
  voting authority, board role, employment, funding, contract, partnership, event participation,
  public endorsement) with exact amounts and dates, evidence, status, and what each does not
  establish. No "controls" type. *Built.*

### Action

- **FR-14 Action cards** with outcome sought, receiving body, decision-maker, process and its
  source, jurisdiction, eligibility and its source, deadline with last-checked date, what it needs,
  effort (labelled a guess), limits, unknowns, the claims it rests on, next step, follow-up. *Built.*
- **FR-15 Deadline states.** Open only when ahead and checked against its source within 14 days;
  otherwise "check this date" or "closed". Only open deadlines appear as upcoming points to take
  part. *Built and tested.*
- **FR-16 No-route records** for common questions without a verified route, with why and what
  could be researched. *Built.*
- **FR-17 Approval gate.** Final text is handed back only after the person confirms destination and
  text for this exact text; any later edit voids the approval; drafts with unfilled placeholders,
  contact details or accusations are refused. Nothing is sent. *Built and tested.*
- **FR-18 Outcome log.** *Mocked.*

### Coalition

- **FR-19 Workspace:** objective tied to a route, roles, tasks, open questions, shared evidence,
  pseudonymous members with disclosures, disagreements and corrections log, milestones, outcome log,
  notes. *Mocked: browser-local.*
- **FR-20 Position statement check:** paragraphs labelled fact, ask or view; a fact must rest on a
  passage or on a supported or partly supported claim, or it is held back; two reviews needed.
  *Built (check); mocked (reviews).*
- **FR-21 Content check:** blocks contact details, addresses, personal details and wrongdoing stated
  as fact, with a reason and a way to rephrase. *Built (pattern check, see risks).*

### Access

- **FR-22 Read-only API** over the same query layer. *Built (v0, GET only).*
- **FR-23 MCP server** over the same query layer. *Deferred; designed in ARCHITECTURE.md.*

## 6. Trust requirements

- **T1** Every consequential claim links to a passage; links are tested to resolve.
- **T2** What a source says, what the evidence supports, our interpretation, what is unknown and the
  proposed action are visibly distinct, each with a written label (not colour alone).
- **T3** High-stakes claims (health, a public office-holder's conduct, anything an action rests on)
  need two reviews; estimated figure values need a science reviewer.
- **T4** Corrections are logged with date and reason; disputes go to a different reviewer
  (deferred); nothing is silently edited. Archived copies are hashed.
- **T5** Repetition is never counted as corroboration.
- **T6** Funding sources of the platform and its reviewers' affiliations are published (pilot).
- **T7** Source text is data, never instructions (ARCHITECTURE.md § Hostile content).
- **T8** No platform position: the same routes for every side; a tone check keeps the team's own
  words calm.

## 7. Accessibility requirements

- Target WCAG 2.2 AA. Semantic headings, landmarks, a skip link, labelled form controls,
  visible focus, live regions for check results.
- Status is symbol + words + colour, never colour alone. Charts have a text description and a table
  of the values.
- Plain language in everything the team writes; legal and scientific terms explained where used.
- Works at phone width with no sideways scrolling (checked at 390 px); works in dark mode; prints.
- *Not yet done:* an audit with assistive-technology users, reading-level testing, translations.

## 8. Privacy requirements

- No accounts in the MVP; nothing about the person is stored on the server.
- "Where are you?" is a choice of rough areas, never an address, kept in the browser.
- Drafts, coalition notes and a personal log stay in the browser, with a clear-all control.
- No analytics, no third-party scripts; the browser policy blocks connections and form posts to any
  other address; the server answers only on the local machine.
- Private research and public publication are separate states (pilot); nothing a coalition writes
  is public unless its members publish it.
- The pilot will need a privacy review before collecting anything (accounts, emails for deadline
  reminders), and a documented retention policy.

## 9. Acceptance criteria (prototype)

Each is a test in `tests/` (unit) or `e2e/` (browser, production build):

1. Every evidence link in the data resolves to a source and passage, and every "Open in source" link
   on every claim page lands on its passage. *evidence-links.spec, e2e journey.*
2. Claims without supporting evidence are shown as unresolved or insufficient evidence; a verdict
   with no matching evidence falls back to unresolved. *claim-status.spec, e2e.*
3. Past deadlines, and deadlines not checked within 14 days, never appear as actionable current
   deadlines. *deadlines.spec, e2e.*
4. Proposed policy is never labelled enacted, and proposed text is never shown as binding.
   *decisions.spec, e2e.*
5. Demo content is labelled on every screen, in every record and in every API answer.
   *demo-labels.spec, e2e.*
6. No external action can happen without approval: the gate refuses without a full approval of the
   exact text; no code can send; the API is GET-only; the browser policy blocks other addresses; the
   whole walk makes no request to another address and no write request. *external-actions.spec, e2e.*
7. Repeats aren't counted as independent; archived text matches its hash; relationship types are
   precise; the position-statement check holds back unsupported facts; the content check blocks
   doxxing and accusations without flagging ordinary civic text.

## 10. Dependencies and risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Review capacity | The method only works if reviews happen, and they are slow | Small pilot; review queue sized to it; claims shown as "in review" rather than skipping review |
| A consequential error (wrong deadline, mislabelled relationship) | One error can discredit the tool on every side | Deadline staleness rule; two-person review on high stakes; visible corrections log |
| Perceived partisanship | Neutrality claims are cheap | Same routes for all sides; tone check; publish funding; test fairness with people on both sides |
| Defamation and harassment | Coalitions can produce accusations | Offices not people; content check; questions routed to deciding bodies; human moderation (pilot) |
| Copyright and source terms | Archiving and quoting have limits | Short passages with links; full copies only where terms allow (register Q12) |
| Process rules vary by jurisdiction | A route described wrongly sends people the wrong way | One jurisdiction pair; each route cites its process text; expert check before launch |
| Pattern-based content check | Misses things; may block innocent text | Labelled as a safety net; human moderation in the pilot |
| Volunteer burnout | Researchers do unseen work | Credit, small scope, clear tasks |
| Funding | Influences trust | Publish funders; refuse funding from parties to covered decisions |

External dependencies for a pilot: access to the pilot jurisdiction's public records and archives;
a lawyer and a scientist willing to review; a host with a privacy posture that can be explained.

## 11. Explicitly deferred

Source ingestion and the researcher editor · reviewer accounts and the review queue · disputes and
appeals · real coalition spaces (accounts, sharing, moderation) · deadline reminders · an MCP
server · model-assisted extraction (passage boundaries, transcript alignment, table reading) ·
video and audio playback at timestamps · translations · multiple jurisdictions · whistleblower
intake (a separate project, not deferred so much as out of scope) · any write API.

## 12. Success metrics

Measure understanding, verified participation and outcomes, not engagement.

| Area | Metric | How |
| --- | --- | --- |
| Understanding | After 10 minutes, can the person say the decision's stage, who decides, and one thing that is unknown? | Usability sessions with a short questionnaire; target 80% correct |
| Calibration | Does the person's confidence in a claim match its status? | Ask before and after; look for movement toward the status, both directions |
| Fairness | Do people on different sides rate the evidence layer as fair? | Same questionnaire to supporters and opponents; the gap matters more than the mean |
| Verified participation | Actions taken through a verified route, before its deadline, by eligible people | Self-reported log; spot-check against hearing agendas and records |
| Outcome tracking | Share of actions with a logged outcome within 60 days | Outcome log |
| Accuracy | Wrong deadlines shown as current (target 0); corrections per 100 claims; days to correct | Corrections log |
| Review throughput | Days from claim draft to reviewed; share of high-stakes claims reviewed by two people | Review log |

Deliberately not tracked as success: time on site, shares, returning visits, sign-ups.
