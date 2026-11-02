/**
 * Every sentence the licences page shows (/licences, components/licences/licences-page.tsx): the third-party
 * notices DotAmi ships. The maintainer decided on 2026-10-11 that new screens keep their words in one file, and
 * widened it to every screen by his "Do it" on the house-cleaning audit of 2026-10-31 (item architecture-5); these
 * moved here from the component that day, word for word. tests/cockpit-own-words.spec.ts fails on text written
 * back into a component.
 *
 * The entries themselves (each package's name, version, licence and text) are read from THIRD-PARTY-NOTICES.txt
 * by lib/licences/notices.ts; only the page's own words are here. A sentence broken by a link or a file name is
 * kept as its parts, in order, and the component puts the link or the code between them.
 */
export const licencesWords = {
  back: "← Settings",
  /** The page's name in the top bar. */
  name: "Licences",
  heading: { lead: "Licences,", rest: "and who wrote what." },
  intro: {
    before: "DotAmi is open source under the",
    link: "Apache License 2.0",
    after:
      ". It is built with work by many other people. Each piece that ships with this copy is listed below with its version and its licence; open one to read the licence word for word, as its authors wrote it.",
  },
  /** The notices file's name, as the page shows it. */
  file: "THIRD-PARTY-NOTICES.txt",
  /** A copy that was never built (`npm run dev`) has no notices file. */
  missing: {
    notBuilt: "This copy of DotAmi hasn't been built, so the list hasn't been written yet.",
    build: "npm run build",
    or: "(or",
    notices: "npm run notices",
    writesIt: ") writes it; the installed app always has it.",
  },
  /** The file is there but not in the shape the page expects. */
  unreadable: {
    before: "DotAmi found its licence list but couldn't read it. The file is",
    after: "in the folder DotAmi's server runs from; it can be opened with any text editor.",
  },
  /** The line over the list: "<n> entries, from THIRD-PARTY-NOTICES.txt, written when this copy was built (<the header's second line>)." */
  listed: {
    entries: "entries, from",
    written: ", written when this copy was built (",
    /** In place of the header's second line, when the header has only one. */
    noBuildLine: "DotAmi",
  },
  /** The accessible name of the row of links to each section. */
  sectionsNav: "On this page",
  /** The page's sections, one per kind of entry the notices file has. */
  sections: {
    runtime: {
      title: "The desktop app's runtime",
      blurb: "What the installed app runs on. Chromium's own notices are a separate file in the app's folder, named below.",
    },
    packages: {
      title: "Packages",
      blurb: "Code written by others that DotAmi is built with and ships.",
    },
    inside: {
      title: "Copied inside other packages",
      blurb:
        "Code a package above carries inside itself (Next.js ships its own copies of these). Where that package includes no licence file for a copy, the entry says so.",
    },
    fonts: { title: "Fonts", blurb: "The fonts the pages are set in." },
    data: { title: "Data", blurb: "Information written by others that DotAmi shows, with the licence it comes under." },
  },
  /** One line per place an entry ships in, under the entry when it is opened. */
  shipsIn: (where: string) => `Ships in ${where}.`,
} as const;
