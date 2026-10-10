import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type Prisma } from "@prisma/client";

import { databaseFilePath } from "@/lib/db/database-file";

/**
 * [8i] The one way DotAmi opens its database (docs/architecture/database-encryption.md § 3).
 *
 * Prisma Client runs every query through Prisma's adapter for `better-sqlite3`, and the package
 * behind that name is `better-sqlite3-multiple-ciphers` (package.json "dependencies" and "overrides";
 * tests/database-package.spec.ts checks the override holds): SQLite with an encryption extension. A
 * file with a key is opened with it before any query; a file without one is opened as it is.
 *
 * Every Prisma Client in the repository is made here (tests/database-client.spec.ts fails on one made
 * anywhere else, apart from the referees and controls it names), so the app, the seed, the unit tests
 * and the browser tests all open the file the same way.
 *
 * What the adapter does differently from Prisma's built-in engine, each handled here:
 * - Dates: the engine stores a DateTime as a whole number of milliseconds; the adapter would store
 *   ISO-8601 text. `timestampFormat: "unixepoch-ms"` keeps the engine's shape (tests/db-dates.spec.ts).
 * - Transactions: the adapter has one connection, and a query from another request that arrives while
 *   an interactive transaction is open runs inside it, and is undone with it if it rolls back
 *   (measured 2026-10-10: a write made by a second request during a transaction that then failed was
 *   lost, with no error). The engine kept it, on a connection of its own. So every query waits its
 *   turn here, a transaction holding the turn until it commits or rolls back (SerializedAdapter).
 * - "Database is locked" (another program writing the file) comes back from the adapter in a form
 *   Prisma 6.19 can't read; it is passed on as SQLite's own error, as the engine did (busyAsSqlite).
 * - Prisma connects as soon as a client is made, not at its first query, and a failure there would be
 *   an error nothing is waiting for. So the file is opened at the first query instead, inside the
 *   first turn, and a failure is that query's error; the next query tries again.
 * - Its debug output prints every query's values when the DEBUG environment variable names it; the
 *   desktop app removes DEBUG from its server's environment (desktop/main.mjs serverEnv).
 */

// The adapter's own types, read from it rather than imported from @prisma/driver-adapter-utils, which
// DotAmi doesn't name in package.json (it comes with the adapter).
type AdapterFactory = NonNullable<Prisma.PrismaClientOptions["adapter"]>;
type SqlDriverAdapter = Awaited<ReturnType<PrismaBetterSQLite3["connect"]>>;
type Transaction = Awaited<ReturnType<SqlDriverAdapter["startTransaction"]>>;
type SqlQuery = Parameters<SqlDriverAdapter["queryRaw"]>[0];
type IsolationLevel = Parameters<SqlDriverAdapter["startTransaction"]>[0];
/** The part of a better-sqlite3 connection used here (the package's own types aren't reachable through its "exports"). */
interface Connection {
  pragma(sql: string): unknown;
  prepare(sql: string): { get(): unknown };
}

/** The adapter's name, as Prisma knows it. */
const ADAPTER_NAME = "@prisma/adapter-better-sqlite3";
const KEY_BYTES = 32;

/** Thrown at the first query if the file can't be opened (with this key, or without one). Nothing on the disk is changed. */
export class DataFileUnreadable extends Error {
  readonly keyed: boolean;
  constructor(keyed: boolean) {
    super(
      keyed
        ? "DotAmi couldn't open its data file with this computer's key. Nothing was changed: the file may be locked with another key, or damaged."
        : "DotAmi couldn't open its data file. Nothing was changed: the file may be encrypted by the desktop app, which is the only copy of DotAmi that can open it, or damaged.",
    );
    this.name = "DataFileUnreadable";
    this.keyed = keyed;
  }
}

export interface DatabaseClientOptions {
  /**
   * The data file: a `file:` URL as DATABASE_URL gives it (a relative path is read from prisma/, as
   * Prisma does). Absent or null: DATABASE_URL itself, read when the database is first used.
   */
  url?: string | null;
  /** The 32-byte key the file is encrypted with. Absent or null: the file is plain. */
  key?: Buffer | null;
  log?: Prisma.PrismaClientOptions["log"];
}

/** A Prisma Client on DotAmi's data file, opened through the adapter (and the key, when there is one). */
export function createDatabaseClient<O extends DatabaseClientOptions>(options?: O): PrismaClient<{ log: O["log"] }> {
  const { url = null, key = null, log } = options ?? {};
  if (key !== null && (!Buffer.isBuffer(key) || key.length !== KEY_BYTES)) throw new Error("a database key is 32 bytes");
  return new PrismaClient({ adapter: new KeyedAdapterFactory(url, key), log }) as PrismaClient<{ log: O["log"] }>;
}

/** The SQL that gives SQLite3 Multiple Ciphers a raw 256-bit key: used as the key itself, with no key derivation. */
export function keyPragma(key: Buffer): string {
  return `key = "x'${key.toString("hex")}'"`;
}

/**
 * Opens the file with Prisma's adapter and sets the key on its connection before Prisma Client sees
 * it. The adapter has no setting for a key; its connection is the `client` property of what it returns.
 */
async function openAdapter(url: string | null, key: Buffer | null): Promise<SqlDriverAdapter> {
  const file = databaseFilePath(url ?? process.env.DATABASE_URL);
  if (!file) throw new Error("DATABASE_URL must be a SQLite file: URL");
  const inner = await new PrismaBetterSQLite3({ url: file }, { timestampFormat: "unixepoch-ms" }).connect();
  const client = (inner as unknown as { client?: Connection }).client;
  if (!client || typeof client.pragma !== "function") {
    await inner.dispose();
    // A newer adapter moved its connection: refuse rather than run without the key.
    throw new Error("the database adapter's connection isn't where DotAmi sets the key");
  }
  try {
    if (key) client.pragma(keyPragma(key));
    // The key is only checked when a page of the file is read: read one now, so a wrong or missing key
    // fails here with DotAmi's own sentence, before any query of the app's runs.
    client.prepare("SELECT count(*) FROM sqlite_master").get();
  } catch {
    await inner.dispose();
    throw new DataFileUnreadable(key !== null);
  }
  return inner;
}

class KeyedAdapterFactory implements AdapterFactory {
  readonly provider = "sqlite" as const;
  readonly adapterName = ADAPTER_NAME;
  readonly #url: string | null;
  readonly #key: Buffer | null;

  constructor(url: string | null, key: Buffer | null) {
    this.#url = url;
    this.#key = key;
  }

  async connect(): Promise<SqlDriverAdapter> {
    return new SerializedAdapter(() => openAdapter(this.#url, this.#key));
  }
}

/** A first-come, first-served lock: `acquire` resolves with the function that releases it. */
class TurnLock {
  #tail: Promise<void> = Promise.resolve();

  acquire(): Promise<() => void> {
    let release!: () => void;
    const mine = new Promise<void>((resolve) => (release = resolve));
    const before = this.#tail;
    this.#tail = before.then(() => mine);
    return before.then(() => {
      let released = false;
      return () => {
        if (released) return;
        released = true;
        release();
      };
    });
  }
}

/**
 * The adapter with every query taking its turn: a query outside a transaction waits for any open
 * transaction to finish, and a transaction waits for the queries before it. So a transaction that
 * rolls back undoes only its own writes, as with Prisma's built-in engine. Queries inside a
 * transaction go through the transaction object, which already holds the turn. The file is opened
 * in the first turn (openAdapter).
 */
class SerializedAdapter implements SqlDriverAdapter {
  readonly provider = "sqlite" as const;
  readonly adapterName = ADAPTER_NAME;
  readonly #open: () => Promise<SqlDriverAdapter>;
  readonly #lock = new TurnLock();
  #inner: SqlDriverAdapter | null = null;

  constructor(open: () => Promise<SqlDriverAdapter>) {
    this.#open = open;
  }

  /** The open connection, opened now if it isn't yet. Called only while holding the turn. */
  async #connection(): Promise<SqlDriverAdapter> {
    this.#inner ??= await this.#open();
    return this.#inner;
  }

  async #inTurn<T>(work: (inner: SqlDriverAdapter) => Promise<T>): Promise<T> {
    const release = await this.#lock.acquire();
    try {
      const inner = await this.#connection();
      return await busyAsSqlite(() => work(inner));
    } finally {
      release();
    }
  }

  queryRaw(query: SqlQuery) {
    return this.#inTurn((inner) => inner.queryRaw(query));
  }

  executeRaw(query: SqlQuery) {
    return this.#inTurn((inner) => inner.executeRaw(query));
  }

  executeScript(script: string) {
    return this.#inTurn((inner) => inner.executeScript(script));
  }

  async startTransaction(isolationLevel?: IsolationLevel): Promise<Transaction> {
    const release = await this.#lock.acquire();
    let tx: Transaction;
    try {
      tx = await (await this.#connection()).startTransaction(isolationLevel);
    } catch (error) {
      release();
      throw error;
    }
    // The turn is held until Prisma ends the transaction, whichever way.
    return {
      provider: tx.provider,
      adapterName: tx.adapterName,
      options: tx.options,
      queryRaw: (query) => busyAsSqlite(() => tx.queryRaw(query)),
      executeRaw: (query) => busyAsSqlite(() => tx.executeRaw(query)),
      commit: () => tx.commit().finally(release),
      rollback: () => tx.rollback().finally(release),
    };
  }

  async dispose() {
    const release = await this.#lock.acquire();
    try {
      await this.#inner?.dispose();
      this.#inner = null;
    } finally {
      release();
    }
  }
}

/**
 * SQLite's "database is locked" (SQLITE_BUSY: another program is writing the file) as Prisma 6.19 can
 * read it. The adapter reports it with a kind ("SocketTimeout") that Prisma 6.19's engine doesn't know,
 * which turns it into an "unknown variant" error with SQLite's own words lost (measured 2026-10-10 with
 * tests/privacy-delete.spec.ts's lock). Passed on instead as an SQLite error with its extended code and
 * SQLite's message, as the built-in engine did. The message is SQLite's, never a query's values.
 */
async function busyAsSqlite<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const cause = (error as { name?: unknown; cause?: { kind?: unknown; originalMessage?: unknown } }).cause;
    if ((error as { name?: unknown }).name === "DriverAdapterError" && cause?.kind === "SocketTimeout") {
      const message = typeof cause.originalMessage === "string" ? cause.originalMessage : "database is locked";
      // The shape Prisma's engine reads as an adapter error: a name and an object `cause`.
      throw Object.assign(new Error(message), { name: "DriverAdapterError", cause: { kind: "sqlite", extendedCode: 5, message } });
    }
    throw error;
  }
}
