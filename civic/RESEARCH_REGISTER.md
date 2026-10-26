# Civic Trace: research register

*What this project assumes, what it still needs to find out, which real sources it needs to check,
and what is sourced versus proposed. Opened 2026-10-26.*

## Verification status: nothing external is verified yet

On 2026-10-26 the build session tried to check twelve public sources (list below) with one page
fetch each. **Every fetch failed.** The cloud environment's network policy denied the hosts
(`gazette.gc.ca`, `lobbycanada.gc.ca`, `www.canada.ca`, `www.alberta.ca`, `www.regulations.gov`,
`open.gsa.gov`, `www.federalregister.gov`, `lda.senate.gov`, `www.sec.gov`, `www.gleif.org`,
`archive.org`, `www.crossref.org`, `monographs.iarc.who.int`, `www.iarc.who.int`), and the page-fetch
tool also failed to resolve names. Web search worked, but only to find candidate addresses. Search
summaries are not page reads, and none is recorded here as a finding.

So:

- **No statement in this folder about a real institution, law, process, dataset or study has been
  verified.** Where the documents mention one, it is from general knowledge and marked *unverified*.
- **Every source entry below is "pending".** Candidate addresses came from search results and were
  not opened.
- To unblock: allow these hosts in the environment's network settings (environment menu → Edit →
  Network access → Allowed domains; steps at
  https://code.claude.com/docs/en/cloud-environments#network-access), then repeat the one-fetch
  check and fill in the "Found" column with short verbatim quotes and the date read.

## Assumptions

| ID | Assumption | Why it matters | How to test it |
| --- | --- | --- | --- |
| A1 | People will read past a status badge to the reason and the unknowns | The method fails if "Unresolved" is read as a verdict | Moderated sessions; ask people to explain a status in their words |
| A2 | "Insufficient evidence" can be understood as "not known", not "false" | A core principle of the brief | Same; compare wordings |
| A3 | Facility siting gives residents real windows to take part, early enough to use | The recommended niche rests on it | Pick candidate decisions; time from public notice to deadline |
| A4 | Volunteers can be trained to write precise propositions and link passages | Review capacity is the main risk | Pilot onboarding; first-pass review rate |
| A5 | Two-person review of high-stakes claims is affordable for one issue | Trust depends on it | Measure reviewer hours per claim in the pilot |
| A6 | A 14-day re-check of deadlines catches changes in time | Wrong deadlines are the worst failure | Log how often process dates change after first publication |
| A7 | Both supporters and opponents of a facility will find a neutral evidence layer useful | Neutrality is tested only if both sides use it | Recruit from both sides |
| A8 | Short passages with links fit fair-dealing / fair-use limits for the sources used | Quoting is the core of the product | Legal review per jurisdiction (Q12) |
| A9 | Pattern-based content checks reduce harm without blocking legitimate speech | Coalition safety | Measure false positives and misses on real posts, with consent |
| A10 | Officials will accept submissions drafted with the tool as ordinary submissions | Action routes are only useful if they work | Ask clerks and boards directly in the pilot |
| A11 | Archiving public documents with a hash is lawful and accepted as provenance | Provenance design | Legal review; archive terms |
| A12 | The prototype's stack (Next.js, TypeScript) is good enough for the pilot | Avoids a rewrite | Load and maintenance review before the pilot |

## Questions needing research

| ID | Question |
| --- | --- |
| Q1 | Which jurisdiction pair for the pilot? Criteria: public notice and hearing rules that residents can use; online access to records; a legal reviewer familiar with them. Alberta is a candidate because of the maintainer's existing work there; its process rules are *unverified* here. |
| Q2 | Which live decision? Needs at least six weeks before its first intervention point, documents online, and people on more than one side. |
| Q3 | What do residents in the pilot area already use to follow local decisions (newsletters, groups, local news), and where would this fit? |
| Q4 | In the pilot jurisdiction: who may file in an environmental approval process ("directly affected" or similar), how is eligibility decided, and does filing preserve appeal rights? (The demo's rules are invented.) |
| Q5 | In the pilot municipality: how do readings and hearings work, when must written submissions arrive, and do letters to councillors enter the hearing record? |
| Q6 | How do council codes of conduct define a pecuniary interest, and how do integrity commissioners (or their equivalents) take complaints? |
| Q7 | Which public records show corporate ownership and shareholdings in the pilot jurisdiction, and what do they actually establish? (13F-style filings, for example, are said to report investment discretion and voting authority: *unverified*.) |
| Q8 | What is the right staleness window for each kind of deadline (hearing, comment period, records request)? |
| Q9 | What reading level and layout let the five-layer claim page work on a phone? |
| Q10 | How should the tool handle an institution's request to correct how it is quoted? |
| Q11 | What funding model avoids conflicts with the decisions covered? |
| Q12 | Copyright, database rights and terms of use for quoting, archiving and hashing each source type in the pilot jurisdiction (government records, corporate filings, news, social posts, video). |
| Q13 | Defamation exposure for hosting coalition content and for claim statuses about named offices; what moderation and takedown process is needed. |
| Q14 | Which study-appraisal framework, if any, should qualified reviewers use for exposure claims at the beta stage? |

## Sources to verify

All **pending**: denied by the build environment's network policy on 2026-10-26. "Candidate
address" means it appeared in a search result and was not opened.

| ID | Source | What to verify | Candidate address (not fetched) | Found |
| --- | --- | --- | --- | --- |
| S1 | Canada Gazette, Parts I and II | What each part contains (proposed vs. enacted regulations); comment periods | https://gazette.gc.ca/cg-gc/lm-sp-eng.html | pending |
| S2 | Registry of Lobbyists (Office of the Commissioner of Lobbying of Canada) | Public search; open data or bulk download; terms | https://lobbycanada.gc.ca/en/ | pending |
| S3 | Health Canada PMRA consultations | Whether proposed decisions are published with a comment period, and its length | Search result under www.canada.ca (consultations, proposed re-evaluation decisions) | pending |
| S4 | Consulting with Canadians | Listing of open federal consultations | https://www.canada.ca/en/government/system/consultations/consultingcanadians.html | pending |
| S5 | Alberta EPEA approvals, statements of concern | Who may file; "directly affected"; where Alberta states it | https://www.alberta.ca/apply-for-environmental-protection-and-enhancement-act-approvals | pending |
| S6 | regulations.gov and the Federal Register | Public API and key requirement; proposed vs. final rules | https://open.gsa.gov/api/regulationsgov/ · https://www.federalregister.gov/reader-aids/using-federalregister-gov/understanding-the-federal-register | pending |
| S7 | U.S. Senate Lobbying Disclosure Act database | Public API | https://lda.senate.gov/api/ | pending |
| S8 | SEC Form 13F | Whether reports state investment discretion and voting authority (relevant to "managed for clients" vs. "owns") | SEC Form 13F FAQ (address uncertain) | pending |
| S9 | GLEIF Level 2 data | Direct and ultimate accounting-consolidation parents; API and licence | https://www.gleif.org/en/lei-data/access-and-use-lei-data/level-2-data-who-owns-whom | pending |
| S10 | Internet Archive Wayback Machine availability API | Exists; what it returns; terms for citing archived copies | https://archive.org/help/wayback_api.php | pending |
| S11 | Crossref REST API and Retraction Watch data | Retraction data access and licence; a search result suggests a "Labs" route is being retired: check | https://www.crossref.org/documentation/retrieve-metadata/rest-api/ | pending |
| S12 | IARC Monographs Preamble | Group definitions, and IARC's own wording on hazard versus risk at a given exposure | https://monographs.iarc.who.int/wp-content/uploads/2019/07/Preamble-2019.pdf | pending |

Why these: S1–S7 are the kinds of record action routes and influence tracing would rest on; S8–S9
test whether ownership and holdings can be typed precisely from public data; S10 is the provenance
layer; S11–S12 bear on scientific claims (retractions; hazard versus risk).

## Sourced versus proposed

| Item | Status |
| --- | --- |
| Every place, body, company, person-office, document, quotation, figure, number and date in the demo (`lib/demo/`) | **Invented.** Labelled on every screen, in every record and every API answer |
| The substance "MX-7", its guideline value and the rat study behind it | **Invented.** Not a real substance or a real guideline |
| The demo's legal processes (statements of concern, 30-day windows, hearing rules, code of conduct, records-request fees) | **Invented**, loosely modelled on common process types. Not a description of any real jurisdiction |
| SHA-256 hashes on demo sources | **Real hashes of the invented text.** They demonstrate the mechanism, nothing more |
| The method (statuses, five layers, splitting, independence, review rules, deadline staleness, approval gate) | **Proposed** by this project; to be tested with users and reviewers |
| The 14-day deadline re-check window and the two-review rule | **Proposed** defaults (Q8, A5) |
| Effort estimates on action cards | **Guesses**, labelled as such |
| Pilot targets in ROADMAP.md (resident numbers, thresholds) | **Proposed**, to revise once the pilot issue is chosen |
| Statements about real systems in these documents (e.g. what Form 13F reports, Alberta as a candidate) | **Unverified general knowledge**, marked where they appear |

## Key uncertainties

**Scientific.**
- Exposure claims turn on details volunteers can misread: averaging periods, background levels,
  receptors, and uncertainty factors. The prototype shows the questions, not answers to them.
- Reading values off figures, especially on log scales, is error-prone. The prototype requires
  expert review for any claim that rests on it, but where that expertise comes from is open.
- Hazard versus risk, animal-to-human extrapolation and vulnerable groups need qualified judgement.
  The tool can make the questions visible; it can't certify answers.

**Legal.**
- Process rules (eligibility, deadlines, appeal rights) differ by jurisdiction and change. A wrong
  route is worse than none.
- Plain-language explanations of provisions can be read as legal advice. Where the line sits needs
  legal review (Q12, Q13).
- Quoting, archiving and hashing have copyright and terms-of-use limits that differ by source type.
- Defamation exposure for statuses about named offices and for coalition content.

**Technical.**
- Provenance at scale: keeping passage references stable across document versions.
- Prompt injection, if model assistance is ever added: source text must never become instructions.
- Content checks by pattern miss things and flag innocent text; human moderation is needed.
- Deadline freshness depends on re-checking, which is labour, not code.
