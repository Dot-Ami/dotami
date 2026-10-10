# Settings (`/settings`) — page overview

Last updated: 2026-10-10 ([8i] — whether the data file is encrypted, and the "Encrypt the data file" switch); 2026-10-09 ([8i] — whether the receipt files are encrypted; 2026-10-08: [8g] — the bank and card accounts list; the Licences link; [8e] — Add to my calendar; 2026-10-07: the first saved setting, Figure reminders; 2026-10-05: [7g] the shell)

**Route:** `/settings` · **Component:** `components/settings/settings-page.tsx` (server-rendered;
the interactive controls are `copy-path-button.tsx`, `figure-reminders-control.tsx`,
`bank-accounts-control.tsx` and `database-encryption-control.tsx`) ·
**Rows:** `lib/settings/catalog.ts` · **Today facts:** `lib/settings/today.ts` · **Saved choices:**
`lib/settings/store.ts` (read on the server on every visit; saved through `PUT /api/settings`,
`lib/settings/client.ts`) · **Reached from:** "Settings" on the landing page header and the ideas
page nav, and "Settings → Figure reminders" on each idea's card.

## What it is for

One screen for every setting in Part 1 of
[settings-and-edge-cases.md](../../architecture/settings-and-edge-cases.md), so a person can see
what DotAmi does now and what each setting will let them change — before any of it is built.

## Layout

Groups, in this order: **Data and backups · Your figures · The Lens and outside agents · The map ·
Privacy · Updates.** "The map" holds the three Part 1 rows that fit none of the others (deadline
reminders, tax year, language). A row of jump links sits under the heading.

Each group:

1. **Today** — what is true of this copy right now, read on the server from the app's own
   environment on every visit (never a stored claim):
   - Data and backups: the absolute path of the database file (from `DATABASE_URL`, relative
     paths read from `prisma/` as Prisma does) with a **Copy path** button; "no file there yet"
     when it's missing; a plain line when the URL isn't a SQLite file. The line above the path
     says the receipt copies ([8i]) are in a folder named receipts beside the file. Under the path,
     first one line from `today.database` (`lib/db/protection.ts`, database-encryption.md § 7): in the
     desktop app with the file opened with its key, "Your data file is encrypted on this computer." with
     what it protects and doesn't (the same precise words as the receipts'), what losing the key costs
     (everything not in a backup), that an older DotAmi can't open it, what the overwrite of the plain
     file can't promise on a solid-state disk, and how many plain copies are still on the disk when a
     file was held by another program; "Your data file isn't encrypted yet." after Not now; "Your data
     file isn't encrypted." after Never (pointing at the switch below) or with no key store; from
     source, "This copy's data file isn't encrypted." and why. Then one
     line from `today.receipts` (`lib/expenses/receipts/protection.ts`, expense-records.md § 9): in the
     desktop app with its key open, "Your receipt files are encrypted on this computer." with what that
     protects, said precisely (Windows' folder permissions already keep other standard accounts out of
     the data folder; the encryption adds an administrator account, a copy of the folder and the disk
     read outside Windows), that anything running as the person (or a program an administrator runs as
     them) can still open them, that losing the key (a Windows
     profile reset, the folder moved to another account or computer) loses the receipts except those in
     a backup, and whether the data file is encrypted too (it says so when it is); from source (or with no key store and no
     receipt encrypted yet), "Receipts in this copy aren't encrypted." and why (the desktop app encrypts
     them; with no key store, that DotAmi tries again at each start); when the key can't be opened
     (Windows won't open it, `receipts.key` is missing, or the key store is gone while receipts are
     encrypted), in amber, "DotAmi can't open the key to your receipts." with what happened, to put
     `receipts.key` back if it was deleted or moved, and the two ways forward (restore a backup, or
     delete the receipts and restart). In the desktop
     app (`DOTAMI_DESKTOP=1`): where Back up and Restore are (File menu), that every backup is locked
     with a passphrase the person chooses ([8i], required since 2026-10-10), and that a backup holds
     the receipt files too; from source: copying the file and the receipts folder together
     is a backup. Always: how to turn on disk encryption (Windows Device encryption on Home,
     BitLocker on Pro — Microsoft's page, read 2026-10-06; FileVault on a Mac).
   - Your figures: DotAmi keeps the totals the person agrees to, each with its source and the day
     agreed, and also the ones still waiting for an answer and the ones turned down or taken back;
     none of those count, but every one stays in the data file, amount included; the intake's
     revenue estimates are separate. Links to `/your-data` ("What DotAmi knows about you"), which
     lists every figure ([8a], [8d]).
   - The Lens: no model chosen; no outside agent can connect.
   - The map: the tax year the catalogs cover.
   - Privacy: what leaves the computer — the sentence typed to describe a venture goes to
     Anthropic only when `ANTHROPIC_API_KEY` is set (the intake parser's own test); the installed
     app's update check shows GitHub the computer's internet address and version
     (`DOTAMI_UPDATES=github`); DotAmi has no server and collects no usage data; from source
     only: Next.js telemetry and Prisma's check-in, that the project's own npm scripts switch both
     off (since 2026-10-08), what they can't reach (`npm ci`, `npx` by hand) and the two variables
     for those, and that `npm run dev` asks npm's registry for the newest Next.js version (npm sees the
     computer's internet address and nothing else). Includes a link, "What DotAmi
     knows about you", to `/your-data` ([8d], docs/ui-spec/your-data/_index.md).
   - Updates: the version; the installed app checks GitHub at start and asks before installing;
     a copy run from source updates with git. Then: DotAmi is open source under the Apache License
     2.0 and ships with others' work, with a link, "Licences", to `/licences` (and, in the desktop
     app, "also under Help → Licences"; added 2026-10-08, docs/ui-spec/licences/_index.md).
2. **One card per setting** — label · what it controls · Default · Choices · the warning shown
   before switching on the risky option (amber) · a status chip: `Not built yet · [code]`,
   `Asked each time · <where>` (the backup passphrase — asked in the passphrase window, which
   shows the same warning), or `Waiting on a decision` (the usage-sharing row, whose Choices link
   to Part 4). A `live` setting (Figure reminders, so far) has no chip: its control sits at the
   bottom of its card, under a rule.

| Control | Behaviour | Persists to |
|---|---|---|
| Jump links | in-page anchors to each group | — |
| **Copy path** | copies the data file path; says "Copied", or "Copy failed — select it instead" when the clipboard is refused | — |
| **Monthly** · **Quarterly** · **Yearly** tick-boxes (Figure reminders, Your figures group; added 2026-10-07, [8e]) | any combination, or none. Each tick saves at once (`PUT /api/settings { id: "figure-reminders", value: { cadences } }`; no Save button) and the boxes then show what the app answered. A line under them: "None ticked: no reminder." until one is ticked, "Saving…", "Saved.", or "Save failed — nothing was changed." (the box goes back to what was last saved). When the saved choice couldn't be read at page load the boxes are switched off with "Couldn't read your saved choice, so it can't be changed right now." rather than claiming none are ticked. The choice is read from the data file on every visit, so a reload shows it; the boxes are also switched off until the control has asked for the saved value itself (the browser's Back/Forward buttons can bring the page back from memory with the value it had when it was built, and a tick sends the whole list). The reminder is a banner on the ideas page and on the idea's map (`docs/ui-spec/ventures/_index.md`); the card's text says so | `Setting` row `figure-reminders` → `cadences` |
| **Add to my calendar** (Figure reminders, under the tick-boxes; added 2026-10-08, [8e]) | saves `DotAmi figure reminders.ics`, made in the page from the boxes as shown (`lib/figures/calendar.ts`, saved by `lib/utils/save-file.ts`; no request is made). One all-day repeating event per ticked box, titled "Bring your DotAmi figures up to date": monthly from the 1st of next month, quarterly from the 1st of the next quarter (January, April, July, October), yearly from January 1; always the first such day after today. Each event's UID is a random UUID, new for every file. The text beside it says to open the file with a calendar app or its Import menu, that Google Calendar imports only on a computer at calendar.google.com (Settings, then Import & export), and that importing the same file again adds a second copy (so delete the old events after changing the ticks); it also says the calendar can't see DotAmi, so it reminds whether or not the figures are in, that the file holds only general words (no amounts, no idea names), and that a calendar that syncs online shares them with its company. Switched off while no box is ticked, while a tick is saving, and while the saved choice hasn't been read. In a browser it is an ordinary download; in the desktop app a Save dialog asks where (Cancel saves nothing; `desktop/main.mjs` `saveDownload`) | — (a file the person keeps; nothing stored) |
| **Your bank and card accounts** list, with **Take back** per account (Bank and card records card, Your figures group; added 2026-10-08, [8g]) | Shown only when the data file holds an account in use or "Always allow every account" (read on the server, then read again by the control when it appears, since Back can show the page from memory). Each account: the person's own name for it, then which warning button was pressed and the day (`describeAllowance` in `lib/figures/source-account-name.ts`: "Always allowed since 2026-10-08", "Allowed once, on 2026-10-08; the warning shows again next time", "Allowed on 2026-10-08 with “Always allow every account”"); "Every account: always allowed since …" sits first when it applies. **Take back** opens an inline ask under the item ("Take back “name”? It leaves this list, and its next statement shows the warning again as a new account. Figures already read from it stay.") with **Keep it** and **Yes, take it back**; yes sends `POST /api/figures/bank-sources/retire { id }` (or `{ every: true }`), then the list shows what the app answered, a status line "Taken back: name.", and "No accounts in your list." once empty. Works with the switch off. A refusal (the account was already taken back elsewhere) shows the app's sentence and reads the list again. Today nothing can add an account (the statement screen is the next step), so the list shows only on a file that already holds one | `SourceAccount.retiredAt`; `Setting` row `bank-records` → `everyAccountSince` |
| Public task list / Part 4 / nextjs.org links | open in a new tab | — |
| **What DotAmi knows about you** (Privacy group, and again in Your figures) | opens `/your-data` in the same tab | — |
| **Licences** (Updates group; added 2026-10-08) | opens `/licences`, the third-party notices, in the same tab | — |

## What it deliberately does not do

- **Bank and card records has no switch yet.** Its card says "Not built yet · [8g]" with both
  warnings' words (the statement warning in full is in Part 1 of the settings doc); the switch, the
  warning on screen and the statement screen arrive together, so no switch shows that does nothing.
  Its accounts list is built and appears once there is an account to list.
- **Only Figure reminders can be changed so far.** Every other setting in Part 1 belongs to a
  feature that isn't built; a switch that did nothing would be lying. The story that builds a
  setting flips its row to `live` in the catalog and adds its control, a definition of what its
  value may hold (`lib/settings/values.ts`) and a browser test that the change survives a reload —
  `tests/settings-catalog.spec.ts` lists the live rows and fails if one has no definition.
- Saved choices live in one small table, `Setting` (a name and a JSON value per row; decided
  2026-10-07), that every later setting reuses. The data folder [7b] can't be stored inside
  the database it points at, so that one setting will need somewhere else.
- No outside agent can read or change a setting: the routes answer only DotAmi's own window
  (whether agents may is a later decision).
- Never shows a key, only whether one is set.

## Kept in step

`tests/settings-catalog.spec.ts` fails if the catalog and Part 1 disagree — a setting in one and
not the other, a different default, choices or story code, or a quoted warning reworded in one
place. Change both in the same commit.

## Verified 2026-10-05

`e2e/app.spec.ts` › "the settings page …" on the production build: reached from the landing
page and the ideas page; all six groups; the data file shown is the run's throwaway `prisma/e2e/dotami.db`;
Privacy says nothing is sent (no key in the test run); every setting shows its default, its
warning when it has one, and its story; Copy path puts exactly the shown path on the clipboard; no sideways
scroll at 390 px wide.

## Browser-tested 2026-10-07 (run locally, 24/24)

`e2e/app.spec.ts` › "Figure reminders: tick monthly and yearly, reload, and they are still
ticked" (also: a program calling the route is refused, unticking all survives a reload, and
a tick made after the browser's Back button brings the page back from memory doesn't undo the
earlier one), the settings test's count of controls (none on the page but Copy path and the
three Figure reminders tick-boxes), and
"Remind me about this idea: …" (the settings page's ticks and the ideas page's switches are one
setting and don't undo each other).

## The "Encrypt the data file" switch ([8i], 2026-10-10)

The catalog row `database-encryption` (Data and backups), live, with its control
(`components/settings/database-encryption-control.tsx`). It reads the saved value itself before it
lets anything change, like the reminders.

- **The file is encrypted** (`today.database.state` "on"): "On: your data file is encrypted, and stays
  encrypted." No control: DotAmi doesn't decrypt a file (the maintainer's decision was a switch to
  turn encryption on later).
- **Run from source:** "Only the desktop app encrypts the data file; this copy, run from source,
  can't." No control.
- **Plain in the desktop app** (Not now, Never, or no key store): a tick-box **Encrypt the data file**.
  Ticking it saves `{ "on": true }` at once and says "DotAmi asks to encrypt your data file the next
  time it starts." Unticking asks first, in amber, with what it leaves unprotected, **Go back** and
  **Keep it unencrypted**; only the second saves `{ "on": false }` ("Never: the data file stays
  unencrypted, and DotAmi doesn't ask."). A save that fails says "Couldn't save; nothing changed."

The desktop app reads the value from the data file at its next start (`desktop/main.mjs`
`readEncryptionChoice`) and writes it when the person answers **Never** in the window before the
first encryption. Covered by `e2e-desktop/desktop.spec.ts` ("Not now keeps the file plain…").
