# Contributing to DotAmi

Thank you. DotAmi's goal is that everyone has access to the same tools, tactics and tricks
the elite have — every path that leads to financial freedom, mapped and cited. It is useful
exactly in proportion to how many real paths it maps *correctly*, in how many places — and
that is a bigger job than any one person. This page is how to help without breaking the one
thing that makes the project worth trusting: **every claim is cited, every figure is dated,
nothing is asserted from memory.**

- [What we need](#what-we-need)
- [The rules (short)](#the-rules-short)
- [How a node is written](#how-a-node-is-written)
- [Citations and the source order](#citations-and-the-source-order)
- [Proposing a new roadmap or a new node](#proposing-a-new-roadmap-or-a-new-node)
- [Local development and the gate](#local-development-and-the-gate)
- [Sign-off (DCO) and licenses](#sign-off-dco-and-licenses)
- [Good vs. not-so-good contributions](#good-vs-not-so-good-contributions)

**New to the words?** [docs/glossary.md](docs/glossary.md) explains the short forms and terms the
map uses (GST/HST, the small supplier, T2125, CCA, SR&ED, CCPC, BN, NUANS, WCB, Red Seal and more),
each in a sentence or two and linked to its official page. A new term is added the way a card's
source is: a link to the page and the words a tool or a person found on it (its "Adding a term"
paragraph says how).

**What to expect back.** A first response on an issue or a pull request within 7 days, and
a decision — merged, changes requested, or a plain reason it is out of scope — within 14.
If it has been longer, say so on the thread; that is a bug in the maintaining, not rudeness.
Vulnerabilities go through [SECURITY.md](SECURITY.md), never a public issue.

## What we need

1. **Jurisdictions.** Canada is mapped first: federal entries plus Alberta, British Columbia
   and Ontario. Every other province and territory shows federal rules only, and every other
   country is unmapped. If you know your province's or your country's registration, sales-tax,
   licensing, structure or grant landscape — with sources — that is the highest-value work. A
   new country starts as a *New roadmap* issue (below); its first PR also extends the
   `authority` / `jurisdiction` types, which are Canadian today.
2. **Paths.** Every step, lever, fork, structure or strategy that a real person uses on the
   way to financial freedom and the map does not show yet — one paragraph each, cited, with
   its audit exposure stated. If the well-advised already use it, it belongs here.
3. **Corrections.** A wrong figure, a lapsed program, a repealed section, a dead link. Open an
   issue with the source that shows it; a PR is even better.
4. **Freshness.** Every entry has a `lastVerified` date. Re-checking an entry against its
   official source and bumping the date, with a note of what changed, is a real contribution.
5. **The roadmap and the task list.** `docs/roadmap.md` lists the bigger pieces — roadmaps as
   data, progress, connecting to accounting software and financial records locally, complex
   strategies and structures as roadmaps. Some are under way: roadmaps as data and progress are
   part of the future cockpit, the first priority since 2026-10-10
   ([future-cockpit.md](docs/architecture/future-cockpit.md)), and reading figures from files and
   accounting books has started. [docs/task-list.md](docs/task-list.md) says what is done, what is
   open and what waits on a maintainer's decision; say in an issue which piece you are taking.
6. **Your export's column names.** "Add from a file" has only been tested on invented files
   shaped from each accounting program's help pages. If you use QuickBooks Online, Xero, Wave,
   FreshBooks, Sage Accounting or Sage 50 Canadian, paste the **one row of column names** from
   your export in [issue #124](https://github.com/Dot-Ami/dotami/issues/124) — never an amount,
   a client or company name, an invoice number, or any row above or below it. The issue says which reports and how.

## The rules (short)

- **Not the biggest list — the most relevant.** A node earns its place by mattering to
  someone starting or running a small Canadian business, or working toward a career or a
  business of their own, *today*. Prefer fewer, better. (2026-10-11: careers added. The
  maintainer's goal of 2026-10-10 is a "dream business or career", and the first written
  future joins an apprenticeship to a shop of your own:
  [future-cockpit.md](docs/architecture/future-cockpit.md).)
- **Do not add what you have not verified yourself.** Read the section, the CRA page, the
  program page. If you are summarising someone else's summary, it does not go in.
- **No entry without a citation.** Anything that states a rule, a rate, a threshold, a date
  or an eligibility condition carries at least one typed source (below). The quality gate
  refuses entries that don't.
- **No numbers from memory.** A figure without a source is a bug, not a contribution.
- **Compass, not GPS.** "If X, this may unlock Y." Never "you should". Never a ranking of
  options by what *we* think matters to the reader.
- **No self-promotion.** Links to your own product, firm, course or channel are not accepted
  unless a maintainer asks for them.
- **Plain English.** The reader is a person starting a business, not an accountant. One
  paragraph a first-timer could repeat back. Depth lives in the sources.
- **Not advice.** Nothing in a node may read as a recommendation to file, elect, claim or
  structure in a particular way. Risk and audit exposure are stated, never softened.

## How a node is written

Catalog entries are TypeScript objects under `lib/engines/<engine>/v2026/` (write-offs,
grants, compliance, structure, templates, risk) and lifecycle nodes under
`lib/engines/cfe/v2026/`. Read `docs/engines/README.md` and the engine's own file first —
`docs/engines/{writeoffs,grants,compliance,structure,templates,cfe}.md`. The risk engine's
spec is [docs/brain/risk-calculator.md](docs/brain/risk-calculator.md). They define the fields. The shape every entry shares:

```ts
{
  id: "writeoff-example",            // permanent; never renamed once merged
  label: "Plain-English title",
  description: "One paragraph. What it is, in words a first-timer can repeat back.",
  eligibility: "Who this applies to, as the source states it.",
  lensAnnotations: {
    tax: "If <condition>, this may <effect>. <Compass voice — no 'you should'.>",
    legal: "If <condition>, <what changes on the legal side>.",
  },
  citations: [ /* see below — at least one */ ],
  provinces: ["CA"],                 // "CA" = federal; add province codes only with a provincial source
  // engine-specific typed fields: rates, thresholds, dates — never in prose
}
```

Typed fields for anything the rules engine reasons about (a rate, a threshold amount, an
expiry date) — never a number hidden in a sentence. Time-boxed rules carry their expiry so
the engine can surface them amber and drop them when they lapse.

**One step that is easy to miss:** if the entry should appear on a particular lifecycle
node's card, add its id to that node in `NODE_ENGINE_HINTS` (`lib/brain/node-items.ts`).
An entry with no hint still shows, but only under "Elsewhere on your map", and
`tests/engine-integrity.spec.ts` fails if a hint names an id no catalog has.

## Citations and the source order

Every citation is:

```ts
{
  title: "Income Tax Act s.18(12) — Work space in home",   // name the provision
  authority: "federal" | "CRA" | "provincial",
  jurisdiction: "CA" | "AB" | "BC" | "ON",
  url: "https://laws-lois.justice.gc.ca/…",                 // the OFFICIAL text, not a blog
  lastVerified: "2026-09-16",                               // the day YOU read it (or a toolCheck, below)
  note: "What you read there, in one line, and anything the entry leaves out.",
  verification: { status: "confirmed" | "supported" | "partial", method: "How you checked." }, // for statute
  corpus: [{ source: "ita", label: "18", sub: "(12)" }],    // optional: lets the app show the words
}
```

**Order sources by authority**, first to last: the **statute or regulation** (the official
consolidated text — in Canada, Justice Canada / the provincial King's Printer) → the **tax
authority's** or administrator's page (in Canada, the CRA or the province) → an **official
program page** (for grants) → at most one explanatory article, and only from a source that
itself cites the law. Blogs, forums and generated content are not sources.

Rates, thresholds and deadlines change. Cite the consolidated statute where the figure lives
and the CRA page that administers it; the entry's typed field carries the figure and
`lastVerified` carries the day you confirmed it.

### Read by a person, or checked by a tool (added 2026-10-11)

Every citation says how it was checked, and the card shows it. The maintainer decided on
2026-10-11 that there are two kinds of check
([docs/engines/citations.md](docs/engines/citations.md)):

- **Read by a person**: you read the page and it says what the entry says. Set `lastVerified` to
  that day and `readBy: "person"`. The card shows *"Read by a person on 2026-10-10"*. If an AI
  model did the reading, say `readBy: "model"` instead; the card then says so, in amber. Without
  `readBy` the card says *"Read on 2026-10-10. Who read it wasn't recorded."*
- **Checked by a tool**: you copy the exact words the entry relies on from the page (one or more
  short quotes of at least three words each, never a paraphrase), then run

  ```bash
  node scripts/check-quotes.mjs --url "https://www.canada.ca/…" --quote "the exact words" --quote "more exact words"
  ```

  The script fetches the live page and says *found* or *NOT FOUND* for each quote. Only when every
  quote is found, copy what it prints into the citation:

  ```ts
  toolCheck: { checkedOn: "2026-10-11", quotes: ["the exact words", "more exact words"] },
  ```

  The card shows *"Checked by a tool on 2026-10-11: it found on the page the exact words this
  entry relies on. Not read by a person yet."*, with the words it found under it. The script
  matches whole words only, inside one block of the page. It changes no file; you record the result. It doesn't read PDFs,
  so a PDF needs a person's read.

A citation needs one of the two and may have both; when both exist, the card shows the read. A tool check only proves the words are on the page. Whether the entry reads them right is
still for a person, so the maintainer may read any source before it merges. Run
`node scripts/check-quotes.mjs` with no arguments to check every recorded tool check again (it
fails when a page has changed under one).

### One more kind of source: the government's skills list for a job (added 2026-10-11)

The maintainer decided on 2026-10-11 that the future cockpit
([docs/architecture/future-cockpit.md](docs/architecture/future-cockpit.md)) may show the
government's list of skills for a job. The source is the **Occupational and Skills Information
System (OaSIS)**, published by Employment and Social Development Canada on open.canada.ca as
[*Occupational and Skills Information System (OaSIS) - 2025 Version 1.0*](https://open.canada.ca/data/en/dataset/10ce43bd-fb58-4969-806b-4bffebc87bec),
CSV files in English and French, under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada)
(version 2.0). It is allowed only this way:

- **Only through the person's own pick of job.** The person picks "the job closest to the work you'd
  do yourself", and the list for that job is shown tagged *your pick of job*. No entry, road or step
  may link a business or a future to a job by itself: no official source says which skills a business
  needs.
- **Cited by dataset version and record date,** like any other source: the dataset's title and version
  (at the time of writing, *OaSIS 2025 Version 1.0*: unlike the older *OaSIS 2022 Version 1.0*, it has
  a Knowledge file), the file it came from (the import reads the Skills and Knowledge files, with the
  Labels file for job names and the taxonomy for ids; settled 2026-10-12,
  [future-cockpit.md](docs/architecture/future-cockpit.md) § 6), the occupation code, the dataset's *record modified* date as the page shows it, and
  `lastVerified` as the day you read it, or a tool check of the dataset's page (option B, as the imported
  items carry). `authority` is `"federal"`, `jurisdiction` is `"CA"`.
- **Imported, never typed.** `node scripts/import-oasis.mjs` turns the files committed under
  `data/oasis-2025-v1.0/` into `lib/engines/oasis/v2026/data.ts`; `--check` (and a test) fails if the
  module isn't exactly what the files make, and `--download` fetches a new copy, keeping a file only when
  its SHA-256 is the one pinned in the script (a new version means updating the pin on purpose). Never edit the module by
  hand, and never show a rating until the maintainer decides to (names only today).
- **Its licence travels with it.** The imported lists stay in their own data file carrying the
  licence's attribution line — *"Contains information licensed under the Open Government Licence –
  Canada."* — and are not copied into catalog text under CC BY-SA, because nobody has checked yet how
  the two licences fit together. Nothing may suggest the government endorses DotAmi or the person's
  use of the list (the licence forbids implying official status).
- **Not a source for anything else.** Job outlooks and industry averages from the same family of
  datasets are not allowed: start-up costs are official fees plus the person's own quotes only (the
  maintainer's decision of 2026-10-11). The one exception is official wage ranges by job (Job Bank's
  low, median and high), allowed by the maintainer's K5 B of 2026-10-16: shown on *About this job* with
  their geography level, reference period and source, as what workers in the job were paid, never as
  the person's income and never added to a cost total (see the numbers rule in
  [CLAUDE.md](CLAUDE.md) and [research-kit.md](docs/architecture/research-kit.md) § 4.2).

## Proposing a new roadmap or a new node

- **A new node** (a step, lever or fork the map lacks): open an issue with the *New node*
  template — what it is, which tier/stage it belongs under, the sources, and why it matters
  to someone starting a business or working toward a career today (careers added 2026-10-11,
  as above). A maintainer confirms the shape before you write the PR.
- **A new roadmap** (a kind of business, or one skill done properly — "GST/HST from zero"):
  open an issue with the *New roadmap* template. List the tiers and the 20–40 nodes you
  would put in it, with a source for each. Roadmaps are built from nodes; the nodes come
  first.
- **A wrong citation, figure or lapsed program:** the *Wrong citation* template. Include the
  official source that shows the correct state.

Node and entry ids are permanent once merged — progress, links and citations key on them.
Rename the label, never the id.

**A new road or a new screen comes with 10 or more ideas that should reach it** (added
2026-10-17). Add them to the idea corpus, `tests/fixtures/ideas/v1.ts`: invented, written as a
person would type them, at the next free numbers (an idea's id is never reused). The idea harness,
`tests/idea-harness.spec.ts`, runs every idea in the corpus through the app and must pass: no
verdict words, no $0 for a blank, every amount cited or the person's own, no times, every path
ending somewhere honest, nothing derived about the person, and the same output for the same input.
A failure that a planned story fixes is listed in `tests/fixtures/ideas/known-gaps.ts` with that
story; a bug is listed there only with the maintainer told, in the pull request. The rule for roads
is rule 13 of [docs/engines/roads.md](docs/engines/roads.md): `tests/idea-corpus.spec.ts` fails while
a road in the catalog has fewer than 10 ideas. Screens aren't counted: an idea has no field naming
the screens it reaches, so for a new screen the reviewer checks the 10 ideas, and the screen's
words join the harness only once `tests/helpers/idea-pipeline.ts` collects them.

**The property tests** (added 2026-10-17), `tests/idea-properties.spec.ts`, hold the same invariants
over thousands of generated answer sets (every place, kind of venture, work situation, structure, map
pick, number, mark and status the rules read; `tests/helpers/idea-properties.ts` says what else they
check: taking an answer back restores the run before it, a quote never raises the "not priced" count, a
blank is never $0, the same input gives the same output, road evaluation's own sweep names exactly
the answers a step's colour depends on, and the person's own figures beat the estimate once they settle
the CRA's test; the spec counts the runs where they did, and a count of 0 fails, so generated figures the
rules never read can't pass unnoticed). They run with a fixed seed, so CI and every checkout run the
same cases. To try new ones, `IDEA_PROPERTIES_SEED=random npm test -- idea-properties` (the seed is
printed first); `IDEA_PROPERTIES_SEED=<number>` reruns one. A failure prints the seed, the path and
the smallest counterexample fast-check shrank it to (the generated answers, with the road by its id),
then the property's own words. `fast-check` is a development dependency that ships nowhere.

**The idea sweep** (added 2026-10-17), `e2e/idea-sweep.spec.ts`, takes twelve corpus ideas from the
front door to *Your plan* in the browser, both ways in, and reads every screen as it opens for verdict
words, time words and the clutter measurer. It reads the page the way the harness reads the app's words:
block by block, with every idea's own words taken out, and, for the time check, without the source quotes
a screen draws in quote marks (the harness's `official-quote` pieces). Eight ideas are fixed; four rotate
by ISO week, so a week's run is the same on every machine: `IDEA_SWEEP_WEEK=2026-W42 npx playwright test
e2e/idea-sweep.spec.ts` reruns that week's four. What it finds is listed in the file's `SCREEN_GAPS` with
its story, never fixed quietly, and the last test fails on a listed gap no idea shows any more.

**Scoring the AI parser on your own key** (added 2026-10-17; developers only, costs money, never in CI):
`ANTHROPIC_API_KEY=… npm run eval:intent` runs every corpus idea through the model the front door's box
uses, with the route's own fixed field lists and cleaning (`app/api/intent/parse/route.ts`), scores the
answers against what each idea's words name (kinds of work, province, buying equipment), prints a table
and writes `test-results/intent-eval.md` (ids and fields only; the words are never written anywhere, and
nothing is sent anywhere but the model API your key belongs to). The route's rate limit applies, so a
full run takes about 13 minutes; `--limit 40` or `--ids idea-v1-0003,idea-v1-0010` narrows it, and
`npm run eval:intent -- --fallback` scores the keyword parser instead, sending nothing. It exits at once
when `CI` is set. Later it also hosts the Lens question set.

## Local development and the gate

```bash
cp .env.example .env     # the default DATABASE_URL is a SQLite file in prisma/
npm ci
npm run prisma:deploy
npm run seed             # optional: two invented ventures so the map is not empty
npm run dev
```

Before opening a PR, run **`npm run ci:quality`** — it is the exact chain CI runs:
`prisma generate → typecheck → lint → test → build`. Stop the dev server first. The test
suite includes `tests/engine-integrity.spec.ts`, which fails on an entry without a citation,
a citation without an official URL or without a person's read or a tool check, a duplicate id, or a corpus pointer
that cannot resolve. Green is the floor, not the bar: a tool check proves only that the quoted words are on the page, and the maintainer chooses which sources to read.
The scenarios those deterministic tests lock are described in
[docs/verification/golden-scenarios.md](docs/verification/golden-scenarios.md).

One PR per topic. A PR that adds a node and also reformats three files is two PRs. To keep
that from happening by accident, the repository ships `.editorconfig` and a Prettier config:
run `npm run format` before you commit, or let your editor pick them up. Formatting is not
part of the gate yet — it joins `ci:quality` once the open pull requests have landed, so
that nobody's branch is invalidated by a whitespace commit.

**The privacy log.** If your PR changes what DotAmi keeps (a table, a file, a browser-storage
key), sends (any request out), ships (a package in the app) or asks the person to agree to, add a
line under [Unreleased] in [docs/privacy-log.md](docs/privacy-log.md), under the heading it belongs
to, with a link to the code. That log is what the privacy policy and terms will be written from.
The release PR turns [Unreleased] into that version's section; a test fails until the version in
`package.json` has one.

The npm scripts start Next.js and Prisma with their own usage reports switched off
(`scripts/next.mjs`, `scripts/prisma.mjs`). Running `npx next …` or `npx prisma …` by hand
skips that: set `NEXT_TELEMETRY_DISABLED=1` and `CHECKPOINT_DISABLE=1` in your shell for those, and
before `npm ci`, which runs Prisma once on its own.

## Sign-off (DCO) and licenses

Every commit is signed off with the [Developer Certificate of Origin](DCO.md):

```bash
git commit -s -m "grants(ab): add Alberta Innovates Voucher, cited"
```

The `-s` adds `Signed-off-by: Your Name <you@example.com>`, which is your statement that you
wrote the contribution or have the right to submit it. No CLA, no paperwork.
GitHub's "Update branch" button is fine to use: the sign-off check skips merge commits, and pull
requests are squash-merged, so a merge commit never reaches `main`.

By contributing you agree that **code** is licensed under [Apache-2.0](LICENSE) and
**content** (catalog entries, nodes, docs) under [CC BY-SA 4.0](LICENSE-CONTENT.md).

## Good vs. not-so-good contributions

**Good**

- A provincial registration or sales-tax entry with the King's Printer section cited.
- A `lastVerified` bump with a note: "rate unchanged as of 2026-09-16, program page moved to …".
- A node whose paragraph a first-timer could repeat back, with the statute pointer filled in.
- An issue that says "s.X was amended on <date>, here is the consolidated text" with the link.

**Not so good**

- "Everyone knows computers are Class 50." (Cite Schedule II of the Income Tax Regulations
  and the CRA class listing, with the date you read them — then it is good.)
- A 400-word node. (Cut it to one paragraph; put the rest in the sources.)
- An entry that ranks options or tells the reader what to do.
- A link to your firm's blog.
- Ten unrelated fixes in one PR.

Questions: open a discussion or an issue. Be kind; see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
