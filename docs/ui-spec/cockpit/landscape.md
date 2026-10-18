# Others in this line of work · Businesses you're watching

Page: Cockpit (`/cockpit?venture=<id>`, and the example `/example/mara`) · Component:
`components/cockpit/landscape-panel.tsx` (words: `lib/landscape/words.ts`; links checked by `lib/landscape/links.ts`;
kept by `lib/landscape/watched.ts`; routes under `app/api/futures/[id]/watched/`)
Type: panel (sections, a list, a form)

Last updated: 2026-10-17 (built: the maintainer released *Businesses you're watching*, task S2.5.23i, before
research story S2.5.26 ends, in his words *"yah, this is fine. Lets do it"*; design:
[docs/architecture/competitive-landscape.md](../../architecture/competitive-landscape.md) § 6.2, § 7, § 8)

## What it is

The smallest host the person's own list needs: a panel in the cockpit's right-hand slot, one thing at a time
like *Compare*, a region named *Others in this line of work* with a × button named *Close*. It holds three
things, in this order, and nothing else:

1. **What their ads cost.**
2. **Businesses you're watching · in the order you added them.**
3. The footer.

**Not in this panel yet** (each is its own task in competitive-landscape.md § 13, not built here): the official
count of businesses by area and industry (23f, 23h), the area and industry questions and *More about where*
(23g), *Where to look* (23e), named businesses from any outside route (call 2, on hold for research story
S2.5.26), the *Advertising* cost line (23j, a future story), and Mara's landscape with her real count (23k).
So the footer's *"Facts from public sources, side by side"* today stands over the ad-cost line only.

## Where it opens

- **The goal bar**, on every road: a button **Others in this line of work** beside *Compare* (when Compare is
  offered), on the open bar. The folded bar keeps only the gauges, so it isn't there; *Show goal and gauges*
  brings it back.
  *(2026-10-17, the calm first view: an item of the goal bar's **Look closer** menu, after *Compare the two
  endings* when that is offered; [07-goal-bar.md](./07-goal-bar.md).)*
- **The step panel**, on a step its road marks as opening a business (`RoadStep.opensABusiness`): today only
  road 1's *Open your own shop* (`step-shop-open-own-shop`). The same button, under the fork's lines. Road 0
  marks no step, so there the goal bar is the way in.

Opening it clears the last receipt and the pressed gauge, as Compare does. It changes nothing on the road and
gives no receipt: no rule reads anything in it. Folded, the panel's strip says *Show the panel: Others in this
line of work*. On a phone it is a full-width sheet, between 768 and 1023 px a drawer, as every right-hand
panel is ([12-folding-and-phone.md](./12-folding-and-phone.md)).

## 1. What their ads cost

- Heading *What their ads cost*.
- The fixed v1 line, word for word: *"Meta and Google don't publish this for ordinary ads in Canada, as their
  pages read on 15 October 2026. DotAmi has no number for it."* (competitive-landscape.md § 6.2 item 4; call 3 B;
  research-kit call K4 A).
- *Read on 15 October 2026:* and the two pages it was read from, as links: Meta's ad library tools page and
  Google's post on its political ads data set (§ 4.6).
- *Their ads, in the public libraries:* **Meta's Ad Library ↗** (`https://www.facebook.com/ads/library/`) and
  **Google's Ads Transparency Center ↗** (`https://adstransparency.google.com/`).
- *Each opens in your browser. DotAmi reads nothing from these pages, and the links carry nothing about you or
  this idea.* The addresses are fixed: no search words, no query, nothing of the person's or the idea's
  (`tests/landscape-words.spec.ts`).

Every link in the panel is drawn `target="_blank" rel="noopener noreferrer"`: the page it opens can't reach
back into DotAmi's window, and isn't told where the click came from. In the desktop app a new window is never
opened: the app hands an https link to the person's own browser and refuses anything else (`desktop/main.mjs`,
unchanged here).

## 2. Businesses you're watching · in the order you added them

- The heading says the order, so the list never reads as a ranking.
- *DotAmi doesn't check these. They stay on this computer and no rule reads them.*
- *Your notes and links only: DotAmi copies nothing from a business's own pages.* (call 9 A)
- On the invented example: *An invented person's list would mean inventing businesses, so this stays empty in
  the example.* (§ 6.4) and the example's note *This is an example. Start your own to keep anything.*; on an idea
  not saved yet, the cockpit's *not saved* note. In both, **+ Add a business** is disabled and nothing is read.
- A status line (read out by a screen reader): *Added to your list.*, *Saved.* or *Removed from your list.*
  after each change.
- The list (`<ul>` named *Businesses you're watching*), in the order the person added the businesses, read back
  from the data file after every change, so what shows is what is kept. *None added yet.* when empty. **Never a
  count against anything**: no *3 of 101*, no total, no order by anything but the day added.

Each business shows:

- Its name, as typed (a heading).
- Its link, if given, as the address itself, opening in the browser. An `http://` link (not https) also says
  *(an http link: the desktop app doesn't open these; copy it into your browser)*, since the desktop app opens
  https only.
- The person's note, word for word, line breaks kept.
- *Ads you saw*: each ad link, as its address, with *· seen <day>* (the day the person set, YYYY-MM-DD).
- **Edit** (named *Edit <name>*) and **Remove** (named *Remove <name>*). **Remove** asks once more, in amber:
  *Remove “<name>”, with your note and its links? This can't be undone.* with **Yes, remove** and **Keep it**.

### + Add a business / Edit

One form at a time (a form named *Add a business*, or *Edit <name>* in place of that business):

| Field | Rule |
|---|---|
| **Name** | Required, kept as typed (trimmed at the ends), up to 200 characters. *As you'd write it. Kept as you type it.* |
| **Link (optional)** | Kept only if it starts with `http://` or `https://` and has a host; no name or password written into it; up to 2,048 characters. Anything else (`javascript:`, `data:`, `file:`, `mailto:`, no scheme…) is refused: *A link has to start with http:// or https://.* |
| **Your note (optional)** | The person's words, up to 2,000 characters; all blank keeps none. |
| *Ads you saw*: **+ Add an ad link** | Up to 20. Each row: **Ad link N** (the same link rule) and **Day you saw ad link N**, a date box that **starts on today**, which the person can change; any real day up to today (*Give the day you saw each ad, no later than today.*). **Remove ad link N** drops the row. A row left with no link is dropped on save. |
| **Save** / **Cancel** | Save checks the same rules the storage does before sending anything; a refusal shows in amber in the form (*role="alert"*), the server's words if it refuses. Cancel closes the form, keeping nothing. |

An edit sends the whole business again; the business keeps its place in the list and its day added.

## 3. Footer

*"Facts from public sources, side by side. Nothing here says whether this line of work fits you. Not legal
advice."* (§ 6.2 item 6)

## Never on screen

A rank, score, rating order, *crowded*, *saturated*, *room for you*, market share, businesses per person, a trend
arrow, or any order by size, spend or reviews. `crowded`, `saturated` and `room for you` are verdict phrases on
every screen (`tests/helpers/verdict-words.ts` `VERDICT_PHRASES`, read by `e2e/no-verdict.spec.ts`); the
panel's own words, its link labels among them, are also checked against the verdict words and against
*opportunity*, *gap*, *market share*, *per person*, *top* and *best-rated* (`LANDSCAPE_WORDS`,
`tests/landscape-words.spec.ts`). A business's own words are never quoted.

## State touched (field names only)

`WatchedBusiness`: `id`, `ventureId`, `nameAsTyped`, `url`, `note`, `adLinks` (a JSON list of `{ url, seenOn }`),
`addedAt`, `updatedAt`. Deleted with its idea (`onDelete: Cascade`).

## Routes (each answers only DotAmi's own window: `Sec-Fetch-Site: same-origin`)

| Route | Does | Rate-limit bucket |
|---|---|---|
| `GET /api/futures/<idea id>/watched` | The list, in the order added | `watched-read` (300 a minute) |
| `POST /api/futures/<idea id>/watched` | Adds `{ nameAsTyped, url?, note?, adLinks? }` | `watched-add` (60) |
| `POST /api/futures/<idea id>/watched/<business id>` | Replaces one business (the whole business sent again) | `watched-edit` (60) |
| `POST /api/futures/<idea id>/watched/<business id>/remove` | Removes one, body `{}` | `watched-remove` (60) |

Each write reads its body through `readJsonWithLimit` (64 KB; 1 KB for remove). A business id from another
idea's list is *not on this list* (404), never changed. Nothing here makes a request off the computer.

## Privacy

Listed in `lib/privacy/inventory.ts` (*Businesses you're watching*, with an *About other people* line: a
business can be one person trading under their own name), on *What DotAmi knows about you* with its count, and
on its Delete menu (*Businesses you're watching*; *Your ideas* takes every list with it). Not in the plan export
(competitive-landscape.md § 15 item 9: left out by default). Privacy log: *"Keeps: businesses you choose to
watch, with your notes. On this computer only; deleted with the idea."*

## Tests

`tests/watched-businesses.spec.ts` (storage and routes: order, caps, the link-scheme control, the window check,
the body cap, the rate limit, deleted with the idea), `tests/landscape-words.spec.ts` (the words),
`tests/desktop-migrate.spec.ts` (the new table only; ideas, figures and links survive),
`tests/privacy-delete.spec.ts` (a real watched business: deleted with its idea, or alone from its own box, its
note gone from the file's bytes); in the browser `e2e/landscape.spec.ts` (add, edit, remove, a `javascript:` link
refused, kept after a reload, opened from the step, no request off the computer, and **Remove ad link 2** of
three keeping links 1 and 3 with their own days), `e2e/journey.spec.ts`,
`e2e/no-verdict.spec.ts` and `e2e/example-future.spec.ts`.

## Downstream consumers

None. No rule, gauge, receipt or export reads it.
