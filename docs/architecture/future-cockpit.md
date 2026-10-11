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
| Steps, forks, *done when* lines | Official pages (the law, the CRA, the province, the regulator), read and cited by a person, one citation per *done when* line | A person reads the official page and writes the step; until then the future isn't offered. *"More futures are being written"* says so |
| Legal requirements (licences, certificates, registrations) | Today's compliance catalog plus the regulator's pages (for the first future, Alberta's apprenticeship and trade certification pages, read fresh: Alberta's trades system was recently rewritten) | Not written in until the current page is read |
| Skills for a job | OaSIS 2022 version 1.0 (Employment and Social Development Canada, Open Government Licence – Canada; the dataset's record says modified 2025-09-04, read 2026-10-11), through the person's pick of job | The person adds their own skills (*added by you*) |
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

**The map draws any road.** Today `components/cockpit/strategy-map.tsx` only knows the ten-step tax
map (it imports `CFENode` and `cfeTiersV2026`). Phase 1 first changes it to draw a `Road`, with road 0
drawn exactly as today (about 1.5 build days).

**Road evaluation.** A pure function takes the road, the person's answers, skill marks, step progress,
agreed figures and any what-if, and returns step states, gauge counts and the money arithmetic. It
reuses `evaluateProfile` for the rules and tax cards. A small helper diffs two results for receipts
(about 1.5 build days with unit tests).

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
*what it unlocked* line is worked out again by running the rules with and without that answer (§ 13
has the open question if that turns out slow).

**The rules for the migration.** One hand-checked migration. New tables are created; `Venture`,
`PersonStatement` and `Figure` only gain nullable columns through `ALTER TABLE … ADD COLUMN`. `Venture`
is **never** rebuilt by copy, drop and rename: the migrator runs with foreign keys on, and a rebuild
would cascade-delete every idea's figures, links and map progress. The migration passes
`tests/desktop-migrate.spec.ts`, and a new test seeds ventures, figures, links and map progress before
it and checks every row survives.

**What else changes in the same pull request:** every new table in `lib/privacy/inventory.ts` (the
privacy test fails until it is), new rows and counts on `/your-data`, the new kinds on the Delete menu,
and a line in `docs/privacy-log.md` [Unreleased] saying what is now kept.

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
   register for and start charging the GST/HST* page (read 2026-10-11; the page says it was modified
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
- **The period a new number carries.** Figures have a period today. Proposed: income wanted (on its
  own per-person table, § 7) is "a year" with the period the person names; `savings-for-start` and
  `start-up-cost-line` carry the day agreed as both ends. To settle in the storage pull request,
  along with the per-person table's exact shape.
- **Whether *What you've told DotAmi* stays fast** when every row's *what it unlocked* is worked out
  again on each visit. If not, the line is saved with the answer when it is made.
- **Alberta's fees.** Whether Alberta's trade-name and incorporation fees are set by the province or by
  each registry agent is read from Alberta's page; until then they are named blanks.
- **The OaSIS import's shape.** Which files of the dataset (skills, abilities, work activities) and
  how much of each list to show; the lists describe employees, not owners, so the *your pick of job*
  tag stays visible. The OaSIS data is kept in its own data file with its own licence line, not mixed
  into CC BY-SA catalog text, until someone checks how the two licences fit together.
- **The example future's content:** the seeded *Chinook Sign Painting* demo, or a new invented person
  on the first written road.
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
