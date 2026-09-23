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
5. **The roadmap.** `docs/roadmap.md` lists the bigger pieces — roadmaps as data, progress,
   connecting to accounting software and financial records locally, complex strategies and
   structures as roadmaps. Each is open; say in an issue which one you are taking.

## The rules (short)

- **Not the biggest list — the most relevant.** A node earns its place by mattering to
  someone starting or running a small Canadian business *today*. Prefer fewer, better.
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

## Citations and the source order

Every citation is:

```ts
{
  title: "Income Tax Act s.18(12) — Work space in home",   // name the provision
  authority: "federal" | "CRA" | "provincial",
  jurisdiction: "CA" | "AB" | "BC" | "ON",
  url: "https://laws-lois.justice.gc.ca/…",                 // the OFFICIAL text, not a blog
  lastVerified: "2026-09-16",                               // the day YOU read it
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

## Proposing a new roadmap or a new node

- **A new node** (a step, lever or fork the map lacks): open an issue with the *New node*
  template — what it is, which tier/stage it belongs under, the sources, and why it matters
  to a small-business founder today. A maintainer confirms the shape before you write the PR.
- **A new roadmap** (a kind of business, or one skill done properly — "GST/HST from zero"):
  open an issue with the *New roadmap* template. List the tiers and the 20–40 nodes you
  would put in it, with a source for each. Roadmaps are built from nodes; the nodes come
  first.
- **A wrong citation, figure or lapsed program:** the *Wrong citation* template. Include the
  official source that shows the correct state.

Node and entry ids are permanent once merged — progress, links and citations key on them.
Rename the label, never the id.

## Local development and the gate

```bash
cp .env.example .env     # DATABASE_URL → a PostgreSQL you own (Docker is fine)
npm ci
npm run prisma:deploy
npm run seed             # optional: two invented ventures so the map is not empty
npm run dev
```

Before opening a PR, run **`npm run ci:quality`** — it is the exact chain CI runs:
`prisma generate → typecheck → lint → test → build`. Stop the dev server first. The test
suite includes `tests/engine-integrity.spec.ts`, which fails on an entry without a citation,
a citation without an official URL or `lastVerified`, a duplicate id, or a corpus pointer
that cannot resolve. Green is the floor, not the bar — a maintainer still reads the sources.
The scenarios those deterministic tests lock are described in
[docs/verification/golden-scenarios.md](docs/verification/golden-scenarios.md).

One PR per topic. A PR that adds a node and also reformats three files is two PRs.

## Sign-off (DCO) and licenses

Every commit is signed off with the [Developer Certificate of Origin](DCO.md):

```bash
git commit -s -m "grants(ab): add Alberta Innovates Voucher, cited"
```

The `-s` adds `Signed-off-by: Your Name <you@example.com>`, which is your statement that you
wrote the contribution or have the right to submit it. No CLA, no paperwork.

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
