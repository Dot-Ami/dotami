import type { DeleteMenuEntry, KeptLink } from "./inventory";

/**
 * The Delete menu's arithmetic over its own entries: which tables a set of ticked boxes empties,
 * and which links it clears while keeping the rows. It lives on its own, with no runtime import, so
 * the server (lib/privacy/delete.ts) and the menu in the window (components/your-data/delete-menu.tsx)
 * run the same code: the window can't show one number while the server checks another, and the
 * window doesn't have to bundle the whole inventory to get it.
 */

/** The key a kept link's count travels under, on the page and in the delete request: "Expense.ventureId". */
export const keptLinkKey = (k: { model: string; field: string }) => `${k.model}.${k.field}`;

/** The count key of DotAmi's safety copies in the backups folder, beside the tables' names (which all start with a capital). */
export const SAFETY_COPIES_KEY = "backups";
/** The count key of the receipt folders DotAmi set aside in the backups folder ([8i], expense-records.md § 11). */
export const SET_ASIDE_RECEIPTS_KEY = "set-aside-receipts";

/**
 * The counts a box that deletes files rather than rows travels under, on the page and in the delete
 * request: the safety copies in the backups folder, then the receipt folders set aside there, which
 * the same box clears.
 */
export function folderKeys(entry: Pick<DeleteMenuEntry, "folder">): string[] {
  return entry.folder === "backups" ? [SAFETY_COPIES_KEY, SET_ASIDE_RECEIPTS_KEY] : [];
}

/** Every table a set of menu entries touches: the ones they empty and the ones the database empties with them. */
export function affectedTables(entries: readonly DeleteMenuEntry[]): string[] {
  const out: string[] = [];
  for (const e of entries) {
    for (const m of [...e.tables, ...e.alsoDeletes]) if (!out.includes(m)) out.push(m);
  }
  return out;
}

/**
 * The links the ticked kinds clear while keeping the rows (an expense record's idea, when ideas are
 * ticked). A link into a table that a ticked kind empties anyway is left out: those rows go, so
 * nothing is kept (ideas and expense records ticked together delete every record).
 */
export function keptLinks(entries: readonly DeleteMenuEntry[]): KeptLink[] {
  const emptied = affectedTables(entries);
  const out: KeptLink[] = [];
  for (const e of entries) {
    for (const k of e.keeps) {
      if (!emptied.includes(k.model) && !out.some((o) => keptLinkKey(o) === keptLinkKey(k))) out.push(k);
    }
  }
  return out;
}
