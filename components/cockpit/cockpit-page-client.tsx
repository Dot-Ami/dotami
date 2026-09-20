"use client";

import { Suspense } from "react";
import { CockpitPage } from "@/components/cockpit/cockpit-page";
import type { Scenario } from "@/lib/scenarios/types";

interface CockpitPageClientProps {
  initialScenario: Scenario | null;
  /** True when the URL named a venture explicitly — the session's scenario must not override it. */
  pinned?: boolean;
}

export function CockpitPageClient({ initialScenario, pinned = false }: CockpitPageClientProps) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-stone">Loading cockpit…</div>}>
      <CockpitPage initialScenario={initialScenario} pinned={pinned} />
    </Suspense>
  );
}
