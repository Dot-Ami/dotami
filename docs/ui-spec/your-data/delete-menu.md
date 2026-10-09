# Delete

Page: What DotAmi knows about you (`/your-data`) · Component: `components/your-data/delete-menu.tsx`  
Type: button that opens a menu of tick-boxes, then two confirm dialogs

## What it is

One button named **Delete**, in the last section of the page ("Taking things out"). It opens a menu
of the kinds of data DotAmi keeps, one tick-box each, and erases the ticked kinds from the data file
after asking twice. The maintainer decided its shape on 2026-10-07: one button named "Delete", a
menu of what can be deleted with what else goes with each and a Learn more, statements deletable
all at once only, and one cited line on keeping business records. On 2026-10-08 he decided that
deleting ideas keeps their expense records, as "not attached yet", and that the person is told so,
with where they are kept, before confirming.

## What it does (behavior on interact)

1. **Delete** opens the menu below the button (`aria-expanded`). It is switched off, with "Nothing to
   delete: the data file holds nothing of yours.", when every box would delete nothing.
2. **The menu** (`What do you want to delete?`) lists `DELETE_MENU` from `lib/privacy/inventory.ts`,
   in its order:
   - **Your ideas, with their notes, links and map progress** — also takes every link, map
     progress and figure (they belong to an idea; the database deletes them with it). Its expense
     records **stay**, as "not attached yet": the database clears each record's idea instead
     (`keeps` in `DELETE_MENU`).
   - **Your figures** — every figure, in every state; cards go back to the estimates.
   - **Your expense records** — every record, attached to an idea or not, in every state, and every
     receipt added to one (the `Receipt` rows by the schema's cascade, the files by the sweep).
   - **Your receipts** — every receipt file in the receipts folder and its `Receipt` row; the records
     stay, with no receipt ([8i], expense-records.md § 7).
   - **Your statements ("In your words")** — all of them at once; DotAmi never deletes one alone.
   - **Your settings** — every saved choice goes back to its default.
   - **Remembered columns** — shown switched off ("Not kept yet"): DotAmi doesn't remember a
     file's columns yet. This is its place on the menu when it does.

   Each box shows the count of every table it touches ("Your ideas: 2 · Links between ideas: 1 ·
   …"); each of those tables is emptied completely, so these are whole-table counts and true (a
   test fails if a table a box goes with could be only partly emptied). The ideas box adds a line
   for what it keeps: "Expense records attached to them: 2 (they stay, as “not attached yet”)". The
   expense records box counts every record. Then the sentence on what else goes with it, and
   **Learn more** (a `<details>`, no script). A box with nothing in it is switched off ("Nothing
   to delete").

   **Ticking "Your ideas"** (while "Your expense records" isn't ticked, and some records are
   attached) shows a warning under the box at once: "2 expense records stay, as “not attached
   yet”." then where they are kept and how to delete them: in DotAmi's data file on this computer,
   counted on this page under "Your expense records", and, except the ones the person turned down,
   listed on the Expenses page under "Not attached to an idea yet" (where they can be attached to
   another idea); records turned down are kept and counted too, but no list shows them (the count
   covers them, so the warning says so); to delete them as well, tick "Your expense records" too;
   no single record can be deleted yet. Ticking both boxes
   deletes every record: the warning goes, and the ideas box's line ends "(they go too: “Your
   expense records” is ticked)".

   Under the boxes: the cited line (from `lib/engines/compliance/v2026/record-keeping.ts`): Delete
   removes DotAmi's own copy only and doesn't touch the person's books, receipts or bank
   statements; the CRA says business records are generally kept for six years from the end of the
   last tax year they relate to, with exceptions, linked to the CRA's page with the day it was read.
   Then **What Delete doesn't reach** (`NOT_CLEARED_BY_DELETE`): the safety copies in the backups
   folder, what the window stored in earlier launches ("Not cleared yet"), the log, anything that
   already left the computer, and the disk under the data file.

   **Delete what's ticked…** (off until a box is ticked) goes to the first ask. **Cancel** closes
   the menu and unticks everything.
3. **First ask** (dialog, "Delete these?"): every ticked box with the count of each table it
   touches; under **Kept, not deleted**, the same warning on the expense records that stay; and a
   line that everything not ticked stays, as does what Delete doesn't reach. **Yes,
   continue** or **Cancel** (back to the menu, boxes still ticked).
4. **Second ask** (dialog, "Delete them now?"): "This can't be undone." In the desktop app it points
   to File → Back up… first and File → Restore; from source, to copying the data file. Focus starts
   on **Cancel**, so Enter can't delete by accident. **Delete now** sends the request.
5. **Result**: "Deleted." with each table's count deleted and left (0), a line for what was kept
   ("Your expense records: 2 records kept, now “not attached yet”; 3 records in all"; left out when
   none was kept, so ticking ideas with no records attached says nothing about expenses), and whether
   the file's space is wiped. When the wipe couldn't run, an amber note says the records are deleted but their
   space isn't wiped yet (it needs free disk space about the size of the file and nothing else
   using it), with **Try the wipe again**. If the server deleted but couldn't read the file back to
   count what is left, the "left" counts are dropped and an amber line says to reload and check.
   When receipts were deleted, a line "Receipt files: N files removed from the receipts folder";
   if some couldn't be removed yet (another program had one open), or the folder couldn't be read,
   an amber note says so and that DotAmi removes them the next time a receipt is added or deleted.
   The page's counts are read again from the file.

Escape, Cancel or a click on the dim backdrop at either ask deletes nothing. If the counts in the
file differ from what the person was shown (an import or an agent added something), the server
refuses, nothing is deleted, the menu shows the message and the page reads its counts again. The
number of expense records the warning said would stay is checked the same way, so a record
attached to an idea in between (the total unchanged) also stops the delete.

## Why it exists (user purpose)

So the person can take back what they gave DotAmi, choosing what goes and seeing what else goes
with it, and trust that it is gone from the file rather than hidden.

## Copy (current labels)

Delete · What do you want to delete? · Learn more · Nothing to delete · Not kept yet · Delete
what's ticked… · Cancel · Delete these? · Yes, continue · Delete them now? · Delete now ·
Deleting… · Deleted. · Try the wipe again · What Delete doesn't reach. The box labels and their
sentences are in `DELETE_MENU`.

## State touched (field names only)

Every row of `Venture` (and, by the schema's cascade, `VentureLink`, `ScenarioState`, `Figure`;
`Expense.ventureId` is cleared to null on those ideas' records, which stay), `Figure`, `Expense` (and,
by the cascade, `Receipt`), `Receipt`, `PersonStatement`, `Setting`. When receipts were deleted, the
files in `receipts/` beside the data file that no row describes any more are removed
(`sweepOrphanReceipts` in `lib/expenses/receipts/store.ts`); a file not named the way DotAmi names
receipts is never touched. Never `User`
(`KEPT_BY_DELETE`). In the window: after deleting ideas, the intake in progress (`dotami-journey-v3`)
is reset through the journey provider, so a Save on the map can't bring a deleted idea back.

## Downstream consumers (where the data goes today)

Nowhere: rows are deleted. The Ideas page, the map, the agree prompt, "In your words" and the
settings page read empty or default afterwards.

## Cleanup / open questions

- Clearing the backups folder from this menu, and finishing a wipe that couldn't run at the next
  start of the desktop app: the next step.
- Clearing what the desktop window stored in earlier launches: waits on a later decision on how to
  reach it.
- Whether an agent (the Lens, or an outside one) may ever delete: a later decision. Until then the
  route answers only to DotAmi's own page.

## Backend wiring

`POST /api/your-data/delete` (`app/api/your-data/delete/route.ts`): rate-limited, refused (403)
unless the request comes from DotAmi's own page (`refuseUnlessFromAppPage`), body read through
`readJsonWithLimit` (JSON only, 8 KB). `{ kinds, seen }` runs `deleteData` (`lib/privacy/delete.ts`):
the counts are checked against `seen` and the tables emptied in one transaction (409 with fresh
counts on a mismatch, 400 for a kind it can't delete), then `VACUUM` outside the transaction.
`{ retryWipe: true }` runs only the wipe. A failure logs the error's name and code only.
