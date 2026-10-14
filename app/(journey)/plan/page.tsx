import type { Metadata } from "next";

import { PlanNotFound, PlanPage, PlanReadFailed } from "@/components/cockpit/plan-page";
import { buildPlan, type PlanArgs } from "@/lib/cockpit/plan";
import { cockpitWords } from "@/lib/cockpit/words";
import { dayOnThisComputer } from "@/lib/futures/person";
import { readPlan } from "@/lib/futures/read-plan";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// The tab's name, which is also what a saved PDF is named after in most print windows.
export const metadata: Metadata = { title: `${cockpitWords.plan.title} · DotAmi` };

/**
 * Your plan (docs/ui-spec/plan/_index.md, issue #41): `?venture=<id>` names the idea. Drawn on the server
 * for each visit from what DotAmi keeps, so it asks nothing, keeps nothing and makes no request of its
 * own; Print is the browser's. Today is this computer's own day: DotAmi's server runs on the person's
 * computer, so its clock is theirs.
 */
export default async function PlanRoutePage({ searchParams }: { searchParams?: Promise<{ venture?: string }> }) {
  const ventureId = (await searchParams)?.venture?.trim() || null;
  if (!ventureId) return <PlanNotFound />;
  const backHref = `/cockpit?venture=${encodeURIComponent(ventureId)}`;
  let args: PlanArgs | null;
  try {
    args = await readPlan(prisma, ventureId, dayOnThisComputer(new Date()));
  } catch {
    // The read failed (the file locked or unreachable). That is not "no such idea": the page says the read
    // failed and nothing changed. Nothing is logged, as before.
    return <PlanReadFailed backHref={backHref} />;
  }
  // Null only when DotAmi keeps no idea with this id.
  if (!args) return <PlanNotFound />;
  return <PlanPage view={buildPlan(args)} backHref={backHref} />;
}
