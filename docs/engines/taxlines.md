# Tax lines (`lib/engines/taxlines/v2026/`)

Last updated: 2026-10-08 ([8f], first catalog entries)

## What it holds

Which line of a CRA form each of DotAmi's tax-form figure kinds goes on. Today: the four totals of
Form T2125 (Statement of Business or Professional Activities).

| Catalog id | Figure kind (permanent) | 2025 line | Printed beside it on the 2025 form |
|---|---|---|---|
| `t2125-gross-business-income` | `business-gross-income` | 8299 (Part 3C, page 2) | Gross business or professional income |
| `t2125-total-business-expenses` | `business-total-expenses` | 9368 (Part 4, page 3) | Total expenses |
| `t2125-net-business-income-before-adjustments` | `business-net-income-before-adjustments` | 9369 (Part 4, page 3) | Net income (loss) before adjustments |
| `t2125-net-business-income` | `business-net-income` | 9946 (Part 5, page 3) | Your net income (loss) |

Every line is cited to the CRA's 2025 form (`t2125-25e.pdf`, read 2026-10-08) and, where the guide
has a section on that line, to Guide T4002 (2025, chapter pages dated 2026-04-16, read 2026-10-08).
The guide has no section of its own for line 9368; the form defines it.

## How it reasons

- **Kinds are named for what the amount means, never for a line number** (the maintainer's
  decision, 2026-10-07). The CRA can renumber a line from one year's form to the next, so a figure kind like `t2125-8299` could go out of date. Catalog ids follow the
  same rule; `tests/engine-integrity.spec.ts` fails on an id that contains its line number.
- **A line is known one tax year at a time.** Each entry lists `yearsRead`: the years a person has
  read that year's form, each with its own line number, printed label, form version and citations.
  For any other year the answer is "not read yet", never the nearest year's number
  (`taxLineForYear` in `index.ts`; the screens' words are `lib/figures/tax-line.ts`). Years are
  read in stages, starting with 2025, and a year is added when someone needs it (the maintainer's
  decision, 2026-10-07).
- **One list of lines.** The return reader (`lib/figures/return/lines.ts`) reads its line numbers and
  labels from this catalog (the newest year read), so the reader and the store can't disagree.
- **Line 8299 is not the GST/HST card's revenue.** Line 8299 is built from gross sales including
  the GST/HST collected (amount 3A) minus the GST/HST, provincial sales tax, returns, allowances and
  discounts (amount 3B). It is kept as its own kind, and the small-supplier rule
  (`lib/brain/records.ts`) never reads it; `tests/brain-records.spec.ts` checks all four kinds.
- **A figure remembers its tax year, and the form and line as read.** `Figure.taxYear` is required
  for these kinds; `Figure.formLine` ("T2125 8299") is set only when the figure was read from a
  return, so a line printed on an older form stays what that form said. For a year the catalog has
  read, a form line that doesn't match the catalog's line for that kind is refused (a mix-up, not a
  renumbering).

## Adding a year

1. Read that year's T2125 (the standard-print PDF on the CRA's T2125 page) and the guide for the same
   year: find each line, its printed label and where it sits.
2. Add a `yearsRead` element to each entry, the form itself as the first citation, with the date you
   read it. If a number changed, the entry keeps its id and figure kind; only the year's `line` differs.
3. `npm test` (`tests/engine-integrity.spec.ts`) checks the shape; you check that the source says
   what the entry says.

## Not here yet

- The T1 line each total is carried to (13499/13500 and the professional and commission lines):
  printed on the form and noted in the citations, kept as data when the tax sheet needs it.
- The T2125 expense lines, business-use-of-home (9945) and capital cost allowance (9936).
- The farming (T2042) and fishing (T2121) forms, and every other country.
