# Changelog

Every catalog entry carries its own dates: `lastVerified`, the day its source was last read (and,
since 2026-10-11, `readBy` when who read it is on record), or since 2026-10-11 a tool check, the day
a script found the quoted words on the page.
This file is the other half: what changed in the project between snapshots. A version here is
a dated snapshot, not a promise of stability.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **About this job** ([14i], task 25h; [docs/ui-spec/cockpit/about-this-job.md](docs/ui-spec/cockpit/about-this-job.md)).
  Once you've picked the job closest to your work, the goal bar's *Look closer* menu has *About this job*, which
  opens in the right-hand panel (on a phone, a sheet over the road). Four rows, always in this order: the
  government's *Employment requirements* for the job's group, quoted word for word under a line saying they are
  its words (Statistics Canada's NOC 2021); the wages Job Bank publishes for the group, the row labelled with the
  level its own source code gives, its period and survey, and "Not what a shop earns, and not what you would
  earn" (a region with no figures says so, with the government's note and the row it points to); a plain line
  that business counts aren't in this version; and *Where to look yourself*: Job Bank's wage search, BizPaL and
  (in Alberta) Tradesecrets, each the site's own general page, with the job's name and code shown as text to
  copy, never in a link. Outside Alberta the wage row is the one for the province or territory as a whole, with
  why under the row's label. It only shows: nothing on the road changes, and nothing new is kept. The government's files are read on
  DotAmi's own server, so the large job and wage lists never load into the page. Until your region is kept
  (Pick a future's next step, its own change) the wage row is the province's own, saying your region isn't
  picked. The screen checks read it: no verdict, no time in DotAmi's own words (the government's quoted lines
  pass only on this row, only as the shipped file holds them), and its own clutter limit. The browser idea
  sweep opens it too, for every swept idea that names a job, and reads every wage figure back as the wage
  file's own row (a summed wage, or a figure outside its row, is caught).
- **One list of outside sources and their terms** (the research kit's source registry,
  `lib/engines/research-kit/v2026/registry.ts`; [docs/architecture/research-kit.md](docs/architecture/research-kit.md)
  § 5.2). Plumbing, with no change on screen: one card for each government file the kit ships in this phase and
  the next (the job and skills files, the job titles, the wage file, the industry code list, the business counts
  and census tables marked as later), the two ad libraries, and the sites whose terms bar scripts (Job Bank's
  pages, YellowPages.ca, Canada411, Google Maps, DOZR, Kijiji, Meta), plus Google's Ads Transparency Center,
  never fetched because its terms couldn't be read (the maintainer's call, 2026-10-21; still a link you open
  yourself). The other sources the design names (the
  live look-ups on a person's own account, the place lists, Apollo and ZoomInfo, and the rent-price places) get
  their cards in phase 3. Each says how DotAmi may reach it,
  what may be kept, its licence and credit line, and the words on its own terms page that decided it, with the
  day (most were found word for word by the quote checker on 2026-10-20). A test refuses a card with a field
  missing, an unknown licence, a vendor's estimate feeding a total, or a site whose terms bar scripts marked as
  something DotAmi fetches. It makes possible: every new data source checked the same way before it ships, and
  one never-fetch list the Lens will obey. The ad-library links in *Others in this line of work* now come from it.
- **One way to import government data** (`scripts/lib/import-kit.mjs`, § 5.4): each file read in its own text
  encoding, its pinned checksum checked, its licence line taken from the registry, and a plain "A newer … may be
  out." once a source's stated next release has come. The OaSIS skills import now runs on it and makes the same
  module, byte for byte. It makes possible: the job titles, wages and industry list of the next tasks, each as
  one small file.
- **`npm run data:check`**, a step of `npm run ci:quality` and of CI on every pull request: every importer's
  government files checked against their pins and its generated module rebuilt and compared, offline. A changed
  byte in a government file, or a hand edit to a generated module, now fails the pull request.
- **Job Bank's published wages, imported, not shown yet** ([14i], task 25i; the maintainer's word of
  2026-10-21). Plumbing, with no change on screen: Job Bank's 2025 wage file from open.canada.ca (revised
  2025-11-19, Open Government Licence – Canada), pinned by its checksum and committed as downloaded under
  `data/job-bank-wages-2025/`, becomes `lib/engines/wages/v2026/`. For each job group and place it keeps the
  low, median and high wage exactly as the file prints them, whether they are hourly or yearly, the reference
  period, the row's own source code and the level that code says (a row filed under Calgary whose code says
  "province" is an Alberta-wide figure), and the file's note where it published no figures. A look-up gives
  the file's own row for a job in an economic region or in a province as a whole, and says plainly when the
  file has no such row, never borrowing a neighbour's. Wages only: no outlook ratings, and never a person's
  income or part of any total. The licence's credit line is on `/licences`. It makes possible: the wage row of
  *About this job* (25h).
- **Tests: the gate knows a published wage and a quoted government requirement** (29i, 29k; for *About this
  job*, before it is built). No change on screen. A wage the government publishes for a job group is now a kind
  of number the "every number cited or the person's own" check accepts, but only on *About this job*'s wage row,
  only beside the row it comes from, and only when that row carries its source code, the geography level the
  code gives, and its reference period (`tests/helpers/number-provenance.ts`); a wage is never one of the lines
  a total adds up, so a wage put into a cost, a total or a gauge fails. The government's "Employment
  requirements" lines (*"a one- or two-year hairstyling apprenticeship"*) pass the no-times check by one rule
  for their kind of source instead of one entry per line: only inside quote marks, under the label that says
  they are the government's words, on *About this job*'s requirements row, and only lines the run read
  word for word from the shipped file for the group the label names (`tests/helpers/official-quotes.ts`;
  until the importer ships those lines, none pass anywhere). The same words without the label or the quote
  marks, on any other screen, or a sentence of DotAmi's own put in quote marks under the label, still fail.
  The verdict check gets the same treatment for the one requirement line the design allows (group 53200's
  *"strongly recommended"*), under its label only. The browser sweep now takes out only a catalog citation's
  own quote before its no-times check, where it used to take out anything in quote marks. Over all 2,122
  requirement lines of the elements file (the copy of 2026-10-15), 404 hold a time and 1 a verdict phrase as
  DotAmi's words; drawn on the requirements row with the group's lines read, none is caught, and planted on a
  plan step, or with nothing read, all 404 are.
- **The government's job titles, imported** (task 28a). Two files, each pinned by its SHA-256 and checked by
  `npm run data:check`: OaSIS 2025's "Example Titles" (18,666 titles for the 900 jobs, Employment and Social
  Development Canada, Open Government Licence – Canada; `lib/engines/oasis/v2026/titles.ts`) and Statistics
  Canada's NOC 2021 Version 1.0 elements file (each of the 516 job groups' example titles and its "Employment
  requirements", word for word, as the government's own lines; `lib/engines/noc/v2021/`), under the Statistics
  Canada Open Licence with its notice ("Adapted from Statistics Canada, …"), the maintainer's call 4 of
  2026-10-21. Both are listed on `/licences`. Plumbing, with no change on screen yet: they feed *What's closest
  to your work?* and *About this job*.
- **The search behind *What's closest to your work?*** (the engine half of task 28b;
  `lib/engines/oasis/v2026/title-search.ts`), with no screen yet. The person's words are looked for in the
  government's example titles and the job names (research 28f's rule H: a word matches a title word with the
  same first five letters, so "plumbing" finds Plumbers); jobs are grouped by how many of the words their titles
  hold, in the government's code order inside each group, never ranked; each result names the title it
  matched. DotAmi's own short word list (`lib/engines/oasis/v2026/dotami-word-list.ts`: filler words and
  business words left out and named, and a few everyday words such as "salon" or "dayhome" pointed at one of a
  job's own government titles) is the maintainer's to approve line by line, and anything it finds sits in its
  own last group, said to be DotAmi's. On the 220 test ideas with an expected job, the expected job is in the
  group shown first for 153 (today's search finds 20), and 4 get no result at all (today 187).
- **Roads name the jobs they're written for, and Alberta's wage regions are data** (task 25e's phase 2 part,
  [docs/architecture/research-kit.md](docs/architecture/research-kit.md) § 5.3). Plumbing, with no change on
  screen yet. *From apprentice to your own shop* says it is written for 72311 Cabinetmakers, and *Starting any
  business in Alberta* says it is written for no particular job; the road checks refuse a job code the
  government's list doesn't have. One function gives the roads written for the job a person picked, in the
  order they were written, and none when none is, without falling back to the general road (for Pick a future's
  road match, next). The job is still only the person's own pick: nothing picks it from a road. A job-links
  file holds an entry only for a job a road is written for (today Cabinetmakers), with its industry and place
  lists left empty until the lists they come from are in DotAmi; every other job gets a line saying so.
  Alberta's eight economic regions, with Statistics Canada's codes and names as published, are now data for
  the "Which region are you in?" question, with their source and credit line in the source registry and on
  /licences; reading the person's answer never works a region out from their area. The industry code list
  (NAICS) moved to phase 3 with the industry question, as the maintainer decided. Nothing DotAmi keeps, sends or
  asks changes.
- **Outside Alberta, the federal steps that apply everywhere, and your province named** ([14l], tasks 28d and
  29j; [docs/ui-spec/futures/04-outside-alberta.md](docs/ui-spec/futures/04-outside-alberta.md)). A new road,
  *The federal steps for any business in Canada* (`road-federal-steps-ca`), is *Starting any business in
  Alberta* without Alberta: the same map stages and federal *before you open* steps, built from road 0's own
  parts so the two can't drift apart, less *Register your business name* (all alberta.ca) and the two lines and
  the links that rest on an Alberta page (WCB Alberta on *Hire first employee*, registering a name on *Service
  vs. productize*); 13 steps. Step 3 of *Pick a future*'s three steps (and the end of the typed way) lists it
  only for a person in Canada outside Alberta, first, under *Written for all of Canada*, saying "The federal
  steps only. Ontario's own steps aren't written yet"; the two Alberta futures sit behind one button, *Show the
  2 futures written for Alberta*, and still say "Written for Alberta. You said Ontario." when shown. Outside
  Alberta every job is matched only against the futures written for the person's place, so for a picked job
  the step says "No road is written for Cabinetmakers (72311.00) in Ontario yet." and that the federal steps
  below are written for all of Canada, not for that job, while each folded Alberta card says what it's written
  for; with the job skipped it says the futures are grouped. Typed-in ideas outside Alberta now end on these
  same steps, so none ends on a road not written for its place (190 ideas before). On that road the cockpit's goal bar and *Your plan* say "Future: The
  federal steps for any business in Canada · Ontario's own steps aren't written yet", and each step shows its
  federal sources and the person's own province's, with a line such as "1 source for other provinces isn't
  shown." where it left one out; *Export* lists the same sources with the same line. The rules and tax cards
  are unchanged (they still pick Ontario's and British Columbia's own entries), and so is the list of provinces whose rules the catalogs carry (the maintainer's
  call). *Your destination* now counts the federal road for a place outside Alberta as written for all of Canada,
  apart from the place's own, so it agrees with the card ("1 future listed is written for all of Canada; none is
  written for Yukon yet."). The idea harness and the browser sweep run it for the corpus's 156 business ideas
  outside Alberta, now marked as ideas the federal road is written for; the known gap "the road drawn isn't
  written for the idea's place" on Pick a future went from 190 ideas to 22, mostly because the test's invented
  person now clicks the federal card for those ideas. The 22 left are 13 whose note under *Not here yet?* still
  opens the Alberta road and 9 whose person opens the folded Alberta futures and picks one (both questions for
  the maintainer); the browser sweep now has a ninth fixed idea that picks a folded Alberta future every week.
  The two new screens have clutter budgets of their own, by a written rule: a screen added after
  the 2026-10-17 baseline starts no looser than the screen it stands beside. Nothing DotAmi keeps changes: a
  picked future keeps the road's id, as before.
- **Pick a future asks three things before any road is drawn: what's closest to your work, where you are, and
  which future** ([14l] tasks 28b and 29h, [14g] task 23g; docs/ui-spec/futures/01, 02 and 03). *What's
  closest to your work?* searches the government's example job titles for your own words and lists the jobs that
  hold them, grouped by how many of your words each job's titles hold, in the government's code order inside
  each group, with jobs found only through DotAmi's own word list in a last group of their own; nothing is
  picked until you click a job, and *Skip this question* is always there. In Alberta, *Where you are* then asks
  which area you're in (Calgary, Edmonton, Lethbridge, Red Deer, somewhere else in Alberta, or I don't know), and
  then which of Alberta's eight economic regions, listed as Statistics Canada publishes them: the region is never
  worked out from the area. Outside Alberta that step asks nothing and says why. The futures then list the road
  written for your pick of job first, under its own heading; for a job no road is written for, the step says
  so (*No road is written for Barbers (63210.02) yet.*), holds the place *About this job* fills in its own pull
  request, and lists the general road, saying it isn't written for that job; nothing is saved until you open a
  future. The typed way, *I already have an idea*, now ends on the same three steps on the intake page in place
  of **Open my map** (the maintainer's call 1 of 2026-10-21), so a typed idea is saved on the road the person
  opened. The cockpit's **Pick a job** runs the same search. The words you type are searched on DotAmi's own
  server on your computer and never kept; the job, the area and the region are kept with the idea, each with
  its day, only when you open a future (four new optional columns on the idea, through a migration that adds
  them and changes nothing else), shown on *Your plan*, and deleted with the idea; *What DotAmi knows about you*
  names the area and the region on lines of their own under *Your ideas*. While a search waits, the line under
  the box says *Looking in the government's example titles…*. When every word typed is on
  DotAmi's filler or business-word list (*my own shop*), the step says nothing was searched, under the *Not
  searched* line, and never that no government title holds those words. In Alberta, *About this job* reads the
  answers kept here: it shows the published wage row for the region you picked (Alberta's own row for *I don't
  know* or no answer) and shows your area back; outside Alberta it shows the province's or territory's row as
  before. *Where you are* doesn't yet say you can change your region from *About this job*: that button comes
  later. The idea harness and the browser idea sweep
  find each person's job through the search from their own words (the kind of work, or the job's own name), never
  by its code, and accept the honest "not written yet" ending; the sweep plays the three steps.
- **Quality numbers on every CI run, and a Quality line for the release notes** ([14n], task 32a; the plan's
  S2.5.32, "best results without analytics"). For the people building DotAmi, with no change in the app:
  `npm run quality:report` prints, and writes to `test-results/quality.md`, what the tests already compute,
  counted on 2026-10-22: where each of the 367 invented test ideas ends when typed in (323 on the general road,
  *Starting any business in Alberta*, which any idea can reach; 44 stop before any road is shown; 0 of the 11
  ideas with a road of their own written for them reach it), the ideas shown a road that isn't theirs with
  nothing on screen saying so (37 today; phase 2 aims for 0), how often "What's closest to your work?" lists
  the job an idea expects (in the group it opens for 150 of 220, anywhere in its lists for 172, no job at all
  for 4; the cockpit's older job list, 20), how busy each screen looks at each width from the last browser run,
  source health (each citation by who checked it, sources whose stated next release date has passed, the 5
  citations on government pages that answered "page not found", and, only when a builder asks with `--live`,
  a live run of the quote checker), and how the ideas pass the idea test (140 break none of its rules; the
  other 227 only rules listed as known and not yet fixed). The clutter is counted with the clutter test's own
  rule and the job search with the count its floor test holds, so the report can't print a number the tests
  don't. CI prints it after the tests and after the browser run, and on the run's summary page; no number fails
  anything yet. `npm run quality:line` gives the one Quality line, in plain words, each release adds here;
  a part the run didn't count (the job search, the clutter, the sources, or the live quote check) says so in
  the line. Made on a builder's Windows machine, its clutter part counts with the Windows allowance, so it
  can differ from CI's. Nothing comes from the people using DotAmi, and nothing is sent anywhere.
- **Silent fallbacks now fail the tests** (the maintainer's call 32, 2026-10-22). The idea harness fails when any
  test idea lands on a future not written for it with nothing on screen saying so, even if someone lists it as a
  known gap; today's count is 0, and a planted fault (the save dropping the road the person opened) makes it fail.
  Tests only: nothing a person sees changes.
- **The same idea in every province and territory, and the test ideas reworded** (tasks 37a and 37b, tests only).
  Four test ideas run in all 13 places, each way in: no other province's step, source, cost line, way to
  incorporate or wage row may show, every source, fee and way to incorporate written for the person's own
  province must show, and the federal steps stay the same everywhere. Every test idea is also
  reworded (capitals, lower case, a typo, another word order, emoji, no accents, its city swapped for its
  province, and 14 in French): the province the words name, the job found by the person's own words and the
  roads offered must stay the same, and Lloydminster, on the Alberta–Saskatchewan border, never names one
  province. Each check fails on a planted fault. Three things they found today are listed rather than skipped;
  none has a story yet, and each waits on the maintainer's call: in Alberta, *Hire first employee* on the general road lists Ontario's and
  British Columbia's employment-standards pages as its sources; a misspelt word in the kind of work finds the job
  only by its own name (84 of the 220 test ideas with a job); and "à Regina" in French names no province.
### Fixed
- **Your answer to "Are you buying equipment, a vehicle or tools?" on a future picked on Pick a future is
  kept** (the maintainer's "Yes, fix both", 2026-10-20). Pick a future saves equipment as not said, since it
  never asks it. Answering in the cockpit's one-question box showed the answer for a moment, but left
  equipment on the not-said list: *Not told yet* kept asking, *What you've told DotAmi* didn't list it, and
  the save dropped it, so after a reload it was gone. Now the answer takes equipment off that list (and only
  equipment: the kind of venture and the sales targets are still not said), it is saved and read back, the
  rules and the receipts read it, and *Take back* makes it not said again, as the future was picked
  (`lib/cockpit/told.ts`, `lib/scenarios/not-said.ts`, `lib/roads/without-answer.ts`). Nothing new is kept:
  the answer goes where the same answer on any other idea already goes. The idea harness's "bug" entry for
  it left `tests/fixtures/ideas/known-gaps.ts`.
- **Incorporating can light on a future picked on Pick a future** (the maintainer's "fix both", 2026-10-20;
  designed in [docs/ui-spec/cockpit/incorporating-estimate.md](docs/ui-spec/cockpit/incorporating-estimate.md)).
  The step lights when your own third-year sales estimate reaches your own "I'd incorporate at" number. Pick a
  future never asks for that estimate, and nothing in the cockpit did, so on a picked future the step could
  never light. Now *Not told yet* asks "Your third-year sales estimate" (just before "I'd incorporate at",
  which it opens), and the step's own panel holds that box above the "I'd incorporate at" box, showing your
  number with *Change your number* once given. With both numbers yours the step lights as it does on an
  intake idea. *Take back* puts the future back as it was picked: the rail says *Not said* again and the
  question is asked again. Your typed number is kept where the intake's Year 3 box keeps it; nothing new is
  kept or sent. On an idea from the intake this changes two things too: a Year 3 box left blank there is now
  asked in *Not told yet* as well, and *Change* on "You told us third-year sales of $N" opens this same box in
  the cockpit instead of going back to the intake (the first-year number's *Change* still goes to the intake).
- **A sales number too large to keep is refused where you type it.** The save keeps sales numbers up to
  $1,000,000,000, but the third-year box, the "I'd incorporate at" box and the what-if took any digits: a
  bigger third-year estimate stayed on screen and every later save of that idea failed until it was changed,
  a bigger "I'd incorporate at" was quietly dropped, and a bigger what-if could be tried and then not kept.
  Now each box says "DotAmi keeps numbers up to $1,000,000,000. Write a smaller one." and keeps nothing.
- **Keep on the what-if now counts as told on a picked future** (the maintainer's call, 2026-10-21). Keep made
  the what-if your first-year sales, and the road read it, but the rail and the plan's export still said *Not
  said* for it. Now Keep also marks the first-year target as said: the rail, *Your plan* and the export show
  the kept number, and the third-year target stays *Not said* until you give it. To do this, the one
  "not said" mark both sales targets shared was split into one per year (`lib/scenarios/not-said.ts`); a future
  picked before this change still reads both years as not said. **Futures saved before this change where you
  had already pressed Keep** (the maintainer, 2026-10-22: "if there are any bugs, theey need to be fixed") now
  read right too: the rail, *Your plan*, its export and *Not told yet* show the kept first-year number as told,
  exactly as after a Keep today, and taking it back makes it *Not said* again. This is how what is saved is
  read; nothing in the data file is rewritten (the old mark is replaced only when the idea is next saved).
- **The idea harness's time budget no longer fails a run for being slowed by others** (tests only). Its 60-second
  budget is now held on the run's own CPU time, not the clock on the wall, which under the full parallel test run
  had reached 60.5 and 65.7 seconds for the same work; and a run keeps each step 1 search's answer for its own
  length, so the harness takes about 27 seconds alone on a builder's machine instead of 36.
- **A desktop test that sometimes hung on "Encrypt now"** (tests only). Clicking an answer in the window that asks
  whether to lock the data file closes that window, and the test's click sometimes waited for an
  acknowledgement the closed window never sent. The test now waits for the window to close, which is what the
  answer does; the app was not changed.
- **The quality report counts step 3's own silent fallbacks on their way in** (tests and report only). A road
  written for the job listed after another on step 3 was counted among the ideas but on neither way in.

### Changed
- **No span of time on the front door or Your destination** (the maintainer's pick of 2026-10-20, "Reword
  both"). The first door said "Say where you want to be in a few years, in your own words, …" and now says
  "Say where you want to be, in your own words, …"; Your destination's first question said "In a few years,
  what do you want your work and life to look like?" and now asks "What do you want your work and life to
  look like? Use your own words." The no-times checks had listed both as known gaps for his call; both
  entries are gone, so the words-file scan and the browser sweep now fail if either comes back.

### Documented
- **Official wage ranges are allowed in the design docs; outlook ratings aren't** (the maintainer's call K5,
  answered "B" on 2026-10-16, written down 2026-10-20). A government's own published wage range for a job may
  appear, labelled with its area level (economic region, province-wide figure or small-area estimate), its
  period and its source, as what workers in that job were paid, never as the person's income and never added
  to a cost. CLAUDE.md's numbers rule,
  [docs/architecture/future-cockpit.md](docs/architecture/future-cockpit.md) decision 2, § 12 and § 13 (its
  "typical numbers, before phase 2" question closed; that "phase 2" was the cockpit's own, now called cockpit
  phase 2 (compare futures)), [docs/architecture/research-kit.md](docs/architecture/research-kit.md),
  CONTRIBUTING.md's rule for the official job lists (it had said wages weren't allowed and the question would be
  asked again), the task list's cockpit phase 2 entry and
  [docs/architecture/other-ways-to-build.md](docs/architecture/other-ways-to-build.md)'s out-of-scope list now
  say the same. Docs only: no wage is shown anywhere yet.
- **Phase 2 on the task list** (2026-10-20): [docs/task-list.md](docs/task-list.md) now lists the plan's
  phase 2, every idea ending honestly in Alberta, with each task and its order: matching a person's words
  to the government's job list ([14l]), the research kit's core and *About this job* ([14i]), asking the
  area once ([14g]), the test gate's new endings ([14j]), the data check in CI ([14m]), quality numbers
  and the maintainer's walk ([14n]), the screen review ([14k], [13g]) and the release work ([14o]), with
  the maintainer's twelve calls of 2026-10-20. Corrected on the way: [14f], [14h] and [14i] no longer say
  they wait on calls answered on 2026-10-16; [14j] and [14k] are marked done for phase 1; [14a] is marked
  partly done (shipped in 0.4.0, with what's left listed) instead of in progress; the cockpit's own
  phases are called "cockpit phase 1" to "cockpit phase 4", so the cockpit's phase 2 ([14b], now placed in
  the plan's phase 3, its time strip and hours dropped under "no times") no longer reads as the plan's
  phase 2. Docs only: nothing DotAmi keeps, sends, ships or asks changes.
- **Phase 2's screens, designed before they are built** (task 28g, 2026-10-20): six ui-spec files, each with
  every word, what is new, its regions and controls against the clutter limit, how a screen reader hears it,
  the phone layout and what is not in this version. Pick a future becomes three steps asked before any road
  is drawn, on both ways in: *What's closest to your work?* (the person's own words searched in the
  government's example job titles, grouped by how many of their words each job holds, DotAmi's own word list
  marked as DotAmi's), *Where you are* (in Alberta, which area, then which economic region, never worked out
  for them; outside Alberta nothing is asked yet and the province-wide wage figure is shown), and the road
  written for the picked job or an honest *No road is written for this job yet* with *About this job* in place
  and nothing saved ([docs/ui-spec/futures/](docs/ui-spec/futures/_index.md)); the federal steps for a person
  outside Alberta; *About this job* in the cockpit's right-hand panel
  ([docs/ui-spec/cockpit/about-this-job.md](docs/ui-spec/cockpit/about-this-job.md)); and the *Incorporating*
  fix, asking for the third-year sales estimate on a picked future, with the what-if **Keep** bug fixed in the
  same change ([docs/ui-spec/cockpit/incorporating-estimate.md](docs/ui-spec/cockpit/incorporating-estimate.md)).
  The maintainer's calls on these designs are recorded in each file, dated 2026-10-21. The
  research kit's sketch of *About this job* ([docs/architecture/research-kit.md](docs/architecture/research-kit.md)
  § 4.2) now follows the same picks (no business counts yet, general pages only, no job in any web address).
  Docs only: nothing DotAmi keeps, sends, ships or asks changes yet.

## [0.4.1] — 2026-10-20

A calmer first view of your future. The cockpit opens on the road, your goal and your next three steps, with
everything else folded one click away (Show the legend and Show the what-if bar are in Look closer); the
screens use six text sizes, none smaller than before; every cockpit sentence comes from one words file; and
the desktop app keeps how you left the cockpit from one launch to the next. Six things the idea harness caught
are fixed. For developers, the test gate for any idea: 367 invented ideas, a harness, generated answer sets, a
weekly browser walk, a clutter limit every screen must pass, and `npm run eval:intent`. Package and Actions
updates. No database changes: an installed 0.4.0's data file is used as it is, with no migration to run.

### Added
- **A layout rule, and a clutter limit every screen must stay under** (the maintainer, 2026-10-17: a calm
  first view, enforced by a limit on how busy a screen can get). The rule, in
  [docs/ui-spec/README.md](docs/ui-spec/README.md): one primary thing per screen (on the cockpit, the road);
  new features open in the right-hand panel or the step panel, never as a new region; the first visit shows
  the least; everything folds and is remembered; with a table of where each planned feature lands. The
  limit: a browser test opens ten main screens at phone, tablet and laptop sizes and counts the regions, the
  controls in the first window (a control counts when at least 24 px of it shows), the text sizes and the
  smallest text; it fails when a screen goes over its budget, or shows a header, nav, section or other block
  that isn't marked as a region and sits in none. It runs on a server and data file of its own, so the
  other tests' data doesn't change what it counts. The budgets start at what the screens measure today on CI and can only go down (a unit test
  compares them with the baseline and with main's, so a budget once lowered can't be raised back); the calm
  first view lowers them next. The screens look and work exactly as before (they gained only `data-region` marks the
  test reads).
- **Tests: 367 invented ideas, and a harness every road and screen must pass** (S2.5.29a, b, c and g, the
  plan of 2026-10-17; developers only, nothing in the app changes but how fast road evaluation writes an
  amount: the rules' money formatter is now made once instead of on every call, which the harness needed to
  fit its time). `tests/fixtures/ideas/v1.ts` holds 367
  invented ideas as people would type them, each with a permanent id: every one of the eleven kinds of person
  in the plan, every province and territory, outside Canada and not said, business, career, both and not said,
  every broad job category, every
  kind of work the intake offers, and the odd cases (nothing typed, 2,000 characters, emoji, French, two ideas
  at once, "50k", a city with no province, two provinces, a regulated profession, work the law forbids, "ignore
  your rules", ID-like digits made at run time from one repeated digit). `tests/idea-harness.spec.ts` takes
  each one through the app the way a person's words go today (the keyword parser, the intake, the road it is
  drawn on, road evaluation, *What you've told DotAmi* and *Not told yet*, the receipts, *Compare* and *Your
  plan*), and every idea in Canada through *Pick a future* too (the road written for it, or road 0, road 1 or
  the "Not here yet?" note, all of which the page offers anywhere in Canada), in about 15 seconds. It checks
  that no line those parts of the app write is a verdict, shows $0 for a blank, states an amount that isn't
  an official fee, the person's own or quoted by a citation (`tests/helpers/number-provenance.ts`), or a time
  (official requirements such as "1,360 hours" are listed with their step); that every path ends somewhere
  honest, with every question answered too; that nothing about the person is derived; and that the same idea
  gives the same output. A second test reads every plain sentence in the words files for times. Whole screens
  are read in the browser by the idea sweep (S2.5.29e, below). What it finds today and
  a planned story fixes, or that is a bug for the maintainer, is listed in `tests/fixtures/ideas/known-gaps.ts`
  with its story; the harness fails on anything new and on a listed gap that now passes, so the list only
  shrinks. A new road adds 10 ideas that should reach it, and the corpus test counts them for every road in the
  catalog (`docs/engines/roads.md` rule 13); a new screen does too, checked by the reviewer (CONTRIBUTING.md).
  Each check has a control that plants a failure and must be caught, some planted in the app's own code
  (`tests/idea-invariants.spec.ts`, `tests/idea-harness-plants.spec.ts`).
- **Tests: thousands of generated answer sets, a weekly browser walk of twelve ideas, and a way to score the AI
  parser on your own key** (S2.5.29d, e and f, the plan of 2026-10-17; developers only, nothing in the app
  changes). `tests/idea-properties.spec.ts` lets `fast-check` (a test-only package that ships nowhere) generate
  the answers themselves, on both written roads: every place, kind of venture, work situation and structure,
  the kinds of work, hire-first, equipment, first- and third-year sales with the CRA's $30,000 line and its two
  neighbours, business figures, the what-if, "I'd incorporate at", the map's picks and road 1's fork, skill
  marks, step statuses and ticks, a quote on any named line, savings left blank, at $0 or a number, the income
  wanted and Your date. Each set is run through road evaluation, *Not told yet*, the receipts and *Your plan*
  and held to the harness's invariants through the same code, plus what only a generated space can show:
  taking an answer back gives the run before it, word for word; a quote never raises the count of lines not
  priced; a blank is never $0 and a $0 of the person's own is never a blank; the same input gives the same
  output; road evaluation's own sweep of what-ifs names exactly the answers a step's colour depends on; the
  line is exceeded, never reached; and the person's own figures, once they settle the CRA's test, decide it
  whatever the estimate says (most generated figures are calendar months and quarters the GST read counts, and
  the spec counts the runs where the figures decided: a count of 0 fails, with a control that breaks the
  figures' shape and sees it fail). A fixed seed in CI, `IDEA_PROPERTIES_SEED=random` for new cases locally,
  and a failure prints the seed and the smallest counterexample; `tests/idea-properties-plants.spec.ts` breaks
  the product on purpose and sees the property fail. `e2e/idea-sweep.spec.ts` takes eight fixed ideas and four
  that rotate by the week of the year (the same four for a week on every machine) from the front door to *Your
  plan* in the browser, typed and picked, and reads every screen as it opens for verdict words, time words
  and the clutter measurer, now in `e2e/clutter-measure.ts` and shared with the clutter limit. `npm run
  eval:intent` runs every corpus idea through the AI parser on the developer's own key (never in CI, not in
  `npm test`; it refuses without a key and sends nothing anywhere but the model API), scores the answers
  against what each idea's words name, and writes `test-results/intent-eval.md` with ids only.

### Changed
- **Six text sizes instead of twenty-three** (S2.5.30d, the plan of 2026-10-17). The screens had grown
  twenty-three ad hoc text sizes, from 8 px to 46 px with half-pixel neighbours among them, in 661 places;
  one screen drew fifteen distinct sizes. They are now six named sizes, theme tokens in
  [app/globals.css](app/globals.css) ([docs/ui-spec/README.md](docs/ui-spec/README.md), *The type scale*):
  label 9.5 px, small 10.5, body 13, lead 15, title 19 and display 28, each with its line height, with
  Tailwind's larger steps kept for headlines. Each old size went to the named size of its group, and each
  named size is the largest of its group, so no text is smaller than it was: the default running text
  (`app/layout.tsx` and the two journey layouts) stays 13 px, the smallest text on any screen is now 9.5 px
  (it was 8.5 px on the cockpit and the intake), and the map's card lines and most running text are 13 px
  where they were 11 or 12 (text-xs), headings 15 px where they were 14 (text-sm). Measured in Chromium,
  every piece of text drawn on nine main screens at laptop size, against main: none of it smaller (the site
  footer's side padding on a phone went from 32 to 16 px so its line, now 13 px, stays on two lines). Every
  screen counts fewer distinct
  sizes: the cockpit
  on a laptop 12 to 5, the front door 8 to 6, Mara's example 13 to 5, *What DotAmi knows about you* 11 to 7,
  *Your plan* 10 to 5 (`e2e/budgets.ts` holds the new, lower limits; regions and controls keep their
  budgets). A unit test refuses any new arbitrary size, and Tailwind's text-xs, text-sm, text-base
  and text-lg, which the named sizes stand in for. The map's and the cost panels' recordings are read with
  the new names put in for the old classes, so they are not re-recorded. Screenshots before and after, the
  cockpit on road 0 and the front door at phone, tablet and laptop sizes, are in
  [docs/media/type-scale/](docs/media/type-scale/).
- **Every cockpit sentence in one words file** (S2.5.30e, the same plan). The cockpit's rail (*Venture*,
  *Structure* and its options, *Employed*, *In your words*, the structure ladder, the prep-tool references,
  **Save now** and its save line, **Edit venture profile**, the *Compass, not GPS* line), the header's
  **← Your futures** and **Export**, the empty cockpit and the map's chips, card names and legend, 68 pieces of
  text that were written in five components, now come from [lib/cockpit/words.ts](lib/cockpit/words.ts),
  which the words tests read (verdict words, time words). The text on screen is unchanged. A unit test reads
  every file in `components/cockpit/` and fails on a sentence or label written there, with one allowance it
  explains: the legend's *Compass, not GPS — nothing here is a recommendation*, which the strict verdict-word
  list refuses even as a denial and the map's recordings hold word for word.
- **Show the legend and Show the what-if bar are in the goal bar's Look closer menu** (the maintainer's pick,
  2026-10-20). With the larger text, the two buttons at the end of *Next on your road* were pushed under the
  window's edge on Mara's example at laptop size; brought back into view, they took that screen to 23 controls
  against its limit of 21, and the limits only go down. They are now items of *Look closer*, listed while each
  is folded, so each road's first view on a tablet or a laptop has fewer controls (on a phone the buttons were
  already under the window's edge), and `e2e/budgets.ts` holds the lower limits (Mara's example 23 on a tablet;
  the cockpit on road 0 17, 29 and 27 on a phone, a tablet and a laptop, on road 1 25 and 23 on a tablet and a
  laptop). Showing either now takes two steps, *Look closer* and then the item. The folded goal bar's one line
  carries the menu too, with all its items, and folding either again puts keyboard focus back on *Look closer*
  without scrolling the page. *Next on your road* still says *Your what-if, not a forecast* and its number
  while the what-if bar is folded and a what-if is on.
- **A calm first view of your future: the road first, everything else one click away** (S2.5.30c, the
  maintainer's pick of 2026-10-17, after *"there's a LOT on the screen"*; the designed first visit of
  [docs/architecture/future-cockpit.md](docs/architecture/future-cockpit.md) § 2). A first visit to the cockpit
  now shows the road, your goal and its gauges, and your next three steps, with one tip line (*Start
  anywhere…*, put away with *Got it*, which leaves keyboard focus on the road; on a phone the line sits under
  the road, so the road starts where it did before). Folded, each with one button that says what it shows: the venture
  details rail, the map's legend, the what-if bar, the road's later columns (one column, *The road ahead · 6
  steps*, naming them); the legend's and the what-if bar's buttons are items of *Look closer* since the entry
  above. Only Road and Skills are on at first (Rules & tax started on until now); the Money and
  Rules & tax switches are drawn beside them, one click away (a switch with nothing on the road, such as
  *Rules & tax · 0 cards* on the apprentice road, is drawn off and can't be pressed). The goal bar's *Compare* and *Others in this line of work*
  are one **Look closer** menu, which *About this job* will join; it works from the keyboard and reads as a
  menu to a screen reader. Nothing was removed. A return visit opens the way you left it, including the
  layers you last had on, remembered in this browser only (in the desktop app too, the next line). A browser
  that kept its folds before this change opens as a return visit too: Rules & tax on as before, and no tip. Mara's
  example opens the same calm way, banner unchanged. The clutter limit for the cockpit's first visit is
  lowered to what it now measures: 8 regions from 768 px and 7 on a phone, one fewer than before (see the
  pull request; [e2e/budgets.ts](e2e/budgets.ts)).
- **The desktop app uses the same local address on every launch**, one worked out from its data folder
  ([desktop/app-port.mjs](desktop/app-port.mjs)), and another only when that one is taken. Until now every
  launch had a new address, so the window's browser storage started empty each time: the cockpit opened as
  a first visit with its tip back, and the intake's list of job descriptions you typed was never offered
  again. Now that list is offered back at every launch; Delete doesn't reach it, and *What DotAmi knows about
  you* and the Delete menu now say so and how to remove it (close DotAmi and delete the “Local Storage” folder
  in the data folder).
- **Package updates** (#185, 2026-10-20): the desktop app moves to Electron 44.8.0 (from 44.7.0: Chromium
  152.0.7977.167 and Node 24.22.0, with fixes Electron copied from Chromium and V8, by its
  [release notes](https://github.com/electron/electron/releases/tag/v44.8.0), read 2026-10-20); Next.js
  15.5.28, React and React DOM 19.3.1, and the intake parser's model client `@anthropic-ai/sdk` 0.135.0,
  which brings in `@opentelemetry/api` 1.9.1 (see the privacy log); and, for developers, Playwright
  1.64.1, Vitest 4.1.12 and eslint-config-next 15.5.28. The CodeQL and Scorecard workflows use
  `github/codeql-action` 4.39.0 (#186).
### Fixed
- **Six things the idea harness caught** (2026-10-17; each was a "bug" entry in
  `tests/fixtures/ideas/known-gaps.ts`, now gone, so the harness fails if one comes back):
  - *Not told yet* asks "The yearly sales at which you'd incorporate" only where some answer changes the
    road: once the idea has a third-year sales estimate, the number the rule compares it with, and while
    Incorporation timing holds "Incorporating" (with Liability / SR&ED picked the step is off the path
    whatever the number). Its line now says what the number is compared with ("“Incorporating” lighting
    once your third-year sales estimate reaches your own number"). Before, it was asked with the estimate
    blank or the other side picked, and every answer gave "Saved. Nothing on the road changed."
    (`lib/cockpit/told.ts`). This is not a way to light the step where there is no estimate: on a future
    picked on road 0 nothing keeps or asks one, so the step can't light there; the step's own panel still
    takes the number, and its card and panel now say so: with neither number, "this lights once your
    third-year revenue estimate reaches a number of your own, and there's no third-year revenue estimate on
    this idea" instead of "set your own number to see this light" (`lib/brain/evaluate.ts`). Giving a
    third-year estimate in the cockpit is listed for the maintainer in `docs/task-list.md`.
  - *Not told yet* no longer asks a road 0 map pick that no rule reads for the idea: worked out from the
    road, when picking the other side changes nothing. Today that is GST timing for ride-share and taxi
    driving, registered from the first paid ride either way.
  - The keyword parser (used without an AI key) proposes a province only when the words name one place in
    Canada: a Canadian city's name doesn't count when a place outside Canada is named right after it
    ("Surrey, England", "Brandon, Florida"), none when the person is moving out of Canada ("moving … to
    Portland, Oregon"), none when two provinces are named (the person picks), never by the order the
    provinces are listed in, and a city that is also a first name (Victoria, Regina, Brandon, Hamilton) only
    after "in", "from", "to"… or beside its province (`lib/journey/intent-fallback.ts`). A place outside
    Canada named anywhere else changes nothing: "Calgary … customers in the United States" is still Alberta,
    and a move's destination is its own first "to": "moving to Calgary to open a store that ships to the
    USA" is Alberta.
  - It proposes a kind of work only when the words say it is the person's own: a workshop or barber shop is
    not retail, nor is "I work retail"; an app, website, game or program the person uses is not software;
    the "ai" of the French "J'ai", or an AI assistant the person codes with, is not an AI business; the
    customers' trade ("an app for HVAC outfits", "software to clinics"), an IT contractor or a painter of
    pictures is not the trades; real estate photography is not real estate; Instagram deposits don't make a
    creator; an AI tutor app is not tutoring.
  - It proposes "Equipment / vehicle purchase on the path" only when the words say the person is buying,
    leasing, getting, needs or wants to write off equipment, a vehicle or tools ("buying a used truck", "I
    need to buy a brand new delivery van", "I want to get a truck", "I want to write off my PC"), not from a
    vehicle or tool only named ("trucker", "my own car", "machine learning"), words that rule a purchase out
    ("I don't need any equipment", "no need to buy a vehicle"), one the person has ("I need my car to get to
    clients"), one the customers need or need work on ("people who need a van", "contractors need trucks
    detailed"), a service on other people's ("I replace computers for small offices", "I upgrade gaming PCs
    for customers") or a part of one ("I replace car windshields"). The AI parser's own instruction says
    the same (`app/api/intent/parse/route.ts`).
  - Road 1's first step no longer says how long a period is designed to take: its summary ends at "4 periods
    (levels)." The official page's words stay quoted in its source.

## [0.4.0] — 2026-10-17

The future cockpit's first phase. The front door has three doors: Start from where I want to be (then Pick
a future), I already have an idea, and Show me an example first (Mara, invented, with real sourced
prices and statistics). The cockpit shows your goal, a road with steps, skills and costs, and what you've told
DotAmi; Export opens your plan to read and print. Also: a records step on every business road, the Red
Seal fee priced and the other fee blanks explained (the fee to register a business name stays blank,
with its reason), and Businesses you're watching.

### Added
- **Others in this line of work: keep a list of businesses you're watching** (the maintainer, 2026-10-17:
  *"yah, this is fine. Lets do it"*) — a new panel in the cockpit, opened from the goal bar on every road and
  from *Open your own shop* on the apprentice road. It says plainly what their ads cost: *"Meta and Google
  don't publish this for ordinary ads in Canada, as their pages read on 15 October 2026. DotAmi has no number
  for it."*, with the pages it was read from and plain links to Meta's Ad Library and Google's Ads
  Transparency Center (links only: DotAmi fetches nothing). Under it, **Businesses you're watching · in the
  order you added them**: add a business under the name you'd write it, with a link, your note and the links
  to ads you saw, each with the day you saw it (the day starts on today; change it); edit or remove one. Only
  `http://` and `https://` links are kept, checked on screen, by the server and again when read back. *"DotAmi
  doesn't check these. They stay on this computer and no rule reads them."* The list is never counted against
  anything and never quotes a business's own words. It is kept per idea in the data file and deleted with the
  idea; *What DotAmi knows about you* lists it, says it can name another person (an owner), and has a Delete
  box for it. In the invented example it stays empty and says why. Not in this version: official counts,
  the area and industry questions, *Where to look*, or named businesses from anywhere but you
  ([docs/ui-spec/cockpit/landscape.md](docs/ui-spec/cockpit/landscape.md),
  [docs/architecture/competitive-landscape.md](docs/architecture/competitive-landscape.md) § 6.2).
- **Show me an example first: Mara, an invented example future** (the maintainer's pick of 2026-10-13) —
  the front door's third door now opens a filled-in future for an invented person: Mara, an apprentice
  cabinetmaker in Alberta, on *From apprentice to your own shop (Alberta)*. It is the same cockpit anyone
  gets for their own future, drawn from her answers through the same rules: her words (*"My own small
  furniture shop, four-day weeks, home for supper."*), nine skills marked, her pick of *Open your own
  shop* and one step done. **Mara is invented; her numbers are real** (the maintainer, 2026-10-14: real,
  cited numbers where they exist, as in depth as possible, with the sources shown): her start-up cost for
  *Woodworking machines and tools* is $14,993.62, 12 of the tools the trade's official descriptions name,
  picked for this example (the Alberta cabinetmaker curriculum, the Red Seal standard, the national job
  classification; they name more, and the panel lists the ones not priced), one of
  each at its average of 3 to 5 prices listed by Canadian sellers on 2026-10-14; her yearly income goal is
  $52,255, what employed cabinetmakers in Alberta average a year (Government of Alberta, 2023). She has
  no what-if (the maintainer's pick A, 2026-10-15): the what-if bar starts empty, and you can try a number
  of your own, kept nowhere as everywhere. The average yearly revenue of small furniture makers in Canada,
  $610,300 (Government of Canada, 2024), is shown only for context in the panel below, said to be an
  industry average over existing businesses of every age, *not a first-year figure* and not one of
  Mara's numbers. Her savings and a
  shop deposit stay blank, *not priced yet*: nothing real can supply them. The banner says *"Mara is
  invented; the prices and statistics are real, from the sources listed, seen on 2026-10-14. Nothing here
  is saved."*, and its **Where these numbers come from** lists every number, how it was worked out (every
  average is worked out by the app from the listed prices, never typed), every price and statistic with
  its link and the day it was seen, software listed for this example (design, cut lists, bookkeeping) with
  each plan's listed price and an average of the plans billed month to month (a plan billed once a year is
  listed apart), market rents with the costs on top and the gross rent where the report gives them, and
  what stayed blank and why. It says Mara and her answers are invented and every price and statistic is
  real. The tools are information, a pick with what sellers charge: never ranked, never "buy this". A
  test checks that her two numbers and the context figure are worked out in her file, never typed. A
  short list, *What Mara
  did*, shows what each of her answers changed, worked out by the rules (on today's road: 17 steps, 30
  cost lines still to price; the design's early sketch said 22 and 4). Her answers are labelled hers, not
  yours: *Mara's target …*, *Mara's numbers*, *Mara's marks*, *What Mara told DotAmi*; and the banner
  says once that "you" in the receipts means Mara. Nothing is saved from it: every button that would keep
  something is greyed out and says *"This is an example. Start your own to keep anything."*, or says so
  when clicked, and the page reads none of your own data and writes nothing to the browser either (a
  browser test checks the data file, both kinds of browser storage and every request).
- **Keep your records from day one: a step on every business road** (2026-10-14) — a business must keep
  its records from the start, and records missed early are hard to put back together. The step's four *done
  when* lines come from the CRA's own *Keeping records* pages: the law asks anyone carrying on a business
  to keep records, and what counts as one; what the CRA says happens without them (expenses and input tax
  credits forgotten at tax time, other methods used in an audit, claims disallowed); how they must be
  kept, electronic records and backups included; and where and for how long (at your place of business or
  residence in Canada, generally six years from the end of the last tax year they relate to; records kept
  outside Canada and opened from Canada don't count as kept in Canada; and the CRA lists other periods,
  among them indefinitely for records about long-term property and six years from the filing date for a
  late return). Every
  source was checked by the quote tool that day; none is claimed as read. On *Starting any business in
  Alberta* it is a fourth step in the first column, before *Sole Prop activation*, and on your path for
  every idea; on *From apprentice to your own shop* it is first in *Open the doors*, on your path once
  you pick your own shop and off it if you stay employed. No cost line, no amount; written once
  (`lib/engines/roads/v2026/keep-records.ts`), each road with its own permanent ids.
- **Your plan: a page to read and print, from the cockpit's Export** (part of #41: the Export panel itself
  still shows the raw markdown) — **Open your plan to
  read or print** in the Export panel opens `/plan?venture=<id>`: one idea's plan laid out for a partner,
  an accountant or a lawyer, with **Print** (the computer's own print window, which also saves a PDF).
  In order: your words, word for word and dated (your newest answer to *where do you want to be* marked
  as not tied to one idea), and the yearly income you agreed to; the future, who
  picked it, the ending at each fork and the four gauges; every step of the road, column by column, on
  your path or not, with your status, its state and the reason, its *done when* lines ticked or not, the
  skills it needs with your marks, and its sources with how each was checked; the road's skills and legal
  requirements, by name, each with your mark or *not marked*, and your own skills (for your pick of job,
  only the items you marked, with the licence's line); start-up money in
  three kinds, an official fee with its source and the day it was read or checked by a tool, your agreed
  quote as yours with its day and where it came from, and a line not priced yet with no amount, never
  $0; *What you've told DotAmi*, row for row as the cockpit lists it; and the line that DotAmi is not
  legal or tax advice but a preparation tool for your accountant and lawyer, at the end and in the heading,
  so the first page carries it too. On paper the buttons and the app's footer are gone from this page
  (every other page still prints the footer's not-advice line), it prints black on white, each section
  starts a new page and every link prints as its address. If the data file can't be read just now, the
  page says so and that nothing was changed, never that the idea doesn't exist. Made only from what DotAmi
  keeps, by the cockpit's own functions (`lib/cockpit/plan.ts`); it keeps nothing and sends nothing.
  Printing from the desktop app hasn't been tried yet. **Copy markdown** and **Save as .md** stay as they were. Words:
  `lib/cockpit/words.ts` (`plan`); design: `docs/ui-spec/plan/_index.md`.
- **The front door leads with the dream: three doors, *Your destination* and *Pick a future*** ([14a];
  the maintainer's decision 6 of 2026-10-11) — the front page now reads *"See the road to the work and
  life you want."* with three doors: **Start from where I want to be**, **I already have an idea** (today's
  box, *Map it* and its chips, unchanged) and **Show me an example first**, which says plainly that the
  invented example isn't written yet and links nowhere. *Your destination* (`/start`) asks four
  questions, one at a time, each with a one-line receipt worked out from the answer and the catalogs:
  where you want to be in your own words (kept at once, word for word and dated, as your destination),
  a business, a job or career, or both (a count of the futures listed that include it; nothing is
  filtered), your province or territory (whose rules apply and how many futures listed are written for
  it), and the yearly income you want (counted only once you agree to it in its own agree prompt). Each
  receipt says what is true when it is shown: "I don't know yet" or "Skip" says when an earlier answer
  is still kept, and turning the income down says it stays in the data file, marked turned down. What
  the data file already holds (your newest words, the income you agreed to) counts as answered, so
  coming back in a new tab you are asked only the place and business / career / both. Focus moves to the
  next question after each answer. The questions are data (`lib/front-door/questions.ts`), so the later
  step-by-step questionnaire starts from them. *Pick a future* (`/futures`) lists two futures, *Starting any
  business in Alberta* and *From apprentice to your own shop (Alberta)*, as counts (steps, skills
  listed, official fees found, cost lines you'd price) and how their sources were checked. The second's
  sources were all checked by a tool and not read by a person yet, and its card says so in amber; the
  maintainer decided on 2026-10-13 that such a road may be listed. **Look inside**
  saves a new idea on that road, with your place and your business / career / both answer, and opens the
  cockpit on it. *Not here yet?* keeps a note in your words and opens the general road. The cockpit's
  goal bar shows your destination on an idea with no sentence of its own. Words:
  `lib/front-door/words.ts`.
- **Every region of the cockpit folds, and the cockpit works at phone width** (closes #4) — the
  venture details on the left, the goal bar with its four gauges, the right-hand panel and the map's
  legend each fold and open again with a button that says what it does (*Fold venture details*, *Show
  goal and gauges*, *Show the panel: Sole Prop activation*…), and *Fold all panels* in the header folds
  all four. A folded region keeps its button where it was and hides nothing for good; the goal bar folds
  to one line that still holds the four gauges. The answers are remembered in this browser
  (`localStorage`, `dotami-cockpit-folds`). With everything folded at 1280x720, every card on the road
  fits in the window once the road is scrolled to it, in a road area at least 400 px tall (296 px with
  everything open). Below 768 px the page never scrolls sideways: the road scrolls sideways in its own
  area one column at a time, the venture details and the right-hand panel open as full-width sheets, and
  the legend sits under the road instead of squeezing it to 20 px; from 768 to 1024 px the panel opens as
  a drawer under the header, over the road. Folding moves focus to the button that now stands for the
  region; on a phone a sheet takes the keyboard (focus inside, Tab stays in it, Escape closes it, focus
  goes back to what opened it), and the folded panel's bar never covers the page's last line. Design: [docs/architecture/future-cockpit.md § 2, "Folding and phone
  width"](docs/architecture/future-cockpit.md); controls:
  [docs/ui-spec/cockpit/12-folding-and-phone.md](docs/ui-spec/cockpit/12-folding-and-phone.md); tests:
  `e2e/cockpit-fit.spec.ts`, `tests/cockpit-folds.spec.ts`.
- **The cockpit's part 2 panels fold too** — *What you've told DotAmi / Not told yet* folds with the
  venture details it sits at the top of, and *Compare the two endings* with the right-hand panel (its
  strip says *Show the panel: Compare the two endings*). The what-if bar and *This visit* under the map
  are a fifth region: *Fold the what-if bar* folds them to one line, which still says *Your what-if, not
  a forecast* and its number while a what-if is on; *Fold all panels* folds it with the rest, and the
  answer is remembered with the other four (`whatIf`). Controls:
  [docs/ui-spec/cockpit/12-folding-and-phone.md](docs/ui-spec/cockpit/12-folding-and-phone.md).
- **One list of official fees, and the start-up costs you price yourself on today's Alberta road**
  ([14a]) — every official fee DotAmi shows is now written once, in
  [`lib/engines/fees/v2026/`](lib/engines/fees/v2026/official-fees.ts) ([docs/engines/fees.md](docs/engines/fees.md)):
  its amount in cents, what it is for, the place it applies to as a code (`CA`, `CA-AB`) and its source.
  Ten fees moved there: the federal online incorporation ($200), express service ($100) and annual
  return ($12), and the first written future's seven (the apprenticeship, Trades Qualifier and Blue
  Seal application fees, the Cabinetmaker practical exam, the rewrite fee that applies only if you fail
  an exam, and the $0 business number). Each quote was found again on its live page by
  `scripts/check-quotes.mjs` on 2026-10-12. The roads and the federal way to incorporate name a fee by
  id and copy its amount; a check refuses any line whose amount, source or condition differs from its
  fee, and a test refuses an amount typed in a road file. No card changed: every step panel of both
  roads and both money lists draw the same HTML, byte for byte, as before the move
  (`tests/cost-panels-unchanged.spec.ts`). Alberta's registry fees stay named blanks: the catalogue
  that holds them stops tools with a human check. **Sole Prop activation** now names seven start-up
  costs as blanks the person prices: tools and equipment, space deposit, insurance, vehicle, first
  materials, software, and money to live on while starting; no amount anywhere, and no source for the
  names yet (the BDC and Futurpreneur templates keep their lines inside spreadsheets;
  [future-cockpit.md § 6 and § 13](docs/architecture/future-cockpit.md)). In the cockpit, the Money
  overlay's badge on that card says *7 not priced*, and the Start-up money gauge counts them while the
  step is on your path.
- **Pick the job closest to your work, and see the government's skills list for it** ([14a]) — in the
  cockpit's Skills list, an optional search over the 900 jobs of the government's *Occupational and
  Skills Information System* (OaSIS 2025 Version 1.0, Employment and Social Development Canada, under the
  Open Government Licence – Canada); once picked, that job's skills and knowledge areas, every item
  tagged *your pick of job*, with **Have / Learning / Not yet / I don't know** on each, the dataset's page
  as its source (checked by a tool), the line *This is the government's list for the job you picked.
  DotAmi doesn't say which skills a business needs.*, and the licence's attribution line, shown while
  searching too. The search matches every word typed, each anywhere in the job's name or at the start of
  its code, shows ten at most in the dataset's order and says when more match (*Showing 10 of 56 jobs
  that match.*). Names only: the government's ratings are kept in the data
  and not shown while the maintainer decides (item 20). The Skills gauge counts the list apart (*your
  pick of job: 1 have · 0 learning · 0 not yet, of 44 listed*), and the step panel counts it and opens it
  without tying it to a step. The pick is kept on the idea (two added columns), set and taken back
  through `POST /api/futures/<id>/job`, from DotAmi's own window only. The list is built by
  `node scripts/import-oasis.mjs` from four files committed as downloaded (`data/oasis-2025-v1.0/`),
  a test redoes the import on every run, and the script's `--download` writes a fetched file only when
  its SHA-256 is the one pinned for it
  ([`lib/engines/oasis/v2026/`](lib/engines/oasis/v2026/),
  [design § 6](docs/architecture/future-cockpit.md)). The third-party notices and `/licences` list it
  under *Data*.
- **Today's road lists its one legal requirement** — *Mandatory GST registration* needs *A GST/HST
  registration with the Canada Revenue Agency*, carrying the compliance catalog's own source for it
  (`compliance-gst-small-supplier`), so the Skills gauge on today's road now counts one item.
- **Today's road, *Starting any business in Alberta*, says when each step is done** ([14a]) — 47
  *done when* lines ([`lib/engines/roads/v2026/starting-any-business-ab.ts`](lib/engines/roads/v2026/starting-any-business-ab.ts)):
  three or four on each of the map's ten steps (the tax-return lines for job and business income;
  records, the T1 return and instalments for a sole proprietor; the CRA's two small-supplier tests
  (with what doesn't count: financial services, capital property, goodwill), the 29 days to register
  and what a voluntary registrant has to do; articles of incorporation, the yearly T2 return, a
  personal guarantee as one place limited liability stops and a director's liability for amounts the
  corporation failed to remit; what a CCPC is and how associated corporations share the business
  limit; a first employee's status, SIN and TD1 forms, the payroll account's deadline and
  WCB-Alberta's 15 days; T5 slips with the T5 Guide's exceptions, and eligible dividends; Form T661
  and the SR&ED reporting deadline), and three new *before you open* steps in the first column, each
  leading to *Sole Prop activation*: **Register your business name, if you use one** (Alberta's trade
  name or partnership, the name rules, the optional Business Name Report, the forms, proof of
  filing), **Look up your permits and licences (BizPaL)** (the free government finder, which says its
  own list isn't complete, and city hall where a municipality isn't on it) and **A separate bank
  account for the business, if it has a name other than yours** (the CRA's words: a business with a
  name other than your own needs one for cheques payable to it). Every line is written from an
  official page (the CRA, alberta.ca, Corporations Canada, WCB-Alberta, BizPaL), keeps the conditions
  and exceptions its page attaches, and every number in it is in its own quotes; every new source is
  a tool check made on 2026-10-12 (55 citations, 117 quotes (108 different) on 22 pages, found word
  for word on their live pages), none recorded as read.
  No amount is written: Alberta's registry fees, permit fees and bank fees are named lines the person
  prices. On the map, Tier 1 shows the three new cards. In the cockpit, road evaluation puts them on
  the road, so each is coloured "applies as answered" and a click opens its step panel, with its
  *done when* lines, like any other step. A map drawn without road evaluation, where no rule colours
  them, says **no rule yet** and claims no colour (grey would say "doesn't apply as answered", which
  no rule decided) and no place on the path; a click there selects the card and keeps its arrows.
  Hovering the baseline dims the three new cards, since its own arrows were left alone. Everything
  else on the map is unchanged: with the three cards cut out, the HTML of six saved states is byte for
  byte what it was.
  While writing them, four of the map stages' own sources were found answering "page not found"
  (the CRA's Employees page, the line 4600 page and two SR&ED pages); their lines cite the current
  pages, and the stages' sources are left for the maintainer.
- **The first written future, *From apprentice to your own shop (Alberta)*, is in the catalog**
  ([14a]) — a second road ([`lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts`](lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts)):
  a Cabinetmaker's three ways to the certificate side by side (an apprenticeship, or the Trades
  Qualifier on work experience or with a certificate from outside Alberta), the certificate, the
  optional Red Seal and Blue Seal, the fork between staying employed and opening your own shop, then
  registering the business name, the business number, permits and the municipal licence, GST/HST's
  small-supplier test, the first hire (WCB-Alberta and a CRA payroll account) and sponsoring an
  apprentice; after that it joins today's road at *Incorporating* (someone who chooses a corporation
  when opening the shop is pointed there). 16 steps and 61 *done when* lines, each cited, and every
  number a line states is in that line's own quotes. Official fees appear only where a page states
  them (the $150 apprenticeship application, the $450 and $150 Trades Qualifier applications, the
  $160.00 practical exam, the $50 rewrite after a failed exam, the $150.00 Blue Seal application, and
  the business number at no cost); everything else is a named line the person prices (tools, shop
  space deposit, insurance, vehicle, first materials, software, money to live on while starting).
  Alberta's registry fees stay named lines: the catalogue that holds them stops tools with a human
  check. Every source is a tool check made on 2026-10-12 (195 quotes on 28 pages, found word for word
  on their live pages); none is recorded as read, so every card will say "Checked by a tool" in amber.
  *Pick a future* lists it (see the front-door entry). New checks: an official fee checked only by a tool must quote its own
  amount, and not as one end of a range; a fee that applies only sometimes (the $50 rewrite) carries
  its condition in a typed `onlyIf`, so a total can leave it out, and a label saying "only if" without
  one is refused; a road none of whose sources has been read carries no read date; and a road's join
  must name a real road and column.
- **A road type any future can use** ([14a]) — a business or a career can now be written as a *road*:
  columns of steps, each cited, with the steps each one leads to, forks between two steps, *done when*
  lines, skill items, and cost lines of three kinds (an official fee with its source and the day it was
  read, the person's own agreed quote, or a named line not priced yet, which never counts as $0)
  ([`lib/engines/roads/v2026/`](lib/engines/roads/v2026/), [docs/engines/roads.md](docs/engines/roads.md)).
  Checks refuse a road with an uncited step or line, a source read on a day that hasn't come yet, an
  official link that isn't an https page, a repeated id, a step in no column, an arrow or fork to a step
  that isn't there, or a fee that isn't a whole number of cents, and the list of shipped ids (down to
  each *done when* line, cost line and skill item) can't shrink. A quote that isn't a whole,
  non-negative number of cents shows as not priced, never as a number. Today's ten-step map is the first road, *Starting any business in Alberta (tax and
  structure)*, with the same steps, ids, sources and toggles, and the map now draws whatever road it is
  given. Nothing on the map looks or behaves differently: a test compares the map's HTML with what it
  drew before, in six saved states, and a browser test checks its columns, cards, toggles and arrows.
- **Storage for what you tell the future cockpit** ([14a]) — the data file can now keep your mark on each
  skill (have, learning, not yet; kept once for you, so it carries across every road), your progress on
  each step of a future's road (doing, done, not for me, the *done when* lines you ticked, and when you
  changed it), the road a future is drawn on, the ending you picked at a fork and your own month and
  year, your answer to "where do you want to be" as one of your dated statements, the yearly income you
  want (kept once for you, agreed like a figure), and two new kinds of figure, each one day's amount and
  never negative: savings you'd put toward starting, and your own number for a named start-up cost line
  with where it came from (a quote, a link, a receipt or your guess). Everything is kept against the
  road's permanent ids, so rewriting a screen or moving a step never loses your progress. No screen
  writes any of it yet: the cockpit's screens come next ([`lib/futures/`](lib/futures/),
  [docs/architecture/future-cockpit.md § 7](docs/architecture/future-cockpit.md)). *What DotAmi knows
  about you* counts the three new tables, and Delete gains **Your skill marks** and **The yearly income
  you said you want**; step progress goes with your ideas. The migration only adds columns and tables,
  and a test checks a row in every table survives it. Each answer kept on a future has its date; on
  today's Alberta road a step's status stays with the map, so one step can't say two things; agreeing
  to a new number for the same cost line (or a new savings number) takes back the old one; and the same
  skill of your own typed with other capital letters is one mark.
- **Places stored as international codes** ([14a]) — the data file now writes each idea's province as
  its code (`CA-AB` for Alberta), the maintainer's decision of 2026-10-11. A second hand-written
  migration rewrites the ideas already saved with one `UPDATE`, and a test checks every other value of
  every row survives it; screens, exports and replies still say `AB`, and the catalogs' own keys move
  later ([`lib/places/codes.ts`](lib/places/codes.ts)).
- **Road evaluation and receipts** — one pure function turns a road and everything you told DotAmi
  (your idea's answers and the map's picks, the ending you picked, your skill marks, your progress, the
  numbers you agreed to, your own month, and a what-if) into each step's state — applies, check first,
  or not on your path — with the reason in your own answers, and the four gauges as counts and sums:
  steps done, skills by your mark (unmarked ones counted on their own), official fees plus your own
  numbers with the lines not priced yet counted rather than added as $0, your savings minus those only
  when both exist, and months to your own date only when you set one. On today's Alberta road the colours
  are the map's, and each names the answers it depends on, found by running the rules again with each
  answer changed. A second function compares two results and writes one line per change: *"Because you
  told us you have “Read drawings”, 1 step now has every skill it lists marked have."* Every line is built
  from catalog words, your values and counts, never by a model; a test fails on *enough*, *ready*,
  *best*, *should*, *recommended* or a step that "needs nothing more". Answers you took back are counted
  as taken back, and a default you haven't set (a map pick you haven't clicked, an unanswered question)
  is worded as a default, never as something you told us. Road 0's steps carry no status of yours: the
  map's done, active and set-aside lists are worked out from its toggles, not set by you. A what-if
  relights the rules for one run, is never kept as a figure, and the rules and tax cards it lights call
  it your what-if, never your target. No screen shows it yet; nothing new is kept or sent ([`lib/roads/`](lib/roads/),
  [docs/architecture/future-cockpit.md § 6](docs/architecture/future-cockpit.md)). The map's hover
  arrows now walk the road through the same code, and draw exactly as before.
- **The cockpit screen, part 1** ([14a]) — the cockpit for a saved idea now shows, from one run of road
  evaluation: a **goal bar** with the sentence you typed for the idea, word for word with its day, your
  yearly target only if you agreed to one (labelled yours), the future's name (or, on a road not written
  for the idea's province, which map is drawn), and four **gauges** as counts and sums (steps marked done
  and the next step; skills by your mark; official fees and your own numbers, each with its count of lines
  and never a $0 for a part with none, lines not priced yet, your savings and, only when both exist, the
  plain difference; months to your own date, only when you set one); a second press on a gauge closes what
  it opened; **overlay switches** over the map (Road always on; Skills puts *needs 3 · you have 2* on each
  step, Money its priced sum and lines not priced, Rules & tax shows or hides the cards, counting only the
  ones drawn); a step you mark *not for me* reads *set aside by you*, not *doesn't apply as answered*; a
  **step panel** in place of node detail that keeps all of it and adds why the step has its colour, the
  fork's toggle, **Doing / Done / Not for me**, the *done when* checklist, the skills it needs with **Have
  / Learning / Not yet / I don't know** and their sources, its costs in three kinds with **Add your
  quote** through the agree prompt, and the step's official pages; the **lists behind the gauges** (the
  road's skills and your own, with **Add a skill** and **Remove**; every cost line with its source and
  **Add your savings**; your month and year); and **Next on your road**, the next three steps in road
  order, read the way each card's chip reads (never one the map shows done or off your path), labelled
  *the order steps happen, not importance*. Every
  answer is saved as you give it and read back after a reload. Every sentence is in one words file
  ([`lib/cockpit/words.ts`](lib/cockpit/words.ts)) and every amount and month goes through the one
  formatter; a test fails on a verdict word. Three new routes answer only DotAmi's own window
  (`/api/futures/<id>/progress`, `/api/futures/<id>/date`, `/api/skill-marks`), and one reads an idea's
  kept answers back (`/api/futures/<id>`). Today's Alberta road has no *done when* lines, listed skills
  or cost lines yet, so those parts show one line saying so until its content lands
  ([docs/architecture/future-cockpit.md § 2](docs/architecture/future-cockpit.md),
  [docs/ui-spec/cockpit/](docs/ui-spec/cockpit/)).
- **The cockpit screen, part 2** ([14a]) — at the top of the left rail, **What you've told DotAmi**: every
  answer you gave (never a default you haven't set, never a what-if), with its day (or *day not kept*
  where nothing keeps one), what it unlocked (road evaluation run without it and with it, in the
  receipt's own words, from a new pure `withoutAnswer` in [`lib/roads/`](lib/roads/without-answer.ts)), and
  **Change** and **Take back**; under it, **Not told yet**: each missing answer as *question → unlocks
  what*, at most five showing, in the order DotAmi asks them, each with **I don't know**, which keeps
  nothing, and a **one-question box** for the month, savings, structure, equipment, a map pick and your
  own incorporation number. After every answer, wherever you give it, a **receipt** says what it changed
  (two runs of the rules compared, never written by a model; for an answer kept with the map, worked out
  from the idea the save read back, and *Saving your answer…* or *Not saved yet* until then), and the
  newest lines of the visit stay in **This visit** under the map (its newest line, the rest behind *n more
  this visit*). The **what-if bar** (*Try first-year sales of $___*) relights the
  rules under *Your what-if, not a forecast*, moves no money sum and is kept nowhere; **Keep** makes it
  the idea's own first-year sales, never a figure. **Compare the two endings** (from the goal bar, a fork's
  step, or a *Not told yet* ending) puts a fork's two sides on the same rows, counts and sums only, no
  score and no highlighted column, with **This is mine**, kept through a new route that answers only
  DotAmi's own window (`/api/futures/<id>/ending`). It is offered only at a fork whose own pick, not the
  rules, puts steps on or off the path (the maintainer's answer of 2026-10-13), worked out from the
  road's own steps by [`lib/cockpit/told.ts`](lib/cockpit/told.ts) `forksToCompare`: today the
  apprentice road's fork, and not today's Alberta road. There flipping a toggle does move a step between
  *check first* and *not on your path*, but the tax rules do that whichever side is picked, and both
  columns' counts come out the same; there the map's toggles pick, and no Compare button shows
  ([docs/architecture/future-cockpit.md § 2, part 2](docs/architecture/future-cockpit.md),
  [docs/ui-spec/cockpit/12–15](docs/ui-spec/cockpit/)).
- **Federal and Alberta incorporation, side by side.** The Incorporating stage's detail shows both ways
  to incorporate, each from its own official page: Corporations Canada's online fees ($200 to
  incorporate, $100 more for express service, $12 a year for the annual return, no name search report
  needed), and Alberta's Corporate Registry costs as named blanks ("no amount read": Alberta lists its
  government and service fees in its Registry agent product catalogue, which DotAmi hasn't read, and
  sends the NUANS name report to a NUANS service provider with no cost stated). Under every quote, its
  source says how it was checked: **"Checked by a tool on 2026-10-12"**, in amber, because
  `node scripts/check-quotes.mjs` found those words on each of the five pages and no person has read
  them yet (option B); nothing is totalled and DotAmi picks neither. An idea in a province with no written
  route sees the federal one under "Ways to do this · only the federal one is written for <province>
  yet" and is told the other isn't written yet
  ([`lib/engines/cfe/v2026/incorporation-routes.ts`](lib/engines/cfe/v2026/incorporation-routes.ts)).
- **Your own "I'd incorporate at $___".** Typed in the Incorporating stage's detail and labelled
  *your number*; with it, Incorporating turns green once your third-year revenue estimate reaches it,
  and its card says so with both numbers. Without it the card stays "check first" at any estimate and
  says "set your own number to see this light"; with no third-year estimate on the intake it stays
  "check first" and says so, never quoting a skipped estimate back as "$0". DotAmi has no number of its
  own for this and never fills one in. The box takes up to 9 digits, the most a save keeps. Kept with the
  idea's branch picks
  ([`lib/db/scenario-state-json.ts`](lib/db/scenario-state-json.ts)).
- **The Liability / SR&ED card says what lit it**: "Lit because your intake has the activity tag
  Software / SaaS. This card reads only those tags, not a liability or research need you stated." (or
  that none of its three tags is on the intake).
- **A "Ride-share or taxi driving" kind of work**, with a card for the platforms' reporting: on the intake
  it is its own chip, and the keyword reader marks it from words like "rideshare driver", "Lyft", "taxi
  driver" or "driving for Uber", but not from "driving for Uber Eats" (the CRA counts food delivery
  toward the general $30,000 total) or "building a rideshare app" (the rule is about drivers). With
  it, the map adds *Ride-share platforms may report drivers' information to the CRA*, quoting the CRA's
  page on the reporting rules for digital platforms ("These platform operators have to collect detailed
  information on certain sellers.", and "Rideshare and delivery services" among the activities listed).
  It says "information" and "may", as the page does
  ([`lib/engines/compliance/v2026/rules.ts`](lib/engines/compliance/v2026/rules.ts)). The two ride-share
  cards say the tag lit them; the other cards for a kind of work keep naming the province. Its rule
  type, `platform-reporting`, is new; the maintainer approved it on 2026-10-12.
- **Tests: the whole journey in one browser test, and a guard that no screen gives a verdict** ([14a];
  developers only, nothing in the app changes). `e2e/journey.spec.ts` walks the journey as a person meets
  it, on the browser tests' throwaway database: the front door, *Your destination*'s four questions with
  their receipts, *Pick a future* with both written futures, the cockpit on the apprentice road (two skills
  marked and one of the person's own, each with its receipt; one start-up line priced with the person's own
  number through the agree prompt; their month; a what-if under its "not a forecast" banner; *Compare the
  endings* and *This is mine*; the legend folded and opened again), *Your plan* and its seven sections,
  then a reload that reads back what was kept (and not the what-if, which is kept nowhere) and *Your
  futures* listing it; and the other door, *I already have an idea*, to the cockpit on road 0.
  `e2e/no-verdict.spec.ts` reads the visible text of every screen of the journey as it opens (the front
  door, the intake's three screens, *Your destination*, *Pick a future*, the cockpit on both roads with
  every card's panel opened and its sources unfolded, each gauge's list, *Compare* and *Export*, *Your plan*
  for both, *Your futures*, *What DotAmi knows about you*, *Settings*, *Your expenses* and the *Licences*
  page's own words) and fails on advice or ranking words: "you should" (and "you shouldn't"), "we
  recommend" (and "DotAmi recommends", "I recommend", "we'd recommend", "we suggest", "we advise"),
  "recommended", "our top recommendation", "best option", "best bet", "ideal for you", "the smartest
  choice", "top pick", "first choice", "#1", "No. 1", "top-rated", "most popular" and the like; a
  recommendation named as someone else's, such as the apprentice road's "alberta.ca highly recommends legal
  advice", is not one. A phrase split over two lines or blocks still counts. `e2e/journey.spec.ts` reads the
  page again after each thing a person does on the way (an answer and its receipt, both agree prompts, the
  skill marks, a priced line, the month, a what-if, *This is mine*, *Your plan* with all of it in) with the
  same check, since words a screen draws only after an action are on no screen as it opens. The words are in
  one place, `tests/helpers/verdict-words.ts`, with the only two allowances, both official sentences quoted
  from Alberta's *Register a business name* page, each with its reason, and each allowed only inside quote
  marks, as a source's quote shows: the same words written as DotAmi's own line are caught.
  `tests/verdict-words.spec.ts` checks each allowance is still a quote a tool found on that page and that no
  other quote in the catalogs needs one. A control plants "Top pick" on a real screen and the guard catches
  it. Checked by hand on 2026-10-14: a "Top pick" badge added to every card on *Your futures* passed all
  3,560 unit tests and failed this guard; and a "You should aim for these sales." line added to the what-if
  banner, with a "DotAmi recommends keeping everything." line added to *What DotAmi knows about you*, passed
  the first version of both files and failed these. The unit tests that ran DotAmi's words files past their
  own copies of the verdict words (five of them, two lists) now share the widest list from the same file.
  Not read: the third-party licence texts on `/licences` (folded under each package, word for word) and the
  glossary, which is a document, not a screen.

### Changed
- **The Red Seal application fee is priced: $150** — on *From apprentice to your own shop (Alberta)*, the
  Red Seal step's application fee was a blank because the Red Seal page gives no amount; Tradesecrets'
  *Apply Online* page lists it at $150, so it is now an official fee (checked by a tool on 2026-10-15). It
  applies only if you apply after you're certified, which is how the Red Seal page describes the
  application, so no total adds it. The road's other fee blanks now say on the card why they have no
  amount: the Trades Qualifier work-experience rewrite and panel interview (their pages give none), the
  government fee to register a name (only in Alberta's Registry Agent Product Catalogue, which tools can't
  open), the registry agent's own service fee, and the Business Name Report (provided by NUANS members).
- **A second idea no longer passes through *About you*** (issue #38) — the intake opens on *About you*
  only for a person with no saved idea yet; anyone with one starts on the screen they came for, and
  **← Back** still reaches *About you*. Decided on the server when the page is drawn, so the first screen
  never changes under you.
- **"Your ideas" is "Your futures"** — on its page, the front door's link, the cockpit's and *Your
  expenses*' back links and the desktop app's Go menu; **New idea →** is **+ Another future**, which opens
  the front door's doors. The *What DotAmi knows about you* page keeps "Your ideas" for now.
- **An idea picked on *Pick a future* keeps what it wasn't asked as "not said"** — that way in doesn't ask
  the work situation, the kind of venture, equipment or the revenue estimates, so nothing is made up: the
  rules read the work situation as unanswered, road evaluation lists none of them as told, and the
  cockpit and the export write "not said" (the cockpit's link to every idea now reads *Your futures*).
  New storage: `Venture.lookingFor` and `lookingForSetAt` (two added columns), `Venture.notSaid` (one
  added column), and the employment value `NOT_SAID`.
- **Every source says how it was checked, and never claims a person read it unless one did.** The
  maintainer decided on 2026-10-11 (option B) that a source may be checked by a tool instead of read
  by a person before it merges, as long as every card says which. A card's "verified <date>" now
  says who read the source, only when that is on record: **"Read by a person on 2026-10-10"** for
  the T2125 lines the maintainer checked; **"Read by an AI model on 2026-10-06. Not read by a person
  yet."**, in amber, for the GST/HST small-supplier page, which moved and whose new address only a
  model has read; and **"Read on <date>. Who read it wasn't recorded."** for every other source,
  because they were read in build sessions that never recorded whether a person or a model did the
  reading. A source checked only by a tool would read **"Checked by a tool on <date>: it found on the
  page the exact words this entry relies on. Not read by a person yet."**, in amber, with the words
  it found listed under it. The same words show in the map's sources, the intake's preview, the
  Delete menu's record-keeping line, the Tax year hint, the playbook export and the readout API
  (`howChecked` on each citation); one function writes them (`lib/engines/shared/citation-check.ts`)
  and a test refuses any other file reading a citation's check fields. The export's front matter
  counts the sources a person read (`sources_read_by_a_person: <n> of <total>`). A tool check is
  recorded only after the new developer script `node scripts/check-quotes.mjs --url … --quote …`
  (never shipped) found every quote on the live page as whole words, inside one block of the page
  and outside text the page hides; run with no arguments it checks every recorded one again. The
  integrity test now fails on a citation with neither kind of check, a read or tool check dated
  after today, a tool check with no quote or a quote under three words, or a tax-line year's form
  that no person is recorded as having read ([docs/engines/citations.md](docs/engines/citations.md)).
- **Your own status on a step of today's Alberta road is kept with your step progress** ([14a]). The map's
  *active, done, set aside* lists are worked out from its toggles on every load, so they never held a
  status you set; the cockpit's **Doing / Done / Not for me** is now kept with the rest of your step
  progress on every road, the map's chip shows it where you set one, and road evaluation counts it. The
  toggles and their lists are unchanged.
- **A road step names its own rules and tax cards** (`engineHints`), so any road can name the cards that
  belong on its steps. Today's map's cards moved there unchanged from `lib/brain/node-items.ts`, which now
  reads them from the road.
- **The GST/HST cards quote the Canada Revenue Agency's two tests, word for word** ("You exceed the
  $30,000 threshold in a single calendar quarter." and "You exceed the $30,000 threshold over the
  previous four (or fewer) consecutive calendar quarters (but not in a single calendar quarter)."), each
  with what the page says follows and from when. The old paraphrase dropped "(or fewer)". The words are
  checked by a tool, not read by a person (option B): the CRA page's source line, on both GST/HST stages,
  the compliance card and the sole proprietor + GST/HST rung, now says **"Checked by a tool on
  2026-10-12"** in amber, where the compliance card said "Read by an AI model on 2026-10-06". The page
  puts a footnote number after "threshold" in both tests, so the tool check holds the words on each side
  of it; the card shows the sentences without the footnote numbers. The "$30K" shorthand is gone from the map and the intake: the GST timing toggle's
  "Wait for $30K" now reads **When the CRA's tests say**.
- **The map no longer invents a point to incorporate.** The stage "Incorporation at $80K net" is now
  **Incorporating**. Its $80,000 had no source (the catalog called it a heuristic) and was compared with
  the third-year *sales* estimate although it was written as *net* income. DotAmi doesn't pick a point
  to incorporate; the person does, and the card says so: "DotAmi doesn't pick a point to incorporate.
  You do, with your accountant or lawyer." It is amber (check first) while it is the selected option
  (the person's pick, or the default until they click) and grey when the other option is selected,
  whatever their estimates. Its detail keeps only cited facts
  (the CRA's corporation page, the T2 guide's $500,000 business limit). The Incorporation timing toggle
  reads **When you decide** / **Liability / SR&ED**; Retained earnings planning lights only for an idea
  the person said is a corporation. The node's id is unchanged, so saved ideas keep their picks. A test
  now fails on any dollar figure on the map that isn't one a cited page sets
  ([`tests/engine-integrity.spec.ts`](tests/engine-integrity.spec.ts); docs/engines/cfe.md).
- **Stage cards say their colour in words** to a screen reader ("applies as answered", "check first",
  "doesn't apply as answered"), so the colour is never the only way to tell; the map's legend now
  names grey too.

### Fixed
- **With a what-if on, the map's legend no longer slides under the what-if bar** (found by the new journey
  browser test in CI) — in the cockpit, once a what-if was on (its banner, receipt, *Keep* and *Clear*),
  the road's own area shrank to 20 px at 1280x720 and the legend under it was drawn partly under the
  what-if bar; with *Compare the two endings* open beside the road at 1024x768 the whole legend was
  under it, so **Fold the legend** could not be clicked. From 768 px the road's area now keeps at least
  12rem (192 px) of height, the legend always ends where the what-if bar starts, and the column holding
  the road, the legend, the what-if bar and *Next on your road* scrolls down when they are taller than the
  window. Folding still gives the road its room (every region folded at 1280x720 is unchanged), and a phone
  is unchanged. `e2e/cockpit-fit.spec.ts` checks it at 1280x720, 1366x768 and 1024x768 with a what-if on
  and Compare open, and at 768x1024 and 375x812 with a what-if on: the legend's bottom is not under the
  bar, the road's area keeps its height, every control in the legend, the bar and *Next on your road* is
  what a click lands on once scrolled to, and a real click folds the legend; on the old layout both tests
  fail (the legend's bottom 68 px under the bar's top at 1280x720; the road's area 53 px tall at 768x1024).
- **No more doubled full stop under a fee that applies only sometimes** (flagged in PR #165) — the
  apprentice road's rewrite fee showed *"Only if: You failed an exam and choose to rewrite it.. Not added
  to any total."* in its step panel and in the Start-up money list. The words now add a full stop only
  when the condition doesn't already end its sentence, so both read *"…rewrite it. Not added to any
  total."*; *Your plan* uses the same words and no longer trims the condition itself.
- **A sign painter's map no longer shows a research tax credit step as ahead** (issue #40) — in the
  cockpit, *SR&ED deepening* (Tier 4) on an idea whose kinds of work include none of Software / SaaS,
  Manufacturing and AI / ML / R&D is drawn dashed with the chip **not on your path** instead of **ahead**,
  and says why on the card and in the step panel: *"None of the kinds of work on this idea is Software /
  SaaS, Manufacturing or AI / ML / R&D, and this step is on your path only with one of them."* (or, on an
  idea with no kinds of work at all, *"This idea has no kinds of work on it, …"*). It says what is on the
  idea, never what you did or didn't tell DotAmi: a kind of work you typed in your own words, such as
  "Research and development", isn't one the rules read, but you did tell DotAmi. Its step panel used to
  say *"no single answer of yours changes that"*: true for a sole proprietorship, which needs two answers
  (a corporation and one of those kinds of work), but not for an idea already set as a corporation, where
  one of those kinds of work alone would change it. It is still drawn
  and still opens, with every *done when* line and source; it is not hidden, since the map doesn't
  pre-filter paths (whether to hide it is a question for the maintainer, docs/architecture/future-cockpit.md
  § 13). With one of those kinds of work it is as before. The rule is the road's own, in its catalog
  (`onlyForKindsOfWork` on the step, docs/engines/roads.md rule 12), with the same three kinds of work the
  rules already read for that step, and a test holds the two lists equal. No id changed.
- **The told list names *Your futures*.** Its *"each figure's day is on Your ideas"* and *"Take these back
  with the idea's figures on Your ideas."* now name the screen by its name since 2026-10-12, *Your
  futures* (`lib/cockpit/words.ts`; the cockpit's list and Your plan pick a row's day through one
  function, `lib/cockpit/told.ts` `toldDay`).
- **Sources that led to "Page not found" now lead to the page where that rule is today.** A recount on
  2026-10-13 opened every government page DotAmi cites (104 addresses, twice): 20 answered "page not
  found", mostly because the CRA moved its business-expense, SR&ED and corporation pages. 23 sources on
  19 of those addresses now link the page where the same government keeps that content, and each says
  *Checked by a tool on 2026-10-13* with the words found there, until a person reads it (the old read
  date was for the old page, so it no longer shows). Three sources are left as they were for the
  maintainer: the Alberta Investor Tax Credit page (it answers page not found; news reports say the
  program ended in 2019, not checked against an official page) and the two sources of *Retained earnings
  planning* (`tests/moved-government-pages.spec.ts`).
- **The update message comes sooner after the app opens** ([7d]; the maintainer, 2026-10-08 and
  2026-10-13) — the installed app asked GitHub for a newer version only after its server had started and
  the whole first page had loaded. It now asks as soon as its log is open, alongside the rest of the
  start (`desktop/main.mjs`, `desktop/update-check.mjs`), and *"DotAmi <version> is available,
  downloading now"* shows the moment the main window is on the screen if the answer came first. Never over
  *Preparing DotAmi…* or the *Lock your data file with a key?* question: every update message waits for
  the main window, and a download that finished meanwhile goes straight to *Restart and update* /
  *Later*. Installing is still only that click; drafts stay invisible; the download is still checked
  against the release's SHA-512; a failed check is still one log line with the error's name and code;
  Help → Check for updates and a copy run from source are unchanged. The running version decides when
  the message shows, so this is first seen when a copy with this change finds the version after it.
- **What you've told DotAmi says only what you said, and what was saved stays saved.** Every idea made on
  the intake read as *"you told us you're not buying equipment, a vehicle or tools"*: the intake's chip
  starts off, and off was saved as your no. Off is now *not answered* (the rules still read it as no, and
  say so); a No you give in the one-question box is kept as yours, and Take back removes it for good. A
  pick of the map's default side (in the box, or on the map's toggle) said *Saved* and was gone after a
  reload, because the map kept your clicks for the tab only; the forks you picked are now kept with the
  map's answers, so it reads as your pick after a reload (and the export no longer calls it a default).
  Compare is worked out without the what-if and says when no row differs; a ticked *done when* line no longer borrows the step's last-change day; the rail says *not
  given* for no sales target, never $0; the left list's receipt takes the focus where the row you used
  was; and every *Change*, *Take back*, *Answer*, *I don't know* and *This is mine* names its row for a
  screen reader ([docs/architecture/future-cockpit.md § 2](docs/architecture/future-cockpit.md),
  [`lib/db/scenario-state-json.ts`](lib/db/scenario-state-json.ts)).
- **About you and the map's "In your words" no longer say "Vault: No external statement source
  configured."** ([#6](https://github.com/Dot-Ami/dotami/issues/6)). Every copy showed the line, about a
  feature nobody has set up, in a word that meant nothing to a stranger. The screen now says nothing
  about it; the route still reports it for any program that reads it
  ([`components/shared/person-statements.tsx`](components/shared/person-statements.tsx); a browser test
  in [`e2e/app.spec.ts`](e2e/app.spec.ts)).
- **"Show the words" draws a provision as the Act lays it out** ([#9](https://github.com/Dot-Ami/dotami/issues/9)).
  The law store sends a provision as one string with no space between a paragraph and the next label,
  so ITA 18(12)'s paragraphs (a), (b), (c) and subparagraphs (i), (ii) ran together as one block. Each
  subsection, paragraph and subparagraph now gets a line of its own, indented by level, and each
  marginal note (*Capital outlay or loss*) a small italic line above the paragraph it names; a
  section's heading (*Limitation re cost of leasing passenger vehicle*) gets one too, but only where
  the store glued the section's number to it, so the law's own words, such as Class 50's definition
  or a formula's *D is the amount of interest…*, stay ordinary text. No word changes: a reference
  inside a sentence stays put, even one glued to the next word (*subparagraph (a)(i) or (ii)*,
  *subparagraph (c)(ii)exceeds* in ITA 248(1), *clauses A to (C)to be used* in ITA 37(1)), and the lines
  put back together are the store's text, character for character
  ([`lib/law/provision-lines.ts`](lib/law/provision-lines.ts);
  [`tests/provision-lines.spec.ts`](tests/provision-lines.spec.ts), on the store's own text for ITA
  18(12), ITA 18(1) (a)–(l), ITA 248(1), ITA 37(1), ITA 67, ITA 67.3, Reg. 1100(2)(c.3) and Reg. Sch. II
  Class 50, read 2026-10-12).
- **A federal rule says it is shown because it is federal** ([#36](https://github.com/Dot-Ami/dotami/issues/36)).
  Every compliance card said "Shown because you selected <province>.", so an Alberta idea read
  "because you selected Alberta" on the GST/HST small-supplier rule, which is federal, and an idea with
  no province yet read "because you selected your province". A rule whose places include Canada as a
  whole now says "Shown because it is a federal rule, the same in every province and territory.";
  provincial rules still name the province, and the ride-share cards still name the tag that lit them
  ([`lib/brain/evaluate.ts`](lib/brain/evaluate.ts); [`tests/brain-evaluate.spec.ts`](tests/brain-evaluate.spec.ts)).
  The grant cards had the same fault: SR&ED, NRC IRAP and the CSBFP read "Shown because Alberta and
  your … activity match this program." (or "because your province and …" with no province yet). An
  eligible federal program now says "Shown because it is a federal program, offered in every province
  and territory, and your … activity matches it."; provincial programs still name the province, and a
  program that needs a corporation keeps its own line (maintainer's answer, 2026-10-13).
- **A screen reader names the intake's province and employment dropdowns.** Their names ("Province /
  territory", "Current employment") were plain text tied to nothing, so the dropdowns had no name;
  they are now labels tied to their fields, and so is "Name it — optional" for the name box; the
  "add your own" kind-of-work box and the box "Other…" opens, named only by their placeholders, now
  have names of their own
  ([`components/discovery/intake-page.tsx`](components/discovery/intake-page.tsx) `FieldGroup`; the
  browser test finds both dropdowns by their names).
- **The desktop app's log no longer keeps whole error messages from a failed update check, backup or
  restore.** Four lines in [`desktop/main.mjs`](desktop/main.mjs) wrote the whole error, whose message
  can name the file you chose and folders on the computer; they now write its name and code
  (`describeError`), as the rest of the log does, and the update checker's own error reports, warnings
  and progress lines that report a failure, which can carry an error's message, each leave one fixed
  line (`updaterLogger`, [`desktop/log.mjs`](desktop/log.mjs)); its other progress lines are kept as
  given, and one of them names the folder an update downloads to. The failed database update keeps its words, on purpose, as before.
  [`tests/error-logging.spec.ts`](tests/error-logging.spec.ts) now reads `desktop/` too, writes to
  the log file included ([`docs/privacy-log.md`](docs/privacy-log.md)).
- **Ride-share and taxi drivers see the GST/HST rule that applies to them: register from the first paid
  ride.** DotAmi had no driver kind of work and only the general $30,000 rule, so a driver expecting less
  than $30,000 was told on a green card that most businesses "need not register yet". The CRA says the
  $30,000 small-supplier line doesn't apply to commercial ride-sharing or a taxi business (Excise Tax Act
  s.240(1.1)). A new card, *GST/HST for ride-share and taxi driving: from the first paid ride*, quotes
  the CRA ("You must register for a GST/HST account the moment you start earning money from commercial
  ridesharing services."); Mandatory GST registration applies whatever the estimate, saying which tag
  lit it; the small-supplier card is "check first" and says what the line still decides (the person's
  other sales). Ideas without the tag are unchanged
  ([`tests/rideshare-gst.spec.ts`](tests/rideshare-gst.spec.ts); docs/engines/compliance.md). How
  its sources were checked (option B): the CRA's page on the reporting rules for digital platforms
  says "Read by a person on 2026-10-11" (the maintainer read it); the sharing-economy page, the taxi
  and ride-sharing page, GI-196 and the Excise Tax Act's s.240 and s.123 each say "Checked by a tool on
  2026-10-12" in amber, with the words the tool found listed under it.
- **No "getting close" warning of DotAmi's own.** A first-year estimate (or a complete year of agreed
  figures) at 70% of the GST/HST line, about $21,000, turned the GST/HST card amber and called it
  "approaching" the line. No cited page sets 70%. A GST/HST card now changes only when one of the CRA's
  tests is met; under it, a card read from your confirmed figures says "not over $30,000", and a card
  read from an estimate only says why it is shown ("Shown because it is a federal rule, the same in
  every province and territory.", since #36 below). Under the line the card no longer tells
  you flatly that you are a small supplier: most businesses are, and the CRA's page lists exceptions.
- **A stage card says "default" until you click its toggle** ([#5](https://github.com/Dot-Ami/dotami/issues/5)).
  The GST/HST and Incorporating cards said "your pick" on a default the person never chose, under a
  toggle saying "default, not your pick yet". Now the chip reads **default** until that toggle is clicked;
  a saved idea whose pick isn't the default keeps **your pick** after a reload; the "Service vs.
  productize" fork on every map reads **open choice**. The playbook export writes "(default, not picked
  yet)" beside an untouched default, and the readout API gives each stage's chip. The cockpit's step
  panel and road evaluation's list of your answers use the same test, and road evaluation counts your own
  "I'd incorporate at $___" as one of your answers when you typed one.
- **The map's colours follow your own picks.** The cockpit ran the rules on the default GST and
  incorporation picks, so flipping **GST timing** or **Incorporation timing** moved the chips but not the
  card colours. It now runs them on the idea's own picks, through one function the readout API uses too
  ([`lib/scenarios/evaluate-scenario.ts`](lib/scenarios/evaluate-scenario.ts)); a test refuses any other
  way of colouring a saved idea's map.
- **The sentence you type on the front door is kept.** It, and the intake's goal chips, lived only in the
  browser tab and were lost when it closed. When the map first opens, the sentence is saved with the idea,
  word for word and dated the day you typed it, as one of your statements, and the goal chips as they stood
  on the intake go on the idea; the idea's card shows both under "In your words" ("Goals marked on the
  intake", since some chips can be marked from the sentence and confirmed there). The sentence is saved
  once: going back through the intake from the map makes a new idea without a second copy, and a sentence
  deleted with "Your statements" isn't written back from the same tab. About you and the map's rail list it
  as "typed for your idea “…”". It is listed and deleted with "Your statements" on What DotAmi knows about
  you; deleting the idea keeps it, tied to no idea. The front door's box takes up to 2,000 characters, the
  most a statement holds, and says so when it is full. One hand-written migration adds the two columns
  (`prisma/migrations/20261011120000_first_words`).
- **Words typed on the front page before it has finished loading are kept.** The page arrives already
  drawn, so on a slow computer its box can be typed into before the page's scripts have run. Those words
  were never heard: **Map it** stayed greyed out, and the box was emptied a moment later. The page now
  takes whatever is in the box when it finishes loading
  ([`components/discovery/landing-page.tsx`](components/discovery/landing-page.tsx)); a browser test holds
  the page's scripts back while it types. The same race made the desktop test fail on CI three times in
  about 15 hours on 10-11 October; that test now waits for the page to finish loading before it types.
  A side effect people will see: words the browser puts back in the box when you press Back (after
  leaving the front page with a full page load) now stay, and **Map it** works with them; before, they
  showed for a moment and were emptied.

### Security
- **The desktop app moves to Electron 44.7.0** (from 44.5.1, which 0.3.0 shipped). 44.7.0, released
  2026-10-07, carries 55 fixes Electron copied from Chrome's engine and the parts it is built from
  (ANGLE, Chromium, Dawn, fontconfig, Skia, V8 and WebRTC): 47 in
  [electron/electron#54666](https://github.com/electron/electron/pull/54666) and 8 in
  [#54657](https://github.com/electron/electron/pull/54657): one of them, by its title, a fix for memory
  used after being freed, and a few more for objects that could be used after they went away.
  Electron's release notes call them "backported fixes", not security fixes. The Chromium version
  number (152.0.7977.130) and Node (24.21.0) stay the same. Read in the
  [44.6.0](https://github.com/electron/electron/releases/tag/v44.6.0) and
  [44.7.0](https://github.com/electron/electron/releases/tag/v44.7.0) notes on 2026-10-11: the change
  to the built-in `autoUpdater` is for Macs, and DotAmi updates through electron-updater; the
  `net.fetch` fix is for a call DotAmi doesn't make; `protocol.registerSource` is new and unused. One
  change does reach DotAmi, below. The installed app gets all of this with the next release
  (`package.json`, `package-lock.json`).
- **In the desktop app, "today" follows British Columbia's permanent UTC-7 from November 2026.**
  Electron 44.6.0 updated its time-zone data to tzdata 2026d, "including British Columbia's move to
  permanent UTC-7" ([electron/electron#54623](https://github.com/electron/electron/pull/54623), 44.6.0
  release notes, read 2026-10-11). DotAmi works out the person's own day (`lib/figures/age.ts`
  `localDay`) in the desktop app's server, which is started with `utilityProcess.fork`
  (`desktop/main.mjs`), and in its window, and both run on Electron's own copy of that data. That day
  is the line for refusing an expense or figure dated after today, and the day shown for one agreed to
  or retracted. On a computer set to Vancouver time,
  from 2026-11-01 that day now turns over at midnight UTC-7, one hour earlier than on 44.5.1, which
  still moved the clocks back to UTC-8. Measured 2026-10-11 by formatting 2026-11-02 07:30 UTC in
  `America/Vancouver`: 44.5.1 (tzdata 2025c) gave 2026-11-01, 11:30 p.m. GMT-8; 44.7.0 (tzdata 2026d)
  gives 2026-11-02, 12:30 a.m. GMT-7. A desktop test checks it (`e2e-desktop/desktop.spec.ts`, "the
  person's day follows the time-zone data Electron ships"). Copies run from source with `npm run dev`
  use the system Node's time-zone data, as before.

### Documented
- **Two designs, written before any code, each waiting on the maintainer's calls** (2026-10-15).
  [docs/architecture/other-ways-to-build.md](docs/architecture/other-ways-to-build.md) ([14f]): each
  start-up cost line offered as already have it, buy, rent or lease side by side, each with the person's
  own number and the CRA's treatment of that way, the cited rules the person's picks bring into view, and
  a *Where to ask* list for tax and legal help; nine calls.
  [docs/architecture/competitive-landscape.md](docs/architecture/competitive-landscape.md) ([14g]):
  Statistics Canada's count of businesses by area and industry (June 2026), a dated list of public
  places to look, a plain line that ordinary ad spend isn't published in Canada, and the person's own
  list of businesses they're watching; ten calls. Nothing DotAmi keeps, sends, ships or asks changes.
- **Both designs revised after the maintainer's answers, and two more written** (2026-10-15).
  other-ways-to-build.md: call 1 answered (C). competitive-landscape.md: calls 1 (A) and 3 (B for v1)
  answered; call 2 reworked as separate picks (the person's own list, look-ups on the person's own account,
  a list from open data), with what each outside tool's own terms allow.
  [docs/architecture/lens-comparisons.md](docs/architecture/lens-comparisons.md) ([14h]): the Lens and a
  *Sort by* control order the person's own options by one measure they name, every number from DotAmi's
  code; four calls. [docs/architecture/research-kit.md](docs/architecture/research-kit.md) ([14i]): one
  source registry, import core, code keys and research-pack script so every job reuses the same data;
  nine calls (K1–K9); the maintainer's picks of 2026-10-16 are now recorded in all four designs. Nothing
  DotAmi keeps, sends, ships or asks changes.
- **No times anywhere, and where the Lens's numbers may come from** (the maintainer's answers of
  2026-10-17). research-kit.md, lens-comparisons.md and other-ways-to-build.md: no typed time fields, no
  time gauge, no durations added up or estimated, and the Lens never answers "how long" or "fastest" with a
  time; the typed-times task (S2.5.25j) is dropped. lens-comparisons.md: the Lens may state a number only
  when it comes from DotAmi, from a cost link it found (shown with the link and the day seen), or from a new
  calculator tool, and its reply check now matches each number to those sources instead of banning digits;
  a calculator task and a cost-link lookup task are added. research-kit.md also records his answer that the
  person's own list of businesses they're watching may be built now. Nothing DotAmi keeps, sends, ships or
  asks changes.
- **The update checker's install ID is on What DotAmi knows about you and in Settings** (found in the
  review of #169). The desktop app's update package, electron-updater, makes a random install ID on its
  first check, keeps it in a file of its own, `.updaterId`, in the data folder, sends it to GitHub with
  every check (the `x-user-staging-id` header) and writes it into the log once; the privacy list didn't
  say so. `/your-data` now has a row for the file (what it is, that DotAmi doesn't write or read it, that
  Delete doesn't reach it, and how to remove it: close DotAmi and delete the file, and the next check makes
  a new one; an earlier ID stays in the log, which both this row and Delete's list of what it can't reach
  say), the log's row and the update check's entry name the ID, the update check also names Help →
  Check for updates, and Settings' Privacy group says GitHub sees it
  ([`lib/privacy/inventory.ts`](lib/privacy/inventory.ts),
  [`components/settings/settings-page.tsx`](components/settings/settings-page.tsx),
  [docs/architecture/desktop-app.md § Updates](docs/architecture/desktop-app.md#updates)).
  [`tests/privacy-inventory.spec.ts`](tests/privacy-inventory.spec.ts) reads electron-updater's own
  `AppUpdater.js` and fails while a file it writes beside the data file, or a header it adds to the
  check, isn't listed. No behaviour changes; whether DotAmi needs the ID is still open.
- **The rate limiter says how it works on the person's computer.** Its comments described Vercel's
  hosted servers (warm serverless instances, a hosted store as a later upgrade); they now say the
  server runs on the person's own computer, who can reach it (only programs on the same computer for
  the desktop app and `npm run dev`; `npm start` listens on every network interface unless given
  `-H 127.0.0.1`, and the Host check stops web pages, not other machines), what the limit is for (a runaway loop in
  a script or an agent), that the counts live in memory, and that Next.js fills in the caller's address
  ([`lib/api/rate-limit.ts`](lib/api/rate-limit.ts); a check in
  [`tests/rate-limit.spec.ts`](tests/rate-limit.spec.ts)). No behaviour changes.
- **A plain-words glossary** ([13a]) — 51 entries for the short forms and terms a person meets in
  DotAmi (the GST/HST and the small supplier, input and investment tax credits, T1, T2, T2125, T5,
  CCA, SR&ED and T661, the small business deduction, CCPC, eligible dividends, GRIP, LRIP, RDTOH,
  TOSI, GAAR, B.C.'s PST; sole proprietorship, partnership, corporation, trade name, registry agent,
  NUANS, the business number, BizPaL; payroll accounts, CPP/EI, T4, TD1, WCB-Alberta; IRAP and the
  CSBFP; the apprenticeship words of *From apprentice to your own shop (Alberta)*: AIT, the Alberta
  Student Number, sponsor, period, classroom instruction, journeyperson, Trades Qualifier, Red Seal,
  Blue Seal, RAP, CTS; NOC and OaSIS; and MCP), each in one or two sentences, no advice, linked to its
  official page, *checked by a tool on 2026-10-12*: the quote checker found the listed words on every
  one of its 53 pages (`docs/glossary.md`). The short forms on screen it doesn't explain yet (Holdco,
  ITA, ISED and others) are listed at its end. Linked from the README and CONTRIBUTING. No app code
  changes; `tests/glossary.spec.ts` keeps this entry count true and fails when one of the short forms
  a review found on screen (TD1, T4, T5, RDTOH, GRIP, LRIP, Holdco, Opco, eligible dividend) has
  neither an entry nor a line in that list.
- **The design for the future cockpit, and the maintainer's six decisions of 2026-10-11** ([14a]) —
  a person starts from where they want to be (a business or a career), picks one future to look
  inside, and sees its whole road at once: steps, the skills they need, official fees and the cost
  lines they price themselves; the cockpit becomes the one screen where they plan it and do it. The
  journey screen by screen, the cockpit's regions, overlays and interactions, what DotAmi asks and
  why, receipts that show what each answer changed, where the data comes from, the road data model
  and storage, how each of the repo's rules is met, six fixes from the final check (the uncited
  $80,000 incorporation trigger comes off the map; federal and Alberta incorporation side by side;
  the CRA's exact GST/HST test; a model never writes into the person's own words; the job for a
  skills list is always the person's pick; every *done when* line cited), and the four phases. No
  code changes (`docs/architecture/future-cockpit.md`).
- **A new kind of source: the government's skills list for a job** — OaSIS (Employment and Social
  Development Canada, Open Government Licence – Canada), allowed only through the person's own pick
  of job, cited by dataset version and record date, its licence line kept with it (`CONTRIBUTING.md`).
- **The task list** gains the future cockpit's four phases with phase 1's tasks, and three later
  stories: real examples of how people started, your own test results, and DotAmi getting better
  over time (`docs/task-list.md` § 14–17).
- **Older pages corrected in place, each with a dated note**: the roadmap's "In-app AI is off by
  design" (out of date since the Lens came back on 2026-09-27) and pointers from §1–§3 to the new
  design (`docs/roadmap.md`); the cockpit page's wrong back-link lines and the retired Track tab
  (`docs/ui-spec/cockpit/_index.md`, `docs/ui-spec/cockpit/01-header.md`).
- **Careers are now in scope for new content**, not only small businesses: the relevance rule for a
  new node, the *New node* issue template and the people DotAmi is for say "starting a business, or
  working toward a career or a business of their own" (`CONTRIBUTING.md`,
  `.github/ISSUE_TEMPLATE/new-node.md`, `docs/architecture/use-cases.md`).
- **The public pages catch up with what shipped.** The README no longer calls the desktop app "not
  yet released": it links the installer on the
  [latest release](https://github.com/Dot-Ami/dotami/releases/latest), says it isn't code-signed yet,
  and says the future cockpit is being built (`README.md`). The government skills list is cited as
  *OaSIS 2025 Version 1.0*, which has a Knowledge file, instead of the 2022 version, which doesn't;
  which files the import uses is still open (`docs/architecture/future-cockpit.md`, `CONTRIBUTING.md`).
  The task list ticks what is done: the incorporation fixes of #142, a setting that survives a restart,
  the figures' ages, the data file's encryption (released in 0.3.0), the 0.2.1 and 0.3.0 releases and
  the `source-map-js` update; it lists the cockpit's plan once, under [14a], with [10f] pointing there,
  and says the privacy policy and terms are still owed after the first installer (`docs/task-list.md`).
  CONTRIBUTING's "what we need" points to the task list, and the receipts design no longer lists
  encrypting the data file as open (`CONTRIBUTING.md`, `docs/architecture/expense-records.md`). The
  receipts design and the figures privacy review now say every new backup needs a passphrase since
  0.3.0 (`docs/architecture/expense-records.md`, `docs/architecture/figures-privacy-review.md`), and
  the settings edge cases say the warning before turning off locking is desktop-tested
  (`docs/architecture/settings-and-edge-cases.md`).
- **A source's date says who looked at it.** Following the maintainer's decision of 2026-10-11, a
  source is either *read by a person on* a date or *checked by a tool on* a date (a tool fetched the
  live page and the quoted words were found on it). The OaSIS 2025 record and the CRA's *When to
  register for and start charging the GST/HST* page were fetched by a tool, so their dates now say
  *checked by a tool on 2026-10-11* instead of *read 2026-10-11*
  (`docs/architecture/future-cockpit.md`).

## [0.3.0] — 2026-10-10

Your data file can be locked to your Windows account (asked first, can be turned off), backups take
a passphrase, and a lost key offers Restore from a backup or Start fresh. Receipts (iPhone photos too)
are kept encrypted; DotAmi restarts after a new key, set-aside receipts can come back, Delete clears
them. Also: Your expenses, the four T2125 totals, a reader for last year's return PDF, GnuCash files.

### Added
- **A new data folder is asked first, and locking the data file can be turned off** ([8i], the
  maintainer's decision of 2026-10-10) — a brand-new install now gets the same window as an existing
  file, with the same four buttons: **Encrypt now** locks the file from its first byte as before, **Not
  now** keeps it unencrypted and asks again at the next start, and **Never…** keeps it unencrypted after
  a second warning, with the Settings switch unticked. **Back up first…** is shown turned off there, with
  a line saying there's no data file yet to back up. In Settings, **Encrypt the data file** can now be
  unticked while the file is encrypted: a warning says what that exposes and that backups stay locked
  with their passphrase either way; then the next start decrypts the data file and its safety copies,
  in steps a crash can't lose data in, and deletes the key once nothing is locked with it. Only the data
  file: receipt files keep their own encryption. A small note records the turn-off, so a key is never
  deleted on a guess (a data file moved out of the folder keeps its key); a data file that fails its check
  stays encrypted and DotAmi starts as before; a decrypted copy another program blocks is wiped at once;
  and a safety copy deleted from the Delete menu part-way no longer stops DotAmi from starting.
- **Bring set-aside receipts back** ([8i]) — receipts that *Start a new key* moved into the backups folder
  can now come back inside DotAmi, once Windows can open their old key on your account again (your old
  Windows profile came back, or the old `receipts.key` turned up). Settings → Data and backups and *What
  DotAmi knows about you* list each folder of set-aside receipts and say whether their old key opens; when
  it does, **Bring these receipts back** (asked once) checks each receipt against its expense record, locks
  it again with the key DotAmi uses now, puts it back in the receipts folder, and only then removes it from
  the set-aside folder. Receipts you added since aren't touched. A receipt whose record was deleted since,
  or that changed, stays where it is and is named. Desktop app only: a copy run from source says it can't.
  Receipt folders set aside by a restore or by *Start fresh* aren't offered (their records aren't in the
  data file any more). The button is offered only for receipts that could really come back: each folder's
  line says why the others can't (their record is gone, they are already back, they changed, another
  program has them open, or their old key can't be opened), and when a folder has no `receipts.key` of its
  own it says to put a found one there. A folder an earlier Delete is still clearing is never offered.
  One receipt that fails never stops the others, and the answer always says what really moved.
  A receipt whose only copy was an unfinished add when it was set aside comes back too. A folder whose key
  file is in the next set-aside folder (a move cut short) says so, instead of pointing to the Recycle Bin.
  "Already back" is said only when the copy in the receipts folder really opens; a different file there is
  named, with what to do. A receipt put back but not checked (another program held it) is said as such,
  not as "couldn't be written". A leftover from an earlier try no longer blocks the button.
- **DotAmi restarts by itself after *Start a new key*** ([8i]) — once the locked receipts are moved
  aside, the page says where they went and "DotAmi will restart now to start the new key…", and the
  desktop app closes and opens again by itself, making the new key on the way up. You no longer have
  to close it and open it again. If the restart doesn't happen, nothing is lost: the files were already
  moved, the page says to close DotAmi and open it again, and the next start makes the key. A copy run
  from source doesn't restart by itself, and says so.
- **Delete can clear the receipts DotAmi set aside** ([8i]) — the Delete menu's *Safety copies in the
  backups folder* box now also clears the receipt folders DotAmi set aside there:
  `receipts-locked-…` (from *Start a new key*) and `receipts-before-restore-…` (from a restore). The
  box counts them, and once ticked it warns, there and at both asks, that afterwards those receipts can
  never be opened, even if the old key comes back. Only the files DotAmi put in them are deleted; a
  file of yours in one stays. A folder that can't be cleared yet (another program has a file open) is
  finished by *Finish it now* or the next time the desktop app starts. *What Delete doesn't reach* no
  longer lists them; it now names the key files set aside on their own
  (`receipts-key-unreadable-….key`), which Delete still leaves. With the box unticked, the first
  "are you sure" step says the set-aside receipt folders still hold their receipt files.
- **Start fresh when the data file's key is lost** ([8i], the maintainer's decision of 2026-10-10) — the
  window that says the key can't be opened offers **Start fresh…**, asked twice, saying plainly what is
  given up (everything in the locked file that isn't in a backup, unless its key comes back). Nothing is
  deleted: the locked data file, its key file and the receipts folder go to the backups folder as they
  are, and DotAmi starts with an empty data file under a new key. It isn't offered while Windows' key
  store is only unavailable for now, it moves nothing while an encryption was part-way, and the new
  file is never created unencrypted. *What DotAmi knows about you* names what it sets aside among what
  Delete doesn't reach, and Delete's settings box says it forgets a "Never" about encrypting.
- **Every backup is locked with a passphrase** ([8i], the maintainer's decision of 2026-10-10) — a
  backup holds your data and receipts unencrypted inside it so it restores on another computer, so
  File → Back up… no longer offers to leave the passphrase out, and the backup code refuses to write
  one without it. Backups made before, with or without a passphrase, still restore.
- **Restore from a backup… when the data file's key is lost** ([8i]) — the window that says the key
  can't be opened now offers it: the locked data file and its key file are moved into the backups
  folder, never deleted (in case the key comes back), and the backup is restored under a new key.
  The locked file moves before the new key is saved, so a step that fails changes nothing; while
  Windows' key store is only unavailable for now, the window offers no restore and says to restart.
- **Your data file is encrypted in the desktop app** ([8i], the maintainer's decisions of 2026-10-10)
  — with a key only your Windows account on this computer can open, kept wrapped by Windows (the
  same protection as the receipts' key, in a file of its own, `database.key`), and its safety copies
  with it. A new data folder is encrypted from its first byte. An existing file is asked about first,
  in a window that says what it protects, what it doesn't and what a lost key costs (everything not
  in a backup), with **Back up first…**, **Encrypt now**, **Not now** (asked again at the next start)
  and **Never…** (after a second warning). Encrypting never makes a second plain copy, survives being
  stopped at any step, and overwrites the plain file with zeros before deleting it. Settings and
  *What DotAmi knows about you* say whether the file is encrypted, and Settings has an **Encrypt the
  data file** switch to turn it on after "Never". When the key can't be opened (or the key file
  opens but holds another key, or Windows' key store isn't available right now), nothing is changed
  and a window says what happened and that putting `database.key` back brings everything back. A key
  that opens is never replaced, even when the data file is missing; a data file another program holds
  stops the start with a sentence saying so, never taken for a new one; and only one file is encrypted
  at a time, so an unencrypted copy whose wipe another program held up is never forgotten.  Backups hold the data decrypted, rebuilt in memory (no plain copy on the disk), so they restore on
  another computer; a restore is written encrypted with this computer's key. An older DotAmi can't
  open an encrypted file: going back needs a backup. A copy run from source keeps the file plain and
  says so.
- **Start a new key for your receipts** ([8i]) — when the desktop app can't open the key your
  receipts are locked with (a Windows profile reset, a data folder from another account or computer,
  a deleted `receipts.key`), Settings, *What DotAmi knows about you* and the Expenses page now offer
  *Start a new key…* under the amber line, besides putting the key back, restoring a backup or
  deleting the receipts. It asks twice, saying first that the locked receipts are given up for good
  unless the old key comes back. Nothing is deleted: the locked receipt files and the old key file are
  moved into a new folder in the backups folder, and the page says where. The new key is made the next
  time DotAmi starts. Your expense records stay; a receipt that was set aside says so, and where it is,
  when you open it. Only DotAmi's own window can do this; an agent can't. It isn't offered while the
  key is only out of reach for now (Windows' key store not available at the moment): the page then
  says DotAmi tries again each time it starts. While no receipt can be added, an agreed record says so
  instead of offering *Add a receipt*.
- **"Preparing DotAmi…"** ([8i]) — the first start of a new data folder takes about ten seconds
  while Windows saves the key that protects your receipts, and nothing was on the screen. A small
  window now says what is happening, and closes as soon as DotAmi's window opens. Ordinary starts
  don't show it.
- **The four T2125 totals in "Add a figure"** ([8f]) — the list of what you can add gains business
  gross income (T2125 line 8299), business total expenses (9368), business net income before
  adjustments (9369) and business net income (9946). Choosing one asks for the tax year it is for and
  says which line of the CRA's form it goes on that year. DotAmi has read the CRA's 2025 form so far;
  for any other year it says "not read yet" instead of guessing the number, and still keeps the
  figure with its year. The tax year has to be the year the figure's period ends in, so a 2024
  total can't be filed under 2025 by a slip. Each figure remembers its tax year, and, once figures
  can be read from a return, the form and line printed on it (only a figure read from a return can
  have one). Every line is cited to the CRA's own 2025 T2125 and
  Guide T4002, checked by the maintainer on 2026-10-10 (`lib/engines/taxlines/`). Line 8299 leaves out the GST/HST you
  collected, so the GST/HST card never counts these totals; it still reads only your revenue figures.
- **Your expenses** ([8i], typed records) — a new page, *Your expenses*, reached from the ideas page
  (the link at the top, and *Expense records for this idea* on each idea's card). Type a business
  expense (the day, the amount, who you paid and what for; a category, a business share, the GST/HST
  part, the seller's address and GST/HST number if you like) and add it to a list; type as many as
  you like, then *Review* them and *Agree to all* at once. Untick any you want to leave out: they stay
  on your typed list. Nothing is kept until you agree, and closing the window forgets the typed list.
  There is no box for a bank or card number.
- **Not attached yet** — a record can be kept without an idea and attached to one later (*Attach* /
  *Move* on each record).
- **Deleting an idea keeps its expense records** (the maintainer's decision of 2026-10-08) — they
  stay in DotAmi's data file on your computer as "not attached yet", refund links included, and you
  can attach them to another idea. Before you delete, the Delete menu says how many stay, where they
  are kept and how to delete them too (tick *Your expense records*). The count includes records you
  turned down, which are kept but not listed on the Expenses page, and the warning says so.
- **Your business share** — an optional whole percent from 1 to 100 per record, kept as you typed it
  beside the full amount. DotAmi shows both; it never sets the share or works out a "deductible"
  amount from it. A share an agent or a file proposed is shown as theirs ("proposed by …"), never as
  your number.
- **Refunds and credits, your way** — keep each one as a negative amount on a record, or as a
  separate refund record linked to the purchase it came from (*Record a refund for this*). Either way
  it keeps the refund's date, the purchase, the GST/HST part and the credit note's details when you
  give them. DotAmi doesn't say how a refund is taxed.
- **Waiting for you** — records an agent or a file proposes wait on the same page until you agree
  (or turn them down), exactly as before.
- **Refunds taken off the month they were paid back** ([8c-3]) — ledger exports such as Wave's
  Account Transactions keep sales in one column (Credit) and refunds paid back to customers in
  another (Debit), and "Add from a file" only ever added up one, so a month with a refund read too
  high (the Wave practice file's August: 320.00 against a true 280.00). It now has an optional
  "Refunds / money out" column. It is never pre-filled, not even for a column named Debit or
  Refunds: you pick it. Each amount in it is taken off the month of its own row, the month the
  money went back, which may be later than the sale's; the preview says how many refunds each
  month had and what they took off, and says that a refund lowers the month it was paid back. A
  month can go below zero. The rule is the same one the bank statement totals use, kept in one
  place so the two screens can't disagree. Choosing "None" takes nothing off, as before. Nothing
  about the column is stored.
- **A "Status column" for invoice lists** ([8c-3]) — invoice lists from FreshBooks, Sage Accounting
  and Xero can include void, deleted and draft invoices, which were added up as sales. "Add from a
  file" now has an optional Status column, pre-filled only when a column is headed exactly "Status"
  or "Statut". Rows marked Void, Voided, Deleted or Draft (and, assumed for French files, Annulé,
  Supprimé or Brouillon) are left out of the totals and listed with the reason, beside the other
  left-out rows; any other status counts as before, only the chosen column is read, and choosing
  "None" counts every row. Nothing about the column is stored.
- **Add from a file reads a GnuCash book** ([8h]) — drop a GnuCash book (the `.gnucash` file,
  compressed as GnuCash saves it, or plain XML) where you drop a spreadsheet. DotAmi lists every
  account in it, with the ones GnuCash marks as income already ticked; tick or untick any of them,
  since an income account can also hold interest or GST/HST you collected. The monthly totals of
  the ticked accounts follow, one list per currency, exact to the cent, with what was left out and
  why, and the note "DotAmi read your last save" (changes not yet saved in GnuCash aren't in it).
  Review sends only those totals to the agree prompt; nothing counts until you agree. Books up to
  50 MB are read in the background, so the window stays usable, and a read is stopped after a
  minute. A book from a newer GnuCash, with a feature, account type or part DotAmi doesn't know,
  is turned away with that thing's name. Figures from a book are listed under **Books / file**.
- **A note beside a ticked book account that isn't income** ([8h]) — tick a bank, expense or other
  account GnuCash doesn't mark as income, and a plain note appears under it: "This isn't an income
  account in your book. If a sale also lands here, it may be counted twice." A sale is posted to
  both the income account and the bank, so ticking both adds it up twice. The note is all it does:
  the tick stays yours, the account is still counted, and nothing is blocked.
- **Bank and card accounts, the groundwork** ([8g]; nothing new to see until the statement screen
  arrives) — DotAmi can now keep a list of the bank and card accounts you allow it to read
  statements from, each under your own name for it ("Business chequing", "Visa ending 1234"), with
  which button you pressed on the warning (Allow once, Always allow this account, Always allow
  every account) and the day. A name may hold four digits only as "ending" plus four digits at the
  end; any other run of four or more digits is refused, so an account number can't slip in, and no
  account or card number is ever kept. Settings lists each account under *Bank and card records*
  with a *Take back*, and the Delete menu on *What DotAmi knows about you* gets a *Your bank and
  card accounts* box. The *Bank and card records* switch itself stays marked "not built yet": it,
  the warning and the statement screen arrive together, so no switch shows that does nothing, and
  until then nothing can add an account. The words of both warnings are written and reviewed now,
  in the settings list. Only DotAmi's own window can list, allow or take back an account, never an
  agent.
- **Licences** — a new page listing every piece of other people's work DotAmi ships with: each
  package, its version, its licence, where it ships, and the licence's own words (open an entry to
  read it). Reached from Settings → Updates, and in the desktop app from Help → Licences. The
  installer now carries the same list as `THIRD-PARTY-NOTICES.txt` beside DotAmi.exe, next to
  Electron's licence and Chromium's notices. The list is written from the packages themselves each
  time the app is built, and building the installer stops if a package that ships has no entry, so
  the minified app no longer drops the notices its packages' licences ask to be kept.
- **Delete can clear the safety copies, and finishes a wipe that was cut short** ([8d]) — the Delete
  list gets one more tick-box, "Safety copies in the backups folder", warning that afterwards only a
  backup you saved somewhere else could bring anything back. Only the copies DotAmi made itself are
  deleted; anything else in that folder stays, and a link out of the folder is never followed. If a
  wipe can't finish (the computer is busy, the disk is full), DotAmi leaves a small note beside the
  data file and the desktop app finishes the wipe the next time it starts. It does this only when
  that note is there, never on an ordinary start. The page also says when an earlier Delete hasn't
  finished, with "Finish it now".
- **Receipts** ([8i]) — *Add a receipt* on a record you agreed to keeps a copy of the file in a
  `receipts` folder beside DotAmi's data file: a JPEG, PNG or WebP picture or a PDF, up to 10 MB.
  DotAmi decides what a file is from what is inside it, not its name, refuses anything else (an SVG
  or a web page can carry a script), and refuses a picture too large to show safely. It names the copy
  itself with a random string; your file's name is never sent or kept. You are told first that the copy
  is kept exactly as you give it, so whatever is printed on it is kept too. *Remove receipt* deletes
  DotAmi's copy and keeps the record.
- **iPhone (HEIC) photos as receipts** ([8i]) — a HEIC photo is kept exactly as you give it, like any
  receipt, and *Show receipt* shows it: DotAmi reads the photo's container with its own code, in a
  worker that can't connect anywhere, and the computer's graphics chip decodes the picture (option D
  of `docs/connectors/heic-decoder-review.md`, chosen by the maintainer after a double-check). It works
  on computers whose graphics driver decodes HEVC; where it can't, the photo is still kept and DotAmi
  says so, and how to see it. A HEIC is decoded only when you click *Show receipt*, and after one fails
  DotAmi doesn't try another until it restarts. Bursts, animations and layered HEIF pictures are
  refused, and so is a HEIC whose tiles would ask the graphics chip to decode more than the pixel
  caps allow. Not tried on a Mac yet.
- **Show receipt** — a receipt opens inside DotAmi: a picture as it is, a PDF drawn page by page.
  Nothing in a receipt can be clicked or run (a PDF's links, forms and scripts do nothing), nothing
  is fetched from the internet, and DotAmi checks the file is the one you added before showing it;
  a file changed or replaced on your computer since then is refused, with what to do. A PDF shows at
  most 20 pages, and fewer when its pages are very large (80 megapixels in all), saying how many.
- **Backups hold your receipts** — *File → Back up…* now puts every receipt file in the backup with
  the data, locked by the same passphrase if you chose one, and says how many went in. *Restore*
  brings them back; the receipts already on this computer go to the backups folder beside the safety
  copy. Backups are now written and read a piece at a time, so a big data file or many receipts
  don't need more memory. Backups made by earlier versions still restore (they hold no receipts,
  and the question before restoring says so).
- **Your receipts on the Delete menu** — a box of its own that removes every receipt, files
  included, and keeps the records. *Your expense records* now takes their receipts with them.
  Deleting your ideas keeps their records and so their receipts. A receipt file left behind (another
  program had it open) is removed the next time you add or delete one; a file you put in the
  folder yourself is never touched. If DotAmi stopped half-way through adding a receipt, the next
  add or delete finishes it (after checking the file is the one it started with) instead of
  throwing the only copy away. The Settings page now says the receipts folder sits beside the data
  file, and that copying both is a backup when running from source.
- **Your receipts are encrypted in the desktop app** ([8i], the maintainer's decision of 2026-10-09)
  — each receipt file is locked (AES-256-GCM) with a key that Windows keeps for your Windows account
  only. Windows already keeps other standard accounts out of your data folder; the encryption means
  an administrator account, a copy of the data folder, or the disk read outside Windows can't read
  them either. Receipts you already have are encrypted the first time this version starts, one at a
  time, without ever risking one. Backups still hold your receipts and still restore on another
  computer; without a passphrase the receipts in a backup aren't encrypted, and the backup window
  says so. Losing the key (a Windows profile reset, the data folder moved to another account) loses
  the receipts except those in a backup; Settings, *What DotAmi knows about you* and the note before
  adding a receipt say so. If the key can't be opened, or the key file `receipts.key` is deleted while
  receipts are encrypted, DotAmi changes nothing and never makes a new key over them: Settings, *What
  DotAmi knows about you* and the Expenses page say so in amber, and what to do (put the file back,
  restore a backup, or delete the receipts). The data file itself is **not** encrypted, and Settings says that too. A
  copy run from source has no key store, so its receipts stay unencrypted, and it says so. The very
  first start of a new data folder takes about ten seconds longer: the key is saved only once Windows
  has saved its own part of it.
  Design: [expense-records.md § 9](docs/architecture/expense-records.md#9-encrypting-the-receipts-the-design-2026-10-09).
- **Delete** ([8d]) — "What DotAmi knows about you" gets one Delete button. It opens a list of what
  you can delete: your ideas (with their notes, links and map progress), your figures, your expense
  records, your statements ("In your words", all of them at once, never one by one) and your
  settings. Each box says what else goes with it (deleting ideas also deletes their figures and map
  progress; their expense records stay, counted, as "not attached yet") and has a Learn more. A cited line says Delete doesn't touch your own
  books, and that the CRA says business records are generally kept six years. DotAmi asks twice,
  refuses if anything changed in between, deletes in one step (a failure part-way deletes nothing),
  then wipes the deleted records out of the data file so they can't be dug back out of it. Only
  DotAmi's own window can do this, never an agent. The list says plainly what it doesn't reach yet:
  the safety copies in the backups folder and what the desktop window stored in earlier launches.
  "Remembered columns" has its place on the list, switched off until DotAmi remembers columns.
- **Add from last year's return** ([8f], first step) — a new button under *Your figures*. Drop the
  PDF of last year's return that your tax software saved, and for each T2125 (Statement of Business
  or Professional Activities) in it DotAmi shows lines 8299, 9368, 9369 and 9946, the page each is
  printed on and the amount beside it. Nothing is added to your figures or kept yet: you look, and
  Close forgets the file. A scan or photo, a password-locked PDF, or a return without a T2125 gets a
  plain sentence saying why and what to do instead. The PDF is read on your computer, inside the
  app's window, by Mozilla's PDF reader (pdf.js), which DotAmi pinned and reviewed and runs in a
  separate worker that can't connect to anything.
- **A reader for hledger and Ledger journals** ([8h], core only; no screen yet, so nothing changes
  for you today) — DotAmi's own code for the plain-text books hledger and Ledger keep. It turns a
  journal into its accounts and their monthly totals: dates, transactions, postings, amounts with
  the currency on either side, a point or a comma as the decimal mark, account declarations and
  their types, and comments. Totals are exact cents, one list per currency, never rounded or
  converted; a symbol like `$` counts as a currency only once you say which one it is. Anything it
  doesn't fully understand (include files, periodic or automated transactions, balance assignments,
  value expressions, unknown directives, an amount like `1,000` that one program reads as a
  thousand and another as one) turns the journal away with what it was and its line number, never
  quoting the line. So does a transaction that doesn't add up, including one paid in another
  currency, and a comment block left open over dated lines, which would otherwise make months
  quietly disappear. Descriptions, payees and comments are never kept. It was written from hledger's
  published manual, not from hledger's code (`docs/connectors/journal-reader.md`). Tested on
  invented journals only.
- **"Add from a file" says how far it has been tested** — once a file is read, one line says that
  each accounting program's export was tested on files shaped from that program's help pages, not
  on real exports, so check the columns and totals.
- **Add to my calendar** ([8e]) — beside the Figure reminders tick-boxes on the settings page, a
  button saves a calendar file (.ics) with one repeating event per ticked box: *"Bring your DotAmi
  figures up to date"* on the first day after each month, quarter or year ends. Open it with your
  calendar app or use its Import menu; Google Calendar imports a file only on a computer, at
  calendar.google.com (Settings, then Import & export). No real calendar import has been tested
  yet. Importing the same file twice adds a second copy, and the page says so. The file is made
  inside the page and nothing is sent anywhere. It holds only general words (no amounts, no idea names), because a
  calendar that syncs online shares its events with the company that runs it. The calendar can't
  see DotAmi, so it reminds you whether or not your figures are already in, and the page says so.
- **Saving a file in the desktop app asks where** — a file made in the page (the calendar file, a
  playbook) now opens a Save dialog with the file's own name; Cancel saves nothing. Only DotAmi's
  own pages can start a save.
- **Two-digit years on "Add from a file"** ([8c-3]) — a file with dates like 12-03-05 (Sage 50) or
  03.12.26 (FreshBooks) used to find no dates at all. Now it gets one question, "Is 05 the year
  2005?", with Yes and No, and no totals until it is answered. DotAmi never picks the century
  itself. The answer is for that file only: the next file is asked again. The year is taken to be
  the last number, as in those programs' short dates.
- **Every file's preview says how its dates were read** — above the monthly totals, the earliest
  and latest date in words ("Dates read: 3 December 2005 to 28 February 2006"), to check against
  the file. A date in a month that isn't over yet is included, so a year read wrong can't hide there.
- **"These dates are right" on "Add from a file"** ([8c-3]) — a tick-box beside the "Dates read"
  line that must be ticked before Review opens the agree prompt ("These months are right" for a
  report with the months across the top). Choosing another file, date column, date order or
  century answer empties it again, and going back to an earlier answer doesn't tick it again by
  itself. Retyping the currency or changing the amount column leaves it ticked. The tick is held
  only on the screen; nothing new is kept or sent.
- **Reports with the months across the top on "Add from a file"** ([8c-3]) — a report with one
  column per month, like FreshBooks' Revenue by Client, used to find no column names and add up
  nothing. A new "The file has" choice says whether the file has one row per sale with a date, or
  the months across the top; DotAmi starts on months across only when it finds no dates on the
  rows and a row of month names above some amounts, and says to check it. You pick the row holding
  the month names and where the totals come from: every row added down each month (the file's own
  totals rows left out, while a client whose name starts with "Total" is still counted), or one
  row only, such as the file's Total row. The screen lists the
  columns it read as months and the ones it didn't add (Client, Total). Month names are read in
  English and French with a four-digit year (Jul 2026, juillet 2026, 2026-07, 07/2026); a name
  that only looks like a month (Jul, Jul 26, a whole date) stops the table and the screen names
  the column, rather than guess the year. Left-out cells are listed the way Excel names them (C6).
  These figures go to the agree prompt without a row count: one client row goes into every month,
  so adding the months' counts would show more rows than the file has.
- **A report with no dates says which report to export instead** — Wave's Income by Customer (one
  total per customer, no dates) now gets a sentence naming Wave's Account Transactions report,
  which has a date on every line. Any other file with no date and no month at all is told to
  export a report that has a date on every sale.

### Changed
- **DotAmi's database layer now reads and writes through Prisma's adapter for `better-sqlite3`**
  ([8i], the first step of encrypting the data file; the maintainer's decision of 2026-10-10) — the
  package behind it is `better-sqlite3-multiple-ciphers` 13.0.3 (MIT; SQLite 3.53.4 with an
  encryption extension), with `@prisma/adapter-better-sqlite3` 6.19.3 (Apache-2.0), both pinned. Nothing
  is encrypted yet and nothing looks different: dates are stored as before (whole milliseconds), a
  transaction that rolls back no longer can take another request's write with it, and "database is
  locked" keeps SQLite's words. Measured first: the ideas, map, Expenses and *What DotAmi knows about
  you* pages are within a few milliseconds of before; the start loads the adapter in 16 to 30 ms more
  (`docs/architecture/database-encryption.md` § 14, `scripts/measure-database-adapter.ts`). The
  desktop app keeps only this computer's prebuilt SQLite (2.4 MB) and removes `DEBUG` from its
  server's environment, because the adapter's debug output prints query values.
- **Requests up to 16 MB reach DotAmi's routes whole** (`next.config.mjs`,
  `middlewareClientMaxBodySize`). Next cut every request body at 10 MiB on its way through
  `middleware.ts`, so a receipt near the 10 MB cap (sent as base64, about 14 MB) arrived broken and
  was refused with "Invalid JSON". Each route still has its own, smaller limit.
- **A database update** adds one table, `Receipt`, describing each receipt file; nothing else in
  the data file is touched (a test seeds ideas, figures, links, map progress, settings and expense
  records and checks each after the update), and the app backs the file up first.
- **A database update** rebuilds the expense records table only, so a record's idea can be empty
  (and is emptied, not deleted, when its idea is deleted) and the new fields fit; your ideas, figures, links, map progress, settings and existing expense records
  are kept as they are (a test seeds each and checks it after the update), and the app backs the
  file up first.
- **The desktop app is about 30 MB smaller once installed** (the installer about 8 MB smaller). Its
  server no longer carries the image library sharp (with libvips, LGPL-3.0-or-later) or the
  TypeScript compiler, which Next.js's build copied in although DotAmi never resizes an image and
  never compiles code while it runs, nor the small packages only those two needed. Next's image
  optimiser is switched off in the desktop app, so its address answers "not found" instead of
  reaching for the missing library. Their entries leave the app's licence list; nothing changes on
  screen otherwise. A copy run from the source code is unchanged.
- **A PDF dropped on "Add from a file"** now says it is a PDF and points to *Add from last year's
  return*, instead of "That isn't a spreadsheet".
- **Running DotAmi from its source code no longer reports to Next.js.** `npm run dev`, `npm run build`,
  `npm run start` and `npm run lint` now start Next.js with its anonymous usage reports switched off, as
  the Prisma scripts, CI and the desktop app already did; one small script switches both
  (`scripts/telemetry-off.mjs`), and works the same from cmd, PowerShell and bash. Still to set by hand:
  `npm ci` runs Prisma once on its own, and `npx next` / `npx prisma` typed by hand skip the scripts.
  `npm run dev` still asks npm's registry which Next.js version is newest; nothing turns that off.
  The settings page and README say so.
- **Practice files for Wave, FreshBooks, Sage Accounting and Sage 50 Canadian** (behind the scenes,
  nothing changes on screen beyond the "Add from a file" line under Added) — invented files laid out from each program's own
  help pages, plus Xero's Receivable Invoice Detail, each checked to the cent. They found nine
  things DotAmi gets wrong today, now written down as tests that fail the day each is fixed: a
  refund in a Wave ledger, voided and draft invoices counted as sales, FreshBooks' summary block
  taken for the column names, two-digit years, months across the top and a Wave report with no
  dates (those three since fixed, under Added), a French Sage 50 file with several comma-decimal columns split on its
  commas, and a formula saved with no value reported as an empty amount (those two since fixed,
  under Fixed). See docs/connectors/practice-files.md.

### Documented
- **The privacy log** (`docs/privacy-log.md`) — what each version keeps, sends, ships and asks you to
  agree to, from 0.1.0 on, and what the future privacy policy will need to say. Every change that
  affects it adds a line under [Unreleased]; a test fails when a version has no section.
- **A review of the ways to show iPhone (HEIC) photos as receipts** ([8i]) — every decoder found
  (libheif in WebAssembly, the packages labelled MIT that carry it, two new permissive decoders, the
  graphics chip through Chromium's WebCodecs, Windows' own codec), with its licence, security, size
  and which computers it works on (including that DotAmi's worker policy blocks WebAssembly today, so
  every WebAssembly decoder needs that policy opened first), and a list of options with their costs
  for the maintainer to choose from. Nothing changes in the app: HEIC is still refused
  (`docs/connectors/heic-decoder-review.md`).
- **A design for encrypting the database file** ([8i]) — what it would protect and what it
  wouldn't, the key (wrapped by Windows' per-user protection, never in a backup), why Prisma's
  built-in engine and Node's own SQLite can't open an encrypted file, how the desktop migrator,
  backups and restore would change, encrypting an existing file once without ever losing data, a
  copy run from source (stays unencrypted, and says so), and losing the key. With reviews of the
  three candidate packages (`better-sqlite3-multiple-ciphers` with Prisma's adapter, `libsql`, the
  SQLCipher packages), the choices put to the maintainer with their costs, and the maintainer's four
  decisions of 2026-10-10 (option A, measured first; backups only plus "Start fresh"; a passphrase
  required on every backup; "Not now" and "Never" allowed). Nothing changes in the app
  (`docs/architecture/database-encryption.md`).

### Fixed
- **An encrypted data file left mid-write by a power cut no longer stops every start** ([8i]) — when
  the server was cut off in the middle of a write, SQLite leaves a journal beside the file to undo it,
  and the start's check that the key opens the file was read-only, so SQLite couldn't undo the write and
  every start stopped with "DotAmi couldn't start.". The check now lets SQLite undo the half-done write
  first, with the file's key; a wrong key is refused there and touches none of the data. This bug was on main
  since the data file was first encrypted, and 0.3.0 would have been the first release with it.
- **Turning locking off can't lock DotAmi out** ([8i]) — a safety copy deleted from the Delete menu
  while its encrypted original was still waiting to be wiped no longer stops every later start; a
  readable data file is no longer shown as locked (the lost-key window) just because a wipe was still
  owed; and anything that goes wrong before the swap, such as a full disk, now leaves the file encrypted,
  removes the half-made copy and says why ("Free up some space"), instead of stopping every start with
  "DotAmi couldn't start.". A second rename another program refuses puts the encrypted file back.
- **A French CSV with several amount columns is read on "Add from a file"** ([8c-3]) — a file saved
  with semicolons and amounts like "1 000,00" in several columns (Sage 50 Canadian in French) was
  split on its commas, so no column names were found and nothing was added up. When the commas on
  the lines that split on semicolons sit mostly inside amounts, DotAmi now reads the file on its
  semicolons, also when a description holds a comma ("Design, impressions"). A comma file whose
  commas sit in its text still reads on its commas when a semicolon turns up in it.
- **An Excel formula with no saved value is no longer called an empty amount** ([8c-3]) — some
  programs (Xero says so for its Excel reports) leave a sum for Excel to work out when the file is
  opened, so the cell holds a formula and no number until the file is saved again in Excel. Such a
  row was listed as "a date but no amount". Now it is listed as a formula Excel didn't save a value
  for, with what to do: open the file in Excel, click Enable Editing if it asks, save it, and drop
  it again. DotAmi still never works a formula out itself, so nothing is guessed for that row. The
  same goes for a cell under a month in a report with the months across the top.
- **A FreshBooks file with a summary on top opens on its real column names** ([8c-3]) — FreshBooks'
  Invoice Details puts a short summary ("Total Invoiced, Total Paid" over two figures) above the
  table, and "Add from a file" took the summary's two titles for the column names, with "Total
  Paid" pre-filled as the amount. It now takes the wider row of column names under the summary,
  the one that names the date column. A sheet whose first row of names already says "Date" keeps
  it, and a row you pick yourself is never moved.
- **The desktop app says an update is coming as soon as it finds one.** It used to download the
  new version (about 130 MB) in silence and speak only when it was ready, so at start-up the
  update seemed slow to appear. Now a message says *"DotAmi (new version) is available, downloading
  now"* right away, without blocking the app, and the app's taskbar button fills up as it
  downloads. When it's ready you're asked the same question as before, *Restart and update* or
  *Later*; nothing installs without that click. If the download fails, you're told nothing was
  installed. The version you're running is the one that shows this, so you'll first see it on the
  update after the one that brings it.
- **A start that stops part-way now leaves its reason in the log.** The desktop app's log
  (`logs/server.log` in its data folder) was written in the background, so a start that was ended
  or failed while it updated the database left no line at all, not even "starting DotAmi" (seen on
  2026-10-08 during the update to 0.2.1; the data was unharmed). Every line is now written to the
  disk straight away, including what stopped the start (DotAmi's message and the error's name and
  code), and a start made by the updater says so. If the log itself can't be opened, DotAmi starts
  without it instead of refusing to start.
- **The browser tests no longer trip the app's own rate limits** (developers only; the app's limits
  are unchanged). Every browser test reaches the test server as the same client, so as the suite
  grew it made more settings calls in a minute than a person would, and on a fast computer tests
  failed with "Too many requests" (429). The test server now starts with
  `DOTAMI_E2E_RATE_LIMITS=opt-in` (set only in `playwright.config.ts`; the desktop app removes it
  from its server): a request counts toward a limit only when it names its own bucket in the
  `x-dotami-e2e-rate-limit` header. `e2e/rate-limit.spec.ts` does, and shows the settings limit of
  120 a minute still refusing the 121st request, and that the suite's other requests aren't counted;
  the desktop test shows the switch never reaches the desktop app.
- **A browser-test run can no longer use another run's server.** The run used to start testing as
  soon as anything answered on its port, so when runs from two checkouts overlapped, the second
  one's tests reached the first one's server and database, and the two tests that put bank and card
  accounts straight into the test database found their lists missing. A run now waits for its own
  server to say it is ready, and stops with a plain message when the port is already taken
  (`e2e/port-free.mjs`).

### Security
- **Workers started from DotAmi's own script files can't connect anywhere.** A browser applies a
  worker's own response policy, not the page's, so Next's static files now carry one that allows
  DotAmi's scripts and nothing else. No worker before the return reader loaded from those files.
- **The answer carrying a receipt's bytes has a sandbox policy** (`default-src 'none';
  frame-ancestors 'none'; sandbox`), set in `next.config.mjs` as well as the route, since Next's
  general headers would otherwise replace the route's own. Were it ever loaded as a page, nothing in
  it could run or load.

## [0.2.1] — 2026-10-08

Your figures arrive: totals you agree to on the ideas page, added by hand or from an Excel or CSV
export, with reminders when a month, quarter or year ends without them. Behind the scenes, the
store for business expense records and a bank-file (OFX) reader are in place; neither has a screen
yet. Updating from 0.2.0 adds three small tables to your data file (figures, settings, expense
records) without touching your ideas, links or map progress; the app backs the file up first.

### Added
- **Your figures** ([8a]) — on the ideas page, totals you've agreed to (revenue for now), never
  your transactions. Where they settle a rule, the map uses them instead of your estimates: the
  GST/HST card says what your confirmed quarters add up to, and *"From your records"* with the
  source. Only figures that are exactly a calendar month or quarter are counted; nothing is split,
  converted or added twice, and the card says what it left out.
- **The agree prompt** ([8b]) — nothing counts until you agree: figures grouped by where they came
  from, amounts editable, *Agree* or *No, I'll do it myself*. Closing it confirms nothing, and only
  DotAmi's own page can confirm — the route importers and agents use can only propose.
- **Add from a file** ([8c]) — drop an Excel (.xlsx) or CSV export of your sales and DotAmi
  proposes one revenue total per month, each with how many rows it adds up. The file is read inside
  the app's window and never sent or kept; only the totals you agree to are saved. It finds the
  column names, guesses the date and amount columns only when their names make it clear, asks once
  when a date like 03/04/2026 could be read two ways, reads "1 234,56" and Windows-encoded French
  files, and lists every row it left out with the reason. Macro workbooks, old .xls or
  password-locked files, pictures renamed .xlsx and files over 10 MB are refused with what to do
  instead. Months already waiting or agreed with the same total aren't proposed twice. Every time,
  it first asks where the file is from; a bank or credit card file is turned away without being
  opened, since bank statements aren't supported yet.
- **A "Type column" for files that list a sale and its payment** — QuickBooks' transaction lists
  hold an invoice and then a Payment row for the same money, which was added up twice. "Add from a
  file" now has an optional Type column, pre-filled only when a column is headed exactly
  "Transaction Type" (a bare "Type" column is picked by hand). Rows typed Payment or Deposit are left out of the totals and listed,
  with a note that in QuickBooks they are money received for a sale on another row and a way to
  undo it if they are the person's own sales ("choose None"); every other row counts as before, and
  choosing "None" counts every row. A Deposit made straight to an income account is also left out.
  Nothing about the column is stored.
- **A reminder in the agree prompt**: before the buttons, every time it opens, *"Double-check what
  DotAmi did, and how, before you agree."*
- **Figure reminders** ([8e]) — DotAmi's first setting you can change and keep. On the settings
  page, tick how often you'd like to be reminded to bring your figures up to date: monthly,
  quarterly and yearly, any combination or none. Each idea on the ideas page has a *Remind me about
  this idea* switch, off until you turn it on. Both survive closing the app. The choices sit in the data file in a new small settings table that later
  settings will share, they are listed on *What DotAmi knows about you*, and only DotAmi's own
  window can read or change them. A database update adds the table without touching your ideas,
  figures, links or map progress (a test proves it).
- **An OFX/QFX bank-file reader** ([8g]) — the code that will read the download most Canadian banks
  offer for Quicken and QuickBooks. Nothing on any screen uses it yet, so nothing changes for you
  today; "Add from a file" still turns bank files away. It is built on `ofx-js`, a free package
  someone else wrote, pinned at exactly 1.1.2 after it was read in full. The reader never lets
  an account, branch or bank number out (they are blanked even where a bank printed one in a
  memo, including the other account's number in a transfer between your own accounts), never counts a transaction that hasn't posted, applies the bank's corrections, counts a
  repeated transaction id once, and turns away a file that declares its own document type, two
  downloads pasted together (the package alone would silently keep only the first), a file with an
  unreasonable number of entries, and one it can't read with certainty (an amount like "1,000",
  which could be a thousand or one dollar, is kept as an unreadable row, never guessed). Tested on invented
  statements only.
- **The store for expense records** ([8i], first slice; no screen yet) — DotAmi can now hold single
  business expenses you agree to keep: the day, the amount and currency, who it was paid to and what
  for (your words), a category only if you pick one, and the seller's address and GST/HST number if
  you give them. Like figures, a record is only proposed until you agree to it in DotAmi's own
  window; an agent or a script can only propose; agreeing, taking back and turning down answer only to DotAmi's own window.
  There is no field for a bank or card number, DotAmi never picks a category or marks anything
  deductible, and a purchase can't be dated after your computer's own day. The records are in the
  data file's new expense table and counted on *What DotAmi knows about you*. A database update adds the
  table without touching your ideas, figures, links, map progress or settings (a test proves it).
  The screen to type a record, receipts and the other ways in come in later steps.
- **The reminder banner** ([8e]) — for each idea whose *Remind me about this idea* switch is on,
  and each of monthly, quarterly and yearly you ticked, DotAmi checks the most recent month,
  calendar quarter or year that has ended. If your agreed figures for that idea don't cover it, the
  ideas page and the idea's map say so: *"September 2026 ended and your figures for <idea> don't
  cover it"*, with **Add figures** (opens the figure entry) and **Not this time** (hides it until the
  next period of that cadence ends, and stays hidden after a restart). Only agreed figures count,
  and only ones inside the period: a quarterly figure covers the quarter but not each month for a
  monthly reminder, and three agreed monthly figures cover the quarter. Figures still waiting for
  your agreement don't count, and the banner says how many are waiting. It is worked out from your
  own day and your own figures on this computer, never shows an amount, and is left out when the
  figures can't be read rather than guessing. Your *Not this time* answers are kept inside the
  Figure reminders setting, so they are listed under *Your settings* on *What DotAmi knows about you*.

### Changed
- **"Today" for figures is your computer's own day.** The server used to decide in UTC, so for a few
  hours each Canadian evening it accepted a period ending "tomorrow". It now uses the day on this
  computer, which in the desktop app and a self-hosted copy is your day.

### Documented
- **Business expense records** ([8i]) — a design and a proposed privacy review for keeping single
  business expenses and their receipts, with the options and what each costs, and the maintainer's
  decisions of 2026-10-07 (single records with receipt files). The store for typed records is built
  (see Added); receipts and the screens are not (`docs/architecture/expense-records.md`).
- **A review of the OFX reader package** ([8g]) — what `ofx-js` 1.1.2 does line by line, what it
  does with a document-type declaration, huge or damaged files, repeated ids, pending rows,
  corrections, several accounts and character sets, the five things found and how each is handled,
  a comparison with `ofx-data-extractor`, and how to switch to an edited copy if one is ever needed
  (`docs/connectors/ofx-reader-review.md`).
- **"Totals, never single transactions" now says what is true.** Figures are still totals; the
  privacy review, the figures roadmap, the use-cases plan, the contract and the *Your figures* entry
  on *What DotAmi knows about you* now say that single business expense records are the one place
  DotAmi keeps single transactions, and a record only counts as kept once you agree to it. Receipts are still proposed.

### Fixed
- **"Add from a file" no longer pre-fills a price per item as the amount.** A column named
  UnitAmount, Unit Price, Rate, Price each or Prix unitaire is the price of one item, not what was
  sold: Xero's UnitAmount gave July $150 against a true $350. Those columns are left for you to
  pick; a real line total (LineAmount, Amount, Total Price) is still pre-filled, unless the sheet also has a tax
  column, when a "Total" may include the tax and is left for the person to pick, as before.
- **It pre-fills the invoice date, not the due date.** Names written without spaces (InvoiceDate,
  Invoice_Date) are now read as "date", and a due-date column (including the French
  "échéance") is never chosen by its name; it is pre-filled only when it is the one column that is
  mostly dates.
- **It pre-fills Date in a grouped report with one line per customer.** Customer-name rows and
  "Total for" rows no longer count against the date column. You still check every pick.
- The GST/HST card's CRA source had moved (the old page answered 404); it links to the new page.
- Releases: the workflow creates the draft first, so a release is one draft, not one per file — and
  the workflow file is valid again (that change had made it unreadable, so a version tag would have
  built nothing).

## [0.2.0] — 2026-10-06

The first desktop release: DotAmi in its own window on Windows, with an installer, an update
button, and backup and restore. The installer isn't code-signed yet, so Windows shows "Windows
protected your PC" on first install (More info → Run anyway).

### Added
- **The desktop app** (Windows first; `docs/architecture/desktop-app.md`): DotAmi in its own
  window, its data in one file in the app's own folder (`%APPDATA%\DotAmi`), its server listening
  on this computer only. The window shows only DotAmi's pages; outside links open in your browser.
- **An installer and the update button.** The installed app checks GitHub Releases when it
  starts (and on Help → Check for updates), downloads a newer version and **asks before
  installing it**. Releases are built by CI as drafts and reach installed apps only when the
  maintainer publishes them. Pre-release versions reach only pre-release copies.
- **Backup and restore** (File menu): one `.dotami-backup` file, locked with a passphrase if you
  choose (AES-256-GCM); a restore checks the file first, keeps a copy of what it replaces, and
  refuses a backup from a newer version.
- **Database updates the app applies itself**, keeping Prisma's own bookkeeping (checked against
  Prisma's `migrate status`): it backs the database up before changing it and refuses data saved
  by a newer version or a half-finished update.
- **The settings page** (`/settings`): every planned setting with its default, its warning and
  the task that brings it, plus what is true of this copy today — where the data is, what leaves
  the computer, how updates arrive, how to turn on disk encryption.
- Desktop tests (`npm run test:desktop`): start → describe a venture → close → start again; back
  up on one computer → restore on another. CI runs them on Windows against the packaged app.

### Changed
- Node 22.13 or later (the desktop app's database code uses Node's built-in SQLite); CI and
  `.nvmrc` use Node 24, the version inside the desktop app.
- The Prisma CLI's usage check-in (`checkpoint.prisma.io`) is switched off for the project's
  `prisma:*` scripts and in CI; the desktop app doesn't ship the Prisma CLI at all.
- README and the settings page now say what tools report while you build from source (Next.js
  telemetry, Prisma's check-in during `npm ci`) and how to stop it.

### Security
- **DotAmi answers only on this computer's own address.** A web page could use DNS rebinding to
  read and write DotAmi's data (a request carrying another site's name was answered). Every
  request whose Host isn't `localhost`, `127.0.0.1`, `[::1]` or `*.localhost` is now refused;
  `DOTAMI_ALLOWED_HOSTS` lists extra names for deliberate use on your own network.

### Also in 0.2.0 — earlier changes since the first snapshot (2026-09-20 → 10-03)

#### Added
- `npm run seed` — two invented ventures so a fresh clone shows a working map instead of an
  empty app.
- Per-request Content-Security-Policy on every page; fonts served from this origin instead of
  a third party.
- Byte caps, per-client rate limits and same-origin JSON checks on every write route.
- CodeQL and OpenSSF Scorecard workflows; Dependabot configuration; `.gitleaks.toml`.
- Prettier and `.editorconfig` (configured, not yet part of the gate).
- Node pinned (`.nvmrc`, `engines`) to match CI — Node 20 then; Node 22.13+ / 24 from this release (above).
- Issue chooser, bug-report template, `CODEOWNERS`, `CITATION.cff`, README badges.
- **Browser tests** (`npm run test:browser`, Playwright, `e2e/`): the real build on a fresh
  database, driven like a person — one sentence to a saved map, a stage change surviving a
  reload, the disclaimer footer inside the window. A CI job runs them on every pull request.

#### Changed
- **Database: PostgreSQL → SQLite (2026-09-28).** The whole database is now one file
  (`prisma/dotami.db` by default), so DotAmi needs no database server — the first step toward
  a desktop app. The four list fields are stored as JSON arrays. The eight PostgreSQL
  migrations are replaced by one SQLite starting migration (they remain in git history).
  **If you already run DotAmi on PostgreSQL:** a fresh SQLite file starts empty. Stay on the
  commit before this change until a copy script lands, or re-enter your ventures; nothing is
  deleted from your PostgreSQL database.
- The database layer now has a test: `tests/db-roundtrip.spec.ts` migrates a throwaway SQLite
  file, saves and reloads ventures, links and statements, and deletes the file.
- Stack moved to Next.js 15.5 / React 19 / Vitest 4. The 14.x line had no fix for
  GHSA-p293-qw3h-jr36 (unauthenticated remote code execution on Windows hosts).
- The dev server and the documented Postgres container bind to `127.0.0.1`, not every
  interface.
- `@anthropic-ai/sdk` 0.92 → 0.127 (the optional intake parser's only dependency).
- Recharts removed — nothing imported it after the projection footer was cut.

#### Fixed
- **The landing page and the intake were dead in production builds** (`npm run build && npm
  start`) from 2026-09-21: they were pre-rendered at build time, so their scripts carried no CSP
  nonce and the browser blocked every one — the text box filled, but "Map it" never enabled.
  Development mode renders per request, so it never showed. Every page now renders per request
  (`app/layout.tsx`), as the Next.js CSP guide requires. Found by the first browser test.
- Links built from data the app did not write are restricted to absolute `https:` URLs.
- `deepmerge-ts` forced to 8.x (GHSA-ggr8-5vv4-36mx). It arrives through Prisma's CLI and
  no Prisma release — including 7.10 — has moved off the vulnerable 7.x yet.
- Documents that described a CI job, a hosted deploy and file paths that do not exist.

## [0.1.0] — 2026-09-20

### Added
- First public release: seven catalogs (74 citations) behind a deterministic rules engine,
  the intake, the map, saved ideas, the JSON readout, and the optional local statute store.
