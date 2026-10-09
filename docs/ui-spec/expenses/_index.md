# Your expenses page (`/expenses`) — page overview

Last updated: 2026-10-09 (HEIC photos kept as receipts and shown by the graphics chip, option D of the HEIC decoder review); 2026-10-08 (new page, [8i] typed records, with the maintainer's decisions of 2026-10-08; records of a deleted idea show here as not attached yet; receipts added and removed)

**Route:** `/expenses` · `/expenses?idea=<idea id>` (opened on one idea) · **Component:**
`components/expenses/expenses-page.tsx` (+ `expense-form.tsx`, `expense-review.tsx`) ·
**API:** `GET /api/expenses` (every record of the person's; `?venture=<id>` one idea; `?unattached` the
ones not attached) · `POST /api/expenses/propose` · `/agree` · `/discard` · `/retract` · `/attach` ·
`POST /api/expenses/receipt` · `/receipt/remove` · `GET /api/ventures` (the ideas' names) ·
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
| **Review list** (dialog) | "Agree to keep these records?" (typed) or "Agree to these proposed records?" (waiting). Every record with a tick, all ticked to start, its amount and its facts. Unticking leaves a record out: "1 left out: it stays where it is" (typed ones stay on the typed list; waiting ones stay waiting). Above the buttons, every time: "Double-check what DotAmi did, and how, before you agree." **Agree to all N** (N = the ticked ones; off at 0) — for typed records it proposes them (`POST /api/expenses/propose`, source "typed by you", the **For** idea or null) and agrees to them (`POST /api/expenses/agree`) in the same click; "Kept N records." then shows, N counted from what the server agreed to (any it skipped because they changed in another window or program add "N not kept: changed in another window or by another program since you opened the list."). If agreeing fails after proposing, they move to the waiting banner and the page says so. A refusal names the record by its title, never by a position. **Not now**, **Close**, Escape and a click outside agree to nothing. Over 20 records, **Agree** waits until the list has been scrolled to the end ("Scroll through all N to agree"), as the figures' agree prompt does | `Expense` rows, `proposed` then `confirmed` |
| **Turn down** (waiting list rows) | `POST /api/expenses/discard` for that record; it leaves the lists | `status` → `discarded` |
| **Records you agreed to** list | agreed records in view, newest day first: day · paid to — what for · amount (a negative amount keeps its minus) · "For <idea>" or "Not attached to an idea yet" · "from <source>" · "edited by you". Under it the facts: "Business share: 40% (your number) of the full $45.99" (never a multiplied-out amount; "your number" only for a record the person typed — an agent's or a file's says "(proposed by <source>)" while waiting and "(proposed by <source>, agreed by you)" once agreed), "GST/HST part: $1.00", "Category: …", "Refund record, linked to <day · paid to · amount>" or "Refund or credit kept as a negative amount[, linked to …]", "Credit note: …". A purchase with refunds pointing at it adds "Refunds linked to it: $20.00 on 2026-10-08; $5.00 on …" (waiting or taken back ones say so). Empty: "None here yet." | — |
| **Attach to** / **Move to** select + **Attach** / **Move** (on each agreed record) | moves the record to an idea, or back to not attached (`POST /api/expenses/attach`, page-only); the button is off until a different choice is picked. The record keeps its state, values and agreed day | `ventureId` |
| **Record a refund for this** (on an agreed purchase) | fills the form as a refund of that purchase: **A refund or credit**, the purchase chosen, its payee and currency, and today's date; the person picks the way and types the rest. The **For** select follows the purchase's idea only while the typed list is empty: it covers every record on the list, so with records already typed it stays as it was and the page says so ("The typed list stays for …; the purchase is for …. Change “For” above the list if this refund should go there too.") | — |
| **Take back** (on each agreed record) | asks inline "Take this record back? It stays listed as taken back." **Take back** / **Keep**; Take back → `POST /api/expenses/retract` | `status` → `retracted`, `retractedAt` |
| **Taken back** list | greyed, with "taken back <day>"; a record with a receipt shows the receipt line and **Remove receipt** (below), because taking a record back keeps its receipt | — |
| **Add a receipt** (on each agreed record with none; `components/expenses/receipt-line.tsx`) | opens a note first: "DotAmi keeps a copy of the file exactly as you give it, on this computer: anything printed on it (the last digits of a card, your name and address) is kept too. A JPEG, PNG, WebP or HEIC (iPhone) picture, or a PDF, up to 10 MB; DotAmi checks what is inside the file, not its name. A HEIC photo is shown with this computer's graphics chip, and some computers can't show one (it is kept either way). The copy is your own record; it says nothing about whether you can stop keeping the original." Then **Choose the receipt file** (a file picker; its type list is a hint only, HEIC included) and **Not now**. The window checks the size first (over 10 MB is refused without reading the file), then reads the file's first bytes (`lib/expenses/receipts/sniff.ts`; for a HEIC, DotAmi's own container reader in `lib/expenses/receipts/heic/`): anything that isn't a JPEG, PNG, WebP, HEIC or PDF, a HEIF burst, animation or layered picture, a HEIC whose container doesn't read or points outside the file, or a picture over 50 megapixels or 20,000 pixels a side, is refused in amber with what to do instead, and nothing is sent. Otherwise the bytes go as base64 to `POST /api/expenses/receipt` (page-only), which checks them again and keeps the copy under a name it makes up; the file's own name is never sent. Not shown on a waiting, turned-down record | a file in `receipts/`; a `Receipt` row |
| Receipt line (on a record with one) | "Receipt: PNG picture · 2.1 MB · added <day>" ("HEIC photo" for a HEIC) (the type DotAmi read from the bytes, never the file's name) and **Remove receipt**, which asks inline "Remove this receipt? DotAmi deletes its copy of the file; the record stays." **Remove receipt** / **Keep it**; Remove → `POST /api/expenses/receipt/remove`. **Show receipt** opens the viewer (below) | `Receipt` row and its file deleted |
| **Receipt viewer** (dialog "Receipt: <day> · <paid to>"; `components/expenses/receipt-viewer.tsx`) | "<PNG picture / PDF>, shown inside DotAmi from its copy on this computer. Nothing in it can be clicked or run." The bytes come from `POST /api/expenses/receipt/file` (page-only), and are checked again in the window: they must be the type DotAmi stored, and a picture within 50 megapixels and 20,000 pixels a side, before anything decodes them. A picture is shown by the browser's image decoder from a `blob:` address (alt "The receipt picture (W × H pixels)"); a HEIC photo (the line under the title adds ", drawn by this computer's graphics chip") is read by DotAmi's own container reader in a worker of DotAmi's own that can reach nothing, decoded there by the browser's video decoder on the graphics chip and shown as one picture in a canvas ("The receipt photo (W × H pixels)"), only when this button is clicked; where it can't be shown, it says so in amber, the photo kept: this computer can't show HEIC photos (with how to see it: the original on the phone), DotAmi doesn't draw this kind (10-bit, layered), or it couldn't show it and won't try a HEIC again until DotAmi restarts (also said for every HEIC after the graphics process stopped); a PDF is drawn page by page by pdf.js in a worker of DotAmi's own that can reach nothing, each page a picture in a canvas ("Page 1 of N"), at most 20 pages and at most 80 megapixels of pages in all; when fewer pages are drawn than the PDF has, it says so ("DotAmi shows the first 20 pages; this PDF has N. The rest are kept in the file.", with the number drawn, or "the first page" for one). A file changed on the disk since it was added, missing, of another type than kept, or too large to show says so in amber with what to do (remove the receipt and add it again). **Close**, Escape or a click outside closes it and lets go of everything it held. Security design: `expense-records.md` § 8 | — |

## What it deliberately does not do

- No bank or card number field.
- No HEIC is decoded except on **Show receipt**: not when it is added, not in a list, no thumbnail; and
  after one fails (or the desktop app's graphics process stops) none is tried again until DotAmi restarts.
- No receipt opens anywhere but inside DotAmi: never the computer's own viewer, never Chromium's PDF
  viewer, never a frame (the maintainer's decision of 2026-10-08; `expense-records.md` § 8). Nothing
  in a receipt can be clicked: a PDF's links and form fields aren't drawn as controls, and its
  JavaScript never runs.
- No category, business share or "deductible" mark chosen by DotAmi, and no deduction or tax total.
- No ranking or ordering by amount: newest day first, nothing else.
- No delete here: taking back and turning down keep the row. The Delete menu on *What DotAmi knows
  about you* deletes every record at once. Deleting ideas there keeps their records, which then show
  here as "Not attached to an idea yet" (the maintainer's decision of 2026-10-08).

## Browser-tested (`e2e/expenses.spec.ts`)

Five tests on the production build (and three more in `e2e/receipt-viewer.spec.ts`, below): from an idea's card, type two purchases (one with a 40% share),
untick one in the review, **Agree to all 1** — the kept one shows the share beside the full amount on the
idea, the unticked one stays typed, a reload keeps the record and forgets the typed list, and no address
holds a typed word or amount; a record kept not attached, attached later, then a separate refund record
and a negative-amount refund, each linked to the purchase, with the purchase listing both; **Record a
refund for this** on a purchase under an idea, with a record already typed and set to not attached,
leaves **For** alone and both are kept not attached; an agent's proposal with a 25% share waits (an
outside caller gets 403 from agree and attach), its share shown as "(proposed by an outside agent)",
until **Agree to all 1** in the waiting review; and a receipt: an SVG named `.png` refused in the
window by its bytes with nothing sent, then a PNG named after a person kept under a 32-character name
DotAmi made up (the request never carries the file's name), shown as "Receipt: PNG picture · … · added
<today>", kept over a reload, and **Remove receipt** deleting the file and keeping the record.

`e2e/receipt-viewer.spec.ts`: **Show receipt** on a PNG shows it from a `blob:` address with one
request (the bytes, by POST) and on a PDF draws page 1 with ink on it in a worker from DotAmi's own
files; hostile files: a PDF with JavaScript in its OpenAction and a URI action, a PNG with a web page
after its end and a PDF with one appended, all drawn with no dialog, no popup, no request off DotAmi's
own address and the window not moved; a PNG header claiming 30,000 × 30,000, an SVG under a PNG row and
a PDF under a PNG row (put in the folder directly) refused in the window with no picture; a PNG changed
on the disk refused by the server; and the route answering only DotAmi's page, as octet-stream with
nosniff, with no GET. HEIC: a photo added through the page is kept byte for byte under a `.heic` name and
**Show receipt** says plainly that this browser can't show HEIC photos (Playwright's Chromium has no
HEVC) with no picture and one request; a burst and a 900-megapixel claim are refused in the window with
nothing sent; a 10-bit HEIC put in the folder is kept but "not drawn". The desktop test draws a PDF
receipt in the app's own window and checks its worker can't reach DotAmi's server, and draws an invented
HEIC (a rotated 2 × 2 grid, checked pixel by pixel) where the computer's graphics chip decodes HEVC, or
checks the plain refusal where it doesn't; then a reported graphics-process crash stops HEIC, across a
reload.
