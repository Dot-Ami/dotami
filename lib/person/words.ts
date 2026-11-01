/**
 * Words about the person and what DotAmi keeps of them, kept in one place (the maintainer's decision of
 * 2026-10-11 that screens keep their words in one place; tests/cockpit-own-words.spec.ts fails on a sentence
 * written back into a component):
 *
 * - `statementWords`: *In your words*' box (components/shared/person-statements.tsx).
 * - `yourDataWords`: *What DotAmi knows about you* (/your-data, components/your-data/), moved here from the
 *   components on 2026-10-31. Each row's own words (a table's, a folder's, a window key's, what leaves the
 *   computer) come from lib/privacy/inventory.ts, and the encryption lines from lib/db/protection.ts and
 *   lib/expenses/receipts/protection.ts; this holds the page's own sentences around them.
 */

/** *In your words*' box, on About you and the cockpit's rail: what it says after **Keep this**. */
export const statementWords = {
  kept: "Kept, with the date.",
  couldNotKeep: "Couldn't keep that.",
  /**
   * The server answered that it can't keep it (no database; the status line above the list says why). Nothing
   * is kept anywhere else since 2026-10-24 (until then the window's storage held it): the words stay in the box.
   */
  notKept: "Not kept. Your words are still in the box, and Keep this tries again.",
  /** No answer from the server at all. */
  noAnswer: "Not kept: the server didn't answer. Your words are still in the box, and Keep this tries again.",
} as const;

/**
 * *What DotAmi knows about you*. A string that ends or starts with a space sits right against the words drawn
 * beside it; the rest are joined to their neighbours by the component.
 */
export const yourDataWords = {
  /** The things a count names, as "3 figures" or "1 file" (components/your-data/format.ts `plural` adds the s). */
  counted: {
    figure: "figure",
    record: "record",
    row: "row",
    file: "file",
    folder: "folder",
    receiptFile: "receipt file",
    safetyCopy: { one: "safety copy", many: "safety copies" },
    setAsideFolder: "set-aside receipt folder",
  },
  /** "it" for one file or folder, "them" for more. */
  itOrThem: { one: "it", many: "them" },

  /** The page itself (components/your-data/your-data-page.tsx). */
  page: {
    back: "← Settings",
    navLabel: "Your data",
    /** The heading: the second part is set in italics. */
    heading: { start: "What DotAmi", stress: "knows about you" },
    intro:
      "Everything DotAmi keeps, counted from your data file each time you open this page — not a saved summary. Nothing here changes anything unless you use Delete, at the bottom.",
    /** The data file couldn't be read: the page says so instead of failing. */
    unreadable:
      "DotAmi couldn't read its data file just now, so it can't list what is in it. Nothing was changed. Check that the file is where Settings says it is, then reload this page.",
    onThisPage: "On this page",
    /** The five sections, in the page's order: the links at the top and the headings. */
    sections: {
      figures: "Your figures, by source",
      file: "Everything else in the data file",
      computer: "On this computer, outside the data file",
      leaves: "What leaves this computer",
      removing: "Taking things out",
    },

    tables: {
      lead: "Every table in the data file, with how many records it holds and what takes one out today.",
      none: "None",
      /** After an idea count: how many of the ideas carry a note of the person's. */
      withNotes: (ideas: number) => ` · ${ideas} with your notes`,
      /** After the figures' count: they are listed by source in the first section. */
      listedAbove: " · listed above",
      /** The small labels before a row's own lines, in the same style as the settings rows. */
      removedBy: "What takes it out · ",
      aboutOthers: "About other people · ",
    },

    dataFile: {
      label: "The data file",
      isThisFile: "Everything in the sections above is this one file",
      notThereYet: ", which isn't there yet:",
      noSingleFile: "This copy's database setting doesn't point at a single file, so there is no file to show.",
    },

    folders: {
      noDataFile: "This copy has no data file, so there is no folder beside it.",
      noneYet: "None yet.",
      /** A folder only the desktop app makes, on a copy run from source. */
      noneHere: "None here. This copy runs from source; the desktop app is what makes it.",
      notAllowed: "It is there, but DotAmi isn't allowed to look inside, so it can't say what's in it.",
      inAll: (size: string) => `, ${size} in all`,
      present: "Present",
      /** "newest written" for a folder of files, "last written" for a single file. */
      newestWritten: "newest written",
      lastWritten: "last written",
      /** How far DotAmi looked: into the receipts folder a little further, to tell encrypted files from plain ones. */
      countedReceipts:
        "DotAmi counted the files, read their dates and the first few bytes of each (only to tell an encrypted receipt from a plain one); it never opened a receipt.",
      countedOnly: "DotAmi only counted the files and read their dates; it never opened them.",
    },

    /** The receipts folder's files, counted by how they are kept ([8i], expense-records.md § 9). */
    receipts: {
      encryptedOf: (encrypted: number, total: string) => `${encrypted} of ${total} encrypted with this computer's key.`,
      notEncryptedYet: (files: string, itOrThem: string) => `${files} not encrypted yet: DotAmi encrypts ${itOrThem} the next time it starts.`,
      encryptedByTheApp: (files: string, itOrThem: string) => `${files} encrypted by the DotAmi desktop app; this copy can't open ${itOrThem}.`,
      lockedElsewhere: (files: string) => `${files} locked with a key this computer can't open.`,
    },

    window: {
      heading: "In this window",
      /** How long a key stays is a disclosure the page owes the person (the maintainer's decision 2 of 2026-10-24). */
      lead: "These live in the window, not in the data file, so this page can't see what is in them right now. This is what DotAmi puts there and how long it stays.",
      /** What a key in the window's lasting storage, and in the storage a window clears on closing, is kept for. */
      untilCleared: "Stays until cleared",
      untilWindowCloses: "Gone when the window closes",
      howLong: "How long · ",
      storedUnder: "Stored under",
    },

    /** Under the computer's section: who else can read it, and where Settings says how to protect it. */
    protection: {
      start: "Anyone who can use this computer can read all of this. Disk encryption is what protects it if the computer is lost; how to turn it on is under",
      link: "Settings → Data and backups",
      end: ".",
    },

    /** "What leaves this computer": a row per kind of request (components/your-data/your-data-page.tsx `SentRow`). */
    sent: {
      states: {
        active: "Happening in this copy",
        inactive: "Not happening in this copy",
        "on-your-action": "Only when you choose",
      },
      when: "When",
      what: "What",
      takingItBack: "Taking it back",
      /**
       * The intake's row, while it is on: Anthropic's period is never put in DotAmi's words, only linked and
       * quoted after a label that says whose words they are.
       */
      anthropicKeeps: "How long Anthropic keeps it:",
      anthropicPage: "its own page on data retention",
      anthropicPageEnd: ".",
      /** The label over the page's two other sections (the maintainer, 2026-10-29). */
      anthropicAlsoSays: "Anthropic's page also says:",
    },
    leaves: {
      start: "DotAmi has no server of its own and collects no usage data. More on what leaves, including from the tools DotAmi is built with, is under",
      link: "Settings → Privacy",
      end: ".",
    },

    removing: {
      onTheCard:
        "On an idea's card you can retract an agreed figure or discard a waiting one (it stops counting, and its amount stays in the file, listed above), and remove a link between two ideas.",
      delete:
        "Delete erases whole kinds of data from the file: you pick which, see what else goes with each, and DotAmi asks twice. It can't pick out a single figure, statement or idea.",
      /** The Delete menu's names for the two counts that aren't tables. */
      safetyCopies: "Safety copies",
      setAsideFolders: "Set-aside receipt folders",
    },
  },

  /** "Your figures, by source" (components/your-data/figures-by-source.tsx). */
  figures: {
    none: "No figures are kept. Nothing has been typed, read from a file, or proposed to you.",
    /** After the count of figures: "8 figures in the data file: 4 agreed · 2 waiting …". */
    inTheDataFile: "in the data file:",
    stillStored: "A figure you took back or turned down stops counting, but its amount is still stored in the file, so it is listed here with the rest.",
    show: "Show",
    hide: "Hide",
    idea: "Idea",
    ideas: "Ideas",
    proposedOn: (day: string) => `proposed ${day}`,
    proposedFromTo: (first: string, last: string) => `proposed ${first} to ${last}`,
    editedByYou: "edited by you",
    /** After the count of rows a file's figure was summed from. */
    summed: "summed",
    /** The days a figure was proposed, agreed to and taken back. Turning one down isn't dated in the data file. */
    days: { proposed: "Proposed", agreed: "Agreed", takenBack: "Taken back" },
    /** The four states, in the words the person already sees on the idea's card and in the agree prompt. */
    status: {
      proposed: "Waiting for you to agree",
      confirmed: "Agreed",
      retracted: "Taken back",
      discarded: "Turned down",
    },
    /** Short versions for a count line: "3 agreed · 1 waiting". */
    statusCount: {
      confirmed: "agreed",
      proposed: "waiting",
      retracted: "taken back",
      discarded: "turned down",
    },
    sourceKind: {
      typed: "Typed by you",
      file: "Read from a file",
      agent: "Proposed by an agent",
      "tax-return": "Read from a tax return",
      // The maintainer's wording (2026-10-08): books and a file in one name, with a slash.
      books: "Books / file",
    },
  },

  /** Plain readings the page's helpers give (components/your-data/format.ts). */
  format: {
    /** An amount too big to hold exactly is shown as its cents rather than rounded. */
    inCents: (cents: string, currency: string) => `${cents} cents ${currency}`,
    period: (periodStart: string, periodEnd: string) => `${periodStart} to ${periodEnd}`,
    bytes: (bytes: number) => `${bytes} bytes`,
    sizeUnits: ["KB", "MB", "GB"],
    /** A small number as a sentence writes it ("six"); digits from 11 up. */
    numbers: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
  },

  /** The Delete button, its menu and its two asks (components/your-data/delete-menu.tsx). */
  delete: {
    button: "Delete",
    nothingOfYours: "Nothing to delete: the data file holds nothing of yours.",
    menu: {
      legend: "What do you want to delete?",
      lead: "Tick what to delete. Each box says what else goes with it. Nothing is deleted until you have said yes twice.",
      notKeptYet: "Not kept yet",
      nothingToDelete: "Nothing to delete",
      /** After a kept row's name, capitalised: "Expense records attached to them: 2". */
      attachedToThem: "s attached to them:",
      goToo: (table: string) => `(they go too: “${table}” is ticked)`,
      stayAs: (becomes: string) => `(they stay, as “${becomes}”)`,
      learnMore: "Learn more",
      /** The CRA's general rule on keeping business records, around the catalog's own words and the source. */
      craSays: "The CRA says business records are generally kept for",
      yearsFrom: "years from",
      withExceptions: ", with exceptions.",
      cra: "CRA:",
      notReached: "What Delete doesn't reach",
      deleteTicked: "Delete what's ticked…",
      cancel: "Cancel",
    },
    /** Said before the person confirms: how many rows stay, as what (the maintainer's decision of 2026-10-08). */
    kept: {
      stays: "stays",
      stay: "stay",
      as: ", as “",
      asEnd: "”.",
    },
    firstAsk: {
      title: "Delete these?",
      intro: "This is everything that goes. Check it before you go on.",
      confirm: "Yes, continue",
      keptNotDeleted: "Kept, not deleted",
      copiesGoToo: "The safety copies go too, so afterwards only a backup you saved somewhere else could bring anything back.",
      everythingElseStays:
        "Everything not ticked stays, and so does what Delete doesn't reach (how you left the cockpit, kept in this window's own storage and offered back next time; the log).",
      /** Each starts with a space: it follows the sentence above in the same paragraph. */
      copiesNotTicked: " The safety copies in the backups folder aren't ticked, so they still hold what you delete.",
      setAsideNotTicked: " The receipt folders set aside in the backups folder aren't ticked, so they still hold their receipt files.",
    },
    secondAsk: {
      title: "Delete them now?",
      intro: "This can't be undone. DotAmi wipes them from the data file, so they can't be dug back out of it.",
      confirm: "Delete now",
      deleting: "Deleting…",
      copiesGoToo: "The safety copies in the backups folder go too. Afterwards, only a backup you saved somewhere else could bring anything back.",
      backUpFirst: {
        desktop: "If you might want them back, cancel and use File → Back up… first; File → Restore puts a backup back.",
        source: "If you might want them back, cancel and copy the data file somewhere first; it is listed above.",
      },
    },
    /** What happened, once the server answered. */
    done: {
      heading: "Deleted.",
      deleted: "deleted",
      left: (left: number) => `, ${left} left`,
      keptNow: "kept, now “",
      keptNowEnd: "”",
      /** What the kept rows became, when the menu doesn't name it. */
      kept: "kept",
      inAll: (records: string) => `; ${records} in all`,
      receiptFiles: "Receipt files:",
      removedFromReceipts: "removed from the receipts folder",
      couldNotOpenReceipts: "DotAmi couldn't open the receipts folder to remove the receipt files.",
      couldNotRemove: (files: string) => `${files} couldn't be removed yet (another program may have it open).`,
      noRecordPoints: "No record points to them any more; DotAmi removes them the next time you add or delete a receipt.",
      couldNotReadBack: "DotAmi couldn't read the data file back to count what is left. Reload this page to check.",
      wiped: "Their space in the data file is wiped, so they can't be read back out of it.",
      notWiped:
        "They are deleted, but their space in the data file isn't wiped yet, so their words could still be dug out of the file. The wipe needs free disk space about the size of the data file, and nothing else using the file.",
      copiesLeft: {
        start: "in the backups folder couldn't be deleted, because another program has",
        end: "open. Close that program and try again.",
      },
      foldersLeft: {
        start: "in the backups folder couldn't be cleared, because another program has a file in",
        end: "open. Close that program and try again.",
      },
      desktopFinishes: "If it still can't finish, the desktop app finishes it the next time it starts.",
      wiping: "Wiping…",
      tryAgain: "Try the wipe again",
    },
    /** An earlier Delete's wipe that hasn't finished (its note is beside the data file). */
    pending: {
      finished: "Finished: the earlier Delete's wipe is done.",
      notFinished:
        "An earlier Delete hasn't finished: what it deleted could still be dug out of the data file, or a safety copy or set-aside receipt folder it was deleting is still there.",
      desktopFinishes: "The desktop app finishes it the next time it starts.",
      finishHere: "Finish it here.",
      stillCouldNot: "It still couldn't finish. Close any program using DotAmi's files, and check there is free disk space.",
      finishing: "Finishing…",
      finishNow: "Finish it now",
    },
    /** The asks' own Cancel. */
    cancel: "Cancel",
  },
} as const;
