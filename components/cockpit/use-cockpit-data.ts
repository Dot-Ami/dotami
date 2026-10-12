"use client";

import { useCallback, useEffect, useState } from "react";

import type { FigureView } from "@/lib/figures/types";
import type { FutureView } from "@/lib/futures/future";
import type { SkillMarkView } from "@/lib/futures/skill-marks";
import type { StepProgressView } from "@/lib/futures/step-progress";

/** What GET /api/futures/<id> answers (app/api/futures/[id]/route.ts). */
export interface KeptForIdea {
  future: FutureView;
  progress: StepProgressView[];
  skillMarks: SkillMarkView[];
  incomeWanted: { amountCents: number; agreedOn: string } | null;
  firstWords: { text: string; saidAt: string } | null;
  /** The person's newest answer to "where do you want to be", word for word with its day; null when none. */
  destination: { text: string; saidAt: string } | null;
}

/**
 * Everything the cockpit reads for the idea on screen: which saved idea it is, its figures (every state,
 * for the reminder banner; the page passes only agreed ones on), and what the cockpit keeps for it. An
 * idea not saved yet (only in this tab) has none of it, and the screen says nothing can be kept.
 * Offline or with no database, the map still runs on the idea's own answers, as it always has.
 */
export function useCockpitData(scenarioId: string | null) {
  const [ventureId, setVentureId] = useState<string | null>(null);
  const [figures, setFigures] = useState<FigureView[] | null>(null);
  const [kept, setKept] = useState<KeptForIdea | null>(null);

  const loadFigures = useCallback(async (id: string) => {
    const res = await fetch(`/api/figures?venture=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (res.ok) setFigures(((await res.json()) as { figures?: FigureView[] }).figures ?? []);
  }, []);

  const loadKept = useCallback(async (id: string) => {
    const res = await fetch(`/api/futures/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (res.ok) setKept((await res.json()) as KeptForIdea);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setVentureId(null);
    setFigures(null);
    setKept(null);
    if (!scenarioId) return;
    (async () => {
      try {
        const ventures = (await (await fetch("/api/ventures", { cache: "no-store" })).json()) as {
          ventures?: { id: string; scenarioId: string | null }[];
        };
        const venture = ventures.ventures?.find((v) => v.scenarioId === scenarioId);
        if (!venture || cancelled) return;
        setVentureId(venture.id);
        await Promise.all([loadFigures(venture.id), loadKept(venture.id)]);
      } catch {
        // Offline or no database: the map runs on the idea's own answers.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scenarioId, loadFigures, loadKept]);

  /** Reads the idea's figures and what the cockpit keeps again, after the person saved something. */
  const reload = useCallback(async () => {
    if (!ventureId) return;
    try {
      await Promise.all([loadFigures(ventureId), loadKept(ventureId)]);
    } catch {
      // The screen keeps what it showed; the next save or visit reads again.
    }
  }, [ventureId, loadFigures, loadKept]);

  return { ventureId, figures, kept, reload };
}
