import { existsSync } from "node:fs";

import { databaseFilePath } from "@/lib/db/database-file";
import { databaseLockState, type DatabaseLockState } from "@/lib/db/lock";
import { receiptLockState, receiptsSetAsideTo, type ReceiptLockState } from "@/lib/expenses/receipts/lock";
import pkg from "@/package.json";
import { DEFAULT_INTENT_ANTHROPIC_MODEL } from "@/lib/providers/llm/constants";

/**
 * What is true about this copy of DotAmi right now, for the settings page. Read on the server
 * on every visit, from the same environment the app itself runs with, so the page can't say
 * one thing while the app does another. Nothing here is a setting: these are the facts the
 * planned settings will one day change.
 */
export interface SettingsToday {
  dataFile: { path: string | null; exists: boolean };
  /** Whether the sentence a person types to describe a venture is sent to a model. */
  intake: { sentTo: "nobody" | "anthropic"; model: string | null };
  version: string;
  /**
   * "github": the installed desktop app, which checks GitHub Releases for a newer version at start
   * (desktop/main.mjs sets DOTAMI_UPDATES). "manual": run from the source code; updates with git.
   */
  updates: "github" | "manual";
  /** The desktop app (DOTAMI_DESKTOP from desktop/main.mjs): it has Back up and Restore in its File menu. */
  desktop: boolean;
  /**
   * [8i] How this copy keeps receipt files (lib/expenses/receipts/lock.ts): "on" encrypted with the
   * desktop app's key; "source" or "no-key-store" kept unencrypted; "key-unreadable" the key can't be
   * opened. Only the state: the key never reaches a page.
   */
  receipts: ReceiptLockState;
  /**
   * [8i] Whether this copy's data file is encrypted (lib/db/lock.ts): "on" in the desktop app with its
   * key; "off" (Not now), "never", "no-key-store" or "source" kept unencrypted. `plainLeft` counts plain
   * copies still on the disk. Only the state: the key never reaches a page.
   */
  database: { state: DatabaseLockState; plainLeft: number };
  /**
   * After Start a new key (receipts "new-key-at-restart"): the folder the locked receipts were moved to,
   * said on the page until the restart. Null otherwise. Only this server's own run knows it.
   */
  receiptsSetAside: string | null;
  /** The tax year the catalogs cover (lib/engines/<engine>/v2026). Becomes a setting with [11i]. */
  taxYear: number;
}

// Moved to lib/db/database-file.ts (the database client opens the file through it too); still
// exported here for the callers that import it from this file.
export { databaseFilePath };

export function readSettingsToday(
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd(),
): SettingsToday {
  const file = databaseFilePath(env.DATABASE_URL, cwd);
  // The same test the intake's parser makes (app/api/intent/parse/route.ts): any non-empty key —
  // even a wrong one — means the sentence is sent; empty means the keyword matcher on this
  // computer answers. Only whether a key is set is read here, never the key.
  const keySet = Boolean(env.ANTHROPIC_API_KEY);
  return {
    dataFile: { path: file, exists: file ? existsSync(file) : false },
    intake: keySet ? { sentTo: "anthropic", model: DEFAULT_INTENT_ANTHROPIC_MODEL } : { sentTo: "nobody", model: null },
    version: pkg.version,
    updates: env.DOTAMI_UPDATES === "github" ? "github" : "manual",
    desktop: env.DOTAMI_DESKTOP === "1",
    receipts: receiptLockState(env),
    database: databaseLockState(env),
    receiptsSetAside: env === process.env ? receiptsSetAsideTo() : null,
    taxYear: 2026,
  };
}
