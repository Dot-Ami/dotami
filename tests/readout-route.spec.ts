/**
 * The readout route (app/api/readout/route.ts) when the person's step marks can't be read: it answers 503, never
 * a readout whose `yourStatus` is null on every stage, which would say they marked nothing (2026-10-24, the
 * maintainer's decision 3 on PR #210). The reads are replaced here; nothing touches a database.
 *
 * tests/prerelease-honesty.spec.ts reads the readout's shape through `readoutNodes`; this reads the route itself,
 * the only place a failed read could turn into "no mark given".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reads = vi.hoisted(() => ({
  listVentures: vi.fn(),
  loadVentureScenarioById: vi.fn(),
  loadLatestVentureScenarioForStubUser: vi.fn(),
  listStepProgress: vi.fn(),
  listTypedStatements: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/db/ventures", () => ({ listVentures: reads.listVentures, loadVentureScenarioById: reads.loadVentureScenarioById }));
vi.mock("@/lib/db/load-latest-venture-for-stub-user", () => ({
  loadLatestVentureScenarioForStubUser: reads.loadLatestVentureScenarioForStubUser,
}));
vi.mock("@/lib/futures/step-progress", () => ({ listStepProgress: reads.listStepProgress }));
vi.mock("@/lib/person/statements", () => ({ listTypedStatements: reads.listTypedStatements }));

import { GET } from "@/app/api/readout/route";
import { generalRoadV2026 } from "@/lib/engines/roads/v2026";
import { scenarioForPickedFuture } from "@/lib/front-door/start-future";

const BASELINE = "stage-0-employee-apprentice-baseline";
const scenario = scenarioForPickedFuture({ road: generalRoadV2026, place: "CA-AB", name: "" }, "readout-route-test");
// Only the fields the route reads from a venture row: its id (for the marks) and the idea it was saved for.
const venture = { id: "venture-1", scenarioId: scenario.id, name: "Invented — readout route", links: [] };

type Node = { id: string; yourStatus: string | null };

function readout() {
  return GET(new Request(`http://localhost/api/readout?venture=${venture.id}`));
}

describe("the readout route when the step marks can't be read", () => {
  let logged: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    for (const read of Object.values(reads)) read.mockReset();
    reads.listVentures.mockResolvedValue([venture]);
    reads.loadVentureScenarioById.mockResolvedValue(scenario);
    reads.listTypedStatements.mockResolvedValue([]);
    logged = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => logged.mockRestore());

  it("answers 503, never stages that say no mark was given", async () => {
    reads.listStepProgress.mockRejectedValue(Object.assign(new Error("SQLITE_BUSY: database is locked"), { code: "SQLITE_BUSY" }));
    const res = await readout();
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: string; nodes?: unknown };
    expect(body).toEqual({ error: "No database reachable." });
    expect(reads.listStepProgress).toHaveBeenCalledWith({}, venture.id);
    // The log gets the error's name and code, never the error itself (lib/api/log-error.ts).
    expect(logged).toHaveBeenCalledWith("[readout] failed (Error, SQLITE_BUSY)");
  });

  it("the control: marks read gives each stage the person's own mark, and null where they gave none", async () => {
    reads.listStepProgress.mockResolvedValue([
      { roadId: generalRoadV2026.id, stepId: BASELINE, status: "done", doneWhenIds: [], changes: [], updatedAt: "" },
    ]);
    const res = await readout();
    expect(res.status).toBe(200);
    const { nodes } = (await res.json()) as { nodes: Node[] };
    expect(nodes.filter((n) => n.yourStatus !== null)).toEqual([expect.objectContaining({ id: BASELINE, yourStatus: "done" })]);
    expect(nodes.length).toBeGreaterThan(1);
    expect(logged).not.toHaveBeenCalled();
  });

  it("an idea with no venture row reads no marks, and says none was given", async () => {
    reads.listVentures.mockResolvedValue([]);
    const res = await readout();
    expect(res.status).toBe(200);
    const { nodes } = (await res.json()) as { nodes: Node[] };
    expect(nodes.every((n) => n.yourStatus === null)).toBe(true);
    expect(reads.listStepProgress).not.toHaveBeenCalled();
  });
});
