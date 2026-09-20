import type { PrismaClient } from "@prisma/client";

import type { PersonStatement } from "./types";

const STUB_EMAIL = process.env.STUB_USER_EMAIL ?? "stub@dotami.local";

/**
 * Postgres side of the person store (S2.5.4a). Two operations only — list and append.
 * There is deliberately no update and no delete: the charter's "never summarised, newer
 * beats older" rule is enforced by the absence of the code path, not by a check.
 */

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rowToStatement(row: { id: string; text: string; saidAt: Date; createdAt: Date }): PersonStatement {
  return {
    id: row.id,
    text: row.text,
    saidAt: toIsoDate(row.saidAt),
    source: "typed",
    sourceRef: "app",
    recordedAt: row.createdAt.toISOString(),
  };
}

/** All typed statements for the stub user. Empty when the user row does not exist yet. */
export async function listTypedStatements(prisma: PrismaClient): Promise<PersonStatement[]> {
  const user = await prisma.user.findUnique({ where: { email: STUB_EMAIL } });
  if (!user) return [];
  const rows = await prisma.personStatement.findMany({
    where: { userId: user.id },
    orderBy: [{ saidAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(rowToStatement);
}

/** Appends one statement. Creates the stub user on first write, same as the venture upsert does. */
export async function addTypedStatement(
  prisma: PrismaClient,
  input: { text: string; saidAt: string },
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
    },
  });
  return rowToStatement(row);
}
