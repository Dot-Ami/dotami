/**
 * Every setting DotAmi has or will have — Part 1 of docs/architecture/settings-and-edge-cases.md
 * as data. The settings page (/settings) is drawn from this list, and
 * tests/settings-catalog.spec.ts fails if this file and that table drift apart, so change both
 * in the same commit.
 *
 * A setting stays `planned` until the story that builds it lands: the page shows it with its
 * default and its warning, says which story brings it, and offers no control — a switch that
 * did nothing would be lying. The story that builds a setting flips it to `live` and gives it
 * its control, and gives lib/settings/values.ts a definition of what its saved value may look
 * like (a test fails if a live setting has none). `undecided` means the maintainer hasn't ruled yet (Part 4 of the same doc).
 */

export type SettingGroupId = "data" | "figures" | "lens" | "map" | "privacy" | "updates";

/**
 * planned — its story isn't built; live — changed on the settings page and stored; undecided —
 * waiting on the maintainer; asked — never stored: the app asks each time it's needed (`where`
 * says where), showing the same warning there.
 */
export type SettingStatus = "planned" | "live" | "undecided" | "asked";

export interface SettingGroup {
  id: SettingGroupId;
  title: string;
  /** One line under the heading: what this group is about. */
  blurb: string;
}

export interface SettingEntry {
  /** Stable key. Never renamed once a story stores a value under it. */
  id: string;
  group: SettingGroupId;
  /** Exactly the "Setting" column of Part 1. */
  label: string;
  /** One plain line: what the setting controls. */
  does: string;
  /** Exactly the "Default" column. */
  defaultValue: string;
  /** Exactly the "Options" column. */
  options: string;
  /**
   * What the person is shown before switching to the risky option, as the page prints it. Every
   * quoted phrase in Part 1's warning column appears here word for word; null = no warning.
   */
  warning: string | null;
  /** The code in docs/task-list.md (e.g. "7b"); null while the setting is undecided. */
  story: string | null;
  status: SettingStatus;
  /** For an `asked` setting: where the app asks for it. */
  where?: string;
}

/** The order the page shows them in. "The map" holds the three rows that fit none of the others. */
export const SETTING_GROUPS: readonly SettingGroup[] = [
  { id: "data", title: "Data and backups", blurb: "Where your data lives and how it's kept safe." },
  { id: "figures", title: "Your figures", blurb: "The confirmed totals DotAmi keeps about your business." },
  {
    id: "lens",
    title: "The Lens and outside agents",
    blurb: "DotAmi's built-in agent, and any agent of yours that connects to it.",
  },
  { id: "map", title: "The map", blurb: "Which year's rules the cards use, reminders, and language." },
  { id: "privacy", title: "Privacy", blurb: "What leaves this computer." },
  { id: "updates", title: "Updates", blurb: "How new versions arrive." },
];

export const SETTINGS: readonly SettingEntry[] = [
  {
    id: "data-folder",
    group: "data",
    label: "Where the data file lives",
    does: "The folder holding the one file that is all of your data.",
    defaultValue: "the app's own folder",
    options: "any folder",
    warning: 'Before moving it: "the app will close and reopen".',
    story: "7b",
    status: "planned",
  },
  {
    id: "backup-passphrase",
    group: "data",
    label: "Backup passphrase",
    // [8i] Required since 2026-10-10 (the maintainer's decision): a backup holds the data decrypted.
    does: "Locks every backup so only someone with the passphrase can open it. Every backup needs one: a backup holds your data unencrypted inside it, so it can be restored on another computer.",
    defaultValue: "required",
    options: "a passphrase",
    warning: "Before setting one: \"lose it and the backup can't be opened — nobody can recover it\".",
    story: "7c",
    status: "asked",
    where: "File → Back up… in the desktop app",
  },
  {
    id: "database-encryption",
    group: "data",
    label: "Encrypt the data file",
    // [8i] Live in the desktop app; a copy run from source has no key store and says so beside it.
    // [8i] Turning it off once encrypted (database-encryption.md § 15) unlocks the data file only; the receipts' own lock stays.
    does: "Locks the data file and its safety copies with a key only your Windows account on this computer can open, so an administrator account while you're signed out, a copy of the data folder, or the disk read outside Windows can't read them. The desktop app does it at its next start, after asking, for a new data folder as for an existing one. Turned off once the file is encrypted, the desktop app decrypts the file and its safety copies at its next start and deletes the key. Only the data file: receipt files keep their own encryption.",
    defaultValue: "on, asked first",
    options: "on · off",
    warning:
      'Before encrypting: "if the key is ever lost, everything not in a backup is lost; an older DotAmi can\'t open the file afterwards". Before Never: "your data file stays unencrypted: anyone who can read your data folder, a copy of it, or this computer\'s disk outside Windows can read it". Before turning it off once encrypted: "anyone who can read your data folder, a copy of it, or this computer\'s disk outside Windows can read your ideas, figures, expense records and statements; backups stay locked with their passphrase either way".',
    story: "8i",
    status: "live",
  },
  {
    id: "figure-reminders",
    group: "figures",
    label: "Figure reminders",
    does: "How often to be reminded to bring your figures up to date: tick monthly, quarterly and/or yearly, or none. Each idea has its own \"Remind me about this idea\" switch on the Ideas page. When a period you asked about has ended and an idea's agreed figures don't cover it, a banner on that idea's card and map says so, with \"Add figures\" and \"Not this time\". \"Add to my calendar\" saves a calendar file with one repeating event per ticked box; your calendar can't see DotAmi, so it reminds you whether or not your figures are in.",
    defaultValue: "none ticked",
    options: "monthly · quarterly · yearly (tick any, or none)",
    warning: null,
    story: "8e",
    status: "live",
  },
  {
    id: "bank-records",
    group: "figures",
    label: "Bank and card records",
    // Stays "planned" until the statement screen lands: until then the switch would do nothing.
    // Its accounts list (lib/figures/source-accounts.ts) is already built and shows here once an
    // account exists. The warning shown before each statement is BANK_STATEMENT_WARNING below.
    does: "Lets figures be read from bank and card statements, in this window. Each account you allow is listed here under your own name for it, with the day you agreed to its warning, and you can take it back. The project doesn't recommend it; it's your call.",
    defaultValue: "off",
    options: "on · then, for each statement: allow once · always allow this account · always allow every account",
    warning:
      'Before turning it on: "a statement holds every purchase and payment, the names of people, balances and account numbers; DotAmi reads it in this window, keeps only the monthly totals you agree to and never keeps an account or card number". Then, before each statement from an account you haven\'t always allowed: "Before DotAmi reads a bank or card statement", with Allow once, Always allow this account and Always allow every account.',
    story: "8g",
    status: "planned",
  },
  {
    id: "model",
    group: "lens",
    label: "Model",
    does: "The AI model the Lens runs on: one on this computer, or a hosted one with your own key. DotAmi ships none.",
    defaultValue: "none chosen",
    options: "local model · own key per provider",
    warning: 'Before using your own key: "what the Lens reads goes to that company".',
    story: "9a",
    status: "planned",
  },
  {
    id: "spend-limit",
    group: "lens",
    label: "Monthly spend limit for an own key",
    does: "The most a hosted model may cost you in a month; the Lens stops at the limit.",
    defaultValue: "required when a key is added",
    options: "an amount",
    warning: null,
    story: "9a",
    status: "planned",
  },
  {
    id: "permission-level",
    group: "lens",
    label: "Permission level, per venture",
    does: "How much the Lens and connected agents may do on a venture. Confirming a figure always asks you, at every level.",
    defaultValue: "Propose",
    options: "Read · Propose · Act asking first · Act freely",
    warning:
      'Before choosing Act freely: "it changes things without asking; everything is logged and can be undone".',
    story: "9f",
    status: "planned",
  },
  {
    id: "web-search",
    group: "lens",
    label: "Web search",
    does: "Lets the Lens search the web.",
    defaultValue: "off",
    options: "on",
    warning: 'Before turning it on: "searches go to the search provider".',
    story: "9g",
    status: "planned",
  },
  {
    id: "lens-folders",
    group: "lens",
    label: "Folders the Lens may read",
    does: "The folders on this computer the Lens may open files in.",
    defaultValue: "none",
    options: "chosen folders",
    warning: "A warning for each folder you add.",
    story: "9g",
    status: "planned",
  },
  {
    id: "run-commands",
    group: "lens",
    label: "Run commands",
    does: "Lets the Lens run commands on this computer. Every command is shown before it runs.",
    defaultValue: "off",
    options: "on",
    warning: 'Before turning it on: "commands can change or delete files on this computer".',
    story: "9g",
    status: "planned",
  },
  {
    id: "built-in-browser",
    group: "lens",
    label: "Built-in browser",
    does: "A browser inside the app the Lens can use — for example with your accounting software open in it.",
    defaultValue: "off",
    options: "on",
    warning: "Before turning it on: the vendor's own terms on automation, quoted, for any site you log into.",
    story: "9g",
    status: "planned",
  },
  {
    id: "write-back",
    group: "lens",
    label: "Write back to accounting software",
    does: "Lets the Lens enter things in your accounting software, keeping a record of every write.",
    defaultValue: "off",
    options: "on per connection",
    warning: 'Before turning it on: "it can change your books; check every entry".',
    story: "9g",
    status: "planned",
  },
  {
    id: "own-keys",
    group: "lens",
    label: "Own keys for a live connection",
    does: "Your own keys to an accounting package's official connection, kept in this computer's keychain.",
    defaultValue: "none",
    options: "per vendor",
    warning: 'Before adding one: "anyone with this computer can reach your books".',
    story: "9h",
    status: "planned",
  },
  {
    id: "mcp-server",
    group: "lens",
    label: "DotAmi's MCP server (outside agents)",
    does: "Lets an agent of yours (Claude Code, Codex …) read your map and propose figures.",
    defaultValue: "off",
    options: "on",
    warning:
      'Before turning it on: "an agent connected here sees your map and figures at the level you choose".',
    story: "9i",
    status: "planned",
  },
  {
    id: "deadline-reminders",
    group: "map",
    label: "Deadline reminders",
    does: "A reminder before each filing and payment date on your map.",
    defaultValue: "on for deadlines on your map",
    options: "on · off per kind",
    warning: null,
    story: "10d",
    status: "planned",
  },
  {
    id: "tax-year",
    group: "map",
    label: "Tax year shown",
    does: "Which year's rules the cards show.",
    defaultValue: "the current one",
    options: "any year with catalogs",
    warning: null,
    story: "11i",
    status: "planned",
  },
  {
    id: "language",
    group: "map",
    label: "Language",
    does: "The language of the app.",
    defaultValue: "English",
    options: "English · French (when it exists)",
    warning: null,
    story: "11j",
    status: "planned",
  },
  {
    id: "usage-sharing",
    group: "privacy",
    label: "Share anonymous usage",
    // Decided 2026-10-05: people are asked, and nothing is shared unless they say yes. What is
    // sent, where it goes and who sees it are still open (Part 4), so the row stays "undecided".
    does: "Anonymous usage is shared only if you say yes when asked — never your figures, words or files. What is shared, where it goes and who sees it aren't decided yet.",
    defaultValue: "off until you say yes",
    options: "see Part 4",
    warning: null,
    story: null,
    status: "undecided",
  },
  {
    id: "automatic-updates",
    group: "updates",
    label: "Automatic updates",
    does: "Whether DotAmi installs new versions by itself.",
    defaultValue: "on",
    options: "on · ask first · off",
    warning: 'Before turning it off: "you won\'t get fixes, including security fixes".',
    story: "7d",
    status: "planned",
  },
];

/** The three answers to the statement warning. Ids are permanent: the bank-sources route takes them. */
export type BankAllowChoice = "once" | "always" | "every";

export interface BankStatementWarning {
  title: string;
  intro: readonly string[];
  /** Under "If you go ahead:". */
  ifYouGoAhead: readonly string[];
  /** Under "What DotAmi can't protect:". */
  cantProtect: readonly string[];
  /** The buttons, in the order shown, each with one line on what it means. Cancel is always there too. */
  choices: readonly { id: BankAllowChoice; label: string; means: string }[];
}

/**
 * [8g] The warning shown before DotAmi reads a bank or card statement, unless the person chose
 * "Always allow" for that account or for every account (the maintainer's decision, 2026-10-07:
 * three buttons, and Settings lists the accounts and takes them back). Kept here, not in a
 * component, so the words are reviewed in one place; Part 1 of
 * docs/architecture/settings-and-edge-cases.md has it word for word and
 * tests/bank-sources.spec.ts fails if the two drift. The statement screen that shows it is the
 * next step.
 */
export const BANK_STATEMENT_WARNING: BankStatementWarning = {
  title: "Before DotAmi reads a bank or card statement",
  intro: [
    "The DotAmi project doesn't recommend this. It's your choice.",
    "A statement holds much more than your business totals: every purchase and payment, the names of people who paid you or whom you paid, balances, and account or card numbers.",
  ],
  ifYouGoAhead: [
    "The file is read in this window, on this computer. DotAmi doesn't send it anywhere or save it, and never asks for your online banking login.",
    "Nothing counts as revenue until you tick it. Money in isn't always revenue: transfers between your own accounts, loans, refunds, and money from selling something you own are examples to look out for.",
    "DotAmi keeps only the monthly totals you agree to, under the name you give this account. Account and card numbers are never kept.",
  ],
  cantProtect: [
    "The file stays wherever you saved it. DotAmi doesn't move or delete it.",
    "Anyone who can open DotAmi's data on this computer can see the totals you agreed to, and the names you gave your accounts. Settings says how to turn on your computer's disk encryption, which covers a lost or stolen computer.",
    "DotAmi could misread your bank's file. Check every total before you agree to it.",
  ],
  choices: [
    { id: "once", label: "Allow once", means: "This statement only. You'll see this warning again next time." },
    {
      id: "always",
      label: "Always allow this account",
      means: "No warning for this account's statements until you take it back in Settings.",
    },
    {
      id: "every",
      label: "Always allow every account",
      means: "No warning for any account, including ones you add later, until you take it back in Settings.",
    },
  ],
};

export function settingsInGroup(group: SettingGroupId): SettingEntry[] {
  return SETTINGS.filter((s) => s.group === group);
}
