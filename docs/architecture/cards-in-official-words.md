# Cards in official words (phase 3, story 1)

Planned 2026-10-24; the maintainer's calls of 2026-10-25. Not built yet. It builds after #211 merges, because
#211 changes many of the same lines. It is the first item of his phase 3 order, "honesty first" (d-call-1).

**The story in one line:** DotAmi never states tax or law in its own words on a card. Every line that does
becomes a page's own words that DotAmi already holds, quoted with how that page was checked, or it goes.

## What it covers

A "card" here is a map stage's card and its step panel (road 0 and the federal road); an engine card in the
step panel, the intake preview and the readout (write-off, grant, compliance, structure rung, and the risk
read inside it); the structure-ladder and prep-tool rails; and the ways to incorporate. "Drawn" means a
screen, Export, Your plan or `GET /api/readout` shows it (the readout counts because the Lens will relay it).

The sweep of 2026-10-24 (main `694007d`, with #207, #208, #210 and #211 read alongside) found **356 lines**
of DotAmi's own prose in those places, 245 drawn and 111 drawn nowhere: 27 become a held quote, 32 are
trimmed or renamed to their official name, 47 stay (neutral, about DotAmi, or the person's own answers),
199 are emptied, 20 wait on a read of their page, 1 stays drawn while waiting (the Class 50 expiry chip,
which the hard constraint on time-limited rules keeps amber), and 30 entries retire (16 of them already by
#207 and #211). Line numbers move: **the build starts by sweeping again**, with the scan below.

## The rule

DotAmi's own words in a drawn slot may never:
- (a) say what a law, regulation, program or authority requires, allows, counts, excludes, limits or does;
- (b) state a tax or legal effect, status or consequence ("may be deductible", "refundable");
- (c) state an amount, rate, threshold, date or period as the rule, except a typed field shown beside its
  held quote;
- (d) judge compliance, audit or review exposure, or rank ("classic trigger", "Professional required");
- (e) tell the person what to do ("Track…", "confirm with an accountant");
- (f) put the person in a tax or legal category they never stated.

What may stay in DotAmi's voice: a name, as the official source gives it; the person's own words and picks
(the rules' reason that names their answers counts); a pointer (a page's title, authority and link, and the
label saying whose words follow); statements about DotAmi itself; a situation with no tax or legal meaning;
and the official words themselves, under their label, with the check behind them.

**A held quote** is a string in `toolCheck.quotes` of one of the entry's own citations (recorded under
citations.md rule 4), or a sentence of the entry's own `officialWords`. Words in a citation's `note`, a
`verification.method`, a doc, or another page's citation are not held. A quote is whole: a full sentence, or
a list item or phrase that names its own subject; never cut before its subject, never opening on "This" or
"it" pointing at text not shown, never joined to another quote by DotAmi's words. A money amount, or a rule
that adds a step, is drawn only from a page a person has read (d-call-5).

No new catalog sentences: catalog edits are deletions, quotes and name corrections. Every new word goes in a
words file.

## The maintainer's calls (2026-10-25)

Recorded on the decision page *Cards in Official Words* (claude.ai, collection `picks`) and *Questions and
Reading List* (`answers`). All as recommended except where marked.

| # | Call | His pick |
|---|---|---|
| 1 | "Tax impact" and "Legal note" labels | They go everywhere. Quotes sit under "Words found on the page:" with their source and check. |
| 2 | "If X, this may unlock Y" lines | None in any catalog. Two fixed words-file phrasings stay: a fork side named by the rung's own name ("As a Canadian-controlled private corporation (CCPC):"), and the rules' reason naming the answers. |
| 3 | A card left with nothing of its own | Stays, saying it has no line of its own, with its sources. The hobby card and the shareholder-agreement template retire (their one source supports none of their words). |
| 4 | The 111 undrawn lines | Deleted. |
| 5 | The 20 lines waiting on a read | **Not as recommended:** they stay drawn, marked as waiting, until their page is read and a quote is held (a ratchet: the list only shrinks). |
| 6 | Risk-box heading | "DotAmi's risk catalog points to this page:", then the page's words and source. The GAAR name only on a run from s.245. |
| 7 | The structure ladder's fork box ("… needs a real business purpose first") | **It goes** (first picked a neutral label, then *drop* once he saw it, 2026-10-25). His note: people still want to see what to do, where to go (online or in person) and the next step, only if it's backed by reality (see *Next*, below). |
| 8 | The readout's risk level | Kept as data, labelled DotAmi's own calibration in the readout's header. |
| 9 | A quote that would show twice on one card | Each quote once: Sources shows the check line without quotes already drawn on that card. |
| 10 | Map stage triggers | Keep 4 (Sole Prop activation, Incorporating, Hire first employee, Service vs. productize), trim 3 (the baseline, Voluntary GST, SR&ED deepening), empty 3 (Mandatory GST, Incorporation for liability/SR&ED, Retained earnings). His note asks how each card is explained: the step panel (a click on any card) is that place; its sourced *done when* lines and official links say what to do. |
| 11 | Cards shown only for structures their catalog lists, with no source for the limit (IRAP, Innovate BC, Ontario's program, the R&D write-off) | The gate goes: each shows for every structure. IRAP's real limit waits for a read of NRC's eligibility page. |
| 12 | The intake's goal cards ("can rank higher", "move up the map") | Retired in this story. His note: the Lens, when built, may edit a person's road and plan as their goals change, at the permission level they chose; it never edits a catalog. |
| 13 | Alberta's sales-tax line | Emptied; the card takes its page's own name, "GST/HST rates", until Alberta's own page ("Alberta has no sales tax.") is checked or read. |
| 14 | CLAUDE.md's two sentences | Reworded: "…DotAmi shows the official words and the person's own answers; it never says 'you should'" and "Every lever ships with its audit/GAAR read: the official words, or its source." |
| 15 | Money amounts and his reading-list reads | Amounts in tool-only quotes wait for a person's read. His reads of 2026-10-25 are recorded (#211), so Incorporating's $500,000, SR&ED's $6 million and the Productivity Grant's $100,000 can be drawn once #211 merges. |

Done the recommended way without a call: the official-words box (`OfficialWordsBlock`) gains its check line
like every other quote; a retired entry's record states only what is held; a quote whose page also has a
read names the tool check that found it, while Sources keeps rule 3 (a read wins).

## How it's built (test-first, each commit green, the waiting list only shrinks)

1. `test:` a registry of every drawn slot (`tests/helpers/drawn-slots.ts`) and a scan
   (`tests/card-own-words.spec.ts`): each slot is quoted (and valid), empty, kept (listed with its rule
   letter and why) or waiting (listed with its page). Planted controls: an own-words tax line, a quote not
   held, a fragment, a quote joined by DotAmi's words, a stale waiting entry. The waiting list starts with
   every own-words slot found, and its ceiling equals that count.
2. `refactor:` every sentence `lib/brain/evaluate.ts` writes moves, unchanged, into `lib/brain/words.ts`.
3. `feat:` a `QuotedLine` shape (`{ url, quotes }`) in the catalogs and `QuotedRun` on `UnlockItem`;
   `PageQuotes` takes a `citation` and draws its check line; empty slots draw nothing; the intake preview
   draws `officialWords`; risk boxes draw their own sources; Export and the readout change shape with them.
4. The map stages, then the engine cards, then the risk reads, then the rails, one commit each with their
   specs; the retirements and deletions; then the docs, the CHANGELOG and CLAUDE.md's two sentences.

Before step 4, a networked `node scripts/check-quotes.mjs` run must have confirmed every quote dated
2026-10-23 (#211's merge condition already requires it).

The full design of 2026-10-24 (shapes, screen by screen, the test list and every pin to update) was worked
out in the planning session; the build session redoes the sweep on the code as it is and follows this page.

## Next, seen but outside this story

- **Next steps backed by reality** (the maintainer's note of 2026-10-25): on every card, what to do and where
  to go, online or in person, only from official pages: the step's *done when* lines and official links, and
  sourced next steps for the structure ladder's rungs.
- Road steps' and pages' own words: the keep-records step's summary and lines, road 0's paraphrased *done
  when* lines, the Delete menu's records sentence, citation `note` fields printed by Export and the readout,
  stage and fork labels ("GST timing"), the intake preview's "and risk-rated", the Export panel's "Verify
  with CRA…" and its words written in the component, and labels that state a status the person never gave
  (Corporation shown as CCPC).
