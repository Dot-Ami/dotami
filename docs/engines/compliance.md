# Compliance Engine (+ planned Risk) — Reasoning Conventions

Catalog: `lib/engines/compliance/v2026/rules.ts` (9 rules as of 2026-10-11) · Priority: **high**

## What it holds

Threshold rules (GST/HST small supplier), province tax facts (BC PST, ON HST, AB no-PST),
the hobby-vs-business test, two licensing rules, and, since 2026-10-11, GST/HST registration from the
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
  keep naming the province; whether they should name their tag too is a separate decision
  (`tests/rideshare-gst.spec.ts` pins their lines).

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

## Authoring rules specific to this engine

1. Rule types stay within the existing union (`gst-threshold`, `pst-hst`,
   `hobby-vs-business`, `licensing`, and `platform-reporting`, approved 2026-10-12) unless a
   maintainer approves a new type — types are consumed by UI grouping.
2. Licensing rules are industry-scoped via `industryTags`; keep them narrow and cited to
   the actual regulation (the ON food-premises entry citing O. Reg. 562 is the model).
3. Compass language is *most* load-bearing here — compliance copy that reads as legal
   advice is the fastest way to break the "prep tool for your accountant" positioning.
   "If serving food to the public, public health compliance is typically required" — yes.
   "You must obtain a license" — no.
4. When the Risk engine lands, every `caution`-or-higher risk that concerns an obligation
   (not a strategy) should be checked against this catalog first — if the obligation isn't
   here, add it here *and* the risk entry there.
