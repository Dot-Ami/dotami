import type { PrismaClient } from "@prisma/client";

import { createDatabaseClient } from "@/lib/db/client";
import { databaseKey } from "@/lib/db/lock";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * The client's own error report is turned off, because it isn't safe to print. For a request
 * built wrongly, Prisma writes a message that quotes the values in it — a statement's words, an
 * amount — to stdout, and the desktop app pipes stdout into logs/server.log
 * (docs/architecture/figures-privacy-review.md, rule 2: no figure values in logs).
 *
 * So errors are asked for as events instead, which prints nothing by itself, and the handler
 * writes one fixed line naming only the event's `target` (which part of the library spoke, such
 * as "personStatement.create"), never its message. The error that is thrown to the calling code
 * still carries the full text; the routes catch it and log only its name and code
 * (lib/api/log-error.ts). tests/prisma-log.spec.ts runs a malformed write and checks that
 * nothing it prints holds the values.
 *
 * The client opens the file through DotAmi's one database client (lib/db/client.ts, [8i]): Prisma's
 * adapter for better-sqlite3, on the file DATABASE_URL names, with the key the desktop app gave this
 * server when the file is encrypted (lib/db/lock.ts).
 */
function createClient(): PrismaClient {
  const client = createDatabaseClient({ key: databaseKey(), log: [{ emit: "event" as const, level: "error" as const }] });
  client.$on("error", (event) => {
    console.error(`[database] the database library reported an error (${describeLogTarget(event.target)})`);
  });
  return client;
}

/**
 * The event's target made safe to print. It is a module or "model.action" name — never the
 * request's values — but it comes from a library, so only plain name characters survive.
 */
function describeLogTarget(target: unknown): string {
  const plain = typeof target === "string" ? target.replace(/[^A-Za-z0-9_.:]/g, "").slice(0, 80) : "";
  return plain === "" ? "no target given" : plain;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
