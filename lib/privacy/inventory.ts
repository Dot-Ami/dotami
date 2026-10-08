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

/** A file or folder beside the database that DotAmi's desktop app writes. */
export interface FolderEntry {
  id: "backups" | "log";
  /** Path relative to the folder holding the data file. */
  relativePath: string;
  name: string;
  holds: string;
  /** A piece of text that must appear in the desktop code that writes it (a guard against a rename). */
  writtenBy: { file: string; mentions: string };
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
    removedBy: "Nothing in the app removes it. Deleting the data file removes it along with everything else.",
  },
  {
    model: "PersonStatement",
    name: "Your statements",
    holds:
      "Things you told DotAmi about yourself, word for word, each with the day you say you said it. They are never summarised or used to rank anything.",
    removedBy:
      "Nothing removes one, by design: a newer statement beats an older one by its date, and old ones are never edited away.",
  },
  {
    model: "Venture",
    name: "Your ideas",
    holds:
      "Each business idea you saved: its name, province, your first- and third-year revenue estimates, your employment status, the tags you picked, how far along it is, and your notes on it.",
    removedBy:
      "Nothing in the app deletes an idea yet. Deleting the data file removes them all.",
  },
  {
    model: "VentureLink",
    name: "Links between ideas",
    holds: "Which of your ideas relate to which, the kind of link, and your reason for it in your own words.",
    removedBy: "The “remove” button beside a link, under Cross-references on an idea's card on the Ideas page.",
  },
  {
    model: "ScenarioState",
    name: "Map progress",
    holds: "Which steps on each idea's map you marked active, done or set aside, and which branches you took.",
    removedBy: "Nothing removes it on its own; saving the map again overwrites it.",
  },
  {
    model: "Setting",
    name: "Your settings",
    holds:
      "The choices you made on the Settings page and the Ideas page: how often you asked to be reminded about your figures, and which of your ideas have their reminder switch on (as idea numbers DotAmi made up, not names). Only the choices; never an amount or any of your words.",
    removedBy:
      "Changing the choice on the page (unticking a box, turning a switch off) overwrites it; the row itself stays in the data file. Nothing deletes a setting yet.",
  },
  {
    model: "Figure",
    name: "Your figures",
    holds:
      "Totals about your business that you typed, read from a file, or an agent proposed: the amount, the period, the currency, where it came from, and the days it was proposed, agreed to and taken back. Never the file itself. A single purchase is not a figure: if you agree to keep one, it is an expense record (the next entry).",
    removedBy:
      "Retract (an agreed figure) or Discard (a waiting one) stops a figure counting, but the row, its amount included, stays in the data file and on this page. Nothing erases a figure yet.",
  },
  {
    model: "Expense",
    name: "Your expense records",
    holds:
      "Single business expenses that you typed or an agent proposed, whether waiting, agreed to, taken back or turned down: the day, the amount and currency, who it was paid to and what for, a category only if one was given, the seller's address and GST/HST number if you gave them, and where it came from, with the days it was proposed, agreed to and taken back. Never a bank or card number, and no receipt file yet. These are individual transactions, kept as your own record; DotAmi never marks one as deductible or chooses its category.",
    removedBy:
      "Nothing in the app takes one back yet: the screens to type, agree to and take back a record are the next step. Once they exist, taking one back or turning one down will stop it counting but leave the row, with its amount and words, in the data file. Deleting an idea would remove its records with it, but nothing deletes an idea yet. Deleting the data file removes them all.",
  },
];

/** The browser-storage keys. Each is a string constant in the code, so the test can find it. */
export const WINDOW_STORAGE: readonly WindowStorageEntry[] = [
  {
    store: "localStorage",
    key: "dotami-employment-suggestions",
    name: "Job descriptions you typed",
    holds:
      "Up to 20 job descriptions you typed under “Other…” on the intake, offered back to you next time.",
    lasts:
      "Until this window's site data is cleared; it has no end date. In the desktop app each launch uses its own local address, so a list from an earlier launch can't be read again, but it stays in the app's own folder.",
  },
  {
    store: "sessionStorage",
    key: "dotami-journey-v3",
    name: "The intake in progress",
    holds:
      "What you've entered on the intake so far, including the sentence you typed to describe your idea and your revenue estimates.",
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

/** Files beside the database. Only the desktop app writes these; a copy run from source has none of its own. */
export const FOLDERS: readonly FolderEntry[] = [
  {
    id: "backups",
    relativePath: "backups",
    name: "Safety copies",
    holds:
      "Whole copies of the data file, made before each database update and before each restore. Each one holds everything the file held at that moment, including figures you have since taken back.",
    writtenBy: { file: "desktop/migrate.mjs", mentions: '"backups"' },
  },
  {
    id: "log",
    relativePath: "logs/server.log",
    name: "The log",
    holds:
      "A running note of what the app did: starting up, updates, and backups and restores (with the location of the file you chose). When one of DotAmi's own routes fails it writes only the error's name and code, never what you typed or an amount. The database library's own error report can quote the values it was given, so it is switched off: when the database reports an error, the log gets one fixed line naming only the part of the database code that reported it, never what you typed or an amount.",
    writtenBy: { file: "desktop/main.mjs", mentions: "server.log" },
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
    when: "Each time the desktop app starts.",
    what: "A request to GitHub, which sees this computer's internet address and which version it runs. None of your data.",
    canTakeBack: "There is nothing of yours to take back.",
    calls: [
      {
        file: "desktop/main.mjs",
        call: 'package "electron-updater"',
        why: "The installed app's update check: asks GitHub Releases for a newer version at start and from Help → Check for updates.",
      },
    ],
  },
  {
    id: "files-you-save",
    name: "Files you save yourself",
    when: "Whenever you save a backup or download a playbook.",
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
    why: "Waits for DotAmi's own server to start answering. origin is http://127.0.0.1:<port>, built from a free port a few lines earlier in the same file.",
  },
  {
    file: "desktop/main.mjs",
    call: "net.createServer(",
    why: "freePort: asks the system for a free port on 127.0.0.1 for DotAmi's own server, then closes the probe at once. It listens only on 127.0.0.1 and makes no outgoing connection. A net.connect, net.createConnection or new net.Socket anywhere would be named and need a line of its own.",
  },
  {
    file: "desktop/main.mjs",
    call: "loadURL(origin",
    why: "Opens the window on DotAmi's own server. origin is http://127.0.0.1:<port>, built from the free port a few lines earlier in the same file; lockDown then keeps the window from navigating anywhere else (an outside link opens in the person's own browser).",
  },
  {
    file: "desktop/main.mjs",
    call: "loadURL(`${origin}${pathname}`",
    why: "The Go menu (Home, Your ideas, Settings): a path on the same local origin as above. pathname is one of three fixed strings in buildMenu.",
  },
  {
    file: "desktop/main.mjs",
    call: 'loadFile(path.join(root, "desktop", "passphrase.html")',
    why: "The passphrase window: a page shipped in the app and loaded from disk. Its own Content-Security-Policy is default-src 'none' (desktop/passphrase.html), so the page can't make a connection, and desktop/passphrase-preload.cjs lets it send back only the passphrase or a cancel.",
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
 * The packages that ship (see DependencyEntry for what counts), and whether each can reach the network. Checked 2026-10-06 against the
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
    name: "@prisma/client",
    network: "no",
    why: "The database client. DotAmi's database is SQLite (provider \"sqlite\" in prisma/schema.prisma), a file on this computer that the client reads through a local query engine. The package also holds code for Prisma's hosted proxy (addresses starting prisma://), which a SQLite database never uses, and its runtime files hold no address for Prisma's usage check-in (no checkpoint.prisma.io in node_modules/@prisma/client/runtime). Its README doesn't discuss network use: this comes from the schema and that search. The `prisma` command-line tool, a development tool, is the one that checks in; scripts/prisma.mjs switches that off.",
  },
  {
    name: "fflate",
    network: "no",
    why: "Compression in pure JavaScript (its README). A search of its files finds no request call. DotAmi uses it to look inside a spreadsheet's zip (lib/figures/file/read-xlsx.ts). Its README's own examples use fetch to get data; that is the example's code, not the package's.",
  },
  {
    name: "next",
    network: "no",
    why: "Not while the built app runs. Next.js's anonymous usage reports (to Vercel) come from `next dev`, `next build` and `next lint`; the code that starts the built server (`next start`, and the standalone server the desktop app runs) creates its reporter only for a development server (node_modules/next/dist/server/lib/router-server.js, read 2026-10-06), and the settings page already cites nextjs.org/telemetry (read 2026-10-05). The desktop app, CI and the desktop build set NEXT_TELEMETRY_DISABLED=1. `next dev` also asks registry.npmjs.org for the newest Next.js version (hot-reloader-webpack.js). Next's image optimiser refuses hosts not allowed by `images.remotePatterns` (node_modules/next/dist/server/image-optimizer.js); next.config.mjs sets none, and no code imports next/image. Requests that DotAmi's own code makes through Next are the scan's business, not this entry's; so are Next settings that make the server fetch for a page, which the scan does not read (see the header).",
  },
  {
    name: "papaparse",
    network: "yes",
    why: "A CSV reader. Given an address with `download: true` it fetches it with XMLHttpRequest (its README and papaparse.js). DotAmi only calls Papa.parse with the file's text (lib/figures/file/read-csv.ts), never with `download`; that import is listed in LIBRARY_IMPORTS so a new use is looked at.",
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
    why: "Developer scripts run by hand through npm scripts (scripts/prisma.mjs runs the Prisma command-line tool with its usage check-in switched off). Not staged into the desktop app and not part of the server build.",
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
