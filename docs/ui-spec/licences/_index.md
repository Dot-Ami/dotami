# Licences (`/licences`) — page overview

Last updated: 2026-10-08 (added: third-party licence notices)

**Route:** `/licences` · **Component:** `components/licences/licences-page.tsx` (server-rendered; no
script of its own) · **Reads:** `THIRD-PARTY-NOTICES.txt` in the folder the server runs from, through
`lib/licences/notices.ts`, on every visit · **Written by:** `desktop/notices.mjs` (`npm run build`
writes it in the top folder; `desktop/build.mjs` writes the installer's beside `server.js`) ·
**Reached from:** the "Licences" link in Settings → Updates (Today), and in the desktop app Help →
Licences.

## What it is for

DotAmi ships other people's code, fonts and styles, minified, without the licence files their
packages carry. Licences such as MIT and Apache-2.0 ask whoever passes the code on to keep the
copyright and licence notice with it. This page (and the same file beside `DotAmi.exe`) is where
those notices are kept and can be read.

## Layout

1. Header: "Licences, *and who wrote what.*" and one paragraph: DotAmi's own licence (Apache-2.0,
   linked to `LICENSE` on GitHub, opens in a new tab) and what the list is.
2. A count line: how many entries, the file's name, and which build wrote it (the file's second
   line, e.g. "DotAmi 0.2.1 (desktop app)").
3. Jump links to each section, with its count.
4. Sections, in order, each only when it has entries:
   - **The desktop app's runtime** — Electron (desktop app only). Its note names
     `LICENSE.electron.txt` and `LICENSES.chromium.html`, the Electron and Chromium notices beside
     `DotAmi.exe`.
   - **Packages** — every package that ships (see `desktop/notices.mjs` for exactly which).
   - **Copied inside other packages** — the copies Next.js carries in `next/dist/compiled`; in the
     desktop app, only the ones its server actually ships.
   - **Fonts** — Inter and JetBrains Mono (SIL Open Font License 1.1).

| Control | Behaviour | Persists to |
|---|---|---|
| ← Settings | back to `/settings` | — |
| Apache License 2.0 link | opens DotAmi's `LICENSE` on GitHub in a new tab (the desktop app opens it in the person's browser) | — |
| Jump links | in-page anchors to each section | — |
| An entry (name · version · licence) | opens and closes (a `<details>`): where it ships, a note in amber when there is one (a package with no licence file of its own, or Electron's pointer to Chromium's notices), then the licence and notice files word for word, each headed `--- <file> ---`, in a scrolling box | — |

When the file isn't there (`npm run dev` on a copy that was never built), the page says so in an
amber box and names `npm run build` / `npm run notices`; when it is there but can't be read, it says
that and names the file. It never shows an empty list as if nothing shipped.

## What it deliberately does not do

- No search box: the browser's own Find works on the open entries, and the names are always shown.
- No Chromium list of its own: Chromium's notices are Electron's own file, `LICENSES.chromium.html`,
  shipped beside `DotAmi.exe`; the Electron entry names it.
- It doesn't judge whether a licence allows anything. It shows what each package says.

## Tests

`e2e/app.spec.ts` › "Licences: reached from the settings page…" — from the Settings link; `react`
listed with MIT; closed until opened, then its licence text and where it ships; next, pdfjs-dist,
ofx-js, @prisma/client and tailwindcss listed; the fonts; the copies inside Next.js; no runtime
section in a copy run from source; no sideways scroll at 390 px. `e2e-desktop/desktop.spec.ts` ›
"Help → Licences…" — the menu item opens it, Electron and electron-updater are listed, and every
package in the server's `node_modules` has an entry.
