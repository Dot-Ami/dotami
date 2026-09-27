# Who DotAmi is for — the people, what each needs, and what the back end must do

Status: plan, 2026-09-27. Nothing here is built. It sits above the other architecture
documents: [connectors-and-agents.md](connectors-and-agents.md) (how figures arrive),
[engines.md](engines.md) (the catalogs) and [law-store.md](law-store.md) (the statute text).
Where this page and those disagree, this page is newer, and the older page gets updated in
the pull request that builds the piece.

The method: start from the people, not the features. For each kind of person the page says
what they do in DotAmi, what DotAmi needs to know, where that comes from, and what is kept.
The back-end plan at the end is what those people add up to.

## Decisions this plan is built on (2026-09-24 → 2026-09-27)

1. **A desktop app, plus a website that is a landing page.** The app is where everything
   happens. The website explains the product with demos and links to the download. Today
   DotAmi needs Docker, Node, a database and five terminal commands to install; most people
   stop there.
2. **DotAmi keeps a few confirmed totals, not the records.** Revenue per quarter, net income,
   the date and price of a big purchase — each with its source and date, kept only after the
   person confirms it. Individual transactions and the imported files are not kept.
3. **DotAmi holds no keys to anyone's accounting software by default.** A person who wants a
   live connection can add their own keys; that is their choice, made after a plain warning.
4. **The Lens comes back, as a built-in agent.** It was removed on 2026-09-14; that removal
   was meant only for the maintainer's personal copy, where Claude does the job. The public
   app needs it, because most people have no agent of their own. The Lens can:
   - use any model the person chooses: a local model (for example through Ollama) or their
     own key for a hosted model. DotAmi ships no key and pays for no model;
   - read screenshots and photos (receipts, statements, a page of a report);
   - search the web;
   - drive a browser built into the app, with the person's QuickBooks, Xero or email open in
     it;
   - run commands on the person's computer, so it can read their records wherever they keep
     them — spreadsheets, folders of receipts, exported email;
   - change things in the app for the person: their answers, their branch picks, their
     notes, settings, across all their ventures.
5. **The cards are still decided by rules, not by the model.** Each card is an entry a human
   wrote, with its source, and plain code decides whether it applies. The Lens can change
   *the person's* answers and plan; it cannot change the rules or the law they cite.
6. **Autonomy, with warnings.** Writing back to accounting software is allowed. Every
   powerful action — writing to books, running commands, driving a browser logged into an
   account — carries a plain warning about what can go wrong, and tells the person to check
   what the AI did.
7. **An accountant reviews at the end.** A roadmap is marked *reviewed* only after a
   professional has read it.

## The people

Each row is one kind of person. *Today* says what the app does for them now; *Needs* is what
this plan adds.

### 1. Someone with only an idea

*"I want to start a mobile bike-repair business in Calgary."* No revenue, no registration,
maybe a job.

- **Does:** describes the idea, answers questions, sees the map of steps from here to
  running: register a name or not, GST now or later, sole proprietor or company, what can be
  written off from day one, which grants the idea fits.
- **DotAmi needs:** what, where, alone or with others, a rough first-year revenue *estimate*,
  big purchases planned (the van), whether they keep their job.
- **Comes from:** the questionnaire, or the Lens asking in conversation.
- **Kept:** their answers and their own words, dated.
- **Today:** intake → map works; the questions are fixed and short.
  **Needs:** the branching questionnaire (below); a checklist of steps with *done · doing ·
  not for me* ([roadmap §2](../roadmap.md#2-progress)) and the concrete tasks each step
  spawns ([§3](../roadmap.md#3-projects-and-questions)).

### 2. A side hustle next to a job

Employed, earning a few thousand on the side. The cards that matter are different: the
employment context, how side income is reported, when GST starts, what home-office costs
can be claimed.

- **Needs:** the employment answer to be asked, never assumed (pull request #52 makes the
  dropdown start at *Choose…*); real figures as the hustle grows, from a spreadsheet, a screenshot
  or the Lens reading a folder.

### 3. A sole proprietor who is already running

Real revenue, maybe near the $30,000 GST line, a few big purchases.

- **Needs:** real totals to replace the estimates — revenue by quarter, purchases with
  dates. The GST card then reads *"$27,400 over the last four quarters · from your records"*
  instead of an estimate. Figures come from an export, a screenshot, the built-in browser,
  or their own keys (see *Getting figures in*).

### 4. An incorporated owner

Salary or dividends, the small-business deduction, a corporate year-end.

- **Needs:** net income by year, what was paid out to the owner and how. The strategy
  roadmaps ([§6](../roadmap.md#6-complex-tax-strategies-and-business-structures--as-roadmaps))
  — none written yet.

### 5. Two or more companies

An operating company plus a holding company, or two ventures that share an owner.

- **Needs:** ventures that link as one structure (the ideas page already cross-references
  them), facts per company, and the holding-company roadmap.

### 6. Someone who isn't comfortable with computers

- **Needs:** the desktop app (one download, one click); the Lens as the way in — *"here's a
  photo of my receipts"*, *"what does this card mean?"*, *"change my province to BC"*; plain
  words on every screen; no step that requires a terminal.

### 7. Someone who already uses an agent or a command-line tool

Claude Code, Claude Desktop, Codex or anything that speaks MCP.

- **Needs:** DotAmi's MCP server ([connectors-and-agents.md § C](connectors-and-agents.md#c-dotami-as-an-mcp-server)),
  so their own agent can read the map and propose figures. The same permission levels as the
  Lens (below).

### 8. Records scattered everywhere

Some in Excel, receipts as phone photos, invoices in email, a bank PDF.

- **Needs:** the Lens reading files wherever they are (with the person's permission for each
  folder), images read by a model that can see, and every figure it finds arriving as
  *proposed* with the file it came from.

### 9. Someone who moves province, pauses, or closes a business

- **Needs:** a venture's province to change and the map to redraw; a *closed* or *paused*
  stage; the closing steps as a roadmap (final returns, GST account closure, what happens to
  assets). None of this exists yet.

### 10. Someone who is already behind

Went over the GST line last year without registering; missed an instalment.

- **Needs:** catch-up paths written as roadmap steps — what the rule says, what the
  voluntary-disclosure route is, cited — with the risk read stated plainly. Never a verdict;
  always *talk to an accountant*.

### 11. Someone outside Canada

- **Today:** only Canada is mapped; everywhere else says so.
  **Needs:** the jurisdiction model ([§4](../roadmap.md#4-jurisdictions-beyond-canada)).

## The questionnaire — a choose-your-own-adventure

Today's intake asks the same short list of every person. The new one should behave like an
accountant's first meeting: each answer decides the next question, and each path goes
somewhere different.

- **Questions are data, like the catalogs.** One file per question: the wording, the answers
  it accepts, which question each answer leads to, and which cards it affects. A question
  with no card depending on it is not asked.
- **Every question says why it is asked** — *"we ask because the GST rule depends on
  revenue"* — and links the card it feeds.
- **"I don't know" is always an answer.** It leaves the cards it feeds on *check first*
  instead of guessing.
- **Order, the way a professional would ask:** what are you doing → alone or with others →
  where → is money coming in yet → how much, roughly → people (hiring, contractors, family)
  → big purchases → what you want (income, growth, selling one day, protecting assets).
- **The Lens can run it as a conversation** and fill the same answers; the person sees and
  confirms what was filled.

A fragment, to show the shape:

```
What are you doing?
├─ "An idea — nothing yet"         → Will you keep your job?  → Rough first-year revenue?  → …
├─ "Selling on the side"           → How much last year?      → Registered for GST?        → …
└─ "Running a business already"    → Sole proprietor or company?
      ├─ Sole proprietor           → Revenue last 4 quarters? → Registered for GST?        → …
      └─ Company                   → Year-end? → Paying yourself salary, dividends, both? → …
```

Open: who writes the question files first; how to test that every path ends somewhere.

## How a card is decided — three real examples

The engine is plain code in [`lib/brain/evaluate.ts`](../../lib/brain/evaluate.ts). The same
answers always give the same cards; no model is involved.

1. **GST threshold** ([`evaluate.ts:228`](../../lib/brain/evaluate.ts#L228)). The catalog entry
   holds `$30,000` and links CRA's *when to register* page. Expected first-year revenue over
   $30,000 → the card turns amber: *"your target crosses the threshold"*. At 70% or more of
   the line ($21,000+) → amber: *"approaches the threshold"*. Below that, it shows as a
   general rule for the province, not a warning.
2. **A grant that needs a company** ([`evaluate.ts:157`](../../lib/brain/evaluate.ts#L157)). If
   the province and the kind of work match but the program is only for corporations, the card
   shows amber with a fork: *"Incorporating would unlock this"*. SR&ED shows the rate going
   from 15% to 35% as a Canadian-controlled private corporation. A grant card is never green —
   eligibility always needs confirming.
3. **A time-limited write-off** ([`evaluate.ts:109`](../../lib/brain/evaluate.ts#L109)). A
   planned vehicle or computer purchase matches a depreciation class. If that class has a
   temporary first-year incentive still open, the card is amber and shows the deadline.

**Where business-structure and strategy logic comes from:** the same way. The structure
ladder ([`lib/engines/structure/v2026/ladder.ts`](../../lib/engines/structure/v2026/ladder.ts))
lists sole proprietor → sole proprietor with GST → corporation, each step written by a
person with the CRA page or statute behind it, and what changes at each step. DotAmi lays
the options side by side with what each costs and unlocks; it does not pick one. The
bigger strategies (holding company, salary vs dividends, estate freeze) are roadmap §6 and
are not written yet.

## Making it trustworthy

1. **No step without a source.** A checker refuses any step file with no citation
   ([§1](../roadmap.md#1-roadmaps-as-data)).
2. **Check each source against the law's own words.** Of the 74 citations today, 9 have been
   checked word for word against the statute text; the other 65 are government pages read
   for meaning. The plan does not trust a model's judgement here. A model does the fetching
   and quoting; **plain code checks that the quoted words appear word for word in the
   official text**; a person decides whether those words say what the card says. The model
   saves time; it never gets the last word.
3. **Flag stale sources automatically.** A scheduled check re-downloads every cited page. If
   the page changed since the day it was checked, or the check is older than a year, the card
   shows *re-check this source* until someone does.
4. **Two people per change.** Example: a contributor adds a *home office* write-off citing a
   CRA page. Before it merges, a second person — not the author — opens that CRA page and
   confirms it says what the entry says. GitHub can require this on catalog files.
5. **An accountant at the end.** A roadmap reaches *reviewed* only after a professional has
   read it; the card shows who reviewed it and when.

## Getting figures in — the person picks

| Way in | Who can use it | What DotAmi holds | Warning shown |
|---|---|---|---|
| Drop a file or screenshot (Excel, CSV, PDF, photo) | anyone | the confirmed totals | none beyond *check what was read* |
| The Lens reads files on the computer | anyone | the confirmed totals | the folders it may read, chosen per folder |
| The built-in browser, logged into QuickBooks / Xero / email | anyone | the confirmed totals; the browser's saved login lives in the app's browser profile | automation may break the vendor's terms; the saved login is itself access |
| The person's own keys + the vendor's official MCP server | people comfortable setting up a developer app | the keys, in the computer's keychain | anyone with this computer can reach the books |
| The person's own agent (Claude Code, Codex, …) through DotAmi's MCP server | agent users | the confirmed totals | the agent's model company sees what it reads |

Vendor terms on automation, read 2026-09-24 and quoted in
[connectors/README.md](../connectors/README.md): FreshBooks' customer terms bar "robots or
similar data gathering or extraction methods"; Intuit's website terms bar scraping content
"that doesn't belong to you"; Xero's ban on browser automation is in its *developer* terms,
and its Canadian customer terms have no such clause. DotAmi quotes, the person decides.

**Writing back** (the Lens entering a transaction in QuickBooks, for example) is allowed on
the same routes, off by default, with a warning before it is turned on and a record of every
write it made.

## Permission levels — one model for the Lens and outside agents

The person sets one level per venture; the Lens and any connected agent get the same:

| Level | The AI may |
|---|---|
| Read | read the map, the answers, the confirmed figures |
| Propose (default) | also propose figures, answers and changes; the person confirms each one |
| Act, asking first | make changes after the person approves each action |
| Act freely | make changes without asking; everything is logged and can be undone |

Commands on the computer, the browser and writing to accounting software are switched on
separately, each with its own warning.

## What the back end stores

| Kept (in the person's own database, on their computer) | Never kept |
|---|---|
| Their answers and dated statements, verbatim | the files they import |
| Ventures, branch picks, progress, tasks, questions | individual transactions |
| Confirmed totals, each with source, period, date and row count | a copy of anyone's books |
| The Lens conversation, per venture (can be cleared) | anything sent to a server run by DotAmi — there is none |
| Settings: model choice, permission levels, which folders the Lens may read | |
| Keys the person chose to add — in the operating system's keychain, not the database | |

Protection for a stolen laptop is the operating system's disk encryption (BitLocker,
FileVault); setup tells the person to turn it on.

## Open questions for the maintainer

1. **Bank records.** The 2026-09-24 decision was that DotAmi reads none. With the Lens able to
   read any file the person points it at, does that still hold, or does the person decide
   here too?
2. **"Act freely" and confirming figures.** Should the person be able to let the Lens confirm
   figures for them, or does a figure always need their own click?
3. **The database in a desktop app.** Today DotAmi needs a PostgreSQL server. A desktop app
   either bundles one or moves to a database that lives in a single file. That changes the
   locked stack, so it is a decision, not a detail.
4. **Which accounting software the maintainer uses** — the first connector note should be a
   real one.

## Build order (proposed)

1. **Confirmed figures** — the store, the engine reading them, *from your records* on a card.
2. **File and screenshot drop** — the first way in that needs nothing installed.
3. **DotAmi's MCP server, read-only** — outside agents can read the map.
4. **The Lens, first version** — the person's own model, reading and proposing only.
5. **The branching questionnaire** — questions as data, run by the screens or the Lens.
6. **The desktop app** — packaging, the database decision, the landing page.
7. **Lens powers, one at a time** — web search, file reading, the built-in browser, acting,
   writing back — each with its warning and its permission switch.
8. **Progress, tasks and the first strategy roadmaps.**
