import { Suspense } from "react";

import { IntakePage } from "@/components/discovery/intake-page";
import { intakeFirstScreen } from "@/lib/journey/intake-start";
import { prisma } from "@/lib/prisma";

// Read on every visit: whether the person has a saved idea decides the first screen (issue #38).
export const dynamic = "force-dynamic";

export default async function IntakeRoutePage() {
  const firstScreen = await intakeFirstScreen(prisma);
  return (
    <Suspense>
      <IntakePage firstScreen={firstScreen} />
    </Suspense>
  );
}
