import { NextResponse } from "next/server";

import { logRouteError } from "@/lib/api/log-error";
import { NODE_ENGINE_HINTS } from "@/lib/brain/node-items";
import { loadLatestVentureScenarioForStubUser } from "@/lib/db/load-latest-venture-for-stub-user";
import { listVentures, loadVentureScenarioById } from "@/lib/db/ventures";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { howCheckedWords } from "@/lib/engines/shared/citation-check";
import { listTypedStatements } from "@/lib/person/statements";
import { sortStatementsNewestFirst } from "@/lib/person/types";
import { prisma } from "@/lib/prisma";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";
import { getScenarioNodeStatus, stageChipFor } from "@/lib/scenarios/graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * S2.5.4i — the readout. Everything the cockpit knows about one venture, as one JSON document,
 * so a coding agent working with the person present can read it and reason over it there
 * (decided 2026-09-14: the agent, not the app, is the explorer, and it reaches DotAmi only
 * through this web API). The app computes; nothing in this payload is a judgment.
 *
 *   GET /api/readout                → the most recently saved venture
 *   GET /api/readout?venture=<id>   → that venture (row id from /api/ventures)
 *   GET /api/readout?all=1          → the list of all ventures + statements, no evaluation
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = new Date().toLocaleDateString("en-CA");

  let ventures: Awaited<ReturnType<typeof listVentures>> = [];
  try {
    ventures = await listVentures(prisma);
  } catch (error) {
    logRouteError("readout", error);
    return NextResponse.json({ error: "No database reachable." }, { status: 503 });
  }

  let typed: Awaited<ReturnType<typeof listTypedStatements>> = [];
  try {
    typed = await listTypedStatements(prisma);
  } catch {
    typed = [];
  }
  const statements = sortStatementsNewestFirst(typed);

  if (url.searchParams.get("all")) {
    return NextResponse.json({ generatedAt: new Date().toISOString(), today, ventures, statements });
  }

  const ventureId = url.searchParams.get("venture")?.trim();
  const scenario = ventureId
    ? await loadVentureScenarioById(prisma, ventureId)
    : await loadLatestVentureScenarioForStubUser(prisma);
  if (!scenario) {
    return NextResponse.json({ error: ventureId ? "No venture with that id." : "No venture saved yet." }, { status: 404 });
  }

  const venture = ventures.find((v) => v.scenarioId === scenario.id) ?? null;
  // The venture's own branch picks, the same way the cockpit colours its map.
  const evaluation = evaluateScenario(scenario, { today });

  const nodes = cfeCatalogV2026.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    stage: node.stage,
    status: getScenarioNodeStatus(node.id, scenario),
    // What the card's chip says on the map: "status" is "decision" for a pick and an untouched
    // default alike, so this tells them apart ("your-pick", "default", "open-choice", …).
    chip: stageChipFor(node.id, scenario),
    evaluatorColour: evaluation.nodeStates[node.id],
    // Which of the person's answers set that colour, in the rules' own sentence (2026-10-11).
    evaluatorReason: evaluation.nodeReasons[node.id] ?? null,
    trigger: node.trigger,
    relevantEntryIds: NODE_ENGINE_HINTS[node.id] ?? [],
  }));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    today,
    venture,
    scenario,
    evaluation: {
      provinceCoverage: evaluation.provinceCoverage,
      unlocks: evaluation.unlocks.map((u) => ({
        id: u.id,
        engine: u.engine,
        state: u.state,
        typeChip: u.typeChip,
        title: u.title,
        why: u.why,
        payoff: u.payoff,
        expires: u.expires ?? null,
        fork: u.fork ?? null,
        risk: u.risk ?? null,
        // Each citation keeps its check fields (lastVerified, readBy, toolCheck) and gains the words a
        // screen shows for them, so an agent reads the same "Read by a person on …" / "Read on …" /
        // "Checked by a tool on …" as the person does (docs/engines/citations.md).
        citations: u.citations.map((c) => ({ ...c, howChecked: howCheckedWords(c) })),
      })),
    },
    nodes,
    otherVentures: ventures.filter((v) => v.scenarioId !== scenario.id).map((v) => ({
      id: v.id,
      name: v.name,
      stage: v.stage,
      activityTags: v.activityTags,
      links: v.links,
    })),
    statements,
    note: "Computed by DotAmi's deterministic engines from what the person entered. No ranking, no judgment — that is the reader's job, with the person present.",
  });
}
