/**
 * Everything DotAmi keeps about the person, and where — as data. The /your-data page
 * ("What DotAmi knows about you") is drawn from this list, the way /settings is drawn from
 * lib/settings/catalog.ts.
 *
 * The point of the list is that it can't quietly go stale. tests/privacy-inventory.spec.ts fails
 * when prisma/schema.prisma gains a model, or any code under app/, components/ or lib/ starts
 * using a browser-storage key, that isn't listed here. So a new store (the Lens's conversation,
 * a settings table, a remembered file layout) has to say what it holds and how it is removed
 * before it can merge — and the page then shows it without anyone remembering to.
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

/** One way something can leave this computer. */
export interface SentElsewhereEntry {
  id: "intake-sentence" | "update-check" | "files-you-save";
  name: string;
  /** When it happens at all. */
  when: string;
  what: string;
  /** Whether DotAmi can take it back afterwards. */
  canTakeBack: string;
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
      "One record that owns your ideas and statements, so DotAmi can tell whose they are. There is no sign-in; the name and address on it are placeholders DotAmi makes up, not yours.",
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
    removedBy: "Unlink, on an idea's card on the Ideas page.",
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
      "A running note of what the app did: starting up, updates, and backups and restores (with the location of the file you chose). When one of DotAmi's own routes fails it writes only the error's name and code, never what you typed or an amount. The database library prints its own error report to the same place, and for a request DotAmi built wrongly that report can quote the values in it.",
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
  },
  {
    id: "update-check",
    name: "The update check",
    when: "Each time the desktop app starts.",
    what: "A request to GitHub, which sees this computer's internet address and which version it runs. None of your data.",
    canTakeBack: "There is nothing of yours to take back.",
  },
  {
    id: "files-you-save",
    name: "Files you save yourself",
    when: "Whenever you save a backup or download a playbook.",
    what: "A copy of what you chose to save, in the place you chose.",
    canTakeBack: "DotAmi doesn't know where those files are, so it can't remove them.",
  },
];
