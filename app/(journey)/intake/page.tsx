import { Suspense } from "react";

import { IntakePage } from "@/components/discovery/intake-page";
import { roadsV2026 } from "@/lib/engines/roads/v2026";
import { LISTED_ROAD_IDS } from "@/lib/front-door/futures";
import { roadJobNames } from "@/lib/front-door/road-jobs";
import { intakeFirstScreen } from "@/lib/journey/intake-start";
import { prisma } from "@/lib/prisma";

// Read on every visit: whether the person has a saved idea decides the first screen (issue #38).
export const dynamic = "force-dynamic";

export default async function IntakeRoutePage() {
  const firstScreen = await intakeFirstScreen(prisma);
  return (
    <Suspense>
      {/* The titles of the jobs each road is written for, for the three steps at the end (read here, on the server),
          for every road the steps may list (which ones depends on the province the person picks). */}
      <IntakePage firstScreen={firstScreen} roadJobs={roadJobNames(roadsV2026.filter((road) => LISTED_ROAD_IDS.includes(road.id)))} />
    </Suspense>
  );
}
