import { generalRoadV2026, roadsWrittenForJob, type Road } from "@/lib/engines/roads/v2026";
import { pickWords } from "@/lib/front-door/words";

/**
 * Step 3 of the three steps, the road match (docs/ui-spec/futures/03-road-match.md): which futures come first
 * for the job the person picked. Pure, so the screen, the idea harness and the tests read one answer.
 *
 * - "written": at least one listed road is written for the picked job (its `codes.occupations` holds the job's
 *   five-digit group); those come first, in the order written, then every other listed road, in the order
 *   written. Case A.
 * - "no-road": a job is picked and no listed road is written for it. The screen says so, in place of a road,
 *   and lists every road under "The other futures"; nothing is saved until the person opens one. Case B.
 * - "skipped": no job picked; every listed road, in the order written. Case C.
 *
 * Nothing here falls back to a road, ranks one, or reads anything but the person's own pick: a job is matched
 * only by the codes a road was written for, never by its name, the person's words or their place.
 */
export type RoadMatchCase = "written" | "no-road" | "skipped";

export interface RoadMatch<R extends Pick<Road, "id" | "codes">> {
  case: RoadMatchCase;
  /** The listed roads written for the picked job, in the order written; empty unless `case` is "written". */
  forJob: readonly R[];
  /** Every other listed road, in the order written. */
  others: readonly R[];
}

export function roadMatch<R extends Road>(job: string | null, listed: readonly R[]): RoadMatch<R> {
  if (job === null) return { case: "skipped", forJob: [], others: listed };
  const written = new Set(roadsWrittenForJob(job, listed).map((road) => road.id));
  const forJob = listed.filter((road) => written.has(road.id));
  return {
    case: forJob.length > 0 ? "written" : "no-road",
    forJob,
    others: listed.filter((road) => !written.has(road.id)),
  };
}

/** The five-digit groups a road is written for, in the order its catalog lists them; none for a road written for no particular job. */
export function roadJobGroups(road: Pick<Road, "codes">): readonly string[] {
  return road.codes.occupations === "no-particular-job" ? [] : road.codes.occupations;
}

/**
 * A card's line about the person's pick of job on step 3: what the road is written for (*Written for
 * Cabinetmakers (72311).*, one sentence per group, titles from `jobNames` or the code when a title is missing),
 * or, when no listed road is written for the job, road 0's *Not written for <job>.* Null after Skip, and for any
 * other road written for no particular job. Pick a future draws it (components/front-door/job-and-road-steps.tsx)
 * and the idea harness reads the same line, so the harness can't model a card the screen doesn't draw.
 */
export function cardJobLine(
  road: Pick<Road, "id" | "codes">,
  job: { label: string } | null,
  matchCase: RoadMatchCase,
  jobNames: Readonly<Record<string, readonly { code: string; title: string }[]>>,
): string | null {
  if (!job) return null;
  const groups = roadJobGroups(road);
  if (groups.length > 0) {
    return groups.map((code) => pickWords.writtenForJob(jobNames[road.id]?.find((g) => g.code === code)?.title ?? code, code)).join(" ");
  }
  return matchCase === "no-road" && road.id === generalRoadV2026.id ? pickWords.road0NotForJob(job.label) : null;
}
