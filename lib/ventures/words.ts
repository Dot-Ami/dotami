/**
 * Every sentence and label of *Your futures*, the ideas page (components/ventures/ventures-page.tsx), and of the
 * figures on each idea's card: the figures panel, the agree prompt, the reminder banners, "Add from a file" with
 * its GnuCash book review, and "Add from last year's return" (components/ventures/). The maintainer decided on
 * 2026-10-11 that new screens keep their words in one file, and widened it to every screen by his "Do it" on the
 * house-cleaning audit of 2026-10-31 (item architecture-5). This file started on 2026-10-23 with the card's line
 * for a type nobody was asked for; the rest of the folder's sentences moved here from the components on
 * 2026-10-31, word for word. tests/cockpit-own-words.spec.ts fails on text written back into a component.
 *
 * Numbers, amounts and months are filled in by the components; the words around them are here, so a template
 * here keeps the exact shape it had in the component.
 */

/** "row" or "rows" for a count. */
const rows = (n: number) => (n === 1 ? "row" : "rows");
/** "line" or "lines" for a count of a book's posted lines. */
const lines = (n: number) => (n === 1 ? "line" : "lines");
/** "cell" or "cells" for a count. */
const cells = (n: number) => (n === 1 ? "cell" : "cells");

/**
 * What a formula saved with no value is, and what to do about it. Some programs (Xero says so for its Excel
 * reports) leave a formula's result for Excel to work out on opening; until the file is opened in Excel and saved
 * again, the cell holds no number, and DotAmi never works one out.
 */
const UNSAVED_FORMULA_ADVICE =
  "a formula Excel didn't save a value for (open the file in Excel, click Enable Editing if it asks, save it, then drop it here again)";

export const venturesWords = {
  /** Words more than one of the folder's components use. */
  common: {
    loading: "Loading…",
    cancel: "Cancel",
    close: "Close",
    /** A request the server turned down without saying why, or that came back empty. */
    notThrough: "That didn't go through. Nothing was changed.",
    currency: "Currency",
    currencyHelp: "Write the currency as three letters, like CAD.",
    reviewOne: "Review this figure",
    reviewMany: (n: number) => `Review these ${n} figures`,
    /** Before the name of the file just read. */
    file: "File:",
    /** Before the name of the file being read, which is followed by "…". */
    reading: "Reading",
    chooseAnother: "Choose another file",
    /** Followed by the file's name. */
    monthlyTotalsFrom: "Monthly totals from",
    /** After a month DotAmi already holds the same total for. */
    alreadyInDotAmi: "— already in DotAmi with the same total, not proposed again",
    leftOut: "Left out",
  },

  /** *Your futures* itself: the bar along the top, the heading and the list. */
  page: {
    back: "← Back",
    name: "Your futures",
    expenses: "Your expenses",
    settings: "Settings",
    heading: { lead: "Every future,", rest: "saved and cross-referenced." },
    intro:
      "Listed by when you last touched them — not ranked. Each opens in its own cockpit. Link the ones that overlap or could become sister companies; the map reads the links, it never scores them.",
    another: "+ Another future",
    /** The list couldn't be read: the server's own reason, else these. */
    noDatabase: "No database reachable.",
    noApp: "Could not reach the app.",
    empty: "Nothing saved yet. Describe one on the intake and press Save on its map.",
    start: "Start a future →",
  },

  /** One idea's card on *Your futures*. */
  card: {
    /** In place of the kind of venture on an idea saved without one (`VentureSummary.typeSaid` false). */
    typeNotSaid: "type not said",
    /** The card's line under the name: kind · province · structure … */
    structure: "· structure",
    /** The structure when the intake only assumed it. */
    structureNotSet: "not set",
    /** The first-year estimate at the end of the same line. */
    firstYear: (amount: string) => ` · Y1 $${amount}`,
    stage: "Stage",
    open: "Open in cockpit →",
    notes: "Your notes",
    notesPlaceholder: "Anything about this idea, in your words. Saved when you click away.",
    saving: "Saving…",
    saved: "Saved.",
    saveFailed: "Save failed.",
    touched: (day: string) => `touched ${day}`,
    remindMe: "Remind me about this idea",
    /** The line under the switch, around its link to the setting. */
    remindHelp: {
      before: "Off until you turn it on. How often is your choice under",
      link: "Settings → Figure reminders",
      after:
        "; the reminder shows here, and on this idea's map, when a period has ended that your figures don't cover.",
    },
    remindFailed: "Couldn't save that — the switch is back where it was.",
    expenses: {
      heading: "Expense records",
      line: "Single business expenses you keep for this idea, typed and agreed to one list at a time.",
      link: "Expense records for this idea →",
    },
    links: {
      heading: "Cross-references",
      none: "None yet.",
      /** The button that removes a cross-reference (lib/privacy/inventory.ts quotes it for VentureLink). */
      remove: "remove",
      chooseIdea: "Choose an idea…",
      why: "why (optional)",
      add: "+ Link",
    },
    /** What the person said when they started the idea: the sentence's day follows, then the goal chips. */
    firstWords: {
      inYourWords: "In your words,",
      goals: "Goals marked on the intake:",
    },
  },

  /** "Your figures" on an idea's card (components/ventures/figures-panel.tsx). */
  figures: {
    couldNotLoad: "Could not load your figures.",
    heading: "Your figures",
    intro:
      "Totals you've agreed to — never your individual transactions. Where they settle a rule, cards use them instead of your estimates.",
    /** "<n> figure(s) waiting for you to agree". */
    figureWord: (n: number) => (n === 1 ? "figure" : "figures"),
    waiting: "waiting for you to agree",
    review: "Review",
    none: "No figures yet.",
    /** Before the figure's source: a file's name, "typed by you", an agent. */
    from: "from",
    sourceRows: (n: number) => ` · ${n} ${rows(n)}`,
    editedByYou: "edited by you",
    retract: "Retract",
    retractQuestion: "Retract this figure? Cards go back to your estimate.",
    keep: "Keep",
    retracted: "Retracted",
    /** Before the day it was taken back. */
    retractedOn: "retracted",
    addFigure: "Add a figure",
    addFromFile: "Add from a file",
    addFromReturn: "Add from last year's return",
    /** The form for typing one figure. */
    form: {
      pickBothDates: "Pick both dates.",
      endBeforeStart: "The end date can't be before the start date.",
      taxYearHelp: "Write the tax year as four digits, like 2025.",
      /**
       * The source a typed figure is kept under, shown later as where it came from. It is saved with the record, so changing these words changes what new records keep, not the ones already kept.
       */
      typedByYou: "typed by you",
      what: "What",
      taxYear: "Tax year",
      from: "From",
      to: "To",
      amount: "Amount",
      /** Under the tax year box until four digits are typed: the line a T2125 total goes on depends on the year. */
      taxYearHint:
        "The tax year this total is for. The CRA line it goes on can change from one year's form to the next.",
      askedToAgree: "You'll be asked to agree before it counts.",
    },
  },

  /** The agree prompt (components/ventures/agree-prompt.tsx): the only place a proposed figure becomes one the person agreed to. */
  agree: {
    amountHelp: "Write it like 12,500 or 12500.50.",
    /** The line above the buttons, every time the prompt opens. */
    checkFirst: "Double-check what DotAmi did, and how, before you agree.",
    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    /** A period: one calendar month, one calendar quarter, or the two days as given. */
    period: {
      month: (month: string, year: number) => `${month} ${year}`,
      quarter: (first: string, last: string, year: number) => `${first} to ${last} ${year}`,
      days: (start: string, end: string) => `${start} to ${end}`,
    },
    /** The app couldn't be reached at all. */
    noApp: "Could not reach the app. Nothing was changed.",
    title: "Agree to these figures?",
    intro: "Nothing counts until you agree. Check each one against where it came from.",
    nothingLeft: "Nothing left to review.",
    /** A group of figures, by where they came from. */
    from: (label: string) => `From ${label}`,
    rowsInGroup: (n: number) => ` · ${n} rows`,
    /** The hidden label of a row's amount box; the period follows. */
    amountFor: "Amount for",
    discard: "Discard",
    /** "Scroll through all <n> to agree", while a long list hasn't been scrolled to its end. */
    scroll: { before: "Scroll through all", after: "to agree" },
    doItMyself: "No, I'll do it myself",
    agree: "Agree",
  },

  /** The reminder banners on an idea (components/ventures/figure-reminder-banners.tsx). */
  reminders: {
    /** Said to a screen reader after "Not this time" hides a banner. */
    hidden: (cadence: string) => `Hidden until the next ${cadence} period has ended.`,
    region: (cadence: string, period: string) => `Figure reminder, ${cadence}: ${period}`,
    addFigures: "Add figures",
    notThisTime: "Not this time",
    saveFailed: "Couldn't save that — the reminder is back where it was.",
  },

  /** "Add from a file" (components/ventures/file-drop.tsx). */
  fileDrop: {
    region: "Add from a file",
    whereFrom: "Where is this file from?",
    accounting: "Accounting software or a spreadsheet you keep",
    bank: "A bank or credit card account",
    whereFromHint:
      "Accounting software means QuickBooks, Xero, Wave, FreshBooks, GnuCash or similar; a spreadsheet you keep is one in Excel. Nothing is opened until you answer.",
    bankNotice: {
      cantYet: "DotAmi can't add bank or card statements yet.",
      whenItCan:
        "When it can, you'll pick which deposits are business revenue, after a warning about what DotAmi would keep. Nothing from your file was opened or kept.",
      back: "Back",
    },
    readFailed: "DotAmi couldn't read that file. Nothing was kept.",
    /** Before the answer the person gave to "Where is this file from?". */
    from: "From:",
    change: "Change",
    dropRegion: "Drop a spreadsheet here",
    dropLine: "Drop a .xlsx or .csv file, or a GnuCash book, here, or",
    chooseFile: "Choose a file",
    readHere:
      "It's read here, on this computer, and never kept — only the monthly totals you agree to are saved.",
    /**
     * After "Reading <file>…" while a GnuCash book is read. "A big one can take a little while." followed until
     * 2026-10-24: a time in DotAmi's own words.
     */
    bookInBackground: "A GnuCash book is read in the background, so this window stays usable.",
    /** The source label of a file with no name. It is saved with the record, so changing these words changes what new records keep, not the ones already kept. */
    aFile: "a file",
    /** Shown for every file: DotAmi was only ever tried on invented files laid out from each program's help pages. */
    testedOn:
      "Each accounting program's export was tested on files shaped from that program's help pages, not on real exports, so check the columns and totals.",
    sheet: "Sheet",
    layout: {
      label: "The file has",
      rows: "One row per sale, with a date",
      across: "Months across the top, one column per month",
    },
    noColumnNames: "DotAmi couldn't find a row of column names in the first 30 rows.",
    guessedColumns: "DotAmi guessed these from the column names — check them.",
    noMonthNames: "DotAmi couldn't find a row of month names in the first 30 rows.",
    guessedMonthsRow: "DotAmi guessed the row of month names — check it.",
    monthNamesRow: "Month names are in row",
    pickRow: "Pick a row",
    /** "Row <n>" in the row pickers. */
    row: "Row",
    totalsFrom: "Totals come from",
    everyRow: "Every row, added down each month",
    rowOnly: (n: number, label: string) => `Row ${n} only${label ? ` · ${label}` : ""}`,
    everyRowHint:
      "Every row leaves out the file's own totals rows. Pick one row to take only its figures, such as the file's Total row.",
    readAsMonths: "Read as months",
    notMonths: "Not months, so not added:",
    columnNamesRow: "Column names are in row",
    dateColumn: "Date column",
    pickColumn: "Pick a column",
    amountColumn: "Amount column (revenue)",
    taxHint: "If the file also has a tax column, check whether this one includes the tax.",
    refundColumn: "Refunds / money out column (optional)",
    noRefunds: "None — refunds not taken off",
    refundHint:
      "Ledger exports, such as Wave's Account Transactions, keep sales in one column (Credit) and refunds paid back to customers in another (Debit). Pick the refunds column and each amount in it is taken off the month it was paid back. Choose None to leave refunds out.",
    typeColumn: "Type column (optional)",
    countEveryRow: "None — count every row",
    typeHint:
      "Some files list a sale and the payment received for it as two rows. With a type column, rows typed Payment or Deposit are left out so the sale isn't counted twice. That also leaves out a Deposit that is the only record of a sale, so check the left-out list. Choose None to count every row.",
    statusColumn: "Status column (optional)",
    statusHint:
      "Invoice lists can include void, deleted and draft invoices, which were never sales. With a status column, rows marked Void, Voided, Deleted or Draft are left out and listed. Choose None to count every row.",
    conflictingDates:
      "Some dates in this column only make sense month first and others only day first — check the column.",
    datesWritten: "Dates are written",
    pickOne: "Pick one",
    onlyClearDates: "Only read dates that are clear",
    monthFirst: "Month first — 03/01/2026 is March 1",
    dayFirst: "Day first — 03/01/2026 is 3 January",
    /** Asked once per file when a date has a two-digit year (12-03-05): DotAmi never picks the century itself. */
    century: {
      question: (yy: string) => `Is ${yy} the year 20${yy}?`,
      yes: (yy: string) => `Yes — ${yy} is 20${yy}`,
      no: (yy: string) => `No — ${yy} is 19${yy}`,
      hint: "This file writes years with two digits. Your answer is used for every date written that way in this column, for this file only.",
    },
    amountsWritten: "Amounts are written",
    /** The tick-box the person confirms the dates (or, across the top, the months) with before Review. */
    datesRight: "These dates are right",
    monthsRight: "These months are right",
    nothingNew: "Nothing new to propose from this file.",
    /** The refund rule's one surprise, said where the totals are. */
    refundsNote:
      "Refunds are taken off the month they were paid back, which may be a later month than the sale they refund.",
    /** "This file has more than <500> months of totals, …" */
    tooMany: {
      before: "This file has more than",
      after:
        "months of totals, more than DotAmi proposes at once. Remove the oldest rows and drop it again.",
    },
    tickOnceTheyMatch: (box: string) => `Tick "${box}" once they match the file.`,
    askedToAgree: "You'll be asked to agree before anything counts.",
    /** Beside a month's total: what its refunds took off, e.g. "1 refund taken off ($40.00)". */
    refundsTakenOff: (n: number, amount: string) =>
      `${n} ${n === 1 ? "refund" : "refunds"} taken off (${amount})`,
    /** The words for the first few row numbers, cell names or month columns: "row 7", "cells C3, C4". */
    places: {
      row: "row",
      rows: "rows",
      cell: "cell",
      cells: "cells",
      column: "column",
      columns: "columns",
    },
    /** Rows the totals leave out, one line per reason, e.g. "2 rows without a date DotAmi can read". */
    leftOut: {
      blank: (n: number) => `${n} blank ${rows(n)}`,
      total: (n: number) =>
        `${n} ${rows(n)} that ${n === 1 ? "is a totals row" : "are totals rows"} (the file's own sum)`,
      noDate: (n: number) => `${n} ${rows(n)} without a date DotAmi can read`,
      noAmount: (n: number) => `${n} ${rows(n)} with a date but no amount`,
      badAmount: (n: number) => `${n} ${rows(n)} with an amount DotAmi can't read`,
      unsavedFormula: (n: number) => `${n} ${rows(n)} with ${UNSAVED_FORMULA_ADVICE}`,
      /**
       * DotAmi can't tell whether these rows are money for a sale listed elsewhere (QuickBooks) or the person's own
       * sales (their own sheet, or a deposit straight to an income account), so the line says what was done and
       * how to undo it rather than claiming a sale was counted.
       */
      payment: (n: number) =>
        n === 1
          ? "1 row typed Payment or Deposit, left out because a Type column is chosen (in QuickBooks that is money received for a sale listed on another row; if it is a sale of yours, choose None)"
          : `${n} rows typed Payment or Deposit, left out because a Type column is chosen (in QuickBooks those are money received for sales listed on other rows; if they are sales of yours, choose None)`,
      /** Said the same careful way as the payment line: what was done, why, and how to undo it. */
      voidOrDraft: (n: number) =>
        n === 1
          ? "1 row marked void, deleted or draft, left out because a Status column is chosen (if it is a sale of yours, choose None)"
          : `${n} rows marked void, deleted or draft, left out because a Status column is chosen (if they are sales of yours, choose None)`,
      /** A calendar month not ended yet. */
      notOver: (n: number) => `${n} ${rows(n)} in a month that isn't over yet`,
    },
    /**
     * The left-out lines for a months-across table, where what is left out can be a single cell under a month,
     * a whole row or a month column that isn't over yet. "Under a month" is the month column a cell sits in.
     */
    across: {
      badCells: (n: number, places: string) =>
        `${n} ${cells(n)} under a month with an amount DotAmi can't read: ${places}`,
      unsavedCells: (n: number, places: string) =>
        `${n} ${cells(n)} under a month holding ${UNSAVED_FORMULA_ADVICE}: ${places}`,
      emptyCells: (n: number, places: string) => `${n} empty ${cells(n)} under a month: ${places}`,
      nothingUnderAnyMonth: (n: number, places: string) =>
        `${n} ${rows(n)} with nothing under any month: ${places}`,
      notOverMonths: (n: number, places: string) =>
        `${n} ${n === 1 ? "month that isn't over yet" : "months that aren't over yet"}: ${places}`,
    },
  },

  /** A GnuCash book's accounts and totals (components/ventures/books-drop.tsx). */
  books: {
    /** The source label of a book with no file name. It is saved with the record, so changing these words changes what new records keep, not the ones already kept. */
    aGnuCashBook: "a GnuCash book",
    /** GnuCash writes the book to disk only when the person saves; the file is what was saved. */
    lastSave:
      "DotAmi read your last save. Anything changed in GnuCash after that save isn't in it.",
    testedOn:
      "DotAmi's GnuCash reader was tested on invented books written to GnuCash's file format, not on real ones, so check the accounts and totals.",
    accounts: "Accounts in this book",
    accountsHint:
      "Accounts GnuCash marks as income start ticked. An income account can also hold interest, or GST/HST you collected, which isn't revenue from sales. Tick or untick any account; only the ticked ones are added up.",
    /** Before the reason an account can't be ticked. */
    cantBeTicked: "— can't be ticked:",
    tickOne: "Tick at least one account to see its monthly totals.",
    lineWord: lines,
    nothingNew: "Nothing new to propose from this book.",
    /** "The book's scheduled transactions (<n> lines) are plans …" */
    scheduled: {
      before: "The book's scheduled transactions (",
      after: ") are plans GnuCash hasn't posted, so they are never counted.",
    },
    /** "This book has more than <500> months of totals, …" */
    tooMany: {
      before: "This book has more than",
      after:
        "months of totals, more than DotAmi proposes at once. Untick some accounts to propose fewer at a time.",
    },
  },

  /** "Add from last year's return" (components/ventures/return-drop.tsx). */
  returnDrop: {
    region: "Add from last year's return",
    dropRegion: "Drop a return PDF here",
    dropLine: "Drop the PDF of last year's return that your tax software saved, or",
    choosePdf: "Choose a PDF",
    /** After the hint naming the T2125 lines. */
    readHere: "It's read here, on this computer, and never kept. Nothing is added to your figures.",
    pageWord: (n: number) => (n === 1 ? "page" : "pages"),
    copies: (n: number) => (n === 1 ? "1 T2125" : `${n} T2125s`),
    /** Where a T2125 is in the PDF. */
    pages: {
      one: (page: number) => `page ${page}`,
      range: (first: number, last: number) => `pages ${first} to ${last}`,
    },
    caption: {
      one: (pages: string) => `T2125 on ${pages}`,
      of: (n: number, count: number, pages: string) => `T2125 ${n} of ${count}, on ${pages}`,
    },
    columns: { line: "Line", onTheForm: "On the form", page: "Page", amount: "Amount as printed" },
    notFound: "not found in this T2125",
    nothingBeside: "nothing DotAmi can read beside it",
    checkThese:
      "Check these against your return. DotAmi only shows them: nothing is added to your figures or kept, and Close forgets the file.",
  },
} as const;
