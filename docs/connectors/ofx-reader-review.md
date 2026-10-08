# The OFX reader: a review of `ofx-js` 1.1.2

**Read on 2026-10-07.** This is the written check behind the [8g] bank-statement reader
([lib/figures/bank/read-ofx.ts](../../lib/figures/bank/read-ofx.ts)). The maintainer decided on
2026-10-07 to use a free reader someone else built, and to read it before relying on it, so that
DotAmi can edit the code if the reading shows it must. This page is that reading.

OFX (and its Quicken flavour, QFX) is the file most Canadian banks offer as "download for Quicken or
QuickBooks". It carries, by design, the **account number**, the bank and branch numbers and the
bank's own id for each transaction. That is why the reader is read in full
instead of trusted.

## The short version

- **Use the package, pinned exactly at 1.1.2. No copy, no edits.** It is 221 lines of TypeScript
  (192 once compiled), has no dependencies, imports nothing, and cannot reach the network. I read
  every line of both.
- **It is not safe to use bare.** Findings 1 to 4 below would quietly give a wrong answer or tie
  up the window ([the list](#what-i-found)). None needs an edit to the package: the wrapper that
  DotAmi calls (`readOfx`) deals with each before or after the package runs, and a test pins each.
  Finding 5 is a refusal, not a wrong answer; the first real bank file will show whether it bites.
- **The one thing a wrapper cannot do is stop the package once it starts.** It is synchronous. The
  wrapper therefore refuses oversized and absurd files _before_ handing them over. That keeps a
  real statement to about 1.3 seconds on this computer (the measurements are under finding 4 and in
  [the second check](#the-second-check-what-it-found-and-what-changed)). A crafted file can still be
  slower: the third check built one (letter-only account ids against long memos of the same letter)
  that takes about 24 seconds, and the reader's own 10-second clock refuses it as too slow. So the
  clock, not the caps, is the bound for a crafted file — it fails closed, never with a wrong answer. The screen that uses the
  reader should run it in a Web Worker so the window never waits.
- **Version 1.1.2 matters.** Versions up to 1.1.1 could be kept busy for minutes to hours by a
  small crafted file (exponential backtracking in a pattern, per the fix's own commit message; I did
  not run 1.1.1). It was fixed on 2026-09-30, a week before this review, and no security advisory
  was published for it. Never go below 1.1.2.
- **When an edited copy would be the right call:** if a real bank's file is refused for a reason
  that is the package's fault (the empty-tag case in finding 5 is the likely one). Then copy the
  one file under `lib/figures/bank/vendor/`, keep the MIT notice, and make that edit. The steps
  are at [the end](#if-an-edited-copy-is-ever-needed).

## What was checked, and how

| What                                  | How                                                                                                                                                                                                                                                                                                                       | Result                                                                                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The code                              | `npm pack ofx-js@1.1.2` into a scratch folder outside the repository; read `ofx.ts` (221 lines) and the compiled `ofx.js` (192 lines) in full, plus `package.json`, `LICENSE`, `README.md` and `ofx.d.ts`. The other type file (`ofx-types.d.ts`, 45 KB of type declarations, no code) was skimmed, not read line by line | Read. Nothing else is in the package.                                                                                                                                               |
| Is it the code its authors published? | Fetched `ofx.ts` at the release commit on GitHub and compared it with the npm tarball                                                                                                                                                                                                                                     | Identical, byte for byte (after line ends).                                                                                                                                         |
| Known vulnerabilities                 | GitHub Advisory Database, queried 2026-10-07 for `ofx-js`, `ofx-data-extractor`; `npm audit` with `ofx-js` added                                                                                                                                                                                                          | None for either package. `npm audit --omit=dev`: 0. (`npm audit` as a whole reports 13 findings, all in development tooling such as the installer builder; none involves `ofx-js`.) |
| Network and dangerous calls           | Searched `ofx.js` for fetch, XMLHttpRequest, WebSocket, require, import, eval, Function, child_process, http, https, net, tls, dgram, dns, process, globalThis, window and document                                                                                                                                       | One hit: a local function named `document` (the XML parser's start rule). No imports at all.                                                                                        |
| Odd and hostile input                 | [scripts/ofx-review-probe.mjs](../../scripts/ofx-review-probe.mjs): 17 hand-made odd inputs, 11 timing runs up to 10 MB, a 20,000-input random fuzz                                                                                                                                                                       | Tables below. Run it again on any new version.                                                                                                                                      |
| Licence                               | `LICENSE` in the package                                                                                                                                                                                                                                                                                                  | MIT, "Copyright 2012-2017 Apps Attic Ltd". Compatible; the notice must be kept if the code is ever copied.                                                                          |
| Size and use                          | npm and GitHub                                                                                                                                                                                                                                                                                                            | 63 KB unpacked, 7 files, 7 releases since 2017, one npm maintainer, 34 GitHub stars, 0 open issues.                                                                                 |

Recorded so a change is noticed: npm integrity
`sha512-aKGgu+/vF70vvPpjSuAiTy+jroSb2JVtKDf72U9ZgCf8/zZk/lOuzRbOc73Fn9xdecolBOBW5i1c6uVkj0r1zw==`;
SHA-256 of `ofx.js` `06056641e8d850005df9617382e306141132ebb07af401346ad88fea211d34e6`;
SHA-256 of the tarball `ec629abc9962cab018d7f28fbd3d5557ba638ff2bf5fed58a6f2ff20fc1cb665`.
A test ([tests/figures-bank-ofx.spec.ts](../../tests/figures-bank-ofx.spec.ts), "the package
underneath") fails if `package.json` stops pinning the exact version or if `ofx.js` is not the
file that was read.

## What the code does, in plain English

It turns the text of an OFX file into a tree of plain JavaScript objects whose every value is text.
It does not look at what any tag _means_: a transaction's amount is the string `"-80.25"`, a date
is `"20260121120000[-5:EST]"`. Everything about meaning is the caller's job, which is the wrapper's.

Line numbers are those of `ofx.ts` in the package.

**`parseSync(data)` (lines 179 to 202), the one function DotAmi calls.**

1. Splits the text at the first `<OFX>` (line 181). Everything before it is the "header".
2. Reads the header line by line (183 to 188): each line that has a colon becomes a name and a value
   (`CHARSET:1252`). DotAmi does not use the header.
3. Puts `<OFX>` back in front of what followed it (191).
4. Tries to read that as XML (197). If that throws, it rewrites the text from OFX 1.x's SGML into
   XML with `sgml2Xml` and reads again (199). If that throws too, the error goes to the caller.
5. Returns the header and the tree.

**`sgml2Xml` (lines 4 to 12): OFX 1.x to XML.** OFX 1.x is SGML: leaf tags such as `<TRNAMT>-80.25`
have no closing tag, while container tags (`<STMTTRN> ... </STMTTRN>`) do. Six text replacements:
squeeze the whitespace around tags (6 to 8); strip a closing tag that is present on a leaf so that
all leaves look alike (9); remove dots from tag names, so Intuit's `<INTU.BID>` becomes `<INTUBID>`
(10); and add the missing closing tag to every leaf (11). A leaf with nothing after it cannot be
closed this way, which is finding 5.

**`stripComments` (19 to 30).** Removes `<!-- ... -->`. It is a plain search for `<!--` then `-->`
(rewritten in 1.1.2; the old pattern was quadratic). An unclosed `<!--` stops the search and the
rest of the text is kept, which then fails to parse.

**`parseXmlString` (43 to 133): a small hand-written reader.** It trims the text, removes comments,
skips a leading `<?xml ... ?>` line, and then reads one element. Reading an element (`tag`, 61 to
100): take `<name`, read any `attribute="value"` pairs, read the text up to the next `<`, then read
child elements one after another until there are none, then require `</name>` with the _same_
name or throw "Missing closing tag". Helpers: `content` reads text and decodes entities (102);
`attribute` reads one pair (107); `entities` decodes `&lt;`, `&gt;` and `&amp;` and nothing else
(117 to 119); `match` takes a pattern anchored at the start, removes what matched from the front of
the remaining text, and returns it (122 to 127). Every pattern passed to `match` is anchored with
`^`, which is what makes the reading linear in 1.1.2.

**`convertAstToObject` (139 to 158): the tree becomes objects.** An element with no children
becomes its text. An element with children becomes an object keyed by the children's names. A name
that appears once is a value; a name that appears again turns into an array. So one `STMTTRN`
comes back as an object and two come back as an array. (Finding 9.)

**How it parses, in a sentence.** Not one big pattern, and not a library: a recursive reader over a
string, using small anchored patterns as its tokenizer, with OFX 1.x rewritten into XML first. It
tries XML first, so a well-formed XML file never goes through the SGML rewriting.

## What it does with each thing you asked about

| Topic                    | What `ofx-js` does                                                                                                                                                                                                                                                                                                            | What DotAmi does about it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DOCTYPE and entities** | A `<!DOCTYPE ...>` _before_ `<OFX>` is part of the header: ignored, and its entity declarations are never read. One _inside_ `<OFX>` throws. An entity such as `&x;` is never expanded: it stays as the characters `&x;`. Only `&lt; &gt; &amp;` are decoded. So it cannot be made to expand an entity or fetch a file.       | `readOfx` refuses any file with `<!DOCTYPE`, `<!ENTITY`, `<!ELEMENT`, `<!ATTLIST` or `<!NOTATION` (any spacing or case) before the package sees it. A bank download never has one, and refusing is cheaper than reasoning about it.                                                                                                                                                                                                                                                                                                                                                                                |
| **Very large files**     | Linear in the text. Measured: a real-looking 10 MB statement 0.5 s (XML) and 0.8 s (SGML); the worst crafted 10 MB file 3.1 s; heap use up to about 0.5 GB for 10 MB of nothing but tags. No size limit of its own.                                                                                                           | Refuses over 10 MB before reading, over 500,000 `<` characters (about 40,000 to 60,000 transactions) before parsing, and any `=` between a `<` and the next `<` or `>` in the body, whatever the tag is called (finding 4). A real-looking statement of 62,000 transactions, near that cap, reads in about 1.3 s. The timings for crafted files are under finding 4 and in the second check.                                                                                                                                                                                                                       |
| **Time**                 | Synchronous. Once started it cannot be stopped.                                                                                                                                                                                                                                                                               | The caps above bound the wait to under two seconds in everything I could build (1.9 s the slowest); the clock is checked after each step and after every row, and a result that arrives past 10 seconds is discarded. Run in a Web Worker in the screen.                                                                                                                                                                                                                                                                                                                                                           |
| **Malformed input**      | Throws `Error` for a cut-off file, a mismatched tag, stray text or markup it doesn't know (CDATA, an SGML tag with no value, a bare `<` in text). Throws `RangeError` (out of stack) for nesting 100,000 or more deep (tested at 100,000 and 200,000); 5,000 deep is fine. It fails _closed_: no case produced wrong numbers. | Any throw becomes the fixed sentence "couldn't read that file as a bank download". The exception's text is never passed on.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Duplicate FITIDs**     | Nothing special. Two transactions with the same FITID are two entries in an array.                                                                                                                                                                                                                                            | Passed through as the bank wrote them, one id for one original. `bankMonthlyTotals` counts a repeated FITID once when the day, amount and currency also match, and lists the second copy as "duplicate". An id with an account number in it has the number blanked, and two different originals that blank to the same text are kept apart (see "Transaction ids" below), so two different transactions are never merged into one. A FITID written twice inside one transaction makes that row unreadable (listed, never counted), so a duplicate is not missed.                                                   |
| **Pending transactions** | Nothing special. A `BANKTRANLISTP` / `STMTTRNP` section is just more tags.                                                                                                                                                                                                                                                    | Rows from the pending list, and any row with type `HOLD`, are marked `pending`; `bankMonthlyTotals` never counts them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Corrections**          | Nothing special. `CORRECTFITID` and `CORRECTACTION` are strings.                                                                                                                                                                                                                                                              | Passed on as a correction (REPLACE or DELETE) naming the earlier FITID, through the same id mapping as the rows, so it names the one row the bank meant and no other; `bankMonthlyTotals` applies it. An unknown or missing action is treated as DELETE: the earlier row is out either way, and nothing is counted on a guess. A CORRECTFITID written twice refuses the file (the rows it should change would stay counted); a CORRECTACTION written twice is an unknown action and the row is unreadable.                                                                                                         |
| **Several accounts**     | Several `STMTTRNRS` become an array; one becomes a single object (finding 9).                                                                                                                                                                                                                                                 | One `OfxStatement` per account, told apart only by position, each with its own currency, ids unique across the file. Totals are worked out per statement because a FITID is only unique within one account.                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Character sets**       | None. It takes a JavaScript string; the header's `CHARSET:1252` is read as text and ignored.                                                                                                                                                                                                                                  | The wrapper decodes the bytes: Windows-1252 when the header says `CHARSET:1252`, else a byte-order mark, else UTF-8 if valid, else Windows-1252 (the same guess as a CSV).                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Dates and amounts**    | Leaves them as text.                                                                                                                                                                                                                                                                                                          | Date: the first eight digits are the day, exactly as written; an offset like `[-5:EST]` is ignored on purpose, so a late-evening transaction never moves to the next day. Amount: whole cents by digit arithmetic (no floating point); `.` or `,` as the decimal mark; a third decimal that isn't zero, a thousands separator (`1,234.56`), a comma followed by exactly three digits (`1,000`: a thousand, or one dollar to three places? not ours to pick), or more than a safe-integer's worth is refused as unreadable. A `.` followed by three digits is the format's own decimal point, so `12.500` is 12.50. |
| **Account and bank ids** | Returns them like any other tag.                                                                                                                                                                                                                                                                                              | Read only to be blanked out of descriptions and transaction ids (see below), then dropped. The result has no field for one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## What I found

Numbered in the order they matter. None is a hole in the sense of letting an attacker run code or
reach the network; each is a way to get a **wrong answer silently** or to **tie up the window**.

1. **A file with no `<OFX>` is "read" successfully and returns the text `"undefined"`.** Any CSV,
   web page or PDF given to `parseSync` comes back without an error (`OFX: "undefined"`). Cause:
   `split('<OFX>', 2)` gives a one-element list and the code appends `ofx[1]`, which is
   `undefined`, to `<OFX>`. _Handled:_ `readOfx` requires `<OFX>` to be present and checks that
   what comes back is a tree, not text. Tests: "refuses what is not an OFX file at all".
2. **A second `<OFX>` silently drops everything after it.** JavaScript's `split(x, 2)` keeps two
   pieces and discards the rest. Two bank downloads pasted into one file (people do this to
   "combine" months) come back as the first only, with no error, so a total would be low and
   nothing would say so. _Handled:_ `readOfx` refuses a file with more than one `<OFX>`, with a
   sentence that says to drop the downloads one at a time. Test: "refuses two downloads pasted
   into one file", which also asserts the package's own answer is the first download alone.
3. **A DOCTYPE or entity declaration is ignored without comment.** Safe on its own, since nothing
   is expanded, but a file that declares its own types is not a bank download and a
   silent pass-through hides that. _Handled:_ refused (table above). Test: "refuses a
   document-type or entity declaration, however it is spelled".
4. **It cannot be interrupted, and its cost follows the tag count and the attribute count.** A
   real-looking 10 MB statement takes under a second, but a file that is mostly tags takes up to 3 s
   and up to 0.5 GB per 10 MB. A tag may also carry any number of `name=value` attributes, which an
   OFX body never has and which a count of `<` characters does not see: 10 MB of them inside two
   tags took 2.4 s and about 75 MB of memory before the reader refused attributes.
   _Handled:_ caps checked before parsing (above), and anything with an `=` between a `<` and the
   next `<` or `>` is refused. The first version of that refusal looked for `<`, a letter, a space
   and then an `=`, and a re-check found the way round it: the parser accepts a tag name that
   starts with `_`, `-`, `.`, `:` or a digit, so `<_A a=1 a=1 ...>` was read, 9.8 MB of it in
   0.92 s (measured on this computer, before the fix; the refusal now takes 10 ms). It no
   longer depends on the name. Only the text from `<OFX` on is checked: the header and the
   `<?OFX ...?>` line, which do carry `=`, come before it. A comment or a stray `<` with an `=`
   after it is refused too; a bank file has neither, and refusing a strange file is cheaper than
   reasoning about it.
   Measured on this computer after the fixes (the range is the runs of three; the machine is not
   quiet, so compare runs and not the absolute numbers; nothing here is a test threshold):

   | File                                                                              | Size   | Time           | Result                   |
   | --------------------------------------------------------------------------------- | ------ | -------------- | ------------------------ |
   | 10 MB attribute flood, tag `_A` (also `A`, `1A`, `-A`, `.A`, `:A`)                | 9.3 MB | 8 to 12 ms     | refused                  |
   | 490,000 tags `<_A>1` (just under the tag cap)                                     | 2.3 MB | 0.55 to 0.7 s  | no statement             |
   | 490,000 tags `<A.B>1`                                                             | 2.8 MB | 0.6 to 0.8 s   | no statement             |
   | 10 MB of `<A` (past the cap)                                                      | 9.8 MB | 75 ms          | refused                  |
   | 62,000 real-looking transactions                                                  | 6.9 MB | 1.1 to 1.6 s   | read                     |
   | 62,000 rows whose id is the account number and a counter                          | 5.7 MB | 0.9 to 1.0 s   | read                     |
   | one row, a 9.8 MB name and memo of zeros against a near-miss 40-digit number      | 9.8 MB | 70 to 80 ms    | read, description empty  |
   | 14,500 rows, a 590-character memo of zeros each, 29 near-miss account numbers     | 9.4 MB | 0.83 to 0.84 s | read                     |
   | 14,500 rows whose memo is 600 characters that grow 18 times under Unicode folding | 2.1 MB | 0.73 to 0.76 s | read, descriptions empty |
   | 14,500 rows whose memo is 39 copies of the account number                         | 9.5 MB | 0.54 s         | read                     |
   | 29,000 rows, a 250-character id of dashes that nearly spells a number, 29 numbers | 8.6 MB | 0.83 to 0.87 s | read                     |

   The last row took 2.9 s until the scrubber stopped working out the text with its spaces and
   dashes taken out once for every number (it is now done once, and again only after a number is
   blanked). These are measurements, not proofs: a cleverer file may cost more, and the 10-second
   clock then ends it. _Not handled here:_ the window still waits for that second or so; a Web
   Worker in the screen removes the wait. Version 1.1.1 and older were far
   worse (the release notes for 1.1.2 describe a 40-character tag name taking hours); 1.1.2
   parses that in 0.1 ms and the fuzz found nothing slower than 4.2 ms on small inputs.

5. **It refuses, rather than repairs, some files that a real bank might produce.** An SGML tag with
   nothing after it (`<MEMO>` and then a new line) cannot be closed by the rewriting and the
   whole file is refused. The same for a bare `<` in a memo and for CDATA. This is the safe way
   to fail, and it is also the most likely reason a _real_ file would be turned away. The package's
   issue 6, "empty tag without closing tag", is the same case and is closed, but 1.1.2 still
   refuses it (tested). _Handled:_ the file is refused with "couldn't read that file". If a real
   bank's download does this, that is the case for an edited copy.
6. **Only three entities are decoded.** `&quot;`, `&apos;` and numeric ones such as `&#65;` stay as
   written. This affects descriptions only (shown on screen, never added up). Not handled; the
   screen shows the characters as the file wrote them.
7. **A tag named `__proto__` is swallowed and changes the object's prototype; tags named
   `constructor` or `toString` become arrays holding a function.** I checked whether this could
   pollute JavaScript's own objects or supply a field the file didn't write: it cannot
   (`Object.prototype` stays empty; the prototype that gets set is an array, which has no upper-case
   names). The wrapper reads only a node's own properties anyway. Test: "tags named like
   JavaScript's own properties".
8. **In XML mode, a value keeps its trailing spaces** (`<A> 5 </A>` gives `"5 "`; the leading space
   is eaten). _Handled:_ every value is trimmed.
9. **The shape of the result changes with the count**: one transaction is an object, two are an
   array; the same for accounts. A caller that doesn't know this reads the first transaction of a
   one-transaction file as a list of fields. _Handled:_ every list goes through one helper.
10. **Text after `</OFX>` is ignored.** Harmless alone; with finding 2 it is how the second download
    went missing.
11. **Supply chain.** The latest release is a week old. The exponential-backtracking problem it
    fixed has no advisory, so a vulnerability scanner would not have told anyone. The package has one npm maintainer. _Handled:_ pinned exactly, integrity recorded,
    the code is short enough to re-read, a test fails if it changes, and nothing in the app
    imports it except the wrapper.

Nothing in the package logs, stores, or sends. It has no state.

## `ofx-data-extractor` 1.5.0, for comparison

Looked at, not adopted. MIT, no dependencies, one maintainer; npm shows the package last changed on
2026-03-24.

- **It ships minified.** Two bundles of about 16 KB each on single lines (`dist/esm/index.min.js`,
  `dist/umd/bundle.min.js`); the TypeScript source is not in the package. It cannot be read the way
  `ofx-js` was without first reformatting it, and an edit would be an edit to minified code.
- **It reads text with patterns over the raw string** and evidently builds JSON text and parses
  that (hostile input failed with JSON syntax errors). I tried a name containing quotes and a fake
  `"TRNAMT"`: it was escaped correctly, no injection.
- **It turns a non-OFX file into junk without an error** (a CSV came back as an object whose keys
  were its own cells) and does not notice a DOCTYPE (it came back as junk keys). Same class as
  findings 1 and 3.
- **It renames the transaction tag** (the output key is `STRTTRN`), and re-formats dates itself.
  Its extras (a summary, a normalised form, a validator) are things DotAmi would not use: the rules
  about what counts live in `bankMonthlyTotals`, not in a reader.
- **Slower on hostile input.** On about 12 MB of `<A>1` repeated it took 6.0 s and then failed;
  `ofx-js` took 3.1 s on a slightly smaller one (11.4 MB). Not a like-for-like run.
- No known advisories.

It is not worse in a way that would rule it out, and it is not better in a way that would justify
swapping a package that can be read in an afternoon for one that can't.

## Recommendation

**Use `ofx-js` 1.1.2, pinned exactly, called only through
[`readOfx`](../../lib/figures/bank/read-ofx.ts). Make no copy and no edit.** Why not a copy: every
finding above is handled outside the package, so a copy would add code for DotAmi to maintain and
bring no change in behaviour. Why not unpinned: the version below this one is dangerous and the
version above it has not been read.

**Upgrading:** run `npm pack ofx-js@<new>` in a scratch folder, diff its `ofx.ts` against the one
read here (`diff` of 221 lines), read the difference, re-run
[scripts/ofx-review-probe.mjs](../../scripts/ofx-review-probe.mjs), then update the version in
`package.json`, the lockfile, the hash in the test, this page, and the `ofx-js` entry in
[lib/privacy/inventory.ts](../../lib/privacy/inventory.ts).

### If an edited copy is ever needed

Triggers: a real bank's download is refused for finding 5; a need for an interruptible parse (a
deadline check inside `match`) that a Web Worker can't give; or the maintainer simply wants it.

1. Copy `ofx.ts` and the type file it imports, and `LICENSE`, into `lib/figures/bank/vendor/ofx-js/`.
   Keep the MIT notice and add a header saying which version it is from and listing every edit.
2. Change the one import in `read-ofx.ts` from `"ofx-js"` to the copy. Remove the dependency from
   `package.json`, the lockfile and the `ofx-js` entry of `DEPENDENCIES`; the privacy tests then
   scan the copy as DotAmi's own code. Move the "same file that was read" test to the copy.
3. Likely first edits: for finding 5, make an empty SGML leaf an empty string instead of an error;
   for the time limit, count steps in `match` and throw past a deadline. Nothing is edited today.

## What the wrapper does

[`readOfx(bytes or text, options?)`](../../lib/figures/bank/read-ofx.ts) returns
`{ ok: true, statements, ignoredInvestment }` or `{ ok: false, reason, error }`. No screen uses it
yet, and nothing in the app calls it.

- **Rows** are exactly [`BankRow`](../../lib/figures/bank/types.ts), the shape
  `bankMonthlyTotals` takes: money in positive (OFX signs it that way for bank and card), whole
  cents, the day as written, `fitid`, `pending`, and `corrects`. A transaction that can't be read
  is **kept** as a row with an empty day or a NaN amount, and the totals list it as "unreadable"; a
  tag the row depends on (its type, id, amount, day or correction action) written twice, or
  holding more tags instead of text, is such a row too (two amounts means no amount, and a HOLD
  written twice is not read as "no type"). A CORRECTFITID written twice is the exception: the file is
  refused, because the rows it should have changed would still be counted (second check, item 2).
- **Coverage** comes from `DTSTART` and `DTEND`, and only ever errs towards fewer months: a bare
  end date is marked "unsure" (the person is asked); an end at midnight is exclusive, as OFX says;
  an end at the last second of a day includes that day; an end at any other time leaves that day
  out; a start later than midnight starts the next day; a missing or backwards range covers nothing.
- **Account numbers.** Every number that names an account anywhere in the file is read once, up
  front, only so it can be blanked, as `[hidden]`, wherever it appears in a description or a
  transaction id: each statement's account, bank and branch numbers and account key, the "transfer
  to" account a transaction may carry, and any investment account. **Every value of each of those
  tags counts**, however many times the file writes it, and a tag that holds more tags has the
  text of those collected too. One list serves the whole file, because a transfer between the
  person's own accounts puts the OTHER account's number in this one's memo (some banks also build
  the id from the number). A number is found in these forms:
  - as written, with up to three spaces, dashes, dots, slashes, underscores or middle dots (U+00B7)
    between its digits (`0001 2345 6789`, `0001-2345-6789`, `0001.2345.6789`, `0001/2345/6789`);
  - **with its leading zeros dropped** (`000123456789` is also found as `123456789`, or as
    `1234-5678-9`), when five or more digits remain: four digits are as often an amount or a year as
    an account, so `0001234` is blanked in full but a bare `1234` is left alone;
  - **when the file's number holds a transit and an account together** (`04567-0001234567`, space or
    dash or any of the gaps above), each part of five or more digits on its own (`04567`,
    `0001234567`, and `1234567`) as well as the two together;
  - a number the bank wrote with gaps in its own account block is looked for as its bare digits, so
    a dotted or slashed one is found in a memo written plain, and the other way round.

  Before any search the text is made plain by `normalise`, and the numbers looked for are made plain
  the same way. What that does, exactly and no more: Unicode compatibility folding (NFKC), which
  turns the Unicode spaces (no-break U+00A0, figure U+2007, narrow no-break U+202F, en, thin,
  ideographic and the rest) into a plain space and the full-width, superscript, circled and
  mathematical digits, the full-width dot, slash and underscore, and the one-dot leader into plain
  ones; drops every Unicode format character (category Cf: zero-width spaces, joiners and
  non-joiners, the word joiner, soft hyphens, direction marks, the byte-order mark, tag characters,
  U+180E); turns every control character, other space and line break into a space; turns every
  dash (category Pd) and the minus signs into `-`; and squeezes runs of spaces. A re-check found
  that only the ASCII space and the tab were handled before: a no-break space between the groups
  let the whole number out. The description shown on the page is made plain the same way. **What it
  does not do is listed under [known limits](#known-limits-of-the-account-number-filter).**
  Numbers shorter than four characters are left alone, since they would match everywhere. A file
  that names more than 30 different numbers, or whose numbers and their other forms come to more
  than 120 patterns, is refused (a real one names a handful). Nothing else from the sign-on or the
  account block (bank name, institution id, user id, account type, balance) is copied. A test
  searches the whole result, and the totals made from it, for the invented numbers, in a
  one-account file and in a two-account file whose memos and transaction id name the other
  account, and finds none; another checks every field name in the result against the allowed
  list.

- **Transaction ids** (FITID, and the CORRECTFITID a correction points at). Whether two rows are
  the same transaction, and which row a correction means, is decided by the bank's _original_ id.
  The reader hands the totals an id per original that is the same for the same original and
  different for a different one, within a statement: an id with no account number in it comes out
  exactly as the file wrote it; one with a number comes out with the number blanked
  (`T[hidden]-1`); and if that text is already the output for a _different_ original (the
  account's own number and a transfer's other number both blank to `[hidden]`), `#2`, `#3` is
  added, counting in the order the file lists them. A first version blanked the ids and nothing
  more, and a re-check showed two real transfers with the ids `000123456789` and
  `000987654321` collapsing into one (the second counted as a "duplicate" and dropped), and one
  correction cancelling both. The original is not kept anywhere the result can reach. _The cost:_
  an id that had a number in it agrees with the same transaction in a second download only when the
  second file lists its ids in the same order, so two overlapping downloads of such an account can
  count the overlap twice. A bank that builds ids from the account number is rare; the screen
  should tell the person to tick by hand when ids read `[hidden]` and the downloads overlap.
  The counter is kept per text, so N ids that blank to the same text cost N steps in all; searching
  from "#2" each time cost N²/2 (10,000 such ids took 17.5 s for the search alone, and a file of them was
  refused as too slow; they now read in 0.2 s, 20,000 in 0.4 s). A hash of the id would have agreed across files, and was left out because a short hash of a
  string that contains a 12-digit number can be guessed back.
- **Descriptions** are the payee name and memo, joined, cut to 200 characters, with line breaks and
  control characters turned into spaces. They stay on the page, as `BankRow` says. A name and memo
  that together run past 600 characters (the format gives 32 and 255) leave the description empty,
  rather than cut it where half an account number might sit; a transaction id past 255 characters
  makes its row unreadable, so it is listed and not counted.
- **Refusals** (each a fixed sentence with nothing from the file in it, in `OFX_REFUSAL_TEXT`):
  empty, too big, not OFX, several downloads, declares its own types, a correction that names its target twice, too many entries, too slow,
  unreadable (this includes any `=` inside a tag), no currency (one is needed per statement and is
  never guessed), no bank or card statement. An investment account in the same file is not read, and `ignoredInvestment` says so.
- **Not wired to any screen.** `lib/figures/file/sniff.ts` is unchanged: today "Add from a file"
  asks where a file is from and turns a bank file away. If someone answers "accounting software"
  for an OFX file, the spreadsheet path reads it as plain text, finds no columns, and proposes
  nothing (tested for all three sample files), so no change is needed there. `looksLikeOfx(head)`
  is provided for the later screen to route a dropped file.

## The second check: what it found and what changed

A second pass over the wrapper (2026-10-07) looked for two kinds of fault: what a REAL bank file
could plausibly contain that the first version got wrong, and anything that FAILS OPEN on a
malformed file (counts a row it should not, or lets a number out). A fault of the second kind is
fixed by failing closed: the row, or the file, is refused as unreadable. A deliberately disguised
input that no bank would write is written down as a known limit and not chased. Each fix below has
a test in [tests/figures-bank-ofx.spec.ts](../../tests/figures-bank-ofx.spec.ts) that was run
against the code before the fix and failed, the failure quoted here.

1. **Searching for a free `#n` suffix started at 2 every time (quadratic).** Ids that blank to the
   same text (the account's own number and a transfer's, or one id written with different
   invisible characters) each got `#2`, `#3`... by counting up from 2. _Fixed:_ the next free
   suffix is kept per text. The search alone took 17.5 s for 10,000 such ids and 64 s for 20,000 on
   this computer; now the whole read takes 0.2 s for 10,000 and 0.4 s for 20,000. Failed before
   the fix with:
   - `Error: expected a readable file, got "too-slow"` (the read stopped at its 10-second clock).
2. **A tag written twice inside one transaction read as "missing", which failed open.** ofx-js
   returns a list for a repeated tag and the reader treated a list as absent: a type written
   `HOLD` twice was not pending (counted as money), a doubled FITID gave the row no id (a
   duplicate was not noticed), a doubled CORRECTFITID dropped the correction (the row it should
   have changed stayed counted). The same for a tag holding more tags instead of text.
   _Fixed, and the choice:_ **the row is unreadable** (listed, never counted) for a doubled
   TRNTYPE, FITID, CORRECTACTION, TRNAMT or day, or any of them holding more tags, because the
   damage stays inside the row. **The file is refused** for a doubled (or nested) CORRECTFITID,
   because the correction cannot name the rows it should change, and an unreadable correction row
   would leave those rows counted at their old amounts. A doubled CORRECTACTION is an unknown
   action, which the reader already took as a cancellation (nothing counted on a guess), and the
   row is now unreadable too. A doubled amount or day already failed closed (they read as empty);
   those tests passed before the fix and are kept as guards. Failed before the fix with, in both
   SGML and XML:
   - `AssertionError: expected 1000 to be NaN` (HOLD twice, and the type twice);
   - `AssertionError: expected 2000 to be 1000` (FITID twice: the same 10.00 counted twice);
   - `AssertionError: expected 'ok' to be 'unreadable'` (CORRECTFITID twice);
   - `AssertionError: expected 15000 to be NaN` (CORRECTACTION twice).
3. **An identifying tag written twice in an account block was never collected, so the number
   leaked.** _Fixed:_ every value is collected (a list, and the text of tags inside a tag), for
   BANKID, BRANCHID, ACCTID and ACCTKEY in the statement's own block and in a transfer's
   BANKACCTTO and CCACCTTO, and for an investment account's ACCTID and BROKERID. (The account block
   itself written twice was already a refusal.) Failed before the fix with, in 21 cases across
   both formats:
   - `AssertionError: expected 'T - FROM 7770001234 AND 8880004321' to be 'T - FROM [hidden] AND [hidden]'`.
4. **Number forms a real bank prints.** (a) The account number with its leading zeros dropped;
   (b) an ACCTID that holds the transit and the account separated by a space or dash; (c) dots,
   slashes, underscores and middle dots between the groups, and a dotted or slashed ACCTID
   against bare digits in a memo. Details under "Account numbers" above. Failed before the fix
   with:
   - (a) `AssertionError: expected 'A - FROM 123456789' to be 'A - FROM [hidden]'`;
   - (b) `AssertionError: expected 'A - FROM 0001234567' to be 'A - FROM [hidden]'`;
   - (c) `AssertionError: expected 'A - FROM 0001.2345.6789 X' to be 'A - FROM [hidden] X'`, and the
     same for a slash, an underscore, a middle dot, a full-width dot, a dot and a space, and a
     spaced slash.

   Controls that must not be blanked, passing before and after: an amount of `1234` against the
   account `0001234`, `1234` against the transit part `1234` of `1234 123456789`, `1234 AND 5678`,
   `1234.56` and a date `2026/01/05` against `000123456789`.

5. **The worst crafted read time.** A file of near-miss patterns was found at about 4.3 s in the
   re-check. With the wider set of gap characters and the extra forms the same kind of file got
   worse, not better: 30 numbers of 10 to 39 zeros, a 590-character memo of dash-joined zeros, a gap
   too wide to belong to a number, then the `1`, in 13,000 rows (9.9 MB) took **over 10 s and was
   refused as too slow** (a pattern with up to three gap characters between its digits retried
   from every character of every text). _Fixed:_ the scrubber now takes the gap characters out of
   the text once, searches what is left with the native substring search (a number is then an
   ordinary substring) and checks that no gap wider than three sits inside the hit. It finds exactly
   the places the pattern did: two comparisons against the pattern version (60,000 and 150,000
   cases of random texts, numbers, gaps and planted numbers, letters among them) differed in none. Before the fix the new test failed
   with `expected a readable file, got "too-slow"`. Numbers with a letter in them are still matched
   as plain text with a regular expression.

   Measured on this computer, three runs each (the range is the runs; the machine is not quiet;
   nothing here is a test threshold):

   | File (all 9.9 to 10.0 MB unless said)                                                | Pattern scrubber   | Now             |
   | ------------------------------------------------------------------------------------ | ------------------ | --------------- |
   | 30 numbers of 10 to 39 zeros, memo of dash-joined zeros, wide gap before the last 1  | over 10 s, refused | 1.3 s           |
   | the same with dots and slashes between the zeros                                     | 9.5 s              | 0.9 s           |
   | **28 transit-style numbers (about 100 patterns), near-miss memo** (slowest)          | 5.2 s              | **1.9 s**       |
   | about 120 patterns of zeros, wide gap every 6, 7, 8, 12 characters                   | not run            | 0.9 to 1.7 s    |
   | all-zero and all-one numbers against runs of zeros or ones broken by wide gaps       | not run            | 0.3 to 1.1 s    |
   | 30 letter numbers (aaa...ab) against 590 letters a                                   | not run            | 1.1 s           |
   | 15 letter-and-digit numbers all present in every memo, 15 more nearly spelled        | not run            | 1.3 s           |
   | 14 transit-style and 15 letter numbers, all the letter numbers present in every memo | not run            | 1.5 s           |
   | 62,000 real-looking rows (7.3 MB), some memos name the account                       | not run            | 1.2 to 1.3 s    |
   | 10,000 and 20,000 ids that blank to the same text (1.1 and 2.1 MB)                   | over 10 s, refused | 0.2 s and 0.4 s |

   The slowest file built in this round was **about 1.9 seconds** (10 MB; the parse itself is 0.2
   s of it). The third check (below) built a slower one, about 24 seconds, which the 10-second clock
   refuses. It is a measurement and not a proof, and a
   slower computer takes longer; the clock is still the last stop, and it refuses (fail closed)
   rather than waiting. The "Pattern scrubber" column is the code just before the rewrite, which
   already had the extra forms and gap characters; the original first version did not, and the
   re-check measured its slowest file at 4.3 s. The row for 62,000 real-looking rows is unchanged
   from the first version's measurement (1.1 to 1.6 s).

6. **The claims about invisible characters were wider than the code.** The header and this page said
   "invisible marks" and "every kind of space and dash". What `normalise` really does is stated
   under "Account numbers" above and in the comment on the function; the rest is a known limit.

### The third check: what it found and what changed

A third independent check worked inside an agreed boundary: what a real bank file could contain, or a
malformed file that makes the reader fail open. It found, and these are now fixed, each with a test that
failed first (9 failed before, 10 pass after; a four-digit control passes both):

- **A correction notice that names no row** (CORRECTACTION with no or an empty CORRECTFITID) was counted
  as an ordinary transaction, so a deletion notice added money. Now the row is unreadable: listed, never counted.
- **A row in another currency** (OFX's `CURRENCY` inside a transaction, with `CURSYM`) was counted in the
  statement's currency. Now the row carries its own currency and is never added to the statement's;
  `ORIGCURRENCY` (already converted) is unchanged; a `CURRENCY` block with no readable symbol leaves the row unread.
- **An account number with letters in it** (a credit union's share number such as `123456789S01`, an
  IBAN) was only matched as written. Now each run of five or more digits in it is blanked on its own too.
- **An amount with no whole part** (`-.50`) was refused; it is now read (fifty cents out).

And one claim was corrected: the slowest crafted file is not under two seconds. A file of letter-only
account ids against long memos of the same letter scrubs for about 24 seconds and is refused by the
10-second clock (fail closed).

### Known limits of the account number filter

Found by trying each, and **not fixed**, because no bank writes a number this way and chasing
every disguise is a race that cannot be won. The filter's job is to remove what a bank file really
contains. These are the forms of a number it does not find; a description is shown only in the
person's own window and is never stored or sent, so the cost of one of these slipping through is
that the person sees a number they could see in their own bank file anyway.

- **Digits of another script**: Arabic-Indic (٠ to ٩), Devanagari, Thai and the rest. NFKC folds only
  compatibility forms (full-width, superscript, circled, mathematical), not other scripts' own digits.
- **A combining mark or a variation selector inside the number**: a digit followed by U+0301, by
  the emoji selector U+FE0F or the keycap U+20E3, and the Mongolian free variation selectors
  U+180B to U+180D. They are not format characters, so they stay and break the number.
- **Invisible characters that are not format characters**: the Hangul fillers (U+115F, U+1160,
  U+3164, U+FFA0), the braille blank (U+2800), private-use characters, unassigned code points. The
  Unicode format characters (category Cf) ARE dropped: zero-width space, joiner, non-joiner, word
  joiner, soft hyphen, direction marks, byte-order mark, tag characters.
- **Separators other than space, dash, dot, slash, underscore and the middle dot**: a comma, colon,
  semicolon, backslash, asterisk, bullet (U+2022, U+2219, U+22C5), the Katakana middle dot (U+30FB),
  the hyphenation point (U+2027) and so on. More than three gap characters in a row between two
  digits also breaks a number.
- **Letters standing in for digits** (O for 0), spelled-out numbers, a number split across two
  fields with other text between, and a number reversed or encoded.
- **A number that is not in the file's account blocks** (another person's account in a memo), as
  before.
- **Forms of a number made of more than 40 characters**: only the exact text is looked for, not the
  leading-zero or per-group forms.
- **A transit and an account written together with no separator** (`045671234567`): the account part
  on its own (`1234567`) is not blanked, because where one ends and the other begins depends on the
  bank's layout, which the file doesn't say. The whole run is blanked.
- **A crafted file can be slow enough to be refused** (see the third check): letter-only ids matched
  against long runs of the same letter. It is refused at the 10-second clock, never read wrongly.

A test ("the known limits are as the review lists them") pins the handled and the unhandled
characters, so this list and the code cannot drift apart without a test failing.

## What this review did not do

- **No real bank file was read.** Every file used is invented (account 000123456789, card
  9990001112223333, branch 04567), shaped like a Canadian bank's download. The first real file
  will be a check on the empty-tag case (finding 5), the sign of a credit-card file (OFX makes a
  charge negative; a bank that wrote the opposite would show payments as charges and nothing in
  the file reveals that, so the person ticks rows by hand), and the "[hidden]" blanking against
  the way that bank prints its numbers.
- **The OFX specification was not re-read for this page.** Statements about OFX itself (exclusive
  end dates, pending lists, corrections, `HOLD`, a comma as a decimal mark) follow the notes
  already in [types.ts](../../lib/figures/bank/types.ts) and the [8g] section of the
  [roadmap](../architecture/figures-roadmap.md), which cite the spec's sections.
- **The "last four digits" question is still open** (listed under the [8g] decisions). The reader
  does not expose any part of an account number, so a screen can say "Account 1 of 2" and nothing
  more until it is decided.
- **It cannot recognise an account number it was not told.** The numbers blanked are the ones in
  the file's own account block. A different account's number in a memo ("sent to 555-1234567") is
  another person's data and is shown on screen as the bank wrote it, never kept or sent.
- **The wait is bounded, not removed** (finding 4).

## Sources read (2026-10-07)

- `ofx-js` 1.1.2 from npm (tarball and registry metadata); its GitHub repository at the release
  commit, its commit history and closed issues (including the 1.1.2 fix commit and issue 6)
- `ofx-data-extractor` 1.5.0 from npm
- GitHub Advisory Database for `ofx-js`, `ofx-data-extractor` and `xml2js` (the package `ofx-js`
  depended on until it got its own parser, per the repository's issue 7; `xml2js` has an advisory
  for prototype pollution in its versions before 0.5.0)
- `npm audit` over the repository with `ofx-js` added
- This repository's [types.ts](../../lib/figures/bank/types.ts),
  [totals.ts](../../lib/figures/bank/totals.ts) and [coverage.ts](../../lib/figures/bank/coverage.ts)
