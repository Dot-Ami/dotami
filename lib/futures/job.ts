import type { PrismaClient } from "@prisma/client";

import { oasisJobByCode } from "@/lib/engines/oasis/v2026";
import { requireVenture } from "@/lib/figures/store";

import { FutureInputError } from "./types";

/**
 * The job the person picks as closest to the work they'd do themselves (docs/architecture/future-cockpit.md
 * § 6, "Skills, and the government's list for your pick of job, as built"; the maintainer's decision 5 of
 * 2026-10-11). Kept on the idea as the job's OaSIS code and the moment it was picked; the cockpit then
 * shows the government's skills list for that job, tagged "your pick of job".
 *
 * Only the person picks it. Since task 25e (2026-10-21) a road names the jobs it is written for
 * (`Road.codes.occupations`: road 1 is written for 72311 Cabinetmakers, road 0 for no particular job), so Pick a
 * future can offer the road written for the job the person picked (`roadsWrittenForJob`). That runs one way only:
 * from the person's pick to the roads. Nothing in DotAmi picks or changes a job from a road, a business, the
 * idea's words or anything else the person said; the job is still only their own pick, and Skip leaves none.
 */

/**
 * Keeps the person's pick, a job code from the dataset ("72311.00"), or takes it back (null). Anything
 * else is refused and the pick already there stays. Picking the same job again keeps the moment it was
 * first picked, since the answer didn't change.
 */
export async function pickJob(prisma: PrismaClient, ventureId: string, code: unknown): Promise<void> {
  await requireVenture(prisma, ventureId);
  if (code !== null && (typeof code !== "string" || !oasisJobByCode(code))) {
    throw new FutureInputError("That isn't a job on the government's list. Pick one from the search.");
  }
  const current = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { occupationCode: true } });
  if (current.occupationCode === code) return;
  await prisma.venture.update({
    where: { id: ventureId },
    data: { occupationCode: code, occupationPickedAt: code === null ? null : new Date() },
  });
}
