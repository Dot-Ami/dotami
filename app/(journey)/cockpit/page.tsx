import { loadLatestVentureScenarioForStubUser } from "@/lib/db/load-latest-venture-for-stub-user";
import { loadVentureScenarioById } from "@/lib/db/ventures";
import { prisma } from "@/lib/prisma";
import { CockpitPageClient } from "@/components/cockpit/cockpit-page-client";

export const dynamic = "force-dynamic";

/**
 * First paint: `?venture=<id>` (from the ideas page) loads that venture and pins it — the
 * session's scenario does not override an explicit choice. Otherwise the most recently saved
 * venture, else null and the cockpit shows its empty state. S2.5.4h/i.
 */
async function resolveInitialScenario(ventureId: string | undefined) {
  try {
    if (ventureId) return await loadVentureScenarioById(prisma, ventureId);
    return await loadLatestVentureScenarioForStubUser(prisma);
  } catch {
    return null;
  }
}

export default async function CockpitRoutePage({
  searchParams,
}: {
  searchParams?: Promise<{ venture?: string }>;
}) {
  const ventureId = (await searchParams)?.venture?.trim() || undefined;
  const scenario = await resolveInitialScenario(ventureId);
  return <CockpitPageClient initialScenario={scenario} pinned={Boolean(ventureId && scenario)} />;
}
