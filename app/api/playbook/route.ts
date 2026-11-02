import { readBody, throttle } from "@/lib/api/route";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { roadById } from "@/lib/engines/roads/v2026";
import { buildPlaybookSkeleton } from "@/lib/playbook/build-skeleton";
import type { Scenario } from "@/lib/scenarios/types";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

/**
 * Playbook export = the deterministic catalog skeleton for the scenario, as JSON. The panel
 * renders it to markdown for an accountant or lawyer. S2.5.4h: the LLM "narrative paragraphs"
 * branch is gone — in-app AI is off by design and the prep tool ships facts, not prose.
 */

/** Scenario payloads are small structured JSON — plenty of headroom without inviting abuse. */
const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

function isScenarioPayload(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Scenario>;

  if (typeof candidate.id !== "string" || candidate.id.trim() === "") {
    return false;
  }

  if (!candidate.profile || typeof candidate.profile !== "object") {
    return false;
  }

  if (!candidate.state || typeof candidate.state !== "object") {
    return false;
  }

  const state = candidate.state as Scenario["state"];

  return (
    Array.isArray(state.activeNodeIds) &&
    Array.isArray(state.completedNodeIds) &&
    Array.isArray(state.decisionNodeIds) &&
    Array.isArray(state.ghostedNodeIds) &&
    state.activeBranches !== null &&
    typeof state.activeBranches === "object" &&
    typeof (state.activeBranches as Record<string, unknown>)["gstTiming"] === "string" &&
    typeof (state.activeBranches as Record<string, unknown>)["incorporationTiming"] === "string"
  );
}

export async function POST(request: Request) {
  const limited = throttle("playbook", request, RATE_LIMIT);
  if (limited) return limited;

  // This route has always told a body that isn't JSON "Invalid JSON payload".
  const read = await readBody(request, MAX_BODY_BYTES, "Invalid JSON payload");
  if ("refusal" in read) return read.refusal;
  const bodyUnknown = read.body;

  const scenario = (bodyUnknown as { scenario?: unknown }).scenario;

  if (!isScenarioPayload(scenario)) {
    return Response.json({ error: "scenario payload required" }, { status: 400 });
  }

  // The road the cockpit draws; one nobody wrote is refused. The sources are drawn for the idea's own place, the
  // federal pages and its province's, whether a road is named or not (`citationsForPlace`, a-call-12).
  const roadId = (bodyUnknown as { roadId?: unknown }).roadId;
  const road = roadId === undefined ? undefined : typeof roadId === "string" ? roadById(roadId) : undefined;
  if (roadId !== undefined && !road) {
    return Response.json({ error: "unknown road" }, { status: 400 });
  }

  const skeleton = buildPlaybookSkeleton([...cfeCatalogV2026.nodes], scenario, road);

  return Response.json({ skeleton }, { headers: { "Cache-Control": "no-store" } });
}
