# Where DotAmi is going

Last updated: 2026-09-20.

DotAmi's mission is that everyone has access to the same tools, tactics and tricks the elite
have: every path that leads to financial freedom, mapped step by step, each step cited to the
law that makes it work. This page is the list of the bigger pieces between here and there.
Each one is open. To take one, open an issue naming the section and what your first PR would
be; the rules in [CONTRIBUTING.md](../CONTRIBUTING.md) apply to all of it — cited, dated,
plain English, no recommendations, no numbers from memory.

## 0. Where it is today

- **One jurisdiction mapped: Canada** — federal + Alberta, British Columbia, Ontario — across
  seven catalogs under `lib/engines/`: write-offs, grants, compliance, structure, templates,
  risk, and the lifecycle (CFE: 10 nodes in 4 tier columns).
- **The map** (`/cockpit`): tier columns of stage and lever cards, lit by the deterministic
  rules engine from the person's answers; hover arrows along the paths; node detail with
  "Show the words" (the provision's own text, from an optional local statute store).
- **Ideas** (`/ventures`): every saved venture, its stage, notes, cross-references.
- **The readout** (`GET /api/readout`): everything the map knows about a venture as JSON, so
  a coding agent working with the person can reason over it. In-app AI is off by design.
- **Self-hosted, single user, no auth**, PostgreSQL on the person's machine. Nothing leaves it.

## 1. Roadmaps as data

The contribution format becomes the data format: **one markdown file per node** — a title,
one paragraph a first-timer could repeat back, typed sources in authority order, at least one
citation (a statute pointer where the claim is legal), and the typed fields the engine reasons
about in frontmatter. A compiler builds the catalog from those files and **refuses a node
without a citation**. Ids are permanent.

- The current 10-node map becomes roadmap #1, *Starting a business in Alberta*.
- Roadmap #2 candidate: a content channel run as a business (~30 nodes, drafted for review).
- A `/roadmaps` picker; a venture is *on* a roadmap.

Open: file layout (`roadmaps/<slug>/<node-id>.md`?), the frontmatter schema, how a node is
shared between roadmaps, year-versioning of a node whose figure changes.

## 2. Progress

Per node, per venture: **done · doing · not for me**, stored in the person's own database and
shown as a percentage on the venture's card and in the readout. Never used to rank anything.

Open: whether *not for me* hides or greys the node; progress when two roadmaps share a node.

## 3. Projects and questions

**Projects** are the concrete tasks a node spawns for a venture, each with a "done when"
(register the trade name; open the separate account; file the election by <date>). **Questions**
are a handful per roadmap, in plain English, with the answer revealed alongside its citation —
the things to know before walking into an accountant's office.

Open: the data format for each; how a project's "done" relates to a node's progress.

## 4. Jurisdictions beyond Canada

Today `jurisdiction` is `"CA" | "AB" | "BC" | "ON"` and `authority` is
`"federal" | "CRA" | "provincial"`; the intake's province selector and the free-text parser's
place names are Canadian. To map a second country the repo needs a **jurisdiction model**:
country → region, the authorities that exist in each, catalogs partitioned by jurisdiction,
an intake that asks *where* before anything else, and a map that draws the roadmap for that
place. The Canadian lifecycle stays as roadmap #1; nothing about it is removed.

A new country's first PR: the type extension, one roadmap with its tiers and 20–40 cited
nodes, and the list of official sources for that jurisdiction (the consolidated statute text,
the tax authority's pages) in authority order.

Open: currency and figure formatting per jurisdiction; cross-border nodes (a person in one
place selling into another); language of the sources versus language of the node.

## 5. Connecting to accounting software and financial records — locally

The principle first: **the records never leave the machine.** DotAmi is self-hosted; anything
it reads from a ledger is read into the person's own database or read from files on disk and
not stored at all. No DotAmi server sits in the middle of anyone's books.

What it is for: today the map lights cards from figures the person *typed* (expected revenue,
a planned purchase). Connected to real records it can light them from figures that are
*true* — the sales-tax registration threshold from actual revenue, capital-cost classes from
actual purchases, the salary-versus-dividend fork from actual profit — and every derived
figure shows the rows it came from. It still never files, never recommends.

In order of least trust required:

1. **File imports.** Excel and CSV exports from accounting software — QuickBooks Online,
   Xero, Wave, FreshBooks and Sage all offer them. A row mapping the person confirms —
   categorisation is theirs, the app proposes nothing it has not shown. The file is read and
   not kept; the totals are. Bank and card records are not read (decided 2026-09-24; kept as
   an idea for forks in [connectors/README.md](connectors/README.md)).
2. **Local adapters.** Read-only readers for ledgers that live on disk — plain-text
   accounting files, desktop accounting databases — through one typed **facts interface**
   the engine reads (revenue by period, purchases by class, payroll, payments to owners).
3. **Anything with a login** (QuickBooks Online, Xero, payroll, a spreadsheet, a CRM) —
   reached by the **person's own agent** through the MCP server or official command-line
   tool that product already has, and written into DotAmi as proposed facts the person confirms. DotAmi holds no
   tokens and ships no vendor list; see §8 and the design.

Design, with eight scenarios and the facts schema:
[docs/architecture/connectors-and-agents.md](architecture/connectors-and-agents.md).

Open: the ledger model (accounts, transactions, periods, entities — a person with two
ventures has two sets of books); partial and fiscal years; a privacy audit of every import
path before it merges; how a retracted fact shows on a card that lit from it.

## 6. Complex tax strategies and business structures — as roadmaps

The strategies the well-advised use are mostly not secrets; they are sequences of ordinary
provisions applied in a particular order under particular conditions. Each becomes **a
roadmap of its own**: the structure it produces, the steps in order, the conditions on each,
the elections and filings involved (named and cited — never filed), the costs, and the
audit and anti-avoidance read stated plainly, with the provision's own words one click away.

Candidates for Canada, each to be written under the citation rules (none is an entry yet):
holding company + operating company; the small business deduction and how it is reduced;
salary versus dividends; income splitting and the rules that limit it; the lifetime capital
gains exemption on qualifying small-business shares; the estate freeze; the family trust;
intercorporate dividends and the anti-avoidance rule around them; using losses across a
group; the capital dividend account; shareholder loans; tax-deferred rollovers and
reorganisations; retirement vehicles in the corporate context; leaving the country. Other
jurisdictions bring their own list.

What these need from the app: **multi-entity ventures** (a structure spans more than one
company — the ideas DB's cross-references are the seed), sequencing across tax years, and a
"check first" state that is honest about the facts the map cannot know.

Open: how to draw a multi-entity structure on the map; how each node carries its audit read
without softening it; which facts from §5 each strategy needs before it can light.

## 7. DotAmi as an MCP server — the map any agent can read

Today a coding agent reaches DotAmi through `GET /api/readout`. Speaking the Model Context
Protocol turns that into tools any MCP client can call — Claude Code, Claude Desktop, or
whatever the person runs: `readout`, `list_ventures`, `list_statements` / `add_statement`,
`law_provision` ("Show the words"), and — as §2, §3 and §5 land — `set_progress`,
`add_question`, `propose_facts`. The server never confirms a fact, never edits a catalog,
never changes a branch pick; those stay human clicks in the cockpit. Read-only tools first
(a "walk my map and tell me what's stale" review works the day they land), writes after.
Design and the tool table: [connectors-and-agents.md](architecture/connectors-and-agents.md) § C.

## 8. Dependencies, in one place

- §4 (jurisdictions) before any non-Canadian roadmap in §1.
- §5 (records) needs the facts interface; §6 (strategies) lights from it; §7 (MCP) is how
  facts arrive from anything with a login.
- §6 needs multi-entity ventures, which build on the ideas DB.
- §7's read-only tools depend on nothing; its write tools depend on §2, §3, §5.
- Authentication and tenant isolation are **not** on this list: DotAmi is designed to be run
  by the person, for the person, on their own machine — and their agent is theirs too.
