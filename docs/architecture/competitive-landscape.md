# Others in this line of work: the competitive landscape (design)

Status: **Design, not built.** Revised 2026-10-15: calls 1 and 3 answered, call 2 not accepted and reworked.
Revised 2026-10-16: calls 4 to 10 answered (§ 12); calls 2 and 11 (named businesses, and ad spend after v1)
**on hold** until research story S2.5.26 is done (§ 6.3, § 6.5). No product code until the maintainer's
picks are written into the docs. Public task list: [14g](../task-list.md) (tracker story S2.5.23). This
document does tasks 23a–23d; build tasks are in § 13.

Read with [future-cockpit.md](future-cockpit.md), [use-cases.md](use-cases.md) (the Lens, the built-in agent
on the person's own model), [connectors-and-agents.md](connectors-and-agents.md),
[other-ways-to-build.md](other-ways-to-build.md) (S2.5.22), [research-kit.md](research-kit.md) (S2.5.25, the
shared research kit; its calls K3 and K4 are this doc's calls 2 and 11, asked once) and
[lens-comparisons.md](lens-comparisons.md) (S2.5.24, the Lens answering comparison questions). The
maintainer, 2026-10-16, on the examples "cheapest, fastest, strongest" used there: *"this is literally just an example of
questions that a user may ask. I'm not saying we need to gear the lense chat towards these questions
specifically."* The Lens is general; the questions in § 6.7 are examples too.

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
| Who are they? | The person's own list, if released before S2.5.26 (§ 15 item 11); anything more waits on research story S2.5.26 (call 2 on hold, § 6.3) | A complete named list for Alberta |
| What have they accomplished? | Public records only, such as federal contracts over $10,000 (§ 4.5) | Sales or profit of a private small business |
| What do their ads look like? | The ads, in Meta's and Google's public libraries, opened by the person (§ 4.6) | A copy of the ads inside DotAmi |
| How much do their ads cost? | "Not published" for ordinary Canadian ads; anything more waits on S2.5.26 (call 11 on hold, § 6.5) | A published spend figure: none exists |
| Their marketing strategy | The person's own notes; later, a summary the person's own model drafts, tagged as such (call 4 B, § 6.8) | Nothing about it is published as fact |
| "Where they stand" | Facts side by side | A score, a rank, "crowded", "room for you": verdicts DotAmi never gives |

## 2. What the answers changed

Call 1 **A**: counts ship (23f, 23n); "more than counts" is a future item through the kit (§ 6.6). Call 2
**not accepted**: reworked as research-kit call K3 (§ 12), now on hold for S2.5.26 (below). Call 3 **B for
v1**: v1 unchanged; anything beyond v1 (call 11) is on hold for S2.5.26 (below). For all: everything is keyed by job code, industry
code and area, so it works for any road (§ 5).

The answers of **2026-10-16** (§ 12): call 4 **B**, public records plus a marketing summary the person's own
model drafts (§ 6.8); call 5 **C**; call 6 **A**, plus an optional box for more about where, in the person's
own words (§ 6.1); call 7 **A**; call 8 **A** as a future story (23j); call 9 **A**; call 10 **B**. Calls 2
and 11 are **on hold**: the maintainer asked to look first for free software, websites and GitHub repos that
already do this (research story S2.5.26), so the detailed plans for named businesses and ad spend are cut back
to what was found (§ 6.3, § 6.5). The facts in § 4 stay: they are inputs to that research. A second research
story, S2.5.27, looks at community and unofficial sources (influencers, job boards, Reddit, Facebook,
Instagram, Quora, LinkedIn and others) for the kit's gaps; nothing is planned from it yet, and each source's
terms and DotAmi's citation rules decide later how any could be used.

## 3. Why the first recommendation was cautious, and what existing tools allow

Kept as an input to research story S2.5.26 (§ 6.3); it no longer sets the plan. The first design recommended
"the person now, the Lens later, from open government data only". The maintainer asked why not use what
already exists, or build our own. The plain answer: three worries, and each
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
| Scrapers (GitHub scrapers, Apify, Playwright) on Google Maps, YellowPages.ca, Canada411, Meta, Job Bank | **No**: each site's terms forbid it | Not built |

"Build our own" looked possible for a **named-places list**, from open data (Overture Maps plus city licence
lists), after a one-day check of how many real shops it holds. It did **not** look possible for ad spend: no
open data seen has it (§ 4.6), so any DotAmi-made spend figure would be invented. Both are findings for
S2.5.26 to check against what free tools already do, not decisions.

On keys and logins, the maintainer wrote on 2026-10-16 (research-kit call K2): *"at this point, im less and
less concerned about the intial rule. At this point, I'm more concerned with tangible results that ensure users
get the best experience."* and in chat *"yah that's fine. we can use things like google auth if we have to"*.
Read here as relaxing the 2026-09-24 reading "DotAmi holds no logins" for vendor keys and sign-ins (Google
sign-in and other OAuth sign-ins included) where they give people better information. It does not change the
third worry: a live look-up still sends the person's words to someone else, sits behind the Lens's web switch,
and is listed in § 8 before it is built.

## 4. What the sources give, and on what terms (all seen 2026-10-15)

§ 4.2 to § 4.4 and most of § 4.6 are what was found before calls 2 and 11 were put on hold. They stay as
inputs to research story S2.5.26 (§ 6.3, § 6.5); none of them is a plan to build.

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

### 4.2 Names from open data (could ship inside the app; input to S2.5.26)

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

### 4.3 Names through services, on the person's own account (input to S2.5.26)

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

### 4.6 Ads and what they cost (the libraries' links ship in v1; the rest is input to S2.5.26)

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
| Industry code: NAICS 2022 | The person's pick. The job's candidates from the kit's job-links catalog (S2.5.25e) are listed first, labelled *suggested for this job · your pick*. They are hand-written, reviewed choices: no official job-to-industry crosswalk exists below sector level (census table 98-10-0594, as reported, is cited where it supports the choice) | Counts (§ 4.1); place categories only if S2.5.26 leads to named lists (call 2 on hold, § 6.3) |
| Area: census metropolitan area, or province | The person's pick (call 6 A) | Counts; open-data lists and live look-ups if S2.5.26 leads to them |
| Area for Job Bank sources: economic region | Mapped from the person's area by a cited Statistics Canada concordance if one exists, or asked separately; Calgary's economic region is not the Calgary census metropolitan area (research-kit call K5) | Wages (§ 6.6) |

Each job's place categories (Overture categories and licence-list match words) would only serve named lists,
so they wait with call 2 for S2.5.26 (§ 6.3). The *Where to look* list is a view over the kit's source registry
(S2.5.25b), where each source's terms are data: who holds the key, how long results may be kept, whether
they may be shown, published fact or estimate, licence and credit line, and ship, link, Lens-live or
never-automated. Adding a road means filling these slots, never new panel code. Road 1's cabinetmaking codes
are the worked example only.

## 6. What a person sees

The panel is **Others in this line of work**, in the cockpit's right-hand panel (call 7 A), one thing at a
time, like *Compare* ([future-cockpit.md § 2](future-cockpit.md)). It opens from the goal bar on every road,
and from any step a road marks as opening a business (on road 1, `step-shop-open-own-shop`,
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
  this computer."* The choices (call 6 A): a fixed list of Alberta's census metropolitan areas, *Somewhere
  else in Alberta* and *I don't know*, kept with the idea.
- Under it, optional and closed until opened: *More about where, if you think it helps* — a box for the
  person's own words (a neighbourhood, a town, "near my day job"). Added for the maintainer's note on call 6
  (§ 12). Kept with the idea as typed and dated, shown back as written, read by no rule and no count, never
  turned into a place or an area by DotAmi; the person can change or clear it, and it is deleted with the
  idea. It stays on this computer like everything else here.
- *"Which industry is closest to what you'd do?"* — a search over the industry names, with the job's
  candidates first under *Suggested for this job · your pick*. DotAmi never picks for the person.

### 6.2 Screen 2: the panel, top to bottom

1. **How many there are.** *"**101 places of business with employees** · Calgary and the towns around it ·
   Furniture and kitchen cabinet making · June 2026"*, with its table and the line *"Statistics Canada counts
   each location, and only businesses with employees here. A one-person shop with no payroll isn't in this
   count. The industry group is wider than one trade."* Then the licence line and *Your pick of area · Your
   pick of industry · Change*. After the recorded next-release date, an amber *"A newer count may be out."*
2. **Named businesses: none from DotAmi yet.** Call 2 is on hold for research story S2.5.26 (§ 6.3); this
   part of the panel is left out until that research ends and the maintainer decides.
3. **Where to look yourself.** Fixed order, said on screen: *"In the order: counts, names, records, ads."*
   Each row says what it shows for Canada, what it doesn't, and its cost or login.
4. **What their ads cost.** *"Meta and Google don't publish this for ordinary ads in Canada, as their pages
   read on 15 October 2026. DotAmi has no number for it."* (v1, call 3 B; research-kit call K4 A.)
5. **Businesses you're watching · in the order you added them.** *+ Add a business*: name as typed, optional
   link, note and ad links with the day seen. *"DotAmi doesn't check these. They stay on this computer and no
   rule reads them."* The count never appears here; nothing says "3 of the 101". Links and the person's notes
   only, never a business's own words quoted (call 9 A). This list is call 2's option A, which is on hold with
   the rest of call 2; its saved ad links are already part of v1 (call 3 B, research-kit call K4 A), so whether
   it may be built before S2.5.26 ends is open (§ 15).
6. Footer: *"Facts from public sources, side by side. Nothing here says whether this line of work fits you.
   Not legal advice."*

**Never on screen:** a rank, score, rating order, "crowded", "room for you", market share, businesses per
person, a trend arrow, or any order by size, spend or reviews.

### 6.3 Waiting on research: named businesses (call 2 = research-kit call K3, on hold for S2.5.26)

The maintainer, in chat on 2026-10-16, on named businesses and ad spend: *"well before we implement this,
lets look for free software and websites or repos that already do this, because I've definitely seen stuff
like this before. So don't build it out just yet, and don't make a full plan around this just yet, but we
need to make note of it, because we need to do more research on this topic."*

So there is no plan here for DotAmi supplying named businesses, by any route, until research story
**S2.5.26** (free software, websites and GitHub repos that already make competitor lists) is done. The
person's own list (call 2's option A) is held with the rest of call 2 (§ 6.2, item 5). What the research
starts from:
- The open data seen, with its terms and limits: Calgary's and Edmonton's licence lists, Overture Maps,
  Foursquare's open places, OpenStreetMap, the federal corporations list (§ 4.2).
- The services seen and what their terms allow: Google Places and Maps Grounding Lite, Yelp, Foursquare's
  API, the contact databases (§ 4.3); the directories and scrapers whose terms forbid copying (§ 4.4).
- The three worries in § 3, and the maintainer's 2026-10-16 relaxing of "DotAmi holds no logins" for vendor
  keys and sign-ins (§ 3).
- The lawyer questions in § 15, items 1–4.
- The research page recorded **B** for K3, with the note *"Recommended: A, B and C; not D"* filled in by
  *Pick all recommended*, not typed by him (§ 12). That pick is kept on record, not acted on.

Public-record look-ups by a name the person gives (call 4, § 6.8) are not named-business look-ups and are not
held by this.

### 6.4 The invented example (Mara; call 10)

Call 10 **B** (answered 2026-10-16): Mara's invented facts gain *"Mara would open her shop in the Calgary
area; she picked industry group 3371"* (`lib/examples/story.ts`, merged in #170), labelled invented like the
rest of her story, and her page shows Statistics Canada's real count for those picks. No named list is shown
for her while call 2 is on hold. Her watched list stays empty: *"An invented person's list would mean
inventing businesses, so this stays empty in the example."*

**Future note, no task list yet.** The maintainer, on call 10: *"She should have all of her data invented so
that we can at least track how the entire product works; and then of course we should occasionally re-invent
it to see how her cockpit changes accordingly. This way we could potentially change the signal to noise
ratio."* Re-inventing Mara from time to time, and watching how her cockpit changes, is recorded here as a
future idea only.

### 6.5 Waiting on research: ad spend beyond v1 (call 11 = research-kit call K4, on hold for S2.5.26)

v1 stands (call 3 B, research-kit call K4 A): links to Meta's and Google's ad libraries on *Where to look*,
the "not published" line, and the person's saved ad links. Anything beyond that waits on research story
**S2.5.26**, which also looks for free tools and sites that already gather ads and estimate spend. The
maintainer, in chat on 2026-10-16: *"thats why we have to do our research around this topic first; no
different than the competitor list. I know this stuff exista out there so we have to look for it and plan for
it instead of just builing blindly."*

What the research starts from (§ 4.6): no spend figure is published for ordinary Canadian ads; Semrush and
Similarweb publish their own traffic estimates and Ahrefs its own figures, and no vendor read so far was seen
to give a spend figure; SpyFu's terms page could not be read; SerpApi and an Apify scraper gather ads, not
spend, by scraping; Meta needs written permission for automated collection; Google's Center terms were not
readable by our tools. Any DotAmi-made spend figure would meet "Never invent a number"
([CLAUDE.md:200](../../CLAUDE.md)), and a vendor's labelled estimate would need the maintainer's dated ruling
on that rule first. The research page recorded **A** for K4, with the note *"Recommended: A now, then B after
the Lens."* filled in by *Pick all recommended*, not typed by him (§ 12).

### 6.6 Later: more than counts (call 1's "build this out")

Answered 2026-10-16 (the maintainer): K5 **B**. Through the kit's *About this job* panel (S2.5.25h):
official Job Bank wage ranges by job and economic region
([wages](https://open.canada.ca/data/dataset/adad580f-76b0-4502-bd05-20c125de9116)), each labelled with its
real geography level, under the Open Government Licence – Canada. The 3-year outlook rating
([outlooks](https://open.canada.ca/data/dataset/b0e112e9-cf53-4e79-8838-23cd98debe5b)) and national openings
([projections](https://open.canada.ca/data/dataset/e80851b8-de68-43bd-a85c-c72e1b3a3890)) were K5's option C,
not picked, so they stay off this panel.

### 6.7 Asking the Lens about others in this line of work

The Lens's comparison design is [lens-comparisons.md](lens-comparisons.md). The Lens is general: the
questions below are examples of what a person might ask, not a list it is built around. For this panel:
- **"How many are there?"** The official count with its limits (employers only, the industry group wider than
  one trade, its date), never "crowded" or "room for you".
- **"Who's the biggest?" "Which is most popular?" "Is this market crowded?" "Is there room for me?"** The
  facts the panel holds, and *"DotAmi doesn't rank businesses or judge a market."*
- **"Who else does this near me?"** The person's own list (if built, § 15 item 11) and *Where to look*; DotAmi supplies no names while
  call 2 is on hold (§ 6.3).
- **"What do their ads cost?"** The "not published" line; nothing more while call 11 is on hold (§ 6.5).

### 6.8 Later: public records and a marketing summary (call 4 B, after the Lens)

Answered 2026-10-16 (the maintainer): **B**, public records under a name plus a Lens-written summary of a
business's marketing, with his note: *"I chose B because we get A already + the AI should be able to use
playwrite and other free sites (even if it doesn't scrape them directly, it can at least take you there), that
way it seems like best of both worlds (at least to me)"*.

- **Public records by name** (the A part): the person gives a business name; the Lens searches the
  government's public-records sites (§ 4.5) and the results arrive as proposals: *"A public record with this
  name. DotAmi can't tell if it's the same business."* An empty result means nothing was found under that
  name. The name goes to the government search site and to the person's model (§ 8).
- **The marketing summary** (the B part): drafted by **the person's own model**, never by DotAmi, and tagged
  that way on screen every time it shows: *"Drafted by your model (<model name>) on <date>, from the pages
  listed below. Not checked by DotAmi. A model's reading, not a published fact."* It reads only pages the
  source registry allows the Lens to read (the same limit as lens-comparisons.md call 3 A), and each page it
  read is listed with its link and the day. It holds no rank, score, rating or verdict words (the
  `VERDICT_WORDS` and `LANDSCAPE_WORDS` checks, § 6), and no business's words are copied onto DotAmi's own
  panel (call 9 A).
- **"Taking you there"**: where a site's terms don't allow a program to read it (§ 4.4, § 4.6: Meta's ad
  library, Google Maps, the directories), the Lens opens the page in the person's own browser for them to read
  themselves. Playwright or any other browser driving is used only within each site's terms, behind the Lens's
  web switch, off until the person turns it on after a plain warning
  ([CLAUDE.md:218–222](../../CLAUDE.md)). Pages the source registry marks never-automated are opened, never
  read by the Lens.
- Whether the summary may also read the person's own notes, and whether it is kept with the idea or shown
  once, are open (§ 15).

## 7. How it's built

| Piece | Kind | Lives in | Reuses |
|---|---|---|---|
| Counts: all industries × Alberta areas and province | Catalog made by a script | `scripts/import-business-counts.mjs` on the kit's import core `scripts/lib/import-kit.mjs` (S2.5.25c) → `lib/engines/business-counts/v2026/`, recording table id, period, pinned area members, next-release date, checksum | `scripts/import-oasis.mjs` → `lib/engines/oasis/v2026/` |
| Citation | Typed, authority `"federal"` | Same folder | `CitationAuthority` ([shared/types.ts:5](../../lib/engines/shared/types.ts)) |
| *Where to look* | View over the source registry | `lib/engines/sources/v2026/registry.ts` (S2.5.25b) | One registry for this panel and S2.5.22's rent-price places |
| Road keys and job links | `Road.codes.occupations`; industry candidates per NOC (place candidates wait on S2.5.26) | Road files; `lib/engines/research-kit/v2026/job-links.ts` (S2.5.25e) | `provinces` ([roads types.ts:23](../../lib/engines/roads/v2026/types.ts)) |
| Area and industry picks (call 6 A) | The person's answers | `Venture.landscapeArea`, `Venture.industryCode` with set-at dates; nullable, add-column only | `occupationCode` |
| More about where (call 6 note) | The person's own words, optional | A nullable `Venture` text column with its set-at date, or a dated `PersonStatement` linked to the idea; which one is settled in 23g | `PersonStatement` |
| Watched businesses (held with call 2, § 6.2 item 5) | The person's own notes | Table `WatchedBusiness` {id, ventureId, nameAsTyped, url?, note?, adLinks, status, addedAt}; fields for names from a list or the Lens wait on S2.5.26 | `lib/db/json-list.ts`; `DELETE_MENU` ([inventory.ts:391](../../lib/privacy/inventory.ts)) |
| Public-record look-ups and the marketing summary (call 4 B) | Lens features, after the Lens | The public-record part of S2.5.25p, and 23r; results arrive as proposals; the summary tagged as the person's model's; never-automated pages opened, never read | Lens [9d]/[9g] ([task-list.md](../task-list.md)) |
| Named-business look-ups and open-data places (call 2) | On hold for S2.5.26 | No design until the research ends (§ 6.3) | — |
| *Advertising* cost line (call 8 A) | Named line priced by the person; **a future story**, not this build | Each road's start-up lines | `NamedCostLine` (roads types.ts:168) |
| Screen | Component and words | `components/cockpit/landscape-panel.tsx`, `lib/landscape/words.ts`, `docs/ui-spec/cockpit/landscape.md` | Right-hand panel slot |

No rule reads any of it: counts, lists and notes change no step, gauge or card. Counts and names are kept in
separate parts of the panel and never joined, because of Statistics Canada's no-linking clause.

## 8. What's stored, and what leaves the computer

| New thing | Kept where | Leaves the computer? |
|---|---|---|
| Area and industry picks | `Venture` columns | No |
| More about where (optional, the person's words) | With the idea, dated, as typed; deleted with the idea | No |
| Watched businesses (held with call 2) | `WatchedBusiness`, local file, encrypted in the desktop app; deleted with the idea | No; not in the plan export |
| Counts, registry | Shipped in the app; made by a maintainer's script | No request at run time |
| Opening a link | The person's browser | The site sees a visit; no person or idea data in the link |
| Lens conversation | Already kept per idea, clearable ([use-cases.md](use-cases.md)) | What the Lens sends follows the rows below |
| Public-record look-up by name (later, call 4 B) | Shown as a proposal | **Yes**: the business name to the government search site, and to the person's model |
| Marketing summary (later, call 4 B) | Shown tagged as the person's model's draft; whether it is kept is open (§ 15) | **Yes**: the business name and the pages read go to the person's model; the sites see the visits |
| Named-business look-ups, a shipped places list, vendor ad estimates, vendor keys or sign-ins for them | On hold for S2.5.26 (§ 6.3, § 6.5) | Not designed; each would be listed here before it is built |

**Privacy inventory** ([lib/privacy/inventory.ts](../../lib/privacy/inventory.ts)):
- *"Your pick of area and industry for Others in this line of work, and anything you wrote about where. Read
  by no rule. Leaves the computer: no."*
- *"Businesses you're watching: names and links you typed, your notes, ad links. Deleted with the idea or from
  Your data. Leaves the computer: no."* Plus a `DELETE_MENU` row. (Held with call 2, § 6.2 item 5.)
- A new line for **data about other people**: watched businesses can name an owner. Inventory scope today is
  "Everything DotAmi keeps about the person" (inventory.ts:2).
- `SENT_ELSEWHERE` ([inventory.ts:796](../../lib/privacy/inventory.ts)), with the Lens: *"When you ask the
  Lens to look up public records or summarise a business's marketing, the business name you gave goes to the
  government search site, and the name and the pages read go to your model. Results can name other businesses
  and people; whether your model's company keeps them depends on its terms."*
- Anything S2.5.26 leads to (named-business look-ups, vendor keys or sign-ins, a shipped places list, vendor
  estimates) gets its own lines before it is built.

**Privacy log** ([docs/privacy-log.md](../privacy-log.md), under [Unreleased]):
- *"Asks: the area and industry you pick for Others in this line of work, and, if you want, more about where in
  your own words. Kept on this computer. Nothing new is sent."*
- *"Keeps: businesses you choose to watch, with your notes. On this computer only; deleted with the idea."*
  (When the watched list is built.)
- *"Ships: Statistics Canada's Canadian Business Counts (June 2026), under the Statistics Canada Open Licence."*
- With the Lens: *"Sends, only when you ask: a business name to the government's public-records search, and
  the name and the pages read to your model for a marketing summary."*

## 9. Rules check ([CLAUDE.md](../../CLAUDE.md))

| Rule | How this design meets it |
|---|---|
| No verdict; no ranking by what DotAmi thinks matters (:22–24) | Fixed orders said on screen (order added); the marketing summary carries no rank, score or verdict words and is tagged as the person's model's. Banned words list |
| Rules decide; the Lens never changes a catalog (:25–30) | No rule reads any of it; the Lens proposes rows the person keeps; the marketing summary is a model's draft, never a rule's input |
| Every claim cited and dated (:31–40) | Counts carry a federal citation and checksum; registry rows carry quotes, day seen and how checked |
| Not legal advice (:41–43) | § 4.7 quotes pages; the screen never says legal or illegal |
| The person's words stay theirs (:44–46) | Names and notes kept as typed, never summarised |
| Never derive a fact about the person (:199) | Area and industry are the person's picks; a job's candidates are labelled suggestions; the more-about-where box is kept as typed and never turned into a place |
| Never invent a number (:200); no averages for a real person (decision 2A) | Only published counts. Anything about ad spend waits on S2.5.26 (call 11 on hold); a vendor estimate or our own would need the maintainer's dated ruling on this rule first |
| Scope guard; powerful Lens actions off until turned on (:218–222) | No DotAmi-run scraping. Lens look-ups and page reading only behind the Lens's web switch; pages whose terms forbid programs are opened for the person, never read (§ 6.8) |
| Agent connects; DotAmi holds no logins (2026-09-24) | Relaxed by the maintainer on 2026-10-16 (research-kit call K2, § 3) for vendor keys and sign-ins, Google sign-in included, where they give people better information. No vendor key is used by this story until S2.5.26 ends |
| Almost no network requests, each listed; inventory and log | § 8 |
| Add-column-only migrations ([future-cockpit.md:1546](future-cockpit.md)) | Nullable columns and one new table |

## 10. Honest limits

- Ordinary Canadian ad spend is not published. Vendor figures are their own models; small sites may get none.
- Marketing strategy is not a published fact. The summary of call 4 B is a model's reading of public pages,
  and can be wrong.
- Counts miss shops with no payroll below $30,000 of revenue, and the industry group is wider than one trade.
  City counts leave out one-person businesses altogether, and stop at 4-digit industry groups (as reported).
- No source sorts businesses by trade reliably. Licence types are generic; Overture's categories, licence
  text and NAICS differ; matching by name is approximate. Overture's coverage of small Alberta shops is
  unknown until a sample is taken (S2.5.25m, on hold with call 2).
- Live results from Google or Yelp can't be kept beyond each vendor's limit, and Yelp's can't be analysed
  (only if S2.5.26 leads to look-ups through them; call 2 on hold, § 6.3).
- A public record found by name may be another business with the same name.
- Whether "this is the right space for me" stays the person's judgement.

## 11. Phases

- **A: counts, where to look, the area questions, Mara.** 23e–23h, 23k, 23n. No network, no model. The
  person's own list (23i) joins it if the maintainer releases it before S2.5.26 ends (§ 15).
- **C: the Lens.** Public records by name and the marketing summary (call 4 B): the public-record part of
  S2.5.25p, and 23r, after the Lens.
- **On hold for research story S2.5.26:** named businesses by any route (call 2: 23i if not released, 23l,
  23o, 23p, the named part of 23m) and ad spend after v1 (call 11: 23q).

**Future notes, no task lists yet** (recorded from the maintainer's notes of 2026-10-16):
- **The *Advertising* cost line (call 8 A).** His words: *"this could work, but it would take a lot of work to
  find accurate numbers and agencies and price comparisons, etc. This will be a yes, but it will be part of a
  future build because it a fair sized story with plenty of tasks."* Task 23j becomes its own future story.
- **Re-inventing Mara from time to time** to see how her cockpit changes (call 10, § 6.4).
- **Sharing for a future learning platform (call 6).** His words: *"I think there should be an option to give
  out more info if the user thinks it will help them. Especialy because when we eventually start building out
  the machine learning platform to this project; we'll have plenty of data and analytics to train it on so we
  can see who's building what and where, and then we can make even better tools for our users."* The first
  half is in this build: the optional more-about-where box (§ 6.1). The machine-learning platform is a future
  idea only. Today DotAmi keeps what a person tells it on their own computer and sends none of it to the
  maintainers; there is nothing to collect it with. Any such sharing would be a future story, opt-in, under
  the maintainer's ruling of 2026-10-05 that people are asked and nothing is shared unless they say yes
  ([settings-and-edge-cases.md:417](settings-and-edge-cases.md)).

## 12. Calls for the maintainer

Recommending to the maintainer is fine; the product itself recommends nothing.

**Call 1: may an official count appear for a real person?** Answered 2026-10-15 (the maintainer): **A**,
*"im cool with this for now; but eventually we'll also need to build this out as well."* Counts ship; "more"
is § 6.6, decided once for every job in research-kit call K5.

**Call 2 (reworked): where do named businesses come from?** Answered 2026-10-15 (the maintainer): B *not
accepted*, *"this doesn't make much sense to me. Why would we do things this way when there are already
websites, github repos and software tools that do this aswell? And like the previous call, we could just build
out our own in-house version."* Reworked; § 3 answers his "why". **Asked once, as research-kit call K3**,
with four routes: A the person's own list; B existing tools on the person's own account through the Lens; C
our own list from open data; D scrapers. **On the research page, 2026-10-16:** K3 **B**, with the note
*"Recommended: A, B and C; not D"* filled in by *Pick all recommended*, not typed by him. **On hold, the same
day**, in his chat: *"well before we implement this, lets look for free software and websites or repos that
already do this, because I've definitely seen stuff like this before. So don't build it out just yet, and
don't make a full plan around this just yet, but we need to make note of it, because we need to do more
research on this topic."* Nothing is built or planned for call 2 until research story **S2.5.26** is done;
the findings it starts from are § 3, § 4.2–4.4 and § 6.3. Whether the person's own list (route A) may go
ahead first is open (§ 15).

**Call 3: ads and ad cost.** Answered 2026-10-15 (the maintainer): **B for v1**, *"I think this would be
acceptable for v1, but there are clearly tonnes of software tools and websites that do this, and so we could
either borrow their info using API calls, MCP's, playright library, or just a link to the website; hell, we
could even build our own."* v1: links, the "not published" line, saved ad links. After v1: call 11.

**Call 4: "accomplished" and "marketing strategy".** Options were: A, public records under a name plus notes;
B, A plus a Lens-written marketing summary (+2 days after the Lens; a model's judgement of a named third
party); C, notes only. **Answered 2026-10-16 (the maintainer): B**, *"I chose B because we get A already + the
AI should be able to use playwrite and other free sites (even if it doesn't scrape them directly, it can at
least take you there), that way it seems like best of both worlds (at least to me)"*. Read here as: the
summary is drafted by the person's own model and tagged so every time it shows, and "taking you there" means
the Lens opens the page in the person's browser, within each site's terms (§ 6.8).

**Call 5: when does a Canadian privacy lawyer read the questions (§ 15, items 1–4)?** The maintainer engages
and pays the lawyer; DotAmi prepares the page (23l). **Answered 2026-10-16 (the maintainer): C**, before
DotAmi ships names only; look-ups on the person's own account go ahead under their vendor's terms, with their
questions on the same page. Since DotAmi shipping names is on hold with call 2, 23l waits for S2.5.26 too. Of
the look-ups, only public records by name and the marketing summary (call 4 B) are planned now.

**Call 6: how "nearby" is set.** **Answered 2026-10-16 (the maintainer): A**, a fixed list of census
metropolitan areas, plus *Somewhere else in Alberta* and *I don't know*, kept with the idea. His note: *"I
think there should be an option to give out more info if the user thinks it will help them. Especialy because
when we eventually start building out the machine learning platform to this project; we'll have plenty of data
and analytics to train it on so we can see who's building what and where, and then we can make even better
tools for our users."* So: an optional *More about where* box in the person's own words (§ 6.1), and the
machine-learning platform recorded as a future note only (§ 11).

**Call 7: where the panel lives.** **Answered 2026-10-16 (the maintainer): A**, the cockpit's right-hand
panel, opened from the goal bar and the *open your own* step (part of 23h).

**Call 8: a named *Advertising* cost line the person prices.** **Answered 2026-10-16 (the maintainer): A**,
on every road's start-up lines, as a future build. His note: *"this could work, but it would take a lot of work
to find accurate numbers and agencies and price comparisons, etc. This will be a yes, but it will be part of a
future build because it a fair sized story with plenty of tasks."* Task 23j is a future story, not part of this build (§ 11).

**Call 9: may the panel quote a business's own words?** **Answered 2026-10-16 (the maintainer): A**, no:
links and the person's notes only.

**Call 10: Mara's example.** **Answered 2026-10-16 (the maintainer): B**, labelled invented picks, Calgary area
and industry group 3371, with the real count. His note: *"I agree. She should have all of her data invented so
that we can at least track how the entire product works; and then of course we should occasionally re-invent
it to see how her cockpit changes accordingly. This way we could potentially change the signal to noise
ratio."* Re-inventing her is a future note (§ 6.4, § 11).

**Call 11: ad spend after v1.** The maintainer's "borrow their info … hell, we could even build our own" meets
"Never invent a number: no projections, no dollar ranges without a sourced figure"
([CLAUDE.md:200](../../CLAUDE.md)). **Asked once, as research-kit call K4**, with four routes: A stay with v1;
B a vendor's labelled estimate on the person's own account; C a DotAmi-made spend figure; D DotAmi gathering
the ads themselves. **On the research page, 2026-10-16:** K4 **A**, with the note *"Recommended: A now, then B
after the Lens."* filled in by *Pick all recommended*, not typed by him. **On hold beyond v1, the same day**,
in his chat: *"thats why we have to do our research around this topic first; no different than the competitor
list. I know this stuff exista out there so we have to look for it and plan for it instead of just builing
blindly."* v1 stands; nothing beyond it is planned until research story **S2.5.26** is done (§ 6.5). B and C
would both need the maintainer's dated ruling on CLAUDE.md:200 first.

## 13. Tasks

Kit tasks (S2.5.25x) are counted once, in [research-kit.md](research-kit.md) § 11; this table shows only this
story's days.

| Id | Title | Done when | Days | Calls |
|---|---|---|---|---|
| S2.5.23e | *Where to look* as a registry view | The panel lists registry sources (S2.5.25b) in the fixed order; a test fails on any person or idea data in a link | 0.5 | — |
| S2.5.23f | Counts for every industry | Built on the import core (S2.5.25c, 25d): every industry down to 4 digits × Alberta areas, 6 digits for the province; Calgary (455) × 3371 and Edmonton (467) × 3371 equal the imported file, area members re-checked by query first; the 4-digit and employer-only limits written in the catalog; checksum; engine-integrity green | 2 | — |
| S2.5.23g | Ask area and industry | Nullable columns; the two questions (call 6 A); the optional *More about where* box, kept as typed and dated, read by no rule; picker lists the job's candidates (job-links catalog) first, labelled; inventory and log lines | 2.5, plus the box (not yet estimated) | 6 |
| S2.5.23h | The panel | Opens from the goal bar and the *open your own* step (call 7 A); count with limits, amber line, where to look, ad-cost line; no business's own words quoted (call 9 A); words pass both lists; UI spec; browser test; in the no-verdict walk | 3 | 7, 9 |
| S2.5.23i | Businesses you're watching | **Held with call 2** unless the maintainer releases it (§ 15). Table, API, form, ad links, edit, remove; deleted with the idea; `DELETE_MENU`; data-about-others line; joins `e2e/journey.spec.ts` | 2 | 2, 9 |
| S2.5.23j | *Advertising* cost line | **A future story, not this build** (call 8 A, § 11): named line on every road; the money gauge counts the person's quote. Its tasks are written when that story starts | — | 8 |
| S2.5.23k | Mara's example | Call 10 B: Calgary area and 3371, labelled invented, with the real count; the watched list says why it stays empty | 0.5 | 10 |
| S2.5.23l | Lawyer questions | **Waits for S2.5.26** (call 5 C: before DotAmi ships names). § 15 items 1–4 plus whatever S2.5.26 leads to, quoted with links, for the maintainer to send | 1 | 5 |
| S2.5.23m | Look-ups on the person's account | Public records by name (call 4 B) through the Lens, in the public-record part of S2.5.25p. Its named-business part is **on hold** for S2.5.26 | counted in 25p | 2, 4 |
| S2.5.23n | Record the answers | `future-cockpit.md` decision 2 and § 12 say counts may appear for a real person; calls 1–3 (2026-10-15) and 4–10 (2026-10-16) recorded, dated; calls 2 and 11 recorded as on hold (with S2.5.25r) | 0.5 | — |
| S2.5.23o | Places coverage sample | **On hold** for S2.5.26 (was = S2.5.25m) | — | 2 |
| S2.5.23p | Open-data names section | **On hold** for S2.5.26 (was = S2.5.25n) | — | 2, 5 |
| S2.5.23q | Vendor ad estimates | **On hold** for S2.5.26 (was = S2.5.25q) | — | 11 |
| S2.5.23r | Marketing summary | After the Lens (call 4 B): drafted by the person's own model, tagged so every time it shows, pages listed with links and days; reads only pages the registry allows; never-automated pages opened in the person's browser, never read; words pass both lists; `SENT_ELSEWHERE` and log lines | 2 (after the Lens) | 4, 9 |

Answered path (4 B, 5 C, 6 A, 7 A, 8 A as a future story, 9 A, 10 B): **9 days** in this story now (23e,
23f, 23g, 23h, 23k, 23n), plus the optional box in 23g (not yet estimated), plus 2 days for 23i if the
maintainer releases it before S2.5.26 ends, plus the kit's share (25b, 25c). After the Lens: the public-record
part of 25p, and 23r (2 days). On hold for S2.5.26: 23l, 23o, 23p, 23q and the named part of 23m. A future
story: 23j.

## 14. Not in scope

DotAmi-run scraping or Playwright on any site whose terms forbid it. Named businesses from any route but the
person, and ad spend beyond v1, until research story S2.5.26 is done (calls 2 and 11 on hold). Review sites'
ratings and review text, and rating or review fields from vendor look-ups. Any rank, score, market share,
saturation, trend or per-person measure. Forecasts of the person's sales. A model-written profile of any
business beyond the tagged marketing summary of call 4 B. Joining names to counts. Contacting competitors.
Contact databases about people (Apollo, ZoomInfo). Copies of other businesses' ads, photos, reviews or words
on DotAmi's panel (call 9 A). The *Advertising* cost line (a future story, call 8 A). Sharing anything a
person tells DotAmi, for a learning platform or otherwise (a future, opt-in idea, § 11). British Columbia and
Ontario in the first build (the keys allow them later).

## 15. Open questions (not verified; nothing above relies on them as fact)

The lawyer questions (items 1–4) wait with 23l for research story S2.5.26 (call 5 C). Items 11 and 12 are for
the maintainer.

1. **Lawyer:** is a person planning their own business on their own computer acting "for personal or domestic
   purposes"? Does keeping sole proprietors' names change that?
2. **Lawyer:** does a Statistics Canada count on the same panel as names count as "linking" under its licence?
3. **Lawyer:** may DotAmi ship names from city licence lists or Overture, given both city licences exempt
   personal information and Calgary's list flags home businesses?
4. **Lawyer:** is the Lens driving the person's browser "automated collection" under Meta's terms; is Lens use
   of Google's Center allowed under its terms (not readable by our tools; a quote limiting use to "information
   or research purposes" was reported but not read, `†`)?
   **Lawyer:** may the person keep a business name Google showed them by typing it into their own watched list
   (a question for call 2's route B, on hold, § 6.3)? Would storing OpenStreetMap data make DotAmi's file a
   derivative database? Is gathering competitors' ad images and text fair dealing (call 11's route D, on hold)?
5. Which Edmonton text governs (2022 licence or 2016 PDF); Calgary's and Edmonton's terms on caching.
6. Overture's coverage of small Alberta shops (S2.5.25m would answer it; on hold with call 2).
7. Not read: Foursquare's API terms and real free tier; Yelp's prices and full API terms; Grounding Lite's
   pricing page; Similarweb's and Ahrefs' terms on keeping results; SpyFu's terms; plan prices for Semrush,
   Ahrefs, Similarweb, SpyFu; SpyFu's Canada coverage; Google's Ads Transparency Center terms (script-only);
   whether Google's Center has an API or Canada spend data; whether any vendor returns a dollar ad-spend figure
   for Canada.
8. How a person can know whether their own model provider trains on or keeps what they send, which
   Grounding Lite's terms require (§ 4.3); DotAmi can only ask them to confirm.
9. Whether *Businesses you're watching* ever goes in the plan export ([10e]). Left out by default.
10. [README.md:64](../../README.md) says nothing is sent anywhere; the inventory already contradicts it. The
   Lens task's wording must not add to that.
11. **For the maintainer:** call 2 is on hold as a whole, including the person's own list (*Businesses you're
    watching*, 23i, call 2's route A), which needs no outside tool, ships no names and sends nothing. Its saved
    ad links are part of v1 (call 3 B, research-kit call K4 A). May 23i be built before S2.5.26 ends, or does it
    wait with the rest of call 2?
12. **For the maintainer:** the marketing summary (call 4 B, § 6.8): may the person's model also read the
    person's own notes on that business, and is the summary kept with the idea (and so in *Your data* and
    deleted with the idea) or shown once and not kept?
