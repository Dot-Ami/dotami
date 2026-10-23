import type { PrismaClient } from "@prisma/client";

import { regionThePersonPicked } from "@/lib/engines/research-kit/v2026/economic-regions";
import { requireVenture } from "@/lib/figures/store";
import { asksWhere } from "@/lib/front-door/three-steps";
import { placeCodeFor } from "@/lib/places/codes";

import { FutureInputError } from "./types";

/**
 * About this job's region **Change** (docs/ui-spec/cockpit/about-this-job.md, row 2; task 28h): the person's
 * answer to "Which region are you in?", kept on the idea as Pick a future's step 2b keeps it
 * (docs/ui-spec/futures/02-where-you-are.md, *What is kept*): one of Alberta's eight economic-region codes, or
 * "dont-know", with the moment it was set. Also how a person who picked their job later in the skills list (and so
 * was never asked step 2) sets a region for the first time.
 *
 * Only where the region question exists (Alberta in this version): an idea anywhere else is refused, since no
 * region is asked there (the maintainer's call 2 of 2026-10-21). Only an answer the drop-down offers: anything else
 * is refused and the answer already kept stays. The area is never set or changed here, and the region is never
 * worked out from it. The same answer again keeps the moment it was first given, since the answer didn't change.
 */
export async function changeRegion(prisma: PrismaClient, ventureId: string, value: unknown): Promise<void> {
  await requireVenture(prisma, ventureId);
  const row = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { province: true, economicRegion: true } });
  // Read the way GET /api/futures/<id> reads it: "AB" or "CA-AB" is Alberta; anything else is no province.
  const place = placeCodeFor(row.province);
  const province = place?.startsWith("CA-") ? place.slice(3) : null;
  if (!asksWhere(province)) {
    throw new FutureInputError("DotAmi asks which region you're in only in Alberta in this version.");
  }
  const picked = typeof value === "string" ? regionThePersonPicked(value, province) : null;
  if (picked === null || (picked.kind !== "region" && picked.kind !== "dont-know")) {
    throw new FutureInputError("That isn't one of the answers the region question offers. Pick one from the list.");
  }
  if (row.economicRegion === value) return;
  await prisma.venture.update({ where: { id: ventureId }, data: { economicRegion: value as string, economicRegionSetAt: new Date() } });
}
