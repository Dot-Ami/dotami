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
   and asking again before phase 2 whether to show typical numbers; that question is open, § 13.)
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
| 2 | **Your destination** (`/start`) | Get where the person wants to end up, one question at a time, and pay off each answer with a receipt | (1) *"In a few years, what do you want your work and life to look like? Use your own words."* (*I don't know yet* allowed) · (2) a business of your own, a job or career, or both / not sure · (3) province or territory (required: fees, licences and tax rules differ by place) · (4) optional: the yearly income you want, before tax — your number, through the agree prompt. Every question has a *why we ask / what it unlocks* line and *I don't know* | Under each answer, a receipt (*"Alberta and federal rules apply"*); the person's words shown back exactly, with the date | Pick a future |
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
  it, cited) or a cost line (its step, where its amount came from, *proposed* or *agreed*).
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
| The yearly sales at which you'd incorporate (*"I'd incorporate at $___"*) | No law sets a sales or income level for incorporating, so DotAmi has no number of its own; the uncited $80,000 is removed (§ 9, fix 1) | The *Incorporating* step lights when your third-year sales what-if (or agreed sales) passes your number; with no number it stays *check first* and says *"set your own number to see this light"* | The *Incorporating* step's panel, or a *Not told yet* row once a sales what-if is kept | No | A new nullable column on `Venture` (whole dollars, like today's Year 1 / Year 3 fields), labelled *your number*. A what-if setting, not a figure; never filled in by DotAmi |
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
| Steps, forks, *done when* lines | Official pages (the law, the CRA, the province, the regulator), one citation per *done when* line, each either read by a person or checked by a tool (the quote checker found its quotes word for word on the live page; option B of 2026-10-11, [citations.md](../engines/citations.md)) | Not written in until a person reads the official page or the tool finds each quote on it. Whether *Pick a future* may list a road none of whose sources a person has read is the maintainer's call (§ 13). *"More futures are being written"* says so |
| Legal requirements (licences, certificates, registrations) | Today's compliance catalog plus the regulator's pages (for the first future, Alberta's apprenticeship and trade certification pages, read fresh: Alberta's trades system was recently rewritten) | Not written in until the current page is read by a person or its quotes are found on it by the tool |
| Skills for a job | [OaSIS 2025 Version 1.0](https://open.canada.ca/data/en/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec) (Employment and Social Development Canada, Open Government Licence – Canada; the dataset's record says published 2025-10-30, modified 2026-10-04, checked by a tool on 2026-10-11), through the person's pick of job. (Corrected 2026-10-11: this line first named OaSIS 2022 Version 1.0, which has no Knowledge file; the 2025 dataset has one, *Knowledges 2025 v1.0*.) | The person adds their own skills (*added by you*) |
| Official fees | The fee page or regulation for each (for example federal online incorporation on the Corporations Canada page and its fee schedule; Alberta's trade-name and incorporation fees from Alberta's own page, which also says whether the province or each registry agent sets them, § 13) | A named blank; if Alberta's page says registry agents set the fee: *"set by your registry agent: add what you were quoted"* |
| Cost-line names (tools, space deposit, insurance, vehicle, first materials, software, money to live on while starting) | Names only, cited to the free BDC and Futurpreneur cash-flow templates (linked, not copied; they are blank templates, not numbers) | — |
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
  pull request moves them, below.)*
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
  has set).
- **The answers it read.** `answers` lists every answer the run read, in a fixed order, each marked
  `given`. An answer is not given when it is a default the person hasn't set, and its words say so: a
  map pick they haven't clicked (*the map's default pick at “GST timing” is …*; the map keeps its
  clicks only for the session, so after a reload every pick reads as a default, as the map's rail
  already says), the hire-first path while it is off (*the hire-first path is switched off*: the map
  can't tell switched off from never switched on), the structure the map assumes, and buying equipment
  while unanswered (*not answered, read as no*). *What you've told DotAmi* lists the given ones; the
  others still name themselves in a step's reason, worded as defaults.
- **The four gauges are counts and sums.** *Steps:* done, out of every step on the road, with how many
  are doing and how many are not on the path. *Skills:* each skill item the road lists, counted once,
  as *have · learning · not yet · not marked*; skills the person added themselves are counted apart.
  *Start-up money:* the official fees, the person's own numbers, how many named lines are not priced
  yet, the lines left out of the sums because their step is not on the path or waits on a fork with no
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
  that answer taken away, with its tests; the told-list pull request adds it); and fix 2's fee lines
  (§ 9): no road has cost lines yet, and when each way to incorporate is a side of a fork, the sums
  already leave both out until the person picks.
- **Open question for the maintainer: *not for me* on the side picked.** *Not for me* greys its own
  step only. When the person marks the side they picked at a fork *not for me*, the other side stays
  off the path (it wasn't picked) and the steps only the picked side leads to still apply, with their
  money counted, so both endings are off while what comes after one of them applies. Whether those
  steps should go grey too, or the fork should read as unpicked, is the maintainer's call; until then
  it is built the simple way. (§ 13.)

### The first written future as built (2026-10-12)

Road 1, *From apprentice to your own shop (Alberta)*, is written into the catalog
(`lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts`, id `road-apprentice-to-own-shop-ab`, kind
`both`, `AB`). It is in the catalog only: no screen lists it until *Pick a future* is built. Choices
made while writing it, each for a reason:

- **Four columns, one fork.** *Finish your training* · *Certified* (the fork: *Stay employed* or *Open
  your own shop*) · *Open the doors* · *First years on your own*. The example trade is Cabinetmaker,
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
  stops tools with a human check, which is never bypassed. A person can read it and fill them in.
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
  a one-line summary, a *period* is explained as a level designed to take about a year (the profile's
  words), and *Schedule 1* names the regulation it belongs to.

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
  here, which a later pull request may do (the map would then read this table).
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
column. The occupation code's shape waits on the OaSIS import (§ 13).

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
| **Information and options, never a verdict.** No ranking, never *you should* | Gauges are counts and arithmetic with source tags. Compare has identical rows, no score, no highlight; the person clicks *This is mine*. The only sort (phase 2) is one measure the person picks, said on screen. A copy test bans *you should*, *recommended*, *best for you*. Card colours keep today's meanings and never mean *better* or *ready* |
| **Rules decide; models explain at most** | Steps, skills, fees, cost-line names and cards come from versioned, cited catalogs. Step states and counts come from a pure function; receipts are a diff of two runs. The whole journey works with no model. Later, the Lens only proposes, and what it drafts is labelled (§ 9) |
| **Every claim is cited and dated** | Every step, *done when* line, skill item, official fee and cost-line name carries a typed citation with `lastVerified`. A road compiler (phase 4) refuses an uncited step; phase 1's tests refuse one too |
| **Legal but honest; not advice; never files** | Steps link to the official page and the person acts there. Nothing files, registers or generates a binding document. The export keeps the disclaimer |
| **The person's words stay the person's words** | The destination is stored dated and verbatim, shown back, never summarised and never read by a rule. A model never writes into it (§ 9) |
| **Never derive a fact about the person they didn't state** | Skill marks are the person's own clicks. The job is the person's pick, tagged so. *You are here* comes only from their stated work situation or progress. Unmarked skills are counted as unmarked |
| **Never invent a number** — no projections, no ranges without a sourced figure | Three kinds of cost line only: official fee (cited, dated), the person's agreed quote, named and not priced. No averages (decision 2). The only duration is calendar months to the person's own date. What-ifs carry *your what-if, not a forecast* and never become figures. The invented $80,000 incorporation trigger comes off the map (§ 9) |
| **Catalogs are code, never rows; ids are forever; numbers are typed fields** | Roads, steps, skill items and fees are TypeScript catalogs; amounts are typed fields; today's node ids become step ids unchanged, including the one whose label changes |
| **Never put venture or tax knowledge in a component** | The map draws whatever road file it is given; components hold no steps, fees or rules |
| **Data stays on the computer; the privacy inventory is complete** | New tables in the existing local file, listed in the inventory, shown and deletable on `/your-data`. No new request leaves the computer |
| **A new migration passes the desktop test and never rebuilds `Venture`** | § 7 |
| **A new screen arrives with a browser test** | Phase 1's main path: front door → destination → pick a future → cockpit → mark a skill → price a line → what-if → compare → *This is mine* |
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
   list says *your pick of job*.
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

**Phase 2 — Compare futures, dates and your dream numbers.** About 3–4 weeks. A second written future
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
  government wage or industry figures, no survival rates (decision 2; whether phase 2 shows typical
  numbers is asked again before it starts, § 13).
- The sort-by-one-thing control (decision 3 is phase 2), *Possible futures*, *Peek inside*, *Side by
  side* across saved futures, *Keep as a copy*.
- Dates beyond the target date: the time strip, the Dates overlay, step dates on a timeline.
- Hours, *won't do*, the dream-life list, *I paid this*.
- Anything that needs a model: résumé reading, *Ask the Lens*. No Lens button is shown before the
  Lens exists.
- A second written future; provinces other than Alberta for the written future.
- The real examples library and the person's own test results ([task list](../task-list.md) § 15–16).

## 13. Open items

- **Typical numbers, before phase 2.** The approved plan recommended official fees and the person's
  own quotes for phase 1 (decision 2), then asking the maintainer again, once a real future with
  blanks can be clicked through, whether to also show typical numbers (the plan's options B and C).
  Ask before phase 2 is locked.
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
- **Alberta's fees.** Whether Alberta's trade-name and incorporation fees are set by the province or by
  each registry agent is read from Alberta's page; until then they are named blanks.
- **The OaSIS import's shape.** Which files of the 2025 dataset (for example skills, knowledge,
  abilities, work activities) and how much of each list to show; the lists describe employees, not
  owners, so the *your pick of job* tag stays visible. The OaSIS data is kept in its own data file with its own licence line, not mixed
  into CC BY-SA catalog text, until someone checks how the two licences fit together.
- **The example future's content:** the seeded *Chinook Sign Painting* demo, or a new invented person
  on the first written road.
- **Listing a road nobody has read.** The first written future's sources are all tool checks (option B):
  every quote was found on its live page, but no person is recorded as having read one. Whether *Pick a
  future* may list such a road (each card saying "Checked by a tool" in amber), or only once a person
  has read its pages, is the maintainer's call; no screen lists any road but road 0 until then.
- **Reuse terms not yet read** for the Red Seal standard and Alberta's apprenticeship site: link and
  cite only until read.

## Appendix — an invented example

**Invented person, invented numbers, not real data.** Mara (invented) is a second-year cabinetmaking
apprentice in Alberta.

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
consecutive calendar quarters, with the page and the day it was read.

She opens *Compare*: *Stay employed* and *Open your own shop* on the same rows, *"In the order the road
shows them"*, no score. She clicks *This is mine* on the shop and exports her plan to show her partner.
Nine days later the cockpit opens on her future: *"Since last time: 1 step marked done."* (She hasn't
set a date, so there is nothing coming up to list and *Your date* still shows **?**.)
