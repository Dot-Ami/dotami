# Showing HEIC receipts: a review of the decoders

**Read on 2026-10-09.** The maintainer said yes (2026-10-09) to accepting iPhone photos in their own
format, HEIC, as receipts. Today the receipt store and the viewer refuse HEIC
([expense-records.md § 7 and § 8](../architecture/expense-records.md#8-showing-a-receipt-inside-dotami-the-security-design-2026-10-08))
"until there is a decoder that runs the same way": no script, no network, in a worker or the
browser's own decoder. This page is the search for that decoder. Its job is to give the maintainer
the options and what each costs; it builds nothing.

Two rules hold whichever option is chosen: the stored receipt stays **exactly the file the person
gave** (a copy kept as given), and any conversion exists only to show it.

## The short version

- **No option is clean on every count, so no decoder is built in this change.** The store and the
  viewer still refuse HEIC, with the same sentence as today. The choices are in
  [the options table](#the-options-for-the-maintainer).
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
  computer it works (measured below). Its costs: it works only where the computer's graphics chip
  can decode HEVC (it did not with the graphics chip switched off, so a machine without one, many
  virtual machines and GitHub's test machines can't show HEIC); the test browser DotAmi's browser
  tests use has no HEVC at all, so no automatic test could ever see a HEIC drawn; and the hostile
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
| Windows' own codecs on this computer | `Get-AppxPackage`                                                                                                                                         | _HEIF Image Extensions_ 1.2.48.0 and _HEVC Video Extensions_ 2.5.33.0 are installed here                                     |

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

The first run is on an Intel UHD Graphics 630. WebCodecs needs a secure page: from a `data:` address
`VideoDecoder` didn't exist at all, from a file it did (DotAmi's own pages are secure). **Not
checked:** whether Chromium needs Microsoft's HEVC extension installed to use the graphics chip;
this computer has it, so the probe can't tell, and removing it is a system change this review didn't
make. **Not checked either:** a Mac (none here), and decoding an actual HEIC file (no HEIC file or
HEIC encoder on this computer; `isConfigSupported` says the decoder is there, not that a given file
decodes).

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

**Security.** WebAssembly runs inside the worker's own memory: a bug in the decoder can corrupt that
memory and crash or confuse the worker, but it can't reach the rest of the window or the computer
the way a bug in native code can. DotAmi's worker would refuse every connection, as the PDF worker
does. Still, 73 advisories against libheif in 2026 and 13 against libde265 mean the version would
have to be kept current, like pdf.js. The Emscripten loader in `libheif-js` fetches its `.wasm` by
address (one `fetch(` and `XMLHttpRequest` in the glue code); DotAmi would hand it the bytes instead,
since the worker can't fetch anything.

**Coverage.** Every computer: it is software, no graphics chip or operating-system codec needed.
Browser tests can draw a HEIC in Playwright's Chromium.

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

### D. The graphics chip, through Chromium's WebCodecs

No new package. DotAmi would write the container reader itself (the HEIC "boxes": which item is the
picture, its tiles, its rotation and crop), in the same no-network worker as the PDF reader, and
hand each 512 × 512 tile to WebCodecs' `VideoDecoder`, which passes it to the graphics chip. The
decoded tiles come back as frames, are drawn onto an `OffscreenCanvas` in the worker, and reach the
page as a finished picture, as PDF pages do now.

- **Licence:** none to ship. The decoder is the graphics chip's and the operating system's.
- **Network:** none. The worker's policy already refuses every connection.
- **Reviewable:** the container reader is DotAmi's own code, a few hundred lines, with its own tests.
  The decoder is not reviewable at all: it is the graphics driver.
- **Security:** the container reader runs in the worker; the HEVC bytes go through Chromium's GPU
  process (sandboxed on Windows) to the graphics driver. That is the path every HEVC video on a web
  page takes in Chrome, so it is well exercised; but a driver bug is native code with more reach
  than a WebAssembly bug. Microsoft's own HEVC extension had a code-execution fix as recently as
  September 2026 (CVE-2026-58599); whether Chromium goes through that extension at all is in the
  "not checked" list above.
- **Coverage:** Windows computers whose graphics chip decodes HEVC (Intel since about 2015, and
  NVIDIA and AMD chips of similar age), and probably Macs, since macOS has decoded HEVC since 2017
  (not tried: no Mac here, and no Mac build of DotAmi yet).
  **Not** a computer without one, many virtual machines, or with graphics acceleration turned off:
  there, a HEIC receipt is kept and can't be shown. The desktop test machines on GitHub have no
  graphics chip, and Playwright's Chromium has no HEVC, so **no automatic test can ever see a HEIC
  drawn**; only the container checks and the refusals can be tested, and the drawing only by hand.
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

| Option                                                            | What changes for a person                                                        | What it costs                                                                             | What it asks of DotAmi                                                                                                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. libheif in WebAssembly** (`libheif-js`)                      | HEIC receipts shown on every computer                                            | 1.5 MB in the installer; keeping up with a library that had 73 advisories this year       | LGPL code in the desktop app again: the #119 rule and its test changed for this library; licence and source shipped; the patent question answered first |
| **C. A new permissive decoder** compiled to WebAssembly by DotAmi | Same as A                                                                        | Building and owning a WebAssembly build of a weeks-old decoder no one can fully read      | Trusting its conformance claims instead of a reading; the patent question answered first                                                                |
| **D. The graphics chip** (WebCodecs)                              | HEIC shown on most Windows and Mac computers; on others it is kept and not shown | A few hundred lines of DotAmi's own container reader; drawing tested only by hand         | Accepting the graphics driver as the decoder, and no automatic test of the drawing                                                                      |
| **E. Windows' own codec** from the desktop app                    | HEIC shown where Microsoft's two extensions are installed, desktop app only      | A PowerShell call or a native add-on to build and sign                                    | Decoding a hostile file outside every sandbox, with the person's rights                                                                                 |
| **F. Convert at adding** (on top of A, C, D or E)                 | Shown afterwards on any computer                                                 | A second file per receipt in the store, backups, Delete and the sweep; a privacy-log line | Keeping a made copy beside the file as given                                                                                                            |
| **G. Keep without showing** (alone, or first)                     | HEIC receipts kept and backed up, not shown                                      | The store's checks and tests; a sentence in the viewer                                    | Nothing new                                                                                                                                             |
| **None of these yet**                                             | As today: HEIC refused, with the advice to export a JPEG                         | Nothing                                                                                   | Nothing                                                                                                                                                 |

G can come first and any of A, C, D or E later; F goes on top of whichever is chosen.

## If an option is chosen: what building it would test

Whichever decoder, the same hostile-file tests as the viewer's (§ 8), plus HEIC's own:

- The brand check reads the bytes: `ftyp` with a major brand of `heic`, `heix` or `mif1` (and `mif1`
  only with a `heic`-family compatible brand), at the very first box; a file with a HEIC brand that
  isn't a HEIC (the brand followed by a JPEG, or by nothing) is refused as damaged.
- A truncated HEIC (cut off inside its item table, and inside its picture data) is refused or shown
  as damaged, nothing drawn, nothing hangs.
- Huge claimed dimensions in the picture's size box (`ispe`), and a tile grid whose tiles add up to
  more than it claims: refused before any tile is decoded, by the same 50-megapixel and
  20,000-pixel caps.
- The decoder only in the no-network worker (A, C, D); the worker stopped after 20 seconds.

## Recorded so a change is noticed

SHA-256 of the tarballs read on 2026-10-09: `libheif-js-1.23.5.tgz`
`d0bfe7198bd624c524cef8ccf78e15ceb42683c87598c64c2e13ced0d8680932` (its `libheif.wasm`
`184d3d20f8323877f13e9f5254f9c6a0ce272c9a3a2f823b0b2bcd2ee9f73f80`); `heic2any-0.0.4.tgz`
`510dbabc44f5940689b1779fff552584a1c4df434c0cc83c3be3258b2ace1995`; `elheif-0.1.0.tgz`
`e239d3fdeb20795f6250fdc6ce0df0a6172d821fa875f31dd556123cf80f64c8`; `saschazar-wasm-heif-2.0.0.tgz`
`fa01cc0976936c932b9d3f81a89804ec34d2e8e9d863e22310f64097d200122d`.
