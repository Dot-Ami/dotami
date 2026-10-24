# Compliance Engine (+ planned Risk) — Reasoning Conventions

Catalog: `lib/engines/compliance/v2026/rules.ts` (8 rules as of 2026-10-24; one retired, § Retired rules) · Priority: **high**

## What it holds

Threshold rules (GST/HST small supplier), province tax facts (BC PST, ON HST, AB no-PST),
the hobby-vs-business test, one licensing rule (Alberta's trades; Ontario's food-premises rule came off on
2026-10-24), and, since 2026-10-11, GST/HST registration from the
first paid ride for ride-share and taxi driving and the platform-reporting card for the same work
(§ Work the $30,000 line doesn't cover). Annotation-only today.

## Relationship to the Risk Calculator (read this before touching either)

Compliance and Risk answer different questions and must not blur:

- **Compliance**: *what obligations exist on this path* — registration thresholds, sales
  tax by province, licensing. Neutral facts. A compliance rule is not a warning; it's a
  checkpoint on the map.
- **Risk** (planned engine, `docs/brain/risk-calculator.md`): *how audit-sensitive is this
  strategy* — severity, GAAR exposure, mitigation. Risk entries **reference** engine entry
  ids (including compliance ids) via `appliesTo`.

Example of the split: "GST registration required over $30,000 (the CRA's two tests)" = Compliance. "Repeated losses
invite hobby reclassification" = the *fact* of the test is Compliance
(`compliance-hobby-vs-business`); the *audit-sensitivity of claiming losses year after
year* is a Risk entry pointing at it.

## How it should reason (target)

- **Thresholds are typed data** (`thresholdAmount`, `thresholdTest`), and the official test is
  quoted in its own words (`officialWords`). A card changes only when the cited test is met: there
  is no "getting close" band of DotAmi's own (a 70% one was removed on 2026-10-11, because no
  cited page sets it).
- **Forks, not verdicts.** GST voluntary-vs-mandatory is the canonical fork: under $30,000
  the engine surfaces *both* "small supplier — registration may be deferred" *and*
  "voluntary registration may unlock ITCs" (the aggressive option), with the trade-off
  stated. Never collapse a fork into advice.
- Province rules key off profile province exactly; `CA`-jurisdiction rules apply everywhere.

## Work the $30,000 line doesn't cover (designed 2026-10-11)

Some work has to register for GST/HST from its first taxable sale, whatever the amount. The first
in the catalog is ride-share and taxi driving: the Excise Tax Act requires every small supplier who
carries on a taxi business to be registered (s.240(1.1)), and its definition of a taxi business
(s.123(1)) takes in passenger rides arranged through an electronic platform. The CRA says it in
plain words on its sharing-economy page ("The $30,000 small supplier threshold does not apply for
commercial ridesharing services."), and GI-196 says registration takes effect the day the driver
starts making taxable supplies, with 30 days to apply. Before this, DotAmi had no driver kind of
work and only the general $30,000 rule, so a driver expecting less than $30,000 was told on a
green card that most businesses "need not register yet".

How it is modelled, all in the catalog, none of it in a component:

- **A kind of work.** `Ride-share or taxi driving` is an activity tag (`lib/journey/intent.ts`),
  with keywords for the keyword parser (`lib/journey/intent-fallback.ts`). The keywords don't
  include a bare "uber", because the CRA's own example counts Uber Eats food delivery toward the
  general $30,000 total, and its Uber phrases ("drive for uber", "driving uber", …) don't count
  when the next word is "eats", so "I drive for Uber Eats" isn't read as ride-share driving. They
  don't include a bare "rideshare" (or its other spellings) either, only phrases about driving
  ("rideshare driver", "drive rideshare", "driving for a rideshare …"), so "I'm building a rideshare
  app" isn't read as driving: the CRA's rule is about the drivers who give the rides. And no bare
  "taxi", which would also match "taxidermy".
- **A rule for that work.** `compliance-gst-taxi-ride-sharing` (`rules.ts`) is scoped to the tag
  by `industryTags`, applies in every province (`CA`), has no `thresholdAmount`, and quotes the
  CRA's sharing-economy page word for word (`officialWords`). It cites that page, the CRA's taxi
  and ride-sharing page, GI-196 and the Act.
- **A typed set-aside, not a hidden one.** The rule carries `setsAsideThreshold`: the id of the
  threshold rule whose "not yet" doesn't hold for this work, one sentence saying why, and one
  sentence on what that line still decides. When a rule with it applies, the rules engine
  (`lib/brain/evaluate.ts`) changes three things, and only these:
  1. the small-supplier card is no longer green: it turns amber, its reason adds the set-aside
     sentence, and in place of "most businesses need not register yet" it says what the $30,000
     line still decides (the person's other sales: the CRA says that while combined sales stay
     under $30,000 the required registration generally covers only the ride-sharing);
  2. *Mandatory GST registration* is green whatever the GST timing pick, with a reason line naming
     the tag that lit it;
  3. *Voluntary GST registration* is amber whatever the pick, with the "still decides" line as its
     reason: registering the other sales by choice is still an option.
  The small-supplier card stays on the map with its two tests quoted: the line still counts for
  the person's other sales. No amount of DotAmi's own is added anywhere.
- **The platform card.** `compliance-platform-reporting-rideshare`, for the same tag, quotes the
  CRA's page on the reporting rules for digital platform operators: platform operators collect
  information on certain sellers and report it to the CRA each year, and the CRA lists rideshare
  and delivery services among the activities whose sellers "may" be reported. Its title hedges the
  same way (*Ride-share platforms may report drivers' information to the CRA*), and it says
  "information", as the page does, not "earnings". Its rule type, `platform-reporting`, is new: the
  maintainer approved it on 2026-10-12 (authoring rule 1 below). Nothing reads rule types today, so
  it changes no screen.
- **The two cards name the tag that lit them.** Both ride-share cards carry `reasonNamesTags`, so
  their reason is "Shown because your intake has the activity tag Ride-share or taxi driving." rather
  than "Shown because you selected <province>.", which would say nothing about why they show. The
  older cards scoped by `industryTags` (hobby vs. business, the licensing cards) don't carry it and
  keep their default line (below); whether they should name their tag too is a separate decision
  (`tests/rideshare-gst.spec.ts` pins their lines).

**The default reason line: federal or the province (#36, 2026-10-12).** A card whose rule sets no
reason of its own (no tag reason, no amount over the line, no confirmed figures) says why it shows
from where the rule applies. A rule whose `provinces` include `"CA"` is federal: "Shown because it is
a federal rule, the same in every province and territory." Any other rule names the province: "Shown
because you selected Alberta." Until 2026-10-12 every card named the province, so an Alberta idea
read "because you selected Alberta" on the GST/HST small-supplier rule, which is federal, and an idea
with no province yet read "because you selected your province". Federal entries list the provinces
as well (`["AB", "BC", "ON", "CA"]`), so the test is whether `"CA"` is there, not whether it is alone
(`lib/brain/evaluate.ts`; `tests/brain-evaluate.spec.ts`).

**The maintainer's answers (2026-10-12).** The new rule type `platform-reporting` is approved. A
driver who picked *Voluntary now* on the GST timing toggle still sees Mandatory GST registration in
the CRA rule's colour, green: the registration is required from the first paid ride whatever the
pick. Both are as built.

**How its sources are checked (option B, [citations.md](citations.md)).** The maintainer read the
CRA's page on the reporting rules for digital platforms himself on 2026-10-11, so that citation has
the read date and `readBy: "person"`. Every other page these two rules cite (the CRA's
sharing-economy page, its taxi and ride-sharing page, GI-196, and the Excise Tax Act's s.240 and
s.123) carries a tool check instead: `node scripts/check-quotes.mjs` found the words each entry
relies on, on the live page, on 2026-10-12, and none is recorded as read by a person. The quotes are
in [`ride-share-official-words.ts`](../../lib/engines/compliance/v2026/ride-share-official-words.ts);
the tool found every one as typed, so none was rewritten or left out.

What it doesn't do: it doesn't ask whether the person is self-employed or an employee driver (the
CRA's pages are about self-employed drivers; the intake's employment question is about the
person's other work), it doesn't work out GST/HST included in a fare, and it doesn't add the
reporting rules to other kinds of work the same CRA page lists (selling goods, renting property,
personal services). Each is a separate change.

## From the maintainer's reading list (2026-10-23)

His reading list of 2026-10-23 checked five entries here, and his answers of 2026-10-24 decided what
changed. None of their sources is marked as read by him yet: his saved reads come in a later change.

- **Ontario HST (13%)** and **Alberta — no provincial sales tax** cite the CRA's page on which GST/HST
  rate to charge. Its table of rates isn't in the page's HTML, so no tool can find one of its rows, and
  the two sentences a tool found there with a rate are worked examples (an Ontario furniture store's
  sale, a Manitoba electronics store's), never the rate. Neither citation has a tool check, and neither
  may record those sentences. The Alberta card's line said "If operating only in Alberta, GST
  (not HST) applies — simplifying provincial sales tax compliance": "simplifying" is a judgement no
  cited page makes, and the table lists rates by province, not by where a business operates. It now
  says only what the table lists for Alberta, "The CRA's table of GST/HST rates lists Alberta at 5% GST,
  with no provincial sales tax." That is still DotAmi's wording of a table row, not a quote, and the
  catalog says so beside it: a quote takes its place once an official page that says it in its own
  words is found and checked. Alberta's *About Tax and Revenue Administration* ("Alberta has no sales
  tax.", [S17] in [other-ways-to-build.md](../architecture/other-ways-to-build.md)) is a candidate no
  tool has checked yet, and it says nothing of the 5%.
- **BC Provincial Sales Tax (PST)**: unchanged.
- **Ontario food premises licensing** came off: § Retired rules.
- **The Delete menu's records line** (`record-keeping.ts`, not a map rule) keeps its read of
  2026-10-08, which still shows, and now also a tool check of 2026-10-23 holding the CRA's own
  sentences, "Generally, you must keep all required records and supporting documents for a period of
  six years from the end of the last tax year they relate to." and "In some situations, you must
  retain your records for a different period of time.", the same two every road's *Keep your records
  from day one* step holds. The line already said "generally"; the docs that gave the CRA's six years
  without it give it now too.

The quotes of 2026-10-23 were found by the list's matcher (the same whole-word, one-block match as
`scripts/check-quotes.mjs`), so a networked run of the script must find them again before merge
([citations.md](citations.md), § The reading list's tool checks).

## Retired rules

A rule taken off the catalog stays listed here and in `RETIRED_COMPLIANCE_RULES`
(`lib/engines/compliance/v2026/rules.ts`, the same shape as the grants catalog's retired programs, #207),
and its id is never used again. [`tests/retired-entries.spec.ts`](../../tests/retired-entries.spec.ts)
holds the list to the catalog: no retired id is a rule, nothing on the map names one, no citation
cites its page, and every rule that ever shipped is either live or here.

| Id | Rule | Its page, as cited | Why it came off (page opened 2026-10-23) |
| --- | --- | --- | --- |
| `compliance-food-premises-on` | Ontario food premises licensing | https://www.ontario.ca/laws/regulation/900562 | On the maintainer's reading list it didn't match its source: the regulation it cited, Ontario Regulation 562/90 (Food Premises), is revoked, and the rule ("Food service and certain hospitality ventures require public health and municipal licensing in Ontario.") said more than that regulation. The regulation in force now hasn't been read, so nothing replaces it yet. |

An Ontario idea with *Food service* or *Hospitality* no longer shows the card anywhere (the map's
panels, the intake's preview, the readout and the playbook), and no other licensing card takes its
place. An Ontario food rule comes back only after the regulation in force now is read, under a new
id, saying only what that regulation requires, with its words quoted.

## Authoring rules specific to this engine

1. Rule types stay within the existing union (`gst-threshold`, `pst-hst`,
   `hobby-vs-business`, `licensing`, and `platform-reporting`, approved 2026-10-12) unless a
   maintainer approves a new type — types are consumed by UI grouping.
2. Licensing rules are industry-scoped via `industryTags`; keep them narrow and cited to
   the actual regulation or the government's own list (the AB trades entry, which cites Alberta's list
   of compulsory certification trades with the sentence a tool found on it, is the model; the ON
   food-premises entry that used to be the model cited a revoked regulation and came off on 2026-10-24,
   § Retired rules).
3. Compass language is *most* load-bearing here — compliance copy that reads as legal
   advice is the fastest way to break the "prep tool for your accountant" positioning.
   "If performing regulated trades, provincial certification may be required before commercial work" — yes.
   "You must obtain a license" — no.
4. When the Risk engine lands, every `caution`-or-higher risk that concerns an obligation
   (not a strategy) should be checked against this catalog first — if the obligation isn't
   here, add it here *and* the risk entry there.
