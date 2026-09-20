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
import {
  defaultIntakeDraft,
  JOURNEY_STORAGE_KEY,
  type IntakeDraft,
  type JourneyState,
} from "@/lib/journey/types";

interface JourneyContextValue {
  intake: IntakeDraft;
  scenario: Scenario | null;
  /**
   * False until the `sessionStorage` read effect has run. Consumers that pick an initial
   * scenario synchronously (e.g. cockpit's `useState`, seeded before this hydrates) need
   * this to know when `scenario` has settled, so they can sync once instead of racing it
   * (audit-2026-07-04 C2).
   */
  hydrated: boolean;
  setIntake: (updater: IntakeDraft | ((prev: IntakeDraft) => IntakeDraft)) => void;
  setScenario: (scenario: Scenario | null) => void;
  resetJourney: () => void;
}

const JourneyContext = createContext<JourneyContextValue | null>(null);

function readStoredState(): Partial<JourneyState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(JOURNEY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<JourneyState>;
  } catch {
    return null;
  }
}

function writeStoredState(state: JourneyState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [intake, setIntakeState] = useState<IntakeDraft>(defaultIntakeDraft);
  const [scenario, setScenarioState] = useState<Scenario | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredState();
    if (stored?.intake) setIntakeState({ ...defaultIntakeDraft(), ...stored.intake });
    if (stored?.scenario) setScenarioState(stored.scenario);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredState({ intake, scenario });
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

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error("useJourney must be used within JourneyProvider");
  return ctx;
}
