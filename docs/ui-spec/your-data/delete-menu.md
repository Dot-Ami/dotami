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
   - **Your bank and card accounts** (added 2026-10-08, [8g]) — every account name, in use or taken
     back, with its days. Figures read from their statements stay; "Always allow every account" goes
     with Your settings, and the tick-box line says so.
   - **Your statements ("In your words")** — all of them at once; DotAmi never deletes one alone.
   - **Your settings** — every saved choice goes back to its default.
   - **Safety copies in the backups folder** (added 2026-10-08) — DotAmi's own whole copies of the
     data file, made before each update and restore. Its sentence, in amber, is the warning:
     afterwards only a backup saved somewhere else could bring anything back. It counts files, not
     records ("Safety copies: 2"), and only the files DotAmi names itself (`dotami-before-….db`
     directly in `backups/`); anything else in the folder stays and isn't counted. Since 2026-10-10
     ([8i], expense-records.md § 11) it also clears the **receipt folders DotAmi set aside** there,
     `receipts-locked-…` (Start a new key) and `receipts-before-restore-…` (a restore), counted as folders
     beside the copies ("Safety copies: 1 · Set-aside receipt folders: 2"); only folders holding a file
     DotAmi named (or nothing) are counted, and only DotAmi's files in them are deleted. Once ticked
     while there are some, an amber warning shows under the box (`SET_ASIDE_RECEIPTS_WARNING`): "The
     receipt folders set aside in the backups folder go too: receipts-locked-… (receipts Start a new key
     set aside, with the old key file) and receipts-before-restore-… (the receipts folder as it was
     before a restore). Afterwards those receipts can never be opened, even if the old key comes back."
     Switched off ("Nothing to delete") when there are neither, which is always the case in a copy run
     from source.
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
   Then **What Delete doesn't reach** (`NOT_CLEARED_BY_DELETE`): key files set aside on their own in
   the backups folder (`receipts-key-unreadable-….key`; before 2026-10-10 this line was the receipt
   folders set aside there, which the safety-copies box now clears), what the window stored in earlier
   launches ("Not cleared yet"), the log, anything that already left the computer, and the disk under
   the data file (which can still hold older pieces of the file, a removed receipt's bytes, deleted
   safety copies and set-aside receipts).

   **Delete what's ticked…** (off until a box is ticked) goes to the first ask. **Cancel** closes
   the menu and unticks everything.
3. **First ask** (dialog, "Delete these?"): every ticked box with the count of each table it
   touches (and of safety copies, as files); under **Kept, not deleted**, the same warning on the
   expense records that stay; and a line that everything not ticked stays, as does what Delete
   doesn't reach. With the safety copies ticked, an amber line: they go too, so afterwards only a
   backup saved somewhere else could bring anything back; and, when there are set-aside receipt
   folders, the same amber warning as under the box ("Set-aside receipt folders: 2 folders" in the list). Without them, when there are any, a line
   that the safety copies aren't ticked and still hold what is deleted; and, when there are set-aside
   receipt folders (even with no safety copy), a line that those folders aren't ticked and still hold
   their receipt files. **Yes, continue** or
   **Cancel** (back to the menu, boxes still ticked).
4. **Second ask** (dialog, "Delete them now?"): "This can't be undone." With the safety copies
   ticked, the amber warning again, and the set-aside receipt folders' warning when there are some. In the desktop app it points to File → Back up… first and File →
   Restore; from source, to copying the data file. Focus starts on **Cancel**, so Enter can't delete
   by accident. **Delete now** sends the request.
5. **Result**: "Deleted." with each table's count deleted and left (0), a line for what was kept
   ("Your expense records: 2 records kept, now “not attached yet”; 3 records in all"; left out when
   none was kept, so ticking ideas with no records attached says nothing about expenses), and whether
   the file's space is wiped. When the wipe couldn't run, an amber note says the records are deleted but their
   space isn't wiped yet (it needs free disk space about the size of the file and nothing else
   using it), with **Try the wipe again**. Safety copies are counted as files ("Safety copies: 2 files
   deleted, 0 left"); a copy another program holds open is left, and an amber line says so, with
   the same button. Set-aside receipt folders likewise ("Set-aside receipt folders: 2 folders deleted,
   0 left"); one whose file another program holds open is left, said in amber, with the same button. In the desktop app a line adds that it finishes the next time the app starts. If
   the server deleted but couldn't read the file back to count what is left, the "left" counts are
   dropped and an amber line says to reload and check.
   When receipts were deleted, a line "Receipt files: N files removed from the receipts folder";
   if some couldn't be removed yet (another program had one open), or the folder couldn't be read,
   an amber note says so and that DotAmi removes them the next time a receipt is added or deleted.
   The page's counts are read again from the file.
6. **An earlier Delete that hasn't finished.** When the "wipe pending" note is beside the data file
   (an earlier wipe couldn't finish, or a safety copy or set-aside receipt folder couldn't be deleted), an amber note under the
   button says so ("An earlier Delete hasn't finished…"; in the desktop app, that it finishes the
   next time it starts) with **Finish it now**, which runs the same retry. Done, it says "Finished:
   the earlier Delete's wipe is done."; still not done, it says to close any program using DotAmi's
   files and check the free disk space.

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
Deleting… · Deleted. · Try the wipe again · What Delete doesn't reach · An earlier Delete hasn't
finished · Finish it now · Finishing… · Finished: the earlier Delete's wipe is done. The box labels
and their sentences are in `DELETE_MENU`.

## State touched (field names only)

Every row of `Venture` (and, by the schema's cascade, `VentureLink`, `ScenarioState`, `Figure`;
`Expense.ventureId` is cleared to null on those ideas' records, which stay), `Figure`, `Expense` (and,
by the cascade, `Receipt`), `Receipt`, `SourceAccount`, `PersonStatement`, `Setting`. Never `User`
(`KEPT_BY_DELETE`). On disk: when receipts were deleted, the files in `receipts/` beside the data
file that no row describes any more (`sweepOrphanReceipts` in `lib/expenses/receipts/store.ts`; a
file not named the way DotAmi names receipts is never touched); the safety copies DotAmi made in
`backups/` beside the data file (when ticked), and, with them, DotAmi's files in the receipt folders
set aside there (`receipts-locked-…`, `receipts-before-restore-…`; an emptied folder is removed, one still
holding the person's own files stays); and the "wipe pending" note beside the data file
(`<data file>.wipe-pending`, written before the wipe and removed once it has worked; it holds a time,
safety-copy file names and set-aside folder names only). In the window: after deleting ideas, the intake in progress (`dotami-journey-v3`)
is reset through the journey provider, so a Save on the map can't bring a deleted idea back.

## Downstream consumers (where the data goes today)

Nowhere: rows are deleted. The Ideas page, the map, the agree prompt, "In your words" and the
settings page read empty or default afterwards.

## Cleanup / open questions

- Clearing what the desktop window stored in earlier launches: waits on a later decision on how to
  reach it.
- Whether an agent (the Lens, or an outside one) may ever delete: a later decision. Until then the
  route answers only to DotAmi's own page.
- Known limit: the "wipe pending" note is written just before the rows are deleted. If the computer
  is switched off in that moment, the rows are kept (the delete never committed) but the ticked
  safety copies are deleted at the next desktop start, as the person confirmed, with no message
  saying the rows are still there; the page's counts show them.
- Known limit: on a completely full disk even the note may not be written. The delete still happens
  and **Try the wipe again** is offered, but the line saying the desktop app finishes it at the next
  start can then be wrong: that start can't know the wipe is owed.
- Known limit: a safety copy that can never be deleted (for example, no permission) keeps the note,
  so each desktop start rebuilds the data file again and the page keeps showing the amber note until
  the copy is removed by hand.

## Backend wiring

`POST /api/your-data/delete` (`app/api/your-data/delete/route.ts`): rate-limited, refused (403)
unless the request comes from DotAmi's own page (`refuseUnlessFromAppPage`), body read through
`readJsonWithLimit` (JSON only, 8 KB). `{ kinds, seen }` runs `deleteData` (`lib/privacy/delete.ts`):
the counts are checked against `seen` and the tables emptied in one transaction (409 with fresh
counts on a mismatch, 400 for a kind it can't delete), then `VACUUM` outside the transaction.
`{ retryWipe: true }` runs `finishWipe`: the safety copies and set-aside receipt folders the "wipe
pending" note still owes, then the wipe, and removes the note once all of it has worked (`{ wiped,
backupsLeft, receiptFoldersLeft }`). With the safety-copies box ticked, the route passes the data file it
uses (`DATABASE_URL`) so the copies, the set-aside folders and the note are found beside it; their
counts are checked against `seen.backups` and `seen["set-aside-receipts"]` first (409 on a mismatch),
the note is written before anything is deleted, and the copies and folders are deleted after the rows
(`desktop/wipe-pending.mjs`, which only deletes `dotami-before-….db` files directly in a `backups/`
folder that isn't a link, and, in folders named `receipts-locked-…` or `receipts-before-restore-…` that
aren't links either, only the receipt files and `receipts.key` DotAmi put there). The desktop app finishes what the note owes at its next start
(`desktop/main.mjs`), and only when the note is there. A failure logs the error's name and code only.
