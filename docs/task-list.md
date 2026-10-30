# Task list — what's being built, and what you can pick up

Last updated: 2026-10-27. Every story planned for DotAmi, with its tasks. The plan behind it is
[architecture/use-cases.md](architecture/use-cases.md) (who it's for, the decisions, the build
order); the settings and edge cases each story must test are in
[architecture/settings-and-edge-cases.md](architecture/settings-and-edge-cases.md) — the codes in
brackets match.

**Status:** ✅ done · 🟡 partly done (what's left is listed) · 🔄 in progress · ⬜ not started ·
⏸ waiting on a decision or another story.

**To pick something up:** comment on the linked issue, or open one naming the code (e.g. "[8c]")
and the first pull request you'd send. Every commit is signed off (`git commit -s`, see
[DCO.md](../DCO.md)); content follows [CONTRIBUTING.md](../CONTRIBUTING.md) — cited, dated, plain
English. A story is done when its tasks are ticked **and** its edge cases have tests. Some stories
need a maintainer's decision first (⏸); those are marked.

**Order:** the desktop app → your figures → the Lens → the questionnaire and planning. The map's
content and the project itself run alongside everything. **Changed 2026-10-11:** the future
cockpit (§ 14) is now first, because the maintainer named it the top priority on 2026-10-10; it
takes in the planning pieces of § 10 ([10b] progress, [10c] tasks) and starts § 11's roadmaps as
data. Its design: [architecture/future-cockpit.md](architecture/future-cockpit.md). **Changed
2026-10-20:** phase 2 of the plan for any idea (§ 14 below, [14l]–[14o]) is next. **Changed
2026-10-27:** phase 2 ends with 32b and release 0.5.0; phase 3, in the maintainer's order, is [14p].

---

## 14 — Look inside your future (the future cockpit) · first priority since 2026-10-10

A person starts from where they want to be, in their own words, picks one business or career to look
inside, and sees its whole road at once: every step, the skills it needs, the official fees and the
blank cost lines they price themselves. The cockpit is where they plan it and then do it. The design
and the maintainer's six decisions of 2026-10-11:
[architecture/future-cockpit.md](architecture/future-cockpit.md).

The cockpit's own phases are called **cockpit phase 1** to **cockpit phase 4** ([14a]–[14d]; renamed
2026-10-20), so they never read as the phases of the plan below.

**The plan for any idea** (the maintainer's, 2026-10-17): DotAmi works for any career or business idea,
with every idea tested, calm screens and clean data, built in phases. **Phase 1**, the test gate and the
calm screen ([14j], [14k]), finished on 2026-10-20. **Phase 2, every idea ends honestly in Alberta,
started 2026-10-20:** a person picks the job closest to their work and sees the road written for it, or
an honest "No road is written for this job yet" with *About this job*; a person outside Alberta sees the
federal steps and "Written for Alberta" with their own province named. Its tasks, in order (the codes are
the task ids the pull requests use): 28f → 25s → 28g → the "In a few years" rewording → the equipment fix →
25r-K5 → 25b → 25c → 31a → 28a → 29k → 25e → 29h → 23g → 28b → 29i → 25i → 25h → 28c → the *Incorporating*
fix → 29j → 28d → 30f → 32a → 32b → release 0.5.0. Where each sits: [14l] (28a–28g, 29h–29k), [14i] (25s,
25r-K5, 25b, 25c, 25e, 25i, 25h), [14g] (23g), [14m] (31a), [14n] (32a, 32b), [13g] (30f), [14o] (the
fixes and the releases).

The maintainer's calls for phase 2 (2026-10-20): start it with the tasks an audit added (28f, 28g, 25s,
25r-K5, 29h–29k, 32a and 32b); *About this job* ships without business counts, and only "which area" is
asked for now (the industry question waits for the counts, in phase 3); the area is asked once, right after
the job pick; *Where to look yourself* links Job Bank's general search page with the job's name and code
shown to copy, never the picked job in a web address; if Statistics Canada publishes no official table from
city areas to the economic regions the wage figures use, DotAmi asks "which region are you in?" rather than
working it out; no sending an idea with no road to the maintainers until a privacy policy exists; both known
bugs fixed (the equipment answer on a picked future, and *Incorporating* that can't light on a picked
future); "In a few years" reworded; phase 1's work released now as a small update, before phase 2's data
file changes; the parked pull request #138 closed with its branch kept; and the work in no phase yet
(editing your own path, roads for closing, pausing or catching up, and the cockpit's phase 2 pieces, [14b])
placed in phase 3.

- 🟡 **[14a] Cockpit phase 1 — Look inside one future (Alberta).** About two calendar weeks. Built and
  shipped in 0.4.0; the open items below are what's left (corrected 2026-10-20: this line still said
  "in progress").
  - [x] The design, written before any code ([future-cockpit.md](architecture/future-cockpit.md))
  - [x] Fixes carried in, the first three (#142, 2026-10-11): the uncited $80,000 incorporation
    trigger off the map (the step is now *Incorporating*, cited facts only, lit only while it is the
    selected option, which is your pick or the default until you click; the toggle's *$80K net* option, its sibling step's wording and the export lose the figure too, and
    a test fails on any dollar figure on the map that no cited page sets); the map coloured from your
    own branch picks; the sentence and goals you type at the start saved, dated and word for word
  - [x] Fixes carried in, the rest (#145, 2026-10-11): your own "I'd incorporate at $___" on the
    *Incorporating* step; federal and Alberta incorporation side by side, from their official pages
    (Alberta's registry fees stay named blanks until a person reads the Registry agent product
    catalogue; picking a route and totalling fees come with the cost lines); the GST/HST card quoting
    the CRA's exact two tests, with the uncited 70% "approaching the line" watch
    (`THRESHOLD_WATCH_RATIO`, docs/engines/cfe.md rule 2) gone with it. 2026-10-12: the six pages
    these quote carry a tool check instead of a read date (option B, docs/engines/citations.md § Tool
    checks in the catalogs); none was read by a person then, and since 2026-10-27 the CRA's GST/HST page
    among them says the maintainer read it in full on 2026-10-25 (citations.md, § The maintainer's reads
    of 2026-10-25)
  - [x] Smaller follow-ups from the same fixes (#145, 2026-10-11): "Incorporation for liability/SR&ED"
    lights from an activity tag (Software / SaaS, Manufacturing, AI / ML / R&D) the intake's parser can
    mark from the sentence, and the card now says so, naming the tag; a stage card's chip says
    "default" until the person clicks its toggle, not "your pick" (the playbook export and the readout
    API say "default" too)
  - [x] Ride-share and taxi drivers (#147, 2026-10-11): a kind of work of their own, GST/HST
    registration from the first paid ride (the $30,000 line doesn't apply to them, Excise Tax Act
    s.240(1.1)), and a card on the platforms' reporting to the CRA (docs/engines/compliance.md).
    2026-10-12: the platform-reporting page is recorded as read by the maintainer (2026-10-11); the
    other pages these cards cite carry a tool check instead of a read date (option B)
  - [ ] Ride-share and taxi follow-ons: the keyword reader still marks "platform" and "app" as Software /
    SaaS, so a driver "using the Uber platform" gets that tag too; the platform-reporting card for the
    other activities the CRA lists (selling goods, renting property, personal services)
  - [x] The new `platform-reporting` rule type: approved by the maintainer on 2026-10-12
    (docs/engines/compliance.md, authoring rule 1), as was green for a driver who picked *Voluntary now*
  - [ ] Waiting on the maintainer: decide whether the older cards for a kind of work (hobby vs.
    business, the licensing cards) should name the tag that lit them, as the two ride-share cards do,
    instead of only the province
  - [ ] Liability / SR&ED: ask the person about a liability or research need instead of reading only the
    activity tags
  - [ ] Change the sentence on an idea's card: today it can only be removed, with "Your statements"
  - [x] Any road can be drawn: a road type (columns, steps, forks, skill items, cost lines, each cited
    and dated), the map changed to draw it, and today's map wrapped as *Starting any business in
    Alberta* (2026-10-11: `lib/engines/roads/v2026/`, [engines/roads.md](engines/roads.md); road 0's
    *done when* lines, cost lines and *before you open* steps come with the content)
  - [x] Road 0's content: about three cited *done when* lines on each of today's ten steps, and the
    *before you open* steps (register your business name, look up permits and licences on BizPaL, a
    separate bank account), every source a tool check (2026-10-12,
    `lib/engines/roads/v2026/starting-any-business-ab.ts`; in the cockpit, road evaluation colours the
    three new cards as on your road; drawn without it, the map shows them as "no rule yet")
    - [ ] Still open on it: skill items and official links on the ten map stages; one map stage's
      own sources still point at a page that answers "page not found": *Retained earnings planning*,
      whose "Paying dividends" and "Salary or dividends" shared one old address and have no current CRA
      page found (a person's call). Since 2026-10-13 the other stages' moved sources link their new pages
      with a tool check, `tests/moved-government-pages.spec.ts`; a person's read of each page (those the
      maintainer read in full on 2026-10-25 are recorded: citations.md, § The maintainer's reads of 2026-10-25)
  - [x] Official fees and named start-up cost lines (2026-10-12): every official fee written once, in
    one catalog (`lib/engines/fees/v2026/`, [engines/fees.md](engines/fees.md): its amount, what it is
    for, its place as a code such as `CA-AB`, and its source, each re-checked by the quote tool that
    day), and the roads and the federal way to incorporate name it by id instead of typing the amount
    (no card changed, shown byte for byte); *Sole Prop activation* on today's Alberta road names seven
    start-up costs the person prices (tools and equipment, space deposit, insurance, vehicle, first
    materials, software, money to live on while starting), never an amount DotAmi chose
    ([§ 6](architecture/future-cockpit.md))
    - [ ] Still open on it: Alberta's registry fees stay named blanks until a person reads the Registry
      Agent Product Catalogue; a source for the seven start-up names (the BDC and Futurpreneur
      templates keep them in spreadsheets; the maintainer's call, design § 13)
  - [x] A *Keep your records from day one* step on every business road (2026-10-14): a business must
    keep its records from the start, and records missed early are hard to put back together. Written once
    (`lib/engines/roads/v2026/keep-records.ts`) from the CRA's own *Keeping records* pages: who has to
    keep records and what counts, what the CRA says happens without them, how they must be kept (paper
    or electronic, with backups), and where and for how long (generally six years from the end of the
    last tax year they relate to, and two of the other periods the CRA lists); four cited *done when* lines, every source a tool check that day, no
    read claimed then (since 2026-10-27 the where-and-how-long page's step and line carry the maintainer's read of
    2026-10-25). On today's Alberta road it is a fourth *before you open* step, on the path for every
    idea; on the apprentice road it is first in *Open the doors*, after *Open your own shop*, so it is on
    the path once the person picks their own shop ([engines/roads.md](engines/roads.md))
    - [ ] Still open on it: a person's read of two of the three CRA pages (the maintainer read *Where to
      keep your records…* in full on 2026-10-25, recorded 2026-10-27); whether the step panel should point
      to *Your expenses* as one place to keep expense records (information only, the maintainer's call)
  - [x] What you tell DotAmi is kept: your skill marks (once, for every future), your progress on each
    step, the future's road, ending, your date and the sales at which you'd incorporate, and three new
    kinds of number you agree to (income you want, kept once for you rather than on one future;
    savings for starting; a start-up cost line); listed and deletable on *What DotAmi knows about you*
    (2026-10-11: the storage and its server-side code, `lib/futures/`, with no screen yet; the design's
    open items on each number's time period, the per-person table and the speed of *What you've told
    DotAmi* settled in [future-cockpit.md § 7](architecture/future-cockpit.md). The sales at which you'd
    incorporate stay where the honest-map change keeps them, with the map's answers. 2026-10-12: each
    idea's place is now stored in the data file as its international code, such as `CA-AB` for Alberta;
    every answer kept on a future has its date; one current number per cost line and per idea's
    savings. Still to come, each in the open lines below: the job you pick, the *business / career /
    both* answer, the *This is mine* pin, a step's own date, the catalogs' place keys)
  - [x] Receipts: after each answer, one line saying what it changed ("Because you marked 9 skills: 3
    steps now say needs 0 more"), worked out by running the rules before and after (2026-10-12: road
    evaluation, `lib/roads/`: each step's state with its reason in your own answers, the four gauges as
    counts and sums, and the receipt lines, from one pure function and one words file; no screen shows
    them yet, which the cockpit line below does; [§ 6](architecture/future-cockpit.md))
  - [ ] The cockpit: your destination and four gauges (steps, skills, start-up money, your date);
    *What you've told DotAmi / Not told yet*; the Road, Skills, Money and Rules & tax overlays; the
    step panel with its *done when* checklist, skill marks and three kinds of cost; *Next on your
    road*; the what-if bar; compare the two endings and *This is mine* (kept on the future: one added
    column); the export gains all of it. On today's Alberta road the step panel sets a step's status
    through the map, which keeps it ([§ 7](architecture/future-cockpit.md)); the step panel also moves
    today's lever cards onto the road step, so any road can name its own ([§ 6](architecture/future-cockpit.md))
    (2026-10-12, part 1 built: the goal bar and four gauges, the four overlays, the step panel with status,
    *done when* checklist, skill marks and three kinds of cost through the agree prompt, the lists behind
    the gauges, *Next on your road*, and the lever cards on the road step; a road 0 step's status is kept
    with the step progress, not the map, the line below; [§ 2, Cockpit screen as built](architecture/future-cockpit.md).
    Part 2: *What you've told DotAmi / Not told yet* with a receipt after each answer, the what-if bar,
    compare the two endings, *This is mine*, *Since last time*, and the export gaining it all.
    2026-10-12, part 2 built: *What you've told DotAmi* (each answer with its day and what it unlocked,
    **Change** and **Take back**), *Not told yet* with *I don't know* and the one-question box, a receipt
    after every answer where it was given, the what-if bar with **Keep** and **Clear**, *Compare the two
    endings* with **This is mine** (an ending on a road other than today's kept through its own route);
    [§ 2, Cockpit screen as built, part 2](architecture/future-cockpit.md). After review the same day:
    the forks picked are kept with the map, the default side included; the intake's equipment chip left
    off is not an answer; receipts of answers kept with the map wait for the save; *This visit* named for
    what it holds; Compare without the what-if. 2026-10-13, the maintainer's answer to the PR's
    question 1 (its default): Compare is offered only at a fork whose own pick, not the rules, puts steps
    on or off the path, worked out from the road's own steps (`lib/cockpit/told.ts` `forksToCompare`), so
    not on today's Alberta road, whose sides the tax rules colour whichever is picked.
    Question 2, whether *This visit* carries over between visits, hasn't been asked of him yet and stays
    as built, this visit only)
    - [ ] Still open on it: *Since last time* on a return visit (steps marked since the last visit, dates
      coming up, figure reminders: it needs the day of the last visit, which isn't kept; today *This
      visit* holds this visit's receipts only); the markdown export gaining the told list and the
      ending picked (*Your plan*, the page to read and print, shows both since 2026-10-13, #41; a what-if is
      never kept, so neither shows one); the yearly income question, and taking it back; remembering the last overlay used;
      a *Change* on one of the intake's answers opening that question instead of the intake's first
      screen; receipt lines that name the steps and cards they count; a No to buying equipment survives
      a later save from the intake only if the chip is then switched on or answered again in the box
  - [x] Every region of the cockpit folds and opens with its own button (the venture details, the goal
    bar, the right-hand panel, the legend), remembered in this browser, so the whole road fits a 1280x720
    window; and the cockpit at phone width, issue #4 (2026-10-12;
    [§ 2, Folding and phone width](architecture/future-cockpit.md))
  - [x] Today's Alberta road keeps its step statuses with the rest of your step progress instead of on
    the map, so *Since last time* can list those changes too (the map then reads them;
    [§ 7](architecture/future-cockpit.md)) (2026-10-12, with the cockpit screen: the map's chip shows the
    person's status where they set one; the map's own lists stay worked out from its toggles)
  - [x] The way in: three doors on the front page, *Your destination* (four short questions, a receipt
    after each), *Pick a future*, and *Your ideas* renamed *Your futures*. The *business / career /
    both* answer is kept on the future (one added column) when this screen asks it (2026-10-12: built,
    [§ 1, The way in as built](architecture/future-cockpit.md); the four questions are data in
    `lib/front-door/questions.ts`; a second idea skips *About you*, issue #38; an idea picked there keeps
    its work situation, kind of venture, equipment and revenue estimates as "not said"; answers already
    in the data file count as answered)
    - [ ] Still open on it: *Pick a future* doesn't
      ask the job closest to your work (the OaSIS line below) or draw the road in grey before the pick;
      *What DotAmi knows about you* and its Delete menu still say *Your ideas*; the kind of venture
      (service, product, side gig) isn't asked on this way in (kept as "not said"); whether the place gets an *I don't know* (design § 13)
  - [x] The first written future, *From apprentice to your own shop (Alberta)*: steps from
    Alberta's current trade pages, every *done when* line cited to its step's official page, official
    fees, cost-line names, legal requirements (in the catalog 2026-10-12, every source a tool check,
    `lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts`; listed on *Pick a future* since 2026-10-13, the
    maintainer's yes to listing a road no person has read, its card saying so in amber; since 2026-10-27 it
    also counts, in grey, the 8 sources on the three CRA pages he read in full on 2026-10-25)
    - [x] Its exam, Red Seal and registry blanks looked up again on official pages (2026-10-15): the Red
      Seal application is $150 on Tradesecrets' *Apply Online* page, a fee that applies only sometimes;
      every other blank's label says why it has no amount
    - [ ] Still open on it: Alberta's registry fees (the Registry Agent Product Catalogue stops
      tools, so a person reads them); the Work Experience exam rewrite and panel interview (no page gives
      an amount); the apprentice wage percentages per period (they need a typed field); a person's read of
      each page, which turns its "checked by a tool" into a read (three CRA pages read in full by the
      maintainer on 2026-10-25, recorded 2026-10-27: GST/HST, payroll account, records)
  - [x] The government's skills list (OaSIS) for the job you pick, tagged *your pick of job*; the job
    you pick is kept on the future (an occupation code and the day you picked it: one added column each)
    (2026-10-12: picked from the cockpit's Skills list, names only; today's road lists its GST/HST
    registration as a legal requirement from the compliance catalog;
    [§ 6](architecture/future-cockpit.md))
    - [ ] Still open on it: whether the government's ratings are shown beside the names (the
      maintainer's call); *Pick a future* asking for the job too (that screen is built and doesn't ask it yet)
  - [x] *Show me an example first*: a filled-in, clearly invented example future (2026-10-13: the
    maintainer picked Mara, a new invented person on the first written road; her answers are data in
    `lib/examples/mara.ts`, drawn read-only at `/example/mara` by the same cockpit and road evaluation,
    under a banner that never folds; nothing is saved or stored;
    [§ 1, The example future as built](architecture/future-cockpit.md),
    [docs/ui-spec/example/](ui-spec/example/_index.md))
  - [x] Mara's numbers real, with their sources shown (2026-10-14, the maintainer's option A): her tools
    line from 12 tools' average listed prices at Canadian sellers, her income goal from alis, her what-if
    from ISED, savings and deposit blank; *Where these numbers come from* in the banner
    (`lib/examples/mara-sources.ts`, `lib/examples/stats.ts`, `tests/example-sources.spec.ts`)
    - [x] Review fixes (2026-10-14): Edmonton's additional rate ($4.99) and gross rent ($16.71) listed, as
      Calgary's are; plans billed once a year kept out of the software averages for every maker; the
      panel's intro says every price and statistic is real (not every number); the tools and software
      said to be picked for this example; a test that her three numbers are worked out, never typed; wider
      verdict and framing word lists (`tests/helpers/verdict-words.ts`), also over the example's
      components and the rendered banner, goal bar and what-if bar
    - [x] Her what-if starts empty (2026-10-15, the maintainer's pick A): the visitor types their own if
      they want one, kept nowhere; ISED's $610,300 shown only as context in *Where these numbers come
      from*, labelled an industry average over existing businesses of every age, not a first-year figure
      and not one of Mara's numbers; the what-if bar's example note removed; and her Steps gauge caught up
      with main (road 1 has 17 steps since *Keep your records from day one*)
    - [x] Re-opened on 2026-10-27 (the review couldn't: Autodesk Fusion 403, Busy Bee Tools and Lee Valley
      429, QuickBooks timed out): every Busy Bee Tools, Autodesk and QuickBooks price is the same as on
      2026-10-14. Fusion's personal-use page does show "CA$940 /YEAR (OR CA$120 /MONTH)", once a browser draws
      it (a plain fetch sees no amount: Autodesk fills its prices in with a script). Lee Valley's page showed
      a bot check that was not bypassed, so its clamp price still rests on the two checks of 2026-10-14. The
      Busy Bee planer's page now says it is in stock online, at the same clearance price; its note says both
      days. The software notes' promotion lengths ("for 6 months", "for 3 months", "for a year") are out of
      DotAmi's own words (the QuickBooks and FreshBooks quotes keep them, as the pages wrote them), and so are
      three more time words: Fusion's plans are *Annual* and *Monthly* (they were "1-year term" and "1-month
      term"), alis's rating is of "the job market", and ISED's test of not profitable is "in the data year"
      (`tests/example-sources.spec.ts`, "hold no duration")
    - [ ] Still open on it: the other cost lines on *Open your own shop* (insurance, vehicle, first
      materials, legal advice, money to live on, design software), not researched yet; re-seeing the
      prices when sales end or pages move
    - [ ] Still open on it: the front door's still picture of a filled-in cockpit (§ 1 row 1), drawn from
      her example; the appendix's *Since last time* line, which needs the return visit's list
  - [x] A browser test for the main path: front door → destination → pick a future → cockpit → mark a
    skill → price a line → what-if → compare → *This is mine* (2026-10-14: `e2e/journey.spec.ts`, on to
    *Your plan*, a reload and *Your futures*, plus the *I already have an idea* door to road 0; and
    `e2e/no-verdict.spec.ts`, which fails if any screen of the journey shows advice or ranking words as it
    opens, the journey test doing the same after each thing a person does; the list in
    `tests/helpers/verdict-words.ts`)
  - [ ] Day-5 checkpoint: the gauges, receipts and the Skills and Money overlays running on today's
    Alberta road, for the maintainer to click through. Raise then: *I don't know* on a skill keeps no
    mark (the design's table listed it as a fourth mark; [§ 7](architecture/future-cockpit.md))
  - [ ] The catalogs' place keys (`AB`, `CA`) and the app's own place type moved to international codes
    such as `CA-AB`, as the data file already stores them (2026-10-12). No phase 1 screen needs it; it
    comes before any place outside Canada is added
- ⬜ **[14b] Cockpit phase 2 — Compare futures and your dream numbers.** *(Renamed 2026-10-20 from
  "Phase 2 — Compare futures, dates and your dream numbers", because the plan for any idea has a phase 2 of
  its own; the maintainer placed these pieces in that plan's phase 3 the same day.)* A second written
  future; a shelf of *Possible futures* (business, career, side gig) with *Peek inside*: what the work looks
  like running, the road, skills, costs to start, and your own numbers beside it with no verdict; *Side by
  side* across your saved futures, sorted by one thing you choose, said on screen; *Keep as a copy* for
  a what-if; ~~a time strip from your own dates (each step's own date kept then: one added column); hours
  you want~~ (both dropped under "no times", 2026-10-17; *Your date*, the month the person picks, stays);
  things you won't do, and a dream-life list that adds up your own monthly amounts into your target; *I
  paid this* linking an expense to a planned cost. The approved plan's follow-up to decision 2, whether to
  show typical numbers beside the official fees and your own quotes, is answered (K5 B of 2026-10-16,
  written 2026-10-20): official wage ranges by job may appear on *About this job*, built in the research
  kit's tasks; outlooks don't; start-up costs stay official fees plus your own quotes, no averages
  ([future-cockpit.md](architecture/future-cockpit.md) § 13); survival rates and grant counts not asked yet.
- ⏸ **[14c] Cockpit phase 3 — The Lens helps, on your own model.** Waits on § 9. Your résumé read where it
  sits, proposing skill marks that quote the line they came from, for you to tick; *Ask the Lens* on a
  step, its drafts tagged "drafted by your model, not from DotAmi's sources"; it never writes into your
  own words; where to find a licensed professional for steps that need one.
- ⬜ **[14d] Cockpit phase 4 — More futures, more places.** More businesses and careers; B.C. and Ontario
  versions; futures written by contributors, one cited file per step, through a checker that refuses an
  uncited step.
- ⬜ **[14e] Built to change.** Roads, overlays and questions kept as data the screens read, so the
  layout can change as the cockpit grows without rewriting the rules; each phase reviewed with the
  maintainer before the next is locked.
- ⬜ **[14f] Other ways to build: buy, rent or lease, and where to ask about tax and legal questions.**
  For each start-up cost line, the ways to get it side by side (already have it, buy, rent, lease), each
  with the person's own number and the official tax treatment of that way; the cited rules the person's
  picks bring into view; and a *Where to ask* list of government offices, regulators' directories and
  government-funded advice. Asked for 2026-10-15. Design written, nothing built; every call answered
  (call 1 on 2026-10-15, the rest on 2026-10-16; corrected 2026-10-20: this line still said it waited on
  them); the plan for any idea builds it in its phase 4, its first stage first:
  [architecture/other-ways-to-build.md](architecture/other-ways-to-build.md) § 9.
- 🟡 **[14g] Others in this line of work (the competitive landscape).** An official Statistics Canada
  count of businesses by area and industry, a dated list of public places to look (city licence lists,
  public contract records, ad libraries), a plain line that ordinary ad spend isn't published in Canada,
  the person's own list of businesses they're watching, and later look-ups on the person's own account and
  a list from open data. Asked for 2026-10-15. Design written; calls 1 and 3 to 10 answered, calls 2 and
  11 on hold for research: [architecture/competitive-landscape.md](architecture/competitive-landscape.md) § 12.
  **Built 2026-10-17:** the panel, opened from the goal bar and from *Open your own shop*, with the plain
  line on ad spend, links to the two ad libraries, and *Businesses you're watching*: the person's own list
  for each idea (the name as typed, a link, a note, the ads they saw with the day), kept on this computer,
  deleted with the idea ([ui-spec/cockpit/landscape.md](ui-spec/cockpit/landscape.md)). Still to build: the
  counts, the area and industry questions, *Where to look*, and Mara's landscape.
  - [x] 23g (phase 2 of the plan for any idea): ask the area once, right after the job pick (a fixed list of
    Alberta census metropolitan areas plus *Somewhere else in Alberta* and *I don't know*, each with a line
    saying why it's asked); it is kept for the business counts by area, and nothing reads it until they come
    (phase 3). The wage region for *About this job*
    ([14i]) is not worked out from it: "which region are you in?" is asked right after it, with Alberta's
    eight economic regions listed (the maintainer's call of 2026-10-20; research 25s: the Edmonton area spans
    two regions; designed in [ui-spec/futures/02-where-you-are.md](ui-spec/futures/02-where-you-are.md);
    corrected 2026-10-20). The industry question waits for the counts (the maintainer's call of 2026-10-20).
    Outside Alberta neither question is asked for now: *About this job* shows the province-wide wage figure,
    and the region question is added province by province once each province's region list is checked
    against Statistics Canada's own pages, as Alberta's eight were (the maintainer's call of 2026-10-21).
    Built 2026-10-22 with 28b: both questions on Pick a future's step 2, kept on the idea at Look inside
    (`Venture.landscapeArea`, `economicRegion`, each with its day; migration `20261022000000_where_you_are`),
    shown on *Your plan*; *About this job* reads the region when 25h adds it. Until then step 2 names About
    this job nowhere (its "change your region later", "Alberta-wide figure" and outside-Alberta wage-row lines
    are held; spec 02's as-built note)
  - [ ] Phase 3: the business counts for the area and industry (Statistics Canada table 33-10-1176), the
    industry question, *Where to look* as a dated, checked list, and the rest of the panel
- ⬜ **[14h] Ask the Lens "what's cheapest, fastest, strongest?"** The Lens, and a *Sort by one thing you
  choose* control on screen, put the person's own options in order by one measure they name, with every
  number worked out by DotAmi's code, the gaps counted, and the words "your choice" on screen; questions
  that need a forecast get a plain "DotAmi can't answer that" and where to ask. Asked for 2026-10-15.
  Design written, nothing built; the maintainer's calls answered 2026-10-16 (corrected 2026-10-20: this
  line still said it waited on them), the three questions taken as examples of any question a person may
  ask; the parts before the Lens (the comparison and *Sort by one thing you choose*) come in the plan's
  phase 4, the rest after the Lens:
  [architecture/lens-comparisons.md](architecture/lens-comparisons.md) § 10.
  2026-10-17, the maintainer: no times anywhere, and the Lens may state a number only when it comes from
  DotAmi, a cost link it found or its calculator, never made up (§ 6.4; a calculator and a cost-link tool added).
- 🔄 **[14i] One research kit for every job.** A list of every outside source and its terms, one import
  for the government's job and business data, code keys on every road, and a script that hands whoever
  writes a new road an empty, cited outline, so nothing is built again for each job. Asked for
  2026-10-15. Design written; the maintainer's nine calls (K1–K9) answered 2026-10-16
  (corrected 2026-10-20: this line still said it waited on them; K3 is on hold for research):
  [architecture/research-kit.md](architecture/research-kit.md) § 10.
  2026-10-17, the maintainer: "NO TIMES!", so the kit has no typed times and that task is dropped (§ 5.5).
  Phase 2 of the plan for any idea builds its core, in this order:
  - [x] 25s: two open data questions checked first (2026-10-20): Statistics Canada publishes no ready-made
    table from census metropolitan areas to Job Bank's economic regions (and Edmonton's spans two), so DotAmi
    asks "which region are you in?"; Job Bank's 2025 wage file (Open Government Licence – Canada) has the
    example rows for jobs 72311, 63210 and 21232, each with its geography level
  - [x] 25r, its wage part (K5 B of 2026-10-16), written 2026-10-20: official wage ranges with their area level,
    period and source may appear, outlook ratings don't; CLAUDE.md, future-cockpit.md decision 2, § 12 and § 13
    and research-kit.md say the same, and so do CONTRIBUTING.md, [14b] above and other-ways-to-build.md § 11
    (docs only)
  - [x] 25b, its first part: the source registry ("connector cards", `lib/engines/research-kit/v2026/`) and its
    validator, with a card for each government file phases 2 and 3 ship, the two ad libraries, and the
    never-fetch list (Job Bank's pages, YellowPages.ca, Canada411, Google Maps' consumer site, DOZR, Kijiji, Meta,
    and Google's Ads Transparency Center, whose terms couldn't be read: the maintainer's call of 2026-10-21; still
    a link you open yourself)
  - [ ] 25b, the rest (phase 3; corrected 2026-10-20: 25b was ticked whole): cards for the other sources in
    research-kit.md § 3.2 (Overture Maps, Calgary's and Edmonton's business-licence lists, OpenStreetMap, Google
    Places, Grounding Lite, Yelp, Semrush, Ahrefs, Similarweb, Apollo, ZoomInfo), a "not offered" kind for
    Apollo, ZoomInfo, Ahrefs, Similarweb and the S2.5.26 finds, 22n's rent-price places (Rogers Rent-All,
    Protospace, ENTS) and the 22n list as a view over the registry; the live look-ups wait on the Lens's
    connector powers ([9g]), the place lists on S2.5.26, the rent-price places on their replies
  - [x] 25c: one shared import core (encoding, table id, period, licence and next-release date as data),
    with the OaSIS importer moved onto it unchanged (`scripts/lib/import-kit.mjs`)
  - [x] 25e, its phase 2 part: the jobs each road is written for (road 1: 72311 Cabinetmakers; road 0: no
    particular job), unknown job codes refused, the roads written for a picked job (none is an answer, no
    fall back), a job-links file with an entry only for a job a road is written for, and Alberta's eight
    economic regions as data for the region question, with their source and credit line
  - [ ] 25e, the rest (phase 3, with the industry question; the maintainer's call of 2026-10-20): the 2022
    industry code list (NAICS) imported and checked, the job links' industry candidates checked against it,
    and the census table that cites them (NAICS 2017 at sector level) checked against the 2022 sectors
  - [x] 25i: wages only, from Job Bank's open-data wage file (never its pages), each row with its geography
    level and period; no outlooks. Built 2026-10-21 (the maintainer's word that the build may download the
    2025 file, pinned by checksum): `scripts/import-job-bank-wages.mjs` turns the file in
    `data/job-bank-wages-2025/` into `lib/engines/wages/v2026/`, whose look-ups give the file's own row for a
    job in an economic region or a province as a whole, the level from its source code, and a missing row as
    missing. Not shown anywhere yet: *About this job* (25h) is the first screen to read it
  - [x] 25h: *About this job* for any job, in the right-hand panel from *Look closer*: the job's rules quoted
    word for word, the published wages labelled "Not what a shop earns, and not what you would earn", and
    *Where to look yourself* (Job Bank's general search, with the job's name and code to copy); no business
    counts in this version, and it says so. Built 2026-10-22 (`components/cockpit/about-this-job-panel.tsx`,
    `lib/about-job/`, read on the server by GET /api/futures/<id>): the wage row is the province's own until
    the person's region is kept (Pick a future's step 2, its own pull request; wiring it in is one line in
    `app/api/futures/[id]/route.ts`), so its **Change** isn't drawn yet; its own clutter row
    (`cockpit-about-job`, the first screen added after the baseline, `FIRST_MEASURED` in `e2e/budgets.ts`).
    Pick a future's no-road block shows it in place with its own task (28c). The browser idea sweep (29e)
    opens it for every swept idea that names a job and reads it through the gate's checks
    (`e2e/about-job-read.ts`)
  - [ ] Phase 3: business counts for every industry (25d), the research-pack script (25f), the validator and
    writer's guide (25g), read tools (25k), a second road built with the kit (25l), the rest of the rule text
    (25r)
- ✅ **[14j] Testing any idea (S2.5.29).** The gate every new road and screen passes: a corpus of invented
  ideas run through the app, with invariants a person can read. The maintainer's first pick of 2026-10-17
  (tests plus a calm screen first). Phase 1's part done 2026-10-20 (corrected 2026-10-20: this line still
  said in progress after 29d–29f merged in #187); phase 2's changes to the gate, 29h–29k, are under [14l].
  - [x] 29a: the idea corpus, `tests/fixtures/ideas/v1.ts`, 367 invented ideas with permanent ids, every kind
    of person, place, business or career answer, job category, kind of work and odd case;
    `tests/idea-corpus.spec.ts` holds the minimums
  - [x] 29b: the harness, `tests/idea-harness.spec.ts`: each idea typed, and each idea in Canada picked on
    *Pick a future*; no verdict, no $0 for a blank, every amount cited or the person's own, no times, every
    path ends somewhere honest (every question answered too), nothing derived, the same output; the known
    gaps listed with their stories (`tests/fixtures/ideas/known-gaps.ts`), the list only shrinking; writes
    `test-results/idea-coverage.md`. It reads the lines the app code it calls writes, plus every plain
    sentence in the words files for times; whole screens wait for 29e
  - [x] 29c: `tests/helpers/number-provenance.ts`, every amount an official fee, the person's own, a quoted
    threshold or a sum of those (the Lens's reply guard reuses it later)
  - [x] 29d: property tests over the whole answer space, `tests/idea-properties.spec.ts` with `fast-check`
    (test-only, ships nowhere): generated places, kinds of venture, work situations, structures, kinds of
    work, map picks, sales at and around the CRA's $30,000 line, figures, what-ifs, "I'd incorporate at",
    marks, statuses, quotes, savings (blank, $0 or a number) and dates on both roads, held to the harness's
    invariants through the same code, plus: taking an answer back restores the run before it; a quote never
    raises the "not priced" count; a blank is never $0; the same input gives the same output; road
    evaluation's sweep names exactly the answers a step's colour depends on; the line is exceeded, never
    reached; the person's own figures beat the estimate once they settle the CRA's test (a coverage count
    of the runs that reached it, 0 fails; review of PR #187). Fixed seed in CI (`IDEA_PROPERTIES_SEED=random` locally); a failure prints the seed and the
    smallest counterexample; `tests/idea-properties-plants.spec.ts` breaks the product and sees it caught
  - [x] 29e: `e2e/idea-sweep.spec.ts`, eight fixed ideas and four that rotate by ISO week, each from the front
    door to the plan in the browser both ways in, every screen read for verdict words, time words and the
    clutter measurer (`e2e/clutter-measure.ts`, shared with the clutter limit); findings listed in the file's
    `SCREEN_GAPS`, never fixed quietly. Two on 2026-10-19, both the maintainer's call: *Your destination*'s
    first question says "In a few years" (the front door's known gap, in a file the words scan doesn't read;
    reworded 2026-10-20 on his pick "Reword both", taken out of `SCREEN_GAPS`); and a first visit with the person's words kept shows them in a 13th text size (17 px) against the cockpit's
    budget of 12, measured on a visit with no words (gone with the type scale, 2026-10-20: the words are the
    title size, one of the six, and the cockpit counts 5 sizes either way; taken out of `SCREEN_GAPS`)
  - [x] 29f: `npm run eval:intent` (`scripts/eval-intent.mjs`), the AI parser on the developer's own key, scored
    against the corpus (kinds of work, province, buying equipment), a table and `test-results/intent-eval.md`;
    refuses to run without a key, exits at once in CI, not in `npm test`; `--fallback` scores the keyword
    parser instead; later hosts the Lens question set
  - [x] 29g: the rule that a new road or screen adds 10 ideas that should reach it and passes the harness
    ([engines/roads.md](engines/roads.md) rule 13, [CONTRIBUTING.md](../CONTRIBUTING.md))
  - [x] The six bugs the harness found, fixed (phase 1 batch 2, 2026-10-17): "I'd incorporate at" asked only
    where an answer changes the road (a third-year estimate to compare it with, and Incorporation timing
    on the side that holds the step); no map pick asked that no rule reads (GST timing for
    drivers); the keyword parser's places, kinds of work and equipment proposed only when the words state
    them; no duration in road 1's first step. Their "bug" entries left `tests/fixtures/ideas/known-gaps.ts`.
    Nothing still listed for the maintainer: the front door's "in a few years" reworded 2026-10-20 ("Reword
    both"), equipment on a picked future fixed the same day (below), and "Incorporating" on a future picked on
    road 0, which couldn't light at all (Pick a future keeps no third-year sales estimate and nothing in the
    cockpit asked for one), fixed 2026-10-21: the cockpit now asks for the estimate ([14o])
  - [x] Equipment on a picked future answered and kept (the maintainer's "Yes, fix both", 2026-10-20): the
    box's answer takes equipment off the not-said list, so it is saved, read back and asked no more; taken
    back, it is not said again. Its "bug" entry left `tests/fixtures/ideas/known-gaps.ts`
- ✅ **[14k] A calm screen, kept calm by a limit (S2.5.30).** The maintainer's first pick of 2026-10-17,
  with testing any idea: a calm first view, enforced by a limit on how busy a screen can get. Phase 1's part
  done 2026-10-20 (#179, #183, #184); phase 2's screen review, 30f, is [13g].
  - [x] The layout rule: one primary thing per screen (on the cockpit, the road); new features open in the
    right-hand panel or the step panel, never as a new region; the first visit shows the least; everything
    folds and is remembered; and where each planned feature lands
    ([ui-spec/README.md](ui-spec/README.md), "The layout rule")
  - [x] The clutter limit: a browser test measures ten main screens at phone, tablet and laptop sizes
    (regions, controls in the first window, text sizes, the smallest text) and fails when one goes over its
    budget in `e2e/budgets.ts`, or shows a block with no region mark; the budgets start at today's numbers
    and can only go down
  - [x] The calm first view ([architecture/future-cockpit.md](architecture/future-cockpit.md) § 2, *First
    visit and return visits as built*): road and skills on, later columns folded into *The road ahead*, one
    coach line, the rail, the legend and the what-if bar folded one click away (the legend and the what-if bar
    from *Look closer* since 2026-10-20), every overlay switch drawn; Compare and
    *Others in this line of work* behind one *Look closer* menu (*About this job* joins it when built); the
    last overlay remembered (`dotami-cockpit-folds`); on a phone the coach line sits under the road, so the
    road starts where it did before (S2.5.30c)
  - [x] The budget for that first view. The plan aimed at 5 regions and 20 controls at 1280 px (3 and 12 on a
    phone); the built view measures 8 regions (7 on a phone; 9 and 8 before) and 29 controls on a laptop (32 on
    a tablet, 18 on a phone), with what is left being the road's own cards, the gauges and the next steps. The
    maintainer, 2026-10-17: *"Accept the clutter budgets where they landed."* `e2e/budgets.ts` held those
    numbers, and they can only go down from here.
  - [x] Show the legend and Show the what-if bar into *Look closer* (the maintainer's pick, 2026-10-20, over
    raising Mara's example's laptop limit from 21 to 23 once the type scale's fix brought the two buttons back
    into view): the cockpit on road 0 now 27 controls on a laptop, 29 on a tablet, 17 on a phone; road 1 23 and
    25; Mara's example 21 and 23 (`e2e/budgets.ts`, lowered to CI's counts)
  - [x] Six named text sizes in place of the ad hoc ones (S2.5.30d, 2026-10-17): `text-label` 9.5 px,
    `text-small` 10.5, `text-body` 13, `text-lead` 15, `text-title` 19 and `text-display` 28, theme tokens in
    `app/globals.css`, each with its line height, in place of 661 arbitrary sizes of 23 values (and Tailwind's
    text-xs, text-sm, text-base and text-lg, which they stand in for); headlines keep Tailwind's text-xl and up.
    `tests/type-scale.spec.ts` refuses a new arbitrary size; `tests/helpers/type-scale-renames.ts` reads the
    map's and the cost panels' recordings with the new names so they aren't re-recorded. The smallest text on
    every screen is now at least 9.5 px, and the text-size counts in `e2e/budgets.ts` went down on every screen
    ([ui-spec/README.md](ui-spec/README.md), *The type scale*). Each named size is the largest of the old
    sizes it stands in for, so no text is smaller than before: the default running text stays 13 px, and
    text that was 11 or 12 px grows to it
  - [x] The cockpit rail's sentences moved into `lib/cockpit/words.ts` (S2.5.30e, 2026-10-17): the rail's,
    the header's, the empty cockpit's and the map's chips, card names and legend (68 pieces of text in five
    files), the text on screen unchanged; `tests/cockpit-own-words.spec.ts` reads every file in
    `components/cockpit/` and fails on a sentence or label written there (one allowance: the legend's
    *Compass, not GPS — nothing here is a recommendation*, see the test), in place of the three older
    four-word checks over named files
- ⬜ **[14l] Any idea to any job or business, Alberta first (S2.5.28).** Phase 2 of the plan for any idea.
  Today every idea typed in is drawn on the general road, *Starting any business in Alberta*, without
  saying so. After phase 2 the person picks the job closest to their work; the road written for that job
  comes first, or the screen says plainly that no road is written for it yet and offers *About this job*
  ([14i]) and the general road.
  - [ ] 28f: research the free tools, datasets and repos that already match a person's words to the
    government's 2021 job classification (NOC), before building the search; a dated findings note (today's
    search finds the expected job for 20 of 219 test ideas)
  - [x] 28g: design phase 2's screens before building them, in `docs/ui-spec/`, shown to the maintainer:
    where the job question sits on both ways in, what *Skip* leads to, the one place the area is asked, and
    the "not written yet" screen (2026-10-20: [ui-spec/futures/](ui-spec/futures/_index.md) steps 1 to 3 and
    outside Alberta, [ui-spec/cockpit/about-this-job.md](ui-spec/cockpit/about-this-job.md) and
    [ui-spec/cockpit/incorporating-estimate.md](ui-spec/cockpit/incorporating-estimate.md); nothing built yet.
    The maintainer's calls on them, 2026-10-21: the typed way ends on the same three steps; no region question
    outside Alberta for now; a job with no written road saves nothing; the what-if **Keep** bug is fixed with
    the *Incorporating* fix)
  - [x] 28a: import the classification's elements file (example job titles and "Employment requirements")
    on the shared import core, with its checksum, licence and credit line; and the OaSIS "Example Titles"
    file beside it (`scripts/import-noc.mjs`, `scripts/import-oasis-titles.mjs`; both in `npm run data:check`
    and on `/licences`)
  - [x] 28b: *What's closest to your work?*: the person searches the example titles and picks the job;
    matches in code order, labelled "matches your words · your pick"; *Skip* allowed; nothing set without a
    click. The search itself is built (`lib/engines/oasis/v2026/title-search.ts`, with DotAmi's word list the
    maintainer approves line by line): 150 of 220 corpus ideas find their job in the group shown first, as the
    screen lists it (each group's first 50; 153 counted past that cap, the number this line gave until
    2026-10-23), against 20 before. Built 2026-10-22: step 1 of Pick a future's three steps, on Pick a future
    and at the end of the intake (`components/front-door/job-and-road-steps.tsx`, searched on DotAmi's own
    server, `POST /api/jobs/search`), and the cockpit's **Pick a job** runs the same search. Step 3 lists the
    road written for the picked job first (spec 03, case A); a job with no road gets the honest line, a marked
    place for *About this job* (25h fills it) and the general road, and saves nothing until a future is opened
  - [x] 28b-2: whole words first (the maintainer's call a-call-11, 2026-10-23): inside each group, the jobs
    one of whose titles holds, word for word, as many of the person's words as the group counts (all, all but
    one, at least one), then the rest, each part headed in that count (the #206 review) and in code order, the
    closest group open whole. On the corpus: 152 in the open group (was 150),
    181 listed (was 172), none that was listed drops out; "I build custom kitchen cabinets" lists
    Cabinetmakers on row 10 (was not listed)
  - [x] 28c: the road written for the picked job comes first; otherwise "No road is written for this job
    yet", with *About this job* and the general road; no silent fallback for a new idea; a job with no written
    road saves nothing until a future is opened (the maintainer's call of 2026-10-21; a kind of saved idea with
    no road may come in phase 3 with the career road). Closed 2026-10-22 by 28h: *About this job*'s rows in place
    on step 3's no-road block (Pick a future and the intake), and the goal bar's line saying why the road drawn is
    the one drawn (written for your pick of job, not written for it, or saved before a road was picked)
  - [x] 28h: the batch 4 follow-up (2026-10-22): 28c above; *About this job*'s **Change** for the region (Alberta
    only, kept with its day) and step 2's three held lines about it drawn again; and the maintainer's calls on
    the batch 4 page: a silent fallback can't be listed as a known gap (32), *Not here yet?* opens the federal
    steps outside Alberta (33), the federal card counts only the pages that person is shown (34), an Alberta
    future picked from outside Alberta is an honest end while both labels say so (35), the typed way's last
    step at 5 text sizes (37) and, with the job skipped, its own row at 6 controls on a tablet (38). Known gaps
    22 → 0 ideas (`tests/fixtures/ideas/known-gaps.ts`). Changing your place after a pick (the maintainer's note on calls 33 and 35: someone whose dream is to open shop somewhere else, or who picked by mistake) is its own story, not this one
  - [x] 33a (S2.5.33's bug, 2026-10-23): *Change* on the place row of *What you've told DotAmi* changes this
    idea's place in the cockpit's one-question box, where it opened the intake and saved a second idea; the
    rules and tax cards, fees, sources and map follow; a road written for Alberta stays drawn with its honest
    line; the Alberta area and region aren't shown outside Alberta (About this job, Your plan), still kept for
    a later history (`e2e/place-change.spec.ts`, `tests/places-and-programs.spec.ts`). The full Change box,
    the history and outside Canada are phase 3 (a-call-8, a-call-9, a-call-10). Second review, 2026-10-24: ticks
    kept across a change of place (by the storage and the cockpit, `ticksToSave`), its receipt names only the
    place, a quote kept on a cost line the place leaves out named and not counted, skill items, empty sections
    and Pick a future's card counts drawn for the place, and the rail's prep tools by place
  - [x] Pre-release numbers and amounts (2026-10-23, the screen review 30f and the maintainer's reading list):
    Export is the road on screen, its steps, done-when lines, cost lines and the place's sources
    (`lib/playbook/road-export.ts`); Compare and the Rules & tax switch count the cards one way; the money gauge
    names the official fees waiting on a fork, so it adds up to Compare; the vehicle caps are Income Tax
    Regulations s.7307's $350 / $300 and $1,100, and the Small Business Financing Program says ISED's own words
    with no 365-day line (both sources checked by a tool, on the reading list, then read in full by the maintainer
    on 2026-10-25); About this job says "as
    published" beside two equal wage levels (`tests/prerelease-numbers.spec.ts`)
  - [x] 28d: outside Alberta, the federal steps that apply everywhere, plus "Written for Alberta" with the
    person's own province named; Alberta-only steps and pages left out (full B.C. and Ontario roads come
    later). Built 2026-10-21 (`lib/engines/roads/v2026/federal-steps-ca.ts`, 13 steps; *Pick a future* lists it
    first outside Alberta, Alberta's two folded; the goal bar, the plan and each step's sources name the
    province; Export lists the same sources, 2026-10-22; *Your destination* counts it as written for all of
    Canada, apart from the place's own, 2026-10-22). Both questions asked in its pull request were answered by
    the maintainer on 2026-10-22 and built in 28h: *Not here yet?* opens the federal steps outside Alberta, and
    an Alberta future picked from outside Alberta is an honest end while its card and the cockpit both say so
  - [ ] 28e (phase 3): one career road for any job
  - The test gate learns these endings ([14j]'s harness, reopened for phase 2):
    - [x] 29h: the harness picks a job as a recorded click and accepts the honest "not written yet" ending;
      a job the person didn't pick still fails (`tests/helpers/idea-pipeline.ts` `stepsChoice`; the browser
      idea sweep plays the three steps too, 2026-10-22). Both find the job through step 1's search from the
      person's words (the kind of work, then the job's own name), never by its code, so a broken word search
      fails them (PR #202 review; all 220 corpus ideas with a job find it: 172 from the kind of work, 48 from
      the job's name)
    - [x] 29i: a number kind for a published job fact (a wage with its source row); a wage without its row
      fails, and a wage is never added into a total (`tests/helpers/number-provenance.ts`; About this job's
      pieces carry their row when 25h adds them)
    - [x] 29j: a federal-only road counted honestly, the browser sweep reading any road, and a written way
      for a new screen to get its clutter budget (2026-10-21: the corpus's 156 business ideas outside Alberta
      expect the federal road; the picked way's "road written for the place" gap fell from 190 ideas, mostly
      because the test's person now clicks the federal card for those 156, not because of the product alone
      (`tests/fixtures/ideas/known-gaps.ts` has today's count); the sweep opens any catalog road, fails on one
      without a budget, and clicks a folded Alberta card every week with fixed idea 361. The written way:
      `ADDED_SCREENS`, `ADDED_SCREEN_PART_OF` and `FIRST_MEASURED` in `e2e/budgets.ts`, used for About this job,
      the three steps' parts (2a, 2b and step 3's cases A, B and C on both pages; the intake's case C counts 6
      controls on a tablet, accepted as its own limit by the maintainer's call 38 of 2026-10-22), Pick a future outside Alberta and
      the cockpit on the federal road)
    - [x] 29k: quoted official requirement text, shown word for word as a labelled quote, passes the
      no-times check by one rule (the maintainer's ruling), while DotAmi's own words still fail on any time
      (`tests/helpers/official-quotes.ts`: only on About this job's requirements row, and only lines the run
      read from the shipped file, so 25h hands the harness 28a's lines for the group it shows; the verdict
      check too, for group 53200's line only; 28a's importer still runs the verdict check over every shipped
      line, as the design says)
    - [x] 37a (moved here from S2.5.37: it needs no new data): the same idea, job and answers in all 13
      provinces and territories (`tests/province-swap.spec.ts`, four ideas, both ways in): no other province's
      step, source, *done when* line, link, cost line, way to incorporate or wage row; the federal set the same
      in every run on a road built from the map; *About this job*'s wage row the place's own; every source,
      *done when* line, fee and way to incorporate the catalogs write for the run's own province shown. A filter
      that ignores the place (the ways to incorporate, a step's sources, the wage look-up) fails naming what
      leaked and where; one that leaves out the person's own province (a step's sources, the ways to
      incorporate) fails naming what is missing and where. Found 2026-10-22 and fixed 2026-10-23 (the
      maintainer's call a-call-12): in Alberta, road 0's *Hire first employee* showed Ontario's and British
      Columbia's employment-standards pages; every road now shows a step's sources for the person's own place
      (and, since the pull request's review, only the *done when* lines, cost lines and links resting on those
      pages, the rest counted in the same line: `roadForPlace`),
      the step cites Alberta's own page (checked by a tool, then read in full by the maintainer on
      2026-10-25), and `PLACE_GAPS` in
      `tests/fixtures/ideas/accuracy-gaps.ts` is empty
    - [x] 37b (moved here too): the corpus reworded (capitals, lower case, a typo, another order, emoji, no
      accents, the city swapped for its province, French; `tests/rewording.spec.ts`) keeps the province the
      words name, the job found by the person's words on step 1, and step 3's roads; Lloydminster never sets a
      single province; "Calgary"/"calgary" and "Québec"/"Quebec" are planted controls. Found 2026-10-22, listed
      with no story yet, waiting on the maintainer's call: a misspelt word in the kind of work finds the job only by its own name (84 of 220
      ideas). Fixed 2026-10-23 (the maintainer's call a-call-14): "à Regina" in French names Saskatchewan, as
      "in Regina" does; the parser reads "à", "au", "aux", "en" and "dans" before a place and the provinces'
      French names (French rewording gaps 1 → 0; a planted control in `tests/rewording-plants.spec.ts`)
    - [x] The idea harness's time budget (60 s) is held on the run's own CPU time, not the wall clock, and a
      run keeps step 1's search answers for its own length: about 36 s alone before, 27 s after on this
      machine; under the full parallel run the wall clock had reached 60.5 s and 65.7 s
- 🔄 **[14m] A clean data pipeline you can see (S2.5.31).** Every government file DotAmi imports is checked
  offline on every pull request, so a changed file can't slip in unnoticed.
  - [x] 31a (phase 2): `npm run data:check`, every importer's check run offline inside `ci:quality`; it
    fails on a checksum mismatch or a changed regenerated file
  - [ ] Phase 3: importers for the business counts, the census table linking jobs to industries
    (98-10-0594-01), Red Seal's tools appendix and Job Bank's postings, each with pins, licence, period and
    next release; a link checker (31b); a weekly freshness check that opens one issue (31c); a *Where
    DotAmi's numbers come from* page (31d)
- 🔄 **[14n] Best results without analytics (S2.5.32).** Nothing comes from the people using DotAmi;
  quality is measured from the tests.
  - [x] 32a: each CI run writes the harness pass rate, how often the expected job is among the matches, how
    many ideas reach a written road, the general road or "not written yet", silent fallbacks (0), clutter
    numbers per screen and width, and source health; each release's changelog gets a Quality line.
    `npm run quality:report` (scripts/quality-report.mjs) prints them and writes `test-results/quality.md`,
    in CI after the tests (the quality job) and after the browser run (the clutter); `npm run quality:line`
    gives the release's Quality line, which says so for any part the run didn't count (the live quote check
    too) and, made on Windows, counts the clutter with the Windows allowance. Information only: no number
    fails anything yet. Silent fallbacks
    counted on 2026-10-21: 37 ideas (the aim, 0, is phase 2's end). Counted on 2026-10-22, typed in: 323 of
    367 ideas on the general road, 44 before any road, 0 of the 11 ideas with a road of their own (road 1)
    reach it. Since 2026-10-22 (the maintainer's call 32) silent fallbacks do fail: the idea harness fails
    when any idea lands on a future not written for it with nothing on screen saying so, even one a known gap
    lists (`silentFallbackProblems` in `tests/helpers/idea-harness-run.ts`, with planted controls); the
    report counts step 3's own fallbacks on their way in too
  - [ ] 32b: the maintainer's first monthly walk, three test ideas plus one of the maintainer's own, with
    the findings turned into issues or test ideas
- 🔄 **[14o] Phase 2's fixes and releases.** The maintainer's calls of 2026-10-20.
  - [x] Reword "In a few years" (the front door's first door, and the first question on *Your
    destination*), so DotAmi's own words carry no span of time; the two known-gap entries removed with it
    (#189)
  - [x] Keep the answer to "Are you buying equipment, a vehicle or tools?" on a future picked on *Pick a
    future* (it was lost; 323 of the 367 test ideas met it) (#190)
  - [x] Let *Incorporating* light on a future picked on the general road, as designed in
    [ui-spec/cockpit/incorporating-estimate.md](ui-spec/cockpit/incorporating-estimate.md): *Not told yet*
    asks for "Your third-year sales estimate" (before "I'd incorporate at"), the step's panel holds that box
    above the "I'd incorporate at" box, and taking the estimate back puts the future as it was picked; the
    not-said id `sales-targets` split into `sales-target-year-1` and `sales-target-year-3`, an old saved
    `sales-targets` read as both, except a first-year number already kept with Keep, read as said (234 of the 234 test ideas picked on the general road can now light it;
    0 before). The same pull request fixes the what-if **Keep** bug (the maintainer's call of 2026-10-21):
    **Keep** now also marks the first-year target as said, so the rail and the plan show the number the road
    reads, and the third-year target stays "Not said". On an intake idea the same row asks a blank Year 3, and
    *Change* on a given third-year number opens the cockpit's box instead of the intake; a sales number above
    the save's $1,000,000,000 cap is refused in the box and the what-if (the review of #198)
  - [x] A small release of phase 1's work (the calm first view, the six text sizes, *Look closer*, the
    harness's fixes) before phase 2 changes the data file: 0.4.1 (#188), published 2026-10-20
  - [x] The pre-release fixes of the screen review (30f) and the reading list, merged on the maintainer's word
    2026-10-25 to 27, in his order: #207, #206, #208, #210, #209, each brought up to date with main by a
    merge first; what each merge found and fixed is in its pull request, and how a cloud session did it is
    [verification/cloud-sessions.md](verification/cloud-sessions.md)
  - [ ] #211, the reading list's corrections with the maintainer's 31 reads of 2026-10-25: the networked
    `node scripts/check-quotes.mjs` run it waited for found every quote on 2026-10-26 ([11b]); waits for his
    merge word
  - [ ] Release 0.5.0: no silent fallbacks, every Alberta test idea ending on a road written for it or an
    honest "not written yet", the maintainer's walk done (32b), a Quality line in the changelog, the privacy
    log's section for the new version; publishing is the maintainer's click
- ⬜ **[14p] Phase 3, honesty first.** The maintainer's order (d-call-1), after release 0.5.0:
  - [ ] Cards in official words: DotAmi's own tax and legal wording on cards becomes the pages' own words or
    nothing. Planned 2026-10-24, his 15 calls of 2026-10-25:
    [architecture/cards-in-official-words.md](architecture/cards-in-official-words.md). Builds after #211
  - [ ] Rules for each kind of work (sector rules): BizPaL first, with a person running its searches; the
    first 12 (ride-share GST, Alberta low-risk home food, the AHS food permit, a federal food licence, child
    care over 6, AMVIC, AGLC, RCMP, drones, a Calgary home business, personal services, platform GST)
  - [ ] Freshness: each source's next release date, a weekly check, a health state per source, and effective
    dates, status and previous value for fees and rules (with 31b and 31c above)
  - [ ] Accuracy tests
  - [ ] The data kit: business counts by town, the census's self-employed, labelled averages beside a
    calculator (the Phase 3 lines under [14i])
  - [ ] The hairstylist road, the second road
  - [ ] Also on the list: next steps backed by reality on every card, only from official pages (his note of
    2026-10-25); changing your place later with one Change box for every answer (S2.5.33); everything you can
    apply for and write off (S2.5.38); public information on other businesses (S2.5.39); DotAmi as a local
    MCP server, read-only and off by default (S2.5.40)
  - [x] Two questions his reads of 2026-10-25 left open, both answered on his reading page on 2026-10-29: the
    table's rows say Ontario "13%" and Alberta "5%" (Alberta's line now says only the 5%), and for s.67.3 his
    pick A, the title names only the section the page holds, with a plain-English line under it saying what the
    page holds (whether every source gets one is his question, S2.5.41). The questions: what the CRA's rate table
    shows for Ontario and
    Alberta (citations.md § Blocked, 1 and 2), and whether the s.67.3 citation's title or its address changes
    (the title names four sections, the page holds one)

## 7 — The desktop app (one download, everything on your computer)

- ✅ **[7a] SQLite database.** One file, no database server (#60).
- 🔄 **[7b] The Electron app** — the same screens in their own window
  ([how it runs](architecture/desktop-app.md); `npm run desktop:build && npm run desktop`).
  - [x] Build Next.js as a self-contained server the app can start
  - [x] Electron starts it on a private local port and opens a window on it
  - [x] The same port on every launch, from the data folder, so the window's browser storage (how the
    cockpit was left) lasts between launches; another port only when that one is taken (2026-10-17)
  - [x] The database file in the user's own app folder; created and migrated on first launch
  - [x] App menu: about, quit, open data folder
  - [x] A test: start → describe a venture → close → start again → it's still there
  - [x] An installer you double-click (`npm run desktop:installer`; the same test runs on the packaged app)
  - [x] A Windows build from CI, with the desktop test on the packaged app (Mac and Linux after)
- ✅ **[7c] Backup, restore, moving to a new computer** (desktop app, File menu;
  [how it works](architecture/desktop-app.md#backup-and-restore-7c)).
  - [x] *Back up* copies the database file; locked with a passphrase, optional at first and required
    for every backup since 0.3.0 ([8i]; older backups without one still restore)
  - [x] *Restore* checks a backup before replacing anything, and keeps a copy of what it replaces
  - [x] Setup suggests turning on disk encryption (the settings page, Windows Home and Pro)
  - [x] A test: back up on one computer → restore on another → the same ventures
- 🔄 **[7d] Installers and automatic updates** (unsigned, through GitHub releases, for now;
  [how to release](architecture/desktop-app.md#releasing-an-update)).
  - [x] A Windows installer built on each version tag, uploaded to a draft release (Mac and Linux after) —
    the workflow file was unreadable from #77 until its fix on 2026-10-06; v0.2.0 was built before it
  - [x] The app checks for updates, downloads, and asks before installing; pre-releases only reach pre-release copies
  - [x] It says so the moment an update is found and shows the download in the taskbar; the start-up log is written straight to the disk, so a start that stops leaves its reason
  - [x] The check starts as the app opens, before the server and the first page, and its message waits for the main window (never over the preparing window or the lock question) (2026-10-14)
  - [x] Before a database change, the app backs up the database (and refuses data from a newer version)
  - [x] Proven end to end: a published release reaches an installed app (by hand, on the maintainer's computer: 0.2.0 → 0.2.1, 2026-10-08; not an automated test)
  - [x] Third-party licence notices: the installer carries `THIRD-PARTY-NOTICES.txt` (every package that
    ships, its version and licence text, written at build time; packaging stops if one is missing), shown
    at Help → Licences and from Settings → Updates
  - [x] The server leaves out what it never loads: sharp with libvips (LGPL) and the TypeScript compiler,
    with what only they pull in (about 30 MB; the build stops if something still needs one, a desktop
    test fails if one comes back)
  - [x] Electron 44.5.1 → 44.7.0 (2026-10-11): 55 fixes copied from Chrome's engine, and time-zone
    data 2026d (British Columbia stays on UTC-7 from November 2026, so "today" there turns over an hour
    earlier; a desktop test checks it); reaches installed copies with the next release
  - [x] The update checker's install ID (`.updaterId`, sent to GitHub with each check, written once into
    the log) is listed on What DotAmi knows about you and in Settings, with how to remove it (and that an
    earlier ID stays in the log); a test reads electron-updater's own code and fails while its file or
    header isn't listed, or while a "how to remove it" text leaves out the log's copy (2026-10-14)
  - [ ] Decide whether DotAmi needs that install ID at all (the updater uses it only for releases offered
    to part of its users, which DotAmi doesn't do); nothing changed yet
  - [ ] ⏸ Code signing and app stores — later
- ⏸ **[7e] Landing page website** — what it is, demos, a download button. Later; hosting not decided.
- ⏸ **[7f] Move an existing PostgreSQL install into the app** — not planned for now: the maintainer
  starts fresh in the app rather than moving data (decided 2026-10-05). If you self-hosted on
  PostgreSQL before the SQLite switch and need your data moved, open an issue.
- 🟡 **[7g] The settings page** — one screen for every setting in Part 1 of the edge-case doc;
  each story adds its own rows. Two settings can be changed there so far: Figure reminders ([8e]) and
  Encrypt the data file ([8i]).
  - [x] One screen (`/settings`), grouped: data and backups · your figures · the Lens · the map ·
    privacy · updates — each group opens with what is true of this copy today
  - [x] Every Part 1 setting listed with its default, choices, warning and the story that brings
    it; a test keeps the page and Part 1 in step
  - [x] A browser test for the page
  - [x] A setting changed there survives a restart: Encrypt the data file, unticked in Settings, is
    acted on at the desktop app's next start and still unticked after it (desktop-tested in
    `e2e-desktop/desktop.spec.ts`, "turning locking off"); Figure reminders survive a reload
    (browser-tested)
  - [ ] Edge cases still untested: a refused clipboard ("Copy failed — select it instead"), because
    a browser grants the clipboard in tests; the saved choices read again when the window is focused
    or comes back from the browser's memory
    ([settings-and-edge-cases.md](architecture/settings-and-edge-cases.md), the settings page)

## 8 — Your figures (confirmed totals, never the records) · roadmap §5 · #46

- ✅ **[8a] The figures store.** One kind so far: revenue (gross). Typed in on the ideas page;
  file drop is [8c], the Lens is [9].
  - [x] A figure: kind, period, amount (integer cents), currency, source, proposed / confirmed / retracted
  - [x] The rules engine reads confirmed figures; a figure beats an estimate where it settles the
    rule (the GST/HST card: one quarter over $30,000, or four quarters — counted only from figures
    that are exactly a calendar month or quarter; nothing split, converted or added twice)
  - [x] Cards say *"From your records · N figures · N rows"*, the source named, the figures one click away
  - [x] A privacy review of the store before the first import lands
    ([figures-privacy-review.md](architecture/figures-privacy-review.md) — found and fixed a DNS
    rebinding hole: the app now answers only on this computer's own address)
- ✅ **[8b] The agree prompt** — figures are confirmed only by the person agreeing; *Agree* or
  *No, I'll do it myself*; nothing can skip it.
  - [x] The figures grouped by where they came from; amounts editable (stored as "edited by you"); discard one
  - [x] Close or Escape confirms nothing; more than 20 figures → *Agree* only after scrolling through them
  - [x] Only DotAmi's own page can confirm: the route agents and importers use can only propose (tested)
  - [x] Every time it opens, one line above the buttons: "Double-check what DotAmi did, and how, before you agree."
- 🟡 **[8c] Drop a file: Excel and CSV.** "Add from a file" on the ideas page.
  - [x] Read in the app's window, in memory, never sent or kept; one total per calendar month + its
    row count + the file name are what's stored (as proposed figures — the agree prompt decides)
  - [x] Map the date and amount columns (guessed only when the column names make it clear); the
    edge cases in [settings-and-edge-cases.md](architecture/settings-and-edge-cases.md#your-figures)
  - [x] Asks "Where is this file from?" before any file is read, for every file (maintainer's decision,
    2026-10-07): a bank or credit card file is turned away unopened, with a plain warning, until [8g] exists
  - [ ] [8c-2] and [8c-3] below

All of [8c-2] to [8h] were researched on 2026-10-06; the design, the shared data model and the
decisions are in [architecture/figures-roadmap.md](architecture/figures-roadmap.md). The maintainer
answered the decisions on 2026-10-07. Each story's first slice is merged; the next slices follow the
roadmap's build order.

- 🔄 **[8c-2] Remember a file's columns, and recognise the same file dropped twice.**
  - [x] The file's fingerprint and column-name matching, worked out in the window; nothing stored (#81)
  - [ ] Keeping the column choice (a setting that starts on)
  - [ ] Recognising the same file twice (waits on where a figure's source is kept)
- 🔄 **[8c-3] Practice files shaped like each accounting program's export** — never a real export.
  - [x] Xero and QuickBooks Online, with today's known gaps pinned as "fails today" tests (#84)
  - [x] QuickBooks' sales no longer counted twice: an optional Type column leaves Payment and Deposit
    rows out and lists them; the screen's steps now live in one shared function the tests also call
  - [x] Fixed the other gaps they found: Xero's price-per-item column is no longer pre-filled, its invoice date wins over the due date, and one-line customers keep their Date guess
  - [x] Wave, FreshBooks, Sage Accounting, Sage 50 Canadian, and Xero's Receivable Invoice Detail: practice
    files checked to the cent, nine gaps they found pinned by eleven "fails today" tests; a line on "Add from a
    file" saying each program's export was only tested on files shaped from its help pages
  - [x] Ask on GitHub for the column-names row of real exports: posted 2026-10-09 as
    [issue #124](https://github.com/Dot-Ami/dotami/issues/124)
  - [ ] Check each row pasted in reply (no figures, client or company names), then mark those titles
    "documented" in their practice files, citing the issue
  - [x] Two-digit years: one question per file ("Is 05 the year 2005?"), never guessed; every
    preview shows the earliest and latest date read, in words, to check against the file
  - [x] "These dates are right": a tick-box beside that line, needed before Review; another file, date
    column, date order or century answer empties it ("These months are right" for months across)
  - [x] Months across the top (FreshBooks' Revenue by Client): pick the row of month names and where
    the totals come from, one total per month; a report with no dates (Wave's Income by Customer)
    names the report to export instead
  - [x] A French semicolon file with several comma-decimal columns (Sage 50) reads on its
    semicolons; an Excel formula saved with no value is listed as one, with what to do, never as
    "no amount" and never guessed
  - [x] Void, deleted and draft invoices left out through an optional Status column, and the FreshBooks
    summary block no longer taken for the column names
  - [x] Refunds in a ledger's Debit column taken off the month they were paid back, through an
    optional "Refunds / money out" column, under the same rule as the bank statement totals
- 🔄 **[8d] Sources, and "What DotAmi knows about me"** — every figure, where it came from;
  *forget this source*; *delete everything*.
  - [x] The read-only page, a test that fails when something DotAmi keeps isn't listed on it, and logs
    that hold events only (#86)
  - [x] *Delete*: pick what to delete and see what else it affects — one button, tick-boxes per kind
    of data, asked twice, wiped from the file (a byte-scan test proves it); statements all at once only
  - [x] *Delete* can also clear the backups folder (only DotAmi's own safety copies, never through a
    link), and a wipe that didn't finish completes at the next start of the desktop app, only when
    Delete left its "wipe pending" note
  - [ ] *Delete* clears what the window keeps in its own storage (a later decision; reachable from the page
    since the desktop app's address stopped changing on 2026-10-17, and until then the menu says how to
    remove it by hand)
  - [ ] *Forget this source* (waits on where a figure's source is kept)
- ✅ **[8e] How old is each figure** — its age on screen; cards say when they lean on an old one.
  - [x] Every figure's age; a figure dated after today is flagged and never counted (it could make the
    GST/HST card say "over $30,000"); dates in the person's own day (#85)
  - [x] The GST/HST card says the last day its newest figure covers ("Newest figure ends …") and which
    quarters aren't fully covered; no cut-off for "old" is picked, since no source sets one (#85,
    `tests/brain-records.spec.ts`)
  - [x] The server measures "a period that has ended" against the computer's own day, not the UTC day
    (a period ending "tomorrow" was accepted on Canadian evenings)
  - [x] The first saved setting: tick monthly, quarterly and/or yearly on the settings page, and a
    "Remind me about this idea" switch (off until turned on) on each idea; both survive a reload (browser-tested).
    One small `Setting` table that every later setting reuses
  - [x] Reminders: a banner on the ideas page and the idea's map when a period has ended that the agreed
    figures don't cover, with "Add figures" and "Not this time" (counted per kind of figure; unit-tested, and browser-tested in `e2e/figure-reminders.spec.ts`)
  - [x] Reminders: an "add to my calendar" file: one repeating event per ticked box, made in the page
    (RFC 5545 rules unit-tested in `tests/figures-calendar.spec.ts`; the download browser-tested; the desktop
    app's Save dialog desktop-tested)
- 🔄 **[8f] Tax software, through the CRA's line numbers.**
  - [x] Read last year's return PDF in the window and show each T2125's lines 8299, 9368, 9369 and 9946
    with their pages, or a plain refusal (pictures only, password-locked, no T2125); nothing proposed
    or kept. Mozilla's pdf.js, pinned and reviewed, in a worker that can't connect anywhere
    ([review](connectors/pdf-reader-review.md))
  - [x] The four T2125 totals as figure kinds, named for what they mean (business gross income, total
    expenses, net income before adjustments, net income), cited to the CRA's 2025 form and guide
    ([engine doc](engines/taxlines.md)); each figure keeps its tax year and the form and line as read
    (two optional columns); a year whose form isn't read yet says so; the GST/HST card never reads them
  - [ ] In: last year's return PDF → figures tagged with form and line
  - [ ] Out: a sheet of each figure next to the line it goes on, for any tax software
  - [ ] Connector notes: Wealthsimple Tax, TurboTax
- 🔄 **[8g] Bank and card records** — opt-in, behind a warning. (Until it is built, "Add from a
  file" turns a bank or card file away unread — see [8c].)
  - [x] Ticked bank rows to complete-month totals; a row has no field for an account or card number (#82)
  - [x] OFX/QFX reader: the free `ofx-js` package read in full and pinned at 1.1.2, wrapped so
    account numbers never leave it, pending rows and repeated ids are handled, and a file with its
    own document type, two downloads joined together, or too many entries is refused; no screen
    yet ([review](connectors/ofx-reader-review.md))
  - [x] The accounts list behind the warning: each account under the person's own name for it
    ("ending" plus four digits allowed, no other run of four digits), the warning button pressed and
    the day, taken back in Settings, and on the Delete menu; the warnings' words written. The
    switch stays "planned" until the screen arrives, so nothing can add an account yet
  - [ ] The switch, the warning on screen, the statement screen, the OFX files on the screen (run the reader in a Web Worker)
- 🔄 **[8h] Books on disk** — read-only: ledger/hledger, GnuCash, Sage 50, QuickBooks Desktop.
  - [x] GnuCash XML reader, revenue accounts to monthly totals; refuses what it doesn't
    fully understand (#83)
  - [x] hledger / Ledger journals: DotAmi's own reader, written from hledger's manual; accounts and
    monthly totals through the same core; refuses what it doesn't read by name and line; no screen
    yet ([journal-reader.md](connectors/journal-reader.md))
  - [x] A GnuCash book on "Add from a file": read in a background worker (up to 50 MB, a one-minute
    limit), its accounts listed with the income ones ticked, monthly totals proposed under the
    source kind "books" ("Books / file"); unknown GnuCash features refused by name
    ([gnucash.md](connectors/gnucash.md))
  - [x] A ticked account the book doesn't mark as income gets a note that a sale may be counted
    twice; information only, nothing unticked or blocked
  - [ ] Journals on the screen, GnuCash database (SQLite) books, Sage 50, QuickBooks Desktop
- 🔄 **[8i] Business expense records** — a record of each business expense the person adds (date,
  amount, who it was paid to, what for, a category they pick, an optional receipt file), so the
  person has a record of what they spent and labelled; DotAmi never decides on its own that one is
  deductible. **Design written and decided** (2026-10-07, after the maintainer asked for a record of
  every business expense); the store for typed records and the screen to type them are built
  (2026-10-08, with the maintainer's decisions of that day); receipts are kept as copies, carried by backups and shown inside DotAmi (2026-10-08), and encrypted in the desktop app (2026-10-09); the data file itself is encrypted in the desktop app too, asked first (released in 0.3.0); the other ways in are not.
  - [x] Design and the options with their costs: [architecture/expense-records.md](architecture/expense-records.md)
  - [x] The privacy review (typed records and receipts as built):
    [figures-privacy-review.md](architecture/figures-privacy-review.md#privacy-review-expense-records-and-receipts-8i)
  - [x] Decided: single records with their receipt files, copied into the data folder and carried
    by backups; every way in (typed, spreadsheet rows, bank rows, a receipt photo the Lens reads)
  - [x] The store for typed records: the `Expense` table (a new migration), the checks, the propose /
    agree / retract / discard / list routes (agents can only propose; agree, retract and discard answer only to DotAmi's own page), the privacy list and
    /your-data's count, and the "totals, never single transactions" wording reworded for expenses
  - [x] The screen to type records, *Your expenses* (`/expenses`, from the ideas page and each idea):
    type many and agree once in a review list that lets you untick any; a record "not attached yet"
    attached to an idea later; the person's own business share; refunds kept as a negative amount or
    as a refund record linked to the purchase; agent and file proposals wait there for the agree click
    ([ui-spec](ui-spec/expenses/_index.md))
  - [x] Receipts as copies: a `receipts/` folder beside the data file, the type read from the bytes
    (JPEG, PNG, WebP, PDF), 10 MB and a pixel cap, random names, a SHA-256; *Add a receipt* / *Remove
    receipt* on the Expenses page (agreed records only; page-only routes); a *Your receipts* box on the
    Delete menu, receipts going with *Your expense records*; a sweep for files no record describes
    ([expense-records.md § 7](architecture/expense-records.md))
  - [x] Backups that carry the receipts: backup format 2 streams the data file and every receipt it
    describes in 1 MB pieces, the passphrase covering both; old (format 1) backups still restore
    ([desktop-app.md § Backup and restore](architecture/desktop-app.md))
  - [x] Showing a receipt inside DotAmi: the security design first
    ([expense-records.md § 8](architecture/expense-records.md)), then **Show receipt**: pictures from a
    `blob:` address, PDFs drawn by pdf.js in a no-network worker, every file checked again before it
    is drawn; browser tests with hostile files
  - [x] Receipt files encrypted at rest in the desktop app (the maintainer's yes of 2026-10-09): the
    design and threat model first ([expense-records.md § 9](architecture/expense-records.md)), then
    AES-256-GCM per file with one key kept only wrapped by Windows (`safeStorage`), existing receipts
    encrypted once at the first start without risking one, backups that still restore on another
    computer, and plain words where the person looks (Settings, *What DotAmi knows about you*, the note
    before adding a receipt). A copy run from source keeps them unencrypted and says so. The two
    questions this left for the maintainer were both answered yes and built: a "start a new key"
    button and encrypting the data file too (both below)
  - [x] The entries in the Delete menu ([8d]): expense records have their own box, counting every
    record. Deleting ideas keeps their records as "not attached yet" (the maintainer's decision of
    2026-10-08), and the menu says how many stay, where they are kept and how to delete them before
    the person confirms (the count includes turned-down records, which no list shows, and it says so)
  - [x] Start a new key while the key can't be opened (the maintainer said yes, 2026-10-09): asked twice,
    the locked receipts and the key file moved to `backups/receipts-locked-<time>/`, never deleted by that step (since § 11, Delete's safety-copies box can clear it), the new
    key made at the next start; never offered while the key is only out of reach for now (the key store
    unavailable), and no Add a receipt while none can be added; and a "Preparing DotAmi…" window during
    the first start's wait ([expense-records.md § 10](architecture/expense-records.md)).
  - [x] Two follow-ups (the maintainer said yes, 2026-10-10): the desktop app restarts by itself after
    Start a new key, saying so first, only from its own window and only once the receipts are moved (a
    copy run from source says to restart it by hand); and the Delete menu's safety-copies box also
    clears the receipt folders set aside in `backups/` (`receipts-locked-…`, `receipts-before-restore-…`),
    with a warning, owed in the wipe-pending note if cut short
    ([expense-records.md § 11](architecture/expense-records.md))
  - [x] The third follow-up (the maintainer said yes, 2026-10-10): **Bring these receipts back**, in the
    desktop app, for each `backups/receipts-locked-…` folder whose old key this Windows account can open
    again; asked once; each receipt checked against its record, locked again with the current key, put
    back, and only then removed from the folder; anything that fails stays and is named; the button only
    for receipts that could really come back, never for a folder an earlier Delete still owes (review fix
    round, 2026-10-10); an unfinished add set aside with the rest comes back too, a key file in another
    set-aside folder is said as such, and "already back" only when that copy opens (second review fix
    round, 2026-10-10)
    ([expense-records.md § 12](architecture/expense-records.md)). Not done, with the reasons there: the
    receipt folders a restore or Start fresh set aside
  - [x] iPhone (HEIC) photos as receipts (the maintainer said yes, 2026-10-09): the decoders reviewed
    ([connectors/heic-decoder-review.md](connectors/heic-decoder-review.md)), then option D chosen after a
    double-check and built: kept exactly as given, read by DotAmi's own container reader in a
    no-network worker and drawn by the graphics chip through WebCodecs, on *Show receipt* only; where the
    computer can't decode HEVC it is kept and the viewer says so. Not tried on a Mac
  - [ ] Before DotAmi is sold: the HEVC patent questions (they cover the Electron build already shipped)
    answered by a software-patent lawyer ([the list](connectors/heic-decoder-review.md#questions-for-a-software-patent-lawyer-before-dotami-is-sold))
  - [x] Encrypting the database file (the maintainer said yes, 2026-10-09; chose how on 2026-10-10;
    released in 0.3.0):
    designed and the packages reviewed ([architecture/database-encryption.md](architecture/database-encryption.md));
    built in stacked pull requests (#132, #134, #135, #136, #139): (A) the packages, the Prisma adapter and the measurements;
    (B) the key, the first-start encryption, the window that asks first, the Settings switch, and the
    migrator, backups and restore on the new package; (C) a passphrase on every backup and restoring
    from the lost-key window; (D) the "Start fresh" button
    - [x] (A) the packages installed and measured (no slowdown a person would notice), every Prisma
      Client moved to one factory (`lib/db/client.ts`)
    - [x] (B) the key, a new folder encrypted from its first byte, the window that asks first (four
      answers), the crash-safe first-start encryption, the lost-key window, the Settings switch, and
      the migrator, backups and restore on the new package
    - [x] (C) a passphrase on every backup; Restore from a backup… in the lost-key window, under a new
      key, the locked file kept in backups/
    - [x] (D) Start fresh… in the lost-key window, asked twice; the locked file, its key and the receipts
      kept in backups/
    - [x] A brand-new data folder asked the same four choices (Back up first… turned off there), and
      the Settings switch able to turn locking off: the next start decrypts the data file and its safety
      copies, crash-safe, and deletes the key once nothing opens with it (the maintainer said yes,
      2026-10-10; [database-encryption.md § 15](architecture/database-encryption.md)); after review, the
      turn-off is recorded in a note naming the key, a damaged file stays encrypted without stopping the
      start, and a blocked swap leaves no plain copy; after a second review, a safety copy deleted while
      its encrypted original's wipe was owed, a readable file shown as locked, and a full disk no longer
      stop DotAmi from starting
    - [x] Found in review, older than this change (on main): an encrypted data file left with a
      half-written change (a power cut mid-write leaves its rollback journal) failed every start, because
      the key was checked on a read-only open that can't roll the journal back (desktop/main.mjs
      opensWith); now the file is opened once read-write with its key first, so SQLite rolls it back
    - [ ] A question for the maintainer: turn receipt encryption off too?
  - [ ] From a spreadsheet's rows · from a bank statement's ticked rows ([8g]) · a receipt photo the Lens reads ([9])
  - [ ] Words typed into the *Your expenses* form before the page has finished loading are emptied
    when it loads (found 2026-10-11 by the review of the front page's same fix; only on a reload or a
    typed address). The front page's way, reading what is already in each box as the page loads, with
    its own browser test that holds the page's scripts back

## 9 — The Lens (DotAmi's built-in agent)

- ⬜ **[9a] Pick your model** — three ways in, one setup screen: a provider's own key, OpenRouter,
  or a model on your own machine; keys in the OS keychain.
- ⬜ **[9b] Know the model before you use it** — test it directly (an image, a tool call, how much
  it reads); say in plain words what you'd miss; an accuracy score on invented receipts.
- ⬜ **[9c] The test set** — invented receipts, returns and statements with known answers, and a scorer.
- ⬜ **[9d] Lens, first version** — explains cards, proposes changes and figures; reading and proposing only.
- ⬜ **[9e] Information, never orders** — anything read from a page, file or email is data; actions
  it asks for need the person's approval; nothing leaves the computer without asking.
- ⬜ **[9f] Permission levels, a log, and undo.**
- ⬜ **[9g] Lens powers, one at a time, each behind a switch and a warning.**
  - [ ] Web search
  - [ ] Read files in chosen folders
  - [ ] Run commands
  - [ ] The built-in browser (Playwright)
  - [ ] Write back to accounting software
- ⬜ **[9h] Your own keys for a live connection** — through the vendor's official MCP server.
- ⬜ **[9i] DotAmi as an MCP server** · roadmap §7 · #48
  - [ ] Read-only tools first: `readout`, `list_ventures`, `list_statements`, `law_provision`
  - [ ] Then `propose_facts`, `set_progress`, `add_question`

## 10 — The questionnaire and planning

- ⬜ **[10a] Choose-your-own-adventure questionnaire.**
  - [ ] Questions as data: one file per question — wording, answers, where each answer leads,
    which cards it feeds, why it's asked
  - [ ] "I don't know" always allowed
  - [ ] Asked in the order a professional would
  - [ ] A test that every path ends somewhere
- ⬜ **[10b] Progress per step** — done · doing · not for me · roadmap §2 · #43 (2026-10-11: built as
  part of [14a], in the cockpit)
- ⬜ **[10c] Tasks and questions per step** · roadmap §3 · #44 (2026-10-11: each step's *done when*
  checklist is built in [14a]; the questions per step come later)
- ⬜ **[10d] Deadlines and reminders** — cited, with a reminder before each.
- ⬜ **[10e] The accountant package** — one export of the map, confirmed figures, open questions · extends #41
- 🔄 **[10f] Look inside your future** — the same plan as [14a], written twice on 2026-10-11 (once by
  the fixes in #142, once by the design in #141). Its tasks, done and open, are now listed once, under
  [14a] in § 14; this code stays so links to it still lead somewhere.

## 11 — The map's content: the tools, tactics and tricks

- ⬜ **[11a] Roadmaps as data** — one file per step; a checker refuses a step with no source · roadmap §1 · #42
  (2026-10-11: the road type in [14a] is the first part; the contributor files and the checker are [14d])
- ⬜ **[11b] Check sources against the law's own words** — a model quotes, code checks the quote
  appears word for word in the official text, a person decides.
  - [x] The record and the code check (2026-10-11, the maintainer's option B): a citation may carry a
    tool check (the day and the quotes) instead of, or as well as, a read; every card says which
    ("Read by a person on …" only when a person is recorded as the reader, "Read on …" otherwise, or
    "Checked by a tool on …"); `node scripts/check-quotes.mjs` checks the quotes on the live page · [docs/engines/citations.md](engines/citations.md)
  - [ ] A model proposes the quotes for a source (not built)
  - [x] The maintainer's reading list of 2026-10-23, its first 30 entries: 23 handled on 2026-10-24, each only
    as far as a quote goes (21 corrected, retired or added; Ontario's HST and BC's PST left as they were, no
    quote held), the other seven are #207's and #208's; two entries retired, ids kept
    (`compliance-food-premises-on`, `risk-hobby-reclassification`); the Canada-Alberta Productivity Grant
    added as `grant-capg` ([docs/engines/citations.md](engines/citations.md), § The reading list's corrections;
    `tests/reading-list-corrections.spec.ts`, `tests/retired-entries.spec.ts`, `tests/productivity-grant.spec.ts`)
  - [x] Merged after #207 and #208 (main merged in on 2026-10-27; citations.md, § The reading list's
    corrections): #207 took the Job Grant's card off, so one card opens the Productivity Grant's page, and
    #208 put the loans page the loan program's risk box quotes under its card. The two `it.fails` checks
    turned red at the merge and are plain checks now; road 0's 11 panels were redrawn from the merged code
  - [x] His reads (recorded 2026-10-27): he read 31 pages in full on 2026-10-25 and ticked each *I've read
    it in full now* on his reading list, which named under each page every place it is cited (his decision of
    2026-10-24: his reads made with an AI model's help count as a person's, for the pages he checked himself).
    Every citation of those pages, 136 as `lib/engines/all-citations.ts` lists them, has `lastVerified`
    2026-10-25 and `readBy: "person"`, and no other citation has that day ([docs/engines/citations.md](engines/citations.md),
    § The maintainer's reads of 2026-10-25; `tests/maintainer-reads.spec.ts`)
  - [x] A networked `node scripts/check-quotes.mjs` run (no arguments) finds again every quote the reading
    list's matcher found on 2026-10-23, before the reading list's corrections merge, not later with his
    reads (rule 4 of citations.md and its exception): found on 2026-10-26 in a normal session, all 49 quotes
    on the 25 citations of that day, and all 779 quotes on DotAmi's 337 tool-checked citations
  - [ ] Blocked until an official page's own words are found and checked (citations.md, § The reading list's
    corrections, *Blocked*):
    - [x] Alberta has no PST and GST is 5% (`compliance-ab-no-pst`): the CRA's table isn't in its page's HTML;
      Alberta's *About Tax and Revenue Administration* is an unchecked candidate for the first half. The
      card's line is DotAmi's wording of the table's row until then. His read of the page is recorded
      (2026-10-25), but not what he found in the table: his word settles whether the
      table shows "no provincial sales tax" or only Alberta's 5% GST (then the line says only that).
      Settled on 2026-10-29: he read the row, "5%", so the line and description say only "… lists Alberta at 5%.";
      Alberta's page, checked by a tool that day (“Alberta has no sales tax.”), is the card's second source
    - [x] Ontario's 13% HST (`compliance-on-hst`): the same table. Settled on 2026-10-29: he read the row, "13%"
    - [ ] Ontario food premises: the regulation in force, read and quoted, under a new id
    - [ ] Repeated losses: a CRA, Act or folio page on business versus personal pursuits, with its words
    - [ ] SR&ED refunded or not: whether, and how much of, a sole proprietor's 15% credit is, and whether a
      CCPC's enhanced 35% is (the card said "refundable" on the maintainer's read alone until 2026-10-24)
    - [ ] SR&ED's $6 million: the tax years it applies from, and the sentence of s.127(10.2) that leads into
      its formula
    - [x] *SR&ED deepening*'s 35% from the SR&ED glossary, as the maintainer asked: quoted since 2026-10-27,
      when `node scripts/check-quotes.mjs` found the glossary's entry on the enhanced rate with its two older quotes
      (the stage keeps the relationships page for its tax impact)
    - [x] Home office: the CRA page's sentence on working out the business part (floor area as one basis):
      quoted in the box since 2026-10-27, found with the page's four older quotes that day
    - [x] The titles the CRA's SR&ED rates page and ISED's loans page give themselves: *What are SR&ED tax
      incentives* and *Helping small businesses get loans*, each found on its page on 2026-10-27, are the
      citations' titles
    - [ ] The Productivity Grant's other conditions for employers, whether a sole proprietor counts, what
      training counts, who else funds it, and the page's labels before its 25% and 75% lines
  - [ ] Open questions for the maintainer, on the same cards but not entries he checked (citations.md,
    § Outside the list): the Holding company and Family trust fork label "… needs a real business
    purpose first"; the "Professional required" heading over the anti-avoidance and loan program boxes
    (`tests/engine-integrity.spec.ts` holds GAAR reads there); and the *Hobby vs. business income test*
    card's profit-expectation and business-like lines, which cite the page the retired hobby read's
    record says supports neither (he read that page in full on 2026-10-25; the card's words wait for his call)
- ⬜ **[11c] Flag stale sources automatically** — with #37
  - [ ] Kept open on purpose (the maintainer, 2026-10-14), so a person decides later:
    - [x] *Alberta Investor Tax Credit* (`grant-abti`): taken off on 2026-10-23 (the maintainer's call
      a-call-1); its page answers "page not found" (docs/engines/grants.md, *Retired programs*).
    - [ ] *Retained earnings planning*'s "Paying dividends" and "Salary or dividends" (see [14a]): no
      current CRA page found; the T5 guide could back "Paying dividends". Left as they are for now.
    - [x] *Canada-Alberta Job Grant* (`grant-cajg`): taken off on 2026-10-23 (a-call-1); its page now
      opens the Canada-Alberta Productivity Grant's. The Productivity Grant is in the catalog as `grant-capg`
      since 2026-10-24, on the quotes a tool found on its page; he read the page in full on 2026-10-25, and
      its source says so since 2026-10-27 ([11b]).
    - [x] *Employment standards* (alberta.ca), on *Hire first employee* since 2026-10-23: checked by a tool,
      then read in full by the maintainer on 2026-10-25, recorded 2026-10-27 (docs/engines/citations.md,
      *The maintainer's reads of 2026-10-25*).
- ⬜ **[11d] Two people per change** — the checker of a source is never its author.
- ⬜ **[11e] Reviewed by an accountant** — a roadmap is *reviewed* only after a professional reads it.
- ⬜ **[11f] Strategy roadmaps** · roadmap §6 · #47 — each cited, with its audit and anti-avoidance read:
  - [ ] Holding company + operating company
  - [ ] The small business deduction and how it's reduced
  - [ ] Salary versus dividends
  - [ ] Income splitting and the rules that limit it
  - [ ] The lifetime capital gains exemption on small-business shares
  - [ ] The estate freeze
  - [ ] The family trust
  - [ ] Intercorporate dividends and the anti-avoidance rule around them
  - [ ] Using losses across a group
  - [ ] The capital dividend account
  - [ ] Shareholder loans
  - [ ] Tax-deferred rollovers and reorganisations
  - [ ] Retirement savings inside a corporation
  - [ ] Leaving the country
- ⬜ **[11g] Catch-up paths for people already behind.**
- ⬜ **[11h] Pausing, closing, moving province.**
- ⬜ **[11i] New tax years** — every card says which year.
- ⬜ **[11j] Beyond Canada; Quebec; French** · roadmap §4 · #45
- ⬜ **[11k] Fixes already reported** — good places to start:
  - [x] #36 federal rules say "because you selected <province>" — 2026-10-12; federal grant cards
    the same — 2026-10-13
  - [ ] #39 tier 1 subtitle wording
  - [x] #9 statute text with paragraph breaks — 2026-10-12
  - [x] #6 hide the empty vault line — 2026-10-12
  - [ ] #10 a van buyer sees no vehicle class
  - [ ] #11 prep-tool references filtered by structure
  - [x] #40 hide R&D-only steps without an R&D tag — 2026-10-13: *SR&ED deepening* is drawn off the
    path, dashed, with its reason, instead of hidden (the map doesn't pre-filter paths); whether to hide
    it anyway is the maintainer's call (docs/architecture/future-cockpit.md § 13)
  - [ ] #5 "YOUR PICK" on a branch never picked
  - [ ] #38 "New idea" restarts at About-you
  - [ ] #41 playbook print view (2026-10-13: *Your plan*, `/plan?venture=<id>`, a page of its own with **Print**, opened from Export; the Export panel keeps its raw-markdown box, the maintainer's call of 2026-10-14)
    - [ ] the readout API and the playbook export read road evaluation, so *SR&ED deepening* off the
      path (#40) isn't "ahead" there (docs/architecture/future-cockpit.md § 6, *Steps for some kinds of
      work only, as built*)
  - [x] the step panel's doubled full stop, *"rewrite it.. Not added"* (flagged in PR #165) — 2026-10-14:
    fixed in the panel's words, so the step panel, the money list and *Your plan* all print one
  - [x] #4 the cockpit on a phone (2026-10-12, with the folding regions)

## 12 — People and structures

- ⬜ **[12a] Ventures that span companies.**
- ⬜ **[12b] Co-owners and spouses.**

## 13 — The project itself

- 🔄 **[13a] Contributors** — issues as the to-do list; every commit signed off, merges included.
  - [x] A plain-words glossary ([glossary.md](glossary.md)) — 2026-10-12: 51 entries for the short
    forms and terms on the map, the roads and the settings, each linked to its official page and
    checked by a tool that day (53 pages, every quote found); linked from the README and CONTRIBUTING
  - [ ] Entries for the short forms its *Not explained here yet* list names (Holdco and Opco, dividend,
    family trust, ITA and Reg., T4002, ISED, SME, ABTIC, CAJG, NAIT, SAIT, GED, CAEC, IP, R&D, B2B, ML, CAD),
    each once its official page can be checked
  - [ ] A "What does this mean?" link from a card's short form to its glossary entry
  - [ ] Later: the glossary as the translators' word list, once a second language is planned
- ✅ **[13b] Releases** — tags, changelog, release notes; the app's updates come from these.
  - [x] Version tags (v0.1.0, v0.2.0, v0.2.1, v0.3.0, v0.4.0, v0.4.1) and [CHANGELOG.md](../CHANGELOG.md)
  - [x] A tag builds the Windows installer into a draft release; the maintainer writes the notes and publishes
  - [x] A release after v0.2.0 built by the fixed workflow and published end to end (with [7d]): v0.2.1,
    v0.3.0, v0.4.0 and v0.4.1 were each built by the release workflow from their tag and published; 0.2.0 → 0.2.1
    reached an installed app (by hand, 2026-10-08)
  - [x] A release with a database change ships its migration, which the desktop app applies itself
    (`tests/desktop-migrate.spec.ts`), and says so in its CHANGELOG entry
- 🔄 **[13c] Security** — CodeQL, grouped Dependabot, audit; a privacy review for each import path;
  a threat model for the Lens's powers before [9g].
  - [x] `source-map-js` 1.2.1 → 1.2.2 (build-time; Dependabot #71, merged 2026-10-07)
  - [ ] `sprintf-js` GHSA-hp3w-g68c-fv3c (build-time, under the installer builder: `electron-builder` →
    `app-builder-lib` → `@electron/get` → `global-agent` → `roarr`). **No fixed version exists yet** — it covers every
    release up to 1.1.3, the newest (checked 2026-10-11)
  - [x] `sharp` 0.35.5 — its SVG reader's advisory (#73) · `postcss-selector-parser` — gone with
    Tailwind 4 (#80)
  - [ ] Build-time tooling advisory GHSA-vfj7-8cjw-p6xm (`braces` stack-exhaustion). **No fixed
    version exists yet** — it covers every `braces` release up to 3.0.3, the newest (checked
    2026-10-06 and again 2026-10-11). Since Tailwind 4 it reaches DotAmi only through Next's ESLint plugin
    (`eslint-config-next` → `fast-glob` → `micromatch`), when lint runs (`next build` runs it
    too), on the project's own glob patterns; nothing shipped to people runs it. Wait for a fixed
    `braces`, or for the plugin to drop it.
  - [x] Tailwind 3 → 4 — 2026-10-06; Tailwind 4's own packages don't use `braces` (replaced
    Dependabot's #72, which only bumped the version and failed every build)
- ✅ **[13e] Tests that use the app like a person** — Playwright on the real build, a CI job on
  every pull request (#64); `npm run test:browser`. Each new screen adds its own test. A required
  check on `main` since 2026-10-05: nothing merges with them failing.
  - [x] The suite never trips the app's rate limits by accident — 2026-10-09; on the test server
    only a request that names its own bucket is counted (`DOTAMI_E2E_RATE_LIMITS=opt-in`, set by
    `playwright.config.ts` alone), and `e2e/rate-limit.spec.ts` shows the shipped limit still holds
  - [x] A run waits for its own server, never another run's on the same port — 2026-10-09
  - [x] The desktop test types into the front page only once it has finished loading, and words a
    person types before then are kept by the page (a browser test holds the page's scripts back) —
    2026-10-11; the desktop test had failed on CI three times in about 15 hours with "Map it" greyed out
- ⏸ **[13f] Privacy policy, terms, and the usage-sharing decision** — planned for before the first
  download; the first installer (0.2.0, 2026-10-06) went out before them, so they are still owed. Until
  then the privacy log below is the record of what each version keeps, sends, ships and asks.
  - [x] Decided (2026-10-05): ask people whether to share anonymous usage — off unless they say yes
  - [ ] ⏸ Maintainer's decisions: what exactly is sent, where it goes, who sees the results; a
    privacy policy and terms
  - [x] A privacy log ([privacy-log.md](privacy-log.md)): what each version keeps, sends, ships and
    asks, the record the policy and terms will be written from; a test fails when a version has no section
  - [x] Next.js telemetry off by default for people running from source (`npm run dev`, `build`,
    `start`, `lint` through `scripts/next.mjs`; CI already had it off)
  - [x] Prisma's check-in off by default for people running from source (the `prisma:*` scripts; CI
    already had it off). Not reachable from a script: `npm ci`'s own Prisma run and `npx` by hand
- ⬜ **[13g] Screen-by-screen review.** Phase 2 task 30f of the plan for any idea (2026-10-20, § 14): every
  screen on main (front door, *Start*, *Your futures*, intake, the cockpit on both roads, *Your plan*, the
  ideas page, *What DotAmi knows about you*, settings, expenses, licences, Mara's example) plus phase 2's
  *About this job* and "not written yet" screens; each gap becomes a story. For every screen, five
  questions answered with evidence:
  - [ ] **Useful:** what does a first-time person learn here that they didn't know?
  - [ ] **Guides:** is the next step obvious, and does it go somewhere that helps?
  - [ ] **Honest:** every figure and claim shows where it came from; nothing invented
  - [ ] **Wired:** what's typed or clicked saves, reloads and survives a restart; errors handled
  - [ ] **Tested:** a browser test covers its main path and edge cases
  - [x] Already found: the intake's field labels aren't tied to their dropdowns (a screen reader can't
    name them) — fixed 2026-10-12: province, employment and the name box are named by their labels.
  - [x] Pre-release honesty and privacy, found by the review of 2026-10-23 and fixed the same day
    (`tests/prerelease-honesty.spec.ts`, `e2e/front-door.spec.ts`): nothing about the person in window storage
    (`tests/privacy-inventory.spec.ts`, `e2e/window-storage.spec.ts`; 2026-10-24): the journey held in the
    window's memory, a statement that couldn't be saved left in its box, no list of earlier *Other…*
    descriptions, the three old keys removed unread when a journey page opens, and Delete reaching what the
    window holds; no *done* or *now* chip on the map for anything the person never marked (*starting point*,
    *first stage*), and the readout API giving the person's own mark (`yourStatus`) in place of the map's
    worked-out `status` and lists (2026-10-24, the maintainer's decision 3); *type not said* on the ideas card,
    drawn in lower case; the time words the check missed (*First years on
    your own*, *time-boxed* in the legend, in two item rows written in their components and in a citation's
    note, the ride-share Lens line's "with 30 days to apply" and its closing advice, the file drop's "A big one
    can take a little while." and the book reader's "after a minute") reworded and taught to the check, which
    now reads every catalog's Lens lines, every words file and the text each component writes itself
    (2026-10-24), and a tool check's quotes only inside the official-quote component; the front door's chips in
    the words file without a tax promise; *Your futures* and *Open cockpit* only once an idea is saved, and
    with none *Your expenses* while the Expenses page lists a record (2026-10-24); the screen specs and design
    docs of all of it brought up to date, with a test that reads them (`tests/prerelease-honesty.spec.ts` § 6)
  - [ ] Left open by #210, each written down where it applies: the desktop app's Go menu loads its pages
    afresh (`loadURL`, `desktop/main.mjs`), which empties the journey held in the window's memory, and the words
    say so (moving inside the page instead needs a message through `desktop/window-preload.cjs`, its own
    review); Help → Licences loads its page the same way (the same `go` helper), which the privacy log and
    docs/ui-spec/start/_index.md say but the words on screen, naming the Go menu only (the maintainer's words
    of 2026-10-24), don't: the same message would fix both, or the words could name it; in a browser copy, Back and Forward show the front door's links as first drawn
    (docs/ui-spec/landing/03-escape-hatches.md); the line under the receipts of questions 2 and 3 sits outside
    the receipt's `role="status"`, so a screen reader doesn't hear it with the receipt (CLAUDE.md's Data
    paragraph, which said of the front-door sentence that "the tab marks it done", says the journey held in
    the window's memory does since 2026-10-27)
  - [ ] For the maintainer's later call (the decision of 2026-10-24 kept it for now): the intake's *Other…*
    employment box. Its words are held in the window's memory only, kept with no idea (the idea keeps `other`)
    and read by nothing since its list of earlier descriptions went with `dotami-employment-suggestions`: keep
    the words with the idea (a new column, an inventory line, a privacy-log line), or remove the box and keep
    the *Other…* choice alone
  - [x] Anthropic's retention period on *What DotAmi knows about you* (`components/your-data/your-data-page.tsx`,
    under *How long Anthropic keeps it:*) was DotAmi's paraphrase, "deleted within 30 days, with exceptions". The
    maintainer's decision 2 of 2026-10-24: a provider's period is quoted word for word under a label. Done on
    2026-10-27: `node scripts/check-quotes.mjs` found the page's lines for API users (the period and its four
    exceptions) that day; the row shows them after *Words found on the page:*, with "Checked by a tool on
    2026-10-27" (`lib/privacy/anthropic-retention-official-words.ts`), and the entry is out of
    `COMPONENT_TIME_WORDS`. Not in the no-arguments re-check: that reads the catalogs' government citations
    only, so a change to Anthropic's page shows only when someone runs the script on it again
  - [ ] For the maintainer's call: whether the same row also quotes two more of that page's sections, which
    the checker found too on 2026-10-27 but whose reach to API inputs the page doesn't state: its longer period
    for a chat flagged as violating the Usage Policy ("We retain inputs and outputs for up to 2 years and trust
    and safety classification scores for up to 7 years if your chat is flagged …") and its line on Covered
    Models ("Additionally, for Covered Models, we require limited data retention and review as a part of our
    safety work."). The row quotes the exception "If we need to retain them for longer to enforce our Usage
    Policy (UP)" without that period
  - [ ] For the maintainer's call, found by the review of #210: the *Replace income* goal card's payoff, "If
    this applies, paths with faster revenue and simpler compliance can rank higher." (`lib/brain/goal-effects.ts`,
    shown when the intake preview's row is opened), a time word and a ranking nothing does, like the other goal
    cards' "DotAmi can prioritize … earlier" and "move up the map". Not part of #210: what goal cards say at all
    (goals are read by no rule), for all five
  - [ ] Two edge cases the last review of #210 found, both there before it: a map change held in the window's
    memory because its save failed is dropped, without a word, if the person then starts a new idea from the
    front door's *Map it* (or opens another idea and then a new one); and the intake's failed first save leaves
    an idea never saved in the window's memory, which the front door's *Open cockpit* would then draw as if kept
  - [x] Pre-release fixes, "Phone and layout" (the review of 2026-10-23), fixed in the pull request "every page
    fits a phone, one step counter, and plainer screens": the cockpit at 375 px (gauges stacked, the idea's
    name on its own line, the tip off the road); *Your futures* and *Your expenses* fit 375 px, with
    `e2e/phone-width.spec.ts` over every page the review walked; one step counter on the typed way; legal
    requirements under *What it needs*; the job's list folded under **Show the 44**; the Structure ladder only
    on the tax and structure roads, in plain words; *Your plan*'s contents list; one sentence on "checked by a
    tool only" (its server-down message on *Your destination* gave way, at the merge with main, to #210's
    `wordsNotKept` and `incomeNotKeptLine`, which say the same). Still open from the review: the intake's tax
    words for newcomers (not in this pull request).
- ✅ **[13i] The landing page and intake were dead in production builds** — fixed in #64.

## 15 — Real examples: how real people started (later)

There are endless ways to start something. Besides the official road, people want to see how real
people actually began — often with very little — so they can find a way to start soon. This is a
library of those stories, each one cited and labelled, kept apart from the official rules. Recorded
2026-10-11 at the maintainer's request; not started.

- ⬜ **[15a] What one real example is.** One business a real person started: what it was, what it took
  in their own words (money, skills, tools, time), where and when, the link to where they said it (a
  video, an article, a testimonial) and the day it was read. Shown labelled "a real example of what one
  person says they did — not advice, not a promise". A new kind of source, with its own section in
  [CONTRIBUTING.md](../CONTRIBUTING.md) before the first entry.
- ⬜ **[15b] The AI answers from the library, with links.** When the Lens suggests a way to start, it
  looks the examples up and quotes them with their links, so every suggestion points at a real source.
  A test that every answer cites an example or an official page. How the AI learns from the library is
  for the maintainer to confirm (he raised training or fine-tuning it on 2026-10-11). The recommended
  way is looking the examples up rather than training them into a model, because a trained model
  can't point back to the source it learned from and could blend stories into something nobody did.
- ⬜ **[15c] Finding examples.** A search proposes candidate stories from public articles, videos and
  testimonials; a person (or the creator) checks each one before it enters the library.
- ⬜ **[15d] Creators as contributors.** People who already show others how to start businesses can add
  or approve their own entries, credited and linked back, through a simple submission form or GitHub.
- ⬜ **[15e] Permissions.** Beyond a link and a short quote, using someone's video or article needs their
  permission; the terms are checked by a professional before anything more is republished.
- ⬜ **[15f] "What I have right now."** You say what you could put in (money you have on hand, skills,
  tools, time). Every future and example stays listed; you can sort them by one thing you pick
  ("lowest start-up money", "could start this month") or turn on a filter for ones that started with
  means like yours, said on screen and cleared with one click. DotAmi never narrows the list on its
  own. What you type stays yours.

## 16 — Your own test results (later)

Recorded 2026-10-11 at the maintainer's request; not started.

- ⬜ **[16a] Bring in a test result.** Import (and export again) the results of an IQ or personality test
  you took elsewhere, kept as your own document, dated and exactly as given; shown, exported and deleted
  like everything else.
- ⬜ **[16b] You choose what it may inform.** For each result: "may the Lens use this when suggesting
  futures?" DotAmi never turns it into a type or label of you, and anything suggested from it is a
  proposal you tick.

## 17 — DotAmi gets better over time (later)

Recorded 2026-10-11 at the maintainer's request; not started. Today everything stays on each person's
computer and DotAmi runs no server.

- ⬜ **[17a] What gets better, and how we know.** Which parts improve with use (the examples library's
  coverage, the questions, the suggestions), measured against the test set ([9c]).
- ⬜ **[17b] Keeping the library clean.** Duplicates merged, sources and dates checked, examples and
  roads filed, so the library stays trustworthy as it grows.
- ⏸ **[17c] Learning from many people — only if each person says yes.** Nothing is pooled unless the
  person agrees (off unless they say yes, as decided for usage sharing in [13f]); it needs anonymising,
  a place for it to go, and the privacy policy and terms first ([13f]).
