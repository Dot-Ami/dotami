# One research kit for every job and business (design)

Status: **Design, not built. Waiting on the maintainer's calls (§ 10).** Written 2026-10-15. No product code
until the calls are answered. Tracker: S2.5.25 (this kit; S2.5.25a is this doc). It builds on two designs in
the same pull request (#175): [other-ways-to-build.md](other-ways-to-build.md) (S2.5.22: buy, rent or lease,
plus tax and legal pointers) and [competitive-landscape.md](competitive-landscape.md) (S2.5.23: others in this
line of work). It also supplies the **data side** of S2.5.24, the Lens answering comparison questions, whose
conversation is designed in [lens-comparisons.md](lens-comparisons.md) (S2.5.24a). Calls K7, K8 and K9 below
are asked **once**, here, for both docs. Read with [future-cockpit.md](future-cockpit.md),
[use-cases.md](use-cases.md) (the Lens) and [connectors-and-agents.md](connectors-and-agents.md) (the planned
facts interface and MCP server).

Conventions:
- **Every outside link below was seen on 2026-10-15.** Anything the research could not confirm is in § 13 and
  is never stated as fact.
- Repo facts cite a path and line on this branch (main `1e96a04` merged in).
- Day counts are rough estimates in working days, not measurements.
- Nothing here is legal advice.
- Amounts written `$N,NNN` are placeholders, not sourced figures.

Words used throughout:
- **MCP** (Model Context Protocol) is a standard way for an AI agent to call another program's tools.
- **API** (application programming interface) is a way for a program to ask a service for data.
- **Playwright** is a library that drives a web browser automatically.
- **NOC** is the National Occupational Classification, Canada's code list of jobs.
- **NAICS** is the North American Industry Classification System, the code list of industries.
- **OGL** is the Open Government Licence – Canada.
- **A view** is the same list shown filtered, not a second copy of it.
- **Text encoding** is the way characters are stored in a file; some government files use an older one.
- **Share-alike** means anything built from the data must be published under the same licence.
- **The Lens** is DotAmi's planned built-in assistant, running on the person's own model and key.

## 1. The request

The maintainer, 2026-10-15, word for word, answering four of PR #175's calls:

> "1. agreed. And not only this, but when they use the lense chat, the lense chat SHOULD be able to answer
> questions like "Hey, whats the cheapest option", or "whats the fastest option?", or "which one of these
> would have the strongest long-term foundation for me to build out other business's" + any other edge cases
> like this. that means, we obviously need to make a story and tasks for the lense chat to be able to do this
> as well. So what data would the lense chat require, how would we get it, how does it know? etc etc
> 2. I think this would be acceptable for v1, but there are clearly tonnes of software tools and websites that
> do this, and so we could either borrow their info using API calls, MCP's, playright library, or just a link
> to the website; hell, we could even build our own.
> 3. this doesn't make much sense to me. Why would we do things this way when there are already websites,
> github repos and software tools that do this aswell? And like the previous call, we could just build out our
> own in-house version.
> 4. im cool with this for now; but eventually we'll also need to build this out as well.
> Now with all of that said, we're still clearly just talking about the cabinet makers shop; but of course all
> of these same tools and tactics will need to be applied to any job or career path; which means this will
> have to turn into a library, or script, or a combo of the two, but it makes no sense building all of this
> out repeatedly for every single job and business possibility."

| # | PR #175 call it answers | The maintainer's answer | Where this doc takes it |
|---|---|---|---|
| 1 | other-ways-to-build call 1 (rent and lease prices) | C (own quotes plus links to places that publish rent prices; the Lens finds listed prices later), **plus** a new Lens story | § 4.4, § 5.7, calls K7–K9 |
| 2 | competitive-landscape call 3 (ads and ad cost) | B for v1, **plus** a later path through other tools (API, MCP, Playwright, a link) or our own | § 3.2, § 3.3, calls K2, K4 |
| 3 | competitive-landscape call 2 (who puts named businesses in) | **Not accepted.** Why not existing websites, GitHub code (repos) and tools, or our own? | § 3.2, § 3.3, call K3 |
| 4 | competitive-landscape call 1 (official counts for a real person) | A for now; "eventually build this out" | § 4.2, call K5 |

His closing paragraph is this story: build each tool and tactic **once**, keyed so it works for any job,
career, business, industry and place.

## 2. The idea in one paragraph

Most of what S2.5.22 and S2.5.23 need has nothing to do with cabinetmaking in particular. It is government
data keyed by a **job code**, an **industry code**, a **province** and an **area**. Alongside that sit a few
outside tools, each with its own terms. So the kit is mostly data, and it comes in four parts:

1. A **source registry** that records, for every outside source, what it gives and on what terms DotAmi may
   reach it.
2. The **four code keys**, which every road names, and one reviewed **job-links catalog** that says which
   industries and place categories go with each job.
3. **One import core** that turns any keyed government file into a shipped catalog.
4. A **research-pack script** that hands whoever writes a new road an empty, cited skeleton and a checklist.

The cockpit screens, the Lens and the planned MCP server all read the same library, so they cannot disagree.
A comparison the Lens gives is plain code run over typed, cited data and the person's own numbers, sorted by a
measure the person names. Nothing is written twice for the next job; only what is truly about that job
(its steps, trade rules and permits) is written per road.

## 3. What the research found

### 3.1 Generic (keyed by a code) versus written for each job

| Kind | Examples, with source | How often it's built |
|---|---|---|
| **Keyed by job code** | OaSIS (the Occupational and Skills Information System) job profiles: about 20 files under the OGL, updated "as needed", with no tools or equipment file ([open.canada.ca](https://open.canada.ca/data/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec)). NOC 2021 elements, where machines appear only in the duties prose ([CSV](https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/noc-2021-v1.0-elements.csv)). Job Bank wages by NOC × province × economic region (an area grouping, not a city), yearly, OGL ([open.canada.ca](https://open.canada.ca/data/dataset/adad580f-76b0-4502-bd05-20c125de9116)); each row's source code says how it was made, and some rows shown under a region are a province-wide figure or a small-area estimate. 3-Year Employment Outlooks, rated very good to very limited, by region, with the narrative in HTML ([open.canada.ca](https://open.canada.ca/data/dataset/b0e112e9-cf53-4e79-8838-23cd98debe5b)). The Canadian Occupational Projection System (COPS) 2024–2033, national only ([CSV](https://open.canada.ca/data/dataset/e80851b8-de68-43bd-a85c-c72e1b3a3890/resource/7c4767a5-f807-441d-9776-a0074b5870a0/download/summary_sommaire_2024_2033_noc2021.csv)) | **Once**, by an importer |
| **Keyed by industry code** | Canadian Business Counts, census metropolitan areas, June 2026, semi-annual ([table 33-10-1176](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3310117601)), under the [Statistics Canada Open Licence](https://www.statcan.gc.ca/en/terms-conditions/open-licence), which requires its source line. The NAICS Canada 2022 code list ([open.canada.ca](https://open.canada.ca/data/dataset/980d598c-73c9-4003-b6e1-78a9a3081b6c)) | **Once** |
| **Keyed by asset type** | Canada Revenue Agency (CRA) depreciation classes: Class 8 is 20%, Class 10 is 30%, Class 12 (including small tools under $500) is 100%, Class 50 is 55% ([canada.ca](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/classes-depreciable-property.html)) | **Once** (S2.5.22g already writes these) |
| **Written per job, no API** | Trade rules. Alberta's Cabinetmaker profile says "Optional Certification", 1,360 hours per period and a practical exam of $160.00; the Hairstylist profile says "Compulsory Certification" ([0361](https://tradesecrets.alberta.ca/trades-in-alberta/profiles/0361), [0424](https://tradesecrets.alberta.ca/trades-in-alberta/profiles/0424/)). Permits: BizPaL (the permits and licences finder) has no API, and its terms allow non-commercial copying only, so commercial redistribution needs written permission from Innovation, Science and Economic Development Canada ([terms](https://bizpal.ca/disclaimers/)). Steps and done-when lines. Tool lists | **Once per road**, cited |

**The weak joint.** The research found no official link from a 5-digit NOC job to a 6-digit NAICS industry
(a title search of Statistics Canada's [table list](https://www150.statcan.gc.ca/t1/wds/rest/getAllCubesListLite)).
The nearest official link, as the research reported it (not confirmed), is census table 98-10-0594, at
4-digit occupation by 2-digit sector. City licence types are generic too. Calgary's list has 23,221 rows and
notes "Not all business require a municipal licence" ([metadata](https://data.calgary.ca/api/views/vdjc-pybd.json)).
Its licence types are generic, such as MANUFACTURER or CONTRACTOR. A trade-name match on "cabinet" found 55 rows
(a snapshot, and name matching is unreliable). So "which industries and which place categories go with this
job" is held once per **job**, not per road, as **reviewed, cited data** in the job-links catalog (§ 5.3), and
the person's own pick always overrides it.

### 3.2 Four ways to reach an outside source (answers 2 and 3)

Each source's own terms decide which ways are allowed. That is why those terms live in the registry as data
(§ 5.2) and are not coded per job.

| Way in | Allowed for… | Not allowed for… |
|---|---|---|
| **Link out** (the person clicks) | Everything | — |
| **Ship open data** (a maintainer's script builds a catalog before release; no request from the person's computer) | Statistics Canada counts. Overture Maps places, under CDLA Permissive 2.0, Apache 2.0 and CC0 by provider, released monthly ([guide](https://docs.overturemaps.org/guides/places/)), about 11.0 GB worldwide per release ([bucket listing](https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/2026-09-23.1/theme=places/)), so a city extract is cut from it. Calgary's business-licence list, under the *Open Government Licence – City of Calgary* 2.1, which allows commercial use with a required credit line and exempts personal information ([terms](https://data.calgary.ca/d/Open-Data-Terms/u45n-7awa)); Edmonton's list (43,675 rows, [data](https://data.edmonton.ca/api/views/qhi4-bdpu.json)), whose two licence texts conflict (competitive-landscape.md § 4.2) | OpenStreetMap: a derivative database may have to be published under its share-alike licence ([OSMF guideline](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline)); a lawyer question, so not shipped |
| **The Lens, live, on the person's own account** (official API or MCP server; where the key lives is § 5.9) | **Google Places API**: needs a Google Cloud project with billing and an API key, billed per request; Text Search Pro was US$32.00 per 1,000 after 5,000 free a month ([pricing](https://developers.google.com/maps/billing-and-pricing/pricing)). **Google's Maps Grounding Lite MCP server** ([page](https://developers.google.com/maps/ai/grounding-lite)): Maps content must not be "cached by, stored by, or used to improve the LLM"; "You must not use Maps Grounding Lite with any models that use the data input into the model for any model training"; "you must generate a link preview" for each place, sources "must immediately follow the generated content", linked through `places.googleMapsLinks.placeUrl`. **Yelp**: content may be cached 24 hours at most; business ids may be stored indefinitely ([FAQ](https://docs.developer.yelp.com/docs/fusion-faq)). **Semrush**: MCP server at `https://mcp.semrush.com/v2/mcp` ([page](https://developer.semrush.com/api/basics/semrush-mcp/)); Trends data needs a Trends API Basic or Premium plan; results kept one month at most ([limits](https://developer.semrush.com/api/introduction/api-usage-restrictions)). **Ahrefs** and **Similarweb** offer MCP access on the person's own paid plan ([Ahrefs MCP](https://docs.ahrefs.com/mcp/docs/introduction.md), [Similarweb MCP](https://developers.similarweb.com/docs/similarweb-mcp)); their keep terms were not read (§ 13) | **Keeping** results beyond each limit. Google Places lets only the `place_id` be kept indefinitely, latitude and longitude 30 days ([policies](https://developers.google.com/maps/documentation/places/web-service/policies), [service terms 14.3](https://cloud.google.com/maps-platform/terms/maps-service-terms)). Yelp: "Analysis is not permitted for Yelp Places integrations" (it points to a separate Insights API), so Yelp results are never counted, sorted or compared. **Not offered:** Apollo and ZoomInfo, contact databases about people; Apollo forbids making its database available to third parties ([terms](https://www.apollo.io/terms)) and "prohibits AI model training with Apollo MCP integrations" ([MCP](https://docs.apollo.io/docs/apollo-mcp.md)) |
| **Automated page reading** (Playwright) | Only a page the person opens, once per ask (S2.5.22's existing rule), and only where the registry doesn't mark the site `never-automated` | A crawler run by DotAmi. Google Maps terms bar scraping ([§ 3.2.3](https://cloud.google.com/maps-platform/terms)) and building a "business listings database" ([Maps terms](https://www.google.com/help/terms_maps/)). YellowPages.ca bars "scraping, data-mining" ([terms](https://corporate.yp.ca/terms-of-use-agreement)). Job Bank prohibits "any script, robot, spider" ([terms](https://www.jobbank.gc.ca/termsofuseseeker)). Meta requires express written permission ([terms](https://www.facebook.com/apps/site_scraping_tos_terms.php), read through a summarising tool) |

Third-party scrapers sell exactly this collection. SerpApi sells a Google Ads Transparency Center API
([pricing](https://serpapi.com/pricing.md)), and community Apify actors scrape Meta's ad library for about $0.75
per 1,000 ads ([actor](https://apify.com/curious_coder/facebook-ads-library-scraper)). Apify's terms make the
customer "solely responsible for the legality" of the data
([general terms 5.8](https://docs.apify.com/legal/general-terms-and-conditions)).

**GitHub repos** (his answer 3 names them): the most visible one,
[gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper) (MIT licence), collects Google Maps
listings. Its own README warns that "Unauthorized scraping may violate terms of service", and Google's
[Maps terms](https://www.google.com/help/terms_maps/) bar building a "business listings database" (with
scraping barred in the [Platform terms § 3.2.3](https://cloud.google.com/maps-platform/terms)). A person running
any of these on their own is their own act. DotAmi bundling one is a different thing, and that is call K2 C/D.

### 3.3 What "build our own" can honestly mean

- **Named businesses: yes, from open data, once it is proven.** Two kinds of shippable open source list named
  businesses: Overture places (map data) and the Calgary and Edmonton business-licence lists (*Open Government
  Licence – City of Calgary* / *– Edmonton*, credit line required; licensed businesses only; both licences
  exempt personal information, and Calgary's list flags home businesses). Overture measures existence only,
  "a relative filtering tool rather than a precise probability" ([guide](https://docs.overturemaps.org/guides/places/)),
  warns of "duplicates, a high junk rate, and low property completeness", and says country figures "will be
  published here as they are confirmed". City lists miss businesses that need no licence and use generic
  licence types, so the trade is found only by a name match. Coverage of small Alberta shops is unproven until
  someone counts a sample (25m). Foursquare-sourced records need their credit line and NOTICE text
  ([attribution](https://docs.overturemaps.org/attribution/)).
- **Ad spend: not honestly, today.** Meta gives spend only for social-issue, election and political ads
  ([tools](https://transparency.meta.com/researchtools/ad-library-tools/)). Google's Transparency Center shows
  which ads ran, where, when and in what format ([launch post](https://blog.google/technology/ads/announcing-the-launch-of-the-new-ads-transparency-center/)).
  Vendor figures are models: Similarweb calls them "estimations" and may show "Not enough data" for small sites
  ([methodology](https://support.similarweb.com/hc/en-us/articles/360001631538-Similarweb-Data-Methodology),
  [help](https://support.similarweb.com/hc/en-us/articles/207698639-What-does-Not-enough-data-mean-)); Semrush
  publishes "estimated traffic metrics". No vendor read so far was seen to return a dollar ad-spend figure
  (§ 13). An in-house figure would be a number DotAmi made, and that collides with "Never invent a number"
  (call K4).

## 4. What a person sees

All words live in words files and pass `VERDICT_WORDS` / `VERDICT_PHRASES`
([tests/helpers/verdict-words.ts:25](../../tests/helpers/verdict-words.ts)) and the `e2e/no-verdict.spec.ts`
walk. Those lists don't hold *cheapest*, *fastest*, *strongest* or *lowest* today, so S2.5.24e adds them,
allowed only inside the "Sorted by …: your choice" frame (lens-comparisons.md § 6.4).

### 4.1 Any job, not only the cabinetmaker

The person already picks "the job closest to the work you'd do yourself" (`Venture.occupationCode`, an OaSIS
code such as `72311.00` whose first five digits are the NOC code; [prisma/schema.prisma:169](../../prisma/schema.prisma)).
With call K6 A, a job that has no written road shows *About this job* by default:

> **No written road for Hairstylists and barbers (NOC 63210) yet.**
> Here is what the government publishes about this job. If you plan to run your own business, you can open
> *Starting any business in Alberta* from *Pick a future*. When a road for this job is written, it appears there.

No new question is asked, and nothing assumes the person is starting a business.

### 4.2 *About this job* (the same panel for every job)

It opens from the goal bar, in the right-hand panel, like *Compare*. Which rows appear for a real person is
call K5. They always appear in this fixed order: rules, wages, outlook, counts, links.

> **About this job · Cabinetmakers (NOC 72311) · your pick of job**
> **Certification in Alberta:** "Optional Certification" (Alberta Tradesecrets, trade 0361).
> **Hourly wage published for this job · Calgary economic region** (or *Alberta-wide figure* when the row's
> source code says so; *small-area estimate* where it is one) **· reference period shown:** low $NN · median $NN
> · high $NN (Job Bank wage file). *What workers in this job were paid. Not what a shop earns, and not what you
> would earn.*
> *(Only with K5 C)* **Government outlook, all of Canada, 2024–2033:** "Moderate risk of Shortage" (Employment
> and Social Development Canada). *The government's own projection for the whole country. It says nothing
> about you.*
> **Places of business with employees, your area and industry group:** the count from competitive-landscape
> § 4.1. *One-person shops with no payroll aren't in this count.*
> **Where to look yourself:** Job Bank's page for this job · BizPaL · the trade's Tradesecrets page.
> *What the government publishes about this job, side by side. Nothing here says whether it fits you.*

The area in the wage label comes from the row's source code, never from the row's region name.

### 4.3 *Others in this line of work*, with outside tools (answers 2 and 3)

The S2.5.23 panel stays as designed. With K2 B and K3 B, rows appear only once the person has connected their
own account and turned on the Lens's connector switch:

> **Look up businesses near you · Google Places · your own Google Cloud project (billed to you per request)**
> *Name, address and Google's link only, in alphabetical order. Shown now, not kept by DotAmi beyond the place
> id; Google's terms limit keeping them. Add one to Businesses you're watching.*
> **Paid-search estimate · Semrush · your own account**
> *Semrush's own estimate, seen 15 Oct 2026. Not published by the business. Removed after Semrush's one-month
> limit; no DotAmi total uses it.*

With K3 C, after the coverage sample:

> **Overture Maps: places in the category "cabinet maker" near Calgary · data of September 2026**
> **Calgary's licence list: trade names containing the word "cabinet"** *(a name match, not a trade; shops
> without the word aren't here; home-business rows left out)*
> *Overture says its places data has "duplicates, a high junk rate, and low property completeness".
> Credit lines below.*

### 4.4 Asking the Lens (data side of S2.5.24)

The conversation itself is designed in [lens-comparisons.md](lens-comparisons.md). What the kit guarantees is
that each answer is built from typed, cited values and counts its blanks:

> **Sorted by money to start, on what's priced so far: your choice. DotAmi doesn't rank futures.**
> *Stay employed:* $NNN in official fees · 0 lines not priced yet
> *Open your own shop:* $N,NNN in official fees + $N,NNN of your numbers · 5 lines not priced yet
> With 5 lines not priced, this order can change once you price them. Before tax; what it costs after tax is a
> question for your accountant. Sources ▸

> **Sorted by official designed length, where one is cited: your choice.** Apprenticeship: 4 periods, each
> "designed to take about a year" (Alberta Apprenticeship and Industry Training). Trades Qualifier: no
> designed length is cited; it asks for 72 months and 8,160 hours of verifiable work experience, which is a
> different kind of time, so DotAmi doesn't compare it. 3 later steps have no cited time.

> "Strongest" can mean different things, and DotAmi doesn't choose for you. What do you mean by it?
> *[In my own words…]*
> Or pick one of the things DotAmi can count (alphabetical): · Lines where you picked Buy or Already have it
> · Links to your other ideas · Reaches *Incorporating* · Skills you marked *have* that other roads also list

### 4.5 What a road writer sees (developer-only)

`node scripts/research-kit.mjs --noc 63210 --naics 8121 --province AB` writes two things.

1. **A research pack** (markdown) listing:
   - the generic catalog rows that already exist for these codes;
   - each registry source that applies, with its terms line;
   - the per-job pieces still to write, each with its official link (trade profile, BizPaL).
2. **A road skeleton** with empty, cited slots. The road validator refuses the road until every slot is filled
   or explicitly marked "none": for example, "no licensing step" for a software developer.

The pack is a checklist for a person or contributor. It never becomes a catalog by itself.

## 5. How it's built

### 5.1 Shape: a library plus scripts (call K1)

- **Scripts** (developer tools, never shipped, outside the app's network check like
  [scripts/import-oasis.mjs](../../scripts/import-oasis.mjs)):
  - `scripts/lib/import-kit.mjs` (the import core);
  - one small adapter per dataset;
  - `scripts/research-kit.mjs` (the pack and skeleton).
- **Library** (`lib/research-kit/`, pure code, no network): keyed lookups over the shipped catalogs (job →
  facts, industry × area → counts), the registry, the job-links catalog and road code keys. The screens, the
  Lens's read tools and the MCP server all call it.

### 5.2 The source registry ("connector cards")

The registry lives at `lib/engines/sources/v2026/registry.ts` and is checked by a validator. It has one entry
per outside source. It reuses the "dated observation, not a legal citation" shape that PR #175 shares with
`ExampleSources` ([lib/examples/types.ts:64](../../lib/examples/types.ts)). A registry entry backs no rule.

| Field | Values | Example |
|---|---|---|
| `access` | ship · link · lens-live · page-person-opens · never-automated | Job Bank pages: never-automated (its files: ship) |
| `keyHolder` | none · person (where the person's key lives is § 5.9) | Google Places: person |
| `keepLimit` | a list of {field: content · id · coordinates, limit: forever · N hours · N days · never, quote} | Yelp: {content, 24 hours}, {id, forever}. Google Places: {content, never}, {place_id, forever}, {latitude and longitude, 30 days}. Grounding Lite: {content, never} |
| `display` | allowed · with conditions (the conditions word for word) | Places API content not on a non-Google map ([service terms 14.2](https://cloud.google.com/maps-platform/terms/maps-service-terms); Places UI Kit, 15.1, is an exception). Grounding Lite: a link preview per place, sources right after the text, linked to `placeUrl` |
| `figureKind` | published · count · vendor-estimate | Similarweb: vendor-estimate |
| `modelUseRule` | none · no-training-on-inputs · not-stored-by-model, with the quote | Grounding Lite: both no-training-on-inputs and not-stored-by-model |
| `compareAllowed` | yes · no, with the quote | Yelp: no ("Analysis is not permitted for Yelp Places integrations") |
| `licence`, `creditLine` | word for word | Statistics Canada's source line |
| `keyedBy` | noc · naics · province · area · economic-region · business-name · asset-type · line-kind · none | Job Bank wages: noc, economic-region |
| `termsQuote`, `seenOn`, `checkedBy`, `nextRelease?` | the deciding words, the day, tool or person | as competitive-landscape § 4 |

A source is marked `lens-live` only after that vendor's terms for agent use have been read; until then it is
`link`. Several S2.5.22 and S2.5.23 lists become **views over this one catalog**:
- PR #175's *Where to look* list (23e);
- S2.5.22's places that publish rent prices (22n);
- one `never-automated` list for every story: S2.5.22's do-not-fetch pages (DOZR, Meta, Kijiji) and
  competitive-landscape § 4.4's sites (YellowPages.ca, Canada411, Google Maps' consumer site, Job Bank pages).

A test fails on a missing field, and fails if any `vendor-estimate` source feeds a gauge or a total.

### 5.3 The four code keys and the job-links catalog

- `Road` gains `codes`, beside `provinces` ([lib/engines/roads/v2026/types.ts:23](../../lib/engines/roads/v2026/types.ts)).
  It holds `occupations`: the NOC codes the road is written for. That is all a road names.
- **Job links** live once per job, not per road: `lib/engines/research-kit/v2026/job-links.ts` holds
  {noc, industryCandidates: [{naics, reason, citation?}], placeCategories: [{source, category or match word,
  reason}]}, reviewed by a person and cited where a source supports the choice (census table 98-10-0594 at
  sector level). A road inherits the links of its NOC codes; a per-road override is allowed only with its own
  citation. Two roads for one job, or one road per province, never repeat the mapping.
- The validator ([validate.ts](../../lib/engines/roads/v2026/validate.ts)) refuses an unknown NOC code (checked
  against the OaSIS catalog) and an unknown NAICS code (checked against the imported code list).
- **Area** is a census metropolitan area or the province for the counts. Job Bank's wage and outlook files are
  keyed by **economic region**, a different map (Calgary's economic region is not the Calgary census
  metropolitan area), so an economic-region key is added for those sources: mapped from the person's area by a
  cited Statistics Canada concordance if one exists, or asked separately (K5).
- The person still picks their job and their industry (S2.5.23g). The job's candidates are listed first in the
  picker, labelled *suggested for this job · your pick*, with the full list below. The person still makes the
  pick.

### 5.4 One import core

`scripts/lib/import-kit.mjs` takes over what `import-oasis.mjs` already does:
- pinned checksums;
- `--check` and `--download`;
- data kept in `data/<dataset>/`;
- output written to `lib/engines/<name>/v2026/`.

It adds what the generic files need:
- per-file text encoding (the COPS and some Statistics Canada files are Latin-1; OaSIS and wages are UTF-8 with
  a byte-order mark, an invisible marker at the start of the file);
- table id and reference period as inputs;
- the licence and credit line;
- the next-release date, so a stale catalog shows amber.

Each dataset is one small adapter. OaSIS is refit first, and `--check` proves its output is unchanged. The
S2.5.23f counts import is built on the core. As far as the research saw (reported, not confirmed; 23f checks
it), the census-metropolitan-area table goes down to 4-digit industry groups and counts only businesses with
employees, so the import covers every NAICS code down to 4 digits for each Alberta census metropolitan area,
and 6 digits only for Alberta and Canada. Snapshots ship with each release and are not fetched on the person's
computer.

### 5.5 Typed times: the data "fastest" needs (call K9)

No road step carries a typed time today. Times are prose only, for example 4 periods "designed to take about a
year" and 72 months and 8,160 hours
([apprentice-to-own-shop-ab.ts:418, :583](../../lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts)). That
breaks "Numbers the engine reasons about are typed fields" ([CLAUDE.md:196](../../CLAUDE.md)).

`RoadStep` ([types.ts:64](../../lib/engines/roads/v2026/types.ts)) would gain an optional `time` list. Each entry
has a kind, an amount, a unit, `approximate` (true when the quote says "about"), a citation and the official
words. The five kinds are kept apart:
- `designed-length` (4 periods, each "about a year": approximate)
- `required-work` (1,360 hours per period)
- `minimum-experience` (72 months and 8,160 hours)
- `must-finish-within` (18 months)
- `deadline-after` (45 days to pay, 15 days to open a WCB account)

`processing` (official turnaround times) is reserved for when one is cited; none is on disk. The validator
refuses an amount that is not in the citation's tool-checked quote, the rule fees already follow. Sums happen
only within one kind, and an approximate amount is never summed as if it were exact.

### 5.6 How S2.5.22 and S2.5.23 map onto the kit

| PR #175 task | Becomes | Built twice? |
|---|---|---|
| 23e *Where to look* list; 22n rent-price places | Views over the registry (25b) | No; the registry replaces both lists |
| 23f counts import | First adapter on the import core (25d) | No; one import serves every road |
| 23g area and industry questions | The person's side of the code keys (25e uses them) | No |
| 23h panel; 23i watched businesses; 23j advertising line | Generic over the code keys; the skeleton adds the advertising line to every road | No |
| 22f ways catalog; 22g tax entries; 22m where to ask | Already keyed by line kind, asset kind and province, not by job | No |
| 22p Lens proposes a listed price; 23m Lens looks up records by name | **One** feature: Lens live look-up through registry sources (25p) | Merged: about 5 days becomes 3 |
| 23l lawyer questions | Gains the open-data names questions (25o) | No |
| 23o, 23p places sample and list | = 25m, 25n | No |
| 22o, 23k Mara's example | Stays per example | — |

### 5.7 What the Lens needs from the kit (S2.5.24's data side)

The Lens knows only what its read tools return. Code computes every number; the model words it.

| Question | Data | Exists today? | Kit task |
|---|---|---|---|
| Least cash up front | Official fees + agreed quotes, with blanks counted, never treated as $0 | Yes ([evaluate-road.ts:549-569](../../lib/roads/evaluate-road.ts)) | Read tools (25k) |
| Fastest | Typed, cited times by kind | **No** | 25j |
| Strongest foundation | The person's chosen measure: `next` arrows and `joins` (road 1 joins road 0 at *Incorporating*, [apprentice-to-own-shop-ab.ts:1266](../../lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts)), skill items shared across roads ([types.ts:130](../../lib/engines/roads/v2026/types.ts)), way picks, venture links | Mostly | 25k |
| Fewest steps left or new skills; what I lose by picking X | Compare rows ([told.ts:343](../../lib/cockpit/told.ts)) | Yes | 25k |
| About the job and industry | Job facts, counts | After 25d and 25i | 25k |
| Will it succeed; most income; most tax-efficient | A forecast or advice | Never ([CLAUDE.md:22-24, :200](../../CLAUDE.md)) | — |

No measure reads the structure ladder's `transitionTrigger` strings, such as "Retained earnings, IP, or
multiple ventures may favour a holding company" ([ladder.ts:127](../../lib/engines/structure/v2026/ladder.ts)),
which carry no citation of their own; and no road has a holding-company step yet, so nothing counts one (§ 13).

Today's `GET /api/readout` covers only road 0's nodes ([route.ts:64](../../app/api/readout/route.ts)). Task 25k
extends the read tools:
- to written roads: `road_view`, `list_options`, `reachable`;
- to the kit: `job_facts`, `industry_counts`.

These match the planned MCP tool list ([connectors-and-agents.md](connectors-and-agents.md) § C). The comparison
function, the reply guard and the conversation belong to S2.5.24.

### 5.8 Reuse

| Need | Reuses |
|---|---|
| Imports | `scripts/import-oasis.mjs` pattern, `lib/engines/oasis/` |
| Quotes checked against the page | `scripts/check-quotes.mjs` |
| Comparison | `compareEndings` ([told.ts:416](../../lib/cockpit/told.ts)) and `evaluateRoad` with its purity test ([evaluate-road.ts:31-40](../../lib/roads/evaluate-road.ts)) |
| Privacy | `SENT_ELSEWHERE` ([lib/privacy/inventory.ts:796](../../lib/privacy/inventory.ts)), [docs/privacy-log.md](../privacy-log.md) |
| Keys | The OS keychain the Lens plan already uses for the model key ([use-cases.md](use-cases.md), task [9a]) |

### 5.9 Where a connector's key lives (K2)

A live look-up needs the person's own credential for that vendor: a Google Cloud API key, a Yelp key, a
Semrush sign-in. The Lens is built into DotAmi, so if the Lens makes the look-up, **DotAmi's own process reads
that key and sends it to the vendor**. The plan already does this for the model key: "Keys the person chose to
add — in the operating system's keychain, not the database" ([use-cases.md](use-cases.md), the table of what
is kept; task [9a]). A vendor key would sit in the same keychain, never in `dotami.db`, be read only at the
moment of a look-up, go only to that vendor, and be listed in `lib/privacy/inventory.ts`.

Said plainly: that is DotAmi holding a login, which bends the 2026-09-24 ruling ("an agent connects, DotAmi
holds no logins") the same way [9a]'s model key already does. The literal reading is K2 option E: the person's
own outside agent (one they run, with its own connectors) makes every live look-up, reading DotAmi's facts
through DotAmi's MCP server, and DotAmi never sees a vendor key.

## 6. What's stored, and what leaves the computer

| New thing | Kept where | Leaves the computer? |
|---|---|---|
| Registry, code keys, job links, job facts, counts, NAICS list, typed times | Shipped catalogs; nothing about the person | No request; made by the maintainer's scripts before release |
| The research pack | The developer's checkout only | Never shipped |
| Places list (K3 C) | Shipped catalog | No request. It holds **data about other people**: sole proprietors' trade names |
| Lens live look-up (K2 B) | Shown in a separate, unsaved result card. Kept only within the source's `keepLimit`: a watched business keeps the name the person types and, for Google, the place id | **Yes.** The search words go to that company under the person's own account, and the results go to the model the person chose |
| The Lens conversation | Already kept per venture, clearable ([use-cases.md](use-cases.md)) | Vendor results **never** enter it; it records only "looked up <vendor>, <date>, N results" and ids |
| The person's key for a vendor tool | The operating system's keychain (§ 5.9), **never** in `dotami.db`; none at all with K2 E | Only to that company |

**The Lens's connector warning**, shown before a `lens-live` source is turned on, says what the vendor's
terms say about models and money: *"This tool's terms forbid using it with a model that trains on what you
send it or keeps it. DotAmi can't check your model; your model provider's terms decide. Each look-up is billed
to your account by Google; see their price page (seen 2026-10-15: Text Search Pro US$32.00 per 1,000 after
5,000 free a month)."* Lines appear only where that source's `modelUseRule` or billing applies.

Privacy inventory lines (the privacy test fails until each exists):
- One `SENT_ELSEWHERE` entry per `lens-live` source: *"When you ask the Lens to look something up with a tool you
  connected, your search words go to that company under your account. Results can include names and details of
  other businesses and people; they go to the model you chose, and whether that model's company keeps them
  depends on its terms, not DotAmi. DotAmi keeps nothing from the results beyond what that company allows."*
- One entry for each vendor key kept in the keychain (K2 B).
- With K3 C: *"Shipped with the app: names and places of businesses from open map data and city licence lists.
  This is about other people, not you. Leaves the computer: no."*

Privacy log lines, under [Unreleased]:
1. *"Ships: the government's published facts about jobs and Statistics Canada's business counts, each with
   its licence line. Nothing is sent."*
2. *"Ships, if built: open map data and city licence lists naming nearby businesses, with their credit lines.
   Nothing is sent."*
3. *"Sends, only when you ask the Lens and only through a tool you connected: your search words to that
   company; results go to your model and aren't kept by DotAmi."*

## 7. Rules check ([CLAUDE.md](../../CLAUDE.md))

| Binding rule | How this design meets it |
|---|---|
| Information and options; no ranking by what DotAmi thinks matters (:22-24) | The person picks every measure; code sorts; the answer says "your choice". No combined score, no "best". Vendor results shown alphabetically, never counted or compared |
| Rules decide; models explain; the Lens never changes a catalog (:25-30) | Catalogs change only through the maintainer's scripts and validators. The research pack is a checklist, not a catalog |
| Every claim cited and dated (:31-40) | Importers record table, period, checksum and licence. Typed times must match a checked quote. Registry rows carry their terms quote and day |
| Numbers the engine reasons about are typed (:196) | Times move from prose to typed fields (K9) |
| Never derive a fact about the person (:199) | Job, industry and area are the person's picks. A job's industry candidates are labelled, never picked for them. A wage is never shown as theirs. A job with no road doesn't assume a business |
| Never invent a number (:200) | No DotAmi estimate. Blanks are counted. Unlike kinds of time are never added; approximate times never summed as exact. Vendor estimates appear only under K4 B, labelled as the vendor's |
| Not legal or tax advice (:41-43) | "Most tax-efficient" goes to the questions for the accountant; comparisons are before tax |
| Scope guard; powerful Lens actions off until switched on (:218-222) | Live look-ups sit behind the Lens's planned connector switch and warning. DotAmi runs no scraper |
| Agent connects; DotAmi holds no logins (2026-09-24) | **Bent by K2 B** (the key in the keychain, read by DotAmi's Lens), as [9a] bends it for the model key; K2 E keeps it literally |
| Inventory and privacy log; value over more safety settings | § 6. No new setting; everything reuses the Lens's planned switches |

**Where the maintainer's asks collide with a binding rule or another design**, said plainly (each is a call):
1. "Build our own" ad-spend figures vs "Never invent a number" (K4).
2. "Which is strongest" vs "does not rank options by what it thinks matters" (K8).
3. "Cheapest" on rent vs buy. The reworked other-ways-to-build.md hands "cheapest" to the Lens under K7 (its
   § 2 and § 4.10) but keeps "No difference line on any screen" (§ 4.1) and says "Nobody here can say …
   which way costs less after tax, the Lens included" (§ 8). K7 A keeps both: screens unchanged for ways, and
   every Lens answer on buy vs rent is before tax only.
4. "Fastest" vs future-cockpit.md:830-831 and :1733, "The only duration is calendar months to the person's
   own date" (K9).
5. "Eventually build this out" vs decision 2 and § 12 of future-cockpit.md, and "no projections" for outlook
   ratings (K5).
6. "Build our own" names vs the privacy of sole proprietors' names (K3).
7. Live look-ups on the person's own account vs "DotAmi holds no logins" (K2, § 5.9).

## 8. Honest limits

- No source gives a start-up cost or a duration for a job in general. "Cheapest" means "on what is priced",
  and "fastest" works only where a time is cited. Both always report how many blanks remain.
- There is no official NOC-to-NAICS link at the detail a road needs, so each job's links are hand-reviewed.
- OaSIS and NOC have no structured tools list, so equipment lines stay written per road.
- BizPaL has no API and allows only non-commercial copying, so permits stay links or written lists.
- Wages are by economic region, not city, describe workers, not a shop's income, and some rows are a
  province-wide figure or a small-area estimate. COPS is national only.
- City counts leave out one-person businesses, and stop at 4-digit industry groups (as reported; 23f checks).
- Overture's Canadian coverage is unproven, and its own guide warns of duplicates and junk. City lists miss
  businesses that need no licence.
- Ordinary Canadian ad spend is published nowhere. Vendor figures are their own estimates.
- Most vendors' results can't be kept, and Yelp's can't be analysed, so live look-ups are a look, not a store.
- "Strongest" can only be sorted by a measure the person chose.

## 9. Phases

- **A, now (no Lens needed):** registry, import core, code keys and job links, research pack, typed times,
  *About this job*, read tools, a second road written with the kit, and the coverage sample.
- **B, with the Lens's first version ([task list](../task-list.md) [9d]):** comparison answers (S2.5.24).
- **C, with the Lens's connector powers ([9g]):** live look-ups on the person's own account, and labelled
  vendor estimates. Places list only after the coverage sample (and a lawyer's reading, if the maintainer
  wants one).

## 10. Calls for the maintainer

Recommendations here are to the maintainer; the product itself never recommends. K3 and K4 are the same
decisions as competitive-landscape.md calls 2 and 11; K7, K8 and K9 settle lens-comparisons.md too. Each is
answered once, here.

**K1. What shape is the kit?** *Why it matters:* it decides whether each new job reuses shared data or gets
researched again by hand.
- A. **Library + scripts in this repo** (his "a combo of the two"). Every road naming its codes gets the same
  panels, and writers get a pack and skeleton. About 8.5 days (25b–25g). Risk: the most to build first.
- B. **Scripts only.** About 3 days. Risk: the screens and the Lens each read the catalogs their own way, and
  roads re-import.
- C. **A, as a separate package other projects can use.** About 4 more days. Risk: upkeep before anyone needs it.
- D. **A, plus a model drafting road files from the pack at build time**, every quote tool-checked before merge.
  About 3 more days. Risk: model-written catalog text that must still be checked line by line.
- *Recommended: A.* Importers are scripts and lookups are a library, so each half does a real job. D can follow
  once the second road proves the slots.

**K2. How may outside tools be reached?** (answers 2 and 3) *Why it matters:* each vendor's terms allow
different routes, anything live sends the person's words off the computer, and a live look-up needs the
person's key somewhere.
- A. **Links plus shipped open data only.** 0 extra days. Risk: no live look-ups.
- B. **A, plus the Lens live through official APIs or MCP servers on the person's own account**, the key kept
  in the OS keychain and read by DotAmi only at the moment of a look-up (§ 5.9), keeping only what each source
  allows. 3 days after the Lens (25p). Risk: the query leaves the computer, behind the person's switch;
  **bends the 2026-09-24 "DotAmi holds no logins" ruling**, as [9a] does for the model key.
- C. **B, plus DotAmi-run Playwright crawling of sites.** About 3 more days. Risk: against the stated terms of
  Google Maps, YellowPages.ca, Job Bank and Meta (§ 3.2).
- D. **B, plus bundled scrapers (GitHub scrapers, Apify, SerpApi)** on the person's paid account. About 2 more
  days. Risk: legality falls on whoever runs it, and DotAmi would be choosing the scraper.
- E. **A, plus the person's own outside agent** makes every live look-up with its own connectors, reading
  DotAmi's facts through DotAmi's MCP server ([9i]). 0 extra days in DotAmi. Risk: only people who run their
  own agent get live look-ups, and DotAmi can't enforce keep limits there; the built-in Lens chat can't look
  things up.
- *Recommended: B.* It is his "API calls, MCP's" route inside the Lens chat he asked for, on the routes the
  vendors' published API and MCP pages describe; each vendor's terms for agent use are checked before its
  registry entry is marked `lens-live`. E is the choice if the 2026-09-24 ruling is read strictly. Playwright
  stays for the one page the person opens.

**K3. Named businesses: which routes?** (answer 3; same decision as competitive-landscape call 2) *Why it
matters:* the earlier recommendation (the person now, the Lens later from government data) was declined.
Building our own means shipping names, and some names are personal information. **Pick any of A–C; D is
separate.**
- A. **The person's own list**, *+ Add a business*, now. 2 days (23i). Risk: the person does the looking.
- B. **Existing tools on the person's own account:** the Lens looks businesses up live through Google Places
  (a field mask: name, address, link, id) or Yelp after [9g]. No ratings or reviews requested; shown
  alphabetically; never counted or compared; not saved in the Lens conversation. Inside 25p. Risk: needs the
  person's paid key; nothing persists.
- C. **Our own list from open data:** an Overture extract plus the Calgary and Edmonton licence lists (home-
  business rows left out), only if the 1-day coverage sample (25m) finds the shops, and after a privacy
  lawyer's reading if the maintainer wants one. 1 day, then 4 days, plus 0.5 for lawyer questions. Risk:
  coverage unproven; duplicates; sole proprietors' names; must never be joined to counts.
- D. **Scrapers** (GitHub scrapers, Apify, DotAmi-run Playwright) on Google Maps, YellowPages.ca, Canada411.
  About 3 days. Risk: against each site's stated terms; breakable; DotAmi distributes copied names.
- *Recommended: A, B and C; not D.* It uses existing tools on their own terms and keeps "build our own" on
  the path once it is shown to work. D is listed because he named GitHub repos and Playwright.

**K4. Ad spend after v1?** (answer 2; same decision as competitive-landscape call 11) *Why it matters:* no
source publishes ordinary Canadian ad spend, so "build our own" collides with "Never invent a number".
- A. **v1 only:** ad-library links, the "not published" line, and saved ad links. 0 extra days. Risk: thin.
- B. **A vendor's labelled estimate, if the vendor's API returns one**, through the Lens on the person's own
  paid tool (Semrush, Ahrefs or Similarweb; SpyFu's terms not read, so not a registry source until they are),
  shown as *"<vendor>'s estimate, seen <date>"*, never kept past the vendor's limit and never used in a total.
  No vendor read so far was seen to publish a spend figure; Semrush and Similarweb publish estimated traffic.
  1.5 days after the Lens (25q). Risk: **also changes a binding rule:** "Never invent a number" would need a
  dated exception for a modelled figure labelled as the vendor's own estimate.
- C. **One reading of "build our own": a DotAmi-made spend figure.** About 5 days or more. **Collides with
  "Never invent a number"**; no published input exists (§ 3.3), so it would rest on guesses.
- D. **Another reading of "build our own": DotAmi gathers the ads themselves (not spend)**, through SerpApi on
  the person's key or the Lens browsing Google's Center. 2 days after the Lens, plus the lawyer. Risk: needs
  competitive-landscape § 14 changed and its call 9 B; SerpApi is a third party scraping Google, whose terms
  restrict automated access; ad images and text are the advertiser's copyright (a fair-dealing question for
  the lawyer); Meta forbids automated collection without written permission.
- *Recommended: A now, then B after the Lens*, if he accepts the rule exception. Both B and C are rule
  changes; the call is his.

**K5. Beyond counts, which job facts may a real person see?** (answer 4) *Why it matters:* decision 2 and § 12 of
future-cockpit.md keep government wage and industry figures off a real person's screen in phase 1.
- A. **Counts only.** 0 days. Risk: thin.
- B. **Plus official wage ranges** by job and economic region, with reference period, the row's own geography
  level (economic region, province-wide, small-area estimate) and source. 2 days. Changes decision 2 for these
  rows and needs the economic-region key (§ 5.3). Risk: a wage read as the person's income.
- C. **B, plus official outlook ratings** (3-year outlook by region; COPS national), quoted as the government's
  projection. About 1.5 more days. **Collides with "no projections"** unless that rule covers only DotAmi's own.
- *Recommended: B.* Past, official and keyed as the kit is; the "build out" with the least rule change.

**K6. What does a person see for a job with no written road?** *Why it matters:* this is what "applied to any job
or career path" means on screen.
- A. ***About this job*, with road 0 one click away in *Pick a future* for those planning a business.** 2.5
  days. Risk: a thin map for a trade until its road is written.
- B. **Nothing new until a road is written.** 0 days. Risk: most jobs get little for a long time.
- C. **The Lens drafts a personal road**, tagged "drafted by your model", coloured by no rule. About 4 days after
  the Lens. Risk: it can read as DotAmi's own cited road.
- *Recommended: A.* Real, cited value for every job now, with no invented steps and no assumption about a
  business.

**K7. When the person names what to sort by, where may DotAmi put their options in that order?** (answer 1;
settles lens-comparisons.md) *Why it matters:* decision 3 allows "one countable measure the person picks,
always said on screen" (future-cockpit.md:47-48, :836-837; phase 2 there), while other-ways-to-build.md keeps
"No difference line on any screen".
- A. **In the Lens and on the screens decision 3 names** (Your futures, Compare the two endings, the training
  routes), always with *"Sorted by <measure>: your choice. DotAmi doesn't rank futures."* and the blank counts;
  computed in code. Ways on one cost line stay unsorted on screen and are sorted only when the person asks the
  Lens, before tax only. Brings decision 3 forward from phase 2. About 10.5 days before the Lens and 6 after
  (lens-comparisons.md § 11), plus 25k. Risk: the Lens says something about ways that the ways screen doesn't;
  one sentence there says so.
- B. **The Lens only**; screens wait for phase 2 as decision 3 says. About 3.5 days before the Lens. Risk:
  nothing to see until the Lens exists.
- C. **A, plus a sort control on every ways line.** About 1 more day. Reverses "No difference line on any
  screen". Risk: price-first framing all over the screen.
- D. **Facts side by side, never in order.** About 2 days. Risk: doesn't answer his question.
- E. **The Lens picks the criterion or names a winner.** Needs a change to CLAUDE.md:22-24 and the no-verdict
  tests. Risk: a verdict nobody can cite or test.
- *Recommended: A.* It answers his question in decision 3's own words, with code doing every sum.

**K8. "Strongest long-term foundation"?** (answer 1; settles lens-comparisons.md) *Why it matters:*
"strongest" has no countable meaning, and judging it is the ranking the rule forbids.
- A. **The Lens asks what the person means**, offering their own words first, then the things DotAmi can count,
  in alphabetical order: lines picked as Buy or Already have it; links to their other ideas; reaches
  *Incorporating*; skills marked *have* that other roads also list. Each picked measure is its own row, sorted
  one at a time, never combined. 1.5 days plus the Lens flow. Risk: one extra question; some meanings can't be
  counted and stay as the person's words.
- B. **The Lens maps the person's words to a measure, and the person confirms.** About 1 more day. Risk: the model
  shapes the measure.
- C. **DotAmi defines "foundation" as one fixed measure.** Needs a rule change. Risk: DotAmi chooses what matters.
- D. **The model judges it, tagged as the model's view.** Needs a rule change. Risk: can't be cited or tested.
- E. **Decline the question.** 0.25 day. Risk: his own example goes unanswered.
- *Recommended: A.* The person supplies the meaning and code counts, following S2.5.21g's "ask clarifying
  questions until the user is confident".

**K9. Typed times so "fastest" can be answered?** (answer 1; settles lens-comparisons.md) *Why it matters:*
times are prose today, and the cockpit allows only months to the person's own date.
- A. **Typed, cited times with five kinds kept apart, an `approximate` flag, summed only within one kind.**
  Lifts future-cockpit.md:830-831 and :1733 for cited official times only. 2.5 days (25j). Risk: each time
  needs a checked quote; an official minimum can be read as a promise, so a fixed label says it isn't.
- B. **Times stay prose; the Lens quotes them side by side.** 0 days. Risk: "fastest" can't be sorted.
- C. **A, plus research into official processing times** (registry, business number). About 2 more days. Risk:
  few are published.
- D. **A, plus the person's own time guess for steps with no official time**, kept apart from official times.
  About 1.5 more days and a new stored value per step, with inventory and log lines. Risk: guesses beside
  official figures.
- *Recommended: A.* It closes a hard-constraint gap without ever adding unlike kinds of time.

## 11. Tasks

| Id | Title | Done when | Days | Calls |
|---|---|---|---|---|
| S2.5.25b | Source registry | Every source in § 3.2 entered with all § 5.2 fields (`keepLimit` per field, `modelUseRule`, `compareAllowed`); one `never-automated` list for every story; validator; test fails on a missing field or a `vendor-estimate` feeding a total; 23e and 22n lists are views over it | 2 | K1, K2 |
| S2.5.25c | Import core; OaSIS refit | `import-kit.mjs` with encodings, licence line, period, next release; `import-oasis.mjs --check` unchanged | 1.5 | K1 |
| S2.5.25d | Counts for every industry | 23f built on the core for every NAICS code down to 4 digits × Alberta census metropolitan areas, 6 digits for Alberta and Canada; the 4-digit and employer-only limits checked against the table and written in the catalog | 0.5 over 23f | K1 |
| S2.5.25e | Code keys, job links, NAICS list | `Road.codes.occupations`; `job-links.ts` keyed by NOC with reviewed industry and place candidates; unknown codes refused; roads 0 and 1 carry codes; the picker lists the job's candidates first, labelled; economic-region key if K5 B | 1.5 | K1, K5 |
| S2.5.25f | Research-pack script | Pack and skeleton for 72311, 63210, 21232; no job text in the script; never shipped | 2 | K1, K9 |
| S2.5.25g | Validator and guide | Unfilled slots refused; checklist in docs/engines/roads.md and CONTRIBUTING.md | 1 | K1 |
| S2.5.25h | *About this job* panel | Same panel for any job, rows per K5, fixed order; wage label's area from the row's source code; road 0 offered in *Pick a future*, never assumed; verdict checks; browser test; no-verdict walk | 2.5 | K5, K6 |
| S2.5.25i | Job facts importers | Wages (and outlooks with K5 C) with source codes, geography level and periods kept; outlook HTML stripped; tests read known rows | 2 (+1.5) | K5 |
| S2.5.25j | Typed, cited times | `RoadStep.time` with five kinds and `approximate`; amount must be in the checked quote; approximate amounts never summed as exact; road 1 typed; cockpit § 4 updated | 2.5 | K9 |
| S2.5.25k | Read tools cover roads and kit | `road_view`, `list_options`, `reachable`, `job_facts`, `industry_counts`; readout covers road 1; each value returns its source; no measure reads `transitionTrigger` strings; an outside agent gets them only for ventures set to Read or higher | 2 | K7, K8 |
| S2.5.25l | Prove it: second road | A hairstylist road (Alberta) with no new code outside its road file and its job-links entry; validators green | 3 | K6, K9 |
| S2.5.25m | Places coverage sample | Counts of Overture places under the job's categories and of Calgary and Edmonton licence-list name matches, in Calgary and Edmonton, duplicates noted, written up before any list is promised | 1 | K3 |
| S2.5.25n | Places list | Only if the sample passes: per-city extract from Overture and the city lists, home-business rows left out, credit lines and NOTICE, panel section, never joined to counts, inventory and log lines | 4 | K3 |
| S2.5.25o | Lawyer questions | Open-data names questions added to the 23l page | 0.5 | K3 |
| S2.5.25p | Live look-ups on the person's account | After [9g]: replaces 22p and 23m; `lens-live` sources only; field masks with no rating fields; alphabetical; `keepLimit` per field enforced in code; `compareAllowed: no` sources refused by the comparison function; Grounding Lite's display conditions and model-use confirmation; vendor results never saved in the Lens conversation (test); `never-automated` domains unreachable; key in the keychain (or none with K2 E); `SENT_ELSEWHERE` entries; log line | 3 (after Lens) | K2, K3 |
| S2.5.25q | Labelled vendor estimates | Only with K4 B and a vendor that returns a figure: vendor, account and date shown; never kept past the limit or summed; dated CLAUDE.md exception | 1.5 (after Lens) | K4 |
| S2.5.25r | Rule and doc text | CLAUDE.md, future-cockpit decision 2, :830, :1733, § 12 and the #175 docs match the answers, dated | 0.5 | K4, K5, K7, K9 |

On the recommended path (K1 A, K2 B, K3 A+B+C, K4 A then B, K5 B, K6 A, K7 A, K8 A, K9 A) the kit is about 27
build days before the Lens, or 23 if the coverage sample stops the places list. It is 4.5 days after the Lens.
That includes merging 22p and 23m into one feature, which saves about 2 days. The comparison function, reply
guard and conversation are S2.5.24's own tasks (lens-comparisons.md § 11).

## 12. Not in scope

- Any score, combined measure, "best" or winner named by DotAmi or the Lens.
- Forecasts of income, success or tax.
- A DotAmi-run scraper or crawler.
- Shipping OpenStreetMap-derived data.
- Matching a person to grants: the open Business Benefits Finder file has no eligibility fields
  ([open.canada.ca](https://open.canada.ca/data/dataset/4e75337e-70d0-4ed7-92d1-3b85192ec6b1)).
- Permit automation.
- Provinces beyond Alberta in the first build (the codes are keyed so others can follow).
- Storing outside tools' results beyond their limits; contact databases about people.

## 13. Open questions (not verified; nothing above relies on them)

1. **City licence texts.** Which Edmonton text governs (2022 licence or 2016 PDF); Calgary's and Edmonton's
   terms on caching; whether their personal-information exemption covers sole proprietors' names.
2. **Coverage.** Overture's and Foursquare's Canadian coverage, Foursquare's update schedule, and its pricing
   page's two conflicting free-tier statements.
3. **Vendor terms and prices.**
   - Yelp's API terms and plan prices.
   - Ahrefs' and Similarweb's terms on keeping results; SpyFu's terms (returned "not found").
   - The dollar prices of Semrush, Ahrefs and Similarweb plans.
   - SpyFu's Canada coverage.
   - Whether any vendor returns a dollar ad-spend figure for Canada.
4. **Example rows.** The wage rows for 72311, 63210 and 21232 in Calgary. The business-count rows, and whether
   table 33-10-1176 stops at 4-digit industry groups. The Innovation, Science and Economic Development Canada
   (ISED) Financial Performance Data structure. Census table 98-10-0594. The Red Seal tools-and-equipment
   block. These were reported but not confirmed.
5. **Permits and process times.** Whether BizPaL lists Calgary and Edmonton permits. Official processing times
   for registry and business-number steps (none on disk).
6. **Foundation measures.** A holding-company step becomes a countable measure only once a road step or
   structure entry with a checked citation exists; the structure ladder's transition lines need citations
   before any surface quotes them.
7. **Area concordance.** Whether Statistics Canada publishes a concordance from census metropolitan areas to
   Job Bank's economic regions.
8. **Other provinces.** Their trade hours and profiles.
9. **Legal (for a lawyer).**
   - Whether shipping open-data names of sole proprietors is lawful.
   - Whether a Lens look-up on the person's account counts as "automated collection" under any vendor's terms.
   - Whether storing OpenStreetMap data would make DotAmi's file a derivative database.
