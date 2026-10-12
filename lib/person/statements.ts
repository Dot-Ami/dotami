import type { PrismaClient } from "@prisma/client";

import type { PersonStatement } from "./types";

const STUB_EMAIL = process.env.STUB_USER_EMAIL ?? "stub@dotami.local";

/**
 * Database side of the person store (S2.5.4a). Two operations only — list and append.
 * There is deliberately no update and no way to delete one statement: the charter's "never
 * summarised, newer beats older" rule is enforced by the absence of the code path, not by a check.
 * The only delete is every statement at once, from the Delete menu on /your-data
 * (lib/privacy/delete.ts; the maintainer's decision, 2026-10-07) — removing all of them is the
 * person taking their words back, not editing an old one away.
 */

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rowToStatement(row: {
  id: string;
  text: string;
  saidAt: Date;
  createdAt: Date;
  kind?: string | null;
  venture?: { id: string; name: string } | null;
}): PersonStatement {
  return {
    id: row.id,
    text: row.text,
    saidAt: toIsoDate(row.saidAt),
    source: "typed",
    sourceRef: "app",
    recordedAt: row.createdAt.toISOString(),
    // The idea a front-door sentence was typed for, so the lists can say so (not "typed here").
    ...(row.venture ? { idea: { id: row.venture.id, name: row.venture.name } } : {}),
    // The answer to "where do you want to be", so the cockpit can put it on top (2026-10-11).
    ...(row.kind === "destination" ? { kind: "destination" as const } : {}),
  };
}

/** All typed statements for the stub user. Empty when the user row does not exist yet. */
export async function listTypedStatements(prisma: PrismaClient): Promise<PersonStatement[]> {
  const user = await prisma.user.findUnique({ where: { email: STUB_EMAIL } });
  if (!user) return [];
  const rows = await prisma.personStatement.findMany({
    where: { userId: user.id },
    orderBy: [{ saidAt: "desc" }, { createdAt: "desc" }],
    include: { venture: { select: { id: true, name: true } } },
  });
  return rows.map(rowToStatement);
}

/** Appends one statement. Creates the stub user on first write, same as the venture upsert does. */
export async function addTypedStatement(
  prisma: PrismaClient,
  input: { text: string; saidAt: string },
  kind: "destination" | null = null,
): Promise<PersonStatement> {
  const user = await prisma.user.upsert({
    where: { email: STUB_EMAIL },
    create: { email: STUB_EMAIL, name: "Stub user" },
    update: {},
  });
  const row = await prisma.personStatement.create({
    data: {
      userId: user.id,
      text: input.text,
      saidAt: new Date(`${input.saidAt}T00:00:00Z`),
      kind,
    },
  });
  return rowToStatement(row);
}

/**
 * Appends the person's answer to "where do you want to be" (the future cockpit's top line;
 * docs/architecture/future-cockpit.md § 7, Storage as built). It is one of their statements like any
 * other, word for word and dated, only marked as the destination. A change is a new statement, never an
 * edit: the newest destination is the current one, and the older ones stay. The caller checks the words
 * and the day the way the statements route does (STATEMENT_MAX_CHARS, isValidSaidAt).
 */
export async function addDestination(prisma: PrismaClient, input: { text: string; saidAt: string }): Promise<PersonStatement> {
  return addTypedStatement(prisma, input, "destination");
}

/** The person's current destination: their newest one, by the day they said it, or null. */
export async function latestDestination(prisma: PrismaClient): Promise<PersonStatement | null> {
  const user = await prisma.user.findUnique({ where: { email: STUB_EMAIL } });
  if (!user) return null;
  const row = await prisma.personStatement.findFirst({
    where: { userId: user.id, kind: "destination" },
    orderBy: [{ saidAt: "desc" }, { createdAt: "desc" }],
  });
  return row ? rowToStatement(row) : null;
}
