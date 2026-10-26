# Civic Trace: concept

*Working name, not checked for trademarks. Status: prototype on invented demo data. Written 2026-10-26.*

## One sentence

Civic Trace takes one public decision and lays it out as a chain anyone can follow: what each source
says, what the evidence actually supports, what is still unknown, who has the authority to decide,
which verified processes people can use to take part, and what happened when they did.

## Who it is for, and the jobs they hire it for

| Who | The job |
| --- | --- |
| **A concerned resident** who has just heard about something (a facility, a rule, a contract) | "Tell me what is actually happening, whether the alarming or reassuring thing I heard is true, whether it affects me, and what I can realistically do before it's too late." |
| **A volunteer researcher** (a retired engineer, a librarian, a student, a local reporter) | "Help me turn a pile of documents into claims I can check, with every quotation traceable, without overstating anything, and let someone else check my work." |
| **A coalition organiser** (a residents' association, a parents' group, a union local) | "Help a group agree on one concrete objective, find the process that can deliver it, write a position we can defend, and keep track of what happened." |

Second-ring users, not designed for yet: councillors' and officials' staff (who want to know what
residents think is happening), journalists, civics teachers, and applicants or institutions that
want to see and correct how their statements are being read.

## Core value

Fragmented public information becomes a chain you can audit:

**public information → traceable evidence → what it means → who decides → what people can do → what happened.**

What makes that different from what exists:

- **From news aggregation:** a news story is one source among others here. The unit is a precise
  proposition with a status and the specific passages behind it, not an article.
- **From institutional press releases:** an institution's statement is a claim like any other.
  It gets the same status scale as an allegation against the institution.
- **From generic AI summaries:** nothing is synthesised without a passage behind it. Statuses,
  deadline states and legal-force labels come from deterministic rules, never from a model. The
  prototype uses no model at all.
- **From petition and campaign sites:** the action layer ends in a named decision-maker and a
  verified process with a deadline, eligibility and limits, never "share this", and it says plainly
  when no route exists.

## Boundaries and non-goals

- Not a news site, not a fact-check verdict machine, and not a platform with positions of its own.
- Not legal, medical or scientific advice, and not a substitute for qualified review.
- Never sends, files, submits, publishes, joins or contacts anything for anyone. It drafts; the
  person approves the exact text; the person sends it.
- No profiles of private individuals. Public offices are named by office. Statements about a named
  office-holder's conduct are handled as questions for the body that decides them.
- No whistleblower upload system. That is a separate, security-critical project.
- Not a worldwide intelligence system. It covers decisions where someone has done the evidence work,
  and says so where nobody has.
- No ranking of people, no engagement-maximising feeds, no outrage metrics.

## Three plausible starting niches

1. **Local facility siting.** A proposed industrial or infrastructure facility near homes, needing
   both a municipal land-use decision and a provincial or state environmental approval.
   - *For:* bounded geography, named authorities, defined windows to take part (hearings, comment
     periods), outcomes that can be observed, and local stakes that favour agency over outrage.
     It needs all three kinds of evidence, each in a small, honest dose: an exposure assessment,
     legal instruments, and corporate relationships.
   - *Against:* each issue is small, process rules differ by jurisdiction, and a template has to be
     built for each jurisdiction.
2. **National regulatory proposals on chemical or environmental exposure** (a pesticide
   re-evaluation, a drinking-water standard) during their public comment period.
   - *For:* rich scientific evidence, formal comment processes, national reach.
   - *Against:* the science is hard to review honestly with volunteers, comments rarely have a
     visible effect, and outcomes are slow and diffuse. It also invites the "is it safe?" fights the
     tool is least able to settle.
3. **Influence tracing on a single bill or regulation:** lobbying registrations, funding, meetings
   and public positions tied to one decision.
   - *For:* high public interest, and structured disclosure data exists in many places.
   - *Against:* the highest risk of turning association into accusation, weak action routes for
     residents, and outcomes that are hard to attribute.

## Recommendation: start with local facility siting

The narrow first use case: **one proposed facility, in one jurisdiction pair (a municipality and
its province or state), followed from application to decision.**

Why:

- **Trust can be earned at a small scale.** Every claim can be reviewed by two people, and every
  deadline checked against its source within days. A mistake costs one community, not a country.
- **Agency is real.** Hearings and statements of concern are designed for residents, and
  eligibility rules (such as "directly affected") make "who can do what" concrete.
- **Every hard part of the method shows up, in small doses.** Separating "safe" into propositions;
  telling a guideline from a limit and a proposal from a law; ownership versus client holdings;
  history versus prediction; trimmed video. The demo issue exercises each of these.
- **Outcomes can be observed.** A decision is published with or without conditions, and an outcome
  log can show whether people's actions changed anything.
- **Both sides need the same tool.** Supporters and opponents of a facility use the same hearing,
  so a neutral evidence layer is genuinely useful to both, which is how neutrality gets tested.

The prototype's demo issue (a fictional battery-metals recovery facility in a fictional town) is
built on this niche. The pilot jurisdiction is an open choice (RESEARCH_REGISTER.md, Q1). The team
behind this repository has worked in Alberta before, which may count for it, but the process rules
there haven't been verified for this project.

## Evidence analysis versus campaigning

The product has three layers, and the line between them is the product's integrity:

| Layer | Who writes it | What it may do | What it may not do |
| --- | --- | --- | --- |
| **Evidence** (claims, statuses, passages, review) | Researchers and reviewers, under the method | Say what sources say, what the evidence supports, what is unknown | Take a side, set an objective, use loaded language, count repetition as corroboration |
| **Routes** (authorities, processes, deadlines, eligibility) | Researchers, checked against the process's own text | Describe how anyone can take part, and say when no route exists | Recommend a position; show different routes to different sides |
| **Coalitions** (objectives, asks, position statements) | Users, in their own spaces | Advocate, ask, organise, disagree | State as fact what the evidence layer hasn't established; target private individuals; send anything without a person's approval |

The platform itself never campaigns. A coalition's position statement can ask for anything, but a
paragraph that states something as fact must rest on evidence the evidence layer supports, or it is
held back with the reason. The same routes are shown to everyone: in the demo, a pro-facility group
could use the same hearing.
