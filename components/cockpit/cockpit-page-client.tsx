"use client";

import { Suspense } from "react";
import { CockpitPage } from "@/components/cockpit/cockpit-page";
import { ReadOnlyJourneyProvider } from "@/components/shared/journey-provider";
import { cockpitWords } from "@/lib/cockpit/words";
import { exampleById } from "@/lib/examples";
import type { Scenario } from "@/lib/scenarios/types";

/** While the cockpit's code loads: the same line for a saved idea and for an example. */
const loading = <div className="flex h-screen items-center justify-center text-stone">{cockpitWords.loading}</div>;

interface CockpitPageClientProps {
  initialScenario: Scenario | null;
  /** True when the URL named a venture explicitly — the session's scenario must not override it. */
  pinned?: boolean;
}

export function CockpitPageClient({ initialScenario, pinned = false }: CockpitPageClientProps) {
  return (
    <Suspense fallback={loading}>
      <CockpitPage initialScenario={initialScenario} pinned={pinned} />
    </Suspense>
  );
}

/**
 * The cockpit for an invented example future, by its id (docs/ui-spec/example/_index.md). It is drawn under
 * a journey that hands out the example and never touches the tab's own (no sessionStorage read or write).
 * The id comes from the address; the page has already refused any id that isn't an example.
 */
export function ExampleCockpitClient({ exampleId }: { exampleId: string }) {
  const example = exampleById(exampleId);
  if (!example) return null;
  return (
    <ReadOnlyJourneyProvider scenario={example.scenario}>
      <Suspense fallback={loading}>
        <CockpitPage initialScenario={example.scenario} example={example} />
      </Suspense>
    </ReadOnlyJourneyProvider>
  );
}
