/**
 * Everything DotAmi keeps about the person, and where — as data. The /your-data page
 * ("What DotAmi knows about you") is drawn from this list, the way /settings is drawn from
 * lib/settings/catalog.ts.
 *
 * The point of the list is to make going stale loud. tests/privacy-inventory.spec.ts fails
 * when prisma/schema.prisma gains a model, or any code under app/, components/ or lib/ starts
 * using a browser-storage key that isn't listed here. It fails when a package that ships with the
 * app isn't in DEPENDENCIES with whether it can reach the network: a package in package.json
 * "dependencies", one that desktop/package.mjs copies in, or one imported by a file under app/,
 * components/ or lib/ (or by middleware.* or instrumentation*.* in the top folder), which Next
 * bundles even when package.json calls it a devDependency. (Only the packages DotAmi names itself:
 * the ones those pull in are not listed.) It fails when a file imports a package that package.json
 * doesn't declare. And it fails when a source file makes a request of the kinds named below and
 * the request isn't listed here. So a new store (the Lens's conversation, a remembered file
 * layout), a new request out or a new dependency has to say what it holds, sends
 * or can reach, and how it is removed, before it can merge — and the page then shows it without
 * anyone remembering to.
 *
 * WHAT THE NETWORK CHECK CATCHES. It reads the syntax tree of every .ts, .tsx, .mts, .cts, .js,
 * .jsx, .mjs and .cjs file under app/, components/, lib/ and desktop/ and every such file in the
 * repo's top folder (middleware.ts, next.config.mjs, instrumentation.ts and the rest), and
 * refuses, unless that one call is listed here: fetch, fetchLater, sendBeacon, XMLHttpRequest,
 * WebSocket, EventSource, WebTransport and WebSocketStream whose address isn't one literal "/…"
 * path on DotAmi's own server; any helper named as a `wrapper` below, however it is imported,
 * renamed, re-exported or reached through a namespace; RTCPeerConnection (WebRTC) always; those
 * functions handed on or looked up by a string or a computed key; node's http, https, http2, tls,
 * dgram and dns (any import) and each call into node's net and child_process, one by one;
 * electron's `net` and `autoUpdater`, every loadURL, loadFile and downloadURL, session.fetch,
 * session.preconnect and session.resolveHost, and crashReporter.start (it uploads crash dumps to an
 * address); and any import of a package named in the scan's own fixed list of HTTP-client, update
 * and analytics packages (NETWORK_PACKAGE in tests/helpers/source-scan.ts) or marked "yes" or
 * "unverified" in DEPENDENCIES below, matched by package name so a subpath counts. A package on
 * neither list is not refused for being imported: DEPENDENCIES is where a new one that ships has to
 * say whether it reaches the network, and "no" there is only what its README and files showed.
 *
 * WHAT IT DOES NOT CATCH. A request a package makes inside its own code (Next.js, Prisma, React,
 * electron-updater and the packages they pull in: the check sees the import, never what happens
 * after it). Deliberate disguises: a copy of `window` under another name, code run from a string
 * (the global eval, the Function constructor, electron's webContents.executeJavaScript), workers,
 * node internals. An XMLHttpRequest made by a helper in one file and opened in another (the
 * `.open` is read only in a file that spells XMLHttpRequest itself). Anything that makes the page load an address
 * instead of calling a function (an image, a script tag, a link, a form, window.open, location,
 * shell.openExternal). Next.js settings that make the server fetch for a page (`rewrites`,
 * NextResponse.rewrite). Files that aren't TypeScript or JavaScript (HTML, CSS). The folders
 * outside those above (scripts/, prisma/, tests/, e2e/, e2e-desktop/: UNSCANNED_FOLDERS lists each
 * with its reason, and the check fails on a new top-level folder of source, or on a file that
 * imports code from one, until it is scanned or listed). What a program the app starts then does
 * (the statute store's script), and other ways electron starts a program (utilityProcess). The
 * full list, each item pinned by a test, is in the header of tests/helpers/source-scan.ts.
 *
 * WHAT ELSE STANDS BEHIND IT. (1) GitHub's Dependency review check on a pull request: it fails a
 * change that adds a package with a known high or critical vulnerability or a licence the project
 * can't ship; it does not look at what a package does on the network, and the CI job runs only
 * while the repository variable DEPENDENCY_REVIEW is "on" (.github/workflows/ci.yml). (2) In the
 * browser, the Content-Security-Policy middleware.ts sets on every page: `connect-src 'self'` stops
 * fetch, fetchLater, XMLHttpRequest, sendBeacon, WebSocket, EventSource and a link's ping reaching
 * another address; `img-src 'self' blob: data:` stops images from elsewhere; `default-src 'self'`
 * covers frames and media; `form-action 'self'` stops a form posting elsewhere. It does NOT stop
 * WebRTC (connect-src doesn't govern it and the policy has no `webrtc` directive), is not known to
 * stop WebTransport or WebSocketStream, doesn't stop navigation, can't stop a script that a
 * running script adds (`script-src` carries 'strict-dynamic'), and covers only the pages
 * middleware.ts serves, not the API routes, the server, or the desktop app's main process.
 * (3) Code review, which is all there is for whatever WHAT IT DOES NOT CATCH lists and the
 * browser policy does not stop.
 *
 * Every string below is read by a person, so it is plain English: no table names in the
 * sentences, no story codes. `model` and `key` are the exact technical names the test matches.
 */

/** One database table: a `model` in prisma/schema.prisma. */
export interface TableEntry {
  /** The model's name in prisma/schema.prisma, exactly. */
  model: string;
  /** What the page calls it. */
  name: string;
  /** What is in it, in words. */
  holds: string;
  /** What takes a row out today — including "nothing", said plainly. */
  removedBy: string;
  /**
   * Set when the table can hold something about other people, not only about the person (2026-10-17): the
   * list is "everything DotAmi keeps about the person", and a business the person watches can be one person
   * trading under their own name. The page shows it under the entry.
   */
  aboutOthers?: string;
  /**
   * Answers kept in the table that a spec names on lines of their own (2026-10-22: Where you are's area and
   * region, docs/ui-spec/futures/02-where-you-are.md), each with what it holds in words and the exact columns
   * it covers (the test checks the columns are real). The page shows each under the entry, as its name and
   * the sentence.
   */
  lines?: readonly { name: string; holds: string; columns: readonly string[] }[];
}

/**
 * One browser-storage key. The page can't read these (they live in the window, not in the data
 * file), so it lists what DotAmi writes there and how long it stays.
 */
export interface WindowStorageEntry {
  store: "localStorage" | "sessionStorage";
  /** The key string exactly as the code writes it. */
  key: string;
  name: string;
  holds: string;
  lasts: string;
}

/** A file or folder beside the database that DotAmi writes. */
export interface FolderEntry {
  id:
    | "backups"
    | "log"
    | "wipe-pending"
    | "receipts"
    | "receipts-key"
    | "database-key"
    | "database-encrypting"
    | "database-encrypting-copy"
    | "database-plain-to-wipe"
    | "database-decrypting"
    | "database-decrypting-copy"
    | "database-encrypted-to-wipe"
    | "database-turned-off"
    | "updater-id";
  /**
   * Path relative to the folder holding the data file. The wipe-pending note and the two files of an
   * encryption under way are named after the data file itself, so this shows the desktop app's name for
   * them (lib/privacy/holdings.ts finds them beside whichever data file this copy uses).
   */
  relativePath: string;
  name: string;
  holds: string;
  /** A piece of text that must appear in the code that writes it (a guard against a rename). */
  writtenBy: { file: string; mentions: string };
  /** True when only the desktop app writes it; a copy run from source then has none of its own. */
  desktopOnly: boolean;
  /** What the page says when it isn't there. Without one: "None yet", or, for a desktop-only entry in a copy run from source, that only the desktop app makes it. */
  whenAbsent?: string;
}

/**
 * A place in the code that can reach the network, and why it is allowed. For developers: the page
 * never shows these. tests/privacy-inventory.spec.ts reads every .ts, .tsx, .mts, .cts, .js, .jsx, .mjs and
 * .cjs file under app/, components/, lib/ and desktop/ and in the repo's top folder, and fails on
 * each of the kinds of request the header of this file lists (and the ones tests/helpers/source-scan.ts
 * adds) that isn't listed — on the entry it belongs to, or in LOCAL_REQUESTS, LIBRARY_IMPORTS,
 * STARTS_PROGRAMS or BUILD_TIME_ONLY. Each line covers ONE call: a second call, or one with
 * another address or program, needs a line of its own. It also fails on a listed call that has
 * gone, so the list can't outlive the code. A line says the scan SAW this call and a person judged
 * it fine; it says nothing about code the scan can't see (the header of this file, and of
 * tests/helpers/source-scan.ts, name what that is).
 */
export interface AllowedCall {
  /** The file, relative to the repo. */
  file: string;
  /**
   * The call as the scan writes it (networkCalls in tests/helpers/source-scan.ts): the call and the
   * start of its first argument, such as `fetch(url`, `loadURL(origin`, `net.createServer(`,
   * `child_process.spawn("python"`, or `package "electron-updater"` for an import.
   */
  call: string;
  /** Why this call is fine, for the next developer. */
  why: string;
  /**
   * Set when `call` is a fetch inside a helper that other code calls with the address: the scan then
   * reads every call of that helper as if it were a fetch, however it is imported, renamed, re-exported
   * or reached through a namespace, so the address can't hide behind it.
   */
  wrapper?: string;
}

/**
 * One package that ships with the app: everything in package.json "dependencies", plus what
 * desktop/package.mjs copies into the installed app (electron-updater), plus any package imported by
 * a file under app/, components/ or lib/ (or middleware.* / instrumentation*.* in the top folder),
 * even one package.json lists only under devDependencies, because Next bundles it. For developers:
 * the page never shows these. tests/privacy-inventory.spec.ts fails until each is listed, and fails
 * on one listed that no longer ships. Only the packages DotAmi names itself are here: the packages
 * those pull in are not, which is why this list is a record of what was checked and not a guarantee
 * about the whole tree.
 */
export interface DependencyEntry {
  /** The package's name in package.json, exactly. */
  name: string;
  /**
   * Whether code inside the package can reach the network, found from the package's own README and files.
   * "yes": it has code that makes requests, on its own or when asked. "no": none was found. "unverified": we
   * couldn't tell. Importing a package marked "yes" or "unverified" is refused by the scan until a line in
   * this file (SENT_ELSEWHERE or LIBRARY_IMPORTS) names the importing file and says why that is fine.
   * "no" is only what the README and a search of the files showed: it is not a promise.
   */
  network: "yes" | "no" | "unverified";
  /** What was found and where it was read, when it applies to DotAmi, and what DotAmi does about it. */
  why: string;
}

/** One way something can leave this computer. */
export interface SentElsewhereEntry {
  id: "intake-sentence" | "update-check" | "files-you-save";
  name: string;
  /** When it happens at all. */
  when: string;
  what: string;
  /** Whether DotAmi can take it back afterwards. */
  canTakeBack: string;
  /** The code that does it (none when nothing is requested over the network). Not shown on the page. */
  calls: readonly AllowedCall[];
  /**
   * Headers a package adds to these requests inside its own code, by their exact names, with where in
   * the package each was read. The network scan can't see them (it sees the import only), so
   * tests/privacy-inventory.spec.ts reads electron-updater's own source and fails on a header it sets
   * that isn't named here. For developers: the page says what they carry in `what`, in words.
   */
  headers?: readonly { name: string; source: string }[];
}

/**
 * The database tables. Each `removedBy` says what is true of the app today, not what is planned:
 * when a story builds a way to remove something, it changes the sentence here in the same commit.
 */
export const TABLES: readonly TableEntry[] = [
  {
    model: "User",
    name: "Placeholder account",
    holds:
      "One record that owns your ideas and statements, so DotAmi can tell whose they are. There is no sign-in; the name and address on it are placeholders DotAmi makes up, not yours. A copy you host yourself can set its own address (STUB_USER_EMAIL); either way it is only a label DotAmi uses to find this one record.",
    removedBy:
      "Nothing in the app removes it; Delete leaves it, because it holds nothing of yours. Deleting the data file removes it along with everything else.",
  },
  {
    model: "PersonStatement",
    name: "Your statements",
    holds:
      "Things you told DotAmi about yourself, word for word, each with the day you say you said it, and the sentence you typed on the front door for each idea, word for word, with the day you typed it and the idea it was for. Your answers to “where do you want to be” (the first question on Your destination, since 2026-10-12) are kept here too, marked as such; the newest is the one the cockpit shows on top of a future that has no sentence of its own. They are never summarised or used to rank anything.",
    removedBy:
      "Delete, at the bottom of this page, with “Your statements” ticked: all of them at once, wiped from the file. Nothing removes one by itself, by design: a newer statement beats an older one by its date, and old ones are never edited away. Deleting your ideas keeps the sentences typed for them here, tied to no idea.",
  },
  {
    model: "Venture",
    name: "Your ideas",
    holds:
      "Each business idea you saved: its name, province, your first- and third-year revenue estimates, your employment status, the tags and goals marked on the intake, how far along it is, and your notes on it. Since 2026-10-11 it can also hold the road it is drawn on, the ending you picked at each fork of that road and your own month and year to get there, each with the moment you set it; the cockpit sets your month (since 2026-10-12), Pick a future sets the road (since 2026-10-12), and the cockpit's “This is mine”, under “Compare the two endings”, sets the ending at a fork of any road but the general one (since 2026-10-12; the general road's endings are kept with its map). A future picked on Pick a future also keeps your answer to “a business of your own, a job or career, or both?” with the moment it was kept, and its employment status as “not said”, since that way in doesn't ask it; so are its kind of venture, whether you're buying equipment and its revenue estimates, listed by name as not said, so nothing shows the starting values in their place as yours. Each comes off that list once you give it in the cockpit: equipment in its question box, the first-year estimate with Keep on the what-if, and the third-year estimate in its question box or on the Incorporating step (since 2026-10-21). Since 2026-10-12 the province is written in the file as its international code (CA-AB for Alberta), and an idea can hold the job you picked as closest to your work (a government job code) and the day. Asked on Pick a future and at the end of the intake (since 2026-10-22), and changed from the cockpit's skills list. The words you typed to find it aren't kept. Since 2026-10-22 an idea in Alberta can also hold your area and your economic region, on their own lines below: each asked once, right after the job pick, and never worked out from anything else.",
    lines: [
      {
        name: "Your area",
        holds:
          "The area you picked (one of Alberta's four census metropolitan areas, somewhere else in Alberta, or I don't know) and the day. Kept with the idea on this computer; shown on Your plan; deleted with it. Nothing reads it in this version.",
        columns: ["landscapeArea", "landscapeAreaSetAt"],
      },
      {
        name: "Your economic region",
        holds:
          "The economic region you picked, or I don't know, and the day. Kept with the idea on this computer; shown on Your plan; deleted with it. Nothing reads it in this version.",
        columns: ["economicRegion", "economicRegionSetAt"],
      },
    ],
    removedBy:
      "Delete, at the bottom of this page, with “Your ideas” ticked: every idea at once, with its notes, links, map progress and figures, wiped from the file. Expense records attached to an idea stay, as “not attached yet”, unless “Your expense records” is ticked too. Nothing deletes a single idea yet.",
  },
  {
    model: "VentureLink",
    name: "Links between ideas",
    holds: "Which of your ideas relate to which, the kind of link, and your reason for it in your own words.",
    removedBy:
      "The “remove” button beside a link, under Cross-references on an idea's card on the Ideas page. Deleting your ideas (Delete, at the bottom of this page) deletes every link with them.",
  },
  {
    model: "ScenarioState",
    name: "Map progress",
    holds:
      "Which branches you took on each idea's map and which of them you picked yourself, your own “I'd incorporate at” amount if you typed one, your No to buying equipment, a vehicle or tools if you gave one, and the steps the map works out from them as active, done or set aside (worked out again on every load; your own status on a step is under “Your progress on each step”).",
    removedBy: "Saving the map again overwrites it. Deleting your ideas (Delete, at the bottom of this page) deletes it with them.",
  },
  {
    model: "StepProgress",
    name: "Your progress on each step",
    holds:
      "For each idea, the steps on its road you marked doing, done or not for me (on every road, today's Alberta road included, since 2026-10-12), the “done when” lines you ticked on each, and when you changed each step's status (the newest 100 changes per step). Set from the cockpit's step panel. It is never used to rank anything.",
    removedBy:
      "Pressing a step's status that is on takes it back, and unticking a line removes the tick, in the cockpit's step panel; the list of changes stays. Deleting your ideas (Delete, at the bottom of this page) deletes it with them.",
  },
  {
    model: "Setting",
    name: "Your settings",
    holds:
      "The choices you made on the Settings page and the Ideas page: how often you asked to be reminded about your figures, which of your ideas have their reminder switch on, and which reminder banners you answered \"Not this time\" (each as an idea number DotAmi made up, a how-often word and the last day of the month, quarter or year, not names). Only the choices; never an amount or any of your words.",
    removedBy:
      "Changing the choice on the page (unticking a box, turning a switch off) overwrites it, and a \"Not this time\" answer is dropped from the file the next time one is saved after its period is no longer the latest; the row itself stays in the data file. Delete, at the bottom of this page, with “Your settings” ticked, deletes every one.",
  },
  {
    model: "Figure",
    name: "Your figures",
    holds:
      "Totals about your business that you typed, read from a file or from your GnuCash book, or an agent proposed: the amount, the period, the currency, where it came from, and the days it was proposed, agreed to and taken back. For a tax-form total (such as business net income from a T2125), also the tax year it is for and, when it was read from a return, the form and line printed there. Since 2026-10-11 it can also hold two of your own planning numbers for an idea, each one day's amount: the savings you'd put toward starting it, and your number for a start-up cost on its road, with the cost it is for and where the amount came from (a quote, a link, a receipt or your guess); the cockpit adds those through the agree prompt (since 2026-10-12). Never the file or the book itself, and never which accounts you ticked. A single purchase is not a figure: if you agree to keep one, it is an expense record.",
    removedBy:
      "Retract (an agreed figure) or Discard (a waiting one) stops a figure counting, but the row, its amount included, stays in the data file and on this page. Delete, at the bottom of this page, erases every figure from the file (tick “Your figures”, or “Your ideas”, which takes their figures with them). Nothing erases a single figure yet.",
  },
  {
    model: "SkillMark",
    name: "Your skill marks",
    holds:
      "Your own mark on each skill or requirement a road lists (have, learning or not yet), on the skills and knowledge on the government's list for the job you picked (since 2026-10-12), and on skills you added in your own words, with the day you set each. Kept once for you, not for one idea, so a mark carries across every road and every job that lists the skill. Only you set a mark, in the cockpit's step panel or its skills list; DotAmi never guesses one, and “I don't know” keeps no mark at all.",
    removedBy:
      "“I don't know” on a skill in the cockpit removes its mark. Delete, at the bottom of this page, with “Your skill marks” ticked: every mark at once, wiped from the file. Deleting your ideas leaves them, because they are yours, not an idea's.",
  },
  {
    model: "PersonFigure",
    name: "The yearly income you want",
    holds:
      "The yearly income you said you want, before tax, kept once for you rather than for one idea: the amount and currency, whether it is waiting, agreed, taken back or turned down, where it came from (typed by you) and the days. Agreeing to a new one takes back the one before, which stays here. DotAmi never judges it as enough or not enough. Your destination asks for it (since 2026-10-12): it counts only once you agree to it there.",
    removedBy:
      "Delete, at the bottom of this page, with “The yearly income you said you want” ticked: every one, in every state, wiped from the file. Deleting your ideas leaves it.",
  },
  {
    model: "Expense",
    name: "Your expense records",
    holds:
      "Single business expenses that you typed or an agent proposed, whether waiting, agreed to, taken back or turned down: the day, the amount and currency, who it was paid to and what for, the idea it is attached to (or none yet), a category only if one was given, your own business share if you gave one, the GST/HST part if you gave it, the seller's address and GST/HST number if you gave them, and where it came from, with the days it was proposed, agreed to and taken back. A refund or credit is kept the way you chose: a negative amount, or a refund record linked to the purchase, with its credit note if you gave one. Never a bank or card number. A receipt file you add is not in this table: it is the next entry. These are individual transactions, kept as your own record; DotAmi never marks one as deductible, sets a business share or chooses a category. Records you type on the Expenses page stay in that window until you agree; only then are they written here.",
    removedBy:
      "Take back (an agreed record) and Turn down (a waiting one) on the Expenses page stop it counting, but the row, with its amount and words, stays in the data file and is counted here. Delete, at the bottom of this page, erases every record from the file (tick “Your expense records”), with its receipt. Deleting your ideas does not: their records stay, as “not attached yet”, with their receipts. Nothing in the app erases a single record yet.",
  },
  {
    model: "Receipt",
    name: "Your receipts",
    holds:
      "For each receipt you added to an expense record: which record it belongs to, the kind of file DotAmi found it to be (a JPEG, PNG, WebP or HEIC picture, or a PDF, read from the file itself), its size, a fingerprint of its bytes (SHA-256) so DotAmi can tell if the file changes, and the day you added it. Not the file's name, and not the picture or PDF itself: that is a copy in the receipts folder beside the data file (listed under “On this computer, outside the data file”). A program on this computer that lists your expense records (an agent, for one) sees whether a record has a receipt, its kind, its size and the day it was added; never the file itself, its fingerprint or where it is.",
    removedBy:
      "“Remove receipt” on a record on the Expenses page removes that one, file included; the record stays. Delete, at the bottom of this page, with “Your receipts” ticked removes every one and its file, keeping the records; with “Your expense records” ticked, the records go and their receipts with them.",
  },
  {
    model: "SourceAccount",
    name: "Your bank and card accounts",
    holds:
      "The bank and card accounts you allowed DotAmi to read statements from, each under the name you gave it (like “Business chequing” or “Visa ending 1234”), which button you pressed on the warning (allow once, always allow this account, or always allow every account), and the days you agreed and took it back. Never an account or card number, a bank or transit number, a file name, or a scrambled copy of any of them: a name with four or more digits in a row is refused (spaces, dashes, commas or other marks between them don't help), apart from “ending” and four digits at the end. Nothing adds one yet: the statement screen that asks is the next step.",
    removedBy:
      "“Take back” beside the account in Settings stops it being used, but the row (its name and days) stays in the data file. Delete, at the bottom of this page, with “Your bank and card accounts” ticked, erases every one from the file. Figures read from an account's statements are not deleted with it.",
  },
  {
    model: "WatchedBusiness",
    name: "Businesses you're watching",
    holds:
      "For each idea, the businesses you added under “Others in this line of work” in the cockpit (since 2026-10-17): the name as you typed it, a link if you gave one, your note, and the links to ads you saw, each with the day you said you saw it, in the order you added them. Links are kept only when they start with http:// or https://. DotAmi doesn't check any of it, no rule reads it, it is never counted against anything, and it isn't in your plan. Leaves the computer: no. DotAmi opens none of the links itself; your browser opens one only when you click it.",
    removedBy:
      "“Remove” beside a business in the cockpit's “Others in this line of work” deletes that one from the file. Each list is deleted with the idea: Deleting your ideas (Delete, at the bottom of this page) takes every list with them, and “Businesses you're watching” on the Delete menu deletes every list and leaves the ideas.",
    aboutOthers:
      "This is about other people's businesses, not about you, and a business can be one person trading under their own name, so a name or a note here can be about its owner. It is what you typed, kept for your own planning on this computer; DotAmi sends it nowhere.",
  },
];

/** The kinds of data on the Delete menu. Ids are permanent: the page and its request name them. */
export type DeleteKindId =
  | "ideas"
  | "figures"
  | "expenses"
  | "receipts"
  | "bank-accounts"
  | "statements"
  | "skill-marks"
  | "income-wanted"
  | "watched-businesses"
  | "settings"
  | "backups"
  | "remembered-columns";

/**
 * Records in another table that point at what a box deletes but are KEPT: the database only clears
 * their link (onDelete: SetNull in prisma/schema.prisma). The menu counts them and, before the
 * person confirms, says how many stay, what they become, where they are kept and how to delete them.
 */
export interface KeptLink {
  /** The table the kept rows are in, and the link column the database clears. */
  model: string;
  field: string;
  /** One row, as a sentence counts it: "expense record". */
  one: string;
  /** What the kept rows become, in the words the rest of the app uses for it. */
  becomes: string;
  /** Where they are kept and how to delete them, said before the person confirms. */
  whereAndHow: string;
}

/** The key a kept link's count travels under, on the page and in the delete request: "Expense.ventureId". */
export { keptLinkKey } from "./kept-links";

/**
 * One tick-box on the "Delete" menu on /your-data. The menu is a list of kinds of data, each
 * saying what else goes with it, because deleting one kind can take another with it (an idea's
 * figures belong to the idea). tests/privacy-delete.spec.ts fails until every table above is on
 * the menu or in KEPT_BY_DELETE, until `alsoDeletes` says exactly what the schema's
 * onDelete: Cascade takes with `tables`, and until `keeps` names every link onDelete: SetNull
 * clears — so a new table, or a new link to an idea, has to say here whether Delete takes it
 * before it can merge. The same test fails when a table in `alsoDeletes` would only be partly
 * emptied (an optional link), because the menu shows whole-table counts for those.
 */
export interface DeleteMenuEntry {
  id: DeleteKindId;
  /** The tick-box's label. */
  label: string;
  /** The tables whose every row this deletes. Empty for a kind DotAmi doesn't keep yet. */
  tables: readonly string[];
  /**
   * Tables the database empties along with `tables` (onDelete: Cascade in prisma/schema.prisma).
   * Every row goes, so the menu counts the whole table.
   */
  alsoDeletes: readonly string[];
  /** Rows elsewhere that stay, with their link to what this deletes cleared (onDelete: SetNull). */
  keeps: readonly KeptLink[];
  /** What else goes with it, in one or two sentences, shown under the tick-box. */
  goesWithIt: string;
  /** The longer explanation behind "Learn more". */
  learnMore: string;
  /** False while DotAmi doesn't keep this kind yet: the box shows switched off and says so. */
  built: boolean;
  /**
   * A folder beside the data file whose files this deletes instead of rows: only "backups", where
   * only DotAmi's own safety copies go (desktop/wipe-pending.mjs says which files those are).
   */
  folder?: "backups";
}

/**
 * The Delete menu, in the order it shows (and the order the tables are emptied in). The maintainer
 * decided on 2026-10-07 that it is one button named "Delete" with a menu of what can be deleted
 * and what else goes with each, and that the statements can be deleted all at once only. On
 * 2026-10-08 he decided that deleting an idea keeps its expense records ("not attached yet"), and
 * that people are told so, and where they are kept, so they can delete them if they want to.
 */
export const DELETE_MENU: readonly DeleteMenuEntry[] = [
  {
    id: "ideas",
    label: "Your ideas, with their notes, links and map progress",
    tables: ["Venture"],
    alsoDeletes: ["VentureLink", "ScenarioState", "StepProgress", "Figure", "WatchedBusiness"],
    keeps: [
      {
        model: "Expense",
        field: "ventureId",
        one: "expense record",
        becomes: "not attached yet",
        whereAndHow:
          "They are kept in DotAmi's data file on this computer: this page counts them under “Your expense records”, and the Expenses page lists the ones you haven't turned down under “Not attached to an idea yet”, where you can attach them to another idea. Records you turned down are kept and counted too, but no list shows them. To delete them as well, tick “Your expense records” too. DotAmi can't delete a single record yet.",
      },
      {
        // The sentence typed on the front door for an idea is one of the person's statements; their
        // words outlive the idea, like every other statement (2026-10-11).
        model: "PersonStatement",
        field: "ventureId",
        one: "statement",
        becomes: "not tied to an idea",
        whereAndHow:
          "These are the sentences you typed on the front door for these ideas. They are your words, so they stay among your statements in DotAmi's data file on this computer, and this page counts them under “Your statements”. To delete them as well, tick “Your statements” too; statements go all at once, never one by one.",
      },
    ],
    goesWithIt:
      "Deleting your ideas also deletes their notes, the links between them, their map progress and every figure, even if those boxes aren't ticked, your progress on each step of their roads, and the businesses you're watching for them. Your expense records stay, as “not attached yet”, with their receipts, unless you tick “Your expense records” too. So do the sentences you typed on the front door for them, among your statements, unless you tick “Your statements” too.",
    learnMore:
      "Every idea you saved goes: its name, province, revenue estimates, employment status, tags, goals, stage and your notes, and the road it is drawn on, the endings you picked, your own month and year and the job you picked if you set them. Its figures go with it, and so do your progress on each step of its road and the businesses you're watching for it, with your notes. Your skill marks and the yearly income you want are yours, not an idea's, so they stay unless you tick their boxes. Expense records attached to an idea are kept, as “not attached yet”: they stay in DotAmi's data file on this computer, this page keeps counting them under “Your expense records”, and the Expenses page lists the ones you haven't turned down under “Not attached to an idea yet”. Records you turned down are kept and counted too, but no list shows them. To delete them as well, tick “Your expense records” too; DotAmi can't delete a single record yet. The Ideas page and the map start empty, as at first launch; a copy run from source loses its two demo ideas too. Your statements and settings stay unless you tick them, including the sentence you typed on the front door for each idea, which stays tied to no idea. If an idea had its reminder switch on, the setting still holds the idea's made-up number, which no longer matches anything.",
    built: true,
  },
  {
    id: "figures",
    label: "Your figures",
    tables: ["Figure"],
    alsoDeletes: [],
    keeps: [],
    goesWithIt:
      "Every figure goes, whether agreed, waiting, taken back or turned down. Cards that used an agreed figure go back to your estimates.",
    learnMore:
      "This is every total you typed, read from a file or had an agent propose, on every idea, and your own planning numbers for them (savings toward starting, start-up costs). Nothing else is deleted with them, and your ideas stay. If you asked to be reminded about an idea's figures, its reminder banner can show again, because nothing covers that period any more. To get a figure back you would add it again and agree to it.",
    built: true,
  },
  {
    id: "expenses",
    label: "Your expense records",
    tables: ["Expense"],
    alsoDeletes: ["Receipt"],
    keeps: [],
    goesWithIt:
      "Every expense record goes, attached to an idea or not, whether waiting, agreed, taken back or turned down, and every receipt file added to one goes with it. Your ideas and figures stay.",
    learnMore:
      "This is every single business expense you typed or an agent proposed, attached to an idea or not, refunds included: the day, the amount, who it was paid to and what for, and anything else you gave. The receipts you added go too, files included, because a receipt with no record means nothing. It removes DotAmi's copy only. Receipts, bank statements and your own books kept anywhere else are not touched.",
    built: true,
  },
  {
    id: "receipts",
    label: "Your receipts",
    tables: ["Receipt"],
    alsoDeletes: [],
    keeps: [],
    goesWithIt:
      "Every receipt file you added goes from the receipts folder. The expense records stay, each marked as having no receipt.",
    learnMore:
      "This removes DotAmi's copy of every receipt you added, the pictures and PDFs in the receipts folder beside the data file, and what DotAmi noted about each (its kind, size and fingerprint). Your expense records stay as they are, with no receipt. A receipt you also keep elsewhere (the paper, a photo on your phone, an email) is not touched. The disk can still hold a deleted file's bytes until they are written over; disk encryption is what protects those.",
    built: true,
  },
  {
    id: "bank-accounts",
    label: "Your bank and card accounts",
    tables: ["SourceAccount"],
    alsoDeletes: [],
    keeps: [],
    goesWithIt:
      "Every account name goes, including the ones you took back, with the days you agreed to their warnings. Figures read from their statements stay: tick “Your figures” to delete those too. “Always allow every account” stays until “Your settings” is ticked as well.",
    learnMore:
      "This is the list Settings shows under Bank and card records, plus the accounts you took back, which stay in the data file until they are deleted here. Afterwards the next statement shows the warning again and asks for the account's name, as the first time, unless “Always allow every account” is still on. “Always allow every account” is a saved choice, so it goes with “Your settings”, not with this box. Nothing links a figure to the account it came from yet, so no figure changes. Your bank statements themselves, wherever you saved them, are not touched.",
    built: true,
  },
  {
    id: "statements",
    label: "Your statements (“In your words”)",
    tables: ["PersonStatement"],
    alsoDeletes: [],
    keeps: [],
    goesWithIt:
      "All of them go at once. DotAmi never deletes one statement by itself: a newer statement is how you change an older one.",
    learnMore:
      "These are the things you told DotAmi about yourself, word for word, with their dates, the sentence you typed on the front door for each idea, and your answers to “where do you want to be”. Nothing else uses them to decide anything, so nothing else changes, but the “In your words” panel is empty afterwards, your ideas' cards no longer show what you typed, and there is no record that you said them. A statement you kept in this tab only, because it couldn't be saved, isn't in the data file and stays until the tab closes.",
    built: true,
  },
  {
    id: "skill-marks",
    label: "Your skill marks",
    tables: ["SkillMark"],
    alsoDeletes: [],
    keeps: [],
    goesWithIt: "Every mark goes at once, on skills from a road's list and on skills you added yourself. Your ideas stay, and so does everything else.",
    learnMore:
      "These are your own marks (have, learning, not yet) on the skills and requirements a road lists, on the government's list for the job you picked, and on skills you added in your own words. They are kept once for you, not for one idea, which is why deleting your ideas doesn't remove them. Afterwards every skill counts as not marked, on every road, until you mark it again.",
    built: true,
  },
  {
    id: "income-wanted",
    label: "The yearly income you said you want",
    tables: ["PersonFigure"],
    alsoDeletes: [],
    keeps: [],
    goesWithIt: "Every one goes, whether agreed, waiting, taken back or turned down. Your ideas stay, and so do their figures.",
    learnMore:
      "This is the yearly income, before tax, you said you want: kept once for you, not for one idea, which is why deleting your ideas doesn't remove it. Afterwards the cockpit has no target of yours to show beside a future until you give one again and agree to it.",
    built: true,
  },
  {
    id: "watched-businesses",
    label: "Businesses you're watching",
    tables: ["WatchedBusiness"],
    alsoDeletes: [],
    keeps: [],
    goesWithIt: "Every list goes, on every idea: the names you typed, their links, your notes and the ad links. Your ideas stay, and so does everything else.",
    learnMore:
      "These are the businesses you added under “Others in this line of work” in the cockpit, for each idea, with your notes and the links to their ads you saw. Nothing else uses them, so nothing else changes: each idea's list is empty afterwards. To remove one business, use “Remove” beside it in the cockpit instead. Deleting your ideas deletes their lists too, whether this is ticked or not.",
    built: true,
  },
  {
    id: "settings",
    label: "Your settings",
    tables: ["Setting"],
    alsoDeletes: [],
    keeps: [],
    goesWithIt:
      "Every choice you saved goes back to how it was at first launch: figure reminders go back to none ticked, so no reminder banners show. In the desktop app, a “Never” answer about encrypting the data file is forgotten too, so the next start asks again (and if you turned the switch off while the file is encrypted, it stays encrypted and nothing is asked).",
    learnMore:
      "This is every saved choice from the Settings page and the Ideas page: how often to be reminded about your figures, which ideas have their reminder switch on, which banners you answered “Not this time”, and whether to encrypt the data file (Settings' switch, or “Never” in the window before the first encryption). An encrypted data file stays encrypted, and if you had turned the switch off, the decryption it would have done at the next start is cancelled. Choices that aren't saved yet (the ones Settings marks as coming later) aren't affected.",
    built: true,
  },
  {
    id: "backups",
    label: "Safety copies in the backups folder",
    tables: [],
    alsoDeletes: [],
    keeps: [],
    folder: "backups",
    goesWithIt:
      "Deletes the whole copies of the data file DotAmi made before each update and restore, and the receipt folders set aside in the backups folder. Afterwards, only a backup you saved somewhere else could bring anything back.",
    learnMore:
      "Each safety copy holds everything the data file held at that moment, including what you delete with the other boxes, so while they stay, what you deleted can be brought back from them. Tick this and they go: only a backup you saved somewhere else (File → Back up…) can bring anything back after that, and DotAmi can't. Only the copies DotAmi made itself are deleted (their names start with dotami-before-); anything else you put in that folder stays, and so does a backup you saved anywhere else. The receipt folders DotAmi set aside there go too: receipts-locked-… (the receipts Start a new key moved aside, with the old key file) and receipts-before-restore-… (the receipts folder as it was before a restore). Only the files DotAmi put in them are deleted; a file of yours in one stays, and so does that folder. Once they are gone, those receipts can never be opened, even if the old key comes back. If a copy or a set-aside receipt can't be deleted because another program has it open, DotAmi says so and deletes it the next time the desktop app starts.",
    built: true,
  },
  {
    id: "remembered-columns",
    label: "Remembered columns",
    tables: [],
    alsoDeletes: [],
    keeps: [],
    goesWithIt: "DotAmi doesn't remember a file's columns yet, so there is nothing to delete. Once it does, they will be deleted here.",
    learnMore:
      "A later step lets DotAmi remember which columns of a spreadsheet you picked, so the same kind of file is read the same way next time. Only the column names would be kept, never the file. When that is built, this box will delete them.",
    built: false,
  },
];

/** Tables Delete doesn't empty, and why. The test fails on a table that is in neither list. */
export const KEPT_BY_DELETE: readonly { model: string; why: string }[] = [
  {
    model: "User",
    why: "The placeholder account stays. It holds nothing of yours (its name and address are placeholders DotAmi made up), and your next idea or statement needs it.",
  },
];

/**
 * What Delete can't reach, said on the menu itself so the word "Delete" doesn't promise more than
 * it does. Each line is true of the app today; when a later step clears one, it changes here.
 */
export const NOT_CLEARED_BY_DELETE: readonly { name: string; why: string }[] = [
  {
    // [8i] The receipt folders set aside there are cleared by the safety-copies box since 2026-10-10
    // (docs/architecture/expense-records.md § 11); these key files, set aside on their own, aren't.
    name: "Key files set aside in the backups folder",
    why: "Not deleted. When Windows couldn't open the key to your receipts on this account and no receipt was locked with it, or a restore gave your receipts a new key, the old key file was moved to the backups folder (receipts-key-unreadable-….key). It holds only a key file that Windows protected for your account, nothing you typed or added. To remove one, close DotAmi and delete it (the backups folder's path is above).",
  },
  {
    name: "The locked data file and key files set aside in the backups folder",
    why: "Not touched, even with “Safety copies in the backups folder” ticked. When the data file's key can't be opened, Restore from a backup… and Start fresh… move the locked data file into the backups folder (dotami-locked-…db) and never delete it, so it can still be opened if its key comes back; the key file that couldn't open it goes there too (database-key-unreadable-…key), and Start fresh moves the receipts folder there whole (receipts-before-start-fresh-…). Each holds what it held then. To remove them, close DotAmi and delete those files and folders (the backups folder's path is above).",
  },
  {
    // Until 2026-10-17 each desktop launch had a new address, so this storage started empty and was never
    // read again; since desktop/app-port.mjs it is read at every launch (a review found this line still
    // said otherwise).
    name: "What this window keeps in its own storage",
    why: "Not cleared. The job descriptions you typed under “Other…” on the intake, and how you left the cockpit, are kept in this window's own storage, not in the data file, and offered back next time: in the desktop app from one launch to the next since 2026-10-17, when the app started using the same local address each time. To remove them in the desktop app, close DotAmi and delete the “Local Storage” folder in the data folder (the folder that holds the data file; its path is above); in a browser, clear this site's data.",
  },
  {
    name: "The log",
    why: "Not cleared. It holds events (starting up, updates, backups) and the update checker's install ID, never your words or an amount.",
  },
  {
    name: "The update checker's install ID",
    why: "Not deleted. It is the update checker's own file in the data folder (.updaterId), holding only the random code it sends GitHub with each check. To remove it, close DotAmi and delete the file; the next check makes a new one. An earlier ID stays in the log (“The log”, above), which nothing clears.",
  },
  {
    name: "Anything that already left this computer",
    why: "DotAmi can't take back a sentence sent to a model, or a file you saved somewhere else.",
  },
  {
    name: "The disk under the data file",
    why: "Delete wipes the deleted records out of the data file itself, removes deleted receipt files from the receipts folder, and deletes the safety copies and set-aside receipt folders you tick. The drive can still hold older copies of the file's pieces, a removed receipt's bytes, deleted safety copies and set-aside receipts in its free space until they are overwritten; disk encryption is what protects those.",
  },
];

/**
 * [8i] Said in amber under the safety-copies box once it is ticked, and at both asks, while the backups
 * folder holds receipt folders DotAmi set aside (docs/architecture/expense-records.md § 11): which
 * folders, and that what is in them can never be opened afterwards.
 */
export const SET_ASIDE_RECEIPTS_WARNING =
  "The receipt folders set aside in the backups folder go too: receipts-locked-… (receipts Start a new key set aside, with the old key file) and receipts-before-restore-… (the receipts folder as it was before a restore). Afterwards those receipts can never be opened, even if the old key comes back.";

/** The browser-storage keys. Each is a string constant in the code, so the test can find it. */
export const WINDOW_STORAGE: readonly WindowStorageEntry[] = [
  {
    store: "localStorage",
    key: "dotami-employment-suggestions",
    name: "Job descriptions you typed",
    holds:
      "Up to 20 job descriptions you typed under “Other…” on the intake, offered back to you next time.",
    lasts:
      "Until this window's site data is cleared; it has no end date, and Delete doesn't reach it. In the desktop app it lasts from one launch to the next since 2026-10-17, when the app started using the same local address each time (desktop/app-port.mjs); a launch that has to use another address, because the usual one is taken, starts without it, and the list stays in the app's own folder for the next launch on the usual address. The app has no button that clears it: close DotAmi and delete the “Local Storage” folder in the data folder. In a browser, clear this site's data.",
  },
  {
    store: "localStorage",
    key: "dotami-cockpit-folds",
    name: "How you left the cockpit",
    holds:
      "Yes-or-no answers about the cockpit's screen only: whether the venture details, the goal bar, the right-hand panel, the map's legend, the what-if bar and the road ahead are folded; since 2026-10-17 also which of the Skills, Money and Rules & tax layers you last had on, and whether you put away the first visit's tip. Written only once you fold, open or switch something. Nothing about you or your ideas.",
    lasts:
      "Until this window's site data is cleared; it has no end date, and Delete doesn't reach it. In the desktop app it lasts from one launch to the next since 2026-10-17, when the app started using the same local address each time (desktop/app-port.mjs); a launch that has to use another address, because the usual one is taken, opens as a first visit, and the answers stay in the app's own folder for the next launch on the usual address. The app has no button that clears it: close DotAmi and delete the “Local Storage” folder in the data folder. In a browser, clear this site's data.",
  },
  {
    store: "sessionStorage",
    key: "dotami-journey-v3",
    name: "The intake in progress",
    holds:
      "What you've entered on the intake so far, including the sentence you typed to describe your idea and your revenue estimates. When the map opens, the sentence (once, with the first idea it opens) and the goals marked on the intake are also saved with the idea in the data file. It also holds the idea open on the map, with its branch picks and your own “I'd incorporate at” amount if you typed one, and your answers on Your destination (since 2026-10-12): your words and their day, business, career or both, your province or territory, and the yearly income you agreed to, if you did.",
    lasts: "Until this window or tab closes.",
  },
  {
    store: "sessionStorage",
    key: "dotami-person-unsaved",
    name: "A statement that couldn't be saved",
    holds:
      "A statement you typed when the data file couldn't be reached, kept in this tab so it isn't lost. It is not in the data file.",
    lasts: "Until this window or tab closes.",
  },
];

/**
 * Files and folders beside the database. The safety copies and the log are the desktop app's own (a
 * copy run from source has none); the receipts folder is written by every copy that keeps a receipt,
 * and the wipe-pending note by Delete in any copy.
 * A new folder isn't caught by any scan: it has to be added here by hand (the receipts folder was,
 * with the code that writes it), and tests/privacy-inventory.spec.ts then checks the code still names it.
 */
export const FOLDERS: readonly FolderEntry[] = [
  {
    id: "receipts",
    relativePath: "receipts",
    name: "Your receipt files",
    holds:
      "A copy of each receipt you added to an expense record, as you gave it: a JPEG, PNG, WebP or HEIC picture, or a PDF, at most 10 MB each. DotAmi never keeps a converted copy: a HEIC photo is drawn by this computer's graphics chip only while it is shown. DotAmi names each file itself with a random string, never with your file's name, and never changes the receipt itself, so anything printed on it (the last digits of a card, your name and address) is in the copy too. In the desktop app each file is encrypted, with the key described below; a copy run from source keeps them unencrypted. Only DotAmi's own window can open one. “Remove receipt” on the Expenses page removes one; Delete, at the bottom of this page, removes them all (“Your receipts”) or with their records (“Your expense records”). Receipts Start a new key set aside can come back here in the desktop app (Bring these receipts back), locked with the current key, once their old key opens again. A file DotAmi didn't name is never touched.",
    writtenBy: { file: "lib/expenses/receipts/store.ts", mentions: 'RECEIPTS_FOLDER = "receipts"' },
    desktopOnly: false,
  },
  {
    id: "receipts-key",
    relativePath: "receipts.key",
    name: "The key to your receipt files",
    holds:
      "The key that encrypts your receipt files, itself encrypted by Windows for your Windows account only (with the protection Windows gives each account's secrets; Electron, which the desktop app is built on, keeps its own part of that in a file named Local State in the same folder). The key itself is never written anywhere else: not in the data file, not in a backup, not in the log. Losing this file, or the Windows profile that can open it, loses the receipts except those in a backup. Made the first time the desktop app starts; never removed by DotAmi. If Windows can't open it and no receipt is locked with it, it is moved to the safety copies folder and a new one is made; if receipts are locked with it, it moves there only when you press Start a new key, beside the receipts it locks, and stays there when they are brought back.",
    writtenBy: { file: "desktop/receipt-key.mjs", mentions: 'RECEIPT_KEY_FILE = "receipts.key"' },
    desktopOnly: true,
  },
  {
    id: "database-key",
    relativePath: "database.key",
    name: "The key to your data file",
    holds:
      "The key that encrypts the data file and its safety copies, itself encrypted by Windows for your Windows account only (the same protection as the receipts' key, in a file of its own). The key itself is never written anywhere else: not in the data file, not in a backup, not in the log. Losing this file, or the Windows profile that can open it, loses everything in the data file except what a backup holds. Made the first time the desktop app encrypts the data file; never removed or replaced by DotAmi while anything is encrypted with it, and never removed unless you turned locking off with it (a data file moved out of the folder keeps its key). If you turn “Encrypt the data file” off in Settings, the desktop app's next start decrypts the data file and its safety copies, then overwrites this file with zeros and deletes it, once nothing opens with it any more (a safety copy another program had open keeps it until a later start).",
    writtenBy: { file: "desktop/database-key.mjs", mentions: 'DATABASE_KEY_FILE = "database.key"' },
    desktopOnly: true,
    whenAbsent: "None: the data file isn't encrypted (or, if it is, the key is missing, and DotAmi says so when it starts).",
  },
  {
    id: "database-encrypting",
    relativePath: "database-encrypting.json",
    name: "A note that encrypting the data file is under way",
    holds:
      "Written while the desktop app encrypts the data file or a safety copy, and removed when it is done. It holds which of DotAmi's own files is being encrypted, the step it is at, and the encrypted copy's size and SHA-256, nothing of yours. If DotAmi stops part-way, the next start reads it to finish safely.",
    writtenBy: { file: "desktop/encrypt-database.mjs", mentions: 'ENCRYPTING_NOTE = "database-encrypting.json"' },
    desktopOnly: true,
    whenAbsent: "None: nothing is being encrypted.",
  },
  {
    id: "database-encrypting-copy",
    relativePath: "dotami.db.encrypting",
    name: "The encrypted copy being made",
    holds:
      "Made only while the desktop app encrypts the data file: everything the data file holds, written by SQLite straight into this file already encrypted with the data file's key (no plain copy is made). Once it is checked against the data file it takes the data file's place, a moment later. If another program holds the data file so the two can't be swapped, it is overwritten with zeros and deleted at once. If DotAmi stops before that, its next start overwrites it with zeros and deletes it (or finishes the swap), and so it does when the safety copy it was made from was deleted from the Delete menu meanwhile. The same name with “.encrypting” after a safety copy's name can appear in the safety copies folder for the same moments; a journal SQLite keeps beside it (“-journal”) goes with it.",
    writtenBy: { file: "desktop/encrypt-database.mjs", mentions: 'COPY_SUFFIX = ".encrypting"' },
    desktopOnly: true,
    whenAbsent: "None: nothing is being encrypted.",
  },
  {
    id: "database-plain-to-wipe",
    relativePath: "dotami.db.plain-to-wipe",
    name: "The unencrypted data file being wiped",
    holds:
      "The data file as it was before it was encrypted: everything it held, unencrypted. It is there from the moment the encrypted copy takes its place until it is overwritten with zeros and deleted, normally a moment later. If another program holds it (an antivirus scan or a sync app can), it stays until a later start can wipe it, and Settings says an unencrypted copy is still on the disk. A safety copy's own (its name with “.plain-to-wipe” after it, in the safety copies folder) is handled the same way, and so is a journal SQLite keeps beside either (“-journal”). Delete doesn't remove these files; the desktop app's next start does. On a solid-state disk, zeros don't promise the old bytes are physically gone.",
    writtenBy: { file: "desktop/encrypt-database.mjs", mentions: 'PLAIN_SUFFIX = ".plain-to-wipe"' },
    desktopOnly: true,
    whenAbsent: "None: no unencrypted copy is waiting to be wiped.",
  },
  // [8i] The three files of a decryption under way, after the person turned locking off in Settings
  // (desktop/decrypt-database.mjs; docs/architecture/database-encryption.md § 15.3).
  {
    id: "database-decrypting",
    relativePath: "database-decrypting.json",
    name: "A note that decrypting the data file is under way",
    holds:
      "Written while the desktop app decrypts the data file or a safety copy, after you turned “Encrypt the data file” off in Settings, and removed when it is done. It holds which of DotAmi's own files is being decrypted, the step it is at, and the decrypted copy's size and SHA-256, nothing of yours. If DotAmi stops part-way, the next start reads it to finish safely.",
    // Written by decrypt-database.mjs (writeNote); the name itself is declared in encrypt-database.mjs, so each
    // direction can refuse while the other's note is there, and decrypt-database.mjs re-exports it.
    writtenBy: { file: "desktop/decrypt-database.mjs", mentions: "export { DECRYPTING_NOTE };" },
    desktopOnly: true,
    whenAbsent: "None: nothing is being decrypted.",
  },
  {
    id: "database-decrypting-copy",
    relativePath: "dotami.db.decrypting",
    name: "The decrypted copy being made",
    holds:
      "Made only while the desktop app decrypts the data file, after you turned locking off: everything the data file holds, unencrypted, written by SQLite from the encrypted file. Once it is checked against the encrypted file it takes the data file's place, a moment later. If another program holds the data file so the two can't be swapped, or the copy can't be finished (a full disk), it is overwritten with zeros and deleted at once, and the data file stays encrypted. If DotAmi stops before that, its next start overwrites it with zeros and deletes it (or finishes the swap). The same name with “.decrypting” after a safety copy's name can appear in the safety copies folder for the same moments; a journal SQLite keeps beside it (“-journal”) goes with it.",
    writtenBy: { file: "desktop/decrypt-database.mjs", mentions: 'DECRYPT_COPY_SUFFIX = ".decrypting"' },
    desktopOnly: true,
    whenAbsent: "None: nothing is being decrypted.",
  },
  {
    id: "database-encrypted-to-wipe",
    relativePath: "dotami.db.encrypted-to-wipe",
    name: "The encrypted data file being wiped",
    holds:
      "The data file as it was before it was decrypted, still encrypted with the data file's key. It is there from the moment the decrypted copy takes its place until it is overwritten with zeros and deleted, normally a moment later; while it is there, the key is kept. If another program holds it, it stays until a later start can wipe it. A safety copy's own (its name with “.encrypted-to-wipe” after it, in the safety copies folder) is handled the same way, also when that safety copy was deleted from the Delete menu meanwhile. Delete doesn't remove these files; the desktop app's next start does.",
    writtenBy: { file: "desktop/decrypt-database.mjs", mentions: 'ENCRYPTED_SUFFIX = ".encrypted-to-wipe"' },
    desktopOnly: true,
    whenAbsent: "None: no encrypted copy is waiting to be wiped.",
  },
  // [8i] The record that locking was turned off, so later starts finish only a real turn-off
  // (docs/architecture/database-encryption.md § 15.2).
  {
    id: "database-turned-off",
    relativePath: "database-turned-off.json",
    name: "A note that you turned locking off",
    holds:
      "Written when the desktop app starts decrypting the data file because you turned “Encrypt the data file” off in Settings. It holds only the id of the key it was locked with (the same 16 letters and digits the key file shows), never the key, and nothing of yours. While it is there, later starts finish the job: they decrypt a safety copy another program had open, then delete the key. Without it, DotAmi never decrypts a safety copy or deletes a key on its own. It goes when the key is deleted, or when you tick the switch again before the file was decrypted.",
    writtenBy: { file: "desktop/decrypt-database.mjs", mentions: 'TURNED_OFF_NOTE = "database-turned-off.json"' },
    desktopOnly: true,
    whenAbsent: "None: locking wasn't turned off, or turning it off is finished.",
  },
  {
    id: "backups",
    relativePath: "backups",
    name: "Safety copies",
    holds:
      "Whole copies of the data file, made before each database update and before each restore. Each one holds everything the file held at that moment, including figures you have since taken back. Before a restore, the receipts folder is moved here too, whole, as it was (receipts-before-restore-…), and when you start fresh after losing the data file's key it is moved here the same way (receipts-before-start-fresh-…). Start a new key moves the receipts locked with a key that can't be opened, and that key file, into a folder here (receipts-locked-…); in the desktop app, once Windows can open that key on your account again, Bring these receipts back (Settings → Data and backups) moves them back into the receipts folder, locked with the current key, and leaves the old key file here. In the desktop app the safety copies are encrypted with the data file's key. When the data file's key is lost and you restore a backup (or start fresh), the locked data file and its key file are moved here, never deleted, in case the key comes back. Apart from each receipt Bring these receipts back moves back (its copy here is removed once the new one is in place), nothing here is deleted unless you tick “Safety copies in the backups folder” on the Delete menu below, which deletes the safety copies and the receipts-before-restore-… and receipts-locked-… folders; the folder Start fresh set aside and the locked data file and key files stay (see “What Delete doesn't reach”).",
    writtenBy: { file: "desktop/migrate.mjs", mentions: '"backups"' },
    desktopOnly: true,
  },
  {
    id: "log",
    relativePath: "logs/server.log",
    name: "The log",
    holds:
      "A running note of what the app did: starting up, updates, backups and restores (with the location of the file you chose), and finishing a wipe an earlier Delete left owed (how many safety copies it deleted, never their contents). When the desktop app can't start, it writes the message it showed you (which can name the data folder) and the error's name and code; when an update to the database file fails, it also writes the database's own words about it: which update failed and what the database objected to, such as a table or a column. When one of DotAmi's own routes fails it writes only the error's name and code, never what you typed or an amount. When an update check, a backup or a restore fails, it writes the same, the error's name and code (for a backup that can't be restored, which kind of problem it was, such as damaged), never the error's own message, which could name the file you chose or folders on this computer. The update checker's own reports of an error or a warning, and its progress lines that report a failure, leave one fixed line each; its other progress lines are kept as it wrote them, and one of them names the folder an update downloads to. Another is the line it writes when it makes its install ID (“The update checker's install ID”, below), with the ID itself in it; and if a release were ever offered to only part of its users, its line deciding whether this copy gets it would name the ID too. The database library's own error report can quote the values it was given, so it is switched off: when the database reports an error, the log gets one fixed line naming only the part of the database code that reported it, never what you typed or an amount.",
    writtenBy: { file: "desktop/main.mjs", mentions: "server.log" },
    desktopOnly: true,
  },
  {
    id: "wipe-pending",
    relativePath: "dotami.db.wipe-pending",
    name: "A note that a wipe is still owed",
    holds:
      "Written by Delete just before it wipes the data file, and removed once the wipe has worked. It holds the time the Delete started and the names of safety copies still to be deleted, nothing of yours. While it is there, the desktop app finishes the wipe the next time it starts; it does nothing of the kind on an ordinary start.",
    writtenBy: { file: "desktop/wipe-pending.mjs", mentions: ".wipe-pending" },
    desktopOnly: false,
    whenAbsent: "None: no wipe is owed.",
  },
  // electron-updater's own file, not DotAmi's (found in PR #169's review, 2026-10-14). In 6.8.9,
  // node_modules/electron-updater/out/AppUpdater.js:501-526 getOrCreateStagingUserId: it reads
  // path.join(userDataPath, ".updaterId") (:502), and when that holds no valid ID, makes a random one
  // (:517, a UUID from 4096 random bytes), writes "Generated new staging user ID: <id>" to its logger
  // (:518) and saves it there (:520). userDataPath is electron's userData folder
  // (ElectronAppAdapter.js:25), which desktop/main.mjs makes the data folder. It runs on the first
  // update check (AppUpdater.js:189 makes it lazy; :386 asks for it), and the ID goes with every check
  // after (the update check entry below, x-user-staging-id). Whether DotAmi needs the ID at all is
  // still open: nothing here changes what the updater does.
  {
    id: "updater-id",
    relativePath: ".updaterId",
    name: "The update checker's install ID",
    holds:
      "A random code of 36 letters, digits and dashes that the update checker (electron-updater, the package the desktop app uses to look for a newer version) made the first time it checked, and nothing else: nothing about you, this computer or your data. It sends this same code to GitHub with every update check (see “What leaves this computer”), so whoever receives the checks could tell this copy's checks from other copies' and link them to each other. The checker uses it to offer a release to only part of its users at first; DotAmi's own release steps don't release that way. The file is the updater's, not DotAmi's: DotAmi doesn't write or read it, and Delete doesn't remove it. To remove it, close DotAmi and delete the file; the next update check makes a new random code and sends that one instead. An earlier ID stays in the log (“The log”, above), which the updater wrote when it made the ID. Uninstalling DotAmi leaves it, with the rest of the data folder.",
    writtenBy: { file: "node_modules/electron-updater/out/AppUpdater.js", mentions: 'path.join(this.app.userDataPath, ".updaterId")' },
    desktopOnly: true,
    whenAbsent: "None: the update checker hasn't checked from this data folder yet (a copy run from source never checks).",
  },
];

/** What can leave this computer. Whether each one applies to this copy is read from lib/settings/today.ts. */
export const SENT_ELSEWHERE: readonly SentElsewhereEntry[] = [
  {
    id: "intake-sentence",
    name: "The sentence you type to describe your idea",
    when: "Only when a model key is set for this copy (run from source with ANTHROPIC_API_KEY). The desktop app never sends it.",
    what: "The sentence, to Anthropic, to be read.",
    canTakeBack:
      "No. DotAmi can't take it back once sent; Anthropic's own page says what it keeps and for how long.",
    calls: [
      {
        file: "app/api/intent/parse/route.ts",
        call: 'package "@anthropic-ai/sdk"',
        why: "The intake's sentence reader, the only code that talks to Anthropic. It runs only when ANTHROPIC_API_KEY is set.",
      },
    ],
  },
  {
    id: "update-check",
    name: "The update check",
    when: "Each time the desktop app starts, and when you choose Help → Check for updates.",
    what: "A request to GitHub, which sees this computer's internet address, which version it runs, and a random install ID the update checker made for this copy, the same on every check (kept in the data folder: “The update checker's install ID”, above). None of your data.",
    canTakeBack:
      "No: DotAmi can't take back what GitHub already received. Deleting the install ID's file, with DotAmi closed, makes the next check send a new random ID in its place.",
    calls: [
      {
        file: "desktop/main.mjs",
        call: 'package "electron-updater"',
        why: "The installed app's update check: asks GitHub Releases for a newer version at start and from Help → Check for updates.",
      },
    ],
    // electron-updater 6.8.9 sets this on its update provider before every check
    // (node_modules/electron-updater/out/AppUpdater.js:386-387, getUpdateInfoAndProvider), so it goes
    // with the requests that look for a newer version: the release list, the latest release's tag when
    // it asks for one, and the release's latest.yml (providers/GitHubProvider.js:43, :165 and :119, all
    // through providers/Provider.js createRequestOptions). The download of the installer doesn't carry
    // it: its headers are AppUpdater.js:488-500 computeRequestHeaders, which adds only
    // autoUpdater.requestHeaders, and DotAmi sets none. The value is the ID in .updaterId (FOLDERS above).
    headers: [{ name: "x-user-staging-id", source: "node_modules/electron-updater/out/AppUpdater.js:387" }],
  },
  {
    id: "files-you-save",
    name: "Files you save yourself",
    when: "Whenever you save a backup, a playbook or the reminders calendar file.",
    what: "A copy of what you chose to save, in the place you chose.",
    canTakeBack: "DotAmi doesn't know where those files are, so it can't remove them.",
    // Saving writes a file where the person picks; nothing is requested over the network.
    calls: [],
  },
];

/**
 * Calls between DotAmi's pages or its desktop window and DotAmi's own server, and the desktop
 * window loading its own pages. That server answers only on this computer's own address (a copy
 * someone deliberately serves to their own network, DOTAMI_ALLOWED_HOSTS, is theirs to review).
 * They belong to none of the entries above, but the scan can't tell a local address held in a
 * variable from a remote one, so each is listed here with the reason it is local. One line per
 * call: the desktop app's loadURL, loadFile, downloadURL and node `net` calls are each named, so a
 * new one has to be listed on its own.
 */
export const LOCAL_REQUESTS: readonly AllowedCall[] = [
  {
    file: "components/ventures/agree-prompt.tsx",
    call: "fetch(url",
    why: "postJson, the one helper that sends the figures routes their JSON. The address is its parameter, so the scan also reads every call of postJson, under whatever name it is imported, renamed, re-exported or reached through a namespace, and requires a literal /api/… path in each.",
    wrapper: "postJson",
  },
  {
    file: "desktop/main.mjs",
    call: "fetch(origin",
    why: "Waits for DotAmi's own server to start answering. origin is http://127.0.0.1:<port>, built a few lines earlier in the same file from the data folder's usual port when it is free, or any free port.",
  },
  {
    file: "desktop/main.mjs",
    call: "net.createServer(",
    why: "freePort: checks that the data folder's usual port (desktop/app-port.mjs) is free on 127.0.0.1, or asks the system for any free one there, for DotAmi's own server, then closes the probe at once. It listens only on 127.0.0.1 and makes no outgoing connection. A net.connect, net.createConnection or new net.Socket anywhere would be named and need a line of its own.",
  },
  {
    file: "desktop/main.mjs",
    call: "loadURL(origin",
    why: "Opens the window on DotAmi's own server. origin is http://127.0.0.1:<port>, built from the port picked a few lines earlier in the same file; lockDown then keeps the window from navigating anywhere else (an outside link opens in the person's own browser).",
  },
  {
    file: "desktop/main.mjs",
    call: "loadURL(`${origin}${pathname}`",
    why: "The Go menu (Home, Your futures, Settings) and Help → Licences: a path on the same local origin as above. pathname is one of four fixed strings in buildMenu.",
  },
  {
    file: "desktop/main.mjs",
    call: 'loadFile(path.join(root, "desktop", "passphrase.html")',
    why: "The passphrase window: a page shipped in the app and loaded from disk. Its own Content-Security-Policy is default-src 'none' (desktop/passphrase.html), so the page can't make a connection, and desktop/passphrase-preload.cjs lets it send back only the passphrase or a cancel.",
  },
  {
    file: "desktop/main.mjs",
    call: 'loadFile(path.join(root, "desktop", `${which}.html`)',
    why: "[8i] The two start-up windows: before an existing data file is first encrypted (desktop/encrypt-ask.html), and when the data file's key can't be opened (desktop/lost-key.html). Pages shipped in the app and loaded from disk, chosen from those two names only. Each one's own Content-Security-Policy is default-src 'none', so the page can't make a connection, and desktop/choice-preload.cjs lets it send back only one of its fixed answers.",
  },
  {
    file: "desktop/main.mjs",
    call: 'loadFile(path.join(root, "desktop", "preparing.html")',
    why: "The \"Preparing DotAmi…\" window ([8i]), shown only while a first start waits for Windows to save its own key: a page shipped in the app and loaded from disk, with no script and no preload. Its own Content-Security-Policy is default-src 'none' (desktop/preparing.html), so the page can't load or reach anything.",
  },
];

/**
 * Imports of a package that DEPENDENCIES marks as able to reach the network (or unverified), where
 * DotAmi uses it in a way that doesn't. The scan refuses the import itself, because it can't see
 * the options a call is given, so each importing file is listed here with the reason. A new file
 * that imports one needs a line of its own, and a reviewer looks at how it calls the package.
 */
export const LIBRARY_IMPORTS: readonly AllowedCall[] = [
  {
    file: "lib/figures/file/read-csv.ts",
    call: 'package "papaparse"',
    why: "Papa.parse is only ever handed the file's text (guessDelimiter and readCsv). Its `download: true` option would fetch a web address, and is never passed. The scan can't see option values, so a new Papa.parse call is checked in review.",
  },
  {
    file: "lib/figures/return/extract.ts",
    call: 'package "pdfjs-dist"',
    why: "The return reader's one call into pdf.js: getDocument is handed the PDF's bytes (`data`), never an address, and PDF_OPTIONS in the same file turns off both ways it fetches data files (useWorkerFetch false, and a BinaryDataFactory that refuses every request). tests/figures-return-read.spec.ts checks the options and that no request is made. The import here is for the module's type; the code is loaded by the worker below.",
  },
  {
    file: "lib/figures/return/pdf-text.worker.ts",
    call: 'package "pdfjs-dist"',
    why: "The return reader's worker loads pdf.js and its parser (the legacy build) and hands the parser to pdf.js as globalThis.pdfjsWorker, so pdf.js starts no worker and loads no script of its own. It only calls extractPageText (lib/figures/return/extract.ts). The worker runs under the static files' own policy in next.config.mjs (default-src 'none'), so even a request pdf.js tried to make would be refused; e2e/app.spec.ts checks that in a real browser.",
  },
  {
    file: "lib/expenses/receipts/viewer/pdf-pages.worker.ts",
    call: 'package "pdfjs-dist"',
    why: "The receipt viewer's worker ([8i]) loads pdf.js and its parser the same way as the return reader's worker, and only calls drawPdfPages (lib/expenses/receipts/viewer/draw-pdf.ts), which hands getDocument the receipt's bytes (`data`), never an address, with the return reader's PDF_OPTIONS (no data-file fetches). It draws pages onto OffscreenCanvases and hands back pictures. It runs under the same static-file policy (default-src 'none'), so even a request pdf.js tried to make would be refused; e2e/receipt-viewer.spec.ts and the desktop test check that in a real browser and in the app.",
  },
];

/**
 * Code that starts another program on this computer. node's child_process can run anything,
 * `curl` included, so each call into it is named with the program it starts as written
 * (`child_process.spawn("python"`), and a second call, or a call that names another program, needs a
 * line of its own. A line covers what DotAmi starts, never what that program then does.
 */
export const STARTS_PROGRAMS: readonly AllowedCall[] = [
  {
    file: "app/api/law/provision/route.ts",
    call: 'child_process.spawn("python"',
    why: "Runs `python` on the optional statute store's own lookup.py, and only when LAW_STORE_PATH names a store on this computer. The program is fixed, the route checks every argument before passing it (a source from a short list, a label and a sub-path in a strict shape), and the child is given no API key and no database address. What lookup.py itself does is not in this repository, so this scan can't say whether it reaches the network; that is the store's own review.",
  },
];

/**
 * Build scripts that run child_process. They run on a developer's computer (or CI) when
 * `npm run desktop:build` or `desktop:package` is run; they are never part of the app people run
 * and never a request path of it. tests/privacy-inventory.spec.ts checks that desktop/package.mjs
 * does not stage these files into the installed app.
 */
export const BUILD_TIME_ONLY: readonly AllowedCall[] = [
  {
    file: "desktop/build.mjs",
    call: "child_process.execFileSync(process.execPath",
    why: "Build-time only. Runs Next's own `next build` with this Node (process.execPath) to make the desktop app's server. The command is fixed and takes nothing from the person's data; the file is not copied into the installed app.",
  },
  {
    file: "desktop/package.mjs",
    call: "child_process.execFileSync(process.execPath",
    why: "Build-time only. Runs desktop/build.mjs with this Node (process.execPath) before packaging the installer. The command is fixed and takes nothing from the person's data; the file is not copied into the installed app.",
  },
];

/**
 * The packages that ship (see DependencyEntry for what counts), and whether each can reach the network. Checked 2026-10-06 (ofx-js: 2026-10-07) against the
 * versions installed in node_modules (the version is in package.json): each package's own README
 * and a search of its files for fetch, XMLHttpRequest, WebSocket and node's http, https, net, tls,
 * dgram, dns and child_process. Where a README doesn't speak to it, the reason says the answer
 * comes from the search, which finds an obvious call, not a hidden one.
 */
export const DEPENDENCIES: readonly DependencyEntry[] = [
  {
    name: "@anthropic-ai/sdk",
    network: "yes",
    why: "Anthropic's own client: it sends requests to api.anthropic.com, or to the address in ANTHROPIC_BASE_URL, with the key it is given (its README and client.js). DotAmi imports it in one file, the intake's sentence reader (app/api/intent/parse/route.ts), which runs it only when ANTHROPIC_API_KEY is set. The desktop app takes that key out of its server's environment (serverEnv in desktop/main.mjs).",
  },
  {
    name: "@prisma/adapter-better-sqlite3",
    network: "no",
    why: "Prisma's own adapter that hands every query to better-sqlite3 (below) instead of Prisma's built-in SQLite. Version 6.19.3, pinned exactly to match @prisma/client, read 2026-10-09 (docs/connectors/better-sqlite3-multiple-ciphers-review.md): about 660 lines that open the file with better-sqlite3 and turn Prisma's queries into its calls; a search finds no request call. It has a debug output that prints each query's values when the DEBUG environment variable names it: the desktop app removes DEBUG from its server's environment (serverEnv in desktop/main.mjs). DotAmi imports it in one file, lib/db/client.ts.",
  },
  {
    name: "@prisma/client",
    network: "no",
    why: "The database client. DotAmi's database is SQLite (provider \"sqlite\" in prisma/schema.prisma), a file on this computer that the client reads through better-sqlite3 (lib/db/client.ts) and a local query engine. The package also holds code for Prisma's hosted proxy (addresses starting prisma://), which a SQLite database never uses, and its runtime files hold no address for Prisma's usage check-in (no checkpoint.prisma.io in node_modules/@prisma/client/runtime). Its README doesn't discuss network use: this comes from the schema and that search. The `prisma` command-line tool, a development tool, is the one that checks in; scripts/prisma.mjs switches that off.",
  },
  {
    name: "better-sqlite3",
    network: "no",
    why: "The name package.json gives better-sqlite3-multiple-ciphers 13.0.3 (pinned exactly; an npm alias, and an \"overrides\" entry so Prisma's adapter gets the same package, which tests/database-package.spec.ts checks): SQLite 3.53.4 with SQLite3 Multiple Ciphers 2.4.0, an encryption extension, as one prebuilt file for each kind of computer. Read 2026-10-09 (docs/connectors/better-sqlite3-multiple-ciphers-review.md): its JavaScript requires only node's fs, path and util and its own files; the Windows file imports only node.exe and KERNEL32.dll, no network library; SQLite has no network code. It has no install script, so installing it downloads nothing more. DotAmi imports it through Prisma's adapter (lib/db/client.ts).",
  },
  {
    name: "fflate",
    network: "no",
    why: "Compression in pure JavaScript (its README). A search of its files finds no request call. DotAmi uses it to look inside a spreadsheet's zip (lib/figures/file/read-xlsx.ts) and to unpack a compressed GnuCash book inside the books worker, which runs under the static files' policy that refuses every connection (lib/figures/books/gnucash-xml.ts, worker.ts). Its README's own examples use fetch to get data; that is the example's code, not the package's.",
  },
  {
    name: "next",
    network: "no",
    why: "Not while the built app runs. Next.js's anonymous usage reports (to Vercel) come from `next dev`, `next build` and `next lint`; the code that starts the built server (`next start`, and the standalone server the desktop app runs) creates its reporter only for a development server (node_modules/next/dist/server/lib/router-server.js, read 2026-10-06), and the settings page already cites nextjs.org/telemetry (read 2026-10-05). The desktop app, CI, the desktop build and the project's npm scripts (scripts/next.mjs) set NEXT_TELEMETRY_DISABLED=1. `next dev` also asks registry.npmjs.org for the newest Next.js version (hot-reloader-webpack.js). Next's image optimiser refuses hosts not allowed by `images.remotePatterns` (node_modules/next/dist/server/image-optimizer.js); next.config.mjs sets none, and no code imports next/image. In the desktop app the optimiser is switched off (`images.unoptimized`, so /_next/image answers 404) and its image library, sharp, is left out of the server (desktop/left-out.mjs). Requests that DotAmi's own code makes through Next are the scan's business, not this entry's; so are Next settings that make the server fetch for a page, which the scan does not read (see the header).",
  },
  {
    name: "ofx-js",
    network: "no",
    why: "Reads an OFX or QFX bank download: text in, a plain object out. Version 1.1.2, pinned exactly, was read in full on 2026-10-07 (docs/connectors/ofx-reader-review.md): its package.json lists no dependencies, the code it ships (ofx.js, 192 lines) imports nothing, and a search finds no fetch, XMLHttpRequest, WebSocket, eval or Function, and no use of node's http, https, net, tls, dgram, dns or child_process. DotAmi imports it in one file, lib/figures/bank/read-ofx.ts, and hands it only the file's text; a test fails if its code changes without a new reading.",
  },
  {
    name: "papaparse",
    network: "yes",
    why: "A CSV reader. Given an address with `download: true` it fetches it with XMLHttpRequest (its README and papaparse.js). DotAmi only calls Papa.parse with the file's text (lib/figures/file/read-csv.ts), never with `download`; that import is listed in LIBRARY_IMPORTS so a new use is looked at.",
  },
  {
    name: "pdfjs-dist",
    network: "yes",
    why: "Mozilla's PDF reader (pdf.js), version 6.4.299 pinned exactly, reviewed 2026-10-08 (docs/connectors/pdf-reader-review.md). It can fetch: a PDF from an address (fetch, or XMLHttpRequest), its character maps, standard fonts and WebAssembly decoders from addresses it is given, and its own worker script. DotAmi uses it only in two workers of its own, the return reader's (lib/figures/return/) and the receipt viewer's (lib/expenses/receipts/viewer/), hands it the bytes of a file the person dropped or a receipt they kept, gives it no address, and turns off both data-file fetches; the worker it runs in can't connect anywhere (next.config.mjs, workerPolicy). Its imports are listed in LIBRARY_IMPORTS. It is bundled into the page's own script files; it is not copied into the desktop app's server.",
  },
  {
    name: "react",
    network: "no",
    why: "The UI library. Its README doesn't discuss network use; a search of its files finds no request call. An <img>, <script> or <link> the app renders is loaded by the browser, under the page's Content-Security-Policy, not by React.",
  },
  {
    name: "react-dom",
    network: "no",
    why: "Draws the UI in the browser and on the server. Its README doesn't discuss network use; a search of its files finds no request call. An <img>, <script> or <link> it renders is loaded by the browser, under the page's Content-Security-Policy.",
  },
  {
    name: "read-excel-file",
    network: "no",
    why: "Reads .xlsx files from a File, Blob, ArrayBuffer, stream or path (its README); DotAmi imports read-excel-file/universal, which reads only a Blob or ArrayBuffer (lib/figures/file/read-xlsx.ts). Its README's example of reading a spreadsheet from a web address does the fetch in the example's own code, not the package's; a search of the package's files finds no request call.",
  },
  {
    name: "electron-updater",
    network: "yes",
    why: "The installed desktop app's update check: it asks GitHub Releases for a newer version and downloads it (its README and out/ files). It is a development dependency in package.json, but desktop/package.mjs copies it into the installed app (copyWithDependencies), so it ships. DotAmi imports it in one file, desktop/main.mjs, where it is listed under the update check above; the check is off for a copy run from source and in tests (updatesOn).",
  },
];

/**
 * A top-level folder that holds source files the network scan does not read, and why that is fine.
 * For developers: the page never shows these. tests/privacy-inventory.spec.ts fails on a folder that
 * holds source files and is neither read by the scan (app/, components/, lib/, desktop/) nor listed
 * here, so adding a pages/, src/ or public/ folder, which Next.js would serve, can't go unnoticed.
 * A line here says the folder isn't part of the app people run; it is not a promise about its code.
 */
export interface UnscannedFolder {
  folder: string;
  why: string;
}

export const UNSCANNED_FOLDERS: readonly UnscannedFolder[] = [
  {
    folder: "scripts",
    why: "Developer scripts run by hand, through npm scripts or with node (scripts/next.mjs and scripts/prisma.mjs run Next.js and the Prisma command-line tool with their usage reports switched off; scripts/check-quotes.mjs fetches the source pages a builder names, or the pages behind recorded tool checks, when a builder runs it). Not staged into the desktop app and not part of the server build.",
  },
  {
    folder: "prisma",
    why: "The schema, the seed (prisma/seed.ts, run by `npm run seed`) and the migrations. desktop/package.mjs stages only prisma/migrations, which are SQL; the seed code never ships.",
  },
  {
    folder: "tests",
    why: "Unit tests and their helpers: run by developers and CI, never shipped.",
  },
  {
    folder: "e2e",
    why: "Browser tests (Playwright): run by developers and CI against a throwaway database, never shipped.",
  },
  {
    folder: "e2e-desktop",
    why: "The desktop app's own tests (Playwright driving the packaged app): run by developers and CI, never shipped.",
  },
];
