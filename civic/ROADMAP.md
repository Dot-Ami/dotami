# Civic Trace: roadmap

*Four stages, each ending in a decision to continue, change course, or stop. No dates: each stage
ends when its exit criteria are met, not on a calendar. Written 2026-10-26.*

## Stage 0: Prototype (this folder)

**Goal.** Show, on invented data, that the method can be made concrete: precise claims with
statuses, passages behind every quotation, decisions with their authority and legal force, action
routes with honest deadline states, and an approval gate in front of anything external.

**Scope.** One fully worked demo issue and one "not researched" issue; ten screens; a read-only API;
70 unit tests and 10 browser tests for the brief's guarantees.

**Exit criteria.**
- [x] The end-to-end journey works on the production build, with tests for the six required
      guarantees.
- [ ] Five to eight people from the three personas use it in moderated sessions (below), and at
      least two of the three journeys can be completed without help.
- [ ] A lawyer and a scientist read the demo's legal and scientific framing and flag what would be
      misleading if it were real.
- [ ] A decision on the pilot jurisdiction and issue (RESEARCH_REGISTER.md, Q1–Q3).

**Biggest unknowns.** Whether people read past the first status badge; whether the five-layer
claim page is too much; whether "Unresolved" reads as "they're hiding something".

**Validate with real users.**
- Can a person say the stage, the decision-maker and one unknown after ten minutes?
- Does "insufficient evidence" get read as "false"? (The method fails if it does.)
- Does the approval step feel like protection or like friction?
- Would an organiser use the position-statement check, or route around it?

## Stage 1: Single-issue pilot

**Goal.** One real, live decision, researched and reviewed by real people, used by real residents
before a real deadline, with outcomes logged.

**Scope.**
- One jurisdiction pair (a municipality and its province or state), one facility-siting decision
  picked with at least six weeks before its first intervention point.
- Researcher tools: register a source, archive and hash it, mark passages, write claims, link
  evidence. Reviewer tools: review queue, two-person rule, corrections log, disputes.
- Accounts for researchers, reviewers and one or two coalitions; everything else open without an
  account.
- Opt-in deadline reminders (the first stored personal data: needs a privacy review first).
- A published methods page, funding statement and corrections policy.
- An invitation to the applicant and the authorities to review how their documents are quoted.

**Exit criteria.**
- Every consequential claim reviewed to the method's rules before the first intervention point.
- Zero wrong deadlines shown as current; every correction logged within a set time.
- At least 30 residents use it before the deadline, and some take part through a verified route.
  The exact number is a guess to revise once the issue is chosen.
- People on both sides of the issue rate the evidence layer as fair, and the gap between their
  ratings is small.
- An outcome is logged for most actions taken.
- A reviewer-hours-per-claim figure good enough to plan the beta.

**Biggest unknowns.** Review capacity and cost; whether the authority or applicant engages or
objects; legal exposure from quoting and archiving; whether residents arrive early enough to act.

**Validate with real users.** Calibration (confidence moves toward the status in both directions);
whether submissions written from the tool are accepted, read and cited; what organisers actually
need from a coalition space; whether moderation load is manageable.

**Stop or change course if** reviews can't keep pace with a single issue, or one side consistently
rates the tool as biased against it and the method review finds they are right.

## Stage 2: Reviewed public beta

**Goal.** Several issues in a few jurisdictions, researched by a trained volunteer pool, with the
method holding up as volume grows.

**Scope.**
- Jurisdiction templates: authorities, processes, the passages behind each route, and staleness
  checks per process type.
- Researcher onboarding and a credit system; editor role; published review statistics.
- Model-assisted extraction (transcript alignment, table reading, passage boundaries) behind human
  confirmation, with a test suite of planted instructions.
- The MCP server (read-only), once the API is stable.
- An independent audit of a sample of claims; an accessibility audit with assistive-technology
  users; translations where the community needs them.
- A sustainable funding model with conflicts published, refusing money from parties to covered
  decisions.

**Exit criteria.**
- An external audit finds a correction rate below an agreed threshold and no unsupported
  high-stakes claim published.
- Review time per claim is stable or falling as volume grows.
- Most issues reach a logged outcome.
- Accessibility audit passed (WCAG 2.2 AA).

**Biggest unknowns.** Whether volunteers can be trained to the method at scale; whether model
assistance speeds review without lowering it; legal environment per jurisdiction; abuse
(coordinated brigading of disputes, coalitions used for harassment).

**Validate with real users.** Whether new researchers' claims pass review at a rate that makes the
pool worth training; whether the tool changes how residents engage (earlier, more on-topic); whether
officials find submissions more useful.

## Stage 3: Later expansion

Only after the beta shows the method holds:

- New issue types: national regulatory proposals with comment periods; influence tracing on single
  decisions (the riskiest niche: needs the strongest review).
- Scientific evidence at depth: study-quality appraisal frameworks applied by qualified reviewers,
  systematic searches for independent studies, and tools for figure extraction with uncertainty.
- Video: playback at timestamps, clip-versus-full-recording comparison, speaker identification with
  stated confidence.
- Partnerships with libraries, civic educators and local newsrooms as researcher pools.
- Write access for institutions to respond on the record (their response is a source like any other).

**Out of scope at every stage:** a whistleblower intake system (a separate project with its own
security design), automated sending or filing, and ranking people.
