# First run as a stranger — 2026-09-20

The day DotAmi went public, a maintainer walked every screen exactly as a new person would:
fresh clone, empty database, no statute store knowledge, a made-up venture. Nothing here is
about a real person or business. The point is the list at the bottom — each item is sized so
someone can pick it up.

**The made-up founder:** employed, in Calgary, wants a **mobile bike-repair van** (drive to
homes and offices, fix bikes on the spot), later an **online store for refurbished bikes**,
later a second mechanic. Year-1 revenue guess $45,000, year-3 $180,000. Buying a used van
and tools with savings. Two statements about themselves: wants to stop trading hours for
money within three years and won't borrow to start; works best alone but would hire one
mechanic if the calendar fills.

## What was done, in order

1. `/` landing → typed the venture in the free-text box → **Map it**.
2. `/intake` **About you**: kept two dated statements (one back-dated).
3. **Confirm**: corrected what the keyword parser guessed; added a custom tag.
4. **Ground it**: Alberta (pre-filled from "Calgary"), employment, name, two revenue figures,
   capital purchase, hire-first path → **Open my map**.
5. `/cockpit`: hovered cards (arrows), opened a stage's detail, expanded a write-off,
   **Show the words** on ITA s.18(12), toggled GST timing, set structure → ladder + references,
   **Export** → markdown playbook. **Save / resume.**
6. `/ventures`: notes, stage, **New idea →** second venture through the intake again,
   cross-referenced the two as sister companies.
7. `GET /api/readout` for both ventures; reloaded `/cockpit?venture=<id>`; phone viewport.

## What worked

The whole path works end to end, and the parts that carry the mission are the strongest:
the map lights correctly from the answers; every lever card opens to a plain-English
description, an audit **CAUTION**, the practical line, and typed citations with dates;
**Show the words** puts the Act's own text (with its currency date) on the card; branch
toggles re-light the map instantly; the ladder and prep-tool references appear the moment
the structure is set; the playbook export is complete and cites everything; the ideas page
saves notes on blur, stages, and two-way cross-references; the readout is a clean JSON
document; reloading the cockpit by URL restores the venture. No console errors once the
database was up. Zero horizontal overflow on a 375-px phone.

## Sticky points and roadblocks

Ranked by how much they would cost a real first-time user. **Fix** is a proposal, not a
ruling. **Size** is a guess for someone new to the repo.

### Roadblocks (a new person loses work or trust)

1. **"Open my map" does not save the venture.** The cockpit draws from the browser tab's
   session; nothing reaches the database until **Save / resume** — a small button at the
   bottom of the left rail, below the fold on most screens. Close the tab and the venture is
   gone; `/ventures` stays empty. Cockpit edits (structure, branch picks) also stay unsaved
   until the button is clicked again, so the ideas card shows "Structure Not Set" after you
   set it. *Fix:* save on **Open my map**, autosave cockpit edits (debounced) with a visible
   "Saved · 12:04" / "Unsaved changes" state; keep the button as the manual fallback.
   *Where:* `components/discovery/intake-page.tsx` (`openMap`), `components/cockpit/`
   left rail, `POST /api/scenario/save`. *Size:* M.
2. **The keyword parser tags "repair" as AI / ML / R&D.** `lib/journey/intent-fallback.ts`
   matches synonyms as substrings, and `"ai"` is one of them — so *repair, paint, maintain,
   train, detail, hair, nail, retail* all light "AI / ML / R&D", which then puts **SR&ED tax
   incentives** and **NRC IRAP** in the live preview for a bike shop. Same class: `"pc"`,
   `"ml"`, `"car"` (car**pent**er), `"van"` (ad**van**ce). *Fix:* word-boundary matching for
   short tokens (or all tokens), plus cases in `tests/intent-fallback.spec.ts` ("bike repair
   van in Calgary" → Trades, not R&D). *Size:* S — **good first issue**.
3. **The landing page carries no "not legal or tax advice" line and no link to the
   project.** The README has both; the app's first screen has an empty footer. A stranger
   arriving from a link sees neither the disclaimer nor where the code and the contributing
   guide live. *Fix:* one footer line on every page — "Information, not legal or tax advice ·
   a prep tool for you and your accountant · open source on GitHub" — with the repo link.
   *Where:* `app/layout.tsx` or the landing's `contentinfo`. *Size:* S — **good first issue**.
4. **The cockpit is unusable on a phone.** At 375 px the left rail takes most of the width
   and the tier columns are squeezed into a strip where every card title is cut off; the
   legend wraps into a tall sliver. Nothing overflows, it just cannot be read. *Fix:* below
   `md`, collapse the rail into a drawer or a top summary strip, and let the tiers scroll
   horizontally one column at a time (snap). *Where:* `components/cockpit/cockpit-page.tsx`,
   `strategy-map.tsx`. *Size:* M.

### Sticky (works, but a new person hesitates or is misled)

5. **"YOUR PICK" on a card the person never picked.** With GST timing still on its default
   (the toggle itself says "default, not your pick yet"), the *Mandatory GST registration*
   card is chipped **YOUR PICK**; same for *Incorporation at $80K net*. The toggle and the
   card contradict each other. *Fix:* a fourth chip state — **default** — until the toggle
   has been clicked. *Where:* `lib/scenarios/branches.ts`, `strategy-map.tsx`. *Size:* S.
6. **"Vault: No external statement source configured."** Shown on About-you and in the
   cockpit rail to every user. "Vault" means nothing to a stranger, and the line describes an
   optional self-hosted feature nobody has configured. *Fix:* hide the line when
   `vault.available === false` and no `DOTAMI_VAULT_PATH`-style setting exists; or reword to
   "External sources: none" in a collapsed details row. *Size:* S — **good first issue**.
7. **The capital-purchase lever is always "CCA Class 50 — computer equipment".** The
   intake only knows *a* purchase is planned, not what it is, so a van buyer sees a
   computer-equipment write-off and no motor-vehicle class (10/10.1) beside the *Motor vehicle
   expenses* card. *Fix:* one more intake field — what kind of purchase (computer · vehicle ·
   tools/machinery · other) — mapped to the right CCA entries; the catalog already has
   "Capital equipment (tools, machinery)". *Where:* intake Ground-it screen, write-offs
   catalog, `lib/brain/evaluate.ts`. *Size:* M, needs a cited Class 10/10.1 entry first.
8. **The stage "why" line is thin.** "Shown because your sole proprietorship venture
   includes Trades activity" for *Home office expenses* explains the tag match, not the rule.
   *Fix:* the why should quote the condition that fired (e.g. "you work from home" once the
   intake asks, or "sole proprietorship + expenses incurred to earn income"). *Size:* S–M.
9. **Employment defaults to "Employed"** on Ground-it instead of asking (the province select
   does ask: "Choose…"). *Fix:* a "Choose…" default and the same gate as province. *Size:* S
   — **good first issue**.
10. **"New idea →" restarts at About-you.** For a second venture the person's statements are
    already on record; the screen is a detour before the description box. *Fix:* start a new
    idea at Confirm's empty state ("What are you building?"). *Size:* S.
11. **"Projection assumptions become visible" appears in the live preview at $0 revenue** and
    names a feature that was removed. Known: `lib/brain/evaluate.ts` `refineUnlocks` adds it
    unconditionally. *Fix:* drop the item or gate it on a revenue figure. *Size:* S — **good
    first issue**.
12. **A sole proprietor is offered a shareholder agreement.** Prep-tool references show all
    four documents once structure is set; two of them (shareholder agreement, contractor NDA)
    only make sense for a corporation or a hiring venture. *Fix:* filter by structure and the
    hire-first flag. *Size:* S.
13. **Tier copy is one person's story.** Tier 1 reads "Employment or apprenticeship income";
    Tier 4 always shows "SR&ED deepening" even for a bike shop. *Fix:* "Employment income
    before the venture"; hide R&D-only nodes unless an R&D tag is set. *Size:* S.
14. **Playbook export is raw markdown in a panel.** Right for a developer, odd for "hand
    this to your accountant". *Fix:* a rendered view with **Copy** / **Download .md** /
    **Print to PDF**. *Size:* M.
15. **Statute text has no paragraph breaks.** "Show the words" renders s.18(12)'s paragraphs
    (a), (b), (i), (ii) as one run-on block. *Fix:* break on paragraph labels in the render.
    *Where:* `components/shared/citation-links.tsx`. *Size:* S — **good first issue**.
16. **Accessibility.** Toggle chips carry no `aria-pressed`; every map card and every
    "+" expander is a button with no accessible name (screen readers announce "button" ×20);
    the app is dark-only with no `prefers-color-scheme` light theme. *Size:* S each.
17. **Catalog freshness is visible.** Lifecycle nodes show "VERIFIED 2026-05-01"; the
    write-offs show September. Not a bug — it is the contribution the CONTRIBUTING guide asks
    for, and the dates make it obvious where to start.

## What would help this take off

**For a stranger to *look at*:** a live demo. Today the only way to see the map is to clone,
run Postgres and `npm run dev`. A read-only hosted demo (no auth needed: one seeded venture,
writes disabled) or even three screenshots + a 60-second GIF in the README would do more
than any feature. Related: the landing needs the disclaimer + repo link (item 3).

**For a stranger to *work on*:** turn the items above into issues with the labels already
in the repo (`good first issue`, `content`, `correction`, `enhancement`), pin three of them,
and answer the first PRs within a day. Items 2, 3, 6, 9, 11, 15 are each an afternoon.

**User-friendliness, in order of leverage:** save on Open my map (1) · the parser fix (2) ·
disclaimer + repo footer (3) · the default-vs-pick chip (5) · hide the vault line (6) · phone
cockpit (4). Everything else is polish.

**Back end:** the deterministic rules engine and the citation-required catalogs are the
project's spine and should stay exactly that. Three things would make them easier to
contribute to: (a) **roadmaps as data** — one cited markdown file per node compiled by a
script that refuses uncited nodes ([roadmap §1](../roadmap.md)), so a contributor never edits
TypeScript to add a node; (b) a **jurisdiction model** ([§4](../roadmap.md)) so the second
country is a folder, not a refactor; (c) a **facts interface** between the evaluator and
whatever supplies figures — typed today, a local ledger import tomorrow ([§5](../roadmap.md))
— so "check first" can become "applies" from real records without the engine changing.
Separately: autosave (1) and an `updatedAt`-based "Saved" indicator are the only schema-touching
changes in this list; `ScenarioState` already carries what is needed.

## Repro notes for whoever picks these up

Fresh database: `createdb dotami_public` (or a new Docker volume), `DATABASE_URL` → it,
`npm run prisma:deploy`, `npm run dev`. Landing text used: *"A mobile bike repair van in
Calgary — I drive to people's homes and offices and fix their bikes on the spot. Later I want
to sell refurbished bikes online and hire a second mechanic. I'll need to buy a used van and
tools."* Expected parser result today: **Product**, **AI / ML / R&D + Trades**, Alberta,
capital purchase. Correct result: **Service**, **Trades**, Alberta, capital purchase.
