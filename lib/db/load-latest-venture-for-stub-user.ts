import type { PrismaClient } from "@prisma/client";

import { mapVentureRowToScenario } from "@/lib/db/prisma-venture-to-scenario";
import type { Scenario } from "@/lib/scenarios/types";

const STUB_EMAIL = process.env.STUB_USER_EMAIL ?? "stub@dotami.local";

/**
 * Returns the most recently updated venture (and scenario state) for the stub user, if any.
 * Used for v0 single-user save/resume on first paint.
 */
export async function loadLatestVentureScenarioForStubUser(
  prisma: PrismaClient,
): Promise<Scenario | null> {
  const user = await prisma.user.findUnique({
    where: { email: STUB_EMAIL },
  });
  if (!user) {
    return null;
  }

  const row = await prisma.venture.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { scenarioState: true },
  });

  if (!row) {
    return null;
  }

  return mapVentureRowToScenario(row);
}
