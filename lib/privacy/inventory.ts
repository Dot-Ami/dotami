/**
 * Everything DotAmi keeps about the person, and where — as data. The /your-data page
 * ("What DotAmi knows about you") is drawn from this list, the way /settings is drawn from
 * lib/settings/catalog.ts.
 *
 * The point of the list is that it can't quietly go stale. tests/privacy-inventory.spec.ts fails
 * when prisma/schema.prisma gains a model, or any code under app/, components/ or lib/ starts
 * using a browser-storage key, or any code (desktop/ included) starts reaching the network, in a
 * way that isn't listed here. So a new store (the Lens's conversation, a settings table, a
 * remembered file layout) or a new request out has to say what it holds or sends, and how it is
 * removed, before it can merge — and the page then shows it without anyone remembering to.
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
 * never shows these. tests/privacy-inventory.spec.ts reads app/, components/, lib/ and desktop/ for
 * every call whose address isn't a literal "/…" path on DotAmi's own server (fetch, XMLHttpRequest,
 * sendBeacon, WebSocket, EventSource, node's http/https/net, and the import of a library that makes
 * requests), and fails on any that isn't listed — on the entry it belongs to, or in LOCAL_REQUESTS.
 * It also fails on a listed call that has gone, so the list can't outlive the code.
 */
export interface AllowedCall {
  /** The file, relative to the repo. */
  file: string;
  /** The call as the scan names it (networkCalls in tests/helpers/source-scan.ts): `fetch(url`, `package "electron-updater"`. */
  call: string;
  /** Why this call is fine, for the next developer. */
  why: string;
  /**
   * Set when `call` is a fetch inside a helper that other code calls with the address: the scan then
   * reads every call of that helper as if it were a fetch, so the address can't hide behind it.
   */
  wrapper?: string;
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
    model: "Figure",
    name: "Your figures",
    holds:
      "Totals about your business that you typed, read from a file, or an agent proposed: the amount, the period, the currency, where it came from, and the days it was proposed, agreed to and taken back. Never the file itself, and never individual transactions.",
    removedBy:
      "Retract (an agreed figure) or Discard (a waiting one) stops a figure counting, but the row, its amount included, stays in the data file and on this page. Nothing erases a figure yet.",
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
 * Requests that never leave this computer: DotAmi's pages and its desktop window talking to
 * DotAmi's own server. They belong to none of the entries above, but the scan can't tell a local
 * address held in a variable from a remote one, so each is listed here with the reason it is local.
 */
export const LOCAL_REQUESTS: readonly AllowedCall[] = [
  {
    file: "components/ventures/agree-prompt.tsx",
    call: "fetch(url",
    why: "postJson, the one helper that sends the figures routes their JSON. The address is its parameter, so the scan also reads every call of postJson and requires a literal /api/… path in each.",
    wrapper: "postJson",
  },
  {
    file: "desktop/main.mjs",
    call: "fetch(origin",
    why: "Waits for DotAmi's own server to start answering. origin is http://127.0.0.1:<port>, built from a free port a few lines earlier in the same file.",
  },
  {
    file: "desktop/main.mjs",
    call: 'package "node:net"',
    why: "Used only for net.createServer, to ask the system for a free port on 127.0.0.1 for DotAmi's own server. It makes no outgoing connection; a net.connect would be listed on its own line.",
  },
];
