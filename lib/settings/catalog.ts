/**
 * Every setting DotAmi has or will have — Part 1 of docs/architecture/settings-and-edge-cases.md
 * as data. The settings page (/settings) is drawn from this list, and
 * tests/settings-catalog.spec.ts fails if this file and that table drift apart, so change both
 * in the same commit.
 *
 * A setting stays `planned` until the story that builds it lands: the page shows it with its
 * default and its warning, says which story brings it, and offers no control — a switch that
 * did nothing would be lying. The story that builds a setting flips it to `live` and gives it
 * its control. `undecided` means the maintainer hasn't ruled yet (Part 4 of the same doc).
 */

export type SettingGroupId = "data" | "figures" | "lens" | "map" | "privacy" | "updates";

export type SettingStatus = "planned" | "live" | "undecided";

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
    does: "Locks your backups so only someone with the passphrase can open them.",
    defaultValue: "none",
    options: "a passphrase",
    warning: "Before setting one: \"lose it and the backup can't be opened — nobody can recover it\".",
    story: "7c",
    status: "planned",
  },
  {
    id: "figure-reminders",
    group: "figures",
    label: "Figure reminders",
    does: "A reminder to bring your figures up to date.",
    defaultValue: "off",
    options: "monthly · quarterly · off",
    warning: null,
    story: "8e",
    status: "planned",
  },
  {
    id: "bank-records",
    group: "figures",
    label: "Bank and card records",
    does: "Lets figures be read from bank and card statements. The project doesn't recommend it; it's your call.",
    defaultValue: "off",
    options: "on per source",
    warning: "A warning every time a new bank source is added.",
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

export function settingsInGroup(group: SettingGroupId): SettingEntry[] {
  return SETTINGS.filter((s) => s.group === group);
}
