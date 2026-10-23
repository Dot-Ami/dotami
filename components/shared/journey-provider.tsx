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
import { forWindowStorage, fromWindowStorage } from "@/lib/journey/window-storage";

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

/** The journey as this tab's window storage holds it (exported for tests/prerelease-honesty.spec.ts). */
export function readJourneyFromWindow(): Partial<JourneyState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(JOURNEY_STORAGE_KEY);
    if (!raw) return null;
    // Your destination's answers are never read from the window, even where an older copy wrote them
    // (lib/journey/window-storage.ts); the first write after loading then takes them out of it.
    return fromWindowStorage(JSON.parse(raw) as Partial<JourneyState>);
  } catch {
    return null;
  }
}

/** Writes the journey to this tab's window storage, without Your destination's answers. */
export function writeJourneyToWindow(state: JourneyState) {
  if (typeof window === "undefined") return;
  try {
    // Without Your destination's answers: they stay in this page's memory, and in the data file where
    // the design keeps them (lib/journey/window-storage.ts).
    sessionStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(forWindowStorage(state)));
  } catch {
    // ignore quota errors
  }
}

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [intake, setIntakeState] = useState<IntakeDraft>(defaultIntakeDraft);
  const [scenario, setScenarioState] = useState<Scenario | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readJourneyFromWindow();
    if (stored?.intake) setIntakeState({ ...defaultIntakeDraft(), ...stored.intake });
    if (stored?.scenario) setScenarioState(stored.scenario);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeJourneyToWindow({ intake, scenario });
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
 * For a page that must never touch the tab's journey: the invented example future (app/example/,
 * docs/ui-spec/example/_index.md). It hands out the scenario it is given and nothing else: it never reads
 * or writes sessionStorage, and its setters do nothing, so the journey a person has going in this tab is
 * exactly as it was when they come back.
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
