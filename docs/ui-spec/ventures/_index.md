# Ideas page (`/ventures`) — page overview

Last updated: 2026-10-07 (Add from a file gains the optional Type column, so a payment isn't counted as a second sale; Add from a file asks where the file is from first; 2026-10-06: how old each figure is, [8e] first slice; Add from a file, [8c]; Your figures + agree prompt, [8a]/[8b]; the rest S2.5.4i, verified in the pane 2026-09-16)

**Route:** `/ventures` · **Component:** `components/ventures/ventures-page.tsx` ·
**API:** `GET /api/ventures` · `PATCH /api/ventures/[id]` · `POST|DELETE /api/ventures/[id]/links`
**Data:** `lib/db/ventures.ts` → Prisma `Venture` (+ `stage`, `notes`) and `VentureLink`; figures: `components/ventures/figures-panel.tsx` + `agree-prompt.tsx` + `file-drop.tsx` (reads files in the window via `lib/figures/file/`) → `/api/figures/*` → Prisma `Figure`. Ages and the person's-own-day dates: `lib/figures/age.ts` (pure, tested in `tests/figures-age.spec.ts`), kept current while the window is open by `lib/figures/use-local-today.ts`.

**Decided 2026-09-14:** every business idea is labelled, saved and stored, and ideas can
cross-reference each other — so a new project lands next to what is already in progress
instead of starting from nothing.

## What it does

One card per saved venture, **ordered by when it was last touched** — never by any merit the
app computed (charter: DotAmi supplies information and options; the person supplies judgment). A
venture becomes a card the first time "Save / resume" is pressed on its map.

| Control | Behaviour | Persists to |
|---|---|---|
| **Settings** (nav, right) | opens `/settings` (added 2026-10-05, [7g]) | — |
| **New idea →** | resets the session journey, opens `/intake` | — |
| **Stage** select (Idea · Prototype · First customers · Established) | `PATCH { stage }` on change | `Venture.stage` |
| **Your notes** textarea | `PATCH { notes }` on blur, only if changed; "Saved." / "Save failed." under it | `Venture.notes` — their words, never summarised |
| **Open in cockpit →** | `/cockpit?venture=<id>` — that venture wins over the session and becomes the session | — |
| **Your figures** list | loads `GET /api/figures?venture=<id>` (only the idea's id is in the address; amounts travel in bodies). Confirmed totals, newest period first: kind · period · amount · "from <source> · N rows" · "edited by you" · **Retract**. Under each, a grey line, "ended 6 months ago · agreed 2026-10-06" ([8e]): whole calendar months from the period's last day to the person's own today (days under a month; "ends today", "ended yesterday", "ends next month"), and the day the person agreed in their own time zone, never the UTC day. A figure whose period ends after today also gets an amber line: "Check this date. This period ends after today (2026-10-31 is later than 2026-10-06), so no card counts it until it has ended." Retracted ones sit greyed under "Retracted" with the same age and "retracted <their own day>". Empty: "No figures yet." (added 2026-10-06, [8a]) | `Figure` rows (status `confirmed` / `retracted`) |
| **Retract** (on a figure) | asks inline "Retract this figure? Cards go back to your estimate." **Retract** / **Keep** (no browser dialog); Retract → `POST /api/figures/retract` | `Figure.status` → `retracted`, `retractedAt` |
| **N figures waiting for you to agree** + **Review** | amber banner when any figure is `proposed` (from an importer, the Lens, an outside agent, or typed here); Review opens the agree prompt | — |
| **Add a figure** (What · From · To · Amount · Currency) | every input has a label. Amount is read as cents ("12,500" or "12500.50"; anything else shows that hint). Submit → `POST /api/figures/propose` with source "typed by you", then **the agree prompt opens** — a typed figure is not confirmed by typing it | `Figure` row, status `proposed` |
| **Add from a file** ([8c], added 2026-10-06) | opens the panel on its first question (next row); nothing can be dropped or chosen yet. Once the answer is "accounting software", it shows a drop area plus **Choose a file** (.xlsx or .csv) and the line "It's read here, on this computer, and never kept — only the monthly totals you agree to are saved." A file over 10 MB is refused before a byte is read | — |
| **Where is this file from?** (added 2026-10-07) | the first thing in the panel, asked for **every** file: two buttons, **Accounting software or a spreadsheet you keep** (hint: QuickBooks, Xero, Wave, FreshBooks, Excel) and **A bank or credit card account**. No drop area, no file chooser and no file input exist until the first is pressed. A file dropped on the panel now is ignored without being read (no bytes, no name, nothing parsed) and the question stays. The answer is never remembered: not after **Cancel**, not after a review, not in browser storage | — |
| **A bank or credit card account** (the answer) | an amber notice: "DotAmi can't add bank or card statements yet. When it can, you'll pick which deposits are business revenue, after a warning about what DotAmi would keep. Nothing from your file was opened or kept." With **Back** and **Cancel**. Still no file input or drop area; a file dropped here is ignored unread. Nothing is stored | — |
| **Back** (on that notice) | returns to the question | — |
| **Accounting software or a spreadsheet you keep** (the answer) | shows "From: Accounting software or a spreadsheet you keep" with **Change**, then exactly the file drop below, for one file. The moment a file is accepted the drop area and **Choose a file** go away, and a file dropped on the panel is ignored unread; for the next file the question comes back | — |
| **Change** (also **Choose another file**, shown beside a refusal) | returns to the question and clears everything already read from a file (the rows, the picks, the file name, the currency back to CAD); a read still in flight is dropped. Off while a review is being sent | — |
| File drop — reading | the file is read inside the window, in memory (`lib/figures/file/read-file.ts`, loaded only when a file is picked); its bytes never go to the server. A refusal shows in amber with what to do instead — macros, an old .xls or a password-locked workbook, not a spreadsheet, empty, too big, a quote left open — and nothing is kept | — |
| **Sheet** | a select, shown only when more than one sheet has rows | — |
| **Column names are in row** · **Date column** · **Amount column (revenue)** | selects, every one labelled. Filled in only when the column names make it clear, with "DotAmi guessed these from the column names — check them"; otherwise empty until the person picks. A "Total" column is never pre-filled beside a tax column. Under the amount select: "If the file also has a tax column, check whether this one includes the tax." | — |
| **Type column (optional)** | a select beside the amount column, shown once the column names are chosen. Its empty choice reads "None — count every row". Pre-filled only when a column header is exactly "Transaction Type" (QuickBooks' name; any case or spacing; two such columns, a bare "Type" or any other header pre-fill nothing; the cells are never used to guess). When set, rows whose type cell is exactly "Payment" or "Deposit" (whole cell, any case; "Paiement" and "Dépôt" too, assumed) are left out of the totals and listed as left out (next row), so a sale and the payment received for it aren't both counted. Under it: "Some files list a sale and the payment received for it as two rows. With a type column, rows typed Payment or Deposit are left out so the sale isn't counted twice. That also leaves out a Deposit that is the only record of a sale, so check the left-out list. Choose None to count every row." Rows of every other type (Invoice, Sales Receipt, a negative Credit Memo…) count as they do without it. Nothing about it is stored: it is a pick on this screen only, and only monthly totals are proposed | — |
| **Dates are written** | shown only when the dates could be read two ways (03/01/2026): "Month first — 03/01/2026 is March 1" / "Day first — 03/01/2026 is 3 January". No totals until it's answered | — |
| **Amounts are written** | "1,234.56" / "1 234,56", preset from what the file uses | — |
| **Currency** | three letters, CAD to start; applied to every total from the file; nothing is converted | — |
| Preview | one line per month: month · total · N rows. Then everything left out, by reason with its count and first row numbers (blank, a totals row, no date, a date but no amount, an amount DotAmi can't read, rows typed Payment or Deposit, left out because a Type column is chosen, with the QuickBooks reason and "choose None" if they are the person's own sales — only with a type column set, this month isn't over yet), and any month already waiting or agreed with the same total: "already in DotAmi — not proposed again" | — |
| **Review these N figures** | `POST /api/figures/propose` with source kind "file", the file name as its label and the rows counted, one figure per month carrying its own row count; then **the agree prompt opens**. Dropping a file confirms nothing | `Figure` rows, status `proposed` |
| **Cancel** | forgets the file and everything read from it, and the answer to the question | — |
| **Agree prompt** (dialog, [8b]) | "Agree to these figures?" Figures grouped "From <source>"; each row has its kind, period, an editable amount, currency and **Discard**, with the same "ended …" line and "Check this date" flag under it, so a mistyped year stands out before the person agrees ([8e]; no "agreed" day yet, because nothing is agreed). **Agree** → `POST /api/figures/agree` (edited amounts sent as `edits`); **No, I'll do it myself** → `POST /api/figures/discard` for everything shown. **Only Agree confirms a figure.** **Close**, Escape and a click outside confirm nothing — the proposals stay waiting. Over 20 figures: Agree stays off until the list has been scrolled to the end ("Scroll through all N to agree"). Errors show inside the prompt and nothing closes | `Figure.status` → `confirmed` (`editedByPerson` + new amount when edited) or `discarded` |
| **Cross-references** list | one line per link: kind · other idea (link to its cockpit) · their reason · remove | `VentureLink` |
| **+ Link** (kind · other idea · why) | `POST /links { toId, kind, note }`; one row per pair (re-linking updates it) | `VentureLink` |

Link kinds: **Sister company · Overlaps with · Feeds into · Related to.** A link is stored once
and shown on both cards.

## What it deliberately does not do

- No ranking, no score, no "best idea" — the order is recency of touch.
- No editing of the venture's facts (type, province, tags, numbers) — those live on the intake
  and the map, where the evaluator reads them.
- No "advice keyed to the kind of business" yet: the activity taxonomy is the spine for that
  and the evaluator already keys catalog entries on it; a cross-idea readout is the next
  story, not this page.

## Empty state

"Nothing saved yet. Describe one on the intake and press Save on its map." + the New-idea button.

## Verified 2026-09-16 (pane, `localhost:3000`)

Stage → Prototype and a note both landed in Postgres (`select name, stage, notes`); a second
idea created through the full intake → map → Save journey appeared with its tag,
capital flag and `structureSource = assumed` (the S2.5.4h bug fix, proven end to end); a
"Sister company" link showed on both cards and removed cleanly. Test data cleaned afterwards.
