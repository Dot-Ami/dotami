import { searchOasisJobs } from "@/lib/engines/oasis/v2026";
import { ACTIVITY_TAXONOMY } from "@/lib/journey/intent";
import { PROVINCES } from "@/lib/scenarios/types";

import { IDEAS_V1, ODD_KINDS, PEOPLE_TYPES, ROAD_IDS, type Idea } from "../fixtures/ideas/v1";
import type { KnownGap } from "../fixtures/ideas/known-gaps";
import type { Failure } from "./idea-invariants";
import type { IdeaRun } from "./idea-pipeline";

/**
 * test-results/idea-coverage.md: what the idea harness saw on one run (S2.5.29b, and the measures of
 * S2.5.32): how many ideas of each kind, which road each reached each way in, the silent fallbacks, the
 * known gaps by story, and what today's keyword parser and job search found against what the words say.
 * Written on every run, kept out of git (test-results/ is ignored), for a person to read.
 */
export function coverageReport(args: {
  runs: readonly IdeaRun[];
  failures: readonly Failure[];
  gaps: readonly KnownGap[];
  elapsedMs: number;
}): string {
  const { runs, failures, gaps } = args;
  const lines: string[] = [];
  const table = (head: string[], rows: (string | number)[][]) => {
    lines.push(`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`);
    for (const row of rows) lines.push(`| ${row.join(" | ")} |`);
    lines.push("");
  };
  const count = <K extends string | number>(keys: readonly K[], of: (idea: Idea) => readonly K[]) =>
    keys.map((key) => [String(key), IDEAS_V1.filter((idea) => of(idea).includes(key)).length]);

  lines.push(
    "# Idea harness coverage",
    "",
    `${IDEAS_V1.length} invented ideas (tests/fixtures/ideas/v1.ts), each run twice through today's pipeline in ${(args.elapsedMs / 1000).toFixed(1)} s.`,
    `${failures.length} failures, every one a known gap (tests/fixtures/ideas/known-gaps.ts) or the harness fails.`,
    "",
    "## Ideas per bucket",
    "",
  );
  table(["Kind of person", "Ideas"], count(PEOPLE_TYPES, (i) => [i.people]));
  table(["Place", "Ideas"], count([...PROVINCES, "outside-canada", "not-said"], (i) => [i.place]));
  table(["Job category (NOC broad)", "Ideas"], count([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], (i) => (i.noc === null ? [] : [i.noc])));
  table(["Kind of work", "Ideas"], count(ACTIVITY_TAXONOMY, (i) => i.tags));
  table(["Odd case", "Ideas"], count(ODD_KINDS, (i) => i.odd ?? []));
  table(["Looking for", "Ideas"], count(["business", "career", "both", "not-said"], (i) => [i.lookingFor]));
  table(["Road written for it", "Ideas"], count([...(Object.keys(ROAD_IDS) as Idea["road"][]), "none-written-yet"], (i) => [i.road]));

  // Where each idea ended, each way in.
  const typedRoad = (run: IdeaRun) => run.typed?.road.id ?? `stops at the ${run.intakeEnd}`;
  const reached = new Map<string, number>();
  for (const run of runs) reached.set(typedRoad(run), (reached.get(typedRoad(run)) ?? 0) + 1);
  lines.push("## Where the typed way in ended", "");
  table(["Ended", "Ideas"], [...reached]);

  // The picked way: what the person clicked on Pick a future, and the road the cockpit drew.
  const pickedRoad = (run: IdeaRun) =>
    run.picked ? `${run.picked.pick?.by === "not-here" ? "“Not here yet?” note" : "card"} → ${run.picked.road.id}` : "stops before Pick a future (no province or territory)";
  const picked = new Map<string, number>();
  for (const run of runs) picked.set(pickedRoad(run), (picked.get(pickedRoad(run)) ?? 0) + 1);
  lines.push("## Where the picked way in ended", "");
  table(["Clicked → drawn on", "Ideas"], [...picked]);

  const fallbacks = failures.filter((f) => f.invariant === "ends:no-silent-fallback");
  lines.push(`## Silent fallbacks: ${new Set(fallbacks.map((f) => f.ideaId)).size}`, "");
  lines.push(
    "Typed: an idea drawn on a road written for its place that isn't the road written for it, with nothing saying so. Picked: a road drawn that isn't the one the person picked, or not kept as their pick.",
    "",
  );
  for (const f of fallbacks) lines.push(`- ${f.ideaId}: ${f.detail}`);
  lines.push("");

  lines.push("## Known gaps, by story", "");
  table(
    ["Invariant", "Subject", "Kind", "Story", "Ideas"],
    gaps.map((g) => [g.invariant, g.subject || "–", g.kind, g.story, g.ideas.length]),
  );

  // Today's keyword parser and job search, against the corpus: information only, never a failure.
  const parsed = runs.filter((run) => run.parse);
  const tagMisses = parsed.filter((run) => run.idea.tags.some((t) => !run.parse!.activityTags.includes(t)));
  const placeMisses = parsed.filter((run) => run.idea.named.length > 0 && run.parse!.province === null);
  const withJobs = IDEAS_V1.filter((idea) => (idea.jobs ?? []).length > 0);
  const jobFound = withJobs.filter((idea) => {
    const found = searchOasisJobs(idea.work, 50).jobs.map((job) => job.code);
    return (idea.jobs ?? []).some((code) => found.includes(code));
  });
  lines.push(
    "## Today's parser and job search, against the words (information, not failures)",
    "",
    `- Kinds of work the words name that the keyword parser missed: ${tagMisses.length} of ${parsed.length} ideas.`,
    `- A province or territory the words name that the parser found none for: ${placeMisses.length} of ${parsed.filter((r) => r.idea.named.length > 0).length} ideas.`,
    `- The expected job among today's job search results for the kind of work: ${jobFound.length} of ${withJobs.length} ideas with an expected job (S2.5.32's measure; the search the cockpit's job list uses).`,
    "",
    "## Each idea",
    "",
  );
  const byIdea = new Map<string, Failure[]>();
  for (const f of failures) byIdea.set(f.ideaId, [...(byIdea.get(f.ideaId) ?? []), f]);
  table(
    ["Idea", "Person", "Place", "Road written", "Typed way in", "Picked way in", "Known gaps"],
    runs.map((run) => [
      run.idea.id,
      run.idea.people,
      run.idea.place,
      run.idea.road,
      typedRoad(run),
      run.picked ? pickedRoad(run) : "–",
      [...new Set((byIdea.get(run.idea.id) ?? []).map((f) => f.invariant))].join(", ") || "–",
    ]),
  );
  return lines.join("\n");
}
