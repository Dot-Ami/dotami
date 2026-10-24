# Look inside your future — the future cockpit (design)

Status: **design, 2026-10-11, written before any code. The maintainer made all six decisions on
2026-10-11 (below); phase 1 is built from this page in pull requests that follow it.** Nothing here
is built yet. Where this page and an older one disagree about the journey, the cockpit, progress or
planning, this page is newer; each older page that disagreed was given a dated note in the same
pull request as this one.

It sits beside [use-cases.md](use-cases.md) (who DotAmi is for and the Lens),
[figures-privacy-review.md](figures-privacy-review.md) (read before storing anything new) and
[../roadmap.md](../roadmap.md) §1–§3 (roadmaps as data, progress, tasks), which this design turns
into one piece of work. The public task list is [../task-list.md](../task-list.md) § 14.

Day counts are rough estimates in working days, not measurements.

## The goal, in the maintainer's words

On 2026-10-10, said twice:

> "show users what each business venture COULD look like so they know what steps they have to take
> to reach that goal and what skills they would need to acquire, and startup costs as well as the
> best path forward for our users to achieve their dream lifestyles … similar to … a "Maven-like"
> layout so they could almost peer into the future of their dream business or career."

"Maven-like" points at a kind of command-centre screen: one picture, layers switched on and off over
it, everything linked, the human choosing. DotAmi takes those patterns and leaves out ranking and
the military words; on screen it is just *the cockpit*.

On 2026-10-11, with the decisions:

> "We can also go with your current interface, but keep in mind that as we build this out, the
> layout will change and adapt, and therefore, so will the back-end."

And on 2026-10-10, about where effort goes: no new safety settings for their own sake — the app has
to give people value first. This design adds no new permission screens, warnings or settings (§ 8).

## The maintainer's six decisions (2026-10-11)

1. **The first future written in full is "From apprentice to your own shop (Alberta)".** One road
   shows a career and a business together: finish your training, get certified, then a fork —
   *stay employed* or *open your own shop* — with the two endings side by side.
2. **Start-up costs are official fees plus the person's own quotes. No averages.** A fee with an
   official source is filled in, with the source and the day it was read. Everything else is a named
   blank ("tools: add your quote"). DotAmi adds up only official fees and what the person agreed to,
   and always says how many lines are not priced yet. (The approved plan suggested this for phase 1
   and asking again before phase 2 whether to show typical numbers; that question is closed, § 13.)
   *Note (the maintainer's answer of 2026-10-16, written here 2026-10-20):* one kind of government
   number may now appear beside a job, as well as official fees: **official wage ranges** the
   government publishes for a job (Job Bank's low, median and high), each labelled with its real
   geography level (economic region, province-wide figure or small-area estimate, from the row's own
   source code), its reference period and its source, and always said to be what workers in the job
   were paid, never what the person would earn or a shop would make
   ([research-kit.md](research-kit.md) call K5, answer B; § 4.2 there). Government outlook ratings were
   not picked (K5 C), so no outlook or projection appears. Start-up costs are unchanged: official fees
   plus the person's own quotes, no averages; a wage range is never added to a total, a gauge or a cost line.
3. **"The best path forward" means the person picks one thing to sort by,** and the screen says so:
   *"Sorted by fewest steps left: your choice. DotAmi doesn't rank futures."* (Built in phase 2;
   phase 1 shows road order and the order added.)
4. **The cockpit is one map with overlays:** the destination and four gauges on top, the road across
   the middle with overlays switched on and off (Skills, Money, Rules & tax), one detail panel on the
   right, *What you've told DotAmi / Not told yet* on the left, *Next on your road* at the bottom.
   The cockpit's job is written down (§ 2) and replaces July's plan of a separate Track tab.
5. **The government's skills lists count as a source, through the person's own pick of job.** The
   list is the Occupational and Skills Information System (OaSIS) from Employment and Social
   Development Canada, under the Open Government Licence – Canada. The person picks "the job closest
   to the work you'd do yourself"; the list appears tagged *your pick of job*. DotAmi never claims
   which skills a business needs. [CONTRIBUTING.md](../../CONTRIBUTING.md) gains this kind of source.
   *(2026-10-21, task 25e: a road now names the jobs it is written for, as 5-digit job codes in
   `Road.codes.occupations` (road 1 is written for 72311 Cabinetmakers; road 0 for no particular job), so
   Pick a future can offer the road written for the person's pick of job. The job is still only the
   person's own pick: nothing goes from a road, a business or the idea's words to a job, only from their
   pick to the roads written for it. § 6, *The road type as built*.)*
6. **The front door leads with the dream: three doors.** *Start from where I want to be* (the main
   one), *I already have an idea* (today's box and intake), *Show me an example first* (an invented,
   labelled example). "Your ideas" becomes "Your futures".

## The short version

- A person starts from **where they want to be**, in their own words, then **picks one business or
  career to look inside**. DotAmi draws that future's **whole road at once**: every step, the skills
  it needs, the official fees and the blank cost lines.
- Each answer lights up more of the road, and a **one-line receipt** says what changed: *"Because you
  marked 9 skills: 3 steps now say needs 0 more."* The receipt is the difference between two runs of
  the rules, before and after the answer — never generated text.
- The **cockpit** is the one screen where they plan and then do the work: step status, *done when*
  checklists, skill marks, quotes, what-ifs, compare the two endings, *This is mine*.
- **Gaps are counts and plain arithmetic, never verdicts**: *"x of y steps done"*, *"needs 3 · you have
  2"*, *"savings you typed − (lines you priced + official fees) · 4 lines not priced yet"*.
- Everything works **with no AI connected**. The rules decide; a model later only proposes, and what
  it drafts is labelled as drafted by the person's model.
- **Phase 1** (about 10 build days plus 5–7 content days, roughly two calendar weeks) lets a person
  look inside one fully written Alberta future and today's general Alberta road.

## 1. The journey, screen by screen

| # | Screen | Its job | What it asks | What it shows | Next |
|---|---|---|---|---|---|
| 1 | **Front door** (`/`) | Let a first-time person choose how to start, and show at once that DotAmi draws futures, not only tax | Three doors, one click each: *Start from where I want to be* · *I already have an idea* · *Show me an example first* | A plain headline (e.g. *"See the road to the work and life you want: every step, skill and start-up cost, with sources."*); a still picture of a filled-in cockpit labelled *Invented example*; *"What you type stays on this computer."* | Your destination, today's intake, or the example cockpit |
| 2 | **Your destination** (`/start`) | Get where the person wants to end up, one question at a time, and pay off each answer with a receipt | (1) *"What do you want your work and life to look like? Use your own words."* (*I don't know yet* allowed; it began "In a few years" until 2026-10-20, reworded on the maintainer's pick: no times) · (2) a business of your own, a job or career, or both / not sure · (3) province or territory (required: fees, licences and tax rules differ by place) · (4) optional: the yearly income you want, before tax — your number, through the agree prompt. Every question has a *why we ask / what it unlocks* line and *I don't know* | Under each answer, a receipt (*"Alberta and federal rules apply"*); the person's words shown back exactly, with the date | Pick a future |
| 3 | **Pick a future** (`/futures`) | Choose the one business or career to look into, and see its whole road before any more questions | Pick a card (phase 1: *From apprentice to your own shop (Alberta)* and *Starting any business in Alberta (tax and structure)*, in the order added, never ranked) · optional name and kind of work · *"Which job is closest to the work you'd do yourself?"* (decision 5; *Skip* allowed) · *Not here yet?* keeps a note in the person's words and offers the general road | Each card shows counts only: steps, skills listed, official fees found, cost lines you'd price · *"More futures are being written"* · after a pick, the full road drawn in grey | The cockpit on this future (saved to Your futures here) |
| 4 | **The cockpit** (`/cockpit?venture=<id>`) | See the chosen future whole and work through it (§ 2) | Nothing up front. Each gauge showing **?** carries one invitation that opens a one-question box | Destination bar and gauges, the road with one overlay on, the left list, *Next on your road* and the what-if bar | Any step, overlay, gauge or question |
| 5 | **A step opened** (the right panel; today's detail panel, extended) | Everything about one step, and the controls to do it | *Doing / Done / Not for me* · tick each *done when* line · mark the skills it needs: *have / learning / not yet / don't know* · *Add your quote* on each named cost line (then the agree prompt) | One line on what the step is (more on click) · the *done when* checklist, each line cited · skills with the person's mark and the official way to get each (cited) · costs in three labelled kinds (§ 6) · today's rules and tax cards for the stage · sources with read dates · links to official pages the person opens themselves | Back to the road; gauges, receipt and left list update at once |
| 6 | **Compare the endings** (an overlay in the cockpit) | Put the two endings of the fork next to each other so the person chooses | *This is mine* under one column | The same rows in every column: steps left, skills not yet, licences or certificates required (cited), official fees, lines priced, lines not priced, the person's target beside their what-if · a line saying the order (*"In the order the road shows them"*) · no score, no badge, no highlighted column | Back to the cockpit with the pick saved |
| 7 | **Your futures** (`/ventures`, renamed from *Your ideas*) | Every future being weighed or worked on, in the order last touched, never by merit | *+ Another future* · today's stage, notes, links, figures, reminders | Each card adds its road's name, *steps done x of y*, skills not yet, lines priced / not priced, and a *This is mine* pin if set | Any future in the cockpit |
| 8 | **The agree prompt** (today's, reused wherever a number enters) | No number counts until the person agrees to it | *Agree* / *No, I'll do it myself* | The amount, where it came from (typed, quote, link, receipt), the date, and what it will change (*"adds $3,400 to lines you priced"*) | Back where they were |
| 9 | **Your plan** (today's export, from the cockpit) | Hand the road to a partner, accountant or lender with its reasons and sources | Copy, or save as a file | The person's words, the future and ending picked, step status, skill marks, cost lines by kind with sources, what-ifs labelled as theirs, the dated list of what they told DotAmi, the disclaimer | Back to the cockpit |

*Your expenses*, *What DotAmi knows about you* (`/your-data`) and *Settings* stay as they are. `/your-data`
gains rows for the destination, skill marks, step progress and cost lines, so the person can see and
delete them.

Phase 2 adds *Possible futures* with *Peek inside*, and *Side by side* across any saved futures with
the person's own sort (§ 10).

### The way in as built (2026-10-12)

Screens 1 to 3 and the rename in row 7, built from decision 6 and issue #38. Written before the code;
each choice that differs from the table above says why.

- **The front door (`/`) leads with the dream.** The headline is *"See the road to the work and life
  you want."*, with *"Every step, skill and start-up cost, with its sources."* under it. Then three
  doors, side by side on a wide window and one under the other on a narrow one, in this order:
  1. **Start from where I want to be** (the main one, drawn in the accent colour): a line on what it
     does and *"What you type here stays on this computer."* (true of this path: its answers go only to
     DotAmi's own server on this computer, never to a model). One link, **Start here →**, to `/start`.
  2. **I already have an idea**: today's box, *Map it →* and the three example chips, unchanged, inside
     the door. Everything they did they still do (the intake, the parser, the sentence kept with the
     idea). The box is not moved behind a click, so nothing typed before the page has loaded is lost.
     This door doesn't say the words stay on this computer: with a model key set up, the intake's
     parser sends the sentence to that model (Settings says so).
  3. **Show me an example first**: until 2026-10-13 the invented example future wasn't written, so the
     door was drawn without a link and said so. Since the maintainer's pick of 2026-10-13 (§ 13, *the
     example future's content*: Mara) it says *"Look inside a filled-in future for Mara, an invented
     apprentice cabinetmaker in Alberta on her way to her own shop. Her numbers are invented, and nothing
     in it is saved."* and links to **Show me Mara's example →**, `/example/mara` (*The example future as
     built*, below). The still picture of a filled-in cockpit (row 1 above) can now be drawn from her
     example; it isn't yet.

  The header's *Your ideas →* becomes **Your futures →**.
- **Your destination (`/start`): four questions, one at a time, written as data.** The questions are a
  list in `lib/front-door/questions.ts`: for each, a permanent id, the question, *why we ask*, *what it
  unlocks*, the kind of answer, the choices where there are any, whether it can be skipped and what the
  skip button says, and where the answer is kept. The screen draws whatever the list holds, so the later
  step-by-step questionnaire starts from these four. Each answered question stays on screen with the
  answer shown back and its one-line receipt; **Change** opens it again. The receipts are worked out by
  pure functions from the answer and the catalogs (`lib/front-door/receipts.ts`), never written by a
  model, and every amount goes through `lib/format/money-and-months.ts`.
  1. *"What do you want your work and life to look like? Use your own words."* (Until 2026-10-20 it
     began "In a few years", and the first door's line said "Say where you want to be in a few years":
     spans of time DotAmi wrote, which the no-times checks listed for the maintainer. He picked "Reword
     both" that day.)
     **Keep my words** saves it at once as the person's destination (a dated, word-for-word statement,
     `kind: "destination"`, through the statements route, which now accepts that one kind). Receipt:
     *"Kept word for word, dated 2026-10-12. It goes at the top of each future you pick on Pick a
     future; an idea you describe in your own sentence shows that sentence instead."*, with the words
     shown back in quotes (the goal bar shows an idea's own first sentence when it has one, below).
     **I don't know yet** keeps nothing new: *"Nothing kept. You can say it later; nothing here waits on
     it."*, or, when words of the person's are already kept (said before, in this tab or another),
     *"Nothing new kept. Your words of 2026-10-12 are still kept and still show on top of your futures;
     Delete on What DotAmi knows about you removes them, with all your statements."* (statements are
     deleted all at once, never one by one, by design). With no database: *"Not kept: no database
     reachable. A reload, a new window or the desktop app's Go menu asks it again."* (2026-10-24: the words are
     held in the window's memory only, never its storage; *"It stays in this tab only"* until 2026-10-23).
     Changing it adds a new statement; none is written over.
  2. *"Are you after a business of your own, a job or career, or both?"*: **A business of my own** ·
     **A job or career** · **Both, or not sure** (the last is the *I don't know*). The receipt counts the
     futures *Pick a future* lists that have that in them, by each road's `kind` (a *both* road has a
     business and a career): *"Of the 2 futures listed, 2 include a business of your own."* It filters
     nothing: *Pick a future* shows every future it lists. Kept on the future when one is picked (below).
  3. *"Which province or territory are you in?"*, required, no *I don't know*: fees, licences and tax
     rules differ by place and no road can be drawn without one. Choices are the thirteen places as
     codes (`CA-AB` …, the maintainer's decision of 2026-10-11). Receipt, from the catalogs' own
     coverage: *"Alberta's rules and the federal rules apply. 2 futures listed are written for
     Alberta."*, or, for a place whose rules aren't written, *"The federal rules apply; Yukon's own rules
     aren't written yet. No future listed is written for Yukon yet: the ones shown are written for other
     places, and each says which."* § 3 says *I don't know* is always an answer, and its own table marks
     the province as required: the design contradicts itself here, and which one wins is an open item
     for the maintainer (§ 13).
  4. *"What yearly income do you want, before tax?"*, optional. The amount is proposed (a new route,
     `POST /api/person-figures/propose`) and an agree prompt opens; it counts only when the person
     clicks **Agree** (`/api/person-figures/agree`, which answers only DotAmi's own window, like the
     figures' agree route). The prompt is a small one of its own, because today's figures prompt is
     built for a total over a period on one idea and this number belongs to the person. Receipt:
     *"Your target: $70,000 a year, before tax, agreed 2026-10-12. Nothing compares it with
     anything."* **No, I'll do it myself** turns it down, and the receipt says what that leaves in the
     file: *"Turned down. It stays in your data file, marked turned down and shown nowhere, until Delete
     on What DotAmi knows about you removes it."* **Skip** keeps nothing new: *"Not given. Nothing here
     waits on it."* When a target agreed before is still current, both say so too: *"Your target of
     $70,000, agreed 2026-10-12, still stands; Delete on What DotAmi knows about you removes it."*
     The prompt's own line is about the person's own number: *"Double-check the number you typed before
     you agree."*, and Enter in the amount box does what **Keep it** does.

  **What is already kept counts as answered.** `/start` is drawn on the server, which reads the person's
  newest destination and the income they agreed to (`lib/front-door/kept.ts`), so a returning person
  (a reload, a new tab or window, the desktop app started again or its Go menu, or after door 2's *Map it*,
  which starts the journey afresh) sees 1 and 4 answered from the data file, with **Change**, and is asked 2
  and 3 again. The answers to 2 and 3, and what 1 and 4 came to, wait in the journey draft, held in the
  window's memory only (`lib/journey/held-journey.ts`, since 2026-10-24; in the tab's storage until
  2026-10-23): moving between DotAmi's pages, the invented example included, keeps them, and a page loaded
  afresh empties it. Each future picked keeps 2 and 3 on its idea, and `/start` never reads them back from
  there, so the line under their receipts says *"Kept with each future you pick, and nowhere else: a reload, a
  new window or the desktop app's Go menu asks it again, a future picked or not."* 1 and 4 are already in
  the data file. **Pick a future →** shows once 3
  is answered and 4 answered or skipped.

  For the keyboard and a screen reader: the page has one level 1 heading, *Your destination* (seen only
  by a screen reader, since the nav says it), and after each answer focus moves to the next question's
  heading, or to **Pick a future →** when none is left; **Change** moves it to the question it opens.
  Closing the income prompt without deciding gives focus back to the amount box.
- **Pick a future (`/futures`).** The futures it lists, as cards, in the order added (`roadsV2026`),
  never ranked: *"In the order they were written, not ranked. More futures are being written."* Which
  roads it lists is one list, `LISTED_ROAD_IDS` in `lib/front-door/futures.ts`: road 0 and, since the
  maintainer's yes of 2026-10-13 (§ 13, *Listing a road nobody has read*), the first written future,
  whose sources are all tool checks and whose card says so in amber. Picking it opens the cockpit on its
  own road (`e2e/front-door.spec.ts`). Each card shows its name; what it holds (*"A business"*, *"A career and a
  business"*); where it is written for, and, when that isn't the person's place, *"Written for Alberta.
  You said Yukon."*; counts only (steps · skills listed · official fees found · cost lines you'd price);
  and how its sources were checked, counted through `lib/engines/shared/citation-check.ts`: *"Sources: n
  read · m checked by a tool only, not read by a person yet"*, the second part in amber. An optional
  **Name it** box (default: the road's name), then **Look inside →** on each card.
  Picking saves a new idea in one request, the intake's first save: the road (`Venture.roadId` and the
  moment), the *business / career / both* answer (the one added column the task list names, with its
  moment: `Venture.lookingFor`, `lookingForSetAt`), the place and the name. Then the cockpit opens on it
  (`/cockpit?venture=<id>`), drawing that road from its first line. **Not here yet?** keeps a note in
  the person's own words (one of their statements) and opens the general road the same way; when the
  note is kept but the road can't be opened, it says so (*"Your note is kept. The general road couldn't
  be opened: no database reachable."*) and empties the box, so pressing again doesn't keep it twice.
  Answers the cockpit's idea needs are not asked on this path, and nothing is made up for them:
  - *Your current work situation* (§ 3 moves it from a required intake question to an optional one) is
    kept as **not said**, a new value of the column (`NOT_SAID`; SQLite keeps it as text, so no table
    changes). The rules read it as unanswered, road evaluation lists it as not told, and the screens
    write *Not said*.
  - *The kind of venture* (service, product, side gig), *buying equipment, a vehicle or tools* and the
    *first- and third-year sales targets* are kept as **not said** too, listed by permanent id
    (`venture-type`, `equipment`, `sales-targets`) in a new column, `Venture.notSaid` (a JSON list,
    `[]` for every other idea; added by hand-written SQL, one `ADD COLUMN`). The columns themselves
    still hold the intake's starting values (*Service*, no, 0), which the rules read as they read an
    intake idea before it is touched: no rule in the catalogs reads the kind of venture, equipment
    reads as no and a 0 target as none. What changes is what DotAmi says the person told it: road
    evaluation lists the kind of venture and equipment as not told (*given: false*), so part 2's
    *What you've told DotAmi* won't say *"you told us…"*, and the cockpit's rail and the playbook write
    *Not said* for the kind of venture and both targets. A save that carries no list (the intake, which
    asks all three) clears it. *(2026-10-21: `sales-targets` was split into `sales-target-year-1` and
    `sales-target-year-3`, so each year comes off the list on its own: Keep on the what-if gives the first,
    the cockpit's "Your third-year sales estimate" the third, and the rail and the playbook read each year's
    own id. A saved `sales-targets` is read as both, except a first-year number above 0 beside it, which only
    the old Keep could put there, so that year reads as said (the maintainer, 2026-10-22); `lib/scenarios/not-said.ts`,
    [ui-spec/cockpit/incorporating-estimate.md](../ui-spec/cockpit/incorporating-estimate.md).)*

  The job closest to the person's work (decision 5) comes with the OaSIS import; *Pick a future* doesn't
  ask it yet, and doesn't show the road drawn in grey before the pick: the cockpit draws it whole.
- **A second idea skips *About you* (issue #38).** The intake opens on *About you* only for a person
  with no saved idea yet. Anyone with one starts on the screen they came for (*Did we get this right?*,
  or *What are you building?* with nothing typed), and **← Back** still reaches *About you*. That
  includes a person whose only idea came from *Pick a future*, who has never seen *About you*: it is
  optional, one click back, and asking it again of everyone with an idea is what issue #38 removed. Whether the
  person has a saved idea is read on the server when the page is drawn, so the first screen never
  flickers. *Your futures*' button is **+ Another future**, which opens the front door, where both ways
  in are.
- **The goal bar** shows the idea's first sentence when it has one, as today; an idea picked through
  *Your destination* has none, so the bar shows the person's newest destination instead, with its day.
  `GET /api/futures/<id>` gains `destination`.
- **Renamed.** *Your ideas* is *Your futures* on its page, the front door's link, the cockpit's back
  link, *Your expenses*' back link and the desktop app's Go menu. The *What DotAmi knows about you*
  page and its Delete menu keep *Your ideas* for now: its words are tied to the privacy inventory and
  its tests, and change together in their own pull request.
- **Words** for the new screens are in `lib/front-door/words.ts` (the questions' own words are in the
  questions list, since the questions are data); amounts and months go through
  `lib/format/money-and-months.ts`.

### The example future as built (2026-10-13; real numbers 2026-10-14)

The front door's third door, built from the maintainer's pick of 2026-10-13 (§ 13): Mara, the invented
person of the appendix below, on the first written road. Written before the code; the page's controls are
in [docs/ui-spec/example/_index.md](../ui-spec/example/_index.md).

- **Her answers are data in their own file**, `lib/examples/mara.ts` (listed by `lib/examples/index.ts`):
  not a catalog and not the database. Every answer the appendix gives is there. The steps, fees, skills and
  sources are the catalogs' own, named by id, and a test checks each id exists. Where the appendix names
  something the catalog calls differently, the catalog's real item is used: *Set up your shop* is *Open your
  own shop* (she prices its *Woodworking machines and tools* line); her 9 marks are road 1's two legal requirements
  that fit an Alberta apprentice (both *have*) and seven items of the government's list for Cabinetmakers,
  the job she picked as closest to her work (road 1 lists only three skills of its own); her 1 step done
  is the road's first, *Register as a Cabinetmaker apprentice*.
- **Mara is invented; her numbers are real (2026-10-14).** The maintainer's option A (*"ground Mara's
  example in real, cited numbers where they exist; numbers nothing real can supply stay blank"*), asked for
  "as in depth as possible; like recommending tools, software, and lets use stats to drum up the average
  cost of these tools", with the sources shown. Her file types no number: each is taken from
  `lib/examples/mara-sources.ts` (prices and statistics seen on 2026-10-14, each with its link, the words
  seen and the day, kept only when a second check found the price or figure on the page again; not legal
  citations, which name only government sources and back a rule), and every average is worked out by
  `lib/examples/stats.ts`. Her one start-up cost line, *Woodworking machines and tools*, is $14,993.62:
  12 of the tools the Alberta curriculum, the Red Seal standard and NOC 72311 name, picked for this example
  (they name more; the panel lists the ones not priced), mid-range shop grade, one of each at its average
  of 3 to 5 listed prices from Canadian sellers. Her yearly income goal is $52,255,
  the average yearly salary of employed cabinetmakers in Alberta (alis, 2023), said as that in the goal
  bar. She has no what-if (since 2026-10-15, the maintainer's pick A): the what-if bar starts empty, and a
  visitor who wants one types their own, kept nowhere as everywhere and read with the bar's own words.
  ISED's $610,300, the average yearly revenue of existing small and medium furniture makers of every age in
  Canada (NAICS 33712, data year 2024) and her what-if from 2026-10-14 to 2026-10-15, is shown only as
  context in the panel, under *For context, not one of Mara's numbers*: an industry average, not a
  first-year figure and not one of hers. Her savings and
  her shop space deposit are blank: nothing real can supply them. The banner says *"Mara is invented; the
  prices and statistics are real, from the sources listed, seen on 2026-10-14. Nothing here is saved."*
  and its **Where these numbers come from** opens a panel listing every number, how it is worked out,
  every source with its link and the day seen, software listed for this example with its listed plans
  (averaged over the plans billed month to month only; a plan billed once a year is listed apart, whatever
  unit its page prints), and what stayed blank and why. Its first line says Mara and her answers are
  invented and every price and statistic is real (not "every number": her marks and her step done are
  invented). "Recommending tools" is built as information: a pick of the tools the trade's official
  descriptions name, with what sellers charge, never ranked, never "buy this" and never called the trade's
  whole list. `tests/example-sources.spec.ts` traces every number to its entry, recomputes every average,
  reads `lib/examples/mara.ts` to check her two numbers are worked out there, her what-if is null and none
  of them, nor the context figure, is typed as a number or written as money, checks
  the old invented numbers are gone, and keeps verdict and framing words (`tests/helpers/verdict-words.ts`,
  each word with a control) out of the words, the data and the example's components; the browser test
  reads the same lists over the rendered banner, goal bar, what-if bar and panel (2026-10-14, after
  review).
- **The same cockpit, read-only.** `/example/mara` (`app/example/[id]/page.tsx`; any other id is not
  found) draws `CockpitPage` with the example: the same components and the same one run of `evaluateRoad`,
  fed from the file instead of `GET /api/futures/<id>`, with the what-if bar empty. A banner that
  never folds says what is invented and what is real (above) with **Where these numbers come from** and
  **Start my own future →** (`/start`). It sits above the cockpit's grid,
  never inside it, and stays at the top of the window when the page scrolls on a phone; the phone sheets
  and the tablet drawer start under it (its height is `--example-banner-h`), so nothing is drawn over it
  (2026-10-14, after review).
- **Nothing is written, anywhere.** Every control that would save is disabled with *"This is an example.
  Start your own to keep anything."*, or answers with that sentence and does nothing; no request that
  writes is sent, none of the real person's data is read, and no browser storage is read or written (the
  page sits outside the journey's pages, so the journey draft isn't touched, and the fold answers are
  remembered nowhere). `e2e/example-future.spec.ts` compares the data file's row counts, both storages and
  the requests sent before and after clicking Keep and Export (the two save controls not disabled), and
  checks that every other save control in the ui-spec's table is disabled.
- **The appendix's counts against the catalog's.** The page shows what road evaluation gives on today's
  catalog, which differs from the appendix's sketch: 17 steps (not 22; 16 until *Keep your records from day one* was added on 2026-10-14), 31 lines to price before her
  numbers and 30 after (not 6 and 4), and her marks complete the listed skills of 4 steps (not 3). The
  appendix is left as written, a sketch from before the road was; the ui-spec lists the true receipts.

## 2. The cockpit

**Its job, in one sentence:** *the cockpit shows one future you're considering, whole, and is where you
work through it.* This replaces the July plan, cut on 2026-09-14, that kept planning and progress on a
separate Track tab: planning and doing both happen here.

The chosen future is the objective. The person's destination sits on top in their own words. The
road from today to that future is the fixed base picture across the middle. Each overlay answers one
question (what skills, what money, what rules). Selecting anything lights up everything linked to it,
and one panel on the right shows the detail. By default only the road and one overlay show, later
columns fold into *the road ahead*, and one panel is open at a time. Every number is a count of
catalog items, a cited official figure, or a figure the person agreed to; hovering any number shows
where it came from.

### Regions

- **Top — the destination bar.** The person's sentence in quotes, with its date and *Edit*; the
  future and ending (*"From apprentice to your own shop (Alberta) · Ending: Open your own shop (your
  pick)"*), a future switcher and *Compare*; four gauges, each tagged with where its number comes
  from (*your numbers*, *cited*, *count*):
  - **Steps:** *x of y done*.
  - **Skills:** *have · learning · not yet · not marked*, out of the items listed. Counts, not a grade.
  - **Start-up money:** *savings you typed · lines you priced + official fees · difference · N lines
    not priced yet*. Any part not given reads *not given yet: add*.
  - **Your date:** for example *May 2029 · 31 months from today* — calendar arithmetic, shown only
    when the person set a date.

  Clicking a gauge switches on its overlay and opens its list. *Export plan* sits here too.
- **Left — What you've told DotAmi / Not told yet.** *Told:* one row per answer, with its date and
  what it unlocked (the same words as its receipt), and *Change* and *Take back*. *Not told yet:* at
  most five visible questions, each written *"<question> → unlocks <what>"*, with *I don't know*.
  *Your starting point:* facts the person stated (province, work situation, licences held), each
  dated. Folded below: *In your words* (today's statements), today's venture details and structure
  picker, the save line, and *"Compass, not GPS: nothing here is a recommendation."*
- **Centre — the road.** The overlay switch row: *Road* (always on) · *Skills* · *Money* · *Rules &
  tax*. Columns come from the future's own road file; the general road keeps today's four columns.
  Step cards show a name, one line, a status chip (*done · doing · next · ahead · not for me · your
  pick*) and today's colour bar with today's meaning kept (green *applies*, amber *check first*, grey
  *not on your path*). Readiness is shown as counts, never by turning a card green. A *You are here*
  marker is placed only from the person's own stated work situation or progress. Later columns fold
  into *The road ahead · N steps* until opened.
- **Right — the step panel.** Whatever is selected, one thing at a time (today's single right-hand
  slot): a step (§ 1 row 5), a skill (which steps need it, the person's mark, the official way to get
  it, cited) or a cost line (its step, where its amount came from, *proposed* or *agreed*). Since
  2026-10-17 it can also hold *Others in this line of work* (call 7 A of
  [competitive-landscape.md](competitive-landscape.md)), opened from the goal bar and from a step its road
  marks as opening a business: [docs/ui-spec/cockpit/landscape.md](../ui-spec/cockpit/landscape.md).
- **Bottom — Next on your road and the what-if bar.** *Next on your road:* the next three undone
  steps, labelled *"the order steps happen, not importance"*. The what-if bar: *"Try first-year sales
  of $___"* relights the rules under a fixed banner *"Your what-if, not a forecast"*, with *Keep* and
  *Clear*. On a return visit, *"Since last time: …"* lists steps marked, dates the person set that are
  coming up, and today's figure reminders — never a score.
- **Overlays on top of everything:** the agree prompt, the one-question box (one question, a why
  line, *I don't know*, *Save*; on save a receipt lists exactly what changed), and *Compare*.

### Overlays (the layers on the road)

| Overlay | What it adds to the road | Where its content comes from |
|---|---|---|
| **Road** (base, always on) | Columns and steps, status chips, today's colour bar and hover arrows | The future's road file (§ 6) |
| **Skills** | On each step, what it needs and how many the person marked (*needs 3 · you have 2*) | Legal requirements (licences, certificates, registrations) cited to the law or regulator; skills the person added (*added by you*); the OaSIS list for the job the person picked (*your pick of job*) |
| **Money** | Official fees with source and read date, the person's agreed quotes, named lines not priced yet, the savings they typed, and the difference | The fee lines in the road file; the person's agreed figures |
| **Rules & tax** | Today's write-off, threshold, licence, grant and structure cards, coloured from the person's own branch picks | Today's catalogs and `evaluateProfile` |

Phase 2 adds a **Dates** overlay (the person's own dates and dated official deadlines, and a time
strip from today to their date). Under decision 2 there is no *typical numbers* overlay.

### Interactions

- Hover or keyboard-focus a step: arrows walk every path to its end, through the fork to both
  endings, and the rest dims (today's arrows).
- Click a step: the right panel fills, and badges dim except those linked to it.
- Click a skill or cost line in the panel: every step that needs it lights up on the road.
- Click a gauge: its overlay switches on and the panel opens to its list.
- Mark a skill, tick a *done when* line or change a status: the rules run again, the gauges update,
  and a receipt plus a left-list row say what changed.
- Add a quote or savings: the agree prompt, then the Money overlay and gauge update.
- Click a **?** or a *Not told yet* row: the one-question box opens right there.
- Type a what-if: the road relights under the *your what-if* banner; *Keep* or *Clear*.
- *Take back* a row in the left list: the answer is withdrawn (a figure goes to *retracted*, as
  today) and the screen shows what went dark.
- Open *Compare* and click *This is mine*.
- Branch toggles (sales-tax timing, incorporation timing) stay, with two changes carried into phase 1
  (§ 9): card colours follow the person's own pick, and the incorporation toggle's option labels
  change. Today they read *$80K net* / *Liability / SR&ED*; the first becomes *At your own number*,
  so no uncited figure is left on the map or in the export, which copies the label.
- The last overlay used is remembered for that person.

### First visit and return visits

**First visit** (straight after picking a future): the whole road drawn, mostly grey or amber; the
first two columns open and the rest folded; only *Road* and *Skills* on; gauges showing **?** with a
one-line invitation; the *Not told yet* list open with three questions; one coach line that can be
dismissed and doesn't come back: *"Start anywhere. Each thing you tell us lights up part of the road.
Click anything to see where it comes from."*

**Returning:** the cockpit opens on the person's pinned or last-touched future with their last
overlay on, scrolled to the first step not done, with *"Since last time: …"*. The left list folds to
a count (*"12 things you've told DotAmi"*).

### First visit and return visits as built (2026-10-17, the calm first view, S2.5.30c)

Asked for by the maintainer on 2026-10-17 (*"there's a LOT on the screen"*; his picks: tests and a calm
screen first, a calm first view enforced by the clutter limit, "Your date" kept) and held to the layout rule
([docs/ui-spec/README.md](../ui-spec/README.md)): the road is the primary thing, and a first visit shows the
road, the goal and the next steps, with everything else folded one click away (since 2026-10-20 the legend
and the what-if bar from *Look closer*, below). Nothing was removed.

- **A first visit** is a browser with nothing remembered for the cockpit (`lib/cockpit/folds.ts`
  `FIRST_VISIT`): the rail folded (its strip from 768 px; the header's *Venture details* below), the legend
  and the what-if bar folded, the road's columns after the first two folded into *The road ahead · N steps*,
  and only *Road* and *Skills* on, every overlay switch drawn (Money and Rules & tax off, each one click
  away). The
  goal bar is open with its gauges and their invitations, and the coach line from the design sits under the
  overlay row with *Got it*, which puts it away for good in this browser and leaves keyboard focus on the
  road. On a phone, where nothing above the road folds, the coach line sits under the road instead, and the
  overlay switches are 24 px tall rather than 32: a review (2026-10-17) found the line and taller switches
  had put the road about 100 px lower on a phone than before the calm view; now it starts where it did.
- **What is not built from the design:** the rail does not open with the *Not told yet* list on a first visit
  (it is folded with the rest of the rail; one click, and its questions are at its top as before); the page
  does not scroll to the first step not done, and the folded rail shows no count of what was told. The
  gauges show their counts and invitations rather than a **?**.
- **Look closer.** The goal bar's *Compare* and *Others in this line of work* are one menu button, *Look
  closer*, and *About this job* joins it when built (`components/cockpit/look-closer-menu.tsx`, a WAI-ARIA
  menu button; [docs/ui-spec/cockpit/07-goal-bar.md](../ui-spec/cockpit/07-goal-bar.md)).
- **Folded means one button, not a line.** The folded legend and what-if bar are hidden whole, each with its
  *Show* button at the end of *Next on your road*, under the map where they were (while a what-if is on,
  that button is followed by *Your what-if, not a forecast* and its number). The folded road ahead is one
  column naming the later columns. **Since 2026-10-20** the legend's and the what-if bar's *Show* buttons are
  items of *Look closer* instead, listed while each is folded, and the folded goal bar's one line carries the
  menu too: with both buttons in view, Mara's example at 1280 × 720 counted 23 controls on its first screen
  against a limit of 21, and the maintainer picked a calmer screen over a higher limit. *Next on your road*
  keeps only the what-if note.
- **The overlay switches don't fold.** For a few hours on 2026-10-17 Money and Rules & tax folded behind
  *Show more layers*. A review found that this put the rules and tax cards, on by default until that day,
  two clicks away, and that a switch left the page when it was switched off with the layers folded, taking
  keyboard focus with it. Every switch is drawn again; only the layer is off, as the design asks. A switch
  whose layer has nothing on the road (road 1's *Rules & tax · 0 cards*) is drawn off and can't be pressed.
- **Regions.** The header and the goal bar share one strip, and the overlay row, the map and *Next on your
  road* one column, but each block is still a region of its own for the clutter limit, as the layout rule
  defines one, and so is the coach line while it is drawn (docs/ui-spec/README.md, "The cockpit's regions").
  A first visit has 8 regions from 768 px and 7 on a phone, one fewer than before the calm view.
- **Return visits.** Whatever the person folds, opens or switches is remembered in this browser under the
  same key as before, `dotami-cockpit-folds`: the six folds, the overlays last on (*the last overlay used
  is remembered*, from § 2's interactions), and whether the coach line was put away; nothing is written
  until the person changes something. A value stored before 2026-10-17 (it has no `roadAhead`) is a return
  visit in every way: its new folds read as open, so a person who had everything open still has; the
  overlays are the ones every visit had then (Rules & tax on, Skills and Money off); and the coach line,
  which is for a first visit, isn't drawn (a review found that browser with Rules & tax off and the tip back). The privacy inventory lists what the key holds. In the desktop
  app this lasts between launches since the same day: the app uses the same local address each time
  (`desktop/app-port.mjs`); until then each launch had a new address, empty storage, and so a first visit.
- **The example** (`/example/mara`) opens the same calm way, its banner unchanged, with no coach line (nothing
  can be told there); nothing is remembered on it.
- **Measured** (the clutter limit, `e2e/clutter-budget.spec.ts`, a fresh idea on *Pick a future*): see the
  pull request; `e2e/budgets.ts` holds the new limits.

### Cockpit screen as built (2026-10-12, part 1 of 2)

The first cockpit pull request builds the top, the centre, the right panel and *Next on your road* on
the cockpit page for a saved idea (`/cockpit?venture=<id>`), drawn on the idea's road through road
evaluation (§ 6). Every saved idea is on road 0 until *Pick a future* lets a person choose another, so
road 0 is what a person sees today; nothing in the screen knows which road it draws. Part 2, a later
pull request, adds the left list (*What you've told DotAmi / Not told yet* with a receipt after each
answer), the what-if bar, *Compare* and *This is mine*. The left rail stays as it is until then.
*(2026-10-12: part 2 built; see "Cockpit screen as built, part 2" below.)*

- **One run, one picture.** The page reads what is kept (below), passes it to `evaluateRoad`, and draws
  the gauges, the step colours, the badges, the step panel and *Next on your road* from that one result.
  The map's lever cards come from the same run's rules. Only business totals the person agreed to go to
  the rules; the planning numbers go to the money sums through `agreedPlanning`.
- **The goal bar.** The idea's first sentence (the one typed on the front door, kept since 2026-10-11)
  in quotes, word for word, with its day; the yearly income the person agreed to, only when there is
  one, labelled *your target* with the day agreed; the future, by its road's name. A road not written for
  the idea's province (nor for all of Canada) is named as the map drawn, not as the person's future:
  *Map drawn: <name> · written for AB; this idea is in BC*. Then four gauges, each a button tagged with
  where its numbers come from:
  - **Steps** (*count*): *x of y marked done* (and *n doing* when any), and the first step of *Next on
    your road*. A step counts as done only when the person marked it done.
  - **Skills** (*your marks*): *have · learning · not yet*, and *n not marked, out of m listed*; the
    skills the person added are counted apart. A road that lists none says so.
  - **Start-up money** (*yours + cited*): official fees and the person's own numbers, each with its
    count of lines (*$1,860 official fees (3 lines) · $3,400 your numbers (1 line)*). A part with no line
    behind it shows no amount: no official fee part when no fee counts, and *your numbers: not given yet*
    when the person agreed to none, never *$0* (the badges' rule: a blank is never $0); *n official fees apply only sometimes, not added
    up* (an `onlyIf` fee is in neither part: the badges leave it out of a step's sum and say so, and the
    step panel and the money list show its condition); *n not priced yet*; the lines left out (off the path, or waiting on a fork with no pick); the
    savings; and *savings minus both* only when road evaluation gives that difference. A road with no
    cost lines says so.
  - **Your date** (*yours*): *May 2029 · 31 months from today*, only when the person set a month;
    otherwise *not set* and one invitation to add it.

  Clicking **Steps** opens the first step of *Next on your road*; **Skills** and **Money** switch their
  overlay on and open their list in the right panel; **Your date** opens the month box there. Clicking
  the pressed gauge again closes what it opened (the overlay stays on), so its pressed state toggles. No gauge
  shows a verdict word: the words file is tested against the same list road evaluation is.
- **The road with overlays.** A row of switches over the map: *Road* (always on), *Skills*, *Money*,
  *Rules & tax*, each with its count (skills listed and cost lines for the whole road; the rules and tax
  cards the map draws, each once, so none from a card drawn dashed).
  *Rules & tax* starts on, so the map looks as it does today; *Skills* and *Money* start off. On, *Skills*
  puts *needs 3 · you have 2* on each step that lists skills, and *Money* puts the step's priced sum and
  *n not priced* on each step with cost lines; off, *Rules & tax* hides the lever cards. The badges are in
  each card's accessible name too. The last overlay used is not remembered yet. *(2026-10-17: remembered in this browser, and a first visit opens with Road and Skills on: "First visit and return visits as built" above.)*
  Step colours are road evaluation's states (*applies*, *check first*, *not on your path*), which on
  road 0 are exactly the rules' colours. A step the person marked *not for me* is grey by their choice,
  so its card's name says *set aside by you* rather than *doesn't apply as answered*, and the legend says
  so while any card is set aside. A column that decides a fork says *The road splits here: you
  choose*. Selecting a skill (in the step panel or the skills list) dims every step that doesn't list it.
  Drawn without the cockpit's overlays (no new props), the map is the same HTML as before, byte for byte.
- **The step panel** replaces today's node detail when a step is selected and keeps all of it (the two
  lines, the rules and tax cards for the stage and elsewhere, *More about this stage*, the sources
  through `CitationLinks` with *Show the words*). Above the cards, in this order: why the step has its
  colour (road evaluation's sentence); at a fork, *The road splits here: you choose* with that column's
  toggle; *Your status*: **Doing**, **Done**, **Not for me** (pressing the one already on takes it back);
  *Done when*: each line with a box and its citation, ticks saved as they're made (the boxes wait while a
  save is read back, since each save sends the whole list); *Skills it needs*: each item with **Have**,
  **Learning**, **Not yet** and **I don't know** (which removes the mark) and the item's own sources,
  *you said you hold this* on a legal requirement marked have, and the cited way to get one marked *not
  yet*; *Costs*: the three kinds, an official fee with its source and day read, the person's agreed
  number, or *not priced yet* with **Add your quote** (the amount and where it came from: a quote, a
  link, a receipt or your guess), and a named line's name source when it has one; then *Official pages
  you open yourself*, the step's own links, when it has any. A quote is proposed, then the agree prompt opens; it counts only once the
  person clicks **Agree**. A list that is empty on this road says so in one line.
- **The lists behind the gauges.** *Skills*: every skill the road lists, with the same marks and sources,
  and *Your own skills*: **Add a skill** (in the person's words, up to 120 characters) and a mark on each,
  with **Remove** where the road's skills say *I don't know*, since taking the mark off a typed skill
  removes it. *Money*: every cost line by step in road order, each official fee with its citation, and
  **Add your savings**, through the agree prompt.
  *Your date*: a month and year box, **Save** and **Clear**; a month already gone is refused.
- **Next on your road**, under the map: the first three steps, in road order, that are on the person's
  path and not done, labelled *the order steps happen, not importance*. Clicking one opens it. *On the
  path* and *done* are read the way each card's chip reads them (`lib/cockpit/view.ts` `mapPlace`): the
  person's own status where they set one, else the map's worked-out place. So the list never names a card
  the map shows *done* (stage 0, worked out from the toggles) or *not on your path* (the side of a fork
  not picked), nor one road evaluation greys. The Steps gauge's *next on your road* is its first.
- **Road 0's statuses are the person's now** (the task list's open line; § 7 said a later pull request
  may do it). The map's *active, done, set aside* lists are worked out from its toggles on every load,
  so a status set "through the map" couldn't be kept, and road evaluation already refused to read those
  lists as the person's (§ 6). So the person's status for a road 0 step is kept in step progress like
  any other road's: the storage code accepts it, road evaluation reads it, and the map's chip shows it
  (*doing*, *done*, *not for me*) where the person set one, and the worked-out chip everywhere else. The
  toggles and their worked-out lists are untouched. *Since last time* gets road 0's history from here.
- **The lever cards move onto the road step** (§ 6). A step names its rules and tax cards in
  `engineHints`; road 0's are today's `NODE_ENGINE_HINTS`, written into its catalog file, and the old
  name is now read from the road, so the readout API and the tests see the same lists.
- **Where things are kept, and who may write them.** One read, `GET /api/futures/<idea id>`: the
  idea's road, picks and month, its step progress, the person's skill marks, the agreed yearly income
  and the first sentence. Three writes: `POST /api/futures/<idea id>/progress` (a status or ticks),
  `POST /api/futures/<idea id>/date` (the month) and `POST /api/skill-marks`. Each reads its body through
  `readJsonWithLimit`, has a rate limit, and answers only DotAmi's own window, as the settings routes do:
  each is the person's own click, and an agent's way to propose one is the Lens's, later. Quotes and
  savings go through the figures routes already there (propose, then the agree prompt's agree). The
  read has a rate limit and no window check, like the figures list.
- **Words and numbers.** Every sentence the new controls show is in `lib/cockpit/words.ts`; every amount
  and month goes through `lib/format/money-and-months.ts`.
- **Not in part 1:** the left list and its receipts, the what-if bar, *Compare*, *This is mine*, *Since
  last time*, the one-question box, remembering the last overlay, the export gaining the new answers,
  and the yearly income question. (Phone width was its own next item; it is built, with folding, in
  *Folding and phone width* below.) With no road written beyond
  road 0, no step has *done when* lines, listed skills or cost lines yet, so those sections show their
  empty line until the road content lands; the tests use an invented road for them.

### Folding and phone width (2026-10-12)

The maintainer, 2026-10-12, after clicking through part 1: *"there's a LOT on the screen, and we need to
be able to open and close any menu in order to see the entire roadmap because some of the tax boxes
don't even fit on the screen"*. And issue #4 (2026-09-20): the cockpit can't be read 375 pixels wide.
Measured on the part 1 page (main at f24d22c, an invented Alberta idea, 2026-10-12): at 1280x720 the
goal bar took 153 px and the legend 70 px, leaving the road 296 px of height; at 375x812 the legend
wrapped to 342 px and left the road 20 px; at 768x1024 with a step open the road was 20 px tall too.

- **Four regions fold, each with its own button that says what it does.** The left rail (*Fold venture
  details* / *Show venture details*), the goal bar (*Fold goal and gauges* / *Show goal and gauges*),
  the right-hand panel, whatever it holds (*Fold the panel* / *Show the panel: <what is in it>*, for
  example *Show the panel: Sole Prop activation*), and the map's legend (*Fold the legend* / *Show the
  legend*). The header has *Fold all panels*, or *Show all panels* once everything is folded. Each
  button says whether its region is open (`aria-expanded`).
- **Folding hides nothing for good.** A folded region keeps its unfold button where it was: the rail
  becomes a narrow strip, the goal bar one line that still holds the four gauges as buttons (name and
  value, with the lines under each in the button's title), the panel a narrow strip naming what it
  holds, the legend one line. What is inside stays on the page, only hidden (the open goal bar sits
  behind its one line), so a half-typed statement in *In your words* is still there when it unfolds,
  and so is the rail's scroll position.
- **Focus follows the fold.** The button pressed to fold or show a region is often gone afterwards (a
  folded rail is a strip, the folded goal bar a different line), so focus moves to the button that now
  stands for the region; a keyboard or screen-reader user is never sent back to the top of the page.
- **The panel stays folded while the person moves around the road.** Clicking another step, a gauge or
  *Export* puts the new thing in the folded panel and its strip names it; *Show the panel* opens it.
  Closing the panel is still its own *Close* button and clears what it held, as before.
- **Remembered per browser.** The four answers (folded or not) are kept in this browser's own storage
  under `dotami-cockpit-folds`, one small JSON object, read when the cockpit opens and written on every
  fold (`lib/cockpit/folds.ts`). Every read and write is wrapped so a browser that refuses storage
  (private windows, storage switched off) gets a cockpit with everything open and folding that works
  until the window closes. Nothing goes in the data file and nothing leaves the computer; the privacy
  inventory lists the key. Everything starts open, so a person who never folds sees part 1 unchanged.
  In the desktop app each launch is served from its own local address, so its storage starts empty: the
  folds last until the app closes and it opens with everything showing (the same as the intake's list of
  typed job descriptions). *(2026-10-17: no longer; the app uses the same address on every launch while its
  usual port is free, `desktop/app-port.mjs`, so the folds last between launches.)*
- **The proof at 1280x720.** With every panel folded, each stage card and each rules and tax card on the
  road is fully inside the window once the road's own area is scrolled to it, and the road's area is at
  least 400 px tall (`e2e/cockpit-fit.spec.ts`). The pull request carries a 1440x900 screenshot before
  and after.
- **Phone width (below 768 px, issue #4).** The page never scrolls sideways. The road keeps its columns
  and scrolls sideways inside its own area, one column at a time (each column is the window's width less
  the margins, and the scroll snaps to a column's edge); its area is 70 % of the window's height, and the
  page itself scrolls down to *Next on your road* and the legend, so the legend can no longer squeeze the
  road. The left rail is not a column: *Venture details* in the header opens it as a full-width sheet,
  with *Close venture details* at its top. The right-hand panel opens as a full-width sheet over the
  road, closed by its own *Close*; folded, it is a bar along the bottom, one full-width button 44 px tall,
  and the page leaves room under its last line for the bar so it never covers the *not legal or tax
  advice* line. A sheet that covers the page takes the keyboard with it: focus goes to its first
  control, Tab stays inside it, Escape closes it, the page behind is inert, and focus goes back to what
  opened it (`components/cockpit/use-sheet.ts`). The fold buttons are at least 32 px tall. The gauges
  keep their row, which scrolls sideways inside the goal bar.
- **Between 768 and 1024 px** the rail is a column again, and the right-hand panel opens as a 420 px
  drawer under the header, over the road's right side, instead of squeezing the road (the header's
  *Export* and *Fold all panels* stay free to click); from 1024 px it is a column, as before.
- **The map's own drawing is unchanged.** The folding legend and the phone-width columns are drawn only
  when the cockpit asks for them (`StrategyMap`'s `cockpit` prop); drawn without it, the map is the same
  HTML as before, byte for byte (`tests/road-map.spec.ts`).
- **Part 2's panels fold too (2026-10-13, after both pull requests met).** *Every region can be folded
  open and shut*, so each panel part 2 adds sits in a region that folds: *What you've told DotAmi / Not
  told yet* and the one-question box at the top of the rail, folding with it; *Compare the two endings*
  and the receipts in a step or a list in the right-hand panel, folding with it (its folded strip says
  *Show the panel: Compare the two endings*). The what-if bar and *This visit*, under the map, were
  outside every region, so they are a fifth region: *Fold the what-if bar* / *Show the what-if bar*,
  folding to one line the way the legend does, the answer kept as `whatIf` with the other four (an
  answer stored before has none, which reads as open), and *Fold all panels* folds it too. While a
  what-if is on, the folded line still says *Your what-if, not a forecast* and its number, since the map
  is still relit by it. The open rail is up to 280 px wide, as part 2 made it.
- **The road keeps a minimum area (2026-10-14).** With the what-if bar open and a what-if on, the road's
  area shrank to 20 px at 1280x720 and the legend slid under the bar (all of it at 1024x768 with
  *Compare* beside the road), so *Fold the legend* couldn't be clicked; the journey browser test found it
  in CI. From 768 px the road's area is now at least 12rem tall, the legend ends where the bar starts,
  and the canvas column scrolls down when what it holds is taller than the window
  (docs/ui-spec/cockpit/12-folding-and-phone.md; `e2e/cockpit-fit.spec.ts`).

### Cockpit screen as built, part 2 (2026-10-12)

The second cockpit pull request adds the pieces part 1 left out: the left list, a receipt after every
answer, the what-if bar, *Compare* with *This is mine*, and the one-question box. Everything still comes
from road evaluation (`lib/roads/`), now run more than once: once for the screen, and once more for each
answer, before and after it or with and without it. Choices made while building it, each for a reason:

- **The left list sits at the top of the left rail.** *What you've told DotAmi* first, then *Not told
  yet*, then the rail as it was (the venture's details, the structure picker, *In your words*, the
  ladder, the save line and the *Compass, not GPS* line), unfolded. The design folds that part away;
  folding is the separate *open and close every panel* work, so this pull request doesn't fold anything,
  and the two don't change the same lines twice. The rail is a little wider (up to 280 px) so a row and
  its receipt fit. *Your starting point* (place, work situation, licences held) is not a section of its
  own: each of those is a row of *What you've told DotAmi*, as the person said it.
- **What you've told DotAmi** is every answer road evaluation read that the person gave (`answers`,
  `given: true`; a default the person hasn't set, such as the map's default pick, is never listed), in
  road evaluation's fixed order, except a what-if, which is never kept. A row is the answer in its own
  words (*You told us your date is May 2099*), its day, and what it unlocked. The day is the day kept
  with the answer: a skill mark's day, the day a step's status last changed (ticks: the day the step was
  last changed), the day an ending was picked, a number's day agreed, the day the month was set. The
  idea's own answers from the intake, and road 0's map picks, keep no day of their own (the idea's
  last-saved time moves with any edit, § 7), so those rows say *day not kept* rather than borrowing one.
- **What it unlocked is worked out, never written.** `withoutAnswer(input, answerId)` (`lib/roads/`,
  pure) gives road evaluation's input with that one answer taken away, and the row shows
  `roadReceipt(without, with)`: the same lines a receipt shows, so the row's words and the receipt's are
  the same by construction. Three answers have no *without* (the place, the kind of venture and the work
  situation: the map can't be drawn without them), so `withoutAnswer` gives null and the row says it can
  be changed but not taken back. Measured cost: one extra run per row (§ 6: about 0.36 ms a run on
  today's general road).
- **Change and Take back.** *Change* goes to where the answer is given: the step (status, ticks, a
  quote), the Skills list (marks), *Compare* (an ending), the one-question box (the month, savings, the
  place, the structure, buying equipment, *I'd incorporate at*, a map pick), the intake (the idea's other answers;
  the place moved to the box on 2026-10-23, S2.5.33's bug 33a: the intake's save is always a new idea, so its
  Change made a second idea and left the first in the old province)
  or the idea's figures on *Your ideas* (agreed business figures). *Take back* removes the answer the
  same way `withoutAnswer` does: a mark or a status through its route with *I don't know* / none; ticks
  emptied; a quote or savings retracted through `/api/figures/retract` (kept in the history as
  retracted, as today); the month cleared; an ending through the new ending route; and the idea's own
  answers through the map's save (the structure back to *not set*, a map pick back to the map's default,
  the person's *I'd incorporate at* number cleared, and so on). The receipt for a take back is therefore
  exactly the row's *what it unlocked*, read the other way. Rows with no take back say why (*the map
  needs it*; *take back figures on Your futures*). A yearly income target has no route to take it back
  yet, and no screen asks for it yet, so its row shows no buttons.
- **Not told yet** lists, in a fixed order that is the order DotAmi asks them and never importance: your
  date; your savings; your numbers for the cost lines not priced yet; your marks on the skills not
  marked; an ending at each fork of the road with no pick (not road 0, whose forks always have the map's
  pick); your pick at each of road 0's forks while it is still the map's default; your structure while
  the map assumes one; buying equipment while unanswered; and, on road 0, your own *I'd incorporate at*
  number. *(2026-10-17, the idea harness's findings: a question no answer can change isn't asked. A road 0
  pick is asked only where picking the other side changes something on the road, so GST timing isn't
  asked of ride-share and taxi drivers, who register from the first paid ride either way; and *I'd
  incorporate at* only where some answer changes the road: the rule reads the Incorporation timing pick
  and compares the number with the idea's third-year sales estimate, so it is asked only with that
  estimate and with Incorporation timing on the side that holds *Incorporating* (the review of PR #182
  added the pick), as § 3's table planned (*"a Not told yet row once a sales what-if is kept"*), its line
  naming that comparison. The step's panel still takes the number at any time. That hides no dead end: a
  future picked on road 0 keeps no third-year estimate and nothing in the cockpit asks for one, so there
  *Incorporating* can't light; its card and panel say it needs that estimate (second review of PR #182),
  and whether the cockpit asks for one is listed for the maintainer in `docs/task-list.md`.)* Each row is *"<question> → unlocks <what>"*, where *what* names the part of the screen the
  answer feeds (a gauge part, a step that can light, the map reading your pick instead of its default),
  never a promise of a result. At most five show; the rest are behind *n more*. Every row has **I don't
  know**, which keeps nothing: it folds the row away for this visit (*n you don't know yet · Show them*),
  and the gauges and cards it feeds stay as they were.
- **The one-question box** (§ 2, *Overlays on top of everything*, named for phase 1) opens under the row,
  in the left list, not as a window over the map: the question, its *why we ask* line, one control,
  **Save** and **I don't know**. It takes the month, the savings (then the agree prompt, as everywhere),
  a map pick (its two sides), the structure (sole prop or corporation), buying equipment (yes or no) and
  *I'd incorporate at* (whole dollars). Questions with more than one answer in them (cost lines, skills)
  or a choice that needs the two sides seen together (an ending) open their list or *Compare* instead.
  The gauges' own invitations still open their lists, as in part 1.
- **A receipt after each answer.** Every answer saved anywhere on the screen (a status, ticks, a mark, a
  skill of one's own, a quote or savings once agreed, the month, a map toggle, the structure, an ending,
  a take back, an answer in the box, a what-if kept) runs road evaluation on the input before and after
  it, and shows `roadReceipt(before, after)` where it was given: in the step panel, the list it came
  from, *Compare*, the left list or the what-if bar, as a status line read out by a screen reader. *After*
  is built from what the save read back, never from what the screen hoped would be kept. A save that
  changes nothing on the road says *Saved. Nothing on the road changed.* The *I'd incorporate at* box in
  a step's panel saves as the person types, so it gives no receipt per keystroke; the same answer given
  in the one-question box does. *(2026-10-12, after review: the idea's own answers, kept with the map
  (the structure, a map pick, buying equipment, *I'd incorporate at*, a what-if kept, and a take back of
  any of them), had their receipt worked out from what the screen sent, before the save had run. They
  now wait for the map's save, whose route answers with the idea as it kept it, read back from the data
  file (`POST /api/scenario/save` → `scenario`), and *after* is built from that. Until it answers the
  receipt says *Saving your answer…*; a save that fails says *Not saved yet*, adds nothing to *This
  visit*, and leaves the save line's *Save now* to try again. A take back that changes nothing on the
  road names what was taken back: *Saved: you took back … . Nothing on the road changed.* In the left
  list the row or box the person clicked is gone once they answer, so the receipt there takes the
  keyboard focus and is scrolled into view.)*
- **This visit, kept briefly.** The newest five receipt lines of this visit stay in a line under the
  map, newest first, so a receipt closed with its panel isn't lost. They are kept nowhere: a reload
  starts the line empty. *(2026-10-12, after review: named* This visit*, not* Since last time*, which a
  person returning reads as "since my last visit"; that name is kept for the return visit's list. Only
  the newest line shows, the rest behind* n more this visit*, so the map keeps its room at 1280 by
  720.)* The return visit's list, *Since last time* (steps marked since the person's last visit, dates
  coming up, figure reminders), needs the day of the last visit, which DotAmi doesn't keep; it is left
  for a later pull request.
- **What the map's save keeps (2026-10-12, after review).** A pick at one of road 0's forks is the
  person's on either side, the map's default side included, so it is kept with the map's answers: the
  fork ids the person picked, under their own key `decided` in the same JSON as the picks
  (`ScenarioState.activeBranches`, `lib/db/scenario-state-json.ts`), and a reload still lists it and
  the toggle no longer says *default, not your pick yet* (Compare said *Your pick* until 2026-10-13,
  when road 0 stopped offering Compare, below). Until then the map kept its clicks for the session only, and a pick of
  the default side said *Saved* and was gone after a reload. Buying equipment is an answer only when the
  person gave one: the intake's chip starts off and off is the chip not picked, so it is *not answered*
  (the rules read it as no, and say so), never *you told us you're not buying*. A yes is kept in
  `Venture.capitalPurchasePlanned` as before; a *No* in the one-question box under its own key
  `equipmentNo` in the same JSON. Ideas saved before this read as not answered unless their chip was on.
  A *done when* tick keeps no day of its own (the step's last change is not the tick's), so its row says
  *day not kept*. The rail's sales targets say *not given* for no number, never $0. Every *Change*, *Take
  back*, *Answer*, *I don't know* and *This is mine* names its row or side to a screen reader.
- **The what-if bar** sits under the map, above *Next on your road*: *Try first-year sales of $___* and
  **Try**. While a what-if is on, the bar says **Your what-if, not a forecast**, shows its receipt (what
  it relit), and offers **Keep** and **Clear**. It goes to road evaluation's `whatIf` only, so it relights
  the rules and tax cards and the steps the rules colour, and never touches a money sum or a figure; it
  is kept nowhere. **Keep** writes the number as the idea's own first-year sales, the Year 1 field the
  intake already keeps with the map (§ 3: *"Today's Year 1 / Year 3 fields when kept"*), never a figure,
  then clears the what-if; it is then an answer like any other, with its receipt and a row in *What
  you've told DotAmi*. A number that isn't a whole, non-negative number of dollars is refused on screen.
- **Compare the two endings** opens in the right-hand panel (one thing at a time, as part 1's lists do),
  from a **Compare** button on the goal bar, from the step panel at a fork, and from a *Not told yet*
  ending row. With more than one fork on the road, the person picks which fork, in road order. Each side
  is a column with its step's name; the rows are the same in both, all counts and sums from road
  evaluation run with that side picked (`compareEndings`, `lib/cockpit/`): steps on your path, of those
  not marked done, steps not on your path; skills listed on your path as *have · learning · not yet · not
  marked*, and the legal requirements among them; official fees and your numbers, each with its lines;
  lines not priced yet; fees that apply only sometimes; and the rules and tax cards that apply and that
  say check first. A line says *In the order the road shows them*. No score, no total, no badge and no
  highlighted column: both columns are drawn the same, and the only difference on screen is which
  **This is mine** button is pressed. Above the table one line says whose pick stands (*Your pick*, *the
  map's default pick, not yours yet* on road 0, or *no side picked yet*). The person's target and
  what-if rows are left out: neither changes with the ending, and no screen asks for the target yet.
  *(2026-10-12, after review: a what-if does change the rules and tax cards, on both sides alike, and
  Compare's panel has no what-if banner, so Compare is worked out without it. On road 0 each column also
  gives the map toggle's own short name (*on the map: “Voluntary now”*), since the step's name and the
  toggle's differ; and when no row differs between the two endings, a line says so, so two identical
  columns don't read as a fault.)*
- **Where Compare is offered (2026-10-13: the maintainer answered PR #159's questions with their
  defaults; for question 1 that is Compare only where a fork changes the path).** Only at a fork whose
  own pick, not the rules, puts steps on or off the path.
  `forksToCompare` (`lib/cockpit/told.ts`) runs road evaluation once with each side picked, leaving out
  the person's step statuses and the what-if so the offer is the road's and doesn't come and go as steps
  are marked or a number is tried, and keeps a fork when some step's state differs between the two runs
  for a reason that is that fork's pick (the side picked, the side not picked, or a step reached only
  through it); a step the rules colour differently in the two runs doesn't count. It reads the road's
  own steps, never a list of road ids (tested on an invented road whose fork's two sides the rules grey
  whichever is picked: not offered). On today's Alberta road (road 0) flipping a toggle does move a step
  between *check first* and *not on your path*, but the tax rules do that, colouring the sides whichever
  is picked, and both columns' step and money counts come out the same (only the GST fork's skills rows
  differ, since the mandatory registration step lists the GST/HST legal requirement and the voluntary
  one lists nothing; that is what each step lists, not the pick); so neither of its forks is offered, and its
  picks are made on the map's toggles (also in the step panel) and in the one-question box. On the
  apprentice road the pick itself puts one ending's steps on the path and the other's off it, so its
  fork is offered. Where no fork is offered the goal bar has no **Compare**
  button and the step panel no **Compare the endings**, rather than a button that leads nowhere.
- **This is mine** keeps the pick where each road keeps it (§ 7): on road 0 it is the map's toggle, saved
  with the map (not reached since 2026-10-13, as road 0 offers no Compare); on any other road, `POST /api/futures/<idea id>/ending { forkId, stepId }` (or `stepId:
  null` to take it back, which the told list's *Take back* uses), through `pickEnding`, guarded like the
  other writes (DotAmi's own window, `readJsonWithLimit`, a rate limit). Then the receipt.
- **Words and numbers.** Every new sentence is in `lib/cockpit/words.ts` and every amount and month goes
  through `lib/format/money-and-months.ts`; the copy test covers the new components too.
- **Not in part 2:** the return visit's *Since last time* list (above); remembering the last overlay;
  the export gaining the told list; the yearly income question and taking it back; a receipt per
  keystroke in the *I'd incorporate at* box; folding the rail and phone width (their own items).

### Your plan as built (2026-10-13)

§ 1 row 9's *Your plan*, as a page of its own (issue #41: the export read as developer text, odd for
something handed to an accountant). Per-control behaviour: [docs/ui-spec/plan/_index.md](../ui-spec/plan/_index.md).

- **Where.** `/plan?venture=<idea id>`, opened from the cockpit's **Export** panel (*Open your plan to read
  or print*), which keeps **Copy markdown** and **Save as .md** as they were. **← Back to the cockpit**
  goes back.
- **What it is made from.** Only what DotAmi keeps for the idea and the catalogs, read on the server for
  each visit (`lib/futures/read-plan.ts`: the saved idea, what `GET /api/futures/<id>` gives, the idea's
  figures), turned into one road-evaluation input the way the cockpit turns it (`lib/cockpit/view.ts`
  `cockpitInput`, with no what-if), and laid out by one pure function, `lib/cockpit/plan.ts` `buildPlan`,
  which runs road evaluation and the told list itself. So the plan's states, sums and told rows are the
  cockpit's, from the same functions, never a second reading.
- **What it shows**, in order: the person's words (the sentence typed for the idea and, when different,
  the newest destination, word for word and dated) and their agreed yearly income; the future, who picked
  it, and the ending at each fork; the four gauges; every step of the road, column by column, with the
  person's status, its state and reason, its *done when* lines ticked or not, the skills it needs with the
  person's marks, a count of its cost lines, official pages and sources with how each was checked; the
  skills and requirements the road lists, each with the person's mark or *not marked*, and the person's
  own skills (names only; the government's list for the job picked shows the marked items and its
  licence's attribution, never the ratings); start-up money in the three kinds of § 6 (an official fee
  with its source and the day it was read or tool-checked; the person's agreed quote as theirs, with its
  day and where it came from; a named line not priced yet with no amount); *What you've told DotAmi*,
  row for row; and the standing not-advice line, which is also in the heading, so the first page carries
  it. The words' heading is *In your words*: the idea's own sentence isn't the person's statement of where
  they want to be, and the destination's line says it isn't tied to one idea.
- **Print.** `window.print()`, so the computer's own print window, with *Save as PDF*. Print styles (in
  `app/globals.css` and Tailwind's `print:` variant): no bar, no footer on this page (every other page
  keeps the footer's not-advice line on paper), black on white, a new page per section, a step never
  split, every link printed as its address (the link's text is the address). In the desktop app,
  Electron's `window.print()` is expected to open Windows' print window, and nothing in `desktop/`
  blocks it; it has not yet been tried in the packaged app.
- **A failed read.** When the data file can't be read just now, the page says so and that nothing was
  changed, with the way back to the cockpit; *no idea with this id* is said only when the read found none.
- **Nothing kept, nothing sent.** No new table, column, browser key, API route or request; one new page,
  one load from DotAmi's own server. Every sentence is in `lib/cockpit/words.ts` (`plan`); amounts and months
  go through `lib/format/money-and-months.ts`; the verdict-word check covers them.
- **Not in it:** the what-if (never kept), *This visit* and *Not told yet*; a Lens summary of any kind.

## 3. What DotAmi asks, why, and how it's kept

No question is asked unless something on screen depends on it. Each says why it is asked and what it
unlocks, and *I don't know* is always an answer: it leaves the cards it feeds on *check first* and the
gauges on *not given yet*.

| What | Why | What it unlocks | When | Required | How it's kept |
|---|---|---|---|---|---|
| Where you want to be, in your own words | So the top of the plan is the person's goal, exactly as said | The quote in the destination bar, on Compare, and as the export's first line | Your destination, question 1; editable from the destination bar | No | A dated, word-for-word statement (today's `PersonStatement`, marked as the destination). Never summarised, never read by a rule. A change adds a new version |
| A business, a job or career, or both / not sure | It decides which futures are offered | The cards on Pick a future; *both / not sure* offers futures with an employed / own-business fork | Your destination, question 2 | Yes (*not sure* is an answer) | One choice saved on the future |
| Province or territory | Fees, licences and tax rules differ by place | Provincial fee lines and rule cards, or *"federal rules only; this province isn't written yet"* | Your destination, question 3 | Yes | Today's `Venture.province` |
| Yearly income you want, before tax | So every future sits next to the person's own number | *Your target* in the destination bar; the target row on Compare | Your destination, question 4, or later | No | One number for the person, not for one future: kept in a small new per-person table (§ 7), typed then agreed through the agree prompt like a figure. Never judged as pass or fail |
| Which future to look inside, and the ending at a fork | It is the future being looked into | The whole road; Compare at the fork; *This is mine* | Pick a future; the ending in Compare | Yes | A road id on the saved future; the ending in today's branch picks |
| Kind of work, name, venture type, equipment purchase, structure, hiring first | These already switch which cards apply | Rules & tax cards; licence requirements on the Skills overlay | Pick a future, then the cockpit's left list, as today | No | Today's `Venture` columns |
| Your current work situation | It shows where on the road the person starts | The *You are here* marker | A *Not told yet* question in the cockpit | No | Today's `Venture.employmentStatus`, moved from a required intake question to an optional one |
| Your mark on each listed skill or requirement | The person's side of the skills gap | Skills gauge counts, *needs 3 · you have 2* badges, the cited way to get each *not yet* item, the Compare row | Skills overlay or the step panel, one click per item | No | One mark per skill item for the person, dated, so it carries across every future that lists the same item. Only the person sets it; the click is the confirmation |
| Licences or certificates you already hold | A required licence or certificate is a hard step | The requirement shows *you said you hold this*; its step's task is ticked | Top of the Skills overlay, or on the requirement | No | A skill mark *have*, labelled *you said*. DotAmi never checks or asserts it |
| Skills you think you'll need | Official lists are short and the person knows their trade | Extra rows tagged *added by you* | Skills overlay: *+ Add a skill* | No | A skill mark with the person's own label, dated |
| The job closest to the work you'd do yourself | No official source lists the skills a business needs, so the person picks the closest job and sees the government's list for it | That job's OaSIS list, tagged *your pick of job* | Pick a future (skippable); changeable from the Skills overlay | No | An occupation code on the saved future, marked *chosen by you* |
| Your quotes for named start-up cost lines | No official source prices opening a specific business; only the person can | Money badges, the Start-up money gauge, Compare rows | Step panel or Money overlay, on each blank line | No | A figure of the new kind `start-up-cost-line` linked to the future and step, with where it came from (quote, link, receipt, your guess), proposed then agreed |
| Savings you'd put toward this | So the person sees their own money beside the lines they priced | The *savings* and *difference* parts of the Start-up money gauge (arithmetic, no verdict) | The gauge's invitation or the Money overlay | No | A figure of the new kind `savings-for-start`, agreed, dated. Never account records |
| Sales what-if (first year, third year) | GST/HST registration switches on at the CRA's cited $30,000 tests (§ 9, fix 3) | The GST/HST card relights under *your what-if, not a forecast*; the *Incorporating* step relights only against your own number (next row) | The what-if bar | No | Today's Year 1 / Year 3 fields when kept. Agreed real figures still take over, as today |
| The yearly sales at which you'd incorporate (*"I'd incorporate at $___"*) | No law sets a sales or income level for incorporating, so DotAmi has no number of its own; the uncited $80,000 is removed (§ 9, fix 1) | The *Incorporating* step lights when your third-year sales what-if (or agreed sales) passes your number; with no number it stays *check first* and says *"set your own number to see this light"*. *(2026-10-11, as built: it lights when the Year 3 estimate reaches the number (>=), and reads no agreed sales yet; a skipped Year 3 keeps it at check first. Whether "passes" means more than (>) is still the maintainer's call.)* | The *Incorporating* step's panel, or a *Not told yet* row once a sales what-if is kept | No | A new nullable column on `Venture` (whole dollars, like today's Year 1 / Year 3 fields), labelled *your number*. A what-if setting, not a figure; never filled in by DotAmi. *(2026-10-11: built with the honest-map fixes before the storage work, so for now it is kept in `ScenarioState.activeBranches` under its own key `incorporateAt`, `lib/db/scenario-state-json.ts`, with no migration; the storage pull request decides whether to move it.)* |
| Step status, *done when* ticks, your own dates on steps | The doing half: progress and timing are the person's | Steps gauge, status chips, *Next on your road*, *Since last time* | Step panel, any time | No | One progress record per future and step. Never used to rank anything |
| By when (month and year) | Without it there is no honest timeline; DotAmi never projects one | The *Your date* gauge | A destination-bar invitation | No | A target date on the saved future, labelled *your date* |
| Agreed business figures and tax-form totals (existing) | Real numbers take over from what-ifs | *From your records* lines on threshold cards, as today | As today | No | Today's `Figure` records |
| About-you statements (existing) | Anything the person wants kept about themselves | Shown under *In your words*; feeds no rule, and the screen says so | Any time, as today | No | Today's dated, word-for-word `PersonStatement` |

Phase 2 adds hours a week wanted and *anything you won't do* (a dated statement that filters nothing),
the dream-life list (the person's own monthly amounts, summed into their target with *Use this as my
target*, sum × 12, no buffer), *I paid this* linking an expense to a cost line, and the saved sort
choice. Phase 3 adds the résumé (§ 10).

## 4. How answers become guidance

- **Work backwards from the destination.** The person's words sit on top; the road and gauges are
  measured from today towards their own date. With no date there is no end point, because DotAmi
  never supplies one.
- **Receipts.** After each save the rules run on the answers before and after it, and the difference
  is shown as one line (*"Because you marked 9 skills: 3 steps now say needs 0 more"*). Both runs are
  the same deterministic functions, so a receipt is a diff, not prose a model wrote. The same line is
  the answer's row in *What you've told DotAmi* and goes into the export.
- **Every ? names its own cure.** An empty gauge or an amber step says exactly which single answer
  would settle it (*"Mark Read shop drawings to see what this step still needs"*).
- **Steps gap:** *x of y done*. *Next on your road* follows the order the road runs (you can't
  register for GST/HST before there is a business), labelled as such.
- **Skills gap:** counts of *have · learning · not yet · not marked*. Each *not yet* item opens its
  cited official route. Unmarked items are counted on their own and never assumed.
- **Money gap:** lines priced plus official fees, against savings typed, with their difference,
  always with *N lines not priced yet* so a blank never reads as $0. Plain arithmetic on cited or
  agreed numbers, with no *enough* or *not enough*.
- **Time:** only *months from today to your date*. Official hour or training requirements are shown
  cited, next to the person's hours if they gave them, with no division into weeks and no verdict.
- **Rules light the road.** Typed, cited catalog files decide which steps, fees, requirements and
  cards appear. A pure road-evaluation function, built beside today's `evaluateProfile`
  ([`lib/brain/evaluate.ts`](../../lib/brain/evaluate.ts)), decides step states and counts. Threshold
  wording follows the source exactly (§ 9).
- **Ordering.** The only orders are the order added, road order, and (phase 2, decision 3) one
  countable measure the person picks, always said on screen. Compare uses identical rows with no
  score or highlight. A copy test bans *you should*, *recommended* and *best for you*.
- **Peering ahead without forecasting:** the whole road drawn the moment a future is picked; hover
  arrows through the fork to both endings; the what-if relighting the rules from the person's own
  numbers under the *not a forecast* banner; and a filled-in, clearly invented example future.
- **The person stays in their own words.** The destination and added skills are kept as given, dated.
  There is no profile, persona, type, fit score or match percentage, and statements never feed a rule.
  One limit, said plainly: because the most personal inputs (the destination, About-you) feed no
  rule, the person turns their dream into picks themselves. That is deliberate.

## 5. Where the data comes from, and where we get what we don't have

The maintainer asked this on 2026-10-11. Every kind of content the cockpit shows, its source today,
and how a gap is filled:

| Content | Source | If we don't have it |
|---|---|---|
| Steps, forks, *done when* lines | Official pages (the law, the CRA, the province, the regulator), one citation per *done when* line, each either read by a person or checked by a tool (the quote checker found its quotes word for word on the live page; option B of 2026-10-11, [citations.md](../engines/citations.md)) | Not written in until a person reads the official page or the tool finds each quote on it. *Pick a future* may list a road none of whose sources a person has read, its card saying so in amber (the maintainer's yes of 2026-10-13, § 13). *"More futures are being written"* says so |
| Legal requirements (licences, certificates, registrations) | Today's compliance catalog plus the regulator's pages (for the first future, Alberta's apprenticeship and trade certification pages, read fresh: Alberta's trades system was recently rewritten) | Not written in until the current page is read by a person or its quotes are found on it by the tool |
| Skills for a job | [OaSIS 2025 Version 1.0](https://open.canada.ca/data/en/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec) (Employment and Social Development Canada, Open Government Licence – Canada; the dataset's record says published 2025-10-30, modified 2026-10-04, checked by a tool on 2026-10-11), through the person's pick of job. (Corrected 2026-10-11: this line first named OaSIS 2022 Version 1.0, which has no Knowledge file; the 2025 dataset has one, *Knowledges 2025 v1.0*.) | The person adds their own skills (*added by you*) |
| Official fees | The fee page or regulation for each (for example federal online incorporation on the Corporations Canada page and its fee schedule; Alberta's trade-name and incorporation fees from Alberta's own page, which also says whether the province or each registry agent sets them, § 13). Since 2026-10-12 each is written once, in the official fees catalog (`lib/engines/fees/v2026/`, § 6), and roads name it by id | A named blank; if Alberta's page says registry agents set the fee: *"set by your registry agent: add what you were quoted"* |
| Cost-line names (tools, space deposit, insurance, vehicle, first materials, software, money to live on while starting) | Names only, planned to be cited to the free BDC and Futurpreneur cash-flow templates (linked, not copied; they are blank templates, not numbers). As built (2026-10-12, § 6): no source yet, because the templates' pages don't name the lines; § 13 | — |
| Amounts for cost lines, savings, income wanted, dates | The person: typed, quoted, linked or from a receipt, through the agree prompt | Stays blank, counted in *N lines not priced yet*. Never filled with an average (decision 2) |
| Rules and tax cards | Today's catalogs | — |
| New futures | Contributors on GitHub, one cited file per step (phase 4), under [CONTRIBUTING.md](../../CONTRIBUTING.md) | Open issues ask for them |
| How real people started (stories, videos, articles) | **Not yet a source.** Planned as a separate, cited, labelled *real examples library*, with creators as contributors ([task list](../task-list.md) § 15) | Needs its own contributor rules and permissions first |

## 6. The road data model

A **road** is a type any future can use. Roads are catalogs: typed, versioned, cited TypeScript under
`lib/engines/roads/v2026/`, never rows in the database, like every other catalog. Ids are permanent.

```ts
// A sketch of the shape; the build pull request writes the real types and their tests first.
interface Road {
  id: RoadId;                    // permanent, e.g. "road-apprentice-to-own-shop-ab"
  label: string;                 // "From apprentice to your own shop (Alberta)"
  kind: "business" | "career" | "both";
  provinces: Province[];         // where it is written for
  columns: RoadColumn[];         // left to right
  lastVerified: string;          // the newest read of any citation in it
}

interface RoadColumn { id: string; label: string; steps: StepId[] }

interface RoadStep {
  id: StepId;                    // permanent
  label: string;                 // "Open your own shop"
  summary: string;               // one line a first-timer can repeat back
  doneWhen: DoneWhenLine[];      // each written from this step's official page
  needs: SkillItemId[];          // legal requirements and listed skills
  costs: CostLine[];             // three kinds, below
  forkId?: string;               // set on the steps that are the two sides of a fork
  engineHints?: string[];        // today's catalog ids whose cards belong on this step
  officialLinks: OfficialLink[]; // pages the person opens themselves (BizPaL, a registry)
  citations: EngineCitation[];   // at least one; the same citation type as every catalog
}

interface DoneWhenLine { id: string; text: string; citation: EngineCitation }

interface Fork { id: string; label: string; sides: [StepId, StepId] } // e.g. stay employed / own shop

interface SkillItem {
  id: SkillItemId;               // permanent; shared across roads so a mark carries over
  label: string;
  kind: "legal-requirement" | "listed-skill";
  howToGetIt?: { text: string; citation: EngineCitation };
  citations: EngineCitation[];
}

type CostLine =
  | { id: string; kind: "official-fee"; label: string; amountCents: number;
      citation: EngineCitation; lastVerified: string }          // amount, source, day read
  | { id: string; kind: "named"; label: string;
      nameSource?: EngineCitation };                            // named, not priced
// The third kind, "your quote", isn't in the catalog: it is the person's agreed figure of kind
// start-up-cost-line pointing at a "named" line (§ 7). A named line with no agreed quote is
// counted in "N lines not priced yet".
```

**The roads in phase 1:**

- **Road 0, *Starting any business in Alberta (tax and structure)*:** today's ten-step map
  (`lib/engines/cfe/v2026/`) wrapped as a road with about three cited *done when* lines per step, plus
  two or three *before you open* steps (register your name, run the government's BizPaL permit finder,
  open a separate business account). Today's node ids stay as step ids.
- **Road 1, *From apprentice to your own shop (Alberta)*:** about 12 new cited steps (finish your
  training; the *Certified* fork with *Stay employed* and *Open your own shop*; open the doors) joined
  onto road 0's later columns. Whether certification is legally required, and any training periods or
  hours, are read from the Alberta trade body's current pages, not assumed. This adds roughly 15–20
  citations to be read word for word; today the app has 74, of which 9 have been checked against the
  law's text, 4 of them word for word (`status: "confirmed"` in `lib/engines/shared/types.ts`).
  (As built on 2026-10-12, its citations are tool checks, not reads: see "The first written future
  as built" below.)

**The map draws any road.** Today `components/cockpit/strategy-map.tsx` only knows the ten-step tax
map (it imports `CFENode` and `cfeTiersV2026`). Phase 1 first changes it to draw a `Road`, with road 0
drawn exactly as today (about 1.5 build days).

**Road evaluation.** A pure function takes the road, the person's answers, skill marks, step progress,
agreed figures and any what-if, and returns step states, gauge counts and the money arithmetic. It
reuses `evaluateProfile` for the rules and tax cards. A small helper diffs two results for receipts
(about 1.5 build days with unit tests).

### The road type as built (2026-10-11)

The first phase-1 pull request turns the sketch above into real types, with these differences, each
for a reason:

- **Where it lives:** `lib/engines/roads/v2026/` (`types.ts`, `validate.ts`, `from-cfe.ts`, one file
  per road, `index.ts`). Like every catalog it imports nothing from the app, the rules engine or the
  screens.
- **A road holds its own steps and forks.** `Road` gains `steps` (every step, by id) and `forks` (each
  fork once, with its two sides). The sketch's `forkId` on a step is dropped, so a fork is written in
  one place only. A column gains `summary` (the line under its name) and an optional `forkId`: the
  fork decided in that column. It is data, not layout: it carries today's two toggles over (the map
  shows each in its column's header), and for other roads the pick is made on Compare (§ 1, row 6).
- **A step says where it leads:** `next` lists the steps it opens. The map's hover arrows walk it;
  before, they walked `CFENode.branches`.
- **A fork's id is the key its pick is kept under.** Road 0's two forks are `gstTiming` and
  `incorporationTiming`, the keys today's `ScenarioState.activeBranches` already stores, so every
  saved pick stays attached with no storage change. A fork's sides must match today's toggle options
  exactly; a test checks.
- **Costs:** an official fee carries one citation, and that citation's `lastVerified` is the day the
  fee was read (the sketch had the date twice). A catalog holds only *official fee* and *named* lines;
  the third kind, *your quote*, is the person's agreed number and never in a catalog. One pure
  function turns a catalog line plus the person's agreed amount (if any) into the three kinds a
  screen shows: *official fee*, *your quote*, *named, not priced yet*. A quote that isn't a whole,
  non-negative number of cents is shown as *named, not priced yet*, never added up.
- **Two fee lines can't yet be marked as alternatives.** A step's `costs` is a flat list, so a total
  that added every official fee on one step would count both sides of a choice. Fix 2 (§ 9: federal and
  Alberta incorporation side by side, neither counted until the person picks) needs one of two
  additions, and the pull request that writes those fee lines picks between them: two steps under a
  `Fork` (one per way to incorporate, each with its own fee lines), or an optional choice-group field
  on a cost line that road evaluation reads. Either adds to the type; nothing in it changes shape.
- **`engineHints` is not on `RoadStep` yet.** Today's lever cards are matched to a step by its id
  through `NODE_ENGINE_HINTS` in `lib/brain/node-items.ts`, as before. The road-evaluation pull
  request moves those hints onto the step, so a road's content stays in the road catalog (§ 8) and a
  contributor-written road can name its own cards; until then a step from any other road gets no
  lever cards. *(2026-10-12: the road-evaluation pull request left them where they are; the step panel
  pull request moves them: a step's optional `engineHints` names its cards, and road 0's are written in
  its catalog file. § 2, Cockpit screen as built.)*
- **Skill items are one shared list** (`skillItemsV2026`), so a mark carries across every road that
  lists the item. It is empty until the first written future.
- **The checks** (`validate.ts`, run on every road by the tests): every step has a citation; every
  citation is an https page with a real read date that has already come (the newest date anywhere
  on Earth, so a reader east of UTC isn't refused their own today); every official link is an https
  page; every id is unique within its road; every step sits in exactly one column and every column
  names real steps; `next`, fork sides and a column's fork name real steps and forks; an official fee
  is a whole, non-negative number of cents; `needs` names real skill items; the road's `lastVerified`
  is the newest read date in it. A separate list in the tests holds every road, column, step, fork,
  *done when* line, cost line and skill item id ever shipped: removing or renaming one fails. The
  checks don't yet look at a citation's title, an empty road, or whether a column's fork has a side
  in that column.
- **Road 0 is today's map, unchanged.** `roadFromCfe` builds *Starting any business in Alberta (tax and
  structure)* from `cfeNodesV2026` and `cfeTiersV2026`: the four tiers become its columns, the ten
  nodes its steps (same ids, labels, trigger lines as the step's one line, citations, and `branches`
  as `next`). Its *done when* lines, cost lines and the *before you open* steps are content work for a
  later pull request; until then those lists are empty, which the checks allow.
- **The map draws a `Road`.** `components/cockpit/strategy-map.tsx` takes a road and no longer imports
  the CFE tiers or nodes. Card colours, chips and lever cards still come from today's rules by step
  id, so road 0 looks and behaves exactly as before: a test draws the map through the road in six
  saved states and compares the HTML, byte for byte, with what the old map drew from `main`. The node
  detail panel still opens on today's catalog entry for a step; the step panel (§ 1, row 5) replaces
  it later in phase 1.
- **Not in this pull request:** which road a saved future uses (storage, § 7; until then every map is
  road 0), road evaluation (above), and any new screen. Saved fork picks are still typed as tax-map
  step ids (`activeBranches: Record<string, CFENodeId>` in `lib/scenarios/types.ts`); the storage pull
  request widens the value to any road's step id so another road's pick can be kept. Places stay
  today's values (`AB`, `BC`, `ON`, `CA`); how places are stored is an open decision of the
  maintainer's. *(2026-10-11: the storage pull request keeps another road's picks in a column of their
  own instead and leaves the type as it is; the maintainer decided places are stored as codes such as
  `CA-AB`. Both in § 7, Storage as built.)*
- **A road names the jobs it is written for (added 2026-10-21, task 25e;
  [research-kit.md](research-kit.md) § 5.3).** `Road` gains `codes`, beside `provinces`, holding
  `occupations`: the 5-digit NOC 2021 job groups the road is written for. Road 1 carries `["72311"]`
  (Cabinetmakers); road 0 says `"no-particular-job"` in words, since an empty list could be a road nobody
  gave codes to. The checks (`roadCodeProblems`, run inside `roadProblems`) refuse a code that isn't five
  digits, one the OaSIS list has no job in, a code named twice and an empty list. `roadsWrittenForJob`
  answers Pick a future's road match ([../ui-spec/futures/03-road-match.md](../ui-spec/futures/03-road-match.md)):
  the roads written for the person's pick of job, in the order written, and an empty list when there are
  none, with no fall back to road 0. It reads only the person's own pick: the job is never picked or
  changed from a road, and decision 5 still holds (the person picks the job).

### Road evaluation as built (2026-10-12)

The road-evaluation pull request builds the pure function above and the receipts, with no screen. It
stacks on the storage pull request (§ 7, *Storage as built*), because it reads what that keeps. It
lives in `lib/roads/`.

- **One function, no I/O.** `evaluateRoad` (`lib/roads/evaluate-road.ts`) takes the road, the shared
  skill list, the idea's answers as the rules read them (its saved map: the answers and the map's picks,
  and the business figures the person agreed to), the ending picked at each fork, the person's skill
  marks, step progress, their agreed planning numbers (income wanted, savings, their number for each
  named cost line), their own month, an optional what-if and today's date. It reads no file, database
  or clock and keeps nothing; a test fails if `lib/roads/` imports anything that does.
  `agreedPlanning` (same folder) picks those numbers out of the stored ones: agreed only, never a
  proposed, taken-back or turned-down number, and only cost lines on this future's own road.
- **Each step gets one of today's three states, with the reason in the person's own answers.** In this
  order, the first that fits decides:
  1. The person marked the step *not for me*: **not on your path** (*not for me* greys a step; it
     doesn't remove it, § 8).
  1a. *(2026-10-13, issue #40.)* The road writes the step for some kinds of work only
     (`onlyForKindsOfWork` on the step) and none of the idea's kinds of work is one of them: **not on
     your path**, with the step's own reason. Road 0's *SR&ED deepening* is the one such step today. With
     one of those kinds of work, the next rule decides, as before. Below, *Steps for some kinds of work
     only, as built*.
  2. Today's rules colour the step (every step of road 0, by its id): the rules' colour, exactly as
     the map shows it today. Green is **applies**, amber **check first**, grey **not on your path**. The
     reason names the answers that colour depends on, found the way receipts are: the rules run again
     with one answer changed (taken away, given each other value it can have, or the fork's other side
     picked), and an answer is named when that changes the step's colour. When no single answer changes
     it, the reason says exactly that, never that the step is "for everyone".
     On another road that reuses a road 0 step (road 1 joins road 0's later columns), the fork walk
     below comes first: a road 0 step there takes the rules' colour only when no fork of that road
     puts it off the path or leaves it waiting on a pick, so a step after the side not picked is never
     drawn on the path or counted in the money (fixed 2026-10-12, before merge).
  3. The step is a side of a fork: the side picked **applies**, the other side is **not on your path**,
     and while no side is picked both are **check first**. A step reached only through a side not
     picked is not on your path too, and one reached only through a fork with no pick yet is check
     first. This is walked along `next` from the road's first steps, so a step both endings lead to
     stays on the path.
  4. Anything else **applies**: it is on the road the person chose.

  A step's status (*doing · done · not for me*) is given beside its state and changes it only through
  *not for me*. Readiness is never a state: what a step needs is a count on the step (*needs 3 · you
  have 2*), never a reason to turn it green.
  On road 0 the person sets no status yet. The map's lists of active, done and set-aside steps are
  worked out from its toggles alone (stage 0 is always done, stage 1 always active, the side of each
  fork not picked and the hire-first step while it is off are set aside), not set by the person, so
  passing them in as progress would make the evaluation say *"You marked this step not for me"* about
  steps nobody touched. Road evaluation therefore reads no status on road 0 (its ticked *done when*
  lines still count), and a caller passes none until the person can set one (fixed 2026-10-12, before
  merge; § 7's *a step's status is the map's* describes where it would be kept, not a status anyone
  has set). *(2026-10-12, the cockpit screen: the person can now set one, kept in step progress, so
  road evaluation reads the person's own status on road 0 too. The map's worked-out lists are still
  never passed in as progress. § 2, Cockpit screen as built.)*
- **The answers it read.** `answers` lists every answer the run read, in a fixed order, each marked
  `given`. An answer is not given when it is a default the person hasn't set, and its words say so: a
  map pick they haven't clicked (*the map's default pick at “GST timing” is …*; the map keeps its
  clicks only for the session, so after a reload a pick still on the default reads as a default, as the
  map's rail already says, while a saved pick off the default counts as the person's, `isBranchDecided`
  in `lib/scenarios/graph.ts`, since the honest-map pull request; since 2026-10-12 the clicks are kept
  with the map's answers, § 2, *What the map's save keeps*), the hire-first path while it is off (*the hire-first path is switched off*: the map
  can't tell switched off from never switched on), the structure the map assumes, and buying equipment
  while unanswered (*not answered, read as no*; since 2026-10-12 the intake's chip left off is
  unanswered too, § 2). *What you've told DotAmi* lists the given ones; the
  others still name themselves in a step's reason, worded as defaults. The person's own *I'd
  incorporate at $___* on road 0, once typed, is one of the given answers (`idea:incorporate-at`;
  taking it away is the only alternative tried, since DotAmi has no number of its own for it).
- **The four gauges are counts and sums.** *Steps:* done, out of every step on the road, with how many
  are doing and how many are not on the path. *Skills:* each skill item the road lists, counted once,
  as *have · learning · not yet · not marked*; skills the person added themselves are counted apart.
  *Start-up money:* the official fees, how many official fees apply only sometimes (`onlyIf`, counted
  and never added up, since nothing yet lets the person say the condition holds), the person's own
  numbers, how many named lines are not priced yet, the lines left out of the sums because their step is not on the path or waits on a fork with no
  pick (with the fork's name), the savings, and savings minus (official fees + the person's numbers),
  given only when there are savings and at least one line with an amount. *Your date:* the months from
  this month to the person's month, given only when they set one. The yearly income wanted is passed
  through as *your target* and compared with nothing.
- **What-if.** First-year sales, in whole dollars. It replaces the idea's own first-year sales for this
  run of the rules and is never a figure: it touches no money sum and nothing is kept. A what-if that
  isn't a whole, non-negative number of dollars is ignored, and the result says no what-if is on.
  The rules know it is a what-if (`evaluateScenario`'s `whatIfFirstYearSales`), so a rules and tax
  card it lights says *"your what-if of first-year sales (not a forecast)"*, never *"your Y1 revenue
  target"*: the person never gave that number as a target (fixed 2026-10-12, before merge).
- **Receipts.** `roadReceipt(before, after)` (`lib/roads/receipts.ts`) compares two results and gives
  one plain line per change: steps whose state changed (counted by their new state), steps whose every
  listed skill is now marked *have* and steps where that stopped being so, steps done, the skills
  counts, the money sums, the date, the target, and rules and tax cards whose colour changed. The
  skills line is about skills only: a step can have every skill marked and still have *done when*
  lines and money to go, so it never says the step needs nothing more (the design's *"needs 0 more"*
  above is the same count). Each line starts with the answers that differ between the two results:
  *"Because you told us you have “Welding”, 3 steps now have every skill they list marked have."*,
  *"Because you took back …"*, and for a what-if *"Because you tried first-year sales of $45,000 (your
  what-if, not a forecast), …"*. Three or more answers of one kind are counted (*"you marked 9
  skills"*), and answers taken back are counted apart from answers given (*"you took back 3 skill
  marks"*). With no answer changed (the month turned over), the line is the change alone.
  A receipt is meant for one answer at a time, as each screen saves one: when two answers change
  between the runs, every line names both, even a line only one of them could have caused (a what-if
  named beside a money sum). A screen that ever saves two answers at once runs a receipt per answer.
- **Words and numbers in one place each.** Every sentence the evaluation and the receipts write comes
  from `lib/roads/words.ts`, filled in with catalog labels, the person's own values and counts; money and
  months are written by `lib/format/money-and-months.ts`. A test runs every kind of sentence past a list
  of verdict words (*enough, ready, best, should, recommend, on track, behind*) and fails on any.
- **The arrows' walk moved out of the screen.** `futureEdges` and `columnNumbers` (the steps that lie
  ahead of a step, and each step's column) moved from `components/cockpit/map-arrows.tsx` to
  `lib/roads/paths.ts`, because road evaluation walks the same `next` arrows. The map imports them from
  there and draws exactly as before (the byte-for-byte map test is unchanged).
- **Speed.** Measured by hand on 2026-10-12 on a Windows development computer, timing 200 runs after
  a 50-run warm-up: about 0.36 ms a run on today's general road (the rules run about 30 times, once per
  changed answer, to name each colour's answers), 0.06 ms on the invented test road, and 0.02 ms for a
  receipt. So *What you've told DotAmi* with 40 answers, each worked out with and without, is about 30
  ms on today's general road: still quick enough to work out on each visit (§ 7). No script keeps this
  measurement.
- **Not in this pull request:** any screen; the lever cards moving onto the road step (`engineHints`,
  above), which comes with the step panel, the first place the cards are drawn for a road other than
  road 0; a status the person sets on a road 0 step (none exists yet, above); the *with and without
  one answer* run that gives each row of *What you've told DotAmi* its *what it unlocked* line (a pure
  `withoutAnswer(input, answerId)` in `lib/roads/` that maps an answer's id back to the input with
  that answer taken away, with its tests; the told-list pull request adds it, *2026-10-12: built, § 2,
  Cockpit screen as built, part 2*); and fix 2's fee lines
  (§ 9): no road has cost lines yet, and when each way to incorporate is a side of a fork, the sums
  already leave both out until the person picks.
- **Open question for the maintainer: *not for me* on the side picked.** *Not for me* greys its own
  step only. When the person marks the side they picked at a fork *not for me*, the other side stays
  off the path (it wasn't picked) and the steps only the picked side leads to still apply, with their
  money counted, so both endings are off while what comes after one of them applies. Whether those
  steps should go grey too, or the fork should read as unpicked, is the maintainer's call; until then
  it is built the simple way. (§ 13.)

### Steps for some kinds of work only, as built (2026-10-13)

Issue #40, from the first run as a stranger (2026-09-20): a sign painter's map drew *SR&ED deepening*
(Tier 4), a research tax credit step, as **ahead**, which reads as a step that idea is headed toward. The
rules already coloured it grey without a research kind of work, but the chip said *ahead*, the card had
no reason line, and its *Why this colour* said *"Today's rules give it this colour; no single answer of
yours changes that."*. That was true for a sole proprietorship, which needs two answers (a corporation
and a research kind of work), but not for an idea already set as a corporation, where a research kind
of work alone would change it.

The issue asks for the card not to be drawn. It is drawn, the way the road already treats a step that
isn't on a person's path: CLAUDE.md, *Every path, in the open*, says the map doesn't pre-filter paths
by what it thinks the reader should want, and a step that isn't drawn can't be read or brought back.
Whether to hide it anyway is the maintainer's call (§ 13).

- **The rule is the road's, in the catalog.** A road step may carry `onlyForKindsOfWork`: `tags`, the
  intake's kinds of work (activity tags, `lib/journey/intent.ts` `ACTIVITY_TAXONOMY`), one of which the
  step needs to be on the path. Road 0 sets it on *SR&ED deepening* only, with the three kinds of work
  today's rules already read for that step (Software / SaaS, Manufacturing, AI / ML / R&D;
  `computeNodeStates` in `lib/brain/evaluate.ts`). A test holds the two lists equal, so the step can
  never be off the path for a kind of work the rules would light it for, or the other way round. The ids
  are unchanged. The checks (`roadProblems`) refuse an empty list, and `tests/research-steps.spec.ts` a
  kind of work the intake doesn't ask (the catalogs import nothing from the intake, so that check is the
  test's). The catalog carries no sentence: until the review of 2026-10-13 it also had `notTold`, which
  made every reason a claim about what the person told DotAmi (below, why that was dropped).
- **Road evaluation** (rule 1a above): with none of those kinds of work, the step is **not on your path**,
  reason `{ kind: "kinds-of-work", tags }`, because *"None of the kinds of work on this idea is Software /
  SaaS, Manufacturing or AI / ML / R&D, and this step is on your path only with one of them."* An idea
  with no kinds of work at all (one saved from *Pick a future*) reads *"This idea has no kinds of work on
  it, and this step is on your path only with one of Software / SaaS, Manufacturing or AI / ML / R&D."*
  *Not for me* still comes first. With one of them the rules decide as before: amber (**check first**)
  for a corporation, grey for a sole proprietorship, its reason naming the structure. Its cost lines (none
  today) are left out of the sums while it is off the path, like any step off the path.
- **The reason says only what DotAmi can check** (review of 2026-10-13). The first wording, *"You haven't
  told DotAmi this idea involves research and development: …"*, was false for a person who typed their own
  kind of work on the intake (*Add your own kind of work*): "Research and development", "Scientific
  research" or "Biotech R&D lab" is saved with the listed kinds of work, the rules' matcher
  (`tagsIntersect`, `lib/brain/predicates.ts`) doesn't match it to any of the three, and the step is off
  the path, yet that person did tell DotAmi about the research. The sentence now names only the kinds of
  work on the idea and the ones the step needs, the way the rules' own card speaks only of tags
  (`lib/brain/evaluate.ts`, *"Your intake has none of the activity tags this card reads"*). Matching a
  person's own words to a research kind of work would be a change to the rules, the maintainer's call
  (§ 13). *"Only with one of them"* says what the step needs, not that one is enough: for a sole
  proprietorship the rules still leave it off with one of them, and the sentence names only the kinds of
  work, not the structure (§ 13).
- **On the map** (cockpit only, where road evaluation runs): the card is drawn dashed, its chip says
  **not on your path** instead of *ahead*, its lever cards are hidden (none apply without a research kind
  of work: a test holds that every rules card such a step names is grey without one of its kinds of work,
  for a sole proprietorship and a corporation), and the reason sentence is its line under the trigger, also
  read out as the card's description. It still opens the step panel, whose *Why this colour* gives the same
  sentence and keeps every *done when* line and source. `lib/cockpit/view.ts` `mapPlace` gives such a step
  the map's *not on your path* place; the words are road evaluation's (`lib/roads/words.ts`). Drawn without
  road evaluation (`tests/road-map.spec.ts`), the map is unchanged.
- **A research sole proprietorship's card is drawn as before**, solid, chip *ahead*, with its lever cards,
  though the rules leave the step off the path (grey, *"Today's rules leave it off your path, from your
  structure (Sole prop)."* in the step panel). So a sole proprietor who adds a research kind of work sees
  the card go from dashed *not on your path* to solid *ahead*. It is built this way because its two lever
  cards, the SR&ED tax credit and IRAP, are amber (check first) for that idea, and a dashed card hides its
  lever cards: dashing it would take two cards that apply out of sight. Whether to draw it off the path
  anyway is the maintainer's call (§ 13); `tests/research-steps.spec.ts` pins it as built.
- **Not changed:** *Incorporation for liability/SR&ED* (Tier 3) is about liability as well as research,
  so it is not a research-only step and keeps its colours and its line. The readout API
  (`app/api/readout/route.ts`, `stageChipFor`) still gives *SR&ED deepening* the map's worked-out chip
  (*ahead*) beside its grey colour, and the playbook export (`lib/playbook/build-skeleton.ts`) lists the
  steps the map's toggles make visible, this one among them, without road evaluation's reason: neither runs
  road evaluation yet. That belongs to the export and print work, tracked in `docs/task-list.md` beside
  #41.

### The first written future as built (2026-10-12)

Road 1, *From apprentice to your own shop (Alberta)*, is written into the catalog
(`lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts`, id `road-apprentice-to-own-shop-ab`, kind
`both`, `AB`). It was in the catalog only until *Pick a future* listed it (2026-10-13, § 13). Choices
made while writing it, each for a reason:

- **Four columns, one fork.** *Finish your training* · *Certified* (the fork: *Stay employed* or *Open
  your own shop*) · *Open the doors* · *Running your own shop* (*First years on your own* until
  2026-10-23: a span of time in DotAmi's own words). The example trade is Cabinetmaker,
  Alberta's official name for it. Alberta's pages list three ways to the certificate (apprenticeship,
  Trades Qualifier on work experience, Trades Qualifier with a certificate from outside Alberta); they
  are steps side by side in the first column that all lead to the certificate, not a fork, because a
  fork has two sides. The Blue Seal certificate, which the content shows under both endings, is one
  optional step both endings lead to, so it is written (and its ids kept) once.
- **Where it joins road 0.** After its last column the road carries on along road 0 from
  *Incorporating*. `Road` gains an optional `joins: { roadId, columnId }`, and `roadJoinProblems`
  checks that the road and column it names exist (a road on its own can't see the others, so this is a
  check over the whole catalog). How a screen draws the join is decided with the screens.
- **Every source is a tool check.** Each citation was checked on 2026-10-12 with
  `node scripts/check-quotes.mjs --url … --quote …` (option B, [citations.md](../engines/citations.md));
  only quotes the script found are recorded, and none is recorded as read. Because nothing in it has
  been read yet, the road's own `lastVerified` is empty, and the checks now hold a road with no read
  source to an empty date instead of letting it carry any date.
- **A fee checked only by a tool quotes its amount.** An official fee whose citation has no read must
  have a quote with the amount as the page writes it (`$150`, `$150.00`, `$1,500`), so the typed
  number is one the tool found on the page. A $0 fee is exempt (pages say "no cost"). A fee with a
  read keeps today's rule.
- **Alberta's registry fees stay named lines.** The government fee and the agent's service fee to
  register a name are named lines with no amount: the Registry Agent Product Catalogue that holds them
  stops tools with a human check, which is never bypassed. A person can read it and fill them in (the
  government fee; the service fee is each agent's own). Still so on 2026-10-15, when the blanks were looked
  up again.
- **Skill items are the legal requirements only:** an Alberta Student Number, an apprenticeship
  education agreement with a sponsor, and a recognized trade certificate from outside Alberta, each
  cited. Their ids share one pattern, `skill-<place>-…` (`skill-ab-…` for these three). Skills from the government's list (OaSIS, occupation 72311 *Cabinetmakers*, profile
  72311.00) come with the OaSIS import, a separate change.
- **Left out, not guessed:** the apprentice wage percentages per period (they need a typed field, not
  prose); WCB-Alberta's $200 minimum annual premium (a minimum, not a fee, and it would be added on
  top of the person's own premium quote); the WCB industry a shop falls in (WCB classifies); the Red
  Seal application fee (the page gives no amount); the federal and Alberta incorporation card (it
  belongs to road 0's *Incorporating* column); the limited partnership and the limited liability
  partnership (Alberta's register-a-name page lists them beside the trade name and the partnership;
  an LLP is for eligible professions such as accounting or law); whether a sole proprietorship counts
  as "a legal entity recognized in Alberta" for sponsoring an apprentice (the sponsor page doesn't say).
- **The shop opens unincorporated; a corporation is pointed to road 0.** *Open your own shop* asks for
  a business form, and alberta.ca names sole proprietorship, partnership and corporation side by side;
  the road picks none. Its next steps register a trade name or partnership, so *Open your own shop* and
  *Register your business name* both say, in their one line, that someone who chose a corporation goes
  to *Incorporating* on road 0, where this road joins it. A step's `next` names steps on its own road
  only, so the pointer is in words, and a test keeps it naming road 0 and that column.
- **A fee that applies only sometimes is typed so.** `OfficialFeeLine` gains an optional `onlyIf`: the
  condition in plain words (the $50 rewrite fee on the Recognized Credential route: you failed an exam
  and choose to rewrite it). Road evaluation must leave such a fee out of a total unless the person says
  the condition holds, and a screen shows the condition with the fee (`costLineAsShown` passes it on).
  The checks refuse a fee whose label says "only if" with no `onlyIf`, and an `onlyIf` that is blank.
- **A fee's quote can't be one end of a range.** The tool-check fee rule (above) also refuses an amount
  the quote writes as one end of a range (`$150-$200`, `$150 to $200`, `between $100 and $150`,
  `from $150`): an official fee is one amount, never a range.
- **Certification is optional in this trade.** The trade profile says so ("journeyperson
  certification optional"), and the certificate step's one line repeats it; the road's two endings
  still follow the certificate, as the maintainer's first future lays them out. The *Stay employed*
  side cites the trade's own classes of individuals, not a general page's "ticket to work".
- **Plain words.** Each abbreviation (NAIT, SAIT, the CRA, WCB-Alberta, GST/HST) is spelled out once in
  a one-line summary, a *period* is explained as a level (until 2026-10-17 also "designed to take about a year", the
  profile's words, taken out under no times: the source still quotes them), and *Schedule 1* names the regulation it belongs to.

### Road 0's content as built (2026-10-12)

Road 0, *Starting any business in Alberta (tax and structure)*, gets its *done when* lines and the three
*before you open* steps this page names (§ 6, "The roads in phase 1"). Choices made while writing them,
each for a reason:

- **Where it lives.** The lines and the new steps are written in road 0's own file
  (`lib/engines/roads/v2026/starting-any-business-ab.ts`). `roadFromCfe` gains two optional inputs:
  *done when* lines by step id, and steps to add to a column after that column's map stages. Everything
  else it builds from today's catalog is unchanged: the ten steps keep their ids, names, one-line
  summaries, sources and `next`, so their hover arrows go where they went.
- **About three lines per step, each from an official page.** 34 lines on the ten steps (three or
  four each) and 13 on the three new steps, 47 in all. Each line is written from the page its quotes come
  from, on the CRA's, Alberta's, Corporations Canada's, WCB-Alberta's and BizPaL's sites, and says only
  what those quotes say. A line that is a fact to know rather than a thing to do ("You know that a
  corporation files a T2 return every year…") says so in its words; none says "you should".
- **A line keeps its page's conditions and exceptions** (review of 2026-10-12). Where the sentence or
  section a line quotes carries an "unless", an "if" or a list of exceptions, the line carries it too,
  quoted from the same page: the small-supplier test leaves out financial services, sales of capital
  property and goodwill, and counts an associate only if associated at the start of the quarter; T5
  slips have the T5 Guide's exceptions (under $50 to one recipient in the year, capital dividends); the
  first payroll remittance date holds unless the CRA sets a different frequency; salary can't become
  dividends when it was recorded as salary and deductions at source were required; records are kept six
  years "generally". A personal guarantee is *one* place limited liability stops, and a line of its own
  (`dw-start-inc-directors`) says a director may be liable for amounts the corporation failed to
  remit, since the owner of a one-person corporation is usually its director.
- **Every source is a tool check made on 2026-10-12** (option B, [citations.md](../engines/citations.md)):
  each quote was found word for word on its live page by `node scripts/check-quotes.mjs`, and none is
  recorded as read. A tool check is not a read, so road 0's own `lastVerified` stays the newest read
  among the map stages' sources (2026-05-01).
- **Four of the stages' own pages have moved.** The CRA's *Employees* page (under *Employee/Apprentice
  baseline*), the line 4600 page both of *Retained earnings planning*'s sources point at, and the two
  SR&ED pages under *SR&ED deepening* answer "page not found" today. Those steps' *done when* lines cite
  the pages where that content is now (the CRA's *Employment and self-employment income*, the T5 Guide,
  *Completing the T5 slip*, *Amend, cancel, add, or replace slips*, the SR&ED program's T661 page and its
  Filing Requirements Policy). The stages' own sources are the tax map's (`lib/engines/cfe/v2026/`) and
  carry read dates, which only a person's or a model's new read can change, so they are left as they
  are and listed as an open item for the maintainer.
- **Three *before you open* steps, in the first column.** *Register your business name, if you use one*
  (`step-start-register-name`), *Look up your permits and licences (BizPaL)*
  (`step-start-permits-bizpal`) and *A separate bank account for the business, if it has a name other
  than yours* (`step-start-business-account`) sit in *Before the venture*, under *Employee/Apprentice
  baseline*, and each leads to *Sole Prop activation*. Their order down the column is the order they are
  written in, not a ranking and not a sequence the person must follow: the name comes before the bank
  account because the CRA's condition for the account depends on the name, and BizPaL sits between
  them because none of the pages ties it to either. Nothing on screen calls them "before you open" yet:
  they sit under Tier 1's existing line (*Employment or apprenticeship income; nothing commercial
  yet.*), which comes from the tax map's tier and describes the baseline; a column summary of road 0's
  own would change that line, so it waits for the step panel.
- **A fourth, *Keep your records from day one* (2026-10-14).** `step-start-keep-records` follows the
  three in the first column and leads to *Sole Prop activation*: a business must keep its records from
  the start, and records cover what it spends as well as what it takes in, so they begin before the
  first sale. The step is written once in `keep-records.ts` and shared with the apprentice road, where it
  is first in *Open the doors* after *Open your own shop*; its four *done when* lines are the CRA's own
  *Keeping records* pages, tool-checked that day ([engines/roads.md](../engines/roads.md)). It brings road
  0 to 14 steps and 51 lines. Road evaluation colours it from the road's arrows only, as on your road for
  every idea here, and on the apprentice road once the person picks their own shop.
- **The baseline's arrows don't reach the new steps (the maintainer's call).** The baseline's own
  `next` is not changed, so no existing card's arrows move. The cost: hovering or selecting
  *Employee/Apprentice baseline* dims the four new cards (three until the records step joined on
  2026-10-14), as it dims every card not on its arrows, and selecting one new card dims the baseline and
  the other three, so on screen they look like the baseline's
  siblings rather than steps after it. Adding them to the baseline's `next` would fix that and change an
  existing card's arrows (the baseline's), which the byte-for-byte comparison and the measured arrow
  counts would then have to be re-cut for; that trade-off is left to the maintainer.
- **The bank account step says what the CRA says, with its condition.** The CRA's sole proprietorship
  page says a business with a name other than your own needs a separate bank account for cheques payable
  to it; it doesn't say every business needs one. The card's own name, its one line and its first
  *done when* line all carry that condition, and its other lines are what the page and the CRA's
  *Business records* page say about billing and keeping the account's statements.
- **Costs are named lines only.** Alberta's registry fees (the government fee and the agent's service
  fee to register a name) stay named blanks: the catalogue that holds them stops tools with a human
  check. Permit and licence fees "vary" (BizPaL's own word), and a bank's fees are the bank's; the
  bank-fees line cites nothing on purpose, since no official page names a bank's fees. The optional
  Business Name Report is a *done when* line (`dw-start-name-report`), not a cost: Alberta's page says
  NUANS members provide it but names no price for it. No amount is written anywhere in this content.
  The ten map stages get no cost lines, skill items or official links yet; the incorporation fees belong
  to Fix 2 (§ 9). *(Later on 2026-10-12: Sole Prop activation gets seven named start-up cost lines; § 6,
  "The official fees catalog and start-up cost lines as built".)*
- **New ids, all permanent.** Steps `step-start-…`, lines `dw-start-…`, cost lines `cost-start-…`
  ("start" for *Starting any business*). `tests/roads.spec.ts` keeps every one on its shipped list.
- **What the map shows changes, and only by the three new cards.** In the cockpit every card is drawn
  from road evaluation (§ 2, Cockpit screen as built), which gives the three new steps a state of their own:
  they are on the road, so each is coloured "applies as answered" with the chip "ahead", and a click
  opens its step panel, with its *done when* lines, like any other step (the step panel works for any
  road step, catalog entry or not). A map drawn without road evaluation colours a card from the rules
  (`evaluateProfile`'s node states) and places its chip from the branch picks; neither knows the three
  new steps. Drawing them grey there would say "doesn't apply as answered", which no rule decided, and
  the chip would say "ahead" for a step nobody placed. So on such a map a step the rules don't colour is
  drawn with no colour claim: a neutral left bar, the chip **no rule yet**, the accessible name
  "*<name>*, no rule reads this step yet, shows where it leads". The legend gains no line for it, so the
  rest of the map stays byte for byte as it was; only the chip's words tell a sighted person the card
  isn't grey. Clicking it there selects it and keeps its arrows. `tests/road-map.spec.ts` draws the six
  saved states again and, with the three new cards cut out, the HTML is byte for byte what the old map
  drew; the before pictures are not re-recorded.

### The official fees catalog and start-up cost lines as built (2026-10-12)

Decision 2 (official fees with a source, plus the person's own quotes, no averages) gets its two
missing pieces: one place for every official fee, and road 0's named start-up cost lines. Choices made,
each for a reason:

- **One catalog, `lib/engines/fees/v2026/`.** Each fee is written once: a permanent id, what it is for
  (`label`), the place it applies to as an international code (`place`: `CA`, `CA-AB`; the maintainer's
  decision of 2026-10-11, used here from the start because the catalog is new), the amount in whole
  cents, how often it is paid when the page says (`per`), its condition when it applies only sometimes
  (`onlyIf`), and one citation. An id starts with `fee-` and its place (`fee-ca-…`, `fee-ab-…`), the way
  skill items do. Like every catalog it imports nothing from the app.
- **Roads and the ways to incorporate name a fee; they never type its amount.** An official fee line on
  a road keeps its own permanent id and its own label (two steps can show the same practical exam fee in
  their own words) and gains `feeId`; its amount, source and condition are copied from the catalog when
  the road is built (`feeLine`). A way to incorporate does the same (`routeFeeLine`). A check over the
  whole catalog (`feeReferenceProblems`) refuses a line naming a fee that doesn't exist, or carrying an
  amount, source or condition that differs from its fee, and a test refuses a typed amount in any road
  file or in the incorporation routes. So a fee that changes is changed in one place.
- **What moved, and nothing else.** Ten fees: the federal online incorporation ($200), express service
  ($100) and annual return ($12) from the incorporation routes (#145), and the first written future's
  seven (#153): the apprenticeship application ($150), the two Trades Qualifier applications ($450 and
  $150), the Cabinetmaker practical exam ($160, shown on two steps), the recognized-credential rewrite
  ($50, only if you fail an exam), the Blue Seal application ($150) and the business number ($0). Each
  quote was found again by `node scripts/check-quotes.mjs` on 2026-10-12. A federal fee's source now
  carries only the quotes that state that fee (before, all three shared the fees page's six quotes),
  which no card shows differently: the way-to-incorporate card shows the line's own quotes, as before.
- **No card changes.** `tests/cost-panels-unchanged.spec.ts` draws every step panel of both roads (the
  Incorporating stage for an Alberta and a British Columbia idea) and each road's money list, and compares
  them byte for byte with what main drew before the move (`tests/fixtures/official-fees/`; redrawn on
  2026-10-13 to include #162's two federal "Shown because" lines, the only difference, and again the
  same day for #158's one legal requirement on *Mandatory GST registration*, its only change); the map's
  six saved states (`tests/road-map.spec.ts`) are unchanged too.
- **Not in the catalog: a fee nobody could read.** Alberta's registry fees (incorporating, registering
  a name, the annual return, a federal corporation registering in Alberta) and the NUANS report stay
  named blanks on their cards: the Registry Agent Product Catalogue that holds them stops tools with a
  human check, which is never bypassed. A fee whose page names no amount (the Work Experience rewrite and
  panel interview) stays a named line. The catalog holds amounts only.
- **The blanks looked up again (2026-10-15, build list item 19).** The first written future's exam,
  Red Seal and registry blanks were looked up on Alberta's official pages. One is filled: the Red Seal
  application, $150 on Tradesecrets' *Apply Online* page (`fee-ab-red-seal-application`), typed as a fee
  that applies only sometimes, since the Red Seal page makes the application the way for someone already
  certified and names no fee for an apprentice writing the exam in their final period. The rest stay
  named, each label saying why: the Work Experience rewrite and panel interview (their pages give no
  amount; the $50 rewrite fee is stated only on the Recognized Credential page, for that program), the
  government fee to register a name (only in the Registry Agent Product Catalogue, whose page still stops
  tools), the agent's service fee (set by each agent) and the Business Name Report (provided by NUANS
  members; alberta.ca gives no amount).
- **Road 0's start-up cost lines, on *Sole Prop activation*.** The seven names § 5 lists, as named
  lines with no amount: *Tools and equipment*, *Space deposit*, *Insurance*, *Vehicle*, *First
  materials*, *Software*, *Money to live on while starting* (ids `cost-start-…`, permanent). They sit on
  the first step where the business runs, the one every idea on road 0 passes through; the person prices
  each through the agree prompt, and each counts in *N lines not priced yet* until then. `roadFromCfe`
  gains a third optional input, cost lines by step id, like the *done when* lines (a fourth, `needs`,
  came with the skills work below: four in all, as `from-cfe.ts` says).
- **No source for these names, on purpose.** § 5 planned to cite the BDC and Futurpreneur cash-flow
  templates for the names. Checked on 2026-10-12: BDC's template page names no cost lines (the lines are
  inside a spreadsheet behind a download form); Futurpreneur's page names only insurance among them
  ("This includes things like insurance, office furniture, website, legal fees, etc.", found by the
  tool), the others are inside its spreadsheet, and Futurpreneur is a not-for-profit, a kind of source the
  citation type has no word for (`authority` is `CRA`, `federal` or `provincial`). A downloaded
  spreadsheet is not a page the quote checker can check. So the seven lines carry no `nameSource`, like
  the bank-fees line, rather than a source that would claim more than its page says. A person who opens
  the spreadsheets can record a read, or the maintainer can add a source kind for a not-for-profit; both
  are listed in § 13.
- **What a person sees change.** On road 0, *Sole Prop activation*'s step panel lists the seven lines
  with *Add your quote*; the Money overlay's badge on its card says *7 not priced*; the Start-up money
  gauge and the money list count seven more lines not priced while that step is on the person's path.
  No amount appears anywhere that DotAmi chose.

### Skills, and the government's list for your pick of job, as built (2026-10-12)

The skills pull request builds the Skills overlay's three kinds of item (§ 2, *Overlays*): legal
requirements cited to the law or regulator, skills the person adds (*added by you*), and the OaSIS list
for the job the person picks (*your pick of job*; decision 5). Choices made, each for a reason:

- **Which OaSIS files (settles § 13).** The import reads four files of *OaSIS 2025 Version 1.0*: **Skills**
  (`skills_oasis_2025_v1.1.csv`) and **Knowledge** (`knowledge_oasis_2025_v.1.1.csv`), the two lists a
  person can say they have or are learning; **Labels** (`labels_oasis_2025_v1.1.csv`), the job names the
  picker searches; and the **taxonomy** (`guide_oasis_2025_v4.0.csv`), which gives each skill and
  knowledge area its code. Left out, for a reason each: *Work Activities* describes what the job does,
  not something a person has, and belongs to phase 2's *Peek inside* (the government's duties for the job
  the person picked); *Abilities* are "innate and developed aptitudes" (the taxonomy's words), and asking
  a person to mark their aptitudes would turn the list into a self-rating; *Personal Attributes*,
  *Interests* and *Work Context* are traits and working conditions, not skills anyone gets. Adding a file
  later is one more family in the import, with new ids and nothing renamed.
- **How much of each list.** Every skill or knowledge area the job's row rates 1 or more. A 0 is left out:
  the government's own profile page prints it as *"0 – Not applicable"* (checked by a tool on the
  Cabinetmakers profile, 72311.00, on 2026-10-12). For Cabinetmakers that is 31 of 33 skills and 13 of 44
  knowledge areas. They are shown in the dataset's own order (the taxonomy's), grouped as *Skills* and
  *Knowledge*, never by rating: the order is never importance.
- **Names only (the maintainer's open item 20).** Whether to show the government's ratings ("3 - Moderate
  Level") is the maintainer's call; the default is names only, so no screen shows one. The ratings stay
  in the data module, and the function that builds a job's list gives a screen only the item's name, kind,
  group, tag and citation, so a rating can't reach a screen by accident (a test renders the list and
  looks for one). The scales differ by file (skills 1 to 5, knowledge 1 to 3), so showing ratings later
  means showing each with its own scale.
- **Ids are the taxonomy's codes.** One permanent id per skill or knowledge area, shared by every job:
  `skill-ca-oasis-` and the taxonomy code in lower case (`skill-ca-oasis-f.01.c.01` is Numeracy). So a
  mark on Numeracy stays when the person picks a different job, and a later OaSIS version keeps the id as
  long as it keeps the code. Job codes are the OaSIS profile codes (`72311.00`).
- **Where the list lives: code, never rows.** A generated module, `lib/engines/oasis/v2026/data.ts`,
  keyed by job code: each job's name and one digit per rating. It starts with the licence's attribution
  line (*"Contains information licensed under the Open Government Licence – Canada."*), and a `LICENCE.txt`
  beside it says where the data comes from; the third-party notices (`/licences`, and Help → Licences in
  the desktop app) list it like the fonts. It is kept apart from the catalogs' CC BY-SA text (§ 13), and
  nothing suggests the government endorses DotAmi or the person's use of it (the licence forbids that).
- **The import can be redone.** The four files are committed as downloaded, under `data/oasis-2025-v1.0/`,
  and `node scripts/import-oasis.mjs` turns them into the module. The module records each file's SHA-256
  (of its text with line endings evened out, since git may change them), and `--check` rebuilds it and
  fails on any difference; a test does the same on every run. `--download` fetches fresh copies from
  open.canada.ca first, for a new version, and writes each only when its SHA-256 is the one pinned for it
  in the script (the maintainer's call of 2026-10-13, after GitHub's code scanner flagged the script for
  writing network data to a file): a file that differs is not written, the script names the expected and
  the received SHA-256, and a new version is taken by updating the pinned value on purpose. The import refuses a file whose columns don't each match one
  taxonomy entry, a rating outside its scale, or a job that isn't in every file.
- **How each item is cited.** Every item carries the tag *your pick of job* and one citation: the dataset's
  page on open.canada.ca, checked by a tool (option B; the dataset's title, publisher, licence, the day
  it was published, the day its record was modified, 2026-10-04, and the file names were found word for
  word), with a note naming the file and the job's code. No item says a person read the page. A link to
  the job's own OaSIS profile is not offered: it would put the person's pick of job in a link (§ 7).
- **The pick is kept on the idea.** `Venture.occupationCode` (`72311.00`) and `occupationPickedAt`, two
  plain added columns (migration `…_job_pick`). `POST /api/futures/<idea id>/job { code }` sets or
  changes it, `{ code: null }` takes it back; like the other cockpit writes it reads its body through
  `readJsonWithLimit`, has a rate limit and answers only DotAmi's own window. An unknown code is refused.
  Reading a future gives `job: { code, label, pickedOn }` or null.
- **Marks.** A mark on an item from the list is a skill mark like any other, kept for the person (§ 7):
  the storage accepts an id from the roads' shared list or from the OaSIS list, and refuses anything
  else. Taking back the pick of job keeps the marks, as deleting an idea does.
- **Where it shows.** The Skills list behind the Skills gauge gains *Your pick of job*: with none picked,
  *"Pick the job closest to the work you'd do yourself"*, a search box (every word typed, each anywhere in the
  name or at the start of the code; the first ten matches in the dataset's order, with *Showing 10 of 56
  jobs that match.* when more do, and *No job name or code holds those words.* when none does; the
  licence's line under it) and nothing else asked: it is optional, and skipping it changes nothing. With one picked: its
  name and code, the day picked, **Change** and **Take back**, then the list in two groups with each
  row's tag, its marks (**Have · Learning · Not yet · I don't know**), the group's source once under its
  heading, and two lines: *"This is the government's list for the job you picked. DotAmi doesn't say
  which skills a business needs."* (it says nothing about whom the list describes: the government's own
  profiles list *Self-employed* among a job's workplaces, for example Cabinetmakers, 72311.00, read
  2026-10-12) and the attribution line. The step panel keeps
  listing only what the step itself needs (its legal requirements); under them, one line counts the
  job's list and opens it, because no official source ties a skill on that list to a step. The Skills
  gauge counts the job's list apart, as it counts the person's own skills: *your pick of job: 2 have · 1
  learning · 0 not yet, of 44 listed*. The road's *needs 3 · you have 2* badges are unchanged.
- **Road evaluation reads the pick.** `evaluateRoad` takes the picked job's list (or none); the Skills
  gauge's count is the one above, and *What you've told DotAmi* gains the pick (*"You picked the job
  closest to your work: Cabinetmakers"*) and the marks on its items. A receipt about picking, changing
  or taking back the job names the pick only: the marks on its list that come into or out of view with
  it are kept either way, so they are never read as given or taken back then.
- **Road 0's legal requirements come from the compliance catalog, where it cites one.** Only one of road
  0's steps has one there: *Mandatory GST/HST registration* needs **A GST/HST registration with the Canada
  Revenue Agency**, built from the compliance entry `compliance-gst-small-supplier` and carrying its
  citation, whose tool-checked quotes include *"You must register for the GST/HST."*; the entry is
  already one of that step's cards. A test keeps the item's citations equal to the entry's and the entry
  among the step's cards. Left out, for a reason each: the CRA payroll account and the WCB-Alberta
  account on *Hire first employee* (no compliance entry cites them; the step's *done when* lines already
  do); *Alberta trades licensing* (no road 0 step, and it applies to some trades only); voluntary
  registration (a choice, not a requirement); the ride-share rule (the same registration, already a card
  on the step, and only for that work).
- **Size.** The data module is 129 KB of text (28 KB gzipped). Measured on 2026-10-12 in a production build
  (`npm run build`): it is compiled into three files, the cockpit page's script (335 KB, 87 KB gzipped,
  with the rest of that page), the cockpit's server page and one server chunk the cockpit's routes share,
  about 120 KB of each being the list. So it adds roughly 360 KB to the installed app and roughly 85 KB
  gzipped; the installer itself was not built to measure what it adds there. Nothing of it is fetched:
  the list is in the app.
- **Not in this pull request:** the *Pick a future* screen asking for the job too (§ 1 row 3; that screen
  is built and doesn't ask it yet); the
  ratings (item 20); *Work Activities* for *Peek inside*; the French files (the screens are English only
  today); the export gaining the pick and the list.

## 7. Storage

Everything lives in the existing local data file (encrypted by the desktop app when the person chose
that). Nothing about the person leaves the computer; official pages are links the person opens
themselves, and nothing about the person is put in a link.

| Kept | Where | Notes |
|---|---|---|
| **Skill marks, per person** | A new table: the person, the skill item's id (or the person's own label for an added skill), the mark (*have · learning · not yet · don't know*), *you said* for a held licence, the date | Per person, not per future, so a mark carries across every future that lists the item |
| **Step progress, per future and step** | A new table: the future, the road and step ids, the status (*doing · done · not for me*), the ticked *done when* line ids, an optional *your date*, a list of changes with their dates | Never used to rank anything |
| **The road, the ending, the target date, the job picked, your incorporation number** | New nullable columns on `Venture`: road id (empty = today's general road), target date, occupation code and the day the person picked it, the business / career / both choice, a *This is mine* pin, and the sales at which the person would incorporate (§ 3). The ending pick is a branch pick in today's `ScenarioState.activeBranches` | Added with `ALTER TABLE … ADD COLUMN` |
| **The destination** | Today's `PersonStatement`, with a new nullable column saying it is the destination | A change adds a new statement; none is written over |
| **Income wanted, per person** | A small new per-person table: the amount in cents, its period (a year), its state (*proposed · agreed · retracted*, as figures have), where it came from (typed) and the dates | It belongs to the person, asked before any future is saved, so it can't be a `Figure`: `Figure.ventureId` is required and a figure is deleted with its venture. Loosening that column was ruled out, because SQLite can only do it by rebuilding the `Figure` table and every figure reader expects a venture. The agree prompt shows it the same way as a figure |
| **Two new figure kinds** | `savings-for-start` and `start-up-cost-line`, added to `FIGURE_KINDS` (added, never renamed), each belonging to one future. A cost-line figure gets new nullable columns naming its road step and cost line, and where its amount came from (quote, link, receipt, your guess) | Through the agree prompt, like every figure. The definition of a figure in `lib/figures/types.ts` ("a total about the person's business") and its privacy note are reworded in the same pull request |

*What you've told DotAmi* needs no table of its own: each row is a stored answer with its date, and its
*what it unlocked* line is worked out again by running the rules with and without that answer (settled
below, in *Storage as built*).

**The rules for the migration.** One hand-checked migration. New tables are created; `Venture`,
`PersonStatement` and `Figure` only gain nullable columns through `ALTER TABLE … ADD COLUMN`. `Venture`
is **never** rebuilt by copy, drop and rename: the migrator runs with foreign keys on, and a rebuild
would cascade-delete every idea's figures, links and map progress. The migration passes
`tests/desktop-migrate.spec.ts`, and a new test seeds ventures, figures, links and map progress before
it and checks every row survives.

**What else changes in the same pull request:** every new table in `lib/privacy/inventory.ts` (the
privacy test fails until it is), new rows and counts on `/your-data`, the new kinds on the Delete menu,
and a line in `docs/privacy-log.md` [Unreleased] saying what is now kept.

### Storage as built (2026-10-11)

The storage pull request builds the tables and columns above and the server-side code that reads and
writes them (`lib/futures/`), with no new screen: the cockpit's screens come later in phase 1 and call
this code. It differs from the table above in these ways, each for a reason, and it settles three of the
open items in § 13.

**Two migrations, hand-written.** `…_cockpit_storage` creates three new tables; `Venture`,
`PersonStatement` and `Figure` only gain nullable columns (or one with a default) through `ALTER TABLE …
ADD COLUMN`. `…_place_codes` is one `UPDATE` of `Venture.province` (below). No table is copied, dropped or
renamed. `tests/desktop-migrate.spec.ts` seeds a row in every table on the version before, migrates, and
checks every row is still there, unchanged except for the place now written as its code.

**Skill marks, per person (`SkillMark`).** The person (their `User` row), then either a skill item's
permanent id from the shared list or the person's own label for a skill they added (never both), the
mark, and the day it was set. One mark per skill item and one per own label, so marking again replaces
the mark rather than adding a second one.

- A skill the person added is one skill whatever its capital letters: *Welding* and *welding* are the
  same mark, kept under the spelling typed last.
- The marks are **have · learning · not yet**. *I don't know* is not stored: it removes the mark, and
  the item is counted as *not marked*, so every stored mark is something the person said. (The table
  above listed *don't know* as a fourth mark; the gauge already counts *not marked* on its own, so a
  fourth value would only be a second way of saying the same thing.)
- *You said* for a held licence is not a column: it is how a screen labels *have* on an item of the
  kind *legal requirement*.
- A mark for an id that isn't in the shared list is refused, so a mark can't point at nothing. The list
  is empty until the first written future, so until then only the person's own skills can be marked.

**Step progress, per future and step (`StepProgress`).** The future, the road id and the step id (never
a position or a title), the status (**doing · done · not for me**, or none), the *done when* line ids
the person ticked, and a list of status changes with the moment of each (the newest 100 per step), for
*Since last time*. One row per future, road and step. Every id is checked against the road catalog when
it is written: the road must be the future's own road, the step must be on it, and each ticked line must
be one of that step's *done when* lines. The step's own date (*your date* on a step) is left out: dates
beyond the target date are not in phase 1 (§ 12), and it is a plain added column when they are.

- **On road 0 a step's status is the map's, kept in one place (settled 2026-10-12).** The map already
  keeps which of road 0's steps the person marked active, done or set aside, in `ScenarioState`. A
  second status for the same step here could say something else (*done* on the map, *not for me* here)
  with nothing to say which is true, so the storage code refuses a status on a road 0 step, the same
  way it refuses road 0's forks. On road 0 this table keeps only the ticked *done when* lines (road 0
  has none until its content is written), and the cockpit reads and sets road 0's statuses through the
  map: active is *doing*, done is *done*, set aside is *not for me*. One cost: the map keeps no list of
  changes, so *Since last time* has no status history for road 0's steps until the map's statuses move
  here, which a later pull request may do (the map would then read this table). *(2026-10-12: the
  cockpit screen's pull request does it. The map's lists are worked out from its toggles on every load,
  so they can't hold a status the person sets; a road 0 step's status is now kept here like any other
  road's, and the map's chip shows it. § 2, Cockpit screen as built.)*
- The list of a future's progress gives only the steps of the road the future is drawn on now. Another
  road's rows are kept, so going back to that road brings them back.
- Taking the status off a step that was never touched keeps nothing: no empty row is written.

**On the saved future (`Venture`).** Three new columns, all optional:

- `roadId`: the road it is drawn on. Empty means today's general road, so every idea saved before
  this keeps its map. Only a road in the catalog is accepted. `roadChosenAt` keeps the moment the
  person chose it (empty for the general road), so *What you've told DotAmi* can show the answer with
  its date.
- `forkPicks`: the ending picked at each fork of that road, as `{ fork id: { step id, moment picked } }`
  (empty `{}` by default), so each pick has its date too.
  **This differs from the table above**, which put the ending in `ScenarioState.activeBranches`.
  That column is rewritten whole every time the map is saved, from the tax map's two toggles (and, from
  the honest-map pull request, the person's own *I'd incorporate at* number), so another road's ending
  kept there would be wiped by the next save of the map. Road 0's two forks stay exactly where they are,
  in `activeBranches`, picked on the map as today, and the storage code refuses them so there is one
  place for each pick. Every other road's picks go in `forkPicks`. The app's scenario type
  (`activeBranches: Record<string, CFENodeId>`) is therefore left as it is, not widened.
  Reading a future still gives one set of picks whatever its road: on road 0 they are read from the
  map's `activeBranches` and marked *from the map*, with no date, because the map keeps neither the
  day of a pick nor whether a toggle was set by the person or is still its default (the map's
  `decidedBranchIds` is not saved). Road evaluation, *Compare* and *This is mine* read that one set.
- `targetMonth`: the person's own date, a month and year (`2029-05`), because the question asks *by
  when (month and year)*. A month before the current one is refused. `targetMonthSetAt` keeps the
  moment it was set.

Every answer kept on the saved future therefore has its date, as *What you've told DotAmi* shows one
row per answer with its date (§ 2); `Venture.updatedAt` is not used for that, because any edit moves it.

The job picked (an occupation code and its day), the *business / career / both* answer and the *This
is mine* pin are **not** added yet: each comes with the screen that asks it, as one more plain added
column. The occupation code's shape waits on the OaSIS import (§ 13). *(2026-10-12: the business / career
/ both answer came with Your destination and Pick a future, as `lookingFor` and `lookingForSetAt`; and
`notSaid`, the idea's answers a picked future was saved without (`venture-type`, `equipment`,
`sales-targets`), so nothing reads them as said; § 1, The way in as built. Since 2026-10-20 an answer to
the equipment question in the cockpit takes `equipment` off the list, and taking it back puts it on again.
Since 2026-10-21 the sales targets have one id per year, `sales-target-year-1` and `sales-target-year-3`
(`sales-targets` read as both, except a first-year number the old Keep kept, read as said): Keep on the what-if and the cockpit's third-year estimate box each take their
own year off the list, and taking the number back puts it on again.)* *(2026-10-12: the skills pull
request adds the job picked, `Venture.occupationCode` and `occupationPickedAt`; § 6, Skills as built.)*

**The destination (`PersonStatement.kind`).** A new optional column; `destination` marks the
statement written as the answer to *where you want to be*. It is one of the person's statements like
any other: word for word, dated, never edited (a change is a new statement, and the newest is the
destination), shown in *In your words*, deleted with *Your statements*.

**Income wanted, per person: the per-person table's shape (`PersonFigure`, settles § 13).** One row
per number the person gives about themselves rather than about one future: the person, the kind of
number (`income-wanted` is the only kind today), the amount in whole cents, the currency, what it is per
(`year`), where it came from (`typed`), the state (**proposed · confirmed · retracted · discarded**, as
figures have), whether the person changed the amount when agreeing, and the days it was proposed,
agreed and taken back. A kind column, rather than a table for income alone, so the phase 2 numbers that
also belong to the person (the dream-life list's monthly amounts) are new kinds, not new tables. Hours a
week are not money and will need their own column when they come.

- Only the person agrees to it. The storage code has *propose*, *agree*, *discard* and *take back*, and
  no way to write a confirmed number directly. No route calls it yet; when the screen comes, its agree
  route answers only DotAmi's own window, like the figures' agree route.
- Agreeing to a new income target takes back the one agreed before it (state *retracted*, with the
  day), so there is one current number and the old one stays in the history, as a retracted figure does.
- The kind column means a new kind lands in this table, and the Delete box *The yearly income you said
  you want* wipes every row of it. The pull request that adds a second kind renames or splits that box
  in the same change, so ticking it never takes a number the person didn't mean.

**Two new figure kinds.** `savings-for-start` and `start-up-cost-line`, added to `FIGURE_KINDS` after the
five business totals (added, never renamed). `Figure` gains four optional columns, used only by a
cost-line figure: `roadId`, `roadStepId` and `costLineId` (the *named* line on the future's own road it
prices: an official fee is never quoted) and `amountFrom` (**quote · link · receipt · your guess**). Both
kinds are a whole, non-negative number of cents. The *Your figures* form on the Ideas page still offers
only the five business totals: the new kinds are entered from the cockpit's screens, later in phase 1.

There is **one current number** for each cost line and one savings number for each idea, because road
evaluation takes a line plus the person's agreed amount (§ 6) and the *Start-up money* gauge needs one
savings figure. Agreeing to a new number for the same idea, road, step and cost line (or a new savings
number for the same idea) takes back the one agreed before it in the same step (state *retracted*,
with the day), as the income target does; it stays in the history. If two numbers for the same line
are agreed at once, the one proposed last is kept. The five business totals are not changed by this.

**The time period each new number covers (settles § 13).**

- **Income wanted:** *per year*, kept as `per: "year"` on its own row, and never a period with two
  dates: it is a target, not a total of anything that happened.
- **Savings for starting and a start-up cost line:** one day, both ends the same: the day the person
  gave the number. The design proposed the day agreed; the day given is used instead because agreeing
  never changes what a number is, and the day agreed is kept anyway (`confirmedAt`). The check holds
  it to that: both ends have to be today, so a number can't be dated to a day it wasn't given.

**Places stored as international codes (the maintainer's decision of 2026-10-11).** The data file now
stores each idea's place as its code: `CA-AB` for Alberta, and each province and territory's code from
ISO 3166-2:CA (`CA` is Canada itself). A second migration, `…_place_codes`, rewrites the one column that
holds a place with a single `UPDATE "Venture" SET "province" = 'CA-' || "province"` (only on a value that
is still two letters), so an idea saved before keeps its place, and an older backup is moved over when it
is restored and upgraded. Nothing is copied, dropped or renamed. The Prisma enum `Province` keeps its
names (`AB`, `BC`, …) and maps each to its code in the file (`AB @map("CA-AB")`), so the app's code, the
catalogs (which still key a rule by `AB` and `CA`) and every reply and export keep today's values; only
what is written in the file changed. `lib/places/codes.ts` turns today's values into codes for new
storage code, and the storage code's reading of a future gives its place as a code, so the cockpit's
screens use codes from their first line. Moving the catalogs' keys and the app's own type to codes is a
later pull request; everything else about other countries stays parked.

**Whether *What you've told DotAmi* stays fast (settles § 13).** It does, so the *what it unlocked* line
is worked out on each visit and not stored. Measured by hand on 2026-10-11 and 2026-10-12 on a
Windows development computer, timing one run of today's rules over 2,000 runs after a 200-run warm-up: about
0.01 ms a run (0.007 to 0.016 ms on the two demo ideas), so 40 answers, each run with and without, is
about a millisecond. No script keeps this measurement. Road evaluation adds to that and is measured again in its own pull
request; if it ever stops being quick, the line is saved with the answer when it is made, as planned.
*(2026-10-12: measured, about 0.36 ms a run on today's general road, so about 30 ms for 40 answers;
still worked out on each visit. § 6, Road evaluation as built.)*

**What Delete and *What DotAmi knows about you* gain.** The three tables are listed in
`lib/privacy/inventory.ts` and counted on `/your-data`. Step progress goes with *Your ideas* (it belongs
to a future, and the database deletes it with one). Skill marks and the income target each get a box of
their own on the Delete menu (*Your skill marks*, *The yearly income you said you want*), because they
belong to the person, not to any future, and deleting ideas leaves them.

**Not in this pull request:** any screen or route; the occupation code, the *business / career / both*
answer and the *This is mine* pin; a step's own date; moving the catalogs' keys and the app's own
`Province` type to place codes; and moving the person's *I'd incorporate at* number, which the honest-map pull request keeps in
`ScenarioState.activeBranches` under its own key, to a column of its own (a later pull request may).

## 8. The rules check — how each binding rule in CLAUDE.md is met

| Rule ([CLAUDE.md](../../CLAUDE.md)) | How this design meets it |
|---|---|
| **Every path, in the open.** No pre-filtering by what DotAmi thinks the reader wants | Pick a future lists every written future in the order added. Both sides of every fork are drawn and compared. *Not for me* greys a step; it doesn't remove it |
| **Information and options, never a verdict.** No ranking, never *you should* | Gauges are counts and arithmetic with source tags. Compare has identical rows, no score, no highlight; the person clicks *This is mine*. The only sort (phase 2) is one measure the person picks, said on screen. A copy test bans *you should*, *recommended*, *best for you*: as built (2026-10-14), `e2e/no-verdict.spec.ts` reads the visible text of every screen of the journey as it opens, every card's panel with its sources unfolded included, and `e2e/journey.spec.ts` reads it again after each thing a person does (a what-if, an agree prompt, a mark, *This is mine*); both fail on the phrases in `tests/helpers/verdict-words.ts`, which allows only two official sentences, quoted from Alberta's Register a business name page, each with its reason and only inside quote marks. Card colours keep today's meanings and never mean *better* or *ready* |
| **Rules decide; models explain at most** | Steps, skills, fees, cost-line names and cards come from versioned, cited catalogs. Step states and counts come from a pure function; receipts are a diff of two runs. The whole journey works with no model. Later, the Lens only proposes, and what it drafts is labelled (§ 9) |
| **Every claim is cited and dated** | Every step, *done when* line, skill item, official fee and cost-line name carries a typed citation with `lastVerified`. A road compiler (phase 4) refuses an uncited step; phase 1's tests refuse one too |
| **Legal but honest; not advice; never files** | Steps link to the official page and the person acts there. Nothing files, registers or generates a binding document. The export keeps the disclaimer |
| **The person's words stay the person's words** | The destination is stored dated and verbatim, shown back, never summarised and never read by a rule. A model never writes into it (§ 9) |
| **Never derive a fact about the person they didn't state** | Skill marks are the person's own clicks. The job is the person's pick, tagged so. *You are here* comes only from their stated work situation or progress. Unmarked skills are counted as unmarked |
| **Never invent a number** — no projections, no ranges without a sourced figure | Three kinds of cost line only: official fee (cited, dated), the person's agreed quote, named and not priced. No averages (decision 2). The only duration is calendar months to the person's own date. What-ifs carry *your what-if, not a forecast* and never become figures. The invented $80,000 incorporation trigger comes off the map (§ 9). Since the maintainer's K5 B (2026-10-16, written here 2026-10-20), official wage ranges by job may also appear, with their geography level, period and source, never as a cost line or in a total (decision 2's note) |
| **Catalogs are code, never rows; ids are forever; numbers are typed fields** | Roads, steps, skill items and fees are TypeScript catalogs; amounts are typed fields; today's node ids become step ids unchanged, including the one whose label changes |
| **Never put venture or tax knowledge in a component** | The map draws whatever road file it is given; components hold no steps, fees or rules |
| **Data stays on the computer; the privacy inventory is complete** | New tables in the existing local file, listed in the inventory, shown and deletable on `/your-data`. No new request leaves the computer |
| **A new migration passes the desktop test and never rebuilds `Venture`** | § 7 |
| **A new screen arrives with a browser test** | Phase 1's main path: front door → destination → pick a future → cockpit → mark a skill → price a line → what-if → compare → *This is mine*; as built (2026-10-14) in one test, `e2e/journey.spec.ts`, on to *Your plan*, a reload and *Your futures* |
| **Change a control, change its ui-spec file in the same commit** | Each screen's pull request writes or updates `docs/ui-spec/<page>/` |
| **Value first** (the maintainer, 2026-10-10) | No new permission screens, warnings or settings. It reuses the agree prompt, encryption, the data list and reminders |

## 9. Six fixes the final check added (part of the plan)

A last check of the plan against the rules found six things to fix. Each is part of phase 1 or of the
phase it names.

1. **The uncited $80,000 incorporation trigger comes off the map.** Today the step
   `stage-3a-incorporation-80k-net` is labelled *Incorporation at $80K net*, and its own entry calls
   the figure a "DotAmi v0 heuristic … rather than a statutory threshold". The step is renamed
   *Incorporating* (the id stays: ids are forever, and the id is never shown on screen), shows cited
   facts only, and lights from the person's own pick and their own *"I'd incorporate at $___"* number
   (§ 3, § 7) — never a DotAmi threshold. Every place the figure reaches the screen or the export
   changes in the same pull request (found with `grep -rn "80K\|80,000\|\$80" lib components app` on
   2026-10-11):
   - [`lib/engines/cfe/v2026/nodes.ts`](../../lib/engines/cfe/v2026/nodes.ts) lines 214–257: the
     step's label, its trigger (*"roughly $80,000"*) and its metric (*"~$80,000 net income"*).
   - The same file, line 278: the sibling step `stage-3b-incorporation-liability-sred`'s trigger,
     drawn on its card and in the detail panel, compares itself to *"the $80K net-income heuristic"*.
   - [`lib/brain/evaluate.ts`](../../lib/brain/evaluate.ts) lines 471 and 495: the constant
     `incorporationNetTrigger = 80000` and the comparison of third-year *sales* against it.
   - [`lib/scenarios/branches.ts`](../../lib/scenarios/branches.ts) line 38: the incorporation
     toggle's option label *$80K net*, drawn by `components/cockpit/strategy-map.tsx` and copied into
     the export by `lib/playbook/build-skeleton.ts` (`selectedLabel`). It becomes *At your own
     number* (§ 2, Interactions). Line 50: the default-picks comment.
   - Text that describes it, updated to match: the comment at the top of `prisma/seed-data.ts`,
     `docs/engines/cfe.md`, `docs/engines/structure.md` and `docs/verification/golden-scenarios.md`.

   A test reads every label, trigger, metric and branch option label the map and the export can show
   and fails on an `80K` or `80,000` (its control: put the old label back, see it fail, restore).
2. **Federal and Alberta incorporation are shown side by side, and the person picks.** Showing only
   the federal fee would choose federal for them. Each side lists its own official fee lines, read
   from its own page (the federal side also names the name search report, which a numbered company
   doesn't need), or a named blank where a registry agent sets the fee. Until the person picks,
   neither side counts in the Start-up money total, and the gauge says *"2 ways to incorporate, not
   picked yet"*.
3. **The GST/HST card uses the CRA's exact test, quoted from the cited page.** The CRA's *When to
   register for and start charging the GST/HST* page (checked by a tool on 2026-10-11; the page says it was modified
   2026-06-16) gives two tests: *"You exceed the $30,000 threshold in a single calendar quarter."* and
   *"You exceed the $30,000 threshold over the previous four (or fewer) consecutive calendar quarters
   (but not in a single calendar quarter)."* The card quotes both sentences in full. The page gives
   the two tests different start dates (registration no later than the day of the sale that crossed
   the line in one quarter; otherwise no longer a small supplier at the end of the month after the
   quarter), and the card takes those from the same page too. It never says *"four quarters in a
   row"*, which drops the single-quarter test and can be read as *each* quarter.
4. **A model never writes into the person's own words, and anything it drafts is tagged.** When the
   Lens arrives (phase 3), it may propose an answer, but the destination and every statement are only
   ever what the person typed or ticked. A checklist or note the Lens drafts is kept apart from the
   catalog and tagged *"drafted by your model, not from DotAmi's sources"*.
5. **The closest job for a skills list is always the person's pick.** In every phase, including
   *Peek inside* in phase 2, DotAmi never links a business to a job itself; the person picks, and the
   list says *your pick of job*. (Since 2026-10-21 a road names the jobs it is written for, so the road
   written for the person's pick can be offered; that runs from their pick to the road, never from a road
   to a job: § 6, *The road type as built*.)
6. **Every *done when* line is written from its step's official page and carries that citation.**
   A *done when* line with no citation fails the catalog tests like any other uncited claim.

Also carried into phase 1: the map coloured from the person's own branch picks (today
`components/cockpit/cockpit-page.tsx` line 151 runs the rules from the default picks), and the intake
sentence and goals saved, dated and word for word, instead of being lost after the session.

## 10. The phases, and what a person sees

**Phase 1 — Look inside one future (Alberta).** About 10 build days (road type and map 1.5 · road
evaluation and receipts 1.5 · storage 1 · fixes 0.5 · screens 4 · browser tests 1.5) and 5–7 content
days written alongside; roughly two calendar weeks.
A person sees the three-door front door; Your destination with a receipt after each answer; Pick a
future with two cards and *more futures are being written*; the whole road drawn the moment they pick.
The cockpit has the destination bar and four gauges; *What you've told DotAmi / Not told yet*; the
Road, Skills, Money and Rules & tax overlays; a step panel with *done when* checklists, skill marks and
cost lines through the agree prompt; the what-if bar; Compare the two endings with *This is mine*;
*Next on your road*; and the export with the list of what they told DotAmi. There is a filled-in
invented example behind *Show me an example first*. Everything works with no AI connected.
**Day-5 checkpoint:** the destination bar, gauges, receipts, and the Skills and Money overlays running
on today's general Alberta road, for the maintainer to click through before the first written future
lands.

**Phase 2 — Compare futures, dates and your dream numbers.** (Called *cockpit phase 2 (compare
futures)* since 2026-10-20, so it isn't read as phase 2 of the any-idea plan of 2026-10-17.) About 3–4 weeks. A second written future
and the *Possible futures* shelf with kind badges (Business / Career / Side gig) and *Peek inside*
(what the work looks like running — the government's duties for the job the person picked, plus the
owner's cited running duties such as books, GST/HST filing and licence renewals — the road, skills,
costs to start, rules that switch on, and *Beside your dream*: the person's own income, hours, place and
date next to the future's cited facts, no verdict). *Side by side* across any saved futures with *Sort
by one thing you choose* (decision 3). *Keep as a copy* for what-ifs. The time strip and Dates overlay
from the person's own dates; conditions with no date float off the axis. Hours wanted, *won't do*, and
the dream-life list. *I paid this* linking an expense to a cost line (planned against spent). The
résumé opened beside the skills list for hand-ticking.

**Phase 3 — The Lens helps, on the person's own model.** About 4–6 weeks after the Lens itself exists
([task list](../task-list.md) § 9). *Use my résumé* proposes skill marks, each quoting the résumé line
it came from, for the person to tick; the file is read where it sits and not copied, and only ticked
items are kept. *Ask the Lens about this* on a step finds the official page or drafts a checklist,
tagged as drafted by the person's model (§ 9, fix 4). A list of where to find a licensed professional
for steps that need one. Non-number proposals need a new confirm path (today's agree prompt takes
figures only); it is budgeted here. With no model, phases 1 and 2 still work by ticking.

**Phase 4 — More futures, more places.** Ongoing: about 5 content days per future; B.C. and Ontario
versions; contributor-written futures through a compiler (about a week, once) that refuses uncited
steps. Before any food future, Ontario's food-premises citation is re-read (the compliance catalog
points at a regulation that looks like the older one).

## 11. Built to change

The maintainer expects the layout, and so the back end, to change as this is built. So:

- **Roads, overlays and questions are data the screens read.** A road is a catalog file; an overlay
  is a small registry entry (its name, what it badges on a step, its gauge, its panel list); a
  question is a file with its wording, why line, what it unlocks and where it is asked (the same idea
  as the questionnaire in [use-cases.md](use-cases.md)). A new layout rearranges the same pieces
  without touching the rules.
- **The road-evaluation function has no idea what the screen looks like.** It returns states, counts
  and arithmetic; any layout can draw them.
- **Storage keys on permanent ids** (road, step, skill item, cost line), so redrawing a screen or
  moving a step to another column never orphans a person's marks or progress.
- **Each phase is reviewed with the maintainer before the next is locked**, starting with the day-5
  checkpoint.

## 12. Not in phase 1

- Any number that isn't an official fee or the person's own agreed number: no averages, no
  government wage or industry figures, no survival rates (decision 2; the typical-numbers question this
  item used to leave open is closed, § 13, and the note below says what changed).
  *Note (the maintainer's answer of 2026-10-16, written here 2026-10-20):* official wage ranges by job
  are no longer ruled out. They may appear with their geography level, reference period and source, on
  *About this job* ([research-kit.md](research-kit.md) § 4.2, call K5 B), built in the research kit's
  tasks, not phase 1. Outlook ratings (K5 C, not picked), averages, industry figures beyond the official
  counts the maintainer allowed on 2026-10-15 (below), and survival rates stay out.
- The sort-by-one-thing control (decision 3 is phase 2), *Possible futures*, *Peek inside*, *Side by
  side* across saved futures, *Keep as a copy*.
- Dates beyond the target date: the time strip, the Dates overlay, step dates on a timeline.
- Hours, *won't do*, the dream-life list, *I paid this*.
- Anything that needs a model: résumé reading, *Ask the Lens*. No Lens button is shown before the
  Lens exists.
- A second written future; provinces other than Alberta for the written future.
- The real examples library and the person's own test results ([task list](../task-list.md) § 15–16).
- Two stories asked for on 2026-10-15, designed and not built, each waiting on the maintainer's calls:
  buying, renting or leasing each start-up item and where to ask about tax and legal questions
  ([other-ways-to-build.md](other-ways-to-build.md)), and others in the same line of work
  ([competitive-landscape.md](competitive-landscape.md)). The second asks (its call 1) whether an
  official count of businesses may appear for a real person, which this section ruled out until
  then. The maintainer answered that "A" on 2026-10-15 (counts may appear; recorded here once built, task 23n).
- Two more designs asked for the same day, also not built and waiting on calls: the Lens answering
  "cheapest", "fastest" and "strongest foundation" by a measure the person names
  ([lens-comparisons.md](lens-comparisons.md)), which would bring decision 3's sort forward from phase 2 (it
  adds no typed times: the maintainer answered "NO TIMES!" on 2026-10-17, so the months-only rule above
  stands), and one research kit that
  makes all of this work for any job ([research-kit.md](research-kit.md)), whose call K5 asks whether
  government wage figures may appear for a real person, which this section ruled out until then. The
  maintainer answered K5 "B" on 2026-10-16 (official wage ranges may appear, with their geography level
  and period; outlook ratings don't; written here 2026-10-20, see the note under this section's first item).

## 13. Open items

- ~~**Typical numbers, before phase 2.** The approved plan recommended official fees and the person's
  own quotes for phase 1 (decision 2), then asking the maintainer again, once a real future with
  blanks can be clicked through, whether to also show typical numbers (the plan's options B and C).
  Ask before phase 2 is locked.~~ Closed (the maintainer's answer of 2026-10-16, written here
  2026-10-20): asked as [research-kit.md](research-kit.md) call K5, he picked B, official wage ranges
  by job, each with its geography level, reference period and source; outlook ratings (C) not picked.
  Start-up costs stay official fees plus the person's own quotes, with no averages (decision 2). "Phase 2"
  in this item meant this design's own phase 2 (§ 10), now called **cockpit phase 2 (compare futures)**
  so it isn't read as phase 2 of the any-idea plan of 2026-10-17.
- ~~**The period a new number carries**, and the per-person table's exact shape.~~ Settled in the
  storage pull request (2026-10-11, § 7 *Storage as built*): income wanted is per year on a per-person
  table with a kind column; savings and a cost line cover the day the person gave them.
- ~~**Whether *What you've told DotAmi* stays fast.**~~ Settled (2026-10-11, § 7 *Storage as built*):
  one run of the rules took about 0.01 ms, so the line is worked out on each visit; checked again when
  road evaluation landed (2026-10-12: about 0.36 ms a run on today's general road, about 30 ms for 40
  answers, § 6 *Road evaluation as built*).
- ***Not for me* on the side picked at a fork.** Whether the steps only that side leads to go grey
  too, or the fork reads as unpicked; built the simple way until the maintainer says (§ 6, *Road
  evaluation as built*).
- **Hide a research step, or draw it off the path?** Issue #40 asks for *SR&ED deepening* not to be
  drawn without a research kind of work; it is drawn off the path with its reason instead (§ 6, *Steps for
  some kinds of work only, as built*), because the map doesn't pre-filter paths. Hiding it would take a
  step out of sight that a person can't then read or bring back without knowing to go back to the
  intake; drawing it keeps it one click away, at the cost of a dashed card on every map without one of
  the three kinds of work. The maintainer's call.
- **A research step and the person's own words, and a research sole proprietor's card** (review of
  2026-10-13; § 6, *Steps for some kinds of work only, as built*). Two open questions. First, a kind of
  work the person typed themselves ("Research and development") isn't matched to any of the three the
  rules read, so *SR&ED deepening* stays off their path; the reason now says only which kinds of work are
  on the idea, never that they didn't tell DotAmi. Matching their own words would change the rules for
  every card that reads those tags. Second, a sole proprietor with a research kind of work sees the card
  solid, *ahead*, with its two lever cards (amber for them), though the rules leave the step off the path;
  without one it is dashed, *not on your path*. Drawing it dashed would hide the two cards that apply;
  drawing it solid makes the card look more on the path once they say the idea involves research. The
  reason for a sole proprietor without one names only the kinds of work, not the structure, although both
  keep it off. Built as described until the maintainer says.
- **Alberta's fees.** Whether Alberta's trade-name and incorporation fees are set by the province or by
  each registry agent is read from Alberta's page; until then they are named blanks. When a person reads
  them in the Registry Agent Product Catalogue, each amount goes into the official fees catalog
  (`lib/engines/fees/v2026/`, § 6) and the named blank becomes a line naming it. On 2026-10-15 alberta.ca's
  *Register a business name* and *Find a business registry* pages still gave no amount, only a pointer to
  that catalogue, and the agent's service fee is "not regulated".
- **A source for the start-up cost lines' names** (§ 6, *The official fees catalog and start-up cost
  lines as built*). The seven names on road 0 cite nothing yet: the BDC and Futurpreneur templates keep
  their lines inside spreadsheets, and Futurpreneur is a not-for-profit, which the citation type has no
  word for. Two ways, the maintainer's call: a person opens the spreadsheets and records a read of each
  name; or the citation type gains a kind for a not-for-profit, so Futurpreneur's page can be cited for
  *insurance*, the one name its page shows.
- ~~**The OaSIS import's shape.** Which files of the 2025 dataset (for example skills, knowledge,
  abilities, work activities) and how much of each list to show.~~ Settled in the skills pull request
  (2026-10-12, § 6 *Skills, and the government's list for your pick of job, as built*): Skills and
  Knowledge, every item the job's row rates 1 or more, in the dataset's own order; Labels for the job
  names and the taxonomy for the ids. The list is the job's, not a business's, so the *your pick of job*
  tag stays visible. The OaSIS data is kept in its own data file with its own licence line, not mixed
  into CC BY-SA catalog text, until someone checks how the two licences fit together.
- **The government's ratings, or names only** (the maintainer's item 20). Built names only, the
  documented default; the ratings are kept in the data. Showing them ("3 - Moderate Level") would show
  each with its own scale.
- ~~**The example future's content:** the seeded *Chinook Sign Painting* demo, or a new invented person
  on the first written road.~~ Settled 2026-10-13: the maintainer picked a new invented person on the
  first written road, Mara (the appendix below). Built at `/example/mara` from `lib/examples/mara.ts`
  (§ 1, *The example future as built*).
- ~~**Listing a road nobody has read.**~~ Settled 2026-10-13: the maintainer said yes, *Pick a future*
  lists the first written future, its card saying in amber that its sources were checked by a tool and
  not read by a person yet (`LISTED_ROAD_IDS` in `lib/front-door/futures.ts`; § 1, The way in as built).
  The question as it was asked: the first written future's sources are all tool checks (option B):
  every quote was found on its live page, but no person is recorded as having read one. Whether *Pick a
  future* may list such a road (each card saying "Checked by a tool" in amber), or only once a person
  has read its pages, is the maintainer's call; no screen lists any road but road 0 until then.
  *(2026-10-12: Pick a future is built and lists road 0 only, from one list, `LISTED_ROAD_IDS` in
  `lib/front-door/futures.ts`; each card already says how many of its sources were read and how many
  only checked by a tool, in amber, so listing the first written future is one line once the maintainer
  decides. § 1, The way in as built.)* *(2026-10-13: that one line is added.)*
- **"I don't know" on the place.** § 3 says *I don't know* is always an answer, and the same section's
  table marks the province as required. *Your destination* follows the table (no road can be drawn
  without a place). The other choice: an *I don't know* that lists the futures and asks for the place
  again before **Look inside**. The maintainer's call.
- **Four of today's map stages cite pages that have moved** (found 2026-10-12 while writing road 0's
  *done when* lines): the CRA's *Employees* page, the line 4600 page cited twice under *Retained
  earnings planning*, and the two SR&ED pages under *SR&ED deepening* answer "page not found". Their
  read dates are the tax map's; pointing them at the new pages needs a read (or a tool check in place of
  the read), which is the maintainer's call.
- **Reuse terms not yet read** for the Red Seal standard and Alberta's apprenticeship site: link and
  cite only until read.

## Appendix — an invented example

**Invented person, invented numbers, not real data.** Mara (invented) is a second-year cabinetmaking
apprentice in Alberta.

*(2026-10-13: the maintainer picked Mara as the front door's example future. She is built at
`/example/mara`, her answers in `lib/examples/mara.ts`; § 1, The example future as built, says where the
built page's counts differ from this sketch, which was written before road 1 was.)*

*(2026-10-14: the numbers in this sketch, $70,000 a year, quotes of $3,400 and $2,000, $12,000 of
savings and a $45,000 what-if, are invented and stay here only as the sketch. The built example's numbers
are real since the maintainer's option A of 2026-10-14: a $14,993.62 tools line from sellers' listed
prices, a $52,255 income goal from alis, a $610,300 what-if from ISED, and no savings or deposit; § 1, The
example future as built.)*

*(2026-10-15, the maintainer's pick A, "I agree, it should be A": the built example has no what-if. The
what-if bar starts empty for the visitor, who can type their own, never kept, as everywhere. ISED's
$610,300 stays only as context in **Where these numbers come from**, labelled as what it is: the average
yearly revenue of existing small and medium businesses of every age in NAICS 33712, Canada, data year 2024;
an industry average, not a first-year figure and not one of Mara's numbers. Nothing else changed: Mara stays
invented with real numbers, averages appear only in this invented example, and her $52,255 income goal and
$14,993.62 tools line are as they were. The sketch's $45,000 what-if below stays as the sketch.)*

She picks *Start from where I want to be* and types *"My own small furniture shop, four-day weeks,
home for supper."* The receipt: *"Saved word for word, dated today. This goes at the top of your
plan."* She picks *Both / not sure* (*"2 futures you can look inside"*), Alberta (*"Alberta and federal
rules apply"*), and a target of $70,000 a year, which she agrees to.

She opens *From apprentice to your own shop (Alberta)*. The whole road appears, greyed in: *Finish
your training*, *Certified* (a fork: *Stay employed* or *Open your own shop*), *Open the doors*, *First
years on your own*, *Incorporating*, *Running as a corporation*. Hovering *Certified* sends arrows to
both endings.

In the cockpit, *Steps: 0 of 22 done*; Skills and Your date show **?** with one invitation each; Start-up
money shows the official fees found and *6 lines not priced yet*. She marks 9 skills (6 *have*, 2
*learning*, 1 *not yet*): *"Because you marked 9 skills: 3 steps now say needs 0 more; 2 steps show
what's still missing."* On *Set up your shop* she adds her own quotes, $3,400 for a table saw and
$2,000 for a space deposit, and $12,000 of savings. The gauge reads *savings you typed $12,000 · lines
you priced $5,400 + official fees · difference · 4 lines not priced yet*, plain arithmetic.
*Incorporating* shows federal and Alberta incorporation side by side, each with its own cited fee lines
or named blanks, and *"2 ways to incorporate, not picked yet"*; the step stays *check first*, with
*"set your own number to see this light"*, because she hasn't said at what sales she'd incorporate.

She tries first-year sales of $45,000. Under *Your what-if, not a forecast*, the GST/HST card quotes
the CRA's two tests: over $30,000 in a single calendar quarter, or over the previous four (or fewer)
consecutive calendar quarters, with the page and how it was checked (a tool found those words on it).

She opens *Compare*: *Stay employed* and *Open your own shop* on the same rows, *"In the order the road
shows them"*, no score. She clicks *This is mine* on the shop and exports her plan to show her partner.
Nine days later the cockpit opens on her future: *"Since last time: 1 step marked done."* (She hasn't
set a date, so there is nothing coming up to list and *Your date* still shows **?**.)
