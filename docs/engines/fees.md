# Official fees — Reasoning Conventions

Catalog: `lib/engines/fees/v2026/` (10 fees as of 2026-10-12) · Design:
[../architecture/future-cockpit.md](../architecture/future-cockpit.md) § 6, "The official fees catalog
and start-up cost lines as built" · Checks: `officialFeeProblems` and `feeReferenceProblems` in
`lib/engines/fees/v2026/validate.ts`, run by `tests/official-fees.spec.ts`

## What it holds

Every official fee DotAmi shows, each written once: what a government or regulator charges for
something, with the page that states the amount. A road's cost line or a way to incorporate names a fee
by its id (`feeId`) and never types the amount itself, so a fee that changes is changed in one place.
This is one of the three kinds of cost a screen shows (decision 2 of 2026-10-11): an *official fee*;
the other two, a *named* line the person prices and the person's own quote, are never in this catalog.

| Field | What it is |
|---|---|
| `id` | Permanent. `fee-` and its place, then what it is for: `fee-ca-incorporation-online`, `fee-ab-blue-seal-application` |
| `label` | What the fee is for, in plain words. A road line shows its own label |
| `place` | Where it applies, as an international code (`CA`, `CA-AB`; the maintainer's decision of 2026-10-11). It must be the place of its own source |
| `amountCents` | One amount in whole cents. Never a range, never an average, never a minimum |
| `per` | How often it is paid, only when the page says (`once`, `year`) |
| `onlyIf` | Only on a fee that applies only sometimes: the condition in plain words. A total leaves it out unless the person says the condition holds |
| `citation` | The page that states the amount, read by a person or checked by a tool ([citations.md](./citations.md)) |

## Authoring rules

1. **An amount the page states, inside the words the check found.** A fee checked only by a tool must
   have a quote with its amount as the page writes it (`$150`, `$150.00`, `$1,500`), and not as one end
   of a range (`$150-$200`, `from $150`). A $0 fee is exempt: pages say "no cost". Record a tool check
   only after `node scripts/check-quotes.mjs --url … --quote …` found every quote that day. Never take an
   amount from a search result's summary.
2. **A fee nobody could read is not in the catalog.** Alberta's registry fees sit in the Registry Agent
   Product Catalogue, which stops tools with a human check; never bypass it. Until a person reads them
   there, they stay named blanks on the cards that need them. A page that says a fee exists but names no
   amount (the Red Seal application) gives a named line, not a fee.
3. **Ids are forever.** `tests/official-fees.spec.ts` keeps the list of every fee id that has shipped.
   Rename a label freely; never an id. A new fee is added to the list.
4. **The place matches the source.** A `CA` fee cites a federal or CRA page (`jurisdiction: "CA"`); a
   `CA-AB` fee cites an Alberta page. The checks refuse a place that isn't an international code, an id
   that doesn't start with `fee-` and its place (`fee-ca-`, `fee-ab-`), and a place that differs from
   its source's.
5. **A road line copies, it never types.** Build a road's fee line with `feeLine(lineId, label, feeId)`
   and a way to incorporate's with `routeFeeLine` (`lib/engines/cfe/v2026/incorporation-routes.ts`).
   `feeReferenceProblems` refuses a line naming a fee that doesn't exist, or one whose amount, source or
   condition differs from its fee's; a test refuses a typed amount in any road file or in the
   incorporation routes.
6. **Every fee is used.** A fee no card shows doesn't belong here yet; the tests check that every fee is
   named by at least one road line or way to incorporate.
