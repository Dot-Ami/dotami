"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Scenario } from "@/lib/scenarios/types";
import { heldJourney, holdJourney } from "@/lib/journey/held-journey";
import { defaultIntakeDraft, type IntakeDraft } from "@/lib/journey/types";
import { removeRetiredWindowStorage } from "@/lib/journey/window-storage";

interface JourneyContextValue {
  intake: IntakeDraft;
  scenario: Scenario | null;
  /**
   * False until the effect that takes up the journey held in the window's memory has run. Consumers that
   * pick an initial scenario synchronously (e.g. cockpit's `useState`, seeded before this hydrates) need
   * this to know when `scenario` has settled, so they can sync once instead of racing it
   * (audit-2026-07-04 C2).
   */
  hydrated: boolean;
  setIntake: (updater: IntakeDraft | ((prev: IntakeDraft) => IntakeDraft)) => void;
  setScenario: (scenario: Scenario | null) => void;
  resetJourney: () => void;
}

const JourneyContext = createContext<JourneyContextValue | null>(null);

/**
 * The journey: the intake in progress, *Your destination*'s answers and the idea open on the map. Held in the
 * window's memory only, never in its storage (2026-10-24; lib/journey/window-storage.ts says why, and where
 * each answer is kept instead). This provider is in app/(journey)/layout.tsx, so it is unmounted on Mara's
 * example; the memory it holds the journey in (lib/journey/held-journey.ts) outlives it, so the journey is
 * there again on the way back. A reload, a new window or the desktop app's Go menu starts it afresh.
 */
export function JourneyProvider({ children }: { children: ReactNode }) {
  const [intake, setIntakeState] = useState<IntakeDraft>(defaultIntakeDraft);
  const [scenario, setScenarioState] = useState<Scenario | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // What an older DotAmi left in the window's storage goes, unread, when a journey page opens.
    removeRetiredWindowStorage();
    const held = heldJourney();
    if (held) {
      setIntakeState(held.intake);
      setScenarioState(held.scenario);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Not before the held journey is taken up, or the empty first render would replace it.
    if (!hydrated) return;
    holdJourney({ intake, scenario });
  }, [hydrated, intake, scenario]);

  const setIntake = useCallback(
    (updater: IntakeDraft | ((prev: IntakeDraft) => IntakeDraft)) => {
      setIntakeState((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    [],
  );

  const setScenario = useCallback((next: Scenario | null) => {
    setScenarioState(next);
  }, []);

  const resetJourney = useCallback(() => {
    setIntakeState(defaultIntakeDraft());
    setScenarioState(null);
  }, []);

  const value = useMemo(
    () => ({
      intake,
      scenario,
      hydrated,
      setIntake,
      setScenario,
      resetJourney,
    }),
    [intake, scenario, hydrated, setIntake, setScenario, resetJourney],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

const NOTHING = () => {};

/**
 * For a page that must never touch the person's journey: the invented example future (app/example/,
 * docs/ui-spec/example/_index.md). It hands out the scenario it is given and nothing else: it never reads or
 * holds the journey kept in the window's memory, and its setters do nothing, so the journey a person has going
 * is exactly as it was when they come back.
 */
export function ReadOnlyJourneyProvider({ scenario, children }: { scenario: Scenario; children: ReactNode }) {
  const value = useMemo<JourneyContextValue>(
    () => ({
      intake: defaultIntakeDraft(),
      scenario,
      hydrated: true,
      setIntake: NOTHING,
      setScenario: NOTHING,
      resetJourney: NOTHING,
    }),
    [scenario],
  );
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error("useJourney must be used within JourneyProvider");
  return ctx;
}
