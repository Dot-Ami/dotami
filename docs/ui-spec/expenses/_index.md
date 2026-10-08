# Your expenses page (`/expenses`) — page overview

Last updated: 2026-10-08 (new page, [8i] typed records, with the maintainer's decisions of 2026-10-08)

**Route:** `/expenses` · `/expenses?idea=<idea id>` (opened on one idea) · **Component:**
`components/expenses/expenses-page.tsx` (+ `expense-form.tsx`, `expense-review.tsx`) ·
**API:** `GET /api/expenses` (every record of the person's; `?venture=<id>` one idea; `?unattached` the
ones not attached) · `POST /api/expenses/propose` · `/agree` · `/discard` · `/retract` · `/attach` ·
`GET /api/ventures` (the ideas' names) ·
**Data:** Prisma `Expense` (`lib/expenses/store.ts`, checks in `lib/expenses/validate.ts`); the screen's own
logic (typed boxes to a record, the lines under a record) in `lib/expenses/display.ts`, tested in
`tests/expenses-display.spec.ts`. Design: `docs/architecture/expense-records.md` (section 0 has the
decisions); privacy: `docs/architecture/figures-privacy-review.md` (expense section).

**Decided 2026-10-08:** a record can be kept "not attached yet" and attached to an idea later; type
many, agree once (a review list with **Agree to all N** that lets the person untick any); an optional
business share, the person's own number; refunds and credits kept either way, the person's choice.

## What it does

The person's own record of single business expenses, on this computer. One place for every record,
filtered by idea. Nothing typed here is kept until the person agrees to it; anything an agent or a file
proposed waits here for the same click. The page never picks a category, never sets a business share,
never works out a "deductible" amount and never says how a refund is taxed. No URL ever holds a
record's words or amounts: only an idea's id, in `?idea=`.

| Control | Behaviour | Persists to |
|---|---|---|
| **← Your ideas** (nav) | opens `/ventures` | — |
| **Settings** (nav, right) | opens `/settings` | — |
| Intro line | "Each business expense you keep, one record at a time, on this computer. DotAmi keeps what you type and agree to. It never picks a category, never sets the business share, and never says what is deductible or how a refund is taxed. Not tax advice." | — |
| **Show** select | **All your records** · **Not attached to an idea yet** · one entry per idea (by name). Filters the waiting banner and both lists below; it changes nothing stored. Opened from an idea's card (`?idea=<id>`) it starts on that idea; an id that isn't one of the person's ideas falls back to All | — |
| **N records waiting for you to agree** + **Review** | amber banner (a region named "Waiting for you") when any record in view is `proposed`: from an agent, a file, or typed records whose agree step failed. **Review** opens the review list (below) for them, each row with **Turn down** and a line "From <source> · for <idea>" or "· not attached to an idea" | — |
| **This is** (radio) | **A purchase** (start) · **A refund or credit**. A refund shows the next three controls and relabels the boxes ("Day it came back", "Amount that came back", "Who it came back from") | — |
| **Keep it as** (radio, refunds only) | **A negative amount on a record** ("The record holds minus the amount that came back.") · **A separate refund record, linked to the purchase** ("The purchase keeps its own amount; the refund sits beside it."). Under them: "Either way it keeps the refund's date, the purchase it came from, the GST/HST part and the credit note when you give them. Which way is yours to choose; DotAmi doesn't say how a refund is taxed." | the record's `recordKind` (`expense` with a negative amount, or `refund`) |
| **The purchase it came from** select (refunds only) | the person's purchases still in play (agreed or waiting, above zero), "day · paid to · amount", newest first. Optional for a negative amount ("None in DotAmi"); needed for a separate refund record | `refundOfId` |
| **Credit note (optional)** (refunds only) | the credit note's details as typed ("its number and date"), up to 200 characters | `creditNote` |
| **Day** | a date box, latest allowed is the person's own today (`useLocalToday`); a later day is refused ("That day hasn't happened yet.") | `date` |
| **Amount** | typed without a sign ("45.99", "1,250"); a minus sign is refused with what to do instead. For a refund kept as a negative amount the record holds minus this amount, by that choice only | `amountCents` |
| **Currency** | three letters, CAD to start; nothing is converted | `currency` |
| **Paid to** · **What for** | the person's words, 1 to 120 and 1 to 200 characters | `paidTo`, `whatFor` |
| **Category (optional)** | the person's own word, up to 80 characters; DotAmi never fills it in | `category` |
| **Business share % (optional)** | a whole percent from 1 to 100 (a % sign is fine); blank means none. Hint: "Yours to set: a whole number, 1 to 100. Kept beside the full amount." 0, over 100 or a fraction is refused with the limits | `businessSharePercent` |
| **GST/HST part (optional)** | the GST/HST included, as an amount; never more than the amount | `gstHstCents` |
| **The seller's address and GST/HST number (optional)** (a closed details box) | the address (up to 300 characters, line breaks allowed) and the seller's GST/HST number (nine digits, optionally RT and four more; shape only) | `sellerAddress`, `vendorGstNumber` |
| **Add to the list** | checks the boxes in the window (the first problem is shown in amber and its box focused) and adds the record to **Typed, not kept yet**; nothing is sent. The form clears for the next one, keeping the day, currency and refund choice. "Nothing is kept until you agree. No bank or card numbers here." | — (the window only) |
| **Typed, not kept yet · N** list | each typed record: day · paid to — what for · amount, with its facts (share, GST/HST part, how a refund is kept) and **Edit** (back into the form, off the list) / **Remove**. Lives only in this window: not in the data file, not in browser storage; closing or reloading the window forgets it ("Kept only once you agree. Closing this window forgets this list.") | — (the window only) |
| **For** select (on the typed list) | **Not attached to an idea yet** or an idea; starts on the idea the page was opened on, else not attached. Every record on the list goes to that idea when agreed | the records' `ventureId` |
| **Review N** | opens the review list for the typed records | — |
| **Review list** (dialog) | "Agree to keep these records?" (typed) or "Agree to these proposed records?" (waiting). Every record with a tick, all ticked to start, its amount and its facts. Unticking leaves a record out: "1 left out: it stays where it is" (typed ones stay on the typed list; waiting ones stay waiting). Above the buttons, every time: "Double-check what DotAmi did, and how, before you agree." **Agree to all N** (N = the ticked ones; off at 0) — for typed records it proposes them (`POST /api/expenses/propose`, source "typed by you", the **For** idea or null) and agrees to them (`POST /api/expenses/agree`) in the same click; "Kept N records." then shows. If agreeing fails after proposing, they move to the waiting banner and the page says so. A refusal names the record by its title, never by a position. **Not now**, **Close**, Escape and a click outside agree to nothing. Over 20 records, **Agree** waits until the list has been scrolled to the end ("Scroll through all N to agree"), as the figures' agree prompt does | `Expense` rows, `proposed` then `confirmed` |
| **Turn down** (waiting list rows) | `POST /api/expenses/discard` for that record; it leaves the lists | `status` → `discarded` |
| **Records you agreed to** list | agreed records in view, newest day first: day · paid to — what for · amount (a negative amount keeps its minus) · "For <idea>" or "Not attached to an idea yet" · "from <source>" · "edited by you". Under it the facts: "Business share: 40% (your number) of the full $45.99" (never a multiplied-out amount), "GST/HST part: $1.00", "Category: …", "Refund record, linked to <day · paid to · amount>" or "Refund or credit kept as a negative amount[, linked to …]", "Credit note: …". A purchase with refunds pointing at it adds "Refunds linked to it: $20.00 on 2026-10-08; $5.00 on …" (waiting or taken back ones say so). Empty: "None here yet." | — |
| **Attach to** / **Move to** select + **Attach** / **Move** (on each agreed record) | moves the record to an idea, or back to not attached (`POST /api/expenses/attach`, page-only); the button is off until a different choice is picked. The record keeps its state, values and agreed day | `ventureId` |
| **Record a refund for this** (on an agreed purchase) | fills the form as a refund of that purchase: **A refund or credit**, the purchase chosen, its payee and currency, today's date, and the **For** select set to the purchase's idea; the person picks the way and types the rest | — |
| **Take back** (on each agreed record) | asks inline "Take this record back? It stays listed as taken back." **Take back** / **Keep**; Take back → `POST /api/expenses/retract` | `status` → `retracted`, `retractedAt` |
| **Taken back** list | greyed, with "taken back <day>" | — |

## What it deliberately does not do

- No bank or card number field, no receipt yet (the receipts slice: 10 MB cap, shown inside DotAmi,
  with its own security design first; `expense-records.md` sections 0 and 6).
- No category, business share or "deductible" mark chosen by DotAmi, and no deduction or tax total.
- No ranking or ordering by amount: newest day first, nothing else.
- No delete: taking back and turning down keep the row (the Delete menu is a separate story, [8d]).

## Browser-tested (`e2e/expenses.spec.ts`)

Three tests on the production build: from an idea's card, type two purchases (one with a 40% share),
untick one in the review, **Agree to all 1** — the kept one shows the share beside the full amount on the
idea, the unticked one stays typed, a reload keeps the record and forgets the typed list, and no address
holds a typed word or amount; a record kept not attached, attached later, then a separate refund record
and a negative-amount refund, each linked to the purchase, with the purchase listing both; an agent's
proposal waits (an outside caller gets 403 from agree and attach) until **Agree to all 1** in the waiting
review.
