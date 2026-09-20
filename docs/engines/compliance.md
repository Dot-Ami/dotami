# Compliance Engine (+ planned Risk) — Reasoning Conventions

Catalog: `lib/engines/compliance/v2026/rules.ts` (7 rules as of 2026-07-02) · Priority: **high**

## What it holds

Threshold rules (GST/HST small supplier), province tax facts (BC PST, ON HST, AB no-PST),
the hobby-vs-business test, and two licensing rules. Annotation-only today.

## Relationship to the Risk Calculator (read this before touching either)

Compliance and Risk answer different questions and must not blur:

- **Compliance**: *what obligations exist on this path* — registration thresholds, sales
  tax by province, licensing. Neutral facts. A compliance rule is not a warning; it's a
  checkpoint on the map.
- **Risk** (planned engine, `docs/brain/risk-calculator.md`): *how audit-sensitive is this
  strategy* — severity, GAAR exposure, mitigation. Risk entries **reference** engine entry
  ids (including compliance ids) via `appliesTo`.

Example of the split: "GST registration required over $30K" = Compliance. "Repeated losses
invite hobby reclassification" = the *fact* of the test is Compliance
(`compliance-hobby-vs-business`); the *audit-sensitivity of claiming losses year after
year* is a Risk entry pointing at it.

## How it should reason (target)

- **Thresholds become typed data**: `threshold` is currently a display string
  (`"$30,000 rolling four-quarter"`). The rules engine needs `{ amount: 30000, basis:
  "rolling-4-quarters" }` to power "threshold watch" behavior (revenue assumption within
  ~70% of a threshold → yellow watch card, which the intake preview already fakes).
- **Forks, not verdicts.** GST voluntary-vs-mandatory is the canonical fork: under $30K
  the engine surfaces *both* "small supplier — registration may be deferred" *and*
  "voluntary registration may unlock ITCs" (the aggressive option), with the trade-off
  stated. Never collapse a fork into advice.
- Province rules key off profile province exactly; `CA`-jurisdiction rules apply everywhere.

## Authoring rules specific to this engine

1. Rule types stay within the existing union (`gst-threshold`, `pst-hst`,
   `hobby-vs-business`, `licensing`) unless a maintainer approves a new type — types are
   consumed by UI grouping.
2. Licensing rules are industry-scoped via `industryTags`; keep them narrow and cited to
   the actual regulation (the ON food-premises entry citing O. Reg. 562 is the model).
3. Compass language is *most* load-bearing here — compliance copy that reads as legal
   advice is the fastest way to break the "prep tool for your accountant" positioning.
   "If serving food to the public, public health compliance is typically required" — yes.
   "You must obtain a license" — no.
4. When the Risk engine lands, every `caution`-or-higher risk that concerns an obligation
   (not a strategy) should be checked against this catalog first — if the obligation isn't
   here, add it here *and* the risk entry there.
