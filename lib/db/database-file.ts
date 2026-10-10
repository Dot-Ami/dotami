import path from "node:path";

/**
 * The database file a `DATABASE_URL` points at, as an absolute path — or null when it isn't a
 * SQLite file URL. Prisma reads a relative path from the folder holding schema.prisma, which is
 * why `file:./dotami.db` lands in prisma/ (the same rule .env.example states). The database client
 * (lib/db/client.ts) opens the file through this too, so the app, the settings page and the Delete
 * menu always mean the same file.
 */
export function databaseFilePath(databaseUrl: string | undefined, cwd: string = process.cwd()): string | null {
  const url = databaseUrl?.trim();
  if (!url?.startsWith("file:")) return null;
  // Connection options ride after "?" (e.g. ?connection_limit=1); they are not part of the path.
  const file = url.slice("file:".length).split("?")[0];
  if (!file) return null;
  return path.isAbsolute(file) ? path.normalize(file) : path.resolve(cwd, "prisma", file);
}
