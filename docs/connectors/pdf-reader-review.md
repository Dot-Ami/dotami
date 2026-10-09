# The return PDF reader: a review of `pdfjs-dist` 6.4.299 (Mozilla's pdf.js)

**Read on 2026-10-08.** This is the written check behind the [8f] return reader
([lib/figures/return/](../../lib/figures/return/)), the code behind **Add from last year's
return** on the ideas page. The maintainer's rule for outside code (2026-10-07): use a free library
someone else built, scanned and reviewed before use, edited if needed. This page is that review. It
is one bounded pass plus DotAmi's own tests, not an audit of pdf.js: the package is about 3.5 MB of
JavaScript and was not read line by line.

A tax return is the most sensitive file DotAmi has been asked to read: name, address, social
insurance number, income. So the question this review answers is narrower than "is pdf.js safe?":
**can anything from the file, or pdf.js itself, reach the network, run code, or be kept?**

## The short version

- **Use the package, pinned exactly at 6.4.299, unedited.** Apache-2.0 (the same licence as
  DotAmi). Its legacy build is used (below for why).
- **Never go below 6.2.108.** Two advisories matter: CVE-2024-4367 (GHSA-wgrm-67xf-hhpq, a crafted
  font running JavaScript, fixed in 4.2.67) and GHSA-hq66-cqwq-w95j (CVE-2026-16633, 2026, a
  crafted PDF running JavaScript when the viewer's scripting is on, fixed in 6.2.108). A test fails
  if `package.json` stops pinning 6.4.299.
- **DotAmi asks pdf.js for page text only.** No page is drawn, no picture decoded, no font handed
  to the page, no annotation or form script read, no PDF JavaScript run. Each switch is set by hand
  in `PDF_OPTIONS` ([extract.ts](../../lib/figures/return/extract.ts)) and a test checks them.
- **It runs in a worker of DotAmi's own that cannot connect anywhere.** The worker's script is
  served by DotAmi with its own Content-Security-Policy, `default-src 'none'; script-src 'self'`
  ([next.config.mjs](../../next.config.mjs), `workerPolicy`). The browser test reaches into that
  worker and tries to fetch DotAmi's own `/api/figures`: the browser refuses it.
- **Nothing is kept.** The bytes move into the worker, pdf.js's copy is destroyed after each read,
  and the worker is stopped when the panel closes. Nothing is proposed, sent or logged.

## What was checked, and how

| What | How | Result |
| --- | --- | --- |
| Which version | npm registry, 2026-10-08 | 6.4.299 is the newest (published 2026-10-03). It carries npm's SLSA provenance attestation (built by Mozilla's release workflow, not uploaded by hand). |
| Known vulnerabilities | GitHub Advisory Database, queried 2026-10-08 for `pdfjs-dist`; `npm audit` before and after adding it | Three advisories ever: GHSA-7jg2-jgv3-fmr4 (2018, below 2.0.550), GHSA-wgrm-67xf-hhpq (CVE-2024-4367, below 4.2.67), GHSA-hq66-cqwq-w95j (5.6.83 to below 6.2.108). None affects 6.4.299. `npm audit`: 13 findings before and the same 13 after, all in development tooling; none involves pdf.js. |
| Licence | `LICENSE` in the package | Apache-2.0, Mozilla Foundation. Compatible (DotAmi is Apache-2.0 too). |
| Network calls | Searched both shipped files for fetch, XMLHttpRequest, WebSocket, importScripts, Worker and dynamic `import()` | Found, all expected: loading a PDF from an address (fetch or XMLHttpRequest), fetching character maps, standard fonts, colour profiles and WebAssembly decoders from addresses it is given, starting its own worker from an address, and a dynamic import of a fallback decoder. Each is either never reached by DotAmi's use or switched off (next section). |
| Code made from text | Searched both files for eval and the Function constructor | 6.x removed the eval font path that CVE-2024-4367 used. The one hit is core-js's global-object fallback in the legacy build, after `typeof globalThis == 'object'`, which is true in every browser and worker DotAmi runs in, so it is never reached; the worker's policy (no `'unsafe-eval'`) would refuse it if it were. A test pins exactly this. |
| Dependencies | `package.json` of the package | One optional dependency, `@napi-rs/canvas` (MIT, a native drawing library pdf.js uses only when it runs in Node, to draw pages). It installs into `node_modules` on a developer's computer; DotAmi never imports it, the browser bundle can't (pdf.js loads it through Node's `createRequire`, which only exists in Node), and the desktop installer doesn't copy it. |
| The files that ship | SHA-256 of the two files DotAmi bundles | `legacy/build/pdf.mjs` `bc51f4874a66e3853189cb5d50aba4b3096afa83ed433b885d293a3d94583cdc`; `legacy/build/pdf.worker.mjs` `bb422f60804477de4a0b09091d8347a916a387755ed1cbad24ccaec1d09c78bf`. npm integrity `sha512-AVl138zALtfaAPvADulE0PZThbYzCBS79nL4pOSL/6Sm/4AH5A21BD9VHt97OlCuzJuCpmeZtAtkinisF4Vb1g==`. A test fails if either file changes without a new review. |

## How DotAmi runs it

1. **The file is checked before pdf.js loads** ([sniff.ts](../../lib/figures/return/sniff.ts)):
   empty, over 20 MB, or no `%PDF-` in its first 1 KB is refused with a sentence.
2. **The bytes move into the worker** ([read-pdf.ts](../../lib/figures/return/read-pdf.ts)). The
   page keeps no copy.
3. **pdf.js runs entirely inside that one worker** ([pdf-text.worker.ts](../../lib/figures/return/pdf-text.worker.ts)).
   pdf.js normally starts a second worker of its own from an address; handing it its parser module as
   `globalThis.pdfjsWorker` makes it use that copy in place, so it starts nothing and loads nothing.
   (When the parser module loads inside a worker it also announces itself on the worker's message
   channel; that can't be switched off, so the page reads only replies labelled as DotAmi's own.)
4. **Only text is asked for**: `getDocument` with the bytes, then `getTextContent` per page, then
   the document is destroyed. A PDF with more than 300 pages is refused before any page is read; a
   read that takes over 60 seconds stops the worker.
5. **The four lines are found in plain code** ([find-lines.ts](../../lib/figures/return/find-lines.ts)),
   back on the page, from the text and where it sits.

### What is switched off, and why (`PDF_OPTIONS`)

| Option | Set to | Why |
| --- | --- | --- |
| `data` | the file's bytes | No `url`, so pdf.js's own loaders (fetch, XMLHttpRequest, range requests) never run. |
| `useWorkerFetch` | `false` | Stops the parser fetching character maps, standard fonts and decoders itself. |
| `BinaryDataFactory` | a class that refuses every request | Where those files would come from instead. pdf.js asks it for the standard fonts when a PDF uses one without embedding it (the test PDFs do); it gets nothing, and the text is still read: a missing font changes how a page would look, which DotAmi never draws. |
| `useWasm` | `false` | The WebAssembly image decoders are fetched by address. Images aren't decoded for text anyway. |
| `isEvalSupported` | `false` | Does nothing in 6.x (the eval path is gone); kept so a downgrade would still run with it off. |
| `enableXfa` | `false` | XFA forms are drawn as HTML; DotAmi draws nothing. |
| `disableFontFace`, `useSystemFonts` | `true`, `false` | No font from the file is turned into a font the page could load. |
| `isOffscreenCanvasSupported`, `isImageDecoderSupported` | `false` | Nothing is drawn or decoded. |
| `verbosity` | `0` (errors only) | pdf.js's warnings name things from inside the file (fonts, objects); none is printed. |
| no `password`, no `onPassword` | | A locked PDF fails with pdf.js's `PasswordException`; DotAmi refuses it and never asks for the password. |

Never imported: the viewer (`pdfjs-dist/web/…`), the annotation and form layers, and the scripting
sandbox (`pdf.sandbox.mjs`), which is where PDF JavaScript would run. GHSA-hq66-cqwq-w95j needs
the viewer's `enableScripting`; DotAmi has no viewer.

### Why the legacy build

pdf.js publishes a "modern" build for the newest browsers and a "legacy" build with polyfills
(core-js). The modern 6.4.299 build calls `Map.prototype.getOrInsertComputed`, a 2026 addition
that Node 25 (where the tests run) doesn't have: reading a password-protected PDF with the right
password failed with "getOrInsertComputed is not a function". The legacy build runs the same
reader in Node's tests, in a person's browser if it's a little older, and in the desktop app. The
polyfills change built-in objects only inside the reader's own worker, which shares nothing with
the page.

### The worker's own policy

A worker started from a script file takes its Content-Security-Policy from that file's response,
not from the page, and Next's static files skip `middleware.ts`, where the page's policy is set.
Without a policy of its own, the reader's worker could fetch anything. `next.config.mjs` now gives
every file under `/_next/static/` this policy: `default-src 'none'; script-src 'self';
frame-ancestors 'none'` (plus `'unsafe-eval'` under `next dev` only, which needs it). Browsers apply
a policy only to pages and workers, so ordinary scripts, styles and fonts are unaffected.
`e2e/app.spec.ts` ("a return PDF: …") checks the header on the worker's script and that a fetch
from inside the worker is refused; with `connect-src 'self'` added to the policy, that test fails.

## What pdf.js does with untrusted input, and the known limits

pdf.js parses the whole PDF structure: the cross-reference table, objects, compressed streams
(Flate, LZW, ASCII85 and others), encryption, and every font a page's text uses (to turn glyphs back
into letters). That is the part that touches hostile bytes, and it is the part DotAmi relies on
pdf.js's own maintenance for. Fonts are where the historic attacks were; in DotAmi's setup they are
parsed inside the worker and never handed to the page.

Known limits, documented rather than fixed in this slice:

- **Memory.** A crafted PDF can make pdf.js unpack a stream far larger than the file. pdf.js has no
  overall cap. The worker is a separate thread and the 60-second limit stops a slow read, but a
  read that exhausts memory can crash the tab (or the desktop window) before then. Nothing is lost:
  nothing was being saved.
- **Picture-only PDFs** (a scan or a photo) have no text: refused with a sentence. Reading
  pictures waits for the Lens.
- **Filled-in form fields.** A fillable CRA PDF filled in Acrobat and saved without flattening keeps
  its amounts in form fields, not in the page text. DotAmi doesn't read form fields (that would mean
  reading annotations), so those lines show "nothing DotAmi can read beside it". Tax software's own
  "Save PDF" output is expected to print the amounts on the page; this is not yet confirmed for any
  program.
- **Layouts other than the CRA's form.** Wealthsimple Tax's and TurboTax's printed layouts aren't
  documented. Until a person describes theirs, the reader is tested only on invented PDFs laid out
  like the CRA's 2025 T2125, and anything it doesn't recognise shows as "not found", never a guess.
- **What the reader takes for a T2125, and for an amount.** A page counts only when the form's code
  is printed as its own run, as the CRA's footer is ("T2125 E (25)"); a sentence that names the form
  ("attach Form T2125", on the T1 and Schedule 8) doesn't make a page a T2125. Software that prints
  the code only inside a longer heading would show "no T2125". A copy ends at a page without the
  code. A whole-dollar amount with no thousands comma ("4500") is read only when its cents follow in
  their own box ("4500" then "00"); printed alone, a four- or five-digit number can't be told from
  the next line's number, so the line shows "nothing DotAmi can read beside it".
- **Time in the window.** pdf.js runs in the worker, under the 60-second limit. Finding the four
  lines in the text it returns runs in the window afterwards; it looks up a run's row only for runs
  that are one of the four line numbers, at most 10 times per line per page, so it stays about
  linear (a one-page test PDF with 40,000 text runs takes a few milliseconds; the first version took
  about 21 seconds).
- **Hidden text.** Text drawn in white, or off the page, is still text to pdf.js. In this slice it
  can only make a line show twice (every place a line is printed is listed); deciding between two
  amounts is the next slice's job.
- **Character maps.** PDFs whose fonts need one of pdf.js's character map files (mostly Chinese,
  Japanese and Korean fonts) may come out as the wrong letters, since those files are never fetched.
  A CRA form uses none.
- **Attribution in the bundle.** The minified page scripts drop pdf.js's licence header. DotAmi is
  Apache-2.0 itself and ships its licence; a third-party notices file covering every bundled package
  is not part of this slice.

What was not done: fuzzing, or reading pdf.js's parser line by line. Hostile input beyond the
cases in [tests/figures-return-read.spec.ts](../../tests/figures-return-read.spec.ts) (a locked
file, a truncated file, something that only starts like a PDF, 301 pages, pictures only) is left to
pdf.js's own testing, which runs on every Firefox release.

## The receipt viewer: drawing pages ([8i])

Since 2026-10-08 the same pdf.js also draws receipts (the security design is § 8 of
[expense-records.md](../architecture/expense-records.md)). It runs in a second worker of DotAmi's own,
`lib/expenses/receipts/viewer/pdf-pages.worker.ts`, set up exactly like the return reader's (parser
handed over as `globalThis.pdfjsWorker`, the static files' no-connection policy, the same
`PDF_OPTIONS`). Drawing switches on more of pdf.js than reading text does, and each part is bounded:

- **The renderer** runs (`page.render`) onto an `OffscreenCanvas` in the worker; the page receives
  only finished pictures (`ImageBitmap`). pdf.js's own canvases come from a factory of DotAmi's that
  makes `OffscreenCanvas`es, and the SVG filters it would add to a document are switched off (there is
  no document in a worker).
- **Pictures inside the PDF** are decoded by pdf.js's own JavaScript decoders (`isImageDecoderSupported`
  and `useWasm` stay off), capped at 50 megapixels each (`maxImageSize`).
- **Fonts** are drawn as outlines inside the worker (`disableFontFace` stays on); a font the PDF
  doesn't embed is drawn with a standard one, since pdf.js's font files are never fetched.
- **Still off:** the annotation layer (no link or form field becomes a control), the text layer, XFA,
  and pdf.js's scripting sandbox, the only part of pdf.js that runs a PDF's JavaScript, which DotAmi
  never loads.
- **Limits:** 20 pages drawn, 16 megapixels a page, 20 seconds a file (the worker is ended after
  that). The memory limit above applies here too.

Hostile PDFs tested in a real browser: one with JavaScript in its `OpenAction` and a URI action, and
one with a web page appended (`e2e/receipt-viewer.spec.ts`): both drawn, nothing runs, nothing is
fetched.

## When a new version comes out

1. Check the GitHub Advisory Database for `pdfjs-dist` and read the release notes since 6.4.299.
2. Change the exact version in `package.json`, `npm install`, and run the tests: the package test in
   `tests/figures-return-read.spec.ts` fails on purpose. Update the version, integrity and the two
   SHA-256 values there and in this page, after repeating the searches in "What was checked".
3. Check `getDocument`'s options in the new `types/src/display/api.d.ts` for anything new that
   fetches, draws or runs, and set it in `PDF_OPTIONS`.
4. Run `npm run test:browser` (the worker-policy proof) and `npm run test:desktop`.
