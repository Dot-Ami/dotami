# What's closest to your work? (step 1 of 3)

Page: Pick a future (`/futures`), and the intake's last screen on the typed way (`/intake`) · Component:
one shared component for the three steps, `components/front-door/job-and-road-steps.tsx` (planned; words:
`lib/front-door/words.ts` `jobStepWords`; search: `lib/engines/oasis/v2026/index.ts` `searchOasisJobs`,
extended, not a second picker)
Type: wizard step (search box, grouped result list, skip)

Last updated: 2026-10-20 (designed before it is built, task 28g, for tasks 28b and 28f; nothing here is built
yet. The maintainer's picks of 2026-10-20 it follows: the government's example titles are searched, results
grouped by how many of the person's words a job matches, each group labelled and in the government's code order
inside; DotAmi may add a short word list of its own, shown on screen as DotAmi's and never as the
government's, the list a plain file the maintainer approves; the build may download the OaSIS 2025 "Example
Titles" file, pinned by checksum. Research: `28f-job-title-matching.md`, option 1 with rule H. Of 2026-10-21,
call 1: the typed way ends on the same three steps.)

Mockup: `C:\dotami-wt\designs-phase2\01-whats-closest-to-your-work.html` (outside the repo; laptop width,
then phone width).

> **Built 2026-10-22 (task 28b).** As designed, in `components/front-door/job-and-road-steps.tsx` and
> `job-search.tsx`, on Pick a future, the intake's typed way and the cockpit's skills list; the search runs on
> DotAmi's own server (`POST /api/jobs/search`). What differs or was added is listed in
> [_index.md](./_index.md), *As built, 2026-10-22*.
>
> **Only left-out words, as built (PR #202 review).** The table below says this state shows "the no-match
> line". Filled with the left-out words, that line would say *No government example title holds any of these
> words: “my”, “own”, “shop”*, which is false (*barber shop manager* holds *shop*), and with no words it reads
> badly. So this state's status line is its own (`nothingSearched`): *Nothing was searched, so no job is listed.
> Try a word for the work itself, or skip this question.*, with *Not searched: …* above it as designed, and
> without the English-only line (nothing was looked for, so there is no miss to explain). The no-match line now
> only ever names words that were searched. The lines live in `lib/front-door/job-search-lines.ts`.
>
> **Whole words first, as built 2026-10-23 (the maintainer's call a-call-11; research lane "search gap",
> option b).** Rules 5, 6 and 7 below are amended so: inside each group about the government's titles, the jobs
> whose title holds the person's exact words come first, under the part heading *One of their titles has your
> exact words, n* (one title holding every word the group counts, word for word); the jobs that reach the count
> only through a word that starts like one of theirs come after, under *Their titles have a word that starts
> like yours, n*. (First built as *Their titles have your exact word*; reworded in the #206 review, because a
> job in the second part can still hold one of the words exactly, in a different title from the other, and the
> old label was true of it too: *registered nurse* puts General duty registered nurses second.) Each part is in the government's code order and lists
> its first 50. The closest group opens whole, both parts together. In the exact-word part, the title named
> under a job is the first holding the words word for word (*plumbing* names *plumbing installer*, before
> *plumber apprentice*). A group with both parts says *Your exact words first, then words that start like
> yours, each part in the government's code order. Not ranked.* in place of *In the government's code order,
> not ranked.*, and a part past 50 says *Showing the first 50 of n in this part, …*. The word-list group has no
> parts. Nothing is scored: the part is a plain fact about the match. On the 220 corpus ideas that name a job:
> 152 find it in the open group (was 150), 181 anywhere listed (was 172), 121 within the open view's first 10
> rows (was 112); no idea that was listed drops out (`tests/job-title-search.spec.ts`). The screen's clutter
> count, taken as the step opens with nothing typed, doesn't change.

## Where it sits, on both ways in

The three steps are one flow, asked **before any road is drawn**, so the road match (step 3) can use the pick:

1. **What's closest to your work?** (this file)
2. **Where you are** ([02-where-you-are.md](./02-where-you-are.md)): the area, then the region. Asked only
   after a job is picked.
3. **Pick a future** ([03-road-match.md](./03-road-match.md)): the roads, with the one written for the picked
   job first, or an honest *No road is written for this job yet*.

| Way in | Today (main `09c0080`) | With this design |
|---|---|---|
| *Start from where I want to be* → *Your destination* → **Pick a future →** | `/futures` shows the cards at once; the job is never asked there (future-cockpit.md:221-222) | `/futures` opens on step 1. The cards are step 3 |
| *I already have an idea* → the intake → Screen B **Open my map →** | Saves the idea and opens the cockpit on road 0 with no road picked and no job asked (roadForFuture's silent default, `lib/futures/types.ts:39-42`) | Screen B's button becomes **Next: the work closest to yours →**, which shows the same three steps on the intake page, in place of its screen (the live preview rail is put away for them: it previews the intake's answers, and these steps are about the road). All three steps sit inside the intake's own `intake` region, so the intake's limit of 4 regions and 5 controls holds for each (counted in each step's file). The idea is saved at step 3's **Look inside**, with the road the person opened |
| The cockpit's skills list (**Pick a job**, `components/cockpit/gauge-panels.tsx` JobSection) | Searches job names and codes only | Stays, as the way to change the pick later; it runs the same search as step 1, with the same words, so there is still one picker |

**Decided 2026-10-21 (the maintainer, call 1, "same-steps"):** *I already have an idea* ends on the same three
steps (your work, where you are, the road) instead of opening the map, as the table above designs. The
alternative, opening the map and asking the job later from the cockpit, was not picked.

On the typed way the person's own first sentence shows above the box, word for word (*Your idea, in your
words: “…”*), so they can see what they wrote. It is **not** searched by itself: the box starts empty on both
ways in, and nothing is picked until the person clicks a job.

## What it is

The page's step region (the same block that holds the cards today, so no region is added), holding:

1. Kicker *1 of 3 · Your work* and the heading *What's closest to your work?*
2. A lead line saying what the search looks at and that nothing is picked without a click.
3. One search box, **The work, in your own words**, with its hint. Results update as the person types (a
   short pause after the last key), so there is no Search button.
4. **Skip this question**, with a line saying what skipping does.
5. The results, in groups (below), or the empty state, or the no-match state.
6. The source line for the titles and the line saying the typed words aren't kept.

## How the search works (rule H of research 28f, with the maintainer's picks)

1. The person's words are split into words. Words on DotAmi's **filler list** (*my*, *own*, *the*, *start*…)
   and on its **business-word list** (*shop*, *studio*, *company*, *clinic*, *practice*…) are left out, and the
   screen says which were left out and why (*Not searched: …*). Both lists are a plain words file the
   maintainer approves in the pull request that adds it (28b).
2. Each remaining word is looked for in the government's example titles (OaSIS 2025 "Example Titles", all
   three title types, Example, Index and Inclusion, keyed to the 7-character OaSIS codes DotAmi already uses)
   and in the job names. A word matches a title word when they share their first five letters, or the
   whole of the shorter word (*plumbing* finds *plumber*).
3. A word that is on **DotAmi's own word list** (*dayhome* → *home child care provider*; *food truck* →
   *cook*; *ride-share* → *taxi driver*; *salon* → *hairstylist*, the maintainer's example; each line the
   maintainer approves) is also looked for under DotAmi's word. **The government's titles come first, per
   job and per word:** where a job's own titles hold the word, that is the match, DotAmi's list isn't used for
   that word on that job, and no list mark shows. Only where none of a job's titles holds the word can the
   list find the job, and then it is marked: the chip *DotAmi's word list* and the line *Your word “dayhome”
   was matched through DotAmi's own word list (“home child care provider”), not by a government title.* (So a
   list line can sit unused for some jobs: the NOC 2021 elements file's group 63210 already lists *beauty
   salon operator*, copy of 2026-10-15, so where the OaSIS file's titles for Hairstylists hold *salon* too,
   *salon* finds Hairstylists through the government's title and the list line never shows there.)
4. Each job is counted by how many of the person's searched words **its government titles** hold, and put
   in one group, so every group heading is a true statement about the government's titles:
   - **all your words** (*your word* when one word was searched);
   - **all but one of your words** (only when three or more words were searched);
   - **at least one of your words** (every other job whose titles hold one or more);
   - **found only through DotAmi's word list**: a job whose titles hold none of the words, reached only
     through a line of DotAmi's list. Its own group, last, headed as DotAmi's, never under a heading about the
     government's titles.

   A word a job matched only through DotAmi's list doesn't count toward that job's group: a job whose titles
   hold one of two words, and whose other word came through the list, sits under *at least one of your
   words*, with the list's chip and line saying where the other word was matched.
5. Inside a group, jobs are in the government's code order. Nothing is scored. The group is a plain count
   of the person's own words, said on screen, never DotAmi's view of which job fits. **Amended 2026-10-23
   (a-call-11, whole words first):** inside each group about the government's titles, two labelled parts,
   the exact word first, the word start after, code order inside each (see the note at the top).
6. **Which groups are open.** The first group that holds any job is shown open (since 2026-10-23, whole: both
   its parts); each later group is one
   button, *Show the n jobs whose example titles have …*, which opens it in place (and **Hide these n jobs**
   folds it again). This is rule H's own view (look further only when the closer group is empty), with the
   rest one click away rather than hidden.
7. At most 50 jobs are listed per group (the app's own measure, `tests/helpers/idea-coverage-report.ts:85`),
   with *Showing the first 50 of n in this group, in code order. Add a word to narrow it.* when there are
   more.

Each job in a list is one button: its name and code (*Barbers · 63210.02*), and under it, in the mono label
type, *Matched the government's example title “barber”* (and *and n more of its titles* when several hold
the words; the first in the file's order is the one named). Clicking it picks the job: the step closes and
step 2 opens with *Your pick of job: Barbers · 63210.02* at its top. The pick is tagged *your pick of job*
wherever it shows, as today (`lib/cockpit/words.ts` `lists.job.tag`).

**Nothing derived.** The search never picks, pre-selects, highlights or orders a job by anything but the
count of the person's words and the government's code. A job with one result is still a button the person
clicks. The typed way's sentence is never searched without the person typing.

## Words (as they would sit in `lib/front-door/words.ts`)

```words
jobStepWords = {
  stepCount: "1 of 3 · Your work",
  heading: "What's closest to your work?",
  lead: "Type the work in your own words. DotAmi looks for them in the government's example job titles and lists the jobs that hold them. Nothing is picked until you click a job.",
  yourIdea: "Your idea, in your words: “<first sentence>”",
  boxLabel: "The work, in your own words",
  boxHint: "A word or two works, such as “barber” or “cake decorating”.",
  skip: "Skip this question",
  skipHint: "Skipping picks no job. The futures are then listed with no job to match them to.",
  empty: "Type a word or two about the work. The jobs whose titles hold your words show here.",
  tooShort: "Type at least 3 letters.",
  status: "<n> jobs hold your words: <a> all of them, <b> all but one, <c> at least one.",
  statusWithList: "<n> jobs found: <a> whose titles hold all your words, <b> all but one, <c> at least one, and <d> only through DotAmi's word list.",
  groupAll: "Jobs whose example titles have all your words",
  groupOne: "Jobs whose example titles have your word",
  groupAllButOne: "Jobs whose example titles have all but one of your words",
  groupSome: "Jobs whose example titles have at least one of your words",
  groupList: "Jobs found only through DotAmi's word list, not by a government title",
  groupOrder: "In the government's code order, not ranked.",
  // Added 2026-10-23 (a-call-11, whole words first)
  partExact: "One of their titles has your exact words",
  partWordStart: "Their titles have a word that starts like yours",
  partsOrder: "Your exact words first, then words that start like yours, each part in the government's code order. Not ranked.",
  cappedPart: "Showing the first <shown> of <total> in this part, in code order. Add a word to narrow it.",
  showGroup: "Show the <n> jobs whose example titles have all but one of your words",
  showGroupSome: "Show the <n> jobs whose example titles have at least one of your words",
  showGroupList: "Show the <n> jobs found only through DotAmi's word list",
  hideGroup: "Hide these <n> jobs",
  capped: "Showing the first <shown> of <total> in this group, in code order. Add a word to narrow it.",
  result: "<job> · <code>",
  pickName: "Pick <job>, <code>",
  matched: "Matched the government's example title “<title>”",
  matchedMore: "and <n> more of its titles",
  listChip: "DotAmi's word list",
  viaList: "Your word “<word>” was matched through DotAmi's own word list (“<list word>”), not by a government title.",
  leftOut: "Not searched: <words>. Each is on DotAmi's list of filler words or of words that name a business rather than the work.",
  wordStart: "A word matches a title word that starts with the same five letters, so “plumbing” finds “plumber”.",
  noMatch: "No government example title holds any of these words: <words>. Try another word for the same work, or skip this question.",
  // Added as built (PR #202 review): the "Only left-out words" state's status line.
  nothingSearched: "Nothing was searched, so no job is listed. Try a word for the work itself, or skip this question.",
  englishOnly: "Titles are searched in English in this version.",
  picked: "Your pick of job: <job> · <code>",
  changePick: "← Change your pick of job",
  source: "Job titles: OaSIS 2025 Version 1.0, Employment and Social Development Canada.",
  notKept: "The words you type here aren't kept. Only the job you pick is, once you open a future.",
}
```

The source line is followed by the licence's own attribution line, word for word, as the skills list already
shows it (`OASIS_ATTRIBUTION`, `lib/engines/oasis/v2026/licence.ts`).

**The maintainer's "shown on screen as DotAmi's suggestion".** The phrase *DotAmi's suggestion* itself can't be
used: the verdict phrase list catches *DotAmi's … suggestion* on any screen (`tests/helpers/verdict-words.ts`,
the *our recommendation* pattern), on purpose. So the screen says whose the match is in plain words instead:
the chip *DotAmi's word list* and *matched through DotAmi's own word list, not by a government title*. Same
meaning, and it passes the check.

## The three states with nothing to pick yet

| State | When | What shows |
|---|---|---|
| **Empty** | Nothing typed (as the step opens, on both ways in) | *Type a word or two about the work. The jobs whose titles hold your words show here.* No list, no groups. This is the state the clutter limit measures |
| **Too short** | One or two letters | *Type at least 3 letters.* |
| **No match** | Every searched word is in no title, name or code, and in no line of DotAmi's word list | *No government example title holds any of these words: “infirmière”. Try another word for the same work, or skip this question.* and *Titles are searched in English in this version.* (research 28f's misses: French words such as *infirmière*, and *dayhome*, *maple syrup*, *ride-share* until DotAmi's list has a line for them; with *dayhome*'s line, *dayhome* finds Home child care providers · 44100.01 under *Jobs found only through DotAmi's word list*) |
| **Only left-out words** | Every word typed is on the filler or business list (*my own shop*) | The no-match line, with *Not searched: “my”, “own”, “shop”. …* above it. **As built:** its own line instead, *Nothing was searched, so no job is listed. Try a word for the work itself, or skip this question.*, since the no-match line would say no title holds words that were never searched (see the note at the top) |

## What is new on the screen vs today

| Today (`/futures`) | With this design |
|---|---|
| The cards show as the page opens | Step 1 shows as the page opens; the cards are step 3 |
| *Name it (optional)* above the cards | Unchanged, on step 3 with the cards |
| No job question | This step |
| Job search only in the cockpit's skills list, by job name or code (20 of 219 corpus ideas find their job, research 28f) | The same search, over the government's example titles with rule H (167 of 219 uncapped, 153 under the app's 50-result cap, research 28f) and DotAmi's word list on top. As built on the 220-idea corpus: 150 in the open group under the cap (153 counted past it), 172 listed; with whole words first (2026-10-23), 152 and 181 |

## Regions and controls (the clutter limit, `e2e/budgets.ts`)

Today's budget for `futures`: **6 regions**; controls in the first window **5, 7, 6** at phone, tablet and
laptop (`BUDGETS.futures`, from `e2e/budgets.ts`).

As the step opens (the state the clutter test measures, nothing typed):

- **Regions: 4.** The nav, the intro, the step region (the cards' block, holding the step instead) and the
  site footer. *Name it* and *Not here yet?* belong to step 3 and aren't drawn here. Two fewer than today.
- **Controls: 5.** **← Your destination** (the nav's back link, as today), the word mark, the search box,
  **Skip this question**, and the site footer's *open source on GitHub* link. The gate counts that link: the
  page is the window's height less the footer's (`pick-future-page.tsx:103`), so the footer always sits in
  the first window, and `e2e/clutter-budget.spec.ts` leaves nothing out. 5 is the phone's limit, so step 1
  has no room for another control in its first window at phone width.
- **The budget:** the row stays at or under today's, and is lowered in the build's pull request to what CI
  measures for the opened step, as the README's rule says (a calmer screen lowers its own row). Typing
  adds result buttons, but the gate measures the screen as it opens; a long result list is one region, the
  step's own.

The step on the intake page sits inside the intake's own `intake` region (no region of its own), with the
preview rail put away: the intake's nav, the `intake` region, the footer, 3 regions against the intake's 4;
the same 5 controls (the intake's **← Back** in place of **← Your destination**, its word mark, the box,
**Skip this question**, the footer's link) against its 5 at every width (`BUDGETS.intake`). Steps 2 and 3 on
the intake page are counted in their own files ([02](./02-where-you-are.md), [03](./03-road-match.md)).

## How a screen reader hears it

- The step is a group named by its heading (*What's closest to your work?*), with *1 of 3 · Your work* read
  before it.
- The box is a search field named *The work, in your own words*, described by its hint. Its results are not
  a combobox: they are an ordinary list below it, so the person can Tab into them.
- One polite status line (`role="status"`) says what the list holds after each pause in typing: *12 jobs
  hold your words: 2 all of them, 0 all but one, 10 at least one.* or the no-match line. It is not read on
  every key.
- Each group is a level 3 heading with its count (*Jobs whose example titles have your word, 3*), then a
  list (`<ul>`) of buttons. Each button's name is *Pick Barbers, 63210.02*, described by its matched line
  (*Matched the government's example title “barber”*) and, for a match through DotAmi's list, by that line
  too, so the source is heard before the click.
- A folded group is one button whose name says what it shows; opening it moves focus to the group's heading.
- **Skip this question** is a button, described by its hint.

## Phone (375 px)

One column. The heading, the lead, the box at full width, **Skip this question** under it, then the groups,
each job a full-width button with its matched line under the name. The source line and *not kept* line sit
under the list. Nothing scrolls sideways.

## State touched (field names only)

None while searching: the typed words stay in the box, in the page's memory, and are never saved, in the
data file or in the window's storage. A click sets the pick in the flow's memory; it is saved with the idea at
step 3's **Look inside** (`POST /api/scenario/save`, the first save, beside `roadId` and `lookingFor`):
`Venture.occupationCode`, `Venture.occupationPickedAt` (both exist, `prisma/schema.prisma:166-171`). A reload
before **Look inside** starts the flow again with nothing kept; the step says so (*not kept* line).

Privacy: the inventory line for the job pick (`lib/privacy/inventory.ts:236`) gains where it is now asked:
*"The job you picked as closest to your work (a government job code) and the day. Asked on Pick a future and
at the end of the intake, and changed from the cockpit's skills list. The words you typed to find it aren't
kept."* Privacy log, in the build's pull request: *"Asks: the job closest to your work, on Pick a future and
at the end of the intake. Skip allowed. Keeps: only the job you click, on this computer."* Nothing is sent:
the titles ship with the app, and the search runs on the person's computer.

## Downstream consumers

The road match (step 3), *About this job* ([../cockpit/about-this-job.md](../cockpit/about-this-job.md)), the
skills list's government list (as today), the idea harness (29h: the picked way picks from `idea.jobs` as a
recorded click) and the coverage report's *expected job among the matches* line.

## Not in this version

- French titles (the French files exist for both datasets; research 28f, open question 5).
- The main-duties search as its own labelled section (research 28f option 3).
- The industry question (phase 3, with the business counts; the maintainer's pick of 2026-10-20).
- A model guessing the job (research 28f option 5: not for the picker).
- Any order but the count of the person's words, then the government's code.

## Checked against the rules

Every string in the words block above was run through the verdict words, the verdict phrases and the time
patterns (`tests/helpers/verdict-words.ts` `VERDICT_WORDS`, `findVerdicts`; `tests/helpers/time-words.ts`
`findTimeWords`) on 2026-10-20, with the placeholders left in: no finding. The matched titles are the
government's words (`TextKind` *official-quote* in `tests/helpers/text-pieces.ts`), never checked as DotAmi's.

## Backend wiring

`searchOasisJobs` gains the example-title index (built by 28a's importer from the pinned OaSIS file), the
two word lists and DotAmi's own word list (a words file), the tiers and the 50 cap. Its result carries, per
job, the group, the matched title and whether DotAmi's list made the match, so the screen never works any of
that out on its own.
