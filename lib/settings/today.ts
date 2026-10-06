import { existsSync } from "node:fs";
import path from "node:path";

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
  /** The tax year the catalogs cover (lib/engines/<engine>/v2026). Becomes a setting with [11i]. */
  taxYear: number;
}

/**
 * The database file a `DATABASE_URL` points at, as an absolute path — or null when it isn't a
 * SQLite file URL. Prisma reads a relative path from the folder holding schema.prisma, which is
 * why `file:./dotami.db` lands in prisma/ (the same rule .env.example states).
 */
export function databaseFilePath(databaseUrl: string | undefined, cwd: string = process.cwd()): string | null {
  const url = databaseUrl?.trim();
  if (!url?.startsWith("file:")) return null;
  // Connection options ride after "?" (e.g. ?connection_limit=1); they are not part of the path.
  const file = url.slice("file:".length).split("?")[0];
  if (!file) return null;
  return path.isAbsolute(file) ? path.normalize(file) : path.resolve(cwd, "prisma", file);
}

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
    taxYear: 2026,
  };
}
