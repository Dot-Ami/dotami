// Types for desktop/migrate.mjs, so the TypeScript tests can import it.
export class MigrationRefused extends Error {}

export function migrate(
  dbFile: string,
  migrationsDir: string,
  options?: { backupDir?: string; now?: () => number; log?: (line: string) => void },
): { applied: string[]; backup: string | null };
