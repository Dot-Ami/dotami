/**
 * Every sentence and label of *Your expenses* (/expenses) and of the receipt pieces it shares with Settings and
 * What DotAmi knows about you: the page itself, the typing form, the review list, a record's receipt line, the
 * receipt viewer, Start a new key… and Bring these receipts back. They lived in components/expenses/ until
 * 2026-10-31, when they moved here under the maintainer's decision of 2026-10-11 that screens keep their words in
 * one place; tests/cockpit-own-words.spec.ts fails on text written back into one of those components.
 *
 * Sentences about how the receipt files are protected, and what Bring back found, stay in
 * lib/expenses/receipts/protection.ts, where the server reads them too. A record's own facts (its share, its
 * GST/HST part, how a refund is kept) are lib/expenses/display.ts.
 *
 * Some pieces carry a space at one end: they sit beside a number or a name the component puts in, and the space
 * is what keeps the two apart on screen, exactly as before the move.
 */
export const expensesWords = {
  /** The page, /expenses (components/expenses/expenses-page.tsx). */
  page: {
    back: "← Your futures",
    name: "Your expenses",
    settings: "Settings",
    title: {
      lead: "Your expense records, ",
      emphasis: "in your own words.",
    },
    intro:
      "Each business expense you keep, one record at a time, on this computer. DotAmi keeps what you type and agree to. It never picks a category, never sets the business share, and never says what is deductible or how a refund is taxed. Not tax advice.",
    loadFailed: "Could not load your expense records.",
    /** An idea the list of ideas doesn't name (yet). */
    anIdea: "an idea",
    show: "Show",
    allRecords: "All your records",
    /** The choice for records no idea holds, in each select, and on a record that isn't attached. */
    notAttachedYet: "Not attached to an idea yet",

    waiting: {
      region: "Waiting for you",
      record: "record",
      records: "records",
      /** After the count and "record" or "records". */
      line: " waiting for you to agree (proposed by an agent, a file, or typed earlier)",
      review: "Review",
    },

    typed: {
      heading: "Type expenses",
      line: "Type as many as you like; they wait on the list below until you agree to them, all at once.",
      /** Before the count of typed records. */
      count: "Typed, not kept yet · ",
      listName: "Typed, not kept yet",
      for: "For",
      edit: "Edit",
      remove: "Remove",
      /** Before the count, on the button that opens the review list. */
      review: "Review ",
      notKept: "Kept only once you agree. Closing this window forgets this list.",
    },

    agreed: {
      heading: "Records you agreed to",
      loading: "Loading…",
      none: "None here yet.",
    },

    takenBack: {
      heading: "Taken back",
      on: (day: string) => ` · taken back ${day}`,
    },

    /**
     * Record a refund for this, when the typed list already has records for another idea: "For" covers the
     * whole list, so the shortcut leaves it as it is and says so.
     */
    refundNotice: (listFor: string | null, purchaseIs: string) =>
      `The typed list stays for ${listFor}; the purchase is ${purchaseIs}. Change “For” above the list if this refund belongs there too.`,
    listNotAttached: "“not attached to an idea yet”",
    /** Where a record sits, in a sentence: the refund notice and a waiting record's last fact. */
    notAttached: "not attached to an idea",
    forIdea: (idea: string | null) => `for ${idea}`,
    /**
     * The label kept with each record typed here; it is shown back as the record's source ("from typed by you").
     * It is saved with the record, so changing these words changes what new records keep, not the ones already kept.
     */
    typedSource: "typed by you",
    /** Typed records were saved, but agreeing to them failed. */
    savedAsWaiting: (error: string) => `They were saved as waiting, not agreed to: ${error} You can agree to them under “Waiting for you”.`,
    /** A waiting record's last fact in the review list. */
    fromSource: (source: string, where: string) => `From ${source} · ${where}`,

    reviewTyped: {
      title: "Agree to keep these records?",
      intro: (forWhat: string) => `Nothing is kept until you agree. Untick any you want to leave out: they stay on your typed list. For: ${forWhat}.`,
      notAttached: "not attached to an idea yet",
    },
    reviewWaiting: {
      title: "Agree to these proposed records?",
      intro: "An agent, a file or an earlier visit proposed these. Nothing counts until you agree; untick any to leave them waiting, or turn one down.",
    },
  },

  /** One agreed record on the page (RecordRow in expenses-page.tsx). */
  record: {
    forIdea: (idea: string) => `For ${idea}`,
    /** Before the record's source label. */
    from: "from ",
    editedByYou: "edited by you",
    refundsLinked: "Refunds linked to it:",
    refundOn: (amount: string, day: string, status: string) => `${amount} on ${day}${status}`,
    refundWaiting: " (waiting)",
    refundTakenBack: " (taken back)",
    attachTo: "Attach to",
    moveTo: "Move to",
    attach: "Attach",
    move: "Move",
    recordRefund: "Record a refund for this",
    takeBackQuestion: "Take this record back? It stays listed as taken back.",
    takeBack: "Take back",
    keep: "Keep",
  },

  /** The form for typing one record (components/expenses/expense-form.tsx). */
  form: {
    name: "Type an expense",
    dayNotYet: "That day hasn't happened yet.",
    thisIs: "This is",
    purchase: "A purchase",
    refund: "A refund or credit",
    keepItAs: "Keep it as",
    negative: {
      label: "A negative amount on a record",
      help: "The record holds minus the amount that came back.",
    },
    separate: {
      label: "A separate refund record, linked to the purchase",
      help: "The purchase keeps its own amount; the refund sits beside it.",
    },
    eitherWay:
      "Either way it keeps the refund's date, the purchase it came from, the GST/HST part and the credit note when you give them. Which way is yours to choose; DotAmi doesn't say how a refund is taxed.",
    cameFrom: "The purchase it came from",
    /** After a label for a box that may be left empty. */
    optional: " (optional)",
    choosePurchase: "Choose a purchase…",
    noneInDotAmi: "None in DotAmi",
    creditNote: "Credit note (optional)",
    creditNoteHint: "its number and date",
    day: "Day",
    dayCameBack: "Day it came back",
    amount: "Amount",
    amountCameBack: "Amount that came back",
    amountHint: "45.99",
    currency: "Currency",
    paidTo: "Paid to",
    cameBackFrom: "Who it came back from",
    paidToHint: "Staples",
    whatFor: "What for",
    whatForHint: "printer paper",
    category: "Category (optional)",
    categoryHint: "your own word",
    businessShare: "Business share % (optional)",
    businessShareHint: "100",
    businessShareHelp: "Yours to set: a whole number, 1 to 100. Kept beside the full amount.",
    gstHst: "GST/HST part (optional)",
    gstHstHint: "5.98",
    seller: "The seller's address and GST/HST number (optional)",
    sellerAddress: "Seller's address",
    sellerGstNumber: "Seller's GST/HST number",
    sellerGstNumberHint: "123456789 RT 0001",
    add: "Add to the list",
    nothingKept: "Nothing is kept until you agree. No bank or card numbers here.",
  },

  /** The review list: type many, agree once (components/expenses/expense-review.tsx). */
  review: {
    close: "Close",
    nothingLeft: "Nothing left to review.",
    turnDown: "Turn down",
    /** Around the count, while a long list hasn't been scrolled to its end. */
    scrollLead: "Scroll through all ",
    scrollTail: " to agree",
    /** "2 left out: they stay where they are", around the count. */
    leftOut: " left out: ",
    itStays: "it stays",
    theyStay: "they stay",
    where: " where ",
    itIs: "it is",
    theyAre: "they are",
    notNow: "Not now",
    /** Before the count of ticked records. */
    agreeToAll: "Agree to all ",
  },

  /** A record's receipt (components/expenses/receipt-line.tsx). */
  receipt: {
    /** "Receipt: PDF · 1.2 MB · added 2026-09-30", around the type, the size and the day. */
    lead: "Receipt: ",
    added: " · added ",
    show: "Show receipt",
    removeQuestion: "Remove this receipt? DotAmi deletes its copy of the file; the record stays.",
    remove: "Remove receipt",
    keepIt: "Keep it",
    unreadable: "DotAmi couldn't read that file. Nothing was kept.",
    /** Said before a file is chosen: what is kept, and what kinds and size are taken. */
    beforeAdding:
      "DotAmi keeps a copy of the file exactly as you give it, on this computer: anything printed on it (the last digits of a card, your name and address) is kept too. A JPEG, PNG, WebP or HEIC (iPhone) picture, or a PDF, up to 10 MB; DotAmi checks what is inside the file, not its name. A HEIC photo is shown with this computer's graphics chip, and some computers can't show one (it is kept either way). The copy is your own record; it says nothing about whether you can stop keeping the original.",
    adding: "Adding…",
    choose: "Choose the receipt file",
    notNow: "Not now",
    add: "Add a receipt",
  },

  /** Whether the copy of a receipt is encrypted here (receiptNoteSentence in components/expenses/receipt-protection.tsx). */
  protection: {
    on: (keyLoss: string) => `In this app the copy is encrypted, with a key Windows keeps for your Windows account only. ${keyLoss}`,
    source: "In this copy, run from source, the copy isn't encrypted: anyone who can read the receipts folder can open it. The desktop app encrypts receipts.",
    noKeyStore:
      "On this computer the copy isn't encrypted (the key store Windows keeps for your account isn't available to DotAmi right now): anyone who can read the receipts folder can open it.",
  },

  /** A receipt shown inside DotAmi (components/expenses/receipt-viewer.tsx). */
  viewer: {
    /** Before the record's own title. */
    title: "Receipt: ",
    /** After the kind of file. */
    shownInside: ", shown inside DotAmi from its copy on this computer",
    drawnByChip: ", drawn by this computer's graphics chip",
    nothingRuns: ". Nothing in it can be clicked or run.",
    close: "Close",
    opening: "Opening the receipt…",
    photo: (width: number, height: number) => `The receipt photo (${width} × ${height} pixels)`,
    picture: (width: number, height: number) => `The receipt picture (${width} × ${height} pixels)`,
    page: (n: number, of: number) => `Page ${n} of ${of}`,
    /** "DotAmi shows the first 3 pages; this PDF has 9. The rest are kept in the file." */
    firstPages: {
      lead: "DotAmi shows the first ",
      page: "page",
      pages: (n: number) => `${n} pages`,
      has: "; this PDF has",
      rest: ". The rest are kept in the file.",
    },
  },

  /** Start a new key… (components/expenses/start-new-key.tsx). */
  newKey: {
    start: "Start a new key…",
    warn: {
      title: "Start a new key, and give up the locked receipts?",
      intro:
        "A new key can't open the receipts locked with the old one. Starting one gives those receipts up for good, unless the old key comes back: receipts.key found again (it may be in the Recycle Bin), or the Windows profile that could open it.",
      confirm: "Continue…",
      nothingDeleted:
        "Nothing is deleted. DotAmi moves the locked receipt files, and the old key file if it's there, into a new folder in the backups folder beside its data file, and tells you where. Your expense records stay; a receipt that was set aside says so when you open it.",
      restoreInstead: "If you have a backup made before the key was lost, restore it instead (File → Restore from a backup…): it brings those receipts back.",
    },
    sure: {
      title: "Are you sure?",
      intro: (then: string) => `The receipts locked with the old key are given up for good unless the old key comes back. ${then}`,
      restartsItself: "Then DotAmi restarts by itself to start the new key.",
      startsNextTime: "DotAmi starts the new key the next time it starts.",
      moving: "Moving them aside…",
      confirm: "Give up the locked receipts and start a new key",
      cancel: "Press Cancel to keep things as they are.",
    },
    /** What was moved: "2 locked receipt files and the old key file were". */
    moved: {
      oneFile: "1 locked receipt file",
      files: (n: number) => `${n} locked receipt files`,
      oldKeyFile: "the old key file",
      and: " and ",
      was: "was",
      were: "were",
    },
    done: {
      moved: (what: string, to: string) => `Done. ${what} moved to ${to}.`,
      nothingToMove: "Done. There were no locked receipt files left to move.",
      restartingNow: "DotAmi will restart now to start the new key…",
      restartByHand: "Close DotAmi and open it again to start the new key.",
    },
  },

  /** Bring these receipts back (components/expenses/bring-back-receipts.tsx). */
  bringBack: {
    button: "Bring these receipts back",
    title: "Bring these receipts back?",
    intro:
      "DotAmi opens each receipt in this folder with its old key, checks it against its expense record, locks it again with the key DotAmi uses now, and puts it back in the receipts folder; only then is it removed from the set-aside folder.",
    bringing: "Bringing them back…",
    confirm: "Bring them back",
    /** Before the folder's path. */
    from: "From ",
    stays:
      "A receipt whose record was deleted since, or that doesn't match its record, stays where it is, and DotAmi names it. Receipts you added since the new key was started aren't touched.",
    oldKeyStays:
      "The old key file stays in the folder. Delete on What DotAmi knows about you (“Safety copies in the backups folder”) can clear the folder later.",
  },
} as const;
