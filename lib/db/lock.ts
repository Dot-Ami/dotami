/**
 * [8i] Whether this copy of DotAmi's data file is encrypted, and the key when it is (the design is
 * docs/architecture/database-encryption.md). The same pattern as the receipts' lock
 * (lib/expenses/receipts/lock.ts), with its own key and its own states.
 *
 * The desktop app's main process opens the key (desktop/database-key.mjs), encrypts the file or not as the
 * person chose, and starts this server with:
 *   DOTAMI_DATABASE_LOCK        "on" | "off" | "never" | "no-key-store"
 *   DOTAMI_DATABASE_KEY         the key, base64 (only when "on")
 *   DOTAMI_DATABASE_PLAIN_LEFT  how many plain copies of the data are still on the disk, waiting to be
 *                               encrypted or wiped (a file another program held); a count, never a name
 * A copy run from source sets none of them: it has no operating-system key store, so its data file is
 * kept unencrypted ("source"), and the settings page and What DotAmi knows about you say so.
 *
 * The key is taken out of the environment the first time it is read and kept on globalThis, so it is
 * never in the environment of anything this server might start, and every server bundle reads the same one.
 */
export type DatabaseLock =
  | { state: "on"; key: Buffer; plainLeft: number }
  /** Run from source: no operating-system key store, so the data file is kept unencrypted. */
  | { state: "source"; plainLeft: 0 }
  /** The desktop app; the person said "Not now": unencrypted, and asked again at the next start. */
  | { state: "off"; plainLeft: number }
  /** The desktop app; the person said "Never" (Settings can turn encryption on): unencrypted. */
  | { state: "never"; plainLeft: number }
  /** The desktop app, but the operating system's key store isn't available: unencrypted. */
  | { state: "no-key-store"; plainLeft: number };

export type DatabaseLockState = DatabaseLock["state"];

// A plain property name, not a symbol: the privacy scan refuses globalThis read by a computed key.
type Holder = { __dotamiDatabaseLock?: DatabaseLock };

function count(text: string | undefined): number {
  const n = Number(text ?? 0);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 1000) : 0;
}

/** Reads the lock from an environment, without changing it. */
export function readDatabaseLock(env: Record<string, string | undefined>): DatabaseLock {
  const plainLeft = count(env.DOTAMI_DATABASE_PLAIN_LEFT);
  switch (env.DOTAMI_DATABASE_LOCK) {
    case "on": {
      const key = Buffer.from(env.DOTAMI_DATABASE_KEY ?? "", "base64");
      // The main process always sends 32 bytes. Anything else is replaced by 32 zero bytes, a key that
      // opens nothing DotAmi locked (its keys are random): the database client then refuses the file with
      // its own sentence, rather than opening it as if it were plain.
      return { state: "on", key: key.length === 32 ? key : Buffer.alloc(32), plainLeft };
    }
    case "off":
    case "never":
    case "no-key-store":
      return { state: env.DOTAMI_DATABASE_LOCK, plainLeft };
    default:
      return { state: "source", plainLeft: 0 };
  }
}

/** This server's lock: read once from process.env, then the key is removed from it. */
export function databaseLock(): DatabaseLock {
  const holder = globalThis as Holder;
  if (!holder.__dotamiDatabaseLock) {
    holder.__dotamiDatabaseLock = readDatabaseLock(process.env);
    delete process.env.DOTAMI_DATABASE_KEY;
  }
  return holder.__dotamiDatabaseLock;
}

/** The key the data file opens with, or null for a plain file. Server only: never sent to a page. */
export function databaseKey(): Buffer | null {
  const lock = databaseLock();
  return lock.state === "on" ? lock.key : null;
}

/** Only what a page may see: the state and the count, never the key. */
export function databaseLockState(env: Record<string, string | undefined> = process.env): { state: DatabaseLockState; plainLeft: number } {
  const lock = env === process.env ? databaseLock() : readDatabaseLock(env);
  return { state: lock.state, plainLeft: lock.plainLeft };
}

/** For the tests: forget what was read, so the next databaseLock() reads the environment again. */
export function __resetDatabaseLockForTests() {
  delete (globalThis as Holder).__dotamiDatabaseLock;
}
