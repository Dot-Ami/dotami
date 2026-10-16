# Others in this line of work: the competitive landscape (design)

Status: **Design, not built. Waiting on the maintainer's calls (§ 12).** Revised 2026-10-15: calls 1 and 3
answered, call 2 not accepted and reworked. No product code until the open calls are answered. Public task
list: [14g](../task-list.md) (tracker story S2.5.23). This document does tasks 23a–23d; build tasks are in § 13.

Read with [future-cockpit.md](future-cockpit.md), [use-cases.md](use-cases.md) (the Lens, the built-in agent
on the person's own model), [connectors-and-agents.md](connectors-and-agents.md),
[other-ways-to-build.md](other-ways-to-build.md) (S2.5.22), [research-kit.md](research-kit.md) (S2.5.25, the
shared research kit; its calls K3 and K4 are this doc's calls 2 and 11, asked once) and
[lens-comparisons.md](lens-comparisons.md) (S2.5.24, the Lens answering "cheapest", "fastest").

Every outside fact below was seen on **2026-10-15** at the link given. Anything not confirmed is in § 15 as
open, never stated as fact. Nothing here is legal advice. Day counts are rough working-day estimates.

Words used here: an **API** (application programming interface) is a service's door for programs. An **MCP
server** (Model Context Protocol) is a standard plug that lets an AI model use a service's tools; the person
connects it with their own account. **Playwright** is a program that drives a web browser automatically.
**Scraping** means a program copying a website's content.

## 1. The request

The maintainer, 2026-10-15, word for word:

> "Dotami should also show you a list of competitors and what theyve been able to accomplish, what their
> ads look like, how much their ads cost, their marketing strategy, and more, so that the user has as much
> info as possible so they can see where they stand on the competitive landscape; which should then help
> them even further figure out if this is the right space for them. Of course to map this out we will need
> to make this is own story with their own tasks in oder to figure out how dotami will be built to make
> this happen."

He answered calls 1, 2 and 3 the same day (his chat numbered them 4, 3 and 2); his words are in § 12. For
every story he added: *"all of these same tools and tactics will need to be applied to any job or career path;
which means this will have to turn into a library, or script, or a combo of the two, but it makes no sense
building all of this out repeatedly for every single job and business possibility."*

| The person wants to know | What DotAmi can honestly show | What it can't |
|---|---|---|
| How many others do this near me? | An official **count** by area and industry (§ 4.1) | One-person shops with no payroll |
| Who are they? | The person's own list; names from open data or from the person's own Google or Yelp account (call 2) | A complete named list for Alberta |
| What have they accomplished? | Public records only, such as federal contracts over $10,000 (§ 4.5) | Sales or profit of a private small business |
| What do their ads look like? | The ads, in Meta's and Google's public libraries, opened by the person (§ 4.6) | A copy of the ads inside DotAmi |
| How much do their ads cost? | "Not published" for ordinary Canadian ads; later, a vendor's labelled estimate (call 11) | A published spend figure: none exists |
| Their marketing strategy | The person's own notes | Nothing about it is published as fact |
| "Where they stand" | Facts side by side | A score, a rank, "crowded", "room for you": verdicts DotAmi never gives |

## 2. What the answers changed

Call 1 **A**: counts ship (23f, 23n); "more than counts" is a future item through the kit (§ 6.6). Call 2
**not accepted**: reworked with existing tools, our own list from open data, or both (§ 3, § 12). Call 3 **B
for v1**: v1 unchanged; tools later (§ 6.5, new call 11). For all: everything is keyed by job code, industry
code and area, so it works for any road (§ 5).

## 3. Why the first recommendation was cautious, and what existing tools allow

The first design recommended "the person now, the Lens later, from open government data only". The
maintainer asked why not use what already exists, or build our own. The plain answer: three worries, and each
can be handled differently per tool.

1. **One-person shops are people.** Many trade under the owner's own name. Canada's privacy commissioner says
   company information "is generally not personal information", but it can be for an owner-operator, and
   "each situation must be assessed on a case-by-case basis" ([bulletin](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda-compliance-help/pipeda-interpretation-bulletins/interpretations_02/)).
   Calgary's open-data licence and Edmonton's 2022 one both exempt personal information (§ 4.2).
2. **Site terms.** The biggest tools forbid the copying a "find my competitors" feature needs (§ 4.3, § 4.4).
3. **The no-network promise.** Shipped data needs no request; any live look-up carries the person's trade and
   area to someone else.

| Kind of tool | Fits the site's own terms? | How |
|---|---|---|
| Links to any public site | Yes, always | Opens in the person's browser; no search words in the link |
| Openly licensed data (Statistics Canada, city lists, Overture Maps) | Yes, with credit lines | Shipped inside the app, made by a maintainer's script |
| Official APIs and MCP servers (Google Places, Yelp, Semrush, Ahrefs, Similarweb) | Yes, on **the person's own account and key**, within each vendor's limits (keep time, Yelp's ban on analysis, Grounding Lite's model rule); Similarweb's and Ahrefs' keep terms not read (§ 15) | Live, through the Lens; shown, kept only as long as each vendor allows; the key in the operating system's keychain, never in DotAmi's data file (research-kit.md § 5.9) |
| Scrapers (GitHub scrapers, Apify, Playwright) on Google Maps, YellowPages.ca, Canada411, Meta, Job Bank | **No**: each site's terms forbid it | Not built. Call 2 option D sets out the risk |

"Build our own" is honestly possible for a **named-places list**, from open data (Overture Maps plus city
licence lists), after a one-day check of how many real shops it holds. It is **not** possible for ad spend:
no open data has it (§ 4.6), so any DotAmi-made spend figure would be invented.

## 4. What the sources give, and on what terms (all seen 2026-10-15)

### 4.1 Counts: Statistics Canada's Canadian Business Counts

- Counted each June and December. A "business" is a **location**; those without employees count only above
  $30,000 of yearly revenue, by province only ([The Daily](https://www150.statcan.gc.ca/n1/daily-quotidien/260213/dq260213c-eng.pdf)).
- **Each release is a new table number, and every one stays marked "current".** June 2026 came out
  2026-08-14 ([metadata](https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata)):
  [33-10-1176](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117601) by census metropolitan area
  (a large city and its commuting area; Calgary is member 455, the city itself 457; Edmonton 467 and 491) and
  by industry code under the North American Industry Classification System (NAICS), 445 industry members;
  [33-10-1174](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117401) by province;
  [33-10-1175](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117501) without employees, province
  only. December 2025 is table 33-10-1097, also still "current".
- Worked example (one road's codes): industry group 3371, *Household and institutional furniture and kitchen
  cabinet manufacturing*, has **101** employer locations in the Calgary area
  ([query](https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods)); the Edmonton
  figure (84) and the area member ids were seen once and are re-checked in 23f before anything ships.
- As far as the research saw (reported, not confirmed; 23f checks it), the area table goes down to 4-digit
  industry groups and counts only businesses with employees; 6-digit industries and businesses without
  employees are by province only. So a one-person shop, the likely case for someone starting out, is not in
  any city count.
- Access needs no key; 25 requests a second; not for large pulls
  ([user guide](https://www.statcan.gc.ca/en/developers/wds/user-guide)). Licence: reuse and selling allowed
  with *"Adapted from Statistics Canada, <product>, <reference date>. This does not constitute an endorsement
  by Statistics Canada of this product."* It forbids linking the data with other databases "for the purpose
  of attempting to identify an individual person, business or organization"
  ([Open Licence](https://www.statcan.gc.ca/en/reference/licence)).

### 4.2 Names from open data (could ship inside the app)

| Source | What it holds | Terms | Fit |
|---|---|---|---|
| [Calgary Business Licenses](https://data.calgary.ca/api/views/vdjc-pybd.json) | 23,221 rows: trade name, address, licence types, dates, status, a home-business flag. 3,405 *Pending Renewal*. "Not all business require a municipal licence". Licence types are generic (*MANUFACTURER*, *CONTRACTOR*); trade names containing "cabinet": 55 rows | *Open Government Licence – City of Calgary* 2.1: commercial use; must carry *"Contains information licensed under the Open Government Licence – City of Calgary."*; personal information exempt ([terms](https://data.calgary.ca/d/Open-Data-Terms/u45n-7awa)) | Real local names; trade found only by name text |
| [Edmonton Business Licences](https://data.edmonton.ca/api/views/qhi4-bdpu.json) | 43,675 rows, "a valid licence to operate", category, address, licence type | **Two texts conflict**: the portal's *Terms of Use* link is *Open Government Licence – Edmonton* v1.0 (July 2022), which requires a credit line and exempts personal information ([page](https://data.edmonton.ca/stories/s/City-of-Edmonton-Open-Data-Terms-of-Use/msh8-if28/)); a 2016 PDF, still linked, does not require credit ([PDF](https://www.edmonton.ca/sites/default/files/public-files/assets/Web-version2.1-OpenDataAgreement.pdf)) | As Calgary; which text governs is § 15 |
| [Overture Maps places](https://docs.overturemaps.org/guides/places/) | Places from Meta, Microsoft, Foursquare and others; monthly releases; a 0–1 score that "measures existence" only; "known to contain duplicates, a high junk rate, and low property completeness"; no country figures yet ("will be published here as they are confirmed") | CDLA Permissive 2.0 (an open data licence that does not require sharing changes), Apache 2.0 for Foursquare records (carry its NOTICE and a "transformed" note), CC0 for AllThePlaces ([attribution](https://docs.overturemaps.org/attribution/)) | Can ship a city extract; the September places files are about 11.0 GB worldwide ([bucket](https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/2026-09-23.1/theme=places/)), so only an extract |
| [Foursquare OS Places](https://huggingface.co/datasets/foursquare/fsq-os-places) | Apache 2.0, 263 GB, gated (accept conditions with a login) | Free with credit | Weaker than Overture, which already carries Foursquare records |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | `craft=cabinet_maker` 711 and `joiner` 7,086 places worldwide ([taginfo](https://taginfo.openstreetmap.org/api/4/key/values?key=craft)) | Open Database Licence: a derivative database must be shared under the same licence ([guideline](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline)); public servers ask apps to cache and rate-limit ([Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API)) | Link only; storing it may make DotAmi's file a derivative database under that licence, a lawyer question (§ 15) |
| [Federal corporations](https://open.canada.ca/data/api/action/package_show?id=0032ce54-c5dd-4b66-99a0-320a7b5e99f2) | Daily; federal companies only; no industry field | Open Government Licence – Canada | Status look-up only; Alberta-incorporated companies and sole proprietors are not in it |

Alberta's corporate registry is searched through registry agents for a fee
([alberta.ca](https://www.alberta.ca/find-corporation-details)). OpenCorporates' API costs £2,250 a year for
commercial use, and its Alberta page needs a login ([pricing](https://opencorporates.com/pricing/)).

### 4.3 Names through services, on the person's own account

| Service | Way in | What its terms allow |
|---|---|---|
| Google Places | API with the person's key, in their own Google Cloud project with billing; Google's official MCP server *Maps Grounding Lite* ([page](https://developers.google.com/maps/ai/grounding-lite)) | No scraping or saving "business names, addresses, or user reviews" ([terms 3.2.3](https://cloud.google.com/maps-platform/terms)); only the place id may be kept indefinitely ([policies](https://developers.google.com/maps/documentation/places/web-service/policies)), latitude and longitude 30 days, Places API content not on a non-Google map ([service terms 14.2](https://cloud.google.com/maps-platform/terms/maps-service-terms); Places UI Kit, 15.1, differs). Grounding Lite: content "not cached by, stored by, or used to improve the LLM"; not with "any models that use the data input into the model for any model training"; a link preview per place is required; billed per request. Price: Text Search Pro US$32.00 per 1,000 after 5,000 free a month; ID-only searches free ([pricing](https://developers.google.com/maps/billing-and-pricing/pricing)) |
| Yelp | API with the person's key; an MCP entry in Claude's registry (a third-party listing, not a Yelp page) | Content kept "for a maximum of 24 hours"; business ids indefinitely; "Analysis is not permitted for Yelp Places integrations" (Yelp points analysis to a separate Insights API); the trial is "STRICTLY FOR EVALUATION" ([FAQ](https://docs.developer.yelp.com/docs/fusion-faq)) |
| Foursquare Places API | API with the person's key | The pricing page states two different free tiers ([pricing](https://location.foursquare.com/?p=19)); its terms were not read (§ 15) |
| Apollo, Crunchbase, ZoomInfo | MCP servers on paid accounts | Contact databases about people; Apollo forbids making its database available to third parties ([terms](https://www.apollo.io/terms)). Not offered |

### 4.4 Directories and scrapers

| Source | What its own page says |
|---|---|
| YellowPages.ca, Canada411 | Terms forbid "framing, scraping, data-mining, extraction or collection"; Canada411 links to the same terms ([terms](https://corporate.yp.ca/terms-of-use-agreement)) |
| Google Maps (consumer) | No using Maps to build a "business listings database, mailing list, or telemarketing list" ([terms](https://www.google.com/help/terms_maps/)) |
| GitHub scraper [gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper) | Its own README: "Unauthorized scraping may violate terms of service." |
| Apify | Google Maps places "from $1.50 / 1,000" ([actor](https://apify.com/compass/crawler-google-places)); the customer is "solely responsible for the legality" ([terms](https://docs.apify.com/legal/general-terms-and-conditions)) |
| Job Bank | Forbids "any script, robot, spider, Web crawler, screen scraper" ([terms](https://www.jobbank.gc.ca/termsofuseseeker)); its open-data files are used instead (§ 6.6) |

### 4.5 What they've accomplished: public records

[Proactive Publication – Contracts](https://open.canada.ca/data/api/action/package_show?id=d8f85d91-7dec-4fd1-8055-483b77225d8b)
lists federal contracts over $10,000 ("the data is unaudited"; about 642 MB, quarterly, with a search site);
grants and contributions are about 2.3 GB ([record](https://open.canada.ca/data/api/action/package_show?id=432527ab-7aac-45b5-81d6-7597107a7013)),
both under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada).
Too big to ship: link to the search sites, or the Lens searches one name the person gives. An empty result
means nothing was found under that name.

### 4.6 Ads and what they cost

| Source | Spend? | Terms and access |
|---|---|---|
| Meta Ad Library | Only for social-issue, election and political ads ([tools](https://transparency.meta.com/researchtools/ad-library-tools/)) | Anyone can search all active ads. The API covers political ads, EU ads and branded content; the page never mentions Canada, so "no ordinary Canadian ads in the API" is an inference. Automated collection needs "Meta's express written permission" ([terms](https://www.facebook.com/apps/site_scraping_tos_terms.php)) |
| Google Ads Transparency Center | None seen; spend data with an open data set is for election ads only ([post](https://cloud.google.com/blog/topics/developers-practitioners/how-get-started-political-ads-transparency-report-dataset)) | Shows which ads ran, where, last date and format ([launch post](https://blog.google/technology/ads/announcing-the-launch-of-the-new-ads-transparency-center/)); its own terms page ([terms](https://adstransparency.google.com/terms)) loads only with scripts and was not readable by our tools (§ 15); Google's general terms restrict automated access ([terms](https://policies.google.com/terms)); no official API found |
| Semrush | Its own estimates ("estimated traffic metrics", [reference](https://developer.semrush.com/api/v3/trends/api-reference)); Canada database with paid-keyword and ad-history reports ([databases](https://developer.semrush.com/api/v3/seo/overview)) | Keep no longer than "one month" ([limits](https://developer.semrush.com/api/introduction/api-usage-restrictions)); "internal business purposes" ([terms](https://semrush.com/terms)); MCP `https://mcp.semrush.com/v2/mcp` ([page](https://developer.semrush.com/api/basics/semrush-mcp/)) |
| Ahrefs | Its own figures | MCP on paid plans "starting from Lite" ([docs](https://docs.ahrefs.com/mcp/docs/introduction.md)) |
| Similarweb | "estimations" ([methodology](https://support.similarweb.com/hc/en-us/articles/360001631538-Similarweb-Data-Methodology)); low-traffic sites may show "Not enough data" ([help](https://support.similarweb.com/hc/en-us/articles/207698639-What-does-Not-enough-data-mean-)) | MCP needs a plan with API access ([docs](https://developers.similarweb.com/docs/similarweb-mcp)) |
| SpyFu | Ad history by API, $3.00 per 1,000 rows ([pricing](https://developer.spyfu.com/docs/api-pricing)) | No official MCP found; its terms page returned "not found", so it is not a registry source until they are read |
| SerpApi, Apify | Ads, not spend: SerpApi scrapes Google's Center, Production $150 a month for 15,000 searches ([pricing](https://serpapi.com/pricing.md)); an Apify community scraper of Meta's library, $0.75 per 1,000 ads ([actor](https://apify.com/curious_coder/facebook-ads-library-scraper)) | Third parties scraping; the Meta one runs against Meta's terms above |

### 4.7 The law, as far as the pages go (not a legal reading)

The federal privacy law (the Personal Information Protection and Electronic Documents Act, PIPEDA) covers
handling "in the course of commercial activities", not "personal or domestic purposes", and allows some uses
of information produced "in the course of their employment, business or profession" (ss. 7(1)(b.2),
7(2)(b.2), 7(3)(e.2); [Act](https://laws-lois.justice.gc.ca/eng/acts/P-8.6/page-1.html)). Alberta's Personal
Information Protection Act counts "an individual acting in a commercial capacity" as an organization
([Act](https://kings-printer.alberta.ca/documents/Acts/P06P5.pdf)). "Publicly available" is a fixed list
([Regulations](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2001-7/page-1.html)); public web profiles
reused for another purpose fell outside it ([Clearview AI findings](https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/2021/pipeda-2021-001/)).
Fair dealing for research or review is not infringement ([Copyright Act s. 29](https://laws-lois.justice.gc.ca/eng/acts/C-42/FullText.html)).
Bill C-36 is proposed, not law ([LEGISinfo](https://www.parl.ca/legisinfo/en/bill/45-1/c-36)).

## 5. Keyed for any job: the research kit (S2.5.25)

Nothing in this story is written for cabinetmakers. Everything reads keys from the research kit
([research-kit.md](research-kit.md) § 5.3):

| Key | Where it comes from | Used for |
|---|---|---|
| Job code: the 5-digit NOC 2021 part of the person's OaSIS pick | `Venture.occupationCode` is an OaSIS profile code (e.g. `72311.00` → NOC 72311; [schema.prisma:169](../../prisma/schema.prisma)); one NOC can have two profiles (63210.01 hairstylists, 63210.02 barbers). The NOC is read from the code, never guessed | Which job's links and facts apply; "about this job" (§ 6.6) |
| Industry code: NAICS 2022 | The person's pick. The job's candidates from the kit's job-links catalog (S2.5.25e) are listed first, labelled *suggested for this job · your pick*. They are hand-written, reviewed choices: no official job-to-industry crosswalk exists below sector level (census table 98-10-0594, as reported, is cited where it supports the choice) | Counts (§ 4.1); place categories |
| Area: census metropolitan area, or province | The person's pick (call 6) | Counts; open-data lists; live look-ups |
| Area for Job Bank sources: economic region | Mapped from the person's area by a cited Statistics Canada concordance if one exists, or asked separately; Calgary's economic region is not the Calgary census metropolitan area (research-kit call K5) | Wages and outlooks (§ 6.6) |

The job-links catalog also holds each job's place categories: the Overture categories and the licence-list
match words for its trade, kept as cited, reviewable data (S2.5.25e). The *Where to look* list is a view over the kit's source registry
(S2.5.25b), where each source's terms are data: who holds the key, how long results may be kept, whether
they may be shown, published fact or estimate, licence and credit line, and ship, link, Lens-live or
never-automated. Adding a road means filling these slots, never new panel code. Road 1's cabinetmaking codes
are the worked example only.

## 6. What a person sees

The panel is **Others in this line of work**, in the cockpit's right-hand panel, one thing at a time, like
*Compare* ([future-cockpit.md § 2](future-cockpit.md)). It opens from the goal bar on every road, and from any
step a road marks as opening a business (on road 1, `step-shop-open-own-shop`,
[apprentice-to-own-shop-ab.ts:836](../../lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts)). Words live in
`lib/landscape/words.ts` and contain no trade names.

**Words checks.** `VERDICT_WORDS` ([tests/helpers/verdict-words.ts:25](../../tests/helpers/verdict-words.ts))
stays as it is. A `LANDSCAPE_WORDS` list for this words file holds *crowded*, *saturated*, *room for you*,
*opportunity*, *gap*, *market share*, *per person*, *top*, *best-rated*. The first three join `VERDICT_PHRASES`,
so `e2e/no-verdict.spec.ts` catches them on any screen.

### 6.1 Screen 1: area and industry, inside the panel only

Asked when the panel opens, because the count depends on them; not in the *Not told yet* list
(`lib/cockpit/told.ts:248-306`). Each has a why-line and *I don't know*.
- *"Which area would the business be in?"* — *"Statistics Canada counts businesses by area. Your pick stays on
  this computer."*
- *"Which industry is closest to what you'd do?"* — a search over the industry names, with the job's
  candidates first under *Suggested for this job · your pick*. DotAmi never picks for the person.

### 6.2 Screen 2: the panel, top to bottom

1. **How many there are.** *"**101 places of business with employees** · Calgary and the towns around it ·
   Furniture and kitchen cabinet making · June 2026"*, with its table and the line *"Statistics Canada counts
   each location, and only businesses with employees here. A one-person shop with no payroll isn't in this
   count. The industry group is wider than one trade."* Then the licence line and *Your pick of area · Your
   pick of industry · Change*. After the recorded next-release date, an amber *"A newer count may be out."*
2. **Named businesses** (per call 2). From open data, if built, in two labelled parts, each alphabetical:
   *"Overture Maps: places in the category <category> near Calgary (September 2026). Overture says its places
   data has "duplicates, a high junk rate, and low property completeness"."* and *"Calgary's licence list:
   trade names containing the word "<word>" (a name match, not a trade; shops without the word aren't here;
   home-business rows left out)."* Each row: name, address, source, *Watch*. Credit lines under the list. The
   categories and match words come from the kit's job-links catalog, cited and reviewable.
3. **Where to look yourself.** Fixed order, said on screen: *"In the order: counts, names, records, ads."*
   Each row says what it shows for Canada, what it doesn't, and its cost or login.
4. **What their ads cost.** *"Meta and Google don't publish this for ordinary ads in Canada, as their pages
   read on 15 October 2026. DotAmi has no number for it."*
5. **Businesses you're watching · in the order you added them.** *+ Add a business*: name as typed, optional
   link, note and ad links with the day seen. *"DotAmi doesn't check these. They stay on this computer and no
   rule reads them."* The count never appears here; nothing says "3 of the 101".
6. Footer: *"Facts from public sources, side by side. Nothing here says whether this line of work fits you.
   Not legal advice."*

**Never on screen:** a rank, score, rating order, "crowded", "room for you", market share, businesses per
person, a trend arrow, or any order by size, spend or reviews.

### 6.3 Later: look up on your own account (call 2 B, after the Lens)

*Look up with your own Google or Yelp account* sits under the named list, off until the person turns on the
Lens's web power after its warning. The key lives in the operating system's keychain, never in DotAmi's data
file ([use-cases.md](use-cases.md), the table of what is kept; research-kit.md § 5.9 says plainly that this
bends the "DotAmi holds no logins" ruling, research-kit call K2).

- **Only name, address, the vendor's link and the id are requested** (a Places field mask; for Yelp, those
  fields only). No ratings, review counts or reviews are requested or shown. The Lens never counts, sorts or
  compares vendor results.
- Results show alphabetically, with the vendor's required credit and link: *"From Google Maps, with your key,
  15 Oct 2026, in alphabetical order. Not kept: Google's terms allow keeping only a place id."* Google's own
  result order is its own ranking (prominence takes reviews into account), so it isn't used.
- **Results sit in a separate, unsaved result card.** They never enter the kept Lens conversation, which
  records only *"looked up <vendor>, <date>, N results"* and the place or business ids.
- **Grounding Lite** is offered only after the person confirms, after a plain warning, that their model
  provider does not train on what they send it; DotAmi can't check this. Its link preview per place is shown.
- **Watch** keeps the place id or Yelp id and the vendor's link; the person types the name they want their
  list to show. Said plainly: this keeps a name Google's terms don't let DotAmi keep, because the person types
  it themselves; it is on the lawyer's list (§ 15).
- Look-ups of public records by name (call 4 A) arrive as proposals: *"A public record with this name. DotAmi
  can't tell if it's the same business."* The name goes to the government search site (§ 8).

### 6.4 The invented example (Mara; call 10)

With call 10 B, Mara's invented facts gain *"Mara would open her shop in the Calgary area; she picked
industry group 3371"* (`lib/examples/story.ts`, merged in #170), and her page shows the real count and any
real open-data list for those picks. Her watched list stays empty: *"An invented person's list would mean
inventing businesses, so this stays empty in the example."*

### 6.5 Later: ads beyond v1 (call 11)

- **Links always:** Meta's and Google's libraries stay on *Where to look*.
- **Tools on the person's own account** (call 11 B), only if a vendor's API returns a spend figure (none read
  so far was seen to): *"Semrush estimate, from your account, 15 Oct 2026: <figure>. This is Semrush's own
  estimate, not a published figure. Removed after 14 Nov 2026."* Never in a total.
- **Playwright:** Meta requires written permission; Google's Center terms were not readable by our tools, and
  Google's general terms restrict automated access. Not built unless call 11 D and the lawyer.
- **Build our own:** the honest in-house ad record is the person's saved ad links. A DotAmi-made spend figure
  would break "Never invent a number" ([CLAUDE.md:200](../../CLAUDE.md)); that is call 11 C.

### 6.6 Later: more than counts (call 1's "build this out")

Through the kit's *About this job* panel (S2.5.25h, research-kit call K5): Job Bank wages by job and economic
region ([wages](https://open.canada.ca/data/dataset/adad580f-76b0-4502-bd05-20c125de9116)), the 3-year outlook
rating ([outlooks](https://open.canada.ca/data/dataset/b0e112e9-cf53-4e79-8838-23cd98debe5b)) and national
openings ([projections](https://open.canada.ca/data/dataset/e80851b8-de68-43bd-a85c-c72e1b3a3890)), all under
the Open Government Licence – Canada. Outlooks and projections are forecasts and industry averages are
averages, so each needs the maintainer's word against "no projections" and decision 2A
([future-cockpit.md:42](future-cockpit.md)); K5 asks it once for every job.

### 6.7 Asking the Lens about others in this line of work

The Lens's comparison design is [lens-comparisons.md](lens-comparisons.md); for this panel:
- **"How many are there?"** The official count with its limits (employers only, the industry group wider than
  one trade, its date), never "crowded" or "room for you".
- **"Who's the biggest?" "Which is most popular?" "Is this market crowded?" "Is there room for me?"** The
  facts the panel holds, and *"DotAmi doesn't rank businesses or judge a market."*
- **Vendor results** (call 2 B) are never counted, sorted or compared (Yelp says analysis is not permitted).
- **"What do their ads cost?"** The "not published" line, and a labelled vendor estimate only under call 11 B.

## 7. How it's built

| Piece | Kind | Lives in | Reuses |
|---|---|---|---|
| Counts: all industries × Alberta areas and province | Catalog made by a script | `scripts/import-business-counts.mjs` on the kit's import core `scripts/lib/import-kit.mjs` (S2.5.25c) → `lib/engines/business-counts/v2026/`, recording table id, period, pinned area members, next-release date, checksum | `scripts/import-oasis.mjs` → `lib/engines/oasis/v2026/` |
| Citation | Typed, authority `"federal"` | Same folder | `CitationAuthority` ([shared/types.ts:5](../../lib/engines/shared/types.ts)) |
| *Where to look* | View over the source registry | `lib/engines/sources/v2026/registry.ts` (S2.5.25b) | One registry for this panel and S2.5.22's rent-price places |
| Road keys and job links | `Road.codes.occupations`; industry and place candidates per NOC | Road files; `lib/engines/research-kit/v2026/job-links.ts` (S2.5.25e) | `provinces` ([roads types.ts:23](../../lib/engines/roads/v2026/types.ts)) |
| Area and industry picks | The person's answers | `Venture.landscapeArea`, `Venture.industryCode` with set-at dates; nullable, add-column only (none with call 6 D) | `occupationCode` |
| Open-data places (call 2 C) | Per-city extract from Overture and the city licence lists (home-business rows left out) made by a script before release; data about others, never read by a rule | `scripts/extract-places.mjs` → `data/places/<area>/`, credit lines and Foursquare NOTICE shipped | The registry's licence fields |
| Watched businesses | The person's own notes | Table `WatchedBusiness` {id, ventureId, nameAsTyped, url?, note?, adLinks, origin `you`/`list`/`lens`, externalId? (a place id), status, sourceUrl?, seenOn?, addedAt} | `lib/db/json-list.ts`; `DELETE_MENU` ([inventory.ts:391](../../lib/privacy/inventory.ts)) |
| Live look-ups (call 2 B, call 4 A) | One Lens feature for every vendor and story | S2.5.25p; field masks with no rating fields; keep limits enforced in code from the registry; results never saved in the Lens conversation; never-automated sites unreachable; keys in the OS keychain | Lens [9d]/[9g] ([task-list.md](../task-list.md)) |
| *Advertising* cost line (call 8) | Named line priced by the person | Each road's start-up lines | `NamedCostLine` (roads types.ts:168) |
| Screen | Component and words | `components/cockpit/landscape-panel.tsx`, `lib/landscape/words.ts`, `docs/ui-spec/cockpit/landscape.md` | Right-hand panel slot |

No rule reads any of it: counts, lists and notes change no step, gauge or card. Counts and names are kept in
separate parts of the panel and never joined, because of Statistics Canada's no-linking clause.

## 8. What's stored, and what leaves the computer

| New thing | Kept where | Leaves the computer? |
|---|---|---|
| Area and industry picks | `Venture` columns (none with call 6 D) | No |
| Watched businesses | `WatchedBusiness`, local file, encrypted in the desktop app; deleted with the idea | No; not in the plan export |
| Counts, registry, places extract | Shipped in the app; made by a maintainer's script | No request at run time |
| Opening a link | The person's browser | The site sees a visit; no person or idea data in the link |
| Live look-up (later) | Shown in an unsaved result card; only ids kept, within each vendor's limit | **Yes**: the trade words and area go to the vendor on the person's key, and the results to the person's model |
| Lens conversation | Already kept per idea, clearable ([use-cases.md](use-cases.md)) | Vendor results are never saved in it; only "looked up <vendor>, <date>, N results" and ids |
| A vendor key or sign-in | The operating system's keychain, never DotAmi's data file; listed in the inventory | Only to that vendor |
| Public-record look-up by name (later, call 4 A) | Shown as a proposal | **Yes**: the business name to the government search site, and to the person's model |
| Vendor ad estimate (call 11 B, later) | Shown; removed at the vendor's keep limit | **Yes**: the business's website goes to the vendor and the model |

**Privacy inventory** ([lib/privacy/inventory.ts](../../lib/privacy/inventory.ts)):
- *"Your pick of area and industry for Others in this line of work. Read by no rule. Leaves the computer: no."*
- *"Businesses you're watching: names and links you typed or chose to keep, your notes, ad links. Deleted
  with the idea or from Your data. Leaves the computer: no."* Plus a `DELETE_MENU` row.
- A new line for **data about other people**: the shipped places list and watched businesses can name an
  owner. Inventory scope today is "Everything DotAmi keeps about the person" (inventory.ts:2).
- `SENT_ELSEWHERE` ([inventory.ts:796](../../lib/privacy/inventory.ts)): *"When you ask the Lens to look up
  businesses, public records or ad estimates, your words and area, or the business name you gave, go to the
  service on your own account or the government search site, and to your model. Results can name other
  businesses and people; whether your model's company keeps them depends on its terms."*
- One line per vendor key kept in the keychain.

**Privacy log** ([docs/privacy-log.md](../privacy-log.md), under [Unreleased]):
- *"Asks: the area and industry you pick for Others in this line of work. Kept on this computer. Nothing new is sent."*
- *"Keeps: businesses you choose to watch, with your notes. On this computer only; deleted with the idea."*
- *"Ships: Statistics Canada's Canadian Business Counts (June 2026), under the Statistics Canada Open Licence."*
- If call 2 C: *"Ships: a list of places for Alberta's largest areas from Overture Maps and city licence lists, under their licences."*
- With the Lens: *"Sends, only when you ask: your search words and area to the service you connect, or a
  business name to the government's public-records search, and to your model."*

## 9. Rules check ([CLAUDE.md](../../CLAUDE.md))

| Rule | How this design meets it |
|---|---|
| No verdict; no ranking by what DotAmi thinks matters (:22–24) | Fixed orders said on screen (alphabetical, order added); vendor results alphabetical, never counted or compared. Banned words list |
| Rules decide; the Lens never changes a catalog (:25–30) | No rule reads any of it; the Lens proposes rows the person keeps |
| Every claim cited and dated (:31–40) | Counts carry a federal citation and checksum; registry rows carry quotes, day seen and how checked |
| Not legal advice (:41–43) | § 4.7 quotes pages; the screen never says legal or illegal |
| The person's words stay theirs (:44–46) | Names and notes kept as typed, never summarised |
| Never derive a fact about the person (:199) | Area and industry are the person's picks; a job's candidates are labelled suggestions |
| Never invent a number (:200); no averages for a real person (decision 2A) | Only published counts. Vendor estimates wait on call 11; own estimates need the rule changed |
| Scope guard; powerful Lens actions off until turned on (:218–222) | No DotAmi-run scraping. Live look-ups only behind the Lens's web switch, on the person's own account |
| Agent connects; DotAmi holds no logins (2026-09-24) | Bent by call 2 B: the vendor key sits in the keychain and DotAmi's Lens reads it at look-up time, as [9a] already plans for the model key. research-kit call K2 E keeps the ruling literally |
| Almost no network requests, each listed; inventory and log | § 8 |
| Add-column-only migrations ([future-cockpit.md:1546](future-cockpit.md)) | Nullable columns and one new table |

## 10. Honest limits

- Ordinary Canadian ad spend is not published. Vendor figures are their own models; small sites may get none.
- Marketing strategy is not a published fact.
- Counts miss shops with no payroll below $30,000 of revenue, and the industry group is wider than one trade.
  City counts leave out one-person businesses altogether, and stop at 4-digit industry groups (as reported).
- No source sorts businesses by trade reliably. Licence types are generic; Overture's categories, licence
  text and NAICS differ; matching by name is approximate. Overture's coverage of small Alberta shops is
  unknown until the sample (S2.5.25m).
- Live results from Google or Yelp can't be kept beyond each vendor's limit, and Yelp's can't be analysed.
- A public record found by name may be another business with the same name.
- Whether "this is the right space for me" stays the person's judgement.

## 11. Phases

- **A: counts, where to look, the person's own list.** 23e–23k, 23n. No network, no model.
- **A+: open-data names**, if call 2 includes C and the sample passes. 23o, 23p.
- **C: the Lens on the person's own account.** 23m, 23q, after the Lens.

## 12. Calls for the maintainer

Recommending to the maintainer is fine; the product itself recommends nothing.

**Call 1: may an official count appear for a real person?** Answered 2026-10-15 (the maintainer): **A**,
*"im cool with this for now; but eventually we'll also need to build this out as well."* Counts ship; "more"
is § 6.6, decided once for every job in research-kit call K5.

**Call 2 (reworked): where do named businesses come from?** Answered 2026-10-15 (the maintainer): B *not
accepted*, *"this doesn't make much sense to me. Why would we do things this way when there are already
websites, github repos and software tools that do this aswell? And like the previous call, we could just build
out our own in-house version."* Reworked below; § 3 answers his "why". **Asked once, as research-kit call
K3.** A, B and C are separate yes-or-no picks, so any combination works; D is a separate yes or no.

| Option | What the person sees | Build | Risk |
|---|---|---|---|
| **A. The person's own list, now** | *+ Add a business* | 2 days (23i) | Person does all the looking |
| **B. Existing tools, on the person's own account** (Google Places API with a field mask or Grounding Lite, Yelp, through the Lens), after the Lens | Live results with the vendor's credit, alphabetical; name, address, link and id only; no ratings; only ids kept | 3 days after the Lens (S2.5.25p) | Trade and area leave the computer; the person pays the vendor; results vanish; no counting or comparing; the key in the keychain bends "DotAmi holds no logins" |
| **C. Our own list from open data** (Overture extract + Calgary and Edmonton licence lists, home-business rows left out), only if the sample passes | An alphabetical list in two labelled parts with credit lines, shipped | 1-day sample, then 4 days, plus 0.5 for lawyer questions | Sole proprietors' names; city licences exempt personal information; duplicates and junk; must not be joined to counts |
| **D. Scrapers** (GitHub scrapers, Apify, Playwright on Google Maps, YellowPages.ca, Canada411) | Names copied from those sites | About 3 days | Against each site's stated terms (§ 4.3, § 4.4); breakable; DotAmi distributes copied names |

How each handles the three worries: **A** sends nothing and ships no names. **B** ships nothing; the person's
own account and terms apply; data leaves only on request, listed. **C** sends nothing at run time but ships
names of possible people, so the lawyer reads it first (call 5). **D** breaks site terms.
*Recommended: yes to A, B and C; no to D.* It follows the maintainer's words: existing tools where their terms
allow, our own list where open data allows, links everywhere. D is listed because he named GitHub repos and,
for ads, Playwright; it is not recommended.

**Call 3: ads and ad cost.** Answered 2026-10-15 (the maintainer): **B for v1**, *"I think this would be
acceptable for v1, but there are clearly tonnes of software tools and websites that do this, and so we could
either borrow their info using API calls, MCP's, playright library, or just a link to the website; hell, we
could even build our own."* v1: links, the "not published" line, saved ad links. After v1: call 11.

**Call 4: "accomplished" and "marketing strategy".** Unchanged. **A.** Public records under a name (now part
of S2.5.25p) plus notes. **B.** A plus a Lens-written marketing summary (+2 days after the Lens; a model's
judgement of a named third party). **C.** Notes only. *Recommended: A.*

**Call 5 (revisited): when does a Canadian privacy lawyer read the questions (§ 15, items 1–4)?** The
maintainer engages and pays the lawyer; DotAmi prepares the page (23l).
**A.** Before any named business is kept, even the person's own list (1 day; holds back a notes app).
**B.** Before DotAmi ships names (2 C) and before any Lens look-up (1 day; look-ups wait). **C.** Before
DotAmi ships names only; look-ups on the person's own account go ahead under their vendor's terms, with their
questions on the same page (1 day; a look-up issue the lawyer would flag may ship first). **D.** No lawyer;
2 C not built (no in-house list). *Recommended: C.* Shipping names is where DotAmi itself hands out what may be
personal information; a look-up on the person's own account keeps only ids. B is the more careful choice.

**Call 6: how "nearby" is set.** Unchanged; now the kit's area key. **A.** Census metropolitan areas,
*Somewhere else in Alberta*, *I don't know*, kept with the idea (1.5 days). **B.** Province only (0.5).
**C.** Type your town (1; no count reads free text). **D.** As A, not kept (0.5; nothing stored). **E.** One
row per area in Statistics Canada's order (1). *Recommended: A*; D if a stored answer isn't worth it.

**Call 7: where the panel lives.** Unchanged. **A.** Right-hand panel (part of 23h). **B.** Its own page
(+1 day). **C.** Inside phase 2's *Peek inside* (waits). *Recommended: A.*

**Call 8: a named *Advertising* cost line the person prices.** Unchanged. **A.** Yes, on every road's
start-up lines, *Advertising — add your quote* (1 day). **B.** No. *Recommended: A.*

**Call 9: may the panel quote a business's own words?** Unchanged. **A.** No: links and notes only. **B.**
Yes, quoted with link and day (1.5 days; a rival's "#1" on DotAmi's screen). *Recommended: A.*

**Call 10: Mara's example.** Unchanged; #170 has merged. **A.** Picks blank (0.5). **B.** Labelled invented
picks, Calgary area and 3371, with the real count (0.5). *Recommended: B.*

**Call 11 (new): ad spend after v1.** The maintainer's "borrow their info … hell, we could even build our
own" meets "Never invent a number: no projections, no dollar ranges without a sourced figure"
([CLAUDE.md:200](../../CLAUDE.md)). **Asked once, as research-kit call K4.**
- **A. Stay with v1.** 0 days. Risk: the person's question gets no number.
- **B. A vendor's labelled estimate, if the vendor's API returns one,** live on the person's own account
  (Semrush, Ahrefs or Similarweb by MCP; SpyFu not until its terms are read): vendor, account and date on
  screen; removed at the vendor's keep limit; never in a total. No vendor read so far was seen to publish a
  spend figure; Semrush and Similarweb publish estimated traffic. 1.5 days after the Lens. Risk: **needs the
  maintainer's dated ruling that a labelled vendor estimate meets CLAUDE.md:200**, a rule reading like C's
  rule change; a modelled figure can read as fact; small shops may get "Not enough data".
- **C. One reading of "build our own": a DotAmi-made spend figure.** Only by changing the rule, and no
  published input exists (§ 4.6), so it would rest on guesses. At least 5 days plus the rule change. Risk: an
  invented dollar figure on screen.
- **D. Another reading of "build our own": DotAmi gathers the ads themselves (not spend),** through SerpApi on
  the person's key or the Lens browsing Google's Center. 2 days after the Lens, plus the lawyer. Risk: needs
  § 14 changed and call 9 B; SerpApi is a third party scraping Google, whose general terms restrict automated
  access; ad images and text are the advertiser's copyright (a fair-dealing question for the lawyer, § 15);
  Meta forbids automated collection without written permission.
- *Recommended: A now, then B after the Lens*, if he accepts the rule reading B needs. B and C both touch the
  rule; which, if either, is the maintainer's call.

## 13. Tasks

Kit tasks (S2.5.25x) are counted once, in [research-kit.md](research-kit.md) § 11; this table shows only this
story's days.

| Id | Title | Done when | Days | Calls |
|---|---|---|---|---|
| S2.5.23e | *Where to look* as a registry view | The panel lists registry sources (S2.5.25b) in the fixed order; a test fails on any person or idea data in a link | 0.5 | — |
| S2.5.23f | Counts for every industry | Built on the import core (S2.5.25c, 25d): every industry down to 4 digits × Alberta areas, 6 digits for the province; Calgary (455) × 3371 and Edmonton (467) × 3371 equal the imported file, area members re-checked by query first; the 4-digit and employer-only limits written in the catalog; checksum; engine-integrity green | 2 | — |
| S2.5.23g | Ask area and industry | Nullable columns (none with 6 D); the two questions; picker lists the job's candidates (job-links catalog) first, labelled; inventory and log lines | 2.5 | 6 |
| S2.5.23h | The panel | Opens from the goal bar and any marked step; count with limits, amber line, where to look, ad-cost line; words pass both lists; UI spec; browser test; in the no-verdict walk | 3 | 7, 9 |
| S2.5.23i | Businesses you're watching | Table, API, form, ad links, edit, remove; deleted with the idea; `DELETE_MENU`; data-about-others line; joins `e2e/journey.spec.ts` | 2 | 2, 9 |
| S2.5.23j | *Advertising* cost line | Named line on every road; the money gauge counts the person's quote | 1 | 8 |
| S2.5.23k | Mara's example | Per call 10; the watched list says why it stays empty | 0.5 | 10 |
| S2.5.23l | Lawyer questions | § 15 items 1–4 plus open-data names (S2.5.25o), quoted with links, for the maintainer to send | 1 | 5 |
| S2.5.23m | Look-ups on the person's account | Merged into S2.5.25p: names (2 B) and public records (4 A) through one Lens feature | counted in 25p | 2, 4, 5 |
| S2.5.23n | Record the answers | `future-cockpit.md` decision 2 and § 12 say counts may appear for a real person; calls 1–3 recorded, dated (with S2.5.25r) | 0.5 | — |
| S2.5.23o | Places coverage sample | = S2.5.25m: Overture places under the job's categories and city licence-list name matches in Calgary and Edmonton, duplicates noted, written up before any list is promised | counted in 25m | 2 |
| S2.5.23p | Open-data names section | = S2.5.25n: only if the sample passes; alphabetical list in two labelled parts, home-business rows left out, credit lines, NOTICE; never joined to counts | counted in 25n | 2, 5 |
| S2.5.23q | Vendor ad estimates | = S2.5.25q: only with call 11 B | counted in 25q | 11 |

Recommended path (2 A+B+C, 4 A, 5 C, 6 A, 7 A, 8 A, 9 A, 10 B, 11 A then B): **13 days** in this story now,
plus the kit's share (25b, 25c, 25m, 25n), plus 25p and 25q after the Lens.

## 14. Not in scope

DotAmi-run scraping or Playwright on any site whose terms forbid it (unless call 2 D). Review sites' ratings
and review text, and rating or review fields from vendor look-ups. Any rank, score, market share, saturation, trend or per-person measure. Forecasts of the
person's sales. A model-written profile of any business (unless call 4 B). Joining names to counts. Contacting
competitors. Contact databases about people (Apollo, ZoomInfo). Copies of other businesses' ads, photos or
reviews (unless call 11 D and call 9 B). British Columbia and Ontario in the first build (the keys allow them later).

## 15. Open questions (not verified; nothing above relies on them as fact)

1. **Lawyer:** is a person planning their own business on their own computer acting "for personal or domestic
   purposes"? Does keeping sole proprietors' names change that?
2. **Lawyer:** does a Statistics Canada count on the same panel as names count as "linking" under its licence?
3. **Lawyer:** may DotAmi ship names from city licence lists or Overture, given both city licences exempt
   personal information and Calgary's list flags home businesses?
4. **Lawyer:** is the Lens driving the person's browser "automated collection" under Meta's terms; is Lens use
   of Google's Center allowed under its terms (not readable by our tools; a quote limiting use to "information
   or research purposes" was reported but not read, `†`)?
   **Lawyer:** may the person keep a business name Google showed them by typing it into their own watched list
   (§ 6.3)? Would storing OpenStreetMap data make DotAmi's file a derivative database? Is gathering competitors'
   ad images and text fair dealing (call 11 D)?
5. Which Edmonton text governs (2022 licence or 2016 PDF); Calgary's and Edmonton's terms on caching.
6. Overture's coverage of small Alberta shops (S2.5.25m answers it).
7. Not read: Foursquare's API terms and real free tier; Yelp's prices and full API terms; Grounding Lite's
   pricing page; Similarweb's and Ahrefs' terms on keeping results; SpyFu's terms; plan prices for Semrush,
   Ahrefs, Similarweb, SpyFu; SpyFu's Canada coverage; Google's Ads Transparency Center terms (script-only);
   whether Google's Center has an API or Canada spend data; whether any vendor returns a dollar ad-spend figure
   for Canada.
10. How a person can know whether their own model provider trains on or keeps what they send, which
    Grounding Lite's terms require (§ 6.3); DotAmi can only ask them to confirm.
8. Whether *Businesses you're watching* ever goes in the plan export ([10e]). Left out by default.
9. [README.md:64](../../README.md) says nothing is sent anywhere; the inventory already contradicts it. The
   Lens task's wording must not add to that.
