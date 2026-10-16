# Others in this line of work: the competitive landscape (design)

Status: **Design, not built. Waiting on the maintainer's calls (section 9).** Written 2026-10-15. There is
no product code until the maintainer answers them. In the public task list this is
[14g](../task-list.md) (the maintainer's tracker calls it story S2.5.23). This document does tasks
23a–23d; build tasks 23e onward are in § 10.

Read with [future-cockpit.md](future-cockpit.md) (the cockpit this panel sits in),
[use-cases.md](use-cases.md) (the Lens, the built-in agent on the person's own model) and
[connectors-and-agents.md](connectors-and-agents.md). The other new story of the same day, buying, renting
or leasing and where to ask about tax and legal questions, has its own design:
[other-ways-to-build.md](other-ways-to-build.md).

Every outside fact below was seen on **2026-10-15** at the link given. Anything that was not confirmed
is listed in § 12 as open, never stated as fact. Nothing in this document is legal advice. Day counts are
rough estimates in working days, not measurements.

## 1. The request

The maintainer, 2026-10-15, word for word:

> "Dotami should also show you a list of competitors and what theyve been able to accomplish, what their
> ads look like, how much their ads cost, their marketing strategy, and more, so that the user has as much
> info as possible so they can see where they stand on the competitive landscape; which should then help
> them even further figure out if this is the right space for them. Of course to map this out we will need
> to make this is own story with their own tasks in oder to figure out how dotami will be built to make
> this happen."

The request names six things. For each, here is what an honest, published source can give. § 2 has the
detail.

| The person wants to know | What DotAmi can honestly show | What it can't |
|---|---|---|
| How many others do this near me? | An official **count** of businesses by area and industry, from Statistics Canada (§ 2.1) | One-person shops with no payroll; names |
| Who are they? | Names the person notes themselves. A dated list of public places to look (§ 2.2) | A complete named list for Alberta. The provincial registry is searched one company at a time, for a fee |
| What have they accomplished? | Public records only, such as federal contracts over $10,000 (§ 2.3) | Sales, profit or growth of a private small business: not published |
| What do their ads look like? | The ads themselves, in Meta's and Google's public libraries, opened by the person (§ 2.4) | A copy of their ads inside DotAmi |
| How much do their ads cost? | A plain line saying no platform publishes this for ordinary ads in Canada | Any spend figure. Tools that show one are making their own estimate |
| Their marketing strategy | The person's own notes | Nothing about it is published as fact |
| "Where they stand" | Facts side by side | A score, a rank, "crowded" or "room for you". These are verdicts, which DotAmi never gives |

The design rule that comes out of the sources: **counts can ship; names can't.** A count describes an
industry. A name can describe a person, because many small competitors are sole proprietors trading
under their own names. The Office of the Privacy Commissioner of Canada says information about a company
"is generally not personal information". It can become personal information for an owner-operator of a
small business, and "each situation must be assessed on a case-by-case basis"
([Interpretation Bulletin](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda-compliance-help/pipeda-interpretation-bulletins/interpretations_02/), seen 2026-10-15).

## 2. What the sources give, and on what terms

### 2.1 Counts: Statistics Canada's Canadian Business Counts

- Counts are made twice a year (June and December) and released in August and February. A "business" is
  a **location**, and "active" comes mostly from Canada Revenue Agency tax records. Smaller places
  outside a census metropolitan area (a large city and its commuting area) are counted only if they have
  "10 or more active businesses with employees". Businesses without employees are counted only above
  $30,000 of yearly revenue. The release warns that changes from one period to the next should be read
  with caution ([The Daily, 2026-02-13](https://www150.statcan.gc.ca/n1/daily-quotidien/260213/dq260213c-eng.pdf), seen 2026-10-15).
- **Each release is a new table with its own number, and every one stays marked "current".** The June 2026
  counts came out on 2026-08-14 in three tables
  ([Web Data Service metadata](https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata), queried 2026-10-15):
  - [33-10-1176](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117601): employer locations by
    census metropolitan area and census subdivision, by employee-count band (starting at "1 to 4
    employees"), and by industry code under the North American Industry Classification System (NAICS),
    445 industry members. It has no "Alberta" member, and it has two "Calgary" members: 455, the
    metropolitan area, and 457, the city itself (a census subdivision). Edmonton is 467 and 491 the same
    way.
  - [33-10-1174](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117401): employer locations
    by province, Alberta included.
  - [33-10-1175](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117501): businesses without
    employees, by province and industry only. There is no metropolitan-area table without employees.

  The December 2025 counts are a separate table, 33-10-1097, also still marked current. So "the table is
  marked current" proves nothing about which release is newest, and an import keyed to one table number
  never picks up a newer count.
- Worked example, June 2026: industry 3371, *Household and institutional furniture and kitchen cabinet
  manufacturing*, has **101** employer locations in the Calgary census metropolitan area (table 33-10-1176,
  coordinate 455.1.242) and **84** in the Edmonton census metropolitan area (467.1.242). These are counts
  only, with no names ([Web Data Service query](https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods), queried 2026-10-15).
  The December 2025 table had 100 and 79.
- Access: the user guide for this public data service mentions no key. It allows 25 requests a second
  per internet address and says the service is not meant for large pulls
  ([WDS user guide](https://www.statcan.gc.ca/en/developers/wds/user-guide), seen 2026-10-15).
- Licence: reuse, publishing and selling are allowed. A value-added product carries this line: *"Adapted
  from Statistics Canada, <product>, <reference date>. This does not constitute an endorsement by
  Statistics Canada of this product."* The licence forbids merging or linking the data with other
  databases "for the purpose of attempting to identify an individual person, business or organization"
  ([Statistics Canada Open Licence](https://www.statcan.gc.ca/en/reference/licence), seen 2026-10-15).

### 2.2 Names: city licence lists and registries

- **Calgary** publishes *Calgary Business Licenses*: 23,221 rows, each with a trade name, address,
  community, licence types, dates and a status. 3,405 rows read *Pending Renewal*, so not every row is
  licensed today. The description says not every business needs a city licence
  ([dataset](https://data.calgary.ca/api/views/vdjc-pybd.json), seen 2026-10-15). It is published under
  the City's own *Open Government Licence – City of Calgary* 2.1. Commercial use is allowed with an
  attribution line, but clause 6 grants no right to use personal information
  ([Open Calgary terms](https://data.calgary.ca/stories/s/u45n-7awa), seen 2026-10-15).
- **Edmonton** publishes *City of Edmonton – Business Licences*: 43,675 rows, described as businesses
  "with a valid licence". Even so, 75 rows had expired by 2026-10-15
  ([dataset](https://data.edmonton.ca/api/views/qhi4-bdpu.json), seen 2026-10-15). Its terms are the
  City's own Open Data Terms of Use 2.1 (2016). Commercial use is allowed. Anyone who passes the data on
  must pass the terms with it, and the City may cut access without notice
  ([terms PDF](https://www.edmonton.ca/sites/default/files/public-files/assets/Web-version2.1-OpenDataAgreement.pdf), seen 2026-10-15).
- **Lethbridge** lists a business-licence file. It was last changed 31 August 2026, although it is
  described as refreshed daily ([CSV](https://gis.lethbridge.ca/OpenData/DataSets/BusinessLicenses.csv), seen 2026-10-15).
- **Alberta's corporate registry**: searches go through registry agents, and "A registry agent will
  charge a government fee and a service fee". The page names no free online search
  ([alberta.ca](https://www.alberta.ca/find-corporation-details), seen 2026-10-15).
- **Federal corporations**: a free daily dataset that covers federally incorporated companies only. A
  shop incorporated in Alberta, or run as a sole proprietorship, is not in it
  ([open.canada.ca](https://open.canada.ca/data/en/dataset/0032ce54-c5dd-4b66-99a0-320a7b5e99f2), seen 2026-10-15).
- **Maps and review sites** don't suit an app that keeps things. Google Maps Platform's terms forbid
  copying and saving business names, addresses or user reviews
  ([terms § 3.2.3(a)](https://cloud.google.com/maps-platform/terms), seen 2026-10-15). Yelp's terms
  forbid any robot or automated means to access, copy or scrape ([Yelp Terms](https://terms.yelp.com/tos/en_us/), seen 2026-10-15).
  OpenStreetMap is share-alike ([copyright](https://www.openstreetmap.org/copyright), seen 2026-10-15),
  and the trade is thinly mapped there: 8 tagged places in Calgary, against about 100 employer locations in
  the count. The two figures count different things over different areas.

### 2.3 What they've accomplished: public records

- *Proactive Publication – Contracts* lists federal contracts over $10,000, with vendor name, value and
  buyer. The government says the data is unaudited
  ([open.canada.ca](https://open.canada.ca/data/en/dataset/d8f85d91-7dec-4fd1-8055-483b77225d8b), seen 2026-10-15).
  CanadaBuys award notices are published daily
  ([open.canada.ca](https://open.canada.ca/data/en/dataset/a1acb126-9ce8-40a9-b889-5da2b1dd20cb), seen 2026-10-15).
  Both are under the Open Government Licence – Canada, which allows commercial use with an attribution
  line and grants no right to use personal information
  ([licence](https://open.canada.ca/en/open-government-licence-canada), seen 2026-10-15). Vendor names can
  be people's names.
- Most small local shops will have no federal contract or award record. An empty result means nothing was
  found under that name, not that the business has accomplished nothing.

### 2.4 Ads and what they cost

- **Meta.** The public Ad Library search lists all active ads across Meta's products. Spend, reach and
  who paid are given only for ads about social issues, elections or politics
  ([Meta](https://transparency.meta.com/en-gb/researchtools/ad-library-tools), seen 2026-10-15). A Canada
  search on 2026-10-15 needed no login. Each ad showed a Library ID, its start date and the advertiser,
  with no spend and no reach ([Ad Library](https://www.facebook.com/ads/library/), seen 2026-10-15). The
  API (the programmatic way in) returns non-political ads only if they reached the UK or the EU, and it
  needs identity confirmation and a developer account ([API](https://www.facebook.com/ads/library/api/), seen 2026-10-15).
  Meta's Automated Data Collection Terms forbid automated collection without Meta's express written
  permission ([terms](https://www.facebook.com/legal/automated_data_collection_terms), seen 2026-10-15).
- **Google.** The Ads Transparency Center has a Canada region. It shows ads from verified advertisers
  for a year after they last ran ([FAQ](https://adstransparency.google.com/faq?region=CA), seen 2026-10-15).
  Two Canadian ad pages opened on 2026-10-15 showed *Shown in Canada*, the date last shown and the
  format, with **no impression range and no spend**. An ad can be listed under the agency's account
  rather than the brand's, and a search by website found ads that a search by name missed
  ([Center](https://adstransparency.google.com/?region=CA), seen 2026-10-15). Its terms limit use to
  "your or your organisation's information or research purposes only" and forbid selling it
  ([terms](https://adstransparency.google.com/terms), seen 2026-10-15).
- **No Canadian coverage elsewhere.** TikTok's country list has no Canada ([library](https://library.tiktok.com/ads)).
  Microsoft's library covers only ads served in the EU or the European Economic Area
  ([help](https://help.ads.microsoft.com/apex/index/3/en/60180)). X's is an EU tool
  ([help](https://help.x.com/en/business-and-advertising/ads-transparency)). Snap's covers political ads
  only ([Snap](https://snap.com/political-ads)). LinkedIn's extra fields are for EU ads only
  ([help](https://www.linkedin.com/help/lms/answer/a1517918)), and LinkedIn's User Agreement forbids
  scraping ([agreement](https://www.linkedin.com/legal/user-agreement)). All seen 2026-10-15.
- **Estimators.** SpyFu's "Ad Budget" is its own estimate, covering Google search ads only
  ([help](https://help.spyfu.com/en/articles/3037981-ad-budget)). SpyFu writes that "thousands of little
  mistakes can really skew our estimates"
  ([help](https://help.spyfu.com/en/articles/3048130-data-accuracy-what-to-do-if-estimates-seem-off)).
  Semrush's terms forbid scraping and resale ([terms](https://www.semrush.com/company/legal/terms-of-service/)).
  All seen 2026-10-15.
- **Google's Keyword Planner** shows estimated searches and the cost to target them, but needs billing
  information first ([help](https://support.google.com/google-ads/answer/7337243?hl=en), seen 2026-10-15).
  Its output is a forecast, so it appears only as a fact on the *Where to look* list, never as a source
  DotAmi suggests for the person's own number.

### 2.5 The law, as far as the pages go (not a legal reading)

- The federal privacy law (the Personal Information Protection and Electronic Documents Act, PIPEDA)
  covers organizations that handle personal information "in the course of commercial activities". It
  does not cover an individual's handling "for personal or domestic purposes" only. Information "produced
  by the individual in the course of their employment, business or profession" may be collected
  (s. 7(1)(b.2)), used (s. 7(2)(b.2)) and disclosed (s. 7(3)(e.2)) without consent when that is consistent
  with the purposes for which it was produced
  ([Act](https://laws-lois.justice.gc.ca/eng/acts/P-8.6/page-1.html), seen 2026-10-15).
- Alberta's Personal Information Protection Act (PIPA) counts "an individual acting in a commercial
  capacity" as an organization ([Act](https://kings-printer.alberta.ca/documents/Acts/P06P5.pdf), seen 2026-10-15).
  **No page read says whether a person planning their own business counts as personal use.**
- "Publicly available" is a fixed list, not "anything online". It covers directories, statutory
  registries and publications, each tied to why the information was listed
  ([federal Regulations](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2001-7/page-1.html);
  [Alberta Regulation](https://kings-printer.alberta.ca/documents/Regs/2003_366.pdf), which expires
  30 June 2028 unless renewed; both seen 2026-10-15). Regulators found that profiles taken from public
  websites and reused for an unrelated purpose fall outside that list
  ([Clearview AI findings](https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/2021/pipeda-2021-001/)).
  They also stated that publicly accessible personal data is still covered by privacy law
  ([2023 statement](https://www.priv.gc.ca/en/opc-news/speeches/2023/js-dc_20230824/)). Both seen 2026-10-15.
- Copyright: fair dealing for research, criticism or review is not infringement, and criticism or review
  must name the source ([Copyright Act ss. 29, 29.1](https://laws-lois.justice.gc.ca/eng/acts/C-42/FullText.html), seen 2026-10-15).
  DotAmi chooses to link to ads rather than copy them; this avoids the copyright question rather than
  answering it.
- The Competition Bureau's page describes rules against misleading representations made to promote a
  business ([Bureau](https://competition-bureau.canada.ca/en/deceptive-marketing-practices), seen 2026-10-15).
  Whether they reach anything the person writes about a competitor is a question for their lawyer.
- Federal Bill C-36 would replace PIPEDA Part 1. It is **proposed, not law**
  ([LEGISinfo](https://www.parl.ca/legisinfo/en/bill/45-1/c-36), seen 2026-10-15).

## 3. What a person sees

The panel is called **Others in this line of work**. It opens in the cockpit's right-hand panel, one
thing at a time, the way *Compare* does ([future-cockpit.md § 2](future-cockpit.md)). There are two ways
in: a button on the goal bar, and a link in the step panel of a road's "open your own" step. On road 1,
*From apprentice to your own shop*, that step is `step-shop-open-own-shop`
([apprentice-to-own-shop-ab.ts:836](../../lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts)). The
screen's words live in `lib/landscape/words.ts`.

**Words checks.** `VERDICT_WORDS` ([tests/helpers/verdict-words.ts:25](../../tests/helpers/verdict-words.ts))
is shared by every words file, and *gap* is already part of DotAmi's own vocabulary ("a gap is a count or a
sum", `lib/roads/words.ts:7`), so it stays unchanged. A separate `LANDSCAPE_WORDS` list, used only by the
unit test for `lib/landscape/words.ts`, holds *crowded*, *saturated*, *room for you*, *opportunity*, *gap*,
*market share* and *per person*. *Crowded*, *saturated* and *room for you* are also added to
`VERDICT_PHRASES`, so the screen walk in `e2e/no-verdict.spec.ts` catches them on any screen.

**Screen 1: two picks, inside the panel only.** Both questions are asked on the panel's first screen,
only when the person opens it, because the count depends on them. They are not entries in the cockpit's
*Not told yet* list (`lib/cockpit/told.ts:248-306`) and not one-question-box questions (`BoxQuestion`,
`lib/cockpit/told.ts:59`, takes single fixed answers only). Each has a why-line and *I don't know*.

- *"Which area would the business be in?"* The why-line: *"Statistics Canada counts businesses by area.
  Your pick stays on this computer."* Answers: Alberta's census metropolitan areas with a published count,
  *Somewhere else in Alberta*, and *I don't know*. The last two show the Alberta count (from table
  33-10-1174) with the line in item 1 below.
- *"Which industry is closest to what you'd do?"* A search picker over Statistics Canada's 445 industry
  names, which is new screen work. The pick is tagged *your pick of industry*. DotAmi never picks the
  industry from the road or the trade, just as it never picks the job (fix 5,
  [future-cockpit.md:1718](future-cockpit.md)).

**Screen 2: the panel, top to bottom.**

1. **How many there are.**
   > **101 places of business with employees**
   > Calgary and the towns around it (Statistics Canada's Calgary area) · Furniture and kitchen cabinet
   > making · June 2026

   A smaller source line: *Statistics Canada, table 33-10-1176, industry group 3371, Calgary census
   metropolitan area.* Always beneath it: *"Statistics Canada counts each location, and only businesses
   with employees here. A one-person shop with no payroll isn't in this count. The industry group is wider
   than one trade."* Then the licence line, word for word, and *Your pick of area · Your pick of industry ·
   Change*. If no count is published for the place: *"Statistics Canada publishes no count for this
   place."* When the Alberta count is shown: *"This is all of Alberta, Calgary and Edmonton included.
   Statistics Canada publishes no count for the rest of Alberta on its own."* DotAmi never works out
   "Alberta minus the cities"; that subtraction would be a number DotAmi made. Once the recorded
   next-release date has passed, an amber line: *"A newer count may be out. This one is from June 2026."*
   The line starts unlit, because the date recorded beside the table id is the next release's.
2. **Where to look yourself.** A dated list in a fixed order by kind of source, said on screen: *"In the
   order: counts, names, records, ads."* That is Statistics Canada, then city lists, then registries, then
   public contract records, then ad libraries and Google's Keyword Planner. Each row says what the source
   shows for Canada, what it doesn't, and its cost or login. For example: *"Calgary's business licence
   list: names, addresses and licence types. Not every row is licensed today; check its status."*
   *"Google's Ads Transparency Center: ads from verified advertisers. Try the business's website as well
   as its name."* Each row opens in the person's own browser, and its link carries no search words.
3. **What their ads cost.** One fixed line: *"Meta and Google don't publish this for ordinary ads in
   Canada, as their pages read on 15 October 2026. DotAmi has no number for it."*
4. **Businesses you're watching · in the order you added them.** *+ Add a business*: the name as the
   person writes it (required), and optionally a link, a note, and links to ads they saw, each with the
   day they saw it. Each row shows *added 15 Oct 2026*, *Your note: …*, *Edit* and *Remove*. Under the
   list: *"DotAmi doesn't check these. They stay on this computer and no rule reads them."* The count
   never appears inside this part, and nothing says "3 of the 101" (§ 12, item 2).
5. Footer: *"Facts from public sources, side by side. Nothing here says whether this line of work fits
   you. Not legal advice."*

**Never on screen:** a rank, a score, "crowded", "saturated", "room for you", "opportunity", "gap",
market share, businesses per person, a trend arrow, or any order by size, spend or reviews.

**Later, with the Lens** (only once the Lens and its web search exist; [task list](../task-list.md) [9d]
and [9g], the Lens's first version and its web and browser powers). A watched business offers *Look for
public records under this name*. Each find arrives as a proposal tagged *"drafted by your model, from
<link>, seen <date>"*, with *Keep* and *Discard*. A kept record reads: *"A public record with this name.
DotAmi can't tell if it's the same business."* An empty result reads: *"Nothing was found under this name.
Most small local shops have no federal contract or award record; this doesn't mean the business has
accomplished nothing."*

**The invented example (Mara; call 10).** Mara's story says nothing about where she would open her shop or
which industry group she would pick, so showing a count on her page means choosing both for her. With call
10 option B, `lib/examples/story.ts` gains a labelled invented fact, *"Mara would open her shop in the
Calgary area; she picked industry group 3371"*, shown with her other invented facts, and her page shows
the real count for those picks. With option A her panel shows the picks blank and the where-to-look list
only. Either way *Businesses you're watching* stays empty, with the line: *"An invented person's list
would mean inventing businesses, so this stays empty in the example."* Mara's files are on PR #170's
branch, so this waits on #170 merging.

## 4. How it's built

| Piece | Kind | Lives in | Reuses |
|---|---|---|---|
| Business counts: Alberta census metropolitan areas and the province × industries, one release | Catalog made from data files by a script (code, never rows) | `scripts/import-business-counts.mjs` takes the table id and reference period as inputs, reads `data/statcan-business-counts-2026-06/` (tables 33-10-1176 and 33-10-1174) and writes `lib/engines/business-counts/v2026/`, recording each table id, reference period, the pinned area members (455 for the Calgary metropolitan area, not the city subdivision 457) and the next-release date | The OaSIS job catalog pattern: `scripts/import-oasis.mjs` → `lib/engines/oasis/v2026/` ([CLAUDE.md:145](../../CLAUDE.md)) |
| Its citation and licence line | Typed citation, authority `"federal"` | Same folder | `CitationAuthority` ([lib/engines/shared/types.ts:5](../../lib/engines/shared/types.ts)). The citation is the table's page; the number is verified by a checksum of the imported file and its table id, not by a page quote |
| Next-release date | A date on the catalog, from the release pattern (February and August), shown in amber once passed | Same folder | "Time-boxed rules carry an expiry and surface amber" ([CLAUDE.md:194](../../CLAUDE.md)) |
| *Where to look* list | Dated observations, **not** legal citations: link, quote, kind (official · company-own · community), day seen, `checkedBy: "tool" \| "person"` with its date, shows, doesn't show, terms line. No rule reads them | `lib/landscape/sources.ts` | `ExampleSources` / `ListedPrice` on PR #170's branch (`lib/examples/types.ts`); the same type as the rent-price places in [other-ways-to-build.md](other-ways-to-build.md) § 5 |
| Area and industry picks | The person's answers | `Venture.landscapeArea` + `landscapeAreaSetAt`, `Venture.industryCode` + `industryCodeSetAt`; nullable, ADD COLUMN only (call 6 D keeps none) | `occupationCode` ([schema.prisma:169](../../prisma/schema.prisma)) |
| Businesses you're watching | The person's own notes | New table `WatchedBusiness` {id, ventureId (deleted with the idea), nameAsTyped, url?, note?, adLinks (list of link + day seen), origin `you`/`lens`, status `kept`/`proposed`, sourceUrl?, seenOn?, addedAt} | `lib/db/json-list.ts`; `/your-data` and `DELETE_MENU` ([lib/privacy/inventory.ts:391](../../lib/privacy/inventory.ts)); [lib/privacy/delete.ts](../../lib/privacy/delete.ts) |
| *Advertising* cost line (if call 8 is A) | A named cost line, priced only by the person | Road 0 start-up lines ([starting-any-business-ab.ts:786](../../lib/engines/roads/v2026/starting-any-business-ab.ts)) and road 1's shop step | `NamedCostLine` ([roads types.ts:168](../../lib/engines/roads/v2026/types.ts)); `start-up-cost-line` Figure ([lib/figures/types.ts](../../lib/figures/types.ts)) |
| Screen | Component and words | `components/cockpit/landscape-panel.tsx`, `lib/landscape/words.ts`; spec `docs/ui-spec/cockpit/landscape.md` | The right-hand panel slot |
| API for watched businesses | Route | `app/api/ventures/[id]/watched-businesses/` (body read through `readJsonWithLimit`, rate-limited like other write routes) | Existing write routes |

Notes:

- **No rule reads any of it.** Counts, sources and the watched list change no step, gauge or card, so
  nothing here derives a fact about the person.
- **Checking sources.** Many of these pages are drawn by script or are PDFs or JSON (the Meta Ad Library,
  Google's Ads Transparency Center and its terms, Calgary's terms page, Edmonton's terms PDF, the
  Statistics Canada release PDF, the Web Data Service). `scripts/check-quotes.mjs` reads plain web pages
  and refuses PDFs, so each row records `checkedBy: "tool"` or `"person"` with the day, following the
  maintainer's option B of 2026-10-11 (sources checked by a tool or read by a person).
  `docs/engines/citations.md` says this for observations and for counts verified by checksum.
- **Why ship the counts instead of fetching them.** A live query would carry the person's area and
  industry off the computer. That breaks "Nothing about the person leaves the computer"
  ([future-cockpit.md § 7](future-cockpit.md), :1457-1459), and the content security policy
  (`connect-src 'self'`) blocks page-side requests anyway ([inventory.ts](../../lib/privacy/inventory.ts)).
  Shipped counts cost nothing at run time, and the licence allows it (§ 2.1). A new release means running
  the import script with the new table id; Statistics Canada issues a new table number every six months.
- **Why city lists, ad libraries and notes can never enter a catalog.** Catalog citations may name only
  the Canada Revenue Agency, a federal authority or a provincial authority (shared/types.ts:5).
  Statistics Canada is federal, so the counts fit. The rest stays as observations or the person's own rows.
- **The Lens.** It defaults to *Propose*. It treats every page as information, never as orders
  ([use-cases.md:319–324](use-cases.md)). Its finds become `WatchedBusiness` rows with status `proposed`.
  That needs the non-number confirm path the cockpit design says is missing
  ([future-cockpit.md:1760](future-cockpit.md)). If call 2 is B, it looks only in open **government**
  data: city licence lists, federal contracts and award notices. It never drives Meta, Google Maps,
  LinkedIn or Yelp, because their terms are quoted in § 2.2 and § 2.4. It never writes a summary of
  anyone's strategy.

## 5. What's stored, and what leaves the computer

| New thing | Kept where | Leaves the computer? |
|---|---|---|
| Area and industry picks | `Venture` columns, in the local data file (none with call 6 D) | No |
| Businesses you're watching | `WatchedBusiness`, in the local data file (encrypted with it in the desktop app); deleted with the idea | No. Not in the plan export (§ 12) |
| Counts catalog, *Where to look* list | Shipped inside the app; not about the person | No request; a maintainer's script made the catalog before release |
| Opening a link from the panel | The person's own browser | The site sees a visit, as with official links today. No person or idea data is in the link ([roads types.ts:78](../../lib/engines/roads/v2026/types.ts)) |
| Lens look-up (later) | A proposed row until the person keeps it | **Yes**: the typed name goes to the government site and to the person's chosen model, behind the web-search switch and its warning |

**Privacy inventory** ([lib/privacy/inventory.ts](../../lib/privacy/inventory.ts); the privacy test
fails until these exist):

- *"Your pick of area and industry for Others in this line of work. Read by no rule. Leaves the computer: no."*
- *"Businesses you're watching: names and links you typed, your notes, ad links you saved. Kept with the
  idea and deleted with it or from Your data. Leaves the computer: no."* Plus a `DELETE_MENU` row and a
  count on `/your-data`.
- With the Lens task: a `SENT_ELSEWHERE` entry, *"When you ask the Lens to look up a name, the name goes
  to the city or federal site and to the model you chose."*
- **New gap:** the inventory's scope is "Everything DotAmi keeps about the person" (inventory.ts:2). A
  watched business named after its owner is about **someone else**. The entry says so in plain words, and
  the inventory gains a line for data about other people.

**Privacy log lines**, under [Unreleased] in [docs/privacy-log.md](../privacy-log.md):

- *"Asks: the area and industry you pick for Others in this line of work. Kept on this computer, per idea. Nothing new is sent."*
- *"Keeps: businesses you choose to watch, as you typed them, with your notes. On this computer only; deleted with the idea; never read by a rule; not in the plan export."*
- *"Ships: Statistics Canada's Canadian Business Counts (June 2026) for Alberta, under the Statistics Canada Open Licence."*
- With the Lens task: *"When you ask the Lens to look up a business, the name you typed goes to that site and to your model."*

## 6. Rules check

| Binding rule ([CLAUDE.md](../../CLAUDE.md)) | How this design meets it |
|---|---|
| Information and options, never a verdict, never a ranking (:22–24) | Counts come with their definition and sources with their limits. The person's list is in the order added. *Where to look* is in a fixed order by kind, said on screen. New banned words for this screen. Ads are linked, never quoted, so a competitor's "#1" never reaches a DotAmi screen |
| Rules decide; models explain at most; the Lens never changes a catalog (:25–30) | No rule reads any of it. The Lens only proposes rows, which the person keeps with a click. The counts catalog changes only through the import script |
| Every rule, rate or date cited (:31–40) | Counts carry a federal citation, the table id, the reference period and the licence line, verified by checksum. *Where to look* rows are dated observations with quotes, each tool-checked or read by a person, labelled as not legal citations |
| Not legal or tax advice; never files (:41–43) | § 2.5 quotes pages, not conclusions. The screen never says legal or illegal. DotAmi publishes nothing about anyone |
| The person's words stay theirs, never fed to a rule (:44–46) | Names and notes are kept as typed, never summarised, never read by a rule |
| Never derive a fact about the person (:196) | Area and industry are the person's own picks, tagged as such, never inferred from the road or the job. Mara's picks are labelled invented facts, or left blank |
| Never invent a number (:197); no averages for a real person (decision 2, [future-cockpit.md:42](future-cockpit.md)) | The only number is a published official count. No spend estimate, trend, share, per-person figure or "Alberta minus the cities". Whether a count may appear for a real person is call 1 |
| Scope guard: no marketplace, no filing, no regulatory automation; powerful Lens actions off by default (:215–219) | No automated collection by DotAmi. The Lens look-up waits behind its planned web-search switch |
| Inventory and privacy log for anything new kept, sent or asked (:158–164, :266–269) | § 5 |
| Nothing about the person in a URL ([figures-privacy-review.md:42](figures-privacy-review.md)) | Links carry no search words. The page state carries only the idea id |
| Migrations add columns only and never rebuild `Venture` ([future-cockpit.md:1474-1479](future-cockpit.md)) | Two nullable column pairs and one new table |
| A question only when something on screen depends on it ([future-cockpit.md:710](future-cockpit.md)) | Area and industry are asked inside the panel only, when it opens, because the count depends on them |
| Value over more safety settings (the maintainer, 2026-10-10) | No new permission screen. The only warning is the Lens's existing web-search switch |

## 7. Honest limits

- **Ad spend for ordinary Canadian ads is not published.** Meta gives spend only for political and
  social-issue ads. Google's Canadian ad pages showed neither spend nor impressions. Estimators' figures
  are their own models, which their makers call error-prone.
- **Marketing strategy is not a published fact.** Only the business's own pages and ads exist. Anything
  more would be a guess about a named business.
- **Counts miss the smallest shops.** The counts cover employer locations only, and businesses without
  employees only above $30,000 of revenue, and only by province. Industry 3371 is wider than
  cabinetmaking. Counts change twice a year, each time in a new table.
- **There is no Alberta-wide count that leaves out the big cities.** The province table includes Calgary
  and Edmonton, and Statistics Canada publishes no "rest of Alberta" figure.
- **There is no honest complete named list for Alberta.** The registry is searched one company at a time,
  for a fee. City lists exist only where a city publishes one; three are confirmed. Those lists include
  rows not licensed today.
- **Most small local shops have no federal contract or award record.** An empty result means nothing was
  found under that name, not that the business has accomplished nothing.
- **Matching a public record by name can be wrong.** DotAmi can only ever say "a record with this name".
- **Whether "this is the right space for me"** stays the person's judgement. The panel only puts facts
  side by side.

## 8. Phases

- **A: counts and where to look.** No names; the only new storage is two answers (or none, with call 6 D).
  Tasks 23e–23h, 23k, 23n.
- **B: businesses you're watching.** The person's own list. Tasks 23i, 23j.
- **C: the Lens looks up public records by name.** Only after the Lens exists and after the lawyer's
  reading. Tasks 23l, 23m.

## 9. Calls for the maintainer

Each call is one pick. Recommending to the maintainer is fine; the product itself recommends nothing.

**Call 1: may an official count of businesses appear for a real person?** § 12 of the cockpit design
keeps "government wage or industry figures" out of phase 1, and a count is an industry figure. It is
also the one honest answer to "how many others do this near me".
- **A. Yes for counts, still no averages or dollar figures.** The person sees "101 places of business
  with employees…" with its limits and licence line. 0.5 day for the document change (task 23n), on top
  of 23f. Risk: a count can read as "crowded"; the words rules in § 3 guard against that.
- **A2. A, plus Alberta's count of businesses without employees** (revenue over $30,000), province only,
  labelled as such. About +0.5 day in 23f. Risk: a province-wide figure beside a city one; the labels say
  which is which.
- **B. Only in the invented example**, until the typical-numbers question comes back before phase 2. A
  real person sees only the links and their own list. 0.5 day. Risk: the page answers the person's first
  question only for a made-up person.
- **C. No counts anywhere: links only.** 0 days. Risk: the panel is mostly links and blanks.
- *Recommended: A.* Decision 2 and § 12 as written exclude industry figures from phase 1, so A changes
  that text for counts only, not averages or dollar figures. A count never enters the money gauge or any
  rule.

**Call 2: who puts named businesses in?**
- **A. The person only.** *+ Add a business*, in the order added. 2 days. Risk: lowest; the person does
  all the looking.
- **B. The person now, plus the Lens later on request, from open government data only.** 2 days now, then
  about 3 days after the Lens. Risk: the typed name leaves the computer; same-name mismatches; waits on
  the lawyer.
- **C. DotAmi shows matches from the Calgary and Edmonton licence lists itself** (shipped snapshot or
  live fetch). +4–5 days plus a lawyer. Risk: sole proprietors' names are personal information, which
  Calgary's licence doesn't cover. A live fetch breaks "No new request leaves the computer". Matching is
  approximate. It may hit Statistics Canada's no-linking clause.
- *Recommended: B.* It works now with no network and no model, and leaves room for the Lens to save the
  person the searching later, on terms they switch on.

**Call 3: ads and ad cost.**
- **A. Links to the ad libraries, plus the fixed "not published" line.** 0 extra days (part of 23e).
  Risk: honest but thin.
- **B. A, plus the person can save ad links on a watched business.** +0.5 day, already counted inside
  task 23i. Risk: low; links only.
- **C. B, plus spend figures the person pastes in from a paid tool**, labelled as that tool's estimate.
  +1 day. Risk: a modelled dollar figure on screen reads as fact.
- **D. The Lens collects ads from Google's Ads Transparency Center in the built-in browser** (never Meta).
  +2 days after the Lens, plus a lawyer's reading. Risk: Google's terms limit use to "information or
  research purposes".
- *Recommended: B.* It shows the real ads and tells the truth about cost.

**Call 4: "what they've accomplished" and "their marketing strategy".**
- **A. Public records found under a name, plus the person's own notes.** Part of the Lens task. Risk:
  same-name mismatches, said on screen every time; most small shops have no record.
- **B. A, plus a Lens-written summary of their marketing.** +2 days after the Lens. Risk: a model's
  judgement about a named third party, which can't be checked.
- **C. Notes only.** 0 days. Risk: drops the one honest "accomplished" source.
- *Recommended: A.*

**Call 5: when does a Canadian privacy lawyer read the open questions (§ 12, items 1–4)?** The maintainer
engages and pays the lawyer; DotAmi only prepares the question list (task 23l).
- **A. Before any named business is kept.** Phase A ships; the watched list waits. 0.5 day to write the
  questions. Risk: holds back what is, in effect, a notes app on the person's own computer.
- **B. Before the Lens look-up or call 2C, not before the person's own list.** 0.5 day. Risk: low;
  nothing leaves the computer and DotAmi ships no names until then.
- **C. No lawyer for now.** Phase C and option 2C are not built; the person's own list and the counts
  ship. 0 days. Risk: the Lens never saves the person the searching.
- *Recommended: B.*

**Call 6: how "nearby" is set** (today nothing narrower than the province is stored).
- **A. A fixed list of census metropolitan areas, plus *Somewhere else in Alberta* and *I don't know*,
  kept with the idea.** 1.5 days. Risk: towns outside those areas see the province-wide count, labelled as
  including Calgary and Edmonton.
- **B. Province only.** 0.5 day. Risk: a provincial count says little about a Calgary shop.
- **C. Type your town.** 1 day. Risk: no count can read free text, so it shows nothing.
- **D. As A, but not kept: asked each visit, forgotten when the page closes**, like the what-if. 0.5 day;
  nothing new stored, no migration, no inventory or privacy-log "Keeps" line. Risk: the person picks again
  each visit, industry search included.
- **E. No area question: one row per Alberta census metropolitan area in Statistics Canada's own order,
  no sorting**, for the industry picked. About 1 day. Risk: a short table of places the person may not
  care about; still needs the industry pick.
- *Recommended: A.* It matches how the counts are published, with no free text and no postal code. D is
  the cheaper, more private choice if remembering the pick isn't worth a stored answer.

**Call 7: where the panel lives.**
- **A. The cockpit's right-hand panel**, opened from the goal bar and the "open your own" step. Part of
  23h. Risk: a long watched list scrolls inside the panel.
- **B. Its own page per idea**, linked from the goal bar. +1 day. Risk: another page, further from the road.
- **C. Inside phase 2's *Peek inside*.** 0 days now. Risk: the whole story waits for phase 2.
- *Recommended: A.* It is the least new machinery and keeps the facts beside the future they're about.

**Call 8: a named *Advertising* cost line the person prices.**
- **A. Yes, on road 0's start-up lines and road 1's shop step.** The line reads *Advertising — add your
  quote*, with the existing amount-from choices (quote, link, receipt, your guess). 1 day. Risk: the
  line's name has no source yet, the same open item as the other cost-line names.
- **B. No.** 0 days. Risk: the money picture leaves out ads.
- *Recommended: A.* It answers "what would ads cost me" from the person's own number, without any
  average.

**Call 9: may the panel quote a business's own words** (ad text, website lines)?
- **A. No: links and the person's notes only.** 0 days. Risk: none.
- **B. Yes, in quote marks with link and day, under a new allowance in the verdict guard.** 1.5 days.
  Risk: widens the guard, copies third-party text, and puts a rival's "#1" on DotAmi's screen. (An invented
  example of what such a quote would look like: "Calgary's #1 custom cabinet shop" (their website).)
- *Recommended: A.* The person sees those words through the link.

**Call 10: Mara's example.** Her story doesn't say where she'd open or which industry group she'd pick.
- **A. Picks blank:** her panel shows the where-to-look list only. 0.5 day. Risk: the example doesn't
  show the count.
- **B. A labelled invented fact** in `lib/examples/story.ts`: Calgary area, industry group 3371, shown
  with her other invented facts, and the real count for those picks. 0.5 day. Risk: one more invented
  fact about her, labelled as such.
- *Recommended: B.* The example exists to show what the feature does, and her other facts are already
  invented and labelled.

## 10. Tasks

| Id | Title | Done when | Days | Waits on calls |
|---|---|---|---|---|
| S2.5.23e | *Where to look* as a dated, checked list | `lib/landscape/sources.ts`: every row has link, quote, kind, day seen, `checkedBy` (tool or person) with its date, shows, doesn't show, terms line, in the fixed order by kind; a test fails on a missing field or any person or idea data in a link | 2 | 3 |
| S2.5.23f | Import Statistics Canada counts for Alberta | The import script takes the table id and reference period as inputs and writes `lib/engines/business-counts/v2026/` from tables 33-10-1176 and 33-10-1174 with a federal citation, the licence line, the pinned area members and the next-release date; a test reads Calgary (455) × 3371 and checks it equals the figure in the imported file for the recorded table id; checksum recorded; engine-integrity green | 2.5 | 1 |
| S2.5.23g | Ask area and industry, inside the panel | Nullable `Venture` columns added by ADD COLUMN only (none with call 6 D); desktop migration test green; the two questions on the panel's first screen only, with why-lines and *I don't know*; the industry search picker; inventory and privacy log lines | 2.5 | 1, 6 |
| S2.5.23h | The *Others in this line of work* panel | Panel opens from the goal bar and the shop step; count with its limits and source line, the Alberta-count line, the amber newer-count line (unlit at release), where to look, fixed ad-cost line; words pass `VERDICT_WORDS` and `LANDSCAPE_WORDS`, and three phrases join `VERDICT_PHRASES`; UI spec written; in the no-verdict walk; browser test: pick area → pick industry → count shown | 3 | 1, 3, 7, 9 |
| S2.5.23i | Businesses you're watching | `WatchedBusiness` table, API and form, ad links included; edit and remove; deleted with the idea; `/your-data` count and `DELETE_MENU` row; inventory line for data about others; privacy log line; joins `e2e/journey.spec.ts` | 2 | 2, 3, 5, 9 |
| S2.5.23j | *Advertising* cost line | Named line on both roads, *add your quote*; the store accepts the person's quote for it; the money gauge counts it | 1 | 8 |
| S2.5.23k | Mara's example shows the landscape | After PR #170 merges: example per call 10; the watched list says why it stays empty | 0.5 | 1, 10 |
| S2.5.23l | Questions for a privacy lawyer | One page listing § 12 items 1–4 with quoted provisions and links, for the maintainer to send; answers recorded here before 23m starts | 0.5 | 5 |
| S2.5.23m | Lens looks up public records by name | After Lens [9d]/[9g] and the lawyer's reading: open government data only; proposals through the non-number confirm path; "can't tell if it's the same business" on every kept record and the empty-result line; `SENT_ELSEWHERE` entry and warning text; no Meta, Google Maps, LinkedIn or Yelp automation in the code | 3 (after the Lens) | 2, 4, 5 |
| S2.5.23n | Record the counts exception | `future-cockpit.md` decision 2 and § 12 say counts (not averages or dollar figures) may appear for a real person, dated, per call 1 | 0.5 | 1 |

Recommended path (1A 2B 3B 4A 5B 6A 7A 8A 9A 10B): about 14.5 build days now (23e–23l and 23n), plus 3
after the Lens exists and the lawyer has read.

## 11. Not in scope

Scraping or automated collection from any platform. Review sites and ratings. Google Places. Third-party
spend estimators in DotAmi's own words. Any rank, score, market share, saturation, trend or per-person
measure. Forecasts of the person's sales against competitors. A model-written profile of any business.
Automatic matching of names across datasets. Contacting competitors. Shipping any list of named
businesses. Copies of other businesses' ads, photos or reviews. British Columbia and Ontario in the first
build (the catalog is keyed so they can follow). The industry averages in Innovation, Science and
Economic Development Canada's Financial Performance Data
([ISED](https://ised-isde.canada.ca/site/financial-performance-data/en), seen 2026-10-15): ISED averages
already appear in the invented example as context (PR #170, ruling 2A); for a real person they wait for
the typical-numbers question before phase 2.

## 12. Open questions (not verified; nothing above relies on them as fact)

1. **Lawyer:** is a person planning their own business on their own computer acting "for personal or
   domestic purposes" under PIPEDA and Alberta's PIPA? Does keeping sole proprietors' names change that?
   Alberta's privacy commissioner pages, including Order P2024-07 on sole proprietors, could not be
   reached on 2026-10-15.
2. **Lawyer:** does showing a Statistics Canada count on the same panel as a list of names the person
   typed count as "merging or linking" under the Statistics Canada licence? The design keeps them in
   separate parts and never joins them.
3. **Lawyer:** do city licence lists count as a "registry" or a "directory" under the regulations? Do
   PIPEDA ss. 7(1)(b.2), 7(2)(b.2) and 7(3)(e.2) reach what a sole proprietor publishes about their own
   shop?
4. **Lawyer:** does an AI agent driving the person's own browser count as "automated collection" under
   Meta's, LinkedIn's or Yelp's terms? Does Lens use of Google's Center fit "information or research
   purposes"? None of the pages read addresses this.
5. Whether Calgary's or Edmonton's lists have a cabinetmaking licence category. The research found none,
   but this was not confirmed.
6. Federal grants and contributions as "accomplishment" records: the dataset was described but its row
   counts and industry field were not confirmed.
7. The full list of Alberta census metropolitan areas and their member ids in table 33-10-1176 (only
   Calgary and Edmonton were checked).
8. Which industry codes fit a cabinetmaker's own shop beyond 3371, and the Statistics Canada industry
   page to cite. Should a road ever list "related industries" as choices shown first?
9. Unread: Lethbridge's licence text; Calgary's and Edmonton's terms on automated access or caching
   (none found either way); whether Edmonton's 2016 PDF is the version its portal links today; Yelp's API
   terms; the Better Business Bureau's terms; Canada's Business Registries search (fees, terms).
10. Whether *Businesses you're watching* ever goes in the plan export or the accountant package ([10e]).
    It is left out by default.
11. [README.md:64](../../README.md) already says nothing is sent anywhere, which the inventory contradicts
    today (the update check, and the intake when a key is set). That is separate from this story, but the
    Lens task's wording must not add to it.
