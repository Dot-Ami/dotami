/**
 * Every sentence the settings page shows (components/settings/: the page, its "Today" lines and its controls).
 * The maintainer decided on 2026-10-11 that screens keep their words in one place; these moved here from the
 * components on 2026-10-31, word for word. tests/cockpit-own-words.spec.ts fails on text written back into a
 * component.
 *
 * The settings' own names, defaults, choices and warnings are lib/settings/catalog.ts, not here: this file holds
 * only what the components say around them. A sentence broken by a link or a piece of code is kept as its parts,
 * in order, and the component puts the link or the code between them.
 */
export const settingsWords = {
  page: {
    back: "← Back",
    /** The page's name in the top bar. */
    name: "Settings",
    heading: { lead: "Settings,", rest: "and what's true today." },
    intro: {
      before:
        "Each group starts with what this copy of DotAmi does right now. Below that is every setting planned for it: its default, its choices, and the warning you'll see before switching on anything risky. Only the ones with a tick-box below can be changed so far; each of the others arrives with the feature it controls, named by its code on the",
      link: "public task list",
      after: ".",
    },
    /** The accessible name of the row of links to each group. */
    groups: "Setting groups",
    /** The label over each group's lines about this copy. */
    today: "Today",
  },

  /** One setting's row. Its name, what it does, default, choices and warning come from the catalog. */
  row: {
    undecided: "Waiting on a decision",
    /** The story code reads exactly as the task list writes it ("[7b]"). */
    planned: (story: string | null) => `Not built yet · [${story}]`,
    asked: (where: string | undefined) => `Asked each time · ${where}`,
    default: "Default",
    choices: "Choices",
    warning: "Warning ·",
  },

  /** The "Today" lines for each group. Every sentence here must stay true of the running app. */
  today: {
    data: {
      noPath: "This copy's database setting doesn't point at a file, so there is no single data file to show.",
      noFile: {
        before: "Your data file belongs at",
        after: ", but there's no file there yet.",
        command: "npm run prisma:deploy",
        createsIt: "creates it (README, Quick start).",
      },
      /** Receipt files ([8i]) live in a receipts folder beside the data file, not inside it. */
      oneFile: "Your data is one file on this computer, plus the copies of your receipts in a folder named receipts beside it:",
      /** The desktop app's File menu. */
      backUp: {
        backUp: "File → Back up…",
        backUpDoes:
          "makes one file you can keep somewhere else, locked with a passphrase you choose (every backup needs one), with your receipt files in it.",
        restore: "File → Restore from a backup…",
        restoreDoes: "puts one back — on this computer or a new one — after checking it, and keeps a copy of what was here in the backups folder.",
      },
      /** A copy run from source has no File menu. */
      copyIt:
        "Copying that file and the receipts folder beside it while DotAmi is stopped is a complete backup; deleting both starts over. The desktop app has Back up and Restore in its File menu.",
      /** Microsoft's own page, read 2026-10-06: support.microsoft.com "Device encryption in Windows". */
      diskEncryption:
        "The backup doesn't protect this computer's copy if the computer is lost or stolen — disk encryption does. On Windows: Settings → Privacy & security → Device encryption (on Windows Home; Pro also has BitLocker). It needs supported hardware and is only switched on by itself if you signed in with a Microsoft account. On a Mac: FileVault.",
    },
    figures: {
      before:
        "DotAmi keeps the totals you agree to, each with where it came from and the day you agreed. It also keeps the ones still waiting for your answer, and the ones you turned down or took back. None of those count, but every one stays in your data file, amount included. Your revenue estimates from the intake are kept separately. Every figure, and where it came from, is listed on",
      link: "What DotAmi knows about you",
      after: ".",
    },
    lens: "No model is chosen: the Lens isn't built yet (it arrives with [9a]), and no outside agent can connect. The only AI in the app today is the reader for the sentence you type to describe a venture — see Privacy.",
    map: (taxYear: number) => `The cards use the ${taxYear} rules, the only tax year mapped so far. The app is in English.`,
    privacy: {
      whatLeaves: "What leaves this computer:",
      nothing: "DotAmi sends nothing off this computer.",
      readHereNoKey: "The sentence you type to describe a venture is read here, by keyword matching — no model key is set.",
      /** A model key is set: the intake's sentence goes to Anthropic. */
      toAnthropic: {
        before: "The sentence you type to describe a venture is sent to Anthropic to be read (model",
        because: "), because a model key (",
        keyName: "ANTHROPIC_API_KEY",
        isSet: ") is set for this copy, usually in its",
        envFile: ".env",
        after: "file. Empty the key and it's read here, by keyword matching, instead.",
      },
      /** The installed app's update check: what GitHub sees (the install ID is in lib/privacy/inventory.ts too). */
      updateCheck:
        "When the app starts, it asks GitHub whether there's a newer version, and downloads it if there is. GitHub sees this computer's internet address, which version it runs, and a random install ID the update checker made for this copy, the same on every check — none of your data. That ID is kept in the data folder; What DotAmi knows about you, linked below, says how to remove it.",
      readHere: "The sentence you type to describe a venture is read here, by keyword matching.",
      noServer: {
        before:
          "DotAmi has no server of its own and collects no usage data. Links to official sources and to GitHub open those sites only when you click them. Everything DotAmi keeps about you is listed on",
        link: "What DotAmi knows about you",
        after: ".",
      },
      /**
       * A copy run from source: what Next.js and Prisma report unless told not to, and the switches. Next.js's
       * page (nextjs.org/telemetry) was read on 2026-10-05.
       */
      fromSource: {
        lead: "If you run DotAmi from its source code: two tools it is built with report anonymous counts unless told not to — the Next.js framework to Vercel when it builds or runs in development mode (the command, versions, the kind of computer, the app's size;",
        telemetryLink: "nextjs.org/telemetry",
        readOn: ", read 2026-10-05), and the Prisma database tool to Prisma each time it runs. The project's own commands (",
        dev: "npm run dev",
        build: "npm run build",
        andTheRest: "and the rest) switch both off. Installing with",
        ci: "npm ci",
        runsPrismaOnce: "runs Prisma once on its own, and",
        npxNext: "npx next",
        or: "or",
        npxPrisma: "npx prisma",
        skipTheSwitch: "typed by hand skip the switch: set",
        nextOff: "NEXT_TELEMETRY_DISABLED=1",
        and: "and",
        prismaOff: "CHECKPOINT_DISABLE=1",
        inYourEnvironment: "in your environment for those.",
        devAlsoAsks:
          "also asks npm's registry which Next.js version is newest each time it starts; npm sees this computer's internet address and nothing else.",
      },
    },
    updates: {
      thisIsVersion: "This is version",
      fromGitHub:
        ". Each time it starts, the app checks GitHub for a newer version and downloads it, then asks before installing it — nothing installs without your click. Help → Check for updates does it now.",
      fromSource: ", run from DotAmi's source code: it updates with git, not by itself. The installed app checks GitHub for new versions.",
      /** The third-party notices (/licences): the licences of everything DotAmi ships with. */
      licences: {
        before:
          "DotAmi is open source under the Apache License 2.0, and ships with work by many other people. Each piece, its version and its licence, word for word:",
        link: "Licences",
        /** Only in the desktop app, which has a Help menu. */
        alsoInHelp: "(also under Help → Licences)",
      },
    },
  },

  /** [8g] The bank and card accounts list under "Bank and card records" (components/settings/bank-accounts-control.tsx). */
  bankAccounts: {
    heading: "Your bank and card accounts",
    empty: "No accounts in your list.",
    /** "Always allow every account", when it was pressed. */
    every: {
      title: "Every account",
      detail: (since: string) => `Always allowed since ${since}, including accounts added later`,
      question:
        "Take back “Always allow every account”? Each account's next statement shows the warning again, unless you chose “Always allow this account” for it.",
      /** How the line after a Take back names it: "Taken back: every account." */
      name: "every account",
    },
    question: (name: string) =>
      `Take back “${name}”? It leaves this list, and its next statement shows the warning again as a new account. Figures already read from it stay.`,
    takenBack: (name: string) => `Taken back: ${name}.`,
    /** The Take back button's accessible name, and its question's. */
    takeBackLabel: (title: string) => `Take back ${title}`,
    askingLabel: (title: string) => `Take back ${title}?`,
    takeBack: "Take back",
    keep: "Keep it",
    takingBack: "Taking back…",
    yes: "Yes, take it back",
  },

  /** The button beside the data file's path. */
  copyPath: {
    copy: "Copy path",
    copied: "Copied",
    /** The clipboard needs a secure page (localhost counts); it says so instead of failing silently. */
    failed: "Copy failed — select it instead",
  },

  /** [8i] The "Encrypt the data file" switch (components/settings/database-encryption-control.tsx). */
  databaseEncryption: {
    source: "Only the desktop app encrypts the data file; this copy, run from source, can't.",
    label: "Encrypt the data file",
    /** Unticking it while the file is encrypted: what turning it off exposes. */
    turnOff: {
      question: "Turn off locking for the data file?",
      detail:
        "At DotAmi's next start, your data file and its safety copies are decrypted, and their key is deleted once nothing is locked with it. After that, anyone who can read your data folder, a copy of it, or this computer's disk outside Windows can read your ideas, figures, expense records and statements. A copy of the whole data folder holds its own copy of the key, so it still opens on your Windows account. Backups you make with File → Back up… stay locked with their passphrase either way. Your receipt files keep their own encryption.",
      back: "Go back",
      confirm: "Turn it off",
    },
    /** Unticking it while the file is plain: "Never". */
    never: {
      question: "Never encrypt the data file?",
      detail:
        "Your data file stays unencrypted: anyone who can read your data folder, a copy of it, or this computer's disk outside Windows can read it. DotAmi won't ask again until you turn this back on.",
      back: "Go back",
      confirm: "Keep it unencrypted",
    },
    /** The status line: what the app answered, never what was clicked. */
    status: {
      readFailed: "DotAmi couldn't read this choice from your data file.",
      saveFailed: "Couldn't save; nothing changed.",
      on: "On: your data file is encrypted. Untick to decrypt it at the next start.",
      offAtNextStart: "Off: DotAmi decrypts your data file the next time it starts. Tick the box again before then to keep it encrypted.",
      onNoKeyStore: "On: DotAmi encrypts the file once Windows' key store is available, asking first.",
      onAsks: "On: DotAmi asks to encrypt your data file the next time it starts.",
      never: "Never: the data file stays unencrypted, and DotAmi doesn't ask.",
    },
  },

  /** [8e] The "Figure reminders" tick-boxes (components/settings/figure-reminders-control.tsx). */
  figureReminders: {
    legend: "Remind me",
    status: {
      readFailed: "Couldn't read your saved choice, so it can't be changed right now.",
      saving: "Saving…",
      saved: "Saved.",
      saveFailed: "Save failed — nothing was changed.",
      none: "None ticked: no reminder.",
    },
    addToCalendar: "Add to my calendar",
    /** What the calendar file holds and who can see it (lib/figures/calendar.ts makes it in the page). */
    calendarHelp:
      "Saves a calendar file (.ics) with one repeating event per ticked box, on the first day after each month, quarter or year ends. Open it with your calendar app, or use its Import menu. Google Calendar: import it on a computer at calendar.google.com (Settings, then Import & export). Importing the same file again adds a second copy, so after changing your ticks, delete the old events first. Your calendar can't see DotAmi, so it reminds you whether or not your figures are already in. The file holds only those general words: no amounts and no idea names. A calendar that syncs online shares them with the company that runs it.",
  },
} as const;
