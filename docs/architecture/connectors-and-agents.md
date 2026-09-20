# Connectors and agents — how DotAmi reaches accounting software, financial records and any other tool

Status: design, 2026-09-20. Nothing here is built. It expands [roadmap §5](../roadmap.md)
(records, local-first) and adds §7 (DotAmi as an MCP server). Scenarios first, then the
shape that makes all of them possible, then what has to exist for each.

## The one rule everything below obeys

**The records never leave the machine, and DotAmi holds no one's tokens.** DotAmi is
self-hosted, single-user, and runs no model of its own beyond the optional intake parser.
The reasoning agent — Claude Code, Claude Desktop, or any client that speaks the Model
Context Protocol — is the person's, runs where they choose, and is already the thing that
connects to their other tools. So DotAmi does not grow a connector for every accounting
package. It does two things instead:

1. **Speaks MCP as a server** — the map, the ventures, the person's statements, the law
   store and (later) progress and facts become tools the person's agent can call.
2. **Reads local files** — bank and accounting exports on disk, read-only, no credentials.

Everything with an API and a login (QuickBooks Online, Xero, Wave, FreshBooks, a bank, a
payroll provider, a spreadsheet) is reached by the **agent**, through whatever MCP server the
person has installed for it, and the figures arrive in DotAmi as **typed, dated, sourced
facts the person confirms**. The rules engine then lights cards from facts the same way it
lights them from typed answers today — deterministically, with the source one click away.

## Scenarios

Each is written as the person would live it. *Needs* lists the pieces from the next section.

**S1 — The GST line, from a bank export.** A sole proprietor downloads six months of
business-account transactions as CSV and drops the file on the cockpit. DotAmi reads it,
proposes a mapping (deposits → revenue, the rest → expenses by a category the person
picks), shows the rows, and the person confirms. The **GST/HST small-supplier threshold**
card stops saying *check first* and shows "$27,400 of taxable supplies in the last four
quarters · from your records · 212 rows" — and turns amber at $30,000. No agent, no login.
*Needs:* file importer (CSV/OFX), facts interface, "from your records" chip.

**S2 — Salary versus dividends, from real profit.** An incorporated owner's agent has the
QuickBooks Online MCP server installed. In Claude Code they say: *"read my DotAmi map for
Northwind Fabrication and pull this year's P&L from QuickBooks."* The agent calls DotAmi's
`readout`, calls QuickBooks for the profit-and-loss, and calls DotAmi's `propose_facts` with
net income by quarter and owner draws. DotAmi shows the proposed facts on the cockpit with
their source ("QuickBooks P&L, 2026-01-01 → 2026-09-20, imported by your agent"); the
person confirms. The **salary vs. dividends** fork (roadmap §6) now lights from actual net
income, with the small-business-deduction threshold checked against it. The agent then reads
the readout again and lists the questions for the accountant. *Needs:* MCP server (`readout`,
`propose_facts`), facts interface, the §6 roadmap.

**S3 — The van, from the purchase ledger.** A Wave export (CSV) lists a $12,000 used van
bought 2026-05-14. The importer proposes "capital purchase · vehicle · $12,000 · 2026-05-14";
the person confirms and picks the class hint. The **Motor vehicle expenses** card shows the
purchase, the right capital-cost class appears beside it instead of *Class 50 — computer
equipment* (issue #10), and the *in use before 2027* time-box is checked against the real
date. *Needs:* file importer, facts interface, the cited vehicle-class catalog entry.

**S4 — Payroll turns a branch real.** The person's agent has a payroll MCP (Wagepoint,
QuickBooks Payroll, or a spreadsheet). It proposes facts: first pay run 2026-08-15, two
employees, monthly remittance amounts. **Hire first employee** flips to *done*; the
payroll-remittance and record-keeping compliance nodes light *applies*; the Canada-Alberta
Job Grant card's *check first* now says why. *Needs:* MCP server, facts interface, progress
(roadmap §2).

**S5 — Two companies, one map.** The person has an operating company and is asking about a
holding company. Entity facts (two corporations, shareholdings, intercorporate payments) come
from the agent or are typed. The **holding company + operating company** roadmap (§6) draws
the structure across the two ventures already cross-referenced in `/ventures`, and every step
carries its audit read. *Needs:* multi-entity ventures, §6 roadmap, facts interface.

**S6 — Plain-text books.** Someone keeps their books in a ledger/hledger journal or a GnuCash
file. A local adapter reads it read-only — no export step — and yields the same facts as S1.
*Needs:* local adapters behind the same facts interface.

**S7 — The agent as the reviewer.** No import at all. The person says: *"walk my map and tell
me what's stale."* The agent calls `readout`, `list_statements`, `law_provision` for each
citation, checks `lastVerified` dates against today, and writes its findings into the
venture's questions (roadmap §3) — never into the map itself. DotAmi computed nothing new;
it was the reliable thing to read. *Needs:* MCP server only.

**S8 — Any tool the person wants.** A CRM, a calendar, a spreadsheet of side-project income,
a personal-finance app. If the person's agent can reach it, it can propose facts to DotAmi.
DotAmi never needs to know the tool exists; it needs the fact to be typed, dated, sourced and
confirmed. *Needs:* the facts interface being open — a documented schema, not a list of
supported vendors.

## The shape

```
 person's agent (Claude Code, Claude Desktop, any MCP client)
   │  MCP client to:   QuickBooks · Xero · bank · payroll · sheets · CRM · …  (their servers, their tokens)
   │  MCP client to:   DotAmi  ──────────────────────────────────────────────┐
   ▼                                                                         │
 DotAmi (self-hosted, single user, no model)                                 │
   ├─ MCP server ─── tools: readout · list_ventures · list_statements ·      │
   │                        add_statement · law_provision ·                  │
   │                        propose_facts · list_facts · set_progress        │
   ├─ local importers ── CSV / OFX / QFX / accounting exports / ledger files (read-only)
   ├─ facts store ────── typed · dated · sourced · confirmed-by-the-person · in their Postgres
   └─ rules engine ──── lights cards from answers AND facts; every derived figure shows its rows
```

**Why the agent and not DotAmi holds the connections:** the agent already has them; adding
them to DotAmi would mean storing tokens, running OAuth flows, and shipping a vendor list
that goes stale — the opposite of self-hosted and local. It also keeps the constraint that
DotAmi runs no model: the agent proposes, the person confirms, the engine decides.

**Why facts and not "sync":** a fact is a claim with a source and a date, exactly like a
catalog citation. The engine can reason about it; the person can see where it came from and
retract it; nothing is overwritten silently. A sync would make the ledger the truth and hide
the provenance.

## What has to exist

### A. The facts interface (first — everything else lands on it)

A `Fact` is stored in the person's database, per venture:

```ts
{
  id: string;                       // permanent
  ventureId: string;
  kind: "revenue" | "expense" | "capital-purchase" | "payroll" | "owner-draw" | "dividend"
      | "gst-collected" | "gst-itc" | "entity" | "shareholding" | "other";
  period?: { from: "2026-07-01", to: "2026-09-30" };   // or
  date?: "2026-05-14";                                 // for one-off facts
  amount?: { value: 12000, currency: "CAD" };
  fields: Record<string, string | number | boolean>;   // kind-specific, typed (class hint, headcount, …)
  source: {
    via: "file" | "agent" | "typed";
    connector?: string;               // "quickbooks-mcp", "csv:bank-export", "hledger"
    ref?: string;                     // "P&L 2026-01-01..2026-09-20", "rows 12–224"
    importedAt: string;               // ISO datetime
  };
  status: "proposed" | "confirmed" | "retracted";       // only confirmed facts reach the engine
  confirmedAt?: string;
}
```

The evaluator gets one new input beside the profile: `facts: Fact[]` (confirmed only). Where
a fact answers a question the profile only estimated — revenue against a threshold, a
purchase against a class, payroll against a compliance rule — the fact wins, the card says
*from your records*, and the detail lists the rows. Nothing else in the engine changes.

Open: partial years and fiscal years; currency for other jurisdictions; how "retracted"
shows on a card that lit from it; a privacy audit of the store (facts are the most sensitive
thing DotAmi will ever hold).

### B. Local importers

`CSV` (bank and card exports; configurable column mapping the person confirms once per
source), `OFX/QFX` (bank standard), accounting exports (QuickBooks, Xero, Wave CSV — as
documented by each vendor, no reverse-engineering), and adapters for on-disk books
(ledger/hledger journals, GnuCash SQLite). All read-only; a file is never modified or
copied beyond the facts derived from it. Each importer is a folder with a README stating
what it reads, what facts it yields, and its test fixture (a synthetic file — never a real
person's export).

### C. DotAmi as an MCP server

A small server (`npm run mcp`, stdio transport first; HTTP later) exposing:

| Tool | What it does | Writes? |
|---|---|---|
| `list_ventures` | the `/ventures` list | no |
| `readout(ventureId?)` | today's `GET /api/readout` | no |
| `list_statements` / `add_statement(text, saidAt)` | the person's dated words | append only |
| `law_provision(source, label, sub)` | "Show the words" | no |
| `list_facts(ventureId)` | confirmed + proposed facts | no |
| `propose_facts(ventureId, facts[])` | queues facts as **proposed**; the person confirms in the cockpit | proposed only |
| `set_progress(ventureId, nodeId, state)` | done · doing · not for me (roadmap §2) | yes |
| `add_question(ventureId, text, citation?)` | roadmap §3 | append only |

The server can never mark a fact confirmed, never edits a catalog, never changes a branch
pick. Confirmation is a human click in the cockpit — that is the line between "the agent
proposed" and "the person said". Resources: the catalogs (read-only) so an agent can cite
the same entry the card cites.

### D. The cockpit side

A **Facts** section in the node detail and the left rail: proposed facts wait with a
*confirm / edit / discard* row each; confirmed facts show source and date; every figure the
engine derived shows *from your records · N rows*. A **Sources** page (or a rail block)
listing what has been imported, from where, when — and a one-click *forget this source* that
retracts its facts.

### E. Connector notes as contributions

`docs/connectors/<name>.md` per source: what it is, how facts get from it to DotAmi (file
export / an existing MCP server / a local adapter), which fact kinds, the privacy read, the
status (idea · tested · in the repo). This is the contribution format for "connect DotAmi to
X" — a page, a fixture, and if needed an adapter — not a vendor integration inside the app.

## Order and dependencies

1. **A** the facts interface + the engine reading confirmed facts + the *from your records*
   chip. Nothing visible changes until a fact exists; the CSV importer (B, first format) is
   the proof.
2. **C** the MCP server with the read-only tools first (`readout`, `list_*`, `law_provision`)
   — S7 works the day this lands; then `propose_facts`, `set_progress`, `add_question` as
   §2/§3 land.
3. **B** more formats and the on-disk adapters, each with a synthetic fixture.
4. **D** the cockpit surfaces, alongside 1–3.
5. **E** from the first connector onward.

Depends on: roadmap §1 (nodes as data, so facts can point at node ids that are permanent),
§2 (progress), §3 (questions), §6 (strategies that need entity facts). Does **not** depend
on authentication — this is all one person, one machine, one agent they run themselves.
