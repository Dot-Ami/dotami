# Showing HEIC receipts: a review of the decoders

**Read on 2026-10-09; double-checked and corrected the same day; option D chosen and built.** The
maintainer said yes (2026-10-09) to accepting iPhone photos in their own format, HEIC, as receipts.
Until then the receipt store and the viewer refused HEIC
([expense-records.md § 7 and § 8](../architecture/expense-records.md#8-showing-a-receipt-inside-dotami-the-security-design-2026-10-08))
"until there is a decoder that runs the same way": no script, no network, in a worker or the
browser's own decoder. This page is the search for that decoder. Its first version gave the
maintainer the options and what each costs and built nothing; the maintainer then chose **option D**
(the graphics chip, through WebCodecs), after a double-check of the research, and it is built.
[What was chosen](#what-was-chosen-2026-10-09) says what, and under which conditions;
[Corrections from the double-check](#corrections-from-the-double-check-2026-10-09) lists what the
first version got wrong or left out. The sections in between are the first version, kept as read,
with the corrected sentences marked.

Two rules hold whichever option is chosen: the stored receipt stays **exactly the file the person
gave** (a copy kept as given), and any conversion exists only to show it.

## The short version

- **No option is clean on every count, so the first version built no decoder.** The choices are in
  [the options table](#the-options-for-the-maintainer). *(Since then: D was chosen and built; see
  [What was chosen](#what-was-chosen-2026-10-09).)*
- **Why it is hard.** A HEIC photo is a small container around a picture compressed with HEVC (the
  video format also called H.265). Reading the container is easy and could be DotAmi's own code.
  Decoding HEVC is the hard part, and there are only three kinds of decoder:
  1. **libheif with libde265**, compiled to WebAssembly. Mature, maintained, used everywhere. Both
     are **LGPL-3.0**, and every ready-made package for the web carries them, **including the ones
     labelled MIT** (checked below). The desktop app has shipped no LGPL code since #119.
  2. **New decoders under permissive licences** (Apache-2.0, MIT). The two found are **four to eight
     weeks old**, have no WebAssembly build, and are full video decoders: far too big to read line
     by line the way `ofx-js` was.
  3. **A decoder already on the computer.** Either the **graphics chip**, which Chromium (and so
     DotAmi's window) can use through its WebCodecs interface with no new package and no licence;
     or **Windows' own HEIC codec**, which the window can't reach, so the desktop app would have to
     run a program outside the browser's sandbox to use it.
- **The graphics-chip route is the only one with no licence cost and no new package**, and on this
  computer it works (measured below). It is also the only one that needs no change to the worker's
  security policy, which today blocks WebAssembly (measured below). Its costs: it works only where
  the computer's graphics chip can decode HEVC (it did not with the graphics chip switched off, so a
  machine without one and many virtual machines can't show HEIC, and GitHub's test machines are
  expected not to); the test browser DotAmi's browser tests use has no HEVC at all, so no automatic
  test is expected to see a HEIC drawn; and the hostile
  bytes reach the graphics driver, not only a sandboxed worker. Those are choices for the
  maintainer, not facts this review can settle, so it stops here.
- **Patents are a separate question from licences**, and not one this review can answer. HEVC is
  covered by patents; the permissive decoders say in their own words that they grant no patent
  rights. Chromium itself offers no software HEVC decoder (measured below), only the graphics
  chip's. Whether DotAmi shipping a software HEVC decoder would need a patent licence is a question
  for a lawyer who works on software patents, before options A to C are chosen.

## What was checked, and how

| What                                 | How                                                                                                                                                       | Result                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Which packages exist                 | npm registry (`npm view`), GitHub, web search for HEIC, HEIF and HEVC decoders under every licence                                                        | Seven npm packages, two non-npm decoders, two operating-system codecs (below)                                                |
| What is inside the "MIT" packages    | `npm pack` into a scratch folder outside the repository; searched the files for `libheif` and `libde265`                                                  | All three carry libheif (and with it libde265) compiled in; their own READMEs say so                                         |
| Licences                             | Each package's `LICENSE` and `package.json`; libheif's README and `COPYING` on GitHub                                                                     | libheif and libde265: LGPL-3.0 (their sample programs: MIT)                                                                  |
| Known vulnerabilities                | GitHub security advisories of `strukturag/libheif` and `strukturag/libde265`, counted by year on 2026-10-09; GitHub's advisory database for `libheif-js`  | libheif: 73 published in 2026 (4 critical, 24 high), 1 in 2025. libde265: 13 in 2026 (5 high). `libheif-js`: none of its own |
| Maintenance                          | GitHub repository data (created, last push, stars)                                                                                                        | Table under each candidate                                                                                                   |
| Can this Electron decode HEVC?       | A probe (below) in DotAmi's own Electron 44.5.1 (Chromium 152), in the page and in a worker; again with `--disable-gpu`; and in Playwright's Chromium 153 | Yes with the graphics chip, in the page and in a worker; no without it; no software decoder; Playwright's Chromium: no       |
| Windows' own codecs on this computer | `Get-AppxPackage`                                                                                                                                         | Microsoft's _HEIF Image Extensions_ and _HEVC Video Extensions_ are both installed here                                      |
| Can DotAmi's worker run WebAssembly? | A second probe (below): a worker served with the exact `workerPolicy` from `next.config.mjs`, then with `'wasm-unsafe-eval'` added                        | No: today's policy blocks compiling WebAssembly. Asking WebCodecs about HEVC still works under it                            |

Nothing was installed into DotAmi and nothing downloaded was run: the packages were unpacked and
read, never imported.

### The probe, and what it printed

A throwaway Electron script (not in the repository) opened a hidden window on a local page and asked
WebCodecs whether it can decode HEVC at 512 × 512 (the tile size iPhones use inside a HEIC), first
in the page and then in a worker:

```js
await VideoDecoder.isConfigSupported({
  codec: "hvc1.1.6.L93.B0",
  codedWidth: 512,
  codedHeight: 512,
});
// and the same with hardwareAcceleration: "prefer-software"
```

```text
$ electron probe/main.js
electron 44.5.1 chrome 152.0.7977.130
{"page":[["hvc1.1.6.L93.B0","default",true],["hvc1.1.6.L93.B0","prefer-software",false],
 ["hev1.1.6.L93.B0","default",true],["hvc1.3.E.L93.B0","default",true]],"worker":true}

$ electron --disable-gpu probe/main.js
{"page":[["hvc1.1.6.L93.B0","default",false],["hvc1.1.6.L93.B0","prefer-software",false],
 ["hev1.1.6.L93.B0","default",false],["hvc1.3.E.L93.B0","default",false]],"worker":false}

$ node pw-probe.mjs        (Playwright's Chromium, what e2e/ runs in)
playwright chromium 153.0.8010.12 hevc false
```

The first run is on a computer with an integrated Intel graphics chip. WebCodecs needs a secure
page: from a `data:` address `VideoDecoder` didn't exist at all, from a file it did (DotAmi's own
pages are secure). **Not checked (first version):** whether Chromium needs Microsoft's HEVC extension
installed to use the graphics chip. *Corrected by the double-check, from Chromium's source: it
doesn't; Chromium's Windows HEVC path is its own decoder over D3D11/D3D12 video decoding in the
graphics driver, with no Media Foundation call, so the extension is not on the path at all (read in
the source, not measured by removing the extension).* **Not checked either:** a Mac (none here);
which other graphics chips decode HEVC, and whether GitHub's test machines have one (option D below
says what is expected, not what was measured). *Since then, decoding real HEVC was measured on this
computer while building D: a tiny picture encoded by the same Electron decodes back to its colours
(the desktop test, `e2e-desktop/desktop.spec.ts`, does it in the app's own window).*

A second throwaway probe asked whether DotAmi's worker may run WebAssembly at all. A small local
server sent a worker script with the `Content-Security-Policy` that DotAmi's `/_next/static` files
carry (the `workerPolicy` string imported from `next.config.mjs`, as the production build sends it),
and then the same policy with `'wasm-unsafe-eval'` added. The worker compiled the smallest valid
WebAssembly module and asked WebCodecs about HEVC:

```text
$ electron csp-probe/main.js next.config.mjs
electron 44.5.1 chrome 152.0.7977.130
today "default-src 'none'; script-src 'self'; frame-ancestors 'none'"
  {"wasm":"blocked: WebAssembly.instantiate(): Compiling or instantiating WebAssembly module violates the following Content Security policy ","hevc":true}
withWasm "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; frame-ancestors 'none'"
  {"wasm":"ok","hevc":true}
```

So **every WebAssembly option (A, B, C) needs the worker policy changed first**, and option D does
not. The development server adds `'unsafe-eval'` to that policy (Next runs code through eval there),
which also allows WebAssembly, so a WebAssembly decoder would work in `npm run dev` and fail in the
production build and the desktop app.

## The candidates

### A. libheif compiled to WebAssembly

| Package                                                          | Version, date      | Licence                   | Size                                                                      | Maintained                                                           |
| ---------------------------------------------------------------- | ------------------ | ------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`libheif-js`](https://github.com/catdad-experiments/libheif-js) | 1.23.5, 2026-10-04 | LGPL-3.0                  | `libheif.wasm` 1.46 MB (9 MB unpacked, with a plain-JavaScript build too) | Yes: follows libheif's releases (libheif 1.23.6 came out 2026-10-05) |
| [`heic-to`](https://github.com/hoppergee/heic-to)                | 1.6.5, 2026-10-01  | LGPL-3.0                  | 26 MB unpacked                                                            | Yes, 352 stars                                                       |
| `heic-decode` 2.1.0, `heic-convert` 2.1.0                        | 2025, 2023         | ISC (their own few lines) | under 10 KB each                                                          | Thin wrappers that pull in `libheif-js` (LGPL)                       |

**What it asks of DotAmi.** In summary (a reading of the licence, not legal advice), LGPL-3.0 lets
an app use the library without opening the app's own code, on conditions: ship the library's licence and source (or a written offer), let the person
replace the library with their own build, and don't forbid the reverse engineering needed to do so.
A separate `.wasm` file the app loads is the easy case for "replaceable". The real cost is the rule
since #119 that the desktop app ships no LGPL code (its licence notices list none, and
`e2e-desktop/desktop.spec.ts` fails if one appears): choosing A means the maintainer changing that
rule, and that test, for this one library.

It also asks for a change to the worker's security policy. Today's `workerPolicy`
(`next.config.mjs`) blocks compiling WebAssembly (the second probe above), so it would need
`'wasm-unsafe-eval'`. That policy covers every DotAmi worker, the two pdf.js workers included, unless
the HEIC worker is served from a fixed address with a header rule of its own (Next names its worker
files by content hash, so that is extra work, not tried here). And `tests/security-hardening.spec.ts`
forbids any `unsafe-eval` in that policy, which matches `'wasm-unsafe-eval'` too, so the test would
change with it. `'wasm-unsafe-eval'` allows compiling WebAssembly only, not JavaScript's `eval`.

**Security.** WebAssembly runs inside the worker's own memory: a bug in the decoder can corrupt that
memory and crash or confuse the worker, but it can't reach the rest of the window or the computer
the way a bug in native code can. DotAmi's worker would refuse every connection, as the PDF worker
does. Still, 73 advisories against libheif in 2026 and 13 against libde265 mean the version would
have to be kept current, like pdf.js. The Emscripten loader in `libheif-js` fetches its `.wasm` by
address (one `fetch(` and `XMLHttpRequest` in the glue code); DotAmi would hand it the bytes instead,
since the worker can't fetch anything.

**Coverage.** Every computer: it is software, no graphics chip or operating-system codec needed.
Once the worker policy allows WebAssembly, browser tests could draw a HEIC in Playwright's Chromium;
under today's policy the production build can't run the decoder at all.

### B. Packages labelled MIT that carry libheif inside

| Package                                             | Version, date              | What is inside                                                                                               |
| --------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`heic2any`](https://github.com/alexcorvi/heic2any) | 0.0.4, last published 2023 | libheif compiled to plain JavaScript (1.35 MB minified); calls `libheif.HeifDecoder`                         |
| `elheif`                                            | 0.1.0, 2024                | libheif, libde265 and kvazaar; its README: "Also note the license for `libheif`, `libde265` and `kvazaar`"   |
| `@saschazar/wasm-heif`                              | 2.0.0, 2022                | `wasm_heif.wasm` 466 KB, built from libde265 v1.0.8 (its `package.json`); 8 `libde265` strings in the binary |

The MIT label covers the wrapper, not the decoder in it: these are option A with an older libheif
and a misleading label. `@saschazar/wasm-heif` is built from libde265 1.0.8; the 2026 libde265
fixes came in 1.1.0 and later. **Not an option on its own.**

### C. New decoders under permissive licences

| Decoder                                                        | Licence    | Created                                                | What it is                                                                                                                               |
| -------------------------------------------------------------- | ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`rusty_h265`](https://github.com/Remade-With-Rust/rusty_h265) | Apache-2.0 | 2026-09-06 (first release); six releases in three days | Rust, HEVC only (no HEIC container), states `forbid(unsafe_code)`, claims the 147-stream conformance suite; 2 stars                      |
| [`gen2brain/h265`](https://github.com/gen2brain/h265)          | MIT        | 2026-08-12; v0.2.3 on 2026-09-15                       | Go, HEVC and HEIC (grid, rotation, mirroring, colour), a port of two Rust decoders; claims byte-exact on the conformance suite; 19 stars |

Licences DotAmi could ship. But neither publishes a WebAssembly build, so DotAmi would compile one
itself and own that build; both are weeks old, with one or two people behind them; and a full video
decoder is not something one review can read the way `ofx-js` (221 lines) was read. "Reviewed before
use" here would mean trusting conformance claims rather than reading the code. Both state that HEVC
is under patents and that they grant no rights to them.

**Size:** unknown, because no WebAssembly build of either exists to measure. A Go build carries Go's
own runtime and its `wasm_exec.js` loader, which usually comes to several megabytes; a Rust build
carries no runtime of that kind. Both are estimates, not measurements. **Security policy:** the same
change as A, since this is WebAssembly too: `'wasm-unsafe-eval'` in the worker policy and the
security-hardening test changed with it.

### D. The graphics chip, through Chromium's WebCodecs

No new package. DotAmi would write the container reader itself (the HEIC "boxes": which item is the
picture, its tiles, its rotation and crop), in the same no-network worker as the PDF reader, and
hand each 512 × 512 tile to WebCodecs' `VideoDecoder`, which passes it to the graphics chip. The
decoded tiles come back as frames, are drawn onto an `OffscreenCanvas` in the worker, and reach the
page as a finished picture, as PDF pages do now.

- **Licence:** none to ship. The decoder is the graphics chip's and the operating system's. *Corrected:
  this holds for software licences only. For patents, see
  [Corrections](#corrections-from-the-double-check-2026-10-09): DotAmi's installer already carries
  Chromium's HEVC parser and hardware-assist code, with or without D.*
- **Network:** none. The worker's policy already refuses every connection, and it needs no change:
  under it a worker can still ask WebCodecs about HEVC (the second probe above).
- **Reviewable:** the container reader is DotAmi's own code, a few hundred lines, with its own tests.
  The decoder is not reviewable at all: it is the graphics driver.
- **Security:** the container reader runs in the worker; the HEVC bytes go through Chromium's GPU
  process (sandboxed on Windows) to the graphics driver. That is the path every HEVC video on a web
  page takes in Chrome, so it is well exercised; but a driver bug is native code with more reach
  than a WebAssembly bug. *Corrected: the path is longer than that sentence says (the renderer and
  the GPU process both parse, and the GPU sandbox is the looser of the two on Windows), and
  CVE-2026-58599 belongs to option E, not D; see
  [Corrections](#corrections-from-the-double-check-2026-10-09).*
- **Coverage:** Windows computers whose graphics chip decodes HEVC (expected, not measured: Intel
  chips since about 2015, and NVIDIA and AMD chips of similar age; only one Intel chip was tried),
  and probably Macs, since macOS has decoded HEVC since 2017 (not tried: no Mac here, and no Mac
  build of DotAmi yet). *Corrected: NVIDIA from Maxwell 2nd generation (GTX 950/960) on, not the 1st
  (GTX 745/750 Ti); AMD not verified; on a Mac Chromium allows the operating system's software HEVC
  decoder, so probably every Mac DotAmi can run on (still untested).* DotAmi run from source in a browser shows HEIC only if that browser's
  WebCodecs offers HEVC (not checked beyond Chromium).
  **Not** a computer without one, many virtual machines, or with graphics acceleration turned off:
  there, a HEIC receipt is kept and can't be shown. GitHub's test machines are expected to have no
  graphics chip that decodes HEVC (not checked on them), and Playwright's Chromium has no HEVC
  (measured), so **no automatic test is expected to see a HEIC drawn**; only the container checks
  and the refusals can be tested, and the drawing by hand.
- **Size:** a few hundred lines of DotAmi's own code; nothing added to the installer.

### E. The operating system's own codec, from the desktop side

- **Windows:** _HEIF Image Extensions_ (free) plus _HEVC Video Extensions_ (from the Microsoft Store
  for a small fee, or preinstalled by many computer makers) let Windows' imaging library decode
  HEIC. Neither Chromium nor Electron's `nativeImage` reaches it, so the desktop app would have to
  run PowerShell (or a native add-on DotAmi builds and signs) on the file and get a JPEG or PNG back.
  The hostile file is then decoded **outside every sandbox, with the person's own rights**, by a
  codec with a history of code-execution fixes (CVE-2026-58599 in September 2026, several in
  2021–2022). It works only where both extensions are installed. And DotAmi run from source in a
  browser has no desktop side at all.
- **Mac:** macOS decodes HEIC itself, and Electron's `nativeImage.createFromPath` uses macOS's image
  library there (not tried: no Mac here). Same objection: decoding in the desktop app's main
  process, with full rights. There is no Mac build of DotAmi yet.

### F. Converting to JPEG when the receipt is added

Not a decoder: it moves where one of A to E runs, from every showing to once, when the receipt is
added. The person's file is still kept exactly as given; a JPEG made from it would be kept beside it
only for showing. What it changes: the JPEG is shown through the existing `<img>` path, which is
already safe, and could be shown on a computer that can't decode HEVC (say, after a restore onto a
machine without a graphics chip, under D). What it costs: a second file per receipt for the store,
the backup, the Delete menu and the sweep to know about, and a new line in the privacy log (DotAmi
would keep something the person didn't give it, made from what they did).

### G. Keeping a HEIC without showing it

Also not a decoder, and the cheapest step. The store accepts HEIC (its brand read from the bytes,
the same 10 MB cap, the pixel cap from the picture's own size box), keeps it as given, backs it up
and deletes it like any receipt; _Show receipt_ says DotAmi can't show this kind of photo yet and
that the file is kept. A decoder chosen later would then show receipts already kept. The cost: a
receipt the person can't see inside DotAmi, which is the thing they asked for.

## The options for the maintainer

| Option                                                            | What changes for a person                                                        | What it costs                                                                                                                               | What it asks of DotAmi                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. libheif in WebAssembly** (`libheif-js`)                      | HEIC receipts shown on every computer                                            | 1.5 MB in the installer; keeping up with a library that had 73 advisories this year                                                         | LGPL code in the desktop app again: the #119 rule and its test changed for this library; licence and source shipped; the worker policy opened to WebAssembly (`'wasm-unsafe-eval'`) and its test changed; the patent question answered first |
| **C. A new permissive decoder** compiled to WebAssembly by DotAmi | Same as A                                                                        | Building and owning a WebAssembly build of a weeks-old decoder no one can fully read; size unknown until built (several MB expected for Go) | Trusting its conformance claims instead of a reading; the worker policy opened to WebAssembly and its test changed, as for A; the patent question answered first                                                                             |
| **D. The graphics chip** (WebCodecs) — **chosen 2026-10-09**      | HEIC shown on computers whose graphics driver decodes HEVC (and probably Macs); on others it is kept and not shown | A few hundred lines of DotAmi's own container reader; drawing tested where the graphics chip decodes HEVC, by the desktop test, and by hand  | Accepting the graphics driver as the decoder; the conditions in [What was chosen](#what-was-chosen-2026-10-09)                                                                                                                               |
| **E. Windows' own codec** from the desktop app                    | HEIC shown where Microsoft's two extensions are installed, desktop app only      | A PowerShell call or a native add-on to build and sign                                                                                      | Decoding a hostile file outside every sandbox, with the person's rights                                                                                                                                                                      |
| **F. Convert at adding** (on top of A, C, D or E)                 | Shown afterwards on any computer                                                 | A second file per receipt in the store, backups, Delete and the sweep; a privacy-log line                                                   | Keeping a made copy beside the file as given                                                                                                                                                                                                 |
| **G. Keep without showing** (alone, or first)                     | HEIC receipts kept and backed up, not shown                                      | The store's checks and tests; a sentence in the viewer                                                                                      | Nothing new                                                                                                                                                                                                                                  |
| **None of these yet**                                             | As today: HEIC refused, with the advice to export a JPEG                         | Nothing                                                                                                                                     | Nothing                                                                                                                                                                                                                                      |

G can come first and any of A, C, D or E later; F goes on top of whichever is chosen.

## If an option is chosen: what building it would test

Whichever decoder, the same hostile-file tests as the viewer's (§ 8), plus HEIC's own:

- The brand check reads the bytes: `ftyp` with a major brand of `heic`, `heix` or `mif1` (and `mif1`
  only with a `heic`-family compatible brand), at the very first box; a file with a HEIC brand that
  isn't a HEIC (the brand followed by a JPEG, or by nothing) is refused as damaged. Today's sniffer
  (`lib/expenses/receipts/sniff.ts`, `HEIF_BRANDS`) only refuses, so it reads the major brand
  alone and a wider list (`heic`, `heix`, `hevc`, `hevx`, `heim`, `heis`, `hevm`, `hevs`, `mif1`,
  `msf1`, which includes the brands for HEIC image sequences). Accepting needs the narrower rule
  above: the wider list stays for the refusal, and the build says which brands it accepts so the
  two don't drift.
- A truncated HEIC (cut off inside its item table, and inside its picture data) is refused or shown
  as damaged, nothing drawn, nothing hangs.
- Huge claimed dimensions in the picture's size box (`ispe`), and a tile grid whose tiles add up to
  more than it claims: refused before any tile is decoded, by the same 50-megapixel and
  20,000-pixel caps.
- The decoder only in the no-network worker (A, C, D); the worker stopped after 20 seconds.

## Corrections from the double-check (2026-10-09)

Before choosing, the maintainer asked for the research on D to be checked again. The double-check read
Chromium's and Electron's own source and documentation, the patent pools' pages and the CVE records
(sources below). What it corrected or added:

1. **The Microsoft HEVC extension is not on D's path.** Chromium's Windows HEVC decoding is its own
   H.265 decoder (`H265Decoder`) with a D3D11/D3D12 accelerator in the graphics driver, its profiles
   read from the driver, and no Media Foundation call (`media/gpu/windows/d3d_video_decoder.cc`,
   `supported_profile_helpers.cc`). So whether the extension is installed, free or paid, changes
   neither which computers can show a HEIC in DotAmi nor anything DotAmi owes. From reading the
   source; not measured by removing the extension.
2. **CVE-2026-58599 belongs to option E, not D.** It is real (HEVC Video Extensions / Windows Codecs
   Library heap overflow, published 2026-09-08, CVSS 7.8, fixed in 2.4.87.0 and the matching
   versions), but it sits on the Media Foundation path, which D doesn't use.
3. **Where the hostile bytes are parsed, in full.** (a) The window's renderer: DotAmi's own container
   reader (in the worker), and WebCodecs itself, which reads the `hvcC` record and scans each chunk
   for key frames (`third_party/blink/.../webcodecs/video_decoder.cc`). Renderers run at Chromium's
   strictest sandbox level, and DotAmi's windows are sandboxed (`desktop/main.mjs`). (b) Chromium's
   GPU process: its own H.265 parser reads the parameter sets and slice headers, then the slice bytes
   are copied to the driver (`d3d_h265_accelerator.cc`; on a Mac, `video_toolbox_video_decoder.cc`).
   On Windows the GPU process runs at Low integrity, less restricted than the renderer's Untrusted
   level. (c) The graphics driver and hardware, where a bug can reach the kernel: Apple's AppleAVD
   fixes CVE-2024-44232, 44233 and 44234 (macOS 13.7.1, 2024-10-28) and NVIDIA's CVE-2025-23345
   (2025-10-23, fixed in 581.42 / 573.76 / 539.56) are of that kind. No published Chromium CVE naming
   its H.265 parser or decoder was found for the last two years; the issue tracker couldn't be read,
   so that is "none found", not "none exist". Chromium builds that parser into its fuzzing builds.
4. **What a crash does.** WebCodecs closes the decoder and reports an `EncodingError`. Electron reports
   a lost graphics process as `child-process-gone` with type `GPU`. Chromium allows three
   graphics-process crashes (forgiving one every five minutes), then switches hardware graphics off
   for the rest of the session. The app keeps running. So a failing file must never be retried
   automatically.
5. **Patents are not only a question for options A to C.** DotAmi already ships HEVC-related code:
   Electron builds with `proprietary_codecs = true`, and Chromium then turns on
   `enable_hevc_parser_and_hw_decoder` on Windows and Mac ("the HEVC/H265 parser and also … HEVC/H265
   decoding with hardware acceleration assist", `media/media_options.gni`); Electron's bundled ffmpeg
   carries H.264 and AAC. D uses that code but adds none. Whether it makes DotAmi a party that
   "incorporates" an HEVC decoder under the pools' terms is an open question that exists with or
   without D (the questions for a lawyer are below). Since 2025-12-15 the former Via LA HEVC/VVC
   programme is run by Access Advance (as VCL Advance), so the two named pools have one administrator.
6. **Coverage, corrected.** Electron 44 needs Windows 10 or later and macOS Ventura or later. Windows:
   only through the graphics driver's D3D11/D3D12 video decoder, no software fallback. NVIDIA from
   Maxwell 2nd generation on (GTX 950/960 and later), not Maxwell 1st (GTX 745/750 Ti); Intel's
   full-hardware HEVC Main from Skylake (6th generation, 2015) per an Intel engineer; AMD not verified
   from an AMD source. A virtual machine whose display adapter has no D3D11 video decoding is expected
   to fail (untested). Mac: Chromium's VideoToolbox path accepts HEVC "because we allow the OS software
   decoder", so a Mac without an HEVC graphics block should still decode; untested. The "no without
   it; no software decoder" measurement above was on Windows only.

## What was chosen (2026-10-09)

The maintainer chose **option D** after the double-check, on the condition that it is safe to use and
raises no obstacle if DotAmi is ever sold. The double-check's answer to both was "good to go", under
the conditions below; the charging question was answered only as far as the sources go (no new
software licence; the patent questions apply to the Electron build DotAmi already ships, and go to a
lawyer before any sale). Built in the same change as this section:

- **Kept:** a HEIC photo is accepted by the receipt store when its bytes say so (`ftyp` with a major
  brand of `heic`, `heix` or `mif1`, `mif1` only with a `heic`/`heix` compatible brand), with the same
  10 MB cap and the same 50-megapixel / 20,000-pixel caps, read from the primary picture's own size
  box before anything else. It is kept exactly as given (`.heic` in the receipts folder) and backed up,
  removed and deleted like every receipt. Image sequences, bursts and layered pictures are refused.
- **Shown:** on *Show receipt* only, never on adding, in a list or as a thumbnail. DotAmi's own
  container reader (`lib/expenses/receipts/heic/`, no package, no code copied from any reader; the
  Nokia reference software's licence forbids commercial use, so none of it is used) runs in the
  receipt viewer's no-network worker (`lib/expenses/receipts/viewer/heic-picture.worker.ts`, under the
  unchanged `workerPolicy`), takes out the one primary picture's HEVC data, and hands it to WebCodecs'
  `VideoDecoder`, which decodes it on the graphics chip. The tiles are drawn on a canvas in the worker
  and the finished picture goes to the page. Nothing decoded is written anywhere.
- **Where it can't be shown** (no HEVC decoder, a decoder error, more than 20 seconds), the photo is
  still kept, and the viewer says so in plain words and how to see it (the original on the phone).

**The conditions, and where each is held:**

| Condition | Where | Tested by |
| --- | --- | --- |
| Renderer and GPU sandboxes as they are: no switch that turns a sandbox off or moves the GPU process in-process, no window with `sandbox: false` | `desktop/main.mjs` | `tests/desktop-sandbox.spec.ts` (fails if one appears) |
| DotAmi's own reader, in the existing no-network worker; worker policy unchanged (no `'wasm-unsafe-eval'`) | `lib/expenses/receipts/heic/`, `viewer/heic-picture.worker.ts`, `next.config.mjs` | `tests/heic-container.spec.ts` (truncated, oversized, looping and overlapping boxes, data outside the file, too many items, deep nesting, 3,000 random corruptions); `tests/security-hardening.spec.ts` (the policy) |
| One still picture: the primary item, one coded picture or a `grid` of coded tiles, optional `irot`/`imir`/`clap`; sequences refused; thumbnails, auxiliary pictures (alpha, depth, gain map), Exif and other items never handed to the decoder; another kind of primary, data in another file, built from other items or encrypted: not drawn | `heic/picture.ts` | `tests/heic-container.spec.ts` |
| Before any byte reaches `VideoDecoder`: HEVC Main or Main Still Picture, 8-bit 4:2:0 (the `hvcC` record and its SPS must agree); exactly one VPS, SPS and PPS; every tile a key picture with no parameter set of its own; tile size as declared, and no more tiles than the picture's size needs; the 10 MB and pixel caps | `heic/hevc.ts`, `heic/picture.ts` | `tests/heic-container.spec.ts`, `tests/heic-draw.spec.ts` (nothing reaches the decoder when the reader refuses) |
| `isConfigSupported` first; one `VideoDecoder` per picture; every tile a key chunk; every frame closed right after drawing; the decoder closed at the end | `viewer/draw-heic.ts` | `tests/heic-draw.spec.ts` |
| Any error, crash or more than 20 seconds: the worker stopped, the plain sentence shown, the file kept | `viewer/open.ts` | `tests/heic-draw.spec.ts`; the 20-second stop is shared with the PDF viewer |
| Never retried automatically; after a failure, or after the graphics process stops (`child-process-gone`, type `GPU`, heard by the main process), no HEIC is drawn until DotAmi restarts | `viewer/heic-session.ts`, `desktop/main.mjs`, `desktop/window-preload.cjs` | `tests/heic-draw.spec.ts`; `e2e-desktop/desktop.spec.ts` (a reported graphics-process crash stops HEIC, across a reload) |
| Decoded only on *Show receipt* | `components/expenses/receipt-line.tsx`, `receipt-viewer.tsx` | `e2e/receipt-viewer.spec.ts` |
| Nothing but the original bytes kept | `lib/expenses/receipts/store.ts` | `tests/expenses-receipts.spec.ts` (one `.heic` file, byte for byte) |
| A supported, current Electron; graphics drivers and the operating system kept up to date (said in the security design) | `package.json`; [expense-records.md § 8](../architecture/expense-records.md#8-showing-a-receipt-inside-dotami-the-security-design-2026-10-08) | — |
| Mac support claimed only after a hand test on a real Mac; Windows support worded as "computers whose graphics driver decodes HEVC" | this page, the viewer's sentences, the changelog | — |
| The patent questions answered by a software-patent lawyer before DotAmi is sold | the list below | — |

**What the tests can and can't see.** Playwright's Chromium has no HEVC, and GitHub's test machines
are expected to have no graphics chip that decodes it, so the browser tests check the "can't show"
sentence and the refusals, and the desktop test draws the invented photo only on a computer whose
graphics chip decodes HEVC (otherwise it checks the plain refusal). On this computer (Intel graphics,
Windows 11) the desktop test drew it; on a Mac nothing has been tried.

**Two readings the build had to make, for the maintainer to confirm or change:**

- *"Refuse thumbnails, auxiliary pictures and other items"* is read as "never hand them to the
  decoder", not "refuse the whole file". Nearly every iPhone photo carries a thumbnail and Exif, and
  newer ones a gain map; refusing those files would refuse almost every iPhone photo. Only the primary
  picture's data is ever decoded; the rest stays in the kept file, untouched.
- *Stop after a GPU crash "during a HEIC show"* is built more strictly: after any graphics-process
  crash in the session, or any HEIC that fails, no HEIC is drawn until DotAmi restarts. The main
  process can't tell whether a HEIC caused the crash, so it doesn't try.
- (A detail of the format.) Mirroring (`imir`) follows libheif's reading: axis 0 flips top to bottom.
  iPhones don't write `imir` (they rotate with `irot`), so no real photo was checked against it.

### Questions for a software-patent lawyer (before DotAmi is sold)

These come from the double-check and cover the Electron build DotAmi already ships, not only D.

1. Electron is built with `proprietary_codecs = true`, and Chromium then includes "the HEVC/H265 parser
   and … HEVC/H265 decoding with hardware acceleration assist". Does shipping that build mean DotAmi
   "incorporates one or more HEVC Decoders" under the Access Advance (HEVC Advance) and VCL Advance
   (former Via LA) HEVC/VVC licences? This applies whether or not D is built.
2. If DotAmi only hands HEVC bytes, through the browser's WebCodecs, to a decoder in the person's
   graphics chip or operating system, is DotAmi a licensee, or is the decoder licensed through whoever
   sold that chip, computer or operating system? Does patent exhaustion, or an implied licence from that
   sale, cover DotAmi's use?
3. Does it matter whether DotAmi is a free download, a one-time sale, a subscription, or free with paid
   features? Access Advance's FAQ says downloaded HEVC software "generally" needs a licence but some
   situations don't. When would a "First Sale" happen for DotAmi, and should DotAmi ask Access Advance
   for a written answer before the first sale?
4. Electron's bundled ffmpeg includes H.264 and AAC. Does selling DotAmi create an obligation under the
   AVC/H.264 or AAC pools, and should DotAmi ship Electron's codec-free ffmpeg instead? (Independent of
   HEIC.)
5. Are there HEVC patent holders outside those pools whose claims could reach an app that only calls a
   platform decoder? How are app vendors usually treated in practice?
6. DotAmi's own HEIF container reader is written from ISO/IEC 23008-12: are there known patents on the
   HEIF container itself, as opposed to the codec? Is a clean-room reader that copies no Nokia reference
   code free of that code's non-commercial licence?
7. Patents count where they are in force in the country of manufacture or sale (Canada is in Access
   Advance's Region 1). For a Canadian seller distributing worldwide by download, which countries matter?
8. If a licence were ever needed, what comes with it (patent marking, reporting, the annual credit,
   minimums)? Would the VCL Advance programme's free first 100,000 units apply to a small software seller?

### Sources read in the double-check (2026-10-09)

Chromium source (chromium.googlesource.com, main branch): `third_party/blink/renderer/modules/webcodecs/video_decoder.cc`;
`media/gpu/windows/d3d_video_decoder.cc`, `d3d_h265_accelerator.cc`, `supported_profile_helpers.cc`;
`media/gpu/mac/video_toolbox_video_decoder.cc`; `media/media_options.gni`;
`content/browser/gpu/gpu_process_host.cc`; `docs/design/sandbox.md`. Electron: the
[sandbox tutorial](https://www.electronjs.org/docs/latest/tutorial/sandbox), the
[app API](https://www.electronjs.org/docs/latest/api/app) (`child-process-gone`), the README (supported
systems), `build/args/all.gn` and `release.gn`. W3C [WebCodecs](https://www.w3.org/TR/webcodecs/)
Working Draft 2026-10-07. Microsoft Learn, the Media Foundation H.265 decoder page. CVE records
CVE-2026-58599 and CVE-2025-23345 (MITRE). Apple, the security content of macOS Ventura 13.7.1, and
"Using HEIF or HEVC media on Apple devices". Access Advance: the HEVC Advance Program Overview (July
2026), the FAQ, and "What and whom do we license". Via LA: the HEVC/VVC programme and fees pages.
NVIDIA's Video Encode and Decode GPU Support Matrix; Intel's media-driver feature table; the Nokia HEIF
reference software's licence. None of these was installed or run; the source was read, not built.

## Recorded so a change is noticed

SHA-256 of the tarballs read on 2026-10-09: `libheif-js-1.23.5.tgz`
`d0bfe7198bd624c524cef8ccf78e15ceb42683c87598c64c2e13ced0d8680932` (its `libheif.wasm`
`184d3d20f8323877f13e9f5254f9c6a0ce272c9a3a2f823b0b2bcd2ee9f73f80`); `heic2any-0.0.4.tgz`
`510dbabc44f5940689b1779fff552584a1c4df434c0cc83c3be3258b2ace1995`; `elheif-0.1.0.tgz`
`e239d3fdeb20795f6250fdc6ce0df0a6172d821fa875f31dd556123cf80f64c8`; `saschazar-wasm-heif-2.0.0.tgz`
`fa01cc0976936c932b9d3f81a89804ec34d2e8e9d863e22310f64097d200122d`.
