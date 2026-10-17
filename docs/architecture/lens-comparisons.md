# The Lens answers a person's questions from DotAmi's facts (design)

Status: **Design, not built. The maintainer answered its calls on 2026-10-16 (§ 10); what is still open is in
§ 14.** Written 2026-10-15; reframed 2026-10-16 after his clarification that the questions it was first built
around are only examples (§ 1). No product code yet. Tracker story **S2.5.24** (the file keeps its first name,
`lens-comparisons.md`, so links keep working); this document is task S2.5.24a, build tasks are S2.5.24b onward
(§ 11). It sits on PR #175 beside [other-ways-to-build.md](other-ways-to-build.md) (S2.5.22) and
[competitive-landscape.md](competitive-landscape.md) (S2.5.23), and reuses the shared research kit,
[research-kit.md](research-kit.md) (S2.5.25), for every piece of data and every read tool it can. The three
biggest questions here were asked **once**, in the kit, as calls K7, K8 and K9; he answered A to each. Read
with [future-cockpit.md](future-cockpit.md).

Words used here:
- **The Lens** = DotAmi's planned built-in assistant, running on the person's own AI model and key
  ([use-cases.md](use-cases.md)).
- **MCP** (Model Context Protocol) = the standard way an AI model calls another program's tools; DotAmi plans
  to be an MCP server ([connectors-and-agents.md](connectors-and-agents.md) § C).
- **Read tools** = the read-only functions the Lens (and, through the MCP server, the person's own agent) calls
  to see DotAmi's facts: the person's road and its steps, catalog facts with their citations, agreed numbers,
  marks and picks (§ 6.1). The Lens knows nothing else.
- **NOC** = National Occupational Classification, Canada's job codes. **ESDC** = Employment and Social
  Development Canada. **WCB** = Workers' Compensation Board. **Trades Qualifier (TQ)** = Alberta's route to a
  trade certificate through work experience or a certificate from elsewhere, instead of an apprenticeship.
- **Measure** = the one thing options are sorted by, when the person asks for them in order (for example money
  to start).
- **Frame** = the fixed line *"Sorted by …: your choice. DotAmi doesn't rank futures."*
- **Option set** = the group of the person's own choices being compared (the two endings of a fork, the three
  training routes, their saved futures).
- **Fix-it buttons** = the *"Add a number for …"* buttons that open the agree prompt.

Repo facts cite a path and line on this branch (main `1e96a04` merged in). Every outside fact was seen on
**2026-10-15** at the link in § 15. Anything not confirmed is in § 14 and never stated as fact. Day counts
are rough build estimates in working days.

## 1. The request

The maintainer, 2026-10-15, word for word:

> "when they use the lense chat, the lense chat SHOULD be able to answer questions like "Hey, whats the
> cheapest option", or "whats the fastest option?", or "which one of these would have the strongest
> long-term foundation for me to build out other business's" + any other edge cases like this. that means,
> we obviously need to make a story and tasks for the lense chat to be able to do this as well. So what
> data would the lense chat require, how would we get it, how does it know? etc etc"

and, about the whole day's work:

> "it makes no sense building all of this out repeatedly for every single job and business possibility."

The next day, 2026-10-16, he made clear what the first quote is and isn't, word for word:

> "so something i want to make clear right off the bat in regards to the examples of "the Lens answering
> "cheapest, fastest, strongest", and one research kit for every job."; is that this is literally just an
> example of questions that a user may ask. I'm not saying we need to gear the lense chat towards these
> questions specifically."

So this story is about the Lens answering **whatever a person asks**, from DotAmi's facts. "Cheapest",
"fastest" and "strongest foundation" are used below only as examples, because between them they test the hard
cases: an order with gaps, kinds of time that can't be mixed, and a word with no countable meaning. Putting
options in order is **one** thing the Lens can do (§ 6.3), not what it is built around.

The same day, in his note on kit call K9, he said what the Lens is for, word for word:

> "it shouldn't even give you a timeline for any of this. It should generally help you pick up the pace for
> anything done online because it should be able to help you with things done on a computer, but it can't do
> schooling, or phone calls, or the actual work required to start or maintain a business. It should just
> provide steps; VERY similar to how you and I are working with stories and tasks."

This doc answers his three questions: **what data** (§ 4), **how we get it** (§ 6), **how it knows** (§ 6.4).
His answer 1 of 2026-10-15 also agreed to other-ways-to-build call 1 option C (his own quotes, links to
rent-price sites now, the Lens reading listed prices on request later); call 3 here (answered A on
2026-10-16) decides whether such a price can enter an ordered answer. His answers 2–4 asked for third-party
tools or an in-house build (ads, named competitors, official counts); those are handled in the research kit
and the reworked competitive-landscape design. On 2026-10-16 named businesses (kit call K3) and ad spend
beyond v1 (K4) were put on hold until research story S2.5.26 (free software, websites and GitHub repos that
already do this) is done; nothing in this design waits on them. His kit call K2 answer, *"yah that's fine. we
can use things like google auth if we have to"*, relaxes the 2026-09-24 "DotAmi holds no logins" reading for
vendor keys and sign-ins where it gives people better information ([research-kit.md](research-kit.md), K2);
call 3's rule for outside numbers is unchanged by it.

**The tension, said up front.** [CLAUDE.md:22-24](../../CLAUDE.md) says DotAmi "does not rank options by
what it thinks matters to the person" and never says "you should". Most questions are answered straight from
facts ("what does this step need?", "where does this fee come from?"). A question asking for an order can be
answered from facts when code does the arithmetic on a measure the person named and the gaps are shown ("the
cheapest option", for example). A question whose criterion has no countable meaning until the person says
what they mean ("the strongest long-term foundation", for example) gets a clarifying question first. Where an
answer would need DotAmi's own judgement, a forecast or a timeline, the Lens says it can't and points to who
can help. His answers to K7, K8 and K9 (A each, 2026-10-16) keep the rule as it is.

## 2. The idea in one paragraph

The person asks anything, in their own words. The Lens answers only from what DotAmi's read tools return
(§ 6.1). **Every number the person sees is drawn by DotAmi's code with its source; the model writes the words
around it and may not write a single number or verdict** (the reply guard, § 6.4). When a question rests on
something the person hasn't defined ("strongest", "best for me"), the Lens asks what they mean, with buttons,
before answering, and never picks a meaning for them. Questions that need a forecast, advice or a timeline get
a fixed "DotAmi can't answer that" card with the nearest facts DotAmi holds and the place to ask. When the
question is "how do I get there?", the Lens gives **steps**: the road's own steps with their *done when* lines,
never a timeline or a date; it can help with the steps done on a computer, at the permission level the person
set, and says plainly that it can't do schooling, phone calls or the work itself (§ 5.6).

**One of those capabilities is putting options in order.** When a question asks for an order, the Lens works
out **which of the person's own options** are meant (the two endings of a fork, the routes in one column,
their saved futures, or, after S2.5.22, the ways to get one cost line) and **which countable measure** the
question names (money to start, steps left, skills not yet marked, for example). It shows *"I read that as:
…"* with **Change**; when it can't tell, it asks with buttons until the person confirms. DotAmi's code then
computes an **answer card**: the same rows for every option, each value with its source, how many values are
missing on each side, and the order by the person's measure with the frame *"Sorted by money to start: your
choice. DotAmi doesn't rank futures."* The same card works with no AI, through a *Sort by* control on the
screens decision 3 names (K7 A).

## 3. What already exists (where this starts)

- **Decision 3 already allows a person-picked sort:** *"Sorted by fewest steps left: your choice. DotAmi
  doesn't rank futures."* ([future-cockpit.md:47-48](future-cockpit.md), built in phase 2). The only allowed
  orders are the order added, road order, and "one countable measure the person picks, always said on screen"
  (:836-837). Task [15f], recorded at the maintainer's request, lets the person "sort them by one thing you
  pick ('lowest start-up money', 'could start this month')" ([docs/task-list.md:771-775](../task-list.md)).
- **Roads are already lists of steps.** Each step has *done when* lines the person ticks and a status
  (doing / done / not for me), kept per future in `StepProgress` ([CLAUDE.md:143-146](../../CLAUDE.md)), and
  the cockpit shows *Next on your road*, "the next three undone steps, labelled *"the order steps happen, not
  importance"*" ([future-cockpit.md:354-355](future-cockpit.md)). That is the "steps" shape his K9 note asks
  for.
- **Pure road evaluation.** Same input, same result; a test fails if it imports anything that reads a file,
  the database, the network or the clock ([lib/roads/evaluate-road.ts:31-40](../../lib/roads/evaluate-road.ts)).
- **The money gauge keeps the parts apart:** official fees, your numbers, lines not priced, fees that apply
  only on a condition. "A blank is counted as a blank, never added up as $0"; the only subtraction is savings
  minus priced lines, "only on numbers that exist" (evaluate-road.ts:549-577). Cost lines are official fees
  in whole cents or named lines with no amount ([types.ts:138-177](../../lib/engines/roads/v2026/types.ts)).
- **Compare the two endings** runs road evaluation once per side of a fork and returns identical rows, with
  "No score, no total, no order but the fork's own" ([lib/cockpit/told.ts:409-416](../../lib/cockpit/told.ts)).
- **No step has a typed time.** `RoadStep` has no duration field (types.ts:64-95). Road 1's times live only
  in prose, each with a tool-checked citation, and are different kinds: a designed length ("4 periods
  (levels), each designed to take about a year", [apprentice-to-own-shop-ab.ts:418](../../lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts));
  required work (1,360 hours per period, :505; 8 weeks classroom, :543-544); a minimum of experience (72
  months and 8,160 hours, :583); and limits or deadlines (finish within 18 months, :620; a 45-day fee window
  and a 15-day WCB account rule, :428, :303-304). Part-time work is counted differently (:588-592). The
  cockpit allows only one duration, "calendar months to the person's own date" (future-cockpit.md:1733), and
  shows official hours "with no division into weeks" (:830-831).
- **The three training routes are one column, not a fork** ("Three ways to the certificate",
  apprentice-to-own-shop-ab.ts:377), so Compare can't put them side by side today.
- **Foundation facts:** road 1 joins road 0 at *Incorporating* (:1266); skill items are shared, so "a
  person's mark carries over to every road listing it" (types.ts:130); the person can link ventures as
  `sister`, `overlaps`, `feeds` or `related` ([lib/db/ventures.ts:11](../../lib/db/ventures.ts)). **No road has a
  holding-company step.** "Holdco" appears only in the prose of road 0's retained-earnings node ("potential
  Holdco planning", [cfe nodes.ts:495](../../lib/engines/cfe/v2026/nodes.ts)) and in the structure ladder's
  uncited line that retained earnings "may favour a holding company"
  ([ladder.ts:127-128](../../lib/engines/structure/v2026/ladder.ts)), so nothing can count it yet.
- **Not built:** the Lens [9d], its test set [9c], permission levels [9f] and the MCP server [9i]
  ([task-list.md:572-590](../task-list.md)). `GET /api/readout` lists only road 0's nodes and cards
  ([route.ts:64](../../app/api/readout/route.ts)) and says ranking "is the reader's job, with the person
  present" (:112).
- **The Lens's planned powers** already include searching the web, driving a browser built into the app,
  running commands on the person's computer and changing things in the app for the person
  ([use-cases.md:36-46](use-cases.md)); commands, the browser, bank records and writing to accounting software
  are "switched on separately, each with its own warning" (use-cases.md:299-301;
  [CLAUDE.md:218-222](../../CLAUDE.md)).
- **Words checks miss comparative and superlative words:** `VERDICT_WORDS` has no *cheapest*, *fastest*,
  *strongest* or *lowest*, for example ([tests/helpers/verdict-words.ts:25](../../tests/helpers/verdict-words.ts)).
- **PR #175 already hands questions about the ways to this story.** The reworked
  [other-ways-to-build.md](other-ways-to-build.md) says the Lens answers "which is cheapest?" from the person's
  own numbers as K7 settles (§ 2, § 4.10), keeps "No difference line on any screen" (§ 4.1), and says nobody
  can say "which way costs less after tax, the Lens included" (§ 8). Its own call 11 defers to K7 and K8, both
  answered A on 2026-10-16.

## 4. What data a question needs, and whether it exists

The rows are **examples** of questions a person may ask, picked to test the design; the Lens isn't built
around them and isn't limited to them. "How it knows" always means the same thing: **a typed field in a
catalog with a checked citation, or a number the person agreed to. Never the model's own knowledge.**

| For example | Data it needs | Exists today? | Where it comes from |
|---|---|---|---|
| What's next? What does this step need? Where does this fee come from? | The road's steps, needs, *done when* lines, citations | Yes | Road catalogs; road evaluation; *Next on your road* |
| What's the cheapest option? (money to start) | Official fees, the person's agreed numbers, count of blanks | Yes | Fees catalog; agree prompt (`amountFrom`: quote, link, receipt, your guess) |
| What's the cheapest way to get the machines? | Each way's amount; rent's period and the person's own count | After S2.5.22 | The person's quotes per way; rent only as *your $[400] × your [6]*; before tax only |
| What's the fastest option? (time) | A typed, cited time per step, by kind | **No** | New `time` field (kit task S2.5.25j, K9 A), filled from the official page, e.g. Alberta's Tradesecrets profile [T1]; shown as facts, never a timeline; adding times together is open (§ 14) |
| Which has the strongest foundation? | The person's meaning, as a countable proxy | Partly | Road arrows and joins, shared skill marks, way picks, venture links (K8 A) |
| Fewest steps / skills / legal requirements | Road evaluation's counts and the person's marks | Yes | Already computed |
| Which pays more? | A published wage figure for the job picked | No; planned under kit call K5 B (picked 2026-10-16) | ESDC's wage open data, keyed by NOC, province and economic region, Open Government Licence – Canada [W1]; each row's source code shows its real geography level (some "Calgary" rows are a province-wide figure, some regions use small-area estimates); never Job Bank's pages, whose terms forbid scripts and screen scrapers [W2] |
| Better prospects, more demand? | A published outlook rating | Not planned | The maintainer picked kit call K5 B on 2026-10-16, which has no outlook ratings (K5 C was not picked); ESDC's 3-year outlook and COPS [W3] are projections and are not shown |
| Which grants can I get? | Eligibility by business profile | No | The open Business Benefits Finder file has program titles, descriptions and organization but no eligibility, industry or province columns [G1]. A list with links only |
| Least permits / paperwork? | Permits per business activity | No | BizPaL has no API found, and its terms need written permission for commercial redistribution [P1][P2]. A proxy the person picks instead |

The generic government data (skills, wages, outlooks, business counts) gives context but **no start-up cost
and no duration for a path**. Those stay per-road catalog content or the person's own entries, which the
research kit produces for every job while the Lens's code stays the same (§ 7).

## 5. What a person sees

Screen words live in a words file and pass `VERDICT_WORDS` and `VERDICT_PHRASES`. The person's own question
appears only inside quote marks. **Amounts in brackets are placeholders, not sourced figures.** The answers
below are examples chosen because they are the hard cases; most questions are simpler, a fact with its source
or the next steps (§ 5.6).

**5.1 An order the person asked for, for example "what's the cheapest option?"** Lens call 1 was answered C:
the order is on what's priced, the gaps are counted, and each blank has a fix-it button.

```
You asked: "what's the cheapest option?"
I read that as: money to start, lowest first, across the two endings of your fork.      [Change]

                       Money to start            Official fees   Your numbers   Not priced yet
  Stay employed        $[A] on what's priced     [1]             [0]            0
  Open your own shop   $[B] on what's priced     [2]             [3]            5
Sorted by money to start, lowest first: your choice. DotAmi doesn't rank futures.
5 lines aren't priced on Open your own shop, so this order can change.
  [Add a number for Woodworking machines and tools]   [Sort by money paid as you go]   Sources ▸
Before tax: what it costs after tax is a question for your accountant.
```

**5.2 A question about time, for example "what's the fastest option?"** (after typed times, K9 A). DotAmi
never gives a timeline or a date (his K9 note, § 1). It shows each step's official times as facts, one column
per kind of time, and never adds or compares across columns. The times are road 1's cited official figures
(Tradesecrets [T1]); none is a forecast.

```
You asked: "what's the fastest option?"
I read that as: official times, across the three ways to the certificate.              [Change]
DotAmi doesn't give timelines. Here is what each official page states.
                          Work hours earned     Experience you must      Classroom         Must finish
                          during the program    already have                               within
  Apprenticeship          1,360 hours in each   No time of this kind     8 weeks in each   No time of this kind
                          of 4 periods                                   of 4 periods
  Trades Qualifier:       No time of this kind  72 months and            No time of        18 months
  work experience                               8,160 hours              this kind
  Trades Qualifier:       No time of this kind  No time of this kind     No time of        18 months
  outside certificate                                                    this kind
  Hours you already have: not stated · [Add yours]
These are official minimums and limits, not how long it will take you. "4 periods, each designed to take
about a year" is shown in the source's own words and never added, because it says "about".
  [Show the steps for each way]   Sources ▸
```

The card puts the ways in **no order**. Ordering them by a kind of time would mean adding up each way's times
of that kind (the apprenticeship's hours come per period), and whether DotAmi may add times within one kind is
the open question in § 14 (asked in the research kit). *Hours you already have* is asked, never assumed.

**5.3 A criterion the person hasn't defined, for example "the strongest foundation".** No countable meaning
yet, so a question first (K8 A):

```
"Strongest foundation" can mean different things, and DotAmi doesn't choose for you.
What do you mean by it?   [In my own words…]
Or pick any of the things DotAmi can count (alphabetical). Each is shown on its own, never added into one number.
  [Lines where you picked Buy or Already have it]   [Links to your other ideas]
  [Reaches Incorporating]   [Skills you marked "have" that other roads also list]
```

Each chip is a count code can make: lines where the person picked *Buy* or *Already have it*; venture links of
kind `feeds` or `sister`; whether the path reaches *Incorporating* through `next` arrows and road joins; shared
skill items marked *have*. Each chip the person picks is its own row, sorted one at a time, never combined.
*In my own words* stays the person's words: shown back in quote marks beside each option's facts, never turned
into a measure by the model (that was K8 option B, not picked) and never used to sort
([CLAUDE.md:44-46](../../CLAUDE.md)); the card then says *"DotAmi has nothing it can count for that yet. Here
is what each option holds."* A holding-company chip waits for a cited step (§ 14). The same pattern serves any
criterion the person hasn't defined ("best for me", "easiest to undo", "keeps me flexible"): the Lens asks; it
never picks a meaning.

**5.4 Questions DotAmi can't answer.** *"Which will make me the most money?"* gets: *"That needs a forecast
of your income, which DotAmi doesn't make. Your accountant can work through it with your own numbers. Here is
what each ending costs to start, on what is priced."* *"How long will it take me?"* gets: *"DotAmi doesn't give
timelines or dates. Here are the steps on your road, with the official times each one states."* Places to ask
come from S2.5.22's *Where to ask*.

**5.5 Examples of questions, by how they're handled.** Every question falls into one of three kinds of
handling: answerable from facts, needs the person's meaning first, or can't answer. Those three kinds, the
clarifying chips and the refusal lines are held as data in `lib/lens/question-kinds.ts`. That file is **not** a
list of questions, and the Lens isn't limited to the ones below, which are examples:

| For example, the person asks | Kind | How it's handled |
|---|---|---|
| What's next on my road? · What does this step need? · Where does this rule come from? · What's this line of work about? | Answerable now | The steps and their *done when* lines; the cited quote; job facts from the kit (§ 5.6) |
| Least cash up front · fewest steps left · fewest new skills · most unknowns · most official fees | Answerable now | Card as in § 5.1 |
| What do I need before I start? · What do I lose by picking X? · Can I switch later? | Answerable now | Needs and done-when lines; Compare's *not on path* row; steps reachable through `next` and joins |
| What if I fail an exam? | Answerable now | The cited rewrite fee, which applies only on a condition and so never counts in a total ([official-fees.ts:153-156](../../lib/engines/fees/v2026/official-fees.ts)) |
| Does my savings cover it? | Answerable now | Savings minus what's priced, with the not-priced count; never "enough" |
| What's due after I hire or register? · Which gets me certified soonest? | Answerable once times are typed (K9 A) | Deadlines and official hours by kind, shown side by side, not ordered (§ 5.2) |
| Works part-time | Needs the person's own hours | Part-time counting quoted from its cited line (:588-592) |
| Strongest foundation · least paperwork · easiest to undo · keeps me flexible · side hustle | Needs the person's meaning first | The question in § 5.3 |
| Cheapest way to get the machines | Needs the person's count of rent periods | *your $[400] × your [6]*, before tax; under K7 A ordered only when asked in the Lens, the ways screen stays unsorted |
| Which pays more? | Published figure (kit call K5 B, picked 2026-10-16) | Published wage range for the job picked, with its geography level and source code shown (*"Alberta-wide figure shown for Calgary"*, *"small-area estimate"*), labelled "what workers in this job earned, not what you would earn"; never sorted; never shown on the *Open your own shop* ending. Road 1 leaves wage figures out on purpose today ([apprentice-to-own-shop-ab.ts:17](../../lib/engines/roads/v2026/apprentice-to-own-shop-ab.ts)), so this changes that, under K5 B |
| Better prospects / more demand? | Can't answer | Outlook ratings were kit call K5 C, not picked on 2026-10-16; the fixed can't-answer card, with the wage range for the job picked (K5 B) as the nearest fact DotAmi holds |
| Most competitors? | Count only (S2.5.23) | Official business counts for the area, with their limits; never "crowded" |
| Which grants can I get? | List only | Program list with links; no matching, since no eligibility data exists [G1] |
| How long will it take me? · When will I be done? | Can't answer | No timeline or date; the steps, with the official times each states (§ 5.4) |
| Which will succeed · most money long-term · fastest to first sale · least risk · most tax-efficient · am I allowed · what would my accountant say | Can't answer | Fixed refusal card, the nearest fact DotAmi holds, questions to take to the accountant or lawyer, *Where to ask* |

**5.6 Steps, not timelines.** Asked "how do I get there?" or "what do I do next?", the Lens lists the road's
steps from *Next on your road*, each with its *done when* lines and its source: the same shape as a story and
its tasks, as his K9 note asks. For a step done on a computer (looking up an official page, filling in an
online form, keeping records in the app), the Lens can help with it using its planned powers
([use-cases.md:36-46](use-cases.md)), at the permission level the person set for that idea, with each powerful
action off until the person turns it on after a plain warning ([CLAUDE.md:218-222](../../CLAUDE.md)). It can't
go to school, make a phone call or do the work of starting or running the business, and says so in a fixed
line. It never says how long a step will take the person. This story builds the read side only; acting belongs
to the Lens [9d], permission levels [9f] and the Lens powers that follow them
([use-cases.md](use-cases.md), *Build order*). No step says today whether it is done on a computer (§ 14).

## 6. How it's built

### 6.1 Read tools (the kit's S2.5.25k plus two): the core

The Lens knows only what these return. The kit already plans `road_view`, `list_options`, `reachable`,
`job_facts` and `industry_counts`; they answer most questions. This story adds two for when the person asks
for options in order: `compare_options(ventureId, optionSetId, measure)` and `list_measures()` (§ 6.3). All are
read-only, served in-process to the Lens and through DotAmi's MCP server to the person's own agent, and every
value returns with its source object. There is **no "which is best" tool**, by design. Through the MCP server
they answer an outside agent only for ventures where the person set the permission level to Read or higher
([use-cases.md](use-cases.md), *Permission levels*); with no level set, they return nothing. The readout grows
to cover written roads, and its :112 note is restated for the Lens, which is inside DotAmi.

### 6.2 Typed official time (kit task S2.5.25j, K9 A)

`RoadStep.time` entries carry a kind (designed length · required work · minimum experience · must finish
within · deadline after an event), an amount and unit, `approximate` (true when the source says "about"), the
source's own words, and a citation. `validate.ts` refuses an amount not found in that citation's checked
quote, the rule fees already follow. For road 1 the source is Tradesecrets profile 0361, which states 1360
hours of work experience and 8 weeks of classroom per period, and the Trades Qualifier route as "72 months and
8160 hours of verifiable Cabinetmaker work experience" [T1]. That profile is a web page with no download or API
seen, so each trade's times are per-trade content gathered by the kit. This story builds no second time field.
Times are shown per step, as the official page states them; the Lens never turns them into a timeline or a
date, and never adds them together until the open question in § 14 is answered.

### 6.3 One of the read tools: putting options in order (code, no model)

Used only when a question asks for an order. It is one capability among the read tools, not the centre of the
Lens.

- `lib/cockpit/measures.ts` (new): a closed list of measures, each with a plain label, a unit (cents, count,
  yes/no, hours by kind), the direction the person picks, and the road-evaluation field it reads:
  money to start, paid as you go (after S2.5.22), official fees, your numbers, not priced, steps left, skills
  not marked *have*, legal requirements, reaches a step, owned lines, carried skills, linked ideas; official
  time by kind joins the list only if the § 14 question on adding times is answered yes. **No "best"
  measure, and no way to combine two.** No measure reads the structure ladder's uncited `transitionTrigger`
  strings.
- `lib/cockpit/compare.ts` (new, pure, beside `compareEndings`): `compareOptions(input, optionSet, measure)`
  runs road evaluation once per option and returns, per option, the value, its parts each with a source
  (official fee · your quote · named, not priced · catalog citation · your statement), and an `incomplete`
  count; plus the order (ties keep road order), the frame words' ids, and `comparable: false` when values are
  of different kinds. The purity test of evaluate-road.ts:31-40 applies to it.
- **Option sets:** fork sides (exist); saved futures; an `alternatives` group on a column, set on road 1's
  training column, with the validator checking every member sits in that column; ways on one cost line
  (after S2.5.22).
- **Where an order may appear (K7 A):** in the Lens, and on the screens decision 3 names (Your futures, Compare
  the two endings, the training routes), always with the frame and the blank counts. Ways on one cost line
  stay unsorted on screen and are sorted only when the person asks the Lens, before tax only.

### 6.4 How the Lens knows: four guarantees

1. **Every number comes from code.** The model picks which read tool to call and with what, calls it, and
   writes words around the result. DotAmi draws every number, card and list from the tool result. The model
   never adds, subtracts or compares amounts.
2. **Every fact carries its citation.** Official fees and times show their checked source; the person's
   numbers show where they came from; blanks show as counts.
3. **Undefined criteria get questions with buttons.** Clarifying questions follow S2.5.21g ("ask clarifying
   questions until the user is confident"): the Lens keeps asking until the person confirms the reading. Each
   question is a catalog entry with chips (`lib/lens/question-kinds.ts`), not free text, so a test can check
   that no card is shown before the reading is confirmed.
4. **Advice, forecasts and timelines get a fixed refusal** (§ 5.4) from the same catalog, never improvised.

**A pick is a control, not a statement.** A chip pick or a *Sort by* pick sets the order of that one answer.
It is never stored as a statement about the person and never reused to order a later answer
([CLAUDE.md:44-46](../../CLAUDE.md)); each new ordered answer asks again or shows *"Sorted by <last pick> ·
Change"*.

**The reply guard** (`lib/lens/guard.ts`, code, not a prompt; Lens call 2, answered A): before any Lens reply
is shown, it fails the reply if the model's own text contains any of these outside the card and outside a
quote of the person's message:
- a digit;
- a number word (zero to ninety, hundred, thousand, million, half, double, twice, triple, percent);
- a comparative or superlative, from a closed list in the words file, for example *less, least, more, most,
  lower, higher, cheap\*, expensive, quick\*, slow\*, soon\*, save\*, afford\*, fast\*, strong\*, weak\**;
- anything in `VERDICT_WORDS` or `VERDICT_PHRASES`.

A failed reply is replaced by the card with a fixed sentence. This is stricter and simpler than matching each
number against tool output (call 2's option B). Because the model can write no digit or number word, it also
can't write a timeline or a date.

### 6.5 Evaluation tests

- **A varied question set** in the [9c] Lens test set, run on invented roads with known answers (no real
  figures). The prompts are examples of what people may ask, not a target the Lens is tuned to. Each case
  states the expected tool, measure (if any), order (if any), gap count and sources:

| Prompt on the invented road | Expected |
|---|---|
| "what's next on my road?" | The next undone steps with their *done when* lines and sources; no times added, no dates |
| "where does this fee come from?" | The fee's checked quote and link |
| "what's the cheapest?" (all lines priced) | Money-to-start card, order by cents, each fee's citation listed |
| "what's the cheapest?" (gaps) | Same card, "N lines aren't priced", "this order can change", a fix-it button per blank |
| "what's the fastest?" (no typed times) | "No official time for N steps", cited prose side by side, no order |
| "what's the fastest?" (mixed kinds) | One column per kind; no order (§ 14) |
| "how long will it take me?" | The can't-answer card with the steps; no timeline, no date |
| "which is strongest for building other businesses?" | The question in § 5.3, no card, no order |
| "which will make me the most money?" | The can't-answer card |
| "is my savings enough?" | Savings minus what's priced, with the not-priced count; the word *enough* never shown |
| A question about something DotAmi holds no fact on | "DotAmi has nothing on that yet", the nearest facts it does hold; no model-made fact |

- **Uncited-number controls:** tests inject into a model reply "$12,000", "twelve thousand dollars", "about
  half as much", "costs less", "the cheapest is", "in about six months" and a model-made sum; the guard must
  block each.
- **Code tests:** purity of `compareOptions`; blanks never total $0; no combined measure in the list; the
  function rejects a list of measures; a typed time whose amount is missing from its quote fails validation;
  the apprenticeship's required-work hours and the TQ's minimum-experience hours come back `comparable: false`;
  a second ordered answer in the same conversation does not silently inherit the earlier measure.
- **Browser tests:** the *Sort by* screen joins `e2e/no-verdict.spec.ts` and `e2e/journey.spec.ts`.
- **MCP test:** every read tool, `compare_options` included, returns nothing for a venture with no permission
  level set.

## 7. One kit, every job

Nothing here knows about cabinetmaking, and nothing here is shaped around particular questions. An answer
works on any road whose steps carry typed fees, named cost lines and typed times. The research kit's output for
a new job is catalog entries checked by the same validators, not new Lens code or a per-job prompt, which is
the maintainer's "library, or script" point applied to this story.

## 8. What's stored and what leaves the computer

- **Kept:** nothing new by default. The *Sort by* pick is page state only, forgotten when the page closes.
  Chip answers are controls for one answer (§ 6.4); the Lens conversation itself is already planned as kept
  per venture and clearable ([use-cases.md](use-cases.md)). Typed times are catalog code. Numbers agreed
  through the fix-it buttons use the existing figures store and its inventory lines. The card's fold joins the
  existing `dotami-cockpit-folds` entry ([lib/cockpit/folds.ts:27](../../lib/cockpit/folds.ts)), with that
  inventory entry updated.
- **Leaves the computer:** with no Lens, nothing. With the Lens on a hosted model, the person's question and
  the tool results (steps, option labels, agreed amounts, counts, skill marks) go to the model company they
  chose; a model on their own computer sends nothing. Through the MCP server, what the person's own agent reads
  goes to that agent's model company, and only for ventures set to Read or higher.
- **Privacy inventory** (`lib/privacy/inventory.ts`): a `SENT_ELSEWHERE` entry for Lens answers (unless
  [9d]'s own entry already names tool results) and a line on the MCP server entry for the new tools.
- **Privacy log lines** (`docs/privacy-log.md`, [Unreleased]):
  1. *"Added: Sort by one thing you choose. Your pick isn't kept and nothing is sent."*
  2. *"Ships: official times for steps (periods, hours, weeks, months), each from its official page."*
  3. *"Added: the Lens can answer your questions from DotAmi's facts. It reads your road, your agreed numbers
     and your skill marks through DotAmi's own tools and sends them, with your question, to the model you
     chose. A model on your own computer sends nothing."*
  4. *"Added: DotAmi's agent connection can list and compare your options for ideas you've allowed it to
     read; what your agent reads goes to your agent's model company."*

## 9. Rules check (`CLAUDE.md`)

| Rule | How this design meets it |
|---|---|
| Never a verdict; no ranking by what DotAmi thinks matters (:22-24) | The person names the measure or picks a chip; one measure at a time; the frame on every order; no combined measure; the model writes no numbers or comparison words |
| Rules decide; models explain at most; Lens never changes a catalog (:25-30) | Every number from code; `compareOptions` is pure; tools are read-only; the model picks tools and maps words, shown with Change |
| Every claim cited (:31-40) | Every value carries its source; typed times refused unless the amount is in the quote |
| Not legal or tax advice (:41-43) | Can't-answer card plus *Where to ask*; "am I allowed" is never answered; ordered money answers are before tax |
| The person's words stay theirs (:44-46) | Question quoted back; *In my own words* never becomes a measure or sorts anything; a pick is never kept as a statement |
| Numbers the engine reasons about are typed (:196) | Prose times become typed fields before anything reads them as numbers |
| Never derive a fact about the person (:199) | Scope comes from the screen; meanings from the person's pick; hours already worked are asked, never assumed |
| Never invent a number (:200) | No timelines, dates or forecasts; times never added until § 14 is answered; approximate times never summed; blanks counted, never $0; no after-tax figures |
| Powerful Lens actions off until turned on (:218-222) | This story is read-only; help with computer steps (§ 5.6) uses the Lens's own switches and permission levels, adds no new power |
| Privacy inventory and log | § 8 |
| Value over more safety settings | No new setting or warning; the screen sort works with no model |

**Where the ask and the rules collided, and how his answers settle it (2026-10-16):** "strongest" as DotAmi's
own judgement vs :22-24 is settled by K8 A (the person's meaning, or a countable chip they pick). "Fastest" as
a sum of official times vs future-cockpit.md:830-831 and :1733 is settled by K9 A and his note: no timelines,
official times shown per step as facts; whether times may be added within one kind is still open (§ 14).
"Cheapest" between buy and rent vs PR #175's earlier "never says which costs less" is resolved in the reworked
#175 (other-ways-to-build.md § 2, § 4.10) and by K7 A. Recommending to the maintainer is fine; the product
never recommends.

## 10. Calls for the maintainer (answered 2026-10-16)

**Settled in the research kit, asked once there:** [research-kit.md](research-kit.md) § 10.
- **K7 (sort by your measure).** Answered 2026-10-16 (the maintainer): A, "In the Lens and on the screens
  decision 3 names (Your futures, Compare, the training routes), always with the frame and blank counts; ways
  rows stay unsorted on screen and are sorted only when asked in the Lens, before tax". This story's *Sort by*
  control and the Lens card both ship (§ 6.3).
- **K8 (a criterion the person hasn't defined, for example "strongest foundation").** Answered 2026-10-16 (the
  maintainer): A, "The Lens asks what the person means: their own words first, then things DotAmi can count,
  alphabetical; each picked measure its own row, never combined". § 5.3 as drawn; the Lens does not map the
  person's words to a measure (that was B).
- **K9 (typed official times).** Answered 2026-10-16 (the maintainer): A, "Typed, cited times with five kinds
  kept apart and an 'approximate' flag, summed only within one kind", with his note: *"it shouldn't even give
  you a timeline for any of this. It should generally help you pick up the pace for anything done online
  because it should be able to help you with things done on a computer, but it can't do schooling, or phone
  calls, or the actual work required to start or maintain a business. It should just provide steps; VERY
  similar to how you and I are working with stories and tasks."* The main session reads it as: no timelines or
  date forecasts ever; per-step official times shown as facts; whether times may be added within one kind is
  one open question for him (§ 14). § 5.2, § 5.6 and § 6.2 follow that reading.

**Asked here.** Full options, costs and risks are in the calls list that ships with this doc.

1. **An order when lines aren't priced** (the example was "cheapest"). A order on what's priced, gaps counted
   · B no order until all priced · C A plus a fix-it button per blank that opens the agree prompt.
   Answered 2026-10-16 (the maintainer): C.
2. **How a Lens answer is drawn.** A DotAmi's card; model text with no digits, number words or comparison
   words · B card plus model numbers matched to tool output · C model writes it all under the guard.
   Answered 2026-10-16 (the maintainer): A. This design applies the guard to every Lens reply, as § 6.4
   already did on 2026-10-15; whether that fits the Lens's help with steps done on a computer (§ 5.6) is open
   (§ 14).
3. **Numbers from outside tools, or from DotAmi's own built sources, in an ordered answer.** A published prices
   enter only once the person agrees them as their own number, and only from pages the registry allows the
   Lens to read; DotAmi-built data enters only as typed, cited catalog entries; vendor estimates never sort and
   are shown beside the card · B nothing from outside sorts · C live and unstored inside the sort.
   Answered 2026-10-16 (the maintainer): A.
4. **Build before the Lens exists?** A screen *Sort by* and MCP tool now, Lens chat when [9d] lands · B
   screen only now · C wait for the Lens. Answered 2026-10-16 (the maintainer): A.

## 11. Tasks

| Id | Title | Done when | Days | Calls |
|---|---|---|---|---|
| S2.5.24b | Record the sorting rule | CLAUDE.md, future-cockpit.md decision 3 and § 4, readout :112 say DotAmi sorts only by the person's one measure, said on screen; done with kit S2.5.25r | 0.5 | K7, K8 |
| S2.5.24c | Measures and `compareOptions` | `measures.ts`, `compare.ts`; purity test; no-best and no-combining tests; blanks never $0; ties keep road order; `comparable:false` on mixed kinds; no measure reads `transitionTrigger`; no time measure until § 14's question is answered | 2.5 | K7, 1 |
| S2.5.24d | Option sets | Fork sides, saved futures, `alternatives` group on road 1's training column; validator checks membership | 1.5 | K7 |
| S2.5.24e | Comparative and superlative words | A closed list of comparative and superlative words (for example *cheapest, faster, lowest, sooner, costs less*) added to the verdict words, allowed only inside the frame; frame lines in the words file; a test injects a bare "X is cheapest" and must fail | 0.5 | K7, 2 |
| S2.5.24f | *Sort by one thing you choose* screen | On Your futures, Compare and the alternatives column; frame and blank-count lines always shown; fix-it buttons open the agree prompt; pick not kept; phone width; ui-spec; browser test; no-verdict and journey walks | 3 | K7, 1, 4 |
| S2.5.24h | `compare_options` and `list_measures` | Added to the kit's read tools (S2.5.25k) and the MCP plan; frame words in every result; nothing returned below Read level; test that no "best" tool or write exists; inventory and log lines | 1 | K7, 4 |
| S2.5.24i | Answer kinds catalog | `lib/lens/question-kinds.ts`: the three kinds of handling (answerable from facts, needs the person's meaning, can't answer), not a list of questions; chips with their counts, own words first, chips alphabetical; refusal lines for advice, forecasts and timelines, pointing to *Where to ask*; the "can't do schooling, phone calls or the work itself" line; no card before the reading is confirmed | 1.5 | K8, K9 |
| S2.5.24j | Lens answer turn (after [9d]) | The Lens answers from any read tool; every number drawn by DotAmi; steps with *done when* lines for "how do I get there", never a timeline; *I read that as* with Change for ordered answers; questions for undefined criteria; refusal card; picks never stored as statements; `SENT_ELSEWHERE` entry and log line | 3 | K8, K9, 2 |
| S2.5.24k | Reply guard | `lib/lens/guard.ts` blocks digits, number words, comparatives and verdict words outside the card on every Lens reply; control tests with "$12,000", "twelve thousand dollars", "about half as much", "costs less", "the cheapest is", "in about six months" and a model-made sum | 1.5 | 2 |
| S2.5.24l | Question set in [9c] | The § 6.5 varied question set with expected answers runs in the scorer, covering plain facts, steps, ordered answers, undefined criteria and refusals | 1 | K8, K9, 2 |
| S2.5.24m | Outside numbers only once agreed | Code rule and test: an unagreed or estimate-labelled number never reaches `compareOptions`; a page the registry marks `never-automated` is never read, the link offered instead | 0.5 | 3 |

**What changed on 2026-10-16** (after his clarification that the three questions are examples): the story is
retitled "The Lens answers a person's questions from DotAmi's facts". Ids are kept where the meaning survives.
24b "Record the comparison rule" is now "Record the sorting rule" (same work). 24e was a fixed list of words
from the three examples; it is now a closed list of comparative and superlative words. 24i "Question kinds
catalog" is now "Answer kinds catalog": three kinds of handling, explicitly not a list of questions, with
refusal lines for timelines (K9 note). 24j "Lens comparison turn" is now "Lens answer turn": any read tool,
steps not timelines. 24l "Comparison prompts in [9c]" is now "Question set in [9c]", varied and illustrative.
24c gains "no time measure until § 14 is answered". Day estimates are kept from 2026-10-15; the reframe changes
what the Lens turn and the test set cover, not the code parts, and was not re-estimated.

S2.5.24g (change PR #175's "never says which costs less") was dropped: the reworked other-ways-to-build.md
already says it. About 10.5 days can be built before the Lens (24b–24i), and about 6 after it (24j–24m): about
16.5 days in all. The typed time field (S2.5.25j, 2.5 days) and the base read tools (S2.5.25k, 2 days) are
counted in the research kit, not here.

## 12. Not in scope

A combined score, weighting or "overall" order · timelines, dates, or how long anything will take the person ·
forecasts of income, sales, time to first sale, success or risk · after-tax comparisons · ranking grants or
permits per person · comparing sellers' prices (marketplace scope guard) · ESDC's outlook ratings and
national job-openings projections [W3] (kit call K5 C, not picked on 2026-10-16) · producing content for other jobs
(S2.5.25) · ads, named competitors and counts (S2.5.23; named businesses and ad spend beyond v1 are on hold
until research story S2.5.26) · acting on the person's behalf (the Lens [9d], permission levels [9f] and the
Lens powers) · provinces other than Alberta.

**Future note (no task list yet):** kit call K6 option C, the Lens drafting a personal road for a person, which
the maintainer asked to keep for a future build ("that's what will make dotami EXPLODE later on"; his full note
is in [research-kit.md](research-kit.md), K6). It would sit on these read tools and the same guard.

## 13. Honest limits

- The Lens can only answer from what its read tools return. Where DotAmi holds no fact, it says so.
- An ordered money answer on a real person's road is usually partial; the order is "on what is priced" and can
  flip.
- Time questions get official times by kind, never a timeline, and no order until § 14 is answered. Most steps
  (register a name, open a shop) have no official time, and no official processing times were found on disk.
- An answer to an undefined criterion is only as good as the proxy the person picks; no road has a
  holding-company step to count.
- The model can misread a question; its reading is shown with Change and measured by the test set.
- Through the MCP server DotAmi controls the data and frame words, not what the person's own agent says.
- Outside tools rarely fit a kept answer: Google's Places API allows keeping only the place ID indefinitely,
  and latitude and longitude for up to 30 days; other content may not be cached or stored [M1][M3]. Yelp says
  commercial analysis is not permitted for Places integrations and points to a separate Insights API [Y1].
  Semrush results may not be cached past one month [S1]. Similarweb calls its figures estimations [S2].
  Google's Maps Grounding Lite says Maps content must not be cached by, stored by or used to improve the
  model [M2].

## 14. Open questions (never stated as fact)

1. **Adding times within one kind.** K9 A says "summed only within one kind"; his note says "it shouldn't even
   give you a timeline for any of this". The main session reads it as no timelines ever, and keeps adding times
   within one kind (and so ordering options by a kind of time) as one open question for the maintainer, asked
   in the research kit ([research-kit.md](research-kit.md), K9). Until he answers, times are shown per step,
   never added or ordered.
2. Which official pages publish processing times (Alberta registry, Canada Revenue Agency business number,
   apprenticeship application)?
3. Which steps are done on a computer: no road step says so today. Whether to type it, and how the Lens offers
   help on such a step, belongs to [9d] and the Lens powers (§ 5.6).
4. A holding-company chip: it becomes countable only once a road step or structure entry with a checked
   citation exists; the structure ladder's holding-company lines carry no citation of their own today.
5. Whether Red Seal portability can be a counted "foundation" chip.
6. The geography level behind each wage row (economic region or province) before any wage row ships (kit K5 B, picked
   2026-10-16: each row labelled with its real geography level).
7. Whether road 1's training column should become a real fork instead of an alternatives group.
8. How well a small local model picks the right read tool and measure; measured by S2.5.24l, not assumed.
9. Whether the reply guard's no-digit, no-number-word rule should cover every Lens reply, including help with
   steps done on a computer (§ 5.6), or only answers that draw a card. His call 2 answer (A) was given while
   this design was about ordered answers.

## 15. Sources (all seen 2026-10-15)

- [T1] Alberta Tradesecrets, Cabinetmaker profile 0361: https://tradesecrets.alberta.ca/trades-in-alberta/profiles/0361
- [W1] ESDC, Wages open dataset (NOC × province × economic region; Open Government Licence – Canada): https://open.canada.ca/data/dataset/adad580f-76b0-4502-bd05-20c125de9116
- [W2] Job Bank, Terms of Use – Job seekers: https://www.jobbank.gc.ca/termsofuseseeker
- [W3] ESDC, Canadian Occupational Projection System 2024-2033 summary: https://open.canada.ca/data/dataset/e80851b8-de68-43bd-a85c-c72e1b3a3890
- [G1] Business Benefits Finder dataset: https://open.canada.ca/data/dataset/4e75337e-70d0-4ed7-92d1-3b85192ec6b1
- [P1] BizPaL FAQ: https://bizpal.ca/faq/ · [P2] BizPaL Terms and conditions: https://bizpal.ca/disclaimers/
- [M1] Google, Places API policies: https://developers.google.com/maps/documentation/places/web-service/policies
- [M2] Google, Maps Grounding Lite: https://developers.google.com/maps/ai/grounding-lite
- [M3] Google Maps Platform Service Specific Terms (clause 14.3): https://cloud.google.com/maps-platform/terms/maps-service-terms
- [Y1] Yelp Places API FAQ: https://docs.developer.yelp.com/docs/fusion-faq
- [S1] Semrush API usage restrictions: https://developer.semrush.com/api/introduction/api-usage-restrictions
- [S2] Similarweb Data Methodology: https://support.similarweb.com/hc/en-us/articles/360001631538-Similarweb-Data-Methodology
